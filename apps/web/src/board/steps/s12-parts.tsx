/**
 * 1.2 화면 조각(F12) — 공통 점수판 · 깔때기 띠/막대 · 안건 분포 그래프(SVG 직접) · 구조식 상자 · 모둠원 칩 · 서랍.
 * 점수판 · 깔때기는 규격 `screenFunnel` 하나로 센다(서버 실행 스냅숏과 같은 함수 — 설계 §5.5.1).
 * 색만으로 말하지 않는다: 걸림 · 통과 · 아는 약 계열은 글 · 기호(✕ ✓ ★)를 같이 쓴다.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  SCREEN_AGENDA_DIR,
  SCREEN_AGENDA_RANGE,
  SCREEN_AGENDAS,
  SCREEN_COPY,
  SCREEN_TOP_N,
  screenFill,
  screenPass,
  screenRuleText,
  shortName,
  type Avatar,
  type CoachHit,
  type ScreenAgenda,
  type ScreenCompound,
  type ScreenFunnel,
  type ScreenFunnelStep,
} from '@crista-web/web-contract';
import { AVATAR_LABEL, type Verdict } from '../ui/index.ts';

const C = SCREEN_COPY;

// ── 작은 것 ──

/** 모둠원 칩 — 이름 첫 글자 + 직책(색 외 표시는 이름 · 직책 글). */
export function MemberChip({ name, avatar, me, small }: { name: string; avatar?: Avatar | null; me?: boolean; small?: boolean }) {
  return (
    <span className={`s12-who${small ? ' sm' : ''}${me ? ' me' : ''}`} title={`${name}${avatar ? ` · ${AVATAR_LABEL[avatar]}` : ''}`}>
      <span className="s12-av" aria-hidden="true">{name.slice(0, 1)}</span>
      {!small && <span className="s12-wn">{name}{me ? ` (${C.me})` : ''}</span>}
      {small && <span className="sr">{name}</span>}
      {avatar && !small && <span className="badge">{AVATAR_LABEL[avatar]}</span>}
    </span>
  );
}

/** 구조식 상자 — 구조 그림 라이브러리를 들이지 않아 SMILES 로 보인다(설계: 새 라이브러리 금지 — 남은 문제로 보고). */
export function SmilesBox({ smiles, label }: { smiles: string; label?: string }) {
  return (
    <div className="s12-smi" title={smiles} aria-label={`${label ?? C.shop.structure} ${smiles}`}>
      <span className="s12-smi-k" aria-hidden="true">{C.shop.structure}</span>
      <code>{smiles}</code>
    </div>
  );
}

/** 코치 판정 → 근거 칩 판정. 회의(`meeting`)에서는 'no' 도 막지 않는다(설계 §5.5 — 경고만). */
export function coachVerdict(hit: CoachHit | null, okText: string, meeting: boolean): Verdict {
  if (!hit) return { status: 'ok', message: okText };
  if (hit.level === 'no') return meeting ? { status: 'warn', message: `${C.coach.stop} — ${hit.text}` } : { status: 'block', message: hit.text };
  return { status: 'warn', message: `${C.coach.think} — ${hit.text}` };
}

export const fmtPct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
export const fmtEf = (v: number) => `×${v.toFixed(1)}`;

// ── 공통 점수판(설계 §5.5.1) ──

export function Scoreboard({ f, title }: { f: ScreenFunnel; title: string }) {
  const lost = f.knownTotal - f.knownLeft;
  const topN = f.topIds.length;
  const enrichWhat = screenFill(C.scoreboard.enrichWhat, { total: f.total });
  const topWhat = screenFill(C.scoreboard.topWhat, { n: SCREEN_TOP_N });
  return (
    <section className="s12-board" aria-label={title}>
      <p className="lab">{title}</p>
      <div className="s12-tiles" role="status" aria-live="polite">
        <div className="s12-tile">
          <span className="k">{C.scoreboard.left}</span>
          <b>{f.final}<small> / {f.total}</small></b>
          <span className="s">{screenFill(C.scoreboard.cut, { p: fmtPct(f.total - f.final, f.total), total: f.total })}</span>
        </div>
        <div className={`s12-tile${lost === 0 && f.knownTotal ? ' good' : lost >= 4 ? ' bad' : ''}`} title={C.scoreboard.knownWhat}>
          <span className="k">★ {C.scoreboard.known}</span>
          <b>{f.knownLeft}<small> / {f.knownTotal}</small></b>
          <span className="s12-dots" aria-hidden="true">{Array.from({ length: f.knownTotal }, (_, i) => <i key={i} className={i < f.knownLeft ? 'on' : ''} />)}</span>
          <span className="sr">{screenFill(C.scoreboard.knownSub, { k: f.knownLeft, K: f.knownTotal })}</span>
        </div>
        <div className={`s12-tile${f.enrichment >= 3 ? ' good' : ''}`} title={enrichWhat}>
          <span className="k">{C.scoreboard.enrich}</span>
          <b>{fmtEf(f.enrichment)}</b>
          <span className="s">{enrichWhat}</span>
        </div>
        <div className="s12-tile" title={topWhat}>
          <span className="k">{screenFill(C.scoreboard.top, { n: SCREEN_TOP_N })}</span>
          <b>{f.topKnown}<small> / {topN}</small></b>
          <span className="s">{topWhat}</span>
        </div>
      </div>
    </section>
  );
}

