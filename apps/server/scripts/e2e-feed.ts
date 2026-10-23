/**
 * 모둠 대화방 점검(시안 06) — 떠 있는 로컬 서버(HTTP · WebSocket) + 같은 DB.
 *
 *   npm run dev:server        (다른 터미널)
 *   npm run e2e:feed
 *
 * 1. 교사 → 학급(모둠 2) → 학생 3 가입 · 입사 · 등기 → 등기 소식(전광판 'listing')이 시스템 행적으로 남았나 · 접속 표시.
 * 2. 대화: 보내기 201 · 같은 clientId 는 한 줄 · @이름 → mentions · 다른 모둠원 WS 'feed.posted' · 안 읽음 · 나를 부른 글 · 읽음.
 * 3. 행적: 노트 저장 → 'note:1.1:why' 행적(이름 · 단계) · 잇달아 저장 → 같은 줄 repeat 2('feed.updated').
 * 4. 채널: 단계 채널에 쓴 말 · 행적만 · 대화만 · 단계 채널만 읽으면 '모둠 전체' 의 다른 줄은 남는다.
 * 5. 지우기(남의 것 403 · 내 것 본문 비움) · 검사(빈 말 · 501자 · clientId · 채널) · 쪽 넘기기 · 입력 중 중계 · 연결 끊김 → 접속 표시 · 보내기 상한 429.
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미).
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import {
  API,
  FEED_API,
  FEED_SEND_PER_MIN,
  type FeedPostResponse,
  type FeedReadResponse,
  type FeedResponse,
  type MeResponse,
  type ServerMessage,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
const here = dirname(fileURLToPath(import.meta.url));
const suffix = randomBytes(3).toString('hex').slice(0, 4);
let failed = 0;
async function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    failed += 1;
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
  ws: WebSocket | null = null;
  readonly inbox: ServerMessage[] = [];
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
  feed = async (view = 'all', extra = ''): Promise<FeedResponse> => {
    const r = await this.call<FeedResponse>('GET', `${FEED_API.feed(view)}${extra}`);
    if (r.status !== 200) throw new Error(`${this.name} 대화방 읽기 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
  say = (body: string, stepId: string | null = null, clientId = randomBytes(10).toString('hex')) =>
    this.call<FeedPostResponse>('POST', FEED_API.messages, { body, stepId, clientId });
  async connect(): Promise<void> {
    const url = `${BASE.replace(/^http/, 'ws')}${API.ws}`;
    const ws = new WebSocket(url, { headers: { cookie: this.cookie ?? '', origin: BASE } });
    this.ws = ws;
    ws.on('message', (data) => this.inbox.push(JSON.parse(String(data)) as ServerMessage));
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
  }
  /** 조건에 맞는 WS 메시지를 기다린다(이미 받은 것부터). */
  async wait<T extends ServerMessage>(pred: (m: ServerMessage) => m is T, ms = 4000): Promise<T> {
    const until = Date.now() + ms;
    for (;;) {
      const i = this.inbox.findIndex(pred);
      if (i >= 0) return this.inbox.splice(i, 1)[0] as T;
      if (Date.now() > until) throw new Error(`${this.name}: 기다리던 WS 메시지가 오지 않았습니다(받은 것 ${this.inbox.map((m) => m.type).join(',')}).`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

const posted = (m: ServerMessage): m is Extract<ServerMessage, { type: 'feed.posted' }> => m.type === 'feed.posted';
const updated = (m: ServerMessage): m is Extract<ServerMessage, { type: 'feed.updated' }> => m.type === 'feed.updated';
const all = (f: FeedResponse | FeedReadResponse) => f.channels.find((c) => c.id === 'all')!;

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  console.log(`서버 ${BASE} — 실행 접미 ${suffix}\n`);

  // 준비
  const teacherId = `t${suffix}f`;
  const secret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: teacherId, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `대화방 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const people = ['A', 'B', 'C'].map((n) => new Agent(`대화${n}${suffix}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `f${suffix}${'abc'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [a, b, c] = people as [Agent, Agent, Agent];
  const ticker = `F${suffix.slice(0, 3).replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}`;
  assert.equal((await a.call('POST', API.registration(team.id), { name: `대화제약${suffix}`, ticker })).status, 201);
  await b.connect();
  await c.connect();
  await new Promise((r) => setTimeout(r, 200));

  // 1. 처음
  const f0 = await a.feed();
  await check('① 등기 소식이 시스템 행적으로 · 모둠원 3 · 접속 B · C', () => {
    const listing = f0.items.find((i) => i.code === 'board:listing');
    assert.ok(listing, `행적: ${f0.items.map((i) => i.code).join(',')}`);
    assert.equal(listing.kind, 'act');
    assert.equal(listing.actorName, null);
    assert.equal(f0.members.length, 3);
    assert.deepEqual(f0.members.filter((m) => m.online).map((m) => m.userId).sort(), [b.userId, c.userId].sort());
    assert.equal(f0.me, a.userId);
  });

  // 2. 대화 · 부르기 · 안 읽음
  const cid = randomBytes(10).toString('hex');
  const m1 = await a.say(`@${b.name} 1.1 표적 같이 보자`, null, cid);
  const again = await a.say(`@${b.name} 1.1 표적 같이 보자`, null, cid);
  const seen = await b.wait(posted);
  await check('② 보내기 201 · 같은 clientId 는 같은 줄 200 · @이름 → mentions · B 에게 WS 로 줄 그대로', () => {
    assert.equal(m1.status, 201, JSON.stringify(m1.body));
    assert.equal(again.status, 200);
    assert.equal(again.body.item.id, m1.body.item.id);
    assert.deepEqual(m1.body.item.mentions, [b.userId]);
    assert.equal(seen.item.id, m1.body.item.id);
    assert.equal(seen.item.body, m1.body.item.body);
    assert.equal(seen.item.actorId, a.userId);
  });
  const fb = await b.feed();
  const mention = await b.feed('mention');
  await check('② B: 안 읽음(행적 포함) · 나를 부른 글 1 · 보기 mention 1줄 · A 자기 줄은 안 읽음에 안 셈', async () => {
    assert.equal(all(fb).unread, fb.items.length);
    assert.equal(fb.mentionUnread, 1);
    assert.deepEqual(mention.items.map((i) => i.id), [m1.body.item.id]);
    const fa = await a.feed();
    assert.equal(all(fa).unread, fa.items.filter((i) => i.actorId !== a.userId).length);
  });
  const readB = await b.call<FeedReadResponse>('PUT', FEED_API.read, { channel: 'all', seq: fb.lastSeq });
  const backwards = await b.call<FeedReadResponse>('PUT', FEED_API.read, { channel: 'all', seq: 1 });
  await check("② B 가 '모둠 전체' 를 읽음 → 안 읽음 0 · 나를 부른 글 0 · 뒤로 가는 읽음은 무시", () => {
    assert.equal(readB.status, 200, JSON.stringify(readB.body));
    assert.equal(all(readB.body).unread, 0);
    assert.equal(readB.body.mentionUnread, 0);
    assert.equal(backwards.body.reads.all, fb.lastSeq);
  });

  // 3. 행적 — 노트 저장 → 행적 · 잇달아 → repeat
  const n1 = await a.call<{ version: number }>('PUT', API.note('1.1', 'why'), { body: '유전 근거가 가장 강한 표적', expectedVersion: 0 });
  const act1 = await b.wait((m): m is Extract<ServerMessage, { type: 'feed.posted' }> => m.type === 'feed.posted' && m.item.kind === 'act' && m.item.code === 'note:1.1:why');
  const n2 = await a.call<{ version: number }>('PUT', API.note('1.1', 'why'), { body: '유전 근거가 가장 강한 표적 — 결정구조도 있음', expectedVersion: n1.body.version });
  const act2 = await b.wait((m): m is Extract<ServerMessage, { type: 'feed.updated' }> => m.type === 'feed.updated' && m.item.code === 'note:1.1:why');
  await check('③ 노트 저장 → 행적(A · 1.1 · ① 칸) · 잇달아 저장 → 같은 줄 repeat 2', () => {
    assert.equal(n1.status, 200, JSON.stringify(n1.body));
    assert.equal(n2.status, 200, JSON.stringify(n2.body));
    assert.equal(act1.item.actorId, a.userId);
    assert.equal(act1.item.actorName, a.name);
    assert.equal(act1.item.stepId, '1.1');
    assert.equal(act1.item.body, '연구 노트 ① 칸을 고쳤어요');
    assert.equal(act2.item.id, act1.item.id);
    assert.equal(act2.item.repeat, 2);
  });

  // 4. 채널 · 보기
  const inStep = await b.say('결정구조 4EY7 확인했어', '1.1');
  const v11 = await c.feed('1.1');
  const vAct = await c.feed('act');
  const vChat = await c.feed('chat');
  await check('④ 단계 채널 = 그 단계 행적 + 거기 쓴 말 · 행적만 · 대화만', () => {
    assert.equal(inStep.status, 201);
    assert.deepEqual(v11.items.map((i) => i.kind).sort(), ['act', 'chat']);
    assert.ok(vAct.items.every((i) => i.kind === 'act') && vAct.items.length >= 2);
    assert.ok(vChat.items.every((i) => i.kind === 'chat') && vChat.items.length === 2);
    assert.ok(v11.channels.some((ch) => ch.id === '1.1' && ch.total === 2));
  });
  const readC = await c.call<FeedReadResponse>('PUT', FEED_API.read, { channel: '1.1', seq: v11.lastSeq });
  await check("④ C 가 1.1 채널만 읽음 → 1.1 은 0, '모둠 전체' 에는 1.1 밖의 줄이 남는다", () => {
    assert.equal(readC.body.channels.find((ch) => ch.id === '1.1')?.unread, 0);
    const rest = v11.channels.find((ch) => ch.id === 'all')!.total - 2;
    assert.equal(all(readC.body).unread, rest);
    assert.ok(rest >= 2);
  });

  // 5. 지우기 · 검사 · 쪽 · 입력 중 · 접속 · 상한
  const notMine = await c.call('DELETE', FEED_API.message(m1.body.item.id));
  const del = await a.call<FeedPostResponse>('DELETE', FEED_API.message(m1.body.item.id));
  const delSeen = await b.wait(updated);
  await check('⑤ 남의 메시지 지우기 403 · 내 것 지우기 → 본문 비움 · deleted · WS feed.updated', () => {
    assert.equal(notMine.status, 403);
    assert.equal(del.status, 200);
    assert.equal(del.body.item.deleted, true);
    assert.equal(del.body.item.body, '');
    assert.equal(delSeen.item.id, m1.body.item.id);
  });
  const bads = await Promise.all([
    a.say('   '),
    a.say('가'.repeat(501)),
    a.call('POST', FEED_API.messages, { body: '키 없음', stepId: null, clientId: 'x' }),
    a.say('보기는 채널이 아님', 'act'),
    a.call('GET', FEED_API.feed('../etc' as 'all')),
  ]);
  await check('⑤ 빈 말 · 501자 · clientId · 보기에 쓰기 · 없는 보기 → 400', () => {
    assert.deepEqual(bads.map((r) => r.status), [400, 400, 400, 400, 400]);
  });
  const page = await c.feed('all', '&limit=2');
  const older = await c.feed('all', `&limit=2&before=${page.items[0]!.seq}`);
  await check('⑤ 쪽 넘기기 — limit 2 · hasMore · before 로 그 앞 2줄(겹침 없음)', () => {
    assert.equal(page.items.length, 2);
    assert.equal(page.hasMore, true);
    assert.ok(older.items.length >= 1);
    assert.ok(older.items.every((i) => i.seq < page.items[0]!.seq));
  });
  await a.connect();
  b.inbox.length = 0;
  a.ws!.send(JSON.stringify({ type: 'feed.typing', stepId: '1.1' }));
  const typing = await b.wait((m): m is Extract<ServerMessage, { type: 'feed.typing' }> => m.type === 'feed.typing');
  await new Promise((r) => setTimeout(r, 300));
  await check('⑤ 입력 중 — 같은 모둠에 중계(본인 연결 제외)', () => {
    assert.equal(typing.userId, a.userId);
    assert.equal(typing.stepId, '1.1');
    assert.equal(a.inbox.some((m) => m.type === 'feed.typing'), false);
  });
  b.inbox.length = 0;
  c.ws!.close();
  const pres = await b.wait((m): m is Extract<ServerMessage, { type: 'feed.presence' }> => m.type === 'feed.presence' && !m.online.includes(c.userId));
  await check('⑤ C 연결이 끊기면 접속 표시에서 빠진다', () => {
    assert.deepEqual(pres.online.sort(), [a.userId, b.userId].sort());
  });
  const statuses: number[] = [];
  for (let i = 0; i < FEED_SEND_PER_MIN + 2; i += 1) {
    const r = await c.say(`상한 점검 ${i}`);
    statuses.push(r.status);
    if (r.status === 429) break;
  }
  await check(`⑤ 보내기 상한 — 1분에 ${FEED_SEND_PER_MIN}개 넘으면 429`, () => {
    assert.equal(statuses.at(-1), 429);
    assert.ok(statuses.filter((s) => s === 201).length <= FEED_SEND_PER_MIN);
  });

  a.ws?.close();
  b.ws?.close();
  console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
