/**
 * 유지비 정산 · 자금 상태 · 회생 유예 · 투자 · 재창업(M3) — 균형안 §3 · §3.1 · §4 · §7.2, 브리프 §4.3 · §4.4.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  EMPTY_UPKEEP_LEDGER,
  FULL_LAB_MONTHLY_UPKEEP_CENTS,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  accrueUpkeep,
  applyClockCommand,
  applyGraceAdjust,
  arrearsPayment,
  cashStatusView,
  facilitySaleCents,
  gameDaysAt,
  graceDecision,
  initialClockState,
  investmentCents,
  millionsToCents,
  operatingMsAt,
  payUpkeep,
  planUpkeep,
  refoundGrantCents,
  refoundTeamId,
  teamUpkeep,
  type ClockState,
} from '../src/index.ts';
import type { FacilityKind, FacilityTier } from '@crista/shared-types';

const M = millionsToCents;
const T0 = Date.UTC(2026, 9, 21);
const H48 = 48 * MS_PER_HOUR;
/** 문서는 $0.001M 자리까지 적었다 — 표시 자리 절반($0.0005M) 이하 차이는 같은 값으로 본다(economy.test.ts 와 같은 규칙). */
const DISPLAY_TOLERANCE_CENTS = M(0.0005);

const NONE: Record<FacilityKind, FacilityTier> = { target: 0, htvs: 0, docking: 0, admet: 0, security: 0 };
const FULL: Record<FacilityKind, FacilityTier> = { target: 1, htvs: 1, docking: 1, admet: 1, security: 1 };

describe('팀 월 유지비 (균형안 §3.2)', () => {
  test('대학병원 + 표적 탐색실(등급 1) + 연구원 1명 = $0.050M, 등급 0 설비는 유지비 없음', () => {
    const u = teamUpkeep({ district: 'hospital', facilities: { ...NONE, target: 1 }, researchers: 1 });
    assert.equal(u.totalCents, M(0.05));
    assert.deepEqual(u.multipliers, {});
    assert.equal(teamUpkeep({ district: 'hospital', facilities: NONE, researchers: 1 }).facilityCents, 0);
  });

  test('네 연구실 + 보안 전체 가동 = $0.085M', () => {
    assert.equal(teamUpkeep({ district: 'hospital', facilities: FULL, researchers: 1 }).totalCents, FULL_LAB_MONTHLY_UPKEEP_CENTS);
  });

  test('등급 2(1단계 업그레이드)는 설비 유지비에 $0.005M 를 더한다', () => {
    const base = teamUpkeep({ district: 'hospital', facilities: { ...NONE, docking: 1 }, researchers: 0 });
    const up = teamUpkeep({ district: 'hospital', facilities: { ...NONE, docking: 2 }, researchers: 0 });
    assert.equal(up.facilityCents - base.facilityCents, M(0.005));
  });

  test('가동 중지 설비는 20%만 낸다(업그레이드분 포함)', () => {
    const idle = teamUpkeep({
      district: 'hospital',
      facilities: { ...NONE, target: 1, docking: 2 },
      facilityStates: { docking: 'idle' },
      researchers: 1,
    });
    assert.equal(idle.facilityCents, M(0.01) + Math.round(M(0.015) * 0.2));
  });

  test('이벤트 배율은 항목별로 반영되고 1 이 아닌 것만 보인다', () => {
    const u = teamUpkeep({
      district: 'vc',
      facilities: { ...NONE, target: 1 },
      researchers: 2,
      multipliers: { facility: 1.2, rent: 1, staff: 1.5 },
    });
    assert.equal(u.facilityCents, M(0.012));
    assert.equal(u.rentCents, M(0.03));
    assert.equal(u.staffCents, Math.round(M(0.04) * 1.3), '1.5 → 1.30 으로 잘린다');
    assert.deepEqual(u.multipliers, { facility: 1.2, staff: 1.3 });
  });
});

