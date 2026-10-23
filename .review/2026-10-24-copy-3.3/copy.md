# 3.3 제형 · IND 신청 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 원문(`gemini-raw.md` · `agy --model gemini-4-argon-high --effort high --mode plan`) → Claude(Opus 5.5) 검토 · 수정
- 날짜: 2026-10-24
- 상태: **반영됨(2026-10-24 · 문구 3.2 · 3.3 담당)** — `IND_COPY` 에 옮겼어요. 반영 때 버리거나 고친 줄은 아래 '반영 메모'에 적었어요. 화면 스크린샷 `.review/2026-10-24-copy-apply/3.2-3.3/`.
- 표시: Claude 가 고친 줄은 '근거' 끝에 `(Claude 수정)`, Claude 가 채운 줄은 `(Claude 보충)`. 이유는 `review.md`.
- 2차 독립 검증(2026-10-24): 고친 줄은 `(검증 수정)`, 채운 줄은 `(검증 보충)`. 이유는 `review.md` 의 '## 독립 검증(2차)'.
- 자리표시자: 기존 `IND_COPY` 이름을 그대로 쓴다. 새로 만든 것은 `(새)` 로 적었다 — `{teamN}` 하나.

## A. 이 단계에서 하는 일
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.overview.title` | 이 단계에서 하는 일 | — | §5.10 뼈대 · `overview.title` |
| `3.3.overview.oneLine` | 사람에게 처음으로 우리 약을 써 봐도 되는지, 나라(식약처 · FDA)에 허락을 받는 IND(임상시험 계획 승인 신청) 서류를 내요. | — | §5.10 뼈대(한 문장) · `overview.oneLine` (일관성 수정) |
| `3.3.overview.summary1` | 정할 것은 세 가지예요. 제형(약을 몸에 넣는 모양), 용량(넣는 양), 그리고 환자군과 1차 평가지표(시험 결과를 판단하는 가장 중요한 잣대)예요. | — | §5.10 뼈대(정할 것 세 가지) · `overview.summary[0]` (Claude 수정) |
| `3.3.overview.summary2` | 가장 중요한 근거는 3.2 동물실험에서 구한 MRSD(최대 권장 시작 용량, 사람에게 처음 줘도 되는 가장 큰 양)예요. | — | §5.10 뼈대(근거 하나) · `overview.summary[1]` |
| `3.3.overview.summary3` | 신청서를 내면 규칙 검사와 AI 심사관(Claude)이 차례로 봐요. 서류가 통과하면 수수료 500,000 크리스타를 내고, 30게임 일 뒤에 판정을 받아요. | — | §5.10 심사 흐름 · `overview.summary[2]` (Claude 수정) (일관성 수정) |
| `3.3.overview.more.oneLine` | 우리 회사가 만든 후보 물질을 사람에게 처음 써 봐도 되는지 나라에 허락을 구하는 단계예요. | — | §5.10 뼈대(한 문장) · `overview.more[0]` (Claude 수정) |
| `3.3.overview.more.threeThings` | ① 어떤 모양으로 넣을지 제형(먹는 알약 · 정맥 주사 · 붙이는 패치)을 골라요. ② 얼마나 넣을지 용량(10 · 50 · 100 mg)을 정해요. ③ 누구에게 시험하고 무엇을 잴지 환자군과 1차 평가지표를 골라요. | — | §5.10 뼈대(정할 것 세 가지) · `overview.more[1]` |
| `3.3.overview.more.basis` | 근거는 3.2 동물실험 결과예요. 동물에게서 부작용이 없던 양을 사람 기준으로 바꾸고, 안전하게 더 줄인 값이 MRSD 예요. 시작 용량은 MRSD 를 넘을 수 없어요. | — | §5.10 뼈대(근거 하나) · §5.9 · `overview.more[2]` (Claude 수정) |
| `3.3.overview.more.analogy` | 새 놀이기구에 사람을 처음 태우기 전에 안전 점검 결과를 내는 것과 비슷해요. 누구를 태우고 어떤 속도로 운행할지 계획도 함께 내서 허락을 받아요. | — | §5.10 뼈대(비유) · `overview.more[3]` |
| `3.3.overview.more.scale` | 용량을 올리면 효능 E 는 올라가지만 안전 S 는 내려가요. 두 가지를 함께 좋게 만드는 용량은 없어요. | — | §5.10 뼈대(저울) · 6.04 · `overview.more[4]` (Claude 수정) |
| `3.3.overview.more.misconception` | IND 승인은 약을 팔아도 된다는 허가가 아니에요. 사람에게 시험을 시작해도 된다는 허락일 뿐이에요. 다음 관문인 1상의 안전 기준은 더 높아요(참고 기준 S ≥ 50). | — | §5.10 뼈대(흔한 오해) · §5.14(1상 이후 기준은 참고 — 판정은 AI 시뮬레이션) · `overview.more[5]` (Claude 수정) (검증 수정) |
| `3.3.overview.expand` | 자세히 펼쳐 보기 | — | §5.10 뼈대 · `overview.expand` |
| `3.3.overview.collapse` | 접기 | — | §5.10 뼈대 · `overview.collapse` |

## B. 도구 6종(6.02~6.07)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.tool.common.preShake` | 도구의 E · S 숫자는 모두 흔들림 전 예상치(교육용으로 단순하게 만든 공식의 값)예요. IND 판정에는 흔들림이 없어요. 임상 단계의 결과는 이 예상과 달라질 수 있어요. | — | §5.10 도구 표 · `preShake` (Claude 수정) |
| `3.3.tool.common.fills` | 채워지는 신청서 칸 · {what} | `{what}` | §5.10 도구 표 · `toolNotes.fills` |
| `3.3.tool.common.mrsdLine` | 이 제형의 MRSD {mrsd} mg | `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdLine` (Claude 수정) |
| `3.3.tool.common.mrsdOk` | {dose} mg 은 MRSD {mrsd} mg 이하예요. 1상 시작 용량으로 쓸 수 있어요. | `{dose}` · `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdOk` |
| `3.3.tool.common.mrsdOver` | {dose} mg 은 MRSD {mrsd} mg 을 넘어요. 이대로 내면 규칙 검사에서 보완 요구를 받아요. | `{dose}` · `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdOver` |
| `3.3.tool.common.mrsdNone` | 동물실험 결과가 없어서 MRSD 를 아직 몰라요. | — | `toolNotes.mrsdNone` (Claude 보충) |
| `3.3.tool.common.noGrid` | 이 후보의 물성을 아직 읽지 못했어요. 그래서 도구를 그릴 수 없어요. | — | `toolNotes.noGrid` (Claude 보충) |
| `3.3.tool.common.brainPop` | 고른 환자군은 약이 뇌까지 가야 해요. 그래서 뇌 노출 B(약이 혈액뇌장벽, 즉 뇌를 지키는 거름막을 지나 뇌에 닿는 정도)가 효능 E 에 곱해져요. | — | §5.10 · game-rules `bbb` · `toolNotes.brainPop` (Claude 수정) |
| `3.3.tool.common.knobs` | 제형 · 용량 · 후보 · 환자군 | — | 6.05 · `toolNotes.knobForm` · `knobDose` · `knobCandidate` · `knobPopulation` (Claude 보충) |
| `3.3.tool.common.gate.ind` | IND | — | 6.05 관문 신호 · `gates.ind` (검증 보충) |
| `3.3.tool.common.gate.phase1` | 1상(참고) | — | 6.05 · §5.14 · `gates.phase1` (검증 보충) |
| `3.3.tool.common.gate.phase2` | 2상(참고) | — | 6.05 · §5.14 · `gates.phase2` (검증 보충) |
| `3.3.tool.common.gate.phase3` | 3상(참고) | — | 6.05 · §5.14 · `gates.phase3` (검증 보충) |
| `3.3.tool.common.role.lead` | 주력 | — | 6.05 후보 손잡이 · §5.9 ⑤ · `roles.lead` (검증 보충) |
| `3.3.tool.common.role.backup` | 백업 | — | 6.05 후보 손잡이 · §5.9 ⑤ · `roles.backup` (검증 보충) |
| `3.3.form.oral.label` | 먹는 알약(경구) | — | §5.10 뼈대 · `forms.oral.label` (Claude 보충) |
| `3.3.form.iv.label` | 정맥 주사(핏줄에 바로 넣기) | — | §5.10 뼈대 · `forms.iv.label` (Claude 보충) |
| `3.3.form.transdermal.label` | 붙이는 패치(경피, 피부로 스며들기) | — | §5.10 뼈대 · `forms.transdermal.label` (Claude 보충) |
| `3.3.tool.lab.tab` | what-if 실험실 | — | §5.10 도구 표 · 6.05 · `tools.lab.tab` |
| `3.3.tool.lab.question` | 제형 · 용량 · 후보 · 환자군 손잡이를 바꾸면 효능 E 와 안전 S 예상치가 어떻게 달라질까요? | — | §5.10 도구 표 · 6.05 · `tools.lab.question` |
| `3.3.tool.lab.howToRead` | 손잡이 네 개를 움직여 보세요. E · S 게이지와 관문 신호(IND S ≥ 35 · 1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 그리고 S ≥ 55)가 바로 바뀌어요. 1상부터는 참고용 신호예요. 그 제형의 MRSD 선도 함께 보여요. | — | §5.10 도구 표 · 6.05 · game-rules `thresholds` (Claude 수정) |
| `3.3.tool.lab.fills` | ③ 제형 · ⑤ 시작 용량 초안 | — | §5.10 도구 표 · 6.05 · `tools.lab.fills` |
| `3.3.tool.lab.lesson` | 손잡이 네 개의 힘은 서로 달라요. 용량과 분자의 위험 신호가 안전 S 를 크게 흔들어요. 분자의 위험 신호는 hERG 위험(심장 박동을 조절하는 통로를 막아 심장 리듬을 흐트러뜨릴 위험)과 간 위험이에요. | — | 6.05 시안 배울 점 · game-rules `risk`(hERG 0 / 0.3 / 0.6 · 간 0 / 0.25 / 0.6) (Claude 수정) (검증 수정) |
| `3.3.tool.seesaw.tab` | 효능 · 안전 시소 | — | §5.10 도구 표 · 6.04 · `tools.seesaw.tab` |
| `3.3.tool.seesaw.question` | 용량과 제형을 바꾸면 효능 E 와 안전 S 중에서 무엇을 얻고 무엇을 잃을까요? | — | §5.10 도구 표 · 6.04 · `tools.seesaw.question` |
| `3.3.tool.seesaw.howToRead` | 왼쪽 접시는 효능 E, 오른쪽 접시는 안전 S 예요. 용량(10 · 50 · 100 mg)과 제형 단추를 눌러 시소가 어느 쪽으로 기우는지 비교해 보세요. | — | §5.10 도구 표 · 6.04 · `toolNotes.seesawNote` |
| `3.3.tool.seesaw.fills` | ⑤ 용량 근거 | — | §5.10 도구 표 · 6.04 · `tools.seesaw.fills` |
| `3.3.tool.seesaw.lesson` | 용량은 효능 E 와 안전 S 를 함께 좋게 만들 수 없는 저울이에요. 용량을 올리면 E 는 오르고 S 는 내려가요. | — | 6.04 시안 배울 점 (Claude 수정) |
| `3.3.tool.peak.tab` | 피크 곡선 | — | §5.10 도구 표 · 6.06 · `tools.peak.tab` |
| `3.3.tool.peak.question` | 같은 용량이라도 제형에 따라 몸이 한꺼번에 받는 부담의 꼭대기(피크)가 어떻게 다를까요? | — | §5.10 도구 표 · 6.06 · `tools.peak.question` |
| `3.3.tool.peak.howToRead` | 꼭대기 높이는 용량 부담 Dt 에 제형의 피크 K 를 곱한 값이에요. 피크 K 는 경구 ×1.00 · 정맥 ×1.25 · 경피 ×0.75 예요. 꼭대기가 IND 한계선 아래에 있는지 확인해 보세요. | — | §5.10 도구 표 · 6.06 · game-rules `formulationPeak` (Claude 수정) |
| `3.3.tool.peak.limit` | IND 한계 {v} = (100 − {min}) ÷ 위험 배율 {rk} | `{v}` · `{min}` · `{rk}` | 6.06 · `toolNotes.peakLimit`(코드가 `min: rules.thresholds.ind` 로 채움) (Claude 보충) (검증 수정) |
| `3.3.tool.peak.mrsd` | {form} MRSD {mrsd} mg 의 부담 | `{form}` · `{mrsd}` | 6.06 · `toolNotes.peakMrsd` (Claude 보충) |
| `3.3.tool.peak.concept` | 곡선 모양은 이해를 돕는 개념 그림이에요. 실제로 잰 약물 농도 곡선이 아니에요. 꼭대기 높이(Dt × K)만 게임 규칙 값이에요. | — | 6.06 시안 메모 · `toolNotes.peakConcept` (Claude 수정) |
| `3.3.tool.peak.fills` | ③ 제형 근거 | — | §5.10 도구 표 · 6.06 · `tools.peak.fills` |
| `3.3.tool.peak.lesson` | 정맥 주사는 약이 한꺼번에 들어가서 꼭대기가 높아요. 경피 패치는 천천히 스며들어 꼭대기가 낮아요. 같은 용량이라도 꼭대기가 한계선을 넘으면 S 가 IND 기준보다 낮아져요. | — | 6.06 시안 배울 점 · 한계선 = (100 − 기준) ÷ Rk (Claude 수정) (검증 수정) |
| `3.3.tool.dose.tab` | 용량-반응 3장 | — | §5.10 도구 표 · 6.07 · `tools.dose.tab` |
| `3.3.tool.dose.question` | 경구 · 정맥 · 경피 세 제형에서 효능 E 선과 안전 S 선은 어디서 엇갈릴까요? | — | §5.10 도구 표 · 6.07 · `tools.dose.question` |
| `3.3.tool.dose.howToRead` | 가로는 용량(mg), 세로는 점수(0~100)예요. 세로 점선은 그 제형의 MRSD 예요. 점선 왼쪽에서 E 와 S 가 함께 높은 곳을 찾아보세요. | — | §5.10 도구 표 · 6.07 · `toolNotes.doseNote` (Claude 수정) |
| `3.3.tool.dose.zone` | 3상권 = 흔들림 전 E ≥ 45 · S ≥ 55(참고) | — | 6.07 시안 범례 · game-rules `thresholds.phase3` (Claude 보충) |
| `3.3.tool.dose.fills` | ③ · ⑤ 비교 근거 | — | §5.10 도구 표 · 6.07 · `tools.dose.fills` (Claude 수정) |
| `3.3.tool.dose.lesson` | 어느 제형이든 용량이 커지면 E 선은 오르고 S 선은 내려가요. 제형을 바꾸면 두 선의 높이가 달라져서, 둘이 엇갈리는 자리가 옮겨 가요. | — | 6.07 시안 배울 점 (Claude 수정) |
| `3.3.tool.plane.tab` | E–S 평면 | — | §5.10 도구 표 · 6.02 · `tools.plane.tab` |
| `3.3.tool.plane.question` | 9가지 조합(제형 3 × 용량 3) 가운데 IND 기준선(S 35)보다 오른쪽에 있는 점은 무엇일까요? | — | §5.10 도구 표 · 6.02 · `tools.plane.question` |
| `3.3.tool.plane.howToRead` | 가로는 안전 S, 세로는 효능 E 예요. 점 모양은 제형이에요(● 경구 · ■ 정맥 · ▲ 경피). 1상부터의 기준선은 참고용이에요(임상 설계는 4.1 에서 해요). 점을 누르면 그 조합을 고를 수 있어요. | — | §5.10 도구 표 · 6.02 · `toolNotes.planeNote` (Claude 수정) |
| `3.3.tool.plane.pick` | 고른 점: {form} {dose} mg — E {e} · S {s} | `{form}` · `{dose}` · `{e}` · `{s}` | 6.02 · `toolNotes.planePick` (Claude 보충) |
| `3.3.tool.plane.apply` | 이 조합을 신청서에 넣기 | — | 6.02 · `toolNotes.planeApply` (Claude 보충) |
| `3.3.tool.plane.applied` | 신청서에 넣은 조합과 같아요. | — | 6.02 · `toolNotes.planeApplied` (Claude 보충) |
| `3.3.tool.plane.fills` | 고른 제형 · 용량 | — | §5.10 도구 표 · 6.02 · `tools.plane.fills` (Claude 수정) |
| `3.3.tool.plane.lesson` | 용량을 10 → 50 → 100 mg 으로 올리면 점은 늘 왼쪽 위로 움직여요. 효능 E 를 얻는 대신 안전 S 를 잃기 때문이에요. | — | 6.02 시안 배울 점 (검증 수정) |
| `3.3.tool.waterfall.tab` | 공식 폭포 | — | §5.10 도구 표 · 6.03 · `tools.waterfall.tab` |
| `3.3.tool.waterfall.question` | 우리가 고른 조합의 E 와 S 는 100점에서 출발해 어떤 재료 때문에 깎였을까요? | — | §5.10 도구 표 · 6.03 · `tools.waterfall.question` |
| `3.3.tool.waterfall.eLabel` | 효능 E — 곱해서 깎여요 | — | 6.03 · `toolNotes.waterfallE` (Claude 보충) |
| `3.3.tool.waterfall.sLabel` | 안전 S — 빼서 깎여요 | — | 6.03 · `toolNotes.waterfallS` (Claude 보충) |
| `3.3.tool.waterfall.howToRead` | 효능 E 는 100점에 결합력 점수(0.3 + 0.7 × p) · 흡수 A · 뇌 노출 B · 용량 효능 De 를 차례로 곱해서 깎여요. 안전 S 는 100점에서 '용량 부담 Dt × 위험 배율(1 + hERG + 간) × 피크 K'를 빼서 깎여요. 이 공식은 교육용으로 단순하게 만든 것이에요. | — | 6.03 · game-rules `efficacy` · `risk` (Claude 수정) |
| `3.3.tool.waterfall.fills` | ⑥ 예상 위험 · 감시 계획 | — | §5.10 도구 표 · 6.03 · `tools.waterfall.fills` |
| `3.3.tool.waterfall.lesson` | 안전 S 의 빨간 칸은 모두 용량 부담 Dt 에 곱해져서 생겨요. 그래서 용량을 줄이면 빨간 칸이 한꺼번에 줄어들어요. | — | 6.03 시안 메모 · `toolNotes.waterfallNote` (Claude 수정) |

