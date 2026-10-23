# 학습 연구비 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon (High) · `agy --mode plan` · **한 번에 성공** · 표 159줄 · `gemini-run.log` 비어 있음 = 오류 없음) → 정리본 `copy.md`(키 **180개** · Claude 수정 106줄 · Claude 보충 19줄 · 원문 7키 이름 바꿈/합침).
- 근거로 대조한 것: `docs/2026-10-23-learning-grant-design.md`(§0~§5) · `docs/2026-10-23-learning-grant-balance.md`(§2 · §3) · `docs/2026-10-23-crista-web-design.md` §10 · §5.12 · §5.13, `packages/web-contract/src/learn.ts`(`LEARN_COPY` · `QUANT_LABEL` · `seriesAQuant` · `seriesBQuant` · `pitchPayout` · `LEARN_TEXT_LIMITS`), `pipeline.ts`(`StepId` 9개 · `NOTE_SECTION_LABEL`), `money.ts`(`formatCrista`), `apps/web/src/board/learn/*.tsx` · `parts.tsx`(`NOTE_PLACEHOLDER`), `apps/server/src/features/learn.ts`(`pitchEligibility` · 전광판 줄 · 틱 조건) — 모두 읽기만.
- 총평: 원문은 금액(25,000 · 75,000 · 150,000 · 800,000 · 200,000 · 240,000 · 40,000 · 15,000,000 · 25,000,000) · 문턱(30 · 50 · 70 · 80점 · 30자 · 4~200자) · 공식(×1.0~×2.5 · +0.1 최대 +0.5) · 정량 배점(20 · 25 · 17 · 8 · 25 · 25 · 20) · 신청 시점(3판 2.2 / 3.1 + 3.3)을 모두 맞게 옮겼다. '8단계'도 쓰지 않았다. 고칠 곳은 ① 사실이 어긋나거나 빠진 서술 몇 곳 ② **돈 자리표시자 뒤 '크리스타' 겹침**(화면이 단위를 이미 붙임) ③ 과학 풀이 몇 개 ④ 쉼표로 이은 긴 문장 · 학생에게 필요 없는 내부 말이었다.
- 원문 메모의 '총 112개 키'는 틀렸다. 실제 표는 159줄이다.

