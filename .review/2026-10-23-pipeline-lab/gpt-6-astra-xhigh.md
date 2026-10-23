# GPT-6 의견서 — 신약 개발 파이프라인 랩

2026-10-23 · 읽기 전용 검토. 아래의 새 타입·정책·완료 조건은 **설계 제안**이다. 운영 서버의 동작이나 다른 세션의 UI 프리뷰는 직접 검증하지 않았다.

**권고는 ‘10단계 학습 흐름 + 학급 단위 실행 정책 + 기존 서버 서비스 재사용’이다.** 새 플랫폼의 핵심은 창을 나란히 놓는 데 있지 않다. 학생이 선택한 질환·분자·실험 근거가 다음 작업으로 이어지고, 서버가 그 연결을 검증해야 한다. 현재 모의 평가에서도 실행 실패보다 이 연결의 부족이 문제였다. 다만 실제 학생 대상 평가 결과는 아니다. [페르소나 보고서](/Users/mulkib/Desktop/repo/crista/.review/persona-2026-10-23/report.md:23)

## 1. 사이드바 단계 목록

**번호는 10개로 고정하고, 네 묶음으로 구분한다.** 기존 `Stage 1~4`는 계산 종류로 유지한다. 화면 번호를 `Stage` 값으로 보내면 안 된다. 현재 계산 작업과 후반 파이프라인은 서로 다른 계약이다. [실험 결과 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts:733), [후반 단계 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts:44)

| 묶음 | 사이드바 번호·이름 | 현재 구현과 연결 | 권고하는 학습 산출물 |
|---|---|---|---|
| 발견·설계 | **1. 표적 발굴·검증** | Stage 1 조회 → 코드명·기전 선언 | 질환·표적 선택, 근거와 검증 계획 |
| | **2. 히트 발굴** | Stage 2 HTVS | 필터 조건, 남은 후보, 선택 이유 |
| | **3. 히트→리드 선정** | Stage 3 실제 도킹 | 후보 간 도킹·물성 비교, 리드 선정 |
| | **4. 리드 최적화** | 물성 계산·재도킹 재사용, 비교 기록 추가 | 원본·변형체 비교와 최종 선택 |
| 전임상·진입 | **5. 전임상 평가·후보 확정** | Stage 4 ADMET + 후보·제형 결정 | 예측 위험, 부족한 시험, 제형 선택 |
| | **6. IND 신청** | 기존 IND | 용량·환자군·평가지표와 근거 묶음 |
| 임상 | **7. 임상 1상** | 기존 1상 | 안전성·용량 중심 결과 해석 |
| | **8. 임상 2상** | 기존 2상 | 효능·안전성, 재설계 판단 |
| | **9. 임상 3상** | 기존 3상 | 확증 단계 결과와 허가 준비 |
| 허가 | **10. 허가 신청** | 기존 최종 신청 | 브랜드·포장·최종 근거 요약 |

현재 흐름·비용·기간의 기준은 [균형안 §10.1](/Users/mulkib/Desktop/repo/crista/docs/2026-10-19-game-balance-v0.md:298)이다. Stage 2 후보는 이미 구조화되어 있고, 특허 근거는 이번 세대의 실제 Vina 결과로 제한된다. [후보 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts:704), [도킹 근거 선별](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:255)

이 구성에는 다음 원칙이 필요하다.

