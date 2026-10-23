# 4.1 임상 문구 — Claude 검토 메모(2026-10-24)

- 대상: `gemini-raw.md`(Gemini 4 Argon High · `--mode plan` · 1회 실행 성공 · 136행 · `gemini-run.log` 비어 있음 = 오류 없음)
- 결과: `copy.md`(157행 = Gemini 136행 + Claude 보충 21행 · 그중 107행 수정)
- 대조 근거: `../2026-10-24-copy-common/brief.md` F41 · 설계 §6.1 · §10 · `design/step-viz/viz-7.js` · `packages/web-contract/src/clinical.ts` · `apps/server/src/features/clinical.ts` · `clinical-sim.ts` · `packages/shared-types/src/gamification.ts`(바운티 이름표)
- 총평: 금액 · 기간 · 요율 · 모집 배율 · 검정력 공식 같은 **숫자는 거의 다 맞았다**. 문제는 ① 서버 값이어야 할 숫자를 문장에 박아 넣은 것, ② 기존 자리표시자의 뜻을 바꾼 것, ③ AI 가 정하는 판정을 규칙처럼 단정한 것, ④ 한 문장에 여러 생각을 넣은 긴 문장이었다.

## ① 설계 사실 대조(금액 · 기간 · 문턱 · 법 조항 · 통계)

맞은 것: 상 비용 1,500,000 / 3,000,000 / 6,000,000 크리스타 · 90 / 180 / 360 게임 일 · 목표 40(항암 30) / 180 / 600 · 최소 24(18) / 108 / 360 · 모집 배율 ×1 / ×2 / ×3.5 · 하루 비용 5,000 · 7,500 · 12,000 / 20,000 · 30,000 · 48,000 · 요인 배율 전부 · 선별 실패 · 탈락 기본값 · 검정력 80% / 90% · 1상 감지력 5% · 바운티 50 / 40 / 30% · 백업 500,000 크리스타 · 30게임 일 · 참고 기준(1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 · S ≥ 55) · 흔들림 ±6 / ±4 · BIO 2016 9.6%.

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| result.consort.read | '완료 비율이 75% 이상이어야 운영 기준을 통과해요' → '75% 아래로 떨어지면 운영 문제로 보류될 수 있어요' | `clinical-sim.ts` 기준은 "75% 아래면 operational 보류를 **고를 수 있다**"다. 75% 이상이 통과 조건은 아니다. |
| verdict.hold.safety | 'DLT 가 1/3 을 넘었거나 SAE 비율이 대조군보다 10%p 넘게 높아' → '약을 받은 군에서 심각한 이상사례가 기준보다 많았어요' | 1상 기준과 3상 기준을 한 문장에 섞었다. 2상 안전 보류(both)에는 둘 다 해당하지 않는다. 상별 기준은 `result.ae.rule` 한 곳에 둔다. |
| result.ae.rule | '…넘으면 안전성 보류가 돼요' → 'AI 시뮬레이션은 이런 기준으로 판정해요 …' + 1상 '심각한 안전 신호' 조건 추가 | 판정은 F41 예외로 AI 가 정한다. 규칙처럼 단정하면 기준과 다르게 나온 결과를 학생이 버그로 본다. 1상 기준의 두 번째 조건이 빠졌었다. |
| viz.701 · 702 · 704 · 706 | '기준' · '통과 확률' → '참고 기준' · '참고 통과 확률' | F41 에서 game-rules 판정은 참고값이다(`PhaseLadderView.refPassProb`). 시안은 규칙 판정 시절에 그려졌다. |
| viz.704.read | '여유가 0 이면 통과 확률이 반반' → '절반을 조금 넘고(13가지 중 7 · 9가지 중 5)' | 시안의 셈(`outs`)은 n = 0 을 통과에 넣는다. ±6 은 7/13 = 53.8%, ±4 는 5/9 = 55.6%다. |
| viz.707.read | '보류 한 번은 그 상 기간만큼 전체 일정을 늘려요' → '다시 모으는 기간과 그 상 기간만큼' | F41 은 '같은 프로토콜 다시'도 참여자를 처음부터 다시 모은다(기본 모집으로 60 · 120 · 150 게임 일 안팎). 시안(옛 규칙)은 모집 기간이 없었다. |
| viz.708.read | '임상을 시작할 때마다 계단' → '시작할 때와 모집에 돈을 쓸 때마다' | F41 은 모집 투자 비용도 원장에 나간다(`FundingStepView.kind = 'recruit'`). |
| viz.705.read | '용량을 내리면 … 모든 관문을 넘는 오른쪽 위 자리로 들어가요' → '보통 … 늘어요. 오른쪽 위 자리를 찾아보세요' | 시안 예시 분자의 결과다. 모든 분자에 맞는 일반 법칙이 아니다. |
| bounty.intro | '{rate}%(1상 50% · 2상 40% · 3상 30%, 모집 투자 비용 제외)' → 숫자 빼고 두 문장으로 | 요율은 `{rate}` 로 이미 들어온다. '모집 투자 비용 제외'는 맞다(`cost_paid_cents` = 상 비용만). 별도로 환급에 상한이 있다 — ⑥ 참고. |
| retry.same.desc | '추가 수수료 0 크리스타, 대기 0게임 일 …' → '참여자를 처음부터 다시 모으고, 시작할 때 상 비용을 다시 내요' 중심으로 | '수수료 0'만 앞세우면 공짜로 읽힌다. 실제로는 상 비용을 다시 낸다. |
| viz.709.read | '실제 세계의 … 규모' 유지 + `viz.709.game_note` 보충 | 시안 7.09 는 실제 규모(수십 · 수백 · 수천)이고 게임 목표(40 · 180 · 600)는 수업용으로 줄였다. 두 숫자가 한 화면에 보여 혼동되지 않게 한다. |

