/**
 * 학급 시계(M3) — 균형안 §2 · 브리프 §4.2. 배율 전환(소급 없음) · 일시정지 · 오프라인 경과 · 명령 검증 · 되짚기.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MAX_FIXED_GAME_DAYS_PER_REAL_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  applyClockCommand,
  clockViewOf,
  foldClock,
  gameDateOf,
  gameDaysAt,
  initialClockState,
  locateGameDay,
  operatingMsAt,
  phaseAt,
  rateAt,
  settleSessionEnd,
  type ClockCommand,
  type ClockState,
} from '../src/index.ts';

const T0 = Date.UTC(2026, 9, 21, 0, 0, 0);
const DAY_MS = 24 * MS_PER_HOUR;
const EPS = 1e-9;

function apply(state: ClockState, cmd: ClockCommand, nowMs: number): ClockState {
  const r = applyClockCommand(state, cmd, nowMs);
  assert.ok(r.ok, `명령 ${cmd.action} 이 거절됐다`);
  return r.state;
}

function near(actual: number, expected: number, msg?: string, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg ?? ''} 기대 ${expected}, 실제 ${actual}`);
}
/** ms 값 비교 — 1ms 미만 부동소수 오차는 같은 값으로 본다. */
function nearMs(actual: number, expected: number, msg?: string) {
  near(actual, expected, msg, 0.01);
}

describe('배율 (균형안 §2)', () => {
  test('여러 차시 수업 중 7.2 · 장기 수업 중 1.8 · 수업 밖 7/1440 게임 일/분', () => {
    const multi = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    near(rateAt(multi, T0), 7.2);
    near(gameDaysAt(multi, T0 + 50 * MS_PER_MINUTE), 360, '50분 = 12게임 월');
    const long = apply(initialClockState({ course: 'longTerm', nowMs: T0 }), { action: 'startSession' }, T0);
    near(rateAt(long, T0), 1.8);
    near(gameDaysAt(long, T0 + 50 * MS_PER_MINUTE), 90, '50분 = 3게임 월');
    const ooc = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'resume' }, T0);
    near(rateAt(ooc, T0), 7 / 1440);
    near(gameDaysAt(ooc, T0 + DAY_MS), 7, '현실 24시간 = 7게임 일');
  });

  test('고정 모드는 fixed/1440 이고 수업 세션 중에도 구간은 inClass, 배율은 같다', () => {
    let s = initialClockState({ course: 'multiSession', nowMs: T0, mode: 'fixed', fixedGameDaysPerRealDay: 14 });
    s = apply(s, { action: 'startSession' }, T0);
    assert.equal(phaseAt(s, T0 + MS_PER_MINUTE), 'inClass');
    near(rateAt(s, T0 + MS_PER_MINUTE), 14 / 1440);
  });

  test('고정 배율 상한 = 가장 빠른 문서 배율 7.2 × 1440 = 10,368', () => {
    assert.equal(MAX_FIXED_GAME_DAYS_PER_REAL_DAY, 10368);
  });
});

describe('배율 전환 — 바뀌기 전 구간을 먼저 접고 소급하지 않는다', () => {
  test('수업 10분 뒤 고정 모드로 바꾸면 앞 10분은 7.2 배율, 그 뒤만 새 배율', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const t1 = T0 + 10 * MS_PER_MINUTE;
    s = apply(s, { action: 'setMode', mode: 'fixed', fixedGameDaysPerRealDay: 7 }, t1);
    near(s.anchorGameDays, 72, '앞 10분 = 72게임 일');
    assert.equal(s.anchorAtMs, t1);
    near(gameDaysAt(s, t1 + 40 * MS_PER_MINUTE), 72 + (7 / 1440) * 40, '그 뒤 40분은 고정 배율');
  });

  test('수동 종료하면 그 시각부터 완속 — 앞 구간은 그대로', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const t1 = T0 + 20 * MS_PER_MINUTE;
    s = apply(s, { action: 'endSession' }, t1);
    assert.equal(s.session, null);
    near(gameDaysAt(s, t1), 144);
    near(gameDaysAt(s, t1 + DAY_MS), 151);
  });

  test('접기는 결과를 바꾸지 않는다 — 언제 접어도 같은 게임 일', () => {
    const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const tEnd = T0 + 50 * MS_PER_MINUTE + 3 * DAY_MS;
    const direct = gameDaysAt(s, tEnd);
    let folded = s;
    for (let t = T0; t <= tEnd; t += 7 * MS_PER_MINUTE + 13) folded = settleSessionEnd(foldClock(folded, t), t).state;
    assert.ok(Math.abs(gameDaysAt(folded, tEnd) - direct) < 1e-6);
    near(direct, 360 + 21);
  });
});

