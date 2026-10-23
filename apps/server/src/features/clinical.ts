/**
 * 기능 F41 — 4.1 임상 1 · 2 · 3상(2026-10-24 사용자 지시로 설계 · 구현 — 구현 기록 §6.41).
 *
 * 소유: 이 파일 · features/clinical-sim.ts · packages/web-contract/src/clinical.ts · apps/web/src/board/steps/s41.tsx(+ s41.css · s41-charts.tsx) · 0017.
 * 표(0017): web.clinical_trials(한 줄 = 한 상의 한 시도) · clinical_recruit_log(모집 정산 · 곡선) · clinical_sim_cache(입력 해시 → 결과) · clinical_bounties.
 *
 * 흐름: IND 승인(3.3) → [1상 모집 시작](POST /api/clinical/open) → 게임 일마다 모집(onGameDay — 투자 단계별 속도 · 과금) →
 * [임상 시작](최소 인원 이상 · 상 비용 과금 · 상 기간) → 시뮬레이션(Claude Opus 5.5 · effort medium, 비동기 · 검사 · 한 번 다시 ·
 * 끝내 안 되면 규칙 결과 — game-rules 판정 + `ruleSimulate`, result_source 'rule' · 교사를 기다리지 않음) →
 * 끝나는 게임 일에 공개(onGameDay) → 통과면 다음 상, 보류면 재도전 3경로 + 실패 바운티.
 *
 * 잠금 순서(교착 없게): programs FOR SHARE → teams FOR UPDATE(ledger.ts `charge` 와 같은 줄) → clinical_trials 줄 FOR UPDATE → classes(postBoardEvent).
 * 불변식: 표적 버전마다 살아 있는 시도 하나(부분 고유 키) · (버전, 상, 시도) 고유 · [임상 시작] 은 상태 조건 + 원장 멱등 'trial:<id>:start' ·
 *         모집 정산은 recruit_seq 원장 멱등 · 바운티는 시도마다 한 번. 돈은 LLM 이 정하지 않는다.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  BOUNTY_AXIS_LABEL,
  BOUNTY_CHOICES,
  BOUNTY_FACTOR_LABEL,
  BOUNTY_LIMITS,
  BOUNTY_REMEDY_LABEL,
  DOCKING_TARGETS,
  type DoseMg,
  type MoleculeProperties,
  type StepJudgement,
} from '@crista/shared-types';
import {
  bountyRefundCents,
  cohortNoise,
  gradeBounty,
  judgeStep,
  needsBrainExposure,
  parseBountyAnswers,
  passProbability,
  PIPELINE_RULES,
  scoreCandidate,
  stepBountyKey,
} from '@crista/game-rules';
import {
  BACKUP_SWAP_FEE_CRISTA,
  CENTS_PER_CRISTA,
  BACKUP_SWAP_WAIT_DAYS,
  CLINICAL_COPY,
  CLINICAL_SIM_VERSION,
  IND_DOSES,
  IND_FORMS,
  IND_SAFETY_MIN,
  PHASE_LABEL,
  PHASE_RULES,
  RECRUIT_TIER_IDS,
  RECRUIT_TIERS,
  TRIAL_BOUNTY_RATE,
  TRIAL_BOUNTY_RETRY_SEC,
  TRIAL_BOUNTY_TEXT_MAX,
  TRIAL_BOUNTY_TEXT_MIN,
  TRIAL_PHASES,
  armDoseMg,
  armPlan,
  centsToCrista,
  cristaToCents,
  fillCopy,
  healthyVolunteers,
  nextPhase,
  recruitModel,
  recruitProjection,
  targetNOf,
  tierPerDay,
  trialPower,
  trialProfile,
  type AccountView,
  type ClinicalCandidateView,
  type ClinicalResponse,
  type FundingStepView,
  type HoldKind,
  type IndForm,
  type PhaseLadderView,
  type RecruitTier,
  type RecruitView,
  type RouteOptionView,
  type SimStatus,
  type TeacherTrialView,
  type TrialArmView,
  type TrialBountyView,
  type TrialPhase,
  type TrialRoute,
  type TrialSimResult,
  type TrialStatus,
  type TrialView,
} from '@crista-web/web-contract';
import { postBoardEvent } from '../board-events.ts';
import { currentGameDay, gameDaySql, onGameDay, onRealtimeTick } from '../clock.ts';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable, type Tx } from '../db.ts';
import { requireAccount, requireTeacherOf, UUID_RE } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { charge, credit } from '../ledger.ts';
import { looksLikeInjection } from '../llm.ts';
import { balanceOf, lockedProgram, notifyTeam, teamMember } from '../pipeline.ts';
import type { RequestContext } from '../routes.ts';
import {
  TRIAL_SIM_SCHEMA,
  expandSim,
  type CompactSim,
  buildSimSystemPrompt,
  buildSimUserMessage,
  monitoringLines,
  ruleSimulate,
  simInputHash,
  trimSimulation,
  validateSimulation,
  type SimInput,
  type TrialFacts,
} from './clinical-sim.ts';

// ── 줄 ──

interface TrialRow {
  id: string;
  class_id: string;
  team_id: string;
  program_revision_id: string;
  ind_application_id: string;
  patent_id: string;
  phase: TrialPhase;
  attempt: number;
  route: TrialRoute;
  form: IndForm;
  dose_mg: number;
  population: string;
  endpoint: string;
  status: TrialStatus;
  recruit_tier: RecruitTier;
  enrolled: number;
  target_n: number;
  min_n: number;
  opened_game_day: number;
  accrued_through_day: number;
  available_from_day: number | null;
  recruit_seq: number;
  recruit_spent_cents: string;
  facts: TrialFacts;
  enrolled_at_start: number | null;
  started_game_day: number | null;
  ends_game_day: number | null;
  decided_game_day: number | null;
  cost_paid_cents: string;
  input_hash: string | null;
  sim_status: SimStatus;
  sim_attempts: number;
  sim_error: string | null;
  result: TrialSimResult | null;
  result_source: 'llm' | 'teacher' | 'rule' | null;
  result_model: string | null;
  verdict: 'pass' | 'held' | null;
  hold_kind: HoldKind | null;
  reference: Reference | null;
  teacher_note: string | null;
  pending_alerted: boolean;
  started_by_name?: string | null;
  created_at: Date;
}

interface Reference {
  judgement: StepJudgement;
  passProb: number;
  noiseRange: number;
  cohort: string;
  enrolled: number;
  /** LLM 판정이 참고 확률과 크게 어긋남(교사 알림). */
  divergent?: boolean;
  /** 교사가 공개 전에 정정했으면 LLM 원본(설계 §12-19 '원본 보존'). */
  llmOriginal?: { verdict: 'pass' | 'held'; holdKind: HoldKind | null; model: string | null };
}

const TRIAL_COLS = `t.*, sa.display_name as started_by_name`;
const TRIAL_FROM = `web.clinical_trials t left join web.accounts sa on sa.user_id = t.started_by`;

const SIM_MAX_ATTEMPTS = 4;

// ── 후보 · 사실 ──

export interface PatentFacts {
  patentId: string;
  codeName: string;
  smiles: string;
  status: string;
  affinityKcal: number | null;
  targetId: string | null;
  mrsd: Partial<Record<IndForm, number>> | null;
  preclinical: TrialFacts['preclinical'];
}

interface IndRow {
  id: string;
  patent_id: string;
  form: IndForm;
  dose_mg: number;
  population: string | null;
  endpoint: string | null;
}

async function loadIndApproved(db: Queryable, revisionId: string): Promise<IndRow | null> {
  const r = await db.query<IndRow>(
    `select id, patent_id, form, dose_mg, population, endpoint from web.ind_applications
      where program_revision_id = $1 and status = 'approved' order by updated_at desc limit 1`,
    [revisionId],
  );
  return r.rows[0] ?? null;
}

async function loadPatentFacts(db: Queryable, teamId: string, patentId: string): Promise<PatentFacts | null> {
  const r = await db.query<{ id: string; code_name: string; canonical_smiles: string; status: string; affinity_kcal: number | null; target_id: string | null; animal: unknown }>(
    `select p.id, p.code_name, p.canonical_smiles, p.status, d.affinity_kcal, coalesce(d.target_id, a.target_id) as target_id,
            (select j.result from web.jobs j where j.patent_id = p.id and j.step = '3.2' and j.facility = 'animal_study' and j.status = 'succeeded'
              order by j.finished_at desc nulls last limit 1) as animal
       from web.patents p
       join web.jobs a on a.id = p.admet_job_id
       left join web.jobs d on d.id = a.parent_job_id
      where p.id = $1 and p.team_id = $2`,
    [patentId, teamId],
  );
  const row = r.rows[0];
  if (!row) return null;
  const animal = row.animal as { kind?: string; mrsdMgByForm?: Partial<Record<IndForm, number>>; noaelMgPerKgDay?: { rat: number; dog: number }; hedMgPerKg?: number; findings?: string[]; safetyFactor?: number } | null;
  const ok = animal?.kind === 'animal_study' && animal.mrsdMgByForm;
  return {
    patentId: row.id,
    codeName: row.code_name,
    smiles: row.canonical_smiles,
    status: row.status,
    affinityKcal: row.affinity_kcal,
    targetId: row.target_id,
    mrsd: ok ? animal!.mrsdMgByForm! : null,
    preclinical: ok
      ? { noaelMgPerKgDay: animal!.noaelMgPerKgDay ?? { rat: 0, dog: 0 }, hedMgPerKg: animal!.hedMgPerKg ?? 0, mrsdMgByForm: animal!.mrsdMgByForm!, findings: animal!.findings ?? [], safetyFactor: animal!.safetyFactor ?? 10 }
      : null,
  };
}

