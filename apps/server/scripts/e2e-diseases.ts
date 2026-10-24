/**
 * 4대 질환 실제 데이터 완주 점검 — 한 학급 4모둠이 질환을 하나씩 골라(알츠하이머 ACHE · 폐암 EGFR · 당뇨 DPP4 · 관절염 COX2)
 * 1.1 → 4.2 허가까지 간다. 떠 있는 로컬 서버(HTTP)에 붙고, 워커는 **compute**(실제 Vina · ADMET-AI)여야 한다.
 *
 *   (워커) cd ../crista/apps/bio-worker && CRISTA_WORKER_MODE=compute ./.venv/bin/python -m uvicorn app.main:app --port 8791
 *   (서버) WEB_PORT=3470 LLM_DISABLED=1 BIO_WORKER_URL=http://127.0.0.1:8791 node tools/with-local-env.mjs node apps/server/src/index.ts
 *   WEB_PORT=3470 npm run e2e:diseases
 *   E2E_DISEASES=dpp4-1x70,cox2-3ln1 …   — 고른 표적만(쉼표)
 *
 * e2e:full 과 다른 점 — **교사 정정이 없다**. 서류 심사는 규칙 자동 판정(LLM 꺼짐)을, 임상은 규칙 판정(game-rules 흔들림 포함)을 그대로 받는다.
 * 학생이 화면에서 보는 정보로 고르는 길을 따른다: 1.2 진열대에서 우리 표적의 사내 유도체를 찜 → 2.1 실제 도킹 → 2.2 ADMET 격자(E · S)에서
 * 세 관문 여유가 가장 큰 새 물질을 특허 후보로 → 3.3 MRSD 이하 조합 중 여유가 가장 큰 것 → 4.1 목표 인원까지 모집 → 보류면 화면의 재도전 길.
 * 교사가 하는 일은 학급 만들기 · Series 피치 채점(LLM 꺼짐이라 정성 몫)뿐이다.
 * 모둠마다 어디까지 갔는지 · 막힌 까닭을 따로 모아 끝에 표로 찍는다(한 모둠이 막혀도 다른 모둠은 계속).
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
import { createPool, type Queryable } from '../src/db.ts';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3470}`;
const here = dirname(fileURLToPath(import.meta.url));
const suffix = randomBytes(3).toString('hex').slice(0, 5);
const letters = (s: string) => s.replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!).toUpperCase();
const password = `pw-${suffix}-dis`;
const started = Date.now();

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
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `4질환 점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

const stateOf = (b: BoardResponse, id: StepId) => b.steps.find((s) => s.id === id)!.state;
const doneSteps = (b: BoardResponse) => b.steps.filter((s) => s.state === 'done').map((s) => s.id);

async function waitJobs(agent: Agent, ids: string[], ms = 600_000): Promise<WebJobView[]> {
  return waitFor(async () => {
    const b = await agent.board();
    const jobs = ids.map((id) => b.jobs.find((j) => j.id === id));
    return jobs.every((j) => j && (j.status === 'succeeded' || j.status === 'failed')) ? (jobs as WebJobView[]) : undefined;
  }, ms, `작업 ${ids.length}건`, 2000);
}

/** 학급 게임 시계를 앞당긴다(처리기는 서버 5초 틱). 모둠들이 같은 학급이라 한 번에 한 모둠만 당긴다. */
let clockBusy = Promise.resolve();
async function advance(classId: string, days: number): Promise<void> {
  const run = clockBusy.then(() => sql('update web.classes set clock_anchor_day = clock_anchor_day + $2 where id = $1', [classId, days]).then(() => {}));
  clockBusy = run.catch(() => {});
  await run;
}

// ── 질환별 글 ──

interface Disease {
  targetId: string;
  gene: string;
  label: string;
  /** 3.3 · 4.2 문장에 쓰는 병 이름. */
  sick: string;
  brand: string;
}
const DISEASES: Disease[] = [
  { targetId: 'ache-4ey7', gene: 'ACHE', label: '알츠하이머병', sick: '경도 알츠하이머병', brand: '뉴로' },
  { targetId: 'egfr-1m17', gene: 'EGFR', label: '비소세포폐암', sick: 'EGFR 변이 비소세포폐암', brand: '렁가' },
  { targetId: 'dpp4-1x70', gene: 'DPP4', label: '2형 당뇨병', sick: '2형 당뇨병', brand: '글루코' },
  { targetId: 'cox2-3ln1', gene: 'PTGS2', label: '류마티스 관절염', sick: '류마티스 관절염', brand: '조인트' },
];
const ONLY = (process.env.E2E_DISEASES ?? '').split(',').map((x) => x.trim()).filter(Boolean);

