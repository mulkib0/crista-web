/**
 * ③ 단계 화면 — 1.1 질환 · 표적 / 1.2 스크리닝 / 2.1 도킹 / 2.2 ADMET · 리드(설계 §6 · §6.4), 3.x · 4.x 는 잠긴 안내.
 * 왼쪽 열 = 개인 작업대(이 브라우저에만 — 다른 모둠원의 입력 칸을 흔들지 않는다), 오른쪽 열 = 모둠 공유(서버 저장 · 실시간).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  API,
  GROUP_TITLE,
  SCREEN_LIMITS,
  STEP_META,
  type BoardResponse,
  type DiseaseTargetsResponse,
  type FunnelPreviewResponse,
  type PropertiesResponse,
  type StepId,
  type StepView,
  type WebJobView,
} from '@crista-web/web-contract';
import { api, message, newRequestId } from '../api.ts';
import { money } from '../ink.ts';
import { By, JobState, Notes, SourceChip } from './parts.tsx';

/** 개인 작업대 — 단계를 오가도 남도록 Board 가 들고 있다(서버로 보내지 않는다). */
export interface Bench {
  diseaseId: string | null;
  pickNote: string;
  screen: { maxMw: number; maxTpsa: number; ro5Only: boolean; excludeAlerts: boolean; library: string };
  smiles: string;
  label: string;
  parentJobId: string | null;
  admetFrom: string;
}

export const initialBench = (): Bench => ({
  diseaseId: null,
  pickNote: '',
  screen: { maxMw: 500, maxTpsa: 90, ro5Only: false, excludeAlerts: true, library: '' },
  smiles: '',
  label: '',
  parentJobId: null,
  admetFrom: '',
});

export interface StepProps {
  board: BoardResponse;
  step: StepView;
  bench: Bench;
  setBench: (fn: (b: Bench) => Bench) => void;
  reload: () => void;
  goStep: (id: StepId) => void;
}

const INDUSTRY: Record<StepId, string> = {
  '1.1': '제약회사는 유전 · 문헌 · 약물 · 발현 근거로 “약이 될 만한 표적”을 고른다. 도킹까지 가려면 결정구조가 준비된 표적이어야 한다.',
  '1.2': '수십만 종 라이브러리를 물성 컷오프(MW · TPSA · Ro5 · 구조 경고)로 거른 뒤 표적 점수로 줄을 세워 후보 몇십 종을 남긴다(HTVS).',
  '2.1': '후보 분자를 표적 포켓에 도킹해 결합 자유에너지(ΔG)와 상호작용 잔기를 본다. 결정 리간드(승인약)를 대조군으로 함께 놓는다.',
  '2.2': '결합이 좋아도 흡수 · 뇌 노출 · 심장 독성(hERG) · 간독성이 나쁘면 약이 못 된다. 효능과 안전의 균형으로 리드를 고른다.',
  '3.1': '리드에 코드명을 붙이고 물질특허를 출원한다 — 같은 물질은 먼저 낸 쪽이 갖는다.',
  '3.2': '제형 · 용량 · 환자군 · 1차 평가지표를 정해 임상시험 승인(IND)을 신청한다.',
  '4.1': '1상(안전) → 2상(효능) → 3상(둘 다). 보류되면 용량 · 제형을 바꾸거나 백업 후보로 다시 도전한다.',
  '4.2': '브랜드 이름과 포장을 정해 최종 허가를 받는다.',
};

const DONE_WHEN: Partial<Record<StepId, string>> = {
  '1.1': '모둠 표적 1개 확정',
  '1.2': '그 표적의 스크리닝 1회 이상',
  '2.1': '그 표적의 실제 도킹 근거 1건 이상',
  '2.2': '주력 리드 지정',
};

const EVIDENCE_LABEL = { dataset: '자료 조회', compute: '실제 계산', prediction: 'AI 예측', simulation: '교육용 모의 판정' } as const;

