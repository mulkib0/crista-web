/**
 * 사옥 지구 배치(설계 §4.1) — 40×26 타일(32px) 거리. 가운데 광장(분수 · LED 기둥)을 위아래 두 줄의 부지 8개가 둘러싼다.
 * 부지 번호(1..N)는 가운데부터 채운다 — 모둠이 둘이면 광장 위 가운데 두 자리.
 * 충돌은 사옥 3×3 · 분수 · 화단 타일만. 길찾기는 4방향 A*(40×26 = 1,040칸이라 한 번에 1ms 안).
 */
import { DISTRICT_MAP } from '@crista-web/web-contract';

export const { cols: COLS, rows: ROWS, tile: TILE } = DISTRICT_MAP;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;

export interface PlotSlot {
  plot: number;
  /** 문 앞 매트 타일. */
  doorCol: number;
  doorRow: number;
  /** 사옥 3×3 의 왼쪽 위 타일. */
  col0: number;
  row0: number;
}

const TOP_ROW0 = 4;
const BOTTOM_ROW0 = 17;
const ORDER: Array<[number, 'top' | 'bottom']> = [
  [14, 'top'], [25, 'top'], [14, 'bottom'], [25, 'bottom'], [5, 'top'], [34, 'top'], [5, 'bottom'], [34, 'bottom'],
];

export const PLOTS: PlotSlot[] = ORDER.map(([col, side], i) => {
  const row0 = side === 'top' ? TOP_ROW0 : BOTTOM_ROW0;
  return { plot: i + 1, doorCol: col, doorRow: row0 + 3, col0: col - 1, row0 };
});

export const PLAZA = { col0: 15, row0: 10, col1: 24, row1: 15 } as const;
export const FOUNTAIN = { col0: 19, row0: 12 } as const; // 2×2
export const LED_POST = { col0: 17, row0: 9, width: 6 } as const;
export const SPAWN = { x: 20 * TILE + 16, y: 15 * TILE + 28 } as const;
export const PLANTERS: Array<[number, number]> = [
  [1, 1], [38, 1], [1, 24], [38, 24], [6, 12], [33, 12], [6, 14], [33, 14], [15, 9], [24, 9], [15, 16], [24, 16],
];

/**
 * 길 — 가로 두 줄(위 사옥들 문 앞 8행 · 아래 사옥들 문 앞 21행), 양옆 세로 길(9 · 30열), 광장에서 아래 길로 내려가는 20열,
 * 위 문 앞에서 광장으로 내려가는 짧은 세로 길(부지 열, 8~9행). 아래 사옥은 문이 아래쪽이라 아래 길(21행)로 들어간다.
 */
export const ROADS = {
  rows: [8, 21] as const,
  cols: [{ col: 9, from: 8, to: 21 }, { col: 30, from: 8, to: 21 }, { col: 20, from: 16, to: 21 }],
};

/** 걸을 수 없는 칸. */
export function buildBlocked(plotCount: number): boolean[][] {
  const blocked = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  const mark = (c: number, r: number) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) blocked[r]![c] = true;
  };
  for (const slot of PLOTS.slice(0, plotCount)) for (let dc = 0; dc < 3; dc++) for (let dr = 0; dr < 3; dr++) mark(slot.col0 + dc, slot.row0 + dr);
  for (let dc = 0; dc < 2; dc++) for (let dr = 0; dr < 2; dr++) mark(FOUNTAIN.col0 + dc, FOUNTAIN.row0 + dr);
  for (let dc = 0; dc < LED_POST.width; dc++) mark(LED_POST.col0 + dc, LED_POST.row0);
  for (const [c, r] of PLANTERS) mark(c, r);
  return blocked;
}

export const tileOf = (x: number, y: number) => ({ c: Math.floor(x / TILE), r: Math.floor(y / TILE) });
export const tileCenter = (c: number, r: number) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

export function walkable(blocked: boolean[][], x: number, y: number): boolean {
  if (x < 4 || y < 8 || x > WIDTH - 4 || y > HEIGHT - 2) return false;
  const { c, r } = tileOf(x, y);
  return !blocked[r]?.[c];
}

/** 4방향 A* — 경유점(타일 중심) 목록. 도착 칸이 막혔으면 가장 가까운 열린 이웃으로. 못 가면 빈 배열. */
export function findPath(blocked: boolean[][], fromX: number, fromY: number, toX: number, toY: number): Array<{ x: number; y: number }> {
  const start = tileOf(fromX, fromY);
  let goal = tileOf(toX, toY);
  if (blocked[goal.r]?.[goal.c] !== false) {
    const near = [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [1, 1], [-1, 1]]
      .map(([dc, dr]) => ({ c: goal.c + dc!, r: goal.r + dr! }))
      .find((t) => blocked[t.r]?.[t.c] === false);
    if (!near) return [];
    goal = near;
  }
  const key = (c: number, r: number) => r * COLS + c;
  const h = (c: number, r: number) => Math.abs(c - goal.c) + Math.abs(r - goal.r);
  const open: Array<{ c: number; r: number; f: number }> = [{ c: start.c, r: start.r, f: h(start.c, start.r) }];
  const g = new Map<number, number>([[key(start.c, start.r), 0]]);
  const came = new Map<number, number>();
  const closed = new Set<number>();
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i]!.f < open[best]!.f) best = i;
    const cur = open.splice(best, 1)[0]!;
    const ck = key(cur.c, cur.r);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.c === goal.c && cur.r === goal.r) {
      const out: Array<{ x: number; y: number }> = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(start.c, start.r)) {
        out.unshift(tileCenter(k % COLS, Math.floor(k / COLS)));
        k = came.get(k);
      }
      return out;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const c = cur.c + dc;
      const r = cur.r + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS || blocked[r]![c]) continue;
      const nk = key(c, r);
      const ng = (g.get(ck) ?? 0) + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.push({ c, r, f: ng + h(c, r) });
      }
    }
  }
  return [];
}
