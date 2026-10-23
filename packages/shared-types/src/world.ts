/**
 * 월드·맵 데이터 규격 — 게임 서버(충돌·공간 판정)와 클라이언트(렌더)가 같은 데이터를 읽는다.
 * 실제 맵 데이터는 `@crista/game-rules` 의 `world/` 가 만든다.
 * 규격 근거: 아트디렉션 §5(타일 32px · 캐릭터 32×48 · 설비 2×2 타일) · §6(레이어).
 */
import type {
  DistrictType,
  FacilityKind,
  InstitutionKind,
  Stage,
  TeamId,
} from './domain.ts';
import type { NpcSpot } from './npc.ts';

export const TILE_SIZE = 32;
export const GRID_MINOR = 8;
export const GRID_MAJOR = 40;
export const CHAR_WIDTH = 32;
export const CHAR_HEIGHT = 48;
/** 설비 배치 격자 = 2×2 타일. */
export const FACILITY_GRID = 2;

export type Direction = 'south' | 'north' | 'east' | 'west';
export const DIRECTIONS: readonly Direction[] = ['south', 'north', 'east', 'west'];

/** 공간 식별자. 도시는 하나, 사옥은 팀별로 하나. */
export type SpaceId = 'city' | `hq:${string}`;

export const CITY_SPACE: SpaceId = 'city';
export const hqSpace = (teamId: TeamId): SpaceId => `hq:${teamId}`;
export const isHqSpace = (space: string): space is `hq:${string}` => space.startsWith('hq:');
export const hqTeamId = (space: SpaceId): TeamId | null =>
  isHqSpace(space) ? space.slice(3) : null;

/** 용지 변주 (아트디렉션 §4). */
export type PaperVariant = 'map' | 'grid4mm' | 'ruled' | 'note' | 'board' | 'form';

/** 타일 한 칸. frame 이 빈 문자열이면 그 칸은 그리지 않는다. */
export type TileRow = readonly string[];

export interface MapObject {
  id: string;
  /** 아틀라스 프레임 키 — 예: `building/city-hall`, `facility/target-t2`. */
  frame: string;
  /** 좌상단 타일 좌표. */
  tx: number;
  ty: number;
  /** 스프라이트 원본 픽셀 크기. depth 정렬은 바닥(y + h) 기준. */
  w: number;
  h: number;
  /** 소유 팀 — 팀 잉크 표식에만 쓴다. */
  teamId?: TeamId;
  label?: string;
  /** 그림자 해칭 프레임 선택용 — 생략하면 w 로 고른다. */
  shadow?: 'none' | 'small' | 'medium' | 'large';
}

export interface Spawn {
  id: string;
  tx: number;
  ty: number;
  dir: Direction;
}

/** 공간 이동 출입구. 팀 사옥 입구는 누구나 들어갈 수 있다(완전 개방형 — PRD §2.4). */
export interface Portal {
  id: string;
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  target: { space: SpaceId; spawnId: string };
  label: string;
  /** 보안 게이트 — 소유 팀만 통과. M1 은 안쪽 금고 구역에만 쓴다. */
  ownerOnly?: boolean;
}

/**
 * 캐릭터가 다가가 상호작용하는 지점.
 * v4: `npc` — NPC(기관 직원 · 사옥 연구원)에게 말을 건다(`npc` 칸이 NPC 종류). 거래소 단말기는 `institution: 'exchange'` 이고 id 가 `exchange-terminal-<n>` 이다.
 */
export interface Interactable {
  id: string;
  kind: 'facility' | 'institution' | 'notice' | 'npc';
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  label: string;
  facility?: FacilityKind;
  institution?: InstitutionKind;
  /** `kind === 'npc'` 일 때 NPC 종류(v4). */
  npc?: NpcId;
  stage?: Stage;
  /**
   * 지금 마일스톤에서 조작 지점으로 동작하는가. false 면 '후속 마일스톤' 안내만 띄운다.
   * 사옥 설비는 M2 부터 등급과 무관하게 참이다 — 건설·업그레이드·실험 중 무엇이 가능한지는
   * 서버가 등급·소속으로 판정해 `InteractOpenMessage.actions` 로 알린다.
   */
  enabled: boolean;
}

export interface DistrictZone {
  id: string;
  district: DistrictType;
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  label: string;
}

/**
 * 맵 구역(v4). 게임 규칙상 뜻이 있는 것은 `exchange-floor` 하나다 — **바이오 증권거래소 객장(#s50)**.
 * 서버는 학생의 서버 권위 위치가 이 사각형 안일 때만 시세·계좌를 보내고 주문을 받는다(PRD §3.1 '현장 객장 방문 전용').
 * 나머지 종류는 미니맵·안내 표시용이다.
 */
export type MapZoneKind = 'exchange-floor' | 'district' | 'civic' | 'medical' | 'park' | 'river' | 'residential' | 'commercial' | 'transit';

export interface MapZone {
  id: string;
  kind: MapZoneKind;
  tx: number;
  ty: number;
  wTiles: number;
  hTiles: number;
  label: string;
}

/** 객장 구역 id — 도시 맵에 정확히 하나. */
export const EXCHANGE_FLOOR_ZONE_ID = 'zone-exchange-floor';

/**
 * NPC 종류(v4) — 기관 직원 5종 + 사옥 연구원. 대화는 LLM(워커 `/llm/npc`)이 하고, 실패하면 규칙 기반 문구로 대신한다.
 * 프레임 `char/npc-<id>`(남쪽을 보는 서 있는 자세 1장 + `-<방향>` 3장). 단일 소스: `@crista/game-rules` 의 `npc/`.
 */
