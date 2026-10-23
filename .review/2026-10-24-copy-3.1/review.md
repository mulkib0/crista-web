# 3.1 물질특허 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon High · `agy --mode plan` · 219키) → `copy.md`(248키 = 원문 219 + 보충 29, 원문 중 93줄 수정).
- Gemini 실행: **성공**. 1회 실행으로 표와 메모가 완결된 채 나왔다(재실행 없음). `gemini-run.log`(stderr)는 비어 있다. 다만 `agy` 프로세스는 출력을 다 쓴 뒤에도 한동안 끝나지 않고 대기했다(Bash 600초 제한을 넘겨 백그라운드로 넘어감). 출력 파일은 그 사이 바뀌지 않았다(md5 `98557aa6…` 네 번 확인). 출력이 끝난 뒤 남은 프로세스는 SIGTERM 으로 정리했다(읽기 전용 plan 모드라 부작용 없음).
- 근거: 설계 §5.8 · §5.8.1 · §5.11 · §5.13 · §7.4 ⑩ ⑪, 시안 `design/step-viz/viz-5.js`(5.01 · 5.02 · 5.04 · 5.06), `packages/web-contract/src/patent.ts`(`PATENT_COPY` · `PATENT_SECTIONS` · `checkCodeName`), `review.ts`(`REVIEW_LIMITS` · `DocReviewView.stage`).
- 형식: 항목마다 `원문 → 고친 문구 · 이유`. 문구가 길면 줄였다(전문은 copy.md).

## ① 설계 사실 대조(금액 · 기간 · 문턱 · 법 조항 · 통계)

**맞게 옮긴 것(고치지 않음)**: 출원료 250,000 크리스타 · 3건 750,000 크리스타 · 초기 연구비 10,000,000 크리스타의 7.5% · 출원서 1건당 하루 5회 · 모둠 하루 15회 · Tanimoto ≥ 0.85 · Morgan 반지름 2 · 82 / 246 / 328마리 · 8모둠 × 3 = 24줄 · Stock & Molinoff 2002 · 특허법 시행규칙 [별지 제15호서식] · 칸 글자 수 13칸 모두(2~60 · 4~80 · 6~120 · 10~60 · 8~160 · 20~400 · 15~300 ×2 · 30~600 · 10~100) · 티커 3~4자(시안의 2~4자를 3판으로 바로잡음) · 다음 단계 3.2 전임상 · 동물실험 · `$` 없음.

**틀린 것(고침)**

1. `3.1.rule.limit` 「…기존 특허를 포기하거나 **초안을 거두어야** 해요」 → 「받아들여짐과 심사 중인 출원서만 세요. 등록 특허를 포기하거나 심사가 끝나길 기다려요」 · 상한은 '받아들여짐 + 심사 중'만 센다(§5.8.1). 초안을 거둬도 칸이 비지 않는다.
2. `3.1.err.not_editable` 「**심사 중이거나** 이미 받아들여짐 · 거절 · 포기 처리된 출원서는 고칠 수 없어요」 → 「지금은 이 출원서를 고칠 수 없어요. 받아들여짐 · 거절 · 거둠 상태예요」 · 심사 중에도 칸은 고칠 수 있다(§7.4 ⑪ — 결과는 심사한 판에만 붙고 '심사 뒤 바뀜'). 심사 중에 잠기는 것은 코드명뿐이다.
3. `3.1.ledger.note` 「같은 분자는 **먼저 낸** 스타트업 것」 → 「먼저 **받아들여진** 모둠 것」 · §7.4 ⑩ — 등록은 먼저 커밋된 받아들임이 이긴다. 먼저 '낸' 쪽이 심사에서 늦으면 진다. 「출원 순서대로」도 '받아들여진 순서대로'로(원장 `class_seq` 는 받아들임 트랜잭션에서 매김).
4. `3.1.review.stage.rules` 「1단계로 서버 규칙을 **검사하고 있어요**」 → 「규칙 검사에서 끝났어요. AI 심사는 하지 않았어요」 · `stage: 'rules'` 는 규칙에서 걸려 LLM 을 부르지 않은 결과다(기존 `PATENT_COPY.reviewStage.rules`).
5. `3.1.review.stage.teacher` 「**AI 심사 장애가 이어져** … 통과시켜 주실 수 있어요」 → 「선생님 확인을 기다려요. 선생님이 직접 보고 판정할 수 있어요」 · 교사 대기는 장애뿐 아니라 거절(refusal) · 인젝션 표시에서도 온다(§5.13). 판정 결과를 '통과'로 미리 약속하지 않는다.
6. `3.1.code.target.guide` 「**학급 표적 설정**에 맞춰 자동으로 채워져요」 → 「우리 모둠이 고른 표적의 유전자({gene})가 자동으로 들어가요. 지금 표적 버전의 표적과 같아야 해요」 · 표적은 모둠이 1.1 에서 고른 표적 버전이다(§5.8 ② '이 표적 버전의 표적과 같음').
7. `3.1.err.no_properties` 「도킹 점수나 ADMET 물성 자료가 아직 없어요」 → 「이 분자의 물성을 계산하지 못했어요」 · 서버 오류 `noProperties` 는 RDKit 물성 계산 실패다.
8. `3.1.doc.save.bad_people` 「…**아무도 선택되지 않았어요**」 → 「발명자에 우리 모둠원이 아닌 사람이 있어요」 · 저장 때 빈 칸은 늘 허용된다(`sectionShapeProblem`). '아무도 없음'은 심사 전 '빈 칸'(missing)이다.
9. `3.1.review.status.abandoned` 「포기」 → 「거둠 · 포기」 · 상태 `abandoned` 는 초안 거두기와 등록 특허 포기를 함께 담는다.
10. `3.1.review.fee_note` 「출원료 {fee}(250,000 크리스타)」 → 「출원료 {fee}」 · 같은 값을 두 번 적었다. 학급 설정이 바뀌어도 맞도록 자리표시자만 둔다.
11. `3.1.limit.why_head` 「최대 3건」 → 「**기본** 최대 3건」 · 상한은 학급 설정(1~4, 기본 3)이다. `3.1.limit.class_setting` 을 보충했다.
12. `3.1.rule.novelty` 「승인약 · **공지 분자**」 → 「데이터셋 'ChEMBL 승인약' · 'ZINC 소형' 분자」 · 설계 원문의 데이터셋 이름 그대로. `novelty_ok` 도 같게.
13. `3.1.limit.abandon_confirm` 「출원료(250,000 크리스타)」 → `{fee}` · 위 10과 같은 이유.
14. `3.1.err.patent_in_use` 「3.3 단계」 → 「3.3 제형 · IND 신청」 · 단계 이름을 온전히.

