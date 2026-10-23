-- 0015_learn — 기능 FLEARN(학습 연구비 v1 · learning-grant-design §2 · §4 · §6). 0007 의 learn_* 10표에 덧붙인다.
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0008 은 고치지 않는다.
--
-- 쓰기 규칙은 apps/server/src/features/learn.ts 머리 주석.

-- ── 모둠의 '지금 단계' 포인터 + 이어 온 연속 단계 수(s 의 바탕) ──
-- 단계를 떠날 때 한 번만 정산한다(그 단계 learn_step_activity.settled_at 이 비었을 때만): 전원 가동(또는 보호권) → +1, 아니면 한 칸만 식는다(−1, 0 아래로는 안 감).
-- 줄 잠금(FOR UPDATE)이 단계 넘김 정산을 한 번으로 줄 세운다.
create table web.learn_progress (
  team_id uuid primary key references web.teams (id) on delete cascade,
  current_step text not null check (current_step in ('1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2')),
  streak_base smallint not null default 0 check (streak_base between 0 and 9),
  updated_at timestamptz not null default now()
);

-- ── 힌트(무료 1회 — 쓰면 그 문항 보상 상한 70%) ──
alter table web.learn_assignments add column hint_used_at timestamptz;
-- 답안 베끼기 검사(같은 학급 · 같은 문항)를 빨리.
create index learn_assignments_item_idx on web.learn_assignments (class_id, item_id);

-- ── 가동 보호권 — 같은 근거(답안 · 노트 평가)로 두 장 생기지 않게 ──
create unique index learn_shields_source_key on web.learn_shields (team_id, earned_from);

-- ── Series A/B 정성 평가 결과(루브릭 ○△× · 피드백 · 플래그) ──
alter table web.learn_pitch_rounds add column qual_result jsonb;

-- ── 이의 제기 — 같은 대상에 열린 이의는 하나(두 사람이 같이 눌러도) ──
create unique index learn_appeals_open_key on web.learn_appeals (target_type, target_id) where status = 'open';

-- ── 재시도 루프가 대상 모둠 · 학급을 바로 읽게 ──
alter table web.learn_gradings add column team_id uuid references web.teams (id) on delete cascade;
alter table web.learn_gradings add column class_id uuid references web.classes (id) on delete cascade;
-- 같은 대상의 살아 있는 채점은 하나(동시 요청 · 재시작 뒤 중복 방지).
create unique index learn_gradings_live_key on web.learn_gradings (target_type, target_id) where status in ('pending', 'failed', 'unavailable');