설계 문서와 시안 사이의 **사실 어긋남**(문구가 아니라 원본 쪽 — 고치지 않고 적어 둔다):
- 시안 7.08 원문 '3상 한 번이 앞의 다섯 단계를 합친 돈의 4배'는 옛 비용표(1.2~3.3 = $0.3M) 기준이다. 3판은 3.2 전임상 · 도킹 횟수 과금이 있어 맞지 않는다. 지시문에서 뺐다.
- 시안 7.06 원문 '1상 실패 뒤 네 갈래(다시 · 용량 · 제형 · 후보 교체)'는 F41 의 3경로(용량/제형이 한 경로)와 다르다. 시안 7.07 의 'FDA 용량 변경'도 F41 용어(IND 변경)와 다르다.
- 설계 §6.1 표 4.1 줄은 '앞 판 그대로'다(§6.1 끝: '4.1 · 4.2 상세 설계는 미룬다'). F41 이 실제 근거다.

## ② 자리표시자 — 바뀜 · 새로 생김

**뜻이 바뀐 것(고침)**

| 키 | 원문 → 고친 것 | 이유 |
| --- | --- | --- |
| running.status | `{day}` = 지난 일수 · `{openDay}(새)` = 공개일 → `{day}` = 공개일(기존 뜻) · `{openDay}` 없앰 | `COPY.running` 에서 `{day}` 는 결과 공개 게임 날짜다. 같은 이름의 뜻을 바꾸면 통합 때 틀린 값이 들어간다. |
| recruit.status.speed | `{rate}(기존 이름)` = 하루 모집 인원 → `{perDay}(새)` | `{rate}` 는 `COPY.bountyIntro` 의 환급률(%)이다. `RecruitView.perDay` 에 맞췄다. |
| recruit.status.estimate | `{days}` · `{cost}` = 남은 일수 · 남은 비용 → `{daysLeft}(새)` · `{costLeft}(새)` | `{days}` · `{cost}` 는 상 기간 · 상 비용이다(`COPY.startConfirm`). `recruitProjection` 반환값 이름에 맞췄다. |

**이름을 화면 모양 필드에 맞춘 것**

| 원문 | 고친 것 | 필드 |
| --- | --- | --- |
| `{code}(새)` | `{codeName}(새)` | `TrialProtocolView.codeName` |
| `{dose}(새)` | `{doseMg}(새)` | `TrialProtocolView.doseMg` |
| `{patientGroup}(새)` | `{population}(새)` | `TrialProtocolView.population` |
| `{evalWeek}(새)` | `{primaryWeek}(새)` | `TrialProtocolView.primaryWeek` |
| `{targetPower}(새)` (목표 인원일 때 검정력) | `{powerAtTarget}(새)` | `RecruitView.powerAtTarget` — `{targetPower}` 는 설계 목표(80 · 90%)로 따로 둔다(`PhaseRule.targetPower`) |
| `{hint}(새)` 문장 안 | 없앰 | `TrialBountyView.lastHints` 는 배열이라 목록으로 따로 보인다. |

