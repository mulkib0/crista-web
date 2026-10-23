/**
 * 출처 배지(설계 §3.5) — 모든 지표 카드에 하나씩 달아요. 배지 없는 카드는 만들지 않아요(묶음 5 완료 조건).
 *
 * - `approx: true` 면 배지에 **'교육용 근사'** 글자가 반드시 함께 보여요(서버 `label` 과 상관없이 화면이 보장해요).
 * - 누르면 상세(산식 · 엔드포인트 · 수집일 · 걸린 시간)를 펼쳐요 — 원어 대조는 묶음 6 의 '점수 계산 방법' 페이지가 맡아요.
 * - 색만으로 말하지 않아요: 근사 배지는 기호 `≈` + 글자, 실측 배지는 `●` + 글자예요.
 */
import { useId, useState } from 'react';
import type { Provenance } from '@crista-web/web-contract';
import { SOURCE_WORD } from './terms.ts';

export function Badge({ provenance, context }: {
  provenance: Provenance;
  /** 같은 배지가 여러 줄에 붙을 때 어느 줄의 배지인지 — 화면 낭독기 이름에만 붙어요(보이는 글은 그대로). */
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const p = provenance;
  const word = SOURCE_WORD[p.source];
  const detail = [
    p.detail,
    p.endpoint ? `자리 · ${p.endpoint}` : null,
    p.collectedOn ? `수집일 · ${p.collectedOn}` : null,
    p.calledAt ? `부른 때 · ${p.calledAt}` : null,
    p.elapsedMs !== undefined ? `걸린 시간 · ${(p.elapsedMs / 1000).toFixed(1)}초` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <span>
      <button
        type="button"
        className="abadge ab-badge"
        data-approx={p.approx ? '1' : '0'}
        aria-expanded={open}
        aria-controls={`${id}-d`}
        aria-label={`${p.approx ? `교육용 근사 — ${p.label}` : `${word} — ${p.label}`}${context ? ` · ${context}` : ''} — 눌러서 어떻게 얻은 값인지 보기`}
        onClick={() => setOpen((o) => !o)}
        title="눌러서 이 값을 어떻게 얻었는지 봐요"
      >
        <i aria-hidden="true">{p.approx ? '≈' : '●'}</i>
        {p.approx ? `교육용 근사 — ${p.label}` : `${word} — ${p.label}`}
      </button>
      {open && (
        <p className="ab-badge-d" id={`${id}-d`}>
          {detail || '상세 설명이 아직 없어요.'}
          {p.approx && ' · 실제 측정값도, 원전 지표도 아니에요 — 수업에서 뜻을 이해하려고 만든 값이에요.'}
        </p>
      )}
    </span>
  );
}

/** 여러 출처가 섞인 카드(미리보기 · 점수) — 전부 보여요. 하나도 없으면 '출처 없음'을 드러내서 빠뜨림을 눈에 띄게 해요. */
export function Badges({ list, context }: { list: readonly Provenance[]; context?: string }) {
  if (list.length === 0) return <span className="chip test">출처 없음 — 값을 믿지 마세요</span>;
  return (
    <span className="ab-badges">
      {list.map((p, i) => (
        <Badge key={`${p.source}-${p.label}-${i}`} provenance={p} {...(context ? { context } : {})} />
      ))}
    </span>
  );
}
