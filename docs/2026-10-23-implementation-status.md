# 구현 기록 — W1 · W2 · W3(발견 · 최적화) · W6 배포 (2026-10-23)

> 설계 문서(`2026-10-23-crista-web-design.md`)를 다른 세션이 고치는 중이라 구현 결과를 여기에 따로 적는다. 그 세션이 끝나면 §7.2 · §7.3 · §8 · §11 에 옮긴다.

## 1. 지금 열린 것

| 단계 | 상태 | 어디서 확인했나 |
| --- | --- | --- |
| W1 서버 · 계정 | 완료(앞 커밋 a742153) | 로컬 `npm run e2e:w1` 19/19(이번에도 다시 통과) |
| W2 화면 ① ② | 완료 | 로컬 두 브라우저 프로필 · 호스팅 두 프로필 |
| W3 ③ 뼈대 + 1.1 → 2.2 | 완료(로컬 fixture 워커 · 호스팅 compute 워커) | 로컬 두 프로필이 동시에 찜 · 도킹 → 한 비교표 · 노트 칸별 · 리드 지정 / 호스팅 1.1 → 2.1 실제 Vina |
| W6 배포 | 완료 — https://mulk.codes/crista | 호스팅 가입 → 사옥 지구 입사 · 등기 → ③ → 2.1 실제 Vina(ΔG −11.83, PLIP PHE295 · TYR124 · TRP86, 14초) |
| W4 · W5 | 아직 — 3.x · 4.x 는 잠긴 단계(노트 초안만), LED 띠는 설립 등기 소식만 | — |

## 2. 설계와 달라진 것 · 정한 것

- **배포 모양**(§8 은 "서버 하나를 Railway 에"): 사용자 지시로 화면은 Vercel, 공개 주소는 `mulk.codes/crista`. mulk.codes 가 Cloudflare 존(경로마다 Worker)이고
  Vercel rewrite 가 WebSocket 을 넘기지 않아 **Cloudflare Worker 게이트웨이**가 앞에 선다 — `/crista/api` · `/crista/ws` 는 Railway 서버, 나머지는 Vercel. 자세히는 `deploy/README.md`.
- **공개 접두 `/crista`**: 서버가 접두를 떼고 본다(접두 없는 경로도 받는다). 세션 쿠키 `Path=/crista`(같은 호스트의 다른 서비스로 가지 않게). 화면 빌드는 `dist/crista/…`.
- **게이트웨이 비밀**: 호스팅 서버는 `x-crista-gateway` 가 맞지 않는 `/api`(건강 확인 제외) · `/ws` 를 거절, 사용자 IP 는 `x-crista-client-ip`.
- **로그인은 서버 안에서 확인(0004)**: GoTrue 비밀번호 확인 끝점은 IP 당 상한이 있고(호스팅 실측 — 한 IP 동시 40건 중 30 성공 · 10 실패 `503 auth_unavailable`)
  모든 로그인이 서버 IP 하나에서 나가서 한 반이 몰리면 막혔다(한 교실은 학교 공인 IP 하나라 'IP Address Forwarding' 을 켜도 같다).
  그래서 `web.password_verifiers`(scrypt N=2^15 · r 8 · p 1, 상수 시간 비교)로 확인한다 — 가입 · 교사 발급 · 재설정(`passwords.ts changePassword`)이 GoTrue 와 함께 쓰고,
  0004 전에 만든 계정은 다음 GoTrue 로그인이 성공할 때 채운다. 검증값이 있으면 GoTrue 를 부르지 않는다. Supabase Auth 설정은 바꾸지 않았다.
  고친 뒤 호스팅 한 IP 동시 40건 × 3회 모두 200(서버 처리 p50 1.2초). 로컬 GoTrue 는 IP 상한이 꺼져 있어(`GOTRUE_RATE_LIMIT_HEADER` 없음 — 2000건에 429 0건)
  재현은 Kong 앞에 같은 토큰 버킷(용량 30)을 건 프록시로 했다.
  GoTrue 비밀번호를 대시보드에서 직접 바꾸면 그 계정의 검증값 줄을 지워야 한다(교사는 `teacher:create --reset-password` 를 쓴다).
- **가입 몰림**: 정원 확인용 학급 줄 잠금에 같은 학급 가입이 한 줄로 선다. 잠근 뒤에는 '세면서 넣기' 한 문장과 커밋만 두고, DB 풀의 빈 연결 대기를 5 → 20초로 늘렸다
  (호스팅 실측 — 고치기 전 동시 40건 중 18건이 풀 대기 5초 초과로 500, 고친 뒤 40/40 · 서버 처리 p50 8.7초).
- **표(0002_pipeline)**: `programs`(확정 표적 · 주력 리드 · 백업) · `target_picks`(1.1 추천 카드) · `ledger`(정수 센트 · 멱등 키) · `jobs`(워커 작업 · 과금 · 환급 · 폴러 상태) ·
  `claims`(1.2 찜, 후보 하나에 한 명, 한 사람 3개까지) · `notes`(단계 × 칸). 설계 §7.3 의 `patents` · `steps` · `board_events` · `valuations` 는 W4 · W5.
- **비용**: crista 사본 `paidWorkCostCents`(HTVS · 도킹 · ADMET 각 $0.050M), 초기 연구비 `INITIAL_RESEARCH_FUND_CENTS`($6.000M). 첫 유료 작업이 스타트업 이름을 잠근다.
- **환급**: 워커 실행 실패(failed · 시간 초과 · 접수 5회 실패)만 같은 작업 id 로 한 번. 계산할 수 없는 SMILES 는 과금 전에 워커 물성 확인에서 거절.
- **2.2 입력**: 우리 모둠이 지금 표적으로 끝낸 도킹 작업 id 만 받는다(정규 SMILES 를 서버가 그 작업에서 꺼낸다 — crista 결함 '도킹 근거 대조' 회피).
- **사옥 외관 8종 × 3단계**: `tools/gen-campus-assets.mjs` 가 SVG 로 만든다(빌드 때 생성, 커밋하지 않음). 잉크 8색은 앞 4색 crista `TEAM_INK` + 06 팔레트 4색(`apps/web/src/ink.ts`).
- **작용기 변형 칩**: 워커 `POST /molecule/transform` 이 crista 에 없어 SMILES 직접 편집 + 무료 물성 미리보기 + '구조 바꿔 다시'(부모 작업 기록)로 대신했다(설계 §10 그대로).

## 3. 호스팅에 만든 것

| 어디 | 무엇 |
| --- | --- |
| Supabase crista(호스팅) | 스키마 `web`(0000 · 0001 · 0002 · 0004), 역할 `crista_web`(세션 풀러 `crista_web.<ref>`), 경계 점검 12/12 |
| Railway 프로젝트 crista | 서비스 `crista-web`(싱가포르 · 복제본 1) — https://crista-web-production.up.railway.app (게이트웨이 비밀 없는 API 는 403) |
| Vercel 팀 moranzz | 프로젝트 `crista-web` — https://crista-web.vercel.app |
| Cloudflare 존 mulk.codes | Worker `crista-web-gateway` · 경로 `mulk.codes/crista` · `mulk.codes/crista/*` |
| 호스팅 계정 | 교사 `webteacher`(선생님) · 점검 학급 `W6 배포 점검`(코드 JGED5W) · 점검 학생 `w6stua` · `w6stub` · 모둠 「배포바이오」 BAEP |
| 호스팅 계정(로그인 몰림 점검) | 교사 `lbteachaa32` · 학급 「로그인 몰림 점검 acef」(6B94NV, 학생 22 — 고치기 전 가입) · 「로그인 몰림 점검 acc5」(GVTS2N, 학생 40) — 아이디 `lb…` |

## 4. 남은 위험 · 결정

1. **crista 의 Railway IaC** — crista PR #7(`deploy/railway-keep-crista-web`)이 `crista-web` 을 그 파일에 적어 plan 이 변경 0건이 됐다. **병합 전까지는** crista main 에서 apply 하면 지우는 계획이 그대로 나온다.
2. 워커는 지금 표적 7종(crista `DOCKING_TARGETS` — 2026-10-25 에 ALK `2XP2` · ERBB2 `3PP0` · GCK `1V4S` 를 재도킹 검증 통과분으로 열었다, §6.1.1-a). 12대 질환 확장(§6.1.1)은 그대로 crista 저장소 변경이고, 검증에서 떨어진 표적 8종은 draft 로 닫혀 있다.
3. 로그인은 GoTrue 상한과 무관해졌다(위). 0004 전에 만든 계정만 첫 로그인 한 번 GoTrue 를 거친다.
4. 호스팅 점검 학급 · 계정(W6 · 로그인 몰림 점검)을 남길지 지울지.

## 5. 3판 기반(2026-10-24) — DB · 규격 · 서버 공통

> 3판 설계(§5.4~§5.13 · §6.1~§6.4 · §7.3 · §7.4) 와 학습 연구비 두 문서를 기능 에이전트 7명(F12 · FSEL · F31 · F32 · F33 · FLEARN · FMARKET)이 병렬로 채울 수 있게 **자리**를 만들었다.
> 화면 공통(둥근 섬 · 단계 파일 분리)은 같은 때 다른 작업(기반 B)이 했다.

### 5.1 정한 것

| 무엇 | 어떻게 |
| --- | --- |
| DB | `0005_screen_meeting` · `0006_develop_regulate` · `0007_market_learn` — 설계 §7.3 의 3판 표 전부 + 학습 연구비 §6.1 의 10표 + 전광판 `board_events` · `valuations` + `llm_calls`. 로컬 적용 · 경계 점검(3판 표 29개가 `web` 에만 있는지 · `public` 에 함수 만들기 거절을 더함) 통과. 호스팅은 아직(확인 뒤) |
| 기능 스키마 고치기 | 기능 에이전트는 예약 번호 새 파일만(F12 0010 · FSEL 0011 · F31 0012 · F32 0013 · F33 0014 · FLEARN 0015 · FMARKET 0016) |
| 9단계 | `StepId '3.3'` · `STEP_IDS` 9 · `STEP_META`(2.2 'ADMET 예측 · 특허 후보' · 3.1 선언 · 물질특허 · 3.2 전임상 · 동물실험 · 3.3 제형 · IND 신청) · `STEP_REQUIRES` · `DEFERRED_STEPS`(4.1 · 4.2). `StepView` 에 `phase` · `attempt` · `durationGameDays`, `index` 는 1 \| 2 \| 3. 노트 '3.2' 칸은 '3.3' 으로 옮겼다(0006) |
| 단계 완료(서버 `computeSteps`) | 1.2 실행 1회 · 2.1 도킹 1건 · 2.2 특허 후보 1개 이상(`lead_candidates`) · 3.1 유효 특허 1건 · 3.2 승인 계획서 + 동물실험 묶음 완료 + 주력 지정 · 3.3 IND 승인 · 4.1/4.2 '상세 설계 미룸' 잠김. 3.1 심사 중 · 3.2 동물실험 중 · 3.3 접수 중은 running, IND 보류는 held |
| 화폐 | 화면 단위 크리스타, 원장은 정수 센트 그대로 — **1 크리스타 = 20 센트**(`$0.001M = 5,000 크리스타`). `web-contract/money.ts` 의 `centsToCrista` · `cristaToCents` · `formatCrista` · `INITIAL_FUND_CRISTA = 10,000,000`. `BoardResponse.balanceCrista` |
| 초기 연구비 | **새 모둠부터** 10,000,000 크리스타(= 200,000,000 센트 = $2.000M). 앞 판에 'initial' 줄이 생긴 모둠($6.000M)은 고치지 않았다(로컬 · 호스팅 모두) |
| 학급 게임 시계 | `classes.clock_anchor_at · clock_anchor_day · clock_rate(게임 일/현실 분) · clock_paused` — crista `clock.ts` 앵커 방식에서 수업 세션 · 월 처리를 뺐다. 기본 배율 2(동물실험 28게임 일 = 현실 14분), 기본 **흐름**(교사 시계 화면 전에 만든 학급도 3.2 · 3.3 이 끝나게). `GET/POST /api/classes/:classId/clock`(pause · resume · rate 0.1~60) · 학급 WS `clock` · 5초 틱이 `onGameDay` 처리기를 부름 · 현실 시간 `onRealtimeTick` |
| 3.2 작업 | `jobs.step '3.2'`(stage 5 · facility `alt_assay` · `animal_study` · source `simulation` · `patent_id` · `design_key` · `ends_game_day`) — 워커 폴러는 `ends_game_day` 가 있는 작업을 건드리지 않고, 모둠 동시 작업 상한에도 세지 않는다. 같은 (특허 · 설계)는 부분 고유 키 |
| 서류 심사 엔진 | `apps/server/src/reviews.ts` — 규칙 fail 은 LLM 없이 보완(신규성 · 중복은 거절) · 사전 인젝션 필터 · 정규화 해시 캐시 · `doc_reviews` UQ · 하루 상한(서류 5 · 모둠 15, 모둠 줄 잠금 안) · 비동기 LLM · 최종 = 규칙 ∧ LLM(빠짐 · 앞뒤 안 맞음 · injection 이면 보완) · 판정 뒤 `onReviewed` 처리기를 같은 트랜잭션에서 · 모둠 WS `doc.reviewed` · 재시도 루프 · 거절 · 반복 실패는 교사 채널 알림 → 교사 수동 판정 · 정정(원본 보존) |
| LLM | `apps/server/src/llm.ts` — `@anthropic-ai/sdk` 1.2.0 · `zod` 4. `new Anthropic()`(인자 없음) · `client.beta.messages.parse` · `claude-opus-5-5` · `output_config: { effort: 'medium', format: betaZodOutputFormat(…) }` · system 고정 블록 `cache_control: ephemeral` · **`fallbacks: 'default'` + beta `server-side-fallback-2026-07-01`**(SDK 타입 `BetaFallbacksParam = … \| 'default'` 로 확인, 실제 호출 200) · 거절 먼저 확인 · SDK 형별 예외 · 동시 호출 상한(서버 4 · 학급 2) · 학급 하루 상한 400 · 호출마다 `web.llm_calls`. 키 없음 · `LLM_DISABLED=1` 이면 부르지 않고 'unavailable' |
| 로컬 키 | `tools/with-local-env.mjs` 가 `.env.local` 의 `ANTHROPIC_API_KEY` 한 줄만 서버 환경에 넘긴다(셸의 같은 이름 · `ANTHROPIC_AUTH_TOKEN` 은 지운다) |
| WS | 모둠 `doc.reviewed` · `learn.graded` · `learn.stipend` · `screen.changed`, 학급 `board.event` · `clock` · `patent.ledger`, **교사 채널**(`teacher:<classId>` — 교사만) `teacher.alert`. hub 에 `broadcastTeam` · `broadcastClass` · `broadcastTeachers` |
| 기능 자리 | 서버 `apps/server/src/features/{screen,selection,patents,preclinical,ind,learn,market}.ts`(빈 `register(router)` + 머리 주석에 설계 절 · 표 · 지킬 불변식 · 쓸 helper), 규격 `packages/web-contract/src/{screen,selection,patent,preclinical,ind,learn,market}.ts`(DB 와 맞물리는 상수 · 최소 타입), 공통 규격 `review.ts` · `clock.ts` · `money.ts` |
| 원장 helper | `apps/server/src/ledger.ts` — `charge`(트랜잭션 안 · 모둠 줄 잠금 · 멱등 키 · 잔액 402 · 이름 잠금) · `credit` · `balanceCents`. 원장 종류에 `patent_fee` · `ind_fee` · `learn_*` · `pitch_series_*` · `failure_bounty`, 참조 칸 `ref_type` · `ref_id` |
| 점검 | `npm run e2e:base`(떠 있는 로컬 서버 + 같은 DB — 9단계 화면 · 시계 · 심사 엔진 · 실제 Claude 심사 1건 · 캐시) · `npm run llm:probe:local`(짧은 특허 효과 칸 심사 1건) |

### 5.2 설계와 다른 것 · 덧붙인 것

- **W3 리드 · 백업 이전(0006)**: 2.2 ADMET 작업이던 주력 · 백업을 `lead_candidates`(근거 키 `legacy_lead` · `legacy_backup`)로 옮기고 `program_revisions` 의 지정을 비웠다(`lead_version` +1 — 옛 화면의 지정 요청은 409). 백업이 2.1 도킹 작업이었으면 특허 후보가 될 수 없어 옮기지 않았다. 로컬: 리드 5건 → 후보 5건.
- **옛 찜 근거**: 0005 전의 찜은 근거가 없어 `claims.reason = 'legacy'`.
- **`PUT /api/program/lead`** 는 W3 모양(2.2 ADMET 작업 지정) 그대로 두었다 — 3.2 끝의 주력 · 백업 검사(유효 특허 · 동물실험 완료)는 F32 가 이 경로를 바꿀 때 넣는다. 그 전에 지정해도 3.2 완료는 승인 계획서 · 동물실험이 있어야 한다.
- **심사 입력 스냅숏**: `doc_reviews.request`(그 판의 칸 본문 · 사실 · 체크리스트)를 설계 표에 더했다 — LLM 재시도 · 교사 확인 · 이의 제기가 같은 판을 본다. 이 칸은 0006 을 로컬에 적용한 직후 그 파일에 더했고, 로컬 DB 에는 같은 칸을 더하고 `schema_migrations` 의 0006 검사값을 새 파일 값으로 맞췄다(호스팅에는 아직 적용 전이라 영향 없음).
- **심사 하루 상한은 LLM 을 부르는 요청만 센다** — 규칙에서 끝났거나 · 사전 필터에 걸렸거나 · 캐시면 세지 않는다(`doc_reviews.counted`).
- **사전 인젝션 필터**에 걸린 서류는 LLM 을 부르지 않고 보완 + 교사 알림(설계는 'LLM 플래그면 보완 + 교사 알림' — 앞 단계에서도 같은 처리).
- **LLM 시간 제한**: 요청마다 180초(`LLM_TIMEOUT_MS`) — SDK 기본 10분보다 짧게(심사 하나가 큐를 오래 잡지 않게). 재시도 2회는 SDK 기본 그대로.
- **'학생에게 말하는 법' 단락**은 자리 잡기 초안(`reviews.ts HOW_TO_TALK_TO_STUDENTS`) — §5.12 대로 Gemini 4 Argon (High) 문구로 바꾸고 심사관 판을 올린다.
- 교사 채널(`teacher:<classId>`)을 새로 뒀다 — 인젝션 · 수동 심사 알림을 학생 채널에 싣지 않으려고.

### 5.3 실제 Claude 시험(2026-10-24 · 로컬 · 이 키)

| 시험 | 결과 |
| --- | --- |
| `llm:probe:local` — 효과 칸 심사(ΔG −9.1 vs 기준 −11.5 인데 '더 단단히 붙는다' + 판정을 바꾸라는 우회 문장) | `end_turn` · 응답 모델 `claude-opus-5-5`(대체 실행 없음) · 약 8초 · 입력 202 · 출력 513 · 캐시 쓰기 1,599 토큰. `effect_matches_facts: inconsistent` · `effect_specific: missing` · verdict `revise` · flags `injection` |
| 같은 시험 다시 | 약 7.5초 · **캐시 읽기 1,599**(시스템 프롬프트 고정부가 캐시됨) |
| `e2e:base` 심사 엔진 — 숫자와 맞는 효과 칸 | pending → `pass`(LLM 1회) → 같은 내용 새 판은 `cached`(LLM 다시 안 부름) |

### 5.4 통합 점검 · 수리(2026-10-24)

기반 A(DB · 규격 · 서버)와 B(화면)를 합쳐 돌려 보고 고친 것이에요.

| 고친 것 | 내용 |
| --- | --- |
| **1.2 찜 500(회귀)** | 0005 가 `claims.reason` 을 not null 로 바꿨는데 W3 찜 경로가 그 칸을 넣지 않아 모든 찜이 500 이었어요. `ClaimRequest.reason?`(키 꼴 `^[a-z][a-z0-9_]{0,39}$`, 비우면 `'legacy'`)를 받아 넣게 했어요. 근거 칩 · 재판정(§7.4 ⑧)과 필수로 바꾸기는 F12 몫이에요 |
| `e2e:parallel` | 3판 의미에 맞췄어요 — 서버를 비켜 넣는 찜에 `reason`, W3 주력 지정 뒤 2.2 는 끝나지 않음(§6.1: 특허 후보 1개 이상) · 3.1 잠김 |
| **0008_same_team_keys** | `jobs (patent_id, team_id)` → `patents(id, team_id)` · `jobs (protocol_id, team_id)` → `iacuc_protocols(id, team_id)` · `iacuc_protocol_patents.team_id` + 양쪽 복합 외래 키. 0006 은 단일 키라 서버를 비켜 가면 남의 모둠 특허 · 계획서를 가리킬 수 있었어요 |
| 빈 DB 적용 시험 | 빈 DB(로컬 클러스터 안 임시 DB + `auth.users` 흉내)에 0000~0008 을 처음부터 적용 — 통과. 로컬 `web` 스키마와 칸 · 제약 · 색인 · 함수 951개가 모두 같아요(0006 손 수정 뒤에도 어긋남 없음) |
| **전광판 소식 helper** `apps/server/src/board-events.ts` | `postBoardEvent(tx, deps, { classId, teamId, kind, headline, public?, idemKey?, tone?, gameDay? }) → { created, event, after }` — 학급 `class_seq`(classes `for no key update`) · `idemKey` 한 번 · 커밋 뒤 `after()` 가 학급 WS `board.event`. FMARKET 은 `onBoardEvent(name, (tx, event, deps) => …)` 로 기업가치 · 변동률 · 헤드라인을 붙여요(F31 · F32 · F33 · FLEARN 이 FMARKET 을 기다리지 않게). `e2e:base` 에 동시 4건 점검 추가 |
| **작업 접수 고리** `jobs.ts` | `onJobPrepare(step, hook)`(기본 입력 확인을 대신하거나 검사만 더함) · `onJobAdmit(step, hook)`(접수 트랜잭션 안 · 모둠 잠금 뒤) · `onJobSucceeded(name, hook)`(성공 커밋 뒤 — FMARKET 도킹 신기록). 고리 결과의 `snapshot` 은 `jobs.params.snapshot` 에 두고 워커에는 보내지 않으며 성공하면 `result.snapshot` 으로 붙어요(§7.3 '1.2 실행 기록'). F12 · FSEL 이 `jobs.ts` 를 같이 고치지 않아도 돼요 |
| 3.2 결과 모양 | `web-contract/preclinical.ts` 에 `AnimalStudyResult`(제형별 MRSD · 종별 NOAEL · HED · 안전계수 · 소견 …) · `AltAssayResult` · `asPreclinicalResult` — F32 가 쓰고 F33 이 읽는 칸을 미리 정했어요 |
| 화면 `useLive(path, refetchOn)` | `board/ui` — 기능 GET 을 읽고 관련 WS 가 오거나 다시 붙으면 다시 읽어요(150ms 묶음 · 늦은 옛 응답 버림) |
| 2.2 완료 조건 문구 | `STEP_COPY['2.2'].doneWhen` 을 서버 판정(§6.1)과 같게 '특허 후보 1개 이상(주력 · 백업은 3.2 끝에서)' 으로 |

## 6. 기능별 구현(2026-10-24)

### 6.1 F12 — 1.2 기준 회의 · 내 작업대 도구 5종 · 분자 쇼핑 · 확정서(설계 §5.5 · §5.5.1 · §7.3 · §7.4 ②⑥⑦⑧ · §11 W7)

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 규격 | `web-contract/src/screen.ts` — 안건 6 · 값 범위 · `SCREEN_RO5_VALUES_NOW = [0, 1]`(§12-6) · 정족수 · `SCREEN_MISSIONS`(워커에 있는 4 표적 ACHE · EGFR · DPP4 · PTGS2 — 이야기 · 브리핑 정답 · 대조군 · 조언값 · 심사관 카드 8장) · 깔때기 엔진 `screenFunnel`(남은 분자 · 아는 약 계열 k/K · 농축도 · 상위 10 — 브라우저 · 서버 같은 함수) · `screenMissed` · 판정 구간 · 회의 코치 `agendaCoach`(미리보기 `AG[].reasons[].check`) · 찜 근거 `claimCoach`(`CLAIM_R`) · 학생 문구 `SCREEN_COPY` 한곳(해요체 초안 — §5.12 다듬기 대상, 규칙 값은 그 밖) · `SCREEN_API`. `ClaimRequest.reason` 필수(pipeline.ts) |
| 서버 | `apps/server/src/features/screen.ts` — `GET /api/screen`(회의 · 실행 기록 스냅숏 · 진열대 · 찜) · `GET /api/screen/compounds`(라이브러리, 사전 Vina 뺌) · `POST /api/screen/briefing · proposals · votes · agendas/:agenda/reopen` · `POST /api/claims`(routes.ts 가 이 파일의 `claimScreenCandidate` 를 부름). WS 모둠 `screen.changed` |
| ⑥ 회의 | 안건 행 `FOR UPDATE` → 합의면 409 `already_exists`(합의값 글) → 표 upsert → 지금 round 표를 세어 `screenQuorum(그 시각 모둠 인원)` 이면 합의. 제안 = 자기 제안에 찬성. 제안 값을 고치면 그 안의 다른 사람 표 삭제. 다시 논의 = round + 1 · 그 안건 표 삭제(이미 열려 있으면 그대로 — 동시 2건이어도 한 번) |
| ⑦ 실행 | `onJobPrepare('1.2')` — 요청 params 무시, 합의값 6개로 서버가 깔때기를 세어 스냅숏(기준 · round · 관문별 수 · 통과 id · 판정 · 놓친 3개)을 만들고 워커에는 아는 네 관문만(MW · TPSA · ro5Only · excludeAlerts · topN 500). `onJobAdmit('1.2')` — 안건 행 `FOR SHARE` 로 그 사이 기준이 바뀌었으면 409 stale · 진행 중 1.2 가 있으면 409(실행한 사람 이름). DB: **`0010_screen_run_once`** 부분 고유 키 `jobs (program_revision_id) where step = '1.2' and status in (queued, running)` |
| ⑧ 찜 | 근거 필수 · `claimCoach` 재판정(막음이면 400 `reason_blocked`) · 그 버전 마지막 성공 1.2(스냅숏 있는 것)의 통과 id 만 · 화면이 본 진열대(`screenJobId`)가 낡았으면 409 stale · 1인 2칸 advisory 잠금 + 칸 고유 키 · 같은 분자 PK + 409 담당자 이름 |
| §5.5.1 사전 Vina | `/api/screen/compounds` 는 `vinaKcalByTarget` 를 옮기지 않음. `pipeline.ts jobView` 가 1.2 결과에서 표(사전 ΔG 열) · 주석 · 후보 `vinaKcal` 을 뺌. W3 미리보기(`/api/datasets/funnel`)의 `vinaKcal` 은 null. 찜 `claims.vina_kcal` 은 **서버 전용 칸**으로 채운다(검토 수리 — FSEL 찜 회고 평균이 읽음). 화면으로는 나가지 않음(board.claims `vinaKcal` 늘 null · `/api/screen` 은 이 칸을 읽지 않음). 서버 전용 원자료는 `screenLibrary(deps, targetId).raw` |
| 화면 | `steps/s12.tsx`(+ `s12-parts.tsx` 점수판 · 깔때기 띠/막대 · 분포 SVG · 서랍, `s12-tools.tsx` 01 기준 설계실 · 03 화학 공간 울타리(끌기 + 네 변 숫자 칸) · 04 내가 심사관 · 05 진열대 표, `s12.css`). 머리 탭 ①~⑤ · 안건 탭 · 도구 탭은 개인 상태, 초안 값은 `useBenchState`. 회의 코치는 경고만(막음 근거도 '잠깐!' 경고), 찜 막음은 확정 단추를 막음. 그래프는 SVG 직접(새 라이브러리 없음) |
| 점검 | `npm run e2e:screen`(4인 동시 — 14/14) · `e2e:parallel` 을 3판 1.2 에 맞춤(합의 뒤 실행 · 진열대 id · 근거 'top' — 16/16) · 단위 `web-contract/test/screen.test.ts` 10 · `server/test/screen.test.ts` 5(옆 저장소 crista 워커 자료가 있으면 실제 220종으로 카드 판정 · 대조군 확인) · 화면 1440 · 390(가로 넘침 0) `.review/2026-10-24-f12/` |