/** 백업 후보 — 3.2 끝의 백업(program_revisions.backup_job_id 의 유효 특허). 없으면 동물실험을 끝낸 다른 유효 특허. */
async function loadBackupPatentId(db: Queryable, teamId: string, revisionId: string, mainPatentId: string): Promise<string | null> {
  const r = await db.query<{ id: string }>(
    `select p.id from web.patents p
       left join web.program_revisions r on r.id = p.program_revision_id
      where p.team_id = $1 and p.program_revision_id = $2 and p.status = 'active' and p.id <> $3
        and exists (select 1 from web.jobs j where j.patent_id = p.id and j.step = '3.2' and j.facility = 'animal_study' and j.status = 'succeeded')
      order by (p.admet_job_id = r.backup_job_id) desc nulls last, p.created_at
      limit 1`,
    [teamId, revisionId, mainPatentId],
  );
  return r.rows[0]?.id ?? null;
}

const propsCache = new Map<string, MoleculeProperties>();

/** 물성(워커 RDKit) — 같은 특허의 앞 시도 사실이 있으면 그것을 쓴다(워커를 다시 부르지 않음). */
async function propsFor(deps: Deps, teamId: string, patent: PatentFacts, previous: TrialFacts | null): Promise<TrialFacts['props']> {
  if (previous) return previous.props;
  let p = propsCache.get(patent.smiles);
  if (!p) {
    // 3.3(F33 · 0014)이 신청서를 만들 때 계산해 둔 물성이 있으면 그것을 쓴다(워커를 다시 부르지 않음).
    try {
      const stored = await deps.db.query<{ properties: MoleculeProperties }>('select properties from web.ind_candidate_facts where patent_id = $1 and team_id = $2', [patent.patentId, teamId]);
      const sp = stored.rows[0]?.properties;
      if (sp && typeof sp.mw === 'number') p = sp;
    } catch {
      // 표가 없는 DB(0014 전) — 워커로.
    }
  }
  if (!p) {
    let outcome;
    try {
      outcome = await deps.worker.properties(patent.smiles);
    } catch {
      throw new ApiError(503, 'worker_unavailable', CLINICAL_COPY.err.workerDown);
    }
    if (!outcome.ok) throw new ApiError(400, 'invalid_input', outcome.message);
    p = outcome.properties;
    propsCache.set(patent.smiles, p);
  }
  return { mw: p.mw, clogp: p.clogp, tpsa: p.tpsa, hbd: p.hbd, hba: p.hba, rotb: p.rotb, basicAmines: p.basicAmines, alerts: [...p.alerts] };
}

const asMolecule = (props: TrialFacts['props']): MoleculeProperties =>
  ({ canonicalSmiles: '', flatSmiles: '', aromaticRings: 0, qed: 0, engine: 'stored', ...props, alerts: props.alerts as MoleculeProperties['alerts'] });

function targetInfo(targetId: string | null): { referenceKcal: number; cns: boolean } {
  const t = DOCKING_TARGETS.find((d) => d.id === targetId);
  return { referenceKcal: t?.referenceKcal ?? PIPELINE_RULES.affinity.defaultReferenceKcal, cns: t?.cns ?? false };
}

function scoresFor(input: { props: TrialFacts['props']; affinityKcal: number; targetId: string; form: IndForm; doseMg: number; population: string }) {
  const t = targetInfo(input.targetId);
  const cns = needsBrainExposure({ cnsTarget: t.cns, targetId: input.targetId, population: input.population });
  const scores = scoreCandidate({
    affinityKcal: input.affinityKcal,
    props: asMolecule(input.props),
    dose: input.doseMg as DoseMg,
    formulation: input.form,
    cns,
    referenceKcal: t.referenceKcal,
    cnsFromPopulation: cns && !t.cns,
  });
  return { scores, cns, referenceKcal: t.referenceKcal };
}

export function buildFacts(args: {
  patent: PatentFacts;
  props: TrialFacts['props'];
  targetId: string;
  phase: TrialPhase;
  attempt: number;
  form: IndForm;
  doseMg: number;
  population: string;
  endpoint: string;
  previous: TrialFacts['previous'];
}): TrialFacts {
  const profile = trialProfile(args.targetId);
  const affinityKcal = args.patent.affinityKcal ?? targetInfo(args.targetId).referenceKcal + PIPELINE_RULES.affinity.headroomKcal;
  const { scores, cns, referenceKcal } = scoresFor({ props: args.props, affinityKcal, targetId: args.targetId, form: args.form, doseMg: args.doseMg, population: args.population });
  const healthy = healthyVolunteers(args.phase, profile.oncology);
  const arms: TrialArmView[] = armPlan(args.phase, profile.oncology).map((a) => ({
    id: a.id,
    label: a.id === 'control' ? (profile.oncology ? CLINICAL_COPY.arm.controlOnc : CLINICAL_COPY.arm.control) : CLINICAL_COPY.arm[a.id],
    doseMg: armDoseMg(args.doseMg, a.doseFraction),
    share: a.share,
  }));
  const recruit = recruitModel({
    phase: args.phase,
    efficacy: scores.efficacy,
    safety: scores.safety,
    herg: scores.signals.herg,
    hepatotoxicity: scores.signals.hepatotoxicity,
    form: args.form,
    cns,
    targetId: args.targetId,
  });
  return {
    codeName: args.patent.codeName,
    targetId: args.targetId,
    profile,
    phase: args.phase,
    attempt: args.attempt,
    form: args.form,
    doseMg: args.doseMg,
    population: args.population,
    endpoint: args.endpoint,
    healthy,
    oncology: profile.oncology,
    cns,
    arms,
    props: args.props,
    signals: {
      herg: scores.signals.herg,
      hepatotoxicity: scores.signals.hepatotoxicity,
      oralAbsorption: scores.signals.oralAbsorption,
      bbb: scores.signals.bbb,
      transdermal: scores.signals.transdermal,
    },
    scores: { efficacy: scores.efficacy, safety: scores.safety, ...scores.inputs },
    affinityKcal,
    referenceKcal,
    preclinical: args.patent.preclinical,
    thresholds: PIPELINE_RULES.thresholds[args.phase],
    recruit,
    previous: args.previous,
  };
}

/** game-rules 참고 판정 — 인원이 목표보다 적으면 흔들림 폭을 √(목표/인원) 배로(검정력 게이지와 같은 뜻). */
export function referenceFor(facts: TrialFacts, enrolled: number, seed: string, stepId: string): Reference {
  const phase = facts.phase;
  const t = PIPELINE_RULES.thresholds[phase];
  const base = PIPELINE_RULES.noiseRange[phase];
  const range = Math.max(base, Math.round(base * Math.sqrt(facts.recruit.targetN / Math.max(1, enrolled))));
  const { scores } = scoresFor({ props: facts.props, affinityKcal: facts.affinityKcal, targetId: facts.targetId, form: facts.form, doseMg: facts.doseMg, population: facts.population });
  const noise = {
    efficacy: t.efficacy === null ? null : cohortNoise(seed, stepId, 'E', range),
    safety: t.safety === null ? null : cohortNoise(seed, stepId, 'S', range),
  };
  const judgement = judgeStep(phase, scores, noise, 0);
  let passProb = 1;
  if (t.efficacy !== null) {
    const pe = passProbability(scores.efficacyTenths, t.efficacy, range, 0);
    passProb *= pe.pass / pe.of;
  }
  if (t.safety !== null) {
    const ps = passProbability(scores.safetyTenths, t.safety, range, 0);
    passProb *= ps.pass / ps.of;
  }
  const cohort = createHash('sha256').update(stepId).digest('hex').slice(0, 12);
  return { judgement, passProb: Math.round(passProb * 1000) / 1000, noiseRange: range, cohort, enrolled };
}

/** 지금 프로토콜의 참고 통과 확률(목표 인원 기준 — 사다리 · 갈림길). */
function refProbAt(facts: TrialFacts): number {
  return referenceFor(facts, facts.recruit.targetN, 'ladder', 'ladder').passProb;
}

const simInputOf = (facts: TrialFacts, ref: Reference): SimInput => ({ facts, enrolled: ref.enrolled, refPassProb: ref.passProb, cohort: ref.cohort });

// ── 모집 정산 ──

/** 정산하지 않은 동안 쌓인 인원(읽기 전용 — 화면 실시간 표시). */
function projectEnrolled(row: TrialRow, gameDay: number): number {
  if (row.status !== 'recruiting') return row.enrolled;
  const from = Math.max(row.accrued_through_day, row.available_from_day ?? 0);
  const days = Math.max(0, gameDay - from);
  return Math.min(row.target_n, row.enrolled + tierPerDay(row.facts.recruit, row.recruit_tier) * days);
}

interface SettleOutcome {
  changed: boolean;
  recruitedNow: boolean;
  downgraded: boolean;
  enrolled: number;
}

/**
 * 모집 정산 — 잠금(programs share → teams update → 시도 update) 안에서. accrued_through_day 부터 gameDay 까지 그 단계 속도로 인원을 더하고
 * 그 단계 하루 비용 × (목표를 채우기까지의 날)을 과금한다(원장 멱등 'trial:<id>:recruit:<seq>'). 연구비가 모자라면 '기본'으로 내리고 그 구간은 기본 속도.
 */
async function settleRecruit(tx: Tx, row: TrialRow, gameDay: number, force: boolean): Promise<SettleOutcome> {
  const none = { changed: false, recruitedNow: false, downgraded: false, enrolled: row.enrolled };
  if (row.status !== 'recruiting') return none;
  if (gameDay <= row.accrued_through_day + 1e-9) return none;
  if (!force && Math.floor(gameDay) <= Math.floor(row.accrued_through_day)) return none;
  const from = Math.max(row.accrued_through_day, row.available_from_day ?? 0);
  const days = Math.max(0, gameDay - from);
  let tier = row.recruit_tier;
  let downgraded = false;
  const left = Math.max(0, row.target_n - row.enrolled);
  const plan = (t: RecruitTier) => {
    const per = tierPerDay(row.facts.recruit, t);
    const billDays = per > 0 ? Math.min(days, left / per) : 0;
    return { add: Math.min(left, per * days), cents: Math.round(RECRUIT_TIERS[t].cristaPerDay[row.phase] * billDays) * CENTS_PER_CRISTA };
  };
  let p = plan(tier);
  const seq = row.recruit_seq + 1;
  if (p.cents > 0) {
    try {
      await charge(tx, { teamId: row.team_id, cents: p.cents, kind: 'paid_work', idemKey: `trial:${row.id}:recruit:${seq}`, ref: { type: 'clinical_recruit', id: row.id } });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'insufficient_funds')) throw error;
      tier = 'basic';
      downgraded = true;
      p = plan('basic');
    }
  }
  const enrolled = row.enrolled + p.add;
  await tx.query(
    `update web.clinical_trials set enrolled = $2, accrued_through_day = $3, recruit_seq = $4, recruit_tier = $5,
            recruit_spent_cents = recruit_spent_cents + $6, updated_at = now() where id = $1`,
    [row.id, enrolled, gameDay, seq, tier, p.cents],
  );
  // 곡선 점의 단계 = 그 구간에 실제로 쓴 단계(연구비가 모자라 기본으로 내렸으면 기본).
  await tx.query('insert into web.clinical_recruit_log (trial_id, seq, game_day, enrolled, tier, cents) values ($1, $2, $3, $4, $5, $6)', [row.id, seq, gameDay, enrolled, tier, p.cents]);
  const recruitedNow = row.enrolled < row.target_n && enrolled >= row.target_n - 1e-9;
  Object.assign(row, { enrolled, accrued_through_day: gameDay, recruit_seq: seq, recruit_tier: tier });
  return { changed: true, recruitedNow, downgraded, enrolled };
}

