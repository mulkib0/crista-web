/**
 * 사내 연구소 내부 맵 — 팀 사옥 1층 (PRD §2.2 · ARCHITECTURE §1.1).
 * 용지: 4mm 모눈. 5대 연구 설비(2×2 타일 = 64px)와 출입구.
 */
import type {
  FacilityKind,
  FacilityRunState,
  Interactable,
  MapObject,
  NpcPlacement,
  NpcSpot,
  Portal,
  Spawn,
  TileMapData,
  TileRow,
} from '@crista/shared-types';
import { FACILITY_LABEL, FACILITY_STAGE } from '@crista/shared-types';
import { EMPTY, makeGrid } from './grid.ts';

const W = 26;
const H = 20;

export interface HqTeamSeed {
  id: string;
  companyName: string;
  /** 설비별 건설 단계. 0 = 미건설(청사진). */
  facilities: Record<FacilityKind, 0 | 1 | 2 | 3>;
  /**
   * 설비별 가동 상태(v3, 공개 정보). 키가 없거나 생략하면 가동 중.
   * 'idle' 이고 건설된(등급 > 0) 설비 위에는 `facility/offline` 오버레이 오브젝트를 둔다.
   */
  facilityStates?: Partial<Record<FacilityKind, FacilityRunState>>;
  /** (v10) 사옥 외관 등급 — 내부도 따라 바뀐다(Tier 2 만년필 도면 바닥 · Tier 3 쇼케이스 띠 · 승인 도장). 생략 = 1. */
  hqTier?: 1 | 2 | 3;
  /** (v10) 산 소품(`PropId`) — 고정 슬롯에 그린다(통행을 막지 않는 장식). 생략 = 없음. */
  props?: readonly string[];
}

/**
 * (v10) 소품 슬롯 — 출입구 · 포탈 · 설비 앞 줄 · NPC 홈 · 대기 지점 · 회의실 지점을 막지 않는 고정 칸(설계서 §3.2).
 * 소품은 통행을 막지 않는다(장식). 랜드마크는 도시 외관(옥상)에 그리므로 사옥 내부 슬롯이 없다.
 */
export const HQ_PROP_SLOTS: Readonly<Record<string, { tx: number; ty: number; w: number; h: number }>> = {
  espresso: { tx: 2, ty: 8, w: 32, h: 48 },
  'poster-board': { tx: 9, ty: 12, w: 32, h: 48 },
  'lounge-sofa': { tx: 5, ty: 16, w: 64, h: 32 },
  'showcase-case': { tx: 17, ty: 15, w: 32, h: 48 },
  'plaque-nda': { tx: 9, ty: 1, w: 32, h: 32 },
};

/** (v10) 사옥 내부 Tier 연출의 오브젝트 id — 클라이언트가 등급 변화 때 찾는다. */
export const HQ_TIER_STAMP_ID = 'hq-tier-stamp';
export function hqPropObjectId(propId: string): string {
  return `prop-${propId}`;
}

/** 가동 중지 오버레이 프레임과 오브젝트 id 규칙 — `facility-<kind>-offline`. */
export const FACILITY_OFFLINE_FRAME = 'facility/offline';
export function facilityOfflineObjectId(kind: FacilityKind): string {
  return `facility-${kind}-offline`;
}

/** 사옥 연구원 NPC 의 id — 상호작용 지점 id 와 같다(v7: 움직이면 `npcInstanceId`). */
export const RESEARCHER_NPC_ID = 'npc-researcher';

/** 맵 생성 선택(v7). */
export interface HqMapOptions {
  /**
   * 서버가 NPC 를 움직이는가(`CRISTA_NPC_MOVEMENT` 가 `off` 가 아님). 참이면 이동 역할(`NPC_MOBILE_ROLES`)의 NPC 는
   * `mobile` 이고 발밑 block · 정적 `npc` 지점을 만들지 않는다(설계서 §6.2-1). 생략 = 거짓(v5 와 같은 정적 NPC).
   */
  npcMovement?: boolean;
}

/** 움직일 수 있는 NPC 역할(설계서 §6.2-1 '역할 설정의 이동 여부'). 대표 연구원만 — 장식 연구원 · 도시 직원은 그대로 둔다. */
export const NPC_MOBILE_ROLES: ReadonlySet<NpcPlacement['npc']> = new Set(['researcher']);

/**
 * 사옥 NPC 지점(v7, 설계서 §6.4). 구조가 팀마다 같으므로 지점도 같다(같은 입력 → 같은 지점).
 * 작업 지점은 설비(2×2) 오른쪽 옆 칸 — 플레이어 상호작용 칸(설비 아래 줄)을 피한다. 금고 안 보안 설비에는 두지 않는다(연구원 금지 구역).
 * 입구 도착 지점(13,17)에서 가로 · 세로 2칸 안에는 두지 않는다. 모두 홈(16,9)에서 반경 12타일 안.
 */
