/**
 * 3판 전체 흐름 점검(통합) — 떠 있는 로컬 서버(HTTP)로 한 학급의 파이프라인을 1.1 부터 마감 · 최종 순위까지 API 로 끝까지 민다.
 *
 *   WEB_PORT=3410 LLM_DISABLED=1 node tools/with-local-env.mjs node apps/server/src/index.ts   (다른 터미널 — 서류 심사는 pending → 교사 수동 통과)
 *   WEB_PORT=3410 npm run e2e:full                       — 실제 Claude 호출 없음(임상 시뮬레이션도 교사 수동 판정)
 *   WEB_PORT=3410 E2E_FULL_LLM=1 npm run e2e:full        — 1상 시뮬레이션 1건만 실제 Claude(이 프로세스 안에서 — 비용 · 필요할 때만)
 *   WEB_PORT=3410 E2E_FULL_STOP=approval npm run e2e:full — 화면 점검용: 허가까지만 하고 마감하지 않음(로그인 정보 JSON 을 찍고 끝)
 *   WEB_PORT=3410 E2E_FULL_LLM=all LLM_DAILY_PER_CLASS=20 npm run e2e:full — 서류 심사 5건 · 임상 1 · 2 · 3상 첫 시도를 실제 Claude 로(이 프로세스 안에서 — 서버는 LLM 꺼 둔 채). 보류면 재도전은 교사 수동.
 *     보완 · 거절이면 지적을 찍고 교사 정정으로 넘겨요. 끝에 llm_calls(이 학급) 호출 수 · 토큰 · 거절을 찍어요. LLM_DAILY_PER_CLASS 가 학급 호출 상한이에요.
 *
 * 교사 1 · 학생 4 · 2모둠(모둠 A 2명 — 알츠하이머/ACHE 끝까지 · 모둠 B 2명 — 2형 당뇨/DPP4 3.1 까지).
 *  1.1 추천 · 확정 → 1.2 브리핑 · 회의 6안건 합의 · 실행 · 찜(근거) → 2.1 찜 분자 + 변형체 도킹 → 2.2 대기열 · ADMET · 특허 후보
 *  → 3.1 출원서 · 코드명 · 칸 · 심사(교사 수동 통과) · 등록 → 3.2 윤리 · 계획서 · 심의 · 동물실험(시계 빨리) · 계산 칸 · 주력 지정
 *  → 3.3 IND 신청서 · 조합 · 심사 · 접수 · 30게임 일 → 승인 → 4.1 1 · 2 · 3상 모집 · 시작 · 판정(교사 수동 — 옵션으로 1상만 실제 Claude)
 *  → 4.2 브랜드 · 포장 · 칸 · 심사 · 접수 · 60게임 일 → 허가 → Series A · B 투자(FLEARN) → 교사 [지금 마감] → 최종 순위.
 * 단계마다 9단계 상태(computeSteps)와 기업가치(FMARKET 결과 소식 · 과정 평가)가 움직였는지 본다. 공개 범위(전광판 public 에 SMILES · 점수 없음)도.
 * 게임 시계는 classes.clock_anchor_day 를 앞당겨 빨리 감는다(교사 배속 대신 — 처리기는 서버의 5초 틱).
 * 같은 DB 에 붙은 다른 서버(3390 등)도 시계 처리기를 돌린다 — 판정 · 소식은 DB 로 확인한다(WS 는 보지 않는다).
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API,
  APPROVAL_API,
  BASE_DOSE,
  BASE_FORM,
  candidateReasonsFor,
  candidateReasonVerdict,
  CLINICAL_API,
  DOCK_REASONS,
  dockReasonVerdict,
  IND_API,
  IND_PLEDGE_BODY,
  LEARN_API,
  MARKET_API,
  PATENT_API,
  PRECLINICAL_API,
  REVIEW_API,
  SCREEN_AGENDAS,
  SCREEN_API,
  SELECTION_API,
  STEP_IDS,
  type AdmetView,
  type ApiErrorBody,
  type ApprovalResponse,
  type BoardResponse,
  type ClinicalResponse,
  type IndResponse,
  type MarketFinalResponse,
  type MeResponse,
  type PatentsResponse,
  type PreclinicalResponse,
  type ScreenAgenda,
  type ScreenDatasetResponse,
  type ScreenResponse,
  type SelectionResponse,
  type StartJobResponse,
  type StepId,
  type TeacherClassDetail,
  type WebJobView,
} from '@crista-web/web-contract';
import { loadConfig } from '../src/config.ts';
import { createLimits, type Deps } from '../src/context.ts';
import { createPool, type Queryable } from '../src/db.ts';
import { register as registerApproval } from '../src/features/approval.ts';
import { runSimulation } from '../src/features/clinical.ts';
import '../src/features/ind.ts';
import { register as registerPatents } from '../src/features/patents.ts';
import { register as registerPreclinical } from '../src/features/preclinical.ts';
import { LlmClient, type LlmRequest } from '../src/llm.ts';
import { releaseDue, runReviewLlm } from '../src/reviews.ts';
import { HttpBioWorker } from '../src/worker.ts';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
/** 'all' — 서류 심사 5건(특허 2 · 계획서 · IND · NDA)과 임상 1 · 2 · 3상 시뮬레이션을 모두 이 프로세스에서 실제 Claude 로(비용 — 마무리 점검용). */
const REAL_ALL = process.env.E2E_FULL_LLM === 'all';
const REAL_LLM = process.env.E2E_FULL_LLM === '1' || REAL_ALL;
const STOP = process.env.E2E_FULL_STOP ?? '';
const here = dirname(fileURLToPath(import.meta.url));
const suffix = randomBytes(3).toString('hex').slice(0, 5);
const letters = (s: string) => s.replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!).toUpperCase();
const password = `pw-${suffix}-full`;
const started = Date.now();
let passed = 0;

const db = createPool({ databaseUrl: process.env.WEB_DATABASE_URL!, databaseCa: null });
const sql = async <R extends Record<string, unknown> = Record<string, unknown>>(text: string, args: unknown[] = []): Promise<R[]> => (await (db as Queryable).query<R>(text, args)).rows;

interface Reply<T = unknown> {
  status: number;
  body: T;
}
const err = (r: Reply) => (r.body as ApiErrorBody | null)?.error;
const show = (r: Reply) => `${r.status}${err(r) ? `:${err(r)!.code} ${err(r)!.message}` : ''}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rid = () => randomBytes(12).toString('hex');

/** 단계 하나 — 실패하면 그 뒤는 돌릴 수 없으니 멈춘다. */
async function stage(label: string, fn: () => Promise<void> | void): Promise<void> {
  const t0 = Date.now();
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${label} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (error) {
    console.log(`✗ ${label}\n    ${(error as Error).stack?.split('\n').slice(0, 12).join('\n    ')}`);
    console.log(`\n${passed}개 통과 뒤 실패(접미 ${suffix})`);
    await db.end().catch(() => {});
    process.exit(1);
  }
}

async function waitFor<T>(fn: () => Promise<T | undefined> | T | undefined, ms: number, label: string, every = 700): Promise<T> {
  const until = Date.now() + ms;
  for (;;) {
    const hit = await fn();
    if (hit !== undefined) return hit;
    if (Date.now() > until) throw new Error(`${label} — ${ms}ms 안에 되지 않았어요.`);
    await sleep(every);
  }
}

class Agent {
  cookie: string | null = null;
  userId = '';
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<Reply<T>> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { origin: BASE, ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      });
      const set = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
      if (set) this.cookie = set.split(';')[0]!;
      const text = await res.text();
      // 로컬 DB 연결 상한(여러 서버가 같이 씀)으로 읽기가 500 이면 잠깐 뒤 다시(쓰기는 다시 보내지 않는다).
      if (res.status === 500 && method === 'GET' && attempt < 4) {
        await sleep(800);
        continue;
      }
      return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
    }
  }
  async get<T>(path: string): Promise<T> {
    const r = await this.call<T>('GET', path);
    if (r.status !== 200) throw new Error(`${this.name} GET ${path} → ${show(r)}`);
    return r.body;
  }
  async ok<T = unknown>(method: string, path: string, body?: unknown, want: number[] = [200, 201]): Promise<T> {
    const r = await this.call<T>(method, path, body);
    if (!want.includes(r.status)) throw new Error(`${this.name} ${method} ${path} → ${show(r)}`);
    return r.body;
  }
  board = () => this.get<BoardResponse>(API.board);
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `통합 점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

