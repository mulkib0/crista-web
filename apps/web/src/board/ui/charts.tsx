/**
 * 작은 그래프 도우미 — 1.2(깔때기 막대 · 220종 분포) · 2.1(ΔG 막대) 등이 함께 쓴다. 바깥 라이브러리 없이 SVG · HTML 만.
 *
 * - 한 계열만 그린다(잉크 한 색). 강조 막대는 박막 + 잉크 테두리, 표시선은 잉크 실선 · 점선 — 색만이 아니라 선 모양 · 글로 구분.
 * - 막대 끝은 4px 둥글게, 막대 사이 2px 틈. 값은 글로 같이 쓴다(색에 기대지 않는다). 마우스를 올리면 `<title>` 로 값.
 * - 그림마다 `label`(화면 낭독기 제목)을 받는다. 자세한 수는 옆의 표나 글로 함께 보여 준다.
 */

export interface BarRow {
  label: string;
  value: number;
  /** 글로 보일 값(기본 value). */
  text?: string;
  /** 'hi' = 강조(박막), 'dim' = 흐리게(빠진 양 · 참고). */
  tone?: 'hi' | 'dim';
  /** 막대 아래 작은 줄. */
  note?: string;
}

/** 가로 막대 — 깔때기 남은 수 · 관문별 통과 · 비교. `max` 를 주지 않으면 가장 큰 값. */
export function HBars({ rows, max, label, labelWidth = 128 }: { rows: BarRow[]; max?: number; label: string; labelWidth?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="hbars" role="list" aria-label={label} style={{ ['--hb-l' as string]: `${labelWidth}px` }}>
      {rows.map((r) => (
        <div key={r.label} className={`hb-r${r.tone ? ` ${r.tone}` : ''}`} role="listitem" title={`${r.label} ${r.text ?? r.value}`}>
          <span className="hb-l">{r.label}</span>
          <span className="hb-b" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(1, Math.abs(r.value) / top)) * 100}%` }} /></span>
          <b className="hb-v">{r.text ?? r.value}</b>
          {r.note && <span className="hb-n">{r.note}</span>}
        </div>
      ))}
    </div>
  );
}

export interface HistMark {
  x: number;
  label: string;
  /** 'line' = 실선(내 값 · 기준), 'dash' = 점선(실제 약 · 조언값), 'flag' = 작은 깃발(모둠원 제안). */
  kind?: 'line' | 'dash' | 'flag';
}

/**
 * 분포 히스토그램 — 220종 지표 분포 위에 내 기준 · 실제 약 · 모둠원 제안을 겹친다(설계 §5.5 ②).
 * `cutoff` 를 주면 걸러지는 쪽 막대를 흐리게(dir 'max' = 값 ≤ cutoff 가 남음, 'min' = 값 ≥ cutoff 가 남음).
 */
export function Histogram({ values, domain, bins = 24, marks = [], cutoff, label, unit = '', width = 480, height = 150 }: {
  values: number[];
  domain?: [number, number];
  bins?: number;
  marks?: HistMark[];
  cutoff?: { value: number; dir: 'max' | 'min' } | null;
  label: string;
  unit?: string;
  width?: number;
  height?: number;
}) {
  const lo = domain?.[0] ?? Math.min(...values);
  const hi = domain?.[1] ?? Math.max(...values);
  const span = hi - lo || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / span) * bins)));
    counts[i]! += 1;
  }
  const top = Math.max(1, ...counts);
  const pad = { l: 4, r: 4, t: 18, b: 20 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const bw = w / bins;
  const sx = (x: number) => pad.l + ((x - lo) / span) * w;
  const kept = (i: number) => {
    if (!cutoff) return true;
    const mid = lo + ((i + 0.5) / bins) * span;
    return cutoff.dir === 'max' ? mid <= cutoff.value : mid >= cutoff.value;
  };
  const left = cutoff ? values.filter((v) => (cutoff.dir === 'max' ? v <= cutoff.value : v >= cutoff.value)).length : values.length;
  return (
    <figure className="hist">
      <svg className="hist-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} — ${values.length}개 중 ${left}개가 남아요`}>
        {counts.map((c, i) => {
          const bh = (c / top) * h;
          const x = pad.l + i * bw + 1;
          return (
            <rect key={i} x={x} y={pad.t + h - bh} width={Math.max(1, bw - 2)} height={bh} rx={Math.min(4, bw / 2 - 1)} className={kept(i) ? 'hist-b' : 'hist-b off'}>
              <title>{`${(lo + (i / bins) * span).toFixed(1)}~${(lo + ((i + 1) / bins) * span).toFixed(1)}${unit} · ${c}개`}</title>
            </rect>
          );
        })}
        <line x1={pad.l} x2={pad.l + w} y1={pad.t + h + 0.5} y2={pad.t + h + 0.5} className="hist-axis" />
        <text x={pad.l} y={height - 4} className="hist-t">{lo}{unit}</text>
        <text x={pad.l + w} y={height - 4} className="hist-t" textAnchor="end">{hi}{unit}</text>
        {marks.map((m) => {
          const x = sx(Math.min(hi, Math.max(lo, m.x)));
          return (
            <g key={`${m.label}-${m.x}`} className={`hist-m ${m.kind ?? 'line'}`}>
              <line x1={x} x2={x} y1={pad.t - 4} y2={pad.t + h} />
              {m.kind === 'flag' ? <path d={`M${x} ${pad.t - 4} l8 3 -8 3z`} /> : null}
              <text x={x + 4} y={pad.t - 6} className="hist-t">{m.label}</text>
              <title>{`${m.label} ${m.x}${unit}`}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="mini muted">{label} · {values.length}개 중 <b>{left}</b>개 남음</figcaption>
    </figure>
  );
}
