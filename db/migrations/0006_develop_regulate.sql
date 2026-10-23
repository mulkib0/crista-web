-- 0006_develop_regulate — 2.1 → 3.3 학생 선택 · 전임상 · 서류 심사 · 학급 게임 시계 · LLM 호출 기록(설계 §5.6~§5.13 · §6.1 · §7.3 · §7.4 ⑩~⑭).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0005 는 고치지 않는다.
--
-- 원칙(설계 §7.3): 모둠 공유 칸은 한 사람 · 한 칸이 한 행이고 모두 program_revision_id 에 묶인다. 특허 원장만 학급 단위다.
-- 이 파일이 하는 이전(한 트랜잭션):
--   - W3 에서 2.2 에 정한 주력 리드 · 백업(ADMET 작업)을 lead_candidates(특허 후보)로 옮기고 program_revisions 의 지정은 비운다
--     — 주력 · 백업 지정은 3.2 전임상 끝으로 옮겼다(설계 §5.7 · §5.9 ⑤). 백업이 도킹 작업이었으면 후보가 될 수 없어 옮기지 않는다.
--   - 연구 노트의 '3.2'(앞 판의 제형 · IND) 칸을 '3.3' 으로 옮긴다. 이제 '3.2' 는 전임상 칸이다.
-- 기능별 쓰기 규칙은 apps/server/src/features/{selection,patents,preclinical,ind}.ts 머리 주석.

-- ── 2.1 → 2.2 대기열(§5.6) — claims 와 같은 꼴, 1인 상한을 DB 키로 ──
create table web.dock_picks (
  program_revision_id uuid not null,
  team_id uuid not null,
  docking_job_id uuid not null,
  picked_by uuid not null references web.accounts (user_id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  -- 근거 칩 키(web-contract selection.ts) — 서버가 같은 규칙으로 다시 판정한다(막음이면 400).
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{0,39}$'),
  created_at timestamptz not null default now(),
  primary key (program_revision_id, docking_job_id),
  constraint dock_picks_person_slot_key unique (program_revision_id, picked_by, slot),
  foreign key (docking_job_id, program_revision_id) references web.jobs (id, program_revision_id) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);

-- ── 2.2 특허 후보(§5.7) — 1인 1개(모둠 2명 이하면 2개) · 모둠 상한 4 는 표적 버전 행 잠금 안에서 센다 ──
create table web.lead_candidates (
  program_revision_id uuid not null,
  team_id uuid not null,
  admet_job_id uuid not null,
  picked_by uuid not null references web.accounts (user_id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{0,39}$'),
  -- 이미 알려진 물질(ChEMBL 승인약 · ZINC 소형 · 기준 리간드) — '특허 불가 · 변형체 필요' 칩(§5.7 · §5.8 심사 2번).
  known_substance boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (program_revision_id, admet_job_id),
  constraint lead_candidates_person_slot_key unique (program_revision_id, picked_by, slot),
  foreign key (admet_job_id, program_revision_id) references web.jobs (id, program_revision_id) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);

-- W3 의 주력 리드 · 백업(2.2 ADMET 작업)을 특허 후보로 옮긴다. 고른 사람 = 지정한 사람(없으면 작업을 낸 사람).
insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason, created_at)
select r.id, r.team_id, r.lead_job_id, coalesce(r.lead_set_by, j.created_by), 1, 'legacy_lead', coalesce(r.lead_set_at, r.created_at)
  from web.program_revisions r
  join web.jobs j on j.id = r.lead_job_id and j.program_revision_id = r.id
 where j.step = '2.2' and j.status = 'succeeded' and coalesce(r.lead_set_by, j.created_by) is not null;
insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason, created_at)
select r.id, r.team_id, r.backup_job_id, coalesce(r.lead_set_by, j.created_by),
       case when exists (select 1 from web.lead_candidates c where c.program_revision_id = r.id and c.picked_by = coalesce(r.lead_set_by, j.created_by)) then 2 else 1 end,
       'legacy_backup', coalesce(r.lead_set_at, r.created_at)
  from web.program_revisions r
  join web.jobs j on j.id = r.backup_job_id and j.program_revision_id = r.id
 where j.step = '2.2' and j.status = 'succeeded' and coalesce(r.lead_set_by, j.created_by) is not null
