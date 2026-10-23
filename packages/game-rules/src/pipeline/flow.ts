/**
 * 파이프라인 상태 전이 · 신청 가능 판정 · 비용 · 기간 · 정정 자격 · 공개 요약 · 입력 검증 — 균형안 §10.1 · §10.5 · §10.7, 계약 `pipeline.ts`.
 * 순수 함수다. 거절은 `{ code, message }` — 메시지는 **무엇이 모자란지와 어디로 가야 하는지**를 말한다(M5 브리프 §9).
 */
import type {
  DistrictType,
  DoseMg,
  DrugBrand,
  Formulation,
  PipelinePublicSummary,
  PipelineStepKind,
  ProgramStatus,
  ProtocolPublicView,
  StepStatus,
} from '@crista/shared-types';
import {
  DOSE_OPTIONS,
  FORMULATIONS,
  PACKAGE_COLORS,
  PACKAGE_SHAPES,
  PIPELINE_LIMITS,
  PIPELINE_STEP_LABEL,
  TRIAL_OPTIONS,
} from '@crista/shared-types';
import { clampEventMultiplier, type Cents } from '../economy.ts';
import { PIPELINE_RULES } from './rules.ts';

export type PipelineDenialCode = 'not_eligible' | 'pipeline_order' | 'pipeline_busy' | 'invalid_input' | 'name_taken' | 'patent_conflict';
export interface PipelineDenial {
  code: PipelineDenialCode;
  message: string;
}
const deny = (code: PipelineDenialCode, message: string): PipelineDenial => ({ code, message });

// ─────────────────────────────── 비용 · 기간 (§10.1) ───────────────────────────────

/** 물질특허 출원 비용 — $0.050M(특허청 출원은 심사 배율을 받지 않는다). */
export function patentCostCents(): Cents {
  return PIPELINE_RULES.cost.patentCents;
}

/** 단계 비용 — IND · 최종은 심사 비용 배율, 1 · 2 · 3상은 임상 비용 배율(각 0.70~1.30 으로 자른다). 신청 시점 값. */
export function stepCostCents(kind: PipelineStepKind, multipliers: { readonly clinical: number; readonly review: number }): Cents {
  const base = PIPELINE_RULES.cost.stepCents[kind];
  const mult = kind === 'ind' || kind === 'final' ? multipliers.review : multipliers.clinical;
  return Math.round(base * clampEventMultiplier(mult));
}

/**
 * 단계 기간(게임 일) — 임상은 대학병원 지구면 × 0.85, IND · 최종 심사는 × 심사 기간 배율(0.70~1.30). 신청 시점 값(소급하지 않는다).
 * 예: 1상 · 대학병원 지구 76.5일, IND · 규제 강화(×1.25) 37.5일.
 */
export function stepDurationDays(kind: PipelineStepKind, district: DistrictType | null, reviewDurationMult = 1): number {
  const base = PIPELINE_RULES.durationDays[kind];
  const factor =
    kind === 'ind' || kind === 'final'
      ? clampEventMultiplier(reviewDurationMult)
      : district === 'hospital'
        ? PIPELINE_RULES.hospital.durationFactor
        : 1;
  return Math.round(base * factor * 1e6) / 1e6;
}

// ─────────────────────────────── 상태 (§10.5 · ProgramStatus 주석) ───────────────────────────────

/** 진행 중 단계가 있는 상태. */
export function isRunningStatus(status: ProgramStatus): boolean {
  return status === 'ind_review' || status === 'phase1' || status === 'phase2' || status === 'phase3' || status === 'final_review';
}

/** IND 를 이미 낸 상태인가(코드명 · 기전을 더 고칠 수 없다 · 프로토콜이 공개된다). */
export function isIndFiled(status: ProgramStatus): boolean {
  return status !== 'declared' && status !== 'formulated';
}

