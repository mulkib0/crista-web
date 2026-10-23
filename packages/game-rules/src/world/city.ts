/**
 * 바이오 클러스터 시티 — 외부 월드 맵 (PRD §2 · ARCHITECTURE §1.1 · M4 브리프 §5.1).
 * 용지: 제도용 지도(아트디렉션 §4 ①). 160×120 타일(5,120×3,840px).
 * 뼈대: 외곽 순환도로 · 3칸 대로(차로 · 중앙분리대 · 차로) · 골목 · 블록 · 중앙 증권거래소 광장(#s50) ·
 * 북쪽 행정 타운 · 북서 대학병원 캠퍼스 · 4대 특화 지구(지구마다 부지 4곳) · 강과 다리 3곳 · 공원 · 주거 · 상업 · 역.
 * 타일 32px · 오브젝트 막힘 영역 = (w/32)×floor(h/32) 타일 — 클라이언트 `buildObject` 가 바닥 줄을 floor(h/32) 로 잡는 것과 같다.
 * 난수를 쓰지 않는다 — 같은 팀 목록이면 항상 같은 맵이고, 일반 건물 배치는 팀 목록과 무관하다.
 */
import type {
  CompanyStatus,
  DistrictType,
  DistrictZone,
  Interactable,
  InstitutionKind,
  MapObject,
  MapZone,
  NpcId,
  NpcPlacement,
  Portal,
  Spawn,
  TileMapData,
  TileRow,
} from '@crista/shared-types';
import { DISTRICT_LABEL, EXCHANGE_FLOOR_ZONE_ID, INSTITUTION_LABEL, LOTS_PER_DISTRICT, TILE_SIZE } from '@crista/shared-types';
import { BANKRUPT_STAMP_FRAME } from '../economy.ts';
import { EMPTY, makeGrid } from './grid.ts';

export interface CityTeamSeed {
  id: string;
  companyName: string;
  district: DistrictType;
  hqTier: 1 | 2 | 3;
  /** 팀 잉크 1~4 — 소유 깃발 프레임 `building/owner-team-<n>`. */
  inkIndex: 1 | 2 | 3 | 4;
  /**
   * 회사 상태(v3, 공개 정보 — shared-types `PublicTeam.status`). 생략 = 운영 중.
   * 'bankrupt' 면 사옥 건물 위에 `stamp/bankrupt` 오브젝트를 하나 더 둔다. `voided` 회사는 서버가 목록에서 뺀다.
   */
  status?: CompanyStatus;
  /** (v10) 산 소품(`PublicTeam.props`) — 'landmark' 면 사옥 옥상에 랜드마크 간판을 둔다. */
  props?: readonly string[];
  /** 지구 안 부지 번호 1~4(v4, `PublicTeam.lot`). 생략 · 범위 밖 = 1. */
  lot?: number;
}

const W = 160;
const H = 120;
/** 외곽 순환도로 — x=2 · x=157 · y=2 · y=117 (1칸). */
const RING = { x0: 2, y0: 2, x1: W - 3, y1: H - 3 } as const;
/** 세로 대로의 중앙분리대 x — 차로는 그 양옆 칸. */
const AVENUE_V = [40, 80, 120] as const;
/** 가로 대로의 중앙분리대 y. */
const AVENUE_H = [30, 60] as const;
/** x=80 · y=60 대로는 광장 가장자리에서 끝난다. */
const CENTER_AVENUE_X = 80;
const CENTER_AVENUE_Y = 60;

interface Rect {
  tx: number;
  ty: number;
  w: number;
  h: number;
}

/** 증권거래소 광장 #s50 — 둘레 2칸(위아래 1칸)은 광장 포장, 안쪽이 객장. */
const PLAZA: Rect = { tx: 68, ty: 52, w: 24, h: 16 };
const EXCHANGE_FLOOR: Rect = { tx: 70, ty: 53, w: 20, h: 14 };
/** 강 — 북쪽 둑 · 물 3줄 · 남쪽 둑. 다리는 세로 대로 세 곳뿐이다(외곽 순환도로는 강에서 끊긴다). */
const RIVER = { ty: 96, h: 5 } as const;

/** 골목(1칸 도로) — 세로 [x, y0, y1] · 가로 [y, x0, x1]. 강변로(y=94)와 남쪽 골목(y=108)도 여기서 긋는다. */
const ALLEYS_V: ReadonlyArray<readonly [number, number, number]> = [
  [20, 32, 58], [20, 62, 93], [20, 109, 116],
  [58, 32, 48],
  [100, 3, 28], [100, 32, 48], [100, 72, 93],
  [139, 32, 58], [139, 62, 93], [139, 109, 116],
];
const ALLEYS_H: ReadonlyArray<readonly [number, number, number]> = [
  [15, 42, 78], [15, 82, 118], [15, 122, 156],
  [45, 3, 38], [45, 122, 156],
  [49, 42, 118],
  [71, 82, 118], [83, 82, 118],
  [78, 3, 38], [78, 122, 156],
  [94, 3, 156],
  [108, 3, 156],
];
/** 대로 중앙분리대의 보행 횡단 틈 — 시청 앞 광장을 가로지르는 횡단보도. */
const MEDIAN_GAPS: ReadonlyArray<readonly [number, number]> = [
  [CENTER_AVENUE_X, 42],
  [CENTER_AVENUE_X, 43],
];

