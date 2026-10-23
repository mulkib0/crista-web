/**
 * 1.2 내 작업대 도구(F12 · 설계 §5.5.1 — 단계 시각화 1.2-01 · 03 · 04 · 05). 모두 개인 · 무료 · 브라우저 계산(`dataset` 지표만).
 * 모둠 공유로 넘어가는 길은 '모둠에 제안'(01 · 03 은 내 작업대 값만 채운다)과 '찜하기'(05) 둘뿐이다. 02(분포 보고 문턱)는 s12.tsx 의 안건 화면.
 */
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  adviceCriteria,
  APPROVED_LIBRARY,
  SCREEN_AGENDA_DIR,
  SCREEN_AGENDA_RANGE,
  SCREEN_AGENDAS,
  SCREEN_COPY,
  SCREEN_RO5_VALUES_NOW,
  screenFails,
  screenFill,
  screenFunnel,
  screenRuleText,
  screenSnap,
  shortName,
  TEXTBOOK_LIMITS,
  type ScreenAgenda,
  type ScreenCompound,
  type ScreenCriteria,
  type ScreenCriteriaPartial,
  type ScreenDatasetResponse,
  type ScreenMission,
} from '@crista-web/web-contract';
import { Panel } from '../ui/index.ts';
import { AgendaHist, fmtEf, FunnelBars, Scoreboard, SmilesBox } from './s12-parts.tsx';

const C = SCREEN_COPY;

// ── 01 기준 설계실 ──

export interface LabState {
  on: Record<ScreenAgenda, boolean>;
  v: ScreenCriteria;
}

const allOn = (on: boolean) => Object.fromEntries(SCREEN_AGENDAS.map((a) => [a, on])) as Record<ScreenAgenda, boolean>;
const MID: ScreenCriteria = { mw: 500, tpsa: 140, ro5: 1, alert: 1, qed: 0.3, score: 0.3 };

export const LAB_PRESETS = {
  advice: (m: ScreenMission | null): LabState => (m ? { on: allOn(true), v: adviceCriteria(m) } : { on: allOn(false), v: { ...MID } }),
  lipinski: (): LabState => ({ on: { ...allOn(false), mw: true, ro5: true }, v: { ...MID, mw: 500, ro5: 0 } }),
  cns: (): LabState => ({ on: { ...allOn(false), mw: true, tpsa: true, alert: true, qed: true }, v: { ...MID, mw: 450, tpsa: 90, alert: 1, qed: 0.3 } }),
  none: (): LabState => ({ on: allOn(false), v: { ...MID } }),
} as const;

export const labCriteria = (s: LabState): ScreenCriteriaPartial => Object.fromEntries(SCREEN_AGENDAS.filter((a) => s.on[a]).map((a) => [a, s.v[a]]));

/** 안건 값 조절 — 범위 안건은 밀대, Ro5 · 경고는 단추(Ro5 2 는 §12-6 전까지 막힘). */
export function AgendaControl({ agenda, value, onChange, disabled, id }: { agenda: ScreenAgenda; value: number; onChange: (v: number) => void; disabled?: boolean; id: string }) {
  const r = SCREEN_AGENDA_RANGE[agenda];
  if (agenda === 'ro5' || agenda === 'alert') {
    const opts = agenda === 'ro5' ? [0, 1, 2] : [1, 0];
    return (
      <div className="s12-seg" role="group" aria-label={C.agenda[agenda].label}>
        {opts.map((o) => {
          const later = agenda === 'ro5' && !SCREEN_RO5_VALUES_NOW.includes(o);
          return (
            <button key={o} type="button" className="rchip" aria-pressed={value === o} disabled={disabled || later} title={later ? C.ro5Later : undefined} onClick={() => onChange(o)}>
              {agenda === 'ro5' ? C.ro5Opts[String(o)] : C.alertOpts[String(o)]}
            </button>
          );
        })}
      </div>
    );
  }
  const dir = SCREEN_AGENDA_DIR[agenda];
  return (
    <div className="rng">
      <input id={id} type="range" min={r.min} max={r.max} step={r.step} value={value} disabled={disabled} onChange={(e) => onChange(screenSnap(agenda, Number(e.target.value)))} aria-label={`${C.agenda[agenda].label} ${dir === 'max' ? C.ui.rangeMax : C.ui.rangeMin}`} />
      <output htmlFor={id}>{dir === 'max' ? '≤' : '≥'} {agenda === 'qed' || agenda === 'score' ? value.toFixed(2) : value}</output>
    </div>
  );
}

