# LLM 심사관 「학생에게 말하는 법」 단락 5종 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon (High) · `agy --model gemini-4-argon-high --effort high --mode plan` · 첫 실행에 성공 · 89줄 표 + 메모 3줄 · `gemini-run.log` 비어 있음 = 오류 없음) → 정리본 `copy.md`(97줄 = 원문 89 + Claude 보충 8, 그중 32줄 Claude 수정).
- 대조한 근거: 설계 §5.8 · §5.9 · §5.10 · §5.11 · §5.12 · §5.13 · §5.14 · §5.15, `copy-common/brief.md`, `packages/web-contract/src/review.ts`(`REVIEW_LIMITS` · `DOC_REVIEWER_LABEL`), `patent.ts` · `preclinical.ts` · `ind.ts` · `approval.ts`(체크리스트 · 칸 이름 · `*_COPY`), `clinical.ts`(`SIM_TEXT_MAX` · `CLINICAL_COPY`), `apps/server/src/reviews.ts`(`HOW_TO_TALK_TO_STUDENTS` · `buildReviewSystemPrompt`), `features/clinical-sim.ts`(`buildSimSystemPrompt`), `features/patents.ts` · `preclinical.ts` · `ind.ts` · `approval.ts` 의 LLM 사실 키(모두 읽기만).
- 총평: 범위(공통 + 5종)는 빠짐없이 덮었고, 예시 글 32개 모두 글자 수 상한(80 / 300 / 400 / 200) 안이다. 숫자(80 · 300 · 400 · 200 · 40자, 1/3 DLT, 10%p SAE, 75% 완료, p < 0.05, 20% 체중 감소, 랫드 6.2 · 개 1.8)는 맞았다. 고친 곳은 ① 시스템 프롬프트(고정 · 캐시)의 지시 줄에 자리표시자를 넣은 것 ② 지금 서버가 넘기지 않는 사실(안전계수 · 선행 특허)을 인용하게 한 것 ③ p 값 풀이 · hERG 풀이 · 피크 K 같은 과학 표현 ④ 정답을 대신 써 주는 힌트 ⑤ 한 문장에 여러 생각 ⑥ 재도전 경로 이름이 `CLINICAL_COPY` 와 다른 것이다.