/** 3×3 건물 배치 — 좌상단 타일. */
interface Placement {
  tx: number;
  ty: number;
}

/**
 * 공공기관 5곳. 입구는 건물 아래 가운데 칸(`inst-<kind>` 상호작용 지점), 그 오른쪽 칸에 기관 직원 NPC 가 서고
 * NPC 앞 칸이 같은 id 의 `npc` 상호작용 지점이다(브리프 §4.1).
 */
const INSTITUTIONS: Array<{ kind: InstitutionKind; at: Placement; npc: NpcId; npcName: string }> = [
  { kind: 'city-hall', at: { tx: 68, ty: 35 }, npc: 'clerk', npcName: '시청 · 특허청 민원 담당 윤 주무관' },
  { kind: 'fda', at: { tx: 88, ty: 35 }, npc: 'fda-reviewer', npcName: 'FDA 규제심사청 문 심사관' },
  { kind: 'hospital', at: { tx: 19, ty: 9 }, npc: 'clinician', npcName: '대학병원 임상센터 한 교수' },
  { kind: 'vc-valley', at: { tx: 112, ty: 53 }, npc: 'vc-partner', npcName: 'VC 샌드힐 밸리 서 파트너' },
  { kind: 'exchange', at: { tx: 78, ty: 53 }, npc: 'broker', npcName: '증권거래소 객장 강 중개인' },
];

/** 객장 단말기 4대 — 단말기 칸은 막히고, 그 아래 칸이 상호작용 지점이다(모두 객장 구역 안). */
const TERMINALS: readonly Placement[] = [
  { tx: 74, ty: 58 },
  { tx: 85, ty: 58 },
  { tx: 74, ty: 63 },
  { tx: 85, ty: 63 },
];

/**
 * 지구 배치. 부지는 3×3, 입구는 아래 가운데 칸, 그 아래 칸이 `outside-hq-<teamId>` 도착 지점이다.
 * `lots[0]` 이 부지 1 — 지구 안에서 객장에 가장 가까운 부지부터 번호를 매긴다.
 */
const DISTRICT_SLOTS: Record<DistrictType, { zone: DistrictZone; marker: Placement; lots: readonly Placement[] }> = {
  hospital: {
    zone: { id: 'zone-hospital', district: 'hospital', tx: 44, ty: 6, wTiles: 33, hTiles: 21, label: DISTRICT_LABEL.hospital },
    marker: { tx: 72, ty: 18 },
    lots: [{ tx: 66, ty: 18 }, { tx: 60, ty: 18 }, { tx: 66, ty: 10 }, { tx: 60, ty: 10 }],
  },
  compute: {
    zone: { id: 'zone-compute', district: 'compute', tx: 123, ty: 6, wTiles: 33, hTiles: 21, label: DISTRICT_LABEL.compute },
    marker: { tx: 136, ty: 18 },
    lots: [{ tx: 124, ty: 18 }, { tx: 130, ty: 18 }, { tx: 124, ty: 10 }, { tx: 130, ty: 10 }],
  },
  vc: {
    zone: { id: 'zone-vc', district: 'vc', tx: 93, ty: 50, wTiles: 26, hTiles: 21, label: DISTRICT_LABEL.vc },
    marker: { tx: 106, ty: 53 },
    lots: [{ tx: 94, ty: 53 }, { tx: 100, ty: 53 }, { tx: 94, ty: 63 }, { tx: 100, ty: 63 }],
  },
  industry: {
    zone: { id: 'zone-industry', district: 'industry', tx: 4, ty: 101, wTiles: 73, hTiles: 15, label: DISTRICT_LABEL.industry },
    marker: { tx: 18, ty: 103 },
    lots: [{ tx: 12, ty: 103 }, { tx: 6, ty: 103 }, { tx: 12, ty: 110 }, { tx: 6, ty: 110 }],
  },
};

const DISTRICT_FRAME: Record<DistrictType, string> = {
  hospital: 'building/district-hospital',
  compute: 'building/district-compute',
  vc: 'building/district-vc',
  industry: 'building/district-industry',
};

