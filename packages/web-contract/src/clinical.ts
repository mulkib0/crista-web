/**
 * 4.1 임상 1 · 2 · 3상 규격(기능 F41 — 2026-10-24 사용자 지시로 설계 · 구현). 설계 기록: docs/2026-10-23-implementation-status.md §6.41.
 *
 * 한 상(phase)의 걸음: ① 프로토콜(IND 승인서의 제형 · 용량 · 환자군 · 1차 평가지표 + 상별 목표 인원 · 군) →
 * ② 참여자 모집(앞 단계 계산값으로 규칙이 속도 · 선별 실패 · 탈락을 정함 · 모집 투자 단계는 모둠이 언제든 바꿈 — 바꾼 때부터 게임 일마다 과금) →
 * ③ [임상 시작](최소 인원 이상 · 검정력 게이지 · 상 비용 과금 · 상 기간 시작) →
 * ④ 시뮬레이션(Claude Opus 5.5 · effort medium 이 그 상의 임상을 시뮬레이션 — 서버가 스키마 · 범위 · 앞뒤를 검사) →
 * ⑤ 결과 · 분석(상 기간이 끝나는 게임 일에 공개 — 여러 그림).
 * 통과 → 다음 상, 3상 통과 = 4.1 완료. 보류 → 재도전 3경로(같은 프로토콜 · 용량/제형 변경 · 백업 후보 교체) + 실패 바운티.
 *
 * 이 파일은 순수 규칙(모집 속도 · 검정력 · 군 구성)과 화면 · 서버가 함께 쓰는 모양 · 학생 문구(COPY)를 둔다.
 * 학생에게 보이는 문구는 `CLINICAL_COPY` 한곳에 — §5.12 에 따라 Gemini 4 Argon (High) 초안을 Claude 가 검토해 반영했어요(.review/2026-10-24-copy-4.1 · 식별자 · 숫자 · 규칙 값은 밖에).
 * 공개 범위(§5.3): 후보 SMILES · 물성 · 점수 · 결과 표는 그 모둠과 교사만 — 전광판에는 상 · 통과/보류 · 보류 종류만.
 */
import type { IndForm } from './ind.ts';
import { cristaToCents } from './money.ts';

export type TrialPhase = 'phase1' | 'phase2' | 'phase3';
export const TRIAL_PHASES: readonly TrialPhase[] = ['phase1', 'phase2', 'phase3'];
export const PHASE_LABEL: Record<TrialPhase, string> = { phase1: '1상', phase2: '2상', phase3: '3상' };
export const nextPhase = (p: TrialPhase): TrialPhase | null => (p === 'phase1' ? 'phase2' : p === 'phase2' ? 'phase3' : null);

/** recruiting 모집 중 → running 진행 중 → completed(통과) | held(보류) | pending(판정 대기 — 시뮬레이션이 없거나 실패, 교사 수동 처리). */
export type TrialStatus = 'recruiting' | 'running' | 'completed' | 'held' | 'pending';
export type RecruitTier = 'basic' | 'expanded' | 'focus';
export const RECRUIT_TIER_IDS: readonly RecruitTier[] = ['basic', 'expanded', 'focus'];
/** 그 시도가 어떻게 열렸나 — 첫 1상 · 다음 상 · 같은 프로토콜 다시 · 용량/제형 변경 · 백업 후보 교체. */
export type TrialRoute = 'first' | 'next' | 'same' | 'amend' | 'backup';
export type RetryRoute = 'same' | 'amend' | 'backup';
export type HoldKind = 'safety' | 'efficacy' | 'both' | 'operational';
/** 시뮬레이션 상태 — none(시작 전) · queued(부르는 중 · 다시 부를 차례) · ready · manual(교사 수동 처리 대기). */
export type SimStatus = 'none' | 'queued' | 'ready' | 'manual';

/** 시뮬레이션 프롬프트 판 — 프롬프트 · 스키마 · 모델 · effort 를 바꾸면 올린다(입력 해시에 들어가 옛 캐시를 쓰지 않는다). */
export const CLINICAL_SIM_VERSION = 'clinical-sim-v4'; // v3 = 해설 '학생에게 말하는 법'(clinical-sim.ts SIM_TALK_*) · v4 = 통과의 안전 상한(5등급 · 1상 SAE 1/3 · 2상 SAE 차 10%p)

// ── 상별 규칙(균형안 §1 비용 · 기간 — crista PIPELINE_RULES 와 같은 값, 서버 시험이 확인) ──

export interface ArmPlan {
  id: 'control' | 'low' | 'mid' | 'high';
  /** 계획 용량에 곱하는 비율(대조군 0). */
  doseFraction: number;
  /** 배정 비율(합 1). */
  share: number;
}

export interface PhaseRule {
  costCrista: number;
  gameDays: number;
  /** 목표 인원 — 수업용으로 줄인 규모(실제: 1상 수십 · 2상 수백 · 3상 수천). 항암 1상은 따로. */
  targetN: number;
  /** [임상 시작] 최소 인원 = 목표 × 이 비율(올림). */
  minRatio: number;
  /** 모집 투자 '기본'에 모든 배율 1 일 때 목표를 채우는 게임 일. */
  baseRecruitDays: number;
  /** 1차 평가지표를 재는 주차(시간 경과 그림의 끝). */
  primaryWeek: number;
  /** 화면 '목표 검정력'(2 · 3상) — 1상은 '이상사례 감지력'. */
  targetPower: number;
}

export const PHASE_RULES: Record<TrialPhase, PhaseRule> = {
  // 기간 · 기본 모집 일수는 crista 규칙(PIPELINE_RULES.durationDays 90 / 180 / 360)의 절반 — 수업 시간에 맞춤(2026-10-24 사용자 지시 "임상 1상/2상/3상 절반씩으로 줄여라").
  phase1: { costCrista: 1_500_000, gameDays: 45, targetN: 40, minRatio: 0.6, baseRecruitDays: 30, primaryWeek: 4, targetPower: 0.8 },
  phase2: { costCrista: 3_000_000, gameDays: 90, targetN: 180, minRatio: 0.6, baseRecruitDays: 60, primaryWeek: 12, targetPower: 0.8 },
  phase3: { costCrista: 6_000_000, gameDays: 180, targetN: 600, minRatio: 0.6, baseRecruitDays: 75, primaryWeek: 24, targetPower: 0.9 },
};
export const phaseCostCents = (p: TrialPhase): number => cristaToCents(PHASE_RULES[p].costCrista);
/** 항암 1상은 환자 소수(대조군 없이 용량 3단계) — 목표 30. */
export const ONCOLOGY_PHASE1_TARGET = 30;

/**
 * 모집 투자 단계 — 돈을 더 낼수록 빨라진다. 기본은 추가 비용 없음(대신 게임 시계로 오래 기다림).
 * 비용은 단계를 고른 때부터 모집 중인 게임 일마다(원장 멱등 — 정산할 때마다 한 줄).
 * 기본 모집 일수를 절반으로 줄이면서 하루 비용을 두 배로 올려, 같은 인원을 모으는 총비용은 그대로 뒀다.
 */
export const RECRUIT_TIERS: Record<RecruitTier, { speed: number; cristaPerDay: Record<TrialPhase, number> }> = {
  basic: { speed: 1, cristaPerDay: { phase1: 0, phase2: 0, phase3: 0 } },
  expanded: { speed: 2, cristaPerDay: { phase1: 10_000, phase2: 15_000, phase3: 24_000 } },
  focus: { speed: 3.5, cristaPerDay: { phase1: 40_000, phase2: 60_000, phase3: 96_000 } },
};

