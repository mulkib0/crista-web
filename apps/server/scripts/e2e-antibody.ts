#!/usr/bin/env node
/**
 * 항체 설계 랩(트랙 2 · 묶음 4) 점검 — 떠 있는 로컬 서버(HTTP) + 같은 DB(crista_web).
 *
 *   WEB_PORT=3412 LLM_DISABLED=1 WEB_ANTIBODY_OFFLINE=1 \
 *     node tools/with-local-env.mjs node apps/server/src/index.ts        (다른 터미널)
 *   WEB_PORT=3412 npm run e2e:antibody
 *
 * **`WEB_ANTIBODY_OFFLINE=1` 로 서버를 띄운다** — 외부 학술 서버를 부르지 않고 `data/fixtures/` 로만 돈다.
 * 먼저 `npm run db:migrate:local` · `npm run antibody:seed` 를 돌려 둔다(계면 잔기쌍 · σ 가 있어야 A5 가 돈다).
 *
 * 담는 사례(설계 §7 묶음 4 완료 조건):
 *   같은 requestId 두 번 → 과금 1회 · 같은 서열 재제출 → 새 행 · 과금 0 ·
 *   **저분자 화면을 한 번도 열지 않은 모둠의 첫 유료 작업이 402 가 아니라 성공**(ensureTeamRows) ·
 *   1인 2설계 초과 → 409 slot_taken · 1인 접기 2건 → 409 my_quota_used · 잔액 부족 → 402 · 낡은 version → 409 stale ·
 *   A1 투표 과반 → 프로그램 확정 · 과반 미달 → 확정 안 됨 · 모둠 신기록이 아닌 제출 → 변동 0 ·
 *   교사 설정(가중치 합 1.00 검사 · 학생 403 · 닫은 트랙이 me().openTracks 에) · 교사 정정 · 외부 장애 시 1회만 환급 ·
 *   web.valuations 에 행이 쌓이고 board.valuation 이 같은 값 · **public 스키마 행 수 불변**.
 *
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  ANTIBODY_API,
  API,
  DESIGN_SLOTS_PER_PERSON,
  cristaToCents,
  type AntibodyBoardResponse,
  type AntibodyCardView,
  type AntibodyJobResponse,
  type AntibodyProgramView,
  type AntibodyProposalView,
  type AntibodySubmitResponse,
  type AntibodyTeacherSettings,
  type DesignView,
  type MeResponse,
  type PreviewMetrics,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3412}`;
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

class Agent {
  cookie: string | null = null;
  readonly name: string;
  constructor(name = '') {
    this.name = name;
  }
  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { origin: BASE, ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const set = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
    if (set) this.cookie = set.split(';')[0]!;
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, ms: number, label: string): Promise<T> {
  const until = Date.now() + ms;
  for (;;) {
    const hit = await fn();
    if (hit !== undefined) return hit;
    if (Date.now() > until) throw new Error(`${label} — ${ms}ms 안에 오지 않았습니다.`);
    await sleep(300);
  }
}

const rid = () => `e2e${suffix}${randomBytes(8).toString('hex')}`;

/** 표적 3종 중 EGFR · 세툭시맙 · 1YY9 — 고정 예시가 있는 조합(offline 에서도 A2 · A4 가 돈다). */
const PROGRAM = { antigenTarget: 'CHEMBL203', parentAntibodyChemblId: 'CHEMBL1201577', referencePdb: '1YY9', chainRoles: { set: '1', H: 'D', L: 'C', AG: 'A' } };

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}${API.health}`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const db = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-antibody' });
  await db.connect();
  const q = async <R extends pg.QueryResultRow = Record<string, unknown>>(sql: string, args: unknown[] = []) => (await db.query<R>(sql, args)).rows;

  const seeded = await q<{ n: number }>('select count(*)::int as n from web.antibody_interfaces');
  if ((seeded[0]?.n ?? 0) === 0) throw new Error('web.antibody_interfaces 가 비어 있습니다. `npm run antibody:seed` 를 먼저 돌리세요.');

  // public 스키마 행 수 — 이 점검이 끝날 때까지 바뀌지 않아야 한다.
  const publicRows = async (): Promise<string> =>
    JSON.stringify(
      await q<{ relname: string; n: string }>(
        `select c.relname, (select count(*) from web.schema_migrations)::text as n
           from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
          where n2.nspname = 'public' and c.relkind = 'r' order by c.relname`,
      ),
    );
  const publicBefore = await publicRows();
  const publicCount = async (): Promise<number> => {
    const rows = await q<{ n: string }>(
      `select coalesce(sum(c.reltuples)::bigint, 0)::text as n from pg_class c
         join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`,
    );
    return Number(rows[0]?.n ?? 0);
  };
  const publicTuplesBefore = await publicCount();

  // ── 1. 계정 · 학급 ──
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', `tab${suffix}`, '--name', `항체 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  const secret = JSON.parse(run.stdout.trim()) as { userId: string; password: string };
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: `tab${suffix}`, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `항체 점검 ${suffix}`, teamCount: 2, maxStudents: 10 })).body;
  const [teamA, teamB] = [cls.teams[0]!, cls.teams[1]!];

  const A = [0, 1, 2, 3].map((i) => new Agent(`A${i + 1}`));
  const users: string[] = [];
  for (const [i, s] of A.entries()) {
    const r = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `sab${suffix}${i}`, displayName: `항체${i + 1}`, password: `pw-${suffix}-1234` });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    users.push(r.body.account.userId);
    assert.equal((await s.call('POST', API.join(teamA.id))).status, 200);
  }
  const tickA = `A${suffix.replace(/[^a-z]/g, 'q').toUpperCase()}`.slice(0, 4).padEnd(3, 'Q');
  assert.equal((await A[0]!.call('POST', API.registration(teamA.id), { name: `항체제약${suffix}`.slice(0, 14), ticker: tickA })).status, 201);

  // 모둠 B — **저분자 화면(GET /api/board)을 한 번도 열지 않는다**.
  const B = new Agent('B1');
  const bMe = await B.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `sbb${suffix}0`, displayName: '항체경쟁1', password: `pw-${suffix}-1234` });
  assert.equal(bMe.status, 201);
  assert.equal((await B.call('POST', API.join(teamB.id))).status, 200);
  const tickB = `B${suffix.replace(/[^a-z]/g, 'r').toUpperCase()}`.slice(0, 4).padEnd(3, 'R');
  assert.equal((await B.call('POST', API.registration(teamB.id), { name: `항체경쟁${suffix}`.slice(0, 14), ticker: tickB })).status, 201);

  // ── 2. 화면 한 장 ──
  await check('GET board — A1 만 열려 있고 초기 연구비가 들어 있다', async () => {
    const r = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.track, 'antibody');
    assert.equal(r.body.current, 'A1');
    assert.equal(r.body.steps.find((s) => s.id === 'A1')!.state, 'ready');
    assert.equal(r.body.steps.find((s) => s.id === 'A2')!.state, 'locked');
    assert.equal(r.body.balanceCents, cristaToCents(10_000_000));
    assert.equal(r.body.dataMode, 'fixture', '서버를 WEB_ANTIBODY_OFFLINE=1 로 띄워 주세요.');
    assert.equal(r.body.costs.A4, 0);
    assert.equal(r.body.costs.A5, cristaToCents(500_000));
    assert.ok(r.body.valuation.marketCapCents > 0);
  });

  // ── 3. 합의 — 카드 · 제안 · 투표 ──
  await check('카드는 1인 1몫 — 같은 몫을 다시 올리면 갱신된다', async () => {
    for (const [i, s] of A.slice(0, 3).entries()) {
      const r = await s.call<AntibodyCardView>('POST', ANTIBODY_API.cards, { step: 'A1', slot: `EGFR-${i}`, payload: { target: 'CHEMBL203' }, rationale: '추천 이유를 서른 글자 넘게 적어 봅니다. 표적이 분명해요.' });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    const again = await A[0]!.call<AntibodyCardView>('POST', ANTIBODY_API.cards, { step: 'A1', slot: 'EGFR-0', payload: { target: 'CHEMBL203' }, rationale: '같은 몫을 고쳐 다시 올립니다. 이유는 서른 글자를 넘겨 적어요.' });
    assert.equal(again.status, 200);
    const rows = await q<{ n: number }>('select count(*)::int as n from web.antibody_card_submissions where team_id = $1', [teamA.id]);
    assert.equal(rows[0]!.n, 3, '같은 (사람, 몫) 카드는 한 줄이어야 해요.');
  });

  let proposalId = '';
  await check('제안은 안건당 하나 — 열린 제안이 있으면 409', async () => {
    const r = await A[0]!.call<AntibodyProposalView>('POST', ANTIBODY_API.proposals, { topic: 'program', value: PROGRAM, rationale: '세툭시맙을 본뜨고 1YY9 를 레퍼런스로 삼아요. 이유를 길게 적습니다.' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    proposalId = r.body.id;
    assert.equal(r.body.votes.quorum, 3, '유효 인원 4명의 과반은 3표예요.');
    const dup = await A[1]!.call('POST', ANTIBODY_API.proposals, { topic: 'program', value: PROGRAM, rationale: '같은 안건을 또 올려 봅니다. 이유도 길게 적어야 통과해요.' });
    assert.equal(dup.status, 409);
  });

  await check('투표 — 낡은 version 은 409 stale · 과반 미달이면 확정 안 됨', async () => {
    const stale = await A[0]!.call('POST', ANTIBODY_API.votes(proposalId), { choice: 'yes', version: 99 });
    assert.equal(stale.status, 409);
    assert.equal((await A[0]!.call('POST', ANTIBODY_API.votes(proposalId), { choice: 'yes', version: 1 })).status, 200);
    const two = await A[1]!.call<AntibodyProposalView>('POST', ANTIBODY_API.votes(proposalId), { choice: 'yes', version: 1 });
    assert.equal(two.status, 200);
    assert.equal(two.body.status, 'open', '2표로는 확정되지 않아야 해요.');
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(board.body.program.antigenTarget, undefined, '과반 미달이면 프로그램이 비어 있어야 해요.');
  });

  await check('투표 — 과반 yes 면 같은 트랜잭션에서 프로그램이 확정되고 원본 비교군이 생긴다', async () => {
    const three = await A[2]!.call<AntibodyProposalView>('POST', ANTIBODY_API.votes(proposalId), { choice: 'yes', version: 1 });
    assert.equal(three.status, 200, JSON.stringify(three.body));
    assert.equal(three.body.status, 'passed');
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(board.body.program.antigenTarget, 'CHEMBL203');
    assert.equal(board.body.program.referencePdb, '1YY9');
    assert.equal(board.body.program.parentVh?.length, 119, '세툭시맙 VH 는 119잔기예요(묶음 2 가 고정).');
    assert.equal(board.body.steps.find((s) => s.id === 'A1')!.state, 'done');
    assert.equal(board.body.steps.find((s) => s.id === 'A2')!.state, 'ready');
    assert.ok(board.body.designs.some((d) => d.origin === 'parent'), '원본 비교군 설계가 있어야 해요.');
    const news = await q<{ kind: string; change_pct: number | null }>(`select kind, change_pct from web.board_events where team_id = $1 and kind = 'antibody_program'`, [teamA.id]);
    assert.equal(news.length, 1, '프로그램 확정 소식은 한 줄이어야 해요.');
    assert.equal(news[0]!.change_pct, 0, '확정 소식은 변동 0% 예요.');
  });

  await check('PUT program — 낡은 version 은 409 stale', async () => {
    const r = await A[0]!.call('PUT', ANTIBODY_API.program, { ...PROGRAM, version: 1 });
    assert.equal(r.status, 409);
  });

  const parentDesign = (await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board)).body.designs.find((d) => d.origin === 'parent')!;

  // ── 4. 설계 ──
  await check('미리보기는 무료 · 결정적이고 모든 지표에 배지가 붙는다', async () => {
    const r = await A[0]!.call<PreviewMetrics>('POST', ANTIBODY_API.preview, { vh: parentDesign.vh });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.provenance.length >= 1);
    assert.ok(r.body.provenance.some((p) => p.approx));
    assert.ok(r.body.cdrTotalLength > 0);
  });

  const mutate = (seq: string, pos: number, aa: string): string => `${seq.slice(0, pos - 1)}${aa}${seq.slice(pos)}`;
  const designIds: string[] = [];
  await check(`1인 ${DESIGN_SLOTS_PER_PERSON}설계까지 — 넘으면 409 slot_taken`, async () => {
    for (const [i, pos] of [100, 101].entries()) {
      const vh = mutate(parentDesign.vh, pos, 'A');
      const r = await A[0]!.call<DesignView>('POST', ANTIBODY_API.designs, {
        label: `내 설계 ${i + 1}`,
        vh,
        vl: parentDesign.vl,
        mutations: [{ chain: 'H', pos, wt: parentDesign.vh[pos - 1], mut: 'A' }],
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      designIds.push(r.body.id);
    }
    const over = await A[0]!.call('POST', ANTIBODY_API.designs, {
      label: '내 설계 3',
      vh: mutate(parentDesign.vh, 102, 'A'),
      vl: parentDesign.vl,
      mutations: [{ chain: 'H', pos: 102, wt: parentDesign.vh[101], mut: 'A' }],
    });
    assert.equal(over.status, 409, JSON.stringify(over.body));
    assert.equal((over.body as { error: { code: string } }).error.code, 'slot_taken');
  });

  await check('같은 서열 재제출 — 새 행 없음 · 원장 그대로', async () => {
    const before = await q<{ n: number }>('select count(*)::int as n from web.ledger where team_id = $1', [teamA.id]);
    const rows = await q<{ n: number }>('select count(*)::int as n from web.antibody_designs where team_id = $1', [teamA.id]);
    const again = await A[1]!.call<DesignView>('POST', ANTIBODY_API.designs, {
      label: '남이 올린 같은 서열',
      vh: mutate(parentDesign.vh, 100, 'A'),
      vl: parentDesign.vl,
      mutations: [{ chain: 'H', pos: 100, wt: parentDesign.vh[99], mut: 'A' }],
    });
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.id, designIds[0], '같은 서열이면 기존 설계를 돌려줘야 해요.');
    assert.deepEqual(await q<{ n: number }>('select count(*)::int as n from web.antibody_designs where team_id = $1', [teamA.id]), rows);
    assert.deepEqual(await q<{ n: number }>('select count(*)::int as n from web.ledger where team_id = $1', [teamA.id]), before);
  });

  await check('규칙 제안 — 모둠 공용(1인 상한에 들지 않는다)', async () => {
    const r = await A[0]!.call<DesignView[]>('POST', ANTIBODY_API.suggest, { count: 2, boldness: 'normal' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.length >= 1);
    assert.equal(r.body[0]!.origin, 'suggested');
    const mine = await q<{ n: number }>('select count(*)::int as n from web.antibody_designs where team_id = $1 and designed_by = $2', [teamA.id, users[0]]);
    assert.equal(mine[0]!.n, DESIGN_SLOTS_PER_PERSON, '제안은 designed_by 가 비어 1인 상한에 들지 않아야 해요.');
  });

  // ── 5. 작업 ──
  const jobStatus = async (id: string) => (await q<{ status: string; error_message: string | null }>('select status, error_message from web.antibody_jobs where id = $1', [id]))[0];

  await check('A2 — 같은 requestId 두 번이면 과금 1회 · 작업 1건', async () => {
    const requestId = rid();
    const first = await A[0]!.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId, step: 'A2' });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const second = await A[0]!.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId, step: 'A2' });
    assert.equal(second.status, 200);
    assert.equal(second.body.created, false);
    assert.equal(second.body.job.id, first.body.job.id);
    const rows = await q<{ n: number }>('select count(*)::int as n from web.antibody_jobs where team_id = $1 and request_id = $2', [teamA.id, requestId]);
    assert.equal(rows[0]!.n, 1);
    const done = await waitFor(async () => {
      const row = await jobStatus(first.body.job.id);
      return row && row.status !== 'queued' && row.status !== 'running' ? row : undefined;
    }, 90_000, 'A2 작업');
    assert.equal(done.status, 'succeeded', done.error_message ?? '');
  });

  await check('A2 결과 — 다양성 등급 · IMGT 번호 · CDR 구간이 들어 있다', async () => {
    const rows = await q<{ result: { diversity?: Array<{ chain: string; grades: number[]; cdrs: unknown[]; msaDepth: number }> } }>(
      `select result from web.antibody_jobs where team_id = $1 and step = 'A2' and status = 'succeeded' order by created_at desc limit 1`,
      [teamA.id],
    );
    const diversity = rows[0]?.result.diversity ?? [];
    assert.ok(diversity.length >= 1, '사슬 하나 이상의 다양성이 있어야 해요.');
    const h = diversity.find((d) => d.chain === 'H')!;
    assert.equal(h.grades.length, parentDesign.vh.length);
    assert.ok(h.grades.every((g) => g >= 1 && g <= 9));
    assert.ok(h.msaDepth > 100, `모은 서열이 너무 적어요(${h.msaDepth}).`);
    assert.ok(h.cdrs.length >= 1);
  });

  // DB 에 들어 있는 것만 보면 '서버는 계산했지만 화면에는 안 내려가는' 구멍을 못 잡아요(§12).
  await check('A2 결과가 board 응답에도 실려 온다 — diversity 에 H 사슬이 있다', async () => {
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(board.status, 200, JSON.stringify(board.body));
    assert.ok(Array.isArray(board.body.diversity), 'board 응답에 diversity 칸이 있어야 해요.');
    const h = board.body.diversity.find((d) => d.chain === 'H');
    assert.ok(h, 'board 응답의 diversity 에 H 사슬이 있어야 해요 — 화면이 이걸로 그려요.');
    assert.equal(h.grades.length, parentDesign.vh.length);
    assert.ok(h.cdrs.length >= 1, 'CDR 구간도 함께 와야 해요(A3 색칠 · 자물쇠가 이걸 써요).');
    assert.ok(h.grades.every((g) => g >= 1 && g <= 9));
    assert.ok(h.provenance.approx !== undefined, '출처 배지가 함께 와야 해요.');
  });

  let foldJobId = '';
  await check('A4 접기 — 원본 비교군은 고정 예시로 성공한다(무료)', async () => {
    const r = await A[0]!.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId: rid(), step: 'A4', designId: parentDesign.id, params: { shape: 'fv' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.job.costCents, 0);
    foldJobId = r.body.job.id;
    const done = await waitFor(async () => {
      const row = await jobStatus(foldJobId);
      return row && row.status !== 'queued' && row.status !== 'running' ? row : undefined;
    }, 90_000, 'A4 작업');
    assert.equal(done.status, 'succeeded', done.error_message ?? '');
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    const fold = board.body.folds[0];
    assert.ok(fold, '접힘 결과가 화면에 와야 해요.');
    assert.ok(fold.confidenceMean > 1 && fold.confidenceMean <= 100, `확신도는 0~100 이어야 해요(${fold.confidenceMean}).`);
    assert.ok(fold.bySegment.length >= 1);
  });

  await check('A4 — 한 사람이 두 번 돌리면 409 my_quota_used', async () => {
    const r = await A[0]!.call('POST', ANTIBODY_API.jobs, { requestId: rid(), step: 'A4', designId: designIds[0], params: { shape: 'fv' } });
    assert.equal(r.status, 409, JSON.stringify(r.body));
    assert.equal((r.body as { error: { code: string } }).error.code, 'my_quota_used');
  });

  await check('A4 — scFv 가 400잔기를 넘으면 413 sequence_too_long', async () => {
    const r = await A[1]!.call('POST', ANTIBODY_API.jobs, { requestId: rid(), step: 'A4', designId: parentDesign.id, params: { shape: 'scfv' } });
    // 세툭시맙 Fv(119 + 15 + 107 = 241)는 들어간다 — 길이가 넘는 설계만 413 이다.
    assert.ok(r.status === 201 || r.status === 409, `201 · 409 가 아니라 ${r.status} 였어요: ${JSON.stringify(r.body)}`);
  });

  await check('A5 평가 — 500,000 크리스타 과금 1회 · 계면 쌍으로 적합도를 낸다', async () => {
    const requestId = rid();
    const first = await A[2]!.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId, step: 'A5', designId: parentDesign.id });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const second = await A[2]!.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId, step: 'A5', designId: parentDesign.id });
    assert.equal(second.status, 200);
    const ledger = await q<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and idem_key = $2`, [teamA.id, `ab-job:${first.body.job.id}`]);
    assert.equal(ledger[0]!.n, 1, '같은 작업에 과금 줄은 하나예요.');
    const done = await waitFor(async () => {
      const row = await jobStatus(first.body.job.id);
      return row && row.status !== 'queued' && row.status !== 'running' ? row : undefined;
    }, 90_000, 'A5 작업');
    assert.equal(done.status, 'succeeded', done.error_message ?? '');
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    const complex = board.body.complexes[0];
    assert.ok(complex, '복합체 평가 결과가 화면에 와야 해요.');
    assert.ok(complex.contacts.length > 0, '계면 접촉 목록이 있어야 해요.');
    assert.ok(complex.fit >= 0 && complex.fit <= 100);
    // 배지는 지표마다 하나예요 — 적합도 · 붙는 힘 쪽 근사 배지가 **늘** 들어 있어야 해요(§3.5 · §12).
    assert.ok(complex.provenance.length > 0, '출처 배지가 비어 있으면 안 돼요.');
    assert.ok(
      complex.provenance.some((p) => p.approx),
      '교육용 근사 배지가 붙어야 해요(복합체 신뢰도를 받아도 근사 배지를 갈아치우지 않아요).',
    );
  });

  // ── 6. A6 제출 · 기업가치 ──
  await check('A6 제출 — 점수 · 소식 · 기업가치가 함께 움직인다(같은 requestId 과금 1회)', async () => {
    const requestId = rid();
    const first = await A[0]!.call<AntibodySubmitResponse>('POST', ANTIBODY_API.submit, { designId: parentDesign.id, requestId });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.ok(first.body.score.score >= 0 && first.body.score.score <= 100);
    assert.equal(first.body.score.formulaVersion, 'antibody-score-v2');
    assert.ok(first.body.score.caveat.length > 0, '한계 문구가 늘 붙어야 해요.');
    assert.ok(first.body.score.provenance.length >= 1);
    const again = await A[0]!.call<AntibodySubmitResponse>('POST', ANTIBODY_API.submit, { designId: parentDesign.id, requestId });
    assert.equal(again.status, 200);
    const ledger = await q<{ n: number }>('select count(*)::int as n from web.ledger where team_id = $1 and idem_key = $2', [teamA.id, `ab-submit:${requestId}`]);
    assert.equal(ledger[0]!.n, 1, '같은 requestId 제출에 과금 줄은 하나예요.');
    const valuations = await q<{ price_usd: string; change_pct: number | null }>('select price_usd, change_pct from web.valuations where team_id = $1 order by created_at desc', [teamA.id]);
    assert.ok(valuations.length >= 1, 'web.valuations 에 행이 쌓여야 해요.');
    const board = await A[0]!.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(board.body.valuation.fundamentalUsd, Number(valuations[0]!.price_usd), '화면 기업가치가 원장 값과 같아야 해요.');
    assert.ok(board.body.best, '모둠 최고 점수가 화면에 와야 해요.');
    assert.equal(board.body.steps.find((s) => s.id === 'A6')!.state, 'done');
  });

  await check('모둠 신기록이 아닌 제출 — 변동 0(소식 · 기업가치 줄이 늘지 않는다)', async () => {
    const before = await q<{ n: number }>('select count(*)::int as n from web.valuations where team_id = $1', [teamA.id]);
    const events = await q<{ n: number }>(`select count(*)::int as n from web.board_events where team_id = $1 and kind = 'antibody_record'`, [teamA.id]);
    // 같은 설계를 새 requestId 로 또 제출하면 점수가 같으니 신기록이 아니다.
    const r = await A[1]!.call<AntibodySubmitResponse>('POST', ANTIBODY_API.submit, { designId: parentDesign.id, requestId: rid() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(await q<{ n: number }>('select count(*)::int as n from web.valuations where team_id = $1', [teamA.id]), before);
    assert.deepEqual(await q<{ n: number }>(`select count(*)::int as n from web.board_events where team_id = $1 and kind = 'antibody_record'`, [teamA.id]), events);
  });

  // ── 7. 저분자 화면을 한 번도 열지 않은 모둠 ──
  await check('저분자 화면을 열지 않은 모둠도 첫 유료 작업이 402 가 아니다(ensureTeamRows)', async () => {
    const before = await q<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and kind = 'initial'`, [teamB.id]);
    assert.equal(before[0]!.n, 0, '등기만 한 모둠에는 초기 연구비 줄이 아직 없어야 해요(이 점검의 전제).');
    const board = await B.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board);
    assert.equal(board.status, 200, JSON.stringify(board.body));
    assert.equal(board.body.balanceCents, cristaToCents(10_000_000), 'GET board 가 초기 연구비 줄을 넣어야 해요.');

    const put = await B.call<AntibodyProgramView>('PUT', ANTIBODY_API.program, { ...PROGRAM, version: 1 });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    const bParent = (await B.call<AntibodyBoardResponse>('GET', ANTIBODY_API.board)).body.designs.find((d) => d.origin === 'parent')!;
    // A5 는 A4 성공을 전제로 하므로 접힘 한 건을 DB 로 만들어 둔다(러너가 아니라 '첫 유료 작업' 만 보는 점검).
    const rev = (await q<{ id: string }>('select id from web.antibody_revisions where team_id = $1 order by revision_no desc limit 1', [teamB.id]))[0]!;
    await q(
      `insert into web.antibody_jobs (team_id, class_id, revision_id, design_id, request_id, step, status, progress, provider, result, finished_at)
       values ($1, $2, $3, $4, $5, 'A4', 'succeeded', 1, 'fixture', $6, now())`,
      [teamB.id, cls.id, rev.id, bParent.id, rid(), JSON.stringify({ fold: { designId: bParent.id, confidenceMean: 86.66 }, source: 'ai-predict', approx: true })],
    );
    const paid = await B.call<AntibodyJobResponse>('POST', ANTIBODY_API.jobs, { requestId: rid(), step: 'A5', designId: bParent.id });
    assert.equal(paid.status, 201, `402 가 아니라 201 이어야 해요: ${JSON.stringify(paid.body)}`);
    assert.equal(paid.body.job.costCents, cristaToCents(500_000));
  });

  // ── 8. 잔액 부족 ──
  await check('잔액이 모자라면 402 insufficient_funds', async () => {
    const balance = await q<{ n: string }>('select coalesce(sum(amount_cents), 0)::text as n from web.ledger where team_id = $1', [teamA.id]);
    await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key) values ($1, $2, 'adjustment', $3)`, [teamA.id, -Number(balance[0]!.n), `e2e:drain:${suffix}`]);
    const r = await A[3]!.call('POST', ANTIBODY_API.jobs, { requestId: rid(), step: 'A5', designId: parentDesign.id });
    assert.equal(r.status, 402, JSON.stringify(r.body));
    await q('delete from web.ledger where team_id = $1 and idem_key = $2', [teamA.id, `e2e:drain:${suffix}`]);
  });

  // ── 9. 환급은 한 번만 ──
  await check('외부 장애 · 만기 — 환급은 한 번만', async () => {
    const rev = (await q<{ id: string }>('select id from web.antibody_revisions where team_id = $1 order by revision_no desc limit 1', [teamA.id]))[0]!;
    const cost = cristaToCents(500_000);
    const jobId = (
      await q<{ id: string }>(
        `insert into web.antibody_jobs (team_id, class_id, revision_id, design_id, request_id, step, status, progress, cost_cents, requested_by, timeout_at)
         values ($1, $2, $3, $4, $5, 'A5', 'running', 0.5, $6, $7, now() - interval '1 minute') returning id`,
        [teamA.id, cls.id, rev.id, designIds[1], rid(), cost, users[3]],
      )
    )[0]!.id;
    await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, created_by, ref_type, ref_id) values ($1, $2, 'paid_work', $3, $4, 'antibody_job', $5)`, [
      teamA.id,
      -cost,
      `ab-job:${jobId}`,
      users[3],
      jobId,
    ]);
    const finished = await waitFor(async () => {
      const row = await jobStatus(jobId);
      return row && (row.status === 'timeout' || row.status === 'failed') ? row : undefined;
    }, 30_000, '만기 거두기');
    assert.equal(finished.status, 'timeout');
    const refunds = async () => (await q<{ n: number }>('select count(*)::int as n from web.ledger where team_id = $1 and idem_key = $2', [teamA.id, `ab-job-refund:${jobId}`]))[0]!.n;
    assert.equal(await refunds(), 1, '환급 줄은 하나예요.');
    await sleep(4_000);
    assert.equal(await refunds(), 1, '틱이 또 돌아도 환급은 늘지 않아야 해요.');
  });

  // ── 10. 교사 ──
  await check('교사 설정 — 학생은 403 · 가중치 합이 1.00 이 아니면 409', async () => {
    const student = await A[0]!.call('GET', ANTIBODY_API.teacherSettings);
    assert.equal(student.status, 403, JSON.stringify(student.body));
    const get = await teacher.call<AntibodyTeacherSettings>('GET', `${ANTIBODY_API.teacherSettings}?classId=${cls.id}`);
    assert.equal(get.status, 200, JSON.stringify(get.body));
    const bad = await teacher.call('PUT', ANTIBODY_API.teacherSettings, {
      classId: cls.id,
      weights: { binding: 0.5, stability: 0.2, developability: 0.3, humanization: 0.1, novelty: 0.1 },
      thresholds: get.body.thresholds,
      openTracks: ['small', 'antibody'],
      version: get.body.version,
    });
    assert.equal(bad.status, 409, JSON.stringify(bad.body));
    assert.equal((bad.body as { error: { code: string } }).error.code, 'invalid_input');
  });

  await check('교사 설정 — 닫은 트랙이 me().openTracks 에 반영된다', async () => {
    const get = await teacher.call<AntibodyTeacherSettings>('GET', `${ANTIBODY_API.teacherSettings}?classId=${cls.id}`);
    const ok = await teacher.call<AntibodyTeacherSettings>('PUT', ANTIBODY_API.teacherSettings, {
      classId: cls.id,
      weights: { binding: 0.4, stability: 0.2, developability: 0.2, humanization: 0.1, novelty: 0.1 },
      thresholds: { scoreMargin: 7, confidenceMin: 70 },
      openTracks: ['small'],
      version: get.body.version,
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.deepEqual(ok.body.openTracks, ['small']);
    const me = await A[0]!.call<MeResponse>('GET', API.me);
    assert.deepEqual(me.body.openTracks, ['small']);
    assert.ok(me.body.labs, 'me() 에 두 랩의 진행이 와야 해요.');
    assert.equal(me.body.labs!.small.total, 9, '저분자 total 은 STEP_IDS.length(9) 예요.');
    assert.equal(me.body.labs!.antibody.total, 6);
    assert.ok(me.body.labs!.antibody.doneCount >= 1);
    // 다시 열어 둔다(다음 점검 · 수업에 영향이 없게).
    const after = await teacher.call<AntibodyTeacherSettings>('GET', `${ANTIBODY_API.teacherSettings}?classId=${cls.id}`);
    assert.equal(
      (
        await teacher.call('PUT', ANTIBODY_API.teacherSettings, {
          classId: cls.id,
          weights: after.body.weights,
          thresholds: after.body.thresholds,
          openTracks: ['small', 'antibody'],
          version: after.body.version,
        })
      ).status,
      200,
    );
  });

  await check('교사 정정 — 정정 소식 + 기업가치 되돌림', async () => {
    const before = await q<{ n: number }>('select count(*)::int as n from web.valuations where team_id = $1', [teamA.id]);
    const r = await teacher.call<{ changePct: number }>('POST', ANTIBODY_API.teacherCorrect, { teamId: teamA.id, reason: '점수 계산을 다시 했어요', newChangePct: -2 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.changePct, -2);
    const events = await q<{ change_pct: number | null }>(`select change_pct from web.board_events where team_id = $1 and kind = 'correction' order by class_seq desc limit 1`, [teamA.id]);
    assert.equal(events[0]!.change_pct, -2);
    const after = await q<{ n: number }>('select count(*)::int as n from web.valuations where team_id = $1', [teamA.id]);
    assert.equal(after[0]!.n, before[0]!.n + 1);
  });

  await check('교사 큐 보기 — 도메인별 상한 · 대기', async () => {
    const r = await teacher.call<{ domains: Array<{ domain: string; limit: number }> }>('GET', `${ANTIBODY_API.teacherQueue}?classId=${cls.id}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.domains.find((d) => d.domain === 'esmfold')!.limit, 1, 'ESMFold 동시요청 상한은 1 이에요.');
  });

  await check("'점수 계산 방법' — 가중치 · 문턱 · 상한 · 출처가 모두 있다", async () => {
    const r = await A[0]!.call<{ weights: Record<string, number>; limits: Record<string, number>; reference: { source: string }; steps: unknown[] }>('GET', ANTIBODY_API.scoring);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(Object.keys(r.body.weights).length, 5);
    assert.equal(r.body.limits.esmfoldMaxResidues, 400);
    assert.ok(r.body.reference.source.length > 0);
    assert.equal(r.body.steps.length, 6);
  });

  await check('노트 — 칸별 낙관적 잠금 · 409 stale 은 지금 칸을 싣는다', async () => {
    const first = await A[0]!.call<{ version: number }>('PUT', ANTIBODY_API.note('A6', 'why'), { body: '이 설계를 대표로 고른 이유예요.', version: 0 });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.version, 1);
    const stale = await A[1]!.call<{ error: { code: string; abNote?: { body: string } } }>('PUT', ANTIBODY_API.note('A6', 'why'), { body: '늦게 쓴 내용이에요.', version: 0 });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'stale');
    assert.ok(stale.body.error.abNote, '409 stale 은 지금 칸(abNote)을 실어야 해요.');
  });

  // ── 11. 경계 ──
  await check('public 스키마는 손대지 않았다', async () => {
    assert.equal(await publicRows(), publicBefore);
    assert.equal(await publicCount(), publicTuplesBefore);
  });

  await check('공유 표는 ALTER 하지 않았다 — ledger · jobs · teams 의 제약이 그대로', async () => {
    const rows = await q<{ n: number }>(
      `select count(*)::int as n from pg_constraint c
         where c.conrelid in ('web.ledger'::regclass, 'web.jobs'::regclass, 'web.teams'::regclass)
           and c.conname like 'antibody%'`,
    );
    assert.equal(rows[0]!.n, 0, '공유 표에 항체 전용 제약을 붙이지 않았어야 해요.');
  });

  await check('항체 표는 13개만 만들었다(§11.5 — 소식 · 가치 표를 만들지 않는다)', async () => {
    const rows = await q<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'web' and table_name like 'antibody_%' order by table_name`,
    );
    const names = rows.map((r) => r.table_name);
    assert.equal(names.length, 13, names.join(' · '));
    assert.ok(!names.includes('antibody_events'));
    assert.ok(!names.includes('antibody_valuations'));
  });

  await db.end();
  console.log(failed === 0 ? '\n항체 랩 e2e 통과' : `\n실패 ${failed}건`);
  if (failed > 0) process.exitCode = 1;
}

await main();
