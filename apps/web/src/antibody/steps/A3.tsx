/**
 * A3 변이 설계(설계 §6.3 · §6.3.1) — 서열 편집기에서 CDR 글자를 바꾸고(치환만), 바꿀 때마다 무료 미리보기를 봐요.
 *
 * - 치환 후보는 **팝오버가 아니라 섬 아래로 펼치는 판**이에요(폰에서 화면을 덮지 않게 · §6.3.1).
 * - 규칙으로 고른 제안에는 '교육용 근사' 배지가 붙어요 — 딥러닝 설계 계산이 아니에요(§3.3).
 * - 미리보기는 모둠당 분당 횟수 제한이 있어요 — 화면은 글자를 바꾼 뒤에만 다시 불러요.
 * - **CDR 색칠 · 자물쇠 · 자리 번호는 서버가 A2 에서 만든 값**(`board.diversity`)이에요(§12).
 *   A2 를 아직 돌리지 않았으면 색칠 · 자물쇠를 **끄고** 'A2 를 먼저 돌려 주세요'로 안내해요 —
 *   고정 자료의 좌표로 대신 칠하면 서열 길이가 다를 때 자리가 어긋나고, 서버 판정과 어긋나요.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AMINO_ACIDS,
  ANTIBODY_BOLDNESS,
  DESIGN_SLOTS_PER_PERSON,
  type AbChain,
  type AntibodyBoldness,
  type AntibodyMutation,
  type DesignView,
  type PreviewMetrics,
} from '@crista-web/web-contract';
import { Panel, Tabs, useBenchState, useLocalTab } from '../../board/ui/index.ts';
import { By } from '../../board/parts.tsx';
import { AbHead, AbIslands, AbLocked, AbNext, AbNotes } from '../AbShell.tsx';
import { DataTable } from '../DataTable.tsx';
import { SeqEditor } from '../SeqEditor.tsx';
import { applyMutations } from '../mock.ts';
import { termName } from '../terms.ts';
import type { AbStepProps } from './index.ts';

const BOLDNESS_WORD: Record<AntibodyBoldness, string> = { conservative: '보수적', normal: '보통', bold: '과감' };
/** 글자 성질 — 치환 후보 판의 '성질' 칸. */
const NATURE: Record<string, string> = {
  A: '작고 중성', C: '사슬을 묶어요', D: '− 전기', E: '− 전기', F: '기름져요', G: '아주 작아요', H: '약한 + 전기',
  I: '기름져요', K: '+ 전기', L: '기름져요', M: '기름져요 · 산화 주의', N: '물을 좋아해요', P: '고리를 꺾어요',
  Q: '물을 좋아해요', R: '+ 전기', S: '작고 물을 좋아해요', T: '작고 물을 좋아해요', V: '기름져요', W: '크고 기름져요', Y: '크고 반반이에요',
};

