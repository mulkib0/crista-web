/**
 * 균형안 v0 산술 점검 재현 — `docs/2026-10-19-game-balance-v0.md` §7.1 · §7.2.
 *
 * 이 테스트는 **문서 수치를 단일 소스로** 삼는다. 계산이 문서와 어긋나면
 * 문서를 고치는 것이 아니라 이 테스트가 깨져서 어긋난 자리를 드러내야 한다.
 *
 * 오차 허용범위: 문서가 금액을 $0.001M(=$1,000) 자리까지 적었으므로,
 * 마지막 표시 자리의 절반인 **$0.0005M(= 50,000 센트)** 이하 차이를 같은 값으로 본다.
 * (`DISPLAY_TOLERANCE_CENTS`, 경계는 포함)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';

import {
  AUTO_EVENT_MAX_PER_OUT_OF_CLASS_WINDOW,
  AUTO_EVENT_MAX_PER_SESSION,
  AUTO_EVENT_MONTHLY_CHANCE,
  BASELINE_MONTHLY_UPKEEP_CENTS,
  BASELINE_UPKEEP_INPUT,
  CASH_ALERT_FRAME,
  CENTS_PER_MILLION,
  CLINICAL_COST_CENTS,
  DEFAULT_CLOCK_SETTINGS,
  EVENT_COST_MULTIPLIER_MAX,
  EVENT_COST_MULTIPLIER_MIN,
  FACILITY_PRICE,
  FACILITY_UPGRADE_TIER1,
  FILING_COST_CENTS,
  FULL_LAB_MONTHLY_UPKEEP_CENTS,
  FULL_LAB_UPKEEP_INPUT,
  GAME_DAYS_PER_MONTH,
  GRACE_PERIOD_REAL_MINUTES,
  PAID_WORK_COST_CENTS,
  RESEARCHER_MONTHLY_SALARY_CENTS,
  RESEARCHER_HIRING_FEE_CENTS,
  RESEARCHERS_MAX,
  RESEARCHERS_MIN,
  SERIES_A_CENTS,
  SERIES_B_CENTS,
  clampEventMultiplier,
  combineCostMultipliers,
  durationSubsidyCents,
  evaluateCashStatus,
  evaluateGraceOutcome,
  evaluateRecovery,
  facilityMonthlyUpkeepCents,
  formatMillions,
  gameDaysFromRealMinutes,
  gameDaysToMonths,
  initialResearchFundCents,
  millionsToCents,
  monthlyUpkeepCents,
  paidWorkCostCents,
  parseMacroEventCatalog,
  recoveryRequirementCents,
  refreshEffectRemainingMonths,
  rollAutoEvent,
  simulateLedger,
  upkeepForGameMonths,
  validateMacroEventCatalog,
  type LedgerStep,
} from '../src/economy.ts';

// ─────────────────────────────────────────────────────────────────────────────
// 공통 — 오차 허용범위와 단축 표기
// ─────────────────────────────────────────────────────────────────────────────

/** $0.0005M — 문서 표기 마지막 자리($0.001M)의 절반. 경계 포함. */
const DISPLAY_TOLERANCE_CENTS = millionsToCents(0.0005);

const M = millionsToCents;