/** 세 관문(1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 · S ≥ 55)을 같은 조합으로 넘는 여유 — 화면 '세 관문 허들'이 보여 주는 값. */
const margin = (c: { efficacy: number; safety: number }) => Math.min(c.safety - 55, c.efficacy - 45);

// ── 한 모둠 ──

interface Team {
  key: string;
  d: Disease;
  id: string;
  ticker: string;
  diseaseId: string;
  people: [Agent, Agent];
  admetIds: string[];
  leadAdmet: string;
  patentId: string;
  codeName: string;
  reached: StepId | '—';
  log: string[];
  failure: string | null;
}

const AGREE: Record<ScreenAgenda, [number, string]> = { mw: [500, 'gut'], tpsa: [120, 'gut'], ro5: [1, 'soft'], alert: [0, 'fix'], qed: [0.3, 'like'], score: [0.3, 'grow'] };
const IN_HOUSE = '사내 합성 후보';

function note(t: Team, line: string): void {
  t.log.push(line);
  console.log(`  [${t.d.gene}] ${line}`);
}

/** 서류 심사 — LLM 꺼짐 서버의 규칙 자동 판정을 숙고 기간(게임 일)을 넘겨 받는다. 교사 정정은 하지 않는다. */
async function autoGate(t: Team, classId: string, reviewId: string, what: string): Promise<void> {
  type Item = { id: string; status: string; note?: string };
  type Row = { verdict: string; held_verdict: string | null; llm_status: string; rule_findings: Item[] | null; llm_output: { items?: Item[] } | null };
  const row = await waitFor(async () => {
    const [x] = await sql<Row>('select verdict, held_verdict, llm_status, rule_findings, llm_output from web.doc_reviews where id = $1', [reviewId]);
    if (x!.verdict !== 'pending') return x!;
    if (x!.held_verdict) await advance(classId, 3);
    return undefined;
  }, 120_000, `${what} 자동 판정`, 2500);
  if (row.verdict !== 'pass') {
    const bad = [...(row.rule_findings ?? []), ...(row.llm_output?.items ?? [])].filter((f) => f.status !== 'pass' && f.status !== 'ok').map((f) => `${f.id}:${f.status}${f.note ? ` ${f.note}` : ''}`);
    throw new Error(`${what} 심사 ${row.verdict}(${row.llm_status}) — ${bad.join(' | ') || '지적 없음'}`);
  }
  note(t, `${what} 심사 통과(${row.llm_status})`);
}

