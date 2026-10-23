/**
 * 화면 ③ — 1. 발견 · 2. 최적화(설계 §5 · §6 · §11 W3).
 *
 * - 모둠은 세션에서 정한다(경로에 모둠 id 를 받지 않는다). 등기한 모둠의 학생만 쓴다.
 * - 단계 상태는 서버가 계산해 내려보낸다(설계 §6.2) — 지금 확정 표적의 근거만 센다(표적을 바꾸면 옛 근거는 세지 않는다).
 * - 개인 입력(질환 탐색 · 컷오프 · SMILES 편집 · 무료 미리보기)은 화면 로컬이고, 여기서 저장하는 것은 모둠 공유분뿐이다
 *   (추천 카드 · 표적 확정 · 작업 · 찜 · 리드 · 연구 노트 — 설계 §6.4).
 * - 공개 범위: 다른 모둠에게는 이름 · 티커 · 잉크 · 부지만. 후보 · 물성 · 노트는 그 모둠만(설계 §5.3).
 */
import {
  DISEASE_LABEL,
  DISEASE_TO_TARGET,
  DOCKING_TARGETS,
  SMILES_MAX_LENGTH,
  type ExperimentResult,
  type ScreeningCandidate,
} from '@crista/shared-types';
import { INITIAL_RESEARCH_FUND_CENTS, paidWorkCostCents, propertySignals } from '@crista/game-rules';
import {
  charLength,
  LABEL_MAX,
  NOTE_MAX,
  NOTE_SECTIONS,
  PICK_NOTE_MAX,
  SCREEN_LIMITS,
  STEP_IDS,
  STEP_META,
  teamChannel,
  type AccountView,
  type Avatar,
  type BoardResponse,
  type ClaimView,
  type DiseaseOption,
  type DiseaseTargetsResponse,
  type FunnelPreviewResponse,
  type JobStep,
  type MemberView,
  type NoteResponse,
  type NoteSection,
  type NoteView,
  type ProgramView,
  type PropertiesResponse,
  type ScreenParams,
  type StepId,
  type StepView,
  type TargetPickView,
  type WebJobView,
} from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { isUniqueViolation, withTx, type Queryable } from './db.ts';
import { ApiError, badRequest } from './http.ts';
import { CLASS_SELECT, classSummary, loadTeam, loadTeams, type ClassRow } from './views.ts';
import { WorkerUnavailableError } from './worker.ts';

// ── 정적 목록 ──

export const COSTS: Record<JobStep, number> = {
  '1.2': paidWorkCostCents('htvs'),
  '2.1': paidWorkCostCents('docking'),
  '2.2': paidWorkCostCents('admet'),
};

/** 질환 → 도킹 표적(crista 사본 값 그대로). */
export const DISEASES: DiseaseOption[] = (Object.entries(DISEASE_TO_TARGET) as Array<[keyof typeof DISEASE_LABEL, string]>).map(([diseaseId, targetId]) => {
  const target = DOCKING_TARGETS.find((t) => t.id === targetId);
  if (!target) throw new Error(`DOCKING_TARGETS 에 ${targetId} 가 없습니다(사본 확인).`);
  return {
    diseaseId,
    label: DISEASE_LABEL[diseaseId],
    targetId,
    targetLabel: target.label,
    gene: target.gene,
    pdbId: target.pdbId,
    cns: target.cns,
    referenceLigand: target.referenceLigand,
    referenceKcal: target.referenceKcal,
  };
});

export const diseaseById = (diseaseId: unknown): DiseaseOption | undefined => DISEASES.find((d) => d.diseaseId === diseaseId);

// ── 모둠 확인 ──

export interface TeamMember {
  account: AccountView;
  classId: string;
  teamId: string;
  avatar: Avatar | null;
}

/** 등기한 모둠의 학생인가. */
export async function teamMember(db: Queryable, account: AccountView): Promise<TeamMember> {
  if (account.kind !== 'student') throw new ApiError(403, 'forbidden', '학생 계정으로 해 주세요.');
  const result = await db.query<{ class_id: string; team_id: string | null; avatar: Avatar | null; registered_at: Date | null }>(
    `select m.class_id, m.team_id, m.avatar, t.registered_at
       from web.members m left join web.teams t on t.id = m.team_id
      where m.user_id = $1 and m.role = 'student'`,
    [account.userId],
  );
  const row = result.rows[0];
  if (!row?.team_id || !row.registered_at) throw new ApiError(409, 'not_registered_team', '사옥 지구에서 입사하고 스타트업 이름을 먼저 등기해 주세요.');
  return { account, classId: row.class_id, teamId: row.team_id, avatar: row.avatar };
}

