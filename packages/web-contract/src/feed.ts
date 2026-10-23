/**
 * 모둠 대화방(시안 06 '채널 목록') — 모둠원의 대화(Slack 꼴)와 행적(누가 무엇을 했나)을 한 줄기로 남긴다.
 *
 * - 줄 하나 = `FeedItemView`. kind 'chat' 은 모둠원이 쓴 말, 'act' 는 행적(서버가 모둠 소식에서 만든 문장 · 전광판 소식).
 * - 채널: '모둠 전체'(`all`)와 단계 채널(단계 id — 그 단계의 행적 · 그 채널에 쓴 말). 보기: 행적만 · 대화만 · 나를 부른 글.
 *   보기는 '모둠 전체'를 거른 것이라 읽은 위치를 따로 두지 않는다.
 * - 읽은 위치는 (사람, 채널)마다 하나, 앞으로만 간다. 'all' 을 읽으면 모든 채널이 그만큼 읽힌다(`isUnread`).
 * - 모둠 채널 WS 로 새 줄(`feed.posted`) · 고친 줄(`feed.updated`)을 그대로 싣는다 — 모둠원만 받는 채널이고, 대화는 지연 없이 보여야 해서다.
 *   (다른 기능은 '바뀌었다'만 싣고 GET 을 다시 읽는다. 대화방도 다시 붙으면 GET 으로 맞춘다.)
 */
import type { Avatar } from './rules.ts';

export type FeedKind = 'chat' | 'act';
export type FeedTone = 'normal' | 'good' | 'bad';
/** 실제 채널 — 읽은 위치를 갖는다. */
export type FeedChannel = 'all' | string;
/** 화면이 고르는 것 — 채널 또는 보기. */
export type FeedView = FeedChannel | 'act' | 'chat' | 'mention';
export const FEED_VIEWS = ['act', 'chat', 'mention'] as const;

/** 한 메시지 글자 수 · 한 번에 읽는 줄 수 · 1분에 보낼 수 있는 메시지 수(사람마다). */
export const FEED_BODY_MAX = 500;
export const FEED_PAGE = 50;
export const FEED_PAGE_MAX = 100;
export const FEED_SEND_PER_MIN = 20;
/** 입력 중 표시 — 보내는 쪽은 이 간격보다 자주 보내지 않고, 받는 쪽은 이만큼 지나면 지운다. */
export const FEED_TYPING_MS = 3_000;

export interface FeedItemView {
  id: number;
  /** 모둠 안 순번(1부터) — 읽은 위치 · 정렬 기준. */
  seq: number;
  kind: FeedKind;
  /** 'chat' 또는 행적 종류(예: 'note:1.2:why' · 'job:2.1' · 'board:patent'). */
  code: string;
  actorId: string | null;
  /** 그때 이름. 행적의 시스템 줄(작업 완료 · 심사 결과 · 전광판)은 null. */
  actorName: string | null;
  stepId: string | null;
  /** 대화 본문 · 행적 문장(행적은 이름을 뺀 서술 — 예: '연구 노트 ① 칸을 고쳤어요'). 지운 대화는 ''. */
  body: string;
  tone: FeedTone;
  mentions: string[];
  /** 같은 사람이 같은 일을 잇달아 한 횟수(1 = 한 번). */
  repeat: number;
  gameDay: number | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** 보낸 화면이 붙인 키(대화만 · 낙관적 줄 맞추기). */
  clientId: string | null;
}

export interface FeedChannelView {
  id: FeedChannel;
  /** 이 채널의 안 읽은 줄(남이 쓴 · 지우지 않은). 'all' 은 모든 줄. */
  unread: number;
  total: number;
  lastSeq: number;
}

export interface FeedMemberView {
  userId: string;
  displayName: string;
  avatar: Avatar | null;
  online: boolean;
}

export interface FeedResponse {
  me: string;
  view: FeedView;
  /** 오래된 것 → 새 것. */
  items: FeedItemView[];
  hasMore: boolean;
  /** 'all' 이 늘 맨 앞. 줄이 있는 단계 채널만(화면이 열린 단계 채널을 더한다). */
  channels: FeedChannelView[];
  /** 나를 부른 글 가운데 안 읽은 것. */
  mentionUnread: number;
  /** 내 읽은 위치(채널 → 순번). 화면은 열 때 이 값으로 '새 기록' 선을 고정한다. */
  reads: Record<string, number>;
  members: FeedMemberView[];
  /** 모둠의 마지막 순번. */
  lastSeq: number;
}

