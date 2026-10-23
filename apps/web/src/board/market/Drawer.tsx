/**
 * 공개 서랍(설계 §5.3 '누르기') — 주가 · 등락 · 투자의견 · 추세선 · 시가총액 순위 · 프로그램 코드 · 표적 · 질환 · 단계 진행 칸 ·
 * 기록(특허 · 통과 · 보류 · 허가 수) · 최근 공개 소식 8건 · 공개 범위 안내. 다른 모둠이 보는 것과 같은 정보(우리 모둠도).
 * 그 모둠의 새 소식이 오면 다시 읽는다. Esc · 바깥 누르기로 닫는다.
 */
import { useEffect, useRef } from 'react';
import {
  formatCapM,
  formatPct,
  formatPrice,
  MARKET_API,
  MARKET_COPY,
  RATING_TEXT,
  STEP_META,
  type MarketDrawerResponse,
} from '@crista-web/web-contract';
import { ink } from '../../ink.ts';
import { STATE_MARK, STATE_WORD, useLive } from '../ui/index.ts';
import { openDrawer, openFinal, useMarket } from './store.ts';
import { TrendChart } from './Trend.tsx';

const C = MARKET_COPY.drawer;

export function MarketDrawer({ classId }: { classId?: string }) {
  const { drawer, data: board } = useMarket(classId, classId ? 20 : undefined);
  const live = useLive<MarketDrawerResponse>(drawer ? MARKET_API.drawer(drawer, classId) : null, (m) => m.type === 'board.event' && m.event.teamId === drawer);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openDrawer(null);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [drawer]);

  if (!drawer) return null;
  const d = live.data;
  const mine = board?.myTeamId === drawer;
  return (
    <div className="modal-back mk-back" onClick={(e) => e.target === e.currentTarget && openDrawer(null)}>
      <aside className="mk-drawer" role="dialog" aria-modal="true" aria-labelledby="mk-d-h">
        <button ref={close} type="button" className="close" aria-label={C.close} onClick={() => openDrawer(null)}>×</button>
        {!d ? (
          <p className="mini muted" id="mk-d-h">{live.error ? live.error.message : MARKET_COPY.board.loading}</p>
        ) : (
          <>
            <header className="mk-d-head">
              <i className="inkd" style={{ background: ink(d.team.ink).base }} aria-hidden="true" />
              <div>
                <h2 id="mk-d-h">{C.title(d.team.startupName)}{mine ? C.mine : ''}</h2>
                <p className="mini muted"><span className="mono">{d.team.ticker}</span>{d.team.slogan ? ` · ${d.team.slogan}` : ''}</p>
              </div>
            </header>

            <dl className="mk-kv">
              <div><dt>{C.cap}</dt><dd className="mono">{formatCapM(d.priceUsd)}</dd></div>
              <div><dt>{C.price}</dt><dd className="mono">{formatPrice(d.priceUsd)}</dd></div>
              <div><dt>{C.change24h}</dt><dd className={`mono ${d.change24hPct < 0 ? 'dn' : d.change24hPct > 0 ? 'up' : ''}`}>{formatPct(d.change24hPct)}</dd></div>
              <div><dt>{C.rating}</dt><dd className="mono">{RATING_TEXT[d.rating]}</dd></div>
              <div><dt>{C.rank}</dt><dd className="mono">{d.rank} / {d.listed}{d.final ? ` · ${C.final(d.final.rank)}` : ''}</dd></div>
            </dl>

            <section aria-label={C.trend}>
              <h3 className="mk-h">{C.trend}</h3>
              <TrendChart label={C.trendAria(d.team.startupName)} empty={C.trendEmpty} baseLabel={C.listingLine} series={[{ id: d.team.id, label: d.team.ticker, ink: d.team.ink, points: d.trend }]} height={140} />
            </section>

            <dl className="mk-kv three">
              <div><dt>{C.program}</dt><dd className="mono">{d.programCode ?? C.none}</dd></div>
              <div><dt>{C.target}</dt><dd>{d.targetLabel ?? C.none}</dd></div>
              <div><dt>{C.disease}</dt><dd>{d.diseaseLabel ?? C.none}</dd></div>
            </dl>

            <section>
              <h3 className="mk-h">{C.steps}</h3>
              <ol className="mk-steps">
                {d.steps.map((s) => (
                  <li key={s.id} data-state={s.state} title={`${s.id} ${STEP_META[s.id].title} · ${STATE_WORD[s.state]}`}>
                    <span className="mono">{s.id}</span>
                    <span aria-label={STATE_WORD[s.state]}>{STATE_MARK[s.state] || '·'}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="mk-h">{C.records}</h3>
              <ul className="mk-rec">
                <li><b className="mono">{d.records.patents}</b> {C.patents}</li>
                <li><b className="mono">{d.records.passes}</b> {C.passes}</li>
                <li><b className="mono">{d.records.holds}</b> {C.holds}</li>
                <li><b className="mono">{d.records.approvals}</b> {C.approvals}</li>
              </ul>
            </section>

            <section>
              <h3 className="mk-h">{C.recent}</h3>
              {d.recent.length === 0 ? <p className="mini muted">{C.none}</p> : (
                <ul className="mk-news">
                  {d.recent.map((e) => (
                    <li key={e.id} className={e.tone === 'bad' || (e.changePct ?? 0) < 0 ? 'bad' : e.tone === 'rank' ? 'rank' : ''}>
                      <span>{e.headline}{e.aiHeadline && <sup className="mk-ai" title={MARKET_COPY.board.aiTitle} aria-label={MARKET_COPY.board.aiLabel}>{MARKET_COPY.board.aiTag}</sup>}</span>
                      {e.changePct !== null && e.changePct !== 0 && <b className="mono">{formatPct(e.changePct)}</b>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="mk-scope">{C.scope}</p>
            {board?.final && <button type="button" className="btn sm" onClick={() => openFinal(true)}>{C.openFinal}</button>}
          </>
        )}
      </aside>
    </div>
  );
}