## ① 설계 사실 대조

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `learn.drawer.path.stipend` | "10분마다 기초 연구비가 충전 배율(×{m})만큼 들어와요" → "실제 시간 10분마다 … 한 번에 40,000 × 충전 배율 크리스타이고, 한 단계에 두 번까지예요." | 들어오는 돈은 '배율만큼'이 아니라 `40,000 × m` 이다(학습 설계 §2.3). 단계당 2틱 상한이 빠졌었다. |
| `learn.stipend.help` · `drawer.path.stipend` | "수업 시계가 흐르는 10분마다" → "수업 시계가 흐르는 동안 **실제 시간** 10분마다" | 수업에는 게임 시계(기본 배율 2)도 있다. '수업 시계의 10분'은 게임 분으로 읽힐 수 있다. 설계는 '현실 시간 10분'이다. |
| `learn.drawer.path.notes` | "함께 쓰고 평가받으면 단계마다 최대 240,000" → "최대 200,000 … 서로 다른 모둠원이 나눠 쓰면 240,000" | 240,000 은 분담 조건을 채웠을 때만이다. 기본 최대는 200,000(균형안 §2.2). |
| `learn.drawer.path.pitch` | "Series A · B(단계별 투자 유치) … 최대 40,000,000 크리스타를 확보해요" → "Series A 는 최대 15,000,000, Series B 는 최대 25,000,000 크리스타예요." | 40,000,000 은 두 라운드를 다 만점 받았을 때의 합이다. 설계에 없는 숫자를 새로 만들지 않고 라운드별 최대를 그대로 썼다. |
| `learn.pitch.quant.ind` | "전임상 효능 · 안전성 바탕 점수" → "주력 리드의 효능 E · 안전 S 예상 점수도 봐요(10점)" | 이 10점은 3.2 전임상(동물실험) 결과가 아니라 IND 판정 재료 E · S 펀더멘털이다(균형안 §3.2 · `SeriesBFacts.efficacy/safety`). |
| `learn.items.reviewGuide` | "70점을 **넘지 못한** 문항" → "70점**보다 낮았던** 문항" · "절반까지 받을 수 있어요" → "최대 보상은 원래의 절반이에요" | 설계는 '70점 미만'이다. '넘지 못한'은 70점도 포함한다. 또 이 복습 큐는 **W7(학습 v2) 후속 구현**이라 지금 서버에 없다 → 근거 칸에 'W7 구현 뒤에만 노출'을 적었다(⑥-3). |
| `learn.items.chars` | "{n}자 ({min}~{max}자 **권장**)" → "{n}자 · {min}~{max}자" | 권장이 아니라 지켜야 하는 한도다(`err.textLen` 으로 막는다). |
| `learn.cap.reached` | "연구비 없이 채점과 피드백만 받는 연습 모드로 풀 수 있어요" → 세 문장으로 나누고 "채점과 피드백은 그대로 받지만 연구비는 들어오지 않아요" | 뜻은 맞다. 한 문장 한 생각으로 나누며 '연구비 없이'(풀려면 돈이 든다고 오해할 수 있음)를 고쳤다. |
| `learn.revise.guide` · `revise.button` · `note.reviseButton` | "처음 점수보다 오른 만큼의 차액만" · "오른 차액만 지급" → "처음 받은 연구비보다 늘어난 만큼만" | 차액은 점수 차가 아니라 크리스타 차다(`max(0, R₂ − R₁)`). 힌트를 쓴 문항은 점수 차와 크리스타 차가 다르다. |
| `learn.hint.guide` | "채점 기준의 핵심 열쇠말을 알려 줘요" → "정답이 아니라 실마리만 알려 줘요" | 개념 문항 힌트는 루브릭 낱말이 아니라 풀이 실마리다(서버 문항 은행 `hint`). 서술형 · 개념형 모두에 맞는 말로 바꿨다. |
| `learn.appeal.open` | "점수를 고치면 연구비 차액이 자동으로 **들어와요**" → "연구비 차이가 저절로 **정산돼요**" | 교사 정정(`learn_correction`)은 점수를 낮출 수도 있다. '들어온다'만 약속하면 틀릴 수 있다. |
| `learn.pitch.lede` | "선생님 승인을 기다리지 않고 **즉시** 모둠 연구비로 입금돼요" → "선생님 승인은 필요 없어요" | 지금 흐름은 정량분이 먼저, AI 가 피치를 읽은 뒤 나머지가 들어온다(`pitchPaidBase`). '즉시 입금'은 반만 맞다. 또 '모둠원 넷'(기존 COPY)은 2~3인 모둠에서 틀려 '모둠원이'로 바꿨다. |
| `learn.board.streakNews` | "◆ {team} 연구진 {streak}단계 연속 전원 가동 — 연구비 충전 ×{m}" → "◆ {ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×2.5" | 서버는 이 소식을 **5단계 연속일 때만** 한 번 낸다(`learn.ts` 전광판 줄). 숫자가 바뀌지 않으므로 자리표시자를 없앴다. 모둠 자리 이름은 서버 변수(`ticker`)에 맞췄다. |
| `learn.pitch.floorHelp` (보충) | — → "받는 투자금은 최대 투자금 × 종합 점수(100점 만점)예요. 점수가 30점보다 낮아도 최대 투자금의 30%는 받아요." | 범위 F 의 '바닥 보장 30%' 풀이가 원문에 없었다. 공식 `floor(최대 × max(0.30, 점수/100))` 그대로. |
| 설계 문서끼리 어긋남(문구 밖 — 참고) | 학습 설계 · 균형안 '8단계'(문항 총 6,400,000 · 노트 1,920,000 · 연속 s 0~8) / 3판 9단계(코드 `STEP_IDS` · `displayStreak` 최대 9) · 학습 설계 Series A 시점 '2.2 ADMET · 리드 지정 완료 후' / 기준 설계 §10 · 서버 '2.2 특허 후보 1개 이상' · 기준 설계 §9 '교사: Series A/B 승인' / §10 '교사 승인 폐지' · 기준 설계 §6 표 'Series A($3.000M) · B($5.000M)' | 문구는 코드 · 3판(9단계 · 특허 후보 · 승인 없음 · 크리스타)에 맞췄다. 문서 정정은 8b 세션 · 사용자 몫이라 고치지 않았다(⑥-6). |

