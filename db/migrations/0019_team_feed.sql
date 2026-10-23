-- 0019_team_feed — 모둠 대화방(시안 06 '채널 목록' · 2026-10-24 사용자 지시 "모둠원들의 행적이 기록되고, 채팅도 가능하게(Slack형), 채팅/행적만 볼 수 있게").
-- crista_web 연결로 적용한다. web 스키마 밖은 만들거나 바꾸지 않는다. 0000~0018 은 고치지 않는다(0020~ 은 항체 랩 예약).
-- 쓰기 규칙은 apps/server/src/features/feed.ts 머리 주석.

-- ── 1. 모둠마다 순번 머리 ──
-- 대화 · 행적 한 줄마다 모둠 안 순번(team_seq)을 이 행 잠금 안에서 +1 한다. 잠금이 커밋까지 가므로 순번 순서 = 커밋 순서 —
-- 읽은 위치(last_seq)보다 작은 순번이 나중에 나타나지 않는다. 이 표는 대화방만 잠근다(잠금 순서의 맨 끝 — teams · classes 를 잡은 트랜잭션 안에서 불러도 된다).
create table web.team_feed_heads (
  team_id uuid primary key references web.teams (id) on delete cascade,
  last_seq bigint not null default 0 check (last_seq >= 0)
);

-- ── 2. 대화 · 행적 ──
-- kind 'chat' = 모둠원이 쓴 말(code 'chat'), 'act' = 행적(code 예: 'note:1.2:why' · 'job:2.1' · 'screen:proposal:mw' · 'board:patent').
-- step_id 가 있으면 그 단계 채널에 들어간다(없으면 '모둠 전체'에만). 트랙마다 단계 id 꼴이 달라 글자로 둔다(소분자 '1.2' · 항체 'ab.…').
-- actor_name 은 그때 이름(계정이 지워져도 기록은 남게). 행적의 actor 가 없으면 시스템(작업 완료 · 심사 결과 · 전광판 소식).
-- 같은 사람이 같은 일을 잇달아 하면(노트 고치기 등) 새 줄 대신 마지막 줄의 repeat 를 늘린다(그 줄이 모둠의 마지막 줄일 때만).
create table web.team_feed (
  id bigint generated always as identity primary key,
  team_id uuid not null references web.teams (id) on delete cascade,
  team_seq bigint not null check (team_seq >= 1),
  kind text not null check (kind in ('chat', 'act')),
  code text not null check (char_length(code) between 1 and 80),
  actor_id uuid references web.accounts (user_id) on delete set null,
  actor_name text check (char_length(actor_name) between 1 and 40),
  step_id text check (step_id ~ '^[a-z0-9.]{1,16}$'),
  body text not null check (char_length(body) between 1 and 600),
  tone text not null default 'normal' check (tone in ('normal', 'good', 'bad')),
  mentions uuid[] not null default '{}',
  repeat integer not null default 1 check (repeat >= 1),
  -- 화면이 보낸 메시지 키(같은 메시지를 두 번 보내도 한 줄) — chat 만.
  client_id text check (client_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  game_day double precision check (game_day >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, team_seq),
  check (kind = 'act' or (code = 'chat' and actor_id is not null)),
  check (client_id is null or kind = 'chat')
);
create unique index team_feed_client_key on web.team_feed (team_id, actor_id, client_id) where client_id is not null;
create index team_feed_step_idx on web.team_feed (team_id, step_id, team_seq);
create index team_feed_kind_idx on web.team_feed (team_id, kind, team_seq);
create index team_feed_mentions_idx on web.team_feed using gin (mentions);

-- ── 3. 읽은 위치 — (사람, 모둠, 채널)마다 한 줄, 앞으로만 간다 ──
-- channel 'all'(모둠 전체) 을 읽으면 모든 채널이 그 순번까지 읽힌 것으로 본다. 단계 채널은 그 단계 줄만.
-- 한 줄이 안 읽힘 = 남이 썼고 · 지우지 않았고 · team_seq > greatest(그 단계 채널 위치, 'all' 위치).
create table web.team_feed_reads (
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  team_id uuid not null references web.teams (id) on delete cascade,
  channel text not null check (channel = 'all' or channel ~ '^[a-z0-9.]{1,16}$'),
  last_seq bigint not null default 0 check (last_seq >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, team_id, channel)
);
create index team_feed_reads_team_idx on web.team_feed_reads (team_id);
