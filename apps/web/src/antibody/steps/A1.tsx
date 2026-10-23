/**
 * A1 표적 항원 · 원본 항체(설계 §6.3) — 내 작업대에서 분담한 몫을 조회해 추천 카드를 올리고, 모둠 공유 섬에서 카드를 견준 뒤
 * 제안 · 과반 투표로 표적 · 원본 항체 · 참조 구조를 확정해요.
 *
 * 1인 1몫(§2.1) — 모둠원이 표적을 나눠 맡아요. 내 몫은 이름 순서로 돌아가게 뽑아요(서버가 분담을 정하면 그 값을 써요).
 *
 * **표는 서버가 채워요**(§12) — `GET /api/antibody/catalog` 가 ChEMBL · RCSB 에서 받은 값을 그대로 그려요.
 * 고정 자료(`mock.ts` 의 `CATALOG`)는 `?mock=1` 일 때만 써요. 조회가 실패하면 빈 상태를 보여 주고,
 * 지어낸 숫자로 자리를 채우지 않아요(§3.5).
 */
import { useMemo, useState } from 'react';
import {
  ANTIBODY_API,
  type AntibodyCatalogResponse,
  type AntibodyCatalogTarget,
  type ChainRoles,
} from '@crista-web/web-contract';
import { useBenchState, useLive, Panel } from '../../board/ui/index.ts';
import { AbHead, AbIslands, AbLocked, AbNext, AbNotes } from '../AbShell.tsx';
import { ConsensusPanel } from '../ConsensusPanel.tsx';
import { DataTable } from '../DataTable.tsx';
import { MOCK_CATALOG_TARGETS } from '../mock.ts';
import type { AbStepProps } from './index.ts';

const REASONS = [
  { id: 'phase', label: '임상 단계가 높아요', hint: '이미 사람에게 쓰이는 항체예요' },
  { id: 'structure', label: '항원이 들어 있는 구조가 있어요', hint: '계면을 볼 수 있어야 A5 평가가 돼요' },
  { id: 'resolution', label: '구조 해상도가 좋아요' },
  { id: 'seq', label: '사슬 서열을 받을 수 있어요' },
  { id: 'disease', label: '우리가 다루려는 질환과 맞아요' },
];

const rolesText = (roles: ChainRoles): string =>
  `H=${roles.H} · L=${roles.L ?? '—'} · 항원=${roles.AG ?? '—'}`;

type AbRow = AntibodyCatalogTarget['antibodies'][number];

