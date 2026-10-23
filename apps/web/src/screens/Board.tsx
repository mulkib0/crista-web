/**
 * ③ 전광판 01 + 작업 화면(설계 §5) — 위 띠(스타트업 이름 · 순위 · 연구비 · 게임 날짜 · 투자 유치 · 사옥 지구) → LED 흐르는 띠 →
 * 본문 = 시안 21 '둥근 섬'(§5.4.1): 바탕 `--raise` 위에 사이드바 섬 · 머리 섬 · 내 작업대 섬 · 모둠 공유 섬.
 *
 * - 화면 한 장(`GET /api/board`)을 서버가 계산해 준다. 모둠 채널 `board.changed` 면 다시 읽고, `job.progress` 는 그 줄만 고친다.
 * - 본문 그리드 `"side head head" "side mine team"` — 사이드바 섬은 여기서, 섬 셋은 단계 화면이 `StepLayout` 으로 놓는다.
 * - 가이드북(`board/guide`) — 단계마다 어려운 개념 사전. 창을 열면 지금 단계 탭이 먼저 열린다.
 * - 자리만 둔 곳(기능 단계에서 채움): 순위 단추 · LED 띠(`board/market` — FMARKET), 가동률 칩 · 투자 유치(`board/learn` — FLEARN).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  API,
  type BoardResponse,
  type MeResponse,
  type ServerMessage,
  type StepId,
  type StepView,
} from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { api, ApiFailure, message } from '../api.ts';
import { GrantChip } from '../board/learn/GrantChip.tsx';
import { PitchButton } from '../board/learn/PitchButton.tsx';
import { LedBand } from '../board/market/LedBand.tsx';
import { RankButton } from '../board/market/RankButton.tsx';
import { StepNav } from '../board/feed/FeedRoom.tsx';
import { GuideButton } from '../board/guide/GuideButton.tsx';
import { By } from '../board/parts.tsx';
import { registryFor, type StepRegistry } from '../board/registry.ts';
import { initialBench, type Bench, type StepProps } from '../board/steps/index.ts';
import { clearBench, STATE_MARK, STATE_WORD } from '../board/ui/index.ts';
import { balanceText, clockOf, useGameDay } from '../board/view.ts';
import { ink } from '../ink.ts';
import { socket } from '../ws.ts';

function firstOpen(steps: StepView[]): StepId {
  return (steps.find((s) => s.state !== 'done' && s.state !== 'locked') ?? steps.find((s) => s.state !== 'done') ?? steps[0]!).id;
}

/**
 * 작업 화면 — 단계 목록 · 단계 화면은 등록표(`board/registry.ts`)에서 받는다(트랙 교체: 소분자 'drug' · 항체 'antibody').
 * `registry` 를 넘기지 않으면 서버가 준 `board.track` 의 등록표를 쓴다.
 */
