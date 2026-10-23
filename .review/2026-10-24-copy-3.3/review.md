# 3.3 제형 · IND 신청 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon (High) · `agy --mode plan` · 한 번에 성공 · 139줄 · 오류 로그 없음) → 정리본 `copy.md`(195줄).
- 근거로 대조한 것: 설계 §5.9 · §5.10 · §5.11 · §5.13 · §6.1, 시안 `design/step-viz/viz-6.js`, `packages/web-contract/src/ind.ts`(`IND_COPY` · `indRuleFindings` · `indNeedsMonitoring`), `packages/web-contract/src/preclinical.ts`(`mrsdOf` · 제형별 MRSD), `~/Desktop/repo/crista/packages/game-rules/src/pipeline/rules.ts`(읽기만), eCFR 21 CFR 312.23(2026-09-22 판).
- 총평: 사실 숫자(500,000 크리스타 · 30게임 일 · S ≥ 35 / 50 · E ≥ 40 / 45 · S ≥ 55 · 피크 K 1.00 / 1.25 / 0.75 · 환산 계수 6.2 / 1.8 · 60 kg · 하루 5회 · 15회 · 기업가치 0~5% / −8~0%)는 원문에서 모두 맞았다. 고칠 곳은 ① 사실이 어긋난 서술 몇 곳 ② 자리표시자를 엉뚱한 줄에 섞은 것 ③ 해요체 · 한 문장 한 생각 위반 ④ 학생에게 보일 필요가 없는 내부 정보(글자 수 · 영어 상태 코드 · 기업가치 폭)였다.