## C. 임상시험 계획 승인 신청서 칸 ①~⑦

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.doc.heading` | 임상시험 계획 승인 신청서 | — | §5.10 · `doc.heading` (Claude 보충) |
| `3.3.doc.planEmpty` | 아직 조합을 고르지 않았어요. E–S 평면에서 점을 눌러 골라 보세요. | — | `doc.planEmpty` (Claude 보충) |
| `3.3.doc.lockedStep` | 3.2 에서 주력을 정하고 동물실험을 끝내면 신청서를 쓸 수 있어요. 도구와 연구 노트는 미리 볼 수 있어요. | — | §5.10 규칙 ① · `doc.lockedStep` (Claude 보충) |
| `3.3.doc.newDoc` | 새 신청서 쓰기 | — | `doc.newDoc` (검증 보충) |
| `3.3.doc.newDocHint` | 신청서는 모둠에 하나만 만들어져요. 누가 눌러도 모둠원 모두가 같은 신청서를 함께 써요. | — | §5.10 칸 분담 · `doc.newDocHint` (검증 보충) |
| `3.3.doc.planTitle` | 고른 조합 | — | 6.02 · `doc.planTitle` (검증 보충) |
| `3.3.doc.pick` | 골라 주세요 | — | `doc.pick` (검증 보충) |
| `3.3.doc.candidate` | 후보 | — | `doc.candidate` (검증 보충) |
| `3.3.doc.serverFill` | 서버가 채운 값 | — | §5.10 '서버가 채우는 것' · `doc.serverFill` (검증 보충) |
| `3.3.doc.planCandidateGone` | (지금은 주력 · 백업이 아니에요) | — | §5.10 칸 ① 규칙 · `doc.planCandidateGone` (검증 보충) |
| `3.3.part.cover.title` | ① 표지 | — | §5.10 신청서 칸 ① · `parts.cover.title` (Claude 보충) |
| `3.3.part.cover.guide` | 신청인 · 코드명 · 특허 번호 · 신청 단계(제1상) · 기전 한 줄은 서버가 채워 줘요. 기전은 약이 몸에서 효과를 내는 원리예요. 여러분은 시험 제목만 쓰면 돼요. | — | §5.10 신청서 칸 ① · `parts.cover.guide` (Claude 수정) |
| `3.3.part.plan.title` | ② 개발 계획 | — | §5.10 신청서 칸 ② · `parts.plan.title` (Claude 보충) |
| `3.3.part.plan.guide` | 서버가 채운 표적 · 질환을 보고 써요. 왜 이 약이 필요한지와 1~3상 계획을 3~5줄로 적어요. | — | §5.10 신청서 칸 ② · `parts.plan.guide` (Claude 수정) |
| `3.3.part.form.title` | ③ 임상시험용 의약품(제형) | — | §5.10 신청서 칸 ③ · `parts.form.title` (Claude 보충) |
| `3.3.part.form.guide` | 제형을 고르고 근거를 2줄로 써요. 피크 곡선 · 용량-반응 도구와 경피 투과 신호를 근거로 쓸 수 있어요. | — | §5.10 신청서 칸 ③ · `parts.form.guide` (Claude 수정) |
| `3.3.part.nonclinical.title` | ④ 비임상 시험 요약 | — | §5.10 신청서 칸 ④ · `parts.nonclinical.title` (Claude 보충) |
| `3.3.part.nonclinical.guide` | 비임상 시험은 사람에게 쓰기 전에 동물 등으로 하는 시험이에요. 서버가 붙인 NOAEL(부작용이 보이지 않은 가장 높은 용량) · 효력 · 소견 · 사용 마릿수를 보고 결과를 3~5줄로 해석해요. HED(사람 등가 용량)와 MRSD 는 직접 계산해 적어요. | — | §5.10 신청서 칸 ④ · `parts.nonclinical.guide` · 첫 등장 풀이 (Claude 수정) (검증 수정) |
| `3.3.part.protocol.title` | ⑤ 임상시험 계획서(1상 요약) | — | §5.10 신청서 칸 ⑤ · `parts.protocol.title` (Claude 보충) |
| `3.3.part.protocol.guide` | 1상의 1차 평가지표는 늘 '안전성 · 이상사례'예요. 여기서는 대상과 이유, 중단 기준을 써요. 다음 상의 환자군과 1차 평가지표는 목록에서 골라요. | — | §5.10 신청서 칸 ⑤ · `parts.protocol.guide` (Claude 수정) |
| `3.3.part.risk.title` | ⑥ 위험 관리 · 피험자 보호 | — | §5.10 신청서 칸 ⑥ · `parts.risk.title` (Claude 보충) |
| `3.3.part.risk.guide` | 피험자는 시험에 참여하는 사람이에요. 예상 위험과 감시 계획, 동의 설명문 핵심 3줄, IRB(임상시험심사위원회) 심의를 써요. | — | §5.10 신청서 칸 ⑥ · `parts.risk.guide` (Claude 수정) |
| `3.3.part.pledge.title` | ⑦ 서약 | — | §5.10 신청서 칸 ⑦ · `parts.pledge.title` (Claude 보충) |
| `3.3.part.pledge.guide` | 두 가지 약속에 모두 체크해야 접수할 수 있어요. 첫째 약속은 미국 규정 21 CFR 312.23(a)(1)(iii)에 있는 내용이에요. | — | §5.10 신청서 칸 ⑦ · `parts.pledge.guide` (Claude 수정) |
| `3.3.part.shareHint` | ③ · ④ · ⑤ · ⑥ 칸은 모둠원이 나눠 쓸 수 있어요. 칸마다 따로 저장돼요. | — | §5.10 칸 분담 (Claude 보충) |
| `3.3.sec.title.label` | 시험 제목 | — | `sections.title.label` (Claude 보충) |
| `3.3.sec.title.guide` | 무엇을, 누구에게, 몇 상으로 시험하는지 한 줄로 적어요. | — | §5.10 신청서 칸 ① · `sections.title.guide` (Claude 수정) |
| `3.3.sec.title.example` | 예: 경도 알츠하이머병 환자를 위한 {code} 경구 제형의 첫 사람 시험(제1상) | `{code}` | §5.10 신청서 칸 ① · `sections.title.placeholder` (Claude 수정) |
| `3.3.sec.dev_plan.label` | 개발 계획 | — | `sections.dev_plan.label` (Claude 보충) |
| `3.3.sec.dev_plan.guide` | 왜 새 약이 필요한지 써요. 그리고 1상(안전성) → 2상(효과 찾기) → 3상(효과 확인) 계획을 3~5줄로 써요. | — | §5.10 신청서 칸 ② · `sections.dev_plan.guide` (Claude 수정) |
| `3.3.sec.dev_plan.example` | 예: 지금 쓰는 약은 증상을 잠시 줄여 줄 뿐이에요. 그래서 원인 표적을 겨냥한 새 약이 필요해요. 1상에서 안전한 용량을 확인하고, 2상에서 환자에게 효과를 살피고, 3상에서 많은 환자로 효과를 확인할 계획이에요. | — | §5.10 신청서 칸 ② · `sections.dev_plan.placeholder` (Claude 수정) |
| `3.3.sec.dev_plan.criterion` | 심사 기준: 개발 계획(질환 · 필요한 이유 · 1~3상 흐름)이 우리 표적 · 질환과 맞나요? | — | §5.10 신청서 칸 ② · `checklist.plan_fits` |
| `3.3.sec.form_reason.label` | 제형을 고른 근거(2줄) | — | `sections.form_reason.label` (Claude 보충) |
| `3.3.sec.form_reason.guide` | 왜 이 제형을 골랐는지 2줄로 써요. 흡수 신호, 경피 투과 신호, 피크 K, 예상 E · S 를 근거로 들어요. | — | §5.10 신청서 칸 ③ · `sections.form_reason.guide` (Claude 수정) |
| `3.3.sec.form_reason.example` | 예: 경구 흡수 신호가 '좋음'이고 피크 K 가 ×1.00 이라 정맥(×1.25)보다 꼭대기 부담이 낮아요. 경구 50 mg 은 MRSD 이하이고 예상 S 가 IND 기준 35 를 넘어요. | — | §5.10 신청서 칸 ③ · `sections.form_reason.placeholder` (Claude 수정) |
| `3.3.sec.form_reason.criterion` | 심사 기준: 제형 근거가 도구 결과(흡수 · 경피 투과 신호 · 피크 K · 예상 E · S)와 맞나요? 경피 투과가 '부적합'인 분자는 경피로 고를 수 없어요. | — | §5.10 신청서 칸 ③ · `checklist.form_reason_fits` (Claude 수정) |
| `3.3.sec.nonclinical.label` | 동물실험 해석(3~5줄) | — | `sections.nonclinical.label` (Claude 보충) |
| `3.3.sec.nonclinical.guide` | 랫드(실험용 큰 쥐)와 개 중 어느 쪽이 더 민감했는지 써요. NOAEL 과 소견도 해석해요. 소견에는 간 수치 상승이나 심전도 QT(심장이 한 번 뛰고 다시 회복하기까지 걸리는 시간) 연장 같은 것이 있어요. | — | §5.10 신청서 칸 ④ · §5.9 ④ 주요 소견 · `sections.nonclinical.guide` · QT 첫 등장 풀이 (Claude 수정) (검증 수정) |
| `3.3.sec.nonclinical.example` | 예: 개가 랫드보다 더 민감했어요(개 NOAEL 18 mg/kg/일). 높은 용량의 개에서 QT 간격이 늘어나는 소견이 있었어요. 그래서 1상은 MRSD 이하로 시작하고 심전도를 자주 확인할 거예요. | — | §5.10 신청서 칸 ④ · §5.9 예시(개 NOAEL 18) · `sections.nonclinical.placeholder` (Claude 수정) |
| `3.3.sec.nonclinical.criterion` | 심사 기준: 해석이 실제 소견과 맞나요? 간 소견이 있는데 '독성 없음'이라고 쓰면 앞뒤가 맞지 않아요. | — | §5.10 신청서 칸 ④ · `checklist.nonclinical_consistent` |
| `3.3.sec.calc_hed.label` | HED(mg/kg) — 직접 계산 | — | `sections.calc_hed.label` (Claude 보충) |
| `3.3.sec.calc_hed.guide` | HED(사람 등가 용량)는 NOAEL ÷ 환산 계수(랫드 6.2 · 개 1.8)로 구해요. 두 종 가운데 더 낮은 값을 적어요. 더 민감한 종을 기준으로 삼는 거예요. | — | §5.9 · `sections.calc_hed.guide` (Claude 수정) |
| `3.3.sec.calc_hed.example` | 예: 10.0 | — | `sections.calc_hed.placeholder` |
| `3.3.sec.calc_mrsd.label` | 고른 제형의 MRSD(mg) — 직접 계산 | — | `sections.calc_mrsd.label` (Claude 보충) |
| `3.3.sec.calc_mrsd.guide` | 경구 MRSD 는 HED ÷ 안전계수 × 60 kg 으로 구해요. 안전계수는 기본 10 이고, 3.2 에서 마릿수를 '적게'로 했다면 20 이에요. 정맥 · 경피를 골랐다면 3.2 결과판의 제형별 MRSD 를 보고 적어요. 이 게임은 제형마다 피크 K 가 달라 MRSD 도 달라져요. | — | §5.9(안전계수 기본 10 · 마릿수 '적게'면 20) · `PRECLINICAL_RULES.mrsdOf` · `SAFETY_FACTOR` · `sections.calc_mrsd.guide` (Claude 수정) (검증 수정) |
| `3.3.sec.calc_mrsd.example` | 예: 60 | — | `sections.calc_mrsd.placeholder` |
| `3.3.sec.subject.label` | 대상과 이유 | — | `sections.subject.label` (Claude 보충) |
| `3.3.sec.subject.guide` | 1상 대상(건강한 지원자 또는 환자)과 그 이유를 적어요. 시작 용량은 위에서 고른 조합을 따라요. | — | §5.10 신청서 칸 ⑤ · `sections.subject.guide` (Claude 수정) |
| `3.3.sec.subject.example` | 예: 건강한 성인 지원자로 해요. 1상은 먼저 안전성을 보는 시험이에요. 원래 앓던 병이 없는 사람이어야 부작용을 약 때문인지 가려내기 쉬워요. | — | §5.10 신청서 칸 ⑤ · `sections.subject.placeholder` (Claude 수정) |
| `3.3.sec.subject.criterion` | 심사 기준: 대상과 그 이유가 1상의 목적(안전성 · 이상사례 확인)과 맞나요? | — | §5.10 신청서 칸 ⑤ · `checklist.subject_reason` |
| `3.3.sec.population.label` | 다음 상의 환자군 | — | §5.10 칸 ⑤ · `doc.population` (Claude 보충) |
| `3.3.sec.endpoint.label` | 다음 상의 1차 평가지표 | — | §5.10 칸 ⑤ · `doc.endpoint` (Claude 보충) |
| `3.3.sec.phase1Endpoint.label` | 1상 1차 평가지표 — 안전성 · 이상사례(정해져 있어요) | — | §5.10 칸 ⑤ · `IND_PHASE1_ENDPOINT` · `doc.phase1Endpoint` (Claude 보충) |
| `3.3.sec.stop_rule.label` | 중단 기준 | — | `sections.stop_rule.label` (Claude 보충) |
| `3.3.sec.stop_rule.guide` | 무엇을 재서, 얼마가 넘으면, 무엇을 멈출지 적어요. | — | §5.10 신청서 칸 ⑤ · `sections.stop_rule.guide` (Claude 수정) |
| `3.3.sec.stop_rule.example` | 예: 심전도에서 QTc(심장이 한 번 뛰고 다음 박동을 준비하기까지 걸리는 시간을 심박수로 보정한 값)가 500 ms 를 넘으면 그 용량 단계를 멈춰요. 간 효소 ALT(간세포가 다치면 핏속에 늘어나는 효소)가 정상 상한의 3배를 넘어도 멈춰요. | — | §5.10 신청서 칸 ⑤ · `sections.stop_rule.placeholder` · 숫자는 설계 밖 예시 — review ⑥ (Claude 수정) |
| `3.3.sec.stop_rule.criterion` | 심사 기준: 중단 기준이 구체적인가요? 무엇을 재서 · 얼마면 · 무엇을 멈추는지가 분명해야 해요. | — | §5.10 신청서 칸 ⑤ · `checklist.stop_specific` |
| `3.3.sec.risk_monitor.label` | 예상 위험과 감시 | — | `sections.risk_monitor.label` (Claude 보충) |
| `3.3.sec.risk_monitor.guide` | 위험이 '보통' 이상이면 꼭 써요. hERG 위험이면 심전도로 QT 를 감시하고, 간 위험이면 간 수치를 감시해요. | — | §5.10 신청서 칸 ⑥ · `sections.risk_monitor.guide` (Claude 수정) |
| `3.3.sec.risk_monitor.example` | 예: hERG 위험이 '높음'이고 개에서 QT 소견도 있었어요. 그래서 약을 주기 전과 꼭대기 시간에 심전도로 QT 간격을 재요. 간 위험도 '보통'이라 매주 피검사로 간 수치를 확인해요. | — | §5.10 신청서 칸 ⑥ · 시안 6.03 예시 분자(hERG 높음 · 간 보통) · ④ 예시와 같은 분자 · `sections.risk_monitor.placeholder` (Claude 수정) (검증 수정) |
| `3.3.sec.risk_monitor.criterion` | 심사 기준: 감시 계획이 위험 신호 · 동물실험 소견과 맞나요? 위험이 낮으면 일반 감시로 충분해요. | — | §5.10 신청서 칸 ⑥ · `checklist.monitor_fits` (Claude 수정) |
| `3.3.sec.consent.label` | 동의 설명문 핵심 3줄 · IRB | — | `sections.consent.label` (Claude 보충) |
| `3.3.sec.consent.guide` | 참여자가 꼭 알아야 할 세 가지(시험 목적 · 예상 위험 · 언제든 그만둘 수 있음)를 써요. IRB(임상시험심사위원회, 시험이 안전하고 윤리적인지 미리 심사하는 위원회) 심의도 적어요. | — | §5.10 신청서 칸 ⑥ · `sections.consent.guide` (Claude 수정) |
| `3.3.sec.consent.example` | 예: ① 이 시험은 새 약 후보를 사람에게 처음 써서 안전한지 확인해요. ② 심장 리듬 변화 같은 부작용이 생길 수 있어 자주 검사해요. ③ 언제든 불이익 없이 그만둘 수 있어요. 이 계획은 IRB 심의를 먼저 받아요. | — | §5.10 신청서 칸 ⑥ · `sections.consent.placeholder` (Claude 수정) |
| `3.3.sec.consent.criterion` | 심사 기준: 동의 설명문 핵심 세 가지(목적 · 위험 · 언제든 그만둘 수 있음)와 IRB 심의가 모두 있나요? | — | §5.10 신청서 칸 ⑥ · `checklist.consent_clear` |
| `3.3.sec.pledge_hold.label` | IND 승인 전에는 사람에게 시험하지 않아요(21 CFR 312.23(a)(1)(iii)). | — | §5.10 신청서 칸 ⑦ · `sections.pledge_hold.label` (Claude 수정) |
| `3.3.sec.pledge_report.label` | 결과가 나빠도 숨기지 않고 보고해요. | — | §5.10 신청서 칸 ⑦ · `sections.pledge_report.label` (Claude 수정) |
| `3.3.sec.pledge.checked` | 체크했어요 | — | `doc.pledgeOn` (Claude 보충) |

## D. 규칙 검사(즉시 · 무료)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.rule.title` | 규칙 검사 미리 보기 | — | §5.11 ① · `doc.rulesTitle` (Claude 보충) |
| `3.3.rule.hint` | [서류 심사 받기]를 누르면 규칙 검사를 먼저 해요. 하나라도 걸리면 AI 심사 없이 바로 보완으로 돌아와요. 이때는 돈도 횟수도 들지 않아요. | — | §5.11 ① · `doc.rulesHint` (Claude 보충) |
| `3.3.rule.lead_valid.ok` | 3.2 에서 정한 주력(또는 백업) 분자예요. 유효 특허와 동물실험 결과가 모두 있어요. | — | §5.10 칸 ① 규칙 · `rules.leadOk` (Claude 수정) |
| `3.3.rule.lead_valid.not_designated` | 3.2 에서 정한 주력 · 백업 분자가 아니에요. 후보를 다시 확인해 주세요. | — | `rules.lead.not_designated` |
| `3.3.rule.lead_valid.patent_inactive` | 이 분자의 특허가 유효하지 않아요. 유효 특허가 있는 분자만 신청할 수 있어요. | — | `rules.lead.patent_inactive` |
| `3.3.rule.lead_valid.no_animal` | 이 분자는 아직 3.2 동물실험을 끝내지 않았어요. 동물실험을 먼저 끝내 주세요. | — | `rules.lead.no_animal` |
| `3.3.rule.plan_complete.ok` | 제형 · 용량 · 환자군 · 1차 평가지표를 모두 골랐어요. | — | `rules.planOk` (Claude 수정) |
| `3.3.rule.plan_complete.fail` | 아직 고르지 않은 것이 있어요: {what} | `{what}` | `rules.planMissing` (Claude 수정) |
| `3.3.rule.sections_filled.ok` | 꼭 써야 할 칸을 모두 썼어요. | — | `rules.filledOk` |
| `3.3.rule.sections_filled.fail` | 빈 칸이 있어요: {what} | `{what}` | `rules.filledMissing` (Claude 수정) |
| `3.3.rule.transdermal_fit.ok` | 고른 제형이 경피 투과 신호와 맞아요. | — | `rules.transdermalOk` |
| `3.3.rule.transdermal_fit.fail` | 이 분자는 경피 투과가 '부적합'이에요. 피부를 잘 지나가지 못하니 패치 말고 다른 제형을 골라 주세요. | — | §5.10 칸 ③ 규칙 · `rules.transdermalBad` |
| `3.3.rule.calc_match.ok` | ④ 계산 칸(HED · MRSD)이 서버 값과 맞아요. | — | `rules.calcOk` |
| `3.3.rule.calc_match.fail` | ④ 계산 칸이 서버 값과 달라요: {which}. 환산 계수(랫드 6.2 · 개 1.8)와 안전계수, 고른 제형의 MRSD 를 다시 확인해 보세요. | `{which}` | §5.9 · `rules.calcBad` |
| `3.3.rule.calc_match.no_animal` | 동물실험 결과가 없어서 HED · MRSD 를 확인할 수 없어요. | — | `rules.noAnimal` |
| `3.3.rule.dose_le_mrsd.ok` | 시작 용량 {dose} mg 은 {form} MRSD {mrsd} mg 이하예요. | `{dose}` · `{form}` · `{mrsd}` | §5.10 칸 ⑤ 규칙 · `rules.doseOk` (Claude 수정) |
| `3.3.rule.dose_le_mrsd.fail` | 시작 용량 {dose} mg 이 {form} MRSD {mrsd} mg 을 넘어요. 용량을 낮추거나 꼭대기 부담이 낮은 제형으로 바꿔 주세요. | `{dose}` · `{form}` · `{mrsd}` | §5.10 칸 ⑤ 규칙 · `rules.doseOver` |
| `3.3.rule.dose_le_mrsd.noPlan` | 제형과 용량을 먼저 골라야 MRSD 와 견줄 수 있어요. | — | `rules.doseNoPlan` |
| `3.3.rule.safety_expected.ok` | 예상 안전 S {s} 는 IND 기준 {min} 이상이에요. | `{s}` · `{min}` | §5.10 심사 흐름 ③ · `rules.safetyOk` (Claude 수정) |
| `3.3.rule.safety_expected.fail` | 예상 안전 S {s} 가 IND 기준 {min} 보다 낮아요. 이 조합으로는 승인받을 수 없어요. | `{s}` · `{min}` | `rules.safetyLow` (Claude 수정) |
| `3.3.rule.safety_expected.unknown` | 예상 안전 S 를 구하지 못했어요. 제형 · 용량 · 물성을 확인해 주세요. | — | `rules.safetyUnknown` (Claude 수정) |
| `3.3.rule.risk_monitor.ok` | 위험 감시 칸을 썼어요({what}). | `{what}` | `rules.monitorOk` (Claude 수정) |
| `3.3.rule.risk_monitor.fail` | 위험이 '보통' 이상이거나 동물실험 소견이 있어요({what}). ⑥ 감시 칸을 꼭 써 주세요. | `{what}` | §5.10 칸 ⑥ 규칙 · `indNeedsMonitoring` · `rules.monitorMissing` (Claude 수정) |
| `3.3.rule.risk_monitor.none` | 위험 신호가 낮고 관련 소견도 없어요. 감시 칸은 비워 둬도 돼요. | — | `indNeedsMonitoring` · `rules.monitorNone` (Claude 수정) |
| `3.3.rule.risk_monitor.qt` | 심전도 QT | — | `rules.monitorQt` (Claude 보충) |
| `3.3.rule.risk_monitor.liver` | 간 수치 | — | `rules.monitorLiver` (Claude 보충) |
| `3.3.rule.pledges.ok` | ⑦ 서약 두 개에 모두 체크했어요. | — | `rules.pledgeOk` |
| `3.3.rule.pledges.fail` | ⑦ 서약 두 개에 모두 체크해야 접수할 수 있어요. | — | `rules.pledgeMissing` (Claude 수정) |