/** 과정 소식(모집 완료 · 시작) — 전광판 처리기가 던져도 본 트랜잭션은 살린다(세이브포인트). */
async function postProgress(tx: Tx, deps: Deps, row: TrialRow, event: 'trial_recruited' | 'trial_started', headline: string, gameDay: number): Promise<(() => void) | null> {
  await tx.query('savepoint clinical_progress');
  try {
    const { after } = await postBoardEvent(tx, deps, {
      classId: row.class_id,
      teamId: row.team_id,
      kind: 'notice',
      headline,
      public: { event, phase: row.phase, codeName: row.facts.codeName, disease: row.facts.profile.disease },
      idemKey: `trial:${row.id}:${event}`,
      gameDay: Math.floor(gameDay),
    });
    await tx.query('release savepoint clinical_progress');
    return after;
  } catch (error) {
    await tx.query('rollback to savepoint clinical_progress');
    console.error('[clinical] 과정 소식 실패:', (error as Error).message);
    return null;
  }
}

async function tickerOf(db: Queryable, teamId: string): Promise<string> {
  const r = await db.query<{ ticker: string | null; startup_name: string | null }>('select ticker, startup_name from web.teams where id = $1', [teamId]);
  return r.rows[0]?.ticker ?? r.rows[0]?.startup_name ?? '모둠';
}

async function lockTrial(tx: Tx, teamId: string, trialId: string): Promise<TrialRow> {
  await tx.query('select 1 from web.programs where team_id = $1 for share', [teamId]);
  await tx.query('select 1 from web.teams where id = $1 for update', [teamId]);
  const r = await tx.query<TrialRow>(`select t.* from web.clinical_trials t where t.id = $1 and t.team_id = $2 for update`, [trialId, teamId]);
  const row = r.rows[0];
  if (!row) throw new ApiError(404, 'not_found', CLINICAL_COPY.err.notFound);
  return row;
}

// ── 판정 공개(끝나는 게임 일) ──

async function decideTrial(tx: Tx, deps: Deps, row: TrialRow, gameDay: number): Promise<{ afters: Array<() => void>; alert: boolean }> {
  const afters: Array<() => void> = [];
  if (row.status !== 'running' && row.status !== 'pending') return { afters, alert: false };
  if (row.ends_game_day === null || row.ends_game_day > gameDay + 1e-9) return { afters, alert: false };
  if (row.sim_status !== 'ready' || !row.result) {
    if (row.status === 'running') {
      await tx.query(`update web.clinical_trials set status = 'pending', pending_alerted = true, updated_at = now() where id = $1 and status = 'running'`, [row.id]);
      row.status = 'pending';
      return { afters, alert: !row.pending_alerted };
    }
    return { afters, alert: false };
  }
  const verdict = row.result.verdict;
  const holdKind = verdict === 'held' ? row.result.holdKind ?? 'efficacy' : null;
  const status: TrialStatus = verdict === 'pass' ? 'completed' : 'held';
  const decided = Math.max(row.ends_game_day, Math.min(gameDay, row.ends_game_day));
  const updated = await tx.query(
    `update web.clinical_trials set status = $2, verdict = $3, hold_kind = $4, decided_game_day = $5, updated_at = now()
      where id = $1 and status in ('running', 'pending')`,
    [row.id, status, verdict, holdKind, decided],
  );
  if (!updated.rowCount) return { afters, alert: false };
  const ticker = await tickerOf(tx, row.team_id);
  const label = PHASE_LABEL[row.phase];
  const next = nextPhase(row.phase);
  const headline =
    verdict === 'pass'
      ? `◆ ${ticker} 임상 ${label} 통과 — ${next ? `${PHASE_LABEL[next]} 진입` : '허가 신청 준비'}`
      : `◆ ${ticker} ${label} 보류 — ${CLINICAL_COPY.holdKind[holdKind!]}, 재설계 중`;
  const { after } = await postBoardEvent(tx, deps, {
    classId: row.class_id,
    teamId: row.team_id,
    kind: verdict === 'pass' ? 'trial_pass' : 'trial_held',
    tone: verdict === 'pass' ? 'normal' : 'bad',
    headline,
    public: { phase: row.phase, verdict, holdKind, codeName: row.facts.codeName, disease: row.facts.profile.disease, attempt: row.attempt },
    idemKey: `trial:${row.id}:verdict`,
    gameDay: Math.floor(decided),
  });
  afters.push(after);
  return { afters, alert: false };
}

// ── 시뮬레이션(Claude) ──

const inFlight = new Set<string>();
/** 시뮬레이션 임대 — 한 번 부르기(최대 2회 호출 × LLM 제한 시간)보다 길게. 다른 서버 프로세스가 같은 시도를 겹쳐 부르지 않게. */
const SIM_LEASE_MIN = 15;

/** 규칙 참고 확률과 LLM 판정이 크게 어긋나는가(설계 §5.14 · §12-19 기본안: 교사 알림만, 판정은 LLM 그대로). */
export const SIM_DIVERGE = { passBelow: 0.15, heldAbove: 0.85 } as const;
export function divergesFromReference(verdict: 'pass' | 'held', refPassProb: number): boolean {
  return verdict === 'pass' ? refPassProb < SIM_DIVERGE.passBelow : refPassProb > SIM_DIVERGE.heldAbove;
}

/**
 * 시뮬레이션 결과를 저장한다(잠금 안). 누가 넣느냐에 따라 받는 상태가 다르다(늦게 온 쪽이 앞선 결과를 덮지 않게):
 * - llm: sim_status = 'queued'(그 호출이 임대한 차례)일 때만 — 교사가 먼저 판정했으면 버린다.
 * - teacher: 아직 결과가 없을 때(queued · manual · none) — 교사 수동 판정.
 * - override: 결과는 있지만 아직 공개 전(running · pending) — 교사 정정(LLM 원본은 reference.llmOriginal 에 남긴다).
 * 저장했으면 true.
 */
async function storeSim(deps: Deps, trialId: string, result: TrialSimResult, source: 'llm' | 'teacher' | 'override' | 'rule', model: string | null, note?: string): Promise<boolean> {
  const afters: Array<() => void> = [];
  let teamId: string | null = null;
  let stored = false;
  let flag: TrialRow | null = null;
  await withTx(deps.db, async (tx) => {
    const found = await tx.query<{ team_id: string }>('select team_id from web.clinical_trials where id = $1', [trialId]);
    if (!found.rows[0]) return;
    teamId = found.rows[0].team_id;
    const row = await lockTrial(tx, teamId, trialId);
    if (row.status !== 'running' && row.status !== 'pending') return;
    if (source === 'llm' && row.sim_status !== 'queued') return;
    if (source === 'rule' && row.sim_status === 'ready') return;
    if (source === 'teacher' && row.sim_status === 'ready') return;
    if (source === 'override' && row.sim_status !== 'ready') return;
    let reference = row.reference;
    if (source === 'override' && reference && row.result && row.result_source === 'llm') {
      reference = { ...reference, llmOriginal: { verdict: row.result.verdict, holdKind: row.result.holdKind, model: row.result_model } };
    }
    const divergent = source === 'llm' && reference !== null && divergesFromReference(result.verdict, reference.passProb);
    if (divergent && reference) reference = { ...reference, divergent: true };
    await tx.query(
      `update web.clinical_trials set result = $2, result_source = $3, result_model = $4, sim_status = 'ready', sim_error = null, sim_next_at = null,
              teacher_note = coalesce($5, teacher_note), reference = $6, updated_at = now() where id = $1`,
      [trialId, JSON.stringify(result), sourceColumn(source), model, note ?? null, reference ? JSON.stringify(reference) : null],
    );
    if (source === 'llm' && row.input_hash) {
      await tx.query('insert into web.clinical_sim_cache (input_hash, version, result, model) values ($1, $2, $3, $4) on conflict (input_hash) do nothing', [row.input_hash, CLINICAL_SIM_VERSION, JSON.stringify(result), model]);
    }
    Object.assign(row, { result, result_source: sourceColumn(source), sim_status: 'ready' as SimStatus, reference });
    stored = true;
    if (divergent) flag = row;
    const gameDay = (await tx.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [row.class_id])).rows[0]!.d;
    const decided = await decideTrial(tx, deps, row, gameDay);
    afters.push(...decided.afters);
  });
  for (const fn of afters) fn();
  if (flag) {
    const f = flag as TrialRow;
    deps.hub.broadcastTeachers(f.class_id, {
      type: 'teacher.alert',
      classId: f.class_id,
      kind: 'review_flagged',
      refId: f.id,
      teamId: f.team_id,
      message: `${PHASE_LABEL[f.phase]} 임상 — AI 판정(${f.result!.verdict === 'pass' ? '통과' : '보류'})이 규칙 참고 확률(${Math.round((f.reference?.passProb ?? 0) * 100)}%)과 크게 달라요. 공개 전에 확인해 주세요.`,
    });
  }
  if (teamId && stored) notifyTeam(deps, teamId, 'clinical:sim');
  return stored;
}

