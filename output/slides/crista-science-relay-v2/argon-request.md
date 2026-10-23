# 요청

기존 CRISTA 과학 원리 5장 슬라이드를 새 버전으로 업그레이드한다. 사용자는 docs/slides/2026-10-24-teacher-training.html#3 에 근거하라고 했으며 기존 파일은 절대 수정하지 말라고 했다. 현재 열린 대상은 design/crista-science-relay.html의 5장이다. 문구는 이전 요청에 따라 Gemini 4 Argon (High)인 너만 작성한다. Codex는 HTML 조판·상호작용을 구현한다.

참조 URL #3은 화면 순서상 세 번째 장이며, 내부 번호02 '기존 신약개발·생명공학 수업에서 겪던 세 가지 고민'이다. 핵심은 조사→데이터 실험, 1인조작→병렬 참여 지원, 클릭→선택 이유 설명이다. 이어지는 원리 사전의 교실 비유·지표 구분·교사 발문도 활용한다.

## 구성과 방향
주요 슬라이드는 정확히 5장 유지한다: 전체 흐름 / 질환·표적 / 화합물·물성 / 3D 도킹 / ADMET·심사.
기존 아이보리 바탕·무지개빛 유리 과학 그림·Relay체는 유지한다. 본문은 프로젝터에서 읽기 좋게 짧고 크게 만든다. 긴 내용은 각 장의 '개념 해설' 창과 발표자 노트에 담는다.

각 슬라이드가 도구 이름을 나열하는 대신 '어떤 근거를 얻고 → 학생이 무엇을 판단하는가'를 드러내게 한다. 하단에는 원래 긴 비유 대신 실제 수업에서 던질 질문을 굵게 둔다. 모둠 전원 참여를 시스템이 보장한다고 쓰지 말고 지원·권장으로 표현한다.

## 반환 형식
코드펜스 없는 JSON 하나. 도구/파일 작업 없이 제공 자료만 이용한다.
{
 "author":"Gemini 4 Argon (High)",
 "deck_title":"...",
 "ui":{"details":"개념 해설","question_label":"교사 질문","definition_label":"무슨 뜻인가","analogy_label":"교실 비유","caution_label":"읽을 때 주의","reference_label":"참조 연수 자료","close":"닫기","details_hint":"...","helpBody":"..."},
 "slides":[...]
}

slides 각 필드:
- id: 기존 00-overview,01-target,02-compounds,03-docking,04-admet-review 그대로
- nav: 목차용 4~8자 짧은 한국어
- eyebrow: 짧은 분야 (CRISTA + 분야)
- title: 질문 또는 판단 중심, 한국어 18~28자 내외
- subtitle: 45자 이내, 교사가 강조할 핵심
- panels: 정확히4개. {"title":"14자 내외","tool":"원문 도구명","body":"30~45자 내외 한 문장","highlight":"12~18자 학생이 할 판단/볼 지표","kind":"데이터|계산|AI 예측|규칙|AI 심사|학생 판단 중 하나"}
- question: 교사 발문 한 문장, 35~65자. 정답 유도가 아니라 근거·한계·대안을 묻는다.
- footnote: 55~85자 정확성/범위 한 문장. 데이터/계산/예측/교육용모의를 구분한다.
- notes: 180~260자 교사 발표자 노트. 개념 설명→질문→학생 답을 들을 포인트.
- concepts: 개념 해설 창에 넣을 3~6개 항목. 각 {"title":"개념명","definition":"80~130자 평이한 정의","analogy":"45~80자 교실 비유","caution":"45~80자 오해 방지","reference":"연수자료의 내부 슬라이드 번호"}

필수 concept 범위:
00: 왜 컴퓨터 사전탐색인지 / 데이터·계산·AI예측·교육용모의 차이 / 근거로 판단하는 협업
01: MONDO / Open Targets 연관성 / PDB와 포켓·보조인자
02: SMILES / MW·TPSA·cLogP / Ro5 vs QED / 구조 경고 / 스크리닝 농축도·위양성·위음성
03: Vina 자세 탐색 / 도킹 점수 해석 / ΔG = RT ln K_d와 상온 10배 관계 / PLIP 잔기
04: ADMET·MPNN / hERG·DILI / 규칙과 AI 서류심사 / 교육용 전임상·임상과 실제 검증의 경계

## 정확성
- 참조 자료가 과장한 설명은 강화하지 않는다. 특히 AI가 실험을 없앤다거나 도킹 점수로 실제 약효 배수를 보장하지 않는다.
- MONDO는 표준 질병 온톨로지, 연관성은 원인 확정 아님, PDB는 X선/Cryo-EM 등의 실험 구조.
- Ro5 위반 개수와 QED 0~1 지수, 구조 경고와 독성 확정을 구분한다.
- TPSA ≤90 Å²는 뇌 투과성 탐색의 경험적 기준이며 모든 분자에 대한 절대 통과 법칙이라고 하지 않는다.
- Vina는 실측 ΔG가 아니다. 상온 ΔG가 약1.36 kcal/mol 낮아질 때 이론적 K_d가10배 감소한다는 평형 관계와 Vina 점수 비교를 분리한다.
- ADMET은 예측, 전임상/임상/허가 판정은 수업용 모의이다. 실제 사람/동물 실험 또는 허가를 완료했다고 표현하지 않는다.
- Claude Opus 5.5는 서류 모순·학습채점·모의결과 설명 등에 쓰일 수 있으므로 플랫폼 전체에서 '서류심사만 한다'고 단정하지 않는다. 이 슬라이드에서는 서류심사 역할을 중심으로 설명한다.
- 직접 확인하지 않은 최신 배포 여부나 성능, 초 단위 응답 시간, 실제 비용 통계는 추가하지 않는다.

