/**
 * 4.1 임상 그림(F41) — 바깥 라이브러리 없이 SVG 직접. 시안 design/step-viz/viz-7.js(세 관문 허들 · 환자 수 아이콘 · 임상 간트 · 연구비 계단)와
 * 결과 · 분석 그림(CONSORT · 1차 평가지표 막대 + 오차 막대 · 시간 경과 · 숲 그림 · 이상사례 누적 막대 · PK 곡선 · 생존 곡선 · 모집 곡선 · 검정력).
 *
 * - 군은 색만으로 가르지 않는다: 군마다 선 모양(실선 · 점선) · 표시(◆ □ △ ○) · 이름표를 함께 쓴다.
 * - 그림마다 role="img" + aria-label(요약), 자세한 수는 옆 표 · 글로도 보인다. viewBox 로 폭에 맞춰 줄어든다(폰 390).
 */
import type { ReactNode } from 'react';
import {
  CLINICAL_COPY,
  PHASE_LABEL,
  PHASE_RULES,
  TRIAL_PHASES,
  fillCopy,
  formatCrista,
  trialPower,
  type FundingStepView,
  type PhaseLadderView,
  type TrialArmView,
  type TrialPhase,
  type TrialSimResult,
  type TrialView,
} from '@crista-web/web-contract';

// ── 군 모양 ──

export const ARM_STYLE: Record<string, { dash: string; mark: string; op: number; shape: 'diamond' | 'square' | 'triangle' | 'circle' }> = {
  high: { dash: '', mark: '◆', op: 1, shape: 'diamond' },
  mid: { dash: '7 3', mark: '□', op: 0.72, shape: 'square' },
  low: { dash: '2 3', mark: '△', op: 0.5, shape: 'triangle' },
  control: { dash: '5 4', mark: '○', op: 0.42, shape: 'circle' },
};
const styleOf = (arm: string) => ARM_STYLE[arm] ?? ARM_STYLE.high!;
export const armName = (arms: TrialArmView[], id: string) => {
  const a = arms.find((x) => x.id === id);
  return a ? `${styleOf(id).mark} ${a.label}${a.doseMg > 0 ? ` ${a.doseMg}mg` : ''}` : id;
};

function Marker({ arm, x, y, r = 4 }: { arm: string; x: number; y: number; r?: number }) {
  const s = styleOf(arm);
  const common = { className: 'c41-mk', style: { opacity: Math.max(0.55, s.op) } };
  if (s.shape === 'diamond') return <path d={`M${x} ${y - r - 1}L${x + r + 1} ${y}L${x} ${y + r + 1}L${x - r - 1} ${y}Z`} {...common} />;
  if (s.shape === 'square') return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} {...common} />;
  if (s.shape === 'triangle') return <path d={`M${x} ${y - r - 1}L${x + r + 1} ${y + r}L${x - r - 1} ${y + r}Z`} {...common} />;
  return <circle cx={x} cy={y} r={r} {...common} className="c41-mk hollow" />;
}

export function ArmLegend({ arms }: { arms: TrialArmView[] }) {
  return (
    <ul className="c41-legend" aria-label="군 범례">
      {arms.map((a) => (
        <li key={a.id}>
          <svg width="30" height="12" aria-hidden="true">
            <line x1="1" x2="29" y1="6" y2="6" className="c41-ln" strokeDasharray={styleOf(a.id).dash} style={{ opacity: styleOf(a.id).op }} />
            <Marker arm={a.id} x={15} y={6} r={3} />
          </svg>
          {armName([a], a.id)}
        </li>
      ))}
    </ul>
  );
}

function Fig({ label, children, caption, w, h, className }: { label: string; children: ReactNode; caption?: ReactNode; w: number; h: number; className?: string }) {
  return (
    <figure className={`c41-fig${className ? ` ${className}` : ''}`}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <title>{label}</title>
        {children}
      </svg>
      {caption && <figcaption className="mini muted">{caption}</figcaption>}
    </figure>
  );
}

const nice = (lo: number, hi: number) => {
  if (lo === hi) return { lo: lo - 1, hi: hi + 1 };
  const pad = (hi - lo) * 0.08;
  // 0 에 닿은 쪽은 넘기지 않는다(비율 · 인원처럼 음수가 없는 값의 축에 '−6.85' 같은 눈금이 생기지 않게).
  return { lo: lo === 0 ? 0 : lo - pad, hi: hi === 0 ? 0 : hi + pad };
};
/** 세로 이름표 겹침 풀기 — y 순으로 놓고 gap 보다 가까우면 아래로 민다. */
function spreadLabels<T extends { y: number }>(items: T[], gap: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) if (sorted[i]!.y - sorted[i - 1]!.y < gap) sorted[i] = { ...sorted[i]!, y: sorted[i - 1]!.y + gap };
  return sorted;
}
const f1 = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2));
const pct = (p: number) => `${Math.round(p * 100)}%`;

// ── 세 관문 허들(viz-7 7.01) ──