/** 백업 후보 교체 = 새 IND(변경 신고) — IND 수수료와 같은 값 · 30게임 일 뒤부터 모집(3.3 의 IND_FEE · IND_REVIEW_GAME_DAYS 와 같은 값). */
export const BACKUP_SWAP_FEE_CRISTA = 500_000;
export const BACKUP_SWAP_WAIT_DAYS = 30;

/** 실패 바운티 — 보류 원인 분석이 맞으면 낸 상 비용 × 환급률(crista BOUNTY_REFUND_RATE · learning-grant). 오답 뒤 다시 내기까지 현실 초. */
export const TRIAL_BOUNTY_RATE: Record<TrialPhase, number> = { phase1: 0.5, phase2: 0.4, phase3: 0.3 };
export const TRIAL_BOUNTY_RETRY_SEC = 60;
export const TRIAL_BOUNTY_TEXT_MIN = 40;
export const TRIAL_BOUNTY_TEXT_MAX = 600;

// ── 표적 질환별 임상 모양(설계 §6.1.1 대표 1차 평가지표) ──

export type Prevalence = 'common' | 'moderate' | 'rare';
export interface DiseaseTrialProfile {
  disease: string;
  prevalence: Prevalence;
  oncology: boolean;
  /** 대표 1차 평가지표의 짧은 이름 · 단위 · 높을수록 좋은가. */
  endpointShort: string;
  unit: string;
  higherIsBetter: boolean;
  /** 대조군의 1차 평가지표 평균(주차 끝) · 약이 계획 용량에서 낼 수 있는 최대 차이(E = 100 기준). 교사 수동 판정 표 · 프롬프트 참고. */
  controlMean: number;
  maxEffect: number;
  /** 군 안 표준편차(주차 끝). */
  sd: number;
}

export const DISEASE_TRIAL_PROFILES: Record<string, DiseaseTrialProfile> = {
  'ache-4ey7': { disease: '알츠하이머병', prevalence: 'moderate', oncology: false, endpointShort: 'ADAS-Cog 변화', unit: '점', higherIsBetter: false, controlMean: 2.0, maxEffect: 4.0, sd: 6 },
  'maob-2v5z': { disease: '파킨슨병', prevalence: 'moderate', oncology: false, endpointShort: 'UPDRS III 변화', unit: '점', higherIsBetter: false, controlMean: -1.0, maxEffect: 5.0, sd: 8 },
  'sert-5i71': { disease: '주요우울장애', prevalence: 'common', oncology: false, endpointShort: 'MADRS 변화', unit: '점', higherIsBetter: false, controlMean: -9.0, maxEffect: 5.0, sd: 9 },
  'egfr-1m17': { disease: '비소세포폐암', prevalence: 'moderate', oncology: true, endpointShort: '무진행 생존기간(PFS)', unit: '개월', higherIsBetter: true, controlMean: 5.5, maxEffect: 5.0, sd: 4 },
  'abl1-2hyy': { disease: '만성 골수성 백혈병', prevalence: 'rare', oncology: true, endpointShort: '12개월 MMR 달성률', unit: '%', higherIsBetter: true, controlMean: 22, maxEffect: 30, sd: 45 },
  'braf-3og7': { disease: '전이성 흑색종', prevalence: 'rare', oncology: true, endpointShort: '무진행 생존기간(PFS)', unit: '개월', higherIsBetter: true, controlMean: 1.6, maxEffect: 5.0, sd: 3 },
  'dpp4-1x70': { disease: '2형 당뇨병', prevalence: 'common', oncology: false, endpointShort: 'HbA1c 변화', unit: '%p', higherIsBetter: false, controlMean: -0.1, maxEffect: 0.8, sd: 0.9 },
  'hmgcr-1hwk': { disease: '고지혈증', prevalence: 'common', oncology: false, endpointShort: 'LDL-C 변화율', unit: '%', higherIsBetter: false, controlMean: -2, maxEffect: 45, sd: 15 },
  'fxa-2p16': { disease: '정맥혈전색전증', prevalence: 'moderate', oncology: false, endpointShort: 'VTE 재발률', unit: '%', higherIsBetter: false, controlMean: 8, maxEffect: 5, sd: 25 },
  'cox2-3ln1': { disease: '류마티스 관절염', prevalence: 'common', oncology: false, endpointShort: 'ACR20 달성률', unit: '%', higherIsBetter: true, controlMean: 30, maxEffect: 28, sd: 48 },
  'jak1-6bbu': { disease: '아토피 피부염', prevalence: 'common', oncology: false, endpointShort: 'EASI-75 달성률', unit: '%', higherIsBetter: true, controlMean: 12, maxEffect: 45, sd: 45 },
  'pde4b-1xmu': { disease: '천식 · COPD', prevalence: 'common', oncology: false, endpointShort: 'FEV1 변화', unit: 'mL', higherIsBetter: true, controlMean: 20, maxEffect: 120, sd: 200 },
};
export const DEFAULT_TRIAL_PROFILE: DiseaseTrialProfile = {
  disease: '표적 질환', prevalence: 'moderate', oncology: false, endpointShort: '1차 평가지표 변화', unit: '점', higherIsBetter: true, controlMean: 0, maxEffect: 5, sd: 8,
};
export const trialProfile = (targetId: string | null | undefined): DiseaseTrialProfile => (targetId && DISEASE_TRIAL_PROFILES[targetId]) || DEFAULT_TRIAL_PROFILE;

/** 상별 군 구성 — 1상 건강한 지원자 용량 단계(위약 대조) · 2상 환자 무작위 위약 대조(용량 2개) · 3상 대규모 확증(1:1). 항암은 대조군이 표준 치료이고 1상은 대조군 없음. */
export function armPlan(phase: TrialPhase, oncology: boolean): ArmPlan[] {
  if (phase === 'phase1') {
    return oncology
      ? [{ id: 'low', doseFraction: 0.25, share: 1 / 3 }, { id: 'mid', doseFraction: 0.5, share: 1 / 3 }, { id: 'high', doseFraction: 1, share: 1 / 3 }]
      : [{ id: 'control', doseFraction: 0, share: 0.25 }, { id: 'low', doseFraction: 0.25, share: 0.25 }, { id: 'mid', doseFraction: 0.5, share: 0.25 }, { id: 'high', doseFraction: 1, share: 0.25 }];
  }
  if (phase === 'phase2') return [{ id: 'control', doseFraction: 0, share: 1 / 3 }, { id: 'mid', doseFraction: 0.5, share: 1 / 3 }, { id: 'high', doseFraction: 1, share: 1 / 3 }];
  return [{ id: 'control', doseFraction: 0, share: 0.5 }, { id: 'high', doseFraction: 1, share: 0.5 }];
}

export const targetNOf = (phase: TrialPhase, oncology: boolean): number => (phase === 'phase1' && oncology ? ONCOLOGY_PHASE1_TARGET : PHASE_RULES[phase].targetN);
export const minNOf = (phase: TrialPhase, oncology: boolean): number => Math.ceil(targetNOf(phase, oncology) * PHASE_RULES[phase].minRatio);
/** 1상이 환자가 아닌 건강한 지원자인가(항암은 1상도 환자). */
export const healthyVolunteers = (phase: TrialPhase, oncology: boolean): boolean => phase === 'phase1' && !oncology;
/** 군 용량(mg — 0.5 단위). */
export const armDoseMg = (doseMg: number, fraction: number): number => Math.round(doseMg * fraction * 2) / 2;