export function CriteriaLab({ ds, mission, gene, state, setState, onSend, names }: {
  ds: ScreenDatasetResponse;
  mission: ScreenMission | null;
  gene: string;
  state: LabState;
  setState: (fn: (s: LabState) => LabState) => void;
  onSend: (values: ScreenCriteriaPartial) => void;
  names: Map<string, string>;
}) {
  const crit = labCriteria(state);
  const f = useMemo(() => screenFunnel(ds, crit), [ds, JSON.stringify(crit)]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(ds.compounds.map((c) => [c.id, c])), [ds]);
  return (
    <div className="s12-lab">
      <Panel title={C.lab.title}>
        <div className="s12-presets" role="group" aria-label={C.lab.presets}>
          <span className="lab">{C.lab.presets}</span>
          <button type="button" className="btn sm" onClick={() => setState(() => LAB_PRESETS.advice(mission))}>{C.lab.presetAdvice}</button>
          <button type="button" className="btn sm" onClick={() => setState(() => LAB_PRESETS.lipinski())}>{C.lab.presetLipinski}</button>
          <button type="button" className="btn sm" onClick={() => setState(() => LAB_PRESETS.cns())}>{C.lab.presetCns}</button>
          <button type="button" className="btn sm" onClick={() => setState(() => LAB_PRESETS.none())}>{C.lab.presetNone}</button>
        </div>
        <div className="s12-lab-rows">
          {SCREEN_AGENDAS.map((a) => (
            <div key={a} className={`s12-lab-r${state.on[a] ? '' : ' off'}`}>
              <label className="chk">
                <input type="checkbox" checked={state.on[a]} onChange={(e) => setState((s) => ({ ...s, on: { ...s.on, [a]: e.target.checked } }))} />
                <b>{C.agenda[a].label}</b> <span className="mono mini">{C.agenda[a].sym}</span>
              </label>
              <span className="mono mini s12-lab-v">{state.on[a] ? screenRuleText(a, state.v[a], gene) : C.lab.off}</span>
              <div className="wide">
                <AgendaControl id={`lab-${a}`} agenda={a} value={state.v[a]} onChange={(v) => setState((s) => ({ on: { ...s.on, [a]: true }, v: { ...s.v, [a]: v } }))} />
                <AgendaHist agenda={a} compounds={ds.compounds} hidden={ds.hidden} value={state.on[a] ? state.v[a] : null} compact label={screenFill(C.ui.distShort, { sym: C.agenda[a].sym })} />
              </div>
            </div>
          ))}
        </div>
        <div className="acts">
          <button type="button" className="btn pri" onClick={() => onSend(crit)} disabled={Object.keys(crit).length === 0}>{C.lab.send}</button>
        </div>
      </Panel>
      <Scoreboard f={f} title={C.scoreboard.mine} />
      <Panel title={C.lab.funnelTitle} plain>
        <FunnelBars f={f} gene={gene} names={names} />
      </Panel>
      <Panel title={screenFill(C.lab.topTitle, { n: f.topIds.length })} plain>
        {f.topIds.length ? (
          <ol className="s12-top">
            {f.topIds.map((id) => {
              const c = byId.get(id)!;
              return <li key={id} className={c.known ? 'known' : ''}>{c.known ? '★ ' : ''}{shortName(c.name, 16)}</li>;
            })}
          </ol>
        ) : <p className="empty">{C.lab.none}</p>}
      </Panel>
    </div>
  );
}

// ── 03 화학 공간 울타리 ──

