/**
 * NPC 행동 후보 · 규칙 선택기(v7, 설계서 §4.1 · §4.2 · §4.3) — 서버 일과와 3b 평가 자료가 같은 함수를 쓴다.
 *
 * - 후보는 서버가 만든다: 맵의 NPC 지점(`TileMapData.npcSpots`)에서 그 역할 · 근무 반경 · 설비 상태(지어졌고 가동 중)로 거른다.
 *   후보 id 는 `(종류, 지점 id)` 에서 정하는 안정 id(`work:hq-docking-side` · `wait:…` · `home:…`)다 — 요청마다 바뀌는 순번을 쓰지 않는다.
 * - 후보 설명은 서버 고정 문구(`NpcSpot.label`)로만 만든다. 학생이 정한 이름 · 학생 글은 들어가지 않는다.
 * - 규칙 선택기는 역할별 점수(거리 · 설비 가동 · 최근 작업 반복 회피)로 하나를 고른다. 같은 입력이면 같은 선택이다.
 *   LLM 자율계획(3b)은 이 기준선을 이겨야 켠다(§10 '규칙 기준선') — 이 파일은 그 비교의 '규칙' 쪽이다.
 */
import type { FacilityKind, FacilityRunState, NpcId, NpcSpot, TileMapData } from '@crista/shared-types';
import { NPC_INTENT_CANDIDATES_MAX, NPC_MOVE, NPC_PLAN_CANDIDATES_MAX, NPC_WORK_RADIUS_TILES, npcEscortCandidateId } from '@crista/shared-types';
import { homeOf, spotDistanceTiles } from '../world/npc-world.ts';

export type NpcPlanActionKind = 'work_at' | 'wait_at' | 'return_home';

export interface NpcPlanCandidate {
  /** 안정 id — `work:<spotId>` · `wait:<spotId>` · `home:<spotId>`. */
  id: string;
  kind: NpcPlanActionKind;
  /** NPC 지점 id. */
  destinationId: string;
  /** 서버 고정 문구. */
  description: string;
  /** 실행 직전에 다시 확인할 조건(사람이 읽는 코드) — 예: `facility:docking:active`. */
  preconditions: string[];
}

export interface NpcEscortCandidate {
  /** `escort:<spotId>` — `LlmNpcRequest.intentCandidates[].id`. */
  id: string;
  description: string;
  spotId: string;
}

/** 설비 사실 — 등급(0 = 미건설) · 가동 상태. */
export interface NpcFacilityFacts {
  tier: number;
  state: FacilityRunState;
}

export interface NpcCandidateInput {
  map: TileMapData;
  role: NpcId;
  facilityOf: (kind: FacilityKind) => NpcFacilityFacts;
  /** 홈에서 걸어서 닿는가(서버가 `findPath` 로 판정해 넘긴다). 생략 = 모두 닿음. */
  reachable?: (spot: NpcSpot) => boolean;
}

/** 그 역할이 지금 쓸 수 있는 지점인가 — 역할 · 근무 반경 · (작업 지점이면) 설비가 지어졌고 가동 중 · 도달 가능. */
export function npcSpotUsable(input: NpcCandidateInput, spot: NpcSpot): boolean {
  if (!spot.roles.includes(input.role)) return false;
  const home = homeOf(input.map, input.role);
  if (!home || spotDistanceTiles(home, spot) > NPC_WORK_RADIUS_TILES[input.role] + 1e-9) return false;
  if (spot.facility) {
    const f = input.facilityOf(spot.facility);
    if (f.tier < 1 || f.state === 'idle') return false;
  }
  return input.reachable ? input.reachable(spot) : true;
}

const KIND_ORDER: Record<NpcPlanActionKind, number> = { work_at: 0, wait_at: 1, return_home: 2 };

/** 자율 일과 후보(최대 12) — 작업 · 대기 · 홈. 출입구 지점은 안내 전용이라 넣지 않는다. 순서: 종류 → id. */
export function npcPlanCandidates(input: NpcCandidateInput): NpcPlanCandidate[] {
  const list: NpcPlanCandidate[] = [];
  for (const spot of input.map.npcSpots) {
    if (!npcSpotUsable(input, spot)) continue;
    if (spot.kind === 'work' && spot.facility) {
      list.push({ id: `work:${spot.id}`, kind: 'work_at', destinationId: spot.id, description: `${spot.label}에서 일하기`, preconditions: [`facility:${spot.facility}:active`] });
    } else if (spot.kind === 'wait') {
      list.push({ id: `wait:${spot.id}`, kind: 'wait_at', destinationId: spot.id, description: `${spot.label}에서 기다리기`, preconditions: [] });
    } else if (spot.kind === 'home') {
      list.push({ id: `home:${spot.id}`, kind: 'return_home', destinationId: spot.id, description: `${spot.label}로 돌아가기`, preconditions: [] });
    }
  }
  list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return list.slice(0, NPC_PLAN_CANDIDATES_MAX);
}