on conflict do nothing;
-- 주력 · 백업은 3.2 끝에서 다시 정한다(유효 특허 + 동물실험 완료 분자만). 버전을 올려 옛 화면의 지정 요청은 409.
update web.program_revisions
   set lead_job_id = null, backup_job_id = null, lead_set_at = null, lead_set_by = null, lead_version = lead_version + 1
 where lead_job_id is not null or backup_job_id is not null;
comment on column web.program_revisions.lead_job_id is '0006 부터 3.2 전임상 끝의 주력(유효 특허 + 동물실험 완료 분자의 2.2 ADMET 작업)';
comment on column web.program_revisions.backup_job_id is '0006 부터 3.2 전임상 끝의 백업(같은 조건)';

-- ── 학급 설정 · 학급 게임 시계(설계 §5.8.1 · §8 '게임 시계') ──
-- 시계는 crista clock.ts 의 앵커 방식을 줄였다: 지금 게임 일 = clock_anchor_day + (일시정지가 아니면) clock_rate × 앵커 이후 현실 분.
-- 명령(일시정지 · 다시 · 배속)은 먼저 지금까지를 앵커로 접고 상태를 바꾼다(소급 없음). 수업 세션 · 월 처리는 두지 않는다.
alter table web.classes add column max_patents_per_team smallint not null default 3 check (max_patents_per_team between 1 and 4);
alter table web.classes add column clock_anchor_at timestamptz not null default now();
alter table web.classes add column clock_anchor_day double precision not null default 0 check (clock_anchor_day >= 0);
-- 게임 일 / 현실 분. 기본 2 = 동물실험 28게임 일이 현실 14분, IND 30게임 일이 15분.
alter table web.classes add column clock_rate real not null default 2 check (clock_rate >= 0.1 and clock_rate <= 60);
-- 기본은 흐름(교사 시계 화면 전에 만든 학급도 3.2 · 3.3 이 끝나게). 교사가 멈출 수 있다.
alter table web.classes add column clock_paused boolean not null default false;

-- ── 3.1 물질특허 출원서(§5.8) — 출원서 한 건 한 행. 상한(받아들여짐 + 심사 중)은 teams 행 잠금 안에서 센다 ──
create table web.patent_applications (
  id uuid primary key default gen_random_uuid(),
  program_revision_id uuid not null,
  team_id uuid not null,
  class_id uuid not null,
  admet_job_id uuid not null,
  -- 코드명 해부도 ② — 받아들여지면 바꿀 수 없다. 초안에서는 비어 있을 수 있다.
  code_name text check (code_name ~ '^[A-Z]{3,4}-[0-9]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'revise', 'rejected', 'accepted', 'abandoned')),
  -- 서류 판 — 칸을 저장할 때마다 1씩 오른다. 심사는 그 시각 판을 고정한다(⑪).
  version integer not null default 1 check (version >= 1),
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  constraint patent_applications_code_key unique (class_id, code_name),
  foreign key (admet_job_id, program_revision_id) references web.jobs (id, program_revision_id),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  foreign key (team_id, class_id) references web.teams (id, class_id) on delete cascade
);
-- 같은 후보로 살아 있는 출원서는 하나(거절 · 포기는 다시 낼 수 있다).
create unique index patent_applications_live_candidate_key on web.patent_applications (program_revision_id, admet_job_id)
  where status not in ('rejected', 'abandoned');
create index patent_applications_team_idx on web.patent_applications (team_id, status);

-- ── 서류 칸 — 세 서류 꼴이 같다(§7.3 · ⑪ 칸 단위 낙관적 잠금) ──
create table web.patent_sections (
  application_id uuid not null references web.patent_applications (id) on delete cascade,
  section text not null check (section ~ '^[a-z][a-z0-9_]{0,31}$'),
  body text not null check (char_length(body) <= 4000),
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (application_id, section)
);

-- ── 3.2 전임상(§5.9) ──
-- ① 실험 수행자 교육 이수(개인) — 모둠원 한 명만 이수해도 모둠이 실행할 수 있다(실행 단추를 누르는 사람만 필요).
create table web.ethics_training (
  class_id uuid not null,
  user_id uuid not null,
  completed_at timestamptz not null default now(),
  answers jsonb not null default '{}',
  primary key (class_id, user_id),
  foreign key (class_id, user_id) references web.members (class_id, user_id) on delete cascade
);

-- ② 동물실험계획서 — 승인된 판의 후보 · 마릿수 수준대로만 실행(변경은 다시 심의).
create table web.iacuc_protocols (
  id uuid primary key default gen_random_uuid(),
  program_revision_id uuid not null,
  team_id uuid not null,
  n_level text not null default 'standard' check (n_level in ('low', 'standard', 'high')),
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'revise', 'approved')),
  version integer not null default 1 check (version >= 1),
  -- 승인된 판 — 승인 뒤 칸을 고치면 status 가 draft 로 내려가도 이 스냅숏(후보 · 수준)대로만 돌릴 수 있다.
  approved_version integer,
  approved_at timestamptz,
  approved_snapshot jsonb,
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  check ((approved_version is null) = (approved_at is null))
);
create table web.iacuc_sections (
  protocol_id uuid not null references web.iacuc_protocols (id) on delete cascade,
  section text not null check (section ~ '^[a-z][a-z0-9_]{0,31}$'),
  body text not null check (char_length(body) <= 4000),
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (protocol_id, section)
);