## ② 자리표시자 — 바뀜 · 새로 생김

**프롬프트에 준 이름을 그대로 썼다**(Gemini 가 새로 만든 이름 없음). 기존 `PATENT_COPY` 함수 인자와 견준 변화는 아래와 같다. 구현자가 넘길 값을 늘려야 하는 곳이다.

| 키 | 기존 `PATENT_COPY` | copy.md | 비고 |
| --- | --- | --- | --- |
| `3.1.pick.same_as_ref` · `fingerprint_note` | 인자 없음 | `{ref}` | 기준 약 이름(`PatentFactsView.referenceName`) |
| `3.1.code.piece.tick` · `problem.empty` · `no_dash` · `tick_mismatch` · `rule.code_name` | 없음 | `{ticker}` | `PatentsResponse.ticker` |
| `3.1.code.problem.taken` · `code.ok` · `locked` · `locked_reviewing` · `err.code_taken` | 없음 | `{code}` | 입력 중 코드명 |
| `3.1.code.target.guide` · `how.selective.desc` · `doc.*.guide`(mech · title · field) | 없음 | `{gene}` | `PatentFactsView.gene` |
| `3.1.doc.field.guide` · `claim_use.*` | 없음 | `{disease}` | 질환 |
| `3.1.doc.background.guide` · `effect.guide` | 없음 | `{ref}` `{refDG}` `{dG}` `{parentDG}` | `referenceKcal` · `dockingKcal` · `parentKcal`(없으면 '—') |
| `3.1.doc.problem.missing` · `too_short` · `too_long` · `bad_choice` | 인자 없음(짧은 문구) | `{label}` `{min}` `{maxLen}` | `PATENT_SECTIONS[key].min/max`. 기존 `rule.format(label, problem)` 과 겹치니 하나만 쓴다 |
| `3.1.doc.save.too_long` | 없음 | `{maxLen}` | 〃 |
| `3.1.doc.collab.conflict` · `collab.last_editor` · `review.requested_by` | 없음(새 키) | `{name}` | `DocSectionView.byName` · `DocReviewView.requestedByName` |
| `3.1.rule.balance` · `balance_ok` · `balance_at_accept` | 없음 | `{balance}` `{fee}` | `balanceCents` · `feeCents` → 크리스타 문자열 |
| `3.1.rule.duplicate` | `(code)` | `{code}` | 기존과 같음 — 단 이 `{code}` 는 **원장의 다른 모둠 코드명**이다 |
| `3.1.rule.duplicate_at_accept` | 없음 | 없음 | Gemini 가 `{code}` 를 붙였으나 뺐다(받아들임 경합에서 이긴 쪽 코드명은 서버가 아직 넘기지 않는다) |
| `3.1.rule.limit_at_accept` | 없음 | `{max}` | |
| `3.1.rule.prior_art_revise` | 없음(새 키) | `{priorCode}` `{similarity}` | 4번 검사가 켜질 때 |
| `3.1.review.quota_guide` | 없음(새 키) | `{left}` | 오늘 남은 횟수 — 서버가 아직 주지 않는다 |
| `3.1.ledger.accepted` | 인자 없음 | `{code}` `{patentNo}` `{seq}` `{fee}` | `PatentApplicationView.patent` |
| `3.1.limit.abandon_confirm` | 없음 | `{code}` `{fee}` | |
| `3.1.err.live_exists` · `same_molecule` · `doc_stale` · `limit.withdraw_confirm` | 없음 | 없음 | Gemini 가 `{code}` · `{name}` 을 붙였으나 뺐다 — 초안은 코드명이 비어 있을 수 있고(`codeName: null`), `docStale` 409 는 고친 사람 이름을 돌려주지 않는다 |
| `3.1.doc.facts.*` | 이름표(인자 없음) | 이름표(인자 없음) | Gemini 가 `출원인 — {company} ({ticker})` 처럼 값까지 넣었으나 이름표로 되돌렸다. 값은 화면이 옆 칸에 그린다(기존 구조) |
| `3.1.ledger.headline_no_disease` | `headline(…, disease null)` | 새 키 | 질환이 없을 때(보충) |
| `3.1.review.teacher_note` | `ui.teacherNote(note)` | `{note}` | **새 자리표시자**(보충) — 교사 판정 메모 |
| `3.1.code.summary_note` | `ui.codeSummaryNote(codes)` | `{codes}` | **새 자리표시자**(보충) — 우리 모둠이 쓴 코드명 목록 |

