/**
 * ⓪ 첫 화면(랜딩). 히어로 변주판 20.02 '박막 무지개' 장면 위에 CRISTA 워드마크와 버튼 두 개만 둔다.
 * [시작하기] → 로그인(학생 · 교사, 세션이 있으면 다음 화면), [GitHub] → 저장소.
 * 장면(three)은 글자가 먼저 뜨도록 따로 내려받는다.
 */
import { useEffect, useRef, type MouseEvent } from 'react';
import { BASE } from '../api.ts';

const REPO = 'https://github.com/mulkib0/crista-web';

export function Landing({ onStart }: { onStart: () => void }) {
  const stage = useRef<HTMLElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    import('../landing/scene.ts')
      .then(({ startScene }) => {
        if (!gone && stage.current) stop = startScene(stage.current);
      })
      .catch((error) => console.error(error));
    return () => {
      gone = true;
      stop?.();
    };
  }, []);

  // 새 탭 · 새 창으로 열 때는 브라우저에 맡긴다.
  function start(e: MouseEvent) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onStart();
  }

  return (
    <div className="lp">
      <main className="lp-stage" ref={stage}>
        <div className="lp-scrim" />
        <div className="lp-hero">
          <h1 className="lp-word">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5" />
              <path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8" />
              <path d="M22.8 16.8A6 6 0 1 0 22.8 23.2" />
            </svg>
            <span>CRISTA</span>
          </h1>
          <div className="lp-actions">
            <a className="lp-btn primary" href={`${BASE}/login`} onClick={start}>
              시작하기
            </a>
            <a className="lp-btn secondary" href={REPO} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