export type NpcId = 'clerk' | 'clinician' | 'vc-partner' | 'fda-reviewer' | 'broker' | 'researcher';

/**
 * 맵에 서 있는 NPC 한 명(v4). 움직이지 않는 NPC 는 발밑 타일이 막혀 있고, 말을 거는 자리는 같은 id 의 `Interactable` 이다.
 * v7: `mobile` 이면 서버가 움직인다(`WorldState.npcs`, `npc.ts`) — 맵은 이 NPC 의 발밑 block 과 정적 `npc` 지점을 만들지 않고,
 * 이 칸(tx, ty)은 홈 지점이다. 말 걸기 판정은 서버의 현재 위치로 한다(`@crista/game-rules` 의 `interactTargetAt`).
 */
export interface NpcPlacement {
  /** 상호작용 지점 id 와 같다(v7: 움직이는 NPC 면 `npcInstanceId`). */
  id: string;
  npc: NpcId;
  tx: number;
  ty: number;
  dir: Direction;
  /** 이름표 — 예: '특허청 민원 담당 윤 주무관'. */
  name: string;
  frame: string;
  /** v7 — 서버가 움직이는 NPC. 생략 = 움직이지 않음. */
  mobile?: true;
}

export interface TileMapData {
  id: string;
  name: string;
  paper: PaperVariant;
  widthTiles: number;
  heightTiles: number;
  /** 바닥 프레임 격자 [y][x]. */
  floor: readonly TileRow[];
  /** 구역 경계·동선·측량 표시 레이어(레이어 3). */
  marks: readonly TileRow[];
  /** 0 = 통행 가능, 1 = 막힘. */
  collision: readonly (readonly number[])[];
  objects: readonly MapObject[];
  spawns: readonly Spawn[];
  portals: readonly Portal[];
  interactables: readonly Interactable[];
  districts: readonly DistrictZone[];
  /** 구역(v4) — 도시 맵은 `exchange-floor` 를 정확히 하나 싣는다. 사옥은 빈 배열. */
  zones: readonly MapZone[];
  /** 서 있는 NPC(v4). */
  npcs: readonly NpcPlacement[];
  /** NPC 지점(v7, `npc.ts`) — 움직이는 NPC 의 목적지. 도시는 5단계 전까지 빈 배열. */
  npcSpots: readonly NpcSpot[];
}

/**
 * 맵 레이어의 줄 단위 압축(v4) — 도시가 160×120 타일로 커져 문자열 격자를 그대로 보내면 입장마다 수백 KB 다.
 * `palette` 의 칸 값을 행 우선(y 다음 x)으로 펼친 열을 `[팔레트 번호, 반복 수, 팔레트 번호, 반복 수, …]` 로 적는다. 반복 수 합 = 가로 × 세로.
 * 충돌 레이어는 팔레트 `['0', '1']` 이다. 인코딩·디코딩은 `@crista/game-rules` 의 `encodeTileMap` · `decodeTileMap`.
 */
export interface RleLayer {
  palette: string[];
  runs: number[];
}

/** 통신으로 보내는 맵(v4) — `WelcomeMessage.map`. 받는 쪽은 `decodeTileMap` 으로 `TileMapData` 를 만든다. */
export interface WireTileMap extends Omit<TileMapData, 'floor' | 'marks' | 'collision'> {
  encoding: 'rle-v1';
  floor: RleLayer;
  marks: RleLayer;
  collision: RleLayer;
}

/** 캐릭터 이동 한계 — 서버 검증과 클라이언트 예측이 같은 값을 쓴다. */
export const MOVE = {
  /** px/s. WASD·클릭 공통. */
  speed: 150,
  /** 한 move 메시지가 넘을 수 없는 거리(px). 순간이동·치트 차단. */
  maxStepPx: 120,
  /** 클라이언트 전송 주기(ms). */
  sendIntervalMs: 50,
  /** 상호작용 사거리(px). */
  interactRangePx: 56,
} as const;

/** 서버 상태 패치 주기 — ARCHITECTURE §1.2 의 20Hz 목표. */
export const STATE_PATCH_RATE_MS = 50;

/**
 * 큰 도시(v4)의 클릭 길찾기 한도 — 도시 전체(160×120 = 19,200칸)를 다 훑어도 되는 값.
 * `findPath` 는 이진 힙 A* 라 이 한도에서도 한 번에 수 ms 안이어야 한다(game-rules 테스트가 잰다).
 */
export const PATHFIND_MAX_NODES = 20_000;

export interface PlayerState {
  sessionId: string;
  userId: string;
  displayName: string;
  teamId: TeamId | null;
  cLevel: string | null;
  role: string;
  inkKey: string;
  /** 월드 픽셀 좌표(캐릭터 발밑 중심). */
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
  working: boolean;
  /** 머리 위 태그에 띄우는 보유 서류 아이콘 키 (PRD Branch 8). */
  badges: string[];
  /** 진행 중인 작업 수 — 다른 팀에게도 보이는 공개 정보. */
  busyJobs: number;
  /**
   * 교사(`role === 'teacher'`)의 GM 아바타(M3). 학생은 빈 문자열.
   * 교사는 팀이 아니므로 `teamId` 는 null · `inkKey` 는 빈 문자열이다(아트디렉션 §8.1 — 팀 잉크를 쓰지 않는다).
   */
  gmAvatar: string;
}