/** 일반 건물 프레임과 원본 크기(브리프 §7.3). */
const BUILDING_SIZE = {
  'building/office-a': [96, 96],
  'building/office-b': [96, 96],
  'building/apartment-a': [96, 96],
  'building/apartment-b': [64, 96],
  'building/shop-row': [128, 64],
  'building/datacenter': [96, 96],
  'building/bank-tower': [96, 128],
  'building/campus-wing': [96, 96],
  'building/warehouse': [128, 96],
  'building/factory': [128, 96],
  'building/parking-garage': [96, 96],
  'building/station': [160, 96],
} as const satisfies Record<string, readonly [number, number]>;
type BuildingFrame = keyof typeof BUILDING_SIZE;

/**
 * 블록 채우기 — 블록 사각형 [x0, y0, x1, y1] 안의 빈 땅에 일반 건물을 줄지어 세운다(사이 1칸은 걷는 길).
 * 구역 특수 배치(부지 · 기관 · 광장 · 공원)를 먼저 한 뒤라 이미 칠한 칸 · 막힌 칸 · 예약 칸은 건너뛴다.
 */
const FILLS: ReadonlyArray<{ rect: readonly [number, number, number, number]; frames: readonly BuildingFrame[]; gap?: number }> = [
  // 북쪽 줄 — 대학병원 인접 지구 나머지 · 상업(북) · AI 지구 데이터센터
  { rect: [42, 3, 78, 28], frames: ['building/office-a', 'building/campus-wing', 'building/office-b'] },
  { rect: [82, 3, 118, 28], frames: ['building/office-a', 'building/shop-row', 'building/office-b', 'building/parking-garage'] },
  { rect: [122, 3, 156, 28], frames: ['building/datacenter'] },
  // 둘째 줄 — 주거(서) · 상업(행정 타운 서쪽) · VC 금융가 북쪽 · 상업(동)
  { rect: [3, 32, 38, 58], frames: ['building/apartment-a', 'building/apartment-b', 'building/apartment-a', 'building/shop-row'] },
  { rect: [42, 32, 57, 58], frames: ['building/office-b', 'building/office-a', 'building/shop-row'] },
  { rect: [42, 50, 67, 58], frames: ['building/shop-row', 'building/office-a'] },
  { rect: [101, 32, 118, 48], frames: ['building/bank-tower', 'building/office-b'] },
  { rect: [92, 50, 118, 58], frames: ['building/bank-tower'] },
  { rect: [122, 32, 156, 58], frames: ['building/office-a', 'building/bank-tower', 'building/office-b', 'building/parking-garage', 'building/shop-row'] },
  // 셋째 줄 — 주거(서) · VC 금융가 남쪽 · 상업(가운데) · 주거(동)
  { rect: [3, 62, 38, 93], frames: ['building/apartment-b', 'building/apartment-a', 'building/apartment-b', 'building/parking-garage'], gap: 2 },
  { rect: [92, 62, 118, 70], frames: ['building/bank-tower', 'building/office-b'] },
  { rect: [82, 72, 118, 93], frames: ['building/shop-row', 'building/office-a', 'building/shop-row', 'building/office-b'] },
  { rect: [122, 62, 156, 93], frames: ['building/apartment-a', 'building/apartment-b', 'building/shop-row', 'building/apartment-a'], gap: 2 },
  // 강 남쪽 — 산업단지 창고 · 공장 · 역 주변 · 주거(남)
  { rect: [3, 101, 78, 116], frames: ['building/warehouse', 'building/factory'] },
  { rect: [82, 101, 118, 116], frames: ['building/parking-garage', 'building/shop-row', 'building/office-a'] },
  { rect: [122, 101, 156, 116], frames: ['building/apartment-a', 'building/apartment-b'], gap: 2 },
];

/** 구역(v4) — 미니맵 · 안내용. 객장이 맨 앞이다(`zoneAt` 은 앞의 것을 먼저 고른다). 지구 4곳은 `districts` 와 같은 id. */
const ZONES_AFTER_DISTRICTS: readonly MapZone[] = [
  { id: 'zone-civic', kind: 'civic', tx: 59, ty: 33, wTiles: 41, hTiles: 15, label: '행정 타운 — 시청 앞 광장' },
  { id: 'zone-medical', kind: 'medical', tx: 4, ty: 4, wTiles: 34, hTiles: 24, label: '대학병원 캠퍼스' },
  { id: 'zone-river', kind: 'river', tx: 0, ty: RIVER.ty, wTiles: W, hTiles: RIVER.h, label: '강' },
  { id: 'zone-park', kind: 'park', tx: 43, ty: 68, wTiles: 35, hTiles: 25, label: '중앙 공원' },
  { id: 'zone-park-west', kind: 'park', tx: 21, ty: 79, wTiles: 17, hTiles: 14, label: '서쪽 쌈지 공원' },
  { id: 'zone-residential-west', kind: 'residential', tx: 3, ty: 32, wTiles: 36, hTiles: 62, label: '서쪽 주거지' },
  { id: 'zone-residential-east', kind: 'residential', tx: 122, ty: 62, wTiles: 35, hTiles: 32, label: '동쪽 주거지' },
  { id: 'zone-residential-south', kind: 'residential', tx: 122, ty: 101, wTiles: 35, hTiles: 16, label: '강 남쪽 주거지' },
  { id: 'zone-commercial-north', kind: 'commercial', tx: 82, ty: 3, wTiles: 37, hTiles: 26, label: '북쪽 상업지' },
  { id: 'zone-commercial-west', kind: 'commercial', tx: 42, ty: 32, wTiles: 16, hTiles: 27, label: '행정 타운 서쪽 상가' },
  { id: 'zone-commercial-east', kind: 'commercial', tx: 122, ty: 32, wTiles: 35, hTiles: 27, label: '동쪽 오피스가' },
  { id: 'zone-commercial-center', kind: 'commercial', tx: 82, ty: 71, wTiles: 37, hTiles: 23, label: '중앙 상가' },
  { id: 'zone-transit', kind: 'transit', tx: 82, ty: 101, wTiles: 37, hTiles: 16, label: '중앙역' },
];