async function discover(t: Team): Promise<void> {
  const [p, q] = t.people;
  // 1.1 — 둘이 추천 카드 → 확정
  for (const s of t.people) await s.ok('POST', API.picks, { diseaseId: t.diseaseId, note: `${s.name} 추천 — ${t.d.gene} 는 도킹 준비된 표적이에요` });
  await p.ok('POST', API.target, { diseaseId: t.diseaseId });
  assert.equal(stateOf(await p.board(), '1.1'), 'done');
  t.reached = '1.1';

  // 1.2 — 브리핑 · 회의 6안건 · 실행
  for (const s of t.people) await s.ok('POST', SCREEN_API.briefing, { question: 'read', answer: '1' });
  for (const a of SCREEN_AGENDAS) {
    const [value, reason] = AGREE[a];
    await p.ok('POST', SCREEN_API.proposals, { agenda: a, value, reason });
    await q.ok('POST', SCREEN_API.votes, { agenda: a, proposedBy: p.userId, value, reason }, [200, 409]);
  }
  const run = await q.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '1.2', params: {} });
  const [screenJob] = await waitJobs(p, [run.job.id]);
  assert.equal(screenJob!.status, 'succeeded', '1.2 실행');
  const screen = await p.get<ScreenResponse>(SCREEN_API.screen);
  const ds = await p.get<ScreenDatasetResponse>(SCREEN_API.compounds);
  const shelf = screen.shelf!.passIds;
  const byId = new Map(ds.compounds.map((c) => [c.id, c]));
  // 찜 — 진열대에서 우리 표적의 사내 유도체(아는 약 계열이면서 특허가 나는 것)를 먼저, 모자라면 진열대 순서대로.
  const inHouse = shelf.filter((id) => byId.get(id)?.library === IN_HOUSE && byId.get(id)?.known);
  const picks = [...new Set([...inHouse, ...shelf])].slice(0, 4);
  note(t, `1.2 진열대 ${shelf.length}개 · 사내 유도체 ${inHouse.length}개 → 찜 ${picks.map((id) => byId.get(id)!.name).join(' · ')}`);
  for (const [i, s] of [p, p, q, q].entries()) await s.ok('POST', API.claims, { compoundId: picks[i], reason: 'top', screenJobId: screen.shelf!.jobId });
  assert.equal(stateOf(await p.board(), '1.2'), 'done');
  t.reached = '1.2';

  // 2.1 — 찜 4개 실제 도킹
  const docks = await Promise.all(picks.map((id, i) => [p, p, q, q][i]!.ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '2.1', params: { smiles: byId.get(id)!.smiles, label: byId.get(id)!.name } })));
  const docked = await waitJobs(p, docks.map((r) => r.job.id));
  const ok = docked.filter((j) => j.status === 'succeeded');
  assert.ok(ok.length > 0, `도킹 모두 실패 ${docked.map((j) => j.status).join(',')}`);
  assert.equal(stateOf(await p.board(), '2.1'), 'done');
  t.reached = '2.1';

  // 2.2 — 대기열(막히지 않는 근거) · ADMET 전부 · 특허 후보
  const sel = await p.get<SelectionResponse>(SELECTION_API.get);
  note(t, `2.1 ΔG ${sel.docked.map((d) => `${d.kcal}`).join(' · ')} (기준 ${sel.gauge!.referenceKcal})`);
  for (const [i, j] of ok.entries()) {
    const s = i % 2 ? q : p;
    const d = sel.docked.find((x) => x.jobId === j.id)!;
    const order = DOCK_REASONS.map((r) => ({ r, v: dockReasonVerdict(r, { kcal: d.kcal, referenceKcal: sel.gauge!.referenceKcal, p: d.p, origin: d.origin, parentKcal: d.parentKcal, queue: [] }) }))
      .filter((x) => x.v.status !== 'block')
      .sort((a, b) => (a.v.status === 'ok' ? 0 : 1) - (b.v.status === 'ok' ? 0 : 1));
    for (const { r } of order) if ((await s.call('POST', SELECTION_API.dockPicks, { dockingJobId: d.jobId, reason: r })).status === 201) break;
  }
  const admetRuns = await Promise.all(ok.map((j, i) => (i % 2 ? q : p).ok<StartJobResponse>('POST', API.jobs, { requestId: rid(), step: '2.2', params: { dockingJobId: j.id } })));
  await waitJobs(p, admetRuns.map((r) => r.job.id));
  const sel2 = await p.get<SelectionResponse>(SELECTION_API.get);
  const done = sel2.admet.filter((a): a is AdmetView & { jobId: string } => a.status === 'succeeded' && !a.isReference && a.jobId !== null);
  // 이미 알려진 물질(승인약 · ZINC)은 특허가 안 난다 — 화면의 '이미 알려진 물질' 표시를 보고 새 물질을 먼저, 그 안에서 세 관문 여유 순.
  const known = new Set(done.filter((a) => a.known !== null).map((a) => a.jobId));
  const best = (a: AdmetView) => Math.max(...a.scores.map(margin));
  const ranked = [...done].sort((x, y) => Number(known.has(x.jobId)) - Number(known.has(y.jobId)) || best(y) - best(x));
  note(t, `2.2 ADMET ${done.length}건 — 세 관문 최대 여유 ${ranked.map((a) => best(a).toFixed(1)).join(' · ')}`);
  const facts = (a: AdmetView) => {
    const cell = a.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!;
    const top = Math.max(...done.map((x) => x.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!.efficacy));
    return { signals: a.signals, radarOut: a.radarOut.length, efficacy: cell.efficacy, safety: cell.safety, bestEfficacy: top, cns: sel2.cns, indSafetyMin: sel2.indSafetyMin };
  };
  t.admetIds = [];
  for (const [i, a] of ranked.slice(0, 2).entries()) {
    const reason = candidateReasonsFor(sel2.cns).find((r) => candidateReasonVerdict(r, facts(a)).status !== 'block');
    assert.ok(reason, '특허 후보 근거 — 모두 막힘');
    await (i ? q : p).ok('POST', SELECTION_API.leadCandidates, { admetJobId: a.jobId, reason });
    t.admetIds.push(a.jobId);
  }
  const novel = ranked.find((a) => t.admetIds.includes(a.jobId) && !known.has(a.jobId));
  assert.ok(novel, '특허 후보 중 새 물질이 없어요(모두 승인약 · ZINC)');
  t.leadAdmet = novel.jobId;
  assert.equal(stateOf(await p.board(), '3.1'), 'ready');
  t.reached = '2.2';
}