/** 지금 시작할 수 있는 다음 단계(IND · n상 · 최종). 진행 중 · 끝 · 닫힘 · 후보 미정이면 null. 실패한 상이면 그 상을 다시. */
export function nextStep(status: ProgramStatus): PipelineStepKind | null {
  switch (status) {
    case 'formulated':
    case 'ind_hold':
      return 'ind';
    case 'ind_approved':
    case 'phase1_failed':
      return 'phase1';
    case 'phase1_passed':
    case 'phase2_failed':
      return 'phase2';
    case 'phase2_passed':
    case 'phase3_failed':
      return 'phase3';
    case 'phase3_passed':
    case 'final_rejected':
      return 'final';
    default:
      return null;
  }
}

/** 단계를 시작하면 바뀌는 파이프라인 상태. */
export function statusOnStart(kind: PipelineStepKind): ProgramStatus {
  if (kind === 'ind') return 'ind_review';
  if (kind === 'final') return 'final_review';
  return kind;
}

/** 판정(또는 교사 정정) 뒤의 파이프라인 상태. */
export function statusOnDecision(kind: PipelineStepKind, passed: boolean): ProgramStatus {
  switch (kind) {
    case 'ind':
      return passed ? 'ind_approved' : 'ind_hold';
    case 'final':
      return passed ? 'approved' : 'final_rejected';
    default:
      return passed ? `${kind}_passed` : `${kind}_failed`;
  }
}

/** 화면 · 오류 문구용 상태 이름. */
export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  declared: '코드명 선언',
  formulated: '후보 · 제형 결정',
  ind_review: 'IND 심사 중',
  ind_hold: 'IND 보류',
  ind_approved: 'IND 승인',
  phase1: '임상 1상 진행 중',
  phase1_passed: '임상 1상 통과',
  phase1_failed: '임상 1상 보류(CRL)',
  phase2: '임상 2상 진행 중',
  phase2_passed: '임상 2상 통과',
  phase2_failed: '임상 2상 보류(CRL)',
  phase3: '임상 3상 진행 중',
  phase3_passed: '임상 3상 통과',
  phase3_failed: '임상 3상 보류(CRL)',
  final_review: '최종 허가 심사 중',
  final_rejected: '최종 허가 거절',
  approved: '최종 허가',
  closed: '닫힘(재창업)',
};

/** '다음에 갈 곳' 한 줄(파이프라인 패널 · 오류 메시지). 할 일이 없으면 null. */
export function nextActionHint(status: ProgramStatus | null): string | null {
  if (status === null) return '내 사옥 표적 탐색실에서 코드명 · 기전 선언';
  if (status === 'declared') return '시청 · 특허청에서 물질특허 출원 → 내 사옥 ADMET실에서 후보 · 제형 결정';
  if (isRunningStatus(status)) return `${PROGRAM_STATUS_LABEL[status]} — 판정을 기다리세요`;
  const next = nextStep(status);
  if (next === 'ind') return 'FDA 규제심사청에서 IND 신청';
  if (next === 'final') return 'FDA 규제심사청에서 최종 허가 신청';
  if (next) return `대학병원 임상센터에서 ${PIPELINE_STEP_LABEL[next]} 시작`;
  return null;
}

function busy(status: ProgramStatus): PipelineDenial {
  return deny('pipeline_busy', `${PROGRAM_STATUS_LABEL[status]}입니다 — 진행 중인 심사 · 임상이 끝난 뒤에 할 수 있습니다.`);
}

function closedOrDone(status: ProgramStatus): PipelineDenial | null {
  if (status === 'closed') return deny('pipeline_order', '재창업으로 닫힌 파이프라인입니다 — 새 회사로 다시 선언하세요.');
  if (status === 'approved') return deny('pipeline_order', '이미 최종 허가를 받은 파이프라인입니다.');
  return null;
}

/** 프로그램의 판정용 최소 모양. */
export interface ProgramFacts {
  status: ProgramStatus;
  dose: DoseMg | null;
  phase1PassedDose: DoseMg | null;
  /** v11 — 지금 겨냥하는 표적(`DOCKING_TARGETS[].id`). */
  targetId?: string;
  /** v11 — ② 에서 고른 후보 특허(없으면 null). 표적을 바꿀 수 있는지 판정에 쓴다. */
  candidatePatentId?: string | null;
}

