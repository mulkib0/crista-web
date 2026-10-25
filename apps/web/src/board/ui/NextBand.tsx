/**
 * 본문 바닥 띠(2026-10-25 '다음' 합의안 03 · 11 · 21) — 왼쪽 = 지금 단계 · 걸음, 오른쪽 = '다음' 단추 하나.
 * 1440 은 두 섬(작업대 + 모둠 공유)을 가로질러 본문 바닥에 붙고(sticky), 폰(≤ 860px)은 화면 바닥에 붙는다 — 스크롤 · 공유 자료 접기와 상관없이 남는다.
 * 트랙에 묶이지 않는다 — 글 · 동작은 부르는 쪽(소분자는 `board/steps/next.ts`)이 정한다. 따로 뜨는 배너 · 창은 쓰지 않는다.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';

export interface BandAction {
  /** 잠김 · 할 일 · 기다림 · 넘어갈 수 있음(라임 — 화면에 하나) · 끝(마지막 단계). */
  tone: 'lock' | 'todo' | 'run' | 'go' | 'end';
  text: string;
  /** 연 사람 — 이름 첫 글자 동그라미. */
  by?: string;
  onClick?: () => void;
}

export function NextBand({ title, where, action, live, label = '다음 단계' }: {
  title: ReactNode;
  where?: ReactNode;
  action: BandAction;
  /** 화면 낭독기 알림(열린 순간 한 번 — 'polite'). */
  live?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 띠 높이를 셸에 알려 준다 — 본문 그리드 마지막 줄(띠 자리) · 화면 바닥 오류 알림이 띠를 피한다.
  useLayoutEffect(() => {
    const el = ref.current;
    const shell = el?.closest<HTMLElement>('.shell');
    if (!el || !shell) return;
    const set = () => shell.style.setProperty('--band-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const inner = (
    <>
      {action.tone === 'run' && <span className="nb-spin" aria-hidden="true" />}
      {action.by && <span className="nb-av" aria-hidden="true">{action.by.slice(0, 1)}</span>}
      <span className="nb-tx">{action.text}</span>
    </>
  );
  return (
    <div className="nband" ref={ref} role="region" aria-label={label}>
      <p className="nb-t"><b>{title}</b>{where && <span>{where}</span>}</p>
      {action.onClick ? (
        <button type="button" className="nb-btn" data-tone={action.tone} onClick={action.onClick}>{inner}</button>
      ) : (
        <span className="nb-btn" data-tone={action.tone}>{inner}</span>
      )}
      <p className="sr" aria-live="polite">{live}</p>
    </div>
  );
}
