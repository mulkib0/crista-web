# 전광판 · 기업가치 · 최종 순위 — 학생용 문구 정리본

- 출처: Gemini 4 Argon (High) 원문(`gemini-raw.md`, `agy --model gemini-4-argon-high --effort high --mode plan` 헤드리스 · 한 번에 성공) → Claude Opus 5.5 검토 · 수정
- 날짜: 2026-10-24
- 상태: **초안 — 코드 반영은 8b 통합 뒤**
- 근거 칸: `§` = 설계 문서(`docs/2026-10-23-crista-web-design.md`) 절, `FMARKET` = `packages/web-contract/src/market.ts` 규칙 값, `범위 n` = 지시문(`prompt.md`) 3절 범위 번호, `COPY.…` = 맞출 기존 `MARKET_COPY` 키(다른 단계 COPY 는 `PATENT_COPY.…` 처럼 이름 그대로).
- 줄 끝 표시: `(Claude 수정)` = 사실 · 숫자 · 자리표시자 · 문체를 고친 줄, `(Claude 보충)` = Gemini 가 빠뜨려 Claude 가 채운 줄, `(검증 수정)` · `(검증 보충)` = 독립 검증(2차)이 고치거나 채운 줄. 이유는 `review.md`.
- 키 269개(Gemini 255 · Claude 보충 7 · 검증 보충 7). Claude 수정 44줄 · 검증 수정 16줄(`board.drawer.stepStatus.active` → `running` 키 이름 변경 포함).
- 소식 줄(`board.news.*`)은 헤드라인 꼴(명사로 끝남)이고, 나머지는 해요체다. 변동률(`▲ x.x%`)은 화면이 줄 끝에 붙인다.
- 돈 자리표시자의 지금 서버 꼴: `{listPrice}` = `formatPrice` → `50.00 크리스타`, `{cap}` · `{listCap}` = `formatCapM` → `5,000만 크리스타`, `{amount}` = 투자금(지금 서버는 `13,500,000 CRISTA` — '크리스타'로 맞출 것, `review.md` ②).
- 마지막 점검(2026-10-24): 단계 사이 용어를 맞춘 줄은 근거 칸 끝에 `(일관성 수정)` 을 붙였다. 용어집 · 키 이름 대응표는 [`../2026-10-24-copy-common/README.md`](../2026-10-24-copy-common/README.md).
- 키 꼴(마지막 점검): 키 조각은 camelCase 로 쓴다. 밑줄 조각은 코드의 값 · 식별자와 같은 이름(예: `within_10x` · `mech_why` · `calc_match`)일 때만 남긴다. 이 표의 키는 그 규칙으로 바꾼 뒤의 이름이다(`review.md` 는 바꾸기 전 이름).
- 돈 자리표시자(마지막 점검 · 전 단계 공통): 돈 값(`{cost}` · `{fee}` · `{balance}` · `{c}` · `{cap}` …)은 `formatCrista()` 기본값으로 채워 '… 크리스타' 단위가 이미 붙는다. 문구에 '크리스타'를 다시 쓰지 않고, 뒤 조사는 '크리스타'에 맞춘다(가 · 를 · 는 · 예요).

| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `board.news.listing` | ◆ {ticker} 「{name}」 설립 등기 완료 — 상장가 {listPrice} | `{ticker}`, `{name}`, `{listPrice}(새)` | §5.3-표, 4.1/4.2 소식 근거, COPY.listing |
| `board.news.docking` | ◆ {ticker} {gene} 도킹 결합력 학급 신기록 — {kcal} kcal/mol | `{ticker}`, `{gene}`, `{kcal}` | §5.3-표, COPY.docking |
| `board.news.screeningConsensus` | ◆ {ticker} 스크리닝 기준 합의 — 모둠 투표 {n}/{m}명 | `{ticker}`, `{n}`, `{m}` | §5.16 (Claude 수정) |
| `board.news.screeningDone` | ◆ {ticker} 화합물 스크리닝 완료 — 2.1 도킹 준비 | `{ticker}` | 범위 1 · §5.16 (Claude 보충) |
| `board.news.patentWithDisease` | ◆ {ticker} 물질특허 등록 — {code} · {disease} 후보 | `{ticker}`, `{code}`, `{disease}` | §5.3-표, PATENT_COPY.headline (키 겹침: `3.1.ledger.headline` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.patentNoDisease` | ◆ {ticker} 물질특허 등록 — {code} | `{ticker}`, `{code}` | §5.3-표, PATENT_COPY.headline (일관성 수정) (키 겹침: `3.1.ledger.headlineNoDisease` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.preclinicalDone` | ◆ {ticker} 전임상 완료 — {codeName} IND 준비 | `{ticker}`, `{codeName}` | FMARKET, PRECLINICAL_COPY.board.headline (일관성 수정) (키 겹침: `3.2.board.headline` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.indApproved` | ◆ {ticker} IND 승인 — {code} · {disease} 첫 사람 시험 준비 | `{ticker}`, `{code}`, `{disease}` | §5.3-표, IND_COPY.board.approved (일관성 수정) (키 겹침: `3.3.approval.boardApproved` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.indHeld` | ◆ {ticker} IND 보류 — {code} · {disease} | `{ticker}`, `{code}`, `{disease}` | §5.3-표, IND_COPY.board.held (검증 수정) (키 겹침: `3.3.approval.boardHeld` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.recruitDone` | ◆ {ticker} 임상 {phase} 참여자 모집 완료 — {n}명 | `{ticker}`, `{phase}(새)`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.recruitDoneP1` | ◆ {ticker} 임상 1상 참여자 모집 완료 — {n}명 | `{ticker}`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.recruitDoneP2` | ◆ {ticker} 임상 2상 참여자 모집 완료 — {n}명 | `{ticker}`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.recruitDoneP3` | ◆ {ticker} 임상 3상 참여자 모집 완료 — {n}명 | `{ticker}`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.trialStart` | ◆ {ticker} 임상 {phase} 시작 — {who} {n}명 | `{ticker}`, `{phase}(새)`, `{who}(새)`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.trialStartP1` | ◆ {ticker} 임상 1상 시작 — {who} {n}명 안전성 시험 | `{ticker}`, `{who}(새)`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.trialStartP2` | ◆ {ticker} 임상 2상 시작 — {who} {n}명 효능 시험 | `{ticker}`, `{who}(새)`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.trialStartP3` | ◆ {ticker} 임상 3상 시작 — {who} {n}명 대규모 확증 시험 | `{ticker}`, `{who}(새)`, `{n}` | §5.16, 4.1 임상 근거 |
| `board.news.trialPass` | ◆ {ticker} 임상 {phase} 통과 — {next} 진입 | `{ticker}`, `{phase}(새)`, `{next}(새)` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialPassP1` | ◆ {ticker} 임상 1상 통과 — 2상 진입 | `{ticker}` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialPassP2` | ◆ {ticker} 임상 2상 통과 — 3상 진입 | `{ticker}` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialPassP3` | ◆ {ticker} 임상 3상 통과 — 허가 신청 준비 | `{ticker}` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialHold` | ◆ {ticker} 임상 {phase} 보류 — {holdKind}, 재설계 중 | `{ticker}`, `{phase}(새)`, `{holdKind}(새)` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialHoldP1` | ◆ {ticker} 임상 1상 보류 — {holdKind}, 재설계 중 | `{ticker}`, `{holdKind}(새)` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialHoldP2` | ◆ {ticker} 임상 2상 보류 — {holdKind}, 재설계 중 | `{ticker}`, `{holdKind}(새)` | §5.3-표, 4.1 임상 근거 |
| `board.news.trialHoldP3` | ◆ {ticker} 임상 3상 보류 — {holdKind}, 재설계 중 | `{ticker}`, `{holdKind}(새)` | §5.3-표, 4.1 임상 근거 |
| `board.holdKind.safety` | 안전성 문제 | — | 4.1 임상 근거, CLINICAL_COPY.holdKind.safety |
| `board.holdKind.efficacy` | 효능 부족 | — | 4.1 임상 근거, CLINICAL_COPY.holdKind.efficacy |
| `board.holdKind.both` | 효능 · 안전 둘 다 | — | 4.1 임상 근거, CLINICAL_COPY.holdKind.both (일관성 수정) |
| `board.holdKind.operational` | 운영 문제(모집 · 탈락) | — | 4.1 임상 근거, CLINICAL_COPY.holdKind.operational (일관성 수정) |
| `board.news.retrySame` | ◆ {ticker} 임상 {phase} 재도전 — 같은 프로토콜 재시험 시작 | `{ticker}`, `{phase}(새)` | 4.1 임상 근거 |
| `board.news.retryDoseForm` | ◆ {ticker} 임상 {phase} 재도전 — 용량 · 제형 바꿔 IND 변경 신청 | `{ticker}`, `{phase}(새)` | 4.1 임상 근거 (Claude 수정) |
| `board.news.retryBackup` | ◆ {ticker} 후보 교체 재도전 — 백업 후보 {code} 새 IND 준비 | `{ticker}`, `{code}` | 4.1 임상 근거 |
| `board.news.approval` | ◆ {ticker} 「{brand}」 신약 품목 허가 | `{ticker}`, `{brand}` | §5.3-표, 4.2 허가 근거, APPROVAL_COPY.board.headline (키 겹침: `4.2.board.headline` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.funding` | ◆ {ticker} {round} {amount} 투자 유치 | `{ticker}`, `{round}(새)`, `{amount}(새)` | §5.3-표, §10 (일관성 수정) (키 겹침: `learn.board.pitchNews` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.fundingSeriesA` | ◆ {ticker} Series A {amount} 투자 유치 | `{ticker}`, `{amount}(새)` | §5.3-표, §10 (일관성 수정) (키 겹침: `learn.board.pitchNews` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.fundingSeriesB` | ◆ {ticker} Series B {amount} 투자 유치 | `{ticker}`, `{amount}(새)` | §5.3-표, §10 (일관성 수정) (키 겹침: `learn.board.pitchNews` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.learnStreak` | ◆ {ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×2.5 | `{ticker}` | §10, FMARKET (키 겹침: `learn.board.streakNews` 와 같은 줄 — 코드에는 그 단계 키 하나로 넣는다) |
| `board.news.processEval` | ◆ {ticker} {stepId} {title} 과정 평가 — {facts} | `{ticker}`, `{stepId}`, `{title}`, `{facts}` | FMARKET, COPY.process.headline (Claude 수정) |
| `board.news.rankLeader` | ◆ {ticker} 기업가치 1위 탈환 | `{ticker}` | §5.3-표, COPY.rankLeader (일관성 수정) |
| `board.news.teacherCorrection` | ◆ 정정: {ticker} {body} | `{ticker}`, `{body}(새)` | §5.3-표, FMARKET (Claude 수정) |
| `board.news.teacherNotice` | ◆ 선생님 공지 — {body} | `{body}(새)` | §5.3-표, FMARKET (Claude 수정) |
| `board.news.finalNotice` | ◆ {ticker} 수업 마감 최종 1위 확정 — 기업가치 {cap} | `{ticker}`, `{cap}` | §5.16, 4.2 허가 근거, COPY.finalNotice (일관성 수정) |
| `board.news.finalNoticeEmpty` | ◆ 수업 마감 — 학급 최종 순위 확정 | — | §5.16, 4.2 허가 근거, COPY.finalNotice |
| `board.news.reopenNotice` | ◆ 수업 마감 해제 — 기업가치 변동 재개 | — | §5.16, FMARKET, COPY.reopenNotice |
| `board.news.antibodyTrackInfo` | 항체 트랙(두 번째 신약 개발 파이프라인)의 연구 소식도 같은 전광판에 올라 기업가치와 순위에 반영돼요. | — | §5.16, FMARKET |
| `board.label` | 학급 실시간 전광판 | — | §5.3, COPY.board.label |
| `board.empty` | 아직 올라온 소식이 없어요. 스타트업이 설립 등기를 마치면 이곳에 첫 소식이 흘러요. | — | §5.3, COPY.board.empty |
| `board.live` | LIVE | — | §5.3, COPY.board.live (Claude 수정) |
| `board.paused` | 멈춤 | — | §5.3, COPY.board.paused |
| `board.pause` | 멈추기 | — | §5.3, COPY.board.pause |
| `board.resume` | 다시 흐르기 | — | §5.3, COPY.board.resume |
| `board.aiTag` | AI | — | §5.3, COPY.board.aiTag |
| `board.aiTitle` | AI가 다듬은 헤드라인이에요. 기업가치 변동률은 규칙이 정하고, 결과 소식 한 줄만 AI(Claude)가 읽기 쉽게 다듬었어요. | — | §5.3, §5.16, COPY.board.aiTitle |
| `board.newsAria` | 새 전광판 소식이에요. {headline} | `{headline}` | §5.3, COPY.board.newsAria |
| `board.color.amber` | 호박색 글자는 연구 진행이나 단계 통과 같은 보통 소식이에요. | — | §5.3 |
| `board.color.red` | 빨간색 글자는 시험 보류(이번 시험에서 기준을 넘지 못함) 같은 악재 소식이에요. | — | §5.3 |
| `board.color.green` | 초록색 글자는 기업가치 1위 탈환 같은 순위 변동 소식이에요. | — | §5.3 (일관성 수정) |
| `board.reducedMotion` | 움직임 줄이기 설정이 켜져 있어 전광판이 흐르지 않아요. 가로로 넘겨서 최근 소식을 확인해요. | — | §5.3 |
| `board.finalTag` | 마감됨 | — | §5.16, COPY.board.finalTag |
| `board.openDrawerHint` | 전광판의 티커(전광판에 쓰는 회사의 짧은 영문 기호)나 소식을 누르면 그 스타트업의 공개 정보 서랍이 열려요. | — | §0, §5.3 |
| `board.val.up` | ▲ {pct}% | `{pct}(새)` | §5.3 |
| `board.val.down` | ▼ {pct}% | `{pct}(새)` | §5.3 |
| `board.val.flat` | ― 0.0% | — | §5.3 |
| `board.val.upAria` | 기업가치가 {pct}% 올랐어요. | `{pct}(새)` | §5.3 |
| `board.val.downAria` | 기업가치가 {pct}% 내렸어요. | `{pct}(새)` | §5.3 |
| `board.val.flatAria` | 기업가치가 그대로예요(0.0%). | — | §5.3 |
| `board.val.whatIs` | 기업가치(회사 전체의 값어치)는 우리 회사가 얼마짜리인지 보여 주는 숫자예요. 이 수업에서는 연구 소식이 나올 때마다 규칙에 따라 오르내려요. | — | §5.3, §5.16 (Claude 수정) |
| `board.val.marketCapFormula` | 시가총액(전체 주식의 가치 합계)은 주가(주식 1주의 가격)에 전체 주식 수 1,000,000주를 곱해서 계산해요. | — | §5.3, §5.16 |
| `board.val.initialValue` | 상장(회사 주식을 처음 시장에 내놓는 일) 때 한 주 값은 {listPrice}예요. 여기에 1,000,000주를 곱한 값({listCap})이 첫 기업가치예요. | `{listPrice}(새)`, `{listCap}(새)` | §5.3, §5.16, §10 (Claude 수정) (검증 수정) |
| `board.val.notFund` | 기업가치는 연구비와 다른 숫자예요. 기업가치가 올라도 연구비 잔액은 늘지 않아요. 연구비는 학습 연구비 · 투자 유치 · 실패 바운티로 들어와요. | — | §10 · FMARKET (Claude 보충) |
| `board.val.noTrading` | 이 수업에서는 주식을 사고팔지 않아요. 기업가치는 연구 소식(펀더멘털 — 회사의 실제 성과)만으로 움직여요. | — | §5.3, §5.16 (Claude 수정) |
| `board.val.deterministicBand` | 기업가치 변동률은 AI가 아니라 규칙이 정해요. 소식 종류마다 정해진 범위 안에서, 같은 학급의 같은 소식이면 언제나 같은 값이 나와요. 값은 0.1%p(퍼센트포인트) 단위로 반올림해요. | — | §5.3, §5.16 (Claude 수정) |
| `board.val.band.listing` | 설립 등기 소식은 첫 상장가를 정하는 단계여서 기업가치 변동이 0%예요. | — | §5.3-표 |
| `board.val.band.docking` | 도킹(컴퓨터로 후보 분자를 표적 단백질 주머니에 끼워 보는 계산) 신기록은 기업가치가 0~12% 올라요. 결합 에너지 ΔG(낮을수록, 곧 음수로 클수록 단단히 붙음)가 −7.0 kcal/mol(분자 1몰이 붙을 때 나오는 에너지 단위) 이하이고, 같은 표적의 학급 최고 기록보다 낮을 때만 신기록이에요. 기본값은 ΔG가 −7에서 −12 kcal/mol로 갈수록 2%에서 10%까지 커져요. | — | §5.3-표, `onDockingSucceeded` (Claude 수정) (검증 수정) |
| `board.val.band.patent` | 물질특허(새로 찾아낸 분자 구조 자체를 독점할 수 있는 권리) 등록 소식은 기업가치가 0~5%(기본 2%) 올라요. | — | §5.3-표 |
| `board.val.band.preclinical` | 전임상(사람에게 시험하기 전 세포나 동물로 안전성과 효과를 확인하는 단계) 완료 소식은 기업가치가 0~5%(기본 2%) 올라요. | — | FMARKET |
| `board.val.band.ind` | IND(임상시험 계획 승인 신청, 사람 대상 시험을 시작하려고 내는 신청)가 승인되면 0~5%(기본 2%) 오르고, 보류되면 −8~0%(기본 −4%) 내려요. | — | §5.3-표 (일관성 수정) |
| `board.val.band.trialPass` | 임상 1 · 2 · 3상(사람에게 약의 안전성과 효능을 단계별로 확인하는 시험)을 통과하면 1상은 0~8%(기본 4%), 2상은 3~15%(기본 8%), 3상은 5~18%(기본 10%) 올라요. 임상 1 · 2 · 3상의 통과 · 보류 판정만은 AI(Claude) 시뮬레이션이 정해요. 결과는 각 상 기간(90 · 180 · 360 게임 일)이 끝나는 게임 일에 공개돼요. | — | §5.3-표, 4.1 임상 근거 (검증 수정) |
| `board.val.band.trialHold` | 임상시험이 보류되면 1상은 −12~−2%(기본 −6%), 2상은 −18~−5%(기본 −12%), 3상은 −20~−8%(기본 −15%) 내려요. 보류 원인 분석을 내면 실패 바운티(원인 분석 보상)로 낸 비용의 일부를 돌려받아요(1상 50% · 2상 40% · 3상 30%). 운영 문제로 보류된 시험은 바운티를 받지 못해요. | — | §5.3-표, §10, 4.1 임상 근거, CLINICAL_COPY.bountyOperational (검증 수정) |
| `board.val.band.approval` | 신약 품목 허가(약을 만들어 팔아도 된다는 허가)를 받으면 기업가치가 8~20% 올라요. 기본 12%에 제형(알약 · 주사액 · 붙이는 패치처럼 약을 만든 모양) 배율을 곱해요. 먹는 약(경구)은 1.3배라 15.6%, 붙이는 약(경피)은 1.15배라 13.8%, 혈관 주사(정맥)와 제형을 모를 때는 1.0배라 12%예요. 아무리 커도 20%를 넘지 않아요. | — | §5.3-표 (Claude 수정) (검증 수정) |
| `board.val.band.funding` | Series A · B(연구 성과를 보고 투자자가 차례로 넣는 투자 — A가 먼저, B가 다음)를 유치하면 기업가치가 5~15%(기본 Series A 8% · Series B 12%) 올라요. 투자금은 Series A 최대 15,000,000 크리스타, Series B 최대 25,000,000 크리스타예요. 심사 점수가 낮아도 최대액의 30%는 받아요. | — | §5.3-표, §10 (Claude 수정) |
| `board.val.band.learn` | 연구진 5단계 연속 전원 가동 같은 학습 소식은 기업가치가 0~2%(기본 1%) 올라요. | — | FMARKET, §10 |
| `board.val.band.antibody` | 항체 트랙 소식은 호재일 때 0~5%(기본 2%) 오르고, 악재일 때 −5~0%(기본 −2%) 내려요. | — | FMARKET |
| `board.val.band.correction` | 선생님이 올리는 판정 정정 소식은 −20%에서 +20% 사이로 기업가치를 조정해요. | — | §5.3-표, FMARKET |
| `board.val.band.process` | 과정 평가 소식은 기업가치가 0 ~ +3% 올라요. 과정 평가로 깎이는 일은 없어요. | — | FMARKET `PROCESS_PCT_MAX` (Claude 보충) |
| `board.val.band.zero` | 참여자 모집 완료 · 임상 시작 · 선생님 공지 · 기업가치 1위 탈환 · 수업 마감 소식은 기업가치 변동이 0%예요. | — | §5.3-표, FMARKET (검증 수정) (일관성 수정) |
| `board.val.priceFloor` | 주가는 직전 주가에 (1 + 변동률)을 곱해 정해요. 악재가 이어져도 주가 하한인 {floor} 아래로는 내려가지 않아요. | `{floor}(새)` | §5.3 (검증 수정) |
| `board.val.change24hDesc` | 최근 24시간 동안 올라온 소식들로 바뀐 주가 등락률이에요. | — | §5.3 |
| `board.val.ratingDesc` | 투자의견(투자자에게 사라 · 지켜보라 · 조심하라를 알리는 등급)은 가장 최근 소식 하나의 변동률로 정해져요. 네 단계 중 하나가 켜져요. | — | §5.3 (Claude 수정) |
| `board.val.rating.strongBuy` | STRONG BUY(적극 매수): 가장 최근 소식의 변동률이 +6% 이상일 때예요. | — | §5.3 (Claude 수정) |
| `board.val.rating.buy` | BUY(매수): 가장 최근 소식의 변동률이 +1.5% 이상, +6% 미만일 때예요. | — | §5.3 (Claude 수정) |
| `board.val.rating.hold` | HOLD(관망): 가장 최근 소식의 변동률이 −3%보다 크고 +1.5% 미만일 때예요. | — | §5.3 (Claude 수정) |
| `board.val.rating.shortWarning` | SHORT WARNING(하락 주의): 가장 최근 소식의 변동률이 −3% 이하일 때예요. 임상 보류 같은 악재 뒤에 자주 켜져요. | — | §5.3 (Claude 수정) |
| `board.rank.label` | 기업가치 순위 | — | §5.2, COPY.rank.label (일관성 수정) |
| `board.rank.finalLabel` | 최종 기업가치 순위 | — | §5.16, COPY.rank.finalLabel (일관성 수정) |
| `board.rank.value` | {rank}위 · {cap} | `{rank}`, `{cap}` | §5.2, COPY.rank.value (검증 수정) |
| `board.rank.unlistedValue` | — / {listed} · {cap} | `{listed}`, `{cap}` | §5.2, COPY.rank.value (Claude 수정) |
| `board.rank.title` | 누르면 우리 모둠 공개 서랍이 열려요. 다른 모둠이 보는 것과 같은 정보예요. | — | §5.2, COPY.rank.title (Claude 수정) |
| `board.rank.finalTitle` | 수업 마감으로 확정된 최종 순위예요. 누르면 학급 최종 순위표를 볼 수 있어요. | — | §5.16, COPY.rank.finalTitle |
| `board.process.whatIs` | 과정 점수는 운 좋게 결과만 좋은 모둠이 이기지 않도록, 4인 참여 · 합의 근거 · 동물실험 윤리 같은 연구 과정을 격려하는 점수예요. | — | §5.16, FMARKET |
| `board.process.formula` | 단계가 처음 끝나는 순간, 과정 신호(0~1)의 가중 평균(중요한 항목에 더 큰 비중을 둔 평균)에 100을 곱해 0~100점을 매겨요. 30점 미만이면 기업가치가 그대로예요. 30점부터는 점수에 비례해 0%에서 최대 +3%까지 오르고, 깎이는 일은 없어요. | — | FMARKET (Claude 수정) (검증 수정) |
| `board.process.revisionRule` | 서류 보완 횟수는 적을수록 좋아요. 0회는 1, 1회는 0.67, 2회는 0.5처럼 1 ÷ (1 + 횟수 ÷ 2)로 바꿔 넣어요. | — | FMARKET `revisionValue` (Claude 보충 — 원문 formula 에서 나눔) |
| `board.process.privacy` | 학급 전광판에는 참여 인원 같은 공개 사실만 나가요. 비공개 신호(보완 횟수 · 농축도 · 근거 칩 등)와 단계별 과정 점수는 우리 모둠과 선생님만 봐요. 수업이 마감되면 최종 순위표에 모둠마다 과정 점수(단계 평균)가 함께 나와요. | — | §5.3, FMARKET, `marketFinal` standings.processScore (검증 수정) |
| `board.process.keyLabel.notes` | 연구 노트 3칸 | — | FMARKET, COPY.process.keyLabel.notes |
| `board.process.keyDesc.notes` | 단계마다 연구 노트의 세 칸을 빠짐없이 채웠는지 봐요(모든 단계 · 공개). | — | FMARKET |
| `board.process.facts.notes` | 연구 노트 {n}/3칸 | `{n}` | FMARKET, COPY.process.facts.notes |
| `board.process.keyLabel.note_authors` | 노트 작성 인원 | — | FMARKET, COPY.process.keyLabel.note_authors |
| `board.process.keyDesc.note_authors` | 한 사람에게 맡기지 않고 여러 모둠원이 함께 연구 노트를 썼는지 봐요(모든 단계 · 공개). | — | FMARKET |
| `board.process.facts.note_authors` | 노트 {n}명 작성 | `{n}` | FMARKET, COPY.process.facts.note_authors |
| `board.process.keyLabel.learn` | 학습 문항 완료 | — | FMARKET, COPY.process.keyLabel.learn |
| `board.process.keyDesc.learn` | 그 단계의 학습 연구비 문항을 푼 모둠원 비율이에요(모든 단계 · 공개). | — | FMARKET |
| `board.process.facts.learn` | 학습 문항 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.learn |
| `board.process.keyLabel.picks` | 표적 추천 참여 | — | FMARKET, COPY.process.keyLabel.picks |
| `board.process.keyDesc.picks` | 1.1 단계에서 표적 추천 카드를 낸 모둠원 비율이에요(1.1 · 공개). | — | FMARKET |
| `board.process.facts.picks` | 표적 추천 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.picks |
| `board.process.keyLabel.quorum` | 기준 회의 정족수 | — | FMARKET, COPY.process.keyLabel.quorum |
| `board.process.keyDesc.quorum` | 1.2 기준 회의에서 투표에 참여한 모둠원 비율이에요. 정족수(결정을 내리는 데 필요한 최소 인원)만 채우기보다 모두 참여할수록 높아요(1.2 · 공개). | — | FMARKET `quorum` (Claude 수정) (검증 수정) |
| `board.process.facts.quorum` | 기준 투표 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.quorum |
| `board.process.keyLabel.deliberation` | 다시 논의(숙의) | — | FMARKET, COPY.process.keyLabel.deliberation |
| `board.process.keyDesc.deliberation` | 1.2 단계에서 기준을 정할 때 숙의(모둠원들이 근거를 두고 깊이 다시 논의함)를 거친 횟수예요(1.2 · 비공개). | — | FMARKET |
| `board.process.facts.deliberation` | 다시 논의 {n}번 | `{n}` | FMARKET, COPY.process.facts.deliberation |
| `board.process.keyLabel.claim_reasons` | 후보 찜 근거 | — | FMARKET, COPY.process.keyLabel.claim_reasons |
| `board.process.keyDesc.claim_reasons` | 1.2 분자 쇼핑에서 찜할 때 근거를 단 비율이에요. 근거는 데이터와 맞아야 해요(1.2 · 비공개). | — | FMARKET (Claude 수정) |
| `board.process.facts.claim_reasons` | 근거 단 찜 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.claim_reasons |
| `board.process.keyLabel.enrichment` | 스크리닝 농축도 | — | FMARKET, COPY.process.keyLabel.enrichment |
| `board.process.keyDesc.enrichment` | 1.2 단계의 농축도(걸러 낸 후보 속 아는 약 계열 비율이 처음 라이브러리보다 몇 배 높아졌는지)예요. 높을수록 기준이 약다운 분자를 잘 남겼다는 뜻이에요(1.2 · 비공개). | — | FMARKET (Claude 수정) |
| `board.process.facts.enrichment` | 농축도 {x} | `{x}` | FMARKET, COPY.process.facts.enrichment |
| `board.process.keyLabel.dockers` | 4인 병렬 도킹 참여 | — | FMARKET, COPY.process.keyLabel.dockers |
| `board.process.keyDesc.dockers` | 2.1 단계에서 도킹 계산에 직접 참여한 모둠원 비율이에요(2.1 · 공개). | — | FMARKET |
| `board.process.facts.dockers` | 도킹 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.dockers |
| `board.process.keyLabel.variants` | 분자 구조 변형 시도 | — | FMARKET, COPY.process.keyLabel.variants |
| `board.process.keyDesc.variants` | 2.1 단계에서 결합력이나 물성을 좋게 하려고 분자 구조를 바꿔 다시 도킹해 본 횟수예요(2.1 · 공개). | — | FMARKET (Claude 수정) |
| `board.process.facts.variants` | 구조 변형 {n}건 | `{n}` | FMARKET, COPY.process.facts.variants |
| `board.process.keyLabel.pick_reasons` | 후보 근거 칩 | — | FMARKET, COPY.process.keyLabel.pick_reasons (Claude 수정) |
| `board.process.keyDesc.pick_reasons` | 2.1과 2.2 단계에서 후보를 고를 때 타당한 근거 칩을 붙인 비율이에요(2.1 · 2.2 · 비공개). | — | FMARKET |
| `board.process.facts.pick_reasons` | 근거 칩 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.pick_reasons |
| `board.process.keyLabel.pickers` | 특허 후보 선정 참여 | — | FMARKET, COPY.process.keyLabel.pickers |
| `board.process.keyDesc.pickers` | 2.2 단계에서 특허로 출원할 후보를 고르는 데 참여한 모둠원 비율이에요(2.2 · 공개). | — | FMARKET |
| `board.process.facts.pickers` | 후보 고른 사람 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.pickers |
| `board.process.keyLabel.novel` | 새 물질 발굴 비율 | — | FMARKET, COPY.process.keyLabel.novel |
| `board.process.keyDesc.novel` | 2.2 단계에서 고른 후보 가운데 기존에 없던 새로운 물질의 비율이에요(2.2 · 비공개). | — | FMARKET |
| `board.process.facts.novel` | 새 물질 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.novel |
| `board.process.keyLabel.revisions` | 서류 보완 횟수 | — | FMARKET, COPY.process.keyLabel.revisions |
| `board.process.keyDesc.revisions` | 3.1 특허 출원서 · 3.2 동물실험계획서 · 3.3 IND · 4.2 품목 허가 서류가 통과될 때까지 다시 고쳐 낸 횟수예요. 적을수록 점수가 높아요(비공개). | — | FMARKET `revisions` (검증 수정) |
| `board.process.facts.revisions` | 보완 {n}회 | `{n}` | FMARKET, COPY.process.facts.revisions |
| `board.process.keyLabel.no_reject` | 특허 거절 없음 | — | FMARKET, COPY.process.keyLabel.no_reject |
| `board.process.keyDesc.no_reject` | 3.1 특허 심사에서 이미 알려진 물질이나 중복 출원으로 거절당한 적이 없는지 봐요(3.1 · 비공개). | — | FMARKET |
| `board.process.facts.no_reject` | 거절 {n}건 / 거절 없음 | `{n}` | FMARKET, COPY.process.facts.no_reject |
| `board.process.keyLabel.alt_assay` | 3R 대체 시험 | — | FMARKET, COPY.process.keyLabel.alt_assay |
| `board.process.keyDesc.alt_assay` | 3.2 전임상에서 3R(동물실험 윤리 원칙 — 대체 · 감소 · 개선)에 따라 세포 시험 같은 대체 시험을 먼저 했는지 봐요(3.2 · 공개). | — | §5.16, FMARKET (Claude 수정) |
| `board.process.facts.alt_assay` | 대체 시험 먼저 / 대체 시험 없음 | — | FMARKET, COPY.process.facts.alt_assay |
| `board.process.keyLabel.animal_level` | 3R 동물 마릿수 수준 | — | FMARKET, COPY.process.keyLabel.animal_level |
| `board.process.keyDesc.animal_level` | 3.2 전임상에서 동물을 필요한 최소 마릿수만 쓰는 수준을 골랐는지 봐요. 적은 수준일수록 높게 봐요(3.2 · 비공개). | — | §5.16, FMARKET (Claude 수정) |
| `board.process.facts.animal_level` | 마릿수 수준 {level} | `{level}` | FMARKET, COPY.process.facts.animal_level — `{level}` 에는 `board.process.level.*` 한글 라벨 |
| `board.process.level.low` | 적게 | — | PRECLINICAL_COPY.levels.low.label (검증 보충) |
| `board.process.level.standard` | 알맞게 | — | PRECLINICAL_COPY.levels.standard.label (검증 보충) |
| `board.process.level.high` | 많이 | — | PRECLINICAL_COPY.levels.high.label (검증 보충) |
| `board.process.keyLabel.ethics` | 동물실험 윤리 교육 | — | FMARKET, COPY.process.keyLabel.ethics |
| `board.process.keyDesc.ethics` | 3.2 단계에서 동물실험 윤리 교육을 마친 모둠원 비율이에요(3.2 · 공개). | — | FMARKET |
| `board.process.facts.ethics` | 윤리 교육 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.ethics |
| `board.process.keyLabel.no_hold` | IND 보류 없음 | — | FMARKET, COPY.process.keyLabel.no_hold (Claude 수정) |
| `board.process.keyDesc.no_hold` | 3.3에서 낸 IND가 보류(승인 기준을 넘지 못함) 없이 승인됐는지 봐요(3.3 · 비공개). | — | FMARKET (Claude 수정) |
| `board.process.facts.no_hold` | 보류 {n}번 / 보류 없음 | `{n}` | FMARKET, COPY.process.facts.no_hold |
| `board.process.keyLabel.resilience` | 보류 뒤 재도전 | — | FMARKET, COPY.process.keyLabel.resilience |
| `board.process.keyDesc.resilience` | 4.1 임상에서 보류가 난 뒤 다시 도전해 이어 갔는지 봐요. 보류 없이 진행한 경우도 높게 봐요(4.1 · 공개). | — | FMARKET (Claude 수정) |
| `board.process.facts.resilience` | 보류 뒤 재도전 {n}번 / 보류 없이 진행 | `{n}` | FMARKET, COPY.process.facts.resilience |
| `board.process.keyLabel.recruit` | 임상 모집 전략 | — | FMARKET, COPY.process.keyLabel.recruit |
| `board.process.keyDesc.recruit` | 4.1 임상에서 고른 참여자 모집 투자 단계(기본 · 확대 · 집중)를 봐요(4.1 · 비공개). | — | §5.16, FMARKET (Claude 수정) |
| `board.process.facts.recruit` | 모집 전략 {tier} | `{tier}` | FMARKET, COPY.process.facts.recruit — `{tier}` 에는 `board.process.tier.*` 한글 라벨 |
| `board.process.tier.basic` | 기본 | — | CLINICAL `RecruitTier` basic · 4.1 정리본 `4.1.recruit.tier.basic.label` (검증 보충) |
| `board.process.tier.expanded` | 확대 | — | CLINICAL `RecruitTier` expanded · 4.1 정리본 (검증 보충) |
| `board.process.tier.focus` | 집중 | — | CLINICAL `RecruitTier` focus · 4.1 정리본 (검증 보충) |
| `board.drawer.title` | {name} 공개 정보 | `{name}` | §5.3, COPY.drawer.title |
| `board.drawer.close` | 닫기 | — | COPY.drawer.close |
| `board.drawer.price` | 주가 | — | §5.3, COPY.drawer.price |
| `board.drawer.cap` | 시가총액 | — | §5.3, COPY.drawer.cap |
| `board.drawer.change24h` | 24시간 등락 | — | §5.3, COPY.drawer.change24h |
| `board.drawer.rating` | 투자의견 | — | §5.3, COPY.drawer.rating |
| `board.drawer.rank` | 기업가치 순위 | — | §5.3, COPY.drawer.rank (일관성 수정) |
| `board.drawer.program` | 프로그램 코드 | — | §5.3, COPY.drawer.program |
| `board.drawer.programDesc` | 프로그램 코드는 그 모둠이 가장 최근에 등록한 물질특허의 코드명이에요(예: SEUM-102). | — | §5.3 (Claude 수정) |
| `board.drawer.target` | 표적 | — | §5.3, COPY.drawer.target |
| `board.drawer.disease` | 질환 | — | §5.3, COPY.drawer.disease |
| `board.drawer.steps` | 단계 진행 | — | §5.3, COPY.drawer.steps |
| `board.drawer.stepStatus.done` | ✓ 완료: 이 단계의 연구와 심사를 모두 마쳤어요. | — | §5.3 |
| `board.drawer.stepStatus.running` | ▸ 진행 중: 지금 모둠이 연구하거나 시험하고 있는 단계예요. | — | §5.3, `STATE_MARK.running` (검증 수정) |
| `board.drawer.stepStatus.ready` | · 할 수 있음: 앞 단계를 마쳐 지금 시작할 수 있는 단계예요. | — | `STATE_MARK.ready` · `STATE_WORD.ready` (검증 보충) |
| `board.drawer.stepStatus.locked` | 🔒 잠김: 앞 단계를 통과해야 열리는 단계예요. | — | §5.3 |
| `board.drawer.stepStatus.held` | ✕ 보류: 이번 시험이나 심사에서 기준을 넘지 못했어요. 다시 도전할 수 있어요. | — | §5.3 (Claude 수정) |
| `board.drawer.stepStatus.blocked` | ⏸ 막힘: 연구비가 모자라 시작하지 못하는 단계예요. | — | §5.3, server `computeSteps` (검증 수정) |
| `board.drawer.records` | 기록 | — | §5.3, COPY.drawer.records |
| `board.drawer.patents` | 특허 | — | §5.3, COPY.drawer.patents |
| `board.drawer.passes` | 통과 | — | §5.3, COPY.drawer.passes |
| `board.drawer.holds` | 보류 | — | §5.3, COPY.drawer.holds |
| `board.drawer.approvals` | 허가 | — | §5.3, COPY.drawer.approvals |
| `board.drawer.recent` | 최근 공개 소식 | — | §5.3, FMARKET, COPY.drawer.recent (Claude 수정) |
| `board.drawer.trend` | 기업가치 추세 | — | §5.3, COPY.drawer.trend |
| `board.drawer.trendAria` | {name}의 상장 이후 기업가치 변동 추세선이에요. | `{name}` | §5.3, COPY.drawer.trendAria |
| `board.drawer.scope` | 여기에 보이는 것은 학급에 공개된 사실과 결과뿐이에요. 3.1에서 등록된 특허 분자의 구조식과 코드명은 학급 특허 원장에 공개되지만, 특허 전 후보 SMILES(분자 구조를 적은 글자) · 물성 · 점수 · 보완 횟수 · 연구 노트 · 출원서 본문 · 심사 결과 · 동물실험 자료 · 허가 전 브랜드는 그 모둠과 선생님만 봐요. | — | §5.3, 4.2 허가 근거, COPY.drawer.scope |
| `board.drawer.none` | 없음 | — | COPY.drawer.none |
| `board.drawer.final` | 최종 {rank}위 | `{rank}` | COPY.drawer.final |
| `board.drawer.openFinal` | 최종 순위 보기 | — | COPY.drawer.openFinal |
| `board.final.title` | 학급 신약 개발 최종 순위 | — | §5.16, COPY.final.title |
| `board.final.previewTitle` | 최종 순위 미리보기(마감 전 · 선생님 전용) | — | §5.16, COPY.final.previewTitle |
| `board.final.frozenAt` | {at}에 마감되었어요. 이 뒤의 소식은 최종 순위를 바꾸지 않아요. | `{at}` | §5.16, COPY.final.frozenAt |
| `board.final.reason.teacher` | 선생님이 마감했어요. | — | `MarketFinalInfo.reason` teacher (Claude 보충) |
| `board.final.reason.schedule` | 정한 마감 시각이 되어 자동으로 마감됐어요. | — | `MarketFinalInfo.reason` schedule (Claude 보충) |
| `board.final.intro` | 각 스타트업이 신약 개발 파이프라인을 밟으며 쌓은 연구 결과와 과정이 최종 기업가치로 집계되었어요. | — | §5.16 |
| `board.final.podium` | 시상대 | — | COPY.final.podium |
| `board.final.podium1` | 1위 | — | §5.16 (Claude 수정) |
| `board.final.podium2` | 2위 | — | §5.16 (Claude 수정) |
| `board.final.podium3` | 3위 | — | §5.16 (Claude 수정) |
| `board.final.myTeamRow` | 우리 모둠 · 최종 {rank}위 | `{rank}` | §5.16 |
| `board.final.table` | 전체 스타트업 최종 순위표 | — | COPY.final.table |
| `board.final.cols.rank` | 순위 | — | COPY.final.cols.rank |
| `board.final.cols.team` | 스타트업 | — | COPY.final.cols.team |
| `board.final.cols.cap` | 기업가치 | — | COPY.final.cols.cap |
| `board.final.cols.result` | 결과 점수 | — | COPY.final.cols.result |
| `board.final.cols.process` | 과정 점수 | — | COPY.final.cols.process |
| `board.final.cols.step` | 도달 단계 | — | COPY.final.cols.step |
| `board.final.cols.approved` | 허가 | — | COPY.final.cols.approved |
| `board.final.cols.research` | 연구 역량(순위) | — | COPY.final.cols.research |
| `board.final.approvedYes` | ✓ 허가 | — | COPY.final.approvedYes (Claude 수정) |
| `board.final.approvedNo` | — | — | COPY.final.approvedNo (Claude 수정) |
| `board.final.trend` | 기업가치 추세 | — | COPY.final.trend |
| `board.final.trendAria` | 모든 스타트업의 기업가치가 수업 동안 변해 온 추세선이에요. | — | COPY.final.trendAria |
| `board.final.myProcess` | 우리 모둠 과정 평가 | — | COPY.final.myProcess |
| `board.final.allProcess` | 모둠별 과정 평가 | — | COPY.final.allProcess |
| `board.final.resultHint` | 결과 점수(0~100점, 상한 100점)는 도킹 신기록(5점×2) · 물질특허(8점×3) · 전임상(10점×1) · IND 승인(12점×1) · 1상 통과(8점) · 2상 통과(10점) · 3상 통과(12점, 각 1번) · 허가(20점×1) · 투자(5점×2) · 항체 트랙(5점×4)을 합산해요. 보류나 실패가 나도 기업가치가 이미 내려가므로 결과 점수는 깎지 않아요. | — | FMARKET, COPY.final.resultHint |
| `board.final.processHint` | 과정 점수(0~100점)는 단계마다 참여 · 합의 근거 · 보완 횟수 · 3R 같은 과정 신호의 가중 평균이에요. 각 단계가 끝날 때 0%에서 최대 +3%까지 기업가치에 이미 반영되어 있어요. | — | FMARKET, COPY.final.processHint |
| `board.final.researchHint` | 연구 역량 지수(0~100점)는 학습 평균 점수 × 단계 커버율(끝낸 단계 ÷ 9) × 0.8 + 4인 발굴 다양성(모둠원이 서로 다른 후보를 찾은 정도) × 20으로 계산해요. | — | FMARKET, COPY.final.researchHint (Claude 수정) |
| `board.final.rankingRule` | 최종 순위의 순서는 기업가치(시가총액) 순으로 매겨요. 결과 점수 · 과정 점수 · 연구 역량은 표에 함께 보여 주는 상세 내역이에요. | — | FMARKET, §5.16 |
| `board.final.twoAxisHint` | 학급 성과는 시장 가치를 뜻하는 기업가치 순위와 학습 · 탐구 깊이를 뜻하는 연구 역량 지수 순위의 2축 순위로 함께 살펴봐요. | — | FMARKET, §10 (일관성 수정) |
| `board.final.ongoingTrialRule` | 마감 때 아직 상 기간이 끝나지 않아 진행 중이던 임상시험은 '진행 중'으로 두고 최종 기업가치에는 넣지 않아요. | — | §5.16 |
| `board.final.encouragement` | 비록 1위가 아니더라도 보류 원인을 분석하고 프로토콜(임상시험 계획서)을 고쳐 다시 도전한 경험이 진짜 신약 개발 역량이에요. 끝까지 함께 연구한 모둠원 모두 수고했어요! | — | §5.16, 4.1 임상 근거 (일관성 수정) |
| `board.final.close` | 닫기 | — | COPY.final.close |
| `board.final.notYet` | 아직 마감 전이에요. 선생님이 마감하면 최종 순위가 나와요. | — | §5.16, COPY.final.notYet |
| `board.deadline.scheduled` | {endsAt}에 수업이 마감돼요. 마감까지 {left} 남았어요. | `{endsAt}(새)`, `{left}(새)` | §5.16, FMARKET (검증 수정) |
| `board.deadline.none` | 마감 시각이 아직 정해지지 않았어요. 선생님이 마감하면 그때 최종 순위가 정해져요. | — | §5.16 · `endsAt` null (Claude 보충) |
| `board.deadline.soon` | 곧 수업이 마감돼요({left} 남음). 마감되면 그때의 기업가치로 최종 순위가 얼어붙어요. | `{left}(새)` | §5.16 |
| `board.deadline.closed` | 수업이 마감되어 기업가치와 순위가 확정되었어요. 이 뒤의 소식은 전광판에 흐르지만 순위를 바꾸지 않아요. | — | §5.16, FMARKET |
| `board.deadline.reopened` | 선생님이 마감을 풀었어요. 확정되었던 최종 순위를 지우고 다시 소식에 따라 기업가치가 움직여요. | — | §5.16, FMARKET |
| `board.teacher.title` | 전광판 · 마감 관리 | — | COPY.teacher.title |
| `board.teacher.projector` | 프로젝터(교실 앞 큰 발표 화면) 보기 | — | FMARKET, COPY.teacher.projector |
| `board.teacher.closeProjector` | 프로젝터 닫기 | — | COPY.teacher.closeProjector |
| `board.teacher.endsAt` | 마감 시각 | — | COPY.teacher.endsAt |
| `board.teacher.schedule` | 마감 시각 정하기 | — | COPY.teacher.schedule (Claude 수정) |
| `board.teacher.clearSchedule` | 마감 시각 지우기 | — | COPY.teacher.clearSchedule (Claude 수정) |
| `board.teacher.closeNow` | 지금 마감 | — | §5.16, COPY.teacher.closeNow |
| `board.teacher.closeConfirm` | 지금 기업가치 · 순위를 얼려 최종 순위를 정할까요? 이 뒤의 소식은 순위를 바꾸지 않아요. | — | §5.16, COPY.teacher.closeConfirm |
| `board.teacher.reopen` | 마감 풀기 | — | COPY.teacher.reopen |
| `board.teacher.reopenConfirm` | 최종 순위를 지우고 수업을 다시 열까요? 마감을 풀면 소식에 따라 기업가치와 순위가 다시 움직여요. | — | FMARKET, COPY.teacher.reopenConfirm |
| `board.teacher.finalView` | 최종 순위 | — | COPY.teacher.finalView |
| `board.teacher.finalPreview` | 미리보기 | — | COPY.teacher.finalPreview |
| `board.teacher.notice` | 공지 · 정정 소식 | — | §5.3-표, COPY.teacher.notice |
| `board.teacher.noticeHeadline` | 전광판 문구 | — | FMARKET, COPY.teacher.noticeHeadline |
| `board.teacher.noticeTeam` | 정정할 모둠(공지는 비워 두세요) | — | COPY.teacher.noticeTeam (Claude 수정) |
| `board.teacher.noticePct` | 기업가치 정정(%) | — | §5.3-표, FMARKET, COPY.teacher.noticePct |
| `board.teacher.noticeSend` | 올리기 | — | COPY.teacher.noticeSend |
| `board.teacher.finalDone` | 마감됨 {at} | `{at}` | COPY.teacher.finalDone |
| `board.teacher.open` | 진행 중 | — | COPY.teacher.open |
| `board.errors.notFound` | 해당 학급을 찾을 수 없어요. | — | COPY.errors.notFound |
| `board.errors.teamNotFound` | 이 학급에 속한 모둠을 찾을 수 없어요. | — | COPY.errors.teamNotFound |
| `board.errors.finalOnlyTeacher` | 아직 마감 전이라 선생님만 최종 순위 미리보기를 볼 수 있어요. | — | COPY.errors.finalOnlyTeacher |
| `board.errors.badEndsAt` | 마감 시각은 현재 시각보다 미래여야 해요. | — | COPY.errors.badEndsAt |
| `board.errors.badHeadline` | 전광판 문구는 1자 이상 120자 이하로 적어 주세요. | — | FMARKET, COPY.errors.badHeadline |
| `board.errors.badPct` | 기업가치 정정 폭은 −20%에서 +20% 사이여야 해요. | — | FMARKET, COPY.errors.badPct |
| `board.errors.alreadyFinal` | 이미 마감된 학급이에요. | — | COPY.errors.alreadyFinal |
| `board.errors.notFinal` | 아직 마감하지 않은 학급이에요. | — | COPY.errors.notFinal |
