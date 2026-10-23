/**
 * 격자 도우미(v4) — 이진 힙 A* `findPath` · 구역 판정 `zoneAt` / `isInsideZone` · 도시 도착 지점 `resolveCitySpawn`.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EXCHANGE_FLOOR_ZONE_ID, PATHFIND_MAX_NODES, TILE_SIZE, type MapZone, type TileMapData } from '@crista/shared-types';
import { buildCityMap, findPath, isInsideZone, isWalkableTile, resolveCitySpawn, zoneAt, type CityTeamSeed } from '../src/index.ts';

/** 문자열 그림으로 작은 맵을 만든다 — '#' 막힘, 나머지 통행. */
function mapFrom(rows: string[], zones: MapZone[] = []): TileMapData {
  const h = rows.length;
  const w = rows[0]!.length;
  return {
    id: 'test',
    name: 'test',
    paper: 'map',
    widthTiles: w,
    heightTiles: h,
    floor: rows.map((r) => Array.from(r, () => '')),
    marks: rows.map((r) => Array.from(r, () => '')),
    collision: rows.map((r) => Array.from(r, (c) => (c === '#' ? 1 : 0))),
    objects: [],
    spawns: [],
    portals: [],
    interactables: [],
    districts: [],
    zones,
    npcs: [],
    npcSpots: [],
  };
}

/** 너비 우선 탐색 최단 걸음 수(없으면 -1) — A* 결과의 최적성 확인용. */
function bfsSteps(map: TileMapData, from: { tx: number; ty: number }, to: { tx: number; ty: number }): number {
  const w = map.widthTiles;
  const dist = new Int32Array(w * map.heightTiles).fill(-1);
  const queue = [from.ty * w + from.tx];
  dist[queue[0]!] = 0;
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i]!;
    const x = k % w;
    const y = (k - x) / w;
    if (x === to.tx && y === to.ty) return dist[k]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkableTile(map, nx, ny)) continue;
      const nk = ny * w + nx;
      if (dist[nk] !== -1) continue;
      dist[nk] = dist[k]! + 1;
      queue.push(nk);
    }
  }
  return -1;
}

function assertValidPath(map: TileMapData, from: { tx: number; ty: number }, path: Array<{ tx: number; ty: number }>, to: { tx: number; ty: number }) {
  let prev = from;
  for (const step of path) {
    assert.equal(Math.abs(step.tx - prev.tx) + Math.abs(step.ty - prev.ty), 1, '네 방향 한 칸씩');
    assert.ok(isWalkableTile(map, step.tx, step.ty), `막힌 칸을 지나지 않는다 (${step.tx},${step.ty})`);
    prev = step;
  }
  assert.deepEqual(prev, to);
}

