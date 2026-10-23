/**
 * WebSocket 메시지 — `/ws` 는 로그인 쿠키로 인증하고, 학생은 자기 학급 채널 · 모둠 채널을, 교사는 자기 학급 채널들을 받는다.
 * 사옥 지구 아바타 위치(W2)는 화면 → 서버 → 같은 학급으로 중계만 한다(저장 · 판정 없음, 초당 5회까지 — 설계 §4.1).
 * 모둠 작업 · 찜 · 노트가 바뀌면(W3) 모둠 채널에 `board.changed` 만 보내고, 화면이 `GET /api/board` 를 다시 읽는다.
 * 3판 기반: 서류 심사 · 학습 채점 · 1.2 회의는 모둠 채널, 전광판 소식 · 게임 시계 · 특허 원장은 학급 채널, 심사 플래그는 교사 채널.
 * 메시지는 '무엇이 바뀌었다'만 싣고 상세는 화면이 그 기능의 GET 을 다시 읽는다(비공개 값을 채널에 싣지 않는다).
 */
import type { TeamView } from './api.ts';
import type { FeedItemView } from './feed.ts';
import type { ClassClockView } from './clock.ts';
import type { DistrictLight, LearnTargetType } from './learn.ts';
import type { BoardEventView } from './market.ts';
import type { DocKind, DocReviewVerdict } from './review.ts';
import type { Avatar } from './rules.ts';
import type { ScreenAgenda } from './screen.ts';

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
  /** 학급 채널 — 학생이 학급을 골라 들어옴(교사 명단 새로 고침). */
  | { type: 'member.enrolled'; classId: string; userId: string }
  /** 사옥 지구 — 들어오면 지금 있는 사람들. */
  | { type: 'district.snapshot'; peers: DistrictPeer[] }
  | { type: 'district.peer'; peer: DistrictPeer }
  | { type: 'district.leave'; userId: string }
  /** 모둠 채널 — 작업 · 찜 · 표적 · 리드 · 노트가 바뀌었다(화면은 `/api/board` 를 다시 읽는다). */
  | { type: 'board.changed'; teamId: string; reason: string; byName?: string }
  /** 모둠 채널 — 진행 중 작업의 진행률만(화면이 그 줄만 고친다. 결과는 끝난 뒤 `board.changed`). */
  | { type: 'job.progress'; teamId: string; jobId: string; status: 'queued' | 'running'; progress: number; phase?: string; queuePosition?: number }
  /** 모둠 채널 — 서류 심사 판정이 났다(LLM 은 비동기 — 접수 즉시 pending, 끝나면 이 메시지). */
  | { type: 'doc.reviewed'; teamId: string; kind: DocKind; docId: string; reviewId: string; verdict: DocReviewVerdict }
  /** 모둠 채널 — 학습 문항 · 노트 · 피치 채점이 끝났다. */
  | { type: 'learn.graded'; teamId: string; targetType: LearnTargetType; targetId: string; score: number | null; crista: number }
  /** 모둠 채널 — 기초 연구비 충전(10분 틱 · 전원 가동 즉시 정산). */
  | { type: 'learn.stipend'; teamId: string; stepId: string; crista: number; multiplier: number; reason: 'tick' | 'settle' }
  /** 학급 채널 — 사옥 창문 불빛(켜진 창 수만 · FLEARN). 화면은 이 값으로 바로 고친다. */
  | { type: 'district.lights'; classId: string; lights: DistrictLight[] }
  /** 모둠 채널 — 1.2 기준 회의(브리핑 · 제안 · 투표 · 합의 · 다시 논의) 칸이 바뀌었다. */
  | { type: 'screen.changed'; teamId: string; reason: string; agenda?: ScreenAgenda; byName?: string }
  /** 학급 채널 — 전광판 LED 소식 한 줄(공개 정보만). */
  | { type: 'board.event'; classId: string; event: BoardEventView }
  /** 학급 채널 — 게임 시계(교사 명령 · 게임 일이 바뀔 때). */
  | { type: 'clock'; classId: string; clock: ClassClockView }
  /** 학급 채널 — 학급 특허 원장이 바뀌었다(등록 · 포기 · 정정). */
  | { type: 'patent.ledger'; classId: string; reason: 'registered' | 'abandoned' | 'corrected'; patentId?: string }
  /** 교사 채널 — 교사가 볼 일(심사 인젝션 플래그 · LLM 거절로 수동 심사 대기 · 이의 제기). */
  | { type: 'teacher.alert'; classId: string; kind: 'review_flagged' | 'review_manual' | 'appeal' | 'learn_flagged'; refId: string; teamId?: string; message: string }
  /** 모둠 채널 — 대화방 새 줄(대화 · 행적). 모둠원만 받는 채널이라 줄을 그대로 싣는다(feed.ts 머리 주석). */
  | { type: 'feed.posted'; teamId: string; item: FeedItemView }
  /** 모둠 채널 — 대화방 줄이 바뀌었다(같은 행적 잇달아 → repeat · 대화 지우기). */
  | { type: 'feed.updated'; teamId: string; item: FeedItemView }
  /** 모둠 채널 — 지금 접속한 모둠원(연결이 생기거나 끊길 때). */
  | { type: 'feed.presence'; teamId: string; online: string[] }
  /** 모둠 채널 — 누가 입력 중(본인 연결에는 보내지 않는다). 받는 쪽은 FEED_TYPING_MS 뒤 지운다. */
  | { type: 'feed.typing'; teamId: string; userId: string; displayName: string; stepId: string | null }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'ping' }
  | { type: 'district.enter'; x: number; y: number; dir: Direction }
  | { type: 'district.move'; x: number; y: number; dir: Direction; moving: boolean }
  | { type: 'district.exit' }
  /** 대화방 입력 중 — 서버가 같은 모둠에 중계한다(저장 없음 · 연결마다 FEED_TYPING_MS 에 한 번). */
  | { type: 'feed.typing'; stepId: string | null };

export const classChannel = (classId: string): string => `class:${classId}`;
export const teamChannel = (teamId: string): string => `team:${teamId}`;
/** 그 학급 교사에게만(학생은 받지 않는다). */
export const teacherChannel = (classId: string): string => `teacher:${classId}`;