/** 역 · 주차 · 정류장 — 상업 · 교통 배치. */
const STATION: Placement = { tx: 96, ty: 102 };
const BUS_STOPS: ReadonlyArray<readonly [number, number]> = [
  [43, 58], [117, 32], [83, 107], [117, 107], [38, 90], [122, 90], [78, 33], [3, 50],
];

function roadFrame(road: boolean[][], tx: number, ty: number): string {
  const at = (x: number, y: number) => road[y]?.[x] === true;
  const n = at(tx, ty - 1);
  const s = at(tx, ty + 1);
  const e = at(tx + 1, ty);
  const w = at(tx - 1, ty);
  const count = [n, s, e, w].filter(Boolean).length;
  if (count === 4) return 'tile/road-intersection';
  if (count === 3) {
    if (!n) return 'tile/road-t-south';
    if (!s) return 'tile/road-t-north';
    if (!e) return 'tile/road-t-west';
    return 'tile/road-t-east';
  }
  if (count === 2) {
    if (n && s) return 'tile/road-vertical';
    if (e && w) return 'tile/road-asphalt';
    if (w && s) return 'tile/road-curve-west-south';
    if (n && w) return 'tile/road-curve-north-west';
    if (e && n) return 'tile/road-curve-east-north';
    return 'tile/road-curve-south-east';
  }
  return n || s ? 'tile/road-vertical' : 'tile/road-asphalt';
}

/** 부지 번호 1~4 → 배열 위치. 생략 · 정수가 아님 · 범위 밖은 부지 1. */
function lotIndex(lot: number | undefined): number {
  return lot !== undefined && Number.isInteger(lot) && lot >= 1 && lot <= LOTS_PER_DISTRICT ? lot - 1 : 0;
}

