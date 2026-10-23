# 전광판 · 기업가치 · 최종 순위 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon (High) · `~/.local/bin/agy --model gemini-4-argon-high --effort high --mode plan` · **한 번에 성공** · 종료 코드 0 · 표준 오류 없음 → `gemini-run.log` 0바이트)
- 결과: `copy.md`(키 262개 = Gemini 255 + Claude 보충 7 · Claude 수정 44줄)
- 대조 자료: 설계 §0 · §5.2 · §5.3 · §5.16 · §10 · §12-21 / 공통 지시 `../2026-10-24-copy-common/brief.md` 'FMARKET' / `packages/web-contract/src/market.ts`(`MARKET_COPY` · `PROCESS_RULES` · `RESULT_POINTS` · `researchIndexOf` · `formatCapM` · `formatPrice`) / `packages/game-rules/src/market/analyst.ts`(`PIPELINE_ANALYST_BANDS` · `ANALYST_BANDS` · `approvalDefaultChangePct` · `defaultAnalystRating` · `dockingDefaultChangePct`) / 서버 `apps/server/src/features/market.ts`(`bandFor` · 과정 신호 값 · 투자의견 입력) · `clinical.ts` · `ind.ts` · `learn.ts`(소식 꼴) — 모두 읽기만 했다.
- 표기: 각 항목은 `원문 → 고친 문구 · 이유`. '그대로'는 고치지 않았다는 뜻이다.
- 작업 중 8b 세션이 `market.ts` 를 고쳤다: `formatCapM` 이 `5,000만 크리스타`, `formatPrice` 가 `50.00 크리스타` 를 내고, `listing` 소식이 `$10.00` 대신 `formatPrice` 를 쓴다. 이 정리본은 그 판에 맞췄다.

## 전체 판단

Gemini 원문은 변동 범위 숫자(특허 0~5 · IND 0~5 / −8~0 · 1상 0~8 / −12~−2 · 2상 3~15 / −18~−5 · 3상 5~18 / −20~−8 · 허가 8~20 · 12% × 제형 배율 최대 20% · 투자 5~15 · 도킹 0~12 · 전임상 0~5 · 학습 0~2 · 항체 ±5 · 정정 ±20)를 하나도 틀리지 않았다. 과정 점수(30 미만 0 · 최대 +3% · 감점 없음), 결과 점수 배점, 연구 역량 공식, 1,000,000주, Series 상한, 바운티 요율도 맞다. `$` · '텃밭' · 'FDA 허가'는 쓰지 않았다.
고친 것은 주로 ① 코드와 다른 사실(투자의견은 '가장 최근 소식 하나'의 변동률로 정한다 · 순위 단추 꼴 · 과정 신호의 실제 뜻) ② 과학 풀이가 모호한 곳(농축도 · kcal/mol · 3R 용어 · IND 보류) ③ 기업가치와 연구비를 섞은 설명 ④ 화면이 따로 그리는 기호를 문구에 넣은 곳이다.

## ① 설계 사실 대조(금액 · 기간 · 문턱 · 법 조항 · 통계)

| 항목 | 원문 | 판정 |
| --- | --- | --- |
| 결과 소식 변동 범위 · 기본값 | `board.val.band.*` 12줄 | 모두 맞음(`PIPELINE_ANALYST_BANDS` · `ANALYST_BANDS` · `MARKET_EXTRA_BANDS`와 같음) |
| 허가 배율 | 경구 1.3 → 15.6 · 경피 1.15 → 13.8 · 정맥 1.0 → 12 · 모름 1.0 · 최대 20 | 맞음 |
| 도킹 기본값 공식 | 2 + 8 × min(1, (−ΔG − 7) / 5) · 문턱 −7.0 kcal/mol | 맞음(학생용 풀이로 바꿈 — 아래 4) |
| 과정 점수 | 가중 평균 × 100 · 30 미만 0 · 30~100 → 0 ~ +3% · 감점 없음 · 보완 1 ÷ (1 + n ÷ 2) | 맞음(문장만 나눔 — 아래 7) |
| 결과 점수 | 5×2 · 8×3 · 10 · 12 · 8/10/12 · 20 · 5×2 · 5×4 · 상한 100 | 맞음 |
| 연구 역량 지수 | 평균 × 커버율(÷ 9) × 0.8 + 다양성 × 20 | 맞음 |
| 투자 | A 최대 15,000,000 · B 최대 25,000,000 크리스타 · 바닥 30% · 기본 A 8% · B 12% | 맞음 |
| 임상 | 90 · 180 · 360 게임 일 · 바운티 IND · 1상 50% · 2상 40% · 3상 30% | 맞음 |
| 최종 순위 순서 | 기업가치(시가총액) 순 | 맞음(`rankRows` = `rankMarketCap`) |
| 공개 범위 | 서랍 · 과정 소식에 비공개 값 없음 | 맞음 |

