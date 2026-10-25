/**
 * 1.2 화합물 스크리닝 — 확정 화면(기능 F12 · 설계 §5.5 · §5.5.1 · 미리보기 design/screening-pipeline.html · 단계 시각화 1.2-01~05).
 *
 * 네 걸음(머리 섬 사슬 — 개인 상태): ① 미션 브리핑 ② 모둠 기준 회의 ③ 스크리닝 실행 ④ 분자 쇼핑 ⇒ 2.1. 넘기기만 하던 ⑤ 탭은 2026-10-25 합의안으로
 * 없앴다 — 확정서는 공유 자료 맨 위(`Receipt`), 다음 단계로는 바닥 띠가 데려간다(남은 일 = ③ 스크리닝 1회).
 * 왼쪽 섬 = 내 작업대(나만 · 무료 · 브라우저 계산 — 01 기준 설계실 · 02 분포 보고 문턱 · 03 화학 공간 울타리 · 04 내가 심사관 · 05 표로 고르기),
 * 오른쪽 섬 = 모둠 공유(`GET /api/screen` + 모둠 WS 'screen.changed' · 'board.changed'). 모둠으로 넘어가는 길은 '모둠에 제안' · '찬성' · '실행' · '찜하기'뿐.
 * 점수판 · 깔때기 띠는 규격 `screenFunnel` 하나로 센다(서버 실행 스냅숏과 같은 함수). 학생 문구는 규격 `SCREEN_COPY`.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  API,
  BRIEFING_OPTIONS,
  centsToCrista,
  CLAIM_REASONS,
  claimCoach,
  CLAIMS_PER_PERSON,
  isClaimReason,
  LEGACY_REASON,
  agendaCoach,
  APPROVED_LIBRARY,
  adviceCriteria,
  SCREEN_AGENDA_RANGE,
  SCREEN_AGENDA_REASONS,
  SCREEN_AGENDAS,
  SCREEN_API,
  SCREEN_BANDS,
  SCREEN_COPY,
  SHELF_PAGE,
  SHOP_FILTER_LIMITS,
  screenAgendaHints,
  screenAgendaQuestion,
  screenBiggestCut,
  screenFill,
  screenFunnel,
  screenMission,
  screenPass,
  screenReasonLabel,
  screenRuleText,
  screenValueText,
  shortName,
  type BriefingQuestion,
  type ClaimReason,
  type ScreenAgenda,
  type ScreenAgendaView,
  type ScreenCompound,
  type ScreenCriteriaPartial,
  type ScreenDatasetResponse,
  type ScreenMission,
  type ScreenProposalView,
  type ScreenResponse,
  type ScreenRunView,
  type ServerMessage,
} from '@crista-web/web-contract';
import { api, newRequestId } from '../../api.ts';
import { money } from '../../ink.ts';
import { Confirm, Panel, ReasonChips, Tabs, useBenchState, useLive, useLocalTab, type TabItem } from '../ui/index.ts';
import { StepLayout, useAction, type StepProps } from './common.tsx';
import { AgendaHist, coachVerdict, Drawer, FunnelBars, FunnelStrip, HistLegend, MemberChip, Scoreboard, SmilesBox, type HistFlag } from './s12-parts.tsx';
import { AgendaControl, ChemMap, CriteriaLab, initialMap, JudgeCards, LAB_PRESETS, ShelfTable, type JudgeState, type LabState, type MapState } from './s12-tools.tsx';
import './s12.css';

const C = SCREEN_COPY;
const TABS = ['brief', 'meet', 'run', 'shop'] as const;
type StepTab = (typeof TABS)[number];
const NO = ['①', '②', '③', '④'];
/** 띠 '하러 가기' — 남은 일(스크리닝 1회)은 ③ 실행 판으로. */
const GO = { screen: { tab: 'run', spot: 'go-s12-run' } };

/** 이 화면을 다시 읽을 WS 소식 — 회의 칸 · 찜 · 1.2 작업 · 표적. */
const refetchOn = (m: ServerMessage) =>
  m.type === 'screen.changed' || m.type === 'job.progress' || (m.type === 'board.changed' && (m.reason === 'claim' || m.reason === 'target' || m.reason.endsWith('1.2')));

export function Step12(props: StepProps) {
  const { board, step } = props;
  const targetId = board.program.targetId;
  const [tab, setTab] = useLocalTab<StepTab>('step:1.2', TABS, 'brief');
  const live = useLive<ScreenResponse>(targetId ? SCREEN_API.screen : null, refetchOn);
  const ds = useLive<ScreenDatasetResponse>(targetId ? `${SCREEN_API.compounds}?t=${encodeURIComponent(targetId)}` : null);

  if (!targetId || !live.data || !ds.data) {
    const err = live.error ?? ds.error;
    return (
      <StepLayout
        board={board}
        step={step}
        go={GO}
        team={<div className="s12"><Panel>{!targetId ? C.noTarget : err ? <p className="err">{err.message}</p> : <p className="muted">{C.loading}</p>}</Panel></div>}
      />
    );
  }
  return <Screen12 {...props} s={live.data} ds={ds.data} tab={tab} setTab={setTab} reloadScreen={live.reload} />;
}

interface ScreenProps extends StepProps {
  s: ScreenResponse;
  ds: ScreenDatasetResponse;
  tab: StepTab;
  setTab: (t: StepTab) => void;
  reloadScreen: () => void;
}