export interface FeedPostRequest {
  body: string;
  /** 쓴 채널의 단계(모둠 전체 · 보기에서 쓰면 null). */
  stepId: string | null;
  clientId: string;
}

export interface FeedPostResponse {
  item: FeedItemView;
}

export interface FeedReadRequest {
  channel: FeedChannel;
  seq: number;
}

export interface FeedReadResponse {
  channels: FeedChannelView[];
  mentionUnread: number;
  reads: Record<string, number>;
}

export const FEED_API = {
  feed: (view: FeedView, before?: number | null, limit?: number) => {
    const q = new URLSearchParams({ view });
    if (before) q.set('before', String(before));
    if (limit) q.set('limit', String(limit));
    return `/api/feed?${q.toString()}`;
  },
  messages: '/api/feed/messages',
  message: (id: number) => `/api/feed/messages/${id}`,
  read: '/api/feed/read',
} as const;

const STEP_LIKE = /^[a-z0-9.]{1,16}$/;
export const isFeedChannel = (v: unknown): v is FeedChannel => v === 'all' || (typeof v === 'string' && STEP_LIKE.test(v) && !(FEED_VIEWS as readonly string[]).includes(v));
export const isFeedView = (v: unknown): v is FeedView => isFeedChannel(v) || (FEED_VIEWS as readonly string[]).includes(v as string);

/** 그 줄이 그 보기에 들어가나(화면이 새 줄을 지금 목록에 붙일지 정할 때 · 서버 SQL 과 같은 규칙). */
export function inFeedView(item: Pick<FeedItemView, 'kind' | 'stepId' | 'mentions'>, view: FeedView, me: string): boolean {
  if (view === 'all') return true;
  if (view === 'act') return item.kind === 'act';
  if (view === 'chat') return item.kind === 'chat';
  if (view === 'mention') return item.kind === 'chat' && item.mentions.includes(me);
  return item.stepId === view;
}

/** 안 읽은 줄인가 — 남이 썼고 · 지우지 않았고 · 그 단계 채널 위치와 'all' 위치를 모두 넘었다. */
export function isFeedUnread(item: Pick<FeedItemView, 'seq' | 'actorId' | 'stepId' | 'deleted'>, reads: Record<string, number>, me: string): boolean {
  if (item.actorId === me || item.deleted) return false;
  const all = reads.all ?? 0;
  const step = item.stepId ? (reads[item.stepId] ?? 0) : 0;
  return item.seq > Math.max(all, step);
}

/**
 * 본문의 @이름 → 모둠원 id(긴 이름부터 맞춘다 — '민준' 과 '민준호' 가 같이 있을 때). 이름 뒤는 글자 끝 · 공백 · 문장부호 · 조사.
 * 서버가 저장할 때 쓰고, 화면은 같은 규칙으로 @이름을 칠한다.
 */
export function findMentions(body: string, members: ReadonlyArray<{ userId: string; displayName: string }>): string[] {
  const found = new Set<string>();
  const sorted = [...members].sort((a, b) => b.displayName.length - a.displayName.length);
  for (let i = body.indexOf('@'); i !== -1; i = body.indexOf('@', i + 1)) {
    const rest = body.slice(i + 1);
    const hit = sorted.find((m) => m.displayName && rest.startsWith(m.displayName));
    if (hit) found.add(hit.userId);
  }
  return [...found];
}

/** 화면 줄 나누기 — @이름 조각을 표시해 돌려준다(긴 이름부터). */
export function splitMentions(body: string, names: readonly string[]): Array<{ text: string; mention: boolean }> {
  const sorted = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
  const out: Array<{ text: string; mention: boolean }> = [];
  let buf = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '@') {
      const hit = sorted.find((n) => body.startsWith(n, i + 1));
      if (hit) {
        if (buf) out.push({ text: buf, mention: false });
        out.push({ text: `@${hit}`, mention: true });
        buf = '';
        i += hit.length;
        continue;
      }
    }
    buf += body[i];
  }
  if (buf) out.push({ text: buf, mention: false });
  return out;
}

/** 채널 · 보기 이름(화면 레일 · 머리). 단계 채널 제목은 화면이 등록표에서 붙인다. */
export const FEED_VIEW_LABEL: Record<'all' | 'act' | 'chat' | 'mention', string> = {
  all: '모둠 전체',
  act: '행적만',
  chat: '대화만',
  mention: '나를 부른 글',
};
