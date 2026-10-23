# 기반 통합 점검 · 수리 보고

## ① 검사 결과

통합하면서 실제 회귀를 하나 찾았어요. 0005가 `claims.reason`을 not null로 바꿨는데 기존 W3 찜 경로가 그 칸을 넣지 않아서, 1.2 찜이 모두 500 오류였어요. 고쳤고, 아래 검사는 모두 마지막 수정 뒤에 다시 돌린 결과예요.

| 명령 | 결과 |
| --- | --- |
| `npm run typecheck` (5 workspace) | 통과, 오류 0 |
| `npm test` | 통과 — web-contract 15/15 · server 47/47 |
| `npm run build:web` | 통과 |
| `npm run db:status:local` | 0000~0008 적용, 밀림 0 |
| `npm run db:check:local` | 경계 점검 통과(14항목) |
| `npm run e2e:parallel` | 처음 13/16 실패(500 internal + 3판 의미 2건) → 수리 후 16/16 |
| `npm run e2e:w1` | 19/19 |
| `LLM_DISABLED=1 npm run e2e:base` | 통과(전광판 소식 점검 1건 추가). 실제 Claude 심사는 처음 돌린 회에서 통과했고, 그 뒤는 비용을 아끼려고 LLM을 끄고 돌렸어요 |
| 빈 DB에 0000→0008 처음부터 적용 | 통과. 로컬 web 스키마와 비교한 951개 객체(칸 · 제약 · 색인 · 함수)가 모두 같아요. A가 0006을 손으로 고친 일로 생긴 어긋남은 없어요 |

**설계 대조 결과(근거 확인)**
- **0005~0007 · 0008 ↔ §7.3 · §7.4 ⑥~⑭ · learning §6.1:** 칸 · CHECK · 고유 키 · 부분 고유 키(`patents (class_id, flat_smiles) where active`, `jobs (patent_id, design_key) where status<>'failed'`, `ind_applications (program_revision_id) where submitted|approved`) · 복합 FK가 맞아요.
  - 안건 값 범위가 §5.5 표와 같아요.
  - 제형 `oral|iv|transdermal`과 용량 10 · 50 · 100이 §5.10과 같아요.
  - 학습 연구비 10표는 member_id 대신 (class_id, user_id) 복합 FK를 써요.
  - 빠져 있던 같은-모둠 FK는 0008로 채웠어요.
- **9단계 완료 조건 ↔ §6.1:** `computeSteps`가 모두 일치해요. 4.1 · 4.2는 잠김이에요.
- **llm.ts ↔ §5.13:** 모두 지켜요.
  - temperature · top_p · top_k · thinking · prefill · tool_choice를 보내지 않아요.
  - effort `medium`, 구조화 출력은 zod로 받고 서버가 다시 검사해요.
  - `stop_reason === 'refusal'`을 내용보다 먼저 봐요. `fallbacks: 'default'`를 켜요.
  - 호출마다 `web.llm_calls`에 기록하고, 프롬프트 · 학생 글 · 키는 남기지 않아요.
  - `new Anthropic()`를 인자 없이 만들어요.
- **화면 ↔ §5.4.1:** 맞아요 — 섬 26 · 판 18 · 탭 12 · 단계 줄 14 · 칩 999 · 그리드 `"side head head" "side mine team"` · 264px · 틈 12 · 바깥 여백 · 아래 48 · 섬 사이 선 없음 · 폰 ≤860에서 쌓기(반경 20 · 여백 16 · 큰 번호 40). CSS와 B의 스크린샷 두 장으로 확인했어요.
- **경계 §7.1:** 서버 SQL에서 web 스키마 밖을 읽거나 쓰는 곳은 0곳이에요. `public.` 참조는 e2e 스크립트의 관리자 연결 행 수 비교뿐이에요(⑨에서 허용).

## ② 기능 에이전트용 '기반 사용 설명서'

