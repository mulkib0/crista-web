/**
 * 모둠 대화방(시안 06 '채널 목록') — '모둠 공유' 섬의 바탕. 왼쪽 채널 레일 · 오른쪽 대화창(공유 자료는 그 옆 패널 — common.tsx `StepLayout`).
 *
 * - 채널: 모둠 전체 · 단계 채널(열린 단계 + 기록이 있는 단계). 보기: 행적만 · 대화만 · 나를 부른 글. 처음엔 지금 단계 채널을 따라간다.
 * - 대화창: 게임 날짜 줄 · 열 때 고정한 '새 기록' 선 · 대화(같은 사람이 잇달아 쓰면 묶음) · 행적(아이콘 · 몇 번 · 그 단계 보기).
 *   맨 아래에 있으면 새 줄을 따라 내려가고, 위를 읽는 중이면 '새 기록 n개' 단추만 띄운다. 위 끝에 닿으면 이전 기록을 더 읽는다.
 * - 읽음: 대화가 보이고(공유 자료가 덮고 있지 않고) · 창이 앞에 있고 · 맨 아래에 있을 때만, 채널(보기 아님)을 마지막 줄까지 읽음으로.
 * - 입력: Enter 보내기 · Shift+Enter 줄바꿈(한글 조합 중 Enter 는 무시) · @ 로 모둠원 부르기(↑↓ · Enter · Tab · Esc).
 */
import {
  FEED_BODY_MAX,
  FEED_VIEW_LABEL,
  formatGameDay,
  inFeedView,
  isFeedChannel,
  splitMentions,
  STEP_IDS,
  STEP_META,
  type BoardResponse,
  type FeedItemView,
  type FeedMemberView,
  type FeedView,
  type StepId,
  type StepView,
} from '@crista-web/web-contract';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { feed, unreadOf, useFeed, type FeedState, type PendingItem } from './store.ts';
import './feed.css';

/** Board 가 단계 이동 함수를 내려준다(행적의 '그 단계 보기'). */
export const StepNav = createContext<((id: StepId) => void) | null>(null);

const isStepId = (v: string): v is StepId => (STEP_IDS as readonly string[]).includes(v);
const stepTitle = (id: string) => (isStepId(id) ? STEP_META[id].title : id);
const count = (n: number) => (n > 99 ? '99+' : String(n));
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayOf = (i: FeedItemView) => (i.gameDay !== null ? formatGameDay(i.gameDay) : new Date(i.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }));
const GROUP_MS = 5 * 60_000;
const AV_COLORS = ['#d4c7f1', '#f1ccb9', '#bfe1dc', '#dae5f5', '#f3e2a6', '#e6d4ff', '#cdeaff', '#ffd3ea'];

/** 사용자가 고른 채널 · 보기(단계 채널을 고르면 null — 지금 단계를 따라간다). 단계를 오가도 남게 모듈에 둔다. */
let picked: FeedView | null = null;

/** 행적 아이콘 — 종류(code 앞부분)로. */
function actIcon(code: string): string {
  if (code.startsWith('job.succeeded')) return '✓';
  if (code.startsWith('job.failed')) return '!';
  if (code.startsWith('job:')) return '▶';
  if (code.startsWith('note:') || code.includes(':section') || code.endsWith(':plan') || code.endsWith(':reflection')) return '✎';
  if (code.startsWith('screen:proposal')) return '＋';
  if (code.startsWith('screen:vote')) return '✓';
  if (code.startsWith('screen:agreed') || code.startsWith('board:')) return '◆';
  if (code.startsWith('screen:reopen')) return '↺';
  if (code === 'claim' || code === 'pick' || code.startsWith('selection')) return '★';
  if (code.startsWith('review:') || code.endsWith(':review') || code.endsWith(':submitted')) return '§';
  if (code.startsWith('learn')) return '✦';
  return '•';
}

