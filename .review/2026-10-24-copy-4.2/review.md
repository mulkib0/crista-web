# 4.2 최종 허가 문구 — Claude 검토 메모(2026-10-24)

- 대상: [`gemini-raw.md`](gemini-raw.md)(Gemini 4 Argon High · `--mode plan` · 1회 실행 성공 · 표 210행 + 메모 3줄 · `gemini-run.log` 빈 파일 = 오류 없음) → 정리본 [`copy.md`](copy.md)(225키 = 원문 그대로 155 · Claude 수정 55 · Claude 보충 15).
- 근거: [`../2026-10-24-copy-common/brief.md`](../2026-10-24-copy-common/brief.md) F42 · 설계 §5.15 · §6.1 4.2 줄 · §5.3 '신약 허가' 줄 · 구현 기록 §6.42 · `packages/web-contract/src/approval.ts`(`APPROVAL_COPY` · 규칙 값) · `review.ts` · 시안 `design/step-viz/viz-8.js`(8.01 · 8.06 · 8.07 · 8.08) · crista `game-rules` `approvalDefaultChangePct`(경구 15.6 · 정맥 12 · 경피 13.8).
- 범위 덮기: 소개 · 걸음 ①~⑤ · 브랜드 · 포장(8.06) · NDA 칸 · 규칙 검사 · 심사 상태 · 접수 · 허가증(8.01) · 신약 포장 · 영수증(8.08) · 주가 반응(8.07) · 전광판 — 모두 있음. 빠졌던 것(AI 심사 중 · 교사가 정함 · 칸별 AI 상태 4종 · 보완 필요 보조 줄 · 영수증 미리보기 · 변동 범위 설명 등)은 Claude 가 채웠다.

## ① 설계 사실 대조(금액 · 기간 · 문턱 · 법 조항 · 통계)

맞은 것: 수수료 500,000 크리스타 · 60게임 일 · 브랜드 2~12자 · 빈칸 하나 · 칸 8~120자 · 심사 한도 1건 5번 / 모둠 15번 · 12% × 제형 배율 최대 20% · 배율 1.3 / 1.15 / 1.0 · §5.3 변동 범위 9개 · 21 CFR 314.50 · 체크리스트 5 · 규칙 검사 5 · 상태 6 · 원장 종류 20 · '흔들림 · 점수 기준 없음'. `$` · '텃밭' 없음.

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `4.2.brand.tip2` | '… 이름은 심사에서 **거절돼요**' → '… 심사에서 **보완 요구를 받아요**' | `brand_honest` 는 AI 체크리스트 항목이라 결과는 `revise`(보완)다. `reject`(거절)는 규칙(특허 신규성 · 중복)만 낸다(`review.ts`). |
| `4.2.brand.taken` | '우리 학급의 **다른 스타트업 제약회사에서 이미 예약한** 이름' → '학급에서 이미 쓰는 이름이에요.' | 구현 기록 §6.42: 409 문구는 '이미 쓰는 이름'만 — 다른 모둠의 예약 사실을 드러내지 않는다. |
| `4.2.stock.lesson` | '최종 허가 날의 상승 폭이 **가장 커요**' → '허가 소식은 기업가치를 크게 올리는 소식 **가운데 하나예요**' | 3상 통과는 5~18% · 투자 5~15% 라 허가(12~15.6%)보다 클 수 있다. 시안 8.07 의 '가장 큼'은 기본값끼리만 견준 말이다. |
| `4.2.cert.notYet` | '접수한 뒤 60게임 일이 지나면 … **연구비 영수증을 확인할 수 있어요**' → '영수증은 지금까지 쓴 돈으로 **미리 볼 수 있어요**' | 영수증은 허가 전에도 보인다(`COPY.result.notYet` · `ReceiptView`). 원문은 반대로 말했다. |
| `4.2.pack.previewCaption` | '허가가 나면 이 **포장에** 브랜드 … **인쇄되어 공개돼요**' → '브랜드 이름이 전광판에 공개되고, 포장에는 허가일이 인쇄돼요' | 전광판 공개 칸은 ticker · brand · stage · form · disease · 변동률뿐 — 포장 그림은 공개 대상이 아니다(§6.42 '공개'). |
| `4.2.receipt.initial` · `4.2.cert.spentAndMolecules` | '처음 연구비: **10,000,000** 크리스타'(박음) → `{initial}` | 처음 연구비는 `totals.initialCrista` 서버 값이다(교사 조정 · 정정이 있을 수 있음). 규칙 3. |
| `4.2.receipt.days` | 'D+**0** → D+{day}' → 'D+{firstDay} → D+{lastDay}' | 걸린 날은 첫 원장 줄 → 허가(`firstGameDay` · `lastGameDay`)라 D+0 에서 시작한다는 보장이 없다. |
| `4.2.cert.numberDate` | 'No. {code}-{day}'(시안 꼴) → '허가 번호 {certNo}' | 웹은 `certificateNo` 를 서버가 정한다(`CertificateView`). 꼴을 문구에서 만들지 않는다. |
| `4.2.submit.submitBtn` · `insufficientFunds` | '(500,000 크리스타)' 박음 → `{fee}` | 기존 `confirmBody(fee)` 와 같은 자리표시자로. |
| `4.2.submit.confirmBody` | '{fee} **크리스타**(500,000 크리스타)를 … {days}게임 일(60게임 일)' → '수수료 {fee}을(를) 내요. {days}게임 일 뒤에 허가가 나요. …' | `{fee}` 는 단위까지 든 글이라 '크리스타'가 두 번 찍힌다. 괄호 속 값 되풀이도 뺐다. |

