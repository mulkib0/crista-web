/**
 * 2.2 ADMET 예측 · 특허 후보 — 왼쪽 '내 작업대' = ADMET 실행(2.1 대기열 분자만) + 리드 읽기 도구 4종
 * (물성 레이더 4.02 · 신호등 표 4.03 · 몸속 여행 지도 4.04 · 점수 분해 사슬 4.10), 오른쪽 '모둠 공유' = 특허 후보(`lead_candidates` —
 * 1인 1개(2명 이하 모둠 2개) · 모둠 4 · 근거 칩 7종) · ADMET-AI 레이더(참고)(설계 §5.7 · §6.3).
 * W3 의 '주력 리드 · 백업 지정' 은 3.2 전임상 끝으로 옮겼다(F32) — 여기서는 특허 후보만 고른다.
 * 효능 E · 안전 S 는 서버가 game-rules 같은 함수로 낸 '흔들림 전 예상치'다(화면은 그리기만).
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  API,
  BASE_DOSE,
  BASE_FORM,
  candidateReasonsFor,
  candidateReasonVerdict,
  LEGACY_LEAD_REASONS,
  RADAR_AXES,
  SCORE_DOSES,
  SCORE_FORMS,
  SELECTION_API,
  SELECTION_COPY as C,
  type AdmetView,
  type BoardResponse,
  type CandidateReason,
  type ScoreCell,
  type SelectionResponse,
} from '@crista-web/web-contract';
import { api, newRequestId } from '../../api.ts';
import { money } from '../../ink.ts';
import { By, JobState } from '../parts.tsx';
import { Confirm, Panel, ReasonChips, useBenchState, useLocalTab } from '../ui/index.ts';
import { StepLayout, useAction, type StepProps } from './common.tsx';
import { fmtKcal, KnownChip, OriginChip, useSelection } from './s21.tsx';
import './s22.css';

type Formulation = (typeof SCORE_FORMS)[number];
type DoseMg = (typeof SCORE_DOSES)[number];

const FORM_LABEL: Record<Formulation, string> = C.s22.form;
const AXIS_LABEL: Record<(typeof RADAR_AXES)[number]['key'], string> = C.s22.axis;
const LV = C.s22.level;
const SG = C.s22.signal;
type Tone = 'g' | 'w' | 'b';
const MARK: Record<Tone, string> = { g: '●', w: '▲', b: '■' };

const cellOf = (row: AdmetView, form: Formulation = BASE_FORM, dose: DoseMg = BASE_DOSE): ScoreCell | undefined => row.scores.find((c) => c.form === form && c.dose === dose);
const nameOf = (row: AdmetView) => (row.isReference ? `${C.s22.reference} · ${row.label ?? ''}` : (row.label ?? row.smiles).slice(0, 22));

function Light({ tone, text }: { tone: Tone; text: string }) {
  return <span className={`sig ${tone}`}><span aria-hidden="true">{MARK[tone]} </span>{text}</span>;
}

/** 신호등 표(4.03)의 신호 5개 — 설계 §5.7 표 그대로(경구 흡수 · 뇌 노출 · 심장 hERG · 간독성 · 경피 투과). */
function signalCells(row: AdmetView, cns: boolean): Array<{ key: string; label: string; tone: Tone; text: string }> {
  const s = row.signals;
  if (!s) return [];
  const risk = (v: 'low' | 'moderate' | 'high'): Tone => (v === 'low' ? 'g' : v === 'moderate' ? 'w' : 'b');
  return [
    { key: 'oral', label: SG.oral, tone: s.oralAbsorption === 'good' ? 'g' : s.oralAbsorption === 'moderate' ? 'w' : 'b', text: LV[s.oralAbsorption] },
    { key: 'bbb', label: cns ? SG.bbb : SG.bbbRef, tone: s.bbb === 'high' ? 'g' : s.bbb === 'moderate' ? 'w' : 'b', text: LV[s.bbb] },
    { key: 'herg', label: SG.herg, tone: risk(s.herg), text: LV[s.herg] },
    { key: 'hep', label: SG.hep, tone: risk(s.hepatotoxicity), text: LV[s.hepatotoxicity] },
    { key: 'td', label: SG.td, tone: s.transdermal === 'suitable' ? 'g' : 'b', text: LV[s.transdermal] },
  ];
}