- 조사: Gemini 원문에 `{code}는` · `{disease}을` · `{ref}는` · `{code}과` · `{gene}에` 처럼 자리표시자 바로 뒤에 받침을 가정한 조사가 있었다. 코드명 끝 숫자(101 '일' · 102 '이')나 질환 이름에 따라 틀린다. 모두 조사 없는 꼴로 바꿨다(예: `우리 모둠이 이미 쓴 코드명이에요({code})`).

## ③ 과학적으로 틀리거나 지나친 비유 · 서술

1. `3.1.doc.effect.example` 「…안정적인 결합력을 보였어요. … ADMET 신호가 양호해 {disease} 치료제로서 **효과가 뛰어나요**」 → 「예(숫자는 보기): 도킹 ΔG 가 -9.1 kcal/mol 로 기준 약(-8.7)보다 0.4 낮아요. 그래서 더 단단히 붙을 것으로 예측돼요. 부모 분자(-8.2)보다도 0.9 낮아졌어요. 도킹은 계산 예측이라 '예측돼요'로 써요」 · 원문은 숫자와 상관없이 '뛰어나다'고 단정한다. 이는 설계가 막으려는 '효과 주장 ↔ 첨부 숫자 불일치'의 본보기다. 도킹 ΔG 는 계산 예측이라 치료 효과를 말할 수 없다. 자리표시자 예시는 ΔG 가 기준보다 약한 모둠에서 틀린 문장이 되므로 '보기 숫자'로 바꿨다.
2. `3.1.code.how.selective.desc` 「목표 표적에**만** 골라서 붙어요」 → 「목표 표적에 주로 붙고 다른 단백질은 덜 건드려요」 · 선택성은 '상대적으로 더' 붙는 성질이다. '만'은 틀린 말이다(시안 5.02 원문도 '덜 건드리고').
3. `3.1.code.how.reversible.desc` 「…그래서 **작용 시간을 조절하기 쉬워요**」 → 삭제 · 가역성과 '작용 시간 조절 용이'는 근거가 없는 일반화다.
4. `3.1.code.how.irreversible.desc` 「**단단한 화학 결합**」 → 「보통 공유 결합(두 원자가 전자를 나눠 갖는 강한 결합)」 · 비가역 결합은 대개 공유 결합이다. 막연한 표현을 바로잡고 전문어를 풀었다.
5. `3.1.code.how.competitive.desc` 「…들어갈 자리에 **먼저 들어가** 자리를 차지해요」 → 「…붙는 바로 그 자리를 두고 다퉈요」 · 경쟁적 억제는 같은 자리를 두고 겨루는 것이다(농도에 따라 밀려날 수 있음). '먼저 들어가 차지'는 시간 순서처럼 읽힌다.
6. `3.1.code.action.inhibitor.desc` 「단백질의 **움직임**을 막아 **지나친 반응을 줄여요**」 → 「표적이 하는 일을 막거나 줄여요」 · 억제제가 늘 '지나친' 반응만 다루지는 않는다. '움직임'은 단백질 기능을 잘못 비유한다.
7. `3.1.code.action.modulator.desc` 「…작동 세기나 **모양을 알맞게 조율**해요」 → 「표적이 일하는 세기를 높이거나 낮춰요. 원래 물질과 다른 자리에 붙는 경우가 많아요」 · 조절제는 세기를 바꾸는 물질이다. '모양을 알맞게 조율'은 뜻이 흐리다. '다른 자리'는 늘 그런 것이 아니라서 '경우가 많아요'로 썼다.
8. `3.1.code.action.antagonist.desc` 「수용체 자리를 가로막아…」 → 「수용체에 붙지만 신호를 켜지 않아요. 원래 신호 물질이 붙지 못하게 자리를 막아요」 · 길항제가 '붙되 활성화하지 않는다'는 핵심을 넣었다.
9. `3.1.doc.mech_why.example` 「{gene} 활성 부위 안쪽 아미노산과 … **효소 작용을 막기** 때문이에요」 → 「예: 도킹에서 AChE 활성 부위에 공유 결합 없이 맞물려서 가역 억제제로 보았어요」 · `{gene}` 자리에 수용체 · 수송체가 오면 '효소 작용'이 틀린다. 그래서 설계 예시 표적(AChE)으로 고정했다.
10. `3.1.doc.claim_substance.example` 「…염(약 성분이 몸에 잘 녹고 안정하도록 붙인 **무해한 이온 짝**)」 → 예시에서는 풀이를 빼고 안내 칸으로 옮겼다: 「약 성분을 산이나 염기와 짝지어 잘 녹고 안정하게 만든 형태」 · '무해한'은 근거 없는 단정이다. 그리고 풀이를 예시 안에 두면 학생이 청구항에 괄호까지 베낀다. `claim_use.example` 의 '유효성분(…)' 풀이도 같은 이유로 안내 칸으로 옮겼다.
11. ΔG 방향 「음수가 클수록 단단히 붙음」 → 「더 낮은 음수일수록 단단히 붙어요」(`doc.effect.guide` · `facts.docking`) · '음수가 크다'는 절댓값으로도 크기로도 읽혀 헷갈린다. 시안 5.01 메모의 뜻(-9 가 -7 보다 강함)을 그대로 살렸다.
12. `3.1.rule.prior_art_revise` Morgan 풀이 「분자 구조를 반지름 2 안의 조각으로 쪼개 만든 지문」 → 「원자마다 결합 2개 거리까지의 주변 모양을 모은 지문」 · 반지름은 '결합 수'라는 점을 밝혔다. Tanimoto 는 '1이면 지문이 같음'을 덧붙였다.
13. `3.1.doc.facts.residues` 「PLIP(단백질과 분자가 맞닿는 아미노산 자리 분석) 결합 잔기」 → 「상호작용 잔기(단백질 사슬 속 아미노산 하나하나) — PLIP(단백질과 분자 사이 붙는 방식을 찾는 도구)」 · PLIP 은 도구 이름(Protein-Ligand Interaction Profiler)이다. '잔기'도 처음 나오는 전문어라 풀었다.
14. `3.1.pick.same_as_ref` 「기준 약이나 이미 세상에 알려진 물질과 **구조가 같아요**」 → 「기준 약({ref})과 SMILES 글자가 모두 같아요…」 · 이 문구는 5.06 지문(기준 약과 문자열 비교) 결과다. 데이터셋 대조는 `rule.novelty` 가 맡는다. 같은 분자도 SMILES 표기가 다를 수 있으므로 판정은 '평면 SMILES'(서버 정규화)로만 한다. 이 점은 `facts.flat` 이 이미 밝힌다.

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

