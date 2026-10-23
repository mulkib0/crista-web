/**
 * 기능 F33 — 3.3 제형 · IND 도구 6종 · 임상시험 계획 승인 신청서 · 심사 · 접수 · 판정(설계 §5.10 · §5.11 · §7.3 · §7.4 ⑬).
 *
 * 소유: 이 파일 · packages/web-contract/src/ind.ts · apps/web/src/board/steps/s33*.tsx(+ css). 스키마 0006 + 0014_ind_application.sql.
 * 표: web.ind_applications(draft → reviewing → revise | passed → submitted → approved | held) · ind_sections · doc_reviews · ind_candidate_facts(0014).
 *
 * 흐름
 *   GET  /api/ind                                  — 도구 6종 재료(주력 · 백업 × 9조합 E · S — game-rules scoreCandidate) · 신청서 · 승인서
 *   POST /api/ind/applications                     — 표적 버전에 열린 신청서 하나(UQ ind_applications_open_key — 네 명이 동시에 눌러도 한 줄)
 *   PUT  /api/ind/applications/:id/plan            — 조합(제형 · 용량 · 환자군 · 평가지표 · 후보) — plan_version 낙관적 잠금
 *   PUT  /api/ind/applications/:id/sections/:sec   — 칸 ①~⑦ — reviews.ts saveSection(칸 판 낙관적 잠금 · ⑪)
 *   POST /api/ind/applications/:id/review          — 규칙 검사(web-contract indRuleFindings) → reviews.ts requestReview('ind') → onReviewed
 *   POST /api/ind/applications/:id/submit          — 서류 통과(passed · 그 판) → teams 잠금 → charge('ind_fee', `ind:<id>`) → submitted(+30게임 일)
 *   onGameDay('ind')                               — decide_game_day ≤ 지금 → judgeStep('ind')(S ≥ 35 · 흔들림 없음) → approved | held + 전광판 소식
 *
 * 불변식(§7.4 ⑬): 접수는 teams 줄 잠금 + 상태 조건부 UPDATE + 멱등 키 — 네 명이 동시에 [접수]를 눌러도 과금 1회(나머지 409).
 *   같은 표적 버전에 접수 중 · 승인 신청서가 있으면 409(0006 ind_applications_live_key 가 최종 판정).
 *   서류를 통과한 IND 는 규칙 판정에서 떨어지지 않는다 — 규칙 검사가 '시작 용량 ≤ 그 제형 MRSD' 와 '예상 S ≥ 35' 를 함께 본다.
 * 잠금 순서: programs(FOR SHARE) → teams(FOR UPDATE) → ind_applications(FOR UPDATE) → classes(전광판 — board-events.ts).
 * 공개 범위(§5.3): 전광판에는 티커 · 코드명 · 질환 · 승인/보류만. 분자 · 물성 · 점수 · 서류는 이 모둠과 교사만.
 */
import { DOCKING_TARGETS, type MoleculeProperties } from '@crista/shared-types';
import { judgeStep, needsBrainExposure, PIPELINE_RULES, propertySignals, scoreCandidate, type CandidateScoreInput } from '@crista/game-rules';
import {
  asPreclinicalResult,
  fillIndCopy,
  IND_COPY,
  IND_DOSES,
  IND_EDITABLE,
  IND_FEE_CENTS,
  IND_FEE_CRISTA,
  IND_FORMS,
  IND_ID_PATTERN,
  IND_PHASE1_ENDPOINT,
  IND_PLEDGE_BODY,
  IND_REVIEW_GAME_DAYS,
  IND_REVIEWER_VERSION,
  indChecklistFor,
  indLedgerKey,
  indRuleFindings,
  indSectionDef,
  indTrialOptions,
  type AccountView,
  type AnimalStudyResult,
  type IndApplicationView,
  type IndApprovalView,
  type IndCandidateView,
  type IndDose,
  type IndForm,
  type IndResponse,
  type IndRuleInput,
  type IndRulesView,
  type IndScoreCell,
  type IndSectionKey,
  type IndSignalsView,
  type IndStatus,
  type IndTrialOptions,
  type ReviewChecklistItem,
  type RuleFinding,
} from '@crista-web/web-contract';
import { gameDaySql, loadClock, onGameDay } from '../clock.ts';
import { postBoardEvent } from '../board-events.ts';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable } from '../db.ts';
import { requireAccount } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { charge } from '../ledger.ts';
import { loadProgramRow, lockedProgram, notifyTeam, teamMember, type ProgramRow, type TeamMember } from '../pipeline.ts';
import { latestReview, loadSections, onReviewed, requestReview, saveSection } from '../reviews.ts';
import type { RequestContext } from '../routes.ts';

const E = IND_COPY.errors;

// ── 규칙 값(game-rules 에서 그대로) ──

export const IND_RULES_VIEW: IndRulesView = {
  efficacy: { base: PIPELINE_RULES.efficacy.base, affinityWeight: PIPELINE_RULES.efficacy.affinityWeight },
  doseToxicity: { ...PIPELINE_RULES.doseToxicity },
  doseEfficacy: { ...PIPELINE_RULES.doseEfficacy },
  formulationPeak: { ...PIPELINE_RULES.formulationPeak },
  thresholds: {
    ind: PIPELINE_RULES.thresholds.ind.safety!,
    phase1: PIPELINE_RULES.thresholds.phase1.safety!,
    phase2E: PIPELINE_RULES.thresholds.phase2.efficacy!,
    phase3E: PIPELINE_RULES.thresholds.phase3.efficacy!,
    phase3S: PIPELINE_RULES.thresholds.phase3.safety!,
  },
  risk: { herg: { ...PIPELINE_RULES.risk.herg }, hepatotoxicity: { ...PIPELINE_RULES.risk.hepatotoxicity } },
};