## ① 설계 사실 대조

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `part.pledge.guide` | "법령(21 CFR 312.23(a)(1)(iii))에 따른 **두 가지 약속**" → "두 가지 약속에 모두 체크해야 … 첫째 약속은 미국 규정 21 CFR 312.23(a)(1)(iii)에 있는 내용이에요." | 312.23(a)(1)(iii)은 '승인(효력 발생) 전에는 임상을 시작하지 않는다'는 약속 하나뿐이다(eCFR 확인). '결과를 숨기지 않는다'는 이 조항이 아니다. |
| `sec.calc_mrsd.guide` | "HED ÷ 안전계수 × 60 kg 이고, 제형마다 피크 계수 K 가 달라 값이 달라질 수 있으니 …" → "**경구** MRSD 는 HED ÷ 안전계수 × 60 kg … 정맥 · 경피를 골랐다면 3.2 결과판의 제형별 MRSD 를 보고 적어요." | `preclinical.ts` `mrsdOf` 는 공식으로 **경구** MRSD 만 내고, 정맥 · 경피 MRSD 는 피크 K 로 따로 줄인 값이다. 학생이 공식만으로 정맥 MRSD 를 낼 수 없으므로 그대로 두면 계산 칸에서 막힌다(⑥-1). |
| `sec.nonclinical.example` | "개가 랫드보다 더 민감 … **간 효소 상승** 소견" → "개가 더 민감(개 NOAEL 18 mg/kg/일) … 개에서 **QT 간격이 늘어나는** 소견" | §5.9 의 교육용 단순화: hERG 위험이면 개가, 간 위험이면 랫드가 더 민감하다. 원문 예시는 이 규칙과 어긋나 학생에게 틀린 짝을 가르친다. 숫자는 §5.9 시안 예시(개 NOAEL 18 → HED 10)에 맞췄다. |
| `rule.risk_monitor.none` | "심장(hERG)과 간 위험 신호가 모두 낮아 … 통과했어요" → "위험 신호가 낮고 관련 소견도 없어요. 감시 칸은 비워 둬도 돼요." | `indNeedsMonitoring` 은 2.2 신호뿐 아니라 3.2 동물 소견(QT · 간)도 본다. `risk_monitor` 는 필수 칸이 아니다. |
| `rule.risk_monitor.fail` | "위험 신호나 동물 소견이 '보통' 이상인 항목" → "위험이 '보통' 이상이거나 동물실험 소견이 있어요" | 소견에는 '보통' 등급이 없다(있다 / 없다). |
| `tool.waterfall.howToRead` | "결합력(p) · 흡수(A) … 를 차례로 곱해" → "결합력 점수(0.3 + 0.7 × p) · 흡수 A …" | 공식은 p 를 그대로 곱하지 않고 (0.3 + 0.7 × p) 를 곱한다(game-rules `efficacy`). |
| `tool.common.preShake` · `approval.phase1Ok` | "1~2상(±6)과 3상(±4) 판정에는 무작위 흔들림" · "실제 1상 판정에는 ±6점 흔들림" → "임상 단계의 결과는 이 예상과 달라질 수 있어요" | brief 의 F41 결정으로 **임상 판정은 Opus 5.5 가 정하고** game-rules 판정값(흔들림 포함)은 교사 화면 참고로만 남는다. ±6 / ±4 를 학생 화면에 약속하면 4.1 과 어긋날 수 있다(⑥-2). |
| `tool.seesaw.lesson` | "한쪽을 올리면 다른 쪽은 **반드시** 내려가요" → "용량을 올리면 E 는 오르고 S 는 내려가요." | 제형 단추로는 반드시 반대로 움직이지 않는다(경구 '좋음' → 정맥: A 는 1.0 그대로, K 만 1.25 로 올라 E 같고 S 만 내려감). '반드시'는 용량에만 맞다. |
| `tool.dose.lesson` | "어느 제형이든 E 와 S 는 X 자로 엇갈려요" → "용량이 커지면 E 선은 오르고 S 선은 내려가요. 제형을 바꾸면 … 엇갈리는 자리가 옮겨 가요." | 후보 · 제형에 따라 0~100 mg 안에서 두 선이 실제로 만나지 않을 수 있다. 오르내림은 늘 맞다. |
| `overview.more.basis` | "동물에서 찾은 안전한 용량을 사람 기준으로 바꾼 MRSD 를 절대 넘지 않아야" → "부작용이 없던 양을 사람 기준으로 바꾸고, 안전하게 더 줄인 값이 MRSD … 시작 용량은 MRSD 를 넘을 수 없어요." | MRSD 는 HED 를 안전계수로 한 번 더 나눈 값이다. '넘지 않아야'의 대상은 시작 용량(규칙 `dose_le_mrsd`)이다. |
| `revise.limitNotice` | "… 같은 서류 판을 다시 부른 경우는 횟수에 세지 않아요" → 삭제 | 설계에 없는 약속이다. 같은 판이면 LLM 을 다시 부르지 않는다는 것만 정해졌고, 하루 횟수에 세는지는 정해지지 않았다(⑥-4). |
| `approval.boardApproved` | "첫 사람 임상시험 **돌입**(기업가치 0~5% 반영)" → "첫 사람 시험 **준비**" | IND 승인 때는 아직 임상을 시작하지 않는다(4.1 에서 모집 → [임상 시작]). 기업가치 폭은 서버가 붙이고, 헤드라인에 넣지 않는다. |
| `approval.boardHeld` | "IND 보류(Clinical Hold) — … 임상 계획 재검토(기업가치 −8~0% 반영)" → "IND 보류 — {code} · {disease}" | 위와 같다. 영어 병기는 학생에게 필요 없다. |
| `approval.row.endpoint` | "1차 평가지표(1상: 안전성 · 이상사례 / 다음 상 기준)" → 행을 둘로: `row.phase1Endpoint` '1상 1차 평가지표' · `row.endpoint` '다음 상의 1차 평가지표' | 승인서(`IndApprovalView`)에 `phase1Endpoint` 와 `endpoint` 가 따로 있다. 한 칸에 섞으면 어느 값인지 헷갈린다. |
| `approval.row.score` | "예상 점수(흔들림 없음, S ≥ 35 통과)" → "예상 점수(흔들림 없음)" | 행 이름에 판정을 박으면 보류 건(예외)에서 틀린 글이 된다. |