describe('하루 단위 정산 계획 (브리프 §4.3)', () => {
  const flat = (cents: number) => () => cents;

  test('30일 = 월 유지비 정확히(센트 오차 없음)', () => {
    const p = planUpkeep({ settledDay: 0, remainder: 0, toDay: 30, monthlyCentsForDay: flat(M(0.085)) });
    assert.equal(p.dueCents, M(0.085));
    assert.equal(p.remainder, 0);
    assert.equal(p.days, 30);
  });

  test('센트 미만은 누적된다 — 1000센트/월이면 하루 33센트 + 1/3, 사흘이면 100센트', () => {
    const d1 = planUpkeep({ settledDay: 0, remainder: 0, toDay: 1, monthlyCentsForDay: flat(1000) });
    assert.equal(d1.dueCents, 33);
    assert.ok(Math.abs(d1.remainder - 1 / 3) < 1e-12);
    const d2 = planUpkeep({ settledDay: 1, remainder: d1.remainder, toDay: 2, monthlyCentsForDay: flat(1000) });
    const d3 = planUpkeep({ settledDay: 2, remainder: d2.remainder, toDay: 3, monthlyCentsForDay: flat(1000) });
    assert.equal(d1.dueCents + d2.dueCents + d3.dueCents, 100);
    assert.equal(d3.remainder, 0);
  });

  test('나눠서 정산해도 한 번에 정산한 것과 같다(같은 날을 두 번 청구하지 않는다)', () => {
    const f = (d: number) => (d < 30 ? 1001 : 1207);
    const whole = planUpkeep({ settledDay: 0, remainder: 0, toDay: 75, monthlyCentsForDay: f });
    let settled = 0;
    let remainder = 0;
    let due = 0;
    for (const to of [3, 3, 17, 29, 30, 31, 60, 75]) {
      const p = planUpkeep({ settledDay: settled, remainder, toDay: to, monthlyCentsForDay: f });
      due += p.dueCents;
      remainder = p.remainder;
      settled = Math.max(settled, to);
    }
    assert.equal(due, whole.dueCents);
    assert.equal(remainder, whole.remainder);
  });

  test('날마다 배율이 다르면 그 날의 월 유지비로 — 30일 $0.050M + 30일 $0.052M', () => {
    const p = planUpkeep({ settledDay: 0, remainder: 0, toDay: 60, monthlyCentsForDay: (d) => (d < 30 ? M(0.05) : M(0.052)) });
    assert.equal(p.dueCents, M(0.102));
  });

  test('accrueUpkeep 와 같은 규칙(일정한 월 유지비)', () => {
    let ledger = EMPTY_UPKEEP_LEDGER;
    for (let i = 0; i < 47; i++) ledger = accrueUpkeep(ledger, 1234567, 1);
    const p = planUpkeep({ settledDay: 0, remainder: 0, toDay: 47, monthlyCentsForDay: flat(1234567) });
    assert.equal(p.dueCents, ledger.settledCents);
  });

  test('목표일이 정산일 이하면 청구 없음', () => {
    assert.deepEqual(planUpkeep({ settledDay: 10, remainder: 0.5, toDay: 10, monthlyCentsForDay: flat(999) }), {
      dueCents: 0,
      remainder: 0.5,
      days: 0,
    });
  });
});

describe('지불 · 미지급', () => {
  test('낼 수 있는 만큼 내고 나머지는 미지급 — 잔액은 음수가 되지 않는다', () => {
    assert.deepEqual(payUpkeep({ balanceCents: 100, unpaidCents: 7, dueCents: 150 }), {
      paidCents: 100,
      balanceAfter: 0,
      unpaidAfter: 57,
      shortfallCents: 50,
    });
    assert.deepEqual(payUpkeep({ balanceCents: 500, unpaidCents: 0, dueCents: 150 }), {
      paidCents: 150,
      balanceAfter: 350,
      unpaidAfter: 0,
      shortfallCents: 0,
    });
  });

  test('돈이 들어오면 미지급부터 — min(잔액, 미지급)', () => {
    assert.equal(arrearsPayment({ balanceCents: 1000, unpaidCents: 300 }), 300);
    assert.equal(arrearsPayment({ balanceCents: 200, unpaidCents: 300 }), 200);
    assert.equal(arrearsPayment({ balanceCents: 200, unpaidCents: 0 }), 0);
  });
});

