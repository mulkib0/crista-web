/**
 * A2 구조 읽기 · 레퍼토리 다양성(설계 §6.3) — 사슬 · CDR 을 나눠 맡아 내 구간의 다양성을 읽고 '내가 고정할 자리 후보'를 올려요.
 *
 * - 이름을 '보존도'로 쓰지 않아요(§2.3 · §10 S18) — 항체 가변영역의 비슷한 서열은 대부분 다른 항체라서, 이 값은 진화적 보존이
 *   아니라 **같은 계열 항체들 사이의 다양성**이에요. 범례도 원문을 가져오지 않고 다시 쓴 문구를 써요(§2.4).
 * - 뷰어에는 **같은 내용의 표**가 늘 함께 있어요(§6.4) — 폰에서는 표가 기본이에요.
 * - 등급 · 백분위 · 고정 추천 · 모은 서열 수 · CDR 구간은 **서버가 A2 작업에서 계산한 값**(`board.diversity`)이에요(§12).
 *   아직 돌리지 않았으면 고정 자료로 대신 채우지 않고 **빈 상태**를 보여 줘요(§3.5).
 * - 서열도 서버가 받은 원본 항체 가변영역(`board.program.parentVh` · `parentVl`)을 써요.
 */
import { useMemo, useState } from 'react';
import { CDR_SCHEMES, DIVERSITY_LOCK_PERCENTILE, type AbChain, type CdrScheme } from '@crista-web/web-contract';
import { Panel, useBenchState } from '../../board/ui/index.ts';
import { AbHead, AbIslands, AbLocked, AbNext, AbNotes } from '../AbShell.tsx';
import { ConsensusPanel } from '../ConsensusPanel.tsx';
import { DataTable } from '../DataTable.tsx';
import { MolPanel } from '../Mol3D.tsx';

import { DIVERSITY_LEGEND, NUMBERING_WORD, termName } from '../terms.ts';
import type { AbStepProps } from './index.ts';

const SCHEME_WORD: Record<CdrScheme, string> = { imgt: 'IMGT', kabat: 'Kabat', chothia: 'Chothia', abm: 'AbM', contact: 'Contact' };
const MY_CDRS = ['H1', 'H2', 'H3', 'L1', 'L2', 'L3'] as const;

const REASONS = [
  { id: 'same', label: '거의 모든 항체가 같은 글자를 써요' },
  { id: 'frame', label: '뼈대(FR) 자리예요' },
  { id: 'cys', label: '사슬을 묶는 자리예요' },
  { id: 'contact', label: '항원과 닿는 자리라 지키고 싶어요' },
  { id: 'length', label: '고리 길이를 유지하고 싶어요' },
];