const sourceColumn = (source: 'llm' | 'teacher' | 'override' | 'rule'): 'llm' | 'teacher' | 'rule' => (source === 'override' ? 'teacher' : source);

/**
 * AI 시뮬레이션을 끝내 쓸 수 없다(거절 · 검사 불일치 · 키 없음 · 하루 상한 · 여러 번 실패) — 교사를 기다리지 않고 규칙 결과로 정한다.
 * 판정은 시작 때 저장한 game-rules 판정(`reference.judgement` — 흔들림 포함, 결정적)을 따르고, 숫자 표는 `ruleSimulate` 가 그 판정에 맞춰 만든다.
 * 공개는 그대로 끝나는 게임 일(임상 기간이 곧 숙고 기간).
 */
export function ruleVerdictOf(ref: Pick<Reference, 'judgement'>): { verdict: 'pass' | 'held'; holdKind: HoldKind | null } {
  if (ref.judgement.passed) return { verdict: 'pass', holdKind: null };
  return { verdict: 'held', holdKind: ref.judgement.failure ?? 'efficacy' };
}

async function ruleFallback(deps: Deps, row: TrialRow, error: string): Promise<void> {
  await deps.db.query(`update web.clinical_trials set sim_error = $2, updated_at = now() where id = $1 and sim_status <> 'ready'`, [row.id, error.slice(0, 300)]);
  if (!row.reference) return;
  const { verdict, holdKind } = ruleVerdictOf(row.reference);
  await storeSim(deps, row.id, ruleSimulate(simInputOf(row.facts, row.reference), verdict, holdKind), 'rule', null);
}

async function simFail(deps: Deps, row: TrialRow, kind: 'final' | 'retry', error: string, delayMin: number): Promise<void> {
  const r = await deps.db.query<{ sim_attempts: number }>(
    `update web.clinical_trials set sim_attempts = sim_attempts + 1, sim_error = $2,
            sim_next_at = case when $3 = 'final' or sim_attempts + 1 >= $5 then null else now() + make_interval(mins => $4::int) end, updated_at = now()
      where id = $1 and sim_status = 'queued' returning sim_attempts`,
    [row.id, error.slice(0, 300), kind, delayMin, SIM_MAX_ATTEMPTS],
  );
  const attempts = r.rows[0]?.sim_attempts ?? 0;
  if (kind === 'final' || attempts >= SIM_MAX_ATTEMPTS) await ruleFallback(deps, row, error);
}

/** 시도 하나를 시뮬레이션한다(시작 직후 · 재시도 루프). 캐시 → Claude → 검사 → 한 번 다시 → 실패면 규칙 결과. */
export async function runSimulation(deps: Deps, trialId: string): Promise<void> {
  if (inFlight.has(trialId)) return;
  inFlight.add(trialId);
  try {
    const leased = await deps.db.query<TrialRow>(
      `update web.clinical_trials set sim_next_at = now() + make_interval(mins => ${SIM_LEASE_MIN})
        where id = $1 and sim_status = 'queued' and status in ('running', 'pending') and (sim_next_at is null or sim_next_at <= now())
        returning *`,
      [trialId],
    );
    const row = leased.rows[0];
    if (!row || !row.reference || !row.input_hash) return;
    const input = simInputOf(row.facts, row.reference);
    const cached = await deps.db.query<{ result: TrialSimResult; model: string | null }>('select result, model from web.clinical_sim_cache where input_hash = $1', [row.input_hash]);
    if (cached.rows[0]) {
      await storeSim(deps, trialId, cached.rows[0].result, 'llm', cached.rows[0].model);
      return;
    }
    let problems: string[] | undefined;
    for (let round = 0; round < 2; round++) {
      const outcome = await deps.llm.call({
        task: 'clinical_sim',
        version: CLINICAL_SIM_VERSION,
        system: buildSimSystemPrompt(),
        user: buildSimUserMessage(input, problems),
        schema: TRIAL_SIM_SCHEMA,
        teamId: row.team_id,
        classId: row.class_id,
        refId: row.id,
      });
      if (outcome.kind === 'ok') {
        const expanded = expandSim(row.facts, outcome.output as CompactSim);
        const bad = expanded.result ? validateSimulation(row.facts, input.enrolled, expanded.result) : expanded.problems;
        if (bad.length === 0 && expanded.result) {
          await storeSim(deps, trialId, trimSimulation(expanded.result), 'llm', outcome.model);
          return;
        }
        problems = bad;
        console.warn(`[clinical] 시뮬레이션 검사 실패(${round + 1}회) ${row.id}: ${bad.slice(0, 3).join(' / ')}`);
        continue;
      }
      if (outcome.kind === 'refused') return simFail(deps, row, 'final', `거절(${outcome.category ?? '분류 없음'})`, 0);
      // 키 없음 · 꺼짐 · 하루 상한 — 기다리지 않고 규칙 결과(공개는 그대로 끝나는 게임 일).
      if (outcome.kind === 'unavailable') return simFail(deps, row, 'final', `LLM 쓸 수 없음(${outcome.reason})`, 0);
      if (outcome.kind === 'invalid') {
        problems = [`출력이 스키마에 맞지 않았어요(${outcome.reason})`];
        continue;
      }
      return simFail(deps, row, outcome.retryable ? 'retry' : 'final', `오류 ${outcome.code}`, 1);
    }
    return simFail(deps, row, 'final', `검사 불일치: ${(problems ?? []).slice(0, 2).join(' / ')}`, 0);
  } catch (error) {
    console.error(`[clinical] 시뮬레이션 ${trialId} 오류:`, (error as Error).message);
  } finally {
    inFlight.delete(trialId);
  }
}

// ── 시계 처리기 ──

async function onTick(deps: Deps): Promise<void> {
  const due = await deps.db.query<{ id: string; team_id: string; kind: 'recruit' | 'decide' }>(
    `select t.id, t.team_id, case when t.status = 'recruiting' then 'recruit' else 'decide' end as kind
       from web.clinical_trials t join web.classes c on c.id = t.class_id
      where (t.status = 'recruiting' and floor(${gameDaySql('c')}) > floor(t.accrued_through_day))
         or (t.status in ('running', 'pending') and t.ends_game_day <= ${gameDaySql('c')} and (t.status = 'running' or t.sim_status = 'ready'))
      limit 200`,
  );
  for (const d of due.rows) {
    try {
      const afters: Array<() => void> = [];
      let reason = 'clinical:recruit';
      await withTx(deps.db, async (tx) => {
        const row = await lockTrial(tx, d.team_id, d.id);
        const gameDay = (await tx.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [row.class_id])).rows[0]!.d;
        if (row.status === 'recruiting') {
          const s = await settleRecruit(tx, row, gameDay, false);
          if (s.recruitedNow) {
            const ticker = await tickerOf(tx, row.team_id);
            const after = await postProgress(tx, deps, row, 'trial_recruited', `◆ ${ticker} ${PHASE_LABEL[row.phase]} 참여자 모집 완료 — ${row.target_n}명`, gameDay);
            if (after) afters.push(after);
          }
        } else {
          reason = 'clinical:decided';
          const r = await decideTrial(tx, deps, row, gameDay);
          afters.push(...r.afters);
        }
      });
      for (const fn of afters) fn();
      notifyTeam(deps, d.team_id, reason);
    } catch (error) {
      console.error(`[clinical] 틱 ${d.id} 오류:`, (error as Error).message);
    }
  }
}

async function simRetryLoop(deps: Deps): Promise<void> {
  // AI 를 쓸 수 없어도 돈다 — runSimulation 이 'unavailable' 을 받아 규칙 결과로 정한다.
  const due = await deps.db.query<{ id: string }>(
    `select id from web.clinical_trials where sim_status = 'queued' and status in ('running', 'pending') and (sim_next_at is null or sim_next_at <= now())
      order by updated_at limit 4`,
  );
  await Promise.all(due.rows.map((r) => runSimulation(deps, r.id)));
}

// ── 보기 ──

async function loadTrials(db: Queryable, revisionId: string): Promise<TrialRow[]> {
  const r = await db.query<TrialRow>(`select ${TRIAL_COLS} from ${TRIAL_FROM} where t.program_revision_id = $1 order by t.created_at desc`, [revisionId]);
  return r.rows;
}

const crista = (cents: string | number): number => centsToCrista(Number(cents));

function recruitView(row: TrialRow, gameDay: number, log: Array<{ game_day: number; enrolled: number; tier: RecruitTier }>): RecruitView {
  const model = row.facts.recruit;
  const live = projectEnrolled(row, gameDay);
  const enrolledNow = row.status === 'recruiting' ? live : row.enrolled_at_start ?? Math.floor(row.enrolled);
  const enrolled = Math.floor(enrolledNow + 1e-9);
  const tiers = RECRUIT_TIER_IDS.map((tier) => {
    const pr = recruitProjection(model, row.phase, tier, enrolled);
    return { tier, speed: RECRUIT_TIERS[tier].speed, cristaPerDay: RECRUIT_TIERS[tier].cristaPerDay[row.phase], perDay: tierPerDay(model, tier), daysLeft: Number.isFinite(pr.daysLeft) ? pr.daysLeft : null, costLeftCrista: pr.costLeftCrista };
  });
  const curve = [{ day: row.opened_game_day, enrolled: 0, tier: 'basic' as RecruitTier }, ...log.map((l) => ({ day: l.game_day, enrolled: Math.floor(l.enrolled + 1e-9), tier: l.tier }))];
  if (row.status === 'recruiting' && gameDay > (curve.at(-1)?.day ?? 0)) curve.push({ day: gameDay, enrolled, tier: row.recruit_tier });
  return {
    tier: row.recruit_tier,
    enrolled,
    screened: Math.round(enrolled / (1 - model.screenFailPct / 100)),
    targetN: row.target_n,
    minN: row.min_n,
    perDay: tierPerDay(model, row.recruit_tier),
    screenFailPct: model.screenFailPct,
    dropoutPct: model.dropoutPct,
    factors: model.factors,
    tiers,
    curve,
    availableFromDay: row.available_from_day,
    spentCrista: crista(row.recruit_spent_cents),
    power: trialPower(row.phase, enrolled, row.facts.oncology),
    powerAtTarget: trialPower(row.phase, row.target_n, row.facts.oncology),
  };
}