// ── 순수 계산(시험 대상) ──

export interface CandidateFacts {
  props: MoleculeProperties;
  affinityKcal: number;
  referenceKcal: number;
}

/** 9조합 × (비 CNS 표적에 뇌 병변 환자군이 있으면 2벌) — game-rules `scoreCandidate` 그대로. */
export function scoreGrid(facts: CandidateFacts, cnsTarget: boolean, trial: IndTrialOptions | null): IndScoreCell[] {
  const variants = cnsTarget || !trial?.brainPopulations.length ? [false] : [false, true];
  const out: IndScoreCell[] = [];
  for (const brainPop of variants) {
    for (const form of IND_FORMS) {
      for (const dose of IND_DOSES) {
        const s = scoreCandidate({ affinityKcal: facts.affinityKcal, props: facts.props, dose, formulation: form, cns: cnsTarget || brainPop, referenceKcal: facts.referenceKcal, cnsFromPopulation: brainPop });
        out.push({ form, dose, brainPop, efficacy: s.efficacy, safety: s.safety, inputs: { ...s.inputs }, efficacyReasons: s.efficacyReasons, safetyReasons: s.safetyReasons });
      }
    }
  }
  return out;
}

/** 접수 때 굳히는 판정 재료(game-rules `scoreCandidate` 입력 그대로). */
export function scoreInputOf(facts: CandidateFacts, args: { form: IndForm; dose: IndDose; cnsTarget: boolean; targetId: string; population: string | null }): CandidateScoreInput {
  const cns =
    args.cnsTarget ||
    needsBrainExposure({ cnsTarget: false, targetId: args.targetId, population: args.population }) ||
    isBrainPopulation(args.targetId, args.population, args.cnsTarget);
  return {
    affinityKcal: facts.affinityKcal,
    props: facts.props,
    dose: args.dose,
    formulation: args.form,
    cns,
    referenceKcal: facts.referenceKcal,
    cnsFromPopulation: cns && !args.cnsTarget,
  };
}

/** 뇌 병변 환자군인가 — shared-types TRIAL_OPTIONS(game-rules needsBrainExposure) + 새 표적 목록(web-contract)을 함께 본다. */
function isBrainPopulation(targetId: string, population: string | null, cnsTarget: boolean): boolean {
  if (cnsTarget || !population) return false;
  return indTrialOptions(targetId)?.brainPopulations.includes(population) ?? false;
}

/** IND 판정(30게임 일 뒤) — game-rules judgeStep('ind'): S ≥ 35, 흔들림 · 보너스 없음. */
export function judgeInd(input: CandidateScoreInput): { passed: boolean; efficacy: number; safety: number; reasons: string[] } {
  const scores = scoreCandidate(input);
  const j = judgeStep('ind', scores, { efficacy: null, safety: null }, 0);
  return { passed: j.passed, efficacy: scores.efficacy, safety: scores.safety, reasons: j.reasons };
}

const signalsView = (props: MoleculeProperties): IndSignalsView => {
  const s = propertySignals(props);
  return { oralAbsorption: s.oralAbsorption, bbb: s.bbb, herg: s.herg, hepatotoxicity: s.hepatotoxicity, transdermal: s.transdermal };
};

// ── 모둠 사실 모으기 ──

interface CandidateRow {
  role: 'lead' | 'backup';
  patentId: string;
  codeName: string;
  patentNo: string;
  admetJobId: string;
  active: boolean;
  canonicalSmiles: string;
  dockingKcal: number | null;
  animal: AnimalStudyResult | null;
  facts: CandidateFacts | null;
}

interface Context {
  who: TeamMember;
  program: ProgramRow;
  revisionId: string | null;
  targetId: string | null;
  target: { gene: string; label: string; disease: string; cns: boolean; referenceKcal: number } | null;
  trial: IndTrialOptions | null;
  candidates: CandidateRow[];
}

function targetOf(targetId: string | null): Context['target'] {
  if (!targetId) return null;
  const t = DOCKING_TARGETS.find((d) => d.id === targetId);
  const trial = indTrialOptions(targetId);
  if (!t) return trial ? { gene: targetId.split('-')[0]!.toUpperCase(), label: targetId, disease: trial.disease, cns: false, referenceKcal: PIPELINE_RULES.affinity.defaultReferenceKcal } : null;
  return { gene: t.gene, label: t.label, disease: trial?.disease ?? t.disease, cns: t.cns, referenceKcal: t.referenceKcal ?? PIPELINE_RULES.affinity.defaultReferenceKcal };
}

/**
 * 주력 · 백업(program_revisions.lead_job_id · backup_job_id — 3.2 끝에서 F32 가 정한다)의 특허 · 동물실험 · 물성.
 * lead_job_id 는 그 분자의 2.2 ADMET 작업(patents.admet_job_id)이다. 3.2 작업 id 로 적혀 있어도 그 작업의 patent_id 로 찾는다.
 */
