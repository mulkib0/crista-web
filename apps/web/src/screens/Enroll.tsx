/**
 * 학급 고르기 — 가입한 학생이 아직 학급이 없을 때(설계 §3). 학급 코드 대신 선생님이 '학생 받기'를 연 학급 목록에서 고른다.
 * 모양은 로그인과 같은 유리 카드(첫 화면의 박막 리본을 뒤에 돌린다). 고르면 서버가 정원을 지켜 넣고 사옥 지구로 간다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API, type MeResponse, type OpenClassesResponse, type OpenClassView } from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { api, message } from '../api.ts';

const VIEW = { ox: 0.07, oy: 0.03, zoom: 1.0, narrowOy: 0.3, narrowZoom: 0.7, shadow: 0.12 };

export function Enroll({ nav }: { nav: Nav }) {
  const stage = useRef<HTMLDivElement>(null);
  const [classes, setClasses] = useState<OpenClassView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    import('../landing/scene.ts')
      .then(({ startScene }) => {
        if (!gone && stage.current) stop = startScene(stage.current, VIEW);
      })
      .catch((err) => console.error(err));
    return () => {
      gone = true;
      stop?.();
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      setClasses((await api.get<OpenClassesResponse>(API.openClasses)).classes);
    } catch (err) {
      setError(message(err));
    }
  }, []);
  useEffect(() => void load(), [load]);

  async function pick(cls: OpenClassView) {
    if (busy) return;
    setBusy(cls.id);
    setError(null);
    try {
      const me = await api.post<MeResponse>(API.enroll(cls.id));
      nav.setMe(me);
      nav.go(me.next, true);
    } catch (err) {
      setError(message(err));
      void load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="auth" ref={stage}>
      <h1 className="sr">학급 고르기</h1>
      <header className="auth-hd">
        <span className="auth-word">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5" />
            <path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8" />
            <path d="M22.8 16.8A6 6 0 1 0 22.8 23.2" />
          </svg>
          <span>CRISTA</span>
        </span>
      </header>
      <main className="auth-glass" data-state={error ? 'bad' : undefined}>
        <div className="auth-in">
          <div className="auth-enroll-hd">
            <h2>{nav.me.account.displayName}님, 들어갈 학급을 골라 주세요</h2>
            <p className="auth-hint">선생님이 알려 준 학급 이름과 선생님 이름을 확인하세요.</p>
          </div>
          {classes === null && !error && <p className="auth-hint">불러오는 중…</p>}
          {classes?.length === 0 && <p className="auth-hint">지금 학생을 받는 학급이 없어요. 선생님께 학급을 열어 달라고 해 주세요.</p>}
          {classes && classes.length > 0 && (
            <ul className="auth-classes">
              {classes.map((cls) => {
                const full = cls.studentCount >= cls.maxStudents;
                return (
                  <li key={cls.id}>
                    <button type="button" disabled={full || busy !== null} onClick={() => void pick(cls)}>
                      <b>{cls.name}</b>
                      <span>
                        {cls.teacherName} 선생님 · 학생 {cls.studentCount}/{cls.maxStudents}
                        {full ? ' · 정원 참' : ''}
                      </span>
                      {busy === cls.id && <em>들어가는 중…</em>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p className="auth-msg" data-kind="bad" role="alert">
              <b>{error}</b>
            </p>
          )}
          <div className="auth-enroll-acts">
            <button className="btn sm" type="button" onClick={() => void load()}>새로 고침</button>
            <button className="btn sm" type="button" onClick={() => void nav.logout()}>나가기</button>
          </div>
        </div>
      </main>
    </div>
  );
}
