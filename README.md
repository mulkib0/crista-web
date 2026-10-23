# crista-web

모둠(가상 제약회사)이 **실제 계산으로 신약 개발 파이프라인을 처음부터 허가까지** 밟아 보는 수업용 웹 플랫폼.
왼쪽 사이드바의 **1. 발견 → 2. 최적화 → 3. 개발 · 규제 → 4. 임상 · 허가**(하위 단계 1.1 · 1.2 …), 오른쪽 작업 영역, 위쪽 **전광판**(다른 모둠의 기업가치 · 단계 통과 · 실패 소식)으로 구성한다.

- 설계: [`docs/2026-10-23-crista-web-design.md`](docs/2026-10-23-crista-web-design.md)
- 화면 시안: [`design/pipeline-lab-30-variants.html`](design/pipeline-lab-30-variants.html) — 고른 시안은 **05 '4단계 로드맵'**([게시본 #v05](https://claude.ai/artifact/TPg2WfjBjjHSEDCuCD2Ekc)).
- 전광판 시안 30종(05 바탕): [`design/pipeline-board-30-variants.html`](design/pipeline-board-30-variants.html)([게시본](https://claude.ai/artifact/GETqFjoHDn8sYqkoqaWA7a)) — 아직 고르지 않음.
- 계산: [crista](https://github.com/mulkib0/crista) 의 bio-worker(Open Targets · ChEMBL · AutoDock Vina · PLIP · ADMET-AI · RDKit)를 HTTP 로 쓴다.
- 규칙: `packages/shared-types` · `packages/game-rules` — crista 사본([`packages/SOURCE.md`](packages/SOURCE.md)).
- DB: crista Supabase 프로젝트의 `web` 스키마만(게임 표와 분리 — 설계 §5).

## 상태

W0(저장소 · 설계)까지. 서버 · 화면 코드는 아직 없다 — 구현 순서는 설계 §9.

## 시작(로컬)

1. crista 의 `.env.local` 을 이 저장소 루트에 둔다(이미 복사됨, 커밋하지 않는다). 이름 목록은 `.env.example`.
2. W1 이후: `npm install` → crista 워커를 8790 으로 실행 → `npm run dev`(서버 3390 · 화면 5190).