**숫자를 박아 넣었던 것 → 자리표시자로**(문체 규칙 3 — 서버 값)
- `intro.phase{1,2,3}.who` · `who_oncology`: 40 · 24 · 30 · 18 · 180 · 108 · 600 · 360 → `{target}`. 항암 여부로 값이 바뀌므로 박아 넣으면 틀린다.
- `protocol.cost_duration`: 세 상 금액 · 기간 나열 → `{phase} · {cost} · {days}`.
- `recruit.screen_fail.desc` · `dropout.desc`: 기본값(20/30/35% · 5/10/15%) → `{screenFailPct}(새)` · `{dropoutPct}(새)`. 기본값만 보이면 실제 값(위험 · CNS 가산)과 다르다.
- `recruit.tier.basic.note`: '기본 1상 60일 · 2상 120일 · 3상 150게임 일' 삭제 → 요인 배율 1 일 때의 값이라 실제 남은 일수(`{daysLeft}`)와 다르다.
- `recruit.tier.*.note`: 괄호 안 상별 하루 비용 삭제 — `{cost}` 와 중복.
- `retry.backup.desc`: 500,000 · 30 → `{fee}(새)` · `{waitDays}(새)`(`RouteOptionView.feeCrista` · `waitDays`). `recruit.backup_wait`: 30게임 일 → `{fromDay}(새)`(`RecruitView.availableFromDay`).
- `retry.amend.desc` 의 `{mrsd}` 는 제형마다 다른 값이라 설명 문장에서 빼고, 조합별 막힘 이유(`retry.amend.over_mrsd`)로 옮겼다.
- 남긴 상수: 군 구성 비율(0.25 · 0.5 · 1배 · 25% · 1/3 · 1:1) · 참고 기준 · 흔들림 · 75% · 1/3 · 10%p · 60초 · S ≥ 35 — 규칙 설명 그 자체라서 그대로 두었다. 규칙 값이 바뀌면 이 줄도 같이 바꿔야 한다(⑥).

**새로 생긴 자리표시자 전체(22)**: `{progress}` `{codeName}` `{form}` `{doseMg}` `{population}` `{primaryWeek}` `{speed}` `{perDay}` `{daysLeft}` `{costLeft}` `{screenFailPct}` `{dropoutPct}` `{factor}` `{fromDay}` `{power}` `{powerAtTarget}` `{targetPower}` `{fee}` `{waitDays}` `{next}` `{refProb}` `{s}` — 기존 그대로: `{phase}` `{cost}` `{days}` `{day}` `{min}` `{target}` `{max}` `{rate}` `{crista}` `{n}` `{mrsd}` `{endpoint}` `{unit}`.

## ③ 과학적으로 틀리거나 부정확한 풀이

| 키 | 원문 → 고친 문구 | 이유 |
| --- | --- | --- |
| protocol.endpoint.phase1 | '이상사례(약을 쓴 뒤에 나타나는 원치 않는 증상)' → '시험 중에 생긴 좋지 않은 변화를 모두 뜻해요(약 때문인지와 상관없이)' | 이상사례(AE)는 인과관계를 따지지 않는다. 위약 군에도 생긴다. '약 때문'으로 읽히면 위약 군 이상사례를 이해하지 못한다. |
| protocol.endpoint | '1차 평가지표(약이 효과가 있는지 판단하는 가장 중요한 기준)' → '이 시험이 답하려는 질문을 재는 가장 중요한 잣대' | 1상의 1차 평가지표는 안전(이상사례 비율)이다. '효과'로 풀면 1상과 어긋난다. |
| result.primary.read | '95% 신뢰구간(같은 시험을 반복할 때 95% 확률로 진짜 차이가 들어 있을 범위)' → '같은 방법으로 여러 번 시험하면 100번 중 약 95번은 진짜 값을 품는 범위' | 95%는 구간을 만드는 방법의 성질이다. 한 번 나온 구간에 진짜 값이 95% 확률로 들어 있다는 흔한 오해를 피한다. |
| result.p.def(보충) | 'p 값(약 효과가 전혀 없을 때 우연히 이런 차이가 나올 확률)' → '…이만큼 **또는 더 큰** 차이가 우연히 나올 확률' | p 값은 관측값 이상으로 극단적인 결과의 확률이다. |
| running.mon.herg | 'QT 간격(심장이 한 번 수축했다가 다음 박동을 준비하는 시간)' → '심장 근육이 전기 신호로 수축했다가 회복하기까지 걸리는 시간' | QT 는 심실의 탈분극 ~ 재분극이다. '다음 박동 준비'는 이완기 전체로 읽힐 수 있다. |
| recruit.factor.risk | 'hERG(심장 박동에 관여하는 통로)' → 'hERG(심장 박자를 맞추는 칼륨 통로)' | 어떤 통로인지(칼륨)를 밝혀야 '막히면 QT 연장'과 이어진다. |
| result.pk.read | '흡수 · 분포 · 분해 · 배출' → '흡수 · 분포 · 대사 · 배설' | ADME 의 표준 용어. '분해'는 대사(효소에 의한 변환)를 좁혀 부른다. |
| result.ae.read | 'CTCAE(… 국제 기준)' → 'CTCAE(… 1~5 등급으로 매기는 기준)' | CTCAE 는 미국 국립암연구소(NCI) 기준이다. 널리 쓰이지만 국제 협약 기준은 아니다. |
| result.survival.read | 'PFS(암이 더 자라거나 번지지 않고 환자가 버틴 기간)' → 'PFS: 암이 더 나빠지지 않고 살아 있는 상태' + 곡선이 줄어든다는 설명 | PFS 사건은 진행 **또는 사망**이다. '버틴 기간'은 곡선(비율)과 기간 지표를 섞는다. |
| protocol.design | '누가 진짜 약을 먹었는지' → '받았는지' · '편견' → '치우침' · '대조군이 있는 시험은' 추가 | 정맥주사 · 패치도 있다. 항암 1상은 대조군 · 무작위 배정이 없다. 'bias'는 편견이 아니라 치우침(편향)이다. |
| protocol.arms.phase2 | '위약 대조군' → '대조군은 위약이에요(항암제는 표준 치료)' | `CLINICAL_COPY.arm.controlOnc` — 항암 2상의 대조군도 표준 치료다. |
| running.mon.half | '중간 안전성 점검을 무사히 통과했어요' → '눈가림을 지키려고 결과는 끝난 뒤 한꺼번에 공개해요' | 모니터링 문구는 '결과를 미리 알려 주지 않는다'(`TrialView.monitoring` 주석). 뒤에 안전성 보류가 나오면 앞말과 모순된다. |
| ai.teacher_override | '선생님이 직접 검토해 확정한 수동 판정 표' → '선생님이 판정을 정했어요. 숫자 표는 그 판정에 맞춰 규칙으로 만든 교육용 표예요' | `resultSource = 'teacher'` 의 표는 `ruleSimulate` 가 만든다. 선생님이 숫자를 검토한 것이 아니다. |
| running.pending | '결과의 앞뒤가 맞는지 선생님이 확인하고 있어요' → '결과가 아직 준비되지 않아 선생님이 확인하고 있어요' | pending 은 서버 검사에 두 번 걸렸거나 시뮬레이션이 없을 때다. 서버가 검사하고 선생님은 판정을 처리한다. |
| result.ai_analysis.header | 'AI 임상 시험관의 분석 서술' → 'AI 분석' | '시험관'은 실험 유리관으로 읽힌다. |

