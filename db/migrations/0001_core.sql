-- 0001_core — 학급 · 모둠(사옥 · 등기) · 학급 명단 · 로그인 세션. crista_web 연결로 적용한다(이 표들의 소유자 = crista_web).
-- 규칙 값은 packages/web-contract/src/rules.ts 와 같다(설계 §3 · §4 · §7.3 · §9). 시계 · 원장 · 작업은 W3~W4 의 다음 파일에서.

create table web.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references web.accounts (user_id),
  name text not null check (char_length(name) between 1 and 40),
  -- 학급 코드 6자 — 헷갈리는 0 · O · 1 · I · L 을 뺀 글자. 닫힌 코드도 다시 쓰지 않는다(전체 유일).
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{6}$'),
  code_open boolean not null default true,
  team_count smallint not null check (team_count between 2 and 8),
  assignment text not null default 'walk-in' check (assignment in ('assigned', 'walk-in')),
  max_students smallint not null default 40 check (max_students between 1 and 200),
  -- null = 자동(⌈max_students ÷ team_count⌉)
  team_capacity smallint check (team_capacity between 1 and 50),
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on web.classes (teacher_id);

-- 모둠 = 사옥 부지 하나. 학급을 만들 때 N 줄을 함께 만든다. 이름 · 티커 · 슬로건은 등기 전 null.
create table web.teams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references web.classes (id) on delete cascade,
  plot smallint not null check (plot between 1 and 8),
  facade smallint not null check (facade between 1 and 8),
  ink smallint not null check (ink between 1 and 8),
  hq_tier smallint not null default 1 check (hq_tier between 1 and 3),
  startup_name text check (char_length(startup_name) between 2 and 14 and startup_name ~ '^[가-힣A-Za-z0-9]+( [가-힣A-Za-z0-9]+)?$'),
  name_key text generated always as (lower(replace(startup_name, ' ', ''))) stored,
  ticker text check (ticker ~ '^[A-Z]{3,4}$'),
  slogan text check (char_length(slogan) between 1 and 40),
  registered_at timestamptz,
  registered_by uuid references web.accounts (user_id) on delete set null,
  -- 첫 유료 행동 때 채운다(W3). 그 뒤 이름 고치기는 교사만.
  name_locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, plot),
  unique (id, class_id),
  -- 등기는 이름 · 티커 · 시각이 함께 생긴다.
  check ((startup_name is null) = (ticker is null) and (startup_name is null) = (registered_at is null)),
  check (slogan is null or startup_name is not null)
);
create unique index teams_class_name_key on web.teams (class_id, name_key) where name_key is not null;
create unique index teams_class_ticker_key on web.teams (class_id, ticker) where ticker is not null;

-- 학급 명단 — 학생은 학급 하나에만. team_id null = 아직 입사 전.
create table web.members (
  class_id uuid not null references web.classes (id) on delete cascade,
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  team_id uuid,
  -- 학생이 사옥 문을 열고 들어온 시각(assigned 는 교사가 배정만 하면 null 일 수 있다).
  joined_team_at timestamptz,
  avatar text check (avatar in ('ceo', 'cso', 'cto', 'cmo')),
  created_at timestamptz not null default now(),
  primary key (class_id, user_id),
  -- 모둠은 같은 학급의 것이어야 한다. 모둠이 지워지면 team_id 만 비운다.
  foreign key (team_id, class_id) references web.teams (id, class_id) on delete set null (team_id),
  check (role = 'student' or team_id is null)
);
create unique index members_one_class_per_student on web.members (user_id) where role = 'student';
create index members_team_idx on web.members (team_id) where team_id is not null;

-- 로그인 세션 — 쿠키에는 무작위 토큰, DB 에는 그 SHA-256 만. GoTrue 토큰은 저장하지 않는다.
create table web.sessions (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  user_id uuid not null references web.accounts (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on web.sessions (user_id);
create index sessions_expires_idx on web.sessions (expires_at);
