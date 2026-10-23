/**
 * REST 규격 — 경로 · 요청 · 응답 모양(서버 `apps/server/src/routes.ts` 가 이 모양을 지킨다).
 * 모든 오류 응답은 `ApiErrorBody` 다. 세션은 HttpOnly 쿠키(`SESSION_COOKIE`)라 화면 스크립트는 토큰을 모른다.
 */
import type { Assignment, Avatar } from './rules.ts';

export const SESSION_COOKIE = 'crista_web_sid';

export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'auth_unavailable'
  | 'internal'
  // 가입 · 로그인
  | 'invalid_class_code'
  | 'class_closed'
  | 'class_full'
  | 'login_id_taken'
  | 'invalid_credentials'
  | 'login_locked'
  // 입사 · 등기
  | 'already_in_team'
  | 'team_full'
  | 'not_assigned'
  | 'not_in_team'
  | 'already_registered'
  | 'not_registered'
  | 'name_taken'
  | 'ticker_taken'
  | 'name_locked';

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; retryAfterSec?: number; team?: TeamView };
}

// ── 모양 ──

export type Role = 'teacher' | 'student';

export interface AccountView {
  userId: string;
  loginId: string;
  displayName: string;
  kind: Role;
}

export interface TeamView {
  id: string;
  classId: string;
  /** 부지 번호 1..N. */
  plot: number;
  /** 외관 변주 1..8 · 잉크 1..8(W2 그림이 쓴다). */
  facade: number;
  ink: number;
  hqTier: 1 | 2 | 3;
  /** 등기 전이면 null. */
  startupName: string | null;
  ticker: string | null;
  slogan: string | null;
  registeredAt: string | null;
  registeredByName: string | null;
  /** 첫 유료 행동 뒤 잠김(그 뒤엔 교사만 고친다). */
  nameLocked: boolean;
  memberCount: number;
  capacity: number;
}

export interface ClassSummary {
  id: string;
  name: string;
  teamCount: number;
  assignment: Assignment;
  maxStudents: number;
  teamCapacity: number;
  studentCount: number;
}

/** 교사에게만 — 학급 코드와 열림 상태가 붙는다. */
export interface TeacherClassView extends ClassSummary {
  code: string;
  codeOpen: boolean;
  teamCapacitySetting: number | null;
  createdAt: string;
}

export interface RosterEntry {
  userId: string;
  loginId: string;
  displayName: string;
  teamId: string | null;
  joinedTeamAt: string | null;
  avatar: Avatar | null;
}

export interface TeacherClassDetail extends TeacherClassView {
  teams: TeamView[];
  roster: RosterEntry[];
}

/** 로그인 뒤 어디로 가나(설계 §2): 사옥 지구 ② · 전광판 ③ · 교사 화면. */
export type NextScreen = 'district' | 'board' | 'teacher';

export interface MeResponse {
  account: AccountView;
  next: NextScreen;
  /** 학생만. */
  class?: ClassSummary;
  team?: TeamView | null;
}

export interface DistrictResponse {
  class: ClassSummary;
  teams: Array<TeamView & { isMine: boolean; canJoin: boolean }>;
  myTeamId: string | null;
}

// ── 요청 ──

export interface SignupRequest {
  classCode: string;
  loginId: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface CreateClassRequest {
  name: string;
  teamCount: number;
  assignment?: Assignment;
  maxStudents?: number;
  teamCapacity?: number | null;
}

export interface ClassCodeRequest {
  action: 'regenerate' | 'close' | 'open';
}

export interface AssignTeamRequest {
  teamId: string | null;
}

export interface RegistrationRequest {
  name: string;
  ticker: string;
  slogan?: string | null;
}

export interface JoinResponse {
  team: TeamView;
  /** 이미 그 모둠이었으면 false(같은 요청을 다시 보내도 된다). */
  joined: boolean;
}

export interface RegistrationResponse {
  team: TeamView;
}

/** 경로 목록 — 화면 · 테스트가 문자열을 흩뿌리지 않게. */
export const API = {
  health: '/api/health',
  signup: '/api/auth/signup',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/me',
  district: '/api/district',
  classes: '/api/classes',
  classDetail: (classId: string) => `/api/classes/${classId}`,
  classCode: (classId: string) => `/api/classes/${classId}/code`,
  assignTeam: (classId: string, userId: string) => `/api/classes/${classId}/members/${userId}/team`,
  join: (teamId: string) => `/api/teams/${teamId}/join`,
  registration: (teamId: string) => `/api/teams/${teamId}/registration`,
  ws: '/ws',
} as const;
