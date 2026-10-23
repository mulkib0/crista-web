/**
 * 화면 흐름(설계 §2): ⓪ 첫 화면 → ① 로그인 · 가입 → (학급이 없으면) 학급 고르기 → (모둠 · 이름 전) ② 사옥 지구 → (등기 뒤) ③ 전광판 + 작업 화면. 다시 로그인하면 ③ 으로 바로.
 * 교사는 교사 화면. 주소는 /crista/ · /crista/login · /crista/enroll · /crista/district · /crista/board · /crista/teacher(History API).
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { API, type MeResponse, type NextScreen } from '@crista-web/web-contract';
import { api, ApiFailure, BASE } from './api.ts';
import { socket } from './ws.ts';
import { Landing } from './screens/Landing.tsx';
import { Enroll } from './screens/Enroll.tsx';
import { Login } from './screens/Login.tsx';
import { Board } from './screens/Board.tsx';
import { Teacher } from './screens/Teacher.tsx';

// 사옥 지구는 Phaser 를 싣는다 — 들어갈 때만 내려받는다(설계 §8: 지구를 떠나면 Phaser 를 내린다).
const District = lazy(() => import('./screens/District.tsx').then((m) => ({ default: m.District })));

export type Route = 'landing' | 'login' | NextScreen;

const PATHS: Record<Route, string> = { landing: '/', login: '/login', enroll: '/enroll', district: '/district', board: '/board', teacher: '/teacher' };

function routeFromLocation(): Route {
  const path = location.pathname.slice(BASE.length).replace(/\/+$/, '') || '/';
  const hit = (Object.entries(PATHS) as Array<[Route, string]>).find(([, p]) => p === path);
  return hit?.[0] ?? 'landing';
}

export interface Nav {
  go: (route: Route, replace?: boolean) => void;
  me: MeResponse;
  setMe: (me: MeResponse) => void;
  logout: () => Promise<void>;
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

  const go = useCallback((next: Route, replace = false) => {
    const url = `${BASE}${PATHS[next] === '/' ? '/' : PATHS[next]}`;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(routeFromLocation());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  // 처음 — 세션이 있으면 다음 화면으로(다시 로그인하면 ③ 으로 바로). 첫 화면은 그대로 둔다.
  useEffect(() => {
    api
      .get<MeResponse>(API.me)
      .then((found) => {
        setMe(found);
        const current = routeFromLocation();
        if (current === 'landing') return;
        const wrong =
          current === 'login' ||
          (found.next === 'teacher') !== (current === 'teacher') ||
          (found.next === 'enroll') !== (current === 'enroll') ||
          (current === 'board' && found.next === 'district');
        if (wrong) go(found.next, true);
      })
      .catch((error) => {
        if (!(error instanceof ApiFailure) || error.status !== 401) console.error(error);
        setMe(null);
        if (!['landing', 'login'].includes(routeFromLocation())) go('login', true);
      });
  }, [go]);

  useEffect(() => {
    if (me) socket.connect();
    else if (me === null) socket.disconnect();
  }, [me]);

  // 화면 제목 — 등기 뒤에는 스타트업 이름(설계 §5.2 브라우저 탭).
  useEffect(() => {
    const name = me?.team?.startupName;
    document.title = name ? `${name} — Crista: AI를 활용한 신약개발 교육 도구` : 'Crista: AI를 활용한 신약개발 교육 도구';
  }, [me]);

  const logout = useCallback(async () => {
    await api.post(API.logout).catch(() => {});
    socket.disconnect();
    setMe(null);
    go('login');
  }, [go]);

  if (route === 'landing') return <Landing onStart={() => go(me ? me.next : 'login')} />;
  if (me === undefined) return <div className="empty" style={{ margin: 40 }}>불러오는 중…</div>;
  if (me === null || route === 'login') {
    return (
      <Login
        onDone={(found) => {
          setMe(found);
          go(found.next, true);
        }}
      />
    );
  }
  const nav: Nav = { go, me, setMe, logout };
  if (me.account.kind === 'teacher') return <Teacher nav={nav} />;
  // 학급이 없는 학생은 주소와 상관없이 학급부터 고른다(지구 · 전광판은 학급이 있어야 열린다).
  if (me.next === 'enroll') return <Enroll nav={nav} />;
  if (route === 'board') return <Board nav={nav} />;
  return (
    <Suspense fallback={<div className="empty" style={{ margin: 40 }}>사옥 지구를 여는 중…</div>}>
      <District nav={nav} />
    </Suspense>
  );
}