## ② 자리표시자 바뀜 / 새로 생김

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `tool.plane.howToRead` | 안내문 안에 `({form} {dose} mg — E {e} · S {s})` → 안내문에서 빼고 `3.3.tool.plane.pick` 으로 따로 둠 | 안내문은 점을 고르기 전에 보인다. 이 자리에는 채울 값이 없다. 기존 `toolNotes.planePick` 과 같은 자리로 되돌림. |
| `tool.peak.howToRead` | 한 문장에 `{v}` · `{rk}` · `{form}` · `{mrsd}` 넷 → 안내문은 자리표시자 없이, `3.3.tool.peak.limit`(`{v}` · `{rk}`) · `3.3.tool.peak.mrsd`(`{form}` · `{mrsd}`) 로 나눔 | 기존 코드에서 두 값은 그래프 선 이름표(`peakLimit` · `peakMrsd`)다. 한 문장에 넣으면 코드가 채우기 어렵다. |
| `tool.common.mrsdLine` | "이 제형의 MRSD(최대 권장 시작 용량) 한계선은 {mrsd} mg 이에요." → "이 제형의 MRSD {mrsd} mg" | 그래프 선 옆 짧은 이름표 자리(`toolNotes.mrsdLine`)다. 풀이는 overview 에서 이미 했다. |
| `revise.limitNotice` | "모둠 하루 15회" 고정 숫자 → `{teamN}` **(새)** | 상한은 서버 설정(§5.11 횟수)이다. 학급 · 운영에 따라 바뀔 수 있다. 코드 반영 때 채움 값을 더해야 한다. |
| `submit.waiting` | "{from}일차 접수 → {to}일차 판정 예정 · 진행률 {pct}% — 나라에서 신청서를 검토하고 있어요" → "게임 {from}일 접수 → 게임 {to}일 판정 · {pct}%" | 진행 띠 한 줄 자리다. 실제 날짜와 헷갈리지 않게 '게임'을 붙였다. |
| 그 밖 | 바뀐 이름 없음 | `{what}` · `{which}` · `{dose}` · `{form}` · `{mrsd}` · `{s}` · `{min}` · `{a}` · `{b}` · `{n}` · `{fee}` · `{days}` · `{p1}` · `{gap}` · `{ticker}` · `{code}` · `{disease}` 모두 기존 이름 그대로다. |

## ③ 과학적으로 틀린(또는 어설픈) 비유 · 풀이

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `tool.lab.lesson` | "hERG, 심장 박동 통로 유전자 위험" → "hERG 위험(심장 박동을 조절하는 통로를 막아 심장 리듬을 흐트러뜨릴 위험)" | hERG 는 심장 칼륨 통로를 만드는 유전자다. 위험은 '유전자'가 아니라 약이 그 통로를 막는 것이다. |
| `tool.common.brainPop` | "뇌 노출(BBB 통과율 B)" → "뇌 노출 B(약이 혈액뇌장벽, 즉 뇌를 지키는 거름막을 지나 뇌에 닿는 정도)" | B 는 통과율(%)이 아니라 BBB 신호로 정한 배율(1.00 · 0.70 · 0.35)이다. BBB 도 풀이가 필요했다. |
| `sec.stop_rule.example` | "QT 간격(심장이 수축하고 다시 쉬기까지의 시간)이 500 ms" → "QTc(심장이 한 번 뛰고 다음 박동을 준비하기까지 걸리는 시간을 심박수로 보정한 값)가 500 ms" · "ALT/AST" → "ALT(간세포가 다치면 핏속에 늘어나는 효소)" | 500 ms 기준은 실제로 보정 QT(QTc)에 쓴다. 전문어 풀이를 더했다. |
| `tool.peak.concept` · `lesson` | 원문 `peak.lesson` 에 개념 그림 주의만 있고 배울 점이 없었음 → `concept`(주의) · `lesson`(정맥은 한꺼번에 들어가 꼭대기가 높고, 경피는 천천히 스며들어 낮다) 둘로 | 시안 6.06 배울 점을 살렸다. 정맥 주사의 최고 농도가 가장 높고 경피가 낮다는 방향은 실제 약동학과도 맞다. 곡선 모양은 실제 측정값이 아니라는 단서는 그대로 남겼다. |
| `overview.more.analogy` | "… 것과 같아요" → "… 것과 비슷해요" | 비유가 완전히 같지는 않다. '같다'보다 '비슷하다'가 더 정확하다. |

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `sec.pledge_hold.label` · `sec.pledge_report.label` | "… 투여하지 않겠습니다" · "… 즉시 보고하겠습니다" → "… 시험하지 않아요" · "… 숨기지 않고 보고해요" | 합쇼체 → 해요체(문체 규칙 2). |
| `revise.itemStatus.*` | "문제 없음(ok) — …" 등 영어 코드 병기 → "문제 없어요" · "빠졌어요 — …" · "앞뒤가 안 맞아요 — …" · "분명하지 않아요 — …" | 학생 화면에 내부 코드를 보이지 않는다. 명사형 → 해요체. |
| `revise.itemHeader` · `feedbackHeader` | "…(80자 이내)이에요" · "…(300자 이내)이에요" → "[AI 심사] 칸별 지적" · "[AI 심사] 종합 피드백" | 글자 수 상한은 LLM 출력 규칙이지 학생 안내가 아니다. 머리말은 짧게 했다. 이의 제기는 `revise.appeal` 로 따로 뺐다. |
| `revise.status` | "보완 요구 — 지적된 칸을 고쳐서 … 다시 심사받으세요" → "보완 요구" + `revise.statusHint` | 상태 딱지 자리(`status.revise`)는 짧아야 한다. |
| `revise.teacherNotice` | 대기(재시도)와 선생님 수동 심사를 한 문장에 → `retryNotice` · `teacherNotice` 둘로 | 서버 상태가 다르다(pending 재시도 / 거절 · 장애 끝에 교사 처리). 한 문장 한 생각. |
| `tool.lab.howToRead` · `tool.dose.howToRead` · `tool.plane.howToRead` · `part.*.guide` · `sec.*.guide` 여러 줄 | 쉼표로 이은 긴 한 문장 → 두세 문장으로 나눔 | 한 문장 한 생각. |
| `sec.subject.example` | "기저 질환 변수 · 내약성" → "원래 앓던 병이 없는 사람이어야 부작용을 약 때문인지 가려내기 쉬워요" | 풀이 없는 전문어 두 개를 쉬운 말로 바꿨다. |
| `sec.nonclinical.guide` | "랫드" → "랫드(실험용 큰 쥐)" | 처음 나오는 전문어. |
| `part.cover.guide` | "작용 기전" → "기전 … 기전은 약이 몸에서 효과를 내는 원리예요." | 처음 나오는 전문어. |
| `part.nonclinical.guide` · `part.risk.guide` | 비임상 · 피험자 풀이 없음 / 괄호 → 문장으로 풀이 | 처음 나오는 전문어. |
| `sec.calc_hed.guide` | `**더 낮은 값**` 마크다운 굵게 → 굵게 없앰 | 화면 문자열에 마크다운이 그대로 보인다. |
| `overview.more.scale` | "마법 같은 용량은 없어요" → "함께 좋게 만드는 용량은 없어요" | 설계 문장에 맞췄다. 과장은 뺐다. |
| `overview.more.oneLine` | "우리 스타트업 제약회사가 … 투여해도 안전한지" → "우리 회사가 … 써 봐도 되는지" | 허락의 대상은 '안전한지'가 아니라 '시험해도 되는지'다. 문장도 줄였다. |

