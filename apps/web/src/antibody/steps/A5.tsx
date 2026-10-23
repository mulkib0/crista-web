/**
 * A5 복합체 평가(설계 §6.3) — 확신도 문턱을 넘긴 변이체를 항원과 붙여 설계 적합도를 봐요.
 *
 * - 원본 비교군이 늘 함께 들어가요(§2.3) — 점수가 '원본보다 얼마나 나아졌나'에 걸려 있어요.
 * - 붙는 힘 점수는 **무단위**예요. 자유에너지도, 실험 측정도 아니에요 — 카드 글과 배지에 늘 함께 적어요(§3.2).
 * - 계면은 **접촉 잔기 표**가 기본이고 3D 는 탭이에요(§6.4) — 학습 목표가 뷰어 안에만 있으면 안 되기 때문이에요.
 */
import { useState } from 'react';
import {
  ANTIBODY_GRADE_WORD,
  CONFIDENCE_MIN_FOR_COMPLEX,
  formatCentsAsCrista,
  type ComplexView,
} from '@crista-web/web-contract';
import { Confirm, HBars, Panel, useBenchState } from '../../board/ui/index.ts';
import { AbHead, AbIslands, AbLocked, AbNext, AbNotes } from '../AbShell.tsx';
import { DataTable } from '../DataTable.tsx';
import { MolPanel } from '../Mol3D.tsx';
import { termName } from '../terms.ts';
import type { AbStepProps } from './index.ts';