/** 안 읽은 수 — 나를 부른 글이 있으면 `@n`. 공유 자료가 대화를 덮고 있을 때 '대화로' 단추에 붙인다. */
export function FeedUnread() {
  const u = unreadOf(useFeed());
  if (u.mention > 0) return <span className="fd-n hot" aria-label={`나를 부른 글 ${u.mention}개`}>@{count(u.mention)}</span>;
  if (u.all > 0) return <span className="fd-n" aria-label={`안 읽은 기록 ${u.all}개`}>{count(u.all)}</span>;
  return null;
}

export function FeedRoom({ board, step, active }: { board: BoardResponse; step: StepView; active: boolean }) {
  const s = useFeed();
  const goStep = useContext(StepNav);
  const [pick, setPick] = useState<FeedView | null>(picked);
  const view: FeedView = pick ?? step.id;
  const me = board.account.userId;

  useEffect(() => {
    feed.reset(me);
    feed.open(view);
  }, [me, view]);

  const choose = (v: FeedView) => {
    picked = v === step.id ? null : v;
    setPick(picked);
  };

  const stepIds = useMemo(() => {
    const ids = new Set<string>([step.id]);
    for (const st of board.steps) if (st.state !== 'locked') ids.add(st.id);
    for (const c of s.channels) if (c.id !== 'all') ids.add(c.id);
    return [...ids].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  }, [board.steps, s.channels, step.id]);

  const unreadIn = (id: string) => s.channels.find((c) => c.id === id)?.unread ?? 0;
  const onlineSet = new Set(s.online);
  const colorOf = useMemo(() => {
    const map = new Map(s.members.map((m, i) => [m.userId, AV_COLORS[i % AV_COLORS.length]!]));
    return (id: string | null) => (id ? (map.get(id) ?? 'var(--raise)') : 'var(--raise)');
  }, [s.members]);

  const title = view === 'all' || view === 'act' || view === 'chat' || view === 'mention' ? FEED_VIEW_LABEL[view] : `${view} ${stepTitle(view)}`;
  const mark = view === 'act' ? '◆' : view === 'chat' ? '“' : view === 'mention' ? '@' : '#';

  return (
    <div className="fd" data-active={active}>
      <nav className="fd-rail" aria-label="대화 채널">
        <p className="fd-rh">채널</p>
        <RailBtn on={view === 'all'} mark="#" label={FEED_VIEW_LABEL.all} n={unreadIn('all')} onClick={() => choose('all')} />
        {stepIds.map((id) => (
          <RailBtn key={id} on={view === id} mark="#" label={`${id} ${stepTitle(id)}`} n={unreadIn(id)} here={id === step.id} onClick={() => choose(id)} />
        ))}
        <p className="fd-rh">보기</p>
        <RailBtn on={view === 'act'} mark="◆" label={FEED_VIEW_LABEL.act} onClick={() => choose('act')} />
        <RailBtn on={view === 'chat'} mark="“" label={FEED_VIEW_LABEL.chat} onClick={() => choose('chat')} />
        <RailBtn on={view === 'mention'} mark="@" label={FEED_VIEW_LABEL.mention} n={s.mentionUnread} hot onClick={() => choose('mention')} />
        <p className="fd-rh">모둠원 <small>{s.members.filter((m) => onlineSet.has(m.userId)).length}/{s.members.length} 접속</small></p>
        <ul className="fd-people">
          {s.members.map((m) => (
            <li key={m.userId} title={onlineSet.has(m.userId) ? '접속 중' : '접속 안 함'}>
              <Avatar name={m.displayName} color={colorOf(m.userId)} on={onlineSet.has(m.userId)} me={m.userId === me} />
              <span>{m.displayName}{m.userId === me ? ' (나)' : ''}</span>
              {s.typing[m.userId] && <i className="fd-dots" aria-label="입력 중"><b /><b /><b /></i>}
            </li>
          ))}
        </ul>
      </nav>

      <section className="fd-pane" aria-label={`${title} 대화`}>
        <header className="fd-ph">
          <b><span aria-hidden="true">{mark}</span> {title}</b>
          <span className="fd-meta">
            {view === 'act' ? '모둠원이 작업하면 저절로 쌓여요' : view === 'mention' ? '@로 나를 부른 말' : `기록 ${s.channels.find((c) => c.id === (isFeedChannel(view) ? view : 'all'))?.total ?? 0}개`}
          </span>
        </header>
        <Timeline s={s} view={view} me={me} active={active} colorOf={colorOf} goStep={goStep} here={step.id} />
        <Typing s={s} view={view} />
        {view === 'act' ? (
          <p className="fd-note">행적은 보기만 해요. 말을 걸려면 <button type="button" className="fd-link" onClick={() => choose(step.id)}>#{step.id} 채널</button>로 가요.</p>
        ) : (
          <Composer
            members={s.members}
            me={me}
            stepId={isFeedChannel(view) && view !== 'all' ? view : null}
            placeholder={isFeedChannel(view) && view !== 'all' ? `#${view} ${stepTitle(view)} 채널에 말하기 · @이름으로 부르기` : '모둠 전체에 말하기 · @이름으로 부르기'}
            disabled={s.status !== 'ready'}
          />
        )}
      </section>
    </div>
  );
}