고친 사실:

1. `board.val.ratingDesc` · `board.val.rating.*`(5줄) — "최근 변동률이 +6% 이상으로 신약 개발 성과가 아주 뛰어날 때…" → "가장 최근 소식의 변동률이 +6% 이상일 때예요." · 서버는 `defaultAnalystRating(row.lastChangePct)` — 24시간 등락이 아니라 **바로 앞 소식 하나**의 변동률로 정한다. '성과가 아주 뛰어날 때' · '재설계가 필요한 상태' 같은 해석은 규칙에 없어서 뺐다. SHORT WARNING 에만 "임상 보류 같은 악재 뒤에 자주 켜져요"를 남겼다(임상 보류의 기본값 −6 · −12 · −15% 가 모두 −3% 아래라 사실).
2. `board.rank.unlistedValue` — "— / {listed}" → "— / {listed} · {cap}" · 코드 `rank.value` 는 순위가 없을 때도 시가총액을 붙인다.
3. `board.rank.title` — "상장된 {listed}개 스타트업 가운데 시가총액 {rank}위({cap})예요. 누르면 우리 모둠의 공개 정보 서랍이 열려요." → "누르면 우리 모둠 공개 서랍이 열려요. 다른 모둠이 보는 것과 같은 정보예요." · §5.2 의 핵심 사실('다른 모둠이 보는 것과 같은 공개 정보')이 빠졌고, 단추 글(`rank.value`)과 숫자가 겹쳤다. 기존 키에는 인자가 없다.
4. `board.val.band.docking` — "결합 에너지(ΔG)가 −7.0 kcal/mol(킬로칼로리 퍼 몰, 숫자가 낮을수록 더 강하게 결합함)… 기본값은 2 + 8 × min(1, (−ΔG − 7) / 5)%예요." → "… ΔG(낮을수록, 곧 음수로 클수록 단단히 붙음)가 −7.0 kcal/mol(분자 1몰이 붙을 때 나오는 에너지 단위) 이하이고 학급 최고 기록보다 낮을 때만 신기록이에요. 기본값은 ΔG가 −7에서 −12 kcal/mol로 갈수록 2%에서 10%까지 커져요." · 'kcal/mol' 풀이가 읽는 법뿐이라 단위 뜻을 넣었다. 공식은 같은 뜻을 학생 말로 풀었다(−7 → 2%, −12 → 10%, 그 아래는 10%에서 멈춤 — 흔들림으로 최대 12%).
5. `board.process.keyDesc.recruit` — "비용과 기간의 균형 및 검정력(…)을 고려해 모집 전략을 세웠는지 봐요" → "고른 참여자 모집 투자 단계(기본 · 확대 · 집중)를 봐요" · 서버 신호는 고른 단계만 본다(집중 1 · 확대 0.8 · 기본 0.6). 검정력 · 시작 시점은 재지 않는다. 있는 그대로 적고, 설계와 어긋나는 점은 ⑥-2 로 올렸다.
6. `board.process.keyDesc.resilience` — "포기하지 않고 원인을 분석해 재도전했거나 보류 없이 진행했는지" → "보류가 난 뒤 다시 도전해 이어 갔는지 봐요. 보류 없이 진행한 경우도 높게 봐요." · 신호는 원인 분석(바운티)을 보지 않는다(보류가 있으면 1 · 없으면 0.8).
7. `board.process.keyDesc.animal_level` — "꼭 필요한 만큼만 … 마릿수를 알맞게 줄였는지" → "동물을 필요한 최소 마릿수만 쓰는 수준을 골랐는지 봐요. 적은 수준일수록 높게 봐요." · 신호는 고른 수준(low 1 · standard 0.7 · 그 밖 0.4)이다.
8. `board.drawer.programDesc` — "신약 후보 물질에 붙인 고유 개발 기호예요" → "그 모둠이 가장 최근에 등록한 물질특허의 코드명이에요(예: SEUM-102)." · 서랍의 `programCode` 는 '가장 최근 유효 특허의 코드명'이다.

## ② 자리표시자 바뀜 / 새로 생김

