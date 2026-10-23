/**
 * M4 큰 도시(160×120) — 압축 왕복 · 객장 구역 · 도착 지점 · 지구 부지 4곳 · NPC · 길찾기 시간 · 결정성 (브리프 §5.1).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  EXCHANGE_FLOOR_ZONE_ID,
  LOTS_PER_DISTRICT,
  TILE_SIZE,
  type DistrictType,
  type MapZoneKind,
  type NpcId,
  type TileMapData,
  type WireTileMap,
} from '@crista/shared-types';
import {
  DEV_TEAMS,
  buildCityMap,
  buildHqMap,
  decodeTileMap,
  encodeTileMap,
  findPath,
  isInsideZone,
  isWalkableTile,
  publicTeam,
  type CityTeamSeed,
} from '../src/index.ts';

const DISTRICTS: readonly DistrictType[] = ['hospital', 'compute', 'vc', 'industry'];

const devTeams = (): CityTeamSeed[] =>
  DEV_TEAMS.map((t) => ({ id: t.id, companyName: t.companyName, district: t.district, hqTier: t.hqTier, inkIndex: t.inkIndex, lot: t.lot }));

/** 지구마다 부지 1~4 를 모두 채운 16개 회사. */
const fullTeams = (): CityTeamSeed[] =>
  DISTRICTS.flatMap((district) =>
    [1, 2, 3, 4].map((lot) => ({
      id: `t-${district}-${lot}`,
      companyName: `${district} ${lot}`,
      district,
      hqTier: 1 as const,
      inkIndex: lot as 1 | 2 | 3 | 4,
      lot,
    })),
  );