새 문구는 모든 내용이 새로 네가 정리한 완결된 한국어여야 한다. 표지나 장을 추가하지 않고 정확히5장으로 반환한다. 원문 기술의 정확성은 유지하고 수업에서의 판단 기준을 더 분명히 한다.


# 기존 5장 원문
{
  "author_model": "Gemini 4 Argon (High)",
  "slides": [
    {
      "id": "00-overview",
      "eyebrow": "CRISTA · PIPELINE OVERVIEW",
      "title": "데이터와 AI로 탐구하는 신약 개발 4단계",
      "subtitle": "질병 표적 선정부터 물성 계산, 3D 도킹, 독성·규제 심사까지 네 단계로 이어집니다.",
      "panels": [
        {
          "title": "① 질환·표적 데이터",
          "tool": "MONDO · Open Targets v4 · PDB",
          "body": "표준 질병 코드와 유전자 연관성 점수로 질환 표적을 살피고, 옹스트롬 단위로 실측된 12종 단백질 3D 실험 구조를 불러옵니다.",
          "highlight": "3D 구조 12종 · 0~1점"
        },
        {
          "title": "② 화합물·물성 계산",
          "tool": "ChEMBL · ZINC · RDKit",
          "body": "표적당 220종 화합물 라이브러리에서 SMILES 구조식을 읽어 분자량, 극성 표면적, 지용성, Ro5, QED와 구조 경고를 계산합니다.",
          "highlight": "표적당 220종 · QED 0~1"
        },
        {
          "title": "③ 3D 분자 도킹",
          "tool": "AutoDock Vina 1.2.7 · PLIP",
          "body": "단백질 포켓 안에서 분자 결합 자세와 도킹 점수(kcal/mol)를 추정하고, 아미노산 잔기와의 비공유 결합 상호작용을 프로파일링합니다.",
          "highlight": "도킹 점수 kcal/mol"
        },
        {
          "title": "④ 약동학·독성 및 심사",
          "tool": "ADMET-AI v2 · 서버 규칙 · Claude Opus 5.5",
          "body": "그래프 신경망으로 체내 흡수·독성 신호를 예측하고, 서버 규칙 엔진과 AI 심사관이 특허·동물윤리·임상 신청서의 정합성을 이중 심사합니다.",
          "highlight": "MPNN 예측 · 2단계 심사"
        }
      ],
      "analogy": "자물쇠(표적)를 찾고 열쇠 후보(화합물)를 골라 끼워 본 뒤(도킹), 안전성과 서류까지 검증하는 여정입니다.",
      "footnote": "본 파이프라인의 점수와 예측치는 수업용 컴퓨터 탐색 지표이며 실제 생체 내 약효나 임상 안전성을 확정하지 않습니다.",
      "illustration_brief": "A minimalist 16:9 scientific exhibition catalog illustration on warm ivory paper (#f1f1e9) with deep ink accents (#080b09). Four interconnected translucent glass architectural pedestals arranged from left to right: first, a folded glass protein ribbon with a glowing cofactor; second, a crystalline array of small organic molecule wireframes; third, a small ligand nestled inside a sculpted glass binding pocket with delicate dashed interaction rods; fourth, a geometric molecular graph passing through a double prism gate. Subtle thin-film iridescent rainbow refractions along the glass edges, generous whitespace, studio lighting, completely free of any text, numbers, or labels."
    },
    {
      "id": "01-target",
      "eyebrow": "CRISTA · STEP 01 · TARGET DISCOVERY",
      "title": "질병 코드와 3D 실측 단백질 표적 탐색",
      "subtitle": "표준 질병 온톨로지와 연관성 근거 점수로 표적을 고르고 실측 3D 구조를 불러옵니다.",
      "panels": [
        {
          "title": "국제 질병 표준 분류",
          "tool": "MONDO 온톨로지",
          "body": "병원과 연구소마다 다른 질병 명칭을 국제 표준 분류 코드로 통일하여 알츠하이머병이나 비소세포폐암 같은 대상 질환을 명확히 정의합니다.",
          "highlight": "MONDO_0004975 등"
        },
        {
          "title": "유전자·질병 연관성 근거",
          "tool": "Open Targets v4",
          "body": "EMBL-EBI와 제약사 컨소시엄 데이터로 유전학(GWAS), 학술 문헌, 기존 약물, 조직 발현의 4대 근거를 0~1점 점수로 제시합니다.",
          "highlight": "4대 근거 · 0~1점"
        },
        {
          "title": "원자 좌표 실측 3D 구조",
          "tool": "PDB (Protein Data Bank)",
          "body": "X선 회절이나 극저온전자현미경(Cryo-EM) 실험으로 측정한 원자별 3차원(x, y, z) 좌표를 옹스트롬 단위로 기록한 구조 지도입니다.",
          "highlight": "1 Å = 10⁻¹⁰ m"
        },
        {
          "title": "엄선된 12종 표적과 보조인자",
          "tool": "PDB 3D 구조 12종 (§6.1.1)",
          "body": "ACHE(4EY7), EGFR(1M17), MAOB(2V5Z) 등 12종 표적에 활성에 필수적인 보조인자(FAD)와 금속 이온까지 보존했습니다.",
          "highlight": "FAD · Zn²⁺ · Mg²⁺"
        }
      ],
      "analogy": "질병과 단백질의 족보로 유력한 표적을 좁히고, 실측 3D 자물쇠 모형(PDB)을 준비하는 단계입니다.",
      "footnote": "MONDO는 질병 분류 표준이고 연관성 점수는 단독 원인 확정이 아니며, PDB는 X선 회절·Cryo-EM 등 실험 구조를 포함합니다.",
      "illustration_brief": "A 16:9 scientific catalog composition on textured ivory background (#f1f1e9) with crisp charcoal linework (#080b09). At the center, a translucent sculpted glass protein structure made of alpha-helices and beta-strands rests inside a delicate three-dimensional coordinate grid marking x, y, and z axes at angstrom scale. Inside the protein's active gorge, a luminous amber FAD cofactor molecule and tiny metallic spheres representing zinc and magnesium ions are suspended in place, while four subtle radar-like evidence rings project onto the base plane. Thin-film rainbow interference highlights the glass folds, with no text or symbols."
    },
    {
      "id": "02-compounds",
      "eyebrow": "CRISTA · STEP 02 · COMPOUND & PHYSCHEM",
      "title": "화합물 라이브러리 탐색과 분자 물성 계산",
      "subtitle": "후보 분자의 SMILES 구조식을 읽어 체내 투과성, 약다움, 구조 경고를 계산합니다.",
      "panels": [
        {
          "title": "검증된 화합물 도서관",
          "tool": "ChEMBL · ZINC",
          "body": "활성 검증 약물 DB(ChEMBL)와 소형 유기화합물 DB(ZINC)를 결합해 표적당 시판약·유도체·다양성 분자 220종 라이브러리를 제공합니다.",
          "highlight": "표적당 220종 라이브러리"
        },
        {
          "title": "SMILES와 핵심 물리화학 물성",
          "tool": "RDKit (MW · TPSA · cLogP)",
          "body": "문자열 구조식(SMILES)을 읽어 세포막 통과에 중요한 분자량(MW), 극성 표면적(TPSA), 조각 기반 지용성(cLogP)을 실시간 계산합니다.",
          "highlight": "BBB 기준 TPSA ≤ 90 Å²"
        },
        {
          "title": "경구 흡수 경험칙과 약다움 지수",
          "tool": "RDKit (Ro5 · QED)",
          "body": "경구약 조건의 기준선 위반 개수를 세는 리핀스키 5규칙(Ro5)과 복합 물성을 0~1점 연속 점수로 종합한 약다움(QED)을 구분해 산출합니다.",
          "highlight": "Ro5 위반 수 vs QED 0~1"
        },
        {
          "title": "위험 화학 작용기 사전 탐지",
          "tool": "RDKit (PAINS · Brenk · SMARTS)",
          "body": "부분 그래프 매칭(SMARTS)으로 방향족 니트로기 등 비특이적 반응이나 대사 독성 우려가 있는 구조 경고 작용기 포함 여부를 찾아냅니다.",
          "highlight": "SMARTS 부분 그래프 매칭"
        }
      ],
      "analogy": "수백만 열쇠 창고에서 후보를 꺼내 무게·크기·기름기와 위험 부품을 화학 계산기로 즉시 재는 단계입니다.",
      "footnote": "QED(0~1 연속 지수)와 Ro5 위반 수는 서로 다른 지표이며, 구조 경고 탐지는 주의 신호일 뿐 실제 인체 독성 확정이 아닙니다.",
      "illustration_brief": "A 16:9 scientific catalog illustration on matte ivory (#f1f1e9) with dark ink lines (#080b09). A central small organic molecule rendered in clear blown glass and dark ball-and-stick joints floats above a geometric chemical balance plate. Around the molecule, translucent polar surface patches glow with delicate iridescent rainbow contours representing TPSA, while a semi-permeable lipid bilayer membrane arch in the background illustrates lipophilic permeation, and one peripheral functional group is encircled by a subtle crimson glass prism ring indicating a structural subgraph match. No text, letters, or numbers."
    },
    {
      "id": "03-docking",
      "eyebrow": "CRISTA · STEP 03 · 3D MOLECULAR DOCKING",
      "title": "3D 분자 도킹 탐색과 결합 상호작용 분석",
      "subtitle": "단백질 포켓 내 최적 결합 자세와 도킹 점수를 구하고 아미노산 결합을 확인합니다.",
      "panels": [
        {
          "title": "3D 포켓 내 결합 자세 탐색",
          "tool": "AutoDock Vina 1.2.7",
          "body": "단백질 활성 포켓 3D 상자 안에서 후보 분자의 위치·방향과 단일 결합 회전(Torsion)을 몬테카를로 및 국소 최적화로 탐색합니다.",
          "highlight": "Monte Carlo + 국소 최적화"
        },
        {
          "title": "도킹 점수(친화도 추정치) 해석",
          "tool": "AutoDock Vina 1.2.7 (점수 함수)",
          "body": "물리·경험적 점수 함수로 결합 친화도를 kcal/mol 단위로 추정하며, 음수 절댓값이 클수록 포켓 안에서 더 안정된 결합 자세를 뜻합니다.",
          "highlight": "예: -10.5 kcal/mol"
        },
        {
          "title": "열역학 평형 식과 10배 계단",
          "tool": "열역학 원리 · 2.1 10배 계단 (§5.6)",
          "body": "열역학 식(ΔG = RT ln K_d)상 상온에서 ΔG가 -1.36 kcal/mol 낮아질 때 이론적 해리 상수가 10배씩 감소하는 원리를 익힙니다.",
          "highlight": "ΔG = RT ln K_d"
        },
        {
          "title": "아미노산 잔기 상호작용 지도",
          "tool": "PLIP",
          "body": "도킹된 3D 좌표에서 아미노산 잔기(TRP86, SER203 등)와의 거리를 재어 수소 결합, 소수성 상호작용, π-스태킹, 염다리를 분석합니다.",
          "highlight": "TRP86 · SER203 잔기"
        }
      ],
      "analogy": "3차원 자물쇠 구멍(포켓)에 열쇠(분자)를 돌려 끼워 안정된 자세를 찾고, 어느 아미노산이 붙잡는지 확인합니다.",
      "footnote": "Vina 도킹 점수는 실측 ΔG가 아닌 결합 친화도 추정치이므로, 점수 차이만으로 실제 생체 약효 배수를 단정할 수 없습니다.",
      "illustration_brief": "A 16:9 scientific catalog close-up on warm ivory paper (#f1f1e9) with deep charcoal structural accents (#080b09). Inside a translucent glass protein binding cavity, a small ligand molecule with curved rotation arrows around its rotatable single bonds settles into a low-energy pose, accompanied by two faint ghosted alternative poses. Surrounding amino acid side chains—including an aromatic indole ring and a hydroxyl group—connect to the ligand via fine iridescent dashed rods representing hydrogen bonds, pi-stacking, and salt bridges within a subtle 3D search box wireframe. No text, letters, or numbers."
    },
    {
      "id": "04-admet-review",
      "eyebrow": "CRISTA · STEP 04 · ADMET & DUAL REVIEW",
      "title": "약동학·독성 예측과 2단계 이중 서류 심사",
      "subtitle": "체내 흡수·독성 위험 신호를 예측하고 코드 규칙과 AI 심사관이 신청서를 검증합니다.",
      "panels": [
        {
          "title": "그래프 신경망 약동학·독성 예측",
          "tool": "ADMET-AI v2 (Chemprop MPNN)",
          "body": "분자를 원자와 결합의 그래프로 보고 메시지 전달 그래프 신경망(MPNN)으로 흡수·분포·대사·배설·독성(ADMET) 지표를 예측합니다.",
          "highlight": "Chemprop MPNN 모델"
        },
        {
          "title": "주요 체내 관문과 독성 신호",
          "tool": "ADMET-AI v2 (hERG · DILI · BBB)",
          "body": "수십만 건의 실험 데이터를 학습한 모델로 심장 hERG 채널 저해 위험, 간독성(DILI), 장 흡수율, 뇌혈관장벽 투과율을 추정합니다.",
          "highlight": "hERG · DILI · 장 흡수"
        },
        {
          "title": "1단계 서버 규칙 팩트 체크",
          "tool": "서버 규칙 엔진 (§5.11)",
          "body": "시판약 여부(신규성), 모둠 간 선착순 특허 중복, 동물실험 마릿수 과다, 최대 안전 시작 용량(MRSD) 초과를 코드가 100% 판정합니다.",
          "highlight": "신규성 · 선착순 · MRSD"
        },
        {
          "title": "2단계 데이터·논리 정합성 심사",
          "tool": "Claude Opus 5.5 (3.1 · 3.2 · 3.3)",
          "body": "특허·동물윤리·식약처/FDA 심사관 역할로 서술과 데이터의 모순이나 간독성 감시 계획 누락을 찾아 보완 요구(revise) 피드백을 줍니다.",
          "highlight": "데이터-서술 정합성 · revise"
        }
      ],
      "analogy": "열쇠가 맞아도 몸에 해로우면 약이 될 수 없듯, 체내 위험을 예측하고 신청서를 규칙·AI로 이중 심사합니다.",
      "footnote": "ADMET 예측치는 컴퓨터 모델의 위험 신호 추정일 뿐 실제 임상 독성 확정이 아니며, 안전 모니터링 설계의 근거로 활용합니다.",
      "illustration_brief": "A 16:9 scientific exhibition diagram on warm ivory paper (#f1f1e9) with crisp black ink lines (#080b09). On the left, a molecular structure transforms into a glowing node-and-edge graph neural network with message-passing pulses flowing toward abstract glass silhouettes of a heart, liver, intestine, and brain barrier. On the right, two sequential architectural glass gates stand in alignment: the first gate is a precision mechanical caliper sieve checking strict numerical thresholds, and the second gate is a multi-faceted optical prism aligning data waveforms with structured document planes, shimmering with thin-film rainbow interference and zero text."
    }
  ],
  "editorial_notes": [
    "Vina 도킹 점수는 물리·경험적 점수 함수가 산출한 결합 친화도 추정치로 서술하고, 실제 실험 ΔG 및 생체 내 약효 보장과 구분함.",
    "열역학 공식(ΔG = RT ln K_d)과 상온 -1.36 kcal/mol당 해리 상수 10배 변화는 이론적 평형 관계로 분리 설명하고, 도킹 점수 차이로 실제 약효 배수를 단정하지 않도록 각주에 명시함.",
    "MONDO는 국제 질병 표준 분류 온톨로지임을 밝히고, Open Targets v4의 0~1점 점수는 4대 근거 기반 연관성 지표일 뿐 단독 원인 확정이 아님을 명시함.",
    "PDB 구조는 X선 회절과 극저온전자현미경(Cryo-EM) 등 실험적으로 규명된 3D 구조임을 밝혀 모두 X선 결정구조로 오해하지 않게 교정함.",
    "리핀스키 5규칙(Ro5 기준 위반 개수)과 약다움 지수(QED, 0~1 연속 점수)를 별개 개념으로 분리 서술함.",
    "SMARTS 구조 경고(PAINS/Brenk)와 ADMET-AI v2 예측값은 탐색 단계의 위험 신호 추정이며 실제 인체 독성 확정이 아님을 명시함.",
    "Open Targets v4, AutoDock Vina 1.2.7, ADMET-AI v2, Claude Opus 5.5 등 원문 버전 표기를 플랫폼 구성 명칭 그대로 보존함."
  ]
}