// ── 깔때기 ──

/** 안건별 남는 수 띠(오른쪽 위 — 합의값, 미정은 '거르지 않음'). */
export function FunnelStrip({ f, gene, mine }: { f: ScreenFunnel; gene: string; mine?: Partial<Record<ScreenAgenda, boolean>> }) {
  const level = f.final > 40 ? C.funnel.many : f.final < 8 ? C.funnel.few : C.funnel.good;
  return (
    <ol className="s12-strip" aria-label={C.funnel.stripLabel}>
      <li><span className="k">{C.funnel.library}</span><b>{f.total}</b></li>
      {f.steps.map((s) => (
        <li key={s.agenda} className={s.value === null ? 'tbd' : ''}>
          <span className="k">{C.agenda[s.agenda].label}</span>
          <b>{s.left}{s.removed ? <small> −{s.removed}</small> : null}</b>
          <span className="r">{screenRuleText(s.agenda, s.value, gene)}{s.value !== null ? (mine?.[s.agenda] ? ` ${C.funnel.mine}` : ` ${C.funnel.agreed}`) : ''}</span>
        </li>
      ))}
      <li className="fin"><span className="k">{C.funnel.final}</span><b>{f.final}</b><span className="r">{level}</span></li>
    </ol>
  );
}

/** 관문별 막대 — 남은 수(잉크) · 그중 아는 약 계열(라임 ★) · 빠진 수. */
export function FunnelBars({ f, gene, names }: { f: Pick<ScreenFunnel, 'total' | 'steps' | 'final' | 'hidden'>; gene: string; names?: Map<string, string> }) {
  const rows: Array<{ key: string; label: string; rule: string; step: ScreenFunnelStep | null; left: number; known: number }> = [
    { key: 'lib', label: C.funnel.library, rule: `${f.total}`, step: null, left: f.total, known: f.steps[0] ? f.steps[0].knownLeft + f.steps[0].knownRemoved : 0 },
    ...f.steps.map((s) => ({ key: s.agenda, label: C.agenda[s.agenda].label, rule: screenRuleText(s.agenda, s.value, gene), step: s, left: s.left, known: s.knownLeft })),
  ];
  return (
    <div className="s12-fbars" role="list" aria-label={C.lab.funnelTitle}>
      {rows.map((r, i) => (
        <div key={r.key} className={`s12-fb${i === rows.length - 1 ? ' last' : ''}`} role="listitem">
          <span className="l">{r.label}<small>{r.rule}</small></span>
          <span className="b" aria-hidden="true">
            <i style={{ width: `${(r.left / Math.max(1, f.total)) * 100}%` }} />
            {r.known > 0 && <em style={{ width: `${Math.max(1.5, (r.known / Math.max(1, f.total)) * 100)}%` }} />}
          </span>
          <span className="n">
            <b>{r.left}</b>
            {r.step && r.step.removed > 0 && <span className="muted"> −{r.step.removed}</span>}
            {r.step && r.step.knownRemoved > 0 && <span className="bad"> {screenFill(C.funnel.knownDrop, { n: r.step.knownRemoved })}</span>}
          </span>
          {r.step && names && r.step.knownRemovedIds.length > 0 && (
            <span className="kd">★ {r.step.knownRemovedIds.map((id) => shortName(names.get(id) ?? id, 10)).join(', ')}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 안건 분포 그래프(02 — 220종 분포 · 아는 약 계열 쌓기 · 내 값 · 실제 약 · 모둠원 깃발) ──

export interface HistFlag {
  x: number;
  label: string;
  title: string;
}

export const agendaValueOf = (agenda: ScreenAgenda, c: ScreenCompound): number =>
  agenda === 'alert' ? (c.alerts.length ? 1 : 0) : agenda === 'score' ? c.score : agenda === 'ro5' ? c.ro5 : c[agenda];

export function AgendaHist({ agenda, compounds, hidden, value, control, flags = [], compact, label }: {
  agenda: ScreenAgenda;
  compounds: ScreenCompound[];
  hidden: number;
  value: number | null;
  control?: ScreenCompound | null;
  flags?: HistFlag[];
  compact?: boolean;
  label: string;
}) {
  const W = compact ? 260 : 480;
  const H = compact ? 54 : 168;
  const pad = { l: compact ? 2 : 30, r: compact ? 2 : 10, t: compact ? 4 : 26, b: compact ? 6 : 34 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const dir = SCREEN_AGENDA_DIR[agenda];
  const left = value === null ? compounds.length : compounds.filter((c) => screenPass(agenda, c, value)).length;
  const parts: ReactNode[] = [];

  if (agenda === 'ro5' || agenda === 'alert') {
    const cats = agenda === 'ro5' ? [0, 1, 2] : [0, 1];
    const counts = cats.map((cv) => {
      const inCat = compounds.filter((c) => (agenda === 'ro5' ? Math.min(2, c.ro5) === cv : (c.alerts.length ? 1 : 0) === cv));
      return { n: inCat.length + (agenda === 'ro5' && cv === 2 ? hidden : 0), k: inCat.filter((c) => c.known).length };
    });
    const top = Math.max(1, ...counts.map((x) => x.n));
    const bw = w / cats.length;
    cats.forEach((cv, i) => {
      const { n, k } = counts[i]!;
      const kept = value === null || (agenda === 'ro5' ? cv <= value : value < 1 || cv === 0);
      const bh = (n / top) * h;
      const kh = (k / top) * h;
      const x = pad.l + i * bw + 6;
      parts.push(
        <g key={cv}>
          <rect x={x} y={pad.t + h - bh} width={bw - 12} height={bh} rx={4} className={kept ? 's12-hb' : 's12-hb off'}><title>{screenFill(C.ui.histN, { n })}</title></rect>
          {k > 0 && <rect x={x} y={pad.t + h - bh} width={bw - 12} height={Math.max(3, kh)} rx={3} className="s12-hk" />}
          {!compact && <text x={x + (bw - 12) / 2} y={pad.t + h - bh - 5} textAnchor="middle" className="s12-ht">{n}{kept ? '' : ' ✕'}</text>}
          {!compact && (
            <text x={x + (bw - 12) / 2} y={H - 14} textAnchor="middle" className="s12-ht">
              {agenda === 'ro5' ? screenFill(C.ui.histRo5, { n: `${cv}${cv === 2 ? '+' : ''}` }) : cv ? C.ui.histAlertOn : C.ui.histAlertOff}
            </text>
          )}
        </g>,
      );
    });
  } else {
    const r = SCREEN_AGENDA_RANGE[agenda];
    const lo = agenda === 'mw' ? 150 : agenda === 'tpsa' ? 0 : 0;
    const hi = agenda === 'mw' ? 700 : agenda === 'tpsa' ? 220 : 1;
    const bins = compact ? 22 : 28;
    const span = hi - lo;
    const cnt = Array.from({ length: bins }, () => ({ n: 0, k: 0 }));
    for (const c of compounds) {
      const v = agendaValueOf(agenda, c);
      const i = Math.max(0, Math.min(bins - 1, Math.floor(((v - lo) / span) * bins)));
      cnt[i]!.n += 1;
      if (c.known) cnt[i]!.k += 1;
    }
    const top = Math.max(1, ...cnt.map((x) => x.n));
    const bw = w / bins;
    const sx = (x: number) => pad.l + ((Math.max(lo, Math.min(hi, x)) - lo) / span) * w;
    if (value !== null) {
      const x = sx(value);
      parts.push(<rect key="shade" x={dir === 'max' ? x : pad.l} y={pad.t - 2} width={Math.max(0, dir === 'max' ? pad.l + w - x : x - pad.l)} height={h + 2} className="s12-shade" />);
    }
    cnt.forEach(({ n, k }, i) => {
      const mid = lo + ((i + 0.5) / bins) * span;
      const kept = value === null || (dir === 'max' ? mid <= value : mid >= value);
      const bh = (n / top) * h;
      const kh = (k / top) * h;
      const x = pad.l + i * bw + 0.6;
      parts.push(
        <g key={i}>
          <rect x={x} y={pad.t + h - bh} width={Math.max(1, bw - 1.2)} height={bh} rx={Math.min(3, bw / 3)} className={kept ? 's12-hb' : 's12-hb off'}>
            <title>{`${(lo + (i / bins) * span).toFixed(agenda === 'mw' || agenda === 'tpsa' ? 0 : 2)}~ · ${screenFill(C.ui.histN, { n })}${k ? screenFill(C.ui.histKnown, { k }) : ''}`}</title>
          </rect>
          {k > 0 && <rect x={x} y={pad.t + h - bh} width={Math.max(1, bw - 1.2)} height={Math.max(2.5, kh)} className="s12-hk" />}
        </g>,
      );
    });
    parts.push(<line key="ax" x1={pad.l} x2={pad.l + w} y1={pad.t + h + 0.5} y2={pad.t + h + 0.5} className="s12-axis" />);
    if (!compact) {
      const fmt = (v: number) => (agenda === 'qed' || agenda === 'score' ? v.toFixed(1) : String(Math.round(v)));
      for (let i = 0; i <= 4; i += 1) {
        const v = lo + (span * i) / 4;
        parts.push(<text key={`t${i}`} x={sx(v)} y={pad.t + h + 14} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} className="s12-ht">{fmt(v)}</text>);
      }
      parts.push(<text key="ymax" x={pad.l - 4} y={pad.t + 8} textAnchor="end" className="s12-ht">{top}</text>);
      // 안건 범위(정할 수 있는 값) 표시.
      parts.push(<line key="rng" x1={sx(r.min)} x2={sx(r.max)} y1={H - 6} y2={H - 6} className="s12-rng" />);
    }
    if (control) {
      const x = sx(agendaValueOf(agenda, control));
      parts.push(
        <g key="ctl" className="s12-ctl">
          <line x1={x} x2={x} y1={pad.t - 2} y2={pad.t + h} />
          <rect x={x - 3.5} y={pad.t - 6} width={7} height={7} />
          <title>{`${shortName(control.name, 12)} ${agendaValueOf(agenda, control)}`}</title>
        </g>,
      );
    }
    flags.forEach((fl, i) => {
      const x = sx(fl.x);
      parts.push(
        <g key={`f${i}`} className="s12-flag">
          <line x1={x} x2={x} y1={pad.t - 14} y2={pad.t + h} />
          <circle cx={x} cy={pad.t - 14} r={compact ? 4 : 7} />
          {!compact && <text x={x} y={pad.t - 11} textAnchor="middle">{fl.label}</text>}
          <title>{fl.title}</title>
        </g>,
      );
    });
    if (value !== null) {
      const x = sx(value);
      parts.push(
        <g key="me" className="s12-me">
          <line x1={x} x2={x} y1={pad.t - 4} y2={pad.t + h + 4} />
          {!compact && <text x={Math.min(pad.l + w - 2, Math.max(pad.l + 2, x))} y={pad.t + h + 26} textAnchor="middle">{dir === 'max' ? '≤' : '≥'} {agenda === 'qed' || agenda === 'score' ? value.toFixed(2) : value}</text>}
        </g>,
      );
    }
  }
  return (
    <svg className={`s12-hist${compact ? ' compact' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={screenFill(C.ui.histLeft, { label, n: compounds.length, k: left })}>
      {parts}
    </svg>
  );
}

/** 그래프 범례(색 + 글). */
export function HistLegend({ controlName }: { controlName?: string }) {
  return (
    <p className="s12-legend">
      <span><i className="kept" aria-hidden="true" />{C.ui.legendPass}</span>
      <span><i className="off" aria-hidden="true" />{C.ui.legendFail}</span>
      <span><i className="known" aria-hidden="true" />{C.ui.legendKnown}</span>
      {controlName && <span><i className="ctl" aria-hidden="true" />{screenFill(C.ui.legendControl, { name: controlName })}</span>}
      <span><i className="flag" aria-hidden="true" />{C.ui.legendFlag}</span>
    </p>
  );
}

// ── 서랍(상세) ──

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      if (back instanceof HTMLElement) back.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-back s12-drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="s12-drawer" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`}>
        <div className="s12-drawer-h">
          <h2 id={`${id}-h`}>{title}</h2>
          <button ref={ref} type="button" className="btn sm" onClick={onClose}>{C.shop.close}</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export const AGENDA_TAB_ORDER = SCREEN_AGENDAS;
