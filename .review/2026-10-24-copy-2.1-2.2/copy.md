# 학생용 문구 — 2.1 분자 도킹 · 2.2 ADMET (정리본)

- 출처: Gemini 4 Argon (High) 원문 [`gemini-raw.md`](gemini-raw.md)(지시문 [`prompt.md`](prompt.md)) → Claude 검토 · 수정([`review.md`](review.md))
- 날짜: 2026-10-24
- 상태: **초안 — 코드 반영은 8b 통합 뒤**. 식별자 · 규칙 값은 `packages/web-contract/src/selection.ts` 를 따른다.
- 표시: 근거 칸 끝 '(Claude 수정)' = Gemini 문구를 고친 줄, '(Claude 보충)' = 빠진 범위를 Claude 가 채운 줄, '(검증 수정)' · '(검증 보충)' = 독립 검증(2차)이 고치거나 보탠 줄. 표시가 없는 줄은 Gemini 원문 그대로다.
- 자리표시자 약속: `{cost}` · `{unitCost}` 는 마지막 점검에서 '단위까지 든 글'로 바꿨다(아래 '돈 자리표시자'). ΔG 값(`{dG}` · `{refDG}` · `{p0}` …)은 부호 포함 소수 둘째 자리, `{gap}` 은 양수 크기.
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `2.1-2.2.s21.intro.title` | 2.1 분자 도킹 — 표적 주머니에 잘 맞는지 끼워 보기 | — | §5.6 · §6.1 |
| `2.1-2.2.s21.intro.body` | 분자 도킹(단백질 주머니에 분자를 끼워 보는 컴퓨터 계산)으로 후보 분자가 얼마나 단단히 붙는지 예측해요. ΔG(결합 자유 에너지 — 더 음수일수록 단단히 붙어요)를 기준 약과 견주어 보세요. 구조를 조금 고쳐 다시 도킹해 볼 수도 있어요. 결과 읽기 도구 3종으로 살펴본 뒤 2.2 로 보낼 분자를 골라 담아 주세요. | — | §5.6 · §6.1 · §10 (Claude 수정) |
| `2.1-2.2.s21.intro.done` | 이 표적에서 실제 도킹 결과를 1건 이상 얻으면 2.1이 완료돼요. 2.2 ADMET을 실행하려면 오른쪽 2.2 대기열에 분자를 1개 이상 담아야 해요. | — | §5.6 · §6.1 |
| `2.1-2.2.s21.intro.cost` | 도킹 1건마다 연구비 {cost}가 들어요. | `{cost}` | §5.6 · §6.1 (Claude 수정) (일관성 수정) |
| `2.1-2.2.s21.empty` | 아직 도킹을 끝낸 분자가 없어요. 도킹 결과가 나오면 결과 읽기 도구 3종이 열려요. | — | §5.6 · `SELECTION_COPY.s21.empty` |
| `2.1-2.2.s21.tabs.gauge` | 수심계 눈금 | — | §5.6 · 3.05 · `SELECTION_COPY.s21.tabs.gauge` |
| `2.1-2.2.s21.gauge.q` | 우리 후보는 점수가 매겨지는 구간(p 0~1) 안에 있나요? 기준 약보다 더 깊은 곳에 있나요? | — | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeQ` |
| `2.1-2.2.s21.gauge.note` | 눈금 아래로 내려갈수록(ΔG 가 더 음수일수록) 표적에 단단히 붙어요. 점선 두 줄(p = 0 선 · p = 1 선) 사이에서만 결합력 점수 p 가 0 에서 1 로 바뀌어요. 우리 모둠원이 도킹한 분자는 담당자 잉크 점으로 찍혀요. | — | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeNote` (Claude 수정) |
| `2.1-2.2.s21.gauge.axis` | 결합 자유 에너지 ΔG 세로 눈금 (0 ~ −14 kcal/mol) | — | §5.6 · 3.05 (검증 수정) |
| `2.1-2.2.s21.gauge.histamine` | 히스타민 — 작아서 헐렁하게 붙는 분자 | — | §5.6 · 3.05 (Claude 수정) |
| `2.1-2.2.s21.gauge.p0` | p = 0 선 ({p0} kcal/mol, 기준 + 4.5) — 이보다 얕으면 결합력 점수 0 | `{p0}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeP0` |
| `2.1-2.2.s21.gauge.median` | 이 표적 라이브러리 {count}종의 가운데값 ({median} kcal/mol) | `{count}` (새) · `{median}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeMedian` (Claude 수정) |
| `2.1-2.2.s21.gauge.ref` | 기준 약 ({refDG} kcal/mol) — 실제 환자에게 쓰이는 약 | `{refDG}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeRef` |
| `2.1-2.2.s21.gauge.p1` | p = 1 선 ({p1} kcal/mol, 기준 − 0.5) — 이보다 깊으면 결합력 만점 | `{p1}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeP1` |
| `2.1-2.2.s21.gauge.top` | 이 표적 라이브러리 {count}종 중 1위 ({top} kcal/mol) | `{count}` (새) · `{top}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeTop` (Claude 수정) |
| `2.1-2.2.s21.gauge.legend` | 잉크 점 = 우리 모둠이 도킹한 분자(담당자 색) · 점선 = p = 0 선 · 기준 약 · p = 1 선 | — | §5.6 · 3.05 (Claude 수정) |
| `2.1-2.2.s21.tabs.cards` | 점수 카드 | — | §5.6 · 3.09 · `SELECTION_COPY.s21.tabs.cards` |
| `2.1-2.2.s21.cards.q` | 도킹 점수는 높은데 원래 다른 병을 고치려고 만든 약은 아닌가요? | — | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsQ` |
| `2.1-2.2.s21.cards.note` | 도킹 점수는 컴퓨터가 계산한 예측값이지 실제 실험으로 잰 값이 아니에요. 점수가 1위라도 그 분자의 출신(원래 겨냥한 표적과 기전)을 함께 확인해야 해요. | — | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsNote` |
| `2.1-2.2.s21.cards.band` | 도킹 {rank}위지만 원래 {mech} 약 | `{rank}` · `{mech}` | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsBand` |
| `2.1-2.2.s21.cards.fields` | 구조식 · ΔG · 결합력 p · 출신(원래 겨냥한 표적) · 담당자 · 부모 분자 | — | §5.6 · 3.09 점수 카드 칸 이름 (검증 보충) |
| `2.1-2.2.s21.cards.stamp` | 점수 1위 ≠ 주력 후보 | — | §5.6 · 3.09 (일관성 수정) |
| `2.1-2.2.origin.this` | 이 표적을 겨냥해 만든 계열 | — | §5.6 · 3.09 · `SELECTION_COPY.origin.this` |
| `2.1-2.2.origin.other` | 다른 표적 · 다른 병의 약 | — | §5.6 · 3.09 · `SELECTION_COPY.origin.other` |
| `2.1-2.2.origin.unknown` | 출신을 모르는 분자(직접 그린 구조) | — | §5.6 · 3.09 · `SELECTION_COPY.origin.unknown` |
| `2.1-2.2.origin.variant` | 변형체(부모 분자에서 구조를 고침) | — | §5.6 · 3.09 · `SELECTION_COPY.origin.variant` |
| `2.1-2.2.s21.tabs.stairs` | 10배 계단 | — | §5.6 · 3.07 · `SELECTION_COPY.s21.tabs.stairs` |
| `2.1-2.2.s21.stairs.q` | ΔG 가 0.7 kcal/mol 다르면 주머니 절반을 채우는 농도는 몇 배 달라질까요? ‘조금 약한’ 후보는 농도가 얼마나 더 필요할까요? | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsQ` (검증 수정) |
| `2.1-2.2.s21.stairs.note` | 실온(298 K, 약 25 °C)에서 ΔG 가 1.36 kcal/mol 더 음수가 될 때마다 표적 주머니 절반을 채우는 데 필요한 농도가 10배 줄어요. '배수 = 10^(ΔΔG ÷ 1.364)'(ΔΔG = 두 분자의 ΔG 차이)로 기준 약과 몇 배 차이인지 계단에서 읽어 보세요. | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsNote` (Claude 수정 · 검증 수정) (일관성 수정) |
| `2.1-2.2.s21.stairs.axis` | 세로축: 해리 상수 Kd(표적 주머니 절반을 채우는 농도, 로그 눈금) | — | §5.6 · 3.07 |
| `2.1-2.2.s21.stairs.bands` | 농도 구간: 몰(M) ~ 밀리몰(mM) · 마이크로몰(µM) · 나노몰(nM) · 피코몰(pM) | — | §5.6 · 3.07 |
| `2.1-2.2.s21.stairs.pick` | 기준 약과 견줄 분자 | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsPick` |
| `2.1-2.2.s21.stairs.lineStronger` | 기준 약보다 {gap} kcal/mol 더 깊어요. 주머니 절반을 채우는 데 필요한 농도가 약 {fold}배 낮아요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsLine` (Claude 수정) |
| `2.1-2.2.s21.stairs.lineWeaker` | 기준 약보다 {gap} kcal/mol 더 얕아요. 주머니 절반을 채우려면 약 {fold}배 더 높은 농도가 필요해요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsLine` (Claude 수정) |
| `2.1-2.2.s21.tabs.edit` | 구조 바꿔 다시 도킹 | — | §10 · `SELECTION_COPY.s21.tabs.edit` |
| `2.1-2.2.s21.edit.chip.acetamido` | 방향족 아민 → 아세트아마이드 | — | §10 |
| `2.1-2.2.s21.edit.chip.cyano` | 니트로 → 시아노 | — | §10 |
| `2.1-2.2.s21.edit.chip.amide` | 염기성 아민 → 아마이드 | — | §10 |
| `2.1-2.2.s21.edit.chip.hydroxy` | 하이드록시 도입 | — | §10 |
| `2.1-2.2.s21.edit.chip.fluorine` | 플루오린 도입 | — | §10 |
| `2.1-2.2.s21.edit.chip.demethoxy` | 메톡시 제거 | — | §10 |
| `2.1-2.2.s21.edit.chipReady` | 작용기(분자의 성질을 결정하는 원자 묶음) 칩 자동 변환은 아직 준비 중이에요. 지금은 아래 SMILES 칸을 직접 고쳐서 물성 미리보기와 재도킹을 쓸 수 있어요. | — | §10 |
| `2.1-2.2.s21.edit.smilesGuide` | 원본 분자의 SMILES(분자 구조를 글자로 적은 식)를 조금 고쳐 새로운 변형체를 만들어 보세요. | — | §10 |
| `2.1-2.2.s21.edit.preview` | 무료 물성 미리보기 — 도킹하기 전에 바뀐 분자의 물성과 위험 신호를 무료로 먼저 확인해요. | — | §10 (Claude 수정) |
| `2.1-2.2.s21.edit.previewLimit` | 무료 물성 미리보기는 우리 모둠 전체에서 1분에 20회까지 쓸 수 있어요. | — | §10 |
| `2.1-2.2.s21.edit.redockCost` | 미리보기를 마친 변형체를 다시 도킹하면 도킹 1회 비용({cost})이 들어요. | `{cost}` | §5.6 · §10 (일관성 수정) |
| `2.1-2.2.s21.edit.compare` | 원본 · 변형체 비교표 — 모둠원이 도킹한 모든 분자의 담당자 · 직책 · ΔG · 기준 대비 결합력 · 물성 · 위험 신호 · 부모 분자를 한눈에 견주어 봐요. | — | §10 |
| `2.1-2.2.s21.retro.title` | 찜 회고 | — | §5.5.1 · `SELECTION_COPY.s21.retroTitle` |
| `2.1-2.2.s21.retro.line` | 1.2 결합 예측 상위 {n}개를 그대로 찜했다면 평균 ΔG {topMean} kcal/mol · 우리 모둠이 찜한 분자 평균 ΔG {ourMean} kcal/mol (사전 계산값) | `{n}` · `{topMean}` · `{ourMean}` | §5.5.1 · `SELECTION_COPY.s21.retroLine` |
| `2.1-2.2.s21.retro.rank` | {of}개 중 {rank}위 | `{rank}` · `{of}` | §5.5.1 · `SELECTION_COPY.s21.retroRank` (Claude 수정) |
| `2.1-2.2.s21.retro.notDocked` | 아직 도킹 안 함 | — | §5.5.1 · `SELECTION_COPY.s21.retroNotDocked` |
| `2.1-2.2.s21.queue.title` | 2.2 대기열 | — | §5.6 · `SELECTION_COPY.s21.queueTitle` |
| `2.1-2.2.s21.queue.sub` | {n} / {max}개 · 1인 {per}개 한도 | `{n}` · `{max}` · `{per}` | §5.6 · `SELECTION_COPY.s21.queueSub` |
| `2.1-2.2.s21.queue.mine` | 내가 담은 분자 {n} / {per}개 | `{n}` · `{per}` | §5.6 · `SELECTION_COPY.s21.pickMine` (Claude 수정) |
| `2.1-2.2.s21.queue.cost` | 대기열 {n}개를 모두 2.2 ADMET 로 보면 예상 비용은 {cost}예요(분자 1개당 {unitCost}). | `{n}` · `{cost}` · `{unitCost}` (새) | §5.6 · `SELECTION_COPY.s21.queueCost` (Claude 수정) (일관성 수정) |
| `2.1-2.2.s21.queue.empty` | 아직 대기열에 담은 분자가 없어요. 왼쪽 결과 읽기 도구 3종으로 살펴보고 근거 칩을 골라 담아 보세요. | — | §5.6 · `SELECTION_COPY.s21.queueEmpty` |
| `2.1-2.2.s21.pick.from` | 담을 분자 | — | §5.6 · `SELECTION_COPY.s21.pickFrom` |
| `2.1-2.2.s21.pick.legend` | 담는 근거 칩 고르기 | — | §5.6 · `SELECTION_COPY.s21.pickLegend` |
| `2.1-2.2.s21.pick.button` | 2.2 대기열에 담기 | — | §5.6 · `SELECTION_COPY.s21.pickButton` |
| `2.1-2.2.s21.pick.remove` | 빼기 | — | §5.6 · `SELECTION_COPY.s21.remove` |
| `2.1-2.2.s21.pick.refNote` | 기준 약은 대기열에 넣지 않아도 2.2 표에 비교용으로 자동으로 붙어요(비용 없음). | — | §5.6 · `SELECTION_COPY.s21.pickRef` (Claude 수정) |
| `2.1-2.2.s21.pick.limitOrder` | 한 사람당 {per}개, 모둠 전체에서 최대 {max}개까지 담을 수 있어요. 더 담으려면 먼저 담긴 분자를 빼 주세요. | `{per}` · `{max}` | §5.6 (Claude 수정) |
| `2.1-2.2.unknownReason` | 고를 수 있는 근거 칩이 아니에요. 목록에 있는 근거 칩을 하나 골라 주세요. | — | §5.6 · §5.7 · `SELECTION_COPY.unknownReason` |
| `2.1-2.2.dockReason.stronger_than_ref.label` | 기준 약보다 단단히 붙어요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.stronger_than_ref` |
| `2.1-2.2.dockVerdict.stronger_than_ref.ok` | 내 분자 ΔG({dG} kcal/mol)가 기준 약({refDG} kcal/mol)보다 깊거나 같아 대기열에 담을 수 있어요. | `{dG}` · `{refDG}` | §5.6 · `SELECTION_COPY.dockVerdict.strongerOk` |
| `2.1-2.2.dockVerdict.stronger_than_ref.block` | 기준 약보다 {gap} kcal/mol 약해요. 10배 계단으로 보면 약 {fold}배 더 높은 농도가 필요해요. 수심계 눈금과 10배 계단을 다시 확인해 보세요. | `{gap}` · `{fold}` | §5.6 · 3.05 · 3.07 · `SELECTION_COPY.dockVerdict.strongerBlock` (Claude 수정) |
| `2.1-2.2.dockReason.within_10x.label` | 기준 약과 10배 차이 안이에요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.within_10x` |
| `2.1-2.2.dockVerdict.within_10x.ok` | 기준 약과 ΔG 차이가 {gap} kcal/mol로 10배 문턱(1.36 kcal/mol) 안이라 담을 수 있어요. | `{gap}` | §5.6 · 3.07 · `SELECTION_COPY.dockVerdict.within10Ok` — 기준 약보다 얕거나 같을 때만 씀 (검증 수정) |
| `2.1-2.2.dockVerdict.within_10x.okStronger` | 기준 약보다 {gap} kcal/mol 더 깊어요. 기준 약보다 약하지 않으니 10배 문턱(1.36 kcal/mol)에 걸리지 않아 담을 수 있어요. | `{gap}` | §5.6 · 3.07 · `SELECTION_COPY.dockVerdict.within10Ok` — 기준 약보다 깊을 때 (검증 보충) |
| `2.1-2.2.dockVerdict.within_10x.block` | 기준 약보다 {gap} kcal/mol 약해요. 약 {fold}배 차이라 10배(1.36 kcal/mol)를 넘어요. 10배 계단을 다시 살펴보세요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.dockVerdict.within10Block` (Claude 수정) |
| `2.1-2.2.dockReason.target_series.label` | 이 표적을 겨냥해 만든 계열이에요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.target_series` |
| `2.1-2.2.dockVerdict.target_series.ok` | 이 표적을 겨냥해 만든 분자(또는 그 부모에서 고친 변형체)가 맞아서 담을 수 있어요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.seriesOk` |
| `2.1-2.2.dockVerdict.target_series.blockOther` | 이 분자는 다른 표적 · 다른 병을 겨냥해 만든 약이에요. 점수 카드 도구에서 이 분자의 출신 표시를 다시 확인해 보세요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.seriesOther` |
| `2.1-2.2.dockVerdict.target_series.blockUnknown` | 라이브러리에 없는 분자라 어느 표적 계열에서 왔는지 알 수 없어요. 점수 카드 도구의 출신 칸을 확인하고 다른 근거 칩을 골라 보세요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.seriesUnknown` |
| `2.1-2.2.dockReason.p_mid.label` | 결합력 점수가 중간 이상이에요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.p_mid` |
| `2.1-2.2.dockVerdict.p_mid.ok` | 결합력 점수 p가 {p}로 중간 기준(0.5) 이상이라 담을 수 있어요. | `{p}` | §5.6 · 3.05 · `SELECTION_COPY.dockVerdict.pOk` |
| `2.1-2.2.dockVerdict.p_mid.block` | 결합력 점수 p가 {p}로 중간 기준(0.5)보다 낮아요. 수심계 눈금이나 점수 카드에서 p 값을 다시 확인해 보세요. | `{p}` | §5.6 · 3.05 · 3.09 · `SELECTION_COPY.dockVerdict.pBlock` |
| `2.1-2.2.dockReason.improved_variant.label` | 구조를 바꿔 더 좋아졌어요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.improved_variant` |
| `2.1-2.2.dockVerdict.improved_variant.ok` | 구조를 바꾼 뒤 부모 분자보다 ΔG가 {gain} kcal/mol 더 깊어져서 담을 수 있어요. | `{gain}` | §5.6 · §10 · `SELECTION_COPY.dockVerdict.variantOk` |
| `2.1-2.2.dockVerdict.improved_variant.blockNot` | 구조를 고쳐 만든 변형체가 아니에요(부모 분자가 없어요). 점수 카드나 원본 · 변형체 비교표를 다시 확인해 보세요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.variantNot` |
| `2.1-2.2.dockVerdict.improved_variant.blockWorse` | 변형체 ΔG({dG} kcal/mol)가 부모 분자({parentDG} kcal/mol)보다 더 깊어지지 않았어요. 원본 · 변형체 비교표에서 두 값을 다시 견주어 보세요. | `{dG}` · `{parentDG}` | §5.6 · §10 · `SELECTION_COPY.dockVerdict.variantWorse` |
| `2.1-2.2.dockReason.different_series.label` | 다른 모둠원과 다른 계열이라서 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.different_series` |
| `2.1-2.2.dockVerdict.different_series.ok` | 대기열에 다른 계열이 섞여 있어서 담을 수 있어요. | — | §5.6 · `SELECTION_COPY.dockVerdict.diffFirst` · `diffOk` (Claude 수정) |
| `2.1-2.2.dockVerdict.different_series.warnParent` | 담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 부모 분자 계열이에요. 점수 카드에서 출신과 부모 분자를 한 번 더 확인해 보세요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.diffSameParent` |
| `2.1-2.2.dockVerdict.different_series.warnLib` | 담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 라이브러리({lib})에서 왔어요. 점수 카드에서 출신을 다시 살펴보세요. | `{lib}` | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.diffSameLibrary` |
| `2.1-2.2.confirmOther.title` | 다른 병을 겨냥한 약이에요 | — | §5.6 · 3.09 · `SELECTION_COPY.confirmOther.title` |
| `2.1-2.2.confirmOther.body` | 도킹 점수는 예측이에요. 이 분자는 원래 {mech} 약이에요(도킹 {rank}위). 그래서 우리 표적의 주력 후보가 되기 어려워요. 이미 알려진 물질이라 3.1 물질특허도 받을 수 없어요. | `{rank}` · `{mech}` | §5.6 · 3.09 · `SELECTION_COPY.confirmOther.body` (Claude 수정) (일관성 수정) |
| `2.1-2.2.confirmOther.ok` | 알고도 대기열에 담기 | — | §5.6 · `SELECTION_COPY.confirmOther.ok` |
| `2.1-2.2.known.chip21` | 특허를 받으려면 구조를 바꿔야 해요 | — | §5.6 |
| `2.1-2.2.known.chip22` | 특허 불가 — 변형체 필요 | — | §5.7 · `SELECTION_COPY.known.chip` |
| `2.1-2.2.known.approved` | 이미 승인된 약(ChEMBL 승인약) | — | §5.6 · `SELECTION_COPY.known.approved` |
| `2.1-2.2.known.zinc` | 이미 알려진 물질(ZINC 소형) | — | §5.6 · `SELECTION_COPY.known.zinc` |
| `2.1-2.2.known.reference` | 기준 리간드(표적 결정구조에 들어 있던 기준 분자) | — | §5.6 · `SELECTION_COPY.known.reference` |
| `2.1-2.2.known.hint` | 세상에 이미 알려진 물질이라 그대로는 3.1 물질특허(새로운 화학 물질 자체에 주는 특허)를 받을 수 없어요. 특허를 받으려면 구조를 바꾼 변형체가 필요해요. | — | §5.6 · §5.7 · `SELECTION_COPY.known.hint` |
| `2.1-2.2.confirmKnown.title` | 이미 세상에 알려진 물질이에요 | — | §5.6 · §5.7 · `SELECTION_COPY.confirmKnown.title` |
| `2.1-2.2.confirmKnown.body` | 이 분자는 이미 알려진 물질(ChEMBL 승인약 · ZINC 소형 · 기준 리간드)이라 그대로는 3.1 물질특허를 받을 수 없어요. 구조를 바꾼 변형체를 함께 준비해 보세요. | — | §5.6 · §5.7 · `SELECTION_COPY.confirmKnown.body` |
| `2.1-2.2.confirmKnown.ok` | 알고 담기 | — | §5.6 · §5.7 · `SELECTION_COPY.confirmKnown.ok` |
| `2.1-2.2.s22.intro.title` | 2.2 ADMET 예측 · 특허 후보 고르기 | — | §5.7 · §6.1 |
| `2.1-2.2.s22.intro.body` | 단단히 붙는 분자라도 몸속에서 잘 흡수되고 위험한 독성이 없어야 진짜 약이 될 수 있어요. ADMET(흡수 · 분포 · 대사 · 배설 · 독성)을 예측하고 리드 읽기 도구 4종으로 분자마다 약점을 찾아보세요. 그런 뒤 3.1 물질특허에 출원할 특허 후보를 근거 칩과 함께 골라 올려 주세요. | — | §5.7 · §6.1 |
| `2.1-2.2.s22.intro.done` | 특허 후보를 1개 이상 올리면 2.2 가 완료돼요. 주력 · 백업 후보는 3.2 전임상 · 동물실험 끝에서 결과를 보고 정해요. | — | §5.7 · §6.1 (Claude 수정) (일관성 수정) |
| `2.1-2.2.s22.tabs.run` | ADMET 실행 | — | §5.7 · `SELECTION_COPY.s22.tabs.run` |
| `2.1-2.2.s22.run.hint` | 2.1 대기열에 담아 둔 분자만 ADMET 를 돌릴 수 있어요. 분자 1개당 {cost}가 들어요. | `{cost}` | §5.6 · §5.7 · `SELECTION_COPY.s22.runHint` (Claude 수정) (일관성 수정) |
| `2.1-2.2.s22.run.empty` | 2.1에서 분자를 골라 주세요 | — | §5.6 · §5.7 · `SELECTION_COPY.s22.runEmpty` |
| `2.1-2.2.s22.run.button` | ADMET 예측 실행 | — | §5.7 · `SELECTION_COPY.s22.runButton` |
| `2.1-2.2.s22.run.done` | 이미 ADMET을 실행했어요 | — | §5.7 · `SELECTION_COPY.s22.runDone` |
| `2.1-2.2.s22.reference` | 기준 약(비교용 자동 첨부 · 무료) | — | §5.6 · §5.7 · `SELECTION_COPY.s22.reference` |
| `2.1-2.2.s22.preShake` | 흔들림 전 예상치 — 실제 임상 결과는 흔들림(시험마다 무작위로 생기는 차이) 때문에 이 값과 달라질 수 있어요. | — | §5.7 · §5.14 · `SELECTION_COPY.s22.preShake` (Claude 수정 · 검증 수정) |
| `2.1-2.2.s22.ai.title` | ADMET-AI 레이더 (참고 · AI 예측) | — | §5.7 · `SELECTION_COPY.s22.aiTitle` |
| `2.1-2.2.s22.ai.note` | 이 패널은 AI가 예측한 참고 자료예요. 근거 칩 판정이나 점수 계산에는 쓰지 않아요. | — | §5.7 · `SELECTION_COPY.s22.aiNote` |
| `2.1-2.2.s22.tabs.radar` | 물성 레이더 | — | §5.7 · 4.02 · `SELECTION_COPY.s22.tabs.radar` |
| `2.1-2.2.s22.radar.q` | 이 분자의 약점은 여섯 축 가운데 어느 축인가요? | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarQ` |
| `2.1-2.2.s22.radar.note` | 분홍 띠는 먹는 약이 흔히 있는 물성 범위예요(참고). 띠 안쪽이나 바깥쪽으로 벗어난 축이 그 분자의 약점이에요. | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarNote` (Claude 수정) |
| `2.1-2.2.s22.radar.axes` | 지용성 cLogP(기름에 녹는 정도, −0.7~5) · 크기 MW(분자량, 150~500) · 극성 TPSA(물과 친한 표면 넓이, 20~130) · 유연성 RotB(빙글 돌 수 있는 결합 수, ≤9) · 수소결합 주개 HBD(수소결합에서 수소를 내주는 자리 수, ≤5) · 수소결합 받개 HBA(수소결합에서 수소를 받는 자리 수, ≤10) | — | §5.7 · 4.02 (검증 수정) |
| `2.1-2.2.s22.radar.allIn` | 여섯 축 모두 분홍 띠 안에 있어요 | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarAllIn` |
| `2.1-2.2.s22.radar.out` | 분홍 띠 밖 {n}곳: {axes} | `{n}` · `{axes}` | §5.7 · 4.02 · `SELECTION_COPY.s22.radarOut` |
| `2.1-2.2.s22.tabs.lights` | 신호등 표 | — | §5.7 · 4.03 · `SELECTION_COPY.s22.tabs.lights` |
| `2.1-2.2.s22.lights.q` | 표적에는 잘 붙는데 빨간 위험 신호(■)가 켜진 분자는 어느 것인가요? | — | §5.7 · 4.03 · `SELECTION_COPY.s22.lightsQ` |
| `2.1-2.2.s22.lights.note` | 대기열 분자와 기준 약을 한 줄씩 놓고 결합력 p · 신호 5개 · 효능 E · 안전 S 를 견주어 봐요. E · S 는 경구(입으로 먹는 약) 50 mg · 첫 환자군 기준의 흔들림 전 예상치예요. 신호는 물성 규칙으로 빠르게 거르는 망이라 실제 실험과 다를 수 있어요. | — | §5.7 · 4.03 (Claude 수정 · 검증 수정) |
| `2.1-2.2.s22.lights.cols` | 결합력 p · 경구 흡수 · 뇌 노출 · 심장 hERG(심장 박동 리듬을 맞추는 칼륨 통로) 위험 · 간독성 · 경피 투과(피부를 지나 들어가는 정도) · 효능 E · 안전 S(흔들림 전 예상치) | — | §5.7 · 4.03 (Claude 수정 · 검증 수정) |
| `2.1-2.2.s22.lights.levels` | ● 좋아요(흡수 좋음 · 뇌 노출 높음(CNS 표적일 때) · 경피 적합 · 위험 낮음) · ▲ 보통 · ■ 나빠요(흡수 나쁨 · 뇌 노출 낮음(CNS 표적일 때) · 경피 부적합 · 위험 높음) | — | §5.7 · 4.03 (Claude 수정 · 검증 수정) |
| `2.1-2.2.s22.tabs.trip` | 몸속 여행 지도 | — | §5.7 · 4.04 · `SELECTION_COPY.s22.tabs.trip` |
| `2.1-2.2.s22.trip.q` | 이 분자는 우리 몸 어디를 지나면서 효능을 잃거나 안전 점수가 깎이나요? | — | §5.7 · 4.04 · `SELECTION_COPY.s22.tripQ` |
| `2.1-2.2.s22.trip.note` | 분자 하나를 골라 입에서 표적과 장기까지 이동하는 길을 따라가 봐요. 화살표 굵기는 그 길로 지나가는 약의 양(계산값)을 뜻해요. 장기마다 효능 E와 안전 S(흔들림 전 예상치)가 얼마나 깎이는지 보여 줘요. | — | §5.7 · 4.04 (검증 수정) |
| `2.1-2.2.s22.trip.organs` | 입(먹어요) → 장(흡수 A — 피로 넘어가요) → 피(온몸을 돌아요) → 뇌(뇌 노출 B — CNS(뇌 · 척수) 표적일 때만 효능에 곱해져요) · 심장(hERG 통로를 막으면 박동 리듬이 흐트러질 수 있어요) · 간(약을 분해하다가 손상될 수 있어요) | — | §5.7 · 4.04 (Claude 수정 · 검증 수정) |
| `2.1-2.2.s22.tabs.chain` | 점수 분해 사슬 | — | §5.7 · 4.10 · `SELECTION_COPY.s22.tabs.chain` |
| `2.1-2.2.s22.chain.q` | 사슬의 어느 칸 하나가 전체 효능이나 안전 점수를 크게 끌어내리나요? | — | §5.7 · 4.10 · `SELECTION_COPY.s22.chainQ` |
| `2.1-2.2.s22.chain.note` | 효능 E와 안전 S(흔들림 전 예상치)를 만드는 곱셈 · 뺄셈 블록을 펼쳐 놓았어요. 제형(경구 · 정맥주사 · 경피)과 용량(10 · 50 · 100 mg) 단추를 눌러 어느 칸이 바뀌는지 실험해 보세요. 정맥주사는 바로 피로 들어가 흡수 A가 1이 되지만, 한 번에 높은 농도가 몰려 제형 계수 K가 1.25로 커져요. | — | §5.7 · 4.10 |
| `2.1-2.2.s22.chain.blocksE` | 효능 E({E}, 흔들림 전 예상치) = 100 × (0.3 + 0.7×결합력 {p}) × 흡수 A({A}) × 뇌 노출 B({B}) × 용량 효과 De({De}) | `{E}` · `{p}` · `{A}` · `{B}` · `{De}` | §5.7 · 4.10 |
| `2.1-2.2.s22.chain.blocksS` | 안전 S({S}, 흔들림 전 예상치) = 100 − 용량 독성 부담 Dt({Dt}) × 위험 배수 Rk({Rk} = 1 + 심장 위험 + 간 위험) × 제형 계수 K({K}) | `{S}` · `{Dt}` · `{Rk}` · `{K}` | §5.7 · 4.10 (Claude 수정) |
| `2.1-2.2.s22.chain.controls` | 제형 고르기: {form}(경구 · 정맥주사 · 경피) · 용량 고르기: {dose} mg(10 · 50 · 100 mg) | `{form}` · `{dose}` | §5.7 · 4.10 |
| `2.1-2.2.s22.empty` | 아직 ADMET 예측을 끝낸 분자가 없어요. 대기열 분자로 ADMET을 실행하면 리드 읽기 도구 4종이 열려요. | — | §5.7 |
| `2.1-2.2.s22.cand.title` | 특허 후보 | — | §5.7 · `SELECTION_COPY.s22.candTitle` |
| `2.1-2.2.s22.cand.sub` | {n} / {max}개 · 1인 {per}개 한도 | `{n}` · `{max}` · `{per}` | §5.7 · `SELECTION_COPY.s22.candSub` |
| `2.1-2.2.s22.cand.empty` | 아직 올린 특허 후보가 없어요. 리드 읽기 도구 4종으로 비교한 뒤 근거 칩을 골라 올려 보세요. | — | §5.7 · `SELECTION_COPY.s22.candEmpty` |
| `2.1-2.2.s22.cand.from` | 특허 후보로 올릴 분자 | — | §5.7 · `SELECTION_COPY.s22.candFrom` |
| `2.1-2.2.s22.cand.legend` | 특허 후보 근거 칩 고르기 | — | §5.7 · `SELECTION_COPY.s22.candLegend` |
| `2.1-2.2.s22.cand.button` | 특허 후보로 올리기 | — | §5.7 · `SELECTION_COPY.s22.candButton` |
| `2.1-2.2.s22.cand.note` | 특허 후보는 모둠 최대 {max}개까지 모을 수 있어요. 3.1 물질특허에는 이 가운데 최대 {patentMax}건만 출원할 수 있어요. 주력 · 백업 후보는 3.2 전임상 · 동물실험 끝에서 정해요. | `{max}` · `{patentMax}` (새) | §5.7 · `SELECTION_COPY.s22.candNote` (Claude 수정) (일관성 수정) |
| `2.1-2.2.s22.cand.legacy` | 예전 판에서 이미 정해 둔 주력 · 백업 후보를 이 특허 후보 칸으로 옮겨 채웠어요. | — | §5.7 (일관성 수정) |
| `2.1-2.2.leadVerdict.noProps` | 물성을 읽지 못해 판정할 수 없어요. 잠시 뒤 다시 해 보세요. | — | §5.7 · `SELECTION_COPY.leadVerdict.noProps` · `s22.noProps` (Claude 수정) |
| `2.1-2.2.leadReason.herg_low.label` | 심장 위험(hERG)이 낮아요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.herg_low` |
| `2.1-2.2.leadVerdict.herg_low.ok` | 심장 hERG 위험 신호가 ‘● 낮음’이라 특허 후보로 올릴 수 있어요. | — | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.hergOk` |
| `2.1-2.2.leadVerdict.herg_low.warn` | 심장 hERG 위험이 ‘▲ 보통’이에요. 올릴 수는 있어요. 점수 분해 사슬에서 이 위험이 안전 S 를 얼마나 깎는지 확인해 보세요. | — | §5.7 · 4.03 · 4.10 · `SELECTION_COPY.leadVerdict.hergWarn` (Claude 수정) |
| `2.1-2.2.leadVerdict.herg_low.block` | 심장 hERG 위험이 ‘■ 높음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 심장 칸을 다시 확인해 보세요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.hergBlock` |
| `2.1-2.2.leadReason.liver_low.label` | 간 위험이 낮아요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.liver_low` |
| `2.1-2.2.leadVerdict.liver_low.ok` | 간독성 위험 신호가 ‘● 낮음’이라 특허 후보로 올릴 수 있어요. | — | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.liverOk` |
| `2.1-2.2.leadVerdict.liver_low.warn` | 간독성 위험이 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 간 칸과 점수 분해 사슬을 한 번 더 확인해 보세요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.liverWarn` |
| `2.1-2.2.leadVerdict.liver_low.block` | 간독성 위험이 ‘■ 높음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 간 칸을 다시 살펴보세요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.liverBlock` |
| `2.1-2.2.leadReason.oral_good.label` | 먹는 약으로 잘 흡수돼요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.oral_good` |
| `2.1-2.2.leadVerdict.oral_good.ok` | 경구 흡수 신호가 ‘● 좋음’이라 특허 후보로 올릴 수 있어요. | — | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.oralOk` |
| `2.1-2.2.leadVerdict.oral_good.warn` | 경구 흡수가 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 장 칸에서 흡수 A가 얼마나 깎이는지 확인해 보세요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.oralWarn` |
| `2.1-2.2.leadVerdict.oral_good.block` | 경구 흡수가 ‘■ 나쁨’이라 이 근거로는 올릴 수 없어요. 신호등 표와 점수 분해 사슬에서 다른 제형이나 다른 근거를 찾아보세요. | — | §5.7 · 4.03 · 4.10 · `SELECTION_COPY.leadVerdict.oralBlock` |
| `2.1-2.2.leadReason.brain_ok.label` | 뇌까지 갈 수 있어요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.brain_ok` |
| `2.1-2.2.leadVerdict.brain_ok.ok` | 뇌 노출 신호가 ‘● 높음’이라 뇌 속 표적까지 닿을 것으로 예측돼요. 특허 후보로 올릴 수 있어요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.brainOk` (Claude 수정 · 검증 수정) |
| `2.1-2.2.leadVerdict.brain_ok.warn` | 뇌 노출이 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 뇌 칸과 점수 분해 사슬의 B 값을 다시 확인해 보세요. | — | §5.7 · 4.04 · 4.10 · `SELECTION_COPY.leadVerdict.brainWarn` |
| `2.1-2.2.leadVerdict.brain_ok.block` | 뇌 노출이 ‘■ 낮음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 뇌 칸을 다시 살펴보세요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.brainBlock` |
| `2.1-2.2.leadVerdict.brain_ok.notCns` | 지금 우리 모둠의 표적은 중추신경계(CNS — 뇌 · 척수) 표적이 아니에요. 다른 근거 칩을 골라 주세요. | — | §5.7 · `SELECTION_COPY.leadVerdict.brainNotCns` |
| `2.1-2.2.leadReason.radar_in_band.label` | 레이더가 띠 안에 있어요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.radar_in_band` |
| `2.1-2.2.leadVerdict.radar_in_band.ok` | 물성 레이더 여섯 축이 모두 분홍 띠 안에 들어와 있어서 올릴 수 있어요. | — | §5.7 · 4.02 · `SELECTION_COPY.leadVerdict.radarOk` |
| `2.1-2.2.leadVerdict.radar_in_band.warn` | 한 축이 분홍 띠를 벗어났지만 올릴 수는 있어요. 물성 레이더에서 어느 축이 벗어났는지 확인해 두세요. | — | §5.7 · 4.02 · `SELECTION_COPY.leadVerdict.radarWarn` |
| `2.1-2.2.leadVerdict.radar_in_band.block` | 물성 레이더에서 {n}개 축이 분홍 띠를 벗어났어요. 물성 레이더 도구를 열어 어느 축이 약점인지 다시 살펴보세요. | `{n}` | §5.7 · 4.02 · `SELECTION_COPY.leadVerdict.radarBlock` |
| `2.1-2.2.leadReason.ind_safe.label` | IND 안전 기준을 넘을 것 같아요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.ind_safe` |
| `2.1-2.2.leadVerdict.ind_safe.ok` | 경구 50 mg 기준 예상 안전 S(흔들림 전 예상치)가 {S}로 IND(임상시험 계획 승인 신청) 기준({indMin}) 이상이라 올릴 수 있어요. | `{S}` · `{indMin}` | §5.7 · 4.03 · 4.10 · `SELECTION_COPY.leadVerdict.indOk` |
| `2.1-2.2.leadVerdict.ind_safe.block` | 경구 50 mg 기준 예상 안전 S(흔들림 전 예상치)가 {S}로 IND 안전 기준({indMin})보다 낮아요. 신호등 표나 점수 분해 사슬에서 안전 점수가 깎인 이유를 확인해 보세요. | `{S}` · `{indMin}` | §5.7 · 4.03 · 4.10 · `SELECTION_COPY.leadVerdict.indBlock` |
| `2.1-2.2.leadReason.top_efficacy.label` | 효능이 가장 커요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.top_efficacy` |
| `2.1-2.2.leadVerdict.top_efficacy.ok` | 경구 50 mg 기준 예상 효능 E(흔들림 전 예상치)가 {E}로 우리 모둠 2.2 결과 가운데 1위라 올릴 수 있어요. | `{E}` | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.topOk` |
| `2.1-2.2.leadVerdict.top_efficacy.block` | 경구 50 mg 기준 예상 효능 E(흔들림 전 예상치)가 {E}로 우리 모둠 1위({best})보다 낮아요. 신호등 표에서 모둠 분자들의 E 값을 다시 견주어 보세요. | `{E}` · `{best}` | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.topBlock` |
| `2.1-2.2.s21.gauge.dots` | 우리 모둠 분자 {n}개 | `{n}` | §5.6 · 3.05 (Claude 보충) |
| `2.1-2.2.dockVerdict.different_series.first` | 대기열의 첫 분자라 담을 수 있어요. | — | §5.6 · `SELECTION_COPY.dockVerdict.diffFirst` (Claude 보충 · 검증 수정) |
| `2.1-2.2.s21.queue.row` | {name} · 담당 {byName} · 근거: {reason} | `{name}` · `{byName}` (새) · `{reason}` (새) | §5.6 오른쪽 '2.2 대기열' 칸(담당자 · 근거) (Claude 보충) |
| `2.1-2.2.s21.pick.limitMine` | 내 몫 {per}개를 다 담았어요. 바꾸려면 담은 분자 하나를 먼저 빼 주세요. | `{per}` | §5.6 1인 2개 (Claude 보충) |
| `2.1-2.2.s22.radar.band` | 분홍 띠 = 먹는 약이 흔히 있는 범위(참고) | — | §5.7 · 4.02 (Claude 보충) |
| `2.1-2.2.s22.trip.gutReach` | 100 중 {pct}만 피에 닿아요 | `{pct}` (새) | 4.04 시안 '100 중 N 만 피에 닿는다' (Claude 보충) |
| `2.1-2.2.s22.trip.indPass` | IND 기준 {indMin} 넘어요 | `{indMin}` | §5.7 · 4.04 (Claude 보충) |
| `2.1-2.2.s22.trip.indFail` | IND 기준 {indMin} 에 못 미쳐요 | `{indMin}` | §5.7 · 4.04 (Claude 보충) |
| `2.1-2.2.s22.chain.resultE.pass` | 3상 기준 {th} 넘어요 | `{th}` (새) | 4.10 시안 · 3상 E 기준(게임 규칙 값) (Claude 보충) |
| `2.1-2.2.s22.chain.resultE.fail` | 3상 기준 {th} 에 모자라요 | `{th}` (새) | 4.10 시안 (Claude 보충) |
| `2.1-2.2.s22.chain.resultS.phase1` | 1상 기준 {th} 넘어요 | `{th}` (새) | 4.10 시안 · 1상 S 기준 (Claude 보충) |
| `2.1-2.2.s22.chain.resultS.indOnly` | IND {indMin} 통과 · 1상 {th} 에는 모자라요 | `{indMin}` · `{th}` (새) | 4.10 시안 (Claude 보충) |
| `2.1-2.2.s22.chain.resultS.belowInd` | IND 기준 {indMin} 에 못 미쳐요 | `{indMin}` | 4.10 시안 (Claude 보충) |
| `2.1-2.2.s22.chain.resultS.floor` | 0 아래로는 내려가지 않아요 · 탈락 | — | 4.10 시안 · S 하한 0 (Claude 보충) |
| `2.1-2.2.s22.cand.limitMine` | 내 몫 {per}개를 다 올렸어요. 바꾸려면 올린 후보를 먼저 빼 주세요. | `{per}` | §5.7 1인 1개(2명 이하 모둠 2개) (Claude 보충) |
| `2.1-2.2.s22.cand.limitTeam` | 모둠 특허 후보가 {max}개로 가득 찼어요. 하나를 빼야 새로 올릴 수 있어요. | `{max}` | §5.7 모둠 최대 4개 (Claude 보충) |
| `2.1-2.2.s22.cand.remove` | 빼기 | — | §5.7 · `SELECTION_COPY.s21.remove` 와 같은 꼴 (Claude 보충) |

## 메모

- 원문 165줄 중 33줄을 고쳤고 17줄을 보탰다(합계 182줄). 고친 이유는 [`review.md`](review.md) 에 줄마다 적었다.
- 독립 검증(2차)이 13줄을 더 고치고 2줄을 보탰다(합계 184줄). 이유는 [`review.md`](review.md) '## 독립 검증(2차)'.
- `known.chip21`(2.1 · '특허를 받으려면 구조를 바꿔야 해요')과 `known.chip22`(2.2 · '특허 불가 — 변형체 필요')는 설계 §5.6 · §5.7 문구가 달라 둘 다 둔다. 하나로 합칠지는 사용자 확인.
- `s21.tabs.edit` 는 '구조 바꿔 다시 도킹'(설계 §6.1 · §10)으로 바꿨다. 지금 코드 문구는 '분자 고치기'.