export async function ensureTeamRows(db: Queryable, teamId: string): Promise<void> {
  // 프로그램은 표적 없는 1번 버전과 함께 만든다(0003 — programs.current_revision_id not null).
  // 두 문장으로 나눈다 — 첫 문장의 on conflict 가 동시에 만든 쪽의 커밋을 기다리고, 둘째 문장은 새 스냅숏으로 그 행을 본다
  // (한 문장의 CTE 로 합치면 문장 시작 스냅숏이라 남이 막 만든 1번 버전을 못 볼 수 있다).
  await db.query('insert into web.program_revisions (team_id, revision_no) values ($1, 1) on conflict (team_id, revision_no) do nothing', [teamId]);
  await db.query(
    `insert into web.programs (team_id, current_revision_id)
     select team_id, id from web.program_revisions where team_id = $1 and revision_no = 1
     on conflict (team_id) do nothing`,
    [teamId],
  );
  await db.query(
    `insert into web.ledger (team_id, amount_cents, kind, idem_key) values ($1, $2, 'initial', 'initial') on conflict (team_id, idem_key) do nothing`,
    [teamId, INITIAL_RESEARCH_FUND_CENTS],
  );
}

export async function balanceOf(db: Queryable, teamId: string): Promise<number> {
  const result = await db.query<{ n: string | null }>('select sum(amount_cents)::bigint as n from web.ledger where team_id = $1', [teamId]);
  return Number(result.rows[0]?.n ?? 0);
}

const notifyTeam = (deps: Deps, teamId: string, reason: string, byName?: string): void =>
  deps.hub.publish(teamChannel(teamId), { type: 'board.changed', teamId, reason, ...(byName ? { byName } : {}) });

// ── 프로그램 ──

interface ProgramRow {
  revision_id: string | null;
  revision_no: number;
  disease_id: string | null;
  target_id: string | null;
  target_set_by_name: string | null;
  lead_job_id: string | null;
  backup_job_id: string | null;
  lead_set_by_name: string | null;
  lead_version: number;
}

/** 지금 표적 버전(programs.current_revision_id)의 표적 · 리드. */
async function loadProgramRow(db: Queryable, teamId: string): Promise<ProgramRow> {
  const result = await db.query<ProgramRow>(
    `select r.id as revision_id, r.revision_no, r.disease_id, r.target_id, ts.display_name as target_set_by_name,
            r.lead_job_id, r.backup_job_id, ls.display_name as lead_set_by_name, r.lead_version
       from web.programs p
       join web.program_revisions r on r.id = p.current_revision_id
       left join web.accounts ts on ts.user_id = r.target_set_by
       left join web.accounts ls on ls.user_id = r.lead_set_by
      where p.team_id = $1`,
    [teamId],
  );
  return (
    result.rows[0] ?? {
      revision_id: null,
      revision_no: 1,
      disease_id: null,
      target_id: null,
      target_set_by_name: null,
      lead_job_id: null,
      backup_job_id: null,
      lead_set_by_name: null,
      lead_version: 0,
    }
  );
}

// ── 작업 줄 → 화면 ──

export interface JobRow {
  id: string;
  team_id: string;
  class_id: string;
  created_by: string | null;
  request_id: string;
  step: JobStep;
  stage: number;
  facility: string;
  params: Record<string, string | number | boolean>;
  input_summary: string;
  target_id: string | null;
  program_revision_id: string | null;
  smiles: string | null;
  label: string | null;
  parent_job_id: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  phase: string | null;
  queue_position: number | null;
  source: WebJobView['source'];
  test: boolean;
  cost_cents: string;
  refunded_cents: string;
  result: ExperimentResult | null;
  canonical_smiles: string | null;
  affinity_kcal: number | null;
  error: WebJobView['error'] | null;
  worker_known: boolean;
  submit_attempts: number;
  timeout_at: Date | null;
  created_at: Date;
  updated_at: Date;
  by_name: string | null;
  by_avatar: Avatar | null;
}

export const JOB_SELECT = `
  select j.*, a.display_name as by_name, m.avatar as by_avatar
    from web.jobs j
    left join web.accounts a on a.user_id = j.created_by
    left join web.members m on m.user_id = j.created_by and m.role = 'student'`;

/** 결과를 화면용으로 줄인다 — 산점도(점 수십 개)는 비교표에 쓰지 않아 뺀다. */
function slimResult(result: ExperimentResult | null): ExperimentResult | undefined {
  if (!result) return undefined;
  const { scatter: _scatter, ...rest } = result;
  return rest as ExperimentResult;
}

export function jobView(row: JobRow): WebJobView {
  return {
    id: row.id,
    step: row.step,
    status: row.status,
    progress: row.progress,
    ...(row.phase ? { phase: row.phase as WebJobView['phase'] } : {}),
    ...(row.queue_position !== null ? { queuePosition: row.queue_position } : {}),
    source: row.source,
    test: row.test,
    costCents: Number(row.cost_cents),
    refundedCents: Number(row.refunded_cents),
    byUserId: row.created_by,
    byName: row.by_name ?? '(나간 모둠원)',
    avatar: row.by_avatar,
    targetId: row.target_id,
    revisionId: row.program_revision_id,
    label: row.label,
    smiles: row.canonical_smiles ?? row.smiles,
    parentJobId: row.parent_job_id,
    inputSummary: row.input_summary,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.error ? { error: row.error } : {}),
    ...(row.step === '2.1' ? { affinityKcal: row.affinity_kcal } : {}),
    ...(row.status === 'succeeded' ? { result: slimResult(row.result) } : {}),
  };
}

