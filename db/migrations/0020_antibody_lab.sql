-- 0020_antibody_lab — 항체 설계 랩(설계 docs/2026-10-24-antibody-lab-design.md §5.1 · §5.3 · §11.5).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0004 는 고치지 않는다.
-- 공유 표(ledger · jobs · teams · board_events · valuations)는 ALTER 하지 않는다 — web.antibody_* 새 표만 만든다.
--
-- §11.5 로 표 둘이 줄었다: web.antibody_events · web.antibody_valuations 를 **만들지 않는다**.
-- 소식은 0007 web.board_events(apps/server/src/board-events.ts `postBoardEvent`), 기업가치 이력은 0007 web.valuations 를 쓴다.
-- 그래서 이 파일이 만드는 표는 13개다(설계 §11.2 의 '12개'는 15 − 2 를 잘못 센 것 — 구현 기록에 적었다).
--
-- 번호축 주의: antibody_designs.mutations[].pos · antibody_interfaces.pairs[].abPos 는 **1부터 세는 Fv 서열 자리**다
-- (IMGT 번호가 아니다 — features/antibody/numbering.ts 의 축 약속). IMGT 번호는 작업 결과(result jsonb)에만 있다.
--
-- 정직성(§3.5): result jsonb · parts jsonb 에는 늘 source · approx 를 싣는다. 근사값에 원전 지표 이름을 쓰지 않는다.

-- ── 프로그램 — 모둠당 1행(표적 · 원본 항체 · 레퍼런스 구조의 '지금 값') ──
create table web.antibody_programs (
  team_id uuid primary key references web.teams (id) on delete cascade,
  track text not null default 'antibody' check (track = 'antibody'),
  -- ChEMBL 표적 id(예: CHEMBL203). 확정 전에는 비어 있다.
  antigen_target text check (antigen_target ~ '^CHEMBL[0-9]{1,12}$'),
  parent_antibody_chembl_id text check (parent_antibody_chembl_id ~ '^CHEMBL[0-9]{1,12}$'),
  parent_antibody_name text check (char_length(parent_antibody_name) between 1 and 80),
  reference_pdb text check (reference_pdb ~ '^[0-9A-Za-z]{4}$'),
  -- 체인 역할 한 벌 — {"set":"1","H":"D","L":"C","AG":"A"}(§2.3 복합체가 여러 벌인 PDB).
  chain_roles jsonb not null default '{}',
  parent_vh text check (char_length(parent_vh) between 1 and 400),
  parent_vl text check (char_length(parent_vl) between 1 and 400),
  -- 표적 · 원본 항체를 바꿀 때 올린다(그 뒤 설계 · 작업은 새 버전에 쌓인다).
  revision_no integer not null default 1 check (revision_no >= 1),
  -- 낙관적 잠금 — PUT /api/antibody/program 의 version 불일치는 409 stale.
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 버전 — 확정값 사본 + 원본 비교군 점수 · 문턱 · 표적별 정규화 척도 ──
create table web.antibody_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  antigen_target text,
  parent_antibody_chembl_id text,
  parent_antibody_name text,
  reference_pdb text check (reference_pdb ~ '^[0-9A-Za-z]{4}$'),
  chain_roles jsonb not null default '{}',
  parent_vh text,
  parent_vl text,
  -- S_원본(0~100) · 문턱 T = parent_score + 교사 조정(기본 5) · 표적별 σ(§4.1a).
  parent_score integer check (parent_score between 0 and 100),
  threshold integer check (threshold between 0 and 105),
  sigma_target numeric(12, 6) check (sigma_target > 0),
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, revision_no),
  -- 복합 FK 의 대상 — (revision_id, team_id) 가 같은 모둠인지 DB 가 보증한다.
  unique (id, team_id)
);
create index antibody_revisions_team_idx on web.antibody_revisions (team_id, revision_no desc);

-- ── 합의 ① 제안 — A1(프로그램) · A2(고정 위치) ──
create table web.antibody_proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_id uuid not null,
  topic text not null check (topic in ('program', 'fixed_positions')),
  -- 표적 · 원본 항체 · PDB · 체인 조(program) 또는 고정 위치 목록(fixed_positions).
  value jsonb not null,
  rationale text not null check (char_length(rationale) between 1 and 600),
  proposed_by uuid references web.accounts (user_id) on delete set null,
  status text not null default 'open' check (status in ('open', 'passed', 'rejected', 'withdrawn')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade
);
-- 모둠 · 버전 · 안건당 열린 제안은 하나.
create unique index antibody_proposals_open_key on web.antibody_proposals (team_id, revision_id, topic) where status = 'open';
create index antibody_proposals_rev_idx on web.antibody_proposals (revision_id, created_at desc);

