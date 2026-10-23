/**
 * REST 규격 — 경로 · 요청 · 응답 모양(서버 `apps/server/src/routes.ts` 가 이 모양을 지킨다).
 * 모든 오류 응답은 `ApiErrorBody` 다. 세션은 HttpOnly 쿠키(`SESSION_COOKIE`)라 화면 스크립트는 토큰을 모른다.
 */
import type { NoteView } from './pipeline.ts';
import type { DocSectionView } from './review.ts';
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
  | 'already_in_class'
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
  | 'name_locked'
  // 파이프라인(W3)
  | 'not_registered_team'
  | 'step_locked'
  | 'insufficient_funds'
  | 'invalid_input'
  | 'worker_unavailable'
  | 'too_many_jobs'
  | 'claimed'
  // 모둠 동시 조작(0003) — 화면이 읽은 버전이 낡았다(리드 · 노트 · 표적 바뀜).
  | 'stale'
  // 3판 기반 — 상한(1인 · 모둠 · 하루 심사 · 특허 수)에 닿음 · 근거 칩이 데이터와 틀림(막음) · 이미 있음(같은 분자 특허 · 접수 중 IND) · LLM 을 쓸 수 없음.
  | 'limit_reached'
  | 'reason_blocked'
  | 'already_exists'
  | 'llm_unavailable';

export interface ApiErrorBody {
  /** `note` — 노트 칸 409 `stale` 때 지금 칸(상대 본문 · 버전). 칸이 아직 없으면 생략. `section` — 서류 칸(3판)도 같다. */
  error: { code: ErrorCode; message: string; retryAfterSec?: number; team?: TeamView; note?: NoteView; section?: DocSectionView };
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

/** 로그인 뒤 어디로 가나(설계 §2): 학급 고르기(아직 학급이 없는 학생) · 사옥 지구 ② · 전광판 ③ · 교사 화면. */
export type NextScreen = 'enroll' | 'district' | 'board' | 'teacher';

export interface MeResponse {
  account: AccountView;
  next: NextScreen;
  /** 학생만 — 사옥 지구에서 고른 캐릭터(처음엔 null). */
  avatar?: Avatar | null;
  /** 학생만. */
  class?: ClassSummary;
  team?: TeamView | null;
}

/** 학생이 가입 뒤 고르는 학급 — 교사가 '학생 받기'를 연 학급만. */
export interface OpenClassView {
  id: string;
  name: string;
  teacherName: string;
  teamCount: number;
  studentCount: number;
  maxStudents: number;
}

export interface OpenClassesResponse {
  classes: OpenClassView[];
}

export interface DistrictResponse {
  class: ClassSummary;
  teams: Array<TeamView & { isMine: boolean; canJoin: boolean }>;
  myTeamId: string | null;
}

// ── 요청 ──

export interface SignupRequest {
  /** 생략하면 학생. 'teacher' 는 당분간 거절(403) — 교사는 teacher:create 로만 만든다. */
  kind?: Role;
  /** 생략 가능 — 학생은 가입 뒤 학급을 고른다(`openClasses` · `enroll`). 보내면 그 학급에 바로 넣는다(점검 스크립트용). */
  classCode?: string;
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

export interface AvatarRequest {
  avatar: Avatar;
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
  openClasses: '/api/open-classes',
  enroll: (classId: string) => `/api/classes/${classId}/enroll`,
  assignTeam: (classId: string, userId: string) => `/api/classes/${classId}/members/${userId}/team`,
  join: (teamId: string) => `/api/teams/${teamId}/join`,
  registration: (teamId: string) => `/api/teams/${teamId}/registration`,
  avatar: '/api/me/avatar',
  // 화면 ③(W3) — 모둠은 세션에서 정한다(경로에 모둠 id 를 싣지 않는다).
  board: '/api/board',
  diseaseTargets: (diseaseId: string) => `/api/datasets/targets?disease=${encodeURIComponent(diseaseId)}`,
  funnel: '/api/datasets/funnel',
  properties: '/api/molecule/properties',
  picks: '/api/program/picks',
  target: '/api/program/target',
  lead: '/api/program/lead',
  jobs: '/api/jobs',
  claims: '/api/claims',
  claim: (compoundId: string) => `/api/claims/${encodeURIComponent(compoundId)}`,
  note: (stepId: string, section: string) => `/api/notes/${stepId}/${section}`,
  ws: '/ws',
} as const;
