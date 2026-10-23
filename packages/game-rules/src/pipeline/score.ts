/**
 * 물성 신호 · 효능 E · 안전 S · 흔들림 · 단계 판정 — 균형안 §10.3 · §10.4(단일 소스). 순수 함수(시계 · 난수 없음 — 흔들림은 시드에서 결정적으로).
 *
 * - 점수는 소수 첫째 자리로 반올림한 뒤 **정수 1/10 단위로** 비교한다(부동소수 경계 오차 제거).
 * - 근거 문장(`reasons`)은 실제 입력값과 규칙의 경계값으로만 만든다 — 지어낸 수치가 없다.
 */
import type {
  DoseMg,
  Formulation,
  MoleculeProperties,
  PipelineStepKind,
  PropertySignals,
  RiskLevel,
  StepJudgement,
  StructuralAlertId,
} from '@crista/shared-types';
import { TRIAL_OPTIONS } from '@crista/shared-types';
import { PIPELINE_RULES } from './rules.ts';

const R = PIPELINE_RULES;
const SIG = PIPELINE_RULES.signals;

// ─────────────────────────────── 표기 ───────────────────────────────

/** 수 표기 — 음수는 '−'(U+2212). */
export function fmtNum(value: number, digits: number): string {
  const s = Math.abs(value).toFixed(digits);
  return value < 0 && Number(s) !== 0 ? `−${s}` : s;
}

const signed = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
const coef = (n: number): string => n.toFixed(2);

const RISK_LABEL: Record<RiskLevel, string> = { low: '낮음', moderate: '보통', high: '높음' };
const ALERT_LABEL: Record<StructuralAlertId, string> = { aromatic_amine: '방향족 아민', nitro_aromatic: '방향족 니트로' };
const ORAL_LABEL = { good: '좋음', moderate: '보통', poor: '나쁨' } as const;
const BBB_LABEL = { high: '높음', moderate: '보통', low: '낮음' } as const;

// ─────────────────────────────── 점수 반올림 ───────────────────────────────

/**
 * 점수 → 정수 1/10 단위(예: 58.656 → 587). 두 번 반올림한다 — 먼저 1e-6 단위로 부동소수 잡음을 없애고(76.875 가 76.87499… 로 되는 것),
 * 그다음 소수 첫째 자리로(균형안 §10.4 '소수 첫째 자리 반올림 뒤 판정').
 */
export function scoreTenths(value: number): number {
  return Math.round(Math.round(value * 1e6) / 1e5);
}

/** 점수의 표시 값(소수 첫째 자리) — `scoreTenths / 10`. */
export function roundScore(value: number): number {
  return scoreTenths(value) / 10;
}

// ─────────────────────────────── 물성 신호 (§10.3) ───────────────────────────────

/** Lipinski Ro5 위반 수 — MW > 500 · cLogP > 5 · HBD > 5 · HBA > 10. */
export function ro5Violations(p: MoleculeProperties): number {
  return (
    (p.mw > SIG.ro5.mwMax ? 1 : 0) +
    (p.clogp > SIG.ro5.clogpMax ? 1 : 0) +
    (p.hbd > SIG.ro5.hbdMax ? 1 : 0) +
    (p.hba > SIG.ro5.hbaMax ? 1 : 0)
  );
}

/** 물성 → 위험 신호(균형안 §10.3 표). */
export function propertySignals(p: MoleculeProperties): PropertySignals {
  const v = ro5Violations(p);
  const oralAbsorption: PropertySignals['oralAbsorption'] =
    v === 0 && p.tpsa <= SIG.oral.tpsaMax && p.rotb <= SIG.oral.rotbMax
      ? 'good'
      : v <= SIG.oral.moderateViolationsMax && p.tpsa <= SIG.oral.tpsaMax
        ? 'moderate'
        : 'poor';
  const bbb: PropertySignals['bbb'] =
    p.tpsa <= SIG.bbb.high.tpsaMax && p.mw <= SIG.bbb.high.mwMax && p.hbd <= SIG.bbb.high.hbdMax
      ? 'high'
      : p.tpsa <= SIG.bbb.moderate.tpsaMax && p.mw <= SIG.bbb.moderate.mwMax
        ? 'moderate'
        : 'low';
  const herg: RiskLevel =
    p.basicAmines > 0 && p.clogp >= SIG.herg.highClogpMin
      ? 'high'
      : p.basicAmines > 0 && p.clogp >= SIG.herg.moderateClogpMin
        ? 'moderate'
        : 'low';
  const hepatotoxicity: RiskLevel =
    p.alerts.length > 0
      ? 'high'
      : p.clogp > SIG.hepatotoxicity.clogpOver && p.tpsa < SIG.hepatotoxicity.tpsaUnder
        ? 'moderate'
        : 'low';
  const transdermal: PropertySignals['transdermal'] =
    p.mw <= SIG.transdermal.mwMax && p.clogp >= SIG.transdermal.clogpMin && p.clogp <= SIG.transdermal.clogpMax ? 'suitable' : 'unsuitable';
  return { ro5Violations: v, oralAbsorption, bbb, herg, hepatotoxicity, transdermal };
}

