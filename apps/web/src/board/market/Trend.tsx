/**
 * 기업가치 추세선 — SVG 직접(새 라이브러리 없이). 한 모둠(공개 서랍) · 여러 모둠(최종 순위).
 * 색만으로 가르지 않는다: 선 끝에 티커 글자 · 모둠마다 다른 점선 꼴 · 상장가 기준선은 회색 점선 + 글. 표(값)는 옆에 따로 둔다.
 */
import { formatPrice, LISTING_PRICE_USD, type TrendPoint } from '@crista-web/web-contract';
import { ink } from '../../ink.ts';

export interface TrendSeries {
  id: string;
  label: string;
  ink: number;
  points: TrendPoint[];
  mine?: boolean;
}

const DASHES = ['', '6 3', '2 3', '8 3 2 3', '1 2', '10 4', '4 2 1 2', '3 5'];

export function TrendChart({ series, label, height = 160, until, empty, baseLabel, dark }: { series: TrendSeries[]; label: string; height?: number; until?: string | null; empty: string; baseLabel: string; dark?: boolean }) {
  const W = 560;
  const H = height;
  const pad = { l: 46, r: 58, t: 12, b: 22 };
  const all = series.flatMap((s) => s.points);
  if (!all.length) return <p className="mini muted">{label} — {empty}</p>;
  const ts = all.map((p) => Date.parse(p.t));
  const t0 = Math.min(...ts);
  const t1 = Math.max(until ? Date.parse(until) : 0, ...ts, t0 + 60_000);
  const ps = [...all.map((p) => p.p), LISTING_PRICE_USD];
  let lo = Math.min(...ps);
  let hi = Math.max(...ps);
  const span = Math.max(0.4, hi - lo);
  lo -= span * 0.12;
  hi += span * 0.12;
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - (p - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const fmtT = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  // 선 끝 티커 글자가 겹치지 않게 아래로 11px 씩 민다.
  const ends = series
    .map((s) => ({ id: s.id, y: y((s.points[s.points.length - 1] ?? { p: LISTING_PRICE_USD }).p) }))
    .sort((a, b) => a.y - b.y);
  const labelY = new Map<string, number>();
  let prev = -Infinity;
  for (const e of ends) {
    const v = Math.max(e.y, prev + 11);
    labelY.set(e.id, v);
    prev = v;
  }

  return (
    <figure className="mk-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <title>{label}</title>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="mk-grid" />
            <text x={pad.l - 6} y={y(v) + 3} className="mk-axis" textAnchor="end">{formatPrice(v, { unit: false })}</text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(LISTING_PRICE_USD)} y2={y(LISTING_PRICE_USD)} className="mk-base" />
        <text x={W - pad.r + 4} y={y(LISTING_PRICE_USD) + 3} className="mk-axis">{baseLabel}</text>
        <text x={pad.l} y={H - 6} className="mk-axis">{fmtT(t0)}</text>
        <text x={W - pad.r} y={H - 6} className="mk-axis" textAnchor="end">{fmtT(t1)}</text>
        {series.map((s, i) => {
          const pts = s.points.length ? s.points : [{ t: new Date(t0).toISOString(), p: LISTING_PRICE_USD }];
          // 계단꼴 — 소식이 올 때만 값이 바뀐다(그 사이는 그대로).
          let d = '';
          pts.forEach((p, k) => {
            const px = x(Date.parse(p.t));
            const py = y(p.p);
            d += k === 0 ? `M${px},${py}` : `H${px}V${py}`;
          });
          const last = pts[pts.length - 1]!;
          d += `H${x(t1)}`;
          // 검은 바탕(프로젝터)에서는 LED 띠용 짝 색 — 어두운 잉크가 바탕에 묻히지 않게.
          const color = dark ? ink(s.ink).led : ink(s.ink).base;
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={color} strokeWidth={s.mine ? 3 : 2} strokeDasharray={series.length > 1 ? DASHES[i % DASHES.length] : ''} vectorEffect="non-scaling-stroke" />
              <circle cx={x(t1)} cy={y(last.p)} r={3.5} fill={color} />
              <text x={x(t1) + 6} y={(labelY.get(s.id) ?? y(last.p)) + 4} className={`mk-end${s.mine ? ' mine' : ''}`}>{s.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