// ─────────────────────────────── 신청 가능 판정 ───────────────────────────────

/** ① 코드명 · 기전 선언 — 표적 탐색실(건설 · 가동 중) · 이번 세대 Stage 1 성공 · IND 전까지 고칠 수 있다. */
export function checkDeclare(args: {
  program: ProgramFacts | null;
  targetFacility: { built: boolean; active: boolean };
  stage1Succeeded: boolean;
  /** v11 — 선언이 바꾸려는 표적(같으면 생략과 같다). IND 뒤에는 바꿀 수 없다. */
  targetId?: string;
}): PipelineDenial | null {
  if (!args.targetFacility.built) return deny('not_eligible', '표적 탐색실이 없습니다 — 내 사옥에 표적 탐색실을 먼저 건설하세요.');
  if (!args.targetFacility.active) return deny('not_eligible', '표적 탐색실이 가동 중지 상태입니다 — 재가동한 뒤 선언하세요.');
  if (!args.stage1Succeeded) return deny('not_eligible', '이번 세대에 성공한 Stage 1(표적 탐색) 작업이 없습니다 — 표적 탐색실에서 Stage 1 을 먼저 끝내세요.');
  if (args.program) {
    const done = closedOrDone(args.program.status);
    if (done) return done;
    if (isIndFiled(args.program.status)) return deny('pipeline_order', 'IND 를 낸 뒤에는 코드명 · 기전을 고칠 수 없습니다.');
    // 후보를 정한 뒤 표적을 바꾸면 그 후보 특허의 도킹 근거와 어긋난다 — 후보를 먼저 비우게 한다(ADMET실에서 다시 정한다).
    if (args.targetId && args.targetId !== args.program.targetId && args.program.candidatePatentId) {
      return deny(
        'pipeline_order',
        '후보 분자를 정한 뒤에는 표적을 바꿀 수 없습니다 — ADMET실에서 새 표적으로 도킹한 특허를 후보로 다시 정하거나, 표적을 그대로 두세요.',
      );
    }
  }
  return null;
}

/** 물질특허 출원 — 이번 세대 실제 도킹 근거 · 같은 물질의 유효 특허 없음. */
export function checkPatentFile(args: {
  hasDockingEvidence: boolean;
  conflict: { ticker: string; ours: boolean } | null;
}): PipelineDenial | null {
  if (!args.hasDockingEvidence) {
    return deny('not_eligible', '이번 세대 실제 도킹(Vina) 성공 결과가 없는 분자입니다 — 내 사옥 도킹실에서 이 분자를 도킹한 뒤 출원하세요.');
  }
  if (args.conflict) {
    return args.conflict.ours
      ? deny('patent_conflict', '우리 회사가 이미 이 물질의 유효 특허를 갖고 있습니다.')
      : deny('patent_conflict', `${args.conflict.ticker} 특허 — 같은 물질(입체 정보를 뺀 정규 SMILES)의 유효 특허가 있습니다. 작용기를 바꾼 새 분자를 설계하세요.`);
  }
  return null;
}

/** ② 후보 · 제형 결정 — ADMET실(건설 · 가동 중) · ① 선언 · 내 유효 특허 · 진행 중 단계 없음. 언제나 `formulated` 로 돌아간다. */
export function checkFormulate(args: {
  program: ProgramFacts | null;
  admetFacility: { built: boolean; active: boolean };
  patentOwnedActive: boolean;
  formulation: unknown;
}): PipelineDenial | null {
  if (!args.admetFacility.built) return deny('not_eligible', 'ADMET실이 없습니다 — 내 사옥에 ADMET실을 먼저 건설하세요.');
  if (!args.admetFacility.active) return deny('not_eligible', 'ADMET실이 가동 중지 상태입니다 — 재가동한 뒤 결정하세요.');
  if (!args.program) return deny('pipeline_order', '코드명 · 기전을 먼저 선언하세요 — 내 사옥 표적 탐색실.');
  const done = closedOrDone(args.program.status);
  if (done) return done;
  if (isRunningStatus(args.program.status)) return busy(args.program.status);
  if (!isFormulationOption(args.formulation)) return deny('invalid_input', '제형은 경구 · 정맥 · 경피 중 하나입니다.');
  if (!args.patentOwnedActive) return deny('not_eligible', '후보는 우리 회사의 유효 특허여야 합니다 — 시청 · 특허청에서 물질특허를 먼저 출원하세요.');
  return null;
}

