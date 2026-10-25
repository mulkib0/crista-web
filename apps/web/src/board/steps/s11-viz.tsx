/**
 * 1.1 내 작업대 그림 5종(설계 §5.4.2) — 시안 design/target-select-10.js 의 heatSVG(1.01) · netSVG(1.04) · stackSVG(1.03) · scatterSVG(1.09) · cardHTML(1.10)을 옮겼다.
 * 바깥 라이브러리 없이 SVG 만. 상태는 색만으로 말하지 않는다 — 준비 상태는 ✓ · △ · ✗ 기호와 네모 · 세모 · 점선 원 · ◆ 모양을 같이 쓴다.
 * 그림 속 누를 수 있는 줄 · 점은 `role="button"` + Enter · Space 로도 고른다.
 */
import type { KeyboardEvent, ReactNode } from 'react';
import {
  myTargetScore,
  TARGET_EVIDENCE,
  TARGET_REDOCK,
  TARGET_TIER,
  targetKoName,
  targetTier,
  type DiseaseOption,
  type TargetRow,
  type TargetTier,
} from '@crista-web/web-contract';

/** 그림이 쓰는 질환 하나 — 워커 30개 중 표적 8개(`targetShortlist`) + 색 · 질환군. */
export interface DData {
  id: string;
  option: DiseaseOption;
  name: string;
  short: string;
  blurb: string | null;
  assoc: number;
  list: TargetRow[];
  /** 0~3 — 색 `--d1~--d4` · 질환군 Ⅰ~Ⅳ. */
  idx: number;
  group: number;
  color: string;
}
export interface TRow {
  t: TargetRow;
  d: DData;
}
/** 모둠원 깃발 — 올린 추천 카드 자리. */
export interface Flag {
  diseaseId: string;
  symbol: string;
  initial: string;
  name: string;
}

export const EV_COLOR = ['var(--e1)', 'var(--e2)', 'var(--e3)', 'var(--e4)'];
export const f2 = (v: number) => v.toFixed(2);
export const f3 = (v: number) => v.toFixed(3);
export const n0 = (v: number) => v.toLocaleString('ko-KR');
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export const rankIn = (d: DData, t: TargetRow) => d.list.indexOf(t) + 1;
/** 그 질환에서 2.1 도킹으로 갈 수 있는 표적들(결정구조 + 기준 약 + 재도킹 검증) — 질환마다 여럿일 수 있다. */
export const readyList = (d: DData) => d.list.filter((t) => t.dockingTargetId);
/** 안내 문구에 쓰는 기호 줄 — 예: `EGFR · ALK · ERBB2`. */
export const readyNames = (d: DData) => readyList(d).map((t) => t.symbol).join(' · ');

const press = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

function T({ x, y, a, cls, fs = 12.5, w, fill, op, children }: { x: number; y: number; a?: 'start' | 'middle' | 'end'; cls?: string; fs?: number; w?: number; fill?: string; op?: number; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor={a} className={cls} style={{ fontSize: fs, fontWeight: w, fill, opacity: op }}>
      {children}
    </text>
  );
}

function Svg({ w, h, label, children, wide }: { w: number; h: number; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`s11-sx${wide ? ' wide' : ''}`}>
      <svg className="s11-vz" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        {children}
      </svg>
    </div>
  );
}

function TierChip({ x, y, w, tier, short }: { x: number; y: number; w: number; tier: TargetTier; short?: boolean }) {
  const k = TARGET_TIER[tier];
  return (
    <>
      <rect x={x} y={y} width={w} height={22} rx={11} fill={`var(--${k.tone}-bg)`} stroke={`var(--${k.tone})`} strokeWidth={1} />
      <T x={x + w / 2} y={y + 15.5} a="middle" fs={12} w={600} fill={`var(--${k.tone})`}>{`${k.mark} ${short ? k.label.replace('도킹 ', '') : k.label}`}</T>
    </>
  );
}

/** 근거 막대 4종(정보판 · 카드 앞면). */
export function EvBars({ t }: { t: TargetRow }) {
  return (
    <div className="s11-ev">
      {TARGET_EVIDENCE.map((e, k) => (
        <span key={e.key}>
          {e.label}
          <i><b style={{ width: `${(t[e.key] * 100).toFixed(1)}%`, background: EV_COLOR[k] }} /></i>
          <em>{f2(t[e.key])}</em>
        </span>
      ))}
    </div>
  );
}

