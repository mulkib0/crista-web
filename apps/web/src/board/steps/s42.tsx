/**
 * 4.2 최종 허가(F42 — 2026-10-24 사용자 지시 · 시안 design/step-viz/viz-8.js 8.01 · 8.06 · 8.08).
 * 걸음: ① 브랜드 이름 ② 포장 꾸미기 ③ 허가 신청서 ④ 심사 · 접수 ⑤ 허가증 · 신약 포장 · 연구비 영수증.
 * 왼쪽 섬 = 내 작업대(입력 초안 · 미리보기 — 이 브라우저에만), 오른쪽 섬 = 모둠 공유(서버 저장 · 실시간 — useLive).
 * 허가가 나면 ⑤ 가 두 열을 다 쓰고, 파이프라인 완주 연출(모션 줄이기면 멈춘 그림)을 띄운다.
 * 학생 문구는 규격 `APPROVAL_COPY` 에서만 가져온다(§5.12).
 * 마지막 단계라 바닥 띠는 남은 일(품목 허가 — 아직 안 끝난 첫 걸음을 가리킨다) · 허가 심사 기다림 · 완주만 보여 준다(2026-10-25 합의안).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  APPROVAL_API,
  APPROVAL_COPY,
  checkBrandName,
  formatCrista,
  NDA_SECTION_MAX,
  NDA_SECTIONS,
  PACK_COLORS,
  PACK_LAYOUTS,
  PACK_SHAPE_FORM,
  PACK_SHAPES,
  packFits,
  STEP_IDS,
  type ApprovalResponse,
  type ApprovalSaveResponse,
  type CertificateView,
  type DocSectionView,
  type EvidenceRow,
  type PackColor,
  type PackLayout,
  type PackShape,
  type ReceiptLine,
  type ReceiptView,
  type RuleFinding,
  DOC_REVIEW_COPY,
} from '@crista-web/web-contract';
import { api, ApiFailure, message } from '../../api.ts';
import { Confirm, DocSectionEditor, Panel, useBenchState, useLive, useLocalTab, type DocSectionStale } from '../ui/index.ts';
import { StepLayout, useAction, type StepProps } from './common.tsx';
import {
  certExportSvg,
  downloadPng,
  FORM_SHORT,
  GROUP_FILL,
  PACK_FILL,
  packBoxSvg,
  packExportSvg,
  packInsideSvg,
  printOnly,
  receiptExportSvg,
  stampSvg,
  type PackArt,
} from './s42-art.ts';
import './s42.css';

const TABS = ['brand', 'pack', 'nda', 'submit', 'result'] as const;
type Tab = (typeof TABS)[number];
const K = APPROVAL_COPY;

export function Step42(props: StepProps) {
  const { board, step } = props;
  const [tab, setTab] = useLocalTab<Tab>('step:4.2', TABS, 'brand');
  const live = useLive<ApprovalResponse>(
    APPROVAL_API.get,
    (m) => m.type === 'board.changed' || (m.type === 'doc.reviewed' && m.kind === 'nda') || (m.type === 'board.event' && m.event.kind === 'approval' && m.event.teamId === board.team.id),
  );
  const data = live.data;
  const app = data?.application ?? null;
  const approved = app?.status === 'approved';

  // 허가가 난 순간 한 번 — ⑤ 로 옮겨 완주 연출을 보여 준다.
  const seenApproved = useRef<boolean | null>(null);
  useEffect(() => {
    if (!data) return;
    // 처음 읽을 때 이미 허가였거나(완주 화면부터), 보는 사이 허가가 났으면 ⑤ 로.
    if (seenApproved.current !== true && approved) setTab('result');
    seenApproved.current = approved;
  }, [data, approved, setTab]);

  if (!data) {
    return (
      <StepLayout
        board={board}
        step={step}
        mine={
          <p className="hint" role={live.error ? 'alert' : 'status'}>
            {live.error ? message(live.error) : K.ui.loading}{' '}
            {live.error && <button type="button" className="btn sm" onClick={live.reload}>{K.ui.retry}</button>}
          </p>
        }
      />
    );
  }

  const status = app?.status ?? 'draft';
  const tabs = [
    { id: 'brand', no: '①', label: K.tabs.brand, mark: app?.brand ? '✓' : undefined, sub: app?.brand?.name },
    { id: 'pack', no: '②', label: K.tabs.pack, mark: app?.pack ? (packFits(app.pack.shape, app.form) ? '✓' : '✕') : undefined },
    { id: 'nda', no: '③', label: K.tabs.nda, mark: data.sections.length === NDA_SECTIONS.length ? '✓' : undefined },
    { id: 'submit', no: '④', label: K.tabs.submit, sub: K.status[status], mark: status === 'submitted' || approved ? '✓' : undefined },
    { id: 'result', no: '⑤', label: K.tabs.result, mark: approved ? '✓' : undefined },
  ];
  const common = { ...props, data, reload: live.reload };
  // 띠 '하러 가기' — 품목 허가는 아직 안 끝난 첫 걸음(브랜드 → 포장 → 신청서 → 심사 · 접수)으로.
  const go = { approval: { tab: tabs.find((t) => t.id !== 'result' && t.mark !== '✓')?.id ?? 'submit' } };
  const body =
    tab === 'brand' ? <BrandTab {...common} /> : tab === 'pack' ? <PackTab {...common} /> : tab === 'nda' ? <NdaTab {...common} /> : tab === 'submit' ? <SubmitTab {...common} /> : null;

  if (tab === 'result') {
    return (
      <StepLayout
        board={board}
        step={step}
        tabs={tabs}
        tab={tab}
        onTab={(id) => setTab(id as Tab)}
        go={go}
        notes={false}
        mine={<ResultTab {...common} />}
      />
    );
  }
  return (
    <StepLayout
      board={board}
      step={step}
      tabs={tabs}
      tab={tab}
      onTab={(id) => setTab(id as Tab)}
      ratio="even"
      go={go}
      mine={
        <>
          {!data.phase3 && <p className="hint">🔒 {data.lockedReason}</p>}
          {body}
        </>
      }
      team={<TeamStatus data={data} />}
    />
  );
}

interface TabProps extends StepProps {
  data: ApprovalResponse;
  reload: () => void;
}

const lockedNow = (d: ApprovalResponse) => d.application?.status === 'submitted' || d.application?.status === 'approved';

// ── ① 브랜드 ──

/**
 * 내 초안은 '고치기 시작한 순간의 판(base)'과 함께 둔다 — 저장은 그 판으로 보내야 낙관적 잠금이 산다(§7.4 늦은 쪽 409).
 * 화면이 실시간으로 다시 읽은 지금 판을 보내면, 그 사이 모둠원이 저장한 이름을 모르고 덮어쓴다.
 */
