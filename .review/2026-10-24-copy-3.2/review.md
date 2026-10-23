# 3.2 전임상 · 동물실험 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon (High) · `agy --model gemini-4-argon-high --effort high --mode plan` · 한 번에 성공 · 종료 코드 0 · 표준 오류 빈 파일 → `gemini-run.log` 0바이트)
- 결과: `copy.md`(키 136 = Gemini 125 + Claude 보충 11 · 수정 28줄)
- 대조 자료: 설계 §5.9 · §참고(3판 근거) · `packages/web-contract/src/preclinical.ts`(`PRECLINICAL_COPY` · 상수 · `PRECLINICAL_RULES`) · F32 화면 스크린샷 `.review/2026-10-24-f32/1440-protocol.png`
- 표기: 각 항목은 `원문 → 고친 문구 · 이유`. '그대로'는 고치지 않았다는 뜻이다.

## 전체 판단

Gemini 원문은 사실 대부분을 발췌 그대로 옮겼다. 숫자(4,592,958 · 81.5% · 80.1% · 90% · 46/82/141 · 6.2/1.8 · 60 kg · 안전계수 10/20 · 400,000/50,000 크리스타 · 28/2게임 일)와 법 조항(동물보호법 제47조 ③ · 고시 제2023-47호 · ICH M3(R2) · 21 CFR 312.23(a)(8))은 틀린 곳이 없었다.
고친 것은 주로 ① 과학적으로 모호하거나 틀린 풀이(IC50 구간 · 약동학 ADME · NOAEL 을 독성처럼 쓴 곳) ② 화면 동작과 어긋난 안내(이수하면 자동 지정 · 수행자 칸에 문장 예시) ③ 한 문장에 여러 생각을 넣은 긴 문장이다.

## ① 설계 사실 대조(금액 · 기간 · 문턱 · 법 조항 · 통계)

| 항목 | 원문 | 판정 |
| --- | --- | --- |
| 실태 통계 | 4,592,958마리 · 마우스 81.5% · D · E 80.1% | 맞음 · 그대로 |
| FDA | 90% 이상 허가 못 받음 · 현대화법 2.0(2022) · 2025-04 로드맵 · 2026-09 규정 개정 · '금지 아님' | 맞음 · 그대로 |
| 고통등급 | A~E 정의 · D 경감 조치 필수 · E 원칙 불허 + 사유 | 맞음 · 문장만 나눔(④) |
| 인도적 종료시점 | 체중 20% 이상 감소 · 종양 체중 10% 초과 · 먹지 못함 · 마비 | 맞음 |
| 마릿수 | 46 · 82 · 141 · PK 랫드 6 · 효력 8×3 · 독성 랫드 10×4 + 비글 3×4 | 맞음 |
| 계산 | HED = NOAEL ÷ 6.2/1.8 · 더 낮은 HED · MRSD = HED ÷ SF × 60 kg · 예 18 → 10 → 60 mg(적게 30 mg) | 맞음(18 ÷ 1.8 = 10, 10 ÷ 10 × 60 = 60) |
| 비용 · 기간 | 대체 50,000 크리스타 · 2게임 일 · 동물 400,000 크리스타 · 28게임 일 · 심의 무료 하루 5회 | 맞음(자리표시자 `{cost}` · `{days}` 로 둠) |
| 문턱 | 효력 80% · 뇌/혈장 0.7 · 종료시점 1~50 · 서술 10자 · 회고 200자 | 맞음(자리표시자 또는 숫자) |

고친 사실:

