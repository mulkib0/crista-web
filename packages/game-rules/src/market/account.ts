/**
 * 개인 계좌 · 주문 판정 · 증거금 · 강제 청산(숏스퀴즈) — 균형안 §9.1 · §9.4.
 * 금액은 정수 센트, 주가는 달러. 순자산 = 현금 + 롱 평가액 − 숏 상환 부담. 수익률 = (순자산 − 시드) / 시드.
 * 평가는 학생에게 불리한 쪽으로 센트를 맞춘다(롱 평가액 내림 · 숏 상환 부담 올림).
 */
import type { ErrorCode, ListingStatus, OrderSide, TeamId } from '@crista/shared-types';
import {
  ceilCents,
  floorCents,
  marketPrice,
  quoteFill,
  sharesToRaise,
  violatesLimit,
  type FillQuote,
  type PriceState,
} from './price.ts';
import { MARKET_RULES } from './rules.ts';

export interface PositionState {
  readonly teamId: TeamId;
  readonly longShares: number;
  readonly shortShares: number;
  /** 롱 평균 매입가 · 숏 평균 매도가(달러). */
  readonly avgCostUsd: number;
}

export interface AccountState {
  readonly cashCents: number;
  readonly seedCents: number;
  readonly positions: readonly PositionState[];
}

/** 종목 시세 — 평가에 쓰는 시장가와 상태. */
export interface ListingMark {
  readonly priceUsd: number;
  readonly status: ListingStatus;
}

export type Marks = ReadonlyMap<TeamId, ListingMark>;

export interface AccountValuation {
  readonly cashCents: number;
  readonly longValueCents: number;
  readonly shortValueCents: number;
  readonly equityCents: number;
  readonly returnPct: number;
  /** 유지 기준 = 숏 평가액 × 30%(올림). 숏이 없으면 0. */
  readonly requiredCents: number;
  /** 순자산 − 유지 기준. */
  readonly excessCents: number;
  /** 더 공매도할 수 있는 숏 평가액 = max(0, 순자산 × 1.0 − 숏 평가액). */
  readonly shortCapacityCents: number;
}

function markPrice(marks: Marks, teamId: TeamId, fallbackUsd: number): number {
  return marks.get(teamId)?.priceUsd ?? fallbackUsd;
}

/** 포지션 한 줄의 평가액 — 롱 +(내림), 숏 −(올림). */
export function positionValueCents(position: PositionState, priceUsd: number): number {
  if (position.longShares > 0) return floorCents(position.longShares * priceUsd);
  if (position.shortShares > 0) return -ceilCents(position.shortShares * priceUsd);
  return 0;
}

/** 계좌 평가(순자산 · 수익률 · 증거금). 시세가 없는 종목은 평균가로 본다. */
export function valueAccount(account: AccountState, marks: Marks): AccountValuation {
  let longValue = 0;
  let shortValue = 0;
  for (const p of account.positions) {
    const price = markPrice(marks, p.teamId, p.avgCostUsd);
    if (p.longShares > 0) longValue += floorCents(p.longShares * price);
    if (p.shortShares > 0) shortValue += ceilCents(p.shortShares * price);
  }
  const equity = account.cashCents + longValue - shortValue;
  const required = shortValue > 0 ? ceilCents((shortValue / 100) * MARKET_RULES.shortMaintenanceRatio) : 0;
  return {
    cashCents: account.cashCents,
    longValueCents: longValue,
    shortValueCents: shortValue,
    equityCents: equity,
    returnPct: account.seedCents > 0 ? ((equity - account.seedCents) / account.seedCents) * 100 : 0,
    requiredCents: required,
    excessCents: equity - required,
    shortCapacityCents: Math.max(0, Math.floor(equity * MARKET_RULES.shortInitialMarginRatio) - shortValue),
  };
}

/** 유지 증거금 미달 — 순자산 < 숏 평가액 × 30%. */
export function breachesMaintenance(valuation: AccountValuation): boolean {
  return valuation.shortValueCents > 0 && valuation.equityCents < (valuation.shortValueCents * MARKET_RULES.shortMaintenanceRatio);
}

