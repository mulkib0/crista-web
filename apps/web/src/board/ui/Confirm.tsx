/**
 * 확인 창 — 유료 실행 · 접수 · 확정처럼 되돌리기 어려운 행동 앞에 한 번 묻는다(설계 §6.1 '유료 단계마다 비용 칩과 지출 확인').
 * Esc · 바깥 누르기 = 취소. 열리면 확정 단추에 초점, 닫히면 연 단추로 초점을 돌려준다.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ConfirmProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: string;
  /** 'film' = 박막(확정 · 지정), 'pri' = 잉크(실행 · 과금), 'bad' = 되돌리기 어려움. */
  tone?: 'pri' | 'film' | 'bad';
  busy?: boolean;
  /** 확정을 막는 이유 — 있으면 단추가 막히고 이 글이 보인다. */
  blockedReason?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({ open, title, children, confirmLabel, cancelLabel = '취소', tone = 'pri', busy, blockedReason, onConfirm, onCancel }: ConfirmProps) {
  const id = useId();
  const ok = useRef<HTMLButtonElement>(null);
  const back = useRef<Element | null>(null);
  // 부르는 쪽이 매번 새 함수를 넘겨도 초점을 다시 옮기지 않게 ref 로 든다.
  const cancel = useRef(onCancel);
  cancel.current = onCancel;

  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement;
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel.current();
    };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      if (back.current instanceof HTMLElement) back.current.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-h`} aria-describedby={`${id}-b`}>
        <h2 id={`${id}-h`}>{title}</h2>
        <div id={`${id}-b`} className="confirm-b">{children}</div>
        {blockedReason && <p className="hint bad">✕ {blockedReason}</p>}
        <div className="acts" style={{ marginTop: 16 }}>
          <button ref={ok} type="button" className={`btn ${tone === 'bad' ? 'danger' : tone}`} disabled={busy || !!blockedReason} onClick={onConfirm}>{confirmLabel}</button>
          <button type="button" className="btn" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
}
