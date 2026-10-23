/**
 * F33 — 3.3 제형 · IND 4인 동시 조작 점검(설계 §5.10 · §7.4 ⑬). 떠 있는 로컬 서버 + 같은 DB.
 *
 *   WEB_PORT=3405 LLM_DISABLED=1 node tools/with-local-env.mjs node apps/server/src/index.ts   (다른 터미널)
 *   WEB_PORT=3405 npm run e2e:ind
 *
 * 앞 단계(2.1 도킹 · 2.2 ADMET · 3.1 특허 · 3.2 승인 계획서 · 동물실험 · 주력 지정)는 다른 기능이 만드는 중이라
 * crista_web 연결로 직접 넣는다(관리자 연결 아님). 동물실험 결과의 제형별 MRSD 는 설계 §5.9 ④ 의 거꾸로 계산(T* = 65 ÷ (Rk × K)).
 *
 * 1. 교사 · 학급 · 학생 4 · 입사 · 등기 · 표적(ACHE) → 앞 단계 자료 넣기 → GET /api/ind: 준비됨 · 주력 9조합.
 * 2. 네 명이 동시에 [새 신청서] → 한 줄(201 하나 · 나머지 같은 id).
 * 3. 네 명이 동시에 다른 칸 저장 → 모두 200 · 같은 칸 같은 판 → 하나만 200(나머지 409 stale + 지금 칸).
 * 4. 네 명이 동시에 조합 바꾸기(같은 planVersion) → 하나만 200.
 * 5. MRSD 를 넘는 용량으로 심사 → 규칙에서 보완(LLM 없음). 고친 뒤 심사 → (LLM 꺼짐) pending · 동시 심사 4번 = 심사 1건 → 교사 수동 통과 → passed.
 * 6. 통과 뒤 칸을 고치면 draft → 접수 409. 다시 심사 · 통과.
 * 5b. (검토 · 수리) 교사가 규칙 보완 건을 손으로 통과시켜도 접수는 서버가 규칙을 다시 봐서 409(과금 없음) · uuid 가 아닌 id → 404.
 * 6b. (검토 · 수리) 통과 뒤 3.2 결과(MRSD)가 바뀌면 접수 409 · 같은 판으로 다시 심사하면 판을 올려 새로 심사(옛 통과 캐시를 돌려주지 않음).
 *     연구비가 모자라면 402 · 상태 그대로 · ind_fee 줄 없음.
 * 7. 네 명이 동시에 [접수] → 200 하나 · 과금 1회(ind_fee · 멱등 키 ind:<id>) · 나머지 409. 접수 뒤 칸 고치기 409.
 * 8. 시계 배속 → 30게임 일 뒤 승인 · 전광판 'ind_approved' 한 줄(공개 칸에 분자 · 점수 없음) · 3.3 완료 · 승인서(4.1 입력).
 * 만든 계정 · 학급은 지우지 않는다(이름에 실행 접미). `E2E_SEED_ONLY=1` 이면 앞 단계 자료만 넣고 멈춘다(화면 점검용).
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import WebSocket from 'ws';
import { affinityStrength, PIPELINE_RULES, propertySignals } from '@crista/game-rules';
import type { MoleculeProperties } from '@crista/shared-types';
import {
  API,
  CLOCK_API,
  IND_API,
  IND_FEE_CENTS,
  IND_FORMS,
  IND_PLEDGE_BODY,
  PRECLINICAL_RULES,
  type AnimalStudyResult,
  type BoardResponse,
  type IndApplicationResponse,
  type IndResponse,
  type MeResponse,
  type ServerMessage,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3390}`;
const WORKER = process.env.E2E_WORKER_URL ?? 'http://127.0.0.1:8790';
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
  constructor(name: string) {
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
  /** 화면 읽기 — 같은 로컬 DB 를 여러 서버가 함께 쓰면 연결 상한(53300)으로 잠깐 500 이 나므로 200 이 올 때까지 다시 읽는다(최대 30초). */
  ind = async (): Promise<IndResponse> => {
    for (let i = 0; ; i++) {
      const r = await this.call<IndResponse>('GET', IND_API.ind);
      if (r.status === 200 || i >= 30) return r.body;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
  };
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
    await sleep(500);
  }
  throw new Error(`${label} — ${ms}ms 안에 오지 않았습니다.`);
}

