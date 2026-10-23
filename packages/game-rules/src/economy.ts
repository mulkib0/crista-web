/**
 * 균형형 운영·경제 v0 — 순수 규칙(상수 + 순수 함수).
 *
 * 단일 소스는 `docs/2026-10-19-game-balance-v0.md` 하나다. 이 파일에 있는 수치는 전부
 * 그 문서에서 그대로 옮긴 것이고, 문서에 없는 수치는 만들지 않는다(없으면
 * `TODO(균형안 미정)` 주석으로 남긴다).
 *
 * 설계 원칙
 * - 모든 함수는 순수하다. 시계·난수는 인자로 주입한다(`Date.now`·`Math.random` 를 쓰지 않는다).
 * - 금액은 **정수 센트**로 계산한다(균형안 §3). 화면 반올림 값을 계산에 되먹이지 않는다.
 * - 유지비는 게임 일 경계에서 정산하고, 경계를 못 넘긴 부분 일과 소수 센트는 누적한다(균형안 §3).
 * - 화면 프레임 키는 균형안 §4 의 표기 규칙과 1:1 로 맞춘다.
 *
 * M1 범위: HUD 표시와 산술 점검(§7.1·§7.2)까지. 경제 루프 전체는 M1 범위가 아니다.
 */
import type {
  CashAlertLevel,
  ClockMode,
  CourseKind,
  DistrictType,
  FacilityKind,
  InvestmentMilestone,
  RestructureBlockedAction,
  SessionPhase,
} from '@crista/shared-types';

// M3: 아래 여섯 타입은 `@crista/shared-types`(domain.ts) 가 단일 소스다. 같은 이름을 여기서 다시 정의하지 않고 다시 내보낸다.
export type {
  CashAlertLevel,
  ClockMode,
  CourseKind,
  InvestmentMilestone,
  RestructureBlockedAction,
  SessionPhase,
} from '@crista/shared-types';

export const ECONOMY_VERSION = 'balance-v0';

/** 균형안 문서 경로 — 설정 버전과 함께 학급에 저장한다(균형안 §8). */
export const ECONOMY_SOURCE_DOC = 'docs/2026-10-19-game-balance-v0.md';

// ─────────────────────────────────────────────────────────────────────────────
// 1. 통화 단위 — 정수 센트 (균형안 §3)
// ─────────────────────────────────────────────────────────────────────────────

/** 가상 달러의 정수 센트. 원장·계산의 단일 단위다. */
export type Cents = number;

export const CENTS_PER_DOLLAR = 100;
/** $1M = $1,000,000 (균형안 §3). */
export const DOLLARS_PER_MILLION = 1_000_000;
export const CENTS_PER_MILLION = CENTS_PER_DOLLAR * DOLLARS_PER_MILLION;

/** `$0.085M` 같은 문서 표기를 정수 센트로 바꾼다. */
export function millionsToCents(millions: number): Cents {
  return Math.round(millions * CENTS_PER_MILLION);
}

export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

/** 표시용 환산. 계산에 되먹이지 않는다. */
export function centsToMillions(cents: Cents): number {
  return cents / CENTS_PER_MILLION;
}

/**
 * 금액 요약 표기 — 균형안 §8: 요약은 `$0.0M`, 비용·유지비 상세는 `$0.050M` 처럼
 * 유효 금액을 정확히 보여준다. 작은 유료 항목을 `$0.0M` 으로 깎지 않기 위해
 * 기본 소수점은 3자리다.
 */
export function formatMillions(cents: Cents, fractionDigits = 3): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${Math.abs(centsToMillions(cents)).toFixed(fractionDigits)}M`;
}

/** 상세 금액 표기 — `$50,000`. */
export function formatDollars(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const dollars = Math.abs(cents) / CENTS_PER_DOLLAR;
  return `${sign}$${dollars.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 게임 시간 (균형안 §2)
// ─────────────────────────────────────────────────────────────────────────────

/** 계산용 게임 달력: 1개월 = 30일, 1년 = 12개월. */
export const GAME_DAYS_PER_MONTH = 30;
export const GAME_MONTHS_PER_YEAR = 12;

/** 수업 기본 길이 50분. 교사가 변경·연장할 수 있다. */
export const DEFAULT_SESSION_MINUTES = 50;
/** 수업 종료 5분 전 알림. */
export const SESSION_END_WARNING_MINUTES = 5;

/**
 * 수업 중 배율의 계산 기준 시간. 50분은 **분당 배율을 정하는 기준**이고
 * 수업 길이 제한이 아니다(균형안 §2: "45분 수업이면 설정한 분당 배율로 45분만 진행").
 */
export const IN_CLASS_REFERENCE_MINUTES = 50;

export const REAL_MINUTES_PER_HOUR = 60;
export const REAL_MINUTES_PER_DAY = 24 * REAL_MINUTES_PER_HOUR;

/** 수업 중 속도: 현실 50분 = 여러 차시 12게임 월 / 장기 3게임 월. */
export const IN_CLASS_GAME_MONTHS_PER_REFERENCE: Record<CourseKind, number> = {
  multiSession: 12,
  longTerm: 3,
};

/** 두 과정의 수업 밖 속도: 현실 24시간 = 게임 7일. */
export const OUT_OF_CLASS_GAME_DAYS_PER_REAL_DAY = 7;

/** 고정 속도 모드의 최초 제안값도 현실 24시간 = 게임 7일이다. */
export const DEFAULT_FIXED_GAME_DAYS_PER_REAL_DAY = 7;

export interface ClockSettings {
  readonly course: CourseKind;
  readonly mode: ClockMode;
  /** 예정 수업 길이(분). 분당 배율은 바뀌지 않고 진행 시간만 바뀐다. */
  readonly sessionMinutes: number;
  /** 고정 속도 모드에서 쓰는 배율(현실 1일당 게임 일). */
  readonly fixedGameDaysPerRealDay: number;
}

export const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  course: 'multiSession',
  mode: 'variable',
  sessionMinutes: DEFAULT_SESSION_MINUTES,
  fixedGameDaysPerRealDay: DEFAULT_FIXED_GAME_DAYS_PER_REAL_DAY,
};

export function monthsToGameDays(gameMonths: number): number {
  return gameMonths * GAME_DAYS_PER_MONTH;
}

export function gameDaysToMonths(gameDays: number): number {
  return gameDays / GAME_DAYS_PER_MONTH;
}

/** 현실 1분당 진행하는 게임 일 수. 고정 모드는 구간 성격과 무관하게 한 배율을 쓴다. */
export function gameDaysPerRealMinute(settings: ClockSettings, phase: SessionPhase): number {
  if (settings.mode === 'fixed') {
    return settings.fixedGameDaysPerRealDay / REAL_MINUTES_PER_DAY;
  }
  if (phase === 'inClass') {
    const months = IN_CLASS_GAME_MONTHS_PER_REFERENCE[settings.course];
    return monthsToGameDays(months) / IN_CLASS_REFERENCE_MINUTES;
  }
  return OUT_OF_CLASS_GAME_DAYS_PER_REAL_DAY / REAL_MINUTES_PER_DAY;
}

