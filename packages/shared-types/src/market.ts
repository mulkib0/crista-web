/**
 * 바이오 증권거래소(#s50) — 상장 · 시세 · 주문 · 개인 계좌 · 유상증자 · 애널리스트 리포트 · 거래 정지 · 상장 폐지의 규격(M4, 프로토콜 v4).
 * 계산은 서버가 하고(`@crista/game-rules` 의 `market/` 순수 함수), 클라이언트는 그리기만 한다.
 * 단일 소스: docs/2026-10-19-game-balance-v0.md §9(증시 초기안) · PRD §1.2-4 · §3 · ARCHITECTURE §1.2 · §2.
 *
 * ## 현장 객장 원칙 (PRD §3.1)
 * 시세 · 차트 · 계좌 · 주문 · 청약은 **도시 맵의 객장 구역(`zone-exchange-floor`) 안에 서 있는 사람**에게만 열린다.
 * 서버가 서버 권위 위치로 판정하고(`ExchangePresenceMessage`), 구역 밖의 주문은 `not_at_exchange` 로 거절한다.
 * 구역 밖에서는 학급 전체 속보(`MarketNewsMessage` — 헤드라인 · 투자의견 · 정지/폐지)만 받는다.
 *
 * ## 가격 (PRD §3.3 — 펀더멘털 70% + 수급 30%)
 * 시장가 P = F × M × (1 + 0.30 × tanh(s / D))
 * - F: 펀더멘털 적정가(애널리스트 리포트마다 F ← F × (1 + Δ), Δ 는 계기별 범위 안으로 자른다).
 * - M: 시장 수요 배율(이벤트 `marketDemand` 가 적용 중일 때만, 0.70~1.30 으로 자른다. 같은 사건은 한 번만 — 균형안 §5).
 * - s: 순주문 압력(주). 매수 · 환매수 · 청약 +, 매도 · 공매도 −. 운영 시간 반감기로 0 을 향해 줄어든다.
 * - D: 깊이 = 유통 주식 × 5%.
 * 수급 항이 ±30% 를 넘지 않으므로 **30% 밴드**가 저절로 지켜진다. 체결가는 압력 변화 구간의 평균(적분)이라 같은 수량을 사고 바로 팔아 이득을 볼 수 없다.
 *
 * ## 금액
 * 계좌 현금 · 체결 대금 · 청약 대금은 정수 센트. 주가는 달러 소수(표시는 `$12.34`, 계산은 반올림하지 않는다).
 * 매수 · 환매수 대금은 센트 올림, 매도 · 공매도 대금은 센트 내림(학생에게 불리한 쪽으로 — 쪼개 거래해 1센트를 버는 길을 막는다).
 */
import type { ClassId, CompanyStatus, DistrictType, TeamId, TeamInkKey, UserId } from './domain.ts';
import type { PipelinePublicSummary } from './pipeline.ts';

// ──────────────────────────────── 기본 종류 ────────────────────────────────

/** 애널리스트 투자의견(PRD §3.3). 화면 표기: STRONG BUY · BUY · HOLD · SHORT WARNING. */
export type AnalystRating = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SHORT_WARNING';

/**
 * 상장 상태.
 * - `listed`: 거래 중.
 * - `suspended`: 거래 정지 — 회사 파산 판정 직후. 주문 · 청약을 받지 않고 포지션은 묶인다. 재창업하거나 운영 시간 24시간이 지나면 `delisted` 로 정리하고,
 *   그 전에 교사가 파산 판정을 정정(번복)하면 `listed` 로 돌아간다.
 * - `delisted`: 상장 폐지 — 정리가로 모든 포지션을 청산했다(구회사 식별자에 묶어 정리 — 균형안 §4).
 * - `voided`: 학급 복원으로 없던 일이 된 상장(그 회사가 `voided`). 보내지 않는다.
 */
export type ListingStatus = 'listed' | 'suspended' | 'delisted' | 'voided';

/** 주문 방향. `buy` 매수(Long) · `sell` 보유분 매도 · `short` 공매도 · `cover` 공매도 환매수. */
export type OrderSide = 'buy' | 'sell' | 'short' | 'cover';