1. `3.2.calc.ind_note` — "MRSD({mrsd} mg) 이하 용량을 고르면 IND(임상시험 계획 승인) 기준을 넘어요." → "3.3 에서 그 제형의 MRSD({mrsd} mg) 이하 용량을 고르면, IND 심사의 안전성 기준은 늘 통과해요." · '기준을 넘어요'는 '한도를 초과한다'로도 읽혀 뜻이 거꾸로 될 수 있다. 설계는 'MRSD 이하 용량이면 **그 제형에서** S ≥ 35'라서 제형 조건도 넣었다. 1상 비보장 문장은 그대로 두고 문장만 나눴다.
2. `3.2.ethics.passed` — "이제 실험 수행자로 지정되어 동물실험 실행 단추를 누를 수 있어요" → "이제 계획서의 실험 수행자로 뽑힐 수 있어요. 계획서가 승인되면 동물실험 실행 단추를 누를 수 있어요." · 이수는 자격일 뿐이다. 수행자 지정은 계획서 설정(모둠 공유)에서 따로 하고, 실행은 승인된 계획서가 있어야 한다(§5.9 ② · `messages.needApproval`).
3. `3.2.ethics.retry` — "모둠원 네 명 중 한 명만" → "모둠원 중 한 명만" · 모둠 인원은 4명이 기본이지만 규칙은 '한 명만 이수해도'이고, 코드 상한(`performersMax: 6`)도 4가 아니다. 인원을 박아 두지 않는다.
4. `3.2.report.summary` — "모둠 합계 — 사용 마릿수 {animals}마리 · 고통등급 {grade} · …" → 모둠 합계에서 `{grade}` 를 빼고 "후보별 표에는 … 고통등급 …"으로 옮김 · 고통등급은 후보(효력 모델)마다 매기는 값이라 모둠 합계에 한 값으로 넣을 수 없다. 기존 `ui.reportTotal(animals, humane, saved)` 인자와도 맞춘다.
5. `3.2.protocol.level.standard` — "통계적으로 결과를 믿을 수 있는 최소 마릿수여서 기본 안전계수 10을 적용해요" → "결과를 믿을 수 있을 만큼 마릿수를 써요. 안전계수는 기본값 10이에요." · 설계는 82마리가 '통계적 최소'라고 하지 않았고, 안전계수 10은 '최소 마릿수여서'가 아니라 기본값이다(적게일 때만 자료 부족으로 20). 인과를 지어내지 않는다. `protocol.section.reduction.example` 도 같은 이유로 고침.
6. `3.2.protocol.level.high` — "과학적으로 얻는 것이 없어요" → "더 얻는 것이 없어요" · 설계 원문은 '얻는 것이 없다(안전계수 그대로)'. 게임 규칙상 이득이 없다는 뜻이지, 실제 과학에서 마릿수를 늘리는 의미가 전혀 없다는 단정은 아니다.

## ② 자리표시자 바뀜 / 새로 생김

Gemini 는 "새로 추가한 자리표시자는 없다"고 적었다. 다만 지시문의 '이미 있는 자리표시자' 목록에는 Claude 가 이름을 정해 넣은 것도 섞여 있어, 코드와의 실제 대응을 아래에 바로잡는다.

| 자리표시자 | 지금 코드 | 판정 |
| --- | --- | --- |
| `{ticker}` · `{codeName}` | `board.headline(ticker, codeName)` 인자 | 그대로 |
| `{n}` · `{now}` · `{end}` | `ui.gameDays(n)` · `ui.progress(now, end)` | 그대로 |
| `{animals}` · `{humane}` · `{saved}` | `ui.reportTotal(animals, humane, saved)` | 그대로 |
| `{min}` · `{max}` | 상수 `IACUC_SECTION_MIN`(10) · `ENDPOINT_PCT_RANGE`(1~50)를 템플릿 문자열로 끼움 | 서버 값이 아니라 **상수 자리** — 반영 때 같은 상수로 채운다. 같은 이름 `{min}` 이 두 상수에 쓰이므로 반영 때 `{sectionMin}` · `{endpointMin}`/`{endpointMax}` 로 나누기를 권함 |
| `{pct}` · `{ratio}` | 상수 `EFFICACY_CHIP_MIN_PCT`(80) · `BRAIN_PLASMA_HIGH_MIN`(0.7) | 상수 자리 · 그대로 |
| `{sf}` | `SAFETY_FACTOR[level]`(10 · 20) | 상수 자리 · 계산 칸 문구에 쓰려면 승인된 수준의 값을 넘겨야 함 |
| `{cost}` · `{days}` | `PRECLINICAL_FEES`(50,000 · 2 / 400,000 · 28) | 상수 자리 · 지금 COPY 에는 금액 문구가 없음(새 쓰임) |
| `{mrsd}` | 지금 칩 · 계산 문구에 없음 | **새 쓰임** — `chip.start_dose_room.ok/warn` · `calc.ok` · `calc.ind_note` 가 후보의 경구 MRSD 값을 받아야 함. 칩 판정 함수(`leadReasonVerdict`)는 지금 문자열만 돌려준다 |
| `{grade}` · `{model}` | 지금 문구에 없음(`PRECLINICAL_MODELS` 값) | **새 쓰임** — `rule.pain.ok` · `section.refinement.server_fills` |
| `{form}` | `ui.forms` 키 | 결과판 지표 이름 안에서만 씀 |
| `{value}` | 없음 | **(새) Claude 가 만듦** — 대체 시험 결과의 실측값(`value` · hERG µM / 간 생존율 %). `alt.herg.desc` · `alt.liver.desc` |

