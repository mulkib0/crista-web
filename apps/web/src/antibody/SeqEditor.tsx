/**
 * A3 서열 편집기(설계 §6.3.1) — 좁은 섬 · 폰에서도 성립하는 치수.
 *
 * - **줄바꿈 격자** · 10잔기 묶음 · 셀 **28×28px** · 줄머리에 표준 자리 번호. 폰 360px 에서 한 줄 10칸 · **가로 스크롤 없음**.
 * - 잔기 고르기 세 가지를 모두 받아요: ① 탭 · 클릭 ② 키보드 좌우 · 상하(`roving tabindex` + `aria-activedescendant`)
 *   ③ '자리 번호로 이동' 입력.
 * - 다양성이 낮은 자리는 자물쇠예요. 풀 수 있고, 풀면 위험 표시가 붙어요(§9-10).
 * - **폰 기본은 'CDR 구간만 보기'** — FR 은 접힌 요약 줄로 두고 누르면 펼쳐요. 1차에서는 삽입 · 결손을 받지 않아요(치환만 · §4.1e).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AbChain, CdrSpan } from '@crista-web/web-contract';
import { CHAIN_WORD, termName } from './terms.ts';

const PER_ROW = 10;

export interface SeqEditorProps {
  chain: AbChain;
  /** 지금 서열(치환이 반영된 것). */
  value: string;
  /** 원본 서열 — 바뀐 자리를 표시하려고 함께 받아요. */
  parent: string;
  /** 자리 번호(간격 포함) — `[번호, 삽입문자]`. 길이가 서열과 다르면 번호 대신 순번을 보여요. */
  numbering: readonly [number, string][];
  cdrs: readonly CdrSpan[];
  /** 잠긴 자리(0부터 센 서열 자리). */
  locks: readonly number[];
  /** 학생이 자물쇠를 푼 자리. */
  unlocked: readonly number[];
  /** 지금 고른 자리 — 없으면 null. */
  picked: number | null;
  onPick: (index: number | null) => void;
  onUnlock: (index: number) => void;
  /** 편집을 받지 않을 때(잠긴 단계 · 저장 중). */
  readOnly?: boolean;
}

