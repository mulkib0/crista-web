-- 0016_market — 전광판 01 · 기업가치 · 과정 평가 · 최종 순위(기능 FMARKET — 설계 §5.3 · §5.2 · §4.1 · W5 · learning-grant §5 2축 순위
-- · 2026-10-24 사용자 지시 "모든 파이프라인의 하나하나가 기업가치/주식에 반영되고(과정 및 결과 모두) 수업이 끝날 때(또는 교사가 정한 시기) 최종 순위").
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0015 는 고치지 않는다.
-- 쓰기 규칙은 apps/server/src/features/market.ts 머리 주석.

-- ── 1. 소식 종류 열기 ──
-- 'process' = 단계 과정 평가(작은 변동 · 공개는 사실만). 다른 세션(항체 설계 랩 · 트랙 2)이 같은 전광판에
-- 'antibody_<무엇>' 소식을 올린다 — 접두 규칙으로 받는다(목록을 다시 고치지 않게).
alter table web.board_events drop constraint board_events_kind_check;
alter table web.board_events add constraint board_events_kind_check check (
  kind in (
    'listing', 'docking_record', 'patent', 'preclinical', 'ind_approved', 'ind_held',
    'trial_pass', 'trial_held', 'approval', 'investment', 'rank', 'learn', 'correction', 'notice',
    'process'
  )
  or kind ~ '^antibody_[a-z0-9_]{1,40}$'
);

-- ── 2. 기업가치 지금 값 — 모둠마다 한 줄 ──
-- 소식 처리기(onBoardEvent 'market')가 학급 행 잠금(postBoardEvent 의 classes `for no key update`) 안에서 이 줄을 `for update` 로 잠그고 고친다.
-- 잠금 순서: teams → classes → market_state(이 표는 FMARKET 만 잠근다).
create table web.market_state (
  team_id uuid primary key references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  -- 상장가 $10.00(× 1,000,000주). 펀더멘털(소식)로만 움직인다 — 하한 $0.10(crista floorFundamental).
  price_usd numeric(14, 4) not null default 10 check (price_usd >= 0.1),
  -- 결과 소식 · 과정 평가가 낸 변동률 합(%p, 참고 · 교사 화면) — 가격은 곱으로 쌓이므로 합과 정확히 같지 않다.
  result_pct real not null default 0,
  process_pct real not null default 0,
  moves integer not null default 0 check (moves >= 0),
  last_event_id bigint references web.board_events (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index market_state_class_idx on web.market_state (class_id);

-- 기업가치 이력: 소식 하나에 한 줄(같은 소식이 두 번 움직이지 않게) · 무엇이 움직였나.
alter table web.valuations add column kind text check (kind in ('listing', 'result', 'process', 'correction'));
create unique index valuations_event_key on web.valuations (event_id) where event_id is not null;

-- ── 3. 단계 과정 평가 — (모둠, 단계)마다 한 번 ──
-- 단계가 처음 done 이 되는 순간의 과정 신호(참여 · 근거 · 보완 횟수 · 3R …)를 규칙(web-contract market.ts PROCESS_RULES)으로 0~100 점.
-- 기능이 직접 `postProcessScore` 로 내거나(source 'feature'), FMARKET 주기 점검이 DB 사실에서 계산한다(source 'market'). 먼저 넣은 쪽 하나만.
create table web.process_scores (
  team_id uuid not null references web.teams (id) on delete cascade,
  class_id uuid not null references web.classes (id) on delete cascade,
  step_id text not null check (
    step_id in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')
    or step_id ~ '^antibody_[a-z0-9_]{1,40}$'
  ),
  score smallint not null check (score between 0 and 100),
  -- [{ key, value 0..1, weight, fact, public }] — 화면 · 교사 화면이 그대로 그린다. 학급 공개(board_events.public)는 public 칸의 fact 만.
  components jsonb not null check (jsonb_typeof(components) = 'array'),
  change_pct real check (change_pct between -100 and 100),
  source text not null check (source in ('market', 'feature')),
  program_revision_id uuid,
  event_id bigint references web.board_events (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, step_id)
);
create index process_scores_class_idx on web.process_scores (class_id);

-- ── 4. 마감 · 최종 순위 ──
-- ends_at = 교사가 정한 마감 시각(지나면 주기 점검이 얼린다) · final_at = 얼린 순간(그 뒤 소식 · 유료 행동은 순위를 바꾸지 않는다).
alter table web.classes add column ends_at timestamptz;
alter table web.classes add column final_at timestamptz;
alter table web.classes add column final_by uuid references web.accounts (user_id) on delete set null;
alter table web.classes add column final_reason text check (final_reason in ('teacher', 'schedule'));
alter table web.classes add constraint classes_final_pair_check check ((final_at is null) = (final_reason is null));

create table web.class_standings (
  class_id uuid not null references web.classes (id) on delete cascade,
  team_id uuid not null references web.teams (id) on delete cascade,
  -- 시가총액 순위(같으면 티커 순) · 연구 역량 지수 순위(learning-grant §5 2축).
  rank smallint not null check (rank >= 1),
  research_rank smallint not null check (research_rank >= 1),
  price_usd numeric(14, 4) not null check (price_usd > 0),
  market_cap_cents bigint not null check (market_cap_cents > 0),
  result_score smallint not null check (result_score between 0 and 100),
  process_score smallint not null check (process_score between 0 and 100),
  furthest_step text check (furthest_step in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  steps_done smallint not null check (steps_done between 0 and 9),
  approved boolean not null default false,
  research_index smallint not null check (research_index between 0 and 100),
  -- 단계별 과정 점수 · 결과 점수 내역 · 연구 역량 재료(그 모둠 · 교사 화면).
  breakdown jsonb not null default '{}',
  frozen_at timestamptz not null,
  primary key (class_id, team_id),
  unique (class_id, rank)
);