-- ── 합의 ② 투표 — 1인 1표 · 과반이면 서버가 같은 트랜잭션에서 확정 ──
create table web.antibody_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references web.antibody_proposals (id) on delete cascade,
  team_id uuid not null references web.teams (id) on delete cascade,
  voter uuid not null references web.accounts (user_id) on delete cascade,
  choice text not null check (choice in ('yes', 'no')),
  created_at timestamptz not null default now(),
  constraint antibody_votes_one_per_voter unique (proposal_id, voter)
);
create index antibody_votes_proposal_idx on web.antibody_votes (proposal_id);

-- ── 1인 1몫 카드 — A1(맡은 표적/항체 묶음) · A2(H1~L3 여섯 구간) ──
create table web.antibody_card_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_id uuid not null,
  step text not null check (step in ('A1', 'A2')),
  slot text not null check (char_length(slot) between 1 and 24),
  payload jsonb not null,
  rationale text not null check (char_length(rationale) between 1 and 600),
  submitted_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint antibody_cards_one_per_slot unique (team_id, revision_id, step, submitted_by, slot),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade
);
create index antibody_cards_rev_idx on web.antibody_card_submissions (revision_id, step);

-- ── 설계 — 같은 서열 재제출 차단 · 1인 2설계 상한 ──
create table web.antibody_designs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_id uuid not null,
  label text not null check (char_length(label) between 1 and 40),
  vh text not null check (char_length(vh) between 1 and 400),
  vl text check (char_length(vl) between 1 and 400),
  -- 정규화 서열의 sha256(features/antibody/hash.ts `seqHash`).
  seq_hash text not null check (seq_hash ~ '^[0-9a-f]{64}$'),
  -- [{chain,pos,wt,mut,cdr}] — pos 는 1부터 세는 Fv 서열 자리.
  mutations jsonb not null default '[]',
  origin text not null check (origin in ('student', 'suggested', 'parent', 'nim')),
  designed_by uuid references web.accounts (user_id) on delete set null,
  slot smallint check (slot between 1 and 2),
  -- 미리보기 지표(모티프 · 전하 · pI · 사람 유전자 동일성 · 배지).
  preview jsonb,
  created_at timestamptz not null default now(),
  -- 같은 서열은 한 번만(§4.4②) — 서버가 제약 이름을 보고 기존 행을 200 으로 돌려준다.
  constraint antibody_designs_seq_key unique (team_id, revision_id, seq_hash),
  -- 1인 2설계 상한을 DB 가 막고 서버가 409 slot_taken 으로 바꾼다(§4.4③).
  -- origin in ('parent','suggested') 행은 designed_by is null 이라 이 제약에 걸리지 않는다(모둠 공용).
  constraint antibody_designs_slot_key unique (team_id, revision_id, designed_by, slot),
  -- 복합 FK 의 대상 — 작업 · 점수가 (design_id, team_id) 로 가리킨다.
  unique (id, team_id),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade
);
create index antibody_designs_rev_idx on web.antibody_designs (revision_id, created_at desc);

-- ── 작업 — 멱등(team, request_id) · 사람별 상한 · 진행 값 체계는 web.jobs 와 같게 ──
create table web.antibody_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  revision_id uuid not null,
  design_id uuid,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  step text not null check (step in ('A2', 'A4', 'A5')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'timeout')),
  progress real not null default 0 check (progress between 0 and 1),
  phase text check (char_length(phase) between 1 and 60),
  provider text check (provider in ('colabfold', 'esmfold', 'sabdab', 'rcsb', 'chembl', 'approx', 'nim', 'boltz', 'fixture')),
  external_ticket text check (char_length(external_ticket) between 1 and 120),
  requested_by uuid references web.accounts (user_id) on delete set null,
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0),
  -- 결과에는 늘 source · approx · calledAt · elapsedMs 를 싣는다(§3.5).
  result jsonb,
  approx boolean not null default true,
  error_message text check (char_length(error_message) between 1 and 400),
  timeout_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint antibody_jobs_request_key unique (team_id, request_id),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade,
  foreign key (design_id, team_id) references web.antibody_designs (id, team_id) on delete cascade
);
-- 사람별 상한 — A4 접기 1건 · A5 평가 1건(§4.4). 위반은 409 my_quota_used.
create unique index antibody_jobs_my_quota_key on web.antibody_jobs (team_id, revision_id, step, requested_by)
  where step in ('A4', 'A5') and status <> 'failed' and status <> 'timeout';
create index antibody_jobs_queue_idx on web.antibody_jobs (status, created_at) where status in ('queued', 'running');
create index antibody_jobs_rev_idx on web.antibody_jobs (revision_id, created_at desc);

