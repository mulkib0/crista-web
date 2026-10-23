/**
 * 2.1 결과 읽기 · 2.2 대기열 / 2.2 리드 읽기 · 특허 후보 규격(설계 §5.6 · §5.7 · §6.3 · §7.3) — 기능 FSEL.
 *
 * - 근거 칩 판정(`dockReasonVerdict` · `candidateReasonVerdict`)은 **브라우저 · 서버가 같은 함수**를 쓴다(§7.4 ⑧ 과 같은 꼴 — 막음이면 서버도 400).
 *   판정 재료(`DockReasonFacts` · `CandidateReasonFacts`)는 서버가 만든 값(ΔG · 결합력 p · 출신 · 물성 신호 · E · S)만 쓴다.
 * - 수심계 이정표는 숫자 두 개(라이브러리 가운데값 · 1위 ΔG)만 — 1위 분자 이름 · 분자별 사전 Vina 값은 내려보내지 않는다(§5.5.1).
 * - 효능 E · 안전 S 는 서버가 game-rules `scoreCandidate`(crista 와 같은 함수)로 계산해 '흔들림 전 예상치'로 내려 준다.
 * - 학생에게 보이는 글은 `SELECTION_COPY` 한곳에 모았다(§5.12 — Gemini 초안을 Claude 가 검토해 반영). 식별자 · 숫자 · 규칙 값은 SELECTION_COPY 밖.
 * 표: web.dock_picks · lead_candidates(0006). 2.2 ADMET 실행은 대기열(dock_picks)에 있는 분자만(서버 `onJobAdmit('2.2')`).
 */
import type { DoseMg, Formulation, MoleculeProperties, PropertySignals } from '@crista/shared-types';
import { reasonBlock, reasonOk, reasonWarn, type ReasonVerdict } from './review.ts';
import type { Avatar } from './rules.ts';

// ── 상한 · 규칙 값 ──

/** 2.1 → 2.2 대기열 — 1인 2개 · 모둠 최대 8개(기준 약은 넣지 않는다 — 2.2 표에 비교용으로 자동). */
export const DOCK_PICKS_PER_PERSON = 2;
export const DOCK_PICKS_PER_TEAM = 8;

/** 2.2 특허 후보 — 1인 1개(모둠이 2명 이하면 2개) · 모둠 최대 4개. */
export const LEAD_CANDIDATES_PER_TEAM = 4;
export const leadCandidatesPerPerson = (teamMembers: number): 1 | 2 => (teamMembers <= 2 ? 2 : 1);

/** 10배 계단(3.07) — ΔG 가 1.364 kcal/mol 더 음수일 때마다 필요한 양이 10배 준다(298 K, RT ln 10). */
export const KCAL_PER_DECADE = 1.364;
export const foldFromDeltaDeltaG = (ddg: number): number => 10 ** (ddg / KCAL_PER_DECADE);
/** 해리 상수 Kd(M) — ΔG = RT ln Kd(298 K). 10배 계단 그림의 세로축. */
export const RT_KCAL = 0.0019872 * 298;
export const kdFromKcal = (kcal: number): number => Math.exp(kcal / RT_KCAL);

/**
 * 수심계(3.05) 이정표 '히스타민 — 작아서 헐렁한 분자'(설계 §5.6 표). 라이브러리 가운데값 · 1위와 달리 이름이 붙은 교육용 기준점이라
 * 그 한 분자의 사전 Vina 값만 서버가 숫자로 준다(1.2 쇼핑 진열의 답이 되지 않는 아주 약한 분자).
 */
export const HISTAMINE_COMPOUND_ID = 'CHEMBL90';

/** W3 리드 · 백업을 0006 이 특허 후보로 옮긴 행의 근거 키. */
export const LEGACY_LEAD_REASONS = ['legacy_lead', 'legacy_backup'] as const;

/** 2.2 비교 · 점수 분해 사슬의 기본 칸 — 경구 50 mg(§5.7 '신호등 표' · 근거 칩 'IND 안전 기준'). */
export const BASE_FORM: Formulation = 'oral';
export const BASE_DOSE: DoseMg = 50;
export const SCORE_FORMS: readonly Formulation[] = ['oral', 'iv', 'transdermal'];
export const SCORE_DOSES: readonly DoseMg[] = [10, 50, 100];

/**
 * 물성 레이더(4.02) 6축 — 먹는 약이 흔히 있는 띠(참고 범위, SwissADME Bioavailability Radar 식).
 * `min` · `max` 는 그림 눈금, `lo` · `hi` 는 띠. 띠 밖 축 수가 근거 칩 '레이더가 띠 안' 판정 재료다.
 */
export type RadarAxisKey = 'clogp' | 'mw' | 'tpsa' | 'rotb' | 'hbd' | 'hba';
export const RADAR_AXES: ReadonlyArray<{ key: RadarAxisKey; min: number; max: number; lo: number; hi: number; digits: number }> = [
  { key: 'clogp', min: -2, max: 6, lo: -0.7, hi: 5, digits: 2 },
  { key: 'mw', min: 0, max: 620, lo: 150, hi: 500, digits: 1 },
  { key: 'tpsa', min: 0, max: 160, lo: 20, hi: 130, digits: 1 },
  { key: 'rotb', min: 0, max: 12, lo: 0, hi: 9, digits: 0 },
  { key: 'hbd', min: 0, max: 8, lo: 0, hi: 5, digits: 0 },
  { key: 'hba', min: 0, max: 14, lo: 0, hi: 10, digits: 0 },
];

/** 띠를 벗어난 축(그림 순서). */
export function radarOutside(props: Pick<MoleculeProperties, RadarAxisKey>): RadarAxisKey[] {
  return RADAR_AXES.filter((ax) => props[ax.key] < ax.lo || props[ax.key] > ax.hi).map((ax) => ax.key);
}

// ── 출신 · 이미 알려진 물질 ──

