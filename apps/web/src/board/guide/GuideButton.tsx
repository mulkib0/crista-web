/**
 * 위 띠 [가이드북] 단추 — 누르면 단계별 개념 사전 창(`GuideBook.tsx`)을 연다. 창 · 원고(약 70KB)는 처음 열 때 불러온다.
 */
import { lazy, Suspense, useState } from 'react';
import type { StepId } from '@crista-web/web-contract';
import { GUIDE_COPY as C } from './content.ts';
import './guide.css';

const GuideBook = lazy(() => import('./GuideBook.tsx'));

export function GuideButton({ stepId }: { stepId: StepId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn sm gb-open" aria-haspopup="dialog" title={C.buttonTitle} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4.5C5.5 3.6 8 3.8 10 5.2c2-1.4 4.5-1.6 7-.7v11c-2.5-.9-5-.7-7 .7-2-1.4-4.5-1.6-7-.7z M10 5.2v11" /></svg>
        {C.button}
      </button>
      {open && (
        <Suspense fallback={null}>
          <GuideBook stepId={stepId} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
