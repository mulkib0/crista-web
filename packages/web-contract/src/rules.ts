/**
 * 입력 규칙 — 화면과 서버가 같은 함수로 검사한다(설계 §3 · §4.3 · §9).
 * 서버는 이 결과를 믿지 않고 다시 검사하고, DB 의 check 제약이 마지막 방어선이다(db/migrations 와 같은 값).
 */

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
const no = <T>(message: string): Checked<T> => ({ ok: false, message });

/** 글자 수 — 코드 포인트로 센다(한글 · 이모지 한 글자 = 1). */
export const charLength = (text: string): number => Array.from(text).length;

const clean = (raw: unknown): string => (typeof raw === 'string' ? raw.normalize('NFC').trim() : '');

// ── 계정 ──

/** 웹 계정의 합성 이메일 도메인. 게임(`students.crista.test`)과 섞이지 않는다(설계 §7.1). */
export const WEB_EMAIL_DOMAIN = 'web.crista.test';
export const GAME_EMAIL_DOMAIN = 'students.crista.test';

export const LOGIN_ID_PATTERN = /^[a-z0-9]{3,20}$/;
export const PASSWORD_MIN = 8;
/** GoTrue 가 bcrypt 로 저장해 72바이트를 넘으면 잘린다 — 넘는 값은 받지 않는다. */
export const PASSWORD_MAX_BYTES = 72;
export const DISPLAY_NAME_MAX = 20;

/** 아이디 — 영문 소문자 · 숫자 3~20자. 대문자는 소문자로 바꿔 받는다. */
export function checkLoginId(raw: unknown): Checked<string> {
  const value = clean(raw).toLowerCase();
  if (!LOGIN_ID_PATTERN.test(value)) return no('아이디는 영문 소문자 · 숫자 3~20자로 써 주세요.');
  return ok(value);
}

export function checkPassword(raw: unknown): Checked<string> {
  if (typeof raw !== 'string') return no('비밀번호를 써 주세요.');
  if (charLength(raw) < PASSWORD_MIN) return no(`비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`);
  if (new TextEncoder().encode(raw).length > PASSWORD_MAX_BYTES) return no('비밀번호가 너무 길어요(영문 기준 72자까지).');
  return ok(raw);
}

/** 표시 이름 — 실명 대신 별명도 된다. 1~20자, 줄바꿈 · 제어 문자 없음. */
export function checkDisplayName(raw: unknown): Checked<string> {
  const value = clean(raw).replace(/\s+/g, ' ');
  if (charLength(value) < 1 || charLength(value) > DISPLAY_NAME_MAX) return no(`이름은 1~${DISPLAY_NAME_MAX}자로 써 주세요.`);
  if (/\p{Cc}/u.test(value)) return no('이름에 쓸 수 없는 글자가 있어요.');
  return ok(value);
}

export function loginIdToEmail(loginId: string): string {
  return `${loginId}@${WEB_EMAIL_DOMAIN}`;
}

// ── 학급 ──

/** 학급 코드 글자 — 헷갈리는 0 · O · 1 · I · L 을 뺐다. */
export const CLASS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CLASS_CODE_LENGTH = 6;
export const CLASS_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

/** 학생이 친 학급 코드 — 공백 · 하이픈을 빼고 대문자로. */
export function checkClassCode(raw: unknown): Checked<string> {
  const value = clean(raw).toUpperCase().replace(/[\s-]/g, '');
  if (!CLASS_CODE_PATTERN.test(value)) return no('학급 코드 6자를 확인해 주세요.');
  return ok(value);
}

export const TEAM_COUNT_MIN = 2;
export const TEAM_COUNT_MAX = 8;
export const MAX_STUDENTS_LIMIT = 200;
export const TEAM_CAPACITY_LIMIT = 50;
export const CLASS_NAME_MAX = 40;

export type Assignment = 'assigned' | 'walk-in';
export const ASSIGNMENTS: readonly Assignment[] = ['assigned', 'walk-in'];
/** 설계 §12-1 의 조정자 제안. 사용자가 확정하면 여기만 바꾼다. */
export const DEFAULT_ASSIGNMENT: Assignment = 'walk-in';
export const DEFAULT_MAX_STUDENTS = 40;

export interface ClassInput {
  name: string;
  teamCount: number;
  assignment: Assignment;
  maxStudents: number;
  /** null = 자동(⌈학급 정원 ÷ 모둠 수⌉). */
  teamCapacity: number | null;
}

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function checkClassInput(raw: unknown): Checked<ClassInput> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = clean(body.name).replace(/\s+/g, ' ');
  if (charLength(name) < 1 || charLength(name) > CLASS_NAME_MAX) return no(`학급 이름은 1~${CLASS_NAME_MAX}자로 써 주세요.`);
  if (!isInt(body.teamCount, TEAM_COUNT_MIN, TEAM_COUNT_MAX)) return no(`모둠 수는 ${TEAM_COUNT_MIN}~${TEAM_COUNT_MAX} 사이 정수예요.`);
  const assignment = body.assignment ?? DEFAULT_ASSIGNMENT;
  if (!ASSIGNMENTS.includes(assignment as Assignment)) return no('배정 방식은 assigned 또는 walk-in 이에요.');
  const maxStudents = body.maxStudents ?? DEFAULT_MAX_STUDENTS;
  if (!isInt(maxStudents, 1, MAX_STUDENTS_LIMIT)) return no(`학급 정원은 1~${MAX_STUDENTS_LIMIT} 사이 정수예요.`);
  const teamCapacity = body.teamCapacity ?? null;
  if (teamCapacity !== null && !isInt(teamCapacity, 1, TEAM_CAPACITY_LIMIT)) return no(`모둠 정원은 1~${TEAM_CAPACITY_LIMIT} 사이 정수이거나 비워 두세요.`);
  return ok({ name, teamCount: body.teamCount, assignment: assignment as Assignment, maxStudents, teamCapacity });
}