## ① 설계 사실 대조

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `reviewer.patent.rule.anatomy_mech` | "「이름표의 뜻」 · 「번호를 이렇게 붙인 이유」와 기전 세 칸이 **사실의 표적 종류와 맞는지**" → "「이름표의 뜻」 · 「번호…」는 조각마다 뜻이 앞뒤가 맞는지 봐요. 기전 세 칸은 사실의 표적 종류와 맞는지 짚어요." | 체크리스트가 둘로 나뉜다. `code_meaning` 은 조각 뜻의 앞뒤(예: SEUM = 세움제약), `mech_fits_target` 만 표적과 맞는지 본다. 이름표 뜻을 표적과 맞추라 하면 LLM 이 엉뚱한 지적을 낸다. |
| `reviewer.patent.rule.prior_art` · `ex.note.unclear` | 선행 특허({priorCode} · {similarity})를 늘 짚게 함 → '사실에 선행 특허가 있을 때만'으로 바꾸고, 예시는 `ex.note.prior_art` 로 따로 뺌(조건부) · `ex.note.unclear` 는 배경기술 예시로 교체 | §5.8 "정하기 전에는 4번을 건너뛴다". 지금 `patents.ts llmFacts` 는 `prior_art_check: 'skipped'` 만 넘긴다. 사실에 없는 선행 특허를 말하면 `facts_only` 규칙과 어긋난다. |
| `reviewer.iacuc.rule.species_and_count` · `ex.note.inconsistent` | "마릿수 수준({animalCount}마리)과 **안전계수({safetyFactor})**" → "고른 마릿수 수준과 그 근거" · 예시는 "후보당 {animalsPerCandidate}마리" | IACUC 사실(`features/preclinical.ts`)에는 `animal_level` · `animals_per_candidate` · `animals_total` 은 있지만 안전계수는 없다. 대신 설계 사실(적게 → 안전계수 10 → 20 → MRSD 절반)을 지시 줄 `iacuc.rule.reduction_tradeoff` 로 보충했다(Claude 보충). |
| `reviewer.ind.ex.note.inconsistent` | "NOAEL({noaelRat} **mg/kg**)" → "mg/kg/일" · "독성 없다는 말" → "'독성 없음'" | §5.9 NOAEL 단위는 mg/kg/일. 사실 키도 `noaelRatMgPerKgDay`. |
| `reviewer.ind.ex.feedback.revise` | "…HED {hed} mg/kg, MRSD {mrsd} mg 이 있으니 사실과 맞춰 고쳐요" → "사실에는 랫드의 간 수치 상승 소견이 있으니 맞춰 고쳐요" · "지원자" → "건강한 지원자" | 지적의 핵심은 '간 소견 ↔ 독성 없음'(§5.10 ④ 예). HED · MRSD 숫자는 이 지적과 상관없고 계산 칸은 규칙 몫이다. §5.9 단순화(간 위험 → 랫드가 더 민감)에 맞춰 랫드로 적었다. |
| `reviewer.ind.rule.monitor_by_signal` | "(위험이 낮으면 일반 감시로 충분)" 빠짐 → 보탬 | `IND_COPY.checklist.monitor_fits` 원문. 없으면 위험이 낮은 서류에도 감시 계획을 요구할 수 있다. |
| `reviewer.ind.rule.calc_by_rules` | "시작 용량 상한({mrsd} mg) 초과 여부" → "시작 용량이 MRSD 를 넘는지" | 규칙 판정 대상만 바꾸지 않고, 시스템 프롬프트에서 자리표시자를 뺐다(②). |
| `reviewer.nda.rule.patient_readable_caution` | "…행동 수칙을 **8~120자로** 적게 안내해요" → 글자 수 삭제 | `NDA_SECTION_MIN 8` · `MAX 120` 은 규칙 검사다. LLM 이 글자 수를 말하면 규칙과 겹친다. |
| `reviewer.nda.rule.no_hype` | 과장 표현이 "「효능 · 효과」**이나 브랜드 이름**에 있으면 **3상 결과 범위로** 줄이도록" → 효능 · 효과 칸만 | 브랜드 이름은 '3상 결과 범위'로 줄이는 대상이 아니다(`brand_honest` = 과장 · 착각). 브랜드는 `brand_respect` 줄이 맡는다. |
| `reviewer.sim.rule.verdict_allowed_no_money` | "비용 · 환급 · **기간** · 기업가치 · 전광판" → "상 기간(게임 일)" | 분석 서술은 '12주째 평균'처럼 시험 안의 주차를 말해야 한다(`weeks`). 막을 것은 상 기간(90 / 180 / 360 게임 일)이다. |
| `reviewer.sim.ex.recommendation.next_phase` | "더 많은 환자에게 효능과 안전성을 **확증하는** 다음 상" → "다음 상에서는 더 많은 환자에게서 효능과 안전성을 살펴요" | 1상 → 2상에도 쓰이는 문장인데, '확증'은 3상의 목적이다(§5.14 · clinical-sim 판정 기준). 3상 통과 뒤 문장은 `after_phase3` 로 보충했다. |
| `reviewer.sim.ex.recommendation.retry_same` | "인원 흔들림으로 … 같은 프로토콜 다시 경로로 새 코호트에서 한 번 더" → "인원이 목표보다 적어 신뢰구간이 넓었어요. 모집 인원을 더 늘려 '같은 프로토콜로 다시'…" | §5.14: 같은 입력이면 해시 캐시로 같은 결과가 나온다 — '모집 인원 등 입력이 달라져야 의미가 있다'. 이 사실을 지시 줄 `sim.rule.same_needs_change` 로도 보충했다. |
| `reviewer.sim.ex.recommendation.retry_amend` | "**시작 용량**을 낮추어" → "용량을 낮춰" | 4.1 의 용량은 프로토콜의 계획 용량이다. '시작 용량'은 3.3 1상 첫 용량(≤ MRSD)의 말이라 섞이면 헷갈린다. |
| `reviewer.sim.ex.recommendation.retry_backup` | "3.2 전임상 백업 후보로 바꾸는 백업 교체 경로" → "…'백업 후보로 교체(새 IND)'를 검토해요. 3.3 에서 새 IND 를 내야 해요." | §5.14 재도전 3: 백업 교체는 3.3 새 IND 가 필요하다. |

## ② 자리표시자 바뀜 / 새로 생김