/** 준비 상태 알약(✓ · △ · ✗ + 글). */
export function TierSig({ t, pdb }: { t: TargetRow; pdb?: boolean }) {
  const k = TARGET_TIER[targetTier(t)];
  return <span className={`s11-sig ${k.tone}`}>{k.mark} {k.label}{pdb && t.pdbId ? ` · PDB ${t.pdbId}` : ''}</span>;
}

// ── 1.01 근거 열지도 — 질환 하나의 표적 8개 ──

export function HeatMap({ d, sel, onPick }: { d: DData; sel: string | null; onPick: (symbol: string) => void }) {
  const W = 760, top = 58, rh = 40, H = top + d.list.length * rh + 22;
  const cx = (k: number) => 150 + k * 64, cw = 58, bx = 414, bw = 110, px = 600, chx = 640;
  return (
    <Svg w={W} h={H} label={`${d.name} 표적 ${d.list.length}개의 근거 4종 열지도`}>
      {TARGET_EVIDENCE.map((e, k) => (
        <g key={e.key}>
          <T x={cx(k) + cw / 2} y={24} a="middle" w={700} fs={13}>{e.label}</T>
          <T x={cx(k) + cw / 2} y={42} a="middle" cls="t-mu" fs={11}>{e.head}</T>
        </g>
      ))}
      <T x={bx} y={24} w={700} fs={13}>종합 점수</T>
      <T x={bx} y={42} cls="t-mu" fs={11}>근거를 합친 값</T>
      <T x={px} y={24} a="middle" w={700} fs={13}>결정구조</T>
      <T x={px} y={42} a="middle" cls="t-mu" fs={11}>PDB 번호</T>
      <T x={chx + 50} y={24} a="middle" w={700} fs={13}>다음 단계</T>
      <T x={chx + 50} y={42} a="middle" cls="t-mu" fs={11}>2.1 도킹</T>
      {d.list.map((t, i) => {
        const y = top + i * rh, tier = targetTier(t), on = sel === t.symbol;
        return (
          <g key={t.symbol} className="hr" role="button" tabIndex={0} aria-pressed={on} aria-label={`${t.symbol} ${targetKoName(t)} 종합 ${f3(t.overallScore)} ${TARGET_TIER[tier].label}`}
            onClick={() => onPick(t.symbol)} onKeyDown={press(() => onPick(t.symbol))}>
            <rect className="bg" x={0} y={y} width={W} height={rh} rx={8} fill={tier === 'ready' ? 'var(--hi)' : 'transparent'} fillOpacity={tier === 'ready' ? 0.45 : 1} />
            <rect className="fo" x={1} y={y + 1} width={W - 2} height={rh - 2} rx={8} fill="none" stroke={on ? 'var(--fg)' : 'transparent'} strokeWidth={2} />
            <line x1={8} x2={W - 8} y1={y + rh} y2={y + rh} stroke="var(--line)" strokeWidth={1} />
            <T x={8} y={y + 17} cls="t-m t-mu" fs={11}>{i + 1}</T>
            <T x={26} y={y + 17} cls="t-m" w={600} fs={13.5}>{t.symbol}</T>
            <T x={26} y={y + 33} cls="t-mu" fs={10.5}>{clip(targetKoName(t), 11)}</T>
            {TARGET_EVIDENCE.map((e, k) => {
              const v = t[e.key];
              return (
                <g key={e.key}>
                  <rect x={cx(k)} y={y + 4} width={cw} height={rh - 8} rx={5} fill={EV_COLOR[k]} fillOpacity={0.06 + 0.86 * v} stroke="var(--line)" strokeWidth={1} />
                  <T x={cx(k) + cw / 2} y={y + 25} a="middle" cls="t-m" fs={12} w={600} fill={v > 0.5 ? 'var(--surface)' : 'var(--fg)'}>{v === 0 ? '0' : f2(v)}</T>
                </g>
              );
            })}
            <rect x={bx} y={y + 13} width={bw} height={14} rx={7} fill="var(--raise)" />
            <rect x={bx} y={y + 13} width={t.overallScore * bw} height={14} rx={7} fill={tier === 'ready' ? 'var(--good)' : 'var(--fg)'} />
            <T x={bx + bw + 6} y={y + 25} cls="t-m" fs={12}>{f3(t.overallScore)}</T>
            <T x={px} y={y + 25} a="middle" cls="t-m" w={t.pdbId ? 600 : 400} fs={12.5}>{t.pdbId ?? '—'}</T>
            <TierChip x={chx} y={y + 9} w={100} tier={tier} short />
          </g>
        );
      })}
      <line x1={bx + bw * 0.5} x2={bx + bw * 0.5} y1={top} y2={top + d.list.length * rh} stroke="var(--line-strong)" strokeDasharray="3 3" strokeWidth={1} />
      <T x={bx + bw * 0.5} y={top + d.list.length * rh + 14} a="middle" cls="t-m t-mu" fs={11}>0.5</T>
    </Svg>
  );
}

