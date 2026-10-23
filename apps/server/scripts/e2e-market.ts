/**
 * FMARKET — 전광판 · 기업가치 · 과정 평가 · 최종 순위 4인 동시 조작 점검(설계 §5.3 · §7.4 · 2026-10-24 사용자 지시).
 * 떠 있는 로컬 서버에 실제 HTTP 로 보내고, 서버 안 함수(postProcessScore · postBoardEvent · 도킹 신기록)는 같은 DB 에 이 프로세스에서 직접 부른다
 * (처리기 'market' 을 이 프로세스에도 단다 — 서버와 같은 코드 · 같은 잠금).
 *
 *   LLM_DISABLED=1 WEB_PORT=3409 node tools/with-local-env.mjs node apps/server/src/index.ts
 *   WEB_PORT=3409 npm run e2e:market
 *
 * 1. 등기 4인 동시 → 등기 1번 · 'listing' 소식 1줄 · 상장가 $10.00 기업가치 줄 1개.
 * 2. 교사 정정 4건 동시(한 모둠) → 기업가치 줄 4개 · 주가 = 10 × Π(1 + p) (잃어버린 갱신 없음) · 1위가 바뀐 만큼만 'rank' 소식.
 * 3. 과정 평가 — 같은 (모둠, 단계) 4번 동시 → 1줄 · 소식 1줄 · 공개 칸에 점수 없음. 서로 다른 단계 4개 동시 → 4줄 · 주가 곱.
 *    주기 점검(서버 15초)이 1.1 완료(표적 확정)를 보고 과정 평가를 낸다.
 * 4. 도킹 신기록 — 같은 값 4건 동시 → 신기록 1번. 항체 트랙 소식(antibody_*) — public.changeHint 상한(없음 · 0 → 0 · antibody_record 0~10 · 나머지 0~5 · bad −5~0) · 잘못된 종류 DB 거절.
 * 5. 헤드라인 — LLM 꺼짐 → 규칙 문구(aiHeadline false). 가짜 LLM: 사실 그대로 → headline_ai · 지어낸 숫자 → 그대로 규칙 문구.
 * 6. 마감 — 교사 [지금 마감] 4번 동시 → 1번 200 · 3번 409 · 순위표 = 모둠 수. 마감과 정정 4건 동시 → 정정은 마감 전(움직임) 아니면 뒤(change_pct null) ·
 *    얼린 주가 = 지금 주가. 마감 뒤 소식은 흐르지만 순위 · 주가 그대로. 학생 최종 순위(과정 내역은 자기 모둠만) · 다시 열기 · 예약 마감(schedule).
 * 7. 공개 서랍 — 다른 모둠 공개 정보만(SMILES · 노트 · 점수 칸 없음). 교사는 ?classId= 로 같은 서랍. public 표 행 수 그대로.
 * 8. (적대적 검토 · 수리) 진행 소식(4.1 모집 완료 · 임상 시작 'notice' + public.event) → crista 'upgrade' 0~3% · 교사 모둠 공지는 그대로 ·
 *    기업가치 쓰기가 실패해도(market_state 행 잠금 시간 초과) 기능의 본 일 · 소식은 커밋(그 소식만 change_pct null) ·
 *    잘못된 stepId 과정 평가는 호출자 트랜잭션을 깨지 않음 · 꼴이 틀린 teamId 정정 404(500 아님) ·
 *    학생 최종 순위에 다른 모둠 단계별 과정 점수 없음.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  MARKET_API,
  type ApiErrorBody,
  type BoardResponse,
  type MarketBoardResponse,
  type MarketDrawerResponse,
  type MarketFinalResponse,
  type MeResponse,
  type TeacherClassDetail,
} from '@crista-web/web-contract';
import { postBoardEvent } from '../src/board-events.ts';
import type { Deps } from '../src/context.ts';
import { withTx } from '../src/db.ts';
import { moveFor, onDockingSucceeded, postProcessScore, register } from '../src/features/market.ts';
import { Router } from '../src/http.ts';
import type { RequestContext } from '../src/routes.ts';

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
    if (setCookie) this.cookie = setCookie.split(';')[0]!;
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  }
  async get<T>(path: string): Promise<T> {
    // 읽기만 — 다른 기능 서버들과 함께 쓰는 로컬 DB 의 연결 상한에 서버가 잠깐 닿으면 500 이 날 수 있어 몇 번 다시 읽는다.
    let r = await this.call<T>('GET', path);
    for (let i = 0; r.status === 500 && i < 10; i += 1) {
      await sleep(700);
      r = await this.call<T>('GET', path);
    }
    if (r.status !== 200) throw new Error(`${this.name} ${path} ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  }
}

const err = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error;
const statuses = (replies: Reply[]) => replies.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createTeacher(loginId: string): { userId: string; password: string } {
  // 같은 로컬 DB 를 여러 기능 서버가 함께 써서 crista_web 연결 상한(30)에 잠깐 닿을 수 있다 — 몇 번 다시 해 본다.
  for (let i = 0; ; i += 1) {
    const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `전광판 점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
    if (run.status === 0) return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
    if (i >= 5 || !/too many connections/.test(run.stderr)) throw new Error(`teacher:create 실패: ${run.stderr}`);
    spawnSync('sleep', ['3']);
  }
}

// 같은 로컬 DB 를 여러 기능 서버 · 시험이 함께 써서 crista_web 연결 상한(30)에 잠깐 닿을 수 있다 — 연결 거절(53300)만 다시 해 본다.
const raw = new pg.Pool({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-market', max: 5, idleTimeoutMillis: 1000 });
async function retry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i += 1) {
    try {
      return await fn();
    } catch (error) {
      if ((error as { code?: string }).code !== '53300' || i >= 30) throw error;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
const pool = Object.assign(Object.create(raw) as pg.Pool, {
  query: ((...args: Parameters<pg.Pool['query']>) => retry(() => (raw.query as (...a: unknown[]) => Promise<unknown>)(...args))) as unknown as pg.Pool['query'],
  connect: (() => retry(() => raw.connect())) as unknown as pg.Pool['connect'],
});
const q = async <T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> => (await pool.query<T>(sql, params)).rows;

async function countPublic(): Promise<number> {
  const url = process.env.CRISTA_DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('로컬 관리자 연결(CRISTA_DATABASE_URL)이 필요합니다.');
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await c.query('begin read only');
    const tables = await c.query<{ t: string }>(`select tablename as t from pg_tables where schemaname = 'public'`);
    let n = 0;
    for (const { t } of tables.rows) n += Number((await c.query<{ n: string }>(`select count(*)::text as n from public.${c.escapeIdentifier(t)}`)).rows[0]!.n);
    await c.query('rollback');
    return n;
  } finally {
    await c.end();
  }
}

// 이 프로세스의 처리기용 deps — 방송은 버리고(서버가 아님), LLM 은 시험마다 바꿔 끼운다.
type FakeLlm = { available: boolean; call: (req: unknown) => Promise<unknown> };
const llmOff: FakeLlm = { available: false, call: async () => ({ kind: 'unavailable', reason: 'disabled' }) };
const deps = {
  db: pool,
  hub: { broadcastClass() {}, broadcastTeam() {}, broadcastTeachers() {}, publish() {} },
  llm: llmOff as FakeLlm,
} as unknown as Deps;
const setLlm = (llm: FakeLlm): void => {
  (deps as unknown as { llm: FakeLlm }).llm = llm;
};

const price = async (teamId: string): Promise<number> => Number((await q<{ p: number }>('select coalesce((select price_usd::float8 from web.market_state where team_id = $1), 10) as p', [teamId]))[0]!.p);
const product = (base: number, pcts: number[]) => pcts.reduce((p, x) => Math.max(0.1, Math.round(p * (1 + x / 100) * 10_000) / 10_000), base);

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  register(new Router<RequestContext>());
  const publicBefore = await countPublic();
  console.log(`실행 접미 ${suffix} · public 행 ${publicBefore}\n`);

  // 준비 — 교사 · 학급(모둠 3 · 정원 4) · A 4명 · B 2명 · C 1명
  const tLogin = `t${suffix}fmk`;
  const secret = createTeacher(tLogin);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: tLogin, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `전광판 점검 ${suffix}`, teamCount: 3, assignment: 'walk-in', maxStudents: 12, teamCapacity: 4 })).body;
  const [teamA, teamB, teamC] = cls.teams as [TeacherClassDetail['teams'][number], TeacherClassDetail['teams'][number], TeacherClassDetail['teams'][number]];
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const A = ['a', 'b', 'c', 'd'].map((n) => new Agent(`A학생${n.toUpperCase()}`));
  const B = ['e', 'f'].map((n) => new Agent(`B학생${n.toUpperCase()}`));
  const C = [new Agent('C학생G')];
  for (const [i, s] of [...A, ...B, ...C].entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `m${suffix}${'abcdefg'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(i < 4 ? teamA.id : i < 6 ? teamB.id : teamC.id))).status, 200);
  }
  const letters = suffix.replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!).toUpperCase();
  const tick = { A: `K${letters.slice(0, 3)}`, B: `L${letters.slice(0, 3)}`, C: `N${letters.slice(0, 3)}` };

  // 1. 등기 4인 동시
  const regRace = await Promise.all(A.map((s, i) => s.call('POST', API.registration(teamA.id), { name: `시장가${suffix}${i}`, ticker: tick.A })));
  assert.equal((await B[0]!.call('POST', API.registration(teamB.id), { name: `시장나${suffix}`, ticker: tick.B })).status, 201);
  assert.equal((await C[0]!.call('POST', API.registration(teamC.id), { name: `시장다${suffix}`, ticker: tick.C })).status, 201);
  const listings = await q<{ team_id: string; n: number; v: number }>(
    `select e.team_id, count(*)::int as n, (select count(*)::int from web.valuations v where v.team_id = e.team_id and v.kind = 'listing') as v
       from web.board_events e where e.class_id = $1 and e.kind = 'listing' group by e.team_id`,
    [cls.id],
  );
  check('1. 등기 4인 동시 → 1건 201 · 3건 409 · 모둠마다 listing 소식 1줄 · 상장가 기업가치 줄 1개', () => {
    assert.equal(regRace.filter((r) => r.status === 201).length, 1, statuses(regRace));
    assert.equal(regRace.filter((r) => r.status === 409).length, 3, statuses(regRace));
    assert.equal(listings.length, 3);
    for (const l of listings) {
      assert.equal(l.n, 1);
      assert.equal(l.v, 1);
    }
  });

  const boardA = await A[1]!.get<MarketBoardResponse>(MARKET_API.board());
  check('1. GET /api/market/board — 모둠 3 · 모두 상장가 · 소식은 새것 먼저 · 내 모둠 표시', () => {
    assert.equal(boardA.ranking.length, 3);
    assert.ok(boardA.ranking.every((r) => r.priceUsd === 10));
    assert.equal(boardA.myTeamId, teamA.id);
    assert.equal(boardA.final, null);
    assert.ok(boardA.events.length >= 3);
    assert.ok(boardA.events[0]!.classSeq > boardA.events[boardA.events.length - 1]!.classSeq);
    assert.ok(boardA.events.every((e) => e.kind === 'listing' && e.changePct === 0 && !e.aiHeadline));
  });

  // 2. 교사 정정 4건 동시(모둠 B) — 잃어버린 갱신 없음 · 1위 소식
  const pcts = [3, -1.5, 4.2, 2];
  const corr = await Promise.all(pcts.map((p, i) => teacher.call('POST', MARKET_API.notice(cls.id), { headline: `정정 ${i + 1}: ${tick.B} 판정 재계산`, teamId: teamB.id, changePct: p })));
  const pB = await price(teamB.id);
  const valsB = await q<{ n: number }>(`select count(*)::int as n from web.valuations where team_id = $1 and kind = 'correction'`, [teamB.id]);
  const ranks1 = await q<{ n: number; team_id: string }>(`select count(*)::int as n, min(team_id::text) as team_id from web.board_events where class_id = $1 and kind = 'rank'`, [cls.id]);
  check('2. 교사 정정 4건 동시 → 201 ×4 · 기업가치 줄 4개 · 주가 = 10 × Π(1+p)(순서와 상관없이) · 1위가 바뀐 1번만 rank 소식', () => {
    assert.equal(corr.filter((r) => r.status === 201).length, 4, statuses(corr));
    assert.equal(valsB[0]!.n, 4);
    assert.ok(Math.abs(pB - product(10, pcts)) < 0.002, `${pB} vs ${product(10, pcts)}`);
    assert.equal(ranks1[0]!.n, 1);
    assert.equal(ranks1[0]!.team_id, teamB.id);
  });
  const notice = await teacher.call('POST', MARKET_API.notice(cls.id), { headline: '오늘 수업은 3.2 까지' });
  const badPct = await teacher.call('POST', MARKET_API.notice(cls.id), { headline: '정정', teamId: teamB.id, changePct: 40 });
  const studentNotice = await A[0]!.call('POST', MARKET_API.notice(cls.id), { headline: '학생이 쓴 공지' });
  check('2. 공지(모둠 없음)는 기업가치를 안 움직임 · 정정 폭 ±20 밖 400 · 학생은 공지 못 냄(403)', () => {
    assert.equal(notice.status, 201);
    assert.equal(badPct.status, 400);
    assert.equal(studentNotice.status, 403);
  });

  // 3. 과정 평가
  const revA = (await A[0]!.get<BoardResponse>(API.board)).program.revisionId;
  const comps = [
    { key: 'quorum', value: 1, weight: 2, fact: '기준 투표 4/4명', public: true },
    { key: 'enrichment', value: 0.5, weight: 2, fact: '농축도 2.00', public: false },
  ];
  const beforeProc = await price(teamA.id);
  const procRace = await Promise.all(
    [0, 1, 2, 3].map(() =>
      withTx(pool, async (tx) => {
        await tx.query('select 1 from web.teams where id = $1 for no key update', [teamA.id]);
        return postProcessScore(tx, deps, { classId: cls.id, teamId: teamA.id, stepId: '1.2', components: comps, revisionId: revA });
      }),
    ),
  );
  for (const r of procRace) r.after();
  const procRows = await q<{ score: number; change_pct: number; source: string }>(`select score, change_pct, source from web.process_scores where team_id = $1 and step_id = '1.2'`, [teamA.id]);
  const procEvents = await q<{ public: Record<string, unknown>; headline: string; change_pct: number }>(`select public, headline, change_pct from web.board_events where team_id = $1 and kind = 'process'`, [teamA.id]);
  check('3. 같은 (모둠, 단계) 과정 평가 4번 동시 → 1줄 · 소식 1줄 · 점수 75 → +1.9% · 공개 칸은 공개 사실만(점수 · 농축도 없음)', () => {
    assert.equal(procRace.filter((r) => r.created).length, 1);
    assert.equal(procRows.length, 1);
    assert.equal(procRows[0]!.score, 75);
    assert.equal(procRows[0]!.source, 'feature');
    assert.equal(procEvents.length, 1);
    assert.equal(procEvents[0]!.change_pct, 1.9);
    assert.deepEqual(Object.keys(procEvents[0]!.public).sort(), ['facts', 'step', 'ticker']);
    assert.ok(!JSON.stringify(procEvents[0]).includes('농축도'));
    assert.ok(!JSON.stringify(procEvents[0]).includes('75'));
    assert.ok(procEvents[0]!.headline.includes('기준 투표 4/4명'));
  });
  const multi = await Promise.all(
    (['2.1', '2.2', '3.1', '3.2'] as const).map((stepId, i) =>
      withTx(pool, async (tx) => {
        await tx.query('select 1 from web.teams where id = $1 for no key update', [teamA.id]);
        return postProcessScore(tx, deps, { classId: cls.id, teamId: teamA.id, stepId, components: [{ key: 'x', value: [1, 0.3, 0.65, 0][i]!, weight: 1, fact: '', public: false }] });
      }),
    ),
  );
  for (const r of multi) r.after();
  const afterProc = await price(teamA.id);
  check('3. 서로 다른 단계 4개 동시 → 4줄 · 주가 = 앞 주가 × Π(1+p) · 30 미만 · 30 은 0%(중립, 감점 없음)', () => {
    assert.equal(multi.filter((r) => r.created).length, 4);
    assert.deepEqual(multi.map((r) => r.changePct), [3, 0, 1.5, 0]);
    assert.ok(Math.abs(afterProc - product(product(beforeProc, [1.9]), [3, 0, 1.5, 0])) < 0.002, `${afterProc}`);
  });

  // 주기 점검 — C 모둠이 1.1(표적 확정)을 끝내면 서버가 15초 안에 과정 평가를 낸다.
  const boardC = await C[0]!.get<BoardResponse>(API.board);
  const disease = boardC.diseases[0]!;
  await C[0]!.call('POST', API.picks, { diseaseId: disease.diseaseId, note: '시험' });
  assert.equal((await C[0]!.call('POST', API.target, { diseaseId: disease.diseaseId })).status, 200);
  let sweep: Array<{ score: number; components: Array<{ key: string; public: boolean }>; source: string }> = [];
  for (let i = 0; i < 25 && !sweep.length; i += 1) {
    await sleep(1000);
    sweep = await q(`select score, components, source from web.process_scores where team_id = $1 and step_id = '1.1'`, [teamC.id]);
  }
  check('3. 주기 점검 — C 모둠 1.1 표적 확정 → 서버가 과정 평가(source market · 표적 추천 1/1명 · 공통 신호)', () => {
    assert.equal(sweep.length, 1, '25초 안에 과정 평가가 없음');
    assert.equal(sweep[0]!.source, 'market');
    const keys = sweep[0]!.components.map((c) => c.key);
    assert.ok(keys.includes('picks'));
    assert.ok(keys.includes('notes'));
  });

  // 4. 도킹 신기록 · 항체 소식
  const targetId = disease.targetId;
  await Promise.all([0, 1, 2, 3].map((i) => onDockingSucceeded(deps, { id: `00000000-0000-4000-8000-00000000000${i}`, step: '2.1', teamId: teamC.id, classId: cls.id, targetId, affinityKcal: -9.5 })));
  await onDockingSucceeded(deps, { id: '00000000-0000-4000-8000-000000000010', step: '2.1', teamId: teamB.id, classId: cls.id, targetId, affinityKcal: -9.4 });
  await onDockingSucceeded(deps, { id: '00000000-0000-4000-8000-000000000011', step: '2.1', teamId: teamB.id, classId: cls.id, targetId, affinityKcal: -6.5 });
  await onDockingSucceeded(deps, { id: '00000000-0000-4000-8000-000000000012', step: '2.1', teamId: teamB.id, classId: cls.id, targetId, affinityKcal: -10.26 });
  const records = await q<{ team_id: string; public: { affinityKcal: number }; change_pct: number; headline: string }>(
    `select team_id, public, change_pct, headline from web.board_events where class_id = $1 and kind = 'docking_record' order by class_seq`,
    [cls.id],
  );
  check('4. 도킹 신기록 — 같은 −9.5 4건 동시 → 1번 · 더 약한 −9.4 · −6.5(기준 −7 미달) 없음 · −10.3 → 2번째 · 변동 0~12%', () => {
    assert.equal(records.length, 2, JSON.stringify(records.map((r) => r.public)));
    assert.equal(records[0]!.team_id, teamC.id);
    assert.equal(records[1]!.team_id, teamB.id);
    assert.equal(records[1]!.public.affinityKcal, -10.3);
    assert.ok(records.every((r) => r.change_pct >= 0 && r.change_pct <= 12));
    assert.ok(records[1]!.headline.includes('−10.3 kcal/mol'));
  });
  // 항체 랩과의 계약(2026-10-24): public.changeHint(0~10 정수)가 폭의 상한 · 없거나 0 이면 0 · antibody_record 만 0~10 · tone bad 는 −5~0.
  const abCases: Array<{ key: string; kind: string; pub: Record<string, number>; tone: 'normal' | 'bad'; lo: number; hi: number }> = [
    { key: 'nohint', kind: 'antibody_binding_record', pub: {}, tone: 'normal', lo: 0, hi: 0 },
    { key: 'zero', kind: 'antibody_program', pub: { changeHint: 0 }, tone: 'normal', lo: 0, hi: 0 },
    { key: 'fold8', kind: 'antibody_fold', pub: { changeHint: 8 }, tone: 'normal', lo: 0, hi: 5 },
    { key: 'rec10', kind: 'antibody_record', pub: { changeHint: 10 }, tone: 'normal', lo: 0, hi: 10 },
    { key: 'rec3', kind: 'antibody_record', pub: { changeHint: 3 }, tone: 'normal', lo: 0, hi: 3 },
    { key: 'bad4', kind: 'antibody_complex_fail', pub: { changeHint: 4 }, tone: 'bad', lo: -4, hi: 0 },
  ];
  const abPrice0 = await price(teamC.id);
  const abPosted = [];
  for (const c of abCases) {
    const posted = await withTx(pool, (tx) =>
      postBoardEvent(tx, deps, { classId: cls.id, teamId: teamC.id, kind: c.kind as never, tone: c.tone, headline: `◆ ${tick.C} 항체 소식 ${c.key}`, public: { ticker: tick.C, stage: 'antibody_A6', ...c.pub }, idemKey: `ab:${suffix}:${c.key}` }),
    );
    posted.after();
    abPosted.push({ ...c, id: posted.event.id });
  }
  const abBad = await withTx(pool, (tx) => postBoardEvent(tx, deps, { classId: cls.id, teamId: teamC.id, kind: 'antibodyX' as never, headline: '◆ 잘못된 종류' })).catch((e: Error) => e);
  const abRows = await q<{ id: number; change_pct: number }>(`select id, change_pct from web.board_events where id = any($1::bigint[])`, [abPosted.map((c) => c.id)]);
  const abPrice1 = await price(teamC.id);
  const abPcts = abPosted.map((c) => ({ ...c, pct: abRows.find((r) => Number(r.id) === c.id)!.change_pct }));
  const abExpected = abPosted.map((c) => moveFor({ id: c.id, classId: cls.id, kind: c.kind as never, tone: c.tone, idemKey: `ab:${suffix}:${c.key}`, public: { stage: 'antibody_A6', ...c.pub } })!.pct);
  check('4. 항체 트랙 소식(antibody_*) — changeHint 상한(없음 · 0 → 0, fold 8 → 0~5, record 10 → 0~10, record 3 → 0~3, bad 4 → −4~0) · 서버 계산과 같은 값 · 주가 곱 · 접두가 아닌 종류는 DB 가 거절', () => {
    for (const c of abPcts) assert.ok(c.pct >= c.lo && c.pct <= c.hi, `${c.key} ${c.pct}`);
    assert.deepEqual(abPcts.map((c) => c.pct), abExpected);
    assert.equal(abPrice1, product(abPrice0, abPcts.map((c) => c.pct)));
    assert.ok(abBad instanceof Error && /board_events_kind_check/.test(abBad.message), String(abBad));
  });

  // 8. 진행 소식 · 실패 격리
  const progRace = await Promise.all(
    ['trial_recruited', 'trial_started', 'trial_started', 'trial_started'].map((event) =>
      withTx(pool, (tx) =>
        postBoardEvent(tx, deps, {
          classId: cls.id,
          teamId: teamB.id,
          kind: 'notice',
          headline: `◆ ${tick.B} 임상 1상 ${event === 'trial_started' ? '시작' : '모집 완료'}`,
          public: { event, phase: 'phase1' },
          idemKey: `trial:${suffix}:${event}`,
        }),
      ),
    ),
  );
  for (const r of progRace) r.after();
  const prog = await q<{ public: { event: string }; change_pct: number | null; v: number }>(
    `select e.public, e.change_pct, (select count(*)::int from web.valuations v where v.event_id = e.id) as v
       from web.board_events e where e.class_id = $1 and e.kind = 'notice' and e.idem_key like 'trial:%' order by e.class_seq`,
    [cls.id],
  );
  const tNotice = await teacher.call<{ event: { id: number; changePct: number | null } }>('POST', MARKET_API.notice(cls.id), { headline: `${tick.B} 견학 공지`, teamId: teamB.id });
  const badTeam = await teacher.call('POST', MARKET_API.notice(cls.id), { headline: '정정', teamId: '------------------------------------', changePct: 2 });
  check('8. 진행 소식(모집 완료 · 임상 시작) → crista upgrade 0~3% · 같은 키 4번 동시 → 2줄 · 교사 모둠 공지는 움직이지 않음 · 꼴이 틀린 teamId 404', () => {
    assert.equal(prog.length, 2, JSON.stringify(prog));
    for (const e of prog) {
      assert.ok(e.change_pct !== null && e.change_pct >= 0 && e.change_pct <= 3, JSON.stringify(e));
      assert.equal(e.v, 1);
    }
    assert.equal(tNotice.status, 201);
    assert.equal(tNotice.body.event.changePct, null);
    assert.equal(badTeam.status, 404, JSON.stringify(badTeam.body));
  });

  // 기업가치 쓰기 실패 격리 — 다른 연결이 B 의 market_state 행을 잡고 있고, 소식 트랜잭션은 lock_timeout 300ms.
  const holder = await raw.connect();
  let isolated: { event: { id: number }; created: boolean } | null = null;
  let isolatedError: Error | null = null;
  try {
    await holder.query('begin');
    await holder.query('select 1 from web.market_state where team_id = $1 for update', [teamB.id]);
    isolated = await withTx(pool, async (tx) => {
      await tx.query(`set local lock_timeout = '300ms'`);
      await tx.query('select 1 from web.teams where id = $1 for no key update', [teamB.id]);
      const r = await postBoardEvent(tx, deps, { classId: cls.id, teamId: teamB.id, kind: 'patent', headline: `◆ ${tick.B} 물질특허 등록 — 격리 시험`, idemKey: `patent:${suffix}:iso` });
      // 같은 트랜잭션에서 이어지는 일 — 잘못된 stepId 과정 평가는 세이브포인트로 그 자리만 버리고 트랜잭션은 산다.
      const badStep = await postProcessScore(tx, deps, { classId: cls.id, teamId: teamB.id, stepId: '9.9' as never, components: [{ key: 'x', value: 1, weight: 1, fact: '', public: false }] });
      assert.equal(badStep.created, false);
      return r;
    });
  } catch (error) {
    isolatedError = error as Error;
  } finally {
    await holder.query('rollback').catch(() => undefined);
    holder.release();
  }
  const isoRow = isolated ? await q<{ change_pct: number | null; v: number }>(`select change_pct, (select count(*)::int from web.valuations v where v.event_id = e.id) as v from web.board_events e where id = $1`, [isolated.event.id]) : [];
  const isoProc = await q<{ n: number }>(`select count(*)::int as n from web.process_scores where team_id = $1 and step_id = '9.9'`, [teamB.id]);
  check('8. 기업가치 쓰기가 실패해도(행 잠금 시간 초과) 소식 · 본 일은 커밋 · 그 소식만 change_pct null · 잘못된 stepId 과정 평가는 건너뜀', () => {
    assert.equal(isolatedError, null, String(isolatedError));
    assert.ok(isolated?.created);
    assert.equal(isoRow[0]!.change_pct, null);
    assert.equal(isoRow[0]!.v, 0);
    assert.equal(isoProc[0]!.n, 0);
  });

  // 5. 헤드라인 — 가짜 LLM(사실 그대로 · 지어낸 숫자)
  setLlm({ available: true, call: async () => ({ kind: 'ok', output: { headline: `◆ ${tick.A} 물질특허 ${tick.A}-102 확보 — 알츠하이머 후보` }, model: 'fake', usage: {}, latencyMs: 1, fallbackUsed: false }) });
  const good = await withTx(pool, (tx) =>
    postBoardEvent(tx, deps, { classId: cls.id, teamId: teamA.id, kind: 'patent', headline: `◆ ${tick.A} 물질특허 등록 — ${tick.A}-102 · 알츠하이머병 후보`, public: { codeName: `${tick.A}-102` }, idemKey: `patent:${suffix}:1` }),
  );
  good.after();
  await sleep(700);
  setLlm({ available: true, call: async () => ({ kind: 'ok', output: { headline: `◆ ${tick.A} 특허로 주가 35% 폭등` }, model: 'fake', usage: {}, latencyMs: 1, fallbackUsed: false }) });
  const bad = await withTx(pool, (tx) =>
    postBoardEvent(tx, deps, { classId: cls.id, teamId: teamA.id, kind: 'patent', headline: `◆ ${tick.A} 물질특허 등록 — ${tick.A}-103 · 알츠하이머병 후보`, public: { codeName: `${tick.A}-103` }, idemKey: `patent:${suffix}:2` }),
  );
  bad.after();
  await sleep(700);
  setLlm(llmOff);
  const heads = await A[2]!.get<MarketBoardResponse>(MARKET_API.board());
  const hGood = heads.events.find((e) => e.id === good.event.id)!;
  const hBad = heads.events.find((e) => e.id === bad.event.id)!;
  check('5. 헤드라인 — 사실 그대로 다듬은 줄은 headline_ai(AI 생성 표시) · 지어낸 숫자는 버리고 규칙 문구 · 특허 변동 0~5%', () => {
    assert.equal(hGood.aiHeadline, true);
    assert.ok(hGood.headline.includes('확보'));
    assert.equal(hBad.aiHeadline, false);
    assert.ok(hBad.headline.includes('물질특허 등록'));
    assert.ok(hGood.changePct! >= 0 && hGood.changePct! <= 5);
  });

  // 7. 공개 서랍
  const drawer = await A[0]!.get<MarketDrawerResponse>(MARKET_API.drawer(teamB.id));
  const drawerJson = JSON.stringify(drawer);
  const otherClass = await A[0]!.call('GET', MARKET_API.drawer('00000000-0000-4000-8000-000000000000'));
  const rankB = (await A[0]!.get<MarketBoardResponse>(MARKET_API.board())).ranking.find((r) => r.teamId === teamB.id)!.rank;
  check('7. 공개 서랍 — 주가 · 순위 · 투자의견 · 9단계 · 기록 · 최근 8건 · 추세선, SMILES · 노트 · 점수 칸 없음 · 없는 모둠 404', () => {
    assert.equal(drawer.team.ticker, tick.B);
    assert.equal(drawer.steps.length, 9);
    assert.ok(drawer.recent.length <= 8 && drawer.recent.every((e) => e.teamId === teamB.id));
    assert.ok(drawer.trend.length >= 5, String(drawer.trend.length));
    assert.ok(['STRONG_BUY', 'BUY', 'HOLD', 'SHORT_WARNING'].includes(drawer.rating));
    assert.equal(drawer.rank, rankB);
    for (const bad of ['smiles', 'Smiles', 'note', 'score', 'components']) assert.equal(drawerJson.includes(`"${bad}`), false, bad);
    assert.equal(otherClass.status, 404);
  });
  const tDrawer = await teacher.call<MarketDrawerResponse>('GET', MARKET_API.drawer(teamB.id, cls.id));
  const tDrawerNoClass = await teacher.call('GET', MARKET_API.drawer(teamB.id));
  check('7. 교사 공개 서랍 — ?classId= 로 200(같은 내용) · 빠지면 400', () => {
    assert.equal(tDrawer.status, 200, JSON.stringify(tDrawer.body));
    assert.equal(tDrawer.body.team.ticker, tick.B);
    assert.equal(tDrawerNoClass.status, 400);
  });
  const finalBefore = await A[0]!.call<MarketFinalResponse>('GET', MARKET_API.final());
  const preview = await teacher.get<MarketFinalResponse>(MARKET_API.final(cls.id));
  check('6. 마감 전 — 학생은 최종 순위 비어 있음 · 교사는 미리보기(모든 모둠 과정 내역)', () => {
    assert.equal(finalBefore.status, 200);
    assert.equal(finalBefore.body.standings.length, 0);
    assert.equal(preview.preview, true);
    assert.equal(preview.standings.length, 3);
    assert.ok(Object.keys(preview.process).length >= 2);
  });

  // 6. 마감 — 정정 4건과 [지금 마감] 4번을 한꺼번에
  const race = await Promise.all([
    ...[1, -2, 1.5, 2.5].map((p, i) => teacher.call('POST', MARKET_API.notice(cls.id), { headline: `막판 정정 ${i}`, teamId: [teamA.id, teamB.id, teamC.id, teamA.id][i], changePct: p })),
    ...[0, 1, 2, 3].map(() => teacher.call<MarketFinalResponse>('POST', MARKET_API.finalAction(cls.id), { action: 'close' })),
  ]);
  const closes = race.slice(4);
  const fin = await q<{ final_at: Date; final_reason: string }>('select final_at, final_reason from web.classes where id = $1', [cls.id]);
  const late = await q<{ id: string; change_pct: number | null; created_at: Date; v: number }>(
    `select e.id, e.change_pct, e.created_at, (select count(*)::int from web.valuations v where v.event_id = e.id) as v
       from web.board_events e where e.class_id = $1 and e.headline like '%막판 정정%'`,
    [cls.id],
  );
  const stand = await q<{ team_id: string; price: number; rank: number }>('select team_id, price_usd::float8 as price, rank from web.class_standings where class_id = $1', [cls.id]);
  const prices = await Promise.all([teamA.id, teamB.id, teamC.id].map(price));
  check('6. [지금 마감] 4번 동시 → 200 1번 · 409 3번 · 순위표 3줄 · 정정 4건은 마감 전(움직임) 또는 뒤(null) · 얼린 주가 = 지금 주가', () => {
    assert.equal(closes.filter((r) => r.status === 200).length, 1, statuses(closes));
    assert.equal(closes.filter((r) => r.status === 409).length, 3, statuses(closes));
    assert.equal(fin[0]!.final_reason, 'teacher');
    assert.equal(stand.length, 3);
    assert.equal(late.length, 4);
    for (const e of late) assert.equal(e.change_pct === null, e.v === 0, JSON.stringify(e));
    for (const [i, id] of [teamA.id, teamB.id, teamC.id].entries()) assert.ok(Math.abs(stand.find((s) => s.team_id === id)!.price - prices[i]!) < 0.0001);
    assert.deepEqual(stand.map((s) => s.rank).sort(), [1, 2, 3]);
  });
  const afterFinal = await teacher.call('POST', MARKET_API.notice(cls.id), { headline: '마감 뒤 정정', teamId: teamC.id, changePct: 15 });
  const pC = await price(teamC.id);
  const studentFinal = await B[1]!.get<MarketFinalResponse>(MARKET_API.final());
  const boardFinal = await B[1]!.get<MarketBoardResponse>(MARKET_API.board());
  check('6. 마감 뒤 소식은 흐르지만 주가 · 순위 그대로 · 학생 최종 순위(시상대 재료) · 과정 내역은 자기 모둠만', () => {
    assert.equal(afterFinal.status, 201);
    assert.equal(pC, prices[2]);
    assert.ok(studentFinal.final);
    assert.equal(studentFinal.preview, false);
    assert.equal(studentFinal.standings.length, 3);
    assert.deepEqual(Object.keys(studentFinal.process), studentFinal.process[teamB.id] ? [teamB.id] : []);
    assert.equal(studentFinal.trends.length, 3);
    assert.ok(boardFinal.final);
    assert.deepEqual(boardFinal.ranking.map((r) => r.rank), [1, 2, 3]);
    assert.ok(studentFinal.standings.every((s) => s.processScore >= 0 && s.resultScore >= 0 && s.stepsDone >= 0));
    const a = studentFinal.standings.find((s) => s.teamId === teamA.id)!;
    assert.ok(a.resultScore >= 8, `A 결과 점수(특허 2) ${a.resultScore}`);
    assert.ok(a.processScore > 0);
    // 단계별 과정 점수는 자기 모둠(B)만 — 다른 모둠은 합계만(§5.3)
    assert.deepEqual(a.processByStep, {});
    assert.ok(studentFinal.standings.filter((s) => s.teamId !== teamB.id).every((s) => Object.keys(s.processByStep).length === 0));
  });
  const teacherFinal = await teacher.get<MarketFinalResponse>(MARKET_API.final(cls.id));
  check('6. 교사 최종 순위 — 모든 모둠 단계별 과정 점수', () => {
    assert.ok(Object.keys(teacherFinal.standings.find((s) => s.teamId === teamA.id)!.processByStep).length >= 4);
  });

  // 다시 열기 · 예약 마감
  const reopen = await teacher.call('POST', MARKET_API.finalAction(cls.id), { action: 'reopen' });
  const standAfter = await q<{ n: number }>('select count(*)::int as n from web.class_standings where class_id = $1', [cls.id]);
  const past = await teacher.call('POST', MARKET_API.finalAction(cls.id), { action: 'schedule', endsAt: new Date(Date.now() - 60_000).toISOString() });
  const sched = await teacher.call('POST', MARKET_API.finalAction(cls.id), { action: 'schedule', endsAt: new Date(Date.now() + 4000).toISOString() });
  let fin2: Array<{ final_reason: string | null }> = [];
  for (let i = 0; i < 20; i += 1) {
    await sleep(1000);
    fin2 = await q('select final_reason from web.classes where id = $1', [cls.id]);
    if (fin2[0]?.final_reason) break;
  }
  check('6. 마감 풀기 → 순위표 지움 · 지난 시각 예약 400 · 4초 뒤 예약 마감 → 주기 점검이 schedule 로 얼림', () => {
    assert.equal(reopen.status, 200);
    assert.equal(standAfter[0]!.n, 0);
    assert.equal(past.status, 400);
    assert.equal(sched.status, 200);
    assert.equal(fin2[0]!.final_reason, 'schedule');
  });

  const publicAfter = await countPublic();
  check('public 표 행 수 그대로', () => assert.equal(publicAfter, publicBefore));
}

main()
  .catch((error) => {
    console.error(error);
    results.push({ ok: false, label: `실행 오류: ${(error as Error).message}` });
  })
  .finally(async () => {
    await raw.end();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} 통과`);
    process.exit(failed.length ? 1 : 0);
  });