원칙: **시스템 프롬프트는 고정 블록(캐시)** 이라 서버가 값을 바꿔 넣지 않는다(§5.13). 그래서 지시 줄(`rule.*`)에서는 자리표시자를 모두 뺐고, 예시(`ex.*`)의 `{…}` 는 런타임 LLM 이 `<facts>`(4.1 은 자기 출력 칸)의 값으로 바꿔 쓰는 자리로 두었다 — 이 뜻을 `reviewer.common.rule.placeholder`(Claude 보충)로 프롬프트에 적는다.

| 자리표시자 | 어디 | 대응하는 서버 사실 · 출력 키 | 처리 |
| --- | --- | --- | --- |
| `{dG}` | patent 예시 · common 예시 | `candidate_dg_kcal_per_mol` | 유지 |
| `{refDG}`(새) | patent 예시 | `reference_dg_kcal_per_mol` | 유지 |
| `{refDrug}`(새) | `patent.ex.note.unclear` | `reference_drug` | 새로 씀(Claude) |
| `{priorCode}` · `{similarity}`(새) | Gemini: `patent.rule.prior_art` · `ex.note.unclear` | 없음(`prior_art_check: 'skipped'`) | 지시 줄에서 뺌 · 조건부 예시 `ex.note.prior_art` 로만 남김 |
| `{animalCount}` · `{safetyFactor}`(새) | Gemini: iacuc 지시 줄 · 예시 | `animals_per_candidate` 만 있음 · 안전계수 없음 | `{animalsPerCandidate}`(새) 하나로 바꿈 · 안전계수 삭제 |
| `{mrsd}` | Gemini: `ind.rule.calc_by_rules` · `ind.ex.feedback.revise` | `mrsdOralMg` · `mrsdIvMg` · `mrsdTransdermalMg` | 지시 줄 · 피드백 예시에서 뺌 |
| `{hed}`(새) | Gemini: `ind.ex.feedback.revise` | `hedMgPerKg` | 뺌(지적과 상관없음) |
| `{noaelRat}`(새) | `ind.ex.note.inconsistent` | `noaelRatMgPerKgDay` | 유지 · 단위 mg/kg/일로 고침 |
| `{codeName}`(새) | sim 예시 | 사실 `codeName` | 유지 · Gemini 가 지시 줄 `exact_output_numbers` 에도 넣은 것은 뺌 |
| `{n}` · `{diff}` · `{p}` | sim 예시 | 출력 `randomized` 합 / `primaryN` · `diff` · `pValue` | 유지 |
| `{ciLow}` · `{ciHigh}` | sim 예시 | 출력 `diffLow` · `diffHigh` | 유지(이름이 출력 칸과 다름 — 지시 줄에서는 출력 칸 이름 `diffLow~diffHigh` 로 적었다) |
| `{doseMg}`(새) · `{dltCount}`(새) | sim 예시 | 사실 `plannedDoseMg` · 출력 `dlt` | 유지 |
| `{completedPct}`(새) | `sim.ex.analysis.held_operational`(Claude 보충) | 출력 `completed ÷ randomized` 에서 계산 | 새로 씀 |