export function SeqEditor({ chain, value, parent, numbering, cdrs, locks, unlocked, picked, onPick, onUnlock, readOnly }: SeqEditorProps) {
  const phone = typeof matchMedia === 'function' ? matchMedia('(max-width: 960px)').matches : false;
  const [cdrOnly, setCdrOnly] = useState(phone);
  const [jump, setJump] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  const lockSet = useMemo(() => new Set(locks), [locks]);
  const openSet = useMemo(() => new Set(unlocked), [unlocked]);
  // `CdrSpan.start · end` 는 **1 부터 센** 자리이고 격자 칸은 **0 부터** 세요 — 여기서 한 번만 옮겨요(§12).
  const cdrOf = useMemo(() => {
    const map = new Map<number, number>();
    for (const span of cdrs) {
      if (span.chain !== chain) continue;
      for (let pos = span.start; pos <= span.end; pos += 1) {
        const i = pos - 1;
        if (i >= 0 && i < value.length) map.set(i, span.cdr);
      }
    }
    return map;
  }, [cdrs, chain, value.length]);

  const numberAt = (i: number): string => {
    const hit = numbering[i];
    return hit ? `${hit[0]}${hit[1]}` : `${i + 1}`;
  };

  // 보여 줄 줄 — CDR 구간만 보기면 CDR 이 들어 있는 10칸 묶음만 펼치고 나머지는 접은 요약 줄로.
  const rows = useMemo(() => {
    const out: Array<{ from: number; to: number; folded: boolean }> = [];
    for (let from = 0; from < value.length; from += PER_ROW) {
      const to = Math.min(value.length, from + PER_ROW);
      let hasCdr = false;
      for (let i = from; i < to; i += 1) if (cdrOf.has(i)) hasCdr = true;
      out.push({ from, to, folded: cdrOnly && !hasCdr });
    }
    // 이어지는 접힌 줄은 하나로 묶어요.
    const merged: Array<{ from: number; to: number; folded: boolean }> = [];
    for (const row of out) {
      const last = merged[merged.length - 1];
      if (row.folded && last?.folded) last.to = row.to;
      else merged.push({ ...row });
    }
    return merged;
  }, [value.length, cdrOf, cdrOnly]);

  // 고른 자리가 보이게 — 접혀 있으면 펼쳐요.
  useEffect(() => {
    if (picked === null) return;
    const el = grid.current?.querySelector<HTMLElement>(`[data-i="${picked}"]`);
    if (!el && cdrOnly) setCdrOnly(false);
    else el?.focus({ preventScroll: false });
  }, [picked, cdrOnly]);

  const move = (from: number, delta: number) => {
    const next = Math.min(value.length - 1, Math.max(0, from + delta));
    onPick(next);
  };

  const gridId = `seq-${chain}`;
  return (
    <div className="ab-seq">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>{CHAIN_WORD[chain]} · {value.length}잔기</b>
        <button type="button" className="btn sm" aria-pressed={cdrOnly} onClick={() => setCdrOnly((v) => !v)}>
          {cdrOnly ? '전체 보기' : `${termName('cdr')} 구간만 보기`}
        </button>
      </div>

      <div className="ab-seq-jump">
        <label className="lab" htmlFor={`${gridId}-jump`} style={{ margin: 0 }}>자리 번호로 이동</label>
        <input
          id={`${gridId}-jump`}
          className="txt mono"
          inputMode="numeric"
          value={jump}
          onChange={(e) => {
            setJump(e.target.value);
            setJumpError(null);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const want = jump.trim().toUpperCase();
            const hit = numbering.findIndex(([no, ins]) => `${no}${ins}`.toUpperCase() === want || `${no}` === want);
            if (hit < 0 || hit >= value.length) setJumpError('그 번호는 이 사슬에 없어요.');
            else {
              setCdrOnly(false);
              onPick(hit);
            }
          }}
        />
        <span className="mini muted">번호를 치고 Enter</span>
      </div>
      {jumpError && <p className="hint bad">{jumpError}</p>}

      <div
        ref={grid}
        role="grid"
        aria-label={`${CHAIN_WORD[chain]} 서열 — 한 줄 ${PER_ROW}칸`}
        aria-activedescendant={picked === null ? undefined : `${gridId}-c${picked}`}
      >
        {rows.map((row) =>
          row.folded ? (
            // 접힌 뼈대 줄도 **줄**이에요 — `role="grid"` 의 직계 자식은 `role="row"` 여야 해요(§12).
            <div key={`f${row.from}`} className="ab-seq-fold" role="row">
              <button
                type="button"
                role="gridcell"
                className="ab-seq-fr"
                onClick={() => setCdrOnly(false)}
              >
                뼈대(FR) {numberAt(row.from)}–{numberAt(row.to - 1)} · {row.to - row.from}잔기 · 고정 — 눌러서 펼쳐요
              </button>
            </div>
          ) : (
            // 칸은 줄의 **직계 자식**이에요 — 중간에 역할 없는 상자를 끼우면 화면 낭독기가
            // '몇 번째 줄 몇 번째 칸'을 못 읽어요(§12). 자리잡기는 `.ab-seq-row` 격자가 해요.
            <div key={row.from} className="ab-seq-row" role="row">
              <span className="ab-seq-no" role="rowheader">{numberAt(row.from)}</span>
              {Array.from({ length: row.to - row.from }, (_, k) => {
                  const i = row.from + k;
                  const locked = lockSet.has(i) && !openSet.has(i);
                  const aa = value[i] ?? '';
                  const cdr = cdrOf.get(i);
                  const changed = parent[i] !== undefined && parent[i] !== aa;
                  return (
                    <button
                      key={i}
                      id={`${gridId}-c${i}`}
                      type="button"
                      role="gridcell"
                      className="ab-cell"
                      data-i={i}
                      data-cdr={cdr ? '1' : '0'}
                      data-lock={locked ? '1' : '0'}
                      data-unlocked={openSet.has(i) ? '1' : '0'}
                      data-mut={changed ? '1' : '0'}
                      aria-selected={picked === i}
                      tabIndex={picked === i || (picked === null && i === row.from && row.from === 0) ? 0 : -1}
                      disabled={readOnly}
                      aria-label={`${numberAt(i)} ${aa}${cdr ? ` · ${termName('cdr')}${chain}${cdr}` : ' · 뼈대'}${locked ? ' · 잠김 — 비슷한 항체 대부분이 같은 글자를 쓰는 자리예요' : ''}${changed ? ` · ${parent[i]} 에서 바꿨어요` : ''}`}
                      onClick={() => onPick(picked === i ? null : i)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') { e.preventDefault(); move(i, 1); }
                        else if (e.key === 'ArrowLeft') { e.preventDefault(); move(i, -1); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); move(i, PER_ROW); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); move(i, -PER_ROW); }
                        else if (e.key === 'Home') { e.preventDefault(); onPick(0); }
                        else if (e.key === 'End') { e.preventDefault(); onPick(value.length - 1); }
                      }}
                    >
                      {aa}
                    </button>
                  );
                })}
            </div>
          ),
        )}
      </div>

      {picked !== null && lockSet.has(picked) && !openSet.has(picked) && (
        <p className="hint">
          🔒 {numberAt(picked)} 는 비슷한 항체 대부분이 같은 글자를 쓰는 자리예요 — 바꾸면 구조가 흔들릴 수 있어요.{' '}
          <button type="button" className="btn sm" disabled={readOnly} onClick={() => onUnlock(picked)}>그래도 풀기</button>
        </p>
      )}
    </div>
  );
}
