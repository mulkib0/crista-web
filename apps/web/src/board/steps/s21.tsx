/**
 * 2.1 분자 도킹 — 왼쪽 '내 작업대' = 분자 고치기 · 무료 미리보기 · 도킹 + 결과 읽기 도구 3종(수심계 눈금 3.05 · 점수 카드 3.09 · 10배 계단 3.07),
 * 오른쪽 '모둠 공유' = 찜 회고 줄 · 도킹 비교표 · 2.2 대기열(`dock_picks` — 1인 2 · 모둠 8 · 근거 칩)(설계 §5.6 · §5.5.1).
 * 도구는 모두 개인 · 무료 · 브라우저 그리기. 모둠 공유로 넘기는 길은 '대기열에 담기' 하나 — 근거를 서버가 같은 함수로 다시 판정한다.
 * 이 파일의 `useSelection` · `OriginChip` · `KnownChip` · `fmtKcal` 은 s22.tsx 도 쓴다(FSEL 소유).
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  API,
  DOCK_REASONS,
  dockReasonVerdict,
  foldFromDeltaDeltaG,
  KCAL_PER_DECADE,
  kdFromKcal,
  LEGACY_REASON,
  SCREEN_COPY,
  SELECTION_API,
  SELECTION_COPY as C,
  type BoardResponse,
  type DockedView,
  type DockReason,
  type KnownWhy,
  type MoleculeOrigin,
  type PropertiesResponse,
  type SelectionResponse,
  type WebJobView,
} from '@crista-web/web-contract';
import { api, message, newRequestId } from '../../api.ts';
import { money } from '../../ink.ts';
import { By, JobState } from '../parts.tsx';
import { Confirm, Panel, ReasonChips, useBenchState, useLive, useLocalTab } from '../ui/index.ts';
import { currentTarget, jobsOf, Next, NotesBlock, StepLayout, useAction, type StepProps } from './common.tsx';
import './s21.css';

// ── FSEL 공용(2.1 · 2.2) ──

/** 2.1 · 2.2 모둠 공유 자료 — 모둠 소식(board.changed)이 오면 다시 읽는다. 표적이 없으면 읽지 않는다. */
export function useSelection(board: BoardResponse) {
  return useLive<SelectionResponse>(board.program.targetId ? SELECTION_API.get : null, (m) => m.type === 'board.changed');
}

/** ΔG 표기 — 음수는 '−'(U+2212). */
export const fmtKcal = (v: number | null | undefined, d = 2): string => (v === null || v === undefined ? '—' : v < 0 ? `−${Math.abs(v).toFixed(d)}` : v.toFixed(d));

export function OriginChip({ origin }: { origin: MoleculeOrigin }) {
  const text = origin.kind === 'other' ? (origin.mechanism ? `${C.origin.other} · ${origin.mechanism}` : C.origin.other) : C.origin[origin.kind];
  const mark = origin.kind === 'this' ? '◎' : origin.kind === 'other' ? '△' : '?';
  return (
    <span className={`sel-origin ${origin.kind}`} title={origin.variant ? `${text} · ${C.origin.variant}` : text}>
      <span aria-hidden="true">{mark} </span>
      {text}
      {origin.variant && <> · {C.origin.variant}</>}
    </span>
  );
}

export function KnownChip({ known }: { known: KnownWhy | null }) {
  if (!known) return null;
  return (
    <span className="sel-known" title={`${C.known[known]} — ${C.known.hint}`}>
      <span aria-hidden="true">⊘ </span>
      {C.known.chip}
    </span>
  );
}

/** 라벨끼리 겹치지 않게 아래로 민 뒤, 아래 끝을 넘으면 위로 되민다. */
function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = new Array<number>(ys.length);
  let last = -Infinity;
  for (const o of order) {
    last = Math.max(o.y, last + gap, lo);
    out[o.i] = last;
  }
  const over = last - hi;
  if (over > 0) for (let i = 0; i < out.length; i++) out[i] = Math.max(lo, out[i]! - over);
  return out;
}

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
function Marker({ shape, x, y, r = 5 }: { shape: (typeof SHAPES)[number]; x: number; y: number; r?: number }) {
  if (shape === 'square') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} />;
  if (shape === 'triangle') return <path d={`M${x} ${y - r - 1} L${x + r + 1} ${y + r} L${x - r - 1} ${y + r} Z`} />;
  if (shape === 'diamond') return <path d={`M${x} ${y - r - 1} L${x + r + 1} ${y} L${x} ${y + r + 1} L${x - r - 1} ${y} Z`} />;
  return <circle cx={x} cy={y} r={r} />;
}

