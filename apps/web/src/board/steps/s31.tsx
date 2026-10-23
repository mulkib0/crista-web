/**
 * 3.1 물질특허 — 기능 F31(설계 §5.8 · §5.8.1 · §5.11 · 시안 design/step-viz/viz-5.js 5.01 · 5.02 · 5.04 · 5.06).
 *
 * 걸음 ① 출원할 후보(2.2 특허 후보 · 구조 지문 5.06 · 모둠 출원 칸 n / 상한) ② 코드명 해부도(5.02 — 빈칸 · 즉시 검사 · 기전 한 줄)
 * ③ 출원서(5.01 — 칸마다 쓰기 · 서버가 채운 근거) ④ 심사(제출 전 규칙 점검 · 심사 요청 · 규칙 + AI 결과) ⑤ 학급 특허 원장(5.04 — 우리 줄 강조 · 빨간 줄).
 * 왼쪽 섬 = 내 작업대(지금 고른 출원서 · 탭 — 개인), 오른쪽 섬 = 모둠 공유(서버 저장 · 실시간 — `useLive('/api/patents')`).
 * 학생에게 보이는 문구는 web-contract `PATENT_COPY` 한곳(§5.12).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  checkCodeName,
  codeProblemText,
  fillPatentCopy,
  MECH_ACTIONS,
  MECH_HOW,
  parseList,
  PATENT_API,
  PATENT_COPY as C,
  PATENT_SECTIONS,
  SELECTION_COPY,
  smilesDiff,
  type DocReviewView,
  type PatentApplicationView,
  type PatentLedgerRow,
  type PatentPrecheckResponse,
  type PatentSectionKey,
  type PatentsResponse,
  type RuleFinding,
  type SectionSaveResponse,
  DOC_REVIEW_COPY,
} from '@crista-web/web-contract';
import { api, ApiFailure, message } from '../../api.ts';
import { ink, money } from '../../ink.ts';
import { By } from '../parts.tsx';
import { Confirm, DocSectionEditor, Panel, useBenchState, useLive, useLocalTab, type DocSectionStale } from '../ui/index.ts';
import { currentTarget, Next, NotesBlock, StepLayout, useAction, type StepProps } from './common.tsx';
import './s31.css';

const TABS = ['pick', 'code', 'doc', 'review', 'ledger'] as const;
type Tab = (typeof TABS)[number];
const NO: Record<Tab, string> = { pick: '①', code: '②', doc: '③', review: '④', ledger: '⑤' };
const DOC_KEYS: PatentSectionKey[] = ['title', 'field', 'background', 'claim1', 'claim2', 'effect', 'summary'];
const LIVE_STATUSES = ['draft', 'reviewing', 'revise', 'accepted'];

/** 칸 안내 · 예시의 `{gene}` · `{disease}` 같은 자리표시자를 이 출원서의 근거로 채운다(값이 없으면 '없음'). */
const kcalText = (v: number | null) => (v === null ? null : v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2));
function fillerOf(app: PatentApplicationView) {
  const f = app.facts;
  const none = C.ui.noValue;
  const values = {
    ticker: f.ticker,
    company: f.companyName,
    gene: f.gene ?? none,
    disease: f.disease ?? none,
    ref: f.referenceName ?? none,
    refDG: kcalText(f.referenceKcal) ?? none,
    dG: kcalText(f.dockingKcal) ?? none,
    parentDG: kcalText(f.parentKcal) ?? none,
  };
  return (text: string) => fillPatentCopy(text, values);
}

/** 고르는 칸의 예시는 흐린 글 자리가 없어 안내 아래에 보인다 — 앞에 '예:'가 없으면 붙인다. */
const exampleText = (t: string) => (t.startsWith('예') ? t : `예: ${t}`);

const staleOf = (e: ApiFailure): DocSectionStale | null => {
  const s = e.detail?.section;
  return s ? { body: s.body, byName: s.byName, version: s.version } : { body: '', byName: null, version: 0 };
};

