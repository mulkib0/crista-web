# 4.2 최종 허가 — 학생용 문구 정리본

- 출처: Gemini 4 Argon High(`agy --mode plan`) 원문 [`gemini-raw.md`](gemini-raw.md) → Claude Opus 5.5 검토 · 수정([`review.md`](review.md)). 지시문 [`prompt.md`](prompt.md).
- 날짜: 2026-10-24
- 상태: **초안 — 코드 반영은 8b 통합 뒤**. `APPROVAL_COPY`(packages/web-contract/src/approval.ts)는 아직 고치지 않았다.
- 표기: 근거 칸 끝 '(Claude 수정)' = Gemini 문구를 고친 줄 · '(Claude 보충)' = 빠진 범위를 Claude 가 채운 줄 · '(검증 수정)' · '(검증 보충)' = 독립 검증(2차)에서 고치거나 채운 줄([`review.md`](review.md) '독립 검증(2차)'). 표시 없는 줄은 Gemini 원문 그대로.
- 돈 자리표시자: `{fee}` 는 기존 `confirmBody(fee)` 처럼 **단위까지 든 글**(예: '500,000 크리스타'), 나머지 돈(`{balance}` · `{initial}` · `{totalSpent}` …)도 마지막 점검에서 **단위까지 든 글**로 맞췄다(아래 '돈 자리표시자').
- 조사: 브랜드 · 이름 뒤 조사는 `이(가)` · `을(를)` · `과(와)` 꼴로 두었다(코드 반영 때 받침 함수로 바꾼다).
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `4.2.intro.stepQuestion` | 이 약을 환자에게 내놓아도 될까요? | — | `COPY.stepQuestion`, `§6.1` |
| `4.2.intro.lead` | 1.1부터 4.1까지 모은 증거를 한데 묶어 NDA(신약 허가 신청)를 내는 마지막 단계예요. 허가가 나면 우리 약을 환자에게 내놓을 수 있어요. | — | `F42`, `§5.15`, `시안 8.01` (Claude 수정) |
| `4.2.intro.doneWhen` | 서류 심사를 통과해 접수하고, 60게임 일이 지나면 품목 허가를 받아요. | — | `COPY.doneWhen`, `§6.1`, `규칙-허가` (Claude 수정) |
| `4.2.intro.costDuration` | 접수 수수료는 500,000 크리스타이고 심사 기간은 60게임 일이에요. 최종 허가는 새로운 실험이나 운에 따른 흔들림 · 점수 기준 없이, 3상 통과 · 포장 제형 일치 · 서류 통과 요건만 갖추면 확정돼요. | — | `§5.15-4`, `§6.1`, `규칙-허가` (일관성 수정) |
| `4.2.tabs.brand` | ① 브랜드 이름 | — | `COPY.tabs.brand`, `규칙-걸음` |
| `4.2.tabs.brandDesc` | 환자와 의사에게 불릴 우리 신약의 고유한 상표 이름을 지어요. | — | `§5.15-1`, `규칙-걸음` |
| `4.2.tabs.pack` | ② 포장 꾸미기 | — | `COPY.tabs.pack`, `규칙-걸음` |
| `4.2.tabs.packDesc` | 3상을 통과한 허가 제형에 맞는 용기 모양과 상자 색상, 라벨 배치를 골라요. | — | `§5.15-2`, `시안 8.06` |
| `4.2.tabs.nda` | ③ 허가 신청서 | — | `COPY.tabs.nda`, `규칙-걸음` |
| `4.2.tabs.ndaDesc` | 서버가 자동으로 묶은 전 주기 연구 증거를 확인하고, 약 라벨에 들어갈 효능과 주의사항 세 칸을 적어요. | — | `§5.15-3`, `규칙-신청서` |
| `4.2.tabs.submit` | ④ 심사 · 접수 | — | `COPY.tabs.submit`, `규칙-걸음` |
| `4.2.tabs.submitDesc` | 규칙 검사와 AI 심사로 서류를 점검한 뒤, 500,000 크리스타를 내고 최종 허가를 접수해요. | — | `§5.15-3`, `§5.15-4` |
| `4.2.tabs.result` | ⑤ 허가증 · 영수증 | — | `COPY.tabs.result`, `규칙-걸음` |
| `4.2.tabs.resultDesc` | 도장이 찍힌 품목 허가증, 완성된 신약 포장, 전 과정의 연구비 영수증과 기업가치 반응을 확인해요. | — | `F42`, `§5.15-5` (일관성 수정) |
| `4.2.intro.lockedNoPhase3` | 아직 4.1 임상 3상을 통과하지 못해 심사와 접수는 잠겨 있어요. 하지만 ① 브랜드 이름, ② 포장 꾸미기, ③ 허가 신청서 초안은 지금 미리 작성해 둘 수 있어요. | — | `COPY.lockedNoPhase3`, `규칙-걸음` |
| `4.2.intro.sidebarProgress` | 허가 심사 중 · D+{day} 허가 예정 ({progressPct}%) | `{day}`, `{progressPct}(새)` | `§5.15-4`, `규칙-상태` |
| `4.2.intro.sidebarApproved` | 품목 허가 완료 · 「{brand}」 (D+{day}) | `{brand}`, `{day}` | `§5.15-5`, `규칙-상태` |
| `4.2.intro.sidebarRevise` | 허가 신청서 · 보완 필요 | — | `규칙-상태` (Claude 보충) |
| `4.2.intro.termNda` | NDA(신약 허가 신청, New Drug Application)는 후보 물질 발견부터 임상 3상까지 모은 모든 약효 · 안전성 자료와 포장 라벨 초안을 묶어 허가 기관에 내는 공식 신청서예요. | — | `§5.15-3`, `시안 8.01` (일관성 수정) |
| `4.2.intro.termApproval` | 품목 허가(신약 판매 승인)는 허가 기관이 약의 효과가 위험보다 크다고 판단해, 그 이름으로 환자에게 처방 · 판매해도 된다고 내리는 결정이에요. 부작용이 전혀 없다는 뜻은 아니에요. | — | `F42`, `§5.15-3`, `시안 8.01` (Claude 수정) (검증 수정) |
| `4.2.brand.title` | 브랜드 이름 짓기 | — | `COPY.brand.title`, `§5.15-1` |
| `4.2.brand.lead` | 신약이 세상에 나올 때 쓸 브랜드 이름(2~12자)을 지어 주세요. 저장하는 순간 학급에서 예약돼요. 허가 전에는 우리 모둠과 선생님만 볼 수 있고, 최종 허가가 나면 학급 전광판에 공개돼요. | — | `COPY.brand.lead`, `§5.15-1`, `규칙-브랜드` (검증 수정) |
| `4.2.brand.placeholder` | 2~12자 한글 · 영문 · 숫자로 입력해 주세요 (예: 다온콕스) | — | `규칙-브랜드`, `§5.3` (일관성 수정) |
| `4.2.brand.tip1` | 표적(약물이 몸속에서 결합해 작용하는 목표 단백질)이나 적응증(약이 치료 효과를 내는 대상 질환), 또는 스타트업 이름을 조합하면 기억하기 쉬운 이름이 돼요. | — | `COPY.brand.tips`, `규칙-브랜드` (일관성 수정) |
| `4.2.brand.tip2` | '만병통치'나 '완치'처럼 약효를 부풀리거나 다른 약과 헷갈리게 하는 이름은 심사에서 보완 요구를 받아요. | — | `COPY.brand.tips`, `규칙-심사체크리스트` (Claude 수정) |
| `4.2.brand.tip3` | 2~12자 안에서 한글, 영문, 숫자를 쓸 수 있고, 낱말 사이에 빈칸을 한 칸까지 넣을 수 있어요. | — | `COPY.brand.tips`, `규칙-브랜드` |
| `4.2.brand.empty` | 브랜드 이름을 입력해 주세요. | — | `COPY.brand.empty`, `규칙-브랜드` |
| `4.2.brand.length` | 브랜드 이름은 2자 이상 12자 이하로 지어야 해요. | — | `COPY.brand.length`, `규칙-브랜드` |
| `4.2.brand.chars` | 한글, 영문, 숫자만 쓸 수 있고, 낱말 사이 빈칸은 한 칸까지만 넣을 수 있어요. | — | `COPY.brand.chars`, `규칙-브랜드` |
| `4.2.brand.digitsOnly` | 숫자로만 이루어진 이름은 브랜드 이름으로 쓸 수 없어요. 한글이나 영문을 함께 써 주세요. | — | `COPY.brand.digitsOnly`, `규칙-브랜드` |
| `4.2.brand.blocked` | 사용할 수 없는 금지어가 포함되어 있어요. 다른 브랜드 이름을 지어 주세요. | — | `COPY.brand.blocked`, `규칙-브랜드` |
| `4.2.brand.famous` | 실제로 시판 중인 유명 의약품과 같은 이름은 상표권(브랜드 이름을 독점해서 쓸 수 있는 법적 권리) 보호와 처방 혼동 방지를 위해 쓸 수 없어요. | — | `COPY.brand.famous`, `규칙-브랜드` |
| `4.2.brand.taken` | 학급에서 이미 쓰는 이름이에요. 다른 이름을 골라 주세요. | — | `COPY.brand.taken`, `규칙-브랜드` (Claude 수정) |
| `4.2.brand.codeLike` | 연구실 코드명 꼴(영문과 숫자를 붙임표로 이은 형태)은 상표 이름으로 쓸 수 없어요. 환자와 의사가 부르기 쉬운 이름을 지어 주세요. | — | `규칙-브랜드` |
| `4.2.brand.famousInside` | 이름 안에 실제 약 이름({name})이 들어 있어요. 다른 약으로 착각할 수 있으니 바꾸는 걸 권해요. | `{name}` | `COPY.brand.famousInside`, `규칙-브랜드` (Claude 수정) |
| `4.2.brand.sameAsCompany` | 스타트업 이름과 똑같아요. 그대로 써도 되지만, 약 이름은 회사 이름과 따로 짓는 경우가 많아요. | — | `COPY.brand.sameAsCompany`, `규칙-브랜드` (Claude 수정) (일관성 수정) |
| `4.2.brand.save` | 브랜드 이름 저장 | — | `COPY.brand.save`, `§5.15-1` |
| `4.2.brand.saved` | 브랜드 이름을 저장하고 학급에서 예약했어요. | — | `COPY.brand.saved`, `규칙-브랜드` |
| `4.2.brand.stale` | 다른 모둠원이 브랜드 이름을 먼저 바꿨어요. 지금 이름을 불러왔으니 확인하고 다시 저장해 주세요. | — | `§5.15-1`, `규칙-브랜드` (Claude 수정) |
| `4.2.brand.whyChange` | 개발하는 동안에는 후보 물질을 회사가 붙인 코드명으로 불러요. 환자에게 내놓을 때는 부르기 쉽고 다른 약과 헷갈리지 않는 상표명(브랜드 이름)을 붙여요. | — | `§5.15-1`, `시안 8.06` (Claude 수정) (일관성 수정) |
| `4.2.pack.title` | 신약 포장 꾸미기 | — | `COPY.pack.title`, `§5.15-2` |
| `4.2.pack.lead` | 용기 모양과 상자 색상, 라벨 배치를 골라 우리 신약의 포장을 꾸며 보세요. 포장 모양은 반드시 임상 3상을 통과한 허가 제형과 맞아야 해요. | — | `COPY.pack.lead`, `§5.15-2`, `시안 8.06` |
| `4.2.pack.shapeTablet` | 정제(알약) | — | `COPY.pack.shape.tablet`, `규칙-포장` |
| `4.2.pack.shapeTabletDesc` | 가루 약을 단단하게 뭉친 먹는 알약 형태예요. 허가 제형이 먹는 알약(경구)일 때 골라요. | — | `§5.15-2`, `규칙-포장` |
| `4.2.pack.shapeCapsule` | 캡슐 | — | `COPY.pack.shape.capsule`, `규칙-포장` |
| `4.2.pack.shapeCapsuleDesc` | 약 성분을 삼킬 수 있는 얇은 껍질(젤라틴 등)에 담은 형태예요. 허가 제형이 먹는 알약(경구)일 때 골라요. | — | `§5.15-2`, `규칙-포장` (Claude 수정) |
| `4.2.pack.shapeVial` | 바이알(주사병) | — | `COPY.pack.shape.vial`, `규칙-포장` |
| `4.2.pack.shapeVialDesc` | 주사액을 담는 작은 유리병 형태예요. 허가 제형이 정맥 주사(혈관에 직접 놓는 주사)일 때 골라요. | — | `§5.15-2`, `규칙-포장` |
| `4.2.pack.shapePatch` | 경피 패치 | — | `COPY.pack.shape.patch`, `규칙-포장` |
| `4.2.pack.shapePatchDesc` | 피부에 붙여서 약 성분이 피부를 통해 스며들게 하는 형태예요. 허가 제형이 붙이는 패치(경피)일 때 골라요. | — | `§5.15-2`, `규칙-포장` |
| `4.2.pack.colorIvory` | 아이보리 | — | `COPY.pack.color.ivory`, `규칙-포장` |
| `4.2.pack.colorSage` | 세이지 | — | `COPY.pack.color.sage`, `규칙-포장` |
| `4.2.pack.colorSand` | 샌드 | — | `COPY.pack.color.sand`, `규칙-포장` |
| `4.2.pack.colorSky` | 하늘 | — | `COPY.pack.color.sky`, `규칙-포장` |
| `4.2.pack.colorBlush` | 복숭아 | — | `COPY.pack.color.blush`, `규칙-포장` |
| `4.2.pack.colorLilac` | 라일락 | — | `COPY.pack.color.lilac`, `규칙-포장` |
| `4.2.pack.layoutTop` | 위 띠 배치 | — | `COPY.pack.layout.top`, `규칙-포장` |
| `4.2.pack.layoutCenter` | 가운데 배치 | — | `COPY.pack.layout.center`, `규칙-포장` |
| `4.2.pack.layoutBand` | 옆 띠 배치 | — | `COPY.pack.layout.band`, `규칙-포장` |
| `4.2.pack.fits` | ✓ 허가 제형({formLabel})과 알맞은 포장 모양이에요. | `{formLabel}` | `COPY.pack.fits`, `시안 8.06` |
| `4.2.pack.misfit` | ✕ {shapeLabel} 포장은 {needLabel}용이에요. 우리 약의 허가 제형({formLabel})에 맞는 포장 모양으로 바꿔 주세요. | `{shapeLabel}`, `{needLabel}`, `{formLabel}` | `COPY.pack.misfit`, `시안 8.06` |
| `4.2.pack.noForm` | 아직 정해진 허가 제형이 없어요. 포장을 미리 꾸며 볼 수 있지만, 제형이 정해진 뒤 포장 모양이 맞는지 다시 확인해요. | — | `COPY.pack.noForm`, `규칙-포장` |
| `4.2.pack.provisional` | 아직 임상 3상 통과 전이라 IND(임상시험 계획 승인 신청)에서 승인받은 제형({formLabel})으로 임시 비교하고 있어요. 3상을 통과하면 그 프로토콜(임상시험 계획서) 제형으로 다시 맞춰요. | `{formLabel}` | `COPY.pack.provisional`, `규칙-포장` (일관성 수정) |
| `4.2.pack.badShape` | 포장 용기 모양을 골라 주세요. | — | `COPY.pack.badShape`, `규칙-포장` |
| `4.2.pack.badColor` | 포장 상자 색상을 골라 주세요. | — | `COPY.pack.badColor`, `규칙-포장` |
| `4.2.pack.badLayout` | 포장 라벨 배치를 골라 주세요. | — | `COPY.pack.badLayout`, `규칙-포장` |
| `4.2.pack.save` | 포장 꾸미기 저장 | — | `COPY.pack.save`, `§5.15-2` |
| `4.2.pack.stale` | 다른 모둠원이 포장을 먼저 바꿨어요. 지금 포장을 불러왔으니 확인하고 다시 저장해 주세요. | — | `COPY.pack.stale`, `규칙-포장` (Claude 수정) |
| `4.2.pack.whyMatchForm` | 임상 3상은 정해진 제형 하나로 약의 효과와 안전성을 시험했어요. 그래서 포장도 허가받은 제형에 맞아야 투약 오류(약을 잘못 쓰는 일)를 막을 수 있어요. | — | `§5.15-2`, `시안 8.06` (Claude 수정) (검증 수정) |
| `4.2.pack.previewCaption` | 허가 전에는 학급에 코드명({code})으로만 알려져요. 이 미리보기는 우리 모둠과 선생님만 봐요. 허가가 나면 브랜드 이름이 학급 전광판에 공개되고, 포장에는 허가일이 인쇄돼요. | `{code}(새)` | `§5.15-2`, `시안 8.06` (Claude 수정) |
| `4.2.nda.title` | 허가 신청서(NDA) 작성 | — | `COPY.nda.title`, `§5.15-3` |
| `4.2.nda.lead` | 1.1부터 4.1까지의 연구 기록은 서버가 자동으로 요약해 줘요. 여러분은 라벨에 인쇄할 칸 세 개만 써요. 효능 · 효과 한 줄과 라벨 주의사항 두 칸이고, 칸마다 8~120자예요. | — | `COPY.nda.lead`, `규칙-신청서` (Claude 수정) |
| `4.2.nda.summaryTitle` | 전 주기 연구 증거 요약 (서버 자동 작성 · 오른쪽 꼬리표는 근거 단계) | — | `COPY.nda.summaryTitle`, `규칙-NDA요약` |
| `4.2.nda.rowCompany` | 회사 (3.1) — 이 신약을 개발하고 특허를 출원한 스타트업 제약회사 이름과 티커(전광판에서 회사를 나타내는 짧은 영문 기호)예요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowIndication` | 적응증 (1.1 · 3.3) — 이 신약으로 치료하려는 대상 질환이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowTarget` | 표적 (1.1) — 약물 분자가 몸속에서 달라붙어 질병 신호를 조절하는 목표 단백질이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowIngredient` | 성분 · 코드명 (2.2 · 3.1) — 분자 최적화를 거쳐 최종 선택된 신약 후보 물질의 코드명이에요. | — | `규칙-NDA요약`, `시안 8.01` (일관성 수정) |
| `4.2.nda.rowBinding` | 결합 (2.1) — 약물 분자가 표적 단백질에 달라붙는 결합 에너지({dG} kcal/mol)예요. 값이 더 낮을수록(음수가 클수록) 더 단단히 붙어요. | `{dG}` | `규칙-NDA요약`, `시안 8.01` (Claude 수정) |
| `4.2.nda.rowPatent` | 물질특허 (3.1) — 새 분자 구조를 우리 회사만 쓸 수 있도록 출원해 등록한 특허 기록이에요. | — | `규칙-NDA요약`, `시안 8.01` (검증 수정) |
| `4.2.nda.rowAltTest` | 대체 시험 (2.2 · 3.2) — 동물 대신 세포 · 컴퓨터로 먼저 본 hERG(심장 박동 리듬을 맞추는 칼륨 통로 — 약이 막으면 부정맥 위험)와 간독성 결과예요. | — | `규칙-NDA요약` (Claude 수정) |
| `4.2.nda.rowPreclinical` | 전임상 (3.2) — 동물(쥐 · 개) 시험에서 구한 NOAEL(부작용이 보이지 않은 가장 높은 용량, mg/kg/일)과 MRSD(사람 첫 투여 최대 권장 시작 용량, {mrsd} mg), 독성 소견이에요. | `{mrsd}` | `규칙-NDA요약` (Claude 수정) |
| `4.2.nda.rowInd` | IND (3.3) — 임상시험 시작 전 승인받은 초기 제형, 용량, 1차 평가지표(임상시험에서 약효를 판정하는 가장 핵심적인 기준)예요. | — | `규칙-NDA요약` |
| `4.2.nda.rowFormDose` | 제형 · 용량 (3.3 · 4.1) — 임상 3상을 통과해 허가를 신청하는 투여 형태({formLabel})와 용량({dose} mg)이에요. | `{formLabel}`, `{dose}(새)` | `규칙-NDA요약`, `시안 8.01` (Claude 수정) |
| `4.2.nda.rowClinical` | 임상 결과 (4.1) — 1 · 2 · 3상의 통과 · 보류 기록과 대조군 대비 효과 차이, p 값({pValue})이에요. p 값은 약이 효과가 없다고 가정할 때 이만큼 또는 더 큰 차이가 우연히 나올 확률이에요. 0.05보다 작으면 '통계적으로 유의하다'고 하지만, 효과가 얼마나 큰지나 안전한지를 말해 주지는 않아요. | `{pValue}(새)` | `규칙-NDA요약`, `시안 8.01` (Claude 수정) (검증 수정) (일관성 수정) |
| `4.2.nda.indicationLabel` | 효능 · 효과 한 줄 | — | `COPY.nda.sectionLabel.indication`, `규칙-신청서` |
| `4.2.nda.indicationGuide` | 우리 약의 표적 질환, 대상 환자, 임상 3상 1차 평가지표에서 확인된 효과만 정확하게 적어요. 3상에서 시험하지 않은 효과나 과장된 표현은 쓰지 않아요. | — | `COPY.nda.sectionGuide.indication`, `규칙-심사체크리스트` |
| `4.2.nda.indicationGood` | 좋은 예: "경도 알츠하이머병 환자의 인지 기능 저하를 늦춰요." — 3상 1차 평가지표({endpoint})로 확인한 효과만 써요. | `{endpoint}(새)` | `규칙-심사체크리스트` (Claude 수정) |
| `4.2.nda.indicationBad` | 나쁜 예(과장 · 근거 없음): "모든 환자의 질병을 부작용 없이 100% 완치하고 재발까지 완벽하게 막아 줍니다." | — | `§5.15-3`, `규칙-심사체크리스트` |
| `4.2.nda.caution1Label` | 라벨 주의사항 ① (위험 신호 근거) | — | `COPY.nda.sectionLabel.caution1`, `규칙-신청서` |
| `4.2.nda.caution1Guide` | 전임상 독성 소견, hERG, 간독성, 또는 임상 1상 안전성 시험에서 관찰된 실제 위험 신호나 이상사례(약 투여 뒤 나타난 바람직하지 않고 의도하지 않은 반응)를 바탕으로 주의할 점을 적어요. | — | `COPY.nda.sectionGuide.caution1`, `규칙-심사체크리스트` |
| `4.2.nda.caution1Good` | 좋은 예: "전임상과 1상에서 경미한 간 효소 상승 소견이 있었으므로 간 질환이 있는 환자는 투여 전 의사와 상의하고 정기적으로 간 기능 검사를 받으세요." | — | `규칙-심사체크리스트` |
| `4.2.nda.caution1Bad` | 나쁜 예(근거 없음): "이 약은 완벽하게 안전해서 어떤 이상사례나 부작용도 나타나지 않으니 누구나 안심하고 드세요." | — | `§5.15-3`, `규칙-심사체크리스트` |
| `4.2.nda.caution2Label` | 라벨 주의사항 ② (구체적 행동 지침) | — | `COPY.nda.sectionLabel.caution2`, `규칙-신청서` |
| `4.2.nda.caution2Guide` | 환자나 의사가 무엇을 해야 하는지(정해진 복용 · 투여 방법, 함께 피해야 할 것, 필요 검사, 이상 증상 시 병원 연락 등) 구체적인 행동 지침을 적어요. | — | `COPY.nda.sectionGuide.caution2`, `규칙-심사체크리스트` (일관성 수정) |
| `4.2.nda.caution2Good` | 좋은 예: "정해진 용량({dose} mg)과 투여 간격을 지켜 사용하고, 투여 뒤 가슴 두근거림이나 심한 어지러움이 나타나면 즉시 사용을 멈추고 병원에 연락하세요." | `{dose}(새)` | `규칙-심사체크리스트` |
| `4.2.nda.caution2Bad` | 나쁜 예(구체성 부족): "몸 상태가 이상하면 알아서 조심해서 사용하세요." | — | `규칙-심사체크리스트` |
| `4.2.nda.charLengthGuide` | 약 상자 라벨에 인쇄할 수 있도록 세 칸 모두 각각 8자 이상 120자 이하로 작성해 주세요. (현재 {len}자 / 8~120자) | `{len}(새)` | `규칙-신청서` |
| `4.2.nda.checkIndicationFits` | 심사 기준 ① 임상 근거 일치: 효능 · 효과 한 줄이 표적 질환, 대상 환자, 3상 1차 평가지표와 맞고 3상에서 보이지 않은 효과를 말하지 않는지 확인해요. | — | `규칙-심사체크리스트` (일관성 수정) |
| `4.2.nda.checkIndicationModest` | 심사 기준 ② 과장 표현 금지: '완치', '부작용 없음', '모든 환자'처럼 과학적 사실을 부풀린 과장 표현이 없는지 확인해요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkCautionGrounded` | 심사 기준 ③ 위험 신호 반영: 주의사항 두 개 중 적어도 하나가 전임상 소견, hERG, 간독성, 1상 안전성 등 실제 시험에서 나온 위험 신호에 근거하는지 봐요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkCautionActionable` | 심사 기준 ④ 구체적 행동 안내: 주의사항에 복용 · 투여 방법, 피할 것, 사전 검사, 병원 연락처럼 환자나 의사가 실천할 행동이 구체적으로 적혀 있는지 봐요. | — | `규칙-심사체크리스트` (일관성 수정) |
| `4.2.nda.checkBrandHonest` | 심사 기준 ⑤ 정직한 브랜드 이름: 브랜드 이름이 약효를 과장하거나 다른 약으로 착각하게 만들지 않는지 함께 확인해요. | — | `규칙-심사체크리스트` |
| `4.2.nda.realWorldCompare` | 실제로는 FDA(미국 식품의약국)에 NDA(21 CFR 314.50)를, 식약처(식품의약품안전처)에 품목 허가 신청을 내요. 상표명 · 제형 · 투여 경로 · 용법 · 용량 · 주의사항과 전체 임상 자료를 함께 내요. 우리 수업에서는 임상 자료 요약을 서버가 묶어 주고, 라벨 문구 세 칸만 직접 써요. | — | `§5.15-3` (Claude 수정) (검증 수정) (일관성 수정) |
| `4.2.submit.title` | 서류 심사 및 최종 허가 접수 | — | `COPY.submit.title`, `§5.15-3` |
| `4.2.submit.rulesTitle` | 규칙 검사 5항목 (모두 맞아야 AI 심사로 넘어가요) | — | `COPY.submit.rulesTitle`, `규칙-규칙검사` |
| `4.2.rule.phase3Ok` | ✓ 임상 3상 통과: 현재 신청 프로토콜로 4.1 임상 3상을 통과했어요. | — | `COPY.rule.phase3.ok`, `규칙-규칙검사` |
| `4.2.rule.phase3Fail` | ✕ 임상 3상 미통과: 같은 프로토콜로 4.1 임상 3상을 먼저 통과해야 심사 · 접수를 진행할 수 있어요. | — | `COPY.rule.phase3.fail`, `규칙-규칙검사` (일관성 수정) |
| `4.2.rule.brandOk` | ✓ 브랜드 이름 확정: 학급에서 유일하고 규칙에 맞는 브랜드 이름을 정했어요. | — | `COPY.rule.brand.ok`, `규칙-규칙검사` |
| `4.2.rule.brandFail` | ✕ 브랜드 이름 미완성: ① 브랜드 이름 걸음에서 2~12자 규칙에 맞는 이름을 저장해 주세요. | — | `COPY.rule.brand.fail`, `규칙-규칙검사` |
| `4.2.rule.packOk` | ✓ 포장 · 허가 제형 일치: 고른 포장 모양이 허가받을 제형과 정확히 맞아요. | — | `COPY.rule.pack.ok`, `규칙-규칙검사` |
| `4.2.rule.packFail` | ✕ 포장 · 허가 제형 불일치: 포장 모양이 허가 제형과 달라요. ② 포장 꾸미기에서 제형에 맞는 용기로 바꿔 주세요. | — | `COPY.rule.pack.fail`, `규칙-규칙검사` |
| `4.2.rule.packNone` | ✕ 포장 미선택: ② 포장 꾸미기 걸음에서 용기 모양과 색상, 라벨 배치를 골라 저장해 주세요. | — | `COPY.rule.pack.none`, `규칙-규칙검사` |
| `4.2.rule.sectionOk` | ✓ 신청서 3칸 작성 완료: 효능 · 효과 한 줄과 주의사항 두 칸을 모두 8~120자로 채웠어요. | — | `COPY.rule.section.ok`, `규칙-규칙검사` (일관성 수정) |
| `4.2.rule.sectionFail` | ✕ 신청서 칸 미완성: '{label}' 칸을 8자 이상 120자 이하로 작성해 주세요. | `{label}` | `COPY.rule.section.fail`, `규칙-규칙검사` |
| `4.2.rule.protocolOk` | ✓ 3상 프로토콜 일치: 신청서의 제형 · 용량이 임상 3상을 통과한 프로토콜과 같아요. | — | `COPY.rule.protocol.ok`, `규칙-규칙검사` (일관성 수정) |
| `4.2.rule.protocolFail` | ✕ 3상 프로토콜 불일치: 신청서의 제형 · 용량이 임상 3상을 통과한 프로토콜과 달라요. | — | `COPY.rule.protocol.fail`, `규칙-규칙검사` (Claude 수정) |
| `4.2.submit.reviewBtn` | 서류 심사 요청하기 | — | `COPY.submit.reviewBtn`, `§5.15-3` |
| `4.2.status.draft` | 초안 | — | `COPY.status.draft`, `규칙-상태` |
| `4.2.status.reviewing` | 심사 중 | — | `COPY.status.reviewing`, `규칙-상태` |
| `4.2.status.revise` | 보완 필요 | — | `COPY.status.revise`, `규칙-상태` |
| `4.2.status.passed` | 서류 통과 | — | `COPY.status.passed`, `규칙-상태` |
| `4.2.status.submitted` | 접수(허가 심사 중) | — | `COPY.status.submitted`, `규칙-상태` |
| `4.2.status.approved` | 허가 | — | `COPY.status.approved`, `규칙-상태` |
| `4.2.submit.aiReviewerBadge` | AI 심사 | — | `§5.11`, `규칙-서류심사` (Claude 수정) (일관성 수정) |
| `4.2.submit.aiNotice` | AI 심사관(Claude)이 신약 허가 심사관 역할로 서류를 읽어요. 규칙 검사와 AI 심사가 모두 맞아야 '서류 통과'예요. 수수료와 허가 날짜는 AI가 아니라 서버 규칙이 정해요. | — | `§5.11`, `규칙-서류심사` (Claude 보충) (검증 수정) (일관성 수정) |
| `4.2.submit.aiQueued` | AI 심사 중이에요. 잠시 기다려 주세요. | — | `규칙-서류심사`(stage queued · retrying) (Claude 보충) |
| `4.2.review.item.ok` | 맞음 | — | `규칙-서류심사`(ok) (Claude 보충) |
| `4.2.review.item.missing` | 빠짐 | — | `규칙-서류심사`(missing) (Claude 보충) |
| `4.2.review.item.inconsistent` | 앞뒤 안 맞음 | — | `규칙-서류심사`(inconsistent) (Claude 보충) |
| `4.2.review.item.unclear` | 불분명 | — | `규칙-서류심사`(unclear) (Claude 보충) |
| `4.2.review.title` | 심사 결과 | — | `COPY.ui.reviewTitle`, `규칙-서류심사` (검증 보충) |
| `4.2.review.verdictPass` | ✓ 서류 통과 — 이제 접수할 수 있어요. | — | `COPY.ui.verdict.pass`, `COPY.status.passed` (검증 보충) |
| `4.2.review.verdictRevise` | ! 보완 필요 — 표시된 칸을 고친 뒤 다시 심사를 받아요. | — | `COPY.ui.verdict.revise`, `규칙-상태` (검증 보충) |
| `4.2.review.rulesBlocked` | 규칙 검사에서 맞지 않는 줄이 있어 AI 심사 없이 '보완 필요'가 됐어요. ✕ 줄부터 고쳐 주세요. | — | `규칙-규칙검사` (검증 보충) |
| `4.2.review.feedbackTitle` | AI 심사관의 종합 피드백 | — | `§5.11`, `규칙-서류심사` (검증 보충) (일관성 수정) |
| `4.2.review.fixLabel` | 고칠 것 | — | `COPY.ui.srFix` (검증 보충) |
| `4.2.submit.teacherWaiting` | AI 심사가 아직 끝나지 않아 선생님 확인을 기다리고 있어요. 선생님이 서류를 보고 직접 판정해 줄 거예요. | — | `§5.11`, `규칙-서류심사` (Claude 수정) |
| `4.2.submit.teacherDecided` | 선생님이 직접 판정했어요. 메모: {teacherNote} | `{teacherNote}(새)` | `규칙-서류심사`(stage manual) (Claude 보충) |
| `4.2.submit.changedAfterReview` | 심사한 뒤 브랜드, 포장 또는 신청서 내용이 바뀌어 다시 초안 상태가 되었어요. 바뀐 내용으로 서류 심사를 다시 받아 주세요. | — | `§5.11`, `규칙-상태` |
| `4.2.submit.dailyLimit` | 서류 심사는 서류 1건당 하루 5번, 모둠 전체로는 하루 15번까지 요청할 수 있어요. (오늘 남은 횟수: 이 서류 {docLeft}번 · 모둠 {teamLeft}번) | `{docLeft}(새)`, `{teamLeft}(새)` | `§5.11`, `규칙-서류심사` |
| `4.2.submit.submitBtn` | 최종 허가 접수하기 ({fee}) | `{fee}` | `COPY.submit.submitBtn`, `§5.15-4` (Claude 수정) |
| `4.2.submit.confirmTitle` | 최종 품목 허가를 접수할까요? | — | `COPY.submit.confirmTitle`, `§5.15-4` |
| `4.2.submit.confirmBody` | 수수료 {fee}를 내요. {days}게임 일 뒤에 허가가 나요. 접수하면 브랜드 · 포장 · 신청서를 더 고칠 수 없어요. | `{fee}`, `{days}` | `COPY.submit.confirmBody`, `§5.15-4`, `규칙-허가` (Claude 수정) (일관성 수정) |
| `4.2.submit.needPass` | 규칙 검사와 AI 심사를 모두 통과해 '서류 통과' 상태가 되어야 접수할 수 있어요. | — | `COPY.submit.needPass`, `규칙-상태` |
| `4.2.submit.insufficientFunds` | 남은 연구비({balance})로는 접수 수수료 {fee}를 낼 수 없어요. | `{balance}(새)`, `{fee}` | `§5.15-4`, `규칙-허가` (Claude 수정) (일관성 수정) |
| `4.2.submit.submitted` | 최종 허가 신청서가 접수되었어요! {days}게임 일 뒤인 D+{day}에 최종 품목 허가가 나요. | `{days}`, `{day}` | `COPY.submit.submitted`, `§5.15-4` (검증 수정) |
| `4.2.submit.already` | 이미 접수했어요. 모둠원 여러 명이 동시에 눌러도 수수료는 한 번만 나가요. | — | `COPY.submit.already`, `규칙-상태` (Claude 수정) |
| `4.2.submit.progress` | 최종 허가 심사 진행률 {progressPct}% · {elapsed}/{days}게임 일 경과 (D+{day} 허가 예정) | `{progressPct}(새)`, `{elapsed}(새)`, `{days}`, `{day}` | `§5.15-4`, `규칙-상태` |
| `4.2.submit.protocolReset` | 4.1에서 임상 3상 프로토콜(재도전 · 용량 변경)이 바뀌어 신청서의 제형 · 용량도 새 프로토콜을 따라가며 초안 상태로 돌아왔어요. | — | `규칙-상태` (일관성 수정) |
| `4.2.cert.title` | 품목 허가증 | — | `COPY.result.certTitle`, `시안 8.01` |
| `4.2.cert.kind` | 신약 품목 허가 | — | `COPY.result.certKind`, `시안 8.01` |
| `4.2.cert.top` | 품목 허가증 · 신약 허가 신청(NDA) 승인 | — | `COPY.result.certTop`, `시안 8.01` (Claude 수정) |
| `4.2.cert.stampTop` | NDA 승인 | — | `COPY.result.stampTop`, `COPY.result.stampWord`, `시안 8.01` (Claude 수정) |
| `4.2.cert.stampWord` | 허가 | — | `COPY.result.stampWord`, `시안 8.01` (Claude 보충) |
| `4.2.cert.stampDay` | D+{day} | `{day}` | `시안 8.01` (Claude 보충) |
| `4.2.cert.numberDate` | 허가 번호 {certNo} · 허가일 D+{day} | `{certNo}(새)`, `{day}` | `규칙-허가증`, `시안 8.01` (Claude 수정) |
| `4.2.cert.rowBrand` | 브랜드 이름 — 「{brand}」 | `{brand}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowCode` | 성분(코드명) — {code} | `{code}(새)` | `§5.15-5`, `규칙-허가증` (Claude 수정) |
| `4.2.cert.rowCompany` | 회사 — {company} ({ticker}) | `{company}(새)`, `{ticker}` | `규칙-허가증`, `시안 8.01` (Claude 보충) |
| `4.2.cert.rowForm` | 허가 제형 — {formLabel} | `{formLabel}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowDose` | 허가 용량 — {dose} mg | `{dose}(새)` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowIndication` | 적응증 — {indication} | `{indication}(새)` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowApprovedDay` | 허가 게임 일 — D+{day} | `{day}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowFinalReview` | 최종 심사 (4.2) — 서류 심사 60게임 일 완료 · 새 판정 없음 | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.cert.rowMarketReaction` | 시장 반응 기본값 (4.2) — 기업가치(회사의 전체 가치를 금액이나 지수로 나타낸 것) ▲ {pct}% (기본 12% × 제형 배율, 최대 20%) | `{pct}(새)` | `§5.3`, `규칙-NDA요약`, `규칙-허가증` |
| `4.2.cert.evidenceNote` | 오른쪽 무지개 꼬리표는 그 줄의 증거가 나온 단계(1.1~4.2)를 뜻해요. 최종 허가 도장 하나는 새로운 실험이 아니라 지금까지 모은 모든 증거를 한 장으로 묶은 결과예요. | — | `COPY.result.evidenceNote`, `시안 8.01` |
| `4.2.cert.spentAndMolecules` | 허가일 D+{day} · 쓴 연구비 {totalSpent} / 처음 {initial} · 분자 {initialMolecules} → 1 | `{day}`, `{totalSpent}(새)`, `{initial}(새)`, `{initialMolecules}(새)` | `규칙-영수증`, `시안 8.01` (Claude 수정) (일관성 수정) |
| `4.2.cert.print` | 허가증 인쇄 | — | `COPY.result.print`, `시안 8.01` |
| `4.2.cert.savePng` | 이미지로 저장 | — | `COPY.result.savePng`, `시안 8.01` |
| `4.2.cert.complete` | 신약 개발 파이프라인 완주를 축하해요! | — | `COPY.result.complete`, `F42` |
| `4.2.cert.completeLead` | 1.1 표적 선정부터 4.2 허가까지 모든 관문을 넘었어요. 우리 신약 「{brand}」이(가) 환자에게 갈 수 있게 됐어요. | `{brand}` | `COPY.result.completeLead`, `F42` (Claude 수정) |
| `4.2.cert.notYet` | 아직 허가 전이에요. 허가가 나면 품목 허가증과 신약 포장이 여기 크게 보여요. 연구비 영수증은 지금까지 쓴 돈으로 미리 볼 수 있어요. | — | `COPY.result.notYet`, `§5.15-5` (Claude 수정) |
| `4.2.resultPack.title` | 신약 포장 완성본 | — | `COPY.result.packTitle`, `§5.15-5` |
| `4.2.resultPack.lead` | ② 포장 꾸미기에서 고른 {shapeLabel} 포장이에요. 허가받은 브랜드 이름 「{brand}」과(와) 허가 정보를 인쇄한 완성본이에요. | `{shapeLabel}`, `{brand}` | `F42`, `§5.15-5`, `시안 8.06` (Claude 수정) |
| `4.2.resultPack.printLines` | 「{brand}」 · {code} · {dose} mg · {company} ({ticker}) · {formLabel} · 품목 허가 D+{day} | `{brand}`, `{code}(새)`, `{dose}(새)`, `{company}(새)`, `{ticker}`, `{formLabel}`, `{day}` | `규칙-허가증`, `시안 8.06` |
| `4.2.receipt.title` | 연구비 영수증 | — | `COPY.result.receiptTitle`, `시안 8.08` (Claude 수정) |
| `4.2.receipt.head` | CRISTA 연구비 영수증 | — | `COPY.result.receiptHead`, `시안 8.08` — 워드마크 'CRISTA'(브랜드)로 보고 그대로 둠. 바꿀지는 사용자 확인 대기(crista-web-58 세션이 질문함) |
| `4.2.receipt.sub` | {company} ({ticker}) · {code} 「{brand}」 | `{company}(새)`, `{ticker}`, `{code}(새)`, `{brand}` | `시안 8.08` (Claude 보충) |
| `4.2.receipt.preview` | 아직 허가 전이에요. 지금까지 쓴 돈으로 미리 본 영수증이에요. | — | `COPY.result.notYet` (Claude 보충) |
| `4.2.receipt.spentTitle` | 쓴 돈 | — | `COPY.receipt.spentTitle`, `규칙-영수증` (Claude 수정) |
| `4.2.receipt.groupedNote` | 같은 단계의 작업은 한 줄로 묶고, 첫 날 ~ 끝 날을 적어요. | — | `규칙-영수증` (Claude 보충) |
| `4.2.receipt.incomeTitle` | 들어온 돈(투자 · 환급 · 학습 연구비) | — | `COPY.receipt.incomeTitle`, `규칙-영수증` (Claude 수정) |
| `4.2.receipt.total` | 쓴 돈 합계: {totalSpent} (처음 연구비의 {spentPct}% · 임상이 {clinicalPct}%) | `{totalSpent}(새)`, `{spentPct}(새)`, `{clinicalPct}(새)` | `COPY.receipt.total`, `규칙-영수증`, `시안 8.08` (일관성 수정) |
| `4.2.receipt.initial` | 처음 연구비: {initial} | `{initial}(새)` | `COPY.receipt.initial`, `규칙-영수증` (Claude 수정) (일관성 수정) |
| `4.2.receipt.income` | 들어온 돈 합계: {totalIncome} | `{totalIncome}(새)` | `COPY.receipt.income`, `규칙-영수증` (일관성 수정) |
| `4.2.receipt.balance` | 남은 돈: {balance} | `{balance}(새)` | `COPY.receipt.balance`, `규칙-영수증` (일관성 수정) |
| `4.2.receipt.days` | 걸린 날: {totalDays}게임 일 — D+{firstDay} → D+{lastDay} (임상만 {clinicalDays}게임 일) | `{totalDays}(새)`, `{firstDay}(새)`, `{lastDay}(새)`, `{clinicalDays}(새)` | `COPY.receipt.days`, `규칙-영수증`, `시안 8.08` (Claude 수정) |
| `4.2.receipt.molecules` | 분자 수: {initialMolecules} → 1 (1.2 라이브러리 분자 {initialMolecules}개 중 1개가 신약이 되었어요) | `{initialMolecules}(새)` | `COPY.receipt.molecules`, `규칙-영수증`, `시안 8.08` |
| `4.2.receipt.failNote` | 빨간 줄은 중간에 보류된 IND나 임상시험 시도예요. 보류된 시험에 쓴 연구비도 신약 하나를 만드는 데 든 실제 비용이라 영수증에 그대로 남아요. | — | `COPY.receipt.failNote`, `§5.15-5`, `시안 8.08` (검증 수정) (일관성 수정) |
| `4.2.receipt.failed` | ✕ 보류 | — | `COPY.receipt.failed`, `규칙-영수증` |
| `4.2.receipt.groupDiscover` | 발견 · 최적화 (1.1~2.2) | — | `COPY.receipt.group.discover`, `규칙-영수증` |
| `4.2.receipt.groupDevelop` | 특허 · 전임상 · IND (3.1~3.3) | — | `COPY.receipt.group.develop`, `규칙-영수증` |
| `4.2.receipt.groupClinical` | 임상 (4.1) | — | `COPY.receipt.group.clinical`, `규칙-영수증` |
| `4.2.receipt.groupApproval` | 허가 (4.2) | — | `COPY.receipt.group.approval`, `규칙-영수증` |
| `4.2.receipt.shareBarDesc` | 쓴 돈의 몫 띠: 발견 · 최적화 {discoverPct}% / 특허 · 전임상 · IND {developPct}% / 임상 {clinicalPct}% / 허가 {approvalPct}% | `{discoverPct}(새)`, `{developPct}(새)`, `{clinicalPct}(새)`, `{approvalPct}(새)` | `§5.15-5`, `규칙-영수증`, `시안 8.08` |
| `4.2.receipt.kindInitial` | 처음 연구비 | — | `COPY.receipt.kind.initial`, `규칙-영수증` |
| `4.2.receipt.kindPaidWork` | 실험 · 계산 | — | `COPY.receipt.kind.paid_work`, `규칙-영수증` |
| `4.2.receipt.kindPaidWorkRefund` | 실패 작업 환급 | — | `COPY.receipt.kind.paid_work_refund`, `규칙-영수증` |
| `4.2.receipt.kindAdjustment` | 조정 | — | `COPY.receipt.kind.adjustment`, `규칙-영수증` |
| `4.2.receipt.kindPatentFee` | 물질특허 출원료 | — | `COPY.receipt.kind.patent_fee`, `규칙-영수증` |
| `4.2.receipt.kindIndFee` | IND 수수료 | — | `COPY.receipt.kind.ind_fee`, `규칙-영수증` |
| `4.2.receipt.kindApprovalFee` | 최종 허가 수수료 | — | `COPY.receipt.kind.approval_fee`, `규칙-영수증` |
| `4.2.receipt.kindTrialFee` | 임상시험 비용 | — | `COPY.receipt.kind.trial_fee`, `규칙-영수증` |
| `4.2.receipt.kindClinicalTrial` | 임상 시작 비용 | — | `COPY.receipt.kind.clinical_trial`, `규칙-영수증` |
| `4.2.receipt.kindClinicalRecruit` | 참여자 모집 투자 | — | `COPY.receipt.kind.clinical_recruit`, `규칙-영수증` |
| `4.2.receipt.kindClinicalBackup` | 백업 후보 교체 | — | `COPY.receipt.kind.clinical_backup`, `규칙-영수증` |
| `4.2.receipt.kindLearnItem` | 학습 연구비 · 문항 | — | `COPY.receipt.kind.learn_item`, `규칙-영수증` |
| `4.2.receipt.kindLearnRevision` | 학습 연구비 · 고쳐 쓰기 | — | `COPY.receipt.kind.learn_revision`, `규칙-영수증` |
| `4.2.receipt.kindLearnNote` | 학습 연구비 · 연구 노트 | — | `COPY.receipt.kind.learn_note`, `규칙-영수증` |
| `4.2.receipt.kindLearnStipend` | 기초 연구비 | — | `COPY.receipt.kind.learn_stipend`, `규칙-영수증` |
| `4.2.receipt.kindLearnCorrection` | 학습 연구비 정정 | — | `COPY.receipt.kind.learn_correction`, `규칙-영수증` |
| `4.2.receipt.kindPitchSeriesA` | Series A 투자(회사가 처음 받는 큰 외부 투자) | — | `COPY.receipt.kind.pitch_series_a`, `규칙-영수증` (Claude 수정) |
| `4.2.receipt.kindPitchSeriesB` | Series B 투자(Series A 다음에 받는 더 큰 외부 투자) | — | `COPY.receipt.kind.pitch_series_b`, `규칙-영수증` (Claude 수정) |
| `4.2.receipt.kindFailureBounty` | 실패 바운티 환급(보류 원인을 맞게 분석해, 그 시험에 낸 비용의 일부를 돌려받은 돈) | — | `COPY.receipt.kind.failure_bounty`, `규칙-영수증` (Claude 수정) (검증 수정) |
| `4.2.receipt.footerLine` | *** 허가 「{brand}」 · D+{day} *** | `{brand}`, `{day}` | `시안 8.08` |
| `4.2.receipt.lesson` | 신약 개발 연구비의 대부분은 사람에게 약효와 안전성을 시험하는 임상 단계(4.1)에 쓰여요. | — | `시안 8.08` |
| `4.2.stock.title` | 기업가치 반응 (계단 그래프) | — | `§5.15-5`, `시안 8.07` (일관성 수정) |
| `4.2.stock.chartHead` | {ticker} 기업가치 지수 (처음 = 100) · 연구 사건마다 움직인 계단 | `{ticker}` | `§5.3`, `시안 8.07` (검증 수정) |
| `4.2.stock.eventPatent` | 물질특허 ▲{pct}% | `{pct}(새)` | `§5.3`, `시안 8.07` (Claude 수정) |
| `4.2.stock.eventIndPass` | IND 승인 ▲{pct}% | `{pct}(새)` | `§5.3`, `시안 8.07` (Claude 수정) |
| `4.2.stock.eventIndHold` | IND 보류 ▼{pct}% | `{pct}(새)` | `§5.3` (Claude 수정) |
| `4.2.stock.eventPhasePass` | {phase} 통과 ▲{pct}% | `{phase}`, `{pct}(새)` | `§5.3`, `시안 8.07`, `CLINICAL_COPY.verdictPass` (Claude 수정) |
| `4.2.stock.eventPhaseHold` | {phase} 보류 ▼{pct}% | `{phase}`, `{pct}(새)` | `§5.3`, `시안 8.07`, `CLINICAL_COPY.verdictHeld` (Claude 수정) |
| `4.2.stock.eventApproval` | 「{brand}」 최종 허가 ▲{pct}% | `{brand}`, `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.rangeNote` | 소식마다 오르내리는 폭은 규칙이 정한 범위 안에서 정해져요. 물질특허 0~5% · IND 승인 0~5% · IND 보류 −8~0%예요. 임상 통과는 1상 0~8% · 2상 3~15% · 3상 5~18%, 보류는 1상 −12~−2% · 2상 −18~−5% · 3상 −20~−8%예요. | — | `§5.3` (Claude 보충) (검증 수정) |
| `4.2.stock.otherFormsNote` | 회색 눈금은 다른 제형이었다면 허가 날 얼마나 올랐을지 보여 줘요. 먹는 알약(경구) ▲15.6% · 붙이는 패치(경피) ▲13.8% · 정맥 주사 ▲12.0%. | — | `§5.3`, `시안 8.07` (Claude 수정) |
| `4.2.stock.lesson` | 기업가치는 주식을 사고팔지 않고 소식만으로 움직여요. 허가 소식은 기업가치를 크게 올리는 소식 가운데 하나예요(▲{pct}%). | `{pct}(새)` | `§5.3`, `시안 8.07` (Claude 수정) |
| `4.2.stock.multiplierExplain` | 허가 날 기업가치 변동은 기본 12%에 제형 배율을 곱해 정해요(최대 20%). 배율은 먹는 알약(경구) 1.3 · 붙이는 패치(경피) 1.15 · 정맥 주사 1.0이에요. | — | `§5.3`, `시안 8.07` (Claude 수정) |
| `4.2.board.headline` | ◆ {ticker} 「{brand}」 신약 품목 허가 | `{ticker}`, `{brand}` | `COPY.board.headline`, `§5.3`, `§5.15-5` |
| `4.2.board.privacyNote` | 허가 전에는 브랜드 · 포장 · 신청서 · 심사를 우리 모둠과 선생님만 봐요. 전광판에는 스타트업 이름 · 티커 · 단계 · 통과/보류와 보류 종류 · 표적 질환 · 프로그램 코드 · 기업가치만 나가요. 허가가 나는 순간 브랜드 이름 「{brand}」이(가) 전광판에 공개돼요. | `{brand}` | `§5.3`, `§5.15-1`, `§5.15-5` (Claude 수정) (검증 수정) (일관성 수정) |
| `4.2.board.screenReader` | 전광판 소식: {company}({ticker})의 {disease} 신약 「{brand}」이(가) 품목 허가를 받았어요. 기업가치가 {pct}% 올랐어요. | `{company}(새)`, `{ticker}`, `{disease}(새)`, `{brand}`, `{pct}(새)` | `§5.3`, `§5.15-5` (Claude 수정) (검증 수정) |

키 231개 · Gemini 원문 그대로 150 · Claude 수정 55 · Claude 보충 15 · 검증 수정 14(그중 5줄은 원문 그대로였던 줄, 9줄은 Claude 수정 · 보충 줄을 다시 고침) · 검증 보충 6.
