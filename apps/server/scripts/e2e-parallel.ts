/**
 * 0003_parallel_lab 완료 조건 점검(설계 §6.4 · §7.3 · §7.4) — 4인 모둠이 같은 화면을 동시에 만지는 경우를
 * 떠 있는 로컬 서버에 실제 HTTP 로 동시에 보내 확인한다.
 *
 *   crista 워커 fixture 모드 8790 · npm run dev:server   (다른 터미널)
 *   npm run e2e:parallel                                 (tools/with-local-env.mjs 가 로컬 값만 싣는다)
 *
 * 1. 1.1 표적 추천 카드 4장을 한꺼번에 내면 4장 모두 남는다.
 * 2. 1.2 같은 후보를 넷이 한꺼번에 찜하면 한 명만 되고 나머지는 409 claimed(먼저 찜한 사람 이름). 한 사람은 칸 1 · 2 까지(DB 제약).
 * 3. 2.1 병렬 도킹 4건이 모두 남는다. 표적을 바꿔 새 버전이 열리면 옛 버전 결과는 새 버전 근거에 섞이지 않는다.
 * 4. 2.2 주력 · 백업은 한 쌍으로 저장되고, 낡은 expectedVersion 의 동시 요청은 409 stale.
 * 5. 연구 노트 — 다른 칸은 동시에 저장되고, 같은 칸 · 같은 expectedVersion 이면 한 명만 되고 늦은 쪽은 409 stale + 상대 본문.
 * 6. public 표 행 수가 시작 전과 같다(관리자 연결 · 읽기만).
 *
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미가 붙는다 — 걷어내기는 db/README.md). 가입 4번 · 교사 1명.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  type ApiErrorBody,
  type BoardResponse,
  type MeResponse,
  type NoteResponse,
  type StartJobResponse,
  type TeacherClassDetail,
  type WebJobView,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
const ORIGIN = BASE;
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

// ── HTTP ──

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
      headers: {
        origin: ORIGIN,
        ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
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
    if (r.status !== 200) throw new Error(`${this.name} 화면 읽기 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
}

const err = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error;
const statuses = (replies: Reply[]) => replies.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');
const requestId = () => randomBytes(12).toString('hex');

/** 작업이 끝날 때까지 화면을 읽는다(fixture 워커는 몇 초). */
async function waitJobs(agent: Agent, ids: string[], ms = 90_000): Promise<WebJobView[]> {
  const until = Date.now() + ms;
  for (;;) {
    const board = await agent.board();
    const jobs = ids.map((id) => board.jobs.find((j) => j.id === id));
    if (jobs.every((j) => j && (j.status === 'succeeded' || j.status === 'failed'))) return jobs as WebJobView[];
    if (Date.now() > until) throw new Error(`작업이 끝나지 않았습니다: ${jobs.map((j) => `${j?.step}:${j?.status}`).join(',')}`);
    await new Promise((r) => setTimeout(r, 700));
  }
}

// ── public 행 수(관리자 연결 · 읽기만) ──

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

