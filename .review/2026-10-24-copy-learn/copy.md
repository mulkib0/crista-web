# 학습 연구비 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 원문(`gemini-raw.md` · `agy --model gemini-4-argon-high --effort high --mode plan` · 한 번에 성공) → Claude(Opus 5.5) 검토 · 수정
- 날짜: 2026-10-24
- 상태: **반영됨(2026-10-24 · copy-apply)** — `LEARN_COPY` · `QUANT_LABEL.affinity` · `parts.tsx` `NOTE_PLACEHOLDER`. 새 키(`drawer.path.*` · `tier.*.guide` · `items.reviewGuide` · `shields.earned/used` · `district.*` · `pitch.qual.*` · `result.revisedPaid/None` · `result.aiNote` 등)는 화면에 쓸 자리가 아직 없어 넣지 않았다(보고서 참조).
- 표시: Claude 가 고친 줄은 '근거' 끝에 `(Claude 수정)`, Claude 가 채운 줄은 `(Claude 보충)`. 2차 독립 검증에서 고친 줄은 `(검증 수정)`. 이유는 `review.md`.
- 공통 손질(줄마다 표시하지 않음): 원문이 문구 안 자리표시자를 백틱으로 감싼 것을 모두 벗겼다(화면에 백틱이 찍히지 않게).
- **돈 자리표시자 규칙**: `{c}` · `{max}` · `{used}` · `{cap}` · 예상 투자금 `{min}`/`{max}` 는 화면이 `formatCrista()` 로 채워 **'… 크리스타' 단위가 이미 붙는다**. 그래서 문구에 '크리스타'를 다시 쓰지 않는다. 글자 수 `{min}`/`{max}` 는 숫자만이다.
- 자리표시자: 기존 `LEARN_COPY` 함수 인자 이름을 그대로 쓴다. 새로 만든 것은 `(새)` — `{streak}` · `{ticker}` 둘.