/**
 * 계좌 원장 한 줄의 종류 — 개인 계좌 현금이 바뀌는 모든 경우. 원장 합계 = 현금(회사 원장과 같은 규칙).
 * `forced_cover` · `forced_sell` 은 유지 증거금 미달로 서버가 강제 청산한 것(숏스퀴즈 루프), `delist` 는 상장 폐지 정리,
 * `restore` 는 학급 복원의 보정 한 줄, `correction` 은 교사 정정.
 */
export type TradeKind =
  | 'seed'
  | 'buy'
  | 'sell'
  | 'short'
  | 'cover'
  | 'forced_cover'
  | 'forced_sell'
  | 'subscribe'
  | 'delist'
  | 'restore'
  | 'correction'
  // ── v9 (동기부여 Step 2 — 설계서 §3.3, 사용자 결정 #4)
  /** C-Level 균등 성과급 — 회사 마일스톤 최초 달성 때 그 회사 학생 전원에게 같은 금액. 키 `bonus:<accountId>:<milestone>`. */
  | 'bonus'
  /** 팬텀스톡 정산 — 학급 최종 정산 때 1회. 키 `phantom:<accountId>`. */
  | 'phantom_settle';

// ──────────────────────────────── C-Level 성과급 · 팬텀스톡 (v9) ────────────────────────────────

/** 성과급 마일스톤(설계서 §3.3 (B)) — 학생마다 마일스톤 하나에 한 번. */
export type ExecutiveMilestone = 'seriesA' | 'seriesB' | 'firstPatent' | 'indApproved' | 'phase1' | 'phase2' | 'phase3' | 'approval';

export const EXECUTIVE_MILESTONES: readonly ExecutiveMilestone[] = ['seriesA', 'seriesB', 'firstPatent', 'indApproved', 'phase1', 'phase2', 'phase3', 'approval'];

/** 팀원 1인당 균등 지급액(센트) — 합계 $12,000. 직책(CEO · CSO · CTO · CMO) 차등 없음. */
export const EXECUTIVE_BONUS_CENTS: Record<ExecutiveMilestone, number> = {
  seriesA: 100_000,
  seriesB: 150_000,
  firstPatent: 50_000,
  indApproved: 50_000,
  phase1: 100_000,
  phase2: 200_000,
  phase3: 250_000,
  approval: 300_000,
};

export const EXECUTIVE_MILESTONE_LABEL: Record<ExecutiveMilestone, string> = {
  seriesA: 'Series A 최초 승인',
  seriesB: 'Series B 최초 승인',
  firstPatent: '자체 물질특허 최초 등록',
  indApproved: 'IND 최초 승인',
  phase1: '임상 1상 최초 통과',
  phase2: '임상 2상 최초 통과',
  phase3: '임상 3상 최초 통과',
  approval: 'FDA 최종 허가 최초 달성',
};

/** 팬텀스톡(설계서 §3.3 (B)) — 1,000 단위 · 정산 = min($8,000, ⌊1,000 × max(0, Q정산 − Q부여)⌋). Q부여 = 상장가 $10.00. */
export const PHANTOM_STOCK = {
  units: 1_000,
  capCents: 800_000,
  grantPriceUsd: 10,
} as const;

/** 개인 계좌의 경영 보상 칸(그 학생에게만). */
export interface ExecutiveRewardView {
  /** 받은 고정 성과급 합계(센트, 회수 반영). */
  bonusCents: number;
  /** 받은 팬텀스톡 정산액(센트). 정산 전이면 0. */
  phantomCents: number;
  totalCents: number;
  /** 받은 마일스톤. */
  milestones: ExecutiveMilestone[];
  phantom: {
    units: number;
    grantUsd: number;
    /** 지금 회사의 R&D 기준가 Q(수급 · 수요 이벤트 제외). 회사가 없으면 null. */
    currentQUsd: number | null;
    /** 지금 정산하면 받을 금액(센트) — 참고 값. */
    estimateCents: number;
    settled: boolean;
  };
}

/** 화면 · 공시 문구의 출처. `llm` 은 LLM 애널리스트 · NPC 가 만든 것(화면에 'AI 생성'), `rules` 는 규칙 기반 대체 문구, `teacher` 는 교사 정정. */
export type ContentSource = 'llm' | 'rules' | 'teacher';

