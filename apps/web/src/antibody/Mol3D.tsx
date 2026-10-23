/**
 * 3D 구조 뷰어(설계 §6.4) — 3Dmol.js 2.5.5.
 *
 * - 모듈은 **effect 안에서 `import('3dmol')`** 으로 늦게 내려받아요(574KB · 별도 청크). 타입만 `import type` 으로 가져와요.
 *   깊은 경로(`3dmol/build/…`)는 쓰지 않아요 — strict 설정에서 타입을 못 찾아요.
 * - StrictMode 에서 effect 가 두 번 돌아요 → `dead` 표시 · `viewer.clear()` · `el.replaceChildren()` · `ResizeObserver` 해제를
 *   **반드시** 해요(누수 방지).
 * - 캔버스에 `role="img"` + 지금 상태를 서술하는 `aria-label`. 조작은 **보이는 단추**로 두고 키보드로 쓸 수 있게 해요.
 * - 회전 애니메이션은 `prefers-reduced-motion` 에서 돌지 않아요.
 * - **표 대안 필수**: `MolPanel` 이 3D 탭과 표 탭을 묶고, **폰(≤960px)에서는 표가 기본**이에요.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GLViewer } from '3dmol';
import type { ChainRoles } from '@crista-web/web-contract';
import { Tabs, useLocalTab } from '../board/ui/index.ts';

/** 칠하기 방법 — 서버가 준 값만 쓰고 화면에서 과학값을 만들지 않아요. */
export type MolPaint =
  /** AI 확신도 — PDB B-factor 열(서버가 0~100 으로 올려 보낸 값)로 박막 램프 4단. */
  | { kind: 'confidence' }
  /** 레퍼토리 다양성 — `'체인:잔기번호' → 1~9` 짝. */
  | { kind: 'diversity'; grades: Readonly<Record<string, number>> }
  /** 체인 역할 — 중쇄 · 경쇄 · 항원. 체인 라벨은 서버가 응답으로 내려줘요(하드코딩하지 않아요 · §2.3). */
  | { kind: 'chains'; roles: ChainRoles };

/** 막대로 도드라지게 할 잔기 — 고정 추천 자리 · 계면 잔기. */
export interface MolHighlight {
  chain: string;
  resi: number[];
}

/** 박막 간섭색 4단 — 새 색을 만들지 않아요(§6.5). */
const FILM_RAMP = ['#cdeaff', '#e4ffc0', '#ffe2c2', '#ffd3ea'];

export interface Mol3DProps {
  /** 구조 본문(PDB · mmCIF 글자). */
  pdb: string;
  format: 'pdb' | 'cif';
  paint: MolPaint;
  highlight?: readonly MolHighlight[];
  /** 지금 보이는 것을 서술하는 한 줄 — 화면 낭독기가 읽어요. */
  label: string;
}

