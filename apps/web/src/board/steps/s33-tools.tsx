/**
 * 3.3 제형 · IND 도구 6종(설계 §5.10 — 시안 design/step-viz/viz-6.js 의 6.02~6.07) — SVG 를 직접 그린다(새 라이브러리 없음).
 *
 * - 모든 E · S 는 서버가 game-rules `scoreCandidate` 로 계산해 내려보낸 9조합(`IndCandidateView.grid`)에서 고른다 — '흔들림 전 예상치'.
 *   규칙 값(용량 독성 Dt · 피크 K · 기준선 · 위험 가중치)도 서버가 준 `IndRulesView` 만 쓴다.
 * - 색만으로 말하지 않는다: 제형은 모양(● 경구 · ■ 정맥 · ▲ 경피)과 선 모양(실선 · 긴 점선 · 짧은 점선)으로, 통과는 ✓ · ✕ 글로.
 * - 그림은 viewBox 로 줄어든다(폰 390 폭에서 가로 스크롤 없음). 그림마다 role="img" + aria-label, 자세한 값은 옆 글로.
 */
import type { KeyboardEvent, ReactNode } from 'react';
import {
  IND_COPY,
  IND_DOSES,
  IND_FORMS,
  fillIndCopy,
  indCell,
  indDoseBurden,
  indFmtMg,
  indGates,
  type IndCandidateView,
  type IndDose,
  type IndForm,
  type IndResponse,
  type IndScoreCell,
} from '@crista-web/web-contract';

const T = IND_COPY.toolNotes;
const W = T.wf;
const FORM = IND_COPY.forms;
export type ToolId = 'lab' | 'seesaw' | 'peak' | 'dose' | 'plane' | 'waterfall';
export const TOOL_IDS: readonly ToolId[] = ['lab', 'seesaw', 'peak', 'dose', 'plane', 'waterfall'];

export interface Knobs {
  form: IndForm;
  dose: IndDose;
  role: 'lead' | 'backup';
  population: string | null;
}

export interface ToolProps {
  data: IndResponse;
  cand: IndCandidateView;
  knobs: Knobs;
  setKnobs: (fn: (k: Knobs) => Knobs) => void;
  /** 지금 환자군이 뇌 병변 환자군인가(비 CNS 표적에서 B 가 들어감). */
  brainPop: boolean;
  /** E–S 평면 — 고른 점을 신청서 조합으로(편집할 수 없으면 null). */
  onApply: ((form: IndForm, dose: IndDose) => void) | null;
  applied: { form: IndForm | null; dose: IndDose | null } | null;
  busy?: boolean;
}

const f1 = (v: number): string => v.toFixed(1);
const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
const DASH: Record<IndForm, string | undefined> = { oral: undefined, iv: '7 4', transdermal: '2 3' };

/** 제형 모양 — 원 · 네모 · 세모. */
function Shape({ form, x, y, r, className }: { form: IndForm; x: number; y: number; r: number; className?: string }) {
  const cls = `s33-f-${form}${className ? ` ${className}` : ''}`;
  if (form === 'oral') return <circle cx={x} cy={y} r={r} className={cls} />;
  if (form === 'iv') return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} className={cls} />;
  return <path d={`M${x} ${y - r * 1.1} L${x + r * 1.05} ${y + r * 0.75} L${x - r * 1.05} ${y + r * 0.75} Z`} className={cls} />;
}

/** 그림 — 눌러 고르는 점이 있는 그림(E–S 평면)은 role="group"(role="img" 이면 안의 단추가 화면 낭독기에서 사라진다). */
function Fig({ w, h, label, children, className, interactive }: { w: number; h: number; label: string; children: ReactNode; className?: string; interactive?: boolean }) {
  return (
    <svg className={`s33-svg${className ? ` ${className}` : ''}`} viewBox={`0 0 ${w} ${h}`} role={interactive ? 'group' : 'img'} aria-label={label} preserveAspectRatio="xMidYMid meet">
      <title>{label}</title>
      {children}
    </svg>
  );
}

const cellOf = (p: Pick<ToolProps, 'cand' | 'knobs' | 'brainPop'>, form = p.knobs.form, dose = p.knobs.dose): IndScoreCell | null => indCell(p.cand.grid, form, dose, p.brainPop);