### 공통 규칙
- AGENTS.md를 지켜요: web 스키마만, 포트(화면 5190 · 서버 3390 · 워커 8790), 워커 id 접두 `web-` / `web:`, `packages/shared-types` · `game-rules` 값 수정 금지, 비밀값 출력 금지.
- 문서 · 주석 · 문구는 해요체 한국어로 써요. git commit은 하지 않아요.
- **내 파일만 고쳐요.** 공유 파일은 아래 '고리'로 해결해요.

| 기능 | 서버 | 규격 | 화면 | 마이그레이션 |
| --- | --- | --- | --- | --- |
| F12 | `features/screen.ts` | `screen.ts` | `steps/s12.tsx` · `s12.css` | 0010 |
| FSEL | `features/selection.ts` | `selection.ts` | `s21` · `s22` | 0011 |
| F31 | `features/patents.ts` | `patent.ts` | `s31` | 0012 |
| F32 | `features/preclinical.ts` | `preclinical.ts` | `s32` | 0013 |
| F33 | `features/ind.ts` | `ind.ts` | `s33` | 0014 |
| FLEARN | `features/learn.ts` | `learn.ts` | `board/learn/` | 0015 |
| FMARKET | `features/market.ts` | `market.ts` | `board/market/` | 0016 |

- 각 서버 파일의 `register(router)`는 이미 `routes.ts`가 불러요.
- 각 파일 머리 주석에 그 기능이 쓸 표 · 불변식 · helper가 적혀 있어요. **먼저 읽어요.**

### 서버 helper (`apps/server/src/`)
```ts
// pipeline.ts
teamMember(db, account) → { account, classId, teamId, avatar }
lockedProgram(tx, teamId) → ProgramRow & { revision_id }     // programs FOR SHARE — 표적 바꾸기와 줄 세움
notifyTeam(deps, teamId, reason, byName?)                   // 모둠 WS 'board.changed' → 화면이 /api/board 다시 읽음
openScreenAgendas(db, revisionId, teamId) · jobView(row) · computeSteps · loadStageFacts
// guard.ts
requireAccount(ctx) · requireTeacherOf(db, account, classId)
// ledger.ts — 원장은 정수 센트, 1 CRISTA = 20센트
charge(tx, { teamId, cents | crista, kind, idemKey, createdBy?, jobId?, ref?: {type,id} })
  → { charged, ledgerId, balanceAfter }   // teams FOR UPDATE · 멱등 · 402 insufficient_funds · 이름 잠금
credit(db, entry) · balanceCents(db, teamId)
// reviews.ts — 서류 심사(§5.11)
requestReview(deps, { kind, docId, docVersion, sections, checklist, facts, ruleFindings, reviewerVersion, teamId, classId, requestedBy }, { tx? })
  → { review, created, dispatch }          // tx 를 넘기면 커밋 뒤 dispatch() 필수
onReviewed(kind, async (tx, review, deps) => void | (() => void))   // 판정을 쓴 트랜잭션 안 · 돌려준 함수는 커밋 뒤
saveSection(tx, { kind, docId, section, body, expectedVersion, userId }) → { version, docVersion }   // 늦은 쪽 409 stale + error.section
loadSections(db, kind, docId, only?) · latestReview(db, kind, docId) · loadReviewView(db, id) · checkSectionBody(raw, max?)
// clock.ts — 학급 게임 시계(기본 흐름 · 배율 2)
onGameDay(name, async (deps, { nowMs, classes: [{ classId, gameDay, paused }] }) => {})   // 5초 틱
onRealtimeTick(name, everyMs, async (deps, nowMs) => {}) · currentGameDay(db, classId) · loadClock · gameDaySql('c')
// llm.ts
deps.llm.call({ task, version, system, user, schema, teamId?, classId?, refId? })
  → { kind: 'ok' | 'refused' | 'invalid' | 'unavailable' | 'error', … }   // 던지지 않음
deps.llm.available · dailyRemaining(classId) · fenceStudentText(text) · looksLikeInjection(text) · countLlmCallsToday
// hub
deps.hub.broadcastTeam(teamId, msg) · broadcastClass(classId, msg) · broadcastTeachers(classId, msg) · publish(channel, msg)
```

