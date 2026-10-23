/**
 * 봉 · 등락 · 순위 — 시세판(괘지 장부)에 싣는 파생 값. 봉은 현실 5분, 7일 보관(파생 데이터).
 */
import type { CandleView, LeaderboardView, TeamId, TeamInkKey } from '@crista/shared-types';
import { CANDLE_MS, CANDLE_RETENTION_MS, CHANGE_WINDOW_MS, MARKET_RULES } from './rules.ts';

/** 봉 시작 시각 — 5분 단위 내림. */
export function candleBucket(atMs: number): number {
  return Math.floor(atMs / CANDLE_MS) * CANDLE_MS;
}

/**
 * 가격 한 점을 봉에 반영한다(새 배열). 같은 봉이면 고가 · 저가 · 종가 · 거래량을 갱신하고, 새 봉이면 시가 = 직전 종가가 아니라 이 가격으로 연다.
 * 시각이 마지막 봉보다 이르면(시계 역행) 마지막 봉에 넣는다.
 */
export function updateCandles(candles: readonly CandleView[], atMs: number, priceUsd: number, volume = 0): CandleView[] {
  const t = candleBucket(atMs);
  const out = candles.slice();
  const last = out[out.length - 1];
  if (last && t <= last.t) {
    out[out.length - 1] = { ...last, h: Math.max(last.h, priceUsd), l: Math.min(last.l, priceUsd), c: priceUsd, v: last.v + volume };
    return out;
  }
  out.push({ t, o: priceUsd, h: priceUsd, l: priceUsd, c: priceUsd, v: volume });
  return out;
}

/** 7일이 지난 봉을 뺀다. */
export function pruneCandles(candles: readonly CandleView[], nowMs: number): CandleView[] {
  const cutoff = nowMs - CANDLE_RETENTION_MS;
  return candles.filter((c) => c.t + CANDLE_MS > cutoff);
}

/** 시세판에 싣는 최근 봉(최대 72개). */
export function recentCandles(candles: readonly CandleView[]): CandleView[] {
  return candles.slice(-MARKET_RULES.candlesInState);
}

/**
 * 최근 현실 24시간 등락(%) — 24시간 전 시각이 든 봉(또는 그 직전 봉)의 종가 대비. 그보다 짧게 상장했으면 상장가 대비.
 */
export function changePct24h(candles: readonly CandleView[], nowMs: number, priceUsd: number, listingPriceUsd: number): number {
  const ref = nowMs - CHANGE_WINDOW_MS;
  let base: number | null = null;
  for (const c of candles) {
    if (c.t <= ref) base = c.c;
    else break;
  }
  const from = base ?? listingPriceUsd;
  if (!(from > 0)) return 0;
  return ((priceUsd - from) / from) * 100;
}

export interface CapRow {
  teamId: TeamId;
  ticker: string;
  companyName: string;
  inkKey: TeamInkKey;
  marketCapCents: number;
}

/** 시가총액 순위(큰 것이 앞, 같으면 티커 순). */
export function rankMarketCap(rows: readonly CapRow[]): LeaderboardView['marketCap'] {
  return rows
    .slice()
    .sort((a, b) => b.marketCapCents - a.marketCapCents || a.ticker.localeCompare(b.ticker))
    .map((r, i) => ({ rank: i + 1, ...r }));
}

export interface InvestorRow {
  userId: string;
  displayName: string;
  /** v9: 시간가중 투자 수익률(%) — 성과급 · 팬텀스톡 유입을 뺀 순수 투자 성과. */
  returnPct: number;
  /** v9: 경영 보상(성과급 + 팬텀스톡, 센트) — 순위와 따로 보인다. */
  executiveCents?: number;
}

/** 수익률 순위 — 상위 5명 + 받는 사람(5위 밖이면 끝에 하나 더). 같으면 이름 순. */
export function rankInvestors(rows: readonly InvestorRow[], youUserId: string | null, top = 5): LeaderboardView['investors'] {
  const sorted = rows
    .slice()
    .sort((a, b) => b.returnPct - a.returnPct || a.displayName.localeCompare(b.displayName) || a.userId.localeCompare(b.userId));
  const out: LeaderboardView['investors'] = [];
  sorted.forEach((r, i) => {
    const you = r.userId === youUserId;
    if (i < top || you) out.push({ rank: i + 1, displayName: r.displayName, returnPct: r.returnPct, you, ...(r.executiveCents !== undefined ? { executiveCents: r.executiveCents } : {}) });
  });
  return out;
}