const exchangeZone = (map: TileMapData) => map.zones.find((z) => z.id === EXCHANGE_FLOOR_ZONE_ID)!;
const inExchangeTile = (map: TileMapData, tx: number, ty: number) =>
  isInsideZone(map, EXCHANGE_FLOOR_ZONE_ID, (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE);

/** 객장 구역의 통행 칸 전부에서 시작하는 너비 우선 탐색 — 칸마다 '객장 가장자리까지 걸음 수'. */
function stepsToExchange(map: TileMapData): Int32Array {
  const w = map.widthTiles;
  const dist = new Int32Array(w * map.heightTiles).fill(-1);
  const queue: number[] = [];
  const z = exchangeZone(map);
  for (let ty = z.ty; ty < z.ty + z.hTiles; ty++) {
    for (let tx = z.tx; tx < z.tx + z.wTiles; tx++) {
      if (!isWalkableTile(map, tx, ty)) continue;
      dist[ty * w + tx] = 0;
      queue.push(ty * w + tx);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i]!;
    const x = k % w;
    const y = (k - x) / w;
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
  return dist;
}

describe('도시 맵 v4 — 크기 · 구역', () => {
  const map = buildCityMap(devTeams());

  test('160×120 타일 · 레이어 크기 · 오브젝트 500개 이하', () => {
    assert.equal(map.widthTiles, 160);
    assert.equal(map.heightTiles, 120);
    for (const layer of [map.floor, map.marks, map.collision]) {
      assert.equal(layer.length, 120);
      for (const row of layer) assert.equal(row.length, 160);
    }
    const full = buildCityMap(fullTeams());
    const walkable = map.collision.flat().filter((c) => c === 0).length / (160 * 120);
    console.log(`  오브젝트 ${map.objects.length}개(개발 시드) · ${full.objects.length}개(부지 16곳 모두) · 통행 ${(walkable * 100).toFixed(1)}%`);
    assert.ok(full.objects.length <= 500, `오브젝트 ${full.objects.length}`);
  });

  test('객장 구역은 정확히 하나 · 미니맵 구역 종류가 모두 있다 · 지구 4곳은 districts 와 같은 사각형', () => {
    const floors = map.zones.filter((z) => z.kind === 'exchange-floor');
    assert.equal(floors.length, 1);
    assert.equal(floors[0]!.id, EXCHANGE_FLOOR_ZONE_ID);
    assert.equal(map.zones[0]!.id, EXCHANGE_FLOOR_ZONE_ID, '겹치면 객장이 먼저(zoneAt)');
    const kinds = new Set(map.zones.map((z) => z.kind));
    for (const k of ['exchange-floor', 'district', 'civic', 'medical', 'river', 'park', 'residential', 'commercial', 'transit'] as MapZoneKind[]) {
      assert.ok(kinds.has(k), k);
    }
    assert.equal(new Set(map.zones.map((z) => z.id)).size, map.zones.length, 'id 가 겹치지 않는다');
    assert.deepEqual(map.districts.map((d) => d.district).sort(), [...DISTRICTS].sort());
    for (const d of map.districts) {
      const z = map.zones.find((zz) => zz.id === d.id)!;
      assert.equal(z.kind, 'district');
      assert.deepEqual([z.tx, z.ty, z.wTiles, z.hTiles], [d.tx, d.ty, d.wTiles, d.hTiles]);
    }
    for (const z of map.zones) assert.ok(z.tx >= 0 && z.ty >= 0 && z.tx + z.wTiles <= 160 && z.ty + z.hTiles <= 120, z.id);
    const ex = floors[0]!;
    for (let ty = ex.ty; ty < ex.ty + ex.hTiles; ty++) {
      for (let tx = ex.tx; tx < ex.tx + ex.wTiles; tx++) {
        const f = map.floor[ty]![tx]!;
        assert.ok(f === 'tile/exchange-floor' || map.collision[ty]![tx] === 1, `객장 바닥 (${tx},${ty}) = ${f}`);
      }
    }
  });

  test('대로 중앙분리대 · 강은 막히고, 다리는 세 곳(세로 대로)만 걸어서 건넌다', () => {
    for (let ty = 0; ty < 120; ty++) {
      for (let tx = 0; tx < 160; tx++) {
        const f = map.floor[ty]![tx]!;
        if (f === 'tile/median' || f.startsWith('tile/water')) assert.equal(map.collision[ty]![tx], 1, `${f} (${tx},${ty})`);
      }
    }
    const river = map.zones.find((z) => z.kind === 'river')!;
    const crossings: number[] = [];
    for (let tx = 0; tx < 160; tx++) {
      let open = true;
      for (let ty = river.ty; ty < river.ty + river.hTiles; ty++) {
        if (!isWalkableTile(map, tx, ty) || map.floor[ty]![tx] !== 'tile/bridge-deck') open = false;
      }
      if (open) crossings.push(tx);
    }
    const bridges = crossings.filter((x, i) => i === 0 || crossings[i - 1] !== x - 1);
    assert.equal(bridges.length, 3, `다리 열 ${crossings.join(',')}`);
  });
});

describe('도시 맵 v4 — 압축(RLE) 왕복', () => {
  const maps: TileMapData[] = [
    buildCityMap([]),
    buildCityMap(devTeams()),
    buildCityMap(fullTeams()),
    buildHqMap({ id: DEV_TEAMS[0]!.id, companyName: DEV_TEAMS[0]!.companyName, facilities: DEV_TEAMS[0]!.facilities }),
  ];

  test('decodeTileMap(encodeTileMap(map)) 은 원본과 같다 · 반복 수 합 = 가로 × 세로', () => {
    for (const map of maps) {
      const wire = encodeTileMap(map);
      assert.equal(wire.encoding, 'rle-v1');
      assert.deepEqual(wire.collision.palette.slice(0, 2), ['0', '1']);
      for (const layer of [wire.floor, wire.marks, wire.collision]) {
        let sum = 0;
        for (let i = 1; i < layer.runs.length; i += 2) sum += layer.runs[i]!;
        assert.equal(sum, map.widthTiles * map.heightTiles);
      }
      // 통신은 JSON 이다 — 직렬화를 거쳐도 같아야 한다.
      const back = decodeTileMap(JSON.parse(JSON.stringify(wire)) as WireTileMap);
      assert.deepEqual(back, map, map.id);
      const raw = JSON.stringify(map).length;
      const packed = JSON.stringify(wire).length;
      if (map.id === 'city') console.log(`  ${map.id} 맵 JSON ${raw.toLocaleString()} → ${packed.toLocaleString()} 바이트`);
      assert.ok(packed < raw);
    }
  });

  test('깨진 압축은 예외', () => {
    const wire = encodeTileMap(maps[1]!);
    const shortRuns = { ...wire, floor: { ...wire.floor, runs: wire.floor.runs.slice(0, -2) } };
    assert.throws(() => decodeTileMap(shortRuns));
    const badIndex = { ...wire, marks: { palette: [''], runs: [3, 160 * 120] } };
    assert.throws(() => decodeTileMap(badIndex));
    assert.throws(() => decodeTileMap({ ...wire, encoding: 'rle-v0' as 'rle-v1' }));
    const badCollision = { ...wire, collision: { palette: ['0', '2'], runs: [1, 160 * 120] } };
    assert.throws(() => decodeTileMap(badCollision));
  });
});

describe('도시 맵 v4 — 객장 · 도착 지점', () => {
  test('모든 도착 지점은 통행 칸이고 객장 구역 밖이다 · spawns[0] = civic(시청 앞 광장)', () => {
    for (const teams of [[], devTeams(), fullTeams()]) {
      const map = buildCityMap(teams);
      assert.equal(map.spawns[0]!.id, 'civic');
      assert.equal(map.zones.find((z) => z.kind === 'civic') !== undefined, true);
      for (const s of map.spawns) {
        assert.ok(isWalkableTile(map, s.tx, s.ty), s.id);
        assert.equal(inExchangeTile(map, s.tx, s.ty), false, `${s.id} 가 객장 안`);
      }
      assert.equal(new Set(map.spawns.map((s) => s.id)).size, map.spawns.length);
    }
  });

  test('객장 구역에 걸어 들어갈 수 있다 — 시청 앞 광장에서 객장 칸까지 · 객장 테두리에 열린 칸', () => {
    const map = buildCityMap(fullTeams());
    const civic = map.spawns[0]!;
    const z = exchangeZone(map);
    const target = { tx: z.tx + Math.floor(z.wTiles / 2) - 3, ty: z.ty + z.hTiles - 1 };
    assert.ok(isWalkableTile(map, target.tx, target.ty));
    const path = findPath(map, { tx: civic.tx, ty: civic.ty }, target);
    assert.ok(path.length > 0, '시청 앞 광장 → 객장');
    // 객장 테두리 칸 중 바깥 이웃이 통행 칸인 곳 = 들어가는 문. 네 변 모두에 있다.
    const sides = { north: 0, south: 0, west: 0, east: 0 };
    for (let tx = z.tx; tx < z.tx + z.wTiles; tx++) {
      if (isWalkableTile(map, tx, z.ty) && isWalkableTile(map, tx, z.ty - 1)) sides.north++;
      if (isWalkableTile(map, tx, z.ty + z.hTiles - 1) && isWalkableTile(map, tx, z.ty + z.hTiles)) sides.south++;
    }
    for (let ty = z.ty; ty < z.ty + z.hTiles; ty++) {
      if (isWalkableTile(map, z.tx, ty) && isWalkableTile(map, z.tx - 1, ty)) sides.west++;
      if (isWalkableTile(map, z.tx + z.wTiles - 1, ty) && isWalkableTile(map, z.tx + z.wTiles, ty)) sides.east++;
    }
    for (const [side, n] of Object.entries(sides)) assert.ok(n > 0, `${side} 변에 들어가는 칸이 없다`);
  });

  test('지구별 사옥 입구 → 객장 가장자리 걸음 수 — VC 가 가장 짧고 산업단지가 가장 길다', () => {
    const map = buildCityMap(fullTeams());
    const dist = stepsToExchange(map);
    const table: Record<string, number[]> = {};
    for (const district of DISTRICTS) {
      table[district] = [1, 2, 3, 4].map((lot) => {
        const door = map.portals.find((p) => p.id === `hq-door-t-${district}-${lot}`)!;
        const d = dist[door.ty * map.widthTiles + door.tx]!;
        assert.ok(d > 0, `${district} 부지 ${lot} 에서 객장까지 길이 없다`);
        return d;
      });
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log('  사옥 입구 → 객장 가장자리 걸음 수 (부지 1 · 2 · 3 · 4 | 평균)');
    for (const d of DISTRICTS) console.log(`    ${d.padEnd(9)} ${table[d]!.map((n) => String(n).padStart(3)).join(' · ')} | ${avg(table[d]!).toFixed(1)}`);
    const others = (d: DistrictType) => DISTRICTS.filter((x) => x !== d).flatMap((x) => table[x]!);
    assert.ok(Math.max(...table.vc!) < Math.min(...others('vc')), 'VC 의 가장 먼 부지도 다른 지구의 가장 가까운 부지보다 가깝다');
    assert.ok(Math.min(...table.industry!) > Math.max(...others('industry')), '산업단지의 가장 가까운 부지도 다른 지구의 가장 먼 부지보다 멀다');
    // 부지 1 이 그 지구에서 객장에 가장 가깝다.
    for (const d of DISTRICTS) assert.equal(Math.min(...table[d]!), table[d]![0], d);
  });
});

describe('도시 맵 v4 — 지구 부지 4곳', () => {
  test('같은 지구 네 팀이 부지 1~4 에 — 서로 다른 자리 · 빈 부지 자리와 같다', () => {
    const empty = buildCityMap([]);
    for (const district of DISTRICTS) {
      const notices = [0, 1, 2, 3].map((i) => empty.interactables.find((it) => it.id === `lot-${district}-${i}`)!);
      assert.ok(notices.every(Boolean), `${district} 빈 부지 안내 4곳`);
      const teams = [1, 2, 3, 4].map((lot) => ({ id: `${district}-${lot}`, companyName: `${lot}`, district, hqTier: 2 as const, inkIndex: lot as 1 | 2 | 3 | 4, lot }));
      const map = buildCityMap(teams);
      const hqs = teams.map((t) => map.objects.find((o) => o.id === `hq-${t.id}`)!);
      assert.equal(new Set(hqs.map((o) => `${o.tx},${o.ty}`)).size, LOTS_PER_DISTRICT);
      teams.forEach((t, i) => {
        const hq = hqs[i]!;
        assert.deepEqual([hq.tx, hq.ty + 3], [notices[i]!.tx, notices[i]!.ty], `부지 ${t.lot} = 빈 부지 안내 ${i}`);
        assert.equal(map.objects.find((o) => o.id === `hq-flag-${t.id}`)?.frame, `building/owner-team-${t.inkIndex}`);
        const door = map.portals.find((p) => p.id === `hq-door-${t.id}`)!;
        assert.deepEqual([door.tx, door.ty], [hq.tx + 1, hq.ty + 3]);
        assert.deepEqual(door.target, { space: `hq:${t.id}`, spawnId: 'entrance' });
        const spawn = map.spawns.find((s) => s.id === `outside-hq-${t.id}`)!;
        assert.deepEqual([spawn.tx, spawn.ty], [hq.tx + 1, hq.ty + 4]);
        for (let y = hq.ty; y < hq.ty + 3; y++) for (let x = hq.tx; x < hq.tx + 3; x++) assert.equal(map.collision[y]![x], 1);
      });
      assert.equal(map.interactables.filter((it) => it.id.startsWith(`lot-${district}-`)).length, 0, '빈 부지 안내가 남지 않는다');
      assert.equal(map.objects.find((o) => o.id === `district-${district}`)?.frame, `building/district-${district}-contracted`);
    }
    assert.equal(buildCityMap([]).objects.find((o) => o.id === 'district-vc')?.frame, 'building/district-vc');
  });

  test('부지 생략 · 범위 밖은 부지 1', () => {
    const base = { companyName: 'x', district: 'vc' as const, hqTier: 1 as const, inkIndex: 1 as const };
    const at = (lot: number | undefined) => {
      const o = buildCityMap([{ ...base, id: 'a', ...(lot === undefined ? {} : { lot }) }]).objects.find((ob) => ob.id === 'hq-a')!;
      return `${o.tx},${o.ty}`;
    };
    for (const lot of [undefined, 0, 5, 1.5, -1]) assert.equal(at(lot), at(1), String(lot));
    assert.notEqual(at(2), at(1));
  });

  test('파산 · 운영 중 — 같은 부지면 운영 중 회사, 다른 부지면 둘 다(파산 도장은 그 사옥에만)', () => {
    const old = { id: 'old', companyName: '옛 회사', district: 'compute' as const, hqTier: 1 as const, inkIndex: 1 as const, lot: 2, status: 'bankrupt' as const };
    const fresh = { ...old, id: 'new', companyName: '새 회사', status: undefined };
    for (const teams of [[old, fresh], [fresh, old]]) {
      const map = buildCityMap(teams);
      assert.ok(map.objects.some((o) => o.id === 'hq-new'));
      assert.ok(!map.objects.some((o) => o.id === 'hq-old'));
      assert.ok(!map.objects.some((o) => o.id === 'hq-bankrupt-old'));
      assert.ok(!map.spawns.some((s) => s.id === 'outside-hq-old'));
    }
    const other = { ...fresh, id: 'other', lot: 3 };
    const map = buildCityMap([old, other]);
    assert.ok(map.objects.some((o) => o.id === 'hq-old') && map.objects.some((o) => o.id === 'hq-other'));
    const stamps = map.objects.filter((o) => o.frame === 'stamp/bankrupt');
    assert.deepEqual(stamps.map((o) => o.id), ['hq-bankrupt-old']);
    const hq = map.objects.find((o) => o.id === 'hq-old')!;
    assert.ok(map.objects.indexOf(stamps[0]!) > map.objects.indexOf(hq), '도장은 사옥 뒤에 넣는다');
    assert.equal(stamps[0]!.ty + stamps[0]!.h / 32, hq.ty + hq.h / 32, '바닥 줄이 같다');
    // 둘 다 파산이면 목록에서 먼저 온 것
    const both = buildCityMap([old, { ...old, id: 'old2' }]);
    assert.ok(both.objects.some((o) => o.id === 'hq-bankrupt-old') && !both.objects.some((o) => o.id === 'hq-old2'));
  });
});

describe('도시 맵 v4 — NPC · 상호작용', () => {
  const map = buildCityMap(fullTeams());
  const civic = map.spawns[0]!;

  test('기관 직원 NPC 5명 — 발밑 막힘 · 앞 칸에 같은 id 의 npc 상호작용 · 걸어서 닿는다', () => {
    const want: NpcId[] = ['clerk', 'clinician', 'vc-partner', 'fda-reviewer', 'broker'];
    assert.deepEqual(map.npcs.map((n) => n.npc).sort(), [...want].sort());
    for (const n of map.npcs) {
      assert.equal(n.id, `npc-${n.npc}`);
      assert.equal(n.frame, `char/npc-${n.npc}`);
      assert.ok(n.name.length > 0);
      assert.equal(map.collision[n.ty]![n.tx], 1, `${n.id} 발밑`);
      const it = map.interactables.find((i) => i.id === n.id)!;
      assert.equal(it.kind, 'npc');
      assert.equal(it.npc, n.npc);
      assert.equal(it.enabled, true);
      assert.deepEqual([it.tx, it.ty, it.wTiles, it.hTiles], [n.tx, n.ty + 1, 1, 1], `${n.id} 앞(남쪽) 칸`);
      assert.ok(findPath(map, civic, it).length > 0, `${n.id} 까지 걸어갈 수 있다`);
    }
    const broker = map.npcs.find((n) => n.npc === 'broker')!;
    assert.ok(inExchangeTile(map, broker.tx, broker.ty + 1), '브로커는 객장 안');
  });

  test('기관 상호작용 지점 inst-<kind> 5곳은 그대로 · NPC 는 그 입구 옆', () => {
    const insts = map.interactables.filter((i) => i.id.startsWith('inst-'));
    assert.deepEqual(insts.map((i) => i.id).sort(), ['inst-city-hall', 'inst-exchange', 'inst-fda', 'inst-hospital', 'inst-vc-valley']);
    const npcOf: Record<string, NpcId> = { 'inst-city-hall': 'clerk', 'inst-hospital': 'clinician', 'inst-vc-valley': 'vc-partner', 'inst-fda': 'fda-reviewer', 'inst-exchange': 'broker' };
    for (const it of insts) {
      assert.equal(it.kind, 'institution');
      assert.equal(`inst-${it.institution}`, it.id);
      const npc = map.npcs.find((n) => n.npc === npcOf[it.id])!;
      assert.equal(Math.abs(npc.tx - it.tx) + Math.abs(npc.ty - it.ty), 1, `${it.id} 입구 옆`);
      assert.ok(findPath(map, civic, it).length > 0, it.id);
    }
  });

  test('거래소 단말기 4대 — exchange-terminal-1..4 · 모두 객장 안 · 걸어서 닿는다', () => {
    const terms = map.interactables.filter((i) => i.id.startsWith('exchange-terminal-'));
    assert.deepEqual(terms.map((t) => t.id), ['exchange-terminal-1', 'exchange-terminal-2', 'exchange-terminal-3', 'exchange-terminal-4']);
    for (const t of terms) {
      assert.equal(t.kind, 'institution');
      assert.equal(t.institution, 'exchange');
      assert.equal(t.enabled, true);
      assert.ok(inExchangeTile(map, t.tx, t.ty), t.id);
      assert.ok(findPath(map, civic, t).length > 0, t.id);
      const obj = map.objects.find((o) => o.id === t.id)!;
      assert.equal(obj.frame, 'prop/exchange-terminal');
      assert.equal(map.collision[obj.ty]![obj.tx], 1);
    }
    assert.ok(map.objects.some((o) => o.frame === 'building/exchange-ticker'));
  });

  test('모든 상호작용 지점 · 출입구는 통행 칸이고 시청 앞 광장에서 걸어서 닿는다', () => {
    for (const it of [...map.interactables, ...map.portals]) {
      assert.ok(isWalkableTile(map, it.tx, it.ty), it.id);
      assert.ok(findPath(map, civic, it).length > 0, it.id);
    }
  });
});

describe('도시 맵 v4 — 일반 건물 · 결정성', () => {
  const SIZE: Record<string, [number, number]> = {
    'building/office-a': [96, 96], 'building/office-b': [96, 96], 'building/apartment-a': [96, 96], 'building/apartment-b': [64, 96],
    'building/shop-row': [128, 64], 'building/datacenter': [96, 96], 'building/bank-tower': [96, 128], 'building/campus-wing': [96, 96],
    'building/warehouse': [128, 96], 'building/factory': [128, 96], 'building/parking-garage': [96, 96], 'building/station': [160, 96],
    'building/exchange-ticker': [64, 96], 'prop/exchange-terminal': [32, 48],
  };

  test('새 프레임 크기는 브리프 §7.3 표 그대로 · 막힘 = (w/32)×floor(h/32) · 도로 · 보도 위에 서지 않는다', () => {
    const map = buildCityMap(fullTeams());
    const counted = new Set<string>();
    for (const o of map.objects) {
      const size = SIZE[o.frame];
      if (!size) continue;
      counted.add(o.frame);
      assert.deepEqual([o.w, o.h], size, o.id);
      for (let y = o.ty; y < o.ty + Math.floor(o.h / 32); y++) {
        for (let x = o.tx; x < o.tx + o.w / 32; x++) {
          assert.equal(map.collision[y]![x], 1, `${o.id} (${x},${y})`);
          const f = map.floor[y]![x]!;
          assert.ok(!f.startsWith('tile/road') && f !== 'tile/sidewalk', `${o.id} 이 ${f} 위`);
        }
      }
    }
    assert.equal(counted.size, Object.keys(SIZE).length, '표의 프레임을 모두 쓴다');
    assert.equal(new Set(map.objects.map((o) => o.id)).size, map.objects.length, '오브젝트 id 가 겹치지 않는다');
  });

  test('같은 팀 목록이면 같은 맵 · 일반 건물 배치는 팀 목록과 무관', () => {
    assert.deepEqual(buildCityMap(fullTeams()), buildCityMap(fullTeams()));
    assert.equal(JSON.stringify(buildCityMap(devTeams())), JSON.stringify(buildCityMap(devTeams())));
    const general = (m: TileMapData) => m.objects.filter((o) => o.id.startsWith('bld-')).map((o) => `${o.id}:${o.frame}`);
    assert.deepEqual(general(buildCityMap([])), general(buildCityMap(fullTeams())));
  });

  test('큰 도시 대각선 끝 → 끝 길찾기 — 한 번에 찾고 50ms 안', () => {
    const map = buildCityMap(fullTeams());
    const from = { tx: 1, ty: 1 };
    const to = { tx: 158, ty: 118 };
    assert.ok(isWalkableTile(map, from.tx, from.ty) && isWalkableTile(map, to.tx, to.ty));
    let t0 = performance.now();
    const cold = findPath(map, from, to);
    const coldMs = performance.now() - t0;
    t0 = performance.now();
    const path = findPath(map, from, to);
    const warmMs = performance.now() - t0;
    console.log(`  findPath (1,1)→(158,118): ${path.length}걸음 · 첫 호출 ${coldMs.toFixed(2)}ms · 두 번째 ${warmMs.toFixed(2)}ms`);
    assert.ok(path.length > 0);
    assert.deepEqual(cold, path);
    assert.deepEqual(path.at(-1), to);
    assert.ok(warmMs < 50, `${warmMs.toFixed(2)}ms`);
  });
});

describe('사옥 맵 v4 · 시드', () => {
  const team = DEV_TEAMS[0]!;
  const map = buildHqMap({ id: team.id, companyName: team.companyName, facilities: team.facilities });

  test('zones 는 비고 연구원 NPC 1명 + 앞 칸 상호작용', () => {
    assert.deepEqual(map.zones, []);
    assert.equal(map.npcs.length, 1);
    const n = map.npcs[0]!;
    assert.deepEqual([n.id, n.npc, n.frame], ['npc-researcher', 'researcher', 'char/npc-researcher']);
    assert.equal(map.collision[n.ty]![n.tx], 1);
    const it = map.interactables.find((i) => i.id === 'npc-researcher')!;
    assert.deepEqual([it.kind, it.npc, it.tx, it.ty, it.enabled], ['npc', 'researcher', n.tx, n.ty + 1, true]);
    const entrance = map.spawns.find((s) => s.id === 'entrance')!;
    assert.ok(findPath(map, entrance, it).length > 0);
  });

  test('설비 패드 · 포털 · 보안 게이트 · 도착 지점 좌표는 M3 그대로(verify-m2 가 쓴다)', () => {
    assert.deepEqual(
      map.interactables.filter((i) => i.kind === 'facility').map((i) => [i.id, i.tx, i.ty, i.wTiles, i.hTiles]),
      [
        ['facility-target', 3, 6, 2, 1],
        ['facility-htvs', 8, 6, 2, 1],
        ['facility-docking', 14, 6, 2, 1],
        ['facility-admet', 19, 6, 2, 1],
        ['facility-security', 23, 16, 2, 1],
      ],
    );
    assert.deepEqual(map.portals.map((p) => [p.id, p.tx, p.ty, p.ownerOnly ?? false]), [['hq-exit', 13, 19, false], ['vault-gate', 22, 12, true]]);
    assert.deepEqual(map.spawns.map((s) => [s.id, s.tx, s.ty]), [['entrance', 13, 17], ['vault-inside', 22, 14]]);
    assert.deepEqual(map.portals[0]!.target, { space: 'city', spawnId: `outside-hq-${team.id}` });
  });

  test('개발 시드 — 두 팀 모두 부지 1 · 병원 · AI 지구, publicTeam 에 lot', () => {
    assert.deepEqual(DEV_TEAMS.map((t) => [t.id, t.district, t.lot]), [['team-1', 'hospital', 1], ['team-2', 'compute', 1]]);
    for (const t of DEV_TEAMS) assert.equal(publicTeam(t).lot, 1);
  });
});
