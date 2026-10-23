/**
 * 자동 · 교사 이벤트(M3) — 균형안 §5 · 브리프 §4.5. 카탈로그 `assets/data/macro-events.json` 은 읽기만 한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  EMPTY_AUTO_EVENT_COUNTERS,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  activeEffectsAt,
  applyClockCommand,
  autoEventInstance,
  costMultipliersAt,
  demandMultiplierAt,
  eventCashCents,
  eventRandom,
  gameDaysAt,
  gmEventOptions,
  implementedEventIds,
  implementedEvents,
  initialClockState,
  isRuleImplemented,
  locateGameDay,
  millionsToCents,
  parseMacroEventCatalog,
  planUpkeep,
  processMonthBoundary,
  ruleSummary,
  teacherEventInstance,
  teamUpkeep,
  type AutoEventCounters,
  type ClockState,
  type EventInstance,
  type MacroEventEntry,
} from '../src/index.ts';

const catalog = parseMacroEventCatalog(
  JSON.parse(readFileSync(fileURLToPath(new URL('../../../assets/data/macro-events.json', import.meta.url)), 'utf8')),
);
const byId = (id: string): MacroEventEntry => {
  const e = catalog.events.find((x) => x.id === id);
  assert.ok(e, id);
  return e;
};
const M = millionsToCents;
const T0 = Date.UTC(2026, 9, 21);
const DAY_MS = 24 * MS_PER_HOUR;

describe('구현된 사건 (M3 브리프 §4.5 + M4 시장 수요 + M5 임상 · 심사 — M5 브리프 §5.1)', () => {
  test('cash · upkeep · researchCost(docking 포함) · marketDemand · clinicalCost · reviewCost — 정확히 11건(카탈로그 순서, M5 에서 trial-recruit · regulation 추가)', () => {
    const ids = implementedEventIds(catalog);
    assert.equal(ids.length, 11);
    for (const id of ['gov-grant', 'demand-up', 'open-data', 'consortium', 'power-cut', 'opex-up', 'rent-up', 'talent-war', 'risk-off', 'trial-recruit', 'regulation']) {
      assert.ok(ids.includes(id), id);
    }
    assert.deepEqual(ids, catalog.events.filter((e) => e.id !== 'supply-shock').map((e) => e.id), '카탈로그 순서 그대로, supply-shock 만 빠진다');
  });

  test('합성 · ADMET 만 건드리는 연구비 사건만 구현되지 않음 — 임상 · 심사 사건은 M5 에서 구현됨', () => {
    assert.equal(isRuleImplemented(byId('supply-shock').rule), false);
    for (const id of ['trial-recruit', 'regulation', 'demand-up', 'risk-off']) assert.equal(isRuleImplemented(byId(id).rule), true, id);
  });

  test('교사 선택지 — 12건 모두, implemented 11건(M5: 임상 · 심사 2건 추가), 규칙 요약', () => {
    const options = gmEventOptions(catalog);
    assert.equal(options.length, 12);
    assert.equal(options.filter((o) => o.implemented).length, 11);
    assert.equal(ruleSummary(byId('demand-up').rule), 'marketDemand ×1.15 · 3게임 월');
    assert.equal(ruleSummary(byId('opex-up').rule), 'upkeep facility ×1.20 · 3게임 월');
    assert.equal(ruleSummary(byId('gov-grant').rule), 'cash +$0.250M · 1회');
    assert.equal(ruleSummary(byId('open-data').rule), 'researchCost htvs·docking ×0.85 · 3게임 월');
    assert.equal(ruleSummary(byId('trial-recruit').rule), 'clinicalCost ×0.85 · 3게임 월');
    assert.equal(ruleSummary(byId('regulation').rule), 'reviewCost 비용 ×1.10 · 기간 ×1.25 · 3게임 월');
    assert.equal(eventCashCents(byId('gov-grant').rule), M(0.25));
  });
});

describe('임상 · 심사 배율 (M5 — 균형안 §10.1 · §5: 같은 eventId 한 번 · 항목마다 0.70~1.30)', () => {
  const recruit = autoEventInstance({ classId: 'c1', monthIndex: 1, event: byId('trial-recruit') });
  const reg = autoEventInstance({ classId: 'c1', monthIndex: 1, event: byId('regulation') });

  test('적용 기간 동안만 — 임상 ×0.85 · 심사 비용 ×1.10 · 심사 기간 ×1.25, 다른 항목은 1', () => {
    const m = costMultipliersAt([recruit, reg], 'team-1', 40);
    assert.equal(m.clinical, 0.85);
    assert.equal(m.review, 1.1);
    assert.equal(m.reviewDuration, 1.25);
    assert.deepEqual(m.upkeep, { facility: 1, rent: 1, staff: 1 });
    assert.deepEqual(m.research, { htvs: 1, docking: 1, admet: 1 });
    const before = costMultipliersAt([recruit, reg], 'team-1', 29);
    assert.deepEqual([before.clinical, before.review, before.reviewDuration], [1, 1, 1], '시작 전');
    const after = costMultipliersAt([recruit, reg], 'team-1', 120);
    assert.deepEqual([after.clinical, after.review, after.reviewDuration], [1, 1, 1], '90게임 일 뒤 끝(배타)');
  });

  test('같은 eventId 가 겹쳐도 한 번만(0.7225 · 1.21 아님)', () => {
    const again = teacherEventInstance({ classId: 'c1', requestId: 'r7', event: byId('trial-recruit'), targets: 'all', nowGameDays: 50 });
    const regAgain = teacherEventInstance({ classId: 'c1', requestId: 'r8', event: byId('regulation'), targets: 'all', nowGameDays: 50 });
    const m = costMultipliersAt([recruit, again, reg, regAgain], 'team-1', 60);
    assert.equal(m.clinical, 0.85);
    assert.equal(m.review, 1.1);
    assert.equal(m.reviewDuration, 1.25);
  });

  test('서로 다른 사건은 곱하고 항목마다 0.70~1.30 으로 자른다', () => {
    const synthClinical: EventInstance = { ...recruit, instanceId: 'x1', eventId: 'synthetic-clinical', rule: { kind: 'clinicalCost', mult: 0.8, months: 3 } };
    const synthReview: EventInstance = { ...reg, instanceId: 'x2', eventId: 'synthetic-review', rule: { kind: 'reviewCost', mult: 1.2, durationMult: 1.2, months: 3 } };
    const m = costMultipliersAt([recruit, synthClinical, reg, synthReview], 'team-1', 40);
    assert.equal(m.clinical, 0.7, '0.85 × 0.80 = 0.68 → 0.70');
    assert.equal(m.review, 1.3, '1.10 × 1.20 = 1.32 → 1.30');
    assert.equal(m.reviewDuration, 1.3, '1.25 × 1.20 = 1.50 → 1.30');
  });

  test('대상 회사만', () => {
    const only2 = teacherEventInstance({ classId: 'c1', requestId: 'r11', event: byId('regulation'), targets: ['team-2'], nowGameDays: 0 });
    assert.equal(costMultipliersAt([only2], 'team-1', 1).review, 1);
    assert.equal(costMultipliersAt([only2], 'team-2', 1).review, 1.1);
  });
});

describe('결정적 난수', () => {
  test('같은 시드 · 같은 월 → 같은 수열, 월이 다르면 다른 수열', () => {
    const a = eventRandom(123456789, 7);
    const b = eventRandom(123456789, 7);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    assert.deepEqual(seqA, seqB);
    for (const x of seqA) assert.ok(x >= 0 && x < 1);
    const c = eventRandom(123456789, 8);
    assert.notDeepEqual(Array.from({ length: 8 }, () => c()), seqA);
    const d = eventRandom('123456789', 7);
    assert.equal(d(), seqA[0], '숫자 · 문자열 시드는 같은 값');
  });

  test('같은 시드면 월 경계 처리 결과가 같다', () => {
    const pool = implementedEvents(catalog);
    const run = (seed: number) =>
      Array.from({ length: 40 }, (_, k) =>
        processMonthBoundary({ monthIndex: k + 1, phase: 'outOfClass', operatingMs: 0, sessionSeq: null, counters: EMPTY_AUTO_EVENT_COUNTERS, seed, pool }),
      ).map((r) => `${r.reason}:${r.event?.id ?? ''}`);
    assert.deepEqual(run(42), run(42));
  });
});

describe('월 경계 1회 처리 — 상한', () => {
  const pool = implementedEvents(catalog);
  const base = { seed: 1, pool, operatingMs: 100 * MS_PER_HOUR };

  test('최소 간격 2게임 월 — 바로 다음 달은 건너뜀', () => {
    const counters: AutoEventCounters = { ...EMPTY_AUTO_EVENT_COUNTERS, lastAutoEventMonth: 5 };
    const r = processMonthBoundary({ ...base, monthIndex: 6, phase: 'outOfClass', sessionSeq: null, counters });
    assert.equal(r.reason, 'minInterval');
    assert.equal(r.counters, counters);
  });

  test('수업 중 — 같은 세션에서 이미 2개면 sessionCap, 다른 세션이면 다시 셈', () => {
    const counters: AutoEventCounters = { ...EMPTY_AUTO_EVENT_COUNTERS, lastAutoEventMonth: 1, autoEventSessionSeq: 3, autoEventsInSession: 2 };
    assert.equal(processMonthBoundary({ ...base, monthIndex: 9, phase: 'inClass', sessionSeq: 3, counters }).reason, 'sessionCap');
    assert.notEqual(processMonthBoundary({ ...base, monthIndex: 9, phase: 'inClass', sessionSeq: 4, counters }).reason, 'sessionCap');
  });

  test('수업 밖 — 마지막 수업 밖 자동 이벤트 이후 72운영시간 미만이면 outOfClassCap', () => {
    const last = 100 * MS_PER_HOUR;
    const counters: AutoEventCounters = { ...EMPTY_AUTO_EVENT_COUNTERS, lastAutoEventMonth: 1, lastOocAutoEventOperatingMs: last };
    const at = (h: number) =>
      processMonthBoundary({ ...base, monthIndex: 9, phase: 'outOfClass', sessionSeq: null, counters, operatingMs: last + h * MS_PER_HOUR }).reason;
    assert.equal(at(71.9), 'outOfClassCap');
    assert.notEqual(at(72), 'outOfClassCap');
  });

  test('당첨이면 카운터를 갱신한다', () => {
    // 당첨되는 시드를 찾는다(15%).
    let hit: ReturnType<typeof processMonthBoundary> | null = null;
    for (let seed = 0; seed < 500 && hit === null; seed++) {
      const r = processMonthBoundary({ seed, pool, monthIndex: 4, phase: 'inClass', sessionSeq: 2, operatingMs: 5, counters: EMPTY_AUTO_EVENT_COUNTERS });
      if (r.drawn) hit = r;
    }
    assert.ok(hit?.event);
    assert.ok(pool.includes(hit.event));
    assert.deepEqual(hit.counters, { lastAutoEventMonth: 4, autoEventSessionSeq: 2, autoEventsInSession: 1, lastOocAutoEventOperatingMs: null });
  });

  test('재시작 뒤 경계 여러 개를 한꺼번에 처리해도 상한을 지킨다(시드 300개)', () => {
    // 50분 수업 시작 직후 서버가 내려가 30일 뒤 올라왔다 — 경계 1~12 는 수업 중(세션 1), 13~19 는 수업 밖.
    let clock: ClockState = initialClockState({ course: 'multiSession', nowMs: T0 });
    const r = applyClockCommand(clock, { action: 'startSession' }, T0);
    assert.ok(r.ok);
    clock = r.state;
    const now = T0 + 50 * MS_PER_MINUTE + 30 * DAY_MS;
    const lastMonth = Math.floor(gameDaysAt(clock, now) / 30);
    assert.equal(lastMonth, 19);

    let sawTwoInSession = false;
    let sawOoc = false;
    for (let seed = 0; seed < 300; seed++) {
      let counters = EMPTY_AUTO_EVENT_COUNTERS;
      const drawn: Array<{ k: number; phase: string; op: number; seq: number | null }> = [];
      for (let k = 1; k <= lastMonth; k++) {
        const at = locateGameDay(clock, k * 30, now);
        assert.ok(at, `경계 ${k}`);
        assert.equal(at.phase, k <= 12 ? 'inClass' : 'outOfClass');
        const res = processMonthBoundary({ monthIndex: k, phase: at.phase, operatingMs: at.operatingMs, sessionSeq: at.sessionSeq, counters, seed, pool });
        counters = res.counters;
        if (res.drawn) drawn.push({ k, phase: at.phase, op: at.operatingMs, seq: at.sessionSeq });
      }
      const inClass = drawn.filter((d) => d.phase === 'inClass');
      assert.ok(inClass.length <= 2, `seed ${seed}: 수업당 ${inClass.length}개`);
      if (inClass.length === 2) sawTwoInSession = true;
      for (let i = 1; i < drawn.length; i++) assert.ok(drawn[i]!.k - drawn[i - 1]!.k >= 2, `seed ${seed}: 최소 간격`);
      const ooc = drawn.filter((d) => d.phase === 'outOfClass');
      if (ooc.length > 0) sawOoc = true;
      for (let i = 1; i < ooc.length; i++) assert.ok(ooc[i]!.op - ooc[i - 1]!.op >= 72 * MS_PER_HOUR, `seed ${seed}: 72시간`);
    }
    assert.ok(sawTwoInSession, '어떤 시드에서는 수업 중 2개가 나와야 상한 검사가 의미 있다');
    assert.ok(sawOoc);
  });
});

describe('효과 적용 — 같은 eventId 한 번 · 총배율 0.70~1.30', () => {
  const opexAuto = autoEventInstance({ classId: 'c1', monthIndex: 0, event: byId('opex-up') });
  const opexTeacher = teacherEventInstance({ classId: 'c1', requestId: 'r1', event: byId('opex-up'), targets: 'all', nowGameDays: 60 });

  test('발생 기록 id · 기간 규칙', () => {
    const auto = autoEventInstance({ classId: 'c1', monthIndex: 4, event: byId('rent-up') });
    assert.equal(auto.instanceId, 'auto:c1:m4');
    assert.equal(auto.startDay, 120);
    assert.equal(auto.endDay, 210);
    assert.equal(auto.targets, 'all');
    assert.equal(opexTeacher.instanceId, 'gm:c1:r1');
    assert.equal(opexTeacher.origin, 'teacher');
    assert.equal(opexTeacher.endDay, 150);
    const cash = autoEventInstance({ classId: 'c1', monthIndex: 2, event: byId('gov-grant') });
    assert.equal(cash.endDay, null);
  });

  test('같은 eventId 가 겹치면 합산하지 않고 기간만 늘어난다', () => {
    const list = [opexAuto, opexTeacher];
    assert.equal(costMultipliersAt(list, 'team-1', 70).upkeep.facility, 1.2, '겹친 구간도 1.2(1.44 아님)');
    assert.equal(costMultipliersAt(list, 'team-1', 100).upkeep.facility, 1.2, '늘어난 기간');
    assert.equal(costMultipliersAt(list, 'team-1', 150).upkeep.facility, 1, '끝(배타)');
    const effects = activeEffectsAt(list, 'team-1', 70);
    assert.equal(effects.length, 1);
    assert.equal(effects[0]!.instanceId, 'gm:c1:r1', '가장 늦게 끝나는 것');
    assert.equal(effects[0]!.endDay, 150);
    assert.deepEqual(effects[0]!.scope, ['facility']);
    assert.equal(effects[0]!.mult, 1.2);
  });

  test('서로 다른 비용 효과의 총배율은 0.70~1.30 으로 자른다', () => {
    const open = autoEventInstance({ classId: 'c1', monthIndex: 0, event: byId('open-data') });
    const consortium = autoEventInstance({ classId: 'c1', monthIndex: 2, event: byId('consortium') });
    const m = costMultipliersAt([open, consortium], 'team-1', 65);
    assert.equal(m.research.docking, 0.7, '0.85 × 0.80 = 0.68 → 0.70');
    assert.equal(m.research.htvs, 0.85);
    assert.equal(m.research.admet, 1);
    const synthetic: EventInstance = { ...opexAuto, instanceId: 'x', eventId: 'synthetic-up', rule: { kind: 'upkeep', scope: ['facility'], mult: 1.25, months: 3 } };
    assert.equal(costMultipliersAt([opexAuto, synthetic], 'team-1', 10).upkeep.facility, 1.3, '1.2 × 1.25 = 1.5 → 1.30');
  });

  test('대상 팀만 · cash 는 배율이 아니다', () => {
    const only2 = teacherEventInstance({ classId: 'c1', requestId: 'r2', event: byId('talent-war'), targets: ['team-2'], nowGameDays: 0 });
    assert.equal(costMultipliersAt([only2], 'team-1', 1).upkeep.staff, 1);
    assert.equal(costMultipliersAt([only2], 'team-2', 1).upkeep.staff, 1.15);
    assert.equal(activeEffectsAt([only2], 'team-1', 1).length, 0);
    assert.equal(activeEffectsAt([only2], null, 1).length, 1, '학급 전체 보기');
    const cash = autoEventInstance({ classId: 'c1', monthIndex: 0, event: byId('gov-grant') });
    assert.deepEqual(costMultipliersAt([cash], 'team-1', 0).upkeep, { facility: 1, rent: 1, staff: 1 });
    assert.equal(activeEffectsAt([cash], 'team-1', 0).length, 0);
  });

  test('교사 이벤트는 소수 게임 일에서 시작 — 날 d 는 startDay ≤ d < endDay 일 때만', () => {
    const t = teacherEventInstance({ classId: 'c1', requestId: 'r3', event: byId('rent-up'), targets: 'all', nowGameDays: 45.3 });
    assert.equal(costMultipliersAt([t], 'team-1', 45).upkeep.rent, 1);
    assert.equal(costMultipliersAt([t], 'team-1', 46).upkeep.rent, 1.2);
    assert.equal(costMultipliersAt([t], 'team-1', 135).upkeep.rent, 1.2);
    assert.equal(costMultipliersAt([t], 'team-1', 136).upkeep.rent, 1);
  });

  test('정산 통합 — 날마다 배율이 다를 때(장비 운영비 인상 30일째부터)', () => {
    const opex = autoEventInstance({ classId: 'c1', monthIndex: 1, event: byId('opex-up') });
    const plan = planUpkeep({
      settledDay: 0,
      remainder: 0,
      toDay: 60,
      monthlyCentsForDay: (d) =>
        teamUpkeep({
          district: 'hospital',
          facilities: { target: 1, htvs: 0, docking: 0, admet: 0, security: 0 },
          researchers: 1,
          multipliers: costMultipliersAt([opex], 'team-1', d).upkeep,
        }).totalCents,
    });
    assert.equal(plan.dueCents, M(0.05) + M(0.052));
  });
});

describe('시장 수요 배율 M (균형안 §9.2 · §5 — 같은 사건 한 번 · 0.70~1.30)', () => {
  const up = autoEventInstance({ classId: 'c1', monthIndex: 1, event: byId('demand-up') });
  const upAgain = teacherEventInstance({ classId: 'c1', requestId: 'r9', event: byId('demand-up'), targets: 'all', nowGameDays: 60 });
  const off = autoEventInstance({ classId: 'c1', monthIndex: 3, event: byId('risk-off') });

  test('적용 기간 동안만 ×1.15, 끝나면 1', () => {
    assert.equal(demandMultiplierAt([up], 'team-1', 29), 1, '시작 전');
    assert.equal(demandMultiplierAt([up], 'team-1', 30), 1.15);
    assert.equal(demandMultiplierAt([up], 'team-1', 119), 1.15);
    assert.equal(demandMultiplierAt([up], 'team-1', 120), 1, '90게임 일 뒤 끝(배타)');
  });

  test('같은 eventId 가 겹쳐도 한 번만(1.3225 아님) — 기간만 늘어난다', () => {
    assert.equal(demandMultiplierAt([up, upAgain], 'team-1', 70), 1.15);
    assert.equal(demandMultiplierAt([up, upAgain], 'team-1', 140), 1.15, '교사 실행분이 기간을 늘림');
    assert.equal(demandMultiplierAt([up, upAgain], 'team-1', 150), 1);
  });

  test('서로 다른 수요 사건은 곱하고 0.70~1.30 으로 자른다 · 비용 배율과 섞이지 않는다', () => {
    const m = demandMultiplierAt([up, off], 'team-1', 95);
    assert.ok(Math.abs(m - 1.15 * 0.85) < 1e-12, `1.15 × 0.85 = ${m}`);
    const synthetic: EventInstance = { ...up, instanceId: 'x', eventId: 'synthetic-demand', rule: { kind: 'marketDemand', mult: 1.25, months: 3 } };
    assert.equal(demandMultiplierAt([up, synthetic], 'team-1', 40), 1.3, '1.15 × 1.25 = 1.4375 → 1.30');
    const opex = autoEventInstance({ classId: 'c1', monthIndex: 1, event: byId('opex-up') });
    assert.equal(demandMultiplierAt([opex], 'team-1', 40), 1, '유지비 사건은 수요 배율이 아니다');
    assert.equal(costMultipliersAt([up], 'team-1', 40).upkeep.facility, 1, '수요 사건은 비용 배율이 아니다');
  });

  test('대상 회사만', () => {
    const only2 = teacherEventInstance({ classId: 'c1', requestId: 'r10', event: byId('risk-off'), targets: ['team-2'], nowGameDays: 0 });
    assert.equal(demandMultiplierAt([only2], 'team-1', 1), 1);
    assert.equal(demandMultiplierAt([only2], 'team-2', 1), 0.85);
  });

  test('자동 추첨 풀에 수요 · 임상 · 심사 사건이 들어간다(M5 에서 풀 11건 — 같은 시드의 당첨 사건은 풀 크기에 따라 바뀐다)', () => {
    const pool = implementedEvents(catalog);
    assert.equal(pool.length, 11);
    const drawn = new Set<string>();
    for (let seed = 0; seed < 3000; seed++) {
      const r = processMonthBoundary({ monthIndex: 3, phase: 'outOfClass', operatingMs: 0, sessionSeq: null, counters: EMPTY_AUTO_EVENT_COUNTERS, seed, pool });
      if (r.event) drawn.add(r.event.id);
    }
    assert.ok(drawn.has('demand-up') && drawn.has('risk-off'), [...drawn].join(','));
    assert.ok(drawn.has('regulation') && drawn.has('trial-recruit'), [...drawn].join(','));
    assert.ok(!drawn.has('supply-shock'));
  });
});
