# db — `web` 스키마 · 자체 마이그레이션 실행기

crista 와 같은 Supabase 프로젝트를 쓰되 **`web` 스키마만** 쓴다(설계 §7). Supabase CLI 마이그레이션(`supabase db push` · `supabase migration`)은 이 저장소에서 쓰지 않는다 — crista 의 m2~v11 이력과 섞인다.

| 파일 | 하는 일 |
| --- | --- |
| `migrate.mjs` | `migrations/NNNN_이름.sql` 을 이름순으로 파일마다 한 트랜잭션 적용 · `web.schema_migrations(version, name, checksum, applied_at, applied_by)` 기록 · 적용한 파일의 SHA-256 이 바뀌면 멈춤 · `--status` · `--dry-run` · `--reset-role-password` |
| `check-boundary.mjs` | `crista_web` 로 붙어 public 읽기 · 쓰기 · 표 만들기, auth 읽기, 새 스키마 만들기가 **거절되는지** 실제로 시도(쓰기 시도는 늘 되돌림) |
| `migrations/0000_bootstrap.sql` | **관리자 연결로 한 번** — 역할 `crista_web`(login · 슈퍼유저 아님 · 연결 30) · 스키마 `web`(public 권한 회수) · `web.schema_migrations` · `web.accounts` |
| `migrations/0001_core.sql` | `crista_web` 연결 — `classes` · `teams` · `members` · `sessions` (소유자 `crista_web`) |
| `migrations/0002_pipeline.sql` | `crista_web` 연결 — 화면 ③ 1. 발견 · 2. 최적화: `programs` · `target_picks` · `ledger` · `jobs` · `claims` · `notes` |
| `migrations/0004_password_verifiers.sql` | `crista_web` 연결 — 로그인 비밀번호 검증값 `password_verifiers`(scrypt). 로그인을 서버 안에서 확인해 GoTrue 의 IP 당 상한을 피한다(`apps/server/src/passwords.ts`) |
| `migrations/0005_screen_meeting.sql` | 3판 기반 — 1.2 기준 회의 · 분자 쇼핑: `screen_briefing` · `screen_agendas`(표적 버전마다 6행) · `screen_proposals` · `screen_votes` · `claims.reason`(옛 찜 'legacy') · 함수 `screen_agenda_value_ok` |
| `migrations/0006_develop_regulate.sql` | 3판 기반 — 2.1 → 3.3 · 서류 심사 · 게임 시계 · LLM 기록: `dock_picks` · `lead_candidates`(W3 리드 · 백업을 옮기고 지정은 비움) · `patent_applications` · `patent_sections` · `patents`(부분 고유 키) · `ethics_training` · `iacuc_*` · `ind_applications` · `ind_sections` · `doc_reviews` · `llm_calls` · `classes` 의 특허 상한 · 시계 칸 · `jobs` 3.2 넓히기 · 노트 '3.2' → '3.3' |
| `migrations/0007_market_learn.sql` | 3판 기반 — 전광판 `board_events` · `valuations` · 학습 연구비 `learn_*` 10표 · `ledger` 종류(출원료 · IND · 학습 · 투자 · 실패 바운티)와 `ref_type` · `ref_id` |
| `migrations/0009_target_pick_reasons.sql` | 1.1 추천 카드 근거 칩 · 가중치(설계 §5.4.2) — `target_picks.reasons text[]`(빈 배열 기본) · `weights real[]`(원소 4개 · 0~3 또는 null). 비어 있던 번호를 썼다(0019 와 겹쳐 옮김) |
| `migrations/0019_team_feed.sql` | 모둠 대화방(시안 06) — `team_feed_heads`(모둠마다 순번 머리) · `team_feed`(대화 · 행적 한 줄기) · `team_feed_reads`(사람 · 채널마다 읽은 위치). 쓰기 규칙은 `apps/server/src/features/feed.ts` 머리 주석 |
| `migrations/0040_auto_judge.sql` | 교사 승인 폐지(설계 §5.11.1) — `doc_reviews.release_game_day · held_verdict`(숙고 기간 뒤 공개) · `llm_status 'auto'`(규칙 자동 판정) · `clinical_trials.result_source 'rule'` · `classes.clock_rate` 기본 12. 0020~0039 는 항체 랩 예약이라 0040 |

번호는 비어도 된다 — 실행기는 이름순으로 아직 적용하지 않은 파일만 적용한다(0003 은 병렬 실험 작업이 쓰는 번호).
기능 단계의 예약 번호: F12 `0010` · FSEL `0011` · F31 `0012` · F32 `0013` · F33 `0014` · FLEARN `0015` · FMARKET `0016`(스키마를 꼭 고쳐야 할 때만 새 파일) · 1.1 추천 근거 `0009` · 모둠 대화방 `0019`(`0020~0039` 는 항체 랩) · 교사 승인 폐지 `0040`.

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

2026-10-23 적용 — 0000 · 0001 · 0002, 경계 점검 12/12(호스팅). 같은 날 0004(로그인 검증값) — 로컬 · 호스팅, 경계 점검 12/12. 적용 전 읽기 전용 점검: PostgreSQL 17.11 · `postgres` 의 `auth.users` REFERENCES 있음(넘길 권한 없음 — 0000 설계와 같다) ·
`web` 스키마 · `crista_web` 역할 없음 · `public` 표 34개 · `auth.users` 트리거 0개. 세션 풀러 역할 이름은 `crista_web.<project-ref>`(실행기 · 서버는 `.` 앞만 본다).

## 모두 걷어내기

```sql
-- 관리자 연결. web 스키마 소유자(postgres)가 지우면 crista_web 이 소유한 표도 함께 지워진다.
drop schema web cascade;
drop role crista_web;
```

웹 계정(`@web.crista.test`)은 GoTrue 관리자 API 로 지운다(DB 에서 `auth.users` 를 직접 지우지 않는다). 워커 캐시는 W3 부터 생긴다 — `public.simulation_cache` 의 `class_id like 'web:%'`.