/**
 * 분자의 출신(점수 카드 3.09) — 데이터셋 `targetId` · ChEMBL 기전. 변형체는 맨 처음 부모의 출신 + `variant`.
 * 'this' = 이 표적을 겨냥해 만든 계열 · 'other' = 다른 표적 · 다른 병의 약 · 'unknown' = 라이브러리에 없는 분자(직접 그린 분자).
 */
export type OriginKind = 'this' | 'other' | 'unknown';
export interface MoleculeOrigin {
  kind: OriginKind;
  /** 원래 겨냥한 표적(데이터셋 `targetId` — 이 저장소의 4대 표적만 있다). */
  targetId: string | null;
  /** 원래 기전 · 쓰임(ChEMBL 기전 · 사내 후보 설명). 'MOL' 같은 빈 값은 null. */
  mechanism: string | null;
  library: string | null;
  compoundId: string | null;
  /** 같은 계열 비교용 — 맨 처음 조상의 라이브러리 id(없으면 맨 처음 조상 작업 id). */
  family: string;
  variant: boolean;
}

/** 이미 알려진 물질(공지 물질) — 'ChEMBL 승인약' · 'ZINC 소형' · 기준 리간드. 특허를 받으려면 구조를 바꿔야 한다(§5.8 심사 2번). */
export type KnownWhy = 'approved' | 'zinc' | 'reference';
export const KNOWN_LIBRARIES: Readonly<Record<string, KnownWhy>> = { 'ChEMBL 승인약': 'approved', 'ZINC 소형': 'zinc' };

// ── 근거 칩 — 2.1 → 2.2 대기열(§5.6) ──

export type DockReason = 'stronger_than_ref' | 'within_10x' | 'target_series' | 'p_mid' | 'improved_variant' | 'different_series';
export const DOCK_REASONS: readonly DockReason[] = ['stronger_than_ref', 'within_10x', 'target_series', 'p_mid', 'improved_variant', 'different_series'];

export interface DockReasonFacts {
  kcal: number;
  referenceKcal: number;
  /** 결합력 p(서버가 game-rules `affinityStrength` 로). */
  p: number;
  origin: Pick<MoleculeOrigin, 'kind' | 'variant' | 'family' | 'library'>;
  /** 변형체면 바로 위 부모의 ΔG. */
  parentKcal: number | null;
  /** 대기열에 이미 있는 **다른** 분자들의 계열 · 라이브러리. */
  queue: Array<{ family: string; library: string | null }>;
}

/** 경계 비교는 1/1000 kcal 단위 정수로(부동소수 경계 오차 제거 — ΔG 는 소수 둘째 자리 값). */
const milli = (v: number): number => Math.round(v * 1000);
const kc = (v: number): string => (v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2));
/** 차이의 크기(양수 · 소수 둘째 자리) — '약해요' · '깊어요' 문구에 넣는다. */
const mag = (v: number): string => Math.abs(v).toFixed(2);
const fold = (ddg: number): string => {
  const f = foldFromDeltaDeltaG(ddg);
  return f >= 100 ? f.toFixed(0) : f >= 10 ? f.toFixed(1) : f.toFixed(2);
};

export function dockReasonVerdict(reason: string, f: DockReasonFacts): ReasonVerdict {
  const C = SELECTION_COPY.dockVerdict;
  switch (reason as DockReason) {
    case 'stronger_than_ref': {
      // gap > 0 = 기준 약보다 얕음(약함). 문구에는 늘 양수 크기(`mag`)를 넣고 방향은 문구가 말한다.
      const gap = f.kcal - f.referenceKcal;
      return milli(gap) <= 0 ? reasonOk(C.strongerOk(kc(f.kcal), kc(f.referenceKcal))) : reasonBlock(C.strongerBlock(mag(gap), fold(gap)));
    }
    case 'within_10x': {
      const gap = f.kcal - f.referenceKcal;
      if (milli(gap) < 0) return reasonOk(C.within10OkStronger(mag(gap)));
      return milli(gap) <= milli(KCAL_PER_DECADE) ? reasonOk(C.within10Ok(mag(gap))) : reasonBlock(C.within10Block(mag(gap), fold(gap)));
    }
    case 'target_series':
      return f.origin.kind === 'this' ? reasonOk(C.seriesOk(f.origin.variant)) : reasonBlock(f.origin.kind === 'other' ? C.seriesOther : C.seriesUnknown);
    case 'p_mid':
      return f.p >= 0.5 ? reasonOk(C.pOk(f.p.toFixed(2))) : reasonBlock(C.pBlock(f.p.toFixed(2)));
    case 'improved_variant':
      if (!f.origin.variant || f.parentKcal === null) return reasonBlock(C.variantNot);
      return milli(f.kcal) < milli(f.parentKcal) ? reasonOk(C.variantOk((f.parentKcal - f.kcal).toFixed(2))) : reasonBlock(C.variantWorse(kc(f.kcal), kc(f.parentKcal)));
    case 'different_series': {
      if (f.queue.length === 0) return reasonOk(C.diffFirst);
      if (f.queue.every((q) => q.family === f.origin.family)) return reasonWarn(C.diffSameParent);
      if (f.origin.library && f.queue.every((q) => q.library === f.origin.library)) return reasonWarn(C.diffSameLibrary(f.origin.library));
      return reasonOk(C.diffOk);
    }
    default:
      return reasonBlock(SELECTION_COPY.unknownReason);
  }
}

// ── 근거 칩 — 2.2 특허 후보(§5.7) ──

export type CandidateReason = 'herg_low' | 'liver_low' | 'oral_good' | 'brain_ok' | 'radar_in_band' | 'ind_safe' | 'top_efficacy';
export const CANDIDATE_REASONS: readonly CandidateReason[] = ['herg_low', 'liver_low', 'oral_good', 'brain_ok', 'radar_in_band', 'ind_safe', 'top_efficacy'];
/** 뇌 칩은 CNS 표적에만 보인다(§5.7). */
export const candidateReasonsFor = (cns: boolean): CandidateReason[] => CANDIDATE_REASONS.filter((r) => cns || r !== 'brain_ok');

