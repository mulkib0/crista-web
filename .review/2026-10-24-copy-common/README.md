# 학생용 문구 초안 묶음 — 공통 안내

- 날짜: 2026-10-24 (마지막 점검 · crista-web-a1)
- 상태: **초안이다. 코드 반영은 8b 세션의 통합이 끝난 뒤에 한다.** 이 묶음은 `apps/` · `packages/` · `db/` 를 고치지 않았다.
- 지시: [`brief.md`](brief.md)(문체 규칙 §5.12 · 8b 가 정한 4.1 · 4.2 · 기업가치 사실)

## 1. 목적

설계 §5.12 에 따라 학생에게 보이는 글을 단계마다 Gemini 4 Argon (High) 가 먼저 쓴다. 그 뒤 Claude 가 사실 · 숫자 · 자리표시자 · 문체를 검토해 고친다. 2차 독립 검증도 거쳤다.
이 README 는 단계 묶음 10개를 한곳에서 본다. 단계 사이 용어를 하나로 맞춘 결과(용어집)를 적는다. 코드에 넣는 방법도 적는다. 사용자에게 물어야 할 것도 여기 모은다.

## 2. 단계별 폴더

키 수는 각 `copy.md` 표의 줄 수다. '일관성 수정'은 마지막 점검에서 문구를 고친 줄 수다(근거 칸 끝 `(일관성 수정)`). '남은 확인'은 5절 질문 수(같은 질문을 겹쳐 적은 것은 하나로 셌다)다.

| 단계 | 폴더 | 반영할 코드(8b 통합 뒤) | 키 수 | Gemini 성공 | 일관성 수정 | 남은 확인 |
| --- | --- | --- | --- | --- | --- | --- |
| 1.2 화합물 스크리닝 | [`copy-1.2`](../2026-10-24-copy-1.2/copy.md) | `screen.ts` `SCREEN_COPY` | 427 | 예 | 0 | 9 |
| 2.1 도킹 · 2.2 ADMET | [`copy-2.1-2.2`](../2026-10-24-copy-2.1-2.2/copy.md) | `selection.ts` `SELECTION_COPY` | 184 | 예(원문을 다 쓴 뒤 `agy` 가 끝나지 않아 Claude 가 종료 — `gemini-run.log`) | 10 | 10 |
| 3.1 물질특허 | [`copy-3.1`](../2026-10-24-copy-3.1/copy.md) | `patent.ts` `PATENT_COPY` | 249 | 예 | 3 | 10 |
| 3.2 전임상 · 동물실험 | [`copy-3.2`](../2026-10-24-copy-3.2/copy.md) | `preclinical.ts` `PRECLINICAL_COPY` | 141 | 예 | 10 | 10 |
| 3.3 제형 · IND | [`copy-3.3`](../2026-10-24-copy-3.3/copy.md) | `ind.ts` `IND_COPY` | 209 | 예 | 5 | 9 |
| 4.1 임상 1 · 2 · 3상 | [`copy-4.1`](../2026-10-24-copy-4.1/copy.md) | `clinical.ts` `CLINICAL_COPY` | 161 | 예 | 15 | 12 |
| 4.2 허가 | [`copy-4.2`](../2026-10-24-copy-4.2/copy.md) | `approval.ts` `APPROVAL_COPY` | 231 | 예 | 32 | 11 |
| 학습 연구비 | [`copy-learn`](../2026-10-24-copy-learn/copy.md) | `learn.ts` `LEARN_COPY` · `QUANT_LABEL`, `pipeline.ts` `NOTE_SECTION_LABEL`, `apps/web/src/board/parts.tsx` `NOTE_PLACEHOLDER` | 180 | 예 | 11 | 9 |
| 전광판 · 기업가치 · 최종 순위 | [`copy-board`](../2026-10-24-copy-board/copy.md) | `market.ts` `MARKET_COPY` | 269 | 예 | 18 | 11 |
| 심사관 · 시뮬레이터 말투(프롬프트) | [`copy-reviewer`](../2026-10-24-copy-reviewer/copy.md) | `apps/server/src/reviews.ts` `HOW_TO_TALK_TO_STUDENTS` · `buildReviewSystemPrompt`, `apps/server/src/features/clinical-sim.ts` `buildSimSystemPrompt` | 97 | 예 | 0 | 10 |
| **합계** | | | **2,148** | 10/10 | **104** | **101** |

- `packages/web-contract/src/` 앞부분은 표에서 줄였다. 심사관 묶음만 서버 쪽(`apps/server/src/`)이다.
- 폴더마다 `prompt.md`(Gemini 지시문) · `gemini-raw.md`(Gemini 원문) · `copy.md`(정리본) · `review.md`(고친 이유 · 2차 검증)가 있다.
- 겹친 키가 없음을 확인했다(2,148개 모두 다름). 한 키가 문구이면서 다른 키의 가지인 경우(잎 · 가지 겹침)도 없다.
- 문구 안 자리표시자와 '자리표시자' 칸이 모든 줄에서 맞는 것도 확인했다.

## 3. 용어집(정한 표기)

마지막 점검에서 아래처럼 맞췄다. 코드에 넣을 때도 이 표를 따른다.

