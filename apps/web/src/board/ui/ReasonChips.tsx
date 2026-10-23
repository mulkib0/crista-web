/**
 * 근거 칩 선택기 — 찜 · 제안 · 찬성 · 대기열 · 특허 후보처럼 '근거를 골라야 하는' 행동이 함께 쓴다(설계 §5.5 · §5.6 · §5.7).
 *
 * - 칩을 고르면 부르는 쪽이 판정(`verdict`)을 계산해 넘긴다 — 데이터와 근거를 대조하는 규칙은 기능마다 다르다.
 * - 판정 `block` = 근거가 데이터와 틀림 → 확정 단추를 막는다(빨강 + ✕ 글). `warn` = 주의(노랑 + ! 글) → 할 수 있다. `ok` = 맞음(✓ 글).
 * - 색만으로 말하지 않는다: 판정 줄은 늘 기호 · 글을 같이 쓴다.
 */
import type { ReactNode } from 'react';

export interface ReasonChip {
  id: string;
  label: string;
  /** 칩에 마우스를 올리면 보이는 설명. */
  hint?: string;
  disabled?: boolean;
}

export interface Verdict {
  status: 'ok' | 'warn' | 'block';
  message: string;
}

export const blocks = (v: Verdict | null | undefined): boolean => v?.status === 'block';

const VERDICT_MARK: Record<Verdict['status'], string> = { ok: '✓', warn: '!', block: '✕' };

export interface ReasonChipsProps {
  /** 묶음 이름 — 예: '찜 근거'. */
  legend: string;
  chips: ReasonChip[];
  /** 고른 칩 id — 하나만 고르면 string | null, 여럿이면 string[]. */
  value: string | string[] | null;
  onChange: (next: string | string[] | null) => void;
  /** 여럿 고르기(기본 하나). */
  multiple?: boolean;
  verdict?: Verdict | null;
  /** 확정 단추 — `verdict.status === 'block'` 이거나 칩을 안 골랐으면 막힌다. */
  confirm?: { label: ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; tone?: 'pri' | 'film' };
}

export function ReasonChips({ legend, chips, value, onChange, multiple, verdict, confirm }: ReasonChipsProps) {
  const picked = Array.isArray(value) ? value : value ? [value] : [];
  const toggle = (id: string) => {
    if (multiple) {
      onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    } else {
      onChange(picked.includes(id) ? null : id);
    }
  };
  const blocked = blocks(verdict) || picked.length === 0;
  return (
    <fieldset className="reasons">
      <legend className="lab">{legend}{multiple ? ' · 여럿 고를 수 있어요' : ''}</legend>
      <div className="chips">
        {chips.map((c) => (
          <button key={c.id} type="button" className="rchip" aria-pressed={picked.includes(c.id)} disabled={c.disabled} title={c.hint} onClick={() => toggle(c.id)}>
            {picked.includes(c.id) && <span aria-hidden="true">✓ </span>}{c.label}
          </button>
        ))}
      </div>
      {verdict && (
        <p className={`verdict ${verdict.status}`} role={verdict.status === 'block' ? 'alert' : 'status'}>
          <b aria-hidden="true">{VERDICT_MARK[verdict.status]}</b> {verdict.message}
        </p>
      )}
      {confirm && (
        <div className="acts">
          <button
            type="button"
            className={`btn ${confirm.tone ?? 'pri'}`}
            disabled={blocked || confirm.busy || confirm.disabled}
            onClick={confirm.onClick}
          >
            {confirm.label}
          </button>
          {picked.length === 0 && <span className="note">근거를 하나 골라야 해요.</span>}
          {blocks(verdict) && <span className="note">근거가 데이터와 맞지 않아 막혀 있어요.</span>}
        </div>
      )}
    </fieldset>
  );
}
