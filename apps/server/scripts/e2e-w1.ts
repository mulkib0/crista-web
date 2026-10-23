/**
 * W1 완료 조건 점검(설계 §11) — 떠 있는 로컬 서버에 실제 HTTP · WebSocket 으로 붙는다.
 *
 *   npm run dev:server        (다른 터미널)
 *   npm run e2e:w1            (tools/with-local-env.mjs 가 로컬 값만 싣는다)
 *
 * 1. public 스키마 표별 행 수를 센다(관리자 연결 · 읽기만).
 * 2. 교사 1(`teacher:create` 스크립트) → 학급(모둠 2 · walk-in · 정원 4) → 학생 4 가입(학급 코드) → 두 모둠 입사
 *    → 같은 모둠의 동시 등기 요청 여러 개 중 하나만 반영 → 다른 모둠 등기(이름 · 티커 중복 거절 확인)
 * 3. 거절 경로: 틀린 코드 · 정원 초과 · 아이디 중복 · 틀린 비밀번호 · 남의 사옥 · 정원 찬 사옥 · 교사 전용 경로 · 다른 사이트 Origin
 * 4. assigned 학급: 배정 전 입사 거절 → 교사 배정 → 입사 · 등기
 * 5. WebSocket: 학급 채널로 입사 · 등기 소식이 오고, 로그아웃하면 연결이 닫힌다.
 * 6. public 행 수를 다시 세어 같은지 본다.
 *
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미가 붙는다 — 걷어내기는 db/README.md).
 * 한 번에 127.0.0.1 로 가입을 13번 한다 — 가입 상한(IP 당 분당 60) 때문에 1분에 4번까지만 돌린다(넘으면 429).
 * crista 게임 서버가 같은 로컬 DB 에서 돌면 게임 표 행 수가 저절로 바뀐다 — 그때는 바뀐 표에서 웹 흔적이 0건인지 본다.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import WebSocket from 'ws';
import { API, type ApiErrorBody, type MeResponse, type ServerMessage, type TeacherClassDetail, type TeamView } from '@crista-web/web-contract';

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
  cookie: string | null;
}

class Agent {
  cookie: string | null = null;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }

  async call<T = unknown>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Reply<T>> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        origin: ORIGIN,
        ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}),
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...headers,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
    if (setCookie) {
      const pair = setCookie.split(';')[0]!;
      this.cookie = pair.endsWith('=') ? null : pair;
    }
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T, cookie: setCookie ?? null };
  }
}

const errCode = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error?.code;

// ── WebSocket ──

interface Listener {
  ws: WebSocket;
  messages: ServerMessage[];
  closed: Promise<number>;
  waitFor(pred: (m: ServerMessage) => boolean, ms?: number): Promise<ServerMessage>;
}

function listen(agent: Agent): Promise<Listener> {
  const url = `${BASE.replace(/^http/, 'ws')}${API.ws}`;
  const ws = new WebSocket(url, { headers: { cookie: agent.cookie ?? '', origin: ORIGIN } });
  const messages: ServerMessage[] = [];
  const waiters: Array<{ pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }> = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(String(data)) as ServerMessage;
    messages.push(msg);
    for (const w of [...waiters]) if (w.pred(msg)) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(msg);
    }
  });
  const closed = new Promise<number>((resolve) => ws.on('close', (code) => resolve(code)));
  const listener: Listener = {
    ws,
    messages,
    closed,
    waitFor(pred, ms = 3000) {
      const hit = messages.find(pred);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket 메시지를 기다리다 시간이 지났습니다.')), ms);
        waiters.push({ pred, resolve: (m) => (clearTimeout(timer), resolve(m)) });
      });
    },
  };
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve(listener));
    ws.once('unexpected-response', (_req, res) => reject(new Error(`WebSocket 거절 ${res.statusCode}`)));
    ws.once('error', reject);
  });
}

function wsStatus(headers: Record<string, string>): Promise<number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}${API.ws}`, { headers });
    ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
    ws.once('open', () => (ws.close(), resolve(101)));
    ws.once('error', () => resolve(-1));
  });
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

/**
 * 바뀐 public 표에서 웹 쪽 흔적을 찾는다 — 그 표의 uuid · text 칸 어디든 이번 실행의 웹 계정 id 나 `web:` · `web-` 접두 값이 있으면 센다.
 * (crista 게임 서버가 같은 로컬 DB 에서 돌고 있으면 게임 표의 행 수는 웹과 상관없이 바뀐다.)
 */