## ③ 과학적으로 틀린 비유 · 표현

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `reviewer.sim.rule.stat_gloss_and_caution` · `sim.ex.analysis.pass` | "p 값(**우연히 이런 차이가 나올 확률**…)" → "p 값(**약이 정말 효과가 없다면** 이만큼 이상의 차이가 우연히 나올 확률)" | 원문은 '이 결과가 우연일 확률'로 읽히는 흔한 오해다. p 값은 '효과가 없다고 가정할 때' 이만큼 이상 극단적인 결과가 나올 확률이다. 풀이 길이는 늘지만 문체 규칙 4(틀린 비유 금지)가 우선한다. |
| `reviewer.ind.rule.monitor_by_signal` | "hERG **심장 이온통로** 신호" → "hERG(심장 칼륨 통로)" | §5.9 대체 시험 표: "심장 칼륨 통로를 얼마나 막나". '이온통로'는 틀리지 않지만 설계 풀이와 맞췄다. |
| `reviewer.ind.ex.note.unclear` | "제형 **피크 계수(K) 예상치**" → "그 제형의 피크 계수 K" | K 는 예상치가 아니라 제형마다 정해진 계수다(경구 1.00 · 정맥 1.25 · 경피 0.75, §5.10). '예상치'는 E · S 에만 쓴다. |
| `reviewer.iacuc.rule.three_r_gloss` | 개선(Refinement) 풀이에서 '사육 환경' 빠짐 → 보탬 · 감소 풀이 "통계적으로 믿을 수 있는 최소 마릿수만" → "필요한 최소 마릿수, 단 통계적으로 믿을 수 있을 만큼은" | §5.9 윤리 카드 2 원문 그대로. 원문 표현은 '적을수록 좋다'로 읽혀 감소 원칙의 단서(믿을 수 있을 만큼은)를 흐린다. |
| `reviewer.sim.ex.analysis.held_safety` | "CTCAE 3등급 ALT 상승" → "ALT(간 수치) 상승" | 과학적으로는 맞지만 전문어 풀이(문체 규칙 1)가 빠졌다. |
| (그대로 둠) `reviewer.patent.rule.dg_sign` · `avoid.dg_direction` | "더 음수일수록 더 단단히 붙어요" | 맞다(ΔG 가 더 음수 = 결합이 더 유리). 3.1 효과 칸 지적의 핵심이라 그대로 둔다. |

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이 · 정답 대신 쓰지 않기)

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `reviewer.common.rule.off_topic_injection` | "…답하지 않고 그 사실을 학생에게 말하지도 않으며 flags 로만 처리해요" → 두 문장 | 한 문장에 세 생각. |
| `reviewer.common.rule.minor_safety` · `no_medical_or_gore` | 두 생각을 '~고'로 이은 한 문장 → 두 문장 | 같은 이유. |
| `reviewer.patent.rule.no_overlap_smiles` | 중복 · 신규성 + SMILES 금지 한 문장 → 두 문장 | 같은 이유. |
| `reviewer.patent.ex.feedback.revise` | 효과 칸 지적이 한 문장에 ΔG 풀이 · 두 숫자 · 고칠 일을 다 담음 → 세 문장으로 나눔 | 한 문장 한 생각. 글자 수는 300 안(253 → 230자). |
| `reviewer.iacuc.rule.replacement_depth` · `iacuc.ex.feedback.revise` | "세포나 컴퓨터 모델만으로는 확인할 수 없는 **온몸 독성**이 무엇인지 덧붙이도록" → "동물 없이는 확인할 수 없는 것이 무엇인지 학생이 직접 적도록 물어요" | '온몸 독성'은 대체 칸의 정답을 대신 써 주는 힌트다(`no_ghostwrite` · 기존 `HOW_TO_TALK_TO_STUDENTS` "정답 문장을 대신 써 주지 않아요"). |
| `reviewer.sim.ex.analysis.*` | 한 문장에 평균 차이 · CI · p · 판정을 '~였고 ~으로 ~해' 로 이음 → 숫자 하나에 한 문장 | 400자 안에서 나눠도 충분하다(가장 긴 예시 261자). |
| `reviewer.nda.rule.brand_respect` | 칸 이름에 「」 없음 → 「브랜드 이름」 | 칸 이름은 「」로 감싼다는 공통 규칙. NDA 심사 요청은 브랜드를 `brand` 칸으로 함께 넘긴다(`features/approval.ts`). |
| (확인만) 전 예시 | 해요체 · 「칸 이름」 · 판정/금액 없음(서류 4종) · 동사로 끝맺기 | 모두 지킴. '통과 · 승인 · 거절'은 `avoid.*` 줄에서만 나온다. 4.1 해설만 판정을 말한다(⑥-2). |

## ⑤ 기존 COPY 키 · 코드와 대응

