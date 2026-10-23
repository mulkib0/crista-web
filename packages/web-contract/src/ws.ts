/**
 * WebSocket 메시지 — `/ws` 는 로그인 쿠키로 인증하고, 학생은 자기 학급 채널 · 모둠 채널을, 교사는 자기 학급 채널들을 받는다.
 * 사옥 지구 아바타 위치(W2)는 화면 → 서버 → 같은 학급으로 중계만 한다(저장 · 판정 없음, 초당 5회까지 — 설계 §4.1).
 * 모둠 작업 · 찜 · 노트가 바뀌면(W3) 모둠 채널에 `board.changed` 만 보내고, 화면이 `GET /api/board` 를 다시 읽는다.
 */
import type { TeamView } from './api.ts';
import type { Avatar } from './rules.ts';

export type Direction = 'north' | 'south' | 'east' | 'west';
export const DIRECTIONS: readonly Direction[] = ['north', 'south', 'east', 'west'];

/** 사옥 지구에 있는 학생 한 명. 좌표는 지구 픽셀(타일 32px). */
export interface DistrictPeer {
  userId: string;
  displayName: string;
  avatar: Avatar | null;
  /** 입사한 모둠의 잉크 1..8(입사 전 null). */
  ink: number | null;
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
}

/** 사옥 지구 크기 — 40×26 타일, 타일 32px(설계 §4.1). 서버는 이 안으로 좌표를 자른다. */
export const DISTRICT_MAP = { cols: 40, rows: 26, tile: 32 } as const;

/** 위치 중계 상한 — 화면이 이보다 자주 보내면 서버가 버린다. */
export const DISTRICT_MOVE_PER_SEC = 5;

export type ServerMessage =
  | { type: 'hello'; userId: string; channels: string[] }
  /** 학급 채널 — 누가 어느 사옥에 입사했나(공개 정보). */
  | { type: 'team.joined'; classId: string; teamId: string; userId: string; displayName: string; memberCount: number }
  /** 학급 채널 — 등기(전광판 첫 소식이 된다). */
  | { type: 'team.registered'; classId: string; team: TeamView; byName: string }
  /** 학급 채널 — 등기 고치기 · 교사 정정. */
  | { type: 'team.updated'; classId: string; team: TeamView; byName: string }
  /** 학급 채널 — 교사가 학생을 모둠에 배정 · 옮김. */
  | { type: 'member.assigned'; classId: string; userId: string; teamId: string | null }
  /** 사옥 지구 — 들어오면 지금 있는 사람들. */
  | { type: 'district.snapshot'; peers: DistrictPeer[] }
  | { type: 'district.peer'; peer: DistrictPeer }
  | { type: 'district.leave'; userId: string }
  /** 모둠 채널 — 작업 · 찜 · 표적 · 리드 · 노트가 바뀌었다(화면은 `/api/board` 를 다시 읽는다). */
  | { type: 'board.changed'; teamId: string; reason: string; byName?: string }
  /** 모둠 채널 — 진행 중 작업의 진행률만(화면이 그 줄만 고친다. 결과는 끝난 뒤 `board.changed`). */
  | { type: 'job.progress'; teamId: string; jobId: string; status: 'queued' | 'running'; progress: number; phase?: string; queuePosition?: number }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'ping' }
  | { type: 'district.enter'; x: number; y: number; dir: Direction }
  | { type: 'district.move'; x: number; y: number; dir: Direction; moving: boolean }
  | { type: 'district.exit' };

export const classChannel = (classId: string): string => `class:${classId}`;
export const teamChannel = (teamId: string): string => `team:${teamId}`;
