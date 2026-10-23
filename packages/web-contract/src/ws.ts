/**
 * WebSocket 메시지 — `/ws` 는 로그인 쿠키로 인증하고, 학생은 자기 학급 채널 · 모둠 채널을, 교사는 자기 학급 채널들을 받는다.
 * W1 은 서버 → 화면 알림만 쓴다. 사옥 지구 아바타 위치 중계(화면 → 서버)는 W2.
 */
import type { TeamView } from './api.ts';

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
  | { type: 'pong' };

export type ClientMessage = { type: 'ping' };

export const classChannel = (classId: string): string => `class:${classId}`;
export const teamChannel = (teamId: string): string => `team:${teamId}`;