/** crista_web 로 claims 에 직접 넣어 본다 — 서버를 비켜 가도 DB 가 칸 상한을 지키는가. 늘 되돌린다. */
async function tryClaimInsert(values: { teamId: string; revisionId: string; compoundId: string; slot: number; screenJobId: string; userId: string }): Promise<string> {
  const client = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-claims' });
  await client.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into web.claims (team_id, program_revision_id, compound_id, slot, name, smiles, screen_job_id, claimed_by)
       values ($1, $2, $3, $4, 'probe', 'C', $5, $6)`,
      [values.teamId, values.revisionId, values.compoundId, values.slot, values.screenJobId, values.userId],
    );
    return 'inserted';
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    return `${e.code}:${e.constraint ?? ''}`;
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

// ── 시나리오 ──

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다. \`npm run dev:server\` 를 먼저.`);
  const before = await countPublic();
  console.log(`public 표 ${before.size}개 · 행 ${[...before.values()].reduce((a, b) => a + b, 0)} — 실행 접미 ${suffix}\n`);

  // 준비 — 교사 · 학급(모둠 2 · 모둠 정원 4 — 첫 모둠만 쓴다) · 학생 4 가입 · 입사 · 등기
  const teacherId = `t${suffix}p`;
  const secret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: teacherId, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `병렬 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const people = ['a', 'b', 'c', 'd'].map((n) => new Agent(`학생${n.toUpperCase()}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `p${suffix}${'abcd'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [sa, sb, sc, sd] = people as [Agent, Agent, Agent, Agent];
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `병렬제약${suffix}`, ticker: `PL${suffix.slice(0, 2).replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}` })).status, 201);
  const start = await sa.board();
  const [d0, d1] = start.diseases;
  assert.ok(d0 && d1, '질환이 둘 이상 있어야 합니다.');
  console.log(`모둠 ${team.id} · 연구비 ${start.balanceCents} · 비용 ${JSON.stringify(start.costs)} · 워커 ${start.workerMode}\n`);

  // 1. 1.1 추천 카드 4장 동시
  const picks = await Promise.all(people.map((s, i) => s.call('POST', API.picks, { diseaseId: start.diseases[i % start.diseases.length]!.diseaseId, note: `${s.name} 추천` })));
  const afterPicks = await sb.board();
  check('① 1.1 — 추천 카드 4장을 한꺼번에 내면 4장 모두 남는다(사람마다 한 장)', () => {
    assert.deepEqual(picks.map((r) => r.status), [200, 200, 200, 200], statuses(picks));
    assert.equal(afterPicks.picks.length, 4);
    assert.deepEqual(new Set(afterPicks.picks.map((p) => p.userId)), new Set(people.map((s) => s.userId)));
  });

  // 표적 — 넷이 같은 질환으로 한꺼번에 확정해도 버전은 1번 하나
  const targets = await Promise.all(people.map((s) => s.call('POST', API.target, { diseaseId: d0.diseaseId })));
  const rev1 = await sa.board();
  check('1.1 — 같은 표적 동시 확정 4건 → 모두 200 · 표적 버전은 1번 그대로', () => {
    assert.deepEqual(targets.map((r) => r.status), [200, 200, 200, 200], statuses(targets));
    assert.equal(rev1.program.revisionNo, 1);
    assert.equal(rev1.program.targetId, d0.targetId);
  });
  assert.equal((await sa.call('PUT', API.note('1.1', 'why'), { body: '표적을 고른 이유', expectedVersion: 0 })).status, 200);

  // 1.2 스크리닝
  const screen = await sa.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '1.2', params: { maxMw: 600, maxTpsa: 150, ro5Only: false, excludeAlerts: false } });
  assert.equal(screen.status, 201, JSON.stringify(screen.body));
  const [screenJob] = await waitJobs(sa, [screen.body.job.id]);
  assert.equal(screenJob!.status, 'succeeded', JSON.stringify(screenJob!.error));
  const candidates = screenJob!.result?.candidates ?? [];
  console.log(`  · 1.2 후보 ${candidates.length}개 · 버전 ${screenJob!.revisionId === rev1.program.revisionId ? '지금 버전' : '다른 버전'}`);
  assert.ok(candidates.length >= 12, `후보가 12개 이상 필요합니다(${candidates.length}).`);

  // 2. 같은 후보 동시 찜
  const c0 = candidates[0]!.compoundId;
  const race = await Promise.all(people.map((s) => s.call('POST', API.claims, { screenJobId: screenJob!.id, compoundId: c0 })));
  const winner = people[race.findIndex((r) => r.status === 201)];
  check('② 1.2 — 같은 후보를 넷이 한꺼번에 찜 → 1명만 201 · 3명은 409 claimed(먼저 찜한 사람 이름)', () => {
    assert.equal(race.filter((r) => r.status === 201).length, 1, statuses(race));
    const losers = race.filter((r) => r.status === 409);
    assert.equal(losers.length, 3, statuses(race));
    for (const r of losers) {
      assert.equal(err(r)?.code, 'claimed');
      assert.match(err(r)!.message, new RegExp(`${winner!.name} 님이 먼저 찜했어요`));
    }
  });

  // 한 사람이 서로 다른 후보 3개를 한꺼번에 — 승자는 이미 1개라 1개만 더, 나머지는 2개까지
  let next = 1;
  const burst = await Promise.all(
    people.flatMap((s) => {
      const mine = (s === winner ? [1, 2] : [1, 2, 3]).map(() => candidates[next++]!.compoundId);
      return mine.map((compoundId) => s.call('POST', API.claims, { screenJobId: screenJob!.id, compoundId }).then((r) => ({ s, r })));
    }),
  );
  const afterClaims = await sc.board();
  check('② 1.2 — 각자 여러 후보를 한꺼번에 찜해도 1인 2개 · 칸 1 · 2 · 넘친 요청은 409 claimed', () => {
    for (const s of people) {
      const mine = afterClaims.claims.filter((c) => c.userId === s.userId);
      assert.equal(mine.length, 2, `${s.name} ${mine.length}개`);
      assert.deepEqual(mine.map((c) => c.slot).sort(), [1, 2]);
    }
    const over = burst.filter(({ r }) => r.status !== 201);
    assert.equal(over.length, 4, statuses(burst.map((b) => b.r)));
    assert.ok(over.every(({ r }) => r.status === 409 && err(r)?.code === 'claimed' && /2개까지/.test(err(r)!.message)));
  });

  const aClaims = afterClaims.claims.filter((c) => c.userId === sa.userId);
  // 넘쳐서 거절된 후보 — 아무도 찜하지 않았다.
  const spare = candidates.find((c) => !afterClaims.claims.some((x) => x.compoundId === c.compoundId))!.compoundId;
  const probeBase = { teamId: team.id, revisionId: rev1.program.revisionId, screenJobId: screenJob!.id, userId: sa.userId };
  const slot3 = await tryClaimInsert({ ...probeBase, compoundId: spare, slot: 3 });
  const slotDup = await tryClaimInsert({ ...probeBase, compoundId: spare, slot: 1 });
  // 칸이 빈 계정(교사)으로 — 칸 키가 아니라 (버전, 후보) 키에 걸리는지만 본다.
  const sameCompound = await tryClaimInsert({ ...probeBase, userId: secret.userId, compoundId: aClaims[0]!.compoundId, slot: 1 });
  check('② DB 제약 — 서버를 비켜 넣어도 칸 3 거절(check) · 같은 사람 같은 칸 거절(unique) · 같은 버전 같은 후보 거절(PK)', () => {
    assert.equal(slot3, '23514:claims_slot_check');
    assert.equal(slotDup, '23505:claims_person_slot_key');
    assert.equal(sameCompound, '23505:claims_pkey');
  });

  // 놓으면 그 칸이 다시 빈다
  const released = aClaims.find((c) => c.slot === 1)!;
  const del = await sa.call('DELETE', API.claim(released.compoundId));
  const reclaim = await sa.call('POST', API.claims, { screenJobId: screenJob!.id, compoundId: spare });
  const afterReclaim = await sa.board();
  check('② 찜 놓기 → 빈 칸 1 을 다시 쓴다', () => {
    assert.equal(del.status, 200);
    assert.equal(reclaim.status, 201, JSON.stringify(reclaim.body));
    assert.equal(afterReclaim.claims.find((c) => c.compoundId === spare)?.slot, 1);
  });

  // 3. 2.1 병렬 도킹 4건 — 각자 자기 찜 분자
  const dockReplies = await Promise.all(
    people.map((s) => {
      const claim = afterReclaim.claims.find((c) => c.userId === s.userId)!;
      return s.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.1', params: { smiles: claim.smiles, label: `${s.name}-${claim.name ?? claim.compoundId}`.slice(0, 24) } });
    }),
  );
  assert.deepEqual(dockReplies.map((r) => r.status), [201, 201, 201, 201], statuses(dockReplies));
  const docks = await waitJobs(sa, dockReplies.map((r) => r.body.job.id));
  const afterDocks = await sb.board();
  check('③ 2.1 — 병렬 도킹 4건이 모두 끝나 남는다(사람마다 1건 · 지금 표적 버전)', () => {
    assert.ok(docks.every((j) => j.status === 'succeeded'), docks.map((j) => `${j.status}:${j.error?.message ?? ''}`).join(','));
    const mine = afterDocks.jobs.filter((j) => j.step === '2.1' && j.revisionId === afterDocks.program.revisionId);
    assert.equal(mine.length, 4);
    assert.deepEqual(new Set(mine.map((j) => j.byUserId)), new Set(people.map((s) => s.userId)));
    assert.equal(afterDocks.steps.find((s) => s.id === '2.1')?.state, 'done');
  });

  // 4. 2.2 ADMET 2건 → 주력 · 백업 동시 지정
  const admetReplies = await Promise.all([sa, sb].map((s, i) => s.call<StartJobResponse>('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: docks[i]!.id } })));
  assert.deepEqual(admetReplies.map((r) => r.status), [201, 201], statuses(admetReplies));
  const admets = await waitJobs(sa, admetReplies.map((r) => r.body.job.id));
  assert.ok(admets.every((j) => j.status === 'succeeded'));
  const leadBefore = (await sa.board()).program.leadVersion;
  const pairA = { leadJobId: admets[0]!.id, backupJobId: admets[1]!.id };
  const pairB = { leadJobId: admets[1]!.id, backupJobId: docks[2]!.id };
  const leadRace = await Promise.all([
    sa.call('PUT', API.lead, { ...pairA, expectedVersion: leadBefore }),
    sb.call('PUT', API.lead, { ...pairB, expectedVersion: leadBefore }),
  ]);
  const afterLead = await sc.board();
  const won = leadRace[0]!.status === 200 ? pairA : pairB;
  check('④ 2.2 — 같은 expectedVersion 의 동시 지정 2건 → 1건 200 · 1건 409 stale · 주력 · 백업은 이긴 쪽 쌍 그대로', () => {
    assert.deepEqual(leadRace.map((r) => r.status).sort(), [200, 409], statuses(leadRace));
    assert.equal(err(leadRace.find((r) => r.status === 409)!)?.code, 'stale');
    assert.equal(afterLead.program.leadVersion, leadBefore + 1);
    assert.equal(afterLead.program.lead?.jobId, won.leadJobId);
    assert.equal(afterLead.program.backup?.jobId, won.backupJobId);
    assert.equal(afterLead.steps.find((s) => s.id === '2.2')?.state, 'done');
  });
  const oldVersion = await sd.call('PUT', API.lead, { ...pairB, expectedVersion: leadBefore });
  const noVersion = await sd.call('PUT', API.lead, { ...pairB });
  const fresh = await sd.call('PUT', API.lead, { leadJobId: pairB.leadJobId, backupJobId: null, expectedVersion: afterLead.program.leadVersion });
  const afterFresh = await sd.board();
  check('④ 2.2 — 낡은 버전 409 stale · 버전 없음 400 · 새 버전이면 200(백업 비우기도 한 쌍으로)', () => {
    assert.equal(oldVersion.status, 409);
    assert.equal(err(oldVersion)?.code, 'stale');
    assert.equal(noVersion.status, 400);
    assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
    assert.equal(afterFresh.program.leadVersion, leadBefore + 2);
    assert.equal(afterFresh.program.lead?.jobId, pairB.leadJobId);
    assert.equal(afterFresh.program.backup, null);
  });

  // 5. 연구 노트
  const sections = ['why', 'unknown', 'fallback'] as const;
  const cells = await Promise.all(sections.map((sec, i) => people[i]!.call<NoteResponse>('PUT', API.note('2.1', sec), { body: `${people[i]!.name} 의 ${sec}`, expectedVersion: 0 })));
  const afterCells = await sd.board();
  check('⑤ 노트 — 세 사람이 서로 다른 칸 3개를 동시에 → 모두 200 · 각 칸 버전 1 · 본문 그대로', () => {
    assert.deepEqual(cells.map((r) => r.status), [200, 200, 200], statuses(cells));
    for (const [i, sec] of sections.entries()) {
      const n = afterCells.notes.find((x) => x.stepId === '2.1' && x.section === sec);
      assert.equal(n?.body, `${people[i]!.name} 의 ${sec}`);
      assert.equal(n?.version, 1);
    }
  });
  const sameCell = await Promise.all([sb, sc].map((s) => s.call<NoteResponse>('PUT', API.note('2.1', 'why'), { body: `${s.name} 가 고친 why`, expectedVersion: 1 })));
  const lost = sameCell.find((r) => r.status === 409);
  const wonCell = sameCell.find((r) => r.status === 200);
  const wonBy = sameCell[0] === wonCell ? sb : sc;
  check('⑤ 노트 — 같은 칸 · 같은 expectedVersion 동시 수정 → 1명 200(버전 2) · 늦은 쪽 409 stale + 상대 본문 · 버전', () => {
    assert.deepEqual(sameCell.map((r) => r.status).sort(), [200, 409], statuses(sameCell));
    assert.equal((wonCell!.body as NoteResponse).version, 2);
    assert.equal(err(lost!)?.code, 'stale');
    assert.equal(err(lost!)?.note?.body, `${wonBy.name} 가 고친 why`);
    assert.equal(err(lost!)?.note?.version, 2);
    assert.equal(err(lost!)?.note?.byName, wonBy.name);
  });
  const newCell = await Promise.all([sa, sd].map((s) => s.call('PUT', API.note('2.2', 'why'), { body: `${s.name} 가 처음 쓴 칸`, expectedVersion: 0 })));
  const staleDelete = await sa.call('PUT', API.note('2.1', 'why'), { body: '', expectedVersion: 1 });
  const goodDelete = await sa.call<NoteResponse>('PUT', API.note('2.1', 'why'), { body: '', expectedVersion: 2 });
  const afterDelete = await sa.board();
  check('⑤ 노트 — 빈 칸을 둘이 동시에 처음 쓰면 1명만 · 낡은 버전으로 지우기 409 · 맞는 버전이면 지워져 버전 0', () => {
    assert.deepEqual(newCell.map((r) => r.status).sort(), [200, 409], statuses(newCell));
    assert.equal(err(newCell.find((r) => r.status === 409)!)?.note?.version, 1);
    assert.equal(staleDelete.status, 409);
    assert.equal(goodDelete.status, 200);
    assert.equal(goodDelete.body.version, 0);
    assert.equal(afterDelete.notes.find((n) => n.stepId === '2.1' && n.section === 'why'), undefined);
  });

  // 3. 표적 바꾸기 → 새 버전 — 옛 결과는 남고 새 버전 근거에는 섞이지 않는다
  const change = await sc.call('POST', API.target, { diseaseId: d1.diseaseId });
  const rev2 = await sd.board();
  const evidence = (b: BoardResponse, step: string) => b.jobs.filter((j) => j.step === step && j.revisionId === b.program.revisionId);
  const dockNow = await sa.call('POST', API.jobs, { requestId: requestId(), step: '2.1', params: { smiles: docks[0]!.smiles } });
  const admetOld = await sa.call('POST', API.jobs, { requestId: requestId(), step: '2.2', params: { dockingJobId: docks[3]!.id } });
  const claimOld = await sa.call('POST', API.claims, { screenJobId: screenJob!.id, compoundId: candidates[0]!.compoundId });
  const leadOld = await sa.call('PUT', API.lead, { leadJobId: pairA.leadJobId, expectedVersion: rev2.program.leadVersion });
  check('③ 표적 변경 — 새 버전 2 · 옛 도킹 4건은 남지만 새 버전 근거 0 · 찜 · 리드 비고 1.2 부터 · 1.1 노트만 이어짐', () => {
    assert.equal(change.status, 200);
    assert.equal(rev2.program.revisionNo, 2);
    assert.notEqual(rev2.program.revisionId, rev1.program.revisionId);
    assert.equal(rev2.program.targetId, d1.targetId);
    assert.equal(rev2.jobs.filter((j) => j.step === '2.1' && j.revisionId === rev1.program.revisionId && j.status === 'succeeded').length, 4);
    assert.equal(evidence(rev2, '1.2').length + evidence(rev2, '2.1').length + evidence(rev2, '2.2').length, 0);
    assert.equal(rev2.claims.length, 0);
    assert.equal(rev2.program.lead, null);
    assert.equal(rev2.program.leadVersion, 0);
    assert.deepEqual(['1.2', '2.1', '2.2'].map((id) => rev2.steps.find((s) => s.id === id)?.state), ['ready', 'locked', 'locked']);
    assert.deepEqual(rev2.notes.map((n) => `${n.stepId}:${n.section}`), ['1.1:why']);
  });
  check('③ 표적 변경 — 옛 버전 결과로는 2.1 · 2.2 · 찜 · 리드 모두 409 step_locked', () => {
    for (const r of [dockNow, admetOld, claimOld, leadOld]) {
      assert.equal(r.status, 409, statuses([dockNow, admetOld, claimOld, leadOld]));
      assert.equal(err(r)?.code, 'step_locked');
    }
  });
  const back = await sd.call('POST', API.target, { diseaseId: d0.diseaseId });
  const rev3 = await sa.board();
  check('③ 원래 표적으로 돌아와도 버전 3 — 같은 표적의 옛 버전 1 결과를 근거로 세지 않는다', () => {
    assert.equal(back.status, 200);
    assert.equal(rev3.program.revisionNo, 3);
    assert.equal(rev3.program.targetId, d0.targetId);
    assert.equal(evidence(rev3, '1.2').length + evidence(rev3, '2.1').length, 0);
    assert.deepEqual(['1.2', '2.1'].map((id) => rev3.steps.find((s) => s.id === id)?.state), ['ready', 'locked']);
  });

  // 6. 게임 표 무변경
  const after = await countPublic();
  const diffs = [...new Set([...before.keys(), ...after.keys()])].filter((t) => before.get(t) !== after.get(t));
  check(`⑥ 게임 표 무변경 — public ${after.size}개 표의 행 수가 시작 전과 같다`, () => {
    assert.equal(after.size, before.size);
    assert.deepEqual(diffs.map((t) => `${t} ${before.get(t)} → ${after.get(t)}`), []);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과${failed.length ? ` — 실패: ${failed.map((f) => f.label).join(' / ')}` : ''}`);
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error('[e2e:parallel]', (error as Error).stack ?? error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
