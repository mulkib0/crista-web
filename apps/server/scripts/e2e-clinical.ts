/**
 * 4.1 임상(F41) 4인 동시 조작 점검 — 떠 있는 로컬 서버(HTTP) + 같은 DB(crista_web 연결로 앞 단계 시험 데이터 · 시계 앞당기기).
 *
 *   WEB_PORT=3406 LLM_DISABLED=1 node tools/with-local-env.mjs node apps/server/src/index.ts   (다른 터미널)
 *   WEB_PORT=3406 npm run e2e:clinical
 *
 * 앞 단계(2.1 도킹 · 2.2 ADMET · 3.1 특허 · 3.2 동물실험 · 3.3 IND 승인)는 F31 · F32 · F33 과 병렬로 만들어져 crista_web 으로 직접 넣는다(설명서 ④-2).
 * 시뮬레이션은 LLM 을 끈 채 — 교사를 기다리지 않고 시작 직후 규칙 결과(result_source 'rule')가 정해져 끝나는 게임 일까지 숨는다.
 * 1상은 교사가 공개 전에 통과로 정정해(선택 기능) 뒤 단계를 이어 간다.
 *
 * ① 4명이 동시에 [1상 모집 시작] → 한 줄(부분 고유 키) ② 동시 모집 투자 단계 변경 → 모두 받아들이고 정산 줄 멱등 ③ 최소 인원 전 시작 409
 * ④ 4명 동시 [임상 시작] → 200 하나 · 늦은 쪽 409 · 과금 1회 ⑤ AI 꺼짐 → 규칙 결과 · 끝나는 날까지 숨김 ⑥ 교사 정정(선택) → 통과 공개 · 전광판 ⑦ 2상 보류 · 사이드바
 * ⑧ 바운티 오답 · 60초 · 정답 환급 1회 ⑨ 재도전 경로 동시 → 한 줄 ⑩ 공개 범위(전광판 소식에 SMILES · 물성 없음).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  CLINICAL_API,
  type ApiErrorBody,
  type BoardResponse,
  type ClinicalResponse,
  type MeResponse,
  type TeacherClassDetail,
  type TeacherTrialView,
} from '@crista-web/web-contract';
import type { Deps } from '../src/context.ts';
import { runSimulation, trialBountyKey } from '../src/features/clinical.ts';
import { compactSim, ruleSimulate, type TrialFacts } from '../src/features/clinical-sim.ts';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3406}`;
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
  constructor(name: string) {
    this.name = name;
  }
  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<Reply<T>> {
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
  clinical = async (): Promise<ClinicalResponse> => {
    const r = await this.call<ClinicalResponse>('GET', CLINICAL_API.view);
    if (r.status !== 200) throw new Error(`${this.name} 임상 읽기 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
  board = async (): Promise<BoardResponse> => (await this.call<BoardResponse>('GET', API.board)).body;
}
const code = (r: Reply) => (r.body as ApiErrorBody | null)?.error?.code;
const statuses = (rs: Reply[]) => rs.map((r) => `${r.status}${code(r) ? `:${code(r)}` : ''}`).join(',');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(fn: () => Promise<T | undefined>, ms: number, label: string): Promise<T> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const hit = await fn();
    if (hit !== undefined) return hit;
    await sleep(500);
  }
  throw new Error(`${label} — ${ms}ms 안에 오지 않았습니다.`);
}

const db = new pg.Pool({ connectionString: process.env.WEB_DATABASE_URL, max: 2, application_name: 'crista-web-e2e-clinical' });
const sql = async <T extends pg.QueryResultRow = Record<string, unknown>>(text: string, args: unknown[] = []) => (await db.query<T>(text, args)).rows;

/** 앞 단계 시험 데이터 — 도킹 · ADMET 2쌍 · 특허 2건(주력 · 백업) · 동물실험 2건 · IND 승인(경구 50 mg). crista_web 연결 · 한 트랜잭션. */
async function seedUpToInd(args: { classId: string; teamId: string; revisionId: string; targetId: string; userId: string; ticker: string }): Promise<{ mainPatent: string; backupPatent: string }> {
  const client = await db.connect();
  const mols = [
    { smiles: 'CC(=O)Nc1ccc(O)cc1', kcal: -10.6, code: `${args.ticker.slice(0, 3)}-1${suffix.slice(0, 2).replace(/[a-f]/g, '7')}` },
    { smiles: 'O=C(O)Cc1ccccc1Nc1c(Cl)cccc1Cl', kcal: -9.9, code: `${args.ticker.slice(0, 3)}-2${suffix.slice(0, 2).replace(/[a-f]/g, '8')}` },
  ];
  const out: string[] = [];
  const admets: string[] = [];
  try {
    await client.query('begin');
    for (const [i, m] of mols.entries()) {
      const dock = randomUUID();
      const admet = randomUUID();
      const common = [args.teamId, args.classId, args.userId, args.targetId, args.revisionId, m.smiles];
      await client.query(
        `insert into web.jobs (id, team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, canonical_smiles,
                               status, progress, source, test, affinity_kcal, finished_at)
         values ($1, $2, $3, $4, $5, '2.1', 3, 'docking', '{}', 'e2e 도킹', $6, $7, $8, $8, 'succeeded', 1, 'fixture', true, $9, now())`,
        [dock, ...common.slice(0, 3), `e2edock${suffix}${i}xx`, ...common.slice(3), m.kcal],
      );
      await client.query(
        `insert into web.jobs (id, team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, canonical_smiles,
                               status, progress, source, test, parent_job_id, finished_at)
         values ($1, $2, $3, $4, $5, '2.2', 4, 'admet', '{}', 'e2e ADMET', $6, $7, $8, $8, 'succeeded', 1, 'fixture', true, $9, now())`,
        [admet, ...common.slice(0, 3), `e2eadmet${suffix}${i}x`, ...common.slice(3), dock],
      );
      const app = randomUUID();
      await client.query(
        `insert into web.patent_applications (id, program_revision_id, team_id, class_id, admet_job_id, code_name, status, created_by) values ($1, $2, $3, $4, $5, $6, 'accepted', $7)`,
        [app, args.revisionId, args.teamId, args.classId, admet, m.code, args.userId],
      );
      const patent = randomUUID();
      await client.query(
        `insert into web.patents (id, class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
         values ($1, $2, coalesce((select max(class_seq) from web.patents where class_id = $2), 0) + 1, $3, $4, $5, $6, $7, $8, $8, $9, 0)`,
        [patent, args.classId, `KR-E2E-${suffix}${i}`, args.teamId, args.revisionId, app, admet, m.smiles, m.code],
      );
      const animal = {
        kind: 'animal_study', level: 'standard', animalsUsed: 82, pk: { oralBioavailabilityPct: 60, brainPlasmaRatio: null }, efficacyVsReferencePct: 90,
        noaelMgPerKgDay: { rat: 30, dog: 10 }, hedMgPerKg: 5.4, safetyFactor: 10, mrsdMgByForm: { oral: 50, iv: 10, transdermal: 100 }, findings: i === 0 ? ['liver'] : [], painGrade: 'C', humaneEndpoints: 0,
      };
      await client.query(
        `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, program_revision_id, status, progress, source, test,
                               patent_id, design_key, ends_game_day, result, finished_at)
         values ($1, $2, $3, $4, '3.2', 5, 'animal_study', '{}', 'e2e 동물실험', $5, 'succeeded', 1, 'simulation', true, $6, 'animal:standard', 0, $7, now())`,
        [args.teamId, args.classId, args.userId, `e2eanim${suffix}${i}xx`, args.revisionId, patent, JSON.stringify(animal)],
      );
      out.push(patent);
      admets.push(admet);
    }
    await client.query('update web.program_revisions set lead_job_id = $2, backup_job_id = $3, lead_set_at = now(), lead_set_by = $4, lead_version = lead_version + 1 where id = $1', [
      args.revisionId, admets[0], admets[1], args.userId,
    ]);
    await client.query(
      `insert into web.ind_applications (program_revision_id, team_id, patent_id, form, dose_mg, population, endpoint, status, e_score, s_score, score_input,
                                         submitted_at, submitted_game_day, decide_game_day, decided_game_day, created_by)
       values ($1, $2, $3, 'oral', 50, '메트포르민 단독요법으로 혈당이 조절되지 않는 2형 당뇨병 환자', '24주 시점 당화혈색소(HbA1c) 변화량', 'approved', 60, 70, '{}', now(), 0, 30, 30, $4)`,
      [args.revisionId, args.teamId, out[0], args.userId],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  return { mainPatent: out[0]!, backupPatent: out[1]! };
}

/** 학급 시계를 앞당긴다(시험 전용 — 교사 화면의 배속 대신). 처리기(5초 틱)가 돌 때까지 기다린다. */
async function advance(classId: string, days: number): Promise<void> {
  await sql('update web.classes set clock_anchor_day = clock_anchor_day + $2 where id = $1', [classId, days]);
}

async function main(): Promise<void> {
  if (!(await fetch(`${BASE}${API.health}`).catch(() => null))?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);
  // 준비 — 교사 · 학급 · 학생 4 · 입사 · 등기 · 표적.
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', `tc${suffix}`, '--name', `임상 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  const secret = JSON.parse(run.stdout.trim()) as { password: string };
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: `tc${suffix}`, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `임상 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const team = cls.teams[0]!;
  const people = ['a', 'b', 'c', 'd'].map((n) => new Agent(`학생${n.toUpperCase()}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `c${suffix}${'abcd'[i]}`, displayName: s.name, password: `pw-${suffix}-clinical` });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join(team.id))).status, 200);
  }
  const [sa, sb, sc, sd] = people as [Agent, Agent, Agent, Agent];
  const ticker = `C${suffix.replace(/[0-9]/g, (n) => 'ABCDEFGHIJ'[Number(n)]!).toUpperCase()}`.slice(0, 4);
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `임상제약${suffix}`, ticker })).status, 201);
  const start = await sa.board();
  const disease = start.diseases.find((d) => d.targetId === 'dpp4-1x70') ?? start.diseases[0]!;
  assert.equal((await sa.call('POST', API.target, { diseaseId: disease.diseaseId })).status, 200);
  const b0 = await sa.board();

  await check('IND 전 — 4.1 잠김 · 임상 화면은 열리지 않음', async () => {
    assert.equal(b0.steps.find((s) => s.id === '4.1')!.state, 'locked');
    const c = await sa.clinical();
    assert.equal(c.enabled, false);
    assert.equal((await sa.call('POST', CLINICAL_API.open, { route: 'first' })).status, 409);
  });

  const seeded = await seedUpToInd({ classId: cls.id, teamId: team.id, revisionId: b0.program.revisionId, targetId: disease.targetId, userId: sa.userId, ticker });
  if (process.env.E2E_CLINICAL_STOP === 'ind') {
    // 화면 점검용 — IND 승인까지만 넣고 끝낸다(화면에서 1상 모집부터 직접 눌러 본다).
    console.log(JSON.stringify({ stop: 'ind', login: `c${suffix}a`, password: `pw-${suffix}-clinical`, teacher: `tc${suffix}`, teacherPassword: secret.password, classId: cls.id, teamId: team.id }));
    await db.end();
    return;
  }
  const c0 = await sa.clinical();
  await check('IND 승인 뒤 — 4.1 준비 · 첫 경로는 1상 모집 시작 · 후보 · 백업 · MRSD', async () => {
    assert.equal(c0.enabled, true);
    assert.deepEqual(c0.routes.map((r) => r.route), ['first']);
    assert.equal(c0.candidate?.backup?.patentId, seeded.backupPatent);
    // 첫 1상 전에도 IND 승인서로 미리 계산한 E · S · 참고 확률(0 이 아님).
    assert.ok(c0.ladder[0]!.safety > 0 && c0.ladder[0]!.efficacy > 0 && (c0.candidate?.safety ?? 0) > 0, JSON.stringify(c0.ladder[0]));
    const s41 = (await sa.board()).steps.find((s) => s.id === '4.1')!;
    assert.equal(s41.state, 'ready');
    assert.equal(s41.sub, '1상 준비');
  });

  // ① 동시 [1상 모집 시작]
  const opens = await Promise.all(people.map((s) => s.call<{ trialId: string }>('POST', CLINICAL_API.open, { route: 'first' })));
  const trial1 = opens.find((r) => r.status === 201)?.body.trialId ?? '';
  await check('① 4명 동시 [1상 모집 시작] → 201 하나 · 나머지 409 · 살아 있는 시도 한 줄', async () => {
    assert.equal(opens.filter((r) => r.status === 201).length, 1, statuses(opens));
    assert.ok(opens.filter((r) => r.status !== 201).every((r) => r.status === 409), statuses(opens));
    const rows = await sql<{ n: number }>("select count(*)::int as n from web.clinical_trials where team_id = $1 and status in ('recruiting', 'running', 'pending')", [team.id]);
    assert.equal(rows[0]!.n, 1);
  });

  await check('③ 최소 인원 전 [임상 시작] → 409 · 과금 없음', async () => {
    const r = await sb.call('POST', CLINICAL_API.start(trial1));
    assert.equal(r.status, 409, JSON.stringify(r.body));
    const fee = await sql('select 1 from web.ledger where team_id = $1 and idem_key = $2', [team.id, `trial:${trial1}:start`]);
    assert.equal(fee.length, 0);
  });

  // ② 동시 투자 단계 변경 — 시계를 조금씩 밀며 정산이 여러 번 일어나게.
  await advance(cls.id, 3);
  const tiers = await Promise.all(people.map((s, i) => s.call<{ tier: string }>('PUT', CLINICAL_API.tier(trial1), { tier: (['expanded', 'focus', 'basic', 'focus'] as const)[i] })));
  await check('② 4명 동시 모집 투자 단계 변경 → 모두 200(줄 세움) · 정산 줄 seq 겹침 없음 · 원장 멱등 키 겹침 없음', async () => {
    assert.deepEqual(tiers.map((r) => r.status), [200, 200, 200, 200], statuses(tiers));
    const log = await sql<{ seq: number }>('select seq from web.clinical_recruit_log where trial_id = $1 order by seq', [trial1]);
    assert.deepEqual(log.map((l) => l.seq), log.map((_, i) => i + 1));
    const dup = await sql<{ n: number }>(`select count(*)::int as n from (select idem_key from web.ledger where team_id = $1 group by idem_key having count(*) > 1) x`, [team.id]);
    assert.equal(dup[0]!.n, 0);
  });
  assert.equal((await sa.call('PUT', CLINICAL_API.tier(trial1), { tier: 'focus' })).status, 200);
  const balBefore = (await sa.board()).balanceCents;
  const spent0 = (await sa.clinical()).current!.recruit.spentCrista;
  await advance(cls.id, 20);
  const recruited = await waitFor(async () => {
    const c = await sa.clinical();
    return c.current && c.current.recruit.enrolled >= c.current.recruit.minN && c.current.recruit.spentCrista > spent0 ? c : undefined;
  }, 20_000, '모집이 최소 인원에 닿고 정산됨');
  await check('모집 — 게임 일마다 늘고(집중 투자) · 그 단계 비용이 원장에 · 곡선 점 · 검정력 · 남은 날', async () => {
    const r = recruited.current!.recruit;
    assert.ok(r.enrolled >= r.minN, `${r.enrolled}/${r.minN}`);
    assert.ok(r.spentCrista > 0);
    assert.ok((await sa.board()).balanceCents < balBefore);
    assert.ok(r.curve.length >= 2);
    assert.ok(r.power > 0 && r.power <= 1);
    assert.equal(r.tiers.length, 3);
    const recruitRows = await sql("select 1 from web.ledger where team_id = $1 and ref_type = 'clinical_recruit'", [team.id]);
    assert.ok(recruitRows.length >= 1);
  });

  // ④ 4명 동시 [임상 시작]
  const starts = await Promise.all(people.map((s) => s.call<{ started: boolean }>('POST', CLINICAL_API.start(trial1))));
  if (process.env.E2E_CLINICAL_LLM === '1') {
    // 실제 Claude 시뮬레이션 1건(비용 — 이 모드에서만) — 결과가 서버 검사를 통과해 저장되고, 끝나는 날 공개되는지.
    const ready = await waitFor(async () => {
      const row = (await sql<{ sim_status: string; result_model: string | null; sim_error: string | null; sim_attempts: number }>('select sim_status, result_model, sim_error, sim_attempts from web.clinical_trials where id = $1', [trial1]))[0]!;
      return row.sim_status === 'ready' || row.sim_status === 'manual' ? row : undefined;
    }, 400_000, '실제 Claude 시뮬레이션');
    console.log(`  · 시뮬레이션 ${ready.sim_status} · 모델 ${ready.result_model ?? '—'} · 시도 ${ready.sim_attempts} · ${ready.sim_error ?? ''}`);
    await check('실제 Claude 시뮬레이션 — 스키마 · 서버 검사 통과(ready) · 시작 전에는 학생에게 결과 없음', async () => {
      assert.equal(ready.sim_status, 'ready', ready.sim_error ?? '');
      assert.equal((await sa.clinical()).current?.result, null);
    });
    await advance(cls.id, 95);
    const shown = await waitFor(async () => {
      const t = (await sa.clinical()).trials.find((x) => x.id === trial1);
      return t?.result ? t : undefined;
    }, 20_000, '끝나는 날 공개');
    await check('실제 Claude 결과 — 끝나는 날 공개 · 출처 llm · 판정 · 분석 글', async () => {
      assert.equal(shown.resultSource, 'llm');
      assert.ok(shown.verdict === 'pass' || shown.verdict === 'held');
      assert.ok((shown.result?.analysis.length ?? 0) > 10);
      console.log(`  · ${shown.verdict} ${shown.holdKind ?? ''} — ${shown.result?.analysis}`);
    });
    await db.end();
    console.log(failed === 0 ? `\n모두 통과(접미 ${suffix})` : `\n실패 ${failed}건(접미 ${suffix})`);
    process.exitCode = failed === 0 ? 0 : 1;
    return;
  }
  await check('④ 4명 동시 [임상 시작] → 200 하나 · 늦은 셋 409 already_exists · 상 비용 과금 1회(1,500,000 크리스타)', async () => {
    assert.equal(starts.filter((r) => r.status === 200 && r.body.started).length, 1, statuses(starts));
    assert.equal(starts.filter((r) => r.status === 409 && code(r) === 'already_exists').length, 3, statuses(starts));
    const fee = await sql<{ amount_cents: string }>('select amount_cents from web.ledger where team_id = $1 and idem_key = $2', [team.id, `trial:${trial1}:start`]);
    assert.equal(fee.length, 1);
    assert.equal(Number(fee[0]!.amount_cents), -30_000_000);
    const c = await sa.clinical();
    assert.equal(c.current?.status, 'running');
    assert.equal(c.current?.result, null);
    assert.ok((c.current?.monitoring.length ?? 0) >= 1);
  });

  // ⑤ AI 꺼짐 — 교사를 기다리지 않고 규칙 결과가 바로 정해지되, 끝나는 게임 일까지 숨는다.
  const ruled = await waitFor(async () => {
    const r = await teacher.call<{ trials: TeacherTrialView[] }>('GET', CLINICAL_API.teacher(cls.id));
    const t = r.body.trials?.find((x) => x.id === trial1);
    return t?.simStatus === 'ready' ? t : undefined;
  }, 20_000, '규칙 결과(rule)');
  await check('⑤ AI 꺼짐 → 규칙 결과(참고 판정과 같은 판정) · 학생에게는 끝나는 날까지 숨김 · 교사 화면 학생 403', async () => {
    assert.equal(ruled.resultSource, 'rule');
    assert.ok(ruled.reference && typeof ruled.reference.passProb === 'number');
    assert.equal(ruled.result?.verdict, ruled.reference!.passed ? 'pass' : 'held');
    const c = await sa.clinical();
    assert.equal(c.current?.status, 'running');
    assert.equal(c.current?.result, null);
    assert.equal((await sa.call('GET', CLINICAL_API.teacher(cls.id))).status, 403);
  });

  // ⑥ 교사 정정(선택) — 공개 전에 통과로 → 끝나는 날 공개
  const dec = await teacher.call('POST', CLINICAL_API.teacherDecide(trial1), { verdict: 'pass', note: 'e2e', override: true });
  await advance(cls.id, 95);
  await waitFor(async () => ((await sa.clinical()).trials.find((x) => x.id === trial1)?.status === 'completed' ? true : undefined), 20_000, '1상 공개');
  await check('⑥ 교사 정정 통과 → 끝나는 날 결과 공개(규칙 생성 표) · 전광판 통과 소식 · 다음 경로 2상', async () => {
    assert.equal(dec.status, 200, JSON.stringify(dec.body));
    const c = await sa.clinical();
    const t = c.trials.find((x) => x.id === trial1)!;
    assert.equal(t.status, 'completed');
    assert.equal(t.verdict, 'pass');
    assert.equal(t.resultSource, 'teacher');
    assert.ok(t.result && t.result.arms.length === 4);
    assert.deepEqual(c.routes.map((r) => `${r.route}:${r.phase}`), ['next:phase2']);
    const ev = await sql<{ kind: string; headline: string }>("select kind, headline from web.board_events where class_id = $1 and idem_key = $2", [cls.id, `trial:${trial1}:verdict`]);
    assert.equal(ev[0]?.kind, 'trial_pass');
    assert.match(ev[0]!.headline, /1상 통과/);
    assert.equal((await sa.board()).steps.find((s) => s.id === '4.1')!.sub, '2상 준비');
  });

  // ⑦ 2상 — 열기 · 모집 · 시작 · 보류
  const open2 = await Promise.all([sb, sc].map((s) => s.call<{ trialId: string }>('POST', CLINICAL_API.open, { route: 'next' })));
  const trial2 = open2.find((r) => r.status === 201)?.body.trialId ?? '';
  assert.ok(trial2, statuses(open2));
  assert.equal((await sc.call('PUT', CLINICAL_API.tier(trial2), { tier: 'focus' })).status, 200);
  await advance(cls.id, 60);
  await waitFor(async () => {
    const c = await sa.clinical();
    return c.current && c.current.recruit.enrolled >= c.current.recruit.minN ? c : undefined;
  }, 20_000, '2상 최소 인원');
  assert.equal((await sd.call('POST', CLINICAL_API.start(trial2))).status, 200);
  // 경합: AI 시뮬레이션이 임대한 채 부르는 사이에 교사가 수동 판정 → 늦게 온 AI 결과가 교사 판정을 덮지 않아야 한다.
  // 이 프로세스에서 runSimulation 을 가짜 LLM 으로 돌린다(실제 Claude 호출 없음) — 가짜 LLM 이 답하기 전에 교사 HTTP 판정을 끼워 넣는다.
  const row2 = (await sql<{ facts: TrialFacts; reference: { passProb: number; cohort: string; enrolled: number } }>('select facts, reference from web.clinical_trials where id = $1', [trial2]))[0]!;
  const lateLlmResult = compactSim(row2.facts, ruleSimulate({ facts: row2.facts, enrolled: row2.reference.enrolled, refPassProb: row2.reference.passProb, cohort: row2.reference.cohort }, 'pass', null));
  let teacherDuring = 0;
  const fakeDeps = {
    db,
    llm: {
      available: true,
      call: async () => {
        teacherDuring = (await teacher.call('POST', CLINICAL_API.teacherDecide(trial2), { verdict: 'held', holdKind: 'efficacy' })).status;
        return { kind: 'ok', output: lateLlmResult, model: 'fake-e2e', usage: {}, latencyMs: 1, fallbackUsed: false };
      },
    },
    hub: { broadcastTeam() {}, broadcastClass() {}, broadcastTeachers() {}, publish() {} },
  } as unknown as Deps;
  // 서버가 [임상 시작] 뒤 비동기로 넣는 규칙 결과를 먼저 기다린다(안 기다리면 되돌린 뒤에 늦게 들어와 교사 판정이 409).
  await waitFor(async () => (await sql<{ s: string }>('select sim_status as s from web.clinical_trials where id = $1', [trial2]))[0]?.s === 'ready' || undefined, 20_000, '2상 규칙 결과');
  // 로컬 DB 연결 상한(여러 서버가 같이 씀)에 걸리면 runSimulation 이 오류를 삼킨다 — 가짜 LLM 이 불릴 때까지 몇 번 다시.
  for (let i = 0; i < 8 && teacherDuring === 0; i++) {
    // 서버는 AI 를 끈 채라 시작 직후 규칙 결과('rule')를 이미 넣었다 — 그 결과를 지우고 AI 차례로 되돌린다.
    await sql(
      `update web.clinical_trials set sim_status = 'queued', sim_next_at = null, sim_attempts = 0, result = null, result_source = null, result_model = null
        where id = $1 and status = 'running' and (sim_status <> 'ready' or result_source = 'rule')`,
      [trial2],
    );
    await runSimulation(fakeDeps, trial2);
    if (teacherDuring === 0) await sleep(1500);
  }
  await check('경합 — AI 호출 중 교사 수동 판정 → 교사 판정이 남고 늦은 AI 결과는 버림', async () => {
    assert.equal(teacherDuring, 200);
    const r = (await sql<{ sim_status: string; result_source: string; result: { verdict: string } }>('select sim_status, result_source, result from web.clinical_trials where id = $1', [trial2]))[0]!;
    assert.equal(r.sim_status, 'ready');
    assert.equal(r.result_source, 'teacher');
    assert.equal(r.result.verdict, 'held');
    const cached = await sql('select 1 from web.clinical_sim_cache c join web.clinical_trials t on t.input_hash = c.input_hash where t.id = $1', [trial2]);
    assert.equal(cached.length, 0, '버린 AI 결과는 캐시에도 넣지 않는다');
  });
  await check('교사 정정 — 결과가 있으면 override 없이 409 · override 면 공개 전 바꿈 · 동시 정정 2건은 둘 다 받아도 판정은 하나', async () => {
    const plain = await teacher.call('POST', CLINICAL_API.teacherDecide(trial2), { verdict: 'pass' });
    assert.equal(plain.status, 409, JSON.stringify(plain.body));
    const flips = await Promise.all([
      teacher.call('POST', CLINICAL_API.teacherDecide(trial2), { verdict: 'pass', override: true }),
      teacher.call('POST', CLINICAL_API.teacherDecide(trial2), { verdict: 'held', holdKind: 'efficacy', override: true }),
    ]);
    assert.ok(flips.every((r) => r.status === 200), statuses(flips));
    // 끝에 남길 판정은 보류(효능) — 아래 ⑦ 시험이 이어진다.
    assert.equal((await teacher.call('POST', CLINICAL_API.teacherDecide(trial2), { verdict: 'held', holdKind: 'efficacy', override: true })).status, 200);
    const tv = (await teacher.call<{ trials: TeacherTrialView[] }>('GET', CLINICAL_API.teacher(cls.id))).body.trials.find((x) => x.id === trial2)!;
    assert.equal(tv.result?.verdict, 'held');
    assert.equal(tv.reference?.llmOriginal, null, '교사가 만든 결과를 고친 것은 AI 원본이 아니다');
  });
  await check('⑦ 결과는 끝나는 날까지 숨김(교사가 미리 판정해도)', async () => {
    const c = await sa.clinical();
    assert.equal(c.current?.id, trial2);
    assert.equal(c.current?.status, 'running');
    assert.equal(c.current?.result, null);
  });
  await advance(cls.id, 185);
  const held = await waitFor(async () => {
    const c = await sa.clinical();
    const t = c.trials.find((x) => x.id === trial2);
    return t?.status === 'held' ? c : undefined;
  }, 20_000, '2상 보류 공개');
  await check('⑦ 2상 보류 공개 · 사이드바 "2상 보류 · 재도전 가능" · 재도전 3경로 · 전광판 빨강', async () => {
    const t = held.trials.find((x) => x.id === trial2)!;
    assert.equal(t.holdKind, 'efficacy');
    assert.deepEqual(held.routes.map((r) => r.route), ['same', 'amend', 'backup']);
    const s41 = (await sa.board()).steps.find((s) => s.id === '4.1')!;
    assert.equal(s41.state, 'held');
    assert.equal(s41.sub, '2상 보류 · 재도전 가능');
    const ev = await sql<{ tone: string; public: Record<string, unknown> }>('select tone, public from web.board_events where class_id = $1 and idem_key = $2', [cls.id, `trial:${trial2}:verdict`]);
    assert.equal(ev[0]?.tone, 'bad');
    assert.equal(ev[0]?.public.holdKind, 'efficacy');
  });

  // ⑧ 바운티
  const trialRow = (await sql<Parameters<typeof trialBountyKey>[0]>('select phase, hold_kind, reference, facts, dose_mg, form from web.clinical_trials where id = $1', [trial2]))[0]!;
  const key = trialBountyKey(trialRow);
  const analysis = '2상에서 위약 대비 HbA1c 차이가 유의하지 않았어요. 흡수와 용량 효능을 다시 보고 다음에는 처방을 바꿔 볼게요.';
  const wrong = await sa.call<{ passed: boolean; hints: string[] }>('POST', CLINICAL_API.bounty(trial2), { axis: 'safety', factors: [], remedy: 'same_retry', analysis });
  const again = await sb.call('POST', CLINICAL_API.bounty(trial2), { axis: key.axis, factors: key.factors, remedy: key.validRemedies[0] ?? 'same_retry', analysis });
  await check('⑧ 바운티 오답 → 힌트 · 60초 안 다시 → 429', async () => {
    assert.equal(wrong.status, 200);
    assert.equal(wrong.body.passed, false);
    assert.ok(wrong.body.hints.length >= 1);
    assert.equal(again.status, 429, JSON.stringify(again.body));
  });
  await sql("update web.clinical_bounties set last_attempt_at = now() - interval '61 seconds' where trial_id = $1", [trial2]);
  const rights = await Promise.all([sc, sd].map((s) => s.call<{ passed: boolean; refundCrista: number }>('POST', CLINICAL_API.bounty(trial2), { axis: key.axis, factors: key.factors, remedy: key.validRemedies[0] ?? 'same_retry', analysis })));
  await check('⑧ 정답 동시 2건 → 한 번만 환급(2상 비용 40% = 1,200,000 크리스타) · 늦은 쪽 409', async () => {
    assert.ok(key.validRemedies.length > 0, '유효한 처방이 하나 이상');
    const ok = rights.filter((r) => r.status === 200 && r.body.passed);
    assert.equal(ok.length, 1, statuses(rights));
    assert.equal(ok[0]!.body.refundCrista, 1_200_000);
    assert.ok(rights.some((r) => r.status === 409), statuses(rights));
    const credits = await sql("select 1 from web.ledger where team_id = $1 and kind = 'failure_bounty'", [team.id]);
    assert.equal(credits.length, 1);
  });

  if (process.env.E2E_CLINICAL_STOP === 'held') {
    // 화면 점검용 — 보류 상태(재도전 탭)를 남기고 끝낸다.
    console.log(`보류 상태로 멈춤 — 로그인 c${suffix}a / pw-${suffix}-clinical`);
    await db.end();
    process.exitCode = failed === 0 ? 0 : 1;
    return;
  }

  // ⑨ 재도전 경로 동시 — 같은 프로토콜 · 용량 변경 · 백업 교체가 한꺼번에 와도 한 줄
  const c9 = await sa.clinical();
  const amend = c9.routes.find((r) => r.route === 'amend')?.options?.find((o) => o.ok);
  const retries = await Promise.all([
    sa.call('POST', CLINICAL_API.open, { route: 'same' }),
    sb.call('POST', CLINICAL_API.open, amend ? { route: 'amend', form: amend.form, doseMg: amend.doseMg } : { route: 'same' }),
    sc.call('POST', CLINICAL_API.open, { route: 'backup' }),
    sd.call('POST', CLINICAL_API.open, { route: 'same' }),
  ]);
  await check('⑨ 재도전 3경로 동시 4건 → 201 하나 · 살아 있는 시도 한 줄 · 백업이 이기면 수수료 1회', async () => {
    assert.equal(retries.filter((r) => r.status === 201).length, 1, statuses(retries));
    const live = await sql<{ route: string; attempt: number; phase: string }>("select route, attempt, phase from web.clinical_trials where team_id = $1 and status = 'recruiting'", [team.id]);
    assert.equal(live.length, 1);
    const backupFees = await sql("select 1 from web.ledger where team_id = $1 and ref_type = 'clinical_backup'", [team.id]);
    assert.equal(backupFees.length, live[0]!.route === 'backup' ? 1 : 0);
    if (live[0]!.route === 'same') assert.deepEqual([live[0]!.phase, live[0]!.attempt], ['phase2', 2]);
  });

  // ⑩ 공개 범위
  await check('⑩ 전광판 소식(공개)에 SMILES · 물성 · 점수 없음', async () => {
    const ev = await sql<{ headline: string; public: Record<string, unknown> }>('select headline, public from web.board_events where class_id = $1', [cls.id]);
    assert.ok(ev.length >= 3);
    for (const e of ev) {
      const text = `${e.headline} ${JSON.stringify(e.public)}`;
      assert.ok(!/c1ccc|Nc1|CC\(=O\)/.test(text), text);
      assert.ok(!/efficacy"?:\s*\d|safety"?:\s*\d|clogp|tpsa/i.test(text), text);
    }
  });

  await db.end();
  console.log(failed === 0 ? `\n모두 통과(접미 ${suffix})` : `\n실패 ${failed}건(접미 ${suffix})`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error(error);
  await db.end().catch(() => {});
  process.exitCode = 1;
});