export function Step31(props: StepProps) {
  const { board, step, goStep } = props;
  const [tab, setTab] = useLocalTab<Tab>('step:3.1', TABS, 'pick');
  const [appId, setAppId] = useBenchState<string | null>('s31:app', null);
  const live = useLive<PatentsResponse>(PATENT_API.patents, (m) =>
    (m.type === 'doc.reviewed' && m.kind === 'patent') || m.type === 'patent.ledger' || m.type === 'board.changed',
  );
  const data = live.data;
  const app = useMemo(() => {
    if (!data) return null;
    return data.applications.find((a) => a.id === appId) ?? data.applications.find((a) => a.current && LIVE_STATUSES.includes(a.status)) ?? null;
  }, [data, appId]);

  // 받아들여지는 순간 5.04 원장을 띄운다(§5.8 ⑤).
  const prev = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    for (const a of data.applications) {
      const before = prev.current[a.id];
      if (before && before !== 'accepted' && a.status === 'accepted' && a.id === app?.id) setTab('ledger');
      prev.current[a.id] = a.status;
    }
  }, [data, app?.id, setTab]);

  const tabs = TABS.map((id) => ({
    id,
    no: NO[id],
    label: C.tabs[id],
    ...(id === 'code' && app?.codeName ? { sub: app.codeName } : {}),
    ...(id === 'review' && app ? { sub: C.status[app.status], mark: app.status === 'accepted' ? '✓' : app.status === 'rejected' ? '✕' : undefined } : {}),
    ...(id !== 'pick' && id !== 'ledger' && !app ? { disabled: true, sub: C.ui.pickFirst } : {}),
  }));

  const reloadSoon = () => live.reload();

  if (!data) {
    return (
      <StepLayout {...props} tabs={tabs} tab={tab} onTab={(id) => setTab(id as Tab)}
        team={<p className={live.error ? 'err' : 'empty'}>{live.error ? message(live.error) : C.ui.loading}</p>} />
    );
  }

  const ownRows = data.ledger;
  let mine: ReactNode;
  let team: ReactNode;
  if (tab === 'pick') {
    mine = <PickBench data={data} refSmiles={currentTarget(board)?.referenceLigand.smiles ?? null} refName={currentTarget(board)?.referenceLigand.name ?? null}
      onOpen={(id) => { setAppId(id); setTab('code'); }} reload={reloadSoon} />;
    team = <SlotsPanel data={data} selected={app?.id ?? null} onOpen={(id) => { setAppId(id); setTab('doc'); }} />;
  } else if (tab === 'code' && app) {
    mine = <CodeBench data={data} app={app} myName={board.account.displayName} reload={reloadSoon} />;
    team = <CodeSummary data={data} app={app} />;
  } else if (tab === 'doc' && app) {
    mine = <DocBench app={app} members={board.members} myName={board.account.displayName} reload={reloadSoon} />;
    team = <FactsPanel data={data} app={app} refSmiles={currentTarget(board)?.referenceLigand.smiles ?? null} />;
  } else if (tab === 'review' && app) {
    mine = <ReviewBench data={data} app={app} reload={reloadSoon} />;
    team = <ReviewResult data={data} app={app} onLedger={() => setTab('ledger')} />;
  } else {
    team = <LedgerPanel rows={ownRows} />;
  }

  return (
    <StepLayout
      {...props}
      tabs={tabs}
      tab={tab}
      onTab={(id) => setTab(id as Tab)}
      ratio="even"
      mine={mine ? <div className="s31">{mine}</div> : undefined}
      team={
        <>
          <div className="s31">{team}</div>
          <NotesBlock board={board} stepId="3.1" />
          <Next step={step} goStep={goStep} label="3.2" />
        </>
      }
    />
  );
}

// ── ① 출원할 후보 ──

function PickBench({ data, refSmiles, refName, onOpen, reload }: { data: PatentsResponse; refSmiles: string | null; refName: string | null; onOpen: (id: string) => void; reload: () => void }) {
  const act = useAction();
  if (data.candidates.length === 0) return <Panel title={C.tabs.pick}><p className="empty">{C.noCandidates}</p></Panel>;
  return (
    <>
      {act.error && <p className="err">{act.error}</p>}
      {data.candidates.map((c) => (
        <Panel key={c.admetJobId} title={c.label ?? c.admetJobId.slice(0, 8)} sub={c.dockingKcal !== null ? `ΔG ${c.dockingKcal.toFixed(2)}` : undefined} tone={c.known ? 'bad' : undefined}>
          <div className="s31-cand">
            <p className="mini">{C.ui.pickReason} <b>{(SELECTION_COPY.leadReasonLabel as Record<string, string>)[c.reason] ?? c.reason}</b> · <By name={c.pickedByName} avatar={c.avatar} /></p>
            {c.known && <p className="hint bad">✕ {C.knownChip} · {SELECTION_COPY.known.chip}</p>}
            {c.smiles && refSmiles && <Fingerprint refSmiles={refSmiles} refName={refName} ours={c.smiles} oursName={c.label ?? C.ui.candidate} />}
            <div className="acts">
              {c.applicationId ? (
                <button type="button" className="btn sm" onClick={() => onOpen(c.applicationId!)}>{C.openApp}</button>
              ) : (
                <button type="button" className="btn sm pri" disabled={act.busy || c.known} onClick={() => void act.run(async () => {
                  const r = await api.post<{ application: PatentApplicationView }>(PATENT_API.applications, { admetJobId: c.admetJobId });
                  reload();
                  onOpen(r.application.id);
                })}>{C.newApp}</button>
              )}
            </div>
          </div>
        </Panel>
      ))}
    </>
  );
}