- 해요체: 원문은 모두 해요체였다(`~주세요` · `~보세요` 섞임은 그대로 두었다). `prompt.tone_paragraph` 는 시스템 프롬프트라 지시형(`~한다`)으로 바꿨다(런타임 Claude 에게 주는 말).
- 한 문장 한 생각 위반을 나눔: `head.summary`(3생각 1문장 → 5문장) · `code.head` · `doc.head` · `doc.effect.guide` · `rule.novelty` · `rule.prior_art_revise`(한 문장에 지문 정의 2개 + 요구 → 4문장) · `review.ai_notice` · `review.appeal_guide` · `ledger.accepted`(받아들임 · 출원번호 · 순서 · 출원료를 한 문장에 → 4문장) · `limit.why.*` 여섯 줄 · `limit.abandon_confirm` · `prompt.tone_paragraph`(긴 문장 7개 → 짧은 문장 7개).
- 전문어 풀이 보충: 잔기 · PLIP(도구) · 부모 분자 · 공유 결합 · 기질 · 입체 · 유효성분 · 약학적으로 허용되는 염. Gemini 가 잘 푼 것: ADMET · SMILES · 평면 SMILES · 전임상 · 3R · Tanimoto · 티커 · 기전.
- 용어 통일: Gemini 는 '모둠'을 대부분 '스타트업'으로 바꿨다. 규칙 6(모둠 = 스타트업 제약회사)상 둘 다 허용되지만, 기존 화면 문구와 설계가 '모둠 출원 칸'을 쓰므로 고친 줄은 '모둠'으로 맞췄다. 손대지 않은 줄의 '우리 스타트업'은 남겼다(통합 때 한쪽으로 — ⑥ 질문 2).
- 상태 이름: '받아들임(등록)'(`status.accepted`) → '받아들여짐'. 판정 이름(`verdict.pass` '받아들임')과 상태 이름(`status.accepted` '받아들여짐')을 기존처럼 나눴다.
- `rule.ok` 「사전 규칙 검사를 모두 통과했어요…」 → 「통과」 · 기존 `rule.ok` 는 규칙 줄마다 붙는 짧은 표시다. 요약 문장은 새 키 `rule.all_ok` 로 옮겼다(보충).
- `ledger.empty` 「…가장 먼저 출원해 첫 번째 줄을 채워 보세요!」 → 「아직 등록된 특허가 없어요」 · 서두르기를 부추기는 말을 뺐다(서두름은 `ledger.note` 에 한 번).