| 개념 | 정한 표기 | 쓰지 않는 표기 | 메모 |
| --- | --- | --- | --- |
| 학생 무리 | **모둠** · **모둠원** | 팀 · 팀원 · '우리 스타트업 모둠원' · '우리 회사(모둠)' | 사람을 가리킬 때는 늘 '모둠'. |
| 모둠이 세운 회사 | **스타트업**(이름 칸은 **스타트업 이름** — 코드 `STARTUP_NAME_*` · 사옥 등기 화면) | '회사 이름'(이름 칸을 가리킬 때) | 티커 · 상장 · 기업가치를 풀어 말할 때 일반 명사 '회사'는 써도 된다. |
| 임상에 올릴 분자 | **주력 후보**(줄여 '주력') · **백업 후보**(줄여 '백업'), 함께 쓸 때 **주력 · 백업 후보** | 주력 리드 · 리드(대표 후보 물질) · 리드(주력 후보) | 정하는 때는 3.2 전임상 끝이다(설계 §5.7 · §5.9 ⑤). 2.2 에서 고르는 것은 **특허 후보**. '리드 읽기 도구'(§5.7 도구 이름)와 '리드 최적화'(학습 채점 항목 이름)는 이름이라 남겼다. |
| 판정 | **통과** · **보류** | '실패'(판정 이름으로) · '미달' | '실패'는 기능 이름 **실패 바운티**와 기술 오류('실행이 실패했어요' · '실패 작업 환급')에만 쓴다. |
| 보류 종류 | **안전성 문제** · **효능 부족** · **효능 · 안전 둘 다** · **운영 문제(모집 · 탈락)** | '운영 문제(모집 지연 · 중도 탈락)' · '효능 · 안전 둘 다 미달' | 코드 `CLINICAL_COPY.holdKind` 와 같다. |
| 재도전 경로 | **같은 프로토콜로 다시** · **용량 · 제형 바꾸기(IND 변경)** · **백업 후보로 교체(새 IND)** | '용량/제형 변경' · '백업 교체' | 4.1 탭 이름과 심사관 프롬프트가 같은 이름을 쓴다. |
| 회사의 값 | **기업가치**(순위 이름도 **기업가치 순위**) | '시가총액 순위' · '시가총액 1위' · '주가 반응'(그래프 이름) | 기업가치 = 시가총액(주가 × 1,000,000주). '주가' · '시가총액'은 전광판 서랍의 숫자 칸과 계산을 풀어 주는 줄에서만 쓴다. |
| 화폐 | **크리스타** | `CRISTA` · `$` · 원 | 돈 자리표시자 꼴은 4절. |
| 모둠 돈 | **연구비**(들어오는 투자는 **투자금**) | 자금 · 예산 | |
| AI 표시 | 서류 심사 배지 **AI 심사**, 심사하는 쪽 **AI 심사관**, 결과 머리 **AI 심사관의 칸별 지적** · **AI 심사관의 종합 피드백**. 학습 연구비는 **AI 채점**, 4.1 은 **AI 시뮬레이션 · 교육용**, 전광판 헤드라인 꼬리표는 **AI** | '[AI 심사]' 머리 · 'AI 심사 의견' · '종합 의견' · 배지에 붙인 기관 이름('식약처 · FDA 신약 심사관 역할') | 모델 이름은 화면마다 안내 한 줄에 '(Claude)'로 한 번 밝힌다(3.1 · 3.2 · 3.3 · 4.1 · 4.2 · 학습 · 전광판). 배지에는 넣지 않는다. 실제 기관 이름(식약처 · FDA · 특허청)을 AI 배지에 붙이지 않는다(심사관 프롬프트 `aiIdentity` 와 같은 원칙). |
| 시간 | 기간은 **{n}게임 일**, 시점은 **D+{day}**(게임 시계가 시작된 뒤 지난 게임 일), 시계는 **게임 시계** | '게임 날짜' · '{day}일째(게임 날짜)' · '게임 일 {now} / {end}' · '수업 시계' | 실제 시간은 '실제 시간 10분'처럼 '실제'를 붙인다. 심사 횟수의 '하루'가 실제 날인지 게임 일인지는 아직 정하지 않았다(5절). |
| IND | **IND(임상시험 계획 승인 신청)** | 'IND(임상시험 계획 승인)' · 'IND(임상시험 계획 신청)' · '임상시험계획' | 승인은 'IND가 승인되면'으로 쓴다. |
| 프로토콜 | **프로토콜(임상시험 계획서)** | '임상시험 설계 계획서' · '임상시험의 방법과 절차를 정한 계획서' | |
| 허가 | **NDA(신약 허가 신청)** · **품목 허가** · **품목 허가증** | '품목허가' | 허가 기관 이름은 아직 정하지 않았다(5절 4.2). |
| 교사 | **선생님** | 교사(학생 화면에서) | 교사 화면 문구는 이 묶음 밖이다. |
| 띄어쓰기 | **p 값** · **후보 물질** · 가운뎃점은 앞뒤를 띄운다(`A · B`) | 'p값' · '후보물질' · 'A·B' | 화면 문구에 백틱(`` ` ``)을 쓰지 않는다. |

## 4. 마지막 점검에서 맞춘 꼴

### 4.1 키 이름

- 키는 `단계.자리.용도`. 단계 접두는 `1.2` · `2.1-2.2` · `3.1` · `3.2` · `3.3` · `4.1` · `4.2` · `board` · `learn` · `reviewer` 다.
- **키 조각은 camelCase** 로 쓴다(코드 `*_COPY` 객체가 그렇다 — 예: `PATENT_COPY.doneWhen` · `knownChip`).
- **밑줄 조각은 코드의 값 · 식별자와 같은 이름일 때만 남긴다**(예: `within_10x` · `mech_why` · `tick_short` · `calc_match` · `alt_assay`). 남은 밑줄 조각 67개는 모두 `packages/web-contract/src` · `apps/server/src` · `apps/web/src` 에 같은 이름이 있다.
- 이 규칙으로 키 216개의 이름을 바꿨다(3.1 · 87, 3.2 · 33, 3.3 · 1, 4.1 · 34, 심사관 · 61). 대응표는 부록 A. **각 `review.md` 는 바꾸기 전 이름으로 적혀 있다.**
- 4.1 의 잎 · 가지 겹침 3곳을 풀었다. `protocol.endpoint` · `power.low_warn` · `result.primary.read` 는 문구이면서 `.phase1` 의 가지였다. 그래서 2 · 3상용 기본 문구를 `.default` 로 옮겼다(`4.1.protocol.endpoint.default` · `4.1.power.lowWarn.default` · `4.1.result.primary.read.default`).
- 4.1 표만 키 · 자리표시자 칸에 백틱이 없었다. 다른 단계처럼 백틱을 씌웠다.
- `2.1-2.2.` 접두는 그대로 두었다(나눌지는 5절 질문).

### 4.2 돈 자리표시자

- 단계마다 달랐다. 2.1-2.2 · 3.2 · 4.1 · 4.2(일부)는 '숫자만 넣고 문구가 크리스타를 붙임'이었다. 1.2 · 3.1 · 3.3 · 학습 · 전광판은 '값에 단위까지 듦'이었다.
- **전 단계를 '값에 단위까지 듦'으로 맞췄다.** 돈 값(`{cost}` · `{fee}` · `{unitCost}` · `{costLeft}` · `{crista}` · `{balance}` · `{initial}` · `{totalSpent}` · `{totalIncome}` · `{c}` · `{cap}` · `{amount}` …)은 `formatCrista()` 기본값('1,500,000 크리스타')으로 채운다. 문구에 '크리스타'를 다시 쓰지 않는다.
- 이유: 지금 `formatCrista()` 기본값이 단위를 붙인다. 그리고 값이 늘 '크리스타'로 끝나니 뒤 조사를 가 · 를 · 는 · 예요로 정할 수 있다('{fee}을(를)' → '{fee}를').
- 이 때문에 2.1-2.2 · 3.2 · 4.1 · 4.2 의 돈 줄에서 ' 크리스타'를 뺐다. 문구 안 고정 금액('500,000 크리스타')은 그대로다.

### 4.3 전광판 소식 줄의 주인

같은 전광판 소식이 기능 단계 묶음과 전광판 묶음에 따로 있었다(코드에서는 한 자리). **기능 단계 키를 주인으로 정했다.** 전광판 쪽 줄은 주인과 같은 글로 맞추고 근거 칸에 `(키 겹침: …)` 을 적었다. 코드에는 주인 키 하나만 넣는다.

| 전광판 키 | 주인 키 | 맞춘 것 |
| --- | --- | --- |
| `board.news.patentWithDisease` | `3.1.ledger.headline` | 이미 같음 |
| `board.news.patentNoDisease` | `3.1.ledger.headlineNoDisease` | '— 신약 후보 물질 {code}' → '— {code}' |
| `board.news.preclinicalDone` | `3.2.board.headline` | `{code}` → `{codeName}`(코드 인자 이름) |
| `board.news.indApproved` | `3.3.approval.boardApproved` | '첫 임상 준비' → '첫 사람 시험 준비' |
| `board.news.indHeld` | `3.3.approval.boardHeld` | 이미 같음 |
| `board.news.approval` | `4.2.board.headline` | 이미 같음 |
| `board.news.learnStreak` | `learn.board.streakNews` | 이미 같음 |
| `board.news.funding` · `fundingSeriesA` · `fundingSeriesB` | `learn.board.pitchNews` | '투자 유치 성공' → '투자 유치'(자리표시자 이름 `{amount}` · `{c}` 는 반영 때 하나로) |

### 4.4 마지막 점검에서 고친 문구(요약)

| 주제 | 고친 키 |
| --- | --- |
| 주력 · 백업 | `2.1-2.2.s21.cards.stamp` · `confirmOther.body` · `s22.intro.done` · `s22.cand.note` · `s22.cand.legacy`, `3.1.ledger.note`(3.1 때는 아직 주력을 정하지 않으므로 '출원할 특허 후보가 있으면'으로), `learn.pitch.quant.affinity` · `quant.ind` · `quant.noDocking` · `qual.a1` · `qual.a2` · `a.prompt` |
| 보류 · 재도전 이름 | `4.1.viz.706.title`('실패 후 갈림길' → '보류 뒤 갈림길') · `4.1.viz.706.read`, `4.2.receipt.failNote`('보류(실패)' → '보류'), `board.holdKind.operational` · `board.holdKind.both` |
| 모둠 · 스타트업 | `3.1.doc.inventors.guide` · `3.1.rule.inventorNotMember`, `3.2.ethics.retry`, `4.2.brand.tip1` · `brand.sameAsCompany` · `board.privacyNote` |
| 기업가치 | `board.rank.label` · `rank.finalLabel` · `drawer.rank` · `news.rankLeader` · `news.finalNotice` · `color.green` · `val.band.zero` · `final.twoAxisHint`, `4.2.tabs.resultDesc` · `stock.title` |
| 크리스타 | 돈 자리표시자 줄(2.1-2.2 · 4줄, 3.2 · 3줄, 4.1 · 8줄, 4.2 · 6줄 + '{fee}을(를)' → '{fee}를' 2줄), `4.2.receipt.head` 는 '연구비 영수증'(사용자 결정 2026-10-24) |
| AI 표시 | `3.2.protocol.review.summaryHead`, `3.3.revise.itemHeader` · `feedbackHeader` · `pendingNotice` · `overview.summary3`, `4.2.review.feedbackTitle` · `submit.aiReviewerBadge` · `submit.aiNotice`, `learn.result.aiNote` |
| 시간 | `3.2.animal.progress` · `animal.runInfo`, `4.1.recruit.backupWait` · `running.status` · `recruit.curve.desc`, `learn.drawer.path.stipend` · `stipend.help` · `stipend.paused` |
| 풀이 말 | IND: `3.2.ethics.card.why.body` · `protocol.section.purpose.guide` · `protocol.checklist`, `3.3.overview.oneLine`, `4.1.intro.locked`, `board.val.band.ind`, `learn.pitch.b.locked`. 프로토콜: `4.2.pack.provisional` · `board.final.encouragement` |
| 표기 | `4.2` 가운뎃점 띄우기 10줄 · 'p 값' · '후보 물질' · '품목 허가', `4.1.viz.705.title`('E·S' → 'E · S'), `2.1-2.2.s21.stairs.note`(문구 안 백틱 제거) |
| 전광판 겹침 | 4.3 표의 6줄 |

## 5. 코드 반영 방법(8b 통합 뒤)

1. **8b 통합이 끝난 뒤** 한다. 그 전에는 `apps/` · `packages/` 를 고치지 않는다.
2. 단계 묶음 하나를 2절 표의 파일 하나에 넣는다. 위치는 `packages/web-contract/src/<기능>.ts` 의 `<기능>_COPY` 객체다. 심사관 묶음만 `apps/server/src/reviews.ts` · `features/clinical-sim.ts` 다.
3. 키 → 객체 경로: 단계 접두를 떼고 점마다 한 겹씩 들어간다. 예: `3.1.review.aiBadge` → `PATENT_COPY.review.aiBadge`, `4.1.power.lowWarn.default` → `CLINICAL_COPY.power.lowWarn.default`. 근거 칸에 기존 자리(`PATENT_COPY.…` · `COPY.…`)가 적혀 있으면 그 자리의 글을 바꾼다. 바꿀 때 기존 키 이름을 쓰는 화면 코드도 함께 고친다.
4. 자리표시자:
   - 값을 넘기는 꼴은 지금 코드를 따른다. `screenFill` 식 `{name}` 치환을 쓰거나, 기존 함수 인자를 쓴다. 자리표시자 이름은 바꾸지 않는다.
   - 돈 값은 `formatCrista(v)` 기본값으로 채운다(4.2절).
   - `(새)` 라고 적힌 자리표시자는 지금 API 응답에 없을 수 있다. 8b 에 칸을 더할 수 있는지 먼저 확인한다(5절 4.2 · 3.1 질문).
5. 식별자 · 숫자 · 규칙 값(문턱 · 금액 · 기간)은 바꾸지 않는다. 문구만 바꾼다. 숫자는 `review.md` 에서 설계 · 코드와 대조했다.
6. 전광판 소식은 4.3절 표의 주인 키 한 곳에만 넣는다.
7. 심사관 묶음: `reviewer.common.rule.*` 와 서류별 `rule.*` · `ex.*` · `avoid.*` 를 조립한다(그 `copy.md` 머리말). 프롬프트를 바꾸면 심사관 판(`patent-v1` 등) · `CLINICAL_SIM_VERSION` · `graderVersion` 을 올린다.
8. 넣은 뒤 `npm run typecheck` · 테스트를 돌린다. 화면 몇 곳은 브라우저로 본다. 그 뒤 `copy.md` 상태를 '반영됨'으로 바꾼다.

## 6. 사용자 확인 질문 모음

### 6.0 마지막 점검에서 생긴 질문(단계 사이)

1. **'주력 후보' 표기**: 학생 문구는 '주력 리드' 대신 '주력 후보'로 맞췄습니다. 설계 문서와 코드(`learn.ts` `QUANT_LABEL.affinity` '주력 리드 결합력 · PLIP')도 반영 때 '주력 후보'로 바꿀까요?
2. **Series A 의 주력 점수**: Series A 는 2.2 가 끝나면 신청할 수 있습니다. 그런데 주력은 3.2 전임상 끝에 정합니다. Series A 채점의 '주력 후보 결합력 · PLIP(25점)'은 무엇을 기준으로 보나요(예: 결합력이 가장 좋은 특허 후보)? 문구도 거기에 맞춰야 합니다.
3. **순위 이름**: 학생 화면의 '시가총액 순위'를 '기업가치 순위'로 바꿨습니다(코드 `MARKET_COPY.rank.label` 은 지금 '시가총액 순위'). 이대로 갈까요?
4. **시점 표기 D+**: 3.2 · 4.1 의 '{day}일째(게임 날짜)' · '게임 일 {now} / {end}'를 4.2 처럼 'D+{day}'로 맞췄습니다. 학생이 D+를 처음 보는 3.2 진행 표시에 풀이를 붙일까요?
5. **돈 자리표시자 꼴**: 전 단계를 '값에 단위까지 듦(`formatCrista` 기본)'으로 맞췄습니다(4.2절). 이 꼴로 확정할까요? 2.1-2.2 의 `{cost}` 질문은 이것으로 풀립니다.
6. **키 꼴**: 키 조각을 camelCase 로 바꾸고, 밑줄은 코드 값과 같은 이름에만 남겼습니다(4.1절). 4.1 의 '밑줄 허용' 질문은 이것으로 풀립니다. 이 규칙으로 확정할까요?
7. **AI 배지**: 4.2 배지에서 '식약처 · FDA 신약 심사관 역할'을 떼고 'AI 심사'만 남겼습니다. 역할은 안내 문장('AI 심사관(Claude)이 신약 허가 심사관 역할로 서류를 읽어요')으로 옮겼습니다. 모델 이름은 화면마다 안내 한 줄에서만 '(Claude)'로 밝힙니다. 이렇게 갈까요?
8. **전광판 소식 주인**: 겹친 소식 줄은 기능 단계 키를 주인으로 정했습니다. 그래서 전광판 문구가 'IND 승인 — … 첫 사람 시험 준비'(지금 코드 '첫 임상 준비')와 '투자 유치'('성공' 뺌)로 바뀌었습니다. 괜찮을까요?
9. ~~**영수증 머리**~~ → **확정(사용자 결정 2026-10-24)**: `4.2.receipt.head` 는 '연구비 영수증'이에요('CRISTA' 를 붙이지 않음). 코드(`approval.ts`)는 8b 가 화폐 점검 때 바꿔요.
10. **4.2 `rule.phase3Fail`**: '같은 프로토콜로 4.1 임상 3상을 먼저 통과해야'의 '같은 프로토콜로'가 재도전 경로 이름('같은 프로토콜로 다시')과 헷갈립니다. 빼도 될까요?

### 6.1 1.2 화합물 스크리닝(9)

1. 농축도는 `market.ts` `PROCESS_RULES['1.2']` 에서 기업가치 과정 점수(가중치 2, 비공개)로 쓰입니다. 설계 §5.16 도 이를 과정 점수로 적습니다. 그런데 학생 문구(`1.2.score.note`)는 '판정과 연구비에는 쓰지 않아요'까지만 말합니다. 학생에게 '기업가치에는 반영돼요'를 알릴까요?
2. '220종'을 글에 고정할까요, `{total}` 로 둘까요? §6.1.1 의 나머지 8 표적 라이브러리도 220종인지 정해지지 않았습니다.
3. `shop.controlNote` 의 '4인 병렬 발굴' 점수 문구를 유지할까요? 1.2 과정 점수(투표 참여 · 다시 논의 · 찜 근거)를 학생에게 따로 보일까요?
4. Ro5 '2개까지' 단추는 서버가 0 · 1만 받는 동안 '준비 중'으로 흐리게 보일까요, 숨길까요?
5. 찜 코치 문구에서 주의 · 막음 표식을 떼고 화면 표식(`coach.stop` · `coach.think`)에 맡겨도 될까요?
6. 실행 단추에 비용을 넣을까요(`1.2.run.run` '스크리닝 실행 ({cost})')? 확인 창과 겹칩니다.
7. 1.2 연구 노트 3칸에 설계 §5.5 ⑤ 의 1.2 전용 질문(`1.2.note.*`)을 붙일까요? 지금 코드는 모든 단계에 같은 칸 이름(`NOTE_SECTION_LABEL`)을 씁니다.
8. `1.2.brief.dur.link` 는 복용 기간 답을 '구조 경고 · Ro5 안건'과 잇습니다. 복용 기간과 Ro5(흡수)의 관계는 약합니다. Ro5 를 빼고 구조 경고만 남길까요?
9. 기존 `SCREEN_COPY.shop.claimWhy` 의 '연구 노트에 함께 남아요'를 반영 때 같이 고칠까요, 아니면 연구 노트에 찜 근거를 실제로 보이게 할까요?

### 6.2 2.1 도킹 · 2.2 ADMET(10)

1. 키 접두 `2.1-2.2.` 를 다른 묶음과 합칠 때 `2.1.` · `2.2.` 로 나눌까요?
2. 이미 알려진 물질 칩 문구가 둘입니다(2.1 '특허를 받으려면 구조를 바꿔야 해요' · 2.2 '특허 불가 — 변형체 필요'). 하나로 합칠까요?
3. 2.1 넷째 탭 이름을 지금 코드의 '분자 고치기'에서 설계 이름 '구조 바꿔 다시 도킹'으로 바꿔도 될까요?
4. 3.1 출원 상한 `{patentMax}`: 학급마다 1~4로 설정하게 할까요(§12-12), 3건으로 고정할까요(§5.7)?
5. `{gap}` 은 서버가 부호 없는 크기로 넘기게 맞출까요? 지금 코드는 더 강한 분자의 gap 을 음수로 넘깁니다(`{cost}` 쪽은 6.0-5 로 풀림).
6. 시안 `viz-4.js` 의 note 두 곳이 옛 번호 '3.2 제형'을 씁니다(지금은 3.3). 시안도 고칠까요?
7. `within_10x` 의 맞음 문구가 `ok` · `okStronger` 둘입니다. 서버가 크기만 넘기고 깊음 · 얕음에 따라 고르게 나눌까요?
8. ADMET 읽는 법을 '애드멧'(을)과 '에이디엠이티'(를) 중 무엇으로 맞출까요? 지금 'ADMET을' · 'ADMET 를'이 섞여 있습니다.
9. `s21.intro.body` 가 4문장이 되어 '단계 소개 2~3문장'과 어긋납니다. '구조를 조금 고쳐 다시 도킹해 볼 수도 있어요'를 빼고 탭 이름에 맡길까요?
10. 새 8표적의 사전 도킹(시드 50 + 공통 30)에 히스타민(CHEMBL90)이 들어가나요? 없으면 그 표적에서는 수심계의 히스타민 이정표를 숨겨야 합니다.

### 6.3 3.1 물질특허(10)

1. 칸 예시(`*.example`)를 설계 예시(SEUM · ACHE · 알츠하이머)로 고정할까요, 모둠 표적 값으로 바꿀까요? 바꾼다면 표적 종류(효소 · 수용체 · 수송체)별 예시 3벌을 만들까요?
2. '모둠'과 '우리 스타트업': 용어집대로 사람은 '모둠', 회사 이름 · 티커는 '스타트업'으로 맞췄습니다. 괜찮을까요?
3. 심사 횟수(출원서 1건당 하루 5회 · 모둠 하루 15회)의 '하루'는 실제 하루인가요, 게임 일인가요? 남은 횟수 `{left}` 를 보이려면 `PatentsResponse` 에 칸이 필요합니다.
4. 이의 제기 버튼 문구(§5.11 ⑦)는 `PATENT_API` 에 경로가 없습니다. 문구만 먼저 둘까요, 구현 때까지 뺄까요?
5. 인젝션 표시(`3.1.review.flagInjection` — '선생님께 알림이 갔어요')를 학생 화면에 보일까요?
6. 원장 규칙 '먼저 받아들여진 모둠이 이긴다': 심사가 비동기라 먼저 낸 모둠도 질 수 있습니다. 학생에게 따로 설명할까요?
7. 등록 소식의 기업가치 변동 폭(0~5% · 기본 2%)을 3.1 화면에 숫자로 보일까요?
8. `3.1.review.quotaGuide` 의 `{left}` 는 출원서 1건 기준(5회)인가요, 모둠 기준(15회)인가요? 학급 하루 상한에 걸렸을 때도 `quotaExhausted` 하나로 보일까요?
9. `code.problem.taken` · `code.ok` · `code.locked` · `err.codeTaken` 에는 `{code}` 가 있습니다. 서버 409 응답은 고정 문장이라 코드명이 없습니다. 화면에서만 채울까요, 서버 오류에 코드명을 넣을까요?
10. `err.patentInUse` 의 '주력 · 백업 후보로 정함'이 3.2 지정이라는 것을 단계 번호로 밝힐까요?

### 6.4 3.2 전임상 · 동물실험(10)

1. 설계 §5.9 ② 는 심의 결과를 '승인 / 보완' 둘로 적었습니다. 코드 `ui.verdict` 에는 reject '거절'도 있습니다. 학생 화면에 '거절'을 보일까요? 보인다면 언제인가요?
2. 종 · 이유 칸의 '서버가 채우는 것'을 설계대로 '—'로 둘까요, '랫드 + 비글견(고정)'으로 보일까요?
3. `3.2.pick.backupWhy`('다른 약점을 가진 분자를 고르면 함께 막힐 위험이 줄어요')는 설계 본문의 규칙이 아닙니다(Stock & Molinoff 2002 바탕). 넣을까요?
4. 계획서 개선 칸 예시 '진통제 · 마취제로 고통을 줄여요'는 PTGS2(관절염) 모델과 충돌합니다. 예시를 표적마다 다르게 할까요?
5. 딜레마 문장의 '절반으로'는 실제로 82 → 46(약 56%)입니다. 문구는 '절반 가까이'로 고쳤습니다. 설계 문장도 맞출까요?
6. 서술 칸 10자와 종료시점 1~50이 둘 다 `{min}` 을 씁니다. `{sectionMin}` · `{endpointMin}` / `{endpointMax}` 로 나눌까요?
7. 나머지 8개 표적의 효력 모델 · 고통등급 · 종료시점이 정해지면(§12-15) `animal.models` 와 예시를 다시 써야 합니다. 일정은 언제인가요?
8. `3.2.calc.indNote` 의 '이 시뮬레이션에서는 … 안전이 보장되는 것은 아니에요'를 3.3 의 IND · MRSD 안내와 맞출까요?
9. `review.pending` 처럼 '오래 걸리면 선생님이 직접 처리할 수 있어요'(§5.11 ⑥)를 학생에게 알릴까요?
10. `3.2.animal.runInfo` 가 '많이 141마리'도 실행 마릿수로 보여 줍니다. '많이'는 규칙상 늘 보완이라 승인될 수 없습니다. 실행 안내에서 '많이'를 뺄까요?

### 6.5 3.3 제형 · IND(9)

1. 정맥 · 경피를 고른 학생은 공식만으로 ④ MRSD 칸을 채울 수 없습니다(공식은 경구 MRSD 만 냄). 그런데 규칙 `calc_match` 는 고른 제형의 MRSD 와 견줍니다. '3.2 결과판의 제형별 값을 보고 적기'로 둘까요, 계산 칸을 경구 MRSD 로 고정할까요?
2. 임상 판정을 LLM 이 정하게 바뀌었습니다(F41). `IND_COPY.preShake` 와 시안 6.02 · 6.09 의 흔들림 숫자 ±6 · ±4 도 뺄까요?
3. 관문 기준 숫자(35 · 50 · 40 · 45 · 55)를 글에 그대로 둘까요, 서버 `rules.thresholds` 로 채우는 자리표시자로 바꿀까요?
4. 같은 서류 판으로 캐시된 심사 결과도 신청서 1건당 하루 5회 한도에 세나요?
5. ⑤ 중단 기준 예시의 실제 임상 관행 숫자(QTc 500 ms · ALT 정상 상한 3배)는 설계 밖입니다. 그대로 둘까요, 숫자 없는 예시로 바꿀까요?
6. ④ 서버 자동 첨부에 HED · MRSD 가 먼저 보이면 계산 칸은 베껴 쓰기가 됩니다. 첨부를 계산 칸이 맞은 뒤에 보일까요?
7. 시험 제목 예시의 '경도 알츠하이머병'을 모둠의 실제 질환 `{disease}` 로 바꿀까요?
8. 서류 보완 횟수가 기업가치 과정 점수에 들어갑니다. 보완 요구가 '무료'라는 안내만 있습니다. 과정 점수 반영도 3.3 화면에서 미리 알릴까요?
9. IND 도 실패 바운티 50% 환급 대상입니다. `approval.heldNotice` 에 '원인 분석을 내면 수수료 일부를 돌려받을 수 있다'를 넣을까요?

### 6.6 4.1 임상 1 · 2 · 3상(12)

1. 임상 판정(통과 · 보류)도 AI 시뮬레이션이 정한다는 `4.1.ai.verdictNote` 를 학생에게 보일까요? 교사 화면에만 있는 참고 규칙 판정까지 밝힐까요?
2. AI 배지에 모델 이름(Claude Opus 5.5)을 넣을까요? 지금은 배지 'AI 시뮬레이션 · 교육용' · 안내 'AI(Claude)'입니다(6.0-7 과 함께 정해 주세요).
3. 바운티 환급 상한(낸 비용 × 요율, 기준 비용 × 요율, crista 캠페인 상한 4,500,000 크리스타 중 가장 작은 값)을 '최대 …'로 알릴까요? crista 의 상한을 그대로 써도 될까요?
4. `tabs.retry`('보류 뒤 재도전')를 걸음 ①~⑤ 밖의 여섯째 탭으로 둘까요, ⑤ 결과 · 분석 안에 합칠까요?
5. 시안 7.03 · 7.04 · 7.05 는 참고 규칙(흔들림 ±6 / ±4)을 그립니다. 판정은 AI 가 하므로 헷갈릴 수 있습니다. 학생 화면에 어느 그림을 넣을까요?
6. 시안 7.07(간트) · 7.08(연구비 계단)은 옛 규칙 · 옛 비용표로 그려졌습니다. F41 규칙으로 다시 그릴까요?
7. 문장 안의 규칙 상수(군 비율 · 참고 기준 · 75% · 1/3 · 10%p · 60초 · S ≥ 35)도 자리표시자로 바꿀까요?
8. 용량 · 제형 변경의 비용 · 대기: 설계 §5.14 는 '제형이 바뀌면 3.3 IND 다시', 시안 7.06 은 'IND 다시 · 30일'인데 서버 `routeOptions` 는 수수료 0 · 대기 0 입니다. 문구는 서버를 따랐습니다. 어느 쪽이 맞나요?
9. 설계 §5.14 ⑤ 의 '연구 노트 3칸' 안내가 4.1 초안에 없습니다. 공통 노트 문구에서 다루나요, 4.1 에 넣을까요?
10. 시안 7.02 는 '같은 흔들림이 E 와 S 에 함께 더해진다'고 그립니다. 서버 `referenceFor` 는 E · S 에 따로 뽑은 흔들림을 쓰고, 인원이 적으면 폭을 넓힙니다. 시안을 서버에 맞출까요?
11. `4.1.power.target`({targetPower}%)은 2 · 3상 화면에만 보여야 합니다(1상은 `power.1.desc`). 통합 때 확인이 필요합니다.
12. (풀림 확인) 키 이름 밑줄 허용 → 6.0-6 의 규칙으로 정했습니다.

### 6.7 4.2 허가(11)

1. 게임 속 허가 기관을 무엇으로 할까요? 시안 도장은 'FDA · NDA', §5.3 예시는 'FDA 허가', '품목 허가증'은 식약처 용어입니다. 정리본은 기관 이름 없이 도장 위 글을 'NDA 승인'으로 두었습니다.
2. 허가증 위 글: 기존 '품목 허가증 · New Drug Application'은 '신청서'라는 뜻이라 허가증과 맞지 않습니다. 정리본은 '신약 허가 신청(NDA) 승인'으로 바꿨습니다. 영문(예: NDA Approval)을 남길까요?
3. 전광판 헤드라인 끝말은 무엇으로 할까요? §5.15 '허가', §5.3 'FDA 허가', 기존 COPY '신약 품목 허가', 시안 '최종 허가'가 다릅니다. 정리본은 기존 COPY 를 유지했습니다.
4. 영수증 빨간 줄 표시: 용어집대로 '✕ 보류'로 맞췄고 풀이의 '보류(실패)'도 '보류'로 바꿨습니다. 기존 COPY 의 '✕ 실패'를 버려도 될까요?
5. 허가 날 제형 배율(경구 1.3 · 경피 1.15 · 정맥 1.0)의 이유를 학생에게 설명할까요? 설계에 근거가 없어 정리본에서는 뺐습니다.
6. `{clinicalDays}` · `{docLeft}` · `{teamLeft}` 는 지금 API 응답에 없습니다. 8b 가 줄 수 있을까요? (`{progressPct}` · `{elapsed}` 는 `submittedGameDay` · `decideGameDay` · `gameDay` 로 화면에서 계산할 수 있습니다.)
7. 영수증(8.08)의 근거인 claude.ai 게시본을 읽지 못해 저장소 시안으로 대신했습니다. 원문과 다른 칸이 있는지 확인해 주세요.
8. `brand.stale`: 409 오류 뒤 화면이 지금 이름을 자동으로 불러오나요, [지금 이름 불러오기] 단추를 눌러야 하나요? 단추라면 '지금 이름을 불러왔으니'를 고쳐야 합니다.
9. `nda.indicationGood`: 고정 예시(알츠하이머)와 모둠 값 `{endpoint}` 가 한 칸에 섞여 있습니다. 모둠 질환 예시로 바꿀까요, `{endpoint}` 를 뺄까요?
10. `stock.eventIndHold` · `eventPhaseHold` 의 '▼{pct}%': `{pct}` 가 음수로 오면 '▼-5%'처럼 부호가 두 번 붙습니다. 부호 없는 값으로 넘기나요?
11. `submit.dailyLimit`: 한도는 LLM 을 부르는 심사만 셉니다. 이걸 학생에게 알릴까요? '하루'는 실제 날인가요, 게임 일인가요?

### 6.8 학습 연구비(9)

1. 피치 글자 수: 설계는 200~500자, 코드 `LEARN_TEXT_LIMITS.pitch` 는 100~800자, 기존 `pitchPromptA/B` 에는 200~500이 박혀 있습니다. 문구는 `{min}~{max}` 로 두었습니다. 어느 값에 맞출까요?
2. 'CRL' 표기: 실제 CRL 은 허가 신청(NDA)에 대한 보완 요구 회신이고, 임상 중단은 clinical hold 입니다. 학생 문구에서 약어를 빼고 '임상 보류'로만 쓸까요?
3. 복습 문항 안내는 W7 에서 구현하는 기능이라 지금 서버에 없습니다. 구현 전까지 숨길까요?
4. 서버는 최근 30분 안에 모둠원이 화면을 본 모둠에만 기초 연구비 틱을 줍니다. 설계에 없는 조건입니다. 학생에게 알릴까요?
5. 설계 문서끼리 어긋난 곳(8단계 합계 · Series A 시점 · §9 교사 승인 · $ 표기 · 피드백 200 / 300자)을 3판과 코드에 맞춰 고칠까요?
6. 위 띠 칩에 ⚡ 아이콘을 넣을까요? 설계 S1 그림에는 있고 지금 코드에는 없습니다.
7. `result.underThreshold` 의 '한 번 고쳐 낼 수 있어요'는 이미 고쳐 낸 뒤에도 보이면 틀린 안내가 됩니다. 첫 시도에만 보일까요, '아직 고쳐 내지 않았다면'을 붙일까요?
8. `note.sharedProgress` 의 `{k}` · `{n}` 은 `chip` 의 `{k}` · `{n}` 과 이름은 같고 뜻이 다릅니다. 코드에 넣을 때 `{authors}` · `{needed}` 로 나눌까요?
9. (풀림 확인) `learn.board.*` 와 전광판 묶음의 겹침 → 4.3절처럼 학습 쪽을 주인으로 정했습니다.

### 6.9 전광판 · 기업가치 · 최종 순위(11)

1. 설계 §5.16 은 모집 완료 · 임상 시작 같은 과정 소식에도 기업가치 변동을 붙인다고 합니다. 구현은 notice 로 올려 변동이 0입니다. 설계대로 작은 변동을 줄까요?
2. 4.1 모집 전략 과정 점수가 집중 1 · 확대 0.8 · 기본 0.6 이라 돈을 많이 쓸수록 점수가 높습니다. '돈 ↔ 시간 선택'이라는 학습 목표와 어긋납니다. 점수 규칙을 바꿀까요?
3. 1.2 기준 합의 · 스크리닝 완료 · 재도전 시작 3종을 LED 띠 소식으로 흘릴까요? 지금 서버에는 없습니다.
4. 화폐 표기: 학생 문구는 모두 '크리스타'로 맞췄습니다. 서버 투자 소식(`learn.ts` '13,500,000 CRISTA')과 위 띠의 'CRISTA'도 '크리스타'로 바꿀까요?
5. 마감 때 진행 중인 임상은 기본안 ①(진행 중으로 두고 기업가치에 넣지 않음)로 확정할까요?(§12-21)
6. '곧 마감' 경고는 마감 몇 분 전에 띄울까요?
7. 시상대에 상 이름(최우수 등)을 쓸까요? 2축 순위의 연구 역량 1위도 따로 시상할까요?
8. 전임상 완료 소식의 기업가치 변동: 설계 §5.9 는 0%, 구현(`MARKET_EXTRA_BANDS.preclinical`)은 0~5%(기본 2%)입니다. 정리본은 구현을 따랐습니다. 어느 쪽으로 맞출까요?
9. '운영 문제' 보류의 뜻: brief · `CLINICAL_COPY` 는 '모집 · 탈락', 시뮬레이션 지시와 4.1 정리본은 '완료 비율 75% 미만'만 봅니다. 하나로 정해 주세요.
10. 마감 뒤 최종 순위표에서 모든 학생이 다른 모둠의 과정 점수(평균)를 봐도 될까요? 설계 §5.3 과 `market.ts` 의 '점수는 그 모둠 · 교사만' 원칙과 다릅니다.
11. `board.drawer.stepStatus.active` 키를 `running` 으로 바꿨습니다. 이 키를 이미 참조한 통합 작업이 있으면 같이 바꿔야 합니다.

### 6.10 심사관 · 시뮬레이터 말투(10)

1. 4.1 분석 서술 길이: 설계 §5.13 은 '지적 80자 · 피드백 300자'인데 구현 `SIM_TEXT_MAX` 는 analysis 400자 · recommendation 200자입니다. 그대로 둘까요, 300자로 줄일까요?
2. 4.1 해설은 통과 · 보류와 보류 종류는 말하고, 돈 · 환급 · 상 기간 · 기업가치 · 전광판은 말하지 않게 했습니다. 이 선이 맞나요?
3. `HOW_TO_TALK_TO_STUDENTS` 는 학습 연구비 채점도 함께 씁니다. 공통 줄을 채점에도 그대로 쓸까요, 나눌까요? 바꾸면 `graderVersion` 도 올립니다.
4. 학생 글에 자해 · 괴롭힘 같은 위기 신호가 있을 때 지금 flags 4종에는 해당 칸이 없고, 교사 알림은 injection 에만 갑니다. `safety_concern` 플래그와 교사 알림을 더할까요? 8b 코드 · 스키마를 바꿔야 합니다.
5. 선행 특허 검사(Tanimoto ≥ 0.85)는 아직 꺼져 있습니다. 조건부 줄을 지금 넣을까요, 검사를 켤 때 넣을까요?
6. 시스템 프롬프트 예시에 `{dG}` 같은 자리표시자를 둘까요, 시안 숫자(예: 개 NOAEL 18 mg/kg/일)를 넣을까요? 숫자는 LLM 이 베낄 수 있어 초안은 자리표시자로 했습니다.
7. 서류마다 단락을 따로 두려면 `buildReviewSystemPrompt` 가 kind 별 단락을 받도록 바뀌고 심사관 판을 v2 로 올려야 합니다. 이 구조로 가도 될까요?
8. '같은 프로토콜로 다시'를 하면 결과가 같아야 하나요? 설계 §5.14 괄호는 '같은 입력이면 같은 결과', 구현은 시도 번호를 입력 해시에 넣어 새 결과를 냅니다. §12-19 를 구현대로 확정하고 §5.14 괄호를 고칠까요?
9. 백업 후보가 있는지를 시뮬레이터 사실(`buildSimUserMessage`)에 넣을까요? 넣으면 입력 해시와 `CLINICAL_SIM_VERSION` 이 바뀝니다.
10. 4.1 해설 조립에서 공통 줄 `aiIdentity` 를 뺐습니다. 해설에 'AI 시뮬레이션' 자기 표시 줄을 둘까요, 화면 배지 · 안내에 맡길까요?

## 부록 A. 키 이름 대응표(마지막 점검)

바꾼 것은 밑줄 조각뿐이다. 조각이 같으면 그 단계의 모든 키에서 똑같이 바뀌었다. `review.md` 의 키 이름을 찾을 때 이 표로 옮겨 읽는다.

- **3.1(87개)**: `abandon_confirm`→`abandonConfirm` · `abandon_patent_btn`→`abandonPatentBtn` · `ai_badge`→`aiBadge` · `ai_notice`→`aiNotice` · `all_ok`→`allOk` · `appeal_btn`→`appealBtn` · `appeal_guide`→`appealGuide` · `balance_at_accept`→`balanceAtAccept` · `balance_ok`→`balanceOk` · `board_head`→`boardHead` · `board_note`→`boardNote` · `card_guide`→`cardGuide` · `changed_after`→`changedAfter` · `claim_substance`→`claimSubstance` · `claim_use`→`claimUse` · `class_setting`→`classSetting` · `code_stale`→`codeStale` · `code_taken`→`codeTaken` · `disclosure_note`→`disclosureNote` · `doc_stale`→`docStale` · `done_when`→`doneWhen` · `duplicate_at_accept`→`duplicateAtAccept` · `duplicate_ok`→`duplicateOk` · `fee_note`→`feeNote` · `fingerprint_note`→`fingerprintNote` · `fingerprint_title`→`fingerprintTitle` · `flag_injection`→`flagInjection` · `format_line`→`formatLine` · `format_ok`→`formatOk` · `headline_no_disease`→`headlineNoDisease` · `inventor_not_member`→`inventorNotMember` · `item_status`→`itemStatus` · `known_chip`→`knownChip` · `last_editor`→`lastEditor` · `limit_at_accept`→`limitAtAccept` · `limit_ok`→`limitOk` · `live_exists`→`liveExists` · `llm_note`→`llmNote` · `locked_reviewing`→`lockedReviewing` · `new_app`→`newApp` · `next_reject`→`nextReject` · `next_revise`→`nextRevise` · `no_candidate`→`noCandidate` · `no_candidates`→`noCandidates` · `no_properties`→`noProperties` · `no_review`→`noReview` · `no_section`→`noSection` · `not_abandonable`→`notAbandonable` · `not_editable`→`notEditable` · `not_reviewable`→`notReviewable` · `novelty_ok`→`noveltyOk` · `old_revision`→`oldRevision` · `old_revision_at_accept`→`oldRevisionAtAccept` · `old_target`→`oldTarget` · `old_target_note`→`oldTargetNote` · `open_app`→`openApp` · `open_btn`→`openBtn` · `patent_in_use`→`patentInUse` · `precheck_btn`→`precheckBtn` · `prior_art_ok`→`priorArtOk` · `prior_art_revise`→`priorArtRevise` · `prior_art_skipped`→`priorArtSkipped` · `quota_exhausted`→`quotaExhausted` · `quota_guide`→`quotaGuide` · `red_row_note`→`redRowNote` · `request_btn`→`requestBtn` · `rules_head`→`rulesHead` · `same_as_ref`→`sameAsRef` · `same_molecule`→`sameMolecule` · `sections_head`→`sectionsHead` · `server_filled`→`serverFilled` · `split_note`→`splitNote` · `substance_note`→`substanceNote` · `summary_head`→`summaryHead` · `summary_note`→`summaryNote` · `three_r`→`threeR` · `tone_paragraph`→`toneParagraph` · `why_head`→`whyHead` · `withdraw_app_btn`→`withdrawAppBtn` · `withdraw_confirm`→`withdrawConfirm`
- **3.2(33개)**: `ai_badge`→`aiBadge` · `ai_notice`→`aiNotice` · `backup_why`→`backupWhy` · `change_review`→`changeReview` · `done_condition`→`doneCondition` · `efficacy_tox`→`efficacyTox` · `explain_ok`→`explainOk` · `explain_wrong`→`explainWrong` · `ind_note`→`indNote` · `lead_rule`→`leadRule` · `mrsd_animals`→`mrsdAnimals` · `mrsd_chart`→`mrsdChart` · `need_approval`→`needApproval` · `need_ethics`→`needEthics` · `no_new_verdict`→`noNewVerdict` · `no_study`→`noStudy` · `not_cns`→`notCns` · `run_info`→`runInfo` · `safety_pharm`→`safetyPharm` · `saved_animals`→`savedAnimals` · `server_fills`→`serverFills` · `step_title`→`stepTitle` · `summary_head`→`summaryHead` · `who_needs`→`whoNeeds`
- **3.3(1개)**: `no_plan`→`noPlan`
- **4.1(34개)**: `ai_analysis`→`aiAnalysis` · `ai_rec`→`aiRec` · `backup_wait`→`backupWait` · `change_rule`→`changeRule` · `cost_duration`→`costDuration` · `done_when`→`doneWhen` · `dose_fit`→`doseFit` · `estimate_note`→`estimateNote` · `game_note`→`gameNote` · `low_mrsd`→`lowMrsd` · `low_safety`→`lowSafety` · `low_warn`→`lowWarn` · `min_need`→`minNeed` · `no_amend`→`noAmend` · `no_backup`→`noBackup` · `no_budget`→`noBudget` · `no_mrsd`→`noMrsd` · `no_transdermal`→`noTransdermal` · `over_mrsd`→`overMrsd` · `phase1_onc`→`phase1Onc` · `phase3_done`→`phase3Done` · `ref_prob`→`refProb` · `reset_phase1`→`resetPhase1` · `retry_rule`→`retryRule` · `sample_size`→`sampleSize` · `scale_note`→`scaleNote` · `screen_fail`→`screenFail` · `sim_timing`→`simTiming` · `teacher_override`→`teacherOverride` · `verdict_note`→`verdictNote` · `who_oncology`→`whoOncology`. 잎 · 가지 겹침: `protocol.endpoint` → `protocol.endpoint.default`, `power.low_warn` → `power.lowWarn.default`, `result.primary.read` → `result.primary.read.default`
- **reviewer(61개)**: `action_verb`→`actionVerb` · `after_phase3`→`afterPhase3` · `ai_identity`→`aiIdentity` · `all_ok`→`allOk` · `anatomy_mech`→`anatomyMech` · `brand_respect`→`brandRespect` · `calc_by_rules`→`calcByRules` · `calm_ae_and_sim_notice`→`calmAeAndSimNotice` · `code_name_only`→`codeNameOnly` · `dg_direction`→`dgDirection` · `dg_sign`→`dgSign` · `exact_output_numbers`→`exactOutputNumbers` · `expected_scores_note`→`expectedScoresNote` · `facts_only`→`factsOnly` · `failure_shame`→`failureShame` · `game_context_only`→`gameContextOnly` · `gloss_terms`→`glossTerms` · `held_efficacy`→`heldEfficacy` · `held_operational`→`heldOperational` · `held_safety`→`heldSafety` · `ind_is_approval`→`indIsApproval` · `length_and_term`→`lengthAndTerm` · `medical_advice`→`medicalAdvice` · `minor_safety`→`minorSafety` · `mock_brand`→`mockBrand` · `monitor_by_signal`→`monitorBySignal` · `next_phase`→`nextPhase` · `no_anti_animal`→`noAntiAnimal` · `no_ghostwrite`→`noGhostwrite` · `no_grant_promise`→`noGrantPromise` · `no_hype`→`noHype` · `no_medical_or_gore`→`noMedicalOrGore` · `no_overlap_smiles`→`noOverlapSmiles` · `no_repeat`→`noRepeat` · `no_verdict_money`→`noVerdictMoney` · `nonsig_not_zero`→`nonsigNotZero` · `off_topic_injection`→`offTopicInjection` · `other_team`→`otherTeam` · `pack_and_fee_by_rules`→`packAndFeeByRules` · `patient_readable_caution`→`patientReadableCaution` · `phase3_bound`→`phase3Bound` · `phase_purpose`→`phasePurpose` · `praise_and_fix`→`praiseAndFix` · `promise_license`→`promiseLicense` · `prove_or_zero`→`proveOrZero` · `reduction_tradeoff`→`reductionTradeoff` · `replacement_depth`→`replacementDepth` · `retry_amend`→`retryAmend` · `retry_backup`→`retryBackup` · `retry_same`→`retrySame` · `retry_three_paths`→`retryThreePaths` · `rules_vs_narrative`→`rulesVsNarrative` · `same_when_luck`→`sameWhenLuck` · `section_name`→`sectionName` · `spec_consistency`→`specConsistency` · `species_and_count`→`speciesAndCount` · `stat_gloss_and_caution`→`statGlossAndCaution` · `stop_three_parts`→`stopThreeParts` · `three_r_gloss`→`threeRGloss` · `use_deliberation`→`useDeliberation` · `verdict_allowed_no_money`→`verdictAllowedNoMoney`
- 1.2 · 2.1-2.2 · 학습 · 전광판은 이름을 바꾼 키가 없다(남은 밑줄 조각은 모두 코드 이름과 같다).