export function HurdleLadder({ ladder }: { ladder: PhaseLadderView[] }) {
  const W = 480;
  const H = 240;
  const y0 = 172;
  const Y = (v: number) => y0 - (Math.max(0, Math.min(100, v)) / 100) * 130;
  const col = W / 3;
  const STATE_MARK = { todo: '', recruiting: '▸ 모집', running: '▸ 진행', pending: '⏳ 판정 대기', passed: '✓ 통과', held: '✕ 보류' } as const;
  const summary = ladder.map((l) => `${PHASE_LABEL[l.phase]} ${STATE_MARK[l.state] || '준비'} · 기준 ${[l.thresholds.efficacy !== null ? `E ≥ ${l.thresholds.efficacy}` : '', l.thresholds.safety !== null ? `S ≥ ${l.thresholds.safety}` : ''].filter(Boolean).join(' · ')} · 예상 E ${l.efficacy.toFixed(1)} S ${l.safety.toFixed(1)} · 참고 통과 ${pct(l.refPassProb)}`).join(' / ');
  return (
    <Fig label={`세 관문 허들 — ${summary}`} w={W} h={H} caption="막대 = 지금 프로토콜의 흔들림 전 예상치 · 가로대 = 그 상의 기준. 참고 통과 확률은 game-rules 규칙(목표 인원 기준).">
      {ladder.map((l, i) => {
        const x0 = i * col + 8;
        const cols: Array<{ m: 'E' | 'S'; v: number; th: number | null }> = [
          { m: 'E', v: l.efficacy, th: l.thresholds.efficacy },
          { m: 'S', v: l.safety, th: l.thresholds.safety },
        ];
        return (
          <g key={l.phase}>
            <rect x={x0} y={4} width={col - 16} height={H - 10} rx={14} className="c41-card" data-state={l.state} />
            <text x={x0 + 10} y={22} className="c41-t b">{PHASE_LABEL[l.phase]}{STATE_MARK[l.state] ? `  ${STATE_MARK[l.state]}` : ''}</text>
            <text x={x0 + 10} y={37} className="c41-t s muted">{l.attempts > 0 ? `${l.attempts}번 시도 · ` : ''}{PHASE_RULES[l.phase].gameDays}일</text>
            {cols.map((c, j) => {
              const cx = x0 + (col - 16) * (j === 0 ? 0.33 : 0.67);
              const checked = c.th !== null;
              const ok = checked && c.v >= (c.th ?? 0);
              return (
                <g key={c.m}>
                  <rect x={cx - 13} y={Y(c.v)} width={26} height={y0 - Y(c.v)} rx={5} className={`c41-bar${checked ? (ok ? ' ok' : ' bad') : ' off'}`} />
                  <text x={cx} y={Y(c.v) - 5} textAnchor="middle" className="c41-t s mono">{c.v.toFixed(0)}{checked ? (ok ? ' ✓' : ' ✕') : ''}</text>
                  {checked && (
                    <g className="c41-hurdle">
                      <line x1={cx - 20} x2={cx + 20} y1={Y(c.th!)} y2={Y(c.th!)} />
                      <line x1={cx - 17} x2={cx - 17} y1={Y(c.th!)} y2={y0} className="leg" />
                      <line x1={cx + 17} x2={cx + 17} y1={Y(c.th!)} y2={y0} className="leg" />
                      {/* 기준 숫자는 바깥쪽에(E 는 왼쪽 · S 는 오른쪽) — 옆 막대와 겹치지 않게. */}
                      <text x={j === 0 ? cx - 22 : cx + 22} y={Y(c.th!) + 4} textAnchor={j === 0 ? 'end' : 'start'} className="c41-t s mono">{c.th}</text>
                    </g>
                  )}
                  <text x={cx} y={y0 + 14} textAnchor="middle" className="c41-t s">{c.m === 'E' ? '효능 E' : '안전 S'}</text>
                  {!checked && <text x={cx} y={y0 + 27} textAnchor="middle" className="c41-t xs muted">안 봄</text>}
                </g>
              );
            })}
            <text x={x0 + 10} y={H - 14} className="c41-t s">참고 통과 <tspan className="mono b">{pct(l.refPassProb)}</tspan></text>
          </g>
        );
      })}
    </Fig>
  );
}

// ── 환자 수 아이콘(viz-7 7.09) — 아이콘 하나 = 20명 ──

export function PatientIcons({ oncology }: { oncology: boolean }) {
  const per = 20;
  const W = 480;
  const rows = TRIAL_PHASES.map((p) => ({ p, n: p === 'phase1' && oncology ? 30 : PHASE_RULES[p].targetN }));
  const perRow = 20;
  let y = 8;
  const blocks = rows.map((r) => {
    const icons = Math.ceil(r.n / per);
    const lines = Math.ceil(icons / perRow);
    const top = y;
    y += 26 + lines * 20 + 6;
    return { ...r, icons, top };
  });
  const H = y + 4;
  return (
    <Fig label={`환자 수 — 1상 ${blocks[0]!.n}명 · 2상 ${blocks[1]!.n}명 · 3상 ${blocks[2]!.n}명(아이콘 하나 = ${per}명)`} w={W} h={H} caption={fillCopy(CLINICAL_COPY.viz.patients.read, { per })}>
      {blocks.map((b) => (
        <g key={b.p}>
          <text x={4} y={b.top + 14} className="c41-t b">{PHASE_LABEL[b.p]} · {b.n}명</text>
          {Array.from({ length: b.icons }, (_, k) => {
            const cx = 12 + (k % perRow) * 23;
            const cy = b.top + 30 + Math.floor(k / perRow) * 20;
            return (
              <g key={k} className="c41-person">
                <circle cx={cx} cy={cy - 4} r={3.4} />
                <path d={`M${cx - 6} ${cy + 9}q0 -9 6 -9q6 0 6 9z`} />
              </g>
            );
          })}
        </g>
      ))}
    </Fig>
  );
}

// ── 모집 곡선 ──

