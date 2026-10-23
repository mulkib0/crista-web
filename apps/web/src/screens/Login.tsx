/**
 * ① 로그인 · 회원가입(설계 §3). 학생은 교사가 준 학급 코드로 스스로 가입한다 — 서버가 대신 계정을 만든다.
 * 모양은 로그인 시안 02 '유리 카드'(design/login-30): 첫 화면의 박막 리본을 가운데 크게 돌리고, 그 앞 유리 카드에 폼을 둔다.
 * 카드 테두리는 평소 박막색, 오류는 빨강, 잠금은 황토. 장면(three)은 글자가 먼저 뜨도록 따로 내려받는다.
 * 입력 규칙은 서버와 같은 함수(web-contract)로 먼저 확인하고, 서버가 다시 확인한다.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  API,
  checkClassCode,
  checkDisplayName,
  checkLoginId,
  checkPassword,
  type MeResponse,
} from '@crista-web/web-contract';
import { api, ApiFailure, message } from '../api.ts';

/** 리본을 화면 가운데 크게(넓은 화면), 좁은 화면에서는 카드 위로 비켜 그린다. */
const VIEW = { ox: 0.07, oy: 0.03, zoom: 1.0, narrowOy: 0.3, narrowZoom: 0.7, shadow: 0.12 };

type Msg = { kind: 'bad'; title: string } | null;

export function Login({ onDone }: { onDone: (me: MeResponse) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ loginId: '', password: '', classCode: '', displayName: '', confirm: '' });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  // 잠금은 아이디마다(5번 틀리면 1분) — 잠긴 아이디일 때만 들어가기를 막고 남은 시간을 센다.
  const [lock, setLock] = useState<{ id: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    import('../landing/scene.ts')
      .then(({ startScene }) => {
        if (!gone && stage.current) stop = startScene(stage.current, VIEW);
      })
      .catch((error) => console.error(error));
    return () => {
      gone = true;
      stop?.();
    };
  }, []);

  useEffect(() => {
    if (!lock) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lock]);
  const left = lock ? Math.max(0, Math.ceil((lock.until - now) / 1000)) : 0;
  useEffect(() => {
    if (lock && left === 0) setLock(null);
  }, [lock, left]);
  const locked = tab === 'login' && lock !== null && left > 0 && form.loginId.trim().toLowerCase() === lock.id;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    const value = key === 'classCode' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setMsg(null);
  };
  const switchTab = (next: 'login' | 'signup') => {
    setTab(next);
    setMsg(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || locked) return;
    setMsg(null);
    const bad = (title: string) => setMsg({ kind: 'bad', title });
    if (tab === 'signup') {
      for (const check of [checkClassCode(form.classCode), checkLoginId(form.loginId), checkDisplayName(form.displayName), checkPassword(form.password)]) {
        if (!check.ok) return bad(check.message);
      }
      if (form.password !== form.confirm) return bad('비밀번호 확인이 맞지 않아요.');
    } else if (!form.loginId || !form.password) {
      return bad('아이디와 비밀번호를 써 주세요.');
    }
    setBusy(true);
    try {
      const me =
        tab === 'login'
          ? await api.post<MeResponse>(API.login, { loginId: form.loginId, password: form.password })
          : await api.post<MeResponse>(API.signup, { classCode: form.classCode, loginId: form.loginId, displayName: form.displayName, password: form.password });
      onDone(me);
    } catch (err) {
      if (tab === 'login' && err instanceof ApiFailure && err.code === 'login_locked') {
        setNow(Date.now());
        setLock({ id: form.loginId.trim().toLowerCase(), until: Date.now() + (err.retryAfterSec ?? 60) * 1000 });
      } else bad(message(err));
    } finally {
      setBusy(false);
    }
  }

  const state = locked ? 'lock' : msg?.kind;
  return (
    <div className="auth" ref={stage}>
      <h1 className="sr">Crista 파이프라인 랩 로그인 · 회원가입</h1>
      <header className="auth-hd">
        <span className="auth-word">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5" />
            <path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8" />
            <path d="M22.8 16.8A6 6 0 1 0 22.8 23.2" />
          </svg>
          <span>CRISTA</span>
        </span>
        <small>파이프라인 랩</small>
      </header>
      {/* 리본 접힘 계획(scene.ts PLAN)에서 센 값 */}
      <p className="auth-rib" aria-hidden="true">
        <span><i />유리 리본 · 예측 구조</span>
        <span><b>잔기 91</b> · α나선 3 · β가닥 3</span>
        <span>끌어서 돌려 보세요</span>
      </p>
      <main className="auth-glass" data-state={state}>
        <div className="auth-in">
          <div className="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">
            <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => switchTab('login')}>
              로그인
            </button>
            <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => switchTab('signup')}>
              회원가입(학생)
            </button>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="auth-fields">
              {tab === 'signup' && (
                <div className="auth-fld">
                  <label htmlFor="code">학급 코드</label>
                  <input id="code" className="auth-inp" value={form.classCode} onChange={set('classCode')} placeholder="선생님이 알려 준 6자" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} />
                </div>
              )}
              <div className="auth-fld">
                <label htmlFor="id">아이디</label>
                <input id="id" className="auth-inp" value={form.loginId} onChange={set('loginId')} placeholder="영문 소문자 · 숫자 3~20자" autoComplete="username" autoCapitalize="none" spellCheck={false} />
              </div>
              {tab === 'signup' && (
                <div className="auth-fld">
                  <label htmlFor="name">이름</label>
                  <input id="name" className="auth-inp" value={form.displayName} onChange={set('displayName')} placeholder="화면에 보일 이름(별명도 돼요)" autoComplete="nickname" maxLength={20} />
                </div>
              )}
              <div className="auth-fld">
                <label htmlFor="pw">비밀번호</label>
                <input id="pw" className="auth-inp" type="password" value={form.password} onChange={set('password')} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder={tab === 'signup' ? '8자 이상' : ''} />
              </div>
              {tab === 'signup' && (
                <div className="auth-fld">
                  <label htmlFor="pw2">비밀번호 확인</label>
                  <input id="pw2" className="auth-inp" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                </div>
              )}
            </div>
            {locked ? (
              <p className="auth-msg" data-kind="lock" role="alert">
                <b>비밀번호를 5번 틀려 1분 동안 잠겼어요.</b>
                <span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} 뒤 다시 해 볼 수 있어요.</span>
              </p>
            ) : (
              msg && (
                <p className="auth-msg" data-kind={msg.kind} role="alert">
                  <b>{msg.title}</b>
                </p>
              )
            )}
            <button className="auth-go" type="submit" disabled={busy || locked}>
              {busy ? '확인 중…' : tab === 'login' ? '들어가기' : '가입하고 들어가기'}
            </button>
            <p className="auth-hint">
              {tab === 'login'
                ? '교사 계정은 따로 발급돼요. 학생은 학급 코드로 처음 가입해 주세요.'
                : '아이디와 비밀번호는 다음에 들어올 때 다시 써요. 잊지 않게 적어 두세요.'}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