## ⑤ 기존 COPY 키와 대응

- **맞출 키**(값만 바꾸면 됨): `overview.*` · `tools.{lab,seesaw,peak,dose,plane,waterfall}.{tab,question,fills}` · `toolNotes.{fills, mrsdLine, mrsdOk, mrsdOver, mrsdNone, noGrid, peakConcept, peakLimit, peakMrsd, doseNote, planeNote, planePick, planeApply, planeApplied, waterfallE, waterfallS, waterfallNote, seesawNote, brainPop, knob*}` · `forms.*.label` · `parts.*.{title, guide}` · `sections.*.{label, placeholder(← example), guide}` · `checklist.*`(← `sec.*.criterion`) · `rules.*` · `status.*` · `doc.{heading, planEmpty, lockedStep, rulesTitle, rulesHint, reviewBtn, reviewLimit, reviewPending, reviewTeacher, reviewStale, submitBtn, submitConfirm, waiting, locked, approvedTitle, approvedNote, heldNote, approvalRows.*, phase1Gap, phase1Ok, population, endpoint, phase1Endpoint, pledgeOn}` · `board.{approved, held}`.
- 주의: `checklist.*` 는 LLM 심사관 체크리스트(프롬프트) 문구이기도 하다. `sec.*.criterion` 은 학생 화면용('심사 기준: …?')이라 `checklist.*` 를 덮어쓰지 말고 `sections.*.guide` 쪽 또는 새 키로 넣기를 권한다.
- **새 키**(코드에 없음): `tool.*.howToRead` · `tool.*.lesson` · `tool.dose.zone` · `tool.peak.concept`(기존 `peakConcept` 와 합칠 수 있음) · `part.shareHint` · `sec.phase1Endpoint.label` · `revise.statusHint` · `revise.itemHeader` · `revise.itemStatus.{ok,missing,inconsistent,unclear}` · `revise.feedbackHeader` · `revise.appeal` · `revise.resubmitGuide` · `revise.retryNotice` · `submit.passedNotice` · `approval.row.phase1Endpoint`.
- **새 자리표시자**: `{teamN}`(모둠 하루 심사 상한).
- 정리본에 없는 기존 키(이번 범위 밖이거나 문구가 아닌 것): `forms.*.short` · `forms.*.mark` · `roles.*` · `levels.*` · `gates.*` · `statusMark.*` · `doc.{newDoc, newDocHint, planTitle, pick, candidate, serverFill, verdict.reject}` · `errors.*`. `errors.*` 는 오류 문구 묶음이라 따로 다듬을 수 있다.