/** IND 신청 — `formulated` · `ind_hold` 에서만 · 용량 · 환자군 · 1차 평가지표는 `TRIAL_OPTIONS`. */
export function checkIndFile(args: {
  program: ProgramFacts | null;
  targetId: string;
  dose: unknown;
  population: unknown;
  endpoint: unknown;
  candidateActive: boolean;
}): PipelineDenial | null {
  const order = orderFor('ind', args.program);
  if (order) return order;
  if (!isDoseOption(args.dose)) return deny('invalid_input', '용량은 10 · 50 · 100 mg 중 하나입니다.');
  const options = TRIAL_OPTIONS[args.targetId];
  if (!options || typeof args.population !== 'string' || !options.populations.includes(args.population)) {
    return deny('invalid_input', '환자군은 IND 서식의 선택지 중 하나여야 합니다.');
  }
  if (typeof args.endpoint !== 'string' || !options.endpoints.includes(args.endpoint)) {
    return deny('invalid_input', '1차 평가지표는 IND 서식의 선택지 중 하나여야 합니다.');
  }
  if (!args.candidateActive) return deny('not_eligible', '후보 특허가 유효하지 않습니다 — ADMET실에서 유효한 내 특허로 후보를 다시 정하세요.');
  return null;
}

/** 임상 시작 — 시작할 단계는 `nextStep`(실패한 상이면 그 상을 다시). */
export function checkTrialStart(program: ProgramFacts | null): { ok: true; kind: 'phase1' | 'phase2' | 'phase3' } | { ok: false; denial: PipelineDenial } {
  const next = program ? nextStep(program.status) : null;
  if (next === 'phase1' || next === 'phase2' || next === 'phase3') return { ok: true, kind: next };
  if (!program) return { ok: false, denial: deny('pipeline_order', '파이프라인이 없습니다 — 내 사옥 표적 탐색실에서 코드명 · 기전을 먼저 선언하세요.') };
  const done = closedOrDone(program.status);
  if (done) return { ok: false, denial: done };
  if (isRunningStatus(program.status)) return { ok: false, denial: busy(program.status) };
  const hint = nextActionHint(program.status);
  return { ok: false, denial: deny('pipeline_order', `지금(${PROGRAM_STATUS_LABEL[program.status]})은 임상을 시작할 수 없습니다${hint ? ` — ${hint}` : ''}.`) };
}

/**
 * 최종 허가 신청 — `phase3_passed` · `final_rejected` 에서만 · **같은 프로토콜로 3상 통과**(마지막으로 통과한 3상의 용량 · 제형 · 후보가 지금과 같다) · 서류(브랜드) 완비.
 */
export function checkFinalFile(args: {
  program: ProgramFacts | null;
  formulation: Formulation | null;
  candidatePatentId: string | null;
  phase3Passed: { dose: DoseMg; formulation: Formulation; patentId: string } | null;
  brand: unknown;
}): PipelineDenial | null {
  const order = orderFor('final', args.program);
  if (order) return order;
  const p3 = args.phase3Passed;
  if (!p3 || p3.dose !== args.program!.dose || p3.formulation !== args.formulation || p3.patentId !== args.candidatePatentId) {
    return deny(
      'not_eligible',
      p3
        ? `지금 프로토콜(${args.program!.dose ?? '?'} mg)이 3상을 통과한 프로토콜(${p3.dose} mg)과 다릅니다 — FDA 에서 용량을 되돌리거나 대학병원에서 3상을 다시 하세요.`
        : '같은 프로토콜로 통과한 3상이 없습니다 — 대학병원에서 3상을 먼저 통과하세요.',
    );
  }
  const brand = validateBrand(args.brand);
  if (!brand.ok) return brand.denial;
  return null;
}

