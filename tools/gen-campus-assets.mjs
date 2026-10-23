#!/usr/bin/env node
/**
 * 사옥 외관 8종 × 3단계(설계 §4.1) — crista `tools/crista-asset-lib.js` 의 사옥 그리기(`lot` · `facade` · `sign`)와 06 팔레트를 옮겨
 * 96×96 SVG 24장을 만든다. 모둠 잉크(깃발 · 차양 띠 · 간판 테두리)와 간판 글자는 화면(Phaser)이 그 위에 그린다 — 여기 그림은 잉크 중립.
 *
 *   node tools/gen-campus-assets.mjs <출력 폴더>      # 예: apps/web/public/campus
 *
 * 파일: hq-<외관 1..8>-t<단계 1..3>.svg · campus.json(외관 이름 · 문 위치 · 깃대 위치). 같은 입력이면 같은 출력(난수 없음).
 * 단계 — t1 설립 직후 · t2 Series A 이후 · t3 신약 허가(crista 와 같은 뜻).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'apps/web/public/campus');
mkdirSync(out, { recursive: true });

// crista 06 팔레트(`P`) — 값은 crista 와 같다.
const P = {
  floor: '#F8E8C8', grain: '#E8D0B0', raised: '#F8F8F0', white: '#FFFFFF', sunk: '#E8E8E0', edge: '#D8A868', wallLine: '#5A3820',
  bevel: '#B0B0A8', pencil: '#282828', faint: '#606060', equip: '#68A8F8', equipEdge: '#3878C8', glass: '#B8E0F8', grassShade: '#70B848',
};
const B = 96;
const O = `stroke="${P.pencil}" stroke-width="1"`;
const WALL = `stroke="${P.wallLine}" stroke-width="2"`;
const NO = 'stroke="none"';
const r = (x, y, w, h, f, o = O) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f || 'none'}" ${o}/>`;
const pg = (pts, f, o = O) => `<polygon points="${pts}" fill="${f || 'none'}" ${o}/>`;
const pa = (d, f, o = O) => `<path d="${d}" fill="${f || 'none'}" ${o}/>`;
const l = (x1, y1, x2, y2, s = P.pencil, w = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="square"/>`;
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}" shape-rendering="crispEdges">${body}</svg>\n`;

/** 부지 — 바닥 판(crista `lot` 의 해칭 대신 밝은 판). */
const lot = () => r(6, 82, 84, 8, P.raised, O) + l(10, 86, 86, 86, P.sunk, 1);
/** 벽 — 높이 h, 위쪽 y. */
const TOP = (h) => B - h - 16;
const wall = (h, fill, x = 14, w = 68) => r(x, TOP(h), w, h, fill, WALL);
/** 창 격자 — crista `facade` 와 같은 배치 규칙. */
function windows(h, cols, rows, fill = P.equip, x = 22, w = 56) {
  let s = '';
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) s += r(Math.round(x + i * (w / cols)), Math.round(TOP(h) + 8 + (j * (h - 14)) / Math.max(rows, 1)), Math.round(w / cols - 6), 8, fill, WALL);
  return s;
}
/** 문 — 가운데 아래(문 앞 매트는 지구 바닥 타일이 그린다). */
const door = (h = 14) => r(43, 80 - h, 10, h, P.equip, O) + l(48, 80 - h, 48, 80, P.equipEdge, 1);

const TIERS = [
  { h: 30, cols: 2, rows: 1 },
  { h: 48, cols: 3, rows: 2 },
  { h: 66, cols: 3, rows: 4 },
];