function Screen12(p: ScreenProps) {
  const { board, step, s, ds, tab, setTab } = p;
  const mission = screenMission(s.targetId);
  const target = board.diseases.find((d) => d.targetId === s.targetId) ?? null;
  const gene = mission?.gene ?? target?.gene ?? C.ui.targetFallback;
  const byId = useMemo(() => new Map(ds.compounds.map((c) => [c.id, c])), [ds]);
  const names = useMemo(() => new Map(ds.compounds.map((c) => [c.id, c.name])), [ds]);
  const control = mission ? (byId.get(mission.controlId) ?? null) : null;
  const act = useAction();
  const [note, setNote] = useState<string | null>(null);
  const after = (msg?: string) => {
    p.reloadScreen();
    p.reload();
    if (msg) setNote(msg);
  };

  const rev = s.revisionId;
  const [drafts, setDrafts] = useBenchState<ScreenCriteriaPartial>(`s12:draft:${rev}`, {});
  const [agendaSel, setAgendaSel] = useBenchState<ScreenAgenda>('s12:agenda', 'mw');
  const [meetTool, setMeetTool] = useLocalTab('step:1.2:meet', ['agenda', 'lab', 'map'] as const, 'agenda');
  const [briefTool, setBriefTool] = useLocalTab('step:1.2:brief', ['mission', 'judge'] as const, 'mission');
  const [lab, setLab] = useBenchState<LabState>(`s12:lab:${rev}`, () => LAB_PRESETS.advice(mission));
  const [map, setMap] = useBenchState<MapState>(`s12:map:${rev}`, initialMap);
  const [judge, setJudge] = useBenchState<JudgeState>(`s12:judge:${s.targetId}`, { dec: {}, open: false });

  const agreedF = useMemo(() => screenFunnel(ds, s.agreed), [ds, s.agreed]);
  const myCrit: ScreenCriteriaPartial = { ...s.agreed };
  for (const a of SCREEN_AGENDAS) if (s.agreed[a] === undefined && drafts[a] !== undefined) myCrit[a] = drafts[a];
  const myF = screenFunnel(ds, myCrit);
  const mineMarks = Object.fromEntries(SCREEN_AGENDAS.map((a) => [a, s.agreed[a] === undefined && drafts[a] !== undefined]));

  const readers = new Set(s.briefing.filter((b) => b.question === 'read').map((b) => b.userId));
  const agreedCount = SCREEN_AGENDAS.filter((a) => s.agreed[a] !== undefined).length;
  const succeeded = s.runs.filter((r) => r.status === 'succeeded' && r.snapshot);
  const shelfRun = s.shelf ? s.runs.find((r) => r.jobId === s.shelf!.jobId) ?? null : null;
  const tabs: TabItem[] = [
    { id: 'brief', no: NO[0], label: C.steps.brief, sub: screenFill(C.ui.tabRead, { n: readers.size, m: s.members.length }), mark: readers.size >= s.members.length ? '✓' : undefined },
    { id: 'meet', no: NO[1], label: C.steps.meet, sub: screenFill(C.ui.tabAgreed, { n: agreedCount }), mark: s.allAgreed ? '✓' : undefined },
    { id: 'run', no: NO[2], label: C.steps.run, sub: succeeded.length ? screenFill(C.ui.tabRuns, { n: succeeded.length, k: shelfRun?.snapshot?.final ?? 0 }) : C.ui.tabNotYet, mark: succeeded.length ? '✓' : undefined },
    { id: 'shop', no: NO[3], label: C.steps.shop, sub: screenFill(C.ui.tabClaims, { n: s.claims.length }), mark: s.claims.length ? '✓' : undefined },
  ];

  const ctx: Ctx = { ...p, mission, gene, byId, names, control, act, after, drafts, setDrafts, agendaSel, setAgendaSel, agreedF, myF, mineMarks, readers };

  let mine: ReactNode;
  let team: ReactNode;
  let teamTitle: string | undefined;
  if (tab === 'brief') {
    mine = (
      <>
        <Tabs size="sm" label={C.ui.toolBrief} value={briefTool} onChange={(id) => setBriefTool(id as typeof briefTool)} items={[{ id: 'mission', label: C.ui.toolMission }, { id: 'judge', label: C.judge.title, disabled: !mission }]} />
        {briefTool === 'judge' && mission ? <JudgeCards ds={ds} mission={mission} gene={gene} state={judge} setState={setJudge} /> : <BriefMine c={ctx} />}
        {briefTool === 'judge' && judge.open && mission && <p className="hint">{screenFill(C.judge.hintNote, { n: judgeSame(ds, mission, judge), m: mission.judgeCards.length })}</p>}
      </>
    );
    teamTitle = C.ui.teamBrief;
    team = <BriefTeam c={ctx} />;
  } else if (tab === 'meet') {
    mine = (
      <>
        <AgendaTabs c={ctx} />
        <Tabs size="sm" label={C.ui.toolMeet} value={meetTool} onChange={(id) => setMeetTool(id as typeof meetTool)} items={[{ id: 'agenda', label: C.ui.toolAgenda }, { id: 'lab', label: C.lab.title }, { id: 'map', label: C.map.title }]} />
        {meetTool === 'agenda' && <><Scoreboard f={myF} title={C.scoreboard.mine} /><AgendaBench key={`${agendaSel}-${rev}`} c={ctx} agenda={agendaSel} /></>}
        {meetTool === 'lab' && (
          <CriteriaLab
            ds={ds}
            mission={mission}
            gene={gene}
            state={lab}
            setState={setLab}
            names={names}
            onSend={(values) => {
              const open = sendableAgendas(s, values);
              setDrafts((d) => ({ ...d, ...Object.fromEntries(open.map((a) => [a, values[a]])) }));
              if (open[0]) {
                setAgendaSel(open[0]);
                setMeetTool('agenda');
              }
              setNote(open.length ? screenFill(C.lab.sent, { n: open.length }) : C.lab.sentNone);
            }}
          />
        )}
        {meetTool === 'map' && (
          <ChemMap
            ds={ds}
            state={map}
            setState={setMap}
            onTake={(values) => {
              const open = sendableAgendas(s, values);
              setDrafts((d) => ({ ...d, ...Object.fromEntries(open.map((a) => [a, values[a]])) }));
              setNote(open.length ? screenFill(C.map.taken, { list: open.map((a) => C.agenda[a].sym).join(' · ') }) : C.map.takeNone);
            }}
          />
        )}
      </>
    );
    teamTitle = C.ui.teamMeet;
    team = <MeetTeam c={ctx} />;
  } else if (tab === 'run') {
    mine = <RunMine c={ctx} />;
    team = <RunTeam c={ctx} />;
    teamTitle = C.ui.teamRun;
  } else {
    mine = <ShopMine c={ctx} />;
    teamTitle = C.ui.teamShop;
    team = <Cart c={ctx} />;
  }

  return (
    <StepLayout
      board={board}
      step={step}
      tabs={tabs}
      tab={tab}
      onTab={(id) => setTab(id as StepTab)}
      tabsLabel={C.ui.tabsLabel}
      go={GO}
      ratio={tab === 'meet' || tab === 'shop' ? 'mine' : 'even'}
      mine={<div className="s12">{note && <p className="s12-note" role="status" onClick={() => setNote(null)}>{note}</p>}{act.error && <p className="err">{act.error}</p>}{!mission && <p className="hint">{C.noMission}</p>}{mine}</div>}
      teamTitle={teamTitle}
      team={<div className="s12"><Receipt c={ctx} />{team}</div>}
    />
  );
}

/** 제안 초안을 채울 수 있는 안건 — 아직 합의하지 않았고 내 제안이 없는 안건(01 · 03 '모둠으로 넘기기' 규칙). */
function sendableAgendas(s: ScreenResponse, values: ScreenCriteriaPartial): ScreenAgenda[] {
  return SCREEN_AGENDAS.filter((a) => values[a] !== undefined && s.agreed[a] === undefined && !s.agendas.find((g) => g.agenda === a)?.proposals.some((pp) => pp.proposedBy === s.me));
}

function judgeSame(ds: ScreenDatasetResponse, m: ScreenMission, j: JudgeState): number {
  const adv = adviceCriteria(m);
  return m.judgeCards.filter((jc) => {
    const c = ds.compounds.find((x) => x.id === jc.compoundId);
    const d = j.dec[jc.compoundId];
    return c && d && (d === 'y') === SCREEN_AGENDAS.every((a) => screenPass(a, c, adv[a]));
  }).length;
}

interface Ctx extends ScreenProps {
  mission: ScreenMission | null;
  gene: string;
  byId: Map<string, ScreenCompound>;
  names: Map<string, string>;
  control: ScreenCompound | null;
  act: ReturnType<typeof useAction>;
  after: (msg?: string) => void;
  drafts: ScreenCriteriaPartial;
  setDrafts: (fn: (d: ScreenCriteriaPartial) => ScreenCriteriaPartial) => void;
  agendaSel: ScreenAgenda;
  setAgendaSel: (a: ScreenAgenda) => void;
  agreedF: ReturnType<typeof screenFunnel>;
  myF: ReturnType<typeof screenFunnel>;
  mineMarks: Partial<Record<ScreenAgenda, boolean>>;
  readers: Set<string>;
}

const memberName = (s: ScreenResponse, userId: string) => s.members.find((m) => m.userId === userId)?.displayName ?? C.unknownMember;
const memberAvatar = (s: ScreenResponse, userId: string) => s.members.find((m) => m.userId === userId)?.avatar ?? null;
const dockCrista = (s: ScreenResponse) => centsToCrista(s.costs.dockCents);
/** 2.1 도킹 대기열 수 = 찜 + 대조군 1(대조군을 찜했으면 따로 붙지 않는다 — 두 번 세지 않게). */
const dockQueue = (s: ScreenResponse, control: ScreenCompound | null) => s.claims.length + (control && s.claims.some((x) => x.compoundId === control.id) ? 0 : 1);

// ── ① 미션 브리핑 ──