const BOUNTY_VIEW_CHOICES = {
  axes: BOUNTY_CHOICES.step.axes.map((id) => ({ id, label: BOUNTY_AXIS_LABEL[id] })),
  factors: BOUNTY_CHOICES.step.factors.map((id) => ({ id, label: BOUNTY_FACTOR_LABEL[id] })),
  remedies: BOUNTY_CHOICES.step.remedies.map((id) => ({ id, label: BOUNTY_REMEDY_LABEL[id] })),
};

interface BountyRow {
  trial_id: string;
  attempts: number;
  last_attempt_at: Date | null;
  last_hints: string[];
  passed: boolean;
  refund_cents: string;
}

function bountyView(row: TrialRow, b: BountyRow | undefined): TrialBountyView | null {
  if (row.status !== 'held') return null;
  const operational = row.hold_kind === 'operational';
  const retryAt = b?.last_attempt_at && !b.passed ? new Date(b.last_attempt_at.getTime() + TRIAL_BOUNTY_RETRY_SEC * 1000) : null;
  return {
    eligible: !operational && !b?.passed && Number(row.cost_paid_cents) > 0,
    reason: operational ? CLINICAL_COPY.bountyOperational : null,
    claimed: b?.passed ?? false,
    refundCrista: b?.passed ? crista(b.refund_cents) : Math.floor(crista(row.cost_paid_cents) * TRIAL_BOUNTY_RATE[row.phase]),
    retryAt: retryAt && retryAt.getTime() > Date.now() ? retryAt.toISOString() : null,
    lastHints: b?.last_hints ?? [],
    choices: BOUNTY_VIEW_CHOICES,
  };
}

function trialView(row: TrialRow, gameDay: number, log: Array<{ game_day: number; enrolled: number; tier: RecruitTier }>, bounty: BountyRow | undefined, reveal: boolean): TrialView {
  const f = row.facts;
  const progressPct =
    row.status === 'running' && row.started_game_day !== null && row.ends_game_day !== null
      ? Math.round(Math.max(0, Math.min(1, (gameDay - row.started_game_day) / Math.max(1e-9, row.ends_game_day - row.started_game_day))) * 100)
      : row.status === 'pending'
        ? 100
        : null;
  const revealed = reveal && (row.status === 'completed' || row.status === 'held');
  return {
    id: row.id,
    phase: row.phase,
    attempt: row.attempt,
    route: row.route,
    status: row.status,
    protocol: {
      phase: row.phase,
      codeName: f.codeName,
      patentId: row.patent_id,
      form: row.form,
      doseMg: row.dose_mg,
      population: row.population,
      endpoint: row.endpoint,
      healthy: f.healthy,
      oncology: f.oncology,
      arms: f.arms,
      targetN: row.target_n,
      minN: row.min_n,
      gameDays: PHASE_RULES[row.phase].gameDays,
      costCrista: PHASE_RULES[row.phase].costCrista,
      primaryWeek: PHASE_RULES[row.phase].primaryWeek,
    },
    recruit: recruitView(row, gameDay, log),
    openedGameDay: row.opened_game_day,
    startedGameDay: row.started_game_day,
    endsGameDay: row.ends_game_day,
    decidedGameDay: row.decided_game_day,
    progressPct,
    enrolledAtStart: row.enrolled_at_start,
    startedByName: row.started_by_name ?? null,
    monitoring: row.status === 'running' || row.status === 'pending' ? monitoringLines(f, progressPct ?? 0) : [],
    result: revealed ? row.result : null,
    verdict: revealed ? row.verdict : null,
    holdKind: revealed ? row.hold_kind : null,
    resultSource: revealed ? row.result_source : null,
    resultModel: revealed ? row.result_model : null,
    bounty: bountyView(row, bounty),
    costPaidCrista: crista(row.cost_paid_cents),
  };
}

async function logsFor(db: Queryable, ids: string[]): Promise<Map<string, Array<{ game_day: number; enrolled: number; tier: RecruitTier }>>> {
  const out = new Map<string, Array<{ game_day: number; enrolled: number; tier: RecruitTier }>>();
  if (ids.length === 0) return out;
  const r = await db.query<{ trial_id: string; game_day: number; enrolled: number; tier: RecruitTier; cents: string }>(
    'select trial_id, game_day, enrolled, tier, cents from web.clinical_recruit_log where trial_id = any($1::uuid[]) order by trial_id, seq',
    [ids],
  );
  for (const row of r.rows) {
    const list = out.get(row.trial_id) ?? [];
    list.push(row);
    out.set(row.trial_id, list);
  }
  return out;
}

/** 지금 이어서 열 수 있는 것 — 첫 1상 · 다음 상 · 재도전 3경로(규칙 검사 결과 포함). */
async function routeOptions(db: Queryable, args: { teamId: string; revisionId: string; ind: IndRow | null; trials: TrialRow[]; main: PatentFacts | null; backup: PatentFacts | null; gameDay: number; balanceCents: number }): Promise<RouteOptionView[]> {
  const { trials, ind } = args;
  if (!ind || !args.main) return [];
  if (trials.some((t) => t.status === 'recruiting' || t.status === 'running' || t.status === 'pending')) return [];
  const last = trials[0];
  if (!last) return [{ route: 'first', phase: 'phase1', available: true, reason: null, feeCrista: 0, waitDays: 0, codeName: args.main.codeName }];
  if (last.status === 'completed') {
    const next = nextPhase(last.phase);
    return next ? [{ route: 'next', phase: next, available: true, reason: null, feeCrista: 0, waitDays: 0, codeName: last.facts.codeName }] : [];
  }
  if (last.status !== 'held') return [];
  const out: RouteOptionView[] = [{ route: 'same', phase: last.phase, available: true, reason: null, feeCrista: 0, waitDays: 0, codeName: last.facts.codeName }];
  // 용량 · 제형 변경 — 그 후보의 제형별 MRSD 이하 · 경피 적합 · S ≥ 35.
  const patentNow = last.patent_id === args.main.patentId ? args.main : last.patent_id === args.backup?.patentId ? args.backup : await loadPatentFacts(db, args.teamId, last.patent_id);
  const options = amendOptions(last, patentNow?.mrsd ?? null, trials);
  out.push({ route: 'amend', phase: last.phase, available: options.some((o) => o.ok), reason: options.some((o) => o.ok) ? null : CLINICAL_COPY.err.noAmend, feeCrista: 0, waitDays: 0, options });
  const backupAvail = args.backup && args.backup.patentId !== last.patent_id && args.backup.status === 'active';
  const fee = BACKUP_SWAP_FEE_CRISTA;
  out.push({
    route: 'backup',
    phase: 'phase1',
    available: Boolean(backupAvail) && args.balanceCents >= cristaToCents(fee),
    reason: !backupAvail ? CLINICAL_COPY.err.noBackup : args.balanceCents < cristaToCents(fee) ? CLINICAL_COPY.err.noFunds : null,
    feeCrista: fee,
    waitDays: BACKUP_SWAP_WAIT_DAYS,
    ...(args.backup ? { codeName: args.backup.codeName } : {}),
  });
  return out;
}

function amendOptions(last: TrialRow, mrsd: Partial<Record<IndForm, number>> | null, trials: TrialRow[]): NonNullable<RouteOptionView['options']> {
  const passedPhase1 = trials.filter((t) => t.phase === 'phase1' && t.status === 'completed' && t.patent_id === last.patent_id);
  const out: NonNullable<RouteOptionView['options']> = [];
  for (const form of IND_FORMS) {
    for (const dose of IND_DOSES) {
      if (form === last.form && dose === last.dose_mg) continue;
      const { scores } = scoresFor({ props: last.facts.props, affinityKcal: last.facts.affinityKcal, targetId: last.facts.targetId, form, doseMg: dose, population: last.population });
      let reason: string | null = null;
      const cap = mrsd?.[form];
      if (mrsd ? cap === undefined || dose > cap : form !== last.form || dose > last.dose_mg) reason = mrsd ? fillCopy(CLINICAL_COPY.err.overMrsd, { cap: cap ?? '—' }) : CLINICAL_COPY.err.noMrsd;
      else if (form === 'transdermal' && scores.signals.transdermal === 'unsuitable') reason = CLINICAL_COPY.err.transdermalUnsuitable;
      else if (scores.safety < IND_SAFETY_MIN) reason = fillCopy(CLINICAL_COPY.err.safetyMin, { s: scores.safety.toFixed(1), min: IND_SAFETY_MIN });
      const resets = last.phase !== 'phase1' && (form !== last.form || !passedPhase1.some((t) => t.form === form && t.dose_mg >= dose));
      out.push({ form, doseMg: dose, ok: reason === null, reason, efficacy: scores.efficacy, safety: scores.safety, resetsToPhase1: resets });
    }
  }
  return out;
}

function ladderOf(trials: TrialRow[], current: TrialFacts | null): PhaseLadderView[] {
  return TRIAL_PHASES.map((phase) => {
    const mine = trials.filter((t) => t.phase === phase);
    const latest = mine[0];
    const state: PhaseLadderView['state'] = !latest
      ? 'todo'
      : latest.status === 'completed'
        ? 'passed'
        : latest.status === 'held'
          ? 'held'
          : latest.status === 'running'
            ? 'running'
            : latest.status === 'pending'
              ? 'pending'
              : 'recruiting';
    const passedAny = mine.some((t) => t.status === 'completed');
    let efficacy = 0;
    let safety = 0;
    let refPassProb = 0;
    if (current) {
      const { scores } = scoresFor({ props: current.props, affinityKcal: current.affinityKcal, targetId: current.targetId, form: current.form, doseMg: current.doseMg, population: current.population });
      efficacy = scores.efficacy;
      safety = scores.safety;
      refPassProb = refProbAt({ ...current, phase, recruit: { ...current.recruit, targetN: targetN(phase, current) }, thresholds: PIPELINE_RULES.thresholds[phase] });
    }
    return { phase, state: passedAny ? 'passed' : state, attempts: mine.length, thresholds: PIPELINE_RULES.thresholds[phase], efficacy, safety, refPassProb, costCrista: PHASE_RULES[phase].costCrista, gameDays: PHASE_RULES[phase].gameDays };
  });
}
const targetN = (phase: TrialPhase, f: TrialFacts) => targetNOf(phase, f.oncology);