## ⑥ 사용자 확인이 필요한 것

1. **정맥 · 경피를 고른 학생의 ④ MRSD 계산 칸**: 공식(HED ÷ 안전계수 × 60 kg)으로는 경구 MRSD 만 나온다. 그런데 규칙 `calc_match` 는 고른 제형의 MRSD(`mrsdMgByForm[form]`)와 견준다. 정리본은 '정맥 · 경피는 3.2 결과판의 제형별 값을 보고 적는다'로 안내했다. 이렇게 갈지, 아니면 계산 칸을 '경구 MRSD'로 고정하고 제형별 값은 서버가 붙일지 정해 주세요.
2. **임상 흔들림(±6 · ±4)을 3.3 화면에 숫자로 보일지**: F41 에서 임상 판정을 Opus 5.5 가 정하게 바뀌었다. 정리본은 '임상 결과는 예상과 달라질 수 있어요'로 숫자를 뺐다. 시안 6.02 · 6.09 문구와 `IND_COPY.preShake` 도 같은 방향으로 맞출지 정해 주세요.
3. **관문 기준 숫자(35 · 50 · 40 · 45 · 55)를 문구에 박을지**: 기존 `IND_COPY` 처럼 글에 그대로 썼다. 서버가 `rules.thresholds` 를 내려 주므로 `{ind}` · `{p1}` 같은 자리표시자로 바꿀 수도 있다. 4.1 판정이 LLM 으로 넘어가 1상 이후 기준이 '참고'가 된 것과 함께 정해 주세요.
4. **같은 서류 판의 캐시 결과를 하루 5회에 세는지**: 설계에 없다. Gemini 는 '세지 않는다'고 썼고, 정리본은 그 문장을 뺐다.
5. **⑤ 중단 기준 예시의 숫자(QTc 500 ms · ALT 정상 상한 3배)**: 설계에 없는 실제 임상 관행 숫자다. 예시 문장(placeholder)에만 쓰고 규칙 · 심사에는 쓰지 않는다. 그대로 둘지, 숫자 없는 예시('기준보다 … 늘면')로 돌릴지 정해 주세요.
6. **④ 서버 자동 첨부에 HED · MRSD 가 보이는지**: §5.10 표는 서버가 HED · MRSD 를 자동 첨부한다고 하고, 같은 칸에서 학생이 직접 계산하게 한다. 첨부가 먼저 보이면 계산 칸은 베껴 쓰기가 된다. 첨부를 계산 칸이 맞은 뒤에 보이게 할지 확인해 주세요(문구는 'NOAEL · 효력 · 소견 · 사용 마릿수'만 첨부로 적었다).
7. **예시 질환**: `sec.title.example` 은 기존 placeholder 의 '경도 알츠하이머병'을 그대로 썼다. 모둠의 실제 질환으로 바꿔 보이게 할지(`{disease}` 자리표시자를 새로 쓸지) 정해 주세요.

## 독립 검증(2차)

- 날짜: 2026-10-24 · 검증자: Claude(Opus 5.5) — 앞 검토 결론을 믿지 않고 근거를 다시 대조했다.
- 대조한 근거: `copy-common/brief.md` · 설계 §5.3(소식 표) · §5.9 · §5.10 · §5.11 · §5.14 · §6.1 · 시안 `design/step-viz/viz-6.js` · `packages/web-contract/src/ind.ts`(`IND_COPY` · `indRuleFindings` · `indNeedsMonitoring`) · `packages/web-contract/src/preclinical.ts`(`mrsdOf` · `SAFETY_FACTOR` · `mrsdMgByForm`) · `packages/web-contract/src/review.ts`(`REVIEW_LIMITS`) · `apps/server/src/reviews.ts`(`requestReview`) · `apps/web/src/board/steps/s33*.tsx`(채움 값) · `~/Desktop/repo/crista/packages/game-rules/src/pipeline/rules.ts`(읽기만).
- `gemini-raw.md` 는 고치지 않았다. 코드 · 설계 문서도 고치지 않았다.

