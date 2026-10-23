한국어로 응답하라. 문서 · 주석 · 커밋 · PR 도 한국어로 쓴다(코드 · 식별자 · 명령 · 경로는 원래 표기).

--c7 = context7 호출, --para = parallel search 호출, --exa = [exa.ai](http://exa.ai) 호출

## 이 저장소

- 신약 개발 파이프라인 수업 플랫폼(웹). 기준 설계: `docs/2026-10-23-crista-web-design.md`.
- 계산은 crista 의 bio-worker 를 HTTP 로 부르고, 규칙은 `packages/shared-types` · `packages/game-rules`(crista 사본 — `packages/SOURCE.md`)를 쓴다.

## 화면 시안

- 시안 · 미리보기는 **이 저장소의 HTML 파일을 본다**(`design/*.html` · `design/step-viz/`). 브라우저로 열거나 스크린샷으로 확인한다. claude.ai 게시본(아티팩트) 링크는 앞 계정 것이라 열리지 않으니 찾거나 쓰지 않는다.
- 고른 시안: 바탕 05 `design/pipeline-lab-30-variants.html` · 전광판 01 `design/pipeline-board-30-variants.html` · **본문 21 '둥근 섬'** `design/body-layout-30.html#L21`(설계 §5.4.1) · 단계 시각화 `design/step-viz-80.html#s{단계}v{시안}` · 1.2 `design/screening-pipeline.html`.
- `design/body-layout-30.html` · `design/step-viz-80.html` 은 `design/step-viz/` 의 원본(+ `design/data.js`)을 한 파일로 묶은 것이다. 원본을 고치면 한 파일본도 다시 묶는다.

## 화폐 (반드시)

- 화면 · 알림 · 소식 · LLM 이 쓰는 문구에서 **모든 돈은 '크리스타' 하나로 쓴다** — 연구비 · 비용 · 투자 · 주가 · 시가총액 모두. `$` · 달러 · 원 · `CRISTA`(영문 단위)를 쓰지 않는다. 워드마크 'CRISTA'(브랜드)는 그대로 둔다.
- 숫자는 `packages/web-contract/src/money.ts` 의 `formatCrista` · `formatCentsAsCrista`(웹은 `ink.ts` 의 `money`), 주가 · 시가총액은 `market.ts` 의 `formatPrice` · `formatCapM` 으로만 만든다. 금액을 문자열에 직접 박지 않는다.
- 저장 값은 그대로다 — 원장은 정수 센트(1 크리스타 = 20 센트), 주가는 `price_usd`($1 = 5 크리스타).

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