function fundingOf(trials: TrialRow[], logs: Map<string, Array<{ game_day: number; enrolled: number; tier: RecruitTier; cents?: string }>>, bounties: Map<string, BountyRow>): FundingStepView[] {
  const out: FundingStepView[] = [];
  for (const t of trials) {
    if (t.route === 'backup') out.push({ day: t.opened_game_day, at: t.created_at.toISOString(), crista: -BACKUP_SWAP_FEE_CRISTA, kind: 'backup_fee', phase: t.phase });
    for (const l of logs.get(t.id) ?? []) if (Number(l.cents ?? 0) > 0) out.push({ day: l.game_day, at: '', crista: -crista(l.cents ?? 0), kind: 'recruit', phase: t.phase });
    if (Number(t.cost_paid_cents) > 0) out.push({ day: t.started_game_day, at: '', crista: -crista(t.cost_paid_cents), kind: 'trial_fee', phase: t.phase });
    const b = bounties.get(t.id);
    if (b?.passed) out.push({ day: t.decided_game_day, at: '', crista: crista(b.refund_cents), kind: 'bounty', phase: t.phase });
  }
  return out.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
}

export async function loadClinical(deps: Deps, account: AccountView): Promise<ClinicalResponse> {
  const who = await teamMember(deps.db, account);
  const db = deps.db;
  const program = await db.query<{ revision_id: string; target_id: string | null }>(
    'select r.id as revision_id, r.target_id from web.programs p join web.program_revisions r on r.id = p.current_revision_id where p.team_id = $1',
    [who.teamId],
  );
  const prog = program.rows[0];
  const gameDay = (await db.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [who.classId])).rows[0]?.d ?? 0;
  const balance = await balanceOf(db, who.teamId);
  const empty: ClinicalResponse = { gameDay, enabled: false, lockedReason: CLINICAL_COPY.locked, candidate: null, trials: [], current: null, routes: [], ladder: ladderOf([], null), funding: [], balanceCrista: centsToCrista(balance), done: false };
  if (!prog?.target_id) return empty;
  const ind = await loadIndApproved(db, prog.revision_id);
  const trials = await loadTrials(db, prog.revision_id);
  if (!ind && trials.length === 0) return empty;
  const main = ind ? await loadPatentFacts(db, who.teamId, ind.patent_id) : null;
  const backupId = ind ? await loadBackupPatentId(db, who.teamId, prog.revision_id, ind.patent_id) : null;
  const backup = backupId ? await loadPatentFacts(db, who.teamId, backupId) : null;
  const ids = trials.map((t) => t.id);
  const [logs, bountyRows] = await Promise.all([
    logsFor(db, ids),
    ids.length ? db.query<BountyRow>('select * from web.clinical_bounties where trial_id = any($1::uuid[])', [ids]) : Promise.resolve({ rows: [] as BountyRow[] }),
  ]);
  const bounties = new Map(bountyRows.rows.map((b) => [b.trial_id, b]));
  const views = trials.map((t) => trialView(t, gameDay, logs.get(t.id) ?? [], bounties.get(t.id), true));
  const current = views.find((v) => v.status === 'recruiting' || v.status === 'running' || v.status === 'pending') ?? null;
  let latestFacts = trials[0]?.facts ?? null;
  // 첫 1상 전 — IND 승인서(제형 · 용량 · 환자군)로 사실을 미리 계산해 허들 · 참고 확률을 보인다(0 으로 보이지 않게).
  // 물성은 3.3 이 저장한 값(없으면 워커 한 번 — 닿지 않으면 미리보기 없이).
  if (!latestFacts && ind && main) {
    try {
      const props = await propsFor(deps, who.teamId, main, null);
      latestFacts = buildFacts({ patent: main, props, targetId: prog.target_id, phase: 'phase1', attempt: 1, form: ind.form, doseMg: ind.dose_mg, population: ind.population ?? '', endpoint: ind.endpoint ?? '', previous: [] });
    } catch {
      latestFacts = null;
    }
  }
  let candidate: ClinicalCandidateView | null = null;
  if (ind && main) {
    const f = latestFacts;
    const form = f?.form ?? ind.form;
    const doseMg = f?.doseMg ?? ind.dose_mg;
    let efficacy = 0;
    let safety = 0;
    if (f) {
      efficacy = f.scores.efficacy;
      safety = f.scores.safety;
    }
    candidate = {
      codeName: f?.codeName ?? main.codeName,
      patentId: trials[0]?.patent_id ?? main.patentId,
      form,
      doseMg,
      population: ind.population ?? '',
      endpoint: ind.endpoint ?? '',
      efficacy,
      safety,
      mrsdMgByForm: (trials[0]?.patent_id === backup?.patentId ? backup?.mrsd : main.mrsd) ?? null,
      profile: trialProfile(prog.target_id),
      backup: backup ? { codeName: backup.codeName, patentId: backup.patentId, mrsdMgByForm: backup.mrsd } : null,
    };
  }
  return {
    gameDay,
    enabled: Boolean(ind),
    lockedReason: ind ? null : CLINICAL_COPY.locked,
    candidate,
    trials: views,
    current,
    routes: await routeOptions(db, { teamId: who.teamId, revisionId: prog.revision_id, ind, trials, main, backup, gameDay, balanceCents: balance }),
    ladder: ladderOf(trials, latestFacts),
    funding: fundingOf(trials, logs as Map<string, Array<{ game_day: number; enrolled: number; tier: RecruitTier; cents?: string }>>, bounties),
    balanceCrista: centsToCrista(balance),
    done: trials.some((t) => t.phase === 'phase3' && t.status === 'completed'),
  };
}

// ── 행동 ──

function checkRoute(raw: unknown): { route: TrialRoute; form?: IndForm; doseMg?: number } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const route = body.route;
  if (route !== 'first' && route !== 'next' && route !== 'same' && route !== 'amend' && route !== 'backup') throw badRequest(CLINICAL_COPY.err.badRoute);
  if (route !== 'amend') return { route };
  if (!IND_FORMS.includes(body.form as IndForm)) throw badRequest(CLINICAL_COPY.err.badForm);
  if (!IND_DOSES.includes(body.doseMg as 10)) throw badRequest(CLINICAL_COPY.err.badDose);
  return { route, form: body.form as IndForm, doseMg: body.doseMg as number };
}

export async function openTrial(deps: Deps, account: AccountView, raw: unknown): Promise<{ trialId: string }> {
  const who = await teamMember(deps.db, account);
  const req = checkRoute(raw);
  // 워커 호출(물성)은 잠금 밖에서 먼저.
  const pre = await deps.db.query<{ revision_id: string; target_id: string | null }>(
    'select r.id as revision_id, r.target_id from web.programs p join web.program_revisions r on r.id = p.current_revision_id where p.team_id = $1',
    [who.teamId],
  );
  const revisionId = pre.rows[0]?.revision_id;
  const targetId = pre.rows[0]?.target_id;
  if (!revisionId || !targetId) throw new ApiError(409, 'step_locked', CLINICAL_COPY.locked);
  const ind = await loadIndApproved(deps.db, revisionId);
  if (!ind) throw new ApiError(409, 'step_locked', CLINICAL_COPY.locked);
  const trialsPre = await loadTrials(deps.db, revisionId);
  const last = trialsPre[0] ?? null;
  // 백업 = routeOptions 와 같은 규칙(주력이 아닌 동물실험 끝난 유효 특허) — 화면에 '없음'으로 보이는 경로가 서버에서 열리지 않게.
  const patentId = req.route === 'backup' ? await loadBackupPatentId(deps.db, who.teamId, revisionId, ind.patent_id) : last?.patent_id ?? ind.patent_id;
  if (!patentId) throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.noBackup);
  const patent = await loadPatentFacts(deps.db, who.teamId, patentId);
  if (!patent || patent.status !== 'active') throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.patentInactive);
  const prevFacts = trialsPre.find((t) => t.patent_id === patentId)?.facts ?? null;
  const props = await propsFor(deps, who.teamId, patent, prevFacts);

  const id = randomUUID();
  const result = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    if (program.revision_id !== revisionId) throw new ApiError(409, 'stale', CLINICAL_COPY.err.targetChanged);
    await tx.query('select 1 from web.teams where id = $1 for update', [who.teamId]);
    const trials = await loadTrials(tx, revisionId);
    if (trials.some((t) => t.status === 'recruiting' || t.status === 'running' || t.status === 'pending')) throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.liveExists);
    const latest = trials[0] ?? null;
    let phase: TrialPhase;
    let form: IndForm = latest?.form ?? ind.form;
    let doseMg: number = latest?.dose_mg ?? ind.dose_mg;
    switch (req.route) {
      case 'first':
        if (latest) throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.firstOpened);
        phase = 'phase1';
        form = ind.form;
        doseMg = ind.dose_mg;
        break;
      case 'next': {
        const next = latest?.status === 'completed' ? nextPhase(latest.phase) : null;
        if (!next) throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.needPass);
        phase = next;
        break;
      }
      case 'same':
        if (latest?.status !== 'held') throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.needHeldSame);
        phase = latest.phase;
        break;
      case 'amend': {
        if (latest?.status !== 'held') throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.needHeldAmend);
        const option = amendOptions(latest, patent.mrsd, trials).find((o) => o.form === req.form && o.doseMg === req.doseMg);
        if (!option) throw badRequest(CLINICAL_COPY.err.sameCombo);
        if (!option.ok) throw new ApiError(400, 'reason_blocked', option.reason ?? CLINICAL_COPY.err.badCombo);
        phase = option.resetsToPhase1 ? 'phase1' : latest.phase;
        form = option.form;
        doseMg = option.doseMg;
        break;
      }
      case 'backup': {
        if (latest?.status !== 'held') throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.needHeldBackup);
        if (patentId === latest.patent_id) throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.backupSame);
        phase = 'phase1';
        const cap = patent.mrsd?.[form];
        if (patent.mrsd && (cap === undefined || doseMg > cap)) {
          const fit = [...IND_DOSES].reverse().find((d) => cap !== undefined && d <= cap);
          if (!fit) throw new ApiError(400, 'reason_blocked', fillCopy(CLINICAL_COPY.err.backupMrsd, { form: CLINICAL_COPY.formLabel[form] }));
          doseMg = fit;
        }
        break;
      }
    }
    const attempt = trials.filter((t) => t.phase === phase).reduce((m, t) => Math.max(m, t.attempt), 0) + 1;
    const previous = trials
      .filter((t) => t.verdict)
      .slice(0, 6)
      .map((t) => ({
        phase: t.phase,
        attempt: t.attempt,
        verdict: t.verdict!,
        holdKind: t.hold_kind,
        doseMg: t.dose_mg,
        form: t.form,
        summary: [...(t.result?.analysis ?? '')].slice(0, 160).join(''),
      }));
    const facts = buildFacts({ patent, props, targetId, phase, attempt, form, doseMg, population: ind.population ?? '', endpoint: ind.endpoint ?? '', previous });
    if (req.route !== 'first' && req.route !== 'next' && facts.scores.safety < IND_SAFETY_MIN) throw new ApiError(400, 'reason_blocked', fillCopy(CLINICAL_COPY.err.safetyMin, { s: facts.scores.safety.toFixed(1), min: IND_SAFETY_MIN }));
    const gameDay = (await tx.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [who.classId])).rows[0]!.d;
    const available = req.route === 'backup' ? gameDay + BACKUP_SWAP_WAIT_DAYS : null;
    try {
      await tx.query('savepoint open_trial');
      await tx.query(
        `insert into web.clinical_trials (id, class_id, team_id, program_revision_id, ind_application_id, patent_id, phase, attempt, route, form, dose_mg,
                population, endpoint, target_n, min_n, opened_game_day, accrued_through_day, available_from_day, facts, opened_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, $18, $19)`,
        [id, who.classId, who.teamId, revisionId, ind.id, patentId, phase, attempt, req.route, form, doseMg, ind.population || '—', ind.endpoint || '—', facts.recruit.targetN, facts.recruit.minN, gameDay, available, JSON.stringify(facts), account.userId],
      );
      await tx.query('release savepoint open_trial');
    } catch (error) {
      await tx.query('rollback to savepoint open_trial');
      if (isUniqueViolation(error)) throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.justOpened);
      throw error;
    }
    if (req.route === 'backup') {
      await charge(tx, { teamId: who.teamId, crista: BACKUP_SWAP_FEE_CRISTA, kind: 'paid_work', idemKey: `trial:${id}:backup`, createdBy: account.userId, ref: { type: 'clinical_backup', id } });
    }
    return { trialId: id };
  });
  notifyTeam(deps, who.teamId, 'clinical:open', account.displayName);
  return result;
}