/** 체결을 포지션에 반영한다(평균가: 늘릴 때 가중 평균, 줄일 때 그대로, 0 이 되면 0). */
export function applyFillToPosition(position: PositionState, side: OrderSide, shares: number, avgPriceUsd: number): PositionState {
  switch (side) {
    case 'buy': {
      const total = position.longShares + shares;
      const avg = total > 0 ? (position.longShares * position.avgCostUsd + shares * avgPriceUsd) / total : 0;
      return { ...position, longShares: total, avgCostUsd: avg };
    }
    case 'sell': {
      const left = position.longShares - shares;
      return { ...position, longShares: left, avgCostUsd: left > 0 ? position.avgCostUsd : 0 };
    }
    case 'short': {
      const total = position.shortShares + shares;
      const avg = total > 0 ? (position.shortShares * position.avgCostUsd + shares * avgPriceUsd) / total : 0;
      return { ...position, shortShares: total, avgCostUsd: avg };
    }
    case 'cover': {
      const left = position.shortShares - shares;
      return { ...position, shortShares: left, avgCostUsd: left > 0 ? position.avgCostUsd : 0 };
    }
  }
}

export function emptyPosition(teamId: TeamId): PositionState {
  return { teamId, longShares: 0, shortShares: 0, avgCostUsd: 0 };
}

/** 계좌의 포지션을 바꿔 끼운다(0 이 되면 뺀다). */
export function replacePosition(account: AccountState, next: PositionState): AccountState {
  const others = account.positions.filter((p) => p.teamId !== next.teamId);
  const keep = next.longShares > 0 || next.shortShares > 0;
  return { ...account, positions: keep ? [...others, next] : others };
}

// ─────────────────────────────── 주문 판정 ───────────────────────────────

export interface OrderCheckInput {
  readonly side: OrderSide;
  readonly shares: number;
  readonly limitPriceUsd?: number;
  /** 시장이 열려 있는가(학급 일시정지 중이면 false). */
  readonly marketOpen: boolean;
  readonly listingStatus: ListingStatus;
  /** 주문한 학생의 회사 종목인가. */
  readonly ownCompany: boolean;
  /** 그 종목 지금 상태(감쇠 반영). */
  readonly state: PriceState;
  readonly shortInterestShares: number;
  readonly account: AccountState;
  /** 다른 종목 시세(공매도 개시 한도 평가). 이 종목 값은 체결 뒤 가격으로 덮어 쓴다. */
  readonly marks: Marks;
  readonly teamId: TeamId;
}

export type OrderCheck =
  | { readonly ok: true; readonly fill: FillQuote; readonly position: PositionState; readonly account: AccountState }
  | { readonly ok: false; readonly code: ErrorCode; readonly message: string; readonly retryable: boolean };

function deny(code: ErrorCode, message: string, retryable = false): OrderCheck {
  return { ok: false, code, message, retryable };
}

/** 주문 수량 입력 검증 — 정수 1~100,000주. */
export function isValidOrderShares(shares: unknown): shares is number {
  return (
    typeof shares === 'number' &&
    Number.isInteger(shares) &&
    shares >= MARKET_RULES.minOrderShares &&
    shares <= MARKET_RULES.maxOrderShares
  );
}

/**
 * 시장가 주문 판정(균형안 §9.1 · §9.4) — 통과하면 체결 견적과 체결 뒤 포지션 · 계좌를 돌려준다.
 * 순서: 수량 → 시장 열림 → 거래 정지 → 자기 회사 → 방향별(롱 · 숏 동시 금지 · 보유 수량 · 음수 현금 · 대금 · 공매도 잔고 상한 · 개시 한도) → 보호 한도.
 */
