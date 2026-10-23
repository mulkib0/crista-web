/**
 * 애널리스트 리포트 규칙 — 균형안 §9.3 · §10.7(파이프라인 계기, M5). 계기별 펀더멘털 변동 범위 · 기본값 · 대기 계기 합치기 · 기본 투자의견 · F 갱신 ·
 * 규칙 기반 리포트 문구(LLM 을 못 쓸 때) · LLM 출력 다시 자르기 · 정정 재계산.
 *
 * LLM 이 낸 수치는 **제안**이다 — 서버가 이 범위로 자르고, 가격은 `price.ts` 가 정한다.
 * 규칙 기반 문구의 숫자는 넘겨받은 사실(계기 세부 · 적용 Δ · 사실 목록)에서만 온다. 지어내지 않는다.
 */
import type {
  AnalystFacts,
  AnalystPipelineFacts,
  AnalystRating,
  AnalystTriggerKind,
  CashAlertLevel,
  CompanyStatus,
  FacilityKind,
  FailureKind,
  Formulation,
  LlmAnalystOutput,
  PipelineStepKind,
} from '@crista/shared-types';
import { FACILITY_LABEL, FORMULATION_LABEL, stepOutcomeLabel } from '@crista/shared-types';
import { PIPELINE_RULES } from '../pipeline/rules.ts';
import { floorFundamental } from './price.ts';
import { MARKET_RULES } from './rules.ts';

export interface AnalystBand {
  readonly minPct: number;
  readonly maxPct: number;
  readonly defaultPct: number;
}

export type TriggerDetail = Readonly<Record<string, string | number | boolean | null>>;

/** 파이프라인 계기(v5) — 범위 · 기본값이 결과(통과 · 실패)에 따라 다르다. `analystBand` 가 `detail` 을 보고 고른다. */
export type PipelineTriggerKind = 'patent' | 'ind' | 'trial' | 'approval';
export const PIPELINE_TRIGGER_KINDS: readonly PipelineTriggerKind[] = ['patent', 'ind', 'trial', 'approval'];

export function isPipelineTrigger(kind: AnalystTriggerKind): kind is PipelineTriggerKind {
  return kind === 'patent' || kind === 'ind' || kind === 'trial' || kind === 'approval';
}

/** 균형안 §9.3 표 — 계기별 Δ 범위(%). 기본값은 `defaultAnalystChangePct`. 파이프라인 계기는 `PIPELINE_ANALYST_BANDS`(결과마다). */
export const ANALYST_BANDS: Readonly<Record<Exclude<AnalystTriggerKind, PipelineTriggerKind>, { readonly minPct: number; readonly maxPct: number }>> = {
  listing: { minPct: 0, maxPct: 0 },
  facility: { minPct: 0, maxPct: 4 },
  upgrade: { minPct: 0, maxPct: 3 },
  docking: { minPct: 0, maxPct: 12 },
  investment: { minPct: 5, maxPct: 15 },
  offering: { minPct: -10, maxPct: 5 },
  crisis: { minPct: -8, maxPct: 0 },
  restructure: { minPct: -15, maxPct: -3 },
  recovered: { minPct: 0, maxPct: 8 },
  macro: { minPct: -5, maxPct: 5 },
  bankrupt: { minPct: 0, maxPct: 0 },
  reinstated: { minPct: 0, maxPct: 0 },
  // 교사 정정은 리포트를 새로 내는 계기가 아니다(정정 전표 — 값은 교사가 정한다).
  correction: { minPct: 0, maxPct: 0 },
};

/** 파이프라인 계기의 결과 단계 — 특허 등록 · IND · 임상 1 · 2 · 3상 · 최종 허가. */
export type AnalystOutcomeStage = 'patent' | 'ind' | 'phase1' | 'phase2' | 'phase3' | 'final';

