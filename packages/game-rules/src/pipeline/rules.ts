/**
 * 신약 파이프라인 상수(M5) — **균형안 §10 의 표를 그대로** 옮긴 것(docs/2026-10-19-game-balance-v0.md §10.1 · §10.3 · §10.4 · §10.7).
 * 여기 없는 수치를 만들지 않는다. 비용은 §3.3(`economy.ts` 의 `FILING_COST_CENTS` · `CLINICAL_COST_CENTS`)과 같은 값이다.
 */
import type { DoseMg, Formulation, PipelineStepKind } from '@crista/shared-types';
import { CLINICAL_COST_CENTS, FILING_COST_CENTS, type Cents } from '../economy.ts';

export const PIPELINE_RULES = {
  /** §10.1 · §3.3 — 1회 비용(정수 센트, 이벤트 배율 전). */
  cost: {
    patentCents: FILING_COST_CENTS.substancePatent as Cents,
    stepCents: {
      ind: FILING_COST_CENTS.ind,
      phase1: CLINICAL_COST_CENTS.phase1,
      phase2: CLINICAL_COST_CENTS.phase2,
      phase3: CLINICAL_COST_CENTS.phase3,
      final: FILING_COST_CENTS.finalApproval,
    } as Readonly<Record<PipelineStepKind, Cents>>,
  },
  /** §10.1 — 기간(게임 일, 배율 전). */
  durationDays: { ind: 30, phase1: 90, phase2: 180, phase3: 360, final: 60 } as Readonly<Record<PipelineStepKind, number>>,
  /** §10.4 — 대학병원 지구: 임상 점수 +3 · 임상 기간 × 0.85. 그 밖 지구 0 · × 1. */
  hospital: { scoreBonus: 3, durationFactor: 0.85 },
  /**
   * §10.4 — 결합력 p = clamp((ΔG_ref + 4.5 − ΔG) / 5, 0, 1)(v11 표적별 정규화).
   * `referenceKcal` 은 그 표적의 결정 리간드를 같은 설정으로 재도킹한 값(`DockingTarget.referenceKcal`)이고,
   * 기본값 −11.5 를 쓰면 M5 의 원래 식 `(−ΔG − 7) / 5` 와 **산술까지 같다**(−11.5 + 4.5 = −7).
   * 기준 리간드는 어느 표적이든 p = 0.9 에, 기준보다 4.5 kcal/mol 약하면 p = 0 에 놓인다.
   */
  affinity: { zeroAtNegKcal: 7, spanKcal: 5, defaultReferenceKcal: -11.5, headroomKcal: 4.5 },
  /** §10.4 — E = 100 × (0.30 + 0.70 × p) × A × B × De. */
  efficacy: { base: 0.3, affinityWeight: 0.7 },
  /** §10.4 — 흡수 A. */
  absorption: {
    oral: { good: 1.0, moderate: 0.75, poor: 0.45 },
    iv: 1.0,
    transdermal: { suitable: 0.85, unsuitable: 0.4 },
  },
  /** §10.4 — 뇌 노출 B(CNS 표적만, 아니면 1.00). */
  bbb: { high: 1.0, moderate: 0.7, low: 0.35, nonCns: 1.0 },
  /** §10.4 — 용량 효능 De · 용량 독성 Dt. */
  doseEfficacy: { 10: 0.6, 50: 0.85, 100: 1.0 } as Readonly<Record<DoseMg, number>>,
  doseToxicity: { 10: 10, 50: 30, 100: 55 } as Readonly<Record<DoseMg, number>>,
  /** §10.4 — 위험 배율 R = 1 + hERG + 간독성. */
  risk: {
    herg: { low: 0, moderate: 0.3, high: 0.6 },
    hepatotoxicity: { low: 0, moderate: 0.25, high: 0.6 },
  },
  /** §10.4 — 제형 피크 K. */
  formulationPeak: { oral: 1.0, iv: 1.25, transdermal: 0.75 } as Readonly<Record<Formulation, number>>,
  /** §10.4 — 판정 기준(통과 조건 ≥). 그 단계가 보지 않는 축은 null. */
  thresholds: {
    ind: { efficacy: null, safety: 35 },
    phase1: { efficacy: null, safety: 50 },
    phase2: { efficacy: 40, safety: null },
    phase3: { efficacy: 45, safety: 55 },
    final: { efficacy: null, safety: null },
  } as Readonly<Record<PipelineStepKind, { efficacy: number | null; safety: number | null }>>,
  /** §10.4 — 흔들림 n 범위(정수 균등 −r~+r). IND · 최종은 흔들림 없음(0). */
  noiseRange: { ind: 0, phase1: 6, phase2: 6, phase3: 4, final: 0 } as Readonly<Record<PipelineStepKind, number>>,
  /** §10.3 — 물성 신호 규칙의 경계값. */
  signals: {
    ro5: { mwMax: 500, clogpMax: 5, hbdMax: 5, hbaMax: 10 },
    oral: { tpsaMax: 140, rotbMax: 10, moderateViolationsMax: 1 },
    bbb: { high: { tpsaMax: 90, mwMax: 450, hbdMax: 3 }, moderate: { tpsaMax: 120, mwMax: 500 } },
    herg: { highClogpMin: 3.7, moderateClogpMin: 2.5 },
    hepatotoxicity: { clogpOver: 3, tpsaUnder: 75 },
    transdermal: { mwMax: 500, clogpMin: 1, clogpMax: 4 },
  },
  /** §10.7 — 허가 리포트 제형 배율(경구 1.3 · 정맥 1.0 · 경피 1.15). 허가 기본값 = min(20%, 12% × 배율) — 계산은 W-market. */
  approvalFormulationMultiplier: { oral: 1.3, iv: 1.0, transdermal: 1.15 } as Readonly<Record<Formulation, number>>,
} as const;

/** 단계별 원장 종류(protocol v5) — 특허 `patent_fee` · IND · 최종 `review_fee` · 임상 `trial_fee`. */
export function stepLedgerKind(kind: PipelineStepKind): 'review_fee' | 'trial_fee' {
  return kind === 'ind' || kind === 'final' ? 'review_fee' : 'trial_fee';
}

/** 유료 신청 멱등 키 — `pipeline:<teamId>:<requestId>`(세대 안에서 유일, protocol v5). */
export function pipelineLedgerKey(teamId: string, requestId: string): string {
  return `pipeline:${teamId}:${requestId}`;
}