/** 5.06 구조 지문 — SMILES 글자를 막대로, 기준 약과 다른 구간만 형광 + ▲ 표시(색 외 기호). */
function Fingerprint({ refSmiles, refName, ours, oursName }: { refSmiles: string; refName: string | null; ours: string; oursName: string }) {
  const d = smilesDiff(refSmiles, ours);
  const same = refSmiles === ours;
  const rows: Array<{ name: string; s: string; hit: [number, number] | null }> = [
    { name: C.ui.refRow(refName), s: refSmiles, hit: null },
    { name: oursName, s: ours, hit: same ? null : [d.start, Math.max(d.end, d.start + 1)] },
  ];
  const n = Math.max(refSmiles.length, ours.length);
  const bw = 12;
  const W = Math.max(240, n * bw + 8);
  const rowH = 58;
  const kind = (ch: string) => (/[Nn]/.test(ch) ? 'n' : /[Oo]/.test(ch) ? 'o' : /[FIl]|Br|B/.test(ch) ? 'x' : /[Cc]/.test(ch) ? 'c' : 'p');
  return (
    <figure className="s31-fp">
      <figcaption className="lab">{C.fingerprintTitle}</figcaption>
      <svg viewBox={`0 0 ${W} ${rows.length * rowH + 4}`} role="img" aria-label={same ? C.sameAsRef(refName ?? C.facts.reference) : C.ui.fingerprintAria(oursName, Math.max(1, d.end - d.start))}>
        {rows.map((r, ri) => {
          const y = ri * rowH + 4;
          return (
            <g key={ri}>
              <text x={4} y={y + 10} className="fp-name">{r.name}</text>
              {[...r.s].map((ch, k) => {
                const x = 4 + k * bw;
                const hit = r.hit && k >= r.hit[0] && k < r.hit[1];
                const tall = /[A-Za-z]/.test(ch);
                return (
                  <g key={k}>
                    {hit && <rect x={x - 1} y={y + 14} width={bw} height={40} className="fp-hit" />}
                    <rect x={x + 1.5} y={y + (tall ? 18 : 28)} width={bw - 4} height={tall ? 22 : 12} className={`fp-b fp-${kind(ch)}`} />
                    <text x={x + bw / 2 - 0.5} y={y + 51} textAnchor="middle" className="fp-ch">{ch}</text>
                    {hit && k === r.hit![0] && <text x={x + bw / 2} y={y + 13} textAnchor="middle" className="fp-mk">▼</text>}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <p className="hint">{same ? C.sameAsRef(refName ?? C.facts.reference) : C.fingerprintNote(refName ?? C.facts.reference)} <span className="s31-leg">{C.ui.legend.c} · <i className="k-n">{C.ui.legend.n}</i> · <i className="k-o">{C.ui.legend.o}</i> · <i className="k-x">{C.ui.legend.x}</i> · {C.ui.legend.hit}</span></p>
    </figure>
  );
}

function SlotsPanel({ data, selected, onOpen }: { data: PatentsResponse; selected: string | null; onOpen: (id: string) => void }) {
  const slots = Array.from({ length: data.maxPatentsPerTeam }, (_, i) => i < data.used);
  return (
    <>
      <Panel title={C.slots(data.used, data.maxPatentsPerTeam)} sub={C.ui.feeBalance(money(data.feeCents), money(data.balanceCents))}>
        <ol className="s31-slots" aria-label={C.slots(data.used, data.maxPatentsPerTeam)}>
          {slots.map((on, i) => <li key={i} className={on ? 'on' : ''}>{on ? '■' : '□'}<span className="sr">{on ? C.ui.slotUsed : C.ui.slotEmpty}</span></li>)}
        </ol>
      </Panel>
      <Panel title={C.ui.ourApps} sub={C.ui.count(data.applications.length)}>
        {data.applications.length === 0 ? <p className="empty">{C.ui.none}</p> : (
          <ul className="s31-apps">
            {data.applications.map((a) => (
              <li key={a.id} className={a.id === selected ? 'on' : ''}>
                <b className="mono">{a.codeName ?? '—'}</b>
                <span className={`sig ${a.status === 'accepted' ? 'g' : a.status === 'rejected' ? 'b' : a.status === 'reviewing' ? 'w' : ''}`}>{a.rejectReason ? C.rejectReason[a.rejectReason] : a.status === 'rejected' ? C.rejectedByTeacher : C.status[a.status]}</span>
                <span className="mini">{a.facts.label ?? ''}{a.current ? '' : ` · ${C.ui.oldTarget}`}</span>
                <button type="button" className="btn sm" onClick={() => onOpen(a.id)}>{C.openApp}</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// ── ② 코드명 해부도 ──

function useSectionSaver(appId: string, reload: () => void) {
  return (key: PatentSectionKey) => async (body: string, expectedVersion: number) => {
    const r = await api.put<SectionSaveResponse>(PATENT_API.section(appId, key), { body, expectedVersion });
    reload();
    return { version: r.version };
  };
}

const sectionValue = (app: PatentApplicationView, key: PatentSectionKey) => {
  const s = app.sections.find((x) => x.section === key);
  return s ? { body: s.body, version: s.version, byName: s.byName, avatar: s.avatar } : null;
};

function CodeBench({ data, app, myName, reload }: { data: PatentsResponse; app: PatentApplicationView; myName: string; reload: () => void }) {
  const save = useSectionSaver(app.id, reload);
  const editable = app.status === 'draft' || app.status === 'revise';
  const [num, setNum] = useState(() => app.codeName?.split('-')[1] ?? '');
  useEffect(() => setNum(app.codeName?.split('-')[1] ?? ''), [app.codeName]);
  const act = useAction();
  const taken = data.takenCodes.filter((t) => t.applicationId !== app.id).map((t) => t.codeName);
  const code = `${data.ticker}-${num}`;
  const check = checkCodeName(num ? code : '', { ticker: data.ticker, taken });
  const dirty = (app.codeName ?? '') !== (num ? code : '');
  const fill = fillerOf(app);
  return (
    <>
      <Panel title={C.tabs.code}>
        <CodeAnatomy ticker={data.ticker} num={num} problems={num ? check.problems : []} />
        <ul className="s31-pieces mini">
          <li>{C.pieceDesc.tick(data.ticker)}</li>
          <li>{C.pieceDesc.dash}</li>
          <li>{C.pieceDesc.num}</li>
        </ul>
        <div className="s31-code">
          <label className="lab" htmlFor="s31-num">{C.pieces.num}</label>
          <div className="row">
            <span className="mono s31-tick" aria-label={`${C.pieces.tick} ${data.ticker}`}>{data.ticker} -</span>
            <input id="s31-num" className="txt mono" inputMode="numeric" maxLength={4} value={num} readOnly={!editable} aria-invalid={!!num && !check.ok}
              aria-describedby="s31-num-r" onChange={(e) => setNum(e.target.value.trim())} />
            <button type="button" className="btn sm pri" disabled={!editable || !dirty || (!!num && !check.ok) || act.busy}
              onClick={() => void act.run(async () => {
                await api.put(PATENT_API.code(app.id), { codeName: num ? code : null, expectedCode: app.codeName });
                reload();
              })}>{C.ui.saveCode}</button>
          </div>
          <p id="s31-num-r" className={`hint${!editable ? '' : num && !check.ok ? ' bad' : num ? ' good' : ''}`} aria-live="polite">
            {!editable ? (app.status === 'reviewing' ? C.codeLockedReviewing(app.codeName ?? code) : C.codeLocked(app.codeName ?? code)) : !num ? codeProblemText('empty', { ticker: data.ticker }) : check.ok ? `✓ ${C.codeOk(code)}` : `✕ ${check.problems.map((p) => codeProblemText(p, { ticker: data.ticker, code })).join(' · ')}`}
          </p>
          <p className="hint">{C.formatLine}</p>
          {act.error && <p className="hint bad">{act.error}</p>}
        </div>
      </Panel>
      <Panel title={C.ui.piecesMeaning}>
        <DocSectionEditor id="s31-tick" label={C.sectionLabel.code_tick} guide={fill(C.sectionGuide.code_tick)} placeholder={fill(C.sectionExample.code_tick)} value={sectionValue(app, 'code_tick')} save={save('code_tick')}
          staleOf={staleOf} myName={myName} maxLength={PATENT_SECTIONS.code_tick.max} rows={2} readOnly={!isEditable(app)} />
        <DocSectionEditor id="s31-numr" label={C.sectionLabel.code_num} guide={fill(C.sectionGuide.code_num)} placeholder={fill(C.sectionExample.code_num)} value={sectionValue(app, 'code_num')} save={save('code_num')}
          staleOf={staleOf} myName={myName} maxLength={PATENT_SECTIONS.code_num.max} rows={2} readOnly={!isEditable(app)} />
      </Panel>
      <Panel title={C.ui.mechHead} sub={app.facts.gene ? C.ui.mechWhat(app.facts.gene) : undefined}>
        {app.facts.gene && <p className="hint">{C.mechTargetGuide(app.facts.gene)}</p>}
        <ChoiceChips app={app} keyName="mech_how" reload={reload} />
        <ChoiceChips app={app} keyName="mech_action" reload={reload} />
        <DocSectionEditor id="s31-why" label={C.sectionLabel.mech_why} guide={fill(C.sectionGuide.mech_why)} placeholder={fill(C.sectionExample.mech_why)} value={sectionValue(app, 'mech_why')} save={save('mech_why')}
          staleOf={staleOf} myName={myName} maxLength={PATENT_SECTIONS.mech_why.max} rows={2} readOnly={!isEditable(app)} />
      </Panel>
    </>
  );
}

const isEditable = (app: PatentApplicationView) => app.status === 'draft' || app.status === 'revise' || app.status === 'reviewing';

/** 5.02 해부도 — 이름표 · 이음표 · 번호 세 조각에 괄호와 뜻. 틀린 조각은 빨강 + ✕ 글. */
function CodeAnatomy({ ticker, num, problems }: { ticker: string; num: string; problems: string[] }) {
  const numBad = problems.some((p) => p === 'num_len' || p === 'num_digits' || p === 'taken');
  const shown = num || '___';
  const tw = ticker.length * 38;
  const x2 = 40 + tw + 14;
  const x3 = x2 + 40;
  const nw = Math.max(3, shown.length) * 38;
  const W = Math.max(420, x3 + nw + 20);
  return (
    <svg className="s31-anat" viewBox={`0 0 ${W} 170`} role="img" aria-label={C.ui.anatomyAria(ticker, num, numBad)}>
      <text x={40} y={78} className="an-big">{ticker}</text>
      <text x={x2} y={78} className="an-big">-</text>
      <text x={x3} y={78} className={`an-big${num ? '' : ' an-empty'}${numBad ? ' an-bad' : ''}`}>{shown}</text>
      <path d={`M40 92 V102 H${40 + tw} V92`} className="an-br" />
      <text x={40 + tw / 2} y={124} textAnchor="middle" className="an-l">{C.pieces.tick}</text>
      <text x={40 + tw / 2} y={142} textAnchor="middle" className="an-s">{C.ui.tickNote}</text>
      <path d={`M${x2 + 12} 30 V16`} className="an-br thin" />
      <text x={x2 + 12} y={12} textAnchor="middle" className="an-s">{C.pieces.dash}</text>
      <path d={`M${x3} 92 V102 H${x3 + nw} V92`} className={`an-br${numBad ? ' bad' : ''}`} />
      <text x={x3 + nw / 2} y={124} textAnchor="middle" className={`an-l${numBad ? ' bad' : ''}`}>{numBad ? '✕ ' : ''}{C.pieces.num}</text>
      <text x={x3 + nw / 2} y={142} textAnchor="middle" className="an-s">{C.ui.numNote}</text>
    </svg>
  );
}

function ChoiceChips({ app, keyName, reload }: { app: PatentApplicationView; keyName: 'mech_how' | 'mech_action'; reload: () => void }) {
  const act = useAction();
  const cur = sectionValue(app, keyName);
  const picked = parseList(cur?.body ?? '');
  const options = keyName === 'mech_how' ? MECH_HOW : MECH_ACTIONS;
  const label = (v: string) => (keyName === 'mech_how' ? C.howLabel[v as keyof typeof C.howLabel] : C.actionLabel[v as keyof typeof C.actionLabel]);
  const fill = fillerOf(app);
  const desc = (v: string) => fill(keyName === 'mech_how' ? C.howDesc[v as keyof typeof C.howDesc] : C.actionDesc[v as keyof typeof C.actionDesc]);
  const toggle = (v: string) => {
    const next = keyName === 'mech_action' ? (picked.includes(v) ? [] : [v]) : picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    void act.run(async () => {
      try {
        await api.put(PATENT_API.section(app.id, keyName), { body: next.join(','), expectedVersion: cur?.version ?? 0 });
      } finally {
        reload();
      }
    });
  };
  return (
    <fieldset className="reasons">
      <legend className="lab">{C.sectionLabel[keyName]}</legend>
      <div className="chips">
        {options.map((v) => (
          <button key={v} type="button" className="rchip" title={desc(v)} aria-pressed={picked.includes(v)} disabled={act.busy || !isEditable(app)} onClick={() => toggle(v)}>
            {picked.includes(v) && <span aria-hidden="true">✓ </span>}{label(v)}
          </button>
        ))}
      </div>
      <p className="hint">{fill(C.sectionGuide[keyName])}{cur?.byName ? ` (${C.ui.lastBy(cur.byName)})` : ''}</p>
      {picked.length > 0
        ? <ul className="s31-desc mini">{picked.map((v) => <li key={v}><b>{label(v)}</b> — {desc(v)}</li>)}</ul>
        : <p className="hint muted">{exampleText(fill(C.sectionExample[keyName]))}</p>}
      {act.error && <p className="hint bad">{act.error}</p>}
    </fieldset>
  );
}

function CodeSummary({ data, app }: { data: PatentsResponse; app: PatentApplicationView }) {
  const how = parseList(sectionValue(app, 'mech_how')?.body ?? '').map((v) => C.howLabel[v as keyof typeof C.howLabel]).join(' · ');
  const action = sectionValue(app, 'mech_action')?.body;
  return (
    <Panel title={C.ui.codeSummaryTitle} sub={C.serverFilled}>
      <p className="s31-codeline"><b className="mono">{app.codeName ?? `${data.ticker}-___`}</b> · {app.facts.gene ?? C.ui.targetWord} {how || C.ui.howBlank} {action ? C.actionLabel[action as keyof typeof C.actionLabel] : C.ui.actionBlank}</p>
      <dl className="s31-dl">
        <dt>{C.facts.applicant}</dt><dd>{data.companyName} ({data.ticker})</dd>
        <dt>{C.facts.target}</dt><dd>{app.facts.gene} {app.facts.targetLabel} · {app.facts.disease}</dd>
      </dl>
      <p className="hint">{C.ui.codeSummaryNote(data.takenCodes.map((t) => t.codeName).join(' · '))}</p>
    </Panel>
  );
}

// ── ③ 출원서 ──

function DocBench({ app, members, myName, reload }: { app: PatentApplicationView; members: PatentsMember[]; myName: string; reload: () => void }) {
  const save = useSectionSaver(app.id, reload);
  const ro = !isEditable(app);
  const changed = app.status === 'reviewing' && app.review && app.review.docVersion !== app.version ? C.changedAfterReview : null;
  const fill = fillerOf(app);
  return (
    <>
      {changed && <p className="hint">↻ {changed}</p>}
      <Panel title={C.ui.docHead}>
        {DOC_KEYS.map((key) => (
          <DocSectionEditor key={key} id={`s31-${key}`} label={C.sectionLabel[key]} guide={fill(C.sectionGuide[key])} placeholder={fill(C.sectionExample[key])} value={sectionValue(app, key)} save={save(key)}
            staleOf={staleOf} myName={myName} maxLength={PATENT_SECTIONS[key].max} rows={key === 'effect' || key === 'background' ? 4 : 2} readOnly={ro} />
        ))}
      </Panel>
      <Inventors app={app} members={members} reload={reload} />
    </>
  );
}

type PatentsMember = StepProps['board']['members'][number];

function Inventors({ app, members, reload }: { app: PatentApplicationView; members: PatentsMember[]; reload: () => void }) {
  const act = useAction();
  const cur = sectionValue(app, 'inventors');
  const picked = parseList(cur?.body ?? '');
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    void act.run(async () => {
      try {
        await api.put(PATENT_API.section(app.id, 'inventors'), { body: next.join(','), expectedVersion: cur?.version ?? 0 });
      } finally {
        reload();
      }
    });
  };
  return (
    <Panel title={C.sectionLabel.inventors}>
      <div className="chips" role="group" aria-label={C.sectionLabel.inventors}>
        {members.map((m) => (
          <button key={m.userId} type="button" className="rchip" aria-pressed={picked.includes(m.userId)} disabled={act.busy || !isEditable(app)} onClick={() => toggle(m.userId)}>
            {picked.includes(m.userId) && <span aria-hidden="true">✓ </span>}{m.displayName}
          </button>
        ))}
      </div>
      <p className="hint">{C.sectionGuide.inventors}{cur?.byName ? ` (${C.ui.lastBy(cur.byName)})` : ''}</p>
      {act.error && <p className="hint bad">{act.error}</p>}
    </Panel>
  );
}

/** 5.01 출원서 해부 — 서버가 채운 근거(번호 1~5) · 실시예. 학생이 못 고친다. */
function FactsPanel({ data, app, refSmiles }: { data: PatentsResponse; app: PatentApplicationView; refSmiles: string | null }) {
  const f = app.facts;
  return (
    <Panel title={C.ui.anatomyTitle} sub={C.serverFilled}>
      <dl className="s31-dl">
        <dt><span className="s31-ev">1</span>{C.facts.structure}</dt><dd className="mono s31-smi">{f.canonicalSmiles ?? '—'}</dd>
        <dt>{C.facts.flat}</dt><dd className="mono s31-smi">{f.flatSmiles ?? '—'}</dd>
        <dt><span className="s31-ev">2</span>{C.facts.target}</dt><dd>{f.gene}({f.targetLabel}) · {f.disease}</dd>
        <dt><span className="s31-ev">3</span>{C.facts.docking}</dt>
        <dd className="mono">{f.dockingKcal?.toFixed(2) ?? '—'} kcal/mol · {C.facts.reference} {f.referenceName} {f.referenceKcal?.toFixed(2)}{f.parentKcal !== null ? ` · ${C.facts.parent} ${f.parentKcal.toFixed(2)}` : ''}</dd>
        <dt>{C.facts.residues}</dt><dd className="mono">{f.residues.join(' · ') || '—'}</dd>
        <dt>{C.facts.admet}</dt><dd>{f.admet.map((m) => `${m.label} ${m.value}${m.unit ?? ''}`).join(' · ') || '—'}</dd>
        <dt>{C.facts.props}</dt><dd className="mono">MW {f.mw ?? '—'} · TPSA {f.tpsa ?? '—'} · cLogP {f.clogp ?? '—'} · QED {f.qed ?? '—'}</dd>
        <dt><span className="s31-ev">4</span>{C.facts.applicant}</dt><dd>{f.companyName} ({f.ticker})</dd>
        <dt><span className="s31-ev">5</span>{C.facts.filed}</dt><dd className="mono">D+{app.patent?.filedGameDay ?? data.gameDay}{app.patent ? ` · ${app.patent.patentNo}` : ''}</dd>
        <dt>{C.facts.evidence}</dt><dd className="mono mini">{C.ui.evidence(f.admetJobId.slice(0, 8), f.dockingJobId?.slice(0, 8) ?? null)}</dd>
      </dl>
      {f.canonicalSmiles && refSmiles && <Fingerprint refSmiles={refSmiles} refName={f.referenceName} ours={f.canonicalSmiles} oursName={app.codeName ?? C.ui.ourCandidate} />}
    </Panel>
  );
}

// ── ④ 심사 ──

function FindingList({ findings }: { findings: RuleFinding[] }) {
  return (
    <ul className="s31-find">
      {findings.map((f) => (
        <li key={f.id} className={f.status === 'fail' ? (f.severity === 'reject' ? 'rej' : 'bad') : 'ok'}>
          <b aria-hidden="true">{f.status === 'fail' ? '✕' : '✓'}</b>
          <span className="sr">{f.status === 'fail' ? (f.severity === 'reject' ? C.ui.srFinding.reject : C.ui.srFinding.revise) : C.ui.srFinding.ok} </span>
          {f.note}
        </li>
      ))}
    </ul>
  );
}

function ReviewBench({ data, app, reload }: { data: PatentsResponse; app: PatentApplicationView; reload: () => void }) {
  const act = useAction();
  const [pre, setPre] = useState<PatentPrecheckResponse | null>(null);
  const [confirm, setConfirm] = useState<'withdraw' | 'abandon' | null>(null);
  // 서버도 같은 규칙(옛 표적 버전 출원서는 심사 409 — patents.ts requestPatentReview).
  const reviewable = (app.status === 'draft' || app.status === 'revise') && app.current;
  const fails = pre?.findings.filter((f) => f.status === 'fail') ?? [];
  return (
    <>
      {(app.status === 'draft' || app.status === 'revise' || app.status === 'reviewing') && <Panel title={C.precheck}>
        <div className="acts">
          <button type="button" className="btn sm" disabled={act.busy} onClick={() => void act.run(async () => setPre(await api.post<PatentPrecheckResponse>(PATENT_API.precheck(app.id))))}>{C.ui.runPrecheck}</button>
          {pre && <span className="note">{C.ui.precheckSummary(pre.docVersion, fails.length)}</span>}
        </div>
        {pre && <FindingList findings={pre.findings} />}
        {pre && fails.length === 0 && <p className="hint good">✓ {C.rule.allOk}</p>}
      </Panel>}
      {(reviewable || app.status === 'reviewing') && <Panel title={C.request}>
        <p className="hint">{C.ui.feeBalance(money(data.feeCents), money(data.balanceCents))}</p>
        <div className="acts">
          <button type="button" className="btn pri" disabled={!reviewable || act.busy}
            onClick={() => void act.run(async () => {
              await api.post(PATENT_API.review(app.id), { docVersion: app.version });
              setPre(null);
              reload();
            })}>{C.request} <span className="cost">{C.ui.version(app.version)}</span></button>
          {!reviewable && <span className="note">{app.current ? C.status[app.status] : C.err.oldRevision}</span>}
        </div>
      </Panel>}
      {act.error && <p className="err">{act.error}</p>}
      {(app.status === 'draft' || app.status === 'revise' || app.status === 'accepted') && (
        <Panel title={app.status === 'accepted' ? C.abandonPatent : C.abandonApp} tone="bad">
          <p className="hint">{app.status === 'accepted' ? C.abandonConfirm(app.codeName ?? '', money(data.feeCents)) : C.withdrawConfirm}</p>
          <button type="button" className="btn sm" onClick={() => setConfirm(app.status === 'accepted' ? 'abandon' : 'withdraw')}>{app.status === 'accepted' ? C.abandonPatent : C.abandonApp}</button>
        </Panel>
      )}
      <Confirm open={confirm !== null} tone="bad" title={confirm === 'abandon' ? C.abandonPatent : C.abandonApp} confirmLabel={confirm === 'abandon' ? C.abandonPatent : C.abandonApp} busy={act.busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void act.run(async () => {
          await api.post(PATENT_API.abandon(app.id));
          setConfirm(null);
          reload();
        })}>
        <p>{confirm === 'abandon' ? C.abandonConfirm(app.codeName ?? '', money(data.feeCents)) : C.withdrawConfirm}</p>
      </Confirm>
    </>
  );
}

function ReviewResult({ data, app, onLedger }: { data: PatentsResponse; app: PatentApplicationView; onLedger: () => void }) {
  const r: DocReviewView | null = app.review;
  if (!r) return <Panel title={C.ui.resultTitle}><p className="empty">{C.ui.noReview}</p></Panel>;
  const tone = r.verdict === 'pass' ? 'good' : r.verdict === 'reject' ? 'bad' : r.verdict === 'revise' ? 'warn' : undefined;
  const mark = r.verdict === 'pass' ? '✓' : r.verdict === 'reject' ? '✕' : r.verdict === 'revise' ? '!' : '▸';
  return (
    <>
      <Panel title={<><span aria-hidden="true">{mark} </span>{C.verdict[r.verdict]}{app.rejectReason ? ` — ${C.rejectReason[app.rejectReason]}` : app.status === 'rejected' && r.verdict === 'reject' ? ` — ${C.rejectedByTeacher}` : ''}</>} sub={C.ui.reviewSub(r.docVersion, r.requestedByName)} tone={tone}>
        <p className="hint" aria-live="polite">{r.stage === 'deliberating' ? DOC_REVIEW_COPY.deliberating(r.releaseGameDay) : C.reviewStage[r.stage]}{r.docVersion !== app.version ? ` · ${C.changedAfterReview}` : ''}</p>
        {app.status === 'accepted' && app.patent && (
          <div className="acts"><p className="hint good">✓ {C.accepted(app.codeName ?? '', app.patent.patentNo, app.patent.classSeq, money(data.feeCents))}</p><button type="button" className="btn sm film" onClick={onLedger}>{C.ledgerTitle}</button></div>
        )}
        {r.verdict === 'revise' && app.status === 'revise' && <p className="hint">{C.nextRevise}</p>}
        {r.verdict === 'reject' && app.status === 'rejected' && <p className="hint">{C.nextReject}</p>}
        {app.rejectReason === 'known' && <p className="hint">{C.rule.noveltyHelp}</p>}
        <p className="lab">{C.ui.rulesHead}</p>
        <FindingList findings={r.ruleFindings} />
      </Panel>
      {(r.items.length > 0 || r.feedback) && (
        <Panel title={C.ui.itemsTitle}>
          <ul className="s31-find">
            {r.items.map((it) => (
              <li key={it.id} className={it.status === 'ok' ? 'ok' : 'bad'}>
                <b aria-hidden="true">{it.status === 'ok' ? '✓' : it.status === 'unclear' ? '?' : '✕'}</b>
                <span className="sr">{C.itemStatus[it.status]} </span>
                <span className="mini muted">{it.section && it.section in C.sectionLabel ? C.sectionLabel[it.section as PatentSectionKey] : it.id}</span> {it.note}
              </li>
            ))}
          </ul>
          {r.feedback && <><p className="lab">{C.ui.summaryHead}</p><p className="s31-fb">{r.feedback}</p></>}
          {r.teacherNote && <p className="hint">{C.ui.teacherNote(r.teacherNote)}</p>}
        </Panel>
      )}
    </>
  );
}

// ── ⑤ 학급 특허 원장 5.04 ──

function LedgerPanel({ rows }: { rows: PatentLedgerRow[] }) {
  const L = C.ui.ledgerCols;
  return (
    <Panel title={C.ledgerTitle} sub={C.ui.ledgerRows(rows.filter((r) => r.kind === 'patent').length)}>
      {rows.some((r) => r.kind === 'rejected') && <p className="hint bad">{C.redRowNote}</p>}
      {rows.length === 0 ? <p className="empty">{C.ledgerEmpty}</p> : (
        <div className="s31-led">
          <table>
            <caption className="sr">{C.ledgerTitle}</caption>
            <thead><tr>{Object.values(C.ui.ledgerCols).map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.kind === 'rejected' ? 'rej' : r.mine ? 'me' : ''}>
                  <td data-l={L.seq} className="mono">{r.classSeq ?? '—'}</td>
                  <td data-l={L.no} className="mono">{r.patentNo ?? C.ui.rejectedNo}</td>
                  <td data-l={L.applicant}><span><span className="s31-dot" style={{ background: ink(r.ink).base }} aria-hidden="true" />{r.companyName}{r.mine && <b> ({C.mine})</b>}</span></td>
                  <td data-l={L.code} className="mono"><b>{r.codeName}</b></td>
                  <td data-l={L.target}>{r.gene} · {r.disease}</td>
                  <td data-l={L.structure} className="mono s31-smi">{r.canonicalSmiles}</td>
                  <td data-l={L.filed} className="mono">{r.filedGameDay !== null ? `D+${r.filedGameDay}` : '—'}</td>
                  <td data-l={L.status}>
                    <span className={`sig ${r.status === 'active' ? 'g' : r.status === 'rejected' ? 'b' : ''}`}>{r.status === 'active' ? '✓ ' : r.status === 'rejected' ? '✕ ' : ''}{C.ledgerStatus[r.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