export interface CandidateReasonFacts {
  /** 물성을 읽지 못했으면 null — 판정은 막음. */
  signals: PropertySignals | null;
  radarOut: number;
  /** 경구 50 mg 예상 E · S(흔들림 전). */
  efficacy: number | null;
  safety: number | null;
  /** 모둠 2.2 결과(기준 약 제외) 중 가장 큰 예상 E. */
  bestEfficacy: number | null;
  cns: boolean;
  /** IND 기준 S(game-rules PIPELINE_RULES.thresholds.ind.safety — 서버가 넣는다). */
  indSafetyMin: number;
}

export function candidateReasonVerdict(reason: string, f: CandidateReasonFacts): ReasonVerdict {
  const C = SELECTION_COPY.leadVerdict;
  if (!(CANDIDATE_REASONS as readonly string[]).includes(reason)) return reasonBlock(SELECTION_COPY.unknownReason);
  const s = f.signals;
  if (!s) return reasonBlock(C.noProps);
  const level3 = <T extends string>(v: T, good: T, mid: T, okMsg: string, warnMsg: string, blockMsg: string) =>
    v === good ? reasonOk(okMsg) : v === mid ? reasonWarn(warnMsg) : reasonBlock(blockMsg);
  switch (reason as CandidateReason) {
    case 'herg_low':
      return level3(s.herg, 'low', 'moderate', C.hergOk, C.hergWarn, C.hergBlock);
    case 'liver_low':
      return level3(s.hepatotoxicity, 'low', 'moderate', C.liverOk, C.liverWarn, C.liverBlock);
    case 'oral_good':
      return level3(s.oralAbsorption, 'good', 'moderate', C.oralOk, C.oralWarn, C.oralBlock);
    case 'brain_ok':
      if (!f.cns) return reasonBlock(C.brainNotCns);
      return level3(s.bbb, 'high', 'moderate', C.brainOk, C.brainWarn, C.brainBlock);
    case 'radar_in_band':
      return f.radarOut === 0 ? reasonOk(C.radarOk) : f.radarOut === 1 ? reasonWarn(C.radarWarn) : reasonBlock(C.radarBlock(f.radarOut));
    case 'ind_safe':
      if (f.safety === null) return reasonBlock(C.noProps);
      return f.safety >= f.indSafetyMin ? reasonOk(C.indOk(f.safety.toFixed(1), f.indSafetyMin)) : reasonBlock(C.indBlock(f.safety.toFixed(1), f.indSafetyMin));
    case 'top_efficacy':
      if (f.efficacy === null || f.bestEfficacy === null) return reasonBlock(C.noProps);
      return f.efficacy >= f.bestEfficacy ? reasonOk(C.topOk(f.efficacy.toFixed(1))) : reasonBlock(C.topBlock(f.efficacy.toFixed(1), f.bestEfficacy.toFixed(1)));
  }
}

// ── 화면 모양 ──

export interface PersonRef {
  userId: string;
  byName: string;
  avatar: Avatar | null;
}

/** 2.1 모둠이 도킹한 분자(성공한 작업만 · 지금 표적 버전). */
export interface DockedView extends PersonRef {
  jobId: string;
  label: string | null;
  smiles: string;
  kcal: number;
  /** 결합력 p(0~1). */
  p: number;
  parentJobId: string | null;
  parentLabel: string | null;
  parentKcal: number | null;
  origin: MoleculeOrigin;
  known: KnownWhy | null;
  /** 기준 리간드와 같은 분자 — 대기열에 넣지 않는다. */
  isReference: boolean;
  /** 모둠 도킹 순위(1 = 가장 깊음). */
  rank: number;
  /** 이미 이 분자로 돌린 2.2 작업(queued · running · succeeded). */
  admetJobId: string | null;
}

export interface PickView extends PersonRef {
  jobId: string;
  slot: 1 | 2;
  reason: string;
  createdAt: string;
}

export interface LeadCandidateView extends PickView {
  known: boolean;
}

/** 수심계(3.05) 이정표 — 숫자만(분자 이름 · 분자별 사전 값 없음). */
export interface GaugeView {
  referenceKcal: number;
  /** p = 0 선(기준 + 4.5) · p = 1 선(기준 − 0.5). */
  p0Kcal: number;
  p1Kcal: number;
  /** 라이브러리 가운데값 · 1위 ΔG — 워커에 닿지 않으면 null. */
  medianKcal: number | null;
  topKcal: number | null;
  /** 가운데값을 낸 분자 수(사전 도킹 값이 있는 것). */
  libraryCount: number;
  /** 히스타민(작아서 헐렁한 분자) 사전 ΔG — 라이브러리에 없으면 null. */
  histamineKcal: number | null;
}

/** 2.1 '찜 회고' 줄(§5.5.1) — 찜마다 우리 도킹 ΔG · 라이브러리 순위 · 근거 + 한 줄 비교(사전 계산 평균 두 개). */
export interface RetroView {
  rows: Array<PersonRef & { compoundId: string; name: string; reason: string; dockedKcal: number | null; rank: number | null }>;
  /** 순위를 매긴 분자 수. */
  of: number;
  /** 찜 수(= 비교한 상위 n). */
  n: number;
  /** 사전 계산 Vina 평균 — 우리 찜 · 1.2 결합 예측 상위 n개. */
  ourMeanKcal: number | null;
  topMeanKcal: number | null;
}

export interface ScoreCell {
  form: Formulation;
  dose: DoseMg;
  efficacy: number;
  safety: number;
  /** R = 1 + herg + liver(몸속 여행 지도 4.04 가 심장 · 간에서 깎이는 양을 따로 적는다). */
  inputs: { p: number; A: number; B: number; De: number; Dt: number; R: number; K: number; herg: number; liver: number };
}

