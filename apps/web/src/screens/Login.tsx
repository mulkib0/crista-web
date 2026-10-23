/**
 * ① 로그인 · 회원가입(설계 §3). 학생은 교사가 준 학급 코드로 스스로 가입한다 — 서버가 대신 계정을 만든다.
 * 입력 규칙은 서버와 같은 함수(web-contract)로 먼저 확인하고, 서버가 다시 확인한다.
 */
import { useState, type FormEvent } from 'react';
import {
  API,
  checkClassCode,
  checkDisplayName,
  checkLoginId,
  checkPassword,
  type MeResponse,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';

const STREET = [
  [1, 2], [6, 1], [3, 3], [2, 1], [7, 2], [4, 1], [8, 3], [5, 2], [1, 1], [6, 3],
] as const;

export function Street() {
  return (
    <div className="street" aria-hidden="true">
      {STREET.map(([f, t], i) => (
        <img key={i} src={`${import.meta.env.BASE_URL}campus/hq-${f}-t${t}.svg`} alt="" />
      ))}
    </div>
  );
}

export function Login({ onDone }: { onDone: (me: MeResponse) => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ loginId: '', password: '', classCode: '', displayName: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (tab === 'signup') {
      for (const check of [checkClassCode(form.classCode), checkLoginId(form.loginId), checkDisplayName(form.displayName), checkPassword(form.password)]) {
        if (!check.ok) return setError(check.message);
      }
      if (form.password !== form.confirm) return setError('비밀번호 확인이 맞지 않아요.');
    } else if (!form.loginId || !form.password) {
      return setError('아이디와 비밀번호를 써 주세요.');
    }
    setBusy(true);
    try {
      const me =
        tab === 'login'
          ? await api.post<MeResponse>(API.login, { loginId: form.loginId, password: form.password })
          : await api.post<MeResponse>(API.signup, { classCode: form.classCode, loginId: form.loginId, displayName: form.displayName, password: form.password });
      onDone(me);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <b>CRISTA</b>
            <span>파이프라인 랩</span>
          </div>
          <h1>모둠이 스타트업 제약회사가 되어 실제 계산으로 신약을 만들어요</h1>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => (setTab('login'), setError(null))}>
              로그인
            </button>
            <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => (setTab('signup'), setError(null))}>
              회원가입(학생)
            </button>
          </div>
          <form className="panel" onSubmit={submit} noValidate>
            {tab === 'signup' && (
              <div className="fld">
                <label className="lab" htmlFor="code">학급 코드</label>
                <input id="code" className="txt mono" value={form.classCode} onChange={set('classCode')} placeholder="선생님이 알려 준 6자" autoComplete="off" maxLength={8} style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }} />
              </div>
            )}
            <div className="fld">
              <label className="lab" htmlFor="id">아이디</label>
              <input id="id" className="txt" value={form.loginId} onChange={set('loginId')} placeholder="영문 소문자 · 숫자 3~20자" autoComplete="username" autoCapitalize="none" />
            </div>
            {tab === 'signup' && (
              <div className="fld">
                <label className="lab" htmlFor="name">이름</label>
                <input id="name" className="txt" value={form.displayName} onChange={set('displayName')} placeholder="화면에 보일 이름(별명도 돼요)" maxLength={20} />
              </div>
            )}
            <div className="fld">
              <label className="lab" htmlFor="pw">비밀번호</label>
              <input id="pw" className="txt" type="password" value={form.password} onChange={set('password')} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder={tab === 'signup' ? '8자 이상' : ''} />
            </div>
            {tab === 'signup' && (
              <div className="fld">
                <label className="lab" htmlFor="pw2">비밀번호 확인</label>
                <input id="pw2" className="txt" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
              </div>
            )}
            {error && <p className="err" role="alert" style={{ marginTop: 14 }}>{error}</p>}
            <div className="acts" style={{ marginTop: 16 }}>
              <button className="btn pri" type="submit" disabled={busy} style={{ width: '100%' }}>
                {busy ? '확인 중…' : tab === 'login' ? '들어가기' : '가입하고 들어가기'}
              </button>
            </div>
            {tab === 'login' && <p className="hint">교사 계정은 따로 발급돼요. 학생은 학급 코드로 처음 가입해 주세요.</p>}
          </form>
        </div>
      </main>
      <Street />
    </div>
  );
}