function BriefMine({ c }: { c: Ctx }) {
  const { mission, control, gene } = c;
  return (
    <>
      {mission && (
        <Panel title={C.briefing.missionTitle} sub={C.briefing.missionSub}>
          <p className="s12-q">{mission.title}</p>
          <p className="s12-p">{mission.story}</p>
          <div className="chips"><span className="chip">{gene}</span><span className="chip">{mission.disease}</span><span className="chip">PDB {mission.pdbId}</span></div>
        </Panel>
      )}
      {control && (
        <Panel title={C.briefing.refTitle} sub={C.ui.realDrugSub}>
          <p className="s12-q" style={{ fontSize: 16 }}>{control.name}</p>
          {control.mechanism && <p className="mini muted">{control.mechanism}</p>}
          <SmilesBox smiles={control.smiles} />
          <dl className="s12-kv">
            {(['mw', 'tpsa'] as const).map((a) => <div key={a}><dt>{C.ind[a].sym}</dt><dd>{Math.round(control[a])}</dd></div>)}
            <div><dt>cLogP</dt><dd>{control.clogp.toFixed(1)}</dd></div>
            <div><dt>Ro5</dt><dd>{screenFill(C.ui.histN, { n: control.ro5 })}</dd></div>
            <div><dt>{C.ind.alert.sym}</dt><dd>{screenValueText('alert', control)}</dd></div>
            <div><dt>QED</dt><dd>{control.qed.toFixed(2)}</dd></div>
          </dl>
          <p className="mini muted">{C.briefing.refNote}</p>
          <p className="mini muted">{C.structureNote}</p>
        </Panel>
      )}
      <Panel title={C.ui.dict} sub={C.ui.dictSub}>
        <dl className="s12-dict">
          {(['mw', 'tpsa', 'clogp', 'ro5', 'alert', 'qed', 'score'] as const).map((k) => (
            <div key={k}><dt>{C.ind[k].name} <span className="mono mini">{C.ind[k].sym}</span></dt><dd>{C.ind[k].what} <span className="muted">{C.ind[k].good}</span></dd></div>
          ))}
        </dl>
      </Panel>
    </>
  );
}

function BriefTeam({ c }: { c: Ctx }) {
  const { s, mission, act, after, readers } = c;
  const ask = (question: BriefingQuestion, answer: string) => void act.run(async () => {
    await api.post(SCREEN_API.briefing, { question, answer });
    after();
  });
  const iRead = readers.has(s.me);
  return (
    <>
      <Panel title={C.briefing.quizTitle} sub={C.briefing.quizSub}>
        {(['cns', 'dur', 'route'] as const).map((q) => {
          const Q = C.briefing[q];
          const answers = s.briefing.filter((b) => b.question === q);
          const mine = answers.find((b) => b.userId === s.me)?.answer;
          const right = mission ? (q === 'cns' ? mission.cns : q === 'dur' ? mission.dur : mission.route) : null;
          return (
            <fieldset key={q} className="s12-warm">
              <legend className="s12-q" style={{ fontSize: 15 }}>{Q.q}</legend>
              <div className="chips">
                {BRIEFING_OPTIONS[q].map((o) => (
                  <button key={o} type="button" className="rchip" aria-pressed={mine === o} disabled={act.busy} onClick={() => ask(q, o)}>
                    {(Q.opts as Record<string, string>)[o]}
                  </button>
                ))}
              </div>
              <div className="row s12-answers">
                {answers.length ? answers.map((b) => (
                  <span key={b.userId} className="row" style={{ gap: 4 }}>
                    <MemberChip small name={memberName(s, b.userId)} avatar={memberAvatar(s, b.userId)} me={b.userId === s.me} />
                    <span className="mini">{memberName(s, b.userId)} · {(Q.opts as Record<string, string>)[b.answer] ?? b.answer}</span>
                  </span>
                )) : <span className="mini muted">{C.briefing.nobody}</span>}
              </div>
              {mine && right && (
                <p className={`verdict ${mine === right ? 'ok' : 'warn'}`} role="status">
                  <b aria-hidden="true">{mine === right ? '✓' : '!'}</b> {mine === right ? `${C.briefing.right} ${Q.link}` : `${C.briefing.wrong} ${C.briefing.wrongHint}`}
                </p>
              )}
            </fieldset>
          );
        })}
      </Panel>
      <Panel title={C.members} sub={C.ui.readSub}>
        <ul className="s12-readers">
          {s.members.map((m) => (
            <li key={m.userId}>
              <MemberChip name={m.displayName} avatar={m.avatar} me={m.userId === s.me} />
              <span className={readers.has(m.userId) ? 'good' : 'muted'}>{readers.has(m.userId) ? C.briefing.readDone : C.briefing.readNot}</span>
            </li>
          ))}
        </ul>
        <div className="acts">
          <span className="note">{screenFill(C.briefing.readCount, { n: readers.size, m: s.members.length })}</span>
          {iRead ? (
            <button type="button" className="btn pri" onClick={() => c.setTab('meet')}>{C.briefing.toMeeting}</button>
          ) : (
            <button type="button" className="btn pri" disabled={act.busy} onClick={() => ask('read', '1')}>{C.briefing.readBtn}</button>
          )}
        </div>
      </Panel>
    </>
  );
}

// ── ② 모둠 기준 회의 ──

function AgendaTabs({ c }: { c: Ctx }) {
  const { s, gene, agendaSel, setAgendaSel } = c;
  const items: TabItem[] = s.agendas.map((g) => {
    const voters = new Set(g.proposals.flatMap((pp) => pp.votes.map((v) => v.voter))).size;
    return {
      id: g.agenda,
      label: `${C.agenda[g.agenda].label} · ${C.agenda[g.agenda].sym}`,
      sub: g.status === 'agreed' ? screenFill(C.meeting.tabStatusAgreed, { rule: screenRuleText(g.agenda, g.value, gene) }) : screenFill(C.meeting.tabStatusOpen, { n: voters, m: s.members.length }),
      mark: g.status === 'agreed' ? '✓' : undefined,
    };
  });
  return <Tabs size="sm" label={C.ui.agendaTabs} value={agendaSel} onChange={(id) => setAgendaSel(id as ScreenAgenda)} items={items} />;
}

const defaultValue = (a: ScreenAgenda): number => {
  if (a === 'alert') return 1;
  if (a === 'ro5') return 0;
  const r = SCREEN_AGENDA_RANGE[a];
  return Math.round((r.min + (r.max - r.min) / 2) / r.step) * r.step;
};

function othersAgreed(s: ScreenResponse, a: ScreenAgenda): ScreenCriteriaPartial {
  const o = { ...s.agreed };
  delete o[a];
  return o;
}

