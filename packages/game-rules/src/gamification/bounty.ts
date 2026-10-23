/**
 * 실패 데이터 바운티 — 정답표 · 채점 · 환급액(설계서 §2.1, 사용자 결정 #2 · #3). 순수 함수 — 판정식은 `pipeline/score.ts` 를 그대로 쓴다.
 *
 * 정답표(`BountyKey`)는 서버만 만든다. 화면에는 선택지(`BOUNTY_CHOICES`)만 간다.
 * - Q1 실패 축 — 단계는 판정의 `failure`, 도킹은 'binding', ADMET 은 '높음' 신호(hERG · 간독성 · 둘 다).
 * - Q2 요인 — **실패한 축**의 식에서 중립이 아닌 감점 요인을 모두(빠뜨리거나 더하면 틀림). 단계의 `cohort_noise` 는 그 축이
 *   '점수 + 보너스 ≥ 기준'인데 음수 흔들림 때문에만 미달했을 때 더한다.
 * - Q3 처방 — 가정한 변경으로 `scoreCandidate` 를 다시 계산해 **실패한 축이 모두 떨어지지 않고 하나 이상 오르면** 유효.
 *   같은 프로토콜 재시도는 모든 실패 축이 흔들림 때문에만 미달했을 때만 유효(IND 는 흔들림이 없어 언제나 무효).
 */
import type {
  BountyAnswers,
  BountyAxis,
  BountyFactor,
  BountyKind,
  BountyRemedy,
  DoseMg,
  Formulation,
  MoleculeProperties,
  PipelineStepKind,
  PropertySignals,
  StepJudgement,
} from '@crista/shared-types';
import { BOUNTY_CHOICES, BOUNTY_REFUND_RATE } from '@crista/shared-types';
import { CLINICAL_COST_CENTS, FILING_COST_CENTS, PAID_WORK_COST_CENTS, type Cents } from '../economy.ts';
import { PIPELINE_RULES } from '../pipeline/rules.ts';
import { affinityFloorKcal, affinityStrength, propertySignals, scoreCandidate, scoreTenths, type CandidateScores } from '../pipeline/score.ts';

const R = PIPELINE_RULES;

/** 도킹 기준 미달 경계(기본 기준값) — ΔG > −7.0 kcal/mol 이면 결합력 p = 0(균형안 §10.4 · §9.3). 표적별 경계는 `affinityFloorKcal`. */
export const BOUNTY_DOCKING_FAIL_ABOVE_KCAL = -R.affinity.zeroAtNegKcal;
/** 결합력 '약함' 경계(설계서 §2.1 (B) Q2 — p < 0.6). */
export const BOUNTY_WEAK_AFFINITY_P = 0.6;
/** 처방 가정치 — 결합력 개선 = ΔG 1.0 kcal/mol 더 강하게 · 지용성 낮추기 = cLogP 1.0 낮게. 교육용 가정이다. */
export const BOUNTY_ASSUMED_AFFINITY_GAIN_KCAL = 1.0;
export const BOUNTY_ASSUMED_CLOGP_DROP = 1.0;

export interface BountyKey {
  kind: BountyKind;
  axis: BountyAxis;
  factors: BountyFactor[];
  validRemedies: BountyRemedy[];
}

// ──────────────────────────────── 단계(IND · 임상) ────────────────────────────────

export interface StepBountyInput {
  kind: Exclude<PipelineStepKind, 'final'>;
  /** **원본** 판정(보류여야 한다). */
  judgement: StepJudgement;
  /** 후보 특허의 RDKit 물성. */
  props: MoleculeProperties;
  dose: DoseMg;
  formulation: Formulation;
  /** 뇌 노출(BBB)을 효능에 넣는가 — CNS 표적이거나 뇌 병변 환자군일 때(v11). */
  cns: boolean;
  /** 그 표적의 결정 리간드 재도킹 기준값(v11). 생략하면 −11.5(규칙 기본값) — 판정과 같은 값을 넣어야 처방 비교가 맞는다. */
  referenceKcal?: number;
}

type Axis = 'E' | 'S';

function failedAxes(j: StepJudgement): Axis[] {
  if (j.failure === 'both') return ['E', 'S'];
  if (j.failure === 'efficacy') return ['E'];
  if (j.failure === 'safety') return ['S'];
  return [];
}