function BrandTab({ board, data, reload }: TabProps) {
  const app = data.application;
  const saved = app?.brand?.name ?? null;
  const current = app?.brandVersion ?? 0;
  const [draft, setDraft] = useBenchState<{ name: string; base: number } | null>('s42:brand:v2', null);
  const value = draft?.name ?? saved ?? '';
  const act = useAction();
  const [note, setNote] = useState<string | null>(null);
  const verdict = checkBrandName(value, { startupName: data.startupName });
  const locked = lockedNow(data);
  const overtaken = draft !== null && draft.base !== current && saved !== null && draft.name.trim() !== saved;
  const save = () =>
    act.run(async () => {
      setNote(null);
      try {
        const res = await api.put<ApprovalSaveResponse>(APPROVAL_API.brand, { name: value, expectedVersion: draft?.base ?? current });
        setDraft(null);
        setNote(res.warning ? `${K.brand.saved} — ${res.warning}` : K.brand.saved);
      } catch (e) {
        if (e instanceof ApiFailure && e.code === 'stale') {
          // 늦은 쪽 — 지금 이름을 보여 주고 초안을 지금 판으로 옮긴다(확인한 뒤 다시 누르면 그때 바꾼다).
          const fresh = await api.get<ApprovalResponse>(APPROVAL_API.get).catch(() => null);
          const now = fresh?.application ?? null;
          if (now) setDraft({ name: value, base: now.brandVersion });
          throw new Error(K.ui.brandStaleAfter(now?.brand?.name ?? '—'));
        }
        throw e;
      } finally {
        reload();
      }
    });
  return (
    <>
      <Panel title={K.brand.title}>
        <p className="mini" style={{ marginTop: 0 }}>{K.brand.lead}</p>
        <label className="lab" htmlFor="s42-brand">{K.ui.brandLabel}</label>
        <input
          id="s42-brand"
          className="txt s42-brand-in"
          value={value}
          maxLength={16}
          placeholder={K.brand.placeholder}
          autoComplete="off"
          disabled={locked}
          aria-describedby="s42-brand-v"
          onChange={(e) => {
            const name = e.target.value;
            setDraft((d) => ({ name, base: d?.base ?? current }));
          }}
        />
        <p id="s42-brand-v" className={`verdict ${verdict.status}`} role={verdict.status === 'block' ? 'alert' : 'status'} style={{ marginTop: 8 }}>
          <b aria-hidden="true">{verdict.status === 'ok' ? '✓' : verdict.status === 'warn' ? '!' : '✕'}</b>{' '}
          {verdict.status === 'ok' ? K.ui.brandOk : verdict.message}
        </p>
        {overtaken && (
          <p className="hint" role="status">
            ! {K.ui.brandChanged(saved ?? '', app?.brand?.byName ?? '—')}{' '}
            <button type="button" className="btn sm" onClick={() => setDraft(null)}>{K.ui.useSaved}</button>
          </p>
        )}
        <div className="acts" style={{ marginTop: 10 }}>
          <button type="button" className="btn pri" disabled={locked || act.busy || verdict.status === 'block' || value.trim() === saved} onClick={save}>
            {K.brand.save}
          </button>
          {note && <span className="note">{note}</span>}
        </div>
        {act.error && <p className="hint bad">✕ {act.error}</p>}
      </Panel>
      <Panel title={K.ui.brandTipsTitle}>
        <ul className="s42-tips">{K.brand.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="mini muted" style={{ margin: 0 }}>{K.ui.companyNow(board.team.startupName ?? '—')}</p>
      </Panel>
    </>
  );
}

// ── ② 포장 ──

function artOf(data: ApprovalResponse, pick: { shape: PackShape; color: PackColor; layout: PackLayout }, brand: string): PackArt {
  const code = data.phase3?.codeName ?? data.summary.find((r) => r.key === 'code')?.value ?? null;
  return {
    brand,
    codeName: code,
    doseMg: data.application?.doseMg ?? data.phase3?.doseMg ?? null,
    form: data.application?.form ?? data.phase3?.form ?? null,
    company: data.startupName,
    ...pick,
    approvedDay: data.certificate?.approvedGameDay ?? null,
  };
}

function Choice<T extends string>({ label, items, value, onChange, names, swatch, disabled }: {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  names: Record<T, string>;
  swatch?: Record<T, string>;
  disabled?: boolean;
}) {
  return (
    <div className="s42-choice" role="group" aria-label={label}>
      <span className="lab">{label}</span>
      <div className="chips">
        {items.map((it) => (
          <button key={it} type="button" className="rchip" aria-pressed={it === value} disabled={disabled} onClick={() => onChange(it)}>
            {swatch && <i className="s42-sw" style={{ background: swatch[it] }} aria-hidden="true" />}
            {it === value && <span aria-hidden="true">✓ </span>}
            {names[it]}
          </button>
        ))}
      </div>
    </div>
  );
}

type Pick = { shape: PackShape; color: PackColor; layout: PackLayout };

function PackTab({ data, reload }: TabProps) {
  const app = data.application;
  const savedPick: Pick | null = app?.pack ? { shape: app.pack.shape, color: app.pack.color, layout: app.pack.layout } : null;
  const current = app?.packVersion ?? 0;
  const startPick: Pick = savedPick ?? { shape: app?.form === 'iv' ? 'vial' : app?.form === 'transdermal' ? 'patch' : 'tablet', color: 'ivory', layout: 'top' };
  // 브랜드와 같은 꼴 — 고치기 시작한 판(base)으로 저장해야 모둠원이 먼저 저장한 포장을 모르고 덮어쓰지 않는다.
  const [draft, setDraft] = useBenchState<{ pick: Pick; base: number } | null>('s42:pack:v2', null);
  const pick = draft?.pick ?? startPick;
  const setPick = (fn: (p: Pick) => Pick) => setDraft((d) => ({ pick: fn(d?.pick ?? startPick), base: d?.base ?? current }));
  const act = useAction();
  const locked = lockedNow(data);
  const art = artOf(data, pick, app?.brand?.name ?? '');
  const fits = packFits(pick.shape, art.form);
  const same = !!savedPick && savedPick.shape === pick.shape && savedPick.color === pick.color && savedPick.layout === pick.layout;
  const overtaken = draft !== null && draft.base !== current && !same;
  const save = () =>
    act.run(async () => {
      try {
        await api.put<ApprovalSaveResponse>(APPROVAL_API.pack, { ...pick, expectedVersion: draft?.base ?? current });
        setDraft(null);
      } catch (e) {
        if (e instanceof ApiFailure && e.code === 'stale') {
          // 늦은 쪽 — 내 고르기를 버리고 모둠원이 저장한 포장을 보인다(K.pack.stale 문구와 같은 동작).
          setDraft(null);
          throw new Error(K.pack.stale);
        }
        throw e;
      } finally {
        reload();
      }
    });
  return (
    <>
      <Panel title={K.pack.title}>
        <p className="mini" style={{ marginTop: 0 }}>{K.pack.lead}</p>
        <div className="s42-ctl">
          <Choice label={K.ui.packShape} items={PACK_SHAPES} value={pick.shape} names={K.pack.shape} disabled={locked} onChange={(shape) => setPick((p) => ({ ...p, shape }))} />
          <Choice label={K.ui.packColor} items={PACK_COLORS} value={pick.color} names={K.pack.color} swatch={PACK_FILL} disabled={locked} onChange={(color) => setPick((p) => ({ ...p, color }))} />
          <Choice label={K.ui.packLayout} items={PACK_LAYOUTS} value={pick.layout} names={K.pack.layout} disabled={locked} onChange={(layout) => setPick((p) => ({ ...p, layout }))} />
        </div>
        <p className="mini muted">{K.pack.shapeDesc[pick.shape]}</p>
        {app?.formProvisional && art.form && <p className="hint">{K.pack.provisional(FORM_SHORT[art.form])}</p>}
        {overtaken && (
          <p className="hint" role="status">
            ! {K.ui.packChanged(app?.pack?.byName ?? '—')}{' '}
            <button type="button" className="btn sm" onClick={() => setDraft(null)}>{K.ui.useSavedPack}</button>
          </p>
        )}
      </Panel>
      <div className="s42-pack" aria-live="polite">
        <div className="s42-art" dangerouslySetInnerHTML={{ __html: packBoxSvg(art) }} />
        <div className="s42-art" dangerouslySetInnerHTML={{ __html: packInsideSvg(art) }} />
      </div>
      <div className="acts">
        <button type="button" className="btn pri" disabled={locked || act.busy || same} onClick={save}>{K.pack.save}</button>
        {!fits && art.form && <span className="note">{K.ui.packCantSubmit}</span>}
      </div>
      {!art.form ? (
        <p className="mini muted">{K.pack.noFormHelp}</p>
      ) : !fits ? (
        <p className="mini">{K.pack.misfitHelp(K.pack.shape[pick.shape], FORM_SHORT[PACK_SHAPE_FORM[pick.shape]], FORM_SHORT[art.form])}</p>
      ) : null}
      {act.error && <p className="hint bad">✕ {act.error}</p>}
    </>
  );
}

// ── ③ 신청서 ──

const staleOfSection = (e: ApiFailure): DocSectionStale | null => {
  const s = e.detail?.section as DocSectionView | undefined;
  return s ? { body: s.body, byName: s.byName, version: s.version } : { body: '', byName: null, version: 0 };
};

function NdaTab({ board, data, reload }: TabProps) {
  const locked = lockedNow(data);
  return (
    <>
      <Panel title={K.nda.title}>
        <p className="mini" style={{ margin: 0 }}>{K.nda.lead}</p>
      </Panel>
      {NDA_SECTIONS.map((s) => {
        const cur = data.sections.find((x) => x.section === s) ?? null;
        return (
          <DocSectionEditor
            key={s}
            id={`s42-${s}`}
            label={K.nda.sectionLabel[s]}
            guide={
              <>
                {K.nda.sectionGuide[s]}
                <br />
                {K.nda.sectionGood[s]}
                <br />
                {K.nda.sectionBad[s]}
              </>
            }
            value={cur ? { body: cur.body, version: cur.version, byName: cur.byName, avatar: cur.avatar } : null}
            save={async (body, expectedVersion) => {
              const r = await api.put<{ version: number }>(APPROVAL_API.section(s), { body, expectedVersion });
              reload();
              return r;
            }}
            staleOf={staleOfSection}
            myName={board.account.displayName}
            maxLength={NDA_SECTION_MAX}
            rows={2}
            readOnly={locked}
          />
        );
      })}
    </>
  );
}

// ── ④ 심사 · 접수 ──

function RuleList({ findings }: { findings: RuleFinding[] }) {
  return (
    <ul className="s42-rules">
      {findings.map((f) => (
        <li key={f.id} className={f.status}>
          <b aria-hidden="true">{f.status === 'ok' ? '✓' : '✕'}</b> <span className="sr">{f.status === 'ok' ? K.ui.srOk : K.ui.srFix}</span>{f.note}
        </li>
      ))}
    </ul>
  );
}

function SubmitTab({ data, reload }: TabProps) {
  const app = data.application;
  const review = data.review;
  const act = useAction();
  const [ask, setAsk] = useState(false);
  const status = app?.status ?? 'draft';
  const stale = review && app && review.docVersion !== app.version;
  const canReview = !!data.phase3 && !!app && (status === 'draft' || status === 'revise');
  const doReview = () => act.run(async () => {
    try {
      await api.post(APPROVAL_API.review, {});
    } finally {
      reload();
    }
  });
  const doSubmit = () =>
    act.run(async () => {
      try {
        await api.post(APPROVAL_API.submit, {});
        setAsk(false);
      } finally {
        reload();
      }
    });
  return (
    <>
      <Panel title={K.submit.title} sub={K.status[status]}>
        <p className="mini" style={{ marginTop: 0 }}>{K.submit.costDuration(formatCrista(data.feeCrista), data.reviewGameDays)}</p>
        <div className="acts">
          <button type="button" className="btn pri" disabled={!canReview || act.busy} onClick={doReview}>{K.submit.reviewBtn}</button>
          <button type="button" className="btn film" disabled={status !== 'passed' || act.busy} onClick={() => setAsk(true)}>
            {K.submit.submitBtn} <span className="cost">{formatCrista(data.feeCrista)}</span>
          </button>
        </div>
        {status !== 'passed' && status !== 'submitted' && status !== 'approved' && <p className="hint">{K.submit.needPass}</p>}
        {status === 'submitted' && app?.decideGameDay != null && <p className="hint good">✓ {K.submit.submitted(Math.ceil(app.decideGameDay), data.reviewGameDays)}</p>}
        {act.error && <p className="hint bad">✕ {act.error}</p>}
      </Panel>
      {review && (
        <Panel title={K.ui.reviewTitle} sub={review.stage === 'queued' || review.stage === 'retrying' ? K.ui.reviewRunning : undefined} tone={review.verdict === 'pass' ? 'good' : review.verdict === 'pending' ? undefined : 'bad'}>
          <p className="mini" style={{ marginTop: 0 }}>
            <b>{K.ui.verdict[review.verdict] ?? review.verdict}</b>
            {stale && <span className="muted">{K.ui.reviewStale(review.docVersion, app!.version)}</span>}
          </p>
          {(review.stage === 'queued' || review.stage === 'retrying') && <p className="mini muted">{K.submit.aiQueued}</p>}
          {review.stage === 'deliberating' && <p className="mini muted">{DOC_REVIEW_COPY.deliberating(review.releaseGameDay)}</p>}
          {review.stage === 'auto' && <p className="mini muted">{DOC_REVIEW_COPY.auto}</p>}
          <span className="lab">{K.submit.rulesTitle}</span>
          <RuleList findings={review.ruleFindings} />
          {review.stage === 'rules' && review.verdict !== 'pass' && review.ruleFindings.some((x) => x.status === 'fail') && <p className="mini">{K.submit.rulesBlocked}</p>}
          {review.items.length > 0 && (
            <ul className="s42-rules">
              {review.items.map((it) => (
                <li key={it.id} className={it.status === 'ok' ? 'ok' : 'fail'}>
                  <b aria-hidden="true">{it.status === 'ok' ? '✓' : '!'}</b> <span className="sr">{K.ui.itemStatus[it.status] ?? it.status}</span>{it.section ? `[${it.section === 'brand' ? K.ui.brandSection : K.nda.sectionLabel[it.section as 'indication'] ?? it.section}] ` : ''}{it.note}
                </li>
              ))}
            </ul>
          )}
          {review.feedback && (
            <>
              <span className="lab">{K.submit.feedbackTitle}</span>
              <p className="mini" style={{ marginTop: 0 }}>{review.feedback}</p>
            </>
          )}
          {review.teacherNote && <p className="mini">{K.ui.teacher(review.teacherNote)}</p>}
        </Panel>
      )}
      <Confirm
        open={ask}
        title={K.submit.confirmTitle}
        confirmLabel={`${K.submit.submitBtn} · ${formatCrista(data.feeCrista)}`}
        tone="pri"
        busy={act.busy}
        onConfirm={doSubmit}
        onCancel={() => setAsk(false)}
      >
        <p>{K.submit.confirmBody(formatCrista(data.feeCrista), data.reviewGameDays)}</p>
      </Confirm>
    </>
  );
}

// ── 모둠 공유 섬 ──

function Evidence({ rows, caption }: { rows: EvidenceRow[]; caption: string }) {
  return (
    <dl className="s42-dl" aria-label={caption}>
      {rows.map((r) => (
        <div key={r.key} className="s42-dl-r">
          <dt>{r.label}</dt>
          <dd className={r.mono ? 'mono' : undefined}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TeamStatus({ data }: { data: ApprovalResponse }) {
  const app = data.application;
  const status = app?.status ?? 'draft';
  const order = ['draft', 'reviewing', 'passed', 'submitted', 'approved'] as const;
  const at = status === 'revise' ? 1 : order.indexOf(status as (typeof order)[number]);
  const progress =
    status === 'submitted' && app?.submittedGameDay != null && app.decideGameDay != null
      ? Math.round(Math.max(0, Math.min(1, (data.gameDay - app.submittedGameDay) / (app.decideGameDay - app.submittedGameDay))) * 100)
      : null;
  const art = app?.pack ? artOf(data, app.pack, app.brand?.name ?? '') : null;
  return (
    <>
      <Panel title={K.ui.teamTitle} sub={K.status[status]}>
        <ol className="s42-flow" aria-label={K.ui.flowLabel}>
          {order.map((s, i) => (
            <li key={s} data-on={i <= at ? '' : undefined} aria-current={i === at ? 'step' : undefined}>
              <span aria-hidden="true">{i < at || status === 'approved' ? '✓' : i === at ? '▸' : '·'}</span> {K.status[s].split(' — ')[0]}
            </li>
          ))}
        </ol>
        {progress !== null && (
          <div className="s42-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={K.ui.progressLabel}>
            <i style={{ width: `${progress}%` }} />
            <span className="mono">{K.ui.progress(progress, Math.ceil(app!.decideGameDay!))}</span>
          </div>
        )}
        <dl className="s42-kv">
          <dt>{K.ui.kv.brand}</dt>
          <dd>{app?.brand ? `${app.brand.name} · ${app.brand.byName ?? '—'}` : '—'}</dd>
          <dt>{K.ui.kv.protocol}</dt>
          <dd>{app?.form ? `${FORM_SHORT[app.form]} · ${app.doseMg ?? '—'} mg${app.formProvisional ? K.ui.provisionalTag : ''}` : data.phase3 ? `${FORM_SHORT[data.phase3.form]} · ${data.phase3.doseMg} mg` : '—'}</dd>
          <dt>{K.ui.kv.pack}</dt>
          <dd>{app?.pack ? `${K.pack.shape[app.pack.shape]} · ${K.pack.color[app.pack.color]} · ${K.pack.layout[app.pack.layout]} · ${app.pack.byName ?? '—'}` : '—'}</dd>
          {app?.submittedByName && (
            <>
              <dt>{K.ui.kv.submitted}</dt>
              <dd>{app.submittedByName} · D+{Math.floor(app.submittedGameDay ?? 0)}</dd>
            </>
          )}
        </dl>
        {art && <div className="s42-art sm" dangerouslySetInnerHTML={{ __html: packBoxSvg(art) }} />}
      </Panel>
      <Panel title={K.nda.summaryTitle} sub={K.ui.serverAuto}>
        <Evidence rows={data.summary} caption={K.nda.summaryTitle} />
      </Panel>
    </>
  );
}

// ── ⑤ 결과 ──

function Complete({ brand }: { brand: string }) {
  return (
    <div className="s42-done" role="status">
      <ol className="s42-chain" aria-label={K.ui.chainLabel}>
        {STEP_IDS.map((id, i) => (
          <li key={id} style={{ ['--i' as string]: i }}>
            <b>✓</b> {id}
          </li>
        ))}
      </ol>
      <p className="s42-done-h">{K.result.complete}</p>
      <p className="mini" style={{ margin: 0 }}>{K.result.completeLead(brand)}</p>
    </div>
  );
}

function DocActions({ onPrint, onPng, busy }: { onPrint: () => void; onPng: () => void; busy?: boolean }) {
  return (
    <div className="acts s42-doc-acts">
      <button type="button" className="btn sm" onClick={onPrint}>🖨 {K.result.print}</button>
      <button type="button" className="btn sm" disabled={busy} onClick={onPng}>⤓ {K.result.savePng}</button>
    </div>
  );
}

function Certificate({ cert }: { cert: CertificateView }) {
  return (
    <div className="s42-cert">
      <div className="s42-cert-top">
        <span>{K.result.certTop}</span>
        <span>{K.ui.certNo(cert.certificateNo)}</span>
      </div>
      <div className="s42-cert-h">
        <div>
          <span className="s42-kind">{K.result.certKind}</span>
          <h3>{cert.brand}</h3>
          <p>{cert.codeName} · {FORM_SHORT[cert.form]} · {cert.doseMg} mg</p>
        </div>
        <div className="s42-stamp" role="img" aria-label={K.ui.stampLabel(cert.approvedGameDay)} dangerouslySetInnerHTML={{ __html: stampSvg(cert.approvedGameDay) }} />
      </div>
      <Evidence rows={cert.rows} caption={K.result.certTitle} />
      <div className="s42-cert-f">
        <span>{cert.company} ({cert.ticker})</span>
        <span>{K.ui.approvedOn} <b className="mono">D+{cert.approvedGameDay}</b></span>
      </div>
    </div>
  );
}

const dayText = (l: ReceiptLine) => (l.dayFrom === null ? '' : l.dayTo !== null && l.dayTo !== l.dayFrom ? `D+${l.dayFrom}~${l.dayTo}` : `D+${l.dayFrom}`);

function Receipt({ r, title }: { r: ReceiptView; title: string }) {
  const sum = r.shares.reduce((a, g) => a + g.crista, 0) || 1;
  const spentPct = r.totals.initialCrista > 0 ? Math.round((r.totals.spentCrista / r.totals.initialCrista) * 100) : null;
  const clinical = r.shares.find((g) => g.group === 'clinical')?.crista ?? 0;
  return (
    <div className="s42-rc-wrap">
      <div className="s42-rc">
        <h4>{K.result.receiptHead}</h4>
        <p>{title}</p>
        <table>
          <caption className="sr">{K.receipt.spentTitle}</caption>
          <tbody>
            <tr className="s42-sec"><td colSpan={3}>{K.receipt.spentTitle}</td></tr>
            {r.spent.map((l, i) => (
              <tr key={`s${i}`} className={l.failed ? 's42-fail' : undefined}>
                <td>{l.failed && <b aria-label={K.receipt.failed}>✕ </b>}{l.label}{l.count > 1 ? ` ×${l.count}` : ''}</td>
                <td>{dayText(l)}</td>
                <td>−{formatCrista(l.crista, { unit: false })}</td>
              </tr>
            ))}
            <tr className="s42-sec s42-sep"><td colSpan={3}>{K.receipt.incomeTitle}</td></tr>
            {r.income.map((l, i) => (
              <tr key={`i${i}`}>
                <td>{l.label}{l.count > 1 ? ` ×${l.count}` : ''}</td>
                <td>{dayText(l)}</td>
                <td>+{formatCrista(l.crista, { unit: false })}</td>
              </tr>
            ))}
            <tr className="s42-sep s42-tot"><td>{K.receipt.total}</td><td /><td>{formatCrista(r.totals.spentCrista, { unit: false })}</td></tr>
            <tr><td>{K.receipt.initial}</td><td /><td>{formatCrista(r.totals.initialCrista, { unit: false })}</td></tr>
            <tr><td>{K.receipt.income}</td><td /><td>{formatCrista(r.totals.incomeCrista, { unit: false })}</td></tr>
            <tr className="s42-tot"><td>{K.receipt.balance}</td><td /><td>{formatCrista(r.totals.balanceCrista, { unit: false })}</td></tr>
            <tr className="s42-sep"><td>{K.receipt.days}</td><td /><td>{r.daysTaken !== null ? K.ui.daysUnit(r.daysTaken) : '—'}</td></tr>
            <tr><td>{K.receipt.molecules}</td><td /><td>{r.molecules.start ?? '—'} → {r.molecules.end ?? '?'}</td></tr>
          </tbody>
        </table>
        <div className="s42-bar" role="img" aria-label={K.ui.sharesLabel(r.shares.map((g) => `${K.receipt.group[g.group]} ${Math.round((g.crista / sum) * 100)}%`).join(', '))}>
          {r.shares.map((g) => g.crista > 0 && <i key={g.group} style={{ width: `${(g.crista / sum) * 100}%`, background: GROUP_FILL[g.group] }} />)}
        </div>
        <div className="s42-leg" aria-hidden="true">
          {r.shares.map((g) => (
            <span key={g.group}><i style={{ background: GROUP_FILL[g.group] }} />{K.receipt.group[g.group]} {Math.round((g.crista / sum) * 100)}%</span>
          ))}
        </div>
        <p className="s42-rc-end">{K.ui.receiptEnd(!!r.molecules.end, r.lastGameDay ?? 0, null)}</p>
      </div>
      <div className="s42-side">
        <div className="s42-big"><b>{r.daysTaken !== null ? K.ui.daysUnit(r.daysTaken) : '—'}</b><span>{K.ui.dayRange(r.firstGameDay ?? 0, r.lastGameDay ?? 0)}</span></div>
        <div className="s42-big"><b>{formatCrista(r.totals.spentCrista, { unit: false })}</b><span>{K.ui.spentBig(spentPct, clinical > 0 ? Math.round((clinical / sum) * 100) : null)}</span></div>
        <div className="s42-big"><b>{r.molecules.start ?? '—'} → {r.molecules.end ?? '?'}</b><span>{K.receipt.molecules}</span></div>
        <p className="mini muted" style={{ margin: 0 }}>{K.receipt.failNote}</p>
      </div>
    </div>
  );
}

function ResultTab({ data }: TabProps) {
  const cert = data.certificate;
  const app = data.application;
  const certRef = useRef<HTMLDivElement>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const rcRef = useRef<HTMLDivElement>(null);
  const act = useAction();
  const art = useMemo(() => (cert ? artOf(data, cert.pack, cert.brand) : app?.pack ? artOf(data, app.pack, app.brand?.name ?? '') : null), [data, cert, app]);
  const meta = { company: data.startupName, ticker: data.ticker, brand: cert?.brand ?? null, codeName: cert?.codeName ?? data.phase3?.codeName ?? null };
  const fileBase = `${data.ticker}-${cert ? cert.brand : 'draft'}`;
  return (
    <>
      {cert && <Complete brand={cert.brand} />}
      {!cert && <p className="hint">{K.result.notYet}</p>}
      {cert && (
        <section className="s42-sec-block" aria-labelledby="s42-h-cert">
          <h3 className="s42-h" id="s42-h-cert">{K.result.certTitle}</h3>
          <div ref={certRef}><Certificate cert={cert} /></div>
          <DocActions onPrint={() => printOnly(certRef.current)} busy={act.busy} onPng={() => act.run(() => downloadPng(certExportSvg(cert), `${fileBase}-${K.result.certTitle}.png`))} />
        </section>
      )}
      {art && (
        <section className="s42-sec-block" aria-labelledby="s42-h-pack">
          <h3 className="s42-h" id="s42-h-pack">{cert ? K.result.packTitle : K.ui.packPreview(K.result.packTitle)}</h3>
          <div ref={packRef} className="s42-pack big">
            <div className="s42-art" dangerouslySetInnerHTML={{ __html: packBoxSvg(art) }} />
            <div className="s42-art" dangerouslySetInnerHTML={{ __html: packInsideSvg(art) }} />
          </div>
          <DocActions onPrint={() => printOnly(packRef.current)} busy={act.busy} onPng={() => act.run(() => downloadPng(packExportSvg(art), `${fileBase}-${K.result.packTitle}.png`))} />
        </section>
      )}
      <section className="s42-sec-block" aria-labelledby="s42-h-rc">
        <h3 className="s42-h" id="s42-h-rc">{K.result.receiptTitle}</h3>
        {!cert && <p className="mini muted">{K.receipt.preview}</p>}
        <p className="mini muted">{K.receipt.groupedNote}</p>
        <div ref={rcRef}>
          <Receipt r={data.receipt} title={`${data.startupName} (${data.ticker})${meta.codeName ? ` · ${meta.codeName}` : ''}${meta.brand ? ` 「${meta.brand}」` : ''}`} />
        </div>
        <DocActions onPrint={() => printOnly(rcRef.current)} busy={act.busy} onPng={() => act.run(() => downloadPng(receiptExportSvg(data.receipt, meta), `${fileBase}-${K.result.receiptTitle}.png`))} />
      </section>
      {act.error && <p className="hint bad">✕ {act.error}</p>}
    </>
  );
}
