-- 0017_clinical_trials — 4.1 임상 1 · 2 · 3상(기능 F41 · 2026-10-24 사용자 지시). crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다.
--
-- 한 줄 = 한 상의 한 시도(모집 → 시작 → 진행 → 판정). 재도전은 새 줄(attempt + 1).
-- 불변식(설계 §7.4 꼴):
--   - 표적 버전마다 살아 있는 시도(모집 중 · 진행 중 · 판정 대기)는 하나 — 부분 고유 키(clinical_trials_live_key). 두 사람이 같이 [모집 시작]을 눌러도 한 줄.
--   - (버전, 상, 시도 번호) 고유 — 같은 재도전이 두 번 열리지 않는다.
--   - [임상 시작]은 teams 잠금 → 시도 줄 잠금 → status = 'recruiting' 조건부 UPDATE + 원장 멱등 키 'trial:<id>:start' — 동시에 두 번 눌러도 과금 1회(③ 꼴).
--   - 모집 투자 과금은 정산할 때마다 recruit_seq 를 올리고 원장 멱등 키 'trial:<id>:recruit:<seq>' — 같은 정산이 두 번 들어가지 않는다.
--   - 바운티는 시도마다 한 번(clinical_bounties PK · 원장 'trial:<id>:bounty').
-- 원장 종류는 늘리지 않는다 — 상 비용 · 모집 투자 · 백업 교체 수수료는 'paid_work' + ref_type('clinical_trial' · 'clinical_recruit' · 'clinical_backup'),
-- 바운티는 'failure_bounty'(0007). 전광판 소식은 'trial_pass' · 'trial_held'(0007), 과정 소식(모집 완료 · 시작)은 'notice' + public.event.

create table web.clinical_trials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null,
  program_revision_id uuid not null,
  -- 승인된 IND(3.3) · 이 시도의 후보 특허(주력 또는 백업).
  ind_application_id uuid not null,
  patent_id uuid not null,
  phase text not null check (phase in ('phase1', 'phase2', 'phase3')),
  attempt smallint not null check (attempt between 1 and 50),
  route text not null check (route in ('first', 'next', 'same', 'amend', 'backup')),
  -- 프로토콜(IND 승인서 → 변경 신고로 바뀔 수 있음).
  form text not null check (form in ('oral', 'iv', 'transdermal')),
  dose_mg real not null check (dose_mg > 0 and dose_mg <= 100),
  population text not null check (char_length(population) between 1 and 80),
  endpoint text not null check (char_length(endpoint) between 1 and 120),
  status text not null default 'recruiting' check (status in ('recruiting', 'running', 'completed', 'held', 'pending')),
  -- 모집(게임 일마다 정산 — accrued_through_day 까지 셌다).
  recruit_tier text not null default 'basic' check (recruit_tier in ('basic', 'expanded', 'focus')),
  enrolled double precision not null default 0 check (enrolled >= 0),
  target_n integer not null check (target_n between 1 and 5000),
  min_n integer not null check (min_n between 1 and 5000),
  opened_game_day double precision not null check (opened_game_day >= 0),
  accrued_through_day double precision not null check (accrued_through_day >= 0),
  -- 백업 교체 뒤 IND 변경 심사가 끝나는 게임 일(그 전에는 모집 0).
  available_from_day double precision check (available_from_day >= 0),
  recruit_seq integer not null default 0 check (recruit_seq >= 0),
  recruit_spent_cents bigint not null default 0 check (recruit_spent_cents >= 0),
  -- 서버가 계산한 사실(물성 신호 · E · S · MRSD · 질환 모양 · 모집 규칙) — 시뮬레이션 입력 · 화면 · 재현. SMILES 는 넣지 않는다.
  facts jsonb not null,
  -- 시작 · 진행.
  enrolled_at_start integer check (enrolled_at_start >= 1),
  started_game_day double precision check (started_game_day >= 0),
  ends_game_day double precision check (ends_game_day >= 0),
  decided_game_day double precision check (decided_game_day >= 0),
  cost_paid_cents bigint not null default 0 check (cost_paid_cents >= 0),
  -- 시뮬레이션(Claude Opus 5.5 · effort medium) — 시작 때 만들어 두고 끝나는 게임 일에 공개.
  input_hash text check (input_hash ~ '^[0-9a-f]{64}$'),
  sim_status text not null default 'none' check (sim_status in ('none', 'queued', 'ready', 'manual')),
  sim_attempts smallint not null default 0 check (sim_attempts >= 0),
  sim_next_at timestamptz,
  sim_error text check (char_length(sim_error) <= 300),
  result jsonb,
  result_source text check (result_source in ('llm', 'teacher')),
  result_model text check (char_length(result_model) <= 80),
  verdict text check (verdict in ('pass', 'held')),
  hold_kind text check (hold_kind in ('safety', 'efficacy', 'both', 'operational')),
  -- game-rules 판정(참고값 — 교사 화면 · §5.11 예외 기록).
  reference jsonb,
  teacher_note text check (char_length(teacher_note) <= 300),
  pending_alerted boolean not null default false,
  opened_by uuid references web.accounts (user_id) on delete set null,
  started_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  unique (program_revision_id, phase, attempt),
  foreign key (team_id, class_id) references web.teams (id, class_id) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  foreign key (ind_application_id, team_id) references web.ind_applications (id, team_id),
  foreign key (patent_id, team_id) references web.patents (id, team_id),
  check (min_n <= target_n),
  check (status = 'recruiting' or (enrolled_at_start is not null and started_game_day is not null and ends_game_day is not null and enrolled_at_start >= min_n)),
  check ((status in ('completed', 'held')) = (verdict is not null and decided_game_day is not null)),
  check (status <> 'completed' or verdict = 'pass'),
  check (status <> 'held' or (verdict = 'held' and hold_kind is not null)),
  check (verdict is distinct from 'pass' or hold_kind is null),
  check ((result is null) = (result_source is null)),
  check (sim_status <> 'ready' or result is not null)
);
-- 표적 버전마다 살아 있는 시도 하나.
create unique index clinical_trials_live_key on web.clinical_trials (program_revision_id) where status in ('recruiting', 'running', 'pending');
create index clinical_trials_team_idx on web.clinical_trials (team_id, created_at desc);
create index clinical_trials_class_idx on web.clinical_trials (class_id, created_at desc);
create index clinical_trials_active_idx on web.clinical_trials (class_id) where status in ('recruiting', 'running');
create index clinical_trials_sim_idx on web.clinical_trials (sim_next_at) where sim_status = 'queued';