/** 2.2 ADMET 를 본 분자 한 줄(기준 약 줄도 같은 모양 — `isReference`). */
export interface AdmetView extends PersonRef {
  /** 기준 약 줄은 null. */
  jobId: string | null;
  dockingJobId: string | null;
  label: string | null;
  smiles: string;
  kcal: number;
  p: number;
  /** 워커 RDKit 물성 — 닿지 않으면 null(도구가 '읽지 못했어요'). */
  props: MoleculeProperties | null;
  signals: PropertySignals | null;
  /** 신호마다 근거 한 줄(game-rules `signalNotes`). */
  notes: Record<keyof PropertySignals, string> | null;
  radarOut: RadarAxisKey[];
  /** 제형 3 × 용량 3 — 흔들림 전 예상치. */
  scores: ScoreCell[];
  origin: MoleculeOrigin;
  known: KnownWhy | null;
  isReference: boolean;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  /** ADMET-AI 레이더(참고) — 판정에 쓰지 않는다. */
  aiRadar: Array<{ axis: string; score: number; verdict: string }>;
}

export interface SelectionResponse {
  revisionId: string;
  targetId: string | null;
  cns: boolean;
  members: number;
  limits: { dockPerPerson: number; dockPerTeam: number; leadPerPerson: number; leadPerTeam: number };
  indSafetyMin: number;
  gauge: GaugeView | null;
  docked: DockedView[];
  picks: PickView[];
  retro: RetroView | null;
  admet: AdmetView[];
  reference: AdmetView | null;
  candidates: LeadCandidateView[];
}

export interface DockPickRequest {
  dockingJobId: string;
  reason: DockReason;
}
export interface LeadCandidateRequest {
  admetJobId: string;
  reason: CandidateReason;
}

export const SELECTION_API = {
  get: '/api/selection',
  dockPicks: '/api/selection/dock-picks',
  dockPick: (jobId: string) => `/api/selection/dock-picks/${jobId}`,
  leadCandidates: '/api/selection/lead-candidates',
  leadCandidate: (jobId: string) => `/api/selection/lead-candidates/${jobId}`,
} as const;

// ── 학생에게 보이는 글(§5.12 — Gemini 4 Argon (High) 초안 → Claude 검토 · `.review/2026-10-24-copy-2.1-2.2/copy.md`) ──
// 돈 자리표시자(`cost` · `unitCost`)는 `formatCrista` · 웹 `money` 결과(단위 '크리스타'까지 든 글)를 받는다 — 문구에 '크리스타'를 다시 쓰지 않는다.
// ΔG 값은 부호 포함 소수 둘째 자리(`kc`), `gap` 은 늘 양수 크기(방향은 문구가 '약해요' · '깊어요'로 말한다).

const DECADE = KCAL_PER_DECADE.toFixed(2);

