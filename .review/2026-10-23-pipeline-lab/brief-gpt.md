**먼저 지킬 것: 저장소 파일을 만들거나 고치지 마라(읽기 전용). 읽기용 셸(rg · sed · cat)은 써도 된다. 의견서는 최종 답으로만 출력한다.**

# 의뢰서 — Crista '신약 개발 파이프라인 랩' 플랫폼 설계 교차 검토 (2026-10-23)

너는 Crista 저장소(`/Users/mulkib/Desktop/repo/crista`)의 **설계 공동 검토자**다. 코드를 고치지 말고, 읽고 판단해서 **설계 의견서 한 편**을 한국어 마크다운으로 답한다.

## 1. 사용자 요청 (원문 요지)

> 지금 신약 개발 파이프라인 그대로 **왼쪽 사이드바 / 오른쪽에 진짜 뜨게**. 게이미피케이션 요소(제약회사 이름 정하기, 연구비 받아서 돌리기 등)는 있지만,
> **아예 신약개발 파이프라인을 해보는 플랫폼**도 여기에 만들고 싶다. **현재 연결되어 있는 것(게임 서버 · 바이오 워커 · DB)을 살려서.**
> 조건: **왼쪽 사이드바에 순서대로 확연히 알 수 있도록 단계별로 1. 2. 3. 4. 이렇게 써 있을 것.**
> 화면 디자인(UI/UX)은 다른 세션이 프리뷰로 만들고 있다 — 이번 의뢰는 **구조 · 단계 정의 · 상태 · 서버 계약 · 재사용 · 위험**을 설계한다.

## 2. 조정자가 확인한 사실 (여기 적힌 수치 · 경로는 확인됨 — 필요하면 파일을 직접 열어 대조하라)

- 제품: 2D 탑다운 멀티플레이어 제약회사 타이쿤(Phaser 3 월드 + React 창) + 실제 계산 파이프라인. `PRD.md` · `ARCHITECTURE.md`.
- 구성: `apps/desktop-client`(Tauri v2 + React 19 + Vite + Phaser 3) · `apps/game-server`(Colyseus 0.18, 서버 권위) · `apps/bio-worker`(FastAPI) · Supabase. 공유 계약 `packages/shared-types`(프로토콜 v11), 순수 규칙 `packages/game-rules`.
- 지금 학생은 **도시를 걸어 다니며** 장소마다 행동한다. 모든 실험 · 파이프라인 메시지는 `interactableId` 를 싣고 서버가 **서버 권위 위치의 사거리**를 확인한다:
  - 실험: `apps/game-server/src/rooms/handlers.ts` `handleExperimentRequest`(L350~) → `apps/game-server/src/world/interact.ts` `checkExperimentPermission`(L307~, 설비 건설 · 등급 · 가동 · 사거리).
  - 파이프라인 10종 메시지: `apps/game-server/src/rooms/pipeline.ts` → `apps/game-server/src/pipeline/service.ts` 의 장소 판정(L480~501 부근, `withinRange` · 기관 종류 · 내 사옥 설비 종류).
  - `ClientCtx`(`apps/game-server/src/ports.ts` L51~)가 위치 `x · y` · 맵을 싣는다. 메시지 전달은 룸이 아니라 `Hub`(`apps/game-server/src/hub.ts`)의 사용자 · 팀 통로라 룸을 옮겨도 팀 결과가 온다.
- 실제로 돌아가는 단계(설비 → 계산):
  - Stage 1 표적 탐색실: Open Targets v4 실데이터 480 유전자(4대 질환 × 120), `source: 'dataset'`, 무료.
  - Stage 2 HTVS·합성실: ChEMBL/RDKit 220 화합물 깔때기(MW·TPSA·Ro5·구조 경고 컷오프, 사전 Vina 값), `candidates` 를 결과에 싣는다, 무료.
  - Stage 3 도킹 서버실: RDKit ETKDGv3 → Meeko → AutoDock Vina 1.2.7 → PLIP, 표적 4종(AChE 4EY7 · EGFR 1M17 · DPP4 1X70 · COX-2 3LN1, 재도킹 기준 `referenceKcal`), 유료 $0.050M.
  - Stage 4 ADMET실: ADMET-AI v2(레이더 6축), 유료 $0.050M. 평가 대상은 그 팀의 유효 특허 분자.
  - 워커 엔드포인트: `POST /jobs` · `GET /jobs/{id}` · `POST /molecule/properties`(RDKit 물성) · `/llm/analyst` · `/llm/npc` · `/datasets/summary|targets|compounds`.
- 신약 파이프라인 후반(M5, `packages/shared-types/src/pipeline.ts` 머리말 · `docs/2026-10-19-game-balance-v0.md` §10.1):
  ① 코드명 · 기전 선언(표적 탐색실, Stage 1 성공 필요, 무료) → 물질특허(시청 · 특허청, 이번 세대 **실제 도킹** 분자, $0.050M) → ② 후보 · 제형(ADMET실, 무료) →
  IND(FDA, 용량 10/50/100mg · 환자군 · 1차 평가지표, $0.100M, 30게임 일) → 임상 1 · 2 · 3상(대학병원, $0.300M/$0.600M/$1.200M, 90/180/360게임 일) → ③ 최종 허가(FDA, 브랜드 · 포장, $0.100M, 60게임 일).
  판정은 game-rules 순수 함수(효능 E · 안전 S). 보류(CRL) 뒤 재도전 3경로. 회사마다 파이프라인 하나.