export function A3({ board, step, me, actions, goStep, mock }: AbStepProps) {
  const parentVh = board.program.parentVh ?? '';
  const parentVl = board.program.parentVl ?? '';
  const [chain, setChain] = useLocalTab('ab:A3:chain', ['H', 'L'] as const, 'H');
  const [muts, setMuts] = useBenchState<AntibodyMutation[]>('ab:A3:muts', []);
  const [unlocked, setUnlocked] = useBenchState<Record<AbChain, number[]>>('ab:A3:unlocked', { H: [], L: [] });
  const [picked, setPicked] = useState<number | null>(null);
  const [boldness, setBoldness] = useBenchState<AntibodyBoldness>('ab:A3:bold', 'normal');
  const [label, setLabel] = useBenchState<string>('ab:A3:label', '');
  const [suggestions, setSuggestions] = useState<DesignView[] | null>(null);
  const [preview, setPreview] = useState<PreviewMetrics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vh = useMemo(() => applyMutations(parentVh, muts.filter((m) => m.chain === 'H')), [parentVh, muts]);
  const vl = useMemo(() => applyMutations(parentVl, muts.filter((m) => m.chain === 'L')), [parentVl, muts]);
  const seq = chain === 'H' ? vh : vl;
  const parentSeq = chain === 'H' ? parentVh : parentVl;
  // 서버가 A2 에서 만든 다양성 지도 — 없으면 색칠 · 자물쇠를 끄고 안내만 해요(§12).
  const diversity = board.diversity.find((d) => d.chain === chain) ?? null;
  const locks = useMemo(
    () => (diversity ? diversity.suggestedFixed.filter((i) => i >= 0 && i < seq.length) : []),
    [diversity, seq.length],
  );
  const cdrs = useMemo(
    () => (diversity ? diversity.cdrs.filter((c) => c.chain === chain && c.end <= seq.length) : []),
    [diversity, chain, seq.length],
  );
  const numbering = useMemo<Array<[number, string]>>(
    () =>
      diversity && diversity.imgtNumbers.length === seq.length
        ? diversity.imgtNumbers
        : Array.from({ length: seq.length }, (_, i) => [i + 1, ''] as [number, string]),
    [diversity, seq.length],
  );

  // 글자를 바꾸면 무료 미리보기를 다시 봐요(바꾸지 않으면 다시 부르지 않아요).
  // `actions` 는 렌더마다 새 객체라 effect 의 비교 대상에 넣지 않아요(ref 로 들어요) — 넣으면 끝없이 다시 불러요.
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  useEffect(() => {
    let dead = false;
    void actionsRef.current
      .preview(vh, vl)
      .then((next) => {
        if (!dead) setPreview(next);
      })
      .catch((e: unknown) => {
        if (!dead) setError(e instanceof Error ? e.message : '미리보기를 받지 못했어요');
      });
    return () => {
      dead = true;
    };
  }, [vh, vl]);

  const myDesigns = board.designs.filter((d) => d.byName === me.account.displayName && d.origin !== 'parent');
  const slot: 1 | 2 = myDesigns.length === 0 ? 1 : 2;
  const slotFull = myDesigns.length >= DESIGN_SLOTS_PER_PERSON;

  // `i` 는 **0 부터 센** 격자 칸이고 `CdrSpan` 은 **1 부터 센** 자리예요(§12).
  const cdrOf = (i: number) => cdrs.find((c) => i + 1 >= c.start && i + 1 <= c.end)?.cdr;

  // 치환 후보 20개 — 규칙 점수순(교육용 근사). 성질이 비슷하면 점수가 높아요.
  const candidates = useMemo(() => {
    if (picked === null) return [];
    const wt = parentSeq[picked] ?? '';
    return AMINO_ACIDS.split('')
      .filter((aa) => aa !== wt && aa !== 'C')
      .map((aa) => {
        const sameNature = (NATURE[aa] ?? '') === (NATURE[wt] ?? '');
        const makesLiability = /[NDM]/.test(aa);
        const score = (sameNature ? 60 : 40) + (makesLiability ? -12 : 8) + (cdrOf(picked) ? 6 : 0);
        return {
          aa,
          nature: NATURE[aa] ?? '—',
          score,
          why: sameNature ? '원래 글자와 성질이 비슷해요' : makesLiability ? '약점 모티프를 만들 수 있어요' : '성질이 달라져 붙는 방식이 바뀔 수 있어요',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [picked, parentSeq, cdrs]);

  const setMut = (i: number, aa: string) => {
    const wt = parentSeq[i] ?? '';
    const cdr = cdrOf(i);
    setMuts((prev) => {
      const rest = prev.filter((m) => !(m.chain === chain && m.pos === i + 1));
      if (aa === wt) return rest;
      return [...rest, { chain, pos: i + 1, wt, mut: aa, ...(cdr ? { cdr } : {}) }];
    });
  };

  const run = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    void fn()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '실패했어요'))
      .finally(() => setBusy(false));
  };

  const designRows = board.designs;

  return (
    <AbIslands
      ratio="mine"
      head={
        <AbHead
          id="A3"
          chips={
            mock || !diversity ? (
              <>
                {mock && <span className="chip test">연습용 고정 자료</span>}
                {!diversity && <span className="chip test">A2 를 아직 돌리지 않았어요</span>}
              </>
            ) : null
          }
        />
      }
      mine={
        step.state === 'locked' ? <AbLocked step={step} /> : (
          <>
            <Tabs
              label="설계할 사슬"
              value={chain}
              onChange={(id) => {
                setChain(id as AbChain);
                setPicked(null);
              }}
              items={[
                { id: 'H', no: 'H', label: '중쇄', sub: `${muts.filter((m) => m.chain === 'H').length}자리 바꿈` },
                { id: 'L', no: 'L', label: '경쇄', sub: `${muts.filter((m) => m.chain === 'L').length}자리 바꿈` },
              ]}
            />

            {seq.length === 0 && (
              <Panel title="원본 서열이 아직 없어요" tone="hi">
                <p style={{ margin: 0 }}>A1 에서 표적 · 원본 항체를 확정하면 그 항체의 가변영역 서열이 여기로 와요.</p>
              </Panel>
            )}

            <Panel className="ab-seq-panel" title="서열 편집기" sub={`바꾼 자리 ${muts.length}개`}>
              {!diversity && seq.length > 0 && (
                <p className="hint bad">
                  A2 를 먼저 돌려 주세요 — 어느 자리가 고리(CDR)이고 어느 자리를 지켜야 하는지 아직 몰라서,
                  색칠과 자물쇠를 끄고 보여 줘요.
                </p>
              )}
              <SeqEditor
                chain={chain}
                value={seq}
                parent={parentSeq}
                numbering={numbering}
                cdrs={cdrs}
                locks={locks}
                unlocked={unlocked[chain]}
                picked={picked}
                onPick={setPicked}
                onUnlock={(i) => setUnlocked((prev) => ({ ...prev, [chain]: [...prev[chain], i] }))}
                readOnly={busy}
              />
            </Panel>

            {picked !== null && (
              <Panel title={`치환 후보 — ${picked + 1}번 자리 ${parentSeq[picked]}`} sub={cdrOf(picked) ? `${termName('cdr')}${chain}${cdrOf(picked)}` : '뼈대(FR)'}>
                <div className="ab-sub">
                  {candidates.map((c) => (
                    <div key={c.aa} className="ab-sub-r">
                      <b className="ab-sub-a">{c.aa}</b>
                      <span className="mini">{c.nature} · {c.why}</span>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={busy}
                        aria-label={`${picked + 1}번 자리를 ${c.aa} 로 바꾸기 — ${c.nature} · ${c.why}`}
                        onClick={() => setMut(picked, c.aa)}
                      >
                        이 글자로
                      </button>
                    </div>
                  ))}
                </div>
                <div className="acts" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn sm ghost"
                    aria-label={`${picked + 1}번 자리를 원래 글자 ${parentSeq[picked] ?? ''} 로 되돌리기`}
                    onClick={() => setMut(picked, parentSeq[picked] ?? '')}
                  >
                    원래 글자로 되돌리기
                  </button>
                </div>
              </Panel>
            )}

            <Panel title="제안 받기" sub={`과감함 ${BOLDNESS_WORD[boldness]}`}>
              <div className="row">
                {ANTIBODY_BOLDNESS.map((b) => (
                  <button key={b} type="button" className="rchip" aria-pressed={b === boldness} onClick={() => setBoldness(b)}>{BOLDNESS_WORD[b]}</button>
                ))}
                <button type="button" className="btn film" disabled={busy} onClick={() => run(async () => setSuggestions(await actions.suggest(3, boldness)))}>제안 받기</button>
              </div>
              {suggestions && (
                <div className="cards" style={{ marginTop: 8 }}>
                  {suggestions.map((s) => (
                    <div key={s.id} className="card">
                      <div className="card-h">
                        <b>{s.label}</b>
                        <span className="chip">{s.mutations.length}자리</span>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={busy}
                          aria-label={`${s.label} 을 내 편집기로 가져오기 — ${s.mutations.length}자리`}
                          onClick={() => setMuts([...s.mutations])}
                        >
                          내 편집기로 가져오기
                        </button>
                      </div>
                      <p className="mini mono" style={{ margin: 0 }}>{s.mutations.map((m) => `${m.chain}${m.pos} ${m.wt}→${m.mut}`).join(' · ') || '바꾼 자리 없음'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {preview && (
              <Panel title="미리보기" sub="바꿀 때마다 바로 보여요">
                <dl className="ab-kv">
                  <div><dt>{termName('liability')}</dt><dd>{preview.liabilities.length}<small>개</small></dd></div>
                  <div><dt>중쇄 순전하</dt><dd>{preview.chargeVh}</dd></div>
                  <div><dt>{termName('chainCharge')}</dt><dd>{preview.chainChargeProduct ?? '—'}</dd></div>
                  <div><dt>pI</dt><dd>{preview.pi}</dd></div>
                  <div><dt>{termName('greasySurface')}</dt><dd>{Math.round(preview.greasyPercentile * 100)}<small>백분위</small></dd></div>
                  <div><dt>{termName('cdr')} 총길이</dt><dd>{preview.cdrTotalLength}</dd></div>
                  <div><dt>{termName('humanness')}</dt><dd>{preview.humanness.percent}<small>% · 원본 대비 {preview.humanness.deltaVsParent > 0 ? '+' : ''}{preview.humanness.deltaVsParent}</small></dd></div>
                </dl>
                {preview.liabilities.length > 0 && (
                  <div className="chips" style={{ marginTop: 8 }}>
                    {preview.liabilities.slice(0, 8).map((l, i) => (
                      <span key={`${l.chain}${l.pos}-${i}`} className={`chip${l.severity === 'high' ? ' test' : ''}`}>
                        {l.motif} · {l.chain}{l.pos} · {l.fixable === 'easy' ? '고치기 쉬움' : '고치기 어려움'}
                      </span>
                    ))}
                  </div>
                )}
                {preview.riskFlags.filter((r) => r.level !== 'ok').map((r) => (
                  <p key={r.metric} className={`hint${r.level === 'alert' ? ' bad' : ''}`}>{r.level === 'alert' ? '✕' : '!'} {r.note}</p>
                ))}
              </Panel>
            )}

            <Panel title="모둠에 올리기" sub={`내 설계 칸 ${myDesigns.length}/${DESIGN_SLOTS_PER_PERSON}`}>
              <div className="fld">
                <label className="lab" htmlFor="a3-label">이름</label>
                <input id="a3-label" className="txt" value={label} maxLength={20} placeholder={`변이체 ${slot}`} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="acts" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn pri"
                  disabled={busy || muts.length === 0 || slotFull}
                  onClick={() => run(() => actions.addDesign(label || `변이체 ${slot}`, vh, vl, muts, slot))}
                >
                  변이체 올리기
                </button>
                <span className="note">{slotFull ? '내 칸을 다 썼어요 — 올린 변이체를 고쳐 올리면 그 칸이 바뀌어요.' : muts.length === 0 ? '글자를 한 자리 이상 바꿔요.' : '모둠 공유 섬의 비교표에 올라가요.'}</span>
              </div>
              {error && <p className="err" style={{ marginTop: 8 }}>{error}</p>}
            </Panel>
          </>
        )
      }
      team={
        <>
          <Panel title="모둠 변이체 비교표" sub={`${designRows.length - 1}개 + 원본 비교군`}>
            <DataTable
              caption="변이체 비교 — 올린 사람 · 바꾼 자리 · 미리보기 지표"
              columns={[
                { key: 'label', label: '이름', cell: (d: DesignView) => <b>{d.label}</b> },
                { key: 'by', label: '올린 사람', cell: (d: DesignView) => (d.origin === 'parent' ? <span className="chip">📌 비교군</span> : <By name={d.byName ?? null} avatar={null} />) },
                { key: 'muts', label: '바꾼 자리', num: true, cell: (d: DesignView) => d.mutations.length },
                { key: 'eff', label: '점수에 드는 자리', num: true, cell: (d: DesignView) => d.mutations.filter((m) => m.cdr !== undefined).length },
                { key: 'lia', label: termName('liability'), num: true, cell: (d: DesignView) => d.preview?.liabilities.length ?? '—' },
                { key: 'hum', label: termName('humanness'), num: true, cell: (d: DesignView) => (d.preview ? `${d.preview.humanness.percent}%` : '—') },
                { key: 'slot', label: '내 몫', cell: (d: DesignView) => (d.slot ? `${d.slot}/${DESIGN_SLOTS_PER_PERSON}` : '—') },
              ]}
              rows={designRows}
              rowKey={(d) => d.id}
              rowTone={(d) => (d.origin === 'parent' ? 'ref' : d.byName === me.account.displayName ? 'on' : undefined)}
            />
          </Panel>
          <AbNotes board={board} stepId="A3" myName={me.account.displayName} save={actions.saveNote} />
          <AbNext step={step} goStep={goStep} />
        </>
      }
    />
  );
}
