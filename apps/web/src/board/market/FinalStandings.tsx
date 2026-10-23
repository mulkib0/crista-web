/**
 * 최종 순위 창 — 수업이 끝나거나(교사 [지금 마감]) 교사가 정한 시각이 지나 얼린 순위(2026-10-24 사용자 지시 · learning-grant §5 2축).
 * 시상대(1~3위) · 모둠별 결과 · 과정 내역 표 · 기업가치 추세(모든 모둠) · 과정 평가 신호(학생은 우리 모둠만 · 교사는 모든 모둠).
 * 교사는 마감 전에도 미리보기로 본다(얼리지 않은 지금 값).
 */
import { useEffect, useRef } from 'react';
import {
  formatCapM,
  formatPct,
  MARKET_API,
  MARKET_COPY,
  processStepLabel,
  type MarketFinalResponse,
  type ProcessStepView,
  type StandingRow,
} from '@crista-web/web-contract';
import { ink } from '../../ink.ts';
import { useLive } from '../ui/index.ts';
import { openFinal, useMarket } from './store.ts';
import { TrendChart } from './Trend.tsx';

const C = MARKET_COPY.final;
const P = MARKET_COPY.process;

const fmtAt = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function FinalStandings({ classId }: { classId?: string }) {
  const { final: open, data: board } = useMarket(classId, classId ? 20 : undefined);
  const live = useLive<MarketFinalResponse>(open ? MARKET_API.final(classId) : null, (m) => m.type === 'board.event');
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openFinal(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const d = live.data;
  return (
    <div className="modal-back mk-back" onClick={(e) => e.target === e.currentTarget && openFinal(false)}>
      <section className="mk-final" role="dialog" aria-modal="true" aria-labelledby="mk-f-h">
        <button ref={close} type="button" className="close" aria-label={C.close} onClick={() => openFinal(false)}>×</button>
        <h2 id="mk-f-h">{d?.preview ? C.previewTitle : C.title}</h2>
        {!d ? (
          <p className="mini muted">{live.error ? live.error.message : MARKET_COPY.board.loading}</p>
        ) : !d.final && !d.preview ? (
          <p className="empty">{C.notYet}</p>
        ) : (
          <FinalBody d={d} myTeamId={board?.myTeamId ?? d.myTeamId} />
        )}
      </section>
    </div>
  );
}

export function FinalBody({ d, myTeamId, big }: { d: MarketFinalResponse; myTeamId: string | null; big?: boolean }) {
  const top = [d.standings[1], d.standings[0], d.standings[2]].filter(Boolean) as StandingRow[];
  return (
    <div className={`mk-final-body${big ? ' big' : ''}`}>
      {d.final && <p className="mini muted">{C.frozenAt(fmtAt(d.final.at))} {C.reason[d.final.reason]}</p>}
      <section aria-label={C.podium}>
        <ol className="mk-podium">
          {top.map((s) => (
            <li key={s.teamId} data-rank={s.rank} className={s.teamId === myTeamId ? 'mine' : ''}>
              <span className="mk-pod-name"><i className="inkd" style={{ background: big ? ink(s.ink).led : ink(s.ink).base }} aria-hidden="true" /> {s.startupName}</span>
              <span className="mono mini">{s.ticker} · {formatCapM(s.priceUsd)}</span>
              <span className="mk-pod-step" style={{ height: `${s.rank === 1 ? 92 : s.rank === 2 ? 68 : 50}px` }}>
                <b>{s.rank}</b>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mk-h">{C.table}</h3>
        <div className="tbl-w mk-table">
          <table>
            <thead>
              <tr>
                <th>{C.cols.rank}</th><th>{C.cols.team}</th><th className="num">{C.cols.cap}</th><th className="num">{C.cols.result}</th>
                <th className="num">{C.cols.process}</th><th>{C.cols.step}</th><th>{C.cols.approved}</th><th className="num">{C.cols.research}</th>
              </tr>
            </thead>
            <tbody>
              {d.standings.map((s) => (
                <tr key={s.teamId} className={s.teamId === myTeamId ? 'mine' : ''}>
                  <td className="mono">{s.rank}{s.teamId === myTeamId ? ' ●' : ''}</td>
                  <td><i className="inkd" style={{ background: big ? ink(s.ink).led : ink(s.ink).base }} aria-hidden="true" /> <b>{s.startupName}</b> <span className="mono mini">{s.ticker}</span></td>
                  <td className="num mono">{formatCapM(s.priceUsd)}</td>
                  <td className="num mono">{s.resultScore}</td>
                  <td className="num mono">{s.processScore}</td>
                  <td className="mono">{s.furthestStep ? `${s.furthestStep} · ${s.stepsDone}/9` : '—'}</td>
                  <td>{s.approved ? C.approvedYes : C.approvedNo}</td>
                  <td className="num mono">{s.researchIndex} ({s.researchRank})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mk-hints mini muted">
          <li>{C.resultHint}</li>
          <li>{C.processHint}</li>
          <li>{C.researchHint}</li>
          <li>{C.rankingRule}</li>
        </ul>
      </section>

      <section>
        <h3 className="mk-h">{C.trend}</h3>
        <TrendChart
          label={C.trendAria}
          empty={MARKET_COPY.drawer.trendEmpty}
          baseLabel={MARKET_COPY.drawer.listingLine}
          until={d.final?.at ?? null}
          height={big ? 260 : 200}
          dark={big}
          series={d.standings.map((s) => ({ id: s.teamId, label: s.ticker, ink: s.ink, points: d.trends.find((t) => t.teamId === s.teamId)?.points ?? [], mine: s.teamId === myTeamId }))}
        />
      </section>

      {!big && Object.keys(d.process).length > 0 && (
        <section>
          <h3 className="mk-h">{myTeamId ? C.myProcess : C.allProcess}</h3>
          {Object.entries(d.process).map(([teamId, steps]) => (
            <ProcessTeam key={teamId} name={d.standings.find((s) => s.teamId === teamId)?.startupName ?? ''} steps={steps} showName={!myTeamId} />
          ))}
        </section>
      )}
      {!big && d.final && <p className="mini">{C.encouragement}</p>}
    </div>
  );
}

function ProcessTeam({ name, steps, showName }: { name: string; steps: ProcessStepView[]; showName: boolean }) {
  return (
    <div className="mk-proc">
      {showName && <h4>{name}</h4>}
      {steps.map((s) => (
        <details key={s.stepId}>
          <summary>
            {processStepLabel(s.stepId)} — <b className="mono">{s.score}</b>{C.points}{s.changePct ? ` · ${formatPct(s.changePct)}` : ''}
          </summary>
          <ul>
            {s.components.map((c) => (
              <li key={c.key}>
                <span>{P.keyLabel[c.key] ?? c.key}{c.public ? '' : <span title={C.privateTitle} aria-label={C.privateTitle}> {C.privateMark}</span>}</span>
                <span className="mk-bar" aria-hidden="true"><i style={{ width: `${Math.round(c.value * 100)}%` }} /></span>
                <span className="mono mini">{Math.round(c.value * 100)} · {c.fact}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