export function RecruitCurve({ trial, gameDay }: { trial: TrialView; gameDay: number }) {
  const r = trial.recruit;
  const W = 480;
  const H = 210;
  const pad = { l: 36, r: 12, t: 14, b: 26 };
  const start = trial.openedGameDay;
  const lastDay = r.curve.at(-1)?.day ?? gameDay;
  const proj = r.perDay > 0 ? Math.max(0, r.targetN - r.enrolled) / r.perDay : 0;
  const end = Math.max(lastDay + proj, start + 10, trial.startedGameDay ?? 0);
  const X = (d: number) => pad.l + ((d - start) / (end - start)) * (W - pad.l - pad.r);
  const Y = (n: number) => H - pad.b - (n / Math.max(1, r.targetN * 1.05)) * (H - pad.t - pad.b);
  const pts = r.curve.map((c) => `${X(c.day).toFixed(1)},${Y(c.enrolled).toFixed(1)}`).join(' ');
  const last = r.curve.at(-1);
  return (
    <Fig
      label={`모집 곡선 — ${r.enrolled}명 / 목표 ${r.targetN}명 · 최소 ${r.minN}명 · 하루 ${r.perDay}명 · 남은 날 약 ${Math.ceil(proj)}일`}
      w={W}
      h={H}
      caption={`실선 = 지금까지 등록 · 점선 = 지금 투자 단계로 목표까지 예상(약 ${Math.ceil(proj)}게임 일). 정산은 게임 일마다.`}
    >
      <line x1={pad.l} x2={W - pad.r} y1={Y(r.targetN)} y2={Y(r.targetN)} className="c41-ref" />
      <text x={W - pad.r} y={Y(r.targetN) - 4} textAnchor="end" className="c41-t s">목표 {r.targetN}</text>
      <line x1={pad.l} x2={W - pad.r} y1={Y(r.minN)} y2={Y(r.minN)} className="c41-ref dash" />
      <text x={W - pad.r} y={Y(r.minN) - 4} textAnchor="end" className="c41-t s">최소 {r.minN} · 시작 가능</text>
      {r.availableFromDay !== null && r.availableFromDay > start && (
        <g>
          <rect x={X(start)} y={pad.t} width={Math.max(0, X(Math.min(end, r.availableFromDay)) - X(start))} height={H - pad.t - pad.b} className="c41-wait" />
          <text x={X(start) + 4} y={pad.t + 12} className="c41-t s">IND 변경 심사</text>
        </g>
      )}
      <polyline points={pts} className="c41-ln thick" />
      {r.curve.slice(1).map((c, i) => (
        <g key={i}>
          <Marker arm={c.tier === 'focus' ? 'high' : c.tier === 'expanded' ? 'mid' : 'control'} x={X(c.day)} y={Y(c.enrolled)} r={3} />
        </g>
      ))}
      {last && proj > 0 && trial.status === 'recruiting' && <line x1={X(last.day)} y1={Y(last.enrolled)} x2={X(last.day + proj)} y2={Y(r.targetN)} className="c41-ln dash" />}
      {trial.startedGameDay !== null && (
        <g>
          <line x1={X(trial.startedGameDay)} x2={X(trial.startedGameDay)} y1={pad.t} y2={H - pad.b} className="c41-ref" />
          <text x={X(trial.startedGameDay) + 3} y={pad.t + 10} className="c41-t s">시작 {trial.enrolledAtStart}명</text>
        </g>
      )}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="c41-axis" />
      <text x={pad.l} y={H - 8} className="c41-t s mono">D{Math.floor(start)}</text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" className="c41-t s mono">D{Math.ceil(end)}</text>
      <text x={4} y={Y(0)} className="c41-t s mono">0</text>
    </Fig>
  );
}

// ── 검정력 곡선 · 게이지 ──

export function PowerCurve({ phase, oncology, n, target }: { phase: TrialPhase; oncology: boolean; n: number; target: number }) {
  const W = 480;
  const H = 170;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const max = Math.ceil(target * 1.3);
  const X = (v: number) => pad.l + (v / max) * (W - pad.l - pad.r);
  const Y = (p: number) => H - pad.b - p * (H - pad.t - pad.b);
  const pts = Array.from({ length: 41 }, (_, i) => (i / 40) * max).map((v) => `${X(v).toFixed(1)},${Y(trialPower(phase, v, oncology)).toFixed(1)}`).join(' ');
  const pNow = trialPower(phase, n, oncology);
  const goal = PHASE_RULES[phase].targetPower;
  return (
    <Fig label={`검정력 곡선 — 지금 ${n}명이면 ${pct(pNow)} · 목표 ${target}명이면 ${pct(trialPower(phase, target, oncology))}`} w={W} h={H}>
      <line x1={pad.l} x2={W - pad.r} y1={Y(goal)} y2={Y(goal)} className="c41-ref dash" />
      {/* 목표 이름표는 왼쪽 아래 — 곡선이 오른쪽에서 목표선에 닿아 겹치지 않게. */}
      <text x={pad.l + 4} y={Y(goal) + 14} className="c41-t s">목표 {pct(goal)}</text>
      <polyline points={pts} className="c41-ln thick" />
      <line x1={X(n)} x2={X(n)} y1={pad.t} y2={H - pad.b} className="c41-ref" />
      <Marker arm="high" x={X(n)} y={Y(pNow)} r={5} />
      <text x={X(n) + 6} y={Y(pNow) + 14} className="c41-t s b">지금 {n}명 · {pct(pNow)}</text>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="c41-axis" />
      <text x={pad.l} y={H - 8} className="c41-t s mono">0명</text>
      <text x={X(target)} y={H - 8} textAnchor="middle" className="c41-t s mono">목표 {target}</text>
      <text x={4} y={Y(1) + 4} className="c41-t s mono">100%</text>
      <text x={4} y={Y(0)} className="c41-t s mono">0</text>
    </Fig>
  );
}