function AgendaBench({ c, agenda }: { c: Ctx; agenda: ScreenAgenda }) {
  const { s, ds, mission, gene, control, drafts, setDrafts, act, after } = c;
  const g = s.agendas.find((x) => x.agenda === agenda)!;
  const agreed = g.status === 'agreed';
  const mineP = g.proposals.find((pp) => pp.proposedBy === s.me);
  const v = drafts[agenda] ?? mineP?.value ?? (agreed && g.value !== null ? g.value : defaultValue(agenda));
  const [reason, setReason] = useState<string | null>(null);
  const others = othersAgreed(s, agenda);
  const coachCtx = { mission, ds, agreedOthers: others, dockCrista: dockCrista(s) };
  const f = screenFunnel(ds, { ...others, [agenda]: v });
  const step = f.steps.find((x) => x.agenda === agenda)!;
  const alone = ds.compounds.filter((x) => x.known && !screenPass(agenda, x, v));
  const ctlPass = control ? screenPass(agenda, control, v) : true;
  const flags: HistFlag[] = g.proposals.filter((pp) => pp.proposedBy !== s.me).map((pp) => ({ x: pp.value, label: pp.byName.slice(0, 1), title: `${pp.byName} — ${screenRuleText(agenda, pp.value, gene)}` }));
  const I = C.ind[agenda];
  const rule = screenRuleText(agenda, v, gene);
  return (
    <Panel title={C.meeting.benchTitle} sub={`${C.agenda[agenda].label} · ${C.agenda[agenda].sym}`}>
      <p className="s12-q">{screenAgendaQuestion(agenda, mission)}</p>
      <dl className="s12-aw">
        <div><dt>{C.ui.agendaWhat}</dt><dd>{C.agenda[agenda].what}</dd></div>
        <div><dt>{C.ui.agendaWhy}</dt><dd>{C.agenda[agenda].why}</dd></div>
      </dl>
      <ul className="s12-hints">{screenAgendaHints(agenda, mission).map((h) => <li key={h}>{h}</li>)}</ul>
      <details className="s12-expl">
        <summary>{screenFill(C.meeting.whatIs, { sym: I.sym, name: I.name })}</summary>
        <p className="muted">{I.an}</p>
        <p><b>{I.good}</b></p>
      </details>
      <AgendaHist agenda={agenda} compounds={ds.compounds} hidden={ds.hidden} value={v} control={control} flags={flags} label={screenFill(C.ui.dist, { sym: I.sym, n: ds.total })} />
      <HistLegend controlName={control ? shortName(control.name, 8) : undefined} />
      {agenda === 'ro5' && ds.hidden > 0 && <p className="mini muted">{screenFill(C.hiddenNote, { n: ds.hidden })}</p>}
      <p className={`mini ${alone.length ? 'bad' : 'good'}`}>
        {alone.length ? `✕ ${screenFill(C.meeting.lostKnown, { list: alone.map((x) => `${shortName(x.name, 10)}(${screenValueText(agenda, x)})`).join(', ') })}` : `✓ ${C.meeting.noLostKnown}`}
      </p>
      <dl className="s12-conseq">
        <div><dt>{C.meeting.conseqCut}</dt><dd>{step.removed}<small>{C.ui.unitCount}</small></dd></div>
        <div><dt>{C.meeting.conseqLeft}</dt><dd>{f.final}<small>{C.ui.unitLeft}</small></dd></div>
        {control && <div><dt>{screenFill(C.meeting.conseqRef, { name: shortName(control.name, 6) })}</dt><dd className={ctlPass ? 'good' : 'bad'}>{ctlPass ? `✓ ${C.meeting.refPass}` : `✕ ${C.meeting.refFail}`}</dd></div>}
      </dl>
      <div className="fld">
        <span className="lab">{C.meeting.myValue}</span>
        <AgendaControl id={`bench-${agenda}`} agenda={agenda} value={v} disabled={agreed} onChange={(nv) => setDrafts((d) => ({ ...d, [agenda]: nv }))} />
      </div>
      {agreed ? (
        <p className="verdict ok" role="status"><b aria-hidden="true">✓</b> {screenFill(C.meeting.agreedNote, { rule: screenRuleText(agenda, g.value, gene) })}</p>
      ) : (
        <ReasonChips
          legend={C.meeting.why}
          chips={SCREEN_AGENDA_REASONS[agenda].map((k) => ({ id: k, label: screenReasonLabel(agenda, k) }))}
          value={reason}
          onChange={(next) => setReason(typeof next === 'string' ? next : null)}
          verdict={reason ? coachVerdict(agendaCoach(agenda, reason, v, coachCtx), C.coach.ok, true) : null}
          confirm={{
            label: screenFill(mineP ? C.meeting.repropose : C.meeting.propose, { rule }),
            busy: act.busy,
            onClick: () => void act.run(async () => {
              await api.post(SCREEN_API.proposals, { agenda, value: v, reason });
              setReason(null);
              setDrafts((d) => {
                const n = { ...d };
                delete n[agenda];
                return n;
              });
              after(C.meeting.proposed);
            }),
          }}
        />
      )}
      {mineP && !agreed && <p className="mini muted">{C.meeting.reproposeResetNote}</p>}
    </Panel>
  );
}

interface FeedItem {
  at: string;
  by: string | null;
  text: string;
  sys?: boolean;
}

function MeetTeam({ c }: { c: Ctx }) {
  const { s, ds, gene, agendaSel, agreedF, act, after, mission, control } = c;
  const g = s.agendas.find((x) => x.agenda === agendaSel)!;
  const agreed = g.status === 'agreed';
  const voters = new Set(g.proposals.flatMap((pp) => pp.votes.map((v) => v.voter)));
  const myVoteOn = g.proposals.find((pp) => pp.votes.some((v) => v.voter === s.me))?.proposedBy ?? null;
  const [voteFor, setVoteFor] = useState<string | null>(null);
  const [voteWhy, setVoteWhy] = useState<string | null>(null);
  const others = othersAgreed(s, agendaSel);
  const coachCtx = { mission, ds, agreedOthers: others, dockCrista: dockCrista(s) };

  const feed: FeedItem[] = [];
  for (const pp of g.proposals) {
    feed.push({ at: pp.updatedAt, by: pp.proposedBy, text: screenFill(C.meeting.feedProp, { rule: screenRuleText(agendaSel, pp.value, gene), reason: screenReasonLabel(agendaSel, pp.reason) }) });
    for (const v of pp.votes) {
      if (v.voter === pp.proposedBy) continue;
      feed.push({ at: v.votedAt, by: v.voter, text: screenFill(C.meeting.feedVote, { rule: screenRuleText(agendaSel, pp.value, gene), reason: screenReasonLabel(agendaSel, v.reason) }) });
    }
  }
  if (agreed && g.agreedAt) feed.push({ at: g.agreedAt, by: null, sys: true, text: screenFill(C.meeting.feedAgreed, { rule: screenRuleText(agendaSel, g.value, gene), n: g.votes ?? 0 }) });
  feed.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      <FunnelStrip f={agreedF} gene={gene} />
      <Panel
        title={screenFill(C.meeting.roomTitle, { label: C.agenda[agendaSel].label })}
        sub={agreed ? undefined : screenFill(C.meeting.quorum, { n: voters.size, m: s.members.length, q: s.quorum })}
      >
        {agreed && (
          <div className="acts">
            <span className="s12-stamp" role="status">✓ {C.meeting.stamp} · {screenRuleText(agendaSel, g.value, gene)}</span>
            <button type="button" className="btn sm" disabled={act.busy} onClick={() => void act.run(async () => { await api.post(SCREEN_API.reopen(agendaSel)); after(C.meeting.reopened); })}>{C.meeting.reopen}</button>
          </div>
        )}
        {g.proposals.length === 0 && <p className="empty">{C.meeting.noProposals}</p>}
        <div className="s12-props">
          {g.proposals.map((pp) => (
            <ProposalCard
              key={pp.proposedBy}
              c={c}
              g={g}
              pp={pp}
              isMine={myVoteOn === pp.proposedBy}
              canVote={!agreed}
              open={voteFor === pp.proposedBy}
              onOpen={() => { setVoteFor(pp.proposedBy); setVoteWhy(null); }}
            >
              {voteFor === pp.proposedBy && !agreed && (
                <ReasonChips
                  legend={C.meeting.supportWhy}
                  chips={SCREEN_AGENDA_REASONS[agendaSel].map((k) => ({ id: k, label: screenReasonLabel(agendaSel, k) }))}
                  value={voteWhy}
                  onChange={(n) => setVoteWhy(typeof n === 'string' ? n : null)}
                  verdict={voteWhy ? coachVerdict(agendaCoach(agendaSel, voteWhy, pp.value, coachCtx), C.coach.ok, true) : null}
                  confirm={{
                    label: C.meeting.supportOk,
                    busy: act.busy,
                    onClick: () => void act.run(async () => {
                      await api.post(SCREEN_API.votes, { agenda: agendaSel, proposedBy: pp.proposedBy, value: pp.value, reason: voteWhy });
                      setVoteFor(null);
                      after(C.meeting.voted);
                    }),
                  }}
                />
              )}
            </ProposalCard>
          ))}
        </div>
        {!agreed && voters.size >= s.members.length && g.proposals.length > 0 && (
          <p className="verdict warn" role="status"><b aria-hidden="true">!</b> {screenFill(C.meeting.allVotedNoQuorum, { q: s.quorum })}</p>
        )}
        {!agreed && <p className="mini muted">{C.meeting.proposeHow}</p>}
        <h4 className="lab" style={{ marginTop: 12 }}>{C.meeting.feedTitle}</h4>
        <ol className="s12-feed" aria-label={C.meeting.feedTitle}>
          {feed.map((it, i) => (
            <li key={i} className={it.sys ? 'sys' : ''}>
              {it.by ? <MemberChip small name={memberName(s, it.by)} avatar={memberAvatar(s, it.by)} /> : <span className="s12-av sys" aria-hidden="true">{C.ui.feedSys.slice(0, 1)}</span>}
              <span><b>{it.by ? memberName(s, it.by) : C.ui.feedSys}</b> {it.text}</span>
            </li>
          ))}
        </ol>
      </Panel>
      {s.allAgreed && (
        <p className="verdict ok" role="status">
          <b aria-hidden="true">✓</b> {C.meeting.allAgreed} <button type="button" className="btn sm pri" onClick={() => c.setTab('run')}>{C.meeting.toRun}</button>
        </p>
      )}
      {control && <p className="mini muted">{screenFill(C.ui.controlMark, { name: shortName(control.name, 10) })}</p>}
    </>
  );
}