async function loadContext(db: Queryable, who: TeamMember, programIn?: ProgramRow): Promise<Context> {
  const program = programIn ?? (await loadProgramRow(db, who.teamId));
  const revisionId = program.revision_id;
  const targetId = program.target_id;
  const target = targetOf(targetId);
  const trial = indTrialOptions(targetId);
  const base: Context = { who, program, revisionId, targetId, target, trial, candidates: [] };
  if (!revisionId || !targetId) return base;
  const designated = ([['lead', program.lead_job_id], ['backup', program.backup_job_id]] as const).filter((x): x is readonly ['lead' | 'backup', string] => Boolean(x[1]));
  if (designated.length === 0) return base;

  const ids = designated.map(([, id]) => id);
  const rows = await db.query<{
    job_id: string;
    patent_id: string;
    code_name: string;
    patent_no: string;
    admet_job_id: string;
    status: string;
    canonical_smiles: string;
    docking_kcal: number | null;
    animal: unknown;
    properties: MoleculeProperties | null;
    affinity_kcal: number | null;
    reference_kcal: number | null;
  }>(
    `select j.id as job_id, p.id as patent_id, p.code_name, p.patent_no, p.admet_job_id, p.status, p.canonical_smiles,
            d.affinity_kcal as docking_kcal,
            (select s.result from web.jobs s where s.patent_id = p.id and s.team_id = p.team_id and s.step = '3.2' and s.facility = 'animal_study' and s.status = 'succeeded'
              order by s.finished_at desc nulls last, s.updated_at desc limit 1) as animal,
            f.properties, f.affinity_kcal, f.reference_kcal
       from web.jobs j
       join web.patents p on p.team_id = $1 and p.program_revision_id = $2 and (p.admet_job_id = j.id or (j.step = '3.2' and p.id = j.patent_id))
       left join web.jobs a on a.id = p.admet_job_id
       left join web.jobs d on d.id = a.parent_job_id and d.step = '2.1'
       left join web.ind_candidate_facts f on f.patent_id = p.id
      where j.id = any($3::uuid[]) and j.team_id = $1`,
    [who.teamId, revisionId, ids],
  );
  for (const [role, jobId] of designated) {
    const r = rows.rows.find((x) => x.job_id === jobId);
    if (!r) continue;
    const animal = asPreclinicalResult(r.animal);
    base.candidates.push({
      role,
      patentId: r.patent_id,
      codeName: r.code_name,
      patentNo: r.patent_no,
      admetJobId: r.admet_job_id,
      active: r.status === 'active',
      canonicalSmiles: r.canonical_smiles,
      dockingKcal: r.docking_kcal,
      animal: animal?.kind === 'animal_study' ? animal : null,
      facts: r.properties && r.affinity_kcal !== null && r.reference_kcal !== null ? { props: r.properties, affinityKcal: r.affinity_kcal, referenceKcal: r.reference_kcal } : null,
    });
  }
  return base;
}

/** 물성이 아직 없는 후보는 워커 RDKit 로 한 번 계산해 둔다(ind_candidate_facts). 실패하면 그대로(도구는 '못 읽음'). */
async function ensureFacts(deps: Deps, ctx: Context): Promise<Context> {
  let changed = false;
  for (const c of ctx.candidates) {
    if (c.facts || c.dockingKcal === null || !ctx.target) continue;
    try {
      const outcome = await deps.worker.properties(c.canonicalSmiles);
      if (!outcome.ok) continue;
      await deps.db.query(
        `insert into web.ind_candidate_facts (patent_id, team_id, properties, affinity_kcal, reference_kcal) values ($1, $2, $3, $4, $5) on conflict (patent_id) do nothing`,
        [c.patentId, ctx.who.teamId, JSON.stringify(outcome.properties), c.dockingKcal, ctx.target.referenceKcal],
      );
      changed = true;
    } catch (error) {
      console.error('[ind] 물성 계산 실패:', (error as Error).message);
    }
  }
  return changed ? loadContext(deps.db, ctx.who, ctx.program) : ctx;
}

const readyOf = (ctx: Context): { ready: boolean; reason: string | null } => {
  if (!ctx.targetId) return { ready: false, reason: E.noTarget };
  const ok = ctx.candidates.some((c) => c.active && c.animal);
  return ok ? { ready: true, reason: null } : { ready: false, reason: E.notReady };
};

// ── 신청서 읽기 ──

interface AppRow {
  id: string;
  program_revision_id: string;
  team_id: string;
  patent_id: string;
  form: IndForm | null;
  dose_mg: IndDose | null;
  population: string | null;
  endpoint: string | null;
  status: IndStatus;
  version: number;
  plan_version: number;
  e_score: number | null;
  s_score: number | null;
  score_input: CandidateScoreInput | null;
  judgement: { passed: boolean; reasons: string[] } | null;
  submitted_game_day: number | null;
  decide_game_day: number | null;
  decided_game_day: number | null;
  code_name: string;
  patent_no: string;
  created_by_name: string | null;
}

const APP_SELECT = `
  select a.*, p.code_name, p.patent_no, acc.display_name as created_by_name
    from web.ind_applications a
    join web.patents p on p.id = a.patent_id
    left join web.accounts acc on acc.user_id = a.created_by`;

async function loadAppRow(db: Queryable, id: string, teamId: string, lock = false): Promise<AppRow> {
  if (!IND_ID_PATTERN.test(id)) throw new ApiError(404, 'not_found', E.notFound);
  if (lock) await db.query('select 1 from web.ind_applications where id = $1 and team_id = $2 for update', [id, teamId]);
  const result = await db.query<AppRow>(`${APP_SELECT} where a.id = $1 and a.team_id = $2`, [id, teamId]);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'not_found', E.notFound);
  return row;
}

/** 표적 버전의 열린 신청서(초안 ~ 승인) — 없으면 가장 최근 보류 건. */
async function currentAppRow(db: Queryable, revisionId: string, teamId: string): Promise<AppRow | null> {
  const result = await db.query<AppRow>(
    `${APP_SELECT} where a.program_revision_id = $1 and a.team_id = $2
      order by (a.status <> 'held') desc, a.created_at desc limit 1`,
    [revisionId, teamId],
  );
  return result.rows[0] ?? null;
}

const sectionsOf = async (db: Queryable, id: string): Promise<{ list: Awaited<ReturnType<typeof loadSections>>; map: Partial<Record<IndSectionKey, string>> }> => {
  const list = await loadSections(db, 'ind', id);
  return { list, map: Object.fromEntries(list.map((s) => [s.section, s.body])) as Partial<Record<IndSectionKey, string>> };
};

