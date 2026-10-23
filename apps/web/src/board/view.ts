/**
 * 화면 한 장(`BoardResponse`)에서 위 띠가 쓰는 값 — 연구비(크리스타) · 학급 게임 날짜.
 * 게임 날짜는 서버 값(`clock` — 앵커 게임 일 · 배율 · 계산 시각)에서 화면이 이어 그린다(규격 `gameDayNow`).
 */
import { useEffect, useState } from 'react';
import { centsToCrista, formatCrista, formatGameDay, gameDayNow, type BoardResponse, type ClassClockView } from '@crista-web/web-contract';

/** 서버가 시계를 아직 싣지 않은 응답(배포 순서가 어긋난 옛 서버)에서도 위 띠가 깨지지 않게. */
const STOPPED: ClassClockView = { gameDay: 0, paused: true, rate: 0, asOf: new Date(0).toISOString() };
export const clockOf = (board: BoardResponse): ClassClockView => board.clock ?? STOPPED;

/** 위 띠 연구비 — `10,000,000 크리스타`. */
export const balanceText = (board: BoardResponse): string => formatCrista(board.balanceCrista ?? centsToCrista(board.balanceCents));

/** `D+42` — 시계가 흐르면 10초마다 다시 그린다(배율 2 = 현실 30초에 1게임 일). */
export function useGameDay(clock: ClassClockView): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (clock.paused) return;
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, [clock.paused, clock.asOf]);
  return formatGameDay(gameDayNow(clock, now));
}