**설계와 다르게 정한 것**
- **깔때기는 서버가 센다** — 워커 `htvs` 는 QED · 표적 점수 관문이 없고 후보를 12개만 돌려준다. 그래서 실행 스냅숏(통과 id · 관문별 수)은 서버가 라이브러리(워커 `/datasets/compounds`, 30분 캐시)로 미리보기와 같은 함수로 센다. 워커 작업은 실행 기록 · 과금 · 진행 상태 · 결과 성격(fixture/dataset)을 그대로 맡는다.
- **숨은 분자(§12-6)** — 워커는 Ro5 위반 2개 이상인 분자(지금 1종 · Epirubicin)를 돌려주지 않는다. 깔때기는 전체 220 에서 시작하고 그 수를 Ro5 관문에서 늘 빠진 것으로 센다(물성을 모르므로 MW · TPSA 관문의 빠진 수는 그 1종만큼 실제와 다를 수 있다 — 최종 남는 수는 같다).
- **'다시 실행'의 진열대** — 진열대 · 찜 대상은 그 버전 마지막 **성공** 실행. 다시 실행해도 이미 한 찜은 지우지 않는다(찜은 그 실행 id 를 `screen_job_id` 로 남긴다).
- **'[기준 다시 회의]'** 는 회의 걸음으로 옮기기만 한다(미리보기처럼 모든 합의를 한꺼번에 풀지 않는다 — 안건마다 '다시 논의').
- **구조식** — 구조 그림 라이브러리(미리보기의 SmilesDrawer)를 들이지 않아 SMILES 상자로 보인다(새 라이브러리 금지).
- 3 · 4 표적(EGFR · DPP4 · PTGS2)의 심사관 카드 8장은 같은 틀(통과 2 · 규칙이 잡은 위험 2 · 규칙이 놓친 위험 1 · 경계 3)로 이 판에서 골랐다(로페콕시브 · 글리버라이드 · 트로글리타존 등 — 이야기는 사실만, §5.12 검수 대상).

#### 6.1.1 F12 적대적 검토 · 수리(2026-10-24)

설계(§5.5 · §5.5.1 · §7.4 ②⑥⑦⑧)와 코드를 직접 대조해 찾은 결함과 고친 것.

| 심각도 | 결함 | 고친 것 · 시험 |
| --- | --- | --- |
| 높음 | **늦은 찬성이 바뀐 안에 붙음**(⑥) — 찬성 요청이 제안자만 가리켜, 제안자가 값을 고친 직후 도착한 낡은 화면의 찬성이 새 값에 찬성으로 세어졌다('값을 고치면 표를 지운다'의 뜻이 깨짐) | `ScreenVoteRequest.value`(화면이 본 값) 필수 · 안건 행 잠금 안에서 지금 값과 다르면 409 `stale`(바뀐 값 글). 화면 · `e2e-parallel` 이 값을 싣는다. e2e: 값 고침 ∥ 찬성 동시 → 바뀐 안에 표 없음 · 낡은 값 409 · 값 없음 400 |
| 중간 | **떠난 모둠원의 표가 정족수 셈에 들어감**(⑥) — 정족수는 지금 인원으로 줄어드는데 표는 떠난 사람 것까지 셌다(4→3명에서 떠난 사람 표 + 1표 = 합의) | `settle` · 회의 응답이 지금 그 모둠 학생의 표만 센다. e2e: 3명(정족수 2)에서 떠난 사람 표 + 1표는 합의 아님 · 2표째 합의 |
| 중간 | **FSEL 찜 회고가 늘 비어 있음**(§5.5.1 접점) — F12 가 `claims.vina_kcal` 을 null 로 넣어 `selection.ts retroMeans` 의 '우리 찜 평균 ΔG' 가 늘 null | 찜할 때 서버 전용 원자료의 사전 Vina 값을 넣는다(화면 응답에는 여전히 없음 — board.claims null · `/api/screen` 미포함). e2e: DB 칸은 채워지고 응답 문자열에는 그 값이 없다 |
| 낮음 | 장바구니 · 확정서의 2.1 도킹 예상이 대조군을 찜했을 때 대조군을 두 번 셈((찜 + 1) 고정) | `dockQueue` — 대조군을 찜했으면 +1 하지 않음 |
| 낮음 | 화면 틀 문구 약 50곳(섬 제목 · 탭 보조 · 표 머리 · 범례 · aria)이 `SCREEN_COPY` 밖에 하드코딩 — §5.12 한꺼번에 다듬기에서 빠짐 | `SCREEN_COPY.ui` 로 옮김(s12 · s12-parts · s12-tools) |

**확인했고 맞았던 것**: 안건 범위 · 근거 키 · 코치 문턱(미리보기 `AG` · `CLAIM_R` 와 같음) · 조언값 4 표적 · 판정 구간 0 / 1~7 / 8~40 / 41~ · ⑦ 합의 전 409 · 진행 중 409 + 0010 키 · 같은 requestId 멱등 · 과금 `job:<id>` 1회 · 실패 환급 `refund:<id>` 1회 · 1.2 비용 250,000 크리스타(5,000,000센트) · 찜 막음 서버 재판정 400 · 진열대 = 마지막 성공 실행 · 1.2 화면 응답(화합물 · 회의 · board 1.2 결과 표 · 주석 · 후보)에 사전 Vina 없음 · 공개 범위(모든 소식은 모둠 채널, 전광판 · 학급 채널 없음) · LLM 호출 없음.

**남긴 것**: ⑤ 의 '학습 연구비 중급 문항'은 FLEARN 의 단계 문항이 맡는다(이 화면에는 노트 3칸만). FSEL 의 '결합 예측 상위 n 그대로 찜했다면' 평균은 지금 워커 후보 12개(QED · 점수 관문 전)에서 고른다 — 진열대(`snapshot.passIds`) 상위 n 이 설계 뜻에 더 맞다(FSEL 쪽 고침 대상). 로컬 DB 역할 연결 한도 30 을 서버 여러 개가 나눠 써서 e2e · 화면 점검이 가끔 'too many connections' 로 끊긴다(환경).

### 6.2 FSEL — 2.1 결과 읽기 · 2.2 대기열 · 2.2 리드 읽기 · 특허 후보(설계 §5.6 · §5.7 · §6.3)

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 경로 | `GET /api/selection`(그 모둠만) · `POST/DELETE /api/selection/dock-picks[/:jobId]` · `POST/DELETE /api/selection/lead-candidates[/:jobId]` — `apps/server/src/features/selection.ts` |
| 표 | 0006 의 `dock_picks` · `lead_candidates` 그대로. **새 마이그레이션 없음**(예약 0011 은 쓰지 않았어요 — 상한 · 칸은 0006 키 + 아래 잠금으로 충분) |
| 불변식 | 담기 · 빼기는 `programs for share` → `program_revisions for no key update`(표적 버전 행) 안에서 모둠 상한(8 · 4) · 빈 칸을 세요. no key update 라 작업 접수(jobs 외래 키의 key share)와 서로 막지 않아요. PK 충돌 → 409 `claimed`(먼저 담은 사람) · 칸 키 위반 → 409 `limit_reached` |
| 근거 칩 재판정 | web-contract `dockReasonVerdict` · `candidateReasonVerdict` — 화면과 서버가 같은 함수. 막음 → 400 `reason_blocked`(화면과 같은 문구) |
| 2.2 대기열만 | `onJobAdmit('2.2')` — 모둠 잠금 안에서 `dock_picks` 행 `for share` · 같은 분자의 살아 있는 2.2 가 있으면 409 `already_exists`(4명이 동시에 눌러도 과금 1번) |
| 수심계 | 라이브러리 가운데값 · 1위 ΔG **숫자 두 개만**(워커 `/datasets/compounds` 10분 캐시) + 이름 붙은 교육용 이정표 히스타민(`HISTAMINE_COMPOUND_ID` 한 분자). 분자 이름 · 분자별 사전 Vina 값은 응답에 없음. 사전 값 이정표는 모둠이 도킹을 하나라도 끝낸 뒤에만 내려가요(1.2 동안 이 경로로 미리 보지 않게 — e2e 가 확인) |
| 찜 회고 | 도킹이 하나라도 끝난 뒤에만. 찜마다 우리 도킹 ΔG · 라이브러리 순위 · 근거 + 한 줄(우리 찜 · 1.2 표적 점수 상위 n 의 사전 Vina **평균 두 개**) |
| 출신 · 공지 물질 | 평면 SMILES(워커 RDKit) → 정규 SMILES 순으로 라이브러리와 맞춰 `targetId` · 기전. 변형체는 맨 처음 조상의 출신 + 변형체. 'ChEMBL 승인약' · 'ZINC 소형' · 기준 리간드 = 알려진 물질 → `lead_candidates.known_substance` |
| E · S | 서버가 game-rules `scoreCandidate` 로 제형 3 × 용량 3 = 9칸을 내려줘요(흔들림 전). 화면은 그리기만(4.03 · 4.04 · 4.10) · 머리에 `PreShakeBadge` |
| 화면 | `s21.tsx` — 탭 ① 분자 고치기 · 3.05 수심계(SVG) · 3.09 점수 카드 · 3.07 10배 계단(SVG) / 오른쪽 찜 회고 · 도킹 비교표(출신 칩) · 2.2 대기열(ReasonChips · 출신 다른 표적 · 공지 물질 확인 창). `s22.tsx` — 탭 ① ADMET 실행(대기열 분자만) · 4.02 레이더(SVG) · 4.03 신호등 표 · 4.04 몸속 여행 지도 · 4.10 점수 분해 사슬 / 오른쪽 특허 후보(근거 칩 7종 · 뇌 칩은 CNS 만) · ADMET-AI(참고, 접힘). W3 '주력 · 백업 지정' UI 는 뺐어요(F32) |
| 문구 | 모두 `SELECTION_COPY`(web-contract `selection.ts`) 한곳 — §5.12 Gemini 다듬기 대상 |

**설계와 다르게 정한 것**
- 수심계의 '히스타민' 이정표는 검토 뒤 넣었어요(설계 §5.6 표 · 시안 viz-3) — '숫자 두 개만'은 라이브러리 가운데값 · 1위(분자 이름 없이)에 대한 규칙이고, 히스타민은 아주 약한(p 0) 이름 붙은 기준점이라 1.2 진열의 답이 되지 않아요.
- 라이브러리 가운데값은 워커가 Ro5 위반 2개 이상 1종(Epirubicin)을 늘 빼서 '220종'이 아니라 사전 도킹 값이 있는 218종 기준이에요(화면은 `of` 수를 그대로 보여요).
- 점수 카드에 구조식 그림은 없어요(화면에 2D 그리기 부품이 없음) — SMILES 글자로 대신해요.
- 같은 분자 ADMET 은 한 번만(409) — 결정적 결과라 다시 과금할 이유가 없어요.
- 빼기는 담은 사람만(1.2 찜과 같은 규칙). 살아 있는 3.1 출원서가 쓰는 특허 후보는 뺄 수 없어요(409).

**시험**: `packages/web-contract/test/selection.test.ts`(17) · `apps/server/test/selection.test.ts`(11) · `npm run e2e:selection`(18 점검 — 4인 동시 담기 · 칸 burst · DB 제약 탐침 · 대기열 밖 ADMET · 동시 ADMET 과금 1번 · 빼기 ↔ ADMET 동시 · 특허 후보 동시 4건 · 같은 후보 경합 · public 행 수 무변경 + 아래 검토 항목). `e2e-parallel.ts` 는 ADMET 앞에 대기열 담기 한 줄을 더했어요(3판 규칙).

**적대적 검토 · 수리(2026-10-24)** — 고친 것
- **같은 분자 두 번**: 두 사람이 같은 분자를 따로 도킹하면 대기열 두 칸 · ADMET 두 번(이중 과금)이 됐어요. 이제 대기열은 정규 SMILES 로 같은 분자를 409 `claimed`(표적 버전 잠금 안), `onJobAdmit('2.2')` 중복 검사도 `parent_job_id or smiles` 로 봐요. 화면은 같은 분자를 고르기 목록 · 점수 카드 단추에서 뺐어요.
- **특허 후보 1인 상한 우회**: 빈 칸을 칸 번호로만 골라서, 2명 모둠 때 칸 2 를 받은 사람이 모둠이 3명 이상이 된 뒤 칸 1 을 또 받을 수 있었어요 → `freeSlot(mine, perPerson)`이 가진 수로 세요(단위 시험).
- **사전 Vina 누출**: `/api/board` 의 `claims[].vinaKcal` 이 1.2 동안 브라우저로 갔어요 → `pipeline.ts` 에서 null(화면은 쓰지 않음). `/api/selection` 의 가운데값 · 1위도 도킹 전에는 null.
- **특허 후보 빼기 ↔ 3.1 출원서 경합**: 빼기를 '지우고 → 출원서 확인' 순으로 바꿨어요(출원서 쪽이 후보 행을 `for share` 로 잡으면 어느 순서로 와도 '후보 없는 출원서'가 생기지 않음 — F31 쪽 한 줄이 남아요).
- 틀린 id 빼기 500 → 404, 찜 회고의 우리 도킹 ΔG 를 라이브러리 id 로 맞춤(SMILES 표기가 달라도), 찜 근거 키를 F12 `SCREEN_COPY.claimReasons` 글로, 4.04 몸속 여행 지도에 심장 · 간에서 깎이는 안전 S 양(`ScoreCell.inputs.herg · liver`), 4.03 신호등 표를 설계 신호 5개로(Ro5 열 빼서 1440 에서 E · S 가 잘리지 않게), 점수 카드가 긴 기전에 옆 카드 밖으로 넘치던 것, 화면 '효능 1위' 판정 재료를 서버와 같게(기준 약 제외), `loadSelection` 이 요청마다 연결 5개를 쓰던 것을 1개로.


### 6.3 F31 — 3.1 물질특허(설계 §5.8 · §5.8.1 · §5.11 · §7.4 ⑩ ⑪ ⑫)

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 경로 | `apps/server/src/features/patents.ts` — `GET /api/patents`(그 모둠 · 교사는 `?teamId=`) · `GET /api/patents/ledger`(학급 원장 · 교사는 `?classId=`) · `POST /api/patents/applications` · `PUT …/:id/code` · `PUT …/:id/sections/:section` · `POST …/:id/precheck` · `POST …/:id/review` · `POST …/:id/abandon` |
| 표 | `0012_patents.sql` — 출원서에 물질 칸(`canonical_smiles` · `flat_smiles` · `properties` · `known_substance`) · `reject_reason`(known · duplicate) · 부분 고유 키 `(team_id, flat_smiles)` 살아 있는 출원서 · `patents (application_id, code_name)` · `(application_id, team_id)` → 출원서 복합 외래 키(받아들여진 코드명은 DB 가 못 바꾸게) · 심사 중 · 받아들여짐 ⇒ 코드명 있음 CHECK |
| ① 후보 | 지금 표적 버전의 `lead_candidates`(FSEL). 출원서를 만들 때 워커 `/molecule/properties` 로 평면 SMILES · 물성을 한 번 계산해 출원서 줄에 둬요(받아들임 잠금 안에서 HTTP 를 부르지 않게). 같은 후보 · 같은 물질은 살아 있는 출원서 1장(409) |
| ② 코드명 | 이름표 = 티커(고정) + 번호 3자리 입력 · `checkCodeName`(브라우저 · 서버 같은 함수 — 소문자 · 길이 · 티커 불일치 · 이음표 · 번호 · 이미 쓴 번호). 낙관적 잠금 = 화면이 읽은 `expectedCode`. 심사 중 · 받아들여진 뒤에는 못 바꿈. 기전 '어떻게'(여럿) · '무엇을 하나'(하나)는 칸(`mech_how` · `mech_action`)으로 저장 |
| ③ 출원서 칸 | 13칸(`PATENT_SECTIONS` — 해부도 뜻 2 · 기전 3 · 명칭 · 기술분야 · 배경 · 청구항 1 · 2 · 효과 · 요약 · 발명자). reviews.ts `saveSection`(칸 판 낙관적 잠금 · 409 + 지금 칸). 심사 중에도 칸은 고칠 수 있고 결과는 심사한 판에만(화면 '심사 뒤 바뀜') |
| ④ 심사 | 모둠 줄 잠금 → 출원서 잠금 안에서 규칙: 형식(칸 길이 · 고르기 · 가역/비가역 함께 금지 · 발명자 = 모둠원) · 코드명 · **칸에 SMILES 원문 금지**(프롬프트에 SMILES 가 들어가지 않게) · 상한(받아들여짐 + 심사 중 · 학급 `max_patents_per_team`) · 잔액 · 신규성(평면/정규 SMILES 가 워커 데이터셋 'ChEMBL 승인약' · 'ZINC 소형' · 표적 기준 리간드 · 2.2 `known_substance` → **거절**) · 학급 중복(유효 특허 같은 평면 SMILES → **거절**) · 선행 특허(건너뜀 — 아래). 그다음 `requestReview`(⑫ UQ · 하루 상한). LLM 에는 코드명 · 티커 · 표적 · 질환 · 기준 약 · ΔG(기준 대비) · 부모 ΔG · PLIP 잔기 · 물성 · ADMET 지표 · 칸 글만(발명자 id · SMILES · 작업 id 없음) |
| ⑤ 받아들임 | `onReviewed('patent')`(판정 트랜잭션 안 · ⑩): teams → 출원서 → classes(`for no key update` · class_seq) → 저장점 → `patents` insert → `charge`(250,000 크리스타 · 멱등 `patent:<출원 id>`) → accepted. 부분 고유 키 위반이면 저장점으로 되돌리고 '거절 · 이미 있음'(과금 없음 · 심사 판정도 reject 로 · 규칙 줄 덧붙임), 잔액 부족이면 보완. 커밋 뒤 `postBoardEvent('patent')`(공개 칸 = 코드명 · 출원번호 · 질환) · 학급 WS `patent.ledger` · 모둠 `board.changed` |
| 원장 5.04 | 등록 · 포기 줄(학급 공개 — 구조식 · 코드명) + 그 모둠만 '거절 · 이미 있음' 빨간 줄. 출원번호 `KR-<학급 id 에서 2자리>-<class_seq 4자리>` |
| 포기 · 거두기 | 초안 · 보완 출원서는 거두기, 등록 특허는 포기(슬롯 반환 · 환급 없음 · 전광판 소식 없음). 진행 중 3.2 작업 · 심사 중/승인 계획서 · IND · 주력/백업이 쓰는 특허는 409 |
| 화면 | `steps/s31.tsx` · `s31.css` — 걸음 탭 ①~⑤ · `useLive('/api/patents')`(doc.reviewed · patent.ledger · board.changed) · 5.06 구조 지문(SVG · 다른 구간 형광 + ▼) · 5.02 해부도(SVG · 틀린 조각 빨강 + ✕ 글) · 5.01 출원서 해부(서버가 채운 근거 번호 1~5) · 규칙 결과 ✓/✕ 목록 · AI 칸별 지적 · 받아들여지는 순간 원장 탭으로 · 원장은 폭 1100px 아래에서 카드(390 가로 스크롤 없음). 스크린샷 `.review/2026-10-24-f31/` |
| 문구 | 모두 `PATENT_COPY`(web-contract `patent.ts`) — §5.12 Gemini 다듬기 대상. 체크리스트 기준 앞에 「칸 이름」을 붙여 AI 피드백이 칸 키(effect) 대신 칸 이름을 쓰게 했어요 |

**설계와 다르게 정한 것**
- 비슷한 선행 특허(심사 4번 · Tanimoto ≥ 0.85)는 **건너뛰어요** — 서버 RDKit.js · 워커 지문 끝점이 아직 없어요(설계 '정하기 전에는 4번을 건너뛴다'). 규칙 결과에 '건너뜀' 줄을 남기고 LLM 사실에 `prior_art_check: skipped`.
- 신규성 데이터는 워커 `/datasets/compounds`(라이브러리별 500 · 30분 캐시) — 워커 깔때기가 Ro5 위반 2개 이상을 늘 빼서 그런 승인약 1종은 목록에 없어요(2.2 `known_substance` 와 함께 봐요).
- 받아들임 단계에서 규칙이 걸리면(먼저 받아들여진 같은 물질 · 잔액 · 상한) 처리기가 그 심사 판정을 reject · revise 로 바꾸고 규칙 줄을 덧붙여요 — 화면 · 교사 목록이 같은 판정을 보게.
- 교사가 받아들여진 출원서를 보완 · 거절로 정정해도 등재 · 과금은 되돌리지 않아요(원장 · 전광판이 이미 공개 — 포기는 모둠이 해요).
- 학급 `max_patents_per_team` 을 바꾸는 교사 화면은 없어요(e2e 는 시험 연결로 바꿔 봐요).
- 0012 는 `db:migrate:local` 대신 같은 방식(같은 advisory lock · `schema_migrations` 체크섬)으로 **이 파일만** 적용했어요 — 그때 다른 기능의 0013 · 0015 가 '대기'(쓰는 중일 수 있음)라 함께 굳히지 않으려고.

**시험**: `packages/web-contract/test/patent.test.ts`(11) · `apps/server/test/patents.test.ts`(11 — 규칙 1~4 · LLM 입력에 SMILES/실명/작업 id 없음 · 출원료 = `PIPELINE_RULES.cost.patentCents`) · `WEB_PORT=3403 npm run e2e:patents`(21/21, LLM 끈 채 — 같은 후보 4인 동시 만들기 1건 · 코드명 4인 동시 1건 · 다른 칸 4인 동시 · 같은 칸 409 + 지금 칸 · 규칙 보완 · 같은 판 4인 동시 심사 1건 · pending · 상한 · 도네페질 거절 · **두 모둠 같은 분자 동시 받아들임 → 원장 1줄 · 출원료 1번 · 늦은 쪽 거절 · 이미 있음** · 빨간 줄은 그 모둠만 · DB 복합 외래 키 · 부분 고유 키 · 포기 → 다른 모둠 등록 · public 행 수 무변경). 실제 Claude 1회(로컬): 14초 · `claude-opus-5-5` · revise(배경 과제 · 효과 비교 근거 unclear).

**적대적 검토 · 수리(2026-10-24 — 코드와 설계를 직접 대조)**
- **앞 판 심사의 교사 정정이 지금 상태를 덮어씀(고침).** 판 5 심사(보완)를 교사가 통과로 정정하면, 판 7 심사가 진행 중이어도 처리기가 등록 · 출원료를 냈어요. 반대로 앞 판을 거절로 정정하면 진행 중 출원서가 거절로 바뀌었어요. 이제 `onPatentReviewed` 는 그 출원서에 더 새 판의 심사가 있으면 상태 · 과금 · 등재를 건드리지 않아요(결과는 심사한 판에만 — ⑪).
- **교사 수동 거절이 '거절 · 이미 알려진 물질'로 적힘(고침).** 거절 이유를 규칙 결과에서만 붙여요(`rejectReasonOf` — 학급 중복 → duplicate, 신규성 → known, 그 밖은 null). 화면은 '거절 · 선생님 판정'으로 보여요.
- **옛 표적 버전 출원서 심사 · 등록(고침).** 표적을 바꾼 뒤의 옛 버전 출원서도 심사 요청 · 등록 · 출원료가 됐어요. 그 특허는 지금 표적의 3.1 완료 · 3.2 주력 후보에 세지 않아 돈 · 슬롯만 쓰여요. 이제 심사 요청은 409(`stale`), 심사 중에 표적을 바꾼 출원서는 받아들임 단계에서 보완(규칙 줄 `revision` · 과금 없음)이에요. 화면도 심사 단추를 막고 이유를 보여요.
- **받아들여진 출원서의 규칙 점검이 자기 특허를 학급 중복으로 셈(고침).** 중복 검사에서 그 출원서의 특허를 뺐고, 규칙 점검 패널은 초안 · 보완 · 심사 중에만 보여요.
- **WS `doc.reviewed` 의 판정이 처리기가 바꾸기 전 값(고침 — 공유 `reviews.ts` 최소 수정).** 받아들임 단계의 '거절 · 이미 있음'이 WS 로는 pass 로 갔어요. 커밋된 판정을 다시 읽어 보내요.
- **알려진 물질 목록의 워커 몰림(고침).** 캐시가 비었을 때 여러 GET 이 각자 워커를 부르고, 워커가 없으면 GET 마다 다시 불렀어요. 이제 한 번만 부르고(같은 약속 공유) 실패 뒤 30초는 바로 건너뛰어요. 기준 리간드 12종 물성은 한꺼번에 불러요.
- **화면 문구가 `PATENT_COPY` 밖에 40여 곳(고침).** 패널 제목 · 단추 · 표 머리 · 화면 낭독기 글을 `PATENT_COPY.ui` 로 옮겼어요(§5.12 다듬기 대상 한곳). 원장 표 머리에 `scope="col"`.
- **남긴 것**: 선행 특허(4번)는 여전히 건너뜀(워커 · 서버에 지문 수단 없음 — crista 워커는 이 저장소에서 고치지 않음) · 심사 중에 고친(심사받지 않은) 칸도 통과하면 그대로 등록돼요(설계 ⑪ '심사 중에도 고칠 수 있음'을 따름) · 화면이 막는 '이미 알려진 물질' 출원서 만들기를 서버는 받고 심사에서 거절해요(돈 · LLM 없음) · 전광판 띠에는 아직 특허 소식이 흐르지 않아요(`LedBand` 가 FMARKET 몫) · 로컬 DB 역할 연결 상한(30)에 여러 기능 서버가 닿아 가끔 500(53300)이 나요 — e2e 는 다시 붙기를 더했어요.
- **시험(수리 뒤)**: `apps/server/test/patents.test.ts` 12/12(거절 이유 1건 더함) · `packages/web-contract/test/patent.test.ts` 11/11 · `WEB_PORT=3403 npm run e2e:patents` 24/24(앞 판 정정 무시 · 교사 수동 거절 이유 없음 · 심사 중 표적 바꿈 → 보완 · 옛 버전 심사 409 · 자기 특허 중복 아님 — 3건 더함) · `npm test` 전체 통과 · `npm run build:web` 통과. 브라우저(1440 · 390)로 ①→⑤를 끝까지 눌렀어요 — 스크린샷 `.review/2026-10-24-f31/adv-*.png`.

