/**
 * 유지비 정산 · 자금 경고 · 회생 유예 · 투자 · 재창업 — 순수 규칙(M3).
 * 단일 소스: `docs/2026-10-19-game-balance-v0.md` §3(유지비) · §3.1(투자) · §4(경고 · 회생 · 파산 · 재창업), M3 브리프 §4.3 · §4.4.
 *
 * - 금액은 전부 정수 센트. 시각은 인자로 받는다.
 * - 서버는 이 함수들의 결과를 **팀 행 잠금 아래 한 트랜잭션**으로 저장한다(브리프 §4.3). 여기서는 계산만 한다.
 */
import type {
  CashStatusView,
  DistrictType,
  FacilityKind,
  FacilityRunState,
  FacilityTier,
  GraceView,
  InvestmentMilestone,
  UpkeepBreakdownView,
} from '@crista/shared-types';
import {
  CASH_ALERT_FRAME,
  GAME_DAYS_PER_MONTH,
  GRACE_PERIOD_REAL_MINUTES,
  INVESTMENT_AMOUNT_CENTS,
  RECOVERY_REQUIRED_GAME_MONTHS,
  RESTRUCTURE_BLOCKED_ACTIONS,
  VC_DISTRICT_INVESTMENT_BONUS_RATE,
  clampEventMultiplier,
  evaluateCashStatus,
  facilitySaleRefundCents,
  monthlyUpkeepBreakdown,
  recoveryRequirementCents,
  refoundingGrantCents,
  type Cents,
  type FacilitySlot,
  type UpkeepMultipliers,
} from './economy.ts';

const MS_PER_MINUTE = 60_000;

const FACILITY_KINDS: readonly FacilityKind[] = ['target', 'htvs', 'docking', 'admet', 'security'];

// ─────────────────────────────── 월 유지비 ───────────────────────────────

export interface TeamUpkeepInput {
  readonly district: DistrictType;
  /** 설비별 등급. 0 = 평면도(미건설) — 유지비 없음. */
  readonly facilities: Readonly<Record<FacilityKind, FacilityTier>>;
  /** 설비별 가동 상태. 키가 없으면 가동 중(active). */
  readonly facilityStates?: Readonly<Partial<Record<FacilityKind, FacilityRunState>>>;
  /** 전문 연구원 수. */
  readonly researchers: number;
  /** 그 날 적용 중인 유지비 배율(`costMultipliersAt(...).upkeep`). 항목마다 0.70~1.30 으로 자른다. */
  readonly multipliers?: UpkeepMultipliers;
}

/**
 * 팀의 게임 1개월 유지비 내역(센트, 배율 반영) — 균형안 §3.2.
 * 임대료(지구) + Σ 설비(등급 1 = 기본, 등급 2 = 기본 + 1단계 업그레이드 $0.005M, 가동 중지면 20%) + 연구원 × $0.020M.
 * 등급 0 설비는 유지비가 없다. `multipliers` 는 1 인 항목을 생략한다.
 */
export function teamUpkeep(input: TeamUpkeepInput): UpkeepBreakdownView {
  const slots: FacilitySlot[] = [];
  for (const kind of FACILITY_KINDS) {
    const tier = input.facilities[kind] ?? 0;
    if (tier <= 0) continue;
    // TODO(균형안 미정): 등급 3 의 유지비. 균형안은 1단계 업그레이드(+$0.005M)만 적었고 facilityActionQuote 도
    // 등급 2 → 3 을 막는다. 등급 3 이 들어오면 1단계 업그레이드 한 번분만 더한다(수치를 만들지 않는다).
    const upgradeTier1Count = tier >= 2 ? 1 : 0;
    slots.push({ kind, active: input.facilityStates?.[kind] !== 'idle', upgradeTier1Count });
  }
  const m = input.multipliers ?? {};
  const b = monthlyUpkeepBreakdown({
    district: input.district,
    facilities: slots,
    researchers: input.researchers,
    multipliers: m,
  });
  const multipliers: UpkeepBreakdownView['multipliers'] = {};
  for (const key of ['facility', 'rent', 'staff'] as const) {
    const v = clampEventMultiplier(m[key] ?? 1);
    if (v !== 1) multipliers[key] = v;
  }
  return {
    rentCents: b.rentCents,
    facilityCents: b.facilityCents,
    staffCents: b.staffCents,
    totalCents: b.totalCents,
    multipliers,
  };
}