/** 실제 경과 현실 분 → 게임 일. */
export function gameDaysFromRealMinutes(
  settings: ClockSettings,
  phase: SessionPhase,
  realMinutes: number,
): number {
  return gameDaysPerRealMinute(settings, phase) * Math.max(0, realMinutes);
}

/** 한 수업(예정 길이 전체)이 진행하는 게임 월. */
export function gameMonthsPerSession(settings: ClockSettings): number {
  return gameDaysToMonths(
    gameDaysFromRealMinutes(settings, 'inClass', settings.sessionMinutes),
  );
}

/** 배율이 바뀐 구간은 각각 계산한다. 과거 경과 시간에 새 배율을 소급 적용하지 않는다. */
export interface ElapsedSegment {
  readonly phase: SessionPhase;
  readonly realMinutes: number;
  /** 수동 일시정지 구간. 게임 시간·유지비·유예 카운트가 모두 멈춘다. */
  readonly paused?: boolean;
  /** 이 구간에만 적용한 설정(배율 변경 전후 구간 계산용). */
  readonly settings?: ClockSettings;
}

/** 여러 구간의 경과를 합산한 게임 일. 일시정지 구간은 0 으로 센다. */
export function gameDaysFromSegments(
  settings: ClockSettings,
  segments: readonly ElapsedSegment[],
): number {
  let gameDays = 0;
  for (const segment of segments) {
    if (segment.paused === true) continue;
    gameDays += gameDaysFromRealMinutes(
      segment.settings ?? settings,
      segment.phase,
      segment.realMinutes,
    );
  }
  return gameDays;
}

/**
 * 임상 게임 일정 초기값(게임 월) — 균형안 §2.
 * 게임 일정이며 실제 임상 기간을 설명하는 값이 아니다.
 * 이전 단계가 끝나고 다음 신청이 승인돼야 이어진다.
 */
export const CLINICAL_SCHEDULE_GAME_MONTHS = {
  phase1: 3,
  phase2: 6,
  phase3: 12,
  indReview: 1,
  finalReview: 2,
} as const;
export type ClinicalScheduleKey = keyof typeof CLINICAL_SCHEDULE_GAME_MONTHS;

/** 자동 저장 주기 초기값(현실 분)과 보관 일수 — 균형안 §6. */
export const AUTOSAVE_INTERVAL_REAL_MINUTES = 5;
export const AUTOSAVE_RETENTION_REAL_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// 3. 시작 자금과 투자 (균형안 §3.1)
// ─────────────────────────────────────────────────────────────────────────────

/** 회사 초기 연구비 $6.000M. 여러 차시 과정의 초기값이다. */
export const INITIAL_RESEARCH_FUND_CENTS = millionsToCents(6);
/** 초기 전문 연구원 1명. 급여는 월 유지비에 포함된다. */
export const INITIAL_RESEARCHERS = 1;
/** Series A — 고찰·연구 마일스톤 통과 시 $3.000M. */
export const SERIES_A_CENTS = millionsToCents(3);
/** Series B — 후속 연구·전임상 마일스톤 통과 시 $5.000M. */
export const SERIES_B_CENTS = millionsToCents(5);
/** 학생 개인 투자금 $100,000 = $0.100M. */
export const STUDENT_SEED_CENTS = millionsToCents(0.1);
/** 자동 재창업 지원금 $2.500M — 학급당 팀별 1회(균형안 §4). */
export const REFOUNDING_GRANT_CENTS = millionsToCents(2.5);
export const REFOUNDING_GRANT_LIMIT_PER_TEAM = 1;

export const INVESTMENT_AMOUNT_CENTS: Record<InvestmentMilestone, Cents> = {
  seriesA: SERIES_A_CENTS,
  seriesB: SERIES_B_CENTS,
};

/**
 * 투자 중복 방지(균형안 §3.1) — 화면 재열기·요청 재전송·기존 고찰 재제출로 재지급하지 않는다.
 * 이미 지급한 마일스톤 집합을 받아 순수하게 판정한다.
 */
export function investmentPayoutCents(
  milestone: InvestmentMilestone,
  alreadyPaid: ReadonlySet<InvestmentMilestone>,
): Cents {
  return alreadyPaid.has(milestone) ? 0 : INVESTMENT_AMOUNT_CENTS[milestone];
}

/** 유상증자 유입 — 실제 청약 대금을 달러 단위로 그대로 전환한다($100,000 → $0.100M). */
export function rightsIssueProceedsCents(subscribedDollars: number): Cents {
  return dollarsToCents(Math.max(0, subscribedDollars));
}
// TODO(균형안 미정): 유상증자 발행가·할인율·청약 한도. 균형안에 수치가 없다.

/** 기간 보정금 기준선 — 예정 게임 개월 80개월을 넘는 분량만 보정한다. */
export const DURATION_SUBSIDY_FREE_GAME_MONTHS = 80;
/** 보정 단가 = 네 연구실·보안 전체 가동 시의 월 유지비 $0.085M. */
export const DURATION_SUBSIDY_PER_GAME_MONTH_CENTS = millionsToCents(0.085);

/**
 * 예정 게임 개월 = 예정 수업 시간 × 수업 배율 + 수업 밖 예정 시간 × 완속 배율 (균형안 §3.1).
 * 수업 시간과 수업 밖 시간을 중복 계산하지 않는다.
 */
export function plannedGameMonths(
  settings: ClockSettings,
  plan: { readonly inClassRealMinutes: number; readonly outOfClassRealMinutes: number },
): number {
  const inClass = gameDaysFromRealMinutes(settings, 'inClass', plan.inClassRealMinutes);
  const outOfClass = gameDaysFromRealMinutes(settings, 'outOfClass', plan.outOfClassRealMinutes);
  return gameDaysToMonths(inClass + outOfClass);
}

/** 기간 보정금 = max(0, 예정 게임 개월 - 80) × $0.085M. */
export function durationSubsidyCents(plannedMonths: number): Cents {
  const billable = Math.max(0, plannedMonths - DURATION_SUBSIDY_FREE_GAME_MONTHS);
  return Math.round(billable * DURATION_SUBSIDY_PER_GAME_MONTH_CENTS);
}

/**
 * 학급 생성 시 초기 연구비. 장기 과정은 기간 보정금을 한 번 더한다.
 * 수업 생성 후 기간·배율을 바꿔도 자동 재지급하지 않는다(그 뒤 조정은 교사 연구비 지급으로 기록).
 */
