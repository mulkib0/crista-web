/**
 * 움직이는 NPC 계약(v7) — 설계: docs/2026-10-21-npc-intelligence-movement-design.md · 구현 범위: docs/2026-10-22-npc-implementation-brief.md.
 * 이 파일 주석이 단일 소스다.
 *
 * - 서버가 NPC 위치 · 경로 · 대화 세션 · 안내권의 유일한 소유자다. 클라이언트는 `WorldState.npcs` 를 보간해 그리기만 한다.
 * - 목적지는 좌표가 아니라 맵 생성기가 만든 **NPC 지점**(`TileMapData.npcSpots`)으로만 정한다. 지점은 공개 맵 데이터다(비공개 정보 없음).
 * - 공개 상태에는 안내 대상 학생 · 안내 목적지 · 대화 내용을 싣지 않는다(§4.4 · §7.1). 안내 중이면 `activity: 'escorting'` 만 보인다.
 * - NPC 위치 · 경로 · 세션은 저장본 · DB 에 넣지 않는다(§7.3). 룸이 새로 열리거나 복원되면 홈 지점에서 시작한다.
 */
import type { FacilityKind } from './domain.ts';
import type { Direction, NpcId } from './world.ts';

/** 서버 설정 `CRISTA_NPC_MOVEMENT`. `llm` 은 3b(자율계획)가 켜질 때까지 `rules` 와 같게 동작한다. */
export type NpcMovementMode = 'off' | 'rules' | 'llm';
export const NPC_MOVEMENT_MODES: readonly NpcMovementMode[] = ['off', 'rules', 'llm'];

/** NPC 지점 종류 — 홈(기본 자리) · 작업(설비 옆) · 대기 · 출입구 쪽(사옥 밖 장소를 물을 때 안내 목적지). */
export type NpcSpotKind = 'home' | 'work' | 'wait' | 'entrance';

/**
 * NPC 지점(v7, `TileMapData.npcSpots`). 맵 생성기(`hq.ts`)가 결정적으로 만든다.
 * 규칙(맵 생성 시험이 검사): 걸을 수 있는 칸 · 홈에서 `findPath` 로 도달 · 포탈 · 상호작용 칸 밖 · 입구 도착 지점에서 가로 · 세로 2칸 밖 ·
 * 홈에서 근무 반경(유클리드 타일 거리) 안. 작업 지점은 설비의 플레이어 상호작용 칸을 피해 설비 옆에 둔다.
 */
export interface NpcSpot {
  /** 안정 ID(예: `hq-docking-side`). 후보 ID 의 `destinationId`. */
  id: string;
  kind: NpcSpotKind;
  tx: number;
  ty: number;
  /** 그 자리에서 바라볼 방향. */
  dir: Direction;
  /** 작업 지점이면 연결된 설비 — 그 설비가 지어지지 않았거나 가동 중지면 후보에서 빠진다. */
  facility?: FacilityKind;
  /** 그 지점을 쓸 수 있는 NPC 역할. */
  roles: NpcId[];
  /** 서버 고정 문구 — 안내 의도 후보 설명 · 안내 알림에 쓴다(학생 글이 들어가지 않는다). */
  label: string;
}

/** 공개 활동(`NpcSchema.activity`). 서버의 `blocked`(재탐색 · 대체 목적지 대기)는 `idle` 로 보낸다. */
export type NpcActivity = 'idle' | 'walking' | 'working' | 'talking' | 'escorting' | 'paused';
export const NPC_ACTIVITIES: readonly NpcActivity[] = ['idle', 'walking', 'working', 'talking', 'escorting', 'paused'];

/**
 * `WorldState.npcs` 한 칸(서버 Colyseus schema 와 필드 이름이 같다). 키 = `id`(= `npcInstanceId`, 룸 안에서 유일 —
 * 사옥 연구원은 `npc-researcher` 로 기존 상호작용 지점 id 와 같다).
 */
export interface NpcPublicState {
  id: string;
  npc: NpcId;
  /** 기본 프레임(`char/npc-<id>`) — 방향 · 보행 · 작업 프레임은 `-<방향>` · `-walk-<방향>/n` · `-work-<방향>/n` 을 붙여 찾는다. */
  frame: string;
  name: string;
  /** 월드 픽셀(발밑 중심) — 서버가 정수로 반올림한다. 멈춰 있으면 바뀌지 않는다. */
  x: number;
  y: number;
  dir: Direction;
  activity: NpcActivity;
  /** 작업 · 대기 중이면 그 NPC 지점 id(공개 맵 데이터), 그 밖에는 빈 문자열. 안내 목적지는 싣지 않는다. */
  activityCode: string;
  /** 위치가 끊길 때(복원 · 홈 재배치)마다 1씩 오른다 — 바뀌면 클라이언트는 보간 없이 옮긴다. */
  snapSeq: number;
}