## ⑤ 기존 `PATENT_COPY` 키와 대응

**맞출 키(같은 자리 — 문구만 교체)**: `tabs.*` → `3.1.tabs.*` · `doneWhen` → `3.1.head.done_when` · `slots` → `3.1.pick.slots` · `noCandidates` · `knownChip` · `openApp` · `newApp` · `fingerprintTitle` · `fingerprintNote` · `sameAsRef` → `3.1.pick.*` · `codeHead` · `codeProblem.*`(11개 모두) · `codeOk` · `codeLocked` · `codeLockedReviewing` · `pieces.*` · `howLabel.*` · `actionLabel.*` → `3.1.code.*` · `sectionLabel.*` · `sectionGuide.*` → `3.1.doc.<칸>.label/guide`(단 `claim1` → `claim_substance`, `claim2` → `claim_use` — 키에 숫자를 피한 Gemini 선택. 구현 때 `PatentSectionKey` 와 이어 줄 표가 필요하다) · `sectionProblem.*` → `3.1.doc.problem.*` · `saveProblem.*` → `3.1.doc.save.*` · `serverFilled` · `facts.*` → `3.1.doc.*` · `rule.*`(18개 모두) → `3.1.rule.*` · `status.*` · `rejectReason.*` · `reviewStage.*` · `verdict.*` · `changedAfterReview` · `precheck` · `request` · `feeNote` → `3.1.review.*` · `abandonApp` · `abandonPatent` · `abandonConfirm` · `withdrawConfirm` → `3.1.limit.*` · `ledgerTitle` · `ledgerNote` · `ledgerEmpty` · `ledgerStatus.*` · `mine` · `accepted` · `headline` → `3.1.ledger.*` · `err.*`(12개 모두) → `3.1.err.*`.

- `aiReview`(기존: 한 문장 안내) ↔ Gemini 는 `3.1.review.ai_badge`('AI 심사' 표시)와 `ai_notice`(안내)로 나눴다. 기존 `aiReview` 자리는 `ai_notice` 에 대응한다.
- **작업 도중 `PATENT_COPY` 가 커졌다.** 프롬프트를 쓸 때(위 목록) 뒤로 8b 세션이 `rule.oldRevisionAtAccept` · `rejectedByTeacher` · `err.oldRevision` 과 `ui.*`(약 55개)를 더했다. Gemini 는 이 키를 보지 못했다. 그래서 Claude 가 아래처럼 보충하거나 기존 키에 대응시켰다.
  - 보충(새 줄): `rule.oldRevisionAtAccept` → `3.1.rule.old_revision_at_accept` · `rejectedByTeacher` → `3.1.review.reject_reason.teacher` · `err.oldRevision` → `3.1.err.old_revision` · `ui.noReview` → `3.1.review.no_review` · `ui.teacherNote` → `3.1.review.teacher_note`(`{note}`) · `ui.oldTarget` → `3.1.pick.old_target`(+ `old_target_note`) · `ui.legend.c` · `ui.legend.hit` → `3.1.pick.legend.*` · `ui.codeSummaryNote` → `3.1.code.summary_note`(`{codes}`).
  - 이미 있는 줄에 대응: `ui.pickReason` → `3.1.pick.card.reason` · `ui.docHead` → `3.1.doc.split_note` · `ui.anatomyTitle` → `3.1.doc.head` · `ui.lastBy` → `3.1.doc.collab.last_editor` · `ui.mechHead` · `ui.mechWhat` → `3.1.code.target.label` · `ui.tickNote` · `ui.numNote` → `3.1.code.piece.tick` · `piece.num` · `ui.resultTitle` → `3.1.review.board_head` · `ui.itemsTitle` → `3.1.review.sections_head` · `ui.srFinding.*` → `3.1.review.verdict.*` · `ui.runPrecheck` → `3.1.review.precheck_btn` · `ui.ledgerCols.*` → `3.1.ledger.col.*`(기존은 표적 · 질환을 한 열로 — 새 표는 두 열. 화면 열 구성에 맞춰 고른다) · `ui.rejectedNo` → `3.1.ledger.status.rejected`.
  - 대응 없이 남긴 것(짧은 화면 부품 — 문구 단계에서 다룰 필요가 적음): `ui.pickFirst` · `loading` · `mineTitle` · `candidate` · `ourCandidate` · `refRow` · `fingerprintAria` · `legend.n/o/x` · `feeBalance` · `balance` · `slotUsed` · `slotEmpty` · `ourApps` · `count` · `none` · `saveCode` · `piecesMeaning` · `anatomyAria` · `codeSummaryTitle` · `targetWord` · `howBlank` · `actionBlank` · `evidence` · `precheckSummary` · `version` · `reviewSub` · `ledgerRows`. 이 키들은 지금 문구를 그대로 쓰면 된다.