// ── 단계 상태(설계 §6.2) ──

interface StepFacts {
  step: JobStep;
  done: boolean;
  active: boolean;
  progress: number | null;
  by_name: string | null;
}

/** 지금 표적 버전의 작업만 센다 — 표적을 바꿨다 돌아와도 옛 버전의 결과는 근거가 아니다. */
async function stepFacts(db: Queryable, teamId: string, revisionId: string | null, targetId: string | null): Promise<Map<JobStep, StepFacts>> {
  const out = new Map<JobStep, StepFacts>();
  if (!targetId || !revisionId) return out;
  const result = await db.query<StepFacts>(
    `select j.step,
            bool_or(j.status = 'succeeded') as done,
            bool_or(j.status in ('queued', 'running')) as active,
            max(j.progress) filter (where j.status in ('queued', 'running')) as progress,
            (array_agg(a.display_name order by j.created_at desc) filter (where j.status in ('queued', 'running')))[1] as by_name
       from web.jobs j left join web.accounts a on a.user_id = j.created_by
      where j.team_id = $1 and j.program_revision_id = $2
      group by j.step`,
    [teamId, revisionId],
  );
  for (const row of result.rows) out.set(row.step, row);
  return out;
}

export function computeSteps(input: {
  targetId: string | null;
  leadForTarget: boolean;
  facts: Map<JobStep, StepFacts>;
  balanceCents: number;
}): StepView[] {
  const { targetId, facts, balanceCents } = input;
  const done = new Set<StepId>();
  if (targetId) done.add('1.1');
  if (facts.get('1.2')?.done) done.add('1.2');
  if (facts.get('2.1')?.done) done.add('2.1');
  if (input.leadForTarget) done.add('2.2');

  const requires: Partial<Record<StepId, StepId>> = { '1.2': '1.1', '2.1': '1.2', '2.2': '2.1' };
  return STEP_IDS.map((id): StepView => {
    const meta = STEP_META[id];
    const base = { id, group: meta.group, index: meta.index, evidence: meta.evidence };
    if (meta.group >= 3) return { ...base, state: 'locked', reason: '다음 수업(W4)에서 열려요. 지금은 초안 · 연구 노트만 쓸 수 있어요.', unlockBy: '2.2' };
    const cost = id in COSTS ? COSTS[id as JobStep] : undefined;
    const withCost = cost !== undefined ? { ...base, costCents: cost } : base;
    if (done.has(id)) return { ...withCost, state: 'done' };
    const need = requires[id];
    if (need && !done.has(need)) {
      return { ...withCost, state: 'locked', unlockBy: need, reason: `${need} ${STEP_META[need].title}을 먼저 마쳐야 해요.` };
    }
    const fact = id in COSTS ? facts.get(id as JobStep) : undefined;
    if (fact?.active) {
      return { ...withCost, state: 'running', progressPct: Math.round((fact.progress ?? 0) * 100), ...(fact.by_name ? { byName: fact.by_name } : {}) };
    }
    if (cost !== undefined && balanceCents < cost) return { ...withCost, state: 'blocked', reason: '연구비가 모자라요.' };
    return { ...withCost, state: 'ready' };
  });
}

// ── 화면 한 장 ──

