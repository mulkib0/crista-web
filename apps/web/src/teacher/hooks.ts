/**
 * 교사 화면 공용 읽기 — 학급 시계 · 교사 알림 · '학급 소식이 오면 다시 읽기' 필터.
 *
 * 교사는 모둠 채널을 받지 않는다(학급 · 교사 채널만). 그래서 기능 목록은 교사 알림(`teacher.alert`) · 전광판 소식(`board.event`)이 오거나
 * 다시 붙을 때, 그리고 화면이 보이는 동안 20초마다 다시 읽는다(심사 · 임상 결과처럼 교사 채널로 오지 않는 변화).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CLOCK_API, gameDayNow, type ClassClockView, type ServerMessage } from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { useLive, type Live } from '../board/ui/index.ts';
import { socket } from '../ws.ts';

export type TeacherAlert = Extract<ServerMessage, { type: 'teacher.alert' }>;

/** 그 학급의 교사 알림 · 전광판 소식이면 다시 읽는다. `also` 로 더 받을 소식을 고른다. */
export const classNews = (classId: string, also?: (m: ServerMessage) => boolean) => (m: ServerMessage): boolean =>
  ((m.type === 'teacher.alert' || m.type === 'board.event' || m.type === 'patent.ledger') && m.classId === classId) || (also?.(m) ?? false);

/** useLive + 화면이 보이는 동안 주기적으로 다시 읽기(교사 채널로 오지 않는 변화). */
export function useTeacherLive<T>(path: string | null, refetchOn: (m: ServerMessage) => boolean, everyMs = 20_000): Live<T> {
  const live = useLive<T>(path, refetchOn);
  const reload = live.reload;
  useEffect(() => {
    if (!path) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, everyMs);
    return () => clearInterval(id);
  }, [path, everyMs, reload]);
  return live;
}

/** 학급 게임 시계 — 서버 값(`asOf`)에서 1초마다 이어 그린다. 교사 명령 · 게임 일이 바뀌면 학급 WS 'clock' 으로 고친다. */
export function useClassClock(classId: string | null) {
  const live = useLive<{ clock: ClassClockView }>(classId ? CLOCK_API.clock(classId) : null, (m) => m.type === 'clock' && m.classId === classId);
  const { setData } = live;
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // WS 'clock' 은 값을 그대로 싣는다 — 다시 읽기 전에 바로 고친다.
  useEffect(
    () =>
      socket.on((m) => {
        if (m.type === 'clock' && m.classId === classId) setData({ clock: m.clock });
      }),
    [classId, setData],
  );
  const clock = live.data?.clock ?? null;
  async function command(body: { action: 'pause' } | { action: 'resume' } | { action: 'rate'; rate: number }) {
    if (!classId) return;
    setBusy(true);
    setError(null);
    try {
      setData(await api.post<{ clock: ClassClockView }>(CLOCK_API.clock(classId), body));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return { clock, gameDay: clock ? gameDayNow(clock, now) : null, busy, error: error ?? (live.error && !clock ? live.error.message : null), command, reload: live.reload };
}

/** 교사 알림 — 고른 학급 것만 최근 20개(새것 먼저). 알림이 오면 화면 낭독기 한 줄도. */
export function useTeacherAlerts(classId: string | null) {
  const [alerts, setAlerts] = useState<Array<TeacherAlert & { at: number }>>([]);
  const cls = useRef(classId);
  cls.current = classId;
  useEffect(() => setAlerts([]), [classId]);
  useEffect(
    () =>
      socket.on((m) => {
        if (m.type === 'teacher.alert' && m.classId === cls.current) setAlerts((prev) => [{ ...m, at: Date.now() }, ...prev].slice(0, 20));
      }),
    [],
  );
  return useMemo(() => ({ alerts, clear: () => setAlerts([]) }), [alerts]);
}

export const fmtTime = (iso: string | number): string =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** '3분 전' 꼴(1시간 넘으면 시각). */
export function ago(iso: string | null): string {
  if (!iso) return '—';
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  return fmtTime(iso);
}