### 6.4 F32 — 3.2 전임상 · 동물실험(설계 §5.9 · §7.3 · §7.4 ⑪ ⑫ ⑬ ⑭)

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 경로 | `apps/server/src/features/preclinical.ts` — `GET /api/preclinical`(그 모둠만) · `POST /api/preclinical/ethics` · `PUT /api/preclinical/protocol`(설정) · `PUT …/protocol/sections/:section` · `POST …/protocol/review` · `POST /api/preclinical/runs` · `PUT …/runs/:jobId/calc` · `PUT …/report/reflection` · 교사 `GET /api/teacher/classes/:classId/preclinical`(학급 합계 마릿수 — API 만). 주력 · 백업은 `PUT /api/program/lead`(pipeline.ts `setLead` → `setPreclinicalLead`) |
| 표 | `0013_preclinical.sql` — 계획서 표적 버전마다 하나(`iacuc_protocols_revision_key`) · 구조 칸(`pain_grade` · `endpoint_weight_loss_pct` · `performer_ids`) · `settings_version`(설정 낙관적 잠금) · `pending_version` · `pending_snapshot`(심의 접수 판) · `preclinical_calcs`(학생 계산 칸 — 한 번 맞으면 덮지 않음) · `preclinical_reports`(주력 근거 칩 · 회고 한 줄) · 색인 `jobs_preclinical_idx` |
| ① 윤리 | 카드 5장(사실 · 숫자 · 출처 설계 그대로) · 확인 문제 3개 규칙 채점(정답은 서버만) · `ethics_training`(다시 풀기 무제한 · 처음 이수 시각 유지). 동물실험 실행 단추만 이수 필요(403), 대체 시험 · 계획서 · 결과 보기는 누구나 |
| ② 계획서 | 칸 5개(reviews.ts `saveSection`) + 설정(후보 · 수준 · 고통등급 · 종료시점 % · 수행자). 규칙 `PRECLINICAL_RULES.iacucRules`(화면 미리 보기와 같은 함수): 후보 ≥ 1 · '많이' = 보완 · 고통등급 ≠ 모델 표 = 보완 · 종료시점 숫자 빈칸 = 보완 · 이수 수행자 ≥ 1 · 빈 칸. LLM `iacuc-v1`(체크리스트 5 · 사실은 코드명 · 수준 · 모델 · 등급 · 대체 시험 구간만). 접수 때 판 · 스냅숏을 고정 → `onReviewed('iacuc')` 통과면 `approved_snapshot` 으로. 승인 뒤 칸 · 설정을 고치면 draft(승인된 판대로만 실행 · 변경 심의) |
| ③ 대체 시험 | hERG 패치클램프 · 간 오가노이드 — 50,000 크리스타 · 2게임 일 · 결정적(2.2 신호와 같은 구간 + 잰 값). 승인 판에 없는 후보를 대체 시험만 했으면 '덜 쓴 동물 수' |
| ④ 동물실험 | 승인 판의 후보 · 수준(46 · 82 · 141) · 400,000 크리스타 · 28게임 일. teams 잠금 → 같은 요청 → programs share → 계획서 share → 같은 (특허 · 설계) 있으면 과금 없이 옛 결과(`jobs_patent_design_key`) → 작업 줄 → `charge`(멱등 `job:<id>`). 끝은 `onGameDay('preclinical')`(상태 조건부 UPDATE · 진행률 `job.progress`) |
| 판정 재료 | 물성은 F31 출원서가 저장한 `patent_applications.properties`(없으면 워커 RDKit) → game-rules 신호 · 결합력 p. 같은 특허의 다음 실행은 앞 실행 입력을 그대로(씨앗만 설계마다) |
| 결과 모양 | `AnimalStudyResult`(기반 이름 그대로 + `pk.cmaxNgPerMl` · `pk.halfLifeH` · `sensitiveSpecies` · `animalsBySpecies` · `targetId`) · `AltAssayResult`(+ `value` · `unit`) |
| NOAEL → MRSD | `PRECLINICAL_RULES.study` — T* = 65 ÷ (Rk × K) · Dt⁻¹ 직선 보간 → 경구 허용 최대 용량 × 10 ÷ 60 = 목표 HED → 민감한 종 NOAEL 내림(hERG 우세 → 개, 간 우세 → 랫드) · 다른 종 1.4~2.0배 올림 → HED = 둘 중 낮은 값(소수 둘째 내림) → 경구 MRSD = HED ÷ 안전계수 × 60(내림) · 정맥 · 경피는 같은 비율로 줄임. 설계 예시 재현: Rk 1.85 → 경구 60 mg · 개 NOAEL 18 · HED 10 · 정맥 45 mg(설계 '약 46') · 적게 30 mg |
| ⑤ 주력 · 백업 | 둘 다 지금 표적 버전의 유효 특허 + 동물실험 완료 · 서로 다름 · 근거 칩 재판정(막음 400 `reason_blocked`) · `program_revisions` 한 문장 `lead_version` 잠금(늦은 쪽 409 `stale`). 저장 값은 그 특허의 2.2 ADMET 작업 id(0006 외래 키 그대로). 지정 트랜잭션에서 전광판 `preclinical` 소식(표적 버전마다 한 번 · 공개 칸 = 코드명 · 단계) |
| 화면 | `steps/s32.tsx` · `s32.css` — 걸음 탭 ①~⑤(상태 글 · ✓) · `useLive('/api/preclinical')`(board.changed · doc.reviewed iacuc · job.progress). 윤리 카드(펼침) · 문제(라디오 칸) · 이수 도장 / 설정 · 칸 편집기 · 규칙 미리 보기 · 심의 결과(AI 배지) · 승인 판 / 대체 시험 표 · 덜 쓴 수 / 실행 · 진행 막대(role progressbar) · 계산 칸(틀린 칸 ✕ · aria-invalid) · 결과판(후보 열 × 지표 행 · 뺀 후보 흐림) · 제형별 MRSD SVG(10 · 50 · 100 mg 점선) / 근거 칩 · 주력 · 백업 · 종료보고서 · 회고. 스크린샷 `.review/2026-10-24-f32/` |
| 문구 | 모두 `PRECLINICAL_COPY`(web-contract `preclinical.ts`) — 카드 · 문제 · 칸 안내 · 규칙 · 칩 · 화면 글(`ui`) · 전광판 문구. §5.12 Gemini 다듬기 대상 |

**설계와 다르게 정한 것**
- 주력 · 백업은 새 경로 대신 `PUT /api/program/lead` 를 3판 규칙으로 바꿨어요(설명서의 '파일 소유' — F32 의 `setLead`). 본문 `{ leadPatentId, backupPatentId, reason, expectedVersion }`, W3 모양(`leadJobId` = 2.2 작업)도 특허로 바꿔 받아요. 그래서 `e2e-parallel.ts` ④ 를 '2.2 결과만으로는 409 step_locked' 로 고쳤어요(동시 지정 · stale 은 `e2e:preclinical` ⑥).
- 교사 정정으로 통과를 거두면 승인을 되돌리되, 그 승인으로 이미 실행한 작업이 있으면 승인은 그대로 두고 상태만 보완이에요(과금 · 동물은 되돌릴 수 없음).
- 소견 규칙: hERG 보통 이상 → QT · 간 보통 이상 → 간 · 말초 표적인데 뇌 노출 높음 → 행동 변화(중추). 인도적 종료 = 마릿수 × (D 모델 0.02 · 그 밖 0.005 + (Rk − 1) × 0.05). 효력 % = (0.3 + 0.7p) × A(경구) × B ÷ 기준 약(p 0.9 · A · B = 1). 모두 교육용 단순화 — 수의사 · IACUC 자문 전 제안값(§12-15).
- 4 표적만(이 저장소 카탈로그가 4개). 12 표적으로 늘면 `PRECLINICAL_MODELS` 에 줄을 더하면 시험이 함께 돌아요.
- 전광판 소식은 3.2 완료 때(주력 지정 — 지정에는 동물실험 완료가 필요하고, 실행에는 승인 계획서가 필요하므로 세 조건이 모두 참).

**시험**: `packages/web-contract/test/preclinical.test.ts`(20 — game-rules 값 대조 · 설계 예시 · **4 표적 × 무작위 후보 500 × 제형 3 × 용량 3 × 수준 3 = 54,000 조합 'MRSD 이하면 judgeStep(ind) 통과'** · 신호 9조합 직접 식 · 계산 사슬 · 결정성 · 종 · 규칙 · 칩) · `apps/server/test/preclinical.test.ts`(9) · `WEB_PORT=3404 npm run e2e:preclinical`(16/16 — 4인 동시: 윤리 · 설정 409 · 칸 · 심의 한 판 하나 · 같은 (특허 · 설계) 3건 과금 1번 · DB 키 탐침 · 게임 시계 끝 · 계산 칸 · 주력 동시 지정 1명만 · 칩 막음 · 전광판 공개 칸 · 교사 합계 · 다른 모둠 차단). 실제 Claude 심의 1회(통과 · 칸별 지적 5 · 승인 판 옮김), 나머지는 `LLM_DISABLED=1`(pending → 교사 수동 통과).

**적대적 검토 · 수리(2026-10-24, F32 검토 담당)**
- 고친 결함
  - 심의 판정 처리기(`onIacucReviewed`)가 보완 · 거절이면 판에 상관없이 상태를 'revise' 로 바꿨어요. 교사가 **옛 판** 판정을 정정하면 지금 승인(또는 다른 판 심의 중) 상태가 '보완'으로 뒤집혀, 심의 중인데도 새 심의를 또 낼 수 있었어요. 이제 지금 심의 중인 판(`pending_version`)이나 지금 승인된 판의 판정일 때만 상태를 바꿔요.
  - 주력 지정 트랜잭션이 teams 를 잠그지 않은 채 전광판 소식(classes 잠금)을 냈어요. 다른 경로와 같은 순서(teams → programs → classes)로 맞췄어요.
  - 실행 요청 번호가 1.2 · 2.x 작업 번호와 겹치면 그 작업을 3.2 실행 모양으로 돌려줬어요(칸이 비어 화면이 깨짐). 이제 409 `already_exists`.
  - 화면: 하드코딩 문구 20여 곳을 `PRECLINICAL_COPY.ui` 로 옮김 · 계획서 칸의 '서버가 채우는 것'이 이름표만 보이던 것을 실제 값(코드명 · 대체 시험 구간 · 총 마릿수 · 모델 정답 등급)으로 · ④ 결과판에 모둠 합계 마릿수를 늘 보임(설계 '늘 보인다') · 첫 읽기 실패 때 '다시 불러오기' 단추(전에는 막다른 오류 글) · 제형별 MRSD 그림의 코드명 · 제형 글자 겹침 · `role="radio"` 에 붙은 `aria-pressed` 제거 · '생각해 볼 거리' 겹침 · 재실행 안내를 실행이 있을 때만.
- 시험 보강: `e2e:preclinical` ⑦(요청 번호 겹침 409) · ⑧(변경 심의 뒤 옛 판 정정은 지금 승인을 건드리지 않음 · 지금 판 정정은 실행이 있으면 승인 기록을 남기고 상태만 보완 · 3.2 완료 유지) → 19/19.
- 남긴 것: 확인 문제를 FLEARN 학습 연구비 3.2 문항 은행과 공유하지 않음(설계 '같은 문항 은행' — 두 기능의 파일이 따로라 접점 합의가 필요) · 실행 단추를 누르는 사람이 승인 판의 '실험 수행자'에 있어야 하는지는 설계가 '이수만' 요구해 그대로 · LLM 심의가 오래 pending 이면 새 판을 낼 수 없음(교사 수동 판정으로 풂 — §5.11 ⑥) · 교사가 '지금 판' 통과를 거둬도 실행이 있으면 남은 후보 실행이 계속 가능.
- 화면 점검(1440 · 390): `.review/2026-10-24-f32/review-*.png`. 390 폭에서 3.2 본문의 가로 넘침은 0(넓은 표만 안에서 스크롤).

### 6.5 F33 — 3.3 제형 · IND 신청(설계 §5.10 · §5.11 · §7.3 ind_applications · §7.4 ⑬)

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 스키마 `0014_ind_application` | 상태 `passed`(서류 통과 · 접수 전) 추가 · `plan_version`(조합 낙관적 잠금 — 칸 판과 따로) · `score_input`(접수 때 굳힌 game-rules `scoreCandidate` 입력) · `judgement` · `decided_at` · 부분 고유 키 `ind_applications_open_key`(표적 버전마다 열린 신청서 하나 — 보류 뒤에만 새로) · `ind_candidate_facts`(주력 · 백업 특허 분자의 RDKit 물성 · 도킹 ΔG — 한 번 계산해 둠) |
| 서버 `features/ind.ts` | `GET /api/ind`(주력 · 백업 × 9조합 E · S — game-rules 같은 함수, 비 CNS 표적에 뇌 병변 환자군이 있으면 18칸) · `POST /api/ind/applications`(동시 4번 → 한 줄) · `PUT …/plan`(제형 · 용량 · 환자군 · 1차 평가지표 · 후보) · `PUT …/sections/:sec`(reviews.ts `saveSection`) · `POST …/review`(규칙 → `requestReview('ind')`, 신청서 'reviewing' 과 한 트랜잭션) · `POST …/submit`(서류 통과 판 확인 → teams 잠금 → `charge('ind_fee', ind:<id>)` → submitted · +30게임 일) · `onReviewed('ind')`(그 판일 때만 passed · revise) · `onGameDay('ind')`(judgeStep('ind') → approved · held + `postBoardEvent('ind_approved' / 'ind_held')`) · `loadIndApproval(db, revisionId)`(4.1 입력) |
| 규격 `web-contract/ind.ts` | `IND_SECTIONS` ①~⑦(12칸 — 서약은 칸 본문 '동의') · `indRuleFindings`(주력 = 유효 특허 + 동물실험 완료 · 조합 4칸 · 빈 칸 · 경피 부적합 · 학생 계산 칸 = 서버 값(F32 와 같은 허용 오차) · 시작 용량 ≤ 그 제형 MRSD · **예상 S ≥ 35** · 위험 보통 이상이면 감시 칸 · 서약 2개) · `IND_CHECKLIST`(LLM 7항목) · `indTrialOptions`(TRIAL_OPTIONS 4종 + §6.1.1 새 8종 목록) · `IndResponse` · `IndApprovalView` · `IND_API` · 학생 문구 `IND_COPY` 한곳 |
| 화면 `steps/s33.tsx` · `s33-tools.tsx` · `s33.css` | 왼쪽: '이 단계에서 하는 일' 3줄 + 펼쳐 보기(뼈대 표 6줄) · 도구 탭 6개(what-if 실험실 첫 탭 · 시소 · 피크 곡선 · 용량-반응 3장 · E–S 평면 · 공식 폭포 — SVG 직접, 손잡이는 개인 상태) · 오른쪽: 신청서 ①~⑦(`DocSectionEditor` · 서버가 채운 칸 · 서약 체크) · 조합 · 규칙 미리 보기 · 심사 결과(AI 배지 · 칸별 지적 · '심사 뒤 바뀜') · [심사] · [접수](확인 창) · 판정 진행률 · 승인서 |

**설계와 다르게 정한 것**
- 상태에 `passed` 를 더했다 — 0006 의 상태로는 '서류 통과 · 수수료 전'을 나타낼 수 없었다. 칸 · 조합을 고치면 다시 `draft`(통과는 그 판에만 — ⑪).
- 규칙 검사에 **'예상 안전 S ≥ 35'** 를 더했다(§5.10 표에는 MRSD 만). F32 의 MRSD 반올림과 상관없이 '서류를 통과한 IND 는 판정에서 떨어지지 않는다'를 3.3 에서 스스로 보장한다(단위 시험 — 물성 36종 × 9조합).
- E · S 는 브라우저에서 다시 계산하지 않고 서버가 game-rules `scoreCandidate` 로 9조합을 계산해 내려보낸다(web 이 game-rules 에 의존하지 않게 — 화면은 값만 그림). 규칙 값(Dt · K · 기준선 · 위험 가중치)도 서버가 실어 준다.
- 4.1 입력은 `IndApprovalView` 와 서버 `loadIndApproval` 로 내보낸다. 1상 1차 평가지표는 늘 '안전성 · 이상사례', 학생이 고르는 환자군 · 평가지표는 다음 상의 것이다.
- 전광판 소식 공개 칸은 코드명 · 단계 · 질환 · 결과만(제형 · 용량 · 점수 없음).
- 3.2 에서 맞힌 HED(F32 `preclinical_calcs`)는 신청서를 만들 때 ④ 칸에 붙인다(저장점 — 그 표가 없어도 만들기는 막지 않음). 고른 제형의 MRSD 는 학생이 다시 적는다.

**시험**: `packages/web-contract/test/ind.test.ts`(14) · `apps/server/test/ind.test.ts`(7 — 수수료 · 기준 = game-rules, 9조합 = scoreCandidate, 뇌 병변 환자군, 판정 결정성, 'MRSD 이하 ⇒ S ≥ 35' · '규칙 ok ⇒ 승인') · `WEB_PORT=3405 npm run e2e:ind`(12/12 — F32 의 실제 `PRECLINICAL_RULES.study` 로 동물실험 결과를 넣고: 새 신청서 동시 4번 → 한 줄 · 다른 칸 동시 4명 · 같은 칸 하나만 · 조합 동시 4번 → 하나만 · MRSD 초과 → 규칙 보완 · 동시 심사 4번 → 1건 · 교사 수동 통과 · 통과 뒤 고치면 접수 409 · **동시 접수 4번 → 과금 1회** · 접수 뒤 고치기 409 · 30게임 일 뒤 승인 · 전광판 1줄 · 3.3 완료 · 승인서). LLM 끈 서버로 pending 경로, `E2E_WAIT_LLM=1` 로 실제 Claude 심사 2회(둘 다 revise — 간 소견 해석 · 동의서 목적이 빠진 것을 짚음, 교사 수동 통과로 이어감). 화면 1440 · 390(가로 스크롤 0) 스크린샷은 `.review/2026-10-24-f33/`.

**남은 것**: 학생 문구는 `IND_COPY` 초안(§5.12 Gemini 다듬기 때 `IND_REVIEWER_VERSION` 을 올림). 새 8 표적의 환자군은 초안이고 crista 가 TRIAL_OPTIONS 12종을 다시 복사하면 그쪽이 먼저다. 같은 로컬 DB 를 여러 서버가 쓰면 판정 틱이 다른 서버에서 돌아 학급 WS 가 그 서버로 나간다. 호스팅 DB 에는 0014 미적용.

**적대적 검토 · 수리(2026-10-24, F33 검토 담당)** — 코드 ↔ 설계 §5.10 · §5.11 · §5.13 · §7.4 ⑬ 대조
- **같은 판 다시 심사 = 옛 결과(캐시)만 돌려줌 → 고쳤다.** 심사 기록은 (서류, 판, 심사관 판) 하나라, 칸은 그대로인데 서버 사실(3.2 주력 지정 · 동물실험 MRSD · 물성 계산)이 바뀌면 옛 '통과'나 '보완'이 영영 돌아왔다(통과 뒤 MRSD 가 줄면 접수는 409 인데 다시 심사해도 같은 통과). 이제 규칙 결과(id · ok/fail)가 그 판의 심사와 다르면 서류 판을 1 올려 새로 심사한다(`sameRuleOutcome`).
- **⑥ 감시 칸이 선택인데 LLM 이 빈 칸을 'missing' → 보완** 될 수 있었다 → 감시가 필요 없고 칸도 비었으면 체크리스트에서 `monitor_fits` 를 뺀다(`indChecklistFor`).
- **uuid 가 아닌 신청서 id → 500** 이던 것을 404 로(`IND_ID_PATTERN`).
- 화면: E–S 평면의 그림이 `role="img"` 라 안의 점 단추 9개가 화면 낭독기에서 사라졌다 → 누를 수 있는 그림은 `role="group"`. 같은 자리에 겹친 점(S 0 의 경구 · 정맥 100 mg)은 비켜 그려 둘 다 누를 수 있게. 평면에서 백업을 보고 [신청서에 넣기]를 누르면 제형 · 용량만 바뀌고 후보는 주력으로 남던 것 → 후보도 함께. 보류(held) 뒤 [새 신청서 쓰기] 단추가 없던 것 → 보류 패널에 둠. 판정 시각을 지났는데 소식(WS)이 안 오면 5초마다 다시 읽음(다른 서버 프로세스가 판정한 경우). LLM 대기가 '재시도'일 때 '읽는 중' 대신 재시도 안내. 지금 주력 · 백업이 아닌 후보가 신청서에 남으면 고르기 칸에 '(지금 주력 · 백업이 아님)'으로 보임. 도구 · 승인서의 규칙 숫자(0.3 · 0.7 · 65 · S ≥ 50)를 서버 `IndRulesView.efficacy` · 기준선 · 자리표시자로.
- 시험 더함: 규격 3 · 서버 2 · `e2e:ind` 4건(교사가 규칙 보완 건을 손으로 통과시켜도 접수 409 · 과금 0 · uuid 404 · 통과 뒤 MRSD 축소 → 접수 409 + 같은 판 다시 심사 = 판 +1 규칙 보완 · 연구비 부족 402 · 상태 그대로 · ind_fee 0) → 16/16. 화면 흐름(새 신청서 → E–S 평면 점 → 넣기 → 칸 ①~⑦ → 서약 → 심사(LLM 꺼짐 pending) → 교사 통과 → [접수] 확인 창 → 30게임 일 → 승인서)을 브라우저로 끝까지 눌렀다 — 스크린샷 `.review/2026-10-24-f33/review-*.png`(1440 · 390, 가로 스크롤 0).
- 남긴 것: 교사용 서류 심사 목록 · 수동 판정 **화면**이 아직 없다(API 만 — 공용 교사 화면 몫). 같은 로컬 DB 에 서버 9개가 붙으면 연결 상한(53300)으로 GET 이 가끔 500 — 개발 환경 문제. 이미 지나간 표적 버전의 접수 건도 판정 · 전광판 소식이 난다(접수는 된 것이라 그대로 둠). `TRIAL_FALLBACK` 의 새 8 표적은 `DOCKING_TARGETS` 에 들어오면 그쪽 `cns` 를 쓰므로 지금은 문제없지만, 파킨슨 · 우울증(CNS)이 카탈로그 없이 들어오면 `cns: false` 로 보인다.

### 6.41 F41 — 4.1 임상 1 · 2 · 3상(2026-10-24 사용자 새 지시 · 설계 §6.1 4.1 줄 · §6.3 · §5.3 · 균형안 §1 · 시안 viz-7)