// ── 1.04 질환-유전자 망 — 가운데 질환, 표적은 점수만큼 가깝게, 모양은 준비 상태 ──

const ANGS = [-100, 100, -42, 42, -142, 142, 180, 60];
/** 도킹 준비 표적 자리 — 오른쪽 가운데에서 위아래로 벌린다(여럿이어도 한 점에 겹치지 않게). */
const READY_ANGS = [0, -34, 34, -68, 68];
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

export function NetMap({ d, sel, onPick, size, flags }: { d: DData; sel: string | null; onPick: (symbol: string) => void; size?: 'sm'; flags?: Flag[] }) {
  const sm = size === 'sm', W = sm ? 320 : 760, H = sm ? 290 : 540, cx = W / 2, cy = sm ? 145 : 270, k = sm ? 0.42 : 1;
  const R = (s: number) => (60 + (0.92 - s) * 720) * k;
  let ang = 0;
  let rdy = 0;
  const pts = d.list.map((t) => {
    const deg = t.dockingTargetId ? (READY_ANGS[rdy++ % READY_ANGS.length] ?? 0) : (ANGS[ang++ % ANGS.length] ?? 0);
    const a = (deg * Math.PI) / 180, r = R(t.overallScore);
    return { t, a, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const dots: Array<{ x: number; y: number }> = [];
  if (!sm) {
    const rd = rng(11 + d.idx), nd = Math.round((d.assoc - d.list.length) / 50);
    for (let guard = 0; dots.length < nd && guard < 20000; guard++) {
      const x = 6 + rd() * (W - 12), y = 6 + rd() * (H - 12);
      if (Math.hypot(x - cx, y - cy) >= 300) dots.push({ x, y });
    }
  }
  const cr = sm ? 24 : 52;
  return (
    <Svg w={W} h={H} label={`${d.name} — 연관 표적 관계망`} wide={!sm}>
      {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2} fill="var(--muted)" fillOpacity={0.35} />)}
      {!sm && [0.8, 0.7].map((s) => (
        <g key={s}>
          <circle cx={cx} cy={cy} r={R(s)} fill="none" stroke="var(--line-strong)" strokeDasharray="3 4" strokeWidth={1} />
          <T x={cx + 4} y={cy - R(s) - 4} cls="t-m t-mu" fs={11}>{`점수 ${s}`}</T>
        </g>
      ))}
      {pts.map((p) => {
        const rd = targetTier(p.t) === 'ready';
        return <line key={p.t.symbol} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={rd ? 'var(--good)' : 'var(--fg)'} strokeOpacity={rd ? 1 : 0.5} strokeWidth={Math.max(0.5, (1 + (p.t.overallScore - 0.6) * 18) * (sm ? 0.6 : 1))} />;
      })}
      <circle cx={cx} cy={cy} r={cr} fill="var(--fg)" />
      <T x={cx} y={cy + (sm ? 4 : -6)} a="middle" fs={sm ? 10 : 14} w={700} fill="var(--surface)">{d.short}</T>
      {!sm && <T x={cx} y={cy + 13} a="middle" cls="t-m" fs={11.5} fill="var(--hi)">{`연관 ${n0(d.assoc)}`}</T>}
      {pts.map((p) => {
        const tier = targetTier(p.t), s = sm ? 0.55 : 1, on = sel === p.t.symbol;
        const lx = p.x + Math.cos(p.a) * 30 * s, ly = p.y + Math.sin(p.a) * 30 * s + 4;
        const anc = Math.cos(p.a) > 0.3 ? 'start' : Math.cos(p.a) < -0.3 ? 'end' : 'middle';
        const dy = anc === 'middle' ? (Math.sin(p.a) < 0 ? 8 : -6) * s : 0;
        const mine = (flags ?? []).filter((f) => f.diseaseId === d.id && f.symbol === p.t.symbol);
        return (
          <g key={p.t.symbol}>
            <g className="nd" role="button" tabIndex={0} aria-pressed={on} aria-label={`${p.t.symbol} 종합 ${f3(p.t.overallScore)} ${TARGET_TIER[tier].label}`}
              onClick={() => onPick(p.t.symbol)} onKeyDown={press(() => onPick(p.t.symbol))}>
              {on && <circle cx={p.x} cy={p.y} r={22 * s} fill="none" stroke="var(--fg)" strokeWidth={2.5} />}
              {tier === 'ready' ? (
                <>
                  <rect x={p.x - 15 * s} y={p.y - 15 * s} width={30 * s} height={30 * s} rx={4 * s} fill="var(--good)" stroke="var(--fg)" strokeWidth={1.5} />
                  <T x={p.x} y={p.y + 5 * s} a="middle" fs={14 * s} w={700} fill="var(--surface)">✓</T>
                </>
              ) : tier === 'pdb' ? (
                <>
                  <rect x={p.x - 12 * s} y={p.y - 12 * s} width={24 * s} height={24 * s} rx={3 * s} fill="var(--surface)" stroke="var(--warn)" strokeWidth={2} />
                  <T x={p.x} y={p.y + 4 * s} a="middle" fs={11 * s} fill="var(--warn)">△</T>
                </>
              ) : (
                <>
                  <circle cx={p.x} cy={p.y} r={12 * s} fill="var(--surface)" stroke="var(--bad)" strokeWidth={2} strokeDasharray="3 2" />
                  <T x={p.x} y={p.y + 4 * s} a="middle" fs={11 * s} fill="var(--bad)">✗</T>
                </>
              )}
              <T x={lx} y={ly - dy} a={anc} cls="t-m" w={700} fs={sm ? 9.5 : 13}>{p.t.symbol}</T>
              {!sm && <T x={lx} y={ly + 14 - dy} a={anc} cls="t-m t-mu" fs={11}>{f2(p.t.overallScore)}</T>}
            </g>
            {mine.map((f, i) => {
              const fx = p.x + (sm ? 13 : 20) + i * (sm ? 12 : 16), fy = p.y - (sm ? 13 : 20);
              return (
                <g key={`${f.name}-${i}`} aria-hidden="true">
                  <circle cx={fx} cy={fy} r={sm ? 8 : 11} fill="var(--fg)" stroke="var(--surface)" strokeWidth={1.5} />
                  <T x={fx} y={fy + (sm ? 3 : 4)} a="middle" fs={sm ? 8.5 : 11} w={700} fill="var(--surface)">{f.initial}</T>
                  <title>{`${f.name} 님이 올린 표적`}</title>
                </g>
              );
            })}
          </g>
        );
      })}
    </Svg>
  );
}

// ── 1.03 내 점수 — 32표적을 가중치로 다시 줄 세운 누적 막대 ──

export function myRows(all: TRow[], w: readonly number[]) {
  const sw = w.reduce((a, x) => a + x, 0);
  return all
    .map((r) => ({ ...r, seg: TARGET_EVIDENCE.map((e, k) => (sw ? ((w[k] ?? 0) * r.t[e.key]) / sw : 0)), s: myTargetScore(r.t, w) }))
    .sort((a, b) => b.s - a.s);
}

export function StackBars({ all, w, sel, onPick, showAll }: { all: TRow[]; w: readonly number[]; sel: { diseaseId: string; symbol: string } | null; onPick: (r: TRow) => void; showAll: boolean }) {
  const W = 840, top = 34, rh = 30, bx = 236, bw = 420;
  if (!w.some((x) => x > 0)) {
    return <Svg w={W} h={90} label="가중치 없음"><T x={8} y={44} fs={14} w={600}>가중치를 하나 이상 올려 주세요.</T></Svg>;
  }
  const rows = myRows(all, w);
  const lim = showAll ? rows.length : Math.min(14, rows.length);
  // ◆ 도킹 준비된 표적은 상위 14 밖이어도 아래에 늘 보인다(점선 뒤).
  const shown = rows.slice(0, lim).map((r, i) => ({ r, i }));
  const extra = showAll ? [] : rows.map((r, i) => ({ r, i })).filter(({ r, i }) => i >= lim && r.t.dockingTargetId);
  const list = [...shown, ...extra];
  const gap = extra.length ? 14 : 0;
  const H = top + list.length * rh + gap + 22;
  const yOf = (n: number) => top + n * rh + (n >= shown.length ? gap : 0);
  return (
    <Svg w={W} h={H} label="가중치를 바꾼 내 표적 점수 누적 막대">
      <T x={8} y={20} cls="t-mu" fs={11.5}>내 순위</T>
      <T x={70} y={20} cls="t-mu" fs={11.5}>질환 · 표적</T>
      <T x={bx} y={20} cls="t-mu" fs={11.5}>내 점수 = 근거 × 가중치의 평균 (0 ~ 1)</T>
      <T x={bx + bw + 72} y={20} cls="t-mu" fs={11.5}>도킹</T>
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={bx + v * bw} x2={bx + v * bw} y1={top - 4} y2={H - 22} stroke="var(--line)" strokeWidth={1} />
          <T x={bx + v * bw} y={H - 8} a="middle" cls="t-m t-mu" fs={11}>{String(v)}</T>
        </g>
      ))}
      {extra.length > 0 && <line x1={8} x2={W - 8} y1={top + shown.length * rh + gap / 2} y2={top + shown.length * rh + gap / 2} stroke="var(--line-strong)" strokeDasharray="2 4" strokeWidth={1} />}
      {list.map(({ r, i }, n) => {
        const y = yOf(n), tier = targetTier(r.t), rd = tier === 'ready', on = sel?.symbol === r.t.symbol && sel.diseaseId === r.d.id;
        let x = bx;
        return (
          <g key={`${r.d.id}-${r.t.symbol}`} className="hr" role="button" tabIndex={0} aria-pressed={on} aria-label={`${r.t.symbol} ${r.d.name} 내 점수 ${f3(r.s)} ${i + 1}위`}
            onClick={() => onPick(r)} onKeyDown={press(() => onPick(r))}>
            <rect className="bg" x={0} y={y} width={W} height={rh} rx={7} fill={rd ? 'var(--hi)' : 'transparent'} fillOpacity={rd ? 0.45 : 1} />
            <rect className="fo" x={1} y={y + 1} width={W - 2} height={rh - 2} rx={7} fill="none" stroke={on ? 'var(--fg)' : 'transparent'} strokeWidth={2} />
            <T x={8} y={y + 20} cls="t-m" w={600} fs={12}>{`${i + 1}위`}</T>
            <circle cx={78} cy={y + 15} r={5} fill={r.d.color} />
            <T x={88} y={y + 19} fs={11.5} fill="var(--muted)">{r.d.short}</T>
            <T x={158} y={y + 20} cls="t-m" w={600} fs={12.5}>{r.t.symbol}</T>
            {r.seg.map((v, k) => {
              const ww = v * bw, x0 = x;
              x += ww;
              return (
                <g key={k}>
                  {ww > 0.2 && <rect x={x0} y={y + 6} width={ww} height={18} fill={EV_COLOR[k]} stroke="var(--surface)" strokeWidth={1} />}
                  {ww > 30 && <T x={x0 + ww / 2} y={y + 19} a="middle" fs={10.5} w={600} fill="var(--surface)">{TARGET_EVIDENCE[k]!.label}</T>}
                </g>
              );
            })}
            <T x={bx + bw + 10} y={y + 20} cls="t-m" fs={12} w={600}>{f3(r.s)}</T>
            <line x1={bx + r.t.overallScore * bw} x2={bx + r.t.overallScore * bw} y1={y + 3} y2={y + 27} stroke="var(--fg)" strokeWidth={2} />
            {rd ? (
              <>
                <path d={`M${bx + bw + 78} ${y + 7} l8 8 l-8 8 l-8 -8 Z`} fill="var(--good)" stroke="var(--fg)" strokeWidth={1.5} />
                <T x={bx + bw + 92} y={y + 19} fs={11} w={600} fill="var(--good)">준비됨</T>
              </>
            ) : (
              <T x={bx + bw + 78} y={y + 19} a="middle" fs={11} fill={`var(--${TARGET_TIER[tier].tone})`}>{TARGET_TIER[tier].mark}</T>
            )}
          </g>
        );
      })}
    </Svg>
  );
}