| 키 | 자리표시자 | 처리 |
| --- | --- | --- |
| `board.news.listing` · `board.val.initialValue` | `{listPrice}`(새) | 지금 코드 `listing(ticker, name)` 은 안에서 `formatPrice(LISTING_PRICE_USD)`(= `50.00 크리스타`)를 붙인다. 문구 틀로 옮길 때 인자로 받을지 8b 가 정한다. |
| `board.val.initialValue` | `{listCap}`(새 — Claude) | 첫 시가총액(`formatCapM(10)` = `5,000만 크리스타`). 숫자를 박지 않으려고 만들었다. |
| `board.news.processEval` | `{step}` → `{stepId}`(Claude 수정) | 기존 `process.headline(ticker, stepId, title, facts)` 인자 이름에 맞췄다. |
| `board.news.screeningConsensus` | `{n}` · `{m}`(Claude) | 공개 사실(기준 투표 n/m명)만 싣는다. |
| `board.news.recruit*` · `trialStart*` · `trialPass*` · `trialHold*` · `retry*` | `{phase}` · `{next}` · `{who}` · `{holdKind}`(새) | 서버는 지금 템플릿 문자열 안에서 `PHASE_LABEL` · `healthy ? '지원자' : '환자'` · `CLINICAL_COPY.holdKind` 를 직접 넣는다. `{phase}` 에는 '1상'처럼 '임상'이 빠진 값이 들어오므로 문구 쪽에 '임상'을 둔 틀이 맞다(지금 보류 줄은 `{phase} 보류`라 '임상'이 없다 — 통일 권장). |
| `board.news.funding*` | `{round}` · `{amount}`(새) | **지금 서버(`learn.ts`)는 `13,500,000 CRISTA` 처럼 영문 단위**를 쓴다. 규칙 5('크리스타')에 맞게 `formatCrista` 의 단위도 함께 정해야 한다(⑥-4). |
| `board.news.teacherCorrection` · `teacherNotice` | `{body}`(새) | 지금 서버(`checkNotice`)는 교사가 쓴 글 앞에 `◆ ` 만 붙인다. 틀을 쓰려면 정정에 `{ticker}` 를 넣는 서버 변경이 필요하다. |
| `board.val.priceFloor` | `{floor}`(새) | 하한 $0.10 = `0.50 크리스타`(`formatPrice(PRICE_FLOOR_USD)`). |
| `board.deadline.*` | `{endsAt}` · `{left}`(새) | '곧 마감' 문턱(몇 분 전)은 정해지지 않았다(⑥-6). |
| `board.val.up/down/*Aria` | `{pct}`(새) | `formatPct` 가 기호와 함께 만드는 값 — 낭독기 줄은 절댓값을 넣어야 한다("{pct}% 내렸어요"에 `−` 가 겹치지 않게). |
| `board.process.facts.recruit` · `animal_level` | `{tier}` · `{level}` | **지금 서버는 저장 값(`focus` · `expanded` · `low` · `standard`)을 그대로 넣는다** → 화면에 `모집 전략 focus` · `마릿수 수준 low` 처럼 영어가 보인다. 한글 라벨(기본 · 확대 · 집중 / 3.2 의 마릿수 수준 이름)로 바꿔 넣는 대응표가 필요하다(8b). |

## ③ 과학적으로 틀리거나 모호한 비유

1. `board.process.keyDesc.enrichment` — "농축도(전체 물질 가운데 실제 유망한 후보를 얼마나 조밀하게 골라냈는지 나타내는 비율)" → "농축도(걸러 낸 후보 속 아는 약 계열 비율이 처음 라이브러리보다 몇 배 높아졌는지)" · 농축도는 '비율'이 아니라 **배수**다 — `screen.ts` 정의 `(k / n) ÷ (K / total)`. '유망한 후보'는 기준이 아니고 '아는 약 계열'이 기준이다.
2. `board.process.keyDesc.alt_assay` — "3R(동물실험 윤리 3원칙 — 대체 · 축소 · 고통 완화)" → "3R(동물실험 윤리 원칙 — 대체 · 감소 · 개선)" · 3.2 정리본(`../2026-10-24-copy-3.2/copy.md`)의 용어 대체(Replacement) · 감소(Reduction) · 개선(Refinement)에 맞췄다. 개선은 고통 완화만이 아니라 사육 환경 · 인도적 종료시점까지 넓다.
3. `board.process.keyLabel.no_hold` · `keyDesc.no_hold` — "IND 심사 보류 없음 / 안전성이나 서류 미비로 보류된 적이 없는지" → "IND 보류 없음 / IND가 보류(승인 기준을 넘지 못함) 없이 승인됐는지" · IND 보류는 접수 뒤 **규칙 판정**의 결과다. 서류 미비는 '보완 필요'(보류 아님)이고 `revisions` 가 따로 센다.
4. `board.news.retryDoseForm` — "용량 · 제형 변경 IND 재개" → "용량 · 제형 바꿔 IND 변경 신청" · 4.1 의 경로 이름은 'IND 변경'이다. '재개'는 멈춘 IND 를 다시 연다는 뜻으로 읽힌다.
5. `board.val.whatIs` — "신약의 성공 가능성과 연구 과정을 시장이 평가한 금액이에요" → "우리 회사가 얼마짜리인지 보여 주는 숫자예요. 이 수업에서는 연구 소식이 나올 때마다 규칙에 따라 오르내려요." · 이 게임에는 사고파는 시장이 없다(매매 없음). '시장이 평가'는 실제 주식시장처럼 읽혀 `board.val.noTrading` 과 부딪친다.
6. `board.val.initialValue` — "…첫 기업가치를 시작해요. 새 스타트업의 초기 연구비는 10,000,000 크리스타예요." → 연구비 문장을 빼고 `board.val.notFund`(보충)로 "기업가치는 연구비와 다른 숫자예요. 기업가치가 올라도 연구비 잔액은 늘지 않아요…"를 따로 두었다 · 한 칸에 두 돈을 나란히 두면 '기업가치 = 쓸 수 있는 돈'으로 오해하기 쉽다. 실제로 기업가치 변동은 원장에 입금하지 않는다.
7. `board.val.band.funding` — "Series A · B(스타트업이 연구 단계 성과에 따라 차례로 받는 대규모 후속 투자) … (바닥 30% 보장)" → "(연구 성과를 보고 투자자가 차례로 넣는 투자 — A가 먼저, B가 다음) … 심사 점수가 낮아도 최대액의 30%는 받아요." · Series A 는 첫 기관 투자라 '후속'이 맞지 않고, '바닥 30% 보장'은 풀이가 없었다.
8. 그대로: `board.news.trialStartP3` '대규모 확증 시험'(3상 = 효능 · 안전 둘 다 확인 — 실제 3상의 성격과 맞음) · `board.val.band.patent` '분자 구조 자체를 독점할 수 있는 권리' · `board.process.keyDesc.recruit` 원문의 검정력 풀이(뜻은 맞았으나 신호가 재지 않아 뺐다).

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