export function A2({ board, step, me, actions, goStep, mock }: AbStepProps) {
  const [scheme, setScheme] = useBenchState<CdrScheme>('ab:A2:scheme', 'imgt');
  const [cut, setCut] = useBenchState<number>('ab:A2:cut', Math.round(DIVERSITY_LOCK_PERCENTILE * 100));
  const [mySpan, setMySpan] = useBenchState<string>('ab:A2:cdr', 'H3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chain: AbChain = mySpan.startsWith('H') ? 'H' : 'L';
  const cdrNo = Number(mySpan[1]) as 1 | 2 | 3;
  // 서버가 A2 작업에서 만든 값만 써요 — 없으면 '아직 돌리지 않았어요'를 보여 줘요(§12).
  const diversity = board.diversity.find((d) => d.chain === chain) ?? null;
  const seq = (chain === 'H' ? board.program.parentVh : board.program.parentVl) ?? '';
  // 큐에 들어간 A2 작업 — 돌리는 동안 단추를 막아요(끝나면 `antibody.changed` 로 화면이 다시 읽어요).
  const running = (board.jobs ?? []).some((j) => j.step === 'A2' && (j.status === 'queued' || j.status === 'running'));
  const span = diversity?.cdrs.find((c) => c.cdr === cdrNo);
  // 3D 는 **A4 접힘 결과**만 써요. 접힘 구조는 중쇄를 앞에서부터 1번 자리로 번호 매기므로(scFv 도 앞부분이 중쇄예요)
  // 중쇄 다양성을 그 구조에 그대로 칠할 수 있어요. 복합체 구조는 번호축이 레퍼런스 PDB 것이라 칠하면 자리가 어긋나서 쓰지 않아요.
  const fold = [...board.folds].reverse().find((f) => f.pdb) ?? null;

  // 내 담당 구간의 잔기 줄 — 표와 막대가 같은 자료를 써요.
  const rows = useMemo(() => {
    if (!span || !diversity) return [];
    const out: Array<{ i: number; no: string; aa: string; grade: number; pct: number; zone: string; fixed: boolean }> = [];
    // `span.start · end` 는 **1 부터 센** 자리이고 `grades` · `percentiles` · `imgtNumbers` 는 **0 부터 센** 배열이에요(§12).
    for (let pos = span.start; pos <= span.end && pos <= seq.length; pos += 1) {
      const i = pos - 1;
      const grade = diversity.grades[i] ?? 1;
      const pct = diversity.percentiles[i] ?? 0;
      out.push({
        i,
        no: `${diversity.imgtNumbers[i]?.[0] ?? pos}`,
        aa: seq[i] ?? '',
        grade,
        pct,
        zone: `${termName('cdr')}${chain}${cdrNo}`,
        fixed: pct >= 1 - cut / 100,
      });
    }
    return out;
  }, [span, seq, diversity, chain, cdrNo, cut]);

  const suggested = rows.filter((r) => r.fixed);
  // 3D 칠하기 짝 — 열쇠는 **그 구조의 체인 글자**예요(서버가 응답으로 내려줘요 · 화면에서 박지 않아요).
  const hDiversity = board.diversity.find((d) => d.chain === 'H') ?? null;
  const grades = useMemo(() => {
    const map: Record<string, number> = {};
    if (!fold || !hDiversity) return map;
    hDiversity.grades.forEach((g, i) => {
      map[`${fold.chainRoles.H}:${i + 1}`] = g;
    });
    return map;
  }, [fold, hDiversity]);

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    void fn()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '보내지 못했어요'))
      .finally(() => setBusy(false));
  };

  const table = (
    <DataTable
      caption="잔기별 레퍼토리 다양성 — 자리 번호 · 글자 · 등급 · 백분위 · 구간 · 고정 추천"
      columns={[
        { key: 'no', label: '자리 번호', num: true, cell: (r: typeof rows[number]) => <span className="mono">{r.no}</span> },
        { key: 'aa', label: '글자', cell: (r: typeof rows[number]) => <b className="mono">{r.aa}</b> },
        { key: 'g', label: '등급', num: true, cell: (r: typeof rows[number]) => <span className="ab-dv" data-d={r.grade}>{r.grade}</span> },
        { key: 'p', label: '백분위', num: true, cell: (r: typeof rows[number]) => `${Math.round(r.pct * 100)}%` },
        { key: 'z', label: '구간', cell: (r: typeof rows[number]) => r.zone },
        { key: 'f', label: '고정 추천', cell: (r: typeof rows[number]) => (r.fixed ? <span className="chip src">고정</span> : <span className="chip">바꿔도 돼요</span>) },
      ]}
      rows={rows}
      rowKey={(r) => `${r.i}`}
      rowTone={(r) => (r.fixed ? 'on' : undefined)}
      summary={diversity ? `고정 추천 ${suggested.length}개 · 모은 비슷한 항체 ${diversity.msaDepth.toLocaleString('en-US')}개` : undefined}
      empty={diversity ? '담당 구간을 고르면 표가 보여요.' : '분석 작업을 아직 돌리지 않았어요 — 돌리면 자리마다 등급이 생겨요.'}
    />
  );

  return (
    <AbIslands
      head={
        <AbHead
          id="A2"
          chips={
            <>
              <span className="chip">{termName('diversity')}</span>
              <span className="chip">번호축 {SCHEME_WORD[scheme]}</span>
              {mock ? (
                <span className="chip test">연습용 고정 자료</span>
              ) : diversity ? (
                <span className="chip">모은 서열 {diversity.msaDepth.toLocaleString('en-US')}개</span>
              ) : (
                <span className="chip test">아직 돌리지 않았어요</span>
              )}
            </>
          }
          extra={
            diversity?.numberingSource === 'regex-fallback' ? (
              <p className="hint bad">번호 매김이 규칙으로 내려앉았어요 — {NUMBERING_WORD['regex-fallback']}</p>
            ) : null
          }
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            {error && <p className="hint bad" role="alert">{error}</p>}
            {!diversity && (
              <Panel title="아직 돌리지 않았어요" tone="hi">
                <p style={{ margin: 0 }}>
                  이 단계의 분석 작업을 한 번 돌리면 자리마다 등급 · 백분위 · 고정 추천이 생겨요.
                </p>
                <p className="mini muted" style={{ margin: '6px 0 0' }}>
                  작업이 끝나기 전에는 숫자를 보여 주지 않아요 — 연습용 값을 실제 값처럼 보여 주지 않기로 했어요.
                </p>
              </Panel>
            )}
            {/* 분석 작업 돌리기 — A2 는 설계 없이 모둠에 한 번 돌리는 작업이에요(`POST /api/antibody/jobs` 는 A2 에만 designId 를 받지 않아요). */}
            <Panel title={termName('diversity')} sub={running ? '돌리는 중' : diversity ? '읽었어요' : '안 돌렸어요'}>
              <div className="acts">
                <button type="button" className="btn pri" disabled={busy || running} onClick={() => run(() => actions.runJob('A2', ''))}>
                  {diversity ? '다시 읽기' : '다양성 읽기'} <span className="cost">무료</span>
                </button>
                <span className="note">
                  {running
                    ? '큐에 들어갔어요 — 끝나면 자리마다 등급이 채워져요.'
                    : '모둠에 한 번만 돌리면 돼요 — 모둠원 모두가 같은 값을 봐요.'}
                </span>
              </div>
            </Panel>
            <Panel title="읽는 방법 고르기">
              <div className="fld">
                <label className="lab" htmlFor="a2-scheme">{termName('cdr')} 구간을 정하는 번호축</label>
                <select id="a2-scheme" className="txt" value={scheme} onChange={(e) => setScheme(e.target.value as CdrScheme)}>
                  {CDR_SCHEMES.map((s) => <option key={s} value={s}>{SCHEME_WORD[s]}</option>)}
                </select>
                <p className="hint">번호축을 섞으면 구간이 어긋나요 — 고른 축의 숫자만 써요.</p>
              </div>
              <div className="fld">
                <label className="lab" htmlFor="a2-cut">고정 문턱 — 가장 안 바뀌는 상위 {cut}%</label>
                <div className="rng">
                  <input id="a2-cut" type="range" min={10} max={50} step={5} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
                  <output>{cut}%</output>
                </div>
              </div>
              <div className="fld">
                <label className="lab" htmlFor="a2-cdr">내 담당 구간</label>
                <select id="a2-cdr" className="txt" value={mySpan} onChange={(e) => setMySpan(e.target.value)}>
                  {MY_CDRS.map((c) => <option key={c} value={c}>{termName('cdr')}-{c}</option>)}
                </select>
              </div>
              {board.program.chainRoles && (
                <p className="mini muted" style={{ margin: 0 }}>
                  체인 역할 · 중쇄 {board.program.chainRoles.H} · 경쇄 {board.program.chainRoles.L ?? '—'} · 항원 {board.program.chainRoles.AG ?? '—'} · 체인 조 {board.program.chainRoles.set}
                </p>
              )}
            </Panel>

            <Panel title={`내 구간 — ${termName('cdr')}-${mySpan}`} sub={span ? `자리 ${span.start}–${span.end}` : undefined}>
              {rows.length === 0 ? (
                <p className="empty">{diversity ? '이 구간은 아직 읽지 못했어요.' : '분석 작업을 먼저 돌려 주세요.'}</p>
              ) : (
                <>
                  <div className="row" style={{ gap: 2 }}>
                    {rows.map((r) => (
                      <span key={r.i} className="ab-dv" data-d={r.grade} title={`${r.no} ${r.aa} · 등급 ${r.grade}`}>{r.grade}</span>
                    ))}
                  </div>
                  <p className="mini muted" style={{ margin: '8px 0 0' }}>칩 안의 숫자가 등급이에요 — 색에만 기대지 않아요.</p>
                </>
              )}
            </Panel>
          </>
        )
      }
      team={
        <>
          <Panel title={`${termName('diversity')} 보기`} sub={diversity ? NUMBERING_WORD[diversity.numberingSource] : '아직 돌리지 않았어요'}>
            <MolPanel
              tabKey="ab:A2:view"
              table={table}
              mol={
                fold && Object.keys(grades).length > 0
                  ? {
                      pdb: fold.pdb,
                      format: fold.format,
                      paint: { kind: 'diversity', grades },
                      label: '중쇄 접힘 구조. 색이 진한 자리는 비슷한 항체 대부분이 같은 글자를 쓰는 자리예요.',
                    }
                  : null
              }
              note={
                <p className="mini muted" style={{ margin: '6px 0' }}>
                  {fold && Object.keys(grades).length > 0
                    ? 'A4 에서 접은 중쇄 구조에 다양성을 칠했어요 — 경쇄와 복합체 구조는 번호축이 달라 칠하지 않아요. 표에는 같은 내용이 늘 들어 있어요.'
                    : '구조는 A4 접힘을 돌리면 3D 로도 볼 수 있어요 — 표에는 같은 내용이 늘 들어 있어요.'}
                </p>
              }
            />
            <div className="panel" style={{ marginTop: 10 }}>
              <p className="lab" style={{ margin: 0 }}>등급 범례</p>
              <ul className="mini" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {DIVERSITY_LEGEND.map((l) => <li key={l.grade}><b>{l.grade}</b> · {l.text}</li>)}
              </ul>
            </div>
            {/* 3D 칠하기에 쓰는 짝 — 서버 값을 그대로 넘겨요(화면에서 과학값을 만들지 않아요). */}
            <p className="sr">칠하기 자료 {Object.keys(grades).length}자리</p>
          </Panel>

          <ConsensusPanel
            step="A2"
            topic="fixed_positions"
            pick={diversity ? { label: `고정 ${suggested.length}자리`, value: { chain, cdr: cdrNo, positions: suggested.map((r) => r.no) } } : null}
            slot={`${termName('cdr')}-${mySpan}`}
            cards={board.cards}
            proposals={board.proposals}
            myName={me.account.displayName}
            reasons={REASONS}
            memberCount={board.team.memberCount}
            busy={busy}
            onCard={(s, payload, rationale) => run(() => actions.addCard('A2', s, payload, rationale))}
            onPropose={(value, rationale) => run(() => actions.propose('fixed_positions', value, rationale))}
            onVote={(id, choice, version) => run(() => actions.vote(id, choice, version))}
          />

          <AbNotes board={board} stepId="A2" myName={me.account.displayName} save={actions.saveNote} />
          <AbNext step={step} goStep={goStep} />
        </>
      }
    />
  );
}
