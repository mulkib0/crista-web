/**
 * FSEL 점검(설계 §5.6 · §5.7 · §7.4 ② ⑧ 꼴) — 2.1 → 2.2 대기열(dock_picks) · 2.2 특허 후보(lead_candidates)를 4인 모둠이 동시에 만질 때.
 * 떠 있는 로컬 서버에 실제 HTTP 로 동시에 보낸다.
 *
 *   crista 워커 fixture 모드 8790 · 서버(WEB_PORT=3402 node tools/with-local-env.mjs node apps/server/src/index.ts)
 *   WEB_PORT=3402 npm run e2e:selection
 *
 * 1. 근거 칩 서버 재판정 — 막음 근거는 400 reason_blocked(화면을 거치지 않은 요청도) · 기준 약은 담지 못함(400).
 * 2. 같은 분자를 넷이 한꺼번에 담기 → 1명만 201 · 셋은 409 claimed. 각자 3개씩 한꺼번에 → 1인 2개 · 분자마다 1명 · 넘친 요청은 409.
 * 3. DB 제약 — 서버를 비켜 넣어도 칸 3 · 같은 사람 같은 칸 · 같은 분자 거절.
 * 4. 2.2 ADMET — 대기열에 없는 분자는 409 step_locked · 같은 분자를 넷이 한꺼번에 → 1건만 접수(과금 1번) · 빼기와 ADMET 동시 → 500 없음.
 * 5. GET — 수심계 숫자 두 개만(사전 Vina 칸 · 1위 분자 이름 없음) · E · S 9칸 · 기준 약 줄 · 찜 회고.
 * 6. 특허 후보 — 4명이 동시에 서로 다른 후보 → 모두 201(모둠 4) · 1인 1개 넘으면 409 limit_reached · 같은 후보 경합 1명만 · 2.2 완료 · 3.1 열림.
 * 7. public 표 행 수가 시작 전과 같다(관리자 연결 · 읽기만).
 *
 * 1.2 · 찜이 기능 F12 규칙(합의 · 근거) 때문에 API 로 안 되면, 시험 준비만 crista_web 연결로 직접 넣는다(그 경로는 이 점검 대상이 아니다).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  BASE_DOSE,
  BASE_FORM,
  candidateReasonsFor,
  candidateReasonVerdict,
  DOCK_REASONS,
  dockReasonVerdict,
  SELECTION_API,
  type AdmetView,
  type ApiErrorBody,
  type BoardResponse,
  type MeResponse,
  type SelectionResponse,
  type StartJobResponse,
  type TeacherClassDetail,
  type WebJobView,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
const WORKER = (process.env.BIO_WORKER_URL ?? 'http://127.0.0.1:8790').replace(/\/+$/, '');
const here = dirname(fileURLToPath(import.meta.url));
const suffix = randomBytes(3).toString('hex').slice(0, 4);
const results: Array<{ ok: boolean; label: string }> = [];

function check(label: string, fn: () => void): void {
  try {
    fn();
    results.push({ ok: true, label });
    console.log(`✓ ${label}`);
  } catch (error) {
    results.push({ ok: false, label });
    console.log(`✗ ${label}\n    ${(error as Error).message.split('\n').join('\n    ')}`);
  }
}

interface Reply<T = unknown> {
  status: number;
  body: T;
}

class Agent {
  cookie: string | null = null;
  userId = '';
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<Reply<T>> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { origin: BASE, ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
    if (setCookie) {
      const pair = setCookie.split(';')[0]!;
      this.cookie = pair.endsWith('=') ? null : pair;
    }
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  }
  board = async (): Promise<BoardResponse> => {
    const r = await this.call<BoardResponse>('GET', API.board);
    if (r.status !== 200) throw new Error(`${this.name} 화면 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
  selection = async (): Promise<SelectionResponse> => {
    const r = await this.call<SelectionResponse>('GET', SELECTION_API.get);
    if (r.status !== 200) throw new Error(`${this.name} 선택 화면 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
}

const err = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error;
const statuses = (replies: Reply[]) => replies.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');
const requestId = () => randomBytes(12).toString('hex');

async function waitJobs(agent: Agent, ids: string[], ms = 120_000): Promise<WebJobView[]> {
  const until = Date.now() + ms;
  for (;;) {
    const board = await agent.board();
    const jobs = ids.map((id) => board.jobs.find((j) => j.id === id));
    if (jobs.every((j) => j && (j.status === 'succeeded' || j.status === 'failed'))) return jobs as WebJobView[];
    if (Date.now() > until) throw new Error(`작업이 끝나지 않았습니다: ${jobs.map((j) => `${j?.step}:${j?.status}`).join(',')}`);
    await new Promise((r) => setTimeout(r, 700));
  }
}

async function countPublic(): Promise<Map<string, number>> {
  const url = process.env.CRISTA_DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('로컬 관리자 연결(CRISTA_DATABASE_URL)이 필요합니다.');
  const client = new pg.Client({ connectionString: url, application_name: 'crista-web-e2e-count' });
  await client.connect();
  try {
    await client.query('begin read only');
    const tables = await client.query<{ t: string }>(`select tablename as t from pg_tables where schemaname = 'public' order by tablename`);
    const counts = new Map<string, number>();
    for (const { t } of tables.rows) {
      const r = await client.query<{ n: string }>(`select count(*)::text as n from public.${client.escapeIdentifier(t)}`);
      counts.set(t, Number(r.rows[0]!.n));
    }
    await client.query('rollback');
    return counts;
  } finally {
    await client.end();
  }
}

/** crista_web 연결 — 준비용 직접 넣기 · DB 제약 탐침(탐침은 늘 되돌린다). */
async function web<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-selection' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
async function probe(sql: string, params: unknown[]): Promise<string> {
  return web(async (c) => {
    try {
      await c.query('begin');
      await c.query(sql, params);
      return 'inserted';
    } catch (error) {
      const e = error as { code?: string; constraint?: string };
      return `${e.code}:${e.constraint ?? ''}`;
    } finally {
      await c.query('rollback').catch(() => {});
    }
  });
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `선택 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

interface Compound {
  chemblId: string;
  name: string;
  canonicalSmiles: string;
  library: string;
  targetId?: string | null;
  mw: number;
  qed: number;
  screenScoreByTarget?: Record<string, number>;
  vinaKcalByTarget?: Record<string, number>;
}

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const before = await countPublic();
  console.log(`public 표 ${before.size}개 — 실행 접미 ${suffix}\n`);

  // 준비 — 교사 · 학급 · 학생 4 · 등기 · 표적 ACHE(CNS)
  const teacherId = `t${suffix}s`;
  const secret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: teacherId, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `선택 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const people = ['a', 'b', 'c', 'd'].map((n) => new Agent(`선택${n.toUpperCase()}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `s${suffix}${'abcd'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [sa, sb, sc, sd] = people as [Agent, Agent, Agent, Agent];
  // 화면 점검용 — 이 실행의 학생 계정(로컬 시험 계정)으로 브라우저에서 들어가 볼 때만(중간에 끊겨도 쓸 수 있게 먼저 찍는다).
  if (process.env.E2E_PRINT_LOGIN === '1') console.log(`화면 점검 계정: ${people.map((_, i) => `s${suffix}${'abcd'[i]}`).join(' · ')} / ${password}\n`);
  const ticker = `SL${suffix.slice(0, 2).replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}`;
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `선택제약${suffix}`, ticker })).status, 201);
  const start = await sa.board();
  const ache = start.diseases.find((d) => d.targetId === 'ache-4ey7')!;
  assert.ok(ache, 'ACHE 표적이 있어야 합니다.');
  assert.equal((await sa.call('POST', API.target, { diseaseId: ache.diseaseId })).status, 200);
  const rev = (await sa.board()).program.revisionId;
  // 도킹 전 — 사전 Vina 이정표(가운데값 · 1위 · 히스타민)는 아직 내려오지 않는다(1.2 동안 이 경로로 미리 보지 않게 · §5.5.1).
  const selPre = await sa.selection();
  check('⑤ 도킹 전 GET — 수심계 사전 값(가운데값 · 1위 · 히스타민) 없음 · 찜 회고 없음', () => {
    assert.ok(selPre.gauge, '기준 · p 선은 있어야 해요');
    assert.deepEqual([selPre.gauge.medianKcal, selPre.gauge.topKcal, selPre.gauge.histamineKcal, selPre.gauge.libraryCount], [null, null, null, 0]);
    assert.equal(selPre.retro, null);
  });

  // 라이브러리(워커) — 고를 분자: 사내 후보(이 표적) · 다른 병의 약 · ZINC · 승인약(이 표적)
  const lib = (await (await fetch(`${WORKER}/datasets/compounds?targetId=ache-4ey7&maxMw=100000&maxTpsa=100000&ro5Only=false&excludeAlerts=false&limit=500`)).json()) as { compounds: Compound[] };
  const by = (f: (c: Compound) => boolean) => lib.compounds.find(f)!;
  const crx = by((c) => c.chemblId === 'CRX-ACHE-03') ?? by((c) => c.library === '사내 합성 후보' && c.targetId === 'ache-4ey7');
  const tro = by((c) => /Troglitazone/i.test(c.name));
  const zinc = by((c) => c.library === 'ZINC 소형' && !c.targetId);
  const gal = by((c) => /Galantamine/i.test(c.name));
  const topName = [...lib.compounds].sort((a, b) => (a.vinaKcalByTarget?.['ache-4ey7'] ?? 0) - (b.vinaKcalByTarget?.['ache-4ey7'] ?? 0))[0]!.name.split(' (')[0]!;

  // 1.2 — API 로 안 되면(F12 합의 규칙) 준비만 직접
  let screenJobId: string;
  const screen = await sa.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '1.2', params: { maxMw: 650, maxTpsa: 180, ro5Only: false, excludeAlerts: false } });
  if (screen.status === 201) {
    const [j] = await waitJobs(sa, [screen.body.job.id]);
    assert.equal(j!.status, 'succeeded');
    screenJobId = j!.id;
  } else {
    console.log(`  · 1.2 API ${statuses([screen])} — 준비용 1.2 결과를 직접 넣어요`);
    const cands = [crx, tro, zinc, gal].map((c) => ({ compoundId: c.chemblId, name: c.name, canonicalSmiles: c.canonicalSmiles, targetId: 'ache-4ey7', screenScore: c.screenScoreByTarget?.['ache-4ey7'] ?? 0.5, vinaKcal: c.vinaKcalByTarget?.['ache-4ey7'], mw: c.mw, qed: c.qed }));
    screenJobId = await web(async (c) => {
      const r = await c.query<{ id: string }>(
        `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, status, progress, result, cost_cents)
         values ($1, $2, $3, $4, '1.2', 2, 'htvs', '{}', 'e2e 준비', 'ache-4ey7', $5, 'succeeded', 1, $6, 0) returning id`,
        [team.id, cls.id, sa.userId, requestId(), rev, JSON.stringify({ candidates: cands, metrics: [], annotations: [] })],
      );
      return r.rows[0]!.id;
    });
  }
  // 찜 4개(찜 회고용) — API 가 근거를 요구하면 준비만 직접
  for (const [i, c] of [crx, tro, zinc, gal].entries()) {
    const s = people[i]!;
    const r = await s.call('POST', API.claims, { screenJobId, compoundId: c.chemblId });
    if (r.status !== 201) {
      await web((db) =>
        db.query(
          `insert into web.claims (team_id, program_revision_id, compound_id, slot, name, smiles, screen_job_id, claimed_by, vina_kcal, screen_score, mw, qed, reason)
           values ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10, $11, 'legacy') on conflict do nothing`,
          [team.id, rev, c.chemblId, c.name, c.canonicalSmiles, screenJobId, s.userId, c.vinaKcalByTarget?.['ache-4ey7'] ?? null, c.screenScoreByTarget?.['ache-4ey7'] ?? null, c.mw, c.qed],
        ),
      );
    }
  }

  // 2.1 도킹 — 넷이 동시에 + 기준 약 + 변형체
  const dock = (s: Agent, smiles: string, label: string, parentJobId?: string) =>
    s.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.1', params: { smiles, label, ...(parentJobId ? { parentJobId } : {}) } });
  const wave1 = await Promise.all([dock(sa, crx.canonicalSmiles, 'CRX-03'), dock(sb, tro.canonicalSmiles, 'Troglitazone'), dock(sc, zinc.canonicalSmiles, `ZINC ${zinc.name}`.slice(0, 30)), dock(sd, gal.canonicalSmiles, 'Galantamine')]);
  assert.deepEqual(wave1.map((r) => r.status), [201, 201, 201, 201], statuses(wave1));
  const [jCrx, jTro, jZinc, jGal] = await waitJobs(sa, wave1.map((r) => r.body.job.id));
  assert.ok([jCrx, jTro, jZinc, jGal].every((j) => j!.status === 'succeeded'));
  // 변형체 — 계산할 수 있는 모양을 찾는다(앞에 메틸 · 뒤에 F)
  let variantSmiles = '';
  for (const cand of [`C${crx.canonicalSmiles}`, `${crx.canonicalSmiles}F`, `F${crx.canonicalSmiles}`]) {
    const r = await sa.call('POST', API.properties, { smiles: cand });
    if (r.status === 200) {
      variantSmiles = cand;
      break;
    }
  }
  assert.ok(variantSmiles, '변형체 SMILES 를 만들지 못했어요.');
  // 같은 분자를 다른 사람이 따로 도킹(sb) — 대기열 · ADMET 에서는 같은 분자로 센다.
  const wave2 = await Promise.all([dock(sa, variantSmiles, 'CRX-03′', jCrx!.id), dock(sd, ache.referenceLigand.smiles, '도네페질(대조군)'), dock(sb, crx.canonicalSmiles, 'CRX-03 다시')]);
  assert.deepEqual(wave2.map((r) => r.status), [201, 201, 201], statuses(wave2));
  const [jVar, jRef, jCrx2] = await waitJobs(sa, wave2.map((r) => r.body.job.id));
  assert.ok(jVar!.status === 'succeeded' && jRef!.status === 'succeeded' && jCrx2!.status === 'succeeded');

  const sel0 = await sb.selection();
  const raw0 = JSON.stringify(sel0);
  check('⑤ GET — 수심계는 숫자 두 개(가운데값 · 1위)만 · 사전 Vina 칸 · 1위 분자 이름 없음 · 출신 · 알려진 물질', () => {
    assert.ok(sel0.gauge && typeof sel0.gauge.medianKcal === 'number' && typeof sel0.gauge.topKcal === 'number', JSON.stringify(sel0.gauge));
    assert.ok(sel0.gauge.libraryCount >= 200, `라이브러리 ${sel0.gauge.libraryCount}`);
    assert.ok(!/vinaKcal|screenScore/i.test(raw0), '사전 값 칸이 응답에 있어요');
    assert.ok(!raw0.includes(topName), `1위 분자 이름(${topName})이 응답에 있어요`);
    const d = (id: string) => sel0.docked.find((x) => x.jobId === id)!;
    assert.equal(sel0.docked.length, 7);
    assert.equal(sel0.gauge.histamineKcal, lib.compounds.find((c) => c.chemblId === 'CHEMBL90')?.vinaKcalByTarget?.['ache-4ey7'] ?? null, '이정표 히스타민');
    assert.equal(typeof sel0.retro!.rows.find((r) => r.compoundId === crx.chemblId)?.dockedKcal, 'number', '찜 회고 — 찜한 분자의 우리 도킹 ΔG');
    assert.deepEqual([d(jCrx!.id).origin.kind, d(jCrx!.id).known], ['this', null]);
    assert.deepEqual([d(jTro!.id).origin.kind, d(jTro!.id).known], ['other', 'approved']);
    assert.equal(d(jZinc!.id).known, 'zinc');
    assert.deepEqual([d(jVar!.id).origin.kind, d(jVar!.id).origin.variant, d(jVar!.id).origin.family], ['this', true, d(jCrx!.id).origin.family]);
    assert.equal(d(jRef!.id).isReference, true);
    assert.ok(sel0.retro && sel0.retro.rows.length === 4 && sel0.retro.of >= 200 && typeof sel0.retro.topMeanKcal === 'number', JSON.stringify(sel0.retro));
  });

  const boardClaims = (await sb.board()).claims;
  check('⑤ 화면 응답(/api/board)의 찜에 사전 Vina 값이 없다(§5.5.1)', () => {
    assert.ok(boardClaims.length >= 4, `찜 ${boardClaims.length}`);
    assert.ok(boardClaims.every((c) => c.vinaKcal === null), JSON.stringify(boardClaims.map((c) => c.vinaKcal)));
  });

  // 1. 근거 칩 서버 재판정
  const refPick = await sa.call('POST', SELECTION_API.dockPicks, { dockingJobId: jRef!.id, reason: 'different_series' });
  const notVariant = await sa.call('POST', SELECTION_API.dockPicks, { dockingJobId: jCrx!.id, reason: 'improved_variant' });
  const otherSeries = await sb.call('POST', SELECTION_API.dockPicks, { dockingJobId: jTro!.id, reason: 'target_series' });
  const badKey = await sb.call('POST', SELECTION_API.dockPicks, { dockingJobId: jTro!.id, reason: 'legacy' });
  // 화면과 같은 함수로 막음인 근거를 하나 더 찾는다(도킹 값에 따라 다름)
  const blockedCase = sel0.docked
    .filter((d) => !d.isReference)
    .flatMap((d) => DOCK_REASONS.map((r) => ({ d, r, v: dockReasonVerdict(r, { kcal: d.kcal, referenceKcal: sel0.gauge!.referenceKcal, p: d.p, origin: d.origin, parentKcal: d.parentKcal, queue: [] }) })))
    .find((x) => x.v.status === 'block' && x.r !== 'different_series' && x.r !== 'improved_variant' && x.r !== 'target_series');
  const blockedReply = blockedCase ? await sc.call('POST', SELECTION_API.dockPicks, { dockingJobId: blockedCase.d.jobId, reason: blockedCase.r }) : null;
  check('① 근거 재판정 — 기준 약 400 · 변형체 아님 · 다른 표적 계열은 400 reason_blocked(화면과 같은 문구) · 모르는 키 400', () => {
    assert.equal(refPick.status, 400, statuses([refPick]));
    assert.equal(notVariant.status, 400);
    assert.equal(err(notVariant)?.code, 'reason_blocked');
    assert.equal(otherSeries.status, 400);
    assert.equal(err(otherSeries)?.code, 'reason_blocked');
    assert.equal(badKey.status, 400);
    assert.equal(err(badKey)?.code, 'bad_request');
    if (blockedCase && blockedReply) {
      assert.equal(blockedReply.status, 400, `${blockedCase.r} ${statuses([blockedReply])}`);
      assert.equal(err(blockedReply)?.message, blockedCase.v.message);
    }
  });

  // 2. 같은 분자 동시 담기
  const race = await Promise.all(people.map((s) => s.call('POST', SELECTION_API.dockPicks, { dockingJobId: jCrx!.id, reason: 'different_series' })));
  const winner = people[race.findIndex((r) => r.status === 201)];
  check('② 같은 분자를 넷이 한꺼번에 담기 → 1명만 201 · 셋은 409 claimed(먼저 담은 사람 이름)', () => {
    assert.equal(race.filter((r) => r.status === 201).length, 1, statuses(race));
    const losers = race.filter((r) => r.status === 409);
    assert.equal(losers.length, 3, statuses(race));
    for (const r of losers) {
      assert.equal(err(r)?.code, 'claimed');
      assert.match(err(r)!.message, new RegExp(`${winner!.name} 님이 이미 담았어요`));
    }
  });
  // 같은 분자를 다른 도킹 작업으로 — 이미 담긴 분자라 409 claimed
  const sameMol = await sb.call('POST', SELECTION_API.dockPicks, { dockingJobId: jCrx2!.id, reason: 'different_series' });
  const badDel = await sb.call('DELETE', SELECTION_API.dockPick('not-a-uuid'));
  const badDelLead = await sb.call('DELETE', SELECTION_API.leadCandidate('not-a-uuid'));
  check('② 같은 분자(같은 정규 SMILES)를 다른 도킹 작업으로 담기 → 409 claimed · 틀린 id 빼기 404(500 아님)', () => {
    assert.equal(sameMol.status, 409, statuses([sameMol]));
    assert.equal(err(sameMol)?.code, 'claimed');
    assert.deepEqual([badDel.status, badDelLead.status], [404, 404], statuses([badDel, badDelLead]));
  });
  // 각자 3개씩 한꺼번에(남은 4 분자 — 기준 약 제외)
  const rest = [jTro!, jZinc!, jGal!, jVar!].map((j) => j.id);
  const burst = await Promise.all(people.flatMap((s, i) => [0, 1, 2].map((k) => s.call('POST', SELECTION_API.dockPicks, { dockingJobId: rest[(i + k) % rest.length]!, reason: 'different_series' }))));
  const sel1 = await sc.selection();
  check('② 각자 3개씩 한꺼번에 → 1인 2개 · 칸 1 · 2 · 분자마다 1명 · 넘친 요청은 409(claimed · limit_reached) · 500 없음', () => {
    assert.ok(burst.every((r) => r.status === 201 || (r.status === 409 && ['claimed', 'limit_reached'].includes(err(r)!.code))), statuses(burst));
    for (const s of people) {
      const mine = sel1.picks.filter((p) => p.userId === s.userId);
      assert.ok(mine.length <= 2, `${s.name} ${mine.length}`);
      assert.equal(new Set(mine.map((p) => p.slot)).size, mine.length);
    }
    assert.equal(new Set(sel1.picks.map((p) => p.jobId)).size, sel1.picks.length);
    assert.equal(sel1.picks.length, 1 + burst.filter((r) => r.status === 201).length, `대기열 ${sel1.picks.length}`);
    assert.ok(sel1.picks.length >= 4, `대기열 ${sel1.picks.length}`);
  });

  // 3. DB 제약
  const anyPick = sel1.picks[0]!;
  const freeOwner = people.find((s) => sel1.picks.filter((p) => p.userId === s.userId).length < 2)!;
  const slot3 = await probe(`insert into web.dock_picks (program_revision_id, team_id, docking_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 3, 'probe')`, [rev, team.id, jRef!.id, freeOwner.userId]);
  const sameJob = await probe(`insert into web.dock_picks (program_revision_id, team_id, docking_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 2, 'probe')`, [rev, team.id, anyPick.jobId, secret.userId]);
  const twoPicker = people.find((s) => sel1.picks.filter((p) => p.userId === s.userId).length === 2)!;
  const sameSlot = await probe(`insert into web.dock_picks (program_revision_id, team_id, docking_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 1, 'probe')`, [rev, team.id, jRef!.id, twoPicker.userId]);
  check('③ DB 제약 — 칸 3(check) · 같은 사람 같은 칸(unique) · 같은 버전 같은 분자(PK) 거절', () => {
    assert.equal(slot3, '23514:dock_picks_slot_check');
    assert.equal(sameSlot, '23505:dock_picks_person_slot_key');
    assert.equal(sameJob, '23505:dock_picks_pkey');
  });

  // 빼기 — 남이 뺄 수 없고, 주인은 뺄 수 있다
  const pickOwner = people.find((s) => s.userId === anyPick.userId)!;
  const notMine = people.find((s) => s.userId !== anyPick.userId)!;
  const delOther = await notMine.call('DELETE', SELECTION_API.dockPick(anyPick.jobId));
  const delOwn = await pickOwner.call('DELETE', SELECTION_API.dockPick(anyPick.jobId));
  const readd = await pickOwner.call('POST', SELECTION_API.dockPicks, { dockingJobId: anyPick.jobId, reason: 'different_series' });
  check('② 빼기 — 남의 것 404 · 내 것 200 · 다시 담기 201', () => {
    assert.deepEqual([delOther.status, delOwn.status, readd.status], [404, 200, 201], statuses([delOther, delOwn, readd]));
  });

  // 4. 2.2 ADMET — 대기열만 · 같은 분자 한 번
  const sel2 = await sa.selection();
  const queued = sel2.picks.map((p) => p.jobId);
  const notQueued = await sa.call('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: jRef!.id } });
  const balance0 = (await sa.board()).balanceCents;
  const admetRace = await Promise.all(people.map((s) => s.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: queued[0]! } })));
  const balance1 = (await sa.board()).balanceCents;
  const cost22 = start.costs['2.2'];
  check('④ 2.2 — 대기열에 없는 분자 409 step_locked · 같은 분자를 넷이 한꺼번에 → 1건만 접수 · 과금 1번', () => {
    assert.equal(notQueued.status, 409);
    assert.equal(err(notQueued)?.code, 'step_locked');
    assert.equal(admetRace.filter((r) => r.status === 201).length, 1, statuses(admetRace));
    assert.ok(admetRace.filter((r) => r.status !== 201).every((r) => r.status === 409 && err(r)?.code === 'already_exists'), statuses(admetRace));
    assert.equal(balance0 - balance1, cost22);
  });
  // 빼기와 ADMET 동시 — 교착 · 500 없이 둘 중 하나의 순서로
  const victim = sel2.picks.find((p) => p.jobId !== queued[0])!;
  const victimOwner = people.find((s) => s.userId === victim.userId)!;
  const other = people.find((s) => s !== victimOwner)!;
  const [delRace, admetDelRace] = await Promise.all([
    victimOwner.call('DELETE', SELECTION_API.dockPick(victim.jobId)),
    other.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: victim.jobId } }),
  ]);
  check('④ 대기열 빼기와 ADMET 동시 → 교착 · 500 없음(빼기 200 · ADMET 은 201 또는 409 step_locked)', () => {
    assert.equal(delRace.status, 200, statuses([delRace]));
    assert.ok(admetDelRace.status === 201 || (admetDelRace.status === 409 && err(admetDelRace)?.code === 'step_locked'), statuses([admetDelRace]));
  });
  // 나머지 대기열 분자 ADMET(최대 4개 — 이미 돌린 것 제외)
  const sel3 = await sa.selection();
  const pending = sel3.picks.filter((p) => !sel3.docked.find((d) => d.jobId === p.jobId)?.admetJobId).map((p) => p.jobId);
  const more = await Promise.all(pending.map((id, i) => people[i % 4]!.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: id } })));
  assert.ok(more.every((r) => r.status === 201), statuses(more));
  const admetIds = [...admetRace, admetDelRace, ...more].filter((r) => r.status === 201).map((r) => (r.body as StartJobResponse).job.id);
  const admets = await waitJobs(sa, admetIds);
  assert.ok(admets.every((j) => j.status === 'succeeded'), admets.map((j) => j.status).join(','));

  const sel4 = await sd.selection();
  const done = sel4.admet.filter((a) => a.status === 'succeeded');
  check('⑤ GET — 2.2 줄마다 RDKit 물성 · 신호 · E · S 9칸(제형 3 × 용량 3) · 기준 약 줄', () => {
    assert.ok(done.length >= 4, `ADMET ${done.length}`);
    for (const a of done) {
      assert.ok(a.props && a.signals && a.notes, `${a.label} 물성 없음`);
      assert.equal(a.scores.length, 9);
    }
    assert.ok(sel4.reference?.isReference && sel4.reference.scores.length === 9);
    assert.equal(sel4.cns, true);
  });

  // 6. 특허 후보
  const facts = (a: AdmetView) => {
    const cell = a.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!;
    const best = Math.max(...done.map((x) => x.scores.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE)!.efficacy));
    return { signals: a.signals, radarOut: a.radarOut.length, efficacy: cell.efficacy, safety: cell.safety, bestEfficacy: best, cns: sel4.cns, indSafetyMin: sel4.indSafetyMin };
  };
  const okReason = (a: AdmetView) => candidateReasonsFor(sel4.cns).find((r) => candidateReasonVerdict(r, facts(a)).status !== 'block');
  const blockReason = (a: AdmetView) => candidateReasonsFor(sel4.cns).find((r) => candidateReasonVerdict(r, facts(a)).status === 'block');
  const blocked = done.map((a) => ({ a, r: blockReason(a) })).find((x) => x.r);
  const blockedLead = blocked ? await sa.call('POST', SELECTION_API.leadCandidates, { admetJobId: blocked.a.jobId, reason: blocked.r }) : null;
  // 한 사람이 서로 다른 후보 둘을 한꺼번에 — 1인 1개라 1건만
  const twin = await Promise.all([done[0]!, done[1]!].map((a) => sa.call('POST', SELECTION_API.leadCandidates, { admetJobId: a.jobId, reason: okReason(a) ?? 'herg_low' })));
  const twinWon = [done[0]!, done[1]!][twin.findIndex((r) => r.status === 201)];
  check('⑥ 한 사람이 후보 둘을 한꺼번에 → 1건만 201 · 다른 쪽 409 limit_reached', () => {
    assert.equal(twin.filter((r) => r.status === 201).length, 1, statuses(twin));
    assert.equal(err(twin.find((r) => r.status !== 201)!)?.code, 'limit_reached', statuses(twin));
  });
  if (twinWon) assert.equal((await sa.call('DELETE', SELECTION_API.leadCandidate(twinWon.jobId!))).status, 200);
  const four = done.slice(0, 4);
  const leadBurst = await Promise.all(four.map((a, i) => people[i]!.call('POST', SELECTION_API.leadCandidates, { admetJobId: a.jobId, reason: okReason(a) ?? 'herg_low' })));
  const fifth = done[4] ? await sa.call('POST', SELECTION_API.leadCandidates, { admetJobId: done[4].jobId, reason: okReason(done[4]) ?? 'herg_low' }) : null;
  const sel5 = await sa.selection();
  const board5 = await sb.board();
  check('⑥ 특허 후보 — 막음 근거 400 reason_blocked · 4명이 동시에 서로 다른 후보 → 모두 201(모둠 4) · 1인 1개 · 2.2 완료 · 3.1 열림', () => {
    if (blocked && blockedLead) {
      assert.equal(blockedLead.status, 400, statuses([blockedLead]));
      assert.equal(err(blockedLead)?.code, 'reason_blocked');
    }
    assert.ok(four.every((a) => okReason(a)), '담을 수 있는 근거가 없는 줄이 있어요');
    assert.deepEqual(leadBurst.map((r) => r.status), [201, 201, 201, 201], statuses(leadBurst));
    assert.equal(sel5.candidates.length, 4);
    assert.deepEqual(new Set(sel5.candidates.map((c) => c.userId)).size, 4);
    if (fifth) {
      assert.equal(fifth.status, 409);
      assert.equal(err(fifth)?.code, 'limit_reached');
    }
    assert.equal(board5.steps.find((s) => s.id === '2.2')?.state, 'done');
    assert.notEqual(board5.steps.find((s) => s.id === '3.1')?.state, 'locked');
  });
  const knownRow = sel5.candidates.find((c) => sel4.admet.find((a) => a.jobId === c.jobId)?.known);
  check('⑥ 알려진 물질 후보는 known_substance = true 로 남는다(3.1 이 읽음)', () => {
    if (knownRow) assert.equal(knownRow.known, true);
    for (const c of sel5.candidates) assert.equal(c.known, Boolean(sel4.admet.find((a) => a.jobId === c.jobId)?.known));
  });

  // 같은 후보 경합 — 주인이 뺀 뒤 주인과 다른 사람이 한꺼번에
  const c0 = sel5.candidates[0]!;
  const owner = people.find((s) => s.userId === c0.userId)!;
  const rival = people.find((s) => s !== owner)!;
  const a0 = sel4.admet.find((a) => a.jobId === c0.jobId)!;
  assert.equal((await owner.call('DELETE', SELECTION_API.leadCandidate(c0.jobId))).status, 200);
  const leadRace = await Promise.all([owner, rival].map((s) => s.call('POST', SELECTION_API.leadCandidates, { admetJobId: c0.jobId, reason: okReason(a0) })));
  const sel6 = await sa.selection();
  check('⑥ 같은 후보 동시 → 1명만 201(1인 1개가 빈 주인) · 다른 쪽 409 · 모둠 4 그대로', () => {
    assert.equal(leadRace.filter((r) => r.status === 201).length, 1, statuses(leadRace));
    assert.equal(leadRace[0]!.status, 201);
    assert.ok(leadRace[1]!.status === 409 && ['claimed', 'limit_reached'].includes(err(leadRace[1]!)!.code));
    assert.equal(sel6.candidates.length, 4);
  });
  const leadSlot = await probe(`insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 1, 'probe')`, [rev, team.id, done[4]?.jobId ?? done[0]!.jobId, owner.userId]);
  check('③ DB 제약 — 특허 후보도 같은 사람 같은 칸 거절(또는 같은 후보 PK)', () => {
    assert.ok(['23505:lead_candidates_person_slot_key', '23505:lead_candidates_pkey'].includes(leadSlot), leadSlot);
  });

  // 7. 게임 표 무변경
  const after = await countPublic();
  const diffs = [...new Set([...before.keys(), ...after.keys()])].filter((t) => before.get(t) !== after.get(t));
  check(`⑦ 게임 표 무변경 — public ${after.size}개 표의 행 수가 시작 전과 같다`, () => {
    assert.deepEqual(diffs.map((t) => `${t} ${before.get(t)} → ${after.get(t)}`), []);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과${failed.length ? ` — 실패: ${failed.map((f) => f.label).join(' / ')}` : ''}`);
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error('[e2e:selection]', (error as Error).stack ?? error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
