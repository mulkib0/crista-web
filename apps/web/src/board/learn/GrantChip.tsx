/**
 * 위 띠 연구비 옆 '⚡ ×m · 단계 가동 k/n' 칩(learning-grant 설계 §5) — 누르면 학습 · 연구비 서랍
 * (지금 단계 문항 · 연구 노트 현황 · 가동률 · 연속 단계 · 보호권 · 기초 연구비 틱 · Series A/B 심사 현황).
 *
 * 값은 서버 `GET /api/learn/summary`(useLearnSummary — 투자 유치 단추와 나눠 쓴다). 상태는 색만으로 말하지 않는다(● ○ – · ✓ · 🛡).
 */
import {
  formatCrista,
  LEARN_COPY,
  LEARN_SHIELDS_MAX,
  LEARN_TICKS_PER_STEP,
  PITCH_ROUNDS,
  STEP_META,
  type BoardResponse,
  type LearnSummaryResponse,
} from '@crista-web/web-contract';
import { useEffect, useId, useRef, useState } from 'react';
import { HBars } from '../ui/index.ts';
import './learn.css';
import { useLearnSummary } from './useLearn.ts';

const C = LEARN_COPY;

export function GrantChip({ board }: { board: BoardResponse }) {
  const { data } = useLearnSummary();
  const [open, setOpen] = useState(false);
  const a = data?.activity;
  const m = a ? a.multiplier.toFixed(1) : '1.0';
  const k = a?.active ?? 0;
  const n = a?.total ?? board.members.length;
  return (
    <>
      <button
        type="button"
        className="tb-chip grant"
        data-full={a ? a.ratio >= 1 : false}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={C.chipTitle}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">⚡</span> {a ? C.chip(m, k, n) : C.chip('…', 0, n).replace(' 0/', ' —/')}
      </button>
      {open && <LearnDrawer data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

function minutesUntil(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return C.soon;
  return C.minutesLater(Math.ceil(ms / 60_000));
}

function LearnDrawer({ data, onClose }: { data: LearnSummaryResponse | null; onClose: () => void }) {
  const id = useId();
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
  const a = data?.activity;
  return (
    <div className="ln-drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="ln-drawer" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`}>
        <div className="ln-drawer-in">
          <button ref={closeRef} type="button" className="btn ghost sm close" onClick={onClose} aria-label={C.close}>
            ✕
          </button>
          <h2 id={`${id}-h`}>{C.drawerTitle}</h2>
          {!data || !a ? (
            <p className="hint">{C.loading}</p>
          ) : (
            <>
              <section className="ln-card" aria-label={C.currentStep}>
                <h3>
                  {C.currentStep} · {data.currentStep} {STEP_META[data.currentStep].title}
                </h3>
                <div className="ln-stats">
                  <div className="ln-stat">
                    <b>
                      {a.active}/{a.total}
                    </b>
                    <span>{C.activeMembers}</span>
                  </div>
                  <div className="ln-stat">
                    <b>×{a.multiplier.toFixed(2)}</b>
                    <span>{C.multiplier}</span>
                  </div>
                  <div className="ln-stat">
                    <b>{a.streak}</b>
                    <span>{C.streak}</span>
                  </div>
                </div>
                <ul className="ln-members" aria-label={C.activeMembers}>
                  {a.members.map((mem) => (
                    <li key={mem.userId} className={mem.exempt ? 'ex' : mem.active ? 'on' : ''}>
                      <span aria-hidden="true">{mem.exempt ? '–' : mem.active ? '●' : '○'}</span>
                      {mem.displayName}
                      <span className="sr"> {mem.exempt ? C.memberExempt : mem.active ? C.memberActive : C.memberIdle}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ln-card" aria-label={C.stipend}>
                <h3>{C.stipend}</h3>
                <p className="mini">{C.stipendHelp}</p>
                <p className="mono">
                  {a.ticksPaid}/{LEARN_TICKS_PER_STEP} · {formatCrista(a.stipendCrista)} / {formatCrista(a.stipendMaxCrista)}
                </p>
                <p className="mini muted">
                  {a.ticksPaid >= LEARN_TICKS_PER_STEP || a.settled ? `✓ ${C.ticksDone}` : a.nextTickAt ? `${C.nextTick} · ${minutesUntil(a.nextTickAt)}` : C.paused}
                </p>
                <p className="mini">
                  {C.shields} <span className="ln-shields" aria-label={C.shieldCount(data.shields)}>{'🛡'.repeat(data.shields) || '—'}</span> {data.shields}/{LEARN_SHIELDS_MAX}
                </p>
                <p className="mini muted">{C.shieldsHelp}</p>
              </section>

              <section className="ln-card" aria-label={C.perStep}>
                <h3>{C.perStep}</h3>
                <ul className="ln-steps">
                  {data.steps.map((s) => (
                    <li key={s.stepId} className={s.stepId === data.currentStep ? 'cur' : ''}>
                      <span className="sid">{s.stepId}</span>
                      <span className="ln-bar" role="progressbar" aria-label={`${s.stepId} ${C.itemsCap}`} aria-valuemin={0} aria-valuemax={s.capCrista} aria-valuenow={s.itemsCrista}>
                        <i style={{ width: `${Math.min(100, (100 * s.itemsCrista) / s.capCrista)}%` }} />
                      </span>
                      <span className="meta">
                        {s.settled ? '✓ ' : ''}
                        {C.stepRow(formatCrista(s.itemsCrista, { unit: false }), String(s.noteScore ?? '—'))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ln-card" aria-label={C.totals}>
                <h3>{C.totals}</h3>
                <HBars
                  label={C.totals}
                  labelWidth={86}
                  rows={[
                    { label: C.totalsItems, value: data.totals.items, text: formatCrista(data.totals.items, { unit: false }) },
                    { label: C.totalsNotes, value: data.totals.notes, text: formatCrista(data.totals.notes, { unit: false }) },
                    { label: C.totalsStipend, value: data.totals.stipend, text: formatCrista(data.totals.stipend, { unit: false }) },
                    { label: C.totalsPitch, value: data.totals.pitch, text: formatCrista(data.totals.pitch, { unit: false }), tone: 'hi' },
                    ...(data.totals.corrections ? [{ label: C.totalsCorrections, value: data.totals.corrections, text: formatCrista(data.totals.corrections, { unit: false }), tone: 'dim' as const }] : []),
                  ]}
                />
              </section>

              <section className="ln-card" aria-label={C.pitchButton}>
                <h3>{C.pitchButton}</h3>
                {PITCH_ROUNDS.map((r) => {
                  const p = data.pitch[r];
                  return (
                    <p key={r} className="mini">
                      <b>{C.round[r]}</b>{' '}
                      {p.result
                        ? `${p.result.status === 'paid' ? '✓' : '⏳'} ${C.pitchRow(p.result.total ?? p.result.quant.total, formatCrista(p.result.crista))}`
                        : p.eligible
                          ? C.pitchOpen(formatCrista(p.maxCrista))
                          : `🔒 ${p.reason ?? ''}`}
                    </p>
                  );
                })}
              </section>
              {!data.llmAvailable && <p className="hint">ⓘ {C.pendingSlow}</p>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
