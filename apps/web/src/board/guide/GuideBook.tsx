/**
 * 가이드북 창 — 단계(1.1 ~ 4.2)마다 막히기 쉬운 개념을 풀어 둔 사전. 위 띠 단추(`GuideButton.tsx`)가 처음 열 때 불러온다.
 *
 * - 원고는 `guide-data.ts`(교사 연수 슬라이드 '개념 깊이 보기'를 학생 말로 옮긴 것 — `.review/2026-10-24-guidebook/`).
 * - 창을 열면 지금 보고 있는 단계 탭이 먼저 열린다. 찾기 칸은 모든 단계의 개념을 함께 찾는다.
 * - 서버를 부르지 않는다(읽기 전용 원고). Esc · 바깥 누르기로 닫는다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { STEP_IDS, STEP_META, type StepId } from '@crista-web/web-contract';
import { GUIDE_COPY as C, type GuideTerm } from './content.ts';
import { GUIDE } from './guide-data.ts';

type Tab = 'intro' | StepId;

export default function GuideBook({ stepId, onClose }: { stepId: StepId; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(stepId);
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const close = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return [];
    const all = GUIDE.steps.flatMap((s) => s.terms.filter((t) => haystack(t).includes(q)).map((t) => ({ stepId: s.stepId, term: t })));
    // 이름(한국어 · 영문)에 걸린 개념을 본문에만 걸린 개념보다 앞에.
    const named = ({ term: t }: (typeof all)[number]) => `${t.term} ${t.en}`.toLowerCase().includes(q);
    return [...all.filter(named), ...all.filter((h) => !named(h))];
  }, [q]);

  const pick = (next: Tab) => {
    setTab(next);
    setQuery('');
    body.current?.scrollTo({ top: 0 });
  };

  const toggle = (id: string, on?: boolean) =>
    setOpenIds((cur) => {
      const next = new Set(cur);
      if (on ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  const jump = (id: string) => {
    toggle(id, true);
    requestAnimationFrame(() => document.getElementById(`gb-${id}`)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  };

  const step = tab === 'intro' ? null : GUIDE.steps.find((s) => s.stepId === tab) ?? null;
  const allOpen = step ? step.terms.every((t) => openIds.has(t.id)) : false;

  return (
    <div className="modal-back gb-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="gb" role="dialog" aria-modal="true" aria-labelledby="gb-h">
        <header className="gb-head">
          <div>
            <p className="gb-eyebrow">{C.eyebrow}</p>
            <h2 id="gb-h">{C.title}</h2>
          </div>
          <label className="gb-find">
            <span className="sr">{C.findLabel}</span>
            <input type="search" className="txt" placeholder={C.findPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button ref={close} type="button" className="close" aria-label={C.close} onClick={onClose}>×</button>
        </header>

        <nav className="gb-tabs" aria-label={C.tabsLabel}>
          <button type="button" className="gb-tab" aria-pressed={tab === 'intro' && !q} onClick={() => pick('intro')}>
            <span className="gb-tab-n">0</span>
            <span className="gb-tab-t">{C.introTab}</span>
          </button>
          {STEP_IDS.map((id) => (
            <button key={id} type="button" className="gb-tab" aria-pressed={tab === id && !q} onClick={() => pick(id)}>
              <span className="gb-tab-n mono">{id}</span>
              <span className="gb-tab-t">{STEP_META[id].title}</span>
              {id === stepId && <span className="gb-now">{C.now}</span>}
            </button>
          ))}
        </nav>

        <div className="gb-body" ref={body}>
          {q ? (
            <section aria-live="polite">
              <p className="gb-lede">{hits.length ? C.found(query.trim(), hits.length) : C.notFound(query.trim())}</p>
              <div className="gb-terms">
                {hits.map(({ stepId: sid, term }) => (
                  <TermCard key={term.id} term={term} step={sid} open={openIds.has(term.id)} onToggle={() => toggle(term.id)} />
                ))}
              </div>
            </section>
          ) : step ? (
            <section aria-labelledby="gb-step-h">
              <p className="gb-step-k mono">STEP {step.stepId} · {C.group(STEP_META[step.stepId].group)}</p>
              <h3 id="gb-step-h" className="gb-step-h">{STEP_META[step.stepId].title}</h3>
              <p className="gb-lede">{step.lede}</p>
              <div className="gb-index">
                <ul className="gb-chips" aria-label={C.indexLabel}>
                  {step.terms.map((t) => (
                    <li key={t.id}><button type="button" onClick={() => jump(t.id)}>{t.term}</button></li>
                  ))}
                </ul>
                <button type="button" className="gb-all" onClick={() => step.terms.forEach((t) => toggle(t.id, !allOpen))}>{allOpen ? C.foldAll : C.openAll}</button>
              </div>
              <div className="gb-terms">
                {step.terms.map((t) => <TermCard key={t.id} term={t} open={openIds.has(t.id)} onToggle={() => toggle(t.id)} />)}
              </div>
            </section>
          ) : (
            <section aria-labelledby="gb-intro-h">
              <h3 id="gb-intro-h" className="gb-step-h">{C.introTitle}</h3>
              <p className="gb-lede">{GUIDE.intro.lede}</p>
              <ol className="gb-points">
                {GUIDE.intro.points.map((p) => (
                  <li key={p.h}><b>{p.h}</b><p>{p.p}</p></li>
                ))}
              </ol>
              <button type="button" className="btn sm" onClick={() => pick(stepId)}>{C.toNow(stepId)}</button>
            </section>
          )}
          <p className="gb-src">{C.source}</p>
        </div>
      </aside>
    </div>
  );
}

function TermCard({ term: t, step, open, onToggle }: { term: GuideTerm; step?: StepId; open: boolean; onToggle: () => void }) {
  const id = `gb-${t.id}`;
  return (
    <article className="gb-term" id={id} data-open={open || undefined}>
      <button type="button" className="gb-term-h" aria-expanded={open} aria-controls={`${id}-b`} onClick={onToggle}>
        <span className="gb-term-name">
          {step && <span className="gb-term-step mono">{step}</span>}
          <b>{t.term}</b>
          {t.en && <small>{t.en}</small>}
        </span>
        <span className="gb-term-one">{t.oneLine}</span>
        <span className="gb-term-k" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="gb-term-b" id={`${id}-b`}>
          {t.body.map((p, i) => <p key={i}>{p}</p>)}
          {t.formula && (
            <figure className="gb-formula">
              <code>{t.formula}</code>
              {t.formulaNote && <figcaption>{t.formulaNote}</figcaption>}
            </figure>
          )}
          <dl className="gb-notes">
            {t.example && <div className="ex"><dt>{C.example}</dt><dd>{t.example}</dd></div>}
            {t.analogy && <div className="an"><dt>{C.analogy}</dt><dd>{t.analogy}</dd></div>}
            {t.caution && <div className="ca"><dt>{C.caution}</dt><dd>{t.caution}</dd></div>}
            {t.inClass && <div className="in"><dt>{C.inClass}</dt><dd>{t.inClass}</dd></div>}
          </dl>
        </div>
      )}
    </article>
  );
}

const haystack = (t: GuideTerm) => [t.term, t.en, t.oneLine, ...t.body].join(' ').toLowerCase();