# 참조 연수 자료 발췌
[{"index": 3, "class": "slide", "number": "02", "text": ["PART 1 · 수업의 출발점", "기존 신약개발·생명공학 수업에서 겪던 세 가지 고민", "인터넷 요약 발표, 1인 독점 조작, 이유 없는 무작위 클릭을 구조적으로 해결합니다.", "요약 발표에서 데이터 실험으로", "백과사전·기사 복사 대신 분자 물성 기준을 직접 세우고 결합 에너지를 계산합니다.", "1인 조작에서 4인 병렬 실험으로", "한 명만 화면을 만지는 대신 4명이 각자 다른 후보를 동시에 실험해 비교표에 모읍니다.", "무작위 클릭에서 근거 합의로", "실제 수치와 일치하는 근거 칩을 고르고 서류 심사를 통과해야 다음 단계로 넘어갑니다.", "학생이 어떤 점수를 얻었는지보다 '왜 그 후보와 기준을 골랐는지' 설명하게 만듭니다."]}, {"index": 4, "class": "slide", "number": "03", "text": ["PART 1 · 왜 신약개발에 AI를 쓰는가", "수만 번의 실험실 시행착오를 줄이는 AI·컴퓨터 신약개발", "가망 없는 후보를 컴퓨터 계산과 AI 예측으로 먼저 걸러내고 유망 후보에 자원을 집중합니다.", "전통적 실험실 탐색의 병목", "수만 개 화합물을 일일이 합성하고 세포·동물에서 시험하느라 막대한 시간과 비용이 소모됩니다.", "컴퓨터·AI 사전 탐색 (In-silico)", "단백질 3D 결합 계산과 딥러닝 독성 예측으로 실패할 후보를 실험 전에 빠르게 걸러냅니다.", "인간 연구자의 최종 의사결정", "AI가 내놓은 예측치와 위험 신호를 바탕으로 효능·안전성·윤리의 균형을 판단합니다.", "AI 신약개발은 실험을 없애는 마법이 아니라 실패 확률을 줄여 주는 과학적 나침반입니다."]}, {"index": 5, "class": "slide", "number": "04", "text": ["PART 1 · AI 활용 탐구의 핵심 관점", "\"챗GPT에게 신약 만들어 달라고 하는 수업이 아닙니다\"", "AI는 물리·화학 계산과 위험 예측·서류 모순 점검을 맡고, 가치 판단은 학생이 내립니다.", "물리·화학 계산 (RDKit · Vina)", "분자 구조식에서 물성을 계산하고 단백질 3D 포켓 안 결합 에너지를 추정합니다.", "딥러닝 예측 (ADMET-AI)", "분자 그래프를 읽어 장 흡수율, 뇌 투과성, 심장·간 독성 위험 확률을 신호등으로 예측합니다.", "논리 심사·모의 임상 (Claude)", "학생이 작성한 특허·윤리·임상 서류가 앞선 실험 데이터와 모순되는지 검증합니다.", "AI는 정답 자판기가 아니며, 예측의 한계를 읽고 대안을 찾는 주체는 학생 연구자입니다."]}, {"index": 6, "class": "slide", "number": "05", "text": ["PART 1 · 신약개발의 큰 그림", "네 가지 질문으로 이어지는 4묶음 9단계 파이프라인", "표적 발굴부터 최종 허가까지 단계마다 연구자가 답해야 할 핵심 질문이 이어집니다.", "1묶음 · 발견 (1.1~1.2)", "\"질병의 원인 단백질은 무엇이고, 220종 중 어떤 분자부터 시험할까?\"", "2묶음 · 최적화 (2.1~2.2)", "\"단백질 주머니에 단단히 붙는가? 몸속에서 흡수되고 심장·간에 안전한가?\"", "3묶음 · 개발·규제 (3.1~3.3)", "\"특허로 지킬 수 있는가? 동물윤리(3R)를 지키며 사람 첫 용량(MRSD)을 얼마로 잡을까?\"", "4묶음 · 임상·허가 (4.1~4.2)", "\"환자 임상 1·2·3상에서 안전·약효를 입증하고 신약 허가(NDA)를 받을 수 있는가?\"", "신약개발은 우연한 발견이 아니라 상충하는 조건 사이에서 근거 있게 포기하고 선택하는 과정입니다."]}, {"index": 7, "class": "slide", "number": "06", "text": ["PART 1 · 과학적 정확성과 교육적 모델 구분", "어디까지 실제 연구 도구이고 어디부터 교육용 모델인가", "1~2단계의 실제 바이오 데이터·계산 도구와 3~4단계의 교육용 수리·모의 판정을 명확히 구분합니다.", "실제 연구용 오픈 데이터 조회", "MONDO 질병 코드, Open Targets 연관성 점수, PDB 3D 단백질 실측 좌표, ChEMBL·ZINC 분자", "실제 화학 계산·AI 독성 예측", "RDKit 물리화학 물성 계산, AutoDock Vina 3D 도킹, PLIP 결합 분석, ADMET-AI 신경망 예측", "교육용 수리 모델과 모의 심사", "전임상 동물실험(NOAEL·MRSD), 임상 1~3상 시뮬레이션, 특허·IND·NDA 심사는 수업용 모의 판정", "학생들이 컴퓨터 추정치나 교육용 모의 실험을 실제 인체 약효 확정치로 오해하지 않도록 안내합니다."]}, {"index": 10, "class": "slide", "number": "08", "text": ["PART 2 · 눈높이 과학 원리 (1/12)", "질병 원인 단백질을 어떻게 데이터로 찾는가", "국제 표준 질병 코드(MONDO)와 4대 과학 근거 점수(Open Targets)로 표적을 비교합니다.", "국제 질병 표준 코드 (MONDO)", "병원·국가마다 다르게 부르는 질병 이름을 전 세계 공통 코드로 통일한 사전입니다.", "Open Targets 4대 근거 점수 (0~1점)", "유전학(돌연변이)·논문 문헌·기존 약물·조직 발현 4가지 근거로 단백질과 질병의 관련성을 채점합니다.", "점수 해석 시 주의할 점", "연관성 점수가 0.8점으로 높다고 해서 그 유전자 하나만으로 병이 생긴다는 뜻은 아니며 종합 통계 지표입니다.", "\"범인(질병)과 용의자 단백질이 얼마나 자주 함께 목격되었는지 4가지 증거로 점수를 매긴 표입니다.\""]}, {"index": 11, "class": "slide", "number": "09", "text": ["PART 2 · 눈높이 과학 원리 (2/12)", "단백질 자물쇠의 실제 3D 사진, PDB 결정구조", "X선 회절과 극저온전자현미경으로 측정한 원자 좌표와 보조인자·금속 이온을 그대로 씁니다.", "옹스트롬(Å) 단위의 실측 3D 좌표", "단백질 원자 하나하나의 위치를 10⁻¹⁰ m(옹스트롬) 단위로 측정해 공개한 국제 데이터베이스(PDB)입니다.", "약물이 들어갈 '결합 주머니(포켓)'", "효소나 수용체 표면에 움푹 파인 활성 부위로, 우리 약 분자(열쇠)가 끼워져야 할 자물쇠 구멍입니다.", "보조인자(FAD)와 금속 이온 보존", "단백질 활성과 결합에 필수적인 보조인자(FAD)와 금속 이온(Zn²⁺, Mg²⁺) 좌표를 지우지 않고 보존했습니다.", "\"생명과학Ⅰ의 효소-기질 복합체 그림을 실제 원자 단위 3D 입체 지도로 돌려 보는 단계입니다.\""]}, {"index": 12, "class": "slide", "number": "10", "text": ["PART 2 · 눈높이 과학 원리 (3/12)", "3차원 분자를 알파벳 한 줄로 적는 '분자 바코드' SMILES", "복잡한 화학 구조식을 문자열로 표현해 컴퓨터가 즉시 물성을 계산하고 부품을 교체합니다.", "왜 알파벳 문자열(SMILES)로 적을까", "탄소(C), 질소(N), 산소(O), 고리(1), 이중결합(=)을 한 줄 텍스트로 적어야 컴퓨터가 1초에 수백 개를 읽습니다.", "RDKit 실시간 물성 계산 엔진", "학생이 SMILES 글자를 바꾸거나 변환 칩을 누르면 RDKit이 즉시 분자량과 극성·지용성을 다시 계산합니다.", "작용기 변환(리드 최적화)의 원리", "분자의 기본 뼈대(스캐폴드)는 유지하면서 끝부분 부품(작용기)만 살짝 바꿔 독성을 줄이거나 결합력을 높입니다.", "\"레고 블록으로 만든 열쇠에서 뼈대는 두고 끝부분 부품 하나만 바꿔 껴 보는 것과 같습니다.\""]}, {"index": 13, "class": "slide", "number": "11", "text": ["PART 2 · 눈높이 과학 원리 (4/12)", "'세포막 기름 커튼'을 통과하기 위한 세 가지 물성 조건", "화학Ⅰ의 극성·용해도와 생명과학Ⅰ의 인지질 이중층 개념으로 물성 지표를 설명합니다.", "분자량 (MW ≤ 500 Da) · 약의 몸집", "몸집이 너무 크면 장 세포막의 좁은 틈을 지나가지 못해 먹는 알약으로 흡수되기 어렵습니다.", "극성 표면적 (TPSA) · 물과 친한 겉면", "세포막은 기름 커튼(인지질 이중층)입니다. 물과 친한 면적이 너무 넓으면 튕겨 나가며, 특히 뇌혈관장벽(BBB)을 넘으려면 90 Å² 이하로 작아야 합니다.", "지용성 (cLogP) · 기름을 좋아하는 정도", "너무 낮으면 기름 막을 못 뚫고, 너무 높으면 피(물)에 안 녹고 지방과 간에 쌓여 독성을 일으킵니다.", "\"뇌 질환 약을 개발할 때 왜 TPSA 기준을 일반 약(140)보다 더 깐깐하게(90 이하) 잡아야 하는지 연결해 주십시오.\""]}, {"index": 14, "class": "slide", "number": "12", "text": ["PART 2 · 눈높이 과학 원리 (5/12)", "과락 체크리스트(Ro5), 종합 성적표(QED), 위험 부품(구조 경고)", "학생들이 가장 자주 헷갈리는 세 가지 약다움·안전성 지표를 명확히 구분해 줍니다.", "리핀스키 규칙 (Ro5) · 과락 개수(0~4)", "몸집·지용성·수소결합 등 먹는 약의 4대 기준 중 몇 개를 어겼는지 세는 불연속 개수입니다.", "약다움 지수 (QED) · 0~1점 종합 성적표", "실제 시판 경구약들의 물성 분포와 얼마나 닮았는지를 0.00부터 1.00까지 연속 점수로 합산한 값입니다.", "구조 경고 (PAINS · Brenk) · 위험 부품 신호", "간에서 독성 물질로 변하거나 아무 단백질에나 달라붙기 쉬운 작용기가 포함되어 있다는 사전 주의 신호입니다.", "\"구조 경고가 떴다고 무조건 버리는 것이 아니라, 2.1에서 그 부품을 고쳐 쓸 수 있는지 보는 것이 핵심입니다.\""]}, {"index": 15, "class": "slide", "number": "13", "text": ["PART 2 · 눈높이 과학 원리 (6/12)", "모래밭에서 사금을 걸러내는 체 — 농축도와 기준의 대가", "기준을 조이면 좋은 약을 놓치고(위음성), 풀면 가짜 후보에 연구비를 낭비합니다(위양성).", "아는 약 계열 농축도 (Enrichment)", "220종 중 실제로 이 표적에 듣는다고 알려진 약 계열의 비율이 내 거름망을 거친 뒤 처음보다 몇 배 진해졌는가를 뜻합니다.", "위음성 (False Negative · 너무 엄격한 기준)", "체 구멍을 너무 촘촘히 조여서 진짜 신약이 될 대어까지 탈락시켜 버리는 실수입니다.", "위양성 (False Positive · 너무 느슨한 기준)", "체 구멍을 너무 넓혀서 가망 없는 돌멩이 분자까지 통과시켜 다음 단계 도킹 예산을 낭비하는 실수입니다.", "\"완벽한 기준은 없으며, 우리 모둠이 위음성과 위양성 중 무엇을 더 감수할지 합의하는 과정입니다.\""]}, {"index": 16, "class": "slide", "number": "14", "text": ["PART 2 · 눈높이 과학 원리 (7/12)", "왜 도킹 점수(ΔG)는 마이너스(-) 숫자가 클수록 좋을까?", "단백질 주머니 안에서 분자가 가장 편안하게 안착하는 에너지 골짜기의 깊이를 계산합니다.", "AutoDock Vina의 입체 자세 탐색", "포켓 3D 공간 안에서 분자의 위치·방향과 회전 가능한 단일 결합 각도를 수천 번 바꿔 가며 끼워 봅니다.", "자유 에너지 변화 (ΔG, kcal/mol)", "공이 깊은 골짜기 바닥으로 굴러 들어갈수록 안정해지듯, 음수 절댓값이 클수록(-6.0보다 -10.0이) 단백질에 단단히 붙어 잘 빠지지 않습니다.", "수심계 눈금으로 기준 약과 비교", "숫자만 외우지 않고, 현재 시판 중인 기준 승인약(대조군)보다 우리 후보가 더 깊은 에너지를 내는지 비교합니다.", "\"도킹 점수는 컴퓨터 에너지 함수가 계산한 친화도 추정치이므로 기준 약과의 상대 비교가 중요합니다.\""]}, {"index": 17, "class": "slide", "number": "15", "text": ["PART 2 · 눈높이 과학 원리 (8/12)", "-1.36 kcal/mol마다 필요 농도가 1/10로 줄어드는 열역학 계단", "화학Ⅱ 평형 상수 식(ΔG = RT ln Kd)과 아미노산 잔기 상호작용(PLIP)으로 결합의 질을 읽습니다.", "열역학 10배 계단 (ΔG = RT ln Kd)", "상온에서 결합 에너지가 약 -1.36 kcal/mol 더 깊어질 때마다, 단백질을 붙잡는 데 필요한 약물 농도(K_d)는 10분의 1로 줄어듭니다.", "PLIP 아미노산 잔기 상호작용", "약 분자와 단백질 아미노산 사이의 수소 결합(자석), 소수성 접촉(찍찍이), π-스태킹, 염다리를 아미노산 번호 단위로 찾아냅니다.", "점수만 높고 엉뚱한 곳에 붙은 분자 가려내기", "기준 약이 붙잡는 핵심 아미노산 잔기를 우리 분자도 제대로 붙잡고 있는지 함께 확인합니다.", "\"점수 1.4점 차이는 작아 보여도 지진 규모처럼 실제 농도에서는 10배 차이를 만든다는 열역학 원리를 체감합니다.\""]}, {"index": 18, "class": "slide", "number": "16", "text": ["PART 2 · 눈높이 과학 원리 (9/12)", "AI는 분자 구조를 어떻게 읽고 독성을 예측할까?", "원자를 점(역)으로, 화학 결합을 선(선로)으로 읽는 그래프 신경망(ADMET-AI)의 원리입니다.", "분자 = 점(원자)과 선(결합)의 그래프", "바둑판 픽셀로 된 사진과 달리, 분자는 어떤 원자들이 어떤 결합으로 연결되었는지가 성질을 결정합니다.", "메시지 전달 신경망 (Chemprop MPNN)", "지하철 노선도에서 이웃 역끼리 신호를 주고받듯, 주변 원자들의 연결 패턴을 모아 분자 전체의 특성을 학습합니다.", "수십만 건의 실험 데이터로부터 확률 예측", "기존에 실험으로 밝혀진 약동학·독성 데이터를 학습해 새로운 분자의 위험 확률을 수 초 만에 추론합니다.", "\"동물이나 사람에게 투여하기 전에 AI가 분자 연결 모양만 보고 켜 주는 사전 위험 신호등입니다.\""]}, {"index": 19, "class": "slide", "number": "17", "text": ["PART 2 · 눈높이 과학 원리 (10/12)", "약 분자의 몸속 장애물 달리기와 두 가지 치명적 독성 관문", "표적에 아무리 잘 붙어도 흡수되지 않거나 심장·간을 해치면 신약이 될 수 없습니다.", "ADMET 몸속 5단계 여정", "입으로 먹어 장에서 흡수(A) → 혈액으로 표적에 분포(D) → 간에서 대사(M) → 몸 밖으로 배설(E)되며 독성(T)이 없어야 합니다.", "심장 독성 (hERG 통로 저해)", "심장 근육 세포의 칼륨 이온(K⁺) 통로를 약이 막아버리면 심장 전기 신호가 꼬여 위험한 부정맥을 일으킬 수 있습니다.", "약물 유발 간독성 (DILI)", "우리 몸 해독 공장인 간이 약을 분해하다가 독성 대사 산물에 손상되는 현상으로, 만성 질환 약일수록 엄격히 피해야 합니다.", "\"도킹 1위 분자가 심장(hERG)이나 간독성 경고를 받을 때, 효능과 안전성 중 무엇을 택할지 토론하게 됩니다.\""]}, {"index": 20, "class": "slide", "number": "18", "text": ["PART 2 · 눈높이 과학 원리 (11/12)", "동물 무해용량에서 사람 첫 시작 용량(MRSD)을 구하는 법", "체표면적 환산과 안전계수(SF) 수리 모델을 통해 동물윤리(마릿수)와 안전성의 관계를 배웁니다.", "무해용량(NOAEL)에서 인간 등가용량(HED)으로", "동물실험에서 부작용이 없던 최대 용량(NOAEL)을 종별 체표면적 환산 계수로 나누어 사람 기준 용량(HED)으로 바꿉니다.", "안전계수(SF)로 나누어 첫 용량(MRSD) 산출", "사람에게 처음 투여할 때는 혹시 모를 종간 차이를 대비해 HED를 안전계수(기본 10)로 한 번 더 나눕니다.", "동물 마릿수 축소와 안전계수 2배 딜레마", "동물 마릿수를 최소(46마리)로 줄이면 윤리적 부담은 줄지만 통계적 불확실성이 커져 안전계수가 10에서 20으로 올라가 시작 용량 한도가 절반으로 줄어듭니다.", "\"생명을 아끼기 위해 표본을 줄이면 데이터 불확실성이 커져 사람 첫 용량을 더 보수적으로 잡아야 하는 원리입니다.\""]}, {"index": 21, "class": "slide", "number": "19", "text": ["PART 2 · 눈높이 과학 원리 (12/12)", "소나기(정맥 주사) vs 가랑비(알약·패치), 그리고 임상 통계 검정력", "제형으로 독성 피크를 낮추는 원리와 환자 수가 부족할 때 임상이 보류되는 통계 원리입니다.", "투여 제형(경구·정맥·경피)과 농도 피크", "정맥 주사는 혈중 농도가 소나기처럼 치솟아 독성선을 넘기 쉽고, 경구(알약)·경피(패치)는 천천히 흡수되어 피크를 낮춥니다.", "통계적 검정력 (Statistical Power)", "동전을 3번만 던져서는 앞면이 잘 나오는 동전인지 증명할 수 없듯, 임상 참여 환자 수가 적으면 실제로 약효가 있어도 우연과 구분되지 않습니다.", "신뢰구간(95% CI)과 p-value 판정", "목표 인원을 채워 검정력 게이지를 확보한 뒤 임상을 시작해야 억울한 통계 미달 보류(p ≥ 0.05)를 피할 수 있습니다.", "\"약물 구조가 같아도 제형·용량 설계와 임상 모집 인원(검정력)에 따라 성공과 실패가 갈립니다.\""]}, {"index": 58, "class": "slide", "number": "53", "text": ["PART 5 · 현장 지도와 평가 (1/3)", "점수 게임이 되지 않게 잡아 주는 세 번의 2분 질문 타이밍", "모둠이 다음 단계로 넘어가기 직전 잠시 주목시키고 선택의 이유를 질문합니다.", "1.2 스크리닝 직후 · 거름망의 대가", "\"기준을 엄격히 잡아 통과 분자가 5개 남은 모둠과 50개 남은 모둠 중, 누가 명약을 놓쳤고 누가 도킹 예산을 더 쓸까요?\"", "2.1~2.2 후보 선정 · 1위의 함정", "\"도킹 1위지만 이미 시판 중인 약이거나 심장·간독성 경고가 뜬 후보를 어떻게 고쳐 쓰거나 대안을 찾았나요?\"", "3.2~4.1 위기 순간 · 실패의 단서", "\"동물 마릿수 축소로 안전계수가 20이 되었거나 임상 보류가 났을 때, 용량·제형·백업 중 무엇을 바꿀 건가요?\"", "선생님의 짧은 발문 하나가 단순 버튼 조작을 과학적 근거 토론으로 바꾸어 놓습니다."]}, {"index": 59, "class": "slide", "number": "54", "text": ["PART 5 · 현장 지도와 평가 (2/3)", "교실에서 자주 만나는 세 가지 막힘 상황과 지도법", "근거 차단, 연구비 부족, 서류 보완 판정을 학생의 과학적 사고를 키우는 코칭 기회로 삼습니다.", "근거 칩이 차단('막음')된 모둠", "무작정 다른 칩을 찍게 하지 않고, 차단 안내 문구와 분자의 실제 수치(TPSA, ΔG, 신호등)를 대조해 읽도록 지도합니다.", "초반 과소비로 연구비가 바닥난 모둠", "왜 사전 스크리닝과 무료 미리보기가 중요한지 짚어 준 뒤, 3단 학습 문항·연구 노트·Series A/B·실패 환급으로 복구하게 합니다.", "AI 서류 심사에서 보완이 뜬 모둠", "문장 길이가 아니라 앞 단계 실험 숫자와 서류 주장의 모순·누락을 고치게 안내하고, 필요시 교사 수동 판정으로 돕습니다.", "학생이 화면에서 멈춰 서는 순간이 바로 데이터를 다시 읽고 논리를 다듬게 할 가장 좋은 지도 시점입니다."]}]