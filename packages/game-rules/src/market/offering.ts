/**
 * 유상증자 · 거래 정지 · 상장 폐지 정리 — 균형안 §9.5.
 * 시간은 모두 학급 운영 시간(ms) — 일시정지 동안 멈춘다.
 */
import type { CompanyStatus, ErrorCode, ListingStatus } from '@crista/shared-types';
import { ceilCents, floorCents } from './price.ts';
import { MARKET_RULES, OFFERING_COOLDOWN_MS, OFFERING_WINDOW_MS, SUSPENSION_SETTLE_MS } from './rules.ts';

export interface OfferingLimits {
  readonly minShares: number;
  readonly maxShares: number;
}

/** 1회 발행 한도 — 유통 주식의 20%(내림), 최소 10,000주. */
export function offeringLimits(sharesOutstanding: number): OfferingLimits {
  return {
    minShares: MARKET_RULES.offering.minShares,
    maxShares: Math.floor(sharesOutstanding * MARKET_RULES.offering.maxSharesRatio),
  };
}

/** 발행가 = 공시 시점 시장가 × (1 − 10%), 센트 내림(최소 $0.01). */
export function offeringPriceUsd(marketPriceUsd: number): number {
  const cents = Math.floor(marketPriceUsd * (1 - MARKET_RULES.offering.discountRatio) * 100 + 1e-6);
  return Math.max(1, cents) / 100;
}

/** 1인 청약 상한 = 발행 주식의 25%(내림, 최소 1주). */
export function offeringPerInvestorCap(sharesOffered: number): number {
  return Math.max(1, Math.floor(sharesOffered * MARKET_RULES.offering.perInvestorCapRatio));
}

/** 청약 마감 운영 시각. */
export function offeringClosesAt(openedOperatingMs: number): number {
  return openedOperatingMs + OFFERING_WINDOW_MS;
}

/** 다음 증자를 열 수 있는 운영 시각(직전 마감 + 60분). 직전 증자가 없으면 null. */
export function nextOfferingAllowedAt(lastClosedOperatingMs: number | null): number | null {
  return lastClosedOperatingMs === null ? null : lastClosedOperatingMs + OFFERING_COOLDOWN_MS;
}

export type OfferingCheck = { readonly ok: true } | { readonly ok: false; readonly code: ErrorCode; readonly message: string; readonly retryable: boolean };

/** 증자 신청 판정 — 운영 중 회사 · 상장 중 종목 · 열린 증자 없음 · 대기 시간 · 수량 한도(구조조정 · 유예 중에도 된다 — §4 회생 수단). */
export function checkOfferingCreate(input: {
  readonly marketOpen: boolean;
  readonly companyStatus: CompanyStatus;
  readonly listingStatus: ListingStatus;
  readonly hasOpenOffering: boolean;
  readonly lastClosedOperatingMs: number | null;
  readonly nowOperatingMs: number;
  readonly shares: number;
  readonly sharesOutstanding: number;
}): OfferingCheck {
  if (!input.marketOpen) return { ok: false, code: 'class_paused', message: '학급이 일시정지 중이라 시장이 닫혀 있습니다.', retryable: true };
  if (input.companyStatus !== 'active') return { ok: false, code: 'company_bankrupt', message: '파산한 회사는 유상증자를 할 수 없습니다.', retryable: false };
  if (input.listingStatus !== 'listed') return { ok: false, code: 'trading_halted', message: '거래 정지 · 상장 폐지된 종목입니다.', retryable: false };
  if (input.hasOpenOffering) return { ok: false, code: 'offering_cooldown', message: '이미 청약 중인 유상증자가 있습니다.', retryable: false };
  const allowedAt = nextOfferingAllowedAt(input.lastClosedOperatingMs);
  if (allowedAt !== null && input.nowOperatingMs < allowedAt) {
    const minutes = Math.ceil((allowedAt - input.nowOperatingMs) / 60_000);
    return { ok: false, code: 'offering_cooldown', message: `직전 증자 마감 뒤 운영 시간 ${MARKET_RULES.offering.cooldownMinutes}분이 지나야 합니다(남은 ${minutes}분).`, retryable: true };
  }
  const limits = offeringLimits(input.sharesOutstanding);
  if (!Number.isInteger(input.shares) || input.shares < limits.minShares || input.shares > limits.maxShares) {
    return {
      ok: false,
      code: 'offering_limit',
      message: `발행 수량은 ${limits.minShares.toLocaleString('en-US')}~${limits.maxShares.toLocaleString('en-US')}주입니다(유통 주식의 20%).`,
      retryable: false,
    };
  }
  return { ok: true };
}

/** 청약 대금(센트) — 발행가(센트 단위로 딱 떨어진다) × 수량. */
export function subscriptionCostCents(priceUsd: number, shares: number): number {
  return Math.round(priceUsd * 100) * shares;
}