export const SELECTION_COPY = {
  unknownReason: '고를 수 있는 근거 칩이 아니에요. 목록에 있는 근거 칩을 하나 골라 주세요.',
  dockReasonLabel: {
    stronger_than_ref: '기준 약보다 단단히 붙어요',
    within_10x: '기준 약과 10배 차이 안이에요',
    target_series: '이 표적을 겨냥해 만든 계열이에요',
    p_mid: '결합력 점수가 중간 이상이에요',
    improved_variant: '구조를 바꿔 더 좋아졌어요',
    different_series: '다른 모둠원과 다른 계열이라서',
  } satisfies Record<DockReason, string>,
  dockVerdict: {
    strongerOk: (dg: string, ref: string) => `내 분자 ΔG(${dg} kcal/mol)가 기준 약(${ref} kcal/mol)보다 깊거나 같아 대기열에 담을 수 있어요.`,
    strongerBlock: (gap: string, n: string) =>
      `기준 약보다 ${gap} kcal/mol 약해요. 10배 계단으로 보면 약 ${n}배 더 높은 농도가 필요해요. 수심계 눈금과 10배 계단을 다시 확인해 보세요.`,
    /** 기준 약보다 얕거나 같을 때(`gap` = 얕은 크기). */
    within10Ok: (gap: string) => `기준 약과 ΔG 차이가 ${gap} kcal/mol로 10배 문턱(${DECADE} kcal/mol) 안이라 담을 수 있어요.`,
    /** 기준 약보다 깊을 때(`gap` = 깊은 크기). */
    within10OkStronger: (gap: string) =>
      `기준 약보다 ${gap} kcal/mol 더 깊어요. 기준 약보다 약하지 않으니 10배 문턱(${DECADE} kcal/mol)에 걸리지 않아 담을 수 있어요.`,
    within10Block: (gap: string, n: string) => `기준 약보다 ${gap} kcal/mol 약해요. 약 ${n}배 차이라 10배(${DECADE} kcal/mol)를 넘어요. 10배 계단을 다시 살펴보세요.`,
    seriesOk: (variant: boolean) =>
      variant ? '이 표적을 겨냥해 만든 분자를 고친 변형체라 담을 수 있어요.' : '이 표적을 겨냥해 만든 분자가 맞아서 담을 수 있어요.',
    seriesOther: '이 분자는 다른 표적 · 다른 병을 겨냥해 만든 약이에요. 점수 카드 도구에서 이 분자의 출신 표시를 다시 확인해 보세요.',
    seriesUnknown: '라이브러리에 없는 분자라 어느 표적 계열에서 왔는지 알 수 없어요. 점수 카드 도구의 출신 칸을 확인하고 다른 근거 칩을 골라 보세요.',
    pOk: (p: string) => `결합력 점수 p가 ${p}로 중간 기준(0.5) 이상이라 담을 수 있어요.`,
    pBlock: (p: string) => `결합력 점수 p가 ${p}로 중간 기준(0.5)보다 낮아요. 수심계 눈금이나 점수 카드에서 p 값을 다시 확인해 보세요.`,
    variantNot: '구조를 고쳐 만든 변형체가 아니에요(부모 분자가 없어요). 점수 카드나 도킹 비교표를 다시 확인해 보세요.',
    variantOk: (gain: string) => `구조를 바꾼 뒤 부모 분자보다 ΔG가 ${gain} kcal/mol 더 깊어져서 담을 수 있어요.`,
    variantWorse: (dg: string, parent: string) =>
      `변형체 ΔG(${dg} kcal/mol)가 부모 분자(${parent} kcal/mol)보다 더 깊어지지 않았어요. 도킹 비교표에서 두 값을 다시 견주어 보세요.`,
    diffFirst: '대기열의 첫 분자라 담을 수 있어요.',
    diffSameParent: '담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 부모 분자 계열이에요. 점수 카드에서 출신과 부모 분자를 한 번 더 확인해 보세요.',
    diffSameLibrary: (lib: string) => `담을 수는 있지만, 대기열에 있는 다른 분자들이 모두 같은 라이브러리(${lib})에서 왔어요. 점수 카드에서 출신을 다시 살펴보세요.`,
    diffOk: '대기열에 다른 계열이 섞여 있어서 담을 수 있어요.',
  },
  leadReasonLabel: {
    herg_low: '심장 위험(hERG)이 낮아요',
    liver_low: '간 위험이 낮아요',
    oral_good: '먹는 약으로 잘 흡수돼요',
    brain_ok: '뇌까지 갈 수 있어요',
    radar_in_band: '레이더가 띠 안에 있어요',
    ind_safe: 'IND 안전 기준을 넘을 것 같아요',
    top_efficacy: '효능이 가장 커요',
  } satisfies Record<CandidateReason, string>,
  leadVerdict: {
    noProps: '물성을 읽지 못해 판정할 수 없어요. 잠시 뒤 다시 해 보세요.',
    hergOk: '심장 hERG 위험 신호가 ‘● 낮음’이라 특허 후보로 올릴 수 있어요.',
    hergWarn: '심장 hERG 위험이 ‘▲ 보통’이에요. 올릴 수는 있어요. 점수 분해 사슬에서 이 위험이 안전 S 를 얼마나 깎는지 확인해 보세요.',
    hergBlock: '심장 hERG 위험이 ‘■ 높음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 심장 칸을 다시 확인해 보세요.',
    liverOk: '간독성 위험 신호가 ‘● 낮음’이라 특허 후보로 올릴 수 있어요.',
    liverWarn: '간독성 위험이 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 간 칸과 점수 분해 사슬을 한 번 더 확인해 보세요.',
    liverBlock: '간독성 위험이 ‘■ 높음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 간 칸을 다시 살펴보세요.',
    oralOk: '경구 흡수 신호가 ‘● 좋음’이라 특허 후보로 올릴 수 있어요.',
    oralWarn: '경구 흡수가 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 장 칸에서 흡수 A가 얼마나 깎이는지 확인해 보세요.',
    oralBlock: '경구 흡수가 ‘■ 나쁨’이라 이 근거로는 올릴 수 없어요. 신호등 표와 점수 분해 사슬에서 다른 제형이나 다른 근거를 찾아보세요.',
    brainNotCns: '지금 우리 모둠의 표적은 중추신경계(CNS — 뇌 · 척수) 표적이 아니에요. 다른 근거 칩을 골라 주세요.',
    brainOk: '뇌 노출 신호가 ‘● 높음’이라 뇌 속 표적까지 닿을 것으로 예측돼요. 특허 후보로 올릴 수 있어요.',
    brainWarn: '뇌 노출이 ‘▲ 보통’이에요. 올릴 수는 있지만 몸속 여행 지도의 뇌 칸과 점수 분해 사슬의 B 값을 다시 확인해 보세요.',
    brainBlock: '뇌 노출이 ‘■ 낮음’이라 이 근거로는 올릴 수 없어요. 신호등 표와 몸속 여행 지도의 뇌 칸을 다시 살펴보세요.',
    radarOk: '물성 레이더 여섯 축이 모두 분홍 띠 안에 들어와 있어서 올릴 수 있어요.',
    radarWarn: '한 축이 분홍 띠를 벗어났지만 올릴 수는 있어요. 물성 레이더에서 어느 축이 벗어났는지 확인해 두세요.',
    radarBlock: (n: number) => `물성 레이더에서 ${n}개 축이 분홍 띠를 벗어났어요. 물성 레이더 도구를 열어 어느 축이 약점인지 다시 살펴보세요.`,
    indOk: (s: string, min: number) =>
      `경구 50 mg 기준 예상 안전 S가 ${s}로 IND(임상시험 계획 승인 신청) 기준(${min}) 이상이라 올릴 수 있어요.`,
    indBlock: (s: string, min: number) =>
      `경구 50 mg 기준 예상 안전 S가 ${s}로 IND 안전 기준(${min})보다 낮아요. 신호등 표나 점수 분해 사슬에서 안전 점수가 깎인 이유를 확인해 보세요.`,
    topOk: (e: string) => `경구 50 mg 기준 예상 효능 E가 ${e}로 우리 모둠 2.2 결과 가운데 1위라 올릴 수 있어요.`,
    topBlock: (e: string, best: string) =>
      `경구 50 mg 기준 예상 효능 E가 ${e}로 우리 모둠 1위(${best})보다 낮아요. 신호등 표에서 모둠 분자들의 E 값을 다시 견주어 보세요.`,
  },
  origin: {
    this: '이 표적을 겨냥해 만든 계열',
    other: '다른 표적 · 다른 병의 약',
    unknown: '출신을 모르는 분자(직접 그린 구조)',
    variant: '변형체(부모 분자에서 구조를 고침)',
  },
  known: {
    chip: '특허 불가 — 변형체 필요',
    approved: '이미 승인된 약(ChEMBL 승인약)',
    zinc: '이미 알려진 물질(ZINC 소형)',
    reference: '기준 리간드(표적 결정구조에 들어 있던 기준 분자)',
    hint: '세상에 이미 알려진 물질이라 그대로는 3.1 물질특허(새로운 화학 물질 자체에 주는 특허)를 받을 수 없어요. 특허를 받으려면 구조를 바꾼 변형체가 필요해요.',
  },
  confirmOther: {
    title: '다른 병을 겨냥한 약이에요',
    body: (rank: number, mech: string) =>
      `도킹 점수는 예측이에요. 이 분자는 원래 ${mech} 약이에요(도킹 ${rank}위). 그래서 우리 표적의 주력 후보가 되기 어려워요. 이미 알려진 물질이라 3.1 물질특허도 받을 수 없어요.`,
    ok: '알고도 대기열에 담기',
  },
  confirmKnown: {
    title: '이미 세상에 알려진 물질이에요',
    body: '이 분자는 이미 알려진 물질(ChEMBL 승인약 · ZINC 소형 · 기준 리간드)이라 그대로는 3.1 물질특허를 받을 수 없어요. 구조를 바꾼 변형체를 함께 준비해 보세요.',
    ok: '알고 담기',
  },
  s21: {
    tabs: { gauge: '수심계 눈금', cards: '점수 카드', stairs: '10배 계단', edit: '구조 바꿔 다시 도킹' },
    gaugeQ: '우리 후보는 점수가 매겨지는 구간(p 0~1) 안에 있나요? 기준 약보다 더 깊은 곳에 있나요?',
    gaugeNote:
      '눈금 아래로 내려갈수록(ΔG 가 더 음수일수록) 표적에 단단히 붙어요. 점선 두 줄(p = 0 선 · p = 1 선) 사이에서만 결합력 점수 p 가 0 에서 1 로 바뀌어요. 우리 모둠원이 도킹한 분자는 담당자 잉크 점으로 찍혀요.',
    gaugeAxis: '결합 자유 에너지 ΔG 세로 눈금 (0 ~ −14 kcal/mol)',
    gaugeLegend: '잉크 점 = 우리 모둠이 도킹한 분자(담당자 색) · 점선 = p = 0 선 · 기준 약 · p = 1 선',
    gaugeDots: (n: number) => `우리 모둠 분자 ${n}개`,
    /** 눈금 아래 풀이 목록(이정표마다 한 줄 — 값은 부호 포함 소수 둘째 자리). */
    gaugeHistamine: (dg: string) => `히스타민 — 작아서 헐렁하게 붙는 분자 (${dg} kcal/mol)`,
    gaugeP0: (p0: string) => `p = 0 선 (${p0} kcal/mol, 기준 + 4.5) — 이보다 얕으면 결합력 점수 0`,
    gaugeMedian: (count: number, median: string) => `이 표적 라이브러리 ${count}종의 가운데값 (${median} kcal/mol)`,
    gaugeRef: (name: string, refDG: string) => `기준 약 ${name} (${refDG} kcal/mol) — 실제 환자에게 쓰이는 약`,
    gaugeP1: (p1: string) => `p = 1 선 (${p1} kcal/mol, 기준 − 0.5) — 이보다 깊으면 결합력 만점`,
    gaugeTop: (count: number, top: string) => `이 표적 라이브러리 ${count}종 중 1위 (${top} kcal/mol)`,
    /** 눈금 그림 안의 짧은 이름표(풀이는 위 목록). */
    gaugeTag: { histamine: '히스타민', p0: 'p = 0 선', median: '라이브러리 가운데값', ref: '기준 약', p1: 'p = 1 선', top: '라이브러리 1위' },
    cardsQ: '도킹 점수는 높은데 원래 다른 병을 고치려고 만든 약은 아닌가요?',
    cardsBand: (rank: number, mech: string) => `도킹 ${rank}위지만 원래 ${mech} 약`,
    cardsStamp: '점수 1위 ≠ 주력 후보',
    stairsQ: 'ΔG 가 0.7 kcal/mol 다르면 주머니 절반을 채우는 농도는 몇 배 달라질까요? ‘조금 약한’ 후보는 농도가 얼마나 더 필요할까요?',
    stairsNote: `실온(298 K, 약 25 °C)에서 ΔG 가 ${DECADE} kcal/mol 더 음수가 될 때마다 표적 주머니 절반을 채우는 데 필요한 농도가 10배 줄어요. '배수 = 10^(ΔΔG ÷ ${KCAL_PER_DECADE})'(ΔΔG = 두 분자의 ΔG 차이)로 기준 약과 몇 배 차이인지 계단에서 읽어 보세요.`,
    stairsAxis: '세로축: 해리 상수 Kd(표적 주머니 절반을 채우는 농도, 로그 눈금)',
    stairsBands: '농도 구간: 몰(M) ~ 밀리몰(mM) · 마이크로몰(µM) · 나노몰(nM) · 피코몰(pM)',
    stairsPick: '기준 약과 견줄 분자',
    /** `gap` 은 양수 크기 — `stronger` 가 방향을 고른다. */
    stairsLine: (gap: string, n: string, stronger: boolean) =>
      stronger
        ? `기준 약보다 ${gap} kcal/mol 더 깊어요. 주머니 절반을 채우는 데 필요한 농도가 약 ${n}배 낮아요.`
        : `기준 약보다 ${gap} kcal/mol 더 얕아요. 주머니 절반을 채우려면 약 ${n}배 더 높은 농도가 필요해요.`,
    edit: {
      chips: ['방향족 아민 → 아세트아마이드', '니트로 → 시아노', '염기성 아민 → 아마이드', '하이드록시 도입', '플루오린 도입', '메톡시 제거'],
      chipsHead: '이렇게 바꿔 볼 수 있어요',
      chipReady: '작용기(분자의 성질을 결정하는 원자 묶음) 칩 자동 변환은 아직 준비 중이에요. 지금은 위 SMILES 칸을 직접 고쳐서 물성 미리보기와 재도킹을 쓸 수 있어요.',
    },
    empty: '아직 도킹을 끝낸 분자가 없어요. 도킹 결과가 나오면 결과 읽기 도구 3종이 열려요.',
    queueTitle: '2.2 대기열',
    queueSub: (n: number, max: number, per: number) => `${n} / ${max}개 · 1인 ${per}개 한도`,
    queueEmpty: '아직 대기열에 담은 분자가 없어요. 왼쪽 결과 읽기 도구 3종으로 살펴보고 근거 칩을 골라 담아 보세요.',
    queueCost: (n: number, cost: string, unitCost: string) => `대기열 ${n}개를 모두 2.2 ADMET 로 보면 예상 비용은 ${cost}예요(분자 1개당 ${unitCost}).`,
    pickLegend: '담는 근거 칩 고르기',
    pickButton: '2.2 대기열에 담기',
    pickFrom: '담을 분자',
    pickRef: '기준 약은 대기열에 넣지 않아도 2.2 표에 비교용으로 자동으로 붙어요(비용 없음).',
    pickMine: (n: number, per: number) => `내가 담은 분자 ${n} / ${per}개`,
    pickLimitOrder: (per: number, max: number) => `한 사람당 ${per}개, 모둠 전체에서 최대 ${max}개까지 담을 수 있어요. 더 담으려면 먼저 담긴 분자를 빼 주세요.`,
    pickLimitMine: (per: number) => `내 몫 ${per}개를 다 담았어요. 바꾸려면 담은 분자 하나를 먼저 빼 주세요.`,
    remove: '빼기',
    retroTitle: '찜 회고',
    retroLine: (n: number, top: string, ours: string) =>
      `1.2 결합 예측 상위 ${n}개를 그대로 찜했다면 평균 ΔG ${top} kcal/mol · 우리 모둠이 찜한 분자 평균 ΔG ${ours} kcal/mol (사전 계산값)`,
    retroRank: (rank: number, of: number) => `${of}개 중 ${rank}위`,
    retroNotDocked: '아직 도킹 안 함',
    retroLegacy: '없음(근거 칩 전 판의 찜)',
    /** 화면 틀 글(s21.tsx) — 패널 제목 · 표 머리 · 단추. */
    ui: {
      loading: '불러오는 중…',
      tabsLabel: '2.1 도구',
      teamTitle: '모둠 공유 — 도킹 비교표 · 2.2 대기열',
      loadTitle: '불러오기',
      loadSub: '내 담당 후보 · 기준 약',
      loadEmpty: '1.2 에서 후보를 찜하면 여기 나와요.',
      loadRef: (name: string) => `기준 약 ${name}`,
      refLabel: (name: string) => `${name}(기준 약)`,
      molTitle: '분자',
      molSubVariant: '구조 바꿔 다시 도킹 — 부모 분자가 기록돼요',
      labelLabel: '이름표',
      labelPlaceholder: '예: 도네페질 F 유도체',
      previewButton: '무료 물성 미리보기',
      dockButton: '도킹 실행',
      canonical: (smiles: string) => `정규 SMILES ${smiles}`,
      signals: { ro5: 'Ro5 위반', oral: '경구 흡수', bbb: '뇌 노출(BBB)', herg: 'hERG 위험', liver: '간독성 위험' },
      level: { good: '좋음', moderate: '보통', poor: '나쁨', high: '높음', low: '낮음' },
      gaugeUnit: 'ΔG kcal/mol',
      shallow: '얕음',
      deep: '깊음',
      noName: '이름 없음',
      inQueue: '✓ 대기열',
      inQueueBy: (name: string) => `✓ 대기열 · ${name}`,
      cardPick: '대기열에 담을 분자로',
      pBar: (p: string) => `결합력 p ${p}`,
      parent: (label: string) => `부모 ${label}`,
      stairsRef: (dg: string) => `기준 ${dg}`,
      stairsX: 'ΔG (kcal/mol) → 더 음수',
      retroSub: (n: number) => `찜 ${n}`,
      reasonOf: (reason: string) => `근거 · ${reason}`,
      retroBy: (name: string, reason: string) => `${name} · 근거 ${reason}`,
      choose: '— 고르기 —',
      tableTitle: (target: string | null) => `${target ? `${target} ` : ''}도킹 비교표`,
      tableSub: 'ΔG 가 더 음수일수록 단단히 붙어요',
      cols: { who: '담당', mol: '분자', dg: 'ΔG', vsRef: '기준 약 대비', residues: '상호작용 잔기', state: '상태' },
      refWho: '결정 리간드',
      refChip: '기준 약',
      refNote: '재도킹 기준값',
      variant: '변형체',
      redock: '구조 바꿔 다시',
      noRuns: '아직 도킹한 분자가 없어요. 각자 찜한 후보를 동시에 돌려 보세요.',
      refunded: (why: string) => `실패한 작업은 연구비를 돌려받았어요: ${why}`,
      moreResidues: (n: number) => ` 외 ${n}`,
    },
  },
  s22: {
    tabs: { radar: '물성 레이더', lights: '신호등 표', trip: '몸속 여행 지도', chain: '점수 분해 사슬', run: 'ADMET 실행' },
    empty: '아직 ADMET 예측을 끝낸 분자가 없어요. 대기열 분자로 ADMET 을 실행하면 리드 읽기 도구 4종이 열려요.',
    radarQ: '이 분자의 약점은 여섯 축 가운데 어느 축인가요?',
    radarNote: '분홍 띠는 먹는 약이 흔히 있는 물성 범위예요(참고). 띠 안쪽이나 바깥쪽으로 벗어난 축이 그 분자의 약점이에요.',
    radarAxes:
      '지용성 cLogP(기름에 녹는 정도, −0.7~5) · 크기 MW(분자량, 150~500) · 극성 TPSA(물과 친한 표면 넓이, 20~130) · 유연성 RotB(빙글 돌 수 있는 결합 수, ≤9) · 수소결합 주개 HBD(수소결합에서 수소를 내주는 자리 수, ≤5) · 수소결합 받개 HBA(수소결합에서 수소를 받는 자리 수, ≤10)',
    radarAllIn: '여섯 축 모두 분홍 띠 안에 있어요',
    radarOut: (n: number, axes: string) => `분홍 띠 밖 ${n}곳: ${axes}`,
    lightsQ: '표적에는 잘 붙는데 빨간 위험 신호(■)가 켜진 분자는 어느 것인가요?',
    /** 표 아래 범례 — 칩(짧은 이름)은 줄바꿈이 안 되니 풀이(`*What`)는 칩 옆 글로 둔다. */
    lightsLegend: {
      good: '좋아요',
      goodWhat: '흡수 좋음 · 뇌 노출 높음(CNS 표적일 때) · 경피 적합 · 위험 낮음',
      mid: '보통',
      bad: '나빠요',
      badWhat: '흡수 나쁨 · 뇌 노출 낮음(CNS 표적일 때) · 경피 부적합 · 위험 높음',
    },
    tripQ: '이 분자는 우리 몸 어디를 지나면서 효능을 잃거나 안전 점수가 깎이나요?',
    trip: {
      mouth: '입 — 먹어요',
      mouthDose: (dose: number) => `경구 정제 ${dose} mg`,
      gut: '장 — 흡수 A · 피로 넘어가요',
      /** '100만'(백만)으로 읽히지 않게 숫자 뒤에 '정도가'를 붙인다. */
      gutReach: (pct: number) => `먹은 양 100 중 ${pct} 정도가 피에 닿아요`,
      blood: '피 — 온몸을 돌아요',
      bloodNote: '몸 구석구석으로',
      brainCns: '뇌 — 뇌 노출 B · CNS(뇌 · 척수) 표적이라 효능에 곱해져요',
      brainNotCns: '표적 — 뇌 밖(CNS 표적 아님)',
      brainNotCnsNote: '뇌 노출 B 는 CNS 표적일 때만 효능에 곱해져요',
      heart: '심장 — hERG 통로를 막으면 박동 리듬이 흐트러질 수 있어요',
      liver: '간 — 약을 분해하다가 손상될 수 있어요',
      indPass: (min: number) => `IND 기준 ${min} 넘어요`,
      indFail: (min: number) => `IND 기준 ${min} 에 못 미쳐요`,
      cut: (v: string) => `${v} 깎임`,
    },
    chainQ: '사슬의 어느 칸 하나가 전체 효능이나 안전 점수를 크게 끌어내리나요?',
    chain: {
      form: '제형',
      dose: '용량',
      mol: '분자',
      eHead: '효능 E — 얼마나 잘 듣나',
      sHead: '안전 S — 얼마나 덜 해로운가',
      fromP: '결합력에서',
      absorb: (form: string) => `흡수 · ${form}`,
      brain: '뇌 노출',
      doseEffect: 'De · 용량 효과',
      weakest: ' · ▼ 가장 끌어내림',
      eResult: '효능 E',
      intact: '다치지 않은 상태',
      burden: (dose: number) => `${dose} mg 부담`,
      risk: '심장 · 간 위험',
      riskFormula: 'R = 1 + hERG + 간',
      formK: 'K · 제형 계수',
      sResult: (cut: string) => `${cut} 깎임 → 안전 S`,
    },
    form: { oral: '경구', iv: '정맥주사', transdermal: '경피' },
    axis: { clogp: '지용성', mw: '크기', tpsa: '극성', rotb: '유연성', hbd: 'HBD', hba: 'HBA' },
    level: { good: '좋음', moderate: '보통', poor: '나쁨', high: '높음', low: '낮음', suitable: '적합', unsuitable: '부적합' },
    signal: { oral: '경구 흡수', bbb: '뇌 노출', bbbRef: '뇌 노출(참고)', herg: '심장 hERG', hep: '간독성', td: '경피 투과' },
    cols: { mol: '분자', p: '결합력 p', e: '효능 E', s: '안전 S', base: '경구 50 mg' },
    runEmpty: '2.1에서 분자를 골라 주세요',
    runHint: (cost: string) => `2.1 대기열에 담아 둔 분자만 ADMET 를 돌릴 수 있어요. 분자 1개당 ${cost}가 들어요.`,
    runDone: '이미 ADMET을 실행했어요',
    runButton: 'ADMET 예측 실행',
    runTitle: '2.1 대기열',
    runSub: (n: number, cost: string) => `${n}개 · 분자마다 ${cost}`,
    runBy: (name: string) => `담은 사람 ${name}`,
    aiTitle: 'ADMET-AI 레이더',
    candTitle: '특허 후보',
    candSub: (n: number, max: number, per: number) => `${n} / ${max}개 · 1인 ${per}개 한도`,
    candEmpty: '아직 올린 특허 후보가 없어요. 리드 읽기 도구 4종으로 비교한 뒤 근거 칩을 골라 올려 보세요.',
    candLegend: '특허 후보 근거 칩 고르기',
    candButton: '특허 후보로 올리기',
    candFrom: '특허 후보로 올릴 분자',
    candNote: (max: number, patentMax: number) =>
      `특허 후보는 모둠 최대 ${max}개까지 모을 수 있어요. 3.1 물질특허에는 이 가운데 최대 ${patentMax}건만 출원할 수 있어요. 주력 · 백업 후보는 3.2 전임상 · 동물실험 끝에서 정해요.`,
    candLegacy: '예전 판에서 이미 정해 둔 주력 · 백업 후보를 이 특허 후보 칸으로 옮겨 채웠어요.',
    candLimitMine: (per: number) => `내 몫 ${per}개를 다 올렸어요. 바꾸려면 올린 후보를 먼저 빼 주세요.`,
    candLimitTeam: (max: number) => `모둠 특허 후보가 ${max}개로 가득 찼어요. 하나를 빼야 새로 올릴 수 있어요.`,
    candLegacyLabel: '예전 판의 주력 · 백업',
    remove: '빼기',
    reference: '기준 약',
    noProps: '물성을 읽지 못했어요.',
    ui: {
      loading: '불러오는 중…',
      tabsLabel: '2.2 도구',
      queueTab: (n: number) => `대기열 ${n}`,
      teamTitle: '모둠 공유 — 특허 후보 · ADMET 비교',
      choose: '— 고르기 —',
      reasonOf: (reason: string) => `근거 · ${reason}`,
      outMark: '(띠 밖)',
      legendNote: '신호등 범례 — 색 · 모양 · 글자로 함께 보여요',
    },
  },
} as const;