/**
 * 신호마다 근거 한 줄(ADMET실 · 결과지) — 실제 물성값과 규칙의 경계값만 쓴다.
 * 예: hERG 'hERG 위험 높음 — 염기성 아민 1 · cLogP 4.36 ≥ 3.7'.
 */
export function signalNotes(p: MoleculeProperties, s: PropertySignals = propertySignals(p)): Record<keyof PropertySignals, string> {
  const mw = fmtNum(p.mw, 1);
  const clogp = fmtNum(p.clogp, 2);
  const tpsa = fmtNum(p.tpsa, 1);

  const ro5Parts: string[] = [];
  if (p.mw > SIG.ro5.mwMax) ro5Parts.push(`MW ${mw} > ${SIG.ro5.mwMax}`);
  if (p.clogp > SIG.ro5.clogpMax) ro5Parts.push(`cLogP ${clogp} > ${SIG.ro5.clogpMax}`);
  if (p.hbd > SIG.ro5.hbdMax) ro5Parts.push(`HBD ${p.hbd} > ${SIG.ro5.hbdMax}`);
  if (p.hba > SIG.ro5.hbaMax) ro5Parts.push(`HBA ${p.hba} > ${SIG.ro5.hbaMax}`);
  const ro5 =
    ro5Parts.length === 0
      ? `Ro5 위반 0 — MW ${mw} · cLogP ${clogp} · HBD ${p.hbd} · HBA ${p.hba}`
      : `Ro5 위반 ${s.ro5Violations} — ${ro5Parts.join(' · ')}`;

  let oral: string;
  if (s.oralAbsorption === 'good') {
    oral = `경구 흡수 좋음 — Ro5 위반 0 · TPSA ${tpsa} ≤ ${SIG.oral.tpsaMax} · RotB ${p.rotb} ≤ ${SIG.oral.rotbMax}`;
  } else if (s.oralAbsorption === 'moderate') {
    const why = s.ro5Violations > 0 ? `Ro5 위반 ${s.ro5Violations}` : `RotB ${p.rotb} > ${SIG.oral.rotbMax}`;
    oral = `경구 흡수 보통 — ${why} · TPSA ${tpsa} ≤ ${SIG.oral.tpsaMax}`;
  } else {
    const why: string[] = [];
    if (s.ro5Violations > SIG.oral.moderateViolationsMax) why.push(`Ro5 위반 ${s.ro5Violations} > ${SIG.oral.moderateViolationsMax}`);
    if (p.tpsa > SIG.oral.tpsaMax) why.push(`TPSA ${tpsa} > ${SIG.oral.tpsaMax}`);
    oral = `경구 흡수 나쁨 — ${why.join(' · ')}`;
  }

  let bbb: string;
  if (s.bbb === 'high') {
    bbb = `뇌 노출 높음 — TPSA ${tpsa} ≤ ${SIG.bbb.high.tpsaMax} · MW ${mw} ≤ ${SIG.bbb.high.mwMax} · HBD ${p.hbd} ≤ ${SIG.bbb.high.hbdMax}`;
  } else if (s.bbb === 'moderate') {
    const why: string[] = [];
    if (p.tpsa > SIG.bbb.high.tpsaMax) why.push(`TPSA ${tpsa} > ${SIG.bbb.high.tpsaMax}`);
    if (p.mw > SIG.bbb.high.mwMax) why.push(`MW ${mw} > ${SIG.bbb.high.mwMax}`);
    if (p.hbd > SIG.bbb.high.hbdMax) why.push(`HBD ${p.hbd} > ${SIG.bbb.high.hbdMax}`);
    bbb = `뇌 노출 보통 — ${why.join(' · ')} · TPSA ${tpsa} ≤ ${SIG.bbb.moderate.tpsaMax} · MW ${mw} ≤ ${SIG.bbb.moderate.mwMax}`;
  } else {
    const why: string[] = [];
    if (p.tpsa > SIG.bbb.moderate.tpsaMax) why.push(`TPSA ${tpsa} > ${SIG.bbb.moderate.tpsaMax}`);
    if (p.mw > SIG.bbb.moderate.mwMax) why.push(`MW ${mw} > ${SIG.bbb.moderate.mwMax}`);
    bbb = `뇌 노출 낮음 — ${why.join(' · ')}`;
  }

  let herg: string;
  if (s.herg === 'high') herg = `hERG 위험 높음 — 염기성 아민 ${p.basicAmines} · cLogP ${clogp} ≥ ${SIG.herg.highClogpMin}`;
  else if (s.herg === 'moderate') herg = `hERG 위험 보통 — 염기성 아민 ${p.basicAmines} · cLogP ${clogp} ≥ ${SIG.herg.moderateClogpMin}`;
  else if (p.basicAmines === 0) herg = 'hERG 위험 낮음 — 염기성 아민 없음';
  else herg = `hERG 위험 낮음 — 염기성 아민 ${p.basicAmines} · cLogP ${clogp} < ${SIG.herg.moderateClogpMin}`;

  let hepato: string;
  if (s.hepatotoxicity === 'high') hepato = `간독성 위험 높음 — 구조 경고(${p.alerts.map((a) => ALERT_LABEL[a] ?? a).join(' · ')})`;
  else if (s.hepatotoxicity === 'moderate') hepato = `간독성 위험 보통 — cLogP ${clogp} > ${SIG.hepatotoxicity.clogpOver} · TPSA ${tpsa} < ${SIG.hepatotoxicity.tpsaUnder}`;
  else if (p.clogp <= SIG.hepatotoxicity.clogpOver) hepato = `간독성 위험 낮음 — 구조 경고 없음 · cLogP ${clogp} ≤ ${SIG.hepatotoxicity.clogpOver}`;
  else hepato = `간독성 위험 낮음 — 구조 경고 없음 · TPSA ${tpsa} ≥ ${SIG.hepatotoxicity.tpsaUnder}`;

  let transdermal: string;
  if (s.transdermal === 'suitable') {
    transdermal = `경피 투과 적합 — MW ${mw} ≤ ${SIG.transdermal.mwMax} · ${SIG.transdermal.clogpMin} ≤ cLogP ${clogp} ≤ ${SIG.transdermal.clogpMax}`;
  } else {
    const why: string[] = [];
    if (p.mw > SIG.transdermal.mwMax) why.push(`MW ${mw} > ${SIG.transdermal.mwMax}`);
    if (p.clogp > SIG.transdermal.clogpMax) why.push(`cLogP ${clogp} > ${SIG.transdermal.clogpMax}`);
    if (p.clogp < SIG.transdermal.clogpMin) why.push(`cLogP ${clogp} < ${SIG.transdermal.clogpMin}`);
    transdermal = `경피 투과 부적합 — ${why.join(' · ')}`;
  }
  return { ro5Violations: ro5, oralAbsorption: oral, bbb, herg, hepatotoxicity: hepato, transdermal };
}

