/**
 * 모둠 대화방 상태 — 화면 한 장에 하나(단계를 오가며 섬이 다시 그려져도 대화 · 안 읽은 수가 남게). `useFeed()` 로 읽는다.
 *
 * - 열기(`open(view)`)는 `GET /api/feed` 한 번. 그 뒤로는 모둠 채널 WS 로 새 줄(`feed.posted`) · 고친 줄(`feed.updated`)을 붙인다.
 *   WS 가 다시 붙으면 지금 보기를 새로 읽는다(끊긴 사이 놓친 줄).
 * - 보내기는 낙관적 줄(`pending`)을 먼저 그리고, 응답 · WS 중 먼저 온 쪽으로 같은 clientId 줄을 바꾼다.
 * - 안 읽은 수는 서버 요약을 받아 두고, 새 줄이 오면 `isFeedUnread` 로 더한다. 읽음은 `markRead` 가 0.6초 모아 보낸다.
 * - '새 기록' 선(`divider`)은 열 때의 읽은 위치로 정하고, 보기를 바꾸기 전까지 움직이지 않는다(읽는 사이 선이 도망가지 않게).
 */
import {
  FEED_API,
  FEED_TYPING_MS,
  inFeedView,
  isFeedUnread,
  type FeedChannelView,
  type FeedItemView,
  type FeedMemberView,
  type FeedPostResponse,
  type FeedReadResponse,
  type FeedResponse,
  type FeedView,
  type ServerMessage,
} from '@crista-web/web-contract';
import { useEffect, useSyncExternalStore } from 'react';
import { api, message } from '../../api.ts';
import { socket } from '../../ws.ts';

export interface PendingItem extends FeedItemView {
  failed?: string;
}

export interface FeedState {
  /** 지금 계정 — 바뀌면(다른 학생으로 로그인) 처음부터. */
  me: string | null;
  view: FeedView;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: FeedItemView[];
  pending: PendingItem[];
  hasMore: boolean;
  loadingOlder: boolean;
  channels: FeedChannelView[];
  mentionUnread: number;
  reads: Record<string, number>;
  members: FeedMemberView[];
  online: string[];
  /** 입력 중 — userId → 이름 · 채널 · 지울 시각. */
  typing: Record<string, { name: string; stepId: string | null; until: number }>;
  /** 열 때 고정한 '새 기록' 선 — 이 순번의 줄 위에 긋는다(없으면 null). */
  divider: number | null;
  /** 보기를 연 횟수 — 화면이 처음 스크롤 위치를 다시 잡는 신호. */
  openNo: number;
}

const initial = (): FeedState => ({
  me: null,
  view: 'all',
  status: 'idle',
  error: null,
  items: [],
  pending: [],
  hasMore: false,
  loadingOlder: false,
  channels: [],
  mentionUnread: 0,
  reads: {},
  members: [],
  online: [],
  typing: {},
  divider: null,
  openNo: 0,
});

