/**
 * 3.3 제형 · IND 신청(설계 §5.10 · §5.11) — 기능 F33.
 *
 * - 머리 섬 아래 왼쪽(내 작업대): 도구 6종 탭(what-if 실험실이 첫 탭). '이 단계에서 하는 일' 요약은 2026-10-24 사용자 지시로 뺐다.
 *   도구의 손잡이(제형 · 용량 · 후보 · 환자군)는 개인 상태(`useBenchState`) — 다른 모둠원 화면을 흔들지 않는다.
 * - 오른쪽(모둠 공유): 임상시험 계획 승인 신청서 ①~⑦(칸 단위 자동 저장 · 409 합치기) · 조합 · 규칙 미리 보기 · 심사 · 접수 · 판정 · 승인서.
 *   E–S 평면에서 점을 눌러 고른 조합을 [신청서에 넣기]로 모둠 신청서에 쓴다(plan_version 낙관적 잠금).
 * - 서버: GET /api/ind(`IndResponse`) — 모둠 WS(doc.reviewed · board.changed 'ind:*')가 오면 다시 읽는다.
 * 학생에게 보이는 글은 web-contract `IND_COPY` 한곳(§5.12 에서 다듬는다).
 */
import { useEffect, useState } from 'react';
import {
  fillIndCopy,
  formatGameDay,
  gameDayNow,
  IND_API,
  IND_COPY,
  IND_PARTS,
  IND_PHASE1_ENDPOINT,
  IND_PLEDGE_BODY,
  IND_SECTIONS,
  indFmtMg,
  PRECLINICAL_COPY,
  type DocReviewView,
  type DocSectionView,
  type IndApplicationResponse,
  type IndApplicationView,
  type IndCandidateView,
  type IndDose,
  type IndForm,
  type IndPart,
  type IndResponse,
  type IndSectionDef,
  DOC_REVIEW_COPY,
} from '@crista-web/web-contract';
import { api, ApiFailure, message } from '../../api.ts';
import { money } from '../../ink.ts';
import { Confirm, DocSectionEditor, Panel, useBenchState, useLive, useLocalTab, type DocSectionStale } from '../ui/index.ts';
import { Next, NotesBlock, StepLayout, useAction, type StepProps } from './common.tsx';
import { TOOL_IDS, TOOL_VIEW, type Knobs, type ToolId } from './s33-tools.tsx';
import './s33.css';

const C = IND_COPY;
const D = C.doc;
const F = C.facts;

const staleOf = (e: ApiFailure): DocSectionStale | null => {
  const s = e.detail?.section;
  return s ? { body: s.body, byName: s.byName, version: s.version } : { body: '', byName: null, version: 0 };
};

function ReviewBox({ review, app }: { review: DocReviewView; app: IndApplicationView }) {
  const v = review.verdict;
  const tone = v === 'pass' ? 'good' : v === 'pending' ? undefined : 'bad';
  const mark = v === 'pass' ? '✓' : v === 'pending' ? '▸' : '✕';
  const label = (sec: string | null) => (sec && C.sections[sec as keyof typeof C.sections]?.label) || '';
  return (
    <Panel title={<>{mark} {D.verdict[v]}</>} sub={`${fillIndCopy(D.version, { n: review.docVersion })}${review.requestedByName ? ` · ${review.requestedByName}` : ''}`} tone={tone}>
      {review.docVersion !== app.version && app.status !== 'submitted' && app.status !== 'approved' && (
        <p className="hint bad">{fillIndCopy(D.reviewStale, { a: review.docVersion, b: app.version })}</p>
      )}
      {v === 'pending' && <p className="hint" role="status">{review.stage === 'deliberating' ? DOC_REVIEW_COPY.deliberating(review.releaseGameDay) : review.stage === 'retrying' ? D.reviewRetrying : D.reviewPending}</p>}
      {review.stage === 'auto' && <p className="mini muted">{DOC_REVIEW_COPY.auto}</p>}
      {review.ruleFindings.some((f) => f.status === 'fail') && (
        <ul className="s33-rules">
          {review.ruleFindings.filter((f) => f.status === 'fail').map((f) => <li key={f.id} className="bad">✕ {f.note}</li>)}
        </ul>
      )}
      {v === 'revise' && <p className="hint">{D.reviseHint}</p>}
      {v === 'pass' && app.status === 'passed' && review.docVersion === app.version && <p className="hint">{D.passedNotice}</p>}
      {review.items.length > 0 && (
        <>
          <p className="mini"><b>{D.itemHeader}</b></p>
          <ul className="s33-rules">
            {review.items.map((it) => (
              <li key={it.id} className={it.status === 'ok' ? 'ok' : 'bad'}>
                <span aria-hidden="true">{it.status === 'ok' ? '✓' : it.status === 'unclear' ? '?' : '✕'}</span> <span className="sr">{D.itemStatus[it.status] ?? ''} · </span><b>{label(it.section)}</b> {it.note}
              </li>
            ))}
          </ul>
        </>
      )}
      {review.feedback && <p className="mini"><b>{D.feedbackHeader}</b> · {review.feedback}</p>}
      {review.teacherNote && <p className="mini muted">{D.teacherNote} · {review.teacherNote}</p>}
    </Panel>
  );
}