-- 모집 원장(곡선) — 정산 한 번 = 한 줄. 과금 줄은 web.ledger(멱등 키 'trial:<id>:recruit:<seq>').
create table web.clinical_recruit_log (
  trial_id uuid not null references web.clinical_trials (id) on delete cascade,
  seq integer not null check (seq >= 1),
  game_day double precision not null check (game_day >= 0),
  enrolled double precision not null check (enrolled >= 0),
  tier text not null check (tier in ('basic', 'expanded', 'focus')),
  cents bigint not null default 0 check (cents >= 0),
  created_at timestamptz not null default now(),
  primary key (trial_id, seq)
);

-- 시뮬레이션 캐시 — 같은 입력 해시(판 · 사실 · 코호트 번호)면 저장된 결과(결정성 §5.11 ③ 꼴).
create table web.clinical_sim_cache (
  input_hash text primary key check (input_hash ~ '^[0-9a-f]{64}$'),
  version text not null check (char_length(version) between 1 and 60),
  result jsonb not null,
  model text check (char_length(model) <= 80),
  created_at timestamptz not null default now()
);

-- 실패 바운티 — 보류된 시도마다 한 번.
create table web.clinical_bounties (
  trial_id uuid primary key references web.clinical_trials (id) on delete cascade,
  team_id uuid not null references web.teams (id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  last_hints text[] not null default '{}',
  analysis text check (char_length(analysis) <= 600),
  passed boolean not null default false,
  refund_cents bigint not null default 0 check (refund_cents >= 0),
  passed_by uuid references web.accounts (user_id) on delete set null,
  passed_at timestamptz,
  check (passed = (passed_at is not null))
);

-- LLM 호출 기록 작업 종류에 'clinical_sim' 을 더한다. 다른 기능이 같은 CHECK 를 넓혔을 수 있어 지금 값을 읽어 합친다(목록을 덮어쓰지 않게).
do $$
declare
  vals text[];
begin
  select array_agg(distinct m[1] order by m[1]) into vals
    from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''', 'g') as m
   where c.conrelid = 'web.llm_calls'::regclass and c.conname = 'llm_calls_task_check';
  if vals is null then
    raise exception 'llm_calls_task_check 를 찾지 못했습니다.';
  end if;
  if not ('clinical_sim' = any (vals)) then
    vals := vals || array['clinical_sim'];
    alter table web.llm_calls drop constraint llm_calls_task_check;
    execute format('alter table web.llm_calls add constraint llm_calls_task_check check (task = any (%L::text[]))', vals);
  end if;
end $$;