**이번 점검에서 새로 둔 고리 — 공유 파일을 고치지 말고 이것을 써요**
```ts
// board-events.ts — 전광판 소식(F31 · F32 · F33 · FLEARN 이 지금 바로 부를 수 있음)
const { created, event, after } = await postBoardEvent(tx, deps, {
  classId, teamId, kind: 'patent', headline: '◆ SEUM 물질특허 등록 — SEUM-102 · 알츠하이머 후보',
  public: { codeName: 'SEUM-102' }, idemKey: `patent:${id}`, gameDay });
// 커밋 뒤 after() — 학급 WS 'board.event' + 그 모둠 'board.changed'
onBoardEvent('market', async (tx, event, deps) => { /* FMARKET: 기업가치 · change_pct · 헤드라인 */ return () => {/* 커밋 뒤 */}; });
// 잠금 순서는 늘 teams → classes. class_seq 는 classes `for no key update`. 같은 idemKey 는 한 줄만.
// public 에 SMILES · 물성 · 점수 · 노트를 넣지 않는다.

// jobs.ts — 워커 작업 접수(1.2 · 2.1 · 2.2)
onJobPrepare('1.2', async (deps, { teamId, classId, userId, targetId, revisionId, params }) =>
  ({ params, summary, snapshot: { mw, tpsa, …, rounds } }))   // 돌려주면 기본 입력 확인을 대신함, void 면 기본 확인 계속
onJobAdmit('1.2', async (tx, { teamId, revisionId, requestId, prepared, … }) => { /* 409 던지기 */ })
  // 모둠 줄 FOR UPDATE · 표적 버전 확인 뒤, 작업 줄 · 과금 전
onJobSucceeded('market', async (deps, { id, step, teamId, classId, revisionId, targetId, createdBy, affinityKcal }) => {})
  // 성공 커밋 뒤 실행 · 워커 작업만
// snapshot 은 jobs.params.snapshot 에 두고 워커에는 보내지 않아요. 성공하면 result.snapshot 에 붙어요(§7.3 '1.2 실행 기록').
```
- F12는 `onJobPrepare('1.2')` + `onJobAdmit('1.2')`를 써요(⑦: 합의 6개 확인 · 진행 중 1.2가 있으면 409).
- FSEL은 `onJobPrepare('2.2')` 또는 `onJobAdmit('2.2')`로 '대기열(dock_picks)에 있는 분자만' 받게 해요.
- F32의 3.2 작업은 `startJob`을 거치지 않아요. 직접 `charge` + `jobs` insert로 처리하고, 제약은 step '3.2' ⇔ patent_id · design_key · ends_game_day가 모두 있어야 해요. 끝은 `onGameDay`로 내요.

### 규격 공통형 (`packages/web-contract/src/`)
- **money:** `CENTS_PER_CRISTA = 20` · `centsToCrista` · `cristaToCents` · `formatCrista` · `formatCentsAsCrista` · `INITIAL_FUND_CRISTA = 10_000_000`
- **clock:** `ClassClockView` · `gameDayNow(view)` · `formatGameDay` · `CLOCK_API`
- **review:**
  - `DocKind` · `DocReviewOutput` · `DocReviewView` · `DocSectionView` · `SectionSaveRequest` · `RuleFinding` · `ReviewChecklistItem` · `REVIEW_LIMITS` · `REVIEW_API`
  - 근거 칩: `ReasonVerdict` · `reasonOk` · `reasonWarn` · `reasonBlock`
  - 키 꼴: `REASON_KEY_PATTERN`(`^[a-z][a-z0-9_]{0,39}$`) · `SECTION_KEY_PATTERN`
- **pipeline:** 9단계 `StepId` · `STEP_META` · `STEP_REQUIRES` · `DEFERRED_STEPS` · `JobStep`('3.2' 포함) · `BoardResponse`(`balanceCrista` · `clock` · `maxPatentsPerTeam`). `ClaimRequest.reason?`가 새로 생겼어요(비우면 'legacy' — F12가 필수로 바꿔요).
- **api:** ErrorCode에 `limit_reached` · `reason_blocked` · `already_exists` · `llm_unavailable`가 있고, `error.section`이 있어요.
- **preclinical (F32 → F33 접점, 이름을 바꾸지 말 것):**
  - `AnimalStudyResult`: `mrsdMgByForm` · `noaelMgPerKgDay` · `hedMgPerKg` · `safetyFactor` · `findings` · `painGrade` · `animalsUsed` …
  - `AltAssayResult` · `asPreclinicalResult(result)`
  - `animalDesignKey` · `altDesignKey` · `PRECLINICAL_FEES`
