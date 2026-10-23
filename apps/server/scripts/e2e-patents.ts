/**
 * F31 3.1 물질특허 — 4인 동시 조작 · 두 모둠 동시 받아들임 점검(설계 §5.8 · §7.4 ⑩ ⑪ ⑫).
 * 떠 있는 로컬 서버에 실제 HTTP 로 동시에 보낸다(LLM 은 끈 채 — 심사는 pending, 받아들임은 교사 수동 판정으로 낸다).
 *
 *   crista 워커 8790(fixture) · LLM_DISABLED=1 WEB_PORT=3403 node tools/with-local-env.mjs node apps/server/src/index.ts
 *   WEB_PORT=3403 npm run e2e:patents
 *
 * 앞 단계(1.2 · 2.1 · 2.2 · 특허 후보)는 다른 기능(F12 · FSEL)의 몫이라 crista_web 연결로 시험 데이터를 직접 넣는다
 * (도킹 · ADMET 작업 줄 + lead_candidates — 기반 설명서 ④-2). 3.1 의 모든 쓰기는 서버 경로로만 한다.
 *
 * 1. ① 후보 · 출원서 만들기 — 같은 후보를 넷이 한꺼번에 → 1건만 201 · 3건 409 already_exists. 같은 물질 다른 작업 → 409.
 * 2. ② 코드명 — 넷이 같은 expectedCode 로 한꺼번에 → 1건만 200 · 3건 409 stale. 형식 · 티커 · 이미 쓴 번호.
 * 3. ③ 칸 — 넷이 다른 칸을 한꺼번에 → 모두 200. 같은 칸 같은 판 → 1건 200 · 1건 409 stale + 지금 칸.
 * 4. ④ 심사 — 규칙 fail → 보완(LLM 없음) · 넷이 같은 판을 한꺼번에 → 심사 1건(⑫) · LLM 꺼짐 → pending · 상한 · 이미 알려진 물질 → 거절.
 * 5. ⑤ 두 모둠이 같은 분자를 동시에 받아들임(교사 수동 판정 동시) → 원장 1줄 · 출원료 1번 · 늦은 쪽 '거절 · 이미 있음'(과금 없음 · 빨간 줄은 그 모둠만).
 * 6. 코드명 잠금(DB 복합 외래 키) · 부분 고유 키(DB) · 포기(슬롯 반환 · 환급 없음 · 소식 없음) → 다른 모둠이 같은 분자 등록.
 * 7. public 표 행 수가 그대로.
 * 8. (적대적 검토 F31) 앞 판 심사를 교사가 통과로 정정해도 새 판 심사가 있으면 상태 · 과금 · 등재 그대로 · 교사 수동 거절은 이유 없음(null) ·
 *    심사 중 표적을 바꾸면 받아들임 단계에서 보완(등록 · 과금 없음) · 옛 표적 버전 출원서는 새 심사 409.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  PATENT_API,
  PATENT_FEE_CENTS,
  type ApiErrorBody,
  type BoardResponse,
  type MeResponse,
  type PatentApplicationView,
  type PatentLedgerResponse,
  type PatentPrecheckResponse,
  type PatentsResponse,
  type ReviewRequestResponse,
  type SectionSaveResponse,
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
    if (setCookie) this.cookie = setCookie.split(';')[0]!;
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  }
  async patents(): Promise<PatentsResponse> {
    const r = await this.call<PatentsResponse>('GET', PATENT_API.patents);
    if (r.status !== 200) throw new Error(`${this.name} /api/patents ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  }
}

const err = (reply: Reply) => (reply.body as ApiErrorBody | null)?.error;
const statuses = (replies: Reply[]) => replies.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `특허 점검 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

async function withDb<T>(fn: (c: pg.Client) => Promise<T>, url = process.env.WEB_DATABASE_URL): Promise<T> {
  // 여러 기능 서버가 함께 떠 있으면 crista_web 역할 연결 상한(53300)에 닿을 수 있다 — 잠깐 쉬고 다시 붙는다.
  let client = new pg.Client({ connectionString: url, application_name: 'crista-web-e2e-patents' });
  for (let attempt = 0; ; attempt += 1) {
    try {
      await client.connect();
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== '53300' || attempt >= 20) throw error;
      await new Promise((r) => setTimeout(r, 500 + attempt * 250));
      client = new pg.Client({ connectionString: url, application_name: 'crista-web-e2e-patents' });
    }
  }
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function countPublic(): Promise<number> {
  const url = process.env.CRISTA_DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('로컬 관리자 연결(CRISTA_DATABASE_URL)이 필요합니다.');
  return withDb(async (c) => {
    await c.query('begin read only');
    const tables = await c.query<{ t: string }>(`select tablename as t from pg_tables where schemaname = 'public'`);
    let n = 0;
    for (const { t } of tables.rows) n += Number((await c.query<{ n: string }>(`select count(*)::text as n from public.${c.escapeIdentifier(t)}`)).rows[0]!.n);
    await c.query('rollback');
    return n;
  }, url);
}

// ── 앞 단계 시험 데이터(crista_web) — 2.1 도킹 · 2.2 ADMET 작업 줄 + 특허 후보 ──

const V = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3cccnc3)CC1)C2'; // 도네페질 피리딘 변형(새 분자)
const W = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccc(F)cc3)CC1)C2'; // 플루오로 변형(새 분자)
const K = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2'; // 도네페질(기준 리간드 · 승인약)
const X = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccc(Cl)cc3)CC1)C2'; // 클로로 변형(새 분자 — 교사 정정 점검)
const Y = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccc(C)cc3)CC1)C2'; // 메틸 변형(새 분자 — 옛 표적 버전 점검)

async function seedCandidate(team: { id: string; classId: string; revisionId: string; targetId: string }, by: string, slot: 1 | 2, smiles: string, label: string, kcal: number): Promise<string> {
  return withDb(async (c) => {
    const rid = () => randomBytes(10).toString('hex');
    const dock = await c.query<{ id: string }>(
      `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, smiles, label, status, progress, source, test,
                             result, canonical_smiles, affinity_kcal, program_revision_id, worker_known, finished_at)
       values ($1, $2, $3, $4, '2.1', 3, 'docking', $5, 'e2e 시험 도킹', $6, $7, $8, 'succeeded', 1, 'fixture', true, $9, $7, $10, $11, true, now()) returning id`,
      [team.id, team.classId, by, rid(), JSON.stringify({ smiles }), team.targetId, smiles, label,
        JSON.stringify({ metrics: [{ label: '최적 결합 자유에너지 ΔG', value: String(kcal), unit: 'kcal/mol', tone: 'high' }], table: { columns: ['잔기', '상호작용', '거리 (Å)'], rows: [['TRP286', 'π-스태킹', '3.80'], ['TYR124', '수소결합', '2.90']] }, annotations: [] }),
        kcal, team.revisionId],
    );
    const admet = await c.query<{ id: string }>(
      `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, smiles, label, parent_job_id, status, progress, source, test,
                             result, canonical_smiles, program_revision_id, worker_known, finished_at)
       values ($1, $2, $3, $4, '2.2', 4, 'admet', $5, 'e2e 시험 ADMET', $6, $7, $8, $9, 'succeeded', 1, 'fixture', true, $10, $7, $11, true, now()) returning id`,
      [team.id, team.classId, by, rid(), JSON.stringify({ dockingJobId: dock.rows[0]!.id }), team.targetId, smiles, label, dock.rows[0]!.id,
        JSON.stringify({ metrics: [{ label: 'BBB 투과율', value: '76.0', unit: '%', tone: 'pen' }, { label: 'hERG 억제 IC50', value: '13.36', unit: 'µM', tone: 'pen' }], annotations: [] }),
        team.revisionId],
    );
    await c.query(
      `insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, $5, 'legacy_lead')`,
      [team.revisionId, team.id, admet.rows[0]!.id, by, slot],
    );
    return admet.rows[0]!.id;
  });
}

const SECTIONS = (ticker: string, inventor: string): Record<string, string> => ({
  code_tick: `${ticker} = 우리 스타트업 이름표`,
  code_num: '102 = 1번 프로그램의 두 번째 후보',
  mech_how: 'selective,reversible',
  mech_action: 'inhibitor',
  mech_why: 'ACHE 포켓 TRP286 에 붙었다 떨어지는 결합이라서',
  title: 'ACHE 억제 활성을 갖는 벤질피페리딘 계열 화합물',
  field: '알츠하이머병 치료를 위한 ACHE 억제제',
  background: '기준 약 도네페질은 간 대사가 빨라 하루 한 번 복용에서 혈중 농도가 흔들리는 한계가 있다.',
  claim1: '구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염.',
  claim2: '청구항 1 의 화합물을 유효성분으로 포함하는 알츠하이머병 예방 또는 치료용 약학 조성물.',
  effect: '도킹 ΔG 가 기준 약보다 약간 약하지만 BBB 투과율 76% 로 뇌에 닿는다는 점이 기준 약 대비 장점이다.',
  summary: 'ACHE 를 가역적으로 억제하는 새 벤질피페리딘 화합물과 그 용도.',
  inventors: inventor,
});

async function fill(agent: Agent, appId: string, sections: Record<string, string>): Promise<void> {
  const app = (await agent.patents()).applications.find((a) => a.id === appId)!;
  for (const [key, body] of Object.entries(sections)) {
    const cur = app.sections.find((s) => s.section === key);
    const r = await agent.call('PUT', PATENT_API.section(appId, key), { body, expectedVersion: cur?.version ?? 0 });
    if (r.status !== 200) throw new Error(`${key} 저장 ${r.status}: ${JSON.stringify(r.body)}`);
  }
}

const appOf = async (agent: Agent, id: string): Promise<PatentApplicationView> => (await agent.patents()).applications.find((a) => a.id === id)!;
const balanceOf = async (agent: Agent): Promise<number> => (await agent.patents()).balanceCents;

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const publicBefore = await countPublic();
  console.log(`실행 접미 ${suffix} · public 행 ${publicBefore}\n`);

  // 준비 — 교사 · 학급(모둠 2 · 정원 4) · 모둠 A 4명 · 모둠 B 2명 · 등기 · 같은 표적
  const tLogin = `t${suffix}f31`;
  const secret = createTeacher(tLogin);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: tLogin, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `특허 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const [teamA, teamB] = cls.teams as [TeacherClassDetail['teams'][number], TeacherClassDetail['teams'][number]];
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const A = ['a', 'b', 'c', 'd'].map((n) => new Agent(`A학생${n.toUpperCase()}`));
  const B = ['e', 'f'].map((n) => new Agent(`B학생${n.toUpperCase()}`));
  for (const [i, s] of [...A, ...B].entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `f${suffix}${'abcdef'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(i < 4 ? teamA.id : teamB.id))).status, 200);
  }
  const letters = (n: number) => suffix.slice(0, n).replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!).toUpperCase();
  const tickA = `P${letters(3)}`.slice(0, 4);
  const tickB = `Q${letters(3)}`.slice(0, 4);
  assert.equal((await A[0]!.call('POST', API.registration(teamA.id), { name: `특허가${suffix}`, ticker: tickA })).status, 201);
  assert.equal((await B[0]!.call('POST', API.registration(teamB.id), { name: `특허나${suffix}`, ticker: tickB })).status, 201);
  const boardA0 = await A[0]!.call<BoardResponse>('GET', API.board);
  const disease = boardA0.body.diseases.find((d) => d.targetId === 'ache-4ey7') ?? boardA0.body.diseases[0]!;
  for (const s of [A[0]!, B[0]!]) {
    await s.call('POST', API.picks, { diseaseId: disease.diseaseId, note: '시험' });
    assert.equal((await s.call('POST', API.target, { diseaseId: disease.diseaseId })).status, 200);
  }
  const bA = (await A[0]!.call<BoardResponse>('GET', API.board)).body;
  const bB = (await B[0]!.call<BoardResponse>('GET', API.board)).body;
  const tA = { id: teamA.id, classId: cls.id, revisionId: bA.program.revisionId, targetId: disease.targetId };
  const tB = { id: teamB.id, classId: cls.id, revisionId: bB.program.revisionId, targetId: disease.targetId };
  const aV = await seedCandidate(tA, A[0]!.userId, 1, V, '피리딘 변형', -11.2);
  const aW = await seedCandidate(tA, A[0]!.userId, 2, W, '플루오로 변형', -11.5);
  const aK = await seedCandidate(tA, A[1]!.userId, 1, K, '도네페질', -11.84);
  const aV2 = await seedCandidate(tA, A[1]!.userId, 2, V, '피리딘 변형 다시', -11.1);
  const aX = await seedCandidate(tA, A[2]!.userId, 1, X, '클로로 변형', -11.3);
  const aY = await seedCandidate(tA, A[3]!.userId, 1, Y, '메틸 변형', -11.4);
  const bV = await seedCandidate(tB, B[0]!.userId, 1, V, '피리딘 유도체', -11.0);
  console.log(`모둠 A ${tickA} · 모둠 B ${tickB} · 표적 ${disease.targetId} · 후보 A 6 · B 1\n`);

  // ① 후보
  const p0 = await A[2]!.patents();
  check('① 후보 — 2.2 특허 후보 6장 · 출원 칸 0/3 · 도네페질은 이미 알려진 물질 · 출원료 250,000 크리스타', () => {
    assert.equal(p0.candidates.length, 6);
    assert.equal(p0.used, 0);
    assert.equal(p0.maxPatentsPerTeam, 3);
    assert.equal(p0.feeCents, PATENT_FEE_CENTS);
    assert.equal(p0.candidates.find((c) => c.admetJobId === aK)?.known, true);
    assert.equal(p0.candidates.find((c) => c.admetJobId === aV)?.known, false);
    const steps = bA.steps.find((s) => s.id === '3.1');
    assert.ok(steps, '3.1 단계 줄');
  });

  // 1. 같은 후보 4명 동시
  const createRace = await Promise.all(A.map((s) => s.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: aV })));
  const appV = createRace.find((r) => r.status === 201)?.body.application;
  check('① 같은 후보로 넷이 한꺼번에 출원서 만들기 → 1건 201 · 3건 409 already_exists', () => {
    assert.equal(createRace.filter((r) => r.status === 201).length, 1, statuses(createRace));
    assert.equal(createRace.filter((r) => r.status === 409 && err(r)?.code === 'already_exists').length, 3, statuses(createRace));
    assert.ok(appV?.facts.flatSmiles, '평면 SMILES 를 서버가 채움');
    assert.equal(appV?.status, 'draft');
  });
  const sameMol = await A[1]!.call('POST', PATENT_API.applications, { admetJobId: aV2 });
  const notCand = await A[1]!.call('POST', PATENT_API.applications, { admetJobId: '00000000-0000-4000-8000-000000000000' });
  const otherTeam = await B[0]!.call('POST', PATENT_API.applications, { admetJobId: aW });
  check('① 같은 물질의 다른 후보 → 409(모둠 안 같은 물질 한 장) · 후보 아님 · 남의 모둠 후보 → 404', () => {
    assert.equal(sameMol.status, 409, JSON.stringify(sameMol.body));
    assert.equal(err(sameMol)?.code, 'already_exists');
    assert.equal(notCand.status, 404);
    assert.equal(otherTeam.status, 404);
  });

  // 2. 코드명
  const codeRace = await Promise.all(A.map((s, i) => s.call('PUT', PATENT_API.code(appV!.id), { codeName: `${tickA}-10${i + 1}`, expectedCode: null })));
  const afterCode = await appOf(A[0]!, appV!.id);
  const lower = await A[0]!.call('PUT', PATENT_API.code(appV!.id), { codeName: `${tickA.toLowerCase()}-102`, expectedCode: afterCode.codeName });
  const wrongTick = await A[0]!.call('PUT', PATENT_API.code(appV!.id), { codeName: `${tickB}-102`, expectedCode: afterCode.codeName });
  check('② 코드명 — 넷이 같은 expectedCode 로 한꺼번에 → 1건 200 · 3건 409 stale · 소문자 · 남의 티커 400', () => {
    assert.equal(codeRace.filter((r) => r.status === 200).length, 1, statuses(codeRace));
    assert.equal(codeRace.filter((r) => r.status === 409 && err(r)?.code === 'stale').length, 3, statuses(codeRace));
    assert.match(afterCode.codeName ?? '', new RegExp(`^${tickA}-10[1-4]$`));
    assert.equal(lower.status, 400);
    assert.equal(wrongTick.status, 400);
  });

  // 3. 칸 — 4명이 서로 다른 칸 동시 · 같은 칸 동시
  const sec = SECTIONS(tickA, A[0]!.userId);
  const keys = ['title', 'field', 'background', 'claim1'];
  const secRace = await Promise.all(A.map((s, i) => s.call<SectionSaveResponse>('PUT', PATENT_API.section(appV!.id, keys[i]!), { body: sec[keys[i]!], expectedVersion: 0 })));
  const sameSec = await Promise.all([A[0]!, A[1]!].map((s, i) => s.call('PUT', PATENT_API.section(appV!.id, 'summary'), { body: `요약 초안 ${i} — ACHE 를 억제하는 새 화합물`, expectedVersion: 0 })));
  const afterSec = await appOf(A[3]!, appV!.id);
  const loser = sameSec.find((r) => r.status === 409);
  check('③ 칸 — 넷이 다른 칸을 한꺼번에 → 모두 200 · 같은 칸 같은 판 → 1건 200 · 1건 409 stale + 지금 칸(⑪)', () => {
    assert.deepEqual(secRace.map((r) => r.status), [200, 200, 200, 200], statuses(secRace));
    for (const k of keys) assert.equal(afterSec.sections.find((s) => s.section === k)?.body, sec[k]);
    assert.deepEqual(sameSec.map((r) => r.status).sort(), [200, 409], statuses(sameSec));
    assert.equal(err(loser!)?.code, 'stale');
    assert.match(err(loser!)?.section?.body ?? '', /요약 초안/);
    assert.ok(afterSec.version >= 7, `판 ${afterSec.version}`);
  });
  const badChoice = await A[0]!.call('PUT', PATENT_API.section(appV!.id, 'mech_action'), { body: 'magic', expectedVersion: 0 });
  const outsider = await A[0]!.call('PUT', PATENT_API.section(appV!.id, 'inventors'), { body: B[0]!.userId, expectedVersion: 0 });
  const noSec = await A[0]!.call('PUT', PATENT_API.section(appV!.id, 'secret'), { body: 'x', expectedVersion: 0 });
  check('③ 칸 — 고르는 칸 밖 값 400 · 남의 모둠원 발명자 400 · 없는 칸 404', () => {
    assert.equal(badChoice.status, 400);
    assert.equal(outsider.status, 400);
    assert.equal(noSec.status, 404);
  });

  // 4. 심사 — 규칙 fail(빈 칸) → 보완, LLM 없음
  const v1 = (await appOf(A[0]!, appV!.id)).version;
  const ruleFail = await A[0]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appV!.id), { docVersion: v1 });
  const afterRule = await appOf(A[0]!, appV!.id);
  check('④ 심사 — 빈 칸이 있으면 규칙에서 보완(LLM 부르지 않음 · 상한에 안 셈)', () => {
    assert.equal(ruleFail.status, 201, JSON.stringify(ruleFail.body));
    assert.equal(ruleFail.body.review.verdict, 'revise');
    assert.equal(ruleFail.body.review.stage, 'rules');
    assert.ok(ruleFail.body.review.ruleFindings.some((f) => f.id === 'format_mech_how' && f.status === 'fail'));
    assert.equal(afterRule.status, 'revise');
  });
  // 칸을 모두 채우고 다시
  await fill(A[1]!, appV!.id, { ...sec, summary: sec.summary! });
  const pre = await A[2]!.call<PatentPrecheckResponse>('POST', PATENT_API.precheck(appV!.id));
  const stale = await A[2]!.call('POST', PATENT_API.review(appV!.id), { docVersion: pre.body.docVersion - 1 });
  const reviewRace = await Promise.all(A.map((s) => s.call<ReviewRequestResponse>('POST', PATENT_API.review(appV!.id), { docVersion: pre.body.docVersion })));
  const afterReview = await A[3]!.patents();
  const llmCalls = await withDb((c) => c.query<{ n: number }>(`select count(*)::int n from web.doc_reviews where doc_id = $1`, [appV!.id]));
  check('④ 심사 — 제출 전 점검 fail 0 · 낡은 판 409 · 넷이 같은 판을 한꺼번에 → 심사 1건(⑫) · LLM 꺼짐이면 pending · 심사 중 = 상한에 셈', () => {
    assert.equal(pre.status, 200);
    assert.deepEqual(pre.body.findings.filter((f) => f.status === 'fail').map((f) => f.id), []);
    assert.equal(stale.status, 409);
    const ids = new Set(reviewRace.map((r) => r.body.review?.id));
    assert.equal(ids.size, 1, statuses(reviewRace));
    assert.equal(reviewRace.filter((r) => r.status === 201).length, 1, statuses(reviewRace));
    assert.equal(reviewRace[0]!.body.review.verdict, 'pending');
    assert.equal(afterReview.applications.find((a) => a.id === appV!.id)?.status, 'reviewing');
    assert.equal(afterReview.used, 1);
    assert.equal(llmCalls.rows[0]!.n, 2);
  });
  const codeWhileReview = await A[0]!.call('PUT', PATENT_API.code(appV!.id), { codeName: `${tickA}-199`, expectedCode: afterCode.codeName });
  const sectionWhileReview = await A[0]!.call('PUT', PATENT_API.section(appV!.id, 'summary'), { body: '심사 중 고친 요약 — ACHE 억제 새 화합물', expectedVersion: (await appOf(A[0]!, appV!.id)).sections.find((s) => s.section === 'summary')!.version });
  check('④ 심사 중 — 코드명은 409(심사 대상 고정) · 칸은 고칠 수 있음(심사 뒤 바뀜)', () => {
    assert.equal(codeWhileReview.status, 409);
    assert.equal(sectionWhileReview.status, 200, JSON.stringify(sectionWhileReview.body));
  });

  // 이미 알려진 물질 → 거절
  const appK = (await A[1]!.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: aK })).body.application;
  await A[1]!.call('PUT', PATENT_API.code(appK.id), { codeName: `${tickA}-201`, expectedCode: null });
  await fill(A[1]!, appK.id, SECTIONS(tickA, A[1]!.userId));
  const balBeforeK = await balanceOf(A[1]!);
  const revK = await A[1]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appK.id), { docVersion: (await appOf(A[1]!, appK.id)).version });
  const afterK = await appOf(A[1]!, appK.id);
  check('④ 신규성 — 도네페질(기준 리간드 · 승인약) → 거절 · 이미 알려진 물질 · 과금 없음', () => {
    assert.equal(appK.facts.known, true);
    assert.equal(revK.body.review.verdict, 'reject');
    assert.ok(revK.body.review.ruleFindings.some((f) => f.id === 'novelty' && f.status === 'fail' && f.severity === 'reject'));
    assert.equal(afterK.status, 'rejected');
    assert.equal(afterK.rejectReason, 'known');
  });
  const balAfterK = await balanceOf(A[1]!);
  check('④ 거절 — 잔액 그대로', () => assert.equal(balAfterK, balBeforeK));

  // 상한 — 학급 상한을 1 로(교사 설정 화면이 아직 없어 시험 연결로) → 두 번째 출원서는 보완(limit)
  const appW = (await A[2]!.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: aW })).body.application;
  await A[2]!.call('PUT', PATENT_API.code(appW.id), { codeName: `${tickA}-301`, expectedCode: null });
  await fill(A[2]!, appW.id, SECTIONS(tickA, A[2]!.userId));
  await withDb((c) => c.query('update web.classes set max_patents_per_team = 1 where id = $1', [cls.id]));
  const revW = await A[2]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appW.id), { docVersion: (await appOf(A[2]!, appW.id)).version });
  await withDb((c) => c.query('update web.classes set max_patents_per_team = 3 where id = $1', [cls.id]));
  check('④ 상한 — 받아들여짐 + 심사 중이 상한이면 보완(limit · teams 잠금 안에서 셈)', () => {
    assert.equal(revW.body.review.verdict, 'revise', JSON.stringify(revW.body));
    assert.ok(revW.body.review.ruleFindings.some((f) => f.id === 'limit' && f.status === 'fail'));
  });

  // 모둠 B 도 같은 분자 V 를 심사 중으로
  const appBV = (await B[0]!.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: bV })).body.application;
  await B[0]!.call('PUT', PATENT_API.code(appBV.id), { codeName: `${tickB}-101`, expectedCode: null });
  await fill(B[1]!, appBV.id, SECTIONS(tickB, B[0]!.userId));
  const revBV = await B[0]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appBV.id), { docVersion: (await appOf(B[0]!, appBV.id)).version });
  assert.equal(revBV.body.review.verdict, 'pending', JSON.stringify(revBV.body));

  // 5. 두 모둠 동시 받아들임 — 교사가 두 pending 심사를 한꺼번에 통과
  const balA0 = await balanceOf(A[0]!);
  const balB0 = await balanceOf(B[0]!);
  const eventsBefore = await withDb((c) => c.query<{ n: number }>(`select count(*)::int n from web.board_events where class_id = $1 and kind = 'patent'`, [cls.id]));
  const decide = await Promise.all([reviewRace[0]!.body.review.id, revBV.body.review.id].map((id) => teacher.call('POST', `/api/teacher/reviews/${id}/decision`, { verdict: 'pass', note: 'e2e 동시 받아들임' })));
  await new Promise((r) => setTimeout(r, 300));
  const pA = await A[0]!.patents();
  const pB = await B[0]!.patents();
  const rowsV = await withDb((c) => c.query<{ team_id: string; status: string; code_name: string }>(`select team_id, status, code_name from web.patents where class_id = $1 and flat_smiles = $2`, [cls.id, appV!.facts.flatSmiles]));
  const winnerIsA = rowsV.rows[0]?.team_id === teamA.id;
  const [win, lose] = winnerIsA ? [pA, pB] : [pB, pA];
  const [winApp, loseApp] = winnerIsA ? [appV!.id, appBV.id] : [appBV.id, appV!.id];
  const [winBal0, loseBal0] = winnerIsA ? [balA0, balB0] : [balB0, balA0];
  const events = await withDb((c) => c.query<{ headline: string; public: Record<string, unknown>; team_id: string }>(`select headline, public, team_id from web.board_events where class_id = $1 and kind = 'patent'`, [cls.id]));
  const ledgerFee = await withDb((c) => c.query<{ team_id: string; n: number }>(`select team_id, count(*)::int n from web.ledger where kind = 'patent_fee' and team_id = any($1::uuid[]) group by team_id`, [[teamA.id, teamB.id]]));
  check('⑤ 두 모둠 같은 분자 동시 받아들임(⑩) → 원장 1줄 · 출원료 1번(먼저 커밋한 모둠) · 늦은 쪽 거절 · 이미 있음(과금 없음)', () => {
    assert.deepEqual(decide.map((r) => r.status), [200, 200], statuses(decide));
    assert.equal(rowsV.rows.length, 1);
    assert.equal(rowsV.rows[0]!.status, 'active');
    assert.equal(win.applications.find((a) => a.id === winApp)?.status, 'accepted');
    const lost = lose.applications.find((a) => a.id === loseApp)!;
    assert.equal(lost.status, 'rejected');
    assert.equal(lost.rejectReason, 'duplicate');
    assert.equal(lost.review?.verdict, 'reject');
    assert.ok(lost.review?.ruleFindings.some((f) => f.id === 'class_duplicate' && f.status === 'fail'));
    assert.equal(win.balanceCents, winBal0 - PATENT_FEE_CENTS);
    assert.equal(lose.balanceCents, loseBal0);
    assert.deepEqual(ledgerFee.rows.map((r) => [r.team_id, r.n]), [[winnerIsA ? teamA.id : teamB.id, 1]]);
  });
  check('⑤ 원장 5.04 — 등록 줄은 학급 공개 · 빨간 줄(거절 · 이미 있음)은 늦은 모둠 화면에만 · 우리 줄 표시', () => {
    assert.equal(win.ledger.filter((r) => r.kind === 'patent').length, 1);
    assert.equal(win.ledger.filter((r) => r.kind === 'rejected').length, 0);
    assert.equal(lose.ledger.filter((r) => r.kind === 'rejected').length, 1);
    assert.equal(win.ledger.find((r) => r.kind === 'patent')?.mine, true);
    assert.equal(lose.ledger.find((r) => r.kind === 'patent')?.mine, false);
    assert.match(win.ledger[0]!.patentNo ?? '', /^KR-\d{2}-0001$/);
    assert.equal(win.ledger[0]!.canonicalSmiles, V);
  });
  check('⑤ 전광판 — patent 소식 1건 · 공개 칸에 SMILES · 물성 없음 · 규칙 문구', () => {
    assert.equal(events.rows.length, eventsBefore.rows[0]!.n + 1);
    const e = events.rows[0]!;
    assert.match(e.headline, /물질특허 등록/);
    assert.ok(!JSON.stringify(e.public).includes('c1'));
    assert.deepEqual(Object.keys(e.public).sort(), ['codeName', 'disease', 'patentNo']);
  });
  const preWin = await (winnerIsA ? A[0]! : B[0]!).call<PatentPrecheckResponse>('POST', PATENT_API.precheck(winApp));
  check('⑤ 받아들여진 출원서의 규칙 점검은 자기 특허를 학급 중복으로 세지 않는다', () => {
    assert.equal(preWin.status, 200);
    assert.equal(preWin.body.findings.find((f) => f.id === 'class_duplicate')?.status, 'ok');
  });
  const ledgerT = await teacher.call<PatentLedgerResponse>('GET', `${PATENT_API.ledger}?classId=${cls.id}`);
  check('⑤ 교사 원장 — 등록 줄만(빨간 줄은 모둠 화면 전용)', () => {
    assert.equal(ledgerT.status, 200);
    assert.equal(ledgerT.body.rows.length, 1);
  });

  // 6. 코드명 잠금 · DB 키
  const winner = winnerIsA ? A[0]! : B[0]!;
  const winView = await appOf(winner, winApp);
  const codeAfter = await winner.call('PUT', PATENT_API.code(winApp), { codeName: `${winnerIsA ? tickA : tickB}-777`, expectedCode: winView.codeName });
  const dbCode = await withDb(async (c) => {
    try {
      await c.query('update web.patent_applications set code_name = $2 where id = $1', [winApp, `${winnerIsA ? tickA : tickB}-778`]);
      return 'updated';
    } catch (error) {
      return `${(error as { code?: string }).code}:${(error as { constraint?: string }).constraint ?? ''}`;
    }
  });
  const dbDup = await withDb(async (c) => {
    try {
      await c.query('begin');
      await c.query(
        `insert into web.patents (class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
         select class_id, 99, 'KR-00-0099', team_id, program_revision_id, id, admet_job_id, flat_smiles, canonical_smiles, code_name, 0 from web.patent_applications where id = $1`,
        [loseApp],
      );
      return 'inserted';
    } catch (error) {
      return `${(error as { code?: string }).code}:${(error as { constraint?: string }).constraint ?? ''}`;
    } finally {
      await c.query('rollback');
    }
  });
  check('⑥ 받아들여진 코드명은 못 바꿈(서버 409 · DB 복합 외래 키) · 같은 물질 두 번째 유효 특허는 DB 부분 고유 키가 거절', () => {
    assert.equal(codeAfter.status, 409);
    assert.equal(dbCode, '23503:patents_application_code_fkey');
    assert.equal(dbDup, '23505:patents_class_flat_active_key');
  });

  // 포기 → 슬롯 반환 · 환급 없음 · 소식 없음 → 진 모둠이 새 출원서로 등록
  const winBalBefore = (await winner.patents()).balanceCents;
  const abandon = await winner.call('POST', PATENT_API.abandon(winApp));
  const afterAb = await winner.patents();
  const evAfterAb = await withDb((c) => c.query<{ n: number }>(`select count(*)::int n from web.board_events where class_id = $1 and kind = 'patent'`, [cls.id]));
  check('⑥ 포기 — 원장 줄은 포기로 · 슬롯 반환 · 환급 없음 · 전광판 소식 없음', () => {
    assert.equal(abandon.status, 200, JSON.stringify(abandon.body));
    assert.equal(afterAb.used, 0);
    assert.equal(afterAb.balanceCents, winBalBefore);
    assert.equal(afterAb.ledger.find((r) => r.kind === 'patent')?.status, 'abandoned');
    assert.equal(evAfterAb.rows[0]!.n, events.rows.length);
  });
  const loserAgent = winnerIsA ? B[0]! : A[3]!;
  const loserTick = winnerIsA ? tickB : tickA;
  const loserCand = winnerIsA ? bV : aV2;
  const re = await loserAgent.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: loserCand });
  let reOk = false;
  if (re.status === 201) {
    const id = re.body.application.id;
    await loserAgent.call('PUT', PATENT_API.code(id), { codeName: `${loserTick}-401`, expectedCode: null });
    await fill(loserAgent, id, SECTIONS(loserTick, loserAgent.userId));
    const r2 = await loserAgent.call<ReviewRequestResponse>('POST', PATENT_API.review(id), { docVersion: (await appOf(loserAgent, id)).version });
    const d2 = await teacher.call('POST', `/api/teacher/reviews/${r2.body.review.id}/decision`, { verdict: 'pass', note: 'e2e 포기 뒤 다시' });
    reOk = d2.status === 200 && (await appOf(loserAgent, id)).status === 'accepted';
  }
  const ledgerEnd = await A[0]!.call<PatentLedgerResponse>('GET', PATENT_API.ledger);
  check('⑥ 포기한 분자는 다른 모둠이 다시 낼 수 있다 → 등록 · 학급 순서 2', () => {
    assert.equal(re.status, 201, JSON.stringify(re.body));
    assert.ok(reOk);
    const active = ledgerEnd.body.rows.filter((r) => r.kind === 'patent' && r.status === 'active');
    assert.equal(active.length, 1);
    assert.equal(active[0]!.classSeq, 2);
  });

  // 8-1. 앞 판 심사 정정 · 교사 수동 거절 — 출원서 상태는 마지막 심사가 정한다.
  const appX = (await A[2]!.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: aX })).body.application;
  await A[2]!.call('PUT', PATENT_API.code(appX.id), { codeName: `${tickA}-601`, expectedCode: null });
  const secX = SECTIONS(tickA, A[2]!.userId);
  const { effect: effectX, ...secXNoEffect } = secX;
  await fill(A[2]!, appX.id, secXNoEffect);
  const rX1 = await A[2]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appX.id), { docVersion: (await appOf(A[2]!, appX.id)).version });
  await fill(A[2]!, appX.id, { effect: effectX! });
  const rX2 = await A[2]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appX.id), { docVersion: (await appOf(A[2]!, appX.id)).version });
  const balX0 = await balanceOf(A[2]!);
  const fixOld = await teacher.call('POST', `/api/teacher/reviews/${rX1.body.review.id}/decision`, { verdict: 'pass', note: 'e2e 앞 판 정정' });
  const afterFixOld = await appOf(A[2]!, appX.id);
  const patentX = await withDb((c) => c.query<{ n: number }>('select count(*)::int n from web.patents where application_id = $1', [appX.id]));
  const balX1 = await balanceOf(A[2]!);
  const manualReject = await teacher.call('POST', `/api/teacher/reviews/${rX2.body.review.id}/decision`, { verdict: 'reject', note: 'e2e 교사 수동 거절' });
  const afterReject = await appOf(A[2]!, appX.id);
  check('⑧ 앞 판 심사를 통과로 정정해도 새 판 심사가 있으면 상태 · 과금 · 등재 그대로 · 교사 수동 거절은 이유 없음', () => {
    assert.equal(rX1.body.review.verdict, 'revise', JSON.stringify(rX1.body));
    assert.equal(rX2.body.review.verdict, 'pending', JSON.stringify(rX2.body));
    assert.equal(fixOld.status, 200, JSON.stringify(fixOld.body));
    assert.equal(afterFixOld.status, 'reviewing');
    assert.equal(patentX.rows[0]!.n, 0);
    assert.equal(balX1, balX0);
    assert.equal(manualReject.status, 200, JSON.stringify(manualReject.body));
    assert.equal(afterReject.status, 'rejected');
    assert.equal(afterReject.rejectReason, null);
  });

  // 거두기(초안)
  const withdraw = await A[2]!.call('POST', PATENT_API.abandon(appW.id));
  const withdrawAccepted = await A[2]!.call('POST', PATENT_API.abandon(appK.id));
  check('거두기 — 보완 출원서는 거둘 수 있고, 거절된 출원서는 409', () => {
    assert.equal(withdraw.status, 200);
    assert.equal(withdrawAccepted.status, 409);
  });

  // 8-2. 심사 중에 표적을 바꿈 → 받아들임 단계에서 보완(등록 · 과금 없음) · 옛 표적 버전 출원서는 새 심사 409.
  const appY = (await A[3]!.call<{ application: PatentApplicationView }>('POST', PATENT_API.applications, { admetJobId: aY })).body.application;
  await A[3]!.call('PUT', PATENT_API.code(appY.id), { codeName: `${tickA}-501`, expectedCode: null });
  await fill(A[3]!, appY.id, SECTIONS(tickA, A[3]!.userId));
  const rY = await A[3]!.call<ReviewRequestResponse>('POST', PATENT_API.review(appY.id), { docVersion: (await appOf(A[3]!, appY.id)).version });
  const otherDisease = bA.diseases.find((d) => d.targetId !== disease.targetId)!;
  await A[0]!.call('POST', API.picks, { diseaseId: otherDisease.diseaseId, note: '시험 — 표적 바꾸기' });
  const switched = await A[0]!.call('POST', API.target, { diseaseId: otherDisease.diseaseId });
  const balY0 = await balanceOf(A[3]!);
  const passY = await teacher.call('POST', `/api/teacher/reviews/${rY.body.review.id}/decision`, { verdict: 'pass', note: 'e2e 표적 바뀐 뒤 통과' });
  const afterY = await appOf(A[3]!, appY.id);
  const patentY = await withDb((c) => c.query<{ n: number }>('select count(*)::int n from web.patents where application_id = $1', [appY.id]));
  const balY1 = await balanceOf(A[3]!);
  const ySummary = afterY.sections.find((s) => s.section === 'summary')!;
  await A[3]!.call('PUT', PATENT_API.section(appY.id, 'summary'), { body: `${ySummary.body} 다시`, expectedVersion: ySummary.version });
  const reY = await A[3]!.call('POST', PATENT_API.review(appY.id), { docVersion: (await appOf(A[3]!, appY.id)).version });
  check('⑧ 심사 중 표적을 바꾸면 받아들임 단계에서 보완(등록 · 과금 없음) · 옛 표적 버전 출원서의 새 심사는 409', () => {
    assert.equal(rY.body.review.verdict, 'pending', JSON.stringify(rY.body));
    assert.equal(switched.status, 200, JSON.stringify(switched.body));
    assert.equal(passY.status, 200, JSON.stringify(passY.body));
    assert.equal(afterY.current, false);
    assert.equal(afterY.status, 'revise');
    assert.equal(afterY.review?.verdict, 'revise');
    assert.ok(afterY.review?.ruleFindings.some((f) => f.id === 'revision' && f.status === 'fail'));
    assert.equal(patentY.rows[0]!.n, 0);
    assert.equal(balY1, balY0);
    assert.equal(reY.status, 409, JSON.stringify(reY.body));
    assert.equal(err(reY)?.code, 'stale');
  });

  const publicAfter = await countPublic();
  check('⑨ public 표 행 수 그대로', () => assert.equal(publicAfter, publicBefore));

  // 화면 점검용(선택) — 원장에 빨간 줄 · 등록 줄이 함께 있는 모둠의 학생 로그인을 남긴다(로컬 시험 계정).
  if (process.env.E2E_PRINT_LOGIN === '1') console.log(`\n화면 점검 로그인 — ${loserAgent.name}: f${suffix}${winnerIsA ? 'e' : 'd'} / ${password}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
