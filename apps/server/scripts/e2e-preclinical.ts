/**
 * F32 3.2 전임상 점검(설계 §5.9 · §7.4 ⑪ ⑫ ⑬ ⑭) — 4인 모둠이 같은 3.2 화면을 동시에 만지는 경우를 떠 있는 로컬 서버에 실제 HTTP 로 보낸다.
 *
 *   WEB_PORT=3404 LLM_DISABLED=1 node tools/with-local-env.mjs node apps/server/src/index.ts   (다른 터미널 — LLM 을 끄면 심의가 pending → 교사 수동 판정 경로)
 *   WEB_PORT=3404 npm run e2e:preclinical
 *
 * 앞 단계(1.2 → 3.1)는 이 점검의 대상이 아니라서 crista_web 연결로 직접 넣는다(도킹 · ADMET 작업 · 특허 후보 · 출원서 · 특허 3건 — 물성은 출원서 칸에).
 * 워커는 부르지 않는다(물성은 F31 출원서가 저장한 값을 쓴다).
 *
 * 1. 윤리 교육 — 틀리면 이수 아님 · 4명이 동시에 내도 사람마다 한 줄 · 미이수자는 동물실험 403(대체 시험은 누구나).
 * 2. 계획서 설정 동시 저장 → 1명만 200 · 나머지 409 stale. 칸 4개 동시 → 모두 저장 · 같은 칸 동시 → 늦은 쪽 409 + 상대 글.
 * 3. 심의 — '많이'는 규칙에서 바로 보완 · 고친 뒤 접수(LLM 꺼짐 → pending) · 둘이 동시에 내도 그 판 심사는 하나 · 교사 수동 통과 → 승인 스냅숏.
 * 4. 동물실험 동시 실행(⑬) — 같은 (특허 · 설계)를 둘이 동시에 → 1건만 과금 · 승인 판에 없는 후보 409 · 게임 시계로 끝(결정적).
 * 5. 계산 칸 — 틀린 칸만 짚음 · 맞으면 저장 · 늦은 틀린 답이 덮지 않음. 같은 설계 다시 실행 → 과금 없이 옛 결과.
 * 6. 주력 · 백업 동시 지정(⑭) — 1명만 200 · 나머지 409 stale · 근거 칩 막음 400 · 동물실험 없는 후보 409 · 3.2 완료 · 전광판 소식(공개 칸만).
 * 7. 교사 학급 합계 · 다른 모둠은 남의 특허로 실행 불가 · DB 키(같은 특허 · 설계 두 줄 거절) · 요청 번호가 다른 단계 작업과 겹치면 409.
 * 8. 변경 심의 → 새 판 승인 뒤 옛 판 정정은 지금 승인을 건드리지 않음 · 지금 판 정정은 실행이 있으면 승인 기록을 남기고 상태만 보완.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  API,
  ANIMALS_PER_CANDIDATE,
  ANIMAL_STUDY_COST_CENTS,
  PRECLINICAL_API,
  type ApiErrorBody,
  type BoardResponse,
  type MeResponse,
  type PreclinicalResponse,
  type PreclinicalRunResponse,
  type PreclinicalTeacherView,
  type ReviewRequestResponse,
  type TeacherClassDetail,
} from '@crista-web/web-contract';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? 3404}`;
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
  state = async (): Promise<PreclinicalResponse> => {
    const r = await this.call<PreclinicalResponse>('GET', PRECLINICAL_API.state);
    if (r.status !== 200) throw new Error(`${this.name} 3.2 읽기 ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  };
  board = async (): Promise<BoardResponse> => (await this.call<BoardResponse>('GET', API.board)).body;
}

const err = (r: Reply) => (r.body as ApiErrorBody | null)?.error;
const statuses = (rs: Reply[]) => rs.map((r) => `${r.status}${err(r) ? `:${err(r)!.code}` : ''}`).join(',');
const rid = () => randomBytes(12).toString('hex');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createTeacher(loginId: string): { userId: string; password: string } {
  const run = spawnSync(process.execPath, [join(here, 'teacher-create.ts'), '--login', loginId, '--name', `전임상 점검 ${suffix}`, '--json'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`teacher:create 실패: ${run.stderr}`);
  return JSON.parse(run.stdout.trim()) as { userId: string; password: string };
}

async function db<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.WEB_DATABASE_URL, application_name: 'crista-web-e2e-preclinical' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** 물성 3종 — A: hERG 높음 · 간 보통(Rk 1.85, 설계 예시) · B: 깨끗함 · C: 구조 경고(간 높음). */
const MOLECULES = [
  { key: 'A', smiles: `CN1CCC(CC1)c1ccc(Cl)cc1C${suffix.length}`, props: { mw: 380, clogp: 4.1, tpsa: 60, hbd: 1, hba: 5, rotb: 5, aromaticRings: 2, qed: 0.6, basicAmines: 1, alerts: [] } },
  { key: 'B', smiles: `OC(=O)c1ccc(cc1)C(N)C${suffix.length}`, props: { mw: 320, clogp: 2.0, tpsa: 70, hbd: 2, hba: 4, rotb: 4, aromaticRings: 1, qed: 0.7, basicAmines: 0, alerts: [] } },
  { key: 'C', smiles: `O=[N+]([O-])c1ccc(cc1)C(=O)N${suffix.length}`, props: { mw: 300, clogp: 1.5, tpsa: 95, hbd: 1, hba: 5, rotb: 3, aromaticRings: 1, qed: 0.5, basicAmines: 0, alerts: ['nitro_aromatic'] } },
] as const;