/** 청약 판정 — 열림 · 기간 · 남은 수량 · 1인 상한 · 자기 회사 · 음수 현금 · 현금. */
export function checkSubscription(input: {
  readonly marketOpen: boolean;
  readonly offeringStatus: 'open' | 'closed' | 'voided';
  readonly listingStatus: ListingStatus;
  readonly nowOperatingMs: number;
  readonly closesOperatingMs: number;
  readonly sharesOffered: number;
  readonly sharesSold: number;
  readonly perInvestorCap: number;
  readonly alreadySubscribed: number;
  readonly shares: number;
  readonly priceUsd: number;
  readonly cashCents: number;
  readonly ownCompany: boolean;
}): OfferingCheck {
  if (!Number.isInteger(input.shares) || input.shares < MARKET_RULES.minOrderShares || input.shares > MARKET_RULES.maxOrderShares) {
    return { ok: false, code: 'bad_request', message: '청약 수량은 1~100,000주 정수입니다.', retryable: false };
  }
  if (!input.marketOpen) return { ok: false, code: 'class_paused', message: '학급이 일시정지 중이라 시장이 닫혀 있습니다.', retryable: true };
  if (input.ownCompany) return { ok: false, code: 'self_trade_forbidden', message: '자기 회사 증자에는 청약할 수 없습니다.', retryable: false };
  if (input.listingStatus !== 'listed') return { ok: false, code: 'trading_halted', message: '거래 정지 · 상장 폐지된 종목입니다.', retryable: false };
  if (input.offeringStatus !== 'open' || input.nowOperatingMs >= input.closesOperatingMs || input.sharesSold >= input.sharesOffered) {
    return { ok: false, code: 'offering_closed', message: '청약 기간이 끝났거나 다 팔린 증자입니다.', retryable: false };
  }
  if (input.shares > input.sharesOffered - input.sharesSold) {
    return { ok: false, code: 'offering_limit', message: `남은 수량은 ${(input.sharesOffered - input.sharesSold).toLocaleString('en-US')}주입니다.`, retryable: false };
  }
  if (input.alreadySubscribed + input.shares > input.perInvestorCap) {
    return { ok: false, code: 'offering_limit', message: `한 사람은 ${input.perInvestorCap.toLocaleString('en-US')}주까지 청약할 수 있습니다(발행 주식의 25%).`, retryable: false };
  }
  if (input.cashCents < 0) return { ok: false, code: 'margin_insufficient', message: '계좌 현금이 음수라 청약할 수 없습니다.', retryable: false };
  if (subscriptionCostCents(input.priceUsd, input.shares) > input.cashCents) {
    return { ok: false, code: 'insufficient_funds', message: '계좌 현금이 모자랍니다.', retryable: false };
  }
  return { ok: true };
}

/** 희석 — 청약 체결마다 F ← (F × N + 대금) / (N + q). 대금은 달러. 나눠 체결해도 결과가 같다(경로 무관). */
export function dilutedFundamental(fundamentalUsd: number, sharesOutstanding: number, proceedsUsd: number, newShares: number): number {
  if (newShares <= 0) return fundamentalUsd;
  return (fundamentalUsd * sharesOutstanding + proceedsUsd) / (sharesOutstanding + newShares);
}

/** 청약 기간이 끝났는가(운영 시간 또는 다 팔림). */
export function isOfferingOver(input: { nowOperatingMs: number; closesOperatingMs: number; sharesSold: number; sharesOffered: number }): boolean {
  return input.nowOperatingMs >= input.closesOperatingMs || input.sharesSold >= input.sharesOffered;
}

// ─────────────────────────────── 정지 · 정리 ───────────────────────────────

/** 정지 뒤 정리할 때가 됐는가 — 정지 운영 시각 + 24시간. */
export function isSettlementDue(suspendedOperatingMs: number | null, nowOperatingMs: number): boolean {
  return suspendedOperatingMs !== null && nowOperatingMs - suspendedOperatingMs >= SUSPENSION_SETTLE_MS;
}

/** 정리까지 남은 운영 시간(ms, 0 이상). */
export function settlementRemainingMs(suspendedOperatingMs: number, nowOperatingMs: number): number {
  return Math.max(0, suspendedOperatingMs + SUSPENSION_SETTLE_MS - nowOperatingMs);
}

/** 정리가(달러) = max(0, 회사 잔액 − 미지급) / 유통 주식. */
export function settlementPriceUsd(balanceCents: number, unpaidCents: number, sharesOutstanding: number): number {
  if (sharesOutstanding <= 0) return 0;
  return Math.max(0, balanceCents - unpaidCents) / 100 / sharesOutstanding;
}

/** 정리 현금(센트) — 롱은 정리가로 받고(내림 +), 숏은 정리가로 갚는다(올림 −). */
export function settlementCashCents(position: { longShares: number; shortShares: number }, settlePriceUsd: number): number {
  if (position.longShares > 0) return floorCents(position.longShares * settlePriceUsd);
  if (position.shortShares > 0) return -ceilCents(position.shortShares * settlePriceUsd);
  return 0;
}
