/**
 * 학급 시계 — 순수 규칙(M3). 단일 소스: `docs/2026-10-19-game-balance-v0.md` §2, M3 브리프 §4.2.
 *
 * 모델
 * - 시계는 **앵커**(현실 시각 · 그때의 누적 게임 일 · 그때의 운영 시간) + 지금 상태(일시정지 · 수업 세션 · 모드)로 표현한다.
 *   지금 게임 일 = 앵커 게임 일 + 앵커 이후 구간별 (배율 × 경과). 앵커 이후로는 배율이 바뀌는 곳이 **예정 종료 시각 하나뿐**이다.
 * - 운영 시간 = 일시정지되지 않은 현실 시간의 누계(ms). 회생 유예 48시간 · 수업 밖 이벤트 상한 72시간을 이 값으로 잰다.
 * - 명령은 모두 먼저 지금까지를 앵커로 접고(소급 없음) 상태를 바꾼다. 예정 종료 시각이 지났으면(서버가 내려가 있었어도)
 *   그 시각에서 접고 수업 밖으로 바꾼다.
 * - 시각은 전부 인자로 받는다(`Date.now` 를 쓰지 않는다). 시각 단위는 ms epoch, 게임 시간 단위는 게임 일(소수).
 *
 * 월 경계 처리(서버) 순서 주의: `locateGameDay` 는 **지금 앵커 이후** 구간만 되짚는다. 그래서 서버는
 * ① 지금 상태로 월 경계를 모두 처리(정산 · 추첨)한 뒤 ② `settleSessionEnd` / `applyClockCommand` 로 앵커를 옮겨야 한다.
 * (앵커를 먼저 옮기면 그 이전 경계는 앵커 시점 정보로 되짚힌다.)
 */
import type { ClassId, ClockMode, ClockView, CourseKind, GmClockCommand, SessionPhase } from '@crista/shared-types';
import {
  DEFAULT_FIXED_GAME_DAYS_PER_REAL_DAY,
  DEFAULT_SESSION_MINUTES,
  GAME_DAYS_PER_MONTH,
  GAME_MONTHS_PER_YEAR,
  IN_CLASS_GAME_MONTHS_PER_REFERENCE,
  IN_CLASS_REFERENCE_MINUTES,
  REAL_MINUTES_PER_DAY,
  gameDaysPerRealMinute,
  monthsToGameDays,
} from './economy.ts';

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * 고정 모드 배율 상한(현실 1일당 게임 일) = 균형안 §2 의 가장 빠른 배율(여러 차시 수업 중, 현실 50분 = 12게임 월)
 * = 360게임 일 / 50분 = 7.2게임 일/분 × 1440분 = **10,368**.
 */
export const MAX_FIXED_GAME_DAYS_PER_REAL_DAY =
  (monthsToGameDays(IN_CLASS_GAME_MONTHS_PER_REFERENCE.multiSession) / IN_CLASS_REFERENCE_MINUTES) *
  REAL_MINUTES_PER_DAY;

/** 수업 길이(분) 입력 범위 — 입력 검증값(스키마 `class_clocks.session_minutes between 1 and 600`). */
export const SESSION_MINUTES_MIN = 1;
export const SESSION_MINUTES_MAX = 600;
/** 수업 연장(분) 입력 범위 — 입력 검증값(gm.ts `extendSession` 1~120분). */
export const EXTEND_MINUTES_MIN = 1;
export const EXTEND_MINUTES_MAX = 120;

/** 진행 중 수업 세션(현실 시각, ms epoch). */
export interface ClockSession {
  readonly seq: number;
  readonly startedAtMs: number;
  /** 예정 종료 시각 — 이 시각에 자동으로 수업 밖(완속)으로 바뀐다. */
  readonly endsAtMs: number;
}