## ④ 문체(해요체 · 한 문장 한 생각 · 전문어 괄호 풀이)

- **긴 문장 나누기**(주요): `start.confirm.body`(4가지 생각 → 4문장) · `result.primary.read` · `result.pk.read` · `result.ae.read` · `retry.amend.desc` · `retry.same.desc` · `recruit.factor.*`(배율 숫자 나열을 `recruit.factor.rule` 한 칸으로 모음) · `verdict.held.title`(제목과 안내 분리 → `verdict.held.next`) · `step.sim.desc`.
- **라벨 짧게**: `tier.*.label` '기본 모집 (×1배속)' → '기본'(속도는 `recruit.tier.speed` 따로) · `result.ai_*.header` 의 '(400자 이내)' · '(200자 이내)' 삭제(학생 화면에 필요 없는 서버 상한).
- **질문형 라벨**: `intro.phase1.question` '…안전한가요? 어느 용량까지 부작용 없이 견딜 수 있나요?' → 한 질문만.
- **오해를 부르는 버튼**: `bounty.submit.label` '원인 분석 내고 환급받기' → '원인 분석 내기'(틀리면 환급이 없다).
- **괄호 풀이 보충**: IND(`intro.locked`) · 프로토콜(`step.protocol.desc`) · 추적 소실(`result.consort.reasons`) · 코호트(`bounty.q2.cohort`).
- **선택지 머리**: Q2 · Q3 머리에 선택지 전부를 넣었던 것 → 머리는 짧게, 선택지는 서버 이름표(`BOUNTY_*_LABEL`)로. Q3 은 하나만 고른다(`TrialBountyRequest.remedy: string`).
- **표기**: 문구 안 백틱 전부 삭제(화면에 그대로 찍힘) · 가운뎃점 앞뒤 띄움(저장소 표기) · '스타트업 제약회사의 남은 연구비' → '연구비'(어색한 반복).
- 금지어 점검: `$` · '텃밭' 없음. '실패'는 바운티 · 시안 이름(실패 바운티 · 실패 후 갈림길)과 '선별 실패'에만 남았다.

## ⑤ 기존 `CLINICAL_COPY` 키와 대응