1. `board.live` — "● LIVE" → "LIVE" · 깜빡이는 점은 화면(`LedBand.tsx` 의 `<i />`)이 따로 그린다. 문구에 넣으면 점이 두 개가 된다.
2. `board.process.formula` — 한 문장에 '가중 평균 → 30 미만 → 최대 3% → 감점 없음 → 보완 공식'까지 다섯 생각 → 세 문장으로 나누고, 보완 공식은 `board.process.revisionRule`(보충)로 뺐다. '곧장 올려 주며'(즉시라는 뜻으로 읽힘) → '점수에 비례해'.
3. `board.val.noTrading` — "오직 모둠의 연구 결과와 과정 소식인 펀더멘털(…)만으로" → "기업가치는 연구 소식(펀더멘털 — 회사의 실제 성과)만으로 움직여요." · 수식어가 겹친 문장을 줄였다.
4. `board.val.deterministicBand` — 세 생각을 세 문장으로. '학급과 소식이 같으면' → '같은 학급의 같은 소식이면'(서버는 학급 id + 소식 키로 흔든다). '%p' 를 '퍼센트포인트'로 풀었다.
5. `board.val.band.approval` — '제형' 풀이가 없었다 → "제형(먹는 약 · 주사 · 붙이는 패치처럼 약을 몸에 넣는 꼴)".
6. `board.final.researchHint` — '4인 발굴 다양성' 풀이를 더했다.
7. `board.process.keyDesc.quorum` · `claim_reasons` · `variants` — "정족수를 채워 투표한 인원 비율"(뜻이 꼬임) → "투표에 참여한 모둠원 비율 … 정족수(결정을 내리는 데 필요한 최소 인원)" / "과학적 근거를 함께 적어 낸" → "근거를 단 … 근거는 데이터와 맞아야 해요"(근거 칩은 고르는 것이고, 데이터와 틀리면 서버가 막는다) / "물성을 높이기 위해" → "물성을 좋게 하려고"(물성은 높일수록 좋은 값이 아니다).
8. `board.news.teacherNotice` · `teacherCorrection` — '교사' → 학생 화면은 '선생님'(기존 `MARKET_COPY` 와 같음). 정정 꼴은 설계 §5.3 예 `◆ 정정: MIRP 2상 판정 재계산` 에 맞춰 `◆ 정정: {ticker} {body}`.
9. `board.final.podium1~3` — "최우수 · 우수 · 장려 스타트업" → "1위 · 2위 · 3위" · 상 이름은 설계에 없다(⑥-7).
10. `board.final.approvedYes/No` — "예 / 아니오" → "✓ 허가 / —" · 기존 키와 같게 — 색 말고 기호로도 구분한다(§5.4 상태 표시 원칙).
11. `board.drawer.stepStatus.held` — "재설계하고 있어요"(다른 모둠이 정말 재설계 중인지 모른다) → "기준을 넘지 못했어요. 다시 도전할 수 있어요."
12. `board.drawer.recent` — "최근 공개 소식(8건)" → "최근 공개 소식" · 건수는 상수(`DRAWER_RECENT`)라 문구에 박지 않는다.
13. `board.teacher.schedule` · `clearSchedule` · `noticeTeam` — 원문이 "정하기" · "지우기" · "정정할 모둠"으로 줄이면서 뜻이 빠졌다 → 기존 키 문구 "마감 시각 정하기" · "마감 시각 지우기" · "정정할 모둠(공지는 비워 두세요)".
14. 그대로: 소식 줄(`board.news.*`)은 헤드라인 꼴, 나머지는 모두 해요체로 확인했다. 원문 근거 칸의 `COPY.PATENT_COPY.…` 처럼 겹친 접두는 `PATENT_COPY.…` 로 정리했다(내용 수정 아님 — 수정 표시 없음).