> 사용자 지시: "임상 1상, 2상, 3상 모두 Claude Opus 5.5 Medium 에게 맡겨라 … 앞 단계 계산값으로 참여자 모집 … 연구비를 더 내면 빨리, 적게 내면 오래 기다림 … 적절한 시점에 사용자가 임상 시작 … 결과 및 분석 시각화 … 모든 파이프라인이 기업가치에 반영". 설계 문서가 미뤄 둔 4.1 을 이 지시로 설계 · 구현했다.

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 표(0017_clinical_trials) | `clinical_trials`(한 줄 = 한 상의 한 시도 · 프로토콜 · 상태 recruiting → running → completed \| held \| pending · 모집 투자 단계 · 등록 수 · 시작/끝 게임 일 · 입력 해시 · 결과 jsonb · 판정 · 참고 판정) · `clinical_recruit_log`(모집 정산 = 곡선 점) · `clinical_sim_cache`(입력 해시 → 결과) · `clinical_bounties`. `llm_calls.task` 에 `clinical_sim` — 다른 기능이 넓힌 값을 지우지 않게 **지금 CHECK 를 읽어 값만 더하는 DO 블록**. 로컬은 이 파일만 적용(남의 대기 파일 0012 · 0015 를 함께 적용하지 않으려고 실행기와 같은 규칙 — 자문 잠금 · 체크섬 기록 — 의 한 파일 적용) |
| 불변식(§7.4 꼴) | 표적 버전마다 살아 있는 시도 하나(부분 고유 키 `clinical_trials_live_key`) · (버전, 상, 시도 번호) 고유 · [임상 시작] = programs share → teams update → 시도 줄 update → `status = 'recruiting'` 조건부 UPDATE + 원장 멱등 `trial:<id>:start` · 모집 정산은 `recruit_seq` + 원장 멱등 `trial:<id>:recruit:<seq>` · 백업 교체 수수료 `trial:<id>:backup` · 바운티 `trial:<id>:bounty`(시도마다 한 번) |
| 걸음 | ① 프로토콜(IND 승인서의 제형 · 용량 · 환자군 · 1차 평가지표 + 상별 군: 1상 위약 + 용량 3단계(25 · 50 · 100%) 건강한 지원자 40명 · 2상 위약 · 중간 · 계획 용량 무작위 180명 · 3상 1:1 확증 600명, 항암은 1상부터 환자 · 대조 = 표준 치료 · 1상 30명) ② 모집 ③ [임상 시작](최소 = 목표 × 0.6) ④ 시뮬레이션 ⑤ 결과 공개(끝나는 게임 일) |
| 모집 규칙(web-contract `recruitModel`) | 기본 속도 = 목표 / (30 · 60 · 75 게임 일 — 2026-10-24 절반으로 줄임, §9) × 배율. 배율 = 안전 예상 S(≥70 ×1.15 · ≥50 ×1 · ≥35 ×0.85) · 효능 E(환자 상만) · hERG/간 위험(보통 ×0.95 · 높음 ×0.9) · 제형(정맥 ×0.85 · 경피 ×1.05) · CNS 환자군 ×0.85 · 질환 유병(흔함 ×1.2 · 드묾 ×0.6 — 표적 12종 프로필). 선별 실패 · 탈락률도 같은 재료로. 투자 단계 기본 ×1(무료) · 확대 ×2 · 집중 ×3.5 — 하루 비용(1상 10,000/40,000 · 2상 15,000/60,000 · 3상 24,000/96,000 크리스타 — 모집 일수를 절반으로 줄이며 두 배로). 바꾸면 그때까지 옛 단계로 정산 · 과금하고 그때부터 새 단계(연구비가 모자라면 자동으로 기본). 정산은 `onGameDay('clinical')`(정수 게임 일이 바뀔 때) · 화면은 정산 사이를 투영해 실시간으로 보인다 |
| 검정력 게이지 | 2 · 3상 Φ(√(n/목표)·(z_α+z_β) − z_α)(목표 인원에서 80 · 90%) · 1상은 '5% 빈도 이상사례 감지력' 1 − 0.95^(약 군 인원). 시뮬레이션 입력 · 참고 판정의 흔들림 폭도 √(목표/인원) 배 |
| 시뮬레이션(§5.11 예외) | **판정(pass \| held)까지 Claude Opus 5.5 · effort medium 이 낸다 — 사용자 결정.** 입력 = 서버 사실(E · S 예상치 · 결합력 p · A · B · De · Dt · R · K · 위험 신호 · 물성 수치 · NOAEL/HED/MRSD · 제형 · 용량 · 환자군 · 평가지표 · 등록 인원 · 군 · 앞 상 요약 · game-rules 참고 통과 확률 · 코호트 번호), SMILES · 실명 없음. 출력은 CONSORT · 인구 · PK · 이상사례(기관계 · 등급 · 군별) · SAE · DLT · 1차 평가지표(군별 평균 · 95% CI · 차이 · p) · 주차별 값 · 반응률 · 생존 곡선(항암 2 · 3상) · 하위군 · 판정 · 보류 종류 · 분석 · 권고. 서버가 합계 · 범위 · 군 크기 · CI 와 p · p 와 판정(1상 DLT ≤ 1/3 · 2상 유의 · 좋은 방향 · 3상 + SAE 차 ≤ 10%p · 안전 보류면 안전 신호 · 운영 보류면 완료 < 75%) · 글 길이 · 구조식 같은 문자열을 검사 → 어긋나면 문제 목록을 붙여 한 번 다시 → 그래도면 `manual` + 교사 알림. 거절이면 `fallbacks: 'default'` 뒤에도 거절일 때 `manual` + 교사. 같은 입력 해시면 `clinical_sim_cache`. 시작 때 만들고, 학생에게는 끝나는 게임 일에만(그동안 간트 · 규칙 문구의 중간 모니터링). 끝나는 날 결과가 없으면 `pending` + 교사 알림 |
| 교사 | `GET /api/teacher/classes/:classId/clinical`(결과 · **game-rules 참고 판정**(judgeStep · 통과 확률) · 시뮬레이션 상태 늘 보임) · `POST /api/teacher/clinical/:trialId/resimulate` · `/decision {verdict, holdKind}` — 교사 수동 판정은 판정에 맞는 결정적 규칙 생성 표(`ruleSimulate`, '선생님 판정 · 규칙으로 만든 표')로 화면 그림을 채운다 |
| 판정 뒤 | 통과 → 다음 상 열 수 있음 · 3상 통과 = 4.1 완료. 보류 → 재도전 3경로: 같은 프로토콜(새 참여자) · 용량/제형 변경(그 후보의 제형별 MRSD 이하 · 경피 부적합 막음 · S ≥ 35 · 제형을 바꾸거나 1상 통과 용량보다 올리면 1상부터) · 백업 후보 교체(500,000 크리스타 · 30게임 일 IND 변경 심사 뒤 1상 모집) |
| 실패 바운티 | crista `stepBountyKey` · `gradeBounty`(Q1 축 · Q2 요인 · Q3 처방) + 분석 글 40~600자(인젝션 필터). 실패 축은 시뮬레이션의 보류 종류에서, 규칙 참고 판정으로는 그 축이 넘었는데 보류됐으면 '코호트 흔들림' 요인 · '같은 프로토콜 다시' 처방을 정답에 더한다(정답 없는 문제 방지). 오답 60초 · 환급 = 낸 상 비용 × 50 · 40 · 30%(`bountyRefundCents` · 계보 상한), 원장 `failure_bounty`. LLM 채점은 하지 않았다(비용 — 규칙 채점) |
| 전광판 | 통과 `trial_pass` · 보류 `trial_held`(빨강) — public: 상 · 판정 · 보류 종류 · 코드명 · 질환 · 시도. 과정 소식(모집 완료 · 임상 시작)은 0007 의 kind 를 넓히지 않으려고 `notice` + `public.event = trial_recruited \| trial_started`(세이브포인트 — 전광판 처리기가 던져도 본 트랜잭션은 산다) |
| 사이드바 | `StepView.sub`(새 칸)로 '2상 · 42%' · '2상 모집 · 15%' · '1상 판정 대기' · '1상 보류 · 재도전 가능' · '2상 준비'. `DEFERRED_STEPS` 에서 4.1 을 뺐다(4.2 는 F42) |
| 화면 `steps/s41.tsx` · `s41-charts.tsx` · `s41.css` | 걸음 탭 ①~⑤. 그림(SVG 직접): 세 관문 허들 · 환자 수 아이콘 · 임상 간트 · 연구비 계단 · 모집 곡선(+ 예상 점선 · 최소/목표 선 · IND 변경 심사 구간) · 검정력 곡선 · 검정력 게이지 · CONSORT 흐름도 · 1차 평가지표 막대 + 오차 막대 · 시간 경과 선 · 숲 그림 · 이상사례 누적 막대 + 표 · PK 곡선 · 생존 곡선 · 반응률 막대 · 실패 후 갈림길. 군은 선 모양 · ◆□△○ 표시 · 이름표로도 가른다 · 그림마다 aria-label 요약 |
| 문구 | 학생 문구는 `CLINICAL_COPY`(해요체 초안 — §5.12 Gemini 4 Argon (High) 가 다듬을 자리) |

**설계와 다르게 정한 것**
- 원장 종류를 늘리지 않았다 — 상 비용 · 모집 투자 · 백업 수수료는 `paid_work` + `ref_type`(`clinical_trial` · `clinical_recruit` · `clinical_backup`). 다른 기능의 원장 CHECK 재정의와 부딪치지 않게.
- 백업 교체는 3.3 에 새 IND 를 내지 않고 4.1 안의 'IND 변경' 줄로 처리 — 0006 의 `ind_applications_live_key`(표적 버전마다 승인 하나)가 두 번째 승인 IND 를 막아서. 수수료 · 기간은 IND 와 같은 값.
- 첫 Claude 스키마(군 id 를 단 객체 배열 · 열거형)는 API 가 `compiled grammar is too large`(400)로 받지 않았다 → **군 순서에 맞춘 숫자 배열의 압축 꼴**로 받고 서버가 펼친다(`expandSim`).
- 물성은 3.3(F33)의 `ind_candidate_facts` 가 있으면 그것, 없으면 워커 `/molecule/properties` 한 번(시도 사실에 저장 — 뒤 시도는 다시 부르지 않음).

**시험**
- `packages/web-contract/test/clinical.test.ts` 9 · `apps/server/test/clinical.test.ts` 60(비용 · 기간 · 환급률 = crista · 규칙 생성 표 48조합이 검사 · 압축 왕복 통과 · 검사가 잡는 것 · 입력 해시 · 사이드바 줄). `base.test` · `w3.test` 의 '4.1 은 늘 잠김' 두 줄을 4.1 준비 · 3.3 선행으로 고쳤다.
- `npm run e2e:clinical`(4인 동시 — 서버 `WEB_PORT=3406 LLM_DISABLED=1`): 동시 모집 시작 → 1줄 · 동시 투자 단계 변경 → 정산 seq · 원장 멱등 겹침 0 · 최소 인원 전 시작 409 · 동시 [임상 시작] → 과금 1회 · 결과 없음 → pending · 결과 숨김 · 교사 수동 통과 → 공개 · 전광판 · 2상 보류 · 사이드바 · 바운티 오답/429/정답 동시 → 환급 1회 · 재도전 3경로 동시 → 1줄 · 전광판 공개 범위 — 16/16.
- 실제 Claude 1건(`E2E_CLINICAL_LLM=1`): 1상 40명 — 첫 응답이 서버 검사 통과(`ready`) · 22초 · 입력 1,160 + 캐시 쓰기 4,486 · 출력 2,216 토큰 · 끝나는 날 공개 · 판정 pass.

**남은 것**: 학생 문구 Gemini 다듬기 · 실패 바운티 분석 글 LLM 채점 · 교사 화면(목록 · 수동 판정 단추)은 API 만 — 교사 화면 컴포넌트는 아직 · 전광판 과정 소식의 기업가치 변동은 FMARKET 이 `public.event` 를 보고 정한다.

**적대적 검토 · 수리(2026-10-24, F41 검토 담당)** — 코드 ↔ 설계 §5.14 · §7.4 · §12-19 대조
- **늦은 [임상 시작]은 409** — 먼저 누른 1명만 200, 늦은 쪽은 과금 없이 `409 already_exists`(앞 판은 200 `started:false`). e2e ④가 200 1 · 409 3 · 원장 1줄을 본다.
- **시뮬레이션 결과 덮어쓰기 막음** — `storeSim` 이 잠금 안에서 상태를 다시 본다: AI 결과는 `sim_status = 'queued'`(그 호출이 임대한 차례)일 때만, 교사 수동 판정은 결과가 없을 때만 저장. 앞 판은 AI 호출 중 교사가 판정하면 늦게 온 AI 결과가 교사 판정을 덮고 캐시에도 들어갔다. e2e '경합'이 가짜 LLM(교사 HTTP 판정을 응답 전에 끼움)으로 확인한다.
- **AI 판정 ↔ 참고 확률 큰 어긋남 → 교사 알림**(§5.14 · §12-19 기본안) — 통과인데 참고 확률 < 15% · 보류인데 > 85% 이면 `teacher.alert review_flagged` · `reference.divergent`. 판정은 AI 그대로.
- **공개 전 교사 정정**(§12-19 '원본 보존') — `POST …/decision {override: true}` 는 AI 결과가 있어도 끝나는 게임 일 전이면 규칙 생성 표로 바꾸고 AI 원본(판정 · 보류 종류 · 모델)을 `reference.llmOriginal` 에 남긴다. 공개 뒤 정정(전광판 정정 소식 · 기업가치 되돌림)은 FMARKET `correction` 몫으로 남겼다.
- **프롬프트 입력에 검정력**(§5.14 입력 목록) `statisticalPower` · 미성년자 안전 문장(이상사례는 종류 · 등급 · 건수로만) → `CLINICAL_SIM_VERSION = clinical-sim-v2`(옛 캐시를 쓰지 않음).
- **임대 5분 → 15분** — 한 번 부르기가 최대 2회 × LLM 제한 시간(180초)이라 5분 임대가 끝나 다른 서버 프로세스가 같은 시도를 겹쳐 부를 수 있었다.
- **모집 곡선 단계 기록** — 연구비가 모자라 기본으로 내린 구간도 옛 단계로 적던 것을 실제 쓴 단계로.
- **백업 교체 규칙을 화면과 같게** — 서버가 '마지막 시도 특허가 아닌 아무 특허'를 골라 화면에 '없음'인 경로(백업 → 다시 주력)가 서버에서 열리던 것을, 화면과 같은 '주력이 아닌 동물실험 끝난 유효 특허'로.
- **첫 1상 전 허들 0** — 시도가 없으면 E · S · 참고 확률이 0으로 보이던 것을 IND 승인서(제형 · 용량 · 환자군)로 미리 계산(물성은 3.3 저장값 → 없으면 워커 1회).
- **문구 한곳에** — 서버 오류 · 막음 문구와 화면 문장을 `CLINICAL_COPY.err` · `CLINICAL_COPY.ui` 로 모았다(§5.12). '1,500,000 크리스타 크리스타' 단위 겹침을 고쳤다.
- **화면** — 결과 탭의 '볼 시험' 고르기를 두 섬이 같이 쓰게(앞 판은 오른쪽만 바뀌고 왼쪽 그림은 최신 시험 그대로) · 간트에 모집 중 계획 막대(점선)와 '오늘' · 시작일 이름표 겹침 해소 · 검정력 목표 이름표 · 게이지 목표 눈금이 가운데 숫자를 가로지르지 않게 · 0 에서 시작하는 축에 음수 눈금 없음 · 허들 기준 숫자를 바깥쪽에.
- **시험** — server `clinical.test.ts` +2(검정력 입력 · 어긋남 문턱) · e2e 16 → 18(경합 · 교사 정정, 첫 1상 전 미리보기 값). 스크린샷 `.review/2026-10-24-f41/review-*.png`(1440 · 390, 모집 → 시작 → 판정 대기 → 보류 공개 → 바운티 오답 → 용량 변경 재도전을 화면으로 눌러 봄).
- **남긴 것** — 교사 화면 컴포넌트 · 공개 뒤 정정 소식 · 실패 후 갈림길의 경로별 비용 · 확률 숫자(viz-7 7.06 — 지금은 경로 · 수수료 · 기간만) · 과정 소식(`notice` + `public.event`)의 기업가치 변동(FMARKET).

### 6.42 F42 — 4.2 최종 허가 · 브랜드 · 포장 · 허가증 · 연구비 영수증(2026-10-24 사용자 지시 · 설계 §6.1 4.2 줄 · §5.3)

> 설계가 미뤄 둔 4.2 를 사용자 지시("최종 통과하면 연구비 영수증(4.2 시안), 8.06 포장 미리보기도 꾸밀 수 있게 하고 최종적으로 '품목 허가증'과 '신약 포장'이 보이게")로 구현했어요. claude.ai 게시본은 열 수 없어 저장소 시안 `design/step-viz/viz-8.js`(8.01 · 8.06 · 8.08)를 근거로 했어요.

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 걸음 | ① 브랜드 이름 → ② 포장 꾸미기 → ③ 허가 신청서(NDA) → ④ 심사 · 접수 → ⑤ 허가증 · 신약 포장 · 연구비 영수증. 3상 전(잠김)에도 ①②③ 초안은 쓸 수 있고 심사 · 접수만 막혀요(§5.4) |
| 표(0018) | `approval_applications`(표적 버전마다 1건 · 브랜드 · 포장 · 상태 draft → reviewing → revise \| passed → submitted → approved · 판) · `nda_sections` · 부분 고유 키 `(class_id, brand_key)` · CHECK '접수 이후 포장 = 허가 제형' · `doc_reviews.doc_kind` 에 'nda' · `ledger.kind` 에 'approval_fee' · `ledger.game_day`(넣을 때 학급 게임 일을 적는 트리거 — 영수증 날짜, 이전 줄은 지금 시계 앵커로 거꾸로 셈) |
| CHECK 넓히기 | doc_kind · ledger.kind 는 **지금 정의를 읽어 값만 더하는** DO 블록 — 다른 예약 번호가 먼저 넓혀도 지우지 않아요(F41 0017 의 llm_calls 와 같은 꼴) |
| 규칙 | 브랜드 2~12자 · 한글/영문/숫자(빈칸 하나) · 숫자만 · 코드명 꼴 · `BLOCKED_WORDS` → 400, 실재 유명 약 이름(목록 `FAMOUS_DRUG_NAMES`)과 같으면 400 · 품고 있으면 주의만, 학급 유일은 DB(늦은 쪽 409 `already_exists` — 어느 모둠인지 알리지 않음). 포장: 정제 · 캡슐 = 경구 · 바이알 = 정맥 · 패치 = 경피(`packFits`) |
| 심사 | reviews 엔진 kind 'nda'(판 `nda-v1`) — 규칙(3상 통과 · 같은 프로토콜 · 브랜드 · 포장 = 제형 · 칸 3개 8자 이상) fail 이면 LLM 없이 보완. LLM 사실은 서버가 1.1~4.1 로 만든 NDA 요약(질환 · 표적 · 코드명 · ΔG · 대체 시험 · NOAEL/MRSD/소견 · IND · 임상 상별 결과) — SMILES 원문 · 실명 없음. 체크리스트 5(효능 = 3상 지표 · 과장 없음 · 주의사항 근거 · 행동 · 브랜드 정직) |
| 접수 · 허가 | 접수 = programs FOR SHARE → 신청서 FOR UPDATE → 'passed' · 그 판의 통과 심사 확인 → `charge('approval_fee', 500,000 크리스타, approval:<id>)` → submitted(+60게임 일). 허가 = `onGameDay('approval')` 상태 조건부 UPDATE → teams 잠금 → `postBoardEvent('approval', idem approval:<id>)`. 최종 허가는 흔들림 · 점수 기준이 없어(game-rules thresholds.final null · noise 0) 서류 통과 + 3상 프로토콜 = 허가 |
| 공개 | 브랜드 · 포장 · 칸 · 심사는 모둠 · 교사만. 전광판 public = ticker · brand · stage · form · disease · defaultChangePct(= `approvalDefaultChangePct(form)` — FMARKET 이 변동률에 씀) |
| 9단계 | `computeSteps` 4.2 줄: 4.1 완료 뒤 열림 · reviewing/submitted = running(접수 진행률) · approved = done. 비용 칩 `PIPELINE_RULES.cost.stepCents.final` · 기간 60. `DEFERRED_STEPS` 는 빈 목록 |
| 화면 | `apps/web/src/board/steps/s42.tsx` · `s42.css` · `s42-art.ts`. 왼쪽 = 개인 초안(브랜드 입력 · 포장 고르기 미리보기 — `useBenchState`), 오른쪽 = 모둠 공유(진행 줄 · 접수 진행률 · 저장된 브랜드/포장 · 자동 NDA 요약). ⑤ 는 두 열을 다 쓰고, 허가가 나면 자동으로 ⑤ 로 옮겨 '파이프라인 완주' 연출(9단계 ✓ 사슬 · 도장 — 모션 줄이기면 멈춤) · 품목 허가증(줄마다 증거 단계 꼬리표) · 신약 포장(브랜드 인쇄) · 연구비 영수증(단계별 · 게임 날짜 · 실패 빨간 줄 ✕ · 들어온 돈 따로 · 합계 · 남은 돈 · 걸린 날 · 분자 수 · 몫 띠). 셋 다 [인쇄](그 덩어리만) · [이미지 저장](SVG → PNG, foreignObject 없음) |

**설계와 다르게 정한 것**
- 브랜드 이름은 game-rules `brandNameMax` 20 대신 2~12자 — 포장 · 전광판 140자 안에 들어가게. 포장 색은 crista 3색(ivory · sage · sand)에 박막 계열 3색(sky · blush · lilac)을 더하고 라벨 배치 3종을 더했어요(사용자 지시 '꾸밀 수 있게').
- 브랜드는 저장할 때 학급에서 예약돼요(허가 전 공개는 아님 — 409 문구는 '이미 쓰는 이름'만). 늦게 허가받는 모둠이 이름을 잃지 않게 하려고요.
- 서류 통과 뒤 브랜드 · 포장 · 칸을 고치면 다시 초안(통과는 그 판에만 — ⑪). 3상 프로토콜이 바뀌면(재도전 · 용량 변경) 신청서의 제형 · 용량도 따라가고 초안으로 돌아가요.
- 8.07 주가 반응은 FMARKET 기업가치가 들어온 뒤로 미뤘어요(허가증에 '시장 반응 기본값 ▲ min(20, 12 × 제형 배율)%' 한 줄만).

**4.1 접점(F41)**: `features/approval.ts loadTrials` 가 `web.clinical_trials` 를 행 통째(to_jsonb)로 읽어요 — phase · status(completed/held) · verdict · patent_id · form · dose_mg · decided_game_day · result.primary.comparison. 마지막 통과 3상의 (특허 · 제형 · 용량)이 허가 프로토콜이고, 접수 때 `trial_ref` 로 고정해요. 영수증은 F41 원장 꼴('paid_work' + ref_type clinical_trial · clinical_recruit · clinical_backup)을 시도마다 한 줄로 묶고, 보류된 시도 줄을 빨갛게 그려요.

**시험**: `packages/web-contract/test/approval.test.ts`(14) · `apps/server/test/approval.test.ts`(8 — 4.1 행 읽기 · 규칙 · 영수증 묶기 · 9단계 4.2 줄 · 수수료 = game-rules) · `WEB_PORT=3407 npm run e2e:approval`(20/20 — 4인 동시: 브랜드 같은 판 4번 → 1명 · 다른 모둠 같은 이름 409 · 포장 4번 → 1명 · 다른 칸 동시 모두 · 같은 칸 1명 · 심사 동시 2번 = 1건 · 접수 4번 → 과금 1번 · 처리기 멱등 · 전광판 공개 칸 · 다른 모둠 차단 · 영수증 합계 = 원장). LLM 끈 서버로 pending → 교사 수동 통과, `E2E_REAL_LLM=1` 로 실제 Claude 심사 1회(통과 · 5항목 ok · 지적 1줄). 화면은 1440 · 390(가로 스크롤 0) 스크린샷을 `.review/2026-10-24-f42/` 에 뒀어요.

**남은 것**: 같은 로컬 DB 를 여러 서버가 쓰면 게임 일 틱이 다른 서버에서 돌아 학급 WS 가 그 서버로 나가요(운영은 서버 하나라 문제없음). 문구는 `APPROVAL_COPY` 초안 — §5.12 Gemini 다듬기 때 `NDA_REVIEWER_VERSION` 을 올려요. 호스팅 DB 에는 0018 미적용.

**적대적 검토 · 수리(2026-10-24 — F42 검토)**
- **화면이 낙관적 잠금을 무력화하던 것**(중대): 브랜드 · 포장 저장이 `expectedVersion` 으로 *실시간으로 다시 읽은 지금 판*을 보내, 고치는 사이 모둠원이 저장한 값을 모르고 덮어썼어요(서버 409 는 동시 요청만 잡음). 이제 초안은 '고치기 시작한 판(base)'을 함께 두고(`useBenchState` `s42:brand:v2` · `s42:pack:v2`) 그 판으로 저장해요. 고치는 사이 모둠원이 먼저 저장하면 화면이 미리 알리고([지금 이름 · 포장 불러오기]), 저장하면 409 → 브랜드는 지금 이름을 보여 주고 초안을 지금 판으로 옮기며(다시 누르면 그때 바꿈), 포장은 내 고르기를 버리고 저장된 포장을 보여요(`K.pack.stale` 문구와 같은 동작 — 전에는 '불러왔어요'라고 하고 실제로는 안 불렀어요).
- **표적을 바꾼 모둠이 자기 브랜드를 못 쓰던 것**: 옛 표적 버전의 접수 전 신청서가 `(class_id, brand_key)` 를 계속 잡아, 같은 이름을 새 버전에 저장하면 409 `already_exists` 였어요. 브랜드 저장 때 같은 모둠 · 다른 버전 · 접수 전 신청서의 같은 이름을 풀어요(초안으로 · 판 올림).
- **GET 이 옛 프로토콜을 '확정'처럼 보이던 것**: 신청서 행은 쓰기 때(`lockApp`)만 3상 값으로 맞춰져서, 3상이 다른 용량 · 제형으로 통과한 뒤 첫 저장 전까지 옛 값이 `formProvisional: false` 로 보였어요. 접수 전이면 GET 도 지금 프로토콜(3상 > IND)을 보여요(행은 바꾸지 않음).
- 허가 소식의 질환을 *지금* 표적이 아니라 *접수한 표적 버전*에서 읽어요. 4.1 행의 용량이 10 · 50 · 100 밖이면 프로토콜 없음으로 봐요(쓰기 경로 CHECK 위반 500 방지).
- 학생 문구: 화면 · 그림 · 서버 막음 글 · NDA 요약 줄 이름에 흩어져 있던 문자열을 `APPROVAL_COPY` 의 `ui` · `server` · `evidence` · `formLabel` · `formShort` 로 모았어요(LLM 사실 값은 그대로 — 캐시 해시가 바뀌지 않게). 규격 `STEP_META['4.2'].sub` 를 '규칙 · 서류 심사'로(설계 §6.1 판정 칸).
- 시험: 규격 +1(문구 한곳) · 서버 +1(용량 밖 값) · e2e +2(표적 바꾼 모둠의 브랜드 재사용 · 다른 모둠은 여전히 409 / 3상 프로토콜 변경이 GET 에 바로 보이고 GET 은 행을 안 바꿈) → 22/22. `E2E_SEED_ONLY=1` 은 3상 통과 상태만 만들고 로그인 정보를 찍어요(화면 점검용).
- 남긴 것: 8.07 주가 반응 그래프(FMARKET 기업가치 이력이 들어온 뒤) · 버려진 초안이 학급 이름을 계속 잡는 것(다른 모둠 기준 — 설계 결정 '저장 때 예약' 유지) · 교사용 4.2 보기(교사는 심사 기록으로만 봄).