/** 규칙 검사 입력 · LLM 사실 · 판정 재료를 한 번에(심사 · 접수 · 미리 보기가 같은 값을 본다). */
function evaluate(ctx: Context, app: Pick<AppRow, 'patent_id' | 'form' | 'dose_mg' | 'population' | 'endpoint'>, sections: Partial<Record<IndSectionKey, string>>) {
  const cand = ctx.candidates.find((c) => c.patentId === app.patent_id) ?? null;
  const lead: IndRuleInput['lead'] = !cand ? { ok: false, problem: 'not_designated' } : !cand.active ? { ok: false, problem: 'patent_inactive' } : !cand.animal ? { ok: false, problem: 'no_animal' } : { ok: true };
  const signals = cand?.facts ? signalsView(cand.facts.props) : null;
  const cnsTarget = ctx.target?.cns ?? false;
  const scoreInput =
    cand?.facts && app.form && app.dose_mg && ctx.targetId
      ? scoreInputOf(cand.facts, { form: app.form, dose: app.dose_mg, cnsTarget, targetId: ctx.targetId, population: app.population })
      : null;
  const scores = scoreInput ? scoreCandidate(scoreInput) : null;
  const findings = indRuleFindings({
    lead,
    form: app.form,
    dose: app.dose_mg,
    population: app.population,
    endpoint: app.endpoint,
    sections,
    animal: cand?.animal ?? null,
    signals,
    expectedSafety: scores?.safety ?? null,
  });
  const a = cand?.animal ?? null;
  const facts: Record<string, string | number | boolean> = {
    codeName: cand?.codeName ?? '(없음)',
    candidateRole: cand ? IND_COPY.roles[cand.role] : '(없음)',
    targetGene: ctx.target?.gene ?? '(없음)',
    disease: ctx.target?.disease ?? '(없음)',
    cnsTarget,
    trialPhase: '제1상',
    phase1PrimaryEndpoint: IND_PHASE1_ENDPOINT,
    form: app.form ? IND_COPY.forms[app.form].label : '(안 고름)',
    startDoseMg: app.dose_mg ?? '(안 고름)',
    nextPopulation: app.population ?? '(안 고름)',
    nextPrimaryEndpoint: app.endpoint ?? '(안 고름)',
  };
  if (a) {
    Object.assign(facts, {
      noaelRatMgPerKgDay: a.noaelMgPerKgDay.rat,
      noaelDogMgPerKgDay: a.noaelMgPerKgDay.dog,
      hedMgPerKg: a.hedMgPerKg,
      safetyFactor: a.safetyFactor,
      mrsdOralMg: a.mrsdMgByForm.oral,
      mrsdIvMg: a.mrsdMgByForm.iv,
      mrsdTransdermalMg: a.mrsdMgByForm.transdermal,
      efficacyVsReferencePct: a.efficacyVsReferencePct,
      oralBioavailabilityPct: a.pk.oralBioavailabilityPct,
      animalFindings: a.findings.length ? a.findings.join(', ') : '없음',
      animalsUsed: a.animalsUsed,
      painGrade: a.painGrade,
    });
  }
  if (signals) {
    Object.assign(facts, {
      signalOralAbsorption: IND_COPY.levels[signals.oralAbsorption]!,
      signalBrainExposure: IND_COPY.levels[signals.bbb]!,
      signalHerg: IND_COPY.levels[signals.herg]!,
      signalLiver: IND_COPY.levels[signals.hepatotoxicity]!,
      signalTransdermal: IND_COPY.levels[signals.transdermal]!,
    });
  }
  if (scores) Object.assign(facts, { expectedEfficacyE: scores.efficacy, expectedSafetyS: scores.safety, peakK: scores.inputs.K, riskMultiplierR: Number(scores.inputs.R.toFixed(2)) });
  const checklist = indChecklistFor({ signals, animal: cand?.animal ?? null, sections });
  return { cand, findings, facts, scoreInput, scores, checklist };
}

/** 규칙 결과가 같은가(id · ok/fail) — 같은 판인데 서버 사실이 바뀌어 결과가 달라졌는지 본다. */
export function sameRuleOutcome(a: readonly RuleFinding[], b: readonly RuleFinding[]): boolean {
  const key = (xs: readonly RuleFinding[]) => xs.map((f) => `${f.id}:${f.status}`).sort().join('|');
  return key(a) === key(b);
}

async function appView(db: Queryable, ctx: Context, row: AppRow): Promise<IndApplicationView> {
  const { list, map } = await sectionsOf(db, row.id);
  const editable = IND_EDITABLE.includes(row.status);
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    planVersion: row.plan_version,
    patentId: row.patent_id,
    codeName: row.code_name,
    form: row.form,
    doseMg: row.dose_mg,
    population: row.population,
    endpoint: row.endpoint,
    sections: list,
    review: await latestReview(db, 'ind', row.id),
    rulePreview: editable ? evaluate(ctx, row, map).findings : [],
    createdByName: row.created_by_name,
    submittedGameDay: row.submitted_game_day,
    decideGameDay: row.decide_game_day,
    decidedGameDay: row.decided_game_day,
    efficacy: row.e_score,
    safety: row.s_score,
    judgement: row.judgement,
  };
}

