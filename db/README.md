# db — `web` 스키마 · 자체 마이그레이션 실행기

crista 와 같은 Supabase 프로젝트를 쓰되 **`web` 스키마만** 쓴다(설계 §7). Supabase CLI 마이그레이션(`supabase db push` · `supabase migration`)은 이 저장소에서 쓰지 않는다 — crista 의 m2~v11 이력과 섞인다.

| 파일 | 하는 일 |
| --- | --- |
| `migrate.mjs` | `migrations/NNNN_이름.sql` 을 이름순으로 파일마다 한 트랜잭션 적용 · `web.schema_migrations(version, name, checksum, applied_at, applied_by)` 기록 · 적용한 파일의 SHA-256 이 바뀌면 멈춤 · `--status` · `--dry-run` · `--reset-role-password` |
| `check-boundary.mjs` | `crista_web` 로 붙어 public 읽기 · 쓰기 · 표 만들기, auth 읽기, 새 스키마 만들기가 **거절되는지** 실제로 시도(쓰기 시도는 늘 되돌림) |
| `migrations/0000_bootstrap.sql` | **관리자 연결로 한 번** — 역할 `crista_web`(login · 슈퍼유저 아님 · 연결 30) · 스키마 `web`(public 권한 회수) · `web.schema_migrations` · `web.accounts` |
| `migrations/0001_core.sql` | `crista_web` 연결 — `classes` · `teams` · `members` · `sessions` (소유자 `crista_web`) |
| `migrations/0002_pipeline.sql` | `crista_web` 연결 — 화면 ③ 1. 발견 · 2. 최적화: `programs` · `target_picks` · `ledger` · `jobs` · `claims` · `notes` |

## 명령(로컬)

```sh
npm run db:status:local    # 적용 상태
npm run db:migrate:local   # 밀린 파일 적용
npm run db:check:local     # 경계 점검(12항목)
```

`tools/with-local-env.mjs` 가 crista 폴더의 `supabase status -o env` 에서 **로컬 값만** 싣는다(`.env.local` 의 Supabase · DB 값은 호스팅 값이라 읽지 않는다).
`crista_web` 의 로컬 비밀번호는 `.env.local` 의 `WEB_LOCAL_DB_PASSWORD` 한 줄이다(처음 실행 때 도구가 무작위로 만들어 덧붙였다). 실행기는 이 값으로
SCRAM-SHA-256 검증값을 만들어 `alter role … password` 로 넣는다 — 평문 비밀번호가 SQL · DB 로그에 남지 않는다.

## 왜 `web.accounts` 가 0000 에 있나

관리자 역할 `postgres` 는 `auth.users` 에 REFERENCES 권한이 있지만 **남에게 넘길 권한이 없다**(로컬 `relacl` 확인: `postgres=ar*wdDxtm/supabase_auth_admin` — `*` 는 SELECT 에만).
그래서 `auth.users(id)` 로 거는 외래 키는 관리자가 만든 표만 가질 수 있다. `auth.users` 를 가리키는 표는 `web.accounts` 하나뿐이고, 나머지 표는 `crista_web` 이 만들어 `web.accounts` 를 가리킨다.
GoTrue 가 사용자를 지우면 `web.accounts` → `members` · `sessions` 로 이어서 지워진다.

## 호스팅(W6)

`WEB_TARGET=hosted` 는 `--status` · `--dry-run` 만 된다. 실제 적용은 dry-run SQL 을 보이고 확인을 받은 뒤 `--yes-hosted` 를 붙인다.
연결 문자열의 `sslmode` 는 빼고 `WEB_PGSSLROOTCERT`(`certs/supabase-prod-ca-2021.crt`)로 verify-full. 값은 `tools/with-hosted-env.mjs` 가 `.env.local` 에서 필요한 이름만 싣는다
(crista_web 호스팅 비밀번호 `WEB_HOSTED_DB_PASSWORD` · 게이트웨이 비밀 `WEB_GATEWAY_SECRET` 은 처음 실행 때 무작위로 만들어 덧붙인다 — 출력하지 않는다).

```sh
npm run db:status:hosted
npm run db:dry-run:hosted
node tools/with-hosted-env.mjs node db/migrate.mjs --yes-hosted
npm run db:check:hosted
```

2026-10-23 적용 — 0000 · 0001 · 0002, 경계 점검 12/12(호스팅). 적용 전 읽기 전용 점검: PostgreSQL 17.11 · `postgres` 의 `auth.users` REFERENCES 있음(넘길 권한 없음 — 0000 설계와 같다) ·
`web` 스키마 · `crista_web` 역할 없음 · `public` 표 34개 · `auth.users` 트리거 0개. 세션 풀러 역할 이름은 `crista_web.<project-ref>`(실행기 · 서버는 `.` 앞만 본다).

## 모두 걷어내기

```sql
-- 관리자 연결. web 스키마 소유자(postgres)가 지우면 crista_web 이 소유한 표도 함께 지워진다.
drop schema web cascade;
drop role crista_web;
```

웹 계정(`@web.crista.test`)은 GoTrue 관리자 API 로 지운다(DB 에서 `auth.users` 를 직접 지우지 않는다). 워커 캐시는 W3 부터 생긴다 — `public.simulation_cache` 의 `class_id like 'web:%'`.