/** 학급 시계 상태 — 스키마 `class_clocks` 와 1:1(월 처리 커서·이벤트 상한 칸은 events.ts 의 `AutoEventCounters`). */
export interface ClockState {
  readonly course: CourseKind;
  readonly mode: ClockMode;
  /** 수업 기본 길이(분). 분당 배율의 기준이 아니라 예정 길이다. */
  readonly sessionMinutes: number;
  /** 고정 모드 배율(현실 1일당 게임 일). */
  readonly fixedGameDaysPerRealDay: number;
  /** 교사 수동 일시정지 — 게임 시간 · 운영 시간이 모두 멈춘다. */
  readonly paused: boolean;
  /** 앵커 현실 시각(ms epoch). */
  readonly anchorAtMs: number;
  /** 앵커 시점의 누적 게임 일. */
  readonly anchorGameDays: number;
  /** 앵커 시점의 누적 운영 시간(ms). */
  readonly anchorOperatingMs: number;
  /** 진행 중 수업. 없으면 수업 밖. */
  readonly session: ClockSession | null;
  /** 마지막으로 시작한 수업 번호(0 = 아직 없음). 다음 수업은 +1. */
  readonly lastSessionSeq: number;
}

/** 새 학급 시계 — **일시정지**로 시작하고 게임 일 · 운영 시간은 0 이다(브리프 §4.2). */
export function initialClockState(input: {
  readonly course: CourseKind;
  readonly nowMs: number;
  readonly mode?: ClockMode;
  readonly sessionMinutes?: number;
  readonly fixedGameDaysPerRealDay?: number;
}): ClockState {
  return {
    course: input.course,
    mode: input.mode ?? 'variable',
    sessionMinutes: input.sessionMinutes ?? DEFAULT_SESSION_MINUTES,
    fixedGameDaysPerRealDay: input.fixedGameDaysPerRealDay ?? DEFAULT_FIXED_GAME_DAYS_PER_REAL_DAY,
    paused: true,
    anchorAtMs: input.nowMs,
    anchorGameDays: 0,
    anchorOperatingMs: 0,
    session: null,
    lastSessionSeq: 0,
  };
}

// ─────────────────────────────── 조회 ───────────────────────────────

/** 구간의 배율(게임 일/현실 분) — 일시정지는 따지지 않는다(호출자가 0 처리). */
function phaseRate(state: ClockState, phase: SessionPhase): number {
  return gameDaysPerRealMinute(state, phase);
}

/**
 * 앵커 이후 [anchorAtMs, nowMs] 를 배율이 같은 구간으로 나눈다(일시정지면 빈 목록).
 * 수업 중 구간은 예정 종료 시각에서 끊긴다 — 서버가 그 시각을 넘겨 내려가 있었어도 같다.
 */
function segmentsSinceAnchor(
  state: ClockState,
  nowMs: number,
): Array<{ phase: SessionPhase; fromMs: number; toMs: number; rate: number }> {
  if (state.paused || nowMs <= state.anchorAtMs) return [];
  const out: Array<{ phase: SessionPhase; fromMs: number; toMs: number; rate: number }> = [];
  let cursor = state.anchorAtMs;
  if (state.session !== null && state.session.endsAtMs > cursor) {
    const end = Math.min(nowMs, state.session.endsAtMs);
    out.push({ phase: 'inClass', fromMs: cursor, toMs: end, rate: phaseRate(state, 'inClass') });
    cursor = end;
  }
  if (nowMs > cursor) {
    out.push({ phase: 'outOfClass', fromMs: cursor, toMs: nowMs, rate: phaseRate(state, 'outOfClass') });
  }
  return out;
}

/** 지금(nowMs) 누적 게임 일(소수). 앵커 이후 구간별 배율 × 경과를 더한다. nowMs 가 앵커 이전이면 앵커 값. */
export function gameDaysAt(state: ClockState, nowMs: number): number {
  let days = state.anchorGameDays;
  for (const seg of segmentsSinceAnchor(state, nowMs)) {
    days += (seg.rate * (seg.toMs - seg.fromMs)) / MS_PER_MINUTE;
  }
  return days;
}

/** 지금(nowMs) 누적 운영 시간(ms) — 일시정지되지 않은 현실 시간의 합. */
export function operatingMsAt(state: ClockState, nowMs: number): number {
  if (state.paused || nowMs <= state.anchorAtMs) return state.anchorOperatingMs;
  return state.anchorOperatingMs + (nowMs - state.anchorAtMs);
}

/** 지금 구간 — 수업 세션이 있고 예정 종료 전이면 'inClass'(고정 모드도 같다), 아니면 'outOfClass'. 일시정지와 무관. */
export function phaseAt(state: ClockState, nowMs: number): SessionPhase {
  return state.session !== null && nowMs < state.session.endsAtMs ? 'inClass' : 'outOfClass';
}