describe('회생 유예 48시간 (균형안 §4)', () => {
  const monthly = M(0.085);
  const grace = { startedOperatingMs: 1000, adjustMinutes: 0 };

  test('유예 없음 + 미지급 → start, 미지급 없음 → none', () => {
    assert.equal(graceDecision({ unpaidCents: 1, balanceCents: 0, monthlyUpkeepCents: monthly, grace: null, operatingNowMs: 0 }), 'start');
    assert.equal(graceDecision({ unpaidCents: 0, balanceCents: 0, monthlyUpkeepCents: monthly, grace: null, operatingNowMs: 0 }), 'none');
  });

  test('47시간 59분은 continue, 48시간 정확히는 bankrupt', () => {
    const base = { unpaidCents: 10, balanceCents: 0, monthlyUpkeepCents: monthly, grace };
    assert.equal(graceDecision({ ...base, operatingNowMs: 1000 + H48 - MS_PER_MINUTE }), 'continue');
    assert.equal(graceDecision({ ...base, operatingNowMs: 1000 + H48 }), 'bankrupt');
  });

  test('회생 판정이 만료보다 먼저 — 미지급 0 이고 잔액 ≥ 월 유지비 × 3 이면 만료 뒤라도 recovered', () => {
    const late = 1000 + H48 + 5 * MS_PER_HOUR;
    assert.equal(graceDecision({ unpaidCents: 0, balanceCents: monthly * 3, monthlyUpkeepCents: monthly, grace, operatingNowMs: late }), 'recovered');
    assert.equal(
      graceDecision({ unpaidCents: 0, balanceCents: monthly * 3 - 1, monthlyUpkeepCents: monthly, grace, operatingNowMs: late }),
      'bankrupt',
    );
    assert.equal(
      graceDecision({ unpaidCents: 1, balanceCents: monthly * 10, monthlyUpkeepCents: monthly, grace, operatingNowMs: 1000 }),
      'continue',
      '미지급이 남아 있으면 회생이 아니다',
    );
  });

  test('일시정지 동안은 운영 시간이 늘지 않아 만료되지 않는다', () => {
    let clock: ClockState = initialClockState({ course: 'multiSession', nowMs: T0 });
    const step = (cmd: Parameters<typeof applyClockCommand>[1], at: number) => {
      const r = applyClockCommand(clock, cmd, at);
      assert.ok(r.ok);
      clock = r.state;
    };
    step({ action: 'resume' }, T0);
    const g = { startedOperatingMs: operatingMsAt(clock, T0), adjustMinutes: 0 };
    step({ action: 'pause' }, T0 + 10 * MS_PER_HOUR);
    const afterLongPause = T0 + 10 * MS_PER_HOUR + 7 * 24 * MS_PER_HOUR;
    const decide = (at: number) =>
      graceDecision({ unpaidCents: 5, balanceCents: 0, monthlyUpkeepCents: monthly, grace: g, operatingNowMs: operatingMsAt(clock, at) });
    assert.equal(decide(afterLongPause), 'continue', '현실 7일 일시정지 — 운영 시간 10시간');
    step({ action: 'resume' }, afterLongPause);
    assert.equal(decide(afterLongPause + 38 * MS_PER_HOUR - 1), 'continue');
    assert.equal(decide(afterLongPause + 38 * MS_PER_HOUR), 'bankrupt');
  });

  test('교사 조정 — 늘리면 만료가 밀리고, 총 길이는 0 미만이 될 수 없다', () => {
    const adj = applyGraceAdjust(0, 60);
    assert.ok(adj.ok);
    const g2 = { startedOperatingMs: 0, adjustMinutes: adj.adjustMinutes };
    const base = { unpaidCents: 10, balanceCents: 0, monthlyUpkeepCents: monthly, grace: g2 };
    assert.equal(graceDecision({ ...base, operatingNowMs: H48 }), 'continue');
    assert.equal(graceDecision({ ...base, operatingNowMs: H48 + MS_PER_HOUR }), 'bankrupt');
    assert.deepEqual(applyGraceAdjust(0, -2881), { ok: false, reason: 'negative_limit' });
    assert.deepEqual(applyGraceAdjust(-2000, -880), { ok: true, adjustMinutes: -2880 });
  });
});

