/**
 * A6 보고서 · 상장 평가(설계 §6.3) — 대표 후보 하나를 고르고 연구 노트 3칸을 써서 제출해요.
 * 점수 · 기업가치는 **서버가 정해요** — 낙관적으로 미리 보여 주지 않아요(§6.7).
 */
import { useState } from 'react';
import { ANTIBODY_GRADE_WORD, formatCentsAsCrista, type ComplexView, type DesignView } from '@crista-web/web-contract';
import { Confirm, Panel, useBenchState } from '../../board/ui/index.ts';
import { AbHead, AbIslands, AbLocked, AbNotes } from '../AbShell.tsx';
import { DataTable } from '../DataTable.tsx';
import { ScoreCard } from '../ScoreCard.tsx';
import { ValuationCard } from '../ValuationCard.tsx';
import { termName } from '../terms.ts';
import type { AbStepProps } from './index.ts';

export function A6({ board, step, me, actions, mock }: AbStepProps) {
  const evaluated = board.complexes
    .map((c) => ({ complex: c, design: board.designs.find((d) => d.id === c.designId) }))
    .filter((x): x is { complex: ComplexView; design: DesignView } => x.design !== undefined)
    .sort((a, b) => b.complex.fit - a.complex.fit);
  const [pickId, setPick] = useBenchState<string>('ab:A6:pick', evaluated[0]?.design.id ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = evaluated.find((x) => x.design.id === pickId) ?? evaluated[0];
  const cost = board.steps.find((s) => s.id === 'A6')?.costCents ?? 0;

  const run = () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    void actions
      .submit(picked.design.id)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '제출하지 못했어요'))
      .finally(() => {
        setBusy(false);
        setAsk(false);
      });
  };

  return (
    <AbIslands
      ratio="even"
      head={
        <AbHead
          id="A6"
          cost={formatCentsAsCrista(cost)}
          chips={mock ? <span className="chip test">화면 개발용 고정 자료</span> : null}
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            <Panel title="대표 후보 고르기" sub={`${evaluated.length}건 가운데 1건`}>
              {evaluated.length === 0 ? (
                <p className="empty">A5 에서 복합체 평가를 먼저 해요.</p>
              ) : (
                <div className="opts">
                  {evaluated.map(({ design, complex }) => (
                    <button key={design.id} type="button" className="opt" aria-pressed={design.id === picked?.design.id} onClick={() => setPick(design.id)}>
                      <b>{design.label}</b>
                      <span className="muted">{termName('fit')} {complex.fit.toFixed(0)} · {ANTIBODY_GRADE_WORD[complex.grade]}</span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <AbNotes board={board} stepId="A6" myName={me.account.displayName} save={actions.saveNote} />
            <p className="mini muted" style={{ margin: 0 }}>세 칸을 나눠 쓰면 학습 연구비 보상이 ×1.2 가 돼요 — 한 사람이 다 쓰지 않아도 돼요.</p>

            <div className="acts">
              <button type="button" className="btn pri" disabled={busy || !picked || board.best !== undefined} onClick={() => setAsk(true)}>
                대표 후보 제출 <span className="cost">{formatCentsAsCrista(cost)}</span>
              </button>
              <span className="note">{board.best ? '이미 제출했어요.' : '제출하면 점수 · 기업가치가 확정돼요.'}</span>
            </div>
            {error && <p className="err" style={{ marginTop: 8 }}>{error}</p>}

            <Confirm
              open={ask}
              title="대표 후보를 제출할까요?"
              confirmLabel={`${formatCentsAsCrista(cost)} 내고 제출하기`}
              tone="film"
              busy={busy}
              blockedReason={board.balanceCents < cost ? '연구비가 모자라요 — 학습 연구비를 먼저 벌어요.' : null}
              onConfirm={run}
              onCancel={() => setAsk(false)}
            >
              <p>{picked?.design.label} · 되돌릴 수 없어요.</p>
              <p className="mini muted">점수와 기업가치는 서버가 정해요 — 미리 보여 주지 않아요.</p>
            </Confirm>
          </>
        )
      }
      team={
        <>
          <Panel title="보고서">
            <DataTable
              caption="보고서 4섹션 — 표적 · 설계 · 검증 · 대표 후보"
              columns={[
                { key: 'k', label: '섹션', cell: (r: { k: string; v: string }) => <b>{r.k}</b> },
                { key: 'v', label: '내용', cell: (r: { k: string; v: string }) => r.v },
              ]}
              rows={[
                { k: '① 표적 · 원본 항체', v: `${board.program.antigenTarget ?? '—'} · ${board.program.parentAntibodyName ?? '—'} · 참조 구조 ${board.program.referencePdb ?? '—'}` },
                { k: '② 설계', v: `변이체 ${board.designs.filter((d) => d.origin !== 'parent').length}개 · 바꾼 자리 ${board.designs.reduce((s, d) => s + d.mutations.length, 0)}개` },
                { k: '③ 검증', v: `접힘 ${board.folds.length}건 · 복합체 평가 ${board.complexes.length}건` },
                { k: '④ 대표 후보', v: picked ? `${picked.design.label} · ${termName('fit')} ${picked.complex.fit.toFixed(0)} · ${ANTIBODY_GRADE_WORD[picked.complex.grade]}` : '아직 고르지 않았어요' },
              ]}
              rowKey={(r) => r.k}
            />
          </Panel>

          {board.best ? <ScoreCard score={board.best} /> : <p className="empty">제출하면 점수 카드가 보여요.</p>}
          <ValuationCard valuation={board.valuation} classRank={board.classRank} />
        </>
      }
    />
  );
}