/** 지금 배율(게임 일/현실 분). 일시정지면 0. 고정 모드는 fixedGameDaysPerRealDay / 1440. */
export function rateAt(state: ClockState, nowMs: number): number {
  if (state.paused) return 0;
  return phaseRate(state, phaseAt(state, nowMs));
}

/** 지금 수업 세션 번호 — 수업 중이면 seq, 아니면 null. */
export function sessionSeqAt(state: ClockState, nowMs: number): number | null {
  return phaseAt(state, nowMs) === 'inClass' && state.session !== null ? state.session.seq : null;
}

// ─────────────────────────────── 접기 ───────────────────────────────

/**
 * 지금까지를 앵커로 접는다(소급 없음): 앵커 = (nowMs, 그때 게임 일, 그때 운영 시간). 세션은 건드리지 않는다.
 * nowMs 가 앵커 이전이면(시계 역행) 그대로 돌려준다.
 */
export function foldClock(state: ClockState, nowMs: number): ClockState {
  if (nowMs <= state.anchorAtMs) return state;
  return {
    ...state,
    anchorAtMs: nowMs,
    anchorGameDays: gameDaysAt(state, nowMs),
    anchorOperatingMs: operatingMsAt(state, nowMs),
  };
}

/**
 * 예정 종료 시각 처리 — nowMs ≥ endsAtMs 이면 **endsAtMs 에서** 앵커를 접고 session = null(수업 밖).
 * `ended` = 이번에 수업을 끝냈는가(서버는 이때 CLOCK 을 보내고 상태를 저장한다). `endedAtMs` = 끝난 현실 시각.
 */
export function settleSessionEnd(
  state: ClockState,
  nowMs: number,
): { state: ClockState; ended: boolean; endedAtMs: number | null } {
  const session = state.session;
  if (session === null || nowMs < session.endsAtMs) return { state, ended: false, endedAtMs: null };
  const folded = foldClock(state, session.endsAtMs);
  return { state: { ...folded, session: null }, ended: true, endedAtMs: session.endsAtMs };
}

// ─────────────────────────────── 명령 ───────────────────────────────

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** 시계 명령 — shared-types `GmClockCommand` 에서 requestId · reason 을 뺀 것. */
export type ClockCommand = DistributiveOmit<GmClockCommand, 'requestId' | 'reason'>;

/** 명령 거절 사유 — 서버는 400 `bad_request` 로 돌려준다. */
export type ClockCommandRejectReason =
  | 'invalid_minutes'
  | 'no_session'
  | 'invalid_mode'
  | 'invalid_fixed_rate'
  | 'invalid_session_minutes'
  | 'unknown_action';

export type ClockCommandResult =
  | { readonly ok: true; readonly state: ClockState; readonly changed: boolean }
  | { readonly ok: false; readonly reason: ClockCommandRejectReason };

function isIntIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** 고정 배율이 유효한가 — 유한 · 0 초과 · 상한(10,368) 이하. */
export function isValidFixedRate(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_FIXED_GAME_DAYS_PER_REAL_DAY
  );
}

/**
 * 시계 명령 적용. 모든 명령은 먼저 `settleSessionEnd` + `foldClock` 으로 지금까지를 접는다(소급 없음).
 * - pause / resume: 이미 그 상태면 changed:false.
 * - startSession: minutes(정수 1~600, 생략 시 sessionMinutes) 동안 수업. 일시정지면 재개도 한다. 이미 수업 중이면 무시(changed:false).
 * - endSession: 지금 수업 밖으로. 수업이 없으면 changed:false.
 * - extendSession: 예정 종료 시각을 minutes(정수 1~120)만큼 늦춘다. 수업 중이 아니면 거절(no_session).
 * - setMode: mode · fixedGameDaysPerRealDay(0 초과 · 10,368 이하) · sessionMinutes(정수 1~600, 다음 수업부터). 진행 중 수업의 예정 종료 시각은 그대로.
 * 결과 state 는 changed:false 여도 접힌 상태다 — 저장해도 되고 버려도 된다(같은 게임 일).
 */
