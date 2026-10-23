/**
 * 설비 건설·업그레이드 견적(균형안 §3.2) — `facilityActionQuote` · `nextFacilityActionQuote`.
 * 수치는 문서 표에서 바로 옮긴 값과 비교한다. 정의되지 않은 업그레이드 단계는 비용을 만들지 않고 maxed 다.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FACILITY_PRICE,
  FACILITY_UPGRADE_TIER1,
  facilityActionQuote,
  millionsToCents,
  nextFacilityActionQuote,
} from '../src/economy.ts';

const M = millionsToCents;

test('건설(0→1) 비용은 설비별 설치비 표와 같다', () => {
  const expected = { target: 1.0, htvs: 0.5, docking: 0.7, admet: 0.5, security: 0.3 } as const;
  for (const [kind, millions] of Object.entries(expected) as Array<[keyof typeof expected, number]>) {
    const quote = facilityActionQuote(kind, 0, 'build');
    assert.equal(quote.ok, true, kind);
    if (!quote.ok) continue;
    assert.equal(quote.costCents, M(millions), kind);
    assert.equal(quote.costCents, FACILITY_PRICE[kind].installCents);
    assert.equal(quote.toTier, 1);
    assert.equal(quote.ledgerKind, 'facility_build');
  }
});

test('1단계 업그레이드(1→2)는 $0.250M 이다', () => {
  const quote = facilityActionQuote('docking', 1, 'upgrade');
  assert.equal(quote.ok, true);
  if (!quote.ok) return;
  assert.equal(quote.costCents, M(0.25));
  assert.equal(quote.costCents, FACILITY_UPGRADE_TIER1.installCents);
  assert.equal(quote.fromTier, 1);
  assert.equal(quote.toTier, 2);
  assert.equal(quote.ledgerKind, 'facility_upgrade');
});

test('균형안에 없는 2단계 이후 업그레이드는 maxed 다(수치를 만들지 않는다)', () => {
  for (const tier of [2, 3]) {
    const quote = facilityActionQuote('docking', tier, 'upgrade');
    assert.equal(quote.ok, false);
    if (quote.ok) continue;
    assert.equal(quote.reason, 'maxed');
  }
});

test('건설 전 업그레이드 · 건설된 설비의 재건설 · 잘못된 등급은 거절한다', () => {
  const notBuilt = facilityActionQuote('security', 0, 'upgrade');
  assert.equal(notBuilt.ok === false && notBuilt.reason, 'not_built');
  const already = facilityActionQuote('target', 1, 'build');
  assert.equal(already.ok === false && already.reason, 'already_built');
  for (const bad of [-1, 4, 1.5, Number.NaN]) {
    const quote = facilityActionQuote('target', bad, 'upgrade');
    assert.equal(quote.ok === false && quote.reason, 'invalid_tier', String(bad));
  }
});

test('다음 행동 견적: 등급 0 은 건설, 1 은 업그레이드, 2 는 maxed', () => {
  const zero = nextFacilityActionQuote('security', 0);
  assert.equal(zero.action, 'build');
  assert.equal(zero.ok && zero.costCents, M(0.3));
  const one = nextFacilityActionQuote('target', 1);
  assert.equal(one.action, 'upgrade');
  assert.equal(one.ok && one.costCents, M(0.25));
  const two = nextFacilityActionQuote('docking', 2);
  assert.equal(two.action, 'upgrade');
  assert.equal(two.ok, false);
});