// ─────────────────────────────── 하루 단위 정산 ───────────────────────────────

export interface UpkeepPlan {
  /** 이번에 청구할 금액(정수 센트). */
  readonly dueCents: Cents;
  /** 새 센트 미만 잔여(0 이상 1 미만) — `biotech_teams.upkeep_remainder`. */
  readonly remainder: number;
  /** 청구한 날 수(= toDay − settledDay, 음수면 0). */
  readonly days: number;
}

/**
 * 하루 단위 정산 계획 — 브리프 §4.3.
 * 날 d(0부터)는 게임 일 구간 [d, d+1) 이고 `settledDay` = 이미 청구한 날 수(= 다음에 청구할 날 번호)다.
 * 이번에 d = settledDay … toDay−1 을 청구하고, 날 d 의 비용 = `monthlyCentsForDay(d)` / 30.
 * 센트 미만은 `remainder` 로 넘긴다(`accrueUpkeep` 와 같은 규칙 — 내림 청구, 잔여 누적).
 * 계산은 1/30 센트 단위 정수로 해서 30일 = 월 유지비가 정확히 맞는다(월 유지비는 정수 센트로 반올림해 쓴다).
 */
export function planUpkeep(input: {
  readonly settledDay: number;
  readonly remainder: number;
  readonly toDay: number;
  readonly monthlyCentsForDay: (day: number) => number;
}): UpkeepPlan {
  const from = Math.max(0, Math.floor(input.settledDay));
  const to = Math.floor(input.toDay);
  const rem = Number.isFinite(input.remainder) ? Math.min(Math.max(input.remainder, 0), 1) : 0;
  // 잔여를 1/30 센트 단위 정수로. 이 모듈이 만든 잔여는 정확히 k/30 이다.
  let remNum = Math.min(GAME_DAYS_PER_MONTH - 1, Math.round(rem * GAME_DAYS_PER_MONTH));
  if (to <= from) return { dueCents: 0, remainder: remNum / GAME_DAYS_PER_MONTH, days: 0 };
  let due = 0;
  for (let d = from; d < to; d++) {
    const monthly = Math.max(0, Math.round(input.monthlyCentsForDay(d)));
    const num = remNum + monthly;
    const charged = Math.floor(num / GAME_DAYS_PER_MONTH);
    due += charged;
    remNum = num - charged * GAME_DAYS_PER_MONTH;
  }
  return { dueCents: due, remainder: remNum / GAME_DAYS_PER_MONTH, days: to - from };
}

export interface UpkeepPayment {
  /** 실제로 잔액에서 뺀 금액(원장 `upkeep`). */
  readonly paidCents: Cents;
  readonly balanceAfter: Cents;
  readonly unpaidAfter: Cents;
  /** 이번 청구 중 못 낸 금액(미지급에 더한 금액). 0 보다 크면 구조조정 · (유예가 없으면) 유예 시작. */
  readonly shortfallCents: Cents;
}

/** 유지비 지불 — 잔액에서 낼 수 있는 만큼 내고 나머지는 미지급에 더한다. 잔액은 음수가 되지 않는다. */
export function payUpkeep(input: {
  readonly balanceCents: Cents;
  readonly unpaidCents: Cents;
  readonly dueCents: Cents;
}): UpkeepPayment {
  const due = Math.max(0, input.dueCents);
  const paid = Math.min(Math.max(0, input.balanceCents), due);
  const shortfall = due - paid;
  return {
    paidCents: paid,
    balanceAfter: input.balanceCents - paid,
    unpaidAfter: Math.max(0, input.unpaidCents) + shortfall,
    shortfallCents: shortfall,
  };
}

/**
 * 미지급 정산액 — 돈이 들어온 직후(같은 트랜잭션) 잔액으로 미지급부터 낸다(원장 `upkeep_arrears`).
 * = min(잔액, 미지급). 입금 뒤 잔액을 넘긴다.
 */
export function arrearsPayment(input: { readonly balanceCents: Cents; readonly unpaidCents: Cents }): Cents {
  return Math.min(Math.max(0, input.balanceCents), Math.max(0, input.unpaidCents));
}

// ─────────────────────────────── 회생 유예 ───────────────────────────────