export async function loadBoard(deps: Deps, account: AccountView): Promise<BoardResponse> {
  const who = await teamMember(deps.db, account);
  await ensureTeamRows(deps.db, who.teamId);
  const db = deps.db;

  const [clsRows, team, teams, program, balanceCents, membersRows] = await Promise.all([
    db.query<ClassRow>(`${CLASS_SELECT} where c.id = $1`, [who.classId]),
    loadTeam(db, who.teamId),
    loadTeams(db, who.classId),
    loadProgramRow(db, who.teamId),
    balanceOf(db, who.teamId),
    db.query<{ user_id: string; display_name: string; avatar: Avatar | null }>(
      `select m.user_id, a.display_name, m.avatar from web.members m join web.accounts a on a.user_id = m.user_id
        where m.team_id = $1 order by m.joined_team_at nulls last, a.display_name`,
      [who.teamId],
    ),
  ]);
  if (!team) throw new ApiError(404, 'not_found', '사옥을 찾지 못했어요.');

  const [jobsRows, leadRows, facts, claimsRows, picksRows, notesRows] = await Promise.all([
    db.query<JobRow>(`${JOB_SELECT} where j.team_id = $1 order by j.created_at desc limit 80`, [who.teamId]),
    db.query<{ id: string; program_revision_id: string | null; canonical_smiles: string | null; smiles: string | null; label: string | null }>(
      'select id, program_revision_id, canonical_smiles, smiles, label from web.jobs where team_id = $1 and id = any($2::uuid[])',
      [who.teamId, [program.lead_job_id, program.backup_job_id].filter(Boolean)],
    ),
    stepFacts(db, who.teamId, program.revision_id, program.target_id),
    db.query<{ compound_id: string; slot: 1 | 2; name: string; smiles: string; screen_job_id: string; claimed_by: string; display_name: string; avatar: Avatar | null; vina_kcal: number | null; screen_score: number | null; mw: number | null; qed: number | null }>(
      `select c.*, a.display_name, m.avatar
         from web.claims c
         join web.accounts a on a.user_id = c.claimed_by
         left join web.members m on m.user_id = c.claimed_by and m.role = 'student'
        where c.program_revision_id = $1
        order by c.created_at`,
      [program.revision_id],
    ),
    db.query<{ id: string; user_id: string; display_name: string; avatar: Avatar | null; disease_id: string; target_id: string; note: string | null; created_at: Date }>(
      `select p.*, a.display_name, m.avatar
         from web.target_picks p join web.accounts a on a.user_id = p.user_id
         left join web.members m on m.user_id = p.user_id and m.role = 'student'
        where p.team_id = $1 order by p.created_at`,
      [who.teamId],
    ),
    db.query<{ step_id: StepId; section: NoteSection; body: string; display_name: string | null; avatar: Avatar | null; updated_at: Date; version: number }>(
      `select n.step_id, n.section, n.body, a.display_name, m.avatar, n.updated_at, n.version
         from web.notes n left join web.accounts a on a.user_id = n.updated_by
         left join web.members m on m.user_id = n.updated_by and m.role = 'student'
        where n.program_revision_id = $1`,
      [program.revision_id],
    ),
  ]);

  const leadOf = (jobId: string | null) => {
    const row = leadRows.rows.find((r) => r.id === jobId);
    return row ? { jobId: row.id, smiles: row.canonical_smiles ?? row.smiles ?? '', label: row.label, revisionId: row.program_revision_id } : null;
  };
  const lead = leadOf(program.lead_job_id);
  const backup = leadOf(program.backup_job_id);
  const programView: ProgramView = {
    revisionId: program.revision_id!,
    revisionNo: program.revision_no,
    diseaseId: program.disease_id,
    targetId: program.target_id,
    targetSetByName: program.target_set_by_name,
    lead: lead ? { jobId: lead.jobId, smiles: lead.smiles, label: lead.label } : null,
    backup: backup ? { jobId: backup.jobId, smiles: backup.smiles, label: backup.label } : null,
    leadSetByName: program.lead_set_by_name,
    leadVersion: program.lead_version,
  };

  const members: MemberView[] = membersRows.rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, avatar: r.avatar }));
  const claims: ClaimView[] = claimsRows.rows.map((r) => ({
    compoundId: r.compound_id,
    slot: r.slot,
    name: r.name,
    smiles: r.smiles,
    screenJobId: r.screen_job_id,
    userId: r.claimed_by,
    byName: r.display_name,
    avatar: r.avatar,
    vinaKcal: r.vina_kcal,
    screenScore: r.screen_score,
    mw: r.mw,
    qed: r.qed,
  }));
  const picks: TargetPickView[] = picksRows.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    byName: r.display_name,
    avatar: r.avatar,
    diseaseId: r.disease_id,
    targetId: r.target_id,
    note: r.note,
    createdAt: r.created_at.toISOString(),
  }));
  const notes: NoteView[] = notesRows.rows.map((r) => ({
    stepId: r.step_id,
    section: r.section,
    body: r.body,
    byName: r.display_name,
    avatar: r.avatar,
    updatedAt: r.updated_at.toISOString(),
    version: r.version,
  }));

  return {
    account,
    avatar: who.avatar,
    class: classSummary(clsRows.rows[0]!),
    team,
    members,
    program: programView,
    balanceCents,
    steps: computeSteps({ targetId: program.target_id, leadForTarget: !!lead && lead.revisionId === program.revision_id, facts, balanceCents }),
    jobs: jobsRows.rows.map(jobView),
    claims,
    picks,
    notes,
    teams: teams.map((t) => ({ id: t.id, plot: t.plot, ink: t.ink, startupName: t.startupName, ticker: t.ticker, hqTier: t.hqTier, isMine: t.id === who.teamId })),
    diseases: DISEASES,
    costs: COSTS,
    workerMode: deps.jobs.workerMode,
  };
}

// ── 1.1 표적 ──

export async function pickTarget(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const disease = diseaseById(body.diseaseId);
  if (!disease) throw badRequest('고를 수 있는 질환이 아니에요.');
  const note = typeof body.note === 'string' ? body.note.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (charLength(note) > PICK_NOTE_MAX) throw badRequest(`메모는 ${PICK_NOTE_MAX}자까지예요.`);
  await deps.db.query(
    `insert into web.target_picks (team_id, user_id, disease_id, target_id, note) values ($1, $2, $3, $4, $5)
     on conflict (team_id, user_id, disease_id) do update set note = excluded.note, created_at = now()`,
    [who.teamId, account.userId, disease.diseaseId, disease.targetId, note || null],
  );
  notifyTeam(deps, who.teamId, 'pick', account.displayName);
  return { ok: true };
}