| 기존 COPY 키 | copy.md 키 | 처리 |
| --- | --- | --- |
| question · oneLine · doneWhen | 4.1.intro.question · oneline · done_when | 문구 교체 |
| aiNotice | 4.1.ai.notice | 두 문장으로 |
| tabs.{protocol, recruit, start, result, retry} | 4.1.step.*.label | `tabs.start` '시작 · 진행' → '③ 시작'. `tabs.retry` 는 새 키 없음 — **결정 필요**(⑥) |
| phaseQuestion.* · phaseWho.* · oncologyWho | 4.1.intro.phase*.question · who · who_oncology | `{target}` 새로 씀 |
| arm.{control, controlOnc, low, mid, high} | (그대로) · 4.1.protocol.arms.* | 군 이름표는 기존 키 유지, 설명 줄만 새 키 |
| tier.*.label · note | 4.1.recruit.tier.*.label · note | `{cost}` 그대로 |
| factor.* | 4.1.recruit.factor.* | 문구 교체 + `factor.value` · `factor.rule` 새 키 |
| minNeed | 4.1.start.block.min_need · protocol.sample_size | 나눠 씀 |
| powerNote · power1Note | 4.1.power.23.desc · power.1.desc | |
| startConfirm | 4.1.start.confirm.body | `{n}` 추가 |
| running | 4.1.running.status | `{day}` 뜻 유지 · `{progress}` 추가 |
| monitoring.{start, herg, liver, cns, iv, half} | 4.1.running.mon.* | 서버 `monitoringLines` 가 그대로 씀 |
| pending | 4.1.running.pending | |
| verdictPass · verdictHeld | 4.1.verdict.pass.title · held.title | 짧은 제목 유지 · 안내는 `*.next` 새 키 |
| holdKind.* | 4.1.verdict.hold.* | 이름 + 한 줄 풀이로 늘어남 — 전광판(`holdKind` 이름만 공개)에는 앞부분 이름만 쓴다 |
| routes.{first, next, same, amend, backup} | 4.1.route.first/next.label · 4.1.retry.*.label | |
| routeWhy.* · resetsToPhase1 | 4.1.retry.*.desc · retry.amend.reset_phase1 | |
| bountyIntro · bountyText · bountyOk · bountyNo · bountyOperational | 4.1.bounty.intro(+retry_rule) · text.placeholder · result.ok · result.no · block.operational | |
| locked · done | 4.1.intro.locked · verdict.phase3_done | |
| axisLabel.* | (그대로) | 바운티 Q1 선택지는 서버 `BOUNTY_AXIS_LABEL` — 바꾸지 않음 |

새 키(COPY 에 없음): sidebar.* · step.*.desc · protocol.*(설명) · recruit.status.* · recruit.curve.desc · screen_fail · dropout · backup_wait · power.target · current · low_warn(.phase1) · start.btn · block.budget · running.sim_timing · result.*(해설 13) · verdict.*.next · retry.amend.over_mrsd · no_transdermal · low_safety · retry.block.* · bounty.q*.header · submit · block.claimed · ai.badge · verdict_note · teacher_override · ladder.* · viz.701~710.*.

서버에 하드코딩된 학생 문구(문구 출처를 한곳으로 모으려면 통합 때 옮길 것): `routeOptions` 의 막힘 이유 3개 → `retry.block.*` · `amendOptions` 의 이유 3개 → `retry.amend.*` · 바운티 오류(`분석 글은 …자예요` · `…초 뒤에 다시 낼 수 있어요`) · 전광판 소식(`임상 … 시작 — 지원자/환자 n명`).

## ⑥ 사용자 확인이 필요한 것

1. **판정 주체를 학생에게 얼마나 밝힐까** — `ai.verdict_note` '통과 · 보류 판정도 AI 시뮬레이션이 정해요'를 보일까요? 참고 규칙 판정(교사 화면 전용)이 있다는 사실까지 말할까요?
2. **AI 배지에 모델 이름** — Gemini 는 'AI 교육용 시뮬레이션 (Claude Opus 5.5)'로 썼고, 정리본은 모델 이름을 뺐습니다('AI 시뮬레이션 · 교육용'). `aiNotice` 는 'Claude(AI)'라고만 씁니다. 모델 이름까지 보일까요?
3. **바운티 환급 상한** — 환급은 `min(낸 상 비용 × 요율, 기준 비용 × 요율, 남은 캠페인 상한)`이고, 캠페인 상한은 crista 값(`BOUNTY_LIMITS.campaignCapCents` = 90,000,000 센트 = 4,500,000 크리스타)을 씁니다. 화면에 '최대 …' 를 알릴까요? 이 상한을 4.1 에 그대로 써도 될까요?
4. **`tabs.retry`('보류 뒤 재도전')** — 걸음 ①~⑤ 밖의 여섯째 탭으로 남길까요, 아니면 ⑤ 결과 · 분석 안의 칸으로 합칠까요?
5. **시각화 10종 중 학생 화면에 실제로 넣을 것** — 시안 7.03 · 7.04 · 7.05 는 참고 규칙(흔들림 ±6/±4)을 그립니다. F41 판정은 AI 가 하므로 '참고'라고 적었지만, 판정과 다른 그림이 학생을 헷갈리게 할 수 있습니다. 어느 것을 넣을지 정해 주세요.
6. **시안 7.07 · 7.08 다시 그리기** — 모집 기간 · 모집 비용이 없던 옛 규칙으로 그려졌습니다(7.08 원문의 '앞 다섯 단계 합의 4배'도 옛 비용표). F41 규칙으로 고쳐 그릴까요?
7. **규칙 상수를 문장에 남긴 줄**(군 비율 · 참고 기준 · 75% · 1/3 · 10%p · 60초 · S ≥ 35) — 규칙이 바뀌면 문구도 바꿔야 합니다. 이 값들도 자리표시자로 바꿀까요?
8. **키 이름 꼴** — Gemini 는 `done_when` · `who_oncology` 처럼 밑줄을 섞었습니다. 정리본은 그대로 두었습니다. `4.1.자리.용도` 안에서 밑줄을 허용할까요, 점으로만 나눌까요?