/** 외관 8종 — 지붕 · 벽 · 창 · 장식이 다르다. 깃대 위치(flag)는 화면이 잉크 깃발을 꽂는 자리. */
const FACADES = [
  {
    id: 1, name: '평지붕 연구동',
    draw: ({ h, cols, rows }, t) => wall(h, P.edge) + windows(h, cols, rows) + r(24, TOP(h) - 6, 48, 6, t > 1 ? P.equipEdge : P.edge, WALL),
  },
  {
    id: 2, name: '박공지붕 하우스랩',
    draw: ({ h, cols, rows }) => pg(`48,${TOP(h) - Math.min(18, TOP(h) - 1)} 86,${TOP(h)} 10,${TOP(h)}`, P.raised) + l(10, TOP(h), 86, TOP(h)) + wall(h, P.floor) + windows(h, cols, rows),
  },
  {
    id: 3, name: '톱니지붕 파일럿 공장',
    draw: ({ h, cols, rows }) => {
      let roof = '';
      for (let i = 0; i < 4; i++) roof += pg(`${14 + i * 17},${TOP(h)} ${14 + i * 17},${TOP(h) - 10} ${31 + i * 17},${TOP(h)}`, i % 2 ? P.glass : P.sunk);
      return roof + wall(h, P.sunk) + windows(h, cols, rows);
    },
  },
  {
    id: 4, name: '돔 관측동',
    draw: ({ h, cols, rows }) => {
      const ry = Math.min(16, TOP(h) - 2);
      return pa(`M24 ${TOP(h)} a24 ${ry} 0 0 1 48 0 z`, P.glass) + (TOP(h) - ry > 6 ? l(48, TOP(h) - ry, 48, TOP(h) - ry - 6) : '') + wall(h, P.raised) + windows(h, cols, rows);
    },
  },
  {
    id: 5, name: '계단식 타워',
    draw: ({ h, cols, rows }) =>
      wall(Math.max(18, h - 18), P.grain, 10, 76) + r(22, TOP(h), 52, h, P.grain, WALL) + windows(h, cols, rows, P.equip, 28, 44) + r(30, TOP(h) - 4, 36, 4, P.edge, WALL),
  },
  {
    id: 6, name: '유리 커튼월',
    draw: ({ h }) => {
      let grid = wall(h, P.glass);
      for (let x = 22; x < 80; x += 12) grid += l(x, TOP(h) + 2, x, 78, P.equipEdge, 1);
      for (let y = TOP(h) + 10; y < 72; y += 12) grid += l(16, y, 80, y, P.equipEdge, 1);
      return grid + r(14, TOP(h) - 3, 68, 3, P.pencil, NO);
    },
  },
  {
    id: 7, name: '차양 스튜디오',
    draw: ({ h, cols, rows }) => {
      let s = wall(h, P.edge) + windows(h, cols, Math.max(1, rows - 1));
      // 1층 차양 — 흰 띠만 그리고 잉크 띠는 화면이 덧그린다.
      s += pg('12,66 84,66 80,72 16,72', P.raised);
      for (let x = 16; x < 80; x += 8) s += l(x, 66, x - 2, 72, P.sunk, 2);
      return s;
    },
  },
  {
    id: 8, name: '옆탑 본사',
    draw: ({ h, cols, rows }, t) => {
      const top = Math.max(2, TOP(h) - 12 - t * 4);
      return wall(h, P.raised, 14, 54) + windows(h, Math.max(2, cols - 1), rows, P.equip, 20, 42) + r(68, top, 16, 80 - top, P.sunk, WALL) +
        r(72, top + 6, 8, 6, P.equip, WALL) + (top > 8 ? l(76, Math.max(1, top - 12), 76, top) : '');
    },
  },
];

/** 단계 장식 — t2 옥상 설비 띠, t3 옥상 안테나 · 별 표식. */
function tierMarks(t, h) {
  if (t === 2) return r(34, TOP(h) - 3, 10, 3, P.bevel, NO);
  if (t === 3) return l(30, TOP(h) - 10, 30, TOP(h)) + r(28, TOP(h) - 12, 4, 3, P.equipEdge, NO) + pa(`M62 ${TOP(h) + 3} l2 4 4 0 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 0 z`, P.floor, `stroke="${P.wallLine}" stroke-width="1"`);
  return '';
}

const meta = { size: B, door: { x: 48, y: 80 }, facades: [] };
for (const f of FACADES) {
  for (let t = 1; t <= 3; t++) {
    const tier = TIERS[t - 1];
    const body = lot() + f.draw(tier, t) + tierMarks(t, tier.h) + door();
    writeFileSync(join(out, `hq-${f.id}-t${t}.svg`), svg(body));
  }
  meta.facades.push({ id: f.id, name: f.name, flag: { x: 86, y: TOP(TIERS[0].h) } });
}
writeFileSync(join(out, 'campus.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.error(`[gen-campus-assets] 외관 ${FACADES.length}종 × 3단계 → ${out}`);