**새 키(기존에 없던 자리)**: `3.1.head.summary` · `pick.card_guide` · `pick.card.reason` · `pick.card.signal` · `code.target.*` · `code.how.*.desc` 4 · `code.action.*.desc` 4 · `code.format_line` · `code.input.label` · `code.llm_note` · `doc.head` · `doc.ev.*` 5(시안 5.01 근거 번호) · `doc.split_note` · `doc.<칸>.example` 13 · `doc.collab.conflict` · `doc.collab.last_editor` · `rule.prior_art_revise` · `rule.all_ok` · `review.ai_badge` · `review.requested_by` · `review.board_head` · `rules_head` · `sections_head` · `summary_head` · `item_status.*` 4 · `quota_guide` · `quota_exhausted` · `appeal_btn` · `appeal_guide` · `flag_injection` · `next_revise` · `next_reject` · `ledger.open_btn` · `ledger.col.*` 10 · `col.substance_note` · `red_row_note` · `disclosure_note` · `headline_no_disease` · `board_note` · `limit.guide` · `limit.class_setting` · `limit.why_head` · `limit.why.*` 6 · `prompt.tone_paragraph`.

## ⑥ 사용자 확인이 필요한 것

1. **칸 예시를 고정 예시로 둘까, 모둠 값으로 바꿀까?** copy.md 는 예시를 설계 예시(SEUM · ACHE · 알츠하이머 · ○○)로 고정했다. 모둠 표적으로 바꿔 보이면 더 와닿는다. 대신 표적 종류(효소 · 수용체 · 수송체)마다 기전 · 효과 예시가 과학적으로 틀릴 수 있고, 학생이 예시를 그대로 베낄 위험도 커진다. 표적 종류별 예시 3벌을 따로 만들까?
2. **'모둠' 과 '우리 스타트업' 중 하나로**: Gemini 는 '우리 스타트업'을, 설계 · 기존 화면은 '모둠'을 주로 쓴다. 통합 때 한쪽으로 맞추려 한다. 어느 쪽인가?
3. **심사 횟수의 '하루'는 실제 하루인가 게임 일인가?** `quota_guide` · `quota_exhausted` 는 '다음 날'이라고만 썼다. 또 남은 횟수 `{left}` 를 서버가 아직 주지 않는다. 표시하려면 `PatentsResponse` 에 칸이 필요하다.
4. **이의 제기 버튼**(`review.appeal_btn` · `appeal_guide`): 설계 §5.11 ⑦ 에는 있으나 지금 경로(`PATENT_API`)에는 없다. 문구만 먼저 둘까, 구현 때까지 뺄까?
5. **인젝션 표시를 학생에게 보일까?**(`review.flag_injection` — Claude 보충): 학생에게 '지시처럼 보이는 문장이 있어 선생님께 알림이 갔다'고 알리면 투명하다. 반면 교사 알림을 알리는 것이 바람직한지는 수업 방침에 달려 있다.
6. **시안 5.04 의 교훈 '먼저 낸 쪽이 이긴다'**: 실제 규칙은 '먼저 받아들여진 쪽'이다(§7.4 ⑩). 문구는 실제 규칙에 맞췄다. 그런데 심사가 비동기라, 먼저 낸 모둠도 AI 심사가 늦게 끝나면 질 수 있다. 이 차이를 학생에게 따로 설명할까?
7. **`3.1.ledger.board_note`의 기업가치 변동 폭**(0~5% · 기본 2%)을 학생 화면에 숫자로 보일까? 이번 표에는 넣지 않았다(전광판 · 기업가치 문구 단계에서 다룰 일로 보았다).

## 독립 검증(2차)

- 검증자: Claude(Opus 5.5) 독립 검증 · 2026-10-24. 앞 검토의 결론을 믿지 않고 근거 파일을 직접 대조했다.
- 대조한 근거: 설계 §5.8 · §5.8.1 · §5.9(마릿수 3수준) · §5.11 · §5.12 · §7.4 ⑩ ⑪, `copy-common/brief.md`, 시안 `design/step-viz/viz-5.js`, `packages/web-contract/src/patent.ts`(`PATENT_COPY` · `PATENT_SECTIONS` · `sectionShapeProblem`), `review.ts`(`REVIEW_LIMITS` · `DocSectionView`), 서버 `apps/server/src/features/patents.ts`(상태별 막음 · 포기 조건 · 받아들임 때 강등). 읽기만 했다.
- 결과: `copy.md` 249키(앞 248 + 2차 보충 1). 2차에서 25줄 수정 · 1줄 보충. `gemini-raw.md` 는 고치지 않았다.

### 1. 숫자 · 금액 · 기간 · 문턱 대조 — 틀린 숫자 없음