export function checkOrder(input: OrderCheckInput): OrderCheck {
  const { side, shares } = input;
  if (!isValidOrderShares(shares)) {
    return deny('bad_request', `주문 수량은 ${MARKET_RULES.minOrderShares}~${MARKET_RULES.maxOrderShares.toLocaleString('en-US')}주 정수입니다.`);
  }
  if (!input.marketOpen) return deny('class_paused', '학급이 일시정지 중이라 시장이 닫혀 있습니다. 재개 뒤 다시 주문하세요.', true);
  if (input.listingStatus !== 'listed') return deny('trading_halted', '거래 정지 · 상장 폐지된 종목입니다.');
  if (input.ownCompany) return deny('self_trade_forbidden', '자기 회사 주식은 사고팔 수 없습니다.');

  const position = input.account.positions.find((p) => p.teamId === input.teamId) ?? emptyPosition(input.teamId);
  const cash = input.account.cashCents;
  const fill = quoteFill(input.state, side, shares);

  switch (side) {
    case 'buy':
      if (position.shortShares > 0) return deny('insufficient_shares', '공매도 잔고가 있는 종목은 매수할 수 없습니다 — 먼저 환매수하세요.');
      if (cash < 0) return deny('margin_insufficient', '계좌 현금이 음수라 새 매수를 할 수 없습니다.');
      if (-fill.cashCents > cash) return deny('insufficient_funds', '계좌 현금이 모자랍니다.');
      break;
    case 'sell':
      if (position.longShares < shares) return deny('insufficient_shares', '가진 주식보다 많이 팔 수 없습니다.');
      break;
    case 'short':
      if (position.longShares > 0) return deny('insufficient_shares', '보유한 종목은 공매도할 수 없습니다 — 먼저 매도하세요.');
      if (cash < 0) return deny('margin_insufficient', '계좌 현금이 음수라 새 공매도를 할 수 없습니다.');
      if (input.shortInterestShares + shares > Math.floor(input.state.sharesOutstanding * MARKET_RULES.shortInterestCapRatio)) {
        return deny('short_limit', '이 종목의 공매도 잔고가 상한(유통 주식의 20%)에 닿습니다.');
      }
      break;
    case 'cover':
      if (position.shortShares < shares) return deny('insufficient_shares', '공매도 잔고보다 많이 환매수할 수 없습니다.');
      if (-fill.cashCents > cash) return deny('insufficient_funds', '계좌 현금이 모자랍니다.');
      break;
  }

  if (violatesLimit(side, fill.avgPriceUsd, input.limitPriceUsd)) {
    return deny('price_moved', '평균 체결가가 보호 한도를 넘었습니다 — 시세를 다시 보고 주문하세요.', true);
  }

  const nextPosition = applyFillToPosition(position, side, shares, fill.avgPriceUsd);
  const nextAccount = replacePosition({ ...input.account, cashCents: cash + fill.cashCents }, nextPosition);

  if (side === 'short') {
    const marks = new Map(input.marks);
    marks.set(input.teamId, { priceUsd: fill.priceAfterUsd, status: 'listed' });
    const after = valueAccount(nextAccount, marks);
    if (after.shortValueCents > after.equityCents * MARKET_RULES.shortInitialMarginRatio) {
      return deny('margin_insufficient', '공매도 개시 한도(숏 평가액 합 ≤ 순자산)를 넘습니다.');
    }
  }
  return { ok: true, fill, position: nextPosition, account: nextAccount };
}

// ─────────────────────────────── 강제 청산 · 숏스퀴즈 ───────────────────────────────

export interface ForcedStep {
  readonly kind: 'forced_cover' | 'forced_sell';
  readonly teamId: TeamId;
  readonly shares: number;
  readonly fill: FillQuote;
}

export interface ForcedPlan {
  readonly steps: ForcedStep[];
  readonly account: AccountState;
  /** 단계마다 바뀐 종목 상태(압력). */
  readonly states: Map<TeamId, PriceState>;
  /** 끝난 뒤에도 현금이 음수(빚)인가. */
  readonly negativeCash: boolean;
}

function marksOf(states: ReadonlyMap<TeamId, PriceState>, statuses: ReadonlyMap<TeamId, ListingStatus>): Map<TeamId, ListingMark> {
  const marks = new Map<TeamId, ListingMark>();
  for (const [teamId, s] of states) marks.set(teamId, { priceUsd: marketPrice(s), status: statuses.get(teamId) ?? 'listed' });
  return marks;
}

/**
 * 한 계좌의 강제 청산 계획(균형안 §9.4):
 * ① 유지 증거금 미달이면 숏 평가액이 큰 종목부터 하나씩 **전량** 환매수하고 다시 확인한다(환매수는 매수 압력 — 가격이 오른다).
 * ② 그 뒤 현금이 음수면 롱을 평가액이 큰 것부터 0 이상이 될 만큼 판다(`forced_sell`). 그래도 음수면 빚으로 남긴다.
 * 거래 중(`listed`)인 종목만 청산한다 — 정지 종목 포지션은 묶여 있다.
 * 단계 수 ≤ 그 계좌의 포지션 수(종목마다 한 번)라 반드시 끝난다.
 */