## ② 자리표시자 바뀜 / 새로 생김

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `learn.cap.status` · `note.button` · `note.reviseButton` · `stipend.tickToast` · `stipend.settleToast` · `pitch.estimate` · `pitch.floor` · `result.paid` · `result.revisedPaid` · `board.pitchNews` | "{used} / {cap} 크리스타" · "+최대 {max} 크리스타" · "{c} 크리스타" · "+{c} 크리스타" 등 → '크리스타'를 뺌 | 화면(`StepLearn` · `PitchButton` · `GrantChip`)과 서버 전광판 줄이 이 값을 `formatCrista()` 로 채운다. 이 함수는 '… 크리스타'를 이미 붙인다. 그대로 두면 "200,000 크리스타 크리스타"가 된다. |
| `learn.board.pitchNews` | "{team} … 투자 유치 성공" → "{ticker} … 투자 유치" | 서버 줄(`◆ ${ticker} ${label} ${formatCrista(final)} 투자 유치`)과 이름 · 끝말을 맞췄다. |
| `learn.board.streakNews` | `{team}` · `{streak}` · `{m}` → `{ticker}` 하나 | ①의 이유. |
| `learn.activity.streakLabel` | `{streak}` (새) | 원문 그대로 둔다. 기존 `streak` 키는 이름표뿐이라, 숫자를 문장에 넣으려면 새 인자가 필요하다. |
| `learn.note.sharedProgress` (보충) | — → "칸을 쓴 모둠원 {k}/{n}명" | `LearnNoteState.authors` · `sharedNeeded` 를 보이는 자리. 기존 `chip` 의 `{k}/{n}` 이름을 다시 썼다. |
| `learn.pitch.max` (보충) | — → "최대 {max}" | `PitchStatus.maxCrista`. 돈 자리표시자 규칙대로 단위 없음. |
| `learn.tier.*.guide` · `pitch.*.prompt` · `err.textLen` · `err.pitchLen` | `{min}` · `{max}` 그대로 | 글자 수 숫자다(단위 없음). 같은 이름이 돈(`pitch.estimate`)에도 쓰여 헷갈릴 수 있으니 코드 반영 때 인자 이름을 `{minChars}` · `{maxChars}` 로 나누는 것을 권한다. |
| 그 밖 | 바뀐 이름 없음 | `{m}` · `{k}` · `{n}` · `{s}` · `{c}` · `{round}` · `{used}` · `{cap}` 은 기존 `LEARN_COPY` 인자 그대로. |