// ─────────────────────────────── 점수 (§10.4) ───────────────────────────────

/**
 * 결합력 p = clamp((ΔG_ref + 4.5 − ΔG) / 5, 0, 1) — 표적별 정규화(v11).
 * `referenceKcal` 은 그 표적의 결정 리간드 재도킹 값(`DockingTarget.referenceKcal`)이다. 기준 리간드는 p = 0.9 에 놓인다.
 * 생략하면 −11.5 — M5 의 원래 식 `(−ΔG − 7) / 5` 와 산술까지 같다(CRO 퀴즈 · 바운티의 일반 규칙 설명이 이 기본값을 쓴다).
 */
export function affinityStrength(affinityKcal: number, referenceKcal: number = R.affinity.defaultReferenceKcal): number {
  const ref = Number.isFinite(referenceKcal) ? referenceKcal : R.affinity.defaultReferenceKcal;
  const p = (ref + R.affinity.headroomKcal - affinityKcal) / R.affinity.spanKcal;
  return Math.min(1, Math.max(0, p));
}

/** 그 표적에서 결합력 p 가 0 이 되는 경계 ΔG(이보다 약하면 효능 바닥) — 기본 기준이면 −7.0 kcal/mol. */
export function affinityFloorKcal(referenceKcal: number = R.affinity.defaultReferenceKcal): number {
  return (Number.isFinite(referenceKcal) ? referenceKcal : R.affinity.defaultReferenceKcal) + R.affinity.headroomKcal;
}

