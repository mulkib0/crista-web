# 3.1 물질특허 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 초안(`gemini-raw.md` · `agy --mode plan`) → Claude(Opus 5.5) 검토 · 수정
- 날짜: 2026-10-24
- 상태: **초안 — 코드 반영은 8b 통합 뒤**. 키는 `PATENT_COPY`(packages/web-contract/src/patent.ts)와 대응한다(근거 칸의 `PATENT_COPY.…`).
- 표시: 근거 칸 끝 `(Claude 수정)` = Gemini 문구를 사실 · 자리표시자 · 과학 · 문체 때문에 고친 줄, `(Claude 보충)` = 범위에서 빠져 Claude 가 채운 줄. 표시 없는 줄은 Gemini 원문 그대로다. 고친 이유는 `review.md`.
- 2차 독립 검증 표시: `(검증 수정)` = 2차 검증에서 다시 고친 줄, `(검증 보충)` = 2차 검증에서 더한 줄. 이유는 `review.md` 의 '독립 검증(2차)' 절.
- 자리표시자 뒤에는 조사를 붙이지 않는다(받침을 알 수 없음 — 예: `{code}는` ✕ → `코드명이에요({code})` ○). 단 `{fee}`(늘 '…크리스타'로 끝남) · 단위가 붙는 `{max}건` · `{left}회` 는 예외.
- 칸 예시(`*.example`)는 설계 예시(SEUM · ACHE · 알츠하이머 · ○○ 빈칸)를 그대로 쓰는 고정 문구로 바꿨다 — 표적마다 바뀌는 자리표시자 예시는 표적 종류(효소 · 수용체 · 수송체)에 따라 과학적으로 틀릴 수 있다. 확인 질문은 `review.md` ⑥.
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.1.head.summary` | 2.2 에서 고른 특허 후보에 우리 코드명을 붙여요. 그다음 물질특허(새 분자 자체를 지키는 특허) 출원서(특허를 신청하는 서류)를 써요. 심사는 세 가지를 봐요. 새 물질인가, 학급에 같은 물질의 특허가 없는가, 효과 주장이 숫자와 맞는가예요. 받아들여지면 출원료를 내고 학급 특허 원장(등록된 특허를 순서대로 적은 공개 목록)에 올라가요. 유효 특허가 있어야 3.2 전임상 · 동물실험으로 갈 수 있어요. | — | §5.8 (Claude 수정) (검증 수정) |
| `3.1.head.doneWhen` | 유효하게 등록된 물질특허가 1건 이상 있으면 이 단계를 마치고 3.2 전임상 · 동물실험으로 넘어갈 수 있어요. | — | §5.8 · PATENT_COPY.doneWhen |
| `3.1.tabs.pick` | ① 출원할 후보 고르기 | — | §5.8 · PATENT_COPY.tabs.pick |
| `3.1.tabs.code` | ② 코드명 해부도 | — | §5.8 · PATENT_COPY.tabs.code |
| `3.1.tabs.doc` | ③ 출원서 쓰기 | — | §5.8 · PATENT_COPY.tabs.doc |
| `3.1.tabs.review` | ④ 심사 요청 | — | §5.8 · PATENT_COPY.tabs.review |
| `3.1.tabs.ledger` | ⑤ 원장 등재 | — | §5.8 · PATENT_COPY.tabs.ledger |
| `3.1.pick.cardGuide` | 2.2 단계에서 추린 후보 물질의 결합 점수와 ADMET(흡수 · 분포 · 대사 · 배설 · 독성) 신호를 확인하고 특허로 지킬 후보를 골라 보세요. | — | §5.8 |
| `3.1.pick.card.reason` | 2.2 근거 | — | §5.8 ① (Claude 보충) |
| `3.1.pick.card.signal` | 신호 요약 | — | §5.8 ① (Claude 보충) |
| `3.1.pick.knownChip` | 이미 알려진 물질 | — | §5.8 · 5.06 · PATENT_COPY.knownChip |
| `3.1.pick.sameAsRef` | 기준 약({ref})과 SMILES 글자가 모두 같아요. 이미 알려진 물질이라 특허를 받을 수 없어요. | `{ref}` | §5.8 · 5.06 · PATENT_COPY.sameAsRef (Claude 수정) |
| `3.1.pick.fingerprintTitle` | 구조 지문 — 기준 약과 다른 자리 찾기 | — | §5.8 · 5.06 · PATENT_COPY.fingerprintTitle |
| `3.1.pick.fingerprintNote` | SMILES(분자를 한 줄 글자로 적은 것)를 글자마다 막대로 세웠어요. 기준 약({ref})과 다른 글자만 형광으로 칠했어요. 원자 하나라도 다른 새 분자여야 특허를 받을 수 있어요. | `{ref}` | §5.8 · 5.06 · PATENT_COPY.fingerprintNote (Claude 수정) |
| `3.1.pick.legend.c` | C · c 탄소(소문자 c 는 고리 속 방향족 탄소 — 고리 전체가 전자를 고르게 나눠 가진 탄소) | — | 5.06 · PATENT_COPY.ui.legend.c (Claude 보충) |
| `3.1.pick.legend.hit` | ▼ 형광 = 기준 약과 다른 곳 | — | 5.06 · PATENT_COPY.ui.legend.hit (Claude 보충) |
| `3.1.pick.slots` | 모둠 출원 칸 {used} / {max}(받아들여짐 + 심사 중) | `{used}` · `{max}` | §5.8 · §5.8.1 · PATENT_COPY.slots (Claude 수정) |
| `3.1.pick.noCandidates` | 아직 특허를 출원할 후보 물질이 없어요. 2.2 단계에서 후보를 먼저 골라 주세요. | — | §5.8 · PATENT_COPY.noCandidates |
| `3.1.pick.openApp` | 출원서 열기 | — | §5.8 · PATENT_COPY.openApp |
| `3.1.pick.newApp` | 이 후보로 출원서 만들기 | — | §5.8 · PATENT_COPY.newApp (Claude 수정) |
| `3.1.pick.oldTarget` | 옛 표적 | — | PATENT_COPY.ui.oldTarget · PatentApplicationView.current (Claude 보충) |
| `3.1.pick.oldTargetNote` | 표적을 바꾸기 전에 만든 출원서예요. 모둠 출원 칸과 원장에는 그대로 세요. | — | PatentApplicationView.current (Claude 보충) |
| `3.1.code.head` | 코드명을 이름표 · 이음표 · 번호 세 조각으로 나눠 조각마다 뜻을 적어요. 그 아래에 기전(약이 몸속에서 일하는 방식) 한 줄을 채워요. | — | §5.8 · 5.02 · PATENT_COPY.codeHead (Claude 수정) |
| `3.1.code.piece.tick` | 이름표 — 우리 스타트업의 티커(회사를 나타내는 영문 대문자 3~4자 약자, {ticker})가 자동으로 들어가요. | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.pieces.tick |
| `3.1.code.piece.dash` | 이음표 — 이름표와 번호 사이를 잇는 붙임표(-) 한 글자예요. | — | §5.8 · 5.02 · PATENT_COPY.pieces.dash |
| `3.1.code.piece.num` | 번호 — 숫자 3자리로 후보 물질의 고유 번호를 붙여요(예: 101, 102). | — | §5.8 · 5.02 · PATENT_COPY.pieces.num |
| `3.1.code.formatLine` | 형식: 영문 대문자 3~4자 + '-' + 숫자 3자리. 받아들여지면 바꿀 수 없어요. | — | §5.8 ② · 5.02(시안의 '2~4자'는 3판 '3~4자'로) (Claude 보충) |
| `3.1.code.input.label` | 코드명 써 보기 | — | §5.8 ② · 5.02 (Claude 보충) |
| `3.1.code.target.label` | 기전 한 줄 — 무엇을(표적) | — | §5.8 · 5.02 |
| `3.1.code.target.guide` | 우리 모둠이 고른 표적의 유전자({gene})가 자동으로 들어가요. 지금 표적 버전의 표적과 같아야 해요. | `{gene}` | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.how.selective.label` | 선택적 | — | §5.8 · 5.02 · PATENT_COPY.howLabel.selective |
| `3.1.code.how.selective.desc` | 목표 표적({gene})에 주로 붙고 다른 단백질은 덜 건드려요. | `{gene}` | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.how.reversible.label` | 가역 | — | §5.8 · 5.02 · PATENT_COPY.howLabel.reversible |
| `3.1.code.how.reversible.desc` | 표적에 붙었다가 다시 떨어질 수 있어요. 비가역과 함께 고를 수 없어요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.how.irreversible.label` | 비가역 | — | §5.8 · 5.02 · PATENT_COPY.howLabel.irreversible |
| `3.1.code.how.irreversible.desc` | 보통 공유 결합(두 원자가 전자를 나눠 갖는 강한 결합)으로 표적에 붙어요. 한 번 붙으면 잘 떨어지지 않아요. 가역과 함께 고를 수 없어요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.how.competitive.label` | 경쟁적 | — | §5.8 · 5.02 · PATENT_COPY.howLabel.competitive |
| `3.1.code.how.competitive.desc` | 기질(효소가 원래 붙잡아 바꾸는 물질)이나 원래 신호 물질이 붙는 바로 그 자리를 두고 다퉈요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.action.inhibitor.label` | 억제제 | — | §5.8 · 5.02 · PATENT_COPY.actionLabel.inhibitor |
| `3.1.code.action.inhibitor.desc` | 효소나 수송체 같은 표적이 하는 일을 막거나 줄여요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.action.agonist.label` | 작용제 | — | §5.8 · 5.02 · PATENT_COPY.actionLabel.agonist |
| `3.1.code.action.agonist.desc` | 수용체에 붙어 원래 신호 물질처럼 신호를 켜요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.action.antagonist.label` | 길항제 | — | §5.8 · 5.02 · PATENT_COPY.actionLabel.antagonist |
| `3.1.code.action.antagonist.desc` | 수용체에 붙지만 신호를 켜지 않아요. 원래 신호 물질이 붙지 못하게 자리를 막아요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.action.modulator.label` | 조절제 | — | §5.8 · 5.02 · PATENT_COPY.actionLabel.modulator |
| `3.1.code.action.modulator.desc` | 표적이 일하는 세기를 높이거나 낮춰요. 원래 물질과 다른 자리에 붙는 경우가 많아요. | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.code.problem.empty` | 코드명을 입력해 주세요(예: {ticker}-101). | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.codeProblem.empty |
| `3.1.code.problem.lowercase` | 이름표에 소문자가 있어요. 영문 대문자로 써요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.lowercase (Claude 수정) |
| `3.1.code.problem.tick_chars` | 이름표에는 영문 대문자(A~Z)만 쓸 수 있어요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.tick_chars |
| `3.1.code.problem.tick_short` | 이름표가 너무 짧아요. 영문 대문자 3~4자여야 해요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.tick_short |
| `3.1.code.problem.tick_long` | 이름표가 너무 길어요. 영문 대문자 3~4자여야 해요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.tick_long |
| `3.1.code.problem.tick_mismatch` | 이름표가 우리 티커와 달라요. 앞 조각은 {ticker} 그대로 써요. | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.codeProblem.tick_mismatch (Claude 수정) |
| `3.1.code.problem.no_dash` | 이름표와 번호 사이에 이음표(-)를 넣어 주세요(예: {ticker}-101). | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.codeProblem.no_dash |
| `3.1.code.problem.many_dash` | 이음표(-)는 가운데 하나만 넣어야 해요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.many_dash |
| `3.1.code.problem.num_len` | 번호는 정확히 숫자 3자리여야 해요(예: 101). | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.num_len (검증 수정) |
| `3.1.code.problem.num_digits` | 번호에는 숫자(0~9)만 쓸 수 있어요. | — | §5.8 · 5.02 · PATENT_COPY.codeProblem.num_digits (검증 수정) |
| `3.1.code.problem.taken` | 우리 모둠이 이미 쓴 코드명이에요({code}). 다른 3자리 번호를 골라요. | `{code}` | §5.8 · 5.02 · PATENT_COPY.codeProblem.taken (Claude 수정) |
| `3.1.code.ok` | 사용할 수 있는 코드명이에요({code}). | `{code}` | §5.8 · 5.02 · PATENT_COPY.codeOk |
| `3.1.code.locked` | 특허가 받아들여져서 코드명({code})을 더 이상 바꿀 수 없어요. | `{code}` | §5.8 · 5.02 · PATENT_COPY.codeLocked |
| `3.1.code.lockedReviewing` | 심사가 진행 중이라 지금은 코드명({code})을 고칠 수 없어요. | `{code}` | §5.8 · 5.02 · PATENT_COPY.codeLockedReviewing |
| `3.1.code.llmNote` | 조각의 뜻과 기전이 표적과 맞는지는 AI 심사관이 봐요. 예를 들어 수송체 표적에 '작용제'를 고르고 이유가 없으면 보완이에요. | — | §5.8 ② (Claude 보충) |
| `3.1.code.summaryNote` | 다른 모둠과는 이름표(티커)가 달라서 코드명이 겹치지 않아요. 우리 모둠이 쓴 코드명: {codes} | `{codes}` | §5.8 ② · PATENT_COPY.ui.codeSummaryNote (Claude 보충) |
| `3.1.doc.head` | 이 출원서는 특허법 시행규칙 [별지 제15호서식] 명세서 틀을 학생용으로 줄인 거예요. 모둠원이 칸을 나눠 맡아 써요. 서버가 채운 근거 자료는 고칠 수 없는 칸으로 따로 보여요. | — | §5.8 · 5.01 (Claude 수정) (검증 수정) |
| `3.1.doc.ev.structure` | ① 구조 — 무엇을 지키나 | — | 5.01 (Claude 보충) |
| `3.1.doc.ev.target` | ② 표적 · 기전 — 어디에 쓰나 | — | 5.01 (Claude 보충) |
| `3.1.doc.ev.binding` | ③ 결합 근거 — 정말 붙는다는 숫자 | — | 5.01 (Claude 보충) |
| `3.1.doc.ev.applicant` | ④ 출원인 — 누구 것인가 | — | 5.01 (Claude 보충) |
| `3.1.doc.ev.filed` | ⑤ 출원일 — 누가 먼저인가 | — | 5.01 (Claude 보충) |
| `3.1.doc.splitNote` | 4명이 칸을 나눠 써요. 서로 다른 칸은 동시에 저장돼요. | — | §5.8 ③ · §7.4 ⑪ (Claude 보충) |
| `3.1.doc.code_tick.label` | 이름표({ticker})의 뜻 | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.sectionLabel.code_tick |
| `3.1.doc.code_tick.guide` | 우리 스타트업 티커({ticker})가 무슨 뜻인지 한 줄(2~60자)로 적어 주세요. | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.sectionGuide.code_tick |
| `3.1.doc.code_tick.example` | 예: SEUM = 세움제약 | — | §5.8 · 5.02 (Claude 수정) |
| `3.1.doc.code_num.label` | 번호를 붙인 이유 | — | §5.8 · 5.02 · PATENT_COPY.sectionLabel.code_num |
| `3.1.doc.code_num.guide` | 이 후보에 왜 이 3자리 번호를 붙였는지 한 줄(4~80자)로 적어 주세요. | — | §5.8 · 5.02 · PATENT_COPY.sectionGuide.code_num |
| `3.1.doc.code_num.example` | 102 = 1번 프로그램의 두 번째 후보예요. | — | §5.8 · 5.02 |
| `3.1.doc.mech_how.label` | 기전 — 어떻게 | — | §5.8 · 5.02 · PATENT_COPY.sectionLabel.mech_how |
| `3.1.doc.mech_how.guide` | 표적({gene})에 어떻게 결합하는지 하나 이상 골라 주세요. 가역과 비가역은 함께 고를 수 없어요. | `{gene}` | §5.8 · 5.02 · PATENT_COPY.sectionGuide.mech_how |
| `3.1.doc.mech_how.example` | 선택적 · 가역 (다른 단백질은 덜 건드리고, 붙었다 떨어질 수 있게 작동해요) | — | §5.8 · 5.02 |
| `3.1.doc.mech_action.label` | 기전 — 무엇을 하나 | — | §5.8 · 5.02 · PATENT_COPY.sectionLabel.mech_action |
| `3.1.doc.mech_action.guide` | 표적({gene})의 기능을 어떻게 바꾸는지 넷 중에서 하나를 골라 주세요. | `{gene}` | §5.8 · 5.02 · PATENT_COPY.sectionGuide.mech_action |
| `3.1.doc.mech_action.example` | 억제제 (예: AChE 효소가 하는 일을 막아요) | — | §5.8 · 5.02 (검증 수정) |
| `3.1.doc.mech_why.label` | 기전을 고른 이유 | — | §5.8 · 5.02 · PATENT_COPY.sectionLabel.mech_why |
| `3.1.doc.mech_why.guide` | 표적({gene})의 특성과 도킹 결과를 근거로 왜 위 기전을 골랐는지 한 줄(6~120자)로 적어 주세요. | `{gene}` | §5.8 · 5.02 · PATENT_COPY.sectionGuide.mech_why |
| `3.1.doc.mech_why.example` | 예: 공유 결합을 만들 반응성 부분이 없고, 도킹에서 AChE 활성 부위에 맞물려서 가역 억제제로 보았어요. | — | §5.8 · 5.02 (Claude 수정) (검증 수정) |
| `3.1.doc.title.label` | 발명의 명칭 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.title |
| `3.1.doc.title.guide` | 무엇에 관한 발명인지 드러나도록 표적({gene})과 작용을 넣어 10~60자로 적어 주세요. SMILES 원문은 쓰지 마세요. | `{gene}` | §5.8 · 5.01 · PATENT_COPY.sectionGuide.title |
| `3.1.doc.title.example` | 예: ACHE 억제 활성을 갖는 ○○ 계열 화합물 | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.field.label` | 기술분야 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.field |
| `3.1.doc.field.guide` | 이 발명이 어떤 표적({gene})과 질환({disease})에 쓰이는 기술인지 한 문장(8~160자)으로 적어 주세요. | `{gene}` · `{disease}` | §5.8 · 5.01 · PATENT_COPY.sectionGuide.field |
| `3.1.doc.field.example` | 예: 이 발명은 AChE 를 억제해 알츠하이머병을 예방하거나 치료하는 새 화합물에 관한 것이에요. | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.background.label` | 배경기술 · 해결하려는 과제 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.background |
| `3.1.doc.background.guide` | 이미 있는 기준 약({ref}, ΔG(결합 자유 에너지) {refDG})의 한계와 우리 분자로 해결하려는 과제를 2~3줄(20~400자)로 구체적으로 적어 주세요. | `{ref}` · `{refDG}` | §5.8 · 5.01 · PATENT_COPY.sectionGuide.background (검증 수정) |
| `3.1.doc.background.example` | 예: 기준 약은 ○○ 부작용이 알려져 있어요. 이 발명은 결합력을 지키면서 그 위험을 줄인 새 분자를 내놓으려 해요. | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.claimSubstance.label` | 청구항 1(물질) | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.claim1 |
| `3.1.doc.claimSubstance.guide` | 특허로 지킬 물질을 청구하는 칸이에요(15~300자). SMILES 글자를 쓰지 말고 '구조식 1'로 가리켜요. 약학적으로 허용되는 염은 약 성분을 산이나 염기와 짝지어 더 잘 녹거나 더 안정하게 만든 형태예요. | — | §5.8 · 5.01 · PATENT_COPY.sectionGuide.claim1 (Claude 수정) (검증 수정) |
| `3.1.doc.claimSubstance.example` | 구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염 | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.claimUse.label` | 청구항 2(용도) | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.claim2 |
| `3.1.doc.claimUse.guide` | 청구항 1 의 화합물을 어떤 질환({disease})에 쓸지 15~300자로 적어요. 질환이 우리 표적과 맞아야 해요. 유효성분은 약에서 실제로 효과를 내는 성분이에요. | `{disease}` | §5.8 · 5.01 · PATENT_COPY.sectionGuide.claim2 (Claude 수정) |
| `3.1.doc.claimUse.example` | 청구항 1 의 화합물을 유효성분으로 포함하는 {disease} 예방 또는 치료용 약학 조성물 | `{disease}` | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.effect.label` | 발명의 효과 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.effect |
| `3.1.doc.effect.guide` | 데이터 해석을 2~4줄(30~600자)로 적어요. 도킹 ΔG({dG})를 기준 약({refDG}) · 부모 분자({parentDG})와 견줘요. ΔG(결합 자유 에너지)는 더 낮은 음수일수록 단단히 붙는다는 뜻이에요. 2.2 ADMET 신호에서 나아진 점도 적을 수 있어요. 주장은 첨부 숫자와 맞아야 해요. | `{dG}` · `{refDG}` · `{parentDG}` | §5.8 · 5.01 · PATENT_COPY.sectionGuide.effect (Claude 수정) (검증 수정) |
| `3.1.doc.effect.example` | 예(숫자는 보기): 도킹 ΔG 가 -9.1 kcal/mol 로 기준 약(-8.7)보다 0.4 낮아요. 그래서 더 단단히 붙을 것으로 예측돼요. 부모 분자(-8.2)보다도 0.9 낮아졌어요. 도킹은 계산 예측이라 '예측돼요'로 써요. | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.summary.label` | 요약 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.summary |
| `3.1.doc.summary.guide` | 발명의 명칭과 청구항의 핵심 내용을 10~100자로 간추려 적어 주세요. | — | §5.8 · 5.01 · PATENT_COPY.sectionGuide.summary (검증 수정) |
| `3.1.doc.summary.example` | 예: AChE 를 억제하는 구조식 1 의 새 화합물과, 이를 유효성분으로 하는 알츠하이머병 치료용 약학 조성물 | — | §5.8 · 5.01 (Claude 수정) |
| `3.1.doc.inventors.label` | 발명자 | — | §5.8 · 5.01 · PATENT_COPY.sectionLabel.inventors |
| `3.1.doc.inventors.guide` | 이 후보 물질을 발굴하고 출원서를 함께 쓴 우리 모둠원을 골라 주세요. | — | §5.8 · 5.01 · PATENT_COPY.sectionGuide.inventors (일관성 수정) |
| `3.1.doc.inventors.example` | 우리 스타트업({company})에서 후보 설계와 명세서 작성에 참여한 모둠원을 선택해요. | `{company}` | §5.8 · 5.01 |
| `3.1.doc.serverFilled` | 서버가 자동으로 채운 근거 자료예요(학생이 고칠 수 없어요). | — | §5.8 · 5.01 · PATENT_COPY.serverFilled |
| `3.1.doc.facts.applicant` | 출원인 | — | §5.8 · 5.01 · PATENT_COPY.facts.applicant (Claude 수정) |
| `3.1.doc.facts.target` | 표적 · 질환 | — | §5.8 · 5.01 · PATENT_COPY.facts.target (Claude 수정) |
| `3.1.doc.facts.reference` | 기준 약 | — | §5.8 · 5.01 · PATENT_COPY.facts.reference (Claude 수정) |
| `3.1.doc.facts.structure` | 구조식 1 · 입체 포함 정규 SMILES(원자가 공간에 놓인 방향까지 적은 표준 한 줄 표기) | — | §5.8 · 5.01 · PATENT_COPY.facts.structure (Claude 수정) |
| `3.1.doc.facts.flat` | 평면 SMILES(입체 방향을 빼고 연결만 한 줄 글자로 적은 표기 — 신규성 · 학급 중복 판정 기준) | — | §5.8 · 5.01 · PATENT_COPY.facts.flat |
| `3.1.doc.facts.docking` | 도킹 ΔG(더 낮은 음수일수록 단단히 붙어요) | — | §5.8 · 5.01 · PATENT_COPY.facts.docking (Claude 수정) |
| `3.1.doc.facts.parent` | 부모 분자(고치기 전 원래 분자) ΔG | — | §5.8 · 5.01 · PATENT_COPY.facts.parent (Claude 수정) |
| `3.1.doc.facts.residues` | 상호작용 잔기(단백질 사슬 속 아미노산 하나하나) — PLIP(단백질과 분자 사이 붙는 방식을 찾는 도구) | — | §5.8 · 5.01 · PATENT_COPY.facts.residues (Claude 수정) |
| `3.1.doc.facts.admet` | 2.2 단계 ADMET(흡수 · 분포 · 대사 · 배설 · 독성) 신호 요약 | — | §5.8 · 5.01 · PATENT_COPY.facts.admet |
| `3.1.doc.facts.props` | 분자 기본 물성 | — | §5.8 · 5.01 · PATENT_COPY.facts.props |
| `3.1.doc.facts.filed` | 출원일(게임 날짜) | — | §5.8 · 5.01 · PATENT_COPY.facts.filed (Claude 수정) |
| `3.1.doc.facts.evidence` | 실시예(근거 자료 — 도킹 · ADMET 작업 번호 및 물성 기록) | — | §5.8 · 5.01 · PATENT_COPY.facts.evidence |
| `3.1.doc.problem.missing` | {label} 칸이 비어 있어요. 내용을 채워 주세요. | `{label}` | §5.8 · PATENT_COPY.sectionProblem.missing |
| `3.1.doc.problem.too_short` | {label} 칸이 너무 짧아요. {min}자 이상 적어 주세요. | `{label}` · `{min}` | §5.8 · PATENT_COPY.sectionProblem.too_short (검증 수정) |
| `3.1.doc.problem.too_long` | {label} 칸이 너무 길어요. {maxLen}자 이내로 줄여 주세요. | `{label}` · `{maxLen}` | §5.8 · PATENT_COPY.sectionProblem.too_long (검증 수정) |
| `3.1.doc.problem.bad_choice` | {label} 칸에 고를 수 없는 선택지가 들어 있어요. | `{label}` | §5.8 · PATENT_COPY.sectionProblem.bad_choice |
| `3.1.doc.problem.conflict` | 기전 '어떻게'에서 가역과 비가역은 함께 고를 수 없어요. 둘 중 하나만 골라 주세요. | — | §5.8 · 5.02 · PATENT_COPY.sectionProblem.conflict |
| `3.1.doc.save.too_long` | 글자 수가 상한({maxLen}자)을 넘어 저장할 수 없어요. 조금 줄여서 다시 저장해 주세요. | `{maxLen}` | §5.8 · PATENT_COPY.saveProblem.too_long |
| `3.1.doc.save.bad_choice` | 허용되지 않는 선택지가 들어 있어 저장할 수 없어요. | — | §5.8 · PATENT_COPY.saveProblem.bad_choice |
| `3.1.doc.save.bad_people` | 발명자에 우리 모둠원이 아닌 사람이 있어요. | — | §5.8 · PATENT_COPY.saveProblem.bad_people (Claude 수정) |
| `3.1.doc.collab.conflict` | 다른 모둠원({name})이 방금 이 칸을 먼저 고쳤어요. 지금 저장된 글을 확인한 뒤 내 글과 합쳐서 다시 저장해 주세요. | `{name}` | §5.8 · §7.4 ⑪ |
| `3.1.doc.collab.lastEditor` | 마지막 작성자: {name} | `{name}` | §5.8 · §7.4 ⑪ |
| `3.1.rule.format` | {label}: {problem} | `{label}` · `{problem}` | §5.8 · §5.11 · PATENT_COPY.rule.format |
| `3.1.rule.code_name` | 코드명 해부도에 아직 고쳐야 할 조각이 있어요. 이름표({ticker})와 3자리 번호 규칙을 확인해 주세요. | `{ticker}` | §5.8 · 5.02 · PATENT_COPY.rule.codeName |
| `3.1.rule.smiles_text` | 출원서 칸 글에 SMILES 원문을 직접 쓰면 규칙에서 막혀요. 분자 구조는 '구조식 1'로 가리켜 적어 주세요. | — | §5.8 · PATENT_COPY.rule.smilesText |
| `3.1.rule.limit` | 모둠 출원 칸({max}건)이 찼어요. 받아들여짐과 심사 중인 출원서만 세요. 등록 특허를 포기하거나 심사가 끝나길 기다려요. | `{max}` | §5.8 · §5.8.1 · PATENT_COPY.rule.limit (Claude 수정) |
| `3.1.rule.balance` | 남은 연구비({balance})가 출원료({fee})보다 적어요. 출원료는 받아들여질 때 내요. | `{balance}` · `{fee}` | §5.8 · §5.11 · PATENT_COPY.rule.balance (Claude 수정) |
| `3.1.rule.novelty` | 거절 — 이미 알려진 물질이에요(5.06 구조 지문). 평면 SMILES 가 공개 분자 목록(데이터셋) 'ChEMBL 승인약' · 'ZINC 소형'의 분자나 표적 기준 리간드(이 표적에 붙는다고 알려진 기준 분자)와 같아요. 2.1 에서 구조를 바꿔 새 분자로 내세요. | — | §5.8 · 5.06 · PATENT_COPY.rule.novelty (Claude 수정) (검증 수정) |
| `3.1.rule.duplicate` | 거절 · 이미 있음 — 학급 원장에 같은 물질(평면 SMILES 같음)의 유효 특허가 있어요({code}). 2.1 에서 변형체(구조를 조금 바꾼 분자)를 만들어 다시 와요. | `{code}` | §5.8 · 5.04 · §7.4 ⑩ · PATENT_COPY.rule.duplicate (Claude 수정) (검증 수정) |
| `3.1.rule.duplicateAtAccept` | 거절 · 이미 있음 — 받아들이는 순간 같은 물질이 먼저 등록됐어요. 출원료는 내지 않았어요. | — | §5.8 · 5.04 · §7.4 ⑩ · PATENT_COPY.rule.duplicateAtAccept (Claude 수정) |
| `3.1.rule.balanceAtAccept` | 보완 — 받아들이는 순간 남은 연구비({balance})가 출원료({fee})보다 적었어요. 연구비를 채우고 다시 심사를 요청해요. | `{balance}` · `{fee}` | §5.8 · §5.11 · PATENT_COPY.rule.balanceAtAccept (Claude 수정) |
| `3.1.rule.limitAtAccept` | 보완 — AI 심사는 통과했어요. 하지만 등록하는 순간 모둠 출원 칸({max}건)이 이미 차 있어서 등재하지 못했어요. | `{max}` | §5.8 · §5.8.1 · PATENT_COPY.rule.limitAtAccept (검증 수정) |
| `3.1.rule.oldRevisionAtAccept` | 심사 중에 표적이 바뀌어 등록하지 않았어요. 출원료는 내지 않았어요. 이 출원서는 거둘 수 있어요. | — | PATENT_COPY.rule.oldRevisionAtAccept (Claude 보충) |
| `3.1.rule.priorArtRevise` | 주의 — 다른 모둠의 유효 특허({priorCode})와 아주 비슷해요(유사도 {similarity}, 기준 0.85 이상). 유사도는 Morgan 지문(원자마다 결합 2개 거리까지의 주변 모양을 모은 지문)을 Tanimoto 값(0~1, 1이면 지문이 같음)으로 잰 거예요. 청구항과 발명의 효과 칸에 무엇이 다른지 적어요. 적지 않으면 보완이에요. | `{priorCode}` · `{similarity}` | §5.8 · §5.11 (Claude 수정) |
| `3.1.rule.priorArtSkipped` | 비슷한 선행 특허 검사(지문 유사도)는 아직 준비 중이라 건너뛰었어요. | — | §5.8 · PATENT_COPY.rule.priorArtSkipped (Claude 수정) |
| `3.1.rule.priorArtOk` | 선행 특허 통과 — 다른 모둠 유효 특허와 지문 유사도가 모두 0.85 보다 낮아요. | — | §5.8 심사 4 (검증 보충) |
| `3.1.rule.inventorNotMember` | 발명자에 우리 모둠원이 아닌 사람이 들어 있어요. 모둠원 중에서 다시 골라 주세요. | — | §5.8 · PATENT_COPY.rule.inventorNotMember (일관성 수정) |
| `3.1.rule.formatOk` | 형식 통과 — 필수 칸 · 길이 · 고르는 칸 모두 맞아요. | — | §5.8 · §5.11 · PATENT_COPY.rule.formatOk (Claude 수정) |
| `3.1.rule.noveltyOk` | 신규성 통과 — 데이터셋 승인약 · ZINC 분자 · 기준 리간드와 다른 새 물질이에요. | — | §5.8 · 5.06 · PATENT_COPY.rule.noveltyOk (Claude 수정) |
| `3.1.rule.duplicateOk` | 학급 중복 통과 — 학급 원장에 같은 물질이 없어요. | — | §5.8 · 5.04 · PATENT_COPY.rule.duplicateOk (Claude 수정) |
| `3.1.rule.limitOk` | 모둠 상한 통과 — 모둠 출원 칸 {used} / {max}건을 쓰고 있어 출원할 수 있어요. | `{used}` · `{max}` | §5.8 · §5.8.1 · PATENT_COPY.rule.limitOk (검증 수정) |
| `3.1.rule.balanceOk` | 잔액 통과 — 남은 연구비({balance})가 출원료({fee}) 이상이에요. | `{balance}` · `{fee}` | §5.8 · §5.11 · PATENT_COPY.rule.balanceOk |
| `3.1.rule.ok` | 통과 | — | §5.8 · §5.11 · PATENT_COPY.rule.ok (Claude 수정) |
| `3.1.rule.allOk` | 규칙 점검을 모두 통과했어요. 이제 심사를 요청할 수 있어요. | — | §5.8 ④ · §5.11 (Claude 보충) |
| `3.1.review.aiBadge` | AI 심사 | — | §5.11 · PATENT_COPY.aiReview |
| `3.1.review.aiNotice` | 규칙(형식 · 신규성 · 학급 중복 · 상한 · 잔액)을 서버가 먼저 판정해요. 그다음 AI 심사관(Claude)이 빠진 것과 앞뒤 안 맞는 곳을 봐요. AI 는 규칙 판정을 뒤집지 못해요. 심사는 수 초 ~ 수십 초 걸려요. 그동안 다른 칸을 써도 돼요. | — | §5.8 · §5.11 (Claude 수정) (검증 수정) |
| `3.1.review.requested_by` | {name} 님이 심사를 요청했어요. | `{name}` | §5.11 · DocReviewView.requestedByName (Claude 보충) |
| `3.1.review.precheckBtn` | 제출 전 규칙 점검 (즉시 · 무료) | — | §5.8 · PATENT_COPY.precheck |
| `3.1.review.requestBtn` | 심사 요청(무료 · 받아들여지면 출원료) | — | §5.8 · PATENT_COPY.request (Claude 수정) |
| `3.1.review.stage.rules` | 규칙 검사에서 끝났어요. AI 심사는 하지 않았어요. | — | §5.8 · §5.11 · PATENT_COPY.reviewStage.rules (Claude 수정) |
| `3.1.review.stage.cached` | 이전에 심사받은 서류 판과 내용이 같아서 저장된 심사 결과를 바로 불러왔어요. | — | §5.11 · PATENT_COPY.reviewStage.cached |
| `3.1.review.stage.queued` | 심사 중 — AI 심사관이 출원서 칸들을 읽고 있어요(수 초 ~ 수십 초). 끝나면 알림으로 알려 드려요. | — | §5.11 · PATENT_COPY.reviewStage.queued |
| `3.1.review.stage.done` | 서류 심사가 끝났어요. 아래 결과판에서 판정과 피드백을 확인해 보세요. | — | §5.11 · PATENT_COPY.reviewStage.done |
| `3.1.review.stage.retrying` | 심사 대기 — AI 심사가 밀려 다시 시도하고 있어요. 그동안에도 출원서 칸은 고칠 수 있어요. | — | §5.11 · PATENT_COPY.reviewStage.retrying (Claude 수정) (검증 수정) |
| `3.1.review.stage.teacher` | 선생님 확인을 기다려요. 선생님이 직접 보고 판정할 수 있어요. | — | §5.11 · PATENT_COPY.reviewStage.teacher (Claude 수정) |
| `3.1.review.stage.manual` | 선생님이 직접 검토하거나 이의 제기를 반영해 정정한 판정이에요(원래 심사 기록은 보존돼요). | — | §5.11 · PATENT_COPY.reviewStage.manual |
| `3.1.review.teacher_note` | 선생님 메모 — {note} | `{note}` | §5.11 ⑦ · PATENT_COPY.ui.teacherNote (Claude 보충) |
| `3.1.review.status.draft` | 초안 | — | §5.8 · PATENT_COPY.status.draft |
| `3.1.review.status.reviewing` | 심사 중 | — | §5.8 · §5.11 · PATENT_COPY.status.reviewing |
| `3.1.review.status.revise` | 보완 | — | §5.8 · §5.11 · PATENT_COPY.status.revise |
| `3.1.review.status.rejected` | 거절 | — | §5.8 · PATENT_COPY.status.rejected |
| `3.1.review.status.accepted` | 받아들여짐 | — | §5.8 · PATENT_COPY.status.accepted (Claude 수정) |
| `3.1.review.status.abandoned` | 거둠 · 포기 | — | §5.8 · PATENT_COPY.status.abandoned (Claude 수정) |
| `3.1.review.reject_reason.known` | 거절 · 이미 알려진 물질 | — | §5.8 · 5.06 · PATENT_COPY.rejectReason.known (Claude 수정) |
| `3.1.review.reject_reason.duplicate` | 거절 · 이미 있음 | — | §5.8 · 5.04 · PATENT_COPY.rejectReason.duplicate (Claude 수정) |
| `3.1.review.reject_reason.teacher` | 거절 · 선생님 판정 | — | §5.11 ⑥ · PATENT_COPY.rejectedByTeacher (Claude 보충) |
| `3.1.review.verdict.pending` | 심사 중 | — | §5.8 · §5.11 · PATENT_COPY.verdict.pending |
| `3.1.review.verdict.pass` | 받아들임 | — | §5.8 · §5.11 · PATENT_COPY.verdict.pass |
| `3.1.review.verdict.revise` | 보완 | — | §5.8 · §5.11 · PATENT_COPY.verdict.revise |
| `3.1.review.verdict.reject` | 거절 | — | §5.8 · §5.11 · PATENT_COPY.verdict.reject |
| `3.1.review.boardHead` | 특허 심사 결과판 | — | §5.8 · §5.11 |
| `3.1.review.noReview` | 아직 심사를 요청하지 않았어요. | — | PATENT_COPY.ui.noReview (Claude 보충) |
| `3.1.review.rulesHead` | 서버 규칙 검사 결과 | — | §5.8 · §5.11 |
| `3.1.review.sectionsHead` | AI 심사관의 칸별 지적 | — | §5.8 · §5.11 |
| `3.1.review.summaryHead` | AI 심사관의 종합 피드백 | — | §5.8 · §5.11 |
| `3.1.review.itemStatus.ok` | 알맞음 | — | §5.11 |
| `3.1.review.itemStatus.missing` | 빠진 내용 있음 | — | §5.11 |
| `3.1.review.itemStatus.inconsistent` | 앞뒤 안 맞음 | — | §5.11 |
| `3.1.review.itemStatus.unclear` | 분명하지 않음 | — | §5.11 (Claude 수정) |
| `3.1.review.changedAfter` | 심사 뒤 바뀜 — 심사 중이거나 심사가 끝난 뒤에 고친 칸이 있어요. 이 결과는 심사했던 글에만 해당해요. 바뀐 글로 다시 심사를 요청해 주세요. | — | §5.11 · §7.4 ⑪ · PATENT_COPY.changedAfterReview (검증 수정) |
| `3.1.review.quotaGuide` | 심사 요청은 출원서 1건당 하루 5회, 모둠 하루 15회까지예요. 오늘 남은 횟수는 {left}회예요. | `{left}` | §5.8 (Claude 수정) |
| `3.1.review.quotaExhausted` | 오늘 심사 요청 횟수를 다 썼어요. 출원서를 다듬고 다음 날 다시 요청해요. | — | §5.8 (Claude 수정) |
| `3.1.review.feeNote` | 심사 요청은 무료예요. 받아들여질 때만 출원료 {fee}를 내요. | `{fee}` | §5.8 · §5.11 · PATENT_COPY.feeNote (Claude 수정) |
| `3.1.review.appealBtn` | 선생님께 이의 제기하기 | — | §5.11 |
| `3.1.review.appealGuide` | 지적이나 판정이 첨부 사실과 다르다고 생각하면 이의를 제기해요. 선생님이 확인하고 판정을 고칠 수 있어요. 처음 심사 기록은 그대로 남아요. | — | §5.11 (Claude 수정) |
| `3.1.review.flagInjection` | 칸 글에 심사관에게 내리는 지시처럼 보이는 문장이 있어 보완이에요. 선생님께 알림이 갔어요. | — | §5.11 ④ (Claude 보충) |
| `3.1.review.nextRevise` | 보완은 지적받은 칸을 고쳐서 다시 내면 돼요. 종합 피드백이 짚은 칸 이름부터 확인해요. | — | §5.8 · §5.11 (Claude 수정) |
| `3.1.review.nextReject` | 거절된 분자로는 다시 출원할 수 없어요. 2.1 에서 변형체(구조를 조금 바꾼 분자)를 만들고 2.2 를 거쳐 3.1 로 다시 와요. | — | §5.8 · 5.04 · 5.06 (Claude 수정) (검증 수정) |
| `3.1.ledger.title` | 학급 특허 원장 | — | §5.8 · 5.04 · PATENT_COPY.ledgerTitle |
| `3.1.ledger.openBtn` | 학급 특허 원장 열기 | — | §5.8 ⑤ (Claude 보충) |
| `3.1.ledger.note` | 우리 학급에서 받아들여진 물질특허를 순서대로 모은 공개 원장이에요. 같은 물질은 먼저 받아들여진 모둠 것이에요. 출원할 특허 후보가 있으면 서둘러 출원해요. | — | §5.8 · 5.04 · PATENT_COPY.ledgerNote (Claude 수정) (검증 수정) (일관성 수정) |
| `3.1.ledger.col.seq` | 순서 | — | §5.8 · 5.04 |
| `3.1.ledger.col.patent_no` | 출원번호 | — | §5.8 · 5.04 |
| `3.1.ledger.col.applicant` | 출원인 | — | §5.8 · 5.04 |
| `3.1.ledger.col.code` | 코드명 | — | §5.8 · 5.04 |
| `3.1.ledger.col.target` | 표적 | — | §5.8 · 5.04 |
| `3.1.ledger.col.disease` | 질환 | — | §5.8 · 5.04 |
| `3.1.ledger.col.structure` | 구조식 | — | §5.8 · 5.04 |
| `3.1.ledger.col.substance` | 물질 이름 | — | §5.8 · 5.04 |
| `3.1.ledger.col.substanceNote` | 변형체는 물질 이름 대신 코드명이 보여요. | — | §5.8 ⑤ (Claude 보충) |
| `3.1.ledger.col.filed` | 출원일 | — | §5.8 · 5.04 |
| `3.1.ledger.col.status` | 상태 | — | §5.8 · 5.04 |
| `3.1.ledger.status.active` | 등록 | — | §5.8 · 5.04 · PATENT_COPY.ledgerStatus.active |
| `3.1.ledger.status.abandoned` | 포기 | — | §5.8 · 5.04 · PATENT_COPY.ledgerStatus.abandoned |
| `3.1.ledger.status.rejected` | 거절 · 이미 있음 | — | §5.8 · 5.04 · PATENT_COPY.ledgerStatus.rejected |
| `3.1.ledger.mine` | 우리 | — | §5.8 · 5.04 · PATENT_COPY.mine |
| `3.1.ledger.redRowNote` | 빨간 줄은 같은 물질이 다른 모둠 것으로 먼저 받아들여져 거절된 우리 출원서예요. 이 줄은 우리 화면에만 보여요. 다른 모둠 원장에는 등록 줄만 보여요. | — | §5.8 · 5.04 · §7.4 ⑩ (Claude 수정) (검증 수정) |
| `3.1.ledger.disclosureNote` | 등록된 특허 분자의 구조식은 학급 원장에 공개돼요. 실제 특허도 공개되기 때문이에요. 다른 후보의 SMILES · 물성 · 점수 · 출원서 본문 · 심사 결과는 우리 모둠과 선생님만 봐요. | — | §5.8 · 5.04 (Claude 수정) |
| `3.1.ledger.empty` | 아직 등록된 특허가 없어요. | — | §5.8 · 5.04 · PATENT_COPY.ledgerEmpty (Claude 수정) |
| `3.1.ledger.accepted` | 받아들여졌어요! 학급 특허 원장에 올랐어요(코드명 {code} · 출원번호 {patentNo}). 우리 학급에서 {seq}번째 특허예요. 출원료 {fee}를 냈어요. | `{code}` · `{patentNo}` · `{seq}` · `{fee}` | §5.8 · 5.04 · PATENT_COPY.accepted (Claude 수정) |
| `3.1.ledger.headline` | ◆ {ticker} 물질특허 등록 — {code} · {disease} 후보 | `{ticker}` · `{code}` · `{disease}` | §5.8 · 5.04 · PATENT_COPY.headline |
| `3.1.ledger.headlineNoDisease` | ◆ {ticker} 물질특허 등록 — {code} | `{ticker}` · `{code}` | §5.8 ⑤ · PATENT_COPY.headline(질환 없음) (Claude 보충) |
| `3.1.ledger.boardNote` | 등록 소식은 학급 전광판에 흘러요. 포기는 흐르지 않아요. | — | §5.8 ⑤ (Claude 보충) |
| `3.1.limit.guide` | 모둠 출원 칸은 받아들여짐과 심사 중을 합쳐 최대 {max}건이에요(권장 2~3건). 지금 {used} / {max}건을 쓰고 있어요. | `{used}` · `{max}` | §5.8.1 (Claude 수정) |
| `3.1.limit.classSetting` | 상한은 선생님이 1~4건 사이로 정해요. 짧은 수업은 2건을 권해요. | — | §5.8.1 (Claude 보충) |
| `3.1.limit.whyHead` | 왜 모둠당 특허는 기본 최대 3건(권장 2~3건)일까요? | — | §5.8.1 (Claude 수정) |
| `3.1.limit.why.preclinical` | 첫째, 3.2 전임상(사람에게 쓰기 전에 세포나 동물로 안전성과 효과를 확인하는 단계)에서 후보를 견주려면 2건 이상이 필요해요. 1건이면 동물실험이 '고르기'가 아니라 '확인'이 돼요. | — | §5.8.1 (Claude 수정) |
| `3.1.limit.why.industry` | 둘째, 실제로도 개발 후보 1개에 구조가 다른 백업(개발 후보가 실패할 때를 대비한 예비 후보) 1~2개를 두는 일이 흔해요. 백업을 늘릴수록 얻는 것은 줄어들어요. 가장 비용 효율적인 전략은 '적은 수의 백업'이에요(Stock & Molinoff 2002). | — | §5.8.1 (Claude 수정) (검증 수정) |
| `3.1.limit.why.threeR` | 셋째, 3R 원칙(동물실험을 대체하고, 수를 줄이고, 고통을 덜어 주는 원칙) 중 '감소' 때문이에요. 동물실험은 특허 분자마다 한 묶음이에요. 묶음 크기를 '알맞게'로 고르면 82마리예요. 그래서 3건이면 246마리, 4건이면 328마리예요. 특허 상한이 곧 동물 수 상한이에요. | — | §5.8.1 (Claude 수정) (검증 수정) |
| `3.1.limit.why.monopoly` | 넷째, 같은 물질은 선착순이에요. 상한이 크면 인기 분자를 '막아 두기'로 출원하는 전략이 생겨요. 8모둠 × 3 = 24줄이면 원장도 한눈에 읽혀요. | — | §5.8.1 (Claude 수정) |
| `3.1.limit.why.cost` | 다섯째, 3건이면 출원료가 750,000 크리스타예요. 초기 연구비 10,000,000 크리스타의 7.5%라 부담되지만 감당할 수 있어요. | — | §5.8.1 (Claude 수정) |
| `3.1.limit.why.role` | 여섯째, 4명이 출원서 3건의 칸을 나누면 1인 1건을 맡아요. 남은 1명은 해부도와 검토를 맡아요. | — | §5.8.1 (Claude 수정) |
| `3.1.limit.abandonPatentBtn` | 등록 특허 포기하기 | — | §5.8 · PATENT_COPY.abandonPatent |
| `3.1.limit.abandonConfirm` | {code} 등록 특허를 포기할까요? 모둠 출원 칸은 하나 돌아와요. 낸 출원료 {fee}는 돌려받지 못해요. 그 분자는 다른 모둠이 출원할 수 있게 돼요. | `{code}` · `{fee}` | §5.8 · PATENT_COPY.abandonConfirm (Claude 수정) |
| `3.1.limit.withdrawAppBtn` | 출원서 거두기 | — | §5.8 · PATENT_COPY.abandonApp |
| `3.1.limit.withdrawConfirm` | 이 출원서를 거둘까요? 이 후보로 새 출원서를 다시 만들 수 있어요. 같은 코드명은 다시 못 써요. | — | §5.8 · PATENT_COPY.withdrawConfirm (Claude 수정) |
| `3.1.err.patentInUse` | 이 특허는 지금 쓰는 중이라 포기할 수 없어요. 주력 · 백업 후보로 정했거나 3.2 전임상 · 동물실험 또는 3.3 제형 · IND 신청에서 쓰고 있어요. | — | §5.8 · PATENT_COPY.err.patentInUse (Claude 수정) (검증 수정) |
| `3.1.err.notAbandonable` | 지금 상태에서는 이 출원서를 포기하거나 거둘 수 없어요. 심사 중이라면 결과가 나올 때까지 기다려 주세요. | — | §5.8 · PATENT_COPY.err.notAbandonable |
| `3.1.err.noCandidate` | 2.2 에서 고른 특허 후보만 출원할 수 있어요. | — | §5.8 · PATENT_COPY.err.noCandidate (Claude 수정) |
| `3.1.err.liveExists` | 이 후보로 이미 출원서가 있어요. | — | §5.8 · PATENT_COPY.err.liveExists (Claude 수정) |
| `3.1.err.sameMolecule` | 같은 물질로 만든 출원서가 우리 모둠에 이미 있어요. | — | §5.8 · PATENT_COPY.err.sameMolecule (Claude 수정) |
| `3.1.err.noProperties` | 이 분자의 물성을 계산하지 못했어요. | — | §5.8 · PATENT_COPY.err.noProperties (Claude 수정) |
| `3.1.err.notEditable` | 지금은 이 출원서를 고칠 수 없어요. 받아들여짐 · 거절 · 거둠 상태예요. | — | §5.8 · PATENT_COPY.err.notEditable (Claude 수정) |
| `3.1.err.codeStale` | 다른 모둠원이 코드명을 먼저 바꿨어요. 지금 코드명을 확인한 뒤 다시 써요. | — | §5.8 · §7.4 ⑪ · PATENT_COPY.err.codeStale (Claude 수정) |
| `3.1.err.codeTaken` | 이미 쓴 코드명이에요({code}). | `{code}` | §5.8 · PATENT_COPY.err.codeTaken (Claude 수정) |
| `3.1.err.notReviewable` | 초안이나 보완 상태인 출원서만 심사를 요청할 수 있어요. | — | §5.8 · PATENT_COPY.err.notReviewable |
| `3.1.err.oldRevision` | 표적을 바꾸기 전에 만든 출원서라 심사를 요청할 수 없어요. 지금 표적의 특허 후보로 새 출원서를 만들어요. | — | PATENT_COPY.err.oldRevision (Claude 보충) |
| `3.1.err.docStale` | 그 사이 출원서 칸이 바뀌었어요. 바뀐 글을 확인하고 다시 요청해요. | — | §5.8 · §7.4 ⑪ · PATENT_COPY.err.docStale (Claude 수정) |
| `3.1.err.noSection` | 요청한 출원서 칸을 찾을 수 없어요. | — | §5.8 · PATENT_COPY.err.noSection |
| `3.1.prompt.toneParagraph` | 너는 중 · 고등학생에게 말한다. 존댓말 해요체로 쓰고, 한 문장에 한 생각만 담는다. 칸별 지적은 80자 이하, 종합 피드백은 300자 이하로 쓴다. 고칠 곳은 칸 키가 아니라 칸 이름(예: 발명의 효과 · 청구항 1(물질))으로 가리킨다. 전문어는 처음 쓸 때 괄호로 쉽게 푼다. 무엇이 빠졌는지 · 왜 앞뒤가 안 맞는지만 짚고, 출원서에 옮겨 쓸 정답 문장은 쓰지 않는다. 숫자는 사실 자료에 있는 값만 쓰고, 없는 숫자나 과학적으로 틀린 비유를 만들지 않는다. | — | §5.8 · §5.11 (Claude 수정) |