describe('일시정지 — 게임 일과 운영 시간이 함께 멈춘다', () => {
  test('일시정지 동안 게임 일 · 운영 시간이 늘지 않고, 재개하면 거기서 이어진다', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'resume' }, T0);
    const t1 = T0 + DAY_MS;
    s = apply(s, { action: 'pause' }, t1);
    near(gameDaysAt(s, t1), 7);
    const t2 = t1 + 10 * DAY_MS;
    near(gameDaysAt(s, t2), 7, '일시정지 10일 — 그대로');
    assert.equal(operatingMsAt(s, t2), DAY_MS);
    assert.equal(rateAt(s, t2), 0);
    s = apply(s, { action: 'resume' }, t2);
    near(gameDaysAt(s, t2 + DAY_MS), 14);
    assert.equal(operatingMsAt(s, t2 + DAY_MS), 2 * DAY_MS);
  });

  test('새 학급은 일시정지로 시작한다', () => {
    const s = initialClockState({ course: 'longTerm', nowMs: T0 });
    assert.equal(s.paused, true);
    assert.equal(gameDaysAt(s, T0 + 100 * DAY_MS), 0);
  });

  test('이미 그 상태인 pause · resume 은 changed:false', () => {
    const s = initialClockState({ course: 'multiSession', nowMs: T0 });
    const r = applyClockCommand(s, { action: 'pause' }, T0 + 1);
    assert.ok(r.ok && !r.changed);
  });
});

describe('예정 종료 시각을 넘긴 오프라인 경과 (서버가 내려가 있던 경우)', () => {
  test('50분 수업 시작 뒤 서버가 하루 내려가 있었다 — 종료 시각에서 끊어 수업 밖으로 계산', () => {
    const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const endsAt = T0 + 50 * MS_PER_MINUTE;
    const now = endsAt + DAY_MS;
    near(gameDaysAt(s, now), 367, '360 + 7');
    assert.equal(phaseAt(s, now), 'outOfClass');
    assert.equal(operatingMsAt(s, now), 50 * MS_PER_MINUTE + DAY_MS);

    const settled = settleSessionEnd(s, now);
    assert.equal(settled.ended, true);
    assert.equal(settled.endedAtMs, endsAt);
    assert.equal(settled.state.session, null);
    assert.equal(settled.state.anchorAtMs, endsAt);
    near(settled.state.anchorGameDays, 360);
    near(gameDaysAt(settled.state, now), 367, '접은 뒤에도 같은 값');
  });

  test('종료 시각 전이면 settleSessionEnd 는 아무것도 하지 않는다', () => {
    const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const r = settleSessionEnd(s, T0 + 49 * MS_PER_MINUTE);
    assert.equal(r.ended, false);
    assert.equal(r.state, s);
  });

  test('일시정지 중 예정 종료 시각이 지나도 게임 일은 늘지 않고 수업은 끝난다', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    s = apply(s, { action: 'pause' }, T0 + 10 * MS_PER_MINUTE);
    const now = T0 + 5 * DAY_MS;
    near(gameDaysAt(s, now), 72);
    const r = applyClockCommand(s, { action: 'resume' }, now);
    assert.ok(r.ok);
    assert.equal(r.state.session, null, '예정 종료가 지나 수업 밖');
    near(gameDaysAt(r.state, now + DAY_MS), 79);
  });
});