고친 자리표시자:

1. `3.2.protocol.section.purpose.server_fills` — "특허 분자 목록({codeName})" → "특허 분자 목록(코드명)" · 목록인데 단수 값 `{codeName}` 하나를 넣으면 한 분자만 보인다. 기존 `serverFills` 처럼 칸 설명으로 되돌림.
2. `3.2.protocol.rule.pain.mismatch` — "… 기준 등급({grade})과 달라요." → "… 효력 모델 표의 등급과 달라요. 오른쪽 효력 모델 표를 다시 확인해요." · 규칙 미리 보기(`rules`)는 지금 정적 문자열이라 값을 받지 않는다. 또 틀렸을 때 정답 등급을 바로 알려 주면 표를 읽는 학습이 빠진다.
3. `3.2.report.summary` — `{grade}` 삭제(①-4).
4. `3.2.alt.herg.desc` · `3.2.alt.liver.desc` — `{value}`(새) 추가(③-1).

## ③ 과학적으로 틀린 · 모호한 풀이

1. `3.2.alt.herg.desc` — "IC50(통로 기능을 절반으로 막는 농도) 구간(낮음 · 보통 · 높음)" → "IC50 … 값 {value} µM 과 위험 구간(낮음 · 보통 · 높음)을 보여 줘요. IC50 이 낮을수록 적은 양으로도 통로를 막으니 위험이 커요." · 코드의 `band` 는 **위험** 구간이다(`high` = IC50 < 1 µM). 'IC50 구간 낮음'이라 쓰면 '위험 낮음'과 반대로 읽힌다. `alt.liver.desc` 도 "생존율이 낮을수록 간 독성 위험이 커요"를 더함.
2. `3.2.animal.bundle.pk` — "흡수 · 분포 · 배설되는 과정" → "흡수 · 분포 · 대사 · 배설되는 과정" · 약동학은 ADME 네 과정이다. 대사를 빼면 틀린 정의다. `protocol.section.replacement.example` 의 "(흡수 · 분포 · 배설)"도 같은 이유로 고침.
3. `3.2.animal.bundle.pk` — "F%(먹은 약이 혈액까지 도달하는 비율)" → "먹은 약 가운데 온몸 혈액에 들어가는 비율" · 생체이용률은 전신 순환에 들어간 비율이다. '혈액까지 도달'은 문맥상 큰 차이는 없으나 '온몸'을 넣어 장 · 간 통과 뒤라는 뜻을 살렸다.
4. `3.2.protocol.section.purpose.example` — "반복투여 독성(NOAEL)과 질환 모델 효력을 확인하여" → "반복투여 독성 시험으로 NOAEL 을 구하고 질환 모델 효력을 확인해요." · NOAEL 은 독성 그 자체가 아니라 독성 시험에서 얻는 용량 값이다.
5. `3.2.ethics.card.why.body` — "설치류(쥐 · 랫드 같은 동물)" → "설치류(생쥐 · 랫드 같은 동물)" · 한국어 '쥐'와 '랫드'는 같은 동물(큰 쥐)을 가리킬 수 있어 예가 겹친다.
6. `3.2.ethics.card.3r.body` · `alt.liver.desc` — "오가노이드(줄기세포로 만든 미니 장기)" → "(사람 세포로 키운 작은 장기 모형)" · 오가노이드는 줄기세포뿐 아니라 조직 세포에서도 키운다. '미니 장기'는 장기 기능을 다 한다는 오해를 준다.
7. `3.2.ethics.card.3r.body` — 인도적 종료시점 풀이 "고통이 기준에 닿으면 실험을 멈추는 시점" → "미리 정한 기준에 닿으면 실험을 끝내는 시점" · 기준은 '고통의 양'이 아니라 체중 감소 · 종양 크기 같은 잴 수 있는 징후다. `card.endpoint.body` 의 "동물이 겪는 고통이 미리 정한 기준에 닿으면"도 "동물의 상태가 …"로 고침.
8. `3.2.ethics.dilemma` — 둘째 문장 "동물을 덜 쓰는 것과 사람 첫 투여 자료를 더 정확히 얻는 것" → "동물을 덜 쓰는 것과, 사람에게 쓸 시작 용량을 넉넉히 확보하는 것" · 설계의 딜레마는 '동물 수 ↔ 사람 시작 용량'이다. '자료 정확도'로 바꾸면 질문이 달라진다. "절반으로 줄이면('적게', 46마리)"도 82 → 46 은 약 56% 라 "절반 가까이"로 고침.
9. `3.2.calc.wrong` — "성인 체중(60 kg)" → "사람 기준 체중(60 kg)" · 60 kg 은 FDA 2005 지침의 계산용 기준 체중이지 성인 평균 체중이 아니다.