/** 앞 단계 근거를 crista_web 로 넣는다 — 도킹 · ADMET 작업 · 특허 후보 · 출원서(물성) · 유효 특허. */
async function seedPatents(input: { teamId: string; classId: string; revisionId: string; targetId: string; userId: string; referenceKcal: number }): Promise<Record<'A' | 'B' | 'C', string>> {
  return db(async (c) => {
    const ids: Record<string, string> = {};
    for (const [i, m] of MOLECULES.entries()) {
      const flat = `${m.smiles}${suffix}`;
      const dock = await c.query<{ id: string }>(
        `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, canonical_smiles, label,
                               status, progress, source, test, result, affinity_kcal, finished_at)
         values ($1, $2, $3, $4, '2.1', 3, 'docking', '{}', 'seed', $5, $6, $7, $7, $8, 'succeeded', 1, 'fixture', true, '{}', $9, now()) returning id`,
        [input.teamId, input.classId, input.userId, rid(), input.targetId, input.revisionId, flat, `seed-${m.key}`, input.referenceKcal],
      );
      const admet = await c.query<{ id: string }>(
        `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, canonical_smiles, label,
                               parent_job_id, status, progress, source, test, result, finished_at)
         values ($1, $2, $3, $4, '2.2', 4, 'admet', '{}', 'seed', $5, $6, $7, $7, $8, $9, 'succeeded', 1, 'fixture', true, '{}', now()) returning id`,
        [input.teamId, input.classId, input.userId, rid(), input.targetId, input.revisionId, flat, `seed-${m.key}`, dock.rows[0]!.id],
      );
      await c.query(
        `insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, 1, 'seed')
         on conflict do nothing`,
        [input.revisionId, input.teamId, admet.rows[0]!.id, input.userId],
      );
      const code = `TST-${100 + i + 1}`;
      const props = { canonicalSmiles: flat, flatSmiles: flat, engine: 'e2e', ...m.props };
      const app = await c.query<{ id: string }>(
        `insert into web.patent_applications (program_revision_id, team_id, class_id, admet_job_id, code_name, status, canonical_smiles, flat_smiles, properties, created_by)
         values ($1, $2, $3, $4, $5, 'accepted', $6, $6, $7, $8) returning id`,
        [input.revisionId, input.teamId, input.classId, admet.rows[0]!.id, code, flat, JSON.stringify(props), input.userId],
      );
      const pat = await c.query<{ id: string }>(
        `insert into web.patents (class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
         values ($1, (select coalesce(max(class_seq), 0) + 1 from web.patents where class_id = $1), $2, $3, $4, $5, $6, $7, $7, $8, 0) returning id`,
        [input.classId, `KR-E2E-${suffix}-${i}`, input.teamId, input.revisionId, app.rows[0]!.id, admet.rows[0]!.id, flat, code],
      );
      ids[m.key] = pat.rows[0]!.id;
    }
    return ids as Record<'A' | 'B' | 'C', string>;
  });
}