### 6.6 FLEARN — 학습 연구비 v1(learning-grant-design 전체 · balance §1~§3 · 설계 §10 · W3.5 + W5 의 Series A/B)

학습이 진행을 막지 않게, 돈은 규칙만 정하게 만들었어요. 단계 상태(`computeSteps`)는 학습 표를 보지 않아요.

| 무엇 | 어떻게 |
| --- | --- |
| 파일 | 서버 `apps/server/src/features/learn.ts`(경로 · 지급 · 가동률 · 틱 · 채점 · 피치 · 교사) · `features/learn-bank.ts`(문항 은행 — 정답 · 루브릭 · 모범 개요는 서버만) · 규격 `packages/web-contract/src/learn.ts`(상수 · 순수 계산 · 화면 모양 · `LEARN_API` · 학생 문구 `LEARN_COPY`) · 화면 `apps/web/src/board/learn/`(StepLearn · GrantChip+서랍 · PitchButton+투자 심사 창 · useLearn · learn.css) · 사옥 창문 `district/DistrictScene.ts setLights` + `screens/District.tsx` 효과 하나 |
| 스키마 0015 | `learn_progress`(모둠의 지금 단계 · 이어 온 연속 s 바탕 · `updated_at` = 마지막으로 본 때) · `learn_assignments.hint_used_at` · `learn_shields` UQ(team, earned_from) · `learn_pitch_rounds.qual_result` · `learn_appeals` 열린 이의 부분 UQ(target) · `learn_gradings.team_id · class_id` + 살아 있는 채점 부분 UQ(target) |
| 문항 은행 | 9단계 × 개념 2 · 중급 1 · 심화 1 = 36. 개념은 시드 결정적(`variantSeed = hash(학생 · 학급 · 문항)`) · 정답은 game-rules(`ro5Violations` · `propertySignals` · `affinityStrength`)로 — crista CRO 의 A3 · B1~B4 · C1 틀. 3.2 = 3R 분류 · 고통등급 A~E · 인도적 종료시점 + 동물 수 딜레마, 3.3 = MRSD 계산 · 경피 제형(앞 판 3.2 IND). 서술형은 모둠 데이터(`LearnContext` — 별칭 `후보 A` 만)를 묶고, 없으면 예시 값 + '예시로 물어요' 표시. 서버 시작 뒤 첫 요청에 `learn_items` 로 멱등 동기화 |
| 지급 | 점수 → `rewardFor` · 힌트 70% · 1회 수정 차액 · 모둠 단계 문항 상한 800,000(넘으면 practice) · 노트 200,000 / 분담 ×1.2(3~4인 3명 · 2인 2명) · 노트는 문항 상한과 따로. 원장 kind `learn_item` · `learn_revision` · `learn_note` · `learn_stipend` · `learn_correction`(±) · `pitch_series_a/b`, 멱등 키 `learn:answer:<id>` · `learn:note:<id>` · `learn:stipend:<step>:tick<n>|settle` · `learn:pitch:<round>:base|final` |
| 가동률 · 틱 | 가동 = 그 단계 50점 이상 문항 1개 또는 50점 이상 노트 평가의 작성자. ρ = 가동 / (모둠 학생 − 교사 면제), s = 바탕 + (지금 단계 전원이면 1), m = 1 + ρ + 0.1·min(s, 5). 단계를 떠날 때 한 번만 바탕 정산(전원 · 보호권 +1, 아니면 −1). 보호권: 심화 · 노트 80점 이상 → 1장(최대 2). 10분 틱 `onRealtimeTick('learn-stipend', 60s)` 가 '10분 지났나'를 DB 시각으로 보고 40,000 × m(단계당 2틱). 전원 가동 순간 `2틱분 − 받은 것` 즉시. 5단계 연속이면 전광판 `learn` 긍정 소식 |
| LLM 채점 | `deps.llm.call(task 'learn_grade', 판 LEARN_GRADER_VERSION 'learn-v2')` · 구조화 출력(항목 credit full/half/none · note · feedback · flags — 금액 칸 없음) · 서버가 정리 · `rubricScore` 로 점수. 입력 해시 캐시 · 접수 즉시 pending → 끝나면 WS `learn.graded` · 키 없음/꺼짐은 30분 뒤 · 오류 재시도(`learn-grading` 20초 주기, 6회) · 거절 · 반복 실패는 교사 알림 `learn_flagged`. 사전 필터: 끼워 넣기 → 0점 + 교사 알림, 같은 학급 같은 문항 trigram Jaccard ≥ 0.6 → 늦은 쪽 0점 duplicate |
| Series A/B | A = 2.2 특허 후보 1개 이상 뒤 · B = 유효 특허 + IND 승인 뒤(3판). 정량 70 = 규격 `seriesAQuant` · `seriesBQuant`(4인 발굴 다양성 · 주력 결합력 p + PLIP · ADMET 신호 · CNS TPSA · 백업 / 특허 + 최적화 · IND 첫 승인 · E·S · 기여 균형). 신청 즉시 정량만큼(바닥 30%) 입금, 피치 정성 30(LLM)이 끝나면 차액 · Series A 는 사옥 `hq_tier` 2 · 전광판 `investment` 소식(티커 · 라운드 · 금액만). 라운드마다 모둠 1회(UQ) |
| 교사 | `GET /api/teacher/learn/:classId` 현황표(학생 × 단계 · 모둠 ρ · s · m · 보호권 · 받은 돈 · 이의 · 채점 로그 · 오늘 LLM 호출) · `PUT …/exemptions` 면제 · `POST /api/teacher/learn/override` 정정(원본 점수 보존 · 차액 ±) · `POST /api/teacher/learn/appeals/:id` 이의 처리. 교사 화면(Teacher.tsx)은 이번에 그리지 않았어요(API 만) |
| 공개 범위 | 문항 · 답 · 점수는 본인, 노트 평가 · 피치는 모둠과 교사만. 학급 채널은 `district.lights`(켜진 창 수 · 전원 · 깃발)와 전광판 긍정 소식뿐 |

**설계와 다르게 정한 것**
- 10분 틱 대상은 '시계가 흐르는 학급' + '최근 30분 안에 모둠원이 학습 칸 · 서랍을 본 모둠'(`learn_progress.updated_at`) — 며칠 켜 둔 학급에서 아무도 안 보는 모둠에 돈이 쌓이지 않게. 0015 를 다른 실행이 먼저 적용해 `seen_at` 칸을 따로 둘 수 없어서 `updated_at` 을 그 뜻으로 써요.
- '지금 단계' = `computeSteps` 의 첫 '완료 아님' 단계. 단계 넘김은 학습 요청 · 서랍 읽기 · 틱에서 감지해 정산해요(표적을 바꿔 되돌아가도 이미 정산한 단계는 다시 정산하지 않아 s 를 부풀릴 수 없음).
- Series A 정량의 주력 리드 = 3.2 지정(program lead)이 있으면 그것, 없으면 특허 후보 중 ΔG 가장 좋은 것. ADMET 신호는 워커 물성(8초 상한) → 없으면 2.2 레이더 판정으로.
- 피치는 정량 몫을 먼저 입금하고 정성 차액을 나중에(LLM 장애에도 투자금이 막히지 않게). 전광판 소식은 최종 확정 때 한 번.
- 개념 문항도 1회 수정 가능(차액만). 정답 · 해설은 마지막 시도(또는 만점) 뒤에만 보여요.
- 이의 제기 · 정정은 교사 API 로만(교사 화면 칸은 다음 일).
- 복습 큐 · 직급 배지 · 2축 순위의 '연구 역량 지수'는 W7 이라 넣지 않았어요.

**시험**
- `packages/web-contract/test/learn.test.ts` 12 — 균형표(배율 6줄 · 8단계 전원 1,520,000 · 바닥 4.5M/7.5M) · 정량 70 · 루브릭 점수 · 개념 채점 · 문구 해요체.
- `apps/server/test/learn.test.ts` 11 — 은행 36문항 · 300 시드 결정성 · 정답이 보기 안 · Ro5 정답 = game-rules · 서술형 폴백 · 사용자 메시지 격리 · 해시 · 출력 정리 · 가짜 SDK(샘플링 인자 없음 · 금액 칸 없음) · trigram.
- `WEB_PORT=3408 npm run e2e:learn`(LLM 끈 서버) 17/17 — 4명 동시 개념 정답 + 두 번 누르기 → 답 4 · 지급 4줄 · 전원 가동 즉시 정산 1줄(168,000) · 창문 4/4 · 힌트 70% · 수정 차액 · pending · 베끼기 · 끼워 넣기 · 노트 4명 동시 평가 → 1건(×1.2) · 교사 동시 정정 8건 → 단계 상한 정확히 800,000 · 보호권 2장 · 이의 동시 2건 → 1건 · 정정 차액(−) · 단계 넘김 s · 틱 동시 2번 → 1틱 · 2틱 상한 · Series A 4명 동시 → 1건 · Tier 2 · 전광판 공개 칸 · 교사 현황표 · 면제 · 권한.
- 실제 Claude 1건(프로세스 안 · 1.1 중급 답): 약 12초 · done · 3항목 판정 · 점수 17 · 지급 0 · WS `learn.graded`. 피드백이 루브릭 id 를 인용해 시스템 프롬프트를 고치고 판을 `learn-v2` 로 올렸어요.

**남은 것**: 교사 화면 칸(현황표 · 면제 · 이의 · 정정) · 학생 문구 §5.12 다듬기(`LEARN_COPY` · learn-bank 문항 글 — 바꾸면 은행 `version` · `LEARN_GRADER_VERSION` 올림) · 연구 역량 지수 순위(FMARKET 과 함께) · 복습 큐(W7). 로컬 crista_web 연결 30개 상한을 서버 여러 개가 나눠 써서 동시 시험이 '연결 부족 500'으로 가끔 실패해요(다시 돌리면 통과). 호스팅 DB 에는 0015 미적용.

#### 6.6.1 FLEARN 적대적 검토 · 수리(2026-10-24)

코드를 설계(learning-grant §2 · §4 · balance §2 · §3 · 설계 §7.4)와 직접 대조해 고쳤어요. 스키마는 바꾸지 않았어요(0015 그대로).

| 결함(심각도 순) | 고친 것 |
| --- | --- |
| **교사 정정 원장 어긋남** — 정정 줄의 멱등 키가 `점수:받은 돈`이라 100 → 50 → 100 처럼 같은 쌍으로 돌아오면 `on conflict do nothing` 으로 줄이 빠지고, `crista_paid` 는 바뀌어 원장과 어긋났어요(ledger_id 도 null 로 덮임) | 키를 그 대상의 정정 순번(`learn:corr:<type>:<id>:<n>`)으로. 멱등은 '이미 받은 돈과의 차액'(learn_progress 잠금 안)이 지켜요. 금액은 `cristaToCents`(× 20 직접 곱 제거) |
| **1차 정정 뒤 문항 합계 초과** — 2차를 이미 받은 문항의 1차를 교사가 올리면 1차 + 2차 차액이 max 보상보다 커졌어요(노트 평가도 같음) | 1차를 고치면 채점된 2차를 같은 트랜잭션에서 다시 맞춰(= 2차 보상 − 새 1차 지급, 0 아래면 0) 문항 · 노트 합계가 늘 max 보상 |
| **지금 단계 포인터 경합 · 뒤로 가기 정산** — 단계를 잠그기 전에 읽어, 늦은 요청이 옛 단계로 포인터를 되돌리며 앞 단계를 정산(보호권 소모 · s −1)할 수 있었어요. 1.1 에서 표적을 바꿔 앞 단계로 돌아가는 것도 '단계 넘김'으로 정산해 보호권을 쓰고 s 를 +1 했어요 | `frontierStep` 을 learn_progress 잠금 **뒤에** 읽고, 뒤로 가기는 정산 없이 포인터만 옮겨요. 정산한 단계로 돌아오면 그때의 s 로 보여요(배율이 올라 '받을 몫'이 생긴 것처럼 보이지 않게) |
| **전원 가동 차액 누락** — 시간 틱 2번을 이미 받았으면(낮은 배율) 전원 가동이 돼도 '2틱 최대 − 받은 것'을 주지 않았어요(설계 §2.3) | 단계마다 한 번(`…:settle` 원장 확인) 차액을 줘요. 예: ×1.0 두 틱 80,000 → 전원 가동 ×2.1 → 88,000 |
| **힌트로 이미 낸 답 깎기** — 채점 중 · 고친 답 뒤 · 만점 뒤에도 힌트가 열려, 채점 중인 답의 상한이 뒤늦게 70% 로 깎였어요. 답 내기와 힌트가 줄을 서지 않았어요 | 힌트는 문항 줄 `FOR UPDATE` 뒤 검사 — 채점 중 409 `stale` · 더 낼 답 없음 409 `limit_reached`. 답 내기도 문항 줄을 잠그고 다시 읽어 지급해요 |
| **Series B 지급 1 크리스타 모자람** — `25,000,000 × 0.57` 부동소수 곱이 14,249,999 | `pitchPayout` 을 정수 계산으로(0~100 전 점수 시험) |
| **피치 글 길이** 100~800 ↔ 설계 · 안내 문구 200~500 | `LEARN_TEXT_LIMITS.pitch = 200~500` |
| **사옥 Tier 2 가 AI 채점을 기다림** — LLM 이 꺼져 있거나 거절이면 Series A 를 받아도 Tier 2 가 안 됐어요(설계 '즉시 효과') | 신청 트랜잭션에서 바로 `hq_tier = 2` + 학급 `team.updated`. 전광판 소식은 최종 금액이 정해질 때 한 번 그대로 |
| **교사 결정 덮어쓰기** — LLM 을 기다리는 사이 교사가 정정하면 늦게 온 채점이 learn_gradings 를 'done'/'unavailable' 로 되돌렸어요 · 교사 알림 횟수 계산이 한 번 일렀어요 | `status <> 'overridden'` 일 때만 닫고 · 미루고, 덮였으면 지급을 건너뛰어요 |
| **모둠 옮긴 학생** — 옛 모둠 문항으로 답하면 지금 모둠 잠금으로 옛 모둠에 지급 | 첫 답이면 문항을 지금 모둠으로 옮기고, 2차는 문항의 모둠을 잠가요 |
| **학생 문구가 화면 · 서버에 흩어짐**(§5.12 — Gemini 는 `LEARN_COPY` 만 다듬어요) · 정량 근거에 영어 위험어(`high` · `moderate`) | 화면 문구 · 전광판 헤드라인 · 루브릭 빈칸 글 · 힌트 머리를 `LEARN_COPY` 로. 위험어는 `LEARN_COPY.risk`(낮음 · 보통 · 높음). 화면 파일에 한글이 직접 박히면 실패하는 시험을 더했어요 |
| 화면 — 채점 중인 2차 답에 이의 단추 · 피치 창 머리 정량 점수가 결과(59)가 아닌 지금 미리보기(11) · 교사가 정한 정성 점수를 'AI 채점'으로 표시 · 투자 유치 단추 안내가 Series A 를 마친 뒤에도 'A 잠김' · 폰에서 ⚡ 칩이 위 띠 가로 칸 오른쪽 밖 · 학습 칸 오류에 다시 읽기 없음 | 마지막 답이 채점된 뒤에만 이의 · 결과의 정량 · `PitchRoundView.overridden` → '선생님이 고친 점수' · B 잠김 안내 · `learn.css` 에서 폰만 칩 `order: -1`(공유 배치 그대로) · [다시 읽기] |

**남긴 것**: 개념 문항 1회 수정(설계 표는 중급 · 심화만 '+수정 1회' — 원칙 3 '문항 · 노트당 1회'와 같이 읽어 그대로, 차액만) · Series A ③ 질환 적합은 TPSA 만(BBB 등급 미반영) · Series B ② 는 IND 첫 승인 여부만(제형 · 질환 적합 미반영) · 베끼기 검사는 트랜잭션 밖(다른 모둠 두 학생이 같은 순간 같은 글을 내면 둘 다 통과할 수 있음) · 새 모둠원 합류는 다음 학습 행동 때 ρ 를 다시 셈.

**시험(수리 뒤)**: `npm run typecheck` 0 · `npm test` 통과(web-contract 141 · server 190 — 학습 14 · 12) · `npm run build:web` 통과 · `WEB_PORT=3408 npm run e2e:learn`(LLM 끈 서버) **22/22** — 더한 것: ⑩ Tier 2 신청 즉시 · ⑫ 만점 뒤 힌트 409 · 2틱 뒤 전원 가동 88,000 정산 · 정정 50→100→50→100→50 원장 = crista_paid · 채점 중 힌트 409 · 1차 정정 뒤 2차 다시 맞춤(합계 75,000) · ⑬ 3.1 에서 표적 바꿔 1.2 로 가도 s · 보호권 그대로. 동시 조작 직전 서버 · 시험 풀 연결을 미리 열고(공유 로컬 DB 연결 부족 대비), 읽기 500 · 53300 만 잠깐 뒤 다시 해요. 화면 1440 · 390 스크린샷은 `.review/2026-10-24-flearn/`(폰 가로 스크롤 0).

### 6.7 FMARKET — 전광판 01 · 기업가치(과정 + 결과) · 순위 · 공개 서랍 · 사옥 Tier · 마감 · 최종 순위(설계 §5.3 · §5.2 · §4.1 · §9 · W5 · learning-grant §5 · 2026-10-24 사용자 지시)

사용자 지시: "모든 파이프라인의 하나하나가 기업가치/주식에 반영되고(과정 및 결과 모두 평가되어야 함) 수업이 끝날 때(또는 교사가 정한 시기가 끝날 때) 최종 순위가 매겨짐".

| 무엇 | 어디 · 어떻게 |
| --- | --- |
| 표 | `0016_market.sql` — `board_events.kind` 열린 규칙(9단계 소식 + `process` + `^antibody_[a-z0-9_]{1,40}$`) · `market_state`(모둠마다 지금 주가 한 줄 · 결과/과정 변동 합) · `valuations.kind` + 부분 고유 키 `(event_id)`(소식 하나에 한 번) · `process_scores` PK `(team_id, step_id)`(단계마다 과정 평가 한 번) · `classes.ends_at · final_at · final_by · final_reason`(+ 짝 CHECK) · `class_standings` PK `(class_id, team_id)` · UQ `(class_id, rank)` |
| 결과 소식 → 기업가치 | `onBoardEvent('market')` — 소식을 넣은 트랜잭션 안에서 crista `PIPELINE_ANALYST_BANDS`(특허 · IND · 임상 1~3상 · 허가 — 허가는 `approvalDefaultChangePct(form)`) · `ANALYST_BANDS`(도킹 `dockingDefaultChangePct` · 투자 A 8 / B 12) 범위 그대로, 그 안에서 **결정적 흔들림**(학급 id · 소식 키 SHA-256 → u∈[−1,1], 기본값에서 범위 끝까지의 절반 안 · 0.1%p). crista 에 없는 것은 규격 `MARKET_EXTRA_BANDS`(전임상 0~5 · 2, 학습 0~2 · 1, 항체 0~5 · 2 / 악재 −5~0 · −2). 주가는 `applyFundamentalChange`(곱 · 하한 $0.10) — `market_state` 행 `for update` · 소식 넣기의 학급 행 잠금 안이라 4건이 동시에 와도 잃어버린 갱신이 없다 |
| 과정 평가 → 기업가치 | 단계가 처음 `done`(서버 `computeSteps` 판정 그대로)이 되면 규격 `PROCESS_RULES`(+ 공통: 연구 노트 3칸 · 노트 쓴 사람 · 그 단계 학습 문항 참여) 신호를 DB 사실에서 0~1 로 → 가중 평균 0~100 → 변동 0 ~ +3%(30 미만 0 · 감점 없음). 단계별: 1.1 표적 추천 참여 · 1.2 투표 정족수 · 다시 논의 · 찜 근거 · 농축도 · 2.1 도킹 참여 · 구조 변형 · 근거 칩 · 2.2 후보 참여 · 새 물질 · 근거 · 3.1 보완 횟수 · 거절 없음 · 3.2 대체 시험(3R) · 마릿수 수준 · 윤리 교육 · 계획서 보완 · 3.3 보완 횟수 · 보류 없음 · 4.1 재도전 · 모집 전략 · 4.2 보완 횟수. 15초 주기 점검(최근 3시간 활동이 있는 모둠만)이 내거나, 기능이 직접 `postProcessScore` 로 낸다(먼저 넣은 쪽 하나 — PK). 학급 전광판에는 `public` 신호의 사실(예: '기준 투표 4/4명')만 — 점수 · 보완 횟수 · 농축도는 그 모둠 · 교사만 |
| 순위 소식 · 사옥 Tier | 1위가 바뀌면 `rank` 소식(초록, 등기 · 동률 정리 때는 내지 않음). `approval` → `teams.hq_tier = 3`, Series A `investment` → 2(FLEARN 이 이미 올리고 여기서도 멱등) — 커밋 뒤 별도 문장 · 학급 WS `team.updated` |
| 도킹 신기록 | `onJobSucceeded('market')` — 2.1 성공 ΔG 가 −7.0 이하이고 학급 · 같은 표적의 앞선 신기록보다 낮으면(`isDockingRecord`, 학급 행 잠금 안) `docking_record` 소식 `◆ SEUM ACHE 결합력 학급 신기록 −11.4 kcal/mol` |
| 설립 등기 | `teams.ts` 등기 트랜잭션 안에서 `listing` 소식(첫 소식 · `listing:<모둠>` 키) → 상장가 $10.00 기업가치 줄. 0016 전에 등기한 모둠은 주기 점검이 같은 키로 채운다 |
| 헤드라인 | 결과 소식만(`HEADLINE_AI_KINDS` + `antibody_*`) 커밋 뒤 `llm.call({ task: 'headline', version: 'headline-v1' })` — 학급 하루 40번 · 60초 넘게 늦거나 실패 · 거절이면 규칙 문구 그대로. 받는 조건: ◆ + 티커로 시작 · 80자 이하 · 숫자는 규칙 문구 · 공개 칸 · 변동률에 있는 것만 · SMILES 꼴 금지. 받으면 `headline_ai` + 같은 소식 id 로 학급 WS 다시(화면 'AI' 꼬리표) |
| 마감 · 최종 순위 | 교사 `POST /api/market/classes/:id/final {action: close · reopen · schedule(endsAt)}` · 5초 주기 점검이 `ends_at` 지난 학급을 얼림. `freezeStandings` = classes `for no key update`(소식 넣기와 같은 잠금 — 마감 중 소식은 기다렸다가 '마감 뒤'로) 안에서 `computeFinalStandings` → `class_standings` · `final_at` · 마감 소식. 마감 뒤 소식은 흐르지만 처리기가 기업가치를 움직이지 않는다(change_pct null). [마감 풀기]는 순위표를 지우고 다시 움직이게(풀린 동안 놓친 소식은 소급하지 않음) |
| 최종 순위 내용 | 시가총액 순위(crista `rankMarketCap`) · 결과 점수(`RESULT_POINTS` — 도킹 5×2 · 특허 8×3 · 전임상 10 · IND 12 · 1/2/3상 8/10/12 · 허가 20 · 투자 5×2 · 항체 5×4, 상한 100 · 보류는 깎지 않음) · 과정 점수(단계 평균) · 도달 단계 · 허가 여부 · 연구 역량 지수(learning-grant §5: 학습 평균 × 커버율 × 0.8 + 4인 발굴 다양성 × 20)와 그 순위(2축) |
| 경로 | `GET /api/market/board`(학생 = 자기 학급 · 교사 `?classId=` · `limit` ≤ 20) · `GET /api/market/teams/:teamId`(공개 서랍) · `GET /api/market/final`(학생은 마감 뒤만 · 과정 신호는 자기 모둠만 / 교사는 마감 전 미리보기 · 모든 모둠) · `POST …/final` · `POST /api/market/classes/:id/notice`(교사 공지 · 정정 — 모둠 + ±20% 면 `correction`) |
| 화면 | `board/market/` — `LedBand`(최근 10건 · 점 가면 · 호박/빨강/초록 · ▲▼ · 'AI' 꼬리표 · 40초 두 벌 · 멈춤 · LIVE · 항목 누르면 서랍 · `aria-live` 새 소식 · 모션 줄이기 목록) · `RankButton`(`시가총액 순위 N위 · 6,370만 크리스타`, 마감 뒤 `최종 순위`) · `Drawer`(§5.3 '누르기' 전부 + 추세선 SVG) · `FinalStandings`(시상대 · 결과/과정 표 · 모둠별 추세 SVG(선 끝 티커 · 점선 꼴로 색 외 구분) · 과정 신호 막대(🔒 = 학급 비공개)) · `TeacherMarket`(교사 화면 — 띠 · 순위 · 마감 시각 · [지금 마감] · [마감 풀기] · 미리보기 · 공지/정정 · **프로젝터 보기** 검은 바탕 큰 글자 + 마감 뒤 시상대) · `store.ts`(한 벌 읽기 — 띠 · 단추 · 광장 · 교사가 요청 하나를 나눠 씀). 사옥 지구 광장 LED 기둥은 같은 소식(`DistrictScene.setPlazaNews`). 스크린샷 `.review/2026-10-24-fmarket/`(1440 · 390 — 가로 스크롤 없음) |
| 문구 | 모두 `MARKET_COPY`(web-contract `market.ts`) — §5.12 Gemini 다듬기 대상. 주가 · 시가총액 표시는 크리스타(`formatCapM` · `formatPrice` — 저장은 달러, $1 = 5 크리스타) |

**다른 기능 · 다른 세션이 쓰는 공개 규격(그대로 부르면 기업가치 · 최종 순위에 들어가요)**
- 소식: `postBoardEvent(tx, deps, { classId, teamId, kind, headline, public?, idemKey?, tone?, gameDay? }) → { created, event, after }`(board-events.ts — 커밋 뒤 `after()`). `kind: BoardEventKind = 'listing' | 'docking_record' | 'patent' | 'preclinical' | 'ind_approved' | 'ind_held' | 'trial_pass' | 'trial_held' | 'approval' | 'investment' | 'rank' | 'learn' | 'correction' | 'notice' | 'process' | \`antibody_${string}\``(DB CHECK 와 같은 꼴 `^antibody_[a-z0-9_]{1,40}$` · `isBoardEventKind`).
  - 변동률을 고르는 공개 칸: 임상 `public.phase`('phase1'~'phase3') · 허가 `public.form` · 투자 `public.round`('Series A' · 'Series B') · 도킹 `public.affinityKcal` · 정정 `public.changePct`. **항체 트랙**: `public.stage`('patent' · 'ind' · 'phase1' · 'phase2' · 'phase3' · 'final') + `public.passed`(boolean)를 주면 소분자와 같은 crista 범위, 없으면 `MARKET_EXTRA_BANDS.antibody`(tone 'bad' 면 `antibody_bad`). `passed: false` · tone 'bad' 는 결과 점수에 세지 않는다.