/** 손잡이 줄 — 제형 · 용량 · 후보 · 환자군(개인 · 화면 로컬). */
export function KnobBar({ data, knobs, setKnobs, show = ['form', 'dose', 'candidate', 'population'] }: Pick<ToolProps, 'data' | 'knobs' | 'setKnobs'> & { show?: Array<'form' | 'dose' | 'candidate' | 'population'> }) {
  return (
    <div className="s33-knobs">
      {show.includes('form') && (
        <div className="s33-knob" role="group" aria-label={T.knobForm}>
          <span className="lab">{T.knobForm}</span>
          <div className="s33-seg">
            {IND_FORMS.map((f) => (
              <button key={f} type="button" className="btn sm" aria-pressed={knobs.form === f} onClick={() => setKnobs((k) => ({ ...k, form: f }))}>
                <span aria-hidden="true" className={`s33-mk s33-t-${f}`}>{FORM[f].mark}</span> {FORM[f].short}
              </button>
            ))}
          </div>
        </div>
      )}
      {show.includes('dose') && (
        <div className="s33-knob" role="group" aria-label={T.knobDose}>
          <span className="lab">{T.knobDose}</span>
          <div className="s33-seg">
            {IND_DOSES.map((d) => (
              <button key={d} type="button" className="btn sm" aria-pressed={knobs.dose === d} onClick={() => setKnobs((k) => ({ ...k, dose: d }))}>{d} mg</button>
            ))}
          </div>
        </div>
      )}
      {show.includes('candidate') && data.candidates.length > 1 && (
        <div className="s33-knob">
          <label className="lab" htmlFor="s33-cand">{T.knobCandidate}</label>
          <select id="s33-cand" className="txt" value={knobs.role} onChange={(e) => setKnobs((k) => ({ ...k, role: e.target.value as 'lead' | 'backup' }))}>
            {data.candidates.map((c) => <option key={c.role} value={c.role}>{IND_COPY.roles[c.role]} · {c.codeName}</option>)}
          </select>
        </div>
      )}
      {show.includes('population') && data.trial && (
        <div className="s33-knob">
          <label className="lab" htmlFor="s33-pop">{T.knobPopulation}</label>
          <select id="s33-pop" className="txt" value={knobs.population ?? ''} onChange={(e) => setKnobs((k) => ({ ...k, population: e.target.value || null }))}>
            <option value="">—</option>
            {data.trial.populations.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function Gates({ cell, data }: { cell: IndScoreCell; data: IndResponse }) {
  return (
    <div className="chips" aria-label={T.gatesLabel}>
      {indGates(cell.efficacy, cell.safety, data.rules.thresholds).map((g) => (
        <span key={g.id} className={`sig ${g.ok ? 'g' : 'b'}${g.id === 'ind' ? '' : ' s33-ref'}`}>{g.ok ? '✓' : '✕'} {IND_COPY.gates[g.id]}</span>
      ))}
    </div>
  );
}

function MrsdLine({ cand, knobs }: Pick<ToolProps, 'cand' | 'knobs'>) {
  const mrsd = cand.animal?.mrsdMgByForm[knobs.form];
  if (mrsd === undefined) return <p className="verdict warn"><b aria-hidden="true">!</b> {T.mrsdNone}</p>;
  const ok = knobs.dose <= mrsd;
  return (
    <p className={`verdict ${ok ? 'ok' : 'block'}`}>
      <b aria-hidden="true">{ok ? '✓' : '✕'}</b> {fillIndCopy(ok ? T.mrsdOk : T.mrsdOver, { dose: knobs.dose, mrsd: indFmtMg(mrsd) })}
    </p>
  );
}

/** 가로 게이지 — 0~100 · 기준 눈금(IND 는 진하게, 나머지는 참고 점선). */
function Gauge({ y, value, label, ticks }: { y: number; value: number; label: string; ticks: Array<{ v: number; t: string; main?: boolean }> }) {
  const x = lin(0, 100, 52, 340);
  return (
    <g>
      <text x={4} y={y + 13} className="s33-tx b">{label}</text>
      <rect x={52} y={y} width={288} height={18} rx={9} className="s33-track" />
      <rect x={52} y={y} width={Math.max(0, x(value) - 52)} height={18} rx={9} className="s33-fill" />
      {ticks.map((t, i) => (
        <g key={t.t}>
          <line x1={x(t.v)} x2={x(t.v)} y1={y - 5} y2={y + 23} className={t.main ? 's33-th' : 's33-th ref'} />
          <text x={x(t.v)} y={i % 2 ? y - 8 : y + 34} textAnchor="middle" className={`s33-tx sm${t.main ? ' b' : ' mu'}`}>{t.t}</text>
        </g>
      ))}
      <text x={Math.min(x(value) + 5, 314)} y={y + 13} className={`s33-tx b${x(value) + 5 > 314 ? ' inv' : ''}`}>{f1(value)}</text>
    </g>
  );
}

// ── 6.05 what-if 실험실(첫 탭) ──
export function ToolLab(p: ToolProps) {
  const cell = cellOf(p);
  const th = p.data.rules.thresholds;
  return (
    <div className="s33-tool">
      <KnobBar {...p} />
      {cell ? (
        <>
          <Fig w={360} h={124} label={fillIndCopy(T.labFig, { e: f1(cell.efficacy), s: f1(cell.safety), form: FORM[p.knobs.form].short, dose: p.knobs.dose })}>
            <Gauge y={18} value={cell.efficacy} label={T.gaugeE} ticks={[{ v: th.phase2E, t: `${T.phase.phase2} ${th.phase2E}` }, { v: th.phase3E, t: `${T.phase.phase3} ${th.phase3E}` }]} />
            <Gauge y={80} value={cell.safety} label={T.gaugeS} ticks={[{ v: th.ind, t: `IND ${th.ind}`, main: true }, { v: th.phase1, t: `${T.phase.phase1} ${th.phase1}` }, { v: th.phase3S, t: `${T.phase.phase3} ${th.phase3S}` }]} />
          </Fig>
          <div className="s33-formula mono" aria-label={T.formulaLabel}>
            <div>E = 100 × ({p.data.rules.efficacy.base} + {p.data.rules.efficacy.affinityWeight} × <b>p {cell.inputs.p.toFixed(3)}</b>) × <b>A {cell.inputs.A.toFixed(2)}</b> × <b>B {cell.inputs.B.toFixed(2)}</b> × <b>De {cell.inputs.De.toFixed(2)}</b> = <mark>{f1(cell.efficacy)}</mark></div>
            <div>S = max(0, 100 − <b>Dt {cell.inputs.Dt}</b> × <b>R {cell.inputs.R.toFixed(2)}</b> × <b>K {cell.inputs.K.toFixed(2)}</b>) = <mark>{f1(cell.safety)}</mark></div>
          </div>
          <Gates cell={cell} data={p.data} />
          <MrsdLine cand={p.cand} knobs={p.knobs} />
          {p.brainPop && <p className="hint">{T.brainPop}</p>}
        </>
      ) : (
        <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>
      )}
    </div>
  );
}

// ── 6.04 효능 · 안전 시소 ──
export function ToolSeesaw(p: ToolProps) {
  const cell = cellOf(p);
  if (!cell) return <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>;
  const th = Math.max(-18, Math.min(18, -(cell.efficacy - cell.safety) * 0.3));
  const a = (th * Math.PI) / 180;
  const cx = 180;
  const cy = 108;
  const half = 118;
  const L = [cx - half * Math.cos(a), cy - half * Math.sin(a)] as const;
  const R = [cx + half * Math.cos(a), cy + half * Math.sin(a)] as const;
  const pan = (pt: readonly [number, number], v: number, lab: string, cls: string) => {
    const h = Math.max(4, v * 0.5);
    return (
      <g className="s33-pan" style={{ transform: `translate(${pt[0]}px, ${pt[1]}px)` }}>
        <path d="M0 0 L-30 34 M0 0 L30 34" className="s33-rope" />
        <rect x={-24} y={34 - h} width={48} height={h} rx={6} className={cls} />
        <path d="M-36 34 H36" className="s33-plate" />
        <text x={0} y={50} textAnchor="middle" className="s33-tx b">{`${lab} ${f1(v)}`}</text>
      </g>
    );
  };
  return (
    <div className="s33-tool">
      <KnobBar {...p} show={['form', 'dose']} />
      <Fig w={360} h={200} label={fillIndCopy(T.seesawFig, { e: f1(cell.efficacy), s: f1(cell.safety) })}>
        <path d={`M${cx} ${cy} L${cx - 22} ${cy + 56} H${cx + 22} Z`} className="s33-fulcrum" />
        <path d={`M${cx - 110} ${cy + 56} H${cx + 110}`} className="s33-ground" />
        <g className="s33-beam" style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${th}deg)` }}>
          <rect x={cx - half} y={cy - 4} width={half * 2} height={8} rx={4} className="s33-beam-r" />
        </g>
        <circle cx={cx} cy={cy} r={5} className="s33-pivot" />
        {pan(L, cell.efficacy, 'E', 's33-pan-e')}
        {pan(R, cell.safety, 'S', 's33-pan-s')}
        <text x={cx} y={cy + 76} textAnchor="middle" className="s33-tx b">{`${FORM[p.knobs.form].short} ${p.knobs.dose} mg`}</text>
      </Fig>
      <Gates cell={cell} data={p.data} />
    </div>
  );
}

// ── 6.06 피크 곡선(개념 그림 — 꼭대기만 규칙 값) ──
const SHAPE: Record<IndForm, (t: number) => number> = {
  iv: (t) => (t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) / 5)),
  oral: (t) => {
    const v = (u: number) => Math.exp(-0.2 * u) - Math.exp(-1.2 * u);
    return v(t) / v(Math.log(6));
  },
  transdermal: (t) => (1 - Math.exp(-t / 3)) / (1 - Math.exp(-8)),
};

export function ToolPeak(p: ToolProps) {
  const cell = cellOf(p);
  if (!cell) return <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>;
  const rules = p.data.rules;
  const rk = cell.inputs.R;
  const Dt = rules.doseToxicity[p.knobs.dose];
  const limit = (100 - rules.thresholds.ind) / rk;
  const mrsd = p.cand.animal?.mrsdMgByForm[p.knobs.form];
  const mrsdBurden = mrsd !== undefined ? indDoseBurden(mrsd, rules.doseToxicity) * rules.formulationPeak[p.knobs.form] : null;
  const top = Math.max(72, Dt * 1.3, limit + 6, (mrsdBurden ?? 0) + 6);
  const x = lin(0, 24, 34, 262);
  const y = lin(0, top, 196, 18);
  return (
    <div className="s33-tool">
      <KnobBar {...p} show={['form', 'dose']} />
      <Fig w={360} h={222} label={fillIndCopy(T.peakFig, { dose: p.knobs.dose })}>
        {[0, 20, 40, 60].filter((v) => v < top).map((v) => (
          <g key={v}>
            <line x1={34} x2={262} y1={y(v)} y2={y(v)} className="s33-grid" />
            <text x={30} y={y(v) + 4} textAnchor="end" className="s33-tx sm mu">{v}</text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((t) => <text key={t} x={x(t)} y={212} textAnchor="middle" className="s33-tx sm mu">{t}h</text>)}
        <line x1={34} x2={262} y1={y(limit)} y2={y(limit)} className="s33-limit" />
        <text x={266} y={y(limit) + 4} className="s33-tx sm b s33-bad">IND {f1(limit)}</text>
        {mrsdBurden !== null && (
          <>
            <line x1={34} x2={262} y1={y(mrsdBurden)} y2={y(mrsdBurden)} className="s33-mrsd" />
            <text x={266} y={y(mrsdBurden) + (Math.abs(mrsdBurden - limit) < 6 ? 16 : 4)} className="s33-tx sm">MRSD {indFmtMg(mrsd!)}</text>
          </>
        )}
        {IND_FORMS.map((f) => {
          const pk = Dt * rules.formulationPeak[f];
          const pts = Array.from({ length: 97 }, (_, i) => i / 4).map((t) => `${x(t).toFixed(1)},${y(pk * Math.min(1, SHAPE[f](t))).toFixed(1)}`);
          const tPk = f === 'iv' ? 0.15 : f === 'oral' ? Math.log(6) : 24;
          const me = f === p.knobs.form;
          return (
            <g key={f} className={me ? 's33-cur me' : 's33-cur'}>
              <polyline points={pts.join(' ')} className={`s33-line s33-f-${f}`} strokeDasharray={DASH[f]} />
              <Shape form={f} x={x(tPk)} y={y(pk)} r={me ? 6 : 4.5} />
            </g>
          );
        })}
        <line x1={34} x2={34} y1={18} y2={196} className="s33-axis" />
        <line x1={34} x2={262} y1={196} y2={196} className="s33-axis" />
      </Fig>
      <ul className="s33-legend">
        {IND_FORMS.map((f) => {
          const pk = Dt * rules.formulationPeak[f];
          return (
            <li key={f}>
              <span aria-hidden="true" className={`s33-mk s33-t-${f}`}>{FORM[f].mark}</span> {FORM[f].short} — {fillIndCopy(T.peakTop, { pk: f1(pk), dt: Dt, k: rules.formulationPeak[f].toFixed(2) })} {pk > limit ? T.peakOver : T.peakUnder}
            </li>
          );
        })}
      </ul>
      <p className="hint">{fillIndCopy(T.peakLimit, { v: f1(limit), min: rules.thresholds.ind, rk: rk.toFixed(2) })}{mrsd !== undefined ? ` · ${fillIndCopy(T.peakMrsd, { form: FORM[p.knobs.form].short, mrsd: indFmtMg(mrsd) })}` : ''}</p>
      <p className="hint">{T.peakConcept}</p>
    </div>
  );
}

// ── 6.07 용량-반응 3장 ──
export function ToolDose(p: ToolProps) {
  if (!p.cand.grid) return <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>;
  const th = p.data.rules.thresholds;
  const x = lin(0, 100, 26, 190);
  const y = lin(0, 100, 140, 14);
  return (
    <div className="s33-tool">
      <KnobBar {...p} show={['candidate', 'population']} />
      <div className="s33-multi">
        {IND_FORMS.map((f) => {
          const pts = IND_DOSES.map((d) => ({ d, c: cellOf(p, f, d)! }));
          const mrsd = p.cand.animal?.mrsdMgByForm[f];
          return (
            <figure key={f} className="s33-card">
              <figcaption className="mini"><b><span aria-hidden="true" className={`s33-mk s33-t-${f}`}>{FORM[f].mark}</span> {FORM[f].short}</b> · {fillIndCopy(T.dosePeak, { k: p.data.rules.formulationPeak[f].toFixed(2) })}</figcaption>
              <Fig w={200} h={170} label={fillIndCopy(T.doseFig, { form: FORM[f].short, e: pts.map((q) => f1(q.c.efficacy)).join(' · '), s: pts.map((q) => f1(q.c.safety)).join(' · ') })}>
                <rect x={26} y={14} width={164} height={126} className="s33-plot" />
                <line x1={26} x2={190} y1={y(th.ind)} y2={y(th.ind)} className="s33-limit" />
                <text x={28} y={y(th.ind) - 3} className="s33-tx xs s33-bad">S {th.ind}</text>
                {mrsd !== undefined && (
                  <>
                    <line x1={x(Math.min(100, mrsd))} x2={x(Math.min(100, mrsd))} y1={14} y2={140} className="s33-mrsd" />
                    <text x={x(Math.min(100, mrsd)) + (mrsd > 80 ? -3 : 3)} y={24} textAnchor={mrsd > 80 ? 'end' : 'start'} className="s33-tx xs">MRSD {mrsd > 100 ? '> 100' : indFmtMg(mrsd)}</text>
                  </>
                )}
                <polyline points={pts.map((q) => `${x(q.d)},${y(q.c.efficacy).toFixed(1)}`).join(' ')} className="s33-line e" />
                <polyline points={pts.map((q) => `${x(q.d)},${y(q.c.safety).toFixed(1)}`).join(' ')} className="s33-line s" strokeDasharray="5 3" />
                {pts.map((q) => {
                  const me = f === p.knobs.form && q.d === p.knobs.dose;
                  return (
                    <g key={q.d}>
                      {me && <rect x={x(q.d) - 9} y={14} width={18} height={126} className="s33-me" />}
                      <circle cx={x(q.d)} cy={y(q.c.efficacy)} r={3.5} className="s33-dot e" />
                      <rect x={x(q.d) - 3.5} y={y(q.c.safety) - 3.5} width={7} height={7} className="s33-dot s" />
                      <text x={x(q.d)} y={156} textAnchor="middle" className="s33-tx xs mu">{q.d}</text>
                      <text x={x(q.d)} y={167} textAnchor="middle" className={`s33-tx xs b ${q.c.safety >= th.ind ? 's33-good' : 's33-bad'}`}>{q.c.safety >= th.ind ? '✓' : '✕'}</text>
                    </g>
                  );
                })}
              </Fig>
              <p className="mini mono s33-vals">{pts.map((q) => `${q.d}: E ${f1(q.c.efficacy)} · S ${f1(q.c.safety)}`).join(' / ')}</p>
            </figure>
          );
        })}
      </div>
      <div className="chips"><span className="chip">{T.doseLegendE}</span><span className="chip">{T.doseLegendS}</span><span className="chip">{fillIndCopy(T.doseLegendOk, { ind: th.ind })}</span></div>
    </div>
  );
}

// ── 6.02 E–S 평면(점을 눌러 조합 고르기) ──
export function ToolPlane(p: ToolProps) {
  if (!p.cand.grid) return <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>;
  const th = p.data.rules.thresholds;
  const x = lin(0, 100, 40, 346);
  const y = lin(0, 100, 262, 14);
  const cells = IND_FORMS.flatMap((f) => IND_DOSES.map((d) => cellOf(p, f, d)!));
  const pick = cellOf(p);
  const choose = (c: IndScoreCell) => p.setKnobs((k) => ({ ...k, form: c.form, dose: c.dose }));
  const onKey = (e: KeyboardEvent, c: IndScoreCell) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(c);
    }
  };
  const same = p.applied && pick && p.applied.form === pick.form && p.applied.dose === pick.dose;
  // 같은 자리에 겹친 점(예: S 0 에 깔린 경구 · 정맥 100 mg)은 옆으로 비켜 그린다 — 겹치면 아래 점을 누를 수 없다.
  const seenAt = new Map<string, number>();
  const pos = new Map<IndScoreCell, { cx: number; cy: number }>();
  for (const c of cells) {
    const key = `${Math.round(x(c.safety) / 6)}:${Math.round(y(c.efficacy) / 6)}`;
    const n = seenAt.get(key) ?? 0;
    seenAt.set(key, n + 1);
    pos.set(c, { cx: x(c.safety) + n * 13, cy: y(c.efficacy) + n * 3 });
  }
  return (
    <div className="s33-tool">
      <KnobBar {...p} show={['candidate', 'population']} />
      <Fig w={360} h={290} label={T.planeFig} interactive>
        <rect x={x(0)} y={y(100)} width={x(th.ind) - x(0)} height={y(0) - y(100)} className="s33-zone-bad" />
        <text x={x(th.ind / 2)} y={y(6)} textAnchor="middle" className="s33-tx sm b s33-bad">{fillIndCopy(T.planeLow, { ind: th.ind })}</text>
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <text x={x(v)} y={y(0) + 14} textAnchor="middle" className="s33-tx xs mu">{v}</text>
            <text x={x(0) - 5} y={y(v) + 3} textAnchor="end" className="s33-tx xs mu">{v}</text>
          </g>
        ))}
        <line x1={x(th.ind)} x2={x(th.ind)} y1={y(0)} y2={y(100)} className="s33-limit" />
        <text x={x(th.ind) + 3} y={y(100) + 9} className="s33-tx xs b s33-bad">IND {th.ind}</text>
        {[th.phase1, th.phase3S].map((v, i) => (
          <g key={`s${v}`}>
            <line x1={x(v)} x2={x(v)} y1={y(0)} y2={y(100)} className="s33-th ref" />
            <text x={x(v) + 3} y={y(100) + 9 + (i + 1) * 10} className="s33-tx xs mu">{i ? T.phase.phase3 : T.phase.phase1} {v}{T.planeRef}</text>
          </g>
        ))}
        {[th.phase2E, th.phase3E].map((v, i) => (
          <g key={`e${v}`}>
            <line x1={x(0)} x2={x(100)} y1={y(v)} y2={y(v)} className="s33-th ref" />
            <text x={x(100) - 2} y={y(v) - 3} textAnchor="end" className="s33-tx xs mu">{fillIndCopy(T.planeRefE, { v, phase: i ? T.phase.phase3 : T.phase.phase2 })}</text>
          </g>
        ))}
        <line x1={x(0)} x2={x(0)} y1={y(0)} y2={y(100)} className="s33-axis" />
        <line x1={x(0)} x2={x(100)} y1={y(0)} y2={y(0)} className="s33-axis" />
        <text x={x(50)} y={286} textAnchor="middle" className="s33-tx sm b">{T.planeAxisS}</text>
        <text x={10} y={y(50)} textAnchor="middle" transform={`rotate(-90 10 ${y(50)})`} className="s33-tx sm b">{T.planeAxisE}</text>
        {IND_FORMS.map((f) => (
          <polyline key={f} points={IND_DOSES.map((d) => cellOf(p, f, d)!).map((c) => `${x(c.safety).toFixed(1)},${y(c.efficacy).toFixed(1)}`).join(' ')} className={`s33-line thin s33-f-${f}`} strokeDasharray={DASH[f]} />
        ))}
        {p.applied?.form && p.applied.dose && (() => {
          const c = cellOf(p, p.applied.form, p.applied.dose);
          return c ? <circle cx={x(c.safety)} cy={y(c.efficacy)} r={13} className="s33-applied" /> : null;
        })()}
        {cells.map((c) => {
          const me = pick && c.form === pick.form && c.dose === pick.dose;
          const { cx, cy } = pos.get(c)!;
          return (
            <g
              key={`${c.form}-${c.dose}`}
              className={`s33-pt${me ? ' me' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={!!me}
              aria-label={`${FORM[c.form].short} ${c.dose} mg — E ${f1(c.efficacy)} · S ${f1(c.safety)} · ${c.safety >= th.ind ? T.planePtOk : T.planePtBad}`}
              onClick={() => choose(c)}
              onKeyDown={(e) => onKey(e, c)}
            >
              <circle cx={cx} cy={cy} r={14} className="s33-hit" />
              {me && <circle cx={cx} cy={cy} r={10} className="s33-ring" />}
              <Shape form={c.form} x={cx} y={cy} r={5.5} />
              <text x={cx + (c.form === 'iv' && cx > x(0) + 14 ? -8 : 8)} y={cy + (c.form === 'iv' ? 14 : -6)} textAnchor={c.form === 'iv' && cx > x(0) + 14 ? 'end' : 'start'} className="s33-tx xs">{c.dose}</text>
            </g>
          );
        })}
      </Fig>
      {pick && (
        <div className="acts">
          <span className="mini"><b>{fillIndCopy(T.planePick, { form: FORM[pick.form].short, dose: pick.dose, e: f1(pick.efficacy), s: f1(pick.safety) })}</b> {pick.safety >= th.ind ? '✓' : '✕'}</span>
          {p.onApply && (
            <button type="button" className="btn film sm" disabled={!!same || p.busy} onClick={() => p.onApply!(pick.form, pick.dose)}>
              {same ? T.planeApplied : T.planeApply}
            </button>
          )}
        </div>
      )}
      <MrsdLine cand={p.cand} knobs={p.knobs} />
    </div>
  );
}

// ── 6.03 공식 폭포 ──
interface Step {
  lab: string;
  sub: string;
  from: number;
  to: number;
  kind: 'start' | 'cut' | 'end';
  op: string;
}

function Waterfall({ steps, title, formula, ticks }: { steps: Step[]; title: string; formula: string; ticks: Array<{ v: number; t: string; main?: boolean }> }) {
  const y = lin(0, 100, 158, 52);
  const gap = Math.min(58, 300 / steps.length);
  const bw = gap * 0.68;
  return (
    <Fig w={360} h={206} label={`${title} — ${steps.map((s) => `${s.lab} ${s.op || f1(s.to)}`).join(', ')}`}>
      <text x={4} y={12} className="s33-tx sm b">{title}</text>
      <text x={4} y={27} className="s33-tx xs mu mono">{formula}</text>
      <line x1={8} x2={352} y1={158} y2={158} className="s33-axis" />
      {ticks.map((t) => (
        <g key={t.t}>
          <line x1={8} x2={312} y1={y(t.v)} y2={y(t.v)} className={t.main ? 's33-limit' : 's33-th ref'} />
          <text x={352} y={y(t.v) + 3} textAnchor="end" className={`s33-tx xs${t.main ? ' b s33-bad' : ' mu'}`}>{t.t}</text>
        </g>
      ))}
      {steps.map((s, i) => {
        const x0 = 14 + i * gap;
        const top = y(Math.max(s.from, s.to));
        const bot = y(Math.min(s.from, s.to));
        return (
          <g key={s.lab}>
            <rect x={x0} y={top} width={bw} height={Math.max(1.5, bot - top)} rx={3} className={`s33-wf ${s.kind}`} />
            {i < steps.length - 1 && s.kind !== 'end' && <line x1={x0 + bw} x2={x0 + gap} y1={y(s.to)} y2={y(s.to)} className="s33-conn" />}
            <text x={x0 + bw / 2} y={top - 4} textAnchor="middle" className={`s33-tx xs${s.kind === 'cut' ? ' s33-bad' : ' b'}`}>{s.kind === 'cut' ? s.op : f1(s.to)}</text>
            <text x={x0 + bw / 2} y={172} textAnchor="middle" className="s33-tx xs b">{s.lab}</text>
            <text x={x0 + bw / 2} y={184} textAnchor="middle" className="s33-tx xs mu">{s.sub}</text>
          </g>
        );
      })}
    </Fig>
  );
}

export function ToolWaterfall(p: ToolProps) {
  const cell = cellOf(p);
  const sig = p.cand.signals;
  if (!cell || !sig) return <p className="empty">{p.cand.gridNote ?? T.noGrid}</p>;
  const th = p.data.rules.thresholds;
  const { p: pp, A, B, De, Dt, K, R } = cell.inputs;
  const eff = p.data.rules.efficacy;
  const fb = eff.base + eff.affinityWeight * pp;
  const eSteps: Step[] = [];
  let cur = 100;
  eSteps.push({ lab: W.start, sub: '', from: 0, to: 100, kind: 'start', op: '' });
  for (const [lab, m, sub] of [[W.affinity, fb, `p ${pp.toFixed(2)}`], [W.absorb, A, FORM[p.knobs.form].short], [W.brain, B, IND_COPY.levels[sig.bbb] ?? ''], [W.doseE, De, `${p.knobs.dose} mg`]] as Array<[string, number, string]>) {
    const prev = cur;
    cur = cur * m;
    eSteps.push({ lab, sub, from: prev, to: cur, kind: 'cut', op: `×${m.toFixed(2)}` });
  }
  eSteps.push({ lab: 'E', sub: '', from: 0, to: cell.efficacy, kind: 'end', op: '' });
  const hergW = p.data.rules.risk.herg[sig.herg];
  const hepW = p.data.rules.risk.hepatotoxicity[sig.hepatotoxicity];
  const sSteps: Step[] = [{ lab: W.start, sub: '', from: 0, to: 100, kind: 'start', op: '' }];
  cur = 100;
  for (const [lab, v, sub] of [[W.doseS, Dt, `${p.knobs.dose} mg`], [W.herg, Dt * hergW, IND_COPY.levels[sig.herg] ?? ''], [W.liver, Dt * hepW, IND_COPY.levels[sig.hepatotoxicity] ?? ''], [W.peak, Dt * R * (K - 1), `×${K.toFixed(2)}`]] as Array<[string, number, string]>) {
    const prev = cur;
    cur = cur - v;
    sSteps.push({ lab, sub, from: prev, to: cur, kind: 'cut', op: Math.abs(v) < 0.05 ? '0' : v > 0 ? `−${f1(v)}` : `+${f1(-v)}` });
  }
  sSteps.push({ lab: 'S', sub: '', from: 0, to: cell.safety, kind: 'end', op: '' });
  return (
    <div className="s33-tool">
      <KnobBar {...p} show={['form', 'dose']} />
      <Waterfall steps={eSteps} title={T.waterfallE} formula={`100 × (${eff.base} + ${eff.affinityWeight}p) × A × B × De`} ticks={[{ v: th.phase3E, t: `${T.phase.phase3} ${th.phase3E}` }]} />
      <Waterfall steps={sSteps} title={T.waterfallS} formula={`100 − Dt × (1 + hERG + ${W.liver}) × K`} ticks={[{ v: th.ind, t: `IND ${th.ind}`, main: true }, { v: th.phase1, t: `${T.phase.phase1} ${th.phase1}` }]} />
      <ul className="s33-reasons mini">
        {cell.safetyReasons.slice(1, 3).map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
}

export const TOOL_VIEW: Record<ToolId, (p: ToolProps) => ReactNode> = {
  lab: ToolLab,
  seesaw: ToolSeesaw,
  peak: ToolPeak,
  dose: ToolDose,
  plane: ToolPlane,
  waterfall: ToolWaterfall,
};