describe('자금 상태 보기 (CashStatusView)', () => {
  test('§7.2 — 전체 가동 · 현금 0 · 완속으로 유예 48시간 → 미지급 ≈ $0.040M, 회생 필요액 ≈ $0.295M', () => {
    let clock = initialClockState({ course: 'multiSession', nowMs: T0 });
    const r = applyClockCommand(clock, { action: 'resume' }, T0);
    assert.ok(r.ok);
    clock = r.state;
    const now = T0 + H48;
    const toDay = Math.floor(gameDaysAt(clock, now) + 1e-9);
    assert.equal(toDay, 14, '현실 48시간 = 게임 14일');
    const monthly = teamUpkeep({ district: 'hospital', facilities: FULL, researchers: 1 }).totalCents;
    const plan = planUpkeep({ settledDay: 0, remainder: 0, toDay, monthlyCentsForDay: () => monthly });
    const pay = payUpkeep({ balanceCents: 0, unpaidCents: 0, dueCents: plan.dueCents });
    assert.ok(Math.abs(pay.unpaidAfter - M(0.04)) <= DISPLAY_TOLERANCE_CENTS, `미지급 ${pay.unpaidAfter}`);

    const view = cashStatusView({
      balanceCents: pay.balanceAfter,
      monthlyUpkeepCents: monthly,
      unpaidCents: pay.unpaidAfter,
      grace: { startedAtMs: T0, startedOperatingMs: 0, adjustMinutes: 0 },
      operatingNowMs: operatingMsAt(clock, now),
      paused: false,
      asOfMs: now,
    });
    assert.equal(view.level, 'grace');
    assert.equal(view.frameKey, 'ui/hud-cash-grace');
    assert.ok(view.grace);
    assert.ok(Math.abs(view.grace.recoveryRequiredCents - M(0.295)) <= DISPLAY_TOLERANCE_CENTS, `필요액 ${view.grace.recoveryRequiredCents}`);
    assert.equal(view.grace.recoveryRequiredCents, pay.unpaidAfter + monthly * 3);
    assert.equal(view.grace.shortfallCents, view.grace.recoveryRequiredCents);
    assert.equal(view.grace.remainingMs, 0);
    assert.equal(view.grace.limitMinutes, 2880);
    assert.deepEqual(view.blocked, ['paidWork', 'facilityPurchase', 'hiring']);
  });

  test('일시정지면 counting = false · 남은 시간은 운영 시간 기준', () => {
    const view = cashStatusView({
      balanceCents: 100,
      monthlyUpkeepCents: M(0.05),
      unpaidCents: 10,
      grace: { startedAtMs: T0, startedOperatingMs: 0, adjustMinutes: 30 },
      operatingNowMs: 10 * MS_PER_HOUR,
      paused: true,
      asOfMs: T0,
    });
    assert.equal(view.grace?.counting, false);
    assert.equal(view.grace?.remainingMs, (2880 + 30) * MS_PER_MINUTE - 10 * MS_PER_HOUR);
  });

  test('단계 판정 — 평시 · 주의 · 위기 · 구조조정, 유지비 0 이면 runway null', () => {
    const v = (balance: number, unpaid = 0) =>
      cashStatusView({ balanceCents: balance, monthlyUpkeepCents: 100, unpaidCents: unpaid, grace: null, operatingNowMs: 0, paused: false, asOfMs: 0 });
    assert.equal(v(600).level, 'normal');
    assert.equal(v(599).level, 'notice');
    assert.equal(v(299).level, 'crisis');
    assert.equal(v(99).level, 'restructure');
    assert.equal(v(10_000, 1).level, 'restructure');
    assert.deepEqual(v(299).blocked, []);
    assert.equal(v(600).runwayGameMonths, 6);
    const zero = cashStatusView({ balanceCents: 0, monthlyUpkeepCents: 0, unpaidCents: 0, grace: null, operatingNowMs: 0, paused: false, asOfMs: 0 });
    assert.equal(zero.runwayGameMonths, null);
    assert.equal(zero.level, 'normal');
  });
});

describe('투자 · 매각 · 재창업', () => {
  test('Series A $3.000M · B $5.000M, VC 지구 +15%', () => {
    assert.equal(investmentCents('seriesA', 'hospital'), M(3));
    assert.equal(investmentCents('seriesB', 'compute'), M(5));
    assert.equal(investmentCents('seriesA', 'vc'), M(3.45));
    assert.equal(investmentCents('seriesB', 'vc'), M(5.75));
  });

  test('매각 회수 = 낸 설치 · 업그레이드 비용의 50%, 시드 설비(0)는 0', () => {
    assert.equal(facilitySaleCents(M(0.7) + M(0.25)), M(0.475));
    assert.equal(facilitySaleCents(0), 0);
  });

  test('재창업 지원금은 계보의 첫 재창업만 $2.500M', () => {
    assert.equal(refoundGrantCents(1), M(2.5));
    assert.equal(refoundGrantCents(2), 0);
    assert.equal(refoundGrantCents(3), 0);
    assert.equal(refoundGrantCents(0), 0);
    assert.equal(refoundTeamId('team-1', 2), 'team-1-r2');
  });
});