const stateOf = (b: BoardResponse, id: StepId) => b.steps.find((s) => s.id === id)!.state;
const doneSteps = (b: BoardResponse) => b.steps.filter((s) => s.state === 'done').map((s) => s.id);

async function waitJobs(agent: Agent, ids: string[], ms = 150_000): Promise<WebJobView[]> {
  return waitFor(async () => {
    const b = await agent.board();
    const jobs = ids.map((id) => b.jobs.find((j) => j.id === id));
    return jobs.every((j) => j && (j.status === 'succeeded' || j.status === 'failed')) ? (jobs as WebJobView[]) : undefined;
  }, ms, `작업 ${ids.length}건`);
}

/** 학급 게임 시계를 앞당긴다(처리기는 서버 5초 틱). */
async function advance(classId: string, days: number): Promise<void> {
  await sql('update web.classes set clock_anchor_day = clock_anchor_day + $2 where id = $1', [classId, days]);
}

/** 교사 수동 통과(LLM 을 끈 서버 — 심사는 pending). */
async function teacherPass(teacher: Agent, reviewId: string): Promise<void> {
  const r = await teacher.call('POST', REVIEW_API.teacherDecide(reviewId), { verdict: 'pass', note: '통합 점검 — 교사가 직접 확인했어요.' });
  if (r.status !== 200) throw new Error(`교사 통과 ${reviewId} → ${show(r)}`);
}

// ── 실제 Claude(E2E_FULL_LLM) — 이 프로세스의 LlmClient. 서버(3450 등)는 LLM 을 끈 채 둔다(헤드라인 · 채점 호출이 섞이지 않게). ──

