/**
 * 4.1 임상 1 · 2 · 3상(F41 — 2026-10-24 사용자 지시 · 시안 design/step-viz/viz-7.js).
 * 걸음: ① 프로토콜 ② 참여자 모집(투자 단계 · 모집 곡선 · 검정력) ③ 시작 · 진행(간트 · 중간 모니터링) ④ 결과 · 분석(여러 그림) ⑤ 보류 뒤 재도전(3경로 · 바운티).
 * 왼쪽 섬 = 내 작업대(읽기 도구 · 그림 — 이 브라우저에만), 오른쪽 섬 = 모둠 공유(서버 상태 · 행동 — useLive /api/clinical).
 * 학생 문구는 규격 `CLINICAL_COPY` 에서만(§5.12). 결과는 상 기간이 끝난 뒤에만 서버가 보낸다.
 * 다음 단계로는 바닥 띠가 데려간다(2026-10-25 합의안) — 남은 일(1 → 2 → 3상 통과)은 지금 시험의 걸음을 가리키고, 기다림은 'D+n / 기간'.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  CLINICAL_API,
  CLINICAL_COPY,
  IND_FORMS,
  PHASE_LABEL,
  PHASE_RULES,
  BACKUP_SWAP_FEE_CRISTA,
  BACKUP_SWAP_WAIT_DAYS,
  TRIAL_BOUNTY_RATE,
  TRIAL_BOUNTY_RETRY_SEC,
  TRIAL_BOUNTY_TEXT_MAX,
  TRIAL_BOUNTY_TEXT_MIN,
  fillCopy,
  formatCrista,
  nextPhase,
  targetNOf,
  type ClinicalResponse,
  type IndForm,
  type RouteOptionView,
  type TrialView,
} from '@crista-web/web-contract';
import { api, message } from '../../api.ts';
import { Confirm, HBars, Panel, useLive, useLocalTab } from '../ui/index.ts';
import { StepLayout, useAction, type StepProps } from './common.tsx';
import { days, type GoMap, type Wait } from './next.ts';
import {
  AeStacked,
  ArmLegend,
  ConsortFlow,
  ForestPlot,
  ForkDiagram,
  FundingStairs,
  HurdleLadder,
  PatientIcons,
  PkCurves,
  PowerCurve,
  PowerGauge,
  PrimaryBars,
  RecruitCurve,
  SurvivalCurves,
  TimeCourse,
  TrialGantt,
  armName,
  systemLabel,
} from './s41-charts.tsx';
import './s41.css';

const TABS = ['protocol', 'recruit', 'start', 'result', 'retry'] as const;
type Tab = (typeof TABS)[number];
const K = CLINICAL_COPY;
const U = K.ui;
const f = fillCopy;
const FORM_LABEL = K.formLabel;
const pct = (p: number) => `${Math.round(p * 100)}%`;
const c = (n: number) => formatCrista(n);
const NOTE_KO = K.factorWord;
const noteKo = (note: string) => note.replace(/[a-z]+/g, (w) => NOTE_KO[w] ?? w);

export function Step41(props: StepProps) {
  const { board, step } = props;
  const [tab, setTab] = useLocalTab<Tab>('step:4.1', TABS, 'protocol');
  const live = useLive<ClinicalResponse>(CLINICAL_API.view, (m) => (m.type === 'board.changed' && m.reason.startsWith('clinical')) || m.type === 'clock' || (m.type === 'board.event' && m.event.teamId === board.team.id));
  const data = live.data;
  const current = data?.current ?? null;
  const held = data?.trials[0]?.status === 'held' ? data.trials[0] : null;

  // 결과가 공개되면 결과 탭으로 한 번 안내한다(개인 탭은 바꾸지 않고 표시만).
  const latestRevealed = data?.trials.find((t) => t.result) ?? null;

  const tabs = [
    { id: 'protocol', no: '①', label: K.tabs.protocol, sub: current ? f(U.tabSubAttempt, { phase: PHASE_LABEL[current.phase], n: current.attempt }) : data?.routes[0] ? f(K.routes[data.routes[0].route], { phase: PHASE_LABEL[data.routes[0].phase] }) : undefined },
    { id: 'recruit', no: '②', label: K.tabs.recruit, sub: current?.status === 'recruiting' ? f(U.tabSubRecruit, { n: current.recruit.enrolled, target: current.recruit.targetN }) : undefined, mark: current && current.status !== 'recruiting' ? '✓' : undefined },
    { id: 'start', no: '③', label: K.tabs.start, sub: current?.status === 'running' ? `${current.progressPct ?? 0}%` : current?.status === 'pending' ? U.tabSubPending : undefined },
    { id: 'result', no: '④', label: K.tabs.result, sub: latestRevealed ? `${PHASE_LABEL[latestRevealed.phase]} ${latestRevealed.verdict === 'pass' ? U.pass : U.held}` : undefined, mark: latestRevealed ? (latestRevealed.verdict === 'pass' ? '✓' : '✕') : undefined },
    // ⑤ 재도전은 보류됐을 때만 사슬에 넣는다(순서 걸음이 아니라 보류 뒤 갈림길).
    ...(held ? [{ id: 'retry', no: '⑤', label: K.tabs.retry, sub: U.tabSubRetry }] : []),
  ];

  if (!data) {
    return <StepLayout board={board} step={step} team={<p className="hint" role={live.error ? 'alert' : 'status'}>{live.error ? live.error.message : U.loading}</p>} />;
  }

  if (!data.enabled && data.trials.length === 0) {
    return (
      <StepLayout
        board={board}
        step={step}
        mine={
          <div className="s41">
            <Panel title={U.lockedTitle} tone="warn"><p className="mini" style={{ margin: 0 }}>{K.locked}</p></Panel>
            <Panel title={U.lockedPatients} plain><PatientIcons oncology={false} /></Panel>
          </div>
        }
      />
    );
  }

  const view = tab === 'retry' && !held ? 'protocol' : tab;
  return (
    <Step41Body {...props} data={data} view={view} tabs={tabs} setTab={setTab} reload={live.reload} />
  );
}

/** 결과 탭의 '볼 시험' 고르기는 두 섬(그림 · 표)이 같이 쓴다. */
function Step41Body({ board, step, data, view, tabs, setTab, reload }: StepProps & { data: ClinicalResponse; view: Tab; tabs: Array<{ id: string; no: string; label: string; sub?: string; mark?: string; disabled?: boolean }>; setTab: (t: Tab) => void; reload: () => void }) {
  const pick = useResultPick(data);
  // 띠 — 남은 상은 지금 시험의 걸음으로(보류면 ⑤ 재도전). 실행 단추(모집 · 시작 · 재도전)는 공유 자료에 있어 그 판을 가리킨다
  // (접혀 있으면 StepLayout 이 편다). 기다림은 모집 n/목표 · 진행 D+n / 기간 · 판정 대기.
  const cur = data.current;
  const held = data.trials[0]?.status === 'held';
  const at: Tab = held ? 'retry' : !cur ? 'protocol' : cur.status === 'recruiting' ? 'recruit' : cur.status === 'completed' ? 'result' : 'start';
  const to = { tab: at, spot: 'go-s41-team' };
  const go: GoMap = { phase1: to, phase2: to, phase3: to };
  const w = cur ? PHASE_LABEL[cur.phase] : '';
  const wait: Wait | undefined = !cur
    ? undefined
    : cur.status === 'recruiting'
      ? { text: f(U.bandRecruit, { phase: w, n: Math.floor(cur.recruit.enrolled), target: cur.recruit.targetN }), clock: true }
      : cur.status === 'running' && cur.startedGameDay !== null && cur.endsGameDay !== null
        ? { text: `${f(U.bandRunning, { phase: w })} ${days(cur.progressPct ?? 0, Math.round(cur.endsGameDay - cur.startedGameDay))}`, clock: true }
        : cur.status === 'pending'
          ? { text: f(U.bandPending, { phase: w }) }
          : undefined;
  return (
    <StepLayout
      board={board}
      step={step}
      tabs={tabs}
      tab={view}
      onTab={(id) => setTab(id as Tab)}
      go={go}
      {...(wait ? { wait } : {})}
      ratio="even"
      mine={<div className="s41">{view === 'protocol' ? <ProtocolTools data={data} /> : view === 'recruit' ? <RecruitTools data={data} /> : view === 'start' ? <StartTools data={data} /> : view === 'result' ? <ResultTools pick={pick} /> : <RetryTools data={data} />}</div>}
      team={
        <div className="s41" id="go-s41-team">
          {view === 'protocol' && <ProtocolTeam data={data} reload={reload} />}
          {view === 'recruit' && <RecruitTeam data={data} reload={reload} />}
          {view === 'start' && <StartTeam data={data} reload={reload} />}
          {view === 'result' && <ResultTeam data={data} pick={pick} />}
          {view === 'retry' && <RetryTeam data={data} reload={reload} />}
        </div>
      }
    />
  );
}