async function webTraces(tables: string[], webUserIds: string[]): Promise<Map<string, number>> {
  const client = new pg.Client({ connectionString: process.env.CRISTA_DATABASE_URL, application_name: 'crista-web-e2e-count' });
  await client.connect();
  const out = new Map<string, number>();
  try {
    await client.query('begin read only');
    for (const table of tables) {
      const cols = await client.query<{ c: string }>(
        `select column_name as c from information_schema.columns
          where table_schema = 'public' and table_name = $1 and data_type in ('uuid', 'text', 'character varying')`,
        [table],
      );
      if (cols.rows.length === 0) {
        out.set(table, 0);
        continue;
      }
      const where = cols.rows.map(({ c }) => `${client.escapeIdentifier(c)}::text = any($1::text[]) or ${client.escapeIdentifier(c)}::text like 'web:%' or ${client.escapeIdentifier(c)}::text like 'web-%'`).join(' or ');
      const r = await client.query<{ n: string }>(`select count(*)::text as n from public.${client.escapeIdentifier(table)} where ${where}`, [webUserIds]);
      out.set(table, Number(r.rows[0]!.n));
    }
    await client.query('rollback');
  } finally {
    await client.end();
  }
  return out;
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const script = join(here, 'teacher-create.ts');
  const run = spawnSync(process.execPath, [script, '--login', loginId, '--name', `점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

// ── 시나리오 ──

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다. \`npm run dev:server\` 를 먼저.`);

  const before = await countPublic();
  console.log(`public 표 ${before.size}개 · 행 ${[...before.values()].reduce((a, b) => a + b, 0)} — 실행 접미 ${suffix}\n`);

  // 교사
  const teacherId = `t${suffix}`;
  const teacherSecret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  const tLogin = await teacher.call<MeResponse>('POST', API.login, { loginId: teacherId, password: teacherSecret.password });
  check('교사 — teacher:create 로 만든 계정으로 로그인 · 쿠키는 HttpOnly', () => {
    assert.equal(tLogin.status, 200, JSON.stringify(tLogin.body));
    assert.equal(tLogin.body.next, 'teacher');
    assert.match(tLogin.cookie ?? '', /HttpOnly/);
    assert.match(tLogin.cookie ?? '', /SameSite=Lax/);
  });

  const created = await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `W1 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 4 });
  const cls = created.body;
  check('학급 — 코드 6자 · 모둠 2 · walk-in · 모둠 정원 ⌈4÷2⌉=2', () => {
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.match(cls.code, /^[2-9A-HJKMNP-Z]{6}$/);
    assert.equal(cls.teams.length, 2);
    assert.deepEqual(cls.teams.map((t) => t.plot), [1, 2]);
    assert.equal(cls.teamCapacity, 2);
    assert.equal(cls.assignment, 'walk-in');
  });
  const [team1, team2] = cls.teams as [TeamView, TeamView];
  const teacherWs = await listen(teacher);

  // 학생 4
  const names = ['a', 'b', 'c', 'd'];
  const students = names.map((n) => new Agent(`학생 ${n}`));
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const signups: Reply<MeResponse>[] = [];
  for (const [i, s] of students.entries()) {
    signups.push(await s.call<MeResponse>('POST', API.signup, { classCode: cls.code.toLowerCase(), loginId: `s${suffix}${names[i]}`, displayName: `학생${names[i]!.toUpperCase()}`, password }));
  }
  check('학생 4 — 학급 코드로 가입(소문자로 쳐도 됨) · 바로 로그인된 쿠키 · 다음은 사옥 지구', () => {
    for (const r of signups) {
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.next, 'district');
      assert.equal(r.body.class?.id, cls.id);
      assert.ok(r.cookie);
    }
  });

  const extra = new Agent('5번째');
  const [badCode, full, dup] = [
    await extra.call('POST', API.signup, { classCode: 'ZZZZZZ', loginId: `s${suffix}x`, displayName: 'x', password }),
    await extra.call('POST', API.signup, { classCode: cls.code, loginId: `s${suffix}e`, displayName: 'e', password }),
    await extra.call('POST', API.signup, { classCode: cls.code, loginId: `s${suffix}a`, displayName: 'a', password }),
  ];
  check('가입 거절 — 틀린 코드 404 · 정원 초과 409 class_full · 아이디 중복 409', () => {
    assert.equal(badCode.status, 404);
    assert.equal(errCode(badCode), 'invalid_class_code');
    assert.equal(full.status, 409);
    assert.equal(errCode(full), 'class_full');
    assert.equal(dup.status, 409);
    assert.equal(errCode(dup), 'login_id_taken');
  });

  const relogin = new Agent('다시 로그인');
  const wrong = await relogin.call('POST', API.login, { loginId: `s${suffix}a`, password: 'wrong-password' });
  const right = await relogin.call<MeResponse>('POST', API.login, { loginId: `s${suffix}a`, password });
  check('로그인 — 틀린 비밀번호 401 · 맞으면 200', () => {
    assert.equal(wrong.status, 401);
    assert.equal(errCode(wrong), 'invalid_credentials');
    assert.equal(right.status, 200);
    assert.equal(right.body.account.loginId, `s${suffix}a`);
  });

  const [sa, sb, sc, sd] = students as [Agent, Agent, Agent, Agent];
  const forbidden = await sa.call('GET', API.classes);
  const crossSite = await sa.call('POST', API.join(team1.id), {}, { origin: 'https://evil.example' });
  const wsNoCookie = await wsStatus({ origin: ORIGIN });
  const wsEvil = await wsStatus({ origin: 'https://evil.example', cookie: sa.cookie ?? '' });
  check('권한 — 학생은 교사 경로 403 · 다른 사이트 Origin 403 · WebSocket 은 쿠키 없으면 401 · 남의 Origin 403', () => {
    assert.equal(forbidden.status, 403);
    assert.equal(crossSite.status, 403);
    assert.equal(wsNoCookie, 401);
    assert.equal(wsEvil, 403);
  });

  const wsA = await listen(sa);
  const wsC = await listen(sc);
  const helloA = await wsA.waitFor((m) => m.type === 'hello');
  check('WebSocket — 쿠키 세션으로 붙고 학급 채널을 받는다', () => {
    assert.equal(helloA.type, 'hello');
    if (helloA.type === 'hello') assert.deepEqual(helloA.channels, [`class:${cls.id}`]);
  });

  // 입사
  const jA = await sa.call<{ joined: boolean; team: TeamView }>('POST', API.join(team1.id));
  const jB = await sb.call<{ joined: boolean; team: TeamView }>('POST', API.join(team1.id));
  const jAagain = await sa.call<{ joined: boolean }>('POST', API.join(team1.id));
  const jCfull = await sc.call('POST', API.join(team1.id));
  const jC = await sc.call<{ joined: boolean; team: TeamView }>('POST', API.join(team2.id));
  const jD = await sd.call<{ joined: boolean; team: TeamView }>('POST', API.join(team2.id));
  const jAswitch = await sa.call('POST', API.join(team2.id));
  check('입사 — A · B → 1모둠, C · D → 2모둠 · 다시 보내도 한 번 · 정원 찬 사옥 409 · 다른 사옥으로 옮기기 409', () => {
    for (const r of [jA, jB, jC, jD]) assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(jA.body.joined, true);
    assert.equal(jAagain.status, 200);
    assert.equal(jAagain.body.joined, false);
    assert.equal(jCfull.status, 409);
    assert.equal(errCode(jCfull), 'team_full');
    assert.equal(jAswitch.status, 409);
    assert.equal(errCode(jAswitch), 'already_in_team');
    assert.equal(jD.body.team.memberCount, 2);
  });
  const joinedNote = await wsC.waitFor((m) => m.type === 'team.joined' && m.userId === signups[1]!.body.account.userId);
  check('WebSocket — 입사 소식이 학급 채널로(C 가 B 의 입사를 받음)', () => assert.equal(joinedNote.type, 'team.joined'));

  // 같은 모둠 동시 등기 — A 와 B 가 이름을 다르게 6번씩 한꺼번에
  const burst = await Promise.all(
    Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? sa : sb).call<{ team: TeamView }>('POST', API.registration(team1.id), {
      name: `세움제약${i}`,
      ticker: `SE${String.fromCharCode(65 + i)}`,
      slogan: `동시 요청 ${i}`,
    })),
  );
  const winners = burst.filter((r) => r.status === 201);
  const losers = burst.filter((r) => r.status === 409);
  const team1Now = (await teacher.call<TeacherClassDetail>('GET', API.classDetail(cls.id))).body.teams.find((t) => t.id === team1.id)!;
  check('등기 — 같은 모둠의 동시 요청 12개 중 하나만 반영 · 나머지는 already_registered 와 그 모둠 정보', () => {
    assert.equal(winners.length, 1, `201 이 ${winners.length}개: ${burst.map((r) => r.status).join(',')}`);
    assert.equal(losers.length, 11);
    for (const r of losers) {
      assert.equal(errCode(r), 'already_registered');
      assert.equal((r.body as unknown as ApiErrorBody).error.team?.startupName, winners[0]!.body.team.startupName);
    }
    assert.equal(team1Now.startupName, winners[0]!.body.team.startupName);
    assert.equal(team1Now.ticker, winners[0]!.body.team.ticker);
  });

  const nameDup = await sc.call('POST', API.registration(team2.id), { name: team1Now.startupName, ticker: 'DAON' });
  const nameDupSpacing = await sc.call('POST', API.registration(team2.id), { name: `${team1Now.startupName!.slice(0, 2)} ${team1Now.startupName!.slice(2)}`.toLowerCase(), ticker: 'DAON' });
  const tickerDup = await sc.call('POST', API.registration(team2.id), { name: '다온바이오', ticker: team1Now.ticker });
  const notMine = await sc.call('POST', API.registration(team1.id), { name: '다온바이오', ticker: 'DAON' });
  const bad = await sc.call('POST', API.registration(team2.id), { name: '다', ticker: 'DA' });
  const reg2 = await sc.call<{ team: TeamView }>('POST', API.registration(team2.id), { name: '다온바이오', ticker: 'daon', slogan: '함께 여는 내일' });
  check('2모둠 등기 — 이름 중복(띄어쓰기 달라도) · 티커 중복 409 · 남의 사옥 403 · 규칙 위반 400 · 그다음 성공', () => {
    assert.equal(nameDup.status, 409);
    assert.equal(errCode(nameDup), 'name_taken');
    assert.equal(nameDupSpacing.status, 409, JSON.stringify(nameDupSpacing.body));
    assert.equal(errCode(nameDupSpacing), 'name_taken');
    assert.equal(tickerDup.status, 409);
    assert.equal(errCode(tickerDup), 'ticker_taken');
    assert.equal(notMine.status, 403);
    assert.equal(errCode(notMine), 'not_in_team');
    assert.equal(bad.status, 400);
    assert.equal(reg2.status, 201, JSON.stringify(reg2.body));
    assert.equal(reg2.body.team.ticker, 'DAON');
    assert.equal(reg2.body.team.registeredByName, '학생C');
  });

  const regNote = await wsA.waitFor((m) => m.type === 'team.registered' && m.team.id === team2.id);
  const teacherNote = await teacherWs.waitFor((m) => m.type === 'team.registered' && m.team.id === team1.id);
  check('WebSocket — 등기 소식이 학급 채널로(A 가 2모둠 등기를, 교사가 1모둠 등기를 받음)', () => {
    assert.equal(regNote.type, 'team.registered');
    assert.equal(teacherNote.type, 'team.registered');
  });

  const meB = await sb.call<MeResponse>('GET', API.me);
  const patchB = await sb.call<{ team: TeamView }>('PATCH', API.registration(team1.id), { slogan: '고친 슬로건' });
  const patchByOther = await sd.call('PATCH', API.registration(team1.id), { slogan: '남의 것' });
  check('등기 뒤 — 같은 모둠 B 의 다음 화면은 전광판 · 첫 유료 행동 전이라 고치기 됨 · 다른 모둠은 403', () => {
    assert.equal(meB.body.next, 'board');
    assert.equal(meB.body.team?.startupName, team1Now.startupName);
    assert.equal(patchB.status, 200, JSON.stringify(patchB.body));
    assert.equal(patchB.body.team.slogan, '고친 슬로건');
    assert.equal(patchByOther.status, 403);
  });

  // assigned 학급
  const assigned = await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `W1 배정 ${suffix}`, teamCount: 3, assignment: 'assigned', maxStudents: 6 });
  const se = new Agent('학생 e');
  const seUp = await se.call<MeResponse>('POST', API.signup, { classCode: assigned.body.code, loginId: `s${suffix}e`, displayName: '학생E', password });
  const [aTeam1, aTeam2] = assigned.body.teams as [TeamView, TeamView];
  const seEarly = await se.call('POST', API.join(aTeam2.id));
  const assign = await teacher.call<TeacherClassDetail>('PUT', API.assignTeam(assigned.body.id, seUp.body.account.userId), { teamId: aTeam2.id });
  const seWrong = await se.call('POST', API.join(aTeam1.id));
  const seJoin = await se.call<{ joined: boolean }>('POST', API.join(aTeam2.id));
  const seReg = await se.call('POST', API.registration(aTeam2.id), { name: '한빛파마', ticker: 'HANB' });
  check('assigned 학급 — 배정 전 입사 403 not_assigned · 교사 배정 뒤 그 사옥만 열림 · 등기', () => {
    assert.equal(assigned.status, 201);
    assert.equal(seUp.status, 201, JSON.stringify(seUp.body));
    assert.equal(seEarly.status, 403);
    assert.equal(errCode(seEarly), 'not_assigned');
    assert.equal(assign.status, 200, JSON.stringify(assign.body));
    assert.equal(assign.body.roster[0]?.teamId, aTeam2.id);
    assert.equal(seWrong.status, 409);
    assert.equal(seJoin.status, 200);
    assert.equal(seJoin.body.joined, true);
    assert.equal(seReg.status, 201);
  });

  const codeClose = await teacher.call('POST', API.classCode(assigned.body.id), { action: 'close' });
  const closedSignup = await new Agent('닫힘').call('POST', API.signup, { classCode: assigned.body.code, loginId: `s${suffix}f`, displayName: 'f', password });
  const regen = await teacher.call<{ code: string; codeOpen: boolean }>('POST', API.classCode(assigned.body.id), { action: 'regenerate' });
  const oldCode = await new Agent('옛 코드').call('POST', API.signup, { classCode: assigned.body.code, loginId: `s${suffix}f`, displayName: 'f', password });
  check('학급 코드 — 닫으면 가입 403 class_closed · 다시 만들면 새 코드(열림) · 옛 코드는 404', () => {
    assert.equal(codeClose.status, 200);
    assert.equal(errCode(closedSignup), 'class_closed');
    assert.equal(regen.body.codeOpen, true);
    assert.notEqual(regen.body.code, assigned.body.code);
    assert.equal(errCode(oldCode), 'invalid_class_code');
  });

  // 동시성 — 학급 정원 2 에 4명이 한꺼번에 가입 · 모둠 정원 1 에 2명이 한꺼번에 입사
  const race = await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `W1 경쟁 ${suffix}`, teamCount: 2, maxStudents: 2, teamCapacity: 1 });
  const racers = ['g', 'h', 'i', 'j'].map((n) => new Agent(`경쟁 ${n}`));
  const raceSignups = await Promise.all(
    racers.map((r, i) => r.call('POST', API.signup, { classCode: race.body.code, loginId: `s${suffix}${'ghij'[i]}`, displayName: `경쟁${i}`, password })),
  );
  const seated = racers.filter((_, i) => raceSignups[i]!.status === 201);
  const raceJoins = await Promise.all(seated.map((r) => r.call('POST', API.join(race.body.teams[0]!.id))));
  const raceDetail = (await teacher.call<TeacherClassDetail>('GET', API.classDetail(race.body.id))).body;
  check('동시성 — 학급 정원 2 에 동시 가입 4 → 2명만 · 모둠 정원 1 에 동시 입사 2 → 1명만', () => {
    assert.deepEqual(raceSignups.map((r) => r.status).sort(), [201, 201, 409, 409], raceSignups.map((r) => `${r.status}:${errCode(r)}`).join(','));
    assert.ok(raceSignups.filter((r) => r.status === 409).every((r) => errCode(r) === 'class_full'));
    assert.deepEqual(raceJoins.map((r) => r.status).sort(), [200, 409]);
    assert.equal(raceDetail.studentCount, 2);
    assert.equal(raceDetail.teams[0]!.memberCount, 1);
  });

  const detail = (await teacher.call<TeacherClassDetail>('GET', API.classDetail(cls.id))).body;
  check('교사 화면 자료 — 명단 4명 · 두 모둠 2명씩 · 두 모둠 모두 등기', () => {
    assert.equal(detail.roster.length, 4);
    assert.deepEqual(detail.teams.map((t) => t.memberCount), [2, 2]);
    assert.ok(detail.teams.every((t) => t.registeredAt !== null));
    assert.equal(detail.studentCount, 4);
  });

  // 로그아웃
  const out = await sa.call('POST', API.logout);
  const closeCode = await Promise.race([wsA.closed, new Promise<number>((r) => setTimeout(() => r(-1), 3000))]);
  const meAfter = await new Agent('옛 쿠키').call('GET', API.me, undefined, { cookie: signups[0]!.cookie!.split(';')[0]! });
  check('로그아웃 — 세션 삭제 · WebSocket 닫힘(4001) · 옛 쿠키로 /api/me 401', () => {
    assert.equal(out.status, 200);
    assert.equal(closeCode, 4001);
    assert.equal(meAfter.status, 401);
  });
  for (const l of [wsC, teacherWs]) l.ws.close();

  // 게임 표 무변경
  const after = await countPublic();
  const diffs = [...new Set([...before.keys(), ...after.keys()])].filter((t) => before.get(t) !== after.get(t));
  const webUserIds = [
    teacherSecret.userId,
    ...[...signups, seUp, ...raceSignups].map((r) => (r.body as MeResponse | null)?.account?.userId),
  ].filter((id): id is string => typeof id === 'string');
  const traces = await webTraces(diffs, webUserIds);
  if (diffs.length === 0) {
    check(`게임 표 무변경 — public ${after.size}개 표의 행 수가 시작 전과 같다`, () => assert.equal(after.size, before.size));
  } else {
    console.log(`  · 행 수가 바뀐 public 표(같은 DB 의 다른 쓰기): ${diffs.map((t) => `${t} ${before.get(t)} → ${after.get(t)}`).join(' · ')}`);
    check(`게임 표 무변경 — 바뀐 표 ${diffs.length}개에 웹 계정 id(${webUserIds.length}개) · web: 접두 값 0건(crista 게임 서버의 쓰기)`, () => {
      assert.equal(after.size, before.size);
      assert.deepEqual([...traces].filter(([, n]) => n > 0), []);
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과${failed.length ? ` — 실패: ${failed.map((f) => f.label).join(' / ')}` : ''}`);
  process.exitCode = failed.length ? 1 : 0;
}

// 남은 WebSocket 이 프로세스를 붙잡지 않게 끝나면 바로 나간다.
main()
  .catch((error) => {
    console.error('[e2e:w1]', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