### 검사 결과 요약

1. **숫자 · 금액 · 기간 · 문턱 · 법 조항**: 한 줄씩 대조했다. 500,000 크리스타($0.100M ÷ $0.001M × 5,000) · 30게임 일 · IND S ≥ 35 · 1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 · S ≥ 55(game-rules `thresholds`) · 피크 K 1.00 / 1.25 / 0.75 · B 배율(비 CNS 1.0) · (0.3 + 0.7 × p) · 환산 계수 6.2 / 1.8 · 60 kg · 안전계수 10 / 20 · 하루 5회 / 15회(`REVIEW_LIMITS`) · 개 NOAEL 18 → HED 10 → 경구 MRSD 60(§5.9 예) · 21 CFR 312.23(a)(1)(iii)(승인 효력 전 시험 시작 금지 약속) 모두 맞다. 화면 문구에 `$` 는 없다. 설계 밖 숫자는 ⑤ 중단 기준 예시(QTc 500 ms · ALT 정상 상한 3배) 둘뿐이고, 실제 1상 관행과 맞는 예시 값이다(앞 검토 ⑥-5 그대로 둠).
2. **자리표시자**: `gemini-raw.md` 의 자리표시자 23종이 `copy.md` 에 모두 남아 있고, 줄마다 '자리표시자' 칸과 문구 안 `{…}` 가 일치한다(스크립트로 확인). 다만 **`tool.peak.limit` 이 코드의 `{min}` 을 숫자 35 로 박아 버렸다** — 앞 검토는 "기존 이름 그대로"라고 했지만 놓쳤다. 고쳤다(아래 표).
3. **과학 · 과장**: '가장 크게'(hERG 만 콕 집음) · '한계선을 넘으면 S 가 떨어져요'(S 는 꼭대기에 따라 계속 내려가고, 한계선은 IND 기준 아래로 내려가는 지점) · '얻는 만큼 잃는다'(같은 양으로 읽힘) 세 곳을 고쳤다. '점은 늘 왼쪽 위로'는 확인했다 — Dt × Rk × K 최대 30 × 2.2 × 1.25 = 82.5 라 50 mg 에서 S 가 0 이 되는 조합이 없어 늘 왼쪽으로 간다. 겁주는 표현은 없다.
4. **문체**: 해요체는 모두 맞다. 처음 나오는 전문어 중 NOAEL · HED(④ 칸 머리 안내가 먼저 보임) · QT 의 풀이가 빠져 있어 더했다. '안전계수는 보통 10'의 '보통'은 위험 등급 '보통'과 헷갈려 '기본'으로 바꿨다.
5. **범위**: 7묶음은 다 덮었다. 다만 신청서 화면에 실제로 보이는 짧은 이름표 14개(`gates.*` · `roles.*` · `doc.newDoc` · `newDocHint` · `planTitle` · `pick` · `candidate` · `serverFill` · `planCandidateGone` · `noFunds`)가 빠져 있어 채웠다. `errors.*`(서버 오류 문구 19개)는 이번에도 범위 밖으로 두었다.
6. **4.1 전용 검사**: 3.3 이라 해당 없음. 다만 3.3 문구 안의 4.1 관련 약속이 §5.14 와 맞는지는 봤다(아래 `phase1Gap`).

### 고친 것