export function StepHead({ board, step }: { board: BoardResponse; step: StepView }) {
  const meta = STEP_META[step.id];
  return (
    <div className="sh">
      <div className="sh-n" aria-hidden="true">{step.id}</div>
      <p className="eyebrow">{meta.group}. {GROUP_TITLE[meta.group]} · {meta.sub}</p>
      <h1>{meta.title}</h1>
      <p className="lede">실제 산업에서는 — {INDUSTRY[step.id]}</p>
      <div className="chips" style={{ marginTop: 8 }}>
        {step.evidence.map((e) => <span key={e} className="chip">{EVIDENCE_LABEL[e]}</span>)}
        {step.costCents !== undefined && <span className="chip">비용 {money(step.costCents)}</span>}
        {DONE_WHEN[step.id] && <span className="chip">완료 조건 · {DONE_WHEN[step.id]}</span>}
        {board.workerMode === 'fixture' && step.evidence.includes('compute') && <span className="chip test">워커 fixture 모드 — 테스트 결과</span>}
      </div>
    </div>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

const currentTarget = (board: BoardResponse) => board.diseases.find((d) => d.targetId === board.program.targetId) ?? null;
const jobsOf = (board: BoardResponse, step: '1.2' | '2.1' | '2.2') => board.jobs.filter((j) => j.step === step && j.targetId === board.program.targetId);

function Next({ step, goStep, label }: { step: StepView; goStep: (id: StepId) => void; label: StepId }) {
  return (
    <div className="next acts">
      <button className="btn" type="button" onClick={() => goStep(label)} disabled={step.state !== 'done'}>
        다음 단계로 — {label} {STEP_META[label].title} →
      </button>
      <span className="note">{step.state === 'done' ? '이 단계의 완료 조건을 채웠어요.' : '완료 조건을 채우면 다음 단계가 열려요(자동 실행 · 과금 없음).'}</span>
    </div>
  );
}

// ── 1.1 ──

export function Step11({ board, step, bench, setBench, reload, goStep }: StepProps) {
  const [targets, setTargets] = useState<Record<string, DiseaseTargetsResponse>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const act = useAction();
  const disease = board.diseases.find((d) => d.diseaseId === bench.diseaseId) ?? null;
  const data = bench.diseaseId ? targets[bench.diseaseId] : undefined;

  useEffect(() => {
    const id = bench.diseaseId;
    if (!id || targets[id]) return;
    setLoadErr(null);
    api.get<DiseaseTargetsResponse>(API.diseaseTargets(id)).then((res) => setTargets((t) => ({ ...t, [id]: res }))).catch((e) => setLoadErr(message(e)));
  }, [bench.diseaseId, targets]);

  const confirmed = currentTarget(board);
  return (
    <>
      <StepHead board={board} step={step} />
      <div className="split">
        <section aria-labelledby="w11">
          <h2 className="col-h" id="w11">내 작업대 — 나만 보여요</h2>
          <div className="panel">
            <h3 className="ptitle">질환 고르기 <small>Open Targets v4</small></h3>
            <div className="opts">
              {board.diseases.map((d) => (
                <button key={d.diseaseId} type="button" className="opt" aria-pressed={bench.diseaseId === d.diseaseId} onClick={() => setBench((b) => ({ ...b, diseaseId: d.diseaseId }))}>
                  <b>{d.label}</b>
                  <span className="muted">{d.gene} · PDB {d.pdbId}{d.cns ? ' · 뇌 표적' : ''}</span>
                </button>
              ))}
            </div>
          </div>
          {disease && (
            <div className="panel">
              <h3 className="ptitle">{disease.label} 연관 표적 <small>{data ? `연관 유전자 ${data.totalAssociatedCount.toLocaleString()}개 중 상위` : '불러오는 중…'}</small></h3>
              {loadErr && <p className="err">{loadErr}</p>}
              {data && (
                <div className="tbl-w">
                  <table>
                    <thead><tr><th>유전자</th><th className="num">종합</th><th className="num">유전</th><th className="num">약물</th><th className="num">문헌</th><th>포켓</th><th>구조</th></tr></thead>
                    <tbody>
                      {data.targets.slice(0, 10).map((t) => (
                        <tr key={t.ensemblId} className={t.dockingTargetId ? 'on' : ''}>
                          <td><b>{t.symbol}</b> <span className="mini muted">{t.name.slice(0, 28)}</span></td>
                          <td className="num">{t.overallScore.toFixed(2)}</td>
                          <td className="num">{t.geneticScore.toFixed(2)}</td>
                          <td className="num">{t.drugScore.toFixed(2)}</td>
                          <td className="num">{t.literatureScore.toFixed(2)}</td>
                          <td>{t.smPocket ? '✓' : '—'}</td>
                          <td className="mini">{t.dockingTargetId ? `도킹 가능 · ${t.pdbId}` : t.pdbId ? `PDB ${t.pdbId}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="hint">형광 줄이 도킹까지 갈 수 있는 표적이에요 — 질환마다 결정구조가 준비된 표적은 하나({disease.gene} · {disease.targetLabel}).</p>
              <div className="fld">
                <label className="lab" htmlFor="pick-note">추천 이유(선택)</label>
                <input id="pick-note" className="txt" value={bench.pickNote} maxLength={200} onChange={(e) => setBench((b) => ({ ...b, pickNote: e.target.value }))} placeholder="예: 임상 근거 0.99 · 포켓 확인 · 승인약 대조군이 있다" />
              </div>
              {act.error && <p className="err" style={{ marginTop: 10 }}>{act.error}</p>}
              <div className="acts" style={{ marginTop: 12 }}>
                <button className="btn" type="button" disabled={act.busy} onClick={() => void act.run(async () => {
                  await api.post(API.picks, { diseaseId: disease.diseaseId, note: bench.pickNote || null });
                  reload();
                })}>내 추천 표적으로 올리기</button>
                <span className="note">무료 · 모둠 비교표에 올라가요</span>
              </div>
            </div>
          )}
        </section>
        <section aria-labelledby="t11">
          <h2 className="col-h" id="t11">모둠 공유 — 추천 카드 · 확정</h2>
          <div className="panel">
            <h3 className="ptitle">모둠 표적 <small>{board.program.targetSetByName ? `${board.program.targetSetByName} 님이 확정` : '아직 없음'}</small></h3>
            {confirmed ? (
              <p><b>{confirmed.label}</b> — {confirmed.gene} {confirmed.targetLabel} · PDB {confirmed.pdbId} · 대조군 {confirmed.referenceLigand.name}(ΔG {confirmed.referenceKcal} kcal/mol)</p>
            ) : (
              <p className="muted">추천 카드를 비교해 하나를 확정해요. 바꾸면 2.x 근거는 새 표적으로 다시 쌓아야 해요.</p>
            )}
          </div>
          <div className="cards" style={{ marginTop: 12 }}>
            {board.picks.length === 0 && <p className="empty">아직 추천 카드가 없어요. 왼쪽에서 질환을 보고 올려 주세요.</p>}
            {board.picks.map((p) => {
              const d = board.diseases.find((x) => x.diseaseId === p.diseaseId);
              const on = p.targetId === board.program.targetId;
              return (
                <div key={p.id} className={`card${on ? ' on' : ''}`}>
                  <div className="card-h">
                    <By name={p.byName} avatar={p.avatar} />
                    <span className="muted mini">추천</span>
                    <b>{d?.label}</b>
                    <span className="mono mini">{d?.gene} · {d?.pdbId}</span>
                  </div>
                  {p.note && <p className="mini" style={{ margin: 0 }}>“{p.note}”</p>}
                  <div className="acts">
                    <button className="btn sm" type="button" disabled={on || act.busy} onClick={() => void act.run(async () => {
                      await api.post(API.target, { diseaseId: p.diseaseId });
                      reload();
                    })}>{on ? '확정된 표적' : '이 표적으로 확정'}</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14 }}><Notes board={board} stepId="1.1" /></div>
          <Next step={step} goStep={goStep} label="1.2" />
        </section>
      </div>
    </>
  );
}

// ── 1.2 ──

export function Step12({ board, step, bench, setBench, reload, goStep }: StepProps) {
  const [preview, setPreview] = useState<FunnelPreviewResponse | null>(null);
  const [prevErr, setPrevErr] = useState<string | null>(null);
  const act = useAction();
  const s = bench.screen;
  const runs = jobsOf(board, '1.2');
  const latest = runs.find((j) => j.status === 'succeeded') ?? null;
  const [viewId, setViewId] = useState<string | null>(null);
  const shown = runs.find((j) => j.id === viewId && j.status === 'succeeded') ?? latest;
  const target = currentTarget(board);

  useEffect(() => {
    if (!board.program.targetId) return;
    const q = new URLSearchParams({ maxMw: String(s.maxMw), maxTpsa: String(s.maxTpsa), ro5Only: String(s.ro5Only), excludeAlerts: String(s.excludeAlerts) });
    if (s.library) q.set('library', s.library);
    const t = setTimeout(() => {
      api.get<FunnelPreviewResponse>(`${API.funnel}?${q}`).then((p) => (setPreview(p), setPrevErr(null))).catch((e) => setPrevErr(message(e)));
    }, 350);
    return () => clearTimeout(t);
  }, [s.maxMw, s.maxTpsa, s.ro5Only, s.excludeAlerts, s.library, board.program.targetId]);

  const set = (patch: Partial<Bench['screen']>) => setBench((b) => ({ ...b, screen: { ...b.screen, ...patch } }));
  const funnel = preview?.funnel;
  const max = preview?.total || 1;
  const rows: Array<[string, number | undefined]> = funnel
    ? [['전체 라이브러리', preview!.total], [s.library || '고른 라이브러리', funnel.library], ['MW · TPSA 통과', funnel.mwTpsa], ['Ro5 통과', funnel.ro5], [s.excludeAlerts ? '구조 경고 제외' : '구조 경고 허용', funnel.alerts]]
    : [];

  return (
    <>
      <StepHead board={board} step={step} />
      <div className="split">
        <section aria-labelledby="w12">
          <h2 className="col-h" id="w12">내 작업대 — 깔때기 컷오프(무료 미리보기)</h2>
          <div className="panel">
            <h3 className="ptitle">컷오프 <small>{target ? `표적 ${target.gene}` : ''}</small></h3>
            <div className="fld">
              <label className="lab" htmlFor="mw">분자량 MW 상한(Da)</label>
              <div className="rng"><input id="mw" type="range" min={SCREEN_LIMITS.mwMin} max={SCREEN_LIMITS.mwMax} step={10} value={s.maxMw} onChange={(e) => set({ maxMw: Number(e.target.value) })} /><output>{s.maxMw}</output></div>
            </div>
            <div className="fld">
              <label className="lab" htmlFor="tpsa">극성 표면적 TPSA 상한(Å²) {target?.cns ? '· 뇌 표적은 90 이하가 유리' : ''}</label>
              <div className="rng"><input id="tpsa" type="range" min={SCREEN_LIMITS.tpsaMin} max={SCREEN_LIMITS.tpsaMax} step={5} value={s.maxTpsa} onChange={(e) => set({ maxTpsa: Number(e.target.value) })} /><output>{s.maxTpsa}</output></div>
            </div>
            <label className="chk"><input type="checkbox" checked={s.ro5Only} onChange={(e) => set({ ro5Only: e.target.checked })} /> Ro5 위반 0건만(엄격)</label>
            <label className="chk"><input type="checkbox" checked={s.excludeAlerts} onChange={(e) => set({ excludeAlerts: e.target.checked })} /> 구조 경고(방향족 아민 · 니트로) 제외</label>
            <div className="fld">
              <label className="lab" htmlFor="lib">라이브러리</label>
              <select id="lib" className="txt" value={s.library} onChange={(e) => set({ library: e.target.value })}>
                <option value="">전체</option>
                {preview?.libraries.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="panel">
            <h3 className="ptitle">깔때기 미리보기 <small>ChEMBL · RDKit</small></h3>
            {prevErr && <p className="err">{prevErr}</p>}
            <div className="fun">
              {rows.map(([label, n]) => (
                <div key={label} className="fun-r"><span>{label}</span><span className="bar"><i style={{ width: `${((n ?? 0) / max) * 100}%` }} /></span><b>{n}</b></div>
              ))}
            </div>
            {preview && preview.top.length > 0 && (
              <p className="hint">표적 점수 상위: {preview.top.slice(0, 3).map((c) => c.name).join(' · ')}</p>
            )}
            {act.error && <p className="err" style={{ marginTop: 10 }}>{act.error}</p>}
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn pri" type="button" disabled={act.busy || !board.program.targetId || step.state === 'locked'} onClick={() => void act.run(async () => {
                await api.post(API.jobs, { requestId: newRequestId(), step: '1.2', params: { maxMw: s.maxMw, maxTpsa: s.maxTpsa, ro5Only: s.ro5Only, excludeAlerts: s.excludeAlerts, library: s.library || null } });
                reload();
              })}>
                이 깔때기로 스크리닝 <span className="cost">{money(board.costs['1.2'])}</span>
              </button>
              <span className="note">상위 20종이 모둠 후보표에 올라가요</span>
            </div>
          </div>
        </section>
        <section aria-labelledby="t12">
          <h2 className="col-h" id="t12">모둠 공유 — 스크리닝 결과 · 후보 찜</h2>
          <div className="panel">
            <h3 className="ptitle">스크리닝 기록 <small>{runs.length}회</small></h3>
            {runs.length === 0 ? <p className="empty">아직 없어요.</p> : (
              <div className="tbl-w"><table>
                <thead><tr><th>누가</th><th>깔때기</th><th>상태</th><th /></tr></thead>
                <tbody>
                  {runs.map((j) => (
                    <tr key={j.id} className={shown?.id === j.id ? 'on' : ''}>
                      <td><By name={j.byName} avatar={j.avatar} /></td>
                      <td className="mini">{j.inputSummary}</td>
                      <td><JobState job={j} /></td>
                      <td>{j.status === 'succeeded' && <button className="btn sm" type="button" onClick={() => setViewId(j.id)}>보기</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
          {shown?.result && (
            <div className="panel">
              <h3 className="ptitle">후보 — {shown.byName} 님의 깔때기 <small><SourceChip source={shown.source} /></small></h3>
              <p className="mini muted" style={{ marginTop: 0 }}>{shown.result.subtitle}</p>
              <div className="tbl-w"><table>
                <thead><tr><th>후보</th><th className="num">사전 ΔG</th><th className="num">점수</th><th className="num">MW</th><th className="num">QED</th><th>찜</th></tr></thead>
                <tbody>
                  {(shown.result.candidates ?? []).map((c) => {
                    const claim = board.claims.find((x) => x.compoundId === c.compoundId);
                    const mine = claim?.userId === board.account.userId;
                    return (
                      <tr key={c.compoundId}>
                        <td><b className="mini">{c.name}</b><div className="smi">{c.compoundId}</div></td>
                        <td className="num">{c.vinaKcal?.toFixed(2) ?? '—'}</td>
                        <td className="num">{c.screenScore.toFixed(3)}</td>
                        <td className="num">{c.mw.toFixed(0)}</td>
                        <td className="num">{c.qed.toFixed(2)}</td>
                        <td>
                          {claim ? (
                            mine ? <button className="btn sm" type="button" disabled={act.busy} onClick={() => void act.run(async () => { await api.del(API.claim(c.compoundId)); reload(); })}>내 담당 · 놓기</button>
                              : <span className="mini"><By name={claim.byName} avatar={claim.avatar} /></span>
                          ) : (
                            <button className="btn sm" type="button" disabled={act.busy} onClick={() => void act.run(async () => { await api.post(API.claims, { screenJobId: shown.id, compoundId: c.compoundId }); reload(); })}>찜</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
              <p className="hint">한 사람이 1~2개씩 찜해 2.1 에서 각자 도킹해요(최대 3개).</p>
            </div>
          )}
          <div style={{ marginTop: 14 }}><Notes board={board} stepId="1.2" /></div>
          <Next step={step} goStep={goStep} label="2.1" />
        </section>
      </div>
    </>
  );
}

// ── 2.1 ──


function Signals({ p }: { p: PropertiesResponse }) {
  const s = p.signals;
  const items: Array<[string, string, 'g' | 'w' | 'b']> = [
    ['Ro5 위반', String(s.ro5Violations), s.ro5Violations === 0 ? 'g' : s.ro5Violations === 1 ? 'w' : 'b'],
    ['경구 흡수', { good: '좋음', moderate: '보통', poor: '나쁨' }[s.oralAbsorption], s.oralAbsorption === 'good' ? 'g' : s.oralAbsorption === 'moderate' ? 'w' : 'b'],
    ['뇌 노출(BBB)', { high: '높음', moderate: '보통', low: '낮음' }[s.bbb], s.bbb === 'high' ? 'g' : s.bbb === 'moderate' ? 'w' : 'b'],
    ['hERG 위험', { low: '낮음', moderate: '보통', high: '높음' }[s.herg], s.herg === 'low' ? 'g' : s.herg === 'moderate' ? 'w' : 'b'],
    ['간독성 위험', { low: '낮음', moderate: '보통', high: '높음' }[s.hepatotoxicity], s.hepatotoxicity === 'low' ? 'g' : s.hepatotoxicity === 'moderate' ? 'w' : 'b'],
  ];
  return (
    <div className="chips">
      {items.map(([k, v, tone]) => <span key={k} className={`sig ${tone}`}>{k} {v}</span>)}
    </div>
  );
}

const residues = (job: WebJobView): string => {
  const rows = job.result?.table?.rows ?? [];
  return rows.slice(0, 3).map((r) => r[0]).join(' · ') + (rows.length > 3 ? ` 외 ${rows.length - 3}` : '');
};

export function Step21({ board, step, bench, setBench, reload, goStep }: StepProps) {
  const act = useAction();
  const [props, setProps] = useState<PropertiesResponse | null>(null);
  const [propErr, setPropErr] = useState<string | null>(null);
  const target = currentTarget(board);
  const runs = jobsOf(board, '2.1');
  const myClaims = board.claims.filter((c) => c.userId === board.account.userId);
  const sorted = useMemo(
    () => [...runs].sort((a, b) => (a.affinityKcal ?? 0) - (b.affinityKcal ?? 0) || a.createdAt.localeCompare(b.createdAt)),
    [runs],
  );
  const smilesRef = useRef<HTMLTextAreaElement>(null);

  const load = (smiles: string, label: string, parentJobId: string | null) => {
    setBench((b) => ({ ...b, smiles, label, parentJobId }));
    setProps(null);
    smilesRef.current?.focus();
  };

  return (
    <>
      <StepHead board={board} step={step} />
      <div className="split">
        <section aria-labelledby="w21">
          <h2 className="col-h" id="w21">내 작업대 — 분자 고치기 · 무료 미리보기</h2>
          <div className="panel">
            <h3 className="ptitle">불러오기 <small>내 담당 후보 · 대조군</small></h3>
            <div className="chips">
              {myClaims.map((c) => <button key={c.compoundId} type="button" className="btn sm" onClick={() => load(c.smiles, c.name.slice(0, 40), null)}>{c.name.slice(0, 18)}</button>)}
              {target && <button type="button" className="btn sm" onClick={() => load(target.referenceLigand.smiles, `${target.referenceLigand.name}(대조군)`, null)}>대조군 {target.referenceLigand.name}</button>}
              {myClaims.length === 0 && <span className="mini muted">1.2 에서 후보를 찜하면 여기 나와요.</span>}
            </div>
          </div>
          <div className="panel">
            <h3 className="ptitle">분자 <small>{bench.parentJobId ? '구조 바꿔 다시 도킹 — 부모 분자 기록됨' : 'SMILES'}</small></h3>
            <div className="fld">
              <label className="lab" htmlFor="smi">SMILES</label>
              <textarea id="smi" ref={smilesRef} className="txt mono" rows={3} value={bench.smiles} maxLength={200} onChange={(e) => (setBench((b) => ({ ...b, smiles: e.target.value })), setProps(null))} placeholder="예: COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2" />
              <p className="hint">작용기를 바꿔 보세요 — 예: 염기성 아민 → 아마이드, 수소 → 플루오린, 메톡시 제거. 자동 변형 칩은 워커 변경이 필요해 다음에 열려요.</p>
            </div>
            <div className="fld">
              <label className="lab" htmlFor="lbl">이름표</label>
              <input id="lbl" className="txt" value={bench.label} maxLength={40} onChange={(e) => setBench((b) => ({ ...b, label: e.target.value }))} placeholder="예: 도네페질 F 유도체" />
            </div>
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn" type="button" disabled={!bench.smiles.trim() || act.busy} onClick={() => void (async () => {
                setPropErr(null);
                try {
                  setProps(await api.post<PropertiesResponse>(API.properties, { smiles: bench.smiles.trim() }));
                } catch (e) {
                  setPropErr(message(e));
                }
              })()}>무료 물성 미리보기</button>
              <button className="btn pri" type="button" disabled={!bench.smiles.trim() || act.busy || step.state === 'locked'} onClick={() => void act.run(async () => {
                await api.post(API.jobs, { requestId: newRequestId(), step: '2.1', params: { smiles: bench.smiles.trim(), label: bench.label.trim() || null, parentJobId: bench.parentJobId } });
                reload();
              })}>도킹 실행 <span className="cost">{money(board.costs['2.1'])}</span></button>
            </div>
            {propErr && <p className="err" style={{ marginTop: 10 }}>{propErr}</p>}
            {act.error && <p className="err" style={{ marginTop: 10 }}>{act.error}</p>}
            {props && (
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <p className="mini mono" style={{ margin: 0 }}>MW {props.properties.mw} · cLogP {props.properties.clogp} · TPSA {props.properties.tpsa} · HBD {props.properties.hbd} · HBA {props.properties.hba} · QED {props.properties.qed}</p>
                <Signals p={props} />
                <p className="smi">정규 SMILES {props.properties.canonicalSmiles}</p>
              </div>
            )}
          </div>
        </section>
        <section aria-labelledby="t21">
          <h2 className="col-h" id="t21">모둠 공유 — 도킹 비교표</h2>
          <div className="panel">
            <h3 className="ptitle">{target ? `${target.gene} (PDB ${target.pdbId})` : ''} 도킹 <small>ΔG 낮을수록 강하게 붙음</small></h3>
            <div className="tbl-w"><table>
              <thead><tr><th>담당</th><th>분자</th><th className="num">ΔG</th><th className="num">대조군 대비</th><th>상호작용 잔기</th><th>상태</th><th /></tr></thead>
              <tbody>
                {target && (
                  <tr className="ref">
                    <td className="mini">결정 리간드</td>
                    <td><b className="mini">{target.referenceLigand.name}</b> <span className="chip">대조군</span></td>
                    <td className="num">{target.referenceKcal.toFixed(2)}</td>
                    <td className="num">100%</td>
                    <td className="mini muted">재도킹 기준값</td>
                    <td /><td />
                  </tr>
                )}
                {sorted.map((j) => (
                  <tr key={j.id} className={j.status === 'failed' ? 'dim' : ''}>
                    <td><By name={j.byName} avatar={j.avatar} /></td>
                    <td><b className="mini">{j.label ?? '이름 없음'}</b>{j.parentJobId && <span className="mini muted"> · 변형체</span>}<div className="smi">{j.smiles?.slice(0, 48)}</div></td>
                    <td className="num">{j.affinityKcal != null ? j.affinityKcal.toFixed(2) : '—'}</td>
                    <td className="num">{j.affinityKcal != null && target ? `${Math.round((j.affinityKcal / target.referenceKcal) * 100)}%` : '—'}</td>
                    <td className="mini">{j.status === 'succeeded' ? residues(j) : ''}</td>
                    <td><JobState job={j} /> {j.status === 'succeeded' && <SourceChip source={j.source} />}</td>
                    <td>{j.status === 'succeeded' && j.smiles && <button className="btn sm" type="button" onClick={() => load(j.smiles!, `${(j.label ?? '변형체').slice(0, 30)}′`, j.id)}>구조 바꿔 다시</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {runs.length === 0 && <p className="empty" style={{ marginTop: 10 }}>아직 도킹한 분자가 없어요. 각자 찜한 후보를 동시에 돌려 보세요.</p>}
            {runs.some((j) => j.error) && <p className="hint">실패한 작업은 연구비를 돌려받았어요: {runs.find((j) => j.error)?.error?.message}</p>}
          </div>
          <div style={{ marginTop: 14 }}><Notes board={board} stepId="2.1" /></div>
          <Next step={step} goStep={goStep} label="2.2" />
        </section>
      </div>
    </>
  );
}

// ── 2.2 ──

export function Step22({ board, step, bench, setBench, reload, goStep }: StepProps) {
  const act = useAction();
  const docked = jobsOf(board, '2.1').filter((j) => j.status === 'succeeded');
  const admet = jobsOf(board, '2.2');
  const doneAdmet = admet.filter((j) => j.status === 'succeeded');
  const [lead, setLead] = useState<string>(board.program.lead?.jobId ?? '');
  const [backup, setBackup] = useState<string>(board.program.backup?.jobId ?? '');
  useEffect(() => {
    setLead(board.program.lead?.jobId ?? '');
    setBackup(board.program.backup?.jobId ?? '');
  }, [board.program.lead?.jobId, board.program.backup?.jobId]);
  const dg = (j: WebJobView) => board.jobs.find((x) => x.id === j.parentJobId)?.affinityKcal;
  const metricKeys = Array.from(new Set(doneAdmet.flatMap((j) => j.result?.metrics.map((m) => m.label) ?? []))).slice(0, 6);

  return (
    <>
      <StepHead board={board} step={step} />
      <div className="split">
        <section aria-labelledby="w22">
          <h2 className="col-h" id="w22">내 작업대 — ADMET 로 볼 분자</h2>
          <div className="panel">
            <div className="fld">
              <label className="lab" htmlFor="adm">도킹을 끝낸 분자</label>
              <select id="adm" className="txt" value={bench.admetFrom} onChange={(e) => setBench((b) => ({ ...b, admetFrom: e.target.value }))}>
                <option value="">— 고르기 —</option>
                {docked.map((j) => <option key={j.id} value={j.id}>{j.label ?? j.smiles?.slice(0, 24)} · ΔG {j.affinityKcal?.toFixed(2) ?? '—'} · {j.byName}</option>)}
              </select>
              <p className="hint">우리 모둠이 지금 표적으로 도킹한 분자만 ADMET 로 볼 수 있어요(서버가 근거를 대조).</p>
            </div>
            {act.error && <p className="err" style={{ marginTop: 10 }}>{act.error}</p>}
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn pri" type="button" disabled={!bench.admetFrom || act.busy || step.state === 'locked'} onClick={() => void act.run(async () => {
                await api.post(API.jobs, { requestId: newRequestId(), step: '2.2', params: { dockingJobId: bench.admetFrom } });
                reload();
              })}>ADMET 예측 <span className="cost">{money(board.costs['2.2'])}</span></button>
            </div>
          </div>
        </section>
        <section aria-labelledby="t22">
          <h2 className="col-h" id="t22">모둠 공유 — 효능 · 안전 비교 · 리드</h2>
          <div className="panel">
            <h3 className="ptitle">ADMET 비교표 <small>{admet.length}건</small></h3>
            {admet.length === 0 ? <p className="empty">아직 없어요.</p> : (
              <div className="tbl-w"><table>
                <thead><tr><th>분자 · 담당</th><th className="num">ΔG</th>{metricKeys.map((k) => <th key={k}>{k}</th>)}<th>상태</th></tr></thead>
                <tbody>
                  {admet.map((j) => (
                    <tr key={j.id} className={board.program.lead?.jobId === j.id ? 'on' : ''}>
                      <td><b className="mini">{j.label ?? j.smiles?.slice(0, 20)}</b><div><By name={j.byName} avatar={j.avatar} /></div></td>
                      <td className="num">{dg(j)?.toFixed(2) ?? '—'}</td>
                      {metricKeys.map((k) => {
                        const m = j.result?.metrics.find((x) => x.label === k);
                        return <td key={k} className="mini" style={{ color: m?.tone === 'red' ? 'var(--bad)' : undefined }}>{m ? `${m.value}${m.unit ?? ''}` : ''}</td>;
                      })}
                      <td><JobState job={j} /> {j.status === 'succeeded' && <SourceChip source={j.source} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
          <div className="panel">
            <h3 className="ptitle">주력 리드 · 백업 <small>{board.program.leadSetByName ? `${board.program.leadSetByName} 님이 지정` : '아직'}</small></h3>
            <div className="fld">
              <label className="lab" htmlFor="lead">주력 리드(ADMET 를 본 분자)</label>
              <select id="lead" className="txt" value={lead} onChange={(e) => setLead(e.target.value)}>
                <option value="">— 고르기 —</option>
                {doneAdmet.map((j) => <option key={j.id} value={j.id}>{j.label ?? j.smiles?.slice(0, 24)} · {j.byName}</option>)}
              </select>
            </div>
            <div className="fld">
              <label className="lab" htmlFor="backup">백업 후보(선택)</label>
              <select id="backup" className="txt" value={backup} onChange={(e) => setBackup(e.target.value)}>
                <option value="">— 없음 —</option>
                {[...doneAdmet, ...docked].filter((j) => j.id !== lead).map((j) => <option key={j.id} value={j.id}>{j.step} · {j.label ?? j.smiles?.slice(0, 24)} · {j.byName}</option>)}
              </select>
            </div>
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn film" type="button" disabled={!lead || act.busy} onClick={() => void act.run(async () => {
                await api.put(API.lead, { leadJobId: lead, backupJobId: backup || null });
                reload();
              })}>주력 리드 · 백업 지정</button>
              {board.program.lead && <span className="note">지금 리드: <b>{board.program.lead.label ?? board.program.lead.smiles.slice(0, 20)}</b>{board.program.backup ? ` · 백업 ${board.program.backup.label ?? ''}` : ''}</span>}
            </div>
          </div>
          <div style={{ marginTop: 14 }}><Notes board={board} stepId="2.2" /></div>
          <Next step={step} goStep={goStep} label="3.1" />
        </section>
      </div>
    </>
  );
}

// ── 3.x · 4.x (W4) ──

const LEARN: Partial<Record<StepId, { learn: string; need: string }>> = {
  '3.1': { learn: '물질특허의 같은 물질 판정(입체를 뺀 정규 SMILES)과 선착순', need: '2.2 주력 리드 · 코드명 · 기전 한 줄' },
  '3.2': { learn: '제형 · 용량 · 환자군 · 1차 평가지표가 효능 E · 안전 S 판정에 어떻게 들어가나', need: '3.1 유효 특허' },
  '4.1': { learn: '1상 안전 → 2상 효능 → 3상 둘 다. 보류(CRL) 뒤 재도전 3경로', need: '3.2 IND 승인 · 연구비' },
  '4.2': { learn: '최종 심사와 허가 — 브랜드 이름 · 포장', need: '4.1 3상 통과' },
};

export function LockedStep({ board, step }: StepProps) {
  const info = LEARN[step.id];
  return (
    <>
      <StepHead board={board} step={step} />
      <div className="split">
        <section>
          <div className="lock-box">
            <b>🔒 잠긴 단계 — 다음 수업에서 열려요</b>
            {info && <p className="mini" style={{ margin: 0 }}>무엇을 배우나 · {info.learn}</p>}
            {info && <p className="mini" style={{ margin: 0 }}>무엇이 필요한가 · {info.need}</p>}
            <p className="mini muted" style={{ margin: 0 }}>잠긴 단계도 연구 노트 초안은 미리 쓸 수 있어요(유료 실행 · 단계 확정만 막혀 있어요).</p>
          </div>
        </section>
        <section><Notes board={board} stepId={step.id} /></section>
      </div>
    </>
  );
}