export async function setTier(deps: Deps, account: AccountView, trialId: string, raw: unknown): Promise<{ ok: true; tier: RecruitTier }> {
  const who = await teamMember(deps.db, account);
  const tier = ((raw ?? {}) as Record<string, unknown>).tier;
  if (!RECRUIT_TIER_IDS.includes(tier as RecruitTier)) throw badRequest(CLINICAL_COPY.err.badTier);
  const afters: Array<() => void> = [];
  await withTx(deps.db, async (tx) => {
    const row = await lockTrial(tx, who.teamId, trialId);
    if (row.status !== 'recruiting') throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.tierNotRecruiting);
    const gameDay = (await tx.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [row.class_id])).rows[0]!.d;
    // 지금까지는 옛 단계로 정산하고(그때까지 과금), 이 시각부터 새 단계.
    const s = await settleRecruit(tx, row, gameDay, true);
    if (s.recruitedNow) {
      const after = await postProgress(tx, deps, row, 'trial_recruited', `◆ ${await tickerOf(tx, row.team_id)} ${PHASE_LABEL[row.phase]} 참여자 모집 완료 — ${row.target_n}명`, gameDay);
      if (after) afters.push(after);
    }
    if ((tier as RecruitTier) !== 'basic' && RECRUIT_TIERS[tier as RecruitTier].cristaPerDay[row.phase] > 0) {
      const balance = await balanceOf(tx, who.teamId);
      if (balance < cristaToCents(RECRUIT_TIERS[tier as RecruitTier].cristaPerDay[row.phase])) throw new ApiError(402, 'insufficient_funds', CLINICAL_COPY.err.noFunds);
    }
    await tx.query('update web.clinical_trials set recruit_tier = $2, updated_at = now() where id = $1', [row.id, tier]);
  });
  for (const fn of afters) fn();
  notifyTeam(deps, who.teamId, 'clinical:tier', account.displayName);
  return { ok: true, tier: tier as RecruitTier };
}

export async function startTrial(deps: Deps, account: AccountView, trialId: string): Promise<{ started: boolean; trialId: string }> {
  const who = await teamMember(deps.db, account);
  const afters: Array<() => void> = [];
  let started = false;
  await withTx(deps.db, async (tx) => {
    const row = await lockTrial(tx, who.teamId, trialId);
    // 모둠원이 먼저 눌렀다 — 늦은 쪽은 과금 없이 409(설계 §7.4 꼴 · 화면은 다시 읽어 진행 중을 본다).
    if (row.status !== 'recruiting') throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.alreadyStarted);
    const program = await tx.query<{ current_revision_id: string }>('select current_revision_id from web.programs where team_id = $1', [who.teamId]);
    if (program.rows[0]?.current_revision_id !== row.program_revision_id) throw new ApiError(409, 'stale', CLINICAL_COPY.err.targetChanged);
    const gameDay = (await tx.query<{ d: number }>(`select ${gameDaySql('c')}::float8 as d from web.classes c where c.id = $1`, [row.class_id])).rows[0]!.d;
    await settleRecruit(tx, row, gameDay, true);
    const enrolled = Math.floor(row.enrolled + 1e-9);
    if (enrolled < row.min_n) throw new ApiError(409, 'step_locked', fillCopy(CLINICAL_COPY.minNeedBlock, { min: row.min_n, target: row.target_n }));
    const cost = cristaToCents(PHASE_RULES[row.phase].costCrista);
    await charge(tx, { teamId: row.team_id, cents: cost, kind: 'paid_work', idemKey: `trial:${row.id}:start`, createdBy: account.userId, ref: { type: 'clinical_trial', id: row.id } });
    const ref = referenceFor(row.facts, enrolled, row.class_id, `${row.program_revision_id}:${row.phase}:${row.attempt}`);
    const hash = simInputHash(simInputOf(row.facts, ref));
    const updated = await tx.query(
      `update web.clinical_trials set status = 'running', enrolled_at_start = $2, started_game_day = $3, ends_game_day = $4, cost_paid_cents = $5,
              started_by = $6, input_hash = $7, reference = $8, sim_status = 'queued', sim_next_at = null, updated_at = now()
        where id = $1 and status = 'recruiting'`,
      [row.id, enrolled, gameDay, gameDay + PHASE_RULES[row.phase].gameDays, cost, account.userId, hash, JSON.stringify(ref)],
    );
    if (!updated.rowCount) throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.alreadyStarted);
    started = true;
    const after = await postProgress(tx, deps, row, 'trial_started', `◆ ${await tickerOf(tx, row.team_id)} 임상 ${PHASE_LABEL[row.phase]} 시작 — ${row.facts.healthy ? '지원자' : '환자'} ${enrolled}명`, gameDay);
    if (after) afters.push(after);
  });
  for (const fn of afters) fn();
  notifyTeam(deps, who.teamId, 'clinical:start', account.displayName);
  if (started) void runSimulation(deps, trialId);
  return { started, trialId };
}

/**
 * 바운티 정답표 — crista `stepBountyKey` 를 쓰되, 실패 축은 시뮬레이션 판정(holdKind)에서 정한다.
 * 규칙 참고 판정에서는 그 축이 기준을 넘었는데 시뮬레이션이 보류했다면 원인은 '환자 코호트 흔들림'이다 —
 * 요인에 cohort_noise 를 더하고 '같은 프로토콜 다시'를 유효 처방으로 둔다(정답이 없는 문제가 생기지 않게).
 */
export function trialBountyKey(row: Pick<TrialRow, 'phase' | 'hold_kind' | 'reference' | 'facts' | 'dose_mg' | 'form'>): ReturnType<typeof stepBountyKey> {
  const f = row.facts;
  const failure = row.hold_kind === 'both' ? 'both' : row.hold_kind === 'safety' ? 'safety' : 'efficacy';
  const ref = row.reference!.judgement;
  const judgement: StepJudgement = { ...ref, passed: false, failure };
  const key = stepBountyKey({ kind: row.phase, judgement, props: asMolecule(f.props), dose: row.dose_mg as DoseMg, formulation: row.form, cns: f.cns, referenceKcal: f.referenceKcal });
  const axisPassedInRules = (axis: 'E' | 'S'): boolean => {
    const score = axis === 'E' ? ref.efficacy : ref.safety;
    const noise = axis === 'E' ? ref.noiseEfficacy : ref.noiseSafety;
    const th = axis === 'E' ? ref.thresholds.efficacy : ref.thresholds.safety;
    return score === null || th === null || score + (noise ?? 0) + ref.bonus >= th;
  };
  const axes: Array<'E' | 'S'> = failure === 'both' ? ['E', 'S'] : failure === 'safety' ? ['S'] : ['E'];
  if (axes.some(axisPassedInRules)) {
    const factors = new Set(key.factors);
    factors.add('cohort_noise');
    key.factors = BOUNTY_CHOICES.step.factors.filter((x) => factors.has(x));
    if (!key.validRemedies.includes('same_retry')) key.validRemedies.push('same_retry');
  }
  if (key.validRemedies.length === 0) key.validRemedies.push('same_retry');
  return key;
}