export function Mol3D({ pdb, format, paint, highlight, label }: Mol3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const viewer = useRef<GLViewer | null>(null);
  // 값이 매번 새 객체로 와도 effect 가 다시 돌지 않게 고정해요(§6.4).
  const paintKey = useMemo(() => JSON.stringify(paint), [paint]);
  const hiKey = useMemo(() => JSON.stringify(highlight ?? []), [highlight]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    let ro: ResizeObserver | null = null;
    let v: GLViewer | null = null;

    void (async () => {
      try {
        const mol = await import('3dmol');
        if (dead || !host.current) return;
        v = mol.createViewer(host.current, { backgroundColor: '#f1f1e9' });
        viewer.current = v;
        v.addModel(pdb, format === 'cif' ? 'cif' : 'pdb');
        const spec: MolPaint = JSON.parse(paintKey) as MolPaint;
        if (spec.kind === 'confidence') {
          v.setStyle({}, { cartoon: { colorscheme: { prop: 'b', gradient: 'linear', min: 50, max: 90, colors: FILM_RAMP } } });
        } else if (spec.kind === 'diversity') {
          const grades = spec.grades;
          v.setStyle({}, {
            cartoon: {
              colorfunc: (atom: { chain?: string; resi?: number }) =>
                FILM_RAMP[Math.min(3, Math.max(0, Math.round(((grades[`${atom.chain ?? ''}:${atom.resi ?? 0}`] ?? 1) - 1) / 2.67)))] ?? FILM_RAMP[0],
            },
          });
        } else {
          const { H, L, AG } = spec.roles;
          v.setStyle({}, { cartoon: { color: '#5b6358' } });
          v.setStyle({ chain: H }, { cartoon: { color: FILM_RAMP[3] } });
          if (L) v.setStyle({ chain: L }, { cartoon: { color: FILM_RAMP[0] } });
          if (AG) v.setStyle({ chain: AG }, { cartoon: { color: FILM_RAMP[1] } });
        }
        for (const h of JSON.parse(hiKey) as MolHighlight[]) {
          if (h.resi.length > 0) v.addStyle({ chain: h.chain, resi: h.resi }, { stick: { radius: 0.25 } });
        }
        v.zoomTo();
        v.render();
        ro = new ResizeObserver(() => v?.resize());
        ro.observe(host.current);
      } catch (err) {
        if (!dead) setFailed(err instanceof Error ? err.message : '뷰어를 불러오지 못했어요');
      }
    })();

    return () => {
      dead = true;
      ro?.disconnect();
      try {
        v?.clear();
      } catch {
        // 이미 지워진 뷰어 — 넘어가요.
      }
      viewer.current = null;
      el.replaceChildren();
    };
  }, [pdb, format, paintKey, hiKey]);

  // 회전은 모션 줄이기에서 돌지 않아요.
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.spin(spinning && !reduce ? 'y' : false, 0.6);
    return () => {
      try {
        v.spin(false);
      } catch {
        // 이미 지워진 뷰어.
      }
    };
  }, [spinning, pdb]);

  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div>
      {failed ? (
        <p className="empty">3D 뷰어를 불러오지 못했어요 — 옆의 표 탭으로 같은 내용을 볼 수 있어요. ({failed})</p>
      ) : (
        <div className="ab-mol">
          <div ref={host} role="img" aria-label={label} />
        </div>
      )}
      <div className="ab-mol-ctl">
        <button type="button" className="btn sm" aria-pressed={spinning} disabled={!!failed || reduceMotion} onClick={() => setSpinning((s) => !s)}>
          {spinning ? '회전 멈추기' : '회전'}
        </button>
        <button type="button" className="btn sm" disabled={!!failed} onClick={() => viewer.current?.zoom(1.2).render()}>확대</button>
        <button type="button" className="btn sm" disabled={!!failed} onClick={() => viewer.current?.zoom(0.8).render()}>축소</button>
        <button type="button" className="btn sm" disabled={!!failed} onClick={() => viewer.current?.zoomTo().render()}>처음으로</button>
      </div>
      <p className="ab-mol-note">{label}{reduceMotion ? ' · 모션 줄이기가 켜져 있어 회전을 멈춰 뒀어요.' : ''}</p>
    </div>
  );
}

/**
 * 뷰어 + 표 대안 탭(§6.4) — **폰에서는 표 탭이 기본값**이고 데스크톱은 3D 탭이 기본이에요.
 * 3D 탭을 고르기 전에는 뷰어를 아예 붙이지 않아요 → 3Dmol 청크도 그때 내려받아요.
 */
export function MolPanel({ tabKey, table, mol, note }: {
  /** 탭 기억 열쇠 — 예 `ab:A4:view`. */
  tabKey: string;
  /** 표 대안(필수). */
  table: ReactNode;
  /** 3D — 구조가 없으면 null 을 주면 탭이 막혀요. */
  mol: Mol3DProps | null;
  note?: ReactNode;
}) {
  const phone = typeof matchMedia === 'function' ? matchMedia('(max-width: 960px)').matches : false;
  const [tab, setTab] = useLocalTab(tabKey, ['table', 'mol'] as const, phone ? 'table' : 'mol');
  return (
    <div>
      <Tabs
        label="보기 방법"
        size="sm"
        value={tab}
        onChange={(id) => setTab(id as 'table' | 'mol')}
        items={[
          { id: 'table', no: '①', label: '표로 보기' },
          { id: 'mol', no: '②', label: '3D 로 보기', sub: mol ? undefined : '구조 없음', disabled: !mol },
        ]}
      />
      {note}
      {tab === 'mol' && mol ? <Mol3D {...mol} /> : table}
    </div>
  );
}
