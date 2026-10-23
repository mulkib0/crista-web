-- 0007_market_learn — 전광판 01 · 기업가치(설계 §5.3 · W5) + 학습 연구비(learning-grant-design §6.1) + 원장 종류 넓히기.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0006 은 고치지 않는다.
--
-- 단위: 원장(ledger)은 지금처럼 정수 센트. 화면 단위 크리스타는 1 크리스타 = 20 센트($0.001M = 5,000 크리스타 —
-- packages/web-contract/src/money.ts). 학습 표의 *_crista 칸은 크리스타 정수이고, 원장에 넣을 때 서버가 센트로 바꾼다.
-- 사옥 Tier 는 teams.hq_tier(0001)를 쓴다. 기능별 쓰기 규칙은 apps/server/src/features/{market,learn}.ts 머리 주석.

-- ── 원장 종류 · 참조 ──
alter table web.ledger drop constraint ledger_kind_check;
alter table web.ledger add constraint ledger_kind_check check (kind in (
  'initial', 'paid_work', 'paid_work_refund', 'adjustment',
  -- 3.1 출원료(받아들일 때) · 3.3 IND 수수료(접수 때)
  'patent_fee', 'ind_fee',
  -- 학습 연구비 4통로(learning-grant-design §6.1) · 교사 정정
  'learn_item', 'learn_revision', 'learn_note', 'learn_stipend', 'learn_correction',
  -- Series A/B 투자금 · 실패 바운티(보류 뒤 원인 분석 환급, 설계 §10)
  'pitch_series_a', 'pitch_series_b', 'failure_bounty'
));
-- 무엇에 대한 줄인가(작업이 아닌 것 — 특허 · IND · 학습 답안 · 피치 …). 표 이름 · id.
alter table web.ledger add column ref_type text check (ref_type ~ '^[a-z_]{1,40}$');
alter table web.ledger add column ref_id uuid;
alter table web.ledger add constraint ledger_ref_check check ((ref_type is null) = (ref_id is null));
create index ledger_team_kind_idx on web.ledger (team_id, kind);

-- ── 전광판 소식(§5.3) — 학급 안 일련번호, 공개 정보만 ──
create table web.board_events (
  id bigint generated always as identity primary key,
  class_id uuid not null references web.classes (id) on delete cascade,
  -- 학급 안 순서 — classes 행 잠금 안에서 max + 1(화면 LED 띠 · 놓친 소식 다시 받기).
  class_seq integer not null check (class_seq >= 1),
  -- 학급 공지 · 정정은 모둠 없음.
  team_id uuid references web.teams (id) on delete cascade,
  kind text not null check (kind in (
    'listing', 'docking_record', 'patent', 'preclinical', 'ind_approved', 'ind_held',
    'trial_pass', 'trial_held', 'approval', 'investment', 'rank', 'learn', 'correction', 'notice'
  )),
  -- 규칙 문구(늘 먼저 흐른다) · LLM 이 다듬은 줄(실패 · 지연이면 null 로 남고 바꾸지 않는다 — §5.3 · §5.13).
  headline text not null check (char_length(headline) between 1 and 140),
  headline_ai text check (char_length(headline_ai) between 1 and 140),
  change_pct real check (change_pct between -100 and 100),
  tone text not null default 'normal' check (tone in ('normal', 'bad', 'rank')),
  -- 공개 정보만(티커 · 단계 · 통과/보류 · 질환 · 코드명 …). 후보 SMILES · 물성 · 점수 · 노트는 넣지 않는다.
  public jsonb not null default '{}',
  -- 같은 일로 소식이 두 번 나지 않게(예: 'patent:<id>').
  idem_key text check (char_length(idem_key) between 1 and 120),
  game_day double precision check (game_day >= 0),
  created_at timestamptz not null default now(),
  unique (class_id, class_seq),
  unique (class_id, idem_key)
);
create index board_events_class_idx on web.board_events (class_id, class_seq desc);

-- ── 기업가치 이력 — 상장가 $10.00 × 1,000,000주에서 소식(펀더멘털)으로만 움직인다(§5.3) ──
create table web.valuations (
  id bigint generated always as identity primary key,
  team_id uuid not null references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  event_id bigint references web.board_events (id) on delete set null,
  price_usd numeric(14, 4) not null check (price_usd > 0),
  change_pct real check (change_pct between -100 and 100),
  created_at timestamptz not null default now()
);
create index valuations_team_idx on web.valuations (team_id, created_at desc);
create index valuations_class_idx on web.valuations (class_id, created_at desc);