## ② 자리표시자 — 바뀜 · 새로 생김

- **기존 그대로**: `{name}` · `{formLabel}` · `{shapeLabel}` · `{needLabel}` · `{fee}` · `{days}` · `{day}` · `{label}` · `{brand}` · `{ticker}`.
- **4.1 과 맞춤**: `{phase}상 통과` → `{phase} 통과`(`4.2.stock.eventPhasePass` · `eventPhaseHold`) — 4.1 `CLINICAL_COPY.verdictPass` 의 `{phase}` 는 이미 '1상' 꼴이라 '상'이 두 번 붙는다.
- **Claude 가 바꿈**: `{code}-{day}` → `{certNo}(새)` · 박힌 10,000,000 → `{initial}(새)` · `D+0` → `{firstDay}(새)` · `{lastDay}(새)` · `{disease}` 를 뺌(`indicationGood` — 예시 문장으로 바꿈) · `{brand}` · `{dose}` 를 뺌(`pack.previewCaption` — 미리보기 설명에 값이 필요 없음).
- **Gemini 가 새로 만든 것(유지 — 8b 가 값을 줄 수 있는지 확인 필요)**: `{progressPct}` · `{elapsed}` · `{code}` · `{dose}` · `{dG}` · `{mrsd}` · `{pValue}` · `{endpoint}` · `{len}` · `{docLeft}` · `{teamLeft}` · `{balance}` · `{company}` · `{indication}` · `{pct}` · `{totalSpent}` · `{initialMolecules}` · `{spentPct}` · `{clinicalPct}` · `{totalIncome}` · `{totalDays}` · `{clinicalDays}` · `{discoverPct}` · `{developPct}` · `{approvalPct}` · `{disease}`.
  - `ReceiptView` 에 **없는 값**: `{clinicalDays}`(임상만 걸린 날) · `{spentPct}` · 각 `{…Pct}`(화면이 `shares` 로 계산 가능). `{docLeft}` · `{teamLeft}`(남은 심사 횟수)는 지금 API 응답에 없다.
- **Claude 보충**: `{teacherNote}`(교사 수동 판정 메모 — `DocReviewView.teacherNote`).
- 돈 자리표시자 규칙(정리본 머리에 적음): `{fee}` = 단위 든 글, 나머지 = 숫자만.