그대로 둔 것(검토 후 문제없음): q1 의 "hERG(심장 박동을 조절하는 칼륨 통로)" — 정확히는 심장 재분극(박동 뒤 다시 쉬는 상태로 돌아감)에 관여하지만 학생 수준 풀이로 틀리지 않다. `animal.bundle.safety_pharm` 의 QT 풀이도 맞다.

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

- 해요체: 원문 모두 해요체. '주세요'(`rule.level.fail` · `status.revise`)는 해요체 범위라 그대로 둠.
- 한 문장 한 생각 — 나눈 줄: `card.why.body`(반복투여 독성 풀이를 따로) · `card.3r.body`(감소의 '단서' · 출처 두 문장으로) · `card.pain.body`(A~E 각 한 문장, D · E 조건 따로) · `quiz.q3.explain_ok` · `ethics.passed` · `ethics.dilemma` · `section.replacement.example` · `section.reduction.example` · `animal.bundle.pk` · `animal.bundle.tox` · `calc.ind_note` · `calc.wrong` · `chip.start_dose_room.ok` · `report.summary` · `common.locked`. 예: "A등급은 …이고, B등급은 …이에요." → "A등급은 …이에요. B등급은 …이에요."
- 전문어 괄호 풀이: Gemini 가 NOAEL · HED · MRSD · IND · IACUC · 패치클램프 · IC50 · cLogP · QT 연장 · 부형제 · 반감기 · 생체이용률 · 오가노이드를 첫 등장 때 풀었다. 좋다.
- 여전히 긴 줄(고치지 않음): `animal.models` · `calc.formula` · `protocol.checklist` 는 표 · 공식 성격이라 줄바꿈만 두었다. 코드 반영 때 배열로 나뉜다.
- '모둠 = 스타트업 제약회사': `ethics.retry` 의 "우리 스타트업 제약회사 모둠이" → "우리 회사(모둠)가" · 한 이름을 두 번 겹쳐 쓰지 않음.

## ⑤ 기존 COPY 키와 대응