/**
 * 균형안 §10.7 표 — 결과 단계 × 통과(`pass`) · 실패(`fail`)마다 Δ 범위 · 기본값(%). 특허 등록은 결과가 하나(`pass`).
 * 최종 허가 통과의 기본값은 제형 배율을 곱한 값이라 `approvalDefaultChangePct` 가 따로 정한다(여기 `defaultPct` 는 배율 1.0 의 12%).
 */
export const PIPELINE_ANALYST_BANDS: Readonly<Record<AnalystOutcomeStage, { readonly pass: AnalystBand; readonly fail: AnalystBand | null }>> = {
  patent: { pass: { minPct: 0, maxPct: 5, defaultPct: 2 }, fail: null },
  ind: { pass: { minPct: 0, maxPct: 5, defaultPct: 2 }, fail: { minPct: -8, maxPct: 0, defaultPct: -4 } },
  phase1: { pass: { minPct: 0, maxPct: 8, defaultPct: 4 }, fail: { minPct: -12, maxPct: -2, defaultPct: -6 } },
  phase2: { pass: { minPct: 3, maxPct: 15, defaultPct: 8 }, fail: { minPct: -18, maxPct: -5, defaultPct: -12 } },
  phase3: { pass: { minPct: 5, maxPct: 18, defaultPct: 10 }, fail: { minPct: -20, maxPct: -8, defaultPct: -15 } },
  final: { pass: { minPct: 8, maxPct: 20, defaultPct: 12 }, fail: { minPct: -15, maxPct: -3, defaultPct: -8 } },
};

/** 제형 배율(균형안 §10.7 — PRD §2.3 '상업적 시가총액 멀티플'): 경구 1.3 · 정맥 1.0 · 경피 1.15. 값은 `PIPELINE_RULES` 한 곳에. */
export const FORMULATION_MARKET_MULTIPLIER: Readonly<Record<Formulation, number>> = PIPELINE_RULES.approvalFormulationMultiplier;

/** 최종 허가 기본 Δ 의 바탕값(%) · 상한(%) — min(20%, 12% × 제형 배율). */
export const APPROVAL_BASE_PCT = 12;
export const APPROVAL_CAP_PCT = 20;

function isFormulation(value: unknown): value is Formulation {
  return value === 'oral' || value === 'iv' || value === 'transdermal';
}

/**
 * 최종 허가 기본 Δ(%) = min(20%, 12% × 제형 배율) — 경구 15.6 · 정맥 12.0 · 경피 13.8.
 * 제형을 모르면(계기 세부가 빠진 경우) 배율 1.0 으로 본다.
 */
export function approvalDefaultChangePct(formulation: Formulation | null): number {
  const mult = formulation ? FORMULATION_MARKET_MULTIPLIER[formulation] : 1;
  return Math.min(APPROVAL_CAP_PCT, Math.round(APPROVAL_BASE_PCT * mult * 1e9) / 1e9);
}

/** 파이프라인 계기 세부에서 읽은 결과 — `detail.kind` · `detail.passed` · `detail.formulation`. 모자라면 null. */
export interface AnalystPipelineOutcome {
  readonly stage: AnalystOutcomeStage;
  readonly passed: boolean;
  readonly formulation: Formulation | null;
}

const TRIAL_STAGES: readonly AnalystOutcomeStage[] = ['phase1', 'phase2', 'phase3'];

/**
 * 계기 + 세부 → 결과 단계 · 통과 여부. 계기와 `detail.kind` 가 맞지 않거나 `passed` 가 없으면 null(특허는 언제나 등록 결과).
 * `ind` ↔ kind 'ind' · `trial` ↔ 'phase1' · 'phase2' · 'phase3' · `approval` ↔ 'final'.
 */