/** 그 축이 흔들림 때문에만 미달했는가 — 점수 + 보너스 ≥ 기준 이고 흔들림이 음수. 정수 1/10 단위(판정과 같은 비교). */
function noiseOnly(j: StepJudgement, axis: Axis): boolean {
  const score = axis === 'E' ? j.efficacy : j.safety;
  const noise = axis === 'E' ? j.noiseEfficacy : j.noiseSafety;
  const threshold = axis === 'E' ? j.thresholds.efficacy : j.thresholds.safety;
  if (score === null || threshold === null || noise === null || noise >= 0) return false;
  return scoreTenths(score) + 10 * j.bonus >= threshold * 10;
}

function tenthsOf(scores: CandidateScores, axis: Axis): number {
  return axis === 'E' ? scores.efficacyTenths : scores.safetyTenths;
}

const LOWER_DOSE: Record<DoseMg, DoseMg | null> = { 10: null, 50: 10, 100: 50 };

/** 처방 하나를 적용한 가정 입력 — 적용할 수 없으면(이미 그 제형 · 아민 없음 · 최저 용량 …) null. */
function remedyInput(input: StepBountyInput, remedy: BountyRemedy): Parameters<typeof scoreCandidate>[0] | null {
  const base = {
    affinityKcal: input.judgement.inputs.affinityKcal,
    props: input.props,
    dose: input.dose,
    formulation: input.formulation,
    cns: input.cns,
    ...(input.referenceKcal === undefined ? {} : { referenceKcal: input.referenceKcal }),
  };
  switch (remedy) {
    case 'dose_down': {
      const dose = LOWER_DOSE[input.dose];
      return dose === null ? null : { ...base, dose };
    }
    case 'to_oral':
      return input.formulation === 'oral' ? null : { ...base, formulation: 'oral' };
    case 'to_iv':
      return input.formulation === 'iv' ? null : { ...base, formulation: 'iv' };
    case 'to_transdermal':
      return input.formulation === 'transdermal' ? null : { ...base, formulation: 'transdermal' };
    case 'redesign_amine':
      return input.props.basicAmines === 0 ? null : { ...base, props: { ...input.props, basicAmines: 0 } };
    case 'redesign_alert':
      return input.props.alerts.length === 0 ? null : { ...base, props: { ...input.props, alerts: [] } };
    case 'lower_clogp':
      return { ...base, props: { ...input.props, clogp: input.props.clogp - BOUNTY_ASSUMED_CLOGP_DROP } };
    case 'improve_affinity':
      return affinityStrength(base.affinityKcal, input.referenceKcal) >= 1 ? null : { ...base, affinityKcal: base.affinityKcal - BOUNTY_ASSUMED_AFFINITY_GAIN_KCAL };
    case 'same_retry':
      return null;
  }
}

export function stepBountyKey(input: StepBountyInput): BountyKey {
  const j = input.judgement;
  const axes = failedAxes(j);
  const signals = propertySignals(input.props);
  const { A, B, De, Dt, K } = j.inputs;
  const p = affinityStrength(j.inputs.affinityKcal, input.referenceKcal);

  const factors = new Set<BountyFactor>();
  if (axes.includes('S')) {
    if (signals.herg !== 'low') factors.add('herg_risk');
    if (signals.hepatotoxicity !== 'low') factors.add('hepatotox_risk');
    if (K > 1) factors.add('iv_peak');
    if (Dt >= R.doseToxicity[50]) factors.add('high_dose');
  }
  if (axes.includes('E')) {
    if (p < BOUNTY_WEAK_AFFINITY_P) factors.add('weak_affinity');
    if (A < 1) factors.add('poor_absorption');
    if (B < 1) factors.add('low_bbb');
    if (De < 1) factors.add('low_dose');
  }
  const noiseAxes = axes.filter((axis) => noiseOnly(j, axis));
  if (noiseAxes.length > 0) factors.add('cohort_noise');

  const before = scoreCandidate({ affinityKcal: j.inputs.affinityKcal, props: input.props, dose: input.dose, formulation: input.formulation, cns: input.cns, referenceKcal: input.referenceKcal });
  const validRemedies: BountyRemedy[] = [];
  for (const remedy of BOUNTY_CHOICES.step.remedies) {
    if (remedy === 'same_retry') {
      if (axes.length > 0 && noiseAxes.length === axes.length) validRemedies.push(remedy);
      continue;
    }
    const hypo = remedyInput(input, remedy);
    if (!hypo) continue;
    const after = scoreCandidate(hypo);
    const deltas = axes.map((axis) => tenthsOf(after, axis) - tenthsOf(before, axis));
    if (deltas.length > 0 && deltas.every((d) => d >= 0) && deltas.some((d) => d > 0)) validRemedies.push(remedy);
  }

  return {
    kind: 'step',
    axis: j.failure ?? 'safety',
    factors: BOUNTY_CHOICES.step.factors.filter((f) => factors.has(f)),
    validRemedies,
  };
}