## ⑤ 기존 COPY 키와 대응(맞출 키 · 새 키)

- **그대로 맞는 키**(`MARKET_COPY.` 접두를 `board.` 로 바꾼 꼴): `board.{label, empty, live, paused, pause, resume, aiTag, aiTitle, newsAria, finalTag}` → `MARKET_COPY.board.*` · `board.rank.{label, finalLabel, value, title, finalTitle}` → `rank.*`(`unlistedValue` 는 `rank.value` 의 rank 없음 분기) · `board.drawer.*`(23개) → `drawer.*` · `board.final.{title, previewTitle, frozenAt, podium, table, cols.*, approvedYes, approvedNo, trend, trendAria, myProcess, allProcess, notYet, resultHint, processHint, researchHint, close}` → `final.*` · `board.process.keyLabel.*` · `facts.*`(21 + 21) → `process.keyLabel.*` · `process.facts.*` · `board.news.processEval` → `process.headline` · `board.news.{docking, listing, rankLeader, finalNotice / finalNoticeEmpty, reopenNotice}` → 최상위 함수 · `board.teacher.*` → `teacher.*` · `board.errors.*` → `errors.*`.
- **다른 단계 COPY 로 맞출 키**: `board.news.patentWithDisease` · `patentNoDisease` → `PATENT_COPY.headline` · `preclinicalDone` → `PRECLINICAL_COPY.board.headline` · `indApproved` · `indHeld` → `IND_COPY.board.{approved, held}` · `approval` → `APPROVAL_COPY.board.headline` · `board.holdKind.*` → `CLINICAL_COPY.holdKind.*`(같은 값을 두 곳에 두지 말고 하나만 — 4.1 정리본과 맞출 것) · 임상 소식(`recruit*` · `trialStart*` · `trialPass*` · `trialHold*`)과 투자 · 학습 소식은 **지금 COPY 키가 없고 서버 안 템플릿 문자열**(`clinical.ts` · `learn.ts`)이다 → `MARKET_COPY.news.*` 또는 `CLINICAL_COPY.board.*` 로 옮기는 것을 권장.
- **새 키(코드에 자리 없음)**: `board.news.{screeningConsensus, screeningDone, retrySame, retryDoseForm, retryBackup, teacherCorrection, teacherNotice, antibodyTrackInfo}` · `board.color.*` · `board.reducedMotion` · `board.openDrawerHint` · `board.val.*`(설명 전부) · `board.process.{whatIs, formula, revisionRule, privacy, keyDesc.*}` · `board.drawer.{programDesc, stepStatus.*}` · `board.final.{intro, podium1~3, myTeamRow, rankingRule, twoAxisHint, ongoingTrialRule, encouragement, reason.*}` · `board.deadline.*`.
  - 이 중 **소식 꼴 새 키는 서버에 그 소식이 아직 없다**: 1.2 합의 · 스크리닝 완료(지금은 과정 평가 소식으로만 나감), 재도전 시작 3종(지금은 모집 · 시작 소식으로만 보임). 문구만 두고 소식을 낼지는 8b · 사용자가 정한다(⑥-3).
- **값이 바뀐 기존 키**(뜻은 같고 문체만): `board.empty`(기존 '◆ 다른 모둠이 등기하면…' — 원문은 ◆ 를 뺐다. 빈 띠도 LED 글씨로 보이면 ◆ 를 붙여도 된다) · `board.rank.finalLabel`('최종 순위' → '최종 시가총액 순위') · `board.final.title` · `board.teacher.title`('전광판 · 기업가치 · 최종 순위' → '전광판 · 마감 관리') · `board.errors.teamNotFound`.

## ⑥ 사용자 확인이 필요한 것