- 과정 평가: `postProcessScore(tx, deps, { classId, teamId, stepId: StepId | \`antibody_${string}\`, components: ProcessComponent[], revisionId?, gameDay?, source? }) → { created, score, changePct, after }`(features/market.ts). `ProcessComponent = { key, value: 0~1, weight > 0, fact, public }`. 잠금 순서 teams → classes(teams 를 잠근 뒤 또는 아무것도 잠그지 않은 때 부른다). (모둠, 단계)마다 한 번.
- 최종 순위: `computeFinalStandings(db, classId) → StandingRow[]` · `freezeStandings(deps, classId, 'teacher' | 'schedule', by?)`.

**설계와 다르게 정한 것**
- 과정 평가는 가산만(0 ~ +3%) — '긍정 · 중립 중심' 지시대로. 실패의 벌은 결과 소식(보류 −) 몫이에요.
- 변동률의 '흔들림'은 crista 처럼 LLM 제안이 아니라 해시로 정해요(같은 소식은 다시 계산해도 같은 값 · 시험 가능). LLM 은 헤드라인 한 줄만.
- 24시간 등락은 crista `changePct24h`(봉 = `valuations` 에서 `updateCandles`) — 수업이 하루보다 짧아 사실상 '상장 대비'예요.
- 투자의견은 마지막 변동률의 crista `defaultAnalystRating`(현금 경보 없음).
- 공개 서랍의 '프로그램 코드'는 가장 최근 유효 특허 코드명, '표적 · 질환'은 지금 표적 버전.
- 등기 소식 전에 등기한 옛 모둠은 주기 점검이 `listing` 을 채우되, 최근 3시간 활동이 있는 모둠만이라 오래 쉬던 모둠은 $10.00(줄 없음)으로 보여요.
- 학생 최종 순위는 마감 뒤에만. 마감 전 '미리보기'는 교사만.
- 서버 읽기는 차례로(`inSeries`) — 로컬 crista_web 연결 상한(30)을 기능 서버 여럿이 나눠 써서, 요청 하나가 연결 여러 개를 한꺼번에 열지 않게.

**시험**
- `packages/web-contract/test/market.test.ts` 13 · `apps/server/test/market.test.ts` 14(crista 범위표 대조 · 흔들림 결정성 · 하한 · 순위 · 헤드라인 받기/거절 · 마감 · 정정 검사 · 결과 칸).
- `WEB_PORT=3409 npm run e2e:market`(LLM 끈 서버) 16/16 — 등기 4인 동시 → listing 1줄 · 정정 4건 동시 → 주가 = 10×Π(1+p) · rank 1번 · 같은 (모둠, 단계) 과정 평가 4번 동시 → 1줄 · 공개 칸에 점수 없음 · 다른 단계 4개 동시 곱 · 주기 점검이 1.1 과정 평가 · 도킹 같은 값 4건 동시 → 신기록 1번 · 항체 소식 접수 · 잘못된 종류 DB 거절 · 가짜 LLM(받음 · 지어낸 숫자 거절) · 서랍 비공개 칸 없음 · [지금 마감] 4번 동시 → 200 1 · 409 3 · 마감 ↔ 정정 4건 동시(앞이면 움직임 · 뒤면 null) · 얼린 주가 = 지금 주가 · 마감 뒤 순위 고정 · 다시 열기 · 예약 마감 · public 행 수 무변경.
- 실제 Claude 2번(프로세스 안 · 임상 2상 통과 소식): 1번째 응답(약 4초 · `claude-opus-5-5`)은 공개 칸의 코드명 숫자(201)를 썼는데 받는 조건이 규칙 문구 숫자만 봐서 버려졌어요 → 공개 칸 숫자도 허용하게 고침 → 2번째 약 3초 · `◆ MIRB 알츠하이머병 후보물질 MIRB-201, 임상 2상 통과 — 3상 진입` 이 headline_ai 로 들어감.

**남은 것**: 문구 §5.12 다듬기(`MARKET_COPY` · `HEADLINE_SYSTEM` — 바꾸면 `HEADLINE_VERSION` 올림) · 교사 공지에 학생 이름이 들어갈 수 있음(교사 책임 · 필터 없음) · 마감 풀기 동안 놓친 소식 소급 없음 · 과정 신호 SQL 은 다른 기능 표 칸 이름에 기대므로(신호마다 따로 읽어 실패하면 그 신호만 빠짐) 표가 바뀌면 `SIGNALS` 를 맞춰야 함 · 호스팅 DB 에 0016 미적용 · 로컬 연결 상한 때문에 e2e 가 가끔 '연결 부족 500'(다시 돌리면 통과).

#### 6.7.1 FMARKET 적대적 검토 · 수리(2026-10-24)

설계(§5.3 · §5.16 · §7.4 · §9)와 코드를 직접 대조해 고친 것(심각도 순):

| # | 결함 | 고친 것 |
| --- | --- | --- |
| 1 | 전광판 처리기(`onBoardEvent('market')`)가 던지면 소식을 낸 기능의 트랜잭션 전체(특허 등록 · 과금 · 판정)가 되돌려졌다 — 기업가치 쓰기 하나가 학생의 유료 행동을 막을 수 있음 | 처리기의 기업가치 쓰기를 세이브포인트 `market_move` 안에서. 실패하면 그 소식만 `change_pct` null(로그), 본 일은 커밋. `postProcessScore` 도 세이브포인트 `market_process` — 잘못된 stepId · 처리기 오류면 `created: false` 로 돌아오고 호출자 트랜잭션은 산다 |
| 2 | 교사 화면 LED 띠 · 순위에서 모둠을 누르면 공개 서랍이 늘 400(교사는 `?classId=` 가 필요한데 화면이 붙이지 않음) | `MARKET_API.drawer(teamId, classId?)` · `MarketDrawer` 가 교사 학급 id 를 붙인다 |
| 3 | §5.16 '과정 소식(모집 완료 · 임상 시작 등)에도 변동'이 빠짐 — 4.1 이 내는 `notice` + `public.event: 'trial_recruited' \| 'trial_started'` 가 기업가치를 움직이지 않았다 | 규격 `PROGRESS_NOTICE_EVENTS` · 서버 `bandFor` 가 crista `ANALYST_BANDS.upgrade`(0~3 · 기본 1 `defaultAnalystChangePct('upgrade')`) 범위에서 결정적 흔들림. 교사 공지(`by: 'teacher'`)는 그대로. 결과 점수에는 세지 않음 |
| 4 | 과정 평가 주기 점검(15초)이 공용 시계 틱 안에서 `await` — 점검 시간만큼 임상 · IND · 학습 틱 · 시계 방송이 밀림. 대상도 최근 3시간 활동 모둠 전부(로컬 214모둠 · 매번 모둠당 5쿼리) · `sweepProcess(deps, { teamId })` 를 한 번 부르면 `sweeping` 이 영영 참으로 남는 버그 | 틱은 기다리지 않음(`void` · 겹침은 `sweeping`). 대상은 9단계를 다 평가하지 않은 모둠 중 최근 15분 활동(표적 바꾸기 `programs.updated_at` 포함) · 20번에 한 번은 3시간 창으로 놓친 것 줍기(`SWEEP_WINDOW_MIN` · `SWEEP_WIDE_WINDOW_MIN` · `SWEEP_WIDE_EVERY`). `only` 호출은 플래그를 건드리지 않음 |
| 5 | 공개 범위(§5.3): 학생 `GET /api/market/final` 이 다른 모둠의 단계별 과정 점수(`processByStep`)까지 내려줌(화면엔 안 그려도 응답에 있음) | 학생에게 다른 모둠은 `processByStep: {}` — 합계(`processScore`)만. 교사는 그대로 |
| 6 | 교사 정정의 `teamId` · 경로 id 가 `[0-9a-f-]{36}` 만 보고 DB 로 가서 uuid 형 변환 오류 → 500 | 엄격한 uuid 꼴(`UUID_RE`) — 틀리면 404 |
| 7 | 마감 중 등기한 모둠은 마감을 푼 뒤 `market_state` 줄이 없어 주기 점검이 15초마다 같은 등기 소식 넣기를 되풀이 | 같은 키 소식이 이미 있으면 상장가 줄만 채움 |
| 8 | 모션 줄이기에서 이어 붙인 두 번째 벌(inert)이 그대로 보여 같은 소식이 두 번 | `prefers-reduced-motion` 에서 `aria-hidden` 벌 숨김(가로로 넘기는 목록 한 벌) |
| 9 | 프로젝터 보기: 1위 단상 숫자가 밝은 박막 위 밝은 글자 · 추세선 · 잉크 점이 밝은 바탕용 진한 잉크라 검은 바탕에 묻힘 | 1위 단상 글자 진하게 · 프로젝터에서는 잉크 짝 `led` 색(`TrendChart dark`) |
| 10 | 교사 미리보기 최종 순위가 공지 · 과정 소식에만 다시 읽힘(결과 소식 뒤 낡은 값) · 띠 · 서랍 · 추세 일부 문구가 `MARKET_COPY` 밖 · 0007 시절 `kind` null 기업가치 줄이 '바로 앞 변동'에서 빠짐 | 모든 `board.event` 에 다시 읽기 · 문구를 `MARKET_COPY`(§5.12 대상)로 · `kind is distinct from 'listing'` |

**공개 규격 덧붙임**: `MARKET_API.drawer(teamId, classId?)` · `PROGRESS_NOTICE_EVENTS`(4.1 진행 소식 — 다른 기능이 같은 꼴로 내면 움직인다) · `SWEEP_*`. `postProcessScore` 는 실패해도 던지지 않는다(`created: false`).

**시험**: `WEB_PORT=3409 npm run e2e:market` 20/20(새 4건 — 진행 소식 4건 동시 → 2줄 · 0~3% · 교사 모둠 공지는 그대로 · 꼴 틀린 teamId 404 / 다른 연결이 `market_state` 행을 잡은 채 `lock_timeout 300ms` 로 특허 소식 → 소식 커밋 · change_pct null · 잘못된 stepId 과정 평가 건너뜀 / 교사 서랍 `?classId=` 200 · 없으면 400 / 학생 최종 순위의 다른 모둠 `processByStep` 비어 있음 · 교사는 채워짐) · `npm test` web-contract 143 · server 191 · `npm run typecheck` 0 · `db:check:local` 통과 · 웹 번들(scratch outDir). 브라우저(5209 → 3409): 학생 띠 → 서랍(1440 · 390) · 교사 띠 → 서랍 · [지금 마감] · 프로젝터 최종 순위 · 학생 최종 순위 390(본문 가로 스크롤 0, 표만 안에서) · 모션 줄이기 목록 — `.review/2026-10-24-fmarket/review-*.png`.

**남긴 것**: 과정 평가 변동률(0~+3%)은 공개라 학급이 점수를 대략 거꾸로 셀 수 있음(기업가치는 공개 — 설계 의도로 둠) · 헤드라인 하루 상한은 '세고 부르기'라 동시 소식이 몰리면 몇 번 넘을 수 있음(학급 전체 상한 `dailyRemaining` 이 뒤에서 막음) · 위 띠(공용 `Board.tsx`)는 390 폭에서 칩 줄이 띠 안에서 옆으로 넘어감(본문 가로 스크롤은 없음 · FMARKET 소유 아님).

#### 6.7.2 항체 소식 변동 계약 · 학생 문구 반영(2026-10-24)

**항체 랩과의 기업가치 계약**(항체 설계 문서 §11.3 · §11.3.1 '밴드 폭' — 8b 수락분 구현):

| 칸 · 값 | 규칙 |
| --- | --- |
| 소식 | `postBoardEvent({ kind: 'antibody_<…>', public: { changeHint, … }, tone? })` — 항체 랩은 `postAntibodyEvent` 한 곳에서 부른다 |
| `public.changeHint` | 0~10 정수(숫자 문자열도 받음 · 반올림 · 10 으로 자름). **변동 폭의 상한**. 없거나 0 · 숫자가 아니면 **변동 0** |
| 밴드 | `MARKET_EXTRA_BANDS.antibody_record = { minPct: 0, maxPct: 10, defaultPct: 4 }` — kind 가 정확히 `antibody_record` 일 때만. 그 밖의 `antibody_*` 는 `antibody`(0~5 · 기본 2), tone 'bad' 는 `antibody_bad`(−5~0 · 기본 −2) |
| 범위 | 규격 `antibodyBand(kind, tone, changeHint)` — 오르는 밴드 `[minPct, min(changeHint, maxPct)]`, 내리는 밴드(bad) `[max(minPct, −changeHint), 0]`(changeHint 를 폭의 절댓값으로 읽음). 기본값도 그 안으로 당김 |
| 값 | 그 범위 안에서 다른 결과 소식과 같은 결정적 흔들림(`jitteredPct` · 학급 id + 소식 키 SHA-256) — 같은 소식은 다시 계산해도 같은 값 |
| 예외 | `public.stage` 가 crista 단계(patent · ind · phase1~3 · final)이고 `public.passed` 가 참 · 거짓이면 지금처럼 crista 범위(changeHint 와 무관). 항체 랩의 `stage: 'antibody_A6'` 같은 값은 crista 단계가 아니라 위 규칙을 따른다 |

- 서버 `bandFor` 의 `antibody_*` 갈래가 `antibodyBand` 를 부른다. 항체 랩의 `antibody-fallback` 처리기는 'market' 이 있으면 아무것도 하지 않으므로 한 소식에 변동은 한 번이다.
- 시험: 규격 `market.test.ts` +4(밴드 · 상한 · bad · 힌트 없음 · 범위 안 흔들림) · 서버 `market.test.ts` +1(40건 범위 · 같은 키 같은 값 · crista stage 예외) · `e2e:market` 4번 확장(힌트 없음 · 0 → 0, fold 8 → 0~5, record 10 → 0~10, record 3 → 0~3, bad 4 → −4~0 · 서버 계산과 같은 값 · 주가 곱).

**학생 문구(§5.12)** — `.review/2026-10-24-copy-learn` · `copy-board` 초안을 `LEARN_COPY` · `MARKET_COPY` 에 옮겼다(키는 그대로, 금액 · 문턱 · 횟수는 규칙 상수와 `formatCrista` · `formatPrice` · `formatCapM` 로 채움).
- 이름: 전광판 화면(위 띠 순위 단추 · LED 띠 · 공개 서랍)은 설계 §5.2 · §5.3 대로 **시가총액** · **주가**(순위 단추 `시가총액 순위 N위 · 5,000만 크리스타`, 순위 소식 `◆ SEUM 시가총액 1위 탈환`, 서랍 추세선은 주가라 '주가 추세'), 최종 순위 창은 **기업가치**. 초안의 '기업가치 순위'는 이 화면에서는 쓰지 않았다.
- 판: 투자 피치 안내(채점 입력)가 바뀌어 `LEARN_GRADER_VERSION` 'learn-v3', 헤드라인 시스템 프롬프트에 화폐 규칙을 더해 `HEADLINE_VERSION` 'headline-v2'. 다듬은 헤드라인에 `$` · 달러 · USD · CRISTA 가 있으면 받지 않는다.
- 과정 평가 사실 줄의 영문 값(마릿수 수준 `low` · 모집 전략 `focus`)을 한글 이름으로(`적게` · `집중`). 3.2 · 4.1 쪽 서버 호출은 그대로.
- 화면 손질: 공개 서랍 숫자 칸이 '크리\n스타'로 글자 중간에서 꺾이던 것(`word-break: keep-all`) · 학습 서랍 '투자 유치' 수천만 숫자가 공용 막대 값 칸(56px)을 넘던 것 · 투자 심사 후보 표의 '주력' 칩 · 이름이 글자마다 꺾이던 것. 스크린샷 `.review/2026-10-24-copy-apply/copy-board/` · `copy-learn/`(1440 · 390, 본문 가로 넘침 0).
- 시험: `npm test` 중 내 묶음(web-contract `market` · `learn`, server `market` · `learn`) 전부 통과 · `WEB_PORT=3425 e2e:market` 20/20 · `e2e:learn` 모두 통과 · `E2E_FULL_STOP=approval e2e:full` 허가까지 통과.

### 6.11 F11 — 1.1 질환 · 표적 선정: 내 작업대 도구 5종 · 추천 서랍(설계 §5.4.2 · 2026-10-24 사용자 지시 "1~5 를 직접 적용하자")

시안 `design/target-select-10.html` 01~05 의 **기능**을 지금 '둥근 섬' 화면에 넣었다(`styles.css` · `StepLayout` · 판 · 카드 모양은 그대로).

| 층 | 파일 | 한 일 |
| --- | --- | --- |
| 규격 | `packages/web-contract/src/target.ts`(새) | 근거 4종 `TARGET_EVIDENCE` · 준비 상태 `targetTier` · 표적 8개 `targetShortlist`(워커 rank 1~8 = 도킹 표적 + 종합 상위 7 → 종합 순) · 가중치 `PICK_WEIGHT` · `pickWeightsOk` · `myTargetScore` · 추천 근거 6종 `TARGET_PICK_REASONS` + `checkTargetPickReasons`(시안 `REASONS[].check` 그대로 — 막음 `block` · 주의 `warn`) · 12대 질환 카탈로그 `TARGET_DISEASE_GROUPS` · 재도킹 값 `TARGET_REDOCK` · 한글 이름 `TARGET_KO_NAME` · 요청 `TargetPickRequest`. `TargetPickView` 에 `reasons` · `weights` |
| DB | `db/migrations/0009_target_pick_reasons.sql`(새) | `target_picks.reasons text[] not null default '{}'`(6개까지) · `weights real[]`(4개 · 0~3). 로컬 적용함 · **호스팅 미적용** |
| 서버 | `apps/server/src/pipeline.ts` `pickTarget` · `loadBoard` | `targetId` 를 보내면 질환의 도킹 표적과 같은지(아니면 400 `invalid_input` "도킹 준비된 표적은 X 하나예요") · 모르는/겹친 근거 400 · 가중치 틀림 400 · 근거가 있으면 그 질환 표적 8개(워커 10분 캐시)로 같은 코치를 다시 돌려 **막음이면 400 `reason_blocked`** · 주의는 받음 · 근거 없는 앞 판 요청은 그대로(`reasons = {}`). 다시 올리면 메모 · 근거 · 가중치가 함께 바뀜. board 의 picks 에 `reasons` · `weights` |
| 화면 | `apps/web/src/board/steps/s11.tsx` · `s11-viz.tsx`(새) · `s11.css` | 머리 걸음 탭 ① 질환 지도(질환군 4 × 3 타일 → 근거 열지도) ② 관계망 ③ 내 점수(가중치 슬라이더 · 빠른 설정 · 32개 누적 막대, 상위 14 밖의 ◆ 4개는 점선 아래 늘 표시) ④ 32개 한눈에(축 끊김 산점도 · 필터 · 가리키면 이름) ⑤ 카드 뒤집기(✓ 카드 뒤집으면 서랍). 탭 아래 공통 **추천 서랍**: 정보판 + 공용 `ReasonChips`(여럿) + 칩마다 코치 줄(✓ · △ · ✕) + 한 줄 이유(≤ 90자) + [모둠에 올리기] · 준비 안 된 표적이면 [X 보러 가기]. 모둠 공유: ② 작은 망 4개 + 깃발 · ③ 모둠원 가중치 · 내 점수 1위 표 · ④ 깃발 산점도 · 추천 카드(근거 · 코치 · 한 줄 이유 · 가중치) · [이 표적으로 확정](그대로) |

- 탭 · 고른 표적 · 가중치 · 필터 · 뒤집은 카드는 개인 상태(`useLocalTab('step:1.1')` · `useBenchState('s11:…')`). 한 줄 이유는 다른 질환으로 옮기면 비운다.
- 새 색은 `s11.css` 의 `--e1~--e4`(근거) · `--d1~--d4`(질환)만 — 화면에 어두운 판이 없어 어두운 값은 `:root[data-theme="dark"]` 에만 둔다. 공용 `.btn` 에 눌림 모양이 없어 필터 · 빠른 설정 토글은 `.s11 .btn[aria-pressed="true"]` 로 잉크 채움.
- 폰(≤ 860px): 그림은 판 안에서 가로로 넘기고(최소 520~560px — 글씨가 너무 작아지지 않게) 타일 2열 · 카드 2열. 390 폭에서 문서 · 본문 가로 넘침 0.

**설계와 다른 것**: 마이그레이션 번호 `0009`(인계의 '00NN' — 0019 는 같은 날 모둠 대화방이 써서 겹쳤고, 로컬 기록을 관리자 연결로 `0009` 로 옮김) · 가중치 칸은 `int[4]` 가 아니라 `real[]`(0.5 단위를 담으려고 — 0.5 단위 · 하나 이상 0 초과는 서버가 본다) · '다른 모둠이 안 고른 질환' 근거는 `board` 가 다른 모둠의 질환을 주지 않아 늘 **주의**("전광판 공개 서랍에서 확인해 보세요") — 선점 배지도 뺐다 · 찬성 · 정족수 · 회의 기록 · 모둠원 뒤집기 진행은 넣지 않음(§5.4.2).

**시험**: `npm run typecheck`(web-contract · web · 내 서버 파일 통과 — 서버 `scripts/e2e-feed.ts` 의 TS2371 은 모둠 대화방 작업 파일) · `npm test` 160 + 197 통과(새 `packages/web-contract/test/target.test.ts` 11건) · `node tools/with-local-env.mjs node apps/server/scripts/e2e-target.ts`(새) 9/9 — 표적 8개에 도킹 표적 · 엉뚱한 targetId 400 · 모르는/겹친 근거 400 · ACHE '유전' · '발현' 근거 400 `reason_blocked` · 가중치 틀림 400 · 주의만 200 · 다시 올리면 바뀜 · 앞 판 요청 200 · board picks 근거 · 가중치 · 확정 → 1.1 완료 · 1.2 열림 · `npm run e2e:parallel` 통과(1.1 추천 4장 동시 · 동시 확정 포함). 화면: Playwright 두 프로필(학생 2 · 같은 모둠)로 ① ACHE 막음 코치 → 단추 막힘 → 근거 고쳐 올리기 · ② EGFR 올리기 → 깃발 · ③ 유전만 · 32개 모두 · ④ 필터 · PTGS2 카드 뒷면 · ⑤ 당뇨 카드 뒤집기 → DPP4 서랍 · 다른 프로필이 확정 → 실시간 반영 → [다음 단계로 — 1.2] → 1.2 화면. 콘솔 오류 0. 스크린샷 `.review/2026-10-24-s11/`(1440 9장 · 390 3장).

**남은 것**: 호스팅 DB 에 0009 적용(사용자 확인 뒤 — `npm run db:dry-run:hosted` 먼저) · 다른 모둠 선점 표시(board 에 다른 모둠 질환을 줄지 결정) · 찬성 · 정족수(시안의 모둠 공유 장치 — 넣을지 사용자 결정) · 12대 질환 나머지 8종 데이터(crista 일 — §6.1.1).

## 7. 3판 통합(2026-10-24) — 기능 9종을 한 흐름으로 묶음

기능 9종(F12 · FSEL · F31 · F32 · F33 · F41 · F42 · FLEARN · FMARKET)의 구현 · 검토가 끝난 뒤, 한 학급이 1.1 부터 마감 · 최종 순위까지 API 로 끝까지 가는지 보고 접점을 맞췄다. 통합 서버 3410 · 화면 5210.

### 7.1 전체 상태

| 단계 · 기능 | 상태 | 끝까지 시험 |
| --- | --- | --- |
| 1.1 표적 · 1.2 회의 · 실행 · 찜(F12) | 열림 · 완료 조건 맞음 | `e2e:screen` 17 · `e2e:full` |
| 2.1 도킹 · 2.2 대기열 · ADMET · 특허 후보(FSEL) | 열림 | `e2e:selection` 18 · `e2e:full` |
| 3.1 물질특허(F31) | 열림 · 교사 수동 통과 경로 | `e2e:patents` 24 · `e2e:full` |
| 3.2 전임상 · 동물실험(F32) | 열림 · 게임 시계 | `e2e:preclinical` 19 · `e2e:full` |
| 3.3 제형 · IND(F33) | 열림 · 30게임 일 판정 | `e2e:ind` 16 · `e2e:full` |
| 4.1 임상 1 · 2 · 3상(F41) | 열림 · 시뮬레이션은 Claude(실패 시 교사) | `e2e:clinical` 18 · `e2e:full`(실제 Claude 1상) |
| 4.2 허가 · 허가증 · 포장 · 영수증(F42) | 열림 · 60게임 일 | `e2e:approval` 22 · `e2e:full` |
| 학습 연구비 · Series A/B(FLEARN) | 열림 · 3판 번호(A = 2.2 특허 후보 뒤, B = 3.1 특허 + 3.3 IND 승인 뒤) | `e2e:learn` 22 · `e2e:full` |
| 전광판 · 기업가치 · 마감 · 최종 순위(FMARKET) | 열림 | `e2e:market` 20 · `e2e:full` |

검사(마지막 수정 뒤): `npm run typecheck` 오류 0 · `npm test` 160 + 200 · `npm run build:web` · `db:status:local`(적용 20 · 밀림 0 — 0009 · 0019 는 같은 날 다른 작업) · `db:check:local` 통과 · `e2e:w1` 19 · `e2e:parallel` 16 · `LLM_DISABLED=1 e2e:base` 6 · 기능 e2e 9종 모두 통과 · `e2e:full` 18/18(연속 3회).

### 7.2 트랙 등록표(항체 랩과의 약속)