## ③ 과학적으로 틀린 비유 · 설명

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| `4.2.nda.rowClinical` | 'p값(**우연일 확률**인 …)' → 'p값은 약이 효과가 없다고 가정할 때 이만큼 큰 차이가 우연히 나올 확률이에요.' | '결과가 우연일 확률'은 p값의 대표적인 잘못된 풀이다. |
| `4.2.nda.rowClinical` | '**위약** 대비 효과 차이' → '**대조군** 대비' | 항암 3상의 대조군은 위약이 아니라 표준 치료다(4.1 규칙). |
| `4.2.nda.rowAltTest` | 'hERG(… 칼륨 통로 **유전자** — 막히면 …)' → 'hERG(심장 박동 리듬을 맞추는 칼륨 통로 — 약이 막으면 부정맥 위험)' | 약이 막는 것은 유전자가 아니라 그 유전자가 만드는 통로 단백질이다. |
| `4.2.nda.rowPreclinical` | 'MRSD(사람에게 처음 투여할 때 **안전한** 최대 시작 용량)' → '사람 첫 투여 최대 **권장** 시작 용량' | MRSD 는 '권장' 시작 용량이다. '안전하다'고 보장하지 않는다(4.1 지시문 풀이와 같게). |
| `4.2.brand.whyChange` | '임상시험까지는 **객관적인 연구를 위해** 후보물질을 코드명으로 부르지만' → '개발하는 동안에는 후보물질을 회사가 붙인 코드명으로 불러요.' | 코드명은 객관성(눈가림)과 상관없다. 눈가림은 참여자 · 의료진이 배정 군을 모르게 하는 것이다. |
| `4.2.nda.indicationGood` | '… 위약 대비 **유의미하게 개선하여 증상 완화에 도움을 줍니다**' → '예: "경도 알츠하이머병 환자의 인지 기능 저하를 늦춰요." — 3상 1차 평가지표({endpoint})로 확인한 효과만 써요.' | '증상 완화'는 지표(예: HbA1c · LDL-C)가 보여 주지 않는 효과일 수 있어, 좋은 예가 체크리스트 `indication_fits` 를 어긴다. 합니다체도 고쳤다. |
| `4.2.nda.rowFormDose` | '**1회** 용량({dose} mg)' → '용량({dose} mg)' | 10 · 50 · 100 mg 이 1회분인지 하루분인지 설계에 없다. |
| `4.2.pack.shapeCapsuleDesc` | '약 성분을 **작은 통**에 담은' → '삼킬 수 있는 얇은 껍질(젤라틴 등)에 담은' | 캡슐은 통이 아니라 먹을 수 있는 껍질이다. |
| `4.2.stock.multiplierExplain` | '**환자가 쓰기 편한 제형일수록 시장 가치를 더 높게 인정받아요**' → 배율 값만 알림 | 배율의 이유는 설계에 없다. 실제 시장 가치는 제형 하나로 정해지지 않는다(아래 ⑥-5). |
| `4.2.receipt.kindPitchSeriesA/B` | '(**초기 임상 단계에서** 유치하는 …)' · '(**후기 임상 단계에서** …)' → '회사가 처음 받는 큰 외부 투자' · 'Series A 다음에 받는 더 큰 외부 투자' | 투자 라운드는 임상 단계와 짝지어 정해지지 않는다. 게임에서도 단계 조건이 없다. |
| `4.2.receipt.kindFailureBounty` | '(실패 기록과 원인을 **공유하고** 돌려받는)' → '(보류 원인을 맞게 분석해 돌려받은 연구비)' | 바운티는 Q1~Q3 정답 + 분석 글로 받는다. 공유가 조건이 아니다(4.1 규칙). |

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 풀이)

