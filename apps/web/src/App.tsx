/**
 * 화면 흐름(설계 §2): ⓪ 첫 화면 → ① 로그인 · 가입 → (학급이 없으면) 학급 고르기 → (모둠 · 이름 전) ② 사옥 지구 → (등기 뒤) ③ 전광판 + 작업 화면. 다시 로그인하면 ③ 으로 바로.
 * 교사는 교사 화면. 학생은 로그인 · 가입 뒤 **연구소 고르기**(`/lab`)를 먼저 본다(항체 설계 §1.1).
 * 주소는 /crista/ · /crista/login · /crista/enroll · /crista/lab · /crista/district · /crista/board · /crista/antibody · /crista/teacher(History API).
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { API, TRACK_IDS, type MeResponse, type NextScreen, type TrackId } from '@crista-web/web-contract';
import { api, ApiFailure, BASE } from './api.ts';
import { socket } from './ws.ts';
import { Landing } from './screens/Landing.tsx';
import { Enroll } from './screens/Enroll.tsx';
import { Login } from './screens/Login.tsx';
import { Board } from './screens/Board.tsx';
import { Labs } from './screens/Labs.tsx';
import { Teacher } from './screens/Teacher.tsx';

// 사옥 지구는 Phaser 를 싣는다 — 들어갈 때만 내려받는다(설계 §8: 지구를 떠나면 Phaser 를 내린다).
const District = lazy(() => import('./screens/District.tsx').then((m) => ({ default: m.District })));
// 항체 설계 랩은 3D 뷰어가 무겁다 — 들어갈 때만 내려받는다(항체 설계 §1.2 `lazy`).
const Antibody = lazy(() => import('./screens/Antibody.tsx').then((m) => ({ default: m.Antibody })));

export type Route = 'landing' | 'login' | NextScreen | 'lab' | 'antibody';

const PATHS: Record<Route, string> = {
  landing: '/',
  login: '/login',
  enroll: '/enroll',
  district: '/district',
  board: '/board',
  teacher: '/teacher',
  lab: '/lab',
  antibody: '/antibody',
};

/** 랩을 기억하는 라우트 — 주소에 `?lab=` 을 붙여 새로고침 · 링크 공유에도 고른 랩이 남는다(항체 설계 §1.1). */
const LAB_ROUTES: readonly Route[] = ['district', 'board', 'antibody'];
const LAB_KEY = 'crista.lab';
const isLab = (v: string | null): v is TrackId => v !== null && (TRACK_IDS as readonly string[]).includes(v);

/**
 * 고른 랩 — **주소 쿼리 우선 · `sessionStorage` 보조**. 둘 다 없으면 null 이고, 그때는 저분자로 조용히 넘기지 않고
 * 연구소 고르기 화면으로 되돌린다(시크릿 창 · 저장소 차단 · 새 탭에서 모르는 사이 다른 랩에 들어가는 일을 막는다).
 */
export function pickedLab(): TrackId | null {
  try {
    const fromUrl = new URLSearchParams(location.search).get('lab');
    if (isLab(fromUrl)) return fromUrl;
  } catch {
    // 주소를 읽을 수 없으면 저장소만 본다.
  }
  try {
    const saved = sessionStorage.getItem(LAB_KEY);
    if (isLab(saved)) return saved;
  } catch {
    // 저장소가 막혀 있으면(사생활 보호 창) 주소만 쓴다.
  }
  return null;
}

/** 보조 캐시에만 적는다 — 주소가 1순위다. */
function rememberLab(track: TrackId): void {
  try {
    sessionStorage.setItem(LAB_KEY, track);
  } catch {
    // 저장소가 막혀 있어도 주소에 남으므로 넘어간다.
  }
}

/**
 * 서버가 준 `next` 를 '처음 보낼 라우트'로 바꾼다 — 학생은 **늘 연구소 고르기부터** 본다(항체 설계 §1.1 · §12).
 * 교사는 교사 화면, 학급이 없는 학생은 학급 고르기가 먼저다. 등기 전(`next === 'district'`)에도 연구소 고르기를
 * 먼저 보여 준다 — 그 화면이 '먼저 사옥 지구에서 회사를 등기해야 해요' 안내와 [사옥 지구로] 단추를 들고 있고,
 * 거기서 고른 랩이 `?lab=` 으로 등기 뒤까지 따라간다.
 */
const entry = (m: MeResponse): Route => (m.next === 'teacher' ? 'teacher' : m.next === 'enroll' ? 'enroll' : 'lab');