// ── 4.02 물성 레이더 ──

function Radar({ row }: { row: AdmetView }) {
  const p = row.props!;
  const cx = 112;
  const cy = 112;
  const R = 70;
  const n = RADAR_AXES.length;
  const ang = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
  const rr = (ax: (typeof RADAR_AXES)[number], v: number) => R * Math.max(0.04, Math.min(1.1, (v - ax.min) / (ax.max - ax.min)));
  const pt = (i: number, r: number) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const;
  const ring = (f: (ax: (typeof RADAR_AXES)[number]) => number) => RADAR_AXES.map((ax, i) => pt(i, f(ax)).map((v) => v.toFixed(1)).join(',')).join(' ');
  const out = new Set(row.radarOut);
  const label = `${nameOf(row)} ${C.s22.tabs.radar} — ${RADAR_AXES.map((ax) => `${AXIS_LABEL[ax.key]} ${p[ax.key]}${out.has(ax.key) ? C.s22.ui.outMark : ''}`).join(', ')}`;
  return (
    <svg viewBox="0 0 224 228" role="img" aria-label={label} className="sel-svg radar">
      {[0.5, 1].map((q) => <polygon key={q} points={ring(() => R * q)} className="rd-grid" />)}
      {RADAR_AXES.map((ax, i) => { const [x, y] = pt(i, R); return <line key={ax.key} x1={cx} y1={cy} x2={x} y2={y} className="rd-grid" />; })}
      <path d={`M${ring((ax) => rr(ax, ax.hi)).replace(/ /g, ' L')} Z M${ring((ax) => rr(ax, ax.lo)).replace(/ /g, ' L')} Z`} className="rd-band" fillRule="evenodd" />
      <polygon points={ring((ax) => rr(ax, p[ax.key]))} className="rd-mol" />
      {RADAR_AXES.map((ax, i) => {
        const [x, y] = pt(i, rr(ax, p[ax.key]));
        const [lx, ly] = pt(i, R + 16);
        const bad = out.has(ax.key);
        return (
          <g key={ax.key}>
            {bad ? <rect x={x - 5} y={y - 5} width={10} height={10} className="rd-bad" /> : <circle cx={x} cy={y} r={3.2} className="rd-pt" />}
            <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 5 ? 'middle' : lx > cx ? 'start' : 'end'} className={bad ? 'rd-lab bad' : 'rd-lab'}>{AXIS_LABEL[ax.key]}{bad ? ' ✕' : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Radars({ rows }: { rows: AdmetView[] }) {
  return (
    <div className="sel-radars" role="list">
      {rows.map((row) => (
        <figure key={row.jobId ?? 'ref'} role="listitem" className={row.isReference ? 'ref' : ''}>
          <figcaption><b>{nameOf(row)}</b></figcaption>
          {row.props ? <Radar row={row} /> : <p className="hint">{C.s22.noProps}</p>}
          <p className="mini" style={{ margin: 0 }}>
            {row.radarOut.length === 0 ? <Light tone="g" text={C.s22.radarAllIn} /> : <Light tone="b" text={C.s22.radarOut(row.radarOut.length, row.radarOut.map((k) => `${AXIS_LABEL[k]} ${row.props?.[k] ?? ''}`).join(' · '))} />}
          </p>
        </figure>
      ))}
    </div>
  );
}

// ── 4.03 신호등 표 ──

function Lights({ rows, cns }: { rows: AdmetView[]; cns: boolean }) {
  const CL = C.s22.cols;
  const heads = signalCells(rows.find((r) => r.signals) ?? rows[0]!, cns);
  return (
    <>
      <div className="tbl-w"><table className="sel-lights">
        <thead><tr><th>{CL.mol}</th><th className="num">{CL.p}</th>{heads.map((h) => <th key={h.key}>{h.label}</th>)}<th className="num">{CL.e}<small>{CL.base}</small></th><th className="num">{CL.s}<small>{CL.base}</small></th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const cell = cellOf(row);
            return (
              <tr key={row.jobId ?? 'ref'} className={row.isReference ? 'ref' : ''}>
                <td><b className="mini">{nameOf(row)}</b>{!row.isReference && <div className="mini muted">{row.byName}</div>}</td>
                <td className="num">{row.p.toFixed(2)}</td>
                {row.signals ? signalCells(row, cns).map((c) => <td key={c.key}><Light tone={c.tone} text={c.text} /></td>) : <td colSpan={heads.length} className="mini muted">{C.s22.noProps}</td>}
                <td className="num">{cell ? cell.efficacy.toFixed(1) : '—'}</td>
                <td className="num">{cell ? cell.safety.toFixed(1) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <ul className="sel-legend mini" aria-label={C.s22.ui.legendNote}>
        <li><Light tone="g" text={C.s22.lightsLegend.good} /> {C.s22.lightsLegend.goodWhat}</li>
        <li><Light tone="w" text={C.s22.lightsLegend.mid} /></li>
        <li><Light tone="b" text={C.s22.lightsLegend.bad} /> {C.s22.lightsLegend.badWhat}</li>
      </ul>
    </>
  );
}

// ── 고르기 단추(분자 · 제형 · 용량) ──

function Pick<T extends string | number>({ label, items, value, onChange, text }: { label: string; items: readonly T[]; value: T; onChange: (v: T) => void; text: (v: T) => string }) {
  return (
    <div className="chips sel-pick" role="group" aria-label={label}>
      <span className="lab">{label}</span>
      {items.map((v) => <button key={String(v)} type="button" className="rchip" aria-pressed={v === value} onClick={() => onChange(v)}>{text(v)}</button>)}
    </div>
  );
}

// ── 4.04 몸속 여행 지도 ──

function Trip({ row, cns, indMin }: { row: AdmetView; cns: boolean; indMin: number }) {
  const cell = cellOf(row);
  const n = row.notes;
  if (!cell || !n || !row.signals) return <p className="hint">{C.s22.noProps}</p>;
  const i = cell.inputs;
  const after = (s: string) => s.split(' — ')[1] ?? s;
  const tone = (v: number): Tone => (v >= 0.95 ? 'g' : v >= 0.7 ? 'w' : 'b');
  const TP = C.s22.trip;
  const stops: Array<{ k: string; title: string; text: string; bar?: number; value: string; tone?: Tone }> = [
    { k: 'mouth', title: TP.mouth, text: TP.mouthDose(BASE_DOSE), value: `De ${i.De.toFixed(2)}` },
    { k: 'gut', title: TP.gut, text: `${SG.oral} ${LV[row.signals.oralAbsorption]} · ${after(n.oralAbsorption)}`, bar: i.A, value: `A = ${i.A.toFixed(2)} · ${TP.gutReach(Math.round(i.A * 100))}`, tone: tone(i.A) },
    { k: 'blood', title: TP.blood, text: TP.bloodNote, value: '' },
    cns
      ? { k: 'brain', title: TP.brainCns, text: `${SG.bbb} ${LV[row.signals.bbb]} · ${after(n.bbb)}`, bar: i.B, value: `B = ${i.B.toFixed(2)}`, tone: tone(i.B) }
      : { k: 'brain', title: TP.brainNotCns, text: TP.brainNotCnsNote, value: `B = ${i.B.toFixed(2)}` },
    { k: 'heart', title: TP.heart, text: `${SG.herg} ${LV[row.signals.herg]} · ${after(n.herg)}`, value: `R +${i.herg.toFixed(2)} → S −${(i.Dt * i.herg * i.K).toFixed(1)}`, tone: row.signals.herg === 'low' ? 'g' : row.signals.herg === 'moderate' ? 'w' : 'b' },
    { k: 'liver', title: TP.liver, text: `${SG.hep} ${LV[row.signals.hepatotoxicity]} · ${after(n.hepatotoxicity)}`, value: `R +${i.liver.toFixed(2)} → S −${(i.Dt * i.liver * i.K).toFixed(1)} · R = ${i.R.toFixed(2)}`, tone: row.signals.hepatotoxicity === 'low' ? 'g' : row.signals.hepatotoxicity === 'moderate' ? 'w' : 'b' },
  ];
  return (
    <div className="sel-trip">
      <ol className="trip-path">
        {stops.map((s) => (
          <li key={s.k} className={s.tone ? `t-${s.tone}` : ''}>
            <b>{s.tone && <span aria-hidden="true">{MARK[s.tone]} </span>}{s.title}</b>
            <span className="mini">{s.text}</span>
            {s.bar !== undefined && <span className="trip-bar" aria-hidden="true"><i style={{ width: `${Math.round(s.bar * 100)}%` }} /></span>}
            {s.value && <span className="mini mono">{s.value}</span>}
          </li>
        ))}
      </ol>
      <div className="trip-out">
        <div className="trip-box film">
          <span className="mini mono">E = (0.3 + 0.7p) × A × B × De × 100</span>
          <b className="mono">{cell.efficacy.toFixed(1)}</b>
          <span className="mini mono">p {i.p.toFixed(2)} · A {i.A.toFixed(2)} · B {i.B.toFixed(2)} · De {i.De.toFixed(2)}</span>
        </div>
        <div className="trip-box">
          <span className="mini mono">S = 100 − Dt × R × K</span>
          <b className="mono">{cell.safety.toFixed(1)}</b>
          <span className="mini mono">Dt {i.Dt} × {i.R.toFixed(2)} × {i.K.toFixed(2)} = {TP.cut((i.Dt * i.R * i.K).toFixed(1))}</span>
          <span className={`mini ${cell.safety >= indMin ? 'hint good' : 'hint bad'}`}>{cell.safety >= indMin ? `✓ ${TP.indPass(indMin)}` : `✕ ${TP.indFail(indMin)}`}</span>
        </div>
      </div>
    </div>
  );
}

// ── 4.10 점수 분해 사슬 ──

function Chain({ row, indMin }: { row: AdmetView; indMin: number }) {
  const [form, setForm] = useBenchState<Formulation>('s22:form', BASE_FORM);
  const [dose, setDose] = useBenchState<DoseMg>('s22:dose', BASE_DOSE);
  const cell = cellOf(row, form, dose);
  if (!cell) return <p className="hint">{C.s22.noProps}</p>;
  const i = cell.inputs;
  const pstep = 0.3 + 0.7 * i.p;
  const CH = C.s22.chain;
  const eParts = [
    { k: 'p', top: CH.fromP, v: pstep, bot: `0.3 + 0.7 × p ${i.p.toFixed(2)}` },
    { k: 'A', top: CH.absorb(FORM_LABEL[form]), v: i.A, bot: 'A' },
    { k: 'B', top: CH.brain, v: i.B, bot: 'B' },
    { k: 'De', top: `${dose} mg`, v: i.De, bot: CH.doseEffect },
  ];
  const weakest = eParts.reduce((a, b) => (b.v < a.v ? b : a));
  const cut = i.Dt * i.R * i.K;
  return (
    <>
      <Pick label={CH.form} items={SCORE_FORMS} value={form} onChange={setForm} text={(f) => FORM_LABEL[f]} />
      <Pick label={CH.dose} items={SCORE_DOSES} value={dose} onChange={setDose} text={(d) => `${d} mg`} />
      <p className="lab" style={{ marginTop: 12 }}>{CH.eHead}</p>
      <div className="chain" role="list" aria-label={`${CH.eResult} ${cell.efficacy.toFixed(1)} = ${eParts.map((p) => `${p.bot} ${p.v.toFixed(2)}`).join(' × ')} × 100`}>
        {eParts.map((p, idx) => (
          <span key={p.k} className="chain-i" role="listitem">
            {idx > 0 && <i className="op" aria-hidden="true">×</i>}
            <span className={`blk${p.k === weakest.k && p.v < 1 ? ' weak' : ''}`}>
              <small>{p.top}</small><b className="mono">{p.v.toFixed(2)}</b><small>{p.bot}{p.k === weakest.k && p.v < 1 ? CH.weakest : ''}</small>
            </span>
          </span>
        ))}
        <span className="chain-i" role="listitem"><i className="op" aria-hidden="true">× 100 =</i><span className="blk res"><small>{CH.eResult}</small><b className="mono">{cell.efficacy.toFixed(1)}</b></span></span>
      </div>
      <p className="lab" style={{ marginTop: 12 }}>{CH.sHead}</p>
      <div className="chain" role="list" aria-label={`${C.s22.cols.s} ${cell.safety.toFixed(1)} = 100 − ${i.Dt} × ${i.R.toFixed(2)} × ${i.K.toFixed(2)}`}>
        <span className="chain-i" role="listitem"><span className="blk"><small>{CH.intact}</small><b className="mono">100</b></span></span>
        <span className="chain-i" role="listitem"><i className="op" aria-hidden="true">−</i><span className="blk"><small>{CH.burden(dose)}</small><b className="mono">{i.Dt}</b><small>Dt</small></span></span>
        <span className="chain-i" role="listitem"><i className="op" aria-hidden="true">×</i><span className={`blk${i.R > 1 ? ' weak' : ''}`}><small>{CH.risk}</small><b className="mono">{i.R.toFixed(2)}</b><small>{CH.riskFormula}</small></span></span>
        <span className="chain-i" role="listitem"><i className="op" aria-hidden="true">×</i><span className="blk"><small>{FORM_LABEL[form]}</small><b className="mono">{i.K.toFixed(2)}</b><small>{CH.formK}</small></span></span>
        <span className="chain-i" role="listitem"><i className="op" aria-hidden="true">=</i><span className={`blk res ${cell.safety >= indMin ? 'ok' : 'bad'}`}><small>{CH.sResult(cut.toFixed(1))}</small><b className="mono">{cell.safety.toFixed(1)}</b><small>{cell.safety >= indMin ? `✓ ${C.s22.trip.indPass(indMin)}` : `✕ ${C.s22.trip.indFail(indMin)}`}</small></span></span>
      </div>
    </>
  );
}

// ── 오른쪽: 특허 후보 ──

function Candidates({ board, sel, onChanged }: { board: BoardResponse; sel: SelectionResponse; onChanged: () => void }) {
  const act = useAction();
  const [pick, setPick] = useBenchState<string | null>('s22:cand', null);
  const [reason, setReason] = useState<CandidateReason | null>(null);
  const [ask, setAsk] = useState(false);
  const me = board.account.userId;
  const taken = new Set(sel.candidates.map((c) => c.jobId));
  const options = sel.admet.filter((a) => a.status === 'succeeded' && a.jobId && !taken.has(a.jobId));
  const row = options.find((a) => a.jobId === pick) ?? null;
  const mine = sel.candidates.filter((c) => c.userId === me).length;
  const mineFull = mine >= sel.limits.leadPerPerson;
  const teamFull = sel.candidates.length >= sel.limits.leadPerTeam;
  const best = useMemo(() => {
    // 서버 bestEfficacy 와 같은 재료 — 기준 약 줄 · 실패 줄 제외.
    const es = sel.admet.filter((a) => a.status === 'succeeded' && !a.isReference).map((a) => cellOf(a)?.efficacy).filter((e): e is number => typeof e === 'number');
    return es.length ? Math.max(...es) : null;
  }, [sel.admet]);
  const verdict = row && reason
    ? candidateReasonVerdict(reason, { signals: row.signals, radarOut: row.radarOut.length, efficacy: cellOf(row)?.efficacy ?? null, safety: cellOf(row)?.safety ?? null, bestEfficacy: best, cns: sel.cns, indSafetyMin: sel.indSafetyMin })
    : null;
  const submit = () =>
    void act.run(async () => {
      setAsk(false);
      await api.post(SELECTION_API.leadCandidates, { admetJobId: row!.jobId, reason });
      setReason(null);
      setPick(null);
      onChanged();
    });
  const labelOf = (jobId: string) => sel.admet.find((a) => a.jobId === jobId);
  return (
    <Panel title={C.s22.candTitle} sub={C.s22.candSub(sel.candidates.length, sel.limits.leadPerTeam, sel.limits.leadPerPerson)} id="go-s22-cand">
      {sel.candidates.length === 0 ? <p className="empty">{C.s22.candEmpty}</p> : (
        <ul className="sel-list">
          {sel.candidates.map((c) => {
            const a = labelOf(c.jobId);
            return (
              <li key={c.jobId}>
                <By name={c.byName} avatar={c.avatar} />
                <b>{a ? nameOf(a) : '—'}</b>
                {a && <span className="mono">E {cellOf(a)?.efficacy.toFixed(1) ?? '—'} · S {cellOf(a)?.safety.toFixed(1) ?? '—'}</span>}
                <span className="mini">{C.s22.ui.reasonOf((C.leadReasonLabel as Record<string, string>)[c.reason] ?? ((LEGACY_LEAD_REASONS as readonly string[]).includes(c.reason) ? C.s22.candLegacyLabel : c.reason))}</span>
                {c.known && <KnownChip known={a?.known ?? 'approved'} />}
                {c.userId === me && <button type="button" className="btn sm" disabled={act.busy} onClick={() => void act.run(async () => { await api.del(SELECTION_API.leadCandidate(c.jobId)); onChanged(); })}>{C.s22.remove}</button>}
              </li>
            );
          })}
        </ul>
      )}
      {sel.candidates.some((c) => (LEGACY_LEAD_REASONS as readonly string[]).includes(c.reason)) && <p className="mini muted">{C.s22.candLegacy}</p>}
      <p className="mini muted">{C.s22.candNote(sel.limits.leadPerTeam, board.maxPatentsPerTeam)}</p>
      {(mineFull || teamFull) && <p className="hint">{teamFull ? C.s22.candLimitTeam(sel.limits.leadPerTeam) : C.s22.candLimitMine(sel.limits.leadPerPerson)}</p>}
      <div className="fld">
        <label className="lab" htmlFor="s22-cand">{C.s22.candFrom}</label>
        <select id="s22-cand" className="txt" value={row?.jobId ?? ''} onChange={(e) => setPick(e.target.value || null)}>
          <option value="">{C.s22.ui.choose}</option>
          {options.map((a) => <option key={a.jobId!} value={a.jobId!}>{nameOf(a)} · E {cellOf(a)?.efficacy.toFixed(1) ?? '—'} · S {cellOf(a)?.safety.toFixed(1) ?? '—'} · {a.byName}</option>)}
        </select>
      </div>
      {row && <div className="chips" style={{ marginTop: 8 }}><OriginChip origin={row.origin} /><KnownChip known={row.known} /></div>}
      <div style={{ marginTop: 10 }}>
        <ReasonChips
          legend={C.s22.candLegend}
          chips={candidateReasonsFor(sel.cns).map((r) => ({ id: r, label: C.leadReasonLabel[r] }))}
          value={reason}
          onChange={(v) => setReason((v as CandidateReason | null) ?? null)}
          verdict={verdict}
          confirm={{
            label: C.s22.candButton,
            tone: 'film',
            busy: act.busy,
            disabled: !row || mineFull || teamFull,
            onClick: () => (row!.known ? setAsk(true) : submit()),
          }}
        />
      </div>
      {act.error && <p className="err" role="alert">{act.error}</p>}
      <Confirm open={ask} title={C.confirmKnown.title} confirmLabel={C.confirmKnown.ok} tone="film" busy={act.busy} onConfirm={submit} onCancel={() => setAsk(false)}>
        <p>{C.confirmKnown.body}</p>
      </Confirm>
    </Panel>
  );
}

// ── ADMET 실행(대기열 분자만) ──

function Run({ board, sel, step, onChanged }: { board: BoardResponse; sel: SelectionResponse; step: StepProps['step']; onChanged: () => void }) {
  const act = useAction();
  if (sel.picks.length === 0) return <Panel><p className="empty">{C.s22.runEmpty}</p></Panel>;
  return (
    <Panel title={C.s22.runTitle} sub={C.s22.runSub(sel.picks.length, money(board.costs['2.2']))} id="go-s22-run">
      <ul className="sel-list">
        {sel.picks.map((p) => {
          const d = sel.docked.find((x) => x.jobId === p.jobId);
          const job = d?.admetJobId ? board.jobs.find((j) => j.id === d.admetJobId) : undefined;
          return (
            <li key={p.jobId}>
              <b>{d ? (d.label ?? d.smiles).slice(0, 22) : '—'}</b>
              <span className="mono">ΔG {fmtKcal(d?.kcal)}</span>
              <span className="mini muted">{C.s22.runBy(p.byName)}</span>
              {job ? <JobState job={job} /> : (
                <button type="button" className="btn pri sm" disabled={act.busy || step.state === 'locked' || !d} onClick={() => void act.run(async () => {
                  await api.post(API.jobs, { requestId: newRequestId(), step: '2.2', params: { dockingJobId: p.jobId } });
                  onChanged();
                })}>{C.s22.runButton} <span className="cost">{money(board.costs['2.2'])}</span></button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="hint">{C.s22.runHint(money(board.costs['2.2']))}</p>
      {!sel.admet.some((a) => a.status === 'succeeded') && <p className="hint">{C.s22.empty}</p>}
      {act.error && <p className="err" role="alert">{act.error}</p>}
    </Panel>
  );
}

const TABS = ['run', 'radar', 'lights', 'trip', 'chain'] as const;
type Tab = (typeof TABS)[number];

export function Step22(props: StepProps) {
  const { board, step, reload } = props;
  const [tab, setTab] = useLocalTab<Tab>('step:2.2', TABS, 'run');
  const [focus, setFocus] = useBenchState<string | null>('s22:focus', null);
  const live = useSelection(board);
  const sel = live.data;
  const changed = () => {
    live.reload();
    reload();
  };
  const done = sel ? sel.admet.filter((a) => a.status === 'succeeded') : [];
  const rows = sel ? [...(sel.reference ? [sel.reference] : []), ...done] : [];
  const has = done.length > 0;
  const focused = done.find((a) => a.jobId === focus) ?? done[0] ?? null;
  const molPick = (
    <Pick label={C.s22.chain.mol} items={done.map((a) => a.jobId!)} value={focused?.jobId ?? ''} onChange={(id) => setFocus(id)} text={(id) => nameOf(done.find((a) => a.jobId === id)!)} />
  );
  const tool = (q: string, body: ReactNode) => <Panel plain><p className="sel-q">{q}</p>{body}</Panel>;
  const effectiveTab: Tab = has || tab === 'run' ? tab : 'run';

  return (
    <StepLayout
      {...props}
      tabs={[
        { id: 'run', label: C.s22.tabs.run, sub: sel ? C.s22.ui.queueTab(sel.picks.length) : undefined },
        { id: 'radar', label: C.s22.tabs.radar, disabled: !has },
        { id: 'lights', label: C.s22.tabs.lights, disabled: !has },
        { id: 'trip', label: C.s22.tabs.trip, disabled: !has },
        { id: 'chain', label: C.s22.tabs.chain, disabled: !has },
      ]}
      go={{ lead: has ? { spot: 'go-s22-cand' } : { tab: 'run', spot: 'go-s22-run' } }}
      tab={effectiveTab}
      onTab={(id) => setTab(id as Tab)}
      tabsLabel={C.s22.ui.tabsLabel}
      ratio={effectiveTab === 'run' ? 'team' : 'mine'}
      mine={
        <div className="s22">
          {!sel ? <Panel><p className="hint">{live.error ? live.error.message : C.s22.ui.loading}</p></Panel>
            : effectiveTab === 'run' ? <Run board={board} sel={sel} step={step} onChanged={changed} />
              : effectiveTab === 'radar' ? tool(C.s22.radarQ, <><Radars rows={rows} /><p className="mini muted">{C.s22.radarNote}</p><p className="mini muted">{C.s22.radarAxes}</p></>)
                : effectiveTab === 'lights' ? tool(C.s22.lightsQ, <Lights rows={rows} cns={sel.cns} />)
                  : effectiveTab === 'trip' && focused ? tool(C.s22.tripQ, <>{molPick}<Trip row={focused} cns={sel.cns} indMin={sel.indSafetyMin} /></>)
                    : effectiveTab === 'chain' && focused ? tool(C.s22.chainQ, <>{molPick}<Chain row={focused} indMin={sel.indSafetyMin} /></>)
                      : null}
        </div>
      }
      teamTitle={C.s22.ui.teamTitle}
      team={
        <div className="s22">
          {sel && <Candidates board={board} sel={sel} onChanged={changed} />}
          {sel && done.length > 0 && (
            <details className="sel-ai">
              <summary><b>{C.s22.aiTitle}</b></summary>
              <div className="tbl-w"><table>
                <thead><tr><th>{C.s22.cols.mol}</th>{(done[0]!.aiRadar).map((r) => <th key={r.axis}>{r.axis}</th>)}</tr></thead>
                <tbody>
                  {done.map((a) => (
                    <tr key={a.jobId!}><td className="mini"><b>{nameOf(a)}</b></td>{a.aiRadar.map((r) => <td key={r.axis} className="mini mono">{r.score} · {r.verdict}</td>)}</tr>
                  ))}
                </tbody>
              </table></div>
            </details>
          )}

        </div>
      }
    />
  );
}