// ── ① 프로토콜 ──

function ProtocolTools({ data }: { data: ClinicalResponse }) {
  const onc = data.candidate?.profile.oncology ?? false;
  return (
    <>
      <Panel title={K.viz.hurdle.title} plain>
        <HurdleLadder ladder={data.ladder} />
      </Panel>
      <Panel title={U.phaseQs}>
        <ul className="s41-qs">
          {(['phase1', 'phase2', 'phase3'] as const).map((p) => (
            <li key={p}>
              <b>{PHASE_LABEL[p]} · {K.phaseQuestion[p]}</b>
              <span className="mini muted">
                {f(p === 'phase1' && onc ? K.oncologyWho : K.phaseWho[p], { target: targetNOf(p, onc) })} · {f(K.protocol.costDuration, { phase: PHASE_LABEL[p], cost: c(PHASE_RULES[p].costCrista), days: PHASE_RULES[p].gameDays })}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={K.viz.patients.title} plain>
        <PatientIcons oncology={onc} />
      </Panel>
    </>
  );
}

function protocolOf(data: ClinicalResponse): TrialView['protocol'] | null {
  return data.current?.protocol ?? data.trials[0]?.protocol ?? null;
}

function ProtocolTeam({ data, reload }: { data: ClinicalResponse; reload: () => void }) {
  const act = useAction();
  const cand = data.candidate;
  const proto = protocolOf(data);
  const open = data.routes.find((r) => r.route === 'first' || r.route === 'next');
  return (
    <>
      <Panel title={U.protocolNow} sub={proto ? `${PHASE_LABEL[proto.phase]}` : U.protocolFromInd}>
        {cand && (
          <dl className="s41-dl">
            <dt>{U.dlCandidate}</dt><dd><b className="mono">{proto?.codeName ?? cand.codeName}</b>{cand.backup ? <span className="mini muted"> · {f(U.backupOf, { code: cand.backup.codeName })}</span> : null}</dd>
            <dt>{U.dlFormDose}</dt><dd>{FORM_LABEL[proto?.form ?? cand.form]} · {proto?.doseMg ?? cand.doseMg} mg</dd>
            <dt>{U.dlPopulation}</dt><dd>{proto?.healthy ? U.healthyPopulation : cand.population}</dd>
            <dt>{U.dlEndpoint}</dt><dd>{proto?.phase === 'phase1' ? U.endpointPhase1Short : cand.endpoint}</dd>
            {cand.mrsdMgByForm && <><dt>{U.dlMrsd}</dt><dd className="mono">{IND_FORMS.map((x) => `${FORM_LABEL[x]} ${cand.mrsdMgByForm?.[x] ?? '—'}`).join(' · ')} mg</dd></>}
          </dl>
        )}
        {proto && (
          <>
            <div className="tbl-w">
              <table>
                <caption className="sr">{U.armsCaption}</caption>
                <thead><tr><th>{U.thArm}</th><th className="num">{U.thDose}</th><th className="num">{U.thShare}</th><th className="num">{U.thTarget}</th></tr></thead>
                <tbody>
                  {proto.arms.map((a) => (
                    <tr key={a.id}><td>{armName(proto.arms, a.id)}</td><td className="num">{a.doseMg > 0 ? `${a.doseMg} mg` : '—'}</td><td className="num">{pct(a.share)}</td><td className="num">{Math.round(a.share * proto.targetN)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mini muted">
              {f(K.protocol.sampleSize, { target: proto.targetN, min: proto.minN, primaryWeek: proto.primaryWeek })} · {f(K.protocol.costDuration, { phase: PHASE_LABEL[proto.phase], cost: c(proto.costCrista), days: proto.gameDays })}
            </p>
          </>
        )}
      </Panel>
      {open && (
        <Panel title={f(K.routes[open.route], { phase: PHASE_LABEL[open.phase] })} tone="hi">
          <div className="acts">
            <button className="btn pri" type="button" disabled={act.busy} onClick={() => act.run(async () => { await api.post(CLINICAL_API.open, { route: open.route }); reload(); })}>
              {f(K.routes[open.route], { phase: PHASE_LABEL[open.phase] })}
            </button>
          </div>
          {act.error && <p className="err">{act.error}</p>}
        </Panel>
      )}
      {data.trials.length > 0 && (
        <Panel title={K.viz.gantt.title} plain>
          <TrialGantt trials={data.trials} gameDay={data.gameDay} />
        </Panel>
      )}
    </>
  );
}

// ── ② 참여자 모집 ──

function RecruitTools({ data }: { data: ClinicalResponse }) {
  const t = data.current ?? data.trials[0];
  if (!t) return <p className="hint">{U.recruitEmpty}</p>;
  const r = t.recruit;
  return (
    <>
      <Panel title={U.speedTitle} sub={U.speedSub}>
        <HBars
          label={U.speedBars}
          labelWidth={150}
          max={1.4}
          rows={r.factors.map((x) => ({ label: K.factor[x.key].label, value: x.factor, text: `×${x.factor.toFixed(2)}`, tone: x.factor > 1 ? 'hi' : x.factor < 1 ? 'dim' : undefined, note: `${K.factor[x.key].note} (${noteKo(x.note)})` }))}
        />
        <p className="mini muted">{f(U.screenFail, { screenFailPct: r.screenFailPct, dropoutPct: r.dropoutPct, perDay: r.tiers[0]!.perDay })}</p>
      </Panel>
      <Panel title={U.powerCurve} sub={t.phase === 'phase1' ? U.powerSub1 : U.powerSub23} plain>
        <PowerCurve phase={t.phase} oncology={t.protocol.oncology} n={r.enrolled} target={r.targetN} />
      </Panel>
    </>
  );
}

function RecruitTeam({ data, reload }: { data: ClinicalResponse; reload: () => void }) {
  const act = useAction();
  const t = data.current;
  if (!t) return <Panel title={K.tabs.recruit}><p className="mini">{U.noRecruiting}</p></Panel>;
  const r = t.recruit;
  const recruiting = t.status === 'recruiting';
  return (
    <>
      <Panel title={f(U.recruitTitle, { phase: PHASE_LABEL[t.phase], n: r.enrolled, target: r.targetN })} sub={recruiting ? f(U.perDay, { n: r.perDay }) : U.recruitDone}>
        <div className="s41-prog" role="progressbar" aria-valuemin={0} aria-valuemax={r.targetN} aria-valuenow={r.enrolled} aria-label={U.recruitBar}>
          <i style={{ width: `${Math.min(100, (r.enrolled / r.targetN) * 100)}%` }} />
          <b style={{ left: `${(r.minN / r.targetN) * 100}%` }} aria-hidden="true" />
        </div>
        <p className="mini">{f(K.minNeed, { min: r.minN, target: r.targetN })}</p>
        {r.availableFromDay !== null && r.availableFromDay > data.gameDay && <p className="mini">{f(U.indAmendWait, { fromDay: Math.ceil(r.availableFromDay) })}</p>}
        <RecruitCurve trial={t} gameDay={data.gameDay} />
      </Panel>
      {recruiting && (
        <Panel title={U.tierTitle} sub={U.tierSub}>
          <div className="s41-tiers" role="radiogroup" aria-label={U.tierTitle}>
            {r.tiers.map((x) => (
              <button
                key={x.tier}
                type="button"
                role="radio"
                aria-checked={r.tier === x.tier}
                className="s41-tier"
                disabled={act.busy}
                onClick={() => act.run(async () => { await api.put(CLINICAL_API.tier(t.id), { tier: x.tier }); reload(); })}
              >
                <b>{r.tier === x.tier ? '● ' : '○ '}{K.tier[x.tier].label} · {f(U.tierSpeed, { speed: x.speed })}</b>
                <span className="mini">{f(K.tier[x.tier].note, { cost: c(x.cristaPerDay), speed: x.speed })}</span>
                <span className="mini mono">{f(x.costLeftCrista ? U.tierEtaCost : U.tierEta, { perDay: x.perDay, daysLeft: x.daysLeft ?? '—', costLeft: c(x.costLeftCrista) })}</span>
              </button>
            ))}
          </div>
          <p className="mini muted">{f(U.tierSpent, { spent: c(r.spentCrista) })}</p>
          {act.error && <p className="err">{act.error}</p>}
        </Panel>
      )}
      <Panel title={K.viz.funding.title} plain>
        <FundingStairs funding={data.funding} balanceCrista={data.balanceCrista} />
      </Panel>
    </>
  );
}

// ── ③ 시작 · 진행 ──

function StartTools({ data }: { data: ClinicalResponse }) {
  const t = data.current;
  if (!t) return <Panel title={U.gaugeTitle}><p className="mini">{U.gaugeEmpty}</p></Panel>;
  const goal = PHASE_RULES[t.phase].targetPower;
  const phase1 = t.phase === 'phase1';
  return (
    <>
      <Panel title={U.gaugeTitle} sub={f(U.gaugeSub, { n: t.recruit.enrolled })}>
        <PowerGauge power={t.recruit.power} goal={phase1 ? 0.8 : goal} label={phase1 ? U.gauge1 : U.gauge23} />
        <p className="mini">{f(K.powerNow, { n: t.recruit.enrolled, power: pct(t.recruit.power), target: t.recruit.targetN, powerAtTarget: pct(t.recruit.powerAtTarget) })}</p>
        {t.status === 'recruiting' && t.recruit.enrolled < t.recruit.targetN && <p className="mini muted">{phase1 ? K.lowWarnPhase1 : f(K.lowWarn, { min: t.recruit.minN })}</p>}
      </Panel>
      <Panel title={U.shakeTitle} plain>
        <PowerCurve phase={t.phase} oncology={t.protocol.oncology} n={t.enrolledAtStart ?? t.recruit.enrolled} target={t.recruit.targetN} />
      </Panel>
    </>
  );
}

function StartTeam({ data, reload }: { data: ClinicalResponse; reload: () => void }) {
  const act = useAction();
  const [ask, setAsk] = useState(false);
  const t = data.current;
  if (!t) return <Panel title={U.startPanel}><p className="mini">{U.noRunning}</p></Panel>;
  const cost = PHASE_RULES[t.phase].costCrista;
  const enough = t.recruit.enrolled >= t.recruit.minN;
  const phase = PHASE_LABEL[t.phase];
  if (t.status === 'recruiting') {
    const block = !enough ? f(K.minNeedBlock, { min: t.recruit.minN, target: t.recruit.targetN }) : data.balanceCrista < cost ? f(K.budgetBlock, { phase, cost: c(cost) }) : null;
    return (
      <>
        <Panel title={f(U.startTitle, { phase })} tone={enough ? 'hi' : undefined}>
          <p className="mini" style={{ marginTop: 0 }}>{f(U.startNow, { n: t.recruit.enrolled, power: pct(t.recruit.power), cost: c(cost), days: PHASE_RULES[t.phase].gameDays })}</p>
          <div className="acts">
            <button className="btn pri" type="button" disabled={!!block || act.busy} onClick={() => setAsk(true)}>{U.startBtn} <span className="cost">{c(cost)}</span></button>
            {block && <span className="note">✕ {block}</span>}
          </div>
          {act.error && <p className="err">{act.error}</p>}
        </Panel>
        <Confirm
          open={ask}
          title={f(U.startConfirmTitle, { phase })}
          confirmLabel={U.startConfirmBtn}
          busy={act.busy}
          blockedReason={block}
          onCancel={() => setAsk(false)}
          onConfirm={() => act.run(async () => { await api.post(CLINICAL_API.start(t.id)); setAsk(false); reload(); })}
        >
          <p>{f(K.startConfirm, { n: t.recruit.enrolled, phase, cost: c(cost), days: PHASE_RULES[t.phase].gameDays })}</p>
        </Confirm>
      </>
    );
  }
  return (
    <>
      <Panel title={f(U.runningTitle, { phase, n: t.enrolledAtStart ?? 0 })} sub={t.startedByName ? f(U.startedBy, { name: t.startedByName }) : undefined}>
        <div className="s41-prog run" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.progressPct ?? 0} aria-label={U.runBar}><i style={{ width: `${t.progressPct ?? 0}%` }} /></div>
        <p className="mini">{t.status === 'pending' ? `⏳ ${K.pending}` : f(K.running, { phase, progress: t.progressPct ?? 0, day: Math.ceil(t.endsGameDay ?? 0) })}</p>
        <ul className="s41-monitor" aria-label={U.monitorLabel}>
          {t.monitoring.map((m) => <li key={m}>◇ {m}</li>)}
        </ul>
      </Panel>
      <Panel title={K.viz.gantt.title} plain><TrialGantt trials={data.trials} gameDay={data.gameDay} /></Panel>
    </>
  );
}

// ── ④ 결과 · 분석 ──

type ResultPick = ReturnType<typeof useResultPick>;
function useResultPick(data: ClinicalResponse) {
  const revealed = data.trials.filter((t) => t.result);
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => {
    if (pick && !revealed.some((t) => t.id === pick)) setPick(null);
  }, [pick, revealed]);
  const trial = revealed.find((t) => t.id === pick) ?? revealed[0] ?? null;
  return { revealed, trial, setPick };
}

function ResultTools({ pick }: { pick: ResultPick }) {
  const { trial } = pick;
  if (!trial?.result) return <p className="hint">{U.resultLater}</p>;
  const r = trial.result;
  const arms = trial.protocol.arms;
  return (
    <>
      <ArmLegend arms={arms} />
      <Panel title={U.timeTitle} plain><TimeCourse result={r} arms={arms} unit={r.primary.unit} /></Panel>
      {r.subgroups.length > 0 && <Panel title={U.forestTitle} plain><ForestPlot result={r} /></Panel>}
      {r.pk.length > 0 && <Panel title={U.pkTitle} plain><PkCurves result={r} arms={arms} /></Panel>}
      {r.survival.length > 0 && <Panel title={U.survivalTitle} plain><SurvivalCurves result={r} arms={arms} /></Panel>}
      {r.responseRate.length > 0 && (
        <Panel title={U.responseTitle}>
          <HBars label={U.responseBars} max={100} rows={r.responseRate.map((x) => ({ label: armName(arms, x.arm), value: x.pct, text: `${x.pct}%`, tone: x.arm === 'high' ? 'hi' : x.arm === 'control' ? 'dim' : undefined }))} />
        </Panel>
      )}
    </>
  );
}

function ResultTeam({ data, pick }: { data: ClinicalResponse; pick: ResultPick }) {
  const { revealed, trial, setPick } = pick;
  const aeRows = useMemo(() => (trial?.result ? [...trial.result.adverseEvents].sort((a, b) => b.grade - a.grade) : []), [trial]);
  if (!trial?.result) {
    const cur = data.current;
    return (
      <Panel title={U.resultPanel}>
        <p className="mini">{cur?.status === 'running' ? f(K.running, { phase: PHASE_LABEL[cur.phase], progress: cur.progressPct ?? 0, day: Math.ceil(cur.endsGameDay ?? 0) }) : cur ? U.resultLater : U.noResult}</p>
      </Panel>
    );
  }
  const r = trial.result;
  const arms = trial.protocol.arms;
  const cmp = r.primary.comparison;
  const sae = (id: string) => r.sae.find((x) => x.arm === id)?.n ?? 0;
  const dlt = (id: string) => r.dlt.find((x) => x.arm === id)?.n ?? 0;
  const next = trial.verdict === 'pass' ? nextPhase(trial.phase) : null;
  const drops = Object.entries(r.arms.flatMap((a) => a.discontinued).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.reason]: (acc[d.reason] ?? 0) + d.n }), {}));
  return (
    <>
      {revealed.length > 1 && (
        <div className="s41-picks" role="group" aria-label={U.pickLabel}>
          {revealed.map((t) => (
            <button key={t.id} type="button" className="btn sm" aria-pressed={t.id === trial.id} onClick={() => setPick(t.id)}>
              {t.verdict === 'pass' ? '✓' : '✕'} {f(U.tabSubAttempt, { phase: PHASE_LABEL[t.phase], n: t.attempt })}
            </button>
          ))}
        </div>
      )}
      <Panel title={`${trial.verdict === 'pass' ? '✓' : '✕'} ${f(trial.verdict === 'pass' ? K.verdictPass : K.verdictHeld, { phase: PHASE_LABEL[trial.phase] })}${trial.holdKind ? ` — ${K.holdKind[trial.holdKind]}` : ''}`} tone={trial.verdict === 'pass' ? 'good' : 'bad'}>
        <p className="mini" style={{ marginTop: 0 }}>
          {trial.holdKind ? `${K.holdWhy[trial.holdKind]} ${K.verdictHeldNext}` : next ? f(K.verdictPassNext, { next: PHASE_LABEL[next] }) : K.done}
        </p>
        <div className="tbl-w">
          <table>
            <caption className="sr">{U.summaryCaption}</caption>
            <tbody>
              <tr><th scope="row">{U.rowEnrolled}</th><td className="num">{f(U.rowEnrolledVal, { n: r.arms.reduce((s, a) => s + a.randomized, 0), completed: r.arms.reduce((s, a) => s + a.completed, 0) })}</td></tr>
              <tr><th scope="row">{U.rowPrimary}</th><td>{r.primary.name} ({r.primary.unit} · {r.primary.higherIsBetter ? U.higherBetter : U.lowerBetter})</td></tr>
              {cmp && <tr><th scope="row">{U.rowDiff}</th><td className="num">{cmp.diff} [{cmp.ciLow}, {cmp.ciHigh}] · p {cmp.p < 0.001 ? '< 0.001' : `= ${cmp.p}`} {cmp.p < 0.05 ? U.sig : U.notSig}</td></tr>}
              <tr><th scope="row">{U.rowSae}</th><td className="num">{arms.map((a) => `${a.label} ${sae(a.id)}`).join(' · ')}</td></tr>
              {r.dlt.length > 0 && <tr><th scope="row">{U.rowDlt}</th><td className="num">{arms.filter((a) => a.doseMg > 0).map((a) => `${a.label} ${dlt(a.id)}`).join(' · ')}</td></tr>}
              <tr><th scope="row">{U.rowPeople}</th><td className="num">{f(U.rowPeopleVal, { age: r.demographics.ageMean, sd: r.demographics.ageSd, female: r.demographics.femalePct })}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="s41-analysis"><b>{U.analysis} · </b>{r.analysis}</p>
        <p className="mini"><b>{U.rec} · </b>{r.recommendation}</p>
      </Panel>
      <Panel title={U.consortTitle} plain><ConsortFlow result={r} arms={arms} /></Panel>
      <Panel title={U.primaryTitle} plain>
        <PrimaryBars result={r} arms={arms} />
      </Panel>
      <Panel title={U.aeTitle} plain>
        <AeStacked result={r} arms={arms} />
        <div className="tbl-w">
          <table>
            <caption className="sr">{U.aeCaption}</caption>
            <thead><tr><th>{U.thAe}</th><th className="num">{U.thGrade}</th>{arms.map((a) => <th key={a.id} className="num">{a.label}</th>)}</tr></thead>
            <tbody>
              {aeRows.map((ae, i) => (
                <tr key={i} className={ae.grade >= 3 ? 'on' : undefined}>
                  <td>{systemLabel(ae.system)} · {ae.term}</td>
                  <td className="num">{ae.grade >= 3 ? '⚠ ' : ''}{ae.grade}</td>
                  {arms.map((a) => <td key={a.id} className="num">{ae.counts.find((x) => x.arm === a.id)?.n ?? 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mini muted">{f(U.dropLine, { list: drops.map(([k, n]) => `${K.dropReason[k as keyof typeof K.dropReason] ?? k} ${n}`).join(' · ') || U.none })}</p>
      </Panel>
    </>
  );
}

// ── ⑤ 보류 뒤 재도전 ──

function RetryTools({ data }: { data: ClinicalResponse }) {
  const held = data.trials[0];
  if (!held || held.status !== 'held') return null;
  const routes = data.routes.filter((r) => r.route === 'same' || r.route === 'amend' || r.route === 'backup');
  return (
    <>
      <Panel title={K.viz.fork.title} plain>
        <ForkDiagram
          phase={held.phase}
          routes={routes.map((r) => ({
            label: K.routes[r.route],
            sub: r.route === 'backup' ? f(U.forkBackupSub, { code: r.codeName ?? '', fee: c(r.feeCrista), days: r.waitDays }) : r.route === 'amend' ? U.forkAmendSub : f(U.forkSameSub, { phase: PHASE_LABEL[r.phase] }),
            ok: r.available,
          }))}
        />
        <ul className="s41-qs">
          {(['same', 'amend', 'backup'] as const).map((k) => (
            <li key={k}><b>{K.routes[k]}</b><span className="mini muted">{f(K.routeWhy[k], { fee: c(BACKUP_SWAP_FEE_CRISTA), waitDays: BACKUP_SWAP_WAIT_DAYS })}</span></li>
          ))}
        </ul>
      </Panel>
      {held.result && <Panel title={U.heldRecTitle}><p className="mini" style={{ margin: 0 }}>{held.result.recommendation}</p></Panel>}
    </>
  );
}

function RetryTeam({ data, reload }: { data: ClinicalResponse; reload: () => void }) {
  const act = useAction();
  const held = data.trials[0];
  const [choice, setChoice] = useState<{ form: IndForm; doseMg: number } | null>(null);
  if (!held || held.status !== 'held') return <Panel title={U.retryPanel}><p className="mini">{U.noHeld}</p></Panel>;
  const routes = data.routes;
  const amend = routes.find((r) => r.route === 'amend');
  const run = (body: Record<string, unknown>) => act.run(async () => { await api.post(CLINICAL_API.open, body); reload(); });
  return (
    <>
      <Panel title={f(U.heldTitle, { phase: PHASE_LABEL[held.phase], kind: held.holdKind ? K.holdKind[held.holdKind] : '' })} tone="bad">
        <div className="s41-routes">
          {routes.filter((r) => r.route !== 'amend').map((r) => (
            <RouteButton key={r.route} r={r} busy={act.busy} onGo={() => run({ route: r.route })} />
          ))}
        </div>
        {amend && (
          <fieldset className="s41-amend">
            <legend>{K.routes.amend}</legend>
            <div className="tbl-w">
              <table>
                <caption className="sr">{U.amendCaption}</caption>
                <thead><tr><th>{U.thPick}</th><th>{U.thFormDose}</th><th className="num">E</th><th className="num">S</th><th>{U.thRule}</th></tr></thead>
                <tbody>
                  {amend.options?.map((o) => (
                    <tr key={`${o.form}${o.doseMg}`} className={o.ok ? undefined : 'dim'}>
                      <td><input type="radio" name="s41-amend" aria-label={`${FORM_LABEL[o.form]} ${o.doseMg} mg`} disabled={!o.ok} checked={choice?.form === o.form && choice.doseMg === o.doseMg} onChange={() => setChoice({ form: o.form, doseMg: o.doseMg })} /></td>
                      <td>{FORM_LABEL[o.form]} · {o.doseMg} mg</td>
                      <td className="num">{o.efficacy.toFixed(1)}</td>
                      <td className="num">{o.safety.toFixed(1)}</td>
                      <td className="mini">{o.ok ? (o.resetsToPhase1 ? U.amendOkReset : '✓') : `✕ ${o.reason}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mini muted">{K.resetsToPhase1}</p>
            <button className="btn" type="button" disabled={!choice || act.busy} onClick={() => choice && run({ route: 'amend', form: choice.form, doseMg: choice.doseMg })}>{U.amendGo}</button>
          </fieldset>
        )}
        {act.error && <p className="err">{act.error}</p>}
      </Panel>
      {held.bounty && <BountyPanel trial={held} reload={reload} />}
    </>
  );
}

function RouteButton({ r, busy, onGo }: { r: RouteOptionView; busy: boolean; onGo: () => void }) {
  const [ask, setAsk] = useState(false);
  const label = f(K.routes[r.route], { phase: PHASE_LABEL[r.phase] });
  const why = r.route === 'backup' ? f(K.routeWhy.backup, { fee: c(r.feeCrista), waitDays: r.waitDays }) : K.routeWhy.same;
  return (
    <div className="s41-route">
      <button className="btn" type="button" disabled={!r.available || busy} onClick={() => (r.feeCrista > 0 ? setAsk(true) : onGo())}>
        {r.available ? '' : '🔒 '}{label}{r.feeCrista > 0 && <span className="cost"> {c(r.feeCrista)}</span>}
      </button>
      <span className="mini muted">{r.reason ?? (r.route === 'backup' ? f(U.backupWait, { code: r.codeName ?? '', days: r.waitDays }) : K.routeWhy.same)}</span>
      <Confirm open={ask} title={label} confirmLabel={U.backupConfirm} tone="bad" busy={busy} onCancel={() => setAsk(false)} onConfirm={() => { setAsk(false); onGo(); }}>
        <p>{why}</p>
        <p className="mini">{f(U.backupFee, { fee: c(r.feeCrista), days: r.waitDays })}</p>
        <p className="mini muted">{K.backupDoseFit}</p>
      </Confirm>
    </div>
  );
}

function BountyPanel({ trial, reload }: { trial: TrialView; reload: () => void }) {
  const b = trial.bounty!;
  const act = useAction();
  const [axis, setAxis] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [remedy, setRemedy] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ passed: boolean; hints: string[]; refundCrista: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!b.retryAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [b.retryAt]);
  const wait = b.retryAt ? Math.max(0, Math.ceil((Date.parse(b.retryAt) - now) / 1000)) : 0;
  const len = [...text.trim()].length;
  if (b.claimed) return <Panel title={U.bountyTitle} tone="good"><p className="mini" style={{ margin: 0 }}>{f(K.bountyOk, { crista: c(b.refundCrista) })}</p></Panel>;
  if (!b.eligible) return <Panel title={U.bountyTitle}><p className="mini" style={{ margin: 0 }}>{b.reason ?? U.notEligible}</p></Panel>;
  const hints = result?.hints ?? b.lastHints;
  return (
    <Panel title={U.bountyFormTitle} sub={f(U.bountyMax, { crista: c(b.refundCrista) })}>
      <p className="mini" style={{ marginTop: 0 }}>{f(K.bountyIntro, { rate: Math.round(TRIAL_BOUNTY_RATE[trial.phase] * 100) })} {f(K.bountyRetryRule, { sec: TRIAL_BOUNTY_RETRY_SEC })}</p>
      <form
        className="s41-bounty"
        onSubmit={(e) => {
          e.preventDefault();
          void act.run(async () => {
            const out = await api.post<{ passed: boolean; hints: string[]; refundCrista: number }>(CLINICAL_API.bounty(trial.id), { axis, factors, remedy, analysis: text });
            setResult(out);
            reload();
          });
        }}
      >
        <fieldset>
          <legend>{K.bountyQ.axis}</legend>
          {b.choices.axes.map((o) => <label key={o.id}><input type="radio" name="s41-axis" value={o.id} checked={axis === o.id} onChange={() => setAxis(o.id)} /> {o.label}</label>)}
        </fieldset>
        <fieldset>
          <legend>{K.bountyQ.factors}</legend>
          {b.choices.factors.map((o) => (
            <label key={o.id}><input type="checkbox" checked={factors.includes(o.id)} onChange={(e) => setFactors((x) => (e.target.checked ? [...x, o.id] : x.filter((y) => y !== o.id)))} /> {o.label}</label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{K.bountyQ.remedy}</legend>
          {b.choices.remedies.map((o) => <label key={o.id}><input type="radio" name="s41-remedy" value={o.id} checked={remedy === o.id} onChange={() => setRemedy(o.id)} /> {o.label}</label>)}
        </fieldset>
        <label className="lab" htmlFor="s41-ana">{K.bountyText}</label>
        <textarea id="s41-ana" className="txt" rows={4} maxLength={TRIAL_BOUNTY_TEXT_MAX} value={text} placeholder={f(K.bountyHint, { min: TRIAL_BOUNTY_TEXT_MIN })} onChange={(e) => setText(e.target.value)} />
        <p className="mini muted mono">{len} / {TRIAL_BOUNTY_TEXT_MAX}</p>
        <button className="btn pri" type="submit" disabled={act.busy || !axis || !remedy || len < TRIAL_BOUNTY_TEXT_MIN || wait > 0}>{wait > 0 ? f(U.bountyRetryIn, { sec: wait }) : U.bountySubmit}</button>
      </form>
      {result && <p className={result.passed ? 'hint' : 'hint bad'} role="status">{result.passed ? f(K.bountyOk, { crista: c(result.refundCrista) }) : f(K.bountyNo, { sec: TRIAL_BOUNTY_RETRY_SEC })}</p>}
      {hints.length > 0 && !result?.passed && <ul className="s41-hints">{hints.map((h) => <li key={h}>{h}</li>)}</ul>}
      {act.error && <p className="err">{message(act.error)}</p>}
    </Panel>
  );
}