## 독립 검증(2차)

- 날짜: 2026-10-24 · 검증자: Claude(독립 2차 — 앞 검토의 결론을 믿지 않고 근거 파일을 직접 대조)
- 대조한 근거: `../2026-10-24-copy-common/brief.md` 'F41 · 4.1 임상' · 설계 §5.14 · §6.1(4.1 줄) · §10 · `design/step-viz/viz-7.js` · `core.js`(`R.th` · `R.noise`) · `packages/web-contract/src/clinical.ts`(`PHASE_RULES` · `RECRUIT_TIERS` · `recruitModel` · `trialPower` · `armPlan` · `CLINICAL_COPY`) · `packages/game-rules/src/pipeline/rules.ts`(기준 · 흔들림) · `apps/server/src/features/clinical.ts`(`routeOptions` · `amendOptions` · `openTrial` · `startTrial` · `referenceFor` · `refProbAt` · `submitBounty`) · `clinical-sim.ts`(판정 프롬프트 · `validateSimulation`)
- `copy.md` 에서 고친 줄은 근거 칸 끝에 **(검증 수정)**, 새 줄은 **(검증 보충)**. 수정 20행 · 보충 4행 → 161행. `gemini-raw.md` 는 손대지 않았다.

### 1. 숫자 · 금액 · 기간 · 문턱 대조(한 줄씩) — 결과

틀린 숫자는 없었다. 확인한 값: 상 비용 1,500,000 / 3,000,000 / 6,000,000 크리스타(= $0.300M / $0.600M / $1.200M × 5,000 — 환산 맞음) · 90 / 180 / 360 게임 일 · 목표 40(항암 30) / 180 / 600 · 최소 = 목표 × 0.6 올림 · 모집 배율 ×1 / ×2 / ×3.5 · 하루 비용 0 / 5,000 · 7,500 · 12,000 / 20,000 · 30,000 · 48,000 · 요인 배율(S 70 · 50 · 35 · E 60 · 40 · 위험 0.9 · 0.95 · 정맥 0.85 · 경피 1.05 · CNS 0.85 · 유병 1.2 · 0.6) · S < 50 탈락 +5 · 검정력 80% / 90% · 1상 감지력 1 − 0.95^(약 군 인원) · 군 구성(0.25 · 0.5 · 1배 · 25% · 1/3 · 1:1) · 1차 평가 4 / 12 / 24주 · DLT 1/3 · SAE 10%p · 완료 75% · 참고 기준(1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 · S ≥ 55) · 흔들림 ±6 / ±4 · 7/13 · 5/9 · 바운티 50 / 40 / 30% · 상 비용만 환급(`cost_paid_cents`) · 60초 · 글 40~600자 · 백업 500,000 크리스타 · 30게임 일 · 아이콘 1개 = 20명 · BIO 2016 9.6%. 화면 문구에 `$` · 백틱 없음(스크립트로 확인).

### 2. 자리표시자 — 결과