export function PowerGauge({ power, goal, label }: { power: number; goal: number; label: string }) {
  const W = 260;
  const H = 130;
  const cx = W / 2 - 10;
  const cy = 112;
  const R = 86;
  const arc = (p: number) => {
    const a = Math.PI * (1 - p);
    return `${cx + R * Math.cos(a)} ${cy - R * Math.sin(a)}`;
  };
  const tone = power >= goal ? 'ok' : power >= goal * 0.7 ? 'warn' : 'bad';
  return (
    <Fig label={`${label} ${pct(power)} — 목표 ${pct(goal)}`} w={W} h={H} className="c41-gauge">
      <path d={`M${arc(0)} A${R} ${R} 0 0 1 ${arc(1)}`} className="c41-gauge-bg" />
      <path d={`M${arc(0)} A${R} ${R} 0 0 1 ${arc(Math.min(0.999, Math.max(0.001, power)))}`} className={`c41-gauge-fg ${tone}`} />
      {/* 목표 눈금은 호 둘레에만(가운데 숫자를 가로지르지 않게). */}
      <line
        x1={cx + (R - 16) * Math.cos(Math.PI * (1 - goal))}
        y1={cy - (R - 16) * Math.sin(Math.PI * (1 - goal))}
        x2={cx + (R + 8) * Math.cos(Math.PI * (1 - goal))}
        y2={cy - (R + 8) * Math.sin(Math.PI * (1 - goal))}
        className="c41-ref"
      />
      <text x={cx + (R + 10) * Math.cos(Math.PI * (1 - goal))} y={cy - (R + 10) * Math.sin(Math.PI * (1 - goal))} textAnchor="start" className="c41-t xs mono">목표 {pct(goal)}</text>
      <text x={cx} y={cy - 18} textAnchor="middle" className="c41-t xl mono">{pct(power)}</text>
      <text x={cx} y={cy} textAnchor="middle" className="c41-t s">{tone === 'ok' ? '✓ ' : tone === 'warn' ? '△ ' : '✕ '}{label}</text>
    </Fig>
  );
}

// ── 임상 간트(viz-7 7.07) ──

export function TrialGantt({ trials, gameDay }: { trials: TrialView[]; gameDay: number }) {
  const list = [...trials].reverse();
  if (list.length === 0) return null;
  const W = 480;
  const rowH = 26;
  const pad = { l: 92, r: 10, t: 8, b: 24 };
  const H = pad.t + list.length * rowH + pad.b;
  const lo = Math.min(...list.map((t) => t.openedGameDay));
  // 모집 중이면 지금 투자 단계로 목표를 채운 뒤 시험 기간까지의 '계획' 막대를 보인다(축이 오늘에 붙어 이름표가 겹치지 않게).
  const planOf = (t: TrialView): { start: number; end: number } | null => {
    if (t.status !== 'recruiting') return null;
    const left = t.recruit.tiers.find((x) => x.tier === t.recruit.tier)?.daysLeft ?? null;
    const start = Math.max(gameDay, t.recruit.availableFromDay ?? 0) + (left ?? 0);
    return { start, end: start + PHASE_RULES[t.phase].gameDays };
  };
  const hi = Math.max(gameDay, ...list.map((t) => planOf(t)?.end ?? t.endsGameDay ?? t.openedGameDay + 10));
  const X = (d: number) => pad.l + ((d - lo) / Math.max(1, hi - lo)) * (W - pad.l - pad.r);
  const label = list.map((t) => `${PHASE_LABEL[t.phase]} ${t.attempt}회 ${t.status}`).join(' · ');
  return (
    <Fig label={`임상 간트 — ${label}`} w={W} h={H} caption="옅은 막대 = 모집 · 진한 막대 = 시험 기간 · 점선 = 지금 투자 단계로 본 계획 · ✓ 통과 ✕ 보류 · 세로선 = 오늘">
      {list.map((t, i) => {
        const y = pad.t + i * rowH;
        const recruitEnd = t.startedGameDay ?? gameDay;
        return (
          <g key={t.id}>
            <text x={4} y={y + 16} className="c41-t s">{PHASE_LABEL[t.phase]} · {t.attempt}회{t.route === 'backup' ? ' · 백업' : t.route === 'amend' ? ' · 변경' : ''}</text>
            <rect x={X(t.openedGameDay)} y={y + 5} width={Math.max(2, X(recruitEnd) - X(t.openedGameDay))} height={14} rx={7} className="c41-gantt recruit" />
            {t.startedGameDay !== null && t.endsGameDay !== null && (
              <rect x={X(t.startedGameDay)} y={y + 5} width={Math.max(2, X(Math.min(t.endsGameDay, Math.max(gameDay, t.startedGameDay))) - X(t.startedGameDay))} height={14} rx={7} className={`c41-gantt run ${t.status}`} />
            )}
            {planOf(t) && (
              <rect x={X(planOf(t)!.start)} y={y + 5} width={Math.max(2, X(planOf(t)!.end) - X(planOf(t)!.start))} height={14} rx={7} className="c41-gantt plan" />
            )}
            {t.startedGameDay !== null && t.endsGameDay !== null && t.status === 'running' && (
              <rect x={X(t.startedGameDay)} y={y + 5} width={Math.max(2, X(t.endsGameDay) - X(t.startedGameDay))} height={14} rx={7} className="c41-gantt plan" />
            )}
            {(t.status === 'completed' || t.status === 'held') && t.decidedGameDay !== null && (
              <text x={X(t.decidedGameDay) + 4} y={y + 16} className="c41-t s b">{t.status === 'completed' ? '✓' : '✕'}</text>
            )}
          </g>
        );
      })}
      <line x1={X(gameDay)} x2={X(gameDay)} y1={pad.t} y2={H - pad.b} className="c41-ref" />
      <text x={X(gameDay)} y={H - 8} textAnchor="middle" className="c41-t s mono">{fillCopy(CLINICAL_COPY.ui.today, { day: Math.floor(gameDay) })}</text>
      {X(gameDay) - pad.l > 70 && <text x={pad.l} y={H - 8} className="c41-t s mono">D{Math.floor(lo)}</text>}
      {X(hi) - X(gameDay) > 70 && <text x={W - pad.r} y={H - 8} textAnchor="end" className="c41-t s mono">D{Math.ceil(hi)}</text>}
    </Fig>
  );
}