한 줄씩 대조했다. 출원료 250,000 크리스타(= $0.050M · 1 크리스타 = 20 센트 · $0.001M = 5,000 크리스타로 맞음) · 3건 750,000 크리스타(= $0.150M) · 초기 연구비 10,000,000 크리스타의 7.5% · 하루 5회 / 15회(`REVIEW_LIMITS` 와 같음) · Tanimoto 0.85 · Morgan 반지름 2 · 82 / 246 / 328마리 · 8모둠 × 3 = 24줄 · 상한 1~4건(기본 3 · 짧은 수업 2) · Stock & Molinoff 2002 · [별지 제15호서식] · 13칸 글자 수(`PATENT_SECTIONS` 와 모두 같음) · 티커 3~4자 · 보기 숫자(-9.1 − (-8.7) = -0.4 · -9.1 − (-8.2) = -0.9) 모두 맞다. 화면 문구에 `$` 와 '텃밭'은 없다.

- 숫자는 맞지만 뜻이 흐린 곳 하나를 고쳤다: `3.1.limit.why.three_r` 「한 묶음(알맞게 82마리)」 → 「한 묶음이에요. 묶음 크기를 '알맞게'로 고르면 82마리예요」. '알맞게'는 §5.9 의 마릿수 3수준(적게 46 · 알맞게 82 · 많이 141) 이름이다. 원문은 '적당히 82마리'로 읽힌다.

### 2. 자리표시자 — 표 칸과 문구 일치, 바뀐 것은 모두 의도한 것

- 249줄 모두 문구 속 `{…}` 와 '자리표시자' 칸이 같다(스크립트로 확인).
- Gemini 원문과 달라진 자리표시자 20키는 앞 검토 ② 표의 설명과 맞다(칸 예시 고정 · `facts.*` 이름표화 · 서버가 주지 않는 `{code}` `{name}` 빼기). 단 **`3.1.err.patent_in_use` 에서 `{code}` 를 뺀 것은 ② 표에 빠져 있었다.** 서버의 `patentInUse` 409 는 코드명을 넘기지 않으므로 빼는 쪽이 맞다.
- 프롬프트가 준 `{target}` · `{day}` 는 copy.md 에서 쓰지 않는다(`facts.*` 를 이름표로 되돌린 결과). 문제는 없다.

### 3. 고친 것(과학 · 사실 · 규칙 정확성)

1. `3.1.doc.mech_action.example` 「억제제 (표적 효소의 **지나친 작동**을 막아요)」 → 「억제제 (예: AChE 효소가 하는 일을 막아요)」 · 앞 검토가 `action.inhibitor.desc` 에서 뺀 '지나친' 단정이 예시에는 남아 있었다. 예시를 설계 예시 표적(AChE)으로 고정한 방침에도 맞췄다.
2. `3.1.doc.mech_why.example` 「도킹에서 AChE 활성 부위에 **공유 결합 없이** 맞물려서 가역 억제제로 보았어요」 → 「공유 결합을 만들 반응성 부분이 없고, 도킹에서 AChE 활성 부위에 맞물려서 가역 억제제로 보았어요」 · 2.1 의 Vina 도킹은 공유 결합을 아예 다루지 않는다. 그래서 '도킹에서 공유 결합이 없었다'는 가역의 근거가 되지 못한다. 학생이 이 틀린 추론을 베끼지 않게 근거를 분자 구조(반응성 부분 없음)로 바꿨다.
3. `3.1.err.patent_in_use` 「3.2 … 3.3 … 에서 쓰는 중이라」 → 「지금 쓰는 중이라 포기할 수 없어요. 주력 · 백업 후보로 정했거나 3.2 … 또는 3.3 … 에서 쓰고 있어요」 · 서버 `abandonApplication` 은 주력 · 백업 지정(`program_revisions.lead_job_id` · `backup_job_id`)도 막는다. 원문은 이 경우를 설명하지 못한다.
4. `3.1.ledger.red_row_note` 「빨간 줄은 **늦게 같은 물질을 낸** 우리 출원서예요」 → 「같은 물질이 다른 모둠 것으로 먼저 받아들여져 거절된 우리 출원서예요」 · 앞 검토가 `ledger.note` 를 '먼저 받아들여진'(§7.4 ⑩)으로 고쳤는데 이 줄만 '늦게 낸'으로 남아 서로 어긋났다.
5. `3.1.review.stage.retrying` 「그동안 **출원서는** 잠기지 않아요」 → 「그동안에도 출원서 칸은 고칠 수 있어요」 · 심사 중에는 코드명이 잠긴다(`setCodeName` → `codeLockedReviewing`). '출원서 전체가 안 잠긴다'는 말은 코드명 잠김 문구와 부딪친다.
6. `3.1.doc.effect.guide` 에 「2.2 ADMET 신호에서 나아진 점도 적을 수 있어요」를 넣었다 · 설계 §5.8 칸 표의 '발명의 효과'는 '기준 대비 결합 · **ADMET 장점** · 부모 대비 나아진 점'이다. 원래 안내는 ΔG 비교만 말해 ADMET 장점이 빠졌다.
7. `3.1.doc.claim_substance.guide` 염 풀이 「잘 녹고 안정하게」 → 「더 잘 녹거나 더 안정하게」 · 모든 염이 두 가지를 다 얻지는 않는다.
8. `3.1.doc.head` 「**회색 칸**은 서버가 채운 근거 자료예요」 → 「서버가 채운 근거 자료는 고칠 수 없는 칸으로 따로 보여요」 · 지금 화면(`s31.tsx`)은 서버 칸을 패널 부제(`serverFilled`)로 가른다. 회색이라는 근거가 없다. 색으로만 가리키는 말은 접근성에도 좋지 않다. 한 문장에 두 생각이던 것도 나눴다.

