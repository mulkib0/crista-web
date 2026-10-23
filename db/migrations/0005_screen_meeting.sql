-- 0005_screen_meeting — 1.2 모둠 기준 회의 · 분자 쇼핑(설계 §5.5 · §5.5.1 · §7.3 '1.2 기준 회의' · §7.4 ⑥ ⑦ ⑧).
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0004 는 고치지 않는다.
--
-- 원칙(설계 §7.3): 모둠 공유 칸은 한 사람 · 한 안건이 한 행. 모두 표적 버전(program_revisions)에 묶여 표적을 바꾸면 새 회의가 열린다(옛 회의는 남는다).
-- 쓰기 규칙(기능 F12 — apps/server/src/features/screen.ts):
--   - 투표 · 제안 · '다시 논의'는 한 트랜잭션에서 먼저 screen_agendas 의 그 안건 행을 FOR UPDATE 로 잠근다(⑥).
--   - 스크리닝 실행 요청에는 기준을 싣지 않는다 — 서버가 screen_agendas 를 읽어 6개 모두 agreed 가 아니면 409(⑦).
--   - 찜 근거(claims.reason)는 서버가 그 분자 값으로 다시 판정한다(⑧).
-- 표적 버전을 새로 열 때 안건 6행은 서버(pipeline.ts openScreenAgendas)가 만든다. 이 파일은 이미 있는 버전에 채운다.
-- 안건 값 범위는 packages/web-contract/src/screen.ts `SCREEN_AGENDA_RANGE` 와 같다.

-- ── 안건 값 범위 — 표 셋이 같은 검사를 쓴다 ──
create function web.screen_agenda_value_ok(agenda text, value numeric) returns boolean
language sql immutable as $$
  select case agenda
    when 'mw'    then value between 250 and 650 and mod(value, 10) = 0
    when 'tpsa'  then value between 40 and 180 and mod(value, 5) = 0
    when 'ro5'   then value in (0, 1, 2)
    when 'alert' then value in (0, 1)            -- 1 = 구조 경고 분자 빼기 · 0 = 허용
    when 'qed'   then value between 0 and 0.90 and mod(value * 100, 5) = 0
    when 'score' then value between 0 and 0.90 and mod(value * 100, 5) = 0
    else false
  end
$$;

-- ── ① 미션 브리핑 — 사람마다 질문 하나에 한 행(동시에 답해도 덮어쓰지 않는다) ──
create table web.screen_briefing (
  program_revision_id uuid not null,
  team_id uuid not null,
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  -- cns · dur · route = 회의 전 질문 3개, read = 미션 글 '읽음' 표시.
  question text not null check (question in ('cns', 'dur', 'route', 'read')),
  answer text not null check (char_length(answer) between 1 and 200),
  answered_at timestamptz not null default now(),
  primary key (program_revision_id, user_id, question),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);

-- ── ② 안건 — 잠금 대상이 되는 한 행(투표 · 합의를 이 행 잠금으로 직렬화) ──
create table web.screen_agendas (
  program_revision_id uuid not null,
  team_id uuid not null,
  agenda text not null check (agenda in ('mw', 'tpsa', 'ro5', 'alert', 'qed', 'score')),
  -- '다시 논의' = round + 1 · status = 'open'(그 안건의 표는 지금 round 것만 센다).
  round integer not null default 1 check (round >= 1),
  status text not null default 'open' check (status in ('open', 'agreed')),
  value numeric,
  proposed_by uuid references web.accounts (user_id) on delete set null,
  votes smallint check (votes >= 0),
  agreed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (program_revision_id, agenda),
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  check (value is null or web.screen_agenda_value_ok(agenda, value)),
  -- 합의하면 값 · 시각이 함께 생기고, 열리면 함께 비운다.
  check ((status = 'agreed') = (value is not null and agreed_at is not null))
);

-- ── 제안 — 한 사람이 안건마다 하나(다시 내면 값 · 근거만 바뀐다) ──
create table web.screen_proposals (
  program_revision_id uuid not null,
  team_id uuid not null,
  agenda text not null,
  proposed_by uuid not null references web.accounts (user_id) on delete cascade,
  value numeric not null,
  -- 근거 키(미리보기 `AG[].reasons[].id`) — 서버가 코치 규칙으로 판정한다(회의에서는 경고만).
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{0,39}$'),
  updated_at timestamptz not null default now(),
  primary key (program_revision_id, agenda, proposed_by),
  foreign key (program_revision_id, agenda) references web.screen_agendas (program_revision_id, agenda) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade,
  check (web.screen_agenda_value_ok(agenda, value))
);

-- ── 표 — 한 사람 한 표, 지금 round 의 표만 센다. 제안 값이 바뀌면 그 제안의 다른 사람 표는 서버가 지운다(⑥) ──
create table web.screen_votes (
  program_revision_id uuid not null,
  team_id uuid not null,
  agenda text not null,
  voter uuid not null references web.accounts (user_id) on delete cascade,
  round integer not null check (round >= 1),
  proposed_by uuid not null,
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{0,39}$'),
  voted_at timestamptz not null default now(),
  primary key (program_revision_id, agenda, voter),
  foreign key (program_revision_id, agenda, proposed_by) references web.screen_proposals (program_revision_id, agenda, proposed_by) on delete cascade,
  foreign key (program_revision_id, team_id) references web.program_revisions (id, team_id) on delete cascade
);
create index screen_votes_proposal_idx on web.screen_votes (program_revision_id, agenda, proposed_by);

-- 이미 있는 표적 버전에도 안건 6행을 연다(새 버전은 서버가 연다).
insert into web.screen_agendas (program_revision_id, team_id, agenda)
select r.id, r.team_id, a.agenda
  from web.program_revisions r
 cross join (values ('mw'), ('tpsa'), ('ro5'), ('alert'), ('qed'), ('score')) as a (agenda)
on conflict do nothing;

-- ── 찜 근거 — 확정서 · 2.1 비교표의 담당자 칸 · 투자 심사 '4인 병렬 발굴' 근거 ──
-- 0005 전의 찜은 근거 없이 찜했다 — 'legacy' 로 채운다(화면은 '근거 없음(이전 판)'으로 보인다).
alter table web.claims add column reason text;
update web.claims set reason = 'legacy' where reason is null;
alter table web.claims alter column reason set not null;
alter table web.claims add constraint claims_reason_check check (reason ~ '^[a-z][a-z0-9_]{0,39}$');
