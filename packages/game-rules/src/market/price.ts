/**
 * 가격 · 체결 — 균형안 §9.2.
 *   시장가 P = F × M × (1 + 0.30 × tanh(s / D)),  D = 유통 주식 × 5%
 *   체결 대금 = ∫ P ds = F × M × [Δs + 0.30 × D × (ln cosh(s1/D) − ln cosh(s0/D))]
 * 매수 · 환매수 · 청약은 압력 +, 매도 · 공매도는 압력 −. 매수 · 환매수 대금은 센트 올림, 매도 · 공매도 대금은 센트 내림.
 * 순수 함수 — 시계는 학급 운영 시간(ms)을 인자로 받는다.
 */
import type { OrderSide, QuoteLadderStep } from '@crista/shared-types';
import { FLOW_HALF_LIFE_MS, MARKET_RULES } from './rules.ts';

/** 가격 계산의 입력 — 종목 하나의 지금 상태. */
export interface PriceState {
  /** 펀더멘털 적정가 F(달러). */
  readonly fundamentalUsd: number;
  /** 시장 수요 배율 M(0.70~1.30 으로 자른 값). */
  readonly demand: number;
  /** 순주문 압력 s(주, ±) — 감쇠를 이미 반영한 값. */
  readonly flow: number;
  readonly sharesOutstanding: number;
}

/** 센트 올림 · 내림의 부동소수 오차 허용(센트). 10억 센트에서도 double 오차보다 크고 1센트보다 훨씬 작다. */
const CENT_EPSILON = 1e-6;

/** 깊이 D = 유통 주식 × 5%. */
export function marketDepth(sharesOutstanding: number): number {
  return Math.max(1, sharesOutstanding * MARKET_RULES.depthRatio);
}

/** 시장 수요 배율을 0.70~1.30 으로 자른다(숫자가 아니면 1). */
export function clampDemandMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 1;
  return Math.min(MARKET_RULES.demandMax, Math.max(MARKET_RULES.demandMin, multiplier));
}

/** F 하한($0.10). */
export function floorFundamental(fundamentalUsd: number): number {
  if (!Number.isFinite(fundamentalUsd)) return MARKET_RULES.fundamentalFloorUsd;
  return Math.max(MARKET_RULES.fundamentalFloorUsd, fundamentalUsd);
}

/**
 * 압력 감쇠 — 학급 운영 시간 반감기 30분으로 0 을 향해 줄어든다. 운영 시간이 거꾸로 가면(복원 등) 그대로 둔다.
 * s(t) = s0 × 2^(−Δ운영시간 / 반감기).
 */
export function decayFlow(flow: number, fromOperatingMs: number, toOperatingMs: number): number {
  const dt = toOperatingMs - fromOperatingMs;
  if (!(dt > 0) || flow === 0) return flow;
  return flow * Math.pow(2, -dt / FLOW_HALF_LIFE_MS);
}

/** 수치 안정한 ln cosh(x) = |x| + ln(1 + e^(−2|x|)) − ln 2 — 큰 인자에서 cosh 가 넘치지 않는다. */
export function lnCosh(x: number): number {
  const a = Math.abs(x);
  return a + Math.log1p(Math.exp(-2 * a)) - Math.LN2;
}

/** 수급 보정 비율 = 0.30 × tanh(s/D) (−0.30 ~ +0.30). */
export function flowPremium(flow: number, sharesOutstanding: number): number {
  return MARKET_RULES.flowBand * Math.tanh(flow / marketDepth(sharesOutstanding));
}

/** 시장가(달러) — 반올림하지 않는다. */
export function marketPrice(state: PriceState): number {
  return state.fundamentalUsd * state.demand * (1 + flowPremium(state.flow, state.sharesOutstanding));
}

/** 수급 보정(%) = 30 × tanh(s/D). */
export function flowPct(state: PriceState): number {
  return flowPremium(state.flow, state.sharesOutstanding) * 100;
}

/** ∫_{s0}^{s1} P ds (달러, s1 < s0 이면 음수). 닫힌 식. */
export function flowIntegralUsd(state: Omit<PriceState, 'flow'>, s0: number, s1: number): number {
  const d = marketDepth(state.sharesOutstanding);
  const base = s1 - s0 + MARKET_RULES.flowBand * d * (lnCosh(s1 / d) - lnCosh(s0 / d));
  return state.fundamentalUsd * state.demand * base;
}

/** 센트 올림(학생이 내는 돈). */
export function ceilCents(usd: number): number {
  return Math.ceil(usd * 100 - CENT_EPSILON);
}

/** 센트 내림(학생이 받는 돈). */
export function floorCents(usd: number): number {
  return Math.floor(usd * 100 + CENT_EPSILON);
}