## E. 서류 심사 · 보완 요구

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.review.button` | 서류 심사 받기(무료) | — | §5.10 심사 흐름 ① · `doc.reviewBtn` (Claude 보충) |
| `3.3.status.draft` | 초안 | — | `status.draft` (Claude 보충) |
| `3.3.status.reviewing` | 서류 심사 중 | — | `status.reviewing` (Claude 보충) |
| `3.3.revise.status` | 보완 요구 | — | §5.10 · `status.revise` · `doc.verdict.revise` (Claude 수정) |
| `3.3.revise.statusHint` | 지적받은 칸을 고쳐서 다시 심사받으면 돼요. 다시 받는 심사도 무료예요. | — | §5.10 심사 흐름 ① (Claude 보충) |
| `3.3.revise.itemHeader` | AI 심사관의 칸별 지적 | — | §5.11 투명성 · §5.13 'AI 심사' 표시 (Claude 수정) (일관성 수정) |
| `3.3.revise.itemStatus.ok` | 문제 없어요 | — | §5.11 `ok` (Claude 수정) |
| `3.3.revise.itemStatus.missing` | 빠졌어요 — 꼭 들어가야 할 내용이 없어요. | — | §5.11 `missing` (Claude 수정) |
| `3.3.revise.itemStatus.inconsistent` | 앞뒤가 안 맞아요 — 글이 동물실험 소견이나 도구 숫자와 어긋나요. | — | §5.11 `inconsistent` (Claude 수정) |
| `3.3.revise.itemStatus.unclear` | 분명하지 않아요 — 더 구체적으로 써 주세요. | — | §5.11 `unclear` (Claude 수정) |
| `3.3.revise.feedbackHeader` | AI 심사관의 종합 피드백 | — | §5.11 투명성 (Claude 수정) (일관성 수정) |
| `3.3.revise.appeal` | 심사 결과가 이상하면 선생님께 이의를 낼 수 있어요. 선생님이 고쳐 줄 수 있어요. | — | §5.11 ⑦ 이의 제기 → 교사 정정 (Claude 보충) |
| `3.3.revise.resubmitGuide` | 보완 요구에는 연구비가 들지 않아요. 지적받은 칸을 고친 뒤 [서류 심사 받기(무료)]를 다시 눌러 주세요. | — | §5.10 심사 흐름 ① · `doc.reviewBtn` (Claude 수정) |
| `3.3.revise.staleNotice` | 심사받은 뒤 신청서가 바뀌었어요(심사 판 {a} · 지금 판 {b}). 지금 판으로 다시 심사를 통과해야 접수할 수 있어요. | `{a}` · `{b}` | §5.11 ③ · `doc.reviewStale` (Claude 수정) |
| `3.3.revise.limitNotice` | AI 심사는 신청서 1건당 하루 {n}번, 모둠 전체로 하루 {teamN}번까지 받을 수 있어요. 규칙 검사에서 걸리면 횟수에 세지 않아요. 내용이 바뀌지 않은 신청서는 앞 심사 결과를 그대로 돌려줘요. 이때도 횟수에 세지 않아요. | `{n}` · `{teamN}`(새) | §5.11 횟수 · ③ 캐시 · `apps/server/src/reviews.ts` `requestReview`(`counted = !byRule && !injected && !cached` · 같은 판은 기존 결과) · `REVIEW_LIMITS` · `doc.reviewLimit` (Claude 수정) (검증 수정) |
| `3.3.revise.pendingNotice` | AI 심사관이 신청서를 읽고 있어요. 수 초에서 수십 초 걸려요. 그동안 다른 칸이나 단계를 계속 써도 돼요. | — | §5.11 비동기 · §5.13 · `doc.reviewPending` (Claude 수정) (일관성 수정) |
| `3.3.revise.retryNotice` | AI 심사가 잠시 늦어지고 있어요. '심사 대기'로 두고 다시 시도할게요. 그동안에도 신청서를 고칠 수 있어요. | — | §5.11 ⑥ (Claude 수정 — 원문 `teacherNotice` 를 둘로 나눔) |
| `3.3.revise.teacherNotice` | AI 심사를 할 수 없어서 선생님이 직접 볼 거예요. | — | §5.11 ⑥ · §5.13 거절 · `doc.reviewTeacher` (Claude 수정) |

## F. 서류 통과 → 접수

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.status.passed` | 서류 통과 — 접수할 수 있어요 | — | `status.passed` · `doc.verdict.pass` (Claude 보충) |
| `3.3.submit.passedNotice` | 규칙 검사와 AI 심사를 모두 통과했어요. 이제 수수료를 내고 IND 를 접수할 수 있어요. | — | §5.10 심사 흐름 ② (Claude 수정) |
| `3.3.submit.button` | 접수하기 — 수수료 {fee} | `{fee}` | §5.10 심사 흐름 ② · `doc.submitBtn` |
| `3.3.submit.confirm` | 접수하면 모둠 연구비에서 {fee}가 빠져요. {days}게임 일 뒤에 판정이 나요. 접수한 뒤에는 신청서를 고칠 수 없어요. | `{fee}` · `{days}` | §5.10 심사 흐름 ② · `doc.submitConfirm` (Claude 수정) |
| `3.3.submit.noFunds` | 모둠 연구비가 모자라서 접수할 수 없어요. | — | §5.10 심사 흐름 ② · `doc.noFunds` (검증 보충) |
| `3.3.status.submitted` | 접수 — 판정을 기다려요 | — | `status.submitted` (Claude 보충) |
| `3.3.submit.waiting` | 게임 {from}일 접수 → 게임 {to}일 판정 · {pct}% | `{from}` · `{to}` · `{pct}` | `doc.waiting` (Claude 수정) |
| `3.3.submit.locked` | 접수한 신청서는 고칠 수 없어요. | — | `doc.locked` (Claude 보충) |

