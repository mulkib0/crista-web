/**
 * 작업 화면 공용 작은 부품 — 단계 상태 기호 · 섬 안 페이퍼 판(Panel) · 탭(Tabs · 머리 섬 HeadTabs) · 걸음 사슬(WalkChain) · 보기 토글(ViewToggle) · 'AI 심사' 배지(교사 화면).
 * 모양은 시안 21 '둥근 섬'(설계 §5.4.1): 판 16~20px · 탭 12px · 칩 · 작은 단추 알약(999px).
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Avatar, StepView } from '@crista-web/web-contract';

export const AVATAR_LABEL: Record<Avatar, string> = { ceo: 'CEO', cso: 'CSO', cto: 'CTO', cmo: 'CMO' };

/** 상태는 색만으로 말하지 않는다 — 기호 · 글자를 같이 쓴다(설계 §5.4: ✓ 완료 · ▸ 진행 · 🔒 잠김 · ✕ 보류 · ⏸ 막힘). */
export const STATE_MARK: Record<StepView['state'], string> = { done: '✓', running: '▸', ready: '', locked: '🔒', held: '✕', blocked: '⏸', review: '↻' };
export const STATE_WORD: Record<StepView['state'], string> = { done: '완료', running: '진행 중', ready: '할 수 있음', locked: '잠김', held: '보류', blocked: '막힘', review: '다시 보기' };

export function StateMark({ state }: { state: StepView['state'] }) {
  return <span className="st-k" aria-label={STATE_WORD[state]} title={STATE_WORD[state]}>{STATE_MARK[state]}</span>;
}

/**
 * 섬 안의 판. 기본 = 페이퍼(`--bg`) 둥근 판 — '배우는 것' · 노트 칸 · 모아 보기 카드.
 * `plain` = 바탕 없이 섬 위에 바로(그림 · 표). `tone` 은 왼쪽 색 띠 없이 제목 · 글로 알린다(`hi` 만 바탕색).
 */
export function Panel({ title, sub, plain, tone, className, children, id }: {
  title?: ReactNode;
  sub?: ReactNode;
  plain?: boolean;
  tone?: 'good' | 'warn' | 'bad' | 'hi';
  className?: string;
  id?: string;
  children?: ReactNode;
}) {
  const cls = ['panel', plain ? 'plain' : '', tone ? `tone-${tone}` : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls} id={id}>
      {(title || sub) && <h3 className="ptitle">{title}{sub && <small>{sub}</small>}</h3>}
      {children}
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  /** 앞 번호 — ①~⑤ · 6.02 등. 고른 탭에서 라임. */
  no?: string;
  /** 아래 작은 줄(남은 일 · 상태 글). */
  sub?: string;
  /** 상태 기호(✓ 등) — 색 외 표시. */
  mark?: string;
  disabled?: boolean;
}

/**
 * 걸음 · 도구 탭(설계 §5.4.1) — 12px 둥근 칸 · 페이퍼 바탕, 고른 탭 = 잉크 바탕 · 번호 라임.
 * 탭은 개인 상태다(§6.4) — 값은 부르는 쪽이 들고(`useLocalTab`), 서버로 보내지 않는다.
 */
