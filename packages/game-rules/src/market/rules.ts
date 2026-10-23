/**
 * 증시 상수 — 균형안 v0 §9.1~§9.5 의 값 그대로(단일 소스: docs/2026-10-19-game-balance-v0.md §9).
 * 화면 안내용 `MarketRulesView` 와 같은 값을 `marketRulesView()` 로 싣는다.
 */
import type { MarketRulesView } from '@crista/shared-types';
import { ECONOMY_VERSION, STUDENT_SEED_CENTS } from '../economy.ts';

export const MARKET_RULES = {
  economyVersion: ECONOMY_VERSION,
  // §9.1 상장과 계좌
  /** 초기 펀더멘털 · 시장가(달러). */
  initialPriceUsd: 10,
  /** 발행 주식(주) — 시가총액 $10.000M. */
  initialShares: 1_000_000,
  /** 학생 개인 계좌 시드(센트) — $100,000(§3.1). */
  seedCents: STUDENT_SEED_CENTS,
  /** 주문 수량 범위(입력 검증). */
  minOrderShares: 1,
  maxOrderShares: 100_000,
  // §9.2 가격
  /** 수급 항 폭 — 시장가 = F × M × (1 + 0.30 × tanh(s/D)). */
  flowBand: 0.3,
  /** 깊이 D = 유통 주식 × 5%. */
  depthRatio: 0.05,
  /** 순주문 압력 반감기(학급 운영 시간, 분). */
  flowHalfLifeMinutes: 30,
  /** 펀더멘털 하한(달러). */
  fundamentalFloorUsd: 0.1,
  /** 시장 수요 배율 M 의 범위(이벤트 비용 배율과 같은 규칙 — §5). */
  demandMin: 0.7,
  demandMax: 1.3,
  // §9.4 공매도 · 증거금
  /** 공매도 개시 한도 — 공매도 뒤 숏 평가액 합 ≤ 순자산 × 1.0. */
  shortInitialMarginRatio: 1.0,
  /** 유지 증거금 — 순자산 < 숏 평가액 합 × 30% 이면 강제 환매수. */
  shortMaintenanceRatio: 0.3,
  /** 종목별 공매도 잔고 상한 — 유통 주식의 20%. */
  shortInterestCapRatio: 0.2,
  // §9.5 유상증자 · 정지 · 폐지
  offering: {
    /** 1회 발행 한도 — 유통 주식의 20%. */
    maxSharesRatio: 0.2,
    /** 최소 발행 수량(주). */
    minShares: 10_000,
    /** 발행가 = 공시 시점 시장가 × (1 − 10%), 센트 내림. */
    discountRatio: 0.1,
    /** 청약 기간(학급 운영 시간, 분). */
    windowMinutes: 10,
    /** 직전 증자 마감 뒤 다음 증자까지(학급 운영 시간, 분). */
    cooldownMinutes: 60,
    /** 1인 청약 상한 = 발행 주식의 25%. */
    perInvestorCapRatio: 0.25,
  },
  /** 거래 정지 뒤 정리까지(학급 운영 시간, 시간). */
  suspensionSettleHours: 24,
  // §9.3 리포트 대기열
  /** 대기 중인 계기가 이 수를 넘으면 하나로 합친다. */
  analystMergeThreshold: 3,
  /** 합친 계기의 Δ · 범위 상한(±%). */
  analystMergeCapPct: 20,
  // 화면 · 봉
  /** 시세판 사다리 수량(주) — 100 · 1,000 · 10,000. */
  ladderShares: [100, 1_000, 10_000] as const,
  /** 봉 길이(현실 분). */
  candleMinutes: 5,
  /** 봉 보관(현실 일). */
  candleRetentionDays: 7,
  /** 시세판에 싣는 봉 수(72 = 6시간). */
  candlesInState: 72,
  /** 등락 기준(현실 시간). */
  changeWindowHours: 24,
} as const;

export const MS_PER_MARKET_MINUTE = 60_000;
export const FLOW_HALF_LIFE_MS = MARKET_RULES.flowHalfLifeMinutes * MS_PER_MARKET_MINUTE;
export const OFFERING_WINDOW_MS = MARKET_RULES.offering.windowMinutes * MS_PER_MARKET_MINUTE;
export const OFFERING_COOLDOWN_MS = MARKET_RULES.offering.cooldownMinutes * MS_PER_MARKET_MINUTE;
export const SUSPENSION_SETTLE_MS = MARKET_RULES.suspensionSettleHours * 60 * MS_PER_MARKET_MINUTE;
export const CANDLE_MS = MARKET_RULES.candleMinutes * MS_PER_MARKET_MINUTE;
export const CANDLE_RETENTION_MS = MARKET_RULES.candleRetentionDays * 24 * 60 * MS_PER_MARKET_MINUTE;
export const CHANGE_WINDOW_MS = MARKET_RULES.changeWindowHours * 60 * MS_PER_MARKET_MINUTE;

/** 화면 안내용 규칙 값(`MarketRulesView`) — 백분율은 % 단위. */
export function marketRulesView(): MarketRulesView {
  const r = MARKET_RULES;
  return {
    economyVersion: r.economyVersion,
    seedCents: r.seedCents,
    flowBandPct: r.flowBand * 100,
    depthRatio: r.depthRatio,
    flowHalfLifeMinutes: r.flowHalfLifeMinutes,
    shortInitialMarginRatio: r.shortInitialMarginRatio,
    shortMaintenanceRatio: r.shortMaintenanceRatio,
    shortInterestCapPct: r.shortInterestCapRatio * 100,
    maxOrderShares: r.maxOrderShares,
    offering: {
      discountPct: r.offering.discountRatio * 100,
      maxSharesRatio: r.offering.maxSharesRatio,
      minShares: r.offering.minShares,
      windowMinutes: r.offering.windowMinutes,
      cooldownMinutes: r.offering.cooldownMinutes,
      perInvestorCapRatio: r.offering.perInvestorCapRatio,
    },
    suspensionSettleHours: r.suspensionSettleHours,
  };
}