- **해요체**: `4.2.intro.stepQuestion` 은 Gemini 가 이미 '될까요?'로 고쳤다 — 기존 `COPY.stepQuestion`('… 될까?')은 해라체라 이 줄을 따른다. `nda.indicationGood`(합니다체)도 고쳤다. '채워 주어요' · '보여 주어요' → '채워 줘요' · '보여 줘요'.
- **한 문장 한 생각**(나눈 줄): `intro.lead` · `intro.doneWhen` · `nda.lead`(세 칸이 '효능 한 줄 + 주의사항 두 칸'임을 분명히) · `nda.realWorldCompare` · `submit.confirmBody` · `pack.whyMatchForm` · `pack.previewCaption` · `board.privacyNote` · `cert.completeLead` · `resultPack.lead`.
- **너무 긴 라벨 · 속 이야기**: `submit.aiReviewerBadge` 원문 'AI 심사 · … (항목별 맞음 · 빠짐 · … 지적 80자 · 피드백 300자 이내 / 최종 판정과 과금은 서버가 정해요)' → 배지 'AI 심사 · 식약처 · FDA 신약 심사관 역할' + 따로 `submit.aiNotice` 한 줄 + 칸 상태 4키(`review.item.*`). 글자 수 한도는 학생에게 보일 필요가 없다. 주가 사건 라벨의 '(변동 범위 0~5%)' 괄호도 빼서 `stock.rangeNote` 한 줄로 모았다(그래프 글씨가 겹침).
- **영수증 머리**: Gemini 가 `receipt.title` = 'CRISTA 연구비 영수증' · `receipt.head` = '… 연구비 명세서'로 기존 키와 뜻을 엇갈렸다 → `title` = '연구비 영수증'(`COPY.result.receiptTitle`) · `head` = 'CRISTA 연구비 영수증'(`receiptHead`) · 새 `receipt.sub` = 회사 줄. `spentTitle` 의 긴 괄호는 `receipt.groupedNote` 로 뺐다.
- **용어 통일**: '다른 연구원' → '다른 모둠원'(`brand.stale` · `pack.stale` — 기존 COPY 와 같은 말) · '실패 종류' → '보류'(`board.privacyNote`) · '차감' → '나가요'.
- **조사**: 「{brand}」가 / 와 → 「{brand}」이(가) / 과(와)(`cert.completeLead` · `resultPack.lead` · `board.privacyNote` · `board.screenReader`) · `brand.famousInside` 는 '({name})이'로 괄호 앞 명사에 조사를 붙였다.
- **전문어 풀이 확인**: NDA · 품목 허가 · 제형 · 적응증 · 표적 · 상표권 · 티커 · hERG · NOAEL · MRSD · 1차 평가지표 · 이상사례 · 프로토콜 · IND · 기업가치 · p값 · 투약 오류 — 처음 나올 때 풀었다. '바이알(주사병)' · '정제(알약)' 좋음.
- 남은 작은 것(고치지 않음): `brand.codeLike` 는 새 키지만 지금 `checkBrandName` 은 붙임표를 `chars` 문구로 막는다 — 8b 가 따로 막을 때만 쓴다. `brand.placeholder` 의 예 '다온콕스'는 §5.3 예시 모둠 브랜드라 학생이 그대로 쓸 수 있다(학급 유일 규칙에 걸릴 뿐 해는 없음).

## ⑤ 기존 COPY 키와 대응(`APPROVAL_COPY`)