describe('수업 명령', () => {
  test('startSession — 일시정지면 재개도 하고, 번호가 1씩 는다. 이미 수업 중이면 무시', () => {
    const s0 = initialClockState({ course: 'multiSession', nowMs: T0, sessionMinutes: 45 });
    const r1 = applyClockCommand(s0, { action: 'startSession' }, T0);
    assert.ok(r1.ok && r1.changed);
    assert.equal(r1.state.paused, false);
    assert.deepEqual(r1.state.session, { seq: 1, startedAtMs: T0, endsAtMs: T0 + 45 * MS_PER_MINUTE });
    const r2 = applyClockCommand(r1.state, { action: 'startSession', minutes: 30 }, T0 + MS_PER_MINUTE);
    assert.ok(r2.ok && !r2.changed);
    assert.equal(r2.state.session?.seq, 1);
    // 끝난 뒤 다시 시작하면 2번
    const r3 = applyClockCommand(r2.state, { action: 'startSession', minutes: 30 }, T0 + 2 * DAY_MS);
    assert.ok(r3.ok && r3.changed);
    assert.equal(r3.state.session?.seq, 2);
    assert.equal(r3.state.lastSessionSeq, 2);
  });

  test('45분 수업은 같은 분당 배율로 45분만 진행한다', () => {
    const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession', minutes: 45 }, T0);
    near(gameDaysAt(s, T0 + 45 * MS_PER_MINUTE), 324);
    near(gameDaysAt(s, T0 + 50 * MS_PER_MINUTE), 324 + (7 / 1440) * 5);
  });

  test('extendSession — 수업 중에만, 1~120분', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    s = apply(s, { action: 'extendSession', minutes: 10 }, T0 + MS_PER_MINUTE);
    assert.equal(s.session?.endsAtMs, T0 + 60 * MS_PER_MINUTE);
    assert.deepEqual(applyClockCommand(s, { action: 'extendSession', minutes: 0 }, T0), { ok: false, reason: 'invalid_minutes' });
    assert.deepEqual(applyClockCommand(s, { action: 'extendSession', minutes: 121 }, T0), { ok: false, reason: 'invalid_minutes' });
    const ended = apply(s, { action: 'endSession' }, T0 + 2 * MS_PER_MINUTE);
    assert.deepEqual(applyClockCommand(ended, { action: 'extendSession', minutes: 5 }, T0 + 3 * MS_PER_MINUTE), {
      ok: false,
      reason: 'no_session',
    });
  });

  test('setMode 검증 — 고정 배율 0 초과 · 상한 이하, 수업 길이 1~600', () => {
    const s = initialClockState({ course: 'multiSession', nowMs: T0 });
    const bad = (cmd: ClockCommand, reason: string) => assert.deepEqual(applyClockCommand(s, cmd, T0), { ok: false, reason });
    bad({ action: 'setMode', mode: 'fixed', fixedGameDaysPerRealDay: 0 }, 'invalid_fixed_rate');
    bad({ action: 'setMode', mode: 'fixed', fixedGameDaysPerRealDay: 10368.01 }, 'invalid_fixed_rate');
    bad({ action: 'setMode', mode: 'fixed', sessionMinutes: 601 }, 'invalid_session_minutes');
    bad({ action: 'setMode', mode: 'weird' as 'fixed' }, 'invalid_mode');
    const ok = applyClockCommand(s, { action: 'setMode', mode: 'fixed', fixedGameDaysPerRealDay: 10368, sessionMinutes: 600 }, T0);
    assert.ok(ok.ok && ok.changed);
    const same = applyClockCommand(s, { action: 'setMode', mode: 'variable' }, T0);
    assert.ok(same.ok && !same.changed);
    bad({ action: 'startSession', minutes: 601 }, 'invalid_minutes');
  });
});