// ── 연구비 계단(viz-7 7.08) ──

export function FundingStairs({ funding, balanceCrista }: { funding: FundingStepView[]; balanceCrista: number }) {
  if (funding.length === 0) return <p className="mini muted">아직 임상에 쓴 연구비가 없어요.</p>;
  const W = 480;
  const H = 180;
  const pad = { l: 12, r: 12, t: 16, b: 34 };
  let acc = 0;
  const steps = funding.map((f) => {
    acc += -f.crista;
    return { ...f, acc };
  });
  const max = Math.max(1, ...steps.map((s) => s.acc));
  const bw = (W - pad.l - pad.r) / steps.length;
  const Y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const KIND = { trial_fee: '상 비용', recruit: '모집', backup_fee: '백업 교체', bounty: '바운티 환급' } as const;
  return (
    <Fig label={`연구비 계단 — 임상에 누적 ${formatCrista(acc)} · 지금 잔액 ${formatCrista(balanceCrista)}`} w={W} h={H} caption={`누적 지출(바운티 환급은 계단을 내린다) · 지금 잔액 ${formatCrista(balanceCrista)}`}>
      {steps.map((s, i) => {
        const prev = i === 0 ? 0 : steps[i - 1]!.acc;
        const top = Math.max(prev, s.acc);
        const bottom = Math.min(prev, s.acc);
        return (
          <g key={i}>
            <rect x={pad.l + i * bw + 1} y={Y(top)} width={Math.max(1, bw - 2)} height={Math.max(1, Y(bottom) - Y(top))} rx={3} className={`c41-stair ${s.kind}`}>
              <title>{`${s.phase ? PHASE_LABEL[s.phase] : ''} ${KIND[s.kind]} ${formatCrista(s.crista)}${s.day !== null ? ` · D${Math.floor(s.day)}` : ''}`}</title>
            </rect>
            {i > 0 && <line x1={pad.l + i * bw} x2={pad.l + i * bw + 1} y1={Y(prev)} y2={Y(prev)} className="c41-axis" />}
            {(s.kind !== 'recruit' || bw > 26) && (
              <text x={pad.l + i * bw + bw / 2} y={H - pad.b + 12} textAnchor="middle" className="c41-t xs">{s.kind === 'recruit' ? '모' : s.kind === 'bounty' ? '↩' : s.phase ? PHASE_LABEL[s.phase] : ''}</text>
            )}
          </g>
        );
      })}
      <text x={W - pad.r} y={Y(max) - 4} textAnchor="end" className="c41-t s mono">{formatCrista(max)}</text>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="c41-axis" />
    </Fig>
  );
}

// ── CONSORT 흐름도 ──

export function ConsortFlow({ result, arms }: { result: TrialSimResult; arms: TrialArmView[] }) {
  const W = 480;
  const n = result.arms.length;
  const colW = (W - 16) / n;
  const enrolled = result.screened - result.screenFailed;
  const H = 250;
  const box = (x: number, y: number, w: number, h: number, lines: string[], cls = '') => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} className={`c41-box ${cls}`} />
      {lines.map((l, i) => (
        <text key={i} x={x + w / 2} y={y + 15 + i * 13} textAnchor="middle" className={`c41-t ${i === 0 ? 's b' : 'xs'}`}>{l}</text>
      ))}
    </g>
  );
  return (
    <Fig label={`CONSORT 흐름 — 선별 ${result.screened}명 · 탈락 ${result.screenFailed}명 · 등록 ${enrolled}명 · ${result.arms.map((a) => `${armName(arms, a.arm)} 배정 ${a.randomized} 완료 ${a.completed}`).join(' · ')}`} w={W} h={H}>
      {box(W / 2 - 90, 4, 180, 32, [`선별 ${result.screened}명`, `선별 실패 ${result.screenFailed}명`])}
      <line x1={W / 2} x2={W / 2} y1={36} y2={52} className="c41-axis" />
      {box(W / 2 - 90, 52, 180, 26, [`등록 · 무작위 배정 ${enrolled}명`], 'hi')}
      {result.arms.map((a, i) => {
        const x = 8 + i * colW;
        const drop = a.discontinued.reduce((s, d) => s + d.n, 0);
        return (
          <g key={a.arm}>
            <line x1={W / 2} y1={78} x2={x + colW / 2} y2={96} className="c41-axis" />
            {box(x + 3, 96, colW - 6, 32, [armName(arms, a.arm), `배정 ${a.randomized}`])}
            <line x1={x + colW / 2} x2={x + colW / 2} y1={128} y2={144} className="c41-axis" />
            {box(x + 3, 144, colW - 6, 18 + Math.max(1, a.discontinued.length) * 13, [`중단 ${drop}`, ...a.discontinued.map((d) => `${DROP_LABEL[d.reason]} ${d.n}`)], 'dim')}
            {box(x + 3, 206, colW - 6, 32, [`완료 ${a.completed}`, `${a.randomized ? Math.round((a.completed / a.randomized) * 100) : 0}%`], 'ok')}
          </g>
        );
      })}
    </Fig>
  );
}
export const DROP_LABEL: Record<string, string> = CLINICAL_COPY.dropReason;

// ── 1차 평가지표 막대 + 오차 막대 ──