type Axis = 'mw' | 'tpsa' | 'qed' | 'score' | 'clogp' | 'hbd' | 'rotb';
const AXES: Axis[] = ['mw', 'tpsa', 'qed', 'score', 'clogp', 'hbd', 'rotb'];
const AGENDA_AXES: readonly Axis[] = ['mw', 'tpsa', 'qed', 'score'];
const DOMAIN: Record<Axis, [number, number]> = { mw: [100, 700], tpsa: [0, 220], qed: [0, 1], score: [0, 1], clogp: [-2, 7], hbd: [0, 8], rotb: [0, 13] };
const AXIS_LABEL: Record<Axis, string> = {
  mw: `${C.ind.mw.name} MW`,
  tpsa: `${C.ind.tpsa.name} TPSA`,
  qed: `${C.ind.qed.name} QED`,
  score: `${C.ind.score.name}`,
  clogp: `${C.ind.clogp.name} cLogP · ${C.map.ref}`,
  hbd: `${C.ind.hbd.name} HBD · ${C.map.ref}`,
  rotb: `${C.ind.rotb.name} RotB · ${C.map.ref}`,
};
const TEXTBOOK_LINE: Partial<Record<Axis, number>> = { mw: TEXTBOOK_LIMITS.mw, tpsa: TEXTBOOK_LIMITS.tpsa, clogp: TEXTBOOK_LIMITS.clogp, hbd: TEXTBOOK_LIMITS.hbd, rotb: TEXTBOOK_LIMITS.rotb, qed: TEXTBOOK_LIMITS.qedMin };
const axisVal = (a: Axis, c: ScreenCompound): number => (a === 'score' ? c.score : c[a]);
const fmtAx = (a: Axis, v: number) => (a === 'qed' || a === 'score' ? v.toFixed(2) : a === 'clogp' ? v.toFixed(1) : String(Math.round(v)));

export interface MapState {
  x: Axis;
  y: Axis;
  /** [x0, y0, x1, y1] 데이터 값. */
  box: [number, number, number, number] | null;
  textbook: boolean;
}
export const initialMap = (): MapState => ({ x: 'mw', y: 'tpsa', box: null, textbook: false });

const G = { W: 480, H: 320, x0: 46, x1: 470, y0: 14, y1: 284 };