let realDeps: Deps | null = null;
/** 서류 심사 · 임상 시뮬레이션만 부르는 deps. 다른 쓰임(헤드라인 · 학습 채점)은 이 프로세스에서 'unavailable'. */
function llmDeps(): Deps {
  if (realDeps) return realDeps;
  const config = loadConfig();
  const real = new LlmClient(config.llm, db);
  assert.ok(real.available, 'ANTHROPIC_API_KEY 가 있어야 해요(LLM_DISABLED 를 빼고 돌려요)');
  const llm = new Proxy(real, {
    get(target, prop, receiver) {
      if (prop === 'call') {
        return (req: LlmRequest<unknown>) =>
          req.task === 'doc_review' || req.task === 'clinical_sim' ? target.call(req) : Promise.resolve({ kind: 'unavailable', reason: 'disabled' });
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  const hub = { broadcastTeam() {}, broadcastClass() {}, broadcastTeachers() {}, publish() {}, refreshUser() {}, onTeamMessage() {}, onlineIn: () => [] };
  realDeps = { config, db, hub, llm, worker: new HttpBioWorker(config.bioWorkerUrl), limits: createLimits(), jobs: null, auth: null } as unknown as Deps;
  // 판정을 쓴 트랜잭션 안에서 도는 서류별 처리기(받아들임 · 승인 · 통과) — 이 프로세스에도 등록한다(라우트는 버림).
  const router = { on: () => router } as unknown as Parameters<typeof registerPatents>[0];
  registerPatents(router);
  registerPreclinical(router);
  registerApproval(router);
  return realDeps;
}

interface LlmLogRow {
  what: string;
  verdict: string;
  source: string;
  calls: number;
  seconds: number;
  note: string;
}
const llmLog: LlmLogRow[] = [];

/** 서류 심사 — 실제 Claude 모드면 이 프로세스에서 심사관을 부르고(최대 3번), 보완 · 거절이면 지적을 남긴 뒤 교사 정정으로 넘긴다. 아니면 교사 수동 통과. */
async function reviewGate(teacher: Agent, reviewId: string, what: string): Promise<void> {
  if (!REAL_ALL) return teacherPass(teacher, reviewId);
  const t0 = Date.now();
  const deps = llmDeps();
  type Row = { verdict: string; held_verdict: string | null; class_id: string; llm_status: string; response_model: string | null; flags: string[]; llm_output: { items?: Array<{ id: string; status: string; note?: string }>; feedback?: string } | null };
  const load = async () => (await sql<Row>('select verdict, held_verdict, class_id, llm_status, response_model, flags, llm_output from web.doc_reviews where id = $1', [reviewId]))[0]!;
  // 서버(LLM 꺼짐)가 이미 규칙 자동 판정(auto)을 담아 두었으면 비우고 실제 Claude 로 다시 부른다(숙고 공개 게임 일은 접수 때 정한 그대로).
  await sql(
    `update web.doc_reviews set held_verdict = null, llm_status = 'queued', llm_output = null, flags = '{}', next_attempt_at = null, llm_attempts = 0
      where id = $1 and verdict = 'pending' and (held_verdict is null or llm_status = 'auto')`,
    [reviewId],
  );
  let row = await load();
  for (let i = 0; row.verdict === 'pending' && !row.held_verdict && i < 3; i++) {
    await sql(`update web.doc_reviews set llm_status = 'queued', next_attempt_at = null where id = $1 and verdict = 'pending' and held_verdict is null and llm_status in ('queued', 'failed', 'unavailable')`, [reviewId]);
    await runReviewLlm(deps, reviewId);
    row = await load();
    // 다른 서버(3390)의 재시도 루프가 먼저 임대했으면 그쪽 결과를 기다린다.
    if (row.verdict === 'pending' && !row.held_verdict && row.llm_status === 'queued') {
      row = await waitFor(async () => {
        const x = await load();
        return x.verdict !== 'pending' || x.held_verdict ? x : undefined;
      }, 400_000, `${what} 심사(다른 서버)`, 3000);
    }
  }
  // 숙고 기간(DOC_REVIEW_GAME_DAYS) — 시계를 넘기고 공개를 기다린다(이 프로세스도 releaseDue 를 불러 처리기를 같은 트랜잭션에서 돌린다).
  if (row.verdict === 'pending' && row.held_verdict) {
    row = await waitFor(async () => {
      await advance(row.class_id, 7);
      await releaseDue(deps, row.class_id);
      const x = await load();
      return x.verdict !== 'pending' ? x : undefined;
    }, 60_000, `${what} 숙고 공개`, 1000);
  }
  const [{ n }] = (await sql<{ n: number }>('select count(*)::int as n from web.llm_calls where ref_id = $1', [reviewId])) as [{ n: number }];
  const items = row.llm_output?.items ?? [];
  const notOk = items.filter((it) => it.status !== 'ok').map((it) => `${it.id}:${it.status}${it.note ? ` — ${it.note}` : ''}`);
  const note = [`상태 ${row.llm_status}`, row.response_model ? `모델 ${row.response_model}` : '', row.flags?.length ? `플래그 ${row.flags.join(',')}` : '', notOk.length ? `지적 ${notOk.join(' | ')}` : '', row.llm_output?.feedback ? `총평 ${row.llm_output.feedback}` : '']
    .filter(Boolean)
    .join(' · ');
  llmLog.push({ what, verdict: row.verdict, source: row.llm_status, calls: n, seconds: Math.round((Date.now() - t0) / 1000), note });
  console.log(`    · ${what} 심사 — ${row.verdict} (${note})`);
  if (row.verdict === 'pending') throw new Error(`${what} 심사가 3번 안에 끝나지 않았어요(${row.llm_status}).`);
  if (row.verdict !== 'pass') {
    // 보완 · 거절 — 지적은 기록에 남기고, 흐름을 끝까지 보려고 교사 정정(원래 판정은 기록에 남음)으로 넘긴다.
    const r = await teacher.call('POST', REVIEW_API.teacherDecide(reviewId), { verdict: 'pass', note: '통합 점검 — AI 지적을 확인하고 교사가 정정했어요.' });
    if (r.status !== 200) throw new Error(`교사 정정 ${reviewId} → ${show(r)}`);
  }
}

/** 실제 Claude 호출 기록 — 이 학급(교사 학급 id) 전체. 다른 서버가 부른 헤드라인도 함께 센다. */
async function printLlmUsage(classId: string): Promise<void> {
  if (!REAL_LLM) return;
  const rows = await sql<{ task: string; status: string; n: number; input: number; output: number; cache_read: number; ms: number; max_ms: number; stops: string; refusals: string }>(
    `select task, status, count(*)::int as n, coalesce(sum(input_tokens), 0)::int as input, coalesce(sum(output_tokens), 0)::int as output,
            coalesce(sum(cache_read_tokens), 0)::int as cache_read, coalesce(sum(latency_ms), 0)::int as ms, coalesce(max(latency_ms), 0)::int as max_ms,
            string_agg(distinct coalesce(stop_reason, '-'), ',') as stops, string_agg(distinct coalesce(refusal_category, '-'), ',') as refusals
       from web.llm_calls where class_id = $1 group by task, status order by task, status`,
    [classId],
  );
  console.log('\n실제 Claude 기록(llm_calls · 이 학급):');
  for (const r of rows) console.log(`  ${r.task} · ${r.status} · ${r.n}회 · 입력 ${r.input} · 출력 ${r.output} · 캐시 읽기 ${r.cache_read} · 합 ${(r.ms / 1000).toFixed(1)}s · 최장 ${(r.max_ms / 1000).toFixed(1)}s · stop ${r.stops} · 거절 ${r.refusals}`);
  if (llmLog.length) {
    console.log('단계별:');
    for (const l of llmLog) console.log(`  ${l.what} — ${l.verdict} · ${l.source} · 호출 ${l.calls} · ${l.seconds}s · ${l.note}`);
  }
}

/** 모둠 기업가치(market_state) · 움직인 소식 kind 목록. */
async function valuation(teamId: string): Promise<{ price: number; kinds: string[]; process: string[] }> {
  const [st] = await sql<{ price_usd: string }>('select price_usd from web.market_state where team_id = $1', [teamId]);
  const moved = await sql<{ kind: string }>(
    `select e.kind from web.valuations v join web.board_events e on e.id = v.event_id where v.team_id = $1 and v.change_pct is not null order by v.id`,
    [teamId],
  );
  const proc = await sql<{ step_id: string }>('select step_id from web.process_scores where team_id = $1 order by step_id', [teamId]);
  return { price: Number(st?.price_usd ?? 0), kinds: moved.map((m) => m.kind), process: proc.map((p) => p.step_id) };
}

// ── 한 모둠의 단계별 흐름 ──

interface Team {
  key: 'A' | 'B';
  id: string;
  ticker: string;
  diseaseId: string;
  targetId: string;
  people: [Agent, Agent];
  revisionId: string;
  variantAdmet: string[];
  patentId: string;
  codeName: string;
}

const RESULT_KINDS = ['listing', 'patent', 'preclinical', 'ind_approved', 'trial_pass', 'approval', 'investment'];

const AGREE: Record<ScreenAgenda, [number, string]> = { mw: [500, 'gut'], tpsa: [120, 'gut'], ro5: [1, 'soft'], alert: [0, 'fix'], qed: [0.3, 'like'], score: [0.3, 'grow'] };

async function discover(t: Team): Promise<void> {
  const [p, q] = t.people;
  // 1.1 — 둘이 추천 카드 → 확정
  for (const s of t.people) await s.ok('POST', API.picks, { diseaseId: t.diseaseId, note: `${s.name} 추천 — 근거가 많아요` });
  await p.ok('POST', API.target, { diseaseId: t.diseaseId });
  const b = await p.board();
  t.revisionId = b.program.revisionId;
  assert.equal(stateOf(b, '1.1'), 'done');
  assert.equal(b.track ?? 'drug', 'drug', '트랙 등록표 — 지금은 소분자');

  // 1.2 — 브리핑 · 회의 6안건(제안 + 찬성 = 정족수 2) · 실행
  for (const s of t.people) await s.ok('POST', SCREEN_API.briefing, { question: 'read', answer: '1' });
  for (const a of SCREEN_AGENDAS) {
    const [value, reason] = AGREE[a];
    await p.ok('POST', SCREEN_API.proposals, { agenda: a, value, reason });
    await q.ok('POST', SCREEN_API.votes, { agenda: a, proposedBy: p.userId, value, reason }, [200, 409]);
  }
  const agreed = await q.get<ScreenResponse>(SCREEN_API.screen);
  assert.ok(agreed.allAgreed, `합의 ${JSON.stringify(agreed.agreed)}`);
  const run = await q.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '1.2', params: {} });
  const [screenJob] = await waitJobs(p, [run.job.id]);
  assert.equal(screenJob!.status, 'succeeded');
  const screen = await p.get<ScreenResponse>(SCREEN_API.screen);
  assert.ok(screen.shelf && screen.shelf.passIds.length >= 4, `진열대 ${screen.shelf?.passIds.length}`);
  // 찜 — 진열대 앞 4개를 둘이 2개씩(근거 'top')
  const ds = await p.get<ScreenDatasetResponse>(SCREEN_API.compounds);
  const shelf = screen.shelf!.passIds;
  for (const [i, s] of [p, p, q, q].entries()) await s.ok('POST', API.claims, { compoundId: shelf[i], reason: 'top', screenJobId: screen.shelf!.jobId });
  const b12 = await p.board();
  assert.equal(stateOf(b12, '1.2'), 'done');
  assert.equal(b12.claims.length, 4);
  assert.ok(b12.claims.every((c) => c.vinaKcal === null), '§5.5.1 화면 응답에 사전 Vina 값 없음');

  // 2.1 — 각자 찜한 분자 1개 + 그 변형체(새 물질 — 특허 신규성) 도킹
  const smilesOf = (id: string) => ds.compounds.find((c) => c.id === id)!.smiles;
  const firstWave = await Promise.all([p, q].map((s, i) => s.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '2.1', params: { smiles: smilesOf(shelf[i * 2]!), label: `${t.key}-원본${i + 1}` } })));
  const originals = await waitJobs(p, firstWave.map((r) => r.job.id));
  assert.ok(originals.every((j) => j.status === 'succeeded'), originals.map((j) => j.status).join(','));
  const variants: string[] = [];
  for (const [i, s] of [p, q].entries()) {
    const base = smilesOf(shelf[i * 2]!);
    let v = '';
    for (const cand of [`C${base}`, `${base}F`, `F${base}`, `${base}C`]) {
      const r = await s.call('POST', API.properties, { smiles: cand });
      if (r.status === 200) {
        v = cand;
        break;
      }
    }
    assert.ok(v, `변형체를 만들지 못했어요(${base})`);
    variants.push((await s.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '2.1', params: { smiles: v, label: `${t.key}-변형${i + 1}`, parentJobId: originals[i]!.id } })).job.id);
  }
  const vjobs = await waitJobs(p, variants);
  assert.ok(vjobs.every((j) => j.status === 'succeeded'));
  assert.equal(stateOf(await p.board(), '2.1'), 'done');

  // 2.2 — 대기열(근거 칩은 화면과 같은 함수로 막히지 않는 것) · ADMET · 특허 후보
  const sel = await p.get<SelectionResponse>(SELECTION_API.get);
  for (const [i, s] of [p, q].entries()) {
    const d = sel.docked.find((x) => x.jobId === variants[i])!;
    const order = DOCK_REASONS.map((r) => ({ r, v: dockReasonVerdict(r, { kcal: d.kcal, referenceKcal: sel.gauge!.referenceKcal, p: d.p, origin: d.origin, parentKcal: d.parentKcal, queue: [] }) }))
      .filter((x) => x.v.status !== 'block')
      .sort((a, b) => (a.v.status === 'ok' ? 0 : 1) - (b.v.status === 'ok' ? 0 : 1));
    let added = false;
    for (const { r } of order) {
      const res = await s.call('POST', SELECTION_API.dockPicks, { dockingJobId: d.jobId, reason: r });
      if (res.status === 201) {
        added = true;
        break;
      }
    }
    assert.ok(added, `${s.name} 대기열 담기 — 근거 칩이 모두 막힘`);
  }
  const admetRuns = await Promise.all([p, q].map((s, i) => s.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '2.2', params: { dockingJobId: variants[i] } })));
  const admets = await waitJobs(p, admetRuns.map((r) => r.job.id));
  assert.ok(admets.every((j) => j.status === 'succeeded'));
  const sel2 = await p.get<SelectionResponse>(SELECTION_API.get);
  const done = sel2.admet.filter((a) => a.status === 'succeeded');
  const facts = (a: AdmetView) => {
    const cell = a.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!;
    const best = Math.max(...done.map((x) => x.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!.efficacy));
    return { signals: a.signals, radarOut: a.radarOut.length, efficacy: cell.efficacy, safety: cell.safety, bestEfficacy: best, cns: sel2.cns, indSafetyMin: sel2.indSafetyMin };
  };
  t.variantAdmet = admetRuns.map((r) => r.job.id);
  for (const [i, s] of [p, q].entries()) {
    const a = done.find((x) => x.jobId === t.variantAdmet[i])!;
    const reason = candidateReasonsFor(sel2.cns).find((r) => candidateReasonVerdict(r, facts(a)).status !== 'block');
    assert.ok(reason, `${s.name} 특허 후보 근거 — 모두 막힘`);
    await s.ok('POST', SELECTION_API.leadCandidates, { admetJobId: a.jobId, reason });
  }
  const b22 = await p.board();
  assert.deepEqual(doneSteps(b22), ['1.1', '1.2', '2.1', '2.2']);
  assert.equal(stateOf(b22, '3.1'), 'ready');
}