-- ── 학습 연구비(learning-grant-design §6.1) ──
create table web.learn_items (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  tier text not null check (tier in ('concept', 'intermediate', 'advanced')),
  kind text not null check (kind in ('mc', 'multi', 'numeric', 'text')),
  field text,
  template text not null,
  rubric jsonb,
  key jsonb,
  requires text[] not null default '{}',
  max_crista bigint not null check (max_crista between 0 and 1000000),
  version integer not null default 1 check (version >= 1),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table web.learn_gradings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('answer', 'note', 'pitch')),
  target_id uuid not null,
  model text,
  response_model text,
  -- 정규화한 채점 입력의 SHA-256 — 같은 판(grader_version)의 같은 답안은 다시 부르지 않는다.
  prompt_hash text not null check (prompt_hash ~ '^[0-9a-f]{64}$'),
  grader_version text not null check (char_length(grader_version) between 1 and 60),
  raw_output jsonb,
  latency_ms integer check (latency_ms >= 0),
  tokens jsonb,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed', 'refused', 'unavailable', 'filtered', 'overridden')),
  attempts smallint not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz,
  overridden_by uuid references web.accounts (user_id) on delete set null,
  override_note text check (char_length(override_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learn_gradings_target_idx on web.learn_gradings (target_type, target_id);
create index learn_gradings_cache_idx on web.learn_gradings (prompt_hash, grader_version) where status = 'done';
create index learn_gradings_pending_idx on web.learn_gradings (next_attempt_at) where status in ('pending', 'failed', 'unavailable');

create table web.learn_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  team_id uuid not null references web.teams (id) on delete cascade,
  user_id uuid not null,
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  item_id text not null references web.learn_items (id),
  -- 변형 시드 = (학생, 학급, 문항) — 같은 모둠원끼리도 숫자 · 각도가 다르다.
  variant_seed bigint not null,
  context_snapshot jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'graded', 'pending', 'revised', 'practice')),
  created_at timestamptz not null default now(),
  unique (class_id, user_id, item_id, variant_seed),
  foreign key (class_id, user_id) references web.members (class_id, user_id) on delete cascade
);
create index learn_assignments_team_step_idx on web.learn_assignments (team_id, step_id);

create table web.learn_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references web.learn_assignments (id) on delete cascade,
  attempt smallint not null check (attempt in (1, 2)),
  payload jsonb not null,
  submitted_at timestamptz not null default now(),
  score smallint check (score between 0 and 100),
  rubric_result jsonb,
  flags text[] not null default '{}',
  crista_paid bigint not null default 0 check (crista_paid >= 0),
  ledger_id bigint references web.ledger (id),
  grader_version text,
  grading_id uuid references web.learn_gradings (id),
  duplicate_of uuid references web.learn_answers (id),
  unique (assignment_id, attempt)
);

create table web.learn_note_evals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  -- 채점한 노트의 표적 버전(참고) — 지급은 (모둠, 단계)마다 한 번 + 수정 1회라 표적을 바꿔도 두 번 받지 않는다.
  program_revision_id uuid,
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  attempt smallint not null check (attempt in (1, 2)),
  sections_snapshot jsonb not null,
  contributors uuid[] not null default '{}',
  is_distributed boolean not null default false,
  score smallint check (score between 0 and 100),
  rubric_result jsonb,
  crista_paid bigint not null default 0 check (crista_paid >= 0),
  ledger_id bigint references web.ledger (id),
  grading_id uuid references web.learn_gradings (id),
  requested_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, step_id, attempt),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete set null (program_revision_id)
);

-- 단계 가동률 · 10분 틱(단계당 2틱 상한 · 전원 가동 즉시 정산 — learning-grant-design §2.3).
create table web.learn_step_activity (
  team_id uuid not null references web.teams (id) on delete cascade,
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  -- user_id → { active, score } (가동 = 50점 이상 문항 1개 또는 노트 칸 50점 이상).
  members jsonb not null default '{}',
  ratio real not null default 0 check (ratio between 0 and 1),
  streak smallint not null default 0 check (streak between 0 and 9),
  multiplier real not null default 1 check (multiplier between 1 and 2.5),
  ticks_paid smallint not null default 0 check (ticks_paid between 0 and 2),
  stipend_crista bigint not null default 0 check (stipend_crista >= 0),
  opened_at timestamptz not null default now(),
  last_tick_at timestamptz,
  settled_at timestamptz,
  primary key (team_id, step_id)
);

create table web.learn_pitch_rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  round text not null check (round in ('series_a', 'series_b')),
  quant_breakdown jsonb not null default '{}',
  quant_score smallint not null check (quant_score between 0 and 70),
  pitch_text text not null check (char_length(pitch_text) between 1 and 1000),
  qual_score smallint check (qual_score between 0 and 30),
  total_score smallint check (total_score between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  crista_paid bigint not null default 0 check (crista_paid >= 0),
  ledger_id bigint references web.ledger (id),
  grading_id uuid references web.learn_gradings (id),
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  -- 라운드마다 모둠 한 번.
  unique (team_id, round)
);

-- 가동 보호권(최대 2장 — 서버가 센다).
create table web.learn_shields (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  earned_from text not null check (char_length(earned_from) between 1 and 80),
  earned_at timestamptz not null default now(),
  used_on_step text check (used_on_step in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  used_at timestamptz,
  check ((used_on_step is null) = (used_at is null))
);
create index learn_shields_team_idx on web.learn_shields (team_id) where used_on_step is null;

-- 교사 면제(결석 · 조퇴 — 가동률 분모에서 뺀다).
create table web.learn_exemptions (
  class_id uuid not null,
  user_id uuid not null,
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  by_teacher uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_id, user_id, step_id),
  foreign key (class_id, user_id) references web.members (class_id, user_id) on delete cascade
);

-- 이의 제기(채점 · 서류 심사) → 교사 정정(원본 보존).
create table web.learn_appeals (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('answer', 'note', 'pitch', 'doc_review')),
  target_id uuid not null,
  team_id uuid not null references web.teams (id) on delete cascade,
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 200),
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  resolved_by uuid references web.accounts (user_id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 300),
  created_at timestamptz not null default now(),
  check ((status = 'open') = (resolved_at is null))
);
create index learn_appeals_team_idx on web.learn_appeals (team_id, status);
