| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `board.news.listing` | ◆ {ticker} 「{name}」 설립 등기 완료 — 상장가 {listPrice} | `{ticker}`, `{name}`, `{listPrice}(새)` | §5.3-표, 4.1/4.2 소식 근거, COPY.listing |
| `board.news.docking` | ◆ {ticker} {gene} 도킹 결합력 학급 신기록 — {kcal} kcal/mol | `{ticker}`, `{gene}`, `{kcal}` | §5.3-표, COPY.docking |
| `board.news.screeningConsensus` | ◆ {ticker} 1.2 스크리닝 기준 합의 및 후보 물질 선별 완료 | `{ticker}` | §5.16 |
| `board.news.patentWithDisease` | ◆ {ticker} 물질특허 등록 — {code} · {disease} 후보 | `{ticker}`, `{code}`, `{disease}` | §5.3-표, COPY.PATENT_COPY.headline |
| `board.news.patentNoDisease` | ◆ {ticker} 물질특허 등록 — 신약 후보 물질 {code} | `{ticker}`, `{code}` | §5.3-표, COPY.PATENT_COPY.headline |
| `board.news.preclinicalDone` | ◆ {ticker} 전임상 완료 — {code} IND 준비 | `{ticker}`, `{code}` | FMARKET, COPY.PRECLINICAL_COPY.board.headline |
| `board.news.indApproved` | ◆ {ticker} IND 승인 — {code} · {disease} 첫 임상 준비 | `{ticker}`, `{code}`, `{disease}` | §5.3-표, COPY.IND_COPY.board.approved |
| `board.news.indHeld` | ◆ {ticker} IND 보류 — {code} · {disease} 계획 보완 착수 | `{ticker}`, `{code}`, `{disease}` | §5.3-표, COPY.IND_COPY.board.held |
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
| `board.holdKind.safety` | 안전성 문제 | — | 4.1 임상 근거, COPY.CLINICAL_COPY.holdKind.safety |
| `board.holdKind.efficacy` | 효능 부족 | — | 4.1 임상 근거, COPY.CLINICAL_COPY.holdKind.efficacy |
| `board.holdKind.both` | 효능 · 안전 둘 다 미달 | — | 4.1 임상 근거, COPY.CLINICAL_COPY.holdKind.both |
| `board.holdKind.operational` | 운영 문제(모집 지연 · 중도 탈락) | — | 4.1 임상 근거, COPY.CLINICAL_COPY.holdKind.operational |
| `board.news.retrySame` | ◆ {ticker} 임상 {phase} 재도전 — 같은 프로토콜 재시험 시작 | `{ticker}`, `{phase}(새)` | 4.1 임상 근거 |
| `board.news.retryDoseForm` | ◆ {ticker} 임상 {phase} 재도전 — 용량 · 제형 변경 IND 재개 | `{ticker}`, `{phase}(새)` | 4.1 임상 근거 |
| `board.news.retryBackup` | ◆ {ticker} 후보 교체 재도전 — 백업 후보 {code} 새 IND 준비 | `{ticker}`, `{code}` | 4.1 임상 근거 |
| `board.news.approval` | ◆ {ticker} 「{brand}」 신약 품목 허가 | `{ticker}`, `{brand}` | §5.3-표, 4.2 허가 근거, COPY.APPROVAL_COPY.board.headline |
| `board.news.funding` | ◆ {ticker} {round} {amount} 투자 유치 성공 | `{ticker}`, `{round}(새)`, `{amount}(새)` | §5.3-표, §10 |
| `board.news.fundingSeriesA` | ◆ {ticker} Series A {amount} 투자 유치 성공 | `{ticker}`, `{amount}(새)` | §5.3-표, §10 |
| `board.news.fundingSeriesB` | ◆ {ticker} Series B {amount} 투자 유치 성공 | `{ticker}`, `{amount}(새)` | §5.3-표, §10 |
| `board.news.learnStreak` | ◆ {ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×2.5 | `{ticker}` | §10, FMARKET |
| `board.news.processEval` | ◆ {ticker} {step} {title} 과정 평가 — {facts} | `{ticker}`, `{step}(새)`, `{title}`, `{facts}` | FMARKET, COPY.process.headline |
| `board.news.rankLeader` | ◆ {ticker} 시가총액 1위 탈환 | `{ticker}` | §5.3-표, COPY.rankLeader |
| `board.news.teacherCorrection` | ◆ {ticker} 교사 판정 정정 — {body} | `{ticker}`, `{body}(새)` | §5.3-표, FMARKET |
| `board.news.teacherNotice` | ◆ 교사 공지 — {body} | `{body}(새)` | §5.3-표, FMARKET |
| `board.news.finalNotice` | ◆ {ticker} 수업 마감 최종 1위 확정 — 시가총액 {cap} | `{ticker}`, `{cap}` | §5.16, 4.2 허가 근거, COPY.finalNotice |
| `board.news.finalNoticeEmpty` | ◆ 수업 마감 — 학급 최종 순위 확정 | — | §5.16, 4.2 허가 근거, COPY.finalNotice |
| `board.news.reopenNotice` | ◆ 수업 마감 해제 — 기업가치 변동 재개 | — | §5.16, FMARKET, COPY.reopenNotice |
| `board.news.antibodyTrackInfo` | 항체 트랙(두 번째 신약 개발 파이프라인)의 연구 소식도 같은 전광판에 올라 기업가치와 순위에 반영돼요. | — | §5.16, FMARKET |
| `board.label` | 학급 실시간 전광판 | — | §5.3, COPY.board.label |
| `board.empty` | 아직 올라온 소식이 없어요. 스타트업이 설립 등기를 마치면 이곳에 첫 소식이 흘러요. | — | §5.3, COPY.board.empty |
| `board.live` | ● LIVE | — | §5.3, COPY.board.live |
| `board.paused` | 멈춤 | — | §5.3, COPY.board.paused |
| `board.pause` | 멈추기 | — | §5.3, COPY.board.pause |
| `board.resume` | 다시 흐르기 | — | §5.3, COPY.board.resume |
| `board.aiTag` | AI | — | §5.3, COPY.board.aiTag |
| `board.aiTitle` | AI가 다듬은 헤드라인이에요. 기업가치 변동률은 규칙이 정하고, 결과 소식 한 줄만 AI(Claude)가 읽기 쉽게 다듬었어요. | — | §5.3, §5.16, COPY.board.aiTitle |
| `board.newsAria` | 새 전광판 소식이에요. {headline} | `{headline}` | §5.3, COPY.board.newsAria |
| `board.color.amber` | 호박색 글자는 연구 진행이나 단계 통과 같은 보통 소식이에요. | — | §5.3 |
| `board.color.red` | 빨간색 글자는 시험 보류(이번 시험에서 기준을 넘지 못함) 같은 악재 소식이에요. | — | §5.3 |
| `board.color.green` | 초록색 글자는 시가총액 1위 탈환 같은 순위 변동 소식이에요. | — | §5.3 |
| `board.reducedMotion` | 움직임 줄이기 설정이 켜져 있어 전광판이 흐르지 않아요. 가로로 넘겨서 최근 소식을 확인해요. | — | §5.3 |
| `board.finalTag` | 마감됨 | — | §5.16, COPY.board.finalTag |
| `board.openDrawerHint` | 전광판의 티커(전광판에 쓰는 회사의 짧은 영문 기호)나 소식을 누르면 그 스타트업의 공개 정보 서랍이 열려요. | — | §0, §5.3 |
| `board.val.up` | ▲ {pct}% | `{pct}(새)` | §5.3 |
| `board.val.down` | ▼ {pct}% | `{pct}(새)` | §5.3 |
| `board.val.flat` | ― 0.0% | — | §5.3 |
| `board.val.upAria` | 기업가치가 {pct}% 올랐어요. | `{pct}(새)` | §5.3 |
| `board.val.downAria` | 기업가치가 {pct}% 내렸어요. | `{pct}(새)` | §5.3 |
| `board.val.flatAria` | 기업가치가 그대로예요(0.0%). | — | §5.3 |
| `board.val.whatIs` | 기업가치(회사의 전체 가치)는 스타트업이 개발하는 신약의 성공 가능성과 연구 과정을 시장이 평가한 금액이에요. | — | §5.3, §5.16 |
| `board.val.marketCapFormula` | 시가총액(전체 주식의 가치 합계)은 주가(주식 1주의 가격)에 전체 주식 수 1,000,000주를 곱해서 계산해요. | — | §5.3, §5.16 |
| `board.val.initialValue` | 상장(회사의 주식을 시장에 처음 내놓는 일)할 때 상장가 {listPrice}에 1,000,000주를 곱한 값으로 첫 기업가치를 시작해요. 새 스타트업의 초기 연구비는 10,000,000 크리스타예요. | `{listPrice}(새)` | §5.3, §5.16, §10 |
| `board.val.noTrading` | 이 수업에서는 주식을 사고팔지 않아요. 오직 모둠의 연구 결과와 과정 소식인 펀더멘털(회사의 실제 연구 성과와 기초 체력)만으로 기업가치가 움직여요. | — | §5.3, §5.16 |
| `board.val.deterministicBand` | 기업가치 변동률은 AI가 정하지 않고 규칙이 정한 범위 안에서 계산해요. 학급과 소식이 같으면 언제나 같은 값이 나오고 0.1%p 단위로 반올림해요. | — | §5.3, §5.16 |
| `board.val.band.listing` | 설립 등기 소식은 첫 상장가를 정하는 단계여서 기업가치 변동이 0%예요. | — | §5.3-표 |
| `board.val.band.docking` | 도킹(컴퓨터로 약물 후보 분자가 표적 단백질에 얼마나 잘 결합하는지 끼워 맞춰 보는 계산) 신기록은 결합 에너지(ΔG)가 −7.0 kcal/mol(킬로칼로리 퍼 몰, 숫자가 낮을수록 더 강하게 결합함) 이하이고 학급 최고보다 낮을 때 0~12% 올라요. 기본값은 2 + 8 × min(1, (−ΔG − 7) / 5)%예요. | — | §5.3-표 |
| `board.val.band.patent` | 물질특허(새로 찾아낸 분자 구조 자체를 독점할 수 있는 권리) 등록 소식은 기업가치가 0~5%(기본 2%) 올라요. | — | §5.3-표 |
| `board.val.band.preclinical` | 전임상(사람에게 시험하기 전 세포나 동물로 안전성과 효과를 확인하는 단계) 완료 소식은 기업가치가 0~5%(기본 2%) 올라요. | — | FMARKET |
| `board.val.band.ind` | IND(임상시험계획 승인 신청, 사람 대상 시험을 시작하기 위해 내는 허가 신청)가 승인되면 0~5%(기본 2%) 오르고, 보류되면 −8~0%(기본 −4%) 내려요. | — | §5.3-표 |
| `board.val.band.trialPass` | 임상 1 · 2 · 3상(사람에게 약의 안전성과 효능을 단계별로 확인하는 시험)을 통과하면 1상은 0~8%(기본 4%), 2상은 3~15%(기본 8%), 3상은 5~18%(기본 10%) 올라요. 임상 1 · 2 · 3상 판정만은 AI 시뮬레이션이 정하고 각 상 기간(90 · 180 · 360 게임 일)이 끝나는 날에 공개돼요. | — | §5.3-표, 4.1 임상 근거 |
| `board.val.band.trialHold` | 임상시험이 보류되면 1상은 −12~−2%(기본 −6%), 2상은 −18~−5%(기본 −12%), 3상은 −20~−8%(기본 −15%) 내려요. 보류 원인 분석을 내면 실패 바운티로 낸 시험 비용의 일부(IND · 1상 50% · 2상 40% · 3상 30%)를 돌려받아요. | — | §5.3-표, 4.1 임상 근거 |
| `board.val.band.approval` | 신약 품목 허가를 받으면 기업가치가 8~20% 올라요. 기본 12%에 제형 배율(경구 1.3배 → 15.6% · 경피 1.15배 → 13.8% · 정맥 1.0배 → 12% · 모름 1.0배)을 곱해 계산하고 최대 20%까지 올라요. | — | §5.3-표 |
| `board.val.band.funding` | Series A · B(스타트업이 연구 단계 성과에 따라 차례로 받는 대규모 후속 투자)에 성공하면 기업가치가 5~15%(기본 Series A 8% · Series B 12%) 올라요. 연구비도 Series A는 최대 15,000,000 크리스타, Series B는 최대 25,000,000 크리스타까지(바닥 30% 보장) 들어와요. | — | §5.3-표, §10 |
| `board.val.band.learn` | 연구진 5단계 연속 전원 가동 같은 학습 소식은 기업가치가 0~2%(기본 1%) 올라요. | — | FMARKET, §10 |
| `board.val.band.antibody` | 항체 트랙 소식은 호재일 때 0~5%(기본 2%) 오르고, 악재일 때 −5~0%(기본 −2%) 내려요. | — | FMARKET |
| `board.val.band.correction` | 선생님이 올리는 판정 정정 소식은 −20%에서 +20% 사이로 기업가치를 조정해요. | — | §5.3-표, FMARKET |
| `board.val.band.zero` | 참여자 모집 완료 · 임상 시작 · 교사 공지 · 시가총액 1위 탈환 · 수업 마감 소식은 기업가치 변동이 0%예요. | — | §5.3-표, FMARKET |
| `board.val.priceFloor` | 주가는 직전 주가에 (1 + 변동률)을 곱해 계산하지만, 악재가 이어져도 주가 하한인 {floor} 아래로는 내려가지 않아요. | `{floor}(새)` | §5.3 |
| `board.val.change24hDesc` | 최근 24시간 동안 올라온 소식들로 바뀐 주가 등락률이에요. | — | §5.3 |
| `board.val.ratingDesc` | 투자의견(최근 기업가치 흐름을 보고 매기는 투자 등급)은 최근 변동률에 따라 4단계로 표시돼요. | — | §5.3 |
| `board.val.rating.strongBuy` | STRONG BUY(강력 매수 등급): 최근 변동률이 +6% 이상으로 신약 개발 성과가 아주 뛰어날 때 받는 등급이에요. | — | §5.3 |
| `board.val.rating.buy` | BUY(매수 등급): 최근 변동률이 +1.5% 이상 +6% 미만으로 연구가 순조롭게 나아갈 때 받는 등급이에요. | — | §5.3 |
| `board.val.rating.hold` | HOLD(관망 등급): 최근 변동률이 −3% 초과 +1.5% 미만으로 큰 변동 없이 다음 시험 결과를 기다리는 상태예요. | — | §5.3 |
| `board.val.rating.shortWarning` | SHORT WARNING(하락 주의 등급): 최근 변동률이 −3% 이하로 시험 보류 같은 악재가 생겨 재설계가 필요한 상태예요. | — | §5.3 |
| `board.rank.label` | 시가총액 순위 | — | §5.2, COPY.rank.label |
| `board.rank.finalLabel` | 최종 시가총액 순위 | — | §5.16, COPY.rank.finalLabel |
| `board.rank.value` | {rank}위 · {cap} | `{rank}`, `{cap}`, `{listed}` | §5.2, COPY.rank.value |
| `board.rank.unlistedValue` | — / {listed} | `{listed}` | §5.2, COPY.rank.value |
| `board.rank.title` | 상장된 {listed}개 스타트업 가운데 시가총액 {rank}위({cap})예요. 누르면 우리 모둠의 공개 정보 서랍이 열려요. | `{listed}`, `{rank}`, `{cap}` | §5.2, COPY.rank.title |
| `board.rank.finalTitle` | 수업 마감으로 확정된 최종 순위예요. 누르면 학급 최종 순위표를 볼 수 있어요. | — | §5.16, COPY.rank.finalTitle |
| `board.process.whatIs` | 과정 점수는 운 좋게 결과만 좋은 모둠이 이기지 않도록, 4인 참여 · 합의 근거 · 동물실험 윤리 같은 연구 과정을 격려하는 점수예요. | — | §5.16, FMARKET |
| `board.process.formula` | 단계가 처음 끝날 때 과정 신호(0~1)의 가중 평균 × 100으로 0~100점을 매겨요. 30점 미만은 변동이 없고(0%), 30~100점은 기업가치를 0%에서 최대 +3%까지 곧장 올려 주며 감점은 없어요. 서류 보완 횟수는 1 ÷ (1 + 횟수 ÷ 2) 공식(0회 1 · 1회 0.67 · 2회 0.5)으로 계산해요. | — | FMARKET |
| `board.process.privacy` | 학급 전광판에는 참여 인원 같은 공개 사실만 나가고, 비공개 신호(보완 횟수 · 농축도 · 근거 칩 등)와 과정 점수는 우리 모둠과 선생님만 봐요. | — | §5.3, FMARKET |
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
| `board.process.keyDesc.quorum` | 1.2 스크리닝 기준 회의에서 정족수(회의나 투표가 인정되기 위해 꼭 참여해야 하는 최소 인원수)를 채워 투표한 인원 비율이에요(1.2 · 공개). | — | FMARKET |
| `board.process.facts.quorum` | 기준 투표 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.quorum |
| `board.process.keyLabel.deliberation` | 다시 논의(숙의) | — | FMARKET, COPY.process.keyLabel.deliberation |
| `board.process.keyDesc.deliberation` | 1.2 단계에서 기준을 정할 때 숙의(모둠원들이 근거를 두고 깊이 다시 논의함)를 거친 횟수예요(1.2 · 비공개). | — | FMARKET |
| `board.process.facts.deliberation` | 다시 논의 {n}번 | `{n}` | FMARKET, COPY.process.facts.deliberation |
| `board.process.keyLabel.claim_reasons` | 후보 찜 근거 | — | FMARKET, COPY.process.keyLabel.claim_reasons |
| `board.process.keyDesc.claim_reasons` | 1.2 단계에서 후보 물질을 찜할 때 과학적 근거를 함께 적어 낸 비율이에요(1.2 · 비공개). | — | FMARKET |
| `board.process.facts.claim_reasons` | 근거 단 찜 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.claim_reasons |
| `board.process.keyLabel.enrichment` | 스크리닝 농축도 | — | FMARKET, COPY.process.keyLabel.enrichment |
| `board.process.keyDesc.enrichment` | 1.2 단계의 농축도(전체 물질 가운데 실제 유망한 후보를 얼마나 조밀하게 골라냈는지 나타내는 비율)예요(1.2 · 비공개). | — | FMARKET |
| `board.process.facts.enrichment` | 농축도 {x} | `{x}` | FMARKET, COPY.process.facts.enrichment |
| `board.process.keyLabel.dockers` | 4인 병렬 도킹 참여 | — | FMARKET, COPY.process.keyLabel.dockers |
| `board.process.keyDesc.dockers` | 2.1 단계에서 도킹 계산에 직접 참여한 모둠원 비율이에요(2.1 · 공개). | — | FMARKET |
| `board.process.facts.dockers` | 도킹 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.dockers |
| `board.process.keyLabel.variants` | 분자 구조 변형 시도 | — | FMARKET, COPY.process.keyLabel.variants |
| `board.process.keyDesc.variants` | 2.1 단계에서 결합력과 물성을 높이기 위해 분자 구조를 고쳐 본 횟수예요(2.1 · 공개). | — | FMARKET |
| `board.process.facts.variants` | 구조 변형 {n}건 | `{n}` | FMARKET, COPY.process.facts.variants |
| `board.process.keyLabel.pick_reasons` | 대기열 근거 칩 | — | FMARKET, COPY.process.keyLabel.pick_reasons |
| `board.process.keyDesc.pick_reasons` | 2.1과 2.2 단계에서 후보를 고를 때 타당한 근거 칩을 붙인 비율이에요(2.1 · 2.2 · 비공개). | — | FMARKET |
| `board.process.facts.pick_reasons` | 근거 칩 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.pick_reasons |
| `board.process.keyLabel.pickers` | 특허 후보 선정 참여 | — | FMARKET, COPY.process.keyLabel.pickers |
| `board.process.keyDesc.pickers` | 2.2 단계에서 특허로 출원할 후보를 고르는 데 참여한 모둠원 비율이에요(2.2 · 공개). | — | FMARKET |
| `board.process.facts.pickers` | 후보 고른 사람 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.pickers |
| `board.process.keyLabel.novel` | 새 물질 발굴 비율 | — | FMARKET, COPY.process.keyLabel.novel |
| `board.process.keyDesc.novel` | 2.2 단계에서 고른 후보 가운데 기존에 없던 새로운 물질의 비율이에요(2.2 · 비공개). | — | FMARKET |
| `board.process.facts.novel` | 새 물질 {n}/{m} | `{n}`, `{m}` | FMARKET, COPY.process.facts.novel |
| `board.process.keyLabel.revisions` | 서류 보완 횟수 | — | FMARKET, COPY.process.keyLabel.revisions |
| `board.process.keyDesc.revisions` | 3.1 특허 · 3.2 전임상 계획서 · 3.3 IND · 4.2 품목 허가 서류가 통과될 때까지 다시 고쳐 낸 횟수로, 적을수록 점수가 높아요(비공개). | — | FMARKET |
| `board.process.facts.revisions` | 보완 {n}회 | `{n}` | FMARKET, COPY.process.facts.revisions |
| `board.process.keyLabel.no_reject` | 특허 거절 없음 | — | FMARKET, COPY.process.keyLabel.no_reject |
| `board.process.keyDesc.no_reject` | 3.1 특허 심사에서 이미 알려진 물질이나 중복 출원으로 거절당한 적이 없는지 봐요(3.1 · 비공개). | — | FMARKET |
| `board.process.facts.no_reject` | 거절 {n}건 / 거절 없음 | `{n}` | FMARKET, COPY.process.facts.no_reject |
| `board.process.keyLabel.alt_assay` | 3R 대체 시험 | — | FMARKET, COPY.process.keyLabel.alt_assay |
| `board.process.keyDesc.alt_assay` | 3.2 전임상에서 3R(동물실험 윤리 3원칙 — 대체 · 축소 · 고통 완화)에 따라 세포 시험 같은 대체 시험을 먼저 했는지 봐요(3.2 · 공개). | — | §5.16, FMARKET |
| `board.process.facts.alt_assay` | 대체 시험 먼저 / 대체 시험 없음 | — | FMARKET, COPY.process.facts.alt_assay |
| `board.process.keyLabel.animal_level` | 3R 동물 마릿수 수준 | — | FMARKET, COPY.process.keyLabel.animal_level |
| `board.process.keyDesc.animal_level` | 3.2 전임상에서 꼭 필요한 만큼만 실험동물을 쓰도록 마릿수를 알맞게 줄였는지 봐요(3.2 · 비공개). | — | §5.16, FMARKET |
| `board.process.facts.animal_level` | 마릿수 수준 {level} | `{level}` | FMARKET, COPY.process.facts.animal_level |
| `board.process.keyLabel.ethics` | 동물실험 윤리 교육 | — | FMARKET, COPY.process.keyLabel.ethics |
| `board.process.keyDesc.ethics` | 3.2 단계에서 동물실험 윤리 교육을 마친 모둠원 비율이에요(3.2 · 공개). | — | FMARKET |
| `board.process.facts.ethics` | 윤리 교육 {n}/{m}명 | `{n}`, `{m}` | FMARKET, COPY.process.facts.ethics |
| `board.process.keyLabel.no_hold` | IND 심사 보류 없음 | — | FMARKET, COPY.process.keyLabel.no_hold |
| `board.process.keyDesc.no_hold` | 3.3 IND 심사에서 안전성이나 서류 미비로 보류된 적이 없는지 봐요(3.3 · 비공개). | — | FMARKET |
| `board.process.facts.no_hold` | 보류 {n}번 / 보류 없음 | `{n}` | FMARKET, COPY.process.facts.no_hold |
| `board.process.keyLabel.resilience` | 보류 뒤 재도전 | — | FMARKET, COPY.process.keyLabel.resilience |
| `board.process.keyDesc.resilience` | 4.1 임상시험에서 보류가 났을 때 포기하지 않고 원인을 분석해 재도전했거나 보류 없이 진행했는지 봐요(4.1 · 공개). | — | FMARKET |
| `board.process.facts.resilience` | 보류 뒤 재도전 {n}번 / 보류 없이 진행 | `{n}` | FMARKET, COPY.process.facts.resilience |
| `board.process.keyLabel.recruit` | 임상 모집 전략 | — | FMARKET, COPY.process.keyLabel.recruit |
| `board.process.keyDesc.recruit` | 4.1 임상시험에서 비용과 기간의 균형 및 검정력(약에 진짜 효과가 있을 때 시험에서 그 효과를 놓치지 않고 찾아낼 확률)을 고려해 모집 전략을 세웠는지 봐요(4.1 · 비공개). | — | §5.16, FMARKET |
| `board.process.facts.recruit` | 모집 전략 {tier} | `{tier}` | FMARKET, COPY.process.facts.recruit |
| `board.drawer.title` | {name} 공개 정보 | `{name}` | §5.3, COPY.drawer.title |
| `board.drawer.close` | 닫기 | — | COPY.drawer.close |
| `board.drawer.price` | 주가 | — | §5.3, COPY.drawer.price |
| `board.drawer.cap` | 시가총액 | — | §5.3, COPY.drawer.cap |
| `board.drawer.change24h` | 24시간 등락 | — | §5.3, COPY.drawer.change24h |
| `board.drawer.rating` | 투자의견 | — | §5.3, COPY.drawer.rating |
| `board.drawer.rank` | 시가총액 순위 | — | §5.3, COPY.drawer.rank |
| `board.drawer.program` | 프로그램 코드 | — | §5.3, COPY.drawer.program |
| `board.drawer.programDesc` | 프로그램 코드는 스타트업이 개발 중인 신약 후보 물질에 붙인 고유 개발 기호예요. | — | §5.3 |
| `board.drawer.target` | 표적 | — | §5.3, COPY.drawer.target |
| `board.drawer.disease` | 질환 | — | §5.3, COPY.drawer.disease |
| `board.drawer.steps` | 단계 진행 | — | §5.3, COPY.drawer.steps |
| `board.drawer.stepStatus.done` | ✓ 완료: 이 단계의 연구와 심사를 모두 마쳤어요. | — | §5.3 |
| `board.drawer.stepStatus.active` | ▸ 진행: 지금 모둠이 연구하거나 시험하고 있는 단계예요. | — | §5.3 |
| `board.drawer.stepStatus.locked` | 🔒 잠김: 앞 단계를 통과해야 열리는 단계예요. | — | §5.3 |
| `board.drawer.stepStatus.held` | ✕ 보류: 이번 시험이나 심사에서 기준을 넘지 못해 재설계하고 있어요. | — | §5.3 |
| `board.drawer.stepStatus.blocked` | ⏸ 막힘: 선행 조건이나 연구비가 부족해 잠시 멈춰 있어요. | — | §5.3 |
| `board.drawer.records` | 기록 | — | §5.3, COPY.drawer.records |
| `board.drawer.patents` | 특허 | — | §5.3, COPY.drawer.patents |
| `board.drawer.passes` | 통과 | — | §5.3, COPY.drawer.passes |
| `board.drawer.holds` | 보류 | — | §5.3, COPY.drawer.holds |
| `board.drawer.approvals` | 허가 | — | §5.3, COPY.drawer.approvals |
| `board.drawer.recent` | 최근 공개 소식(8건) | — | §5.3, FMARKET, COPY.drawer.recent |
| `board.drawer.trend` | 기업가치 추세 | — | §5.3, COPY.drawer.trend |
| `board.drawer.trendAria` | {name}의 상장 이후 기업가치 변동 추세선이에요. | `{name}` | §5.3, COPY.drawer.trendAria |
| `board.drawer.scope` | 여기에 보이는 것은 학급에 공개된 사실과 결과뿐이에요. 3.1에서 등록된 특허 분자의 구조식과 코드명은 학급 특허 원장에 공개되지만, 특허 전 후보 SMILES(분자 구조를 적은 글자) · 물성 · 점수 · 보완 횟수 · 연구 노트 · 출원서 본문 · 심사 결과 · 동물실험 자료 · 허가 전 브랜드는 그 모둠과 선생님만 봐요. | — | §5.3, 4.2 허가 근거, COPY.drawer.scope |
| `board.drawer.none` | 없음 | — | COPY.drawer.none |
| `board.drawer.final` | 최종 {rank}위 | `{rank}` | COPY.drawer.final |
| `board.drawer.openFinal` | 최종 순위 보기 | — | COPY.drawer.openFinal |
| `board.final.title` | 학급 신약 개발 최종 순위 | — | §5.16, COPY.final.title |
| `board.final.previewTitle` | 최종 순위 미리보기(마감 전 · 선생님 전용) | — | §5.16, COPY.final.previewTitle |
| `board.final.frozenAt` | {at}에 마감되었어요. 이 뒤의 소식은 최종 순위를 바꾸지 않아요. | `{at}` | §5.16, COPY.final.frozenAt |
| `board.final.intro` | 각 스타트업이 신약 개발 파이프라인을 밟으며 쌓은 연구 결과와 과정이 최종 기업가치로 집계되었어요. | — | §5.16 |
| `board.final.podium` | 시상대 | — | COPY.final.podium |
| `board.final.podium1` | 1위 · 최우수 스타트업 | — | §5.16 |
| `board.final.podium2` | 2위 · 우수 스타트업 | — | §5.16 |
| `board.final.podium3` | 3위 · 장려 스타트업 | — | §5.16 |
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
| `board.final.approvedYes` | 예 | — | COPY.final.approvedYes |
| `board.final.approvedNo` | 아니오 | — | COPY.final.approvedNo |
| `board.final.trend` | 기업가치 추세 | — | COPY.final.trend |
| `board.final.trendAria` | 모든 스타트업의 기업가치가 수업 동안 변해 온 추세선이에요. | — | COPY.final.trendAria |
| `board.final.myProcess` | 우리 모둠 과정 평가 | — | COPY.final.myProcess |
| `board.final.allProcess` | 모둠별 과정 평가 | — | COPY.final.allProcess |
| `board.final.resultHint` | 결과 점수(0~100점, 상한 100점)는 도킹 신기록(5점×2) · 물질특허(8점×3) · 전임상(10점×1) · IND 승인(12점×1) · 1상 통과(8점) · 2상 통과(10점) · 3상 통과(12점, 각 1번) · 허가(20점×1) · 투자(5점×2) · 항체 트랙(5점×4)을 합산해요. 보류나 실패가 나도 기업가치가 이미 내려가므로 결과 점수는 깎지 않아요. | — | FMARKET, COPY.final.resultHint |
| `board.final.processHint` | 과정 점수(0~100점)는 단계마다 참여 · 합의 근거 · 보완 횟수 · 3R 같은 과정 신호의 가중 평균이에요. 각 단계가 끝날 때 0%에서 최대 +3%까지 기업가치에 이미 반영되어 있어요. | — | FMARKET, COPY.final.processHint |
| `board.final.researchHint` | 연구 역량 지수(0~100점)는 학습 평균 점수 × 단계 커버율(끝낸 단계 ÷ 9) × 0.8 + 4인 발굴 다양성 × 20으로 계산해요. | — | FMARKET, COPY.final.researchHint |
| `board.final.rankingRule` | 최종 순위의 순서는 기업가치(시가총액) 순으로 매겨요. 결과 점수 · 과정 점수 · 연구 역량은 표에 함께 보여 주는 상세 내역이에요. | — | FMARKET, §5.16 |
| `board.final.twoAxisHint` | 학급 성과는 시장 가치를 뜻하는 시가총액 순위와 학습 · 탐구 깊이를 뜻하는 연구 역량 지수 순위의 2축 순위로 함께 살펴봐요. | — | FMARKET, §10 |
| `board.final.ongoingTrialRule` | 마감 때 아직 상 기간이 끝나지 않아 진행 중이던 임상시험은 '진행 중'으로 두고 최종 기업가치에는 넣지 않아요. | — | §5.16 |
| `board.final.encouragement` | 비록 1위가 아니더라도 보류 원인을 분석하고 프로토콜(임상시험의 방법과 절차를 정한 계획서)을 고쳐 다시 도전한 경험이 진짜 신약 개발 역량이에요. 끝까지 함께 연구한 모둠원 모두 수고했어요! | — | §5.16, 4.1 임상 근거 |
| `board.final.close` | 닫기 | — | COPY.final.close |
| `board.final.notYet` | 아직 마감 전이에요. 선생님이 마감하면 최종 순위가 나와요. | — | §5.16, COPY.final.notYet |
| `board.deadline.scheduled` | 마감 시각이 {endsAt}로 정해졌어요. 마감까지 남은 시간은 {left}예요. | `{endsAt}(새)`, `{left}(새)` | §5.16, FMARKET |
| `board.deadline.soon` | 곧 수업이 마감돼요({left} 남음). 마감되면 그때의 기업가치로 최종 순위가 얼어붙어요. | `{left}(새)` | §5.16 |
| `board.deadline.closed` | 수업이 마감되어 기업가치와 순위가 확정되었어요. 이 뒤의 소식은 전광판에 흐르지만 순위를 바꾸지 않아요. | — | §5.16, FMARKET |
| `board.deadline.reopened` | 선생님이 마감을 풀었어요. 확정되었던 최종 순위를 지우고 다시 소식에 따라 기업가치가 움직여요. | — | §5.16, FMARKET |
| `board.teacher.title` | 전광판 · 마감 관리 | — | COPY.teacher.title |
| `board.teacher.projector` | 프로젝터(교실 앞 큰 발표 화면) 보기 | — | FMARKET, COPY.teacher.projector |
| `board.teacher.closeProjector` | 프로젝터 닫기 | — | COPY.teacher.closeProjector |
| `board.teacher.endsAt` | 마감 시각 | — | COPY.teacher.endsAt |
| `board.teacher.schedule` | 정하기 | — | COPY.teacher.schedule |
| `board.teacher.clearSchedule` | 지우기 | — | COPY.teacher.clearSchedule |
| `board.teacher.closeNow` | 지금 마감 | — | §5.16, COPY.teacher.closeNow |
| `board.teacher.closeConfirm` | 지금 기업가치 · 순위를 얼려 최종 순위를 정할까요? 이 뒤의 소식은 순위를 바꾸지 않아요. | — | §5.16, COPY.teacher.closeConfirm |
| `board.teacher.reopen` | 마감 풀기 | — | COPY.teacher.reopen |
| `board.teacher.reopenConfirm` | 최종 순위를 지우고 수업을 다시 열까요? 마감을 풀면 소식에 따라 기업가치와 순위가 다시 움직여요. | — | FMARKET, COPY.teacher.reopenConfirm |
| `board.teacher.finalView` | 최종 순위 | — | COPY.teacher.finalView |
| `board.teacher.finalPreview` | 미리보기 | — | COPY.teacher.finalPreview |
| `board.teacher.notice` | 공지 · 정정 소식 | — | §5.3-표, COPY.teacher.notice |
| `board.teacher.noticeHeadline` | 전광판 문구 | — | FMARKET, COPY.teacher.noticeHeadline |
| `board.teacher.noticeTeam` | 정정할 모둠 | — | COPY.teacher.noticeTeam |
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

**메모**
- 학급 전체 알림인 `board.news.teacherNotice` · `board.news.finalNoticeEmpty` · `board.news.reopenNotice` 는 특정 모둠이 없어 원문 근거처럼 `{ticker}` 없이 `◆` 로 시작하고 명사로 끝나게 다듬었으며, 렌더러가 모든 소식에 `{ticker}` 를 강제한다면 `◆ {ticker}` 를 앞에 붙일 수 있어요.
- `board.news.processEval` 의 단계 식별자 자리표시자는 지시문 3.1의 `{step}` 을 썼고, 기존 코드(`COPY.process.headline`)의 `{stepId}` 와 같은 자리예요.
- 과정 사실 문구 중 분기가 있는 4개 키(`no_reject` · `alt_assay` · `no_hold` · `resilience`)는 원문 근거와 같이 한 칸에 ` / ` 로 두 꼴을 함께 적었어요.
