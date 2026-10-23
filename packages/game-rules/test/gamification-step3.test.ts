/**
 * 동기부여 Step 3 순수 규칙 — 소품(해금 · 가드레일 · 매각 · 효과) · 연례 바이오 학회(문항지 · 채점 · 순위 상금) · 라이선스 순환 · 로열티 정산.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PROP_CATALOG } from '@crista/shared-types';
import {
  DEV_TEAMS,
  HQ_TIER_STAMP_ID,
  buildCityMap,
  buildHqMap,
  hqPropObjectId,
  bountyRetrySeconds,
  createsCycle,
  croRetrySeconds,
  gradeSymposium,
  propReserveShortfall,
  propSaleCents,
  propUnlocked,
  royaltyAction,
  symposiumAwards,
  symposiumSheet,
} from '../src/index.ts';

describe('사옥 소품', () => {
  test('6종 합계 $0.300M · 해금 조건', () => {
    assert.equal(PROP_CATALOG.length, 6);
    assert.equal(PROP_CATALOG.reduce((n, p) => n + p.priceCents, 0), 30_000_000);
    const none = { activePatents: 0, approved: false, hqTier: 1 as const };
    assert.deepEqual(PROP_CATALOG.filter((p) => propUnlocked(p.unlock, none)).map((p) => p.id), ['espresso', 'poster-board', 'lounge-sofa']);
    const all = { activePatents: 1, approved: true, hqTier: 3 as const };
    assert.equal(PROP_CATALOG.filter((p) => propUnlocked(p.unlock, all)).length, 6);
  });

  test('가드레일 — 구매 뒤 잔액 ≥ 월 유지비 × 6 · 매각 50%', () => {
    assert.equal(propReserveShortfall(10_000_000, 3_000_000, 1_000_000), null, '$0.100M − $0.030M ≥ $0.060M');
    assert.equal(propReserveShortfall(8_999_999, 3_000_000, 1_000_000), 9_000_000);
    assert.equal(propSaleCents(3_000_000), 1_500_000);
    assert.equal(propSaleCents(3), 1);
  });

  test('효과 — 에스프레소는 CRO, 피어리뷰 테이블은 바운티 대기를 45초로', () => {
    assert.equal(croRetrySeconds([]), 60);
    assert.equal(croRetrySeconds(['espresso']), 45);
    assert.equal(bountyRetrySeconds(['espresso']), 60);
    assert.equal(bountyRetrySeconds(['lounge-sofa']), 45);
  });
});

describe('연례 바이오 학회', () => {
  test('학급 · 연도 공통 문항지 10문항 · 결정적 · 정답이면 만점', () => {
    const a = symposiumSheet(7, 0);
    assert.deepEqual(a, symposiumSheet(7, 0));
    assert.notDeepEqual(a.view.questions, symposiumSheet(7, 1).view.questions);
    assert.equal(a.view.questions.length, 10);
    assert.equal(new Set(a.view.questions.map((q) => q.id)).size, 10);
    const perfect = Object.fromEntries(a.key.questions.map((q) => [q.id, q.correct]));
    assert.deepEqual([gradeSymposium(a.key, perfect).score, gradeSymposium(a.key, perfect).max], [10, 10]);
    assert.equal(gradeSymposium(a.key, {}).score, 0);
  });

  test('순위 상금 — 점수 내림차순 · 같으면 먼저 낸 순 · 0점은 상금 없음', () => {
    const awards = symposiumAwards([
      { lineageId: 'c', score: 7, submittedAtMs: 30 },
      { lineageId: 'a', score: 9, submittedAtMs: 50 },
      { lineageId: 'b', score: 7, submittedAtMs: 10 },
      { lineageId: 'd', score: 2, submittedAtMs: 5 },
      { lineageId: 'e', score: 0, submittedAtMs: 1 },
    ]);
    assert.deepEqual(
      awards.map((x) => [x.lineageId, x.rank, x.prizeCents, x.badge]),
      [
        ['a', 1, 8_000_000, 'gold'],
        ['b', 2, 5_000_000, 'silver'],
        ['c', 3, 3_000_000, 'bronze'],
        ['d', 4, 1_000_000, 'participant'],
        ['e', 5, 0, null],
      ],
    );
  });
});

describe('라이선스 · 임대', () => {
  test('순환 거래 — A→B 뒤 B→A, A→B→C 뒤 C→A 는 막고 같은 방향은 허용', () => {
    assert.equal(createsCycle([], 'A', 'B'), false);
    assert.equal(createsCycle([['A', 'B']], 'B', 'A'), true);
    assert.equal(createsCycle([['A', 'B'], ['B', 'C']], 'C', 'A'), true);
    assert.equal(createsCycle([['A', 'B']], 'A', 'B'), false);
    assert.equal(createsCycle([['A', 'B']], 'A', 'C'), false);
    assert.equal(createsCycle([], 'A', 'A'), true);
  });

  test('로열티 정산 — 판정 · 정정에 맞춰 지급 · 반환 · 회수 · 재청구', () => {
    assert.equal(royaltyAction('running', 'escrow'), 'none');
    assert.equal(royaltyAction('passed', 'escrow'), 'pay');
    assert.equal(royaltyAction('failed', 'escrow'), 'release');
    assert.equal(royaltyAction('failed', 'paid'), 'clawback');
    assert.equal(royaltyAction('passed', 'released'), 'recharge');
    assert.equal(royaltyAction('passed', 'paid'), 'none');
    assert.equal(royaltyAction('failed', 'released'), 'none');
  });
});

describe('사옥 내부 Tier 연출 · 소품 슬롯', () => {
  const seed = DEV_TEAMS[0]!;
  const count = (m: ReturnType<typeof buildHqMap>, frame: string) => m.floor.flat().filter((f) => f === frame).length;

  test('Tier 2 만년필 도면 · Tier 3 쇼케이스 띠 + 도장 — 충돌 · 지점은 그대로', () => {
    const t1 = buildHqMap({ ...seed, hqTier: 1 });
    const t2 = buildHqMap({ ...seed, hqTier: 2 });
    const t3 = buildHqMap({ ...seed, hqTier: 3 });
    assert.equal(count(t1, 'tile/floor-pen'), 0);
    assert.ok(count(t2, 'tile/floor-pen') > 40);
    assert.ok(count(t3, 'tile/floor-showcase') >= 5);
    assert.ok(t3.objects.some((o) => o.id === HQ_TIER_STAMP_ID) && !t2.objects.some((o) => o.id === HQ_TIER_STAMP_ID));
    for (const m of [t2, t3]) {
      assert.deepEqual(m.collision, t1.collision, '바닥 그림만 바뀐다');
      assert.deepEqual(m.interactables, t1.interactables);
      assert.deepEqual(m.portals, t1.portals);
    }
  });

  test('소품은 고정 슬롯 오브젝트(통행을 막지 않음) · 랜드마크는 도시 옥상', () => {
    const base = buildHqMap({ ...seed });
    const m = buildHqMap({ ...seed, props: ['espresso', 'lounge-sofa', 'landmark'] });
    assert.deepEqual(
      m.objects.filter((o) => o.id.startsWith('prop-')).map((o) => [o.id, o.frame]),
      [
        [hqPropObjectId('espresso'), 'prop/espresso'],
        [hqPropObjectId('lounge-sofa'), 'prop/lounge-sofa'],
      ],
    );
    assert.deepEqual(m.collision, base.collision);
    const city = buildCityMap(DEV_TEAMS.map((t, i) => ({ ...t, ...(i === 0 ? { props: ['landmark'] } : {}) })));
    assert.equal(city.objects.filter((o) => o.frame === 'prop/landmark').length, 1);
  });
});