## ③ 과학적으로 틀린(또는 어설픈) 풀이

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `learn.pitch.quant.admet` | "hERG(심장 박동 통로 독성)" → "hERG(심장 박동을 조절하는 통로를 막는 위험)" | hERG 는 심장 칼륨 통로를 만드는 유전자 · 통로 이름이다. 독성은 약이 그 통로를 막을 때 생긴다. 3.3 검토와 같은 풀이로 맞췄다. |
| `learn.pitch.quant.affinity` | "PLIP(수소결합 · π-π 적층(고리끼리 마주 보며 붙는 힘) 같은 결합 모양 분석)" → "PLIP(단백질과 분자 사이의 결합을 찾아 주는 분석)… π-π 적층(납작한 고리 둘이 겹쳐 끌어당기는 힘)" | PLIP 는 단백질-리간드 상호작용을 찾아 주는 도구이지 '결합 모양 분석'이 아니다. 괄호 안 괄호도 풀었다. π-π 적층은 방향족(납작한) 고리끼리 겹쳐 쌓이는 상호작용이다. |
| `learn.tier.intermediate.guide` | "ΔG(결합 자유 에너지, 낮을수록 단단히 붙음)" → "ΔG(분자가 표적에 붙을 때의 에너지 변화, 값이 낮을수록 단단히 붙음)" | '결합 자유 에너지'는 그 자체가 전문어라 풀이가 되지 않는다. '낮을수록 단단히'는 맞아 그대로 살렸다. |
| `learn.tier.advanced.guide` | "물질특허(새 분자 구조 특허)" → "물질특허(새 물질 자체를 보호하는 특허)" | 물질특허는 구조 그림이 아니라 그 화합물 자체(만드는 법 · 쓰는 법과 상관없이)를 보호한다. 용도특허와 구별되게 했다. |
| `learn.pitch.quant.admet` | "TPSA(극성 표면적, 물과 친한 부분의 넓이)" → "TPSA(분자 표면 중 물과 친한 부분의 넓이)" | 뜻은 맞다. '극성'을 풀지 않은 채 남기지 않으려고 한 번만 풀었다. |
| `learn.pitch.b.prompt` · `pitch.qual.b3` | "임상 보류(CRL, 규제 기관이 보완을 요구하며 임상을 멈추는 결정)" → "임상이 보류되면" (CRL 뺌) | 실제 CRL(Complete Response Letter)은 **허가 신청(NDA)** 에 대한 '지금은 허가할 수 없음 · 보완 요구' 회신이다. 임상을 멈추는 결정은 clinical hold 다. 설계가 임상 2 · 3상 보류를 'CRL'이라 부르지만, 학생에게 틀린 풀이를 붙이지 않으려고 약어를 뺐다(⑥-2). |
| `learn.pitch.a.locked` · `b.locked` | "Series A(초기 후보 물질 투자" · "Series B(임상 진입 투자" → "회사가 받는 첫 번째 큰 투자" · "두 번째 큰 투자" | Series A · B 는 투자 라운드 순서 이름이다. 무엇에 쓰는 돈인지로 정해지지 않는다. |

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `learn.stipend.settleToast` | "모둠원 전원이 가동**하여** … 들어왔어요!" → "모둠원 모두가 가동했어요. … 들어왔어요!" | 글말 '-하여' → 해요체, 두 생각을 두 문장으로. |
| `learn.stipend.help` · `activity.formulaGuide` · `shields.help` · `note.sharedGuide` · `tier.*.guide` · `pitch.*.prompt` · `pendingSlow` · `howToActivate` | 쉼표로 이은 긴 한 문장 → 두세 문장 | 한 문장 한 생각. 프롬프트는 "아래 세 가지를 … 써 주세요." + 물음 셋으로 나눴다. |
| `learn.result.aiGraded` | "AI 채점 (항목별 ○ · △ · × 판정 뒤 서버 규칙으로 연구비 계산)" → 딱지 "AI 채점" + 새 줄 `learn.result.aiNote` | 딱지 자리는 짧아야 한다. '서버 규칙'은 학생에게 낯선 말이라 '정해진 규칙'으로 바꿨다. |
| `learn.result.feedbackTitle` | "채점 기준별 결과와 종합 피드백" → `rubricTitle` "채점 기준별 결과" · `feedbackTitle` "종합 피드백" | 화면에서 두 덩어리(루브릭 표 · 피드백 글)로 나뉜다. |
| `learn.rubric.full/half/none` | "○ 충족" 한 줄 → `.mark` · `.word` 두 줄씩 | 코드가 `credit`(기호) · `creditWord`(낱말)를 따로 쓴다. 1:1 로 옮기기 쉽게 나눴다. △ 낱말은 '일부' → '일부 충족'(원문 채택). |
| `learn.result.wrong` | "아쉬워요, 다시 확인해 보세요." → "틀렸어요." | 쉼표로 두 생각을 이었다. 개념 문항 해설은 마지막 시도 뒤에만 보여서 '다시 확인'할 거리가 없을 수 있다. |
| `learn.activity.memberActive` · `memberIdle` | "가동 완료" · "준비 중" → "가동" · "아직" | 기존 COPY 로 되돌렸다. 칩 · 표 칸이 좁다. '준비 중'은 학생이 무엇을 준비하는지 오해할 수 있다. 탓하지 않는 말은 '아직'도 같다. |
| `learn.tier.concept.how` | "서버 규칙 즉시 채점" → "바로 채점" | 기존 COPY. '서버 규칙'은 학생에게 필요 없는 내부 말이다. |
| `learn.drawer.perStep` | "단계별 학습 연구비 (전체 9단계)" → "단계별 학습 연구비" | 단계 수는 표에서 보인다. 숫자를 박아 두면 단계가 바뀔 때 문구도 고쳐야 한다. |
| `learn.district.flag` · `allOn` | "기념 깃발이 휘날려요" · "환하게 빛나는 '전원 야근' 연출이 켜져요" → "깃발이 올라가요" · "'전원 야근' 장면이 나와요" | 과장 · 내부 말('연출')을 줄였다. |
| `learn.note.backup.*` | 키 이름 `backup` → `fallback` | 코드 칸 id 가 `fallback` 이다(`NoteSection`). 키를 맞춰야 옮길 때 헷갈리지 않는다. |
| `learn.err.*` 여러 줄 | "해당 문항" · "나에게 배정된" · "이미 100점 만점을 받아서 더 고칠 필요가 없어요" 등 → 짧은 해요체 | 기존 COPY 의 짧은 말을 살리고, 꼭 필요한 두 번째 문장만 더했다. |

