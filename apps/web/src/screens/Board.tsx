/**
 * ③ 전광판 01 + 05 작업 화면(설계 §5) — 위 띠(스타트업 이름 · 연구비 · 사옥 지구) → LED 흐르는 띠 → 사이드바 1.~4. · 작업 영역.
 *
 * - 화면 한 장(`GET /api/board`)을 서버가 계산해 준다. 모둠 채널 `board.changed` 면 다시 읽고, `job.progress` 는 그 줄만 고친다.
 * - LED 띠는 W3 에서는 '자리' — 지금은 학급의 설립 등기 소식만 흐른다(기업가치 · 순위 · 애널리스트 헤드라인은 W5).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  API,
  GROUP_TITLE,
  STEP_META,
  type BoardResponse,
  type MeResponse,
  type ServerMessage,
  type StepId,
  type StepView,
} from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { api, ApiFailure, message } from '../api.ts';
import { initialBench, LockedStep, Step11, Step12, Step21, Step22, type Bench, type StepProps } from '../board/steps.tsx';
import { ink, money } from '../ink.ts';
import { socket } from '../ws.ts';

const STATE_MARK: Record<StepView['state'], string> = { done: '✓', running: '▸', ready: '', locked: '🔒', held: '✕', blocked: '⏸', review: '↻' };
const STATE_WORD: Record<StepView['state'], string> = { done: '완료', running: '진행 중', ready: '할 수 있음', locked: '잠김', held: '보류', blocked: '막힘', review: '다시 보기' };

function firstOpen(steps: StepView[]): StepId {
  return (steps.find((s) => s.state !== 'done' && s.state !== 'locked') ?? steps.find((s) => s.state !== 'done') ?? steps[0]!).id;
}

export function Board({ nav }: { nav: Nav }) {
  const { go, setMe } = nav;
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<StepId | null>(null);
  const [bench, setBenchState] = useState<Bench>(initialBench);
  const [paused, setPaused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [live, setLive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const news = useMemo(() => {
    if (!board) return [];
    return board.teams
      .filter((t) => t.startupName && t.ticker)
      .map((t) => ({ id: t.id, text: `◆ ${t.ticker} 「${t.startupName}」 설립 등기 — 상장가 $10.00`, mine: t.isMine }));
  }, [board]);

  if (!board) return <div className="empty" style={{ margin: 40 }}>{error ?? '작업 화면을 여는 중…'}</div>;

  const team = board.team;
  const color = ink(team.ink);
  const step = board.steps.find((s) => s.id === current) ?? board.steps[0]!;
  const props: StepProps = { board, step, bench, setBench, reload, goStep: (id) => setCurrent(id) };
  const groups = [1, 2, 3, 4] as const;

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">◇ CRISTA <small>파이프라인 랩</small></div>
        <div className="co">
          <i className="inkd" style={{ background: color.base }} aria-hidden="true" />
          <b title={team.slogan ?? undefined}>{team.startupName}</b>
          <span className="tick">{team.ticker}</span>
          {!team.nameLocked && <button className="edit" type="button" onClick={() => setEditing(true)}>고치기</button>}
        </div>
        <div className="top-r">
          <div className="online" aria-label="모둠원">
            {board.members.map((m) => <span key={m.userId} className="badge" title={m.displayName}>{m.displayName}{m.avatar ? ` · ${m.avatar.toUpperCase()}` : ''}</span>)}
          </div>
          <div className="kv"><span>연구비</span><b>{money(board.balanceCents)}</b></div>
          <button className="btn sm" type="button" onClick={() => go('district')}>사옥 지구</button>
          <button className="btn sm" type="button" onClick={() => void nav.logout()}>나가기</button>
        </div>
      </header>

      <div className={`board${paused ? ' paused' : ''}`} aria-label="학급 전광판">
        <div className="bd-in">
          <div className="mq">
            <div className="mq-track">
              {[0, 1].map((k) => (
                <span key={k} className="mq-seg" aria-hidden={k === 1 ? true : undefined} {...(k === 1 ? { inert: true } : {})}>
                  {(news.length ? news : [{ id: 'none', text: '◆ 다른 모둠이 등기하면 여기 소식이 흘러요', mine: false }]).map((n) => (
                    <span key={n.id} className={`led-i${n.mine ? ' g' : ''}`}><span className="led">{n.text}</span></span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bd-ctl">
          <span className="live" aria-hidden="true"><i />{paused ? '멈춤' : 'LIVE'}</span>
          <button type="button" className="tool" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? '다시 흐르기' : '멈추기'}</button>
        </div>
      </div>
      <p className="sr" aria-live="polite">{live}</p>

      <nav className="side" aria-label="파이프라인 단계">
        <p className="side-h">{team.startupName} · 신약 파이프라인</p>
        {groups.map((g) => {
          const items = board.steps.filter((s) => s.group === g);
          const done = items.filter((s) => s.state === 'done').length;
          return (
            <div key={g} className="grp">
              <p className="grp-h"><b>{g}.</b> {GROUP_TITLE[g]} <span>{done}/{items.length}</span></p>
              <ol className="steps">
                {items.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="st" data-state={s.state} aria-current={s.id === step.id ? 'step' : undefined} onClick={() => setCurrent(s.id)} title={s.reason}>
                      <span className="st-n">{s.id}</span>
                      <span className="st-t">{STEP_META[s.id].title}</span>
                      <span className="st-k" aria-label={STATE_WORD[s.state]}>{STATE_MARK[s.state]}</span>
                      <span className="st-s">
                        {s.state === 'running' ? `${s.byName ? `${s.byName} · ` : ''}${s.progressPct ?? 0}%` : s.state === 'locked' || s.state === 'blocked' ? STATE_WORD[s.state] : STEP_META[s.id].sub}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        <div className="side-foot">
          <span>{board.class.name} · 모둠 {board.class.teamCount}개</span>
          <span>계산 워커 {board.workerMode === 'compute' ? '실제 계산(compute)' : board.workerMode === 'fixture' ? '테스트 고정 결과(fixture)' : '확인 중'}</span>
        </div>
      </nav>

      <main className="main">
        <div className="wrap">
          {error && <p className="err" role="alert">{error}</p>}
          {step.state === 'locked' && step.group <= 2 && <p className="hint">🔒 {step.reason}</p>}
          {step.id === '1.1' ? <Step11 {...props} /> : step.id === '1.2' ? <Step12 {...props} /> : step.id === '2.1' ? <Step21 {...props} /> : step.id === '2.2' ? <Step22 {...props} /> : <LockedStep {...props} />}
        </div>
      </main>

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