| 기존 키 | 정리본 키 | 처리 |
| --- | --- | --- |
| `stepQuestion` · `doneWhen` · `lockedNoPhase3` | `4.2.intro.stepQuestion` · `.doneWhen` · `.lockedNoPhase3` | 해요체 · 짧게 — 바꿔 넣기 |
| `tabs.*` | `4.2.tabs.*` (+ `*Desc` 새 키 5) | 라벨 앞 ①~⑤ 는 화면이 붙일지 8b 판단 |
| `brand.*`(title · lead · empty · length · chars · digitsOnly · blocked · famous · famousInside · sameAsCompany · taken · tips[3] · save · saved) | `4.2.brand.*`(tips → `tip1~3`) | 맞춤. `length` 는 지금 템플릿(`BRAND_NAME_MIN/MAX`)을 쓰니 숫자 박지 말고 상수로 |
| (없음) | `4.2.brand.stale` · `.placeholder` · `.codeLike` · `.whyChange` | 새 키 |
| `pack.*`(title · lead · shape · color · layout · fits · misfit · noForm · provisional · bad* · save · stale) | `4.2.pack.*`(shape → `shapeTablet` 등 평평하게) | 코드 반영 때 기존 중첩 꼴(`shape.tablet`)로 되돌려 넣는다 |
| (없음) | `4.2.pack.shape*Desc` · `.whyMatchForm` · `.previewCaption` | 새 키 |
| `nda.title` · `lead` · `summaryTitle` · `sectionLabel.*` · `sectionGuide.*` | `4.2.nda.*`(indicationLabel / Guide 등) | 맞춤 |
| (없음) | `4.2.nda.row*`(요약 줄 풀이 12) · `*Good` · `*Bad` · `charLengthGuide` · `check*`(5) · `realWorldCompare` | 새 키 — 요약 줄 라벨 자체는 서버 `features/approval.ts` 의 `label`(회사 · 적응증 …)이 정한다. 풀이는 툴팁용 |
| `submit.*` | `4.2.submit.*` | 맞춤 + 새 키(aiReviewerBadge · aiNotice · aiQueued · teacherWaiting · teacherDecided · changedAfterReview · dailyLimit · insufficientFunds · progress · protocolReset) |
| `rule.{phase3, brand, pack, section, protocol}.{ok, fail, none}` | `4.2.rule.phase3Ok` 등 | 맞춤 — 원문은 앞에 '✓ 3상 통과:' 같은 머리말을 붙였다. 규칙 줄은 80자 안(`RuleFinding.note`)이라 길이 확인 필요 |
| `status.*` | `4.2.status.*` | `passed` 는 '서류 통과'로 짧아짐 — 기존 '— 접수할 수 있어요' 꼬리를 살릴지 8b 판단 |
| `result.certTitle · certKind · certTop · stampTop · stampWord · packTitle · receiptTitle · receiptHead · print · savePng · complete · completeLead · notYet · evidenceNote` | `4.2.cert.*` · `4.2.resultPack.title` · `4.2.receipt.title/head` | 맞춤(`certTop` · `stampTop` 은 ⑥-1 확인 뒤) |
| `receipt.*`(spentTitle · incomeTitle · total · initial · income · balance · days · molecules · failNote · group.* · kind.* · failed) | `4.2.receipt.*` | 맞춤. 원문은 라벨에 값을 붙인 꼴('합계: {totalSpent} 크리스타')이라 화면이 라벨 · 값을 나눠 그리면 앞부분만 쓴다 |
| `board.headline(ticker, brand)` | `4.2.board.headline` | 기존 그대로(⑥-3 확인) |
| (없음) | `4.2.stock.*` · `4.2.board.privacyNote` · `.screenReader` · `4.2.review.item.*` · `4.2.receipt.sub/preview/groupedNote` | 새 키 — 8.07 은 구현 기록상 FMARKET 뒤로 미뤘다 |

- 덧붙임: `DOC_REVIEWER_LABEL.nda`('식약처 · FDA 신약 심사관')는 `review.ts` 에 있다. NDA 심사관 프롬프트 · 체크리스트 문구를 바꾸면 `NDA_REVIEWER_VERSION`('nda-v1')을 올려야 한다(구현 기록 §6.42).

## ⑥ 사용자 확인이 필요한 것

1. **허가 기관 · 도장 표기** — 시안 8.01 도장은 'FDA · NDA', §5.3 예시는 '「다온콕스」 FDA 허가', 그런데 '품목 허가증'은 식약처 용어이고 심사관 이름은 '식약처 · FDA 신약 심사관'이다. 게임 속 허가 기관을 무엇으로 할까요? 정리본은 기관 이름 없이 도장 위 글을 'NDA 승인'으로 두었다.
2. **허가증 위 글** — 기존 `certTop` '품목 허가증 · New Drug Application'은 '신청서'라는 뜻이라 허가증과 어긋난다. 정리본은 '품목 허가증 · 신약 허가 신청(NDA) 승인'으로 바꿨다. 영문을 남길지(예: 'NDA Approval') 정해 주세요.
3. **전광판 헤드라인 끝말** — 설계 §5.15 '「{브랜드}」 허가' · §5.3 'FDA 허가' · 기존 COPY '신약 품목 허가' · 시안 8.07 '최종 허가 ▲ 15.6%'가 서로 다르다. 정리본은 기존 COPY('신약 품목 허가')를 유지했다.
4. **영수증 빨간 줄 표시** — 사용자 지시는 '실패한 상도 빨간 줄', 기존 COPY 는 '✕ 실패', 4.1 화면 용어는 '보류'다. Gemini 는 '✕ 보류'로 바꿨고, 풀이(`failNote`)에서 '보류(실패)'로 한 번 풀었다. 어느 쪽으로 할까요?
5. **허가 날 제형 배율의 이유** — 경구 1.3 · 경피 1.15 · 정맥 1.0 의 근거를 학생에게 말할까요? Gemini 는 '쓰기 편한 제형일수록 시장 가치를 높게 인정'이라고 썼지만 설계에 근거가 없어 뺐다.
6. **새 자리표시자 값** — `{clinicalDays}`(임상만 걸린 날) · `{docLeft}` · `{teamLeft}`(남은 심사 횟수) · `{progressPct}` · `{elapsed}` 는 지금 API 응답에 없다. 8b 가 줄 수 없으면 그 키는 빼거나 값 없이 쓴다.
7. **사용자가 준 claude.ai 게시본(8.08 영수증 근거)** — 이 계정에서 읽지 못해 저장소 시안으로 대신했다(설계 §12-22). 원문과 다른 칸(예: 분자 수 줄 · 들어온 돈 칸)이 있는지 확인이 필요하다.