// ── 1.09 점수 × 약물 근거 — 32표적 산점도(축 끊김) ──

export function Scatter({ all, sel, onPick, onHover, dim, flags, compact }: {
  all: TRow[];
  sel: { diseaseId: string; symbol: string } | null;
  onPick?: (r: TRow) => void;
  onHover?: (label: string | null) => void;
  /** true 면 흐리게(필터에 안 맞음). */
  dim?: (r: TRow) => boolean;
  flags?: Flag[];
  compact?: boolean;
}) {
  const W = 800, H = compact ? 300 : 430, x0 = 70, x1 = 780;
  const sx = (v: number) => x0 + ((Math.min(0.92, Math.max(0.6, v)) - 0.6) / 0.32) * (x1 - x0);
  const lin = (dom: [number, number], rg: [number, number]) => (v: number) => rg[0] + ((v - dom[0]) / (dom[1] - dom[0])) * (rg[1] - rg[0]);
  const yu = lin([0.94, 1], [compact ? 170 : 262, 40]), yl = lin([0, 0.9], [compact ? 262 : 380, compact ? 200 : 290]), brk = compact ? 180 : 270;
  const sy = (v: number) => (v >= 0.94 ? yu(v) : yl(Math.min(0.9, v)));
  const pts = all.map((r) => ({ ...r, x: sx(r.t.overallScore), y: sy(r.t.drugScore), rd: !!r.t.dockingTargetId })).sort((a, b) => Number(a.rd) - Number(b.rd));
  const label = (p: (typeof pts)[number]) => `${p.t.symbol} · ${p.d.name} · 종합 ${f3(p.t.overallScore)} · 약물 ${f3(p.t.drugScore)}${p.rd ? ' · 도킹 준비됨' : ''}`;
  // 도킹 준비된 표적 이름 — 가까운 것끼리 한 상자로.
  const groups: Array<typeof pts> = [];
  for (const p of pts.filter((q) => q.rd).sort((a, b) => a.x - b.x)) {
    const g = groups[groups.length - 1];
    if (g && p.x - g[g.length - 1]!.x < 46) g.push(p);
    else groups.push([p]);
  }
  return (
    <Svg w={W} h={H} label="표적 32개의 점수와 약물 근거 산점도">
      <rect x={x0} y={yu(1)} width={x1 - x0} height={yu(0.99) - yu(1)} fill="var(--hi)" fillOpacity={0.35} />
      {[0.94, 0.96, 0.98, 1].map((v) => (
        <g key={`u${v}`}>
          <line x1={x0} x2={x1} y1={yu(v)} y2={yu(v)} stroke="var(--line)" strokeWidth={1} />
          <T x={x0 - 6} y={yu(v) + 4} a="end" cls="t-m t-mu" fs={11}>{v.toFixed(2)}</T>
        </g>
      ))}
      {[0, 0.3, 0.6, 0.9].map((v) => (
        <g key={`l${v}`}>
          <line x1={x0} x2={x1} y1={yl(v)} y2={yl(v)} stroke="var(--line)" strokeWidth={1} />
          {v < 0.9 && <T x={x0 - 6} y={yl(v) + 4} a="end" cls="t-m t-mu" fs={11}>{v.toFixed(1)}</T>}
        </g>
      ))}
      <rect x={x0 - 4} y={brk} width={x1 - x0 + 8} height={14} fill="var(--surface)" />
      <path d={`M${x0 - 10} ${brk + 4} l8 -5 M${x0 - 10} ${brk + 12} l8 -5`} stroke="var(--fg)" strokeWidth={1.5} fill="none" />
      {[0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9].map((v) => (
        <g key={`x${v}`}>
          <line x1={sx(v)} x2={sx(v)} y1={yl(0)} y2={yl(0) + 5} stroke="var(--fg)" strokeWidth={1} />
          <T x={sx(v)} y={yl(0) + 18} a="middle" cls="t-m t-mu" fs={11}>{v.toFixed(2)}</T>
        </g>
      ))}
      <line x1={x0} x2={x1} y1={yl(0)} y2={yl(0)} stroke="var(--fg)" strokeWidth={1} />
      <T x={(x0 + x1) / 2} y={H - 6} a="middle" cls="t-mu" fs={11.5}>종합 점수(Open Targets) →</T>
      <T x={12} y={24} cls="t-mu" fs={11.5}>약물 근거 ↑</T>
      {pts.map((p) => {
        const on = sel?.symbol === p.t.symbol && sel.diseaseId === p.d.id, lab = label(p), dm = dim?.(p);
        const pick = onPick ? () => onPick(p) : undefined;
        return (
          <g key={`${p.d.id}-${p.t.symbol}`} className={`nd${dm ? ' dim' : ''}${pick ? '' : ' ro'}`} role={pick ? 'button' : undefined} tabIndex={pick && p.rd ? 0 : -1} aria-pressed={pick ? on : undefined} aria-label={lab}
            onClick={pick} onKeyDown={pick ? press(pick) : undefined} onMouseEnter={() => onHover?.(lab)} onMouseLeave={() => onHover?.(null)} onFocus={() => onHover?.(lab)}>
            {on && <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="var(--fg)" strokeWidth={2.5} />}
            {p.rd ? (
              <path d={`M${p.x} ${p.y - 8} L${p.x + 8} ${p.y} L${p.x} ${p.y + 8} L${p.x - 8} ${p.y} Z`} fill={p.d.color} stroke="var(--fg)" strokeWidth={2} />
            ) : (
              <circle cx={p.x} cy={p.y} r={5.5} fill={p.d.color} fillOpacity={0.75} stroke="var(--surface)" strokeWidth={1} />
            )}
            <title>{lab}</title>
          </g>
        );
      })}
      {groups.map((g) => {
        if (g.length === 1) {
          const p = g[0]!;
          return <T key={p.t.symbol} x={p.x} y={p.y + 24} a="middle" cls="t-m" w={700} fs={12}>{p.t.symbol}</T>;
        }
        const bx = Math.min(x1 - g.length * 64 - 12, g[0]!.x + 18), by = yu(0.975);
        return (
          <g key={g.map((p) => p.t.symbol).join('-')} aria-hidden="true">
            {g.map((p) => <line key={p.t.symbol} x1={p.x + 6} y1={p.y + 4} x2={bx} y2={by - 12} stroke="var(--fg)" strokeWidth={1} />)}
            <rect x={bx} y={by - 16} width={g.length * 64 + 12} height={24} rx={6} fill="var(--bg)" stroke="var(--fg)" strokeWidth={1} />
            <T x={bx + 8} y={by + 1} cls="t-m" w={700} fs={12}>{g.map((p) => p.t.symbol).join(' · ')}</T>
            <T x={bx + 8} y={by + 22} cls="t-mu" fs={11}>{`종합 ${g.map((p) => f2(p.t.overallScore)).join(' · ')}`}</T>
          </g>
        );
      })}
      {(flags ?? []).map((f, i) => {
        const p = pts.find((q) => q.t.symbol === f.symbol && q.d.id === f.diseaseId);
        if (!p) return null;
        const dx = flags!.slice(0, i).filter((o) => o.symbol === f.symbol && o.diseaseId === f.diseaseId).length * 22;
        return (
          <g key={`${f.name}-${i}`} aria-hidden="true">
            <line x1={p.x} y1={p.y - 8} x2={p.x + dx} y2={p.y - 30} stroke="var(--fg)" strokeWidth={1} />
            <circle cx={p.x + dx} cy={p.y - 38} r={11} fill="var(--fg)" stroke="var(--surface)" strokeWidth={1.5} />
            <T x={p.x + dx} y={p.y - 34} a="middle" fs={11} w={700} fill="var(--surface)">{f.initial}</T>
            <title>{`${f.name} 님이 올린 표적`}</title>
          </g>
        );
      })}
    </Svg>
  );
}