## A. 학습 연구비 전체 안내(S1 · S2)
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.drawer.title` | 학습 · 연구비 | — | 학습 설계 §5 · S2 · `drawerTitle` |
| `learn.drawer.lede` | 문항을 풀고 연구 노트를 평가받으면 우리 모둠 연구비가 늘어나요. 풀지 않아도 다음 단계로 언제든 넘어갈 수 있어요. | — | 학습 설계 §1.2 · S2 · `drawerLede` (Claude 수정) |
| `learn.drawer.path.items` | 단계마다 개념 · 중급 · 심화 문항을 풀어요. 모둠 합계로 한 단계에 최대 800,000 크리스타까지 받아요. | — | 학습 설계 §2.1 · 균형안 §2.1 · S2 (Claude 수정) |
| `learn.drawer.path.notes` | 연구 노트 세 칸을 평가받으면 단계마다 최대 200,000 크리스타를 받아요. 세 칸을 서로 다른 모둠원이 나눠 쓰면 240,000 크리스타까지 받아요. | — | 학습 설계 §2.2 · 균형안 §2.2 · S2 (Claude 수정) |
| `learn.drawer.path.stipend` | 게임 시계가 흐르는 동안 실제 시간 10분마다 기초 연구비가 들어와요. 한 번에 40,000 × 충전 배율 크리스타예요. 한 단계에 두 번까지 들어와요. | — | 학습 설계 §2.3 · 균형안 §2.3 · S2 (Claude 수정) (검증 수정) (일관성 수정) |
| `learn.drawer.path.pitch` | 후보 물질 데이터와 피치 글(투자자를 설득하는 짧은 글)로 Series A · B(회사가 차례로 받는 첫 번째 · 두 번째 큰 투자) 심사를 받아요. Series A 는 최대 15,000,000 크리스타예요. Series B 는 최대 25,000,000 크리스타예요. | — | 학습 설계 §2.4 · 균형안 §3 · S2 (Claude 수정) (검증 수정) |
| `learn.drawer.noLock` | 문항이나 연구 노트 평가를 건너뛰어도 다음 단계로 갈 수 있어요. 다만 다음 실험에 쓸 연구비가 빠듯해질 수 있어요. | — | 학습 설계 §1.2 · S2 · S4 |
| `learn.drawer.teamWallet` | 개인 지갑은 따로 없어요. 내가 받은 보상은 모두 우리 모둠 연구비로 들어가요. | — | 학습 설계 §1.8 · S2 |
| `learn.drawer.perStep` | 단계별 학습 연구비 | — | 학습 설계 §5 · S2 · `perStep` (Claude 수정) |
| `learn.drawer.itemsCap` | 문항 보상 | — | 학습 설계 §5 · S2 · `itemsCap` |
| `learn.drawer.notePaid` | 노트 평가 | — | 학습 설계 §5 · S2 · `notePaid` |
| `learn.totals.title` | 받은 학습 연구비 | — | 학습 설계 §5 · S2 · `totals` (Claude 수정) |
| `learn.totals.items` | 문항 | — | 학습 설계 §5 · S2 · `totalsItems` |
| `learn.totals.notes` | 연구 노트 | — | 학습 설계 §5 · S2 · `totalsNotes` |
| `learn.totals.stipend` | 기초 연구비 | — | 학습 설계 §5 · S2 · `totalsStipend` |
| `learn.totals.pitch` | 투자 유치 | — | 학습 설계 §5 · S2 · `totalsPitch` |
| `learn.totals.corrections` | 선생님 정정 | — | 학습 설계 §4.3 · S2 · `totalsCorrections` |

## B. 문항 3단 안내(S4)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.items.title` | 이 단계 연구 문항 | — | 학습 설계 §2.1 · S4 · `itemsTitle` |
| `learn.items.sub` | 개념 · 중급 · 심화 문항이에요. 지금 풀지 않아도 다음 단계 단추는 언제나 열려 있어요. | — | 학습 설계 §1.2 · §2.1 · S4 · `itemsSub` |
| `learn.tier.concept.name` | 개념 | — | 학습 설계 §2.1 · S4 · `tier.concept` |
| `learn.tier.concept.how` | 바로 채점 | — | 학습 설계 §2.1 · S4 · `tierHow.concept` (Claude 수정) |
| `learn.tier.concept.guide` | 단계마다 두 문항이 나와요. 같은 모둠이어도 사람마다 숫자가 조금씩 달라요. 내면 바로 채점돼요. 문항마다 최대 25,000 크리스타를 받아요. | — | 학습 설계 §2.1 · §3.2 · 균형안 §2.1 · S4 (Claude 수정) (검증 수정) |
| `learn.tier.intermediate.name` | 중급 | — | 학습 설계 §2.1 · S4 · `tier.intermediate` |
| `learn.tier.intermediate.how` | AI 채점 · 우리 모둠 데이터 해석 | — | 학습 설계 §2.1 · S4 · `tierHow.intermediate` |
| `learn.tier.intermediate.guide` | 우리 모둠이 실제로 얻은 값을 읽고 해석해요. 예를 들면 도킹 ΔG(분자가 표적에 붙을 때의 에너지 변화, 값이 낮을수록 단단히 붙음)나 ADMET(흡수 · 분포 · 대사 · 배설 · 독성) 수치예요. {min}~{max}자로 써요. 최대 75,000 크리스타를 받아요. | `{min}` · `{max}` | 학습 설계 §1.1 · §2.1 · 균형안 §2.1 · S4 (Claude 수정) (검증 수정) |
| `learn.tier.advanced.name` | 심화 | — | 학습 설계 §2.1 · S4 · `tier.advanced` |
| `learn.tier.advanced.how` | AI 채점 · 신약 개발 원리와 딜레마 | — | 학습 설계 §2.1 · S4 · `tierHow.advanced` |
| `learn.tier.advanced.guide` | 신약 개발에서 답이 하나로 정해지지 않는 선택을 따져 봐요. 예를 들면 결합력과 간독성 사이의 선택, 물질특허(새 물질 자체를 보호하는 특허)를 언제 낼지 같은 문제예요. {min}~{max}자로 써요. 최대 150,000 크리스타를 받아요. | `{min}` · `{max}` | 학습 설계 §2.1 · 균형안 §2.1 · S4 (Claude 수정) (검증 수정) |
| `learn.items.chars` | {n}자 · {min}~{max}자 | `{n}` · `{min}` · `{max}` | 학습 설계 §2.1 · S4 · `chars` (Claude 수정) |
| `learn.items.submit` | 제출하기 | — | 학습 설계 §2.1 · S4 · `submit` |
| `learn.items.submitText` | 채점받기 | — | 학습 설계 §2.1 · S4 · `submitText` |
| `learn.hint.button` | 힌트 보기 (보상 상한 70%) | — | 학습 설계 §1.6 · S4 · `hint` |
| `learn.hint.used` | 힌트를 봤어요. 이 문항의 최대 보상은 70%로 줄었어요. | — | 학습 설계 §1.6 · S4 · `hintUsed` (Claude 수정) |
| `learn.hint.guide` | 힌트는 문항마다 한 번 무료로 볼 수 있어요. 정답이 아니라 실마리만 알려 줘요. 힌트를 쓰면 그 문항의 최대 보상이 70%로 줄어요. | — | 학습 설계 §1.6 · S4 (Claude 수정) |
| `learn.revise.button` | 고쳐서 한 번 더 내기 (늘어난 만큼만) | — | 학습 설계 §1.3 · §2.1 · S4 · `revise` (Claude 수정) |
| `learn.revise.guide` | 채점 결과를 보고 문항마다 한 번 고쳐 낼 수 있어요. 처음 받은 연구비보다 늘어난 만큼만 더 들어와요. | — | 학습 설계 §1.3 · §2.1 · S4 (Claude 수정) |
| `learn.cap.status` | 이 단계 모둠 문항 보상 {used} / {cap} | `{used}` · `{cap}` | 학습 설계 §2.1 · S2 · S4 · `capLeft` (Claude 수정) |
| `learn.cap.reached` | 이 단계 모둠 문항 보상 상한(800,000 크리스타)에 닿았어요. 지금부터는 연습 모드예요. 채점과 피드백은 그대로 받지만 연구비는 들어오지 않아요. | — | 학습 설계 §2.1 · S4 · `capReached` (Claude 수정) |
| `learn.cap.practiceBadge` | 연습 모드 (채점 · 피드백만) | — | 학습 설계 §2.1 · S4 · `practice` |
| `learn.items.fallback` | 아직 우리 모둠의 실험 결과가 없어서 예시 값으로 물어요. 실험을 마친 뒤에 풀어도 괜찮아요. | — | 학습 설계 §3.2 · S4 · `fallback` |
| `learn.items.reviewGuide` | 70점보다 낮았던 문항은 다음 단계에서 숫자와 묻는 각도를 바꾼 복습 문항으로 다시 나와요. 복습 문항의 최대 보상은 원래의 절반이에요. | — | 학습 설계 §1.4 · 균형안 §2.1 · S4 — W7 구현 뒤에만 노출 (Claude 수정) |