| 자리 | 이름 · 위치 | 하는 일 |
| --- | --- | --- |
| 규격 | `packages/web-contract/src/track.ts` — `TrackId`('drug' · 'antibody') · `TrackStep { id; group; index; title; sub }` · `TrackManifest` · `DRUG_TRACK` · `ANTIBODY_TRACK`(빈 자리) · `TRACKS` · `DEFAULT_TRACK` · `isTrackId` | 단계 줄 모양 |
| 화면 | `apps/web/src/board/registry.ts` — `StepRegistry = { track; steps; groups; render(id) → ComponentType<StepProps> \| null }` · `DRUG_REGISTRY` · `ANTIBODY_REGISTRY` · `registerStepRegistry(reg)` · `registryFor(track)` | `Board.tsx` 가 단계 목록 · 묶음 제목 · 단계 화면을 이 표에서 받는다(`<Board registry>` 로 직접 넘기거나 `board.track` 으로 고름) |
| 서버 | `apps/server/src/pipeline.ts` — `computeSteps({ track?, … })` · `TRACK_STEP_RULES` · `registerTrackSteps(track, rules)` · `StepRulesInput` | 트랙별 단계 규칙. 'drug' 만 구현, 'antibody' 는 `[]` |
| 응답 | `BoardResponse.track?`(서버는 지금 늘 'drug') | 화면이 등록표를 고른다 |

- 항체 단계 id 는 소분자 9단계와 겹치지 않게 자기 꼴을 쓴다(`StepView.id` 는 아직 `StepId` 타입 — 항체가 들어올 때 넓힌다). 전광판 소식은 FMARKET 의 `antibody_*` kind, 과정 평가는 `postProcessScore(stepId: antibody_*)`.
- 프로그램에 트랙 칸(DB)은 아직 없다 — 항체 랩이 들어올 때 마이그레이션 하나로 `programs.track` 을 더하고 `loadBoard` 의 `DEFAULT_TRACK` 을 그 값으로 바꾼다.
- 시험: `apps/server/test/track.test.ts`(3건 — 등록표 9단계 = STEP_META · antibody 0단계 · 규칙 꽂기).

### 7.3 통합에서 고친 것

1. **e2e:base** — 등기 때 FMARKET 'listing' 소식이 class_seq 1 을 먼저 차지해 '동시 4건 = 1~4' 단정이 깨졌다. 시작 번호 기준으로 셈.
2. **e2e:parallel** — 찜이 기준 약(도네페질)에 걸리면 대기열 담기가 400(기준 약 금지)이라 가끔 깨졌다. 기준 약 도킹을 뒤로 돌림.
3. **F31 ↔ FSEL** — `createApplication` 이 트랜잭션 안에서 특허 후보 행을 `for share` 로 잡는다(FSEL 의 '먼저 지우고 → 출원서 확인'과 짝 — 후보 없는 출원서 경합 완성). 포기 막음에 IND `passed` 상태를 더함. 3.1 후보 카드의 근거를 `SELECTION_COPY.leadReasonLabel` 글로.
4. **F32 ↔ F33 · F41** — '그 특허의 최신 동물실험'을 셋 모두 `finished_at desc nulls last` 로(F33 은 `updated_at`, F32 는 nulls first 였다).
5. **F12 ↔ FSEL 찜 회고** — '결합 예측 상위 n' 을 워커 후보 12개가 아니라 그 1.2 실행의 진열대(`result.snapshot.passIds`)에서 고른다(F12 서버 전용 `screenLibrary().raw`).
6. **FMARKET** — 결과 소식의 기업가치가 비면(처리기 세이브포인트 실패 · 같은 DB 를 쓰는 다른 코드 판 서버가 소식을 먼저 처리) 15초 점검이 10분 창 안에서 메운다(`backfillMoves` — 멱등 · 사옥 Tier 2 · 3 도 함께). 실제로 항체 작업 트리의 서버(3391)가 같은 로컬 DB 의 IND 승인 · 허가를 먼저 처리해 기업가치 · Tier 3 이 빠지는 것을 봤다.
7. **화면** — `.bd-body` 에 `position: relative`: 본문 안 `.sr`(화면 낭독기 글)이 문서 기준으로 놓여 문서가 2,252px 로 늘어나고 `scrollIntoView` 때 위 띠가 밀려 올라갔다. 4.1 결과표 p 값 0 → `p < 0.001`.
8. **e2e:full(새)** — `apps/server/scripts/e2e-full.ts` · `npm run e2e:full`. 교사 1 · 학생 4 · 2모둠: A(ACHE) 1.1 → 4.2 허가 · B(DPP4) 1.1 → 3.1, Series A · B, 마감 · 최종 순위(A 1위 · B 2위), 단계마다 9단계 상태 · 기업가치(결과 소식 7종 · 과정 평가 9단계) · 공개 범위. `E2E_FULL_LLM=1` 이면 1상 시뮬레이션만 실제 Claude(보류가 나오면 같은 프로토콜로 재도전 — 교사 수동), `E2E_FULL_STOP=approval` 은 화면 점검용(마감 전 멈춤 · 로그인 JSON).

### 7.4 실제 Claude

`E2E_FULL_LLM=1` 로 2회 돌렸고 4.1 1상 시뮬레이션 호출이 2번(각 약 23초 · `claude-opus-5-5`) — 둘 다 서버 검사를 통과해 저장됐고 판정은 **보류(safety)**: IND 조합의 예상 S 44.5 가 1상 기준 50 보다 낮았다(승인서 화면도 "5.5 모자라요"). 입력 해시가 실행마다 달라(새 학급 · 새 분자 id) 캐시는 맞지 않았다. 그 밖의 반복은 모두 LLM 을 끄고 했다(통합 서버 `LLM_DISABLED=1`).

### 7.5 남은 위험

- **같은 로컬 DB 를 쓰는 서버가 여럿**(3390 · 3412 · 항체 작업 트리 3391 …) — 시계 처리기(IND · 임상 · 허가 판정 · 과정 평가)는 먼저 도는 서버의 코드로 처리된다. 코드 판이 다르면 결과가 달라진다(이번에 본 기업가치 · Tier 빠짐은 7.3-6 이 메움). 항체 랩은 별도 DB(또는 트랙별로 처리기를 거르는 규칙)를 쓰는 것이 안전하다 — **사용자 결정**.
- **e2e 가 교사 수동 판정에 기대는 곳** — 서류 심사(3.1 · 3.2 · 3.3 · 4.2) · 임상 2 · 3상 · Series A/B 정성 몫. LLM 을 켠 상태의 끝까지 흐름은 1상만 확인했다. LLM 을 끄면 Series 정성 몫이 교사 정정 전까지 pending 이라 '투자 유치' 소식도 그때 나간다(설계 '즉시 공시'와 다름 — FLEARN 결정 유지).
- ~~**교사 화면이 API 뿐인 곳** — 서류 심사 목록 · 수동 판정, 임상 시뮬레이션 판정, 학습 정정 · 이의, 3.2 학급 합계.~~ → §8 교사 화면에서 채웠어요.
- **IND 조합 고르기 안내** — 3.3 규칙은 S ≥ 35 만 보고 1상 기준은 50 이라, 서류 통과한 조합도 1상에서 안전 보류가 날 수 있다(실제 Claude 가 그렇게 판정). 3.3 화면에 '1상 기준까지 n 모자라요'는 이미 있다 — 규칙으로 막을지는 설계 결정.
- **`StepView.id` 타입** — 항체 단계가 들어오면 `StepId` 를 넓히거나 트랙별 뷰 타입이 필요하다.
- **로컬 DB 에 시험 기록** — e2e · 화면 점검 학급(`통합 점검 <접미>`, 계정 `tf<접미>` · `f<접미>a0` …)이 남았다.

### 7.6 사용자 확인이 필요한 것

- **호스팅 DB 적용** — 0009 · 0010 · 0012 ~ 0019 는 로컬에만 있다. `npm run db:dry-run:hosted` 로 먼저 본 뒤 적용(AGENTS.md).
- **배포** — Railway 서비스 갱신(호스팅 적용 뒤) · `ANTHROPIC_API_KEY` · `WEB_ALLOWED_ORIGINS`.
- **비용** — 실제 Claude 를 쓰는 곳: 서류 심사 4종(특허 · IACUC · IND · NDA) · 임상 시뮬레이션(상마다 1회, 실패 시 1회 더) · 학습 채점 · Series 피치 · 전광판 헤드라인(학급 하루 40). 한 모둠이 끝까지 가면 대략 서류 4 ~ 8회 + 임상 3 ~ 6회 + 헤드라인 십여 회.
- **항체 랩 DB 분리** — 7.5 첫 줄.

스크린샷: `.review/2026-10-24-integration/`(1440 — 단계 9개 · 4.1 결과 그래프 · 4.2 완주 · 포장 · 영수증 · 최종 순위 / 390 — 1.2 · 3.3 · 4.1 결과 · 4.2 허가증 · 영수증 · 최종 순위). 390 폭에서 9단계 모두 문서 · 본문 가로 넘침 0(위 띠 오른쪽 칩 줄은 띠 안에서만 옆으로 넘어간다 — 설계대로).

## 8. 교사 화면(2026-10-24) — 설계 §9 · 학습 연구비 §5 교사 화면 · 각 기능의 '교사 화면은 API 만'

| 무엇 | 어떻게 |
| --- | --- |
| 틀 | `apps/web/src/screens/Teacher.tsx` + `apps/web/src/teacher/`. 학생 ③ 화면과 같은 '둥근 섬'(위 띠 · 전광판 01 LED 띠 · 사이드바 섬 4묶음 칸 · 머리 섬 · 본문 섬, 폰 ≤ 860 은 가로 칩 → 머리 → 본문). 고른 칸은 브라우저 로컬(useLocalTab) |
| ① 시계 | 머리 섬 오른쪽에 늘 — `D+n` · 흐름/멈춤 · [일시정지]/[다시 흐르기] · 배율 ×0.5~×30 + 직접(0.1~60) · '동물실험 28일 ≈ n분'. 학급 WS `clock` 으로 바로 고침 |
| ② ⑨ 마감 · 프로젝터 | FMARKET `TeacherMarket` 을 '전광판 · 마감' 칸에(띠는 위에 하나만 — 칸 안 띠는 CSS 로 숨김), 위 띠 [프로젝터 보기] = `Projector`(export 만 더함) |
| ③ 서류 심사 | 대기 · 플래그 · 선생님 판정 / 최근 판정까지(정정) — 모둠 · 규칙 검사 · AI 칸별 지적 · 심사한 판의 칸 본문 · 판정 메모(1~300자) · 정정 확인. 원래 판정(AI)이 있으면 칩으로 |
| ④ 임상 | 진행 중 · 판정 대기 / 모든 시도 — AI · 선생님 결과와 **game-rules 참고 판정**(통과 확률 막대 · 근거 · 어긋남 경고 · AI 원본) 나란히, [다시 시뮬레이션] · 직접 판정(통과 · 보류 + 종류) · AI 결과가 있으면 공개 전 정정(override) |
| ⑤ 학습 연구비 | 모둠 현황(ρ · s · m · 보호권 · 받은 돈 · Series A/B) · 학생 × 단계(문항 수 · 평균 · 가동 · [면제]) · 이의 제기(받아들이고 점수 고치기 · 기각) · 채점 기록(점수 정정) |
| ⑥ 3.2 동물 수 | 학급 합계(쓴 수 · 줄인 수 · 대체 시험 · 인도적 종료) · 모둠별 막대 · 윤리 토론 질문 3 |
| ⑦ AI 사용량 | 오늘 호출 / 하루 상한 · 토큰 · 거절 · 실패 · 쓰임별 막대 |
| ⑧ 모둠 진행 | **새 경로** `GET /api/teacher/classes/:classId/progress`(`features/teacher.ts` · 규격 `teacher.ts` `TeacherProgressResponse`) — 모둠마다 9단계(학생 사이드바와 같은 `computeSteps`) · 지금 단계 · 막힌 이유(보류 · 연구비 부족 + 선생님 대기: 심사 · 임상 판정 · 이의, 건수) · 연구 노트 · 연구비 · 마지막 활동. 사이드바 칸 건수 · 위 띠 '선생님 확인 대기 n건'도 이 값 |
| 알림 | 교사 WS `teacher.alert` → 사이드바 '새 알림'(누르면 그 칸) · 각 칸 목록 다시 읽기. 교사는 모둠 채널을 받지 않아서 목록은 20초(임상 15초)마다도 다시 읽음(화면이 보일 때만) |

**서버에 더한 것(최소)**: `reviews.ts` 교사 심사 목록에 `teamId` · `originalVerdict` · 칸 스냅숏 · 체크리스트(`TeacherReviewView`) · `?all=1`(최근 판정 건까지 — AI 가 정한 판정도 정정) · `guard.ts` `UUID_RE` + `requireTeacherOf` 꼴 검사 · `clock.ts` 시계 경로 · 심사 · 임상 교사 경로의 꼴 틀린 id → 404(전에는 DB 형 변환 오류 500) · `pipeline.ts` `stepFacts` export · `routes.ts` `registerTeacher` · **학습 이의 처리 경합 고침**(`learn.ts` — 같은 이의를 교사가 두 번 처리하면 둘 다 200 이고 정정이 두 번 쌓였다. 이의 행을 닫는 update 가 0행이면 409 로 정정까지 되돌림).

**권한 확인**: 교사 경로는 모두 `requireTeacherOf`(그 학급 교사만) — 남의 학급은 **404**(설계상 '있는지조차 알리지 않음'), 학생은 403, 시계 보기는 그 학급 학생도 200(바꾸기 403).

**시험**: `npm run e2e:teacher`(새 · `apps/server/scripts/e2e-teacher.ts` · `WEB_PORT=3426` · LLM 꺼짐) 20/20 — 교사 경로 11개 200 · 다른 학급 교사 읽기 11 · 쓰기 11 모두 막힘(아무것도 안 바뀜) · 학생 403 · 꼴 틀린 id 10건 404 · 시계 일시정지 · 배율 4번 동시 · WS · 진행(9단계 · 노트 · 등기 전 모둠) · 심사 대기 목록 · 동시 판정 4번 → 1번 · 정정 · `?all=1` · 끼워 넣기 답 → 교사 A 만 알림 · 이의 → 알림 · 면제 · 이의 동시 2번 → 1번 · 마감 · 다시 열기 · 임상 · 3.2 · AI 사용량. `npm run typecheck` 0 · `npm test` 170 + 207 · 웹 번들(scratch outDir) · `e2e:learn` 다시 통과(첫 회는 연결 상한 500 두 건). 스크린샷 `.review/2026-10-24-teacher/`(1440 — 진행 · 심사 · 임상 · 학습 3 · 3.2 · 전광판 · 최종 순위 미리보기 · 프로젝터 · AI 사용량 · 학급 / 390 — 진행 2 · 심사 · 임상 · 이의, 문서 · 본문 가로 넘침 0). 화면에서 판정 저장 · 이의 받아들임 · 시계 멈춤/배율/다시 흐르기를 눌러 확인했어요.

**남은 것**: 서류 심사의 '이의 제기'는 학생 쪽 경로가 없어요(`learn_appeals.target_type = 'doc_review'` 칸만 있음 — 학생은 답 · 노트 · 피치만 이의를 냄). 교사는 정정으로 처리해요 · 학생 비밀번호 재설정 · 스타트업 이름 고치기(설계 §9)는 아직 · 학급 `max_patents_per_team` 바꾸는 칸 없음 · 같은 로컬 DB 연결 상한(30) 때문에 화면이 가끔 '서버 오류'(다시 읽기 · 20초 주기로 풀림).

## 9. 교사 승인 폐지 · 숙고 기간 · 수업 시간 맞춤(2026-10-24 — 설계 §5.11.1)

사용자 지시: "학생이 신약개발하는 pipeline 에서 교사 승인은 없애라. LLM이 적절히 처리하게 해. 바로 처리하지는 말고 뜸을 좀 들여. … 하루에 1시간 수업을 두 번 나눠서 하거나, 100분 수업을 하는 것도 고려해서 적당히."

| 무엇 | 바뀐 것 |
| --- | --- |
| 서류 심사 4종(`reviews.ts`) | AI 거절 → 규칙 자동 보완 · 키 없음 · 꺼짐 · 하루 상한 · 다시 부를 수 없는 오류 · 5번 실패 → 규칙 자동 판정(`autoReviewOutput` — 체크리스트 칸 20자 이상이면 통과). `llm_status 'auto'` · 화면 단계 `auto`. 교사 '직접 판정해 주세요' 알림을 뺐다(끼워 넣기 플래그 알림은 남김). 옛 거절 · 시도 소진 줄은 재시도 루프가 자동 판정으로 넘긴다 |
| 숙고 기간 | AI · 캐시 · 자동 판정은 `held_verdict` 에 담고 접수 게임 일 + `DOC_REVIEW_GAME_DAYS`(20)에 `onGameDay('reviews')` → `releaseDue` 가 공개하며 처리기를 부른다. 숙고 중 학생 보기는 판정 · 지적 · 플래그를 감추고 `stage 'deliberating'` · `releaseGameDay` 만 보인다. 교사 목록은 플래그를 본다. 규칙 fail · 사전 필터는 바로 |
| 4.1 임상(`clinical.ts`) | 시뮬레이션을 끝내 못 쓰면 `ruleFallback` — 시작 때 저장한 game-rules 판정(`ruleVerdictOf`) + `ruleSimulate` 표, `result_source 'rule'`. `sim_status 'manual'`(교사 대기)로 가지 않는다. 끝나는 날 결과가 없을 때의 교사 알림도 뺐다. 교사 임상 목록에 공개 전 `resultSource` · `resultModel` 을 싣는다(전엔 빠져 있었다) |
| 교사 진행(`features/teacher.ts`) | 심사 중 · 임상 결과 정리 중은 `teacher: false`(자동 공개). 교사 몫은 학습 이의 제기만 |
| 시계 | 기본 배율 2 → 12(`CLOCK_RATE_DEFAULT` · 0040 DB default — 새 학급부터). 교사 시계 칸 배율 단추 ×1 · 2 · 5 · 12 · 20 · 30 + '서류 심사 숙고 · 동물실험 · IND · 임상 1~3상 ≈ n분' |
| 문구 | `DOC_REVIEW_COPY`(읽는 중 · 'D+n에 결과가 나와요' · 규칙 자동 판정) · 특허 `reviewStage` · IND · 3.2 · 4.2 대기 문구에서 '선생님 확인'을 뺐다 · 임상 `ruleMade` · `ruleNote` |
| DB | `0040_auto_judge.sql`(0020~0039 는 항체 랩 예약) — 로컬 적용함 · 호스팅 미적용 |
| 임상 기간 절반(같은 날 이어서 — "임상 1상/2상/3상 절반씩으로 줄여라") | `PHASE_RULES` 기간 90 / 180 / 360 → 45 / 90 / 180 · 기본 모집 60 / 120 / 150 → 30 / 60 / 75 게임 일 · 모집 투자 하루 비용 두 배(총비용 그대로). ×12 에서 1상 ≈ 5분 · 2상 ≈ 10분 30초 · 3상 ≈ 19분, 3.1 ~ 4.2 합 약 51분. crista 규칙(`PIPELINE_RULES.durationDays`)은 그대로 두고 시험이 '절반'을 확인한다. 상 비용 · 목표 인원 · 1차 평가 주(시뮬레이션 안 시간)는 그대로 |

**시험**: `npm run typecheck` 0 · `npm test` 170 + 228(자동 판정 4 · 임상 규칙 판정 2 더함) · `e2e:base`(실제 Claude 1건 — 담기 → 숙고 → 공개 · 캐시도 숙고 뒤 공개 · LLM 꺼짐 자동 판정 · 숙고 중 교사 먼저 판정) · LLM 끈 서버로 `e2e:clinical`(⑤ 규칙 결과 · 끝나는 날까지 숨김 · ⑥ 교사 정정은 선택 · 경합) · `e2e:teacher` 20/20 · `e2e:patents` 24/24 · `e2e:preclinical` 19/19 · `e2e:ind` · `e2e:approval` 모두 통과. `e2e:full`(실제 Claude 전 구간)은 돌리지 않았다.

## 10. 마무리 점검(2026-10-24) — 문구 반영 · 교사 화면 · 점검 수리 · 실제 Claude 흐름

문구 반영(§5.12 초안 → 규격 COPY) · 교사 화면(§8) · 보안 · 돈 · LLM 점검과 수리 · 교사 승인 폐지(§9) 뒤의 최종 검증이에요. 검증 서버 3450(LLM 꺼짐) · 화면 5250. 검증 중에 §9 작업(0040 · `reviews.ts` · `clinical.ts`)이 같은 작업 트리에 들어와서, 검사는 그 뒤 코드로 한 번 더 돌렸어요(아래 표는 두 번째 결과).

### 10.1 이번 묶음에서 들어온 것

| 묶음 | 요약 |
| --- | --- |
| 문구 1.2 | `SCREEN_COPY` 초안 427키 · 409 문구 `err.*` · 화면에 박힌 글 `ui.*` · 돈은 `money()` · '이 단계에서 하는 일' 판 · 안건 '무엇인가 · 왜 거르나' |
| 문구 2.1 · 2.2 · 3.1 | `SELECTION_COPY` · `PATENT_COPY` · `{gap}` 은 늘 양수(`within10OkStronger`) · `fillPatentCopy` · 시험 `copy-currency.test.ts` · `patent-v2` |
| 문구 3.2 · 3.3 | 윤리 카드 풀이 · 확인 문제 풀이 · 숫자는 상수로 · `iacuc-v2` · `ind-v2` · 4종 도구 '읽는 법 · 배울 점' |
| 문구 4.1 · 4.2 · 심사관 | `CLINICAL_COPY.ui` · `josa()` · 영수증 제목 '연구비 영수증' · 서류별 심사관 단락(`REVIEWER_TALK_*`) · `patent-v3` · `iacuc-v3` · `ind-v3` · `nda-v2` · `clinical-sim-v3` |
| 문구 학습 · 전광판 | `LEARN_COPY` · `MARKET_COPY` · `learn-v3` · `headline-v2`(AI 헤드라인에 `$` · 달러 · USD · CRISTA 가 있으면 버림) · 항체 기업가치 `antibodyBand` |
| 교사 화면 | §8 |
| 점검 · 수리 | 점검 11건 중 6건 고침 — LLM 거절이 파싱 예외로 'invalid' 가 되던 것(`create` + 직접 파싱) · 서류 심사 pass 를 서버가 강제(모든 항목 ok · 플래그 없음) · 임상 통과의 안전 상한(5등급 · SAE · `clinical-sim-v4`) · 힌트 70% 상한 소급 · 학생 글의 SMILES 를 프롬프트에서 `[구조식]` 으로 가림 · WS 학급 바뀜(`refreshUser` 가 `peer.classId` 갱신). 남긴 것은 10.6 · 10.7 |

### 10.2 검사(마지막 코드 기준)

| 명령 | 결과 |
| --- | --- |
| `npm run typecheck` | 오류 0 |
| `npm test` | web-contract 170/170 · server 228/228 |
| `npm run build:web` | 통과(`apps/web/dist/crista`) |
| `npm run db:status:local` | 적용 21 · 밀림 0 · `0040_auto_judge` 적용됨. '0020 — DB 에는 있고 파일이 없음'은 항체 랩(`crista-web-antibody`)의 `0020_antibody_lab.sql` 이 같은 로컬 DB 에 적용된 것 |
| `npm run db:check:local` | 경계 점검 7개 모두 통과(`public` · `auth` · `supabase_migrations` 막힘 · 3판 표 29개 `web` 에만) |
| e2e(LLM 꺼짐 · 3450) | `w1` 19 · `parallel` 16 · `base` 7 · `screen` 17 · `selection` 18 · `patents` 24 · `preclinical` 19 · `ind` 16 · `clinical` 17 · `approval` 22 · `learn` 23 · `market` 20 · `feed` 13 · `teacher` 20 · `full` 18/18 — 모두 통과 |

`e2e:full` 은 §9 뒤 처음에 1상에서 실패했어요(LLM 꺼짐이면 서버가 규칙 결과를 바로 담는데, 시험 분자 ΔG −9.7 은 어떤 제형 · 용량도 1 · 2 · 3상 기준을 모두 넘지 못함 — 10.6). 시험이 공개 전에 교사 정정(override)으로 통과시키게 고쳤어요(10.4).

### 10.3 실제 Claude 흐름(`E2E_FULL_LLM=all` · `claude-opus-5-5` · effort medium)

서버(3450)는 LLM 을 끈 채 두고, 시험 프로세스 안의 `LlmClient` 로 서류 심사 · 임상 시뮬레이션만 불렀어요(헤드라인 · 학습 채점은 이 프로세스에서 부르지 않음). 비용 상한 40회 안에서 5번 돌렸어요.

| 회차(접미) | 실제 Claude 로 본 것 | 결과 |
| --- | --- | --- |
| 1(65721) | 특허 A · B · 동물실험계획서 · IND 심사, 1상(경구 50 mg · S 44.5) | 서류 4건 모두 **보완** → 교사 정정으로 통과 · 1상 **보류(safety)** 3번(같은 프로토콜) → 멈춤 |
| 2(87302) | 같은 서류 4건, 1상(경구 10 mg · S 81.5) · 2상 | 서류 4건 보완 · 1상 **통과** · 2상 **보류(efficacy)** 3번(E 37.8 < 40) → 멈춤 |
| 3(b43a0) | 특허 A | 다른 세션이 0040 을 적용하기 직전이라 `held_verdict` 칸이 없어 결과를 쓰지 못함(1회 낭비) |
| 4(ec5dc) | 3상 | LLM 끈 서버의 규칙 결과가 실제 결과보다 먼저 담겨 실제 결과를 버림(1회 낭비 — 시험이 규칙 결과를 기다린 뒤 비우고 부르게 고침) |
| 5(83441) | 3상 | **보류(efficacy)** — 재도전은 3상 비용(6,000,000 크리스타)이 모자라 402. 허가 서류(NDA)는 닿지 못함 |