- HUD 의 '파이프라인 패널'(`apps/desktop-client/src/ui/pipeline/PipelinePanel.tsx`)이 이미 8칸(선언 → 특허 → 제형 → IND → 1상 → 2상 → 3상 → 허가)과 '다음에 갈 곳'을 보여 준다. 창 컴포넌트: `InteractModal.tsx`(실험 의뢰 서식) · `ResultSheet.tsx`(실험 결과지) · `pipeline/FacilityPipeline.tsx`(선언 · 제형) · `pipeline/DeskWindow.tsx`(특허청 · FDA · 대학병원 창구) · `pipeline/StepResultSheet.tsx`(단계 판정) · `BountyTab.tsx`(실패 바운티).
- 게이미피케이션(구현됨 v8~v10): 회사(사명 · 티커 · 슬로건 · 지구)는 **교사가 학급 만들 때** 정한다(`ui/teacher/CreateClassForm.tsx`) — 학생이 정하는 건 파산 뒤 재창업(`COMPANY_REFOUND`)뿐. 초기 연구비 $6.000M, 설비 설치비(표적 $1.000M · HTVS $0.500M · 도킹 $0.700M · ADMET $0.500M), 게임 월 유지비, Series A/B 는 교사 승인(`investment`), 실패 데이터 바운티 · CRO 의뢰 · 학회 · 라이선스 · 임대 · 사옥 Tier · 바이오 증시.
- 학급 게임 시계(가변 배율 · 일시정지), 유료 작업은 일시정지 · 구조조정 중 막힘, 멱등 `(팀, requestId, 세대)`, 교사 정정 · 학급 복원(세대 + 1).
- 첫 사용자 페르소나 모의 테스트(`.review/persona-2026-10-23/report.md`)의 핵심 문제: **현재 목표와 선행 행동의 연결**이 약하다(다음 목적지가 선행 조건보다 앞섬, 표적 탐색 창 안의 순서 뒤집힘, 결과에서 다음 실험으로 후보를 넘기는 버튼 없음, 질환/PDB 기본값 불일치).
- 비영리 교육 전용 운영(고등학생 대상 수업).

## 3. 답해야 할 질문

1. **사이드바 단계 목록** — 실제 신약 개발 파이프라인(표적 발굴 · 검증 → 히트 발굴 → 히트-리드 → 리드 최적화 → 전임상 → IND → 임상 1 · 2 · 3 → 허가)과 지금 구현을 어떻게 1. 2. 3. … 번호로 짝지을까?
   번호 개수, 묶음(단계 그룹), 회사 설립 · 연구비(게이미피케이션)를 번호 안에 넣을지 밖(회사 카드)에 둘지, 임상 1 · 2 · 3상을 각각 번호로 할지. 근거를 대라.
2. **진입과 모드** — 걷는 월드와 이 플랫폼을 어떻게 공존시킬까? (학급 단위 교사 선택 / 학생 토글 / 둘 다). 같은 학급에서 '걸어가야 하는 규칙'을 우회하는 공정성 문제를 어떻게 막을까?
3. **서버 계약** — 위치 사거리 판정을 대신할 권한 경로(예: 가상 지점 id · 별도 Colyseus 룸 · `ClientCtx` 의 장소 정책)를 어떻게 설계할까? 팀 격리 · 멱등 · 세대 · 유료 차단 · 정정/복원 불변식을 어떻게 지킬까? 프로토콜 v12 로 무엇이 바뀌나?
4. **오른쪽 작업 영역** — 단계마다 입력 · 실행 · 결과 · '다음 단계로 넘기기'(예: Stage 2 후보 → Stage 3 도킹 입력 → 특허 → ADMET)를 무엇으로 채울까? 기존 컴포넌트 중 그대로 쓰는 것 · 빼서 다시 짜야 하는 것.
5. **빈 곳** — '진짜 해 보는' 플랫폼이 되려면 지금 비어 있는 과학 단계(예: 리드 최적화 — 작용기를 바꿔 물성 · 도킹 다시 보기, 표적 검증 근거 읽기, 연구비 심사)를 최소 어디까지 더해야 하나? 무료 물성 미리 보기를 어떻게 줄까(워커 `/molecule/properties` 를 학생 요청으로 열기 vs 클라이언트 RDKit.js)?
6. **적대적 검토** — 이 설계가 깨질 지점(교육 효과 · 공정성 · 비용 남용 · 상태 불일치 · 다른 세션의 UI 프리뷰와 계약 어긋남)을 우선순위로.
7. **구현 순서** — 작게 나눈 단계(각 단계의 완료 기준 포함).

## 4. 답 형식

- 한국어 마크다운. 제목 `# <모델 이름> 의견서 — 신약 개발 파이프라인 랩`.
- 위 질문 번호대로 절을 나눈다. 각 주장에는 근거 파일 경로(가능하면 줄 번호)를 붙인다. 확인 못 한 것은 '추정'이라고 쓴다.
- 길이는 3,000 단어 이내. 표를 써도 된다. 코드 전체를 쓰지 말고 타입 · 함수 시그니처 수준까지만.