-- ── 학급 특허 원장 5.04(§5.8 ⑤ · ⑩) — 선착순의 최종 판정은 부분 고유 키 ──
create table web.patents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes (id) on delete cascade,
  -- 학급 출원 순서 — classes 행 잠금 안에서 max + 1.
  class_seq integer not null check (class_seq >= 1),
  -- 출원번호(시안 `KR-37-4821` 꼴 — 형식은 F31 이 정한다).
  patent_no text not null check (char_length(patent_no) between 1 and 32),
  team_id uuid not null,
  program_revision_id uuid not null,
  application_id uuid not null unique references web.patent_applications (id),
  admet_job_id uuid not null,
  flat_smiles text not null check (char_length(flat_smiles) between 1 and 400),
  canonical_smiles text not null check (char_length(canonical_smiles) between 1 and 400),
  code_name text not null check (code_name ~ '^[A-Z]{3,4}-[0-9]{3}$'),
  filed_game_day integer not null check (filed_game_day >= 0),
  status text not null default 'active' check (status in ('active', 'abandoned')),
  created_at timestamptz not null default now(),
  abandoned_at timestamptz,
  unique (class_id, class_seq),
  unique (class_id, patent_no),
  unique (id, team_id),
  foreign key (team_id, class_id) references web.teams (id, class_id) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  foreign key (admet_job_id, program_revision_id) references web.jobs (id, program_revision_id),
  check ((status = 'abandoned') = (abandoned_at is not null))
);
create unique index patents_class_flat_active_key on web.patents (class_id, flat_smiles) where status = 'active';
create index patents_team_idx on web.patents (team_id, status);

create table web.iacuc_protocol_patents (
  protocol_id uuid not null references web.iacuc_protocols (id) on delete cascade,
  patent_id uuid not null references web.patents (id) on delete cascade,
  primary key (protocol_id, patent_id)
);

