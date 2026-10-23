/**
 * A4 접힘 예측(설계 §6.3) — 변이체를 접어 보고 구간별 AI 확신도를 읽어요.
 *
 * - 모둠 공유 섬이 **가장 먼저** 말해요: 이 모델은 서열 하나만 보기 때문에 변이체 사이 평균 확신도 차이가 거의 없어요.
 *   그래서 이 단계는 **무료**예요(§10 S15).
 * - 확신도는 '정확도'가 아니라 **모델의 자기 확신 점수**예요 — 배지와 카드 글에 늘 함께 적어요.
 * - 길이 상한을 설계 규칙으로 배워요 — 가변영역 또는 링커로 이은 한 사슬 400 잔기까지예요.
 */
import { useState } from 'react';
import { CONFIDENCE_MIN_FOR_COMPLEX, ESMFOLD_MAX_RESIDUES, SCFV_LINKER, type FoldShape, type FoldView } from '@crista-web/web-contract';
import { Confirm, HBars, Panel, useBenchState } from '../../board/ui/index.ts';
import { AbHead, AbIslands, AbLocked, AbNext, AbNotes } from '../AbShell.tsx';
import { DataTable } from '../DataTable.tsx';
import { MolPanel } from '../Mol3D.tsx';
import { termName } from '../terms.ts';
import type { AbStepProps } from './index.ts';