## ⑤ 기존 COPY 키와 대응

| 기존 키(`LEARN_COPY` 등) | 새 키 | 처리 |
| --- | --- | --- |
| `drawerTitle` · `drawerLede` · `chip` · `chipTitle` · `currentStep` · `activeMembers` · `streak` · `multiplier` · `shields` · `shieldsHelp` · `stipend` · `stipendHelp` · `nextTick` · `ticksDone` · `paused` · `perStep` · `itemsCap` · `notePaid` · `totals*` · `member*` | `learn.drawer.*` · `learn.chip.*` · `learn.activity.*` · `learn.shields.*` · `learn.stipend.*` · `learn.totals.*` | 맞출 키 — 문구만 갈아 끼운다. |
| `noteButton` · `noteRevise` · `noteShared` · `noteSharedOn` · `noteDone` · `notePending` · `noteTooShort` | `learn.note.*` | 맞출 키. `noteButton(max)` · `noteRevise(max)` 인자 그대로. |
| `itemsTitle` · `itemsSub` · `capLeft` · `capReached` · `submit` · `submitText` · `revise` · `hint` · `hintUsed` · `pending` · `pendingSlow` · `fallback` · `correct` · `wrong` · `score` · `paid` · `practice` · `appeal*` · `chars` · `aiGraded` · `overridden` | `learn.items.*` · `learn.cap.*` · `learn.hint.*` · `learn.revise.*` · `learn.result.*` · `learn.appeal.*` | 맞출 키. |
| `tier` · `tierHow` · `round` · `credit` · `creditWord` · `flag.*` | `learn.tier.*.name/how` · `learn.pitch.roundA/B` · `learn.rubric.*.mark/word` · `learn.flag.*` | 맞출 키. |
| `pitchButton` · `pitchTitle` · `pitchLede` · `pitchLockedA/B` · `pitchDone` · `pitchQuant` · `pitchQual` · `pitchCandidates` · `pitchPromptA/B` · `pitchEstimate` · `pitchSubmit` · `pitchConfirm` · `pitchPaidBase` · `pitchFloor` · `role*` · `close` | `learn.pitch.*` | 맞출 키. `pitchPromptA/B` 는 지금 '200~500자'를 박아 두었다 → `{min}~{max}` 함수로 바꿔야 한다(⑥-1). |
| `err.*` 19개 | `learn.err.*` | 맞출 키. `err.teacherScore` · `err.exemptStep` 은 교사 화면 말이라 이번 범위 밖(그대로). |
| `QUANT_LABEL.*` 7개 | `learn.pitch.quant.*` | 이름표는 그대로 두고, 이번 문구는 그 아래 **풀이 줄**이다. 코드에 새 자리(`QUANT_HELP` 등)가 필요하다. |
| `seriesAQuant` 의 `detail` 문자열 4개 | `learn.pitch.quant.noDocking` · `noProps` · `backupReady` · `backupNone` | 새 키(코드 안에 박힌 학생용 글을 COPY 로 빼자는 제안). |
| `NOTE_SECTION_LABEL`(pipeline.ts) · `NOTE_PLACEHOLDER`(web `parts.tsx`) | `learn.note.{why,unknown,fallback}.title/placeholder` | 맞출 키. 칸 이름은 그대로, 흐린 글만 다듬었다. |
| 없음 | `learn.drawer.path.*` · `noLock` · `teamWallet` · `tier.*.guide` · `hint.guide` · `revise.guide` · `items.reviewGuide` · `note.*.guide` · `note.sharedProgress` · `note.pitchLink` · `stipend.tickToast/settleToast` · `activity.howToActivate/exemptHelp/formulaGuide/formulaExample/streakLabel/streakCool` · `shields.earned/used` · `district.*` · `pitch.max/floorHelp/effects/qual.*` · `result.underThreshold/rubricTitle/feedbackTitle/aiNote/revisedPaid/revisedNone` | 새 키. |
| 서버 전광판 줄 2개(`learn.ts`) | `learn.board.streakNews` · `learn.board.pitchNews` | 서버에 박힌 글. 전광판 문구 폴더(`copy-board`)와 겹칠 수 있다(⑥-5). |
| `err.noteSame` ↔ 원문 `learn.note.unchanged` | `learn.err.noteSame` 하나로 합침 | 원문이 같은 자리를 두 키로 냈다. |