export async function setTarget(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const disease = diseaseById(((raw ?? {}) as Record<string, unknown>).diseaseId);
  if (!disease) throw badRequest('고를 수 있는 질환이 아니에요.');
  await withTx(deps.db, async (tx) => {
    await ensureTeamRows(tx, who.teamId);
    // programs 행을 잠가 표적 바꾸기끼리 · 작업 접수(for share)와 줄 세운다.
    await tx.query('select 1 from web.programs where team_id = $1 for update', [who.teamId]);
    const current = await loadProgramRow(tx, who.teamId);
    if (current.target_id === disease.targetId) return;
    if (!current.target_id) {
      // 표적이 아직 없는 버전 — 그 자리에서 채운다(그 버전의 1.1 노트가 그대로 이어진다).
      await tx.query(
        `update web.program_revisions set disease_id = $2, target_id = $3, target_set_at = now(), target_set_by = $4 where id = $1`,
        [current.revision_id, disease.diseaseId, disease.targetId, account.userId],
      );
    } else {
      // 정한 표적을 바꾼다 — 새 버전을 연다. 옛 버전의 작업 · 찜 · 리드 · 노트는 그대로 남고 새 버전의 근거로 세지 않는다.
      const opened = await tx.query<{ id: string }>(
        `insert into web.program_revisions (team_id, revision_no, disease_id, target_id, target_set_at, target_set_by)
         values ($1, $2, $3, $4, now(), $5) returning id`,
        [who.teamId, current.revision_no + 1, disease.diseaseId, disease.targetId, account.userId],
      );
      const next = opened.rows[0]!.id;
      // 1.1 노트(표적을 고른 이유)는 새 버전으로 옮겨 이어 쓴다.
      await tx.query(
        `insert into web.notes (team_id, program_revision_id, step_id, section, body, updated_by, updated_at)
         select team_id, $2, step_id, section, body, updated_by, updated_at from web.notes where program_revision_id = $1 and step_id = '1.1'`,
        [current.revision_id, next],
      );
      await tx.query('update web.programs set current_revision_id = $2, updated_at = now() where team_id = $1', [who.teamId, next]);
    }
  });
  notifyTeam(deps, who.teamId, 'target', account.displayName);
  return { ok: true };
}

const targetsCache = new Map<string, { at: number; value: DiseaseTargetsResponse }>();

export async function diseaseTargets(deps: Deps, account: AccountView, diseaseId: string | null): Promise<DiseaseTargetsResponse> {
  await teamMember(deps.db, account);
  const disease = diseaseById(diseaseId);
  if (!disease) throw badRequest('고를 수 있는 질환이 아니에요.');
  const hit = targetsCache.get(disease.diseaseId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  const raw = (await callWorker(() => deps.worker.diseaseTargets(disease.diseaseId, 30))) as Omit<DiseaseTargetsResponse, 'diseaseId'>;
  const value: DiseaseTargetsResponse = {
    diseaseId: disease.diseaseId,
    disease: raw.disease,
    totalAssociatedCount: raw.totalAssociatedCount,
    targets: raw.targets,
  };
  targetsCache.set(disease.diseaseId, { at: Date.now(), value });
  return value;
}

async function callWorker<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof WorkerUnavailableError) throw new ApiError(503, 'worker_unavailable', error.message, { retryAfterSec: 5 });
    throw error;
  }
}

// ── 1.2 깔때기 미리보기(무료) ──

export function checkScreenParams(raw: unknown): ScreenParams {
  const body = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);
  const bool = (v: unknown) => v === true || v === 'true' || v === '1';
  const maxMw = num(body.maxMw);
  const maxTpsa = num(body.maxTpsa);
  if (!Number.isFinite(maxMw) || maxMw < SCREEN_LIMITS.mwMin || maxMw > SCREEN_LIMITS.mwMax) throw badRequest(`MW 컷오프는 ${SCREEN_LIMITS.mwMin}~${SCREEN_LIMITS.mwMax} 사이예요.`);
  if (!Number.isFinite(maxTpsa) || maxTpsa < SCREEN_LIMITS.tpsaMin || maxTpsa > SCREEN_LIMITS.tpsaMax) throw badRequest(`TPSA 컷오프는 ${SCREEN_LIMITS.tpsaMin}~${SCREEN_LIMITS.tpsaMax} 사이예요.`);
  const library = typeof body.library === 'string' && body.library.trim() ? body.library.trim().slice(0, 40) : null;
  return { library, maxMw: Math.round(maxMw), maxTpsa: Math.round(maxTpsa), ro5Only: bool(body.ro5Only), excludeAlerts: bool(body.excludeAlerts) };
}

let librariesCache: { at: number; value: string[] } | null = null;