async function main(): Promise<void> {
  const health = await fetch(`${BASE}${API.health}`).catch(() => null);
  if (!health?.ok) throw new Error(`서버(${BASE})가 떠 있지 않습니다.`);

  // 준비 — 교사 · 학급(모둠 2) · 학생 4 + 다른 모둠 1
  const teacherId = `t${suffix}pc`;
  const secret = createTeacher(teacherId);
  const teacher = new Agent('교사');
  assert.equal((await teacher.call('POST', API.login, { loginId: teacherId, password: secret.password })).status, 200);
  const cls = (await teacher.call<TeacherClassDetail>('POST', API.classes, { name: `전임상 점검 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
  const [team, team2] = cls.teams as [TeacherClassDetail['teams'][number], TeacherClassDetail['teams'][number]];
  const password = `pw-${randomBytes(6).toString('hex')}`;
  const people = ['a', 'b', 'c', 'd', 'e'].map((n) => new Agent(`학생${n.toUpperCase()}`));
  for (const [i, s] of people.entries()) {
    const up = await s.call<MeResponse>('POST', API.signup, { classCode: cls.code, loginId: `q${suffix}${'abcde'[i]}`, displayName: s.name, password });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    s.userId = up.body.account.userId;
    assert.equal((await s.call('POST', API.join((i < 4 ? team : team2).id))).status, 200);
  }
  const [sa, sb, sc, sd, other] = people as [Agent, Agent, Agent, Agent, Agent];
  const letters = (n: string) => n.replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]!).toUpperCase();
  assert.equal((await sa.call('POST', API.registration(team.id), { name: `전임상제약${suffix}`, ticker: `PC${letters(suffix).slice(0, 2)}` })).status, 201);
  assert.equal((await other.call('POST', API.registration(team2.id), { name: `다른제약${suffix}`, ticker: `PD${letters(suffix).slice(0, 2)}` })).status, 201);
  const start = await sa.board();
  const ache = start.diseases.find((d) => d.targetId === 'ache-4ey7')!;
  assert.equal((await sa.call('POST', API.target, { diseaseId: ache.diseaseId })).status, 200);
  const rev = (await sa.board()).program.revisionId;
  const ids = await seedPatents({ teamId: team.id, classId: cls.id, revisionId: rev, targetId: ache.targetId, userId: sa.userId, referenceKcal: ache.referenceKcal });
  console.log(`모둠 ${team.id} · 표적 ${ache.targetId} · 특허 3건\n`);
  // 화면 점검용(로컬 시험 계정) — E2E_PRINT_LOGIN=1 이면 학생 A 로그인 정보를 찍는다.
  if (process.env.E2E_PRINT_LOGIN === '1') console.log(`화면 점검 로그인 — 아이디 q${suffix}a · 비밀번호 ${password}\n`);

  const first = await sb.state();
  check('준비 — 3.2 열림 · 유효 특허 3건 · 계획서 없음 · 효력 모델 ACHE(고통등급 C)', () => {
    assert.equal(first.unlocked, true);
    assert.equal(first.patents.length, 3);
    assert.equal(first.protocol, null);
    assert.equal(first.model?.painGrade, 'C');
  });

  // 1. 윤리 교육
  const wrong = await sa.call<{ passed: boolean; correct: Record<string, boolean> }>('POST', PRECLINICAL_API.ethics, { answers: { q1: 'reduction', q2: 'D', q3: 'weight20' } });
  const right = { answers: { q1: 'replacement', q2: 'D', q3: 'weight20' } };
  const ethicsRace = await Promise.all([sa, sb, sa, sb].map((s) => s.call<{ passed: boolean }>('POST', PRECLINICAL_API.ethics, right)));
  const afterEthics = await sc.state();
  check('① 윤리 — 틀리면 그 문제만 짚고 이수 아님 · 둘이 두 번씩 동시에 내도 사람마다 이수 한 줄', () => {
    assert.equal(wrong.body.passed, false);
    assert.deepEqual(wrong.body.correct, { q1: false, q2: true, q3: true });
    assert.deepEqual(ethicsRace.map((r) => r.status), [200, 200, 200, 200], statuses(ethicsRace));
    assert.ok(ethicsRace.every((r) => r.body.passed));
    assert.deepEqual(afterEthics.members.filter((m) => m.trainedAt).map((m) => m.userId).sort(), [sa.userId, sb.userId].sort());
  });

  // 2. 계획서 설정 동시 저장
  const settingsRace = await Promise.all(
    [sa, sb, sc, sd].map((s, i) => s.call('PUT', PRECLINICAL_API.settings, { expectedVersion: 0, ...(i === 0 ? { level: 'high' } : i === 1 ? { painGrade: 'C' } : i === 2 ? { endpointPct: 20 } : { performerIds: [sa.userId] }) })),
  );
  check('② 설정 — 넷이 같은 판으로 동시에 저장하면 1명만 200 · 3명 409 stale', () => {
    assert.equal(settingsRace.filter((r) => r.status === 200).length, 1, statuses(settingsRace));
    assert.equal(settingsRace.filter((r) => r.status === 409 && err(r)?.code === 'stale').length, 3, statuses(settingsRace));
  });
  let st = await sa.state();
  const put = async (s: Agent, body: Record<string, unknown>) => {
    const r = await s.call<{ settingsVersion: number }>('PUT', PRECLINICAL_API.settings, { expectedVersion: st.protocol?.settingsVersion ?? 0, ...body });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    st = await s.state();
  };
  await put(sa, { level: 'high', patentIds: [ids.A, ids.B], painGrade: 'C', endpointPct: 20, performerIds: [sa.userId, sb.userId] });

  const sectionBodies: Record<string, string> = {
    purpose: '사람에게 처음 주기 전에 안전한 최대 용량(MRSD)을 정하려고 동물에서 반복투여 독성을 봐요.',
    replacement: '세포 hERG 패치클램프와 간 오가노이드로 먼저 걸렀어요. 하지만 몸 전체의 흡수와 대사는 세포로 알 수 없어요.',
    reduction: '특허 후보 두 개만 넣고, 통계적으로 믿을 수 있는 알맞게 수준을 골랐어요.',
    refinement: '마취와 진통제를 쓰고, 체중이 20% 줄면 실험을 끝내요. 사육 환경을 넉넉히 해요.',
    species: '설치류와 비설치류에서 독성이 다르게 나올 수 있어 랫드와 비글견을 함께 봐요.',
  };
  const keys = Object.keys(sectionBodies);
  const sectionRace = await Promise.all([sa, sb, sc, sd].map((s, i) => s.call('PUT', PRECLINICAL_API.section(keys[i]!), { body: sectionBodies[keys[i]!], expectedVersion: 0 })));
  const sameSection = await Promise.all([sa, sb].map((s) => s.call<ApiErrorBody>('PUT', PRECLINICAL_API.section('species'), { body: `${sectionBodies.species} (${s.name})`, expectedVersion: 0 })));
  st = await sa.state();
  check('② 칸 — 서로 다른 칸 4개 동시 저장은 모두 200 · 같은 칸 동시는 늦은 쪽 409 stale + 상대 글', () => {
    assert.deepEqual(sectionRace.map((r) => r.status), [200, 200, 200, 200], statuses(sectionRace));
    assert.deepEqual(sameSection.map((r) => r.status).sort(), [200, 409], statuses(sameSection));
    const late = sameSection.find((r) => r.status === 409)!;
    assert.equal(err(late)?.code, 'stale');
    assert.match(String(err(late)?.section?.body), /랫드와 비글견/);
    assert.equal(st.protocol!.sections.length, 5);
  });

  // 3. 심의 — '많이' 는 규칙에서 바로 보완
  const r1 = await sa.call<ReviewRequestResponse>('POST', PRECLINICAL_API.review, { expectedVersion: st.protocol!.version });
  st = await sa.state();
  check("③ 심의 — '많이'(근거 없는 과다)는 LLM 없이 규칙에서 보완 · 상태 revise", () => {
    assert.equal(r1.status, 201, JSON.stringify(r1.body));
    assert.equal(r1.body.review.verdict, 'revise');
    assert.equal(r1.body.review.stage, 'rules');
    assert.ok(r1.body.review.ruleFindings.some((f) => f.id === 'r_level' && f.status === 'fail'));
    assert.equal(st.protocol!.status, 'revise');
  });
  await put(sb, { level: 'standard' });
  const reviewRace = await Promise.all([sa, sb].map((s) => s.call<ReviewRequestResponse>('POST', PRECLINICAL_API.review, { expectedVersion: st.protocol!.version })));
  st = await sa.state();
  const reviewRows = await db((c) => c.query<{ n: number }>(`select count(*)::int as n from web.doc_reviews where doc_kind = 'iacuc' and doc_id = $1 and doc_version = $2`, [st.protocol!.id, st.protocol!.version]));
  check('③ 심의 — 둘이 같은 판을 동시에 내도 그 판 심사는 하나 · LLM 꺼짐 → pending(심의 중) · 서류는 잠기지 않음', () => {
    assert.ok(reviewRace.every((r) => r.status === 200 || r.status === 201 || (r.status === 409 && err(r)?.code === 'already_exists')), statuses(reviewRace));
    assert.equal(reviewRows.rows[0]!.n, 1);
    assert.equal(st.protocol!.status, 'reviewing');
    assert.equal(st.protocol!.review?.verdict, 'pending');
  });
  const pendingId = st.protocol!.review!.id;
  // 심의 중 미이수자 · 승인 전 실행
  const early = await Promise.all([
    sc.call('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.A, kind: 'animal_study' }),
    sa.call('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.A, kind: 'animal_study' }),
  ]);
  check('④ 실행 막음 — 미이수자 403 · 승인 전 409 step_locked', () => {
    assert.equal(early[0]!.status, 403, statuses(early));
    assert.equal(early[1]!.status, 409, statuses(early));
    assert.equal(err(early[1]!)?.code, 'step_locked');
  });
  const decide = await teacher.call('POST', `/api/teacher/reviews/${pendingId}/decision`, { verdict: 'pass', note: 'e2e 수동 통과' });
  st = await sa.state();
  check('③ 교사 수동 통과 → 승인 스냅숏(후보 A · B · 알맞게) · 상태 approved', () => {
    assert.equal(decide.status, 200, JSON.stringify(decide.body));
    assert.equal(st.protocol!.status, 'approved');
    assert.deepEqual(st.protocol!.approved?.patentIds.sort(), [ids.A, ids.B].sort());
    assert.equal(st.protocol!.approved?.level, 'standard');
    assert.equal(st.protocol!.changedSinceApproval, false);
  });

  // 4. 동물실험 동시 실행(⑬)
  const balanceBefore = (await sa.board()).balanceCents;
  const sameReq = rid();
  const runRace = await Promise.all([
    sa.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: sameReq, patentId: ids.A, kind: 'animal_study' }),
    sa.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: sameReq, patentId: ids.A, kind: 'animal_study' }),
    sb.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.A, kind: 'animal_study' }),
    sb.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.B, kind: 'animal_study' }),
    sa.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.C, kind: 'animal_study' }),
    sd.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.C, kind: 'alt_assay', assay: 'herg' }),
  ]);
  const balanceAfter = (await sa.board()).balanceCents;
  const aJobs = new Set(runRace.slice(0, 3).map((r) => r.body.run?.jobId));
  const ledgerRows = await db((c) => c.query<{ n: number }>(`select count(*)::int as n from web.ledger where team_id = $1 and kind = 'paid_work' and job_id = any($2::uuid[])`, [team.id, [...aJobs]]));
  check('④ 같은 (특허 · 설계) 동시 3건 → 작업 1개 · 과금 1번 · B 는 따로 · 승인 판에 없는 C 409 · 대체 시험은 미이수자도', () => {
    assert.equal(aJobs.size, 1, statuses(runRace));
    assert.equal(runRace.slice(0, 3).filter((r) => r.body.created).length, 1);
    assert.equal(ledgerRows.rows[0]!.n, 1);
    assert.equal(runRace[3]!.status, 201, statuses(runRace));
    assert.equal(runRace[4]!.status, 409, statuses(runRace));
    assert.equal(runRace[5]!.status, 201, statuses(runRace));
    assert.equal(balanceBefore - balanceAfter, ANIMAL_STUDY_COST_CENTS * 2 + 50_000 * 20);
  });
  const bad = await db(async (c) => {
    try {
      await c.query('begin');
      const j = await c.query<{ params: unknown; class_id: string }>('select params, class_id from web.jobs where id = $1', [runRace[0]!.body.run.jobId]);
      await c.query(
        `insert into web.jobs (team_id, class_id, request_id, step, stage, facility, params, input_summary, status, source, patent_id, design_key, ends_game_day)
         values ($1, $2, $3, '3.2', 5, 'animal_study', $4, 'probe', 'running', 'simulation', $5, 'animal:standard', 99)`,
        [team.id, j.rows[0]!.class_id, rid(), j.rows[0]!.params, ids.A],
      );
      return 'inserted';
    } catch (e) {
      return `${(e as { code?: string }).code}:${(e as { constraint?: string }).constraint ?? ''}`;
    } finally {
      await c.query('rollback').catch(() => {});
    }
  });
  const crossTeam = await other.call('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.B, kind: 'alt_assay', assay: 'liver' });
  check('④ DB 키 — 서버를 비켜도 같은 (특허 · 설계) 두 줄은 jobs_patent_design_key 로 거절 · 다른 모둠은 남의 특허로 실행 불가', () => {
    assert.equal(bad, '23505:jobs_patent_design_key');
    assert.equal(crossTeam.status, 409, statuses([crossTeam]));
  });

  // 게임 시계를 30일 앞으로 — 처리기(5초 틱)가 끝낸다.
  await db((c) => c.query('update web.classes set clock_anchor_day = clock_anchor_day + 30 where id = $1', [cls.id]));
  let done = await sa.state();
  for (let i = 0; i < 20 && done.runs.some((r) => r.status !== 'succeeded'); i++) {
    await sleep(1000);
    done = await sa.state();
  }
  const studyA = done.runs.find((r) => r.patentId === ids.A && r.kind === 'animal_study')!;
  const studyB = done.runs.find((r) => r.patentId === ids.B && r.kind === 'animal_study')!;
  const resA = studyA.result?.kind === 'animal_study' ? studyA.result : null;
  check('④ 게임 시계로 끝 — 결과(설계 예시: A 경구 MRSD 60 · 개 NOAEL 18 · HED 10 · QT · 간 소견) · 대체 시험 hERG 구간', () => {
    assert.ok(done.runs.every((r) => r.status === 'succeeded'), done.runs.map((r) => `${r.codeName}:${r.status}`).join(','));
    assert.ok(resA);
    assert.equal(resA!.mrsdMgByForm.oral, 60);
    assert.equal(resA!.noaelMgPerKgDay.dog, 18);
    assert.equal(resA!.hedMgPerKg, 10);
    assert.deepEqual([...resA!.findings].sort(), ['liver', 'qt']);
    const alt = done.runs.find((r) => r.kind === 'alt_assay')!;
    assert.equal(alt.result?.kind === 'alt_assay' ? alt.result.band : null, 'low');
  });

  // 5. 계산 칸
  const calcWrong = await sb.call<{ ok: boolean; fields: Record<string, boolean> }>('PUT', PRECLINICAL_API.calc(studyA.jobId), { hedRat: resA!.noaelMgPerKgDay.rat / 6.2, hedDog: 10, hed: 10, mrsd: 100 });
  const calcRight = await sa.call<{ ok: boolean }>('PUT', PRECLINICAL_API.calc(studyA.jobId), { hedRat: resA!.noaelMgPerKgDay.rat / 6.2, hedDog: 10, hed: 10, mrsd: 60 });
  const calcLate = await sb.call<{ ok: boolean; saved: boolean }>('PUT', PRECLINICAL_API.calc(studyA.jobId), { hedRat: 1, hedDog: 1, hed: 1, mrsd: 1 });
  const calcRow = await db((c) => c.query<{ ok: boolean }>('select ok from web.preclinical_calcs where job_id = $1', [studyA.jobId]));
  const rerun = await sb.call<PreclinicalRunResponse>('POST', PRECLINICAL_API.runs, { requestId: rid(), patentId: ids.A, kind: 'animal_study' });
  check('⑤ 계산 칸 — 틀린 칸(MRSD)만 짚음 · 맞으면 저장 · 늦은 틀린 답은 덮지 않음 · 같은 설계 재실행은 과금 없이 옛 결과', () => {
    assert.equal(calcWrong.body.ok, false);
    assert.deepEqual(calcWrong.body.fields, { hedRat: true, hedDog: true, hed: true, mrsd: false });
    assert.equal(calcRight.body.ok, true);
    assert.equal(calcLate.body.ok, false);
    assert.equal(calcLate.body.saved, false);
    assert.equal(calcRow.rows[0]!.ok, true);
    assert.equal(rerun.status, 200);
    assert.equal(rerun.body.created, false);
    assert.equal(rerun.body.run.jobId, studyA.jobId);
  });

  // 6. 주력 · 백업(⑭)
  const v0 = done.lead.version;
  const blocked = await sa.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.A, backupPatentId: null, reason: 'no_heart', expectedVersion: v0 });
  const noStudy = await sa.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.C, backupPatentId: null, reason: 'efficacy_like_ref', expectedVersion: v0 });
  const leadRace = await Promise.all([
    sa.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.B, backupPatentId: ids.A, reason: 'no_liver', expectedVersion: v0 }),
    sb.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.A, backupPatentId: ids.B, reason: 'start_dose_room', expectedVersion: v0 }),
    sc.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.B, backupPatentId: null, reason: 'efficacy_like_ref', expectedVersion: v0 }),
    sd.call('PUT', PRECLINICAL_API.lead, { leadPatentId: ids.B, backupPatentId: ids.A, reason: 'no_heart', expectedVersion: v0 }),
  ]);
  const afterLead = await sc.state();
  const board = await sd.board();
  const events = await db((c) => c.query<{ headline: string; public: Record<string, unknown>; kind: string }>(`select headline, public, kind from web.board_events where class_id = $1 and kind = 'preclinical'`, [cls.id]));
  check('⑥ 근거 칩 막음(QT 소견 있는데 "심장 소견 없음") 400 reason_blocked · 동물실험 없는 후보 409', () => {
    assert.equal(blocked.status, 400, statuses([blocked]));
    assert.equal(err(blocked)?.code, 'reason_blocked');
    assert.equal(noStudy.status, 409, statuses([noStudy]));
  });
  check('⑥ 주력 · 백업 넷이 같은 판으로 동시 지정 → 1명만 200 · 나머지 409 stale · 쌍이 한꺼번에 · 3.2 완료 · 전광판 소식 1줄(공개 칸만)', () => {
    assert.equal(leadRace.filter((r) => r.status === 200).length, 1, statuses(leadRace));
    assert.equal(leadRace.filter((r) => r.status === 409 && err(r)?.code === 'stale').length, 3, statuses(leadRace));
    assert.equal(afterLead.lead.version, v0 + 1);
    assert.ok(afterLead.lead.leadPatentId);
    assert.equal(board.steps.find((s) => s.id === '3.2')?.state, 'done');
    assert.equal(events.rows.length, 1);
    assert.match(events.rows[0]!.headline, /전임상 완료 — TST-10[12] IND 준비/);
    const pub = JSON.stringify(events.rows[0]!.public);
    assert.ok(!MOLECULES.some((m) => pub.includes(m.smiles)), pub);
  });

  // 회고 · 교사 합계
  const reflect = await Promise.all([sa, sb].map((s) => s.call('PUT', PRECLINICAL_API.reflection, { body: `${s.name}: 대체 시험으로 C 를 뺐어요`, expectedVersion: 0 })));
  const summary = await teacher.call<PreclinicalTeacherView>('GET', PRECLINICAL_API.teacher(cls.id));
  const otherView = await other.state();
  check('종료보고서 · 교사 합계 — 회고 동시 저장 1명만 · 학급 합계(A · B 동물실험 82 × 2 · C 대체 시험으로 82 덜 씀) · 다른 모둠은 빈 화면', () => {
    assert.deepEqual(reflect.map((r) => r.status).sort(), [200, 409], statuses(reflect));
    assert.equal(summary.status, 200);
    assert.equal(summary.body.totalAnimals, ANIMALS_PER_CANDIDATE.standard * 2);
    assert.equal(summary.body.totalSaved, ANIMALS_PER_CANDIDATE.standard);
    assert.equal(afterLead.report.totalAnimals, ANIMALS_PER_CANDIDATE.standard * 2);
    assert.equal(otherView.patents.length, 0);
    assert.equal(otherView.runs.length, 0);
  });
  const studentTeacher = await sa.call('GET', PRECLINICAL_API.teacher(cls.id));
  check('교사 합계 API 는 학생에게 403', () => assert.equal(studentTeacher.status, 403));
  void studyB;

  // 7. (검토 보강) 요청 번호를 1.2 · 2.x 작업과 겹쳐 써도 그 작업 모양을 돌려주지 않는다.
  const foreignReq = await db((c) => c.query<{ request_id: string }>(`select request_id from web.jobs where team_id = $1 and step = '2.1' limit 1`, [team.id]));
  const reuse = await sa.call('POST', PRECLINICAL_API.runs, { requestId: foreignReq.rows[0]!.request_id, patentId: ids.B, kind: 'alt_assay', assay: 'liver' });
  check('⑦ 요청 번호가 2.1 작업과 겹치면 409 already_exists(남의 작업 모양을 3.2 실행으로 돌려주지 않음)', () => {
    assert.equal(reuse.status, 409, statuses([reuse]));
    assert.equal(err(reuse)?.code, 'already_exists');
  });

  // 8. (검토 보강) 변경 심의 → 새 판 승인 뒤 교사가 '옛 판' 통과를 보완으로 정정해도 지금 승인 상태는 그대로.
  const oldPassId = pendingId; // 위 ③ 의 수동 통과(옛 판)
  const cur = await sa.state();
  const refSection = cur.protocol!.sections.find((s) => s.section === 'refinement')!;
  assert.equal((await sa.call('PUT', PRECLINICAL_API.section('refinement'), { body: `${refSection.body} 매일 체중을 재요.`, expectedVersion: refSection.version })).status, 200);
  const changed = await sa.state();
  const r2 = await sa.call<ReviewRequestResponse>('POST', PRECLINICAL_API.review, { expectedVersion: changed.protocol!.version });
  const passNew = await teacher.call('POST', `/api/teacher/reviews/${r2.body.review.id}/decision`, { verdict: 'pass', note: 'e2e 변경 승인' });
  const approvedNew = await sa.state();
  const correctOld = await teacher.call('POST', `/api/teacher/reviews/${oldPassId}/decision`, { verdict: 'revise', note: 'e2e 옛 판 정정' });
  const afterOld = await sa.state();
  check('⑧ 옛 판 통과를 보완으로 정정 → 지금 승인(새 판) · 상태 approved 그대로 · 3.2 완료 유지', () => {
    assert.equal(changed.protocol!.changedSinceApproval, true);
    assert.equal(r2.status, 201, statuses([r2]));
    assert.equal(passNew.status, 200, JSON.stringify(passNew.body));
    assert.equal(approvedNew.protocol!.status, 'approved');
    assert.equal(approvedNew.protocol!.approved?.version, changed.protocol!.version);
    assert.equal(correctOld.status, 200, JSON.stringify(correctOld.body));
    assert.equal(afterOld.protocol!.status, 'approved');
    assert.equal(afterOld.protocol!.approved?.version, changed.protocol!.version);
  });
  // 지금 판의 통과를 거두면 — 이미 실행한 작업이 있어 승인 기록은 남고 상태만 보완.
  const revokeNow = await teacher.call('POST', `/api/teacher/reviews/${r2.body.review.id}/decision`, { verdict: 'revise', note: 'e2e 지금 판 정정' });
  const afterRevoke = await sa.state();
  const boardAfter = await sa.board();
  check('⑧ 지금 판 통과를 거둠 → 실행이 있어 승인 기록은 남고 상태 revise · 3.2 완료 유지', () => {
    assert.equal(revokeNow.status, 200, JSON.stringify(revokeNow.body));
    assert.equal(afterRevoke.protocol!.status, 'revise');
    assert.ok(afterRevoke.protocol!.approved);
    assert.equal(boardAfter.steps.find((s) => s.id === '3.2')?.state, 'done');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 통과`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
