/**
 * 위 띠 시가총액 순위 단추(설계 §5.2) — `시가총액 순위 N위 · 5,212만 크리스타`, 누르면 **우리 모둠** 공개 서랍(다른 모둠이 보는 것과 같은 정보).
 * 마감한 학급이면 `최종 순위 N위` — 누르면 최종 순위 창(시상대 · 모둠별 과정/결과 · 추세).
 * 값은 LED 띠와 같은 한 벌(`store.ts`) — 소식이 오면 같이 바뀐다.
 */
import { formatCapM, LISTING_PRICE_USD, MARKET_COPY, type BoardResponse } from '@crista-web/web-contract';
import { openDrawer, openFinal, useMarket } from './store.ts';

const C = MARKET_COPY.rank;

export function RankButton({ board }: { board: BoardResponse }) {
  const { data } = useMarket();
  const mine = data?.ranking.find((r) => r.teamId === board.team.id);
  const listed = data?.ranking.length ?? board.teams.filter((t) => t.startupName).length;
  const cap = formatCapM(mine?.priceUsd ?? LISTING_PRICE_USD);
  const final = data?.final ?? null;
  return (
    <button
      type="button"
      className={`tb-btn rank${final ? ' final' : ''}`}
      title={final ? C.finalTitle : C.title}
      onClick={() => (final ? openFinal(true) : openDrawer(board.team.id))}
      aria-haspopup="dialog"
    >
      <span className="tb-k">{final ? C.finalLabel : C.label}</span>
      <b className="mono">{C.value(mine?.rank ?? null, listed, cap)}</b>
    </button>
  );
}