| 이 문서의 키 | 맞출 자리 | 메모 |
| --- | --- | --- |
| `reviewer.common.rule.reader` · `haeyo` · `jargon` · `section_name` · `no_ghostwrite` · `facts_only` | `reviews.ts` `HOW_TO_TALK_TO_STUDENTS` 4줄 | 지금 4줄을 대신한다. 뜻은 그대로이고 예(MRSD → NOAEL)만 바뀐다. |
| `reviewer.common.rule.length` | `buildReviewSystemPrompt` '출력 규칙'의 note · feedback 줄 · `REVIEW_LIMITS.noteMax / feedbackMax` | 겹친다. 조립 때 한쪽만 남겨도 된다(숫자는 상수에서 끼워 넣는 지금 방식이 안전). |
| `reviewer.common.rule.no_verdict_money` | `buildReviewSystemPrompt` "돈 · 등재 · 최종 판정은 서버가 정합니다" | 같은 뜻 — 학생에게 '말하지 않는다'는 쪽을 더한다. |
| `reviewer.common.rule.off_topic_injection` | `buildReviewSystemPrompt` 심사 원칙(flags 줄) | 같은 뜻 + '학생에게 말하지 않음'. |
| `reviewer.common.rule.ai_identity` · `avoid.agency` | `AiBadge`('AI 심사') · `DOC_REVIEWER_LABEL` | 시스템 프롬프트 첫 줄은 "…특허심사관 역할을 맡은 서류 심사관"이다. 역할은 두되 실제 기관이라 말하지 않게 한다. |
| `reviewer.patent.*` · `iacuc.*` · `ind.*` · `nda.*` | `buildReviewSystemPrompt(kind, …)` 에 서류별 단락을 더하는 자리(지금은 공통 단락 하나) | **새 구조**: `HOW_TO_TALK_TO_STUDENTS` 를 `Record<DocKind, string>` 같은 꼴로 나눠야 한다. 판 `patent-v1` · `iacuc-v1` · `ind-v1` · `nda-v1` → `-v2`. |
| `reviewer.iacuc.rule.use_deliberation` | `PRECLINICAL_COPY` 상태 '심의 중' · '보완 요구' · '승인' | 화면 말과 맞춘다. |
| `reviewer.sim.rule.length_and_term` · `code_name_only` · `stat_gloss_and_caution` | `clinical-sim.ts buildSimSystemPrompt` '## 글' 4줄 · `SIM_TEXT_MAX`(analysis 400 · recommendation 200 · term 40) | '## 글' 단락을 `reviewer.sim.rule.*` 로 바꾼다. 바꾸면 `simulatorVersion` 을 올린다(캐시가 옛 글을 돌려주지 않게). |
| `reviewer.sim.rule.retry_three_paths` · `ex.recommendation.retry_*` | `CLINICAL_COPY` 재도전 이름('같은 프로토콜로 다시' · '용량 · 제형 바꾸기(IND 변경)' · '백업 후보로 교체(새 IND)') | Gemini 는 설계 이름(같은 프로토콜 다시 · 용량 · 제형 변경 · 백업 교체)을 썼다 → 화면 이름으로 맞췄다. |
| `reviewer.sim.rule.verdict_allowed_no_money` | `CLINICAL_COPY.holdKind` | 보류 종류 이름이 같다. |
| `reviewer.sim.rule.calm_ae_and_sim_notice` | `CLINICAL_COPY.aiBadge` · `aiNotice` | 화면 배지 · 안내와 같은 뜻. 글 안에서 되풀이할 필요는 없다. |
| `HOW_TO_TALK_TO_STUDENTS` 의 다른 사용처 | `features/learn.ts` 학습 채점 시스템 프롬프트 | **공통 줄을 바꾸면 학습 연구비 채점도 바뀐다** → 채점 판(`graderVersion`)도 올려야 한다(⑥-3). |

## ⑥ 사용자 확인이 필요한 것

