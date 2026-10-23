/**
 * 위 띠 [투자 유치] 단추(learning-grant 설계 §2.4 · §5) — Series A(2.2 특허 후보 뒤) · B(3.1 특허 + 3.3 IND 승인 뒤) 자동 심사 창.
 *
 * 창: 모둠원 넷이 발굴한 후보 비교(별칭 · 누가 · ΔG · 결합력 p · 신호) + 정량 게이지(70점 — 서버 계산) + 피치 칸(30점 — AI) →
 * [투자 심사 받기] → 정량만큼 바로 입금(바닥 30%) · AI 가 피치를 읽으면 나머지 차액. 라운드마다 모둠 한 번(교사 승인 없음).
 * 금액은 서버 규칙(`pitchPayout`)만 정한다 — 화면의 예상치는 같은 함수로 그린 범위다.
 */
import {
  formatCrista,
  LEARN_API,
  LEARN_COPY,
  LEARN_TEXT_LIMITS,
  PITCH_FLOOR_RATIO,
  PITCH_QUAL_MAX,
  PITCH_ROUNDS,
  type BoardResponse,
  type PitchPreviewResponse,
  type PitchRound,
  type PitchRoundView,
  type QuantBreakdown,
  type ServerMessage,
} from '@crista-web/web-contract';
import { useEffect, useId, useRef, useState } from 'react';
import { api, message } from '../../api.ts';
import { Confirm, Tabs, useLive } from '../ui/index.ts';
import './learn.css';
import { reloadLearn, useLearnSummary } from './useLearn.ts';

const C = LEARN_COPY;

export function PitchButton({ board }: { board: BoardResponse }) {
  const { data } = useLearnSummary();
  const [open, setOpen] = useState(false);
  const fallbackA = board.steps.find((s) => s.id === '2.2')?.state === 'done';
  const ready = data ? PITCH_ROUNDS.some((r) => data.pitch[r].eligible) : fallbackA;
  const done = data ? PITCH_ROUNDS.filter((r) => data.pitch[r].result).length : 0;
  const first: PitchRound = data?.pitch.series_a.result && (data.pitch.series_b.eligible || data.pitch.series_b.result) ? 'series_b' : 'series_a';
  return (
    <>
      <button
        type="button"
        className={`btn sm${ready ? ' film' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={ready ? undefined : data?.pitch.series_a.result ? (data.pitch.series_b.result ? undefined : C.pitchLockedB) : C.pitchLockedA}
        onClick={() => setOpen(true)}
      >
        {C.pitchButton}
        {ready ? ' ▸' : done ? ` ✓${done}` : ''}
      </button>
      {open && <PitchDialog initial={first} onClose={() => setOpen(false)} />}
    </>
  );
}

function PitchDialog({ initial, onClose }: { initial: PitchRound; onClose: () => void }) {
  const id = useId();
  const [round, setRound] = useState<PitchRound>(initial);
  const closeRef = useRef<HTMLButtonElement>(null);
  const back = useRef<Element | null>(null);
  const cancel = useRef(onClose);
  cancel.current = onClose;
  useEffect(() => {
    back.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel.current();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      if (back.current instanceof HTMLElement) back.current.focus();
    };
  }, []);
  return (
    <div className="ln-pitch-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ln-pitch" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`}>
        <button ref={closeRef} type="button" className="btn ghost sm close" onClick={onClose} aria-label={C.close}>
          ✕
        </button>
        <h2 id={`${id}-h`}>{C.pitchTitle(C.round[round])}</h2>
        <Tabs size="sm" label={C.roundTabs} value={round} onChange={(v) => setRound(v as PitchRound)} items={PITCH_ROUNDS.map((r) => ({ id: r, label: C.round[r] }))} />
        <PitchPanel key={round} round={round} />
      </div>
    </div>
  );
}

const refetch = (m: ServerMessage) => m.type === 'learn.graded' || (m.type === 'board.changed' && m.reason.startsWith('learn'));