| 새 키(copy.md) | 기존 `PRECLINICAL_COPY` | 반영 방법 |
| --- | --- | --- |
| `3.2.common.steps.*` | `steps.*.label` | 같은 값 |
| `3.2.common.island.mine/team` | `ui.mine.*` · `ui.team.*`(걸음별 5개씩) | 새 키는 다섯 걸음을 한 줄로 묶은 설명 — 걸음별 짧은 제목은 기존 키를 유지하고, 이 줄은 단계 첫 안내로 새로 쓴다 |
| `3.2.common.step_title` | 없음 | **새 키**(단계 설명 — §5.12 '이 단계에서 하는 일') |
| `3.2.ethics.card.<id>.title/body/source` | `ethicsCards[id]` | body 는 `<br>` 기준으로 배열 원소로 나눈다 |
| `3.2.ethics.quiz.<q>.prompt/options` | `ethicsQuiz[q].prompt · options[]` | options 는 줄마다 `options[i].label`, 앞의 ①②③ 번호는 떼고 넣는다(보기 id 는 그대로) |
| `3.2.ethics.quiz.<q>.explain_ok/explain_wrong` | 없음 | **새 키** — `EthicsQuestion` 형에 해설 칸 추가 필요 |
| `3.2.ethics.who_needs/retry/passed/wrong/dilemma` | `ethics.*` | 같은 자리 |
| `3.2.protocol.section.<key>.guide/server_fills` | `sections[key].guide · serverFills` | 같은 자리 |
| `3.2.protocol.section.<key>.example` | 없음 | **새 키** — `IacucSectionMeta` 에 `example` 칸 추가 필요 |
| `3.2.protocol.section.performers.*` | `ui.performers`(칸 이름만) | **새 키** — 지금 `sections` 배열에는 수행자 칸이 없다(체크 상자로만 있음). 서술 칸이 아니므로 `sections` 배열에 넣지 말고 별도 안내로 둔다 |
| `3.2.protocol.section.species.server_fills` | `sections[species].serverFills: '—'` | Gemini 는 "랫드 + 비글견(고정)"으로 채움. 사실이라 두었지만, 서버가 채우는 것이 없다는 원래 뜻과 다르다 — ⑥ 질문 |
| `3.2.protocol.level.*` | `levels.*.label · note` | label("적게") 과 note 를 나눠 넣는다(새 문구는 "적게(후보당 46마리) — …" 형태) |
| `3.2.protocol.rule.*` | `rules.*` | `level.fail` = `levelHigh`, `section.fail` = `sectionEmpty`. `rule.section.ok` 는 **새 키**(지금 규칙은 칸이 짧을 때만 줄을 만든다) |
| `3.2.protocol.checklist` | `checklist[]`(5개 · `criterion`) | 줄마다 `criterion` 으로. LLM 심사관 프롬프트에도 들어가므로 'unclear' → '보완' 바뀜은 학생 화면에는 맞지만 심사관 판정 값(`unclear`)과 섞이지 않게 확인 |
| `3.2.protocol.review.quota` | `ui.reviewFree` | 새 문구가 더 길다 — 단추 옆 짧은 표시는 기존 키 유지 권함 |
| `3.2.protocol.review.verdict` | `ui.verdict` | (Claude 보충) |
| `3.2.protocol.status.*` | `status.*` | 기존은 한 단어("초안"). 새 문구는 단어 + 안내 → `status`(배지)와 안내 키를 나눈다 |
| `3.2.protocol.change_review` · `3.2.protocol.changed` · `3.2.animal.need_approval` | `messages.needApproval` · `messages.changed` | 같은 자리 |
| `3.2.alt.<assay>.name/desc` · `alt.no_new_verdict` · `alt.saved_animals` | `assays.*.label/sees/value` · `ui.altNote` · `ui.saved` | desc 는 sees · 결과 · 비용으로 나눠 넣는다 |
| `3.2.animal.bundle.*` · `animal.models` | 없음(효력 모델은 `PRECLINICAL_MODELS` 데이터) | **새 키**(묶음 설명) · models 줄은 데이터와 겹치므로 코드에서는 `PRECLINICAL_MODELS` 를 그대로 쓰고 이 줄은 버린다 |
| `3.2.animal.run_info/rerun/need_ethics/progress/no_study` | `ui.runAnimal` · `messages.rerun` · `messages.needEthics` · `ui.progress` · `ui.noStudy` | `run_info` 는 **새 키**(실행 단추 옆 안내) |
| `3.2.calc.*` | `calc.intro/formula/ok/wrong` · `ui.calcFields` | `calc.ind_note` 는 **새 키**. `calc.fields` 는 네 칸으로 나눔 |
| `3.2.pick.metrics.*` | `ui.metrics.*` | Gemini 가 세 줄로 묶음 — 지표 이름과 괄호 풀이를 `ui.metrics.<id>` 마다 나눠 넣고, 풀이는 툴팁 등 새 키로 |
| `3.2.pick.chip.<id>.label/ok/warn/block` | `chips.labels.<id>` · `chips.*Ok/Warn/Block` | 같은 자리. `brain_reach.not_cns` = `brainNotCns`, `chip.unknown` = `unknown`(Claude 보충) |
| `3.2.pick.mrsd_chart` | `ui.mrsdChart` | (Claude 보충) |
| `3.2.pick.lead_rule` · `pick.backup_why` · `pick.debate.ptgs2` | 없음 | **새 키**. debate 는 `PRECLINICAL_MODELS['cox2-3ln1'].debate` 를 학생 문장으로 바꾼 것 |
| `3.2.report.summary/reflection` | `ui.reportTotal` · `ui.reflectionGuide` | 같은 자리(summary 는 함수 인자 셋) |
| `3.2.common.locked` · `common.done_condition` | `ui.locked` · `messages.needPatent` · `ui.doneWhen` | 같은 자리 |
| `3.2.board.headline` · `board.privacy` | `board.headline` · 없음 | privacy 는 **새 키** |

Claude 보충 11개: `animal.need_ethics` · `animal.need_approval` · `protocol.changed` · `animal.progress` · `animal.no_study` · `pick.mrsd_chart` · `pick.chip.brain_reach.not_cns` · `pick.chip.unknown` · `pick.backup_why` · `protocol.review.verdict` · `pick.debate.ptgs2`. 이유: 기존 COPY 에 있는 메시지 · 칩 분기인데 Gemini 표에서 빠졌거나(`brainNotCns` 를 `block` 에 합쳐 버림), 범위 6 '주력 · 백업 규칙 안내'와 PTGS2 토론 거리를 학생 문장으로 두지 않았다.