1. **과정 소식의 변동(설계 ↔ 구현)** — 설계 §5.16 은 "과정 소식(1.2 합의 · 모집 완료 · 임상 시작 등)에도 변동을 붙인다"인데, 지금 서버는 모집 완료 · 임상 시작을 `notice` 로 올려 **변동 0** 이고, 과정은 단계가 끝날 때 한 번(0 ~ +3%)만 움직인다. 정리본 `board.val.band.zero` 는 **구현대로** "변동 0%"라 적었다. 설계대로 모집 완료 · 임상 시작에도 작은 변동을 줄지 정해 주세요.
2. **4.1 모집 전략 점수** — 서버 신호가 집중 1 · 확대 0.8 · 기본 0.6 이라 **돈을 많이 쓸수록 과정 점수가 높다**. 설계 §5.16 · §12-20 의 학습 목표('돈 ↔ 시간 선택 · 검정력과 시작 시점')와 어긋난다. 문구는 사실대로 '고른 단계를 봐요'로만 두었다. 점수 규칙을 바꿀지(예: 검정력 게이지를 채운 시작 · 남은 연구비와 견준 선택) 정해 주세요.
3. **새 소식 종류** — 1.2 기준 합의 · 스크리닝 완료 · 재도전 시작(같은 프로토콜 · IND 변경 · 백업 교체)을 LED 띠에 따로 흘릴지. 흘리면 띠가 바빠지고(10건만 보임), 안 흘리면 정리본의 그 키 5개는 버린다.
4. **화폐 단위 표기** — 규칙 5는 '크리스타'인데 `formatCrista` · 투자 소식 · 학습 연구비 화면은 `CRISTA`(영문)를 쓴다. 전광판 · 시가총액(`formatCapM`)은 이번에 '크리스타'로 바뀌었다. 학급 전체를 '크리스타'로 통일할지, 위 띠처럼 `CRISTA` 를 남길지 정해 주세요.
5. **마감 때 진행 중이던 임상**(§12-21) — 정리본 `board.final.ongoingTrialRule` 은 기본안 ①('진행 중으로 두고 기업가치에 넣지 않음')로 썼다. ② · ③ 으로 바꾸면 이 줄을 고친다.
6. **'곧 마감' 경고 시점** — `board.deadline.soon` 을 몇 분 전에 띄울지(예: 10분 전). 정해지지 않아 `{left}` 로만 두었다.
7. **시상대 상 이름** — 원문의 '최우수 · 우수 · 장려'는 설계에 없어 '1위 · 2위 · 3위'로 바꿨다. 상 이름을 쓸지, 연구 역량 1위도 따로 시상할지(2축 순위) 정해 주세요.
8. **항체 트랙 소식 문구** — 같은 띠에 오르지만 문구는 7c 세션이 정한다. 정리본은 설명 한 줄(`board.news.antibodyTrackInfo`)만 두었다.

## 독립 검증(2차)

- 날짜: 2026-10-24 · 검증자: Claude Opus 5.5(앞 작성자와 다른 실행). 앞 결론을 믿지 않고 다시 대조했다.
- 대조 자료: 설계 §0 · §5.2 · §5.3 · §5.9 · §5.16 · §10 · §12 / `../2026-10-24-copy-common/brief.md` 'FMARKET' · '이미 정한 것' / `packages/web-contract/src/market.ts` · `clinical.ts` · `preclinical.ts` · `screen.ts` · `packages/game-rules/src/market/analyst.ts` / 서버 `apps/server/src/features/market.ts`(`SIGNALS` · `onDockingSucceeded` · `marketDrawer` · `rankRows` · `marketFinal`) · `clinical.ts`(소식 꼴 · 바운티) · `apps/server/src/pipeline.ts`(`computeSteps`) / 웹 `apps/web/src/board/ui/bits.tsx`(`STATE_MARK`) · `board/market/FinalStandings.tsx`. 모두 읽기만 했다.
- 기계 대조: `gemini-raw.md` ↔ `copy.md` 의 키 · 자리표시자 · 문구를 스크립트로 비교했다. 원문에서 바뀐 44줄은 모두 `(Claude 수정)` 표시가 있다(표시 없는 변경 0). 원문 키 255개는 모두 남아 있다. 화면 문구에 `$` 는 없다.

### 다시 확인한 사실(맞음)