export function A5({ board, step, me, actions, goStep, mock }: AbStepProps) {
  const [cut, setCut] = useBenchState<number>('ab:A5:cut', CONFIDENCE_MIN_FOR_COMPLEX);
  const [count, setCount] = useBenchState<number>('ab:A5:count', 3);
  const [useReal, setUseReal] = useBenchState<boolean>('ab:A5:real', false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = board.costs.A5;
  const quota = board.myQuota.evaluate;
  const folded = board.folds.filter((f) => f.confidenceMean >= cut);
  const pickable = folded
    .map((f) => board.designs.find((d) => d.id === f.designId))
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .slice(0, count);
  const target = pickable[0];

  const run = () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    void actions
      .runJob('A5', target.id, { confidenceMin: cut, real: useReal })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '실행하지 못했어요'))
      .finally(() => {
        setBusy(false);
        setAsk(false);
      });
  };

  const ranked = [...board.complexes].sort((a, b) => b.fit - a.fit);

  const contactTable = (c: ComplexView) => (
    <DataTable
      caption="접촉 잔기 표 — 고리 · 항체 자리 · 항원 자리 · 거리 · 다양성 등급"
      columns={[
        { key: 'cdr', label: '고리', cell: (r: ComplexView['contacts'][number]) => `${termName('cdr')}-${r.cdr}` },
        { key: 'ab', label: '항체 자리', cell: (r: ComplexView['contacts'][number]) => <span className="mono">{r.abResi} {r.abAa}</span> },
        { key: 'ag', label: '항원 자리', cell: (r: ComplexView['contacts'][number]) => <span className="mono">{r.agResi} {r.agAa}</span> },
        { key: 'd', label: '거리(Å)', num: true, cell: (r: ComplexView['contacts'][number]) => r.dist.toFixed(1) },
        { key: 'dv', label: '다양성', num: true, cell: (r: ComplexView['contacts'][number]) => <span className="ab-dv" data-d={r.diversity}>{r.diversity}</span> },
      ]}
      rows={c.contacts}
      rowKey={(r, i) => `${r.cdr}-${r.abResi}-${i}`}
      summary={`고리별 접촉 수 · ${c.contactsByCdr.map((x) => `${x.cdr} ${x.count}곳`).join(' · ')}`}
    />
  );

  return (
    <AbIslands
      head={
        <AbHead
          id="A5"
          cost={formatCentsAsCrista(cost)}
          chips={
            <>
              <span className="chip">{termName('bindScore')} · 무단위</span>
              {mock && <span className="chip test">화면 개발용 고정 자료</span>}
            </>
          }
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            <Panel title="고르는 기준">
              <div className="fld">
                <label className="lab" htmlFor="a5-cut">{termName('confidence')} 문턱</label>
                <div className="rng">
                  <input id="a5-cut" type="range" min={50} max={90} step={5} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
                  <output>{cut}</output>
                </div>
              </div>
              <div className="fld">
                <label className="lab" htmlFor="a5-count">평가할 변이체 수</label>
                <div className="rng">
                  <input id="a5-count" type="range" min={1} max={5} step={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                  <output>{count}</output>
                </div>
                <p className="hint">한 사람이 한 건이에요 — 모둠이 나눠 평가해요(내 몫 {quota.used}/{quota.max}).</p>
              </div>
              <div className="chk">
                <input
                  id="a5-real"
                  type="checkbox"
                  checked={useReal && board.optional.boltz}
                  disabled={!board.optional.boltz}
                  onChange={(e) => setUseReal(e.target.checked)}
                />
                <label htmlFor="a5-real">실제 복합체 예측 쓰기{board.optional.boltz ? '' : ' — 이 교실에서는 꺼져 있어요'}</label>
              </div>
            </Panel>

            <Panel title="선별 결과" sub={`${folded.length}개가 문턱을 넘었어요`}>
              {pickable.length === 0 ? (
                <p className="empty">문턱을 넘긴 변이체가 없어요 — A4 에서 먼저 접어 보거나 문턱을 내려요.</p>
              ) : (
                <ul className="mini" style={{ margin: 0, paddingLeft: 18 }}>
                  {pickable.map((d) => {
                    const fold = board.folds.find((f) => f.designId === d.id)!;
                    return <li key={d.id}>{d.label} · 평균 확신도 {fold.confidenceMean.toFixed(0)} · {d.mutations.length}자리</li>;
                  })}
                </ul>
              )}
            </Panel>

            <div className="acts">
              <button type="button" className="btn pri" disabled={busy || !target || quota.used >= quota.max} onClick={() => setAsk(true)}>
                복합체 평가 <span className="cost">{formatCentsAsCrista(cost)}</span>
              </button>
              <span className="note">같은 서열을 다시 평가하면 과금하지 않아요.</span>
            </div>
            {error && <p className="err" style={{ marginTop: 8 }}>{error}</p>}

            <Confirm
              open={ask}
              title="복합체 평가를 시작할까요?"
              confirmLabel={`${formatCentsAsCrista(cost)} 내고 평가하기`}
              tone="pri"
              busy={busy}
              blockedReason={board.balanceCents < cost ? '연구비가 모자라요 — 학습 연구비를 먼저 벌어요.' : null}
              onConfirm={run}
              onCancel={() => setAsk(false)}
            >
              <p>{target?.label} · 원본 비교군이 함께 들어가요.</p>
            </Confirm>
          </>
        )
      }
      team={
        <>
          <Panel title="변이체 순위표" sub={`${ranked.length}건`}>
            <DataTable
              caption="순위표 — 설계 적합도 · 붙는 힘 점수 · 확신도 · 등급"
              columns={[
                { key: 'no', label: '순위', num: true, cell: (_c: ComplexView, i: number) => i + 1 },
                { key: 'label', label: '변이체', cell: (c: ComplexView) => board.designs.find((d) => d.id === c.designId)?.label ?? c.designId },
                { key: 'fit', label: termName('fit'), num: true, cell: (c: ComplexView) => c.fit.toFixed(0) },
                { key: 'bind', label: termName('bindScore'), num: true, cell: (c: ComplexView) => c.bindScore.toFixed(0) },
                { key: 'conf', label: termName('confidence'), num: true, cell: (c: ComplexView) => (board.folds.find((f) => f.designId === c.designId)?.confidenceMean ?? 0).toFixed(0) },
                { key: 'grade', label: '등급', cell: (c: ComplexView) => <span className="ab-grade" data-g={c.grade}>{ANTIBODY_GRADE_WORD[c.grade]}</span> },
                { key: 'delta', label: '원본 대비', num: true, cell: (c: ComplexView) => `${c.deltaVsParent > 0 ? '+' : ''}${c.deltaVsParent.toFixed(1)}` },
              ]}
              rows={ranked}
              rowKey={(c) => c.designId}
              rowTone={(_c, i) => (i === 0 ? 'on' : undefined)}
              empty="아직 평가 결과가 없어요."
            />
          </Panel>

          {ranked.map((c) => {
            const d = board.designs.find((x) => x.id === c.designId);
            return (
              <Panel key={c.designId} title={d?.label ?? c.designId} sub={`${termName('fit')} ${c.fit.toFixed(0)} · ${ANTIBODY_GRADE_WORD[c.grade]}`}>
                <p className="ab-score">
                  <b className="ab-score-n">{c.deltaVsParent > 0 ? '+' : ''}{c.deltaVsParent.toFixed(1)}</b>
                  <span className="ab-score-s">원본 대비 적합도 변화</span>
                </p>
                <HBars
                  label="점수 분해"
                  max={100}
                  labelWidth={148}
                  rows={[
                    { label: termName('bindScore'), value: c.bindScore, text: c.bindScore.toFixed(0), tone: 'hi' },
                    {
                      label: '그 가운데 전하쌍으로 번 몫',
                      value: c.chargePairShare * 100,
                      text: `${Math.round(c.chargePairShare * 100)}%`,
                      // 몫은 **상한 적용 전** 비율이에요 — 그래서 상한이 얼마나 깎았는지를 같은 줄에 적어요(§12).
                      note:
                        c.capCutShare > 0
                          ? `전하쌍만으로 점수를 벌지 못하게 잘랐어요 — 접촉 통계 합이 ${Math.round(c.capCutShare * 100)}% 깎였어요`
                          : '전하쌍으로 번 몫이 절반을 넘으면 넘는 만큼 잘라요 — 이 설계는 잘리지 않았어요',
                    },
                    { label: '지킨 계면 자리', value: c.interfaceKept, text: `${c.interfaceKept.toFixed(0)}%` },
                  ]}
                />
                {c.iptm !== undefined && (
                  <p className="mini">
                    복합체 신뢰도 {c.iptm.toFixed(2)} — 실제 복합체 예측을 쓴 결과예요. 위의 적합도 · 붙는 힘 점수에는 들어가지 않아요.
                  </p>
                )}
                <div style={{ marginTop: 10 }}>
                  <MolPanel
                    tabKey={`ab:A5:view:${c.designId}`}
                    table={contactTable(c)}
                    mol={c.pdb ? {
                      pdb: c.pdb,
                      format: 'pdb',
                      paint: { kind: 'chains', roles: board.program.chainRoles ?? { set: '1', H: 'H' } },
                      highlight: [{ chain: board.program.chainRoles?.H ?? 'H', resi: c.contacts.map((x) => x.abResi) }],
                      label: `중쇄 · 경쇄 · 항원 복합체. 고리가 항원과 ${c.contacts.length}곳에서 닿아 있어요.`,
                    } : null}
                  />
                </div>
              </Panel>
            );
          })}

          <AbNotes board={board} stepId="A5" myName={me.account.displayName} save={actions.saveNote} />
          <AbNext step={step} goStep={goStep} />
        </>
      }
    />
  );
}
