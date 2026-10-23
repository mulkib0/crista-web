/**
 * 학습 연구비 서랍 요약(`GET /api/learn/summary`)을 위 띠 칩 · 투자 유치 단추가 함께 쓴다 — 한 번만 읽고 나눠 쓰는 작은 저장소.
 * 관련 WS(learn.graded · learn.stipend · board.changed · clock)가 오면 150ms 묶어 다시 읽는다. 쓰는 부품이 모두 사라지면 비운다(계정이 바뀌어도 옛 값이 남지 않게).
 */
import { LEARN_API, type LearnSummaryResponse, type ServerMessage } from '@crista-web/web-contract';
import { useEffect, useSyncExternalStore } from 'react';
import { api } from '../../api.ts';
import { socket } from '../../ws.ts';

interface State {
  data: LearnSummaryResponse | null;
  error: string | null;
}

let state: State = { data: null, error: null };
const listeners = new Set<() => void>();
let users = 0;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let offs: Array<() => void> = [];

const emit = () => {
  for (const fn of listeners) fn();
};

async function load(): Promise<void> {
  const mine = ++seq;
  try {
    const data = await api.get<LearnSummaryResponse>(LEARN_API.summary);
    if (mine !== seq) return;
    state = { data, error: null };
  } catch (err) {
    if (mine !== seq) return;
    state = { ...state, error: err instanceof Error ? err.message : String(err) };
  }
  emit();
}

export function reloadLearn(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void load(), 150);
}

const relevant = (m: ServerMessage): boolean =>
  m.type === 'learn.graded' || m.type === 'learn.stipend' || m.type === 'board.changed' || m.type === 'clock';

function start(): void {
  offs = [socket.on((m) => relevant(m) && reloadLearn()), socket.onOpen(() => reloadLearn())];
  void load();
}

function stop(): void {
  for (const off of offs) off();
  offs = [];
  if (timer) clearTimeout(timer);
  seq += 1;
  state = { data: null, error: null };
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => state;

export function useLearnSummary(): State {
  useEffect(() => {
    users += 1;
    if (users === 1) start();
    return () => {
      users -= 1;
      if (users === 0) stop();
    };
  }, []);
  return useSyncExternalStore(subscribe, snapshot);
}