// ── 1.10 카드 — 앞면(점수 · 근거) · 뒷면(결정구조 · 기준 약 · 검증 · 도킹 가능) ──

export function FlipCard({ t, d, i, on, sel, onFlip }: { t: TargetRow; d: DData; i: number; on: boolean; sel: boolean; onFlip: () => void }) {
  const tier = targetTier(t), k = TARGET_TIER[tier], redock = TARGET_REDOCK[d.option.targetId];
  return (
    <button type="button" className={`s11-card${sel ? ' sel' : ''}`} aria-pressed={on} aria-label={`${t.symbol} 카드 ${on ? '앞면 보기' : '뒤집기'}`} onClick={onFlip}>
      <span className="in">
        <span className="f" aria-hidden={on}>
          <span className="rk">점수 {i + 1}위</span>
          <span className="g">{t.symbol}</span>
          <span className="ko">{targetKoName(t)}</span>
          <span className="sc">{f3(t.overallScore)}</span>
          <span className="mini">
            {TARGET_EVIDENCE.map((e, n) => (
              <span key={e.key} className="mr"><span>{e.label}</span><i><b style={{ width: `${(t[e.key] * 100).toFixed(0)}%`, background: EV_COLOR[n] }} /></i></span>
            ))}
          </span>
          <span className="hint">눌러서 뒤집기 ↻</span>
        </span>
        <span className={`b ${tier === 'ready' ? 'ok' : tier === 'pdb' ? 'mid' : ''}`} aria-hidden={!on}>
          <span className="g">{t.symbol}</span>
          <dl>
            <dt>결정구조</dt><dd>{t.pdbId ?? '없음'}</dd>
            <dt>약 주머니</dt><dd>{t.smPocket ? '있음' : '없음'}</dd>
            <dt>기준 약</dt><dd>{tier === 'ready' ? d.option.referenceLigand.name : '없음'}</dd>
            <dt>검증</dt><dd>{tier === 'ready' && redock ? `RMSD ${redock.rmsd} Å` : '—'}</dd>
          </dl>
          <span className="res" style={{ color: `var(--${k.tone})` }}>{k.mark} {tier === 'ready' ? '도킹 가능 · 다음 단계로' : '도킹 불가 · 여기서 멈춤'}</span>
        </span>
      </span>
    </button>
  );
}