## ⑥ 사용자 확인이 필요한 것

1. **피치 글자 수** — 설계(학습 설계 §2.4)는 200~500자, 코드 `LEARN_TEXT_LIMITS.pitch` 는 100~800자다. 기존 `pitchPromptA/B` 는 '200~500자'를 박아 두어 서버 검사(100~800)와 다르다. 어느 값으로 맞출까요? 문구는 `{min}~{max}` 로 두었다.
2. **'CRL' 표기** — 설계가 임상 2 · 3상 보류를 'CRL'이라 부르지만, 실제 CRL 은 허가 신청(NDA)에 대한 보완 요구 회신이다. 학생 문구에서 약어를 빼고 '임상 보류'로만 쓸까요, 아니면 4.1 문구 폴더와 맞춰 다른 이름을 쓸까요?
3. **복습 문항 안내(`learn.items.reviewGuide`)** — W7(학습 v2) 후속 구현이라 지금 서버에 없다. 구현 전에는 숨겨 둘까요?
4. **기초 연구비가 쉬는 조건** — 서버는 '시계가 흐르고 **최근 30분 안에 모둠원이 화면을 본 모둠**'에만 틱을 준다(`learn.ts` 머리 주석). 설계 문서에는 없는 조건이다. 학생에게 "30분 넘게 아무도 보지 않으면 충전이 쉬어요"를 알릴까요? (지금 문구에는 넣지 않았다.)
5. **전광판 학습 · 투자 소식 문구**(`learn.board.*`)는 전광판 문구 폴더와 겹친다. 어느 쪽에서 관리할까요?
6. **설계 문서 정정**(문구 밖) — 학습 설계 · 균형안의 '8단계' 합계 · Series A 시점('2.2 ADMET · 리드 지정 완료'), 기준 설계 §9 '교사 Series A/B 승인' · §6 표 '$3.000M · $5.000M', LLM 피드백 길이(학습 설계 · `LEARN_GRADE_LIMITS` 200자 / §5.13 · 공통 brief 300자)를 3판 · 코드에 맞춰 고칠까요? 이 세션은 문서를 고치지 않았다.
7. **칩의 ⚡** — 설계 S1 그림에는 `⚡ ×2.1 · 단계 가동 3/4` 처럼 번개가 있고, 지금 코드 `chip` 에는 없다. 넣을까요?

## 독립 검증(2차)

- 검증자: Claude(Opus 5.5) · 2026-10-24 · 앞 작성자 결론을 믿지 않고 `copy.md` 180키를 한 줄씩 다시 대조했다.
- 근거: `.review/2026-10-24-copy-common/brief.md` · 학습 설계 §0~§5 · 균형안 §2 · §3 · 기준 설계 §10(3판) · `packages/web-contract/src/learn.ts`(`LEARN_COPY` · `seriesAQuant` · `seriesBQuant` · `pitchPayout` · `stipendMultiplier` · `displayStreak`) · `money.ts`(`formatCrista`) · `apps/server/src/features/learn.ts`(`recomputeActivity` · `syncProgress` · `pitchEligibility` · 전광판 줄 · `earnShield`) — 모두 읽기만.

### 검사 결과 요약