## G. 승인 결과판

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.status.approved` | IND 승인 | — | `status.approved` (Claude 보충) |
| `3.3.approval.title` | IND 승인서(임상시험 계획 승인서) | — | §5.10 · `doc.approvedTitle` |
| `3.3.approval.row.candidate` | 후보 물질 | — | `doc.approvalRows.candidate` |
| `3.3.approval.row.form` | 제형 | — | `doc.approvalRows.form` |
| `3.3.approval.row.dose` | 시작 용량 | — | `doc.approvalRows.dose` |
| `3.3.approval.row.phase1Endpoint` | 1상 1차 평가지표 | — | `IndApprovalView.phase1Endpoint` (Claude 보충) |
| `3.3.approval.row.population` | 다음 상의 환자군 | — | `doc.approvalRows.population` (Claude 수정) |
| `3.3.approval.row.endpoint` | 다음 상의 1차 평가지표 | — | `doc.approvalRows.endpoint` (Claude 수정) |
| `3.3.approval.row.score` | 예상 점수(흔들림 없음) | — | `doc.approvalRows.score` (Claude 수정) |
| `3.3.approval.row.day` | 승인일 | — | `doc.approvalRows.day` |
| `3.3.approval.notDrugApprovalNote` | IND 승인은 약을 팔아도 된다는 허가가 아니에요. 사람에게 첫 시험(1상)을 시작해도 된다는 허락이에요. 이 승인서의 제형 · 용량 · 환자군 · 1차 평가지표가 4.1 임상으로 넘어가요. | — | §5.10 완료 조건 · 흔한 오해 · `doc.approvedNote` (Claude 수정) |
| `3.3.approval.phase1Gap` | 흔들림 전 예상치로 보면 1상 참고 기준(S ≥ {p1})까지 {gap} 모자라요. 4.1 임상은 이 승인서의 용량으로 시작해요. 1상이 보류되면 다시 도전할 때 용량이나 제형을 바꿀 수 있어요. | `{p1}` · `{gap}` | §5.9 '1상 기준은 보장하지 않음' · §5.14 ① '승인서 값 고정 · 바꾸려면 재도전 경로로만' · `doc.phase1Gap` (Claude 수정) (검증 수정) |
| `3.3.approval.phase1Ok` | 흔들림 전 예상치로는 1상 참고 기준(S ≥ {p1})도 넘는 조합이에요. 실제 1상 결과는 예상과 달라질 수 있어요. | `{p1}` | `doc.phase1Ok` · §5.14(1상 이후 기준은 참고) (Claude 수정) (검증 수정) |
| `3.3.approval.boardApproved` | ◆ {ticker} IND 승인 — {code} · {disease} 첫 사람 시험 준비 | `{ticker}` · `{code}` · `{disease}` | §5.3 소식 표 · `board.approved` (Claude 수정) |
| `3.3.status.held` | IND 보류 | — | `status.held` (Claude 보충) |
| `3.3.approval.boardHeld` | ◆ {ticker} IND 보류 — {code} · {disease} | `{ticker}` · `{code}` · `{disease}` | §5.3 소식 표 · `board.held` (Claude 수정) |
| `3.3.approval.heldNotice` | 보류됐어요. 선생님과 이유를 확인한 뒤 새 신청서를 쓸 수 있어요. | — | §5.10 심사 흐름 ③(예외) · `doc.heldNote` (Claude 수정) |

## 메모

- 줄 수: 195줄 — Gemini 원문 139줄을 바탕으로 89줄 고침(`(Claude 수정)` 88 + `retryNotice` 1), 55줄 채움(`(Claude 보충)`). 원문의 `tool.peak.howToRead` 는 `peak.howToRead` · `peak.limit` · `peak.mrsd` 로, `revise.teacherNotice` 는 `retryNotice` · `teacherNotice` 로 나눴다.
- 2차 검증 뒤 줄 수: 209줄 — 위 195줄 중 12줄을 고쳤고(`(검증 수정)`), 14줄을 채웠다(`(검증 보충)` — `gates.*` · `roles.*` · `doc.{newDoc, newDocHint, planTitle, pick, candidate, serverFill, planCandidateGone, noFunds}`).
- `{teamN}` 은 새 자리표시자다 — 서버가 모둠 하루 상한(지금 15)을 채운다. 코드에 넣을 때 `doc.reviewLimit` 의 채움 값에 더해야 한다.
- 숫자 15 · 35 · 50 · 6.2 · 1.8 · 60 kg 처럼 문구 안에 박힌 규칙 값은 기존 `IND_COPY` 와 같은 방식(글에 그대로)이다. 서버 값으로 바꾸고 싶으면 review.md ⑥ 확인.

## 반영 메모(2026-10-24)

- 돈 · 기간은 함수 · 상수로 끼웠어요: `overview.summary3` 의 수수료 = `formatCrista(IND_FEE_CRISTA)`, 기간 = `IND_REVIEW_GAME_DAYS`.
- 기준선 숫자를 글에 박지 않았어요: `tool.lab.howToRead` · `tool.plane.question` · `tool.peak.howToRead` · `tool.waterfall.howToRead` 는 `{ind}` `{p1}` `{p2e}` `{p3e}` `{p3s}` · `{kOral}` `{kIv}` `{kTd}` · `{base}` `{w}` 로 바꿔 화면이 서버 규칙 값으로 채워요. `overview.more.misconception` 의 '(참고 기준 S ≥ 50)'은 뺐어요.
- 도구는 `tools.*.howTo` · `lesson`(배울 점 — 접어 보기)으로 넣고, 옛 `toolNotes.seesawNote` · `doseNote` · `planeNote` · `waterfallNote` 는 지웠어요.
- `sec.*.criterion` 은 학생 화면 칸 안내 뒤에 붙였어요. LLM 기준(`IND_COPY.checklist`)은 그대로예요.
- 넣지 않은 키: `revise.appeal`(이의 제기 경로가 아직 없음) · `tool.dose.zone`(쓸 자리 없음) · `revise.itemStatus.*` 의 '— 풀이'(화면 낭독용 짧은 이름만).
- `submit.waiting` 은 용어집대로 'D+' 꼴('{from} 접수 → {to} 판정')을 지켰어요.
- 화면에 박혀 있던 글(판 · 서버가 채운 값 줄 · 도구 그림 이름 · 축 · 범례 · 폭포 단계 이름 · 머리 제목)을 `IND_COPY.facts` · `ui` · `toolNotes` 로 옮겼어요. ④ 서버 첨부의 소견이 영문 id(qt · liver)로 보이던 것을 `PRECLINICAL_COPY.findings` 로 바꿨어요.
- 규칙 문구 · 제형 이름이 LLM 입력(규칙 결과 · 사실)에 들어가서 `IND_REVIEWER_VERSION` 을 `ind-v2` 로 올렸어요.