export function Tabs({ items, value, onChange, label, size }: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** 화면 낭독기용 묶음 이름 — 예: '1.2 걸음'. */
  label: string;
  size?: 'sm';
}) {
  return (
    <div className={`stabs${size === 'sm' ? ' sm' : ''}`} role="group" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} type="button" className="stab" aria-pressed={t.id === value} disabled={t.disabled} onClick={() => onChange(t.id)}>
          {t.no && <span className="stab-n">{t.no}</span>}
          <span className="stab-t">{t.label}{t.mark && <span className="stab-k"> {t.mark}</span>}</span>
          {t.sub && <span className="stab-s">{t.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * 머리 섬 걸음 탭(시안 09 '접는 머리 섬') — 머리 한 줄 오른쪽에 투명 칸으로 놓고, 고른 탭 = 라임 바탕.
 * 앞 기호는 상태 기호(✓ · ✕)가 있으면 그것, 없으면 번호. 아래 작은 줄(`sub`)은 보이지 않게 두고 툴팁 · 화면 낭독기로 남긴다.
 * 줄이 넘치면(폰 · 좁은 창) 가로로 넘기고, 고른 탭이 보이게 그 줄만 옆으로 민다(Board 단계 칩 줄과 같은 방법).
 */
export function HeadTabs({ items, value, onChange, label }: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  // 양옆에 더 있으면 그쪽 끝을 흐리게 — 넘길 수 있다는 표시(시안 09 폰 마스크). 끝까지 넘기면 지운다.
  const [more, setMore] = useState<'' | 'l' | 'r' | 'lr'>('');
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const check = () => setMore(`${el.scrollLeft > 2 ? 'l' : ''}${el.scrollLeft + el.clientWidth < el.scrollWidth - 2 ? 'r' : ''}` as typeof more);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [items.length]);
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !on || el.scrollWidth <= el.clientWidth) return;
    const left = on.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft - 8;
    el.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [value]);
  return (
    <div className="htabs" role="group" aria-label={label} ref={row} data-more={more || undefined}>
      {items.map((t) => {
        const sign = t.mark ?? t.no;
        return (
          <button key={t.id} type="button" className="htab" aria-pressed={t.id === value} disabled={t.disabled} onClick={() => onChange(t.id)}
            title={t.sub ? `${t.label} — ${t.sub}` : undefined}>
            {sign && <span className="htab-n">{sign}</span>}
            {t.label}
            {t.sub && <span className="sr"> · {t.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 순서 걸음 사슬(2026-10-25 '다음' 합의안 06 · 폰 27) — ✓ → ✓ → ③ → ④ ⇒ {다음 단계}. 걸음은 누르면 그 탭이 되고,
 * 사슬 끝(`end`)은 표시만 한다 — 넘김 단추는 바닥 띠 하나뿐이다(라임 단추가 둘이 되지 않게).
 * 끝난 걸음은 ✓(또는 `mark`), 남은 걸음은 번호, 지금 걸음은 잉크. 폰(≤ 860px)은 지금 걸음만 이름을 펴고 나머지는 동그라미로 접는다(CSS).
 */
export function WalkChain({ items, value, onChange, label, end }: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  end?: { text: string; open: boolean };
}) {
  return (
    <div className="chain" role="group" aria-label={label}>
      {items.map((t, i) => (
        <Fragment key={t.id}>
          {i > 0 && <span className="chain-a" aria-hidden="true">→</span>}
          <button type="button" className="chain-i" data-walk={t.id} data-mark={t.mark === '✓' ? 'done' : t.mark ? 'bad' : undefined} aria-pressed={t.id === value} disabled={t.disabled} onClick={() => onChange(t.id)}
            title={t.sub ? `${t.label} — ${t.sub}` : t.label}>
            <span className="chain-n">{t.mark ?? t.no}</span>
            <span className="chain-t">{t.label}</span>
            {t.sub && <span className="sr"> · {t.sub}</span>}
          </button>
        </Fragment>
      ))}
      {end && (
        <>
          <span className="chain-a" aria-hidden="true">⇒</span>
          <span className="chain-g" data-open={end.open || undefined}><span className="sr">다음 단계 </span>{end.text}</span>
        </>
      )}
    </div>
  );
}

/** 도구 보기 토글(합의안 06) — 같은 결과를 다르게 보는 나란한 도구. 순서가 아니므로 번호를 달지 않는다. 작업대 머리에 둔다. */
export function ViewToggle({ items, value, onChange, label }: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="vtog" role="group" aria-label={label}>
      <span className="vtog-l" aria-hidden="true">보기</span>
      {items.map((t) => (
        <button key={t.id} type="button" className="vtog-i" data-walk={t.id} aria-pressed={t.id === value} disabled={t.disabled} onClick={() => onChange(t.id)}
          title={t.sub ? `${t.label} — ${t.sub}` : undefined}>
          {t.label}
          {t.mark && <span className="vtog-k"> {t.mark}</span>}
          {t.sub && <span className="sr"> · {t.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/** 'AI 심사' — LLM 이 낸 판단임을 교사 화면에 알린다(설계 §5.11 · §5.13). 학생 화면에서는 2026-10-24 사용자 지시로 쓰지 않는다. */
export function AiBadge({ model, title }: { model?: string; title?: string }) {
  return (
    <span className="abadge ai" title={title ?? (model ? `${model} 이(가) 읽고 판단했어요 — 규칙 검사와 함께 봐요` : 'AI 가 읽고 판단했어요 — 규칙 검사와 함께 봐요')}>
      <i aria-hidden="true">✦</i>AI 심사{model ? <small> · {model}</small> : null}
    </span>
  );
}