- **기능 상수:**
  - `screen`: `SCREEN_AGENDAS` · `SCREEN_AGENDA_RANGE` · `screenAgendaValueOk` · `screenQuorum` · `CLAIMS_PER_PERSON = 2` · `LEGACY_REASON`
  - `ind`: `IND_FORMS` · `IND_DOSES` · `IND_FEE_CENTS` · `IND_REVIEW_GAME_DAYS = 30` · `IND_SAFETY_MIN = 35`
  - `market`: `BoardEventKind` · `BoardEventView` · `HEADLINE_VERSION`

### WS 메시지
- **모둠:**
  - `board.changed` {reason, byName?} · `job.progress`
  - `doc.reviewed` · `learn.graded` · `learn.stipend`
  - `screen.changed` {reason, agenda?}
- **학급:** `board.event` {event: BoardEventView} · `clock` · `patent.ledger` {reason, patentId?} · `team.*`
- **교사(`teacher:<classId>`):** `teacher.alert` {kind: review_flagged | review_manual | appeal}

### DB 표와 핵심 제약
- **0005:**
  - `screen_briefing` — PK(rev, user, question)
  - `screen_agendas` — PK(rev, agenda) · 표적 버전마다 6행 · agreed ⇔ value · agreed_at · 값 CHECK
  - `screen_proposals` — PK(rev, agenda, proposed_by)
  - `screen_votes` — PK(rev, agenda, voter) · 제안 복합 FK
  - `claims.reason` not null
- **0006:**
  - `dock_picks` · `lead_candidates` — PK(rev, job) · UQ(rev, 사람, slot∈1,2) · (job, rev) → jobs 복합 FK. lead_candidates에는 `known_substance`가 있어요.
  - `patent_applications` — UQ(class, code_name) · 같은 후보로 살아 있는 출원 1건
  - `patent_sections` · `iacuc_sections` · `ind_sections` — PK(doc, section) · version
  - `patents` — UQ(class, class_seq) · UQ(class, patent_no) · 부분 고유 키(class, flat_smiles) where active
  - `ethics_training` — PK(class, user)
  - `iacuc_protocols` — approved_version · approved_snapshot
  - `iacuc_protocol_patents`
  - `ind_applications` — 부분 고유 키(rev) where submitted | approved
  - `doc_reviews` — UQ(kind, doc, version, reviewer_version)
  - `llm_calls`
  - `classes`: max_patents_per_team · 시계 칸 4개
  - `jobs`: 3.2 칸 + UQ(patent_id, design_key) where status ≠ failed
- **0007:**
  - `board_events` — UQ(class, class_seq) · UQ(class, idem_key)
  - `valuations` · `learn_*` 10표
  - `ledger`: kind 확장 + ref_type · ref_id
- **0008:** jobs → patents · iacuc_protocols, iacuc_protocol_patents → 양쪽 모두 (id, team_id) 복합 FK(같은 모둠만)