function hqNpcSpots(): NpcSpot[] {
  const roles: NpcSpot['roles'] = ['researcher'];
  const work = (kind: FacilityKind, tx: number, ty: number): NpcSpot => ({
    id: `hq-${kind}-side`,
    kind: 'work',
    tx,
    ty,
    dir: 'west',
    facility: kind,
    roles,
    label: `${FACILITY_LABEL[kind]} 옆 작업대`,
  });
  return [
    { id: 'hq-home', kind: 'home', tx: 16, ty: 9, dir: 'south', roles, label: '책임연구원 자리' },
    work('target', 5, 5),
    work('htvs', 10, 5),
    work('docking', 16, 5),
    work('admet', 21, 5),
    { id: 'hq-wait-shelf', kind: 'wait', tx: 12, ty: 3, dir: 'north', roles, label: '자료 서가 앞' },
    { id: 'hq-wait-meeting', kind: 'wait', tx: 7, ty: 15, dir: 'west', roles, label: '전략 회의실 앞' },
    { id: 'hq-wait-hall', kind: 'wait', tx: 18, ty: 11, dir: 'south', roles, label: '연구동 복도' },
    { id: 'hq-entrance-side', kind: 'entrance', tx: 13, ty: 14, dir: 'south', roles, label: '사옥 출입구 쪽(도시로 나가는 문)' },
  ];
}

const PADS: Array<{ kind: FacilityKind; tx: number; ty: number }> = [
  { kind: 'target', tx: 3, ty: 4 },
  { kind: 'htvs', tx: 8, ty: 4 },
  { kind: 'docking', tx: 14, ty: 4 },
  { kind: 'admet', tx: 19, ty: 4 },
  { kind: 'security', tx: 23, ty: 14 },
];