/** 압력을 +q 만큼 올리는 체결(매수 · 환매수 · 청약 아님 — 청약은 발행가 고정)의 대금(센트, 올림). */
export function buyCostCents(state: PriceState, shares: number): number {
  if (shares <= 0) return 0;
  return ceilCents(flowIntegralUsd(state, state.flow, state.flow + shares));
}

/** 압력을 −q 만큼 내리는 체결(매도 · 공매도)의 대금(센트, 내림). */
export function sellProceedsCents(state: PriceState, shares: number): number {
  if (shares <= 0) return 0;
  return floorCents(flowIntegralUsd(state, state.flow - shares, state.flow));
}

/** 방향의 압력 부호 — 매수 · 환매수 +1, 매도 · 공매도 −1. */
export function sideFlowSign(side: OrderSide): 1 | -1 {
  return side === 'buy' || side === 'cover' ? 1 : -1;
}

/** 현금이 줄어드는 방향인가(매수 · 환매수). */
export function sidePays(side: OrderSide): boolean {
  return side === 'buy' || side === 'cover';
}

export interface FillQuote {
  readonly side: OrderSide;
  readonly shares: number;
  /** 현금 변화(센트, 음수 = 지출). */
  readonly cashCents: number;
  /** 평균 체결가 = |대금| / 수량(달러). */
  readonly avgPriceUsd: number;
  readonly flowBefore: number;
  readonly flowAfter: number;
  readonly priceBeforeUsd: number;
  readonly priceAfterUsd: number;
}

/** 시장가 체결 견적 — 대금 · 평균가 · 체결 뒤 압력과 가격. */
export function quoteFill(state: PriceState, side: OrderSide, shares: number): FillQuote {
  const pays = sidePays(side);
  const amount = pays ? buyCostCents(state, shares) : sellProceedsCents(state, shares);
  const flowAfter = state.flow + sideFlowSign(side) * shares;
  return {
    side,
    shares,
    cashCents: pays ? -amount : amount,
    avgPriceUsd: shares > 0 ? amount / 100 / shares : 0,
    flowBefore: state.flow,
    flowAfter,
    priceBeforeUsd: marketPrice(state),
    priceAfterUsd: marketPrice({ ...state, flow: flowAfter }),
  };
}

/** 사다리 한 칸 — 이 수량을 지금 사고팔 때의 평균가(달러). */
export function averageFillPrices(state: PriceState, shares: number): QuoteLadderStep {
  return {
    shares,
    buyAvgUsd: buyCostCents(state, shares) / 100 / shares,
    sellAvgUsd: sellProceedsCents(state, shares) / 100 / shares,
  };
}

/** 사다리(100 · 1,000 · 10,000주). */
export function quoteLadder(state: PriceState): QuoteLadderStep[] {
  return MARKET_RULES.ladderShares.map((q) => averageFillPrices(state, q));
}

/**
 * 대금 → 수량: 이 예산(센트)으로 살 수 있는 가장 많은 주식(매수 대금 ≤ 예산). 이분법.
 * `maxShares` 를 넘지 않는다.
 */
export function sharesForBudget(state: PriceState, budgetCents: number, maxShares: number = Number.MAX_SAFE_INTEGER): number {
  if (!(budgetCents > 0)) return 0;
  let lo = 0;
  // 위 한계: 시장가의 하한(F×M×0.7)으로 나눈 값이면 충분하다.
  const minUnit = state.fundamentalUsd * state.demand * (1 - MARKET_RULES.flowBand);
  let hi = Math.min(maxShares, Math.ceil(budgetCents / 100 / Math.max(minUnit, 1e-9)) + 1);
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (buyCostCents(state, mid) <= budgetCents) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 받을 돈 → 수량: 매도 대금이 목표(센트) 이상이 되는 가장 적은 주식 — 강제 매도(빚을 0 으로 맞추기)에 쓴다. 이분법.
 * `maxShares` 를 팔아도 모자라면 maxShares.
 */
export function sharesToRaise(state: PriceState, targetCents: number, maxShares: number): number {
  if (!(targetCents > 0) || maxShares <= 0) return 0;
  if (sellProceedsCents(state, maxShares) < targetCents) return maxShares;
  let lo = 1;
  let hi = maxShares;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sellProceedsCents(state, mid) >= targetCents) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** 보호 한도 판정 — 매수 · 환매수는 평균가가 한도보다 비싸면, 매도 · 공매도는 한도보다 싸면 체결하지 않는다(`price_moved`). */
export function violatesLimit(side: OrderSide, avgPriceUsd: number, limitPriceUsd: number | undefined): boolean {
  if (limitPriceUsd === undefined || !Number.isFinite(limitPriceUsd)) return false;
  return sidePays(side) ? avgPriceUsd > limitPriceUsd : avgPriceUsd < limitPriceUsd;
}

/** 시가총액(센트, 내림) = 시장가 × 유통 주식. */
export function marketCapCents(priceUsd: number, sharesOutstanding: number): number {
  return floorCents(priceUsd * sharesOutstanding);
}