function ProposalCard({ c, g, pp, isMine, canVote, open, onOpen, children }: {
  c: Ctx;
  g: ScreenAgendaView;
  pp: ScreenProposalView;
  isMine: boolean;
  canVote: boolean;
  open: boolean;
  onOpen: () => void;
  children?: ReactNode;
}) {
  const { s, ds, gene, control } = c;
  const others = othersAgreed(s, g.agenda);
  const f = screenFunnel(ds, { ...others, [g.agenda]: pp.value });
  const cut = f.steps.find((x) => x.agenda === g.agenda)!.removed;
  const ctlPass = control ? screenPass(g.agenda, control, pp.value) : true;
  const win = g.status === 'agreed' && g.proposedBy === pp.proposedBy;
  return (
    <article className={`s12-prop${win ? ' win' : ''}`}>
      <header>
        <MemberChip name={pp.byName} avatar={pp.avatar} me={pp.proposedBy === s.me} />
        <b className="s12-val">{screenRuleText(g.agenda, pp.value, gene)}</b>
        {win && <span className="sig g">✓ {C.meeting.stamp}</span>}
      </header>
      <span className="mini">{screenFill(C.meeting.reasonOf, { reason: screenReasonLabel(g.agenda, pp.reason) })}</span>
      <div className="chips">
        <span className="chip">{screenFill(C.meeting.effectCut, { n: cut })}</span>
        <span className={`chip ${f.final < SCREEN_BANDS.fewBelow ? 's12-bad' : f.final > SCREEN_BANDS.goodMax ? 's12-warn' : 's12-ok'}`}>{screenFill(C.meeting.effectLeft, { n: f.final })}</span>
        {control && <span className={`chip ${ctlPass ? 's12-ok' : 's12-bad'}`}>{screenFill(C.meeting.effectRef, { r: ctlPass ? `✓ ${C.meeting.refPass}` : `✕ ${C.meeting.refFail}` })}</span>}
      </div>
      <div className="row s12-votes">
        {pp.votes.map((v) => <MemberChip key={v.voter} small name={v.voterName} avatar={v.avatar} me={v.voter === s.me} />)}
        <span className="mini mono">{screenFill(C.meeting.votes, { n: pp.votes.length, m: s.members.length })}</span>
        {canVote && (isMine ? <span className="sig g">{C.meeting.myVote}</span> : !open && <button type="button" className="btn sm" onClick={onOpen}>{C.meeting.support}</button>)}
      </div>
      {children}
    </article>
  );
}

// ── ③ 스크리닝 실행 ──