function routeFromLocation(): Route {
  const path = location.pathname.slice(BASE.length).replace(/\/+$/, '') || '/';
  const hit = (Object.entries(PATHS) as Array<[Route, string]>).find(([, p]) => p === path);
  return hit?.[0] ?? 'landing';
}

export interface Nav {
  /** `lab` 을 주면 그 랩을 주소(`?lab=`)에 싣는다 — 저장소가 막힌 창에서도 고른 랩이 남는다(항체 설계 §1.1). */
  go: (route: Route, replace?: boolean, lab?: TrackId) => void;
  me: MeResponse;
  setMe: (me: MeResponse) => void;
  logout: () => Promise<void>;
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

  const go = useCallback((next: Route, replace = false, lab?: TrackId) => {
    const keep = LAB_ROUTES.includes(next) ? (lab ?? pickedLab()) : null;
    const url = `${BASE}${PATHS[next] === '/' ? '/' : PATHS[next]}${keep ? `?lab=${keep}` : ''}`;
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
        // 주소(`?lab=`)로 들어온 랩은 보조 캐시에도 적어 둔다 — 등기 전이라 연구소 고르기로 되돌려도
        // 그 값이 남아 [사옥 지구로] · 등기 뒤 이동이 **고른 랩**을 그대로 따라간다(항체 설계 §1.1).
        const fromUrl = pickedLab();
        if (fromUrl) rememberLab(fromUrl);
        // 등기 전 학생이 주소로 **작업 화면**에 바로 들어온 경우 되돌린다(항체 설계 §1.3).
        // `lab`(연구소 고르기)은 되돌리지 않는다 — 등기 전에도 무엇을 고르는 화면인지 봐야 한다(§1.1 · §12).
        const needsTeam = (['antibody', 'board'] as Route[]).includes(current);
        // 고른 랩이 없는데 작업 화면 주소로 들어오면(`?lab=` 을 지우고 새 탭에서 열기) 저분자로 조용히 넘기지 않고
        // 연구소 고르기로 되돌린다(항체 설계 §1.1 — 주소가 1순위 · `sessionStorage` 는 같은 탭 보조).
        const noLab = needsTeam && fromUrl === null;
        const wrong =
          current === 'login' ||
          (found.next === 'teacher') !== (current === 'teacher') ||
          (found.next === 'enroll') !== (current === 'enroll') ||
          (needsTeam && found.next === 'district') ||
          noLab;
        if (wrong) go(entry(found), true);
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

  if (route === 'landing') return <Landing onStart={() => go(me ? entry(me) : 'login')} />;
  if (me === undefined) return <div className="empty" style={{ margin: 40 }}>불러오는 중…</div>;
  if (me === null || route === 'login') {
    return (
      <Login
        onDone={(found) => {
          setMe(found);
          go(entry(found), true);
        }}
      />
    );
  }
  const nav: Nav = { go, me, setMe, logout };
  if (me.account.kind === 'teacher') return <Teacher nav={nav} />;
  // 학급이 없는 학생은 주소와 상관없이 학급부터 고른다(지구 · 전광판은 학급이 있어야 열린다).
  // 학급을 고른 **직후에도 연구소 고르기가 먼저다** — `Enroll` 은 서버가 준 `me.next`('district')로 가려 하니
  // 여기서 로그인과 같은 입구 규칙(`entry`)으로 바꿔 끼운다(항체 설계 §1.1).
  if (me.next === 'enroll') {
    return <Enroll nav={{ ...nav, go: (next, replace) => go(next === 'teacher' || next === 'enroll' ? next : 'lab', replace) }} />;
  }
  // 랩을 고르면 주소 · 보조 캐시에 남기고 그 작업 화면으로 — 등기 전이면 먼저 사옥 지구로 보낸다(항체 설계 §1.1).
  const pickLab = (track: TrackId) => {
    rememberLab(track);
    go(me.next === 'district' ? 'district' : track === 'antibody' ? 'antibody' : 'board', false, track);
  };
  if (route === 'lab') return <Labs nav={nav} pickLab={pickLab} />;
  if (route === 'antibody') {
    return (
      <Suspense fallback={<div className="empty" style={{ margin: 40 }}>항체 설계 랩을 여는 중…</div>}>
        <Antibody nav={nav} />
      </Suspense>
    );
  }
  if (route === 'board') return <Board nav={nav} />;
  return (
    <Suspense fallback={<div className="empty" style={{ margin: 40 }}>사옥 지구를 여는 중…</div>}>
      <District nav={nav} />
    </Suspense>
  );
}