### 화면 레이아웃 API (`apps/web/src/board/`)
```tsx
import { useLocalTab, useLive, Panel, ReasonChips, DocSectionEditor, Confirm } from '../ui/index.ts';
import { StepLayout, NotesBlock, Next, type StepProps } from './common.tsx';
import './s31.css';
export function Step31(props: StepProps) {
  const { board, step, goStep } = props;
  const [tab, setTab] = useLocalTab('step:3.1', ['pick', 'code', 'doc', 'review', 'ledger'] as const, 'pick');
  const live = useLive<PatentsResponse>('/api/patents', (m) => m.type === 'doc.reviewed' || m.type === 'patent.ledger');
  return <StepLayout {...props} tabs={[{ id: 'pick', no: '①', label: '출원할 후보' } /* … */]} tab={tab}
    onTab={(id) => setTab(id as typeof tab)} doneWhen="유효 특허 1건 이상" ratio="even"
    mine={<Panel title="…">…</Panel>}
    team={<><Panel title="…">…</Panel><NotesBlock board={board} stepId="3.1" /><Next step={step} goStep={goStep} label="3.2" /></>} />;
}
```
- **부품:**
  - `Panel` · `Tabs` · `ReasonChips`(verdict block이면 확정 단추를 막음) · `Confirm`
  - `DocSectionEditor`(1초 자동 저장 · 409 stale 병합)
  - `HBars` · `Histogram` · `AiBadge` · `PreShakeBadge` · `StateMark`
  - `useLocalTab` · `useBenchState`
  - **새로 둔 것:** `useLive(path, refetchOn)` — 기능 GET을 읽고, WS 소식이 오거나 다시 붙으면 다시 읽어요(150ms 묶음 · 늦은 옛 응답 버림). 반환: `{ data, error, loading, reload, setData }`
- `common.tsx` · `styles.css` · `Board.tsx`는 고치지 말고 `question` · `doneWhen` prop을 넘겨요. FLEARN은 `learn/StepLearn.tsx`만 채우면 9단계에 모두 나와요.

### 로컬 실행 · 시험
- **서버 · 화면:** `npm run dev:server`(3390 · 로컬 DB · `.env.local`의 ANTHROPIC_API_KEY만 넘김) · `npm run dev:web`(5190). 3390에 이미 `node --watch` 서버가 떠 있을 수 있는데, 저장하면 다시 읽어요.
- **워커(1.2 · 2.1 · 2.2에 필요):**
  ```
  cd ~/Desktop/repo/crista/apps/bio-worker && CRISTA_WORKER_MODE=fixture ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8790
  ```
- **DB:** `npm run db:migrate:local` → `db:status:local` → `db:check:local`. 내 예약 번호 파일만 새로 써요.
- **계정:**
  - 교사: `npm run teacher:create -- --login <id> --name <이름> --json` → 로그인 → `POST /api/classes {name, teamCount, maxStudents}` → 학생 `POST /api/auth/signup {classCode, loginId, displayName, password}` → `POST join` · `registration`. `apps/server/scripts/e2e-base.ts` 앞부분이 그대로 쓸 수 있는 예시예요.
  - 4인 동시 조작 예시: `e2e-parallel.ts`
- **회귀:** `npm run typecheck` · `npm test` · `npm run build:web` · `e2e:parallel` · `e2e:w1` · `LLM_DISABLED=1 npm run e2e:base`(실제 Claude 호출을 아끼려면 끈 채로)
- **브라우저 점검:** 5190에서 1440px · 390px(가로 스크롤 없음) 스크린샷을 `.review/<날짜>-<기능>/`에 둬요. 문구 검수는 `agy … --mode plan`(§5.12)으로 해요.

## ③ 고친 것

1. **1.2 찜 500 회귀**
   - `apps/server/src/pipeline.ts`의 `claimCandidate`가 `reason`을 받아(비우면 `'legacy'`, 키 꼴 검사) insert해요.
   - `packages/web-contract/src/pipeline.ts`의 `ClaimRequest`에 `reason?`을 더했어요.
2. **`e2e-parallel.ts`를 3판 의미에 맞췄어요:** 직접 넣는 찜에 `reason`을 넣고, W3 리드 지정 뒤 2.2는 완료가 아니며 3.1은 잠김으로 확인해요(§6.1).
3. **`db/migrations/0008_same_team_keys.sql`:** 같은-모둠 복합 FK 3개. 로컬에 적용했고, 빈 DB 적용 · 스키마 비교도 통과했어요.
4. **`apps/server/src/board-events.ts`(새 파일):** `postBoardEvent` · `onBoardEvent` · `loadBoardEventView`. `e2e-base.ts`에 동시 4건 점검을 더했어요.
5. **`apps/server/src/jobs.ts`:**
   - `onJobPrepare` · `onJobAdmit` · `onJobSucceeded` 고리를 더했어요.
   - snapshot을 워커 입력에서 빼고, 성공하면 `result.snapshot`으로 붙여요.
   - `Prepared`를 export하고 `bindDeps`를 더했어요. `index.ts`에서 `jobs.bindDeps(deps)`를 불러요.