- **호출 수 · 토큰(5회 합 · `llm_calls`)**: 서류 심사 9회(입력 10,725 · 출력 12,789 · 캐시 읽기 21,662 · 평균 14.0초 · 최장 17.3초) · 임상 시뮬레이션 9회(입력 13,143 · 출력 28,347 · 캐시 읽기 52,521 · 평균 29.1초 · 최장 33.3초) · **헤드라인 18회**(같은 DB 의 LLM 켠 개발 서버 3390 이 이 학급 소식을 다듬음 · 평균 3.9초). 합 36회. 모두 `end_turn`, **거절 0** · 스키마 실패 0 · 서버 검사 실패 0.
- **판정 품질**: 서류 보완 지적은 모두 사실과 맞았어요 — 시험 글이 '원본보다 ΔG 가 깊다'고 썼지만 실제로는 덜 음수(특허 `effect_matches_facts` inconsistent), 대체 시험을 하지 않았는데 했다고 씀(계획서 `c_replacement`), 동물실험 해석 한 줄 · 동의서에 목적 없음(IND). 말투는 해요체 · 「칸 이름」 · 쉬운 풀이 괄호, 돈 · `$` 없음. 임상 판정 5종은 모두 game-rules 참고 판정과 같은 방향(1상 S < 50 보류 · S 81.5 통과 · 2상 E 37.8 + 흔들림 < 40 보류 · 3상 E < 45 보류)이고 어긋남 경고 0. 해설은 CI · p 값 · DLT 를 괄호로 풀어 씀.
- **아직 실제 Claude 로 못 본 것**: 4.2 허가 서류(NDA) 심사 · 3상 통과 경로 · 실제 통과(pass) 판정의 서류 심사. 시험 분자로는 실제 판정만으로 끝까지 갈 수 없어서예요(10.6).
- 기록: `.review/2026-10-24-final/llm-full-run1.log` · `llm-full-run2.log` · `llm-full-run4.log` · `llm-full.log`(5회차).

### 10.4 마무리에서 고친 것

- **`apps/server/scripts/e2e-full.ts`**(통합 시험)
  - `E2E_FULL_LLM=all` — 서류 심사(특허 2 · 계획서 · IND · NDA)와 임상 상마다 첫 시도를 이 프로세스의 실제 Claude 로. 판정 처리기(`patents` · `preclinical` · `ind` · `approval`)를 프로세스 안에 등록하고, 헤드라인 · 채점은 막은 `LlmClient` 를 써요. 보완이면 지적을 찍고 교사 정정으로 넘겨요. 끝에 이 학급 `llm_calls`(호출 · 토큰 · 지연 · stop · 거절)를 찍어요.
  - `E2E_FULL_LLM_ONLY=nda,phase3` 처럼 실제 Claude 를 쓸 곳만 고르기 · `LLM_DAILY_PER_CLASS` 로 학급 호출 상한.
  - §9 대응: 서버가 담은 규칙 자동 판정(`auto`) · 규칙 임상 결과(`rule`)를 비우고 실제 Claude 로 다시 부름 · 숙고 기간은 시계를 넘기고 `releaseDue` 로 공개 · LLM 끈 흐름의 임상은 공개 전 교사 판정(결과가 있으면 override).
  - 실제 Claude 모드의 3.3 조합은 1상 안전 기준(S 50)을 넘는 것 중 효능이 가장 높은 것, 보류 뒤에는 보류 종류에 맞는 '용량 · 제형 바꾸기' 조합(이 상에 머무는 것만)을 고름.
- **`docs/2026-10-23-learning-grant-design.md` · `learning-grant-balance.md`**: 2판 번호를 3판으로 — '3.2 IND' → '3.3 IND', '2.2 ADMET 예측 · 리드 지정' → '2.2 ADMET 예측 · 특허 후보', `3.1`~`3.2` → `3.1`~`3.3`, `1.1`~`3.2` → `1.1`~`3.3`, 8단계 → 9단계. 균형안 표 아래에 '합계는 아직 2판(8단계) 기준' 한 줄.
- 화폐 점검(읽기 · `rg`): `apps/` · `packages/web-contract/` 의 학생 · 교사 화면 · 알림 · 소식 · LLM 프롬프트 글에 `$` 금액 · 달러 · USD · 원 · 영문 단위 CRISTA 없음. 'CRISTA' 는 워드마크(Landing · Board · Enroll · Teacher · Login)와 가이드북 출처 줄('CRISTA 교사 연수 자료' — 브랜드)뿐. `$0.050M` 꼴은 주석 · 시험 제목뿐. 숫자 뒤에 '크리스타'를 직접 붙인 곳은 `formatCrista` · `formatPrice` 안뿐. DB 의 AI 헤드라인 69줄 · 서류 심사 출력 21건에도 위반 없음. 단, 로컬 DB 의 옛 소식 145줄(규칙 헤드라인 — 10-23 17시대 학급)에는 '상장가 $10.00' · '13,500,000 CRISTA' 가 저장된 채 남아 있어요(새 학급은 해당 없음).

### 10.5 스크린샷

`.review/2026-10-24-final/` — 1440 · 390 각각 1.2(브리핑 · 회의) · 2.1(수심계) · 3.1(심사) · 3.3(실험실) · 4.1 결과 · 4.2 포장 · 4.2 허가증 · 영수증 · 전광판 · 최종 순위 · 교사(진행 · 서류 심사 · 임상 · 전광판 · AI 사용량), 그리고 실제 Claude 3상 보류 결과(`*-s41-result-llm-phase3.png`). LLM 끈 `e2e:full`(e16c2) 학급 · 모둠 A 학생 · 교사로 찍음(`shoot.mjs`). 30장 모두 문서 가로 넘침 0(390 위 띠 칩 줄 · LED 띠는 띠 안에서만 넘어감 — 설계대로).

### 10.6 남은 위험

- **같은 로컬 DB 의 LLM 켠 서버가 시험 학급에도 Claude 를 씀** — 3390(개발 서버 · watch)이 시계 틱으로 처리한 소식의 헤드라인을 다듬어요. LLM 을 끈 시험(3450)만 돌려도 이번에 시험 학급 헤드라인 34회(실제 흐름 18 + LLM 끈 `e2e:full` 4회 16)가 나갔어요. 시험 서버를 LLM 끈 채 띄워도 비용이 나요 — 개발 서버도 `LLM_DISABLED=1` 로 두거나, 헤드라인을 그 소식을 만든 서버에서만 다듬게 하는 것이 안전해요.
- **LLM 꺼짐 자동 판정과 실제 Claude 의 차이가 커요** — 이번 실제 심사 9건은 모두 보완(통과 조건이 '모든 항목 ok · 플래그 없음'으로 엄격해짐)인데, §9 의 규칙 자동 판정은 체크리스트 칸이 20자 이상이면 통과예요. AI 가 막히면 대부분 통과하고, 켜져 있으면 첫 글은 대부분 보완이에요.
- **시험 분자(ACHE 변형체 ΔG −9.7)는 실제 판정으로는 허가까지 못 가요** — IND 조합 격자(10 · 50 · 100 mg × 경구 · 정맥 · 경피) 중 1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 · S ≥ 55 를 함께 넘는 칸이 없고, 3상 재도전은 연구비가 모자라요. 학생 모둠도 같은 일을 겪을 수 있어요 — 3.3 화면이 '이 조합으로는 3상 기준까지 n 모자라요'를 미리 보여 줄지, 백업 후보로 가게 할지 설계 결정이에요. `e2e:full` 은 그래서 LLM 끈 흐름에서 교사 정정으로 통과시켜요.
- **실제 Claude 로 아직 못 본 것** — NDA 심사 · 서류 심사 통과 판정 · 3상 통과.
- **다른 세션이 같은 작업 트리를 바꾸는 중** — 검증 중에 §9(0040 · 교사 승인 폐지 · 임상 기간 절반)가 들어왔어요. 이 절의 결과는 그 코드 기준이지만, 그 뒤 바뀐 것은 보지 못했어요.
- **로그에 보인 것(그대로 둠)**: `[feed] 행적 기록 실패(preclinical:calc): deadlock detected`(3.2 계산 칸 저장마다 — 기록만 빠지고 저장은 됨) · pg `client.query() when the client is already executing a query` 경고(한 연결에서 겹친 쿼리) · `[signup] GoTrue 사용자 되돌리기 실패`(시험의 가입 실패 경로).
- **점검에서 남긴 낮음 5건** — 세션이 지워져도(비밀번호 재설정 · 만료) 열린 WS 가 계속 받음 · 학습 음수 정정이 잔액 확인 · teams 잠금 없이 원장에 들어감 · 공개 '과정' 소식의 변동률로 다른 모둠 단계 점수를 ±1점으로 역산 · pending 임상의 어긋남 알림 문구(§9 뒤 흐름에서 다시 볼 것) · LLM 임대 시간(심사 5분 · 임상 15분)이 최악 호출 시간보다 짧음.
- **DB 연결 상한 30** — 이번 검증에서는 500 이 없었지만, 서버 여럿이 각 10개 풀을 열면 여전히 닿을 수 있어요.
- **로컬 DB 에 남은 시험 기록** — 학급 `통합 점검 54cd1 · 65721 · 87302 · b43a0 · 8750f · 43e00 · e16c2 · ec5dc · 83441` 과 각 e2e 접미 학급 · 계정.

### 10.7 사용자 결정이 필요한 것

1. **학급 코드 없이 열린 학급에 들어가기**(점검 medium · 남김) — 코드로 가입하는 방식으로 되돌릴지(`enroll` 이 코드를 받고 `open-classes` 를 없앰), 목록 방식을 유지하고 설계 §2 와 '코드 다시 만들기'의 뜻을 고칠지.
2. **개발 서버의 LLM** — 3390 을 `LLM_DISABLED=1` 로 둘지, 헤드라인을 소식을 만든 서버에서만 다듬게 고칠지(10.6 첫 줄).
3. **서류 심사 엄격도 · 자동 판정 기준** — 'unclear 하나라도 있으면 보완'을 유지할지, 자동 판정(20자 이상 통과)과의 차이를 줄일지.
4. **약한 분자의 임상 길** — 모든 상을 넘는 조합이 없을 때 3.3 에서 미리 알릴지 · 백업 후보로 안내할지 · 규칙을 둘지.
5. **균형안 합계** — 9단계(3.2 전임상 포함)로 다시 셈할지(`learning-grant-balance.md` 합계 · '8단계 총' 줄).
6. **앞 묶음에서 열린 것** — 농축도를 기업가치 과정 점수에 쓴다는 것을 학생에게 알릴지(1.2) · `brief.dur.link` 의 Ro5 · 1.2 전용 연구 노트 3칸 · 기준 약 문구(새 8개 표적의 기준 리간드가 승인약이 아닐 때) · 임상 판정도 AI 가 정한다는 안내(6.6-1) · 허가증 영문 표기 · 기관 이름(6.7-1 · 2) · 학습 채점에 공통 심사관 줄을 쓸지(6.10-3) · `changeHint` 0 인 항체 소식을 결과 점수에 셀지 · tone 'bad' 의 `changeHint` 해석 · s41-charts 남은 그림 문구를 COPY 로 옮길지.
7. **호스팅** — 0009 · 0010 · 0012 ~ 0019 · 0040 호스팅 적용(`db:dry-run:hosted` 먼저) · 배포.

## 11. 설명 덩어리 · 배지 삭제(2026-10-24 — 사용자 지시 "이런 거 모든 페이지에 대해서 지워버려. AI Slop 임")

저분자 랩 9단계 + 학습 · 전광판 화면에서 단계 설명 덩어리와 결과의 출처 · 성격 배지를 지웠다. 사용자 결정: 3.3 '이 단계에서 하는 일'도 예외 없이 지움 · 출처 · 성격 배지는 짧은 칩도 남기지 않음 · 순위 이름은 '기업가치 순위'. 서버 응답 · DB 의 출처 · 근사 · 모델 기록 칸(`evidence` · `source` · `aiHeadline` · `resultSource` · `model` 등)은 그대로 두고 화면에서만 그리지 않는다.

### 11.1 지운 것

- **머리 섬**(`steps/common.tsx`): '단계 소개' 펼침 전체 — 질문(명조) · '실제 산업에서는 —' · 눈썹 줄(묶음 · 도구 · 비용) · 결과 성격 칩(`EVIDENCE_LABEL` 자료 조회 · 실제 계산 · AI 예측 · 교육용 모의 판정) · '완료 조건 ·' 칩 · `headExtra`. `STEP_COPY` · `StepPreview` · `locked.tsx`(쓰이지 않던 잠긴 단계 안내 — '무엇을 배우나') · `StepLayout` 의 `question` · `doneWhen` · `headExtra` prop · 각 COPY 의 `question` · `stepQuestion` · `doneWhen` · `doneWhenLong` 을 지웠다. 머리 섬은 번호 · 제목 · fixture 경고 칩 · 걸음 탭 · 잠김/막힘 이유만.
- **배지 부품**: `PreShakeBadge`('흔들림 전 예상치') · `SourceChip`(실제 계산 · Vina / AI 예측 · ADMET-AI / 테스트용 고정 결과) · 학생 화면의 `AiBadge`(3.1 · 3.2 · 3.3 · 4.2 심사 결과) · 4.1 'AI 시뮬레이션 · 교육용' · '선생님 판정 · 규칙으로 만든 표' · '규칙 판정 · …' 꼬리표 · 학습 'AI 채점' · '선생님이 고친 점수' 칩 · 전광판 LED · 공개 서랍의 'AI' 꼬리표 · 4.2 허가증 · NDA 요약 줄의 '증거 단계' 꼬리표(화면 · 내려받는 허가증 그림 모두) · 사이드바 보조 줄의 '교육용 모의 판정'(3.2 '윤리 심의' · 3.3 '서류 심사' · 4.1 '프로토콜 · 모집').
- **성격 · 출처 문장**: 2.2 `preShake` · `aiNote`('참고 · AI 예측') · 3.1 `aiReview` · `llmNote` · 3.2 `aiNotice` · 3.3 `preShake` · `peakConcept` · 4.1 `aiNotice` · `verdictNote` · `teacherNote` · `ruleNote` · `simTiming` · `scaleNote` · `gameNote` · 4.2 `submit.aiNotice` · `evidenceNote` · 1.2 `scoreboard.note` · `shop.adviceNote` · 2.1 `cardsNote`. 심사 결과 머리 'AI 심사관의 칸별 지적 · 종합 피드백' → '심사관의 …', 4.1 'AI 분석 · AI 권고' → '판정 풀이 · 다음에 할 일'(출처와 무관하게 한 이름).
- **'이 단계에서 하는 일' 판**: 1.2 `Overview`(`SCREEN_COPY.overview`) · 3.3 `Overview`(`IND_COPY.overview`) · 4.1 잠긴 화면의 `oneLine` · '무엇을 배우나 — 세 관문'.
- **설명 문단**: 1.2 도구 소개(`lab.intro` · `map.intro` · `judge.intro`) · `hand.notesNote` · `hand.sendNote` · 2.1 `edit.smilesGuide` · `edit.compare` · 2.2 `lightsNote` · `tripNote` · `chainNote` · 3.1 고르기 화면 `cardGuide` · 출원 칸 상한 풀이(`limit.guide` · `whyHead` · `why` 6줄 · `classSetting`) · `codeHead` · `ui.docIntro` · `ledgerNote` · `disclosureNote` · `boardNote` · 3.2 `calc.intro` · `settingsHint` · `altNote` · `savedHint` · `runInfo` · `privacy` · 4.2 `brand.whyChange` · `pack.whyMatchForm` · `pack.previewCaption` · `nda.termNda` · `nda.realWorldCompare` · `result.termApproval` · `receipt.lesson` · 학습 `drawerLede` · `itemsSub` · `pitchLede` · `tierHow`(쓰이지 않던 키) · 공개 서랍 `scope`(공개 범위 안내).
- **무료 · 횟수 안내**: 2.1 `edit.preview` · `previewLimit` · `redockCost` · 3.1 `feeNote` · 3.2 `reviewFree` · 3.3 `reviewLimit` · 섬 제목의 '· 무료' · '(나만 보여요 · 무료)' · 1.2 실행 미리보기 · 읽음 표시 문장의 설명 꼬리 · 3.3 `rulesHint` · `reviseHint` 의 '돈 · 횟수 들지 않음' · '다음 단계로' 옆 '(자동 실행 · 과금 없음)'.
- 쓰이지 않게 된 CSS(`.hd-tg` · `.hd-more` · `.hd-l/r` · `.sh-q` · `.eyebrow` · `.lock-box` · `.abadge.pre` · `.chip.src` · `.s12-ov/one/three/more` · `.s33-ov/one/three/more` · `.s31-why` · `.s42-tags/tag` · `.led-ai` · `.mk-ai` · `.mk-scope` · `.ln-h small`)와 import(`formatCrista` · `INITIAL_FUND_CRISTA` · `REVIEW_LIMITS` · `STEP_META` 등)도 지웠다.

### 11.2 남긴 것

- 단계 번호 · 제목 · 걸음 탭 · 잠김/막힘 이유(열리는 조건) · 실제 조작 단추와 확인 창의 금액(실행 · 접수 · 시작 단추의 `cost` · '심사 요청(무료 · 받아들여지면 출원료)' 같은 단추 글).
- 실제 기능 내용 — 1.2 미션 브리핑 · 회의 · 지표 사전, 3.2 윤리 카드 5장(카드의 근거 출처 줄 포함) · 확인 문제(법정 교육), 서류 칸과 칸 안내 · 입력 예시(placeholder), 결과 표 · 그래프와 그 범례 · 읽는 법(2.1 수심계 눈금 풀이 · 10배 계단 식 · 2.2 레이더 띠 · 축, 4.1 `read.*`), 도구의 질문 줄(단계 시각화 시안의 활동 질문), 근거 칩 판정 메시지, 오류 · 상태 메시지(심사 중 · 숙고 · 자동 판정 등), 규칙 · 조건 문장(3.2 `leadRule` · `whoNeeds` · 3.3 `newDocHint` 등), 최종 순위 계산 풀이 줄.
- 교사 화면의 `AiBadge` · '선생님 판정 · 규칙 판정' 칩 — 교사가 재판정 · 정정을 고르는 운영 정보라 남김(학생 화면에서만 지움).
- fixture 모드 경고 칩('테스트 결과') — 워커가 시험 모드일 때만 보이는 운영 경고라 남김.
- 가이드북(위 띠 단추로 여는 개념 사전)의 '이 화면에서는' · '주의' 줄 — 사용자가 따로 만든 자료라 이번 범위 밖.

### 11.3 순위 이름 — '기업가치 순위'

`MARKET_COPY.rank.label` · `drawer.rank` → '기업가치 순위', 순위 변동 소식 '◆ 티커 기업가치 1위 탈환' · 마감 소식 '— 기업가치 …' · 해제 소식 '기업가치 변동 재개'. '주가' · '시가총액' 낱말은 공개 서랍의 숫자 칸(주가 · 시가총액 · 주가 추세)과 최종 순위 계산 풀이 줄(`rankingRule`)에만 남는다. 이미 DB 에 저장된 옛 소식 글은 그대로다. 설계 §5.1 그림 · §5.2 표를 고쳤고, §5.4 작업 영역 순서 · §5.10 3줄 요약 뼈대에 '2026-10-24 사용자 지시로 화면에서 뺌' 줄을 달았다. §5.3 표의 '◆ SEUM 시가총액 1위 탈환' · 서랍 목록의 '시가총액 순위'는 이번 지시 범위(§5.1 · §5.2) 밖이라 그대로 두었다 — 코드와 다르다.

### 11.4 검사

`npm run typecheck` 0 · `npm test` 170 + 228 통과 · `npm run build:web` 통과 · e2e(`WEB_PORT=3460` · `LLM_DISABLED=1` · 워커 fixture) — full 18/18 · screen 17/17 · selection 18/18 · patents 24/24 · preclinical 19/19 · ind 16 · clinical 17 · approval 22 · learn 23 · market 20/20 · teacher 20/20 모두 통과. 시험 기대값 고침: `copy-currency.test.ts`(지운 `limit.why` 대신 `abandonConfirm` 의 금액 검사) · `ind.test.ts`(지운 `overview` 검사 뺌) · `market.test.ts`('기업가치 1위 탈환').

### 11.5 스크린샷

`.review/2026-10-24-declutter/` — 1440 · 390 각각 1.1 · 1.2(브리핑) · 2.1(점수 카드) · 2.2(신호등 표) · 3.1(후보 고르기) · 3.2(계획서) · 3.3(실험실) · 4.1(결과) · 4.2(허가증 · 영수증) · 위 띠 · 최종 순위 · 교사(진행 · 서류 심사 · 임상 · 전광판) 30장(`shoot.mjs` · `shoot-report.json`). `E2E_FULL_STOP=approval` 학급(접미 6bf3e)을 교사가 마감한 뒤 모둠 A 학생 · 교사로 찍음. 30장 모두 문서 가로 넘침 0 · 지운 글('단계 소개' · '실제 산업에서는' · '완료 조건 ·' · '흔들림 전 예상치' · 'AI 예측' · '교육용 모의 판정' · '이 단계에서 하는 일' · '무엇을 배우나' · '시가총액 순위' 등) 재등장 0 · 서버 오류 0(390 위 띠 칩 줄 · 교사 단계 줄은 띠 안에서만 가로로 넘어감 — 앞 판과 같음). 4.1 판정 풀이 글의 '(규칙으로 만든 교사 판정 표예요)'는 서버가 만든 결과 글(데이터)이라 그대로다.

### 11.6 적대적 검증에서 더 고친 것

수정 담당 보고를 믿지 않고 `rg` · 화면(LLM 끈 `e2e:full` 의 `E2E_FULL_STOP=approval` 학급, 모둠 A · B 학생으로 9단계의 모든 머리 탭을 눌러 화면 글을 모음)으로 다시 봤다. 자동 검사가 찍지 않은 탭(2.2 근거 판정 · 4.1 프로토콜 · 3.3 도구 · 3.2 동물실험 · 4.2 접수)에 남은 것을 지웠다.

- **성격 · 출처 문장 남은 것**: 2.2 특허 후보 근거 판정 메시지 4개의 '(흔들림 전 예상치)' 꼬리(`indOk` · `indBlock` · `topOk` · `topBlock`) · 4.1 세 관문 허들 그림 설명의 '흔들림 전 예상치 · … game-rules 규칙' · 4.1 이상사례 읽는 법 첫 문장 'AI 시뮬레이션은 이런 기준으로 판정해요'(→ '판정 기준 —') · 3.3 공식 폭포 읽는 법의 '이 공식은 교육용으로 단순하게 만든 것이에요' · 4.2 접수 안내의 '새로운 실험이나 운에 따른 흔들림 · 점수 기준 없이' · 4.2 규칙 검사 제목의 '서버 —'.
- **지운 꼬리표를 가리키던 글**: 4.2 `nda.summaryTitle` '연구 증거 요약(오른쪽 꼬리표는 근거 단계)' — 꼬리표는 이미 지웠는데 제목이 남아 있었다 → '연구 증거 요약'.
- **설명 덩어리 남은 것**: 3.3 도구 6종의 '배울 점' 펼침(`tools.*.lesson` · `toolNotes.lessonTitle` · `.s33-lesson`) · 3.3 승인서의 'IND 승인은 약을 팔아도 된다는 허가가 아니에요 …'(지운 '이 단계에서 하는 일'의 '흔한 오해'와 같은 글 — 넘어가는 항목 한 줄만 남김) · 1.2 회의의 '코치가 경고만 하고 제안을 막지 않아요 …'(`coach.meetingNote`, 두 곳).
- **무료 · 횟수 안내 남은 것**: 3.2 확인 문제의 '횟수 제한 없이 다시 풀 수 있어요'(이수 조건 문장만 남김) · 3.2 동물실험의 '같은 설계로 다시 실행하면 과금 없이 옛 결과를 …'(`messages.rerun`).
- **조작 금액이 빠진 곳**: 3.1 [심사 요청] 판 — `feeNote` 를 지우면서 출원료 금액이 단추 옆에서 사라졌다 → '출원료 x · 잔액 y'(`ui.feeBalance`)로 되살림. 쓰이지 않게 된 `ui.balance` 는 지움.
- 주석: `ui/bits.tsx` 머리 · `styles.css` 배지 칸 · `approval.ts` `EvidenceRow` 의 '꼬리표' 설명.
- 남긴 것(판단): '다음 단계로' 옆 '완료 조건을 채우면 다음 단계가 열려요'(단추가 언제 열리는지 — 열리는 조건), 상태 · 오류 문구 안의 'AI 심사관이 읽고 있어요' 류(상태 메시지), 학습 문항 글의 '(교육용 규칙 기준)'(문항 자체), 3.3 '1상(참고)' 관문 칩 · 2.2 '뇌 노출(참고)' 열 이름(값의 뜻), 1.2 지표 사전 · 회의 안건 '무엇인가 · 왜 거르나'(회의 기능), 4.1 프로토콜의 무작위 배정 · 눈가림 풀이. 서버 서류 심사 프롬프트(`apps/server/src/reviews.ts`)는 Claude 에게 E · S 를 '흔들림 전 예상치'로 말하라고 시킨다 — 심사 피드백 글(데이터)에 이 낱말이 다시 나올 수 있다.

- 검사(고친 뒤): `npm run typecheck` 0 · `npm test` 170 + 228 통과 · `npm run build:web` 통과 · e2e(`WEB_PORT=3460` · `LLM_DISABLED=1` · 워커 fixture) full 18 · screen 17 · selection 18 · patents 24 · preclinical 19 · ind 16 · clinical 17 · approval 22 · learn 23 · market 20 · teacher 20 모두 통과. 화면 다시 모음(모둠 A 45화면): 지운 글 재등장 0 · 남길 것(윤리 카드 5장 · 확인 문제 · 계산 칸 · 결과판 · 출원료 · 접수 수수료 · 근거 판정 · 기업가치 순위 · CONSORT · 검정력) 모두 보임 · 390 폭 문서 가로 넘침 0. 서버 · DB 코드는 이번 묶음에서 바뀌지 않음(`apps/server/src` · `db` diff 없음).

### 11.7 운영 전 확인

- 18세 미만 수업이면 Anthropic 「미성년자 대상 서비스 지침」의 **AI 생성 표시**를 화면 배지 대신 다른 방식(첫 진입 안내 · 교사 안내 등)으로 갖춰야 한다(설계 §12-18). 이번에 학생 화면의 'AI 심사' · 'AI 채점' · 'AI 시뮬레이션' 배지를 모두 지웠다.