/** 카드 뒷면 큰판(④ 정보판) — 결정구조 · 약 주머니 · 기준 약 · 재도킹 검증 · 기준 결합력. */
export function BackFace({ t, d }: { t: TargetRow; d: DData }) {
  const tier = targetTier(t), k = TARGET_TIER[tier], redock = TARGET_REDOCK[d.option.targetId];
  return (
    <div className={`s11-face ${tier === 'ready' ? 'ok' : tier === 'pdb' ? 'mid' : 'no'}`}>
      <span className="lab">카드 뒷면</span>
      <span className="g">{t.symbol}</span>
      <dl className="s11-kv">
        <dt>결정구조</dt><dd>{t.pdbId ?? '없음'}</dd>
        <dt>약 주머니</dt><dd>{t.smPocket ? '있음' : '없음'}</dd>
        <dt>기준 약</dt><dd>{tier === 'ready' ? `${d.option.referenceLigand.name}${redock ? ` (${redock.ligand})` : ''}` : '없음'}</dd>
        <dt>재도킹 검증</dt><dd>{tier === 'ready' && redock ? `RMSD ${redock.rmsd} Å ≤ 2 Å` : '—'}</dd>
        <dt>기준 결합력</dt><dd>{tier === 'ready' ? `${f2(d.option.referenceKcal)} kcal/mol` : '—'}</dd>
      </dl>
      <b style={{ color: `var(--${k.tone})` }}>{k.mark} {tier === 'ready' ? '도킹 가능 · 2.1 로 갈 수 있어요' : tier === 'pdb' ? '구조는 있지만 기준 약 · 검증이 없어요' : '결정구조가 없어 주머니 모양을 몰라요'}</b>
    </div>
  );
}