## ⑥ 사용자 확인이 필요한 것

1. **심의 결과 '거절'**: 설계 §5.9 ② 는 결과를 '승인 / 보완' 두 가지로 적었는데 코드 `ui.verdict` 에는 `reject: '거절'` 도 있다. 학생 화면에 '거절'을 보일지(보인다면 언제인지) 정해 주세요. 지금 `protocol.review.verdict` 는 거절을 뺐다.
2. **종 · 이유 칸의 '서버가 채우는 것'**: 설계는 '—'(없음), Gemini 는 "랫드 + 비글견(고정)". 고정된 종을 서버 칸에 보일지, 원래대로 비워 둘지.
3. **`3.2.pick.backup_why` 문구**: "주력과 다른 약점을 가진 분자를 고르면 함께 막힐 위험이 줄어요"는 설계 §참고(Stock & Molinoff 2002)의 백업 가치에서 Claude 가 끌어낸 안내다. 설계 본문에 직접 적힌 규칙은 아니므로(근거 칩에도 없음) 넣을지 정해 주세요.
4. **PTGS2 관절염 모델 토론 거리 · 계획서 예시**: `section.refinement.example` 은 "진통제 · 마취제를 써서 고통을 줄이고"인데, PTGS2(관절염) 모델에서는 진통제가 효력 판정을 흐린다는 토론 거리가 있다. 예시를 표적에 따라 바꿀지(서버가 모델을 알므로 가능), 공통 예시로 둘지.
5. **딜레마의 '절반'**: 설계 문장은 "동물 수를 절반으로 줄이면"인데 실제 수치는 82 → 46(약 56%)이다. '절반 가까이'로 고쳤다. 설계 문장도 맞출지.
6. **나머지 8개 표적의 효력 모델**: 지금 문구 · 확인 문제는 ACHE · EGFR · DPP4 · PTGS2 네 표적만 다룬다. 8종의 모델 · 고통등급 · 종료시점이 정해지면(§12-15 수의사 · IACUC 자문) `animal.models` 와 예시 문장을 다시 받아야 한다.
7. **`{min}` 이름 겹침**: 서술 칸 10자와 종료시점 1~50 이 둘 다 `{min}` 을 쓴다. 반영 때 이름을 나눌지(권함).

## 독립 검증(2차)

- 검증자: Claude Opus 5.5(앞 작성자와 다른 세션) · 2026-10-24
- 대조 자료: `copy-common/brief.md` · 설계 §5.9 · §5.11 · §참고(3판 근거) · `packages/web-contract/src/preclinical.ts`(상수 · `PRECLINICAL_RULES` · `PRECLINICAL_COPY`) · `prompt.md` · `gemini-raw.md`
- 결과: `copy.md` 18줄 고침(`(검증 수정)`) · 5키 더함(`(검증 보충)`) → 키 141개. `gemini-raw.md` 는 고치지 않았다.

### 1. 숫자 · 금액 · 기간 · 문턱 · 법 조항 · 통계(한 줄씩 대조)

모두 설계 · 코드 상수와 같다. 고칠 숫자는 없었다.

| 항목 | copy.md | 설계 · 코드 | 판정 |
| --- | --- | --- | --- |
| 실태 통계 | 4,592,958 · 81.5% · 80.1% | §5.9 카드 5 · §참고 | 같음 |
| FDA | 90% 이상 · 현대화법 2.0(2022) · 2025-04 · 2026-09 | §5.9 카드 5 · §참고 | 같음 |
| 법 · 지침 | 동물보호법 제47조 ③ · 고시 제2023-47호 · ICH M3(R2) · S7A · S7B · 21 CFR 312.23(a)(8) · 식약처 [별표 1] | §5.9 · §참고 | 같음 |
| 고통등급 · 종료시점 | A~E · D 경감 필수 · E 원칙 불허 · 체중 20% · 종양 10% · 먹지 못함 · 마비 | §5.9 카드 3 · 4 | 같음 |
| 마릿수 | 46 · 82 · 141, PK 6 + 효력 24 + 독성 40 + 12 = 82 | §5.9 ④ · `ANIMALS_PER_CANDIDATE` | 같음(합 82 확인) |
| 계산 | 6.2 · 1.8 · 60 kg · 안전계수 10/20 · 예 18 → 10 → 60 mg(적게 30 mg) | §5.9 ④ · `SPECIES_HED_DIVISOR` · `SAFETY_FACTOR` | 같음 |
| 문턱 | 80% · 0.7 · 1~50 · 10자 · 200자 · 하루 5회 · 용량 10 · 50 · 100 mg | `EFFICACY_CHIP_MIN_PCT` · `BRAIN_PLASMA_HIGH_MIN` · `ENDPOINT_PCT_RANGE` · `IACUC_SECTION_MIN` · `reflectionMax` · §5.11 · `PreclinicalDose` | 같음 |
| 비용 · 기간 | `{cost}` · `{days}` 자리표시자 | `PRECLINICAL_FEES` 50,000 · 2 / 400,000 · 28 크리스타 · 게임 일 | 같음. 환산 확인: $0.010M = 1,000,000 센트 ÷ 20 = 50,000 크리스타 · $0.080M = 400,000 크리스타 |
| `$` | 없음 | brief 5 | 맞음 |

