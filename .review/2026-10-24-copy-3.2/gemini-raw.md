| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.2.common.step_title` | 3.2 전임상 · 동물실험 — 이 단계에서 하는 일<br>특허받은 분자를 사람에게 처음 투여하기 전에 비임상 시험(사람에게 투여하기 전에 거치는 안전성 · 효력 시험)을 진행해요.<br>스타트업 제약회사 모둠원들과 함께 동물실험 윤리를 배우고 동물실험계획서를 써서 IACUC(동물실험윤리위원회) 심의를 받아요.<br>대체 시험과 동물실험을 실행한 뒤, 결과판을 읽고 임상시험에 올릴 주력 · 백업 분자를 한 번 더 골라요. | — | §2.1 · §4 도입 · 식약처 「의약품 임상시험 계획 승인에 관한 규정」 [별표 1] · 21 CFR 312.23(a)(8) |
| `3.2.common.steps.ethics` | ① 윤리 배우기 | — | §3 · `steps.ethics.label` |
| `3.2.common.steps.protocol` | ② 계획서 심의 | — | §3 · `steps.protocol.label` |
| `3.2.common.steps.alt` | ③ 대체 시험 | — | §3 · `steps.alt.label` |
| `3.2.common.steps.animal` | ④ 동물실험 | — | §3 · `steps.animal.label` |
| `3.2.common.steps.pick` | ⑤ 한 번 더 고르기 | — | §3 · `steps.pick.label` |
| `3.2.common.island.mine` | 내 작업대 — ① 윤리 카드 · 확인 문제, ② 계획서 칸 쓰기, ③ 대체 시험 고르기, ④ 동물실험 실행 · 계산 칸, ⑤ 결과판 해석 · 근거 칩을 진행해요. | — | §3 시안 21 '둥근 섬' · `ui.mine` |
| `3.2.common.island.team` | 모둠 공유 — ① 모둠원별 교육 이수 도장, ② 칸 분담 · 심의 결과, ③ 후보별 대체 시험 결과 · 덜 쓴 동물 수, ④ 진행 시계 · 결과판, ⑤ 주력 · 백업 지정 · 동물실험 종료보고서를 함께 봐요. | — | §3 시안 21 '둥근 섬' · `ui.team` |
| `3.2.ethics.card.why.title` | 1. 왜 동물에서 먼저 보나 | — | §4 ① 카드 1 · `ethicsCards[why].title` |
| `3.2.ethics.card.why.body` | 사람에게 새 약을 처음 주기 전에 '얼마까지 안전한가'를 재는 관문이에요.<br>저분자 신약(분자 크기가 작은 합성 신약)은 보통 설치류(쥐 · 랫드 같은 동물) 1종과 비설치류(비글견 같은 동물) 1종에서 반복투여 독성(일정 기간 거듭 투여해 독성을 살피는 시험)을 확인해요.<br>심장 · 중추신경 · 호흡에 미치는 영향을 살피는 안전성약리(생명 유지 기능에 해가 없는지 보는 시험)도 함께 봐요.<br>여기서 얻은 약리 · 독성 자료가 IND(임상시험 계획 승인) 신청서의 비임상 시험 자료가 돼요. | — | §4 ① 카드 1 · ICH M3(R2) · S7A · S7B · `ethicsCards[why].body` |
| `3.2.ethics.card.why.source` | ICH M3(R2) · S7A · S7B · 식약처 「의약품 임상시험 계획 승인에 관한 규정」 [별표 1] · 21 CFR 312.23(a)(8) | — | §4 ① 카드 1 · `ethicsCards[why].source` |
| `3.2.ethics.card.3r.title` | 2. 3R 원칙 | — | §4 ① 카드 2 · `ethicsCards[3r].title` |
| `3.2.ethics.card.3r.body` | 대체(Replacement)는 동물 없이 답할 수 있으면 세포 · 오가노이드(줄기세포로 만든 미니 장기) · 컴퓨터 방법을 먼저 쓰는 원칙이에요.<br>감소(Reduction)는 실험에 쓰는 동물을 필요한 최소 마릿수로 줄이되, 통계적으로 믿을 수 있을 만큼은 확보하는 원칙이에요.<br>개선(Refinement)은 마취 · 진통 · 알맞은 사육 환경 · 인도적 종료시점(고통이 기준에 닿으면 실험을 멈추는 시점)으로 고통을 줄이는 원칙이에요.<br>1959년 Russell과 Burch가 제안했고, 동물보호법 제47조(동물실험의 원칙)가 같은 내용을 적고 있어요. | — | §4 ① 카드 2 · Russell & Burch(1959) · 동물보호법 제47조 · `ethicsCards[3r].body` |
| `3.2.ethics.card.3r.source` | Russell & Burch(1959) · 동물보호법 제47조 | — | §4 ① 카드 2 · `ethicsCards[3r].source` |
| `3.2.ethics.card.pain.title` | 3. 고통등급 A~E | — | §4 ① 카드 3 · `ethicsCards[pain].title` |
| `3.2.ethics.card.pain.body` | A등급은 생물개체를 쓰지 않거나 무척추동물을 쓰는 실험이고, B등급은 척추동물이지만 고통이 거의 없는 실험이에요.<br>C등급은 약간의 스트레스나 짧고 작은 통증이 따르는 실험이에요.<br>D등급은 피할 수 없는 고통이 따르지만 진정제 · 진통제 · 마취제를 쓰는 실험이고, E등급은 피할 수 없는 고통이 따르는데 약을 쓰면 실험 결과가 망가져 약을 못 쓰는 실험이에요.<br>E등급은 원칙적으로 허용하지 않으며, D등급은 고통 경감 조치가 반드시 있어야 하고 E등급은 경감할 수 없는 분명한 사유가 있어야 해요. | — | §4 ① 카드 3 · 농림축산검역본부 고시 제2023-47호 · `ethicsCards[pain].body` |
| `3.2.ethics.card.pain.source` | IACUC 표준운영가이드라인(농림축산검역본부 고시 제2023-47호) | — | §4 ① 카드 3 · `ethicsCards[pain].source` |
| `3.2.ethics.card.endpoint.title` | 4. 인도적 종료시점 | — | §4 ① 카드 4 · `ethicsCards[endpoint].title` |
| `3.2.ethics.card.endpoint.body` | 동물이 겪는 고통이 미리 정한 기준에 닿으면 실험 기간이 남았더라도 실험을 끝내요.<br>정상 체중의 20% 이상 감소, 이식한 종양이 체중의 10% 초과, 먹지 못함, 마비가 대표적인 기준이에요. | — | §4 ① 카드 4 · 농림축산검역본부 고시 제2023-47호 · `ethicsCards[endpoint].body` |
| `3.2.ethics.card.endpoint.source` | IACUC 표준운영가이드라인(농림축산검역본부 고시 제2023-47호) | — | §4 ① 카드 4 · `ethicsCards[endpoint].source` |
| `3.2.ethics.card.numbers.title` | 5. 숫자와 바뀌는 흐름 | — | §4 ① 카드 5 · `ethicsCards[numbers].title` |
| `3.2.ethics.card.numbers.body` | 2024년 국내 실험동물은 4,592,958마리였고, 마우스가 81.5%, 고통등급 D · E가 80.1%였어요.<br>동물에서 안전 · 유효해 보인 약의 90% 이상이 사람에서 허가받지 못해요.<br>그래서 FDA 현대화법 2.0(2022)이 비동물 방법을 IND 근거로 인정했고, FDA는 2025-04 로드맵과 2026-09 규정 개정으로 '동물 시험'을 '비임상 시험'이라 부르기 시작했어요.<br>동물실험을 금지한 것은 아니며, 더 나은 방법이 있으면 그것을 쓰라는 뜻이에요. | — | §4 ① 카드 5 · 농림축산검역본부 2024 실태조사 · FDA 2025 로드맵 · `ethicsCards[numbers].body` |
| `3.2.ethics.card.numbers.source` | 농림축산검역본부 2024 실태조사 · FDA 현대화법 2.0(2022) · FDA 2025 로드맵 | — | §4 ① 카드 5 · `ethicsCards[numbers].source` |
| `3.2.ethics.quiz.q1.prompt` | '동물실험 전에 세포로 hERG(심장 박동을 조절하는 칼륨 통로)를 먼저 쟀다' — 이 사례는 3R 중 무엇에 해당할까요? | — | §4 ① 확인 문제 1 · `ethicsQuiz[q1].prompt` |
| `3.2.ethics.quiz.q1.options` | ① 대체(Replacement)<br>② 감소(Reduction)<br>③ 개선(Refinement) | — | §4 ① 확인 문제 1 · `ethicsQuiz[q1].options` |
| `3.2.ethics.quiz.q1.explain_ok` | 정답이에요.<br>동물 없이 세포 · 오가노이드 · 컴퓨터로 먼저 답을 확인하는 방법은 대체(Replacement)예요. | — | §2.2 · §4 ① 카드 2 · 확인 문제 1 정답 해설 |
| `3.2.ethics.quiz.q1.explain_wrong` | 아쉽게도 틀렸어요.<br>동물을 쓰지 않고 세포 실험으로 먼저 위험을 확인한 사례이니, 윤리 카드 2번에서 '동물 없이 답할 수 있으면 그 방법을 먼저 쓰는 원칙'을 다시 찾아봐요. | — | §2.2 · §4 ① 카드 2 · 확인 문제 1 오답 해설 |
| `3.2.ethics.quiz.q2.prompt` | 폐암 세포를 이식한 누드마우스에서 종양이 자라며 피할 수 없는 고통이 생겨 진통제를 써요. 이 실험의 고통등급은 무엇일까요? | — | §4 ① 확인 문제 2 · `ethicsQuiz[q2].prompt` |
| `3.2.ethics.quiz.q2.options` | ① B등급 — 거의 고통 없음<br>② C등급 — 약간의 스트레스 · 짧은 작은 통증<br>③ D등급 — 피할 수 없는 고통(진정 · 진통 · 마취제를 씀)<br>④ E등급 — 피할 수 없는 고통이고 약을 쓰면 결과가 망가지는 실험 | — | §4 ① 확인 문제 2 · `ethicsQuiz[q2].options` |
| `3.2.ethics.quiz.q2.explain_ok` | 정답이에요.<br>피할 수 없는 고통이 따르지만 진정제 · 진통제 · 마취제로 고통을 줄여 주는 실험은 D등급이에요. | — | §2.2 · §4 ① 카드 3 · 확인 문제 2 정답 해설 |
| `3.2.ethics.quiz.q2.explain_wrong` | 아쉽게도 틀렸어요.<br>종양 성장으로 피할 수 없는 고통이 생기지만 진통제를 써서 고통을 덜어 주고 있어요.<br>윤리 카드 3번에서 고통 경감 조치를 함께 쓰는 등급을 확인해 봐요. | — | §2.2 · §4 ① 카드 3 · 확인 문제 2 오답 해설 |
| `3.2.ethics.quiz.q3.prompt` | 실험을 시작하기 전에 미리 정해 둘 '인도적 종료시점'으로 알맞은 것은 무엇일까요? | — | §4 ① 확인 문제 3 · `ethicsQuiz[q3].prompt` |
| `3.2.ethics.quiz.q3.options` | ① 정상 체중의 20% 이상 감소<br>② 정해진 실험 기간이 끝날 때까지 지켜본다<br>③ 동물이 스스로 죽을 때까지 기다린다 | — | §4 ① 확인 문제 3 · `ethicsQuiz[q3].options` |
| `3.2.ethics.quiz.q3.explain_ok` | 정답이에요.<br>정상 체중의 20% 이상 감소나 종양이 체중의 10%를 초과하는 것처럼 명확한 기준을 미리 정해 두고, 그 기준에 닿으면 실험을 끝내요. | — | §2.2 · §4 ① 카드 4 · 확인 문제 3 정답 해설 |
| `3.2.ethics.quiz.q3.explain_wrong` | 아쉽게도 틀렸어요.<br>인도적 종료시점은 동물이 극심한 고통을 겪거나 죽기 전에 실험을 멈추려고 정하는 기준이에요.<br>윤리 카드 4번의 예시를 다시 확인해 봐요. | — | §2.2 · §4 ① 카드 4 · 확인 문제 3 오답 해설 |
| `3.2.ethics.who_needs` | 동물실험 실행 단추를 누르는 사람만 교육 이수가 필요해요(동물보호법 제47조 ③ — 실험은 윤리적 취급과 과학적 사용의 지식을 갖춘 사람이 해요).<br>윤리 카드 읽기, 계획서 쓰기, 결과 보기는 모둠원 누구나 할 수 있어요. | — | §3 ① · §4 ① · 동물보호법 제47조 ③ · `ethics.whoNeeds` |
| `3.2.ethics.retry` | 확인 문제는 횟수 제한 없이 다시 풀 수 있어요.<br>모둠원 네 명 중 한 명만 이수해도 우리 스타트업 제약회사 모둠이 동물실험을 진행할 수 있어요. | — | §4 ① · `ethics.retry` |
| `3.2.ethics.passed` | 실험 수행자 윤리 교육을 이수했어요.<br>모둠 공유 섬에 내 이수 도장이 찍혔고, 이제 실험 수행자로 지정되어 동물실험 실행 단추를 누를 수 있어요. | — | §3 ① · `ethics.passed` |
| `3.2.ethics.wrong` | 아직 틀린 문제가 있어요.<br>윤리 카드 5장을 다시 읽고 확인 문제를 다시 풀어 봐요. | — | §4 ① · `ethics.wrong` |
| `3.2.ethics.dilemma` | 생각해 볼 거리: 동물 수를 절반으로 줄이면('적게', 후보당 46마리) 자료가 부족해 안전계수가 10에서 20으로 올라가고, 사람 임상 1상의 시작 용량 상한(MRSD)을 절반으로 낮춰 잡아야 해요.<br>동물을 덜 쓰는 것과 사람 첫 투여 자료를 더 정확히 얻는 것 가운데 어느 쪽이 더 윤리적일까요? | — | §4 ① 딜레마 · `ethics.dilemma` |
| `3.2.protocol.section.purpose.guide` | 사람에게 투여하기 전에 왜 동물에서 약동학 · 효력 · 독성을 먼저 확인해야 하는지 IND(임상시험 계획 승인) 근거와 연결해 2~3줄({min}자 이상)로 써요. | `{min}` | §4 ② 목적 · 필요성 · `sections[purpose].guide` |
| `3.2.protocol.section.purpose.example` | 예시: 특허받은 분자를 사람에게 처음 투여하기 전에 동물에서 반복투여 독성(NOAEL)과 질환 모델 효력을 확인하여, 안전한 임상 1상 시작 용량(MRSD)을 정하고 IND 신청의 비임상 근거를 마련하려고 해요. | — | §2.3 · §4 ② 목적 · 필요성 예시 |
| `3.2.protocol.section.purpose.server_fills` | 특허 분자 목록({codeName}) | `{codeName}` | §4 ② 목적 · 필요성 · `sections[purpose].serverFills` |
| `3.2.protocol.section.replacement.guide` | ③ 대체 시험을 먼저 했는지, 무엇을 동물 없이 확인했는지, 그리고 왜 세포 · 컴퓨터 방법만으로 동물을 완전히 대체할 수 없는지 구체적으로 써요({min}자 이상, '법이라서'만 적으면 보완이 나와요). | `{min}` | §4 ② 대체 · `sections[replacement].guide` |
| `3.2.protocol.section.replacement.example` | 예시: 세포 시험으로 hERG 칼륨 통로 억제와 간세포 독성을 먼저 확인해 위험 후보를 걸러냈지만, 온몸에서 일어나는 약동학(흡수 · 분포 · 배설)과 28일 반복투여 독성은 세포만으로 알 수 없어 동물실험이 필요해요. | — | §2.3 · §4 ② 대체 예시 |
| `3.2.protocol.section.replacement.server_fills` | ③ 대체 시험 결과 | — | §4 ② 대체 · `sections[replacement].serverFills` |
| `3.2.protocol.section.reduction.guide` | 특허 분자 중 실험에 넣을 후보와 군당 마릿수 수준(적게 · 알맞게 · 많이)을 고른 과학적 · 윤리적 근거를 써요({min}자 이상). | `{min}` | §4 ② 감소 · `sections[reduction].guide` |
| `3.2.protocol.section.reduction.example` | 예시: 대체 시험에서 독성 위험이 낮게 나온 후보만 고르고, 동물 수를 아끼면서도 기본 안전계수 10을 적용할 수 있는 통계적 최소 수준인 '알맞게'(후보당 82마리)로 정했어요. | — | §2.3 · §4 ② 감소 예시 |
| `3.2.protocol.section.reduction.server_fills` | 총 마릿수({animals}마리) | `{animals}` | §4 ② 감소 · `sections[reduction].serverFills` |
| `3.2.protocol.section.refinement.guide` | 마취 · 진통 · 사육 환경 개선 방법과 인도적 종료시점 기준(체중 감소 % 숫자, {min}~{max})을 적고, 표적 효력 모델의 고통등급을 골라요.<br>고통등급 D인 모델은 고통 경감 조치를 반드시 적어야 해요. | `{min}`, `{max}` | §4 ② 개선 · `sections[refinement].guide` |
| `3.2.protocol.section.refinement.example` | 예시: 알맞은 사육 환경과 진통제 · 마취제를 써서 고통을 줄이고, 동물의 체중이 정상 체중보다 20% 이상 줄어들면 즉시 실험을 멈추는 인도적 종료시점을 지킬 거예요. | — | §2.3 · §4 ② 개선 예시 |
| `3.2.protocol.section.refinement.server_fills` | 효력 모델({model}) · 정답 고통등급({grade}) | `{model}`, `{grade}` | §4 ② 개선 · `sections[refinement].serverFills` |
| `3.2.protocol.section.species.guide` | 독성 시험에서 랫드(설치류)와 비글견(비설치류) 두 종을 함께 쓰는 이유를 한 줄({min}자 이상)로 써요. | `{min}` | §4 ② 종 · 이유 · `sections[species].guide` |
| `3.2.protocol.section.species.example` | 예시: 종마다 약물을 대사하는 방식과 독성 반응이 다르므로, 국제 지침(ICH M3(R2))에 따라 설치류인 랫드와 비설치류인 비글견 두 종에서 모두 안전성을 확인해야 사람에게 가장 안전한 기준을 잡을 수 있어요. | — | §2.3 · §4 ② 종 · 이유 예시 |
| `3.2.protocol.section.species.server_fills` | 랫드 + 비글견(고정) | — | §4 ② 종 · 이유 · `sections[species].serverFills` |
| `3.2.protocol.section.performers.guide` | ① 윤리 배우기를 이수한 모둠원 가운데 동물실험을 실행할 수행자를 1명 이상 골라요. | — | §4 ② 실험 수행자 · `ui.performers` |
| `3.2.protocol.section.performers.example` | 예시: 동물보호법 제47조 제3항에 따라 윤리 교육을 이수한 모둠원이 승인된 계획서와 인도적 종료시점 기준을 지켜 실험을 수행해요. | — | §2.3 · §4 ② 실험 수행자 예시 |
| `3.2.protocol.section.performers.server_fills` | 모둠원 교육 이수 기록 | — | §4 ② 실험 수행자 |
| `3.2.protocol.level.low` | 적게(후보당 46마리) — 사용하는 동물 수는 줄지만 용량-반응 자료가 부족해 안전계수가 10에서 20으로 올라가요(FDA 2005 MRSD 지침).<br>사람 시작 용량 상한(MRSD)이 절반으로 줄어 3.3에서 고를 수 있는 용량이 낮아져요. | — | §4 ② · §4 ④ 마릿수 수준 · `levels.low` |
| `3.2.protocol.level.standard` | 알맞게(후보당 82마리) — 통계적으로 결과를 믿을 수 있는 최소 마릿수여서 기본 안전계수 10을 적용해요. | — | §4 ② · §4 ④ 마릿수 수준 · `levels.standard` |
| `3.2.protocol.level.high` | 많이(후보당 141마리) — 동물을 더 쓰지만 안전계수는 10 그대로여서 과학적으로 얻는 것이 없어요.<br>윤리위원회 심의에서 '근거 없는 과다'로 보완을 요구해요. | — | §4 ② · §4 ④ 마릿수 수준 · `levels.high` |
| `3.2.protocol.rule.patents.ok` | 동물실험에 넣을 특허 분자 후보를 골랐어요. | — | §4 ② 규칙 검사 · `rules.patentsOk` |
| `3.2.protocol.rule.patents.fail` | 동물실험에 넣을 특허 분자 후보를 하나 이상 골라야 해요. | — | §4 ② 규칙 검사 · `rules.patentsFail` |
| `3.2.protocol.rule.level.ok` | 군당 마릿수 수준이 감소 원칙 범위 안에 있어요. | — | §4 ② 규칙 검사 · `rules.levelOk` |
| `3.2.protocol.rule.level.fail` | '많이'(후보당 141마리)는 근거 없는 과다 사용이에요.<br>감소(Reduction) 원칙에 맞게 마릿수 수준을 줄여 주세요. | — | §4 ② 규칙 검사 · `rules.levelHigh` |
| `3.2.protocol.rule.pain.ok` | 고른 고통등급이 효력 모델의 기준 등급({grade})과 맞아요. | `{grade}` | §4 ② 규칙 검사 · `rules.painOk` |
| `3.2.protocol.rule.pain.missing` | 효력 모델의 고통등급(A~E)을 골라야 해요. | — | §4 ② 규칙 검사 · `rules.painMissing` |
| `3.2.protocol.rule.pain.mismatch` | 고른 고통등급이 표적 효력 모델 표의 기준 등급({grade})과 달라요. | `{grade}` | §4 ② 규칙 검사 · `rules.painMismatch` |
| `3.2.protocol.rule.endpoint.ok` | 인도적 종료시점(체중 감소 %) 숫자를 알맞게 적었어요. | — | §4 ② 규칙 검사 · `rules.endpointOk` |
| `3.2.protocol.rule.endpoint.missing` | 인도적 종료시점(체중 감소 %) 숫자 칸을 {min}~{max} 사이의 정수로 채워야 해요. | `{min}`, `{max}` | §4 ② 규칙 검사 · `rules.endpointMissing` |
| `3.2.protocol.rule.performers.ok` | 윤리 교육을 이수한 실험 수행자가 지정되어 있어요. | — | §4 ② 규칙 검사 · `rules.performersOk` |
| `3.2.protocol.rule.performers.fail` | ① 윤리 배우기를 이수한 실험 수행자를 1명 이상 골라야 해요. | — | §4 ② 규칙 검사 · `rules.performersFail` |
| `3.2.protocol.rule.section.ok` | 모든 서술 칸을 {min}자 이상 작성했어요. | `{min}` | §4 ② 규칙 검사 · `rules.sectionEmpty` 대응 |
| `3.2.protocol.rule.section.fail` | 서술 칸은 각각 {min}자 이상 적어야 해요. | `{min}` | §4 ② 규칙 검사 · `rules.sectionEmpty` |
| `3.2.protocol.checklist` | 목적 · 필요성: 목적이 IND(임상시험 계획 승인) 근거와 이어지는가<br>대체: 동물을 완전히 대체할 수 없는 이유가 구체적인가('법이라서'만이면 보완)<br>감소: 고른 후보와 마릿수 수준의 근거를 서술했는가<br>개선: 마취 · 진통 · 인도적 종료시점을 적었는가, 고통등급 D이면 고통 경감 조치를 적었는가<br>종 · 이유: 랫드와 비글견 두 종이 필요한 이유를 이해했는가 | — | §4 ② 심사 기준 · `checklist` |
| `3.2.protocol.review.quota` | 윤리위원회 심의는 규칙 검사와 동물실험윤리위원회 역할을 맡은 'AI 심사'로 진행돼요.<br>심의 비용은 무료이며, 계획서 1건당 하루 5회까지 요청할 수 있어요. | — | §4 ② 심의 · `ui.reviewFree` |
| `3.2.protocol.status.draft` | 초안 — 계획서 칸을 채우고 설정을 저장한 뒤 윤리위원회 심의를 요청해 봐요. | — | §4 ② 상태 · `status.draft` |
| `3.2.protocol.status.reviewing` | 심의 중 — 동물실험윤리위원회(AI 심사)가 계획서를 심의하고 있어요.<br>기다리는 동안 다른 칸이나 걸음을 먼저 살펴볼 수 있어요. | — | §4 ② 상태 · `status.reviewing` · `messages.reviewing` |
| `3.2.protocol.status.revise` | 보완 요구 — 윤리위원회가 짚어 준 보완 사항을 확인하고 계획서를 고쳐 다시 심의를 요청해 주세요. | — | §4 ② 상태 · `status.revise` |
| `3.2.protocol.status.approved` | 승인 — 동물실험계획서가 승인되었어요.<br>승인된 계획서의 후보와 마릿수 수준대로 ④ 동물실험을 실행할 수 있어요. | — | §4 ② 상태 · `status.approved` |
| `3.2.protocol.change_review` | 동물실험은 승인된 계획서에 적힌 후보와 마릿수 수준대로만 실행돼요.<br>후보를 더하거나 마릿수 수준을 바꾸려면 실제 IACUC 변경승인 절차처럼 변경 심의를 다시 받아야 해요. | — | §4 ② 변경 심의 · `messages.needApproval` · `messages.changed` |
| `3.2.alt.herg.name` | hERG 패치클램프(세포 시험) | — | §4 ③ · `assays.herg.label` |
| `3.2.alt.herg.desc` | 보는 것: 심장 박동을 조절하는 칼륨 통로(hERG)를 얼마나 막는지 패치클램프(세포막 이온 통로 전류를 재는 실험)로 확인해요.<br>결과: IC50(통로 기능을 절반으로 막는 농도) 구간(낮음 · 보통 · 높음)을 보여 주며, 2.2 단계의 hERG 신호(염기성 아민 · cLogP(기름에 잘 녹는 정도))와 같은 재료로 결정돼요.<br>비용 · 기간: 후보 · 시험당 {cost} 크리스타 · {days}게임 일(동물 0마리) | `{cost}`, `{days}` | §4 ③ hERG 패치클램프 · `assays.herg` |
| `3.2.alt.liver.name` | 사람 간세포 · 간 오가노이드 독성 시험 | — | §4 ③ · `assays.liver.label` |
| `3.2.alt.liver.desc` | 보는 것: 사람 간세포와 간 오가노이드(줄기세포로 만든 미니 간)에서 간세포 손상이 생기는지 확인해요.<br>결과: 세포 생존율에 따른 독성 구간(낮음 · 보통 · 높음)을 보여 주며, 2.2 단계의 간독성 신호와 같은 재료로 결정돼요.<br>비용 · 기간: 후보 · 시험당 {cost} 크리스타 · {days}게임 일(동물 0마리) | `{cost}`, `{days}` | §4 ③ 사람 간세포 · 간 오가노이드 독성 · `assays.liver` |
| `3.2.alt.no_new_verdict` | 대체 시험은 동물을 쓰지 않으며(0마리), 새로운 판정을 따로 만들지 않아요.<br>2.2 단계의 예측 신호를 실험 값으로 굳혀서 ② 계획서의 대체 칸 근거와 '이 후보는 동물실험에서 빼자'는 결정의 근거로 써요. | — | §4 ③ · `ui.altNote` |
| `3.2.alt.saved_animals` | 대체 시험 결과를 보고 위험이 큰 후보를 동물실험에서 빼면, 그 후보에 쓰였을 마릿수만큼 '덜 쓴 동물 수({saved}마리)'가 결과판과 종료보고서에 남아요. | `{saved}` | §3 ③ · §4 ③ · `ui.saved` |
| `3.2.animal.bundle.pk` | 약동학(PK, 몸 안에서 약이 흡수 · 분포 · 배설되는 과정) — 랫드 6마리(알맞게 기준)로 경구 생체이용률 F%(먹은 약이 혈액까지 도달하는 비율) · 최고 농도 · 반감기(혈액 속 약물 농도가 절반으로 줄어드는 시간) · CNS(중추신경계) 표적일 때 뇌/혈장 비를 확인해요. | — | §4 ④ 묶음 1 · 약동학(PK) |
| `3.2.animal.bundle.efficacy` | 효력(질환 모델) — 표적별 질환 모델에서 군당 8마리씩 3군(질환 대조 · 기준 약 · 후보) 총 24마리(알맞게 기준)로 기준 약 대비 효과(%)를 확인해요. | — | §4 ④ 묶음 2 · 효력(질환 모델) |
| `3.2.animal.bundle.tox` | 반복투여 독성 28일 — 랫드 군당 10마리씩 4군(부형제(약효 성분이 없는 대조 물질) · 저 · 중 · 고) 총 40마리와 비글견 군당 3마리씩 4군 총 12마리(알맞게 기준)에서 종별 NOAEL(mg/kg/일, 독성 시험에서 부작용이 보이지 않은 가장 높은 용량)과 주요 소견(간 수치 상승 · QT 연장 등)을 확인해요. | — | §4 ④ 묶음 3 · 반복투여 독성 28일 |
| `3.2.animal.bundle.safety_pharm` | 안전성약리(심장 · 중추 · 호흡) — 국제 지침(ICH M3(R2))이 동물 수를 줄이기(감소) 위해 권하는 대로 별도 동물을 쓰지 않고 독성 시험 군에 함께 붙여서 QT 연장(심전도에서 심실이 수축했다가 회복하는 시간이 길어지는 현상) 여부와 행동 변화를 확인해요. | — | §4 ④ 묶음 4 · 안전성약리 · ICH M3(R2) |
| `3.2.animal.models` | ACHE: 스코폴라민 유도 기억 손상 생쥐 — Y-미로 자발적 교대율 회복 측정(고통등급 C · 종료시점: 체중 20% 감소)<br>EGFR: EGFR 변이 폐암 세포 이종이식 누드마우스 — 종양 성장 억제율(TGI) 측정(고통등급 D · 종료시점: 종양이 체중의 10% 초과 · 궤양)<br>DPP4: 경구 포도당 부하 시험(OGTT) 생쥐 — 혈당 곡선 면적 감소 측정(고통등급 C · 종료시점: 체중 20% 감소)<br>PTGS2: 콜라겐 유도 관절염(CIA) 랫드 — 관절 부종 · 관절염 점수 감소 측정(고통등급 D, 진통제가 효력 판정을 흐릴 수 있어 E로 갈 위험 — 토론 거리 · 종료시점: 보행 불능 · 체중 20% 감소) | — | §4 ④ 효력 모델 표 |
| `3.2.animal.run_info` | 승인된 계획서대로 특허 분자마다 4종 시험 묶음을 실행해요(후보당 적게 46 · 알맞게 82 · 많이 141마리).<br>비용은 후보당 {cost} 크리스타이고 기간은 {days}게임 일(후보끼리 동시에 진행, 현재 게임 일 {now} / {end})이에요. | `{cost}`, `{days}`, `{now}`, `{end}` | §4 ④ 비용 · 기간 · 마릿수 · `ui.runAnimal` · `ui.progress` |
| `3.2.animal.rerun` | 같은 표적 버전 · 분자 · 설계는 언제나 같은 결과가 나와요.<br>다시 돌려도 결과가 바뀌지 않고 연구비와 동물만 더 들기 때문에, 같은 설계로 재실행을 요청하면 과금 없이 옛 결과를 그대로 보여 줘요. | — | §4 ④ 결정성 · `messages.rerun` |
| `3.2.calc.intro` | 동물 독성 시험에서 구한 NOAEL(부작용이 보이지 않은 가장 높은 용량)로 HED(사람 등가 용량, 동물 용량을 사람 몸 기준으로 바꾼 값)와 MRSD(사람 첫 투여의 최대 권장 시작 용량)를 직접 계산해 봐요.<br>모든 칸이 서버 값과 맞으면 계획서와 3.3 신청서에 자동으로 붙어요. | — | §4 ④ 계산 칸 · FDA 2005 지침 · `calc.intro` |
| `3.2.calc.formula` | 1단계: 종별 HED(mg/kg) = NOAEL(mg/kg/일) ÷ 환산 계수(랫드 6.2 · 비글견 1.8)<br>2단계: 두 종 중 더 낮은 HED(가장 민감한 종)를 골라요.<br>3단계: MRSD(mg) = 더 낮은 HED(mg/kg) ÷ 안전계수({sf}, 알맞게 10 · 적게 20) × 60 kg<br>예: 비글견 NOAEL 18 mg/kg/일 → HED 10 mg/kg → 안전계수 10이면 경구 MRSD 약 60 mg('적게'여서 안전계수가 20이면 MRSD 30 mg) | `{sf}` | §4 ④ 공식 · FDA 2005 MRSD 지침 · `calc.formula` |
| `3.2.calc.fields` | HED 랫드(mg/kg) · HED 비글견(mg/kg) · 더 낮은 HED — 가장 민감한 종(mg/kg) · 경구 MRSD(mg) | — | §4 ④ · `ui.calcFields` |
| `3.2.calc.ind_note` | 3.3 단계에서 MRSD({mrsd} mg) 이하 용량을 고르면 IND(임상시험 계획 승인) 기준을 넘어요.<br>다만 IND 승인은 임상시험을 시작해도 좋다는 출발 허락일 뿐, 임상 1상 통과를 보장하지는 않아요. | `{mrsd}` | §4 ④ MRSD와 IND · `ui.mrsdChart` |
| `3.2.calc.ok` | 모든 계산 칸이 서버 값과 맞아요.<br>구한 MRSD({mrsd} mg)가 계획서와 3.3 신청서에 자동으로 반영되었어요. | `{mrsd}` | §4 ④ 계산 맞음 · `calc.ok` |
| `3.2.calc.wrong` | 틀린 칸이 있어요.<br>표시된 칸의 환산 계수(랫드 6.2 · 비글견 1.8), 더 낮은 HED 선택, 안전계수({sf}), 성인 체중(60 kg) 계산을 다시 확인해 봐요. | `{sf}` | §4 ④ 계산 틀림 · `calc.wrong` |
| `3.2.pick.metrics.pk` | 경구 생체이용률 F%(먹은 약이 혈액까지 도달하는 비율) · 최고 농도(혈중 최고 농도) · 반감기(혈중 농도가 절반으로 줄어드는 시간) · 뇌/혈장 비(혈액 대비 뇌 도달 비율, CNS 표적) | — | §4 ④ · §4 ⑤ 결과판 지표 · `ui.metrics.{f,cmax,t12,bp}` |
| `3.2.pick.metrics.efficacy_tox` | 효력 %(질환 모델에서 기준 약 대비 효과) · 종별 NOAEL(랫드 · 비글견에서 부작용이 보이지 않은 가장 높은 용량, mg/kg/일) · HED(가장 민감한 종의 사람 등가 용량) · 안전계수({sf}) · 주요 소견(간 수치 상승 · QT 연장 · 행동 변화(중추)) | `{sf}` | §4 ④ · §4 ⑤ 결과판 지표 · `ui.metrics.{eff,noaelRat,noaelDog,hed,sf,findings}` · `findings` |
| `3.2.pick.metrics.mrsd_animals` | 제형별 MRSD({form} — 경구 · 정맥 · 경피 최대 권장 시작 용량, mg) · 사용 마릿수({animals}마리) · 인도적 종료({humane}마리) · 대체 시험으로 뺌(제외한 후보는 흐린 열로 남음) | `{form}`, `{animals}`, `{humane}` | §4 ⑤ 결과판 지표 · `ui.metrics.{mrsd,animals,humane,excluded}` |
| `3.2.pick.chip.start_dose_room.label` | 시작 용량을 넉넉히 잡을 수 있어요 | — | §4 ⑤ 근거 칩 1 · `chips.labels.start_dose_room` |
| `3.2.pick.chip.start_dose_room.ok` | 맞음: 경구 MRSD({mrsd} mg)가 동물실험 후보 중 1위여서 시작 용량을 가장 넉넉히 잡을 수 있어요. | `{mrsd}` | §4 ⑤ 근거 칩 1 · `chips.startDoseOk` |
| `3.2.pick.chip.start_dose_room.warn` | 주의: 경구 MRSD({mrsd} mg)가 후보 중 1위가 아니에요.<br>시작 용량 여유가 더 큰 후보가 있는지 확인해 봐요. | `{mrsd}` | §4 ⑤ 근거 칩 1 · `chips.startDoseWarn` |
| `3.2.pick.chip.efficacy_like_ref.label` | 질환 모델에서 기준 약만큼 들어요 | — | §4 ⑤ 근거 칩 2 · `chips.labels.efficacy_like_ref` |
| `3.2.pick.chip.efficacy_like_ref.ok` | 맞음: 질환 모델 효력이 기준 약의 {pct}% 이상이에요. | `{pct}` | §4 ⑤ 근거 칩 2(80%) · `chips.efficacyOk` |
| `3.2.pick.chip.efficacy_like_ref.block` | 막음: 질환 모델 효력이 기준 약의 {pct}%에 못 미쳐요.<br>이 근거로는 주력을 고를 수 없어요. | `{pct}` | §4 ⑤ 근거 칩 2(80%) · `chips.efficacyBlock` |
| `3.2.pick.chip.no_heart.label` | 심장 소견이 없어요 | — | §4 ⑤ 근거 칩 3 · `chips.labels.no_heart` |
| `3.2.pick.chip.no_heart.ok` | 맞음: 심전도 QT 연장 소견이 없어요. | — | §4 ⑤ 근거 칩 3 · `chips.heartOk` |
| `3.2.pick.chip.no_heart.block` | 막음: 심전도 QT 연장 소견이 있어요.<br>이 근거로는 주력을 고를 수 없어요. | — | §4 ⑤ 근거 칩 3 · `chips.heartBlock` |
| `3.2.pick.chip.no_liver.label` | 간 소견이 없어요 | — | §4 ⑤ 근거 칩 4 · `chips.labels.no_liver` |
| `3.2.pick.chip.no_liver.ok` | 맞음: 간 수치 상승 소견이 없어요. | — | §4 ⑤ 근거 칩 4 · `chips.liverOk` |
| `3.2.pick.chip.no_liver.block` | 막음: 간 수치 상승 소견이 있어요.<br>이 근거로는 주력을 고를 수 없어요. | — | §4 ⑤ 근거 칩 4 · `chips.liverBlock` |
| `3.2.pick.chip.brain_reach.label` | 뇌까지 잘 가요 | — | §4 ⑤ 근거 칩 5 · `chips.labels.brain_reach` |
| `3.2.pick.chip.brain_reach.ok` | 맞음: 뇌/혈장 비가 {ratio} 이상이어서 뇌까지 잘 도달해요(CNS 표적에만 보여요). | `{ratio}` | §4 ⑤ 근거 칩 5(0.7) · `chips.brainOk` |
| `3.2.pick.chip.brain_reach.block` | 막음: 뇌/혈장 비가 {ratio} 미만이에요.<br>이 근거로는 주력을 고를 수 없어요(CNS 표적에만 보여요). | `{ratio}` | §4 ⑤ 근거 칩 5(0.7) · `chips.brainBlock` · `chips.brainNotCns` |
| `3.2.pick.lead_rule` | 주력 1개와 백업 0~1개를 지정해요.<br>주력과 백업은 모두 '유효 특허 + 동물실험 완료' 분자만 고를 수 있고, 서로 다른 분자여야 해요. | — | §3 ⑤ · §4 ⑤ 주력 · 백업 규칙 |
| `3.2.report.summary` | 동물실험 종료보고서(자동 작성)<br>모둠 합계 — 사용 마릿수 {animals}마리 · 고통등급 {grade} · 인도적 종료 발생 {humane}마리(고통등급 D 모델에서 위험이 큰 분자일수록 많이 발생해요) · 대체 시험으로 덜 쓴 동물 {saved}마리. | `{animals}`, `{grade}`, `{humane}`, `{saved}` | §4 ⑤ 동물실험 종료보고서 · `ui.reportTotal` |
| `3.2.report.reflection` | 회고 한 줄(200자 이하): 이번 전임상에서 대체 시험과 마릿수 선택으로 줄일 수 있었던 동물 수와, 다음 실험에서 바꾸고 싶은 점을 한 줄로 적어 봐요. | — | §4 ⑤ 회고(200자 이하) · `ui.reflectionGuide` |
| `3.2.common.locked` | 3.1에서 유효 특허를 먼저 받아야 계획서 실행과 대체 시험 · 동물실험이 열려요.<br>특허를 받기 전에도 ① 윤리 카드를 읽고 ② 계획서 칸을 미리 써 둘 수 있어요. | — | §4 ⑤ 선행 조건 · `messages.needPatent` · `ui.locked` |
| `3.2.common.done_condition` | 3.2 완료 조건: 승인된 계획서 + 동물실험 1건 이상 완료 + 주력 1개 지정.<br>완료하면 [3.3 제형 · IND 로] 넘어갈 수 있어요. | — | §3 ⑤ · §4 ⑤ 완료 조건 · `ui.doneWhen` |
| `3.2.board.headline` | ◆ {ticker} 전임상 완료 — {codeName} IND 준비 | `{ticker}`, `{codeName}` | §4 ⑤ 전광판 · `board.headline` |
| `3.2.board.privacy` | 사용한 동물 마릿수 · 계획서 · 실험 결과는 우리 모둠과 교사만 볼 수 있어요(교사 화면에는 윤리 토론 자료로 학급 합계가 표시돼요). | — | §4 ⑤ 전광판 공개 범위 |

- 모든 자리표시자는 기존 `PRECLINICAL_COPY` 자리표시자(`{ticker}` · `{codeName}` · `{now}` · `{end}` · `{animals}` · `{humane}` · `{saved}` · `{min}` · `{max}` · `{pct}` · `{ratio}` · `{mrsd}` · `{sf}` · `{form}` · `{model}` · `{grade}` · `{cost}` · `{days}`)만 그대로 사용했으며 새로 추가한 자리표시자는 없습니다.
- 기존 `PRECLINICAL_COPY` 에 아직 키가 따로 없던 확인 문제 정·오답 해설(`explain_ok` · `explain_wrong`), 계획서 칸별 예시 문장(`example`), 실험 수행자 칸(`section.performers.*`)을 같은 계층 규칙으로 추가했습니다.
- graft 절약 토큰: 이번 턴 약 35,399 토큰 (1회 호출)
