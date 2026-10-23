/**
 * 전광판 01 — LED 흐르는 띠(설계 §5.3 · 시안 design/pipeline-board-30-variants.html 01). 자리: 위 띠 아래 전체 폭.
 *
 * - 최근 소식 10건(`GET /api/market/board`) — `◆ {티커} {헤드라인} {▲/▼ x.x%}`. 3px 점 가면 Mono 22px, 기본 호박색 · 악재 빨강 · 순위 변동 초록.
 *   색만으로 말하지 않는다: ▲ ▼ 기호 · 화면 낭독기 글. 다듬은 헤드라인의 'AI' 꼬리표는 2026-10-24 사용자 지시로 뺐다.
 * - 40초에 한 바퀴 — 두 벌을 이어 끊김 없이(두 번째 벌은 `inert` · `aria-hidden`). 마우스 · 초점이 가면 멈춤, [멈추기 / 다시 흐르기] · ● LIVE.
 * - 모션 줄이기면 흐르지 않고 가로로 넘기는 목록(styles.css).
 * - 항목을 누르면 그 모둠 공개 서랍. 새 소식은 띠와 따로 `aria-live="polite"` 한 줄.
 * - `big` = 교사 프로젝터 보기(큰 글자). 서랍 · 최종 순위 창은 여기서 한 번만 띄운다(위 띠 순위 단추와 같은 창).
 */
import { useMemo, useState } from 'react';
import { formatPct, MARKET_COPY, PROJECTOR_RECENT, type BoardEventView, type BoardResponse } from '@crista-web/web-contract';
import { MarketDrawer } from './Drawer.tsx';
import { FinalStandings } from './FinalStandings.tsx';
import { openDrawer, useMarket } from './store.ts';
import './market.css';

const C = MARKET_COPY.board;

export interface LedItem {
  id: string;
  text: string;
  /** 'g' = 순위 변동(초록), 'r' = 악재(빨강), 없으면 호박색. */
  tone?: 'g' | 'r';
  teamId: string | null;
  pct: string;
}

/** 소식 한 줄 → 띠 글(헤드라인이 이미 '◆ 티커'로 시작한다). */
export function ledItem(e: BoardEventView): LedItem {
  const bad = e.tone === 'bad' || (e.changePct !== null && e.changePct < 0);
  return {
    id: String(e.id),
    text: e.headline,
    ...(e.tone === 'rank' ? { tone: 'g' as const } : bad ? { tone: 'r' as const } : {}),
    teamId: e.teamId,
    pct: e.changePct !== null && e.changePct !== 0 ? formatPct(e.changePct) : '',
  };
}

export function LedBand({ board, classId, big }: { board?: BoardResponse; classId?: string; big?: boolean }) {
  const market = useMarket(classId, classId ? PROJECTOR_RECENT : undefined);
  const [paused, setPaused] = useState(false);
  const data = market.data;
  const items = useMemo<LedItem[]>(() => {
    if (data?.events.length) return data.events.map(ledItem);
    // 처음 읽기 전 · 소식이 없을 때 — 등기한 모둠이 있으면 그 줄(W3 그대로), 없으면 안내.
    const regs = (board?.teams ?? []).filter((t) => t.startupName && t.ticker);
    if (regs.length) return regs.map((t) => ({ id: `reg-${t.id}`, text: MARKET_COPY.listing(t.ticker!, t.startupName!), teamId: t.id, ai: false, pct: '' }));
    return [{ id: 'none', text: C.empty, teamId: null, ai: false, pct: '' }];
  }, [data, board?.teams]);
  const latest = data?.events.find((e) => e.id === market.latestId);

  return (
    <>
      <div className={`board${paused ? ' paused' : ''}${big ? ' big' : ''}`} aria-label={C.label}>
        <div className="bd-in">
          <div className="mq">
            <div className="mq-track">
              {[0, 1].map((k) => (
                <span key={k} className="mq-seg" aria-hidden={k === 1 ? true : undefined} {...(k === 1 ? { inert: true } : {})}>
                  {items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`led-i${n.tone ? ` ${n.tone}` : ''}`}
                      disabled={!n.teamId}
                      onClick={() => n.teamId && openDrawer(n.teamId)}
                    >
                      <span className="led">{n.text}{n.pct ? `  ${n.pct}` : ''}</span>
                    </button>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bd-ctl">
          <span className="live" aria-hidden="true"><i />{data?.final ? C.finalTag : paused ? C.paused : C.live}</span>
          <button type="button" className="tool" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? C.resume : C.pause}</button>
        </div>
      </div>
      <p className="sr" aria-live="polite">{latest ? C.newsAria(`${latest.headline}${latest.changePct ? ` ${formatPct(latest.changePct)}` : ''}`) : ''}</p>
      {!big && <MarketDrawer classId={classId} />}
      {!big && <FinalStandings classId={classId} />}
    </>
  );
}

/** 사옥 지구 광장 LED 기둥 한 줄(설계 §4.1) — 최근 소식을 띠처럼 이어 쓴다. 소식이 없으면 null(지구가 등기 소식을 쓴다). */
export function plazaText(data: { events: BoardEventView[] } | null): string | null {
  if (!data?.events.length) return null;
  return data.events
    .slice(0, 8)
    .map((e) => `${e.headline}${e.changePct ? ` ${formatPct(e.changePct)}` : ''}`)
    .join('     ');
}