function assertNearMillions(actualCents: number, docMillions: number, what: string): void {
  const expected = M(docMillions);
  const diff = Math.abs(actualCents - expected);
  assert.ok(
    diff <= DISPLAY_TOLERANCE_CENTS,
    `${what}: 계산 ${formatMillions(actualCents, 6)} vs 문서 ${formatMillions(expected, 3)} ` +
      `— 차이 ${formatMillions(diff, 6)} 가 허용범위 ${formatMillions(DISPLAY_TOLERANCE_CENTS, 4)} 를 넘는다`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §7.1 기준 시나리오 구성
// ─────────────────────────────────────────────────────────────────────────────

/** 수업 밖 현실 7일 = 49게임 일 = 1.633333게임 월 (문서 §7.1). */
const GAP_GAME_DAYS = 7 * 7;

/** 유료 연구 1회 비용 $0.050M. HTVS·도킹·ADMET 모두 같다. */
const PAID_WORK_CENTS = PAID_WORK_COST_CENTS.htvs;

/** 월 유지비 3단계 — 설비 구매 시점에 따라 바뀐다. */
const UPKEEP_STAGE1 = M(0.05); // 대학병원 + 표적 탐색실 + 연구원 1명
const UPKEEP_STAGE2 = M(0.07); // + HTVS·도킹
const UPKEEP_STAGE3 = M(0.085); // + ADMET·보안

/**
 * §7.1 기준 시나리오의 구간 목록.
 * `sessionGameMonths` 로 여러 차시(12) / 장기(3) 과정을 같은 구조로 돌린다.
 */
function baselineSteps(options: {
  readonly sessionCount: number;
  readonly sessionGameMonths: number;
}): LedgerStep[] {
  const { sessionCount, sessionGameMonths } = options;
  const sessionDays = sessionGameMonths * GAME_DAYS_PER_MONTH;
  const steps: LedgerStep[] = [];

  // 처음 표적 탐색실 $1M (수업 시작 전, 경과 시간 0)
  steps.push({
    label: '개시 · 표적 탐색실',
    gameDays: 0,
    monthlyUpkeepCents: UPKEEP_STAGE1,
    spendCents: FACILITY_PRICE.target.installCents,
  });

  for (let session = 1; session <= sessionCount; session += 1) {
    // 구간에 적용할 유지비는 그 수업이 시작될 때의 설비 구성으로 정한다.
    const upkeep =
      session === 1 ? UPKEEP_STAGE1 : session === 2 ? UPKEEP_STAGE2 : UPKEEP_STAGE3;

    let spend = 0;
    let income = 0;

    // 1·2·3차시에 유료 연구 4·6·4회
    if (session === 1) spend += 4 * PAID_WORK_CENTS;
    if (session === 2) spend += 6 * PAID_WORK_CENTS;
    if (session === 3) spend += 4 * PAID_WORK_CENTS;

    // 1차시 종료: HTVS·도킹실 $1.2M / 2차시 종료: ADMET·보안 $0.8M
    if (session === 1) {
      spend += FACILITY_PRICE.htvs.installCents + FACILITY_PRICE.docking.installCents;
      income += SERIES_A_CENTS; // 1차시 말 Series A
    }
    if (session === 2) {
      spend += FACILITY_PRICE.admet.installCents + FACILITY_PRICE.security.installCents;
    }
    // 3차시: 특허·IND $0.15M, 3차시 말 Series B
    if (session === 3) {
      spend += FILING_COST_CENTS.substancePatent + FILING_COST_CENTS.ind;
      income += SERIES_B_CENTS;
    }
    // 4차시: 임상 1·2상 $0.9M / 5차시: 3상 $1.2M / 6차시: 최종 신청 $0.1M
    if (session === 4) spend += CLINICAL_COST_CENTS.phase1 + CLINICAL_COST_CENTS.phase2;
    if (session === 5) spend += CLINICAL_COST_CENTS.phase3;
    if (session === 6) spend += FILING_COST_CENTS.finalApproval;

    steps.push({
      label: `${session}차시`,
      gameDays: sessionDays,
      monthlyUpkeepCents: upkeep,
      spendCents: spend,
      incomeCents: income,
    });

    // 수업 사이 간격 — 마지막 차시 뒤에는 없다(간격 수 = 차시 수 - 1)
    if (session < sessionCount) {
      steps.push({
        label: `간격 ${session} (현실 7일)`,
        gameDays: GAP_GAME_DAYS,
        monthlyUpkeepCents: session === 1 ? UPKEEP_STAGE2 : UPKEEP_STAGE3,
      });
    }
  }

  return steps;
}

const MULTI_SESSION = { sessionCount: 6, sessionGameMonths: 12 } as const;

function sessionEndCash(result: ReturnType<typeof simulateLedger>, session: number): number {
  const step = result.steps.find((s) => s.label === `${session}차시`);
  assert.ok(step !== undefined, `${session}차시 구간이 없다`);
  return step.cashCents;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('게임 시간 환산 (균형안 §2)', () => {
  test('여러 차시 과정: 현실 50분 = 게임 12개월', () => {
    const days = gameDaysFromRealMinutes(DEFAULT_CLOCK_SETTINGS, 'inClass', 50);
    assert.equal(gameDaysToMonths(days), 12);
  });

  test('장기 과정: 현실 50분 = 게임 3개월', () => {
    const days = gameDaysFromRealMinutes(
      { ...DEFAULT_CLOCK_SETTINGS, course: 'longTerm' },
      'inClass',
      50,
    );
    assert.equal(gameDaysToMonths(days), 3);
  });

  test('수업 밖: 현실 24시간 = 게임 7일, 현실 7일 = 49게임 일 = 1.633333게임 월', () => {
    assert.equal(gameDaysFromRealMinutes(DEFAULT_CLOCK_SETTINGS, 'outOfClass', 24 * 60), 7);
    const sevenDays = gameDaysFromRealMinutes(DEFAULT_CLOCK_SETTINGS, 'outOfClass', 7 * 24 * 60);
    assert.equal(sevenDays, 49);
    assert.ok(Math.abs(gameDaysToMonths(sevenDays) - 1.633333) < 1e-6);
  });

  test('45분 수업은 같은 분당 배율로 45분만 진행한다 (50분은 계산 기준)', () => {
    const days = gameDaysFromRealMinutes(DEFAULT_CLOCK_SETTINGS, 'inClass', 45);
    assert.equal(gameDaysToMonths(days), 12 * (45 / 50));
  });

  test('고정 속도 모드는 구간 성격과 무관하게 한 배율을 쓴다', () => {
    const fixed = { ...DEFAULT_CLOCK_SETTINGS, mode: 'fixed' as const };
    assert.equal(gameDaysFromRealMinutes(fixed, 'inClass', 24 * 60), 7);
    assert.equal(gameDaysFromRealMinutes(fixed, 'outOfClass', 24 * 60), 7);
  });
});

describe('월 유지비 표 (균형안 §3.2)', () => {
  test('기본 구성(대학병원 + 표적 탐색실 + 연구원 1명)은 $0.050M', () => {
    assert.equal(monthlyUpkeepCents(BASELINE_UPKEEP_INPUT), BASELINE_MONTHLY_UPKEEP_CENTS);
    assert.equal(formatMillions(BASELINE_MONTHLY_UPKEEP_CENTS), '$0.050M');
  });

  test('네 연구실 + 보안 전체 가동은 $0.085M', () => {
    assert.equal(monthlyUpkeepCents(FULL_LAB_UPKEEP_INPUT), FULL_LAB_MONTHLY_UPKEEP_CENTS);
    assert.equal(formatMillions(FULL_LAB_MONTHLY_UPKEEP_CENTS), '$0.085M');
  });

  test('가동 중지 설비는 유지비 20%만 낸다', () => {
    assert.equal(
      facilityMonthlyUpkeepCents({ kind: 'target', active: false }),
      Math.round(FACILITY_PRICE.target.monthlyUpkeepCents * 0.2),
    );
  });

  test('1단계 업그레이드는 유지비를 $0.005M 더한다', () => {
    const base = facilityMonthlyUpkeepCents({ kind: 'htvs', active: true });
    const upgraded = facilityMonthlyUpkeepCents({
      kind: 'htvs',
      active: true,
      upgradeTier1Count: 1,
    });
    assert.equal(upgraded - base, FACILITY_UPGRADE_TIER1.monthlyUpkeepCents);
  });

  test('연구원 급여는 1명당 $0.020M', () => {
    const two = monthlyUpkeepCents({ ...BASELINE_UPKEEP_INPUT, researchers: 2 });
    assert.equal(two - BASELINE_MONTHLY_UPKEEP_CENTS, RESEARCHER_MONTHLY_SALARY_CENTS);
  });

  test('연구원 범위 0~10명(v4 채용 · 해고 입력 검증) — 10명이면 급여 $0.200M, 채용비 없음', () => {
    assert.equal(RESEARCHERS_MIN, 0);
    assert.equal(RESEARCHERS_MAX, 10);
    assert.equal(RESEARCHER_HIRING_FEE_CENTS, 0);
    const ten = monthlyUpkeepCents({ ...BASELINE_UPKEEP_INPUT, researchers: RESEARCHERS_MAX });
    assert.equal(ten - BASELINE_MONTHLY_UPKEEP_CENTS, 9 * RESEARCHER_MONTHLY_SALARY_CENTS);
    assert.equal(formatMillions(RESEARCHERS_MAX * RESEARCHER_MONTHLY_SALARY_CENTS), '$0.200M');
  });
});

describe('연구 비용과 지구 할인 (균형안 §3.3)', () => {
  test('유료 작업 기본값은 각각 $0.050M', () => {
    assert.equal(paidWorkCostCents('htvs'), M(0.05));
    assert.equal(paidWorkCostCents('docking'), M(0.05));
    assert.equal(paidWorkCostCents('admet'), M(0.05));
  });

  test('AI 지구는 HTVS·도킹 30% 할인, ADMET 은 할인 없음', () => {
    assert.equal(paidWorkCostCents('htvs', { district: 'compute' }), M(0.035));
    assert.equal(paidWorkCostCents('docking', { district: 'compute' }), M(0.035));
    assert.equal(paidWorkCostCents('admet', { district: 'compute' }), M(0.05));
  });

  test('산업단지는 합성·ADMET 20% 할인', () => {
    assert.equal(paidWorkCostCents('htvs', { district: 'industry' }), M(0.04));
    assert.equal(paidWorkCostCents('admet', { district: 'industry' }), M(0.04));
    assert.equal(paidWorkCostCents('docking', { district: 'industry' }), M(0.05));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§7.1 기준 시나리오 — 수업 종료 시점 잔액', () => {
  const result = simulateLedger(M(6), baselineSteps(MULTI_SESSION));

  /** 문서 §7.1 표. */
  const DOC_SESSION_END_MILLIONS: Record<number, number> = {
    1: 6.0,
    2: 3.946,
    3: 7.437,
    4: 5.378,
    5: 3.019,
    6: 1.76,
  };

  for (const [session, docValue] of Object.entries(DOC_SESSION_END_MILLIONS)) {
    test(`${session}차시 종료 잔액 ≈ $${docValue.toFixed(3)}M`, () => {
      assertNearMillions(sessionEndCash(result, Number(session)), docValue, `${session}차시 잔액`);
    });
  }

  test('총 유입 $14M (초기 $6M + Series A $3M + Series B $5M)', () => {
    assert.equal(result.openingCashCents + result.totalIncomeCents, M(14));
  });

  test('항목별 지출 합계 — 설비 $3M · 연구 $0.7M · 특허·신청 $0.25M · 임상 $2.1M', () => {
    const facility =
      FACILITY_PRICE.target.installCents +
      FACILITY_PRICE.htvs.installCents +
      FACILITY_PRICE.docking.installCents +
      FACILITY_PRICE.admet.installCents +
      FACILITY_PRICE.security.installCents;
    const research = (4 + 6 + 4) * PAID_WORK_CENTS;
    const filings =
      FILING_COST_CENTS.substancePatent + FILING_COST_CENTS.ind + FILING_COST_CENTS.finalApproval;
    const clinical =
      CLINICAL_COST_CENTS.phase1 + CLINICAL_COST_CENTS.phase2 + CLINICAL_COST_CENTS.phase3;

    assert.equal(facility, M(3));
    assert.equal(research, M(0.7));
    assert.equal(filings, M(0.25));
    assert.equal(clinical, M(2.1));
    assert.equal(result.totalSpendCents, facility + research + filings + clinical);
  });

  test('유지비 총액 ≈ $6.190M', () => {
    assertNearMillions(result.totalUpkeepCents, 6.19, '기준 경로 유지비 총액');
  });

  test('최종 잔액 ≈ $1.760M 이 유입 - 지출 - 유지비와 맞는다', () => {
    const closing =
      result.openingCashCents +
      result.totalIncomeCents -
      result.totalSpendCents -
      result.totalUpkeepCents;
    assert.equal(result.closingCashCents, closing);
    assertNearMillions(result.closingCashCents, 1.76, '최종 잔액');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§7.2 실패·확장·장기 과정 비교', () => {
  const baseline = simulateLedger(M(6), baselineSteps(MULTI_SESSION));
  const baseFinal = baseline.closingCashCents;

  test('기준 경로 최종 $1.760M', () => {
    assertNearMillions(baseFinal, 1.76, '기준 경로');
  });

  test('유료 연구 실패 8회 추가 → 최종 $1.360M (수업 시간 안에 추가 수행)', () => {
    const extra = 8 * PAID_WORK_CENTS;
    assertNearMillions(baseFinal - extra, 1.36, '실패 8회 추가');
  });

  test('임상 2상 1회 재시도 + 추가 6게임 월 → 최종 $0.650M', () => {
    const cost = CLINICAL_COST_CENTS.phase2 + upkeepForGameMonths(UPKEEP_STAGE3, 6);
    assertNearMillions(baseFinal - cost, 0.65, '2상 1회 재시도');
  });

  test('임상 2상 2회(또는 3상 1회) 재시도 + 추가 12게임 월 → $0.460M 부족', () => {
    const extraUpkeep = upkeepForGameMonths(UPKEEP_STAGE3, 12);
    const retryTwicePhase2 = 2 * CLINICAL_COST_CENTS.phase2 + extraUpkeep;
    const retryOncePhase3 = CLINICAL_COST_CENTS.phase3 + extraUpkeep;
    assert.equal(retryTwicePhase2, retryOncePhase3, '2상 2회와 3상 1회의 총액이 같아야 한다');
    const shortfall = retryTwicePhase2 - baseFinal;
    assertNearMillions(shortfall, 0.46, '재시도 부족액');
  });

  test('1차시 말 연구원 4명 추가 + 설비 업그레이드 2회 → $4.875M 부족', () => {
    // 1차시 종료 이후 남은 게임 월 = 5차시 × 12 + 간격 5회 × 1.633333
    const remainingMonths = 5 * 12 + 5 * gameDaysToMonths(GAP_GAME_DAYS);
    const extraMonthly =
      4 * RESEARCHER_MONTHLY_SALARY_CENTS + 2 * FACILITY_UPGRADE_TIER1.monthlyUpkeepCents;
    const extraCost =
      2 * FACILITY_UPGRADE_TIER1.installCents + upkeepForGameMonths(extraMonthly, remainingMonths);
    const shortfall = extraCost - baseFinal;
    assertNearMillions(shortfall, 4.875, '과도한 확장 부족액');
  });

  test('장기 16차시 × 3게임 월 · 간격 15회 → 기간 보정금 없음, 최종 $1.962M', () => {
    const steps = baselineSteps({ sessionCount: 16, sessionGameMonths: 3 });
    const plannedMonths = 16 * 3 + 15 * gameDaysToMonths(GAP_GAME_DAYS);
    assert.equal(durationSubsidyCents(plannedMonths), 0, '예정 72.5게임 월은 80 미만이라 보정 없음');
    const result = simulateLedger(initialResearchFundCents(plannedMonths), steps);
    assertNearMillions(result.closingCashCents, 1.962, '장기 16차시 최종');
  });

  test('장기 24차시 × 3게임 월 · 간격 23회 → 보정금 $2.513M, 초기 $8.513M, 최종 $1.325M', () => {
    const plannedMonths = 24 * 3 + 23 * gameDaysToMonths(GAP_GAME_DAYS);
    const subsidy = durationSubsidyCents(plannedMonths);
    const opening = initialResearchFundCents(plannedMonths);
    assertNearMillions(subsidy, 2.513, '기간 보정금');
    assertNearMillions(opening, 8.513, '장기 과정 초기 연구비');

    const result = simulateLedger(opening, baselineSteps({ sessionCount: 24, sessionGameMonths: 3 }));
    assertNearMillions(result.closingCashCents, 1.325, '장기 24차시 최종');
  });

  test('학생 1명 $0.100M · 20명 합계 $2M', () => {
    assert.equal(M(0.1) * 20, M(2));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§7.2 수업 밖 유지비·유예 필요액', () => {
  const sevenRealDaysMonths = gameDaysToMonths(GAP_GAME_DAYS);

  test('수업 밖 현실 7일 기본 유지비 ≈ $0.082M', () => {
    assertNearMillions(
      upkeepForGameMonths(UPKEEP_STAGE1, sevenRealDaysMonths),
      0.082,
      '현실 7일 기본 유지비',
    );
  });

  test('수업 밖 현실 7일 전체 가동 유지비 ≈ $0.139M', () => {
    assertNearMillions(
      upkeepForGameMonths(UPKEEP_STAGE3, sevenRealDaysMonths),
      0.139,
      '현실 7일 전체 가동 유지비',
    );
  });

  test('완속으로 유예 48시간을 보내면 미지급 유지비 ≈ $0.040M', () => {
    const gameDays = gameDaysFromRealMinutes(
      DEFAULT_CLOCK_SETTINGS,
      'outOfClass',
      GRACE_PERIOD_REAL_MINUTES,
    );
    assert.equal(gameDays, 14, '현실 48시간 = 게임 14일');
    assertNearMillions(
      upkeepForGameMonths(UPKEEP_STAGE3, gameDaysToMonths(gameDays)),
      0.04,
      '유예 48시간 미지급 유지비',
    );
  });

  test('3개월 운영비까지 포함한 회생 필요액 ≈ $0.295M', () => {
    const unpaid = upkeepForGameMonths(UPKEEP_STAGE3, gameDaysToMonths(14));
    const required = recoveryRequirementCents({
      unpaidCents: unpaid,
      adjustedMonthlyUpkeepCents: UPKEEP_STAGE3,
    });
    assertNearMillions(required, 0.295, '회생 필요액');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('자금 경고 4단계 경계값 (균형안 §4)', () => {
  const upkeep = FULL_LAB_MONTHLY_UPKEEP_CENTS; // $0.085M

  function status(cashCents: number, extra: Partial<Parameters<typeof evaluateCashStatus>[0]> = {}) {
    return evaluateCashStatus({
      cashCents,
      reservedCents: 0,
      monthlyUpkeepCents: upkeep,
      ...extra,
    });
  }

  test('가용 현금 = 회사 현금 - 미집행 확보 비용', () => {
    const s = status(M(1), { reservedCents: M(0.4) });
    assert.equal(s.availableCents, M(0.6));
  });

  test('운영 가능 6게임 월 정확히 = 경고 없음, 6 미만 = 주의', () => {
    assert.equal(status(upkeep * 6).level, 'normal');
    assert.equal(status(upkeep * 6 - 1).level, 'notice');
  });

  test('운영 가능 3게임 월 정확히 = 주의, 3 미만 = 위기', () => {
    assert.equal(status(upkeep * 3).level, 'notice');
    assert.equal(status(upkeep * 3 - 1).level, 'crisis');
  });

  test('유지비 1개월분 정확히 = 위기, 그보다 적으면 구조조정', () => {
    assert.equal(status(upkeep).level, 'crisis');
    assert.equal(status(upkeep - 1).level, 'restructure');
  });

  test('미지급 비용이 있으면 현금이 넉넉해도 구조조정', () => {
    assert.equal(status(M(10), { unpaidCents: 1 }).level, 'restructure');
  });

  test('유예 중이면 가장 높은 우선순위로 회생 유예', () => {
    assert.equal(status(upkeep - 1, { graceActive: true, unpaidCents: M(0.04) }).level, 'grace');
  });

  test('4단계가 `ui/hud-cash-*` 프레임 키와 1:1 로 맞는다', () => {
    assert.equal(CASH_ALERT_FRAME.notice, 'ui/hud-cash-notice');
    assert.equal(CASH_ALERT_FRAME.crisis, 'ui/hud-cash-crisis');
    assert.equal(CASH_ALERT_FRAME.restructure, 'ui/hud-cash-restructure');
    assert.equal(CASH_ALERT_FRAME.grace, 'ui/hud-cash-grace');
    assert.equal(CASH_ALERT_FRAME.normal, null, '평시 카드는 균형안에 없다');
    assert.equal(status(upkeep * 4).frameKey, 'ui/hud-cash-notice');
  });

  test('월 유지비가 0 이면 운영 가능 개월은 무한, 경고 없음', () => {
    const s = evaluateCashStatus({ cashCents: 0, reservedCents: 0, monthlyUpkeepCents: 0 });
    assert.equal(s.runwayGameMonths, Number.POSITIVE_INFINITY);
    assert.equal(s.level, 'normal');
  });
});

describe('회생 유예 만료와 회생 조건 (균형안 §4)', () => {
  const upkeep = FULL_LAB_MONTHLY_UPKEEP_CENTS;
  const unpaid = M(0.04);
  const required = recoveryRequirementCents({
    unpaidCents: unpaid,
    adjustedMonthlyUpkeepCents: upkeep,
  });

  test('유예는 현실 48시간 = 2880분이다', () => {
    assert.equal(GRACE_PERIOD_REAL_MINUTES, 2880);
  });

  test('47시간 59분에는 아직 유예 중 (조건 미충족)', () => {
    const outcome = evaluateGraceOutcome(
      { elapsedRealMinutes: GRACE_PERIOD_REAL_MINUTES - 1 },
      { unpaidCents: unpaid, adjustedMonthlyUpkeepCents: upkeep, availableCents: required - 1 },
    );
    assert.equal(outcome, 'inGrace');
  });

  test('정확히 48시간이 지나고 조건 미충족이면 파산 판정', () => {
    const outcome = evaluateGraceOutcome(
      { elapsedRealMinutes: GRACE_PERIOD_REAL_MINUTES },
      { unpaidCents: unpaid, adjustedMonthlyUpkeepCents: upkeep, availableCents: required - 1 },
    );
    assert.equal(outcome, 'bankrupt');
  });

  test('필요액을 딱 채우면 만료 뒤에도 회생', () => {
    const outcome = evaluateGraceOutcome(
      { elapsedRealMinutes: GRACE_PERIOD_REAL_MINUTES * 2 },
      { unpaidCents: unpaid, adjustedMonthlyUpkeepCents: upkeep, availableCents: required },
    );
    assert.equal(outcome, 'recovered');
  });

  test('부족액이 필요액 - 가용 현금으로 계산된다', () => {
    const r = evaluateRecovery({
      unpaidCents: unpaid,
      adjustedMonthlyUpkeepCents: upkeep,
      availableCents: M(0.1),
    });
    assert.equal(r.requiredCents, required);
    assert.equal(r.shortfallCents, required - M(0.1));
    assert.equal(r.satisfied, false);
  });

  test('교사가 유예를 늘리면 만료 시점이 함께 밀린다', () => {
    const outcome = evaluateGraceOutcome(
      {
        elapsedRealMinutes: GRACE_PERIOD_REAL_MINUTES,
        teacherAdjustmentRealMinutes: 60,
      },
      { unpaidCents: unpaid, adjustedMonthlyUpkeepCents: upkeep, availableCents: 0 },
    );
    assert.equal(outcome, 'inGrace');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('자동 이벤트 (균형안 §5)', () => {
  const ok = {
    paused: false,
    phase: 'inClass' as const,
    gameMonthsSinceLastEvent: 2,
    eventsThisSession: 0,
    eventsInOutOfClassWindow: 0,
  };

  test('추첨 확률 15% — 난수가 경계 밑이면 발생, 경계 이상이면 미발생', () => {
    assert.equal(AUTO_EVENT_MONTHLY_CHANCE, 0.15);
    assert.equal(rollAutoEvent(ok, () => 0.1499).drawn, true);
    assert.equal(rollAutoEvent(ok, () => 0.15).drawn, false);
  });

  test('일시정지 중에는 추첨하지 않는다', () => {
    const r = rollAutoEvent({ ...ok, paused: true }, () => 0);
    assert.deepEqual(r, { drawn: false, reason: 'paused' });
  });

  test('최소 간격 2게임 월 — 1.9개월이면 추첨하지 않는다', () => {
    assert.equal(rollAutoEvent({ ...ok, gameMonthsSinceLastEvent: 1.9 }, () => 0).reason, 'minInterval');
    assert.equal(rollAutoEvent({ ...ok, gameMonthsSinceLastEvent: 2 }, () => 0).drawn, true);
  });

  test('수업 중 상한 2개', () => {
    assert.equal(rollAutoEvent({ ...ok, eventsThisSession: 1 }, () => 0).drawn, true);
    assert.equal(
      rollAutoEvent({ ...ok, eventsThisSession: AUTO_EVENT_MAX_PER_SESSION }, () => 0).reason,
      'sessionCap',
    );
  });

  test('수업 밖 72시간 창 상한 1개', () => {
    const outside = { ...ok, phase: 'outOfClass' as const };
    assert.equal(rollAutoEvent(outside, () => 0).drawn, true);
    assert.equal(
      rollAutoEvent(
        { ...outside, eventsInOutOfClassWindow: AUTO_EVENT_MAX_PER_OUT_OF_CLASS_WINDOW },
        () => 0,
      ).reason,
      'outOfClassCap',
    );
  });

  test('월 경계를 여러 개 한꺼번에 처리해도 수업 중 상한을 넘지 않는다', () => {
    let count = 0;
    for (let boundary = 0; boundary < 12; boundary += 1) {
      const r = rollAutoEvent({ ...ok, eventsThisSession: count }, () => 0);
      if (r.drawn) count += 1;
    }
    assert.equal(count, AUTO_EVENT_MAX_PER_SESSION);
  });
});

describe('이벤트 효과 배율 한계 0.70~1.30 (균형안 §5)', () => {
  test('단일 배율을 범위로 자른다', () => {
    assert.equal(clampEventMultiplier(0.5), EVENT_COST_MULTIPLIER_MIN);
    assert.equal(clampEventMultiplier(2), EVENT_COST_MULTIPLIER_MAX);
    assert.equal(clampEventMultiplier(1.2), 1.2);
    assert.equal(clampEventMultiplier(EVENT_COST_MULTIPLIER_MIN), 0.7);
    assert.equal(clampEventMultiplier(EVENT_COST_MULTIPLIER_MAX), 1.3);
  });

  test('서로 다른 비용 효과의 총배율도 0.70~1.30 으로 자른다', () => {
    const up = combineCostMultipliers([1.2, 1.15]); // raw 1.38
    assert.ok(Math.abs(up.raw - 1.38) < 1e-12);
    assert.equal(up.value, EVENT_COST_MULTIPLIER_MAX);
    assert.equal(up.clamped, true);

    const down = combineCostMultipliers([0.85, 0.8]); // raw 0.68
    assert.ok(Math.abs(down.raw - 0.68) < 1e-12);
    assert.equal(down.value, EVENT_COST_MULTIPLIER_MIN);
    assert.equal(down.clamped, true);

    const inside = combineCostMultipliers([1.1, 1.1]); // raw 1.21
    assert.equal(inside.clamped, false);
  });

  test('비용 배율이 범위를 넘어도 요금에 그 이상 반영되지 않는다', () => {
    assert.equal(paidWorkCostCents('docking', { eventMultiplier: 5 }), M(0.05 * 1.3));
    assert.equal(paidWorkCostCents('docking', { eventMultiplier: 0.1 }), M(0.05 * 0.7));
  });

  test('유지비 배율도 같은 범위로 잘린다', () => {
    const capped = monthlyUpkeepCents({
      ...FULL_LAB_UPKEEP_INPUT,
      multipliers: { facility: 5 },
    });
    const expected = monthlyUpkeepCents({
      ...FULL_LAB_UPKEEP_INPUT,
      multipliers: { facility: EVENT_COST_MULTIPLIER_MAX },
    });
    assert.equal(capped, expected);
  });

  test('같은 효과 중복은 합산하지 않고 남은 기간을 갱신한다', () => {
    assert.equal(refreshEffectRemainingMonths(1, 3), 3);
    assert.equal(refreshEffectRemainingMonths(3, 3), 3, '6이 되지 않는다');
  });
});

describe('사건 문구 카탈로그 — assets/data/macro-events.json (고치지 않고 읽는다)', () => {
  const path = fileURLToPath(
    new URL('../../../assets/data/macro-events.json', import.meta.url),
  );
  const catalog = parseMacroEventCatalog(JSON.parse(readFileSync(path, 'utf8')) as unknown);

  test('파일을 스키마대로 읽을 수 있다', () => {
    assert.ok(catalog.events.length > 0);
    assert.equal(catalog.source, 'docs/2026-10-19-game-balance-v0.md §5');
  });

  test('모든 비용 효과 배율이 0.70~1.30 안에 있고 지속 기간이 3게임 월이다', () => {
    const issues = validateMacroEventCatalog(catalog);
    assert.deepEqual(issues, [], `카탈로그 문제: ${JSON.stringify(issues)}`);
  });

  test('정부 연구 지원은 $0.250M, 사건별 1회다', () => {
    const grant = catalog.events.find((e) => e.id === 'gov-grant');
    assert.ok(grant !== undefined);
    assert.equal(grant.rule.kind, 'cash');
    if (grant.rule.kind === 'cash') {
      assert.equal(millionsToCents(grant.rule.amount), M(0.25));
      assert.equal(grant.rule.once, true);
    }
  });

  test('장비 운영비 상승은 설비 유지비 ×1.20 · 3게임 월이다', () => {
    const opex = catalog.events.find((e) => e.id === 'opex-up');
    assert.ok(opex !== undefined);
    assert.equal(opex.rule.kind, 'upkeep');
    if (opex.rule.kind === 'upkeep') {
      assert.equal(opex.rule.mult, 1.2);
      assert.equal(opex.rule.months, 3);
      assert.deepEqual([...opex.rule.scope], ['facility']);
    }
  });

  test('규제 검토 강화는 비용 ×1.10 · 기간 ×1.25 다', () => {
    const reg = catalog.events.find((e) => e.id === 'regulation');
    assert.ok(reg !== undefined);
    assert.equal(reg.rule.kind, 'reviewCost');
    if (reg.rule.kind === 'reviewCost') {
      assert.equal(reg.rule.mult, 1.1);
      assert.equal(reg.rule.durationMult, 1.25);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('유지비 정산 — 게임 일 경계 + 부분 일 누적 (균형안 §3)', () => {
  test('부분 일은 경계를 넘을 때까지 누적된다', () => {
    const upkeep = FULL_LAB_MONTHLY_UPKEEP_CENTS;
    const half = simulateLedger(0, [
      { label: '0.5일', gameDays: 0.5, monthlyUpkeepCents: upkeep },
    ]);
    assert.equal(half.totalUpkeepCents, 0, '하루를 못 넘기면 정산하지 않는다');

    const twoHalves = simulateLedger(0, [
      { label: '0.5일', gameDays: 0.5, monthlyUpkeepCents: upkeep },
      { label: '0.5일', gameDays: 0.5, monthlyUpkeepCents: upkeep },
    ]);
    assert.equal(twoHalves.totalUpkeepCents, Math.floor(upkeep / GAME_DAYS_PER_MONTH));
  });

  test('30게임 일 = 월 유지비 1개월분(센트 오차 없음)', () => {
    const r = simulateLedger(0, [
      { label: '1개월', gameDays: 30, monthlyUpkeepCents: FULL_LAB_MONTHLY_UPKEEP_CENTS },
    ]);
    assert.equal(r.totalUpkeepCents, FULL_LAB_MONTHLY_UPKEEP_CENTS);
  });

  test('금액은 정수 센트로만 쌓인다', () => {
    const r = simulateLedger(M(6), baselineSteps(MULTI_SESSION));
    assert.ok(Number.isInteger(r.totalUpkeepCents));
    assert.ok(Number.isInteger(r.closingCashCents));
    assert.equal(CENTS_PER_MILLION, 100_000_000);
  });
});
