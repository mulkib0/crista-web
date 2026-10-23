/**
 * 3.2 전임상 · 동물실험 — 기능 F32(설계 §5.9 · §7.4 ⑬ ⑭). 시안 21 '둥근 섬' 위에서 StepLayout(걸음 탭 · 내 작업대 · 모둠 공유).
 *
 * 걸음 ① 윤리 배우기(카드 5장 · 확인 문제 3개 · 이수 도장) ② 계획서 심의(칸 쓰기 · 설정 · 규칙 미리 보기 · 심의)
 * ③ 대체 시험(hERG · 간 오가노이드 — 동물 0마리) ④ 동물실험(실행 · 진행 · 결과판 · NOAEL → HED → MRSD 계산 칸)
 * ⑤ 한 번 더 고르기(근거 칩 · 주력 1 + 백업 0~1 · 종료보고서 · 회고).
 * 모둠 공유 자료는 `useLive(GET /api/preclinical)` — 모둠 WS 소식(board.changed · doc.reviewed · job.progress)이 오면 다시 읽는다.
 * 학생에게 보이는 문구는 web-contract `PRECLINICAL_COPY` 한곳(§5.12). 그래프는 SVG 직접.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ANIMAL_COUNT_LEVELS,
  ANIMALS_PER_CANDIDATE,
  IACUC_SECTIONS,
  IND_FORMS,
  PAIN_GRADES,
  PRECLINICAL_API,
  PRECLINICAL_COPY as C,
  PRECLINICAL_FEES,
  PRECLINICAL_LEAD_REASONS,
  PRECLINICAL_LIMITS,
  PRECLINICAL_RULES,
  type AltAssay,
  type AnimalCountLevel,
  type AnimalStudyResult,
  type EthicsAnswers,
  type PainGrade,
  type PreclinicalCalcAnswers,
  type PreclinicalCalcCheck,
  type PreclinicalLeadReason,
  type PreclinicalResponse,
  type PreclinicalRunView,
  type ReviewRequestResponse,
  type SectionSaveResponse,
  DOC_REVIEW_COPY,
} from '@crista-web/web-contract';
import { api, ApiFailure, newRequestId } from '../../api.ts';
import { money } from '../../ink.ts';
import { By } from '../parts.tsx';
import { DocSectionEditor, Panel, ReasonChips, useBenchState, useLive, useLocalTab, type DocSectionStale } from '../ui/index.ts';
import { Next, NotesBlock, StepLayout, useAction, type StepProps } from './common.tsx';
import './s32.css';

const TABS = ['ethics', 'protocol', 'alt', 'animal', 'pick'] as const;
type Tab = (typeof TABS)[number];
const U = C.ui;

const sectionStale = (e: ApiFailure): DocSectionStale | null => {
  const s = e.detail?.section;
  return s ? { body: s.body, byName: s.byName, version: s.version } : { body: '', byName: null, version: 0 };
};

const studyOf = (r: PreclinicalRunView): AnimalStudyResult | null => (r.result?.kind === 'animal_study' ? r.result : null);

export function Step32(props: StepProps) {
  const { board, step } = props;
  const [tab, setTab] = useLocalTab<Tab>('step:3.2', TABS, 'ethics');
  const live = useLive<PreclinicalResponse>(PRECLINICAL_API.state, (m) =>
    m.type === 'board.changed' || (m.type === 'doc.reviewed' && m.kind === 'iacuc') || m.type === 'job.progress',
  );
  const d = live.data;
  const tabs = TABS.map((id) => {
    const meta = C.steps[id];
    let sub: string | undefined;
    let mark: string | undefined;
    if (d) {
      if (id === 'ethics') {
        sub = d.meTrained ? U.tabSub.trained : U.tabSub.notTrained;
        mark = d.meTrained ? '✓' : undefined;
      }
      if (id === 'protocol' && d.protocol) {
        sub = C.status[d.protocol.status];
        mark = d.protocol.approved ? '✓' : undefined;
      }
      if (id === 'alt') sub = U.tabSub.runs(d.runs.filter((r) => r.kind === 'alt_assay').length);
      if (id === 'animal') {
        const n = d.runs.filter((r) => r.kind === 'animal_study' && r.status === 'succeeded').length;
        sub = U.tabSub.runs(n);
        mark = n > 0 ? '✓' : undefined;
      }
      if (id === 'pick') {
        sub = d.lead.leadPatentId ? U.tabSub.chosen : U.tabSub.notChosen;
        mark = d.lead.leadPatentId ? '✓' : undefined;
      }
    }
    return { id, no: meta.no, label: meta.label, ...(sub ? { sub } : {}), ...(mark ? { mark } : {}) };
  });

  const layout = { ...props, tabs, tab, onTab: (id: string) => setTab(id as Tab), ratio: 'even' as const };
  if (!d) {
    return (
      <StepLayout
        {...layout}
        mine={
          live.error ? (
            <div className="s32" role="alert">
              <p className="err">{live.error.message}</p>
              <button className="btn" type="button" onClick={() => live.reload()}>{U.retry}</button>
            </div>
          ) : (
            <p className="hint" role="status">{U.loading}</p>
          )
        }
        team={<NotesBlock board={board} stepId="3.2" />}
      />
    );
  }
  const reload = live.reload;
  const body = { d, reload, myName: board.account.displayName, myId: board.account.userId };
  const views: Record<Tab, { mine: ReactNode; team: ReactNode }> = {
    ethics: { mine: <EthicsMine {...body} />, team: <EthicsTeam {...body} /> },
    protocol: { mine: <ProtocolMine {...body} />, team: <ProtocolTeam {...body} /> },
    alt: { mine: <AltMine {...body} />, team: <AltTeam {...body} /> },
    animal: { mine: <AnimalMine {...body} />, team: <AnimalTeam {...body} /> },
    pick: { mine: <PickMine {...body} />, team: <PickTeam {...body} /> },
  };
  return (
    <StepLayout
      {...layout}
      mineTitle={U.mine[tab]}
      teamTitle={U.team[tab]}
      mine={
        <div className="s32">
          {!d.unlocked && <p className="hint">🔒 {U.locked}</p>}
          {views[tab].mine}
        </div>
      }
      team={
        <div className="s32">
          {views[tab].team}
          {tab === 'pick' && <NotesBlock board={board} stepId="3.2" />}
          {tab === 'pick' && <Next step={step} goStep={props.goStep} label="3.3" />}
        </div>
      }
    />
  );
}

interface BodyProps {
  d: PreclinicalResponse;
  reload: () => void;
  myName: string;
  myId: string;
}

// ── ① 윤리 배우기 ──

function EthicsMine({ d, reload }: BodyProps) {
  const [answers, setAnswers] = useBenchState<EthicsAnswers>('s32:quiz', {});
  const [graded, setGraded] = useState<{ passed: boolean; correct: Record<string, boolean> } | null>(null);
  const act = useAction();
  return (
    <>
      <Panel title={U.cards}>
        <div className="s32-cards">
          {C.ethicsCards.map((card, i) => (
            <details key={card.id} className="s32-card" open={i === 0}>
              <summary>{card.title}</summary>
              <ul>{card.body.map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="mini muted">{U.source} · {card.source}</p>
            </details>
          ))}
        </div>
      </Panel>
      <Panel title={U.quiz} sub={d.meTrained ? ` · ✓ ${U.trained}` : undefined}>
        {C.ethicsQuiz.map((q, qi) => (
          <fieldset key={q.id} className="s32-q">
            <legend className="lab">{qi + 1}. {q.prompt}</legend>
            <div className="s32-opts" role="radiogroup" aria-label={U.quizNo(qi + 1)}>
              {q.options.map((o) => (
                <button key={o.id} type="button" className="opt" role="radio" aria-checked={answers[q.id] === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}>
                  <b>{answers[q.id] === o.id ? '● ' : '○ '}{o.label}</b>
                </button>
              ))}
            </div>
            {graded && (
              <p className={`verdict ${graded.correct[q.id] ? 'ok' : 'block'}`}>
                <b aria-hidden="true">{graded.correct[q.id] ? '✓' : '✕'}</b> <span className="sr">{graded.correct[q.id] ? U.quizRight : U.quizWrong} · </span>{graded.correct[q.id] ? q.explain.ok : q.explain.wrong}
              </p>
            )}
          </fieldset>
        ))}
        {act.error && <p className="err">{act.error}</p>}
        {graded && <p className={graded.passed ? 'ok-msg' : 'err'} role="status">{graded.passed ? C.ethics.passed : C.ethics.wrong}</p>}
        <div className="acts">
          <button className="btn pri" type="button" disabled={act.busy || C.ethicsQuiz.some((q) => !answers[q.id])} onClick={() => void act.run(async () => {
            const r = await api.post<{ passed: boolean; correct: Record<string, boolean> }>(PRECLINICAL_API.ethics, { answers });
            setGraded(r);
            if (r.passed) reload();
          })}>{U.grade}</button>
          <span className="note">{C.ethics.retry}</span>
        </div>
      </Panel>
    </>
  );
}

function EthicsTeam({ d }: BodyProps) {
  return (
    <>
      <Panel title={U.stamps}>
        <ul className="s32-stamps">
          {d.members.map((m) => (
            <li key={m.userId} className={m.trainedAt ? 'on' : ''}>
              <span className="s32-stamp" aria-hidden="true">{m.trainedAt ? '✓' : '·'}</span>
              <By name={m.displayName} avatar={m.avatar} />
              <span className={`sig ${m.trainedAt ? 'g' : ''}`}>{m.trainedAt ? U.trained : U.notTrained}</span>
            </li>
          ))}
        </ul>
        <p className="hint">{C.ethics.whoNeeds}</p>
      </Panel>
      <Panel title={U.think} tone="hi">
        <p className="s32-dilemma">{C.ethics.dilemma}</p>
      </Panel>
    </>
  );
}

// ── ② 계획서 ──

/** 계획서 칸마다 '서버가 채우는 것'의 지금 값(설계 §5.9 ②) — 심의에 같이 붙는 사실과 같은 재료. */
function serverFill(d: PreclinicalResponse, key: string): string | null {
  const p = d.protocol;
  const ids = p?.patentIds ?? [];
  const codes = ids.map((id) => d.patents.find((x) => x.id === id)?.codeName).filter(Boolean).join(' · ');
  switch (key) {
    case 'purpose':
      return U.fills.purpose(codes);
    case 'replacement':
      return U.fills.replacement(
        d.runs
          .filter((r) => r.kind === 'alt_assay' && r.result?.kind === 'alt_assay')
          .map((r) => (r.result?.kind === 'alt_assay' ? `${r.codeName} ${C.assays[r.result.assay].value} ${C.bands[r.result.band]}` : ''))
          .join(' · '),
      );
    case 'reduction': {
      const per = ANIMALS_PER_CANDIDATE[p?.level ?? 'standard'];
      return U.fills.reduction(per, ids.length, per * ids.length);
    }
    case 'refinement':
      return d.model ? U.fills.refinement(d.model.painGrade) : null;
    default:
      return null;
  }
}

