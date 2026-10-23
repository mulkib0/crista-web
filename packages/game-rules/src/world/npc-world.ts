/**
 * 움직이는 NPC(v7)의 공용 판정 — 클라이언트의 근접 표시 · 클릭과 서버의 `INTERACT` · `NPC_TALK` 가 같은 함수를 쓴다(설계서 §6.2-3).
 *
 * - 정적 지점(설비 · 창구 · 안내 · 움직이지 않는 NPC)은 지금 `interactableAt` 과 같은 기준: 지점 중심에서 사거리 + 반 크기.
 * - 움직이는 NPC 는 **서버 현재 위치**(발밑)에서 사거리. 걷는 중이면 보간 지연 여유(`NPC_MOVE.walkingRangeSlackPx`)를 더한다.
 * - 둘 다 사거리 안이면 가까운 쪽, 거리가 같으면 정적 지점이 이긴다. 거리 0 도 성립한다.
 */
import type { Interactable, NpcId, NpcSpot, TileMapData } from '@crista/shared-types';
import { MOVE, NPC_MOVE, NPC_WORK_RADIUS_TILES, TILE_SIZE } from '@crista/shared-types';
import { findPath, interactableAt, inBounds, isWalkableTile, tileCenter } from './grid.ts';

/** 판정 함수에 넣는 움직이는 NPC 한 명 — 서버는 `NpcWorldService`, 클라이언트는 `state.npcs`(보간 전 목표 좌표)에서 만든다. */
export interface DynamicNpcPoint {
  id: string;
  npc: NpcId;
  /** 월드 픽셀(발밑 중심). */
  x: number;
  y: number;
  /** 걷는 중(`walking` · `escorting` 으로 이동 중)인가 — 사거리 여유. */
  walking: boolean;
  label: string;
}

export type InteractTarget =
  | { kind: 'static'; id: string; item: Interactable; distance: number }
  | { kind: 'npc'; id: string; npc: DynamicNpcPoint; distance: number };

/** 움직이는 NPC 의 말 걸기 사거리(px). */
export function npcReachPx(walking: boolean, rangePx: number = MOVE.interactRangePx): number {
  return rangePx + (walking ? NPC_MOVE.walkingRangeSlackPx : 0);
}

function staticDistance(item: Interactable, x: number, y: number): number {
  const cx = (item.tx + item.wTiles / 2) * TILE_SIZE;
  const cy = (item.ty + item.hTiles / 2) * TILE_SIZE;
  return Math.hypot(cx - x, cy - y);
}

/** 그 좌표에서 말 걸 수 있는 가장 가까운 대상(정적 지점 또는 움직이는 NPC). 없으면 null. */
export function interactTargetAt(
  map: TileMapData,
  npcs: readonly DynamicNpcPoint[],
  x: number,
  y: number,
  rangePx: number = MOVE.interactRangePx,
): InteractTarget | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const item = interactableAt(map, x, y, rangePx);
  const fixed: InteractTarget | null = item ? { kind: 'static', id: item.id, item, distance: staticDistance(item, x, y) } : null;
  let best: InteractTarget | null = null;
  for (const npc of npcs) {
    if (!Number.isFinite(npc.x) || !Number.isFinite(npc.y)) continue;
    const d = Math.hypot(npc.x - x, npc.y - y);
    if (d > npcReachPx(npc.walking, rangePx)) continue;
    if (!best || d < best.distance) best = { kind: 'npc', id: npc.id, npc, distance: d };
  }
  if (!fixed) return best;
  if (!best) return fixed;
  return fixed.distance <= best.distance ? fixed : best;
}

/**
 * 그 대상(id)이 사거리 안인가 — 서버의 요청 판정. 정적 지점은 `withinRange`(서버 `world/interact.ts`)와 같은 뜻(그 지점만 따로 재도 사거리 안),
 * 움직이는 NPC 는 현재 위치에서 잰다. 같은 id 가 둘 다 있으면 움직이는 NPC 가 먼저다(맵이 그 NPC 의 정적 지점을 만들지 않는다).
 */
export function withinInteractTarget(
  map: TileMapData,
  npcs: readonly DynamicNpcPoint[],
  at: { x: number; y: number },
  id: string,
  rangePx: number = MOVE.interactRangePx,
): boolean {
  if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return false;
  const npc = npcs.find((n) => n.id === id);
  if (npc) return Number.isFinite(npc.x) && Number.isFinite(npc.y) && Math.hypot(npc.x - at.x, npc.y - at.y) <= npcReachPx(npc.walking, rangePx);
  const item = map.interactables.find((i) => i.id === id);
  if (!item) return false;
  return interactableAt({ ...map, interactables: [item] }, at.x, at.y, rangePx)?.id === id;
}

/**
 * NPC 길찾기에서 더 막을 칸(`findPath` 의 `blocked`) — 소유 팀 전용 포탈(특허 금고 보안 게이트) 칸.
 * 금고는 게이트 한 칸으로만 들어가는 닫힌 방이라 게이트만 막으면 안쪽 전체가 금지 구역이 된다(hq.ts).
 */