async function patent(t: Team, teacher: Agent, disease: string, gene: string): Promise<void> {
  const [p, q] = t.people;
  const pats = await p.get<PatentsResponse>(PATENT_API.patents);
  const cand = pats.candidates.find((c) => c.admetJobId === t.variantAdmet[0]);
  assert.ok(cand, '2.2 특허 후보가 3.1 후보 카드에 보여요');
  assert.equal(cand.known, false, '변형체는 새 물질');
  const app = (await p.ok<{ application: { id: string } }>('POST', PATENT_API.applications, { admetJobId: cand.admetJobId })).application;
  t.codeName = `${t.ticker}-101`;
  await p.ok('PUT', PATENT_API.code(app.id), { codeName: t.codeName, expectedCode: null });
  const body: Record<string, string> = {
    code_tick: `${t.ticker} = 우리 스타트업 이름표`,
    code_num: '101 = 1번 프로그램의 첫 후보',
    mech_how: 'selective,reversible',
    mech_action: 'inhibitor',
    mech_why: `${gene} 결합 주머니에 붙었다 떨어지는 결합이라서`,
    title: `${gene} 억제 활성을 갖는 새 화합물`,
    field: `${disease} 치료를 위한 ${gene} 억제제`,
    background: `기준 약은 하루 한 번 복용에서 혈중 농도가 흔들리는 한계가 있어 더 안정한 후보가 필요해요.`,
    claim1: '구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염.',
    claim2: `청구항 1 의 화합물을 유효성분으로 포함하는 ${disease} 예방 또는 치료용 약학 조성물.`,
    effect: '도킹 ΔG 가 원본 분자보다 깊어졌고 2.2 신호등에서 심장 · 간 위험이 낮아 기준 약 대비 장점이 있어요.',
    summary: `${gene} 를 가역적으로 억제하는 새 화합물과 그 용도.`,
    inventors: `${p.userId},${q.userId}`,
  };
  const view = (await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!;
  for (const [key, text] of Object.entries(body)) {
    const cur = view.sections.find((s) => s.section === key);
    await (key.length % 2 ? p : q).ok('PUT', PATENT_API.section(app.id, key), { body: text, expectedVersion: cur?.version ?? 0 });
  }
  const v = (await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!;
  const rv = await q.ok<{ review: { id: string; verdict: string; stage: string; ruleFindings: Array<{ id: string; status: string; note: string }> } }>('POST', PATENT_API.review(app.id), { docVersion: v.version });
  assert.equal(rv.review.verdict, 'pending', `규칙 단계에서 막힘: ${JSON.stringify(rv.review.ruleFindings.filter((f) => f.status === 'fail'))}`);
  await reviewGate(teacher, rv.review.id, `모둠 ${t.key} 3.1 특허`);
  const accepted = await waitFor(async () => {
    const x = (await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!;
    return x.status === 'accepted' ? x : undefined;
  }, 10_000, '받아들여짐');
  assert.ok(accepted);
  const [row] = await sql<{ id: string }>(`select id from web.patents where application_id = $1 and status = 'active'`, [app.id]);
  t.patentId = row!.id;
  const fee = await sql(`select 1 from web.ledger where team_id = $1 and kind = 'patent_fee'`, [t.id]);
  assert.equal(fee.length, 1, '출원료 1회');
  assert.equal(stateOf(await p.board(), '3.1'), 'done');
}

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}${API.health}`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  console.log(`서버 ${BASE} · 접미 ${suffix}${REAL_LLM ? ' · 1상 시뮬레이션 실제 Claude' : ''}\n`);

  // ── 준비 ──
  const teacher = new Agent('교사');
  let cls!: TeacherClassDetail;
  const A: Team = { key: 'A', id: '', ticker: `F${letters(suffix).slice(0, 2)}A`, diseaseId: '', targetId: 'ache-4ey7', people: [new Agent('가람'), new Agent('나래')], revisionId: '', variantAdmet: [], patentId: '', codeName: '' };
  const B: Team = { key: 'B', id: '', ticker: `F${letters(suffix).slice(0, 2)}B`, diseaseId: '', targetId: 'dpp4-1x70', people: [new Agent('다온'), new Agent('라온')], revisionId: '', variantAdmet: [], patentId: '', codeName: '' };
  const teacherLogin = `tf${suffix}`;
  const secret = createTeacher(teacherLogin);
  await stage('준비 — 교사 · 학급(모둠 2) · 학생 4 가입 · 입사 · 등기(상장 소식)', async () => {
    await teacher.ok('POST', API.login, { loginId: teacherLogin, password: secret.password });
    cls = await teacher.ok<TeacherClassDetail>('POST', API.classes, { name: `통합 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 });
    A.id = cls.teams[0]!.id;
    B.id = cls.teams[1]!.id;
    for (const [t, tag] of [[A, 'a'], [B, 'b']] as const) {
      for (const [i, s] of t.people.entries()) {
        const up = await s.ok<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `f${suffix}${tag}${i}`, displayName: s.name, password });
        s.userId = up.account.userId;
        await s.ok('POST', API.join(t.id));
      }
      await t.people[0].ok('POST', API.registration(t.id), { name: `${t.key === 'A' ? '가람제약' : '다온바이오'}${suffix.slice(0, 3)}`, ticker: t.ticker });
    }
    const b = await A.people[0].board();
    A.diseaseId = b.diseases.find((d) => d.targetId === A.targetId)!.diseaseId;
    B.diseaseId = b.diseases.find((d) => d.targetId === B.targetId)!.diseaseId;
    assert.equal(b.steps.length, 9);
    const listing = await waitFor(async () => {
      const r = await sql<{ n: number }>(`select count(*)::int as n from web.board_events where class_id = $1 and kind = 'listing'`, [cls.id]);
      return r[0]!.n === 2 ? r : undefined;
    }, 10_000, '상장 소식 2줄');
    assert.ok(listing);
  });

  // ── 발견 · 최적화 ──
  await stage('모둠 A 1.1 → 2.2 — 표적 ACHE · 회의 6안건 합의 · 1.2 실행 · 찜 4 · 도킹 4(변형체 2) · 대기열 · ADMET 2 · 특허 후보 2', () => discover(A));
  await stage('모둠 B 1.1 → 2.2 — 표적 DPP4 · 같은 흐름', () => discover(B));

  await stage('FLEARN Series A — 2.2 뒤 열림(3판 번호) · 정량 몫 입금 · 사옥 Tier 2', async () => {
    const [p] = A.people;
    const pitch =
      '우리 모둠은 네 사람이 서로 다른 찜 분자를 도킹하고 그중 결합이 깊어진 변형체 두 개를 특허 후보로 올렸어요. 주력은 원본보다 ΔG 가 깊고 심장 · 간 신호가 낮은 분자이고, 백업은 물성이 다른 계열이라 주력이 막히면 바로 바꿀 수 있어요. 약점은 아직 뇌 노출을 직접 재지 않은 점이라 전임상에서 확인할 계획이에요. 회의에서 정한 깔때기 기준과 찜 근거를 노트에 남겨 두었고, 다음 단계 비용도 미리 계산해 두었어요.';
    const r = await p.ok<{ id: string }>('POST', LEARN_API.pitch('series_a'), { pitch });
    // LLM 을 끈 서버 — 정성 몫은 pending. 교사 정정으로 최종 금액이 정해지면 전광판 'investment' 소식이 한 번 나간다(FLEARN 규칙).
    await teacher.ok('POST', LEARN_API.teacherOverride, { targetType: 'pitch', targetId: r.id, score: 24 });
    const [team] = await sql<{ hq_tier: number }>('select hq_tier from web.teams where id = $1', [A.id]);
    assert.ok(team!.hq_tier >= 2, `사옥 Tier ${team!.hq_tier}`);
  });

  // ── 3.1 ──
  await stage('모둠 A 3.1 — 출원서 · 코드명 · 13칸 · 심사 pending → 교사 통과 → 등록 · 출원료 1회 · 3.1 완료', () => patent(A, teacher, '알츠하이머병', 'ACHE'));
  await stage('모둠 B 3.1 — 같은 흐름(다른 표적 · 학급 중복 없음)', () => patent(B, teacher, '2형 당뇨병', 'DPP4'));
  const vAfterPatent = await valuation(A.id);
  await stage('FMARKET — 특허 소식이 두 모둠 기업가치를 움직였어요(결과 소식 · 공개 칸에 SMILES 없음)', async () => {
    assert.ok(vAfterPatent.kinds.includes('patent'), JSON.stringify(vAfterPatent.kinds));
    const vb = await valuation(B.id);
    assert.ok(vb.kinds.includes('patent'));
    const ev = await sql<{ public: Record<string, unknown> }>(`select public from web.board_events where class_id = $1 and kind = 'patent'`, [cls.id]);
    assert.equal(ev.length, 2);
    for (const e of ev) assert.ok(!/[=#()\[\]]{1}.*c1|smiles/i.test(JSON.stringify(e.public)), JSON.stringify(e.public));
  });

  // ── 3.2 ──
  const [a1, a2] = A.people;
  let animalJobId = '';
  await stage('모둠 A 3.2 — 윤리 이수 2 · 계획서 설정 · 5칸 · 심의 pending → 교사 통과 · 동물실험 · 30게임 일 → 결과 · 계산 칸 · 주력 지정 · 3.2 완료', async () => {
    for (const s of A.people) {
      const r = await s.ok<{ passed: boolean }>('POST', PRECLINICAL_API.ethics, { answers: { q1: 'replacement', q2: 'D', q3: 'weight20' } });
      assert.equal(r.passed, true);
    }
    let st = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
    assert.equal(st.unlocked, true);
    await a1.ok('PUT', PRECLINICAL_API.settings, { expectedVersion: st.protocol?.settingsVersion ?? 0, level: 'standard', patentIds: [A.patentId], painGrade: st.model?.painGrade ?? 'C', endpointPct: 20, performerIds: [a1.userId, a2.userId] });
    const sections: Record<string, string> = {
      purpose: '사람에게 처음 주기 전에 안전한 최대 용량(MRSD)을 정하려고 동물에서 반복투여 독성을 봐요.',
      replacement: '세포 hERG 패치클램프와 간 오가노이드로 먼저 걸렀어요. 하지만 몸 전체의 흡수와 대사는 세포로 알 수 없어요.',
      reduction: '특허 후보 한 개만 넣고, 통계적으로 믿을 수 있는 알맞게 수준을 골랐어요.',
      refinement: '마취와 진통제를 쓰고, 체중이 20% 줄면 실험을 끝내요. 사육 환경을 넉넉히 해요.',
      species: '설치류와 비설치류에서 독성이 다르게 나올 수 있어 랫드와 비글견을 함께 봐요.',
    };
    for (const [k, v] of Object.entries(sections)) await a2.ok('PUT', PRECLINICAL_API.section(k), { body: v, expectedVersion: 0 });
    st = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
    const rv = await a1.ok<{ review: { id: string; verdict: string; ruleFindings: Array<{ status: string; note: string }> } }>('POST', PRECLINICAL_API.review, { expectedVersion: st.protocol!.version });
    assert.equal(rv.review.verdict, 'pending', JSON.stringify(rv.review.ruleFindings.filter((f) => f.status === 'fail')));
    await reviewGate(teacher, rv.review.id, '모둠 A 3.2 동물실험계획서');
    st = await waitFor(async () => {
      const x = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
      return x.protocol?.status === 'approved' ? x : undefined;
    }, 10_000, '계획서 승인');
    const run = await a1.ok<{ run: { jobId: string } }>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: A.patentId, kind: 'animal_study' });
    animalJobId = run.run.jobId;
    await a2.ok('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: A.patentId, kind: 'alt_assay', assay: 'herg' });
    await advance(cls.id, 30);
    st = await waitFor(async () => {
      const x = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
      return x.runs.length >= 2 && x.runs.every((r) => r.status === 'succeeded') ? x : undefined;
    }, 30_000, '동물실험 끝(게임 시계)');
    const study = st.runs.find((r) => r.kind === 'animal_study')!;
    const res = study.result?.kind === 'animal_study' ? study.result : null;
    assert.ok(res, '동물실험 결과');
    const hedRat = res.noaelMgPerKgDay.rat / 6.2;
    const hedDog = res.noaelMgPerKgDay.dog / 1.8;
    const calc = await a2.ok<{ ok: boolean; fields: Record<string, boolean> }>('PUT', PRECLINICAL_API.calc(study.jobId), { hedRat, hedDog, hed: res.hedMgPerKg, mrsd: res.mrsdMgByForm.oral });
    assert.equal(calc.ok, true, JSON.stringify(calc.fields));
    await a1.ok('PUT', PRECLINICAL_API.lead, { leadPatentId: A.patentId, backupPatentId: null, reason: 'start_dose_room', expectedVersion: st.lead.version });
    const b = await a1.board();
    assert.equal(stateOf(b, '3.2'), 'done');
    assert.equal(b.program.lead?.jobId, A.variantAdmet[0], 'F32 주력 = 그 특허의 2.2 작업(F33 · F41 이 읽는 칸)');
  });

  // ── 3.3 ──
  await stage('모둠 A 3.3 — IND 신청서 · 조합(MRSD 이하 · S ≥ 35) · 12칸 · 규칙 fail 0 · 심사 pending → 교사 통과 · 접수(수수료 1회) · 30게임 일 → 승인', async () => {
    let ind = await a1.get<IndResponse>(IND_API.ind);
    assert.equal(ind.ready, true, ind.readyReason ?? '');
    const lead = ind.candidates.find((c) => c.role === 'lead')!;
    assert.equal(lead.patentId, A.patentId);
    const mrsd = lead.animal!.mrsdMgByForm;
    const pool = lead.grid!.filter((c) => c.dose <= mrsd[c.form] && c.safety >= 35 && c.form !== 'transdermal').sort((x, y) => y.efficacy - x.efficacy);
    // 실제 Claude 모드 — 1상 안전 기준(S 50)을 넘는 조합이 있으면 그중 효능이 가장 높은 것을 고른다(화면의 '1상 기준까지 n 모자라요' 안내를 따르는 학생).
    const cell = (REAL_ALL ? pool.find((c) => c.safety >= 50) : undefined) ?? pool[0];
    assert.ok(cell, `MRSD 이하 · S ≥ 35 조합 없음 ${JSON.stringify(mrsd)}`);
    const app = (await a1.ok<{ application: { id: string } }>('POST', IND_API.applications)).application;
    ind = await a1.get<IndResponse>(IND_API.ind);
    await a1.ok('PUT', IND_API.plan(app.id), { expectedPlanVersion: ind.application!.planVersion, form: cell.form, doseMg: cell.dose, population: ind.trial!.populations[0], endpoint: ind.trial!.endpoints[0] });
    const S: Record<string, string> = {
      title: `경도 알츠하이머병 환자를 위한 ${A.codeName} 첫 사람 시험(제1상)`,
      dev_plan: '알츠하이머병은 아세틸콜린이 줄어 기억이 나빠지는 병이에요. 1상에서 안전성을, 2상에서 인지 점수를, 3상에서 큰 환자군의 효과를 확인해요.',
      form_reason: '경구 흡수 신호가 좋아 매일 먹기 쉬운 알약으로 정했어요. 정맥보다 몸이 받는 부담이 낮아요.',
      nonclinical: `랫드와 개에서 반복투여 독성을 봤고 더 민감한 종을 기준으로 HED ${lead.animal!.hedMgPerKg} mg/kg 를 정했어요.`,
      calc_hed: String(lead.animal!.hedMgPerKg),
      calc_mrsd: String(mrsd[cell.form]),
      subject: '건강한 성인 지원자 — 첫 시험은 안전만 보므로 병이 없는 사람에게 낮은 용량부터 줘요.',
      stop_rule: '심전도 QT 간격이 기준보다 30 ms 넘게 늘거나 간 수치가 정상 상한의 3배를 넘으면 그 용량 단계를 멈춰요.',
      risk_monitor: '투여 전후 심전도로 QT 를 재고, 간 수치도 주마다 재요.',
      consent: '처음 사람에게 쓰는 약이라 모르는 위험이 있어요. 언제든 그만둘 수 있어요. 임상시험심사위원회(IRB) 심의를 받은 뒤 시작해요.',
      pledge_hold: IND_PLEDGE_BODY,
      pledge_report: IND_PLEDGE_BODY,
    };
    ind = await a1.get<IndResponse>(IND_API.ind);
    for (const [k, v] of Object.entries(S)) {
      const cur = ind.application!.sections.find((s) => s.section === k);
      await a2.ok('PUT', IND_API.section(app.id, k), { body: v, expectedVersion: cur?.version ?? 0 });
    }
    ind = await a1.get<IndResponse>(IND_API.ind);
    assert.deepEqual(ind.application!.rulePreview.filter((f) => f.status === 'fail').map((f) => f.note), []);
    const rv = await a1.ok<{ review: { id: string; verdict: string } }>('POST', IND_API.review(app.id), { expectedVersion: ind.application!.version });
    assert.equal(rv.review.verdict, 'pending');
    await reviewGate(teacher, rv.review.id, '모둠 A 3.3 IND');
    ind = await waitFor(async () => {
      const x = await a1.get<IndResponse>(IND_API.ind);
      return x.application?.status === 'passed' ? x : undefined;
    }, 10_000, 'IND 서류 통과');
    await a2.ok('POST', IND_API.submit(app.id), { expectedVersion: ind.application!.version });
    const fees = await sql(`select 1 from web.ledger where team_id = $1 and kind = 'ind_fee'`, [A.id]);
    assert.equal(fees.length, 1);
    await advance(cls.id, 31);
    await waitFor(async () => ((await a1.get<IndResponse>(IND_API.ind)).application?.status === 'approved' ? true : undefined), 30_000, 'IND 승인');
    const b = await a1.board();
    assert.equal(stateOf(b, '3.3'), 'done');
    assert.equal(b.steps.find((s) => s.id === '4.1')!.sub, '1상 준비');
  });

  // ── 4.1 ──
  /** 한 시도 — 열기 · 모집(집중) · 시작(과금 1회) · 시뮬레이션(실제 Claude 또는 교사 수동) · 끝나는 날 공개. 보류면 그 시도를 돌려준다. */
  const runTrial = async (no: number, route: 'first' | 'next' | 'same' | 'amend', real: boolean, combo?: { form: string; doseMg: number }): Promise<ClinicalResponse['trials'][number]> => {
    const opened = await a1.ok<{ trialId: string }>('POST', CLINICAL_API.open, { route, ...combo });
    const trialId = opened.trialId;
    await a2.ok('PUT', CLINICAL_API.tier(trialId), { tier: 'focus' });
    await waitFor(async () => {
      const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
      if (c.current && c.current.recruit.enrolled >= c.current.recruit.minN) return c;
      await advance(cls.id, 20);
      return undefined;
    }, 90_000, `${no}상 최소 인원`, 5500);
    await a2.ok('POST', CLINICAL_API.start(trialId));
    const fee = await sql(`select 1 from web.ledger where team_id = $1 and idem_key = $2`, [A.id, `trial:${trialId}:start`]);
    assert.equal(fee.length, 1, '[임상 시작] 과금 1회');
    if (real) {
      // 이 프로세스에서 실제 Claude 를 부른다(다른 서버의 틱이 먼저 임대해도 한 번만 부른다 — 임대 · 입력 해시 캐시).
      const deps = llmDeps();
      const t0 = Date.now();
      const calls = async () => (await sql<{ n: number }>('select count(*)::int as n from web.llm_calls where ref_id = $1', [trialId]))[0]!.n;
      const row = await waitFor(async () => {
        // 비용 상한 — 한 시도에 4회(시뮬레이션 2회 × 재시도 1)를 넘기지 않는다.
        if ((await calls()) >= 4) throw new Error(`${no}상 시뮬레이션 — 호출 4회에도 ready 가 아니에요`);
        await sql(`update web.clinical_trials set sim_status = 'queued', sim_next_at = null where id = $1 and sim_status in ('queued', 'manual') and status = 'running'`, [trialId]);
        await runSimulation(deps, trialId);
        const [x] = await sql<{ sim_status: string; result_model: string | null; sim_error: string | null }>('select sim_status, result_model, sim_error from web.clinical_trials where id = $1', [trialId]);
        return x!.sim_status === 'ready' ? x : undefined;
      }, 400_000, '실제 Claude 시뮬레이션', 3000);
      const n = await calls();
      console.log(`    · ${no}상 시뮬레이션 ready · 모델 ${row.result_model} · 호출 ${n}`);
      llmLog.push({ what: `모둠 A 4.1 ${no}상 시뮬레이션(${route})`, verdict: 'ready', source: 'llm', calls: n, seconds: Math.round((Date.now() - t0) / 1000), note: `모델 ${row.result_model}` });
      assert.equal((await a1.get<ClinicalResponse>(CLINICAL_API.view)).current?.result ?? null, null, '끝나는 날 전에는 결과를 숨겨요');
    } else {
      // 교사 승인 폐지(0040 · 2026-10-24) 뒤에는 LLM 이 꺼져 있으면 서버가 규칙 결과(result_source 'rule')를 바로 담아요. 이 분자(ΔG −9.7)는
      // 어떤 제형 · 용량도 1 · 2 · 3상 기준을 모두 넘지 못해 규칙으로는 끝까지 갈 수 없어서, 공개 전에 교사가 '통과'로 정정해요(결과가 있으면 override).
      const decide = (override: boolean) => teacher.call('POST', CLINICAL_API.teacherDecide(trialId), { verdict: 'pass', note: '통합 점검 — 교사 판정', override });
      // 서버 틱이 규칙 결과를 담을 때까지 잠깐 기다린다(담기 전후로 겹치면 409 — 그때는 override 로 다시).
      const ready = await waitFor(async () => {
        const [x] = await sql<{ sim_status: string }>('select sim_status from web.clinical_trials where id = $1', [trialId]);
        return x!.sim_status === 'ready' ? true : undefined;
      }, 20_000, `${no}상 규칙 결과`).catch(() => false);
      let d = await decide(ready);
      if (d.status === 409) d = await decide(true);
      assert.equal(d.status, 200, `교사 판정 ${show(d)}`);
    }
    const [t] = await sql<{ ends_game_day: number }>('select ends_game_day from web.clinical_trials where id = $1', [trialId]);
    const today = (await a1.get<ClinicalResponse>(CLINICAL_API.view)).gameDay;
    await advance(cls.id, Math.ceil(Number(t!.ends_game_day) - today) + 2);
    const after = await waitFor(async () => {
      const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
      const x = c.trials.find((y) => y.id === trialId)!;
      return x.status === 'pending' || x.status === 'completed' || x.status === 'held' ? x : undefined;
    }, 30_000, `${no}상 끝나는 날`);
    if (after.status === 'pending') {
      const d = await teacher.call('POST', CLINICAL_API.teacherDecide(trialId), { verdict: 'pass', note: '통합 점검' });
      assert.equal(d.status, 200, show(d));
    }
    const fin = await waitFor(async () => {
      const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
      const x = c.trials.find((y) => y.id === trialId)!;
      return (x.status === 'completed' || x.status === 'held') && x.result ? x : undefined;
    }, 10_000, `${no}상 결과 공개`);
    if (real) {
      assert.equal(fin.resultSource, 'llm');
      const last = llmLog[llmLog.length - 1];
      if (last) last.verdict = `${fin.verdict}${fin.holdKind ? `(${fin.holdKind})` : ''}`;
    }
    const ev = await sql<{ kind: string; public: Record<string, unknown> }>(`select kind, public from web.board_events where class_id = $1 and idem_key = $2`, [cls.id, `trial:${trialId}:verdict`]);
    assert.equal(ev[0]?.kind, fin.verdict === 'pass' ? 'trial_pass' : 'trial_held');
    assert.ok(!('score' in (ev[0]!.public ?? {})));
    return fin;
  };
  const phases = ['phase1', 'phase2', 'phase3'] as const;
  for (const [i, phase] of phases.entries()) {
    const real = REAL_ALL || (REAL_LLM && phase === 'phase1');
    await stage(`모둠 A 4.1 ${i + 1}상 — 모집(집중) · 최소 인원 · [임상 시작] 과금 1회 · 끝나는 날 ${real ? '실제 Claude 시뮬레이션 공개' : '판정 대기 → 교사 통과'} · 전광판 소식 · 보류면 같은 프로토콜로 재도전`, async () => {
      let fin = await runTrial(i + 1, i === 0 ? 'first' : 'next', real);
      for (let retry = 1; fin.verdict !== 'pass'; retry++) {
        assert.ok(retry <= 2, '재도전 2번에도 보류');
        const b = await a1.board();
        assert.match(b.steps.find((s) => s.id === '4.1')!.sub ?? '', /보류 · 재도전 가능/);
        // 실제 Claude 모드 — 학생처럼 보류 종류에 맞는 경로를 고른다: 안전 보류면 S 가 가장 높은, 효능 보류면 E 가 가장 높은 '용량 · 제형 바꾸기' 조합(이 상에 머무는 것만). 없으면 같은 프로토콜.
        let combo: { form: string; doseMg: number } | undefined;
        if (REAL_ALL) {
          const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
          const opts = (c.routes.find((r) => r.route === 'amend' && r.available)?.options ?? []).filter((o) => o.ok && !o.resetsToPhase1);
          const key = fin.holdKind === 'efficacy' ? 'efficacy' : 'safety';
          const best = [...opts].sort((x, y) => y[key] - x[key] || y.efficacy - x.efficacy)[0];
          if (best) combo = { form: best.form, doseMg: best.doseMg };
        }
        console.log(`    · ${i + 1}상 보류(${fin.holdKind ?? '—'} · 출처 ${fin.resultSource}) — ${combo ? `용량 · 제형 바꿔 재도전(${combo.form} ${combo.doseMg} mg)` : '같은 프로토콜로 재도전'} ${retry}`);
        // 재도전은 교사 수동 판정(비용 상한 — 실제 Claude 는 상마다 첫 시도만). 이 분자처럼 모든 상을 넘는 조합이 없으면 실제 Claude 로는 계속 보류예요(§9).
        fin = await runTrial(i + 1, combo ? 'amend' : 'same', false, combo);
      }
      assert.equal(fin.verdict, 'pass');
    });
  }
  await stage('4.1 완료 — 3상 통과 · 사이드바 4.1 done · 4.2 열림', async () => {
    const b = await a1.board();
    assert.equal(stateOf(b, '4.1'), 'done');
    assert.equal(stateOf(b, '4.2'), 'ready');
  });

  // ── 4.2 ──
  await stage('모둠 A 4.2 — 브랜드 · 포장(=제형) · 3칸 · 심사 pending → 교사 통과 · 접수(수수료 1회) · 60게임 일 → 허가 · 허가증 · 영수증 · 사옥 Tier 3', async () => {
    let g = await a1.get<ApprovalResponse>(APPROVAL_API.get);
    assert.ok(g.phase3, g.lockedReason ?? '');
    const brand = `통합${letters(suffix).slice(0, 3).toLowerCase()}`.replace(/[a-z]/g, (ch) => '가나다라마바사아자차카타파하'[ch.charCodeAt(0) % 14]!);
    await a1.ok('PUT', APPROVAL_API.brand, { name: `뉴로${brand}`.slice(0, 12), expectedVersion: g.application?.brandVersion ?? 0 });
    g = await a1.get<ApprovalResponse>(APPROVAL_API.get);
    const shape = g.phase3!.form === 'oral' ? 'tablet' : g.phase3!.form === 'iv' ? 'vial' : 'patch';
    await a2.ok('PUT', APPROVAL_API.pack, { shape, color: 'sage', layout: 'top', expectedVersion: g.application!.packVersion });
    const S = {
      indication: '경도 알츠하이머병 성인의 인지 기능 저하를 늦춰요(3상 1차 평가지표).',
      caution1: '심장 리듬(QT) 이상이 있거나 같은 약을 먹고 있으면 의사와 먼저 상의해요.',
      caution2: `하루 한 번 ${g.phase3!.doseMg} mg 만 먹고, 어지럽거나 가슴이 두근거리면 병원에 연락해요.`,
    };
    for (const [k, v] of Object.entries(S)) await a1.ok('PUT', APPROVAL_API.section(k), { body: v, expectedVersion: 0 });
    const rv = await a2.ok<{ review: { id: string; verdict: string; ruleFindings: Array<{ status: string; note: string }> } }>('POST', APPROVAL_API.review);
    assert.equal(rv.review.verdict, 'pending', JSON.stringify(rv.review.ruleFindings.filter((f) => f.status === 'fail')));
    await reviewGate(teacher, rv.review.id, '모둠 A 4.2 NDA');
    await waitFor(async () => ((await a1.get<ApprovalResponse>(APPROVAL_API.get)).application?.status === 'passed' ? true : undefined), 10_000, '허가 서류 통과');
    await a1.ok('POST', APPROVAL_API.submit);
    await advance(cls.id, 61);
    g = await waitFor(async () => {
      const x = await a1.get<ApprovalResponse>(APPROVAL_API.get);
      return x.application?.status === 'approved' ? x : undefined;
    }, 30_000, '허가');
    assert.ok(g.certificate?.certificateNo, '허가증 번호');
    assert.ok(g.receipt.spent.length >= 6, `영수증 쓴 돈 줄 ${g.receipt.spent.length}`);
    const b = await a1.board();
    assert.deepEqual(doneSteps(b), [...STEP_IDS]);
    // 사옥 Tier 3 은 FMARKET 이 허가 소식 커밋 뒤에 올린다(그 소식을 처리한 서버 프로세스에서 — 조금 늦을 수 있다).
    await waitFor(async () => {
      const [team] = await sql<{ hq_tier: number }>('select hq_tier from web.teams where id = $1', [A.id]);
      return team!.hq_tier === 3 ? true : undefined;
    }, 40_000, '허가 → 사옥 Tier 3(FMARKET — 다른 서버가 처리했으면 15초 점검이 메움)');
  });

  await stage('FLEARN Series B — 3.1 특허 + 3.3 IND 승인 뒤 열림(3판 번호) · 입금', async () => {
    const pitch =
      '특허는 변형체 한 종을 물질로 청구해 학급에서 먼저 등록했어요. IND 는 동물실험 MRSD 이하의 경구 용량으로 시작해 예상 안전 점수가 기준을 넘는 조합을 골랐어요. 임상에서 보류가 나오면 같은 프로토콜로 다시 하거나 용량을 낮추고, 그래도 막히면 백업 후보로 바꾸는 순서로 대응할 계획이에요. 비용과 기간을 표로 미리 정리해 두었고, 각 상의 판정 근거를 연구 노트에 남겨 다음 결정을 빠르게 내릴 수 있게 했어요.';
    const r = await a2.ok<{ id: string }>('POST', LEARN_API.pitch('series_b'), { pitch });
    await teacher.ok('POST', LEARN_API.teacherOverride, { targetType: 'pitch', targetId: r.id, score: 22 });
    const inv = await sql<{ kind: string }>(`select kind from web.ledger where team_id = $1 and kind in ('pitch_series_a', 'pitch_series_b')`, [A.id]);
    // 정량 몫 먼저 · 교사 정정 차액 — 라운드마다 원장 줄이 1~2줄.
    assert.deepEqual([...new Set(inv.map((x) => x.kind))].sort(), ['pitch_series_a', 'pitch_series_b']);
    const ev = await sql(`select 1 from web.board_events where team_id = $1 and kind = 'investment'`, [A.id]);
    assert.equal(ev.length, 2, '투자 소식 라운드마다 1줄');
  });

  if (STOP === 'approval') {
    await printLlmUsage(cls.id);
    console.log(JSON.stringify({ stop: 'approval', base: BASE, classId: cls.id, teacher: teacherLogin, teacherPassword: secret.password, students: [`f${suffix}a0`, `f${suffix}a1`, `f${suffix}b0`, `f${suffix}b1`], password }));
    await db.end();
    return;
  }

  // ── 기업가치 · 과정 평가 · 마감 ──
  await stage('FMARKET — A 의 결과 소식(특허 · 전임상 · IND · 임상 3 · 허가 · 투자)이 모두 기업가치를 움직이고 · 9단계 과정 평가가 쌓였어요', async () => {
    const v = await waitFor(async () => {
      const x = await valuation(A.id);
      // 같은 DB 를 쓰는 다른 서버가 소식을 먼저 처리해 기업가치가 비면 FMARKET 점검(15초)이 메운다(backfillMoves).
      return x.process.length === 9 && RESULT_KINDS.every((k) => x.kinds.includes(k)) ? x : undefined;
    }, 120_000, '과정 평가 9단계 · 결과 소식 7종', 3000).catch(async (e: Error) => {
      const x = await valuation(A.id);
      throw new Error(`${e.message} — 과정 ${x.process.join(',')} · 움직인 소식 ${x.kinds.join(',')}`);
    });
    assert.equal(v.kinds.filter((k) => k === 'trial_pass').length, 3);
    assert.ok(v.price > vAfterPatent.price, `특허 뒤 ${vAfterPatent.price} → 지금 ${v.price}`);
    assert.deepEqual(v.process, [...STEP_IDS]);
    const vb = await valuation(B.id);
    assert.ok(vb.price < v.price, `B ${vb.price} < A ${v.price}`);
  });
  await stage('마감 — 교사 [지금 마감] → 학생 최종 순위(A 1위 · B 2위) · 다른 모둠 단계별 과정 점수는 숨김 · 마감 뒤 기업가치 고정', async () => {
    await teacher.ok('POST', MARKET_API.finalAction(cls.id), { action: 'close' });
    const fin = await B.people[0].get<MarketFinalResponse>(MARKET_API.final());
    assert.ok(fin.final, '마감 정보');
    assert.equal(fin.standings.length, 2);
    const [first, second] = [...fin.standings].sort((x, y) => x.rank - y.rank);
    assert.equal(first!.teamId, A.id);
    assert.equal(second!.teamId, B.id);
    assert.equal(first!.approved, true);
    assert.equal(first!.stepsDone, 9);
    assert.deepEqual(fin.standings.find((s) => s.teamId === A.id)!.processByStep, {}, '학생에게 다른 모둠 단계별 점수 없음');
    const before = (await valuation(A.id)).price;
    // 마감 뒤 교사 정정(+5%) — 소식은 흐르지만 기업가치는 움직이지 않는다(FMARKET 규칙).
    await teacher.ok('POST', MARKET_API.notice(cls.id), { headline: '◆ 통합 점검 — 마감 뒤 정정 소식', teamId: A.id, changePct: 5 });
    await sleep(1000);
    assert.equal((await valuation(A.id)).price, before);
  });

  await stage('공개 범위 — 학급 전광판 public 에 SMILES · 물성 · 점수 칸이 없어요', async () => {
    const smiles = (await sql<{ s: string }>(`select coalesce(canonical_smiles, smiles) as s from web.jobs where class_id = $1 and step in ('2.1', '2.2') and smiles is not null`, [cls.id])).map((r) => r.s);
    const pubs = await sql<{ kind: string; public: Record<string, unknown> }>('select kind, public from web.board_events where class_id = $1', [cls.id]);
    assert.ok(pubs.length >= 15, `소식 ${pubs.length}줄`);
    for (const e of pubs) {
      const text = JSON.stringify(e.public ?? {});
      assert.ok(!smiles.some((s) => text.includes(s)), `${e.kind} 에 SMILES`);
      assert.ok(!/"(eScore|sScore|safety|efficacy|qed|tpsa|mw|score|smiles)":/i.test(text), `${e.kind} 에 점수 · 물성 ${text}`);
    }
  });

  await printLlmUsage(cls.id);
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\n${passed}/${passed} 통과 · ${secs}s · 접미 ${suffix} · 학급 ${cls.id}`);
  await db.end();
}

main().catch(async (error: Error) => {
  console.error(error);
  await db.end().catch(() => {});
  process.exit(1);
});