export function applyClockCommand(state: ClockState, cmd: ClockCommand, nowMs: number): ClockCommandResult {
  const base = foldClock(settleSessionEnd(state, nowMs).state, nowMs);
  switch (cmd.action) {
    case 'pause':
      return base.paused
        ? { ok: true, state: base, changed: false }
        : { ok: true, state: { ...base, paused: true }, changed: true };
    case 'resume':
      return base.paused
        ? { ok: true, state: { ...base, paused: false }, changed: true }
        : { ok: true, state: base, changed: false };
    case 'startSession': {
      const minutes = cmd.minutes ?? base.sessionMinutes;
      if (!isIntIn(minutes, SESSION_MINUTES_MIN, SESSION_MINUTES_MAX)) return { ok: false, reason: 'invalid_minutes' };
      if (base.session !== null) return { ok: true, state: base, changed: false };
      const seq = base.lastSessionSeq + 1;
      return {
        ok: true,
        changed: true,
        state: {
          ...base,
          paused: false,
          session: { seq, startedAtMs: nowMs, endsAtMs: nowMs + minutes * MS_PER_MINUTE },
          lastSessionSeq: seq,
        },
      };
    }
    case 'endSession':
      return base.session === null
        ? { ok: true, state: base, changed: false }
        : { ok: true, state: { ...base, session: null }, changed: true };
    case 'extendSession': {
      if (!isIntIn(cmd.minutes, EXTEND_MINUTES_MIN, EXTEND_MINUTES_MAX)) return { ok: false, reason: 'invalid_minutes' };
      if (base.session === null) return { ok: false, reason: 'no_session' };
      return {
        ok: true,
        changed: true,
        state: { ...base, session: { ...base.session, endsAtMs: base.session.endsAtMs + cmd.minutes * MS_PER_MINUTE } },
      };
    }
    case 'setMode': {
      if (cmd.mode !== 'variable' && cmd.mode !== 'fixed') return { ok: false, reason: 'invalid_mode' };
      if (cmd.fixedGameDaysPerRealDay !== undefined && !isValidFixedRate(cmd.fixedGameDaysPerRealDay)) {
        return { ok: false, reason: 'invalid_fixed_rate' };
      }
      if (cmd.sessionMinutes !== undefined && !isIntIn(cmd.sessionMinutes, SESSION_MINUTES_MIN, SESSION_MINUTES_MAX)) {
        return { ok: false, reason: 'invalid_session_minutes' };
      }
      const next: ClockState = {
        ...base,
        mode: cmd.mode,
        fixedGameDaysPerRealDay: cmd.fixedGameDaysPerRealDay ?? base.fixedGameDaysPerRealDay,
        sessionMinutes: cmd.sessionMinutes ?? base.sessionMinutes,
      };
      const changed =
        next.mode !== base.mode ||
        next.fixedGameDaysPerRealDay !== base.fixedGameDaysPerRealDay ||
        next.sessionMinutes !== base.sessionMinutes;
      return { ok: true, state: changed ? next : base, changed };
    }
    default:
      return { ok: false, reason: 'unknown_action' };
  }
}

// ─────────────────────────────── 되짚기 ───────────────────────────────

/** 게임 일 target 에 도달한 순간의 현실 시각 · 구간 · 운영 시간 · 세션 번호. */
export interface GameDayLocation {
  /** 도달 현실 시각(ms epoch, 소수 가능). */
  readonly atMs: number;
  readonly phase: SessionPhase;
  /** 그때의 누적 운영 시간(ms). */
  readonly operatingMs: number;
  /** 그때 수업 중이면 세션 번호, 아니면 null. */
  readonly sessionSeq: number | null;
}

/**
 * 게임 일 target 에 도달한 현실 시각과 그때의 구간 · 운영 시간 · 세션(월 경계 이벤트 상한 판정용).
 * - nowMs 까지 아직 도달하지 않았으면 null(일시정지 중이면 앵커 이후로는 도달하지 않는다).
 * - target 이 앵커 게임 일 이하이면 **앵커 시점 정보**를 돌려준다(그 이전 구간은 접혀서 되짚을 수 없다).
 * - 수업 중 구간의 끝(예정 종료 시각)에 정확히 도달하면 수업 중으로 본다.
 */
