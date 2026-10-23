# crista-web

모둠(스타트업 제약회사)이 **실제 계산으로 신약 개발 파이프라인을 처음부터 허가까지** 밟아 보는 수업용 웹 플랫폼.

화면 흐름: **① 로그인 · 회원가입**(학급 코드) → **② 사옥 지구**(N개 모둠의 서로 다른 사옥이 2D 로 — 자기 사옥에 걸어가 스타트업 이름 등기) →
**③ 전광판 01 + 작업 화면**(위 띠에 스타트업 이름 · LED 흐르는 띠에 다른 모둠 소식 · 왼쪽 사이드바 **1. 발견 → 2. 최적화 → 3. 개발 · 규제 → 4. 임상 · 허가**(하위 1.1~4.2) · 오른쪽 작업 영역).

- 설계: [`docs/2026-10-23-crista-web-design.md`](docs/2026-10-23-crista-web-design.md)
- 화면 시안: [`design/pipeline-lab-30-variants.html`](design/pipeline-lab-30-variants.html) — 고른 시안은 **05 '4단계 로드맵'**([게시본 #v05](https://claude.ai/artifact/TPg2WfjBjjHSEDCuCD2Ekc)).
- 전광판 시안 30종(05 바탕): [`design/pipeline-board-30-variants.html`](design/pipeline-board-30-variants.html)([게시본](https://claude.ai/artifact/GETqFjoHDn8sYqkoqaWA7a)) — **01 'LED 흐르는 띠'** 선택.
- 사옥 지구 그림: crista 06 픽셀 에셋 사본 [`assets/crista/`](assets/crista/SOURCE.md).
- 계산: [crista](https://github.com/mulkib0/crista) 의 bio-worker(Open Targets · ChEMBL · AutoDock Vina · PLIP · ADMET-AI · RDKit)를 HTTP 로 쓴다.
- 규칙: `packages/shared-types` · `packages/game-rules` — crista 사본([`packages/SOURCE.md`](packages/SOURCE.md)).
- DB: crista Supabase 프로젝트의 `web` 스키마만(게임 표와 분리 — 설계 §5).

## 상태

W1(서버 · 계정)까지 — `apps/server`(REST · WebSocket · 정적) · `packages/web-contract` · `db/`(자체 실행기 · `web` 스키마) · 교사 생성 스크립트.
화면 코드는 아직 없다(W2). 구현 순서는 설계 §11.

| 경로 | 내용 |
| --- | --- |
| `apps/server` | Node(`node:http` + `ws` + `pg`) — 가입 · 로그인(HttpOnly 쿠키 세션) · 학급 · 입사 · 등기 API, `/ws` 학급 · 모둠 채널 |
| `packages/web-contract` | 입력 규칙(아이디 · 학급 코드 · 스타트업 이름 · 티커 …) · 티커 제안 · API · WebSocket 메시지 모양 |
| `db/` | `migrate.mjs` · `check-boundary.mjs` · `migrations/0000_bootstrap` · `0001_core` — [`db/README.md`](db/README.md) |
| `tools/with-local-env.mjs` | crista 의 로컬 Supabase 값만 실어 명령 실행(`.env.local` 의 호스팅 값은 쓰지 않는다) |

## 시작(로컬)

준비: crista 의 로컬 Supabase 가 떠 있어야 한다(colima `default` · crista 폴더에서 `supabase status`). 이 저장소에서 `supabase db reset` · `db push` 를 쓰지 않는다.

```sh
npm install
npm run db:migrate:local      # web 스키마 · crista_web 역할(로컬, 처음 한 번)
npm run db:check:local        # crista_web 이 web 밖을 못 건드리는지
npm run dev:server            # http://127.0.0.1:3390
npm run teacher:create -- --login teacher01 --name 김선생   # 비밀번호를 한 번만 출력
npm run e2e:w1                # W1 완료 조건 점검(서버가 떠 있어야 함)
npm run typecheck && npm test # 타입체크 · 단위 테스트
npm run test:rules            # crista 사본 game-rules 테스트(287/290 — 실패 3건은 사본 밖 crista 파일 경로, packages/SOURCE.md)
```

포트: 서버 3390 · 화면 5190(W2) · crista 워커 8790(W3). crista 의 5173/5174 · 2567/2568/2572 · 8787/8788/8796 · 553xx 는 쓰지 않는다.