## 독립 검증(2차)

- 날짜: 2026-10-24 · 검증자: Claude Opus 5.5(앞 작성자 결론을 믿지 않고 근거 파일을 다시 대조).
- 대조한 근거: `../2026-10-24-copy-common/brief.md`(F42 · 이미 정한 것) · 설계 §5.3(신약 허가 줄 · 공개 범위 · 변동 범위) · §5.11(규칙 ∧ LLM) · §5.15 · §6.1 4.2 줄 · `packages/web-contract/src/approval.ts`(`APPROVAL_COPY` · 규칙 값 · `ReceiptView` · `CertificateView`) · `review.ts`(`REVIEW_LIMITS` · `DocReviewView`) · `preclinical.ts`(MRSD 단위 mg · 사람 60 kg) · `patent.ts`(받아들여지면 등록) · 시안 `design/step-viz/viz-8.js`.
- 정리본 수: 231키(원문 그대로 150 · Claude 수정 55 · Claude 보충 15 · 검증 수정 14 · 검증 보충 6). `gemini-raw.md` 는 고치지 않았다.

### ① 숫자 · 금액 · 기간 · 문턱 — 다시 한 줄씩 대조

- 맞음: 500,000 크리스타 · 60게임 일(§5.15-4 · §6.1 · `APPROVAL_FEE_CRISTA` · `APPROVAL_REVIEW_GAME_DAYS`) · 브랜드 2~12자 · 빈칸 하나(`BRAND_NAME_*` · `BRAND_NAME_PATTERN`) · 칸 8~120자(`NDA_SECTION_MIN/MAX`) · 심사 한도 1건 5번 · 모둠 15번(`REVIEW_LIMITS`) · 12% × 제형 배율 · 최대 20% · 15.6 / 13.8 / 12.0(12 × 1.3 · 1.15 · 1.0) · §5.3 변동 범위 9개 · 21 CFR 314.50 · 바운티는 '일부' 환급(IND · 1상 50% · 2상 40% · 3상 30%) · 원장 종류 20개 · 묶음 4개(1.1~2.2 · 3.1~3.3 · 4.1 · 4.2).
- 크리스타 환산: $0.100M = 10,000,000 센트 ÷ 20 = 500,000 크리스타, $0.001M = 5,000 크리스타 — 맞음. 문구 안 `$` 없음(스크립트로 확인). '텃밭' 없음.
- 좋은 예 · 나쁜 예 길이: 28 · 45 · 79 · 51 · 85 · 26자 — 모두 8~120자 안.

### ② 자리표시자