/** 승인서 — 4.1 의 입력(F41 이 부른다). 그 표적 버전에 승인된 IND 가 없으면 null. */
export async function loadIndApproval(db: Queryable, revisionId: string): Promise<IndApprovalView | null> {
  const result = await db.query<AppRow & { mrsd: number | null }>(
    `${APP_SELECT} where a.program_revision_id = $1 and a.status = 'approved' limit 1`,
    [revisionId],
  );
  const r = result.rows[0];
  if (!r || !r.form || !r.dose_mg || !r.population || !r.endpoint) return null;
  const animal = await db.query<{ result: unknown }>(
    `select result from web.jobs where patent_id = $1 and step = '3.2' and facility = 'animal_study' and status = 'succeeded' order by finished_at desc nulls last, updated_at desc limit 1`,
    [r.patent_id],
  );
  const a = asPreclinicalResult(animal.rows[0]?.result);
  return {
    applicationId: r.id,
    revisionId: r.program_revision_id,
    teamId: r.team_id,
    patentId: r.patent_id,
    codeName: r.code_name,
    patentNo: r.patent_no,
    form: r.form,
    doseMg: r.dose_mg,
    population: r.population,
    endpoint: r.endpoint,
    phase1Endpoint: IND_PHASE1_ENDPOINT,
    efficacy: r.e_score ?? 0,
    safety: r.s_score ?? 0,
    mrsdMg: a?.kind === 'animal_study' ? a.mrsdMgByForm[r.form] : null,
    submittedGameDay: r.submitted_game_day ?? 0,
    approvedGameDay: r.decided_game_day ?? 0,
  };
}

export async function loadInd(deps: Deps, account: AccountView): Promise<IndResponse> {
  const who = await teamMember(deps.db, account);
  const ctx = await ensureFacts(deps, await loadContext(deps.db, who));
  const ready = readyOf(ctx);
  const candidates: IndCandidateView[] = ctx.candidates.map((c) => ({
    role: c.role,
    patentId: c.patentId,
    codeName: c.codeName,
    patentNo: c.patentNo,
    admetJobId: c.admetJobId,
    animal: c.animal,
    signals: c.facts ? signalsView(c.facts.props) : null,
    affinityKcal: c.facts?.affinityKcal ?? c.dockingKcal,
    grid: c.facts ? scoreGrid(c.facts, ctx.target?.cns ?? false, ctx.trial) : null,
    ...(c.facts ? {} : { gridNote: IND_COPY.toolNotes.noGrid }),
  }));
  const row = ctx.revisionId ? await currentAppRow(deps.db, ctx.revisionId, who.teamId) : null;
  return {
    revisionId: ctx.revisionId,
    targetId: ctx.targetId,
    target: ctx.target ? { gene: ctx.target.gene, label: ctx.target.label, disease: ctx.target.disease, cns: ctx.target.cns } : null,
    ready: ready.ready,
    readyReason: ready.reason,
    candidates,
    trial: ctx.trial,
    rules: IND_RULES_VIEW,
    application: row ? await appView(deps.db, ctx, row) : null,
    approval: ctx.revisionId ? await loadIndApproval(deps.db, ctx.revisionId) : null,
    feeCents: IND_FEE_CENTS,
    feeCrista: IND_FEE_CRISTA,
    reviewGameDays: IND_REVIEW_GAME_DAYS,
  };
}

// ── 쓰기 ──

const expectedOf = (raw: unknown, name: string): number => {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) throw badRequest(`화면이 읽은 판(${name})을 보내 주세요. 화면을 새로 고쳐 주세요.`);
  return raw;
};

async function responseFor(deps: Deps, who: TeamMember, id: string, created?: boolean): Promise<{ application: IndApplicationView; created?: boolean }> {
  const ctx = await loadContext(deps.db, who);
  const row = await loadAppRow(deps.db, id, who.teamId);
  return { application: await appView(deps.db, ctx, row), ...(created !== undefined ? { created } : {}) };
}

/** 새 신청서 — 표적 버전에 열린 것이 있으면 그것(네 명이 동시에 눌러도 한 줄 — UQ ind_applications_open_key). */
export async function createApplication(deps: Deps, account: AccountView): Promise<{ application: IndApplicationView; created: boolean }> {
  const who = await teamMember(deps.db, account);
  const out = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    if (!program.target_id) throw new ApiError(409, 'step_locked', E.noTarget);
    const ctx = await loadContext(tx, who, program);
    const lead = ctx.candidates.find((c) => c.role === 'lead' && c.active && c.animal) ?? ctx.candidates.find((c) => c.active && c.animal);
    if (!lead) throw new ApiError(409, 'step_locked', E.notReady);
    const inserted = await tx.query<{ id: string }>(
      `insert into web.ind_applications (program_revision_id, team_id, patent_id, created_by) values ($1, $2, $3, $4)
       on conflict (program_revision_id) where status in ('draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved') do nothing returning id`,
      [program.revision_id, who.teamId, lead.patentId, account.userId],
    );
    if (inserted.rows[0]) {
      await prefillFromPreclinical(tx, inserted.rows[0].id, lead.patentId, account.userId);
      return { id: inserted.rows[0].id, created: true };
    }
    const open = await tx.query<{ id: string }>(
      `select id from web.ind_applications where program_revision_id = $1 and status in ('draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved')`,
      [program.revision_id],
    );
    return { id: open.rows[0]!.id, created: false };
  });
  if (out.created) notifyTeam(deps, who.teamId, 'ind:created', account.displayName);
  return (await responseFor(deps, who, out.id, out.created)) as { application: IndApplicationView; created: boolean };
}

/**
 * 3.2 에서 맞힌 학생 계산(F32 preclinical_calcs — 서버 값과 맞으면 '3.3 신청서에 자동으로 붙는다', 설계 §5.9 ④)의 HED 를 ④ 칸에 붙인다.
 * 고른 제형의 MRSD 는 제형마다 달라 학생이 다시 적는다. 그 표가 없거나 모양이 달라도 신청서 만들기는 막지 않는다(저장점).
 */