/** 대화 안내 의도 후보(최대 6, 설계서 §5.1) — 쓸 수 있는 작업 지점 + 출입구 지점. 설명은 고정 문구. */
export function npcEscortCandidates(input: NpcCandidateInput): NpcEscortCandidate[] {
  const list: NpcEscortCandidate[] = [];
  for (const spot of input.map.npcSpots) {
    if (spot.kind !== 'work' && spot.kind !== 'entrance') continue;
    if (!npcSpotUsable(input, spot)) continue;
    list.push({ id: npcEscortCandidateId(spot.id), description: `${spot.label}까지 안내`, spotId: spot.id });
  }
  return list.slice(0, NPC_INTENT_CANDIDATES_MAX);
}

export type NpcReasonCode = 'station_available' | 'take_break' | 'return_home';

export interface NpcPlanObservation {
  /** NPC 가 지금 선 칸. */
  at: { tx: number; ty: number };
  /** 지금 선 지점(지점 위가 아니면 null). */
  currentSpotId: string | null;
  /** 최근에 간 지점 id(오래된 것이 앞, 끝이 가장 최근). 실제로 도착 · 완료한 것만. */
  recentSpotIds: readonly string[];
}

export interface NpcRuleChoice {
  candidateId: string;
  reasonCode: NpcReasonCode;
  score: number;
}

/** 역할별 기본 점수 — 연구원은 일을 먼저, 쉬기 · 자리 지키기는 그다음. */
const BASE_SCORE: Record<NpcPlanActionKind, number> = { work_at: 3, wait_at: 1.5, return_home: 1 };
const DISTANCE_PENALTY_PER_TILE = 0.08;

/**
 * 규칙 선택기(기준선) — 점수 = 기본(종류) − 0.08 × 맨해튼 거리 − 반복 벌점(지금 선 지점 −5 · 최근 2곳 −3 · 최근 4곳 −1.5).
 * 동점이면 후보 id 순. 후보가 없으면 null(호출한 쪽이 홈 대기).
 */
export function selectNpcPlanByRules(
  candidates: readonly NpcPlanCandidate[],
  obs: NpcPlanObservation,
  spotOf: (id: string) => NpcSpot | undefined,
): NpcRuleChoice | null {
  let best: NpcRuleChoice | null = null;
  const recent = obs.recentSpotIds;
  for (const c of candidates) {
    const spot = spotOf(c.destinationId);
    if (!spot) continue;
    let score = BASE_SCORE[c.kind] - DISTANCE_PENALTY_PER_TILE * (Math.abs(spot.tx - obs.at.tx) + Math.abs(spot.ty - obs.at.ty));
    if (obs.currentSpotId === spot.id) score -= 5;
    else if (recent.slice(-2).includes(spot.id)) score -= 3;
    else if (recent.slice(-4).includes(spot.id)) score -= 1.5;
    score = Math.round(score * 1000) / 1000;
    const reasonCode: NpcReasonCode = c.kind === 'work_at' ? 'station_available' : c.kind === 'wait_at' ? 'take_break' : 'return_home';
    if (!best || score > best.score || (score === best.score && c.id < best.candidateId)) best = { candidateId: c.id, reasonCode, score };
  }
  return best;
}

/** 행동 시간(초) — `work_at` 10~60 · 그 밖 5~30. `rand01` 은 [0, 1). 모델이 준 값도 `clampNpcDuration` 으로 자른다(§4.3). */
export function npcActivityDurationSec(kind: NpcPlanActionKind, rand01: number): number {
  const [lo, hi] = kind === 'work_at' ? NPC_MOVE.workSec : NPC_MOVE.waitSec;
  const r = Number.isFinite(rand01) ? Math.min(Math.max(rand01, 0), 0.999999) : 0;
  return lo + Math.floor(r * (hi - lo + 1));
}

export function clampNpcDuration(kind: NpcPlanActionKind, seconds: unknown): number {
  const [lo, hi] = kind === 'work_at' ? NPC_MOVE.workSec : NPC_MOVE.waitSec;
  const n = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.round(seconds) : lo;
  return Math.min(Math.max(n, lo), hi);
}

/** 문자열 → 32비트 시드(FNV-1a). 학급 · 공간 · 개체 id 로 NPC 마다 다른 결정적 일과를 만든다. */
export function npcSeedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 결정적 난수열(mulberry32) — [0, 1). */
export function npcRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