1. **4.1 분석 서술 길이** — 설계 §5.13 미성년자 안전장치는 "학생 화면에 보이는 LLM 글은 구조화 출력의 짧은 칸(지적 80자 · 피드백 300자)뿐"이라고 적는데, 구현(`SIM_TEXT_MAX`)은 analysis 400자 · recommendation 200자다. 지금 초안은 구현 값을 따랐다. 400 / 200 을 그대로 둘지, 설계에 맞춰 analysis 를 300자로 줄일지 정해 주세요.
2. **4.1 해설이 판정을 말해도 되나** — 서류 심사 4종은 '판정 · 금액을 말하지 않음'이지만, 임상 판정은 사용자 지시로 LLM 이 정한다(§5.11 예외). 초안은 해설에서 통과 · 보류와 보류 종류는 말하고 돈 · 환급 · 상 기간 · 기업가치 · 전광판은 말하지 않게 했다. 이 선이 맞는지 확인해 주세요.
3. **공통 단락과 학습 채점** — `HOW_TO_TALK_TO_STUDENTS` 는 학습 연구비 채점(`learn.ts`)도 쓴다. 공통 줄(`reviewer.common.rule.*`)을 채점에도 그대로 쓸지, 서류 심사용과 나눌지 정해 주세요. 공통으로 쓰면 '칭찬과 고칠 점' · '판정 말하지 않음'이 채점 피드백에도 걸린다(채점 피드백은 지금 "잘한 점 하나와 다음에 더할 점 하나"라 맞는 편이다).
4. **위기 신호 처리(미성년자 안전)** — 학생 글에 자해 · 괴롭힘 같은 위기 신호가 있을 때, 지금 규칙은 '답하지 않고 flags 로만'이다. 그런데 flags 는 `injection` · `off_topic` · `copied` · `not_korean` 넷뿐이고 교사 알림은 `injection` 에만 간다. `safety_concern` 같은 플래그 + 교사 알림을 더할지(8b 코드 변경 · 스키마 변경 필요) 정해 주세요.
5. **선행 특허 줄** — Tanimoto ≥ 0.85 선행 특허 검사는 아직 꺼져 있다(`prior_art_check: 'skipped'`). 조건부 줄(`patent.rule.prior_art` · `ex.note.prior_art`)을 지금 프롬프트에 넣어 둘지, 검사가 켜질 때 넣을지 정해 주세요.
6. **예시의 자리표시자** — 시스템 프롬프트의 예시에 `{dG}` 같은 자리표시자를 둘지(LLM 이 사실 값으로 바꿔 씀), 설계 시안 숫자(예: 개 NOAEL 18 mg/kg/일 · MRSD 60 mg)로 박을지 정해 주세요. 숫자를 박으면 LLM 이 그 숫자를 그대로 베낄 위험이 있어 초안은 자리표시자를 택했다.
7. **서류별 단락 구조** — 서류마다 다른 단락(`reviewer.patent.*` 등)을 쓰려면 `buildReviewSystemPrompt` 가 kind 별 단락을 받도록 바뀌어야 한다(8b 통합 뒤). 이 구조로 가도 되는지 확인해 주세요. 시스템 프롬프트가 길어지는 것은 Opus 5.5 최소 캐시 길이(512 토큰)를 넘기기 쉬워져 오히려 캐시에 유리하다.

## 독립 검증(2차)

- 날짜: 2026-10-24 · 검증자: Claude(앞 작성자 결론을 믿지 않고 근거를 다시 대조)
- 대조한 근거: `copy-common/brief.md`, 설계 §5.8 ~ §5.15 · §12-19, 구현 기록 F41 줄, `packages/web-contract/src/review.ts` · `patent.ts`(`sectionLabel`) · `preclinical.ts` · `ind.ts` · `approval.ts`(`sectionLabel` · 체크리스트) · `clinical.ts`(`PHASE_RULES` · `RECRUIT_TIERS` · `CLINICAL_COPY.routes` · `routeWhy` · `holdKind` · `SIM_TEXT_MAX`), `apps/server/src/reviews.ts`(`HOW_TO_TALK_TO_STUDENTS` · `buildReviewSystemPrompt`), `features/clinical-sim.ts`(`buildSimSystemPrompt` · `buildSimUserMessage` · `simInputHash`), `features/clinical.ts`(`referenceFor` · `startTrial` · `trialBountyKey`), `features/patents.ts` · `preclinical.ts` · `ind.ts` 의 LLM 사실 키. 모두 읽기만 했다.

### 확인만 한 것(맞음)

- 숫자: 지적 80자 · 피드백 300자(`REVIEW_LIMITS`) · analysis 400 · recommendation 200 · term 40(`SIM_TEXT_MAX`) · DLT 1/3 · 3상 SAE 10%p · 완료 75% · p < 0.05 · CTCAE 1~5 · 체중 20% 감소 · 안전계수 10 → 20 → MRSD 절반 · 랫드 + 비글견. 모두 설계 · 코드와 같다.
- 화폐: `copy.md` 에 `$` · 크리스타 금액이 하나도 없다(LLM 글은 금액을 말하지 않으므로 맞다). 환산(1 크리스타 = 20 센트 · $0.001M = 5,000 크리스타)은 이 문서에 쓰일 곳이 없다.
- 칸 이름 「」: 특허 `PATENT_COPY.sectionLabel` · 동물실험계획서 칸 · IND `sectionLabel` · NDA `sectionLabel`(「효능 · 효과 (한 줄)」 · 「라벨 주의사항 ①/②」) · 「브랜드 이름」과 글자까지 같다.
- 자리표시자: 표의 '자리표시자' 칸과 문구 안 `{…}` 가 97줄 모두 일치한다. Gemini 원문의 `{mrsd}` · `{hed}` · `{animalCount}` · `{safetyFactor}` 를 뺀 것은 ②의 이유(시스템 프롬프트는 고정 · IACUC 사실에 안전계수 없음)대로 맞다. 참고로 IND 사실에는 `safetyFactor` 가 있다 — IACUC 에서만 없다.
- 예시 글 35개 모두 상한 안(가장 긴 4.1 analysis 286자 / 400).
- 4.1 판정 예외(§5.11 — 임상 판정만 LLM)와 '돈 · 환급 · 상 기간 · 기업가치 · 전광판은 말하지 않음'이 맞게 들어 있다. 결과 공개 시점(상 기간이 끝나는 게임 일)은 해설이 말할 것이 아니고(상 기간 금지), 모집 투자 3단계(기본 = 추가 비용 없음 · 느림 / 확대 / 집중)도 돈 이야기라 해설에 넣지 않는 것이 맞다.