export function A1({ board, step, me, actions, goStep, mock }: AbStepProps) {
  // 서버 표 — `?mock=1` 이면 부르지 않아요.
  const live = useLive<AntibodyCatalogResponse>(mock ? null : ANTIBODY_API.catalog);
  const targets: readonly AntibodyCatalogTarget[] = useMemo(
    () => (mock ? MOCK_CATALOG_TARGETS : (live.data?.targets ?? [])),
    [mock, live.data],
  );

  const [pickId, setPick] = useBenchState<string>('ab:A1:pick', board.program.antigenTarget ?? '');
  const [abId, setAbId] = useBenchState<string>('ab:A1:ab', board.program.parentAntibodyChemblId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const picked = targets.find((t) => t.targetChemblId === pickId || t.target === pickId) ?? targets[0] ?? null;
  // 원본 항체 — 서버가 준 목록에서 고르고, 고르지 않았으면 설계서가 확인한 짝을 기본값으로 둬요.
  const abRows: AbRow[] = useMemo(() => {
    if (!picked) return [];
    if (picked.antibodies.length > 0) return picked.antibodies;
    // ChEMBL 조회가 실패한 경우 — 설계서 §2.3 이 확인한 짝 한 줄만 둬요(숫자는 비워요).
    return [
      {
        chemblId: picked.suggestedAntibody.chemblId,
        name: picked.suggestedAntibody.name,
        firstApproval: null,
        maxPhase: null,
        maxPhaseRaw: null,
        withdrawn: false,
        hasSequence: true,
      },
    ];
  }, [picked]);
  const parent = abRows.find((r) => r.chemblId === abId) ?? abRows.find((r) => r.chemblId === picked?.suggestedAntibody.chemblId) ?? abRows[0] ?? null;
  const roleSet = picked?.suggestedPdb.sets[0] ?? null;

  // 확정된 표적은 저장 값이 ChEMBL 번호예요 — 학생 화면에는 **이름**으로 보여 주고, 표가 없으면 번호를 그대로 적어요.
  const confirmedTargetName =
    targets.find((t) => t.targetChemblId === board.program.antigenTarget)?.target ?? board.program.antigenTarget ?? '—';

  // 내 몫 — 모둠원 수로 표적을 나눠요. 서버가 분담을 내려주면 그 값으로 바꿔요.
  const slot = picked?.target ?? '—';

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    void fn()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '보내지 못했어요'))
      .finally(() => setBusy(false));
  };

  // 서버 계약 그대로 보내요(§5.5 `AntibodyProgramRequest`) — 열쇠 이름이 다르면 400 이에요.
  const pickValue =
    picked && parent && roleSet
      ? {
          antigenTarget: picked.targetChemblId,
          parentAntibodyChemblId: parent.chemblId,
          referencePdb: picked.suggestedPdb.pdb,
          chainRoles: roleSet,
        }
      : null;

  return (
    <AbIslands
      head={
        <AbHead
          id="A1"
          chips={
            <>
              {mock ? (
                <span className="chip test">연습용 고정 자료</span>
              ) : (
                <span className="chip">{live.loading ? '표를 받는 중이에요' : `표적 ${targets.length}종`}</span>
              )}
            </>
          }
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            {error && <p className="hint bad" role="alert">{error}</p>}
            {!mock && live.error && (
              <p className="hint bad" role="alert">표적 표를 받지 못했어요 — {live.error.message}</p>
            )}

            <Panel title="내 분담 몫" sub={`표적 ${slot}`}>
              <p className="mini muted" style={{ margin: '0 0 8px' }}>모둠원이 표적을 나눠 맡아요 — 내 몫을 조회해 카드로 올려요.</p>
              {targets.length === 0 ? (
                <p className="empty">{live.loading ? '표적 표를 받는 중이에요.' : '표적 표를 받지 못했어요 — 잠시 뒤 다시 열어 주세요.'}</p>
              ) : (
                <div className="opts">
                  {targets.map((t) => (
                    <button
                      key={t.targetChemblId}
                      type="button"
                      className="opt"
                      aria-pressed={t.targetChemblId === picked?.targetChemblId}
                      onClick={() => {
                        setPick(t.targetChemblId);
                        setAbId(t.suggestedAntibody.chemblId);
                      }}
                    >
                      <b>{t.target}</b>
                      <span className="muted">{t.targetChemblId}</span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="원본 항체" sub={picked ? picked.target : undefined}>
              <DataTable<AbRow>
                caption="항체 표 — 이름 · 최대 임상단계 · 최초 승인연도 · 서열 보유 · 항체 번호"
                columns={[
                  {
                    key: 'ab',
                    label: '이름',
                    cell: (r) => (
                      <button
                        type="button"
                        className="btn sm"
                        aria-pressed={r.chemblId === parent?.chemblId}
                        aria-label={`${r.name} 을 원본 항체로 고르기`}
                        onClick={() => setAbId(r.chemblId)}
                      >
                        {r.name}
                      </button>
                    ),
                  },
                  { key: 'phase', label: '최대 임상단계', num: true, cell: (r) => r.maxPhaseRaw ?? (r.maxPhase === null ? '—' : String(r.maxPhase)) },
                  { key: 'year', label: '최초 승인', num: true, cell: (r) => (r.firstApproval === null ? '—' : r.firstApproval) },
                  { key: 'seq', label: '사슬 서열', cell: (r) => (r.hasSequence ? <span className="chip">받을 수 있어요</span> : <span className="chip test">없어요</span>) },
                  { key: 'id', label: '항체 번호', cell: (r) => <span className="mono mini">{r.chemblId}</span> },
                ]}
                rows={abRows}
                rowKey={(r) => r.chemblId}
                rowTone={(r) => (r.chemblId === parent?.chemblId ? 'on' : undefined)}
                empty={live.loading ? '항체 표를 받는 중이에요.' : '항체 표를 받지 못했어요.'}
                summary={parent ? `고른 원본 항체 · ${parent.name}` : undefined}
              />
              <p className="mini muted" style={{ margin: '6px 0 0' }}>사슬 길이 · 서열은 확정 뒤 A2 · A3 에서 받아요.</p>
            </Panel>

            <Panel title="구조 후보">
              <DataTable<ChainRoles>
                caption="구조 후보 — 번호 · 해상도 · 체인 조 · 체인 역할"
                columns={[
                  { key: 'pdb', label: '구조 번호', cell: () => <b className="mono">{picked?.suggestedPdb.pdb ?? '—'}</b> },
                  {
                    key: 'res',
                    label: '해상도(Å)',
                    num: true,
                    cell: () => (picked?.suggestedPdb.resolutionAngstrom == null ? '—' : picked.suggestedPdb.resolutionAngstrom.toFixed(3)),
                  },
                  { key: 'set', label: '체인 조', cell: (r) => r.set },
                  { key: 'roles', label: '체인 역할', cell: (r) => <span className="mono mini">{rolesText(r)}</span> },
                  { key: 'ag', label: '항원', cell: (r) => (r.AG ? <span className="chip">항원 포함</span> : <span className="chip test">항원 없어요</span>) },
                ]}
                rows={picked?.suggestedPdb.sets ?? []}
                rowKey={(r, i) => `${r.set}-${i}`}
                rowTone={(_r, i) => (i === 0 ? 'on' : undefined)}
                empty={live.loading ? '구조 후보를 받는 중이에요.' : '구조 후보를 받지 못했어요.'}
                summary="항원이 함께 들어 있는 구조만 둬요 — 항체만 들어 있는 구조로는 A5 에서 계면을 볼 수 없어요. 계면은 첫 체인 조로 읽어요."
              />
            </Panel>
          </>
        )
      }
      team={
        <>
          <ConsensusPanel
            step="A1"
            topic="program"
            pick={
              picked && parent && pickValue
                ? { label: `${picked.target} · ${parent.name} · ${picked.suggestedPdb.pdb}`, value: pickValue }
                : null
            }
            slot={slot}
            cards={board.cards}
            proposals={board.proposals}
            myName={me.account.displayName}
            reasons={REASONS}
            memberCount={board.team.memberCount}
            busy={busy}
            onCard={(s, payload, rationale) => run(() => actions.addCard('A1', s, payload, rationale))}
            onPropose={(value, rationale) => run(() => actions.propose('program', value, rationale))}
            onVote={(id, choice, version) => run(() => actions.vote(id, choice, version))}
          />
          {board.program.antigenTarget && (
            <Panel title="확정된 프로그램" tone="hi">
              <p style={{ margin: 0 }}>
                표적 <b>{board.program.antigenTarget}</b> · 원본 항체 <b>{board.program.parentAntibodyName ?? '—'}</b> · 참조 구조 <b className="mono">{board.program.referencePdb ?? '—'}</b>
              </p>
              {board.program.chainRoles && (
                <p className="mini" style={{ margin: '4px 0 0' }}>
                  체인 조 {board.program.chainRoles.set} · 중쇄 {board.program.chainRoles.H} · 경쇄 {board.program.chainRoles.L ?? '—'} · 항원 {board.program.chainRoles.AG ?? '—'}
                </p>
              )}
            </Panel>
          )}
          <AbNotes board={board} stepId="A1" myName={me.account.displayName} save={actions.saveNote} />
          <AbNext step={step} goStep={goStep} />
        </>
      }
    />
  );
}