async function patent(t: Team, classId: string): Promise<void> {
  const [p, q] = t.people;
  const pats = await p.get<PatentsResponse>(PATENT_API.patents);
  const cand = pats.candidates.find((c) => c.admetJobId === t.leadAdmet);
  assert.ok(cand && !cand.known, '새 물질 특허 후보');
  const app = (await p.ok<{ application: { id: string } }>('POST', PATENT_API.applications, { admetJobId: cand.admetJobId })).application;
  t.codeName = `${t.ticker}-101`;
  await p.ok('PUT', PATENT_API.code(app.id), { codeName: t.codeName, expectedCode: null });
  const { gene, label } = t.d;
  const body: Record<string, string> = {
    code_tick: `${t.ticker} = 전광판에 오르는 우리 스타트업 이름표(티커)`,
    code_num: '101 = 1번 신약 프로그램에서 고른 첫 번째 후보 물질',
    mech_how: 'selective,reversible',
    mech_action: 'inhibitor',
    mech_why: `${gene} 결합 주머니에 붙었다 떨어지는 결합이라서`,
    title: `${gene} 억제 활성을 갖는 새 화합물`,
    field: `${label} 치료를 위한 ${gene} 억제제`,
    background: '기준 약은 하루 한 번 복용에서 혈중 농도가 흔들리는 한계가 있어 더 안정한 후보가 필요해요.',
    claim1: '구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염.',
    claim2: `청구항 1 의 화합물을 유효성분으로 포함하는 ${label} 예방 또는 치료용 약학 조성물.`,
    effect: '2.1 도킹에서 표적 주머니에 깊게 붙었고 2.2 신호등에서 심장 · 간 위험이 낮아 기준 약 대비 장점이 있어요.',
    summary: `${gene} 를 가역적으로 억제하는 새 화합물과 그 용도.`,
    inventors: `${p.userId},${q.userId}`,
  };
  const view = (await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!;
  for (const [key, text] of Object.entries(body)) {
    const cur = view.sections.find((s) => s.section === key);
    await (key.length % 2 ? p : q).ok('PUT', PATENT_API.section(app.id, key), { body: text, expectedVersion: cur?.version ?? 0 });
  }
  const v = (await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!;
  const rv = await q.ok<{ review: { id: string; verdict: string; ruleFindings: Array<{ id: string; status: string; note: string }> } }>('POST', PATENT_API.review(app.id), { docVersion: v.version });
  assert.equal(rv.review.verdict, 'pending', `규칙 단계에서 막힘: ${JSON.stringify(rv.review.ruleFindings.filter((f) => f.status === 'fail'))}`);
  await autoGate(t, classId, rv.review.id, '3.1 특허');
  await waitFor(async () => ((await p.get<PatentsResponse>(PATENT_API.patents)).applications.find((a) => a.id === app.id)!.status === 'accepted' ? true : undefined), 15_000, '받아들여짐');
  const [row] = await sql<{ id: string }>(`select id from web.patents where application_id = $1 and status = 'active'`, [app.id]);
  t.patentId = row!.id;
  assert.equal(stateOf(await p.board(), '3.1'), 'done');
  t.reached = '3.1';
}

async function preclinical(t: Team, classId: string): Promise<void> {
  const [a1, a2] = t.people;
  for (const s of t.people) {
    const r = await s.ok<{ passed: boolean }>('POST', PRECLINICAL_API.ethics, { answers: { q1: 'replacement', q2: 'D', q3: 'weight20' } });
    assert.equal(r.passed, true);
  }
  let st = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
  await a1.ok('PUT', PRECLINICAL_API.settings, { expectedVersion: st.protocol?.settingsVersion ?? 0, level: 'standard', patentIds: [t.patentId], painGrade: st.model?.painGrade ?? 'C', endpointPct: 20, performerIds: [a1.userId, a2.userId] });
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
  await autoGate(t, classId, rv.review.id, '3.2 동물실험계획서');
  await waitFor(async () => ((await a1.get<PreclinicalResponse>(PRECLINICAL_API.state)).protocol?.status === 'approved' ? true : undefined), 15_000, '계획서 승인');
  await a1.ok('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: t.patentId, kind: 'animal_study' });
  await a2.ok('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: t.patentId, kind: 'alt_assay', assay: 'herg' });
  st = await waitFor(async () => {
    const x = await a1.get<PreclinicalResponse>(PRECLINICAL_API.state);
    if (x.runs.length >= 2 && x.runs.every((r) => r.status === 'succeeded')) return x;
    await advance(classId, 10);
    return undefined;
  }, 90_000, '동물실험 끝(게임 시계)', 3000);
  const study = st.runs.find((r) => r.kind === 'animal_study')!;
  const res = study.result?.kind === 'animal_study' ? study.result : null;
  assert.ok(res, '동물실험 결과');
  note(t, `3.2 NOAEL 랫드 ${res.noaelMgPerKgDay.rat} · 개 ${res.noaelMgPerKgDay.dog} → HED ${res.hedMgPerKg} · MRSD 경구 ${res.mrsdMgByForm.oral} · 정맥 ${res.mrsdMgByForm.iv} · 경피 ${res.mrsdMgByForm.transdermal} mg`);
  const calc = await a2.ok<{ ok: boolean; fields: Record<string, boolean> }>('PUT', PRECLINICAL_API.calc(study.jobId), { hedRat: res.noaelMgPerKgDay.rat / 6.2, hedDog: res.noaelMgPerKgDay.dog / 1.8, hed: res.hedMgPerKg, mrsd: res.mrsdMgByForm.oral });
  assert.equal(calc.ok, true, JSON.stringify(calc.fields));
  await a1.ok('PUT', PRECLINICAL_API.lead, { leadPatentId: t.patentId, backupPatentId: null, reason: 'start_dose_room', expectedVersion: st.lead.version });
  assert.equal(stateOf(await a1.board(), '3.2'), 'done');
  t.reached = '3.2';
}

async function ind(t: Team, classId: string): Promise<void> {
  const [a1, a2] = t.people;
  let v = await a1.get<IndResponse>(IND_API.ind);
  assert.equal(v.ready, true, v.readyReason ?? '');
  const lead = v.candidates.find((c) => c.role === 'lead')!;
  const mrsd = lead.animal!.mrsdMgByForm;
  const tdOk = lead.signals?.transdermal === 'suitable';
  // 화면이 보여 주는 격자에서 — MRSD 이하 · IND S ≥ 35 · (경피면 피부 적합) 중 세 관문 여유가 가장 큰 칸. 뇌 환자군 칸은 뺀다(첫 환자군).
  const pool = lead.grid!.filter((c) => !c.brainPop && c.dose <= mrsd[c.form] && c.safety >= 35 && (c.form !== 'transdermal' || tdOk)).sort((x, y) => margin(y) - margin(x) || y.efficacy - x.efficacy);
  const cell = pool[0];
  assert.ok(cell, `MRSD 이하 · S ≥ 35 조합 없음 ${JSON.stringify(mrsd)}`);
  note(t, `3.3 조합 ${cell.form} ${cell.dose} mg — E ${cell.efficacy} · S ${cell.safety} (세 관문 여유 ${margin(cell).toFixed(1)}) · 후보 ${pool.length}칸`);
  const app = (await a1.ok<{ application: { id: string } }>('POST', IND_API.applications)).application;
  v = await a1.get<IndResponse>(IND_API.ind);
  await a1.ok('PUT', IND_API.plan(app.id), { expectedPlanVersion: v.application!.planVersion, form: cell.form, doseMg: cell.dose, population: v.trial!.populations[0], endpoint: v.trial!.endpoints[0] });
  const formWhy: Record<string, string> = {
    oral: '경구 흡수 신호가 좋아 매일 먹기 쉬운 알약으로 정했어요. 정맥보다 몸이 받는 부담이 낮아요.',
    iv: '정맥주사는 흡수 손실이 없어 같은 용량에서 효능이 가장 높게 나와요. 병원에서 투여해요.',
    transdermal: '피부 적합 신호가 좋아 패치로 정했어요. 혈중 농도 피크가 낮아 안전 점수가 높아요.',
  };
  const S: Record<string, string> = {
    title: `${t.d.sick} 환자를 위한 ${t.codeName} 첫 사람 시험(제1상)`,
    dev_plan: `${t.d.label}을 겨냥한 ${t.d.gene} 억제제예요. 1상에서 안전성을, 2상에서 효과 지표를, 3상에서 큰 환자군의 효과를 확인해요.`,
    form_reason: formWhy[cell.form]!,
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
  v = await a1.get<IndResponse>(IND_API.ind);
  for (const [k, text] of Object.entries(S)) {
    const cur = v.application!.sections.find((s) => s.section === k);
    await a2.ok('PUT', IND_API.section(app.id, k), { body: text, expectedVersion: cur?.version ?? 0 });
  }
  v = await a1.get<IndResponse>(IND_API.ind);
  assert.deepEqual(v.application!.rulePreview.filter((f) => f.status === 'fail').map((f) => f.note), []);
  const rv = await a1.ok<{ review: { id: string; verdict: string } }>('POST', IND_API.review(app.id), { expectedVersion: v.application!.version });
  assert.equal(rv.review.verdict, 'pending');
  await autoGate(t, classId, rv.review.id, '3.3 IND');
  v = await waitFor(async () => {
    const x = await a1.get<IndResponse>(IND_API.ind);
    return x.application?.status === 'passed' ? x : undefined;
  }, 15_000, 'IND 서류 통과');
  await a2.ok('POST', IND_API.submit(app.id), { expectedVersion: v.application!.version });
  await waitFor(async () => {
    if ((await a1.get<IndResponse>(IND_API.ind)).application?.status === 'approved') return true;
    await advance(classId, 8);
    return undefined;
  }, 90_000, 'IND 승인', 3000);
  assert.equal(stateOf(await a1.board(), '3.3'), 'done');
  t.reached = '3.3';
}

/** 한 시도 — 열기 · 목표 인원까지 모집(집중) · 시작 · 끝나는 날까지 시계 · 결과. 교사 판정 없음. */
async function trial(t: Team, classId: string, route: 'first' | 'next' | 'same' | 'amend', combo?: { form: string; doseMg: number }): Promise<ClinicalResponse['trials'][number]> {
  const [a1, a2] = t.people;
  const { trialId } = await a1.ok<{ trialId: string }>('POST', CLINICAL_API.open, { route, ...combo });
  await a2.ok('PUT', CLINICAL_API.tier(trialId), { tier: 'focus' });
  const ready = await waitFor(async () => {
    const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
    if (c.current && c.current.recruit.enrolled >= c.current.recruit.targetN) return c.current;
    await advance(classId, 10);
    return undefined;
  }, 240_000, '목표 인원 모집', 3000);
  await a2.ok('POST', CLINICAL_API.start(trialId));
  const [row] = await sql<{ ends_game_day: number }>('select ends_game_day from web.clinical_trials where id = $1', [trialId]);
  const fin = await waitFor(async () => {
    const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
    const x = c.trials.find((y) => y.id === trialId)!;
    if ((x.status === 'completed' || x.status === 'held') && x.result) return x;
    if (x.status === 'pending') throw new Error(`${route} 시도가 교사 판정 대기(pending)에 멈췄어요 — LLM 꺼짐인데 규칙 결과가 없어요`);
    if (c.gameDay < Number(row!.ends_game_day) + 1) await advance(classId, Math.min(30, Math.ceil(Number(row!.ends_game_day) - c.gameDay) + 2));
    return undefined;
  }, 240_000, '임상 결과 공개', 3000);
  note(t, `4.1 ${ready.phase} ${route}${combo ? `(${combo.form} ${combo.doseMg} mg)` : ''} — 모집 ${ready.recruit.enrolled}/${ready.recruit.targetN} → ${fin.verdict}${fin.holdKind ? `(${fin.holdKind})` : ''}`);
  return fin;
}

async function clinical(t: Team, classId: string): Promise<void> {
  const [a1] = t.people;
  for (const [i, phase] of (['phase1', 'phase2', 'phase3'] as const).entries()) {
    let fin = await trial(t, classId, i === 0 ? 'first' : 'next');
    for (let retry = 1; fin.verdict !== 'pass'; retry++) {
      if (retry > 3) throw new Error(`${phase} 재도전 3번에도 보류(${fin.holdKind})`);
      // 화면의 재도전 길 — 보류 축에 맞는 '용량 · 제형 바꾸기'(이 상에 머무는 것)가 있으면 그것, 없으면 같은 프로토콜.
      const c = await a1.get<ClinicalResponse>(CLINICAL_API.view);
      const opts = (c.routes.find((r) => r.route === 'amend' && r.available)?.options ?? []).filter((o) => o.ok && !o.resetsToPhase1);
      const key = fin.holdKind === 'efficacy' ? 'efficacy' : 'safety';
      const best = [...opts].sort((x, y) => y[key] - x[key] || y.efficacy - x.efficacy)[0];
      fin = await trial(t, classId, best ? 'amend' : 'same', best ? { form: best.form, doseMg: best.doseMg } : undefined);
    }
    t.reached = '4.1';
  }
  assert.equal(stateOf(await a1.board(), '4.1'), 'done');
}

async function approval(t: Team, classId: string): Promise<void> {
  const [a1, a2] = t.people;
  let g = await a1.get<ApprovalResponse>(APPROVAL_API.get);
  assert.ok(g.phase3, g.lockedReason ?? '');
  const brand = letters(suffix + t.key).slice(0, 3).toLowerCase().replace(/[a-z]/g, (ch) => '가나다라마바사아자차카타파하'[ch.charCodeAt(0) % 14]!);
  await a1.ok('PUT', APPROVAL_API.brand, { name: `${t.d.brand}${brand}`.slice(0, 12), expectedVersion: g.application?.brandVersion ?? 0 });
  g = await a1.get<ApprovalResponse>(APPROVAL_API.get);
  const shape = g.phase3!.form === 'oral' ? 'tablet' : g.phase3!.form === 'iv' ? 'vial' : 'patch';
  await a2.ok('PUT', APPROVAL_API.pack, { shape, color: 'sage', layout: 'top', expectedVersion: g.application!.packVersion });
  const S = {
    indication: `${t.d.sick} 성인 환자의 증상을 줄여요(3상 1차 평가지표).`,
    caution1: '심장 리듬(QT) 이상이 있거나 같은 약을 먹고 있으면 의사와 먼저 상의해요.',
    caution2: `정해진 ${g.phase3!.doseMg} mg 만 쓰고, 어지럽거나 가슴이 두근거리면 병원에 연락해요.`,
  };
  for (const [k, v] of Object.entries(S)) await a1.ok('PUT', APPROVAL_API.section(k), { body: v, expectedVersion: 0 });
  const rv = await a2.ok<{ review: { id: string; verdict: string; ruleFindings: Array<{ status: string; note: string }> } }>('POST', APPROVAL_API.review);
  assert.equal(rv.review.verdict, 'pending', JSON.stringify(rv.review.ruleFindings.filter((f) => f.status === 'fail')));
  await autoGate(t, classId, rv.review.id, '4.2 NDA');
  await waitFor(async () => ((await a1.get<ApprovalResponse>(APPROVAL_API.get)).application?.status === 'passed' ? true : undefined), 15_000, '허가 서류 통과');
  await a1.ok('POST', APPROVAL_API.submit);
  g = await waitFor(async () => {
    const x = await a1.get<ApprovalResponse>(APPROVAL_API.get);
    if (x.application?.status === 'approved') return x;
    await advance(classId, 10);
    return undefined;
  }, 120_000, '허가', 3000);
  assert.ok(g.certificate?.certificateNo, '허가증 번호');
  assert.deepEqual(doneSteps(await a1.board()), [...STEP_IDS]);
  t.reached = '4.2';
  note(t, `4.2 허가 — 허가증 ${g.certificate!.certificateNo}`);
}

async function balance(teamId: string): Promise<string> {
  const [r] = await sql<{ c: string }>(`select coalesce(sum(amount_cents), 0)::text as c from web.ledger where team_id = $1`, [teamId]);
  return `$${(Number(r!.c) / 100_000_000).toFixed(3)}M`;
}

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}${API.health}`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const picked = ONLY.length ? DISEASES.filter((d) => ONLY.includes(d.targetId)) : DISEASES;
  console.log(`서버 ${BASE} · 접미 ${suffix} · 모둠 ${picked.length}(${picked.map((d) => d.gene).join(' · ')})\n`);

  const teacher = new Agent('교사');
  const teacherLogin = `td${suffix}`;
  const secret = createTeacher(teacherLogin);
  await teacher.ok('POST', API.login, { loginId: teacherLogin, password: secret.password });
  const cls = await teacher.ok<TeacherClassDetail>('POST', API.classes, { name: `4질환 점검 ${suffix}`, teamCount: picked.length, assignment: 'walk-in', maxStudents: picked.length * 2 + 2, teamCapacity: 4 });
  const names = [['가람', '나래'], ['다온', '라온'], ['마루', '바다'], ['사랑', '아라']];
  const teams: Team[] = picked.map((d, i) => ({
    key: String.fromCharCode(65 + i),
    d,
    id: cls.teams[i]!.id,
    ticker: `D${letters(suffix).slice(0, 2)}${String.fromCharCode(65 + i)}`,
    diseaseId: '',
    people: [new Agent(names[i]![0]!), new Agent(names[i]![1]!)],
    admetIds: [],
    leadAdmet: '',
    patentId: '',
    codeName: '',
    reached: '—',
    log: [],
    failure: null,
  }));
  for (const t of teams) {
    for (const [i, s] of t.people.entries()) {
      const up = await s.ok<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `d${suffix}${t.key.toLowerCase()}${i}`, displayName: s.name, password });
      s.userId = up.account.userId;
      await s.ok('POST', API.join(t.id));
    }
    await t.people[0].ok('POST', API.registration(t.id), { name: `${t.d.brand}바이오${suffix.slice(0, 3)}`, ticker: t.ticker });
  }
  const b = await teams[0]!.people[0].board();
  for (const t of teams) t.diseaseId = b.diseases.find((d) => d.targetId === t.d.targetId)!.diseaseId;
  console.log(`학급 ${cls.id}(코드 ${cls.code}) · 교사 ${teacherLogin}\n`);

  const flow = async (t: Team) => {
    const t0 = Date.now();
    try {
      await discover(t);
      // Series A — 2.2 뒤. LLM 꺼짐이라 정성 몫은 교사 채점(교사의 원래 일).
      const pitchA =
        '우리 모둠은 두 사람이 서로 다른 찜 분자를 도킹하고 그중 결합이 깊은 새 물질을 특허 후보로 올렸어요. 주력은 세 관문 여유가 가장 큰 분자이고, 백업은 물성이 다른 계열이라 주력이 막히면 바로 바꿀 수 있어요. 약점은 아직 동물에서 노출을 직접 재지 않은 점이라 전임상에서 확인할 계획이에요. 회의에서 정한 깔때기 기준과 찜 근거를 노트에 남겨 두었고, 다음 단계 비용도 미리 계산해 두었어요.';
      const ra = await t.people[0].ok<{ id: string }>('POST', LEARN_API.pitch('series_a'), { pitch: pitchA });
      await teacher.ok('POST', LEARN_API.teacherOverride, { targetType: 'pitch', targetId: ra.id, score: 22 });
      await patent(t, cls.id);
      await preclinical(t, cls.id);
      await ind(t, cls.id);
      const pitchB =
        '특허는 새 물질 한 종을 청구해 학급에서 먼저 등록했어요. IND 는 동물실험 MRSD 이하의 조합 중 세 관문 여유가 가장 큰 칸으로 시작했어요. 임상에서 보류가 나오면 보류 축에 맞춰 용량이나 제형을 바꾸고, 그래도 막히면 백업 후보로 바꾸는 순서로 대응할 계획이에요. 비용과 기간을 표로 미리 정리해 두었고, 각 상의 판정 근거를 연구 노트에 남겨 다음 결정을 빠르게 내릴 수 있게 했어요.';
      const rb = await t.people[1].ok<{ id: string }>('POST', LEARN_API.pitch('series_b'), { pitch: pitchB });
      await teacher.ok('POST', LEARN_API.teacherOverride, { targetType: 'pitch', targetId: rb.id, score: 22 });
      await clinical(t, cls.id);
      await approval(t, cls.id);
    } catch (error) {
      t.failure = (error as Error).message.split('\n')[0]!.slice(0, 400);
      console.log(`  [${t.d.gene}] ✗ ${t.reached} 다음에서 멈춤 — ${t.failure}`);
    }
    note(t, `끝 ${((Date.now() - t0) / 1000).toFixed(0)}s · 잔액 ${await balance(t.id)}`);
  };
  await Promise.all(teams.map(flow));

  // 마감 — 최종 순위(허가한 모둠이 위).
  await teacher.ok('POST', MARKET_API.finalAction(cls.id), { action: 'close' });
  const fin = await teams[0]!.people[0].get<MarketFinalResponse>(MARKET_API.final());
  console.log('\n결과:');
  for (const t of teams) {
    const st = fin.standings.find((s) => s.teamId === t.id);
    console.log(`  ${t.d.gene.padEnd(5)} ${t.d.label.padEnd(8)} — ${t.reached === '4.2' ? '✓ 4.2 허가' : `✗ ${t.reached} 까지`} · 순위 ${st?.rank ?? '—'} · 단계 ${st?.stepsDone ?? '—'}/9${t.failure ? ` · ${t.failure}` : ''}`);
  }
  const all = teams.every((t) => t.reached === '4.2');
  console.log(`\n${all ? '모두 허가' : '허가 못 한 모둠 있음'} · ${((Date.now() - started) / 1000).toFixed(0)}s · 접미 ${suffix} · 학급 ${cls.id}`);
  await db.end();
  process.exit(all ? 0 : 1);
}

main().catch(async (error: Error) => {
  console.error(error);
  await db.end().catch(() => {});
  process.exit(1);
});