function PitchPanel({ round }: { round: PitchRound }) {
  const live = useLive<PitchPreviewResponse>(LEARN_API.pitchPreview(round), refetch);
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = live.data;
  if (!p) return <p className="hint">{live.error ? live.error.message : C.loading}</p>;
  const result = p.result;
  const chars = [...text.trim()].length;
  const ok = chars >= LEARN_TEXT_LIMITS.pitch.min && chars <= LEARN_TEXT_LIMITS.pitch.max;
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post<PitchRoundView>(LEARN_API.pitch(round), { pitch: text });
      setConfirm(false);
      live.reload();
      reloadLearn();
    } catch (e) {
      setError(message(e));
      setConfirm(false);
      live.reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ln" style={{ gap: 14 }}>
      {result ? (
        <ResultView r={result} />
      ) : !p.eligible ? (
        <p className="hint">🔒 {p.reason ?? (round === 'series_a' ? C.pitchLockedA : C.pitchLockedB)}</p>
      ) : null}

      <section aria-label={C.pitchQuant}>
        <h3 className="ln-h">
          {C.pitchQuant} <small>{(result?.quant ?? p.quant).total}/70</small>
        </h3>
        <Gauge quant={result?.quant ?? p.quant} qual={result?.qual ?? null} />
        <Parts quant={result?.quant ?? p.quant} />
      </section>

      {p.candidates.length > 0 && (
        <section aria-label={C.pitchCandidates}>
          <h3 className="ln-h">{C.pitchCandidates}</h3>
          <table className="ln-cands">
            <thead>
              <tr>
                <th scope="col">{C.colCandidate}</th>
                <th scope="col">{C.colBy}</th>
                <th scope="col">{C.colDg}</th>
                <th scope="col" className="sig-col">{C.colSignals}</th>
              </tr>
            </thead>
            <tbody>
              {p.candidates.map((c) => (
                <tr key={c.alias}>
                  <td>
                    {c.alias}{' '}
                    {c.role !== 'candidate' && <span className={`role ${c.role}`}>{c.role === 'lead' ? C.roleLead : C.roleBackup}</span>}
                  </td>
                  <td>{c.byName}</td>
                  <td className="mono">
                    {c.deltaG?.toFixed(1) ?? '—'} · {c.strength?.toFixed(2) ?? '—'}
                  </td>
                  <td className="sig-col">{c.signals.join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!result && p.eligible && (
        <section aria-label={C.pitchQual}>
          <h3 className="ln-h">{C.pitchQual}</h3>
          <p className="mini">{round === 'series_a' ? C.pitchPromptA : C.pitchPromptB}</p>
          <div className="ln-ta">
            <textarea className="txt" value={text} onChange={(e) => setText(e.target.value)} maxLength={LEARN_TEXT_LIMITS.pitch.max + 50} aria-label={C.pitchQual} />
            <span className={`cnt${chars > 0 && !ok ? ' bad' : ''}`} aria-live="polite">
              {C.chars(chars, LEARN_TEXT_LIMITS.pitch.min, LEARN_TEXT_LIMITS.pitch.max)}
            </span>
          </div>
          <p className="mini">
            {C.pitchEstimate(formatCrista(p.estimate.min), formatCrista(p.estimate.max))} · {C.pitchFloor(formatCrista(p.floorCrista))}
          </p>
          <div className="acts">
            <button type="button" className="btn pri" disabled={!ok || busy} onClick={() => setConfirm(true)}>
              {C.pitchSubmit}
            </button>
          </div>
          {error && <p className="hint bad">✕ {error}</p>}
          <Confirm open={confirm} title={C.pitchTitle(C.round[round])} confirmLabel={C.pitchSubmit} tone="film" busy={busy} onConfirm={() => void send()} onCancel={() => setConfirm(false)}>
            <p>{C.pitchConfirm}</p>
          </Confirm>
        </section>
      )}
    </div>
  );
}

function ResultView({ r }: { r: PitchRoundView }) {
  return (
    <section className="ln-eval" aria-label={C.pitchDone(C.round[r.round])}>
      <div className="ln-eval-h">
        <b>{C.pitchDone(C.round[r.round])}</b>
        <span className="ln-score">{C.points(r.total ?? r.quant.total)}</span>
        <span className="ln-paid">{C.paid(formatCrista(r.crista))}</span>
        {r.status === 'pending' ? (
          <span className="ln-pend" role="status">
            <i aria-hidden="true" />
            {C.pitchPaidBase}
          </span>
        ) : (
          <span className="mini">{C.qualOf(r.qual)}</span>
        )}
      </div>
      {r.flags.length > 0 && <p className="hint bad">{r.flags.map((f) => (C.flag as Record<string, string>)[f] ?? f).join(' ')}</p>}
      {r.rubric && (
        <ul className="ln-rub">
          {r.rubric.map((row) => (
            <li key={row.id} className={row.credit}>
              <span className="mk" aria-label={C.creditWord[row.credit]}>
                {C.credit[row.credit]}
              </span>
              <span>
                {row.criterion}
                {row.note && <small>{row.note}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {r.feedback && <p className="ln-fb">{r.feedback}</p>}
    </section>
  );
}

/** 0~100 점 막대 — 정량 부분(잉크 두 톤 번갈아) + 정성 30 칸(점선 · 받은 만큼 라임) + 바닥 30% 표시선(빨강 실선 + 글). */
function Gauge({ quant, qual }: { quant: QuantBreakdown; qual: number | null }) {
  const W = 400;
  const x = (pts: number) => (W * pts) / 100;
  let at = 0;
  const label = C.gaugeLabel(quant.total, qual, Math.round(PITCH_FLOOR_RATIO * 100));
  return (
    <div className="ln-gauge">
      <svg viewBox={`0 0 ${W} 40`} role="img" aria-label={label}>
        <rect className="g-bg" x={0} y={6} width={W} height={16} rx={8} />
        {quant.parts.map((p, i) => {
          const r = <rect key={p.key} className={i % 2 ? 'g-q2' : 'g-q'} x={x(at)} y={6} width={Math.max(0, x(p.points))} height={16} />;
          at += p.points;
          return r;
        })}
        <rect className="g-qual" x={x(70)} y={6.75} width={x(PITCH_QUAL_MAX) - 0.75} height={14.5} rx={6} />
        {qual !== null && <rect className="g-qual-on" x={x(quant.total)} y={6} width={x(qual)} height={16} />}
        <line className="g-floor" x1={x(30)} x2={x(30)} y1={2} y2={26} />
        <text x={x(30) + 3} y={36}>
          {C.gaugeFloor}
        </text>
        <text x={x(70) + 3} y={36}>
          {C.gaugeQual}
        </text>
      </svg>
    </div>
  );
}

function Parts({ quant }: { quant: QuantBreakdown }) {
  return (
    <ul className="ln-parts">
      {quant.parts.map((p) => (
        <li key={p.key}>
          <span>{p.label}</span>
          <b className="mono">
            {p.points}/{p.max}
          </b>
          <small>{p.detail}</small>
        </li>
      ))}
    </ul>
  );
}