function RailBtn({ on, mark, label, n = 0, hot, here, onClick }: { on: boolean; mark: string; label: string; n?: number; hot?: boolean; here?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="fd-ch" aria-pressed={on} onClick={onClick}>
      <span className="fd-mk" aria-hidden="true">{mark}</span>
      <span className="fd-cl">{label}</span>
      {here && <span className="fd-here">지금</span>}
      {n > 0 && <span className={`fd-n${hot ? ' hot' : ''}`} aria-label={`안 읽은 ${n}개`}>{count(n)}</span>}
    </button>
  );
}

function Avatar({ name, color, on, me, sm }: { name: string | null; color: string; on?: boolean; me?: boolean; sm?: boolean }) {
  return (
    <span className={`fd-av${sm ? ' sm' : ''}${me ? ' me' : ''}${on === undefined ? '' : on ? ' on' : ' off'}`} style={{ ['--c' as string]: color }} aria-hidden="true">
      {(name ?? '·').slice(0, 1)}
    </span>
  );
}

interface TimelineProps {
  s: FeedState;
  view: FeedView;
  me: string;
  active: boolean;
  colorOf: (id: string | null) => string;
  goStep: ((id: StepId) => void) | null;
  here: string;
}

function Timeline({ s, view, me, active, colorOf, goStep, here }: TimelineProps) {
  const list = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);
  const [newBelow, setNewBelow] = useState(0);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const prev = useRef({ first: 0, last: 0, height: 0, open: -1, active: false, pending: 0 });
  const names = useMemo(() => s.members.map((m) => m.displayName), [s.members]);
  const pending = s.pending.filter((p) => inFeedView(p, view, me));
  const ready = s.status === 'ready' && s.view === view;
  const items = ready ? s.items : [];
  const lastSeq = items.length ? items[items.length - 1]!.seq : 0;

  // 읽음 — 보이고 · 앞에 있고 · 맨 아래이고 · 채널(보기 아님)일 때.
  const tryRead = () => {
    if (!active || !ready || !atBottom.current || !lastSeq || document.visibilityState !== 'visible' || !isFeedChannel(view)) return;
    feed.markRead(view, lastSeq);
  };

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const p = prev.current;
    const first = items[0]?.seq ?? 0;
    const opened = s.openNo !== p.open || (active && !p.active);
    if (opened && ready && active) {
      // 열 때: '새 기록' 선이 있으면 그 줄을 위 3분의 1에, 없으면 맨 아래.
      const line = s.divider ? el.querySelector<HTMLElement>(`[data-seq="${s.divider}"]`) : null;
      el.scrollTop = line ? Math.max(0, line.offsetTop - el.clientHeight / 3) : el.scrollHeight;
      atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      setNewBelow(0);
    } else if (first && p.first && first < p.first) {
      // 이전 기록을 위에 붙였다 — 보던 자리를 지킨다.
      el.scrollTop += el.scrollHeight - p.height;
    } else if (lastSeq > p.last || pending.length > p.pending) {
      const mineOnly = items.filter((i) => i.seq > p.last).every((i) => i.actorId === me) && pending.length >= p.pending;
      if (atBottom.current || (pending.length > p.pending && mineOnly)) el.scrollTop = el.scrollHeight;
      else setNewBelow((n) => n + items.filter((i) => i.seq > p.last && i.actorId !== me).length);
    }
    prev.current = { first, last: lastSeq, height: el.scrollHeight, open: ready ? s.openNo : p.open, active, pending: pending.length };
  });

  useEffect(tryRead);
  useEffect(() => {
    const on = () => tryRead();
    document.addEventListener('visibilitychange', on);
    window.addEventListener('focus', on);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('focus', on);
    };
  });

  const onScroll = () => {
    const el = list.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottom.current) {
      setNewBelow(0);
      tryRead();
    }
    if (el.scrollTop < 80 && s.hasMore && !s.loadingOlder) void feed.older();
  };

  const toBottom = () => {
    const el = list.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    setNewBelow(0);
    tryRead();
  };

  const remove = async (id: number) => {
    setConfirm(null);
    setErr(await feed.remove(id));
  };

  let day = '';
  let last: FeedItemView | null = null;
  const rows: ReactNode[] = [];
  for (const item of [...items, ...pending]) {
    const d = dayOf(item);
    if (d !== day) {
      rows.push(<li key={`d${item.id}`} className="fd-day" role="separator"><span>{d}{item.gameDay !== null ? ' · 게임 날짜' : ''}</span></li>);
      day = d;
      last = null;
    }
    if (s.divider !== null && item.seq === s.divider) {
      rows.push(<li key="new" className="fd-new" role="separator"><span>새 기록</span></li>);
      last = null;
    }
    rows.push(
      item.kind === 'chat' ? (
        <Chat
          key={item.clientId ?? item.id}
          item={item}
          cont={!!last && last.kind === 'chat' && last.actorId === item.actorId && !last.deleted && Date.parse(item.createdAt) - Date.parse(last.createdAt) < GROUP_MS}
          mine={item.actorId === me}
          names={names}
          color={colorOf(item.actorId)}
          confirm={confirm === item.id}
          onAsk={() => setConfirm(item.id)}
          onCancel={() => setConfirm(null)}
          onDelete={() => void remove(item.id)}
          showStep={view === 'all' || view === 'chat' || view === 'mention'}
        />
      ) : (
        <Act key={item.id} item={item} color={colorOf(item.actorId)} goStep={goStep} here={here} />
      ),
    );
    last = item;
  }

  return (
    <div className="fd-tl">
      <ol className="fd-list" ref={list} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label="기록">
        {ready && s.hasMore && (
          <li className="fd-more">
            <button type="button" className="btn sm ghost" disabled={s.loadingOlder} onClick={() => void feed.older()}>{s.loadingOlder ? '불러오는 중…' : '이전 기록 더 보기'}</button>
          </li>
        )}
        {s.status === 'error' && s.view === view ? (
          <li className="fd-empty">
            {s.error ?? '기록을 읽지 못했어요.'} <button type="button" className="fd-link" onClick={() => feed.reload()}>다시 읽기</button>
          </li>
        ) : !ready ? (
          <li className="fd-empty">기록을 여는 중…</li>
        ) : rows.length === 0 ? (
          <li className="fd-empty">{emptyText(view)}</li>
        ) : (
          rows
        )}
      </ol>
      {newBelow > 0 && (
        <button type="button" className="fd-pill" onClick={toBottom}>새 기록 {count(newBelow)}개 ↓</button>
      )}
      {err && <p className="err fd-err" role="alert">{err}</p>}
    </div>
  );
}