export function PrimaryBars({ result, arms }: { result: TrialSimResult; arms: TrialArmView[] }) {
  const p = result.primary;
  const W = 480;
  const H = 210;
  const pad = { l: 40, r: 10, t: 16, b: 34 };
  const { lo, hi } = nice(Math.min(0, ...p.arms.map((a) => a.ciLow)), Math.max(0, ...p.arms.map((a) => a.ciHigh)));
  const Y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / p.arms.length;
  const c = p.comparison;
  return (
    <Fig
      label={`1차 평가지표 ${p.name}(${p.unit}) — ${p.arms.map((a) => `${armName(arms, a.arm)} ${f1(a.mean)} [${f1(a.ciLow)}, ${f1(a.ciHigh)}]`).join(' · ')}${c ? ` · 차이 ${f1(c.diff)} p=${c.p}` : ''}`}
      w={W}
      h={H}
      caption={`${p.name} · ${p.unit} · ${p.higherIsBetter ? '높을수록 좋아요' : '낮을수록 좋아요'} · 막대 = 평균 · 가는 선 = 95% 신뢰구간${c ? ` · 계획 용량 − 대조 = ${f1(c.diff)}(${f1(c.ciLow)}~${f1(c.ciHigh)}), p = ${c.p}` : ''}`}
    >
      <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} className="c41-axis" />
      <text x={pad.l - 4} y={Y(hi) + 8} textAnchor="end" className="c41-t xs mono">{f1(hi)}</text>
      <text x={pad.l - 4} y={Y(0) + 4} textAnchor="end" className="c41-t xs mono">0</text>
      <text x={pad.l - 4} y={Y(lo)} textAnchor="end" className="c41-t xs mono">{f1(lo)}</text>
      {p.arms.map((a, i) => {
        const x = pad.l + i * bw + bw / 2;
        const s = styleOf(a.arm);
        return (
          <g key={a.arm}>
            <rect x={x - bw * 0.28} y={Math.min(Y(a.mean), Y(0))} width={bw * 0.56} height={Math.abs(Y(a.mean) - Y(0))} rx={5} className="c41-armbar" style={{ opacity: s.op }} />
            <line x1={x} x2={x} y1={Y(a.ciLow)} y2={Y(a.ciHigh)} className="c41-err" />
            <line x1={x - 7} x2={x + 7} y1={Y(a.ciLow)} y2={Y(a.ciLow)} className="c41-err" />
            <line x1={x - 7} x2={x + 7} y1={Y(a.ciHigh)} y2={Y(a.ciHigh)} className="c41-err" />
            <Marker arm={a.arm} x={x} y={Y(a.mean)} r={4} />
            <text x={x} y={H - pad.b + 13} textAnchor="middle" className="c41-t xs">{armName(arms, a.arm)}</text>
            <text x={x} y={H - pad.b + 25} textAnchor="middle" className="c41-t xs mono">{f1(a.mean)} · n{a.n}</text>
          </g>
        );
      })}
    </Fig>
  );
}

// ── 시간 경과 선 그래프 ──

export function TimeCourse({ result, arms, unit }: { result: TrialSimResult; arms: TrialArmView[]; unit: string }) {
  const tc = result.timecourse;
  if (tc.length < 2) return null;
  const W = 480;
  const H = 200;
  const pad = { l: 40, r: 64, t: 12, b: 26 };
  const all = tc.flatMap((t) => t.values.map((v) => v.mean));
  const { lo, hi } = nice(Math.min(0, ...all), Math.max(0, ...all));
  const w0 = tc[0]!.week;
  const w1 = tc.at(-1)!.week;
  const X = (w: number) => pad.l + ((w - w0) / Math.max(1, w1 - w0)) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const ids = [...new Set(tc.flatMap((t) => t.values.map((v) => v.arm)))];
  // 끝 이름표가 겹치지 않게 — 위에서부터 12px 이상 띄운다.
  const endY = new Map(spreadLabels(ids.map((id) => ({ id, y: Y(tc.at(-1)!.values.find((v) => v.arm === id)?.mean ?? 0) })), 13).map((l) => [l.id, l.y]));
  return (
    <Fig label={`시간 경과 — ${ids.map((id) => `${armName(arms, id)} ${w1}주 ${f1(tc.at(-1)!.values.find((v) => v.arm === id)?.mean ?? 0)}`).join(' · ')}`} w={W} h={H} caption={`주차별 군 평균(${unit})`}>
      <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} className="c41-axis" />
      {ids.map((id) => {
        const s = styleOf(id);
        const pts = tc.map((t) => ({ x: X(t.week), y: Y(t.values.find((v) => v.arm === id)?.mean ?? 0) }));
        return (
          <g key={id}>
            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="c41-ln" strokeDasharray={s.dash} style={{ opacity: Math.max(0.55, s.op) }} />
            {pts.map((p, i) => <Marker key={i} arm={id} x={p.x} y={p.y} r={3} />)}
            <text x={pts.at(-1)!.x + 6} y={(endY.get(id) ?? pts.at(-1)!.y) + 4} className="c41-t xs">{styleOf(id).mark} {arms.find((a) => a.id === id)?.label ?? id}</text>
          </g>
        );
      })}
      {tc.map((t) => <text key={t.week} x={X(t.week)} y={H - 8} textAnchor="middle" className="c41-t xs mono">{t.week}주</text>)}
      <text x={pad.l - 4} y={Y(hi) + 8} textAnchor="end" className="c41-t xs mono">{f1(hi)}</text>
      <text x={pad.l - 4} y={Y(lo)} textAnchor="end" className="c41-t xs mono">{f1(lo)}</text>
    </Fig>
  );
}

// ── 숲 그림(하위군) ──