// ──────────────────────────────── 실험(도킹 · ADMET) ────────────────────────────────

/**
 * 실제 도킹의 판정 결합 자유에너지(정정 반영)가 그 표적에서 기준 미달인가 — 결합력 p = 0 이 되는 경계보다 약하다.
 * v11: 경계는 표적마다 다르다(`affinityFloorKcal(referenceKcal)` — 결정 리간드보다 4.5 kcal/mol 약한 값).
 * 기준값을 주지 않으면 −7.0(M5 기본)이다.
 */
export function dockingFailed(affinityKcal: number | null, referenceKcal?: number): boolean {
  return affinityKcal !== null && Number.isFinite(affinityKcal) && affinityKcal > affinityFloorKcal(referenceKcal);
}

export function dockingBountyKey(): BountyKey {
  return { kind: 'docking', axis: 'binding', factors: ['weak_affinity'], validRemedies: ['improve_affinity'] };
}

/** ADMET 바운티 대상인가 — 교육용 RDKit 위험 신호에 '높음'(hERG · 간독성)이 있다(설계서 §2.1 (A) ②). */
export function admetFailed(signals: PropertySignals): boolean {
  return signals.herg === 'high' || signals.hepatotoxicity === 'high';
}

function highCount(s: PropertySignals): number {
  return (s.herg === 'high' ? 1 : 0) + (s.hepatotoxicity === 'high' ? 1 : 0);
}

const RISK_RANK = { low: 0, moderate: 1, high: 2 } as const;

export function admetBountyKey(props: MoleculeProperties): BountyKey {
  const s = propertySignals(props);
  const hergHigh = s.herg === 'high';
  const hepHigh = s.hepatotoxicity === 'high';
  const axis: BountyAxis = hergHigh && hepHigh ? 'herg_and_hepatotoxicity' : hergHigh ? 'herg' : 'hepatotoxicity';
  const factors = new Set<BountyFactor>();
  if (hergHigh) {
    factors.add('basic_amine');
    factors.add('high_clogp');
  }
  if (hepHigh) factors.add('structural_alert');

  const hypotheses: Partial<Record<BountyRemedy, MoleculeProperties>> = {
    ...(props.basicAmines > 0 ? { redesign_amine: { ...props, basicAmines: 0 } } : {}),
    lower_clogp: { ...props, clogp: props.clogp - BOUNTY_ASSUMED_CLOGP_DROP },
    ...(props.alerts.length > 0 ? { redesign_alert: { ...props, alerts: [] } } : {}),
  };
  const validRemedies: BountyRemedy[] = [];
  for (const remedy of BOUNTY_CHOICES.admet.remedies) {
    const hypo = hypotheses[remedy];
    if (!hypo) continue;
    const after = propertySignals(hypo);
    const worse = RISK_RANK[after.herg] > RISK_RANK[s.herg] || RISK_RANK[after.hepatotoxicity] > RISK_RANK[s.hepatotoxicity];
    if (!worse && highCount(after) < highCount(s)) validRemedies.push(remedy);
  }
  return { kind: 'admet', axis, factors: BOUNTY_CHOICES.admet.factors.filter((f) => factors.has(f)), validRemedies };
}

// ──────────────────────────────── 채점 · 환급액 ────────────────────────────────

export interface BountyGrade {
  passed: boolean;
  correct: { axis: boolean; factors: boolean; remedy: boolean };
  hints: string[];
}