6. **`packages/web-contract/src/preclinical.ts`:** 3.2 결과 모양(`AnimalStudyResult` · `AltAssayResult` · `asPreclinicalResult`)을 정했어요.
7. **`apps/web/src/board/ui/useLive.ts`(새 파일):** `ui/index.ts`에서 export해요.
8. **`apps/web/src/board/steps/common.tsx`:** 2.2 `doneWhen`을 '특허 후보 1개 이상(주력 · 백업은 3.2 끝에서)'로 바꿨어요.
9. **`docs/2026-10-23-implementation-status.md`:** §5.4 '통합 점검 · 수리'를 더했어요.

임시 스크립트는 지웠고, 제가 띄운 워커(8790)는 내렸어요.

## ④ 남은 위험

1. **2.2를 지금 화면으로 끝낼 수 없어요(FSEL 전까지).** 서버는 2.2 완료를 `lead_candidates`로 보지만 `s22.tsx`는 아직 W3 리드 지정(`PUT /api/program/lead`)만 해요. 그래서 FSEL이 들어오기 전에는 새 모둠의 2.2 → 3.x가 열리지 않아요. 0006이 옮긴 legacy 후보 5건만 예외예요. F32는 이 경로를 3.2 주력 · 백업 검사로 바꿔야 해요.
2. **기능 사이 의존 순서**
   - F31은 FSEL의 `lead_candidates`, F32는 F31의 `patents`, F33은 F32의 `AnimalStudyResult`를 읽어요. 표 · 모양은 정해 뒀지만, 실제 데이터로 흐름을 끝까지 시험하려면 앞 기능이 있어야 해요. 그 전에는 시험 데이터를 직접 넣어야 해요(관리자 연결 말고 crista_web으로).
   - F33의 '시작 용량 ≤ MRSD'와 'S ≥ 35 보장'은 F32의 `PRECLINICAL_RULES` 시험에 달려 있어요.
3. **`WebJobView.result`의 타입이 3.2 작업에서는 실제와 달라요.** `ExperimentResult`로 적혀 있지만 실제로는 `PreclinicalJobResult`예요. 3.2 작업도 `board.jobs`에 섞여 내려가니, s21 · s22는 `step`으로 걸러야 해요.
4. **공유 파일에 남은 충돌 지점**
   - `routes.ts` · `pipeline.ts`(F32의 `setLead`) · `teams.ts`(FMARKET 등기 소식)는 각각 한 기능만 고치게 정했어요.
   - 그래도 FMARKET이 `Board.tsx`의 위 띠 자리(RankButton · LedBand)를, FLEARN이 GrantChip · PitchButton을 넘어서 고치면 충돌할 수 있어요.
5. **`ClaimRequest.reason`이 아직 선택이에요.** F12가 근거 칩 · 서버 재판정(⑧)을 넣고 필수로 바꿔야 §5.5 '골라야 찜'이 돼요.
6. **로컬에서만 확인했어요.** 호스팅 DB에는 0005~0008이 아직 적용 전이고 Railway의 `ANTHROPIC_API_KEY`도 아직이에요. 둘 다 사용자 확인 뒤(`db:dry-run:hosted` 먼저) 해요. 빈 DB 적용 시험은 로컬 클러스터의 auth 흉내로만 했어요.
7. **'학생에게 말하는 법' 단락과 심사관 판(`patent-v1` 등)은 초안이에요.** §5.12의 Gemini 문구로 바꿀 때 `reviewerVersion`을 올려야 해요. 그러지 않으면 캐시 때문에 옛 판정이 그대로 돌아와요.
8. **로컬 DB에 시험 기록이 남아요.** e2e 계정 · 학급 · 심사 · `board_events` · `llm_calls`가 쌓였어요. 걷어내는 법은 `db/README.md`에 있어요.