- `gemini-raw.md` → `copy.md` 에서 바뀐 11키를 하나씩 확인했다. 사라진 자리표시자는 모두 옮겨졌거나(`cert.stamp` → `stampTop/stampWord/stampDay` · `cert.rowCode` 의 `{company}` · `{ticker}` → `cert.rowCompany` · `receipt.head` → `receipt.sub`) 뺀 이유가 위 ②에 적혀 있다(`pack.previewCaption` · `indicationGood`).
- 231줄 모두 문구의 `{…}` 와 '자리표시자' 칸이 같다(스크립트로 확인). 이번에 `4.2.submit.submitted` 에 `{days}` 를 더했다.
- 앞 검토 ⑥-6 보정: `{progressPct}` 와 `{elapsed}` 는 API 에 따로 없지만, `ApprovalApplicationView` 의 `submittedGameDay` · `decideGameDay` 와 `gameDay` 로 화면이 계산할 수 있다(이미 `COPY.ui.progress(pct, day)` 가 그렇게 쓴다). 그래서 정말 새 값이 필요한 것은 `{clinicalDays}` · `{docLeft}` · `{teamLeft}` 다.

### ③ 이번에 고친 것(검증 수정 14)

| 키 | 고친 것 | 이유 |
| --- | --- | --- |
| `4.2.intro.termApproval` | '효과와 안전성을 확인하고' → '효과가 위험보다 크다고 판단해' + '부작용이 전혀 없다는 뜻은 아니에요.' | 허가 = 안전 보장처럼 읽혔다. 실제 허가는 이익 · 위험을 견준 판단이다. |
| `4.2.nda.rowClinical` | '0.05보다 작으면 효과가 있다고 봐요' → ''통계적으로 유의하다'고 하지만, 효과가 얼마나 큰지나 안전한지를 말해 주지는 않아요' · '이만큼 큰' → '이만큼 또는 더 큰' | 'p<0.05 = 효과가 있다'는 과장이다. p값 정의는 '그만큼 이상 극단적인 결과'다. |
| `4.2.submit.aiNotice` | 'AI 심사는 의견이에요. 통과 여부와 수수료는 … 서버가 정해요' → '규칙 검사와 AI 심사가 모두 맞아야 서류 통과예요. 수수료와 허가 날짜는 … 서버 규칙이 정해요.' | §5.11-1 은 '최종 = 규칙 ∧ LLM'이다. AI 가 '보완'이면 서류가 통과하지 못한다. '의견일 뿐'이라 하면 학생이 AI 지적을 무시해도 된다고 오해한다. 돈 · 날짜만 LLM 이 정하지 않는다(§5.11-2). |
| `4.2.board.privacyNote` | '통과/보류' → '통과/보류와 보류 종류' | §5.3 공개 범위는 '통과/보류와 실패 종류'다. 빼면 공개되는 것을 덜 알린다(개인정보 안내가 틀림). 화면 용어는 '보류'로 맞췄다. |
| `4.2.board.screenReader` | '기업가치 ▲{pct}%.' → '기업가치가 {pct}% 올랐어요.' | 화면 낭독기는 ▲ 를 '검은 위쪽 삼각형'처럼 읽는다. 낭독용 줄은 말로 쓴다(Gemini 원문 꼴로 되돌림). |
| `4.2.nda.rowPatent` | '독점 권리를 인정받은 특허 출원 기록' → '우리 회사만 쓸 수 있도록 출원해 등록한 특허 기록' | '인정받은(등록)'과 '출원'이 한 줄에서 엇갈렸다. 3.1 은 받아들여지면 등록이다(`patent.ts`). |
| `4.2.receipt.failNote` | '연구비도 사라지지 않고 … 남아요' → '연구비도 … 실제 비용이라 영수증에 그대로 남아요' | '사라지지 않고'는 돈이 돌아온다는 뜻으로 읽힌다. 남는 것은 기록이다. |
| `4.2.receipt.kindFailureBounty` | '돌려받은 연구비' → '그 시험에 낸 비용의 일부를 돌려받은 돈' | 바운티는 일부(50 / 40 / 30%) 환급이다(brief F41). |
| `4.2.stock.chartHead` | '(D+0 시작 = 100)' → '(처음 = 100)' | 앞 검토가 `receipt.days` 에서 'D+0 시작은 보장되지 않는다'고 고친 것과 같은 이유. 지수는 상장 때 100 이다. |
| `4.2.stock.rangeNote` | 통과 · 보류 범위를 '임상 통과는 … , 보류는 …'으로 나눔 | '1상 통과 0~8% · 2상 3~15%'가 2상 통과인지 읽기 어려웠다. 값은 그대로. |
| `4.2.submit.submitted` | '60게임 일 뒤인' → '{days}게임 일 뒤인' | 같은 흐름의 `confirmBody` 는 `{days}` 를 쓴다. 한 화면 안에서 박은 값과 서버 값이 섞이지 않게. |
| `4.2.nda.realWorldCompare` | 제출 항목에 '투여 경로'를 넣음 | §5.15-3 원문 항목(상표명 · 제형 · 투여 경로 · 전체 임상 자료)과 맞춤. |
| `4.2.pack.whyMatchForm` | '효과와 안전성을 확인했어요' → '정해진 제형 하나로 … 시험했어요' | 임상 통과 = 안전 확인처럼 읽히지 않게. |
| `4.2.brand.lead` | 한 문장을 세 문장으로 나눔(예약 · 비공개 · 허가 때 공개) | 한 문장 한 생각. |