- 변동 범위 · 기본값 15종이 `PIPELINE_ANALYST_BANDS` · `ANALYST_BANDS` · `MARKET_EXTRA_BANDS` 와 같다. 허가 배율(경구 1.3 → 15.6 · 경피 1.15 → 13.8 · 정맥 1.0 → 12, 최대 20)과 도킹 공식(−7 → 2%, −12 → 10%)도 맞다.
- 투자의견 문턱(≥ 6 · ≥ 1.5 · > −3 · 그 밖)은 `defaultAnalystRating` 과 같다. 입력은 서버 `last_pct`(상장을 뺀 가장 최근 변동)라서 '가장 최근 소식 하나'라는 앞 수정이 맞다.
- 과정 점수(가중 평균 × 100 · 30 미만 0 · 최대 +3%), 보완 값 1 ÷ (1 + n ÷ 2), 결과 점수 배점(합 136 → 상한 100), 연구 역량(× 0.8 + 다양성 × 20 · ÷ 9), 최종 순위 = 시가총액 순(`rankRows` → `rankMarketCap`)이 맞다.
- 크리스타 환산: 1 크리스타 = 20 센트라서 $1 = 5 크리스타다. 상장가 $10 → `50.00 크리스타`, 시가총액 $10M → `5,000만 크리스타`, 하한 $0.10 → `0.50 크리스타`, Series A 15,000,000 크리스타 = $3M(§5.3 예와 같음), $0.001M = 5,000 크리스타. 모두 맞다.
- 임상 기간 90 · 180 · 360 게임 일, 바운티 요율, 판정만 AI 시뮬레이션이 정한다는 예외, 상 기간이 끝나는 게임 일 공개가 brief 와 같다.

### 이번에 고친 것(`(검증 수정)` 16줄 · `(검증 보충)` 7줄 → 키 269개)

1. `board.rank.value` — 문구에 없는 `{listed}` 가 자리표시자 칸에 있었다 → 칸을 `{rank}`, `{cap}` 로 맞췄다(표 칸 ↔ 문구 불일치).
2. `board.val.initialValue` — "{listCap}이 첫 기업가치예요" → "곱한 값({listCap})이 …" · `{listCap}` 은 늘 '…만 크리스타'(받침 없음)라 '이'가 틀린 조사가 된다.
3. `board.deadline.scheduled` — "{endsAt}로 … 남은 시간은 {left}예요" → "{endsAt}에 수업이 마감돼요. 마감까지 {left} 남았어요." · `{left}`(예: '12분')는 받침으로 끝나 '예요'가 틀린다. 조사가 붙지 않는 꼴로 바꿨다.
4. `board.val.band.docking` — "학급 최고 기록보다" → "같은 표적의 학급 최고 기록보다" · 서버 `onDockingSucceeded` 는 같은 학급 · **같은 표적**의 앞 신기록과만 비교한다.
5. `board.news.indHeld` — "… 계획 보완 착수"를 뺐다 → 기존 `IND_COPY.board.held` 와 같은 꼴. 그 모둠이 정말 보완을 시작했는지 서버는 모른다(백업 후보로 바꿀 수도 있다). 앞 작성자가 `stepStatus.held` 에서 '재설계하고 있어요'를 뺀 것과 같은 이유다. 임상 보류의 '재설계 중'은 설계 §5.3 예 · 서버 문구에 있어 그대로 두었다.
6. `board.val.band.trialPass` — 한 문장에 '판정 주체 + 공개 시점' 두 생각 → 두 문장으로 나눴다. 'AI 시뮬레이션' → 'AI(Claude) 시뮬레이션'(설계 예외 이름 그대로). '끝나는 날' → '끝나는 게임 일'.
7. `board.val.band.trialHold` — 서버는 **운영 문제 보류에는 바운티를 주지 않는다**(`CLINICAL_COPY.bountyOperational`). 이 예외를 한 문장으로 더했다. 또 '실패 바운티'를 풀었고, 임상 보류 설명에 섞여 있던 'IND' 요율을 뺐다(임상 비용 환급만 남김 — IND 50%는 IND 보류 쪽 사실).
8. `board.val.band.approval` — 제형 풀이 "약을 몸에 넣는 꼴"은 **투여 경로**의 뜻이라 틀렸다 → "알약 · 주사액 · 붙이는 패치처럼 약을 만든 모양". 처음 나오는 '경구 · 경피 · 정맥 · 품목 허가'를 풀었고, 괄호 안의 긴 목록을 한 문장으로 풀어 썼다(숫자는 그대로).
9. `board.val.band.zero` — '교사 공지' → '선생님 공지'(학생 화면 용어 — 앞 작성자가 다른 줄에서 정한 규칙과 같게).
10. `board.val.priceFloor` — 한 문장 두 생각 → 두 문장.
11. `board.process.formula` — '가중 평균'을 처음 쓰면서 풀지 않았다 → "(중요한 항목에 더 큰 비중을 둔 평균)".
12. `board.process.privacy` — "과정 점수는 우리 모둠과 선생님만 봐요"는 **마감 뒤에는 사실이 아니다**. `FinalStandings.tsx` 가 모든 학생에게 모둠별 `processScore`(단계 평균)를 보인다. 수업 중(단계별 점수 · 비공개 신호)과 마감 뒤(최종 순위표의 평균)를 나눠 썼다.
13. `board.process.keyDesc.quorum` — "정족수보다 많이 참여할수록" → "정족수만 채우기보다 모두 참여할수록 높아요" · 서버 값은 투표한 사람 ÷ 모둠원 수라서 정족수 문턱과 관계가 없다.
14. `board.process.keyDesc.revisions` — '3.2 전임상 계획서' → '3.2 동물실험계획서'(서버가 세는 서류는 `iacuc_protocols`). 한 문장 두 생각도 나눴다.
15. `board.drawer.stepStatus.*` — 웹 `STATE_MARK` 의 상태 이름은 `running` · `ready` 다. ① 키 `active` → `running`(▸ 진행 중) ② 빠진 `ready`(· 할 수 있음)를 보충했다. ③ `blocked` 의 "선행 조건이나 연구비가 부족해" → "연구비가 모자라 시작하지 못하는 단계예요" · 서버 `computeSteps` 는 연구비가 모자랄 때만 `blocked` 를 내고, 선행 조건은 `locked` 의 몫이다. 참고: 서랍(`teamSteps`)은 연구비를 무한으로 두고 계산해 다른 모둠 서랍에는 `blocked` 가 나오지 않는다. 범례를 내 화면과 같이 쓸 때를 위해 줄은 남겼다.
16. **보충** `board.process.tier.{basic, expanded, focus}`(기본 · 확대 · 집중) · `board.process.level.{low, standard, high}`(적게 · 알맞게 · 많이) — 앞 작성자가 지적한 '`모집 전략 focus` · `마릿수 수준 low` 처럼 영어 저장값이 화면에 나옴'을 고칠 대응표가 정리본에 없었다. 4.1 정리본 · `PRECLINICAL_COPY.levels.*.label` 과 같은 말로 채우고, `facts.recruit` · `facts.animal_level` 근거 칸에 '이 라벨을 넣는다'고 적었다.