export function absorptionFactor(formulation: Formulation, s: PropertySignals): number {
  if (formulation === 'iv') return R.absorption.iv;
  if (formulation === 'oral') return R.absorption.oral[s.oralAbsorption];
  return R.absorption.transdermal[s.transdermal];
}

export function brainExposureFactor(cns: boolean, s: PropertySignals): number {
  return cns ? R.bbb[s.bbb] : R.bbb.nonCns;
}

export function riskMultiplier(s: PropertySignals): number {
  return 1 + R.risk.herg[s.herg] + R.risk.hepatotoxicity[s.hepatotoxicity];
}

export interface CandidateScoreInput {
  /** 특허에 남긴 결합 자유에너지(kcal/mol). */
  affinityKcal: number;
  props: MoleculeProperties;
  dose: DoseMg;
  formulation: Formulation;
  /**
   * 뇌 노출(BBB)을 효능에 넣는가 — 표적이 중추신경계이거나(`DockingTarget.cns`),
   * 뇌 병변 환자군(`TRIAL_OPTIONS[].brainPopulations`, 예: 뇌전이 동반 비소세포폐암)을 골랐으면 true(v11).
   */
  cns: boolean;
  /** 그 표적의 결정 리간드 재도킹 값(`DockingTarget.referenceKcal`, v11). 생략하면 −11.5(M5 원래 식). */
  referenceKcal?: number;
  /** `cns` 가 표적이 아니라 **환자군**(뇌전이 등) 때문에 켜졌는가 — 근거 문장에 그대로 적는다(v11). */
  cnsFromPopulation?: boolean;
}

/**
 * 뇌 노출(BBB)을 효능에 넣는가(v11) — 중추신경계 표적이거나, 뇌 병변 환자군(`TRIAL_OPTIONS[].brainPopulations`)을 골랐을 때.
 * 예: 비소세포폐암 EGFR 은 말초 표적이지만 '뇌전이를 동반한' 환자군을 고르면 약이 뇌까지 가야 한다.
 */
export function needsBrainExposure(args: { cnsTarget: boolean; targetId: string; population: string | null | undefined }): boolean {
  if (args.cnsTarget) return true;
  const brain = TRIAL_OPTIONS[args.targetId]?.brainPopulations;
  return Boolean(args.population && brain?.includes(args.population));
}

export interface CandidateScores {
  /** 효능 E · 안전 S — 소수 첫째 자리 반올림 값. */
  efficacy: number;
  safety: number;
  /** 같은 값의 정수 1/10 단위(판정 비교용). */
  efficacyTenths: number;
  safetyTenths: number;
  /** 재현용 입력(`StepJudgement.inputs`). */
  inputs: StepJudgement['inputs'];
  signals: PropertySignals;
  /** 효능 축의 근거 문장(결합력 · 흡수 · 뇌 노출 · 용량 효능 · 식). */
  efficacyReasons: string[];
  /** 안전 축의 근거 문장(용량 독성 · hERG · 간독성 · 제형 피크 · 식). */
  safetyReasons: string[];
}

const FORMULATION_PEAK_NOTE: Record<Formulation, string> = {
  oral: '경구 제형 피크',
  iv: '정맥주사 혈중 피크',
  transdermal: '경피 지속 방출',
};