export function ChemMap({ ds, state, setState, onTake }: {
  ds: ScreenDatasetResponse;
  state: MapState;
  setState: (fn: (s: MapState) => MapState) => void;
  onTake: (values: ScreenCriteriaPartial) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const { x: ax, y: ay, box } = state;
  const [dx, dy] = [DOMAIN[ax], DOMAIN[ay]];
  const sx = (v: number) => G.x0 + ((Math.max(dx[0], Math.min(dx[1], v)) - dx[0]) / (dx[1] - dx[0])) * (G.x1 - G.x0);
  const sy = (v: number) => G.y1 - ((Math.max(dy[0], Math.min(dy[1], v)) - dy[0]) / (dy[1] - dy[0])) * (G.y1 - G.y0);
  const toData = (e: ReactPointerEvent<SVGSVGElement>): [number, number] => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(el.getScreenCTM()!.inverse());
    const px = Math.max(G.x0, Math.min(G.x1, q.x));
    const py = Math.max(G.y0, Math.min(G.y1, q.y));
    return [dx[0] + ((px - G.x0) / (G.x1 - G.x0)) * (dx[1] - dx[0]), dy[0] + ((G.y1 - py) / (G.y1 - G.y0)) * (dy[1] - dy[0])];
  };
  const norm = box ? { x0: Math.min(box[0], box[2]), x1: Math.max(box[0], box[2]), y0: Math.min(box[1], box[3]), y1: Math.max(box[1], box[3]) } : null;
  const inside = (c: ScreenCompound) => !!norm && axisVal(ax, c) >= norm.x0 && axisVal(ax, c) <= norm.x1 && axisVal(ay, c) >= norm.y0 && axisVal(ay, c) <= norm.y1;
  const K = ds.compounds.filter((c) => c.known).length;
  const inn = norm ? ds.compounds.filter(inside) : [];
  const k = inn.filter((c) => c.known).length;
  const ef = inn.length && K ? k / inn.length / (K / ds.total) : 0;
  const outsideKnown = norm ? ds.compounds.filter((c) => c.known && !inside(c)) : [];
  const jitter = (i: number, a: Axis) => (a === 'hbd' || a === 'rotb' ? (((i * 37) % 11) / 11 - 0.5) * 0.5 : 0);

  const setEdge = (i: 0 | 1 | 2 | 3, raw: string) => {
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    setState((s) => {
      const b: [number, number, number, number] = s.box ? [...s.box] : [dx[0], dy[0], dx[1], dy[1]];
      b[i] = v;
      return { ...s, box: b };
    });
  };
  const take = () => {
    if (!norm) return;
    const out: ScreenCriteriaPartial = {};
    for (const [axis, lo, hi] of [[ax, norm.x0, norm.x1], [ay, norm.y0, norm.y1]] as Array<[Axis, number, number]>) {
      if (!AGENDA_AXES.includes(axis)) continue;
      const agenda = axis as ScreenAgenda;
      out[agenda] = SCREEN_AGENDA_DIR[agenda] === 'max' ? screenSnap(agenda, hi, 'down') : screenSnap(agenda, lo, 'up');
    }
    onTake(out);
  };

  return (
    <div className="s12-map">
      <Panel title={C.map.title}>
        <div className="row">
          <label className="mini" htmlFor="map-x">{C.map.x}</label>
          <select id="map-x" className="txt s12-sel" value={ax} onChange={(e) => setState((s) => ({ ...s, x: e.target.value as Axis, box: null }))}>
            {AXES.map((a) => <option key={a} value={a}>{AXIS_LABEL[a]}</option>)}
          </select>
          <label className="mini" htmlFor="map-y">{C.map.y}</label>
          <select id="map-y" className="txt s12-sel" value={ay} onChange={(e) => setState((s) => ({ ...s, y: e.target.value as Axis, box: null }))}>
            {AXES.map((a) => <option key={a} value={a}>{AXIS_LABEL[a]}</option>)}
          </select>
          <button type="button" className="rchip" aria-pressed={state.textbook} onClick={() => setState((s) => ({ ...s, textbook: !s.textbook }))}>{C.map.textbook}</button>
          <button type="button" className="btn sm" onClick={() => setState((s) => ({ ...s, box: null }))}>{C.map.clear}</button>
        </div>
        <svg
          ref={svg}
          className="s12-scatter"
          viewBox={`0 0 ${G.W} ${G.H}`}
          role="img"
          aria-label={screenFill(C.ui.scatter, { x: AXIS_LABEL[ax], y: AXIS_LABEL[ay], n: ds.compounds.length })}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = toData(e);
            setDrag(p);
            setState((s) => ({ ...s, box: [p[0], p[1], p[0], p[1]] }));
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            const p = toData(e);
            setState((s) => ({ ...s, box: [drag[0], drag[1], p[0], p[1]] }));
          }}
          onPointerUp={() => {
            setDrag(null);
            setState((s) => (s.box && Math.abs(s.box[0] - s.box[2]) < 1e-6 && Math.abs(s.box[1] - s.box[3]) < 1e-6 ? { ...s, box: null } : s));
          }}
          onPointerCancel={() => setDrag(null)}
        >
          <rect x={G.x0} y={G.y0} width={G.x1 - G.x0} height={G.y1 - G.y0} className="s12-plot" />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <text x={G.x0 + t * (G.x1 - G.x0)} y={G.y1 + 14} textAnchor="middle" className="s12-ht">{fmtAx(ax, dx[0] + t * (dx[1] - dx[0]))}</text>
              <text x={G.x0 - 5} y={G.y1 - t * (G.y1 - G.y0) + 4} textAnchor="end" className="s12-ht">{fmtAx(ay, dy[0] + t * (dy[1] - dy[0]))}</text>
            </g>
          ))}
          <text x={(G.x0 + G.x1) / 2} y={G.H - 4} textAnchor="middle" className="s12-ht">{AXIS_LABEL[ax]} →</text>
          {state.textbook && TEXTBOOK_LINE[ax] !== undefined && <line x1={sx(TEXTBOOK_LINE[ax]!)} x2={sx(TEXTBOOK_LINE[ax]!)} y1={G.y0} y2={G.y1} className="s12-tb"><title>{screenFill(C.map.textbookAt, { v: TEXTBOOK_LINE[ax]! })}</title></line>}
          {state.textbook && TEXTBOOK_LINE[ay] !== undefined && <line x1={G.x0} x2={G.x1} y1={sy(TEXTBOOK_LINE[ay]!)} y2={sy(TEXTBOOK_LINE[ay]!)} className="s12-tb"><title>{screenFill(C.map.textbookAt, { v: TEXTBOOK_LINE[ay]! })}</title></line>}
          {norm && <rect x={sx(norm.x0)} y={sy(norm.y1)} width={Math.max(0, sx(norm.x1) - sx(norm.x0))} height={Math.max(0, sy(norm.y0) - sy(norm.y1))} className="s12-fence" />}
          {ds.compounds.map((c, i) =>
            c.known ? null : (
              <circle key={c.id} cx={sx(axisVal(ax, c) + jitter(i, ax))} cy={sy(axisVal(ay, c) + jitter(i + 5, ay))} r={3} className={inside(c) ? 's12-pt in' : 's12-pt'}>
                <title>{`${c.name} · ${fmtAx(ax, axisVal(ax, c))} · ${fmtAx(ay, axisVal(ay, c))}`}</title>
              </circle>
            ),
          )}
          {ds.compounds.filter((c) => c.known).map((c) => {
            const x = sx(axisVal(ax, c));
            const y = sy(axisVal(ay, c));
            const d = Array.from({ length: 10 }, (_, i) => {
              const a = -Math.PI / 2 + (i * Math.PI) / 5;
              const rr = i % 2 ? 2.8 : 6.5;
              return `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
            }).join('');
            return <path key={c.id} d={`${d}Z`} className="s12-star"><title>{`★ ${c.name} · ${fmtAx(ax, axisVal(ax, c))} · ${fmtAx(ay, axisVal(ay, c))}`}</title></path>;
          })}
        </svg>
        <fieldset className="s12-edges">
          <legend className="lab">{C.map.edges}</legend>
          {([[0, `${C.map.x} ≥`], [2, `${C.map.x} ≤`], [1, `${C.map.y} ≥`], [3, `${C.map.y} ≤`]] as Array<[0 | 1 | 2 | 3, string]>).map(([i, l]) => {
            const cur = norm ? [norm.x0, norm.y0, norm.x1, norm.y1][i]! : [dx[0], dy[0], dx[1], dy[1]][i]!;
            const axis = i % 2 === 0 ? ax : ay;
            return (
              <label key={i} className="mini">
                {l}
                <input className="txt" type="number" step={axis === 'qed' || axis === 'score' ? 0.05 : 1} value={Number(fmtAx(axis, cur))} onChange={(e) => setEdge(i, e.target.value)} />
              </label>
            );
          })}
        </fieldset>
        {norm ? (
          <p className="s12-out" role="status">
            {screenFill(C.map.out, { x: AXIS_LABEL[ax], x0: fmtAx(ax, norm.x0), x1: fmtAx(ax, norm.x1), y: AXIS_LABEL[ay], y0: fmtAx(ay, norm.y0), y1: fmtAx(ay, norm.y1) })}
            <br />
            {screenFill(C.map.stats, { n: inn.length, k, K, ef: fmtEf(ef) })}
            {outsideKnown.length > 0 && <><br /><span className="bad">✕ {screenFill(C.map.outside, { list: outsideKnown.map((c) => shortName(c.name, 10)).join(', ') })}</span></>}
          </p>
        ) : <p className="s12-out">{C.map.empty}</p>}
        <div className="acts">
          <button type="button" className="btn pri" disabled={!norm} onClick={take}>{C.map.take}</button>
          {!AGENDA_AXES.includes(ax) && !AGENDA_AXES.includes(ay) && <span className="note">{C.map.takeNone}</span>}
        </div>
      </Panel>
    </div>
  );
}

// ── 04 내가 심사관 ──

const CARD_IND: Array<{ k: 'mw' | 'tpsa' | 'clogp' | 'hbd' | 'rotb' | 'qed'; d: [number, number]; ref: [number, number] }> = [
  { k: 'mw', d: [0, 700], ref: [150, 500] },
  { k: 'tpsa', d: [0, 220], ref: [20, 130] },
  { k: 'clogp', d: [-2, 7], ref: [-0.7, 5] },
  { k: 'hbd', d: [0, 8], ref: [0, 5] },
  { k: 'rotb', d: [0, 13], ref: [0, 9] },
  { k: 'qed', d: [0, 1], ref: [0.5, 1] },
];

export interface JudgeState {
  dec: Record<string, 'y' | 'n'>;
  open: boolean;
}

export function JudgeCards({ ds, mission, gene, state, setState }: {
  ds: ScreenDatasetResponse;
  mission: ScreenMission;
  gene: string;
  state: JudgeState;
  setState: (fn: (s: JudgeState) => JudgeState) => void;
}) {
  const byId = new Map(ds.compounds.map((c) => [c.id, c]));
  const adv = adviceCriteria(mission);
  const cards = mission.judgeCards.map((jc) => ({ ...jc, c: byId.get(jc.compoundId) })).filter((x): x is typeof x & { c: ScreenCompound } => !!x.c);
  const same = cards.filter((x) => state.dec[x.c.id] && (state.dec[x.c.id] === 'y') === (screenFails(x.c, adv).length === 0)).length;
  return (
    <div className="s12-judge">
      <Panel title={C.briefing.warmup}>
        <div className="s12-cards">
          {cards.map(({ c, story }) => {
            const fails = screenFails(c, adv);
            const ok = fails.length === 0;
            const mine = state.dec[c.id];
            return (
              <article key={c.id} className="s12-jcard">
                <header><b>{shortName(c.name, 22)}</b><span className="mini muted">{c.library}</span></header>
                <SmilesBox smiles={c.smiles} />
                <div className="s12-ind">
                  {CARD_IND.map(({ k, d, ref }) => {
                    const v = c[k];
                    const x = (t: number) => ((Math.max(d[0], Math.min(d[1], t)) - d[0]) / (d[1] - d[0])) * 100;
                    const out = v < ref[0] || v > ref[1];
                    return (
                      <div key={k} className="s12-ir">
                        <span>{C.ind[k].sym}</span>
                        <span className="tr" aria-hidden="true"><u style={{ left: `${x(ref[0])}%`, width: `${x(ref[1]) - x(ref[0])}%` }} /><i className={out ? 'out' : ''} style={{ left: `${x(v)}%` }} /></span>
                        <span className={out ? 'bad' : ''}>{k === 'qed' ? v.toFixed(2) : k === 'clogp' ? v.toFixed(1) : Math.round(v)}{out ? ' !' : ''}</span>
                      </div>
                    );
                  })}
                  <span className={c.alerts.length ? 'bad mini' : 'mini muted'}>
                    {c.alerts.length ? screenFill(C.judge.alerts, { list: c.alerts.map((a) => C.alertName[a] ?? a).join(' · ') }) : C.judge.noAlert}
                  </span>
                </div>
                <div className="s12-seg" role="group" aria-label={screenFill(C.ui.judgeOf, { name: c.name })}>
                  <button type="button" className="rchip" aria-pressed={mine === 'y'} onClick={() => setState((s) => ({ ...s, dec: { ...s.dec, [c.id]: 'y' } }))}>✓ {C.judge.pass}</button>
                  <button type="button" className="rchip" aria-pressed={mine === 'n'} onClick={() => setState((s) => ({ ...s, dec: { ...s.dec, [c.id]: 'n' } }))}>✕ {C.judge.fail}</button>
                </div>
                {state.open && (
                  <div className="s12-rev">
                    <span className={ok ? 'good' : 'bad'}>{ok ? `✓ ${C.judge.rulePass}` : `✕ ${screenFill(C.judge.ruleFail, { rules: fails.map((a) => screenRuleText(a, adv[a], gene)).join(' · ') })}`}</span>
                    {mine && <span className={(mine === 'y') === ok ? 'good' : 'warn'}>{(mine === 'y') === ok ? C.judge.same : C.judge.diff}</span>}
                    <span>{story}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="acts">
          <button type="button" className="btn pri" onClick={() => setState((s) => ({ ...s, open: true }))}>{C.judge.open}</button>
          <span className="note" role="status">{state.open ? screenFill(C.judge.score, { n: same, m: cards.length }) : screenFill(C.judge.progress, { n: Object.keys(state.dec).length, m: cards.length })}</span>
        </div>
      </Panel>
    </div>
  );
}

// ── 05 도킹할 분자 고르기 — 진열대 표 ──

type Col = 'name' | 'library' | 'mw' | 'tpsa' | 'clogp' | 'hbd' | 'qed' | 'alerts' | 'score';
const COLS: Array<{ k: Col; label: (gene: string) => string; num: boolean }> = [
  { k: 'name', label: () => C.ui.tableCols.name, num: false },
  { k: 'library', label: () => C.ui.tableCols.library, num: false },
  { k: 'mw', label: () => 'MW', num: true },
  { k: 'tpsa', label: () => 'TPSA', num: true },
  { k: 'clogp', label: () => 'cLogP', num: true },
  { k: 'hbd', label: () => 'HBD', num: true },
  { k: 'qed', label: () => 'QED', num: true },
  { k: 'alerts', label: () => C.ui.tableCols.alerts, num: false },
  { k: 'score', label: (g) => screenFill(C.ui.tableCols.score, { gene: g }), num: true },
];
const colVal = (c: ScreenCompound, k: Col): number | string => (k === 'alerts' ? c.alerts.length : c[k]);
const over = (c: ScreenCompound, k: Col): boolean =>
  (k === 'mw' && c.mw > TEXTBOOK_LIMITS.mw) || (k === 'tpsa' && c.tpsa > TEXTBOOK_LIMITS.tpsa) || (k === 'clogp' && c.clogp > TEXTBOOK_LIMITS.clogp) ||
  (k === 'hbd' && c.hbd > TEXTBOOK_LIMITS.hbd) || (k === 'qed' && c.qed < TEXTBOOK_LIMITS.qedMin) || (k === 'alerts' && c.alerts.length > 0);

export function ShelfTable({ rows, gene, rankOf, renderAct }: {
  rows: ScreenCompound[];
  gene: string;
  rankOf: (id: string) => number;
  renderAct: (c: ScreenCompound) => ReactNode;
}) {
  const [sort, setSort] = useState<{ k: Col | 'rank'; d: 'asc' | 'desc' }>({ k: 'rank', d: 'asc' });
  const sorted = rows.slice().sort((a, b) => {
    if (sort.k === 'rank') return (rankOf(a.id) - rankOf(b.id)) * (sort.d === 'asc' ? 1 : -1);
    const x = colVal(a, sort.k);
    const y = colVal(b, sort.k);
    const r = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'ko') : Number(x) - Number(y);
    return r * (sort.d === 'desc' ? -1 : 1);
  });
  const click = (k: Col | 'rank') => setSort((s) => ({ k, d: s.k === k && s.d === 'desc' ? 'asc' : s.k === k ? 'desc' : k === 'rank' || k === 'name' || k === 'library' ? 'asc' : 'desc' }));
  const aria = (k: Col | 'rank') => (sort.k === k ? (sort.d === 'desc' ? 'descending' : 'ascending') : 'none');
  return (
    <div className="tbl-w s12-tbl">
      <table>
        <thead>
          <tr>
            <th aria-sort={aria('rank')} className="num"><button type="button" onClick={() => click('rank')}>{C.ui.tableCols.rank}</button></th>
            {COLS.map((col) => (
              <th key={col.k} aria-sort={aria(col.k)} className={col.num ? 'num' : ''}><button type="button" onClick={() => click(col.k)}>{col.label(gene)}</button></th>
            ))}
            <th>{C.ui.tableCols.claim}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className={c.known ? 'on' : ''}>
              <td className="num">{rankOf(c.id)}</td>
              <td><b className="mini">{c.known ? '★ ' : ''}{shortName(c.name, 18)}</b><div className="smi">{c.id}</div></td>
              <td className="mini">{c.library === APPROVED_LIBRARY ? C.ui.approvedShort : c.library}</td>
              {(['mw', 'tpsa', 'clogp', 'hbd', 'qed'] as const).map((k) => (
                <td key={k} className={`num${over(c, k) ? ' x' : ''}`}>{k === 'qed' ? c.qed.toFixed(2) : k === 'clogp' ? c.clogp.toFixed(2) : k === 'hbd' ? c.hbd : c[k].toFixed(1)}{over(c, k) ? ' !' : ''}</td>
              ))}
              <td className={c.alerts.length ? 'x' : ''}>{c.alerts.length ? C.ui.alertYes : ''}</td>
              <td className="num">{c.score.toFixed(3)}</td>
              <td>{renderAct(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mini muted">{screenFill(C.shop.rowsNote, { n: rows.length })} · {C.shop.textbookNote}</p>
    </div>
  );
}