### 고치지 않고 확인만 한 것

- `board.holdKind.operational` '운영 문제(모집 지연 · 중도 탈락)' — brief · `CLINICAL_COPY.holdKind` 는 '(모집 · 탈락)'이다. 그런데 시뮬레이션 지시(`clinical-sim.ts`)와 4.1 정리본은 '탈락이 많아 완료 비율 75% 아래'만 운영 보류로 본다. 모집이 늦으면 시작을 못 할 뿐 보류가 되지 않는다. 문구는 brief 그대로 두고 아래 질문 2로 올린다.
- 과학 표현: '임상 통과 = 안전 보장' 같은 과장은 없다. 3상 '대규모 확증 시험', 특허 '분자 구조 자체를 독점할 수 있는 권리', 농축도 배수 정의(`screen.ts`), 3R '대체 · 감소 · 개선'이 맞다. 학생을 겁주는 표현도 없다(격려 줄 포함).
- 범위 5(LED 소식 틀 · 변동 표시 · 과정 항목 21 + 21 + 21 · 서랍 · 최종 순위 · 마감 안내)는 모두 덮였다. 브랜드 공개는 `board.news.approval` 의 `{brand}` 로 덮인다.
- 4.1 단계 점검(6번)은 이 단계에 해당하지 않는다. 다만 임상 설명 줄은 AI 판정 예외 · 공개 시점 · 모집 단계 이름(기본 · 확대 · 집중)이 맞는지 위 6 · 16 에서 확인했다.

### 남은 확인 질문(앞 ⑥ 에 더함)

1. **전임상 완료 변동(설계 ↔ 구현)** — 설계 §5.9 는 '전임상 완료 변동 0(crista 범위에 없는 종류라 값을 새로 만들지 않는다)'이다. 그런데 FMARKET `MARKET_EXTRA_BANDS.preclinical` 은 0~5%(기본 2%)이고, 정리본 `board.val.band.preclinical` 은 구현을 따랐다. 설계 §5.9 를 고칠지, 구현을 0으로 돌릴지 정해야 한다.
2. **운영 문제 보류의 뜻** — '모집 · 탈락'(brief · COPY)과 '탈락만'(시뮬레이션 · 4.1 정리본) 가운데 하나로 맞출지 정해야 한다. 정하면 `board.holdKind.operational` 과 `CLINICAL_COPY.holdKind.operational` 을 같이 고친다.
3. **최종 순위표의 과정 점수 공개** — 마감 뒤 모든 학생이 다른 모둠의 과정 점수(평균)를 본다. 이것은 설계 §5.3 · market.ts 머리말의 '점수는 그 모둠 · 교사만' 원칙과 다르다. 마감 뒤에는 공개해도 되는지 확인이 필요하다. 정리본 `board.process.privacy` 는 구현대로 적었다.
4. **키 이름 변경** — `board.drawer.stepStatus.active` 를 `running` 으로 바꿨다. 이 키를 이미 참조한 다른 정리본이나 통합 스크립트가 있으면 함께 바꿔야 한다.