- `gemini-raw.md` 136키가 모두 `copy.md` 에 있다(빠진 키 없음). 표의 '자리표시자' 칸과 문구 안 `{…}` 는 161행 모두 같다(스크립트로 확인).
- 사라진 자리표시자 5곳은 모두 이유가 맞다고 판단해 그대로 두었다: `running.status` 의 `{days}` · `{openDay}`(기존 `{day}` 뜻 지킴) · `running.sim_timing` 의 `{days}`(같은 화면에 공개일이 있음) · `retry.amend.desc` 의 `{mrsd}`(제형마다 값이 달라 `retry.amend.over_mrsd` 로 옮김) · `bounty.result.no` 의 `{hint}`(`lastHints` 는 배열 — 목록으로 따로 보임) · `power.target` 의 `{target}` → `{targetPower}`(문장 뜻이 '목표 검정력'이라 맞음).
- 이번에 새로 쓴 자리표시자: `retry.backup.low_mrsd` 의 `{form}`(이미 `protocol.candidate` 에서 쓰는 이름 — 한국어 제형 이름).

### 3. 이번에 고친 것과 이유

| 키 | 고친 것 | 이유(근거) |
| --- | --- | --- |
| recruit.factor.risk | hERG '심장 박자를 맞추는 칼륨 통로' → '심장 근육이 한 번 뛴 뒤 전기적으로 원래 상태로 돌아오게 돕는 칼륨 통로' | 과학 오류. 박자(박동 리듬)를 만드는 것은 동방결절의 페이스메이커 통로다. hERG(IKr)는 재분극을 맡고, 막히면 QT 가 길어진다. |
| running.mon.herg | QT '심장 근육이 … 수축했다가 회복' → '심실이 전기 신호로 흥분했다가 원래대로 돌아오기까지' | QT 는 심전도의 전기 구간(심실 탈분극 ~ 재분극)이다. '수축 · 회복'은 기계적 움직임과 섞인다. |
| result.primary.read | '차이의' 95% 신뢰구간으로 밝힘 · '효과가 있다고 봐요' 뒤에 '우연일 가능성이 완전히 사라진 것은 아니에요' | p < 0.05 를 '효과 확실'로 읽는 흔한 오해를 막는다(검사 3). 0 을 포함하는지 보는 것은 군 평균이 아니라 차이의 구간이다. |
| result.primary.read.phase1 (보충) | '1상은 군끼리 통계 비교(차이 · p 값)를 하지 않아요 …' | `clinical-sim.ts` 는 1상 comparison 을 null 로 둔다. 2 · 3상용 해설만 있으면 1상 결과판에 없는 p 값을 찾게 된다. |
| verdict.hold.efficacy | '우연이라고 보기 어려울 만큼(p < 0.05) 크지 않았어요'(이중 부정) → '우연으로도 나올 수 있는 정도였거나(p ≥ 0.05), 나쁜 방향이었어요' | 이중 부정이 학생에게 어렵다. 판정 규칙은 'p < 0.05 **이고 좋은 방향**'이라 나쁜 방향도 효능 보류다. |
| bounty.intro | '분석해 내면 … 돌려받아요' → '보류 원인을 맞게 분석하면 …' | `submitBounty` 는 답이 맞을 때만 환급한다. 내기만 하면 받는 것으로 읽혔다. |
| intro.phase2.who | 위약 · 무작위 첫 등장 풀이를 넣고 두 문장으로 | 4.1 첫 화면에서 '위약'이 풀이 없이 먼저 나왔다(검사 4). |
| protocol.arms.phase2 · phase3 | '대조군' 괄호 풀이 · 2상에도 '표준 치료' 풀이 · 2상 줄을 세 문장으로 | 대조군은 어디에도 풀이가 없었다. 화면에는 지금 상 한 줄만 보여 상마다 풀이가 필요하다. |
| step.start.desc | '검정력' 괄호 풀이 | 걸음 안내에서 검정력이 풀이(`power.23.desc`)보다 먼저 보인다. |
| intro.phase1.who_oncology | '건강한 사람에게 주지 않아요' → '독성이 커서 보통 …' | 절대 표현이 사실보다 강하다(일부 표적 항암제는 건강인 시험도 한다). 이유를 넣어 왜 그런지 알게 한다. |
| protocol.scale_note · viz.709.read | 3상 '수천 명' → '수백~수천 명' | 시안 7.09 의 근거(FDA)는 3상 300~3,000명이다. '수천'만 쓰면 과장이다. |
| step.sim.desc · running.sim_timing | '시작하는 순간 … 만들어요' · '이미 만들어졌어요' → '시작하면 …' · '시작할 때 만들어 두어요' | 시뮬레이션은 시작 뒤 대기열(queued)에서 돌고, 실패하면 다시 부르거나 pending 이 된다. '이미 만들어졌다'는 진행 중 화면에서 사실이 아닐 수 있다. |
| retry.same.desc | '기준' → '참고 기준' | F41 에서 E · S 기준은 참고값이고 판정은 AI 가 한다. 다른 줄(viz · ladder)과 표기를 맞췄다. |
| ladder.ref_prob | '목표 인원을 채웠다고 보고' 넣음 | 서버 `refProbAt` 는 목표 인원 기준으로 계산한다. 지금 인원 기준으로 읽으면 틀린다. |
| viz.702.read | '목표 인원보다 적게 모아 시작하면 흔들림 폭이 더 넓어져요' 추가 | 서버 `referenceFor` 는 흔들림 폭을 `max(기본, 기본 × √(목표 / 인원))` 로 넓힌다. 검정력 게이지와 이어지는 핵심 규칙인데 빠져 있었다. |
| viz.703.read · viz.705.read | '참고 규칙으로' · '참고 통과 영역' | 앞 검토가 701 · 702 · 704 · 706 에만 '참고'를 붙이고 703 · 705 를 빠뜨렸다. |
| viz.706.read | '대개 싸고 확실해요' → '통과 가능성이 커져요. 경로마다 드는 돈과 시간이 다르니 함께 견줘 보세요' | F41 규칙에서는 용량/제형 변경도 상 비용을 다시 내고, 제형을 바꾸면 1상부터 다시 해서 더 비쌀 수 있다. 백업 교체는 수수료 · 대기가 더 든다. '싸다'는 시안 예시(옛 규칙)에만 맞다. |
| retry.amend.no_mrsd (보충) | '동물실험 MRSD 가 없어서 같은 제형에서 더 낮은 용량으로만 …' | 서버 `amendOptions` 의 막힘 이유 4개 중 하나가 빠져 있었다. |
| retry.backup.dose_fit · low_mrsd (보충) | 백업 교체 때 MRSD 에 맞춰 용량을 낮추는 규칙 · 그래도 맞는 용량이 없을 때 막힘 | 서버 `openTrial`(backup)의 동작과 오류 문구. 학생이 용량이 왜 바뀌었는지 알 수 있어야 한다. |

