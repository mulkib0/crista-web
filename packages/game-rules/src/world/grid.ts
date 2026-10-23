/**
 * 맵 격자 공용 도우미 — 서버 판정과 클라이언트 렌더·길찾기가 같은 함수를 쓴다.
 */
import {
  EXCHANGE_FLOOR_ZONE_ID,
  PATHFIND_MAX_NODES,
  TILE_SIZE,
  type MapZone,
  type TeamId,
  type TileMapData,
  type UserRole,
} from '@crista/shared-types';

export const EMPTY = '';

export function makeGrid<T>(w: number, h: number, fill: T): T[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

export function inBounds(map: TileMapData, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < map.widthTiles && ty < map.heightTiles;
}

export function isWalkableTile(map: TileMapData, tx: number, ty: number): boolean {
  if (!inBounds(map, tx, ty)) return false;
  return (map.collision[ty]?.[tx] ?? 1) === 0;
}

/** 월드 픽셀 좌표(발밑) → 타일 좌표. */
export function tileOf(x: number, y: number): { tx: number; ty: number } {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) };
}

/** 타일 중심 픽셀 좌표. */
export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export function isWalkablePoint(map: TileMapData, x: number, y: number): boolean {
  const { tx, ty } = tileOf(x, y);
  return isWalkableTile(map, tx, ty);
}

/** 사거리 안의 상호작용 지점을 찾는다(없으면 null). */
export function interactableAt(
  map: TileMapData,
  x: number,
  y: number,
  rangePx: number,
): TileMapData['interactables'][number] | null {
  let best: { item: TileMapData['interactables'][number]; d: number } | null = null;
  for (const item of map.interactables) {
    const cx = (item.tx + item.wTiles / 2) * TILE_SIZE;
    const cy = (item.ty + item.hTiles / 2) * TILE_SIZE;
    const d = Math.hypot(cx - x, cy - y);
    const reach = rangePx + (Math.max(item.wTiles, item.hTiles) * TILE_SIZE) / 2;
    if (d <= reach && (!best || d < best.d)) best = { item, d };
  }
  return best?.item ?? null;
}

export function portalAt(
  map: TileMapData,
  x: number,
  y: number,
): TileMapData['portals'][number] | null {
  const { tx, ty } = tileOf(x, y);
  for (const p of map.portals) {
    if (tx >= p.tx && tx < p.tx + p.wTiles && ty >= p.ty && ty < p.ty + p.hTiles) return p;
  }
  return null;
}

export function spawnPoint(
  map: TileMapData,
  spawnId?: string,
): { x: number; y: number; dir: TileMapData['spawns'][number]['dir'] } {
  const spawn = (spawnId ? map.spawns.find((s) => s.id === spawnId) : undefined) ?? map.spawns[0];
  if (!spawn) return { x: TILE_SIZE * 2, y: TILE_SIZE * 2, dir: 'south' };
  const c = tileCenter(spawn.tx, spawn.ty);
  return { x: c.x, y: c.y, dir: spawn.dir };
}

/**
 * 4방향 A* — 클릭 이동 경로. 타일 좌표 배열을 돌려준다(시작 타일 제외, 도착 타일 포함).
 * 열린 목록은 이진 힙이고(큰 도시 160×120 끝에서 끝까지 한 번에), 점수 · 출처는 맵 크기의 타입 배열이다.
 * `maxNodes` 는 확장(꺼내 본) 칸 수 한도 — 넘으면 빈 배열. 같은 f 면 h 가 작은 쪽(목표에 가까운 쪽)을 먼저 꺼내
 * 동점 칸을 덜 훑는다. 난수가 없어 같은 입력이면 같은 경로다.
 * `blocked`(v7, 선택)는 `map.collision` 에 더해 막을 칸 — 서버 NPC 의 권한별 금지 칸(예: 특허 금고 게이트). 공용 맵을 고치지 않는다.
 * 생략하면 지금과 같은 경로다. 빈 배열은 '이미 도착'(출발 = 도착)인지 '갈 수 없음'인지 호출한 쪽이 좌표로 구분한다.
 */
