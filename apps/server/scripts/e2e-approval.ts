/**
 * 4.2 최종 허가(F42) 점검 — 떠 있는 로컬 서버(HTTP · WebSocket) + 같은 DB(crista_web)로 4.1 3상 통과 상태를 직접 만든다.
 *
 *   WEB_PORT=3407 LLM_DISABLED=1 node tools/with-local-env.mjs node apps/server/src/index.ts     (다른 터미널)
 *   WEB_PORT=3407 npm run e2e:approval                     — LLM 끈 서버: pending → 교사 수동 통과 경로
 *   WEB_PORT=3407 E2E_REAL_LLM=1 npm run e2e:approval      — LLM 켠 서버: 실제 Claude 심사 1건(비용 — 필요할 때만)
 *   WEB_PORT=3407 E2E_SEED_ONLY=1 npm run e2e:approval     — 화면 점검용: 3상 통과 상태만 만들고 로그인 정보(JSON)를 찍고 끝
 *
 * 1. 교사 → 학급(모둠 2) → 모둠 A 학생 4명 · 모둠 B 학생 1명 가입 · 입사 · 등기.
 * 2. 모둠 A 를 1.1 → 4.1 3상 통과까지 DB 로 만든다(작업 · 특허 · 계획서 · 동물실험 · IND · 임상 4시도(2상 1번 보류) · 원장).
 * 3. 4인 동시 조작(§7.4 꼴): 브랜드 동시 저장(한 명만 · 나머지 409 stale) · 학급 브랜드 유일(다른 모둠 409) · 포장 동시 저장(한 명만) ·
 *    서로 다른 칸 동시 저장(모두) · 같은 칸 동시 저장(한 명만) · 접수 동시 4번(과금 1번 · 나머지 409).
 * 4. 규칙: 욕설 · 실재 약 이름 400 · 포장 ≠ 제형이면 LLM 없이 보완 · 3상 전에는 심사 409.
 * 5. 허가: 게임 일 처리기 → approved · 허가증 · 9단계 4.2 완료 · 전광판 'approval'(브랜드 공개 · 성분 · 칸 없음) · 다른 모둠 학급 WS.
 * 6. 영수증: 단계 줄 · 2상 보류 빨간 줄 · 허가 수수료 · 학습 · 투자 입금 따로 · 합계 = 원장.
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미).
 */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import WebSocket from 'ws';
import {
  API,
  APPROVAL_API,
  APPROVAL_FEE_CENTS,
  REVIEW_API,
  type ApprovalResponse,
  type BoardResponse,
  type DocReviewView,
  type MeResponse,
  type ServerMessage,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3407}`;
const REAL = process.env.E2E_REAL_LLM === '1';
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

function openWs(agent: Agent): Promise<{ messages: ServerMessage[]; close: () => void }> {
  const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}${API.ws}`, { headers: { cookie: agent.cookie ?? '', origin: BASE } });
  const messages: ServerMessage[] = [];
  ws.on('message', (data) => messages.push(JSON.parse(String(data)) as ServerMessage));
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve({ messages, close: () => ws.close() }));
    ws.once('error', reject);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, ms: number, label: string): Promise<T> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const hit = await fn();
    if (hit !== undefined) return hit;
    await sleep(300);
  }
  throw new Error(`${label} — ${ms}ms 안에 오지 않았습니다.`);
}
const statuses = (rs: Array<{ status: number }>) => rs.map((r) => r.status).sort();