async function prefillFromPreclinical(tx: Queryable, appId: string, patentId: string, userId: string): Promise<void> {
  await tx.query('savepoint ind_prefill');
  try {
    const calc = await tx.query<{ hed: unknown }>(
      `select c.answers->'hed' as hed from web.preclinical_calcs c join web.jobs j on j.id = c.job_id
        where j.patent_id = $1 and j.step = '3.2' and j.facility = 'animal_study' and c.ok order by c.checked_at desc limit 1`,
      [patentId],
    );
    const hed = calc.rows[0]?.hed;
    if (typeof hed === 'number' && Number.isFinite(hed)) {
      await tx.query(`insert into web.ind_sections (application_id, section, body, updated_by) values ($1, 'calc_hed', $2, $3) on conflict do nothing`, [appId, String(hed), userId]);
    }
    await tx.query('release savepoint ind_prefill');
  } catch {
    await tx.query('rollback to savepoint ind_prefill');
  }
}

/** 편집 가능 상태 확인 · 고치면 통과 · 보완 · 심사 중은 다시 초안(통과는 그 판에만 — ⑪). */
const reopenSql = `status = case when status in ('passed', 'revise', 'reviewing') then 'draft' else status end`;

function checkEditable(row: AppRow): void {
  if (!IND_EDITABLE.includes(row.status)) throw new ApiError(409, 'step_locked', E.locked);
}

export async function updatePlan(deps: Deps, account: AccountView, id: string, raw: unknown): Promise<{ application: IndApplicationView }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const expected = expectedOf(body.expectedPlanVersion, 'expectedPlanVersion');
  await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    const row = await loadAppRow(tx, id, who.teamId, true);
    checkEditable(row);
    if (row.program_revision_id !== program.revision_id) throw new ApiError(409, 'stale', E.targetChanged);
    if (row.plan_version !== expected) throw new ApiError(409, 'stale', E.planStale);
    const ctx = await loadContext(tx, who, program);
    const next = { form: row.form, dose: row.dose_mg, population: row.population, endpoint: row.endpoint, patentId: row.patent_id };
    if ('form' in body) {
      if (body.form !== null && !IND_FORMS.includes(body.form as IndForm)) throw badRequest(E.badForm);
      next.form = (body.form as IndForm | null) ?? null;
    }
    if ('doseMg' in body) {
      if (body.doseMg !== null && !IND_DOSES.includes(body.doseMg as IndDose)) throw badRequest(E.badDose);
      next.dose = (body.doseMg as IndDose | null) ?? null;
    }
    if ('population' in body) {
      if (body.population !== null && !(typeof body.population === 'string' && ctx.trial?.populations.includes(body.population))) throw badRequest(E.badPopulation);
      next.population = (body.population as string | null) ?? null;
    }
    if ('endpoint' in body) {
      if (body.endpoint !== null && !(typeof body.endpoint === 'string' && ctx.trial?.endpoints.includes(body.endpoint))) throw badRequest(E.badEndpoint);
      next.endpoint = (body.endpoint as string | null) ?? null;
    }
    if ('patentId' in body) {
      if (typeof body.patentId !== 'string' || !ctx.candidates.some((c) => c.patentId === body.patentId && c.active)) throw badRequest(E.badPatent);
      next.patentId = body.patentId;
    }
    const updated = await tx.query(
      `update web.ind_applications set form = $3, dose_mg = $4, population = $5, endpoint = $6, patent_id = $7,
              plan_version = plan_version + 1, version = version + 1, updated_at = now(), ${reopenSql}
        where id = $1 and plan_version = $2`,
      [id, expected, next.form, next.dose, next.population, next.endpoint, next.patentId],
    );
    if (!updated.rowCount) throw new ApiError(409, 'stale', E.planStale);
  });
  notifyTeam(deps, who.teamId, 'ind:plan', account.displayName);
  return responseFor(deps, who, id);
}

export async function saveIndSection(deps: Deps, account: AccountView, id: string, section: string, raw: unknown): Promise<{ ok: true; version: number; docVersion: number }> {
  const who = await teamMember(deps.db, account);
  const def = indSectionDef(section);
  if (!def) throw new ApiError(404, 'not_found', '없는 칸이에요.');
  const body = (raw ?? {}) as Record<string, unknown>;
  if (def.kind === 'pledge' && body.body !== '' && body.body !== IND_PLEDGE_BODY) throw badRequest(E.badPledge);
  const saved = await withTx(deps.db, async (tx) => {
    const row = await loadAppRow(tx, id, who.teamId, true);
    checkEditable(row);
    const out = await saveSection(tx, { kind: 'ind', docId: id, section, body: body.body, expectedVersion: body.expectedVersion, userId: account.userId, maxLength: def.max });
    await tx.query(`update web.ind_applications set ${reopenSql} where id = $1`, [id]);
    return out;
  });
  notifyTeam(deps, who.teamId, `ind:section:${section}`, account.displayName);
  return { ok: true, ...saved };
}