export function A4({ board, step, me, actions, goStep, mock }: AbStepProps) {
  const mine = board.designs.filter((d) => d.origin !== 'parent');
  const [designId, setDesignId] = useBenchState<string>('ab:A4:design', mine[0]?.id ?? '');
  const [shape, setShape] = useBenchState<FoldShape>('ab:A4:shape', 'fv');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const design = mine.find((d) => d.id === designId) ?? mine[0];
  const residues = design ? (shape === 'scfv' ? design.vh.length + SCFV_LINKER.length + (design.vl?.length ?? 0) : Math.max(design.vh.length, design.vl?.length ?? 0)) : 0;
  const tooLong = residues > ESMFOLD_MAX_RESIDUES;
  const myFold = board.folds.find((f) => f.designId === design?.id);
  const quota = board.myQuota.fold;

  const run = () => {
    if (!design) return;
    setBusy(true);
    setError(null);
    void actions
      .runJob('A4', design.id, { shape })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '실행하지 못했어요'))
      .finally(() => {
        setBusy(false);
        setAsk(false);
      });
  };

  const segTable = (fold: FoldView) => (
    <DataTable
      caption="구간별 AI 확신도 — 뼈대와 고리를 나눠서 봐요"
      columns={[
        { key: 'label', label: '구간', cell: (r: FoldView['bySegment'][number]) => r.label },
        { key: 'range', label: '자리', cell: (r: FoldView['bySegment'][number]) => <span className="mono">{r.start}–{r.end}</span> },
        { key: 'mean', label: '확신도', num: true, cell: (r: FoldView['bySegment'][number]) => r.mean.toFixed(0) },
        { key: 'mark', label: '기준', cell: (r: FoldView['bySegment'][number]) => (r.mean >= 90 ? <span className="ab-grade" data-g="great">✓ 아주 높음</span> : r.mean >= CONFIDENCE_MIN_FOR_COMPLEX ? <span className="ab-grade" data-g="good">✓ 쓸 수 있음</span> : <span className="ab-grade" data-g="fair">! 낮음</span>) },
      ]}
      rows={fold.bySegment}
      rowKey={(r) => r.label}
      rowTone={(r) => (r.label.includes('H3') ? 'on' : undefined)}
      summary={`평균 ${fold.confidenceMean.toFixed(0)} · 가장 긴 고리 구간 ${fold.confidenceCdrH3.toFixed(0)} · 기준선 90 · ${CONFIDENCE_MIN_FOR_COMPLEX}`}
    />
  );

  return (
    <AbIslands
      head={
        <AbHead
          id="A4"
          chips={
            <>
              <span className="chip">{termName('confidence')} — 모델의 자기 확신 점수예요</span>
              {mock && <span className="chip test">화면 개발용 고정 자료</span>}
            </>
          }
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            <Panel title="접을 변이체" sub={`내 몫 ${quota.used}/${quota.max}`}>
              {mine.length === 0 ? (
                <p className="empty">A3 에서 변이체를 먼저 올려요.</p>
              ) : (
                <div className="opts">
                  {mine.map((d) => (
                    <button key={d.id} type="button" className="opt" aria-pressed={d.id === design?.id} onClick={() => setDesignId(d.id)}>
                      <b>{d.label}</b>
                      <span className="muted">{d.byName ?? '—'} · {d.mutations.length}자리</span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="사슬 모양">
              <div className="row">
                <button type="button" className="rchip" aria-pressed={shape === 'fv'} onClick={() => setShape('fv')}>사슬을 따로 접기</button>
                <button type="button" className="rchip" aria-pressed={shape === 'scfv'} onClick={() => setShape('scfv')}>링커로 이어 한 번에({SCFV_LINKER})</button>
              </div>
              <p className="hint">두 사슬을 그냥 붙여 보낼 수는 없어요 — 따로 접거나 링커로 이어야 해요.</p>
            </Panel>

            <Panel title="길이 계산기" tone={tooLong ? 'bad' : undefined}>
              <HBars
                label="접을 잔기 수"
                max={ESMFOLD_MAX_RESIDUES}
                labelWidth={96}
                rows={[{ label: '지금 잔기 수', value: residues, text: `${residues} / ${ESMFOLD_MAX_RESIDUES}`, ...(tooLong ? {} : { tone: 'hi' as const }) }]}
              />
              {tooLong && (
                <p className="err" style={{ marginTop: 8 }}>
                  설계 범위를 벗어났어요 — 이 랩은 가변영역 또는 링커로 이은 한 사슬 {ESMFOLD_MAX_RESIDUES} 잔기까지 접어요. 전장 사슬은 접지 않아요.
                </p>
              )}
            </Panel>

            <div className="acts">
              <button type="button" className="btn pri" disabled={busy || !design || tooLong || quota.used >= quota.max} onClick={() => setAsk(true)}>
                접어 보기 <span className="cost">무료</span>
              </button>
              <span className="note">{quota.used >= quota.max ? '내 몫을 다 썼어요 — 모둠원이 다른 변이체를 접어요.' : '큐에 들어가요 — 보통 10~30초 걸려요.'}</span>
            </div>
            {error && <p className="err" style={{ marginTop: 8 }}>{error}</p>}

            <Confirm
              open={ask}
              title="이 변이체를 접어 볼까요?"
              confirmLabel="접어 보기"
              tone="pri"
              busy={busy}
              onConfirm={run}
              onCancel={() => setAsk(false)}
            >
              <p>{design?.label} · {shape === 'scfv' ? '링커로 이어 한 번에' : '사슬을 따로'} · {residues}잔기</p>
            </Confirm>
          </>
        )
      }
      team={
        <>
          {board.folds.length === 0 ? (
            <p className="empty">아직 접힘 결과가 없어요 — 모둠원이 각자 하나씩 접어 봐요.</p>
          ) : (
            board.folds.map((fold) => {
              const d = board.designs.find((x) => x.id === fold.designId);
              return (
                <Panel key={fold.designId} title={d?.label ?? fold.designId} sub={`평균 ${fold.confidenceMean.toFixed(0)}`}>
                  <MolPanel
                    tabKey={`ab:A4:view:${fold.designId}`}
                    table={segTable(fold)}
                    mol={{
                      pdb: fold.pdb,
                      format: fold.format,
                      paint: { kind: 'confidence' },
                      label: `${d?.label ?? '변이체'} 접힘 구조. 평균 ${termName('confidence')} ${fold.confidenceMean.toFixed(0)}, 가장 긴 고리 구간 ${fold.confidenceCdrH3.toFixed(0)}.`,
                    }}
                  />
                  <HBars
                    label="확신도 요약"
                    max={100}
                    labelWidth={132}
                    rows={[
                      { label: '평균', value: fold.confidenceMean, text: fold.confidenceMean.toFixed(0) },
                      { label: `${termName('cdr')}-H3 구간`, value: fold.confidenceCdrH3, text: fold.confidenceCdrH3.toFixed(0), tone: 'hi' },
                    ]}
                  />
                  <p className="mini muted" style={{ margin: '6px 0 0' }}>기준선 90 · {CONFIDENCE_MIN_FOR_COMPLEX} — {CONFIDENCE_MIN_FOR_COMPLEX} 밑이면 A5 복합체 평가에서 빠져요.</p>
                </Panel>
              );
            })
          )}

          <AbNotes board={board} stepId="A4" myName={me.account.displayName} save={actions.saveNote} />
          <AbNext step={step} goStep={goStep} />
        </>
      }
    />
  );
}