export function ForestPlot({ result }: { result: TrialSimResult }) {
  const c = result.primary.comparison;
  const rows = [...(c ? [{ label: '전체', diff: c.diff, ciLow: c.ciLow, ciHigh: c.ciHigh, n: result.arms.reduce((s, a) => s + a.randomized, 0), all: true }] : []), ...result.subgroups.map((g) => ({ ...g, all: false }))];
  if (rows.length === 0) return null;
  const W = 480;
  const rowH = 24;
  const pad = { l: 110, r: 70, t: 22, b: 26 };
  const H = pad.t + rows.length * rowH + pad.b;
  const { lo, hi } = nice(Math.min(0, ...rows.map((r) => r.ciLow)), Math.max(0, ...rows.map((r) => r.ciHigh)));
  const X = (v: number) => pad.l + ((v - lo) / (hi - lo)) * (W - pad.l - pad.r);
  const better = result.primary.higherIsBetter ? '오른쪽 = 약이 나음 →' : '← 왼쪽 = 약이 나음';
  return (
    <Fig label={`숲 그림 — ${rows.map((r) => `${r.label} ${f1(r.diff)} [${f1(r.ciLow)}, ${f1(r.ciHigh)}]`).join(' · ')}`} w={W} h={H} caption={`하위군별 효과 차이(계획 용량 − 대조) · 95% 신뢰구간 · ${better} · 세로선 0 = 차이 없음`}>
      <text x={pad.l} y={14} className="c41-t xs muted">{better}</text>
      <line x1={X(0)} x2={X(0)} y1={pad.t - 4} y2={H - pad.b} className="c41-ref dash" />
      {rows.map((r, i) => {
        const y = pad.t + i * rowH + 12;
        return (
          <g key={r.label}>
            <text x={4} y={y + 4} className={`c41-t s${r.all ? ' b' : ''}`}>{r.label}</text>
            <line x1={X(r.ciLow)} x2={X(r.ciHigh)} y1={y} y2={y} className="c41-err" />
            {r.all ? <path d={`M${X(r.diff)} ${y - 7}L${X(r.diff) + 7} ${y}L${X(r.diff)} ${y + 7}L${X(r.diff) - 7} ${y}Z`} className="c41-mk" /> : <rect x={X(r.diff) - 4} y={y - 4} width={8} height={8} className="c41-mk" />}
            <text x={W - pad.r + 6} y={y + 4} className="c41-t xs mono">{f1(r.diff)} · n{r.n}</text>
          </g>
        );
      })}
      <text x={pad.l} y={H - 8} className="c41-t xs mono">{f1(lo)}</text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" className="c41-t xs mono">{f1(hi)}</text>
    </Fig>
  );
}

// ── 이상사례 누적 막대(기관계 × 군) ──

const SYSTEM_LABEL: Record<string, string> = CLINICAL_COPY.aeSystem;
export const systemLabel = (s: string) => SYSTEM_LABEL[s] ?? s;
const SYSTEM_PATTERN = ['', 'p1', 'p2', 'p3', 'p4', 'p5'];

export function AeStacked({ result, arms }: { result: TrialSimResult; arms: TrialArmView[] }) {
  const systems = [...new Set(result.adverseEvents.map((a) => a.system))];
  const W = 480;
  const rowH = 30;
  const pad = { l: 96, r: 52, t: 6, b: 6 };
  const H = pad.t + result.arms.length * rowH + pad.b + 26;
  const per = result.arms.map((a) => {
    const n = Math.max(1, a.randomized);
    const parts = systems.map((s) => ({ s, k: result.adverseEvents.filter((e) => e.system === s).reduce((acc, e) => acc + (e.counts.find((c) => c.arm === a.arm)?.n ?? 0), 0) }));
    return { arm: a.arm, n, parts, total: parts.reduce((acc, p) => acc + p.k, 0) };
  });
  const max = Math.max(1, ...per.map((p) => p.total / p.n));
  const X = (v: number) => (v / max) * (W - pad.l - pad.r);
  return (
    <Fig label={`이상사례 — ${per.map((p) => `${armName(arms, p.arm)} 100명당 ${Math.round((p.total / p.n) * 100)}건`).join(' · ')}`} w={W} h={H} caption="군 인원 100명당 건수 · 무늬 = 기관계(아래 이름표). 등급별 건수는 표에서">
      {per.map((p, i) => {
        let x = pad.l;
        const y = pad.t + i * rowH;
        return (
          <g key={p.arm}>
            <text x={4} y={y + 17} className="c41-t xs">{armName(arms, p.arm)}</text>
            {p.parts.map((part, j) => {
              const w = X(part.k / p.n);
              const r = <rect key={part.s} x={x} y={y + 6} width={Math.max(0, w)} height={16} className={`c41-ae ${SYSTEM_PATTERN[j % SYSTEM_PATTERN.length]}`}><title>{`${systemLabel(part.s)} ${part.k}건`}</title></rect>;
              x += w;
              return r;
            })}
            <text x={x + 4} y={y + 18} className="c41-t xs mono">{Math.round((p.total / p.n) * 100)}</text>
          </g>
        );
      })}
      {systems.map((s, j) => (
        <g key={s} transform={`translate(${4 + (j % 6) * 78}, ${H - 20 + Math.floor(j / 6) * 0})`}>
          <rect width={12} height={10} y={0} className={`c41-ae ${SYSTEM_PATTERN[j % SYSTEM_PATTERN.length]}`} />
          <text x={16} y={9} className="c41-t xs">{systemLabel(s)}</text>
        </g>
      ))}
    </Fig>
  );
}

// ── PK 곡선 ──

