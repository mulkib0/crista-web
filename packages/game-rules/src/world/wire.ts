/**
 * 맵 압축(v4) — `TileMapData` ↔ `WireTileMap`(줄 단위 RLE, shared-types `RleLayer` 주석이 규칙).
 * 도시가 160×120 타일로 커져 문자열 격자를 그대로 보내면 입장마다 수백 KB 라, welcome 은 이 형태로 보낸다.
 * 팔레트는 처음 나온 순서로 매기므로 같은 맵이면 같은 결과다. 충돌 레이어 팔레트는 늘 `['0', '1']`.
 */
import type { RleLayer, TileMapData, TileRow, WireTileMap } from '@crista/shared-types';

const COLLISION_PALETTE = ['0', '1'] as const;

function encodeLayer(rows: readonly (readonly (string | number)[])[], palette: string[]): RleLayer {
  const index = new Map<string, number>(palette.map((v, i) => [v, i]));
  const runs: number[] = [];
  let cur = -1;
  let count = 0;
  for (const row of rows) {
    for (const cell of row) {
      const v = String(cell);
      let i = index.get(v);
      if (i === undefined) {
        i = palette.length;
        palette.push(v);
        index.set(v, i);
      }
      if (i === cur) {
        count++;
        continue;
      }
      if (count > 0) runs.push(cur, count);
      cur = i;
      count = 1;
    }
  }
  if (count > 0) runs.push(cur, count);
  return { palette, runs };
}

/** RLE 한 레이어를 펼친다. 반복 수 합이 가로 × 세로가 아니거나 팔레트 번호가 틀리면 예외 — 받은 맵이 깨졌다. */
function decodeLayer(layer: RleLayer, w: number, h: number, name: string): string[][] {
  const { palette, runs } = layer;
  if (!Array.isArray(palette) || !Array.isArray(runs) || runs.length % 2 !== 0) {
    throw new Error(`맵 레이어 ${name} 의 형식이 틀렸습니다`);
  }
  const total = w * h;
  const flat: string[] = new Array<string>(total);
  let pos = 0;
  for (let i = 0; i < runs.length; i += 2) {
    const p = runs[i]!;
    const n = runs[i + 1]!;
    const v = palette[p];
    if (v === undefined || !Number.isInteger(n) || n <= 0 || pos + n > total) {
      throw new Error(`맵 레이어 ${name} 의 반복 정보가 틀렸습니다`);
    }
    flat.fill(v, pos, pos + n);
    pos += n;
  }
  if (pos !== total) throw new Error(`맵 레이어 ${name} 의 칸 수가 ${total} 이 아니라 ${pos} 입니다`);
  const rows: string[][] = [];
  for (let y = 0; y < h; y++) rows.push(flat.slice(y * w, (y + 1) * w));
  return rows;
}

/** 보낼 맵으로 압축한다(바닥 · 표시 · 충돌 레이어만 바뀌고 나머지 칸은 그대로). */
export function encodeTileMap(map: TileMapData): WireTileMap {
  const { floor, marks, collision, ...rest } = map;
  return {
    ...rest,
    encoding: 'rle-v1',
    floor: encodeLayer(floor, []),
    marks: encodeLayer(marks, []),
    collision: encodeLayer(collision, [...COLLISION_PALETTE]),
  };
}

/** 받은 맵을 푼다 — `encodeTileMap` 의 역. */
export function decodeTileMap(wire: WireTileMap): TileMapData {
  const { encoding, floor, marks, collision, ...rest } = wire;
  if (encoding !== 'rle-v1') throw new Error(`알 수 없는 맵 인코딩입니다: ${String(encoding)}`);
  const w = rest.widthTiles;
  const h = rest.heightTiles;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) throw new Error('맵 크기가 틀렸습니다');
  const collisionRows = decodeLayer(collision, w, h, 'collision').map((row) =>
    row.map((v) => {
      if (v !== '0' && v !== '1') throw new Error('맵 레이어 collision 의 값이 0 · 1 이 아닙니다');
      return v === '1' ? 1 : 0;
    }),
  );
  return {
    ...rest,
    floor: decodeLayer(floor, w, h, 'floor') as TileRow[],
    marks: decodeLayer(marks, w, h, 'marks') as TileRow[],
    collision: collisionRows,
  };
}