let state: FeedState = initial();
const listeners = new Set<() => void>();
const set = (patch: Partial<FeedState> | ((s: FeedState) => Partial<FeedState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  for (const fn of listeners) fn();
};

let loadSeq = 0;
let users = 0;
let offSocket: (() => void) | null = null;
let offOpen: (() => void) | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let lastTypingSent = 0;

const bySeq = (a: FeedItemView, b: FeedItemView) => a.seq - b.seq;

function firstUnread(items: FeedItemView[], reads: Record<string, number>, me: string): number | null {
  return items.find((i) => isFeedUnread(i, reads, me))?.seq ?? null;
}

async function load(view: FeedView, fresh: boolean): Promise<void> {
  const mine = ++loadSeq;
  set((s) => ({ view, status: s.view === view && s.status === 'ready' && !fresh ? 'ready' : 'loading', error: null }));
  try {
    const res = await api.get<FeedResponse>(FEED_API.feed(view));
    if (mine !== loadSeq) return;
    set((s) => ({
      me: res.me,
      view,
      status: 'ready',
      items: res.items,
      hasMore: res.hasMore,
      channels: res.channels,
      mentionUnread: res.mentionUnread,
      reads: res.reads,
      members: res.members,
      online: res.members.filter((m) => m.online).map((m) => m.userId),
      // 다시 붙어 새로 읽을 때는 선을 그대로 둔다(같은 보기).
      divider: fresh || s.view !== view ? firstUnread(res.items, res.reads, res.me) : s.divider,
      openNo: fresh || s.view !== view ? s.openNo + 1 : s.openNo,
      pending: s.pending.filter((p) => !res.items.some((i) => i.clientId && i.clientId === p.clientId)),
    }));
  } catch (err) {
    if (mine !== loadSeq) return;
    set({ status: 'error', error: message(err) });
  }
}

function addCounts(s: FeedState, item: FeedItemView): Partial<FeedState> {
  const channels = s.channels.length ? [...s.channels] : [{ id: 'all', unread: 0, total: 0, lastSeq: 0 }];
  const unread = s.me ? isFeedUnread(item, s.reads, s.me) : false;
  const bump = (id: string) => {
    const i = channels.findIndex((c) => c.id === id);
    const cur = i >= 0 ? channels[i]! : { id, unread: 0, total: 0, lastSeq: 0 };
    const next = { ...cur, total: cur.total + 1, lastSeq: Math.max(cur.lastSeq, item.seq), unread: cur.unread + (unread ? 1 : 0) };
    if (i >= 0) channels[i] = next;
    else channels.push(next);
  };
  bump('all');
  if (item.stepId) bump(item.stepId);
  channels.sort((a, b) => (a.id === 'all' ? -1 : b.id === 'all' ? 1 : a.id.localeCompare(b.id, 'en', { numeric: true })));
  return { channels, mentionUnread: s.mentionUnread + (unread && s.me && item.mentions.includes(s.me) ? 1 : 0) };
}

function onMessage(msg: ServerMessage): void {
  if (msg.type === 'feed.posted') {
    const item = msg.item;
    set((s) => {
      if (s.items.some((i) => i.id === item.id)) return {};
      const typing = { ...s.typing };
      if (item.actorId) delete typing[item.actorId];
      const pending = item.clientId ? s.pending.filter((p) => p.clientId !== item.clientId) : s.pending;
      const items = s.me && inFeedView(item, s.view, s.me) ? [...s.items, item].sort(bySeq) : s.items;
      return { ...addCounts(s, item), items, pending, typing };
    });
  } else if (msg.type === 'feed.updated') {
    set((s) => {
      const has = s.items.some((i) => i.id === msg.item.id);
      // 묶인 행적(repeat)은 맨 아래 줄이라 지금 보기에 없으면 새로 붙인다.
      const fits = s.me && inFeedView(msg.item, s.view, s.me);
      if (!has && !fits) return {};
      return { items: has ? s.items.map((i) => (i.id === msg.item.id ? msg.item : i)) : [...s.items, msg.item].sort(bySeq) };
    });
  } else if (msg.type === 'feed.presence') {
    set({ online: msg.online });
  } else if (msg.type === 'feed.typing') {
    set((s) => ({ typing: { ...s.typing, [msg.userId]: { name: msg.displayName, stepId: msg.stepId, until: Date.now() + FEED_TYPING_MS } } }));
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(sweepTyping, FEED_TYPING_MS + 50);
  }
}

function sweepTyping(): void {
  const now = Date.now();
  const left = Object.fromEntries(Object.entries(state.typing).filter(([, t]) => t.until > now));
  if (Object.keys(left).length !== Object.keys(state.typing).length) set({ typing: left });
  if (Object.keys(left).length) typingTimer = setTimeout(sweepTyping, 500);
}

function start(): void {
  users += 1;
  if (users > 1) return;
  offSocket = socket.on(onMessage);
  // 다시 붙으면 놓친 줄을 새로 읽는다(처음 열림은 open() 이 읽는다).
  let first = true;
  offOpen = socket.onOpen(() => {
    if (first) {
      first = false;
      return;
    }
    if (state.status !== 'idle') void load(state.view, false);
  });
}

function stop(): void {
  users -= 1;
  if (users > 0) return;
  offSocket?.();
  offOpen?.();
  offSocket = offOpen = null;
}

// ── 읽음 ──

let readTimer: ReturnType<typeof setTimeout> | null = null;
let readWant: { channel: string; seq: number } | null = null;

async function flushRead(): Promise<void> {
  const want = readWant;
  readWant = null;
  if (!want) return;
  try {
    const res = await api.put<FeedReadResponse>(FEED_API.read, want);
    set({ channels: res.channels, mentionUnread: res.mentionUnread, reads: res.reads });
  } catch {
    // 다음 읽음 때 다시 보낸다.
  }
}

const clientId = () => crypto.randomUUID().replace(/-/g, '');

export const feed = {
  /** 계정이 바뀌면 비운다(Board 가 부른다). */
  reset(me: string): void {
    if (state.me && state.me !== me) {
      loadSeq += 1;
      state = initial();
    }
  },
  open(view: FeedView): void {
    if (state.view === view && (state.status === 'ready' || state.status === 'loading')) return;
    void load(view, true);
  },
  reload(): void {
    void load(state.view, true);
  },
  async older(): Promise<void> {
    const s = state;
    const first = s.items[0];
    if (!first || !s.hasMore || s.loadingOlder) return;
    const mine = loadSeq;
    set({ loadingOlder: true });
    try {
      const res = await api.get<FeedResponse>(FEED_API.feed(s.view, first.seq));
      if (mine !== loadSeq) return;
      set((cur) => ({ items: [...res.items.filter((i) => !cur.items.some((c) => c.id === i.id)), ...cur.items], hasMore: res.hasMore, loadingOlder: false }));
    } catch (err) {
      set({ loadingOlder: false, error: message(err) });
    }
  },
  /** 그 채널을 seq 까지 읽음(보기는 옮기지 않는다 — 부르는 쪽이 채널만 넘긴다). */
  markRead(channel: string, seq: number): void {
    const known = state.reads[channel] ?? 0;
    if (seq <= known || seq <= (readWant?.channel === channel ? readWant.seq : 0)) return;
    // 화면 숫자는 바로 줄인다(서버 요약이 오면 그 값으로).
    set((s) => {
      const reads = { ...s.reads, [channel]: seq };
      if (channel === 'all') return { reads, channels: s.channels.map((c) => ({ ...c, unread: 0 })), mentionUnread: 0 };
      const gone = s.channels.find((c) => c.id === channel)?.unread ?? 0;
      const channels = s.channels.map((c) => (c.id === channel ? { ...c, unread: 0 } : c.id === 'all' ? { ...c, unread: Math.max(0, c.unread - gone) } : c));
      return { reads, channels };
    });
    if (readWant && readWant.channel !== channel) void flushRead();
    readWant = { channel, seq };
    if (readTimer) clearTimeout(readTimer);
    readTimer = setTimeout(() => void flushRead(), 600);
  },
  async send(body: string, stepId: string | null): Promise<void> {
    const s = state;
    if (!s.me) return;
    const id = clientId();
    const me = s.members.find((m) => m.userId === s.me);
    const now = new Date().toISOString();
    const temp: PendingItem = {
      id: -Date.now(),
      seq: Number.MAX_SAFE_INTEGER,
      kind: 'chat',
      code: 'chat',
      actorId: s.me,
      actorName: me?.displayName ?? '나',
      stepId,
      body,
      tone: 'normal',
      mentions: [],
      repeat: 1,
      gameDay: null,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      clientId: id,
    };
    set((cur) => ({ pending: [...cur.pending, temp] }));
    try {
      const res = await api.post<FeedPostResponse>(FEED_API.messages, { body, stepId, clientId: id });
      set((cur) => {
        const pending = cur.pending.filter((p) => p.clientId !== id);
        if (cur.items.some((i) => i.id === res.item.id)) return { pending };
        const items = cur.me && inFeedView(res.item, cur.view, cur.me) ? [...cur.items, res.item].sort(bySeq) : cur.items;
        return { pending, items, ...addCounts(cur, res.item) };
      });
    } catch (err) {
      set((cur) => ({ pending: cur.pending.map((p) => (p.clientId === id ? { ...p, failed: message(err) } : p)) }));
    }
  },
  /** 실패한 낙관적 줄 다시 보내기 · 버리기. */
  async retry(item: PendingItem): Promise<void> {
    set((cur) => ({ pending: cur.pending.filter((p) => p.clientId !== item.clientId) }));
    await feed.send(item.body, item.stepId);
  },
  drop(item: PendingItem): void {
    set((cur) => ({ pending: cur.pending.filter((p) => p.clientId !== item.clientId) }));
  },
  async remove(id: number): Promise<string | null> {
    try {
      const res = await api.del<FeedPostResponse>(FEED_API.message(id));
      set((cur) => ({ items: cur.items.map((i) => (i.id === id ? res.item : i)) }));
      return null;
    } catch (err) {
      return message(err);
    }
  },
  /** 입력 중 알리기 — FEED_TYPING_MS 에 한 번. */
  typing(stepId: string | null): void {
    const now = Date.now();
    if (now - lastTypingSent < FEED_TYPING_MS - 500) return;
    lastTypingSent = now;
    socket.send({ type: 'feed.typing', stepId });
  },
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = () => state;

/** 대화방 상태 읽기 — 처음 쓰는 곳이 WS 구독을 연다(마지막이 떠나면 닫는다). */
export function useFeed(): FeedState {
  useEffect(() => {
    start();
    return stop;
  }, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** 섬 탭의 숫자 — 안 읽은 줄 · 나를 부른 글. */
export const unreadOf = (s: FeedState) => ({ all: s.channels.find((c) => c.id === 'all')?.unread ?? 0, mention: s.mentionUnread });