-- ── 점수 — 이력 보존(가중치를 바꿔도 옛 점수를 남긴다) ──
create table web.antibody_scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_id uuid not null,
  design_id uuid,
  score integer not null check (score between 0 and 100),
  -- 5항 하위 점수 · 감점 목록 · 경고 · 배지 · eventSkipped(§11.3 소식 건너뛰기 기록).
  parts jsonb not null,
  fit integer check (fit between 0 and 100),
  -- 접힘 확신도 평균 · CDR-H3 구간(0~100 — 원전 지표 이름을 쓰지 않는다).
  confidence_mean numeric(6, 2),
  confidence_cdr numeric(6, 2),
  -- 붙는 힘 점수의 원값(접촉 통계 합 · 단위 없음).
  bind_raw numeric(12, 4),
  humanness numeric(6, 2),
  nearest_germline text check (char_length(nearest_germline) between 1 and 40),
  similarity numeric(6, 2),
  formula_version text not null check (char_length(formula_version) between 1 and 40),
  created_at timestamptz not null default now(),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade,
  foreign key (design_id, team_id) references web.antibody_designs (id, team_id) on delete cascade
);
create index antibody_scores_team_design_idx on web.antibody_scores (team_id, design_id);
create index antibody_scores_rev_score_idx on web.antibody_scores (revision_id, score desc);

-- ── 연구 노트 — 칸 이름은 기존 계약 NoteSection(why · unknown · fallback)과 같다 ──
create table web.antibody_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  revision_id uuid not null,
  step text not null check (step in ('A1', 'A2', 'A3', 'A4', 'A5', 'A6')),
  section text not null check (section in ('why', 'unknown', 'fallback')),
  body text not null check (char_length(body) <= 2000),
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (team_id, revision_id, step, section),
  foreign key (revision_id, team_id) references web.antibody_revisions (id, team_id) on delete cascade
);

-- ── 교사 학급 설정 — 가중치 합 1.00 은 서버가 검사(409 invalid_input) ──
create table web.antibody_class_settings (
  class_id uuid primary key references web.classes (id) on delete cascade,
  weights jsonb not null default '{"binding":0.30,"stability":0.20,"developability":0.30,"humanization":0.10,"novelty":0.10}',
  -- 문턱 보정(scoreMargin) · 확신도 문턱(confidenceMin).
  thresholds jsonb not null default '{"scoreMargin":5,"confidenceMin":70}',
  -- 연구소 고르기 화면의 비활성 상태를 정한다(§1.4).
  open_tracks text[] not null default '{small,antibody}',
  version integer not null default 1 check (version >= 1),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint antibody_settings_tracks_check check (open_tracks <@ array['small', 'antibody']::text[])
);

-- ── 영구 캐시 — cache_key = sha256(엔드포인트 + 정규화 JSON) ──
create table web.antibody_cache (
  cache_key text primary key check (cache_key ~ '^[0-9a-f]{64}$'),
  -- 비우기 · 통계용(chembl · rcsb · colabfold · sabdab · esmfold).
  provider text not null check (char_length(provider) between 1 and 24),
  -- 본문 한 칸(JSON 은 직렬화 · PDB · a3m 은 원문) — features/antibody/cache.ts `CacheEntry.body`.
  body text not null,
  bytes integer not null default 0 check (bytes >= 0),
  elapsed_ms integer check (elapsed_ms >= 0),
  fetched_at timestamptz not null default now()
);
create index antibody_cache_provider_idx on web.antibody_cache (provider, fetched_at desc);

-- ── 계면 잔기쌍 — 표적 · 체인 조별 1회만 파싱해 넣고 런타임에 PDB 를 받지 않는다 ──
create table web.antibody_interfaces (
  reference_pdb text not null check (reference_pdb ~ '^[0-9A-Za-z]{4}$'),
  -- 복합체가 여러 벌인 PDB 의 체인 조(§10 S10 — 벌에 따라 계면이 다르다).
  ab_set text not null default '1' check (char_length(ab_set) between 1 and 8),
  ab_chain text not null check (char_length(ab_chain) between 1 and 4),
  ag_chain text not null check (char_length(ag_chain) between 1 and 4),
  -- [{chain,abPos,abAa,agResi,agAa,dist}] — abPos 는 Fv 자리로 옮긴 뒤의 값.
  pairs jsonb not null,
  pair_count integer not null check (pair_count >= 0),
  -- 단일 변이 1,000회 시뮬레이션 표준편차(§4.1a · features/antibody/sigma.ts).
  sigma_single numeric(12, 6) check (sigma_single > 0),
  -- 접촉 통계 요약(평균 |raw| 등).
  energy_stats jsonb not null default '{}',
  parsed_at timestamptz not null default now(),
  primary key (reference_pdb, ab_set, ab_chain, ag_chain)
);

-- ── CDR 길이 분포 — SAbDab2 all-summary 를 시드 때 1회만 받아 적재. 요청 경로에서 호출 금지 ──
create table web.antibody_cdr_stats (
  -- 번호축을 섞지 않게 scheme 을 PK 에 넣는다(§10 S16).
  scheme text not null default 'imgt' check (scheme in ('imgt', 'kabat', 'chothia', 'abm', 'contact')),
  chain text not null check (chain in ('H', 'L')),
  cdr text not null check (cdr in ('1', '2', '3')),
  len integer not null check (len between 0 and 120),
  count integer not null check (count >= 0),
  primary key (scheme, chain, cdr, len)
);