export async function submitBounty(deps: Deps, account: AccountView, trialId: string, raw: unknown): Promise<{ passed: boolean; hints: string[]; refundCrista: number }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const answers = parseBountyAnswers('step', body);
  if (!answers) throw badRequest(CLINICAL_COPY.err.bountyChoices);
  const analysis = typeof body.analysis === 'string' ? body.analysis.normalize('NFC').trim() : '';
  const len = [...analysis].length;
  if (len < TRIAL_BOUNTY_TEXT_MIN || len > TRIAL_BOUNTY_TEXT_MAX) throw badRequest(fillCopy(CLINICAL_COPY.err.bountyLength, { min: TRIAL_BOUNTY_TEXT_MIN, max: TRIAL_BOUNTY_TEXT_MAX }));
  if (looksLikeInjection(analysis)) throw new ApiError(400, 'reason_blocked', CLINICAL_COPY.err.bountyInjection);
  const out = await withTx(deps.db, async (tx) => {
    const row = await lockTrial(tx, who.teamId, trialId);
    if (row.status !== 'held' || !row.reference) throw new ApiError(409, 'step_locked', CLINICAL_COPY.err.bountyNotHeld);
    if (row.hold_kind === 'operational') throw new ApiError(409, 'step_locked', CLINICAL_COPY.bountyOperational);
    await tx.query('insert into web.clinical_bounties (trial_id, team_id) values ($1, $2) on conflict (trial_id) do nothing', [row.id, row.team_id]);
    const b = (await tx.query<BountyRow>('select * from web.clinical_bounties where trial_id = $1 for update', [row.id])).rows[0]!;
    if (b.passed) throw new ApiError(409, 'already_exists', CLINICAL_COPY.err.bountyClaimed);
    if (b.last_attempt_at && Date.now() - b.last_attempt_at.getTime() < TRIAL_BOUNTY_RETRY_SEC * 1000) {
      const wait = Math.ceil((TRIAL_BOUNTY_RETRY_SEC * 1000 - (Date.now() - b.last_attempt_at.getTime())) / 1000);
      throw new ApiError(429, 'rate_limited', fillCopy(CLINICAL_COPY.err.bountyWait, { sec: wait }), { retryAfterSec: wait });
    }
    const grade = gradeBounty(trialBountyKey(row), answers);
    if (!grade.passed) {
      await tx.query(`update web.clinical_bounties set attempts = attempts + 1, last_attempt_at = now(), last_hints = $2, analysis = $3 where trial_id = $1`, [row.id, grade.hints, analysis]);
      return { passed: false, hints: grade.hints, refundCrista: 0 };
    }
    const used = await tx.query<{ n: string | null }>(`select sum(amount_cents)::bigint as n from web.ledger where team_id = $1 and kind = 'failure_bounty'`, [row.team_id]);
    const cents = bountyRefundCents(row.phase, Number(row.cost_paid_cents), BOUNTY_LIMITS.campaignCapCents - Number(used.rows[0]?.n ?? 0));
    if (cents > 0) await credit(tx, { teamId: row.team_id, cents, kind: 'failure_bounty', idemKey: `trial:${row.id}:bounty`, createdBy: account.userId, ref: { type: 'clinical_trial', id: row.id } });
    await tx.query(
      `update web.clinical_bounties set attempts = attempts + 1, last_attempt_at = now(), last_hints = '{}', analysis = $2, passed = true, refund_cents = $3, passed_by = $4, passed_at = now()
        where trial_id = $1`,
      [row.id, analysis, cents, account.userId],
    );
    return { passed: true, hints: [], refundCrista: centsToCrista(cents) };
  });
  notifyTeam(deps, who.teamId, 'clinical:bounty', account.displayName);
  return out;
}

// ── 교사 ──

async function teacherTrial(deps: Deps, account: AccountView, trialId: string): Promise<TrialRow> {
  if (!UUID_RE.test(trialId)) throw new ApiError(404, 'not_found', CLINICAL_COPY.err.notFound);
  const r = await deps.db.query<TrialRow>(`select ${TRIAL_COLS} from ${TRIAL_FROM} where t.id = $1`, [trialId]);
  const row = r.rows[0];
  if (!row) throw new ApiError(404, 'not_found', CLINICAL_COPY.err.notFound);
  await requireTeacherOf(deps.db, account, row.class_id);
  return row;
}

export async function teacherList(deps: Deps, account: AccountView, classId: string): Promise<{ trials: TeacherTrialView[] }> {
  await requireTeacherOf(deps.db, account, classId);
  const r = await deps.db.query<TrialRow & { startup_name: string | null; ticker: string | null }>(
    `select ${TRIAL_COLS}, tm.startup_name, tm.ticker from ${TRIAL_FROM} join web.teams tm on tm.id = t.team_id where t.class_id = $1 order by t.created_at desc limit 200`,
    [classId],
  );
  const gameDay = await currentGameDay(deps.db, classId);
  const logs = await logsFor(deps.db, r.rows.map((x) => x.id));
  return {
    trials: r.rows.map((row) => {
      const v = trialView(row, gameDay, logs.get(row.id) ?? [], undefined, true);
      return {
        ...v,
        teamId: row.team_id,
        teamName: row.startup_name,
        ticker: row.ticker,
        simStatus: row.sim_status,
        simAttempts: row.sim_attempts,
        simError: row.sim_error,
        result: row.result,
        // 교사는 공개 전에도 결과와 출처(AI · 규칙 · 교사)를 본다.
        resultSource: row.result_source,
        resultModel: row.result_model,
        reference: row.reference
          ? {
              passed: row.reference.judgement.passed,
              failure: row.reference.judgement.failure,
              reasons: row.reference.judgement.reasons,
              passProb: row.reference.passProb,
              divergent: row.reference.divergent ?? false,
              llmOriginal: row.reference.llmOriginal ?? null,
            }
          : null,
      };
    }),
  };
}

export async function teacherResimulate(deps: Deps, account: AccountView, trialId: string): Promise<{ ok: true }> {
  const row = await teacherTrial(deps, account, trialId);
  if (row.status !== 'running' && row.status !== 'pending') throw new ApiError(409, 'step_locked', '진행 중 · 판정 대기인 시도만 다시 시뮬레이션해요.');
  if (row.sim_status === 'ready') throw new ApiError(409, 'already_exists', '이미 결과가 있어요.');
  await deps.db.query(`update web.clinical_trials set sim_status = 'queued', sim_attempts = 0, sim_next_at = null, sim_error = null, updated_at = now() where id = $1 and sim_status <> 'ready'`, [trialId]);
  void runSimulation(deps, trialId);
  return { ok: true };
}

export async function teacherDecideTrial(deps: Deps, account: AccountView, trialId: string, raw: unknown): Promise<{ ok: true }> {
  const row = await teacherTrial(deps, account, trialId);
  const body = (raw ?? {}) as Record<string, unknown>;
  const verdict = body.verdict;
  if (verdict !== 'pass' && verdict !== 'held') throw badRequest('verdict 는 pass · held 예요.');
  const holdKind = verdict === 'held' ? (body.holdKind as HoldKind) : null;
  if (verdict === 'held' && !['safety', 'efficacy', 'both', 'operational'].includes(holdKind as string)) throw badRequest('보류 종류를 골라 주세요.');
  const note = typeof body.note === 'string' ? [...body.note.trim()].slice(0, 300).join('') : null;
  // 공개(끝나는 게임 일) 뒤에는 고치지 않는다 — 전광판 정정 · 기업가치 되돌림은 FMARKET 'correction' 몫(설계 §12-19).
  if (row.status !== 'running' && row.status !== 'pending') throw new ApiError(409, 'step_locked', '진행 중 · 판정 대기인 시도만 판정해요(공개된 판정은 정정 소식으로).');
  // AI 결과가 이미 있으면 override: true 로만 — 공개 전 교사 정정(LLM 원본은 reference.llmOriginal 에 남는다).
  const override = body.override === true;
  if (row.sim_status === 'ready' && !override) throw new ApiError(409, 'already_exists', '이미 AI 결과가 있어요. 정정하려면 override 로 다시 보내 주세요.');
  if (row.sim_status !== 'ready' && override) throw badRequest('정정할 AI 결과가 아직 없어요.');
  if (!row.reference) throw new ApiError(409, 'step_locked', '시작 기록이 없어요.');
  const result = ruleSimulate(simInputOf(row.facts, row.reference), verdict, holdKind);
  const stored = await storeSim(deps, trialId, result, override ? 'override' : 'teacher', null, note ?? undefined);
  // 잠금 안에서 다시 보니 상태가 바뀌었다(AI 결과가 막 들어왔거나 · 공개됐다) — 늦은 쪽 409.
  if (!stored) throw new ApiError(409, 'stale', '그사이 결과가 바뀌었어요. 목록을 다시 열어 주세요.');
  return { ok: true };
}

// ── 등록 ──

export function register(router: Router<RequestContext>): void {
  router.on('GET', '/api/clinical', async (ctx) => loadClinical(ctx.deps, requireAccount(ctx)));
  router.on('POST', '/api/clinical/open', async (ctx) => {
    const out = await openTrial(ctx.deps, requireAccount(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return out;
  });
  router.on('PUT', '/api/clinical/trials/:trialId/tier', async (ctx, p) => setTier(ctx.deps, requireAccount(ctx), p.trialId!, await readJson(ctx.req)));
  router.on('POST', '/api/clinical/trials/:trialId/start', async (ctx, p) => startTrial(ctx.deps, requireAccount(ctx), p.trialId!));
  router.on('POST', '/api/clinical/trials/:trialId/bounty', async (ctx, p) => submitBounty(ctx.deps, requireAccount(ctx), p.trialId!, await readJson(ctx.req)));
  router.on('GET', '/api/teacher/classes/:classId/clinical', async (ctx, p) => teacherList(ctx.deps, requireAccount(ctx), p.classId!));
  router.on('POST', '/api/teacher/clinical/:trialId/resimulate', async (ctx, p) => teacherResimulate(ctx.deps, requireAccount(ctx), p.trialId!));
  router.on('POST', '/api/teacher/clinical/:trialId/decision', async (ctx, p) => teacherDecideTrial(ctx.deps, requireAccount(ctx), p.trialId!, await readJson(ctx.req)));

  onGameDay('clinical', (deps) => onTick(deps));
  onRealtimeTick('clinical-sim', 20_000, (deps) => simRetryLoop(deps));
}