export function PkCurves({ result, arms }: { result: TrialSimResult; arms: TrialArmView[] }) {
  if (result.pk.length === 0) return null;
  const W = 480;
  const H = 190;
  const pad = { l: 44, r: 70, t: 12, b: 26 };
  const maxH = Math.max(...result.pk.flatMap((p) => p.points.map((x) => x.h)));
  const maxC = Math.max(1, ...result.pk.flatMap((p) => p.points.map((x) => x.conc)));
  const X = (h: number) => pad.l + (h / Math.max(1, maxH)) * (W - pad.l - pad.r);
  const Y = (c: number) => H - pad.b - (c / (maxC * 1.08)) * (H - pad.t - pad.b);
  return (
    <Fig label={`PK 곡선 — ${result.pk.map((p) => `${armName(arms, p.arm)} Cmax ${f1(p.cmaxNgMl)} ng/mL · t½ ${f1(p.tHalfH)} h · AUC ${f1(p.aucNgHMl)}`).join(' · ')}`} w={W} h={H} caption="혈중 농도(ng/mL) — 시간(h). 용량이 클수록 꼭대기(Cmax)와 넓이(AUC)가 커져요.">
      {result.pk.map((p) => {
        const s = styleOf(p.arm);
        const peak = p.points.reduce((m, x) => (x.conc > m.conc ? x : m), p.points[0]!);
        return (
          <g key={p.arm}>
            <polyline points={p.points.map((x) => `${X(x.h)},${Y(x.conc)}`).join(' ')} className="c41-ln" strokeDasharray={s.dash} style={{ opacity: Math.max(0.55, s.op) }} />
            {p.points.map((x, i) => <Marker key={i} arm={p.arm} x={X(x.h)} y={Y(x.conc)} r={2.6} />)}
            <text x={X(peak.h) + 7} y={Y(peak.conc) + 3} className="c41-t xs">{s.mark} Cmax {f1(p.cmaxNgMl)} · t½ {f1(p.tHalfH)}h</text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="c41-axis" />
      <text x={pad.l} y={H - 8} className="c41-t xs mono">0 h</text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" className="c41-t xs mono">{maxH} h</text>
      <text x={pad.l - 4} y={Y(maxC) + 4} textAnchor="end" className="c41-t xs mono">{f1(maxC)}</text>
    </Fig>
  );
}

// ── 생존 곡선(항암) ──

export function SurvivalCurves({ result, arms }: { result: TrialSimResult; arms: TrialArmView[] }) {
  if (result.survival.length === 0) return null;
  const W = 480;
  const H = 190;
  const pad = { l: 40, r: 64, t: 12, b: 26 };
  const maxM = Math.max(...result.survival.flatMap((s) => s.points.map((p) => p.month)));
  const X = (m: number) => pad.l + (m / Math.max(1, maxM)) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + ((100 - v) / 100) * (H - pad.t - pad.b);
  return (
    <Fig label={`생존(무진행) 곡선 — ${result.survival.map((s) => `${armName(arms, s.arm)} ${s.points.at(-1)?.month}개월 ${s.points.at(-1)?.pct}%`).join(' · ')}`} w={W} h={H} caption="무진행 생존 비율(%) — 개월. 계단이 늦게 내려갈수록 좋아요. 점선 = 50%(중앙값)">
      <line x1={pad.l} x2={W - pad.r} y1={Y(50)} y2={Y(50)} className="c41-ref dash" />
      {result.survival.map((s) => {
        const st = styleOf(s.arm);
        let d = '';
        s.points.forEach((p, i) => {
          d += i === 0 ? `M${X(p.month)} ${Y(p.pct)}` : `H${X(p.month)}V${Y(p.pct)}`;
        });
        const last = s.points.at(-1)!;
        return (
          <g key={s.arm}>
            <path d={d} className="c41-ln thick" fill="none" strokeDasharray={st.dash} style={{ opacity: Math.max(0.55, st.op) }} />
            <Marker arm={s.arm} x={X(last.month)} y={Y(last.pct)} r={3} />
            <text x={X(last.month) + 5} y={Y(last.pct) + 4} className="c41-t xs">{st.mark} {arms.find((a) => a.id === s.arm)?.label}</text>
          </g>
        );
      })}
      <text x={pad.l - 4} y={Y(100) + 8} textAnchor="end" className="c41-t xs mono">100%</text>
      <text x={pad.l - 4} y={Y(0)} textAnchor="end" className="c41-t xs mono">0</text>
      <text x={pad.l} y={H - 8} className="c41-t xs mono">0개월</text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" className="c41-t xs mono">{maxM}개월</text>
    </Fig>
  );
}

// ── 실패 후 갈림길(viz-7 7.06) ──

export function ForkDiagram({ phase, routes }: { phase: TrialPhase; routes: Array<{ label: string; sub: string; ok: boolean }> }) {
  const W = 480;
  const H = 40 + routes.length * 44;
  return (
    <Fig label={`${PHASE_LABEL[phase]} 보류 뒤 갈림길 — ${routes.map((r) => `${r.label}${r.ok ? '' : '(지금 불가)'}`).join(' · ')}`} w={W} h={H}>
      <rect x={4} y={H / 2 - 18} width={92} height={36} rx={12} className="c41-box bad" />
      <text x={50} y={H / 2 + 4} textAnchor="middle" className="c41-t s b">✕ {PHASE_LABEL[phase]} 보류</text>
      {routes.map((r, i) => {
        const y = 20 + i * 44;
        return (
          <g key={r.label}>
            <path d={`M96 ${H / 2} C 140 ${H / 2}, 140 ${y + 16}, 180 ${y + 16}`} className="c41-ln" strokeDasharray={r.ok ? '' : '4 4'} fill="none" />
            <rect x={180} y={y} width={W - 186} height={34} rx={10} className={`c41-box${r.ok ? '' : ' dim'}`} />
            <text x={192} y={y + 14} className="c41-t s b">{r.ok ? '' : '🔒 '}{r.label}</text>
            <text x={192} y={y + 27} className="c41-t xs muted">{r.sub}</text>
          </g>
        );
      })}
    </Fig>
  );
}