/** 효능 E · 안전 S(균형안 §10.4) — 입력 · 계수 · 근거 문장까지. */
export function scoreCandidate(input: CandidateScoreInput): CandidateScores {
  const signals = propertySignals(input.props);
  const notes = signalNotes(input.props, signals);
  const reference = input.referenceKcal ?? R.affinity.defaultReferenceKcal;
  const p = affinityStrength(input.affinityKcal, reference);
  const A = absorptionFactor(input.formulation, signals);
  const B = brainExposureFactor(input.cns, signals);
  const De = R.doseEfficacy[input.dose];
  const Dt = R.doseToxicity[input.dose];
  const Rk = riskMultiplier(signals);
  const K = R.formulationPeak[input.formulation];
  const eRaw = 100 * (R.efficacy.base + R.efficacy.affinityWeight * p) * A * B * De;
  const sRaw = Math.max(0, 100 - Dt * Rk * K);
  const efficacyTenths = scoreTenths(eRaw);
  const safetyTenths = scoreTenths(sRaw);
  const efficacy = efficacyTenths / 10;
  const safety = safetyTenths / 10;

  const absorptionNote =
    input.formulation === 'iv'
      ? `정맥주사 — 흡수 A ${coef(A)}`
      : input.formulation === 'oral'
        ? `${notes.oralAbsorption} → 흡수 A ${coef(A)}`
        : `${notes.transdermal} → 흡수 A ${coef(A)}`;
  const efficacyReasons = [
    `결합 자유에너지 ${fmtNum(input.affinityKcal, 2)} kcal/mol → 결합력 p ${p.toFixed(3)}` +
      ` (표적 기준 리간드 ${fmtNum(reference, 2)} kcal/mol 대비 — 기준은 p ${((R.affinity.headroomKcal / R.affinity.spanKcal)).toFixed(3)})`,
    absorptionNote,
    input.cns
      ? `${input.cnsFromPopulation ? '뇌 병변 환자군 — 약이 뇌까지 가야 한다 · ' : ''}${notes.bbb} → 뇌 노출 B ${coef(B)}`
      : `CNS 표적 아님 — 뇌 노출 B ${coef(B)}`,
    `용량 ${input.dose} mg — 용량 효능 De ${coef(De)}`,
    `효능 E = 100 × (${coef(R.efficacy.base)} + ${coef(R.efficacy.affinityWeight)} × ${p.toFixed(3)}) × ${coef(A)} × ${coef(B)} × ${coef(De)} = ${efficacy.toFixed(1)}`,
  ];
  const safetyReasons = [
    `용량 ${input.dose} mg — 용량 독성 Dt ${Dt}`,
    `${notes.herg} (R +${coef(R.risk.herg[signals.herg])})`,
    `${notes.hepatotoxicity} (R +${coef(R.risk.hepatotoxicity[signals.hepatotoxicity])})`,
    `${FORMULATION_PEAK_NOTE[input.formulation]} ×${coef(K)}`,
    `안전 S = max(0, 100 − ${Dt} × ${coef(Rk)} × ${coef(K)}) = ${safety.toFixed(1)}`,
  ];
  return {
    efficacy,
    safety,
    efficacyTenths,
    safetyTenths,
    inputs: { affinityKcal: input.affinityKcal, p, A, B, De, Dt, R: Rk, K },
    signals,
    efficacyReasons,
    safetyReasons,
  };
}

// ─────────────────────────────── 흔들림 (§10.4) ───────────────────────────────