/** 유예 총 길이(분) = 48시간(2880분) + 교사 조정 합. 0 미만이 되지 않는다. */
export function graceLimitMinutes(adjustMinutes: number): number {
  return Math.max(0, GRACE_PERIOD_REAL_MINUTES + adjustMinutes);
}

/** 남은 유예 운영 시간(ms, 0 이상). */
export function graceRemainingMs(input: {
  readonly startedOperatingMs: number;
  readonly adjustMinutes: number;
  readonly operatingNowMs: number;
}): number {
  const elapsed = Math.max(0, input.operatingNowMs - input.startedOperatingMs);
  return Math.max(0, graceLimitMinutes(input.adjustMinutes) * MS_PER_MINUTE - elapsed);
}

/**
 * 교사 유예 조정 검증 — 조정 뒤 총 길이(48시간 + 조정 합)가 0 미만이면 거절(gm.ts `GmGraceAdjustRequest`).
 * 성공이면 새 조정 합(분)을 돌려준다.
 */
export function applyGraceAdjust(
  currentAdjustMinutes: number,
  deltaMinutes: number,
): { readonly ok: true; readonly adjustMinutes: number } | { readonly ok: false; readonly reason: 'negative_limit' | 'invalid_minutes' } {
  if (!Number.isInteger(deltaMinutes) || deltaMinutes === 0) return { ok: false, reason: 'invalid_minutes' };
  const next = currentAdjustMinutes + deltaMinutes;
  if (GRACE_PERIOD_REAL_MINUTES + next < 0) return { ok: false, reason: 'negative_limit' };
  return { ok: true, adjustMinutes: next };
}

export type GraceDecision = 'none' | 'start' | 'continue' | 'recovered' | 'bankrupt';

/**
 * 유예 판정 — 브리프 §4.4, 균형안 §4.
 * - 유예 없음: 미지급 > 0 → 'start'(시작 운영 시간 = operatingNowMs 를 적는다), 아니면 'none'.
 * - 유예 중: 미지급 = 0 이고 잔액 ≥ 월 유지비 × 3 → 'recovered'(**만료 판정보다 먼저**),
 *   경과 운영 시간 ≥ 48시간 + 조정 → 'bankrupt', 그 밖 'continue'.
 * 운영 시간은 일시정지 동안 늘지 않으므로 일시정지 중에는 만료되지 않는다.
 */
export function graceDecision(input: {
  readonly unpaidCents: Cents;
  readonly balanceCents: Cents;
  readonly monthlyUpkeepCents: Cents;
  readonly grace: { readonly startedOperatingMs: number; readonly adjustMinutes: number } | null;
  readonly operatingNowMs: number;
}): GraceDecision {
  if (input.grace === null) return input.unpaidCents > 0 ? 'start' : 'none';
  const recovered =
    input.unpaidCents <= 0 &&
    input.balanceCents >= Math.max(0, input.monthlyUpkeepCents) * RECOVERY_REQUIRED_GAME_MONTHS;
  if (recovered) return 'recovered';
  const remaining = graceRemainingMs({
    startedOperatingMs: input.grace.startedOperatingMs,
    adjustMinutes: input.grace.adjustMinutes,
    operatingNowMs: input.operatingNowMs,
  });
  return remaining <= 0 ? 'bankrupt' : 'continue';
}

// ─────────────────────────────── 자금 상태 보기 ───────────────────────────────

export interface GraceRecord {
  /** 유예 시작 현실 시각(표시용) — `grace_started_at`. */
  readonly startedAtMs: number;
  /** 유예 시작 때 학급 운영 시간 — `grace_started_operating_ms`. */
  readonly startedOperatingMs: number;
  /** 교사 조정 합(분, ±) — `grace_adjust_minutes`. */
  readonly adjustMinutes: number;
  /** 조정 이력(표시용, gm_actions 에서). */
  readonly adjustments?: GraceView['adjustments'];
}

/**
 * shared-types `CashStatusView` — 서버 판정(브리프 §4.4).
 * level: 유예 중 → grace · 미지급 > 0 또는 잔액 < 월 유지비 → restructure · 운영 가능 < 3게임 월 → crisis · < 6 → notice · 그 밖 normal.
 * runwayGameMonths 는 월 유지비가 0 이면 null. 막힌 행동은 restructure · grace 일 때 paidWork · facilityPurchase · hiring.
 * grace 칸: 남은 운영 시간 · counting(= 학급이 일시정지가 아님) · 회생 필요액(미지급 + 월 유지비 × 3) · 부족액.
 */