### 고친 것(`copy.md` 근거 칸에 '(검증 수정)')

| 키 | 고친 내용 | 이유 |
| --- | --- | --- |
| 머리말 '조립' 줄 | 4.1 해설에서 `facts_only` · `no_repeat` · `off_topic_injection` · `ai_identity` 도 뺀다 | `facts_only`('숫자는 <facts> 값만')는 해설 숫자가 같은 출력의 칸(diff · p · CI)에서 오는 `sim.rule.exact_output_numbers` 와 정면으로 어긋난다. 시뮬레이션 출력에는 칸별 ok · flags 가 없고, 화면 표시는 'AI 임상 시뮬레이션'이라 'AI 심사관'이 맞지 않는다. |
| `reviewer.common.rule.placeholder` | '임상 해설에서는 같은 출력의 숫자 칸 값으로 바꿔 써요' 한 문장 보탬 | 4.1 예시의 `{n}` · `{diff}` · `{p}` 는 `<facts>` 에 없다. 원문대로면 LLM 이 '사실에 없으니 숫자 없이' 쓰게 된다. |
| `reviewer.sim.rule.same_needs_change` → `same_when_luck`(키 이름 바꿈) | '입력이 같으면 결과도 같아요' 삭제 → "'같은 프로토콜로 다시'는 새 참여자를 다시 모으는 길이에요. 참여자 흔들림(운)이 원인으로 보일 때 권하고, 그렇게 본 근거를 함께 말해요." | 설계 §5.14 괄호와 §12-19 는 '시도 번호를 입력에 넣을지'를 열어 두었지만, **구현은 넣었다** — `startTrial` 의 `referenceFor(…, \`${revision}:${phase}:${attempt}\`)` 로 코호트가 시도마다 바뀌고 그것이 `simInputHash` 에 들어간다. 구현 기록 F41 도 '같은 프로토콜(새 참여자)', `CLINICAL_COPY.routeWhy.same` 도 '운이 나빴다고 볼 때 — 새 참여자를 다시 모아요', 바운티는 코호트 흔들림이면 `same_retry` 를 정답에 넣는다. 앞 판 문장은 학생에게 틀린 사실을 말하게 한다. |
| `reviewer.sim.ex.recommendation.retry_same` | '모집 인원을 더 늘려' → '새 참여자를 목표 인원에 가깝게 모아' | 위와 같은 이유(새 참여자). 인원이 적어 신뢰구간이 넓었다는 앞 문장과 맞춘다. |
| `reviewer.sim.ex.recommendation.retry_backup` | '3.2 에서 정한 백업 후보로 … 3.3 에서 새 IND 를 내야 해요' → '백업 후보가 있다면 … 백업 후보는 1상부터 다시 시작해요' | 시뮬레이터 입력(`buildSimUserMessage`)에 백업 유무가 없다(백업은 0~1개). 구현은 4.1 재도전 탭 안에서 IND 변경 심사(30게임 일) 뒤 1상 모집이고 `CLINICAL_COPY.routeWhy.backup` 도 '백업 후보로 1상부터 다시'다. '3.3 에서 내야'는 학생을 3.3 화면으로 잘못 보낸다. |
| `reviewer.sim.rule.retry_three_paths` | 둘째 문장을 '보류일 때 recommendation 에는 …'로 한정 · 경로 이름에 따옴표 | 한정이 없으면 통과 때도 재도전 이름을 쓸 수 있다. '용량 · 제형 바꾸기' 안의 '·' 가 목록 구분자와 같아 이름이 넷으로 읽힌다. |
| `reviewer.sim.rule.verdict_allowed_no_money` | 보류 종류 이름에 따옴표 | 같은 이유('효능 · 안전 둘 다' · '운영 문제(모집 · 탈락)'). |
| `reviewer.sim.ex.analysis.held_efficacy` | p 값 풀이 · 1차 평가지표 풀이를 보탬 · CI 와 p 를 두 문장으로 나눔(212 → 274자) | analysis 하나하나가 학생에게 따로 보이는 글이라 그 글 안의 첫 등장에서 풀어야 한다(문체 규칙 1). 앞 판은 p 값 풀이가 빠졌고 한 문장에 두 생각이었다. |
| `reviewer.sim.ex.analysis.pass` | '1차 평가지표(이 시험에서 가장 중요하게 재기로 정한 값)' 풀이 보탬(261 → 286자) | 설계 §5.10 이 1차 평가지표를 '처음 나올 때 괄호로 푸는 전문어'로 꼽는다. |
| `reviewer.sim.ex.recommendation.next_phase` | '더 많은 환자에게서' → '더 많은 참여자에게서' | 이 문장은 1상 → 2상에도 쓰인다. 1상은 대개 건강한 지원자라 '더 많은 환자'는 1상에도 환자가 있었던 것처럼 읽힌다. |
| `reviewer.iacuc.rule.reduction_tradeoff` | '학생이 이 맞바꿈을 근거로 썼는지 봐요' → "사실의 마릿수 수준이 '적게'일 때만, 학생이 이 맞바꿈을 알고 골랐는지 봐요" | 한정이 없으면 '알맞게'를 고른 서류에도 맞바꿈 서술을 요구해 `c_reduction`('고른 후보와 마릿수 수준의 근거')보다 엄한 지적이 나온다. IACUC 사실에 `animal_level` 이 있어 LLM 이 가릴 수 있다. |
| `reviewer.ind.ex.feedback.revise` | '랫드의 간 수치 상승 소견' → '간 수치 상승 소견' | IND 사실 `animalFindings` 는 소견 이름만 있고 종 구분이 없다. 예시에 종을 붙이면 LLM 이 사실에 없는 종을 지어낼 수 있다(`facts_only`). |
| `reviewer.nda.ex.feedback.revise` | 긴 두 문장을 다섯 문장으로 나눔 · '브랜드 이름' → 「브랜드 이름」 · '정해진 용량을 지키는 방법이나' 삭제 | 한 문장 한 생각 · 칸 이름은 「」(공통 규칙). 고칠 점이 셋을 넘지 않게 라벨 ② 지적을 하나로 줄였다(225 → 202자). |