## C. 연구 노트 3칸(S3)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.note.why.title` | ① 왜 골랐나 (가설 · 근거) | — | 학습 설계 §2.2 · 기준 설계 §10 · S3 · `NOTE_SECTION_LABEL.why` |
| `learn.note.why.guide` | 이번 단계에서 우리 모둠이 무엇을 골랐는지, 왜 골랐는지 적어요. 실험에서 얻은 수치를 근거로 함께 쓰면 더 좋아요. | — | 학습 설계 §2.2 · §3.1 · S3 (Claude 수정) |
| `learn.note.why.placeholder` | 어떤 수치와 근거를 보고 이렇게 골랐나요? | — | 학습 설계 §2.2 · S3 · `NOTE_PLACEHOLDER.why` (Claude 수정) |
| `learn.note.unknown.title` | ② 무엇을 모르나 (물성 · 독성 한계) | — | 학습 설계 §2.2 · 기준 설계 §10 · S3 · `NOTE_SECTION_LABEL.unknown` |
| `learn.note.unknown.guide` | 지금 데이터로는 아직 알 수 없는 것을 적어요. 걱정되는 물성이나 독성 위험도 솔직하게 써요. 약점을 정확히 아는 것도 연구 실력이에요. | — | 학습 설계 §2.2 · §3.1 · S3 (Claude 수정) |
| `learn.note.unknown.placeholder` | 아직 확인하지 못한 위험이나 가장 걱정되는 한계는 무엇인가요? | — | 학습 설계 §2.2 · S3 · `NOTE_PLACEHOLDER.unknown` |
| `learn.note.fallback.title` | ③ 실패하면 무엇을 바꾸나 (대안 · 백업) | — | 학습 설계 §2.2 · 기준 설계 §10 · S3 · `NOTE_SECTION_LABEL.fallback` (Claude 수정) |
| `learn.note.fallback.guide` | 다음 단계에서 예상과 다른 결과가 나올 때를 미리 생각해요. 어떤 기준이 되면 후보나 조건을 바꿀지 정해 둬요. | — | 학습 설계 §2.2 · §3.1 · S3 (Claude 수정) |
| `learn.note.fallback.placeholder` | 어떤 결과가 나오면 백업 후보로 바꾸거나 조건을 다시 정할 건가요? | — | 학습 설계 §2.2 · S3 · `NOTE_PLACEHOLDER.fallback` (Claude 수정) |
| `learn.note.button` | 연구 노트 평가받기 (+최대 {max}) | `{max}` | 학습 설계 §2.2 · S3 · `noteButton` (Claude 수정) |
| `learn.note.reviseButton` | 고친 노트 다시 평가받기 (늘어난 만큼만 · 최대 {max}) | `{max}` | 학습 설계 §1.3 · §2.2 · S3 · `noteRevise` (Claude 수정) |
| `learn.note.sharedGuide` | 세 칸을 서로 다른 모둠원이 나눠 쓰면 보상이 ×1.2 가 돼요. 3~4인 모둠은 3명, 2인 모둠은 2명이 칸을 나눠 쓰면 돼요. | — | 학습 설계 §2.2 · 균형안 §2.2 · `noteSharedNeeded` · S3 · `noteShared` (Claude 수정) |
| `learn.note.sharedProgress` | 칸을 쓴 모둠원 {k}/{n}명 | `{k}` · `{n}` | `LearnNoteState.authors` · `sharedNeeded` · S3 (Claude 보충) |
| `learn.note.sharedOn` | 분담 작성 ×1.2 적용 (최대 240,000 크리스타) | — | 학습 설계 §2.2 · S3 · `noteSharedOn` (Claude 수정) |
| `learn.note.done` | 이 단계 연구 노트 평가를 두 번 모두 받았어요. | — | 학습 설계 §2.2 · S3 · `noteDone` (Claude 수정) |
| `learn.note.pending` | AI 가 우리 모둠 연구 노트를 읽고 있어요. 몇 초에서 몇십 초 걸려요. | — | 학습 설계 §4.1 · S3 · `notePending` (Claude 수정) |
| `learn.note.tooShort` | 세 칸을 합쳐 30자 이상 써 주세요. 근거나 대안을 한 문장씩 더 보태 볼까요? | — | `LEARN_TEXT_LIMITS.noteTotalMin` · S3 · `noteTooShort` |
| `learn.note.pitchLink` | 단계마다 적어 둔 연구 노트는 Series A · B 투자 심사의 정성 평가(30점)에도 반영돼요. | — | 학습 설계 §2.2 · §2.4 · S2 · S3 |