export function initialResearchFundCents(plannedMonths: number): Cents {
  return INITIAL_RESEARCH_FUND_CENTS + durationSubsidyCents(plannedMonths);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 설비·채용 비용과 월 유지비 (균형안 §3.2)
// ─────────────────────────────────────────────────────────────────────────────

export interface FacilityPriceRow {
  /** 설치비. */
  readonly installCents: Cents;
  /** 게임 1개월 유지비. */
  readonly monthlyUpkeepCents: Cents;
}

/** 설비 설치비와 게임 1개월 유지비 표. 키는 `FacilityKind` 와 1:1. */
export const FACILITY_PRICE: Record<FacilityKind, FacilityPriceRow> = {
  // 표적 탐색실
  target: { installCents: millionsToCents(1.0), monthlyUpkeepCents: millionsToCents(0.01) },
  // HTVS·합성실
  htvs: { installCents: millionsToCents(0.5), monthlyUpkeepCents: millionsToCents(0.01) },
  // 도킹 서버실
  docking: { installCents: millionsToCents(0.7), monthlyUpkeepCents: millionsToCents(0.01) },
  // ADMET실
  admet: { installCents: millionsToCents(0.5), monthlyUpkeepCents: millionsToCents(0.01) },
  // 보안 게이트·특허 금고
  security: { installCents: millionsToCents(0.3), monthlyUpkeepCents: millionsToCents(0.005) },
};

/** 설비 1단계 업그레이드 — 설치비 $0.250M, 유지비 추가 $0.005M. */
export const FACILITY_UPGRADE_TIER1: FacilityPriceRow = {
  installCents: millionsToCents(0.25),
  monthlyUpkeepCents: millionsToCents(0.005),
};
// TODO(균형안 미정): 2·3단계 업그레이드의 설치비·추가 유지비. 균형안은 1단계만 적었다.
// `FacilityTier` 는 0~3 을 허용하지만 2·3 단계의 수치를 여기서 발명하지 않는다.
export const FACILITY_UPGRADE_DEFINED_TIERS = [1] as const;

/** 설비 건설(0→1)·업그레이드(n→n+1) 행동. 프로토콜 `FacilityBuildMessage.action` 과 같다. */
export type FacilityAction = 'build' | 'upgrade';

/**
 * 설비 행동 견적 — 현재 등급과 행동으로 비용·다음 등급을 정한다(균형안 §3.2).
 * - 건설: 등급 0 → 1, 비용 = `FACILITY_PRICE[kind].installCents`.
 * - 업그레이드: 등급 n → n+1. 균형안이 비용을 적은 업그레이드(`FACILITY_UPGRADE_DEFINED_TIERS`)만 허용하고
 *   비용은 `FACILITY_UPGRADE_TIER1.installCents`. 정의되지 않은 단계는 `maxed` 다 — 수치를 만들지 않는다.
 */
export type FacilityActionQuote =
  | {
      readonly ok: true;
      readonly kind: FacilityKind;
      readonly action: FacilityAction;
      readonly fromTier: 0 | 1 | 2 | 3;
      readonly toTier: 1 | 2 | 3;
      readonly costCents: Cents;
      /** 원장 항목 종류 — 프로토콜 `LedgerKind` 의 두 값. */
      readonly ledgerKind: 'facility_build' | 'facility_upgrade';
    }
  | {
      readonly ok: false;
      readonly kind: FacilityKind;
      readonly action: FacilityAction;
      readonly fromTier: number;
      /** maxed = 다음 등급 비용이 균형안에 없다 · not_built = 건설 전 업그레이드 · already_built = 이미 건설됨 · invalid_tier = 등급 값 오류. */
      readonly reason: 'maxed' | 'not_built' | 'already_built' | 'invalid_tier';
    };

export function facilityActionQuote(
  kind: FacilityKind,
  currentTier: number,
  action: FacilityAction,
): FacilityActionQuote {
  if (!Number.isInteger(currentTier) || currentTier < 0 || currentTier > 3) {
    return { ok: false, kind, action, fromTier: currentTier, reason: 'invalid_tier' };
  }
  const fromTier = currentTier as 0 | 1 | 2 | 3;
  if (action === 'build') {
    if (fromTier !== 0) return { ok: false, kind, action, fromTier, reason: 'already_built' };
    return {
      ok: true,
      kind,
      action,
      fromTier,
      toTier: 1,
      costCents: FACILITY_PRICE[kind].installCents,
      ledgerKind: 'facility_build',
    };
  }
  if (fromTier === 0) return { ok: false, kind, action, fromTier, reason: 'not_built' };
  if (!(FACILITY_UPGRADE_DEFINED_TIERS as readonly number[]).includes(fromTier)) {
    return { ok: false, kind, action, fromTier, reason: 'maxed' };
  }
  return {
    ok: true,
    kind,
    action,
    fromTier,
    toTier: (fromTier + 1) as 2 | 3,
    costCents: FACILITY_UPGRADE_TIER1.installCents,
    ledgerKind: 'facility_upgrade',
  };
}

/** 지금 등급에서 고를 수 있는 다음 행동(건설 또는 업그레이드)의 견적. 상호작용 창 버튼에 쓴다. */
export function nextFacilityActionQuote(kind: FacilityKind, currentTier: number): FacilityActionQuote {
  return facilityActionQuote(kind, currentTier, currentTier === 0 ? 'build' : 'upgrade');
}

/** 전문 연구원 1명 — 별도 채용비 없음, 월 급여 $0.020M. */
export const RESEARCHER_HIRING_FEE_CENTS: Cents = 0;
export const RESEARCHER_MONTHLY_SALARY_CENTS = millionsToCents(0.02);
/** 연구원 수 범위(v4 채용 · 해고 — 입력 검증 값, 균형안 수치가 아니다: M4 브리프 §4.4 '0~10명'). */
export const RESEARCHERS_MIN = 0;
export const RESEARCHERS_MAX = 10;
// TODO(균형안 미정): 전문 연구원 외 직군(예: 임상·규제 담당)의 채용비·급여.

/** 지구별 게임 1개월 임대료. */
export const DISTRICT_MONTHLY_RENT_CENTS: Record<DistrictType, Cents> = {
  hospital: millionsToCents(0.02),
  compute: millionsToCents(0.025),
  vc: millionsToCents(0.03),
  industry: millionsToCents(0.015),
};

/** 가동 중지 설비는 유지비 20%만 내고 기능·버프를 주지 않는다. */
export const IDLE_FACILITY_UPKEEP_RATE = 0.2;
/** 설비 매각은 실제 낸 설치·업그레이드 비용의 50%를 회수한다. */
export const FACILITY_SALE_REFUND_RATE = 0.5;

/** 지구 보너스 — 균형안 §3.2 에 수치가 적힌 것만 둔다. */
export const DISTRICT_COST_DISCOUNT: Record<DistrictType, { readonly rate: number; readonly scope: readonly PaidWorkKind[] }> = {
  // AI 지구: HTVS·도킹 비용 30% 할인
  compute: { rate: 0.3, scope: ['htvs', 'docking'] },
  // 산업단지: 합성(HTVS)·ADMET 비용 20% 할인
  industry: { rate: 0.2, scope: ['htvs', 'admet'] },
  hospital: { rate: 0, scope: [] },
  vc: { rate: 0, scope: [] },
};

/** VC 지구: 투자금 15% 보너스. */
export const VC_DISTRICT_INVESTMENT_BONUS_RATE = 0.15;
// TODO(균형안 미정): 지구별 과학·임상 보너스(정확도·성공 확률). 균형안 §3.2 가
// "이 경제표에서 임의로 만들지 않는다" 고 못박았다.

/** 설비 1칸의 상태. 업그레이드 단계는 균형안에 적힌 1단계까지만 비용이 정의돼 있다. */
export interface FacilitySlot {
  readonly kind: FacilityKind;
  /** 가동 중인지. 중지 설비는 유지비 20%만 낸다. */
  readonly active: boolean;
  /** 적용한 1단계 업그레이드 횟수(0 또는 1). */
  readonly upgradeTier1Count?: number;
}

export interface CompanyUpkeepInput {
  readonly district: DistrictType;
  readonly facilities: readonly FacilitySlot[];
  /** 전문 연구원 수(초기 1명 포함). */
  readonly researchers: number;
  /** 자동 이벤트·교사 개입이 만든 유지비 배율. 항목별로 0.70~1.30 안에서만 적용한다. */
  readonly multipliers?: UpkeepMultipliers;
}

/** 유지비 배율 — `macro-events.json` 의 `upkeep` 규칙 scope 와 1:1. */
export interface UpkeepMultipliers {
  readonly facility?: number;
  readonly rent?: number;
  readonly staff?: number;
}

export interface UpkeepBreakdown {
  readonly rentCents: Cents;
  readonly facilityCents: Cents;
  readonly staffCents: Cents;
  readonly totalCents: Cents;
}

/** 설비 1칸의 게임 1개월 유지비(가동 중지 20% 반영). */
export function facilityMonthlyUpkeepCents(slot: FacilitySlot): Cents {
  const base = FACILITY_PRICE[slot.kind].monthlyUpkeepCents;
  const upgrades = Math.max(0, slot.upgradeTier1Count ?? 0);
  const full = base + upgrades * FACILITY_UPGRADE_TIER1.monthlyUpkeepCents;
  return slot.active ? full : Math.round(full * IDLE_FACILITY_UPKEEP_RATE);
}

/** 회사의 게임 1개월 유지비 = 임대료 + 설비 + 인건비. */
export function monthlyUpkeepBreakdown(input: CompanyUpkeepInput): UpkeepBreakdown {
  const m = input.multipliers ?? {};
  const rentCents = Math.round(
    DISTRICT_MONTHLY_RENT_CENTS[input.district] * clampEventMultiplier(m.rent ?? 1),
  );
  const facilityRaw = input.facilities.reduce(
    (sum, slot) => sum + facilityMonthlyUpkeepCents(slot),
    0,
  );
  const facilityCents = Math.round(facilityRaw * clampEventMultiplier(m.facility ?? 1));
  const staffCents = Math.round(
    Math.max(0, input.researchers) *
      RESEARCHER_MONTHLY_SALARY_CENTS *
      clampEventMultiplier(m.staff ?? 1),
  );
  return {
    rentCents,
    facilityCents,
    staffCents,
    totalCents: rentCents + facilityCents + staffCents,
  };
}

export function monthlyUpkeepCents(input: CompanyUpkeepInput): Cents {
  return monthlyUpkeepBreakdown(input).totalCents;
}

/**
 * 균형안 §3.2 가 직접 적은 두 기준 구성.
 * - 기본: 대학병원 지구 + 표적 탐색실 + 연구원 1명 → $0.050M
 * - 전체: 네 연구실 + 보안 설비 모두 가동 → $0.085M
 */
export const BASELINE_UPKEEP_INPUT: CompanyUpkeepInput = {
  district: 'hospital',
  facilities: [{ kind: 'target', active: true }],
  researchers: 1,
};

export const FULL_LAB_UPKEEP_INPUT: CompanyUpkeepInput = {
  district: 'hospital',
  facilities: [
    { kind: 'target', active: true },
    { kind: 'htvs', active: true },
    { kind: 'docking', active: true },
    { kind: 'admet', active: true },
    { kind: 'security', active: true },
  ],
  researchers: 1,
};

/** 문서에 못박힌 기준값. 계산값과 어긋나면 테스트가 깨지도록 상수로 둔다. */
export const BASELINE_MONTHLY_UPKEEP_CENTS = millionsToCents(0.05);
export const FULL_LAB_MONTHLY_UPKEEP_CENTS = millionsToCents(0.085);

/** 설비 매각 회수액 = 실제 낸 설치·업그레이드 비용의 50%. */
export function facilitySaleRefundCents(paidInstallAndUpgradeCents: Cents): Cents {
  return Math.round(Math.max(0, paidInstallAndUpgradeCents) * FACILITY_SALE_REFUND_RATE);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 연구·심사 비용 (균형안 §3.3)
// ─────────────────────────────────────────────────────────────────────────────

/** 유료 작업 종류 — HTVS·도킹·ADMET. */
export type PaidWorkKind = 'htvs' | 'docking' | 'admet';

/** 유료 작업 1회 기본 비용 각각 $0.050M. */
export const PAID_WORK_COST_CENTS: Record<PaidWorkKind, Cents> = {
  htvs: millionsToCents(0.05),
  docking: millionsToCents(0.05),
  admet: millionsToCents(0.05),
};

/** 출원·신청 비용. */
export const FILING_COST_CENTS = {
  substancePatent: millionsToCents(0.05),
  ind: millionsToCents(0.1),
  finalApproval: millionsToCents(0.1),
} as const;
export type FilingKind = keyof typeof FILING_COST_CENTS;

/** 임상 단계 비용. */
export const CLINICAL_COST_CENTS = {
  phase1: millionsToCents(0.3),
  phase2: millionsToCents(0.6),
  phase3: millionsToCents(1.2),
} as const;
export type ClinicalPhaseKey = keyof typeof CLINICAL_COST_CENTS;

/** 비용을 부과하지 않는 행동 — 읽기·비교·고찰 작성. */
export const FREE_ACTION_KINDS = ['read', 'compare', 'reflection'] as const;
export type FreeActionKind = (typeof FREE_ACTION_KINDS)[number];

/** 유료 작업 비용 — 지구 할인과 이벤트 비용 배율을 반영한다. */
export function paidWorkCostCents(
  kind: PaidWorkKind,
  options: { readonly district?: DistrictType; readonly eventMultiplier?: number } = {},
): Cents {
  const base = PAID_WORK_COST_CENTS[kind];
  const discount =
    options.district !== undefined && DISTRICT_COST_DISCOUNT[options.district].scope.includes(kind)
      ? DISTRICT_COST_DISCOUNT[options.district].rate
      : 0;
  const multiplier = clampEventMultiplier(options.eventMultiplier ?? 1);
  return Math.round(base * (1 - discount) * multiplier);
}

/** 심사 비용 — 이벤트의 심사 비용 배율을 반영한다. */
export function filingCostCents(kind: FilingKind, eventMultiplier = 1): Cents {
  return Math.round(FILING_COST_CENTS[kind] * clampEventMultiplier(eventMultiplier));
}

/** 임상 비용 — 이벤트의 임상 비용 배율을 반영한다. */
export function clinicalCostCents(phase: ClinicalPhaseKey, eventMultiplier = 1): Cents {
  return Math.round(CLINICAL_COST_CENTS[phase] * clampEventMultiplier(eventMultiplier));
}

/**
 * 유료 작업 환불 판정(균형안 §3.3).
 * - 실제 연구상 실패: 환불 없음.
 * - 서버 장애·작업 실행 실패: 같은 작업 ID 기준 **한 번만** 환불(또는 무료 재실행).
 * 재시도 버튼·중복 완료 메시지로 중복 환급하지 않도록 이미 환불한 작업 ID 집합을 받는다.
 */
export type WorkFailureKind = 'scientific' | 'infrastructure';

export function refundCents(
  jobId: string,
  failure: WorkFailureKind,
  chargedCents: Cents,
  alreadyRefundedJobIds: ReadonlySet<string>,
): Cents {
  if (failure !== 'infrastructure') return 0;
  if (alreadyRefundedJobIds.has(jobId)) return 0;
  return chargedCents;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 유지비 정산 — 게임 일 경계 + 부분 일 누적 (균형안 §3)
// ─────────────────────────────────────────────────────────────────────────────

/** 유지비 정산 원장. 부분 일과 소수 센트를 모두 누적해 둔다. */
export interface UpkeepLedger {
  /** 정산 완료된 유지비 누계(정수 센트). */
  readonly settledCents: Cents;
  /** 게임 일 경계를 넘지 못한 부분 일(0 이상 1 미만). */
  readonly pendingDays: number;
  /** 하루 단가를 센트로 나눌 때 남은 소수 센트 잔여분(0 이상 1 미만). */
  readonly remainderCents: number;
}

export const EMPTY_UPKEEP_LEDGER: UpkeepLedger = {
  settledCents: 0,
  pendingDays: 0,
  remainderCents: 0,
};

/**
 * 게임 일 경계에서 유지비를 정산한다.
 * 경계를 못 넘긴 부분 일은 `pendingDays` 로, 센트 미만 잔여는 `remainderCents` 로 넘긴다.
 * 월 유지비가 중간에 바뀌어도 부분 일이 유실되지 않는다.
 */
export function accrueUpkeep(
  ledger: UpkeepLedger,
  monthlyUpkeepCentsValue: Cents,
  gameDays: number,
): UpkeepLedger {
  const totalDays = ledger.pendingDays + Math.max(0, gameDays);
  const wholeDays = Math.floor(totalDays);
  const raw =
    ledger.remainderCents + (monthlyUpkeepCentsValue * wholeDays) / GAME_DAYS_PER_MONTH;
  const charged = Math.floor(raw);
  return {
    settledCents: ledger.settledCents + charged,
    pendingDays: totalDays - wholeDays,
    remainderCents: raw - charged,
  };
}

/** 특정 게임 월 수에 해당하는 유지비(정수 센트, 반올림). 비교·표시용. */
export function upkeepForGameMonths(monthlyUpkeepCentsValue: Cents, gameMonths: number): Cents {
  return Math.round(monthlyUpkeepCentsValue * gameMonths);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 자금 경고 4단계 (균형안 §4)
// ─────────────────────────────────────────────────────────────────────────────

/** 주의 기준 — 운영 가능 기간 6게임 월 미만. */
export const CASH_ALERT_NOTICE_GAME_MONTHS = 6;
/** 위기 기준 — 3게임 월 미만. */
export const CASH_ALERT_CRISIS_GAME_MONTHS = 3;

// 자금 상태 `CashAlertLevel` 은 균형안 §4 의 4단계에 "경고 없음"(`normal`)을 더한 것이다(shared-types).
// `normal` 은 문서가 이름 붙인 단계가 아니라 **카드를 띄우지 않는 상태**다.

/** 자금 경고 4단계 ↔ HUD 카드 프레임 키 1:1 (각 176×72). */
export const CASH_ALERT_FRAME: Record<CashAlertLevel, string | null> = {
  // TODO(균형안 미정): 경고가 없는 평시의 HUD 카드 프레임. 균형안 §4 는 4단계만 지정했다.
  normal: null,
  notice: 'ui/hud-cash-notice',
  crisis: 'ui/hud-cash-crisis',
  restructure: 'ui/hud-cash-restructure',
  grace: 'ui/hud-cash-grace',
};

export const CASH_ALERT_FRAME_SIZE = { width: 176, height: 72 } as const;

/** 게임 월 경계·유지비 정산 시점을 보여주는 달력 프레임(176×88). */
export const CASH_CALENDAR_FRAME = 'ui/hud-calendar';
export const CASH_CALENDAR_FRAME_SIZE = { width: 176, height: 88 } as const;

/** 파산 판정 표식. */
export const BANKRUPT_STAMP_FRAME = 'stamp/bankrupt';

/**
 * 색만으로 구분하지 않기 위한 표식·테두리(균형안 §4 "화면 표기").
 * 문구·형태는 문서 표기를 그대로 옮긴 것이고 임의로 늘리지 않는다.
 */
export const CASH_ALERT_MARK: Record<CashAlertLevel, { readonly mark: string; readonly border: string } | null> = {
  normal: null,
  notice: { mark: '!', border: '형광' },
  crisis: { mark: '!!', border: '물결' },
  restructure: { mark: '✕', border: '점선+해칭' },
  grace: { mark: '시계', border: '도장 점선 자리' },
};

export interface CashStatusInput {
  /** 회사 현금. */
  readonly cashCents: Cents;
  /** 이미 확보한 미집행 비용. */
  readonly reservedCents: Cents;
  /** 현재 월 유지비. */
  readonly monthlyUpkeepCents: Cents;
  /** 미지급 비용 누계. 0 보다 크면 구조조정 상태다. */
  readonly unpaidCents?: Cents;
  /** 회생 유예가 진행 중인지. */
  readonly graceActive?: boolean;
}

export interface CashStatus {
  readonly level: CashAlertLevel;
  readonly frameKey: string | null;
  readonly availableCents: Cents;
  /** 운영 가능 개월. 월 유지비가 0 이면 `Infinity`. */
  readonly runwayGameMonths: number;
}

/** 가용 현금 = 회사 현금 - 이미 확보한 미집행 비용. */
export function availableCashCents(cashCents: Cents, reservedCents: Cents): Cents {
  return cashCents - reservedCents;
}

/** 운영 가능 개월 = 가용 현금 / 현재 월 유지비. */
export function runwayGameMonths(availableCents: Cents, monthlyUpkeepCentsValue: Cents): number {
  if (monthlyUpkeepCentsValue <= 0) return Number.POSITIVE_INFINITY;
  return availableCents / monthlyUpkeepCentsValue;
}

/**
 * 자금 상태 판정. 서버가 계산한다(균형안 §4). 우선순위는 심한 상태부터다.
 * 회생 유예 > 구조조정 > 위기 > 주의 > 평시.
 */
export function evaluateCashStatus(input: CashStatusInput): CashStatus {
  const availableCents = availableCashCents(input.cashCents, input.reservedCents);
  const runway = runwayGameMonths(availableCents, input.monthlyUpkeepCents);
  const unpaid = input.unpaidCents ?? 0;

  let level: CashAlertLevel;
  if (input.graceActive === true) {
    level = 'grace';
  } else if (unpaid > 0 || availableCents < input.monthlyUpkeepCents) {
    // 가용 현금으로 다음 유지비를 낼 수 없음 → 구조조정 진입
    level = 'restructure';
  } else if (runway < CASH_ALERT_CRISIS_GAME_MONTHS) {
    level = 'crisis';
  } else if (runway < CASH_ALERT_NOTICE_GAME_MONTHS) {
    level = 'notice';
  } else {
    level = 'normal';
  }

  return {
    level,
    frameKey: CASH_ALERT_FRAME[level],
    availableCents,
    runwayGameMonths: runway,
  };
}

/** 구조조정 상태에서 막는 것 — 신규 유료 연구·설비 구매·채용. */
export const RESTRUCTURE_BLOCKED_ACTIONS = [
  'paidWork',
  'facilityPurchase',
  'hiring',
] as const satisfies readonly RestructureBlockedAction[];

/**
 * 구조조정·유예 중에도 열어 두는 회생 수단(균형안 §4).
 * "현금 부족 때문에 회생 수단의 화면까지 막지 않는다."
 */
export const RECOVERY_ALLOWED_ACTIONS = [
  'rightsIssue',
  'investorPitch',
  'teacherGrantRequest',
  'staffAdjust',
  'facilitySale',
  'facilityIdle',
] as const;
export type RecoveryAllowedAction = (typeof RECOVERY_ALLOWED_ACTIONS)[number];

export function isActionBlockedByRestructure(
  level: CashAlertLevel,
  action: RestructureBlockedAction | RecoveryAllowedAction,
): boolean {
  if (level !== 'restructure' && level !== 'grace') return false;
  return (RESTRUCTURE_BLOCKED_ACTIONS as readonly string[]).includes(action);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. 회생·파산 (균형안 §4)
// ─────────────────────────────────────────────────────────────────────────────

/** 회생 유예 — 현실 운영 시간 48시간. 수업 가속으로 짧아지지 않는다. */
export const GRACE_PERIOD_REAL_HOURS = 48;
export const GRACE_PERIOD_REAL_MINUTES = GRACE_PERIOD_REAL_HOURS * REAL_MINUTES_PER_HOUR;
/** 회생 조건 — 조정된 월 유지비의 3개월분 이상 가용 현금. */
export const RECOVERY_REQUIRED_GAME_MONTHS = 3;

export interface GraceInput {
  /**
   * 유예 시작 후 누적된 **현실 운영 시간**(분). 교사 일시정지 구간은 더하지 않는다.
   * 개인 로그아웃·결과 화면 표시로 리셋하지 않는다.
   */
  readonly elapsedRealMinutes: number;
  /** 교사가 사유를 남기고 늘린(또는 줄인) 유예 시간(분). */
  readonly teacherAdjustmentRealMinutes?: number;
}

/** 유예 총 길이(교사 조정 반영). */
export function graceLimitRealMinutes(input: GraceInput): number {
  return Math.max(0, GRACE_PERIOD_REAL_MINUTES + (input.teacherAdjustmentRealMinutes ?? 0));
}

/** 남은 유예 시간(분). 0 이면 만료다. */
export function graceRemainingRealMinutes(input: GraceInput): number {
  return Math.max(0, graceLimitRealMinutes(input) - Math.max(0, input.elapsedRealMinutes));
}

export function isGraceExpired(input: GraceInput): boolean {
  return Math.max(0, input.elapsedRealMinutes) >= graceLimitRealMinutes(input);
}

export interface RecoveryInput {
  /** 미지급 비용 누계. 유예 중에도 유지비는 계속 누적된다. */
  readonly unpaidCents: Cents;
  /** 조정된(현재) 월 유지비. */
  readonly adjustedMonthlyUpkeepCents: Cents;
  /** 가용 현금. */
  readonly availableCents: Cents;
}

export interface RecoveryStatus {
  /** 회생에 필요한 총액 = 미지급 비용 + 월 유지비 × 3. */
  readonly requiredCents: Cents;
  readonly satisfied: boolean;
  /** 부족액(0 이상). */
  readonly shortfallCents: Cents;
}

/** 회생 필요액 = 미지급 비용 전액 + 조정된 월 유지비 3개월분. */
export function recoveryRequirementCents(input: {
  readonly unpaidCents: Cents;
  readonly adjustedMonthlyUpkeepCents: Cents;
}): Cents {
  return (
    Math.max(0, input.unpaidCents) +
    upkeepForGameMonths(input.adjustedMonthlyUpkeepCents, RECOVERY_REQUIRED_GAME_MONTHS)
  );
}

export function evaluateRecovery(input: RecoveryInput): RecoveryStatus {
  const requiredCents = recoveryRequirementCents(input);
  const shortfallCents = Math.max(0, requiredCents - input.availableCents);
  return { requiredCents, satisfied: shortfallCents === 0, shortfallCents };
}

/** 유예 종료 판정 — 조건 충족이면 회생, 만료 시 미충족이면 파산. */
export type GraceOutcome = 'inGrace' | 'recovered' | 'bankrupt';

export function evaluateGraceOutcome(grace: GraceInput, recovery: RecoveryInput): GraceOutcome {
  if (evaluateRecovery(recovery).satisfied) return 'recovered';
  return isGraceExpired(grace) ? 'bankrupt' : 'inGrace';
}

/**
 * 파산 처리 시 지키는 규칙(균형안 §4). 수치가 아니라 규칙 목록이라 상수로 둔다.
 * 계좌 청산은 증시 단계에서 거래 원장과 함께 구현·검증한다.
 */
export const BANKRUPTCY_RULES = [
  '기존 회사 거래와 신규 사업 활동을 중단한다',
  '주문·포지션·특허를 구회사 식별자에 묶어 정리한다',
  '새 회사에 이전 주식·주문을 자동으로 연결하지 않는다',
  '학습 노트는 읽을 수 있게 보존하되 사업 자산·특허 권리를 무료로 승계하지 않는다',
  '개인 계좌의 손익을 초기화하거나 개인 시드머니를 재지급하지 않는다',
] as const;

/** 재창업 지원금 — 팀별 1회. 반복 재창업으로 복제하지 않는다. */
export function refoundingGrantCents(previousGrantCount: number): Cents {
  return previousGrantCount >= REFOUNDING_GRANT_LIMIT_PER_TEAM ? 0 : REFOUNDING_GRANT_CENTS;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. 자동·교사 이벤트 (균형안 §5)
// ─────────────────────────────────────────────────────────────────────────────

/** 게임 월 경계마다 15% 추첨. */
export const AUTO_EVENT_MONTHLY_CHANCE = 0.15;
/** 자동 이벤트 최소 간격 2게임 월. */
export const AUTO_EVENT_MIN_INTERVAL_GAME_MONTHS = 2;
/** 수업 중 발생 상한 — 한 수업 세션당 2개. */
export const AUTO_EVENT_MAX_PER_SESSION = 2;
/** 수업 밖 발생 상한 — 현실 운영 시간 72시간당 1개. */
export const AUTO_EVENT_OUT_OF_CLASS_WINDOW_REAL_HOURS = 72;
export const AUTO_EVENT_MAX_PER_OUT_OF_CLASS_WINDOW = 1;
/** 지속 효과 기본 3게임 월. */
export const AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS = 3;

/** 서로 다른 비용 효과의 총배율 제한 0.70~1.30. */
export const EVENT_COST_MULTIPLIER_MIN = 0.7;
export const EVENT_COST_MULTIPLIER_MAX = 1.3;

/** 배율 1개를 0.70~1.30 으로 자른다. */
export function clampEventMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 1;
  return Math.min(EVENT_COST_MULTIPLIER_MAX, Math.max(EVENT_COST_MULTIPLIER_MIN, multiplier));
}

export interface CombinedMultiplier {
  /** 자르기 전 곱. */
  readonly raw: number;
  /** 0.70~1.30 으로 자른 값. */
  readonly value: number;
  /** 잘렸는지. */
  readonly clamped: boolean;
}

/** 서로 다른 비용 효과의 총배율 — 곱한 뒤 0.70~1.30 으로 자른다. */
export function combineCostMultipliers(multipliers: readonly number[]): CombinedMultiplier {
  const raw = multipliers.reduce((acc, m) => acc * (Number.isFinite(m) ? m : 1), 1);
  const value = clampEventMultiplier(raw);
  return { raw, value, clamped: value !== raw };
}

/**
 * 같은 효과 중복 — 합산하지 않고 남은 기간을 갱신한다.
 * 반환값은 새 남은 기간(게임 월)이다.
 */
export function refreshEffectRemainingMonths(
  currentRemainingMonths: number,
  incomingDurationMonths: number = AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS,
): number {
  return Math.max(Math.max(0, currentRemainingMonths), Math.max(0, incomingDurationMonths));
}

export interface AutoEventRollContext {
  /** 수동 일시정지 중이면 추첨하지 않는다. */
  readonly paused: boolean;
  /** 월 경계를 넘긴 구간의 성격. */
  readonly phase: SessionPhase;
  /** 마지막 자동 이벤트 이후 지난 게임 월. */
  readonly gameMonthsSinceLastEvent: number;
  /** 이번 수업 세션에서 이미 발생한 자동 이벤트 수. */
  readonly eventsThisSession: number;
  /** 최근 72시간 창에서 이미 발생한 자동 이벤트 수. */
  readonly eventsInOutOfClassWindow: number;
}

export type AutoEventSkipReason =
  | 'paused'
  | 'minInterval'
  | 'sessionCap'
  | 'outOfClassCap'
  | 'notDrawn';

export interface AutoEventRollResult {
  readonly drawn: boolean;
  readonly reason: AutoEventSkipReason | 'drawn';
}

/**
 * 게임 월 경계 1회의 자동 이벤트 추첨. 난수는 인자로 주입한다.
 * 월 경계를 여러 개 한꺼번에 처리해도 발생 상한을 지키도록, 호출자가 경계마다 한 번씩
 * 부르고 결과를 카운터에 반영한다.
 */
export function rollAutoEvent(
  context: AutoEventRollContext,
  random: () => number,
): AutoEventRollResult {
  if (context.paused) return { drawn: false, reason: 'paused' };
  if (context.gameMonthsSinceLastEvent < AUTO_EVENT_MIN_INTERVAL_GAME_MONTHS) {
    return { drawn: false, reason: 'minInterval' };
  }
  if (context.phase === 'inClass' && context.eventsThisSession >= AUTO_EVENT_MAX_PER_SESSION) {
    return { drawn: false, reason: 'sessionCap' };
  }
  if (
    context.phase === 'outOfClass' &&
    context.eventsInOutOfClassWindow >= AUTO_EVENT_MAX_PER_OUT_OF_CLASS_WINDOW
  ) {
    return { drawn: false, reason: 'outOfClassCap' };
  }
  return random() < AUTO_EVENT_MONTHLY_CHANCE
    ? { drawn: true, reason: 'drawn' }
    : { drawn: false, reason: 'notDrawn' };
}

/** 교사 실행 이벤트는 자동 추첨과 별도다. 대상·효과·기간·사유를 기록한다. */
export interface TeacherEventRecord {
  readonly eventId: string;
  readonly targetTeamIds: readonly string[];
  readonly durationGameMonths: number;
  readonly reason: string;
  /** 자동 이벤트와 구분해 표시한다. */
  readonly origin: 'teacher';
}

// ── 9.1 사건 문구 카탈로그 — `assets/data/macro-events.json` 을 읽어 쓴다 ──
// 이 파일은 에셋 담당 소유다. 여기서는 **읽기 전용 스키마와 검증**만 둔다.

export const MACRO_EVENT_CATALOG_PATH = 'assets/data/macro-events.json';

export type MacroEventTone = 'good' | 'bad';
export type UpkeepScope = 'facility' | 'rent' | 'staff';

export type MacroEventRule =
  | { readonly kind: 'cash'; readonly amount: number; readonly once?: boolean }
  | { readonly kind: 'marketDemand'; readonly mult: number; readonly months: number }
  | {
      readonly kind: 'researchCost';
      readonly scope: readonly PaidWorkKind[];
      readonly mult: number;
      readonly months: number;
    }
  | { readonly kind: 'clinicalCost'; readonly mult: number; readonly months: number }
  | {
      readonly kind: 'upkeep';
      readonly scope: readonly UpkeepScope[];
      readonly mult: number;
      readonly months: number;
    }
  | {
      readonly kind: 'reviewCost';
      readonly mult: number;
      readonly durationMult: number;
      readonly months: number;
    };

export interface MacroEventEntry {
  readonly id: string;
  readonly tone: MacroEventTone;
  readonly headline: string;
  readonly subhead: string;
  readonly kicker: string;
  readonly body: string;
  readonly period: string;
  readonly effect: string;
  readonly rule: MacroEventRule;
}

export interface MacroEventCatalog {
  readonly source: string;
  readonly template: string;
  readonly events: readonly MacroEventEntry[];
}

/** 비용 효과에 해당하는 규칙 종류 — 0.70~1.30 총배율 제한을 받는다. */
export const COST_EFFECT_RULE_KINDS = [
  'researchCost',
  'clinicalCost',
  'upkeep',
  'reviewCost',
] as const;
export type CostEffectRuleKind = (typeof COST_EFFECT_RULE_KINDS)[number];

export function isCostEffectRule(rule: MacroEventRule): boolean {
  return (COST_EFFECT_RULE_KINDS as readonly string[]).includes(rule.kind);
}

/**
 * JSON 을 읽어 카탈로그 모양인지 확인한다. 파일을 고치지 않고, 모양이 틀리면 던진다.
 * (파일 읽기는 호출자가 한다. 이 함수는 순수하다.)
 */
export function parseMacroEventCatalog(raw: unknown): MacroEventCatalog {
  if (typeof raw !== 'object' || raw === null) {
    throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: 객체가 아니다`);
  }
  const obj = raw as Record<string, unknown>;
  const events = obj['events'];
  if (!Array.isArray(events)) {
    throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: events 배열이 없다`);
  }
  for (const [index, entry] of events.entries()) {
    if (typeof entry !== 'object' || entry === null) {
      throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: events[${index}] 가 객체가 아니다`);
    }
    const e = entry as Record<string, unknown>;
    for (const key of ['id', 'tone', 'headline', 'subhead', 'kicker', 'body', 'period', 'effect']) {
      if (typeof e[key] !== 'string') {
        throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: events[${index}].${key} 가 문자열이 아니다`);
      }
    }
    const rule = e['rule'];
    if (typeof rule !== 'object' || rule === null) {
      throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: events[${index}].rule 이 없다`);
    }
    if (typeof (rule as Record<string, unknown>)['kind'] !== 'string') {
      throw new TypeError(`${MACRO_EVENT_CATALOG_PATH}: events[${index}].rule.kind 가 없다`);
    }
  }
  return raw as MacroEventCatalog;
}

export interface MacroEventIssue {
  readonly eventId: string;
  readonly message: string;
}

/**
 * 카탈로그 검증 — 비용 효과 배율이 0.70~1.30 안에 있는지, 지속 기간이 기본값과 맞는지,
 * id 가 겹치지 않는지 본다. 어긋나면 문제 목록을 돌려준다(문서·에셋 파일을 고치지 않는다).
 */
export function validateMacroEventCatalog(catalog: MacroEventCatalog): MacroEventIssue[] {
  const issues: MacroEventIssue[] = [];
  const seen = new Set<string>();
  for (const event of catalog.events) {
    if (seen.has(event.id)) {
      issues.push({ eventId: event.id, message: 'id 가 중복된다' });
    }
    seen.add(event.id);

    const rule = event.rule;
    if (isCostEffectRule(rule) && 'mult' in rule) {
      const mult = rule.mult;
      if (mult < EVENT_COST_MULTIPLIER_MIN || mult > EVENT_COST_MULTIPLIER_MAX) {
        issues.push({
          eventId: event.id,
          message: `비용 배율 ${mult} 가 ${EVENT_COST_MULTIPLIER_MIN}~${EVENT_COST_MULTIPLIER_MAX} 범위를 벗어난다`,
        });
      }
    }
    if ('months' in rule && rule.months !== AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS) {
      issues.push({
        eventId: event.id,
        message: `지속 기간 ${rule.months} 게임 월이 기본값 ${AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS} 과 다르다`,
      });
    }
  }
  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. 가계부 시뮬레이터 — 균형안 §7 산술 점검 재현용 순수 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 한 구간(수업 또는 수업 사이 간격)의 현금 흐름.
 * 처리 순서는 ① 구간 유지비 정산 → ② 지출 → ③ 유입이다.
 * (균형안 §7.1 표의 "설비 구매·투자 반영 후 잔액" 과 같은 순서)
 */
export interface LedgerStep {
  readonly label: string;
  /** 이 구간의 경과 게임 일. 즉시 집행이면 0. */
  readonly gameDays: number;
  /** 이 구간에 적용할 월 유지비. */
  readonly monthlyUpkeepCents: Cents;
  /** 구간 중·끝에 집행한 지출 합계. */
  readonly spendCents?: Cents;
  /** 구간 끝에 들어온 유입 합계. */
  readonly incomeCents?: Cents;
}

export interface LedgerStepResult {
  readonly label: string;
  /** 구간이 끝난 뒤 현금. */
  readonly cashCents: Cents;
  /** 이 구간에 정산된 유지비. */
  readonly upkeepCents: Cents;
}

export interface LedgerResult {
  readonly openingCashCents: Cents;
  readonly closingCashCents: Cents;
  readonly totalUpkeepCents: Cents;
  readonly totalSpendCents: Cents;
  readonly totalIncomeCents: Cents;
  readonly steps: readonly LedgerStepResult[];
}

/** 구간 목록을 순서대로 적용한 가계부. 순수 함수다. */
export function simulateLedger(
  openingCashCents: Cents,
  steps: readonly LedgerStep[],
): LedgerResult {
  let cash = openingCashCents;
  let ledger = EMPTY_UPKEEP_LEDGER;
  let totalSpend = 0;
  let totalIncome = 0;
  const results: LedgerStepResult[] = [];

  for (const step of steps) {
    const before = ledger.settledCents;
    ledger = accrueUpkeep(ledger, step.monthlyUpkeepCents, step.gameDays);
    const upkeepCents = ledger.settledCents - before;
    const spend = step.spendCents ?? 0;
    const income = step.incomeCents ?? 0;
    cash = cash - upkeepCents - spend + income;
    totalSpend += spend;
    totalIncome += income;
    results.push({ label: step.label, cashCents: cash, upkeepCents });
  }

  return {
    openingCashCents,
    closingCashCents: cash,
    totalUpkeepCents: ledger.settledCents,
    totalSpendCents: totalSpend,
    totalIncomeCents: totalIncome,
    steps: results,
  };
}