export async function funnelPreview(deps: Deps, account: AccountView, query: URLSearchParams): Promise<FunnelPreviewResponse> {
  const who = await teamMember(deps.db, account);
  const hit = deps.limits.previewPerTeam.hit(who.teamId);
  if (!hit.ok) throw new ApiError(429, 'rate_limited', '미리보기를 너무 자주 했어요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: hit.retryAfterSec });
  const program = await loadProgramRow(deps.db, who.teamId);
  if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
  const params = checkScreenParams(Object.fromEntries(query));
  const [result, libraries] = await Promise.all([
    callWorker(() => deps.worker.compounds({ targetId: program.target_id!, ...params, limit: 5 })),
    librariesCache && Date.now() - librariesCache.at < 10 * 60_000
      ? Promise.resolve(librariesCache.value)
      : callWorker(() => deps.worker.libraries()).then((value) => ((librariesCache = { at: Date.now(), value }), value)),
  ]);
  return {
    total: result.stats.total,
    funnel: result.stats.funnel,
    libraries,
    top: result.compounds.map((c) => ({ compoundId: c.chemblId, name: c.name, mw: c.mw, qed: c.qed, vinaKcal: c.vinaKcalByTarget?.[program.target_id!] ?? null })),
  };
}

// ── 무료 물성 미리보기 ──

const propsCache = new Map<string, PropertiesResponse>();

export async function previewProperties(deps: Deps, account: AccountView, raw: unknown): Promise<PropertiesResponse> {
  const who = await teamMember(deps.db, account);
  const smiles = checkSmiles(((raw ?? {}) as Record<string, unknown>).smiles);
  const cached = propsCache.get(smiles);
  if (cached) return cached;
  const hit = deps.limits.propertiesPerTeam.hit(who.teamId);
  if (!hit.ok) throw new ApiError(429, 'rate_limited', '미리보기는 모둠당 1분에 20번까지예요.', { retryAfterSec: hit.retryAfterSec });
  const outcome = await callWorker(() => deps.worker.properties(smiles));
  if (!outcome.ok) throw new ApiError(400, 'invalid_input', outcome.message);
  const p = outcome.properties;
  const value: PropertiesResponse = {
    properties: {
      canonicalSmiles: p.canonicalSmiles,
      mw: p.mw,
      clogp: p.clogp,
      tpsa: p.tpsa,
      hbd: p.hbd,
      hba: p.hba,
      rotb: p.rotb,
      qed: p.qed,
      basicAmines: p.basicAmines,
      alerts: p.alerts,
    },
    signals: propertySignals(p),
  };
  if (propsCache.size > 500) propsCache.delete(propsCache.keys().next().value!);
  propsCache.set(smiles, value);
  return value;
}

export function checkSmiles(raw: unknown): string {
  const smiles = typeof raw === 'string' ? raw.trim() : '';
  if (smiles.length === 0) throw badRequest('SMILES 를 써 주세요.');
  if (smiles.length > SMILES_MAX_LENGTH) throw badRequest(`SMILES 는 ${SMILES_MAX_LENGTH}자까지예요.`);
  if (!/^[A-Za-z0-9@+\-[\]()=#$%/\\.:*]+$/.test(smiles)) throw badRequest('SMILES 에 쓸 수 없는 글자가 있어요.');
  return smiles;
}

export function checkLabel(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const label = String(raw).normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!label) return null;
  if (charLength(label) > LABEL_MAX) throw badRequest(`이름표는 ${LABEL_MAX}자까지예요.`);
  if (/\p{Cc}/u.test(label)) throw badRequest('이름표에 쓸 수 없는 글자가 있어요.');
  return label;
}

// ── 1.2 히트 후보 찜 ──

/** 한 사람의 찜 칸(설계 §6.4 "1인 1~2개") — DB 가 (버전, 사람, 칸) 고유 키 · slot in (1, 2) 로도 지킨다. */
const CLAIM_SLOTS = [1, 2] as const;

const claimsFull = () => new ApiError(409, 'claimed', `한 사람이 ${CLAIM_SLOTS.length}개까지 찜할 수 있어요. 하나를 놓아 주세요.`);

/** 표적 바꾸기(programs for update)와 줄 세우고 지금 표적 버전을 읽는다. */
async function lockedProgram(tx: Queryable, teamId: string): Promise<ProgramRow & { revision_id: string }> {
  await ensureTeamRows(tx, teamId);
  await tx.query('select 1 from web.programs where team_id = $1 for share', [teamId]);
  const program = await loadProgramRow(tx, teamId);
  if (!program.revision_id) throw new ApiError(404, 'not_found', '모둠 프로그램을 찾지 못했어요.');
  return program as ProgramRow & { revision_id: string };
}

export async function claimCandidate(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const screenJobId = typeof body.screenJobId === 'string' ? body.screenJobId : '';
  const compoundId = typeof body.compoundId === 'string' ? body.compoundId.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(screenJobId) || !compoundId) throw badRequest('스크리닝 결과와 후보를 골라 주세요.');

  try {
    await withTx(deps.db, async (tx) => {
      const program = await lockedProgram(tx, who.teamId);
      const job = await tx.query<{ result: ExperimentResult | null; status: string; program_revision_id: string | null }>(
        `select result, status, program_revision_id from web.jobs where id = $1 and team_id = $2 and step = '1.2'`,
        [screenJobId, who.teamId],
      );
      const row = job.rows[0];
      if (!row || row.status !== 'succeeded') throw new ApiError(404, 'not_found', '우리 모둠의 끝난 스크리닝 결과가 아니에요.');
      if (row.program_revision_id !== program.revision_id) throw new ApiError(409, 'step_locked', '지금 표적의 스크리닝 결과에서만 찜할 수 있어요. 화면을 새로 고쳐 주세요.');
      const candidate: ScreeningCandidate | undefined = row.result?.candidates?.find((c) => c.compoundId === compoundId);
      if (!candidate) throw new ApiError(404, 'not_found', '그 스크리닝 결과에 없는 후보예요.');
      // 같은 사람이 동시에 여러 번 눌러도 빈 칸을 하나씩 고르게 (모둠, 버전, 사람) 기준으로 잠근다.
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [`crista-web:claims:${who.teamId}:${program.revision_id}:${account.userId}`]);
      const used = await tx.query<{ slot: number }>('select slot from web.claims where program_revision_id = $1 and claimed_by = $2', [program.revision_id, account.userId]);
      const slot = CLAIM_SLOTS.find((s) => !used.rows.some((r) => r.slot === s));
      if (slot === undefined) throw claimsFull();
      const inserted = await tx.query(
        `insert into web.claims (team_id, program_revision_id, compound_id, slot, name, smiles, screen_job_id, claimed_by, vina_kcal, screen_score, mw, qed)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) on conflict (program_revision_id, compound_id) do nothing`,
        [who.teamId, program.revision_id, compoundId, slot, candidate.name, candidate.canonicalSmiles, screenJobId, account.userId,
          candidate.vinaKcal ?? null, candidate.screenScore, candidate.mw, candidate.qed],
      );
      if (!inserted.rowCount) {
        const owner = await tx.query<{ display_name: string }>(
          'select a.display_name from web.claims c join web.accounts a on a.user_id = c.claimed_by where c.program_revision_id = $1 and c.compound_id = $2',
          [program.revision_id, compoundId],
        );
        throw new ApiError(409, 'claimed', `${owner.rows[0]?.display_name ?? '다른 모둠원'} 님이 먼저 찜했어요.`);
      }
    });
  } catch (error) {
    // 잠금을 비켜 간 경우의 마지막 방어선 — 칸 고유 키.
    if (isUniqueViolation(error, 'claims_person_slot_key')) throw claimsFull();
    throw error;
  }
  notifyTeam(deps, who.teamId, 'claim', account.displayName);
  return { ok: true };
}