## D. 기초 연구비 충전(S1 · S2)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.stipend.title` | 기초 연구비 | — | 학습 설계 §2.3 · S2 · `stipend` |
| `learn.stipend.help` | 게임 시계가 흐르는 동안 실제 시간 10분마다 40,000 × 충전 배율 크리스타가 들어와요. 한 단계에서는 두 번(20분 분량)까지만 들어와요. 모둠원 모두가 가동하면 남은 몫을 기다리지 않고 바로 받아요. | — | 학습 설계 §2.3 · 균형안 §2.3 · S2 · `stipendHelp` (Claude 수정) (일관성 수정) |
| `learn.stipend.nextTick` | 다음 충전까지 | — | 학습 설계 §2.3 · S2 · `nextTick` |
| `learn.stipend.ticksDone` | 이 단계 기초 연구비 충전 끝 (2/2) | — | 학습 설계 §2.3 · S2 · `ticksDone` (Claude 수정) |
| `learn.stipend.paused` | 게임 시계가 멈춰 있어서 기초 연구비 충전도 쉬고 있어요. | — | 학습 설계 §2.3 · S2 · `paused` (일관성 수정) |
| `learn.stipend.tickToast` | 기초 연구비 {c}가 들어왔어요. (충전 배율 ×{m}) | `{c}` · `{m}` | 학습 설계 §2.3 · WS `learn.stipend` · S1 · S2 (Claude 수정) (검증 수정) |
| `learn.stipend.settleToast` | 모둠원 모두가 가동했어요. 이 단계에 남은 기초 연구비 {c}가 한꺼번에 들어왔어요! | `{c}` | 학습 설계 §2.3 · WS `learn.stipend` · S1 · S2 (Claude 수정) (검증 수정) |

