/**
 * 전광판 읽기 한 벌 — LED 띠 · 위 띠 순위 단추 · 광장 LED · 교사 화면이 같은 `GET /api/market/board` 를 나눠 쓴다(요청 한 번).
 * 학급 WS `board.event`(새 소식 · 다듬은 헤드라인) · 등기 · Tier 가 바뀌면 150ms 묶어 다시 읽는다. 다시 붙어도 다시 읽는다.
 * 공개 서랍 · 최종 순위 창의 '열림' 상태도 여기 둔다 — 띠 항목 · 순위 단추 · 서랍 안 단추가 같은 창을 연다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { MARKET_API, type MarketBoardResponse, type ServerMessage } from '@crista-web/web-contract';
import { api } from '../../api.ts';
import { socket } from '../../ws.ts';

interface State {
  path: string | null;
  data: MarketBoardResponse | null;
  /** 가장 최근에 받은 새 소식(화면 낭독기 한 줄 · 깜빡임). */
  latestId: number | null;
  drawer: string | null;
  final: boolean;
}

let state: State = { path: null, data: null, latestId: null, drawer: null, final: false };
const listeners = new Set<() => void>();
let users = 0;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let offSocket: (() => void) | null = null;
let offOpen: (() => void) | null = null;

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  for (const fn of listeners) fn();
}

async function load(): Promise<void> {
  const path = state.path;
  if (!path) return;
  const mine = ++seq;
  try {
    const data = await api.get<MarketBoardResponse>(path);
    if (mine !== seq || path !== state.path) return;
    set({ data });
  } catch {
    // 다음 소식 · 재접속 때 다시 읽는다(띠는 지난 값을 그대로 보인다).
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void load(), 150);
}

function start(): void {
  offOpen = socket.onOpen(() => void load());
  offSocket = socket.on((msg: ServerMessage) => {
    const classId = state.data?.classId;
    if (msg.type === 'board.event') {
      if (classId && msg.classId !== classId) return;
      if (!state.data?.events.some((e) => e.id === msg.event.id)) set({ latestId: msg.event.id });
      schedule();
    } else if (msg.type === 'team.registered' || msg.type === 'team.updated') {
      if (!classId || msg.classId === classId) schedule();
    }
  });
}

function stop(): void {
  offSocket?.();
  offOpen?.();
  offSocket = offOpen = null;
  if (timer) clearTimeout(timer);
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = (): State => state;

/** 전광판 한 벌 — 학생은 인자 없이(세션의 학급), 교사는 학급 id. */
export function useMarket(classId?: string | null, limit?: number): State {
  const path = classId === null ? null : `${MARKET_API.board(classId ?? undefined)}${limit ? `${classId ? '&' : '?'}limit=${limit}` : ''}`;
  useEffect(() => {
    users += 1;
    if (users === 1) start();
    return () => {
      users -= 1;
      if (users === 0) stop();
    };
  }, []);
  useEffect(() => {
    if (!path || path === state.path) return;
    set({ path, data: null, latestId: null });
    void load();
  }, [path]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const reloadMarket = (): void => schedule();
export const openDrawer = (teamId: string | null): void => set({ drawer: teamId, final: false });
export const openFinal = (open: boolean): void => set({ final: open, drawer: null });