function Approval({ data }: { data: IndResponse }) {
  const a = data.approval!;
  const p1 = data.rules.thresholds.phase1;
  const R = D.approvalRows;
  return (
    <Panel title={<>✓ {D.approvedTitle}</>} tone="good" className="s33-cert">
      <div className="s33-stamp" aria-hidden="true">{D.stamp}</div>
      <dl className="s33-kv">
        <div><dt>{R.candidate}</dt><dd>{a.codeName} · {a.patentNo}</dd></div>
        <div><dt>{R.form}</dt><dd>{C.forms[a.form].label}</dd></div>
        <div><dt>{R.dose}</dt><dd>{a.doseMg} mg{a.mrsdMg !== null ? ` (MRSD ${indFmtMg(a.mrsdMg)} mg)` : ''}</dd></div>
        <div><dt>{R.phase1Endpoint}</dt><dd>{a.phase1Endpoint}</dd></div>
        <div><dt>{R.population}</dt><dd>{a.population}</dd></div>
        <div><dt>{R.endpoint}</dt><dd>{a.endpoint}</dd></div>
        <div><dt>{R.score}</dt><dd>E {a.efficacy.toFixed(1)} · S {a.safety.toFixed(1)}</dd></div>
        <div><dt>{R.day}</dt><dd>{formatGameDay(a.approvedGameDay)}</dd></div>
      </dl>
      <p className="mini">{D.approvedNote}</p>
      <p className="mini">{a.safety >= p1 ? fillIndCopy(D.phase1Ok, { p1 }) : fillIndCopy(D.phase1Gap, { p1, gap: (p1 - a.safety).toFixed(1) })}</p>
    </Panel>
  );
}