- **회사 설립·연구비는 번호 밖 회사 카드에 둔다.** 사명·잔액·설비·유지비·지원 신청은 모든 연구 단계에 걸친 운영 조건이다. 현재 사명은 교사가 학급 생성 때 정한다. 학생 작명을 원하면 ‘팀 제안 → 교사 반영’을 추가하며, 기존 기능이라고 표시하지 않는다. [학급 생성 입력](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/teacher/CreateClassForm.tsx:90)
- **특허는 4→5 사이의 운영 절차로 표시한다.** 독립 과학 단계 번호를 붙이지 않는다. 현재 게임에서는 실제 도킹 분자의 특허가 후보·제형 결정에 필요하다는 점을 안내한다. [현재 순서](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts:6)
- **임상 세 상은 각각 번호를 준다.** 목적·비용·기간·실패 후 행동이 다르므로 묶으면 학습 목표와 진행 상태가 흐려진다. [현재 단계별 규칙](/Users/mulkib/Desktop/repo/crista/docs/2026-10-19-game-balance-v0.md:305), [FDA 임상 단계 설명](https://www.fda.gov/patients/drug-development-process/step-3-clinical-research)
- **‘학습 완료’와 ‘과학적 입증’을 구분한다.** 1단계 조회는 표적 검증 실험이 아니며, 3단계 도킹은 실제 활성 측정이 아니다. 5단계 ADMET 예측도 전임상 전체를 대신하지 않는다. 화면에 `자료 조회 / 실제 계산·예측 / 교육용 모의 판정`을 구분한다. [현재 ADMET 안내](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx:717), [FDA 전임상 설명](https://www.fda.gov/patients/drug-development-process/step-2-preclinical-research)

번호는 길잡이다. 2~4단계를 반복해도 번호가 바뀌거나 이전 결과가 사라지지 않아야 한다.

## 2. 진입과 모드

**교사는 실행 규칙을, 학생은 화면을 선택하는 방식이 적절하다.**

| 학급 정책 제안 | 학생의 월드·랩 전환 | 실행 권한 |
|---|---|---|
| `walk_required` | 허용 | 랩에서도 해당 장소의 사거리 안에 있어야 실행 |
| `remote_allowed` | 허용, 랩을 기본 화면으로 설정 가능 | 학급의 모든 팀이 원격 연구·창구 업무 가능 |

학생의 토글은 표현 방식만 바꾼다. 원격 권한을 켜지 않는다. 경쟁 수업에서 일부 학생만 걷기를 우회하게 해서는 안 된다. 현재 서버가 위치와 팀을 확인하므로, 학급 정책도 같은 서버 권한 경로에 넣는 것이 자연스럽다. [실험 장소 판정](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/world/interact.ts:307), [파이프라인 장소 판정](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:485)

정책 변경은 **교사가 일시정지 상태에서 학급 전체에 적용**하고 변경 이력을 남기도록 제안한다. 진행 중 작업·연구비·게임 시계는 그대로 유지한다. 기존 학급의 기본값은 `walk_required`로 한다.

랩만으로 완주하려면 회사 카드에서 **설비 건설·재가동·연구비 지원 경로**도 연결해야 한다. 파이프라인 메시지 10종만 원격화하면 설비가 없는 학생은 다시 월드에서 막힌다. 임대·CRO 같은 부가 기능은 지원 범위를 명시하고, 원격 화면에서 임대를 자기 설비 실행으로 바꿔 처리해서는 안 된다. [설비 관리 UI](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx:259), [임대 실행 처리](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts:446)

## 3. 서버 계약

**첫 구현에서는 별도 Colyseus 룸을 만들지 않는 편을 권고한다.** 기존 연결·인증·Hub를 유지하고, 공통 업무 서비스 앞에 실행 권한 해석 계층을 둔다. 랩 화면에서는 이동 입력을 끄되 가짜 좌표나 순간이동으로 권한을 얻지 않는다. Hub는 이미 룸 이동과 무관하게 사용자·팀 기준으로 결과를 전달한다. [ClientCtx](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/ports.ts:50), [Hub](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/hub.ts:1)

제안하는 최소 형태는 다음과 같다.

```ts
type ActionOrigin =
  | { kind: 'world'; interactableId: string }
  | { kind: 'lab'; station: LabStation };

authorizeAction(actor: ActorCtx, action: LabAction, origin: ActionOrigin):
  Promise<AuthorizedAction | Denial>;

deriveLabState(facts: TeamResearchFacts): LabState;
```

`station`은 서버가 아는 `target / htvs / docking / admet / patent / fda / hospital` 등의 식별자다. **식별자를 안다는 사실 자체는 권한이 아니다.** 서버가 학급 정책과 행동 종류를 대조하고, 자기 회사 설비 또는 기관 업무로 해석한다. 기존 `ClientCtx`에 클라이언트가 정하는 `ignoreRange`를 추가하는 방식은 피한다.

반드시 유지할 불변식은 다음과 같다.

| 불변식 | 설계 요구 |
|---|---|
| 팀·학급 격리 | 세션에서 소속을 결정하고 결과·후보·특허도 다시 조회하여 소유권·허용 권한 확인 |
| 설비 조건 | 원격에서도 건설·등급·가동·회사 상태를 검사 |
| 멱등·과금 | `(팀, requestId, 세대)`와 기존 트랜잭션 유지. 화면 전환은 새 요청이 아님 |
| 중복과 충돌 | 같은 요청 번호의 다른 업무 입력은 거절. 위치·화면 정보는 업무 동일성 판단에서 제외 |
| 유료 차단 | 일시정지·구조조정 등 기존 지출 제한 유지. 이미 접수한 요청의 결과 재조회는 새 지출로 취급하지 않음 |
| 복원 | 새 세대에서 상태·초안 참조를 재검증. 옛 세대의 늦은 결과가 현재 후보를 덮지 못함 |
| 교사 정정 | 원본과 정정 기록 보존. 후속 단계 시작 전 최신 판정만 정정하는 현재 조건 유지 |

근거: [팀별 공개 범위·멱등·세대 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts:16), [유료 차단·재전송](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts:421), [복원 처리](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/snapshot/restore.ts:134), [정정 제한](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:1336).

**프로토콜 v12 변경 범위**는 명확히 묶어야 한다.

- 실행 요청의 `interactableId`를 `ActionOrigin`으로 일반화하고, 서버 검증용 `expectedGeneration`·필요한 상태 버전을 추가한다.
- 학급 실행 정책과 정책 버전, 서버가 계산한 `LabState`를 전달한다.
- 단계마다 `stepId`, `status`, `blockers`, `actions`, `evidenceRefs`, 비용·시간 기준을 제공한다.
- 응답에 `requestId`와 상태 버전을 연결하여 요청 완료를 특정한다.
- 물성 미리보기와 연구 초안 저장 계약을 추가한다.
- 기존 계산 `Stage`와 `PipelineStepKind`의 뜻은 유지한다.

현재는 프로토콜 v11이며 입장 때 버전을 검사한다. v12 배포에서는 구버전의 원격 요청을 묵시적으로 허용하지 않고, 클라이언트 업데이트를 요구해야 한다. [프로토콜 버전](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts:77), [입장 버전 검사](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/WorldRoom.ts:299)

상태는 `잠김·준비·실행 중·검토 필요·완료·보류·실행 오류·재검토 필요`로 구분하되 **기존 작업·파이프라인 기록에서 서버가 도출**한다. 별도의 클라이언트 완료 체크리스트를 진실로 삼지 않는다. 현재 모든 상태 수신을 대기 요청 완료로 처리하는 저장소 방식은 팀 동시 작업에 맞게 바꿔야 한다. [현재 applyState](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/store/pipeline.ts:138)

## 4. 오른쪽 작업 영역

각 단계는 **목표·선행 조건 → 입력 → 실행 비용·시간 → 결과·해석 → 다음 작업 준비** 순서로 구성한다.

| 단계 | 입력·실행·결과 | 다음 단계로 넘기는 내용 |
|---|---|---|
| 1 | 질환 선택, 근거 조회, 표적·기전 선언 | 질환·표적·구조의 일관된 식별자 |
| 2 | 라이브러리·필터 실행, 후보와 탈락 수 | 선택한 `ScreeningCandidate`와 원본 작업 ID |
| 3 | 후보 SMILES·표적 확인 후 유료 도킹 | 실제 Vina 작업 ID, 정규 구조, 표적, 계산 조건 |
| 4 | 원본·변형체 물성 및 재도킹 비교 | 선택 이유와 최종 분자 → 특허 신청 초안 |
| 5 | 유효 특허 분자 ADMET, 후보·제형 선택 | 특허 ID, ADMET 근거, 제형, 부족한 근거 |
| 6 | 용량·환자군·평가지표 선택 | 서버에 확정된 임상 계획 |
| 7~9 | 단계 목적·계획 확인, 실행·판정 해석 | 다음 상 또는 재도전 계획 |
| 10 | 3상 근거 확인, 브랜드·포장 입력 | 허가 결과와 전체 연구 기록 |

후보 전달은 표 문자열 복사가 아니라 기존 `candidates` 데이터를 사용한다. **‘다음 단계로 넘기기’는 초안 준비이며 자동 과금·자동 실행이 아니다.** 분자나 표적을 수정하면 기존 도킹·특허 근거가 그대로 유효하다고 표시하지 않는다. [구조화된 후보 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/protocol.ts:704), [표적×분자 근거 키](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts:96)

연구 초안에는 최소한 `classId·teamId·generation·programId·분자 버전·부모 버전·targetId·sourceJobId·선택 이유`를 저장하도록 제안한다. 공식 후보는 여전히 회사당 하나이며, 비교 중인 여러 분자는 연구 기록으로 둔다. [회사당 파이프라인 제한](/Users/mulkib/Desktop/repo/crista/docs/2026-10-19-game-balance-v0.md:310)

컴포넌트 재사용은 다음처럼 나눈다.

- **그대로 활용:** 계산 결과 타입, 서식 검증 규칙, 과금·환급 표시, 출처 표시, 게임 시계 계산, 교사 정정 표시.
- **내용과 창 외곽을 분리:** `InteractModal`, `ResultSheet`, `StepResultSheet`. 오른쪽 영역에 모달을 그대로 넣지 말고 입력·결과 본문을 공통 컴포넌트로 추출한다.
- **권한 정보 의존성을 교체:** `FacilityPipeline`, `DeskWindow`의 `open.actions`·장소 의존성을 서버의 행동 가능 목록과 연결한다.
- **다시 구성:** `PipelinePanel`의 8칸 표현과 `nextPlace`. 새 10단계에서는 장소보다 먼저 부족한 근거와 가능한 행동을 알려야 한다.

특히 `ResultSheet.onNext`는 **다음 미확인 결과**를 뜻한다. 후보 전달용으로 재해석하지 말고 별도 콜백을 추가한다. [ResultSheet](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/ResultSheet.tsx:750), [FacilityPipeline 계약](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/FacilityPipeline.tsx:34), [현재 패널](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/pipeline/PipelinePanel.tsx:139)

## 5. 과학적으로 빈 곳과 최소 추가 범위

**첫 출시에도 다음 네 가지는 필요하다.**

1. **표적 검증 근거 읽기.** 질환과 표적의 관련 근거·반대 근거·추가 검증 실험을 기록한다. 조회 가능한 유전자와 실제 도킹 가능한 네 표적을 구분한다. 현재 선언 조건은 같은 세대의 Stage 1 성공 여부만 보므로, 선택 질환과 해당 조회 근거도 연결해야 한다. [Stage 1 조건](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:302), [지원 표적 매핑](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/pipeline.ts:70)

2. **리드 최적화 비교 기록.** 원본과 최소 한 변형체를 비교하거나, 원본을 유지한 이유를 남긴다. 작용기 변경은 검증 가능한 제한된 예제와 SMILES 편집으로 시작한다. 무료 물성 → 필요한 후보만 유료 재도킹 순서로 진행한다. 기존 RDKit 정규화·경고 계산을 재사용할 수 있다. [물성 계산](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/app/properties.py:81)

3. **전임상 근거 묶음.** ADMET 예측 외에 실제로 부족한 독성·노출·제조·품질 자료를 체크하고 시험 계획을 쓰게 한다. 이를 실험 완료로 표시하지 않는다. **현재 임상 점수는 ADMET-AI 결과를 직접 사용하지 않는다.** 특허의 도킹값·RDKit 물성·용량·제형으로 계산한다. 초기에는 이 차이를 명시하고 ADMET를 해석 과제로 연결한다. 점수 체계에 넣는 변경은 별도 규칙 버전과 검증이 필요하다. [임상 판정 입력](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:1176), [FDA 전임상 설명](https://www.fda.gov/patients/drug-development-process/step-2-preclinical-research)

4. **연구비 심사 근거.** 회사 카드에서 가설·실험 계획·예산·실패 시 대안을 제출하고, 기존 Series A/B 교사 승인에 연결한다. 제출만으로 자금을 지급하거나 학생이 승인 API를 호출하게 만들지 않는다. [기존 투자 승인 계약](/Users/mulkib/Desktop/repo/crista/packages/shared-types/src/gm.ts:445)

**무료 물성은 게임 서버를 거쳐 기존 워커를 호출하는 방식을 먼저 권고한다.** 학생에게 워커 주소를 직접 열어 주지 않는다. 기존 엔진과 정규화 규칙을 그대로 써야 특허 등록 때 값이 달라지는 혼란을 줄일 수 있다. RDKit.js는 이후 오프라인·즉시 미리보기 필요성이 확인되면 도입하고, 공식 판정값은 서버 재계산으로 확정한다.

게임 내 비용은 0으로 하되 서버에는 요청 크기·분자 복잡도 제한, 사용자·팀별 요청 제한, 동시 처리 제한, 엔진 버전을 포함한 캐시를 둔다. 미리보기 실패가 도킹으로 자동 전환되어서는 안 된다. 현재 엔드포인트에는 본문 크기 검사와 RDKit 계산이 있지만, 이 함수 자체에는 학생별 요청 제한이 없다. 외부 배포망의 보호 수준은 **추정할 수 없어 미확인**으로 둔다. [물성 엔드포인트](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/app/main.py:289)

## 6. 적대적 검토: 우선순위

| 우선순위 | 깨질 지점과 근거 | 출시 전 대응 |
|---|---|---|
| **P0** | 가상 지점 ID로 위치·설비·팀 권한을 함께 우회 | 공통 권한 함수에서 위치 조건만 정책화하고 나머지 검사 유지 |
| **P0** | ADMET 특허 제한이 화면에만 존재할 가능성 | 검토한 요청 경로는 SMILES를 전달하고 Stage 4 입력 검사는 길이 중심이다. `patentId`를 받아 서버가 유효성·허용 권한·구조를 대조해야 함 |
| **P0** | 복원 전 응답·다른 팀원의 갱신을 내 요청 성공으로 처리 | 세대·상태 버전·요청 ID를 구분하고 복원 시 후보 참조 재검증 |
| **P0** | 계산 완료를 표적 검증·전임상 성공으로 오인 | 결과 출처와 학습 완료 기준 분리. `fixture`는 실제 연구 근거에서 제외 |
| **P1** | 후보 선택으로 연구 표적이 조용히 변경 | 현재 제형 결정은 표적을 특허 표적으로 덮는다. IND 전 명시적 연구계획 변경만 허용하고, 이후 후보 교체는 같은 표적으로 제한하는 정책 권고 |
| **P1** | 무료 미리보기·반복 도킹으로 실제 서버 비용 폭증 | 요청 제한·동시 처리·캐시·실행 전 비용 표시. 게임 연구비와 인프라 비용을 별도 관리 |
| **P1** | UI 프리뷰가 자체 완료 상태·가짜 성공 전환을 구현 | 공유 단계 ID·상태·차단 사유·행동 계약과 동일한 테스트 데이터를 사용 |

근거: [ADMET 화면 제한](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/ui/InteractModal.tsx:672), [서버 작업 전달](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts:471), [Stage 4 입력 검증](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/jobs/service.ts:969), [현재 상태 반영](/Users/mulkib/Desktop/repo/crista/apps/desktop-client/src/store/pipeline.ts:138), [후보 결정 시 표적 변경](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/pipeline/service.ts:821).

교육 효과 측면에서는 **최저 도킹값 찾기와 성공 버튼 누르기만 반복하는 위험**도 있다. 단계마다 ‘왜 선택했는가·무엇을 아직 모르는가·실패 후 무엇을 바꾸는가’를 남겨야 한다. 효과 검증은 실제 학생이 도움 없이 첫 후보를 도킹 입력으로 넘기는지부터 시작한다. 현재 보고서만으로 성공률이나 학습 효과를 단정할 수 없다. [평가 한계·후속 제안](/Users/mulkib/Desktop/repo/crista/.review/persona-2026-10-23/report.md:54)

## 7. 구현 순서와 완료 기준

| 순서 | 작은 구현 단위 | 완료 기준 |
|---|---|---|
| **1** | 10단계·상태·행동 계약 확정 | UI 프리뷰와 서버가 같은 단계 ID, 잠금 사유, 출처 구분 사용. 화면 번호와 계산 Stage가 분리됨 |
| **2** | 공통 권한 경로·학급 정책·v12 | 위치 필수 학급의 원격 위조 거절. 랩 허용 학급도 타 팀·미건설·가동 중지·유료 차단을 우회하지 못함 |
| **3** | 1→2→3 실제 연결 | 질환·표적 불일치 없이 조회 → 선언 → 후보 선택 → 실제 Vina 실행. 재전송에도 작업·과금 한 번 |
| **4** | 특허→ADMET→후보·제형 | 서버가 특허와 분자를 검증. 근거 없는 실제 실행과 테스트 결과의 승격을 차단 |
| **5** | 무료 물성·변형체·근거 기록 | 원본/변형체 비교가 재접속 후 유지. 입력 제한·요청 제한 작동. 선택 변경 시 필요한 근거가 재검토 상태가 됨 |
| **6** | IND→임상→허가 전체 흐름 | 게임 시계·유료 차단·재도전 3경로·교사 정정이 기존 규칙대로 작동. 계산 작업 시간과 게임 시간을 구분 |
| **7** | 복원·동시 작업·수업 검증 | 두 팀·동일 팀 두 사용자·연결 단절·늦은 응답·학급 복원에서 격리와 상태 일치 확인. 실제 학생 과제로 다음 행동 이해도 검증 |

검증 기준은 기존의 [장소 검사](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/world/interact.ts:307), [재전송 처리](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/rooms/handlers.ts:495), [재도전 규칙](/Users/mulkib/Desktop/repo/crista/docs/2026-10-19-game-balance-v0.md:387), [복원 처리](/Users/mulkib/Desktop/repo/crista/apps/game-server/src/snapshot/restore.ts:142)를 두 화면에서 동일하게 만족하는 것이다.

1~4가 끝나면 기존 계산을 연결한 랩으로 제한 공개할 수 있다. **‘신약 개발 파이프라인을 직접 해 보는 플랫폼’이라는 범위의 완료 기준은 5~7까지** 잡는 것이 적절하다. 화면을 전환해도 같은 회사의 돈·분자·근거·진행 기록을 이어 쓰고, 학생이 자신의 선택과 결과를 설명할 수 있어야 한다.

🌱 graft 표시 기준 약 145,548토큰 절약 — 조회 4회.