-- ── 작업 넓히기 — 3.2 대체 시험 · 동물실험 묶음(워커를 부르지 않는 서버 내부 작업 · 게임 시계로 끝남, ⑬) ──
alter table web.jobs drop constraint jobs_step_check;
alter table web.jobs add constraint jobs_step_check check (step in ('1.2', '2.1', '2.2', '3.2'));
alter table web.jobs drop constraint jobs_stage_check;
alter table web.jobs add constraint jobs_stage_check check (stage between 2 and 5);
alter table web.jobs drop constraint jobs_facility_check;
alter table web.jobs add constraint jobs_facility_check check (facility in ('htvs', 'docking', 'admet', 'alt_assay', 'animal_study'));
alter table web.jobs drop constraint jobs_source_check;
alter table web.jobs add constraint jobs_source_check check (source in ('fixture', 'dataset', 'vina', 'admet-ai', 'simulation'));
alter table web.jobs add column patent_id uuid references web.patents (id);
alter table web.jobs add column protocol_id uuid references web.iacuc_protocols (id);
-- 설계 열쇠(예: 'animal:standard' · 'alt:herg') — 같은 (특허 · 설계)는 한 번만(다시 뽑기 없음 · 이중 과금 없음).
alter table web.jobs add column design_key text check (design_key ~ '^[a-z_]+:[a-z0-9_]+$');
-- 게임 시계로 끝나는 작업의 끝나는 게임 일.
alter table web.jobs add column ends_game_day double precision check (ends_game_day >= 0);
alter table web.jobs add constraint jobs_internal_shape_check check (
  (step = '3.2') = (patent_id is not null and design_key is not null and ends_game_day is not null)
);
create unique index jobs_patent_design_key on web.jobs (patent_id, design_key) where patent_id is not null and status <> 'failed';
create index jobs_game_clock_idx on web.jobs (class_id, ends_game_day) where ends_game_day is not null and status in ('queued', 'running');

-- ── 3.3 임상시험 계획 승인 신청서(§5.10) — 서류 통과 → submitted(과금) → 30게임 일 → 판정 ──
create table web.ind_applications (
  id uuid primary key default gen_random_uuid(),
  program_revision_id uuid not null,
  team_id uuid not null,
  -- 주력(유효 특허 · 동물실험 완료 분자).
  patent_id uuid not null,
  form text check (form in ('oral', 'iv', 'transdermal')),
  dose_mg smallint check (dose_mg in (10, 50, 100)),
  population text check (char_length(population) between 1 and 80),
  endpoint text check (char_length(endpoint) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'revise', 'submitted', 'approved', 'held')),
  version integer not null default 1 check (version >= 1),
  -- 판정 재료(흔들림 없음 — IND) · 판정 게임 일.
  e_score real,
  s_score real,
  submitted_at timestamptz,
  submitted_game_day double precision check (submitted_game_day >= 0),
  decide_game_day double precision check (decide_game_day >= 0),
  decided_game_day double precision check (decided_game_day >= 0),
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  foreign key (patent_id, team_id) references web.patents (id, team_id),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  check (status not in ('submitted', 'approved', 'held') or (form is not null and dose_mg is not null and submitted_game_day is not null and decide_game_day is not null)),
  check (status not in ('approved', 'held') or decided_game_day is not null)
);
-- IND 접수는 그 표적 버전에 하나(접수 중 · 승인)— 두 사람이 같이 눌러도 한 번만 과금(⑬).
create unique index ind_applications_live_key on web.ind_applications (program_revision_id) where status in ('submitted', 'approved');
create index ind_applications_due_idx on web.ind_applications (decide_game_day) where status = 'submitted';
create table web.ind_sections (
  application_id uuid not null references web.ind_applications (id) on delete cascade,
  section text not null check (section ~ '^[a-z][a-z0-9_]{0,31}$'),
  body text not null check (char_length(body) <= 4000),
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (application_id, section)
);