/** 이동 · 대화 · 안내 운영 값(설계서 §6 · 구현 브리프 §2). 수치 설계가 아니라 운영 안전값이다. */
export const NPC_MOVE = {
  /** 걷는 속도(px/s) — 플레이어 `MOVE.speed` 150 의 약 절반, 행인 42 보다 빠르다. 안내를 따라올 수 있게 늘 플레이어보다 느리다. */
  speedPxPerSec: 72,
  /** 서버 시뮬레이션 고정 단계(ms). 한 단계 보폭 = 72 × 0.05 = 3.6px. */
  stepMs: 50,
  /** 한 콜백에서 따라잡는 최대 단계 수 — 넘는 밀린 시간은 버린다. */
  maxCatchUpSteps: 4,
  /** 진전이 없으면 재탐색(ms). */
  stuckMs: 2_000,
  /** 같은 목적지 재탐색 실패 상한 — 넘으면 대체 목적지 또는 대기. */
  repathMaxFails: 2,
  /** 걷는 NPC에게만 말 걸기 사거리에 더하는 여유(px) — 72px/s × 약 0.4초(보간 지연). */
  walkingRangeSlackPx: 32,
  /** 대화 세션 — 그 학생의 마지막 접수 · 답 전송 중 늦은 쪽에서 이 시간(ms)이 지나면 끝난다(처리 중이면 끝나지 않음). */
  talkSessionMs: 20_000,
  /** 대화 세션 거리 이탈(px). */
  talkLeavePx: 128,
  /** 안내권 최대 시간(ms). */
  escortMaxMs: 60_000,
  /** 학생이 `escortFarTiles` 밖에 연속으로 이만큼(ms) 있으면 안내를 끝낸다. */
  escortLostMs: 10_000,
  /** 학생이 이 타일 안이면 전진(도착 판정도 이 거리). */
  escortNearTiles: 3,
  /** 학생이 이 타일 밖이면 대기. 사이에서는 직전 동작을 유지한다. */
  escortFarTiles: 5,
  /** 일과 시간 범위(초) — 모델이 준 값도 이 범위로 자른다(§4.3). */
  workSec: [10, 60] as const,
  waitSec: [5, 30] as const,
} as const;

/** 근무 반경(타일, 홈에서 유클리드 거리) — 사옥 연구원 12, 기관 직원 3(창구 옆 자리). */
export const NPC_WORK_RADIUS_TILES: Readonly<Record<NpcId, number>> = {
  researcher: 12,
  clerk: 3,
  clinician: 3,
  'vc-partner': 3,
  'fda-reviewer': 3,
  broker: 3,
};

/** 대화 응답 한 번에 싣는 안내 의도 후보 상한(§5.1). */
export const NPC_INTENT_CANDIDATES_MAX = 6;
/** 자율계획 후보 상한(§4.1 — 3b 평가 자료 · 규칙 선택기). */
export const NPC_PLAN_CANDIDATES_MAX = 12;

/** 안내 의도 후보 id — `escort:<spotId>`. */
export const npcEscortCandidateId = (spotId: string): string => `escort:${spotId}`;

/** `C2S.NPC_TALK_END` — NPC 창을 닫았다(대화 세션 종료). `cancelEscort` 면 그 학생의 안내도 끝낸다. 이 메시지가 없어도 세션은 20초 뒤 끝난다. */
export interface NpcTalkEndMessage {
  interactableId: string;
  cancelEscort?: boolean;
}

export type NpcEscortState = 'started' | 'arrived' | 'ended' | 'other';
/** `unreachable` — 길이 막혀 재탐색이 두 번 실패했다(§6.1). */
export type NpcEscortEndReason = 'arrived' | 'timeout' | 'lost' | 'left' | 'cancelled' | 'paused' | 'restored' | 'disabled' | 'unreachable';

/**
 * `S2C.NPC_ESCORT` — 그 학생에게만. `started`(목적지 이름) · `arrived` · `ended`(사유) ·
 * `other`(안내가 시작돼 대화 세션이 끝난 다른 학생에게 '다른 학생을 안내하러 갑니다'). 문구는 서버 고정 문구다.
 */
export interface NpcEscortMessage {
  interactableId: string;
  state: NpcEscortState;
  destinationLabel?: string;
  reason?: NpcEscortEndReason;
  text: string;
  atMs: number;
}