### ④ 채운 범위(검증 보충 6)

- '심사 결과' 화면 자리가 비어 있었다(상태 6개 · 칸 상태 4개만 있었음). `4.2.review.title` · `verdictPass` · `verdictRevise` · `rulesBlocked`(규칙에 걸리면 AI 심사 없이 보완 — 규칙 값) · `feedbackTitle`(300자 AI 의견 머리) · `fixLabel`(`COPY.ui.srFix`)을 더했다.
- 그 밖의 범위(브랜드 · 포장 8.06 · NDA 칸 · 허가증 8.01 · 신약 포장 · 영수증 8.08 빨간 줄 · 주가 8.07 · 전광판 공개)는 모두 있다. 6번 검사(4.1 전용)는 해당 없음.

### ⑤ 확인했지만 고치지 않은 것

- 해요체: 나쁜 예 따옴표 안의 합니다체(`indicationBad`)는 '나쁜 예' 인용이라 그대로 둔다. 전문어 첫 풀이(NDA · 품목 허가 · IND · 프로토콜 · hERG · NOAEL · MRSD · 1차 평가지표 · 이상사례 · 상표권 · 티커 · 기업가치 · 투약 오류)는 모두 있다.
- `cert.rowFinalReview` 의 '60게임 일'은 규칙 값과 같다. 다만 기존 `COPY.evidence.final(days, fee)` 는 값을 받으니, 코드 반영 때 그 함수를 쓰면 된다.
- `brand.stale` 의 '지금 이름을 불러왔으니'는 서버 `brandStale`('지금 이름을 확인하고')와 다르다. 화면이 409 뒤 이름을 자동으로 불러오는지에 따라 정해진다(아래 질문).
- `indicationGood` 의 예시 문장(알츠하이머)과 `{endpoint}`(모둠 값)가 한 칸에 섞여 있다. 다른 질환 모둠에는 어색할 수 있다(아래 질문).

### ⑥ 남은 확인 질문(앞 검토 ⑥에 더함)

1. `brand.stale` — 409 뒤 화면이 지금 이름을 **자동으로** 불러오나요, 아니면 [지금 이름 불러오기] 단추를 눌러야 하나요? 자동이 아니면 '지금 이름을 불러왔으니'를 '[지금 이름 불러오기]로 확인하고'로 바꿔야 해요.
2. `nda.indicationGood` — 예시를 모둠 질환에 맞춘 문장으로 바꿀까요(서버가 `{disease}` · `{endpoint}` 를 줄 때), 아니면 고정 예시(알츠하이머)만 두고 `{endpoint}` 를 뺄까요?
3. `stock.eventIndHold` · `eventPhaseHold` 의 `▼{pct}%` — `{pct}` 가 부호 없는 크기인지 확인해야 해요. 음수로 오면 '▼-5%'처럼 부호가 겹쳐요.
4. `submit.dailyLimit` — 한도는 'LLM 을 부르는 심사만 센다'(`REVIEW_LIMITS`). 규칙에서 막히거나 저장된 결과를 돌려받는 요청은 세지 않는다고 학생에게 알릴까요? '하루'는 실제 날인가요, 게임 일인가요?