-- ── 서류 심사 기록 = 캐시(§5.11 · ⑫) — 같은 판을 다시 내면 같은 결과, 이의 제기 · 교사 정정의 원본 ──
create table web.doc_reviews (
  id uuid primary key default gen_random_uuid(),
  doc_kind text not null check (doc_kind in ('patent', 'iacuc', 'ind')),
  doc_id uuid not null,
  doc_version integer not null check (doc_version >= 1),
  -- 정규화한 심사 입력(칸 · 사실 · 규칙 결과 · 체크리스트)의 SHA-256.
  doc_hash text not null check (doc_hash ~ '^[0-9a-f]{64}$'),
  reviewer_version text not null check (char_length(reviewer_version) between 1 and 60),
  team_id uuid not null references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  rule_findings jsonb not null default '[]',
  -- 심사 입력 스냅숏(그 판의 칸 본문 · 사실 · 체크리스트) — LLM 재시도 · 교사 확인 · 이의 제기가 같은 판을 본다. SMILES 원문 · 실명은 넣지 않는다.
  request jsonb not null default '{}',
  llm_output jsonb,
  verdict text not null default 'pending' check (verdict in ('pending', 'pass', 'revise', 'reject')),
  -- LLM 단계: skipped(규칙에서 끝남) · cached(같은 해시의 앞 결과) · queued · done · failed · refused · unavailable · filtered(사전 인젝션 필터) · manual(교사).
  llm_status text not null default 'queued' check (llm_status in ('skipped', 'cached', 'queued', 'done', 'failed', 'refused', 'unavailable', 'filtered', 'manual')),
  llm_attempts smallint not null default 0 check (llm_attempts >= 0),
  next_attempt_at timestamptz,
  -- 실제로 답한 모델(response.model) · 거절 종류(stop_details.category).
  response_model text,
  refusal_category text,
  flags text[] not null default '{}',
  -- 하루 상한(문서 5 · 모둠 15)에 세나 — 규칙에서 끝났거나 캐시면 세지 않는다.
  counted boolean not null default true,
  requested_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- 교사 수동 통과 · 정정(원본 판정은 original_verdict 에 남긴다).
  overridden_by uuid references web.accounts (user_id) on delete set null,
  overridden_at timestamptz,
  override_note text check (char_length(override_note) <= 300),
  original_verdict text check (original_verdict in ('pending', 'pass', 'revise', 'reject')),
  constraint doc_reviews_version_key unique (doc_kind, doc_id, doc_version, reviewer_version),
  check ((verdict = 'pending') = (decided_at is null))
);
create index doc_reviews_doc_idx on web.doc_reviews (doc_kind, doc_id, created_at desc);
create index doc_reviews_team_day_idx on web.doc_reviews (team_id, created_at);
create index doc_reviews_hash_idx on web.doc_reviews (doc_kind, doc_hash, reviewer_version) where llm_output is not null;
create index doc_reviews_pending_idx on web.doc_reviews (next_attempt_at) where verdict = 'pending';

-- ── 연구 노트 단계 이전 — '3.2'(제형 · IND 초안) → '3.3', '3.2' 는 전임상 칸(§7.3) ──
alter table web.notes drop constraint notes_step_id_check;
update web.notes set step_id = '3.3' where step_id = '3.2';
alter table web.notes add constraint notes_step_id_check check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2'));

-- ── LLM 호출 기록(§5.13 — 서류 심사 · 학습 채점 · 헤드라인) — 교사 화면 하루 사용량 · 학급 상한 ──
-- 키 값 · 프롬프트 원문 · 학생 글은 남기지 않는다(토큰 수 · 모델 · 상태만).
create table web.llm_calls (
  id bigint generated always as identity primary key,
  task text not null check (task in ('doc_review', 'learn_grade', 'headline', 'probe')),
  model text not null check (char_length(model) between 1 and 80),
  response_model text check (char_length(response_model) <= 80),
  effort text not null check (effort in ('low', 'medium', 'high', 'xhigh', 'max')),
  -- 프롬프트 판(reviewerVersion · graderVersion · headline 판).
  version text not null check (char_length(version) between 1 and 60),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  cache_read_tokens integer check (cache_read_tokens >= 0),
  cache_creation_tokens integer check (cache_creation_tokens >= 0),
  latency_ms integer check (latency_ms >= 0),
  stop_reason text check (char_length(stop_reason) <= 40),
  refusal_category text check (char_length(refusal_category) <= 40),
  fallback_used boolean not null default false,
  status text not null check (status in ('ok', 'refused', 'invalid', 'error', 'unavailable')),
  error_code text check (char_length(error_code) <= 60),
  team_id uuid references web.teams (id) on delete set null,
  class_id uuid references web.classes (id) on delete set null,
  -- 무엇을 위한 호출인가(doc_reviews.id · learn_gradings.id · board_events.id 등, 문자열).
  ref_id text check (char_length(ref_id) <= 80),
  created_at timestamptz not null default now()
);
create index llm_calls_class_day_idx on web.llm_calls (class_id, created_at);
create index llm_calls_team_day_idx on web.llm_calls (team_id, created_at);
create index llm_calls_day_idx on web.llm_calls (created_at);
