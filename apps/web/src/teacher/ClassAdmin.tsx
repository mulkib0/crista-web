/**
 * 학급 · 명단(설계 §9 W2 범위) — 학급 만들기(이름 · 모둠 수 N · 배정 방식 · 정원) · 학생 받기(열기 · 닫기) · 모둠 등기 현황 · 명단 · 모둠 배정.
 * 앞 판 Teacher.tsx 의 칸을 그대로 옮겼다(경로 · 동작 같음).
 */
import { useState, type FormEvent } from 'react';
import {
  API,
  checkClassInput,
  DEFAULT_ASSIGNMENT,
  DEFAULT_MAX_STUDENTS,
  type Assignment,
  type TeacherClassDetail,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { ink } from '../ink.ts';

export function ClassAdmin({ detail, onCreated, onChanged }: {
  detail: TeacherClassDetail | null;
  onCreated: (created: TeacherClassDetail) => Promise<void>;
  onChanged: (next?: TeacherClassDetail) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', teamCount: 4, assignment: DEFAULT_ASSIGNMENT as Assignment, maxStudents: DEFAULT_MAX_STUDENTS });

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const checked = checkClassInput(form);
    if (!checked.ok) return setError(checked.message);
    try {
      const created = await api.post<TeacherClassDetail>(API.classes, checked.value);
      await onCreated(created);
      setForm((f) => ({ ...f, name: '' }));
    } catch (err) {
      setError(message(err));
    }
  }

  async function recruit(action: 'close' | 'open') {
    if (!detail) return;
    try {
      await api.post(API.classCode(detail.id), { action });
      await onChanged();
    } catch (err) {
      setError(message(err));
    }
  }

  async function assign(userId: string, teamId: string) {
    if (!detail) return;
    try {
      await onChanged(await api.put<TeacherClassDetail>(API.assignTeam(detail.id, userId), { teamId: teamId || null }));
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <div className="tc-admin">
      {error && <p className="err" role="alert">{error}</p>}
      {detail ? (
        <section className="isl tc-isl" aria-labelledby="tc-cls-h">
          <h2 className="ptitle" id="tc-cls-h">{detail.name} <small>{detail.assignment} · 모둠 {detail.teamCount}개 · 모둠 정원 {detail.teamCapacity}</small></h2>
          <div className="panel">
            <p className="lab">학생 받기 <span className={`sig ${detail.codeOpen ? 'g' : ''}`}>{detail.codeOpen ? '열림' : '닫힘'}</span></p>
            <div className="acts">
              {detail.codeOpen ? <button className="btn sm" type="button" onClick={() => void recruit('close')}>학생 받기 닫기</button> : <button className="btn sm pri" type="button" onClick={() => void recruit('open')}>학생 받기 열기</button>}
              <span className="note">가입 주소: {location.origin}{import.meta.env.BASE_URL} · 학생이 다 들어오면 닫아 두세요</span>
            </div>
          </div>
          <h3 className="ptitle" style={{ marginTop: 18 }}>모둠</h3>
          <div className="tbl-w"><table>
            <thead><tr><th>부지</th><th>스타트업</th><th className="num">인원</th><th>등기</th></tr></thead>
            <tbody>
              {detail.teams.map((t) => (
                <tr key={t.id}>
                  <td><i className="inkd" style={{ background: ink(t.ink).base }} /> {t.plot}모둠</td>
                  <td>{t.startupName ? <><b>{t.startupName}</b> <span className="mono mini">{t.ticker}</span></> : <span className="muted">등기 전</span>}</td>
                  <td className="num">{t.memberCount}/{t.capacity}</td>
                  <td className="mini">{t.registeredByName ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <h3 className="ptitle" style={{ marginTop: 18 }}>명단 <small>{detail.roster.length}명</small></h3>
          {detail.roster.length === 0 ? <p className="empty">아직 가입한 학생이 없어요.</p> : (
            <div className="tbl-w"><table>
              <thead><tr><th>이름</th><th>아이디</th><th>캐릭터</th><th>모둠</th></tr></thead>
              <tbody>
                {detail.roster.map((r) => (
                  <tr key={r.userId}>
                    <td>{r.displayName}</td>
                    <td className="mono mini">{r.loginId}</td>
                    <td className="mono mini">{r.avatar?.toUpperCase() ?? '—'}</td>
                    <td>
                      <select className="txt" value={r.teamId ?? ''} onChange={(e) => void assign(r.userId, e.target.value)} aria-label={`${r.displayName} 모둠`}>
                        <option value="">— 없음 —</option>
                        {detail.teams.map((t) => <option key={t.id} value={t.id}>{t.plot}모둠{t.startupName ? ` · ${t.startupName}` : ''}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      ) : (
        <section className="isl tc-isl"><p className="empty">학급을 만들면 학생이 가입한 뒤 그 학급을 골라 들어와요.</p></section>
      )}
      <section className="isl tc-isl" aria-labelledby="tc-new-h">
        <h2 className="ptitle" id="tc-new-h">새 학급 만들기</h2>
        <form onSubmit={create} noValidate>
          <div className="fld"><label className="lab" htmlFor="cn">학급 이름</label><input id="cn" className="txt" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 3학년 2반 생명과학" /></div>
          <div className="fld"><label className="lab" htmlFor="tc">모둠 수</label><input id="tc" className="txt" type="number" min={2} max={8} value={form.teamCount} onChange={(e) => setForm({ ...form, teamCount: Number(e.target.value) })} /></div>
          <div className="fld"><label className="lab" htmlFor="ms">학급 정원</label><input id="ms" className="txt" type="number" min={1} max={200} value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} /></div>
          <div className="fld">
            <span className="lab">모둠 배정</span>
            <label className="chk"><input type="radio" name="as" checked={form.assignment === 'walk-in'} onChange={() => setForm({ ...form, assignment: 'walk-in' })} /> walk-in — 학생이 처음 문을 연 사옥이 그 모둠</label>
            <label className="chk"><input type="radio" name="as" checked={form.assignment === 'assigned'} onChange={() => setForm({ ...form, assignment: 'assigned' })} /> assigned — 교사가 명단에서 배정</label>
          </div>
          <div className="acts" style={{ marginTop: 12 }}><button className="btn pri" type="submit">학급 만들기</button></div>
        </form>
      </section>
    </div>
  );
}
