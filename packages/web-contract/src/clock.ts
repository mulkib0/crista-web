/**
 * 학급 게임 시계(설계 §8 '게임 시계' · §9 교사 시작 · 일시정지 · 배속) — crista `clock.ts` 의 앵커 방식을 줄였다.
 * 지금 게임 일 = 앵커 게임 일 + (일시정지가 아니면) 배율 × 앵커 이후 현실 분. 수업 세션 · 월 처리는 두지 않는다.
 * 쓰는 곳: 3.2 동물실험 28게임 일 · 대체 시험 2게임 일 · 3.3 IND 30게임 일 · 특허 출원일 · 전광판 날짜.
 * 서버: apps/server/src/clock.ts(`onGameDay` · `currentGameDay`). 학급 WS 'clock' 으로 방송한다.
 * 학습 연구비 10분 틱은 게임 시계가 아니라 **현실 시간**이다(learning-grant-design §2.3 — 서버 `onRealtimeTick`).
 */

export interface ClassClockView {
  /** 지금 누적 게임 일(소수). 화면은 `D+{floor}` 로 보인다. */
  gameDay: number;
  paused: boolean;
  /** 게임 일 / 현실 분. */
  rate: number;
  /** 이 값을 계산한 서버 시각(ISO) — 화면은 이 뒤로 `rate` 만큼 흘려 그린다. */
  asOf: string;
}

export const CLOCK_RATE_MIN = 0.1;
export const CLOCK_RATE_MAX = 60;
/**
 * 기본 배율(DB default 와 같음 — 0020). 100분 수업(또는 50분 × 2)에 3.2 ~ 4.2 기다림이 들어가게 맞췄다:
 * 서류 숙고 20게임 일 ≈ 1분 40초 · 동물실험 28일 ≈ 2분 20초 · IND 30일 ≈ 2분 30초 ·
 * 임상(최소 인원 모집 + 기간, 기본 모집) 1상 ≈ 5분 · 2상 ≈ 10분 30초 · 3상 ≈ 19분 · 허가 60일 ≈ 5분 — 3.1 ~ 4.2 기다림 합 약 51분.
 * 모집 투자(확대 · 집중)로 임상 모집을 줄일 수 있다. 수업이 끝나면 교사가 시계를 멈춘다(멈추면 숙고 · 실험 · 임상도 멈춤).
 */
export const CLOCK_RATE_DEFAULT = 12;

/** 교사 명령 — 먼저 지금까지를 접고(소급 없음) 바꾼다. */
export type ClockCommandRequest =
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'rate'; rate: number };

/** 화면이 서버 값에서 지금 게임 일을 이어 그린다. */
export function gameDayNow(view: ClassClockView, nowMs: number = Date.now()): number {
  if (view.paused) return view.gameDay;
  const elapsedMin = Math.max(0, (nowMs - Date.parse(view.asOf)) / 60_000);
  return view.gameDay + view.rate * elapsedMin;
}

/** `D+42` 꼴. */
export const formatGameDay = (gameDay: number): string => `D+${Math.floor(Math.max(0, gameDay))}`;

export const CLOCK_API = {
  /** 학급 시계 보기(그 학급 교사 · 학생) · 바꾸기(교사). */
  clock: (classId: string) => `/api/classes/${classId}/clock`,
} as const;
