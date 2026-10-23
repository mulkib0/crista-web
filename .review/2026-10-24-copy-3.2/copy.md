# 3.2 전임상 · 동물실험 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 원문(`gemini-raw.md`, `agy --mode plan` 헤드리스 · 2026-10-24) → Claude Opus 5.5 검토 · 수정
- 날짜: 2026-10-24
- 상태: **반영됨(2026-10-24 · 문구 3.2 · 3.3 담당)** — `PRECLINICAL_COPY` 에 옮겼어요. 반영 때 버리거나 고친 줄은 아래 '반영 메모'에 적었어요. 화면 스크린샷 `.review/2026-10-24-copy-apply/3.2-3.3/`.
- 근거 칸의 절 번호는 설계 문서(`docs/2026-10-23-crista-web-design.md`) 기준으로 바꿔 적었다(Gemini 원문은 지시문 `prompt.md` 의 절 번호 §2~§4 를 썼다). `범위 n` 은 지시문 2절 범위 번호다.
- 줄 끝 표시: `(Claude 수정)` = 사실 · 숫자 · 자리표시자 · 문체를 고친 줄, `(Claude 보충)` = Gemini 가 빠뜨려 Claude 가 채운 줄. 이유는 `review.md`.
- 키 141개(Gemini 125 · Claude 보충 11 · 검증 보충 5). Claude 수정 27줄(1차 메모의 '28줄'은 머리말 줄까지 센 수).
- `(검증 수정)` · `(검증 보충)` = 독립 검증(2차)에서 고치거나 더한 줄. 이유는 `review.md` 끝 '독립 검증(2차)'.
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.2.common.stepTitle` | 3.2 전임상 · 동물실험 — 이 단계에서 하는 일<br>특허받은 분자를 사람에게 처음 투여하기 전에 비임상 시험(사람 대신 세포 · 동물로 하는 약리 · 독성 시험)을 진행해요.<br>스타트업 제약회사 모둠원들과 함께 동물실험 윤리를 배우고 동물실험계획서를 써서 IACUC(동물실험윤리위원회) 심의를 받아요.<br>대체 시험과 동물실험을 실행한 뒤, 결과판을 읽고 임상시험에 올릴 주력 · 백업 분자를 한 번 더 골라요. | — | 범위 1 · §5.9 도입 · 식약처 「의약품 임상시험 계획 승인에 관한 규정」 [별표 1] · 21 CFR 312.23(a)(8) (검증 수정) |
| `3.2.common.steps.ethics` | ① 윤리 배우기 | — | §5.9 걸음표 · `steps.ethics.label` |
| `3.2.common.steps.protocol` | ② 계획서 심의 | — | §5.9 걸음표 · `steps.protocol.label` |
| `3.2.common.steps.alt` | ③ 대체 시험 | — | §5.9 걸음표 · `steps.alt.label` |
| `3.2.common.steps.animal` | ④ 동물실험 | — | §5.9 걸음표 · `steps.animal.label` |
| `3.2.common.steps.pick` | ⑤ 한 번 더 고르기 | — | §5.9 걸음표 · `steps.pick.label` |
| `3.2.common.island.mine` | 내 작업대 — ① 윤리 카드 · 확인 문제, ② 계획서 칸 쓰기, ③ 대체 시험 고르기, ④ 동물실험 실행 · 계산 칸, ⑤ 결과판 해석 · 근거 칩을 진행해요. | — | §5.4.1 시안 21 '둥근 섬' · `ui.mine` |
| `3.2.common.island.team` | 모둠 공유 — ① 모둠원별 교육 이수 도장, ② 칸 분담 · 심의 결과, ③ 후보별 대체 시험 결과 · 덜 쓴 동물 수, ④ 진행 시계 · 결과판, ⑤ 주력 · 백업 지정 · 동물실험 종료보고서를 함께 봐요. | — | §5.4.1 시안 21 '둥근 섬' · `ui.team` |
| `3.2.ethics.card.why.title` | 1. 왜 동물에서 먼저 보나 | — | §5.9 ① 카드 1 · `ethicsCards[why].title` |
| `3.2.ethics.card.why.body` | 사람에게 새 약을 처음 주기 전에 '얼마까지 안전한가'를 재는 관문이에요.<br>저분자 신약(분자 크기가 작은 합성 신약)은 보통 설치류(생쥐 · 랫드 같은 동물) 1종과 비설치류(비글견 같은 동물) 1종에서 반복투여 독성을 봐요.<br>반복투여 독성은 일정 기간 약을 거듭 주면서 독성을 살피는 시험이에요.<br>심장 · 중추신경 · 호흡에 미치는 영향을 살피는 안전성약리(생명 유지 기능에 해가 없는지 보는 시험)도 함께 봐요.<br>여기서 얻은 약리 · 독성 자료가 IND(임상시험 계획 승인 신청) 서류의 비임상 시험 자료가 돼요. | — | §5.9 ① 카드 1 · ICH M3(R2) · S7A · S7B · `ethicsCards[why].body` (Claude 수정) (일관성 수정) |
| `3.2.ethics.card.why.source` | ICH M3(R2) · S7A · S7B · 식약처 「의약품 임상시험 계획 승인에 관한 규정」 [별표 1] · 21 CFR 312.23(a)(8) | — | §5.9 ① 카드 1 · `ethicsCards[why].source` |
| `3.2.ethics.card.3r.title` | 2. 3R 원칙 | — | §5.9 ① 카드 2 · `ethicsCards[3r].title` |
| `3.2.ethics.card.3r.body` | 대체(Replacement)는 동물 없이 답할 수 있으면 세포 · 오가노이드(사람 세포로 키운 작은 장기 모형) · 컴퓨터 방법을 먼저 쓰는 원칙이에요.<br>감소(Reduction)는 동물을 필요한 최소 마릿수만 쓰는 원칙이에요.<br>단, 통계적으로 믿을 수 있을 만큼은 써야 해요.<br>개선(Refinement)은 마취 · 진통 · 알맞은 사육 환경 · 인도적 종료시점(미리 정한 기준에 닿으면 실험을 끝내는 시점)으로 고통을 줄이는 원칙이에요.<br>1959년 Russell 과 Burch 가 제안했어요.<br>동물보호법 제47조(동물실험의 원칙)도 같은 내용을 적고 있어요. | — | §5.9 ① 카드 2 · Russell & Burch(1959) · 동물보호법 제47조 · `ethicsCards[3r].body` (Claude 수정) |
| `3.2.ethics.card.3r.source` | Russell & Burch(1959) · 동물보호법 제47조 | — | §5.9 ① 카드 2 · `ethicsCards[3r].source` |
| `3.2.ethics.card.pain.title` | 3. 고통등급 A~E | — | §5.9 ① 카드 3 · `ethicsCards[pain].title` |
| `3.2.ethics.card.pain.body` | A등급은 생물개체를 쓰지 않거나 무척추동물을 쓰는 실험이에요.<br>B등급은 척추동물을 쓰지만 고통이 거의 없는 실험이에요.<br>C등급은 약간의 스트레스나 짧고 작은 통증이 따르는 실험이에요.<br>D등급은 피할 수 없는 고통이 따르고, 진정제 · 진통제 · 마취제를 쓰는 실험이에요.<br>E등급은 피할 수 없는 고통이 따르는데, 약을 쓰면 결과가 망가져 약을 쓸 수 없는 실험이에요.<br>D등급은 고통 경감 조치가 반드시 있어야 해요.<br>E등급은 원칙적으로 허용하지 않고, 경감할 수 없는 분명한 사유가 있어야 해요. | — | §5.9 ① 카드 3 · 농림축산검역본부 고시 제2023-47호 · `ethicsCards[pain].body` (Claude 수정) |
| `3.2.ethics.card.pain.source` | IACUC 표준운영가이드라인(농림축산검역본부 고시 제2023-47호) | — | §5.9 ① 카드 3 · `ethicsCards[pain].source` |
| `3.2.ethics.card.endpoint.title` | 4. 인도적 종료시점 | — | §5.9 ① 카드 4 · `ethicsCards[endpoint].title` |
| `3.2.ethics.card.endpoint.body` | 동물의 상태가 미리 정한 기준에 닿으면, 실험 기간이 남았더라도 실험을 끝내요.<br>예: 정상 체중의 20% 이상 감소 · 종양이 체중의 10% 초과 · 먹지 못함 · 마비. | — | §5.9 ① 카드 4 · 농림축산검역본부 고시 제2023-47호 · `ethicsCards[endpoint].body` (Claude 수정) |
| `3.2.ethics.card.endpoint.source` | IACUC 표준운영가이드라인(농림축산검역본부 고시 제2023-47호) | — | §5.9 ① 카드 4 · `ethicsCards[endpoint].source` |
| `3.2.ethics.card.numbers.title` | 5. 숫자와 바뀌는 흐름 | — | §5.9 ① 카드 5 · `ethicsCards[numbers].title` |
| `3.2.ethics.card.numbers.body` | 2024년 국내 실험동물은 4,592,958마리였고, 마우스가 81.5%, 고통등급 D · E가 80.1%였어요.<br>동물에서 안전 · 유효해 보인 약의 90% 이상이 사람에서 허가받지 못해요.<br>그래서 미국의 FDA 현대화법 2.0(2022)이 비동물 방법을 IND 근거로 인정했어요.<br>FDA(미국 식품의약국)는 2025-04 로드맵과 2026-09 규정 개정으로 '동물 시험'을 '비임상 시험'이라 부르기 시작했어요.<br>동물실험을 금지한 것은 아니며, 더 나은 방법이 있으면 그것을 쓰라는 뜻이에요. | — | §5.9 ① 카드 5 · 농림축산검역본부 2024 실태조사 · FDA 2025 로드맵 · `ethicsCards[numbers].body` (검증 수정) |
| `3.2.ethics.card.numbers.source` | 농림축산검역본부 2024 실태조사 · FDA 현대화법 2.0(2022) · FDA 2025 로드맵 | — | §5.9 ① 카드 5 · `ethicsCards[numbers].source` |
| `3.2.ethics.quiz.q1.prompt` | '동물실험 전에 세포로 hERG(심장 박동 리듬에 관여하는 칼륨 통로)를 먼저 쟀다' — 이 사례는 3R 중 무엇에 해당할까요? | — | §5.9 ① 확인 문제 1 · `ethicsQuiz[q1].prompt` (검증 수정) |
| `3.2.ethics.quiz.q1.options` | ① 대체(Replacement)<br>② 감소(Reduction)<br>③ 개선(Refinement) | — | §5.9 ① 확인 문제 1 · `ethicsQuiz[q1].options` |
| `3.2.ethics.quiz.q1.explainOk` | 정답이에요.<br>동물 없이 세포 · 오가노이드 · 컴퓨터로 먼저 답을 확인하는 방법은 대체(Replacement)예요. | — | 범위 2 · §5.9 ① 카드 2 · 확인 문제 1 정답 해설 |
| `3.2.ethics.quiz.q1.explainWrong` | 아쉽게도 틀렸어요.<br>동물을 쓰지 않고 세포 실험으로 먼저 위험을 확인한 사례이니, 윤리 카드 2번에서 '동물 없이 답할 수 있으면 그 방법을 먼저 쓰는 원칙'을 다시 찾아봐요. | — | 범위 2 · §5.9 ① 카드 2 · 확인 문제 1 오답 해설 |
| `3.2.ethics.quiz.q2.prompt` | 폐암 세포를 이식한 누드마우스(면역이 약해 사람 암세포가 자랄 수 있는 털 없는 생쥐)에서 종양이 자라며 피할 수 없는 고통이 생겨 진통제를 써요.<br>이 실험의 고통등급은 무엇일까요? | — | §5.9 ① 확인 문제 2 · `ethicsQuiz[q2].prompt` (검증 수정) |
| `3.2.ethics.quiz.q2.options` | ① B등급 — 거의 고통 없음<br>② C등급 — 약간의 스트레스 · 짧은 작은 통증<br>③ D등급 — 피할 수 없는 고통(진정 · 진통 · 마취제를 씀)<br>④ E등급 — 피할 수 없는 고통이고 약을 쓰면 결과가 망가지는 실험 | — | §5.9 ① 확인 문제 2 · `ethicsQuiz[q2].options` |
| `3.2.ethics.quiz.q2.explainOk` | 정답이에요.<br>피할 수 없는 고통이 따르지만 진정제 · 진통제 · 마취제로 고통을 줄여 주는 실험은 D등급이에요. | — | 범위 2 · §5.9 ① 카드 3 · 확인 문제 2 정답 해설 |
| `3.2.ethics.quiz.q2.explainWrong` | 아쉽게도 틀렸어요.<br>종양 성장으로 피할 수 없는 고통이 생기지만 진통제를 써서 고통을 덜어 주고 있어요.<br>윤리 카드 3번에서 고통 경감 조치를 함께 쓰는 등급을 확인해 봐요. | — | 범위 2 · §5.9 ① 카드 3 · 확인 문제 2 오답 해설 |
| `3.2.ethics.quiz.q3.prompt` | 실험을 시작하기 전에 미리 정해 둘 '인도적 종료시점'으로 알맞은 것은 무엇일까요? | — | §5.9 ① 확인 문제 3 · `ethicsQuiz[q3].prompt` |
| `3.2.ethics.quiz.q3.options` | ① 정상 체중의 20% 이상 감소<br>② 정해진 실험 기간이 끝날 때까지 지켜본다<br>③ 동물이 스스로 죽을 때까지 기다린다 | — | §5.9 ① 확인 문제 3 · `ethicsQuiz[q3].options` |
| `3.2.ethics.quiz.q3.explainOk` | 정답이에요.<br>'정상 체중의 20% 이상 감소'처럼 잴 수 있는 기준을 미리 정해 둬요.<br>그 기준에 닿으면 실험 기간이 남아도 실험을 끝내요. | — | 범위 2 · §5.9 ① 카드 4 · 확인 문제 3 정답 해설 (Claude 수정) |
| `3.2.ethics.quiz.q3.explainWrong` | 아쉽게도 틀렸어요.<br>인도적 종료시점은 동물이 극심한 고통을 겪거나 죽기 전에 실험을 멈추려고 정하는 기준이에요.<br>윤리 카드 4번의 예시를 다시 확인해 봐요. | — | 범위 2 · §5.9 ① 카드 4 · 확인 문제 3 오답 해설 |
| `3.2.ethics.whoNeeds` | 동물실험 실행 단추를 누르는 사람만 교육 이수가 필요해요(동물보호법 제47조 ③ — 실험은 윤리적 취급과 과학적 사용의 지식을 갖춘 사람이 해요).<br>윤리 카드 읽기, 계획서 쓰기, 결과 보기는 모둠원 누구나 할 수 있어요. | — | §5.9 걸음표 ① · §5.9 ① · 동물보호법 제47조 ③ · `ethics.whoNeeds` |
| `3.2.ethics.retry` | 확인 문제는 횟수 제한 없이 다시 풀 수 있어요.<br>모둠원 중 한 명만 이수해도 우리 모둠이 동물실험을 진행할 수 있어요. | — | §5.9 ① · `ethics.retry` (Claude 수정) (일관성 수정) |
| `3.2.ethics.passed` | 실험 수행자 윤리 교육을 이수했어요.<br>모둠 공유 섬에 내 이수 도장이 찍혔어요.<br>이제 계획서의 실험 수행자로 뽑힐 수 있어요.<br>계획서가 승인되면 동물실험 실행 단추를 누를 수 있어요. | — | §5.9 걸음표 ① · `ethics.passed` (Claude 수정) |
| `3.2.ethics.wrong` | 아직 틀린 문제가 있어요.<br>윤리 카드 5장을 다시 읽고 확인 문제를 다시 풀어 봐요. | — | §5.9 ① · `ethics.wrong` |
| `3.2.ethics.dilemma` | 생각해 볼 거리: 동물 수를 절반 가까이 줄이면('적게', 후보당 46마리) 자료가 부족해 안전계수(동물 자료를 사람에게 옮길 때 불확실한 만큼 나누는 수)가 10에서 20으로 올라가요.<br>그러면 사람 임상 1상의 시작 용량 상한(MRSD)을 절반으로 낮춰 잡아야 해요.<br>동물을 덜 쓰는 것과, 사람에게 쓸 시작 용량을 넉넉히 확보하는 것 가운데 어느 쪽이 더 윤리적일까요? | — | §5.9 ① 딜레마 · `ethics.dilemma` (Claude 수정) (검증 수정) |
| `3.2.protocol.section.purpose.guide` | 사람에게 투여하기 전에 왜 동물에서 약동학(몸 안에서 약이 흡수 · 분포 · 대사 · 배설되는 과정) · 효력 · 독성을 먼저 확인해야 하는지 써요.<br>IND(임상시험 계획 승인 신청) 근거와 연결해 2~3줄({min}자 이상)로 써요. | `{min}` | §5.9 ② 목적 · 필요성 · `sections[purpose].guide` (검증 수정) (일관성 수정) |
| `3.2.protocol.section.purpose.example` | 예시: 특허받은 분자를 사람에게 처음 주기 전에, 동물에서 반복투여 독성 시험으로 NOAEL(부작용이 보이지 않은 가장 높은 용량)을 구하고 질환 모델 효력을 확인해요.<br>이 값으로 임상 1상 시작 용량의 상한(MRSD)을 정하고, IND 신청의 비임상 근거를 마련하려고 해요. | — | 범위 3 · §5.9 ② 목적 · 필요성 예시 (Claude 수정) (검증 수정) |
| `3.2.protocol.section.purpose.serverFills` | 특허 분자 목록(코드명) | — | §5.9 ② 목적 · 필요성 · `sections[purpose].serverFills` (Claude 수정) |
| `3.2.protocol.section.replacement.guide` | ③ 대체 시험을 먼저 했는지, 무엇을 동물 없이 확인했는지, 그리고 왜 세포 · 컴퓨터 방법만으로 동물을 완전히 대체할 수 없는지 구체적으로 써요({min}자 이상, '법이라서'만 적으면 보완이 나와요). | `{min}` | §5.9 ② 대체 · `sections[replacement].guide` |
| `3.2.protocol.section.replacement.example` | 예시: 세포 시험으로 hERG 칼륨 통로 억제와 간세포 독성을 먼저 확인해 위험한 후보를 걸러냈어요.<br>하지만 온몸에서 일어나는 약동학(흡수 · 분포 · 대사 · 배설)과 28일 반복투여 독성은 세포만으로 알 수 없어요.<br>그래서 남은 후보는 동물실험이 필요해요. | — | 범위 3 · §5.9 ② 대체 예시 (Claude 수정) |
| `3.2.protocol.section.replacement.serverFills` | ③ 대체 시험 결과 | — | §5.9 ② 대체 · `sections[replacement].serverFills` |
| `3.2.protocol.section.reduction.guide` | 특허 분자 중 실험에 넣을 후보와 군당 마릿수 수준(적게 · 알맞게 · 많이)을 고른 과학적 · 윤리적 근거를 써요({min}자 이상). | `{min}` | §5.9 ② 감소 · `sections[reduction].guide` |
| `3.2.protocol.section.reduction.example` | 예시: 대체 시험에서 독성 위험이 낮게 나온 후보만 넣었어요.<br>군당 마릿수는 결과를 믿을 수 있으면서 안전계수를 기본값 10으로 유지할 수 있는 '알맞게'(후보당 82마리)로 정했어요. | — | 범위 3 · §5.9 ② 감소 예시 (Claude 수정) |
| `3.2.protocol.section.reduction.serverFills` | 총 마릿수({animals}마리) | `{animals}` | §5.9 ② 감소 · `sections[reduction].serverFills` |
| `3.2.protocol.section.refinement.guide` | 마취 · 진통 · 사육 환경 개선 방법과 인도적 종료시점 기준(체중 감소 % 숫자, {min}~{max})을 적고, 표적 효력 모델의 고통등급을 골라요.<br>고통등급 D인 모델은 고통 경감 조치를 반드시 적어야 해요. | `{min}`, `{max}` | §5.9 ② 개선 · `sections[refinement].guide` |
| `3.2.protocol.section.refinement.example` | 예시: 알맞은 사육 환경과 진통제 · 마취제로 고통을 줄여요.<br>체중이 정상 체중보다 20% 이상 줄면 바로 실험을 끝내는 인도적 종료시점을 지킬 거예요. | — | 범위 3 · §5.9 ② 개선 예시 (검증 수정) |
| `3.2.protocol.section.refinement.serverFills` | 효력 모델({model}) · 정답 고통등급({grade}) | `{model}`, `{grade}` | §5.9 ② 개선 · `sections[refinement].serverFills` |
| `3.2.protocol.section.species.guide` | 독성 시험에서 랫드(설치류)와 비글견(비설치류) 두 종을 함께 쓰는 이유를 한 줄({min}자 이상)로 써요. | `{min}` | §5.9 ② 종 · 이유 · `sections[species].guide` |
| `3.2.protocol.section.species.example` | 예시: 종마다 약을 대사하는 방식과 독성 반응이 달라요.<br>그래서 국제 지침(ICH M3(R2))대로 설치류인 랫드와 비설치류인 비글견 두 종에서 확인해요.<br>두 종 중 더 민감한 종을 기준으로 사람 시작 용량을 잡아요. | — | 범위 3 · §5.9 ② 종 · 이유 예시 · §5.9 ④ '더 낮은 HED(가장 민감한 종)' (검증 수정) |
| `3.2.protocol.section.species.serverFills` | 랫드 + 비글견(고정) | — | §5.9 ② 종 · 이유 · `sections[species].serverFills` |
| `3.2.protocol.section.performers.guide` | ① 윤리 배우기를 이수한 모둠원 가운데 동물실험을 실행할 수행자를 1명 이상 골라요. | — | §5.9 ② 실험 수행자 · `ui.performers` |
| `3.2.protocol.section.performers.example` | 예시: 이수 도장이 찍힌 모둠원 이름 옆 칸을 체크해요.<br>이수 전인 모둠원은 고를 수 없어요. | — | 범위 3 · §5.9 ② 실험 수행자 예시 (Claude 수정) |
| `3.2.protocol.section.performers.serverFills` | 모둠원 교육 이수 기록 | — | §5.9 ② 실험 수행자 |
| `3.2.protocol.level.low` | 적게(후보당 46마리) — 사용하는 동물 수는 줄어요.<br>하지만 용량-반응 자료가 부족해 안전계수(동물 자료를 사람에게 옮길 때 불확실한 만큼 나누는 수)가 10에서 20으로 올라가요(FDA 2005 MRSD 지침).<br>사람 시작 용량 상한(MRSD)이 절반으로 줄어 3.3에서 고를 수 있는 용량이 낮아져요. | — | §5.9 ② · §5.9 ④ 마릿수 수준 · `levels.low` (검증 수정) |
| `3.2.protocol.level.standard` | 알맞게(후보당 82마리) — 결과를 믿을 수 있을 만큼 마릿수를 써요.<br>안전계수는 기본값 10이에요. | — | §5.9 ② · §5.9 ④ 마릿수 수준 · `levels.standard` (Claude 수정) |
| `3.2.protocol.level.high` | 많이(후보당 141마리) — 동물을 더 쓰지만 안전계수는 10 그대로라서 더 얻는 것이 없어요.<br>윤리위원회 심의에서 '근거 없는 과다'로 보완을 요구해요. | — | §5.9 ② · §5.9 ④ 마릿수 수준 · `levels.high` (Claude 수정) |
| `3.2.protocol.rule.patents.ok` | 동물실험에 넣을 특허 분자 후보를 골랐어요. | — | §5.9 ② 규칙 검사 · `rules.patentsOk` |
| `3.2.protocol.rule.patents.fail` | 동물실험에 넣을 특허 분자 후보를 하나 이상 골라야 해요. | — | §5.9 ② 규칙 검사 · `rules.patentsFail` |
| `3.2.protocol.rule.level.ok` | 군당 마릿수 수준이 감소 원칙 범위 안에 있어요. | — | §5.9 ② 규칙 검사 · `rules.levelOk` |
| `3.2.protocol.rule.level.fail` | '많이'(후보당 141마리)는 근거 없는 과다 사용이에요.<br>감소(Reduction) 원칙에 맞게 마릿수 수준을 줄여 주세요. | — | §5.9 ② 규칙 검사 · `rules.levelHigh` |
| `3.2.protocol.rule.pain.ok` | 고른 고통등급이 효력 모델의 기준 등급({grade})과 맞아요. | `{grade}` | §5.9 ② 규칙 검사 · `rules.painOk` |
| `3.2.protocol.rule.pain.missing` | 효력 모델의 고통등급(A~E)을 골라야 해요. | — | §5.9 ② 규칙 검사 · `rules.painMissing` |
| `3.2.protocol.rule.pain.mismatch` | 고른 고통등급이 효력 모델 표의 등급과 달라요.<br>오른쪽 효력 모델 표를 다시 확인해요. | — | §5.9 ② 규칙 검사 · `rules.painMismatch` (Claude 수정) |
| `3.2.protocol.rule.endpoint.ok` | 인도적 종료시점(체중 감소 %) 숫자를 범위 안으로 적었어요. | — | §5.9 ② 규칙 검사 · `rules.endpointOk` (Claude 수정) |
| `3.2.protocol.rule.endpoint.missing` | 인도적 종료시점(체중 감소 %) 숫자 칸을 {min}~{max} 사이의 정수로 채워야 해요. | `{min}`, `{max}` | §5.9 ② 규칙 검사 · `rules.endpointMissing` |
| `3.2.protocol.rule.performers.ok` | 윤리 교육을 이수한 실험 수행자가 지정되어 있어요. | — | §5.9 ② 규칙 검사 · `rules.performersOk` |
| `3.2.protocol.rule.performers.fail` | ① 윤리 배우기를 이수한 실험 수행자를 1명 이상 골라야 해요. | — | §5.9 ② 규칙 검사 · `rules.performersFail` |
| `3.2.protocol.rule.section.ok` | 모든 서술 칸을 {min}자 이상 작성했어요. | `{min}` | §5.9 ② 규칙 검사 · `rules.sectionEmpty` 대응 |
| `3.2.protocol.rule.section.fail` | 서술 칸은 각각 {min}자 이상 적어야 해요. | `{min}` | §5.9 ② 규칙 검사 · `rules.sectionEmpty` |
| `3.2.protocol.checklist` | 목적 · 필요성: 목적이 IND(임상시험 계획 승인 신청) 근거와 이어지나요?<br>대체: 동물을 완전히 대체할 수 없는 이유가 구체적인가요?('법이라서'만이면 보완)<br>감소: 고른 후보와 마릿수 수준의 근거를 썼나요?<br>개선: 마취 · 진통 · 인도적 종료시점을 적었나요? 고통등급 D이면 고통 경감 조치도 적었나요?<br>종 · 이유: 랫드와 비글견 두 종이 필요한 이유를 이해했나요? | — | §5.9 ② 심사 기준 · `checklist` (검증 수정) (일관성 수정) |
| `3.2.protocol.review.quota` | 윤리위원회 심의는 규칙 검사와 동물실험윤리위원회 역할을 맡은 'AI 심사'로 진행돼요.<br>심의 비용은 무료이며, 계획서 1건당 하루 5회까지 요청할 수 있어요. | — | §5.9 ② 심의 · `ui.reviewFree` |
| `3.2.protocol.status.draft` | 초안 — 계획서 칸을 채우고 설정을 저장한 뒤 윤리위원회 심의를 요청해 봐요. | — | §5.9 ② 상태 · `status.draft` |
| `3.2.protocol.status.reviewing` | 심의 중 — 규칙 검사 뒤 AI 심사관(동물실험윤리위원회 역할)이 계획서를 읽고 있어요.<br>기다리는 동안 다른 칸이나 걸음을 먼저 살펴볼 수 있어요. | — | §5.9 ② 상태 · §5.11 · `status.reviewing` · `messages.reviewing` (검증 수정) |
| `3.2.protocol.status.revise` | 보완 요구 — 심의에서 짚은 보완 사항을 확인해요.<br>계획서를 고친 뒤 다시 심의를 요청해 주세요. | — | §5.9 ② 상태 · §5.11 ① 규칙 ∧ LLM · `status.revise` (검증 수정) |
| `3.2.protocol.status.approved` | 승인 — 동물실험계획서가 승인되었어요.<br>승인된 계획서의 후보와 마릿수 수준대로 ④ 동물실험을 실행할 수 있어요. | — | §5.9 ② 상태 · `status.approved` |
| `3.2.protocol.changeReview` | 동물실험은 승인된 계획서에 적힌 후보와 마릿수 수준대로만 실행돼요.<br>후보를 더하거나 마릿수 수준을 바꾸려면 실제 IACUC 변경승인 절차처럼 변경 심의를 다시 받아야 해요. | — | §5.9 ② 변경 심의 · `messages.needApproval` · `messages.changed` |
| `3.2.alt.herg.name` | hERG 패치클램프(세포 시험) | — | §5.9 ③ · `assays.herg.label` |
| `3.2.alt.herg.desc` | 보는 것: 심장 박동 리듬에 관여하는 칼륨 통로(hERG)를 약이 얼마나 막는지 패치클램프(세포막 이온 통로 전류를 재는 실험)로 재요.<br>결과: IC50(통로 기능을 절반으로 막는 농도) 값 {value} µM 과 위험 구간(낮음 · 보통 · 높음)을 보여 줘요.<br>IC50 이 낮을수록 적은 양으로도 통로를 막으니 위험이 커요.<br>결과는 2.2 단계의 hERG 신호(염기성 아민 · cLogP(기름에 잘 녹는 정도))와 같은 재료로 정해져요.<br>비용 · 기간: 후보 · 시험당 {cost} · {days}게임 일(동물 0마리) | `{value}`(새) · `{cost}`, `{days}` | §5.9 ③ hERG 패치클램프 · `assays.herg` (Claude 수정) (일관성 수정) |
| `3.2.alt.liver.name` | 사람 간세포 · 간 오가노이드 독성 시험 | — | §5.9 ③ · `assays.liver.label` |
| `3.2.alt.liver.desc` | 보는 것: 사람 간세포와 간 오가노이드(사람 세포로 키운 작은 간 모형)에서 간세포 손상이 생기는지 확인해요.<br>결과: 세포 생존율 {value}% 와 독성 위험 구간(낮음 · 보통 · 높음)을 보여 줘요.<br>생존율이 낮을수록 간 독성 위험이 커요.<br>결과는 2.2 단계의 간독성 신호와 같은 재료로 정해져요.<br>비용 · 기간: 후보 · 시험당 {cost} · {days}게임 일(동물 0마리) | `{value}`(새) · `{cost}`, `{days}` | §5.9 ③ 사람 간세포 · 간 오가노이드 독성 · `assays.liver` (Claude 수정) (일관성 수정) |
| `3.2.alt.noNewVerdict` | 대체 시험은 동물을 쓰지 않으며(0마리), 새로운 판정을 따로 만들지 않아요.<br>2.2 단계의 예측 신호를 실험 값으로 굳혀서 ② 계획서의 대체 칸 근거와 '이 후보는 동물실험에서 빼자'는 결정의 근거로 써요. | — | §5.9 ③ · `ui.altNote` |
| `3.2.alt.savedAnimals` | 대체 시험 결과를 보고 위험이 큰 후보를 동물실험에서 빼면, 그 후보에 쓰였을 마릿수만큼 '덜 쓴 동물 수({saved}마리)'가 결과판과 종료보고서에 남아요. | `{saved}` | §5.9 걸음표 ③ · §5.9 ③ · `ui.saved` |
| `3.2.animal.bundle.pk` | 약동학(PK, 몸 안에서 약이 흡수 · 분포 · 대사 · 배설되는 과정) — 랫드 6마리(알맞게 기준)로 재요.<br>경구 생체이용률 F%(먹은 약 가운데 온몸 혈액에 들어가는 비율) · 최고 농도 · 반감기(혈액 속 약 농도가 절반으로 줄어드는 시간)를 봐요.<br>CNS(중추신경계) 표적이면 뇌/혈장 비(혈액에 견준 뇌 속 약 농도의 비)도 봐요. | — | §5.9 ④ 묶음 1 · 약동학(PK) (Claude 수정) (검증 수정) |
| `3.2.animal.bundle.efficacy` | 효력(질환 모델) — 표적별 질환 모델에서 군당 8마리씩 3군(질환 대조 · 기준 약 · 후보) 총 24마리(알맞게 기준)로 기준 약 대비 효과(%)를 확인해요. | — | §5.9 ④ 묶음 2 · 효력(질환 모델) |
| `3.2.animal.bundle.tox` | 반복투여 독성 28일 — 랫드 군당 10마리 × 4군(부형제 · 저 · 중 · 고) = 40마리, 비글견 군당 3마리 × 4군 = 12마리(알맞게 기준)예요.<br>부형제군은 약 성분 없이 약을 녹이거나 섞는 물질만 주는 대조군이에요.<br>종별 NOAEL(mg/kg/일, 부작용이 보이지 않은 가장 높은 용량)과 주요 소견(간 수치 상승 · QT 연장(심전도에서 심실이 수축했다가 회복하는 시간이 길어지는 현상) 등)을 확인해요. | — | §5.9 ④ 묶음 3 · 반복투여 독성 28일 (Claude 수정) (검증 수정) |
| `3.2.animal.bundle.safetyPharm` | 안전성약리(심장 · 중추 · 호흡) — 별도 동물을 쓰지 않고 독성 시험 군에 함께 붙여요.<br>국제 지침(ICH M3(R2))이 동물 수를 줄이기(감소) 위해 권하는 방법이에요.<br>QT 연장 여부와 행동 변화를 확인해요. | — | §5.9 ④ 묶음 4 · 안전성약리 · ICH M3(R2) (검증 수정) |
| `3.2.animal.models` | ACHE: 스코폴라민 유도 기억 손상 생쥐 — Y-미로 자발적 교대율 회복 측정(고통등급 C · 종료시점: 체중 20% 감소)<br>EGFR: EGFR 변이 폐암 세포 이종이식 누드마우스 — 종양 성장 억제율(TGI) 측정(고통등급 D · 종료시점: 종양이 체중의 10% 초과 · 궤양)<br>DPP4: 경구 포도당 부하 시험(OGTT) 생쥐 — 혈당 곡선 면적 감소 측정(고통등급 C · 종료시점: 체중 20% 감소)<br>PTGS2: 콜라겐 유도 관절염(CIA) 랫드 — 관절 부종 · 관절염 점수 감소 측정(고통등급 D, 진통제가 효력 판정을 흐릴 수 있어 E로 갈 위험 — 토론 거리 · 종료시점: 보행 불능 · 체중 20% 감소) | — | §5.9 ④ 효력 모델 표 |
| `3.2.animal.runInfo` | 승인된 계획서대로 특허 분자마다 4종 시험 묶음을 실행해요(후보당 적게 46 · 알맞게 82 · 많이 141마리).<br>비용은 후보당 {cost}이고 기간은 {days}게임 일(후보끼리 동시에 진행, 지금 D+{now} / 끝나는 날 D+{end})이에요. | `{cost}`, `{days}`, `{now}`, `{end}` | §5.9 ④ 비용 · 기간 · 마릿수 · `ui.runAnimal` · `ui.progress` (일관성 수정) |
| `3.2.animal.rerun` | 같은 표적 버전 · 분자 · 설계는 언제나 같은 결과가 나와요.<br>다시 돌려도 결과가 바뀌지 않고 연구비와 동물만 더 들기 때문에, 같은 설계로 재실행을 요청하면 과금 없이 옛 결과를 그대로 보여 줘요. | — | §5.9 ④ 결정성 · `messages.rerun` |
| `3.2.calc.intro` | 동물 독성 시험에서 구한 NOAEL(부작용이 보이지 않은 가장 높은 용량)로 HED(사람 등가 용량, 동물 용량을 사람 몸 기준으로 바꾼 값)와 MRSD(사람 첫 투여의 최대 권장 시작 용량)를 직접 계산해 봐요.<br>모든 칸이 서버 값과 맞으면 계획서와 3.3 신청서에 자동으로 붙어요. | — | §5.9 ④ 계산 칸 · FDA 2005 지침 · `calc.intro` |
| `3.2.calc.formula` | 1단계: 종별 HED(mg/kg) = NOAEL(mg/kg/일) ÷ 환산 계수(랫드 6.2 · 비글견 1.8)<br>2단계: 두 종 중 더 낮은 HED(가장 민감한 종)를 골라요.<br>3단계: MRSD(mg) = 더 낮은 HED(mg/kg) ÷ 안전계수({sf}, 알맞게 10 · 적게 20) × 60 kg<br>예: 비글견 NOAEL 18 mg/kg/일 → HED 10 mg/kg → 안전계수 10이면 경구 MRSD 약 60 mg('적게'여서 안전계수가 20이면 MRSD 30 mg) | `{sf}` | §5.9 ④ 공식 · FDA 2005 MRSD 지침 · `calc.formula` |
| `3.2.calc.fields` | HED 랫드(mg/kg) · HED 비글견(mg/kg) · 더 낮은 HED — 가장 민감한 종(mg/kg) · 경구 MRSD(mg) | — | §5.9 ④ · `ui.calcFields` |
| `3.2.calc.indNote` | 이 시뮬레이션에서는 3.3 에서 그 제형의 MRSD({mrsd} mg) 이하 용량을 고르면, IND 심사의 안전성 기준을 늘 통과해요.<br>MRSD 이하라고 사람에게 안전이 보장되는 것은 아니에요.<br>IND 승인은 임상시험을 시작해도 좋다는 출발 허락일 뿐이에요.<br>임상 1상 통과를 보장하지는 않아요. | `{mrsd}` | §5.9 ④ MRSD와 IND · `ui.mrsdChart` (Claude 수정) (검증 수정) |
| `3.2.calc.ok` | 모든 계산 칸이 서버 값과 맞아요.<br>구한 MRSD({mrsd} mg)가 계획서와 3.3 신청서에 자동으로 반영되었어요. | `{mrsd}` | §5.9 ④ 계산 맞음 · `calc.ok` |
| `3.2.calc.wrong` | 틀린 칸이 있어요.<br>표시된 칸을 다시 계산해 봐요.<br>환산 계수(랫드 6.2 · 비글견 1.8), 더 낮은 HED 고르기, 안전계수({sf}), 사람 기준 체중(60 kg)을 확인해요. | `{sf}` | §5.9 ④ 계산 틀림 · `calc.wrong` (Claude 수정) |
| `3.2.pick.metrics.pk` | 경구 생체이용률 F%(먹은 약 가운데 온몸 혈액에 들어가는 비율) · 최고 농도(혈중 최고 농도) · 반감기(혈중 농도가 절반으로 줄어드는 시간) · 뇌/혈장 비(혈액에 견준 뇌 속 약 농도의 비, CNS 표적) | — | §5.9 ④ · §5.9 ⑤ 결과판 지표 · `ui.metrics.{f,cmax,t12,bp}` (검증 수정) |
| `3.2.pick.metrics.efficacyTox` | 효력 %(질환 모델에서 기준 약 대비 효과) · 종별 NOAEL(랫드 · 비글견에서 부작용이 보이지 않은 가장 높은 용량, mg/kg/일) · HED(가장 민감한 종의 사람 등가 용량) · 안전계수({sf}) · 주요 소견(간 수치 상승 · QT 연장 · 행동 변화(중추)) | `{sf}` | §5.9 ④ · §5.9 ⑤ 결과판 지표 · `ui.metrics.{eff,noaelRat,noaelDog,hed,sf,findings}` · `findings` |
| `3.2.pick.metrics.mrsdAnimals` | 제형별 MRSD({form} — 경구 · 정맥 · 경피 최대 권장 시작 용량, mg) · 사용 마릿수({animals}마리) · 인도적 종료({humane}마리) · 대체 시험으로 뺌(제외한 후보는 흐린 열로 남음) | `{form}`, `{animals}`, `{humane}` | §5.9 ⑤ 결과판 지표 · `ui.metrics.{mrsd,animals,humane,excluded}` |
| `3.2.pick.chip.start_dose_room.label` | 시작 용량을 넉넉히 잡을 수 있어요 | — | §5.9 ⑤ 근거 칩 1 · `chips.labels.start_dose_room` |
| `3.2.pick.chip.start_dose_room.ok` | 맞음: 경구 MRSD({mrsd} mg)가 동물실험 후보 중 1위예요.<br>시작 용량을 가장 넉넉히 잡을 수 있어요. | `{mrsd}` | §5.9 ⑤ 근거 칩 1 · `chips.startDoseOk` (Claude 수정) |
| `3.2.pick.chip.start_dose_room.warn` | 주의: 경구 MRSD({mrsd} mg)가 후보 중 1위가 아니에요.<br>시작 용량 여유가 더 큰 후보가 있는지 확인해 봐요. | `{mrsd}` | §5.9 ⑤ 근거 칩 1 · `chips.startDoseWarn` |
| `3.2.pick.chip.efficacy_like_ref.label` | 질환 모델에서 기준 약만큼 들어요 | — | §5.9 ⑤ 근거 칩 2 · `chips.labels.efficacy_like_ref` |
| `3.2.pick.chip.efficacy_like_ref.ok` | 맞음: 질환 모델 효력이 기준 약의 {pct}% 이상이에요. | `{pct}` | §5.9 ⑤ 근거 칩 2(80%) · `chips.efficacyOk` |
| `3.2.pick.chip.efficacy_like_ref.block` | 막음: 질환 모델 효력이 기준 약의 {pct}%에 못 미쳐요.<br>이 근거로는 주력을 고를 수 없어요. | `{pct}` | §5.9 ⑤ 근거 칩 2(80%) · `chips.efficacyBlock` |
| `3.2.pick.chip.no_heart.label` | 심장 소견이 없어요 | — | §5.9 ⑤ 근거 칩 3 · `chips.labels.no_heart` |
| `3.2.pick.chip.no_heart.ok` | 맞음: 심전도 QT 연장 소견이 없어요. | — | §5.9 ⑤ 근거 칩 3 · `chips.heartOk` |
| `3.2.pick.chip.no_heart.block` | 막음: 심전도 QT 연장 소견이 있어요.<br>이 근거로는 주력을 고를 수 없어요. | — | §5.9 ⑤ 근거 칩 3 · `chips.heartBlock` |
| `3.2.pick.chip.no_liver.label` | 간 소견이 없어요 | — | §5.9 ⑤ 근거 칩 4 · `chips.labels.no_liver` |
| `3.2.pick.chip.no_liver.ok` | 맞음: 간 수치 상승 소견이 없어요. | — | §5.9 ⑤ 근거 칩 4 · `chips.liverOk` |
| `3.2.pick.chip.no_liver.block` | 막음: 간 수치 상승 소견이 있어요.<br>이 근거로는 주력을 고를 수 없어요. | — | §5.9 ⑤ 근거 칩 4 · `chips.liverBlock` |
| `3.2.pick.chip.brain_reach.label` | 뇌까지 잘 가요 | — | §5.9 ⑤ 근거 칩 5 · `chips.labels.brain_reach` |
| `3.2.pick.chip.brain_reach.ok` | 맞음: 뇌/혈장 비가 {ratio} 이상이어서 뇌까지 잘 도달해요(CNS 표적에만 보여요). | `{ratio}` | §5.9 ⑤ 근거 칩 5(0.7) · `chips.brainOk` |
| `3.2.pick.chip.brain_reach.block` | 막음: 뇌/혈장 비가 {ratio} 미만이에요.<br>이 근거로는 주력을 고를 수 없어요. | `{ratio}` | §5.9 ⑤ 근거 칩 5(0.7) · `chips.brainBlock` · `chips.brainNotCns` (Claude 수정) |
| `3.2.pick.leadRule` | 주력 1개와 백업 0~1개를 지정해요.<br>주력과 백업은 모두 '유효 특허 + 동물실험 완료' 분자만 고를 수 있고, 서로 다른 분자여야 해요. | — | §5.9 걸음표 ⑤ · §5.9 ⑤ 주력 · 백업 규칙 |
| `3.2.report.summary` | 동물실험 종료보고서(자동 작성)<br>모둠 합계 — 사용 {animals}마리 · 인도적 종료 {humane}마리 · 대체 시험으로 덜 쓴 {saved}마리.<br>후보별 표에는 사용 마릿수 · 효력 모델 고통등급 · 인도적 종료 발생 수가 함께 나와요.<br>인도적 종료는 고통등급 D 모델에서 위험이 큰 분자일수록 많이 생겨요. | `{animals}`, `{humane}`, `{saved}` | §5.9 ⑤ 동물실험 종료보고서 · `ui.reportTotal` (Claude 수정) |
| `3.2.report.reflection` | 회고 한 줄(200자 이하): 이번 전임상에서 대체 시험과 마릿수 선택으로 줄일 수 있었던 동물 수와, 다음 실험에서 바꾸고 싶은 점을 한 줄로 적어 봐요. | — | §5.9 ⑤ 회고(200자 이하) · `ui.reflectionGuide` |
| `3.2.common.locked` | 3.1 에서 유효 특허를 먼저 받아야 대체 시험과 동물실험이 열려요.<br>그 전에도 ① 윤리 카드를 읽고 ② 계획서 칸을 미리 써 둘 수 있어요. | — | §5.9 ⑤ 선행 조건 · `messages.needPatent` · `ui.locked` (Claude 수정) |
| `3.2.common.doneCondition` | 3.2 완료 조건: 승인된 계획서 + 동물실험 1건 이상 완료 + 주력 1개 지정.<br>완료하면 [3.3 제형 · IND 로] 넘어갈 수 있어요. | — | §5.9 걸음표 ⑤ · §5.9 ⑤ 완료 조건 · `ui.doneWhen` |
| `3.2.animal.needEthics` | 동물실험 실행 단추는 교육을 이수한 사람만 누를 수 있어요.<br>먼저 ① 윤리 배우기의 확인 문제를 풀어요. | — | §5.9 걸음표 ① · 동물보호법 제47조 ③ · `messages.needEthics` (Claude 보충) |
| `3.2.animal.needApproval` | 승인된 계획서에 있는 후보만 실행할 수 있어요.<br>후보를 더하거나 마릿수 수준을 바꾸려면 변경 심의를 다시 받아요. | — | §5.9 ② 변경 심의 · `messages.needApproval` (Claude 보충) |
| `3.2.protocol.changed` | 승인 뒤에 계획서가 바뀌었어요.<br>실행은 승인된 판대로 해요.<br>바꾼 내용은 변경 심의를 받아야 반영돼요. | — | §5.9 ② 변경 심의 · `messages.changed` (Claude 보충) |
| `3.2.animal.progress` | D+{now} / D+{end} | `{now}`, `{end}` | §5.9 ④ 게임 시계 · `ui.progress` (Claude 보충) (일관성 수정) |
| `3.2.animal.noStudy` | 동물실험을 끝낸 후보가 아직 없어요.<br>④ 동물실험에서 먼저 실행해요. | — | §5.9 ⑤ · `ui.noStudy` (Claude 보충) |
| `3.2.pick.mrsdChart` | 제형별 MRSD(사람 첫 투여의 최대 권장 시작 용량)<br>점선은 3.3 에서 고를 수 있는 용량(10 · 50 · 100 mg)이에요. | — | §5.9 ⑤ 결과판 · `ui.mrsdChart` (Claude 보충) |
| `3.2.pick.chip.brain_reach.notCns` | 이 근거는 CNS(중추신경계) 표적에만 써요. | — | §5.9 ⑤ 근거 칩 5 · `chips.brainNotCns` (Claude 보충) |
| `3.2.pick.chip.unknown` | 고를 수 없는 근거예요. | — | `chips.unknown` (Claude 보충) |
| `3.2.pick.backupWhy` | 백업은 주력이 임상에서 막혔을 때 이어 갈 두 번째 후보예요.<br>주력과 다른 약점을 가진 분자를 고르면 함께 막힐 위험이 줄어요. | — | §5.9 ⑤ · Stock & Molinoff(DIJ 2002) · 4.1 재도전 '백업 교체' (Claude 보충) |
| `3.2.protocol.review.verdict` | 승인 · 보완 요구 · 심의 중 | — | §5.9 ② 결과는 승인 / 보완 · `ui.verdict`(코드에는 '거절'도 있음 — review ⑥) (Claude 보충) |
| `3.2.protocol.review.aiBadge` | AI 심사 | — | §5.11 · brief 'AI 심사' 표시 · 3.1 `review.ai_badge` 와 같은 꼴 (검증 보충) |
| `3.2.protocol.review.aiNotice` | 규칙(후보 · 마릿수 수준 · 고통등급 · 종료시점 숫자 · 수행자 · 글자 수)은 서버가 먼저 판정해요.<br>그다음 AI 심사관(Claude)이 칸마다 빠진 것과 앞뒤가 안 맞는 곳을 봐요.<br>AI 는 규칙 판정을 뒤집지 못해요. | — | §5.11 ① 규칙 ∧ LLM · `PRECLINICAL_RULES.iacucRules` (검증 보충) |
| `3.2.protocol.review.pending` | 심사 대기 — AI 심사가 밀려 다시 시도하고 있어요.<br>그동안 계획서는 잠기지 않아요.<br>오래 걸리면 선생님이 직접 처리할 수 있어요. | — | §5.11 ⑥ LLM 장애면 pending · 교사 처리 (검증 보충) |
| `3.2.protocol.review.summaryHead` | AI 심사관의 종합 피드백 | — | §5.11 ⑦ 투명성 · `ui.feedback` (검증 보충) (일관성 수정) |
| `3.2.protocol.team.split` | 모둠 공유 — 계획서 칸은 모둠원이 나눠 쓸 수 있어요.<br>후보 · 마릿수 수준 · 고통등급 · 종료시점 · 수행자 설정은 모둠이 함께 저장해요. | — | §5.9 걸음표 ② 오른쪽 '칸 분담' · `ui.settings` (검증 보충) |
| `3.2.pick.debate.ptgs2` | 토론 거리: 관절염 모델에서 진통제를 쓰면 통증이 줄어 효력 판정이 흐려질 수 있어요.<br>진통제를 빼면 고통등급이 E 로 갈 위험이 있어요.<br>이럴 때 어떤 기준으로 정해야 할까요? | — | §5.9 ④ 효력 모델 PTGS2 · `PRECLINICAL_MODELS.debate` (Claude 보충) |
| `3.2.board.headline` | ◆ {ticker} 전임상 완료 — {codeName} IND 준비 | `{ticker}`, `{codeName}` | §5.9 ⑤ 전광판 · `board.headline` |
| `3.2.board.privacy` | 사용한 동물 마릿수 · 계획서 · 실험 결과는 우리 모둠과 선생님만 볼 수 있어요(선생님 화면에는 윤리 토론 자료로 학급 합계가 표시돼요). | — | §5.9 ⑤ 전광판 공개 범위 (일관성 수정) |

메모
- 자리표시자: `{value}` 하나만 새로 생겼다(대체 시험 실측값 — 결과 `value` 칸). 나머지 `{min}` · `{max}` · `{pct}` · `{ratio}` · `{sf}` 는 서버 값이 아니라 `preclinical.ts` 상수(`IACUC_SECTION_MIN` · `ENDPOINT_PCT_RANGE` · `EFFICACY_CHIP_MIN_PCT` · `BRAIN_PLASMA_HIGH_MIN` · `SAFETY_FACTOR`)를 끼워 넣는 자리다. 자세한 대응은 `review.md` ②.
- 여러 값을 한 줄로 묶은 키(`quiz.*.options` · `protocol.checklist` · `pick.metrics.*` · `calc.fields` · `animal.models`)는 코드 반영 때 기존 배열 · 객체 키로 나눈다(`review.md` ⑤).

## 반영 메모(2026-10-24)

- 윤리 카드는 설계 §5.9 ① 표의 사실 · 숫자 · 출처 그대로 두었어요. 그래서 초안의 카드 1 끝 줄('IND 서류의 비임상 시험 자료가 돼요')과 출처 더하기(식약처 [별표 1] · 21 CFR 312.23(a)(8) · 농림축산검역본부 고시 제2023-47호 · FDA 현대화법 2.0 출처 칸)는 넣지 않았어요. IND 풀이는 카드 5에 붙였어요.
- 카드 2 '오가노이드(사람 세포로 키운 …)' → '세포를 입체로 키운 작은 장기 모형'(오가노이드가 사람 세포로만 만들어지는 것은 아니라서).
- 종 · 이유 칸의 '서버가 채우는 것'은 설계대로 '—'(6.4-2 질문은 그대로 남아요).
- `pick.backupWhy` 는 첫 문장만 '보류' 표기로 바꿔 `ui.leadRule` 끝에 붙였어요(둘째 문장은 설계 규칙이 아니라 뺐어요 — 6.4-3).
- 넣지 않은 키(쓸 자리가 없음): `common.stepTitle` · `common.island.*` · `protocol.section.performers.*` · `protocol.changeReview` · `pick.metrics.*`(결과판 행 이름은 짧게 둠) · `animal.models`(코드 `PRECLINICAL_MODELS` = 설계 표) · `pick.debate.ptgs2` · `alt.*.desc` 의 `{value}` 줄(결과는 결과표에 보임).
- 숫자는 상수로 끼웠어요(`ANIMALS_PER_CANDIDATE` · `SAFETY_FACTOR` · `SPECIES_HED_DIVISOR` · `HUMAN_WEIGHT_KG` · `IACUC_SECTION_MIN` · `ENDPOINT_PCT_RANGE` · `REVIEW_LIMITS`). 진행 표시는 `formatGameDay`(D+).
- 규칙 문구 · 체크리스트(IND 풀이)가 LLM 입력에 들어가서 `IACUC_REVIEWER_VERSION` 을 `iacuc-v2` 로 올렸어요.