### 남은 확인 질문

1. **'같은 프로토콜로 다시'의 결정성** — 설계 §5.14 재도전 1 의 괄호('같은 입력이면 해시 캐시로 같은 결과 — 입력이 달라져야 의미')와 구현(시도 번호가 코호트 · 입력 해시에 들어가 새 참여자 = 새 결과)이 다르다. §12-19 의 '시도 번호를 입력에 넣을지'를 구현대로(넣음) 확정하고 §5.14 괄호를 고칠지 정해 주세요. 이 초안은 구현을 따랐다.
2. **백업 유무를 시뮬레이터 사실에 넣을지** — 지금은 `buildSimUserMessage` 에 백업이 없어, 해설이 '백업 후보가 있다면'처럼 조건으로만 말할 수 있다. `hasBackup` 같은 사실을 넣으면 권고가 또렷해지지만 입력 해시 · `CLINICAL_SIM_VERSION` 이 바뀐다(8b 코드).
3. **4.1 해설의 공통 줄 범위** — 이번에 `facts_only` · `no_repeat` · `off_topic_injection` · `ai_identity` 를 해설 조립에서 뺐다. 해설에도 'AI 시뮬레이션'이라는 자기 표시 줄을 따로 둘지(지금은 화면 `aiBadge` · `aiNotice` 가 맡음) 정해 주세요.
4. 앞 판의 질문 ⑥-1 ~ ⑥-7 은 그대로 남는다(특히 ⑥-1 analysis 400자 대 설계 §5.13 '피드백 300자').