/** 심사 요청 — 규칙 검사 → requestReview('ind') 를 신청서 상태 'reviewing' 과 한 트랜잭션에서. */
export async function requestIndReview(deps: Deps, account: AccountView, id: string, raw: unknown) {
  const who = await teamMember(deps.db, account);
  const expected = expectedOf(((raw ?? {}) as Record<string, unknown>).expectedVersion, 'expectedVersion');
  // 물성은 트랜잭션 밖에서(워커 호출이 잠금을 오래 잡지 않게).
  await ensureFacts(deps, await loadContext(deps.db, who));
  const result = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    // 잠금 순서 teams → 신청서(requestReview 도 teams 를 잠근다).
    await tx.query('select 1 from web.teams where id = $1 for update', [who.teamId]);
    const row = await loadAppRow(tx, id, who.teamId, true);
    if (row.version !== expected) throw new ApiError(409, 'stale', E.docStale);
    if (row.status === 'reviewing' || row.status === 'passed') {
      // 같은 판을 또 눌렀다 — 그 판의 심사를 그대로 돌려준다(requestReview 가 UQ 로 찾는다).
    } else checkEditable(row);
    if (row.program_revision_id !== program.revision_id) throw new ApiError(409, 'stale', E.targetChanged);
    const ctx = await loadContext(tx, who, program);
    const { map } = await sectionsOf(tx, id);
    const ev = evaluate(ctx, row, map);
    // 이 판의 심사가 이미 있으면(같은 판을 또 누름) 상태를 건드리지 않고 그 심사를 돌려받는다.
    // 다만 같은 판인데 서버 사실(3.2 주력 지정 · 동물실험 · 물성 계산)이 바뀌어 규칙 결과가 달라졌으면, 옛 심사(캐시)를 돌려주면
    // 고칠 칸이 없는데도 영영 다시 심사받을 수 없다 — 서류 판을 1 올려(통과 · 보완은 그 판에만 — ⑪) 새로 심사한다.
    const seen = await tx.query<{ rule_findings: RuleFinding[] }>(
      `select rule_findings from web.doc_reviews where doc_kind = 'ind' and doc_id = $1 and doc_version = $2 and reviewer_version = $3`,
      [id, row.version, IND_REVIEWER_VERSION],
    );
    let docVersion = row.version;
    const prev = seen.rows[0];
    if (prev && !sameRuleOutcome(prev.rule_findings ?? [], ev.findings)) {
      const bumped = await tx.query<{ version: number }>(`update web.ind_applications set version = version + 1, updated_at = now() where id = $1 returning version`, [id]);
      docVersion = bumped.rows[0]!.version;
    }
    if (!prev || docVersion !== row.version) {
      await tx.query(`update web.ind_applications set status = 'reviewing', updated_at = now() where id = $1 and version = $2`, [id, docVersion]);
    }
    const checklist: ReviewChecklistItem[] = ev.checklist.map((c) => ({ id: c.id, section: c.section, criterion: IND_COPY.checklist[c.id]! }));
    const sections = Object.fromEntries(Object.entries(map).filter(([k]) => indSectionDef(k)?.kind === 'text'));
    return requestReview(
      deps,
      {
        kind: 'ind',
        docId: id,
        docVersion,
        sections,
        checklist,
        facts: ev.facts,
        ruleFindings: ev.findings,
        reviewerVersion: IND_REVIEWER_VERSION,
        teamId: who.teamId,
        classId: who.classId,
        requestedBy: account.userId,
      },
      { tx },
    );
  });
  result.dispatch();
  if (result.created) notifyTeam(deps, who.teamId, 'ind:review', account.displayName);
  return { review: result.review, created: result.created, ...(await responseFor(deps, who, id)) };
}

/** 접수 — 서류 통과(그 판) → IND 수수료(멱등 `ind:<id>`) → submitted · +30게임 일(⑬). */
export async function submitInd(deps: Deps, account: AccountView, id: string, raw: unknown): Promise<{ application: IndApplicationView; charged: boolean }> {
  const who = await teamMember(deps.db, account);
  const expected = expectedOf(((raw ?? {}) as Record<string, unknown>).expectedVersion, 'expectedVersion');
  await ensureFacts(deps, await loadContext(deps.db, who));
  let charged = false;
  try {
    await withTx(deps.db, async (tx) => {
      const program = await lockedProgram(tx, who.teamId);
      await tx.query('select 1 from web.teams where id = $1 for update', [who.teamId]);
      const row = await loadAppRow(tx, id, who.teamId, true);
      if (row.status === 'submitted' || row.status === 'approved') throw new ApiError(409, 'already_exists', E.alreadySubmitted);
      if (row.status !== 'passed') throw new ApiError(409, 'step_locked', E.notPassed);
      if (row.version !== expected) throw new ApiError(409, 'stale', E.docStale);
      if (row.program_revision_id !== program.revision_id) throw new ApiError(409, 'stale', E.targetChanged);
      const review = await latestReview(tx, 'ind', id);
      if (!review || review.verdict !== 'pass' || review.docVersion !== row.version) throw new ApiError(409, 'step_locked', E.reviewFirst);
      const live = await tx.query(`select 1 from web.ind_applications where program_revision_id = $1 and status in ('submitted', 'approved') and id <> $2`, [row.program_revision_id, id]);
      if (live.rowCount) throw new ApiError(409, 'already_exists', E.liveExists);
      // 규칙을 한 번 더(주력 지정 · MRSD · 예상 S) — 심사 뒤 3.2 지정이 바뀌었을 수 있다.
      const ctx = await loadContext(tx, who, program);
      const { map } = await sectionsOf(tx, id);
      const ev = evaluate(ctx, row, map);
      if (ev.findings.some((f: RuleFinding) => f.status === 'fail') || !ev.scoreInput || !ev.scores) throw new ApiError(409, 'step_locked', E.rulesFail);
      const fee = await charge(tx, { teamId: who.teamId, cents: IND_FEE_CENTS, kind: 'ind_fee', idemKey: indLedgerKey(id), createdBy: account.userId, ref: { type: 'ind_application', id } });
      charged = fee.charged;
      const clock = await loadClock(tx, who.classId);
      const updated = await tx.query(
        `update web.ind_applications set status = 'submitted', submitted_at = now(), submitted_game_day = $2::float8, decide_game_day = $2::float8 + $3::float8,
                score_input = $4, e_score = $5, s_score = $6, updated_at = now()
          where id = $1 and status = 'passed'`,
        [id, clock.gameDay, IND_REVIEW_GAME_DAYS, JSON.stringify(ev.scoreInput), ev.scores.efficacy, ev.scores.safety],
      );
      if (!updated.rowCount) throw new ApiError(409, 'already_exists', E.alreadySubmitted);
    });
  } catch (error) {
    if (isUniqueViolation(error, 'ind_applications_live_key')) throw new ApiError(409, 'already_exists', E.liveExists);
    throw error;
  }
  notifyTeam(deps, who.teamId, 'ind:submitted', account.displayName);
  return { ...(await responseFor(deps, who, id)), charged };
}