export function cashStatusView(input: {
  /** 회사 잔액 = 가용 현금(비용은 요청 때 이미 차감한다). */
  readonly balanceCents: Cents;
  /** 지금 월 유지비(배율 반영 — `teamUpkeep(...).totalCents`). */
  readonly monthlyUpkeepCents: Cents;
  readonly unpaidCents: Cents;
  readonly grace: GraceRecord | null;
  /** 학급의 지금 운영 시간(`operatingMsAt`). */
  readonly operatingNowMs: number;
  /** 학급 일시정지 여부 — 유예 카운트가 멈췄는지. */
  readonly paused: boolean;
  readonly asOfMs: number;
}): CashStatusView {
  const status = evaluateCashStatus({
    cashCents: input.balanceCents,
    reservedCents: 0,
    monthlyUpkeepCents: input.monthlyUpkeepCents,
    unpaidCents: input.unpaidCents,
    graceActive: input.grace !== null,
  });
  let grace: GraceView | null = null;
  if (input.grace !== null) {
    const recoveryRequiredCents = recoveryRequirementCents({
      unpaidCents: input.unpaidCents,
      adjustedMonthlyUpkeepCents: input.monthlyUpkeepCents,
    });
    grace = {
      startedAtMs: input.grace.startedAtMs,
      limitMinutes: graceLimitMinutes(input.grace.adjustMinutes),
      remainingMs: graceRemainingMs({
        startedOperatingMs: input.grace.startedOperatingMs,
        adjustMinutes: input.grace.adjustMinutes,
        operatingNowMs: input.operatingNowMs,
      }),
      counting: !input.paused,
      asOfMs: input.asOfMs,
      recoveryRequiredCents,
      shortfallCents: Math.max(0, recoveryRequiredCents - status.availableCents),
      adjustments: [...(input.grace.adjustments ?? [])],
    };
  }
  const blocking = status.level === 'restructure' || status.level === 'grace';
  return {
    level: status.level,
    frameKey: CASH_ALERT_FRAME[status.level],
    availableCents: status.availableCents,
    runwayGameMonths: input.monthlyUpkeepCents > 0 ? status.runwayGameMonths : null,
    unpaidCents: Math.max(0, input.unpaidCents),
    grace,
    blocked: blocking ? [...RESTRUCTURE_BLOCKED_ACTIONS] : [],
  };
}

// ─────────────────────────────── 투자 · 매각 · 재창업 ───────────────────────────────

/** 투자금(센트) — Series A $3.000M · Series B $5.000M, VC 지구면 +15%(균형안 §3.1 · §3.2). 중복 지급 방지는 서버의 멱등 키. */
export function investmentCents(milestone: InvestmentMilestone, district: DistrictType): Cents {
  const bonus = district === 'vc' ? VC_DISTRICT_INVESTMENT_BONUS_RATE : 0;
  return Math.round(INVESTMENT_AMOUNT_CENTS[milestone] * (1 + bonus));
}

/** 설비 매각 회수액(센트) = 그 설비에 실제 낸 설치 · 업그레이드 비용의 50%(균형안 §3.2). 시드 설비는 낸 돈 0 → 0. */
export function facilitySaleCents(paidCents: Cents): Cents {
  return facilitySaleRefundCents(paidCents);
}

/**
 * 재창업 지원금(센트) — 계보의 n 번째 재창업(1부터)이면 n = 1 만 $2.500M, n ≥ 2 는 0(균형안 §4 "학급당 팀별 1회").
 * 0 이면 서버는 원장 줄을 만들지 않는다.
 */
export function refoundGrantCents(refoundIndex: number): Cents {
  if (!Number.isInteger(refoundIndex) || refoundIndex < 1) return 0;
  return refoundingGrantCents(refoundIndex - 1);
}

/** 재창업 회사 id 규칙 — `<lineageId>-r<n>`(브리프 §4.4). */
export function refoundTeamId(lineageId: string, refoundIndex: number): string {
  return `${lineageId}-r${refoundIndex}`;
}