function ProtocolMine({ d, reload, myName }: BodyProps) {
  const p = d.protocol;
  return (
    <>
      <Panel title={U.settings}>
        <SettingsForm d={d} reload={reload} />
      </Panel>
      <Panel title={U.sectionsTitle}>
        {IACUC_SECTIONS.map((meta) => {
          const cur = p?.sections.find((s) => s.section === meta.key) ?? null;
          return (
            <DocSectionEditor
              key={meta.key}
              id={`s32-${meta.key}`}
              label={meta.label}
              guide={<>{meta.guide} <span className="muted">· {U.serverFills}: {serverFill(d, meta.key) ?? meta.serverFills}</span></>}
              value={cur ? { body: cur.body, version: cur.version, byName: cur.byName, avatar: cur.avatar } : null}
              save={async (body, expectedVersion) => {
                const r = await api.put<SectionSaveResponse>(PRECLINICAL_API.section(meta.key), { body, expectedVersion });
                return { version: r.version };
              }}
              onSaved={() => reload()}
              staleOf={sectionStale}
              myName={myName}
              maxLength={PRECLINICAL_LIMITS.sectionMax}
              placeholder={meta.example}
              rows={3}
            />
          );
        })}
      </Panel>
    </>
  );
}

function SettingsForm({ d, reload }: Pick<BodyProps, 'd' | 'reload'>) {
  const p = d.protocol;
  const server = useMemo(() => ({
    level: p?.level ?? ('standard' as AnimalCountLevel),
    patentIds: p?.patentIds ?? [],
    painGrade: p?.painGrade ?? null,
    endpointPct: p?.endpointPct ?? null,
    performerIds: p?.performerIds ?? [],
  }), [p?.level, p?.patentIds, p?.painGrade, p?.endpointPct, p?.performerIds]);
  const [form, setForm] = useState(server);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setForm(server);
  }, [server, dirty]);
  const act = useAction();
  const edit = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return (
    <div className="s32-form">
      <fieldset>
        <legend className="lab">{U.candidates}</legend>
        {d.patents.length === 0 && <p className="hint">{C.messages.needPatent}</p>}
        {d.patents.map((pt) => (
          <label key={pt.id} className="chk">
            <input type="checkbox" checked={form.patentIds.includes(pt.id)} onChange={() => edit({ patentIds: toggle(form.patentIds, pt.id) })} />
            <b className="mono">{pt.codeName}</b> <span className="mini muted">{pt.patentNo}</span>
            {pt.inApproved && <span className="tag">{U.approvedSnap}</span>}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="lab">{U.level}</legend>
        <div className="s32-opts three">
          {ANIMAL_COUNT_LEVELS.map((lv) => (
            <button key={lv} type="button" className="opt" aria-pressed={form.level === lv} onClick={() => edit({ level: lv })}>
              <b>{form.level === lv ? '● ' : '○ '}{C.levels[lv].label} · {U.animals(ANIMALS_PER_CANDIDATE[lv])}</b>
              <span className={form.level === lv ? '' : 'muted'}>{C.levels[lv].note}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="s32-grid2">
        <div className="fld">
          <label className="lab" htmlFor="s32-pain">{U.pain}</label>
          <select id="s32-pain" className="txt" value={form.painGrade ?? ''} onChange={(e) => edit({ painGrade: (e.target.value || null) as PainGrade | null })}>
            <option value="">{U.choose}</option>
            {PAIN_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="fld">
          <label className="lab" htmlFor="s32-end">{U.endpoint}</label>
          <input id="s32-end" className="txt" type="number" inputMode="numeric" min={1} max={50} value={form.endpointPct ?? ''}
            onChange={(e) => edit({ endpointPct: e.target.value === '' ? null : Math.round(Number(e.target.value)) })} />
        </div>
      </div>
      <fieldset>
        <legend className="lab">{U.performers}</legend>
        {d.members.map((m) => (
          <label key={m.userId} className="chk">
            <input type="checkbox" disabled={!m.trainedAt && !form.performerIds.includes(m.userId)} checked={form.performerIds.includes(m.userId)}
              onChange={() => edit({ performerIds: toggle(form.performerIds, m.userId) })} />
            {m.displayName} <span className={`sig ${m.trainedAt ? 'g' : ''}`}>{m.trainedAt ? `✓ ${U.trained}` : U.notTrained}</span>
          </label>
        ))}
      </fieldset>
      {act.error && <p className="err">{act.error}</p>}
      <div className="acts">
        <button className="btn" type="button" disabled={!dirty || act.busy} onClick={() => void act.run(async () => {
          try {
            await api.put(PRECLINICAL_API.settings, { expectedVersion: p?.settingsVersion ?? 0, ...form });
            setDirty(false);
          } catch (e) {
            if (e instanceof ApiFailure && e.code === 'stale') setDirty(false);
            throw e;
          } finally {
            reload();
          }
        })}>{U.saveSettings}</button>
        {dirty && <span className="note">{U.unsaved}</span>}
      </div>
    </div>
  );
}

function ProtocolTeam({ d, reload }: BodyProps) {
  const p = d.protocol;
  const act = useAction();
  const model = d.model;
  return (
    <>
      {model && (
        <Panel title={`${U.model} · ${model.gene}`}>
          <dl className="s32-dl">
            <dt>{U.model}</dt><dd>{model.model}</dd>
            <dt>{U.measures}</dt><dd>{model.measures}</dd>
            <dt>{U.modelGrade}</dt><dd><b>{model.painGrade}</b></dd>
            <dt>{U.modelEndpoint}</dt><dd>{model.endpoint}</dd>
          </dl>
          {model.debate && <p className="hint">💬 {model.debate}</p>}
        </Panel>
      )}
      {!p ? <Panel><p className="empty">{U.noProtocol}</p></Panel> : (
        <>
          <Panel title={U.rulesPreview} sub={` · ${C.status[p.status]} · ${U.docVersion(p.version)}`}>
            <ul className="s32-rules">
              {p.ruleFindings.map((f) => (
                <li key={f.id} className={f.status}>
                  <b aria-hidden="true">{f.status === 'ok' ? '✓' : '✕'}</b> {f.note}
                </li>
              ))}
            </ul>
            <p className="hint">{p.status === 'reviewing' ? '▸ ' : ''}{C.statusHint[p.status]}</p>
            {p.changedSinceApproval && <p className="hint">! {C.messages.changed}</p>}
            {act.error && <p className="err">{act.error}</p>}
            <div className="acts">
              <button className="btn pri" type="button" disabled={act.busy || p.status === 'reviewing' || !d.unlocked} onClick={() => void act.run(async () => {
                await api.post<ReviewRequestResponse>(PRECLINICAL_API.review, { expectedVersion: p.version });
                reload();
              })}>{U.requestReview}</button>
            </div>
          </Panel>
          {p.review && (
            <Panel title={U.review} sub={` · ${U.docVersion(p.review.docVersion)}`} tone={p.review.verdict === 'pass' ? 'good' : p.review.verdict === 'pending' ? 'hi' : 'warn'}>
              <p className="s32-verdict">
                <b>{p.review.verdict === 'pass' ? '✓' : p.review.verdict === 'pending' ? '▸' : '!'} {U.verdict[p.review.verdict]}</b>
              </p>
              {p.review.verdict === 'pending' && <p className="hint" role="status">{p.review.stage === 'deliberating' ? DOC_REVIEW_COPY.deliberating(p.review.releaseGameDay) : U.reviewPending}</p>}
              {p.review.stage === 'auto' && <p className="hint">{DOC_REVIEW_COPY.auto}</p>}
              {p.review.items.length > 0 && (
                <ul className="s32-rules">
                  {p.review.items.map((it) => (
                    <li key={it.id} className={it.status === 'ok' ? 'ok' : 'fail'}>
                      <b aria-hidden="true">{it.status === 'ok' ? '✓' : '!'}</b> {IACUC_SECTIONS.find((s) => s.key === it.section)?.label ?? it.section} — {it.note}
                    </li>
                  ))}
                </ul>
              )}
              {p.review.feedback && <p><b>{U.feedback}</b> · {p.review.feedback}</p>}
              {p.review.teacherNote && <p className="hint">{U.teacherNote} · {p.review.teacherNote}</p>}
            </Panel>
          )}
          {p.approved && (
            <Panel title={U.approvedSnap} sub={` · ${U.docVersion(p.approved.version)}`} tone="good">
              <p>
                {C.levels[p.approved.level].label} · {U.perCandidateTimes(ANIMALS_PER_CANDIDATE[p.approved.level], p.approved.patentIds.length)} ={' '}
                <b>{U.animals(ANIMALS_PER_CANDIDATE[p.approved.level] * p.approved.patentIds.length)}</b>
              </p>
              <p className="mono mini">{p.approved.patentIds.map((id) => d.patents.find((x) => x.id === id)?.codeName ?? '—').join(' · ')}</p>
            </Panel>
          )}
        </>
      )}
    </>
  );
}

// ── ③ 대체 시험 ──

function runFor(d: PreclinicalResponse, patentId: string, kind: 'alt_assay' | 'animal_study', assay?: AltAssay) {
  return d.runs.find((r) => r.patentId === patentId && r.kind === kind && r.status !== 'failed' && (kind === 'animal_study' || r.assay === assay)) ?? null;
}

function RunState({ run, gameDay }: { run: PreclinicalRunView; gameDay: number }) {
  if (run.status === 'succeeded') return <span className="sig g">✓ {U.done}</span>;
  return (
    <span className="s32-prog">
      <span className="mini mono">▸ {U.progress(Math.min(gameDay, run.endsGameDay), run.endsGameDay)}</span>
      <span className="progress" role="progressbar" aria-valuenow={run.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={U.progressLabel(run.codeName, run.progressPct)}>
        <i style={{ width: `${run.progressPct}%` }} />
      </span>
    </span>
  );
}

function AltMine({ d, reload }: BodyProps) {
  const act = useAction();
  return (
    <Panel title={C.steps.alt.label} sub={` · ${money(d.fees.altCents)} · ${U.gameDays(PRECLINICAL_FEES.altAssayGameDays)}`}>
      <dl className="s32-assays">
        {(['herg', 'liver'] as const).map((a) => (
          <div key={a}>
            <dt>{C.assays[a].label}</dt>
            <dd>{C.assays[a].desc}</dd>
          </div>
        ))}
      </dl>
      {act.error && <p className="err">{act.error}</p>}
      <ul className="s32-list">
        {d.patents.map((pt) => (
          <li key={pt.id}>
            <b className="mono">{pt.codeName}</b>
            {(['herg', 'liver'] as const).map((assay) => {
              const run = runFor(d, pt.id, 'alt_assay', assay);
              return run ? (
                <span key={assay} className="s32-run"><span className="mini">{C.assays[assay].label}</span> <RunState run={run} gameDay={d.gameDay} /></span>
              ) : (
                <button key={assay} className="btn sm" type="button" disabled={act.busy} onClick={() => void act.run(async () => {
                  await api.post(PRECLINICAL_API.runs, { requestId: newRequestId(), patentId: pt.id, kind: 'alt_assay', assay });
                  reload();
                })}>{C.assays[assay].label} <span className="cost">{money(d.fees.altCents)}</span></button>
              );
            })}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AltTeam({ d }: BodyProps) {
  const done = d.runs.filter((r) => r.kind === 'alt_assay');
  return (
    <>
      <Panel title={C.steps.alt.label} sub={` · ${done.length}`}>
        {done.length === 0 ? <p className="empty">{U.notRun}</p> : (
          <div className="tbl-w"><table>
            <thead><tr><th>{U.cols.candidate}</th><th>{U.cols.assay}</th><th>{U.predicted}</th><th>{U.measured}</th><th>{U.cols.by}</th></tr></thead>
            <tbody>
              {done.map((r) => {
                const pt = d.patents.find((p) => p.id === r.patentId);
                const res = r.result?.kind === 'alt_assay' ? r.result : null;
                const pred = pt?.predicted ? (r.assay === 'herg' ? pt.predicted.herg : pt.predicted.hepatotoxicity) : null;
                return (
                  <tr key={r.jobId}>
                    <td className="mono">{r.codeName}</td>
                    <td className="mini">{r.assay ? C.assays[r.assay].label : ''}</td>
                    <td className="mini">{pred ? C.risk[pred] : '—'}</td>
                    <td>{res ? <span className={`sig ${res.band === 'low' ? 'g' : res.band === 'medium' ? 'w' : 'b'}`}>{C.bands[res.band]} · {res.value}{res.unit}</span> : <RunState run={r} gameDay={d.gameDay} />}</td>
                    <td className="mini">{r.byName ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Panel>
      <Panel title={U.saved} tone="good">
        <p className="s32-big"><b>{U.animals(d.report.totalSaved)}</b></p>
        <ul className="s32-rules">
          {d.report.rows.filter((r) => r.excludedByAlt).map((r) => <li key={r.patentId} className="ok"><b aria-hidden="true">✓</b> {r.codeName} · {U.animals(r.animalsSaved)}</li>)}
        </ul>
      </Panel>
    </>
  );
}

// ── ④ 동물실험 ──

function AnimalMine({ d, reload }: BodyProps) {
  const act = useAction();
  const approved = d.protocol?.approved ?? null;
  const studies = d.runs.filter((r) => r.kind === 'animal_study' && r.status === 'succeeded');
  return (
    <>
      <Panel title={U.runAnimal} sub={` · ${money(d.fees.animalCents)} · ${U.gameDays(PRECLINICAL_FEES.animalStudyGameDays)}`}>
        <details className="s32-bundle">
          <summary>{U.bundleTitle}</summary>
          <ul>{U.bundle.map((line) => <li key={line}>{line}</li>)}</ul>
        </details>
        {!d.meTrained && <p className="hint">🔒 {C.messages.needEthics}</p>}
        {!approved ? <p className="hint">{C.messages.needApproval}</p> : (
          <>
            <p className="hint">{U.approvedOnly} {C.levels[approved.level].label} · {U.animals(ANIMALS_PER_CANDIDATE[approved.level])}</p>
            {act.error && <p className="err">{act.error}</p>}
            <ul className="s32-list">
              {approved.patentIds.map((id) => {
                const pt = d.patents.find((x) => x.id === id);
                const run = runFor(d, id, 'animal_study');
                return (
                  <li key={id}>
                    <b className="mono">{pt?.codeName ?? '—'}</b>
                    {run ? <RunState run={run} gameDay={d.gameDay} /> : (
                      <button className="btn sm pri" type="button" disabled={act.busy || !d.meTrained || !pt} onClick={() => void act.run(async () => {
                        await api.post(PRECLINICAL_API.runs, { requestId: newRequestId(), patentId: id, kind: 'animal_study' });
                        reload();
                      })}>{U.run} <span className="cost">{money(d.fees.animalCents)}</span></button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
      <Panel title={U.calc}>
        <ol className="s32-formula mini">{C.calc.formula.map((line) => <li key={line}>{line}</li>)}</ol>
        {studies.length === 0 ? <p className="empty">{U.noStudy}</p> : <CalcForm d={d} reload={reload} studies={studies} />}
      </Panel>
    </>
  );
}

function CalcForm({ studies, reload }: Pick<BodyProps, 'd' | 'reload'> & { studies: PreclinicalRunView[] }) {
  const [jobId, setJobId] = useBenchState<string>('s32:calcJob', studies[0]!.jobId);
  const run = studies.find((r) => r.jobId === jobId) ?? studies[0]!;
  const res = studyOf(run)!;
  const [vals, setVals] = useBenchState<Record<keyof PreclinicalCalcAnswers, string>>(`s32:calc:${run.jobId}`, { hedRat: '', hedDog: '', hed: '', mrsd: '' });
  const [check, setCheck] = useState<PreclinicalCalcCheck | null>(null);
  const act = useAction();
  const keys = ['hedRat', 'hedDog', 'hed', 'mrsd'] as const;
  return (
    <div className="s32-form">
      <div className="fld">
        <label className="lab" htmlFor="s32-calc-job">{U.calcStudy}</label>
        <select id="s32-calc-job" className="txt" value={run.jobId} onChange={(e) => { setJobId(e.target.value); setCheck(null); }}>
          {studies.map((r) => <option key={r.jobId} value={r.jobId}>{r.codeName}{r.calc?.ok ? ' ✓' : ''}</option>)}
        </select>
      </div>
      <p className="mini">
        NOAEL {C.species.rat} <b className="mono">{res.noaelMgPerKgDay.rat}</b> · {C.species.dog} <b className="mono">{res.noaelMgPerKgDay.dog}</b> {U.noaelUnit} · {U.metrics.sf} <b className="mono">{res.safetyFactor}</b>
      </p>
      <div className="s32-grid2">
        {keys.map((k) => {
          const mark = check ? (check.fields[k] ? '✓' : '✕') : null;
          return (
            <div key={k} className={`fld${check && !check.fields[k] ? ' bad' : ''}`}>
              <label className="lab" htmlFor={`s32-c-${k}`}>{U.calcFields[k]} {mark && <span aria-label={check!.fields[k] ? U.checkMark.ok : U.checkMark.bad}>{mark}</span>}</label>
              <input id={`s32-c-${k}`} className="txt" inputMode="decimal" value={vals[k]} aria-invalid={check ? !check.fields[k] : undefined}
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
            </div>
          );
        })}
      </div>
      {run.calc?.ok && <p className="ok-msg">✓ {C.calc.ok(res.mrsdMgByForm.oral)} {run.calc.byName ? `· ${run.calc.byName}` : ''}</p>}
      {check && !check.ok && <p className="err" role="alert">{C.calc.wrong(res.safetyFactor)}</p>}
      {act.error && <p className="err">{act.error}</p>}
      <div className="acts">
        <button className="btn" type="button" disabled={act.busy} onClick={() => void act.run(async () => {
          const toNum = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
          const r = await api.put<PreclinicalCalcCheck>(PRECLINICAL_API.calc(run.jobId), Object.fromEntries(keys.map((k) => [k, toNum(vals[k])])));
          setCheck(r);
          reload();
        })}>{U.check}</button>
      </div>
    </div>
  );
}

function AnimalTeam({ d }: BodyProps) {
  const animal = d.runs.filter((r) => r.kind === 'animal_study');
  return (
    <>
      <Panel title={C.steps.animal.label} sub={` · ${animal.length}`}>
        {animal.length === 0 ? <p className="empty">{U.notRun}</p> : (
          <ul className="s32-list">
            {animal.map((r) => (
              <li key={r.jobId}>
                <b className="mono">{r.codeName}</b>
                <span className="mini">{r.level ? `${C.levels[r.level].label} ${U.animals(ANIMALS_PER_CANDIDATE[r.level])}` : ''}</span>
                <RunState run={r} gameDay={d.gameDay} />
                <span className="mini muted">{r.byName}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <ResultBoard d={d} />
      <MrsdChart d={d} />
    </>
  );
}

/** 결과판 — 후보 열 × 지표 행. 대체 시험으로 뺀 후보는 흐린 열로 남는다. */
function ResultBoard({ d }: { d: PreclinicalResponse }) {
  const cols = d.patents
    .map((pt) => ({ pt, run: runFor(d, pt.id, 'animal_study'), row: d.report.rows.find((r) => r.patentId === pt.id) }))
    .filter((c) => c.run || c.row?.excludedByAlt);
  if (cols.length === 0) return null;
  const val = (c: (typeof cols)[number], f: (r: AnimalStudyResult) => string, first: boolean) => {
    const r = c.run ? studyOf(c.run) : null;
    return r ? f(r) : c.row?.excludedByAlt ? (first ? U.metrics.excluded : '—') : '…';
  };
  const rows: Array<[string, (r: AnimalStudyResult) => string]> = [
    [U.metrics.f, (r) => `${r.pk.oralBioavailabilityPct}%`],
    ...(d.cns ? [[U.metrics.bp, (r: AnimalStudyResult) => (r.pk.brainPlasmaRatio ?? 0).toFixed(2)] as [string, (r: AnimalStudyResult) => string]] : []),
    [U.metrics.eff, (r) => `${r.efficacyVsReferencePct}%`],
    [U.metrics.noaelRat, (r) => `${r.noaelMgPerKgDay.rat}`],
    [U.metrics.noaelDog, (r) => `${r.noaelMgPerKgDay.dog}`],
    [U.metrics.hed, (r) => `${r.hedMgPerKg} (${C.species[r.sensitiveSpecies]})`],
    ...IND_FORMS.map((f) => [`${U.metrics.mrsd} ${U.forms[f]}`, (r: AnimalStudyResult) => `${r.mrsdMgByForm[f]} mg`] as [string, (r: AnimalStudyResult) => string]),
    [U.metrics.findings, (r) => (r.findings.length ? r.findings.map((x) => C.findings[x]).join(' · ') : U.noFindings)],
    [U.metrics.animals, (r) => `${r.animalsUsed}`],
    [U.metrics.humane, (r) => `${r.humaneEndpoints}`],
  ];
  return (
    <Panel title={U.resultBoard} plain>
      <p className="mini"><b>{U.teamAnimals(d.report.totalAnimals, d.report.totalSaved)}</b></p>
      <div className="tbl-w"><table className="s32-board">
        <thead><tr><th scope="col">{U.cols.metric}</th>{cols.map((c) => <th key={c.pt.id} scope="col" className={c.row?.excludedByAlt ? 'dim' : ''}>{c.pt.codeName}{d.lead.leadPatentId === c.pt.id ? ' ★' : d.lead.backupPatentId === c.pt.id ? ' ☆' : ''}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, f], i) => (
            <tr key={label}><th scope="row">{label}</th>{cols.map((c) => <td key={c.pt.id} className={`num${c.row?.excludedByAlt ? ' dim' : ''}`}>{val(c, f, i === 0)}</td>)}</tr>
          ))}
        </tbody>
      </table></div>
    </Panel>
  );
}

/** 제형별 MRSD 막대 — 3.3 용량 10 · 50 · 100 mg 점선과 겹쳐 '고를 수 있는 용량'을 본다. 값은 글로 같이(색에 기대지 않는다). */
function MrsdChart({ d }: { d: PreclinicalResponse }) {
  const items = d.runs.map((r) => ({ r, s: studyOf(r) })).filter((x): x is { r: PreclinicalRunView; s: AnimalStudyResult } => x.s !== null);
  if (items.length === 0) return null;
  const max = Math.max(110, ...items.flatMap((x) => IND_FORMS.map((f) => x.s.mrsdMgByForm[f])));
  const W = 360;
  const L = 70;
  const barH = 12;
  // 코드명은 막대 위 한 줄(제형 글자와 겹치지 않게) — 그룹 = 코드명 줄 16 + 막대 3개 + 틈.
  const groupH = 16 + IND_FORMS.length * (barH + 4) + 12;
  const H = items.length * groupH + 24;
  const sx = (v: number) => L + (Math.min(v, max) / max) * (W - L - 44);
  const summary = items.map((x) => `${x.r.codeName} ${IND_FORMS.map((f) => `${U.forms[f]} ${x.s.mrsdMgByForm[f]}mg`).join(', ')}`).join('; ');
  return (
    <Panel title={U.mrsdChart} plain>
      <svg className="s32-mrsd" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${U.mrsdChart} — ${summary}`}>
        {[10, 50, 100].map((dose) => (
          <g key={dose} className="dose">
            <line x1={sx(dose)} x2={sx(dose)} y1={14} y2={H - 4} />
            <text x={sx(dose)} y={10} textAnchor="middle">{dose}</text>
          </g>
        ))}
        {items.map((x, gi) => {
          const y0 = 18 + gi * groupH;
          return (
            <g key={x.r.jobId}>
              <text x={0} y={y0 + 11} className="code">{x.r.codeName}</text>
              {IND_FORMS.map((f, fi) => {
                const y = y0 + 16 + fi * (barH + 4);
                const v = x.s.mrsdMgByForm[f];
                return (
                  <g key={f} className={`bar ${f}`}>
                    <text x={L - 6} y={y + barH - 2} textAnchor="end" className="lbl">{U.forms[f]}</text>
                    <rect x={L} y={y} width={Math.max(2, sx(v) - L)} height={barH} rx={4}><title>{`${x.r.codeName} ${U.forms[f]} MRSD ${v} mg`}</title></rect>
                    <text x={sx(v) + 4} y={y + barH - 2} className="val">{v}{v > max ? '+' : ''}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <p className="mini muted">{U.chartNote}</p>
    </Panel>
  );
}

// ── ⑤ 한 번 더 고르기 ──

function PickMine({ d, reload }: BodyProps) {
  const studies = d.runs.filter((r) => r.kind === 'animal_study' && r.status === 'succeeded' && d.patents.some((p) => p.id === r.patentId));
  const [lead, setLead] = useState<string>(d.lead.leadPatentId ?? '');
  const [backup, setBackup] = useState<string>(d.lead.backupPatentId ?? '');
  const [reason, setReason] = useState<string | null>(d.lead.reason);
  useEffect(() => {
    setLead(d.lead.leadPatentId ?? '');
    setBackup(d.lead.backupPatentId ?? '');
  }, [d.lead.leadPatentId, d.lead.backupPatentId]);
  const act = useAction();
  const leadStudy = studies.find((r) => r.patentId === lead);
  const all = studies.map(studyOf).filter((x): x is AnimalStudyResult => x !== null);
  const verdict = leadStudy && reason ? PRECLINICAL_RULES.leadReasonVerdict(reason, studyOf(leadStudy)!, all, d.cns) : null;
  const chips = PRECLINICAL_LEAD_REASONS.filter((r) => r !== 'brain_reach' || d.cns).map((id) => ({ id, label: C.chips.labels[id] }));
  return (
    <>
      <ResultBoard d={d} />
      <Panel title={U.setLead}>
        {studies.length === 0 ? <p className="empty">{U.noStudy}</p> : (
          <>
            <p className="hint">{U.leadRule}</p>
            <div className="s32-grid2">
              <div className="fld">
                <label className="lab" htmlFor="s32-lead">{U.lead}</label>
                <select id="s32-lead" className="txt" value={lead} onChange={(e) => { setLead(e.target.value); if (e.target.value === backup) setBackup(''); }}>
                  <option value="">{U.choose}</option>
                  {studies.map((r) => <option key={r.patentId} value={r.patentId}>{r.codeName}</option>)}
                </select>
              </div>
              <div className="fld">
                <label className="lab" htmlFor="s32-backup">{U.backup}</label>
                <select id="s32-backup" className="txt" value={backup} onChange={(e) => setBackup(e.target.value)}>
                  <option value="">{U.none}</option>
                  {studies.filter((r) => r.patentId !== lead).map((r) => <option key={r.patentId} value={r.patentId}>{r.codeName}</option>)}
                </select>
              </div>
            </div>
            {act.error && <p className="err">{act.error}</p>}
            <ReasonChips
              legend={U.reasonLegend}
              chips={chips}
              value={reason}
              onChange={(v) => setReason(typeof v === 'string' ? v : null)}
              verdict={verdict}
              confirm={{
                label: U.setLead,
                busy: act.busy,
                disabled: !lead,
                tone: 'film',
                onClick: () => void act.run(async () => {
                  await api.put(PRECLINICAL_API.lead, { leadPatentId: lead, backupPatentId: backup || null, reason: reason as PreclinicalLeadReason, expectedVersion: d.lead.version });
                  reload();
                }),
              }}
            />
          </>
        )}
      </Panel>
    </>
  );
}

function PickTeam({ d, reload, myName }: BodyProps) {
  const name = (id: string | null) => (id ? (d.patents.find((p) => p.id === id)?.codeName ?? '—') : '—');
  const r = d.report;
  return (
    <>
      <Panel title={U.current} sub={d.lead.setByName ? ` · ${d.lead.setByName}` : ''} tone={d.lead.leadPatentId ? 'good' : undefined}>
        <div className="s32-lead">
          <div className="kv"><span>{U.lead} ★</span><b>{name(d.lead.leadPatentId)}</b></div>
          <div className="kv"><span>{U.backup} ☆</span><b>{name(d.lead.backupPatentId)}</b></div>
          {d.lead.reason && <span className="chip">✓ {C.chips.labels[d.lead.reason]}</span>}
        </div>
      </Panel>
      <Panel title={U.report}>
        <p><b>{U.reportTotal(r.totalAnimals, r.totalHumane, r.totalSaved)}</b></p>
        <p className="hint">{U.reportNote}</p>
        <div className="tbl-w"><table>
          <thead><tr><th>{U.cols.candidate}</th><th className="num">{U.metrics.animals}</th><th>{U.cols.pain}</th><th className="num">{U.metrics.humane}</th><th className="num">{U.cols.saved}</th></tr></thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.patentId} className={row.excludedByAlt ? 'dim' : ''}>
                <td className="mono">{row.codeName}</td>
                <td className="num">{row.animalsUsed}</td>
                <td>{row.painGrade ?? '—'}</td>
                <td className="num">{row.humaneEndpoints}</td>
                <td className="num">{row.animalsSaved || ''}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <DocSectionEditor
          id="s32-reflection"
          label={U.reflection}
          guide={U.reflectionGuide}
          value={r.reflection.version ? { body: r.reflection.body, version: r.reflection.version, byName: r.reflection.byName } : null}
          save={async (body, expectedVersion) => api.put<{ version: number }>(PRECLINICAL_API.reflection, { body, expectedVersion })}
          staleOf={sectionStale}
          onSaved={() => reload()}
          myName={myName}
          maxLength={PRECLINICAL_LIMITS.reflectionMax}
          rows={2}
        />
      </Panel>
    </>
  );
}
