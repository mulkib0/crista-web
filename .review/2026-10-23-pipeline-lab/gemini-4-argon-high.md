# Gemini 4 Argon (High) 의견서 — 신약 개발 파이프라인 랩

---

## 1. 사이드바 단계 목록

### 1.1 설계 결론: **10단계 번호(1. ~ 10.) + 3개 단계 묶음 + 상단 고정 회사·연구비 카드(번호 밖)**

현재 HUD의 [`PipelinePanel.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/PipelinePanel.tsx#L164-L194)와 [`PIPELINE_CELLS`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/pipelineFormat.tsx#L114-L123)는 **후반부 8칸(`선언 → 특허 → 제형 → IND → 1상 → 2상 → 3상 → 허가`)만** 표시합니다. 이 때문에 첫 이용 학생 페르소나 모의 테스트([`report.md`](file:///Users/mulkib/Desktop/repo/crista/.review/persona-2026-10-23/report.md#L26-L31))에서 드러났듯, ① Stage 1 성공이 선행 조건인데도 '코드명 선언'이 먼저 보이고, ② 선언 직후 아직 Stage 2·3 도킹을 하지 않았는데도 다음 목적지가 '시청·특허청 창구'로 안내되는 **선행 행동 단절**이 발생합니다.

이를 해결하려면 왼쪽 사이드바는 **전반부 실험(Stage 1~4)과 후반부 파이프라인(M5)을 하나로 합친 10단계(1.~10.)**로 구성해야 합니다.

| 묶음 (Group) | 사이드바 번호 · 단계명 | 실제 신약개발 단계 | 현재 구현 연결 (설비 · 메시지 · 데이터) | 비용 · 기간 | 완료 판정 기준 (파란 펜 `✓`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **상단 고정 (번호 밖)** | **기업 · 연구비 헤더 카드** | 제약사 운영 · 연구비 조달 | `TEAM_STATE` (`balanceCents`, `upkeep`, `cash`), 설비 가동, 교사 지원(`SUPPORT_REQUEST`), 바운티·CRO | 초기 $6.000M, 월 유지비 | 상시 표시 (위기·구조조정 배지 연동) |
| **I. 탐색 · 발굴**<br>*(Discovery)* | **1. 질환 · 표적 발굴** | 표적 발굴 · 검증 (Target ID) | 사옥 `facility-target` · `EXPERIMENT_REQUEST` (`stage: 1`, Open Targets 480 유전자, `source: 'dataset'`) | 무료 · 즉시 | 이번 세대 Stage 1 성공 작업 ≥ 1건 |
| | **2. 파이프라인 선언** | 연구 프로그램 입안 | 사옥 `facility-target` · `PROGRAM_DECLARE` (`diseaseId`, `targetId`, `codeName`, `mechanism`) | 무료 · 즉시 | `program !== null` (`status >= 'declared'`) |
| | **3. 히트 발굴 (HTVS)** | 유효물질 발굴 (Hit Discovery) | 사옥 `facility-htvs` · `EXPERIMENT_REQUEST` (`stage: 2`, ChEMBL 220종 깔때기 `funnel` · `candidates`) | 무료 · 즉시 | `program.targetId` 기준 Stage 2 성공 ≥ 1건 |
| | **4. 도킹 · 리드 최적화** | 선도물질 최적화 (Lead Opt.) | 사옥 `facility-docking` · `EXPERIMENT_REQUEST` (`stage: 3`, RDKit→Meeko→Vina→PLIP, `source: 'vina'`) | **$0.050M** · 수 초 | `program.targetId` 실제 도킹(`vina`) 후보 ≥ 1건 |
| **II. 특허 · 전임상**<br>*(Preclinical)* | **5. 물질특허 출원** | 물질특허 확보 (IP Filing) | 시청 `inst-city-hall` · `PATENT_FILE` (`canonicalSmiles`, `targetId`) + 워커 `/molecule/properties` | **$0.050M** · 즉시 | 내 회사 유효 특허(`status === 'active'`) ≥ 1건 |
| | **6. 전임상 ADMET · 제형** | 전임상 독성·약동학 · 제형 | 사옥 `facility-admet` · `EXPERIMENT_REQUEST` (`stage: 4`, ADMET-AI) + `PROGRAM_FORMULATE` (`patentId`, `formulation`) | ADMET **$0.050M**(선택)<br>제형 무료 | `program.candidate !== null && program.formulation !== null` |
| **III. 임상 · 허가**<br>*(Clinical & NDA)* | **7. IND 임상시험계획 승인** | IND 심사 (FDA) | FDA `inst-fda` · `IND_FILE` (`dose`, `population`, `endpoint`) | **$0.100M** · 30게임 일 | `ind` 단계 `passed` (`ind_approved` 이상) |
| | **8. 임상 1상 (안전성·내약성)** | 임상 1상 (Phase I) | 대학병원 `inst-hospital` · `TRIAL_START` (`kind: 'phase1'`, 안전성 S 판정 · 통과 용량 기록) | **$0.300M** · 90게임 일 | `phase1` 단계 `passed` (`phase1_passed` 이상) |
| | **9. 임상 2상 (개념입증·유효성)** | 임상 2상 (Phase II) | 대학병원 `inst-hospital` · `TRIAL_START` (`kind: 'phase2'`, 효능 E · 안전성 S 동시 판정) | **$0.600M** · 180게임 일 | `phase2` 단계 `passed` (`phase2_passed` 이상) |
| | **10. 임상 3상 · 신약 허가(NDA)** *(또는 9=2상, 10=3상, 11=허가 — 아래 1.2절 비교)* | 임상 3상 · NDA 시판 허가 | 대학병원 `TRIAL_START` (`phase3`, $1.200M · 360일) → FDA `FINAL_FILE` (`brand`, $0.100M · 60일) | **$1.200M** + **$0.100M** | `program.status === 'approved'` (허가 도장 `◉`) |

> **번호 개수 대안 비교 (10단계 vs 11단계)**: 임상 3상과 최종 허가(NDA)를 분리해 **1. 표적 발굴 ~ 9. 임상 2상 → 10. 임상 3상 → 11. 최종 허가(NDA)**의 **11단계**로 두거나, **1번에 '표적 발굴 & 코드명 선언'을 묶어 10단계(1. 표적 발굴·선언 → 2. 히트 스크리닝 → 3. AI 도킹·최적화 → 4. 물질특허 → 5. 전임상 ADMET·제형 → 6. IND 신청 → 7. 임상 1상 → 8. 임상 2상 → 9. 임상 3상 → 10. 최종 허가)**로 두는 방안이 있습니다.
> **권장안은 후자(10단계: 1번에 Stage 1 + 선언을 상·하 서브스텝 1-A / 1-B로 통합, 7·8·9번을 임상 1·2·3상으로, 10번을 최종 허가로 배치)**입니다. 이렇게 하면 딱 `1. ~ 10.`으로 떨어지면서도 기존 [`PipelineStepKind`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts#L45-L52)(`ind` · `phase1` · `phase2` · `phase3` · `final`) 5종이 후반부 **6 · 7 · 8 · 9 · 10번**에 정확히 1:1로 대응합니다.

### 1.2 주요 결정 근거

1. **회사 설립 · 연구비(게이미피케이션)를 번호 밖(사이드바 상단 고정 카드)에 두는 이유**:
   - **최초 회사 설립 주체는 교사다**: 회사명·티커·지구·초기 연구비($6.000M)는 교사가 학급을 만들 때 [`CreateClassForm.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/teacher/CreateClassForm.tsx#L89-L102)(`POST /gm/classes`, [`CreateClassRequest`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gm.ts#L73-L85))에서 이미 생성합니다. 학생이 사명·티커를 입력하는 메시지는 파산 후 재창업인 [`C2S.COMPANY_REFOUND`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L357-L369)뿐이므로, 이를 `1번 단계`로 두면 정상 학급 학생은 시작하자마자 이미 완료된 빈 단계를 마주하게 됩니다.
   - **연구비 · 설비 · 바운티 · CRO는 전 단계 공통 상태다**: 연구비 잔액(`balanceCents`), 월 유지비(`upkeep`), 위기 단계(`CashAlertLevel`), CRO 의뢰([`gamification.ts`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gamification.ts#L270-L295)), 교사 연구비 지원(`C2S.SUPPORT_REQUEST`)은 1번부터 10번까지 어느 단계에서든 참조·실행해야 하는 **전역 경영 컨텍스트**입니다. 따라서 사이드바 최상단(번호 위)에 **회사 배지(사명·티커·지구) + 잔액·유지비 + `[자금·설비·재창업 관리]` 드로어 버튼**으로 고정하는 것이 맞습니다.
2. **임상 1 · 2 · 3상을 하나의 번호로 합치지 않고 각각 독립 번호(7 · 8 · 9번)로 두는 이유**:
   - **과학적·규칙적 판정 축이 상마다 다르다**: [`StepJudgement`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts#L255-L269)와 [`judgeStep`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L1189)에서 1상은 안전성(`safety`) 중심이고 통과 시 [`phase1PassedDose`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts#L367)를 박제합니다. 반면 2상·3상은 효능(`efficacy`)과 안전성을 모두 보며 비용($0.300M → $0.600M → $1.200M)과 기간(90일 → 180일 → 360일, [`BASE_DURATION_DAYS`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/pipelineFormat.tsx#L219))이 계단식으로 커집니다.
   - **CRL(보류) 후 역행(Rollback) 경로가 상마다 다르다**: [`handleAmend`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L865-L883)에서 2상·3상 실패 후 용량을 `phase1PassedDose`보다 높이면 **7번(임상 1상)**으로 되돌아가고, 낮추면 **현재 상(8번 또는 9번)**만 재도전하며, ADMET실에서 제형·후보를 바꾸면([`handleFormulate`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L827-L845)) **6번(IND 심사)**부터 다시 합니다. 1·2·3상이 개별 번호여야 이 되돌림 화살표와 상태 표시(`✓`, `▸`, `✕`)가 직관적으로 작동합니다.

---

## 2. 진입과 모드 (걷는 월드와의 공존 및 공정성)

### 2.1 모드 설계: 학급 단위 교사 정책(`ClassMode`) + 학생 뷰 스위처

걷는 2D 월드(Phaser 3)와 파이프라인 랩(좌측 사이드바 + 우측 워크벤치)을 공존시키려면 **교사가 학급의 운영 규칙(`ClassMode`)을 정하고, 학생은 허용된 범위 안에서 화면(월드 뷰 ↔ 파이프라인 랩 뷰)을 전환**해야 합니다.

| 학급 모드 (`ClassMode`) | 대상 수업 시나리오 | 학생 화면 전환 | 실험·신청 실행(Submit) 규칙 |
| :--- | :--- | :--- | :--- |
| **`'world'`** *(기존 타이쿤)* | 공간 탐색·입지·동선 경쟁 중심 수업 | 월드 뷰 기본 + 파이프라인 랩은 **읽기·초안 작성(Draft) 전용** | 모든 실행은 기존처럼 해당 설비·창구 사거리(`MOVE.interactRangePx = 56px`, [`world.ts`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/world.ts#L210)) 안에서만 가능 |
| **`'hybrid'`** *(권장 기본값)* | 타이쿤 + 파이프라인 실습 병행 수업 | 상단/하단 토글(`[🗺️ 도시 월드] ↔ [🧪 파이프라인 랩]`) 상시 허용 | **사옥 내 단계(1~3, 5번)**는 랩에서 즉시 실행 허용. **도시 공공기관 단계(4, 6~10번)**는 클릭 시 **자동 이동(Auto-walk) 후 도착 시 실행** |
| **`'lab'`** *(파이프라인 전용)* | 이동 없이 신약개발 전 주기를 빠르게 실습하는 과학 집중 수업 | 진입 시 **파이프라인 랩 뷰**가 기본 화면 (월드는 미니맵/배경 또는 선택 진입) | **전 단계(1~10번) 원격 즉시 실행 허용** (사거리 판정 면제) |

### 2.2 같은 학급 내 '걸어가야 하는 규칙' 우회(불공정) 방지책

같은 학급에서 한 팀은 걸어 다니고 다른 팀은 랩 UI에서 원클릭으로 제출하면 **두 가지 공정성 붕괴**가 일어납니다:
1. **선착순 물질특허 레이스 불공정**: [`handlePatent`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L723-L729)는 같은 학급·같은 세대에서 동일한 `flatSmiles`([`sameSubstance`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/pipeline/index.ts#L13-L15))를 먼저 출원한 팀에게 독점권을 주고 늦은 팀에게 `patent_conflict`를 반환합니다. 걸어가는 팀이 시청(`inst-city-hall`)까지 이동하는 수십 초 동안 랩 UI 팀이 즉시 출원하면 거리 규칙이 깨집니다.
2. **특화 지구 입지 차이 왜곡**: [`DISTRICT_SLOTS`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/world/city.ts#L123-L144)는 지구마다 시청·FDA·대학병원·거래소까지의 물리적 거리가 다릅니다(예: 외곽 산업단지 `industry`는 강 남쪽 `ty: 103`에 위치).

**공정성 보장 메커니즘**:
- **규칙 1 (학급 단위 동일 정책)**: 원격 즉시 실행(`locationPolicy = 'lab_remote'`)은 학생 개인 설정(`PrefSetMessage`)이 아니라 **학급 상태(`WelcomeMessage.classMode`)**로만 결정됩니다. 같은 학급의 모든 팀은 100% 동일한 공간 규칙을 적용받습니다.
- **규칙 2 (`hybrid` 모드의 '사옥 안 즉시 실행 + 공공기관 자동 이동')**:
  - 사옥 내부 설비(Stage 1~4 및 선언·제형)는 자기 팀 사옥 안의 동선(26×20 타일, [`hq.ts`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/world/hq.ts#L20-L21))일 뿐 타 팀과의 거리 경쟁 요소가 없으므로, `hybrid` 모드에서는 랩 UI에서 바로 실행을 허용합니다.
  - 반면 도시 공공기관(특허청 `city-hall`, FDA `fda`, 대학병원 `hospital`) 신청을 `hybrid` 모드의 랩 UI에서 누르면, 클라이언트가 기존 A* 길찾기(`findPath`, [`PATHFIND_MAX_NODES`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/world.ts#L220))로 캐릭터를 해당 창구 앞까지 실제로 이동시키고(사옥 안이면 `hq-exit` 포탈 통과 포함), 사거리(`56px`) 진입 순간 예약된 요청을 전송합니다.
- **규칙 3 (증권거래소 객장 예외 유지)**: 바이오 증권거래소 주문(`C2S.MARKET_ORDER`, `OFFERING_*`)은 신약 개발 파이프라인 10단계가 아니므로, [`isAtExchange`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/exchange.ts#L63-L65)의 `EXCHANGE_FLOOR_ZONE_ID` 현장 방문 규칙을 그대로 유지합니다.

---

## 3. 서버 계약 (권한 경로 · 불변식 · 프로토콜 v12)

### 3.1 위치 사거리 판정을 대체할 권한 경로 설계

별도의 Colyseus 룸(`LabRoom`)을 새로 만들지 **말고**, 기존 `CityRoom` / `HqRoom` 연결 위에서 **`ClientCtx.locationPolicy`와 고정 `interactableId` 해석기(Resolver)**를 쓰는 설계를 권장합니다.

- **별도 룸을 쓰지 않는 근거**:
  - 실험·파이프라인·자금 알림은 이미 `Hub`([`service.ts`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L463-L470))를 통해 팀/유저 단위로 전달되지만, `RoomMember.sentResultJobIds`([`handlers.ts`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L77-L81))와 `RoomScope`의 서비스 참조는 현재 접속 룸에 묶여 있습니다. 별도 룸으로 분리하면 학생이 월드↔랩 탭을 토글할 때마다 소켓 재입장이 발생합니다.
- **고정 `interactableId`의 존재**:
  - 사옥 설비 ID는 모든 팀 사옥 맵에서 `'facility-target' | 'facility-htvs' | 'facility-docking' | 'facility-admet' | 'facility-security'`([`hq.ts`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/world/hq.ts#L218))로 고정되어 있습니다.
  - 도시 공공기관 ID도 `'inst-city-hall' | 'inst-fda' | 'inst-hospital'`([`city.ts`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/world/city.ts#L103-L109))로 고정되어 있습니다.

#### 시그니처 수준 설계 (`ports.ts` · `interact.ts` · `pipeline/service.ts`)

```ts
// 1. packages/shared-types/src/domain.ts
export type ClassMode = 'world' | 'hybrid' | 'lab';
export type LocationPolicy = 'strict' | 'hq_remote' | 'lab_remote';

// 2. apps/game-server/src/ports.ts — ClientCtx 확장 (서버가 학급 설정으로 채움)
export interface ClientCtx {
  // ...기존 필드 (L51~74)
  locationPolicy: LocationPolicy; // 'world' -> 'strict', 'hybrid' -> 'hq_remote', 'lab' -> 'lab_remote'
}

// 3. apps/game-server/src/world/interact.ts — checkFacilityPermission / checkExperimentPermission 확장
export function checkExperimentPermission(args: {
  map: TileMapData;
  at: { x: number; y: number };
  scope: InteractScope;
  interactableId: unknown;
  tierOf: (kind: FacilityKind) => FacilityTier;
  stateOf?: (kind: FacilityKind) => FacilityRunState;
  locationPolicy?: LocationPolicy; // 추가
}): ExperimentPermission;
```

- **동작 방식**:
  1. `handlers.ts`의 [`handleExperimentRequest`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L370-L376)와 [`handleFacilityBuild`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L570-L576)에서:
     - `locationPolicy`가 `'hq_remote'` 또는 `'lab_remote'`이고 `rent !== true`이면, 클라이언트가 현재 `city` 룸에 있어도(`scope.roomTeamId === null`) 소속 팀 `actorTeamId = member.session.teamId`의 설비 등급(`scope.directory.facilityTier(actorTeamId, kind)`)과 가동 상태(`scope.directory.facilityState(actorTeamId, kind)`)를 기준으로 검증하며 `withinRange`를 생략합니다.
     - 단, **설비 등급 ≥ 1 (`experimentReady`)** 및 **가동 중(`state !== 'idle'`)** 검사는 절대 생략하지 않습니다.
  2. `pipeline/service.ts`의 [`locate`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L485-L503)에서:
     - `want.facility`(`'target' | 'admet'`)는 `ctx.locationPolicy !== 'strict'`일 때 `ctx.teamId !== null`이면 사옥 룸 여부(`ctx.hqTeamId === ctx.teamId`)와 `withinRange`를 면제합니다(내 팀 설비 상태는 L630, L818의 `this.facilityOf(teamId, facility)`가 이미 DB/디렉토리에서 직접 검증함).
     - `want.institution`(`'city-hall' | 'fda' | 'hospital' | 'any-desk'`)은 `ctx.locationPolicy === 'lab_remote'`일 때 `ctx.map`에 해당 지점이 없어도(예: 사옥 룸 안) 가상 `Interactable`(`{ id: 'inst-fda', kind: 'institution', institution: 'fda', ... }`)로 해석하고 `withinRange`를 면제합니다. (`handleDesk` 원장 조회는 `'hq_remote'`에서도 읽기 편의를 위해 면제 가능).

### 3.2 5대 핵심 불변식 보존 검증

| 불변식 | 서버 코드 위치 | 원격 실행(`hq_remote` / `lab_remote`) 시 보존 방식 |
| :--- | :--- | :--- |
| **1. 팀 격리** | [`exchange.ts` L28](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/exchange.ts#L28), [`handlers.ts` L408](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L408) | `teamId`는 오직 서버 세션(`member.session.teamId`)에서만 읽음. 원격 실행은 **자기 팀(`actorTeamId`)** 설비·특허·파이프라인만 대상으로 함. |
| **2. 멱등 `(팀, requestId, 세대)`** | [`handlers.ts` L432](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L432), [`service.ts` L626·698·773·895](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L698) | `findJobByRequest`, `findPatentByRequest`, `findStepByRequest`, `lastRequestId`, `pipelineLedgerKey(teamId, requestId)`가 위치 검사 직후 동일하게 실행됨. |
| **3. 세대 (Generation)** | [`service.ts` L512~519](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L512-L519), [`handlers.ts` L482](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L482) | `requestGate(ctx)`가 `ctx.generation !== generation`이면 `stale_generation`으로 거절. 작업 생성 시 `scope.directory.generation` 기록 동일. |
| **4. 유료 차단** | [`handlers.ts` L388·434·587](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L434), [`service.ts` L702·899](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L702) | `spendGate(teamId, 'paidWork' \| 'facilityPurchase')` 및 `funds.spendGate(teamId)`가 일시정지(`class_paused`)·구조조정(`restructure_blocked`)·파산(`company_bankrupt`)을 동일하게 차단. |
| **5. 교사 정정 · 복원** | [`service.ts` L1328~1433](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L1328-L1433) | `correctStep`, `restorePart`, `reloadClass`는 `Hub`의 학급·팀 채널로 `PIPELINE_STATE` / `WORLD_CHANGED`를 밀어주므로 뷰 모드와 무관하게 즉시 동기화됨. |

### 3.3 프로토콜 v12 변경 명세 (`packages/shared-types`)

1. `PROTOCOL_VERSION = 12` ([`protocol.ts` L77](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L77)).
2. **학급 모드 필드 추가**:
   - `CreateClassRequest.classMode?: ClassMode` (기본값 `'hybrid'`, [`gm.ts` L73](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gm.ts#L73)) 및 `CreateClassRequest.initialFacilityTier?: 0 | 1` (기본 `0`, `'lab'` 모드 선택 시 `1` 권장).
   - `ClassSummary.classMode: ClassMode` ([`gm.ts` L46](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gm.ts#L46)), `WelcomeMessage.classMode: ClassMode` ([`protocol.ts` L466](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L466)).
3. **무료 분자 물성 미리보기 메시지 추가** (5절 상세):
   - `C2S.MOLECULE_PREVIEW = 'molecule:preview'` (`{ requestId: string; smiles: string }`)
   - `S2C.MOLECULE_PREVIEW = 'molecule:preview'` (`{ requestId: string; ok: true; properties: MoleculeProperties; signals: PropertySignals } | { requestId: string; ok: false; code: ErrorCode; message: string }`)
4. **원격 설비 정보 조회(`INTERACT` 대체/보완)**:
   - 이미 `TEAM_STATE`([`protocol.ts` L855](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L855))에 `facilities: Record<FacilityKind, FacilityTier>`와 `facilityStates`(`TeamEconomyView`)가 들어 있으므로, 랩 UI는 별도 `INTERACT` 요청 없이도 설비 등급·가동 상태를 즉시 렌더링할 수 있으며, `C2S.INTERACT { interactableId: 'facility-target' }`를 보냈을 때도 `locationPolicy !== 'strict'`면 서버가 `S2C.INTERACT_OPEN`을 정상 반환합니다.

---

## 4. 오른쪽 작업 영역 (단계별 구성 · 넘기기 · 컴포넌트 재사용)

### 4.1 단계별 입력 · 실행 · 결과 · '다음 단계로 넘기기(Handoff)' 설계

페르소나 테스트([`report.md` L27~31, L47~51](file:///Users/mulkib/Desktop/repo/crista/.review/persona-2026-10-23/report.md#L27-L31))에서 지적된 **"결과에서 다음 실험으로 후보를 넘기는 버튼 없음"**, **"표적 탐색 창 안의 순서 뒤집힘"**, **"질환/PDB 기본값 불일치"**를 오른쪽 작업 영역에서 직접 해결합니다.

| 단계 | 상단 컨텍스트 바 | 중앙 입력 · 실행 영역 | 하단 결과 · **'다음 단계로 넘기기(Handoff)' CTA** |
| :--- | :--- | :--- | :--- |
| **1. 질환 · 표적 발굴**<br>*(Stage 1 + 선언)* | `표적 탐색실` 등급·가동 배지 (`tier === 0`이면 **설비 건설 카드** 노출) | **[1-A] Stage 1 조회 폼**: `disease` 선택 시 `DISEASE_TO_TARGET`으로 **PDB ID 자동 고정**(불일치 제거). 무료 실행.<br>**[1-B] 코드명·기전 선언(`DeclareSection`)**: 1-A 아래에 배치(순서 교정). | Stage 1 산점도·상위 유전자 표 + 선언 완료 시 **`[2단계: 이 표적(${target.gene})으로 히트 발굴(HTVS) 하러 가기 →]`** |
| **2. 히트 발굴 (HTVS)**<br>*(Stage 2)* | `HTVS·합성실` 등급·가동 배지 + 파이프라인 표적(`program.targetId`) 고정 표시 | 라이브러리(`ZINC 소형`/`ChEMBL 승인약`/`사내 합성 후보`), `maxMw`, `maxTpsa`, `ro5Only`, `excludeAlerts` 컷오프 설정 후 무료 실행. | 깔때기(`ScreeningFunnelBlock`) + 후보 표. **각 후보 행 오른쪽에 `[3단계: 도킹 입력으로 넘기기 →]` 버튼** → 클릭 시 `useInteractStore.setDraft('facility-docking', { targetId, smiles, label })` 저장 후 **3번으로 이동**. |
| **3. 도킹 · 리드 최적화**<br>*(Stage 3)* | `AI 도킹 서버실` 등급·가동 배지 + 기준 리간드(`referenceKcal` · `referenceRmsd`) 안내 | `DockingFields`(Stage 2 후보 칩 + 프리셋 + SMILES 입력 + **작용기 치환·무료 물성 미리보기**). 유료($0.050M) Vina 실행. | 도킹 결과(`ResultSheet` 인라인): ΔG · PLIP 상호작용 잔기표 · 재도킹 RMSD · 실패 시 `BountyTab`. 성공(기준 통과) 시 **`[4단계: 이 분자(${canonicalSmiles})로 물질특허 출원하러 가기 →]`** → `usePipelineStore.setDraft('patent.smiles', targetEvidenceKey(targetId, smiles))` 후 **4번으로 이동**. |
| **4. 물질특허 출원**<br>*(특허청)* | 학급 유효 특허 현황 + 내 도킹 근거 목록(`state.candidates`) | `PatentDesk`: 출원 가능 분자 선택, 이름표(`label`) 입력, 충돌(`conflict`) 확인 후 $0.050M 출원. (특허 License-Out 장부 탭 포함). | 등록된 내 특허(`PatentView` 도장 + RDKit 물성표). 각 특허 행에 **`[5단계: 이 특허를 전임상 후보로 지정하러 가기 →]`** → `setDraft('formulate.patentId', patent.id)` 후 **5번으로 이동**. |
| **5. 전임상 ADMET · 제형**<br>*(Stage 4 + 제형)* | `전임상 ADMET실` 등급·가동 배지 | **[5-A] Stage 4 ADMET-AI 예측(`AdmetFields`)**: 내 유효 특허 선택 후 6축 예측($0.050M, 선택/권장).<br>**[5-B] 후보·제형 확정(`FormulateSection`)**: RDKit 물성표 + 위험 신호 6개(`signalRows`) + 제형 3종(`oral`/`iv`/`transdermal`) 비교 후 확정(무료). | ADMET 결과지(+위험 높음 시 `BountyTab`) + 제형 확정 완료 시 **`[6단계: FDA IND 임상시험계획 신청하러 가기 →]`**. |
| **6. IND 승인 신청**<br>*(FDA)* | 후보 특허 · 제형 · 표적 요약 (`CNS 여부`) | `FdaDesk`의 IND 서식: 용량(`10`/`50`/`100 mg`), 환자군(`TRIAL_OPTIONS.populations`), 1차 평가지표(`endpoints`) 선택 후 $0.100M 신청(30게임 일). | 진행률 막대(`stepProgressPct`) → 판정 후 `StepResultSheet` 인라인(효능 E · 안전성 S 막대). 통과 시 **`[7단계: 임상 1상 시작하러 가기 →]`**, 보류 시 **재설계 버튼 2종(용량 재신청 / 5번 제형·후보 교체로 이동)** + `BountyTab`. |
| **7 · 8 · 9. 임상 1 · 2 · 3상**<br>*(대학병원)* | 현재 프로토콜(`dose · formulation · population`) + 대학병원 지구 보너스(×0.85 기간, +3점) 표시 | `HospitalDesk`: 각 상의 비용($0.300M / $0.600M / $1.200M)·기간(90 / 180 / 360일) 확인 후 시작. (보류 후 재설계 시 FDA 용량 변경 `PROTOCOL_AMEND` 인라인 제공). | 진행률 막대 → 판정 후 `StepResultSheet`. 통과 시 다음 상(8·9·10번) 이동 버튼, 보류(CRL) 시 **3경로 점프 버튼(`[같은 프로토콜 재시도]`, `[용량 변경]`, `[5번으로 돌아가 제형·후보 교체]`)** + `BountyTab`. |
| **10. 최종 허가 (NDA)**<br>*(FDA)* | 3상 통과 프로토콜 요약 | `FdaDesk`의 최종 허가 서식: 상표명(`brand.name`), 제형 모양(`PACKAGE_SHAPES`), 색상(`PACKAGE_COLORS`) 선택 + `PillSwatch` 미리보기 후 $0.100M 신청(60게임 일). | 최종 승인 도장(`stamp/nda-approved`) + 신약 품목 허가증(`StepResultSheet`) + 연례 바이오 학회(`Symposium`) 발표 연결. |

### 4.2 기존 컴포넌트 재사용 vs 분리·재작성 판정

| 기존 파일 · 심볼 | 판정 | 조치 내용 |
| :--- | :--- | :--- |
| [`FacilityPipeline.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/FacilityPipeline.tsx#L55-L300) (`DeclareSection`, `FormulateSection`) | **그대로 재사용** | 이미 `<section>` 단위로 분리되어 있고 `open`, `state`, `sender`만 받음. 1번(선언)과 5번(제형) 패널에 그대로 마운트. |
| [`InteractModal.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx#L259-L723) (`FacilityBuildSection`, `DockingFields`, `AdmetFields`) | **export 추출 후 재사용** | 현재 파일 내부 private 함수임. `export`로 노출하여 1·2·3·5번 단계 뷰에서 그대로 조합하고, 모달 래퍼(`role="dialog"`, L851)만 걷어냄. |
| [`InteractModal.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx#L74-L91) (`STAGE_FIELDS[1]`) | **수정 후 재사용** | `pdbId` 하드코딩 기본값(`'1M17'`)을 제거하고 선택된 `disease`의 `DISEASE_TO_TARGET[disease]` PDB 코드로 자동 연동. |
| [`ResultSheet.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/ResultSheet.tsx#L471-L771) (`ResultSheet`, `ScreeningFunnelBlock`, `ProvenanceBlock`) | **콘텐츠 분리(`ResultContent`)** | `role="dialog"` 외곽 래퍼와 `ResultContent` 본문을 분리하고, `footerSlot?: ReactNode` prop을 추가해 단계별 **'다음 단계로 넘기기' 버튼**을 주입. |
| [`DeskWindow.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/DeskWindow.tsx#L194-L781) (`PatentDesk`, `FdaDesk`, `HospitalDesk`) | **export 분리 + `FdaDesk` 쪼개기** | 현재 `FdaDesk` 하나에 IND 신청·용량 변경·최종 허가·요약 원장이 모두 들어 있음. 이를 `IndFormSection`(6번용), `AmendDoseSection`(7~9번 재설계용), `FinalNdaSection`(10번용)으로 분리해 export. |
| [`StepResultSheet.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/StepResultSheet.tsx#L77-L321) (`StepResultSheet`, `ScoreBars`) | **인라인 모드 prop 추가** | `variant?: 'modal' | 'inline'`을 추가해 6~10번 단계 오른쪽 영역에 판정 기록과 `BountyTab`이 바로 펼쳐지게 함. |
| [`PipelinePanel.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/PipelinePanel.tsx#L63-L70) (`useGameDays`, [`pipelineFormat.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/pipelineFormat.tsx)) | **그대로 재사용 + 10단계 확장** | 5초 공유 타이머(`sharedNow`) 기반 `useGameDays`와 `signalRows`, `formatKcal`은 그대로 쓰고, `cellStates`와 `nextPlace`만 Stage 1~3 작업 상태를 포함하는 10단계 함수(`labStepStates`)로 확장. |

---

## 5. 빈 곳 (추가해야 할 최소 과학 단계 · 무료 물성 미리보기)

### 5.1 '진짜 해 보는' 플랫폼이 되려면 채워야 할 과학적 빈 곳 3가지

1. **표적 검증 근거 브리지 (1번 Stage 1 결과 → 선언문 작성)**:
   - **현재 빈 곳**: Stage 1(Open Targets 조회) 결과를 닫고 나면 선언 칸(`DeclareSection`)에서 방금 본 표적 유전자 점수와 기전 설명을 참고할 수 없습니다.
   - **최소 추가**: 1번 단계에서 가장 최근 완료된 Stage 1 결과의 핵심 지표(`표적 유전자 · 질환 연관 점수 · 결정구조 PDB · 기준 리간드 재도킹 ΔG`)를 선언 입력창 바로 위에 **'검증된 표적 근거 요약 카드'**로 고정 노출합니다.
2. **리드 최적화(Lead Optimization) — 작용기 치환 프리셋 & 전후 물성 비교 (3번 단계)**:
   - **현재 빈 곳**: 특허청에서 `patent_conflict`가 나거나([`DeskWindow.tsx` L258](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/DeskWindow.tsx#L258)) 임상/바운티에서 `"염기성 아민을 없애는 유도체로 재설계"` · `"구조 경고 작용기를 안전한 작용기로 치환"` · `"극성 작용기를 더해 cLogP를 낮춘다"`([`BOUNTY_REMEDY_LABEL`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gamification.ts#L132-L142))라는 처방이 나와도, 고등학생이 SMILES 문자열을 직접 손으로 고쳐 화학적으로 유효한 유도체를 만드는 것은 매우 어렵습니다.
   - **최소 추가**: 3번(도킹 · 리드 최적화)의 SMILES 입력칸 아래에 **'의약화학 작용기 변환(바이오동등체 치환) 칩 6종'**을 추가합니다.
     - 예: `방향족 아민(-NH2) → 아세트아마이드(-NHC(=O)CH3)` (간독성 구조 경고 제거), `니트로기(-NO2) → 시아노기(-CN)` (구조 경고 제거), `염기성 3차 아민 → 아마이드` (hERG 위험 완화), `하이드록시기(-OH) 도입` (cLogP 감소 · 수용성 증가), `플루오린(-F) 도입` (대사 안정성 · 지용성 미세 조정), `메톡시기(-OCH3) 제거` (분자량 MW · TPSA 감소로 BBB 투과 개선).
     - 학생이 후보 분자를 고른 뒤 변환 칩을 누르면 유효한 유도체 SMILES가 생성되고, 아래 **무료 물성 미리보기**를 통해 **변환 전 vs 변환 후 물성(`ΔMW`, `ΔcLogP`, `ΔTPSA`)과 위험 신호 변화(`hERG: 높음 → 낮음`)**를 눈으로 확인한 뒤 유료 도킹($0.050M)을 실행하게 합니다. 이것만으로도 바운티의 Q3 처방([`BountyRemedy`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gamification.ts#L94-L103))과 실제 실험 조작이 완벽한 교육적 루프를 이룹니다.
3. **연구비 심사(Investment Milestone / Grant) 기준표의 가시화 (사이드바 상단 카드)**:
   - **현재 빈 곳**: Series A / Series B 투자(`InvestmentMilestone`, [`domain.ts` L174](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/domain.ts#L174))와 사옥 등급 조건(`HqRequirementView`, [`gamification.ts` L24~39](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gamification.ts#L24-L39))이 연구비 장부 안쪽에만 있어 학생이 언제 Series A/B 심사를 요청(`C2S.SUPPORT_REQUEST`)할 수 있는지 알기 어렵습니다.
   - **최소 추가**: 상단 회사·연구비 카드에 다음 마일스톤 조건(예: `특허 출원 또는 IND 승인 → Series A 심사 요청 가능`)과 원클릭 `[투자 심사 · 연구비 지원 요청]` 버튼을 노출합니다.

### 5.2 무료 물성 미리보기: 워커 `/molecule/properties` 개방 vs 클라이언트 RDKit.js

**결론: 클라이언트 RDKit.js(WASM)를 쓰지 말고, 게임 서버가 캐시·속도 제한을 걸어 워커 `POST /molecule/properties`를 중계하고 `@crista/game-rules`의 `propertySignals()`로 위험 신호를 계산하는 경로를 권장합니다.**

| 비교 항목 | 워커 `POST /molecule/properties` 중계 (권장) | 클라이언트 RDKit.js (WASM) |
| :--- | :--- | :--- |
| **판정 일관성 (SSOT)** | **100% 일치**. 특허 출원([`service.ts` L732](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L732))과 바운티 채점이 쓰는 바로 그 Python RDKit(`2026.09.1`) 엔진과 동일한 `canonicalSmiles` · `flatSmiles` · `basicAmines` · `alerts`를 반환함. | **불일치 위험 높음**. RDKit 버전이나 SMARTS 해석 차이로 미리보기 결과와 실제 특허 출원/임상 판정 값이 달라질 수 있음. |
| **응답 속도 · 비용** | 동기 계산 **수 ms** ([`protocol.ts` L1186](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L1186)). `fixture` 모드에서도 RDKit만 있으면 동작(`WorkerHealth.properties`). | 로컬 즉시 실행이나 초기 WASM 다운로드·초기화(약 8~12MB) 부담이 큼. |
| **구현 복잡도** | 워커 엔드포인트([`MoleculePropertiesRequest`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts#L1190-L1195))와 게임 규칙 [`propertySignals`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/pipeline/score.ts#L67-L96) · [`signalNotes`](file:///Users/mulkib/Desktop/repo/crista/packages/game-rules/src/pipeline/score.ts#L102)가 **이미 구현되어 있음**. 서버에 30줄 핸들러만 추가하면 끝남. | WASM 번들링(Vite/Tauri CSP), SMARTS 패턴(`basicAmines`, `aromatic_amine` 디아릴아민 예외 등) 이중 구현 필요. |

- **보호 장치**: 타이핑 `onChange`마다 호출하지 않고 **`[물성 · 위험 신호 미리보기 (무료)]` 버튼 클릭 또는 작용기 변환 칩 선택 시에만** `C2S.MOLECULE_PREVIEW`를 전송합니다. 게임 서버는 `Map<string, MoleculeProperties>` LRU 캐시(최대 2,000개)와 세션당 `2 req/sec` 제한을 두어 워커 부하를 원천 차단합니다.

---

## 6. 적대적 검토 (설계가 깨질 지점 — 우선순위 순)

### P0 (치명적 — 런타임 차단 또는 다른 세션과의 결합 실패)

1. **설비 미건설(`tier === 0`) 상태에서 파이프라인 랩 진입 시 1단계부터 `facility_locked`로 막히는 문제**
   - **원인**: 새 학급의 모든 팀은 설비 5종이 모두 등급 0(평면도)에서 시작합니다([`gm.ts` L70](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gm.ts#L70)). 서버 [`checkExperimentPermission`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/world/interact.ts#L336-L349)은 `tierOf(facility) >= 1`이 아니면 `facility_locked`("설비를 먼저 건설하세요.")를 반환합니다.
   - **대책**: ① 오른쪽 작업 영역의 각 설비 단계(1·2·3·5번) 상단에 [`FacilityBuildSection`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx#L259-L443)을 반드시 포함해, `tier === 0`일 때 `[표적 탐색실 건설 · $1.000M]` 버튼이 가장 먼저 뜨게 해야 합니다. ② 학급 시계가 일시정지(`clock.paused`) 상태면 설비 건설도 `class_paused`로 막히므로([`handlers.ts` L587](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts#L587)), 상단에 `"교사가 수업을 시작(시계 재생)해야 유료 설비 건설과 유료 실험을 할 수 있습니다"` 배너를 명시하거나, 교사가 `'lab'` 모드 학급을 만들 때 기본 설비 1등급 지급(`initialFacilityTier: 1`)을 선택할 수 있게 합니다.
2. **다른 세션의 UI 프리뷰와 상태 계약이 어긋날 위험 (`PIPELINE_STATE` vs `JOB_LIST`)**
   - **원인**: 서버의 [`PipelineStateMessage`](file:///Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts#L479-L493)는 `program`(선언 이후), `patents`, `candidates`(Stage 3 도킹 성공 분자), `steps`(IND~허가)만 담고 있으며, **Stage 1·Stage 2·Stage 4의 실험 작업 상태는 [` useJobsStore`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx#L48)(`S2C.JOB_LIST` / `JOB_UPDATE` / `JOB_RESULT`)에 따로** 있습니다. 다른 세션의 UI 프리뷰가 단일 배열 props를 기대하면 연결 시점에 상태가 비어 보입니다.
   - **대책**: 프리뷰 UI와 실제 스토어 사이에 단일 어댑터 함수 `buildLabStageViews(args: { pipeline: PipelineStateMessage | null; jobs: JobView[]; results: Record<string, ExperimentResult>; team: TeamStateMessage | null; clock: ClockView | null }): ReadonlyArray<LabStageView>`를 정의해, UI 프리뷰는 이 정규화된 10단계 배열만 구독하도록 계약을 고정합니다.

### P1 (높음 — 교육 효과 훼손 · 상태 꼬임)

3. **표적(`targetId`) 변경 시 앞 단계 근거와 뒤 단계 후보가 엇갈리는 상태 불일치**
   - **원인**: 학생이 1번에서 알츠하이머병(`ache-4ey7`)으로 선언하고 3번에서 도킹까지 한 뒤, 다시 1번으로 돌아가 폐암(`egfr-1m17`)으로 선언을 고치면(`program.candidate === null`일 때는 서버 [`handleDeclare`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L635-L641)가 표적 변경을 허용함), 4번(특허청)의 `candidates`에는 이전 표적(`ache-4ey7`)의 도킹 분자가 남아 있어도 5번(`handleFormulate`, [`service.ts` L824~829](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L824-L829))에서 후보 지정 시 파이프라인 표적이 특허의 표적으로 덮어써지거나 혼란을 줍니다.
   - **대책**: 사이드바 단계 완료(`✓`) 판정과 후보 목록 필터링은 항상 **현재 `program.targetId`와 일치하는 작업/특허만** 기본 활성으로 표시하고, 다른 표적의 결과는 `'다른 표적 결과'` 배지([`DeskWindow.tsx` L248](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/DeskWindow.tsx#L248))로 흐리게 분리합니다.
4. **무료 미리보기 남용으로 인한 '점수 찍기'와 교육적 사고 생략**
   - **원인**: 만약 무료 미리보기나 제형 화면에서 임상 효능(`E`)·안전성(`S`) 점수를 미리 계산해 보여주면, 학생이 물성(MW, cLogP, TPSA, 염기성 아민)의 과학적 의미를 해석하지 않고 숫자만 맞춰 찍게 됩니다.
   - **대책**: [`pipelineFormat.tsx` L6](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/pipelineFormat.tsx#L6)의 원칙(**"점수(E · S)는 판정 뒤(결과지 · 교사)에만 보인다"**)을 절대 불변식으로 유지합니다. 3번·5번·6번 화면에서는 오직 RDKit 물성 수치와 6대 위험 신호(`낮음/보통/높음`) 및 규칙 문장만 보여줍니다.

### P2 (중간 — 동시성 · 워커 부하)

5. **같은 팀 4명의 동시 랩 조작과 드래프트 덮어쓰기**
   - **원인**: `useInteractStore.drafts`와 `usePipelineStore.drafts`는 로컬 클라이언트 메모리이나, 한 팀원(CSO)이 선언이나 제형을 제출하면 팀 전체에 `S2C.PIPELINE_STATE`가 브로드캐스트되어 다른 팀원(CTO)이 보고 있던 단계의 전제 조건이 바뀝니다.
   - **대책**: 사이드바 각 단계 옆에 현재 팀에서 실행 중인 작업(`JobView.status === 'running'`, `requestedByName`)을 실시간 배지로 띄워 팀원 간 중복 유료 도킹($0.050M × 2)을 예방합니다.

---

## 7. 구현 순서

각 단계는 기존 테스트를 깨뜨리지 않고 독립적으로 검증·병합할 수 있는 최소 단위로 나눕니다.

### Phase 1. 공유 타입 · 프로토콜 v12 · 10단계 상태 파생 순수 함수 (`packages/shared-types`, `packages/game-rules`)
- **작업**:
  1. `PROTOCOL_VERSION = 12` 상향, `ClassMode` · `LocationPolicy` · `C2S/S2C.MOLECULE_PREVIEW` 타입 추가.
  2. `@crista/game-rules`에 10단계 사이드바 상태·잠금 사유·다음 행동을 계산하는 순수 함수 `deriveLabStages(state)` 및 의약화학 작용기 치환 순수 헬퍼 추가.
- **완료 기준**: `packages/shared-types` 및 `packages/game-rules` 타입체크·단위 테스트(10단계 전이, Stage 1 미완료/도킹 미완료/CRL 재설계 시 활성 단계 판정) 통과.

### Phase 2. 서버 `LocationPolicy` · 원격 설비/창구 해석 · 무료 물성 미리보기 (`apps/game-server`)
- **작업**:
  1. [`ClientCtx`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/ports.ts#L51)에 학급 `classMode` 기반 `locationPolicy` 주입.
  2. [`checkFacilityPermission` / `checkExperimentPermission`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/world/interact.ts#L280-L334) 및 [`PipelineService.locate`](file:///Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts#L485-L503)에서 `hq_remote` / `lab_remote` 정책 지원.
  3. `C2S.MOLECULE_PREVIEW` 핸들러 추가(LRU 캐시 + 초당 2회 제한 + 워커 `/molecule/properties` 호출 + `propertySignals` 결합).
- **완료 기준**: 서버 통합 테스트에서 ① 캐릭터가 도시 스폰 위치에 서 있는 채로 `lab_remote`에서 Stage 1~4 실험 및 파이프라인 10종 메시지가 정상 동작하고, ② `strict` 모드에서는 기존대로 `out_of_range`가 반환되며, ③ 멱등·세대·유료 차단·팀 격리 테스트가 모두 통과할 것.

### Phase 3. 기존 UI 컴포넌트 인라인 섹션 추출 및 결함 교정 (`apps/desktop-client/src/ui`)
- **작업**:
  1. [`InteractModal.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx)에서 `FacilityBuildSection`, `DockingFields`, `AdmetFields`, `StageExperimentForm`을 `export` 분리하고, Stage 1의 질환↔PDB ID 자동 연동 및 실험 폼 → 선언 섹션 순서 교정.
  2. [`DeskWindow.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/DeskWindow.tsx)에서 `PatentDesk`, `IndFormSection`, `AmendDoseSection`, `FinalNdaSection`, `HospitalDesk`를 개별 섹션으로 `export` 분리.
  3. [`ResultSheet.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/ResultSheet.tsx)와 [`StepResultSheet.tsx`](file:///Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/StepResultSheet.tsx)에 인라인 렌더링 모드 및 **'다음 단계로 후보 넘기기(Handoff)' 액션 슬롯** 추가.
- **완료 기준**: 기존 월드 모달(`InteractModal`, `DeskWindow`, `ResultSheet`)이 회귀 없이 그대로 동작하면서, 분리된 섹션들이 독립 렌더링 테스트를 통과할 것.

### Phase 4. 파이프라인 랩 셸 (좌측 1.~10. 사이드바 + 우측 작업 영역 + 모드 스위처) 결합 (`apps/desktop-client`)
- **작업**:
  1. 다른 세션의 UI 프리뷰 레이아웃에 `deriveLabStages` 어댑터와 Phase 3의 인라인 섹션들을 연결.
  2. 상단 고정 회사·연구비 카드(설비 건설·가동, 교사 지원 요청, 재창업 모달 연결) 및 3번 단계의 작용기 치환 칩 + 무료 물성 미리보기 패널 결합.
  3. `ClassMode`에 따른 `[🗺️ 도시 월드] ↔ [🧪 파이프라인 랩]` 전환 및 `hybrid` 모드의 공공기관 자동 이동(Auto-walk) 연동.
- **완료 기준**: 첫 이용 학생 페르소나 시나리오([`report.md`](file:///Users/mulkib/Desktop/repo/crista/.review/persona-2026-10-23/report.md))를 파이프라인 랩에서 수행했을 때, 안내 없이 1번(표적 발굴·선언) → 2번(HTVS 후보 선택) → 3번(도킹 입력 자동 채움·실행) → 4번(특허 출원) → 5번(제형) → 6~10번(IND·임상·허가)까지 끊김 없이 완주할 수 있을 것.
