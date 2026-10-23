/**
 * 움직이는 NPC(v7) — 길찾기 호환(T-1-1) · NPC 지점 데이터(T-1-2) · 맵 전환(T-1-4) · 공용 판정 함수(T-2-1) · 규칙 선택기(T-3b-1 일부).
 * 시험 이름은 docs/2026-10-22-npc-implementation-brief.md §6 표의 이름이다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MOVE, NPC_INTENT_CANDIDATES_MAX, NPC_MOVE, NPC_PLAN_CANDIDATES_MAX, TILE_SIZE, type FacilityKind, type FacilityRunState, type TileMapData } from '@crista/shared-types';
import {
  buildCityMap,
  buildHqMap,
  findPath,
  interactTargetAt,
  isWalkableTile,
  npcEscortCandidates,
  npcPathBlocker,
  npcPlanCandidates,
  npcRandom,
  npcSpotProblems,
  restingNpcPoints,
  selectNpcPlanByRules,
  tileCenter,
  withinInteractTarget,
  type DynamicNpcPoint,
  type HqTeamSeed,
} from '../src/index.ts';

const KINDS: FacilityKind[] = ['target', 'htvs', 'docking', 'admet', 'security'];

function seed(tier: 0 | 1 | 2 | 3, states: Partial<Record<FacilityKind, FacilityRunState>> = {}): HqTeamSeed {
  return {
    id: 'team-x',
    companyName: '시험 바이오',
    facilities: { target: tier, htvs: tier, docking: tier, admet: tier, security: tier },
    facilityStates: states,
  };
}

function cityMap(): TileMapData {
  return buildCityMap([
    { id: 'team-1', companyName: 'A', tickerSymbol: 'AAA', inkKey: 't1', district: 'hospital', facilities: { target: 1, htvs: 0, docking: 1, admet: 0, security: 0 }, status: 'active', lot: 1 } as never,
    { id: 'team-2', companyName: 'B', tickerSymbol: 'BBB', inkKey: 't2', district: 'ai', facilities: { target: 0, htvs: 0, docking: 0, admet: 0, security: 0 }, status: 'active', lot: 1 } as never,
  ]);
}

describe('T-1-1 길찾기 호환 — blocked 생략 = 지금과 같은 경로', () => {
  test('사옥 · 도시에서 무작위 출발 · 도착 200쌍: 생략 · () => false 결과가 같고, 금지 칸은 경로에 없다', () => {
    const rand = npcRandom(20261022);
    for (const map of [buildHqMap(seed(2)), buildHqMap(seed(1), { npcMovement: true }), cityMap()]) {
      const walkable: Array<{ tx: number; ty: number }> = [];
      for (let ty = 0; ty < map.heightTiles; ty++) for (let tx = 0; tx < map.widthTiles; tx++) if (isWalkableTile(map, tx, ty)) walkable.push({ tx, ty });
      const blocker = npcPathBlocker(map);
      for (let i = 0; i < 200; i++) {
        const a = walkable[Math.floor(rand() * walkable.length)]!;
        const b = walkable[Math.floor(rand() * walkable.length)]!;
        const base = findPath(map, a, b);
        assert.deepEqual(findPath(map, a, b, undefined, () => false), base, `${map.id} ${a.tx},${a.ty}→${b.tx},${b.ty}`);
        for (const p of findPath(map, a, b, undefined, blocker)) assert.ok(!blocker(p.tx, p.ty), '금지 칸을 지나지 않는다');
      }
    }
  });

  test('NPC 금지 칸 — 사옥 금고(보안 게이트 안쪽)에는 NPC 경로가 닿지 않는다(플레이어 경로는 그대로)', () => {
    const map = buildHqMap(seed(1), { npcMovement: true });
    const inside = { tx: 22, ty: 15 };
    assert.ok(findPath(map, { tx: 16, ty: 9 }, inside).length > 0, '플레이어 길찾기는 게이트를 지난다(통행 판정은 서버 MOVE)');
    assert.deepEqual(findPath(map, { tx: 16, ty: 9 }, inside, undefined, npcPathBlocker(map)), []);
  });
});

describe('T-1-2 NPC 지점 데이터', () => {
  test('설비 등급 · 가동 상태 조합 사옥 맵 전부 — 규칙 위반 0 · 같은 입력이면 같은 지점 · 도시는 빈 배열', () => {
    const states: FacilityRunState[] = ['active', 'idle'];
    for (const tier of [0, 1, 2, 3] as const) {
      for (const st of states) {
        for (const movement of [true, false]) {
          const facilityStates = Object.fromEntries(KINDS.map((k) => [k, st])) as Record<FacilityKind, FacilityRunState>;
          const map = buildHqMap(seed(tier, facilityStates), { npcMovement: movement });
          assert.deepEqual(npcSpotProblems(map), [], `등급 ${tier} · ${st} · 이동 ${movement}`);
          assert.deepEqual(buildHqMap(seed(tier, facilityStates), { npcMovement: movement }).npcSpots, map.npcSpots, '결정적');
        }
      }
    }
    const map = buildHqMap(seed(1), { npcMovement: true });
    assert.deepEqual(map.npcSpots.map((s) => s.kind).sort(), ['entrance', 'home', 'wait', 'wait', 'wait', 'work', 'work', 'work', 'work']);
    assert.ok(!map.npcSpots.some((s) => s.facility === 'security'), '금고 안 보안 설비에는 작업 지점이 없다');
    assert.deepEqual(cityMap().npcSpots, []);
  });

  test('검사기가 위반을 잡는다 — 벽 · 상호작용 칸 · 입구 2칸 · 반경 밖 · 금고 안', () => {
    const map = buildHqMap(seed(1), { npcMovement: true });
    const bad = {
      ...map,
      npcSpots: [
        ...map.npcSpots,
        { id: 'x-wall', kind: 'wait' as const, tx: 0, ty: 5, dir: 'south' as const, roles: ['researcher' as const], label: '벽' },
        { id: 'x-front', kind: 'wait' as const, tx: 14, ty: 6, dir: 'south' as const, roles: ['researcher' as const], label: '설비 앞' },
        { id: 'x-door', kind: 'wait' as const, tx: 14, ty: 16, dir: 'south' as const, roles: ['researcher' as const], label: '입구' },
        { id: 'x-vault', kind: 'wait' as const, tx: 22, ty: 15, dir: 'south' as const, roles: ['researcher' as const], label: '금고' },
      ],
    };
    const problems = npcSpotProblems(bad).join('\n');
    assert.match(problems, /x-wall: 걸을 수 없는 칸/);
    assert.match(problems, /x-front: 상호작용 칸/);
    assert.match(problems, /x-door: 입구 도착 지점 entrance 2칸 안/);
    assert.match(problems, /x-vault: .*(도달 불가|반경 밖)/);
  });
});

describe('T-1-4 맵 전환 — 움직이는 연구원은 유령 충돌 · 정적 지점이 없다', () => {
  test('이동 켬: 홈 칸은 걸을 수 있고 npc-researcher 정적 지점이 없다 · 끔: v5 와 같다(발밑 block · 앞 칸 지점)', () => {
    const on = buildHqMap(seed(1), { npcMovement: true });
    const placement = on.npcs.find((n) => n.id === 'npc-researcher')!;
    assert.equal(placement.mobile, true);
    assert.ok(isWalkableTile(on, placement.tx, placement.ty));
    assert.equal(on.interactables.find((i) => i.id === 'npc-researcher'), undefined);
    const off = buildHqMap(seed(1));
    assert.equal(off.npcs[0]!.mobile, undefined);
    assert.ok(!isWalkableTile(off, 16, 9));
    assert.deepEqual(
      off.interactables.find((i) => i.id === 'npc-researcher'),
      { id: 'npc-researcher', kind: 'npc', npc: 'researcher', tx: 16, ty: 10, wTiles: 1, hTiles: 1, label: '사내 연구소 정 책임연구원', enabled: true },
    );
    assert.deepEqual(restingNpcPoints(on), [{ id: 'npc-researcher', npc: 'researcher', ...tileCenter(16, 9), walking: false, label: '사내 연구소 정 책임연구원' }]);
    assert.deepEqual(restingNpcPoints(off), []);
  });
});

describe('T-2-1 움직이는 NPC 사거리 — 공용 판정 함수', () => {
  const map = buildHqMap(seed(1), { npcMovement: true });
  // 설비 · 창구에서 멀리 떨어진 빈 바닥(연구동 복도 근처) — 정적 지점이 끼어들지 않는 곳.
  const at = tileCenter(18, 12);
  const npc = (walking: boolean): DynamicNpcPoint => ({ id: 'npc-researcher', npc: 'researcher', x: at.x, y: at.y, walking, label: '연구원' });

  test('걷는 NPC: 0 · 56 · 88px 접수, 89px 거절 / 멈춘 NPC: 56px 접수, 57px 거절 · 거리 0 성립', () => {
    for (const [d, walking, ok] of [
      [0, true, true],
      [MOVE.interactRangePx, true, true],
      [MOVE.interactRangePx + NPC_MOVE.walkingRangeSlackPx, true, true],
      [MOVE.interactRangePx + NPC_MOVE.walkingRangeSlackPx + 1, true, false],
      [MOVE.interactRangePx, false, true],
      [MOVE.interactRangePx + 1, false, false],
    ] as const) {
      const player = { x: at.x, y: at.y + d };
      assert.equal(withinInteractTarget(map, [npc(walking)], player, 'npc-researcher'), ok, `${d}px · 걷는 중 ${walking}`);
      assert.equal(interactTargetAt(map, [npc(walking)], player.x, player.y)?.id ?? null, ok ? 'npc-researcher' : null, `가장 가까운 대상 ${d}px`);
    }
  });

  test('정적 지점과 겹치면 가까운 쪽, 거리가 같으면 정적 지점 · 옛 정적 좌표는 판정하지 않는다', () => {
    const facility = map.interactables.find((i) => i.id === 'facility-docking')!;
    const center = { x: (facility.tx + facility.wTiles / 2) * TILE_SIZE, y: (facility.ty + facility.hTiles / 2) * TILE_SIZE };
    const same: DynamicNpcPoint = { id: 'npc-researcher', npc: 'researcher', x: center.x, y: center.y, walking: false, label: '연구원' };
    assert.equal(interactTargetAt(map, [same], center.x, center.y)?.kind, 'static', '거리 0 동점 → 정적 지점');
    const nearNpc: DynamicNpcPoint = { ...same, y: center.y + 20 };
    assert.equal(interactTargetAt(map, [nearNpc], center.x, center.y + 20)?.kind, 'npc', 'NPC 가 더 가까우면 NPC');
    // NPC 가 홈을 떠났으면 홈 앞 칸에서는 말을 걸 수 없다(T-2-2 규칙 쪽).
    const away: DynamicNpcPoint = { ...same, ...tileCenter(5, 5) };
    assert.equal(withinInteractTarget(map, [away], tileCenter(16, 10), 'npc-researcher'), false);
    assert.equal(withinInteractTarget(map, [away], { x: Number.NaN, y: 0 }, 'npc-researcher'), false, 'NaN 거절');
  });
});

describe('규칙 선택기 · 후보(T-3b-1 일부)', () => {
  const allActive = (tier: number, idle: FacilityKind[] = []) => (kind: FacilityKind) => ({ tier, state: (idle.includes(kind) ? 'idle' : 'active') as FacilityRunState });

  test('후보 — 지어졌고 가동 중인 설비의 작업 지점만 · 안정 id · 최대 12 · 출입구는 안내 후보에만', () => {
    const map = buildHqMap(seed(1), { npcMovement: true });
    const plan = npcPlanCandidates({ map, role: 'researcher', facilityOf: allActive(1, ['htvs']) });
    assert.ok(plan.length <= NPC_PLAN_CANDIDATES_MAX);
    assert.deepEqual(plan.map((c) => c.id), [
      'work:hq-admet-side',
      'work:hq-docking-side',
      'work:hq-target-side',
      'wait:hq-wait-hall',
      'wait:hq-wait-meeting',
      'wait:hq-wait-shelf',
      'home:hq-home',
    ]);
    assert.deepEqual(npcPlanCandidates({ map, role: 'researcher', facilityOf: allActive(0) }).filter((c) => c.kind === 'work_at'), [], '미건설이면 작업 후보 없음');
    const escort = npcEscortCandidates({ map, role: 'researcher', facilityOf: allActive(2) });
    assert.ok(escort.length <= NPC_INTENT_CANDIDATES_MAX);
    assert.deepEqual(escort.map((c) => c.id), ['escort:hq-target-side', 'escort:hq-htvs-side', 'escort:hq-docking-side', 'escort:hq-admet-side', 'escort:hq-entrance-side']);
    assert.match(escort[2]!.description, /AI 도킹 서버실 옆 작업대까지 안내/);
    assert.ok(npcEscortCandidates({ map, role: 'broker', facilityOf: allActive(2) }).length === 0, '다른 역할은 그 지점을 쓰지 않는다');
  });

  test('선택 — 같은 입력이면 같은 선택 · 지금 선 지점 · 최근 지점 반복 회피 · 후보 없으면 null', () => {
    const map = buildHqMap(seed(1), { npcMovement: true });
    const spots = new Map(map.npcSpots.map((s) => [s.id, s]));
    const plan = npcPlanCandidates({ map, role: 'researcher', facilityOf: allActive(1) });
    const obs = { at: { tx: 16, ty: 9 }, currentSpotId: 'hq-home', recentSpotIds: [] as string[] };
    const first = selectNpcPlanByRules(plan, obs, (id) => spots.get(id))!;
    assert.deepEqual(selectNpcPlanByRules(plan, obs, (id) => spots.get(id)), first);
    assert.equal(first.candidateId, 'work:hq-docking-side', '가장 가까운 가동 중 작업대');
    assert.equal(first.reasonCode, 'station_available');
    const next = selectNpcPlanByRules(plan, { at: { tx: 16, ty: 5 }, currentSpotId: 'hq-docking-side', recentSpotIds: ['hq-docking-side'] }, (id) => spots.get(id))!;
    assert.notEqual(next.candidateId, 'work:hq-docking-side', '방금 일한 자리는 피한다');
    assert.equal(selectNpcPlanByRules([], obs, (id) => spots.get(id)), null);
  });
});