describe('locateGameDay — 게임 일 → 도달 시각 · 구간 · 운영 시간 · 세션', () => {
  const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
  const endsAt = T0 + 50 * MS_PER_MINUTE;
  const now = endsAt + 30 * DAY_MS;

  test('수업 중 구간의 경계', () => {
    const at = locateGameDay(s, 30, now);
    assert.ok(at);
    nearMs(at.atMs, T0 + (30 / 7.2) * MS_PER_MINUTE);
    assert.equal(at.phase, 'inClass');
    assert.equal(at.sessionSeq, 1);
    nearMs(at.operatingMs, (30 / 7.2) * MS_PER_MINUTE);
    near(gameDaysAt(s, at.atMs), 30, '역산 정확도');
  });

  test('예정 종료 시각에 정확히 닿는 경계는 수업 중으로 센다', () => {
    const at = locateGameDay(s, 360, now);
    assert.ok(at);
    nearMs(at.atMs, endsAt);
    assert.equal(at.phase, 'inClass');
  });

  test('수업 밖 구간의 경계', () => {
    const at = locateGameDay(s, 390, now);
    assert.ok(at);
    nearMs(at.atMs, endsAt + (30 / 7) * DAY_MS);
    assert.equal(at.phase, 'outOfClass');
    assert.equal(at.sessionSeq, null);
    nearMs(at.operatingMs, 50 * MS_PER_MINUTE + (30 / 7) * DAY_MS);
    near(gameDaysAt(s, at.atMs), 390, '역산 정확도');
  });

  test('아직 도달하지 않았으면 null · 일시정지면 null', () => {
    assert.equal(locateGameDay(s, 600, now), null);
    const paused = apply(s, { action: 'pause' }, T0 + MS_PER_MINUTE);
    assert.equal(locateGameDay(paused, 7.3, now), null);
  });

  test('앵커 이전 게임 일은 앵커 시점 정보', () => {
    const folded = foldClock(s, T0 + 10 * MS_PER_MINUTE);
    const at = locateGameDay(folded, 30, now);
    assert.ok(at);
    assert.equal(at.atMs, folded.anchorAtMs);
    assert.equal(at.phase, 'inClass');
    assert.equal(at.sessionSeq, 1);
    assert.equal(at.operatingMs, 10 * MS_PER_MINUTE);
  });
});

describe('게임 날짜 · ClockView', () => {
  test('1년 = 12개월 · 1개월 = 30일, 모두 1부터', () => {
    assert.deepEqual(gameDateOf(0), { year: 1, month: 1, day: 1, monthIndex: 0, dayIndex: 0 });
    assert.deepEqual(gameDateOf(29.99), { year: 1, month: 1, day: 30, monthIndex: 0, dayIndex: 29 });
    assert.deepEqual(gameDateOf(30), { year: 1, month: 2, day: 1, monthIndex: 1, dayIndex: 30 });
    assert.deepEqual(gameDateOf(360), { year: 2, month: 1, day: 1, monthIndex: 12, dayIndex: 360 });
  });

  test('수업 중 ClockView — 배율 · 다음 변경 시각 · 월 끝까지 남은 일', () => {
    const s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    const now = T0 + 5 * MS_PER_MINUTE;
    const v = clockViewOf(s, 'class-x', now, 'balance-v0');
    near(v.gameDays, 36);
    assert.equal(v.phase, 'inClass');
    near(v.gameDaysPerRealMinute, 7.2);
    assert.deepEqual(v.date, { year: 1, month: 2, day: 7 });
    near(v.daysToMonthEnd, 24);
    assert.equal(v.nextChangeAtMs, T0 + 50 * MS_PER_MINUTE);
    assert.equal(v.session?.minutes, 50);
    assert.equal(v.classId, 'class-x');
    assert.equal(v.economyVersion, 'balance-v0');
  });

  test('일시정지면 배율 0 · 다음 변경 없음, 예정 종료가 지났으면 수업 밖으로 보인다', () => {
    let s = apply(initialClockState({ course: 'multiSession', nowMs: T0 }), { action: 'startSession' }, T0);
    s = apply(s, { action: 'pause' }, T0 + MS_PER_MINUTE);
    const v = clockViewOf(s, 'c', T0 + 2 * MS_PER_MINUTE, 'balance-v0');
    assert.equal(v.gameDaysPerRealMinute, 0);
    assert.equal(v.nextChangeAtMs, null);
    assert.ok(v.session !== null);
    const later = clockViewOf(s, 'c', T0 + DAY_MS, 'balance-v0');
    assert.equal(later.session, null);
    assert.equal(later.phase, 'outOfClass');
    assert.ok(Math.abs(later.gameDays - 7.2) < EPS);
  });
});