// ── 모집 규칙 — 앞 단계 계산값(S · E · 위험 · 제형 · CNS · 질환 유병)으로 정한다 ──

export type RiskLevelLite = 'low' | 'moderate' | 'high';
export interface RecruitInput {
  phase: TrialPhase;
  /** 흔들림 전 예상치(game-rules scoreCandidate). */
  efficacy: number;
  safety: number;
  herg: RiskLevelLite;
  hepatotoxicity: RiskLevelLite;
  form: IndForm;
  /** 뇌 노출을 보는 표적 · 환자군(CNS) — 환자 동의 · 평가가 까다롭다. */
  cns: boolean;
  targetId: string | null;
}

export interface RecruitFactorRow {
  key: 'safety' | 'efficacy' | 'risk' | 'form' | 'cns' | 'prevalence';
  factor: number;
  /** 근거 한 줄(숫자 포함 — 문구 틀은 COPY). */
  note: string;
}

export interface RecruitModel {
  /** 모집 투자 '기본'의 하루 모집 인원(등록 기준). */
  basePerDay: number;
  factors: RecruitFactorRow[];
  /** 선별 실패율 · 탈락률(%). */
  screenFailPct: number;
  dropoutPct: number;
  targetN: number;
  minN: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function recruitModel(input: RecruitInput): RecruitModel {
  const profile = trialProfile(input.targetId);
  const patients = !healthyVolunteers(input.phase, profile.oncology);
  const rule = PHASE_RULES[input.phase];
  const targetN = targetNOf(input.phase, profile.oncology);
  const factors: RecruitFactorRow[] = [];
  const s = input.safety;
  factors.push({ key: 'safety', factor: s >= 70 ? 1.15 : s >= 50 ? 1 : s >= 35 ? 0.85 : 0.7, note: `S ${s.toFixed(1)}` });
  if (patients) {
    const e = input.efficacy;
    factors.push({ key: 'efficacy', factor: e >= 60 ? 1.1 : e >= 40 ? 1 : 0.9, note: `E ${e.toFixed(1)}` });
  }
  const riskHits = [input.herg, input.hepatotoxicity];
  const riskFactor = riskHits.reduce((acc, r) => acc * (r === 'high' ? 0.9 : r === 'moderate' ? 0.95 : 1), 1);
  factors.push({ key: 'risk', factor: round2(riskFactor), note: `hERG ${input.herg} · 간 ${input.hepatotoxicity}` });
  factors.push({ key: 'form', factor: input.form === 'iv' ? 0.85 : input.form === 'transdermal' ? 1.05 : 1, note: input.form });
  if (patients && input.cns) factors.push({ key: 'cns', factor: 0.85, note: 'cns' });
  if (patients) factors.push({ key: 'prevalence', factor: profile.prevalence === 'common' ? 1.2 : profile.prevalence === 'rare' ? 0.6 : 1, note: profile.prevalence });
  const product = factors.reduce((acc, f) => acc * f.factor, 1);
  const basePerDay = round2((targetN / rule.baseRecruitDays) * product);
  const moderate = riskHits.filter((r) => r === 'moderate').length;
  const high = riskHits.filter((r) => r === 'high').length;
  const baseFail = { phase1: 20, phase2: 30, phase3: 35 }[input.phase];
  const screenFailPct = Math.min(60, baseFail + 5 * moderate + 10 * high + (patients && input.cns ? 5 : 0));
  const baseDrop = { phase1: 5, phase2: 10, phase3: 15 }[input.phase];
  const dropoutPct = Math.max(2, baseDrop + (s < 50 ? 5 : 0) + (input.form === 'iv' ? 3 : 0) + (input.form === 'transdermal' ? -2 : 0) + (patients && input.cns ? 3 : 0));
  return { basePerDay, factors, screenFailPct, dropoutPct, targetN, minN: minNOf(input.phase, profile.oncology) };
}

export const tierPerDay = (model: Pick<RecruitModel, 'basePerDay'>, tier: RecruitTier): number => round2(model.basePerDay * RECRUIT_TIERS[tier].speed);

/** 남은 인원을 채우는 게임 일 · 그동안 드는 크리스타(그 단계를 계속 쓸 때). */
export function recruitProjection(model: RecruitModel, phase: TrialPhase, tier: RecruitTier, enrolled: number): { daysLeft: number; costLeftCrista: number } {
  const per = tierPerDay(model, tier);
  const left = Math.max(0, model.targetN - enrolled);
  const daysLeft = per > 0 ? Math.ceil(left / per) : Infinity;
  return { daysLeft, costLeftCrista: Number.isFinite(daysLeft) ? daysLeft * RECRUIT_TIERS[tier].cristaPerDay[phase] : 0 };
}

// ── 검정력 게이지 — 인원이 적으면 결과가 흔들린다 ──

/** 표준정규 누적분포(Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/**
 * 검정력(0~1).
 * - 2 · 3상: 목표 인원에서 목표 검정력(80 · 90%)이 되게 설계한 시험을 n 명으로 할 때 — Φ(√(n/목표) · (z_α + z_β) − z_α), α 양측 0.05.
 * - 1상: 약을 받은 사람 가운데 5% 빈도의 이상사례를 한 번이라도 볼 확률 — 1 − 0.95^(약 군 인원).
 */
export function trialPower(phase: TrialPhase, n: number, oncology: boolean): number {
  if (n <= 0) return 0;
  const target = targetNOf(phase, oncology);
  if (phase === 'phase1') {
    const drugShare = armPlan(phase, oncology).filter((a) => a.doseFraction > 0).reduce((acc, a) => acc + a.share, 0);
    return 1 - Math.pow(0.95, n * drugShare);
  }
  const za = 1.959964;
  const zb = phase === 'phase2' ? 0.841621 : 1.281552;
  return normalCdf(Math.sqrt(n / target) * (za + zb) - za);
}

// ── 시뮬레이션 결과 모양(Claude 구조화 출력 — 서버가 다시 검사) ──

export const AE_SYSTEMS = ['cardiac', 'hepatic', 'gastrointestinal', 'nervous', 'skin', 'general', 'musculoskeletal', 'respiratory', 'blood', 'metabolic', 'psychiatric', 'infection'] as const;
export type AeSystem = (typeof AE_SYSTEMS)[number];
export const DROPOUT_REASONS = ['adverse_event', 'lost_to_followup', 'withdrew_consent', 'lack_of_efficacy', 'protocol_deviation', 'other'] as const;
export type DropoutReason = (typeof DROPOUT_REASONS)[number];

export interface SimArmCount {
  arm: string;
  n: number;
}
export interface TrialSimResult {
  screened: number;
  screenFailed: number;
  arms: Array<{ arm: string; randomized: number; completed: number; discontinued: Array<{ reason: DropoutReason; n: number }> }>;
  demographics: { ageMean: number; ageSd: number; femalePct: number };
  pk: Array<{ arm: string; cmaxNgMl: number; tmaxH: number; tHalfH: number; aucNgHMl: number; points: Array<{ h: number; conc: number }> }>;
  adverseEvents: Array<{ system: AeSystem; term: string; grade: number; counts: SimArmCount[] }>;
  sae: SimArmCount[];
  dlt: SimArmCount[];
  primary: {
    name: string;
    unit: string;
    higherIsBetter: boolean;
    arms: Array<{ arm: string; mean: number; ciLow: number; ciHigh: number; n: number }>;
    comparison: { treatment: string; control: string; diff: number; ciLow: number; ciHigh: number; p: number } | null;
  };
  timecourse: Array<{ week: number; values: Array<{ arm: string; mean: number }> }>;
  responseRate: Array<{ arm: string; pct: number }>;
  survival: Array<{ arm: string; points: Array<{ month: number; pct: number }> }>;
  subgroups: Array<{ label: string; diff: number; ciLow: number; ciHigh: number; n: number }>;
  verdict: 'pass' | 'held';
  holdKind: HoldKind | null;
  analysis: string;
  recommendation: string;
}

/** 시뮬레이션 글 길이 상한(학생 화면 — 미성년자 지침 §5.13: 짧게). */
export const SIM_TEXT_MAX = { analysis: 400, recommendation: 200, term: 40, label: 30, name: 80, unit: 20 } as const;

// ── 화면 모양 ──

export interface TrialArmView {
  id: string;
  label: string;
  doseMg: number;
  share: number;
}

export interface TrialProtocolView {
  phase: TrialPhase;
  codeName: string;
  patentId: string;
  form: IndForm;
  doseMg: number;
  population: string;
  endpoint: string;
  healthy: boolean;
  oncology: boolean;
  arms: TrialArmView[];
  targetN: number;
  minN: number;
  gameDays: number;
  costCrista: number;
  primaryWeek: number;
}

export interface RecruitTierView {
  tier: RecruitTier;
  speed: number;
  cristaPerDay: number;
  perDay: number;
  daysLeft: number | null;
  costLeftCrista: number;
}

export interface RecruitView {
  tier: RecruitTier;
  /** 등록 인원(정수 내림) · 선별한 사람(대략). */
  enrolled: number;
  screened: number;
  targetN: number;
  minN: number;
  perDay: number;
  screenFailPct: number;
  dropoutPct: number;
  factors: RecruitFactorRow[];
  tiers: RecruitTierView[];
  /** 모집 곡선 — 게임 일 · 그때까지 등록 인원(정산 때마다 한 점). */
  curve: Array<{ day: number; enrolled: number; tier: RecruitTier }>;
  /** 백업 교체 뒤 IND 변경 심사가 끝나 모집이 시작되는 게임 일(그 전에는 0명). */
  availableFromDay: number | null;
  spentCrista: number;
  power: number;
  powerAtTarget: number;
}

export interface TrialBountyView {
  eligible: boolean;
  reason: string | null;
  claimed: boolean;
  refundCrista: number;
  /** 다시 낼 수 있는 현실 시각(ISO) — 오답 뒤 60초. */
  retryAt: string | null;
  lastHints: string[];
  /** 선택지(crista BOUNTY_CHOICES.step · 이름표) — 정답은 서버만 안다. */
  choices: { axes: Array<{ id: string; label: string }>; factors: Array<{ id: string; label: string }>; remedies: Array<{ id: string; label: string }> };
}

export interface TrialView {
  id: string;
  phase: TrialPhase;
  attempt: number;
  route: TrialRoute;
  status: TrialStatus;
  protocol: TrialProtocolView;
  recruit: RecruitView;
  openedGameDay: number;
  startedGameDay: number | null;
  endsGameDay: number | null;
  decidedGameDay: number | null;
  /** 상 기간 진행률(0~100) — running 일 때. */
  progressPct: number | null;
  enrolledAtStart: number | null;
  startedByName: string | null;
  /** 진행 중 — 중간 안전성 모니터링 문구(규칙 — 결과를 미리 알려 주지 않는다). */
  monitoring: string[];
  /** 공개된 결과(상 기간이 끝난 뒤). */
  result: TrialSimResult | null;
  verdict: 'pass' | 'held' | null;
  holdKind: HoldKind | null;
  /** 결과를 누가 만들었나 — AI 시뮬레이션 · 교사 수동 판정(규칙 생성 표). */
  /** llm = AI 시뮬레이션 · rule = AI 를 쓸 수 없어 규칙 판정(교사를 기다리지 않음) · teacher = 교사가 공개 전에 정함 · 정정(선택). */
  resultSource: 'llm' | 'teacher' | 'rule' | null;
  resultModel: string | null;
  bounty: TrialBountyView | null;
  costPaidCrista: number;
}

export interface RouteOptionView {
  route: TrialRoute;
  phase: TrialPhase;
  available: boolean;
  reason: string | null;
  feeCrista: number;
  waitDays: number;
  /** 용량/제형 변경 — 고를 수 있는 조합(규칙 검사 통과 여부 · 그 조합의 E · S 예상치). */
  options?: Array<{ form: IndForm; doseMg: number; ok: boolean; reason: string | null; efficacy: number; safety: number; resetsToPhase1: boolean }>;
  codeName?: string;
}

export interface PhaseLadderView {
  phase: TrialPhase;
  state: 'todo' | 'recruiting' | 'running' | 'passed' | 'held' | 'pending';
  attempts: number;
  thresholds: { efficacy: number | null; safety: number | null };
  /** 지금 프로토콜의 흔들림 전 예상치 · 참고 통과 확률(game-rules — 교육용). */
  efficacy: number;
  safety: number;
  refPassProb: number;
  costCrista: number;
  gameDays: number;
}

export interface FundingStepView {
  day: number | null;
  at: string;
  crista: number;
  kind: 'trial_fee' | 'recruit' | 'backup_fee' | 'bounty';
  phase: TrialPhase | null;
}

export interface ClinicalCandidateView {
  codeName: string;
  patentId: string;
  form: IndForm;
  doseMg: number;
  population: string;
  endpoint: string;
  efficacy: number;
  safety: number;
  mrsdMgByForm: Partial<Record<IndForm, number>> | null;
  profile: DiseaseTrialProfile;
  backup: { codeName: string; patentId: string; mrsdMgByForm: Partial<Record<IndForm, number>> | null } | null;
}

export interface ClinicalResponse {
  gameDay: number;
  /** IND 승인 뒤에 열린다. */
  enabled: boolean;
  lockedReason: string | null;
  candidate: ClinicalCandidateView | null;
  /** 이 표적 버전의 모든 시도(새것 먼저). */
  trials: TrialView[];
  /** 지금 살아 있는 시도(모집 중 · 진행 중 · 판정 대기) — 없으면 null. */
  current: TrialView | null;
  /** 지금 열 수 있는 것(첫 1상 · 다음 상 · 재도전 3경로). */
  routes: RouteOptionView[];
  ladder: PhaseLadderView[];
  funding: FundingStepView[];
  balanceCrista: number;
  done: boolean;
}

/** 교사 화면 한 줄 — 결과 · 참고 판정 · 시뮬레이션 상태를 늘 본다. */
export interface TeacherTrialView extends Omit<TrialView, 'result'> {
  teamId: string;
  teamName: string | null;
  ticker: string | null;
  simStatus: SimStatus;
  simAttempts: number;
  simError: string | null;
  result: TrialSimResult | null;
  /** game-rules 판정(참고값 — §5.11 예외 기록). */
  reference: {
    passed: boolean;
    failure: string | null;
    reasons: string[];
    passProb: number;
    /** AI 판정이 참고 확률과 크게 어긋남(통과인데 15% 미만 · 보류인데 85% 넘음) — 교사 알림. */
    divergent: boolean;
    /** 교사가 공개 전에 정정한 경우 AI 원본. */
    llmOriginal: { verdict: 'pass' | 'held'; holdKind: HoldKind | null; model: string | null } | null;
  } | null;
}

// ── 요청 ──

export interface OpenTrialRequest {
  route: TrialRoute;
  /** 용량/제형 변경일 때. */
  form?: IndForm;
  doseMg?: number;
}
export interface TierRequest {
  tier: RecruitTier;
}
export interface TrialBountyRequest {
  axis: string;
  factors: string[];
  remedy: string;
  analysis: string;
}
export interface TeacherDecideTrialRequest {
  verdict: 'pass' | 'held';
  holdKind?: HoldKind | null;
  note?: string;
  /** AI 결과가 이미 있을 때 공개 전에 정정(원본은 남는다). */
  override?: boolean;
}

export const CLINICAL_API = {
  view: '/api/clinical',
  open: '/api/clinical/open',
  tier: (trialId: string) => `/api/clinical/trials/${trialId}/tier`,
  start: (trialId: string) => `/api/clinical/trials/${trialId}/start`,
  bounty: (trialId: string) => `/api/clinical/trials/${trialId}/bounty`,
  teacher: (classId: string) => `/api/teacher/classes/${classId}/clinical`,
  teacherResimulate: (trialId: string) => `/api/teacher/clinical/${trialId}/resimulate`,
  teacherDecide: (trialId: string) => `/api/teacher/clinical/${trialId}/decision`,
} as const;

// ── 학생 문구(§5.12 — Gemini 4 Argon (High) 초안 → Claude 검토 · .review/2026-10-24-copy-4.1/copy.md 반영. 숫자는 {자리표시자}) ──
// 돈 자리표시자({cost} · {fee} · {spent} · {crista} …)에는 formatCrista() 결과(단위 '크리스타' 포함)를 넣어요 — 문구에 '크리스타'를 다시 쓰지 않아요.

export const CLINICAL_COPY = {
  teacherMade: '선생님 판정 · 규칙으로 만든 표',
  ruleMade: '규칙 판정 · 규칙으로 만든 표',
  tabs: { protocol: '프로토콜', recruit: '참여자 모집', start: '시작 · 진행', result: '결과 · 분석', retry: '보류 뒤 재도전' },
  phaseQuestion: { phase1: '사람에게 안전한가요?', phase2: '환자에게 효과가 있나요?', phase3: '많은 환자에게서 효과와 안전을 함께 확인할 수 있나요?' } as Record<TrialPhase, string>,
  phaseWho: {
    phase1: '건강한 지원자 {target}명을 모아요. 용량을 조금씩 올려 가며 시험해요.',
    phase2: '환자 {target}명을 무작위로(제비뽑기처럼) 나눠요. 그리고 대조군(약의 효과를 견주는 기준 무리)과 견줘요.',
    phase3: '환자 {target}명에게서 효과와 안전을 확증해요.',
  } as Record<TrialPhase, string>,
  oncologyWho: '항암제는 독성이 커서 보통 건강한 사람에게 주지 않아요. 그래서 1상부터 암 환자 {target}명에게 시험해요.',
  arm: { control: '위약', controlOnc: '표준 치료', low: '낮은 용량', mid: '중간 용량', high: '계획 용량' },
  /** 제형 이름(화면 · 서버 막음 글 — 식별자 oral · iv · transdermal 대신). */
  formLabel: { oral: '경구', iv: '정맥주사', transdermal: '경피 패치' } as Record<IndForm, string>,
  /** ① 프로토콜 — 군 구성 · 설계 · 평가지표 풀이. */
  protocol: {
    arms: {
      phase1: '1상 군 구성: 위약(약 성분이 없는 가짜 약) · 낮은 용량(계획의 0.25배) · 중간 용량(0.5배) · 계획 용량(1배)에 25%씩 나눠요.',
      phase1Onc: '항암 1상 군 구성: 대조군 없이 낮은 용량(0.25배) · 중간 용량(0.5배) · 계획 용량(1배)에 1/3씩 나눠요.',
      phase2: '2상 군 구성: 대조군(약의 효과를 견주는 기준 무리) · 중간 용량(0.5배) · 계획 용량(1배)에 1/3씩 나눠요. 대조군은 위약을 받아요. 항암제는 위약 대신 표준 치료(지금 가장 널리 쓰는 치료법)를 받아요.',
      phase3: '3상 군 구성: 대조군(약의 효과를 견주는 기준 무리)과 계획 용량 군을 1 : 1 로 나눠요. 항암제는 위약 대신 표준 치료(지금 가장 널리 쓰는 치료법)를 대조군으로 써요.',
    },
    design: '대조군이 있는 시험은 무작위 배정(제비뽑기처럼 군을 정하는 것)을 해요. 눈가림(누가 진짜 약을 받았는지 참여자와 의사가 모르게 하는 것)도 해요. 둘 다 결과가 한쪽으로 치우치는 것을 막아요.',
    endpoint: '1차 평가지표(이 시험이 답하려는 질문을 재는 가장 중요한 잣대): {endpoint}',
    endpointPhase1: '1상의 1차 평가지표는 군별 이상사례 발생 비율(%)이에요. 이상사례는 시험 중에 생긴 좋지 않은 변화를 모두 뜻해요(약 때문인지와 상관없이). 비율이 낮을수록 좋아요.',
    sampleSize: '목표 {target}명 · 최소 시작 인원 {min}명 · 1차 평가 {primaryWeek}주 차',
    costDuration: '{phase} 비용 {cost} · 기간 {days}게임 일',
  },
  tier: {
    basic: { label: '기본', note: '추가 비용이 없어요. 대신 목표 인원까지 오래 기다려야 해요.' },
    expanded: { label: '확대', note: '참여 병원을 늘려요. 모집 속도가 {speed}배가 되고, 하루 {cost}가 들어요.' },
    focus: { label: '집중', note: '병원과 모집 안내를 크게 늘려요. 모집 속도가 {speed}배가 되고, 하루 {cost}가 들어요.' },
  } as Record<RecruitTier, { label: string; note: string }>,
  tierRule: '모집 투자 단계는 언제든 바꿀 수 있어요. 바꾼 날부터 모집 중인 게임 일마다 그 단계의 하루 비용이 나가요.',
  /** 모집 요인 근거(서버 note 의 식별자 낱말) → 화면 낱말. */
  factorWord: { low: '낮음', moderate: '보통', high: '높음', oral: '경구', iv: '정맥주사', transdermal: '경피', cns: '뇌 질환', common: '흔함', rare: '드묾' } as Record<string, string>,
  /** 모집 속도 요인 — label 은 그림 이름표(짧게), note 는 풀이. */
  factor: {
    safety: { label: '안전 예상치 S', note: '안전할수록 참여하려는 사람이 많아요. S 가 50 보다 낮으면 탈락도 늘어요.' },
    efficacy: { label: '효능 예상치 E', note: '기대가 클수록 환자와 의사가 더 참여해요. 환자 시험에만 적용해요.' },
    risk: { label: 'hERG · 간 위험', note: 'hERG(심장 근육이 한 번 뛴 뒤 전기적으로 원래 상태로 돌아오게 돕는 칼륨 통로)나 간 위험이 있으면 검사가 늘어 선별에서 더 많이 떨어져요.' },
    form: { label: '제형', note: '정맥주사는 병원에 와서 맞아야 해서 부담이 커요. 붙이는 경피 패치는 부담이 적어요.' },
    cns: { label: 'CNS 질환 환자', note: 'CNS(중추신경계: 뇌와 척수) 질환 환자는 동의를 받고 상태를 평가하는 절차가 까다로워요.' },
    prevalence: { label: '질환 유병', note: '질환 유병(그 병을 앓는 사람이 얼마나 흔한지) — 흔한 병은 빨리, 드문 병은 느리게 모여요.' },
  } as Record<RecruitFactorRow['key'], { label: string; note: string }>,
  minNeed: '최소 {min}명이 모이면 시작할 수 있어요. 목표는 {target}명이에요.',
  minNeedBlock: '아직 최소 인원 {min}명이 모이지 않았어요. 목표는 {target}명이에요.',
  budgetBlock: '연구비가 모자라요. {phase}을 시작하려면 {cost}가 필요해요.',
  powerNote: '검정력(약에 정말 효과가 있을 때 시험이 그 효과를 찾아낼 확률)은 인원이 많을수록 높아져요.',
  power1Note: '1상은 검정력 대신 \'이상사례 감지력\'을 보여 줘요. 약을 받은 사람 가운데 5%에게 생기는 이상사례를 한 번이라도 볼 확률이에요.',
  powerNow: '지금 {n}명이면 {power}예요. 목표 {target}명이면 {powerAtTarget}예요.',
  powerTarget: '목표 인원을 채우면 검정력이 {targetPower}가 되도록 설계했어요.',
  lowWarn: '최소 {min}명만 넘으면 시작할 수 있어요. 하지만 인원이 적으면 약에 효과가 있어도 보류될 가능성이 커져요.',
  lowWarnPhase1: '인원이 적으면 드문 이상사례를 놓치기 쉬워요.',
  startConfirm: '지금 모인 {n}명으로 {phase}을 시작할까요? {cost}를 내고 {days}게임 일 동안 시험해요. 시작하면 모집이 멈추고 인원이 고정돼요. 시작한 뒤에는 되돌릴 수 없어요.',
  running: '{phase} 진행 중 · {progress}% · 결과는 D+{day}에 공개돼요.',
  monitoring: {
    start: 'DMC(독립 자료모니터링위원회: 시험 도중 안전을 따로 살피는 전문가 모임)가 안전성 자료를 정기적으로 봐요.',
    herg: '심전도로 QT 간격(심장 아래쪽 방인 심실이 전기 신호로 흥분했다가 원래대로 돌아오기까지 걸리는 시간)을 감시하고 있어요.',
    liver: '혈액 검사로 간 수치(ALT · AST: 간세포가 다치면 오르는 효소)를 감시하고 있어요.',
    cns: '인지 · 정신 상태 평가를 함께 하고 있어요.',
    iv: '주사 부위 반응과 주사 직후 반응을 기록하고 있어요.',
    half: '시험 기간의 절반이 지났어요. 눈가림을 지키려고 결과는 끝난 뒤 한꺼번에 공개해요.',
  },
  pending: '결과를 정리하고 있어요. AI 시뮬레이션이 끝나는 대로 공개돼요(AI 를 쓸 수 없으면 규칙 판정으로 정해져요).',
  verdictPass: '{phase} 통과',
  verdictHeld: '{phase} 보류',
  verdictPassNext: '{next} 모집을 시작할 수 있어요.',
  verdictHeldNext: '원인을 분석하고 재도전 경로를 골라 보세요.',
  holdKind: { safety: '안전성 문제', efficacy: '효능 부족', both: '효능 · 안전 둘 다', operational: '운영 문제(모집 · 탈락)' } as Record<HoldKind, string>,
  /** 보류 종류 풀이(결과 판정 아래). */
  holdWhy: {
    safety: '약을 받은 군에서 심각한 이상사례가 기준보다 많았어요.',
    efficacy: '대조군과의 차이가 우연으로도 나올 수 있는 정도였거나(p ≥ 0.05), 나쁜 방향이었어요.',
    both: '효과를 증명하지 못했고, 안전 문제도 함께 나왔어요.',
    operational: '탈락이 많아 끝까지 마친 사람이 75% 아래였어요.',
  } as Record<HoldKind, string>,
  /** ④ 결과 그림 · 표를 읽는 법. */
  read: {
    consort: 'CONSORT(참여자 흐름도)예요. 선별부터 배정 · 완료까지 사람이 어디서 몇 명 빠졌는지 보여 줘요. 끝까지 마친 비율이 75% 아래로 떨어지면 운영 문제로 보류될 수 있어요.',
    pk: 'PK(약동학: 몸이 약을 흡수 · 분포 · 대사 · 배설하는 과정)예요. Cmax 는 가장 높은 혈중 농도, Tmax 는 그때까지 걸린 시간이에요. 반감기는 농도가 절반으로 줄어드는 시간, AUC 는 곡선 아래 넓이로 몸이 약에 노출된 총량이에요.',
    ae: '이상사례 표는 증상을 몸의 기관별로 묶어 군마다 몇 명에게 생겼는지 보여 줘요. 등급은 CTCAE(이상사례가 얼마나 심한지 1~5 등급으로 매기는 기준)를 따라요. SAE(중대한 이상사례: 입원 · 생명 위협 등)와 DLT(용량 제한 독성: 용량을 더 올리지 못하게 하는 독성)를 먼저 보세요.',
    aeRule: '판정 기준 — 1상은 계획 용량 군의 DLT 가 그 군 인원의 1/3 을 넘거나 심각한 안전 신호가 있으면 보류예요. 3상은 약 군의 SAE 비율이 대조군보다 10%p 넘게 높으면 보류예요.',
    primary: '군별 평균과 대조군과의 차이예요. 차이의 95% 신뢰구간(같은 방법으로 여러 번 시험하면 100번 중 약 95번은 진짜 값을 품는 범위)이 0 을 포함하지 않으면 p < 0.05 와 같은 뜻이에요. 차이가 좋은 방향이고 p < 0.05 이면 효과가 있다고 판단해요. 그래도 우연일 가능성이 완전히 사라진 것은 아니에요.',
    primaryPhase1: '1상은 군끼리 통계 비교(차이 · p 값)를 하지 않아요. 용량이 올라갈수록 이상사례 비율이 어떻게 변하는지 보세요.',
    p: 'p 값(약에 효과가 전혀 없다고 할 때 이만큼 또는 더 큰 차이가 우연히 나올 확률)',
    timecourse: '시간 경과 그래프는 0주부터 1차 평가 주차까지 군별 평균이 어떻게 변했는지 보여 줘요. 계획 용량 군과 대조군의 간격이 벌어지는지 보세요.',
    responder: '반응률은 미리 정한 만큼 좋아진 참여자의 비율(%)이에요. 군끼리 견줘 보세요.',
    subgroup: '하위군(나이 · 성별 · 중증도 등으로 나눈 작은 집단) 분석이에요. 숲 그림(집단별 차이와 95% 신뢰구간을 나란히 그린 그림)으로 효과가 고르게 나타나는지 봐요. 하위군은 인원이 적어 구간이 넓어요.',
    survival: '무진행 생존(PFS: 암이 더 나빠지지 않고 살아 있는 상태) 곡선이에요. 시간이 지날수록 그 상태인 사람의 비율이 줄어요. 약 군의 곡선이 대조군(표준 치료)보다 위에 오래 머물수록 좋아요.',
    demographics: '참여자의 평균 나이(± 표준편차)와 여성 비율이에요. 무작위 배정이 잘 되면 군끼리 비슷해요.',
  },
  /** 중도 탈락 이유(CONSORT · 표). */
  dropReason: { adverse_event: '이상사례', lost_to_followup: '추적 소실', withdrew_consent: '동의 철회', lack_of_efficacy: '효과 부족', protocol_deviation: '계획 위반', other: '기타' } as Record<DropoutReason, string>,
  /** 이상사례 기관계 이름. */
  aeSystem: {
    cardiac: '심장', hepatic: '간', gastrointestinal: '위장관', nervous: '신경', skin: '피부', general: '전신', musculoskeletal: '근골격', respiratory: '호흡기', blood: '혈액', metabolic: '대사', psychiatric: '정신', infection: '감염',
  } as Record<AeSystem, string>,
  routes: {
    first: '1상 모집 시작',
    next: '{phase} 모집 시작',
    same: '같은 프로토콜로 다시',
    amend: '용량 · 제형 바꾸기(IND 변경)',
    backup: '백업 후보로 교체(새 IND)',
  } as Record<TrialRoute, string>,
  routeWhy: {
    same: '운이 나빴다고 볼 때 골라요. 예상치(E · S)는 참고 기준을 넘는데 흔들림이나 탈락 때문에 보류됐을 때예요. 참여자를 처음부터 다시 모으고, 시작할 때 상 비용을 다시 내요.',
    amend: '용량이 높아 안전이 걸렸거나 흡수가 문제일 때 골라요. 바꾸는 수수료와 기다림은 없어요. 그 제형의 MRSD(사람에게 처음 줄 수 있는 최대 권장 시작 용량) 이하이면서 안전 S 가 35 이상인 조합만 고를 수 있어요.',
    backup: '분자 자체가 문제일 때 골라요. 수수료 {fee}를 내고 {waitDays}게임 일 심사를 기다린 뒤 1상부터 다시 해요.',
  },
  resetsToPhase1: '제형을 바꾸거나 1상에서 확인한 용량보다 올리면 1상(안전)부터 다시 해요.',
  backupDoseFit: '지금 용량이 백업 후보의 MRSD 를 넘으면, 넘지 않는 가장 높은 용량으로 맞춰요.',
  bountyIntro: '보류 원인을 맞게 분석하면 낸 상 비용의 {rate}%를 돌려받아요. 모집 투자에 쓴 돈은 돌려받지 않아요.',
  bountyRetryRule: '틀리면 힌트가 나오고, {sec}초 뒤에 다시 낼 수 있어요.',
  bountyText: '결과의 숫자를 근거로 무엇이 문제였고 다음에 무엇을 바꿀지 써 주세요({min}~{max}자).',
  bountyOk: '분석이 맞았어요. {crista}를 돌려받았어요.',
  bountyNo: '아직 맞지 않아요. 힌트를 보고 {sec}초 뒤에 다시 내 보세요.',
  bountyOperational: '운영 문제(모집 · 탈락)로 보류된 시험은 바운티 대상이 아니에요.',
  bountyQ: { axis: 'Q1. 어느 쪽이 기준에 못 미쳤나요?', factors: 'Q2. 원인이 된 요인을 모두 고르세요.', remedy: 'Q3. 다음에 무엇을 바꿀지 하나 고르세요.' },
  locked: '3.3 에서 IND(임상시험 계획 승인 신청)가 승인되면 열려요.',
  done: '3상까지 통과했어요. 이제 4.2 최종 허가로 가요.',
  axisLabel: { safety: '안전성(S)이 기준 미달', efficacy: '효능(E)이 기준 미달', both: '효능 · 안전성 둘 다 기준 미달' } as Record<string, string>,
  /** 시안 7.xx 그림 — 제목 · 읽는 법. */
  viz: {
    hurdle: { title: '세 관문 허들', read: '1상 · 2상 · 3상의 참고 기준을 높이가 다른 허들로 그리고, 우리 약의 E · S 막대가 넘는지 봐요(1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45 그리고 S ≥ 55). 관문이 올라갈수록 기간과 비용이 두 배씩 커져요.' },
    fork: { title: '보류 뒤 갈림길', read: '보류 뒤 고를 수 있는 세 경로의 비용 · 기간을 나란히 놓아요. 원인을 찾아 바꾸면 무작정 다시 할 때보다 통과 가능성이 커져요. 경로마다 드는 돈과 시간이 다르니 함께 견줘 보세요.' },
    gantt: { title: '임상 간트', read: 'IND 승인부터 모집 · 1상 · 2상 · 3상 · 재시험까지를 날짜 눈금 위 막대로 그렸어요. 3상 한 번({days}게임 일)이 가장 길어요. 보류 한 번은 다시 모으는 기간과 그 상 기간만큼 일정을 늘려요.' },
    funding: { title: '연구비 계단', read: '임상을 시작할 때와 모집에 돈을 쓸 때마다 연구비가 계단처럼 내려가요. 연구비 대부분이 임상에서 쓰인다는 것을 볼 수 있어요.' },
    patients: { title: '환자 수 아이콘', read: '아이콘 하나가 {per}명이에요. 단계가 오를수록 사람이 많아지고, 사람이 많을수록 결과가 덜 흔들려요.' },
  },
  /** 서버가 학생에게 돌려주는 오류 · 막음 문구. */
  err: {
    workerDown: '계산 워커에 닿지 않아 물성을 읽지 못했어요. 잠시 뒤 다시 해 주세요.',
    notFound: '임상 시도를 찾지 못했어요.',
    badRoute: '고를 수 있는 경로가 아니에요.',
    badForm: '제형은 경구 · 정맥주사 · 경피 패치 중 하나예요.',
    badDose: '용량은 10 · 50 · 100 mg 중 하나예요.',
    noBackup: '3.2 에서 동물실험을 끝낸 백업 특허가 없어요.',
    patentInactive: '후보 특허가 유효하지 않아요(3.1).',
    targetChanged: '표적이 바뀌었어요. 화면을 다시 열어 주세요.',
    liveExists: '이미 진행 중인 임상 시도가 있어요.',
    firstOpened: '1상은 이미 열었어요.',
    needPass: '앞 상을 통과해야 다음 상을 열 수 있어요.',
    needHeldSame: '보류된 상만 다시 할 수 있어요.',
    needHeldAmend: '보류된 상에서만 용량 · 제형을 바꿀 수 있어요.',
    sameCombo: '지금과 같은 조합이에요.',
    badCombo: '바꿀 수 없는 조합이에요.',
    noAmend: '바꿀 수 있는 용량 · 제형 조합이 없어요(MRSD · 경피 적합 · S ≥ 35).',
    overMrsd: '그 제형의 MRSD({cap} mg)를 넘어요.',
    noMrsd: '동물실험 MRSD 가 없어서 같은 제형에서 더 낮은 용량으로만 바꿀 수 있어요.',
    transdermalUnsuitable: '이 분자는 피부를 잘 통과하지 못해 경피 패치로 쓸 수 없어요.',
    safetyMin: '안전 S {s}가 {min} 보다 낮아요 — IND 기준을 넘지 못해요.',
    needHeldBackup: '보류된 뒤에만 후보를 바꿀 수 있어요.',
    backupSame: '백업 후보가 지금 후보와 같아요.',
    backupMrsd: '백업 후보의 {form} MRSD 가 너무 낮아 고를 수 있는 용량이 없어요.',
    justOpened: '모둠원이 방금 임상 시도를 열었어요.',
    badTier: '모집 투자 단계는 기본 · 확대 · 집중 중 하나예요.',
    tierNotRecruiting: '모집 중일 때만 바꿀 수 있어요.',
    noFunds: '연구비가 모자라요.',
    alreadyStarted: '모둠원이 방금 임상을 시작했어요.',
    bountyChoices: 'Q1 · Q2 · Q3 를 선택지 안에서 골라 주세요.',
    bountyLength: '분석 글은 {min}~{max}자예요.',
    bountyInjection: '분석 글에 지시문 같은 문장이 있어요. 분석만 써 주세요.',
    bountyNotHeld: '보류된 시도만 원인 분석을 낼 수 있어요.',
    bountyClaimed: '이 시도의 바운티는 이미 받았어요.',
    bountyWait: '{sec}초 뒤에 다시 낼 수 있어요.',
  },
  /** 화면 낱말(s41.tsx · s41-charts.tsx). */
  ui: {
    loading: '불러오는 중…',
    lockedTitle: '🔒 잠긴 단계',
    lockedPatients: '환자 수 — 상마다 커져요',
    notesTitle: '모둠 공유 — 연구 노트 초안',
    openHint: '모집은 기본(추가 비용 없음)으로 시작해요. 모집 탭에서 투자 단계를 바꾸면 빨라져요. 시작(상 비용)은 최소 인원이 모인 뒤에 해요.',
    tabSubAttempt: '{phase} {n}회',
    tabSubRecruit: '{n}/{target}명',
    tabSubPending: '판정 대기',
    tabSubRetry: '3경로 · 바운티',
    pass: '통과',
    held: '보류',
    // ① 프로토콜
    phaseQs: '상마다 묻는 것',
    protocolNow: '지금 프로토콜',
    protocolFromInd: 'IND 승인서',
    dlCandidate: '후보',
    dlFormDose: '제형 · 용량',
    dlPopulation: '환자군',
    dlEndpoint: '1차 평가지표',
    dlMrsd: 'MRSD(3.2)',
    backupOf: '백업 {code}',
    healthyPopulation: '건강한 성인 지원자(1상)',
    endpointPhase1Short: '이상사례 · 용량 제한 독성(1상 = 안전)',
    armsCaption: '군 구성',
    thArm: '군',
    thDose: '용량',
    thShare: '배정',
    thTarget: '목표 인원',
    // ② 모집
    recruitEmpty: '모집을 시작하면 규칙이 계산한 모집 속도가 여기 보여요.',
    noRecruiting: '지금 모집 중인 시험이 없어요. ① 프로토콜에서 모집을 시작해요.',
    speedTitle: '모집 속도는 이렇게 정해져요',
    speedSub: '앞 단계 계산값',
    speedBars: '모집 속도 배율',
    screenFail: '선별(참여 조건에 맞는 사람을 고르는 검사)에서 약 {screenFailPct}%가 떨어지고, 약 {dropoutPct}%가 시험 도중에 그만둘(탈락) 것으로 예상해요. 기본 단계의 하루 모집은 {perDay}명이에요.',
    powerCurve: '검정력 곡선',
    powerSub1: '이상사례 감지력',
    powerSub23: '효과를 찾아낼 확률',
    recruitTitle: '{phase} 모집 — {n} / {target}명',
    perDay: '하루 {n}명',
    recruitDone: '모집 끝',
    recruitBar: '모집 인원',
    indAmendWait: '백업 후보로 바꾼 뒤에는 새 IND 심사가 끝나는 D+{fromDay}부터 모집이 시작돼요.',
    tierTitle: '모집 투자 단계',
    tierSub: '모둠 공유 · 언제든 바꿔요',
    tierSpeed: '속도 ×{speed}',
    tierEta: '하루 {perDay}명 · 목표까지 {daysLeft}게임 일',
    tierEtaCost: '하루 {perDay}명 · 목표까지 {daysLeft}게임 일 · {costLeft}',
    tierSpent: '지금까지 모집에 쓴 돈: {spent}',
    // ③ 시작 · 진행
    gaugeTitle: '검정력 게이지',
    gaugeSub: '{n}명 기준',
    gaugeEmpty: '모집 중인 시험이 있을 때 보여요.',
    gauge1: '이상사례 감지력',
    gauge23: '검정력',
    shakeTitle: '흔들림 — 인원이 적으면 커져요',
    startPanel: '시작 · 진행',
    noRunning: '지금 진행 중인 시험이 없어요.',
    startTitle: '[{phase} 시작]',
    startNow: '지금 {n}명 · 검정력 {power} · 비용 {cost} · {days}게임 일',
    startBtn: '임상 시작',
    startConfirmTitle: '{phase} 시작',
    startConfirmBtn: '시작하기',
    runningTitle: '{phase} 진행 중 — {n}명',
    startedBy: '{name} 시작',
    runBar: '시험 진행률',
    monitorLabel: '중간 안전성 모니터링',
    // ④ 결과 · 분석
    resultPanel: '결과 · 분석',
    resultLater: '결과는 상 기간이 끝나는 날 공개돼요.',
    noResult: '아직 공개된 결과가 없어요.',
    pickLabel: '볼 시험',
    summaryCaption: '판정 요약',
    rowEnrolled: '등록 · 완료',
    rowEnrolledVal: '{n}명 · {completed}명',
    rowPrimary: '1차 평가지표',
    higherBetter: '높을수록 좋음',
    lowerBetter: '낮을수록 좋음',
    rowDiff: '계획 용량 − 대조',
    sig: '✓ 유의',
    notSig: '✕ 유의하지 않음',
    rowSae: '중대한 이상사례',
    rowDlt: '용량 제한 독성',
    rowPeople: '참여자',
    rowPeopleVal: '평균 {age}세(±{sd}) · 여성 {female}%',
    analysis: '판정 풀이',
    rec: '다음에 할 일',
    consortTitle: 'CONSORT 흐름도',
    primaryTitle: '1차 평가지표 — 군별 평균과 95% 신뢰구간',
    aeTitle: '이상사례',
    aeCaption: '이상사례 표',
    thAe: '기관계 · 이상사례',
    thGrade: '등급',
    dropLine: '중단 이유: {list}',
    none: '없음',
    timeTitle: '시간 경과',
    forestTitle: '숲 그림 — 하위군',
    pkTitle: 'PK 곡선 — 몸속 농도',
    survivalTitle: '생존(무진행) 곡선',
    responseTitle: '반응률',
    responseBars: '군별 반응률',
    // ⑤ 재도전
    noHeld: '보류된 시험이 없어요.',
    retryPanel: '재도전',
    heldTitle: '{phase} 보류 — {kind}',
    forkAmendSub: 'MRSD 이하 조합 · 아래 표',
    forkSameSub: '{phase} 새 참여자',
    forkBackupSub: '{code} · 수수료 {fee} · {days}게임 일 심사 · 1상부터',
    heldRecTitle: '보류한 시험의 권고',
    amendCaption: '바꿀 수 있는 제형 · 용량',
    thPick: '고르기',
    thFormDose: '제형 · 용량',
    thRule: '규칙',
    amendOkReset: '✓ · 1상부터',
    amendGo: '이 조합으로 다시 모집',
    backupConfirm: '교체하기',
    backupWait: '{code} · {days}게임 일 IND 변경 심사 뒤 1상 모집',
    backupFee: '수수료 {fee} · {days}게임 일 뒤부터 모집',
    bountyTitle: '실패 바운티',
    bountyFormTitle: '실패 바운티 — 원인 분석',
    bountyMax: '최대 {crista}',
    notEligible: '바운티 대상이 아니에요.',
    bountySubmit: '원인 분석 내기',
    bountyRetryIn: '{sec}초 뒤 다시',
    nextStep: '다음 단계로 — 4.2 최종 허가 →',
    // 그림(s41-charts.tsx)
    today: '오늘 D+{day}',
  },
} as const;

/** 자리표시자 채우기 — `{name}` → 값. */
export const fillCopy = (text: string, values: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