/** 팀 사옥 내부 맵. 팀마다 설비 단계만 다르고 구조는 같다. */
export function buildHqMap(team: HqTeamSeed, options: HqMapOptions = {}): TileMapData {
  // 기본 바닥은 비워 둔다 — 사옥 용지는 4mm 모눈이고(아트디렉션 §4), 모눈은 런타임 TileSprite 가 그린다.
  // 해칭이 들어간 타일을 넓은 면에 깔면 '해칭 = 음영' 문법(§2.3)이 희석된다.
  const floor = makeGrid<string>(W, H, EMPTY);
  const marks = makeGrid<string>(W, H, EMPTY);
  const collision = makeGrid<number>(W, H, 0);
  const objects: MapObject[] = [];
  const portals: Portal[] = [];
  const interactables: Interactable[] = [];
  const spawns: Spawn[] = [];

  const paint = (tx: number, ty: number, w: number, h: number, frame: string) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
      if (floor[y]?.[x] !== undefined) floor[y]![x] = frame;
    }
  };
  const block = (tx: number, ty: number, w = 1, h = 1) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
      if (collision[y]?.[x] !== undefined) collision[y]![x] = 1;
    }
  };

  // ── 외벽 ──
  for (let tx = 0; tx < W; tx++) {
    floor[0]![tx] = tx % 4 === 2 ? 'tile/wall-window' : 'tile/wall-plain';
    floor[1]![tx] = 'tile/wall-wainscot';
    floor[H - 1]![tx] = 'tile/wall-plain';
    block(tx, 0);
    block(tx, 1);
    block(tx, H - 1);
  }
  for (let ty = 0; ty < H; ty++) {
    floor[ty]![0] = 'tile/wall-left';
    floor[ty]![W - 1] = 'tile/wall-right';
    block(0, ty);
    block(W - 1, ty);
  }
  floor[0]![0] = 'tile/wall-outer-corner';
  floor[0]![W - 1] = 'tile/wall-outer-corner';
  for (const tx of [5, 12, 18]) {
    floor[1]![tx] = 'tile/wall-shelf';
  }

  // ── 바닥 구역 — 실험 구역과 회의실만 클린룸 바닥이다 ──
  paint(1, 2, W - 2, 6, 'tile/floor-clean');
  paint(2, 12, 8, 6, 'tile/floor-clean');
  // 동선 표시(레이어 3) — 구역 경계는 marks 로만 긋는다.
  marks[10]![3] = 'tile/district-boundary';
  marks[10]![15] = 'tile/district-boundary';
  for (let tx = 2; tx < 10; tx++) marks[11]![tx] = 'tile/floor-worn';

  // ── 출입구 ──
  const doorTx = Math.floor(W / 2);
  floor[H - 1]![doorTx] = 'tile/door-single-open';
  collision[H - 1]![doorTx] = 0;
  floor[H - 2]![doorTx] = 'tile/floor-mat';
  portals.push({
    id: 'hq-exit',
    tx: doorTx,
    ty: H - 1,
    wTiles: 1,
    hTiles: 1,
    target: { space: 'city', spawnId: `outside-hq-${team.id}` },
    label: '도시로 나가기',
  });
  spawns.push({ id: 'entrance', tx: doorTx, ty: H - 3, dir: 'north' });

  // ── 5대 연구 설비 ──
  for (const pad of PADS) {
    const tier = team.facilities[pad.kind] ?? 0;
    const built = tier > 0;
    const frame = built ? `facility/${pad.kind}-t${tier}` : `facility/${pad.kind}-blueprint`;
    objects.push({
      id: `facility-${pad.kind}`,
      frame,
      tx: pad.tx,
      ty: pad.ty,
      w: 64,
      h: 64,
      label: FACILITY_LABEL[pad.kind],
      shadow: 'medium',
    });
    if (built && team.facilityStates?.[pad.kind] === 'idle') {
      // 가동 중지 오버레이 — 설비와 같은 자리 · 크기라 바닥 y(depth)가 같다. 설비 **바로 뒤에** 넣어 그 위에 그려지게 한다.
      // (등급 0 평면도에는 두지 않는다 — 매각하면 등급 0 · 가동 상태가 초기화된다.)
      objects.push({
        id: facilityOfflineObjectId(pad.kind),
        frame: FACILITY_OFFLINE_FRAME,
        tx: pad.tx,
        ty: pad.ty,
        w: 64,
        h: 64,
        label: `${FACILITY_LABEL[pad.kind]} — 가동 중지`,
        shadow: 'none',
      });
    }
    block(pad.tx, pad.ty, 2, 2);
    paint(pad.tx, pad.ty + 2, 2, 1, 'tile/floor-mat');

    const stage = FACILITY_STAGE[pad.kind];
    interactables.push({
      id: `facility-${pad.kind}`,
      kind: 'facility',
      facility: pad.kind,
      ...(stage ? { stage } : {}),
      tx: pad.tx,
      ty: pad.ty + 2,
      wTiles: 2,
      hTiles: 1,
      label: FACILITY_LABEL[pad.kind],
      // M2: 다섯 설비 모두 조작 지점이다(등급 0 이면 건설, 그 위면 업그레이드·실험).
      // 무엇을 할 수 있는지는 서버가 등급·소속으로 판정해 `INTERACT_OPEN.actions` 로 알린다 — 이 값으로 정하지 않는다.
      enabled: true,
    });
  }

  // ── 창업자 전략 회의실 (PRD §2 L0) — v9: CRO 의뢰 보드(포스트잇 의뢰 카드 — 설계서 축 1 §1.1) ──
  // UI 아트(ui/card-panel 208×120)를 월드 소품으로 쓰지 않는다 — 보드 스프라이트는 후속 에셋 과제다.
  // 바닥 구역 + 상호작용 지점 + 변리사 NPC 배치로 회의실을 표시하고, 보드 내용은 상호작용 창(CRO 의뢰 보드)에서 본다.
  floor[13]![4] = 'tile/wall-shelf';
  block(4, 13);
  interactables.push({
    id: 'strategy-room',
    kind: 'notice',
    tx: 4,
    ty: 14,
    wTiles: 2,
    hTiles: 1,
    label: '창업자 전략 회의실 — CRO 의뢰 보드',
    enabled: true,
  });
  paint(4, 14, 2, 1, 'tile/floor-mat');

  // ── 보안 게이트와 특허 금고 구역 ──
  // 금고는 실제로 **둘러싸인 방**이어야 한다 — 게이트 한 칸만 막으면 옆으로 돌아 들어갈 수 있다.
  // 안쪽(tx 21~24, ty 13~18)은 오른쪽·아래 외벽과 여기서 세우는 위·왼쪽 벽으로 닫히고,
  // 들어가는 길은 보안 게이트 한 칸뿐이다. 통행 판정은 서버가 한다(`Portal.ownerOnly`).
  const vault = { tx: 21, ty: 13, w: 4, h: 6 } as const;
  const gateTx = 22;
  for (let tx = vault.tx - 1; tx < vault.tx + vault.w; tx++) {
    floor[vault.ty - 1]![tx] = 'tile/wall-plain';
    block(tx, vault.ty - 1);
  }
  for (let ty = vault.ty; ty < vault.ty + vault.h; ty++) {
    floor[ty]![vault.tx - 1] = 'tile/wall-right';
    block(vault.tx - 1, ty);
  }
  paint(vault.tx, vault.ty, vault.w, vault.h, 'tile/floor-clean');
  // 게이트 칸만 열어 둔다. 레이저 게이트 그림은 닫힘 상태를 쓰고, 통과 여부는 서버가 판정한다.
  floor[vault.ty - 1]![gateTx] = 'tile/door-security';
  collision[vault.ty - 1]![gateTx] = 0;
  spawns.push({ id: 'vault-inside', tx: gateTx, ty: vault.ty + 1, dir: 'south' });
  portals.push({
    id: 'vault-gate',
    tx: gateTx,
    ty: vault.ty - 1,
    wTiles: 1,
    hTiles: 1,
    target: { space: `hq:${team.id}`, spawnId: 'vault-inside' },
    label: '특허 금고 — 소유 팀 전용',
    ownerOnly: true,
  });

  // ── (v10) 사옥 내부 Tier 연출(설계서 §3.1) — Tier 2: 복도 · 로비 바닥이 만년필 도면으로 정돈,
  // Tier 3: 출입구 앞 로비에 형광펜 쇼케이스 띠 + 북쪽 벽 승인 도장. 통행 · 충돌은 그대로다(바닥 그림만 바뀐다).
  const tier = team.hqTier ?? 1;
  if (tier >= 2) {
    for (let ty = 8; ty <= H - 2; ty++) {
      for (let tx = 10; tx <= 19; tx++) {
        if (floor[ty]![tx] === EMPTY && collision[ty]![tx] === 0) floor[ty]![tx] = 'tile/floor-pen';
      }
    }
  }
  if (tier >= 3) {
    for (let tx = doorTx - 3; tx <= doorTx + 3; tx++) {
      const ty = H - 3;
      if (collision[ty]![tx] === 0 && floor[ty]![tx] !== 'tile/floor-mat') floor[ty]![tx] = 'tile/floor-showcase';
    }
    objects.push({ id: HQ_TIER_STAMP_ID, frame: 'stamp/nda-approved', tx: 15, ty: 0, w: 64, h: 64, label: '신약 랜드마크 타워 — 승인 도장', shadow: 'none' });
  }
  // ── (v10) 소품 — 산 것만 고정 슬롯에(장식, 통행을 막지 않는다).
  for (const id of team.props ?? []) {
    const slot = HQ_PROP_SLOTS[id];
    if (!slot) continue;
    objects.push({ id: hqPropObjectId(id), frame: `prop/${id}`, tx: slot.tx, ty: slot.ty, w: slot.w, h: slot.h, shadow: 'none' });
  }

  // ── NPC 연구원 (M1 은 정적 배치 장식) ──
  const npcs: Array<[string, number, number]> = [
    ['char/npc-structbio', 6, 7],
    ['char/npc-medchem', 11, 7],
    ['char/npc-patent', 6, 13],
    ['char/npc-security', 21, 17],
  ];
  for (const [frame, tx, ty] of npcs) {
    objects.push({ id: `npc-${frame.split('/')[1]}`, frame, tx, ty, w: 32, h: 48, shadow: 'small' });
    block(tx, ty);
  }

  // ── 사옥 연구원 NPC(v4) — 말을 거는 대상. 발밑은 막히고 앞(아래) 칸이 같은 id 의 상호작용 지점이다(브리프 §4.1).
  // 대화 문맥은 서버가 말 거는 사람의 권한으로 만든다(그 팀 구성원만 그 팀 연구 요약). 채용 · 해고 행동도 여기서 연다(§4.4).
  // v7: 서버가 움직이면(`npcMovement`) 발밑을 막지 않고 정적 지점도 두지 않는다 — 말 걸기는 서버의 현재 위치로 판정한다(§6.2).
  const mobile = options.npcMovement === true && NPC_MOBILE_ROLES.has('researcher');
  const researcher: NpcPlacement = {
    id: RESEARCHER_NPC_ID,
    npc: 'researcher',
    tx: 16,
    ty: 9,
    dir: 'south',
    name: '사내 연구소 정 책임연구원',
    frame: 'char/npc-researcher',
    ...(mobile ? { mobile: true as const } : {}),
  };
  if (!mobile) {
    block(researcher.tx, researcher.ty);
    interactables.push({
      id: researcher.id,
      kind: 'npc',
      npc: 'researcher',
      tx: researcher.tx,
      ty: researcher.ty + 1,
      wTiles: 1,
      hTiles: 1,
      label: researcher.name,
      enabled: true,
    });
  }

  return {
    id: `hq:${team.id}`,
    name: `${team.companyName} 사옥 1F`,
    paper: 'grid4mm',
    widthTiles: W,
    heightTiles: H,
    floor: floor as TileRow[],
    marks: marks as TileRow[],
    collision,
    objects,
    spawns,
    portals,
    interactables,
    districts: [],
    zones: [],
    npcs: [researcher],
    // 지점은 움직이는 NPC 의 목적지 — 이동을 끄면(정적 NPC 가 홈 칸을 막는다) 내보내지 않는다.
    npcSpots: mobile ? hqNpcSpots() : [],
  };
}