/** 모둠 A 를 4.1 3상 통과 상태로(crista_web · web 스키마만). */
async function seedPhase3(db: pg.Client, t: { teamId: string; classId: string; users: string[]; ticker: string }): Promise<{ revisionId: string; patentId: string; trialIds: string[] }> {
  const q = async <R extends pg.QueryResultRow = Record<string, unknown>>(sql: string, args: unknown[] = []) => (await db.query<R>(sql, args)).rows;
  const [rev] = await q<{ id: string }>('select current_revision_id as id from web.programs where team_id = $1', [t.teamId]);
  const revisionId = rev!.id;
  const u = t.users[0]!;
  await q(`update web.program_revisions set disease_id = 'MONDO_0004975', target_id = 'ache-4ey7', target_set_at = now(), target_set_by = $2 where id = $1`, [revisionId, u]);
  const job = async (step: string, stage: number, facility: string, extra: Record<string, unknown> = {}) => {
    const cols = ['team_id', 'class_id', 'created_by', 'request_id', 'step', 'stage', 'facility', 'params', 'input_summary', 'target_id', 'program_revision_id', 'status', 'progress', 'source', 'cost_cents', 'finished_at', ...Object.keys(extra)];
    const vals = [t.teamId, t.classId, u, `e2e${suffix}${randomBytes(4).toString('hex')}`, step, stage, facility, '{}', `e2e ${step}`, 'ache-4ey7', revisionId, 'succeeded', 1, step === '3.2' ? 'simulation' : 'fixture', 5_000_000, new Date(), ...Object.values(extra)];
    const [row] = await q<{ id: string }>(`insert into web.jobs (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`, vals);
    await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, job_id, created_by) values ($1, $2, 'paid_work', $3, $4, $5)`, [t.teamId, step === '3.2' ? -8_000_000 : -5_000_000, `job:${row!.id}`, row!.id, u]);
    return row!.id;
  };
  const smiles = `CC(=O)Nc1ccc(O)cc1C${suffix.replace(/[^0-9]/g, '1')}`;
  await job('1.2', 2, 'htvs', { result: JSON.stringify({ funnel: { total: 220, library: 220, mwTpsa: 160, ro5: 120, alerts: 90, selected: 20 } }) });
  const dock = await job('2.1', 3, 'docking', { affinity_kcal: -12.4, canonical_smiles: smiles, smiles });
  await job('2.1', 3, 'docking', { affinity_kcal: -9.8, canonical_smiles: 'CCO', smiles: 'CCO' });
  const admet = await job('2.2', 4, 'admet', { parent_job_id: dock, canonical_smiles: smiles, smiles });
  await q(`insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 1, 'legacy_lead')`, [revisionId, t.teamId, admet, u]);
  const code = `${t.ticker}-101`;
  const [app] = await q<{ id: string }>(
    `insert into web.patent_applications (program_revision_id, team_id, class_id, admet_job_id, code_name, status, canonical_smiles, flat_smiles, created_by)
     values ($1, $2, $3, $4, $5, 'accepted', $6, $6, $7) returning id`,
    [revisionId, t.teamId, t.classId, admet, code, smiles, u],
  );
  const [pat] = await q<{ id: string }>(
    `insert into web.patents (class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
     values ($1, coalesce((select max(class_seq) from web.patents where class_id = $1), 0) + 1, $2, $3, $4, $5, $6, $7, $7, $8, 12) returning id`,
    [t.classId, `KR-${suffix}-0001`, t.teamId, revisionId, app!.id, admet, smiles, code],
  );
  const patentId = pat!.id;
  await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, ref_type, ref_id) values ($1, -5000000, 'patent_fee', $2, 'patent', $3)`, [t.teamId, `patent:${app!.id}`, patentId]);
  const [prot] = await q<{ id: string }>(
    `insert into web.iacuc_protocols (program_revision_id, team_id, status, approved_version, approved_at, approved_snapshot) values ($1, $2, 'approved', 1, now(), '{}') returning id`,
    [revisionId, t.teamId],
  );
  await q('insert into web.iacuc_protocol_patents (protocol_id, patent_id, team_id) values ($1, $2, $3)', [prot!.id, patentId, t.teamId]);
  const animal = {
    kind: 'animal_study', level: 'standard', animalsUsed: 82, pk: { oralBioavailabilityPct: 48, brainPlasmaRatio: 0.6 }, efficacyVsReferencePct: 92,
    noaelMgPerKgDay: { rat: 30, dog: 10 }, hedMgPerKg: 5.4, safetyFactor: 10, mrsdMgByForm: { oral: 54, iv: 32, transdermal: 40 }, findings: ['qt'], painGrade: 'C', humaneEndpoints: 1,
  };
  await job('3.2', 5, 'animal_study', { patent_id: patentId, protocol_id: prot!.id, design_key: 'animal:standard', ends_game_day: 50, result: JSON.stringify(animal) });
  await job('3.2', 5, 'alt_assay', { patent_id: patentId, protocol_id: prot!.id, design_key: 'alt:herg', ends_game_day: 44, result: JSON.stringify({ kind: 'alt_assay', assay: 'herg', band: 'medium' }) });
  await q('update web.program_revisions set lead_job_id = $2, lead_set_at = now(), lead_set_by = $3, lead_version = lead_version + 1 where id = $1', [revisionId, admet, u]);
  const [ind] = await q<{ id: string }>(
    `insert into web.ind_applications (program_revision_id, team_id, patent_id, form, dose_mg, population, endpoint, status, submitted_at, submitted_game_day, decide_game_day, decided_game_day, score_input, e_score, s_score, created_by)
     values ($1, $2, $3, 'oral', 50, '경도 알츠하이머 성인', 'ADAS-Cog 12주 변화', 'approved', now(), 60, 90, 90, '{}', 62, 71, $4) returning id`,
    [revisionId, t.teamId, patentId, u],
  );
  await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, ref_type, ref_id) values ($1, -10000000, 'ind_fee', $2, 'ind_application', $3)`, [t.teamId, `ind:${ind!.id}`, ind!.id]);
  const trial = async (phase: string, attempt: number, verdict: 'pass' | 'held', from: number, to: number) => {
    const [row] = await q<{ id: string }>(
      `insert into web.clinical_trials (class_id, team_id, program_revision_id, ind_application_id, patent_id, phase, attempt, route, form, dose_mg, population, endpoint, status,
                                        target_n, min_n, opened_game_day, accrued_through_day, facts, enrolled_at_start, started_game_day, ends_game_day, decided_game_day, verdict, hold_kind, cost_paid_cents)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'oral', 50, '경도 알츠하이머 성인', 'ADAS-Cog 12주 변화', $9, 100, 80, $10, $10, '{}', 90, $10, $11, $11, $12, $13, 1000)
       returning id`,
      [t.classId, t.teamId, revisionId, ind!.id, patentId, phase, attempt, attempt > 1 ? 'same' : phase === 'phase1' ? 'first' : 'next', verdict === 'pass' ? 'completed' : 'held', from, to, verdict, verdict === 'held' ? 'efficacy' : null],
    );
    await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, ref_type, ref_id) values ($1, $2, 'paid_work', $3, 'clinical_trial', $4)`, [t.teamId, phase === 'phase1' ? -6_000_000 : phase === 'phase2' ? -12_000_000 : -24_000_000, `trial:${row!.id}:start`, row!.id]);
    await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key, ref_type, ref_id) values ($1, -200000, 'paid_work', $2, 'clinical_recruit', $3)`, [t.teamId, `trial:${row!.id}:recruit:1`, row!.id]);
    return row!.id;
  };
  const trialIds = [await trial('phase1', 1, 'pass', 95, 185), await trial('phase2', 1, 'held', 190, 370), await trial('phase2', 2, 'pass', 375, 555), await trial('phase3', 1, 'pass', 560, 920)];
  await q(`insert into web.ledger (team_id, amount_cents, kind, idem_key) values ($1, 400000, 'learn_stipend', $2), ($1, 400000, 'learn_stipend', $3), ($1, 60000000, 'pitch_series_a', $4)`, [t.teamId, `e2e:stipend:1:${suffix}`, `e2e:stipend:2:${suffix}`, `e2e:pitch:${suffix}`]);
  return { revisionId, patentId, trialIds };
}

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}${API.health}`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const db = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-approval' });
  await db.connect();

  // ── 1. 계정 ──
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', `ta${suffix}`, '--name', `허가 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  const secret = JSON.parse(run.stdout.trim()) as { userId: string; password: string };
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: `ta${suffix}`, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `허가 점검 ${suffix}`, teamCount: 2, maxStudents: 10 })).body;
  const [teamA, teamB] = [cls.teams[0]!, cls.teams[1]!];
  const A = [0, 1, 2, 3].map((i) => new Agent(`A${i + 1}`));
  const users: string[] = [];
  for (const [i, s] of A.entries()) {
    const r = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `sa${suffix}${i}`, displayName: `허가${i + 1}`, password: `pw-${suffix}-1234` });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    users.push(r.body.account.userId);
    assert.equal((await s.call('POST', API.join(teamA.id))).status, 200);
  }
  const tickA = `A${suffix.replace(/[^a-z]/g, 'q').toUpperCase()}`.slice(0, 4).padEnd(3, 'Q');
  const regA = await A[0]!.call('POST', API.registration(teamA.id), { name: `허가제약${suffix}`.slice(0, 14), ticker: tickA });
  assert.equal(regA.status, 201, JSON.stringify(regA.body));
  const B = new Agent('B1');
  assert.equal((await B.call('POST', API.signup, { classCode: cls.code, loginId: `sb${suffix}0`, displayName: '경쟁1', password: `pw-${suffix}-1234` })).status, 201);
  assert.equal((await B.call('POST', API.join(teamB.id))).status, 200);
  const tickB = `B${suffix.replace(/[^a-z]/g, 'r').toUpperCase()}`.slice(0, 4).padEnd(3, 'R');
  assert.equal((await B.call('POST', API.registration(teamB.id), { name: `경쟁바이오${suffix}`.slice(0, 14), ticker: tickB })).status, 201);
  await A[0]!.call('GET', API.board);
  await B.call('GET', API.board);

  await check('3상 전 — GET 은 잠김 이유 · 브랜드 초안은 저장되지만 심사는 409', async () => {
    const g = await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get);
    assert.equal(g.status, 200, JSON.stringify(g.body));
    assert.equal(g.body.phase3, null);
    assert.ok(g.body.lockedReason);
    const r = await A[0]!.call('POST', APPROVAL_API.review);
    assert.equal(r.status, 409);
  });

  // ── 2. 3상 통과 상태 ──
  const seeded = await seedPhase3(db, { teamId: teamA.id, classId: cls.id, users, ticker: tickA });
  if (process.env.E2E_SEED_ONLY === '1') {
    // 화면 점검용 — 3상 통과 상태만 만들고 로그인 정보를 남긴 채 끝낸다(브라우저로 ①~⑤ 를 직접 누른다).
    console.log(JSON.stringify({ classCode: cls.code, teacher: { loginId: `ta${suffix}`, password: secret.password }, students: [0, 1, 2, 3].map((i) => ({ loginId: `sa${suffix}${i}`, password: `pw-${suffix}-1234` })), revisionId: seeded.revisionId }));
    await db.end();
    process.exit(0);
  }
  const wsB = await openWs(B);
  const wsA = await openWs(A[1]!);

  await check('3상 통과 — phase3(경구 50 mg) · NDA 요약이 1.1~4.1 꼬리표로 · SMILES 없음', async () => {
    const g = await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get);
    assert.equal(g.body.phase3?.form, 'oral');
    assert.equal(g.body.phase3?.doseMg, 50);
    assert.equal(g.body.phase3?.trialId, seeded.trialIds[3]);
    const keys = g.body.summary.map((r) => r.key);
    for (const k of ['indication', 'target', 'code', 'affinity', 'patent', 'preclinical', 'trials']) assert.ok(keys.includes(k), k);
    const steps = new Set(g.body.summary.flatMap((r) => r.steps));
    for (const s of ['1.1', '2.1', '3.1', '3.2', '3.3', '4.1']) assert.ok(steps.has(s as never), s);
    assert.ok(!JSON.stringify(g.body).includes('c1ccc'), 'SMILES 가 응답에 있으면 안 돼요');
    assert.match(g.body.summary.find((r) => r.key === 'trials')!.value, /2상 통과\(보류 1번 뒤\)/);
  });

  // ── 3. 브랜드 ──
  await check('브랜드 규칙 — 욕설 · 실재 약 이름 · 코드명 꼴은 400', async () => {
    for (const name of ['씨발약', '타이레놀', `${tickA}-101`, 'x']) {
      const r = await A[0]!.call('PUT', APPROVAL_API.brand, { name, expectedVersion: 0 });
      assert.equal(r.status, 400, `${name} → ${r.status}`);
    }
  });
  await check('브랜드 4명 동시 저장(같은 판 0) — 한 명만 200 · 셋은 409 stale', async () => {
    const rs = await Promise.all(A.map((a, i) => a.call('PUT', APPROVAL_API.brand, { name: `뉴로${['가', '나', '다', '라'][i]}${suffix.replace(/[^a-z]/g, '')}`.slice(0, 12), expectedVersion: 0 })));
    assert.deepEqual(statuses(rs), [200, 409, 409, 409], JSON.stringify(rs.map((r) => r.body)));
    assert.ok(rs.filter((r) => r.status === 409).every((r) => (r.body as { error: { code: string } }).error.code === 'stale'));
  });
  const brandB = `다온${suffix.replace(/[^a-z]/g, '')}`.slice(0, 12);
  await check('학급 브랜드 유일 — 다른 모둠이 먼저 쓴 이름은 409 already_exists(어느 모둠인지 알리지 않음)', async () => {
    const rb = await B.call('PUT', APPROVAL_API.brand, { name: brandB, expectedVersion: 0 });
    assert.equal(rb.status, 200, JSON.stringify(rb.body));
    const g = await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get);
    const ra = await A[0]!.call<{ error: { code: string; message: string } }>('PUT', APPROVAL_API.brand, { name: ` ${brandB.toUpperCase()} `, expectedVersion: g.body.application!.brandVersion });
    assert.equal(ra.status, 409);
    assert.equal(ra.body.error.code, 'already_exists');
    assert.ok(!ra.body.error.message.includes(tickB));
  });
  await check('표적을 바꾼 모둠은 옛 버전 초안이 잡은 브랜드를 다시 쓴다(자기 초안 때문에 409 아님) · 다른 모둠은 여전히 409', async () => {
    assert.equal((await B.call('POST', '/api/program/target', { diseaseId: 'MONDO_0005148' })).status, 200);
    assert.equal((await B.call('POST', '/api/program/target', { diseaseId: 'MONDO_0008383' })).status, 200);
    const g = await B.call<ApprovalResponse>('GET', APPROVAL_API.get);
    assert.equal(g.body.application, null, '새 표적 버전은 신청서가 아직 없어요');
    const r = await B.call<{ application: { brand: { name: string } | null } }>('PUT', APPROVAL_API.brand, { name: brandB, expectedVersion: 0 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.application.brand?.name, brandB);
    const rows = await db.query<{ n: number }>(`select count(*)::int as n from web.approval_applications where team_id = $1 and brand_key is not null`, [teamB.id]);
    assert.equal(rows.rows[0]!.n, 1, '옛 버전 신청서의 이름은 풀렸어요');
    const ga = await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get);
    const ra = await A[0]!.call<{ error: { code: string } }>('PUT', APPROVAL_API.brand, { name: brandB, expectedVersion: ga.body.application!.brandVersion });
    assert.equal(ra.status, 409);
    assert.equal(ra.body.error.code, 'already_exists');
  });
  const brand = `세레나${suffix.replace(/[^a-z]/g, '')}`.slice(0, 12);
  await check('브랜드 저장 · 실재 약 이름을 품으면 주의(warning)만', async () => {
    const g = await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get);
    const w = await A[0]!.call<{ warning?: string; version: number }>('PUT', APPROVAL_API.brand, { name: '뉴타이레놀', expectedVersion: g.body.application!.brandVersion });
    assert.equal(w.status, 200, JSON.stringify(w.body));
    assert.ok(w.body.warning);
    const ok = await A[0]!.call<{ warning?: string }>('PUT', APPROVAL_API.brand, { name: brand, expectedVersion: w.body.version });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.warning, undefined);
  });

  // ── 포장 ──
  await check('포장 4명 동시 저장(판 0) — 한 명만 200 · 셋 409', async () => {
    const shapes = ['tablet', 'capsule', 'vial', 'patch'];
    const rs = await Promise.all(A.map((a, i) => a.call('PUT', APPROVAL_API.pack, { shape: shapes[i], color: 'sage', layout: 'top', expectedVersion: 0 })));
    assert.deepEqual(statuses(rs), [200, 409, 409, 409], JSON.stringify(rs.map((r) => r.body)));
  });
  await check('포장 값 검사 400', async () => {
    const r = await A[0]!.call('PUT', APPROVAL_API.pack, { shape: 'syrup', color: 'sage', layout: 'top', expectedVersion: 1 });
    assert.equal(r.status, 400);
  });

  // ── 칸 ──
  const S = {
    indication: '경도 알츠하이머병 성인의 인지 기능 저하를 늦춰요(ADAS-Cog 12주).',
    caution1: '심장 리듬(QT) 이상이 있거나 같은 약을 먹고 있으면 의사와 먼저 상의해요.',
    caution2: '하루 한 번 50 mg 만 먹고, 어지럽거나 가슴이 두근거리면 병원에 연락해요.',
  };
  await check('서로 다른 칸 3개 동시 저장 — 모두 200 · 같은 칸 동시 2번 — 한 명만', async () => {
    const rs = await Promise.all(Object.entries(S).map(([k, body], i) => A[i]!.call('PUT', APPROVAL_API.section(k), { body, expectedVersion: 0 })));
    assert.deepEqual(statuses(rs), [200, 200, 200], JSON.stringify(rs.map((r) => r.body)));
    const same = await Promise.all([A[3]!.call('PUT', APPROVAL_API.section('caution2'), { body: `${S.caution2} (고침)`, expectedVersion: 1 }), A[0]!.call('PUT', APPROVAL_API.section('caution2'), { body: S.caution2, expectedVersion: 1 })]);
    assert.deepEqual(statuses(same), [200, 409]);
    const stale = same.find((r) => r.status === 409)!.body as { error: { code: string; section?: { body: string } } };
    assert.equal(stale.error.code, 'stale');
    assert.ok(stale.error.section?.body);
    assert.equal((await A[0]!.call('PUT', APPROVAL_API.section('nope'), { body: 'x', expectedVersion: 0 })).status, 404);
  });

  // ── 4. 심사 ──
  const latest = async () => (await A[0]!.call<ApprovalResponse>('GET', APPROVAL_API.get)).body;
  await check('3상 프로토콜이 바뀌면 GET 도 바로 지금 값(쓰기 전) — 옛 값을 확정처럼 보이지 않음 · GET 은 쓰지 않음', async () => {
    const ind = (await db.query<{ id: string }>(`select id from web.ind_applications where program_revision_id = $1`, [seeded.revisionId])).rows[0]!.id;
    const extra = (
      await db.query<{ id: string }>(
        `insert into web.clinical_trials (class_id, team_id, program_revision_id, ind_application_id, patent_id, phase, attempt, route, form, dose_mg, population, endpoint, status,
                                          target_n, min_n, opened_game_day, accrued_through_day, facts, enrolled_at_start, started_game_day, ends_game_day, decided_game_day, verdict, cost_paid_cents)
         values ($1, $2, $3, $4, $5, 'phase3', 2, 'amend', 'oral', 100, '경도 알츠하이머 성인', 'ADAS-Cog 12주 변화', 'completed', 100, 80, 925, 925, '{}', 90, 925, 930, 930, 'pass', 0)
         returning id`,
        [cls.id, teamA.id, seeded.revisionId, ind, seeded.patentId],
      )
    ).rows[0]!.id;
    try {
      const g = await latest();
      assert.equal(g.phase3?.doseMg, 100);
      assert.equal(g.application!.doseMg, 100, '신청서 보기도 지금 3상 값');
      assert.equal(g.application!.formProvisional, false);
      const row = await db.query<{ dose_mg: number }>('select dose_mg from web.approval_applications where program_revision_id = $1', [seeded.revisionId]);
      assert.equal(row.rows[0]!.dose_mg, 50, 'GET 은 행을 바꾸지 않아요(쓰기 때 lockApp 이 맞춰요)');
    } finally {
      await db.query('delete from web.clinical_trials where id = $1', [extra]);
    }
    assert.equal((await latest()).application!.doseMg, 50);
  });
  await check('포장 ≠ 허가 제형이면 LLM 없이 보완(규칙) — 상태 revise', async () => {
    const g = await latest();
    const r = await A[0]!.call('PUT', APPROVAL_API.pack, { shape: 'vial', color: 'sage', layout: 'center', expectedVersion: g.application!.packVersion });
    assert.equal(r.status, 200);
    const rv = await A[0]!.call<{ review: DocReviewView }>('POST', APPROVAL_API.review);
    assert.equal(rv.status, 201, JSON.stringify(rv.body));
    assert.equal(rv.body.review.verdict, 'revise');
    assert.equal(rv.body.review.stage, 'rules');
    assert.ok(rv.body.review.ruleFindings.some((f) => f.id === 'package_fits' && f.status === 'fail'));
    assert.equal((await latest()).application!.status, 'revise');
    // 접수는 통과 전이라 409.
    assert.equal((await A[1]!.call('POST', APPROVAL_API.submit)).status, 409);
  });
  await check('포장을 정제로 고치면 초안 → 심사 요청(동시 2번 = 심사 1건)', async () => {
    const g = await latest();
    assert.equal((await A[2]!.call('PUT', APPROVAL_API.pack, { shape: 'tablet', color: 'sage', layout: 'top', expectedVersion: g.application!.packVersion })).status, 200);
    assert.equal((await latest()).application!.status, 'draft');
    const rs = await Promise.all([A[0]!.call<{ review: DocReviewView }>('POST', APPROVAL_API.review), A[1]!.call<{ review: DocReviewView }>('POST', APPROVAL_API.review)]);
    assert.ok(rs.every((r) => r.status === 200 || r.status === 201), JSON.stringify(rs.map((r) => r.body)));
    assert.equal(rs[0]!.body.review.id, rs[1]!.body.review.id);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from web.doc_reviews where doc_kind = 'nda' and doc_id = $1 and doc_version = $2`, [g.application!.id, (await latest()).application!.version]);
    assert.equal(n.rows[0]!.n, 1);
  });
  const reviewNow = async () => (await latest()).review!;
  if (REAL) {
    await check('실제 Claude 심사 1건 — pending → 판정(모델 표시) · 판정이 통과가 아니면 교사가 수동 통과', async () => {
      const decided = await waitFor(async () => {
        const r = await reviewNow();
        return r.verdict !== 'pending' ? r : undefined;
      }, 200_000, 'LLM 판정');
      console.log(`    LLM 판정: ${decided.verdict} · ${decided.model} · ${decided.items.map((i) => `${i.id}=${i.status}`).join(' ')} · ${decided.feedback ?? ''}`);
      assert.ok(decided.model?.startsWith('claude'), String(decided.model));
      if (decided.verdict !== 'pass') {
        const t = await teacher.call('POST', REVIEW_API.teacherDecide(decided.id), { verdict: 'pass', note: 'e2e — 실제 판정을 본 뒤 직접 통과' });
        assert.equal(t.status, 200, JSON.stringify(t.body));
      }
    });
  } else {
    await check('LLM 꺼짐 → pending(서류 잠그지 않음) → 교사 수동 통과 → 상태 passed', async () => {
      const r = await reviewNow();
      assert.equal(r.verdict, 'pending');
      assert.equal((await latest()).application!.status, 'reviewing');
      // 학생은 판정을 못 바꾼다.
      assert.equal((await A[0]!.call('POST', REVIEW_API.teacherDecide(r.id), { verdict: 'pass', note: 'x' })).status, 403);
      const t = await teacher.call('POST', REVIEW_API.teacherDecide(r.id), { verdict: 'pass', note: 'AI 심사를 끈 점검이라 직접 확인했어요.' });
      assert.equal(t.status, 200, JSON.stringify(t.body));
    });
  }
  await check('서류 통과 → passed · 모둠 WS 알림', async () => {
    const app = await waitFor(async () => {
      const a = (await latest()).application!;
      return a.status === 'passed' ? a : undefined;
    }, 5000, 'passed');
    assert.equal(app.status, 'passed');
    assert.ok(wsA.messages.some((m) => m.type === 'doc.reviewed' && m.kind === 'nda'));
  });

  // ── 접수 — 4명 동시 ──
  const before = await db.query<{ n: string }>('select sum(amount_cents)::bigint as n from web.ledger where team_id = $1', [teamA.id]);
  await check('접수 4명 동시 — 200 한 번 · 409 세 번 · 수수료 1번(500,000 크리스타) · decide = 접수 + 60', async () => {
    const rs = await Promise.all(A.map((a) => a.call<{ application: { status: string; submittedGameDay: number; decideGameDay: number } }>('POST', APPROVAL_API.submit)));
    assert.deepEqual(statuses(rs), [200, 409, 409, 409], JSON.stringify(rs.map((r) => r.body)));
    const ok = rs.find((r) => r.status === 200)!.body.application;
    assert.equal(ok.status, 'submitted');
    assert.ok(Math.abs(ok.decideGameDay - ok.submittedGameDay - 60) < 1e-6);
    const fees = await db.query<{ n: number; game_day: number | null }>(`select count(*)::int as n, max(game_day) as game_day from web.ledger where team_id = $1 and kind = 'approval_fee'`, [teamA.id]);
    assert.equal(fees.rows[0]!.n, 1);
    assert.ok(fees.rows[0]!.game_day !== null, '원장 줄에 게임 날짜(트리거)');
    const after = await db.query<{ n: string }>('select sum(amount_cents)::bigint as n from web.ledger where team_id = $1', [teamA.id]);
    assert.equal(Number(before.rows[0]!.n) - Number(after.rows[0]!.n), APPROVAL_FEE_CENTS);
  });
  await check('접수 뒤 — 브랜드 · 포장 · 칸 고치기 409 · 9단계 4.2 진행 중', async () => {
    const g = await latest();
    assert.equal((await A[0]!.call('PUT', APPROVAL_API.brand, { name: '다른이름', expectedVersion: g.application!.brandVersion })).status, 409);
    assert.equal((await A[0]!.call('PUT', APPROVAL_API.pack, { shape: 'capsule', color: 'sky', layout: 'top', expectedVersion: g.application!.packVersion })).status, 409);
    assert.equal((await A[0]!.call('PUT', APPROVAL_API.section('caution1'), { body: '바꿔요 바꿔요 바꿔요', expectedVersion: 1 })).status, 409);
    const board = await A[0]!.call<BoardResponse>('GET', API.board);
    const s42 = board.body.steps.find((s) => s.id === '4.2')!;
    console.log(`    4.1 상태(F41 computeSteps): ${board.body.steps.find((s) => s.id === '4.1')!.state} · 4.2: ${s42.state}`);
    if (board.body.steps.find((s) => s.id === '4.1')!.state === 'done') assert.equal(s42.state, 'running');
  });

  // ── 5. 허가 — 60게임 일을 건너뛴다(점검용: decide_game_day 를 지금으로 당김) → 게임 일 처리기(5초 틱) ──
  await db.query(`update web.approval_applications set decide_game_day = submitted_game_day where program_revision_id = $1 and status = 'submitted'`, [seeded.revisionId]);
  await check('게임 일 처리기 → approved · 허가증(번호 · 줄마다 단계 꼬리표 · 4.2) · 신약 포장 · 9단계 4.2 완료', async () => {
    const g = await waitFor(async () => {
      const x = await latest();
      return x.application?.status === 'approved' ? x : undefined;
    }, 15_000, 'approved');
    const c = g.certificate!;
    assert.equal(c.brand, brand);
    assert.match(c.certificateNo, new RegExp(`^NDA ${tickA}-101-\\d+$`));
    assert.ok(c.rows.some((r) => r.key === 'final' && r.steps.includes('4.2')));
    assert.equal(c.pack.shape, 'tablet');
    assert.equal(c.marketChangePct, 15.6);
    const board = await A[0]!.call<BoardResponse>('GET', API.board);
    assert.equal(board.body.steps.find((s) => s.id === '4.2')!.state, 'done');
  });
  await check("전광판 'approval' 한 줄 — 브랜드 공개 · 성분 SMILES · 칸 본문 없음 · 다른 모둠 학급 WS 로 받음", async () => {
    const ev = await db.query<{ n: number; headline: string; public: Record<string, unknown> }>(
      `select count(*) over ()::int as n, headline, public from web.board_events where class_id = $1 and kind = 'approval'`,
      [cls.id],
    );
    assert.equal(ev.rows.length, 1);
    assert.ok(ev.rows[0]!.headline.includes(brand));
    assert.deepEqual(Object.keys(ev.rows[0]!.public).sort(), ['brand', 'defaultChangePct', 'disease', 'form', 'stage', 'ticker']);
    const pub = JSON.stringify(ev.rows[0]!.public);
    assert.ok(!pub.includes('c1ccc') && !pub.includes('QT') && !pub.includes('ADAS'));
    // 같은 로컬 DB 를 다른 서버(3390 · 다른 기능 포트)도 쓰면 그 서버의 5초 틱이 먼저 허가할 수 있다 — 그때 소식은 그 서버의 WS 로 나간다.
    // 이 서버 혼자일 때만(E2E_SOLO=1) WS 를 꼭 확인한다.
    const got = await waitFor(() => wsB.messages.find((m) => m.type === 'board.event' && m.event.kind === 'approval'), 6000, '모둠 B 학급 WS').catch(() => null);
    if (got && got.type === 'board.event') assert.equal(got.event.headline.includes(brand), true);
    else if (process.env.E2E_SOLO === '1') throw new Error('모둠 B 학급 WS 로 허가 소식이 오지 않았습니다.');
    else console.log('    (학급 WS 소식은 같은 DB 를 쓰는 다른 서버의 틱이 처리 — 이 서버 WS 로는 오지 않음)');
  });
  await check('다른 모둠은 우리 신청서를 못 본다 — B 의 GET 은 B 것만', async () => {
    const gb = await B.call<ApprovalResponse>('GET', APPROVAL_API.get);
    assert.equal(gb.status, 200);
    assert.equal(gb.body.application?.brand?.name, brandB);
    assert.ok(!JSON.stringify(gb.body).includes(brand));
    assert.equal(gb.body.certificate, null);
  });
  await check('처리기 다시 돌아도 한 번만(멱등) — 소식 1줄 · 수수료 1줄', async () => {
    await sleep(6000);
    const n = await db.query<{ e: number; f: number }>(
      `select (select count(*)::int from web.board_events where class_id = $1 and kind = 'approval') as e,
              (select count(*)::int from web.ledger where team_id = $2 and kind = 'approval_fee') as f`,
      [cls.id, teamA.id],
    );
    assert.deepEqual(n.rows[0], { e: 1, f: 1 });
  });

  // ── 6. 영수증 ──
  await check('영수증 — 단계 줄 · 2상 보류 빨간 줄 · 허가 수수료 · 학습 · 투자 따로 · 합계 = 원장 · 분자 220 → 1', async () => {
    const r = (await latest()).receipt;
    const steps = new Set(r.spent.map((l) => l.stepId));
    for (const s of ['1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2']) assert.ok(steps.has(s as never), s);
    const red = r.spent.filter((l) => l.failed);
    assert.equal(red.length, 2, JSON.stringify(red));
    assert.ok(red.every((l) => l.stepId === '4.1' && l.label.includes('2상')));
    assert.ok(r.spent.some((l) => l.kind === 'approval_fee' && l.crista === 500_000));
    assert.ok(r.income.some((l) => l.kind === 'learn_stipend' && l.count === 2));
    assert.ok(r.income.some((l) => l.kind === 'pitch_series_a'));
    const sum = await db.query<{ n: string }>('select sum(amount_cents)::bigint as n from web.ledger where team_id = $1', [teamA.id]);
    assert.equal(r.totals.balanceCrista, Math.trunc(Number(sum.rows[0]!.n) / 20));
    assert.equal(r.totals.initialCrista - r.totals.spentCrista + r.totals.incomeCrista, r.totals.balanceCrista);
    assert.deepEqual(r.molecules, { start: 220, end: 1 });
    assert.ok(r.shares.find((g) => g.group === 'clinical')!.crista > 0);
  });

  wsA.close();
  wsB.close();
  await db.end();
  console.log(failed ? `\n${failed}건 실패` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
