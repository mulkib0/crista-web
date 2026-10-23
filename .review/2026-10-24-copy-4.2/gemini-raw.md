| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `4.2.intro.stepQuestion` | 이 약을 환자에게 내놓아도 될까요? | — | `COPY.stepQuestion`, `§6.1` |
| `4.2.intro.lead` | 1.1부터 4.1까지 모은 모든 과학적 증거를 한데 묶어 NDA(신약 허가 신청)를 내고, 우리 스타트업 제약회사의 첫 신약 품목 허가(신약을 만들어 환자에게 팔아도 좋다는 국가의 최종 승인)를 받는 마지막 단계예요. | — | `F42`, `§5.15`, `시안 8.01` |
| `4.2.intro.doneWhen` | 임상 3상을 통과한 제형(약을 몸에 넣는 형태 — 먹는 알약·정맥 주사·붙이는 패치)에 맞춰 브랜드와 포장을 완성하고, 서류 심사를 통과해 접수한 뒤 60게임 일이 지나면 최종 허가를 받아요. | — | `COPY.doneWhen`, `§6.1`, `규칙-허가` |
| `4.2.intro.costDuration` | 접수 수수료는 500,000 크리스타이고 심사 기간은 60게임 일이에요. 최종 허가는 새로운 실험이나 운에 따른 흔들림·점수 기준 없이, 3상 통과·포장 제형 일치·서류 통과 요건만 갖추면 확정돼요. | — | `§5.15-4`, `§6.1`, `규칙-허가` |
| `4.2.tabs.brand` | ① 브랜드 이름 | — | `COPY.tabs.brand`, `규칙-걸음` |
| `4.2.tabs.brandDesc` | 환자와 의사에게 불릴 우리 신약의 고유한 상표 이름을 지어요. | — | `§5.15-1`, `규칙-걸음` |
| `4.2.tabs.pack` | ② 포장 꾸미기 | — | `COPY.tabs.pack`, `규칙-걸음` |
| `4.2.tabs.packDesc` | 3상을 통과한 허가 제형에 맞는 용기 모양과 상자 색상, 라벨 배치를 골라요. | — | `§5.15-2`, `시안 8.06` |
| `4.2.tabs.nda` | ③ 허가 신청서 | — | `COPY.tabs.nda`, `규칙-걸음` |
| `4.2.tabs.ndaDesc` | 서버가 자동으로 묶은 전 주기 연구 증거를 확인하고, 약 라벨에 들어갈 효능과 주의사항 세 칸을 적어요. | — | `§5.15-3`, `규칙-신청서` |
| `4.2.tabs.submit` | ④ 심사 · 접수 | — | `COPY.tabs.submit`, `규칙-걸음` |
| `4.2.tabs.submitDesc` | 규칙 검사와 AI 심사로 서류를 점검한 뒤, 500,000 크리스타를 내고 최종 허가를 접수해요. | — | `§5.15-3`, `§5.15-4` |
| `4.2.tabs.result` | ⑤ 허가증 · 영수증 | — | `COPY.tabs.result`, `규칙-걸음` |
| `4.2.tabs.resultDesc` | 도장이 찍힌 품목 허가증, 완성된 신약 포장, 전 과정의 연구비 영수증과 주가 반응을 확인해요. | — | `F42`, `§5.15-5` |
| `4.2.intro.lockedNoPhase3` | 아직 4.1 임상 3상을 통과하지 못해 심사와 접수는 잠겨 있어요. 하지만 ① 브랜드 이름, ② 포장 꾸미기, ③ 허가 신청서 초안은 지금 미리 작성해 둘 수 있어요. | — | `COPY.lockedNoPhase3`, `규칙-걸음` |
| `4.2.intro.sidebarProgress` | 허가 심사 중 · D+{day} 허가 예정 ({progressPct}%) | `{day}`, `{progressPct}(새)` | `§5.15-4`, `규칙-상태` |
| `4.2.intro.sidebarApproved` | 품목 허가 완료 · 「{brand}」 (D+{day}) | `{brand}`, `{day}` | `§5.15-5`, `규칙-상태` |
| `4.2.intro.termNda` | NDA(신약 허가 신청, New Drug Application)는 후보물질 발견부터 임상 3상까지 모은 모든 약효·안전성 자료와 포장 라벨 초안을 묶어 허가 기관에 내는 공식 신청서예요. | — | `§5.15-3`, `시안 8.01` |
| `4.2.intro.termApproval` | 품목 허가(신약 판매 승인)는 약의 효과와 안전성이 과학적으로 입증되었으니 정식 브랜드 이름으로 환자에게 처방·판매해도 좋다고 국가가 내리는 최종 결정이에요. | — | `F42`, `§5.15-3`, `시안 8.01` |
| `4.2.brand.title` | 브랜드 이름 짓기 | — | `COPY.brand.title`, `§5.15-1` |
| `4.2.brand.lead` | 신약이 세상에 나올 때 쓸 브랜드 이름(2~12자)을 지어 주세요. 저장하는 순간 학급에서 예약되지만 허가 전까지는 우리 모둠과 선생님만 볼 수 있고, 최종 허가가 나면 학급 전광판에 공개돼요. | — | `COPY.brand.lead`, `§5.15-1`, `규칙-브랜드` |
| `4.2.brand.placeholder` | 2~12자 한글·영문·숫자로 입력해 주세요 (예: 다온콕스) | — | `규칙-브랜드`, `§5.3` |
| `4.2.brand.tip1` | 표적(약물이 몸속에서 결합해 작용하는 목표 단백질)이나 적응증(약이 치료 효과를 내는 대상 질환), 또는 회사 이름을 조합하면 기억하기 쉬운 이름이 돼요. | — | `COPY.brand.tips`, `규칙-브랜드` |
| `4.2.brand.tip2` | '만병통치'나 '완치'처럼 약효를 과장하거나 다른 실제 약으로 착각하게 하는 이름은 심사에서 거절돼요. | — | `COPY.brand.tips`, `규칙-심사체크리스트` |
| `4.2.brand.tip3` | 2~12자 안에서 한글, 영문, 숫자를 쓸 수 있고, 낱말 사이에 빈칸을 한 칸까지 넣을 수 있어요. | — | `COPY.brand.tips`, `규칙-브랜드` |
| `4.2.brand.empty` | 브랜드 이름을 입력해 주세요. | — | `COPY.brand.empty`, `규칙-브랜드` |
| `4.2.brand.length` | 브랜드 이름은 2자 이상 12자 이하로 지어야 해요. | — | `COPY.brand.length`, `규칙-브랜드` |
| `4.2.brand.chars` | 한글, 영문, 숫자만 쓸 수 있고, 낱말 사이 빈칸은 한 칸까지만 넣을 수 있어요. | — | `COPY.brand.chars`, `규칙-브랜드` |
| `4.2.brand.digitsOnly` | 숫자로만 이루어진 이름은 브랜드 이름으로 쓸 수 없어요. 한글이나 영문을 함께 써 주세요. | — | `COPY.brand.digitsOnly`, `규칙-브랜드` |
| `4.2.brand.blocked` | 사용할 수 없는 금지어가 포함되어 있어요. 다른 브랜드 이름을 지어 주세요. | — | `COPY.brand.blocked`, `규칙-브랜드` |
| `4.2.brand.famous` | 실제로 시판 중인 유명 의약품과 같은 이름은 상표권(브랜드 이름을 독점해서 쓸 수 있는 법적 권리) 보호와 처방 혼동 방지를 위해 쓸 수 없어요. | — | `COPY.brand.famous`, `규칙-브랜드` |
| `4.2.brand.taken` | 우리 학급의 다른 스타트업 제약회사에서 이미 예약한 이름이에요. 다른 이름을 골라 주세요. | — | `COPY.brand.taken`, `규칙-브랜드` |
| `4.2.brand.codeLike` | 연구실 코드명 꼴(영문과 숫자를 붙임표로 이은 형태)은 상표 이름으로 쓸 수 없어요. 환자와 의사가 부르기 쉬운 이름을 지어 주세요. | — | `규칙-브랜드` |
| `4.2.brand.famousInside` | 실제 유명 의약품 이름('{name}')이 3자 이상 들어 있어요. 다른 약으로 착각할 수 있으니 주의해 주세요. | `{name}` | `COPY.brand.famousInside`, `규칙-브랜드` |
| `4.2.brand.sameAsCompany` | 우리 스타트업 제약회사 이름과 똑같은 브랜드예요. 그대로 쓸 수도 있지만 약의 특징을 덧붙이면 더 구별하기 좋아요. | — | `COPY.brand.sameAsCompany`, `규칙-브랜드` |
| `4.2.brand.save` | 브랜드 이름 저장 | — | `COPY.brand.save`, `§5.15-1` |
| `4.2.brand.saved` | 브랜드 이름을 저장하고 학급에서 예약했어요. | — | `COPY.brand.saved`, `규칙-브랜드` |
| `4.2.brand.stale` | 같은 모둠의 다른 연구원이 방금 브랜드 이름을 먼저 바꿨어요. 최신 내용을 확인한 뒤 다시 저장해 주세요. | — | `§5.15-1`, `규칙-브랜드` |
| `4.2.brand.whyChange` | 임상시험까지는 객관적인 연구를 위해 후보물질을 기호로 된 코드명으로 부르지만, 최종 허가를 받아 환자에게 내놓을 때는 처방과 복용 때 헷갈리지 않도록 고유한 상표명(브랜드 이름)을 붙여요. | — | `§5.15-1`, `시안 8.06` |
| `4.2.pack.title` | 신약 포장 꾸미기 | — | `COPY.pack.title`, `§5.15-2` |
| `4.2.pack.lead` | 용기 모양과 상자 색상, 라벨 배치를 골라 우리 신약의 포장을 꾸며 보세요. 포장 모양은 반드시 임상 3상을 통과한 허가 제형과 맞아야 해요. | — | `COPY.pack.lead`, `§5.15-2`, `시안 8.06` |
| `4.2.pack.shapeTablet` | 정제(알약) | — | `COPY.pack.shape.tablet`, `규칙-포장` |
| `4.2.pack.shapeTabletDesc` | 가루 약을 단단하게 뭉친 먹는 알약 형태예요. 허가 제형이 먹는 알약(경구)일 때 골라요. | — | `§5.15-2`, `규칙-포장` |
| `4.2.pack.shapeCapsule` | 캡슐 | — | `COPY.pack.shape.capsule`, `규칙-포장` |
| `4.2.pack.shapeCapsuleDesc` | 약 성분을 작은 통에 담은 먹는 약 형태예요. 허가 제형이 먹는 알약(경구)일 때 골라요. | — | `§5.15-2`, `규칙-포장` |
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
| `4.2.pack.provisional` | 아직 임상 3상 통과 전이라 IND(임상시험 계획 승인 신청)에서 승인받은 제형({formLabel})으로 임시 비교하고 있어요. 3상을 통과하면 그 프로토콜(임상시험 설계 계획서) 제형으로 다시 맞춰요. | `{formLabel}` | `COPY.pack.provisional`, `규칙-포장` |
| `4.2.pack.badShape` | 포장 용기 모양을 골라 주세요. | — | `COPY.pack.badShape`, `규칙-포장` |
| `4.2.pack.badColor` | 포장 상자 색상을 골라 주세요. | — | `COPY.pack.badColor`, `규칙-포장` |
| `4.2.pack.badLayout` | 포장 라벨 배치를 골라 주세요. | — | `COPY.pack.badLayout`, `규칙-포장` |
| `4.2.pack.save` | 포장 꾸미기 저장 | — | `COPY.pack.save`, `§5.15-2` |
| `4.2.pack.stale` | 같은 모둠의 다른 연구원이 포장 디자인을 먼저 바꿨어요. 최신 내용을 불러온 뒤 다시 저장해 주세요. | — | `COPY.pack.stale`, `규칙-포장` |
| `4.2.pack.whyMatchForm` | 약물이 몸속에 흡수되는 속도와 안전성은 임상 3상에서 시험한 제형에 맞춰 입증된 것이에요. 따라서 실제 환자에게 전달되는 포장 용기도 허가받은 제형과 똑같아야 투약 오류를 막을 수 있어요. | — | `§5.15-2`, `시안 8.06` |
| `4.2.pack.previewCaption` | 최종 허가 전까지는 학급에 코드명({code})으로만 알려져 있고 포장 미리보기도 모둠 안에서만 보여요. 허가가 나면 이 포장에 브랜드 이름 「{brand}」와 용량({dose} mg), 허가일이 인쇄되어 공개돼요. | `{code}(새)`, `{brand}`, `{dose}(새)` | `§5.15-2`, `시안 8.06` |
| `4.2.nda.title` | 허가 신청서(NDA) 작성 | — | `COPY.nda.title`, `§5.15-3` |
| `4.2.nda.lead` | 1.1부터 4.1까지 쌓은 연구 결과 요약은 서버가 자동으로 채워 주어요. 여러분은 약 라벨에 인쇄할 '효능 · 효과 한 줄'과 '라벨 주의사항' 두 칸만 각 8~120자로 작성하면 돼요. | — | `COPY.nda.lead`, `규칙-신청서` |
| `4.2.nda.summaryTitle` | 전 주기 연구 증거 요약 (서버 자동 작성 · 오른쪽 꼬리표는 근거 단계) | — | `COPY.nda.summaryTitle`, `규칙-NDA요약` |
| `4.2.nda.rowCompany` | 회사 (3.1) — 이 신약을 개발하고 특허를 출원한 스타트업 제약회사 이름과 티커(전광판에서 회사를 나타내는 짧은 영문 기호)예요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowIndication` | 적응증 (1.1 · 3.3) — 이 신약으로 치료하려는 대상 질환이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowTarget` | 표적 (1.1) — 약물 분자가 몸속에서 달라붙어 질병 신호를 조절하는 목표 단백질이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowIngredient` | 성분 · 코드명 (2.2 · 3.1) — 분자 최적화를 거쳐 최종 선택된 신약 후보물질의 코드명이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowBinding` | 결합 (2.1) — 약물 분자가 표적 단백질에 달라붙는 결합 에너지({dG} kcal/mol)예요. | `{dG}` | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowPatent` | 물질특허 (3.1) — 새로운 분자 구조에 대해 독점 권리를 인정받은 특허 출원 기록이에요. | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowAltTest` | 대체 시험 (2.2 · 3.2) — 세포·컴퓨터로 먼저 확인한 hERG(심장 박동 리듬에 관여하는 칼륨 통로 유전자 — 막히면 부정맥 위험)와 간독성 안전성 결과예요. | — | `규칙-NDA요약` |
| `4.2.nda.rowPreclinical` | 전임상 (3.2) — 동물(쥐·개) 독성 시험에서 구한 NOAEL(부작용이 보이지 않은 가장 높은 용량, mg/kg/일)과 MRSD(사람에게 처음 투여할 때 안전한 최대 시작 용량, {mrsd} mg) 및 독성 소견이에요. | `{mrsd}` | `규칙-NDA요약` |
| `4.2.nda.rowInd` | IND (3.3) — 임상시험 시작 전 승인받은 초기 제형, 용량, 1차 평가지표(임상시험에서 약효를 판정하는 가장 핵심적인 기준)예요. | — | `규칙-NDA요약` |
| `4.2.nda.rowFormDose` | 제형 · 용량 (3.3 · 4.1) — 임상 3상을 통과해 최종 허가를 신청하는 투여 형태({formLabel})와 1회 용량({dose} mg)이에요. | `{formLabel}`, `{dose}(새)` | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.rowClinical` | 임상 결과 (4.1) — 임상 1·2·3상 각각의 통과·보류 기록과 위약 대비 효과 차이, 우연일 확률인 p값(보통 0.05보다 작으면 약효가 있다고 판단하는 통계값, {pValue})이에요. | `{pValue}(새)` | `규칙-NDA요약`, `시안 8.01` |
| `4.2.nda.indicationLabel` | 효능 · 효과 한 줄 | — | `COPY.nda.sectionLabel.indication`, `규칙-신청서` |
| `4.2.nda.indicationGuide` | 우리 약의 표적 질환, 대상 환자, 임상 3상 1차 평가지표에서 확인된 효과만 정확하게 적어요. 3상에서 시험하지 않은 효과나 과장된 표현은 쓰지 않아요. | — | `COPY.nda.sectionGuide.indication`, `규칙-심사체크리스트` |
| `4.2.nda.indicationGood` | 좋은 예: "{disease} 환자에서 3상 1차 평가지표({endpoint})를 위약 대비 유의미하게 개선하여 증상 완화에 도움을 줍니다." | `{disease}(새)`, `{endpoint}(새)` | `규칙-심사체크리스트` |
| `4.2.nda.indicationBad` | 나쁜 예(과장 · 근거 없음): "모든 환자의 질병을 부작용 없이 100% 완치하고 재발까지 완벽하게 막아 줍니다." | — | `§5.15-3`, `규칙-심사체크리스트` |
| `4.2.nda.caution1Label` | 라벨 주의사항 ① (위험 신호 근거) | — | `COPY.nda.sectionLabel.caution1`, `규칙-신청서` |
| `4.2.nda.caution1Guide` | 전임상 독성 소견, hERG, 간독성, 또는 임상 1상 안전성 시험에서 관찰된 실제 위험 신호나 이상사례(약 투여 뒤 나타난 바람직하지 않고 의도하지 않은 반응)를 바탕으로 주의할 점을 적어요. | — | `COPY.nda.sectionGuide.caution1`, `규칙-심사체크리스트` |
| `4.2.nda.caution1Good` | 좋은 예: "전임상과 1상에서 경미한 간 효소 상승 소견이 있었으므로 간 질환이 있는 환자는 투여 전 의사와 상의하고 정기적으로 간 기능 검사를 받으세요." | — | `규칙-심사체크리스트` |
| `4.2.nda.caution1Bad` | 나쁜 예(근거 없음): "이 약은 완벽하게 안전해서 어떤 이상사례나 부작용도 나타나지 않으니 누구나 안심하고 드세요." | — | `§5.15-3`, `규칙-심사체크리스트` |
| `4.2.nda.caution2Label` | 라벨 주의사항 ② (구체적 행동 지침) | — | `COPY.nda.sectionLabel.caution2`, `규칙-신청서` |
| `4.2.nda.caution2Guide` | 환자나 의사가 무엇을 해야 하는지(정해진 복용·투여 방법, 함께 피해야 할 것, 필요 검사, 이상 증상 시 병원 연락 등) 구체적인 행동 지침을 적어요. | — | `COPY.nda.sectionGuide.caution2`, `규칙-심사체크리스트` |
| `4.2.nda.caution2Good` | 좋은 예: "정해진 용량({dose} mg)과 투여 간격을 지켜 사용하고, 투여 뒤 가슴 두근거림이나 심한 어지러움이 나타나면 즉시 사용을 멈추고 병원에 연락하세요." | `{dose}(새)` | `규칙-심사체크리스트` |
| `4.2.nda.caution2Bad` | 나쁜 예(구체성 부족): "몸 상태가 이상하면 알아서 조심해서 사용하세요." | — | `규칙-심사체크리스트` |
| `4.2.nda.charLengthGuide` | 약 상자 라벨에 인쇄할 수 있도록 세 칸 모두 각각 8자 이상 120자 이하로 작성해 주세요. (현재 {len}자 / 8~120자) | `{len}(새)` | `규칙-신청서` |
| `4.2.nda.checkIndicationFits` | 심사 기준 ① 임상 근거 일치: 효능·효과 한 줄이 표적 질환, 대상 환자, 3상 1차 평가지표와 맞고 3상에서 보이지 않은 효과를 말하지 않는지 확인해요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkIndicationModest` | 심사 기준 ② 과장 표현 금지: '완치', '부작용 없음', '모든 환자'처럼 과학적 사실을 부풀린 과장 표현이 없는지 확인해요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkCautionGrounded` | 심사 기준 ③ 위험 신호 반영: 주의사항 두 개 중 적어도 하나가 전임상 소견, hERG, 간독성, 1상 안전성 등 실제 시험에서 나온 위험 신호에 근거하는지 봐요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkCautionActionable` | 심사 기준 ④ 구체적 행동 안내: 주의사항에 복용·투여 방법, 피할 것, 사전 검사, 병원 연락처럼 환자나 의사가 실천할 행동이 구체적으로 적혀 있는지 봐요. | — | `규칙-심사체크리스트` |
| `4.2.nda.checkBrandHonest` | 심사 기준 ⑤ 정직한 브랜드 이름: 브랜드 이름이 약효를 과장하거나 다른 약으로 착각하게 만들지 않는지 함께 확인해요. | — | `규칙-심사체크리스트` |
| `4.2.nda.realWorldCompare` | 실제 신약 개발에서도 FDA(미국 식품의약국)의 NDA 규정(21 CFR 314.50)과 식약처(식품의약품안전처) 품목허가 제도에 따라 상표명, 제형·성상, 용법·용량, 사용상의 주의사항과 전체 임상 자료를 제출해 심사받아요. 우리 수업에서는 방대한 임상 자료 요약을 서버가 자동으로 묶어 주고, 가장 핵심인 라벨 문구 세 칸을 직접 써 보는 거예요. | — | `§5.15-3` |
| `4.2.submit.title` | 서류 심사 및 최종 허가 접수 | — | `COPY.submit.title`, `§5.15-3` |
| `4.2.submit.rulesTitle` | 규칙 검사 5항목 (모두 맞아야 AI 심사로 넘어가요) | — | `COPY.submit.rulesTitle`, `규칙-규칙검사` |
| `4.2.rule.phase3Ok` | ✓ 임상 3상 통과: 현재 신청 프로토콜로 4.1 임상 3상을 통과했어요. | — | `COPY.rule.phase3.ok`, `규칙-규칙검사` |
| `4.2.rule.phase3Fail` | ✕ 임상 3상 미통과: 같은 프로토콜로 4.1 임상 3상을 먼저 통과해야 심사·접수를 진행할 수 있어요. | — | `COPY.rule.phase3.fail`, `규칙-규칙검사` |
| `4.2.rule.brandOk` | ✓ 브랜드 이름 확정: 학급에서 유일하고 규칙에 맞는 브랜드 이름을 정했어요. | — | `COPY.rule.brand.ok`, `규칙-규칙검사` |
| `4.2.rule.brandFail` | ✕ 브랜드 이름 미완성: ① 브랜드 이름 걸음에서 2~12자 규칙에 맞는 이름을 저장해 주세요. | — | `COPY.rule.brand.fail`, `규칙-규칙검사` |
| `4.2.rule.packOk` | ✓ 포장 · 허가 제형 일치: 고른 포장 모양이 허가받을 제형과 정확히 맞아요. | — | `COPY.rule.pack.ok`, `규칙-규칙검사` |
| `4.2.rule.packFail` | ✕ 포장 · 허가 제형 불일치: 포장 모양이 허가 제형과 달라요. ② 포장 꾸미기에서 제형에 맞는 용기로 바꿔 주세요. | — | `COPY.rule.pack.fail`, `규칙-규칙검사` |
| `4.2.rule.packNone` | ✕ 포장 미선택: ② 포장 꾸미기 걸음에서 용기 모양과 색상, 라벨 배치를 골라 저장해 주세요. | — | `COPY.rule.pack.none`, `규칙-규칙검사` |
| `4.2.rule.sectionOk` | ✓ 신청서 3칸 작성 완료: 효능·효과 한 줄과 주의사항 두 칸을 모두 8~120자로 채웠어요. | — | `COPY.rule.section.ok`, `규칙-규칙검사` |
| `4.2.rule.sectionFail` | ✕ 신청서 칸 미완성: '{label}' 칸을 8자 이상 120자 이하로 작성해 주세요. | `{label}` | `COPY.rule.section.fail`, `규칙-규칙검사` |
| `4.2.rule.protocolOk` | ✓ 3상 프로토콜 일치: 신청서의 제형·용량이 임상 3상을 통과한 프로토콜과 같아요. | — | `COPY.rule.protocol.ok`, `규칙-규칙검사` |
| `4.2.rule.protocolFail` | ✕ 3상 프로토콜 불일치: 신청서의 제형·용량이 임상 3상 통과 프로토콜과 달라요. 3상 결과와 다시 맞춰 주세요. | — | `COPY.rule.protocol.fail`, `규칙-규칙검사` |
| `4.2.submit.reviewBtn` | 서류 심사 요청하기 | — | `COPY.submit.reviewBtn`, `§5.15-3` |
| `4.2.status.draft` | 초안 | — | `COPY.status.draft`, `규칙-상태` |
| `4.2.status.reviewing` | 심사 중 | — | `COPY.status.reviewing`, `규칙-상태` |
| `4.2.status.revise` | 보완 필요 | — | `COPY.status.revise`, `규칙-상태` |
| `4.2.status.passed` | 서류 통과 | — | `COPY.status.passed`, `규칙-상태` |
| `4.2.status.submitted` | 접수(허가 심사 중) | — | `COPY.status.submitted`, `규칙-상태` |
| `4.2.status.approved` | 허가 | — | `COPY.status.approved`, `규칙-상태` |
| `4.2.submit.aiReviewerBadge` | AI 심사 · 식약처 · FDA 신약 심사관 (항목별 맞음·빠짐·앞뒤 안 맞음·불분명 판정, 지적 80자 · 피드백 300자 이내 / 최종 판정과 과금은 서버가 정해요) | — | `§5.11`, `규칙-서류심사` |
| `4.2.submit.teacherWaiting` | AI 심사 응답이 지연되어 교사 확인 대기 상태예요. 선생님께서 서류를 확인해 직접 판정해 주실 때까지 잠시 기다려 주세요. | — | `§5.11`, `규칙-서류심사` |
| `4.2.submit.changedAfterReview` | 심사한 뒤 브랜드, 포장 또는 신청서 내용이 바뀌어 다시 초안 상태가 되었어요. 바뀐 내용으로 서류 심사를 다시 받아 주세요. | — | `§5.11`, `규칙-상태` |
| `4.2.submit.dailyLimit` | 서류 심사는 서류 1건당 하루 5번, 모둠 전체로는 하루 15번까지 요청할 수 있어요. (오늘 남은 횟수: 이 서류 {docLeft}번 · 모둠 {teamLeft}번) | `{docLeft}(새)`, `{teamLeft}(새)` | `§5.11`, `규칙-서류심사` |
| `4.2.submit.submitBtn` | 최종 허가 접수하기 (500,000 크리스타) | — | `COPY.submit.submitBtn`, `§5.15-4` |
| `4.2.submit.confirmTitle` | 최종 품목 허가를 접수할까요? | — | `COPY.submit.confirmTitle`, `§5.15-4` |
| `4.2.submit.confirmBody` | 접수 수수료 {fee} 크리스타(500,000 크리스타)를 내고 {days}게임 일(60게임 일) 동안 최종 심사에 들어가요. 한 번 접수하면 브랜드 이름, 포장, 신청서 내용을 더 이상 고칠 수 없어요. | `{fee}`, `{days}` | `COPY.submit.confirmBody`, `§5.15-4`, `규칙-허가` |
| `4.2.submit.needPass` | 규칙 검사와 AI 심사를 모두 통과해 '서류 통과' 상태가 되어야 접수할 수 있어요. | — | `COPY.submit.needPass`, `규칙-상태` |
| `4.2.submit.insufficientFunds` | 남은 연구비({balance} 크리스타)가 부족해 최종 허가 접수 수수료(500,000 크리스타)를 낼 수 없어요. | `{balance}(새)` | `§5.15-4`, `규칙-허가` |
| `4.2.submit.submitted` | 최종 허가 신청서가 접수되었어요! 60게임 일 뒤인 D+{day}에 최종 품목 허가가 나요. | `{day}` | `COPY.submit.submitted`, `§5.15-4` |
| `4.2.submit.already` | 이미 최종 허가 신청서가 접수되어 심사 중이에요. 모둠원 여러 명이 동시에 눌러도 수수료(500,000 크리스타)는 한 번만 차감돼요. | — | `COPY.submit.already`, `규칙-상태` |
| `4.2.submit.progress` | 최종 허가 심사 진행률 {progressPct}% · {elapsed}/{days}게임 일 경과 (D+{day} 허가 예정) | `{progressPct}(새)`, `{elapsed}(새)`, `{days}`, `{day}` | `§5.15-4`, `규칙-상태` |
| `4.2.submit.protocolReset` | 4.1에서 임상 3상 프로토콜(재도전·용량 변경)이 바뀌어 신청서의 제형·용량도 새 프로토콜을 따라가며 초안 상태로 돌아왔어요. | — | `규칙-상태` |
| `4.2.cert.title` | 품목 허가증 | — | `COPY.result.certTitle`, `시안 8.01` |
| `4.2.cert.kind` | 신약 품목 허가 | — | `COPY.result.certKind`, `시안 8.01` |
| `4.2.cert.top` | 품목 허가증 · New Drug Application | — | `COPY.result.certTop`, `시안 8.01` |
| `4.2.cert.stamp` | NDA · 품목 허가 · D+{day} | `{day}` | `COPY.result.stampTop`, `COPY.result.stampWord`, `시안 8.01` |
| `4.2.cert.numberDate` | 허가 번호 No. {code}-{day} · 허가일 D+{day} | `{code}(새)`, `{day}` | `규칙-허가증`, `시안 8.01` |
| `4.2.cert.rowBrand` | 브랜드 이름 — 「{brand}」 | `{brand}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowCode` | 코드명 (주성분) — {code} ({company} · {ticker}) | `{code}(새)`, `{company}(새)`, `{ticker}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowForm` | 허가 제형 — {formLabel} | `{formLabel}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowDose` | 허가 용량 — {dose} mg | `{dose}(새)` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowIndication` | 적응증 — {indication} | `{indication}(새)` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowApprovedDay` | 허가 게임 일 — D+{day} | `{day}` | `§5.15-5`, `규칙-허가증` |
| `4.2.cert.rowFinalReview` | 최종 심사 (4.2) — 서류 심사 60게임 일 완료 · 새 판정 없음 | — | `규칙-NDA요약`, `시안 8.01` |
| `4.2.cert.rowMarketReaction` | 시장 반응 기본값 (4.2) — 기업가치(회사의 전체 가치를 금액이나 지수로 나타낸 것) ▲ {pct}% (기본 12% × 제형 배율, 최대 20%) | `{pct}(새)` | `§5.3`, `규칙-NDA요약`, `규칙-허가증` |
| `4.2.cert.evidenceNote` | 오른쪽 무지개 꼬리표는 그 줄의 증거가 나온 단계(1.1~4.2)를 뜻해요. 최종 허가 도장 하나는 새로운 실험이 아니라 지금까지 모은 모든 증거를 한 장으로 묶은 결과예요. | — | `COPY.result.evidenceNote`, `시안 8.01` |
| `4.2.cert.spentAndMolecules` | 허가일 D+{day} · 쓴 연구비 {totalSpent} 크리스타 / 처음 연구비 10,000,000 크리스타 · 분자 {initialMolecules} → 1 | `{day}`, `{totalSpent}(새)`, `{initialMolecules}(새)` | `규칙-영수증`, `시안 8.01` |
| `4.2.cert.print` | 허가증 인쇄 | — | `COPY.result.print`, `시안 8.01` |
| `4.2.cert.savePng` | 이미지로 저장 | — | `COPY.result.savePng`, `시안 8.01` |
| `4.2.cert.complete` | 신약 개발 파이프라인 완주를 축하해요! | — | `COPY.result.complete`, `F42` |
| `4.2.cert.completeLead` | 후보 분자 탐색부터 임상 3상과 허가 심사까지 모든 관문을 통과해 우리 모둠의 신약 「{brand}」가 마침내 세상에 나왔어요. | `{brand}` | `COPY.result.completeLead`, `F42` |
| `4.2.cert.notYet` | 아직 최종 허가가 나지 않았어요. 서류를 접수한 뒤 60게임 일이 지나면 품목 허가증과 완성된 신약 포장, 연구비 영수증을 확인할 수 있어요. | — | `COPY.result.notYet`, `§5.15-5` |
| `4.2.resultPack.title` | 신약 포장 완성본 | — | `COPY.result.packTitle`, `§5.15-5` |
| `4.2.resultPack.lead` | ② 포장 꾸미기에서 고른 {shapeLabel} 포장에 최종 허가받은 브랜드 이름 「{brand}」와 허가 정보가 인쇄된 완성본이에요. | `{shapeLabel}`, `{brand}` | `F42`, `§5.15-5`, `시안 8.06` |
| `4.2.resultPack.printLines` | 「{brand}」 · {code} · {dose} mg · {company} ({ticker}) · {formLabel} · 품목 허가 D+{day} | `{brand}`, `{code}(새)`, `{dose}(새)`, `{company}(새)`, `{ticker}`, `{formLabel}`, `{day}` | `규칙-허가증`, `시안 8.06` |
| `4.2.receipt.title` | CRISTA 연구비 영수증 | — | `COPY.result.receiptTitle`, `시안 8.08` |
| `4.2.receipt.head` | {company} ({ticker}) · {code} 「{brand}」 연구비 명세서 | `{company}(새)`, `{ticker}`, `{code}(새)`, `{brand}` | `COPY.result.receiptHead`, `시안 8.08` |
| `4.2.receipt.spentTitle` | 쓴 돈 (지출 내역 · 같은 단계 작업은 첫 날~끝 날로 묶음) | — | `COPY.receipt.spentTitle`, `규칙-영수증` |
| `4.2.receipt.incomeTitle` | 들어온 돈 (투자 · 환급 · 학습 연구비 내역) | — | `COPY.receipt.incomeTitle`, `규칙-영수증` |
| `4.2.receipt.total` | 쓴 돈 합계: {totalSpent} 크리스타 (처음 연구비의 {spentPct}% · 임상이 {clinicalPct}%) | `{totalSpent}(새)`, `{spentPct}(새)`, `{clinicalPct}(새)` | `COPY.receipt.total`, `규칙-영수증`, `시안 8.08` |
| `4.2.receipt.initial` | 처음 연구비: 10,000,000 크리스타 | — | `COPY.receipt.initial`, `규칙-영수증` |
| `4.2.receipt.income` | 들어온 돈 합계: {totalIncome} 크리스타 | `{totalIncome}(새)` | `COPY.receipt.income`, `규칙-영수증` |
| `4.2.receipt.balance` | 남은 돈: {balance} 크리스타 | `{balance}(새)` | `COPY.receipt.balance`, `규칙-영수증` |
| `4.2.receipt.days` | 걸린 날: {totalDays}게임 일 — D+0 → D+{day} (임상만 {clinicalDays}게임 일) | `{totalDays}(새)`, `{day}`, `{clinicalDays}(새)` | `COPY.receipt.days`, `규칙-영수증`, `시안 8.08` |
| `4.2.receipt.molecules` | 분자 수: {initialMolecules} → 1 (1.2 라이브러리 분자 {initialMolecules}개 중 1개가 신약이 되었어요) | `{initialMolecules}(새)` | `COPY.receipt.molecules`, `규칙-영수증`, `시안 8.08` |
| `4.2.receipt.failNote` | 빨간 줄은 중간에 보류(실패)된 IND나 임상시험 시도예요. 보류된 시험에 쓴 연구비도 사라지지 않고 신약 하나를 개발하는 데 들어간 실제 비용으로 영수증에 그대로 남아요. | — | `COPY.receipt.failNote`, `§5.15-5`, `시안 8.08` |
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
| `4.2.receipt.kindPitchSeriesA` | Series A 투자(초기 임상 단계에서 유치하는 외부 연구 투자금) | — | `COPY.receipt.kind.pitch_series_a`, `규칙-영수증` |
| `4.2.receipt.kindPitchSeriesB` | Series B 투자(후기 임상 단계에서 유치하는 대규모 연구 투자금) | — | `COPY.receipt.kind.pitch_series_b`, `규칙-영수증` |
| `4.2.receipt.kindFailureBounty` | 실패 바운티 환급(실패 기록과 원인을 공유하고 돌려받는 연구비) | — | `COPY.receipt.kind.failure_bounty`, `규칙-영수증` |
| `4.2.receipt.footerLine` | *** 허가 「{brand}」 · D+{day} *** | `{brand}`, `{day}` | `시안 8.08` |
| `4.2.receipt.lesson` | 신약 개발 연구비의 대부분은 사람에게 약효와 안전성을 시험하는 임상 단계(4.1)에 쓰여요. | — | `시안 8.08` |
| `4.2.stock.title` | 주가 반응 (기업가치 계단 그래프) | — | `§5.15-5`, `시안 8.07` |
| `4.2.stock.chartHead` | {ticker} 기업가치 지수 (D+0 시작 = 100) · 연구 사건마다 움직인 계단 | `{ticker}` | `§5.3`, `시안 8.07` |
| `4.2.stock.eventPatent` | 물질특허 ▲{pct}% (변동 범위 0~5% · 기본 2%) | `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.eventIndPass` | IND 승인 ▲{pct}% (변동 범위 0~5%) | `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.eventIndHold` | IND 보류 ▼{pct}% (변동 범위 -8~0%) | `{pct}(새)` | `§5.3` |
| `4.2.stock.eventPhasePass` | {phase}상 통과 ▲{pct}% (1상 0~8% · 2상 3~15% · 3상 5~18%) | `{phase}(새)`, `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.eventPhaseHold` | {phase}상 보류 ▼{pct}% (1상 -12~-2% · 2상 -18~-5% · 3상 -20~-8%) | `{phase}(새)`, `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.eventApproval` | 「{brand}」 최종 허가 ▲{pct}% | `{brand}`, `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.otherFormsNote` | 회색 눈금은 다른 제형이었다면 허가 날 얼마나 올랐을지 보여 주어요 — 먹는 알약(경구, 배율 1.3) ▲15.6% · 붙이는 패치(경피, 배율 1.15) ▲13.8% · 정맥 주사(배율 1.0) ▲12.0% | — | `§5.3`, `시안 8.07` |
| `4.2.stock.lesson` | 기업가치는 주식 매매 없이 특허, 임상 통과·보류, 신약 허가 소식만으로 움직이며, 최종 허가 날의 상승 폭(▲{pct}%)이 가장 커요. | `{pct}(새)` | `§5.3`, `시안 8.07` |
| `4.2.stock.multiplierExplain` | 허가 날 기업가치 변동은 기본 12%에 제형 배율을 곱해 정해져요(최대 20%). 정맥 주사(배율 1.0 → 12.0%)보다 붙이는 패치(경피, 배율 1.15 → 13.8%)나 먹는 알약(경구, 배율 1.3 → 15.6%)처럼 환자가 쓰기 편한 제형일수록 시장 가치를 더 높게 인정받아요. | — | `§5.3`, `시안 8.07` |
| `4.2.board.headline` | ◆ {ticker} 「{brand}」 신약 품목 허가 | `{ticker}`, `{brand}` | `COPY.board.headline`, `§5.3`, `§5.15-5` |
| `4.2.board.privacyNote` | 허가 전에는 학급 전광판에 회사 이름·티커, 단계, 통과/보류와 실패 종류, 표적 질환, 프로그램 코드명, 기업가치만 공개되고 브랜드·포장·신청서·심사는 우리 모둠과 선생님만 볼 수 있어요. 최종 허가가 나는 순간 브랜드 이름 「{brand}」가 전광판에 공개돼요. | `{brand}` | `§5.3`, `§5.15-1`, `§5.15-5` |
| `4.2.board.screenReader` | 전광판 소식: 스타트업 제약회사 {company}(티커 {ticker})의 {disease} 신약 「{brand}」가 최종 품목 허가를 받아 기업가치가 {pct}% 올랐어요. | `{company}(새)`, `{ticker}`, `{disease}(새)`, `{brand}`, `{pct}(새)` | `§5.3`, `§5.15-5` |

### 메모
- `COPY.board.headline(ticker, brand)`의 기존 인자 구성을 그대로 유지해 `4.2.board.headline`에는 `{ticker}`, `{brand}`만 두었고, 등락률(`{pct}`)과 질환(`{disease}`)을 함께 읽는 문구는 `4.2.board.screenReader`와 `4.2.stock.eventApproval`에 나누어 담았습니다.
- 임상 3상 용량 선택지(10 · 50 · 100 mg)는 모둠마다 통과한 프로토콜 값이 다르므로 `{dose}(새)` 자리표시자로 처리했습니다.
- 게임 속 허가 기관 고유 이름은 정해지지 않았으므로, 도장과 기본 안내에는 `NDA · 품목 허가`로 표기하고 실제 제도와 비교하는 문구(`4.2.nda.realWorldCompare`, `4.2.submit.aiReviewerBadge`)에만 `FDA(미국 식품의약국)`와 `식약처(식품의약품안전처)`를 적었습니다.