function emptyText(view: FeedView): string {
  if (view === 'all') return '아직 기록이 없어요. 모둠원이 작업하면 행적이 저절로 쌓이고, 아래에서 말을 걸 수 있어요.';
  if (view === 'act') return '아직 행적이 없어요.';
  if (view === 'chat') return '아직 나눈 말이 없어요.';
  if (view === 'mention') return '나를 부른 글이 없어요.';
  return `${stepTitle(view)} 채널은 아직 조용해요. 이 단계의 행적과 여기서 나눈 말이 모여요.`;
}

interface ChatProps {
  item: PendingItem;
  cont: boolean;
  mine: boolean;
  names: string[];
  color: string;
  confirm: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
  showStep: boolean;
}

function Chat({ item, cont, mine, names, color, confirm, onAsk, onCancel, onDelete, showStep }: ChatProps) {
  const pending = item.id < 0;
  return (
    <li className={`fd-msg${cont ? ' cont' : ''}${pending ? ' wait' : ''}${item.failed ? ' fail' : ''}`} data-seq={pending ? undefined : item.seq}>
      {cont ? <time className="fd-side" dateTime={item.createdAt}>{timeOf(item.createdAt)}</time> : <Avatar name={item.actorName} color={color} me={mine} />}
      <div className="fd-mb">
        {!cont && (
          <p className="fd-mh">
            <b>{item.actorName ?? '나간 모둠원'}{mine ? ' (나)' : ''}</b>
            <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
            {showStep && item.stepId && <span className="fd-tag">#{item.stepId}</span>}
          </p>
        )}
        {item.deleted ? (
          <p className="fd-txt gone">지운 메시지예요.</p>
        ) : (
          <p className="fd-txt">
            {splitMentions(item.body, names).map((part, i) => (part.mention ? <mark key={i} className="fd-at">{part.text}</mark> : <span key={i}>{part.text}</span>))}
          </p>
        )}
        {pending && !item.failed && <span className="fd-state">보내는 중…</span>}
        {item.failed && (
          <span className="fd-state bad">
            {item.failed} <button type="button" className="fd-link" onClick={() => void feed.retry(item)}>다시 보내기</button> · <button type="button" className="fd-link" onClick={() => feed.drop(item)}>버리기</button>
          </span>
        )}
      </div>
      {mine && !pending && !item.deleted && (
        <div className="fd-tools">
          {confirm ? (
            <>
              <span>지울까요?</span>
              <button type="button" className="fd-link bad" onClick={onDelete}>지우기</button>
              <button type="button" className="fd-link" onClick={onCancel}>그만두기</button>
            </>
          ) : (
            <button type="button" className="fd-link" onClick={onAsk} aria-label="이 메시지 지우기">지우기</button>
          )}
        </div>
      )}
    </li>
  );
}

function Act({ item, color, goStep, here }: { item: FeedItemView; color: string; goStep: ((id: StepId) => void) | null; here: string }) {
  return (
    <li className="fd-act" data-tone={item.tone} data-seq={item.seq}>
      <span className="fd-ico" aria-hidden="true">{actIcon(item.code)}</span>
      <p className="fd-ab">
        {item.actorName ? (
          <>
            <Avatar name={item.actorName} color={color} sm />
            <b>{item.actorName}</b>{' '}
          </>
        ) : null}
        {item.body}
        {item.repeat > 1 && <span className="fd-rep" title={`${item.repeat}번`}>×{item.repeat}</span>}
      </p>
      <span className="fd-am">
        <time dateTime={item.updatedAt}>{timeOf(item.updatedAt)}</time>
        {item.stepId && item.stepId !== here && goStep && isStepId(item.stepId) && (
          <button type="button" className="fd-go" onClick={() => goStep(item.stepId as StepId)}>{item.stepId} 보기</button>
        )}
      </span>
    </li>
  );
}

function Typing({ s, view }: { s: FeedState; view: FeedView }) {
  const names = Object.entries(s.typing)
    .filter(([id, t]) => id !== s.me && (!isFeedChannel(view) || view === 'all' || t.stepId === view))
    .map(([, t]) => t.name);
  return (
    <p className="fd-typing" aria-live="polite">
      {names.length > 0 && (
        <>
          <i className="fd-dots" aria-hidden="true"><b /><b /><b /></i>
          {names.slice(0, 2).join(', ')}{names.length > 2 ? ` 외 ${names.length - 2}명` : ''} 입력 중…
        </>
      )}
    </p>
  );
}

function Composer({ members, me, stepId, placeholder, disabled }: { members: FeedMemberView[]; me: string; stepId: string | null; placeholder: string; disabled: boolean }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const others = members.filter((m) => m.userId !== me);
  const picks = query === null ? [] : others.filter((m) => m.displayName.startsWith(query)).slice(0, 6);
  const len = [...text.trim()].length;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const sync = (value: string, caret: number) => {
    const m = value.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,12})$/);
    setQuery(m ? m[1]! : null);
    setHi(0);
  };

  const insert = (name: string) => {
    const el = box.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]{0,12})$/, `@${name} `);
    const next = before + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const submit = () => {
    const body = text.trim();
    if (!body || len > FEED_BODY_MAX || disabled) return;
    void feed.send(body, stepId);
    setText('');
    setQuery(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 한글 조합 중
    if (picks.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : picks.length - 1)) % picks.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insert(picks[hi]!.displayName);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="fd-comp"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {picks.length > 0 && (
        <ul className="fd-picks" role="listbox" id="fd-picks" aria-label="부를 모둠원">
          {picks.map((m, i) => (
            <li key={m.userId} role="option" aria-selected={i === hi}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(m.displayName)}>@{m.displayName}</button>
            </li>
          ))}
        </ul>
      )}
      <label className="sr" htmlFor="fd-in">메시지</label>
      <textarea
        id="fd-in"
        ref={box}
        rows={1}
        value={text}
        placeholder={placeholder}
        maxLength={FEED_BODY_MAX + 50}
        aria-autocomplete="list"
        aria-controls={picks.length ? 'fd-picks' : undefined}
        aria-expanded={picks.length > 0}
        onChange={(e) => {
          setText(e.target.value);
          sync(e.target.value, e.target.selectionStart);
          if (e.target.value.trim()) feed.typing(stepId);
        }}
        onKeyDown={onKey}
        onClick={(e) => sync(e.currentTarget.value, e.currentTarget.selectionStart)}
        onBlur={() => setQuery(null)}
      />
      <div className="fd-cbar">
        <button type="button" className="fd-link" onMouseDown={(e) => e.preventDefault()} onClick={() => {
          const el = box.current;
          const caret = el?.selectionStart ?? text.length;
          const lead = caret > 0 && !/\s/.test(text[caret - 1]!) ? ' @' : '@';
          const next = text.slice(0, caret) + lead + text.slice(caret);
          setText(next);
          setQuery('');
          requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(caret + lead.length, caret + lead.length);
          });
        }}>@ 부르기</button>
        <span className={`fd-len${len > FEED_BODY_MAX ? ' bad' : ''}`}>{len > FEED_BODY_MAX - 100 ? `${len}/${FEED_BODY_MAX}` : 'Enter 보내기 · Shift+Enter 줄바꿈'}</span>
        <button className="btn pri sm" type="submit" disabled={disabled || !text.trim() || len > FEED_BODY_MAX}>보내기</button>
      </div>
    </form>
  );
}
