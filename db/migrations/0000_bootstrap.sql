-- 0000_bootstrap — 관리자 연결(CRISTA_DATABASE_URL)로 한 번만 적용한다(설계 §7.2).
--   역할 crista_web · 스키마 web · 실행기 기록 표 · auth.users 를 가리키는 유일한 표 web.accounts.
--   crista_web 의 비밀번호는 이 파일에 없다 — 실행기(db/migrate.mjs)가 WEB_DATABASE_URL 의 비밀번호로
--   SCRAM 검증값을 만들어 같은 트랜잭션에서 `alter role … password` 로 넣는다(평문이 DB 로그에 남지 않게).
--
-- 왜 web.accounts 가 여기 있나:
--   관리자 역할 postgres 는 auth.users 에 REFERENCES 권한이 있지만 남에게 넘길 권한(grant option)은 없다
--   (로컬에서 확인 — relacl `postgres=ar*wdDxtm`). 그래서 auth.users 로 거는 외래 키는 관리자가 만든 표만 가질 수 있다.
--   나머지 표(0001~)는 crista_web 이 만들고 소유하며 web.accounts 를 가리킨다.
--
-- 이 파일은 public 등 다른 스키마의 객체를 만들거나 바꾸지 않는다. 걷어내기: db/README.md.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crista_web') then
    create role crista_web login nosuperuser nocreatedb nocreaterole noreplication nobypassrls noinherit connection limit 30;
  end if;
end
$$;

alter role crista_web set search_path = web;
alter role crista_web set statement_timeout = '15s';
alter role crista_web set idle_in_transaction_session_timeout = '60s';

create schema web;
revoke all on schema web from public;
grant usage, create on schema web to crista_web;

-- 실행기 기록 — crista 의 supabase_migrations.schema_migrations 와 따로 둔다.
create table web.schema_migrations (
  version text primary key check (version ~ '^[0-9]{4}$'),
  name text not null,
  checksum text not null check (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);
revoke all on web.schema_migrations from public;
grant select, insert on web.schema_migrations to crista_web;

-- 웹 계정 — GoTrue 사용자 `<login_id>@web.crista.test` 하나에 한 줄. 교사 · 학생 모두.
create table web.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  login_id text not null unique check (login_id ~ '^[a-z0-9]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 20),
  kind text not null check (kind in ('teacher', 'student')),
  created_at timestamptz not null default now()
);
revoke all on web.accounts from public;
grant select, insert, update, delete, references on web.accounts to crista_web;
