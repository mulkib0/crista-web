/**
 * F12 — 1.2 기준 회의 · 실행 · 분자 쇼핑의 4인 동시 조작 점검(설계 §7.4 ②⑥⑦⑧ · §11 W7 완료 조건).
 * 떠 있는 로컬 서버에 실제 HTTP 로 동시에 보낸다(e2e-parallel.ts 와 같은 꼴). LLM 은 쓰지 않는다.
 *
 *   crista 워커 fixture 모드 8790 · WEB_PORT=3401 node tools/with-local-env.mjs node apps/server/src/index.ts   (다른 터미널)
 *   WEB_PORT=3401 npm run e2e:screen
 *
 * 1. ① 브리핑 — 넷이 동시에 답해도 사람마다 한 행 · 화면 응답에 넷 모두.
 * 2. ⑦ 합의 전 실행 → 409 step_locked(요청에 기준을 실어도 무시).
 * 3. ⑥ 같은 안에 셋이 동시에 찬성 → 합의는 한 번 · 합의값 하나 · 늦은 표는 409(합의값) · 두 화면이 같은 도장.
 *    두 사람이 동시에 '다시 논의' → round 는 한 번만 오른다 · 표는 지워진다. 제안 값을 고치면 그 안의 다른 사람 표가 지워진다.
 *    낡은 화면의 찬성(본 값 ≠ 지금 값)은 409 stale — 값 고침과 찬성이 동시에 와도 바뀐 안에 표가 남지 않는다.
 * 4. ⑦ 6개 합의 뒤 넷이 동시에 실행 → 1건만 201 · 나머지 409 · 과금 1회. DB 부분 고유 키(0010)도 진행 중 1.2 를 하나로 막는다.
 * 5. §5.5.1 — 1.2 화면용 응답(GET /api/screen · /api/screen/compounds · /api/board 의 1.2 작업)에 사전 Vina 값이 없다.
 * 6. ⑧ 찜 — 근거 없음 400 · 데이터와 틀린 근거 400 reason_blocked · 진열대 밖 400 · 같은 분자 넷이 동시에 → 1명 · 1인 2개 · 낡은 진열대 409 stale.
 *    찜의 사전 Vina 값은 DB 서버 전용 칸에만(FSEL 찜 회고) — 화면 응답에는 없다.
 * 7. 떠난 모둠원의 표는 정족수 셈에 넣지 않는다(시험 중 잠깐 team_id 를 비웠다가 되돌린다).
 * 8. public 표 행 수가 시작 전과 같다(관리자 연결 · 읽기만).
 *
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미 — 걷어내기는 db/README.md). 가입 4번 · 교사 1명 · 실행 2회(fixture).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  SCREEN_AGENDAS,
  SCREEN_API,
  type ApiErrorBody,
  type BoardResponse,
  type MeResponse,
  type ScreenAgenda,
  type ScreenDatasetResponse,
  type ScreenResponse,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
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
  screen = async (): Promise<ScreenResponse> => {
    const r = await this.call<ScreenResponse>('GET', SCREEN_API.screen);
    if (r.status !== 200) throw new Error(`${this.name} 회의 읽기 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
  board = async (): Promise<BoardResponse> => (await this.call<BoardResponse>('GET', API.board)).body;
}

const err = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error;
const statuses = (replies: Reply[]) => replies.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');
const requestId = () => randomBytes(12).toString('hex');
const agendaOf = (s: ScreenResponse, a: ScreenAgenda) => s.agendas.find((g) => g.agenda === a)!;

async function countPublic(): Promise<Map<string, number>> {
  const url = process.env.CRISTA_DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('로컬 관리자 연결(CRISTA_DATABASE_URL)이 필요합니다.');
  const client = new pg.Client({ connectionString: url, application_name: 'crista-web-e2e-screen-count' });
  await client.connect();
  try {
    await client.query('begin read only');
    const tables = await client.query<{ t: string }>(`select tablename as t from pg_tables where schemaname = 'public' order by tablename`);
    const counts = new Map<string, number>();
    for (const { t } of tables.rows) counts.set(t, Number((await client.query<{ n: string }>(`select count(*)::text as n from public.${client.escapeIdentifier(t)}`)).rows[0]!.n));
    await client.query('rollback');
    return counts;
  } finally {
    await client.end();
  }
}

/** crista_web 로 진행 중 1.2 를 하나 더 넣어 본다 — 0010 부분 고유 키가 막는가. 늘 되돌린다. */
async function tryActiveScreenInsert(v: { teamId: string; classId: string; revisionId: string; userId: string }): Promise<string> {
  const client = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-screen' });
  await client.connect();
  try {
    await client.query('begin');
    for (let i = 0; i < 2; i += 1) {
      await client.query(
        `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, cost_cents, status)
         values ($1, $2, $3, $4, '1.2', 2, 'htvs', '{}'::jsonb, 'probe', 'ache-4ey7', $5, 0, 'queued')`,
        [v.teamId, v.classId, v.userId, `probe${i}${requestId()}`, v.revisionId],
      );
    }
    return 'inserted';
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    return `${e.code}:${e.constraint ?? ''}`;
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

/** crista_web 로 한 문장(시험 준비 · 확인용). */
async function webQuery<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-screen' });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

async function waitRun(agent: Agent, jobId: string, ms = 90_000): Promise<ScreenResponse> {
  const until = Date.now() + ms;
  for (;;) {
    const s = await agent.screen();
    const run = s.runs.find((r) => r.jobId === jobId);
    if (run && (run.status === 'succeeded' || run.status === 'failed')) return s;
    if (Date.now() > until) throw new Error(`실행이 끝나지 않았습니다: ${run?.status}`);
    await new Promise((r) => setTimeout(r, 700));
  }
}

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const before = await countPublic();
  console.log(`서버 ${BASE} · public 표 ${before.size}개 — 실행 접미 ${suffix}\n`);

  // 준비 — 교사 · 학급 · 학생 4 · 입사 · 등기 · 표적(ACHE)
  const teacherId = `t${suffix}s`;
  const secret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: teacherId, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `1.2 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const people = ['a', 'b', 'c', 'd'].map((n) => new Agent(`학생${n.toUpperCase()}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `s${suffix}${'abcd'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [sa, sb, sc, sd] = people as [Agent, Agent, Agent, Agent];
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `스크린제약${suffix}`, ticker: `SC${suffix.slice(0, 2).replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}` })).status, 201);
  const start = await sa.board();
  const ache = start.diseases.find((d) => d.targetId === 'ache-4ey7');
  assert.ok(ache, 'ACHE 질환이 있어야 합니다.');
  assert.equal((await sa.call('POST', API.target, { diseaseId: ache.diseaseId })).status, 200);
  const balance0 = (await sa.board()).balanceCents;

  // 1. 브리핑
  const brief = await Promise.all(people.map((s, i) => s.call('POST', SCREEN_API.briefing, { question: 'cns', answer: ['must', 'nice', 'must', 'no'][i] })));
  const reads = await Promise.all(people.map((s) => s.call('POST', SCREEN_API.briefing, { question: 'read', answer: '1' })));
  const bad = await sa.call('POST', SCREEN_API.briefing, { question: 'cns', answer: 'maybe' });
  const s1 = await sb.screen();
  check('① 브리핑 — 넷이 동시에 답해도 사람마다 한 행 · 읽음 4 · 모르는 답 400', () => {
    assert.deepEqual(brief.map((r) => r.status), [200, 200, 200, 200], statuses(brief));
    assert.deepEqual(reads.map((r) => r.status), [200, 200, 200, 200], statuses(reads));
    assert.equal(s1.briefing.filter((b) => b.question === 'cns').length, 4);
    assert.equal(s1.briefing.filter((b) => b.question === 'read').length, 4);
    assert.equal(bad.status, 400);
    assert.equal(s1.quorum, 3);
  });

  // 2. 합의 전 실행
  const early = await sa.call('POST', API.jobs, { requestId: requestId(), step: '1.2', params: { maxMw: 600, maxTpsa: 150, ro5Only: false, excludeAlerts: false } });
  check('⑦ 합의 전 실행 → 409 step_locked(요청에 실은 기준은 무시)', () => {
    assert.equal(early.status, 409, statuses([early]));
    assert.equal(err(early)?.code, 'step_locked');
  });

  // 3. ⑥ 회의 — 같은 안에 셋이 동시에 찬성
  assert.equal((await sa.call('POST', SCREEN_API.proposals, { agenda: 'mw', value: 450, reason: 'bbb' })).status, 200);
  assert.equal((await sb.call('POST', SCREEN_API.proposals, { agenda: 'mw', value: 500, reason: 'gut' })).status, 200);
  const votes = await Promise.all([sb, sc, sd].map((s) => s.call<{ agreed: boolean }>('POST', SCREEN_API.votes, { agenda: 'mw', proposedBy: sa.userId, value: 450, reason: 'bbb' })));
  const late = await sb.call('POST', SCREEN_API.votes, { agenda: 'mw', proposedBy: sb.userId, value: 500, reason: 'gut' });
  const [viewC, viewD] = await Promise.all([sc.screen(), sd.screen()]);
  check('⑥ 셋이 동시에 같은 안에 찬성 → 합의는 한 번 · 값 450 · 늦은 표 409 · 두 화면이 같은 도장', () => {
    const ok = votes.filter((r) => r.status === 200);
    assert.ok(ok.length >= 2, statuses(votes));
    assert.ok(votes.every((r) => r.status === 200 || (r.status === 409 && err(r)?.code === 'already_exists')), statuses(votes));
    assert.equal(ok.filter((r) => r.body.agreed).length, 1, `합의 응답 ${statuses(votes)}`);
    assert.equal(late.status, 409);
    assert.match(err(late)!.message, /MW ≤ 450/);
    for (const v of [viewC, viewD]) {
      const g = agendaOf(v, 'mw');
      assert.equal(g.status, 'agreed');
      assert.equal(g.value, 450);
      assert.equal(g.proposedBy, sa.userId);
      assert.equal(g.votes, 3);
    }
  });

  const reopenRace = await Promise.all([sb, sc].map((s) => s.call<{ changed: boolean }>('POST', SCREEN_API.reopen('mw'))));
  const afterReopen = await sa.screen();
  check('⑥ 두 사람이 동시에 다시 논의 → round 는 한 번만(2) · 표는 지워지고 제안은 남는다', () => {
    assert.deepEqual(reopenRace.map((r) => r.status), [200, 200], statuses(reopenRace));
    assert.equal(reopenRace.filter((r) => r.body.changed).length, 1);
    const g = agendaOf(afterReopen, 'mw');
    assert.equal(g.status, 'open');
    assert.equal(g.round, 2);
    assert.equal(g.value, null);
    assert.equal(g.proposals.length, 2);
    assert.ok(g.proposals.every((p) => p.votes.length === 0));
  });

  // 제안 값을 고치면 다른 사람 표가 지워진다
  assert.equal((await sa.call('POST', SCREEN_API.proposals, { agenda: 'tpsa', value: 90, reason: 'bbb' })).status, 200);
  assert.equal((await sb.call('POST', SCREEN_API.votes, { agenda: 'tpsa', proposedBy: sa.userId, value: 90, reason: 'bbb' })).status, 200);
  const before2 = agendaOf(await sa.screen(), 'tpsa').proposals.find((p) => p.proposedBy === sa.userId)!.votes.length;
  assert.equal((await sa.call('POST', SCREEN_API.proposals, { agenda: 'tpsa', value: 120, reason: 'gut' })).status, 200);
  const after2 = agendaOf(await sa.screen(), 'tpsa').proposals.find((p) => p.proposedBy === sa.userId)!;
  const ro5two = await sa.call('POST', SCREEN_API.proposals, { agenda: 'ro5', value: 2, reason: 'keep' });
  const badReason = await sa.call('POST', SCREEN_API.proposals, { agenda: 'ro5', value: 1, reason: 'bbb' });
  check('⑥ 제안 값을 고치면 그 안의 다른 사람 표가 지워진다 · Ro5 2 는 지금 400(§12-6) · 그 안건에 없는 근거 400', () => {
    assert.equal(before2, 2);
    assert.equal(after2.value, 120);
    assert.deepEqual(after2.votes.map((v) => v.voter), [sa.userId]);
    assert.equal(ro5two.status, 400);
    assert.equal(badReason.status, 400);
  });

  // 늦은 표 — 화면이 본 값과 지금 제안 값이 다르면 409 stale(바뀐 안에 찬성한 셈이 되지 않게). 값 고침과 찬성이 동시에 와도 바뀐 안에는 표가 남지 않는다.
  assert.equal((await sa.call('POST', SCREEN_API.proposals, { agenda: 'qed', value: 0.5, reason: 'like' })).status, 200);
  const [qedChange, qedRace] = await Promise.all([
    sa.call('POST', SCREEN_API.proposals, { agenda: 'qed', value: 0.2, reason: 'bind' }),
    sb.call('POST', SCREEN_API.votes, { agenda: 'qed', proposedBy: sa.userId, value: 0.5, reason: 'like' }),
  ]);
  const staleVote = await sc.call('POST', SCREEN_API.votes, { agenda: 'qed', proposedBy: sa.userId, value: 0.5, reason: 'like' });
  const noValue = await sc.call('POST', SCREEN_API.votes, { agenda: 'qed', proposedBy: sa.userId, reason: 'bind' });
  const freshVote = await sc.call('POST', SCREEN_API.votes, { agenda: 'qed', proposedBy: sa.userId, value: 0.2, reason: 'bind' });
  const qedView = agendaOf(await sd.screen(), 'qed').proposals.find((p) => p.proposedBy === sa.userId)!;
  check('⑥ 낡은 화면의 찬성(본 값 ≠ 지금 값) → 409 stale · 값 고침과 동시 찬성도 바뀐 안에 표가 남지 않음 · 값 없음 400', () => {
    assert.equal(qedChange.status, 200, statuses([qedChange]));
    assert.ok(qedRace.status === 200 || (qedRace.status === 409 && err(qedRace)?.code === 'stale'), statuses([qedRace]));
    assert.equal(staleVote.status, 409, statuses([staleVote]));
    assert.equal(err(staleVote)?.code, 'stale');
    assert.match(err(staleVote)!.message, /QED ≥ 0\.20/);
    assert.equal(noValue.status, 400, statuses([noValue]));
    assert.equal(freshVote.status, 200, statuses([freshVote]));
    assert.equal(qedView.value, 0.2);
    assert.deepEqual(qedView.votes.map((v) => v.voter).sort(), [sa.userId, sc.userId].sort());
  });

  // 6개 모두 합의(느슨하게 — 진열대에 TPSA > 90 · 사내/ZINC 분자가 섞이게)
  const plan: Record<ScreenAgenda, [number, string]> = { mw: [500, 'gut'], tpsa: [120, 'gut'], ro5: [1, 'soft'], alert: [0, 'fix'], qed: [0.3, 'like'], score: [0.3, 'grow'] };
  for (const a of SCREEN_AGENDAS) {
    const [value, reason] = plan[a];
    assert.equal((await sc.call('POST', SCREEN_API.proposals, { agenda: a, value, reason })).status, 200, a);
    for (const s of [sa, sd]) {
      const r = await s.call('POST', SCREEN_API.votes, { agenda: a, proposedBy: sc.userId, value, reason });
      assert.ok(r.status === 200 || r.status === 409, `${a} ${statuses([r])}`);
    }
  }
  const agreedView = await sb.screen();
  assert.ok(agreedView.allAgreed, JSON.stringify(agreedView.agreed));

  // 4. ⑦ 넷이 동시에 실행
  const runs = await Promise.all(people.map((s) => s.call<{ job: { id: string } }>('POST', API.jobs, { requestId: requestId(), step: '1.2', params: { maxMw: 650 } })));
  const winner = runs.find((r) => r.status === 201);
  const probe = await tryActiveScreenInsert({ teamId: team.id, classId: cls.id, revisionId: agreedView.revisionId, userId: sa.userId });
  check('⑦ 넷이 동시에 실행 → 1건만 201 · 나머지 409(실행한 사람 이름) · DB 키도 진행 중 1.2 를 하나로', () => {
    assert.equal(runs.filter((r) => r.status === 201).length, 1, statuses(runs));
    const losers = runs.filter((r) => r.status !== 201);
    assert.ok(losers.every((r) => r.status === 409 && err(r)?.code === 'already_exists' && /실행 중/.test(err(r)!.message)), statuses(runs));
    assert.equal(probe, '23505:jobs_screen_one_active_key');
  });
  const done = await waitRun(sa, winner!.body.job.id);
  const runView = done.runs.find((r) => r.jobId === winner!.body.job.id)!;
  const balance1 = (await sa.board()).balanceCents;
  check('⑦ 과금 1회 · 실행 스냅숏 = 실행 때의 합의값 · 진열대 = 통과 id', () => {
    assert.equal(runView.status, 'succeeded', runView.errorMessage ?? '');
    assert.equal(balance0 - balance1, done.costs.runCents);
    assert.deepEqual(runView.snapshot?.criteria, { mw: 500, tpsa: 120, ro5: 1, alert: 0, qed: 0.3, score: 0.3 });
    assert.equal(done.shelf?.jobId, runView.jobId);
    assert.ok((done.shelf?.passIds.length ?? 0) >= 12, `통과 ${done.shelf?.passIds.length}`);
    assert.equal(done.shelf?.passIds.length, runView.snapshot?.final);
  });

  // 5. 사전 Vina 값이 없다
  const ds = (await sb.call<ScreenDatasetResponse>('GET', SCREEN_API.compounds)).body;
  const rawScreen = JSON.stringify(await sb.screen());
  const board = await sb.board();
  const job12 = JSON.stringify(board.jobs.filter((j) => j.step === '1.2'));
  check('§5.5.1 1.2 화면용 응답에 사전 Vina 값이 없다(화합물 · 회의 · 화면 ③ 의 1.2 작업 · 찜)', () => {
    assert.equal(ds.total, 220);
    assert.ok(ds.compounds.length >= 200);
    // 값 칸(vinaKcal · vinaKcalByTarget) · 워커 표의 '사전 도킹 ΔG' 열 · 도네페질 사전 Vina 값(−11.84)이 어디에도 없다.
    // (출처 설명 provenance 의 'AutoDock Vina 사전 도킹(오프라인)' 같은 엔진 이름 글은 값이 아니라 남긴다.)
    for (const [label, text] of [['compounds', JSON.stringify(ds)], ['screen', rawScreen], ['board 1.2', job12]] as const) {
      assert.equal(/vinaKcal/i.test(text), false, `${label} 에 vinaKcal`);
      assert.equal(/11\.84/.test(text), false, `${label} 에 사전 Vina 값`);
    }
    assert.ok(board.jobs.filter((j) => j.step === '1.2').every((j) => !j.result?.table && (j.result?.annotations ?? []).length === 0));
    assert.ok(board.claims.every((c) => c.vinaKcal === null));
  });

  // 6. ⑧ 찜
  const shelf = done.shelf!.passIds;
  const byId = new Map(ds.compounds.map((c) => [c.id, c]));
  const polar = shelf.find((id) => byId.get(id)!.tpsa > 90)!;
  const notApproved = shelf.find((id) => byId.get(id)!.library !== 'ChEMBL 승인약')!;
  const outside = ds.compounds.find((c) => !shelf.includes(c.id))!.id;
  const noReason = await sa.call('POST', API.claims, { compoundId: shelf[0] });
  const bbb = await sa.call('POST', API.claims, { compoundId: polar, reason: 'bbb' });
  const known = await sa.call('POST', API.claims, { compoundId: notApproved, reason: 'known' });
  const out = await sa.call('POST', API.claims, { compoundId: outside, reason: 'top' });
  check('⑧ 찜 근거 — 없음 400 · 데이터와 틀림 400 reason_blocked(TPSA > 90 에 "뇌로" · 승인약 아닌데 "승인약") · 진열대 밖 400', () => {
    assert.ok(polar && notApproved, '진열대에 TPSA > 90 · 승인약 아닌 분자가 있어야 해요');
    assert.equal(noReason.status, 400);
    assert.equal(bbb.status, 400);
    assert.equal(err(bbb)?.code, 'reason_blocked');
    assert.equal(known.status, 400);
    assert.equal(err(known)?.code, 'reason_blocked');
    assert.equal(out.status, 400);
  });

  const target = shelf[0]!;
  const race = await Promise.all(people.map((s) => s.call('POST', API.claims, { compoundId: target, reason: 'top', screenJobId: done.shelf!.jobId })));
  const raceWinner = people[race.findIndex((r) => r.status === 201)];
  check('② 같은 분자를 넷이 동시에 찜 → 1명만 201 · 3명은 409 claimed(먼저 찜한 사람 이름)', () => {
    assert.equal(race.filter((r) => r.status === 201).length, 1, statuses(race));
    assert.ok(race.filter((r) => r.status !== 201).every((r) => r.status === 409 && err(r)?.code === 'claimed' && err(r)!.message.includes(`${raceWinner!.name} 님이 먼저`)), statuses(race));
  });
  let next = 1;
  const burst = await Promise.all(
    people.flatMap((s) => (s === raceWinner ? [1, 2] : [1, 2, 3]).map(() => s.call('POST', API.claims, { compoundId: shelf[next++]!, reason: 'top' }))),
  );
  const claimed = await sd.screen();
  check('② 각자 여러 분자를 동시에 찜해도 1인 2개 · 칸 1 · 2 · 넘친 요청은 409 claimed', () => {
    for (const s of people) {
      const mine = claimed.claims.filter((c) => c.userId === s.userId);
      assert.equal(mine.length, 2, `${s.name} ${mine.length}개`);
      assert.deepEqual(mine.map((c) => c.slot).sort(), [1, 2]);
      assert.ok(mine.every((c) => c.reason === 'top'));
    }
    const over = burst.filter((r) => r.status !== 201);
    assert.equal(over.length, 4, statuses(burst));
    assert.ok(over.every((r) => r.status === 409 && err(r)?.code === 'claimed'));
  });

  // 다시 실행하면 진열대가 바뀐다 — 옛 진열대로 찜하면 409 stale
  assert.equal((await sa.call('DELETE', API.claim(claimed.claims.find((c) => c.userId === sa.userId)!.compoundId))).status, 200);
  const rerun = await sb.call<{ job: { id: string } }>('POST', API.jobs, { requestId: requestId(), step: '1.2', params: {} });
  assert.equal(rerun.status, 201, statuses([rerun]));
  const done2 = await waitRun(sa, rerun.body.job.id);
  const free = done2.shelf!.passIds.find((id) => !done2.claims.some((c) => c.compoundId === id))!;
  const stale = await sa.call('POST', API.claims, { compoundId: free, reason: 'top', screenJobId: done.shelf!.jobId });
  const fresh = await sa.call('POST', API.claims, { compoundId: free, reason: 'top', screenJobId: done2.shelf!.jobId });
  check('⑧ 다시 실행 뒤 옛 진열대로 찜 → 409 stale · 새 진열대면 201 · 실행 기록 2회(스냅숏 남음)', () => {
    assert.equal(stale.status, 409);
    assert.equal(err(stale)?.code, 'stale');
    assert.equal(fresh.status, 201, statuses([fresh]));
    assert.equal(done2.runs.filter((r) => r.status === 'succeeded' && r.snapshot).length, 2);
  });

  // 찜의 사전 Vina 값은 서버 전용 칸(claims.vina_kcal)에만 — FSEL '찜 회고' 평균용. 화면(board.claims · /api/screen)으로는 나가지 않는다.
  const kcalRows = await webQuery<{ compound_id: string; vina_kcal: string | null }>('select compound_id, vina_kcal from web.claims where program_revision_id = $1', [agreedView.revisionId]);
  const afterClaims = JSON.stringify(await sa.screen()) + JSON.stringify((await sa.board()).claims);
  check('찜의 사전 Vina 값 — DB 서버 전용 칸에는 남고(찜 회고) 화면 응답에는 없다', () => {
    assert.ok(kcalRows.length >= 8, `찜 ${kcalRows.length}`);
    const stored = kcalRows.filter((r) => r.vina_kcal !== null);
    assert.ok(stored.length >= kcalRows.length - 2 && stored.every((r) => Number(r.vina_kcal) < 0), JSON.stringify(kcalRows));
    for (const r of kcalRows) assert.equal(afterClaims.includes(String(Number(r.vina_kcal))), false, `${r.compound_id} 의 사전 Vina 값이 화면 응답에`);
    assert.equal(/vinaKcal":-/.test(afterClaims), false);
  });

  // 정족수 = 그 시각 모둠 인원의 과반 — 모둠을 떠난 사람의 표는 세지 않는다(4명 → 3명이면 정족수 2, 떠난 사람 표 + 1표로 합의되면 안 됨).
  assert.equal((await sb.call('POST', SCREEN_API.reopen('alert'))).status, 200);
  assert.equal((await sd.call('POST', SCREEN_API.votes, { agenda: 'alert', proposedBy: sc.userId, value: 0, reason: 'fix' })).status, 200);
  await webQuery('update web.members set team_id = null where user_id = $1', [sd.userId]);
  let leftVote: Reply<{ agreed: boolean }> | null = null;
  let ownVote: Reply<{ agreed: boolean }> | null = null;
  let leftView: ScreenResponse | null = null;
  try {
    leftVote = await sa.call<{ agreed: boolean }>('POST', SCREEN_API.votes, { agenda: 'alert', proposedBy: sc.userId, value: 0, reason: 'fix' });
    leftView = await sa.screen();
    ownVote = await sc.call<{ agreed: boolean }>('POST', SCREEN_API.votes, { agenda: 'alert', proposedBy: sc.userId, value: 0, reason: 'fix' });
  } finally {
    await webQuery('update web.members set team_id = $2 where user_id = $1', [sd.userId, team.id]);
  }
  check('⑥ 떠난 모둠원의 표는 세지 않는다 — 3명(정족수 2)에서 떠난 사람 표 + 1표는 합의 아님 · 2표째에 합의', () => {
    assert.equal(leftVote?.status, 200, statuses([leftVote!]));
    assert.equal(leftVote?.body.agreed, false);
    assert.equal(leftView?.quorum, 2);
    assert.equal(agendaOf(leftView!, 'alert').proposals.find((p) => p.proposedBy === sc.userId)?.votes.length, 1);
    assert.equal(ownVote?.status, 200, statuses([ownVote!]));
    assert.equal(ownVote?.body.agreed, true);
  });

  const steps = (await sa.board()).steps;
  check('1.2 완료(실행 1회) → 2.1 열림', () => {
    assert.equal(steps.find((x) => x.id === '1.2')?.state, 'done');
    assert.notEqual(steps.find((x) => x.id === '2.1')?.state, 'locked');
  });

  // 7. 게임 표 무변경
  const after = await countPublic();
  const diffs = [...new Set([...before.keys(), ...after.keys()])].filter((t) => before.get(t) !== after.get(t));
  check(`게임 표 무변경 — public ${after.size}개 표의 행 수가 시작 전과 같다`, () => assert.deepEqual(diffs, []));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과${failed.length ? ` — 실패: ${failed.map((f) => f.label).join(' / ')}` : ''}`);
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error('[e2e:screen]', (error as Error).stack ?? error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