export function Board({ nav, registry }: { nav: Nav; registry?: StepRegistry }) {
  const { go, setMe } = nav;
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<StepId | null>(null);
  const [bench, setBenchState] = useState<Bench>(initialBench);
  const [editing, setEditing] = useState(false);
  const [live, setLive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const body = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.get<BoardResponse>(API.board);
      setBoard(next);
      setError(null);
      setCurrent((cur) => cur ?? firstOpen(next.steps));
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'not_registered_team') {
        setMe(await api.get<MeResponse>(API.me));
        go('district', true);
        return;
      }
      setError(message(err));
    }
  }, [go, setMe]);

  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 150);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  // 작업 화면을 떠나면 개인 작업대(기능 화면의 `useBenchState`)를 비운다.
  useEffect(() => () => clearBench(), []);

  useEffect(() => {
    const offOpen = socket.onOpen(() => void load());
    const off = socket.on((msg: ServerMessage) => {
      if (msg.type === 'board.changed') {
        reload();
        if (msg.byName && msg.reason.startsWith('job:')) setLive(`${msg.byName} 님이 ${msg.reason.slice(4)} 작업을 시작했어요.`);
      } else if (msg.type === 'job.progress') {
        setBoard((b) => b && { ...b, jobs: b.jobs.map((j) => (j.id === msg.jobId ? { ...j, status: msg.status, progress: msg.progress, ...(msg.phase ? { phase: msg.phase as never } : {}), ...(msg.queuePosition !== undefined ? { queuePosition: msg.queuePosition } : {}) } : j)) });
      } else if (msg.type === 'team.registered' || msg.type === 'team.updated' || msg.type === 'team.joined') {
        reload();
      } else if (msg.type === 'clock') {
        // 학급 시계(교사 일시정지 · 배속) — 위 띠 게임 날짜만 고친다.
        setBoard((b) => b && (b.class.id === msg.classId ? { ...b, clock: msg.clock } : b));
      } else if (msg.type === 'learn.stipend') {
        // 연구비가 들어왔다 — 잔액을 다시 읽는다(채점 · 서랍은 FLEARN 부품이 따로 듣는다).
        reload();
      }
    });
    return () => {
      offOpen();
      off();
    };
  }, [load, reload]);

  const setBench = useCallback((fn: (b: Bench) => Bench) => setBenchState(fn), []);

  // 진행 중 작업이 있는데 WS 가 끊겨 있으면 5초마다 다시 읽는다.
  useEffect(() => {
    if (!board?.jobs.some((j) => j.status === 'queued' || j.status === 'running')) return;
    const t = setInterval(() => {
      if (!socket.open) void load();
    }, 5000);
    return () => clearInterval(t);
  }, [board, load]);

  // 브라우저 탭 — `세움제약 — Crista: AI를 활용한 신약개발 교육 도구`(설계 §5.2). 이름을 고치면 바로 따라간다.
  const startupName = board?.team.startupName;
  useEffect(() => {
    if (startupName) document.title = `${startupName} — Crista: AI를 활용한 신약개발 교육 도구`;
  }, [startupName]);

  // 사이드바 섬(sticky)이 본문 스크롤 영역보다 길어지지 않게 그 높이를 CSS 변수(--bd-h)로 알려 준다.
  const hasBoard = board !== null;
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty('--bd-h', `${el.clientHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasBoard]);

  // 폰에서는 단계가 가로 칩 줄이다 — 지금 단계 칩이 보이게 그 줄만 옆으로 넘긴다(본문 스크롤은 건드리지 않는다).
  const groups = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = groups.current;
    const chip = row?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const left = chip.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - 8;
    row.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current, hasBoard]);

  const goStep = useCallback((id: StepId) => {
    setCurrent(id);
    // 폰에서는 본문 맨 위(머리 섬)로.
    body.current?.scrollTo({ top: 0 });
  }, []);

  if (!board) return <div className="empty" style={{ margin: 40 }}>{error ?? '작업 화면을 여는 중…'}</div>;

  const reg = registry ?? registryFor(board.track);
  const groupIds = [...new Set(reg.steps.map((s) => s.group))].sort((a, b) => a - b);
  const team = board.team;
  const color = ink(team.ink);
  const step = board.steps.find((s) => s.id === current) ?? board.steps[0];
  if (!step) return <div className="empty" style={{ margin: 40 }}>이 트랙({reg.track})에는 아직 단계가 없어요.</div>;
  const props: StepProps = { board, step, bench, setBench, reload, goStep };
  const View = reg.render(step.id);

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8M22.8 16.8A6 6 0 1 0 22.8 23.2" />
          </svg>
          CRISTA
        </div>
        <div className="co">
          <i className="inkd" style={{ background: color.base }} aria-hidden="true" />
          <b title={team.slogan ?? undefined}>{team.startupName}</b>
          <span className="tick">{team.ticker}</span>
          {!team.nameLocked && <button className="edit" type="button" onClick={() => setEditing(true)}>고치기</button>}
        </div>
        <div className="top-r">
          <GuideButton stepId={step.id} />
          <RankButton board={board} />
          <div className="kv cash">
            <span>연구비</span>
            <b>{balanceText(board)}</b>
          </div>
          <GrantChip board={board} />
          <GameDay board={board} />
          <PitchButton board={board} />
          <button className="btn sm" type="button" onClick={() => go('district')}>사옥 지구</button>
          <button className="btn sm ghost" type="button" onClick={() => void nav.logout()}>나가기</button>
        </div>
      </header>

      <LedBand board={board} />
      <p className="sr" aria-live="polite">{live}</p>

      <div className="bd-body" ref={body}>
        <nav className="isl side" aria-label="파이프라인 단계">
          <div className="side-name">
            <b>{team.startupName}</b>
          </div>
          <div className="side-groups" ref={groups}>
            {groupIds.map((g) => {
              const lines = reg.steps.filter((r) => r.group === g);
              const items = lines.flatMap((r) => board.steps.filter((s) => s.id === r.id));
              const done = items.filter((s) => s.state === 'done').length;
              // 묶음 색(DaRm 그라데이션 모음에서 묶음마다 다른 모양) — 아직 못 여는 묶음(lock)은 옅게.
              const gs = done === items.length ? 'done' : items.some((s) => s.state !== 'locked') ? 'run' : 'lock';
              return (
                <div key={g} className="grp" data-g={g} data-gs={gs}>
                  <p className="grp-h"><b>{g}</b> {reg.groups[g] ?? ''} <span>{done}/{items.length}</span></p>
                  <ol className="steps">
                    {items.map((s) => {
                      const line = lines.find((r) => r.id === s.id)!;
                      return (
                      <li key={s.id}>
                        <button type="button" className="st" data-state={s.state} aria-current={s.id === step.id ? 'step' : undefined} onClick={() => goStep(s.id)} title={s.reason}>
                          <span className="st-n">{s.id}</span>
                          <span className="st-t">{line.title}</span>
                          <span className="st-k" aria-label={STATE_WORD[s.state]}>{STATE_MARK[s.state]}</span>
                          <span className="st-s">
                            {s.sub && s.state !== 'locked' ? s.sub : s.state === 'running' ? `${s.byName ? `${s.byName} · ` : ''}${s.progressPct ?? 0}%` : s.state === 'locked' || s.state === 'blocked' ? STATE_WORD[s.state] : line.sub}
                          </span>
                        </button>
                      </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
          <div className="side-foot">
            <div className="side-team" aria-label="모둠원">
              {board.members.map((m) => <By key={m.userId} name={m.displayName} avatar={m.avatar} />)}
            </div>
            <span>{board.class.name} · 모둠 {board.class.teamCount}개</span>
            <span>계산 워커 {board.workerMode === 'compute' ? '실제 계산(compute)' : board.workerMode === 'fixture' ? '테스트 고정 결과(fixture)' : '확인 중'}</span>
          </div>
        </nav>

        {/* 대화방 행적의 '그 단계 보기' 가 단계를 옮기게. */}
        <StepNav.Provider value={goStep}>
          {View ? <View key={step.id} {...props} /> : <div className="empty">이 단계 화면이 아직 등록되지 않았어요.</div>}
        </StepNav.Provider>
      </div>
      {/* 본문(크기 가둠 = 고정 위치의 기준)이 아니라 화면 기준으로 띄우려고 본문 밖에 둔다. */}
      {error && <p className="err bd-err" role="alert">{error}</p>}

      {editing && (
        <RenameDialog
          board={board}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await load();
            setMe(await api.get<MeResponse>(API.me));
          }}
        />
      )}
    </div>
  );
}

/** 위 띠 게임 날짜 — 훅이 조건부로 불리지 않게 따로 뺐다(Board 는 화면 한 장을 읽기 전에 일찍 돌아간다). */
function GameDay({ board }: { board: BoardResponse }) {
  const clock = clockOf(board);
  const day = useGameDay(clock);
  return (
    <div className="kv day" title={clock.paused ? '선생님이 학급 시계를 멈췄어요' : `학급 게임 날짜 · 현실 1분에 ${clock.rate}게임 일`}>
      <span>게임 날짜</span>
      <b>{day}{clock.paused ? ' ⏸' : ''}</b>
    </div>
  );
}

function RenameDialog({ board, onClose, onSaved }: { board: BoardResponse; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(board.team.startupName ?? '');
  const [ticker, setTicker] = useState(board.team.ticker ?? '');
  const [slogan, setSlogan] = useState(board.team.slogan ?? '');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="modal-back">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rn-h"
        onSubmit={(e) => {
          e.preventDefault();
          api
            .patch(API.registration(board.team.id), { name, ticker: ticker.toUpperCase(), slogan: slogan || null })
            .then(onSaved)
            .catch((err) => setError(message(err)));
        }}
      >
        <button type="button" className="close" aria-label="닫기" onClick={onClose}>×</button>
        <h2 id="rn-h">스타트업 이름 고치기</h2>
        <p className="mini muted">첫 유료 연구(스크리닝 등)를 시작하면 그 뒤로는 선생님만 고칠 수 있어요.</p>
        <div className="fld"><label className="lab" htmlFor="rn-n">이름</label><input id="rn-n" className="txt" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} /></div>
        <div className="fld"><label className="lab" htmlFor="rn-t">티커</label><input id="rn-t" className="txt mono" value={ticker} maxLength={4} onChange={(e) => setTicker(e.target.value.toUpperCase())} /></div>
        <div className="fld"><label className="lab" htmlFor="rn-s">슬로건</label><input id="rn-s" className="txt" value={slogan} maxLength={40} onChange={(e) => setSlogan(e.target.value)} /></div>
        {error && <p className="err" style={{ marginTop: 10 }}>{error}</p>}
        <div className="acts" style={{ marginTop: 14 }}><button className="btn pri" type="submit">저장</button></div>
      </form>
    </div>
  );
}