### 2. 자리표시자

`gemini-raw.md` 125키와 `copy.md` 를 키마다 기계 대조했다. 키는 하나도 사라지지 않았고, 자리표시자가 바뀐 곳은 5키뿐이다(`purpose.server_fills` `{codeName}` 삭제 · `rule.pain.mismatch` `{grade}` 삭제 · `alt.herg/liver.desc` `{value}`(새) 추가 · `report.summary` `{grade}` 삭제). 다섯 곳 모두 1차 검토 ②에 이유가 적혀 있고 타당하다. 141키 모두 문구 안 `{…}` 와 '자리표시자' 칸이 일치한다. 표시 없이 바뀐 줄(조용한 수정)은 없다.
- 1차 머리말의 '수정 28줄'은 머리말 줄까지 센 수라 실제로는 27줄이다 → `copy.md` 머리말을 고쳤다.

### 3~4. 고친 것(과학 · 과장 · 해요체 · 한 문장 한 생각 · 첫 등장 전문어)

1. `3.2.calc.ind_note` — "MRSD 이하 용량이면 IND 안전성 기준을 늘 통과해요"는 게임 규칙(S ≥ 35)이지 현실의 보장이 아니다. 앞에 "이 시뮬레이션에서는"을 붙이고 "MRSD 이하라고 사람에게 안전이 보장되는 것은 아니에요."를 더했다. '임상 통과 = 안전 보장'과 같은 오해를 막는다.
2. `3.2.protocol.section.purpose.example` — "임상 1상의 안전한 시작 용량(MRSD)" → "임상 1상 시작 용량의 상한(MRSD)". MRSD 는 '최대 권장 시작 용량'이지 안전이 확인된 용량이 아니다. 같은 줄의 NOAEL 이 계획서 걸음에서 처음 나오므로 괄호 풀이를 더했다.
3. `3.2.protocol.section.species.example` — "두 종에서 모두 확인해야 사람에게 가장 안전한 기준을 잡을 수 있어요"는 과장이다. 설계의 실제 논리('더 낮은 HED — 가장 민감한 종')로 바꾸고 세 문장으로 나눴다.
4. `3.2.ethics.quiz.q1.prompt` — hERG 풀이 "심장 박동을 조절하는" → "심장 박동 리듬에 관여하는". hERG 는 박동을 '조절'하기보다 재분극에 관여한다. `alt.herg.desc` 풀이와도 맞췄다.
5. `3.2.protocol.status.reviewing` · `status.revise` — "동물실험윤리위원회(AI 심사)가 심의" · "윤리위원회가 짚어 준"은 AI 를 실제 위원회처럼 읽히게 한다. "AI 심사관(동물실험윤리위원회 역할)" · "심의에서 짚은"으로 고쳤다(보완은 규칙에서도 나온다 — §5.11 ①). revise 는 두 문장으로 나눴다.
6. `3.2.common.step_title` — 비임상 시험 풀이가 "사람에게 처음 투여하기 전에 … (사람에게 투여하기 전에 거치는 …)"로 같은 말을 되풀이했다 → "(사람 대신 세포 · 동물로 하는 약리 · 독성 시험)".
7. 첫 등장 전문어 괄호 풀이를 더함 — FDA(`card.numbers.body` · 미국 식품의약국) · 누드마우스(`quiz.q2.prompt`) · 안전계수(`ethics.dilemma` · `protocol.level.low` — 두 걸음 중 어디를 먼저 볼지 모르므로 두 곳) · 약동학(`section.purpose.guide` — ②의 첫 칸) · QT 연장(`animal.bundle.tox` — 묶음 3이 묶음 4보다 먼저 나오므로 풀이를 앞으로 옮김) · 뇌/혈장 비(`animal.bundle.pk`).
8. `3.2.pick.metrics.pk` — F% 풀이 "혈액까지 도달하는 비율"을 1차에서 고친 `bundle.pk` 와 같게("온몸 혈액에 들어가는 비율") 맞췄다. 한 화면에 두 풀이가 다르면 안 된다.
9. 한 문장 한 생각으로 나눔 — `card.numbers.body`(현대화법 · FDA 용어 변경) · `quiz.q2.prompt` · `section.purpose.guide` · `section.refinement.example` · `protocol.level.low` · `animal.bundle.safety_pharm`.
10. `3.2.protocol.checklist` — "~는가"(해라체 기준 문장)를 해요체 물음 "~나요?"로. 학생에게도 보이는 줄이다.

