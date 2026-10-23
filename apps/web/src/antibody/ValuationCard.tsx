/**
 * 기업가치 카드(설계 §6.3 A6) — 기업가치 · 직전 대비 변동 · 학급 순위 · 마지막 계기.
 * 학생에게 보이는 말은 **기업가치 · 기업가치 순위**예요 — '시가총액'은 쓰지 않아요(§11.4.2 용어집).
 * 두 랩이 **한 회사 · 하나의 펀더멘털**을 쓰므로 금액 · 상장가 · 주식수는 `market.ts` 의 공용 값을 그대로 써요(§11.3).
 * 학급 상대 순위는 **숫자 없이 위 · 아래만** 보여요(§4.5) — 다른 모둠 점수를 싣지 않아요.
 */
import { formatCentsAsCrista, formatPrice, type AntibodyValuationView } from '@crista-web/web-contract';
import { Panel } from '../board/ui/index.ts';

export function ValuationCard({ valuation, classRank }: { valuation: AntibodyValuationView; classRank?: { rank: number; of: number } }) {
  const up = valuation.changePct > 0;
  const flat = valuation.changePct === 0;
  return (
    <Panel title="기업가치" sub={`상장가 ${formatPrice(valuation.fundamentalUsd)}`}>
      <div className="ab-val">
        <b className="ab-val-n">{formatCentsAsCrista(valuation.marketCapCents, { unit: true })}</b>
        <span className={`sig ${flat ? 'w' : up ? 'g' : 'b'}`}>
          <span aria-hidden="true">{flat ? '―' : up ? '▲' : '▼'}</span> 직전 대비 {valuation.changePct > 0 ? '+' : ''}{valuation.changePct.toFixed(1)}%
        </span>
      </div>
      <dl className="ab-kv" style={{ marginTop: 10 }}>
        <div>
          <dt>한 주 값</dt>
          <dd>{formatPrice(valuation.priceUsd)}</dd>
        </div>
        <div>
          <dt>기업가치 순위</dt>
          <dd>{valuation.rankMarketCap} / {valuation.of}</dd>
        </div>
        {classRank && (
          <div>
            <dt>학급 설계 순위</dt>
            <dd>
              {classRank.rank === 1 ? '맨 앞' : `위로 ${classRank.rank - 1}모둠`}
              <small> · {classRank.rank === classRank.of ? '맨 뒤' : `아래로 ${classRank.of - classRank.rank}모둠`}</small>
            </dd>
          </div>
        )}
      </dl>
      {valuation.lastEvent && (
        <p className="mini" style={{ marginTop: 8 }}>
          마지막 계기 · {valuation.lastEvent.headline}
          {valuation.lastEvent.changePct !== undefined ? ` (${valuation.lastEvent.changePct > 0 ? '+' : ''}${valuation.lastEvent.changePct}%)` : ''}
        </p>
      )}
      <p className="mini muted" style={{ margin: '6px 0 0' }}>다른 모둠의 점수 숫자는 보이지 않아요 — 우리보다 앞인지 뒤인지만 알려 줘요.</p>
    </Panel>
  );
}