export function findPath(
  map: TileMapData,
  from: { tx: number; ty: number },
  to: { tx: number; ty: number },
  maxNodes: number = PATHFIND_MAX_NODES,
  blocked?: (tx: number, ty: number) => boolean,
): Array<{ tx: number; ty: number }> {
  if (!isWalkableTile(map, to.tx, to.ty) || !inBounds(map, from.tx, from.ty)) return [];
  if (blocked?.(to.tx, to.ty)) return [];
  const width = map.widthTiles;
  const size = width * map.heightTiles;
  const start = from.ty * width + from.tx;
  const goal = to.ty * width + to.tx;
  if (start === goal) return [];

  const g = new Int32Array(size).fill(-1);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  // 힙 항목: 칸 번호 · f · h. 같은 칸이 더 좋은 g 로 다시 들어오면 옛 항목은 꺼낼 때 버린다(지연 삭제).
  const heapK: number[] = [];
  const heapF: number[] = [];
  const heapH: number[] = [];
  const less = (i: number, j: number) =>
    heapF[i]! < heapF[j]! || (heapF[i] === heapF[j] && (heapH[i]! < heapH[j]! || (heapH[i] === heapH[j] && heapK[i]! < heapK[j]!)));
  const swap = (i: number, j: number) => {
    [heapK[i], heapK[j]] = [heapK[j]!, heapK[i]!];
    [heapF[i], heapF[j]] = [heapF[j]!, heapF[i]!];
    [heapH[i], heapH[j]] = [heapH[j]!, heapH[i]!];
  };
  const push = (k: number, f: number, h: number) => {
    heapK.push(k);
    heapF.push(f);
    heapH.push(h);
    let i = heapK.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(i, parent)) break;
      swap(i, parent);
      i = parent;
    }
  };
  const pop = (): number => {
    const top = heapK[0]!;
    const last = heapK.length - 1;
    swap(0, last);
    heapK.pop();
    heapF.pop();
    heapH.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let best = i;
      if (l < heapK.length && less(l, best)) best = l;
      if (r < heapK.length && less(r, best)) best = r;
      if (best === i) break;
      swap(i, best);
      i = best;
    }
    return top;
  };
  const heuristic = (k: number) => Math.abs(to.tx - (k % width)) + Math.abs(to.ty - Math.floor(k / width));

  g[start] = 0;
  push(start, heuristic(start), heuristic(start));
  let expanded = 0;
  let found = false;
  while (heapK.length > 0) {
    const cur = pop();
    if (closed[cur]) continue;
    if (cur === goal) {
      found = true;
      break;
    }
    if (++expanded > maxNodes) break;
    closed[cur] = 1;
    const cx = cur % width;
    const cy = (cur - cx) / width;
    const ng = g[cur]! + 1;
    for (let d = 0; d < 4; d++) {
      const nx = d === 2 ? cx + 1 : d === 3 ? cx - 1 : cx;
      const ny = d === 0 ? cy + 1 : d === 1 ? cy - 1 : cy;
      if (!isWalkableTile(map, nx, ny) || blocked?.(nx, ny)) continue;
      const nk = ny * width + nx;
      if (closed[nk]) continue;
      const old = g[nk]!;
      if (old !== -1 && ng >= old) continue;
      g[nk] = ng;
      cameFrom[nk] = cur;
      const h = heuristic(nk);
      push(nk, ng + h, h);
    }
  }

  if (!found) return [];
  const path: Array<{ tx: number; ty: number }> = [];
  let node = goal;
  while (node !== start) {
    path.push({ tx: node % width, ty: Math.floor(node / width) });
    const prev = cameFrom[node]!;
    if (prev === -1) return [];
    node = prev;
  }
  return path.reverse();
}

// ──────────────────────── 구역 · 도착 지점(v4) ────────────────────────

/** 픽셀 좌표가 들어 있는 구역. 겹치면 `map.zones` 의 앞쪽 것(도시는 객장이 맨 앞). 없으면 null. */
export function zoneAt(map: TileMapData, x: number, y: number): MapZone | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (const z of map.zones) if (pointInZone(z, x, y)) return z;
  return null;
}

/** 픽셀 좌표가 그 id 의 구역 안인가 — 서버의 객장 출입 판정(`EXCHANGE_FLOOR_ZONE_ID`). 모르는 id 면 false. */
export function isInsideZone(map: TileMapData, zoneId: string, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const zone = map.zones.find((z) => z.id === zoneId);
  return zone !== undefined && pointInZone(zone, x, y);
}

function pointInZone(z: MapZone, x: number, y: number): boolean {
  return x >= z.tx * TILE_SIZE && x < (z.tx + z.wTiles) * TILE_SIZE && y >= z.ty * TILE_SIZE && y < (z.ty + z.hTiles) * TILE_SIZE;
}

const OUTSIDE_HQ_PREFIX = 'outside-hq-';

/**
 * 도시 도착 지점 고르기(v4, protocol.ts `JoinOptions.spawnId` 규칙).
 * 1. 요청이 `outside-hq-<그 학급 팀 id>` 이고 맵에 있으면 그것(사옥에서 나올 때).
 * 2. 아니면 학생은 자기 사옥 앞 `outside-hq-<ownTeamId>`(맵에 있을 때 — 그 학급 팀일 때만).
 * 3. 아니면 맵 기본 `spawns[0]`(시청 앞 광장). 교사 · 팀 없는 사람은 늘 여기.
 * 어느 경우든 객장 구역 안의 도착 지점은 고르지 않는다 — 클라이언트가 고른 값으로 객장에 순간이동할 수 없다(PRD §3.1).
 */
export function resolveCitySpawn(
  map: TileMapData,
  args: { requested?: string; ownTeamId: TeamId | null; role: UserRole; classTeamIds: readonly TeamId[] },
): string {
  const usable = (id: string): boolean => {
    const s = map.spawns.find((sp) => sp.id === id);
    if (!s) return false;
    const c = tileCenter(s.tx, s.ty);
    return !isInsideZone(map, EXCHANGE_FLOOR_ZONE_ID, c.x, c.y);
  };
  const { requested, ownTeamId, role, classTeamIds } = args;
  if (requested !== undefined && requested.startsWith(OUTSIDE_HQ_PREFIX)) {
    const teamId = requested.slice(OUTSIDE_HQ_PREFIX.length);
    if (classTeamIds.includes(teamId) && usable(requested)) return requested;
  }
  if (role === 'student' && ownTeamId !== null && classTeamIds.includes(ownTeamId)) {
    const own = `${OUTSIDE_HQ_PREFIX}${ownTeamId}`;
    if (usable(own)) return own;
  }
  return map.spawns[0]?.id ?? '';
}