const SMILES = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccc(F)cc3)CC1)C2';

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}/api/health`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  const propsRes = await fetch(`${WORKER}/molecule/properties`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ smiles: SMILES }) }).catch(() => null);
  if (!propsRes?.ok) throw new Error(`워커(${WORKER})의 물성 계산이 필요합니다.`);
  const props = ((await propsRes.json()) as { properties: MoleculeProperties }).properties;

  // ── 1. 교사 · 학급 · 학생 4 · 등기 · 표적 ──
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', `ti${suffix}`, '--name', `IND 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  const secret = JSON.parse(run.stdout.trim()) as { userId: string; password: string };
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: `ti${suffix}`, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `IND 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const people = ['가', '나', '다', '라'].map((n) => new Agent(`IND${n}`));
  const userIds: string[] = [];
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `ti${suffix}${'abcd'[i]}`, displayName: s.name, password: `pw-${suffix}-1234` });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    userIds.push(up.body.account.userId);
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [sa, sb, sc, sd] = people as [Agent, Agent, Agent, Agent];
  const ticker = `I${suffix.replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}`.slice(0, 4);
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `임상제약${suffix}`, ticker })).status, 201);
  const diseaseId = 'MONDO_0004975';
  await sa.call('POST', API.picks, { diseaseId, note: '알츠하이머' });
  const tgt = await sa.call('POST', API.target, { diseaseId });
  assert.equal(tgt.status, 200, JSON.stringify(tgt.body));
  // 같은 로컬 DB 를 여러 서버가 함께 쓰면 연결 상한(53300)으로 잠깐 500 이 날 수 있다 — 화면 한 장만 몇 번 다시 읽는다.
  const board0 = await waitFor(async () => {
    const r = await sa.call<BoardResponse>('GET', API.board);
    return r.status === 200 ? r.body : undefined;
  }, 30_000, 'GET /api/board');
  const revisionId = board0.program.revisionId;
  const balance0 = board0.balanceCents;

  // ── 앞 단계 자료(crista_web 연결) ──
  const db = new pg.Pool({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-ind' });
  const sig = propertySignals(props);
  // F32 의 실제 규칙(PRECLINICAL_RULES.study — NOAEL 을 판정 재료에서 거꾸로)으로 동물실험 결과를 만든다 — F32 → F33 이음매 점검.
  const animal: AnimalStudyResult = PRECLINICAL_RULES.study(
    { targetId: 'ache-4ey7', cns: true, p: affinityStrength(-11.6, -11.84), herg: sig.herg, hepatotoxicity: sig.hepatotoxicity, oralAbsorption: sig.oralAbsorption, bbb: sig.bbb, seed: `e2e-ind:${suffix}` },
    'standard',
  );
  const mrsd = animal.mrsdMgByForm;
  const hed = animal.hedMgPerKg;
  const rk = 1 + PIPELINE_RULES.risk.herg[sig.herg] + PIPELINE_RULES.risk.hepatotoxicity[sig.hepatotoxicity];
  console.log(`    물성 신호 hERG ${sig.herg} · 간 ${sig.hepatotoxicity} · Rk ${rk.toFixed(2)} · MRSD ${JSON.stringify(mrsd)} · HED ${hed}`);
  const ids = await (async () => {
    const c = await db.connect();
    try {
      await c.query('begin');
      const job = async (step: string, facility: string, stage: number, extra: Record<string, unknown>) => {
        const r = await c.query<{ id: string }>(
          `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, canonical_smiles,
                                 status, progress, source, test, affinity_kcal, parent_job_id, result, patent_id, design_key, ends_game_day, finished_at)
           values ($1, $2, $3, $4, $5, $6, $7, '{}', 'e2e-ind', 'ache-4ey7', $8, $9, $9, 'succeeded', 1, $10, true, $11, $12, $13, $14, $15, $16, now()) returning id`,
          [team.id, cls.id, userIds[0], `e2eind${randomBytes(6).toString('hex')}`, step, stage, facility, revisionId, SMILES, extra.source ?? 'fixture',
            extra.affinity ?? null, extra.parent ?? null, extra.result ? JSON.stringify(extra.result) : null, extra.patent ?? null, extra.design ?? null, extra.ends ?? null],
        );
        return r.rows[0]!.id;
      };
      const dock = await job('2.1', 'docking', 3, { affinity: -11.6 });
      const admet = await job('2.2', 'admet', 4, { parent: dock });
      await c.query(`insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 1, 'herg_low')`, [revisionId, team.id, admet, userIds[0]]);
      const app = await c.query<{ id: string }>(
        `insert into web.patent_applications (program_revision_id, team_id, class_id, admet_job_id, code_name, status) values ($1, $2, $3, $4, $5, 'accepted') returning id`,
        [revisionId, team.id, cls.id, admet, `${ticker}-102`],
      );
      const pat = await c.query<{ id: string }>(
        `insert into web.patents (class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
         values ($1, 1, $2, $3, $4, $5, $6, $7, $7, $8, 1) returning id`,
        [cls.id, `KR-E2-${suffix}`, team.id, revisionId, app.rows[0]!.id, admet, SMILES, `${ticker}-102`],
      );
      await c.query(
        `insert into web.iacuc_protocols (program_revision_id, team_id, status, approved_version, approved_at, approved_snapshot) values ($1, $2, 'approved', 1, now(), '{}')`,
        [revisionId, team.id],
      );
      const animalJob = await job('3.2', 'animal_study', 5, { source: 'simulation', result: animal, patent: pat.rows[0]!.id, design: 'animal:standard', ends: 28 });
      await c.query(`update web.program_revisions set lead_job_id = $2, lead_version = lead_version + 1, lead_set_at = now(), lead_set_by = $3 where id = $1`, [revisionId, admet, userIds[0]]);
      await c.query('commit');
      return { admet, patentId: pat.rows[0]!.id, animalJob };
    } catch (error) {
      await c.query('rollback');
      throw error;
    } finally {
      c.release();
    }
  })();

  if (process.env.E2E_SEED_ONLY === '1') {
    // 화면 점검용 — 앞 단계 자료만 넣고 멈춘다(로컬 시험 계정의 아이디 · 비밀번호만 출력 — 교사 수동 판정을 화면으로 눌러 보려고).
    console.log(`앞 단계 자료만 넣었어요 — 학생 ti${suffix}a~d · 비밀번호 pw-${suffix}-1234 · 교사 ti${suffix}(비밀번호 ${secret.password} — 로컬 시험 계정) · 학급 ${cls.code}`);
    await db.end();
    process.exit(0);
  }
  let ind = await sa.ind();
  await check('GET /api/ind — 준비됨 · 주력 9조합(E · S) · MRSD · 환자군 목록 · 규칙 값', () => {
    assert.equal(ind.ready, true, ind.readyReason ?? '');
    const lead = ind.candidates.find((c) => c.role === 'lead')!;
    assert.equal(lead.patentId, ids.patentId);
    assert.equal(lead.grid?.length, 9, lead.gridNote);
    assert.deepEqual(lead.animal?.mrsdMgByForm, mrsd);
    assert.ok(ind.trial && ind.trial.populations.length > 0);
    assert.equal(ind.rules.thresholds.ind, 35);
    assert.equal(ind.application, null);
    const board = JSON.stringify(ind);
    assert.ok(!board.includes(SMILES), '응답에 SMILES 를 싣지 않는다');
  });
  const lead = ind.candidates.find((c) => c.role === 'lead')!;
  // MRSD 이하 · S ≥ 35 인 조합 하나 · MRSD 를 넘는 조합 하나.
  const okCell = lead.grid!.filter((c) => c.dose <= mrsd[c.form] && c.safety >= 35 && c.form !== 'transdermal').sort((a, b) => b.efficacy - a.efficacy)[0]!;
  const overCell = lead.grid!.find((c) => c.dose > mrsd[c.form])!;
  assert.ok(okCell && overCell, `조합 — MRSD ${JSON.stringify(mrsd)}`);

  // ── 2. 동시에 새 신청서 ──
  const ws = await openWs(sb);
  const wsClass = await openWs(sc);
  const creates = await Promise.all(people.map((s) => s.call<IndApplicationResponse>('POST', IND_API.applications)));
  const appId = creates[0]!.body.application?.id;
  await check('네 명이 동시에 [새 신청서] → 한 줄(201 하나 · 나머지 200 같은 id)', async () => {
    assert.deepEqual(creates.map((r) => r.status).sort(), [200, 200, 200, 201], JSON.stringify(creates.map((r) => r.body)));
    assert.equal(new Set(creates.map((r) => r.body.application.id)).size, 1);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from web.ind_applications where program_revision_id = $1`, [revisionId]);
    assert.equal(n.rows[0]!.n, 1);
  });
  assert.ok(appId);

  // ── 3. 칸 동시 저장 ──
  const sections = { title: `경도 알츠하이머병 환자를 위한 ${ticker}-102 첫 사람 시험(제1상)`, dev_plan: '알츠하이머병은 아세틸콜린이 줄어 기억이 나빠지는 병이에요. 1상에서 안전성을, 2상에서 인지 점수를, 3상에서 큰 환자군의 효과를 확인해요.', form_reason: '경구 흡수 신호가 좋고 피크 배율이 1.00 이라 정맥보다 몸이 받는 부담이 낮아요. 매일 먹기 쉬운 알약으로 정했어요.', nonclinical: `랫드와 개에서 반복투여 독성을 봤고 개가 더 민감했어요. HED 는 ${hed} mg/kg 이고 QT 소견이 있어 심장 감시가 필요해요.` };
  const saves = await Promise.all((Object.entries(sections) as Array<[string, string]>).map(([k, v], i) => people[i]!.call<{ version: number }>('PUT', IND_API.section(appId!, k), { body: v, expectedVersion: 0 })));
  const race = await Promise.all([sa, sb].map((s) => s.call<{ error: { code: string; section?: { body: string } } }>('PUT', IND_API.section(appId!, 'title'), { body: `${s.name} 의 제목`, expectedVersion: 1 })));
  await check('네 명이 다른 칸 동시 저장 → 모두 200 · 같은 칸 같은 판 → 하나만 200(나머지 409 stale + 지금 칸)', () => {
    assert.deepEqual(saves.map((r) => r.status), [200, 200, 200, 200], JSON.stringify(saves.map((r) => r.body)));
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    const lost = race.find((r) => r.status === 409)!;
    assert.equal(lost.body.error.code, 'stale');
    assert.ok(lost.body.error.section?.body.includes('의 제목'));
  });

  // ── 4. 조합 동시 바꾸기 ──
  ind = await sa.ind();
  const pv = ind.application!.planVersion;
  const pop = ind.trial!.populations[0]!;
  const ep = ind.trial!.endpoints[0]!;
  const plans = await Promise.all(people.map((s, i) => s.call('PUT', IND_API.plan(appId!), { expectedPlanVersion: pv, form: IND_FORMS[i % 3], doseMg: 10 })));
  await check('네 명이 동시에 조합 바꾸기(같은 planVersion) → 하나만 200 · 나머지 409', () => {
    assert.deepEqual(plans.map((r) => r.status).sort(), [200, 409, 409, 409], JSON.stringify(plans.map((r) => r.body)));
  });

  // ── 5. 규칙 보완 → 고쳐서 심사 ──
  ind = await sa.ind();
  let plan = await sa.call<IndApplicationResponse>('PUT', IND_API.plan(appId!), { expectedPlanVersion: ind.application!.planVersion, form: overCell.form, doseMg: overCell.dose, population: pop, endpoint: ep });
  assert.equal(plan.status, 200, JSON.stringify(plan.body));
  const rest = { calc_hed: String(hed), calc_mrsd: String(mrsd[overCell.form]), subject: '건강한 성인 지원자 — 첫 시험은 안전만 보므로 병이 없는 사람에게 낮은 용량부터 줘요.', stop_rule: '심전도 QT 간격이 기준보다 30 ms 넘게 늘거나 간 수치가 정상 상한의 3배를 넘으면 그 용량 단계를 멈춰요.', risk_monitor: 'hERG 위험과 QT 소견이 있어 투여 전후 심전도로 QT 를 재요. 간 수치도 주마다 재요.', consent: '처음 사람에게 쓰는 약이라 모르는 위험이 있어요. 언제든 그만둘 수 있어요. 임상시험심사위원회(IRB) 심의를 받은 뒤 시작해요.', pledge_hold: IND_PLEDGE_BODY, pledge_report: IND_PLEDGE_BODY };
  for (const [k, v] of Object.entries(rest)) {
    const r = await sb.call('PUT', IND_API.section(appId!, k), { body: v, expectedVersion: 0 });
    assert.equal(r.status, 200, `${k} ${JSON.stringify(r.body)}`);
  }
  ind = await sa.ind();
  const overReview = await sc.call<{ review: { verdict: string; stage: string; ruleFindings: Array<{ id: string; status: string }> }; application: { status: string } }>('POST', IND_API.review(appId!), { expectedVersion: ind.application!.version });
  await check(`MRSD 를 넘는 용량(${overCell.form} ${overCell.dose} mg > ${mrsd[overCell.form]}) → 규칙에서 보완(LLM 없음)`, () => {
    assert.equal(overReview.status, 200, JSON.stringify(overReview.body));
    assert.equal(overReview.body.review.verdict, 'revise');
    assert.equal(overReview.body.review.stage, 'rules');
    assert.ok(overReview.body.review.ruleFindings.some((f) => f.id === 'dose_le_mrsd' && f.status === 'fail'));
    assert.equal(overReview.body.application.status, 'revise');
  });

  const overId = (overReview.body as unknown as { review: { id: string } }).review.id;
  const forced = await teacher.call('POST', `/api/teacher/reviews/${overId}/decision`, { verdict: 'pass', note: '점검 — 규칙 보완 건을 손으로 통과시켜 봐요.' });
  ind = await sa.ind();
  const forcedSubmit = await sa.call<{ error: { code: string } }>('POST', IND_API.submit(appId!), { expectedVersion: ind.application!.version });
  await check('교사가 규칙 보완 건을 손으로 통과 → passed 여도 접수는 서버가 규칙을 다시 봐서 409 · 과금 없음', async () => {
    assert.equal(forced.status, 200, JSON.stringify(forced.body));
    assert.equal(ind.application!.status, 'passed');
    assert.equal(forcedSubmit.status, 409, JSON.stringify(forcedSubmit.body));
    const led = await db.query<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and kind = 'ind_fee'`, [team.id]);
    assert.equal(led.rows[0]!.n, 0);
  });
  await check('uuid 가 아닌 신청서 id → 404(500 아님)', async () => {
    assert.equal((await sa.call('PUT', IND_API.section('not-a-uuid', 'title'), { body: 'x', expectedVersion: 0 })).status, 404);
    assert.equal((await sa.call('POST', IND_API.submit('not-a-uuid'), { expectedVersion: 1 })).status, 404);
  });

  ind = await sa.ind();
  plan = await sa.call<IndApplicationResponse>('PUT', IND_API.plan(appId!), { expectedPlanVersion: ind.application!.planVersion, form: okCell.form, doseMg: okCell.dose });
  assert.equal(plan.status, 200);
  const mrsdSec = ind.application!.sections.find((s) => s.section === 'calc_mrsd')!;
  assert.equal((await sb.call('PUT', IND_API.section(appId!, 'calc_mrsd'), { body: String(mrsd[okCell.form]), expectedVersion: mrsdSec.version })).status, 200);
  ind = await sa.ind();
  await check('규칙 미리 보기 — 고친 뒤 fail 0 · 상태 draft', () => {
    assert.deepEqual(ind.application!.rulePreview.filter((f) => f.status === 'fail').map((f) => f.note), []);
    assert.equal(ind.application!.status, 'draft');
  });
  const v1 = ind.application!.version;
  const reviews = await Promise.all(people.map((s) => s.call<{ review: { id: string; verdict: string }; created: boolean }>('POST', IND_API.review(appId!), { expectedVersion: v1 })));
  const reviewId = reviews[0]!.body.review?.id;
  await check('동시 심사 4번 → 심사 1건(created 하나) · pending(LLM 꺼짐이면) · 상태 reviewing', async () => {
    assert.deepEqual(reviews.map((r) => r.status), [200, 200, 200, 200], JSON.stringify(reviews.map((r) => r.body)));
    assert.equal(new Set(reviews.map((r) => r.body.review.id)).size, 1);
    assert.equal(reviews.filter((r) => r.body.created).length, 1);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from web.doc_reviews where doc_kind = 'ind' and doc_id = $1 and doc_version = $2`, [appId, v1]);
    assert.equal(n.rows[0]!.n, 1);
  });
  const passReview = async (id: string) => {
    let view = (await sa.call<{ review: { verdict: string; items: unknown[] } }>('GET', `/api/reviews/${id}`)).body.review;
    if (view.verdict === 'pending' && process.env.E2E_WAIT_LLM === '1') {
      view = await waitFor(async () => {
        const v = (await sa.call<{ review: { verdict: string; items: unknown[]; feedback: string | null } }>('GET', `/api/reviews/${id}`)).body.review;
        return v.verdict !== 'pending' ? v : undefined;
      }, 180_000, 'AI 심사');
      console.log(`    AI 심사 ${view.verdict} · ${JSON.stringify(view.items)}`);
    }
    if (view.verdict !== 'pass') {
      const d = await teacher.call<{ review: { verdict: string } }>('POST', `/api/teacher/reviews/${id}/decision`, { verdict: 'pass', note: '점검 — 교사가 직접 확인했어요.' });
      assert.equal(d.status, 200, JSON.stringify(d.body));
    }
  };
  await check('교사 수동 통과(또는 AI 통과) → passed · 모둠 WS doc.reviewed', async () => {
    await passReview(reviewId!);
    const st = await waitFor(async () => ((await sa.ind()).application!.status === 'passed' ? true : undefined), 5000, 'passed');
    assert.ok(st);
    await waitFor(() => ws.messages.find((m) => m.type === 'doc.reviewed' && m.docId === appId), 5000, 'doc.reviewed');
  });

  // ── 6. 통과 뒤 고치면 draft ──
  ind = await sa.ind();
  const title = ind.application!.sections.find((s) => s.section === 'title')!;
  assert.equal((await sd.call('PUT', IND_API.section(appId!, 'title'), { body: `${title.body} — 고침`, expectedVersion: title.version })).status, 200);
  ind = await sa.ind();
  const early = await sa.call<{ error: { code: string } }>('POST', IND_API.submit(appId!), { expectedVersion: ind.application!.version });
  await check('통과 뒤 칸을 고치면 draft — 접수 409(다시 심사)', () => {
    assert.equal(ind.application!.status, 'draft');
    assert.equal(early.status, 409);
  });
  const again = await sa.call<{ review: { id: string } }>('POST', IND_API.review(appId!), { expectedVersion: ind.application!.version });
  assert.equal(again.status, 200, JSON.stringify(again.body));
  await passReview(again.body.review.id);
  ind = await waitFor(async () => {
    const x = await sa.ind();
    return x.application!.status === 'passed' ? x : undefined;
  }, 5000, 'passed 2');

  // ── 6b. 통과 뒤 3.2 결과가 바뀜 → 접수 409 · 같은 판 다시 심사 = 판을 올려 새 심사 ──
  {
    const vPassed = ind.application!.version;
    const shrunk = { ...animal, mrsdMgByForm: { ...animal.mrsdMgByForm, [okCell.form]: okCell.dose - 1 } };
    await db.query('update web.jobs set result = $2 where id = $1', [ids.animalJob, JSON.stringify(shrunk)]);
    const blocked = await sa.call<{ error: { code: string } }>('POST', IND_API.submit(appId!), { expectedVersion: vPassed });
    const rerun = await sa.call<{ review: { verdict: string; docVersion: number; stage: string }; created: boolean; application: { version: number; status: string } }>('POST', IND_API.review(appId!), { expectedVersion: vPassed });
    await check('통과 뒤 MRSD 가 줄면 접수 409(서버 재판정) · 같은 판 다시 심사 → 판 +1 · 규칙 보완(옛 통과를 돌려주지 않음)', async () => {
      assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
      assert.equal(rerun.status, 200, JSON.stringify(rerun.body));
      assert.equal(rerun.body.created, true);
      assert.equal(rerun.body.review.docVersion, vPassed + 1);
      assert.equal(rerun.body.review.verdict, 'revise');
      assert.equal(rerun.body.review.stage, 'rules');
      assert.equal(rerun.body.application.status, 'revise');
      const led = await db.query<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and kind = 'ind_fee'`, [team.id]);
      assert.equal(led.rows[0]!.n, 0);
    });
    await db.query('update web.jobs set result = $2 where id = $1', [ids.animalJob, JSON.stringify(animal)]);
    const back = await sa.call<{ review: { id: string; docVersion: number } }>('POST', IND_API.review(appId!), { expectedVersion: vPassed + 1 });
    assert.equal(back.status, 200, JSON.stringify(back.body));
    assert.equal(back.body.review.docVersion, vPassed + 2);
    await passReview(back.body.review.id);
    ind = await waitFor(async () => {
      const x = await sa.ind();
      return x.application!.status === 'passed' ? x : undefined;
    }, 5000, 'passed 3');
  }
  {
    // 연구비가 모자라면 402 — 상태 그대로 · ind_fee 줄 없음(조정 줄로 잠깐 비웠다가 되돌린다).
    const bal = (await sa.call<BoardResponse>('GET', API.board)).body.balanceCents;
    const drain = bal - IND_FEE_CENTS + 20;
    await db.query(`insert into web.ledger (team_id, amount_cents, kind, idem_key) values ($1, $2, 'adjustment', $3)`, [team.id, -drain, `e2e-ind-drain-${suffix}`]);
    const poor = await sa.call<{ error: { code: string } }>('POST', IND_API.submit(appId!), { expectedVersion: ind.application!.version });
    await db.query(`insert into web.ledger (team_id, amount_cents, kind, idem_key) values ($1, $2, 'adjustment', $3)`, [team.id, drain, `e2e-ind-refill-${suffix}`]);
    const after = await sa.ind();
    await check('연구비가 모자라면 접수 402 · 상태 passed 그대로 · ind_fee 줄 없음', async () => {
      assert.equal(poor.status, 402, JSON.stringify(poor.body));
      assert.equal(poor.body.error.code, 'insufficient_funds');
      assert.equal(after.application!.status, 'passed');
      const led = await db.query<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and kind = 'ind_fee'`, [team.id]);
      assert.equal(led.rows[0]!.n, 0);
    });
    ind = after;
  }

  // ── 7. 동시 접수 ──
  await teacher.call('POST', CLOCK_API.clock(cls.id), { action: 'rate', rate: 60 });
  const vSubmit = ind.application!.version;
  const submits = await Promise.all(people.map((s) => s.call<{ charged?: boolean; error?: { code: string } }>('POST', IND_API.submit(appId!), { expectedVersion: vSubmit })));
  await check('네 명이 동시에 [접수] → 200 하나 · 과금 1회(ind_fee · ind:<id>) · 나머지 409', async () => {
    assert.deepEqual(submits.map((r) => r.status).sort(), [200, 409, 409, 409], JSON.stringify(submits.map((r) => r.body)));
    assert.equal(submits.find((r) => r.status === 200)!.body.charged, true);
    const led = await db.query<{ n: number; sum: string; key: string }>(
      `select count(*)::int as n, sum(amount_cents)::text as sum, max(idem_key) as key from web.ledger where team_id = $1 and kind = 'ind_fee'`,
      [team.id],
    );
    assert.equal(led.rows[0]!.n, 1);
    assert.equal(Number(led.rows[0]!.sum), -IND_FEE_CENTS);
    assert.equal(led.rows[0]!.key, `ind:${appId}`);
    const b = (await sa.call<BoardResponse>('GET', API.board)).body;
    assert.equal(b.balanceCents, balance0 - IND_FEE_CENTS);
    assert.equal(b.steps.find((s) => s.id === '3.3')!.state, 'running');
  });
  await check('접수 뒤 칸 · 조합 고치기 409 · 다시 접수 409', async () => {
    ind = await sa.ind();
    assert.equal(ind.application!.status, 'submitted');
    assert.equal((await sb.call('PUT', IND_API.section(appId!, 'consent'), { body: '바꿈', expectedVersion: 1 })).status, 409);
    assert.equal((await sb.call('PUT', IND_API.plan(appId!), { expectedPlanVersion: ind.application!.planVersion, doseMg: 10 })).status, 409);
    assert.equal((await sb.call('POST', IND_API.submit(appId!), { expectedVersion: ind.application!.version })).status, 409);
  });

  // ── 8. 판정 ──
  await check('30게임 일 뒤 승인 · 전광판 ind_approved 한 줄(공개 칸만) · 3.3 완료 · 승인서', async () => {
    const done = await waitFor(async () => {
      const x = await sa.ind();
      return x.application!.status === 'approved' || x.application!.status === 'held' ? x : undefined;
    }, 90_000, '판정');
    assert.equal(done.application!.status, 'approved', JSON.stringify(done.application!.judgement));
    assert.ok(done.approval);
    assert.equal(done.approval!.form, okCell.form);
    assert.equal(done.approval!.doseMg, okCell.dose);
    assert.equal(done.approval!.population, pop);
    assert.equal(done.approval!.endpoint, ep);
    const ev = await db.query<{ n: number; headline: string; pub: Record<string, unknown> }>(
      `select count(*)::int as n, max(headline) as headline, (array_agg(public))[1] as pub from web.board_events where class_id = $1 and kind = 'ind_approved'`,
      [cls.id],
    );
    assert.equal(ev.rows[0]!.n, 1);
    assert.ok(ev.rows[0]!.headline.includes(ticker));
    const pubText = JSON.stringify(ev.rows[0]!.pub);
    assert.ok(!/smiles|safety|efficacy|dose/i.test(pubText), pubText);
    // 같은 DB 를 쓰는 다른 서버 프로세스(3390 등)의 시계 틱이 먼저 판정하면 학급 WS 는 그 프로세스의 접속자에게만 간다 — 판정 줄은 DB 로 확인했고, WS 는 참고로 본다.
    const got = await waitFor(() => wsClass.messages.find((m) => m.type === 'board.event' && m.event.kind === 'ind_approved'), 5000, '학급 board.event').catch(() => null);
    console.log(got ? '    학급 WS board.event 받음' : '    (참고) 학급 WS board.event 를 이 서버에서 받지 못함 — 다른 서버 프로세스가 먼저 판정했을 수 있어요');
    const b = (await sa.call<BoardResponse>('GET', API.board)).body;
    assert.equal(b.steps.find((s) => s.id === '3.3')!.state, 'done');
    const re = await sb.call<IndApplicationResponse>('POST', IND_API.applications);
    assert.equal(re.status, 200);
    assert.equal(re.body.application.id, appId);
  });

  ws.close();
  wsClass.close();
  await db.end();
  console.log(failed === 0 ? '\nIND 점검 통과' : `\n실패 ${failed}건`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
