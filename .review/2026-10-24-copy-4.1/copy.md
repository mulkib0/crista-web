# 4.1 임상 1 · 2 · 3상 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 원문(`gemini-raw.md`, 136행) → Claude 검토 · 수정 · 보충
- 날짜: 2026-10-24
- 상태: **반영됨(2026-10-24)** — `CLINICAL_COPY`(packages/web-contract/src/clinical.ts) · s41.tsx · s41-charts.tsx. 화면 자리가 없는 키(예: `recruit.factor.rule` · `viz.703~705`)는 넣지 않았어요. 스크린샷 `../2026-10-24-copy-apply/copy-4.1/`.
- 근거: `../2026-10-24-copy-common/brief.md` 'F41 · 4.1 임상' · 설계 §6.1(4.1 줄) · §10(실패 바운티) · 시안 `design/step-viz/viz-7.js`(7.01~7.10) · `packages/web-contract/src/clinical.ts`(`PHASE_RULES` · `RECRUIT_TIERS` · `recruitModel` · `trialPower` · `CLINICAL_COPY`) · `apps/server/src/features/clinical.ts`(재도전 경로 · 바운티) · `clinical-sim.ts`(AI 판정 기준)

표기 약속:
- 모든 줄에서 Gemini 원문의 백틱(`` `{x}` ``)을 뺐다. 화면에 백틱이 그대로 찍히기 때문이다. 가운뎃점은 저장소 표기대로 앞뒤를 띄웠다(`1상 · 2상`). 이 두 가지는 줄마다 따로 표시하지 않았다.
- 사실 · 숫자 · 자리표시자 · 문구를 고친 줄은 근거 칸 끝에 **(Claude 수정)**, 새로 채운 줄은 **(Claude 보충)** 을 붙였다. 2차 독립 검증에서 고친 줄은 **(검증 수정)**, 새로 채운 줄은 **(검증 보충)** 을 덧붙였다. 무엇을 왜 고쳤는지는 `review.md` 에 있다.
- 자리표시자 이름은 화면 모양(`TrialView` · `TrialProtocolView` · `RecruitView` · `RouteOptionView`)의 필드 이름에 맞췄다. `(새)` = `CLINICAL_COPY` 에 아직 없는 이름이다.
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `4.1.intro.question` | 사람에게서도 안전하고, 정말 효과가 있을까요? | — | COPY.question · §6.1 |
| `4.1.intro.oneline` | 우리 약을 사람에게 써 보는 임상시험(사람을 대상으로 한 시험)을 해요. 1상은 안전, 2상은 효과, 3상은 많은 환자에게서 둘 다를 확인해요. | — | COPY.oneLine · F41 (Claude 수정) |
| `4.1.intro.doneWhen` | 3상까지 통과하면 4.1 이 끝나고 4.2 최종 허가로 넘어가요. | — | COPY.doneWhen · §6.1 (Claude 수정) |
| `4.1.intro.phase1.question` | 1상: 사람에게 안전한가요? | — | COPY.phaseQuestion.phase1 · §6.1 (Claude 수정) |
| `4.1.intro.phase2.question` | 2상: 환자에게 효과가 있나요? | — | COPY.phaseQuestion.phase2 · §6.1 (Claude 수정) |
| `4.1.intro.phase3.question` | 3상: 많은 환자에게서 효과와 안전을 함께 확인할 수 있나요? | — | COPY.phaseQuestion.phase3 · §6.1 (Claude 수정) |
| `4.1.intro.phase1.who` | 건강한 지원자 {target}명을 모아요. 용량을 조금씩 올려 가며 시험해요. | `{target}` | COPY.phaseWho.phase1 · 규칙-상별 · 규칙-군구성 (Claude 수정) |
| `4.1.intro.phase1.whoOncology` | 항암제는 독성이 커서 보통 건강한 사람에게 주지 않아요. 그래서 1상부터 암 환자 {target}명에게 시험해요. | `{target}` | COPY.oncologyWho · 규칙-군구성 (Claude 수정) (검증 수정) |
| `4.1.intro.phase2.who` | 환자 {target}명을 무작위로(제비뽑기처럼) 나눠요. 그리고 위약(약 성분이 없는 가짜 약)을 받은 무리와 견줘요. | `{target}` | COPY.phaseWho.phase2 · 규칙-상별 (Claude 수정) (검증 수정) |
| `4.1.intro.phase3.who` | 환자 {target}명에게서 효과와 안전을 확증해요. | `{target}` | COPY.phaseWho.phase3 · 규칙-상별 (Claude 수정) |
| `4.1.sidebar.recruiting` | {phase} · 모집 {n}/{target}명 | `{phase}` · `{n}` · `{target}` | §6.1 · TrialView.recruit (Claude 보충) |
| `4.1.sidebar.running` | {phase} · {progress}% | `{phase}` · `{progress}`(새) | §6.1 · TrialView.progressPct |
| `4.1.sidebar.held` | {phase} 보류 · 재도전 가능 | `{phase}` | §6.1 |
| `4.1.sidebar.pending` | {phase} · 판정 대기 | `{phase}` | §6.1 · TrialStatus.pending (Claude 보충) |
| `4.1.intro.locked` | 3.3 에서 IND(임상시험 계획 승인 신청)가 승인되면 열려요. | — | COPY.locked · F41 (Claude 수정) (일관성 수정) |
| `4.1.step.protocol.label` | ① 프로토콜 | — | COPY.tabs.protocol · F41-① |
| `4.1.step.protocol.desc` | 프로토콜(임상시험 계획서)을 확인해요. 제형 · 용량 · 환자군 · 평가지표 · 군 구성 · 목표 인원이 들어 있어요. | — | F41-① (Claude 수정) |
| `4.1.step.recruit.label` | ② 참여자 모집 | — | COPY.tabs.recruit · F41-② |
| `4.1.step.recruit.desc` | 모집 투자 단계를 골라 참여자를 모아요. 게임 시계가 흐르면 매일 인원이 늘어요. | — | F41-② (Claude 수정) |
| `4.1.step.start.label` | ③ 시작 | — | COPY.tabs.start · F41-③ |
| `4.1.step.start.desc` | 최소 인원이 모이면 검정력(효과가 있을 때 시험이 그것을 찾아낼 확률)을 보고 시작할 때를 정해요. 시작하면 상 비용을 내요. | — | F41-③ (Claude 수정) (검증 수정) |
| `4.1.step.sim.label` | ④ 시뮬레이션 | — | F41-④ |
| `4.1.step.sim.desc` | 임상을 시작하면 AI(Claude)가 우리 약의 계산값으로 모의 임상 결과를 만들어요. 결과는 상 기간이 끝나는 날 공개돼요. | — | F41-④ (Claude 수정) (검증 수정) |
| `4.1.step.result.label` | ⑤ 결과 · 분석 | — | COPY.tabs.result · F41-⑤ |
| `4.1.step.result.desc` | 결과 표와 그림을 읽고 통과 · 보류 판정을 확인해요. 보류면 재도전 경로를 골라요. | — | F41-⑤ |
| `4.1.protocol.candidate` | 후보 {codeName} · 제형 {form} · 계획 용량 {doseMg} mg · 환자군 {population} | `{codeName}`(새) · `{form}`(새) · `{doseMg}`(새) · `{population}`(새) | F41-① · TrialProtocolView (Claude 수정) |
| `4.1.protocol.endpoint.default` | 1차 평가지표(이 시험이 답하려는 질문을 재는 가장 중요한 잣대): {endpoint}({unit}) | `{endpoint}` · `{unit}` | F41-① · 규칙-평가지표 (Claude 수정) |
| `4.1.protocol.endpoint.phase1` | 1상의 1차 평가지표는 군별 이상사례 발생 비율(%)이에요. 이상사례는 시험 중에 생긴 좋지 않은 변화를 모두 뜻해요(약 때문인지와 상관없이). 비율이 낮을수록 좋아요. | — | 규칙-판정 (Claude 수정) |
| `4.1.protocol.arms.phase1` | 1상 군 구성: 위약(약 성분이 없는 가짜 약) · 낮은 용량(계획의 0.25배) · 중간 용량(0.5배) · 계획 용량(1배)에 25%씩 나눠요. | — | COPY.arm · 규칙-군구성 |
| `4.1.protocol.arms.phase1Onc` | 항암 1상 군 구성: 대조군 없이 낮은 용량(0.25배) · 중간 용량(0.5배) · 계획 용량(1배)에 1/3씩 나눠요. | — | 규칙-군구성 |
| `4.1.protocol.arms.phase2` | 2상 군 구성: 대조군(약의 효과를 견주는 기준 무리) · 중간 용량(0.5배) · 계획 용량(1배)에 1/3씩 나눠요. 대조군은 위약을 받아요. 항암제는 위약 대신 표준 치료(지금 가장 널리 쓰는 치료법)를 받아요. | — | 규칙-군구성 (Claude 수정) (검증 수정) |
| `4.1.protocol.arms.phase3` | 3상 군 구성: 대조군(약의 효과를 견주는 기준 무리)과 계획 용량 군을 1 : 1 로 나눠요. 항암제는 위약 대신 표준 치료(지금 가장 널리 쓰는 치료법)를 대조군으로 써요. | — | COPY.arm.controlOnc · 규칙-군구성 (검증 수정) |
| `4.1.protocol.design` | 대조군이 있는 시험은 무작위 배정(제비뽑기처럼 군을 정하는 것)을 해요. 눈가림(누가 진짜 약을 받았는지 참여자와 의사가 모르게 하는 것)도 해요. 둘 다 결과가 한쪽으로 치우치는 것을 막아요. | — | 규칙-군구성 (Claude 수정) |
| `4.1.protocol.sampleSize` | 목표 {target}명 · 최소 시작 인원 {min}명 · 1차 평가 {primaryWeek}주 차 | `{target}` · `{min}` · `{primaryWeek}`(새) | COPY.minNeed · 규칙-상별 (Claude 수정) |
| `4.1.protocol.scaleNote` | 목표 인원은 수업에 맞춰 줄인 규모예요. 실제 임상시험은 대략 1상 수십 명, 2상 수백 명, 3상 수백~수천 명 규모예요. | — | 규칙-상별 · 시안 7.09(FDA: 3상 300~3,000명) (검증 수정) |
| `4.1.protocol.costDuration` | {phase} 비용 {cost} · 기간 {days}게임 일 | `{phase}` · `{cost}` · `{days}` | F41-③ · 규칙-상별 · PhaseLadderView (Claude 수정) (일관성 수정) |
| `4.1.recruit.tier.basic.label` | 기본 | — | COPY.tier.basic.label · 규칙-모집 (Claude 수정) |
| `4.1.recruit.tier.basic.note` | 추가 비용이 없어요. 대신 목표 인원까지 오래 기다려야 해요. | — | COPY.tier.basic.note · F41-② (Claude 수정) |
| `4.1.recruit.tier.expanded.label` | 확대 | — | COPY.tier.expanded.label · 규칙-모집 (Claude 수정) |
| `4.1.recruit.tier.expanded.note` | 참여 병원을 늘려요. 모집 속도가 2배가 되고, 하루 {cost}가 들어요. | `{cost}` | COPY.tier.expanded.note · 규칙-모집 (Claude 수정) (일관성 수정) |
| `4.1.recruit.tier.focus.label` | 집중 | — | COPY.tier.focus.label · 규칙-모집 (Claude 수정) |
| `4.1.recruit.tier.focus.note` | 병원과 모집 안내를 크게 늘려요. 모집 속도가 3.5배가 되고, 하루 {cost}가 들어요. | `{cost}` | COPY.tier.focus.note · 규칙-모집 (Claude 수정) (일관성 수정) |
| `4.1.recruit.tier.speed` | 속도 ×{speed} | `{speed}`(새) | RecruitTierView.speed (Claude 보충) |
| `4.1.recruit.tier.changeRule` | 모집 투자 단계는 언제든 바꿀 수 있어요. 바꾼 날부터 모집 중인 게임 일마다 그 단계의 하루 비용이 나가요. | — | F41-② · 규칙-모집 |
| `4.1.recruit.status.speed` | 지금 모집 속도는 하루 {perDay}명이에요. 모인 참여자는 {n}/{target}명이에요. | `{perDay}`(새) · `{n}` · `{target}` | 규칙-모집 · RecruitView (Claude 수정) |
| `4.1.recruit.status.estimate` | 목표까지 약 {daysLeft}게임 일 남았어요. 이 단계를 계속 쓰면 {costLeft}가 더 들어요. | `{daysLeft}`(새) · `{costLeft}`(새) | F41-② · recruitProjection (Claude 수정) (일관성 수정) |
| `4.1.recruit.curve.desc` | 모집 곡선은 게임 일마다 모인 참여자 수를 이어 그린 선이에요. 투자 단계를 바꾸면 기울기가 바뀌어요. | — | F41-② · RecruitView.curve (Claude 수정) (일관성 수정) |
| `4.1.recruit.screenFail.desc` | 선별(참여 조건에 맞는 사람을 고르는 검사)에서 떨어지는 비율이에요. 이번 시험은 약 {screenFailPct}%가 선별에서 떨어져요. | `{screenFailPct}`(새) | 규칙-모집 (Claude 수정) |
| `4.1.recruit.dropout.desc` | 탈락(시험 도중에 그만두는 것) 비율이에요. 이번 시험은 약 {dropoutPct}%가 끝까지 마치지 못할 것으로 예상해요. | `{dropoutPct}`(새) | 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.value` | 모집 속도 ×{factor} | `{factor}`(새) | RecruitFactorRow.factor (Claude 보충) |
| `4.1.recruit.factor.safety` | 안전 예상치 S — 안전할수록 참여하려는 사람이 많아요. S 가 50 보다 낮으면 탈락도 늘어요. | — | COPY.factor.safety · 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.efficacy` | 효능 예상치 E — 기대가 클수록 환자와 의사가 더 참여해요. 환자 시험에만 적용해요. | — | COPY.factor.efficacy · 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.risk` | hERG(심장 근육이 한 번 뛴 뒤 전기적으로 원래 상태로 돌아오게 돕는 칼륨 통로) · 간 위험 — 위험이 있으면 검사가 늘어 선별에서 더 많이 떨어져요. | — | COPY.factor.risk · 규칙-모집 (Claude 수정) (검증 수정) |
| `4.1.recruit.factor.form` | 제형 — 정맥주사는 병원에 와서 맞아야 해서 부담이 커요. 붙이는 경피 패치는 부담이 적어요. | — | COPY.factor.form · 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.cns` | CNS(중추신경계: 뇌와 척수) 질환 환자 — 동의를 받고 상태를 평가하는 절차가 까다로워요. | — | COPY.factor.cns · 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.prevalence` | 질환 유병(그 병을 앓는 사람이 얼마나 흔한지) — 흔한 병은 빨리, 드문 병은 느리게 모여요. | — | COPY.factor.prevalence · 규칙-모집 (Claude 수정) |
| `4.1.recruit.factor.rule` | 규칙: S ≥ 70 ×1.15 · ≥ 50 ×1 · ≥ 35 ×0.85 · 그 아래 ×0.7 / E ≥ 60 ×1.1 · ≥ 40 ×1 · 그 아래 ×0.9 / 위험 높음 ×0.9 · 보통 ×0.95 / 정맥주사 ×0.85 · 경피 ×1.05 / CNS ×0.85 / 흔한 병 ×1.2 · 드문 병 ×0.6 | — | 규칙-모집 (Claude 보충 — Gemini 가 요인 줄에 넣은 숫자를 '규칙 보기' 한 칸으로 모음) |
| `4.1.recruit.backupWait` | 백업 후보로 바꾼 뒤에는 새 IND 심사가 끝나는 D+{fromDay}부터 모집이 시작돼요. | `{fromDay}`(새) | 규칙-재도전 · RecruitView.availableFromDay (Claude 수정) (일관성 수정) |
| `4.1.power.23.desc` | 검정력(약에 정말 효과가 있을 때 시험이 그 효과를 찾아낼 확률)은 인원이 많을수록 높아져요. | — | COPY.powerNote · 규칙-검정력 |
| `4.1.power.1.desc` | 1상은 검정력 대신 '이상사례 감지력'을 보여 줘요. 약을 받은 사람 가운데 5%에게 생기는 이상사례를 한 번이라도 볼 확률이에요. | — | COPY.power1Note · 규칙-검정력 (Claude 수정) |
| `4.1.power.target` | 목표 인원을 채우면 검정력이 {targetPower}%가 되도록 설계했어요. | `{targetPower}`(새) | 규칙-상별(2상 80% · 3상 90%) · 규칙-검정력 (Claude 수정) |
| `4.1.power.current` | 지금 {n}명이면 {power}%예요. 목표 {target}명이면 {powerAtTarget}%예요. | `{n}` · `{power}`(새) · `{target}` · `{powerAtTarget}`(새) | 규칙-검정력 · RecruitView.power · powerAtTarget (Claude 수정) |
| `4.1.power.lowWarn.default` | 최소 {min}명만 넘으면 시작할 수 있어요. 하지만 인원이 적으면 약에 효과가 있어도 보류될 가능성이 커져요. | `{min}` | COPY.minNeed · 규칙-검정력(2 · 3상) |
| `4.1.power.lowWarn.phase1` | 인원이 적으면 드문 이상사례를 놓치기 쉬워요. | — | 규칙-검정력(1상) (Claude 보충) |
| `4.1.start.btn.label` | {phase} 임상 시작 | `{phase}` | F41-③ |
| `4.1.start.confirm.body` | 지금 모인 {n}명으로 {phase}을 시작할까요? {cost}를 내고 {days}게임 일 동안 시험해요. 시작하면 모집이 멈추고 인원이 고정돼요. 시작한 뒤에는 되돌릴 수 없어요. | `{n}` · `{phase}` · `{cost}` · `{days}` | COPY.startConfirm · F41-③ (Claude 수정) (일관성 수정) |
| `4.1.start.block.minNeed` | 아직 최소 인원 {min}명이 모이지 않았어요. 목표는 {target}명이에요. | `{min}` · `{target}` | COPY.minNeed · 규칙-상별 (Claude 수정) |
| `4.1.start.block.budget` | 연구비가 모자라요. {phase}을 시작하려면 {cost}가 필요해요. | `{phase}` · `{cost}` | F41-③ (Claude 수정) (일관성 수정) |
| `4.1.running.status` | {phase} 진행 중 · {progress}% · 결과는 D+{day}에 공개돼요. | `{phase}` · `{progress}`(새) · `{day}` | COPY.running · F41-④ (Claude 수정) (일관성 수정) |
| `4.1.running.simTiming` | 결과는 시작할 때 만들어 두어요. 그리고 상 기간이 끝나는 날 한꺼번에 공개해요. | — | F41-④ (Claude 수정) (검증 수정) |
| `4.1.running.mon.start` | DMC(독립 자료모니터링위원회: 시험 도중 안전을 따로 살피는 전문가 모임)가 안전성 자료를 정기적으로 봐요. | — | COPY.monitoring.start (Claude 수정) |
| `4.1.running.mon.herg` | 심전도로 QT 간격(심장 아래쪽 방인 심실이 전기 신호로 흥분했다가 원래대로 돌아오기까지 걸리는 시간)을 감시하고 있어요. | — | COPY.monitoring.herg (Claude 수정) (검증 수정) |
| `4.1.running.mon.liver` | 혈액 검사로 간 수치(ALT · AST: 간세포가 다치면 오르는 효소)를 감시하고 있어요. | — | COPY.monitoring.liver (Claude 수정) |
| `4.1.running.mon.cns` | 인지 · 정신 상태 평가를 함께 하고 있어요. | — | COPY.monitoring.cns (Claude 수정) |
| `4.1.running.mon.iv` | 주사 부위 반응과 주사 직후 반응을 기록하고 있어요. | — | COPY.monitoring.iv (Claude 수정) |
| `4.1.running.mon.half` | 시험 기간의 절반이 지났어요. 눈가림을 지키려고 결과는 끝난 뒤 한꺼번에 공개해요. | — | COPY.monitoring.half (Claude 수정) |
| `4.1.running.pending` | 판정을 기다려요. AI 시뮬레이션 결과가 아직 준비되지 않아 선생님이 확인하고 있어요. | — | COPY.pending · F41-④ (Claude 수정) |
| `4.1.result.header` | {phase} 임상시험 결과 | `{phase}` | F41-④ (Claude 수정) |
| `4.1.result.consort.read` | CONSORT(참여자 흐름도)예요. 선별부터 배정 · 완료까지 사람이 어디서 몇 명 빠졌는지 보여 줘요. 끝까지 마친 비율이 75% 아래로 떨어지면 운영 문제로 보류될 수 있어요. | — | 규칙-판정 · 규칙-결과 (Claude 수정) |
| `4.1.result.consort.reasons` | 중도 탈락 이유: 이상사례 · 추적 소실(연락이 끊김) · 동의 철회 · 효과 부족 · 계획 위반 · 기타 | — | 규칙-결과 · DROPOUT_REASONS (Claude 보충) |
| `4.1.result.demographics.read` | 참여자의 평균 나이(± 표준편차)와 여성 비율이에요. 무작위 배정이 잘 되면 군끼리 비슷해요. | — | 규칙-결과 (Claude 수정) |
| `4.1.result.pk.read` | PK(약동학: 몸이 약을 흡수 · 분포 · 대사 · 배설하는 과정)예요. Cmax 는 가장 높은 혈중 농도, Tmax 는 그때까지 걸린 시간이에요. 반감기는 농도가 절반으로 줄어드는 시간, AUC 는 곡선 아래 넓이로 몸이 약에 노출된 총량이에요. | — | F41-④ · 규칙-결과 (Claude 수정) |
| `4.1.result.ae.read` | 이상사례 표는 증상을 몸의 기관별로 묶어 군마다 몇 명에게 생겼는지 보여 줘요. 등급은 CTCAE(이상사례가 얼마나 심한지 1~5 등급으로 매기는 기준)를 따라요. SAE(중대한 이상사례: 입원 · 생명 위협 등)와 DLT(용량 제한 독성: 용량을 더 올리지 못하게 하는 독성)를 먼저 보세요. | — | 규칙-판정 · 규칙-결과 (Claude 수정) |
| `4.1.result.ae.rule` | AI 시뮬레이션은 이런 기준으로 판정해요. 1상은 계획 용량 군의 DLT 가 그 군 인원의 1/3 을 넘거나 심각한 안전 신호가 있으면 보류예요. 3상은 약 군의 SAE 비율이 대조군보다 10%p 넘게 높으면 보류예요. | — | 규칙-판정 (Claude 수정) |
| `4.1.result.primary.read.default` | 1차 평가지표 {endpoint}({unit})의 군별 평균과 대조군과의 차이예요. 차이의 95% 신뢰구간(같은 방법으로 여러 번 시험하면 100번 중 약 95번은 진짜 값을 품는 범위)이 0 을 포함하지 않으면 p < 0.05 와 같은 뜻이에요. 차이가 좋은 방향이고 p < 0.05 이면 효과가 있다고 판단해요. 그래도 우연일 가능성이 완전히 사라진 것은 아니에요. | `{endpoint}` · `{unit}` | 규칙-판정 · 규칙-결과 (Claude 수정) (검증 수정) |
| `4.1.result.primary.read.phase1` | 1상은 군끼리 통계 비교(차이 · p 값)를 하지 않아요. 용량이 올라갈수록 이상사례 비율이 어떻게 변하는지 보세요. | — | clinical-sim.ts 프롬프트(1상 comparison = null) (검증 보충) |
| `4.1.result.p.def` | p 값(약에 효과가 전혀 없다고 할 때 이만큼 또는 더 큰 차이가 우연히 나올 확률) | — | 규칙-판정 (Claude 보충) |
| `4.1.result.timecourse.read` | 시간 경과 그래프는 0주부터 1차 평가 주차까지 군별 평균이 어떻게 변했는지 보여 줘요. 계획 용량 군과 대조군의 간격이 벌어지는지 보세요. | — | F41-④ · 규칙-결과 (Claude 수정) |
| `4.1.result.responder.read` | 반응률은 미리 정한 만큼 좋아진 참여자의 비율(%)이에요. 군끼리 견줘 보세요. | — | 규칙-결과 (Claude 수정) |
| `4.1.result.subgroup.read` | 하위군(나이 · 성별 · 중증도 등으로 나눈 작은 집단) 분석이에요. 숲 그림(집단별 차이와 95% 신뢰구간을 나란히 그린 그림)으로 효과가 고르게 나타나는지 봐요. 하위군은 인원이 적어 구간이 넓어요. | — | 규칙-결과(2 · 3상) (Claude 수정) |
| `4.1.result.survival.read` | 무진행 생존(PFS: 암이 더 나빠지지 않고 살아 있는 상태) 곡선이에요. 시간이 지날수록 그 상태인 사람의 비율이 줄어요. 약 군의 곡선이 대조군(표준 치료)보다 위에 오래 머물수록 좋아요. | — | 규칙-결과(항암 2 · 3상) (Claude 수정) |
| `4.1.result.aiAnalysis.header` | AI 분석 | — | 규칙-결과 (Claude 수정) |
| `4.1.result.aiRec.header` | AI 권고 — 다음에 할 일 | — | 규칙-결과 (Claude 수정) |
| `4.1.verdict.pass.title` | {phase} 통과 | `{phase}` | COPY.verdictPass (Claude 수정) |
| `4.1.verdict.pass.next` | {next} 모집을 시작할 수 있어요. | `{next}`(새) | F41 · nextPhase (Claude 보충) |
| `4.1.verdict.held.title` | {phase} 보류 | `{phase}` | COPY.verdictHeld (Claude 수정) |
| `4.1.verdict.held.next` | 원인을 분석하고 재도전 경로를 골라 보세요. | — | F41 (Claude 보충 — Gemini 제목에서 분리) |
| `4.1.verdict.hold.safety` | 안전성 문제 — 약을 받은 군에서 심각한 이상사례가 기준보다 많았어요. | — | COPY.holdKind.safety · 규칙-판정 (Claude 수정) |
| `4.1.verdict.hold.efficacy` | 효능 부족 — 대조군과의 차이가 우연으로도 나올 수 있는 정도였거나(p ≥ 0.05), 나쁜 방향이었어요. | — | COPY.holdKind.efficacy · 규칙-판정 (Claude 수정) (검증 수정) |
| `4.1.verdict.hold.both` | 효능 · 안전 둘 다 — 효과를 증명하지 못했고, 안전 문제도 함께 나왔어요. | — | COPY.holdKind.both · 규칙-판정 (Claude 수정) |
| `4.1.verdict.hold.operational` | 운영 문제 — 탈락이 많아 끝까지 마친 사람이 75% 아래였어요. | — | COPY.holdKind.operational · 규칙-판정 (Claude 수정) |
| `4.1.verdict.phase3Done` | 3상까지 통과했어요. 이제 4.2 최종 허가로 가요. | — | COPY.done · §6.1 (Claude 수정) |
| `4.1.route.first.label` | 1상 모집 시작 | — | COPY.routes.first (Claude 보충) |
| `4.1.route.next.label` | {phase} 모집 시작 | `{phase}` | COPY.routes.next (Claude 보충) |
| `4.1.retry.same.label` | 같은 프로토콜로 다시 | — | COPY.routes.same · 규칙-재도전 (Claude 수정) |
| `4.1.retry.same.desc` | 운이 나빴다고 볼 때 골라요. 예상치(E · S)는 참고 기준을 넘는데 흔들림이나 탈락 때문에 보류됐을 때예요. 참여자를 처음부터 다시 모으고, 시작할 때 상 비용을 다시 내요. | — | COPY.routeWhy.same · 규칙-재도전 (Claude 수정) (검증 수정) |
| `4.1.retry.amend.label` | 용량 · 제형 바꾸기(IND 변경) | — | COPY.routes.amend · 규칙-재도전 (Claude 수정) |
| `4.1.retry.amend.desc` | 용량이 높아 안전이 걸렸거나 흡수가 문제일 때 골라요. 바꾸는 수수료와 기다림은 없어요. 그 제형의 MRSD(사람에게 처음 줄 수 있는 최대 권장 시작 용량) 이하이면서 안전 S 가 35 이상인 조합만 고를 수 있어요. | — | COPY.routeWhy.amend · 규칙-재도전 (Claude 수정) |
| `4.1.retry.amend.resetPhase1` | 제형을 바꾸거나 1상에서 확인한 용량보다 올리면 1상(안전)부터 다시 해요. | — | COPY.resetsToPhase1 · 규칙-재도전 (Claude 수정) |
| `4.1.retry.amend.overMrsd` | 그 제형의 MRSD({mrsd} mg)를 넘어요. | `{mrsd}` | server amendOptions (Claude 보충) |
| `4.1.retry.amend.noMrsd` | 동물실험 MRSD 가 없어서 같은 제형에서 더 낮은 용량으로만 바꿀 수 있어요. | — | server amendOptions (검증 보충) |
| `4.1.retry.amend.noTransdermal` | 이 분자는 피부를 잘 통과하지 못해 경피 패치로 쓸 수 없어요. | — | server amendOptions (Claude 보충) |
| `4.1.retry.amend.lowSafety` | 안전 S {s}가 35 보다 낮아요. | `{s}`(새 — ind.ts COPY 와 같은 이름) | server amendOptions · IND_SAFETY_MIN (Claude 보충) |
| `4.1.retry.backup.label` | 백업 후보로 교체(새 IND) | — | COPY.routes.backup · 규칙-재도전 (Claude 수정) |
| `4.1.retry.backup.desc` | 분자 자체가 문제일 때 골라요. 수수료 {fee}를 내고 {waitDays}게임 일 심사를 기다린 뒤 1상부터 다시 해요. | `{fee}`(새) · `{waitDays}`(새) | COPY.routeWhy.backup · 규칙-재도전 · RouteOptionView (Claude 수정) (일관성 수정) |
| `4.1.retry.backup.doseFit` | 지금 용량이 백업 후보의 MRSD 를 넘으면, 넘지 않는 가장 높은 용량으로 맞춰요. | — | server openTrial(backup) (검증 보충) |
| `4.1.retry.backup.lowMrsd` | 백업 후보의 {form} MRSD 가 너무 낮아 고를 수 있는 용량이 없어요. | `{form}`(새) | server openTrial(backup) (검증 보충) |
| `4.1.retry.block.noAmend` | 바꿀 수 있는 용량 · 제형 조합이 없어요(MRSD · 경피 적합 · S ≥ 35). | — | 규칙-재도전 · server routeOptions (Claude 수정) |
| `4.1.retry.block.noBackup` | 3.2 에서 동물실험을 끝낸 백업 특허가 없어요. | — | 규칙-재도전 (Claude 수정) |
| `4.1.retry.block.noBudget` | 연구비가 모자라요. | — | 규칙-재도전 · server routeOptions (Claude 수정) |
| `4.1.bounty.intro` | 보류 원인을 맞게 분석하면 낸 상 비용의 {rate}%를 돌려받아요. 모집 투자에 쓴 돈은 돌려받지 않아요. | `{rate}` | COPY.bountyIntro · §10 · 규칙-바운티 (Claude 수정) (검증 수정) |
| `4.1.bounty.retryRule` | 틀리면 힌트가 나오고, 60초 뒤에 다시 낼 수 있어요. | — | COPY.bountyIntro · TRIAL_BOUNTY_RETRY_SEC (Claude 보충) |
| `4.1.bounty.q1.header` | Q1. 어느 쪽이 기준에 못 미쳤나요? | — | 규칙-바운티 (Claude 수정) |
| `4.1.bounty.q2.header` | Q2. 원인이 된 요인을 모두 고르세요. | — | 규칙-바운티 (Claude 수정) |
| `4.1.bounty.q2.cohort` | 환자 코호트(이번 시험에 모인 참여자 무리) 흔들림 | — | BOUNTY_FACTOR_LABEL.cohort_noise (Claude 보충 — Gemini 가 Q2 머리에 넣은 풀이를 선택지 이름표로 옮김) |
| `4.1.bounty.q3.header` | Q3. 다음에 무엇을 바꿀지 하나 고르세요. | — | 규칙-바운티 · TrialBountyRequest.remedy (Claude 수정) |
| `4.1.bounty.text.placeholder` | 결과의 숫자를 근거로 무엇이 문제였고 다음에 무엇을 바꿀지 써 주세요({min}~{max}자). | `{min}` · `{max}` | COPY.bountyText · 규칙-바운티 (Claude 수정) |
| `4.1.bounty.submit.label` | 원인 분석 내기 | — | 규칙-바운티 (Claude 수정) |
| `4.1.bounty.result.ok` | 분석이 맞았어요. {crista}를 돌려받았어요. | `{crista}` | COPY.bountyOk · 규칙-바운티 (Claude 수정) (일관성 수정) |
| `4.1.bounty.result.no` | 아직 맞지 않아요. 힌트를 보고 60초 뒤에 다시 내 보세요. | — | COPY.bountyNo · 규칙-바운티 (Claude 수정) |
| `4.1.bounty.block.operational` | 운영 문제(모집 · 탈락)로 보류된 시험은 바운티 대상이 아니에요. | — | COPY.bountyOperational · 규칙-바운티 (Claude 수정) |
| `4.1.bounty.block.claimed` | 이 시도의 바운티는 이미 받았어요. | — | 규칙-바운티 (Claude 수정) |
| `4.1.ai.badge` | AI 시뮬레이션 · 교육용 | — | F41-④ (Claude 수정) |
| `4.1.ai.notice` | 이 결과는 실제 사람에게 시험한 것이 아니에요. 우리 약의 계산값으로 AI(Claude)가 만든 교육용 시뮬레이션이에요. | — | COPY.aiNotice · F41-④ |
| `4.1.ai.verdictNote` | 통과 · 보류 판정도 AI 시뮬레이션이 정해요. 서버가 숫자의 앞뒤가 맞는지 검사해요. | — | F41 설계 원칙 예외 (Claude 보충) |
| `4.1.ai.teacherOverride` | 선생님이 판정을 정했어요. 숫자 표는 그 판정에 맞춰 규칙으로 만든 교육용 표예요. | — | F41-④ · resultSource 'teacher' (Claude 수정) |
| `4.1.ladder.refProb` | 참고 통과 확률 {refProb}% — 목표 인원을 채웠다고 보고, 흔들림 전 예상치와 참고 기준으로 계산한 교육용 값이에요. | `{refProb}`(새) | PhaseLadderView.refPassProb · server refProbAt(목표 인원 기준) (Claude 보충) (검증 수정) |
| `4.1.ladder.estimateNote` | 흔들림 전 예상치 | — | §6.1(화면마다 '흔들림 전 예상치'라 적음) (Claude 보충) |
| `4.1.viz.701.title` | 세 관문 허들 | — | 시안 7.01 |
| `4.1.viz.701.read` | 1상 · 2상 · 3상의 참고 기준을 높이가 다른 허들로 그리고, 우리 약의 E · S 막대가 넘는지 봐요(1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 그리고 S ≥ 55). 관문이 올라갈수록 기간과 비용이 두 배씩 커져요. | — | 시안 7.01 · 규칙-판정(참고) (Claude 수정) |
| `4.1.viz.702.title` | 흔들림 띠 | — | 시안 7.02 |
| `4.1.viz.702.read` | 예상값 둘레로 나올 수 있는 흔들림을 점으로 찍었어요(1 · 2상 ±6 의 13가지, 3상 ±4 의 9가지). 기준선을 넘는 점을 세면 참고 통과 확률이 나와요. 예상값이 기준에서 멀수록(여유가 클수록) 흔들려도 통과해요. 목표 인원보다 적게 모아 시작하면 흔들림 폭이 더 넓어져요. | — | 시안 7.02 · 규칙-판정(참고) · server referenceFor(흔들림 폭 × √(목표/인원)) (Claude 수정) (검증 수정) |
| `4.1.viz.703.title` | 100번 굴려 보기 | — | 시안 7.03 |
| `4.1.viz.703.read` | 같은 약으로 같은 임상을 참고 규칙으로 100번 해 보고, 몇 번 통과했는지 막대로 세어 봐요. 한 번의 통과나 보류에는 운이 섞여 있어요. | — | 시안 7.03 · 규칙-판정(참고) (Claude 수정) (검증 수정) |
| `4.1.viz.704.title` | 여유와 확률 | — | 시안 7.04 |
| `4.1.viz.704.read` | 가로축은 여유(예상값 − 기준), 세로축은 참고 통과 확률이에요. 여유가 0 이면 절반을 조금 넘고(13가지 중 7 · 9가지 중 5), 여유가 흔들림 폭 이상이면 늘 통과해요. 슬라이더로 여유를 옮겨 보세요. | — | 시안 7.04 · 규칙-판정(참고) (Claude 수정) |
| `4.1.viz.705.title` | E · S 궤적 | — | 시안 7.05 (일관성 수정) |
| `4.1.viz.705.read` | 효능 E × 안전 S 평면에 관문별 참고 통과 영역과 제형 · 용량 9가지 점을 그렸어요. 용량을 내리면 보통 효능은 조금 줄고 안전은 크게 늘어요. 모든 관문을 넘는 오른쪽 위 자리를 찾아보세요. | — | 시안 7.05 (Claude 수정) (검증 수정) |
| `4.1.viz.706.title` | 보류 뒤 갈림길 | — | 시안 7.06 (일관성 수정) |
| `4.1.viz.706.read` | 보류 뒤 고를 수 있는 세 경로('같은 프로토콜로 다시' · '용량 · 제형 바꾸기(IND 변경)' · '백업 후보로 교체(새 IND)')의 비용 · 기간 · 참고 통과 확률을 나란히 놓아요. 원인을 찾아 바꾸면 무작정 다시 할 때보다 통과 가능성이 커져요. 경로마다 드는 돈과 시간이 다르니 함께 견줘 보세요. | — | 시안 7.06 · F41 (Claude 수정) (검증 수정) (일관성 수정) |
| `4.1.viz.707.title` | 임상 간트 | — | 시안 7.07 |
| `4.1.viz.707.read` | IND 승인부터 모집 · 1상 · 2상 · 3상 · 재시험까지를 날짜 눈금 위 막대로 그렸어요. 3상 한 번({days}게임 일)이 가장 길어요. 보류 한 번은 다시 모으는 기간과 그 상 기간만큼 일정을 늘려요. | `{days}` | 시안 7.07 · F41-② (Claude 수정) |
| `4.1.viz.708.title` | 연구비 계단 | — | 시안 7.08 |
| `4.1.viz.708.read` | 임상을 시작할 때와 모집에 돈을 쓸 때마다 연구비가 계단처럼 내려가요. 보류된 상의 계단은 빨갛게 표시해요. 연구비 대부분이 임상에서 쓰인다는 것을 볼 수 있어요. | — | 시안 7.08 · FundingStepView (Claude 수정) |
| `4.1.viz.709.title` | 환자 수 아이콘 | — | 시안 7.09 |
| `4.1.viz.709.read` | 아이콘 하나가 20명이에요. 실제 임상의 대략 규모(1상 건강인 수십 명 → 2상 환자 수백 명 → 3상 환자 수백~수천 명)를 보여 줘요. 단계가 오를수록 사람이 많아지고, 사람이 많을수록 결과가 덜 흔들려요. | — | 시안 7.09 (Claude 수정) (검증 수정) |
| `4.1.viz.709.gameNote` | 게임의 목표 인원은 수업에 맞춰 줄인 규모예요. | — | 규칙-상별 (Claude 보충) |
| `4.1.viz.709.source` | 출처: 미국 FDA 'The Drug Development Process · Step 3: Clinical Research' 안내(대략값) | — | 시안 7.09 |
| `4.1.viz.710.title` | 100개 중 10개 | — | 시안 7.10 |
| `4.1.viz.710.read` | 실제로 1상에 들어간 후보 100개가 어느 단계에서 멈추는지 칸 100개로 칠했어요. 허가까지 가는 것은 약 10개예요. 가장 큰 벽은 효과를 처음 증명하는 2상이에요. | — | 시안 7.10 (Claude 수정) |
| `4.1.viz.710.source` | 출처: BIO · Biomedtracker · Amplion, Clinical Development Success Rates 2006–2015 (2016) — 1상에서 허가까지 9.6% | — | 시안 7.10 |

행 수: 157(Gemini 136행 모두 유지 · Claude 보충 21행). Gemini 행 가운데 (Claude 수정) 107행.

독립 검증(2차) 뒤: 161행(검증 보충 4행 더함). (검증 수정) 20행 · (검증 보충) 4행 — 무엇을 왜 고쳤는지는 `review.md` '## 독립 검증(2차)'.

## 메모

- `{cost}` 는 기존 COPY 처럼 두 뜻(상 비용 · 모집 하루 비용)으로 쓰인다. 키가 달라 충돌은 없지만, 코드에 넣을 때 키마다 무엇을 넣는지 확인한다.
- `{min}` · `{max}` 도 모집(최소 인원)과 바운티(글자 수)에서 다른 뜻이다. 기존 COPY 그대로라 이름은 두었다.
- 화면 라벨(제형 `{form}`)은 `oral` 같은 식별자가 아니라 '경구 · 정맥주사 · 경피 패치' 한국어 이름을 넣는다.