/**
 * 애널리스트 리포트를 부르는 계기(균형안 §9.3 의 표가 계기별 Δ 범위 · 기본값의 단일 소스).
 * `listing` 상장(학급 생성 · 재창업) · `facility` 설비 건설 · `upgrade` 설비 업그레이드 · `docking` 팀 최고 도킹 점수 갱신 ·
 * `investment` 투자 마일스톤 · `offering` 유상증자 공시 · `crisis` 자금 위기 진입 · `restructure` 구조조정 · 유예 진입 ·
 * `recovered` 회생 · `macro` 이 회사에 적용된 이벤트 · `bankrupt` 파산(거래 정지) · `reinstated` 파산 판정 정정(번복) · `correction` 교사 정정 공시.
 * v5(M5, 균형안 §10.7): `patent` 물질특허 등록 · `ind` IND 승인 · 보류 · `trial` 임상 n상 통과 · 실패 · `approval` 최종 허가(· 교사 정정 거절).
 * 계기 세부(`detail`)는 `{ stepId?, kind?, passed?, formulation?, ... }` — `AnalystFacts.pipeline` 이 공개 사실을 싣는다.
 */
export type AnalystTriggerKind =
  | 'listing'
  | 'facility'
  | 'upgrade'
  | 'docking'
  | 'investment'
  | 'offering'
  | 'crisis'
  | 'restructure'
  | 'recovered'
  | 'macro'
  | 'bankrupt'
  | 'reinstated'
  | 'correction'
  // ── v5 (M5)
  | 'patent'
  | 'ind'
  | 'trial'
  | 'approval';

// ──────────────────────────────── 시세 ────────────────────────────────

/** 수량별 체결 평균가 — 호가창 대신 보여 준다(AMM 이라 지정가 호가가 없다). */
export interface QuoteLadderStep {
  shares: number;
  /** 이 수량을 지금 사면(매수 · 환매수) 평균 체결가. */
  buyAvgUsd: number;
  /** 이 수량을 지금 팔면(매도 · 공매도) 평균 체결가. */
  sellAvgUsd: number;
}

/** 종목 한 줄 — 괘지 장부의 한 행. 등락 색은 한국 관례(상승 빨강 ▲ / 하락 파랑 ▼ — 아트디렉션 §4.1). */
export interface QuoteView {
  teamId: TeamId;
  ticker: string;
  companyName: string;
  inkKey: TeamInkKey;
  district: DistrictType;
  status: ListingStatus;
  /** 시장가. */
  priceUsd: number;
  /** 펀더멘털 적정가 F. */
  fundamentalUsd: number;
  /** 시장 수요 배율 M(1 이면 이벤트 없음). */
  demandMultiplier: number;
  /** 수급 보정(%) = 30 × tanh(s/D). −30 ~ +30. */
  flowPct: number;
  /** 최근 현실 24시간 등락(%) — 24시간 전 봉의 종가 대비(그보다 짧게 상장했으면 상장가 대비). */
  changePct: number;
  sharesOutstanding: number;
  /** 시가총액 = 시장가 × 유통 주식(센트 내림). */
  marketCapCents: number;
  shortInterestShares: number;
  /** 공매도 잔고 비율(%) = 공매도 잔고 / 유통 주식 × 100. 숏스퀴즈 판단 근거로 공개한다(PRD §3.2). */
  shortInterestPct: number;
  rating: AnalystRating;
  ratingSource: ContentSource;
  /** 100 · 1,000 · 10,000주의 평균 체결가. */
  ladder: QuoteLadderStep[];
  /** 거래 정지면 정지 시각과 정리 예정(운영 시간 기준 남은 ms). */
  suspension: { atMs: number; settleInMs: number | null } | null;
  updatedAtMs: number;
  /** 공개 파이프라인 요약(v5) — 코드명 · 상태 · IND 뒤 프로토콜. 선언하지 않았으면 null. */
  pipeline: PipelinePublicSummary | null;
}