| 키 | 앞 정리본 → 고친 문구 | 이유 |
| --- | --- | --- |
| `tool.peak.limit` | "IND 한계 {v} = (100 − 35) ÷ 위험 배율 {rk}" → "IND 한계 {v} = (100 − {min}) ÷ 위험 배율 {rk}" · 자리표시자 칸에 `{min}` | 코드 `toolNotes.peakLimit` 는 `{min}` 이고, 화면(`s33-tools.tsx`)이 `rules.thresholds.ind` 로 채운다. 숫자를 박으면 서버 문턱과 따로 논다. |
| `approval.phase1Gap` | "… 4.1 에서 용량을 바꿀 수 있어요." → "… 1상 참고 기준(S ≥ {p1})까지 {gap} 모자라요. 4.1 임상은 이 승인서의 용량으로 시작해요. 1상이 보류되면 다시 도전할 때 용량이나 제형을 바꿀 수 있어요." | §5.14 ① — 4.1 은 승인서 값을 **고정**해 가져오고, 바꾸려면 재도전 경로로만 한다(brief F41 재도전 3경로). 앞 문구는 4.1 에서 바로 바꿀 수 있다고 약속했다. |
| `approval.phase1Ok` · `overview.more.misconception` | "1상 기준(S ≥ …)" → "1상 참고 기준(S ≥ …)" · "1상의 안전 기준(S ≥ 50)은 더 높아요" → "1상의 안전 기준은 더 높아요(참고 기준 S ≥ 50)" | F41 · §5.11 예외로 임상 판정은 AI 시뮬레이션이 정하고 game-rules 문턱은 참고다. 같은 정리본의 `tool.lab.howToRead` · `gate.*` 도 '참고'라 부른다. |
| `revise.limitNotice` | 캐시 문장 없음 → "내용이 바뀌지 않은 신청서는 앞 심사 결과를 그대로 돌려줘요. 이때도 횟수에 세지 않아요." 추가 | 앞 검토 ⑥-4 는 '설계에 없음'으로 지웠지만, 구현 `reviews.ts` `requestReview` 가 이미 정했다: 같은 판은 기존 결과를 돌려주고, 같은 내용(해시) 캐시는 `counted = !byRule && !injected && !cached` 로 세지 않는다(`REVIEW_LIMITS.perDocPerDay` 주석 'LLM 을 부르는 것만 센다'). 그래서 ⑥-4 는 닫는다. |
| `tool.lab.lesson` | "용량과 분자의 hERG 위험이 안전 S 를 가장 크게 흔들어요" → "용량과 분자의 위험 신호가 안전 S 를 크게 흔들어요. 분자의 위험 신호는 hERG 위험(…)과 간 위험이에요." | 간 위험 더하는 값(0 / 0.25 / 0.6)이 hERG(0 / 0.3 / 0.6)와 거의 같다. 간 위험만 높은 분자에서는 'hERG 가 가장 크다'가 틀린다. 시안 6.05 도 '가장'이 아니라 '크게'다. |
| `tool.peak.lesson` | "꼭대기가 한계선을 넘으면 S 가 떨어져요" → "… S 가 IND 기준보다 낮아져요" | S 는 꼭대기에 비례해 늘 깎인다. 한계선 = (100 − 기준) ÷ Rk 는 'S 가 기준 아래로 내려가는 지점'이다. |
| `tool.plane.lesson` | "효능 E 를 얻는 만큼 안전 S 를 잃기 때문이에요" → "… 얻는 대신 …" | '만큼'은 같은 양으로 읽힌다. 실제로 E 오름(De 0.6 → 0.85 → 1.0)과 S 내림(Dt 10 → 30 → 55)의 크기는 다르다. |
| `part.nonclinical.guide` | NOAEL · HED 풀이 없음 → "NOAEL(부작용이 보이지 않은 가장 높은 용량)" · "HED(사람 등가 용량)" | 화면에서 ④ 칸 머리 안내가 칸별 안내보다 먼저 보인다. 첫 등장 풀이 규칙. |
| `sec.nonclinical.guide` | "NOAEL(…)과 소견(간 수치 · 심전도 QT 등)도 해석해요" → "NOAEL 과 소견도 해석해요. 소견에는 간 수치 상승이나 심전도 QT(심장이 한 번 뛰고 다시 회복하기까지 걸리는 시간) 연장 같은 것이 있어요." | QT 가 처음 나오는 곳인데 풀이가 없었다(풀이는 뒤의 중단 기준 예시에만 있음). NOAEL 풀이는 앞 칸으로 옮겼다. 긴 한 문장도 나눴다. |
| `sec.calc_mrsd.guide` | "(안전계수는 보통 10, 동물을 너무 적게 썼으면 20)" → "안전계수는 기본 10 이고, 3.2 에서 마릿수를 '적게'로 했다면 20 이에요." | '보통'이 위험 등급 '보통'과 헷갈린다. 20 이 되는 조건은 §5.9 · `SAFETY_FACTOR` 의 마릿수 수준 '적게'(low)다 — 학생이 3.2 에서 고른 이름을 그대로 썼다. |
| `sec.risk_monitor.example` | "hERG 위험이 '보통'이라 … 간 소견도 있어서 …" → "hERG 위험이 '높음'이고 개에서 QT 소견도 있었어요. 그래서 … 간 위험도 '보통'이라 매주 피검사로 간 수치를 확인해요." | 바로 앞 ④ 예시(개가 민감 · QT 소견 · 간 소견 없음)와 같은 분자로 읽히는데 '간 소견'이 새로 생겨 앞뒤가 안 맞았다. 시안 6.03 예시 분자(hERG 높음 0.60 · 간 보통 0.25)와 `indNeedsMonitoring`(신호 '보통' 이상 또는 소견)에 맞췄다. 학생에게 '서류 앞뒤가 맞아야 한다'를 가르치는 예시라 더 중요하다. |