### 4. 고친 것(문체 · 전문어 풀이 · 용어 통일)

- 한 문장 한 생각: `3.1.head.summary`(세 가지 심사 기준을 한 문장에 → '세 가지를 봐요' + 나열) · `rule.limit_at_accept`(통과 · 등록 실패를 한 문장에 → 두 문장) · `review.ai_notice`(시간 · 다른 칸 쓰기 → 두 문장) · `review.changed_after`(판에만 붙음 · 다시 요청 → 두 문장, '판'이라는 내부 용어도 '심사했던 글'로).
- 첫 등장 전문어 괄호 풀이 보충: 물질특허 · 출원서 · 학급 특허 원장(`head.summary`) · 데이터셋 · 기준 리간드(`rule.novelty`) · 변형체(`rule.duplicate` · `review.next_reject`) · 리드(`ledger.note`) · 백업(`limit.why.industry`) · ΔG(`doc.background.guide` — 칸 순서상 '발명의 효과'보다 먼저 나온다).
- 용어 통일: `3.1.code.problem.num_len` · `num_digits` 「뒷번호」 → 「번호」(조각 이름) · `3.1.rule.limit_ok` 「특허 칸」 → 「모둠 출원 칸」 · `rule.limit_at_accept` 「우리 스타트업 특허 상한」 → 「모둠 출원 칸」.
- 겹말: `doc.problem.too_short` 「최소 {min}자 이상」 → 「{min}자 이상」 · `too_long` 「최대 {maxLen}자 이내」 → 「{maxLen}자 이내」 · `doc.summary.guide` 「10~100자 이내로」 → 「10~100자로」.

### 5. 보충(범위)

- `3.1.rule.prior_art_ok` 「선행 특허 통과 — 다른 모둠 유효 특허와 지문 유사도가 모두 0.85 보다 낮아요」 · 프롬프트 범위 5번이 '각각의 통과 줄'을 요구했다. 규칙 1~3 · 상한 · 잔액에는 통과 줄이 있었지만, 심사 4번(비슷한 선행 특허)은 통과 줄이 없었다. 지문 계산을 켜면 바로 필요하다.
- 범위 목록(코드명 해부도 5.02 · 칸 안내와 예시 13칸 · 규칙 검사 막음 / 주의 · 결과판 · 원장 5.04 · 상한 안내)의 다른 자리는 모두 있다.

### 6. 그대로 둔 것(검토했으나 고치지 않음)

- `3.1.doc.effect.example` 의 0.4 kcal/mol 차이로 '더 단단히 붙을 것으로 예측돼요'라고 쓴 것: 설계 §5.6 의 2.1 막음 규칙이 'ΔG ≤ 기준이면 맞음'이라 설계와 맞는다. '예측돼요'로 단정도 피했다.
- `3.1.doc.claim_use.example` 은 `{disease}` 를 남겼다(머리말의 '예시 고정' 방침의 예외). 청구항 2 는 질환을 모둠 값으로 넣는 틀 문장이라, 표적 종류에 따라 과학적으로 틀릴 일이 없다.
- `3.1.err.not_editable` 「받아들여짐 · 거절 · 거둠 상태예요」: 서버의 `EDITABLE = draft · revise · reviewing` 과 맞다(심사 중에는 칸을 고칠 수 있음 — 앞 검토 판단이 맞음).
- `3.1.rule.limit` 「심사가 끝나길 기다려요」: 심사 결과가 보완이면 칸이 빈다. 받아들여짐이면 칸이 그대로다. 문구는 PATENT_COPY 와 같아 그대로 두었다.

### 7. 남은 확인 질문(앞 ⑥ 에 더해)

1. `3.1.review.quota_guide` 의 `{left}` 는 출원서 1건 기준(5회)인가, 모둠 기준(15회)인가? 둘 중 작은 값을 보일지 정해야 문구가 정확해진다. 학급 하루 상한(§5.11)에 걸릴 때도 `quota_exhausted` 하나로 보일지 정해야 한다.
2. `3.1.code.problem.taken` · `code.ok` · `code.locked` · `err.code_taken` 의 `{code}` 는 서버 409 응답에는 없다(`COPY.codeProblem.taken` · `COPY.err.codeTaken` 은 고정 문장). 서버가 보낸 문구를 그대로 보이는 곳에서는 `{code}` 를 채울 수 없다. 화면에서만 채울지, 서버 오류에 코드명을 넣을지 정해야 한다.
3. `3.1.err.patent_in_use` 를 고치며 '주력 · 백업 후보로 정함'을 넣었다. 이것이 2.2 의 주력 리드 지정인지, 3.2 의 주력 · 백업 지정인지 학생에게 단계 번호로 밝힐까?