## E. 가동률 배율 안내(S1 · S2 · S6 · S7)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.chip.label` | ⚡ ×{m} · 단계 가동 {k}/{n} | `{m}` · `{k}` · `{n}` | 학습 설계 §5 · S1 · `chip` |
| `learn.chip.title` | 학습 · 연구비 서랍 열기 | — | 학습 설계 §5 · S1 · `chipTitle` |
| `learn.activity.currentStep` | 지금 단계 | — | 학습 설계 §5 · S2 · `currentStep` |
| `learn.activity.membersLabel` | 단계 가동 | — | 학습 설계 §2.3 · S2 · `activeMembers` (Claude 수정) |
| `learn.activity.howToActivate` | 지금 단계에서 문항 하나를 50점 이상 받으면 가동 도장이 찍혀요. 연구 노트 칸을 하나 맡아 쓰고, 그 노트가 평가에서 50점 이상을 받아도 돼요. 바로 채점되는 개념 문항만으로도 가동할 수 있어요. | — | 학습 설계 §2.3 · §4.3 · 서버 `recomputeActivity`(노트 점수 ≥ 50 의 `contributors`) · S2 (Claude 수정) (검증 수정) |
| `learn.activity.memberActive` | 가동 | — | 학습 설계 §2.3 · S2 · `memberActive` (Claude 수정) |
| `learn.activity.memberIdle` | 아직 | — | 학습 설계 §1.5 · §2.3 · S2 · `memberIdle` (Claude 수정) |
| `learn.activity.memberExempt` | 선생님 면제 | — | 학습 설계 §2.3 · S2 · `memberExempt` |
| `learn.activity.exemptHelp` | 결석이나 조퇴한 모둠원은 선생님이 면제로 표시할 수 있어요. 면제된 모둠원은 가동률을 셀 때 모둠 인원에서 빠져요. | — | 학습 설계 §2.3 · S2 (Claude 수정) (검증 수정) |
| `learn.activity.multiplierLabel` | 충전 배율 | — | 학습 설계 §2.3 · S2 · `multiplier` |
| `learn.activity.formulaGuide` | 충전 배율은 ×1.0 에서 시작해요. 지금 단계에서 가동한 모둠원 비율만큼 더해져요(최대 +1.0). 전원 가동을 이어 온 단계마다 +0.1 이 더 붙어요(최대 +0.5). 그래서 가장 높은 배율은 ×2.5 예요. | — | 학습 설계 §2.3 · 균형안 §2.3 · S2 (Claude 수정) |
| `learn.activity.formulaExample` | 예를 들어 연속 기록이 없을 때 4명 중 2명이 가동하면 ×1.5 예요. 4명 모두 가동하면 첫 단계에서 ×2.1 이에요. 5단계를 이어 가면 ×2.5 예요. | — | 균형안 §2.3 표 · S2 (Claude 보충) (검증 수정) |
| `learn.activity.streakLabel` | 연속 전원 가동 ({streak}단계) | `{streak}` (새) | 학습 설계 §2.3 · S2 · `streak` |
| `learn.activity.streakCool` | 전원 가동을 못 하고 다음 단계로 넘어가도 연속 기록은 0이 되지 않아요. 한 단계만큼만 줄어들어서 다음 단계에서 다시 이어 갈 수 있어요. | — | 학습 설계 §2.3 · S2 (Claude 수정) |
| `learn.shields.title` | 가동 보호권 | — | 학습 설계 §2.3 · S2 · `shields` |
| `learn.shields.help` | 심화 문항이나 연구 노트 평가에서 80점 이상을 받으면 모둠에 보호권이 1장 생겨요(최대 2장). 전원 가동을 못 하고 단계를 넘길 때 저절로 1장을 써요. 그러면 그 단계는 전원 가동으로 인정돼 연속 기록이 이어져요. | — | 학습 설계 §2.3 · S2 · `shieldsHelp` (Claude 수정) |
| `learn.shields.earned` | 80점 이상을 받아 가동 보호권 1장이 생겼어요. | — | 학습 설계 §2.3 · S2 (Claude 보충) |
| `learn.shields.used` | 가동 보호권 1장을 써서 지난 단계를 전원 가동으로 인정받았어요. | — | 학습 설계 §2.3 · S2 (Claude 보충) |
| `learn.district.windows` | 지금 단계에서 가동 도장을 찍은 모둠원 수만큼 우리 사옥 창문에 불이 켜져요. | — | 학습 설계 §5 · S6 |
| `learn.district.allOn` | 모둠원 모두가 가동 도장을 찍으면 사옥 전체가 환해지는 '전원 야근' 장면이 나와요. | — | 학습 설계 §5 · S6 (Claude 수정) |
| `learn.district.flag` | 5단계 연속으로 전원 가동하면 사옥 옥상에 깃발이 올라가요. | — | 학습 설계 §5 · S6 (Claude 수정) |
| `learn.board.streakNews` | ◆ {ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×2.5 | `{ticker}` (새) | 학습 설계 §1.5 · §5 · S7 · 서버 `learn.ts` 전광판 줄 (Claude 수정) |

## F. Series A / B 투자 심사(S5)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.pitch.button` | 투자 유치 | — | 학습 설계 §2.4 · S5 · `pitchButton` |
| `learn.pitch.roundA` | Series A | — | 학습 설계 §2.4 · S5 · `round.series_a` |
| `learn.pitch.roundB` | Series B | — | 학습 설계 §2.4 · S5 · `round.series_b` |
| `learn.pitch.title` | {round} 투자 심사 | `{round}` | 학습 설계 §2.4 · S5 · `pitchTitle` |
| `learn.pitch.lede` | 모둠원이 발굴한 후보 데이터(정량 70점)와 피치 글 · 연구 노트(정성 30점)로 바로 심사해요. 피치는 투자자를 설득하는 짧은 글이에요. 선생님 승인은 필요 없어요. | — | 학습 설계 §2.4 · S5 · `pitchLede` (Claude 수정) |
| `learn.pitch.max` | 최대 {max} | `{max}` | 학습 설계 §2.4 · `PitchStatus.maxCrista` · S5 (Claude 보충) |
| `learn.pitch.floorHelp` | 받는 투자금은 최대 투자금에 종합 점수 비율(점수 ÷ 100)을 곱한 값이에요. 점수가 30점보다 낮아도 최대 투자금의 30%는 받아요. | — | 학습 설계 §2.4 · 균형안 §3 · `pitchPayout` · S5 (Claude 보충) (검증 수정) |
| `learn.pitch.a.locked` | 2.2 에서 특허 후보를 1개 이상 고르면 Series A(회사가 받는 첫 번째 큰 투자, 최대 15,000,000 크리스타)를 신청할 수 있어요. | — | 기준 설계 §10(3판) · 서버 `pitchEligibility` · S2 · S5 · `pitchLockedA` (Claude 수정) |
| `learn.pitch.b.locked` | 3.1 물질특허가 등록되고 3.3 IND(임상시험 계획 승인 신청)가 승인되면 Series B(두 번째 큰 투자, 최대 25,000,000 크리스타)를 신청할 수 있어요. | — | 기준 설계 §10(3판) · 서버 `pitchEligibility` · S2 · S5 · `pitchLockedB` (Claude 수정) (검증 수정) (일관성 수정) |
| `learn.pitch.candidatesTitle` | 우리 모둠 후보 비교 | — | 학습 설계 §2.4 · S5 · `pitchCandidates` |
| `learn.pitch.roleLead` | 주력 | — | 학습 설계 §2.4 · S5 · `roleLead` |
| `learn.pitch.roleBackup` | 백업 | — | 학습 설계 §2.4 · S5 · `roleBackup` |
| `learn.pitch.roleCandidate` | 후보 | — | 학습 설계 §2.4 · S5 · `roleCandidate` |
| `learn.pitch.quantTitle` | 정량 평가 (70점) | — | 학습 설계 §2.4 · 균형안 §3 · S5 · `pitchQuant` (Claude 수정) |
| `learn.pitch.quant.diversity` | 4인 병렬 후보 발굴 (20점) — 1.1 표적 추천이나 1.2 후보 찜에 참여했는지 봐요. 2.1 에서 모둠원이 저마다 다른 분자를 도킹했는지도 봐요. | — | 균형안 §3.1 · S5 · `QUANT_LABEL.diversity` (Claude 수정) |
| `learn.pitch.quant.affinity` | 주력 후보 결합력 · PLIP (25점) — 주력 후보(모둠이 가장 앞세우는 분자)가 기준 분자와 견줘 표적에 얼마나 단단히 붙는지 봐요. PLIP(단백질과 분자 사이의 결합을 찾아 주는 분석)에서 수소결합이 2개 이상 잡혔는지 봐요. 수소결합 1개와 π-π 적층(납작한 고리 둘이 겹쳐 끌어당기는 힘)이 함께 잡혀도 돼요. | — | 균형안 §3.1 · `seriesAQuant` · S5 · `QUANT_LABEL.affinity` (Claude 수정) (검증 수정) (일관성 수정) |
| `learn.pitch.quant.admet` | ADMET 안전성 · 질환 적합 (17점) — Ro5(먹는 약이 되기 좋은 물성 기준) 위반이 적은지 봐요. hERG 위험(약이 심장 박동에 관여하는 hERG 통로를 막아 생기는 위험)과 간독성 신호를 피했는지도 봐요. CNS(중추신경계, 뇌 · 척수) 표적이면 TPSA(분자 표면 중 물과 친한 부분의 넓이)가 90 이하인지도 봐요. | — | 균형안 §3.1 · S5 · `QUANT_LABEL.admet` (Claude 수정) (검증 수정) |
| `learn.pitch.quant.backup` | 백업 후보 준비 (8점) — 주력과 다른 백업 후보도 도킹과 ADMET 분석을 마쳤는지 봐요. | — | 균형안 §3.1 · S5 · `QUANT_LABEL.backup` |
| `learn.pitch.quant.patent` | 물질특허 · 리드 최적화 (25점) — 학급 안에서 유효한 물질특허가 있는지 봐요. 2.1 에서 구조를 바꿔 원본보다 ΔG 를 0.3 kcal/mol 이상 낮췄는지도 봐요. | — | 균형안 §3.2 · `seriesBQuant` · S5 · `QUANT_LABEL.patent` (Claude 수정) |
| `learn.pitch.quant.ind` | IND 설계 · 펀더멘털 (25점) — 3.3 IND 가 첫 신청에 승인됐는지(15점), 보류 뒤 승인됐는지(10점) 봐요. 주력 후보의 효능 E · 안전 S 예상 점수도 봐요(10점). | — | 균형안 §3.2 · `seriesBQuant` · S5 · `QUANT_LABEL.ind` (Claude 수정) (일관성 수정) |
| `learn.pitch.quant.share` | 모둠원 기여 균형 (20점) — 1.1부터 3.3까지 실험 실행과 연구 노트 작성에 모둠원이 고르게 참여했는지 봐요. | — | 균형안 §3.2 · `seriesBQuant` · S5 · `QUANT_LABEL.share` |
| `learn.pitch.quant.noDocking` | 주력 후보의 도킹 근거가 아직 없어요. | — | `seriesAQuant` detail · S5 (Claude 보충) (일관성 수정) |
| `learn.pitch.quant.noProps` | 물성 신호를 아직 읽지 못해서 반만 셌어요. | — | `seriesAQuant` detail · S5 (Claude 보충) |
| `learn.pitch.quant.backupReady` | 주력과 다른 백업 후보가 도킹과 ADMET 를 마쳤어요. | — | `seriesAQuant` detail · S5 (Claude 보충) |
| `learn.pitch.quant.backupNone` | 백업 후보가 아직 없어요. | — | `seriesAQuant` detail · S5 (Claude 보충) |
| `learn.pitch.qualTitle` | 피치 · 연구 노트 (30점 · AI 심사) | — | 학습 설계 §2.4 · S5 · `pitchQual` (Claude 수정) |
| `learn.pitch.qual.a1` | 왜 이 분자를 주력 후보로 골랐는지 ΔG · 물성 수치로 설명했나요? (10점) | — | 균형안 §3.1 정성 ① · S5 (Claude 보충) (일관성 수정) |
| `learn.pitch.qual.a2` | 주력 후보의 ADMET 약점과 독성 위험을 솔직하게 짚었나요? (10점) | — | 균형안 §3.1 정성 ② · S5 (Claude 보충) (일관성 수정) |
| `learn.pitch.qual.a3` | 백업 후보가 주력과 무엇이 다르고, 언제 바꿀지 기준이 있나요? (10점) | — | 균형안 §3.1 정성 ③ · S5 (Claude 보충) |
| `learn.pitch.qual.b1` | 특허가 무엇을 보호하고, 다른 모둠과 무엇이 다른지 설명했나요? (10점) | — | 균형안 §3.2 정성 ① · S5 (Claude 보충) |
| `learn.pitch.qual.b2` | 고른 제형 · 용량이 1상(안전성)과 2상(유효성)을 함께 넘을 수 있는 약동학 근거가 있나요? (10점) | — | 균형안 §3.2 정성 ② · S5 (Claude 보충) |
| `learn.pitch.qual.b3` | 임상이 보류되면 용량 변경 · 제형 변경 · 백업 후보 교체 중 무엇을 먼저 할지 정했나요? (10점) | — | 균형안 §3.2 정성 ③ · S5 (Claude 보충) |
| `learn.pitch.a.prompt` | 아래 세 가지를 {min}~{max}자로 써 주세요. ① 모둠 후보 가운데 왜 이 분자를 주력 후보로 골랐나요(도킹 ΔG · 물성 수치 근거)? ② 주력 후보의 ADMET 약점과 독성 위험은 무엇인가요? ③ 백업 후보는 주력과 무엇이 다르고, 언제 바꾸나요? 1.1~2.2 연구 노트도 함께 심사에 들어가요. | `{min}` · `{max}` | 학습 설계 §2.4 · 균형안 §3.1 · S5 · `pitchPromptA` (Claude 수정) (일관성 수정) |
| `learn.pitch.b.prompt` | 아래 세 가지를 {min}~{max}자로 써 주세요. ① 우리 물질특허는 무엇을 보호하고, 다른 모둠과 무엇이 다른가요? ② 고른 제형 · 용량이 1상(안전성)과 2상(유효성)을 함께 넘을 약동학(PK, 약이 몸에 들어가 퍼지고 빠져나가는 과정) 근거는 무엇인가요? ③ 임상이 보류되면 용량 변경 · 제형 변경 · 백업 후보 교체 중 무엇을 먼저 하나요? 3.1~3.3 연구 노트도 함께 심사에 들어가요. | `{min}` · `{max}` | 학습 설계 §2.4 · 균형안 §3.2 · S5 · `pitchPromptB` (Claude 수정) |
| `learn.pitch.estimate` | 예상 투자금 {min} ~ {max} | `{min}` · `{max}` | 학습 설계 §2.4 · S5 · `pitchEstimate` (Claude 수정) |
| `learn.pitch.floor` | 바닥 보장(30%) {c} | `{c}` | 학습 설계 §2.4 · 균형안 §3 · S5 · `pitchFloor` (Claude 수정) |
| `learn.pitch.submit` | 투자 심사 받기 | — | 학습 설계 §2.4 · S5 · `pitchSubmit` |
| `learn.pitch.confirm` | 투자 심사는 라운드마다 한 번만 받을 수 있어요. 지금 낼까요? | — | 학습 설계 §2.4 · S5 · `pitchConfirm` (Claude 수정) |
| `learn.pitch.paidBase` | 정량 점수에 따른 투자금이 먼저 들어왔어요. AI 심사가 피치 글을 다 읽으면 나머지가 들어와요. | — | 학습 설계 §2.4 · S5 · `pitchPaidBase` (Claude 수정) |
| `learn.pitch.done` | {round} 투자 심사를 마쳤어요. | `{round}` | 학습 설계 §2.4 · S2 · S5 · `pitchDone` |
| `learn.pitch.effects` | 심사가 끝나면 투자금이 모둠 연구비로 들어와요. 전광판에도 투자 유치 소식이 올라가요. Series A 를 받으면 우리 사옥 외관이 한 단계 올라가요. | — | 학습 설계 §2.4 · S5 · S6 · S7 (Claude 수정) (검증 수정) |
| `learn.board.pitchNews` | ◆ {ticker} {round} {c} 투자 유치 | `{ticker}` (새) · `{round}` · `{c}` | 학습 설계 §2.4 · §5 · S7 · 서버 `learn.ts` 전광판 줄 (Claude 수정) |
| `learn.pitch.close` | 닫기 | — | 학습 설계 §5 · S5 · `close` |

## G. 채점 결과 문장(S3 · S4 · S5)

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.result.score` | {s}점 | `{s}` | 학습 설계 §4.2 · S3 · S4 · S5 · `score` |
| `learn.result.paid` | +{c} | `{c}` | 학습 설계 §2.1 · S3 · S4 · S5 · `paid` (Claude 수정) |
| `learn.result.underThreshold` | 30점보다 낮으면 연구비가 들어오지 않아요. 결과를 보고 한 번 고쳐 낼 수 있어요. | — | 학습 설계 §2.1 · 균형안 §2.1 · S3 · S4 (Claude 수정) |
| `learn.result.correct` | 맞았어요! | — | 학습 설계 §2.1 · S4 · `correct` |
| `learn.result.wrong` | 틀렸어요. | — | 학습 설계 §2.1 · S4 · `wrong` (Claude 수정) |
| `learn.rubric.full.mark` | ○ | — | 학습 설계 §4.3 · `credit.full` (Claude 수정) |
| `learn.rubric.full.word` | 충족 | — | 학습 설계 §4.3 · `creditWord.full` (Claude 수정) |
| `learn.rubric.half.mark` | △ | — | 학습 설계 §4.3 · `credit.half` (Claude 수정) |
| `learn.rubric.half.word` | 일부 충족 | — | 학습 설계 §4.3 · `creditWord.half` (Claude 수정) |
| `learn.rubric.none.mark` | × | — | 학습 설계 §4.3 · `credit.none` (Claude 수정) |
| `learn.rubric.none.word` | 빠짐 | — | 학습 설계 §4.3 · `creditWord.none` (Claude 수정) |
| `learn.result.rubricTitle` | 채점 기준별 결과 | — | 학습 설계 §1.7 · §4.3 · S3 · S4 · S5 (Claude 수정) |
| `learn.result.feedbackTitle` | 종합 피드백 | — | 학습 설계 §1.7 · §4.3 · S3 · S4 · S5 (Claude 수정) |
| `learn.result.aiGraded` | AI 채점 | — | 학습 설계 §4 · 기준 설계 §5.13 · S3 · S4 · S5 · `aiGraded` (Claude 수정) |
| `learn.result.aiNote` | AI(Claude)는 채점 기준마다 ○ · △ · × 를 매기고 피드백을 써요. 연구비 금액은 AI 가 아니라 정해진 규칙이 점수로 계산해요. | — | 학습 설계 §0 · §4.2 · S3 · S4 · S5 (Claude 보충) (검증 수정) (일관성 수정) |
| `learn.flag.offTopic` | 문제에서 묻는 것과 다른 답이라 0점이에요. | — | 학습 설계 §4.2 · `ZERO_FLAGS` · `flag.off_topic` (Claude 수정) |
| `learn.flag.tooShort` | 답이 너무 짧아서 채점 기준을 충분히 확인하지 못했어요. | — | 학습 설계 §4.2 · `flag.too_short` (Claude 수정) |
| `learn.flag.injection` | 채점을 바꾸라는 글이 들어 있어 0점이에요. 선생님께도 알림이 갔어요. | — | 학습 설계 §4.3 · `flag.injection` (Claude 수정) |
| `learn.flag.notKorean` | 한국어로 써 주세요. | — | 학습 설계 §4.2 · `flag.not_korean` |
| `learn.flag.copiedPrompt` | 문제를 그대로 옮겨 적었어요. 내 생각과 근거로 다시 써 보세요. | — | 학습 설계 §4.2 · `flag.copied_prompt` (Claude 수정) |
| `learn.flag.duplicate` | 먼저 낸 다른 답과 너무 비슷해서 0점이에요. | — | 학습 설계 §4.3 · `flag.duplicate` (Claude 수정) |
| `learn.appeal.button` | 채점에 이의 제기 | — | 학습 설계 §1.7 · §4.3 · S3 · S4 · `appeal` (Claude 수정) |
| `learn.appeal.placeholder` | 어느 부분이 왜 억울한지 선생님께 한 줄로 써 주세요. | — | 학습 설계 §4.3 · S3 · S4 · `appealPlaceholder` (Claude 수정) |
| `learn.appeal.open` | 이의 제기를 냈어요. 선생님이 점수를 고치면 연구비 차이가 저절로 정산돼요. | — | 학습 설계 §4.3 · S3 · S4 · `appealOpen` (Claude 수정) |
| `learn.appeal.done` | 선생님이 이의 제기를 처리했어요. | — | 학습 설계 §4.3 · S3 · S4 · `appealDone` (Claude 수정) |
| `learn.result.overridden` | 선생님이 고친 점수예요. | — | 학습 설계 §4.3 · S3 · S4 · S5 · `overridden` (Claude 수정) |
| `learn.result.pending` | AI 가 채점 기준에 맞춰 읽고 있어요. 끝나면 바로 보여요. | — | 학습 설계 §4.1 · S3 · S4 · `pending` (Claude 수정) |
| `learn.result.pendingSlow` | AI 채점이 밀려 있어요. 화면을 닫거나 다음 단계로 가도 괜찮아요. 채점이 끝나면 연구비가 들어와요. | — | 학습 설계 §4.3 · S3 · S4 · `pendingSlow` (Claude 수정) |
| `learn.result.revisedPaid` | 고친 답으로 점수가 올랐어요. 늘어난 연구비 {c}가 더 들어왔어요. | `{c}` | 학습 설계 §1.3 · §2.1 · S3 · S4 (Claude 수정) (검증 수정) |
| `learn.result.revisedNone` | 고친 답의 점수가 오르지 않아서 더 들어온 연구비는 없어요. | — | 학습 설계 §2.1 `max(0, …)` · S3 · S4 (Claude 보충) |

## H. 오류 · 막음 문구

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `learn.err.notFound` | 문항을 찾지 못했어요. | — | `err.notFound` (Claude 수정) |
| `learn.err.notYours` | 나에게 나온 문항만 낼 수 있어요. | — | `err.notYours` (Claude 수정) |
| `learn.err.already` | 이미 낸 답이에요. 화면을 새로 고쳐 주세요. | — | `err.already` (Claude 수정) |
| `learn.err.pendingNow` | 아직 채점 중이에요. 채점이 끝난 뒤에 고쳐 낼 수 있어요. | — | `err.pendingNow` (Claude 수정) |
| `learn.err.reviseUsed` | 고쳐 내기는 문항마다 한 번만 할 수 있어요. | — | 학습 설계 §1.3 · `err.reviseUsed` |
| `learn.err.reviseFull` | 이미 만점이에요. 더 고치지 않아도 돼요. | — | `err.reviseFull` (Claude 수정) |
| `learn.err.choice` | 보기에서 답을 골라 주세요. | — | `err.choice` |
| `learn.err.number` | 숫자를 써 주세요. | — | `err.number` (Claude 수정) |
| `learn.err.textLen` | {min}~{max}자로 써 주세요. | `{min}` · `{max}` | `LEARN_TEXT_LIMITS` · `err.textLen` (Claude 수정) |
| `learn.err.noteEmpty` | 연구 노트 세 칸을 합쳐 30자 이상 써 주세요. | — | `LEARN_TEXT_LIMITS.noteTotalMin` · `err.noteEmpty` |
| `learn.err.noteSame` | 지난번 평가 뒤로 노트가 바뀌지 않았어요. 피드백을 보고 고친 뒤에 다시 눌러 주세요. | — | `err.noteSame` (Claude 수정) |
| `learn.err.noteUsed` | 노트 평가는 한 단계에 두 번(처음 · 고친 뒤)까지 받을 수 있어요. | — | `err.noteUsed` (Claude 수정) |
| `learn.err.notePending` | 노트 평가가 아직 끝나지 않았어요. 조금만 기다려 주세요. | — | `err.notePending` (Claude 수정) |
| `learn.err.pitchLen` | 피치는 {min}~{max}자로 써 주세요. | `{min}` · `{max}` | `LEARN_TEXT_LIMITS.pitch` · `err.pitchLen` (Claude 수정) |
| `learn.err.pitchDone` | 이 라운드는 이미 심사를 받았어요. | — | `err.pitchDone` (Claude 수정) |
| `learn.err.pitchLocked` | 아직 신청할 수 없는 라운드예요. | — | `err.pitchLocked` (Claude 수정) |
| `learn.err.appealLen` | 이의 사유는 4~200자로 써 주세요. | — | `LEARN_TEXT_LIMITS.appeal` · `err.appealLen` (Claude 수정) |
| `learn.err.appealDup` | 이미 낸 이의 제기를 선생님이 보고 있어요. | — | `err.appealDup` (Claude 수정) |
| `learn.err.appealTarget` | 이의 제기할 채점을 찾지 못했어요. | — | `err.appealTarget` (Claude 수정) |