/** 32비트 문자열 해시(xmur3 계열). */
function hash32(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 첫 값 [0, 1). */
function firstUniform(seed32: number): number {
  let a = (seed32 + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 환자 코호트 흔들림 n — 정수 균등 −range~+range(2·range+1 값). **학급 시드 + 단계 id + 축('E' · 'S')** 으로 정해지는 결정적 값이다
 * (같은 입력이면 언제나 같은 값 — 복원으로 되살린 단계는 같은 id 라 다시 굴리지 않는다). range 가 0 이하이면 0.
 */
export function cohortNoise(seed: number | string | bigint, stepId: string, axis: 'E' | 'S', range: number): number {
  const r = Math.floor(range);
  if (!(r > 0)) return 0;
  const u = firstUniform(hash32(`crista-cohort:${String(seed)}:${stepId}:${axis}`));
  return Math.min(2 * r, Math.floor(u * (2 * r + 1))) - r;
}

/** 그 단계의 흔들림 두 축 — 단계가 보지 않는 축은 null(IND · 최종은 둘 다 null). */
export function stepNoise(seed: number | string | bigint, stepId: string, kind: PipelineStepKind): { efficacy: number | null; safety: number | null } {
  const t = R.thresholds[kind];
  const range = R.noiseRange[kind];
  if (range <= 0) return { efficacy: null, safety: null };
  return {
    efficacy: t.efficacy === null ? null : cohortNoise(seed, stepId, 'E', range),
    safety: t.safety === null ? null : cohortNoise(seed, stepId, 'S', range),
  };
}

/** 대학병원 지구 보너스 b — 임상(1 · 2 · 3상)만 +3, IND · 최종 심사는 0. */
export function districtBonus(kind: PipelineStepKind, hospitalDistrict: boolean): number {
  return hospitalDistrict && (kind === 'phase1' || kind === 'phase2' || kind === 'phase3') ? R.hospital.scoreBonus : 0;
}

// ─────────────────────────────── 판정 (§10.4) ───────────────────────────────

/**
 * 단계 판정(균형안 §10.4 표). 정수 1/10 단위로 `점수 + n + b ≥ 기준` 을 비교한다.
 * - IND: S ≥ 35(흔들림 · 보너스 없음). 1상: S + n + b ≥ 50. 2상: E + n + b ≥ 40. 3상: E + n₁ + b ≥ 45 그리고 S + n₂ + b ≥ 55.
 * - 최종: 같은 프로토콜로 3상 통과 · 서류 완비면 통과(교사 정정으로만 거절) — 조건 확인은 신청 때 한다.
 * `noise` 의 축이 null 이면 0 으로 본다. IND · 최종의 `bonus` 는 무시한다(0).
 */
export function judgeStep(
  kind: PipelineStepKind,
  scores: CandidateScores,
  noise: { efficacy: number | null; safety: number | null },
  bonus: number,
): StepJudgement {
  const t = R.thresholds[kind];
  const b = kind === 'ind' || kind === 'final' ? 0 : bonus;
  if (kind === 'final') {
    return {
      efficacy: null,
      safety: null,
      noiseEfficacy: null,
      noiseSafety: null,
      bonus: 0,
      thresholds: { efficacy: null, safety: null },
      passed: true,
      failure: null,
      reasons: ['3상을 통과한 프로토콜 · 서류(브랜드 이름 · 포장) 완비 — 최종 허가'],
      inputs: scores.inputs,
    };
  }
  const reasons: string[] = [];
  const axis = (name: '효능 E' | '안전 S', tenths: number, n: number | null, threshold: number): boolean => {
    const nn = n ?? 0;
    const total = tenths + 10 * (nn + b);
    const ok = total >= threshold * 10;
    const parts = [`${name} ${(tenths / 10).toFixed(1)}`];
    if (n !== null) parts.push(`흔들림 ${signed(n)}`);
    if (b !== 0) parts.push(`대학병원 지구 ${signed(b)}`);
    const sum = parts.length > 1 ? ` = ${fmtNum(total / 10, 1)}` : '';
    reasons.push(`${parts.join(' + ')}${sum} ${ok ? '≥' : '<'} ${threshold} — ${ok ? '기준 통과' : '기준 미달'}`);
    return ok;
  };
  let effOk = true;
  let safeOk = true;
  if (t.efficacy !== null) {
    reasons.push(...scores.efficacyReasons);
  }
  if (t.safety !== null) {
    reasons.push(...scores.safetyReasons);
  }
  if (t.efficacy !== null) effOk = axis('효능 E', scores.efficacyTenths, noise.efficacy, t.efficacy);
  if (t.safety !== null) safeOk = axis('안전 S', scores.safetyTenths, noise.safety, t.safety);
  const passed = effOk && safeOk;
  const failure = passed ? null : !effOk && !safeOk ? 'both' : !effOk ? 'efficacy' : 'safety';
  return {
    efficacy: t.efficacy === null ? null : scores.efficacy,
    safety: t.safety === null ? null : scores.safety,
    noiseEfficacy: t.efficacy === null ? null : noise.efficacy,
    noiseSafety: t.safety === null ? null : noise.safety,
    bonus: b,
    thresholds: { efficacy: t.efficacy, safety: t.safety },
    passed,
    failure,
    reasons,
    inputs: scores.inputs,
  };
}

/** 한 축의 통과 확률(흔들림 균등 분포 기준, 산술 점검용) — 정수 1/10 비교. */
export function passProbability(scoreTenthsValue: number, threshold: number, range: number, bonus: number): { pass: number; of: number } {
  const r = Math.max(0, Math.floor(range));
  let pass = 0;
  for (let n = -r; n <= r; n++) if (scoreTenthsValue + 10 * (n + bonus) >= threshold * 10) pass++;
  return { pass, of: 2 * r + 1 };
}

/** 위험 신호 이름표(화면 · NPC 공용). */
export const SIGNAL_LEVEL_LABEL = { risk: RISK_LABEL, oral: ORAL_LABEL, bbb: BBB_LABEL } as const;
