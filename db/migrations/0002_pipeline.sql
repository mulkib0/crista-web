-- 0002_pipeline — 화면 ③ 1. 발견 · 2. 최적화(W3): 모둠 프로그램 · 표적 추천 카드 · 연구비 원장 · 워커 작업 · 히트 후보 찜 · 연구 노트.
-- crista_web 연결로 적용한다(이 표들의 소유자 = crista_web). web 스키마 밖은 만들거나 바꾸지 않는다.
-- 규칙 값: 비용은 crista `paidWorkCostCents`(서버가 넣는다), 단계 · 노트 칸은 packages/web-contract/src/pipeline.ts 와 같다.

-- 모둠 프로그램 — 확정 표적(1.1) · 주력 리드 · 백업(2.2). 모둠마다 한 줄(처음 읽을 때 만든다).
create table web.programs (
  team_id uuid primary key references web.teams (id) on delete cascade,
  disease_id text check (disease_id ~ '^MONDO_[0-9]{7}$'),
  target_id text check (target_id ~ '^[a-z0-9]+-[a-z0-9]{4}$'),
  target_set_at timestamptz,
  target_set_by uuid references web.accounts (user_id) on delete set null,
  lead_job_id uuid,
  backup_job_id uuid,
  lead_set_at timestamptz,
  lead_set_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((disease_id is null) = (target_id is null))
);

-- 1.1 '내 추천 표적' 카드 — 한 사람이 질환마다 한 장(다시 올리면 메모만 바뀐다).
create table web.target_picks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  disease_id text not null check (disease_id ~ '^MONDO_[0-9]{7}$'),
  target_id text not null,
  note text check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (team_id, user_id, disease_id)
);

-- 연구비 원장 — 정수 센트, 멱등 키(모둠 안 유일). 잔액 = 합계. 초기 연구비는 'initial' 한 줄.
create table web.ledger (
  id bigint generated always as identity primary key,
  team_id uuid not null references web.teams (id) on delete cascade,
  amount_cents bigint not null,
  kind text not null check (kind in ('initial', 'paid_work', 'paid_work_refund', 'adjustment')),
  idem_key text not null check (char_length(idem_key) between 1 and 120),
  job_id uuid,
  created_by uuid references web.accounts (user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, idem_key)
);

-- 워커 작업 — 1.2 스크리닝(stage 2) · 2.1 도킹(stage 3) · 2.2 ADMET(stage 4).
-- 워커로는 jobId = 'web-' || id, classId = 'web:' || class_id, teamId = 'web:' || team_id 로 보낸다(설계 §7.1).
create table web.jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  created_by uuid references web.accounts (user_id) on delete set null,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  step text not null check (step in ('1.2', '2.1', '2.2')),
  stage smallint not null check (stage between 2 and 4),
  facility text not null check (facility in ('htvs', 'docking', 'admet')),
  params jsonb not null,
  input_summary text not null,
  target_id text,
  smiles text,
  label text check (char_length(label) <= 40),
  parent_job_id uuid references web.jobs (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  progress real not null default 0 check (progress between 0 and 1),
  phase text,
  queue_position integer,
  source text check (source in ('fixture', 'dataset', 'vina', 'admet-ai')),
  test boolean not null default false,
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0 and refunded_cents <= cost_cents),
  result jsonb,
  canonical_smiles text,
  affinity_kcal real,
  error jsonb,
  -- 워커가 이 작업을 알고 있나(202 를 받았나). false 면 폴러가 같은 jobId 로 다시 낸다(워커 재시작 · 첫 전송 실패).
  worker_known boolean not null default false,
  submit_attempts smallint not null default 0,
  timeout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (team_id, request_id)
);
create index jobs_active_idx on web.jobs (created_at) where status in ('queued', 'running');
create index jobs_team_idx on web.jobs (team_id, created_at desc);

-- 1.2 히트 후보 찜 — 후보 하나에 담당자 한 명(설계 §6.4 `claimedBy`).
create table web.claims (
  team_id uuid not null references web.teams (id) on delete cascade,
  compound_id text not null check (char_length(compound_id) between 1 and 40),
  name text not null,
  smiles text not null,
  screen_job_id uuid not null references web.jobs (id) on delete cascade,
  claimed_by uuid not null references web.accounts (user_id) on delete cascade,
  vina_kcal real,
  screen_score real,
  mw real,
  qed real,
  created_at timestamptz not null default now(),
  primary key (team_id, compound_id)
);

-- 연구 노트 — (모둠, 단계, 칸) 단위로 따로 저장해 세 명이 동시에 써도 서로 덮지 않는다(설계 §6.4).
create table web.notes (
  team_id uuid not null references web.teams (id) on delete cascade,
  step_id text not null check (step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2')),
  section text not null check (section in ('why', 'unknown', 'fallback')),
  body text not null check (char_length(body) <= 2000),
  updated_by uuid references web.accounts (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, step_id, section)
);