/** 현실 5분 봉. `t` 는 봉 시작 시각(ms epoch, 5분 단위로 내림). 거래량은 그 봉에 체결된 주식 수(강제 청산 · 청약 포함). */
export interface CandleView {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ──────────────────────────────── 애널리스트 리포트 ────────────────────────────────

/**
 * 애널리스트 리포트 — `#s50` 전광판 · 속보. LLM 이 쓴 것은 `source: 'llm'` 이고 화면에 반드시 'AI 생성' 을 붙인다.
 * 서버는 LLM 원문을 보존하고(교사 정정과 분리 — 균형안 §6), 적용한 Δ 는 계기별 범위로 자른 값이다.
 */
export interface AnalystReportView {
  id: string;
  teamId: TeamId;
  ticker: string;
  companyName: string;
  trigger: AnalystTriggerKind;
  rating: AnalystRating;
  /** 적용한 펀더멘털 변동률(%) — 범위로 자른 뒤의 값. */
  fundamentalChangePct: number;
  /** 한 줄 속보 헤드라인(60자 이하). */
  headline: string;
  /** 월스트리트 한 줄 논평(200자 이하). */
  comment: string;
  /** 근거 3개 이하(각 80자 이하). */
  rationale: string[];
  source: ContentSource;
  /** `source === 'llm'` 이면 true — 화면 'AI 생성' 표기의 근거. */
  aiGenerated: boolean;
  /** LLM 이면 모델 id(예: `deepseek/deepseek-v4.1-flash-1017`). */
  model?: string;
  /** LLM 이 제안했지만 범위를 넘어 잘린 값(잘리지 않았으면 생략). 원문 보존용 표시. */
  proposedChangePct?: number;
  priceBeforeUsd: number;
  priceAfterUsd: number;
  atMs: number;
  gameDay: number;
  /** 교사 정정이 있으면 — 원래 값은 `original`, 화면에 `ui/gm-badge` + '정정'. */
  corrected?: {
    byName: string;
    reason: string;
    atMs: number;
    original: { rating: AnalystRating; fundamentalChangePct: number; headline: string; comment: string };
  };
}

// ──────────────────────────────── 개인 계좌 ────────────────────────────────

/** 보유 종목 한 줄(그 학생에게만). 같은 종목을 롱 · 숏으로 동시에 들 수 없다 — 공매도는 보유분이 0 일 때만, 매수는 공매도 잔고가 0 일 때만. */
export interface PositionView {
  teamId: TeamId;
  ticker: string;
  companyName: string;
  status: ListingStatus;
  longShares: number;
  shortShares: number;
  /** 롱 평균 매입가 · 숏 평균 매도가(달러). */
  avgCostUsd: number;
  /** 롱이면 +평가액, 숏이면 −상환 부담(시장가 × 주식, 센트). */
  marketValueCents: number;
  unrealizedPnlCents: number;
}

/** 계좌 원장 한 줄. */
export interface TradeView {
  id: string;
  kind: TradeKind;
  teamId: TeamId | null;
  ticker: string | null;
  shares: number;
  /** 평균 체결가(달러). 시드 · 보정이면 0. */
  avgPriceUsd: number;
  /** 현금 변화(센트, 음수 = 지출). */
  cashCents: number;
  cashAfterCents: number;
  /** 사람이 읽는 한 줄 — '뉴로브릿지 NBX 1,000주 매수 · 평균 $10.15'. */
  memo: string;
  atMs: number;
  offeringId?: string;
}

/**
 * `S2C.ACCOUNT_STATE` — 그 학생에게만, 객장 안에 있을 때(들어올 때 · 바뀔 때). 강제 청산은 객장 밖이어도 `NOTICE` 로 알린다.
 * 순자산 = 현금 + 롱 평가액 − 숏 상환 부담. 수익률 = (순자산 − 시드) / 시드.
 */
export interface AccountView {
  accountId: string;
  userId: UserId;
  classId: ClassId;
  seedCents: number;
  cashCents: number;
  longValueCents: number;
  shortValueCents: number;
  equityCents: number;
  returnPct: number;
  positions: PositionView[];
  /** 최근 원장(최신이 앞, 최대 20). */
  recentTrades: TradeView[];
  /**
   * 증거금(균형안 §9.4).
   * - `requiredCents` = 유지 기준 = 숏 평가액 합 × 30%(숏이 없으면 0).
   * - `excessCents` = 순자산 − 유지 기준(음수면 다음 가격 변화 때 강제 환매수).
   * - `shortCapacityCents` = **더 열 수 있는 숏 평가액** = max(0, 순자산 × 1.0 − 숏 평가액 합) — 공매도 개시 한도의 남은 몫.
   */
  margin: { requiredCents: number; excessCents: number; shortCapacityCents: number };
  /** 현금이 음수(강제 청산 뒤 남은 빚)면 새 매수 · 공매도 · 청약을 막는다. */
  blocked: 'negative_cash' | null;
  // ── v9 (동기부여 Step 2 — 설계서 §3.3 (C))
  /**
   * 순수 투자 수익률(%) — 시간가중 수익률(TWR). 성과급 · 팬텀스톡 입금 직전 순자산으로 구간을 나눠 외부 보상 유입이 섞이지 않는다.
   * 바이오 투자왕 순위의 기준. `returnPct`(시드 대비 단순 수익률)와 다를 수 있다.
   */
  investReturnPct: number;
  /** C-Level 경영 보상(고정 성과급 + 팬텀스톡). */
  executive: ExecutiveRewardView;
  /** 총 개인 순자산(센트) = 현금 + 롱 평가액 − 숏 상환 부담(경영 보상은 이미 현금에 들어 있다). */
  netWorthCents: number;
}

// ──────────────────────────────── 유상증자 ────────────────────────────────

/**
 * 유상증자(신주 발행 & IR 공시 — PRD §3.2). 회사 구성원이 객장에서 신청한다. 발행가 = 공시 시점 시장가 × (1 − 할인율), 고정.
 * 청약은 선착순 즉시 체결 — 대금이 바로 회사 연구비로 들어가고(미지급 유지비부터 — 원장 `offering_proceeds`), 주식이 바로 지급된다.
 * 자기 회사에는 청약할 수 없다(`self_trade_forbidden`). 청약 기간은 운영 시간 기준(일시정지 동안 멈춘다).
 */
export interface OfferingView {
  id: string;
  teamId: TeamId;
  ticker: string;
  companyName: string;
  status: 'open' | 'closed' | 'voided';
  sharesOffered: number;
  sharesSold: number;
  priceUsd: number;
  discountPct: number;
  /** 한 사람이 청약할 수 있는 최대 주식 수. */
  perInvestorCap: number;
  /** 회사가 쓴 IR 한 줄(200자 이하, 학생이 쓴 글). */
  pitch: string;
  /** 서버가 실제 데이터로 만든 공시 — '최고 도킹 −10.4 kcal/mol(AChE) · 설비 4/5 · Series A'. */
  disclosure: string[];
  openedAtMs: number;
  /** 남은 청약 시간(운영 시간 ms). 닫혔으면 0. */
  remainingMs: number;
  /** 지금까지 회사로 들어간 대금(센트). */
  proceedsCents: number;
  /** 이 학생이 이미 청약한 주식 수(받는 사람별). */
  yourShares: number;
  openedByName: string;
}

// ──────────────────────────────── 순위 ────────────────────────────────

/** 투트랙 시상(PRD §3.2-1) — '최고 시가총액 제약회사' · '최고 수익률 바이오 투자왕'. */
export interface LeaderboardView {
  marketCap: Array<{ rank: number; teamId: TeamId; ticker: string; companyName: string; inkKey: TeamInkKey; marketCapCents: number }>;
  /**
   * 상위 5명 + 받는 사람(5위 밖이면 끝에 하나 더). 이름은 학급 안 표시 이름이다.
   * v9: `returnPct` 는 **시간가중 투자 수익률**(성과급 · 팬텀스톡 유입을 뺀 순수 투자 성과)이다. 경영 보상은 `executiveCents` 로 따로 보인다.
   */
  investors: Array<{ rank: number; displayName: string; returnPct: number; you: boolean; executiveCents?: number }>;
}

/** 화면 안내에 쓰는 증시 규칙 값(균형안 §9 — 서버가 game-rules 상수를 그대로 싣는다). */
export interface MarketRulesView {
  economyVersion: string;
  seedCents: number;
  flowBandPct: number;
  depthRatio: number;
  flowHalfLifeMinutes: number;
  shortInitialMarginRatio: number;
  shortMaintenanceRatio: number;
  shortInterestCapPct: number;
  maxOrderShares: number;
  offering: {
    discountPct: number;
    maxSharesRatio: number;
    minShares: number;
    windowMinutes: number;
    cooldownMinutes: number;
    perInvestorCapRatio: number;
  };
  suspensionSettleHours: number;
}

// ──────────────────────────────── 메시지 ────────────────────────────────

/**
 * `S2C.MARKET_STATE` — 객장 구역 안의 사람(학생 · 교사)에게. 들어올 때 한 번, 그 뒤 바뀔 때(초당 2회 이하로 묶는다).
 * 시장은 학급 일시정지 중 닫힌다(`open: false` — 균형안 §2 '수동 일시정지: 거래 중지').
 */
export interface MarketStateMessage {
  classId: ClassId;
  asOfMs: number;
  open: boolean;
  closedReason: 'paused' | null;
  quotes: QuoteView[];
  /** 종목별 최근 5분 봉(최대 72개 = 6시간). */
  candles: Record<TeamId, CandleView[]>;
  /** 최근 리포트(최신이 앞, 최대 12). */
  reports: AnalystReportView[];
  /** 열린 증자 + 최근 닫힌 증자 5건. */
  offerings: OfferingView[];
  leaderboard: LeaderboardView;
  rules: MarketRulesView;
}

/** `S2C.ACCOUNT_STATE` 본문. */
export type AccountStateMessage = AccountView;

/** `S2C.EXCHANGE_PRESENCE` — 객장 구역에 들어오거나 나갔다(서버 판정). 들어오면 뒤이어 `MARKET_STATE`(+ 학생이면 `ACCOUNT_STATE`). */
export interface ExchangePresenceMessage {
  inside: boolean;
  zoneId: string;
}

/**
 * `S2C.MARKET_NEWS` — 학급 전체 속보(객장 밖에서도). 시세 숫자는 싣지 않는다 — 객장에 가야 본다(PRD §3.1).
 * 단, 리포트의 투자의견 · 헤드라인 · 변동률(%)은 공시라 싣는다.
 */
export interface MarketNewsMessage {
  classId: ClassId;
  kind:
    | 'report'
    | 'offering_open'
    | 'offering_closed'
    | 'squeeze'
    | 'suspended'
    | 'delisted'
    | 'relisted'
    | 'listed'
    | 'correction'
    | 'restore';
  teamId: TeamId | null;
  ticker: string | null;
  companyName: string | null;
  headline: string;
  rating?: AnalystRating;
  /** 리포트면 적용한 펀더멘털 변동률(%). */
  changePct?: number;
  source: ContentSource;
  aiGenerated: boolean;
  reportId?: string;
  atMs: number;
}

/**
 * `C2S.MARKET_ORDER` — 시장가 주문(객장 안에서만). `requestId` 멱등(`order:<accountId>:<requestId>`).
 * `limitPriceUsd` 는 보호 한도다: 매수 · 환매수는 평균 체결가가 이보다 비싸면, 매도 · 공매도는 이보다 싸면 체결하지 않고 `price_moved`.
 */
export interface MarketOrderMessage {
  requestId: string;
  teamId: TeamId;
  side: OrderSide;
  /** 1 ~ 100,000주. */
  shares: number;
  limitPriceUsd?: number;
}

/** `S2C.ORDER_RESULT` — 체결 확인(실패는 `S2C.ERROR` 에 같은 requestId). 같은 requestId 재전송은 `applied: false` 로 같은 체결을 돌려준다. */
export interface OrderResultMessage {
  requestId: string;
  applied: boolean;
  trade: TradeView;
  account: AccountView;
}

/** `C2S.OFFERING_CREATE` — 내 회사의 유상증자 신청(객장 안, 회사 구성원만). 결과는 `S2C.ORDER_RESULT` 가 아니라 `MARKET_STATE` · `MARKET_NEWS` 로 보인다. */
export interface OfferingCreateMessage {
  requestId: string;
  shares: number;
  /** IR 한 줄(1~200자). LLM 애널리스트에게는 **평가할 주장**으로만 넘긴다(지시로 따르지 않게 감싼다). */
  pitch: string;
}

/** `C2S.OFFERING_SUBSCRIBE` — 청약(객장 안, 그 회사 구성원이 아닌 학생). 결과는 `S2C.ORDER_RESULT`(trade.kind = 'subscribe'). */
export interface OfferingSubscribeMessage {
  requestId: string;
  offeringId: string;
  shares: number;
}

/** 공개 회사 정보에 붙는 시세 요약 — 교사 화면 시찰 카드용(`GmClassState.market`). */
export interface GmMarketTeamView {
  teamId: TeamId;
  ticker: string;
  status: ListingStatus;
  companyStatus: CompanyStatus;
  priceUsd: number;
  fundamentalUsd: number;
  rating: AnalystRating;
  shortInterestPct: number;
  marketCapCents: number;
}