/** 모둠 정원 — 교사가 정했으면 그 값, 아니면 ⌈학급 정원 ÷ 모둠 수⌉(설계 §4.2). */
export function teamCapacityOf(input: { maxStudents: number; teamCount: number; teamCapacity: number | null }): number {
  return input.teamCapacity ?? Math.ceil(input.maxStudents / input.teamCount);
}

// ── 스타트업 이름 등기(설계 §4.3) ──

export const STARTUP_NAME_MIN = 2;
export const STARTUP_NAME_MAX = 14;
export const SLOGAN_MAX = 40;
/** 한글 · 영문 · 숫자, 공백은 낱말 사이에 한 칸만 한 번. */
export const STARTUP_NAME_PATTERN = /^[가-힣A-Za-z0-9]+(?: [가-힣A-Za-z0-9]+)?$/;
export const TICKER_PATTERN = /^[A-Z]{3,4}$/;

/**
 * 거절할 낱말 — 공백을 빼고 소문자로 바꾼 이름 안에 들어 있으면 거절한다.
 * 수업용 최소 목록이다(교사가 등기 뒤에도 이름을 고칠 수 있다 — 설계 §9).
 */
export const BLOCKED_WORDS: readonly string[] = [
  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '좆', '존나', '개새', '새끼', '지랄', '미친놈', '미친년', '닥쳐', '꺼져', '엿먹',
  'fuck', 'shit', 'bitch', 'pussy', 'nigg', 'porn',
];

/** 학급 안 유일성을 따질 때의 이름 열쇠 — 공백을 빼고 소문자로(DB `name_key` 와 같은 규칙). */
export const startupNameKey = (name: string): string => name.replace(/ /g, '').toLowerCase();

export function checkStartupName(raw: unknown): Checked<string> {
  const value = clean(raw);
  const n = charLength(value);
  if (n < STARTUP_NAME_MIN || n > STARTUP_NAME_MAX) return no(`스타트업 이름은 ${STARTUP_NAME_MIN}~${STARTUP_NAME_MAX}자로 써 주세요.`);
  if (!STARTUP_NAME_PATTERN.test(value)) return no('스타트업 이름은 한글 · 영문 · 숫자와 공백 한 칸만 쓸 수 있어요.');
  const key = startupNameKey(value);
  if (BLOCKED_WORDS.some((word) => key.includes(word))) return no('이 이름은 쓸 수 없어요. 다른 이름을 골라 주세요.');
  return ok(value);
}

export function checkTicker(raw: unknown): Checked<string> {
  const value = clean(raw).toUpperCase();
  if (!TICKER_PATTERN.test(value)) return no('티커는 영문 대문자 3~4자예요.');
  if (BLOCKED_WORDS.some((word) => value.toLowerCase().includes(word))) return no('이 티커는 쓸 수 없어요.');
  return ok(value);
}

/** 슬로건 — 선택. 빈 값은 null. */
export function checkSlogan(raw: unknown): Checked<string | null> {
  if (raw === undefined || raw === null) return ok(null);
  const value = clean(raw).replace(/\s+/g, ' ');
  if (value.length === 0) return ok(null);
  if (charLength(value) > SLOGAN_MAX) return no(`슬로건은 ${SLOGAN_MAX}자까지예요.`);
  if (/\p{Cc}/u.test(value)) return no('슬로건에 쓸 수 없는 글자가 있어요.');
  if (BLOCKED_WORDS.some((word) => startupNameKey(value).includes(word))) return no('슬로건에 쓸 수 없는 낱말이 있어요.');
  return ok(value);
}

export interface RegistrationInput {
  name: string;
  ticker: string;
  slogan: string | null;
}

export function checkRegistration(raw: unknown): Checked<RegistrationInput> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = checkStartupName(body.name);
  if (!name.ok) return name;
  const ticker = checkTicker(body.ticker);
  if (!ticker.ok) return ticker;
  const slogan = checkSlogan(body.slogan);
  if (!slogan.ok) return slogan;
  return ok({ name: name.value, ticker: ticker.value, slogan: slogan.value });
}

/** 고치기 — 바꿀 칸만 보낸다. 슬로건에 null 을 보내면 지운다. */
export function checkRegistrationPatch(raw: unknown): Checked<Partial<RegistrationInput>> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const out: Partial<RegistrationInput> = {};
  if (body.name !== undefined) {
    const name = checkStartupName(body.name);
    if (!name.ok) return name;
    out.name = name.value;
  }
  if (body.ticker !== undefined) {
    const ticker = checkTicker(body.ticker);
    if (!ticker.ok) return ticker;
    out.ticker = ticker.value;
  }
  if (body.slogan !== undefined) {
    const slogan = checkSlogan(body.slogan);
    if (!slogan.ok) return slogan;
    out.slogan = slogan.value;
  }
  if (Object.keys(out).length === 0) return no('고칠 칸(name · ticker · slogan)을 하나 이상 보내 주세요.');
  return ok(out);
}

export type Avatar = 'ceo' | 'cso' | 'cto' | 'cmo';
export const AVATARS: readonly Avatar[] = ['ceo', 'cso', 'cto', 'cmo'];
