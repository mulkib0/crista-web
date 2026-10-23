/**
 * C-Level 균등 성과급 · 팬텀스톡 · 시간가중 투자 수익률(설계서 §3.3, 사용자 결정 #4). 순수 함수.
 * 구현 결정: docs/2026-10-23-gamification-step2-brief.md §2 의 9 ~ 11.
 *
 * - 성과급: 회사 사실(투자 · 특허 · 단계 판정 — 정정 반영)이 마일스톤을 만족하면 그 회사 학생 전원에게 같은 금액. 학생마다 마일스톤 하나에 한 번.
 * - 팬텀스톡: Q = 상장가 × Π(1 + Δ) — Δ 는 R&D 마일스톤 계기(특허 · IND · 임상 · 허가 · 투자) 리포트의 적용 변동률. 수급(s) · 수요 배율(M) · 그 밖 계기는 뺀다.
 * - 시간가중 수익률: 외부 보상(성과급 · 팬텀스톡)이 들어오기 직전 순자산으로 구간을 나눈다.
 */
import type { AnalystTriggerKind, ExecutiveMilestone } from '@crista/shared-types';
import { EXECUTIVE_BONUS_CENTS, EXECUTIVE_MILESTONES, PHANTOM_STOCK } from '@crista/shared-types';

/** 마일스톤을 정하는 회사 사실 — 투자는 회사 경제 행, 나머지는 이번 세대 파이프라인(정정 반영 판정). */
export interface ExecutiveFacts {
  investments: readonly ('seriesA' | 'seriesB')[];
  /** 이번 세대에 등록한 특허 수(소멸 포함). */
  patentsFiled: number;
  indApproved: boolean;
  phase1Passed: boolean;
  phase2Passed: boolean;
  phase3Passed: boolean;
  approved: boolean;
}

/** 지금 사실로 달성한 마일스톤(표 순서). */
export function achievedMilestones(f: ExecutiveFacts): ExecutiveMilestone[] {
  const on: Record<ExecutiveMilestone, boolean> = {
    seriesA: f.investments.includes('seriesA'),
    seriesB: f.investments.includes('seriesB'),
    firstPatent: f.patentsFiled > 0,
    indApproved: f.indApproved,
    phase1: f.phase1Passed,
    phase2: f.phase2Passed,
    phase3: f.phase3Passed,
    approval: f.approved,
  };
  return EXECUTIVE_MILESTONES.filter((m) => on[m]);
}

/** 학생 한 명이 받은 성과급 — 마일스톤 → 받은 금액 · 그때 회사. */
export type ExecutiveAwards = Partial<Record<ExecutiveMilestone, { cents: number; teamId: string }>>;

export interface BonusPlan {
  pay: Array<{ milestone: ExecutiveMilestone; cents: number }>;
  /** 이 회사에서 받았는데 사실이 사라진 것(교사 정정 · 복원) — 같은 금액을 회수한다. */
  clawback: Array<{ milestone: ExecutiveMilestone; cents: number }>;
}

/**
 * 학생 하나 · 지금 회사 하나의 정산 계획. 이미 받은 마일스톤은 다시 주지 않는다(다른 회사에서 받았어도 — 학생당 1회).
 * 회수는 **이 회사에서 받은** 것만 — 재창업으로 옮긴 학생의 옛 회사 보상은 건드리지 않는다.
 */
export function planExecutiveBonus(teamId: string, achieved: readonly ExecutiveMilestone[], awards: ExecutiveAwards): BonusPlan {
  const have = new Set(achieved);
  const pay = EXECUTIVE_MILESTONES.filter((m) => have.has(m) && !awards[m]).map((milestone) => ({ milestone, cents: EXECUTIVE_BONUS_CENTS[milestone] }));
  const clawback = EXECUTIVE_MILESTONES.filter((m) => !have.has(m) && awards[m]?.teamId === teamId).map((milestone) => ({ milestone, cents: awards[milestone]!.cents }));
  return { pay, clawback };
}

/** R&D 마일스톤 계기(팬텀스톡 Q 에 들어가는 리포트). */
export const PHANTOM_TRIGGERS: readonly AnalystTriggerKind[] = ['patent', 'ind', 'trial', 'approval', 'investment'];

export function isPhantomTrigger(kind: AnalystTriggerKind): boolean {
  return PHANTOM_TRIGGERS.includes(kind);
}

/** Q 에 리포트 하나를 반영 — Q × (1 + Δ/100). 정정은 `correctedPhantomQ`. */
export function applyPhantomChange(qUsd: number, changePct: number): number {
  return qUsd * (1 + changePct / 100);
}

/** 정정 — 원래 적용한 Δ 를 걷어 내고 새 Δ 를 적용한다(펀더멘털 정정과 같은 방식). */
export function correctedPhantomQ(qUsd: number, appliedPct: number, nextPct: number): number {
  return (qUsd / (1 + appliedPct / 100)) * (1 + nextPct / 100);
}

/** 팬텀스톡 정산액(센트) = min($8,000, ⌊1,000 × max(0, Q정산 − Q부여)⌋) — 달러를 센트로, 센트 미만 버림. */
export function phantomSettleCents(qSettleUsd: number, qGrantUsd: number = PHANTOM_STOCK.grantPriceUsd): number {
  const gain = Math.max(0, qSettleUsd - qGrantUsd);
  return Math.min(PHANTOM_STOCK.capCents, Math.floor(PHANTOM_STOCK.units * gain * 100 + 1e-6));
}

// ─────────────────────────────── 시간가중 수익률 ───────────────────────────────

/** 계좌의 시간가중 상태 — `factor` 지난 구간 수익 배율의 곱 · `baseCents` 지금 구간의 시작 순자산(입금 직후). */
export interface TwrState {
  factor: number;
  baseCents: number;
}

export function initialTwr(seedCents: number): TwrState {
  return { factor: 1, baseCents: seedCents };
}

/** 외부 보상(성과급 · 팬텀스톡 · 회수는 음수) 직전 순자산으로 구간을 닫고, 입금 뒤 순자산으로 새 구간을 연다. */
export function twrAfterFlow(state: TwrState, equityBeforeCents: number, flowCents: number): TwrState {
  const ratio = state.baseCents > 0 ? Math.max(0, equityBeforeCents) / state.baseCents : 1;
  return { factor: state.factor * ratio, baseCents: equityBeforeCents + flowCents };
}

/** 지금 시간가중 수익률(%) — factor × 지금 순자산 / base − 1. */
export function twrReturnPct(state: TwrState, equityCents: number): number {
  const ratio = state.baseCents > 0 ? Math.max(0, equityCents) / state.baseCents : 1;
  return (state.factor * ratio - 1) * 100;
}