그대로 둔 것: 동물 고통을 자극적으로 묘사한 곳은 없다. q3 오답 보기 "동물이 스스로 죽을 때까지 기다린다"는 설계 · 코드 보기 그대로라 두었다. `card.numbers.body` 의 '90% 이상 허가받지 못해요'는 바로 뒤 '금지한 것은 아니며'와 함께 있어 동물실험이 쓸모없다는 단정으로 읽히지 않는다.

### 5. 범위 누락 — 더한 5키

- `3.2.protocol.review.ai_badge` · `ai_notice` · `pending` · `summary_head` — brief 는 '학생에게 보이는 LLM 글에는 AI 심사 표시'를, §5.11 은 '최종 = 규칙 ∧ LLM'(①) · LLM 장애면 심사 대기 + 교사 처리(⑥) · 종합 피드백 공개(⑦)를 요구한다. 1차 표에는 심의의 이 자리 문구가 없었다(3.1 정리본에는 같은 자리가 있다).
- `3.2.protocol.team.split` — §5.9 걸음표 ② 오른쪽 '칸 분담'에 맞는 문구가 없었다.
- 범위 확인: 윤리 카드 5장(3R · 고통등급 · 인도적 종료시점 포함) · 확인 문제 3개(질문 · 보기 · 정답 · 오답 해설) · 계획서 칸 6개(안내 · 예시 · 서버 칸) · 대체 시험 2종 · 묶음 4종 · 계산 칸 · 결과판(NOAEL · HED · 제형별 MRSD · 마릿수) · 근거 칩 5개 · 주력 · 백업 · 종료보고서 · 잠김 · 완료 · 전광판 — 모두 있다. LLM 심사관의 '학생에게 말하는 법' 단락(§5.12)은 `.review/2026-10-24-copy-reviewer/` 가 따로 맡으므로 여기 범위가 아니다.

### 6. 4.1 항목

3.2 단계라 해당 없음.

### 1차 질문에 대한 검증 의견

- ⑥-1 '거절': §5.11 서버 규칙은 "ruleFindings 에 fail 이 있으면 revise(신규성 · 중복은 reject)"다. 신규성 · 중복은 특허(3.1)에만 있으므로 동물실험계획서에서는 '거절'이 나오지 않는다. 그래서 `protocol.review.verdict` 에서 거절을 뺀 1차 판단이 설계와 맞다. 코드 `ui.verdict.reject` 는 공용 꼴이라 남아 있는 것으로 보인다. 질문 목록에서 내렸다(코드 반영 때 3.2 화면에 거절 배지를 그리지 않으면 된다).
- 나머지 1차 질문(종 · 이유 서버 칸 · `backup_why` · 표적별 개선 예시 · 설계의 '절반' 문장 · `{min}` 이름 · 8개 표적 일정)은 그대로 남는다.

### 남은 확인 질문(2차에서 새로 생긴 것)

1. `calc.ind_note` 에 "이 시뮬레이션에서는 … 안전이 보장되는 것은 아니에요"를 더했다. 3.3 정리본의 같은 안내(IND 기준 · MRSD)와 말을 맞출까요?
2. 더한 `review.pending` 의 "오래 걸리면 선생님이 직접 처리할 수 있어요"는 §5.11 ⑥ '교사가 손으로 통과시킬 수 있다'를 학생 말로 바꾼 것이다. 학생에게 교사 처리를 알릴지 정해 주세요.
3. `animal.run_info` 는 '많이 141마리'도 실행 마릿수로 보인다. 그런데 '많이'는 규칙상 늘 보완이라 승인될 수 없다. 실행 안내에서 '많이'를 뺄까요?