export function analystPipelineOutcomeOf(kind: AnalystTriggerKind, detail: TriggerDetail = {}): AnalystPipelineOutcome | null {
  const formulation = isFormulation(detail.formulation) ? detail.formulation : null;
  if (kind === 'patent') return { stage: 'patent', passed: true, formulation };
  if (!isPipelineTrigger(kind)) return null;
  const passed = detail.passed;
  if (typeof passed !== 'boolean') return null;
  const stepKind = str(detail, 'kind');
  if (kind === 'ind') return stepKind === null || stepKind === 'ind' ? { stage: 'ind', passed, formulation } : null;
  if (kind === 'approval') return stepKind === null || stepKind === 'final' ? { stage: 'final', passed, formulation } : null;
  // trial — 몇 상인지 모르면 범위를 고를 수 없다.
  return stepKind !== null && (TRIAL_STAGES as readonly string[]).includes(stepKind)
    ? { stage: stepKind as AnalystOutcomeStage, passed, formulation }
    : null;
}

/** 세부가 모자란 파이프라인 계기 — 범위를 고를 수 없으므로 움직이지 않는다(0). */
const NO_MOVE_BAND: AnalystBand = { minPct: 0, maxPct: 0, defaultPct: 0 };

/** 파이프라인 계기의 범위 · 기본값(균형안 §10.7). */
export function pipelineAnalystBand(kind: PipelineTriggerKind, detail: TriggerDetail = {}): AnalystBand {
  const outcome = analystPipelineOutcomeOf(kind, detail);
  if (!outcome) return NO_MOVE_BAND;
  const row = PIPELINE_ANALYST_BANDS[outcome.stage];
  const band = outcome.passed ? row.pass : (row.fail ?? row.pass);
  if (outcome.stage === 'final' && outcome.passed) {
    return { minPct: band.minPct, maxPct: band.maxPct, defaultPct: clampPct(approvalDefaultChangePct(outcome.formulation), band.minPct, band.maxPct) };
  }
  return band;
}

/** 도킹 신기록 기준 — 결합 자유에너지 ΔG ≤ −7.0 kcal/mol. */
export const DOCKING_RECORD_THRESHOLD_KCAL = -7;