/** IND · 최종처럼 정해진 단계 신청의 순서 판정. */
function orderFor(kind: 'ind' | 'final', program: ProgramFacts | null): PipelineDenial | null {
  if (!program) return deny('pipeline_order', '파이프라인이 없습니다 — 내 사옥 표적 탐색실에서 코드명 · 기전을 먼저 선언하세요.');
  const done = closedOrDone(program.status);
  if (done) return done;
  if (isRunningStatus(program.status)) return busy(program.status);
  if (nextStep(program.status) === kind) return null;
  const hint = nextActionHint(program.status);
  const what = kind === 'ind' ? 'IND 를 신청할' : '최종 허가를 신청할';
  return deny('pipeline_order', `지금(${PROGRAM_STATUS_LABEL[program.status]})은 ${what} 수 없습니다${hint ? ` — ${hint}` : ''}.`);
}

/**
 * 용량 변경(프로토콜 변경, 균형안 §10.5) — IND 승인 뒤 · 진행 중 단계 없음 · 허가 전.
 * **1상을 통과한 용량보다 올리면** `ind_approved`(1상부터 다시). 같거나 내리면 상태를 그대로 두고 다음(또는 실패한) 단계를 이어 한다.
 */
export function planAmend(program: ProgramFacts | null, dose: unknown): { ok: true; status: ProgramStatus; restartFromPhase1: boolean; changed: boolean } | { ok: false; denial: PipelineDenial } {
  if (!program) return { ok: false, denial: deny('pipeline_order', '파이프라인이 없습니다 — 코드명 · 기전 선언부터 하세요.') };
  const done = closedOrDone(program.status);
  if (done) return { ok: false, denial: done };
  if (isRunningStatus(program.status)) return { ok: false, denial: busy(program.status) };
  if (!isIndFiled(program.status) || program.status === 'ind_hold') {
    return { ok: false, denial: deny('pipeline_order', 'IND 승인 뒤에만 용량을 바꿀 수 있습니다 — IND 보류면 FDA 에서 용량을 바꿔 IND 를 다시 신청하세요.') };
  }
  if (!isDoseOption(dose)) return { ok: false, denial: deny('invalid_input', '용량은 10 · 50 · 100 mg 중 하나입니다.') };
  const changed = dose !== program.dose;
  const restart = program.phase1PassedDose !== null && dose > program.phase1PassedDose && program.status !== 'ind_approved';
  return { ok: true, status: restart ? 'ind_approved' : program.status, restartFromPhase1: restart, changed };
}

// ─────────────────────────────── 정정 자격 (§10.7) ───────────────────────────────

export interface StepOrderFacts {
  id: string;
  status: StepStatus;
  startedAtMs: number;
  startedGameDay: number;
}

/**
 * 단계 판정 정정 자격 — 그 파이프라인에서 **가장 최근에 판정된 단계이고 뒤 단계가 시작되지 않았을 때만**.
 * 단계는 한 번에 하나씩 진행되므로 '가장 나중에 시작된 단계가 판정(passed · failed)된 상태' 와 같다. 닫힌 파이프라인은 정정하지 않는다.
 */
export function isStepCorrectable(steps: readonly StepOrderFacts[], stepId: string, programStatus: ProgramStatus): boolean {
  if (programStatus === 'closed') return false;
  const target = steps.find((s) => s.id === stepId);
  if (!target || (target.status !== 'passed' && target.status !== 'failed')) return false;
  const latest = [...steps].sort((a, b) => b.startedAtMs - a.startedAtMs || b.startedGameDay - a.startedGameDay)[0];
  return latest?.id === stepId;
}

// ─────────────────────────────── 공개 요약 ───────────────────────────────

/**
 * 공개 파이프라인 요약(객장 · FDA 창구 · 교사 카드) — IND 전에는 프로토콜 없음, 허가 전에는 브랜드 없음. 점수 · 후보 · 물성은 싣지 않는다.
 */