function RunMine({ c }: { c: Ctx }) {
  const { s, ds, gene, agreedF, act, after, board } = c;
  const [ask, setAsk] = useState(false);
  const running = s.runs.find((r) => r.status === 'queued' || r.status === 'running');
  const balance = s.balanceCents;
  return (
    <>
      <Scoreboard f={agreedF} title={C.scoreboard.agreed} />
      <Panel title={C.run.criteria} sub={C.ui.teamShared} id="go-s12-run">
        <div className="chips">
          {SCREEN_AGENDAS.map((a) => (
            <span key={a} className={`chip ${s.agreed[a] === undefined ? 's12-warn' : ''}`}>{s.agreed[a] === undefined ? `! ${screenFill(C.ui.undecided, { label: C.agenda[a].label })}` : `✓ ${screenRuleText(a, s.agreed[a], gene)}`}</span>
          ))}
        </div>
        {s.allAgreed ? (
          <p className="s12-p">{screenFill(C.run.preview, { n: agreedF.final, total: ds.total })}</p>
        ) : (
          <p className="verdict warn"><b aria-hidden="true">!</b> {C.run.notAgreed} <button type="button" className="btn sm" onClick={() => c.setTab('meet')}>{C.run.backToMeeting}</button></p>
        )}
        {running && <p className="hint" role="status">▸ {screenFill(C.run.running, { name: running.byName })}</p>}
        <div className="acts">
          <button type="button" className="btn pri" disabled={!s.allAgreed || !!running || act.busy || c.step.state === 'locked'} onClick={() => setAsk(true)}>
            {s.runs.some((r) => r.status === 'succeeded') ? C.run.rerun : C.run.run} <span className="cost">{money(s.costs.runCents)}</span>
          </button>
        </div>
        <Confirm
          open={ask}
          title={C.run.confirmTitle}
          confirmLabel={C.run.confirmOk}
          busy={act.busy}
          blockedReason={balance < s.costs.runCents ? C.ui.noFunds : null}
          onCancel={() => setAsk(false)}
          onConfirm={() => void act.run(async () => {
            await api.post(API.jobs, { requestId: newRequestId(), step: '1.2', params: {} });
            setAsk(false);
            after();
          })}
        >
          <p>{screenFill(C.run.confirmBody, { cost: money(s.costs.runCents), left: money(balance - s.costs.runCents) })}</p>
          <p className="mini muted">{SCREEN_AGENDAS.map((a) => screenRuleText(a, s.agreed[a], gene)).join(' · ')}</p>
        </Confirm>
      </Panel>
      <Panel title={C.run.history} sub={screenFill(C.ui.runCount, { n: s.runs.length })}>
        {s.runs.length === 0 ? <p className="empty">{screenFill(C.run.historyEmpty, { total: ds.total })}</p> : (
          <div className="tbl-w">
            <table>
              <thead><tr><th>{C.ui.runCols.no}</th><th>{C.ui.runCols.criteria}</th><th>{C.ui.runCols.by}</th><th className="num">{C.ui.runCols.pass}</th></tr></thead>
              <tbody>
                {s.runs.map((r) => (
                  <tr key={r.jobId}>
                    <td>{screenFill(C.run.round, { n: r.no })}</td>
                    <td className="mini mono">{r.snapshot ? SCREEN_AGENDAS.map((a) => screenRuleText(a, r.snapshot!.criteria[a], gene)).join(' · ') : '—'}</td>
                    <td><MemberChip small name={r.byName} avatar={r.avatar} /> <span className="mini">{r.byName}</span></td>
                    <td className="num">{r.status === 'succeeded' ? (r.snapshot?.final ?? '—') : r.status === 'failed' ? '✕' : '▸'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mini muted">{C.run.snapshotNote}</p>
      </Panel>
      {board.workerMode === 'fixture' && <p className="mini muted">{C.ui.fixtureNote}</p>}
    </>
  );
}

function RunTeam({ c }: { c: Ctx }) {
  const { s, ds, gene, names, byId, agreedF } = c;
  const [viewId, setViewId] = useState<string | null>(null);
  const shown: ScreenRunView | null = s.runs.find((r) => r.jobId === viewId) ?? s.runs[0] ?? null;
  if (!shown) {
    return (
      <Panel title={C.run.resultTitle}>
        <p className="s12-p muted">{screenFill(C.run.historyEmpty, { total: ds.total })}</p>
        <FunnelBars f={agreedF} gene={gene} names={names} />
      </Panel>
    );
  }
  const picker = s.runs.length > 1 && (
    <div className="chips" role="group" aria-label={C.ui.pickRun}>
      {s.runs.map((r) => <button key={r.jobId} type="button" className="rchip" aria-pressed={r.jobId === shown.jobId} onClick={() => setViewId(r.jobId)}>{screenFill(C.run.round, { n: r.no })}</button>)}
    </div>
  );
  if (shown.status === 'queued' || shown.status === 'running') {
    const pct = Math.round(shown.progress * 100);
    return (
      <Panel title={C.run.resultTitle} sub={screenFill(C.run.round, { n: shown.no })}>
        {picker}
        <p className="hint" role="status">▸ {screenFill(C.run.running, { name: shown.byName })}</p>
        <p className="mini muted">{screenFill(C.run.progress, { total: ds.total, pct })}</p>
        <span className="progress" aria-label={screenFill(C.ui.progress, { pct })}><i style={{ width: `${pct}%` }} /></span>
      </Panel>
    );
  }
  if (shown.status === 'failed' || !shown.snapshot) {
    return (
      <Panel title={C.run.resultTitle} sub={screenFill(C.run.round, { n: shown.no })} tone="bad">
        {picker}
        <p className="verdict block"><b aria-hidden="true">✕</b> {C.run.failed} {shown.errorMessage ?? ''}</p>
      </Panel>
    );
  }
  const snap = shown.snapshot;
  const n = snap.final;
  const V = C.verdict[snap.verdict];
  const biggest = screenBiggestCut({ ...screenFunnel(ds, snap.criteria), steps: snap.steps });
  const dockTotal = n * s.costs.dockCents;
  const tone = snap.verdict === 'good' ? 'ok' : snap.verdict === 'many' ? 'warn' : 'block';
  return (
    <>
      <Panel title={C.run.resultTitle} sub={`${screenFill(C.run.round, { n: shown.no })} · ${shown.byName}${shown.test ? ` · ${C.ui.testRun}` : ''}`}>
        {picker}
        <FunnelBars f={snap} gene={gene} names={names} />
        <div className={`s12-verdict ${tone}`} role="status">
          <span className="big">{n}</span>
          <b>{tone === 'ok' ? '✓' : tone === 'warn' ? '!' : '✕'} {V.title}</b>
          <span>{screenFill(V.body, { n, total: snap.total })}</span>
        </div>
        <div className="s12-gauge" aria-hidden="true">
          <span className={snap.verdict === 'zero' || snap.verdict === 'few' ? 'on' : ''} style={{ flex: 8 }}>{C.run.gauge.few}</span>
          <span className={snap.verdict === 'good' ? 'on' : ''} style={{ flex: 32 }}>{C.run.gauge.good}</span>
          <span className={snap.verdict === 'many' ? 'on' : ''} style={{ flex: 30 }}>{C.run.gauge.many}</span>
        </div>
        {biggest && <p className="s12-p">{screenFill(C.run.biggest, { label: C.agenda[biggest.agenda].label, n: biggest.removed })}</p>}
        <p className="s12-p">{screenFill(C.run.dockCost, { n, unit: money(s.costs.dockCents), total: money(dockTotal), pct: s.balanceCents > 0 ? Math.round((dockTotal / s.balanceCents) * 100) : 0 })}</p>
        {snap.missed.length > 0 && (
          <details className="s12-expl" open>
            <summary>{C.run.missedTitle}</summary>
            <ul className="s12-missed">
              {snap.missed.map((m) => {
                const cpd = byId.get(m.id);
                return (
                  <li key={m.id}>
                    <span><b>{shortName(cpd?.name ?? m.id, 20)}</b> <span className="mono mini">{screenFill(C.ui.scoreOf, { v: cpd?.score.toFixed(3) ?? '—' })}</span></span>
                    <span className="chip s12-bad">✕ {screenFill(C.run.missedAt, { label: C.agenda[m.failedAt].label, value: cpd ? screenValueText(m.failedAt, cpd) : '' })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mini muted">{C.run.missedNote}</p>
          </details>
        )}
        <div className="acts">
          <button type="button" className="btn" onClick={() => c.setTab('meet')}>{C.run.remeet}</button>
          <button type="button" className="btn pri" disabled={!n || s.shelf?.jobId !== shown.jobId} onClick={() => c.setTab('shop')}>{screenFill(C.run.toShop, { n })}</button>
        </div>
      </Panel>
      <Scoreboard f={{ ...screenFunnel(ds, snap.criteria) }} title={C.scoreboard.run} />
    </>
  );
}

// ── ④ 분자 쇼핑 ──

type Filter = 'free' | 'bbb' | 'qed' | 'approved' | 'new';
interface ShopState {
  q: string;
  sort: 'score' | 'qed' | 'tpsa' | 'mw';
  f: Filter[];
  view: 'cards' | 'table';
  page: number;
}

function ShopMine({ c }: { c: Ctx }) {
  const { s, ds, gene, byId, mission, act, after } = c;
  const [st, setSt] = useBenchState<ShopState>('s12:shop', { q: '', sort: 'score', f: [], view: 'cards', page: 0 });
  const [claimFor, setClaimFor] = useState<string | null>(null);
  const [why, setWhy] = useState<ClaimReason | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  if (!s.shelf) {
    return (
      <Panel title={C.shop.emptyTitle}>
        <p className="s12-p">{C.shop.emptyBody}</p>
        <button type="button" className="btn pri" onClick={() => c.setTab('run')}>{C.steps.run}</button>
      </Panel>
    );
  }
  const shelf = s.shelf;
  const shelfRun = s.runs.find((r) => r.jobId === shelf.jobId);
  const rankOf = (id: string) => shelf.passIds.indexOf(id) + 1;
  const claimOf = (id: string) => s.claims.find((x) => x.compoundId === id) ?? null;
  const mine = s.claims.filter((x) => x.userId === s.me);
  const full = mine.length >= CLAIMS_PER_PERSON;
  const FILTERS: Record<Filter, { label: string; fn: (x: ScreenCompound) => boolean }> = {
    free: { label: C.shop.filterFree, fn: (x) => !claimOf(x.id) },
    bbb: { label: C.shop.filterBbb, fn: (x) => x.tpsa <= SHOP_FILTER_LIMITS.bbbTpsa },
    qed: { label: C.shop.filterQed, fn: (x) => x.qed >= SHOP_FILTER_LIMITS.qedHigh },
    approved: { label: C.shop.filterApproved, fn: (x) => x.library === APPROVED_LIBRARY },
    new: { label: C.shop.filterNew, fn: (x) => x.library !== APPROVED_LIBRARY },
  };
  let list = shelf.passIds.map((id) => byId.get(id)).filter((x): x is ScreenCompound => !!x);
  const q = st.q.trim().toLowerCase();
  if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
  for (const k of st.f) list = list.filter(FILTERS[k].fn);
  const sorts = { score: (a: ScreenCompound, b: ScreenCompound) => rankOf(a.id) - rankOf(b.id), qed: (a: ScreenCompound, b: ScreenCompound) => b.qed - a.qed, tpsa: (a: ScreenCompound, b: ScreenCompound) => a.tpsa - b.tpsa, mw: (a: ScreenCompound, b: ScreenCompound) => a.mw - b.mw };
  list = list.slice().sort(sorts[st.sort]);
  const pages = Math.max(1, Math.ceil(list.length / SHELF_PAGE));
  const page = Math.min(st.page, pages - 1);
  const view = list.slice(page * SHELF_PAGE, page * SHELF_PAGE + SHELF_PAGE);
  const shelfF = shelfRun?.snapshot ? screenFunnel(ds, shelfRun.snapshot.criteria) : null;

  const actFor = (x: ScreenCompound) => {
    const cl = claimOf(x.id);
    if (cl) {
      return cl.userId === s.me ? (
        <button type="button" className="btn sm film" disabled={act.busy} onClick={() => void act.run(async () => { await api.del(API.claim(x.id)); after(); })}>{C.shop.mine}</button>
      ) : <span className="mini"><MemberChip small name={cl.byName} avatar={cl.avatar} /> {screenFill(C.shop.theirs, { name: cl.byName })}</span>;
    }
    return (
      <button type="button" className="btn sm pri" disabled={full} onClick={() => { setClaimFor(x.id); setWhy(null); }}>
        {full ? screenFill(C.shop.full, { n: CLAIMS_PER_PERSON }) : C.shop.claim}
      </button>
    );
  };
  const claimCpd = claimFor ? byId.get(claimFor) ?? null : null;
  const othersLibs = s.claims.filter((x) => x.userId !== s.me).map((x) => byId.get(x.compoundId)?.library ?? '').filter(Boolean);
  const verdict = claimCpd && why ? coachVerdict(claimCoach(why, { compound: claimCpd, rank: rankOf(claimCpd.id), mission, othersLibraries: othersLibs }), C.claimCoach.ok, false) : null;
  const det = detail ? byId.get(detail) ?? null : null;

  return (
    <>
      {shelfF && <Scoreboard f={shelfF} title={C.scoreboard.run} />}
      <Panel title={C.shop.shelf} sub={screenFill(C.shop.shelfSub, { n: shelf.passIds.length, round: shelf.no, page: SHELF_PAGE })}>
        <div className="s12-shoptools">
          <input type="search" className="txt" placeholder={C.shop.search} aria-label={C.shop.search} value={st.q} onChange={(e) => setSt((x) => ({ ...x, q: e.target.value, page: 0 }))} />
          <select className="txt s12-sel" aria-label={C.ui.sort} value={st.sort} onChange={(e) => setSt((x) => ({ ...x, sort: e.target.value as ShopState['sort'] }))}>
            <option value="score">{screenFill(C.shop.sortScore, { gene })}</option>
            <option value="qed">{C.shop.sortQed}</option>
            <option value="tpsa">{C.shop.sortTpsa}</option>
            <option value="mw">{C.shop.sortMw}</option>
          </select>
        </div>
        <div className="chips" role="group" aria-label={C.ui.filter}>
          {(Object.keys(FILTERS) as Filter[]).map((k) => (
            <button key={k} type="button" className="rchip" aria-pressed={st.f.includes(k)} onClick={() => setSt((x) => ({ ...x, page: 0, f: x.f.includes(k) ? x.f.filter((y) => y !== k) : [...x.f, k] }))}>{FILTERS[k].label}</button>
          ))}
          <span className="mini muted">{screenFill(C.shop.count, { n: list.length })}</span>
        </div>
        <div className="chips" role="group" aria-label={C.ui.view}>
          <button type="button" className="rchip" aria-pressed={st.view === 'cards'} onClick={() => setSt((x) => ({ ...x, view: 'cards' }))}>{C.shop.viewCards}</button>
          <button type="button" className="rchip" aria-pressed={st.view === 'table'} onClick={() => setSt((x) => ({ ...x, view: 'table' }))}>{C.shop.viewTable}</button>
        </div>
        {claimCpd && (
          <div className="s12-claimbox" id="claimbox">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{screenFill(C.shop.claimTitle, { name: shortName(claimCpd.name, 22) })}</b>
              <span className="mono mini">{screenFill(C.shop.rank, { n: rankOf(claimCpd.id) })} · {screenFill(C.ui.scoreOf, { v: claimCpd.score.toFixed(3) })}</span>
            </div>
            {mission && claimCpd.id === mission.controlId && <p className="verdict warn"><b aria-hidden="true">!</b> {screenFill(C.claimCoach.control, { gene })}</p>}
            <ReasonChips
              legend={C.shop.claimWhy}
              chips={CLAIM_REASONS.map((k) => ({ id: k, label: C.claimReasons[k] }))}
              value={why}
              onChange={(n) => setWhy(isClaimReason(n) ? n : null)}
              verdict={verdict}
              confirm={{
                label: C.shop.claimOk,
                busy: act.busy,
                disabled: full,
                onClick: () => void act.run(async () => {
                  await api.post(API.claims, { compoundId: claimCpd.id, reason: why, screenJobId: shelf.jobId });
                  setClaimFor(null);
                  after(C.shop.claimed);
                }),
              }}
            />
            <button type="button" className="btn sm" onClick={() => setClaimFor(null)}>{C.shop.cancel}</button>
          </div>
        )}
        {st.view === 'table' && view.length > 0 && <p className="mini muted">{C.shop.tableIntro}</p>}
        {view.length === 0 ? <p className="empty">{C.shop.none}</p> : st.view === 'table' ? (
          <ShelfTable rows={list} gene={gene} rankOf={rankOf} renderAct={actFor} />
        ) : (
          <div className="s12-shelf">
            {view.map((x) => {
              const cl = claimOf(x.id);
              const top = byId.get(shelf.passIds[0]!)?.score || 1;
              return (
                <article key={x.id} className={`s12-pc${cl?.userId === s.me ? ' mine' : ''}`}>
                  <header><span className="s12-rk">{screenFill(C.shop.rank, { n: rankOf(x.id) })}</span>{x.known && <span className="mini" title={C.scoreboard.knownWhat}>★</span>}{cl && <MemberChip small name={cl.byName} avatar={cl.avatar} />}</header>
                  <SmilesBox smiles={x.smiles} />
                  <b className="s12-pn" title={x.name}>{shortName(x.name, 22)}</b>
                  <span className="mini muted">{x.library} · {x.id}</span>
                  <div className="s12-sc"><span className="mini">{gene}</span><span className="bar" aria-hidden="true"><i style={{ width: `${(x.score / top) * 100}%` }} /></span><b className="mono mini">{x.score.toFixed(3)}</b></div>
                  <div className="chips">
                    <span className="chip">MW {Math.round(x.mw)}</span>
                    <span className={`chip${x.tpsa <= SHOP_FILTER_LIMITS.bbbTpsa ? ' s12-ok' : ''}`}>TPSA {Math.round(x.tpsa)}</span>
                    <span className="chip">logP {x.clogp.toFixed(1)}</span>
                    <span className={`chip${x.qed >= SHOP_FILTER_LIMITS.qedHigh ? ' s12-ok' : ''}`}>QED {x.qed.toFixed(2)}</span>
                  </div>
                  <div className="acts">
                    <button type="button" className="btn sm" onClick={() => setDetail(x.id)}>{C.shop.detail}</button>
                    {actFor(x)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {st.view === 'cards' && pages > 1 && (
          <div className="acts s12-pager">
            <button type="button" className="btn sm" disabled={page === 0} onClick={() => setSt((x) => ({ ...x, page: page - 1 }))} aria-label={C.ui.prevPage}>←</button>
            <span className="mono mini">{page + 1} / {pages}</span>
            <button type="button" className="btn sm" disabled={page >= pages - 1} onClick={() => setSt((x) => ({ ...x, page: page + 1 }))} aria-label={C.ui.nextPage}>→</button>
          </div>
        )}
      </Panel>
      <Drawer open={!!det} title={det?.name ?? ''} onClose={() => setDetail(null)}>
        {det && <CompoundDetail c={c} x={det} rank={rankOf(det.id)} onClaim={claimOf(det.id) || full ? null : () => { setDetail(null); setClaimFor(det.id); setWhy(null); }} />}
      </Drawer>
    </>
  );
}

function CompoundDetail({ c, x, rank, onClaim }: { c: Ctx; x: ScreenCompound; rank: number; onClaim: (() => void) | null }) {
  const { mission, s } = c;
  const adv = mission ? adviceCriteria(mission) : null;
  const rows: Array<[string, string, boolean | null]> = [
    [C.ind.mw.name, x.mw.toFixed(1), adv ? x.mw <= adv.mw : null],
    [C.ind.tpsa.name, x.tpsa.toFixed(1), adv ? x.tpsa <= adv.tpsa : null],
    [C.ind.clogp.name, x.clogp.toFixed(2), x.clogp <= 5],
    [C.ind.ro5.name, screenFill(C.ui.histN, { n: x.ro5 }), adv ? x.ro5 <= adv.ro5 : null],
    [C.ind.alert.name, screenValueText('alert', x), x.alerts.length === 0],
    [C.ind.qed.name, x.qed.toFixed(2), adv ? x.qed >= adv.qed : null],
    [C.ind.score.name, x.score.toFixed(3), null],
  ];
  const cl = s.claims.find((y) => y.compoundId === x.id);
  return (
    <div className="s12">
      <p className="mono mini muted">{x.id} · {x.library}{rank ? screenFill(C.ui.detailRank, { n: rank }) : ''}{x.known ? C.ui.detailKnown : ''}</p>
      <SmilesBox smiles={x.smiles} />
      {x.mechanism && <p className="mini muted">{x.mechanism}</p>}
      <div className="tbl-w">
        <table>
          <thead><tr><th>{C.ui.detailCols.k}</th><th className="num">{C.ui.detailCols.v}</th><th>{C.shop.adviceCol}</th></tr></thead>
          <tbody>
            {rows.map(([k, v, ok]) => (
              <tr key={k}><td>{k}</td><td className="num">{v}</td><td>{ok === null ? <span className="chip">{C.shop.adviceDock}</span> : ok ? <span className="chip s12-ok">✓ {C.shop.adviceOk}</span> : <span className="chip s12-warn">! {C.shop.adviceOff}</span>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {cl ? <p className="hint">{screenFill(C.shop.theirs, { name: cl.byName })}</p> : onClaim && <div className="acts"><button type="button" className="btn pri" onClick={onClaim}>{C.shop.claim}</button></div>}
    </div>
  );
}

function Cart({ c }: { c: Ctx }) {
  const { s, byId, control, act, after } = c;
  const n = s.claims.length;
  const people = new Set(s.claims.map((x) => x.userId)).size;
  return (
    <Panel title={C.shop.cart} sub={screenFill(C.shop.cartSub, { n: CLAIMS_PER_PERSON })}>
      <div className="s12-lanes">
        {s.members.map((m) => {
          const cs = s.claims.filter((x) => x.userId === m.userId);
          return (
            <section key={m.userId} className={`s12-lane${m.userId === s.me ? ' me' : ''}`} aria-label={m.displayName}>
              <header><MemberChip name={m.displayName} avatar={m.avatar} me={m.userId === s.me} /><span className="mono mini">{cs.length}/{CLAIMS_PER_PERSON}</span></header>
              {cs.length ? cs.map((x) => (
                <div key={x.compoundId} className="s12-citem">
                  <b>{shortName(x.name, 22)}</b>
                  {m.userId === s.me && <button type="button" className="btn sm ghost" aria-label={`${x.name} ${C.shop.release}`} disabled={act.busy} onClick={() => void act.run(async () => { await api.del(API.claim(x.compoundId)); after(); })}>✕</button>}
                  <span className="mini muted">{x.reason === LEGACY_REASON ? C.shop.legacy : (C.claimReasons as Record<string, string>)[x.reason] ?? x.reason} · {screenFill(C.ui.scoreOf, { v: byId.get(x.compoundId)?.score.toFixed(3) ?? '—' })}</span>
                </div>
              )) : <span className="mini muted">{m.userId === s.me ? C.shop.laneEmptyMe : C.shop.laneEmpty}</span>}
            </section>
          );
        })}
      </div>
      <dl className="s12-conseq">
        <div><dt>{C.shop.sumClaims}</dt><dd>{n}<small>{C.ui.unitCount}</small></dd></div>
        <div><dt>{C.shop.sumMembers}</dt><dd>{people}<small>/{s.members.length}</small></dd></div>
        <div><dt>{C.shop.sumDock}</dt><dd style={{ fontSize: 13 }}>{money(dockQueue(s, control) * s.costs.dockCents)}</dd></div>
      </dl>
      {control && <p className="mini muted">{screenFill(C.shop.controlNote, { name: shortName(control.name, 10) })}</p>}
    </Panel>
  );
}

// ── 1.2 스크리닝 확정서(공유 자료 맨 위 — 합의안 15) ──

/** 2.1 로 들고 갈 것 — 위 다섯 줄은 늘 보이고, 안건별 기준 · 도킹 대기열 · 쓴 연구비는 '자세히'에 접는다. */
function Receipt({ c }: { c: Ctx }) {
  const { s, gene, mission, control } = c;
  const H = C.hand;
  const shelfRun = s.shelf ? s.runs.find((r) => r.jobId === s.shelf!.jobId) : null;
  const snap = shelfRun?.snapshot ?? null;
  const running = s.runs.find((r) => r.status === 'queued' || r.status === 'running');
  const runsDone = s.runs.filter((r) => r.status === 'succeeded').length;
  const agreed = SCREEN_AGENDAS.filter((a) => s.agreed[a] !== undefined).length;
  const spent = s.runs.reduce((a, r) => a + r.costCents - r.refundedCents, 0);
  const queue = dockQueue(s, control);
  const missing = s.members.filter((m) => !s.claims.some((x) => x.userId === m.userId));
  const screen = running ? screenFill(H.screenRunning, { p: Math.round(running.progress * 100) }) : snap ? screenFill(H.runsValue, { n: runsDone, total: snap.total, final: snap.final }) : H.screenNone;
  return (
    <section className="s12-recv" aria-label={H.receipt}>
      <h3>{H.receipt}</h3>
      <div className="rl"><span>{H.target}</span><span>{gene} · {mission?.disease ?? ''}</span></div>
      <div className="rl"><span>{H.agreed}</span><span>{screenFill(H.agreedValue, { n: agreed })}</span></div>
      <div className="rl"><span>{H.screen}</span><span>{screen}</span></div>
      <div className="rl"><span>{H.carry}</span><span>{s.claims.length ? screenFill(H.carryValue, { n: s.claims.length }) : H.carryNone}</span></div>
      <div className="rl"><span>{H.dockCost}</span><span>{s.claims.length ? `${queue} × ${money(s.costs.dockCents)} = ${money(queue * s.costs.dockCents)}` : '—'}</span></div>
      {snap && (
        <details className="s12-recv-more">
          <summary>{H.detail}</summary>
          {SCREEN_AGENDAS.map((a) => {
            const g = s.agendas.find((x) => x.agenda === a)!;
            const same = g.status === 'agreed' && g.value === snap.criteria[a];
            return (
              <div key={a} className="rl">
                <span>{C.agenda[a].label}</span>
                <span>{screenRuleText(a, snap.criteria[a], gene)}{same && g.proposedByName ? ` · ${screenFill(H.proposer, { name: g.proposedByName, n: g.votes ?? 0 })}` : ''}</span>
              </div>
            );
          })}
          <div className="rl"><span>{H.spent}</span><span>{money(spent)}</span></div>
          <b className="rl-h">{H.queue}</b>
          {s.claims.map((x) => (
            <div key={x.compoundId} className="rl"><span>{shortName(x.name, 22)}</span><span>{x.byName} · {(C.claimReasons as Record<string, string>)[x.reason] ?? C.shop.legacy}</span></div>
          ))}
          {control && !s.claims.some((x) => x.compoundId === control.id) && <div className="rl"><span>{shortName(control.name, 22)}</span><span>{H.control}</span></div>}
          {s.claims.length > 0 && missing.length > 0 && <p className="verdict warn"><b aria-hidden="true">!</b> {screenFill(H.missing, { names: missing.map((m) => m.displayName).join(', ') })}</p>}
        </details>
      )}
    </section>
  );
}
