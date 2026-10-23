/**
 * 교사 화면의 전광판 칸(설계 §9 · §5.3) — 학급 LED 띠 · 지금 기업가치 순위 · 마감 시각 정하기 · [지금 마감] · [마감 풀기] ·
 * 최종 순위(마감 전은 미리보기) · 공지 · 정정 소식 · **프로젝터 보기**(큰 글자 전광판 + 순위 — 수업 화면에 띄워 두기).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  formatCapM,
  formatPct,
  MARKET_API,
  MARKET_COPY,
  type MarketFinalResponse,
} from '@crista-web/web-contract';
import { api, message } from '../../api.ts';
import { ink } from '../../ink.ts';
import { useLive } from '../ui/index.ts';
import { FinalBody } from './FinalStandings.tsx';
import { LedBand } from './LedBand.tsx';
import { openFinal, reloadMarket, useMarket } from './store.ts';
import './market.css';

const T = MARKET_COPY.teacher;

/** datetime-local 값(지역 시각) ↔ ISO. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtAt = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function TeacherMarket({ classId }: { classId: string }) {
  const { data } = useMarket(classId, 20);
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projector, setProjector] = useState(false);
  const [notice, setNotice] = useState({ headline: '', teamId: '', changePct: '' });

  useEffect(() => setEndsAt(toLocalInput(data?.endsAt ?? null)), [data?.endsAt]);

  async function act(body: unknown, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post<MarketFinalResponse>(MARKET_API.finalAction(classId), body);
      reloadMarket();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(MARKET_API.notice(classId), {
        headline: notice.headline,
        teamId: notice.teamId || null,
        changePct: notice.teamId && notice.changePct !== '' ? Number(notice.changePct) : null,
      });
      setNotice({ headline: '', teamId: '', changePct: '' });
    } catch (err) {
      setError(message(err));
    }
  }

  const final = data?.final ?? null;
  return (
    <section className="panel mk-teacher" aria-labelledby="mk-t-h">
      <h2 className="ptitle" id="mk-t-h">{T.title} <small>{final ? T.finalDone(fmtAt(final.at)) : T.open}</small></h2>
      <div className="mk-t-band"><LedBand classId={classId} /></div>
      {error && <p className="err" role="alert">{error}</p>}

      <div className="acts" style={{ marginTop: 12 }}>
        <button type="button" className="btn sm pri" onClick={() => setProjector(true)}>{T.projector}</button>
        <button type="button" className="btn sm" onClick={() => openFinal(true)}>{final ? T.finalView : T.finalPreview}</button>
        {final ? (
          <button type="button" className="btn sm" disabled={busy} onClick={() => void act({ action: 'reopen' }, T.reopenConfirm)}>{T.reopen}</button>
        ) : (
          <button type="button" className="btn sm" disabled={busy} onClick={() => void act({ action: 'close' }, T.closeConfirm)}>{T.closeNow}</button>
        )}
      </div>

      {!final && (
        <div className="fld mk-t-ends">
          <label className="lab" htmlFor="mk-ends">{T.endsAt}</label>
          <div className="row">
            <input id="mk-ends" className="txt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{ maxWidth: 240 }} />
            <button type="button" className="btn sm" disabled={busy || !endsAt} onClick={() => void act({ action: 'schedule', endsAt: new Date(endsAt).toISOString() })}>{T.schedule}</button>
            {data?.endsAt && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => void act({ action: 'schedule', endsAt: null })}>{T.clearSchedule}</button>}
          </div>
        </div>
      )}

      <RankTable classId={classId} />

      <form className="mk-t-notice" onSubmit={send}>
        <h3 className="mk-h">{T.notice}</h3>
        <div className="fld"><label className="lab" htmlFor="mk-n-h">{T.noticeHeadline}</label><input id="mk-n-h" className="txt" maxLength={120} value={notice.headline} onChange={(e) => setNotice({ ...notice, headline: e.target.value })} placeholder={T.noticePlaceholder} /></div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="lab" htmlFor="mk-n-t" style={{ margin: 0 }}>{T.noticeTeam}</label>
          <select id="mk-n-t" className="txt" value={notice.teamId} onChange={(e) => setNotice({ ...notice, teamId: e.target.value })} style={{ maxWidth: 200 }}>
            <option value="">—</option>
            {data?.ranking.map((r) => <option key={r.teamId} value={r.teamId}>{r.ticker} · {r.startupName}</option>)}
          </select>
          {notice.teamId && (
            <>
              <label className="lab" htmlFor="mk-n-p" style={{ margin: 0 }}>{T.noticePct}</label>
              <input id="mk-n-p" className="txt mono" type="number" step="0.1" min={-20} max={20} value={notice.changePct} onChange={(e) => setNotice({ ...notice, changePct: e.target.value })} style={{ maxWidth: 100 }} />
            </>
          )}
          <button type="submit" className="btn sm" disabled={!notice.headline.trim()}>{T.noticeSend}</button>
        </div>
      </form>

      {projector && <Projector classId={classId} onClose={() => setProjector(false)} />}
    </section>
  );
}

function RankTable({ classId, big }: { classId: string; big?: boolean }) {
  const { data } = useMarket(classId, 20);
  if (!data?.ranking.length) return <p className="mini muted">{MARKET_COPY.board.empty}</p>;
  return (
    <ol className={`mk-rank${big ? ' big' : ''}`} aria-label={MARKET_COPY.rank.label}>
      {data.ranking.map((r) => (
        <li key={r.teamId}>
          <b className="mono mk-rank-n">{r.rank}</b>
          <i className="inkd" style={{ background: big ? ink(r.ink).led : ink(r.ink).base }} aria-hidden="true" />
          <span className="mk-rank-name">{r.startupName} <span className="mono">{r.ticker}</span></span>
          <span className="mono mk-rank-cap">{formatCapM(r.priceUsd)}</span>
          <span className={`mono mk-rank-pct ${(r.lastChangePct ?? 0) < 0 ? 'dn' : (r.lastChangePct ?? 0) > 0 ? 'up' : ''}`}>{formatPct(r.lastChangePct)}</span>
          <span className="mk-rank-tier" title={T.tier(r.hqTier)}>{'▮'.repeat(r.hqTier)}<span className="sr">{T.tier(r.hqTier)}</span></span>
        </li>
      ))}
    </ol>
  );
}

/** 프로젝터 보기 — 화면 가득 큰 글자 전광판 + 순위(마감 뒤엔 시상대 · 추세). Esc 로 닫는다. */
export function Projector({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { data } = useMarket(classId, 20);
  const final = useLive<MarketFinalResponse>(data?.final ? MARKET_API.final(classId) : null, (m) => m.type === 'board.event' && m.event.kind === 'notice');
  const closeBtn = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    addEventListener('keydown', onKey);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      removeEventListener('keydown', onKey);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  return (
    <div className="mk-projector" role="dialog" aria-modal="true" aria-label={T.projector}>
      <button ref={closeBtn} type="button" className="tool mk-proj-close" onClick={onClose}>{T.closeProjector}</button>
      <LedBand classId={classId} big />
      <div className="mk-proj-body">
        {data?.final && final.data ? <FinalBody d={final.data} myTeamId={null} big /> : <RankTable classId={classId} big />}
      </div>
    </div>
  );
}