1. **숫자 · 금액 · 문턱**: 25,000 · 75,000 · 150,000 · 800,000 · 200,000 · 240,000 · 40,000 · ×1.0~×2.5 · +0.1(최대 +0.5) · 2틱(20분) · 30 · 50 · 70 · 80점 · 보호권 최대 2장 · 30자 · 4~200자 · Series A 15,000,000 / B 25,000,000 · 바닥 30% · 정량 20 · 25 · 17 · 8 · 25 · 25 · 20 · ΔG 0.3 kcal/mol · TPSA ≤ 90 · IND 15/10 + E·S 10 이 모두 설계 · 코드와 같다. 법 조항 · 통계는 이 범위에 없다. 크리스타 환산(1 크리스타 = 20 센트, $0.001M = 100,000 센트 = 5,000 크리스타)을 다시 셈해 맞았다. 바닥 보장 4,500,000 · 7,500,000 도 15,000,000 · 25,000,000 × 0.3 과 맞다. 화면 문구에 `$` · `CRISTA` 는 0건이다.
2. **자리표시자**: 180행 모두 문구 안 `{…}` 와 '자리표시자' 칸이 일치한다(스크립트로 확인). `gemini-raw.md` 대비 바뀐 것은 `drawer.path.stipend` 의 `{m}` 삭제 · `board.streakNews` 의 `{team}`·`{streak}`·`{m}` → `{ticker}` · `board.pitchNews` 의 `{team}` → `{ticker}` · 키 합침/나눔(`note.backup.*` → `note.fallback.*`, `note.unchanged` → `err.noteSame`, `rubric.*` → `.mark`/`.word`)뿐이다. 모두 1차 검토 ②에 이유가 있고, 서버 전광판 줄(`◆ ${ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×2.5` · `◆ ${ticker} ${label} ${formatCrista(final)} 투자 유치`)과 대조해 맞다. 사라진 자리표시자는 없다.
3. **과학 · 과장 · 겁주기**: '임상 통과 = 안전 보장' · 'p<0.05 = 효과 확실' 류 표현은 없다. 학생을 탓하거나 겁주는 문장도 없다(플래그 문구는 사실만 알린다). 다만 아래 표의 PLIP 조건 · hERG · IND 풀이를 바로잡았다.
4. **문체**: 해요체는 지켰다. 쉼표로 두 생각을 이은 문장 몇 개와 첫 등장 전문어(서랍의 '피치' · 'Series A · B') 풀이 누락을 고쳤다.
5. **범위 누락**: 개념 · 중급 · 심화 안내(B) · 연구 노트 3칸 안내(C) · 기초 연구비 충전(D) · 가동률 배율(E) · Series A/B 심사(F) · 채점 결과 문장(G)이 모두 있다. 빠진 화면 자리는 찾지 못했다.
6. **4.1 전용 검사**: 이 단계(learn)는 4.1 이 아니라 해당 없음.

### 이번에 고친 것(`copy.md` 근거 칸 `(검증 수정)` 17줄)