export async function releaseClaim(deps: Deps, account: AccountView, compoundId: string): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const deleted = await deps.db.query(
    `delete from web.claims c using web.programs p
      where p.team_id = $1 and c.program_revision_id = p.current_revision_id and c.compound_id = $2 and c.claimed_by = $3`,
    [who.teamId, compoundId, account.userId],
  );
  if (!deleted.rowCount) throw new ApiError(404, 'not_found', '내가 찜한 후보가 아니에요.');
  notifyTeam(deps, who.teamId, 'claim', account.displayName);
  return { ok: true };
}

// ── 2.2 주력 리드 · 백업 ──

const expectedVersionOf = (raw: unknown): number => {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) throw badRequest('화면이 읽은 버전(expectedVersion)을 보내 주세요. 화면을 새로 고쳐 주세요.');
  return raw;
};

export async function setLead(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const leadJobId = typeof body.leadJobId === 'string' ? body.leadJobId : '';
  const backupJobId = typeof body.backupJobId === 'string' && body.backupJobId ? body.backupJobId : null;
  const uuid = /^[0-9a-f-]{36}$/i;
  if (!uuid.test(leadJobId) || (backupJobId !== null && !uuid.test(backupJobId))) throw badRequest('리드로 쓸 ADMET 결과를 골라 주세요.');
  if (backupJobId === leadJobId) throw badRequest('백업 후보는 주력 리드와 다른 분자여야 해요.');
  const expectedVersion = expectedVersionOf(body.expectedVersion);

  await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
    const rows = await tx.query<{ id: string; step: string; status: string; program_revision_id: string | null; canonical_smiles: string | null }>(
      'select id, step, status, program_revision_id, canonical_smiles from web.jobs where team_id = $1 and id = any($2::uuid[])',
      [who.teamId, [leadJobId, backupJobId].filter(Boolean)],
    );
    const lead = rows.rows.find((r) => r.id === leadJobId);
    if (!lead || lead.step !== '2.2' || lead.status !== 'succeeded' || lead.program_revision_id !== program.revision_id) {
      throw new ApiError(409, 'step_locked', '주력 리드는 지금 표적으로 끝난 ADMET 예측 결과에서 골라야 해요.');
    }
    if (backupJobId) {
      const backup = rows.rows.find((r) => r.id === backupJobId);
      if (!backup || !['2.1', '2.2'].includes(backup.step) || backup.status !== 'succeeded' || backup.program_revision_id !== program.revision_id) {
        throw new ApiError(409, 'step_locked', '백업 후보는 지금 표적으로 끝난 도킹 · ADMET 결과에서 골라야 해요.');
      }
      if (backup.canonical_smiles && backup.canonical_smiles === lead.canonical_smiles) throw badRequest('백업 후보는 주력 리드와 다른 분자여야 해요.');
    }
    // 주력 · 백업 쌍을 한 줄에서 한꺼번에 — 화면이 읽은 뒤 누가 바꿨으면 0행.
    const updated = await tx.query(
      `update web.program_revisions set lead_job_id = $2, backup_job_id = $3, lead_version = lead_version + 1, lead_set_at = now(), lead_set_by = $4
        where id = $1 and lead_version = $5`,
      [program.revision_id, leadJobId, backupJobId, account.userId, expectedVersion],
    );
    if (!updated.rowCount) throw new ApiError(409, 'stale', '다른 모둠원이 주력 리드 · 백업을 먼저 바꿨어요. 화면을 새로 고쳐 확인해 주세요.');
  });
  notifyTeam(deps, who.teamId, 'lead', account.displayName);
  return { ok: true };
}

