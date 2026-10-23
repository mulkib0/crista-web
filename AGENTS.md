한국어로 응답하라. 문서 · 주석 · 커밋 · PR 도 한국어로 쓴다(코드 · 식별자 · 명령 · 경로는 원래 표기).

--c7 = context7 호출, --para = parallel search 호출, --exa = [exa.ai](http://exa.ai) 호출

## 이 저장소

- 신약 개발 파이프라인 수업 플랫폼(웹). 기준 설계: `docs/2026-10-23-crista-web-design.md`.
- 계산은 crista 의 bio-worker 를 HTTP 로 부르고, 규칙은 `packages/shared-types` · `packages/game-rules`(crista 사본 — `packages/SOURCE.md`)를 쓴다.

## crista 게임과 겹치지 않게 (반드시)

- DB 는 crista Supabase 프로젝트를 같이 쓴다. **`web` 스키마만** 만들고 쓴다. `public` 등 다른 스키마를 읽거나 쓰지 않는다.
- **`supabase db push` · `supabase migration` 을 이 저장소에서 쓰지 않는다** — crista 의 마이그레이션 이력과 섞인다. `db/migrations/*.sql` 과 자체 실행기(`web.schema_migrations`)만 쓴다.
- 호스팅 DB 적용 · Railway 서비스 생성 · 배포는 사용자 확인 뒤에 한다(dry-run 먼저).
- 웹 계정의 합성 이메일 도메인은 `web.crista.test`(게임은 `students.crista.test`).
- 워커로 보내는 id 에 접두: `jobId = web-<uuid>` · `classId = web:<uuid>` · `teamId = web:<uuid>`.
- 로컬 포트: 화면 5190 · 서버 3390 · crista 워커 8790. crista 가 쓰는 5173/5174 · 2567/2568/2572 · 8787/8788/8796 · 553xx 를 쓰지 않는다.
- `packages/shared-types` · `packages/game-rules` 의 판정 · 비용 값을 이 저장소에서 고치지 않는다(crista 에서 고치고 다시 복사).

## 비밀값

- `.env.local` 은 crista 에서 복사했다. 값을 출력 · 로그 · 커밋하지 않는다. 이름은 `.env.example` 에.
- `certs/supabase-prod-ca-2021.crt` 는 공개 CA 인증서다(풀러 `verify-full` 용).
