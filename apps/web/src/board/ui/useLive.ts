/**
 * 기능 화면의 모둠 공유 자료 읽기 — 자기 GET 경로(예: `/api/screen` · `/api/patents`)를 읽고, 관련 WS 소식이 오거나 다시 붙으면 다시 읽는다.
 * 기능 에이전트가 각자 fetch · 디바운스 · 재접속 처리를 다시 짜지 않게 기반이 둔다(Board 의 `GET /api/board` 다시 읽기와 같은 꼴).
 *
 *   const live = useLive<ScreenResponse>('/api/screen', (m) => m.type === 'screen.changed' || (m.type === 'board.changed' && m.reason.startsWith('job:1.2')));
 *   if (!live.data) return <p className="hint">{live.error ? live.error.message : '불러오는 중…'}</p>;
 *
 * - 여러 소식이 몰려 와도 150ms 안의 것은 한 번만 읽는다. 늦게 온 옛 응답은 버린다(요청 순번).
 * - `path` 가 null 이면 읽지 않는다(예: 잠긴 단계 · 표적 없음). `path` 가 바뀌면 새로 읽는다.
 * - 쓰기 뒤 바로 반영하려면 `reload()` — 또는 쓰기 응답으로 `setData` 를 바로 고친다(낙관적 갱신).
 */
import type { ServerMessage } from '@crista-web/web-contract';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiFailure } from '../../api.ts';
import { socket } from '../../ws.ts';

export interface Live<T> {
  data: T | null;
  error: ApiFailure | Error | null;
  loading: boolean;
  reload: () => void;
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
}

export function useLive<T>(path: string | null, refetchOn?: (msg: ServerMessage) => boolean): Live<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | Error | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filter = useRef(refetchOn);
  filter.current = refetchOn;

  const load = useCallback(async () => {
    if (path === null) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const next = await api.get<T>(path);
      if (mine !== seq.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (mine !== seq.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);

  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 150);
  }, [load]);

  useEffect(() => {
    setData(null);
    setError(null);
    void load();
    return () => {
      seq.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  useEffect(() => {
    if (path === null) return;
    const offOpen = socket.onOpen(() => void load());
    const off = socket.on((msg: ServerMessage) => {
      if (filter.current?.(msg)) reload();
    });
    return () => {
      offOpen();
      off();
    };
  }, [path, load, reload]);

  return { data, error, loading, reload, setData };
}