export function planForcedLiquidation(
  account: AccountState,
  states: ReadonlyMap<TeamId, PriceState>,
  statuses: ReadonlyMap<TeamId, ListingStatus>,
): ForcedPlan {
  const live = new Map(states);
  let acct = account;
  const steps: ForcedStep[] = [];
  const tradable = (teamId: TeamId) => (statuses.get(teamId) ?? 'listed') === 'listed' && live.has(teamId);

  // ① 강제 환매수
  for (let guard = 0; guard <= account.positions.length; guard++) {
    const valuation = valueAccount(acct, marksOf(live, statuses));
    if (!breachesMaintenance(valuation)) break;
    const shorts = acct.positions
      .filter((p) => p.shortShares > 0 && tradable(p.teamId))
      .map((p) => ({ p, value: ceilCents(p.shortShares * marketPrice(live.get(p.teamId)!)) }))
      .sort((a, b) => b.value - a.value || a.p.teamId.localeCompare(b.p.teamId));
    const target = shorts[0];
    if (!target) break;
    const state = live.get(target.p.teamId)!;
    const fill = quoteFill(state, 'cover', target.p.shortShares);
    live.set(target.p.teamId, { ...state, flow: fill.flowAfter });
    acct = replacePosition({ ...acct, cashCents: acct.cashCents + fill.cashCents }, applyFillToPosition(target.p, 'cover', target.p.shortShares, fill.avgPriceUsd));
    steps.push({ kind: 'forced_cover', teamId: target.p.teamId, shares: target.p.shortShares, fill });
  }

  // ② 음수 현금 → 강제 매도
  for (let guard = 0; guard <= account.positions.length && acct.cashCents < 0; guard++) {
    const longs = acct.positions
      .filter((p) => p.longShares > 0 && tradable(p.teamId))
      .map((p) => ({ p, value: floorCents(p.longShares * marketPrice(live.get(p.teamId)!)) }))
      .sort((a, b) => b.value - a.value || a.p.teamId.localeCompare(b.p.teamId));
    const target = longs[0];
    if (!target) break;
    const state = live.get(target.p.teamId)!;
    const shares = sharesToRaise(state, -acct.cashCents, target.p.longShares);
    if (shares <= 0) break;
    const fill = quoteFill(state, 'sell', shares);
    live.set(target.p.teamId, { ...state, flow: fill.flowAfter });
    acct = replacePosition({ ...acct, cashCents: acct.cashCents + fill.cashCents }, applyFillToPosition(target.p, 'sell', shares, fill.avgPriceUsd));
    steps.push({ kind: 'forced_sell', teamId: target.p.teamId, shares, fill });
  }

  return { steps, account: acct, states: live, negativeCash: acct.cashCents < 0 };
}

export interface SqueezeAccount {
  readonly accountId: string;
  readonly account: AccountState;
}

export interface SqueezeResult {
  readonly accounts: Map<string, AccountState>;
  readonly states: Map<TeamId, PriceState>;
  /** 일어난 순서대로(계좌 · 단계). */
  readonly events: Array<{ accountId: string; step: ForcedStep }>;
  /** 돈 바퀴 수 — 상한(숏 포지션 수 + 2)을 넘지 않는다. */
  readonly rounds: number;
}

/**
 * 숏스퀴즈 루프(학급 전체 모의) — 가격 변화 뒤 숏 계좌를 차례로 확인해 미달이면 강제 청산하고, 그 환매수가 올린 가격으로
 * **같은 종목의 다른 숏 계좌를 다시 확인**한다. 강제 환매수마다 숏 포지션이 하나씩 없어지므로 바퀴 수 ≤ 숏 포지션 수 + 2 로 끝난다.
 * 서버는 같은 순서(계좌 id 순)로 계좌마다 트랜잭션 하나씩 실행한다.
 */
export function runSqueezeLoop(
  accounts: readonly SqueezeAccount[],
  states: ReadonlyMap<TeamId, PriceState>,
  statuses: ReadonlyMap<TeamId, ListingStatus>,
): SqueezeResult {
  const book = new Map(accounts.map((a) => [a.accountId, a.account] as const));
  let live = new Map(states);
  const events: Array<{ accountId: string; step: ForcedStep }> = [];
  const order = [...book.keys()].sort();
  // 바뀐 바퀴마다 강제 환매수가 숏 포지션을 하나 이상 없애거나(음수 현금 매도는 환매수와 같은 계획 안에서만 생긴다),
  // 처음부터 음수 현금이던 계좌를 정리한다 — 그래서 숏 포지션 수 + 1 바퀴 안에 바뀌지 않는 바퀴가 온다.
  const cap = accounts.reduce((n, a) => n + a.account.positions.filter((p) => p.shortShares > 0).length, 0) + 2;
  let rounds = 0;
  for (; rounds < cap; rounds++) {
    let changed = false;
    for (const id of order) {
      const plan = planForcedLiquidation(book.get(id)!, live, statuses);
      if (plan.steps.length === 0) continue;
      changed = true;
      book.set(id, plan.account);
      live = plan.states;
      for (const step of plan.steps) events.push({ accountId: id, step });
    }
    if (!changed) break;
  }
  return { accounts: book, states: live, events, rounds };
}