/** 도시 맵을 만든다. 같은 팀 목록이면 항상 같은 결과가 나오는 결정적 생성이다. */
export function buildCityMap(teams: readonly CityTeamSeed[]): TileMapData {
  const floor = makeGrid<string>(W, H, EMPTY);
  const marks = makeGrid<string>(W, H, EMPTY);
  const collision = makeGrid<number>(W, H, 0);
  /** 건물 채우기가 쓰면 안 되는 칸 — 입구 · 도착 지점 · 상호작용 지점 · 깃발. 팀 유무와 무관하게 같은 칸을 잡는다. */
  const reserved = makeGrid<boolean>(W, H, false);
  const objects: MapObject[] = [];
  const portals: Portal[] = [];
  const interactables: Interactable[] = [];
  const spawns: Spawn[] = [];
  const npcs: NpcPlacement[] = [];
  const districts: DistrictZone[] = Object.values(DISTRICT_SLOTS).map((s) => s.zone);

  const block = (tx: number, ty: number, w = 1, h = 1) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
      if (collision[y]?.[x] !== undefined) collision[y]![x] = 1;
    }
  };
  const paint = (tx: number, ty: number, w: number, h: number, frame: string) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
      if (floor[y]?.[x] !== undefined) floor[y]![x] = frame;
    }
  };
  const reserve = (tx: number, ty: number, w = 1, h = 1) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
      if (reserved[y]?.[x] !== undefined) reserved[y]![x] = true;
    }
  };
  /** 바닥 소품 한 칸(분수 · 나무 · 벤치 · 정류장) — 막힌다. */
  const prop = (tx: number, ty: number, frame: string) => {
    if (floor[ty]?.[tx] === undefined) return;
    floor[ty]![tx] = frame;
    block(tx, ty);
  };

  // ── 도로망 ──
  const road = makeGrid<boolean>(W, H, false);
  const median = makeGrid<boolean>(W, H, false);
  const setRoad = (x: number, y: number) => {
    if (road[y]?.[x] !== undefined) road[y]![x] = true;
  };
  for (let x = RING.x0; x <= RING.x1; x++) {
    setRoad(x, RING.y0);
    setRoad(x, RING.y1);
  }
  for (let y = RING.y0; y <= RING.y1; y++) {
    setRoad(RING.x0, y);
    setRoad(RING.x1, y);
  }
  for (const mx of AVENUE_V) {
    for (let y = RING.y0; y <= RING.y1; y++) {
      if (mx === CENTER_AVENUE_X && y >= PLAZA.ty && y < PLAZA.ty + PLAZA.h) continue;
      setRoad(mx - 1, y);
      setRoad(mx + 1, y);
      median[y]![mx] = true;
    }
  }
  for (const my of AVENUE_H) {
    for (let x = RING.x0; x <= RING.x1; x++) {
      if (my === CENTER_AVENUE_Y && x >= PLAZA.tx && x < PLAZA.tx + PLAZA.w) continue;
      setRoad(x, my - 1);
      setRoad(x, my + 1);
      if (median[my]![x]) road[my]![x] = true; // 두 분리대가 만나는 칸 = 교차로 한가운데
      else median[my]![x] = true;
    }
  }
  for (const [x, y0, y1] of ALLEYS_V) for (let y = y0; y <= y1; y++) setRoad(x, y);
  for (const [y, x0, x1] of ALLEYS_H) for (let x = x0; x <= x1; x++) setRoad(x, y);
  // 분리대는 길이 닿는 곳에서 끊긴다 — 차로가 지나가는 칸, 옆 블록에서 골목 · 가로 도로가 붙는 칸.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!median[y]![x]) continue;
      const vertical = (AVENUE_V as readonly number[]).includes(x) && !(AVENUE_H as readonly number[]).includes(y);
      const crossing = vertical
        ? road[y]![x - 2] === true || road[y]![x + 2] === true
        : road[y - 2]?.[x] === true || road[y + 2]?.[x] === true;
      if (road[y]![x] || crossing) {
        median[y]![x] = false;
        road[y]![x] = true;
      }
    }
  }
  for (const [x, y] of MEDIAN_GAPS) {
    median[y]![x] = false;
    road[y]![x] = true;
  }
  // 강 — 도로를 지우고 세로 대로 세 곳만 다리로 잇는다.
  const bridgeCols = new Set<number>(AVENUE_V.flatMap((mx) => [mx - 1, mx, mx + 1]));
  for (let y = RIVER.ty; y < RIVER.ty + RIVER.h; y++) {
    for (let x = 0; x < W; x++) {
      road[y]![x] = false;
      median[y]![x] = false;
      if (bridgeCols.has(x)) {
        floor[y]![x] = 'tile/bridge-deck';
        continue;
      }
      floor[y]![x] =
        y === RIVER.ty ? 'tile/water-bank-north' : y === RIVER.ty + RIVER.h - 1 ? 'tile/water-bank-south' : 'tile/water';
      block(x, y);
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (road[y]![x]) floor[y]![x] = roadFrame(road, x, y);
      else if (median[y]![x]) {
        floor[y]![x] = 'tile/median';
        block(x, y);
      }
    }
  }
  // 횡단보도 — 대로끼리 만나는 교차로 바로 바깥 차로 칸, 시청 앞 횡단 틈 양옆 차로.
  for (const mx of AVENUE_V) {
    for (const my of AVENUE_H) {
      for (const [x, y] of [
        [mx - 1, my - 2], [mx + 1, my - 2], [mx - 1, my + 2], [mx + 1, my + 2],
        [mx - 2, my - 1], [mx - 2, my + 1], [mx + 2, my - 1], [mx + 2, my + 1],
      ] as const) {
        if (road[y]?.[x]) floor[y]![x] = 'tile/road-cross';
      }
    }
  }
  for (const [x, y] of MEDIAN_GAPS) {
    for (const dx of [-1, 0, 1]) floor[y]![x + dx] = 'tile/road-cross';
  }
  // 보도 — 도로에 붙은 빈 칸
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (road[y]![x] || floor[y]![x] !== EMPTY) continue;
      if (road[y - 1]?.[x] || road[y + 1]?.[x] || road[y]![x - 1] || road[y]![x + 1]) floor[y]![x] = 'tile/sidewalk';
    }
  }

  // ── 증권거래소 광장 #s50 · 객장 ──
  paint(PLAZA.tx, PLAZA.ty, PLAZA.w, PLAZA.h, 'tile/plaza-tile');
  paint(EXCHANGE_FLOOR.tx, EXCHANGE_FLOOR.ty, EXCHANGE_FLOOR.w, EXCHANGE_FLOOR.h, 'tile/exchange-floor');
  prop(72, 61, 'tile/plaza-fountain');
  prop(87, 61, 'tile/plaza-fountain');
  for (const [x, y] of [[76, 65], [83, 65], [71, 56], [88, 56]] as const) prop(x, y, 'tile/street-bench');
  objects.push({
    id: 'exchange-ticker',
    frame: 'building/exchange-ticker',
    tx: 79,
    ty: 60,
    w: 64,
    h: 96,
    label: '#s50 전광판',
    shadow: 'medium',
  });
  block(79, 60, 2, 3);
  TERMINALS.forEach((t, i) => {
    const id = `exchange-terminal-${i + 1}`;
    objects.push({ id, frame: 'prop/exchange-terminal', tx: t.tx, ty: t.ty, w: 32, h: 48, label: `거래소 단말기 ${i + 1}`, shadow: 'small' });
    block(t.tx, t.ty);
    interactables.push({
      id,
      kind: 'institution',
      institution: 'exchange',
      tx: t.tx,
      ty: t.ty + 1,
      wTiles: 1,
      hTiles: 1,
      label: `거래소 단말기 ${i + 1}`,
      enabled: true,
    });
  });

  // ── 행정 타운 — 시청 앞 광장 ──
  paint(60, 39, 19, 8, 'tile/plaza-tile');
  paint(82, 39, 17, 8, 'tile/plaza-tile');
  for (const x of [62, 66, 92, 96]) prop(x, 41, 'tile/street-tree');
  for (const x of [62, 66, 92, 96]) prop(x, 45, 'tile/planter');
  for (const x of [71, 86]) prop(x, 45, 'tile/street-bench');

  // ── 대학병원 캠퍼스 ──
  paint(5, 5, 32, 22, 'tile/park-grass');
  paint(17, 12, 7, 3, 'tile/plaza-tile');
  paint(20, 15, 1, 13, 'tile/park-path');
  paint(5, 20, 32, 1, 'tile/park-path');
  for (const [x, y] of [[7, 7], [11, 7], [26, 7], [30, 7], [7, 13], [11, 13], [26, 13], [30, 13], [7, 22], [11, 22], [26, 22], [30, 22]] as const) {
    objects.push({ id: `bld-campus-wing-${x}-${y}`, frame: 'building/campus-wing', tx: x, ty: y, w: 96, h: 96, shadow: 'large' });
    block(x, y, 3, 3);
  }
  for (const [x, y] of [[16, 17], [24, 17], [16, 24], [24, 24], [6, 18], [35, 18]] as const) prop(x, y, 'tile/street-tree');

  // ── 중앙 공원 · 서쪽 쌈지 공원 ──
  paint(44, 64, 23, 4, 'tile/park-grass');
  paint(44, 68, 34, 25, 'tile/park-grass');
  paint(44, 80, 34, 1, 'tile/park-path');
  paint(55, 64, 1, 29, 'tile/park-path');
  paint(53, 78, 5, 5, 'tile/plaza-tile');
  prop(55, 80, 'tile/plaza-fountain');
  for (const [x, y] of [[47, 67], [51, 67], [60, 67], [64, 67], [47, 73], [64, 73], [47, 87], [51, 87], [60, 87], [64, 87], [50, 90], [61, 90], [70, 72], [74, 72], [70, 88], [74, 88]] as const) {
    prop(x, y, 'tile/street-tree');
  }
  for (const [x, y] of [[53, 76], [57, 76], [53, 84], [57, 84], [46, 81], [65, 81]] as const) prop(x, y, 'tile/street-bench');
  paint(22, 80, 15, 12, 'tile/park-grass');
  paint(22, 85, 15, 1, 'tile/park-path');
  for (const [x, y] of [[24, 82], [28, 82], [32, 82], [24, 89], [28, 89], [32, 89]] as const) prop(x, y, 'tile/street-tree');
  prop(30, 86, 'tile/street-bench');

  // ── 역 · 주차 ──
  objects.push({ id: 'transit-station', frame: 'building/station', tx: STATION.tx, ty: STATION.ty, w: 160, h: 96, label: '중앙역', shadow: 'large' });
  block(STATION.tx, STATION.ty, 5, 3);
  paint(STATION.tx - 3, STATION.ty + 3, 11, 2, 'tile/plaza-tile');
  paint(84, 110, 11, 5, 'tile/parking-lot');
  floor[110]![89] = 'tile/parking-entry';
  paint(124, 82, 12, 5, 'tile/parking-lot');
  floor[82]![129] = 'tile/parking-entry';
  for (const [x, y] of BUS_STOPS) {
    if (floor[y]?.[x] === 'tile/sidewalk') prop(x, y, 'tile/bus-stop');
  }

  // ── 5대 공공기관 · 기관 직원 NPC ──
  for (const inst of INSTITUTIONS) {
    const { tx, ty } = inst.at;
    objects.push({
      id: `inst-${inst.kind}`,
      frame: `building/${inst.kind}`,
      tx,
      ty,
      w: 96,
      h: 96,
      label: INSTITUTION_LABEL[inst.kind],
      shadow: 'large',
    });
    block(tx, ty, 3, 3);
    if (inst.kind !== 'exchange') paint(tx, ty + 3, 3, 1, 'tile/plaza-tile');
    interactables.push({
      id: `inst-${inst.kind}`,
      kind: 'institution',
      institution: inst.kind,
      tx: tx + 1,
      ty: ty + 3,
      wTiles: 1,
      hTiles: 1,
      label: INSTITUTION_LABEL[inst.kind],
      enabled: false,
    });
    const npcId = `npc-${inst.npc}`;
    npcs.push({ id: npcId, npc: inst.npc, tx: tx + 2, ty: ty + 3, dir: 'south', name: inst.npcName, frame: `char/npc-${inst.npc}` });
    block(tx + 2, ty + 3);
    interactables.push({ id: npcId, kind: 'npc', npc: inst.npc, tx: tx + 2, ty: ty + 4, wTiles: 1, hTiles: 1, label: inst.npcName, enabled: true });
    reserve(tx, ty + 3, 3, 2);
  }

  // ── 4대 특화 지구 · 부지 4곳 ──
  // 같은 부지에 여럿이면 운영 중인 회사를 먼저 고른다(모두 파산이면 목록에서 먼저 온 것) — 재창업한 새 회사는
  // 파산한 이전 회사와 같은 지구 · 부지를 쓴다(M3 규칙).
  const teamByLot = new Map<string, CityTeamSeed>();
  for (const t of teams) {
    const key = `${t.district}:${lotIndex(t.lot)}`;
    const cur = teamByLot.get(key);
    if (cur === undefined || (cur.status === 'bankrupt' && t.status !== 'bankrupt')) teamByLot.set(key, t);
  }

  for (const [district, slot] of Object.entries(DISTRICT_SLOTS) as Array<[DistrictType, (typeof DISTRICT_SLOTS)[DistrictType]]>) {
    const contracted = slot.lots.some((_, i) => teamByLot.has(`${district}:${i}`));
    // 지구 경계 표지
    for (let x = slot.zone.tx; x < slot.zone.tx + slot.zone.wTiles; x += 4) {
      for (const y of [slot.zone.ty, slot.zone.ty + slot.zone.hTiles - 1]) {
        if (floor[y]![x] === EMPTY || floor[y]![x] === 'tile/sidewalk') marks[y]![x] = 'tile/district-boundary';
      }
    }
    // 지구 안내 건물
    objects.push({
      id: `district-${district}`,
      frame: contracted ? `${DISTRICT_FRAME[district]}-contracted` : DISTRICT_FRAME[district],
      tx: slot.marker.tx,
      ty: slot.marker.ty,
      w: 96,
      h: 96,
      label: DISTRICT_LABEL[district],
      shadow: 'large',
    });
    block(slot.marker.tx, slot.marker.ty, 3, 3);
    reserve(slot.marker.tx - 1, slot.marker.ty - 1, 5, 5);

    slot.lots.forEach((lot, i) => {
      const team = teamByLot.get(`${district}:${i}`);
      // 부지 둘레(좌우 한 칸 · 위 깃발 줄 · 아래 입구 · 도착 지점 줄)는 일반 건물이 차지하지 않는다.
      reserve(lot.tx - 1, lot.ty - 1, 5, 6);
      paint(lot.tx, lot.ty, 3, 3, team ? 'tile/site-contracted' : 'tile/site-empty');
      if (!team) {
        marks[lot.ty + 1]![lot.tx + 1] = 'tile/survey-stake';
        interactables.push({
          id: `lot-${district}-${i}`,
          kind: 'notice',
          tx: lot.tx,
          ty: lot.ty + 3,
          wTiles: 3,
          hTiles: 1,
          label: `${DISTRICT_LABEL[district]} 빈 부지 ${i + 1} — 답사`,
          enabled: false,
        });
        return;
      }
      objects.push({
        id: `hq-${team.id}`,
        frame: `building/hq-t${team.hqTier}`,
        tx: lot.tx,
        ty: lot.ty,
        w: 96,
        h: 96,
        teamId: team.id,
        label: team.companyName,
        shadow: 'large',
      });
      if (team.props?.includes('landmark')) {
        // (v10) 랜드마크 간판 · 옥상 장식 — 사옥 위 첫 줄(사옥보다 앞 depth 가 되지 않게 사옥 바닥보다 위 y).
        objects.push({ id: `hq-landmark-${team.id}`, frame: 'prop/landmark', tx: lot.tx, ty: lot.ty - 1, w: 64, h: 32, teamId: team.id, shadow: 'none' });
      }
      objects.push({
        id: `hq-flag-${team.id}`,
        frame: `building/owner-team-${team.inkIndex}`,
        tx: lot.tx + 2,
        ty: lot.ty - 1,
        w: 32,
        h: 48,
        teamId: team.id,
        shadow: 'none',
      });
      if (team.status === 'bankrupt') {
        // 파산 표식 — id 규칙 `hq-bankrupt-<teamId>`. 64×64 도장을 3×3 사옥의 아래 두 줄(가운데에서 오른쪽)에 찍는다.
        // 바닥 줄이 사옥과 같아(depth = 바닥 y) 깊이가 같으므로, 사옥 · 깃발 **뒤에** 넣어 그 위에 그려지게 한다.
        objects.push({
          id: `hq-bankrupt-${team.id}`,
          frame: BANKRUPT_STAMP_FRAME,
          tx: lot.tx + 1,
          ty: lot.ty + 1,
          w: 64,
          h: 64,
          teamId: team.id,
          label: `${team.companyName} — 파산`,
          shadow: 'none',
        });
      }
      block(lot.tx, lot.ty, 3, 3);
      portals.push({
        id: `hq-door-${team.id}`,
        tx: lot.tx + 1,
        ty: lot.ty + 3,
        wTiles: 1,
        hTiles: 1,
        target: { space: `hq:${team.id}`, spawnId: 'entrance' },
        label: `${team.companyName} 사옥 입구`,
      });
      marks[lot.ty + 3]![lot.tx + 1] = 'tile/floor-mat';
      spawns.push({ id: `outside-hq-${team.id}`, tx: lot.tx + 1, ty: lot.ty + 4, dir: 'north' });
    });
  }

  // ── 일반 건물 — 남은 빈 땅을 블록마다 채운다 ──
  const freeFor = (tx: number, ty: number, wT: number, hT: number) => {
    for (let y = ty; y < ty + hT; y++) for (let x = tx; x < tx + wT; x++) {
      if (floor[y]?.[x] !== EMPTY || collision[y]![x] !== 0 || reserved[y]![x]) return false;
    }
    return true;
  };
  for (const fill of FILLS) {
    const [x0, y0, x1, y1] = fill.rect;
    const gap = fill.gap ?? 1;
    let k = 0;
    for (let y = y0; y <= y1; ) {
      let rowH = 0;
      for (let x = x0; x <= x1; ) {
        let placed = false;
        for (let attempt = 0; attempt < fill.frames.length && !placed; attempt++) {
          const frame = fill.frames[(k + attempt) % fill.frames.length]!;
          const [w, h] = BUILDING_SIZE[frame];
          const wT = w / TILE_SIZE;
          const hT = Math.floor(h / TILE_SIZE);
          if (x + wT - 1 > x1 || y + hT - 1 > y1 || !freeFor(x, y, wT, hT)) continue;
          objects.push({ id: `bld-${frame.slice('building/'.length)}-${x}-${y}`, frame, tx: x, ty: y, w, h, shadow: w >= 96 ? 'large' : 'medium' });
          block(x, y, wT, hT);
          // 건물 둘레 한 칸(오른쪽 · 아래)을 비워 걷는 길을 남긴다.
          reserve(x + wT, y, gap, hT + gap);
          reserve(x, y + hT, wT, gap);
          k += attempt + 1;
          rowH = Math.max(rowH, hT);
          x += wT + gap;
          placed = true;
        }
        if (!placed) x += 1;
      }
      y += rowH > 0 ? rowH + gap : 1;
    }
  }

  // ── 테두리와 기본 도착 지점 ──
  for (let tx = 0; tx < W; tx++) {
    block(tx, 0);
    block(tx, H - 1);
  }
  for (let ty = 0; ty < H; ty++) {
    block(0, ty);
    block(W - 1, ty);
  }
  marks[1]![1] = 'tile/corner-fold';
  marks[H - 2]![W - 2] = 'tile/corner-fold';

  // spawns[0] — 시청 앞 광장. 교사 · 팀 없는 사람 · 자기 사옥이 없는 학생이 여기서 시작한다(`resolveCitySpawn`).
  spawns.unshift({ id: 'civic', tx: 74, ty: 43, dir: 'north' });

  const zones: MapZone[] = [
    { id: EXCHANGE_FLOOR_ZONE_ID, kind: 'exchange-floor', tx: EXCHANGE_FLOOR.tx, ty: EXCHANGE_FLOOR.ty, wTiles: EXCHANGE_FLOOR.w, hTiles: EXCHANGE_FLOOR.h, label: INSTITUTION_LABEL.exchange },
    ...districts.map((d): MapZone => ({ id: d.id, kind: 'district', tx: d.tx, ty: d.ty, wTiles: d.wTiles, hTiles: d.hTiles, label: d.label })),
    ...ZONES_AFTER_DISTRICTS,
  ];

  return {
    id: 'city',
    name: '바이오 클러스터 시티',
    paper: 'map',
    widthTiles: W,
    heightTiles: H,
    floor: floor as TileRow[],
    marks: marks as TileRow[],
    collision,
    objects,
    spawns,
    portals,
    interactables,
    districts,
    zones,
    npcs,
    // v7 — 도시 NPC 는 5단계 전까지 움직이지 않는다(구현 브리프 §1).
    npcSpots: [],
  };
}