const shortName = (d: Pick<DockedView, 'label' | 'smiles'>) => (d.label ?? d.smiles).slice(0, 18);

// ── 3.05 수심계 눈금 ──

function Gauge({ sel, board }: { sel: SelectionResponse; board: BoardResponse }) {
  const g = sel.gauge!;
  const target = currentTarget(board);
  const W = 360;
  const H = 520;
  const yA = 34;
  const k = (H - yA - 26) / 14;
  const Y = (v: number) => yA - Math.max(-14, Math.min(0, v)) * k;
  const tx = 70;
  const people = board.members.map((m) => m.userId);
  const shapeOf = (userId: string) => SHAPES[Math.max(0, people.indexOf(userId)) % SHAPES.length]!;
  type M = { key: string; v: number; text: string; tone: 'bad' | 'good' | 'ink' | 'muted' | 'me'; line?: boolean; shape?: (typeof SHAPES)[number] };
  const T = C.s21.gaugeTag;
  const refName = target?.referenceLigand.name ?? '';
  // 그림 안은 짧은 이름표 + 값, 풀이(기준과의 관계 · 라이브러리 크기)는 그림 아래 목록(`notes`)에 한 줄씩.
  type Milestone = { key: string; v: number; text: string; note: string; tone: 'bad' | 'good' | 'ink' | 'muted'; line?: boolean };
  const milestones: Milestone[] = [
    ...(g.histamineKcal !== null ? [{ key: 'his', v: g.histamineKcal, text: `${T.histamine} ${fmtKcal(g.histamineKcal)}`, note: C.s21.gaugeHistamine(fmtKcal(g.histamineKcal)), tone: 'muted' as const }] : []),
    { key: 'p0', v: g.p0Kcal, text: `${T.p0} ${fmtKcal(g.p0Kcal)}`, note: C.s21.gaugeP0(fmtKcal(g.p0Kcal)), tone: 'bad', line: true },
    ...(g.medianKcal !== null ? [{ key: 'med', v: g.medianKcal, text: `${T.median} ${fmtKcal(g.medianKcal)}`, note: C.s21.gaugeMedian(g.libraryCount, fmtKcal(g.medianKcal)), tone: 'muted' as const }] : []),
    { key: 'ref', v: g.referenceKcal, text: `${T.ref} ${refName} ${fmtKcal(g.referenceKcal)}`, note: C.s21.gaugeRef(refName, fmtKcal(g.referenceKcal)), tone: 'ink', line: true },
    { key: 'p1', v: g.p1Kcal, text: `${T.p1} ${fmtKcal(g.p1Kcal)}`, note: C.s21.gaugeP1(fmtKcal(g.p1Kcal)), tone: 'good', line: true },
    ...(g.topKcal !== null ? [{ key: 'top', v: g.topKcal, text: `${T.top} ${fmtKcal(g.topKcal)}`, note: C.s21.gaugeTop(g.libraryCount, fmtKcal(g.topKcal)), tone: 'muted' as const }] : []),
  ];
  const dots = sel.docked.slice(0, 14);
  const marks: M[] = [
    ...milestones,
    ...dots.map((d) => ({ key: d.jobId, v: d.kcal, text: `${shortName(d)} ${fmtKcal(d.kcal)} · ${d.byName}`, tone: 'me' as const, shape: shapeOf(d.userId) })),
  ];
  const ly = spread(marks.map((m) => Y(m.v) + 4), 15, yA, H - 8);
  const desc = `${C.s21.gaugeAxis} — ${marks.map((m) => m.text).join(', ')}`;
  return (
    <figure className="sel-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} className="sel-svg gauge">
        <rect x={tx} y={yA} width={22} height={14 * k} rx={11} className="g-tube" />
        <rect x={tx} y={Y(g.p0Kcal)} width={22} height={Math.max(0, Y(g.p1Kcal) - Y(g.p0Kcal))} className="g-zone" />
        {Array.from({ length: 15 }, (_, i) => -i).map((v) => (
          <g key={v}>
            <line x1={tx - (v % 2 === 0 ? 10 : 5)} x2={tx} y1={Y(v)} y2={Y(v)} className="g-tick" />
            {v % 2 === 0 && <text x={tx - 14} y={Y(v) + 4} textAnchor="end" className="g-num">{fmtKcal(v, 0)}</text>}
          </g>
        ))}
        <text x={tx + 11} y={yA - 14} textAnchor="middle" className="g-num">{C.s21.ui.gaugeUnit}</text>
        <text x={8} y={Y(-1)} className="g-side">{C.s21.ui.shallow}</text>
        <text x={8} y={Y(-13)} className="g-side">{C.s21.ui.deep}</text>
        {marks.map((m, i) => {
          const y = Y(m.v);
          return (
            <g key={m.key} className={`g-m ${m.tone}`}>
              {m.line && <line x1={tx - 4} x2={tx + 26} y1={y} y2={y} className="g-line" />}
              {m.shape ? <Marker shape={m.shape} x={tx + 11} y={y} /> : <circle cx={tx + 11} cy={y} r={3} />}
              <polyline points={`${tx + 26},${y} ${tx + 40},${y} ${tx + 52},${ly[i]! - 4} ${tx + 56},${ly[i]! - 4}`} className="g-lead" />
              <text x={tx + 60} y={ly[i]} className="g-lab">{m.text}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mini muted">{C.s21.gaugeNote}</figcaption>
      <ul className="sel-notes mini">
        {milestones.map((m) => <li key={m.key} className={`g-m ${m.tone}`}>{m.note}</li>)}
        {dots.length > 0 && <li className="g-m me">{C.s21.gaugeDots(sel.docked.length)}</li>}
      </ul>
      <p className="mini muted">{C.s21.gaugeLegend}</p>
    </figure>
  );
}

// ── 3.09 점수 카드 ──

function Cards({ sel, onPick }: { sel: SelectionResponse; onPick: (jobId: string) => void }) {
  const picked = new Set(sel.picks.map((p) => p.jobId));
  // 같은 분자(정규 SMILES)가 다른 도킹으로 이미 대기열에 있으면 '담을 분자로' 단추를 숨긴다(서버도 409 claimed).
  const pickedSmiles = new Set(sel.picks.map((p) => sel.docked.find((d) => d.jobId === p.jobId)?.smiles));
  return (
    <div className="sel-cards" role="list">
      {sel.docked.map((d) => (
        <article key={d.jobId} role="listitem" className={`sel-card${d.origin.kind === 'other' ? ' warn' : ''}${d.isReference ? ' ref' : ''}`}>
          <div className="sel-card-top">
            <span className="mono">#{d.rank}</span>
            {d.isReference && <span className="chip">{C.s22.reference}</span>}
            {picked.has(d.jobId) && <span className="chip">{C.s21.ui.inQueue}</span>}
            {d.rank === 1 && !d.isReference && <span className="chip sel-stamp">{C.s21.cardsStamp}</span>}
          </div>
          <h4>{d.label ?? C.s21.ui.noName}</h4>
          <p className="smi">{d.smiles}</p>
          <div className="sel-dg mono">{fmtKcal(d.kcal)} <small>kcal/mol</small></div>
          <div className="sel-pbar" aria-hidden="true"><i style={{ width: `${Math.round(d.p * 100)}%` }} /></div>
          <p className="mini mono" style={{ margin: 0 }}>{C.s21.ui.pBar(d.p.toFixed(2))}</p>
          <div className="chips"><OriginChip origin={d.origin} /><KnownChip known={d.known} /></div>
          {d.origin.kind === 'other' && <p className="sel-band" role="note"><b aria-hidden="true">△ </b>{C.s21.cardsBand(d.rank, d.origin.mechanism ?? C.origin.other)}</p>}
          <p className="mini" style={{ margin: 0 }}><By name={d.byName} avatar={d.avatar} />{d.parentLabel && <span className="muted"> · {C.s21.ui.parent(d.parentLabel)}</span>}</p>
          {!d.isReference && !picked.has(d.jobId) && !pickedSmiles.has(d.smiles) && <button type="button" className="btn sm" onClick={() => onPick(d.jobId)}>{C.s21.ui.cardPick}</button>}
        </article>
      ))}
    </div>
  );
}

// ── 3.07 10배 계단 ──

function Stairs({ sel, focus, setFocus }: { sel: SelectionResponse; focus: string | null; setFocus: (id: string) => void }) {
  const ref = sel.gauge!.referenceKcal;
  const mol = sel.docked.find((d) => d.jobId === focus) ?? sel.docked.find((d) => !d.isReference) ?? sel.docked[0];
  const W = 360;
  const H = 310;
  const X = (g: number) => 46 + (-Math.max(-14, Math.min(0, g)) / 14) * 300;
  const Yl = (l: number) => 22 + (-Math.max(-11, Math.min(0, l)) / 11) * 234;
  let d = `M${X(0)},${Yl(0)}`;
  for (let i = 0; i < 11; i++) {
    const g1 = -(i + 1) * KCAL_PER_DECADE;
    if (g1 < -14) break;
    d += ` H${X(g1)} V${Yl(-(i + 1))}`;
  }
  const UNITS = ['1 M', '100 mM', '10 mM', '1 mM', '100 µM', '10 µM', '1 µM', '100 nM', '10 nM', '1 nM', '100 pM', '10 pM'];
  const pt = (kcal: number) => ({ x: X(kcal), y: Yl(Math.log10(kdFromKcal(kcal))) });
  const r = pt(ref);
  const m = mol ? pt(mol.kcal) : null;
  const gap = mol ? mol.kcal - ref : 0;
  const n = foldFromDeltaDeltaG(Math.abs(gap));
  const nText = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
  return (
    <>
      <div className="chips" role="group" aria-label={C.s21.stairsPick}>
        {sel.docked.filter((x) => !x.isReference).map((x) => (
          <button key={x.jobId} type="button" className="rchip" aria-pressed={x.jobId === mol?.jobId} onClick={() => setFocus(x.jobId)}>{shortName(x)}</button>
        ))}
      </div>
      <figure className="sel-fig">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${C.s21.tabs.stairs} — ${C.s21.stairsAxis}${mol ? ` — ${C.s21.stairsLine(Math.abs(gap).toFixed(2), nText, gap <= 0)}` : ''}`} className="sel-svg">
          {[0, 3, 6, 9].map((a, i) => <rect key={a} x={46} y={Yl(-a)} width={300} height={Yl(-Math.min(11, a + 3)) - Yl(-a)} className={i % 2 ? 'st-band a' : 'st-band'} />)}
          {UNITS.map((u, i) => <text key={u} x={42} y={Yl(-i) + 4} textAnchor="end" className="g-num">{u}</text>)}
          {[0, -2, -4, -6, -8, -10, -12, -14].map((g) => <text key={g} x={X(g)} y={H - 18} textAnchor="middle" className="g-num">{fmtKcal(g, 0)}</text>)}
          <text x={196} y={H - 3} textAnchor="middle" className="g-num">{C.s21.ui.stairsX}</text>
          <path d={d} className="st-path" />
          {sel.docked.filter((x) => !x.isReference && x.jobId !== mol?.jobId).map((x) => { const p = pt(x.kcal); return <circle key={x.jobId} cx={p.x} cy={p.y} r={3} className="st-dot dim"><title>{`${shortName(x)} ${fmtKcal(x.kcal)}`}</title></circle>; })}
          <rect x={r.x - 5} y={r.y - 5} width={10} height={10} className="st-dot ref" />
          <text x={r.x - 10} y={r.y - 10} textAnchor="end" className="g-lab">{C.s21.ui.stairsRef(fmtKcal(ref))}</text>
          {m && mol && (
            <>
              <circle cx={m.x} cy={m.y} r={7} className="st-dot me" />
              <text x={m.x - 12} y={m.y + 24} textAnchor="end" className="g-lab b">{shortName(mol)} {fmtKcal(mol.kcal)}</text>
            </>
          )}
        </svg>
        <figcaption className="mini muted">{C.s21.stairsNote}</figcaption>
        <p className="mini muted">{C.s21.stairsAxis} · {C.s21.stairsBands}</p>
      </figure>
      {mol && <p className={`verdict ${gap <= 0 ? 'ok' : 'warn'}`} role="status"><b aria-hidden="true">{gap <= 0 ? '↓' : '↑'}</b> {C.s21.stairsLine(Math.abs(gap).toFixed(2), nText, gap <= 0)}</p>}
    </>
  );
}

// ── 오른쪽: 찜 회고 · 대기열 ──

/** 1.2 찜 근거 키 → 글(F12 SCREEN_COPY). 근거 칩 전 판의 찜은 'legacy'. */
const claimReasonText = (key: string): string =>
  key === LEGACY_REASON ? C.s21.retroLegacy : ((SCREEN_COPY.claimReasons as Record<string, string>)[key] ?? key);

function Retro({ sel }: { sel: SelectionResponse }) {
  const r = sel.retro;
  if (!r) return null;
  return (
    <Panel title={C.s21.retroTitle} sub={C.s21.ui.retroSub(r.rows.length)}>
      {r.ourMeanKcal !== null && r.topMeanKcal !== null && (
        <p className="sel-retro-line"><b aria-hidden="true">↺ </b>{C.s21.retroLine(r.n, fmtKcal(r.topMeanKcal), fmtKcal(r.ourMeanKcal))}</p>
      )}
      <ul className="sel-list">
        {r.rows.map((row) => (
          <li key={row.compoundId}>
            <b>{row.name.slice(0, 24)}</b>
            <span className="mono">{row.dockedKcal !== null ? `ΔG ${fmtKcal(row.dockedKcal)}` : C.s21.retroNotDocked}</span>
            {row.rank !== null && <span className="mono muted">{C.s21.retroRank(row.rank, r.of)}</span>}
            <span className="mini muted">{C.s21.ui.retroBy(row.byName, claimReasonText(row.reason))}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Queue({ board, sel, focus, setFocus, onChanged }: { board: BoardResponse; sel: SelectionResponse; focus: string | null; setFocus: (id: string | null) => void; onChanged: () => void }) {
  const act = useAction();
  const [reason, setReason] = useState<DockReason | null>(null);
  const [ask, setAsk] = useState<'other' | 'known' | null>(null);
  const me = board.account.userId;
  const picked = new Set(sel.picks.map((p) => p.jobId));
  // 같은 분자(정규 SMILES)를 다른 도킹으로 이미 담았으면 고를 수 없다(서버도 409 claimed).
  const pickedSmiles = new Set(sel.picks.map((p) => sel.docked.find((d) => d.jobId === p.jobId)?.smiles));
  const options = sel.docked.filter((d) => !d.isReference && !picked.has(d.jobId) && !pickedSmiles.has(d.smiles));
  const mol = options.find((d) => d.jobId === focus) ?? null;
  const mine = sel.picks.filter((p) => p.userId === me).length;
  const verdict = useMemo(() => {
    if (!mol || !reason) return null;
    const queue = sel.picks
      .map((p) => sel.docked.find((d) => d.jobId === p.jobId))
      .filter((d): d is DockedView => Boolean(d))
      .map((d) => ({ family: d.origin.family, library: d.origin.library }));
    return dockReasonVerdict(reason, { kcal: mol.kcal, referenceKcal: sel.gauge!.referenceKcal, p: mol.p, origin: mol.origin, parentKcal: mol.parentKcal, queue });
  }, [mol, reason, sel]);
  const submit = () =>
    void act.run(async () => {
      setAsk(null);
      await api.post(SELECTION_API.dockPicks, { dockingJobId: mol!.jobId, reason });
      setReason(null);
      setFocus(null);
      onChanged();
    });
  const cost = sel.picks.length * board.costs['2.2'];
  const mineFull = mine >= sel.limits.dockPerPerson;
  const teamFull = sel.picks.length >= sel.limits.dockPerTeam;
  return (
    <Panel title={C.s21.queueTitle} sub={C.s21.queueSub(sel.picks.length, sel.limits.dockPerTeam, sel.limits.dockPerPerson)}>
      {sel.picks.length === 0 ? <p className="empty">{C.s21.queueEmpty}</p> : (
        <ul className="sel-list">
          {sel.picks.map((p) => {
            const d = sel.docked.find((x) => x.jobId === p.jobId);
            return (
              <li key={p.jobId}>
                <By name={p.byName} avatar={p.avatar} />
                <b>{d ? shortName(d) : '—'}</b>
                <span className="mono">{d ? `ΔG ${fmtKcal(d.kcal)}` : ''}</span>
                <span className="mini">{C.s21.ui.reasonOf((C.dockReasonLabel as Record<string, string>)[p.reason] ?? p.reason)}</span>
                {d && <KnownChip known={d.known} />}
                {p.userId === me && <button type="button" className="btn sm" disabled={act.busy} onClick={() => void act.run(async () => { await api.del(SELECTION_API.dockPick(p.jobId)); onChanged(); })}>{C.s21.remove}</button>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mini muted">{C.s21.queueCost(sel.picks.length, money(cost), money(board.costs['2.2']))}</p>
      <p className="mini">{C.s21.pickMine(mine, sel.limits.dockPerPerson)}</p>
      {(mineFull || teamFull) && <p className="hint">{teamFull ? C.s21.pickLimitOrder(sel.limits.dockPerPerson, sel.limits.dockPerTeam) : C.s21.pickLimitMine(sel.limits.dockPerPerson)}</p>}
      <div className="fld">
        <label className="lab" htmlFor="s21-pick">{C.s21.pickFrom}</label>
        <select id="s21-pick" className="txt" value={mol?.jobId ?? ''} onChange={(e) => setFocus(e.target.value || null)}>
          <option value="">{C.s21.ui.choose}</option>
          {options.map((d) => <option key={d.jobId} value={d.jobId}>{shortName(d)} · ΔG {fmtKcal(d.kcal)} · {d.byName}</option>)}
        </select>
        <p className="hint">{C.s21.pickRef}</p>
      </div>
      {mol && (
        <div className="chips" style={{ marginTop: 8 }}><OriginChip origin={mol.origin} /><KnownChip known={mol.known} /></div>
      )}
      <div style={{ marginTop: 10 }}>
        <ReasonChips
          legend={C.s21.pickLegend}
          chips={DOCK_REASONS.map((r) => ({ id: r, label: C.dockReasonLabel[r] }))}
          value={reason}
          onChange={(v) => setReason((v as DockReason | null) ?? null)}
          verdict={verdict}
          confirm={{
            label: C.s21.pickButton,
            busy: act.busy,
            disabled: !mol || mineFull || teamFull,
            onClick: () => (mol!.origin.kind === 'other' ? setAsk('other') : mol!.known ? setAsk('known') : submit()),
          }}
        />
      </div>
      {act.error && <p className="err" role="alert">{act.error}</p>}
      <Confirm open={ask === 'other'} title={C.confirmOther.title} confirmLabel={C.confirmOther.ok} tone="pri" busy={act.busy} onConfirm={submit} onCancel={() => setAsk(null)}>
        <p>{mol ? C.confirmOther.body(mol.rank, mol.origin.mechanism ?? C.origin.other) : ''}</p>
      </Confirm>
      <Confirm open={ask === 'known'} title={C.confirmKnown.title} confirmLabel={C.confirmKnown.ok} tone="pri" busy={act.busy} onConfirm={submit} onCancel={() => setAsk(null)}>
        <p>{C.confirmKnown.body}</p>
      </Confirm>
    </Panel>
  );
}

// ── 화면 ──

function Signals({ p }: { p: PropertiesResponse }) {
  const s = p.signals;
  const SG = C.s21.ui.signals;
  const LV = C.s21.ui.level;
  const items: Array<[string, string, 'g' | 'w' | 'b']> = [
    [SG.ro5, String(s.ro5Violations), s.ro5Violations === 0 ? 'g' : s.ro5Violations === 1 ? 'w' : 'b'],
    [SG.oral, LV[s.oralAbsorption], s.oralAbsorption === 'good' ? 'g' : s.oralAbsorption === 'moderate' ? 'w' : 'b'],
    [SG.bbb, LV[s.bbb], s.bbb === 'high' ? 'g' : s.bbb === 'moderate' ? 'w' : 'b'],
    [SG.herg, LV[s.herg], s.herg === 'low' ? 'g' : s.herg === 'moderate' ? 'w' : 'b'],
    [SG.liver, LV[s.hepatotoxicity], s.hepatotoxicity === 'low' ? 'g' : s.hepatotoxicity === 'moderate' ? 'w' : 'b'],
  ];
  const MARK = { g: '●', w: '▲', b: '■' } as const;
  return (
    <div className="chips">
      {items.map(([k, v, tone]) => <span key={k} className={`sig ${tone}`}><span aria-hidden="true">{MARK[tone]} </span>{k} {v}</span>)}
    </div>
  );
}

const residues = (job: WebJobView): string => {
  const rows = job.result?.table?.rows ?? [];
  return rows.slice(0, 3).map((r) => r[0]).join(' · ') + (rows.length > 3 ? C.s21.ui.moreResidues(rows.length - 3) : '');
};

const TABS = ['edit', 'gauge', 'cards', 'stairs'] as const;
type Tab = (typeof TABS)[number];

export function Step21(props: StepProps) {
  const { board, step, bench, setBench, reload, goStep } = props;
  const act = useAction();
  const [tab, setTab] = useLocalTab<Tab>('step:2.1', TABS, 'edit');
  const [focus, setFocus] = useBenchState<string | null>('s21:focus', null);
  const [stairFocus, setStairFocus] = useBenchState<string | null>('s21:stairs', null);
  const [preview, setPreview] = useState<PropertiesResponse | null>(null);
  const [propErr, setPropErr] = useState<string | null>(null);
  const live = useSelection(board);
  const sel = live.data;
  const target = currentTarget(board);
  const runs = jobsOf(board, '2.1');
  const myClaims = board.claims.filter((c) => c.userId === board.account.userId);
  const sorted = useMemo(
    () => [...runs].sort((a, b) => (a.affinityKcal ?? 0) - (b.affinityKcal ?? 0) || a.createdAt.localeCompare(b.createdAt)),
    [runs],
  );
  const smilesRef = useRef<HTMLTextAreaElement>(null);
  const changed = () => {
    live.reload();
    reload();
  };

  const load = (smiles: string, label: string, parentJobId: string | null) => {
    setTab('edit');
    setBench((b) => ({ ...b, smiles, label, parentJobId }));
    setPreview(null);
    setTimeout(() => smilesRef.current?.focus(), 0);
  };
  const pickFromCard = (jobId: string) => {
    setFocus(jobId);
    document.getElementById('s21-pick')?.focus();
  };
  const hasResults = !!sel?.gauge && sel.docked.length > 0;
  const CO = C.s21.ui.cols;
  const pickOf = (jobId: string) => sel?.picks.find((p) => p.jobId === jobId);
  const originOf = (jobId: string) => sel?.docked.find((d) => d.jobId === jobId);

  const editPanel = (
    <>
      <Panel title={C.s21.ui.loadTitle} sub={C.s21.ui.loadSub}>
        <div className="chips">
          {myClaims.map((c) => <button key={c.compoundId} type="button" className="btn sm" onClick={() => load(c.smiles, c.name.slice(0, 40), null)}>{c.name.slice(0, 18)}</button>)}
          {target && <button type="button" className="btn sm" onClick={() => load(target.referenceLigand.smiles, C.s21.ui.refLabel(target.referenceLigand.name), null)}>{C.s21.ui.loadRef(target.referenceLigand.name)}</button>}
          {myClaims.length === 0 && <span className="mini muted">{C.s21.ui.loadEmpty}</span>}
        </div>
      </Panel>
      <Panel title={C.s21.ui.molTitle} sub={bench.parentJobId ? C.s21.ui.molSubVariant : 'SMILES'}>
        <div className="fld">
          <label className="lab" htmlFor="smi">SMILES</label>
          <textarea id="smi" ref={smilesRef} className="txt mono" rows={3} value={bench.smiles} maxLength={200} onChange={(e) => (setBench((b) => ({ ...b, smiles: e.target.value })), setPreview(null))} placeholder="예: COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2" />
          <div className="chips sel-edit-chips" role="list" aria-label={C.s21.edit.chipsHead}>
            <span className="mini muted">{C.s21.edit.chipsHead}</span>
            {C.s21.edit.chips.map((t) => <span key={t} role="listitem" className="chip">{t}</span>)}
          </div>
          <p className="hint">{C.s21.edit.chipReady}</p>
        </div>
        <div className="fld">
          <label className="lab" htmlFor="lbl">{C.s21.ui.labelLabel}</label>
          <input id="lbl" className="txt" value={bench.label} maxLength={40} onChange={(e) => setBench((b) => ({ ...b, label: e.target.value }))} placeholder={C.s21.ui.labelPlaceholder} />
        </div>
        <div className="acts" style={{ marginTop: 12 }}>
          <button className="btn" type="button" disabled={!bench.smiles.trim() || act.busy} onClick={() => void (async () => {
            setPropErr(null);
            try {
              setPreview(await api.post<PropertiesResponse>(API.properties, { smiles: bench.smiles.trim() }));
            } catch (e) {
              setPropErr(message(e));
            }
          })()}>{C.s21.ui.previewButton}</button>
          <button className="btn pri" type="button" disabled={!bench.smiles.trim() || act.busy || step.state === 'locked'} onClick={() => void act.run(async () => {
            await api.post(API.jobs, { requestId: newRequestId(), step: '2.1', params: { smiles: bench.smiles.trim(), label: bench.label.trim() || null, parentJobId: bench.parentJobId } });
            reload();
          })}>{C.s21.ui.dockButton} <span className="cost">{money(board.costs['2.1'])}</span></button>
        </div>
        {propErr && <p className="err" style={{ marginTop: 10 }}>{propErr}</p>}
        {act.error && <p className="err" style={{ marginTop: 10 }}>{act.error}</p>}
        {preview && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <p className="mini mono" style={{ margin: 0 }}>MW {preview.properties.mw} · cLogP {preview.properties.clogp} · TPSA {preview.properties.tpsa} · HBD {preview.properties.hbd} · HBA {preview.properties.hba} · QED {preview.properties.qed}</p>
            <Signals p={preview} />
            <p className="smi">{C.s21.ui.canonical(preview.properties.canonicalSmiles)}</p>
          </div>
        )}
      </Panel>
    </>
  );

  const readTool = (inner: (s: SelectionResponse) => ReactNode, q: string) =>
    !sel ? <Panel><p className="hint">{live.error ? live.error.message : C.s21.ui.loading}</p></Panel>
      : !hasResults ? <Panel><p className="empty">{C.s21.empty}</p></Panel>
        : <Panel plain><p className="sel-q">{q}</p>{inner(sel)}</Panel>;

  return (
    <StepLayout
      {...props}
      tabs={[
        { id: 'edit', no: '①', label: C.s21.tabs.edit },
        { id: 'gauge', no: '3.05', label: C.s21.tabs.gauge, disabled: !hasResults },
        { id: 'cards', no: '3.09', label: C.s21.tabs.cards, disabled: !hasResults },
        { id: 'stairs', no: '3.07', label: C.s21.tabs.stairs, disabled: !hasResults },
      ]}
      tab={hasResults || tab === 'edit' ? tab : 'edit'}
      onTab={(id) => setTab(id as Tab)}
      tabsLabel={C.s21.ui.tabsLabel}
      mineTitle={tab === 'edit' || !hasResults ? C.s21.ui.mineEdit : C.s21.ui.mineRead}
      mine={
        <div className="s21">
          {tab === 'gauge' && hasResults ? readTool((s) => <Gauge sel={s} board={board} />, C.s21.gaugeQ)
            : tab === 'cards' && hasResults ? readTool((s) => <Cards sel={s} onPick={pickFromCard} />, C.s21.cardsQ)
              : tab === 'stairs' && hasResults ? readTool((s) => <Stairs sel={s} focus={stairFocus} setFocus={setStairFocus} />, C.s21.stairsQ)
                : editPanel}
        </div>
      }
      teamTitle={C.s21.ui.teamTitle}
      team={
        <div className="s21">
          {sel && <Retro sel={sel} />}
          <Panel title={C.s21.ui.tableTitle(target ? `${target.gene} (PDB ${target.pdbId})` : null)} sub={C.s21.ui.tableSub}>
            <div className="tbl-w"><table>
              <thead><tr><th>{CO.who}</th><th>{CO.mol}</th><th className="num">{CO.dg}</th><th className="num">{CO.vsRef}</th><th>{CO.residues}</th><th>{CO.state}</th><th /></tr></thead>
              <tbody>
                {target && (
                  <tr className="ref">
                    <td className="mini">{C.s21.ui.refWho}</td>
                    <td><b className="mini">{target.referenceLigand.name}</b> <span className="chip">{C.s21.ui.refChip}</span></td>
                    <td className="num">{target.referenceKcal.toFixed(2)}</td>
                    <td className="num">100%</td>
                    <td className="mini muted">{C.s21.ui.refNote}</td>
                    <td /><td />
                  </tr>
                )}
                {sorted.map((j) => {
                  const o = originOf(j.id);
                  const pk = pickOf(j.id);
                  return (
                    <tr key={j.id} className={j.status === 'failed' ? 'dim' : ''}>
                      <td><By name={j.byName} avatar={j.avatar} /></td>
                      <td><b className="mini">{j.label ?? C.s21.ui.noName}</b>{j.parentJobId && <span className="mini muted"> · {C.s21.ui.variant}</span>}<div className="smi">{j.smiles?.slice(0, 48)}</div>{(o || pk) && <div className="chips sel-row-chips">{o && <OriginChip origin={o.origin} />}{o && <KnownChip known={o.known} />}{pk && <span className="chip">{C.s21.ui.inQueueBy(pk.byName)}</span>}</div>}</td>
                      <td className="num">{j.affinityKcal != null ? j.affinityKcal.toFixed(2) : '—'}</td>
                      <td className="num">{j.affinityKcal != null && target ? `${Math.round((j.affinityKcal / target.referenceKcal) * 100)}%` : '—'}</td>
                      <td className="mini">{j.status === 'succeeded' ? residues(j) : ''}</td>
                      <td><JobState job={j} /></td>
                      <td>{j.status === 'succeeded' && j.smiles && <button className="btn sm" type="button" onClick={() => load(j.smiles!, `${(j.label ?? C.s21.ui.variant).slice(0, 30)}′`, j.id)}>{C.s21.ui.redock}</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            {runs.length === 0 && <p className="empty" style={{ marginTop: 10 }}>{C.s21.ui.noRuns}</p>}
            {runs.some((j) => j.error) && <p className="hint">{C.s21.ui.refunded(runs.find((j) => j.error)?.error?.message ?? '')}</p>}
          </Panel>
          {sel && sel.gauge && <Queue board={board} sel={sel} focus={focus} setFocus={setFocus} onChanged={changed} />}
          <NotesBlock board={board} stepId="2.1" />
          <Next step={step} goStep={goStep} label="2.2" />
        </div>
      }
    />
  );
}