### 채운 것(범위 누락)

| 키 | 문구 | 근거 |
| --- | --- | --- |
| `tool.common.gate.{ind, phase1, phase2, phase3}` | IND · 1상(참고) · 2상(참고) · 3상(참고) | 6.05 관문 신호 이름표 · `gates.*` |
| `tool.common.role.{lead, backup}` | 주력 · 백업 | 6.05 후보 손잡이 · `roles.*` |
| `doc.newDoc` · `doc.newDocHint` | 새 신청서 쓰기 · "신청서는 모둠에 하나만 만들어져요. 누가 눌러도 모둠원 모두가 같은 신청서를 함께 써요." | `doc.newDoc` · `newDocHint`(원문의 '—' 이음을 두 문장으로) |
| `doc.planTitle` · `doc.pick` · `doc.candidate` · `doc.serverFill` · `doc.planCandidateGone` | 고른 조합 · 골라 주세요 · 후보 · 서버가 채운 값 · (지금은 주력 · 백업이 아니에요) | 신청서 화면 이름표 · 해요체로 |
| `submit.noFunds` | 모둠 연구비가 모자라서 접수할 수 없어요. | 접수 단계 막음 문구 · `doc.noFunds` |

### 확인만 하고 그대로 둔 것

- `approval.notDrugApprovalNote` 는 코드 `approvedNote` 의 `{p1}`(1상 기준) 문장을 뺐다. 바로 아래 `phase1Gap` · `phase1Ok` 가 같은 말을 `{p1}` 로 하므로 정보는 사라지지 않는다. 코드의 `fillIndCopy(D.approvedNote, { p1 })` 는 자리표시자가 없어도 그대로 돌아간다.
- `sec.calc_mrsd.guide` 의 '정맥 · 경피는 3.2 결과판의 제형별 MRSD 를 보고 적어요': `preclinical.ts` 가 정맥 · 경피 MRSD 를 `maxSafeDoseMg × ratio × (10 ÷ 안전계수)` 로 따로 내고, §5.9 ⑤ 결과판이 '제형별 MRSD' 행을 보이므로 맞다(앞 검토 ⑥-1 은 설계 결정으로 남김).
- 21 CFR 312.23(a)(1)(iii) 는 Form FDA 1571 의 '승인(효력 발생) 전 임상 시작 금지' 약속이다. 둘째 서약(결과 보고)에 조항을 붙이지 않은 앞 수정이 맞다.
- `approval.boardApproved` · `boardHeld` 는 §5.3 소식 표(`◆ DAON IND 승인` / `보류`)와 맞다. 변동 폭(0~5% / −8~0%)은 서버가 붙인다.

### 남은 확인 질문(앞 ⑥ 에서 바뀐 것)

- ⑥-4(캐시 결과를 하루 횟수에 세는지)는 **닫았다** — 구현이 '세지 않음'으로 정했다(위 표).
- ⑥-1 · ⑥-2 · ⑥-3 · ⑥-5 · ⑥-6 · ⑥-7 은 그대로 남는다.
- **새 질문 ⑥-8**: brief 의 FMARKET 과정 점수에 '서류 보완 횟수'가 들어간다. 정리본은 보완 요구를 '무료'라고만 안내한다(돈으로는 맞다). 보완 횟수가 기업가치 과정 점수에 반영된다는 것을 3.3 화면에서 미리 알릴지 정해 주세요. 알린다면 `revise.statusHint` 에 한 문장을 더하면 된다.
- **새 질문 ⑥-9**: brief F41 의 실패 바운티는 IND 도 50% 환급 대상이다. `approval.heldNotice`(보류 안내)에 '원인 분석을 내면 수수료 일부를 돌려받을 수 있다'를 넣을지 정해 주세요. 3.3 보류는 교사 정정 같은 예외에만 나오므로 지금은 넣지 않았다.
