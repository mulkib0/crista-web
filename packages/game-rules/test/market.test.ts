/**
 * 증시 순수 규칙(M4 · M5) — 균형안 §9 · §10.7 · M4 브리프 §5.2 · M5 브리프 §6.1. 균형안 §9.6 · §10.7 산술 점검을 그대로 재현한다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CANDLE_MS,
  FLOW_HALF_LIFE_MS,
  MARKET_RULES,
  OFFERING_COOLDOWN_MS,
  OFFERING_WINDOW_MS,
  SUSPENSION_SETTLE_MS,
  APPROVAL_CAP_PCT,
  FORMULATION_MARKET_MULTIPLIER,
  PIPELINE_ANALYST_BANDS,
  analystBand,
  analystFallback,
  analystPipelineOutcomeOf,
  approvalDefaultChangePct,
  applyFundamentalChange,
  breachesMaintenance,
  buyCostCents,
  changePct24h,
  checkOfferingCreate,
  checkOrder,
  checkSubscription,
  clampAnalystOutput,
  clampDemandMultiplier,
  correctedFundamental,
  decayFlow,
  defaultAnalystChangePct,
  defaultAnalystRating,
  dilutedFundamental,
  dockingChangePctFor,
  flowIntegralUsd,
  formatChangePct,
  isSettlementDue,
  lnCosh,
  marketDepth,
  marketPrice,
  marketRulesView,
  mergeAnalystBands,
  offeringLimits,
  offeringPerInvestorCap,
  offeringPriceUsd,
  planForcedLiquidation,
  pruneCandles,
  quoteFill,
  quoteLadder,
  rankInvestors,
  rankMarketCap,
  runSqueezeLoop,
  sellProceedsCents,
  settlementCashCents,
  settlementPriceUsd,
  sharesForBudget,
  sharesToRaise,
  shouldMergeTriggers,
  subscriptionCostCents,
  updateCandles,
  valueAccount,
  violatesLimit,
  type AccountState,
  type AnalystFallbackInput,
  type ListingMark,
  type PriceState,
} from '../src/index.ts';
import type { AnalystTriggerKind, ListingStatus } from '@crista/shared-types';

const fresh: PriceState = { fundamentalUsd: 10, demand: 1, flow: 0, sharesOutstanding: 1_000_000 };
const SEED = MARKET_RULES.seedCents;
const close = (a: number, b: number, eps: number, msg?: string) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} ≈ ${b}`);
const round2 = (x: number) => Math.round(x * 100) / 100;

describe('상수 — 균형안 §9.1~§9.5', () => {
  test('MARKET_RULES 와 MarketRulesView', () => {
    assert.equal(MARKET_RULES.initialPriceUsd, 10);
    assert.equal(MARKET_RULES.initialShares, 1_000_000);
    assert.equal(SEED, 10_000_000, '$100,000');
    assert.equal(marketDepth(1_000_000), 50_000, 'D = 5%');
    assert.equal(FLOW_HALF_LIFE_MS, 30 * 60_000);
    assert.equal(OFFERING_WINDOW_MS, 10 * 60_000);
    assert.equal(OFFERING_COOLDOWN_MS, 60 * 60_000);
    assert.equal(SUSPENSION_SETTLE_MS, 24 * 3_600_000);
    const view = marketRulesView();
    assert.deepEqual(view, {
      economyVersion: 'balance-v0',
      seedCents: 10_000_000,
      flowBandPct: 30,
      depthRatio: 0.05,
      flowHalfLifeMinutes: 30,
      shortInitialMarginRatio: 1,
      shortMaintenanceRatio: 0.3,
      shortInterestCapPct: 20,
      maxOrderShares: 100_000,
      offering: { discountPct: 10, maxSharesRatio: 0.2, minShares: 10_000, windowMinutes: 10, cooldownMinutes: 60, perInvestorCapRatio: 0.25 },
      suspensionSettleHours: 24,
    });
  });
});

describe('가격 · 체결 — §9.2', () => {
  test('ln cosh 는 큰 인자에서 넘치지 않는다', () => {
    close(lnCosh(0.1), Math.log(Math.cosh(0.1)), 1e-15);
    close(lnCosh(-3), Math.log(Math.cosh(3)), 1e-12);
    assert.ok(Number.isFinite(lnCosh(1e6)));
    close(lnCosh(1e6), 1e6 - Math.LN2, 1e-6);
    // 압력이 아주 커도 대금이 유한하고 단조롭다.
    const big = { ...fresh, flow: 1e9 };
    assert.ok(Number.isFinite(buyCostCents(big, 100_000)));
    close(buyCostCents(big, 100_000) / 100 / 100_000, 13, 1e-6, '밴드 끝 $13.00');
  });

  test('수급 항은 ±30% 를 넘지 않는다(밴드)', () => {
    for (const flow of [-1e9, -1e6, -50_000, 0, 50_000, 1e6, 1e9]) {
      const p = marketPrice({ ...fresh, flow });
      assert.ok(p >= 7 - 1e-9 && p <= 13 + 1e-9, `${flow} → ${p}`);
    }
  });

  test('§9.6 — $10.00 · 압력 0 에서 $100,000 로 사면 9,718주 · 평균 $10.29 · 체결 뒤 $10.58(+5.8%)', () => {
    const q = sharesForBudget(fresh, SEED);
    assert.equal(q, 9_718);
    const cost = buyCostCents(fresh, q);
    assert.equal(cost, 9_999_553, '$99,995.53');
    assert.ok(buyCostCents(fresh, q + 1) > SEED, '한 주 더는 예산을 넘는다');
    assert.equal(round2(cost / 100 / q), 10.29);
    const fill = quoteFill(fresh, 'buy', q);
    assert.equal(fill.cashCents, -cost);
    assert.equal(round2(fill.priceAfterUsd), 10.58);
    assert.equal(formatChangePct((fill.priceAfterUsd / 10 - 1) * 100), '+5.8%');
  });

  test('§9.6 — 곧바로 같은 수량을 팔면 대금이 같다(적분이 같다 · 반올림 규칙으로 1센트 이하 차이 · 이득 없음)', () => {
    const q = 9_718;
    const after: PriceState = { ...fresh, flow: q };
    const upUsd = flowIntegralUsd(fresh, 0, q);
    const downUsd = flowIntegralUsd(after, 0, q);
    close(upUsd, downUsd, 1e-6, '같은 구간의 적분');
    close(upUsd, 99_995.53, 0.005, '$99,995.53');
    const buy = buyCostCents(fresh, q);
    const sell = sellProceedsCents(after, q);
    assert.ok(sell <= buy, '매도 대금(내림) ≤ 매수 대금(올림)');
    assert.ok(buy - sell <= 1, `차이 ${buy - sell}센트`);
    assert.equal(sell, 9_999_552, '$99,995.52 — 균형안 §9.6 의 "$99,995.53 → $99,995.53" 은 반올림 전 적분값이 같다는 뜻');
  });

  test('§9.6 — 학생 10명이 차례로 $100,000 씩 사면 84,530주 · $12.80(수급 +28.0%) · 30분 뒤 $12.07', () => {
    let s = fresh;
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const n = sharesForBudget(s, SEED);
      assert.ok(buyCostCents(s, n) <= SEED);
      total += n;
      s = { ...s, flow: s.flow + n };
    }
    assert.equal(total, 84_530);
    assert.equal(round2(marketPrice(s)), 12.8);
    assert.equal(formatChangePct((marketPrice(s) / 10 - 1) * 100), '+28.0%');
    const later = { ...s, flow: decayFlow(s.flow, 0, FLOW_HALF_LIFE_MS) };
    assert.equal(later.flow, total / 2, '반감기 30분');
    assert.equal(round2(marketPrice(later)), 12.07);
  });

  test('§9.6 — 수량별 평균가 100주 $10.003/$9.997 · 1,000주 $10.03/$9.97 · 10,000주 $10.30/$9.70', () => {
    const ladder = quoteLadder(fresh);
    assert.deepEqual(ladder.map((l) => l.shares), [100, 1_000, 10_000]);
    const [a, b, c] = ladder;
    assert.equal(Math.round(a!.buyAvgUsd * 1000) / 1000, 10.003);
    assert.equal(Math.round(a!.sellAvgUsd * 1000) / 1000, 9.997);
    assert.equal(round2(b!.buyAvgUsd), 10.03);
    assert.equal(round2(b!.sellAvgUsd), 9.97);
    assert.equal(round2(c!.buyAvgUsd), 10.3);
    assert.equal(round2(c!.sellAvgUsd), 9.7);
  });

  test('반올림 방향 — 매수 · 환매수 올림, 매도 · 공매도 내림', () => {
    const s: PriceState = { fundamentalUsd: 10.123456, demand: 1.07, flow: 12_345.6, sharesOutstanding: 1_000_000 };
    for (const q of [1, 7, 333, 9_999]) {
      const up = flowIntegralUsd(s, s.flow, s.flow + q) * 100;
      const down = flowIntegralUsd(s, s.flow - q, s.flow) * 100;
      assert.equal(buyCostCents(s, q), Math.ceil(up - 1e-6), `buy ${q}`);
      assert.equal(sellProceedsCents(s, q), Math.floor(down + 1e-6), `sell ${q}`);
      assert.ok(buyCostCents(s, q) >= up - 1e-6);
      assert.ok(sellProceedsCents(s, q) <= down + 1e-6);
      assert.equal(quoteFill(s, 'cover', q).cashCents, -buyCostCents(s, q));
      assert.equal(quoteFill(s, 'short', q).cashCents, sellProceedsCents(s, q));
    }
  });

  test('쪼개 거래 무이득 — 100번 나눠 사면 한 번에 사는 것보다 싸지 않고, 나눠 팔면 비싸게 받지 못한다', () => {
    const total = 10_000;
    const whole = buyCostCents(fresh, total);
    let s = fresh;
    let pieces = 0;
    for (let i = 0; i < 100; i++) {
      pieces += buyCostCents(s, total / 100);
      s = { ...s, flow: s.flow + total / 100 };
    }
    assert.ok(pieces >= whole, `${pieces} ≥ ${whole}`);
    // 사고 바로 나눠 팔기 — 받는 돈 ≤ 낸 돈.
    let back = 0;
    for (let i = 0; i < 100; i++) {
      back += sellProceedsCents(s, total / 100);
      s = { ...s, flow: s.flow - total / 100 };
    }
    assert.ok(back <= whole, `${back} ≤ ${whole}`);
    close(s.flow, 0, 1e-9);
    // 1주씩 왕복을 반복해도 1센트도 벌 수 없다.
    let cash = 0;
    let t = fresh;
    for (let i = 0; i < 500; i++) {
      cash -= buyCostCents(t, 1);
      t = { ...t, flow: t.flow + 1 };
      cash += sellProceedsCents(t, 1);
      t = { ...t, flow: t.flow - 1 };
    }
    assert.ok(cash <= 0, `왕복 손익 ${cash}`);
  });

  test('수요 배율 M — 0.70~1.30 으로 자르고 가격에 한 번 곱한다', () => {
    assert.equal(clampDemandMultiplier(1.15), 1.15);
    assert.equal(clampDemandMultiplier(2), 1.3);
    assert.equal(clampDemandMultiplier(0.1), 0.7);
    assert.equal(clampDemandMultiplier(Number.NaN), 1);
    close(marketPrice({ ...fresh, demand: 1.15 }), 11.5, 1e-12);
  });

  test('압력 감쇠 — 운영 시간 기준, 거꾸로 가면 그대로', () => {
    assert.equal(decayFlow(1000, 0, 2 * FLOW_HALF_LIFE_MS), 250);
    assert.equal(decayFlow(1000, 5_000, 5_000), 1000);
    assert.equal(decayFlow(1000, 5_000, 1_000), 1000);
  });

  test('대금 → 수량(이분법)과 받을 돈 → 수량', () => {
    for (const budget of [1, 1_000, 123_456, 5_000_000, 100_000_000]) {
      const q = sharesForBudget(fresh, budget);
      assert.ok(buyCostCents(fresh, q) <= budget);
      assert.ok(buyCostCents(fresh, q + 1) > budget);
    }
    assert.equal(sharesForBudget(fresh, SEED, 5_000), 5_000, '상한');
    const q = sharesToRaise(fresh, 1_234_567, 50_000);
    assert.ok(sellProceedsCents(fresh, q) >= 1_234_567);
    assert.ok(sellProceedsCents(fresh, q - 1) < 1_234_567);
    assert.equal(sharesToRaise(fresh, 1e12, 50), 50, '모자라면 전량');
  });

  test('보호 한도 — 매수는 비싸면, 매도는 싸면 거절', () => {
    assert.equal(violatesLimit('buy', 10.3, 10.29), true);
    assert.equal(violatesLimit('buy', 10.29, 10.29), false);
    assert.equal(violatesLimit('cover', 10.3, undefined), false);
    assert.equal(violatesLimit('sell', 9.7, 9.71), true);
    assert.equal(violatesLimit('short', 9.72, 9.71), false);
  });
});

// ─────────────────────────────── 주문 판정 ───────────────────────────────

function acct(cashCents: number, positions: AccountState['positions'] = []): AccountState {
  return { cashCents, seedCents: SEED, positions };
}
const noMarks = new Map<string, ListingMark>();

function order(over: Partial<Parameters<typeof checkOrder>[0]> = {}) {
  return checkOrder({
    side: 'buy',
    shares: 100,
    marketOpen: true,
    listingStatus: 'listed',
    ownCompany: false,
    state: fresh,
    shortInterestShares: 0,
    account: acct(SEED),
    marks: noMarks,
    teamId: 'T',
    ...over,
  });
}

describe('주문 판정 — §9.1 · §9.4 거절 코드', () => {
  test('수량 · 시장 닫힘 · 정지 · 자기 회사', () => {
    for (const shares of [0, -1, 1.5, 100_001, Number.NaN]) {
      const r = order({ shares });
      assert.ok(!r.ok && r.code === 'bad_request', String(shares));
    }
    const paused = order({ marketOpen: false });
    assert.ok(!paused.ok && paused.code === 'class_paused' && paused.retryable);
    for (const status of ['suspended', 'delisted', 'voided'] as ListingStatus[]) {
      const r = order({ listingStatus: status });
      assert.ok(!r.ok && r.code === 'trading_halted', status);
    }
    const self = order({ ownCompany: true, side: 'short' });
    assert.ok(!self.ok && self.code === 'self_trade_forbidden');
  });

  test('롱 · 숏 동시 보유 금지 · 보유 수량', () => {
    const shortPos = [{ teamId: 'T', longShares: 0, shortShares: 500, avgCostUsd: 10 }];
    const longPos = [{ teamId: 'T', longShares: 500, shortShares: 0, avgCostUsd: 10 }];
    const buyWhileShort = order({ side: 'buy', account: acct(SEED, shortPos) });
    assert.ok(!buyWhileShort.ok && buyWhileShort.code === 'insufficient_shares');
    const shortWhileLong = order({ side: 'short', account: acct(SEED, longPos) });
    assert.ok(!shortWhileLong.ok && shortWhileLong.code === 'insufficient_shares');
    const oversell = order({ side: 'sell', shares: 501, account: acct(SEED, longPos) });
    assert.ok(!oversell.ok && oversell.code === 'insufficient_shares');
    const overcover = order({ side: 'cover', shares: 501, account: acct(SEED, shortPos) });
    assert.ok(!overcover.ok && overcover.code === 'insufficient_shares');
    const sell = order({ side: 'sell', shares: 500, account: acct(SEED, longPos) });
    assert.ok(sell.ok);
    assert.equal(sell.account.positions.length, 0, '0 이 되면 포지션이 빠진다');
  });

  test('현금 — 대금 부족 · 음수 현금은 새 매수 · 공매도 금지', () => {
    const poor = order({ side: 'buy', shares: 10_000, account: acct(50_000) });
    assert.ok(!poor.ok && poor.code === 'insufficient_funds');
    const debtBuy = order({ side: 'buy', account: acct(-1) });
    assert.ok(!debtBuy.ok && debtBuy.code === 'margin_insufficient');
    const debtShort = order({ side: 'short', account: acct(-1) });
    assert.ok(!debtShort.ok && debtShort.code === 'margin_insufficient');
    const shortPos = [{ teamId: 'T', longShares: 0, shortShares: 500, avgCostUsd: 10 }];
    const coverPoor = order({ side: 'cover', shares: 500, account: acct(100, shortPos) });
    assert.ok(!coverPoor.ok && coverPoor.code === 'insufficient_funds');
  });

  test('종목 공매도 잔고 상한 20% · 개시 한도(숏 평가액 ≤ 순자산)', () => {
    const cap = order({ side: 'short', shares: 1_000, shortInterestShares: 199_500 });
    assert.ok(!cap.ok && cap.code === 'short_limit');
    const atCap = order({ side: 'short', shares: 500, shortInterestShares: 199_500 });
    assert.ok(atCap.ok, '정확히 20% 는 된다');
    // 순자산 $100,000 — 10,000주(개시 한도 끝 근처)는 되고, 그 두 배는 안 된다.
    const ok = order({ side: 'short', shares: 10_000 });
    assert.ok(ok.ok);
    const after = valueAccount(ok.account, new Map([['T', { priceUsd: ok.fill.priceAfterUsd, status: 'listed' as const }]]));
    assert.ok(after.shortValueCents <= after.equityCents);
    const tooMuch = order({ side: 'short', shares: 20_000 });
    assert.ok(!tooMuch.ok && tooMuch.code === 'margin_insufficient');
  });

  test('보호 한도 → price_moved(재시도 가능)', () => {
    const r = order({ side: 'buy', shares: 1_000, limitPriceUsd: 10.02 });
    assert.ok(!r.ok && r.code === 'price_moved' && r.retryable);
    assert.ok(order({ side: 'buy', shares: 1_000, limitPriceUsd: 10.04 }).ok);
  });

  test('평균가 — 늘릴 때 가중 평균, 줄일 때 그대로', () => {
    const first = order({ side: 'buy', shares: 1_000 });
    assert.ok(first.ok);
    const s2 = { ...fresh, flow: 1_000 };
    const second = order({ side: 'buy', shares: 1_000, state: s2, account: first.account });
    assert.ok(second.ok);
    const avg = second.position.avgCostUsd;
    close(avg, (first.fill.avgPriceUsd + second.fill.avgPriceUsd) / 2, 1e-12);
    const part = order({ side: 'sell', shares: 400, state: { ...s2, flow: 2_000 }, account: second.account });
    assert.ok(part.ok);
    assert.equal(part.position.avgCostUsd, avg);
    assert.equal(part.position.longShares, 1_600);
  });
});

// ─────────────────────────────── 증거금 · 스퀴즈 ───────────────────────────────

describe('증거금 · 숏스퀴즈 — §9.4 · §9.6', () => {
  const marks = (price: number) => new Map([['T', { priceUsd: price, status: 'listed' as ListingStatus }]]);

  test('§9.6 — 순자산 $100,000 계좌가 5,000주 공매도하면 강제 환매수는 $23.08, 10,000주면 $15.38 (공매도 대금을 $10.00 로 본 산술)', () => {
    // 균형안의 산술은 공매도 대금을 시장가 $10.00 × 수량으로 본다(현금 = $100,000 + $10 × 수량).
    const threshold = (shares: number, cash: number) => {
      let lo = 10;
      let hi = 100;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        const v = valueAccount(acct(cash, [{ teamId: 'T', longShares: 0, shortShares: shares, avgCostUsd: 10 }]), marks(mid));
        if (breachesMaintenance(v)) hi = mid;
        else lo = mid;
      }
      return hi;
    };
    assert.equal(round2(threshold(5_000, SEED + 5_000 * 1_000)), 23.08);
    assert.equal(round2(threshold(10_000, SEED + 10_000 * 1_000)), 15.38);
    assert.equal(formatChangePct((23.08 / 10 - 1) * 100), '+130.8%');
    assert.equal(formatChangePct((15.38 / 10 - 1) * 100), '+53.8%');
    // 실제 체결(적분 대금)로 공매도하면 대금이 조금 적어 문턱이 조금 낮다 — 기록.
    const s5 = sellProceedsCents(fresh, 5_000);
    const s10 = sellProceedsCents(fresh, 10_000);
    const real5 = threshold(5_000, SEED + s5);
    const real10 = threshold(10_000, SEED + s10);
    assert.ok(real5 < 23.08 && real5 > 22.9, `적분 대금 문턱 5,000주 ${real5.toFixed(2)}`);
    assert.ok(real10 < 15.38 && real10 > 15.1, `적분 대금 문턱 10,000주 ${real10.toFixed(2)}`);
  });

  test('계좌 평가 — 순자산 · 수익률 · 유지 기준 · 여유', () => {
    const a = acct(SEED + 50_000_00, [{ teamId: 'T', longShares: 0, shortShares: 5_000, avgCostUsd: 10 }]);
    const v = valueAccount(a, marks(12));
    assert.equal(v.shortValueCents, 6_000_000);
    assert.equal(v.equityCents, SEED + 5_000_000 - 6_000_000);
    assert.equal(v.requiredCents, 1_800_000);
    assert.equal(v.excessCents, v.equityCents - 1_800_000);
    close(v.returnPct, -10, 1e-12);
    assert.equal(v.shortCapacityCents, Math.max(0, v.equityCents - v.shortValueCents));
  });

  test('강제 청산 계획 — 숏 평가액 큰 것부터 전량 환매수 → 음수 현금이면 롱을 큰 것부터 판다', () => {
    const states = new Map<string, PriceState>([
      ['A', { ...fresh, fundamentalUsd: 20 }],
      ['B', { ...fresh }],
      ['L', { ...fresh, fundamentalUsd: 5 }],
    ]);
    const statuses = new Map<string, ListingStatus>([
      ['A', 'listed'],
      ['B', 'listed'],
      ['L', 'listed'],
    ]);
    // 숏 A 4,000주($80,000) · 숏 B 3,000주($30,000) · 롱 L 2,000주($10,000), 현금 $40,000 → 순자산 $−60,000 + ... 미달.
    const account = acct(4_000_000, [
      { teamId: 'A', longShares: 0, shortShares: 4_000, avgCostUsd: 10 },
      { teamId: 'B', longShares: 0, shortShares: 3_000, avgCostUsd: 10 },
      { teamId: 'L', longShares: 2_000, shortShares: 0, avgCostUsd: 5 },
    ]);
    const plan = planForcedLiquidation(account, states, statuses);
    assert.deepEqual(
      plan.steps.map((s) => `${s.kind}:${s.teamId}:${s.shares}`).slice(0, 2),
      ['forced_cover:A:4000', 'forced_cover:B:3000'],
      '큰 숏부터 전량',
    );
    const sells = plan.steps.filter((s) => s.kind === 'forced_sell');
    assert.ok(sells.length >= 1 && sells[0]!.teamId === 'L');
    assert.ok(plan.account.positions.every((p) => p.shortShares === 0));
    assert.ok(plan.states.get('A')!.flow === 4_000, '환매수는 매수 압력');
    assert.equal(plan.negativeCash, plan.account.cashCents < 0);
  });

  test('정지 종목 포지션은 강제 청산하지 않는다(묶임)', () => {
    const states = new Map<string, PriceState>([['S', { ...fresh, fundamentalUsd: 40 }]]);
    const statuses = new Map<string, ListingStatus>([['S', 'suspended']]);
    const account = acct(100, [{ teamId: 'S', longShares: 0, shortShares: 5_000, avgCostUsd: 10 }]);
    const plan = planForcedLiquidation(account, states, statuses);
    assert.equal(plan.steps.length, 0);
  });

  test('숏스퀴즈 루프 — 한 계좌의 환매수가 가격을 올려 같은 종목의 다른 숏 계좌를 다시 확인하고, 반드시 끝난다', () => {
    // 같은 종목에 숏 계좌 6개(각 10,000주), 여유가 $6,000 씩 다르다. 가격을 올리는 리포트(F $10 → $21) 뒤의 상황.
    const states = new Map<string, PriceState>([['T', { ...fresh, fundamentalUsd: 21, flow: -60_000 }]]);
    const statuses = new Map<string, ListingStatus>([['T', 'listed']]);
    const accounts = Array.from({ length: 6 }, (_, i) => ({
      accountId: `acct-${i}`,
      account: acct(SEED + 10_000 * 1_000 + i * 600_000, [{ teamId: 'T', longShares: 0, shortShares: 10_000, avgCostUsd: 10 }]),
    }));
    const before = valueAccount(accounts[0]!.account, new Map([['T', { priceUsd: marketPrice(states.get('T')!), status: 'listed' as const }]]));
    assert.ok(breachesMaintenance(before), '처음 계좌는 미달');
    const last = valueAccount(accounts[5]!.account, new Map([['T', { priceUsd: marketPrice(states.get('T')!), status: 'listed' as const }]]));
    assert.ok(!breachesMaintenance(last), '여유가 큰 계좌는 처음엔 괜찮다');
    const result = runSqueezeLoop(accounts, states, statuses);
    const covered = new Set(result.events.filter((e) => e.step.kind === 'forced_cover').map((e) => e.accountId));
    assert.ok(covered.has('acct-5'), `연쇄 환매수 — 여유가 컸던 계좌도 결국 환매수(${[...covered].join(',')})`);
    assert.ok(result.rounds <= 6 + 2, `바퀴 수 상한 ${result.rounds}`);
    assert.equal(result.states.get('T')!.flow, -60_000 + 6 * 10_000);
    for (const a of result.accounts.values()) assert.ok(a.positions.every((p) => p.shortShares === 0));
    // 다시 돌려도 아무 일 없음(끝난 상태).
    const again = runSqueezeLoop([...result.accounts].map(([accountId, account]) => ({ accountId, account })), result.states, statuses);
    assert.equal(again.events.length, 0);
  });

  test('임의 상황 200개 — 루프는 상한 안에 끝나고 숏이 남은 계좌는 유지 기준을 지킨다', () => {
    let x = 12345;
    const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < 200; k++) {
      const teams = ['A', 'B', 'C'];
      const states = new Map<string, PriceState>(teams.map((t) => [t, { ...fresh, fundamentalUsd: 5 + rnd() * 25, flow: (rnd() - 0.5) * 100_000 }] as const));
      const statuses = new Map<string, ListingStatus>(teams.map((t) => [t, 'listed'] as const));
      const accounts = Array.from({ length: 1 + Math.floor(rnd() * 8) }, (_, i) => ({
        accountId: `a${i}`,
        account: acct(
          Math.floor(rnd() * 30_000_000) - 2_000_000,
          teams
            .filter(() => rnd() < 0.6)
            .map((t) => (rnd() < 0.6 ? { teamId: t, longShares: 0, shortShares: 1 + Math.floor(rnd() * 20_000), avgCostUsd: 10 } : { teamId: t, longShares: 1 + Math.floor(rnd() * 5_000), shortShares: 0, avgCostUsd: 10 })),
        ),
      }));
      const shortsBefore = accounts.reduce((n, a) => n + a.account.positions.filter((p) => p.shortShares > 0).length, 0);
      const r = runSqueezeLoop(accounts, states, statuses);
      assert.ok(r.rounds <= shortsBefore + 2, `case ${k}: ${r.rounds} 바퀴`);
      const finalMarks = new Map([...r.states].map(([t, s]) => [t, { priceUsd: marketPrice(s), status: 'listed' as ListingStatus }] as const));
      for (const a of r.accounts.values()) {
        if (a.positions.some((p) => p.shortShares > 0)) assert.ok(!breachesMaintenance(valueAccount(a, finalMarks)), `case ${k}`);
      }
    }
  });
});

// ─────────────────────────────── 증자 · 정리 ───────────────────────────────

describe('유상증자 — §9.5 · §9.6', () => {
  test('한도 · 발행가 · 1인 상한', () => {
    assert.deepEqual(offeringLimits(1_000_000), { minShares: 10_000, maxShares: 200_000 });
    assert.equal(offeringPriceUsd(10), 9);
    assert.equal(offeringPriceUsd(10.5799), 9.52, '센트 내림');
    assert.equal(offeringPriceUsd(0.005), 0.01, '최소 $0.01');
    assert.equal(offeringPerInvestorCap(200_000), 50_000);
    assert.equal(subscriptionCostCents(9, 50_000), 45_000_000);
    assert.equal(subscriptionCostCents(9.52, 3), 2_856);
  });

  test('§9.6 — 200,000주를 $9.00 에 모두 팔면 회사에 $1.800M, F $10.00 → $9.83(−1.7%) · 나눠 체결해도 같다', () => {
    const proceeds = subscriptionCostCents(9, 200_000);
    assert.equal(proceeds, 180_000_000, '$1.800M');
    const once = dilutedFundamental(10, 1_000_000, proceeds / 100, 200_000);
    assert.equal(round2(once), 9.83);
    assert.equal(formatChangePct((once / 10 - 1) * 100), '−1.7%');
    let f = 10;
    let n = 1_000_000;
    for (const q of [50_000, 50_000, 37_000, 13_000, 50_000]) {
      f = dilutedFundamental(f, n, subscriptionCostCents(9, q) / 100, q);
      n += q;
    }
    close(f, once, 1e-12, '경로 무관');
  });

  test('신청 판정 — 열린 증자 · 대기 60분 · 수량 · 파산 · 정지', () => {
    const base = {
      marketOpen: true,
      companyStatus: 'active' as const,
      listingStatus: 'listed' as ListingStatus,
      hasOpenOffering: false,
      lastClosedOperatingMs: null,
      nowOperatingMs: 0,
      shares: 100_000,
      sharesOutstanding: 1_000_000,
    };
    assert.ok(checkOfferingCreate(base).ok);
    const cases: Array<[Partial<typeof base> & Record<string, unknown>, string]> = [
      [{ marketOpen: false }, 'class_paused'],
      [{ companyStatus: 'bankrupt' } as never, 'company_bankrupt'],
      [{ listingStatus: 'suspended' }, 'trading_halted'],
      [{ hasOpenOffering: true }, 'offering_cooldown'],
      [{ lastClosedOperatingMs: 1_000, nowOperatingMs: 1_000 + OFFERING_COOLDOWN_MS - 1 } as never, 'offering_cooldown'],
      [{ shares: 9_999 }, 'offering_limit'],
      [{ shares: 200_001 }, 'offering_limit'],
    ];
    for (const [over, code] of cases) {
      const r = checkOfferingCreate({ ...base, ...over } as never);
      assert.ok(!r.ok && r.code === code, `${JSON.stringify(over)} → ${code}`);
    }
    assert.ok(checkOfferingCreate({ ...base, lastClosedOperatingMs: 1_000, nowOperatingMs: 1_000 + OFFERING_COOLDOWN_MS } as never).ok);
  });

  test('청약 판정 — 기간 · 다 팔림 · 남은 수량 · 1인 상한 · 자기 회사 · 현금', () => {
    const base = {
      marketOpen: true,
      offeringStatus: 'open' as const,
      listingStatus: 'listed' as ListingStatus,
      nowOperatingMs: 0,
      closesOperatingMs: OFFERING_WINDOW_MS,
      sharesOffered: 200_000,
      sharesSold: 0,
      perInvestorCap: 50_000,
      alreadySubscribed: 0,
      shares: 10_000,
      priceUsd: 9,
      cashCents: SEED,
      ownCompany: false,
    };
    assert.ok(checkSubscription(base).ok);
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ownCompany: true }, 'self_trade_forbidden'],
      [{ nowOperatingMs: OFFERING_WINDOW_MS }, 'offering_closed'],
      [{ offeringStatus: 'closed' }, 'offering_closed'],
      [{ sharesSold: 200_000 }, 'offering_closed'],
      [{ sharesSold: 195_000 }, 'offering_limit'],
      [{ alreadySubscribed: 45_000 }, 'offering_limit'],
      [{ cashCents: -5 }, 'margin_insufficient'],
      [{ shares: 11_112 }, 'insufficient_funds'],
      [{ shares: 0 }, 'bad_request'],
    ];
    for (const [over, code] of cases) {
      const r = checkSubscription({ ...base, ...over } as never);
      assert.ok(!r.ok && r.code === code, `${JSON.stringify(over)} → ${code}`);
    }
  });
});

describe('거래 정지 · 상장 폐지 정리 — §9.5', () => {
  test('정리 때 — 정지 뒤 운영 시간 24시간', () => {
    assert.equal(isSettlementDue(null, 1e12), false);
    assert.equal(isSettlementDue(1_000, 1_000 + SUSPENSION_SETTLE_MS - 1), false);
    assert.equal(isSettlementDue(1_000, 1_000 + SUSPENSION_SETTLE_MS), true);
  });

  test('정리가 = max(0, 잔액 − 미지급) / 유통 주식 · 롱 내림 · 숏 올림', () => {
    assert.equal(settlementPriceUsd(150_000_000, 30_000_000, 1_000_000), 1.2);
    assert.equal(settlementPriceUsd(10_000, 30_000_000, 1_000_000), 0, '빚이 더 크면 0');
    const p = settlementPriceUsd(123_456_789, 0, 1_000_000); // $1.23456789
    assert.equal(settlementCashCents({ longShares: 333, shortShares: 0 }, p), Math.floor(333 * 123.456789));
    assert.equal(settlementCashCents({ longShares: 0, shortShares: 333 }, p), -Math.ceil(333 * 123.456789));
    assert.equal(settlementCashCents({ longShares: 0, shortShares: 0 }, p), 0);
  });
});

// ─────────────────────────────── 봉 · 순위 ───────────────────────────────

describe('봉 · 등락 · 순위', () => {
  const T0 = Date.UTC(2026, 9, 21, 9, 0, 0);

  test('5분 봉 갱신 · 7일 정리', () => {
    let c = updateCandles([], T0 + 10_000, 10, 100);
    c = updateCandles(c, T0 + 60_000, 10.5, 50);
    c = updateCandles(c, T0 + 120_000, 9.8, 0);
    assert.deepEqual(c, [{ t: T0, o: 10, h: 10.5, l: 9.8, c: 9.8, v: 150 }]);
    c = updateCandles(c, T0 + CANDLE_MS, 10.1, 10);
    assert.equal(c.length, 2);
    assert.deepEqual(c[1], { t: T0 + CANDLE_MS, o: 10.1, h: 10.1, l: 10.1, c: 10.1, v: 10 });
    const pruned = pruneCandles(c, T0 + 7 * 86_400_000 + CANDLE_MS);
    assert.equal(pruned.length, 1, '첫 봉은 7일이 지났다');
  });

  test('24시간 등락 — 24시간 전 봉 종가 대비, 짧으면 상장가 대비', () => {
    const day = 86_400_000;
    const c = [
      { t: T0, o: 10, h: 10, l: 10, c: 10, v: 0 },
      { t: T0 + CANDLE_MS, o: 10, h: 11, l: 10, c: 11, v: 0 },
    ];
    close(changePct24h(c, T0 + day + CANDLE_MS + 1, 12.1, 10), 10, 1e-9, '11 → 12.1');
    close(changePct24h(c, T0 + 1_000, 10.5, 10), 5, 1e-9, '상장가 대비');
  });

  test('순위 — 시가총액 · 수익률 상위 5 + 나', () => {
    const caps = rankMarketCap([
      { teamId: 'a', ticker: 'AAA', companyName: 'A', inkKey: 'T1', marketCapCents: 5 },
      { teamId: 'b', ticker: 'BBB', companyName: 'B', inkKey: 'T2', marketCapCents: 9 },
    ]);
    assert.deepEqual(caps.map((c) => [c.rank, c.ticker]), [[1, 'BBB'], [2, 'AAA']]);
    const rows = Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}`, displayName: `학생${i}`, returnPct: i }));
    const top = rankInvestors(rows, 'u0');
    assert.deepEqual(top.map((r) => [r.rank, r.displayName, r.you]), [
      [1, '학생7', false],
      [2, '학생6', false],
      [3, '학생5', false],
      [4, '학생4', false],
      [5, '학생3', false],
      [8, '학생0', true],
    ]);
    assert.equal(rankInvestors(rows, 'u7').length, 5, '내가 5위 안이면 하나 더 붙지 않는다');
    assert.equal(rankInvestors(rows, null).length, 5);
  });
});

// ─────────────────────────────── 애널리스트 ───────────────────────────────

describe('애널리스트 — §9.3', () => {
  test('계기별 범위 · 기본값(표 그대로)', () => {
    const table: Array<[AnalystTriggerKind, Record<string, string | number>, number, number, number]> = [
      ['listing', {}, 0, 0, 0],
      ['facility', { facility: 'docking', tier: 1 }, 0, 4, 2],
      ['upgrade', { facility: 'docking', tier: 2 }, 0, 3, 1],
      ['docking', { affinityKcal: -7 }, 0, 12, 2],
      ['docking', { affinityKcal: -9.5 }, 0, 12, 6],
      ['docking', { affinityKcal: -15 }, 0, 12, 10],
      ['investment', { milestone: 'seriesA' }, 5, 15, 8],
      ['investment', { milestone: 'seriesB' }, 5, 15, 12],
      ['offering', {}, -10, 5, -3],
      ['crisis', {}, -8, 0, -3],
      ['restructure', {}, -15, -3, -8],
      ['recovered', {}, 0, 8, 4],
      ['macro', { tone: 'good' }, -5, 5, 2],
      ['macro', { tone: 'bad' }, -5, 5, -2],
      ['bankrupt', {}, 0, 0, 0],
      ['reinstated', {}, 0, 0, 0],
    ];
    for (const [kind, detail, min, max, def] of table) {
      const b = analystBand(kind, detail);
      assert.deepEqual([b.minPct, b.maxPct], [min, max], kind);
      close(b.defaultPct, def, 1e-12, `${kind} ${JSON.stringify(detail)}`);
      close(defaultAnalystChangePct(kind, detail), def, 1e-12);
    }
  });

  test('대기 계기 합치기 — 3개를 넘으면, 기본값 합 · 범위 합 · ±20% 로 자름', () => {
    assert.equal(shouldMergeTriggers(3), false);
    assert.equal(shouldMergeTriggers(4), true);
    const merged = mergeAnalystBands([
      analystBand('investment', { milestone: 'seriesB' }),
      analystBand('docking', { affinityKcal: -12 }),
      analystBand('facility'),
      analystBand('upgrade'),
    ]);
    assert.deepEqual(merged, { minPct: 5, maxPct: 20, defaultPct: 20 }, '12 + 10 + 2 + 1 = 25 → 20');
    const down = mergeAnalystBands([analystBand('restructure'), analystBand('crisis'), analystBand('offering'), analystBand('macro', { tone: 'bad' })]);
    assert.deepEqual(down, { minPct: -20, maxPct: 7, defaultPct: -16 }, '범위 합 −3 + 0 + 5 + 5 = 7');
  });

  test('기본 투자의견 — 경계값 · 구조조정 · 유예 · 파산', () => {
    assert.equal(defaultAnalystRating(6, 'normal'), 'STRONG_BUY');
    assert.equal(defaultAnalystRating(5.99, 'normal'), 'BUY');
    assert.equal(defaultAnalystRating(1.5, 'notice'), 'BUY');
    assert.equal(defaultAnalystRating(1.49, 'normal'), 'HOLD');
    assert.equal(defaultAnalystRating(-2.99, 'crisis'), 'HOLD');
    assert.equal(defaultAnalystRating(-3, 'normal'), 'SHORT_WARNING');
    assert.equal(defaultAnalystRating(12, 'restructure'), 'SHORT_WARNING');
    assert.equal(defaultAnalystRating(12, 'grace'), 'SHORT_WARNING');
    assert.equal(defaultAnalystRating(0, 'normal', 'bankrupt'), 'SHORT_WARNING');
  });

  test('F 갱신 · 하한 $0.10 · 정정 재계산', () => {
    close(applyFundamentalChange(10, 8), 10.8, 1e-12);
    assert.equal(applyFundamentalChange(0.105, -15), 0.1);
    const after = applyFundamentalChange(10, 6);
    close(correctedFundamental(after, 6, 1), 10.1, 1e-12, 'F × (1 + 새 Δ) / (1 + 원래 Δ)');
    close(correctedFundamental(after, 6, 6), after, 1e-12);
  });

  test('도킹 정정 Δ — 신기록이 아니게 되면 0, 무효(null)면 0', () => {
    close(dockingChangePctFor(-9.5, -8), 6, 1e-12);
    assert.equal(dockingChangePctFor(-6.9, null), 0);
    assert.equal(dockingChangePctFor(-8, -8.5), 0, '이전 최고보다 낮지 않다');
    assert.equal(dockingChangePctFor(null, null), 0);
  });

  test('clampAnalystOutput — 범위 밖 제안은 자르고 원래 값을 남긴다 · 잘못된 의견 · 긴 글 · 빈 헤드라인', () => {
    const band = analystBand('facility');
    const out = clampAnalystOutput(
      { rating: 'TO_THE_MOON', fundamentalChangePct: 40, proposedChangePct: 40, headline: '**대박** 설비'.repeat(20), comment: 'x'.repeat(500), rationale: ['a', 'b', 'c', 'd', 5] },
      band,
      'BUY',
    );
    assert.ok(out);
    assert.equal(out.rating, 'BUY');
    assert.equal(out.fundamentalChangePct, 4);
    assert.equal(out.proposedChangePct, 40);
    assert.ok([...out.headline].length <= 60 && !out.headline.includes('*'));
    assert.ok([...out.comment].length <= 200);
    assert.deepEqual(out.rationale, ['a', 'b', 'c']);
    assert.equal(clampAnalystOutput({ rating: 'BUY', headline: '   ' }, band, 'HOLD'), null);
    assert.equal(clampAnalystOutput('nope', band, 'HOLD'), null);
    const noPct = clampAnalystOutput({ rating: 'HOLD', headline: '좋음' }, band, 'HOLD');
    assert.equal(noPct?.fundamentalChangePct, band.defaultPct);
    const neg = clampAnalystOutput({ rating: 'HOLD', headline: 'h', fundamentalChangePct: -3 }, analystBand('restructure'), 'HOLD');
    assert.equal(neg?.fundamentalChangePct, -3);
    assert.equal(clampAnalystOutput({ rating: 'HOLD', headline: 'h', fundamentalChangePct: -30 }, analystBand('restructure'), 'HOLD')?.fundamentalChangePct, -15);
  });

  test('규칙 기반 문구 — 길이 한도 · 숫자는 넘겨받은 사실에서만(지어낸 숫자 없음)', () => {
    const inputs: AnalystFallbackInput[] = [
      { trigger: 'listing', ticker: 'NBX', detail: {}, changePct: 0, rating: 'HOLD' },
      { trigger: 'facility', ticker: 'NBX', detail: { facility: 'docking', tier: 1 }, changePct: 2, rating: 'BUY', facts: { facilities: { target: 1, docking: 1 } } },
      { trigger: 'upgrade', ticker: 'NBX', detail: { facility: 'target', tier: 2 }, changePct: 1, rating: 'HOLD' },
      {
        trigger: 'docking',
        ticker: 'HLX',
        detail: { jobId: 'job-1', affinityKcal: -9.43, previousBestKcal: -8.1, targetLabel: '아세틸콜린에스테라아제', pdbId: '4EY7', ligandLabel: '도네페질' },
        changePct: 5.776,
        rating: 'BUY',
        facts: { bestDocking: { targetLabel: '아세틸콜린에스테라아제', pdbId: '4EY7', affinityKcal: -9.43, previousBestKcal: -8.1 }, cashLevel: 'notice' },
      },
      { trigger: 'investment', ticker: 'HLX', detail: { milestone: 'seriesB' }, changePct: 12, rating: 'STRONG_BUY' },
      { trigger: 'offering', ticker: 'HLX', detail: { offeringId: 'o1', shares: 100_000 }, changePct: -3, rating: 'SHORT_WARNING' },
      { trigger: 'crisis', ticker: 'HLX', detail: { from: 'notice', to: 'crisis' }, changePct: -3, rating: 'SHORT_WARNING', facts: { cashLevel: 'crisis' } },
      { trigger: 'restructure', ticker: 'HLX', detail: { from: 'crisis', to: 'restructure' }, changePct: -8, rating: 'SHORT_WARNING' },
      { trigger: 'recovered', ticker: 'HLX', detail: { from: 'grace', to: 'normal' }, changePct: 4, rating: 'BUY' },
      { trigger: 'macro', ticker: 'HLX', detail: { eventId: 'opex-up', tone: 'bad', instanceId: 'auto:c:m3' }, changePct: -2, rating: 'HOLD' },
      { trigger: 'bankrupt', ticker: 'HLX', detail: {}, changePct: 0, rating: 'SHORT_WARNING' },
      { trigger: 'reinstated', ticker: 'HLX', detail: {}, changePct: 0, rating: 'HOLD' },
      { trigger: 'docking', ticker: 'HLX', detail: { affinityKcal: -10 }, changePct: 20, rating: 'STRONG_BUY', merged: ['facility', 'docking', 'investment', 'upgrade'] },
    ];
    const numbers = (text: string) => text.match(/\d+(?:\.\d+)?/g) ?? [];
    for (const input of inputs) {
      const text = analystFallback(input);
      assert.ok([...text.headline].length <= 60, text.headline);
      assert.ok([...text.comment].length <= 200, text.comment);
      assert.ok(text.rationale.length <= 3 && text.rationale.every((r) => [...r].length <= 80));
      // 허용 숫자: 입력의 숫자(사실 · 세부) + 적용 Δ 표기 + 사실 값의 1자리 표기 + 계기 수 + 정지 정리 시간(규칙 상수).
      const allowed = new Set<string>([
        ...numbers(JSON.stringify(input)),
        ...numbers(formatChangePct(input.changePct)),
        String(MARKET_RULES.suspensionSettleHours),
        String(input.merged?.length ?? 0),
      ]);
      const walk = (v: unknown): void => {
        if (typeof v === 'number') allowed.add((Math.round(Math.abs(v) * 10) / 10).toFixed(1));
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
      };
      walk(input);
      if (input.facts?.facilities) allowed.add(String(Object.values(input.facts.facilities).filter((t) => (t ?? 0) > 0).length));
      for (const line of [text.headline, text.comment, ...text.rationale]) {
        for (const n of numbers(line)) assert.ok(allowed.has(n), `${input.trigger}: '${n}' in "${line}"`);
      }
    }
  });

  test('변동률 표기 — +5.8% · −3.0% · 0.0%', () => {
    assert.equal(formatChangePct(5.75), '+5.8%');
    assert.equal(formatChangePct(-3), '−3.0%');
    assert.equal(formatChangePct(0.04), '0.0%');
  });
});

// ─────────────────────────────── 애널리스트 — 파이프라인 계기(M5, 균형안 §10.7) ───────────────────────────────

describe('애널리스트 — 파이프라인 계기 §10.7', () => {
  type Row = [AnalystTriggerKind, Record<string, string | number | boolean>, number, number, number];
  test('범위 · 기본값은 결과(통과 · 실패)와 단계로 고른다(표 그대로)', () => {
    const table: Row[] = [
      ['patent', { stepId: 'pat-1' }, 0, 5, 2],
      ['ind', { stepId: 's1', kind: 'ind', passed: true, formulation: 'oral' }, 0, 5, 2],
      ['ind', { stepId: 's1', kind: 'ind', passed: false, formulation: 'oral' }, -8, 0, -4],
      ['trial', { stepId: 's2', kind: 'phase1', passed: true }, 0, 8, 4],
      ['trial', { stepId: 's2', kind: 'phase1', passed: false }, -12, -2, -6],
      ['trial', { stepId: 's3', kind: 'phase2', passed: true }, 3, 15, 8],
      ['trial', { stepId: 's3', kind: 'phase2', passed: false }, -18, -5, -12],
      ['trial', { stepId: 's4', kind: 'phase3', passed: true }, 5, 18, 10],
      ['trial', { stepId: 's4', kind: 'phase3', passed: false }, -20, -8, -15],
      ['approval', { stepId: 's5', kind: 'final', passed: true, formulation: 'oral' }, 8, 20, 15.6],
      ['approval', { stepId: 's5', kind: 'final', passed: true, formulation: 'iv' }, 8, 20, 12],
      ['approval', { stepId: 's5', kind: 'final', passed: true, formulation: 'transdermal' }, 8, 20, 13.8],
      ['approval', { stepId: 's5', kind: 'final', passed: false, formulation: 'oral' }, -15, -3, -8],
    ];
    for (const [kind, detail, min, max, def] of table) {
      const b = analystBand(kind, detail);
      assert.deepEqual([b.minPct, b.maxPct], [min, max], `${kind} ${JSON.stringify(detail)}`);
      close(b.defaultPct, def, 1e-9, `${kind} ${JSON.stringify(detail)}`);
      close(defaultAnalystChangePct(kind, detail), def, 1e-9);
      assert.ok(b.defaultPct >= b.minPct && b.defaultPct <= b.maxPct);
    }
  });

  test('허가 기본값 = min(20%, 12% × 제형 배율) — 경구 1.3 · 정맥 1.0 · 경피 1.15', () => {
    assert.deepEqual({ ...FORMULATION_MARKET_MULTIPLIER }, { oral: 1.3, iv: 1.0, transdermal: 1.15 });
    assert.equal(approvalDefaultChangePct('oral'), 15.6);
    assert.equal(approvalDefaultChangePct('iv'), 12);
    assert.equal(approvalDefaultChangePct('transdermal'), 13.8);
    assert.equal(approvalDefaultChangePct(null), 12, '제형을 모르면 배율 1.0');
    assert.ok(approvalDefaultChangePct('oral') <= APPROVAL_CAP_PCT);
    assert.equal(PIPELINE_ANALYST_BANDS.patent.fail, null, '특허 등록은 결과가 하나');
  });

  test('§10.7 산술 — 기본 경로를 모두 통과하면 펀더멘털 ×1.486(경구) · 정맥 +44.0% · 경피 +46.3%', () => {
    const path = (formulation: 'oral' | 'iv' | 'transdermal') =>
      [
        analystBand('patent', {}),
        analystBand('ind', { kind: 'ind', passed: true }),
        analystBand('trial', { kind: 'phase1', passed: true }),
        analystBand('trial', { kind: 'phase2', passed: true }),
        analystBand('trial', { kind: 'phase3', passed: true }),
        analystBand('approval', { kind: 'final', passed: true, formulation }),
      ].reduce((f, b) => f * (1 + b.defaultPct / 100), 1);
    close(path('oral'), 1.486, 5e-4);
    close((path('iv') - 1) * 100, 44.0, 0.05);
    close((path('transdermal') - 1) * 100, 46.3, 0.05);
    // §9.6 개시 한도 숏 강제 환매수(+54%)에는 파이프라인만으로 닿지 않는다.
    assert.ok(path('oral') < 1.54);
  });

  test('세부가 모자라거나 계기와 단계가 맞지 않으면 움직이지 않는다(0) — 범위를 지어내지 않는다', () => {
    for (const [kind, detail] of [
      ['trial', { passed: true }],
      ['trial', { kind: 'ind', passed: true }],
      ['ind', { kind: 'phase1', passed: true }],
      ['ind', {}],
      ['approval', { kind: 'final' }],
    ] as Array<[AnalystTriggerKind, Record<string, string | boolean>]>) {
      assert.deepEqual(analystBand(kind, detail), { minPct: 0, maxPct: 0, defaultPct: 0 }, `${kind} ${JSON.stringify(detail)}`);
    }
    assert.deepEqual(analystPipelineOutcomeOf('ind', { passed: false }), { stage: 'ind', passed: false, formulation: null }, 'kind 없이도 계기로 단계를 안다');
    assert.equal(analystPipelineOutcomeOf('docking', { passed: true }), null);
  });

  test('LLM 제안은 결과별 범위로 자른다 — 실패에 +Δ 를 낼 수 없다', () => {
    const fail = analystBand('trial', { kind: 'phase2', passed: false });
    const out = clampAnalystOutput({ rating: 'STRONG_BUY', headline: '2상 실패에도 대박', fundamentalChangePct: 30 }, fail, 'SHORT_WARNING');
    assert.equal(out?.fundamentalChangePct, -5);
    assert.equal(out?.proposedChangePct, 30);
    const pass = analystBand('approval', { kind: 'final', passed: true, formulation: 'oral' });
    assert.equal(clampAnalystOutput({ rating: 'BUY', headline: 'h', fundamentalChangePct: 50 }, pass, 'BUY')?.fundamentalChangePct, 20);
  });

  test('합치기 — 파이프라인 계기도 기본값 합 · 범위 합 · ±20%', () => {
    const merged = mergeAnalystBands([
      analystBand('trial', { kind: 'phase3', passed: true }),
      analystBand('approval', { kind: 'final', passed: true, formulation: 'oral' }),
      analystBand('patent', {}),
      analystBand('facility'),
    ]);
    assert.deepEqual([merged.minPct, merged.maxPct], [13, 20]);
    assert.equal(merged.defaultPct, 20, '10 + 15.6 + 2 + 2 = 29.6 → 20');
  });

  test('규칙 기반 문구 — 공개 사실에서만(지어낸 숫자 없음) · 길이 한도 · 점수 · 물성 낱말 없음', () => {
    const pipeline = (step: 'patent' | 'ind' | 'phase1' | 'phase2' | 'phase3' | 'final', outcome: 'filed' | 'passed' | 'failed', extra: Record<string, unknown> = {}) => ({
      codeName: 'CRX-101',
      mechanism: 'AChE 억제로 아세틸콜린 분해를 줄인다',
      step,
      outcome,
      patents: 2,
      ...extra,
    });
    const inputs: AnalystFallbackInput[] = [
      { trigger: 'patent', ticker: 'HLX', detail: { patentId: 'p1' }, changePct: 2, rating: 'BUY', facts: { pipeline: pipeline('patent', 'filed') as never } },
      { trigger: 'ind', ticker: 'HLX', detail: { stepId: 's1', kind: 'ind', passed: true, formulation: 'oral' }, changePct: 2, rating: 'BUY', facts: { pipeline: pipeline('ind', 'passed', { dose: 10, formulation: 'oral', population: '경도 알츠하이머병 환자', endpoint: '인지 기능 점수(ADAS-Cog) 변화' }) as never } },
      { trigger: 'ind', ticker: 'HLX', detail: { stepId: 's1', kind: 'ind', passed: false, formulation: 'iv' }, changePct: -4, rating: 'SHORT_WARNING', facts: { pipeline: pipeline('ind', 'failed', { failure: 'safety', dose: 100, formulation: 'iv' }) as never } },
      { trigger: 'trial', ticker: 'HLX', detail: { stepId: 's2', kind: 'phase2', passed: false, formulation: 'oral' }, changePct: -12, rating: 'SHORT_WARNING', facts: { pipeline: pipeline('phase2', 'failed', { failure: 'efficacy', dose: 50, formulation: 'oral' }) as never } },
      { trigger: 'trial', ticker: 'HLX', detail: { stepId: 's3', kind: 'phase3', passed: true, formulation: 'transdermal' }, changePct: 10, rating: 'STRONG_BUY', facts: { pipeline: pipeline('phase3', 'passed', { dose: 50, formulation: 'transdermal' }) as never } },
      { trigger: 'trial', ticker: 'HLX', detail: { stepId: 's4', kind: 'phase1', passed: false }, changePct: -6, rating: 'SHORT_WARNING', facts: { pipeline: pipeline('phase1', 'failed', { failure: 'both' }) as never } },
      { trigger: 'approval', ticker: 'HLX', detail: { stepId: 's5', kind: 'final', passed: true, formulation: 'oral' }, changePct: 15.6, rating: 'STRONG_BUY', facts: { pipeline: pipeline('final', 'passed', { dose: 10, formulation: 'oral' }) as never } },
      { trigger: 'approval', ticker: 'HLX', detail: { stepId: 's5', kind: 'final', passed: false, formulation: 'oral' }, changePct: -8, rating: 'SHORT_WARNING', facts: { pipeline: pipeline('final', 'failed') as never } },
      // 공개 사실이 없을 때(세부만)
      { trigger: 'trial', ticker: 'HLX', detail: { stepId: 's6', kind: 'phase3', passed: true }, changePct: 10, rating: 'STRONG_BUY' },
      { trigger: 'trial', ticker: 'HLX', detail: { stepId: 's7' }, changePct: 0, rating: 'HOLD' },
    ];
    const numbers = (text: string) => text.match(/\d+(?:\.\d+)?/g) ?? [];
    for (const input of inputs) {
      const text = analystFallback(input);
      assert.ok([...text.headline].length <= 60, text.headline);
      assert.ok([...text.comment].length <= 200, text.comment);
      assert.ok(text.rationale.length <= 3 && text.rationale.every((r) => [...r].length <= 80));
      // 허용 숫자: 입력(세부 · 공개 사실 · 단계 이름의 상 번호) + 적용 Δ 표기 + 규칙 상수(제형 배율).
      const allowed = new Set<string>([
        ...numbers(JSON.stringify(input)),
        ...numbers(formatChangePct(input.changePct)),
        ...Object.values(FORMULATION_MARKET_MULTIPLIER).map(String),
      ]);
      for (const line of [text.headline, text.comment, ...text.rationale]) {
        for (const n of numbers(line)) assert.ok(allowed.has(n), `${input.trigger}: '${n}' in "${line}"`);
        // 공개 범위 — 점수 · 흔들림 · 물성 낱말이 문구에 없다.
        assert.ok(!/효능 점수|안전 점수|흔들림|cLogP|TPSA|SMILES|E =|S =/.test(line), line);
        // 학생 글(기전)을 문구에 그대로 옮기지 않는다.
        assert.ok(!line.includes('아세틸콜린 분해'), line);
      }
    }
    const indPass = analystFallback(inputs[1]!);
    assert.ok(indPass.headline.includes('CRX-101') && indPass.headline.includes('IND 승인'), indPass.headline);
    assert.ok(indPass.rationale.some((r) => r.includes('10 mg') && r.includes('경구')), indPass.rationale.join('|'));
    const p2 = analystFallback(inputs[3]!);
    assert.ok(p2.headline.includes('임상 2상 보류(CRL)') && p2.comment.includes('효능 기준 미달'), p2.comment);
    const appr = analystFallback(inputs[6]!);
    assert.ok(appr.comment.includes('×1.3') && appr.headline.includes('최종 허가'), appr.comment);
    assert.ok(analystFallback(inputs[9]!).headline.includes('임상 시험'), '세부가 모자라면 계기 이름');
  });
});