// ── 연구 노트(칸 단위) ──

async function loadNote(db: Queryable, revisionId: string, stepId: string, section: string): Promise<NoteView | undefined> {
  const result = await db.query<{ step_id: StepId; section: NoteSection; body: string; display_name: string | null; avatar: Avatar | null; updated_at: Date; version: number }>(
    `select n.step_id, n.section, n.body, a.display_name, m.avatar, n.updated_at, n.version
       from web.notes n left join web.accounts a on a.user_id = n.updated_by
       left join web.members m on m.user_id = n.updated_by and m.role = 'student'
      where n.program_revision_id = $1 and n.step_id = $2 and n.section = $3`,
    [revisionId, stepId, section],
  );
  const r = result.rows[0];
  return r ? { stepId: r.step_id, section: r.section, body: r.body, byName: r.display_name, avatar: r.avatar, updatedAt: r.updated_at.toISOString(), version: r.version } : undefined;
}

export async function saveNote(deps: Deps, account: AccountView, stepId: string, section: string, raw: unknown): Promise<NoteResponse> {
  const who = await teamMember(deps.db, account);
  if (!STEP_IDS.includes(stepId as StepId) || !NOTE_SECTIONS.includes(section as NoteSection)) throw new ApiError(404, 'not_found', '없는 노트 칸이에요.');
  const req = (raw ?? {}) as Record<string, unknown>;
  const body = req.body;
  if (typeof body !== 'string') throw badRequest('노트 내용을 보내 주세요.');
  const expectedVersion = expectedVersionOf(req.expectedVersion);
  const text = body.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[^\S\n]+$/gm, '').trim();
  if (charLength(text) > NOTE_MAX) throw badRequest(`노트 한 칸은 ${NOTE_MAX}자까지예요.`);
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text)) throw badRequest('노트에 쓸 수 없는 글자가 있어요.');

  const version = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    const key = [program.revision_id, stepId, section];
    // 늦은 쪽 — 내 초안은 화면에 두고, 지금 칸(상대 본문 · 버전)을 붙여 돌려준다.
    const stale = async () => {
      const note = await loadNote(tx, program.revision_id, stepId, section);
      return new ApiError(409, 'stale', '다른 모둠원이 이 노트 칸을 먼저 고쳤어요. 내용을 확인한 뒤 합쳐서 저장해 주세요.', note ? { note } : {});
    };
    if (text === '') {
      if (expectedVersion === 0) return 0;
      const deleted = await tx.query('delete from web.notes where program_revision_id = $1 and step_id = $2 and section = $3 and version = $4', [...key, expectedVersion]);
      if (deleted.rowCount) return 0;
      // 이미 누가 지웠으면 바라던 결과와 같다.
      if (!(await loadNote(tx, program.revision_id, stepId, section))) return 0;
      throw await stale();
    }
    const saved =
      expectedVersion === 0
        ? await tx.query<{ version: number }>(
            `insert into web.notes (team_id, program_revision_id, step_id, section, body, updated_by, version) values ($1, $2, $3, $4, $5, $6, 1)
             on conflict (program_revision_id, step_id, section) do nothing returning version`,
            [who.teamId, ...key, text, account.userId],
          )
        : await tx.query<{ version: number }>(
            `update web.notes set body = $4, updated_by = $5, updated_at = now(), version = version + 1
              where program_revision_id = $1 and step_id = $2 and section = $3 and version = $6 returning version`,
            [...key, text, account.userId, expectedVersion],
          );
    if (!saved.rows[0]) throw await stale();
    return saved.rows[0].version;
  });
  notifyTeam(deps, who.teamId, `note:${stepId}:${section}`, account.displayName);
  return { ok: true, version };
}

export { notifyTeam, loadProgramRow };