function num(detail: TriggerDetail, key: string): number | null {
  const v = detail[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(detail: TriggerDetail, key: string): string | null {
  const v = detail[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** 도킹 신기록 기본 Δ(%) = +2% + 8% × clamp((−ΔG − 7) / 5, 0, 1). */
export function dockingDefaultChangePct(affinityKcal: number): number {
  const x = Math.min(1, Math.max(0, (-affinityKcal - 7) / 5));
  return 2 + 8 * x;
}

/** 그 도킹 값이 신기록 계기에 해당하는가 — ΔG ≤ −7.0 이고 이전 최고보다 낮다. */
export function isDockingRecord(affinityKcal: number | null, previousBestKcal: number | null): boolean {
  if (affinityKcal === null || !Number.isFinite(affinityKcal)) return false;
  if (affinityKcal > DOCKING_RECORD_THRESHOLD_KCAL) return false;
  return previousBestKcal === null || affinityKcal < previousBestKcal;
}

/** 도킹 판정 정정 뒤 그 리포트의 규칙 Δ — 신기록에 해당하지 않으면 0. */
export function dockingChangePctFor(affinityKcal: number | null, previousBestKcal: number | null): number {
  return isDockingRecord(affinityKcal, previousBestKcal) ? dockingDefaultChangePct(affinityKcal!) : 0;
}

/** 계기별 기본 Δ(%) — 균형안 §9.3 표 그대로. */
export function defaultAnalystChangePct(kind: AnalystTriggerKind, detail: TriggerDetail = {}): number {
  switch (kind) {
    case 'facility':
      return 2;
    case 'upgrade':
      return 1;
    case 'docking': {
      const affinity = num(detail, 'affinityKcal');
      return affinity === null ? 2 : dockingDefaultChangePct(affinity);
    }
    case 'investment':
      return str(detail, 'milestone') === 'seriesB' ? 12 : 8;
    case 'offering':
      return -3;
    case 'crisis':
      return -3;
    case 'restructure':
      return -8;
    case 'recovered':
      return 4;
    case 'macro':
      return str(detail, 'tone') === 'bad' ? -2 : 2;
    case 'listing':
    case 'bankrupt':
    case 'reinstated':
    case 'correction':
      return 0;
    case 'patent':
    case 'ind':
    case 'trial':
    case 'approval':
      return pipelineAnalystBand(kind, detail).defaultPct;
  }
}

/** 계기 하나의 범위 + 기본값. 파이프라인 계기는 `detail` 의 결과(통과 · 실패 · 단계 · 제형)로 고른다. */
export function analystBand(kind: AnalystTriggerKind, detail: TriggerDetail = {}): AnalystBand {
  if (isPipelineTrigger(kind)) return pipelineAnalystBand(kind, detail);
  const b = ANALYST_BANDS[kind];
  return { minPct: b.minPct, maxPct: b.maxPct, defaultPct: clampPct(defaultAnalystChangePct(kind, detail), b.minPct, b.maxPct) };
}

function clampPct(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 대기 계기 합치기 — 기본값 합 · 범위 합, 단 ±20% 로 자른다(균형안 §9.3). */
export function mergeAnalystBands(bands: readonly AnalystBand[]): AnalystBand {
  const cap = MARKET_RULES.analystMergeCapPct;
  const sum = (pick: (b: AnalystBand) => number) => bands.reduce((acc, b) => acc + pick(b), 0);
  const minPct = clampPct(sum((b) => b.minPct), -cap, cap);
  const maxPct = clampPct(sum((b) => b.maxPct), -cap, cap);
  return { minPct, maxPct, defaultPct: clampPct(sum((b) => b.defaultPct), minPct, maxPct) };
}

/** 대기열에서 합칠 때인가 — 대기 중인 계기가 3개를 넘는다. */
export function shouldMergeTriggers(pendingCount: number): boolean {
  return pendingCount > MARKET_RULES.analystMergeThreshold;
}

/**
 * 기본 투자의견(LLM 이 없을 때): Δ ≥ +6% STRONG BUY · ≥ +1.5% BUY · > −3% HOLD · 그 밖 SHORT WARNING.
 * 구조조정 · 유예 중이면 SHORT WARNING. 파산(거래 정지)도 SHORT WARNING 으로 본다(유예 만료의 결과).
 */
export function defaultAnalystRating(changePct: number, cashLevel: CashAlertLevel | null, companyStatus: CompanyStatus = 'active'): AnalystRating {
  if (companyStatus === 'bankrupt' || cashLevel === 'restructure' || cashLevel === 'grace') return 'SHORT_WARNING';
  if (changePct >= 6) return 'STRONG_BUY';
  if (changePct >= 1.5) return 'BUY';
  if (changePct > -3) return 'HOLD';
  return 'SHORT_WARNING';
}

/** F 갱신 — F ← F × (1 + Δ), 하한 $0.10. */
export function applyFundamentalChange(fundamentalUsd: number, changePct: number): number {
  return floorFundamental(fundamentalUsd * (1 + changePct / 100));
}

/** 정정 재계산 — F × (1 + 새 Δ) / (1 + 원래 Δ), 하한 $0.10. */
export function correctedFundamental(fundamentalUsd: number, originalPct: number, correctedPct: number): number {
  const denom = 1 + originalPct / 100;
  if (!(denom > 0)) return floorFundamental(fundamentalUsd);
  return floorFundamental((fundamentalUsd * (1 + correctedPct / 100)) / denom);
}

// ─────────────────────────────── 표기 ───────────────────────────────

export const RATING_LABEL: Readonly<Record<AnalystRating, string>> = {
  STRONG_BUY: 'STRONG BUY',
  BUY: 'BUY',
  HOLD: 'HOLD',
  SHORT_WARNING: 'SHORT WARNING',
};

export function isAnalystRating(value: unknown): value is AnalystRating {
  return value === 'STRONG_BUY' || value === 'BUY' || value === 'HOLD' || value === 'SHORT_WARNING';
}

/** 변동률 표기 — `+5.8%` · `−3.0%` · `0.0%`(브리프 §9 — 빼기는 U+2212). */
export function formatChangePct(pct: number): string {
  const v = Math.round(pct * 10) / 10;
  if (v === 0) return '0.0%';
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;
}

/** 결합 자유에너지 표기 — `−9.1 kcal/mol`. */
export function formatKcal(kcal: number): string {
  const v = Math.round(kcal * 10) / 10;
  return `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} kcal/mol`;
}

const CASH_LEVEL_LABEL: Readonly<Record<CashAlertLevel, string>> = {
  normal: '평시',
  notice: '주의',
  crisis: '위기',
  restructure: '구조조정',
  grace: '회생 유예',
};

const MILESTONE_LABEL: Readonly<Record<string, string>> = { seriesA: 'Series A', seriesB: 'Series B' };

function facilityLabel(kind: string | null): string {
  if (kind && kind in FACILITY_LABEL) return FACILITY_LABEL[kind as FacilityKind];
  return '설비';
}

// ─────────────────────────────── 규칙 기반 리포트 문구 ───────────────────────────────

export interface AnalystFallbackInput {
  readonly trigger: AnalystTriggerKind;
  readonly ticker: string;
  readonly detail: TriggerDetail;
  /** 적용한 Δ(%) — 범위로 자른 값. */
  readonly changePct: number;
  readonly rating: AnalystRating;
  /** 근거 줄에 쓰는 사실(있는 것만). */
  readonly facts?: Partial<Pick<AnalystFacts, 'bestDocking' | 'shortInterestPct' | 'cashLevel' | 'facilities' | 'investments' | 'researchers' | 'pipeline'>>;
  /** 합친 리포트면 합친 계기들(오래된 것부터). */
  readonly merged?: readonly AnalystTriggerKind[];
}

export interface AnalystText {
  readonly headline: string;
  readonly comment: string;
  readonly rationale: string[];
}

const TRIGGER_LABEL: Readonly<Record<AnalystTriggerKind, string>> = {
  listing: '상장',
  facility: '설비 건설',
  upgrade: '설비 업그레이드',
  docking: '도킹 신기록',
  investment: '투자 유치',
  offering: '유상증자 공시',
  crisis: '자금 위기',
  restructure: '구조조정',
  recovered: '회생',
  macro: '시장 사건',
  bankrupt: '거래 정지',
  reinstated: '거래 재개',
  correction: '교사 정정',
  patent: '물질특허 등록',
  ind: 'IND 심사',
  trial: '임상 시험',
  approval: '최종 허가 심사',
};

/** 계기 이름표(규칙 기반 문구 · 근거 줄과 같은 말). */
export function analystTriggerLabel(kind: AnalystTriggerKind): string {
  return TRIGGER_LABEL[kind];
}

const FAILURE_LABEL: Readonly<Record<FailureKind, string>> = { safety: '안전성', efficacy: '효능', both: '효능 · 안전성' };

const STAGE_TO_STEP: Readonly<Record<Exclude<AnalystOutcomeStage, 'patent'>, PipelineStepKind>> = {
  ind: 'ind',
  phase1: 'phase1',
  phase2: 'phase2',
  phase3: 'phase3',
  final: 'final',
};

/** 파이프라인 계기의 결과 이름(예: 'IND 승인' · '임상 2상 보류(CRL)' · '물질특허 등록'). 세부가 모자라면 계기 이름. */
function pipelineOutcomeLabel(kind: AnalystTriggerKind, detail: TriggerDetail): string {
  const outcome = analystPipelineOutcomeOf(kind, detail);
  if (!outcome) return TRIGGER_LABEL[kind];
  if (outcome.stage === 'patent') return '물질특허 등록';
  return stepOutcomeLabel(STAGE_TO_STEP[outcome.stage], outcome.passed);
}

/** 프로토콜 한 줄(공개 사실만) — '10 mg · 경구용 정제 · 캡슐'. 없으면 null. */
function protocolLine(p: AnalystPipelineFacts | undefined, formulation: Formulation | null): string | null {
  const parts: string[] = [];
  if (p?.dose !== undefined) parts.push(`${p.dose} mg`);
  const f = p?.formulation ?? formulation;
  if (f) parts.push(FORMULATION_LABEL[f]);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** 파이프라인 계기 논평 본문 — 공개 사실(코드명 · 단계 · 결과 · 실패 종류 · 용량 · 제형)만. 숫자는 사실 · 규칙 상수에서만. */
function pipelineComment(input: AnalystFallbackInput, pct: string, rating: string): string {
  const p = input.facts?.pipeline;
  const outcome = analystPipelineOutcomeOf(input.trigger, input.detail);
  const who = p?.codeName ? `${input.ticker} ${p.codeName}` : input.ticker;
  const tail = `펀더멘털 ${pct}, 의견 ${rating}.`;
  if (!outcome) return `${who} — ${TRIGGER_LABEL[input.trigger]} 결과가 공시됐다. ${tail}`;
  const failure = p?.failure ? FAILURE_LABEL[p.failure] : null;
  switch (outcome.stage) {
    case 'patent':
      return `${who} — 물질특허를 등록했다. 특허는 독점권일 뿐 효능 · 안전성이 확인된 것은 아니다. ${tail}`;
    case 'ind':
      return outcome.passed
        ? `${who} — FDA 가 IND 를 승인해 임상 1상을 시작할 수 있다. 임상 결과는 아직 없다. ${tail}`
        : `${who} — 전임상 안전성 문제로 IND 가 보류됐다. 용량 · 제형 · 후보를 바꿔 다시 신청할 수 있다. ${tail}`;
    case 'phase1':
    case 'phase2':
    case 'phase3': {
      const label = stepOutcomeLabel(STAGE_TO_STEP[outcome.stage], outcome.passed);
      if (outcome.passed) {
        const next = outcome.stage === 'phase3' ? '최종 허가를 신청할 수 있다' : '다음 임상 단계로 갈 수 있다';
        return `${who} — ${label}. ${next}. ${tail}`;
      }
      return `${who} — ${label}${failure ? `(${failure} 기준 미달)` : ''}. 같은 프로토콜 재시험 · 용량 변경 · 제형 교체로 재도전할 수 있다. ${tail}`;
    }
    case 'final': {
      if (!outcome.passed) return `${who} — 교사 정정으로 최종 허가가 거절됐다. 최종 허가를 다시 신청할 수 있다. ${tail}`;
      const f = p?.formulation ?? outcome.formulation;
      const mult = f ? ` 제형(${FORMULATION_LABEL[f]}) 상업 배율 ×${FORMULATION_MARKET_MULTIPLIER[f]} 를 반영했다.` : '';
      return `${who} — 최종 허가를 받았다.${mult} ${tail}`;
    }
  }
}

function cut(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

function headlineFor(input: AnalystFallbackInput): string {
  const { ticker, detail, changePct } = input;
  const pct = formatChangePct(changePct);
  switch (input.trigger) {
    case 'listing':
      return `${ticker} 상장 — 첫 리포트`;
    case 'facility':
      return `${ticker} ${facilityLabel(str(detail, 'facility'))} 건설 · 펀더멘털 ${pct}`;
    case 'upgrade': {
      const tier = num(detail, 'tier');
      return `${ticker} ${facilityLabel(str(detail, 'facility'))}${tier === null ? '' : ` ${tier}단계`} 업그레이드 · ${pct}`;
    }
    case 'docking': {
      const aff = num(detail, 'affinityKcal');
      return aff === null ? `${ticker} 도킹 신기록 · ${pct}` : `${ticker} 도킹 신기록 ΔG ${formatKcal(aff)} · ${pct}`;
    }
    case 'investment':
      return `${ticker} ${MILESTONE_LABEL[str(detail, 'milestone') ?? ''] ?? '투자'} 유치 · ${pct}`;
    case 'offering':
      return `${ticker} 유상증자 공시 · 희석 반영 ${pct}`;
    case 'crisis':
      return `${ticker} 자금 위기 단계 진입 · ${pct}`;
    case 'restructure':
      return `${ticker} 구조조정 진입 · ${pct}`;
    case 'recovered':
      return `${ticker} 회생 — 유예 해제 · ${pct}`;
    case 'macro':
      return `${ticker} 시장 사건 영향(${str(detail, 'tone') === 'bad' ? '나쁜 사건' : '좋은 사건'}) · ${pct}`;
    case 'bankrupt':
      return `${ticker} 파산 판정 — 거래 정지`;
    case 'reinstated':
      return `${ticker} 파산 판정 정정 — 거래 재개`;
    case 'correction':
      return `${ticker} 리포트 정정`;
    case 'patent':
    case 'ind':
    case 'trial':
    case 'approval': {
      const code = input.facts?.pipeline?.codeName;
      return `${ticker}${code ? ` ${code}` : ''} ${pipelineOutcomeLabel(input.trigger, detail)} · ${pct}`;
    }
  }
}

function commentFor(input: AnalystFallbackInput): string {
  const { ticker, detail, changePct } = input;
  const pct = formatChangePct(changePct);
  const rating = RATING_LABEL[input.rating];
  switch (input.trigger) {
    case 'listing':
      return `${ticker} 종목이 바이오 증권거래소에 상장했다. 아직 공시된 연구 실적이 없어 의견은 ${rating} 로 시작한다.`;
    case 'facility':
    case 'upgrade':
      return `${facilityLabel(str(detail, 'facility'))} 투자로 연구 역량이 늘었다. 펀더멘털 ${pct} 를 반영하고 의견은 ${rating}.`;
    case 'docking': {
      const aff = num(detail, 'affinityKcal');
      const prev = num(detail, 'previousBestKcal');
      const target = str(detail, 'pdbId');
      const what = aff === null ? '도킹 최고 기록을 갱신했다' : `도킹 최고 기록을 ${formatKcal(aff)}${target ? `(${target})` : ''} 로 갱신했다`;
      const before = prev === null ? '' : ` 이전 최고는 ${formatKcal(prev)}.`;
      return `${ticker} — ${what}.${before} 계산 결과일 뿐 효능이 확인된 것은 아니다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    }
    case 'investment':
      return `${MILESTONE_LABEL[str(detail, 'milestone') ?? ''] ?? '투자'} 마일스톤 승인으로 연구 자금이 들어왔다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'offering':
      return `신주 발행은 연구비를 늘리지만 기존 주주 지분이 희석된다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'crisis':
      return `운영 가능 기간이 짧아져 자금 위기 단계에 들어섰다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'restructure':
      return `유지비를 내지 못해 구조조정 단계에 들어섰다. 신규 유료 연구 · 설비 구매가 막힌다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'recovered':
      return `미지급을 정산하고 운영 자금을 확보해 회생 유예가 풀렸다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'macro':
      return `이 회사가 대상인 시장 사건이 적용됐다. 과학 계산 결과는 바뀌지 않는다. 펀더멘털 ${pct}, 의견 ${rating}.`;
    case 'bankrupt':
      return `회생 유예가 끝나 파산 판정을 받았다. 거래가 정지되고 포지션이 묶인다 — 재창업하거나 정지 뒤 운영 시간 ${MARKET_RULES.suspensionSettleHours}시간이 지나면 정리가로 청산한다.`;
    case 'reinstated':
      return `교사가 파산 판정을 정정해 회사가 다시 운영된다. 거래를 재개한다. 의견 ${rating}.`;
    case 'correction':
      return `교사가 리포트를 정정했다. 의견 ${rating}, 펀더멘털 ${pct}.`;
    case 'patent':
    case 'ind':
    case 'trial':
    case 'approval':
      return pipelineComment(input, pct, rating);
  }
}

function rationaleFor(input: AnalystFallbackInput): string[] {
  const lines: string[] = [];
  const f = input.facts ?? {};
  if (input.merged && input.merged.length > 1) {
    lines.push(`대기 중인 계기 ${input.merged.length}건을 하나로 묶음: ${input.merged.map((k) => TRIGGER_LABEL[k]).join(' · ')}`);
  } else if (isPipelineTrigger(input.trigger)) {
    lines.push(`계기: ${pipelineOutcomeLabel(input.trigger, input.detail)}`);
  } else {
    lines.push(`계기: ${TRIGGER_LABEL[input.trigger]}`);
  }
  if (f.pipeline && isPipelineTrigger(input.trigger)) {
    const outcome = analystPipelineOutcomeOf(input.trigger, input.detail);
    const proto = protocolLine(f.pipeline, outcome?.formulation ?? null);
    if (proto) lines.push(`프로토콜: ${proto}`);
    lines.push(`유효 특허 ${f.pipeline.patents}건 · 코드명 ${f.pipeline.codeName}`);
  }
  if (f.bestDocking) {
    lines.push(`최고 도킹 ΔG ${formatKcal(f.bestDocking.affinityKcal)} · ${f.bestDocking.targetLabel}(${f.bestDocking.pdbId})`);
  }
  if (f.cashLevel && f.cashLevel !== 'normal') lines.push(`자금 단계: ${CASH_LEVEL_LABEL[f.cashLevel]}`);
  else if (f.facilities) {
    const built = Object.entries(f.facilities).filter(([, tier]) => (tier ?? 0) > 0).length;
    lines.push(`가동 설비 ${built}곳`);
  }
  return lines.slice(0, 3).map((l) => cut(l, 80));
}

/**
 * 규칙 기반 리포트 문구(`source: 'rules'`). 숫자는 계기 세부 · 적용 Δ · 사실에서만 가져온다.
 * 헤드라인 60자 · 논평 200자 · 근거 3개(각 80자) 이하.
 */
export function analystFallback(input: AnalystFallbackInput): AnalystText {
  const merged = input.merged && input.merged.length > 1;
  const headline = merged ? `${input.ticker} 종합 리포트 · ${formatChangePct(input.changePct)}` : headlineFor(input);
  const comment = merged
    ? `여러 계기를 한 번에 반영했다. 펀더멘털 ${formatChangePct(input.changePct)}, 의견 ${RATING_LABEL[input.rating]}.`
    : commentFor(input);
  return { headline: cut(headline, 60), comment: cut(comment, 200), rationale: rationaleFor(input) };
}

// ─────────────────────────────── LLM 출력 다시 자르기 ───────────────────────────────

/** 문자열 정리 — 제어 문자 · 마크다운 강조 기호를 빼고 공백을 줄인 뒤 길이로 자른다. */
function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cut(text, max);
}

/**
 * 워커가 검증한 LLM 출력을 게임 서버가 **한 번 더** 자른다(신뢰 경계 — llm.ts).
 * 의견은 네 값 중 하나(아니면 `fallbackRating`), Δ 는 범위로 자르고 원래 제안은 `proposedChangePct` 로 남긴다.
 * 헤드라인이 비면 쓸 수 없는 출력 → null(규칙 기반으로 대신한다).
 */
export function clampAnalystOutput(output: unknown, band: AnalystBand, fallbackRating: AnalystRating): LlmAnalystOutput | null {
  if (typeof output !== 'object' || output === null) return null;
  const raw = output as Record<string, unknown>;
  const headline = cleanText(raw.headline, 60);
  if (headline.length === 0) return null;
  const proposedRaw =
    typeof raw.proposedChangePct === 'number' && Number.isFinite(raw.proposedChangePct)
      ? raw.proposedChangePct
      : typeof raw.fundamentalChangePct === 'number' && Number.isFinite(raw.fundamentalChangePct)
        ? raw.fundamentalChangePct
        : band.defaultPct;
  const rationale = Array.isArray(raw.rationale)
    ? raw.rationale.map((r) => cleanText(r, 80)).filter((r) => r.length > 0).slice(0, 3)
    : [];
  return {
    rating: isAnalystRating(raw.rating) ? raw.rating : fallbackRating,
    fundamentalChangePct: clampPct(proposedRaw, band.minPct, band.maxPct),
    proposedChangePct: proposedRaw,
    headline,
    comment: cleanText(raw.comment, 200),
    rationale,
  };
}
