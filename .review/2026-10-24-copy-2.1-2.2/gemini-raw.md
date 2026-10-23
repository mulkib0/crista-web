| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `2.1-2.2.s21.intro.title` | 2.1 분자 도킹 — 표적 주머니에 잘 맞는지 끼워 보기 | — | §5.6 · §6.1 |
| `2.1-2.2.s21.intro.body` | 분자 도킹(단백질 결합 주머니에 분자를 끼워 보는 컴퓨터 계산)으로 후보 분자가 얼마나 단단히 붙는지 예측해요. ΔG(결합 자유 에너지 — 더 음수일수록 단단히 붙는 값)를 기준 약과 견주어 보고, 구조를 조금 고쳐 다시 도킹해 볼 수도 있어요. 결과 읽기 도구 3종으로 데이터를 살펴본 뒤 2.2로 보낼 분자를 골라 담아 주세요. | — | §5.6 · §6.1 · §10 |
| `2.1-2.2.s21.intro.done` | 이 표적에서 실제 도킹 결과를 1건 이상 얻으면 2.1이 완료돼요. 2.2 ADMET을 실행하려면 오른쪽 2.2 대기열에 분자를 1개 이상 담아야 해요. | — | §5.6 · §6.1 |
| `2.1-2.2.s21.intro.cost` | 도킹 1건마다 연구비 {cost} 크리스타(250,000 크리스타)가 들어요. | `{cost}` | §5.6 · §6.1 |
| `2.1-2.2.s21.empty` | 아직 도킹을 끝낸 분자가 없어요. 도킹 결과가 나오면 결과 읽기 도구 3종이 열려요. | — | §5.6 · `SELECTION_COPY.s21.empty` |
| `2.1-2.2.s21.tabs.gauge` | 수심계 눈금 | — | §5.6 · 3.05 · `SELECTION_COPY.s21.tabs.gauge` |
| `2.1-2.2.s21.gauge.q` | 우리 후보는 점수가 매겨지는 구간(p 0~1) 안에 있나요? 기준 약보다 더 깊은 곳에 있나요? | — | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeQ` |
| `2.1-2.2.s21.gauge.note` | 눈금 아래로 내려갈수록(ΔG가 더 음수일수록) 표적에 단단히 붙어요. 점선 두 줄(p = 0 선과 p = 1 선) 사이에서만 결합력 점수 p가 0에서 1로 바뀌어요. 우리 스타트업 모둠원이 도킹한 분자는 담당자 잉크 점으로 찍혀요. | — | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeNote` |
| `2.1-2.2.s21.gauge.axis` | 결합 에너지 ΔG 세로 눈금 (0 ~ −14 kcal/mol) | — | §5.6 · 3.05 |
| `2.1-2.2.s21.gauge.histamine` | 히스타민 — 작아서 헐렁한 분자 (p = 0) | — | §5.6 · 3.05 |
| `2.1-2.2.s21.gauge.p0` | p = 0 선 ({p0} kcal/mol, 기준 + 4.5) — 이보다 얕으면 결합력 점수 0 | `{p0}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeP0` |
| `2.1-2.2.s21.gauge.median` | 이 표적 라이브러리 220종 가운데값 ({median} kcal/mol) | `{median}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeMedian` |
| `2.1-2.2.s21.gauge.ref` | 기준 약 ({refDG} kcal/mol) — 실제 환자에게 쓰이는 약 | `{refDG}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeRef` |
| `2.1-2.2.s21.gauge.p1` | p = 1 선 ({p1} kcal/mol, 기준 − 0.5) — 이보다 깊으면 결합력 만점 | `{p1}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeP1` |
| `2.1-2.2.s21.gauge.top` | 이 표적 라이브러리 220종 1위 ({top} kcal/mol) | `{top}` | §5.6 · 3.05 · `SELECTION_COPY.s21.gaugeTop` |
| `2.1-2.2.s21.gauge.legend` | 잉크 점 = 우리 모둠이 도킹한 분자(담당자 색깔) · 가로선 = 비교 이정표 | — | §5.6 · 3.05 |
| `2.1-2.2.s21.tabs.cards` | 점수 카드 | — | §5.6 · 3.09 · `SELECTION_COPY.s21.tabs.cards` |
| `2.1-2.2.s21.cards.q` | 도킹 점수는 높은데 원래 다른 병을 고치려고 만든 약은 아닌가요? | — | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsQ` |
| `2.1-2.2.s21.cards.note` | 도킹 점수는 컴퓨터가 계산한 예측값이지 실제 실험으로 잰 값이 아니에요. 점수가 1위라도 그 분자의 출신(원래 겨냥한 표적과 기전)을 함께 확인해야 해요. | — | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsNote` |
| `2.1-2.2.s21.cards.band` | 도킹 {rank}위지만 원래 {mech} 약 | `{rank}` · `{mech}` | §5.6 · 3.09 · `SELECTION_COPY.s21.cardsBand` |
| `2.1-2.2.s21.cards.stamp` | 점수 1위 ≠ 리드(대표 후보 물질) | — | §5.6 · 3.09 |
| `2.1-2.2.origin.this` | 이 표적을 겨냥해 만든 계열 | — | §5.6 · 3.09 · `SELECTION_COPY.origin.this` |
| `2.1-2.2.origin.other` | 다른 표적 · 다른 병의 약 | — | §5.6 · 3.09 · `SELECTION_COPY.origin.other` |
| `2.1-2.2.origin.unknown` | 출신을 모르는 분자(직접 그린 구조) | — | §5.6 · 3.09 · `SELECTION_COPY.origin.unknown` |
| `2.1-2.2.origin.variant` | 변형체(부모 분자에서 구조를 고침) | — | §5.6 · 3.09 · `SELECTION_COPY.origin.variant` |
| `2.1-2.2.s21.tabs.stairs` | 10배 계단 | — | §5.6 · 3.07 · `SELECTION_COPY.s21.tabs.stairs` |
| `2.1-2.2.s21.stairs.q` | ΔG 0.7 kcal/mol 차이는 필요한 약의 양으로 몇 배 차이일까요? ‘조금 약한’ 후보는 얼마나 더 많이 필요할까요? | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsQ` |
| `2.1-2.2.s21.stairs.note` | 우리 체온 근처(298 K)에서 ΔG가 1.36 kcal/mol 더 음수가 될 때마다 표적 주머니 절반을 채우는 데 필요한 농도가 10배씩 줄어요. 공식 `배수 = 10^(ΔΔG ÷ 1.364)`로 기준 약과 몇 배 차이인지 계단에서 읽어 보세요. | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsNote` |
| `2.1-2.2.s21.stairs.axis` | 세로축: 해리 상수 Kd(표적 주머니 절반을 채우는 농도, 로그 눈금) | — | §5.6 · 3.07 |
| `2.1-2.2.s21.stairs.bands` | 농도 구간: 몰(M) ~ 밀리몰(mM) · 마이크로몰(µM) · 나노몰(nM) · 피코몰(pM) | — | §5.6 · 3.07 |
| `2.1-2.2.s21.stairs.pick` | 기준 약과 견줄 분자 | — | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsPick` |
| `2.1-2.2.s21.stairs.lineStronger` | 기준 약보다 {gap} kcal/mol 더 깊어요 — 같은 효과를 내는 데 필요한 양이 약 {fold}배 적어요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsLine` |
| `2.1-2.2.s21.stairs.lineWeaker` | 기준 약보다 {gap} kcal/mol 더 얕아요 — 같은 효과를 내는 데 약 {fold}배 더 많은 양이 필요해요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.s21.stairsLine` |
| `2.1-2.2.s21.tabs.edit` | 구조 바꿔 다시 도킹 | — | §10 · `SELECTION_COPY.s21.tabs.edit` |
| `2.1-2.2.s21.edit.chip.acetamido` | 방향족 아민 → 아세트아마이드 | — | §10 |
| `2.1-2.2.s21.edit.chip.cyano` | 니트로 → 시아노 | — | §10 |
| `2.1-2.2.s21.edit.chip.amide` | 염기성 아민 → 아마이드 | — | §10 |
| `2.1-2.2.s21.edit.chip.hydroxy` | 하이드록시 도입 | — | §10 |
| `2.1-2.2.s21.edit.chip.fluorine` | 플루오린 도입 | — | §10 |
| `2.1-2.2.s21.edit.chip.demethoxy` | 메톡시 제거 | — | §10 |
| `2.1-2.2.s21.edit.chipReady` | 작용기(분자의 성질을 결정하는 원자 묶음) 칩 자동 변환은 아직 준비 중이에요. 지금은 아래 SMILES 칸을 직접 고쳐서 물성 미리보기와 재도킹을 쓸 수 있어요. | — | §10 |
| `2.1-2.2.s21.edit.smilesGuide` | 원본 분자의 SMILES(분자 구조를 글자로 적은 식)를 조금 고쳐 새로운 변형체를 만들어 보세요. | — | §10 |
| `2.1-2.2.s21.edit.preview` | 무료 물성 미리보기 — 도킹하기 전에 바뀐 분자의 물성과 위험 신호를 공짜로 먼저 확인해요. | — | §10 |
| `2.1-2.2.s21.edit.previewLimit` | 무료 물성 미리보기는 우리 모둠 전체에서 1분에 20회까지 쓸 수 있어요. | — | §10 |
| `2.1-2.2.s21.edit.redockCost` | 미리보기를 마친 변형체를 다시 도킹하면 도킹 1회 비용({cost} 크리스타)이 들어요. | `{cost}` | §5.6 · §10 |
| `2.1-2.2.s21.edit.compare` | 원본 · 변형체 비교표 — 모둠원이 도킹한 모든 분자의 담당자 · 직책 · ΔG · 기준 대비 결합력 · 물성 · 위험 신호 · 부모 분자를 한눈에 견주어 봐요. | — | §10 |
| `2.1-2.2.s21.retro.title` | 찜 회고 | — | §5.5.1 · `SELECTION_COPY.s21.retroTitle` |
| `2.1-2.2.s21.retro.line` | 1.2 결합 예측 상위 {n}개를 그대로 찜했다면 평균 ΔG {topMean} kcal/mol · 우리 모둠이 찜한 분자 평균 ΔG {ourMean} kcal/mol (사전 계산값) | `{n}` · `{topMean}` · `{ourMean}` | §5.5.1 · `SELECTION_COPY.s21.retroLine` |
| `2.1-2.2.s21.retro.rank` | 220종 중 {rank}위 (전체 {of}개) | `{rank}` · `{of}` | §5.5.1 · `SELECTION_COPY.s21.retroRank` |
| `2.1-2.2.s21.retro.notDocked` | 아직 도킹 안 함 | — | §5.5.1 · `SELECTION_COPY.s21.retroNotDocked` |
| `2.1-2.2.s21.queue.title` | 2.2 대기열 | — | §5.6 · `SELECTION_COPY.s21.queueTitle` |
| `2.1-2.2.s21.queue.sub` | {n} / {max}개 · 1인 {per}개 한도 | `{n}` · `{max}` · `{per}` | §5.6 · `SELECTION_COPY.s21.queueSub` |
| `2.1-2.2.s21.queue.mine` | 내가 담은 분자 {n} / 2개 | `{n}` | §5.6 · `SELECTION_COPY.s21.pickMine` |
| `2.1-2.2.s21.queue.cost` | 대기열 {n}개를 모두 2.2 ADMET으로 보면 예상 비용 {cost} 크리스타예요(분자 1개당 250,000 크리스타). | `{n}` · `{cost}` | §5.6 · `SELECTION_COPY.s21.queueCost` |
| `2.1-2.2.s21.queue.empty` | 아직 대기열에 담은 분자가 없어요. 왼쪽 결과 읽기 도구 3종으로 살펴보고 근거 칩을 골라 담아 보세요. | — | §5.6 · `SELECTION_COPY.s21.queueEmpty` |
| `2.1-2.2.s21.pick.from` | 담을 분자 | — | §5.6 · `SELECTION_COPY.s21.pickFrom` |
| `2.1-2.2.s21.pick.legend` | 담는 근거 칩 고르기 | — | §5.6 · `SELECTION_COPY.s21.pickLegend` |
| `2.1-2.2.s21.pick.button` | 2.2 대기열에 담기 | — | §5.6 · `SELECTION_COPY.s21.pickButton` |
| `2.1-2.2.s21.pick.remove` | 빼기 | — | §5.6 · `SELECTION_COPY.s21.remove` |
| `2.1-2.2.s21.pick.refNote` | 기준 약은 대기열에 넣지 않아도 2.2 비교표에 공짜로 자동 첨부돼요. | — | §5.6 · `SELECTION_COPY.s21.pickRef` |
| `2.1-2.2.s21.pick.limitOrder` | 한 사람당 2개, 모둠 전체에서 최대 {max}개(8개)까지만 대기열에 담을 수 있어요. 더 담으려면 먼저 담긴 분자를 빼 주세요. | `{max}` | §5.6 |
| `2.1-2.2.unknownReason` | 고를 수 있는 근거 칩이 아니에요. 목록에 있는 근거 칩을 하나 골라 주세요. | — | §5.6 · §5.7 · `SELECTION_COPY.unknownReason` |
| `2.1-2.2.dockReason.stronger_than_ref.label` | 기준 약보다 단단히 붙어요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.stronger_than_ref` |
| `2.1-2.2.dockVerdict.stronger_than_ref.ok` | 내 분자 ΔG({dG} kcal/mol)가 기준 약({refDG} kcal/mol)보다 깊거나 같아 대기열에 담을 수 있어요. | `{dG}` · `{refDG}` | §5.6 · `SELECTION_COPY.dockVerdict.strongerOk` |
| `2.1-2.2.dockVerdict.stronger_than_ref.block` | 기준 약보다 {gap} kcal/mol 더 약해요. 10배 계단 도구에서 보면 약 {fold}배 더 많은 양이 필요하니 수심계 눈금과 10배 계단을 다시 확인해 보세요. | `{gap}` · `{fold}` | §5.6 · 3.05 · 3.07 · `SELECTION_COPY.dockVerdict.strongerBlock` |
| `2.1-2.2.dockReason.within_10x.label` | 기준 약과 10배 차이 안이에요 | — | §5.6 · `SELECTION_COPY.dockReasonLabel.within_10x` |
| `2.1-2.2.dockVerdict.within_10x.ok` | 기준 약과 ΔG 차이가 {gap} kcal/mol로 10배 문턱(1.36 kcal/mol) 안이라 담을 수 있어요. | `{gap}` | §5.6 · 3.07 · `SELECTION_COPY.dockVerdict.within10Ok` |
| `2.1-2.2.dockVerdict.within_10x.block` | 기준 약보다 {gap} kcal/mol 약해 필요한 양이 약 {fold}배 차이 나요. 10배(1.36 kcal/mol)를 넘으니 10배 계단 도구를 다시 살펴보세요. | `{gap}` · `{fold}` | §5.6 · 3.07 · `SELECTION_COPY.dockVerdict.within10Block` |
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
| `2.1-2.2.dockVerdict.different_series.ok` | 대기열의 첫 분자이거나 다른 모둠원이 담은 분자와 다른 계열이라 담을 수 있어요. | — | §5.6 · `SELECTION_COPY.dockVerdict.diffFirst` · `diffOk` |
| `2.1-2.2.dockVerdict.different_series.warnParent` | 담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 부모 분자 계열이에요. 점수 카드에서 출신과 부모 분자를 한 번 더 확인해 보세요. | — | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.diffSameParent` |
| `2.1-2.2.dockVerdict.different_series.warnLib` | 담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 라이브러리({lib})에서 왔어요. 점수 카드에서 출신을 다시 살펴보세요. | `{lib}` | §5.6 · 3.09 · `SELECTION_COPY.dockVerdict.diffSameLibrary` |
| `2.1-2.2.confirmOther.title` | 다른 병을 겨냥한 약이에요 | — | §5.6 · 3.09 · `SELECTION_COPY.confirmOther.title` |
| `2.1-2.2.confirmOther.body` | 도킹 점수는 예측이에요. 이 분자는 원래 {mech} 약이라(도킹 {rank}위) 우리 표적의 리드가 되기 어렵고, 이미 알려진 물질이라 3.1 물질특허도 받을 수 없어요. | `{rank}` · `{mech}` | §5.6 · 3.09 · `SELECTION_COPY.confirmOther.body` |
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
| `2.1-2.2.s22.intro.done` | 특허 후보를 1개 이상 올리면 2.2가 완료돼요. 주력 리드와 백업 후보 지정은 3.2 전임상 · 동물실험 결과를 본 뒤 끝에 해요. | — | §5.7 · §6.1 |
| `2.1-2.2.s22.tabs.run` | ADMET 실행 | — | §5.7 · `SELECTION_COPY.s22.tabs.run` |
| `2.1-2.2.s22.run.hint` | 2.1 대기열에 담아 둔 분자만 ADMET을 실행할 수 있어요. 분자 1개당 {cost} 크리스타(250,000 크리스타)가 들어요. | `{cost}` | §5.6 · §5.7 · `SELECTION_COPY.s22.runHint` |
| `2.1-2.2.s22.run.empty` | 2.1에서 분자를 골라 주세요 | — | §5.6 · §5.7 · `SELECTION_COPY.s22.runEmpty` |
| `2.1-2.2.s22.run.button` | ADMET 예측 실행 | — | §5.7 · `SELECTION_COPY.s22.runButton` |
| `2.1-2.2.s22.run.done` | 이미 ADMET을 실행했어요 | — | §5.7 · `SELECTION_COPY.s22.runDone` |
| `2.1-2.2.s22.reference` | 기준 약(비교용 자동 첨부 · 무료) | — | §5.6 · §5.7 · `SELECTION_COPY.s22.reference` |
| `2.1-2.2.s22.preShake` | 흔들림 전 예상치 — 실제 임상 판정에는 시험마다 흔들림이 더해져요. | — | §5.7 · `SELECTION_COPY.s22.preShake` |
| `2.1-2.2.s22.ai.title` | ADMET-AI 레이더 (참고 · AI 예측) | — | §5.7 · `SELECTION_COPY.s22.aiTitle` |
| `2.1-2.2.s22.ai.note` | 이 패널은 AI가 예측한 참고 자료예요. 근거 칩 판정이나 점수 계산에는 쓰지 않아요. | — | §5.7 · `SELECTION_COPY.s22.aiNote` |
| `2.1-2.2.s22.tabs.radar` | 물성 레이더 | — | §5.7 · 4.02 · `SELECTION_COPY.s22.tabs.radar` |
| `2.1-2.2.s22.radar.q` | 이 분자의 약점은 여섯 축 가운데 어느 축인가요? | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarQ` |
| `2.1-2.2.s22.radar.note` | 분홍 띠는 먹는 약이 흔히 들어오는 물성 참고 범위예요. 분홍 띠 밖으로 튀어나간 축이 이 분자가 몸에 흡수될 때 겪을 수 있는 약점이에요. | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarNote` |
| `2.1-2.2.s22.radar.axes` | 지용성 cLogP(기름에 녹는 정도, −0.7~5) · 크기 MW(분자량, 150~500) · 극성 TPSA(물과 친한 표면 넓이, 20~130) · 유연성 RotB(회전 결합 수, ≤9) · 수소결합 주개 HBD(≤5) · 수소결합 받개 HBA(≤10) | — | §5.7 · 4.02 |
| `2.1-2.2.s22.radar.allIn` | 여섯 축 모두 분홍 띠 안에 있어요 | — | §5.7 · 4.02 · `SELECTION_COPY.s22.radarAllIn` |
| `2.1-2.2.s22.radar.out` | 분홍 띠 밖 {n}곳: {axes} | `{n}` · `{axes}` | §5.7 · 4.02 · `SELECTION_COPY.s22.radarOut` |
| `2.1-2.2.s22.tabs.lights` | 신호등 표 | — | §5.7 · 4.03 · `SELECTION_COPY.s22.tabs.lights` |
| `2.1-2.2.s22.lights.q` | 표적에는 잘 붙는데 빨간 위험 신호(■)가 켜진 분자는 어느 것인가요? | — | §5.7 · 4.03 · `SELECTION_COPY.s22.lightsQ` |
| `2.1-2.2.s22.lights.note` | 대기열 분자와 기준 약을 한 줄씩 놓고 결합력 p, 위험 신호 5개, 경구 50 mg 기준 효능 E · 안전 S(흔들림 전 예상치)를 견주어 봐요. 신호는 물성 규칙으로 빠르게 거르는 망이라 실제 실험과 다를 수 있어요. | — | §5.7 · 4.03 |
| `2.1-2.2.s22.lights.cols` | 결합력 p · 경구 흡수 · 뇌 노출 · 심장 hERG(심장 박동 칼륨 통로 위험) · 간독성(간 손상 위험) · 경피 투과(피부 패치 통과) · 효능 E · 안전 S (흔들림 전 예상치) | — | §5.7 · 4.03 |
| `2.1-2.2.s22.lights.levels` | ● 좋음 / 높음 / 적합 · ▲ 보통 · ■ 나쁨 / 낮음 / 부적합 | — | §5.7 · 4.03 |
| `2.1-2.2.s22.tabs.trip` | 몸속 여행 지도 | — | §5.7 · 4.04 · `SELECTION_COPY.s22.tabs.trip` |
| `2.1-2.2.s22.trip.q` | 이 분자는 우리 몸 어디를 지나면서 효능을 잃거나 안전 점수가 깎이나요? | — | §5.7 · 4.04 · `SELECTION_COPY.s22.tripQ` |
| `2.1-2.2.s22.trip.note` | 분자 하나를 골라 입에서 표적과 장기까지 이동하는 길을 따라가 봐요. 화살표 굵기는 그 길로 실제 지나가는 약의 양을 뜻하고, 장기마다 효능 E(흔들림 전 예상치)와 안전 S(흔들림 전 예상치)가 얼마나 깎이는지 보여 줘요. | — | §5.7 · 4.04 |
| `2.1-2.2.s22.trip.organs` | 입(먹는다) → 장(흡수 A — 피로 넘어간다) → 피(피를 타고 온몸을 돈다) → 뇌(뇌 노출 B — 중추신경계 CNS 표적에서 약효가 난다) · 심장(hERG 통로를 막으면 박동이 흔들린다) · 간(약을 부수다 상할 수 있다) | — | §5.7 · 4.04 |
| `2.1-2.2.s22.tabs.chain` | 점수 분해 사슬 | — | §5.7 · 4.10 · `SELECTION_COPY.s22.tabs.chain` |
| `2.1-2.2.s22.chain.q` | 사슬의 어느 칸 하나가 전체 효능이나 안전 점수를 크게 끌어내리나요? | — | §5.7 · 4.10 · `SELECTION_COPY.s22.chainQ` |
| `2.1-2.2.s22.chain.note` | 효능 E와 안전 S(흔들림 전 예상치)를 만드는 곱셈 · 뺄셈 블록을 펼쳐 놓았어요. 제형(경구 · 정맥주사 · 경피)과 용량(10 · 50 · 100 mg) 단추를 눌러 어느 칸이 바뀌는지 실험해 보세요. 정맥주사는 바로 피로 들어가 흡수 A가 1이 되지만, 한 번에 높은 농도가 몰려 제형 계수 K가 1.25로 커져요. | — | §5.7 · 4.10 |
| `2.1-2.2.s22.chain.blocksE` | 효능 E({E}, 흔들림 전 예상치) = 100 × (0.3 + 0.7×결합력 {p}) × 흡수 A({A}) × 뇌 노출 B({B}) × 용량 효과 De({De}) | `{E}` · `{p}` · `{A}` · `{B}` · `{De}` | §5.7 · 4.10 |
| `2.1-2.2.s22.chain.blocksS` | 안전 S({S}, 흔들림 전 예상치) = 100 − 용량 독성 부담 Dt({Dt}) × (1 + 심장 · 간 위험합 {Rk}) × 제형 계수 K({K}) | `{S}` · `{Dt}` · `{Rk}` · `{K}` | §5.7 · 4.10 |
| `2.1-2.2.s22.chain.controls` | 제형 고르기: {form}(경구 · 정맥주사 · 경피) · 용량 고르기: {dose} mg(10 · 50 · 100 mg) | `{form}` · `{dose}` | §5.7 · 4.10 |
| `2.1-2.2.s22.empty` | 아직 ADMET 예측을 끝낸 분자가 없어요. 대기열 분자로 ADMET을 실행하면 리드 읽기 도구 4종이 열려요. | — | §5.7 |
| `2.1-2.2.s22.cand.title` | 특허 후보 | — | §5.7 · `SELECTION_COPY.s22.candTitle` |
| `2.1-2.2.s22.cand.sub` | {n} / {max}개 · 1인 {per}개 한도 | `{n}` · `{max}` · `{per}` | §5.7 · `SELECTION_COPY.s22.candSub` |
| `2.1-2.2.s22.cand.empty` | 아직 올린 특허 후보가 없어요. 리드 읽기 도구 4종으로 비교한 뒤 근거 칩을 골라 올려 보세요. | — | §5.7 · `SELECTION_COPY.s22.candEmpty` |
| `2.1-2.2.s22.cand.from` | 특허 후보로 올릴 분자 | — | §5.7 · `SELECTION_COPY.s22.candFrom` |
| `2.1-2.2.s22.cand.legend` | 특허 후보 근거 칩 고르기 | — | §5.7 · `SELECTION_COPY.s22.candLegend` |
| `2.1-2.2.s22.cand.button` | 특허 후보로 올리기 | — | §5.7 · `SELECTION_COPY.s22.candButton` |
| `2.1-2.2.s22.cand.note` | 특허 후보는 모둠 최대 {max}개(4개)까지 모을 수 있지만, 3.1 물질특허에는 이 가운데 최대 3건만 출원할 수 있어요. 주력 리드와 백업 후보 지정은 3.2 전임상 · 동물실험 끝에서 정해요. | `{max}` | §5.7 · `SELECTION_COPY.s22.candNote` |
| `2.1-2.2.s22.cand.legacy` | 예전 판에서 이미 정해 둔 주력 리드와 백업 후보를 이 특허 후보 칸으로 옮겨 채웠어요. | — | §5.7 |
| `2.1-2.2.leadVerdict.noProps` | 아직 이 분자의 물성을 읽지 못해 판정할 수 없어요. ADMET 계산이 끝난 뒤 다시 시도해 보세요. | — | §5.7 · `SELECTION_COPY.leadVerdict.noProps` · `s22.noProps` |
| `2.1-2.2.leadReason.herg_low.label` | 심장 위험(hERG)이 낮아요 | — | §5.7 · `SELECTION_COPY.leadReasonLabel.herg_low` |
| `2.1-2.2.leadVerdict.herg_low.ok` | 심장 hERG 위험 신호가 ‘● 낮음’이라 특허 후보로 올릴 수 있어요. | — | §5.7 · 4.03 · `SELECTION_COPY.leadVerdict.hergOk` |
| `2.1-2.2.leadVerdict.herg_low.warn` | 심장 hERG 위험이 ‘▲ 보통’이에요. 올릴 수는 있지만 점수 분해 사슬과 3.3에서 용량 · 감시 계획을 세울 때 다시 살펴보세요. | — | §5.7 · 4.03 · 4.10 · `SELECTION_COPY.leadVerdict.hergWarn` |
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
| `2.1-2.2.leadVerdict.brain_ok.ok` | 뇌 노출 신호가 ‘● 높음’이라 뇌 속 표적까지 잘 닿을 수 있어요. | — | §5.7 · 4.03 · 4.04 · `SELECTION_COPY.leadVerdict.brainOk` |
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

- **공지 물질 칩 두 가지 표현**: 설계 §5.6(2.1)은 `'특허를 받으려면 구조를 바꿔야 해요'`, §5.7(2.2)과 `SELECTION_COPY.known.chip`은 `'특허 불가 — 변형체 필요'`로 적고 있어 표에 두 키(`known.chip21` · `known.chip22`)를 모두 두었으니 하나로 합칠지 결정이 필요해요.
- **2.1 네 번째 탭 이름**: 설계 §6.1 · §10 본문은 `'구조 바꿔 다시 도킹'`이고 `SELECTION_COPY.s21.tabs.edit`는 `'분자 고치기'`라, 지시문 범위 명칭인 `'구조 바꿔 다시 도킹'`(11자)으로 맞췄어요.
- **2단계 판정 칩의 ‘주의’ 생략**: 2.1의 1~5번 근거 칩과 2.2의 `ind_safe` · `top_efficacy` 칩은 설계 규칙(§5.6 · §5.7)과 `selection.ts`에서 맞음 · 막음 2단계로만 판정하므로 별도 ‘주의’ 행을 두지 않았어요.
- **자리표시자 이름 통일**: 기존 `SELECTION_COPY` 함수 인자에서 `n`(배수) · `top`(상위 평균) · `ours`(우리 평균)로 쓰던 이름은 지시문 자리표시자 목록의 `{fold}` · `{topMean}` · `{ourMean}`으로 통일했어요.