describe('findPath — 이진 힙 A*', () => {
  test('기본 규칙 — 시작 제외 · 도착 포함, 같은 칸 · 막힌 도착 · 닿을 수 없음은 빈 배열', () => {
    const map = mapFrom([
      '.....',
      '.###.',
      '...#.',
      '####.',
      '.....',
    ]);
    const path = findPath(map, { tx: 0, ty: 0 }, { tx: 0, ty: 4 });
    assertValidPath(map, { tx: 0, ty: 0 }, path, { tx: 0, ty: 4 });
    assert.equal(path.length, bfsSteps(map, { tx: 0, ty: 0 }, { tx: 0, ty: 4 }));
    assert.deepEqual(findPath(map, { tx: 0, ty: 0 }, { tx: 0, ty: 0 }), []);
    assert.deepEqual(findPath(map, { tx: 0, ty: 0 }, { tx: 1, ty: 1 }), [], '막힌 도착');
    assert.deepEqual(findPath(map, { tx: 0, ty: 0 }, { tx: 9, ty: 9 }), [], '맵 밖 도착');
    assert.deepEqual(findPath(map, { tx: -1, ty: 0 }, { tx: 4, ty: 4 }), [], '맵 밖 출발');
    const walled = mapFrom(['..#..', '..#..', '..#..']);
    assert.deepEqual(findPath(walled, { tx: 0, ty: 0 }, { tx: 4, ty: 0 }), []);
  });

  test('최적 경로 — 결정적 미로 여러 장에서 BFS 최단 걸음 수와 같다', () => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let n = 0; n < 30; n++) {
      const rows = Array.from({ length: 24 }, (_, y) =>
        Array.from({ length: 32 }, (_, x) => ((x === 0 && y === 0) || (x === 31 && y === 23) ? '.' : rand() < 0.3 ? '#' : '.')).join(''),
      );
      const map = mapFrom(rows);
      const from = { tx: 0, ty: 0 };
      const to = { tx: 31, ty: 23 };
      const path = findPath(map, from, to);
      const best = bfsSteps(map, from, to);
      if (best === -1) {
        assert.deepEqual(path, []);
        continue;
      }
      assert.equal(path.length, best, `미로 ${n}`);
      assertValidPath(map, from, path, to);
      assert.deepEqual(findPath(map, from, to), path, '같은 입력이면 같은 경로');
    }
  });

  test(`maxNodes 기본값 = PATHFIND_MAX_NODES(${PATHFIND_MAX_NODES}) — 예전 한도(4000)를 넘는 긴 뱀길도 찾는다`, () => {
    // 160×120 뱀길: 홀수 줄은 벽이고 한쪽 끝만 열려 있다 — 걸음 수가 1만 칸 가까이 된다.
    const rows = Array.from({ length: 119 }, (_, y) => {
      if (y % 2 === 0) return '.'.repeat(160);
      const gapRight = (y - 1) % 4 === 0;
      return Array.from({ length: 160 }, (_, x) => ((gapRight ? x === 159 : x === 0) ? '.' : '#')).join('');
    });
    const map = mapFrom(rows);
    const from = { tx: 0, ty: 0 };
    const to = { tx: 0, ty: 118 };
    const path = findPath(map, from, to);
    assert.ok(path.length > 4000, `걸음 수 ${path.length}`);
    assert.equal(path.length, bfsSteps(map, from, to));
    assert.deepEqual(findPath(map, from, to, 4000), [], '한도를 넘으면 빈 배열');
  });
});

describe('zoneAt · isInsideZone — 픽셀 좌표', () => {
  const zones: MapZone[] = [
    { id: 'a', kind: 'exchange-floor', tx: 2, ty: 2, wTiles: 3, hTiles: 2, label: 'A' },
    { id: 'b', kind: 'park', tx: 0, ty: 0, wTiles: 10, hTiles: 10, label: 'B' },
  ];
  const map = mapFrom(Array.from({ length: 10 }, () => '.'.repeat(10)), zones);

  test('경계 — 왼쪽 · 위는 포함, 오른쪽 · 아래 끝은 제외', () => {
    assert.equal(isInsideZone(map, 'a', 2 * TILE_SIZE, 2 * TILE_SIZE), true);
    assert.equal(isInsideZone(map, 'a', 5 * TILE_SIZE - 0.5, 4 * TILE_SIZE - 0.5), true);
    assert.equal(isInsideZone(map, 'a', 5 * TILE_SIZE, 3 * TILE_SIZE), false);
    assert.equal(isInsideZone(map, 'a', 3 * TILE_SIZE, 4 * TILE_SIZE), false);
    assert.equal(isInsideZone(map, 'a', 2 * TILE_SIZE - 0.01, 3 * TILE_SIZE), false);
  });

  test('겹치면 앞의 구역 · 밖이면 null · 모르는 id · 숫자가 아닌 좌표는 false', () => {
    assert.equal(zoneAt(map, 3 * TILE_SIZE, 3 * TILE_SIZE)?.id, 'a');
    assert.equal(zoneAt(map, 8 * TILE_SIZE, 8 * TILE_SIZE)?.id, 'b');
    assert.equal(zoneAt(map, 11 * TILE_SIZE, 1), null);
    assert.equal(zoneAt(map, Number.NaN, 0), null);
    assert.equal(isInsideZone(map, 'nope', 3 * TILE_SIZE, 3 * TILE_SIZE), false);
    assert.equal(isInsideZone(map, 'a', Number.POSITIVE_INFINITY, 3 * TILE_SIZE), false);
  });
});