// ── 판정(게임 시계) ──

/** 판정 하나 — 상태 조건부(여러 번 불려도 · 재시작해도 한 번). 커밋 뒤 전광판 소식 · 모둠 알림. */
export async function decideInd(deps: Deps, id: string): Promise<IndStatus | null> {
  const out = await withTx(deps.db, async (tx) => {
    const found = await tx.query<AppRow & { class_id: string; ticker: string | null }>(
      `select a.*, p.code_name, p.patent_no, null::text as created_by_name, t.class_id, t.ticker
         from web.ind_applications a join web.patents p on p.id = a.patent_id join web.teams t on t.id = a.team_id
        where a.id = $1 and a.status = 'submitted' for update of a`,
      [id],
    );
    const row = found.rows[0];
    if (!row || !row.score_input) return null;
    const j = judgeInd(row.score_input);
    const status: IndStatus = j.passed ? 'approved' : 'held';
    await tx.query(
      `update web.ind_applications set status = $2, decided_game_day = decide_game_day, decided_at = now(), judgement = $3, updated_at = now()
        where id = $1 and status = 'submitted'`,
      [id, status, JSON.stringify({ passed: j.passed, reasons: j.reasons })],
    );
    const target = await tx.query<{ target_id: string | null }>('select target_id from web.program_revisions where id = $1', [row.program_revision_id]);
    const disease = targetOf(target.rows[0]?.target_id ?? null)?.disease ?? '';
    const headline = fillIndCopy(status === 'approved' ? IND_COPY.board.approved : IND_COPY.board.held, { ticker: row.ticker ?? '', code: row.code_name, disease }).slice(0, 140);
    const posted = await postBoardEvent(tx, deps, {
      classId: row.class_id,
      teamId: row.team_id,
      kind: status === 'approved' ? 'ind_approved' : 'ind_held',
      headline,
      tone: status === 'approved' ? 'normal' : 'bad',
      public: { codeName: row.code_name, stage: '3.3', disease, result: status === 'approved' ? 'pass' : 'held' },
      idemKey: `ind:${id}:decided`,
      gameDay: Math.floor(row.decide_game_day ?? 0),
    });
    return { status, teamId: row.team_id, after: posted.after };
  });
  if (!out) return null;
  out.after();
  notifyTeam(deps, out.teamId, `ind:${out.status}`);
  return out.status;
}

/** 만기 신청서 — 학급 게임 일 ≥ decide_game_day. */
export async function decideDue(deps: Deps): Promise<number> {
  const due = await deps.db.query<{ id: string }>(
    `select a.id from web.ind_applications a join web.teams t on t.id = a.team_id join web.classes c on c.id = t.class_id
      where a.status = 'submitted' and a.decide_game_day <= ${gameDaySql('c')} order by a.decide_game_day limit 50`,
  );
  let n = 0;
  for (const r of due.rows) {
    if (await decideInd(deps, r.id)) n += 1;
  }
  return n;
}

// ── 심사 처리기 ──

onReviewed('ind', async (tx, review, deps) => {
  // 그 판의 심사만 상태를 바꾼다(⑪) — 심사 뒤 칸 · 조합을 고쳤으면(판이 다르면) 그대로 둔다. 접수 뒤 정정은 되돌리지 않는다.
  const from = review.correctedFrom ? ['reviewing', 'passed', 'revise', 'draft'] : ['reviewing'];
  const next = review.verdict === 'pass' ? 'passed' : 'revise';
  const updated = await tx.query<{ team_id: string }>(
    `update web.ind_applications set status = $3, updated_at = now() where id = $1 and version = $2 and status = any($4::text[]) returning team_id`,
    [review.docId, review.docVersion, next, from],
  );
  const teamId = updated.rows[0]?.team_id ?? review.teamId;
  return () => notifyTeam(deps, teamId, `ind:reviewed:${review.verdict}`);
});

// ── 경로 ──

export function register(router: Router<RequestContext>): void {
  onGameDay('ind', async (deps) => {
    await decideDue(deps);
  });

  router.on('GET', '/api/ind', async (ctx) => loadInd(ctx.deps, requireAccount(ctx)));
  router.on('POST', '/api/ind/applications', async (ctx) => {
    const out = await createApplication(ctx.deps, requireAccount(ctx));
    if (out.created) ctx.status = 201;
    return out;
  });
  router.on('PUT', '/api/ind/applications/:applicationId/plan', async (ctx, p) => updatePlan(ctx.deps, requireAccount(ctx), p.applicationId!, await readJson(ctx.req)));
  router.on('PUT', '/api/ind/applications/:applicationId/sections/:section', async (ctx, p) =>
    saveIndSection(ctx.deps, requireAccount(ctx), p.applicationId!, p.section!, await readJson(ctx.req)),
  );
  router.on('POST', '/api/ind/applications/:applicationId/review', async (ctx, p) => requestIndReview(ctx.deps, requireAccount(ctx), p.applicationId!, await readJson(ctx.req)));
  router.on('POST', '/api/ind/applications/:applicationId/submit', async (ctx, p) => submitInd(ctx.deps, requireAccount(ctx), p.applicationId!, await readJson(ctx.req)));
}