### 4. 문체 · 범위 · 설계 예외 — 결과

- 해요체 · 한 문장 한 생각: 위 고친 줄 말고 어긋난 곳은 찾지 못했다. 전문어 첫 등장 풀이는 위약 · 무작위 · 대조군 · 표준 치료(2상) · 검정력(걸음 안내)을 보충했다.
- 범위(검사 5): 이 단계에서 하는 일 · 걸음 ①~⑤ · 프로토콜 · 모집(기본 / 확대 / 집중 · 속도 · 탈락 · 선별 실패) · 검정력 게이지 · [임상 시작] 확인 · 진행 중 · 결과 공개(CONSORT · PK · 이상사례 · 1차 평가지표 평균 / 95% CI / p · 생존 곡선) · 판정 · 보류 종류 4 · 재도전 3경로 · 실패 바운티 · AI 표시 · 시각화 10종 이름과 읽는 법이 모두 있다. 빠진 자리는 아래 질문 2(연구 노트 3칸)뿐이다.
- 설계 예외(검사 6): '판정은 AI(Claude) 시뮬레이션이 정한다'(`ai.verdict_note` · `ai.notice` · `result.ae.rule`) · 공개 시점 '상 기간이 끝나는 날'(`step.sim.desc` · `running.status` · `running.sim_timing`) · 투자 단계 이름 기본 / 확대 / 집중과 '기본 = 추가 비용 없음 · 느림'(`tier.basic.note`) 모두 설계와 같다.

### 5. 남은 확인 질문(2차에서 새로 나온 것)

1. **용량 · 제형 변경의 비용 · 대기** — 설계 §5.14 는 '변경 신고(제형이 바뀌면 3.3 IND 다시)', 시안 7.06 ③ 은 'IND 다시 · 30일'인데 서버 `routeOptions` 는 수수료 0 · 대기 0 이다. 문구(`retry.amend.desc` '수수료와 기다림은 없어요')는 서버를 따랐다. 어느 쪽이 맞나요?
2. **⑤ 결과 · 분석의 '연구 노트 3칸'**(설계 §5.14 표) — 4.1 문구에 칸 이름 · 안내가 없다. 공통 노트 문구(다른 폴더)에서 다루나요, 4.1 에 넣어야 하나요?
3. **참고 판정의 흔들림 모양** — 시안 7.02 메모는 '같은 흔들림이 E 와 S 에 함께 더해진다'인데, 서버 `referenceFor` 는 E · S 에 따로 뽑은 흔들림을 쓰고 인원이 적으면 폭도 넓힌다. 시안을 서버에 맞춰 고칠까요? (문구는 '같은 흔들림'이라고 쓰지 않아 지금은 어긋나지 않는다.)
4. **`power.target` 은 2 · 3상에만** — `PHASE_RULES.phase1.targetPower`(0.8)는 1상 화면에 쓰이지 않는 값이다. 1상에서는 `power.1.desc` 만 보이게 해 주세요(통합 때 확인).