export function publicSummaryOf(args: {
  teamId: string;
  ticker: string;
  companyName: string;
  codeName: string;
  mechanism: string;
  status: ProgramStatus;
  protocol: ProtocolPublicView | null;
  brand: DrugBrand | null;
  activePatents: number;
}): PipelinePublicSummary {
  return {
    teamId: args.teamId,
    ticker: args.ticker,
    companyName: args.companyName,
    codeName: args.codeName,
    mechanism: args.mechanism,
    status: args.status,
    protocol: isIndFiled(args.status) && args.protocol ? { ...args.protocol } : null,
    brand: args.status === 'approved' && args.brand ? { ...args.brand } : null,
    patents: args.activePatents,
  };
}

// ─────────────────────────────── 입력 검증 (운영 한도 — PIPELINE_LIMITS) ───────────────────────────────

const CONTROL = /[\u0000-\u001f\u007f]/;
const charLen = (s: string): number => [...s].length;

export function isDoseOption(v: unknown): v is DoseMg {
  return typeof v === 'number' && (DOSE_OPTIONS as readonly number[]).includes(v);
}

export function isFormulationOption(v: unknown): v is Formulation {
  return typeof v === 'string' && (FORMULATIONS as readonly string[]).includes(v);
}

/** 코드명 — 앞뒤 공백을 빼고 대문자로 바꾼 뒤 `^[A-Z]{2,4}-\d{3}$`. */
export function validateCodeName(v: unknown): { ok: true; value: string } | { ok: false; denial: PipelineDenial } {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!new RegExp(PIPELINE_LIMITS.codeNamePattern).test(s)) {
    return { ok: false, denial: deny('invalid_input', '코드명은 영문 대문자 2~4자 + \'-\' + 숫자 3자리입니다(예: CRX-101).') };
  }
  return { ok: true, value: s };
}

function validateText(v: unknown, max: number, what: string, required: boolean): { ok: true; value: string | null } | { ok: false; denial: PipelineDenial } {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    return required ? { ok: false, denial: deny('invalid_input', `${what}을(를) 적으세요(1~${max}자).`) } : { ok: true, value: null };
  }
  if (typeof v !== 'string' || CONTROL.test(v)) return { ok: false, denial: deny('invalid_input', `${what}에 쓸 수 없는 글자가 있습니다.`) };
  const s = v.trim();
  if (charLen(s) > max) return { ok: false, denial: deny('invalid_input', `${what}은(는) ${max}자 이하입니다.`) };
  return { ok: true, value: s };
}

/** 기전 한 줄 — 1~80자(학생 글). */
export function validateMechanism(v: unknown): { ok: true; value: string } | { ok: false; denial: PipelineDenial } {
  const r = validateText(v, PIPELINE_LIMITS.mechanismMax, '치료 기전', true);
  return r.ok ? { ok: true, value: r.value! } : r;
}

/** 특허 이름표 — 선택, 40자 이하. */
export function validatePatentLabel(v: unknown): { ok: true; value: string | null } | { ok: false; denial: PipelineDenial } {
  return validateText(v, PIPELINE_LIMITS.patentLabelMax, '특허 이름표', false);
}

/** 브랜드 — 이름 1~20자 · 포장 모양 4 · 색 3. */
export function validateBrand(v: unknown): { ok: true; value: DrugBrand } | { ok: false; denial: PipelineDenial } {
  const raw = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const name = validateText(raw.name, PIPELINE_LIMITS.brandNameMax, '브랜드 이름', true);
  if (!name.ok) return name;
  if (typeof raw.packageShape !== 'string' || !(PACKAGE_SHAPES as readonly string[]).includes(raw.packageShape)) {
    return { ok: false, denial: deny('invalid_input', '포장 모양을 고르세요(정제 · 캡슐 · 바이알 · 패치).') };
  }
  if (typeof raw.packageColor !== 'string' || !(PACKAGE_COLORS as readonly string[]).includes(raw.packageColor)) {
    return { ok: false, denial: deny('invalid_input', '포장 색을 고르세요.') };
  }
  return { ok: true, value: { name: name.value!, packageShape: raw.packageShape as DrugBrand['packageShape'], packageColor: raw.packageColor as DrugBrand['packageColor'] } };
}