export function locateGameDay(state: ClockState, targetGameDays: number, nowMs: number): GameDayLocation | null {
  if (targetGameDays <= state.anchorGameDays) {
    const at = state.anchorAtMs;
    return {
      atMs: at,
      phase: phaseAt(state, at),
      operatingMs: state.anchorOperatingMs,
      sessionSeq: sessionSeqAt(state, at),
    };
  }
  if (targetGameDays > gameDaysAt(state, nowMs)) return null;
  let days = state.anchorGameDays;
  const segments = segmentsSinceAnchor(state, nowMs);
  for (const [index, seg] of segments.entries()) {
    const segDays = (seg.rate * (seg.toMs - seg.fromMs)) / MS_PER_MINUTE;
    const isLast = index === segments.length - 1;
    if (targetGameDays <= days + segDays || isLast) {
      const need = targetGameDays - days;
      const atMs = Math.min(seg.toMs, seg.rate > 0 ? seg.fromMs + (need / seg.rate) * MS_PER_MINUTE : seg.fromMs);
      return {
        atMs,
        phase: seg.phase,
        operatingMs: state.anchorOperatingMs + (atMs - state.anchorAtMs),
        sessionSeq: seg.phase === 'inClass' && state.session !== null ? state.session.seq : null,
      };
    }
    days += segDays;
  }
  return null;
}

// ─────────────────────────────── 날짜 · 화면 ───────────────────────────────

/** 게임 날짜. year · month · day 는 1부터, monthIndex 는 학급 시작부터 센 0부터의 월 번호, dayIndex 는 0부터 센 누적 일. */
export interface GameDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  /** 0부터 센 누적 월 = floor(게임 일 / 30). 월 k 의 경계(게임 일 30k)를 지나면 k. */
  readonly monthIndex: number;
  /** 0부터 센 누적 일 = floor(게임 일). */
  readonly dayIndex: number;
}

/** 누적 게임 일 → 게임 날짜(1년 = 12개월, 1개월 = 30일 — 균형안 §2). 음수는 0 으로 본다. */
export function gameDateOf(gameDays: number): GameDate {
  const dayIndex = Math.floor(Math.max(0, gameDays));
  const monthIndex = Math.floor(dayIndex / GAME_DAYS_PER_MONTH);
  return {
    year: Math.floor(monthIndex / GAME_MONTHS_PER_YEAR) + 1,
    month: (monthIndex % GAME_MONTHS_PER_YEAR) + 1,
    day: (dayIndex % GAME_DAYS_PER_MONTH) + 1,
    monthIndex,
    dayIndex,
  };
}

/** 다음 게임 월 경계(게임 일 30(k+1))까지 남은 게임 일(0 초과 30 이하). */
export function daysToMonthEnd(gameDays: number): number {
  const g = Math.max(0, gameDays);
  return (Math.floor(g / GAME_DAYS_PER_MONTH) + 1) * GAME_DAYS_PER_MONTH - g;
}

/**
 * shared-types `ClockView` 만들기. 예정 종료 시각이 지났으면 먼저 접어서 보여 준다(순수 — 저장은 서버가 따로).
 * nextChangeAtMs = 일시정지가 아니고 수업 중이면 예정 종료 시각, 아니면 null.
 */
export function clockViewOf(state: ClockState, classId: ClassId, nowMs: number, economyVersion: string): ClockView {
  const s = settleSessionEnd(state, nowMs).state;
  const gameDays = gameDaysAt(s, nowMs);
  const date = gameDateOf(gameDays);
  return {
    classId,
    course: s.course,
    mode: s.mode,
    paused: s.paused,
    phase: phaseAt(s, nowMs),
    asOfMs: nowMs,
    gameDays,
    gameDaysPerRealMinute: rateAt(s, nowMs),
    date: { year: date.year, month: date.month, day: date.day },
    session:
      s.session === null
        ? null
        : {
            seq: s.session.seq,
            startedAtMs: s.session.startedAtMs,
            endsAtMs: s.session.endsAtMs,
            minutes: Math.round((s.session.endsAtMs - s.session.startedAtMs) / MS_PER_MINUTE),
          },
    sessionMinutes: s.sessionMinutes,
    fixedGameDaysPerRealDay: s.fixedGameDaysPerRealDay,
    daysToMonthEnd: daysToMonthEnd(gameDays),
    nextChangeAtMs: !s.paused && s.session !== null ? s.session.endsAtMs : null,
    economyVersion,
  };
}