const HINTS: Record<BountyKind, { axis: string; factors: string; remedy: string }> = {
  step: {
    axis: '판정 막대에서 기준선(형광)에 못 미친 축이 효능 E 인지 안전 S 인지 다시 본다.',
    factors: "실패한 축의 근거 문장만 본다 — 계수가 1(중립)이 아니거나 위험이 '낮음'이 아닌 것, 흔들림이 음수인지.",
    remedy: '그 처방으로 실패한 축의 점수가 오르는지(다른 실패 축이 떨어지지 않는지) 식에 넣어 본다.',
  },
  docking: {
    axis: '결합 자유에너지 ΔG 가 −7.0 kcal/mol 보다 높으면(덜 음수) 결합력 p 가 0 이다.',
    factors: '도킹 결과에는 용량 · 제형 · 코호트가 없다 — 결합력만 본다.',
    remedy: '도킹은 같은 입력이면 같은 결과다. 분자를 바꿔야 결합력이 달라진다.',
  },
  admet: {
    axis: "물성 신호 중 '높음'인 위험이 무엇인지 다시 본다(hERG · 간독성).",
    factors: 'hERG 높음 = 염기성 아민 + cLogP ≥ 3.7, 간독성 높음 = 구조 경고 — 높음을 만든 원인만 고른다.',
    remedy: '용량 · 재시도는 분자의 물성을 바꾸지 않는다. 높음 신호를 낮추는 구조 변경을 고른다.',
  },
};

export function gradeBounty(key: BountyKey, answers: BountyAnswers): BountyGrade {
  const axis = answers.axis === key.axis;
  const picked = new Set(answers.factors);
  const factors = picked.size === key.factors.length && key.factors.every((f) => picked.has(f));
  const remedy = key.validRemedies.includes(answers.remedy);
  const h = HINTS[key.kind];
  const hints = [...(axis ? [] : [`Q1 — ${h.axis}`]), ...(factors ? [] : [`Q2 — ${h.factors}`]), ...(remedy ? [] : [`Q3 — ${h.remedy}`])];
  return { passed: axis && factors && remedy, correct: { axis, factors, remedy }, hints };
}

/** 답안 형식 검사 — 그 종류의 선택지 안에서만. 맞으면 정리된 답안, 아니면 null. */
export function parseBountyAnswers(kind: BountyKind, raw: unknown): BountyAnswers | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const choices = BOUNTY_CHOICES[kind];
  if (typeof r.axis !== 'string' || !(choices.axes as readonly string[]).includes(r.axis)) return null;
  if (typeof r.remedy !== 'string' || !(choices.remedies as readonly string[]).includes(r.remedy)) return null;
  if (!Array.isArray(r.factors) || r.factors.length > choices.factors.length) return null;
  const factors = new Set<BountyFactor>();
  for (const f of r.factors) {
    if (typeof f !== 'string' || !(choices.factors as readonly string[]).includes(f)) return null;
    factors.add(f as BountyFactor);
  }
  return { axis: r.axis as BountyAxis, factors: choices.factors.filter((f) => factors.has(f)), remedy: r.remedy as BountyRemedy };
}

/** 기본 비용(이벤트 · 지구 배율 전) — 단계별 1회 상한 = 기본 비용 × 환급률(설계서 §2.1 (B) 표). */
export function bountyBaseCostCents(kind: Exclude<PipelineStepKind, 'final'> | 'experiment'): Cents {
  switch (kind) {
    case 'ind':
      return FILING_COST_CENTS.ind;
    case 'phase1':
      return CLINICAL_COST_CENTS.phase1;
    case 'phase2':
      return CLINICAL_COST_CENTS.phase2;
    case 'phase3':
      return CLINICAL_COST_CENTS.phase3;
    case 'experiment':
      return PAID_WORK_COST_CENTS.docking;
  }
}

/** 환급액 = min(⌊실제 낸 비용 × 환급률⌋, ⌊기본 비용 × 환급률⌋, 계보 상한 남은 만큼). 0 이상 정수 센트. */
export function bountyRefundCents(rateKind: Exclude<PipelineStepKind, 'final'> | 'experiment', paidCents: Cents, capRemainingCents: Cents): Cents {
  const rate = BOUNTY_REFUND_RATE[rateKind];
  const paid = Math.floor(Math.max(0, paidCents) * rate);
  const cap = Math.floor(bountyBaseCostCents(rateKind) * rate);
  return Math.max(0, Math.min(paid, cap, Math.floor(capRemainingCents)));
}