export function npcPathBlocker(map: TileMapData): (tx: number, ty: number) => boolean {
  const gates = map.portals.filter((p) => p.ownerOnly);
  if (gates.length === 0) return () => false;
  return (tx, ty) => gates.some((p) => tx >= p.tx && tx < p.tx + p.wTiles && ty >= p.ty && ty < p.ty + p.hTiles);
}

/**
 * 이동 루프가 없는 곳(룸 밖 판정 · 시험)에서 움직이는 NPC 는 홈 칸에 서 있다고 본다 — 판정 입력 대체값.
 * 룸은 `NpcWorldService.dynamicPoints()` 를 쓴다.
 */
export function restingNpcPoints(map: TileMapData): DynamicNpcPoint[] {
  return map.npcs
    .filter((n) => n.mobile)
    .map((n) => {
      const home = homeOf(map, n.npc) ?? { tx: n.tx, ty: n.ty };
      const c = tileCenter(home.tx, home.ty);
      return { id: n.id, npc: n.npc, x: c.x, y: c.y, walking: false, label: n.name };
    });
}

/** 홈 → 지점 유클리드 거리(타일). */
export function spotDistanceTiles(a: { tx: number; ty: number }, b: { tx: number; ty: number }): number {
  return Math.hypot(a.tx - b.tx, a.ty - b.ty);
}

/** 입구 도착 지점 이름(설계서 §6.4) — 사옥 `entrance`, 도시 `civic` · `outside-hq-<teamId>`. */
function isArrivalSpawn(id: string): boolean {
  return id === 'entrance' || id === 'civic' || id.startsWith('outside-hq-');
}

/**
 * 맵의 NPC 지점 규칙 위반을 찾는다(빈 배열 = 통과, 설계서 §6.4 · §10 '지점 데이터'). 맵 생성 시험과 서버 시작 점검이 쓴다.
 * 홈 = 그 역할의 첫 `home` 지점(없으면 `NpcPlacement` 칸).
 */
export function npcSpotProblems(map: TileMapData): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const blocked = npcPathBlocker(map);
  const onTiles = (list: ReadonlyArray<{ tx: number; ty: number; wTiles: number; hTiles: number }>, s: NpcSpot) =>
    list.some((r) => s.tx >= r.tx && s.tx < r.tx + r.wTiles && s.ty >= r.ty && s.ty < r.ty + r.hTiles);
  const exchange = map.zones.find((z) => z.kind === 'exchange-floor') ?? null;
  for (const s of map.npcSpots) {
    if (ids.has(s.id)) problems.push(`${s.id}: id 중복`);
    ids.add(s.id);
    if (!inBounds(map, s.tx, s.ty) || !isWalkableTile(map, s.tx, s.ty)) problems.push(`${s.id}: 걸을 수 없는 칸`);
    if (blocked(s.tx, s.ty)) problems.push(`${s.id}: NPC 금지 칸`);
    if (onTiles(map.portals, s)) problems.push(`${s.id}: 포탈 칸`);
    if (onTiles(map.interactables, s)) problems.push(`${s.id}: 상호작용 칸`);
    for (const sp of map.spawns) {
      if (isArrivalSpawn(sp.id) && Math.max(Math.abs(sp.tx - s.tx), Math.abs(sp.ty - s.ty)) <= 2) problems.push(`${s.id}: 입구 도착 지점 ${sp.id} 2칸 안`);
    }
    if (exchange && s.tx >= exchange.tx && s.tx < exchange.tx + exchange.wTiles && s.ty >= exchange.ty && s.ty < exchange.ty + exchange.hTiles) {
      if (s.roles.some((r) => r !== 'broker')) problems.push(`${s.id}: 객장 안 지점은 broker 만`);
    }
    if (s.label.length < 1 || s.label.length > 80) problems.push(`${s.id}: 문구 길이`);
    for (const role of s.roles) {
      const home = homeOf(map, role);
      if (!home) {
        problems.push(`${s.id}: ${role} 홈 없음`);
        continue;
      }
      if (spotDistanceTiles(home, s) > NPC_WORK_RADIUS_TILES[role] + 1e-9) problems.push(`${s.id}: ${role} 근무 반경 밖`);
      if ((home.tx !== s.tx || home.ty !== s.ty) && findPath(map, home, s, undefined, blocked).length === 0) problems.push(`${s.id}: 홈에서 도달 불가`);
    }
  }
  return problems;
}

/** 그 역할의 홈 칸 — 첫 `home` 지점, 없으면 맵의 NPC 배치 칸. */
export function homeOf(map: TileMapData, role: NpcId): { tx: number; ty: number } | null {
  const spot = map.npcSpots.find((s) => s.kind === 'home' && s.roles.includes(role));
  if (spot) return { tx: spot.tx, ty: spot.ty };
  const placement = map.npcs.find((n) => n.npc === role);
  return placement ? { tx: placement.tx, ty: placement.ty } : null;
}