| 키 | 고친 내용 | 이유 |
| --- | --- | --- |
| `learn.pitch.quant.affinity` | "수소결합이나 π-π 적층이 잡혔는지" → "수소결합이 2개 이상 잡혔는지 … 수소결합 1개와 π-π 적층이 함께 잡혀도 돼요" · "기준 분자와 견줘" 더함 | 코드 `seriesAQuant` 는 `hbond ≥ 2 또는 (hbond ≥ 1 그리고 π-π ≥ 1)` 이다. 옛 문구는 π-π 적층 하나만 있어도 점수를 받는 것처럼 읽혔다. 결합력 등급은 기준 리간드(`referenceKcal`) 대비 값이다(균형안 §3.1). |
| `learn.activity.howToActivate` | "내가 맡은 연구 노트 칸이 평가에서 50점 이상" → "연구 노트 칸을 하나 맡아 쓰고, 그 노트가 평가에서 50점 이상" | 노트 평가는 칸마다가 아니라 노트 하나에 점수 하나다. 서버는 노트 점수 ≥ 50 인 평가의 작성자(`contributors`) 전원을 가동으로 센다. 칸별 점수가 있는 것처럼 읽히지 않게 했다. |
| `learn.activity.formulaExample` | "4명 중 2명이 가동하면 ×1.5" → "연속 기록이 없을 때 4명 중 2명이 가동하면 ×1.5" · 문장 나눔 | `m = 1 + ρ + 0.1 × min(s, 5)` 라서 연속 기록이 있으면 2명 가동도 ×1.5 보다 높다. 균형안 표도 `s = 0` 조건이다. |
| `learn.activity.exemptHelp` | "가동 인원을 셀 때 빼고 세요" → "가동률을 셀 때 모둠 인원에서 빠져요" · 문장 나눔 | 면제는 분모(모둠 유효 인원)에서 빼는 것이다(학습 설계 §2.3 · 서버 `total`). '가동 인원'에서 뺀다고 하면 분자에서 빼는 것으로 읽힌다. |
| `learn.pitch.floorHelp` | "최대 투자금 × 종합 점수(100점 만점)" → "최대 투자금에 종합 점수 비율(점수 ÷ 100)을 곱한 값" | 그대로 읽으면 15,000,000 × 80 처럼 계산된다. 공식은 `floor(최대 × max(0.30, 점수 / 100))` 이다. |
| `learn.pitch.b.locked` | "IND(임상시험 계획 승인)를 모두 마치면" → "IND(임상시험 계획 신청) 승인을 모두 마치면" | IND 는 '승인'이 아니라 임상시험 계획 **신청**이다. 서버 조건은 그 신청이 `approved` 인 것이다. |
| `learn.pitch.quant.admet` | "hERG(심장 박동을 조절하는 통로를 막는 위험)" → "hERG 위험(약이 심장 박동에 관여하는 hERG 통로를 막아 생기는 위험)" | hERG 는 통로(유전자) 이름이지 위험 자체가 아니다. 약어 풀이가 이름을 '위험'으로 정의하지 않게 했다. |
| `learn.drawer.path.pitch` | '피치 글(투자자를 설득하는 짧은 글)' · 'Series A · B(회사가 차례로 받는 첫 번째 · 두 번째 큰 투자)' 풀이 더함 · 문장 나눔 | 서랍(S2)이 이 낱말의 첫 등장 자리인데 풀이가 없었다. |
| `learn.drawer.path.stipend` · `tier.concept/intermediate/advanced.guide` · `pitch.effects` | 쉼표로 이은 두 생각을 두 문장으로 | 한 문장 한 생각(§5.12). 숫자 · 뜻은 그대로. |
| `learn.stipend.tickToast` · `stipend.settleToast` · `result.revisedPaid` | "{c} 가" → "{c}가"(revisedPaid 는 "늘어난 연구비 {c}가") | `{c}` 는 `formatCrista()` 로 '… 크리스타'까지 채워진다. 한글로 끝나므로 조사를 띄우면 "84,000 크리스타 가"로 찍힌다. |
| `learn.result.aiNote` | "○ · △ · × 만 매겨요" → "○ · △ · × 를 매기고 피드백을 써요. 연구비 금액은 AI 가 아니라 …" | AI 는 항목 지적(80자)과 종합 피드백도 쓴다(학습 설계 §4.2 `GradeOutput`). '만'은 틀린 말이다. 금액을 AI 가 정하지 않는다는 핵심은 살렸다. |

### 1차 결론 중 다시 확인해 맞았던 것

- 돈 자리표시자 뒤 '크리스타' 겹침 제거: `formatCrista()` 가 기본으로 ' 크리스타'를 붙인다(`money.ts`). 맞다.
- 전광판 연속 가동 소식 고정 숫자(5단계 · ×2.5): 서버가 `streak_base` 가 5 를 처음 넘을 때 한 번만 낸다. 맞다.
- Series A 신청 시점 '2.2 특허 후보 1개 이상'(서버 `leadCandidates > 0`) · Series B '3.1 특허 + 3.3 IND 승인'(기준 설계 §10 3판): 맞다.
- 고쳐 내기는 개념 문항도 1회 된다(서버 `canRevise` 는 단을 가리지 않음). `revise.guide` '문항마다 한 번' 맞다.
- 보호권 최대 2장(`LEARN_SHIELDS_MAX`) · 심화 문항 · 노트 80점에서 생김 · 단계를 떠날 때 자동 사용: 맞다.

### 남은 확인 질문(2차에서 새로 생긴 것)

1. `learn.result.underThreshold` 의 "한 번 고쳐 낼 수 있어요"는 이미 고쳐 낸 뒤(2차 시도)에도 30점 미만이면 틀린 안내가 된다. 코드 반영 때 첫 시도에만 보이게 할까요, 아니면 문구를 "아직 고쳐 내지 않았다면 한 번 고쳐 낼 수 있어요"로 바꿀까요?
2. `learn.note.sharedProgress` 의 `{k}` · `{n}` 은 `chip` 의 `{k}` · `{n}`(가동 인원 / 모둠 인원)과 이름은 같고 뜻은 다르다(칸을 쓴 모둠원 / 분담에 필요한 인원). 코드 반영 때 `{authors}` · `{needed}` 로 나눌까요?