/** 판정 기다리기 — 판정 시각을 지났는데 소식(WS)이 안 오면(연결이 끊겼거나 다른 서버 프로세스가 판정) 5초마다 다시 읽는다. */
function Waiting({ app, clock, reload }: { app: IndApplicationView; clock: StepProps['board']['clock']; reload: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const from = app.submittedGameDay ?? 0;
  const to = app.decideGameDay ?? from;
  const now = gameDayNow(clock);
  const pct = to > from ? Math.round(Math.max(0, Math.min(1, (now - from) / (to - from))) * 100) : 0;
  const due = now >= to;
  useEffect(() => {
    if (!due) return;
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [due, reload]);
  return (
    <Panel title={<>▸ {C.status.submitted}</>}>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={D.waitingLabel}><i style={{ width: `${pct}%` }} /></div>
      <p className="mini">{fillIndCopy(D.waiting, { from: formatGameDay(from), to: formatGameDay(to), pct })}</p>
      {app.safety !== null && <p className="mini mono">E {app.efficacy?.toFixed(1)} · S {app.safety.toFixed(1)}</p>}
    </Panel>
  );
}

function Pledge({ def, sec, app, editable, reload }: { def: IndSectionDef; sec: DocSectionView | undefined; app: IndApplicationView; editable: boolean; reload: () => void }) {
  const act = useAction();
  const on = sec?.body === IND_PLEDGE_BODY;
  return (
    <div className="chk">
      <input
        id={`s33-${def.key}`}
        type="checkbox"
        checked={on}
        disabled={!editable || act.busy}
        onChange={(e) => void act.run(async () => {
          await api.put(IND_API.section(app.id, def.key), { body: e.target.checked ? IND_PLEDGE_BODY : '', expectedVersion: sec?.version ?? 0 }).finally(reload);
        })}
      />
      <label htmlFor={`s33-${def.key}`}>{C.sections[def.key].label}{on && sec?.byName ? <span className="mini muted"> · {sec.byName}</span> : null}</label>
      {act.error && <span className="hint bad">{act.error}</span>}
    </div>
  );
}

function PartFacts({ part, data, app, cand }: { part: IndPart; data: IndResponse; app: IndApplicationView; cand: IndCandidateView | undefined }) {
  if (part === 'cover') {
    return (
      <p className="mini s33-server"><span className="tag">{D.serverFill}</span> {fillIndCopy(F.cover, { code: app.codeName, patent: cand ? fillIndCopy(F.patent, { no: cand.patentNo }) : '', mech: data.target ? fillIndCopy(F.mech, { gene: data.target.gene, disease: data.target.disease }) : '' })}</p>
    );
  }
  if (part === 'plan' && data.target) return <p className="mini s33-server"><span className="tag">{D.serverFill}</span> {fillIndCopy(F.plan, { gene: data.target.gene, label: data.target.label, disease: data.target.disease })}</p>;
  if (part === 'form' && cand?.signals) {
    const k = data.rules.formulationPeak;
    return <p className="mini s33-server"><span className="tag">{D.serverFill}</span> {fillIndCopy(F.form, { td: C.levels[cand.signals.transdermal] ?? '', oral: C.levels[cand.signals.oralAbsorption] ?? '', kOral: k.oral.toFixed(2), kIv: k.iv.toFixed(2), kTd: k.transdermal.toFixed(2) })}</p>;
  }
  if (part === 'nonclinical' && cand?.animal) {
    const a = cand.animal;
    return (
      <p className="mini s33-server mono">
        <span className="tag">{D.serverFill}</span> {fillIndCopy(F.nonclinical, { rat: a.noaelMgPerKgDay.rat, dog: a.noaelMgPerKgDay.dog, sf: a.safetyFactor, eff: a.efficacyVsReferencePct, findings: a.findings.length ? a.findings.map((f) => PRECLINICAL_COPY.findings[f]).join(' · ') : F.noFindings, animals: a.animalsUsed })}
      </p>
    );
  }
  if (part === 'risk' && cand?.signals) return <p className="mini s33-server"><span className="tag">{D.serverFill}</span> {fillIndCopy(F.risk, { herg: C.levels[cand.signals.herg] ?? '', liver: C.levels[cand.signals.hepatotoxicity] ?? '' })}</p>;
  return null;
}

function Plan({ data, app, editable, reload }: { data: IndResponse; app: IndApplicationView; editable: boolean; reload: () => void }) {
  const act = useAction();
  const put = (patch: Record<string, unknown>) => act.run(async () => {
    try {
      await api.put<IndApplicationResponse>(IND_API.plan(app.id), { expectedPlanVersion: app.planVersion, ...patch });
    } finally {
      reload();
    }
  });
  const trial = data.trial;
  return (
    <Panel title={D.planTitle} sub={fillIndCopy(D.version, { n: app.planVersion })}>
      <div className="s33-plan">
        {(data.candidates.length > 1 || !data.candidates.some((c) => c.patentId === app.patentId)) && (
          <div className="fld">
            <label className="lab" htmlFor="s33-pc">{D.candidate}</label>
            <select id="s33-pc" className="txt" value={app.patentId} disabled={!editable || act.busy} onChange={(e) => void put({ patentId: e.target.value })}>
              {!data.candidates.some((c) => c.patentId === app.patentId) && <option value={app.patentId}>{app.codeName} {D.planCandidateGone}</option>}
              {data.candidates.map((c) => <option key={c.patentId} value={c.patentId}>{C.roles[c.role]} · {c.codeName}</option>)}
            </select>
          </div>
        )}
        <div className="fld">
          <label className="lab" htmlFor="s33-pf">{C.toolNotes.knobForm}</label>
          <select id="s33-pf" className="txt" value={app.form ?? ''} disabled={!editable || act.busy} onChange={(e) => void put({ form: e.target.value || null })}>
            <option value="">{D.pick}</option>
            {(['oral', 'iv', 'transdermal'] as const).map((f) => <option key={f} value={f}>{C.forms[f].mark} {C.forms[f].label}</option>)}
          </select>
        </div>
        <div className="fld">
          <label className="lab" htmlFor="s33-pd">{C.toolNotes.knobDose}</label>
          <select id="s33-pd" className="txt" value={app.doseMg ?? ''} disabled={!editable || act.busy} onChange={(e) => void put({ doseMg: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{D.pick}</option>
            {[10, 50, 100].map((d) => <option key={d} value={d}>{d} mg</option>)}
          </select>
        </div>
        <div className="fld">
          <label className="lab" htmlFor="s33-pp">{D.population}</label>
          <select id="s33-pp" className="txt" value={app.population ?? ''} disabled={!editable || act.busy || !trial} onChange={(e) => void put({ population: e.target.value || null })}>
            <option value="">{D.pick}</option>
            {trial?.populations.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="fld">
          <label className="lab" htmlFor="s33-pe">{D.endpoint}</label>
          <select id="s33-pe" className="txt" value={app.endpoint ?? ''} disabled={!editable || act.busy || !trial} onChange={(e) => void put({ endpoint: e.target.value || null })}>
            <option value="">{D.pick}</option>
            {trial?.endpoints.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <p className="mini">{D.phase1Endpoint} · <b>{IND_PHASE1_ENDPOINT}</b></p>
      </div>
      {!app.form && <p className="hint">{D.planEmpty}</p>}
      {act.error && <p className="hint bad" role="alert">{act.error}</p>}
    </Panel>
  );
}

export function Step33(props: StepProps) {
  const { board, step, goStep } = props;
  const [tool, setTool] = useLocalTab<ToolId>('step:3.3', TOOL_IDS, 'lab');
  const live = useLive<IndResponse>(IND_API.ind, (m) =>
    (m.type === 'doc.reviewed' && m.kind === 'ind') || (m.type === 'board.changed' && (m.reason.startsWith('ind') || m.reason === 'lead' || m.reason.startsWith('preclinical') || m.reason.startsWith('job'))),
  );
  const data = live.data;
  const app = data?.application ?? null;
  const [knobs, setKnobs] = useBenchState<Knobs & { init: boolean }>('s33:knobs', { form: 'oral', dose: 10, role: 'lead', population: null, init: false });
  useEffect(() => {
    if (!data || knobs.init) return;
    setKnobs((k) => ({
      ...k,
      init: true,
      form: app?.form ?? k.form,
      dose: app?.doseMg ?? k.dose,
      population: app?.population ?? data.trial?.populations[0] ?? null,
      role: data.candidates.find((c) => c.patentId === app?.patentId)?.role ?? 'lead',
    }));
  }, [data, app, knobs.init, setKnobs]);
  const act = useAction();
  const applyAct = useAction();
  const [confirm, setConfirm] = useState(false);

  const editable = !!app && (['draft', 'reviewing', 'revise', 'passed'] as const).includes(app.status as 'draft');
  const cand = data?.candidates.find((c) => c.role === knobs.role) ?? data?.candidates[0];
  const appCand = data?.candidates.find((c) => c.patentId === app?.patentId);
  const brainPop = !!(data && !data.target?.cns && knobs.population && data.trial?.brainPopulations.includes(knobs.population));
  const sec = (key: string) => app?.sections.find((s) => s.section === key);

  // E–S 평면의 점 = 그 후보의 조합 — 손잡이에서 백업을 보고 있었다면 후보도 함께 바꾼다.
  const onApply = editable && app
    ? (form: IndForm, dose: IndDose) => void applyAct.run(async () => {
        try {
          await api.put(IND_API.plan(app.id), { expectedPlanVersion: app.planVersion, form, doseMg: dose, ...(cand && cand.patentId !== app.patentId ? { patentId: cand.patentId } : {}) });
        } finally {
          live.reload();
        }
      })
    : null;

  const tabs = TOOL_IDS.map((id, i) => ({ id, no: ['①', '②', '③', '④', '⑤', '⑥'][i], label: C.tools[id].tab, sub: C.tools[id].sub }));
  const ToolView = TOOL_VIEW[tool];
  const fails = app?.rulePreview.filter((f) => f.status === 'fail') ?? [];
  const review = app?.review ?? null;
  const canSubmit = !!app && app.status === 'passed' && review?.verdict === 'pass' && review.docVersion === app.version;
  const fee = money(data?.feeCents ?? 0);
  const th = data?.rules.thresholds;
  const pk = data?.rules.formulationPeak;
  const ruleFill: Record<string, string | number> = th && pk && data
    ? { ind: th.ind, p1: th.phase1, p2e: th.phase2E, p3e: th.phase3E, p3s: th.phase3S, kOral: pk.oral.toFixed(2), kIv: pk.iv.toFixed(2), kTd: pk.transdermal.toFixed(2), base: data.rules.efficacy.base, w: data.rules.efficacy.affinityWeight }
    : {};

  const mine = (
    <>
      {!data ? (
        <p className="hint">{live.error ? message(live.error) : D.loading}</p>
      ) : !cand ? (
        <p className="empty">{data.readyReason ?? D.lockedStep}</p>
      ) : (
        <Panel title={C.tools[tool].tab} sub={fillIndCopy(C.toolNotes.fills, { what: C.tools[tool].fills })}>
          <p className="s33-q">{fillIndCopy(C.tools[tool].question, ruleFill)}</p>
          <p className="hint">{fillIndCopy(C.tools[tool].howTo, ruleFill)}</p>
          <ToolView data={data} cand={cand} knobs={knobs} setKnobs={(fn) => setKnobs((k) => ({ ...k, ...fn(k) }))} brainPop={brainPop} onApply={onApply} applied={app && app.patentId === cand.patentId ? { form: app.form, dose: app.doseMg } : null} busy={applyAct.busy} />
          {applyAct.error && <p className="hint bad" role="alert">{applyAct.error}</p>}
        </Panel>
      )}
    </>
  );

  const parts = IND_PARTS.map((part) => {
    const defs = IND_SECTIONS.filter((s) => s.part === part);
    const P = C.parts[part];
    return (
      <section key={part} className="s33-part" aria-labelledby={`s33-p-${part}`}>
        <h4 id={`s33-p-${part}`}><span className="s33-no">{P.no}</span> {P.title}</h4>
        <p className="hint">{P.guide}</p>
        {data && app && <PartFacts part={part} data={data} app={app} cand={appCand} />}
        {defs.map((def) => {
          const s = sec(def.key);
          if (def.kind === 'pledge') return <Pledge key={def.key} def={def} sec={s} app={app!} editable={editable} reload={live.reload} />;
          const copy = C.sections[def.key];
          const fail = fails.find((f) => f.section === def.key);
          return (
            <div key={def.key} className={def.kind === 'number' ? 's33-num' : ''}>
              <DocSectionEditor
                id={`s33-${def.key}`}
                label={<>{copy.label}{fail && <span className="s33-flag" title={fail.note}> ✕</span>}</>}
                guide={copy.criterion ? <>{copy.guide} <span className="muted">{copy.criterion}</span></> : copy.guide}
                value={s ? { body: s.body, version: s.version, byName: s.byName, avatar: s.avatar } : null}
                save={async (body, expectedVersion) => api.put<{ version: number }>(IND_API.section(app!.id, def.key), { body, expectedVersion })}
                staleOf={staleOf}
                myName={board.account.displayName}
                maxLength={def.max}
                placeholder={fillIndCopy(copy.placeholder, { code: app?.codeName ?? '' })}
                rows={def.kind === 'number' ? 1 : def.max > 500 ? 5 : 3}
                readOnly={!editable}
                onSaved={() => live.reload()}
              />
            </div>
          );
        })}
      </section>
    );
  });

  const team = (
    <>
      {!data ? null : !app ? (
        <Panel title={D.heading}>
          <p className="mini">{data.ready ? D.newDocHint : data.readyReason ?? D.lockedStep}</p>
          <div className="acts">
            <button type="button" className="btn pri" disabled={!data.ready || act.busy} onClick={() => void act.run(async () => {
              await api.post(IND_API.applications);
              live.reload();
            })}>{D.newDoc}</button>
          </div>
          {act.error && <p className="hint bad" role="alert">{act.error}</p>}
        </Panel>
      ) : (
        <>
          <Panel title={<>{C.statusMark[app.status]} {D.heading}</>} sub={`${C.status[app.status]} · ${fillIndCopy(D.version, { n: app.version })}${app.createdByName ? ` · ${app.createdByName}` : ''}`} tone={app.status === 'approved' || app.status === 'passed' ? 'good' : app.status === 'revise' || app.status === 'held' ? 'warn' : undefined}>
            {!editable && app.status !== 'approved' && <p className="hint">{D.locked}</p>}
            {app.status === 'held' && (
              <>
                <p className="hint bad">{D.heldNote}</p>
                <div className="acts">
                  <button type="button" className="btn pri" disabled={!data.ready || act.busy} onClick={() => void act.run(async () => {
                    await api.post(IND_API.applications);
                    live.reload();
                  })}>{D.newDoc}</button>
                </div>
              </>
            )}
          </Panel>
          {data.approval && <Approval data={data} />}
          {app.status === 'submitted' && <Waiting app={app} clock={board.clock} reload={live.reload} />}
          <Plan data={data} app={app} editable={editable} reload={live.reload} />
          <Panel title={D.heading} className="s33-doc"><p className="hint">{C.shareHint}</p>{parts}</Panel>
          {editable && (
            <Panel title={D.rulesTitle} sub={D.rulesHint}>
              <ul className="s33-rules">
                {app.rulePreview.map((f) => <li key={f.id} className={f.status === 'ok' ? 'ok' : 'bad'}>{f.status === 'ok' ? '✓' : '✕'} {f.note}</li>)}
              </ul>
            </Panel>
          )}
          {review && <ReviewBox review={review} app={app} />}
          {editable && (
            <div className="acts">
              <button type="button" className="btn" disabled={act.busy || (app.status === 'reviewing' && review?.docVersion === app.version)} onClick={() => void act.run(async () => {
                try {
                  await api.post(IND_API.review(app.id), { expectedVersion: app.version });
                } finally {
                  live.reload();
                }
              })}>{D.reviewBtn}</button>
              <button type="button" className="btn pri" disabled={!canSubmit || act.busy} onClick={() => setConfirm(true)}>
                {fillIndCopy(D.submitBtn, { fee })}
              </button>
            </div>
          )}
          {act.error && <p className="hint bad" role="alert">{act.error}</p>}
          <Confirm
            open={confirm}
            title={fillIndCopy(D.submitBtn, { fee })}
            confirmLabel={fillIndCopy(D.submitBtn, { fee })}
            busy={act.busy}
            blockedReason={board.balanceCents < (data.feeCents ?? 0) ? D.noFunds : null}
            onCancel={() => setConfirm(false)}
            onConfirm={() => void act.run(async () => {
              try {
                await api.post(IND_API.submit(app.id), { expectedVersion: app.version });
              } finally {
                setConfirm(false);
                live.reload();
              }
            })}
          >
            <p>{fillIndCopy(D.submitConfirm, { fee, days: data.reviewGameDays })}</p>
            {app.form && app.doseMg && <p className="mini">{C.forms[app.form].label} · {app.doseMg} mg · {app.population} · {app.endpoint}</p>}
          </Confirm>
        </>
      )}
      <NotesBlock board={board} stepId="3.3" />
      <Next step={step} goStep={goStep} label="4.1" />
    </>
  );

  return (
    <StepLayout
        {...props}
        tabs={tabs}
        tab={tool}
        onTab={(id) => setTool(id as ToolId)}
        tabsLabel={C.ui.tabsLabel}
        mine={mine}
        teamTitle={C.ui.teamTitle}
        team={team}
        ratio="even"
      />
  );
}