describe('resolveCitySpawn — JoinOptions.spawnId 규칙', () => {
  const teams: CityTeamSeed[] = [
    { id: 'team-1', companyName: '하나', district: 'hospital', hqTier: 1, inkIndex: 1, lot: 1 },
    { id: 'team-2', companyName: '둘', district: 'vc', hqTier: 1, inkIndex: 2, lot: 1 },
  ];
  const map = buildCityMap(teams);
  const classTeamIds = ['team-1', 'team-2'];

  test('사옥에서 나올 때 — 그 학급 팀의 outside-hq 는 그대로(남의 사옥 앞이어도)', () => {
    assert.equal(resolveCitySpawn(map, { requested: 'outside-hq-team-2', ownTeamId: 'team-1', role: 'student', classTeamIds }), 'outside-hq-team-2');
    assert.equal(resolveCitySpawn(map, { requested: 'outside-hq-team-1', ownTeamId: null, role: 'teacher', classTeamIds }), 'outside-hq-team-1');
  });

  test('생략 · 다른 값 · 다른 학급 팀 — 학생은 자기 사옥 앞, 교사 · 팀 없는 사람은 spawns[0]', () => {
    assert.equal(map.spawns[0]!.id, 'civic');
    for (const requested of [undefined, 'civic', 'zone-exchange-floor', 'outside-hq-team-9', 'outside-hq-', 'entrance']) {
      assert.equal(resolveCitySpawn(map, { requested, ownTeamId: 'team-1', role: 'student', classTeamIds }), 'outside-hq-team-1', String(requested));
      assert.equal(resolveCitySpawn(map, { requested, ownTeamId: null, role: 'teacher', classTeamIds }), 'civic', String(requested));
      assert.equal(resolveCitySpawn(map, { requested, ownTeamId: null, role: 'student', classTeamIds }), 'civic', String(requested));
    }
  });

  test('맵에 없는 사옥 · 학급 밖 팀이면 spawns[0]', () => {
    // team-3 은 학급 목록에는 있지만 맵에 사옥이 없다(예: 아직 월드를 다시 만들지 않음).
    assert.equal(resolveCitySpawn(map, { requested: 'outside-hq-team-3', ownTeamId: 'team-3', role: 'student', classTeamIds: [...classTeamIds, 'team-3'] }), 'civic');
    // 다른 학급 팀 id 는 맵에 있어도 받지 않는다.
    assert.equal(resolveCitySpawn(map, { requested: 'outside-hq-team-2', ownTeamId: 'team-1', role: 'student', classTeamIds: ['team-1'] }), 'outside-hq-team-1');
  });

  test('고른 도착 지점은 어느 경우든 객장 구역 밖', () => {
    for (const requested of [undefined, 'outside-hq-team-1', 'outside-hq-team-2', 'civic']) {
      for (const [ownTeamId, role] of [['team-1', 'student'], ['team-2', 'student'], [null, 'teacher']] as const) {
        const id = resolveCitySpawn(map, { requested, ownTeamId, role, classTeamIds });
        const s = map.spawns.find((sp) => sp.id === id)!;
        assert.ok(s, id);
        assert.equal(isInsideZone(map, EXCHANGE_FLOOR_ZONE_ID, (s.tx + 0.5) * TILE_SIZE, (s.ty + 0.5) * TILE_SIZE), false, id);
      }
    }
  });
});
