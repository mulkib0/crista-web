/**
 * ⑤ 학습 연구비 교사 칸(learning-grant §5 교사 화면 · features/learn.ts 교사 경로).
 * - 현황표 `GET /api/teacher/learn/:classId` — 모둠 가동률 ρ · 연속 s · 배율 m · 보호권 · 받은 돈, 학생 × 단계(낸 문항 · 평균 · 가동 · 면제).
 * - 면제 `PUT …/exemptions {userId, stepId, exempt}` — 결석 · 조퇴 학생을 그 단계 분모에서 뺀다.
 * - 이의 제기 `POST /api/teacher/learn/appeals/:id {accept, score?, note}` · 점수 정정 `POST /api/teacher/learn/override` — 원본 점수는 서버가 남기고 차액만 원장에.
 */
import { useState, type FormEvent } from 'react';
import {
  formatCrista,
  LEARN_API,
  LEARN_COPY,
  PITCH_QUAL_MAX,
  STEP_IDS,
  STEP_META,
  type LearnTargetType,
  type StepId,
  type TeacherLearnAppealRow,
  type TeacherLearnGradingRow,
  type TeacherLearnResponse,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { Tabs, useLocalTab } from '../board/ui/index.ts';
import { ago, classNews, useTeacherLive } from './hooks.ts';
import { TeamTag, type TeamLookup } from './TeamTag.tsx';

const TARGET_WORD: Record<LearnTargetType | 'doc_review', string> = { answer: '문항 답', note: '연구 노트 평가', pitch: '투자 피치(정성)', doc_review: '서류 심사' };
const GRADING_WORD: Record<string, string> = {
  queued: '채점 대기',
  done: 'AI 채점 끝',
  cached: '같은 글 앞 결과',
  unavailable: 'AI 꺼짐 · 미룸',
  failed: '오류 · 다시 시도',
  refused: 'AI 거절',
  overridden: '선생님 정정',
  flagged: '플래그',
};
const maxOf = (t: LearnTargetType | 'doc_review') => (t === 'pitch' ? PITCH_QUAL_MAX : 100);

export function LearnView({ classId, teams, onChanged }: { classId: string; teams: TeamLookup; onChanged?: () => void }) {
  const [tab, setTab] = useLocalTab('teacher:learn', ['teams', 'students', 'appeals', 'log'] as const, 'teams');
  const live = useTeacherLive<TeacherLearnResponse>(LEARN_API.teacher(classId), classNews(classId));
  const d = live.data;
  const reload = () => { live.reload(); onChanged?.(); };
  const open = d?.appeals.filter((a) => a.status === 'open').length ?? 0;
  return (
    <div className="tc-stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Tabs size="sm" label="학습 연구비 보기" value={tab} onChange={(v) => setTab(v as typeof tab)}
          items={[
            { id: 'teams', label: '모둠 현황' },
            { id: 'students', label: '학생 × 단계 · 면제' },
            { id: 'appeals', label: '이의 제기', ...(open ? { mark: `${open}` } : {}) },
            { id: 'log', label: '채점 기록 · 정정' },
          ]} />
        <span className="mini muted">오늘 학습 채점 AI 호출 {d?.llmCallsToday ?? '—'}번</span>
      </div>
      {live.error && <p className="err" role="alert">{live.error.message}</p>}
      {!d ? <p className="hint">학습 현황을 읽는 중…</p> : tab === 'teams' ? <TeamsTable d={d} teams={teams} /> : tab === 'students' ? (
        <StudentsTable d={d} classId={classId} teams={teams} onDone={reload} />
      ) : tab === 'appeals' ? (
        <Appeals rows={d.appeals} teams={teams} onDone={reload} />
      ) : (
        <Log rows={d.gradings} teams={teams} onDone={reload} />
      )}
    </div>
  );
}

function TeamsTable({ d, teams }: { d: TeacherLearnResponse; teams: TeamLookup }) {
  if (!d.teams.length) return <p className="empty">등기한 모둠이 아직 없어요.</p>;
  return (
    <>
    <p className="mini muted" style={{ margin: 0 }}>가동률 ρ = 그 단계에서 활동한 모둠원 비율(면제 제외) · 연속 s = 전원 가동 단계 수 · 배율 m = 1 + ρ + 0.1·min(s, 5). 문항 · 노트 · 기초 · 투자 · 정정 칸은 받은 돈(크리스타)이에요.</p>
    <div className="tbl-w"><table className="tc-tbl">
      <thead><tr>
        <th>모둠</th><th>지금 단계</th><th className="num" title="가동률 ρ — 그 단계에서 활동한 모둠원 비율(면제 제외)">가동률</th><th className="num" title="연속 전원 가동 단계 s">연속</th>
        <th className="num" title="기초 연구비 배율 m = 1 + ρ + 0.1·min(s,5)">배율</th><th className="num">보호권</th>
        <th className="num">문항</th><th className="num">노트</th><th className="num">기초</th><th className="num">투자</th><th className="num">정정</th><th>Series A · B</th>
      </tr></thead>
      <tbody>
        {d.teams.map((t) => (
          <tr key={t.teamId}>
            <td><TeamTag id={t.teamId} teams={teams} /></td>
            <td className="mini">{t.currentStep} {STEP_META[t.currentStep].title}</td>
            <td className="num mono">{Math.round(t.ratio * 100)}%</td>
            <td className="num mono">{t.streak}</td>
            <td className="num mono">×{t.multiplier.toFixed(1)}</td>
            <td className="num mono">{t.shields}</td>
            <td className="num mono">{formatCrista(t.totals.items, { unit: false })}</td>
            <td className="num mono">{formatCrista(t.totals.notes, { unit: false })}</td>
            <td className="num mono">{formatCrista(t.totals.stipend, { unit: false })}</td>
            <td className="num mono">{formatCrista(t.totals.pitch, { unit: false })}</td>
            <td className="num mono">{formatCrista(t.totals.corrections, { unit: false })}</td>
            <td className="mini">
              {(['series_a', 'series_b'] as const).map((r) => {
                const p = t.pitch[r];
                return <span key={r} className="tc-pitch">{LEARN_COPY.round[r]} {p ? (p.status === 'paid' ? `${p.total ?? '—'}점 · ${formatCrista(p.crista)}` : '심사 중') : '—'}</span>;
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
    </>
  );
}

function StudentsTable({ d, classId, teams, onDone }: { d: TeacherLearnResponse; classId: string; teams: TeamLookup; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function toggle(userId: string, stepId: StepId, exempt: boolean) {
    const key = `${userId}:${stepId}`;
    setBusy(key);
    setError(null);
    try {
      await api.put(LEARN_API.teacherExemptions(classId), { userId, stepId, exempt });
      onDone();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(null);
    }
  }
  if (!d.students.length) return <p className="empty">아직 학생이 없어요.</p>;
  return (
    <>
      <p className="mini muted" style={{ margin: 0 }}>칸마다 <b>낸 문항 · 평균 점수</b>, ● = 그 단계 가동. [면제]를 켜면 결석 · 조퇴 학생을 그 단계 가동률 분모에서 빼요.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="tbl-w"><table className="tc-tbl tc-grid">
        <thead><tr><th>학생</th>{STEP_IDS.map((s) => <th key={s} className="num" title={STEP_META[s].title}>{s}</th>)}</tr></thead>
        <tbody>
          {d.students.map((s) => (
            <tr key={s.userId}>
              <td><b>{s.displayName}</b><br /><TeamTag id={s.teamId} teams={teams} /></td>
              {STEP_IDS.map((stepId) => {
                const c = s.steps[stepId];
                return (
                  <td key={stepId} className={`tc-cell${c?.active ? ' on' : ''}${c?.exempt ? ' ex' : ''}`}>
                    <span className="mono">{c?.answered ? `${c.answered} · ${c.avgScore ?? '—'}` : '—'}{c?.active ? ' ●' : ''}</span>
                    <label className="tc-ex">
                      <input type="checkbox" checked={!!c?.exempt} disabled={busy === `${s.userId}:${stepId}`} onChange={(e) => void toggle(s.userId, stepId, e.target.checked)} aria-label={`${s.displayName} ${stepId} 면제`} />
                      면제
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}

function Appeals({ rows, teams, onDone }: { rows: TeacherLearnAppealRow[]; teams: TeamLookup; onDone: () => void }) {
  if (!rows.length) return <p className="empty">이의 제기가 없어요.</p>;
  return <div className="cards">{rows.map((a) => <AppealCard key={a.id} a={a} teams={teams} onDone={onDone} />)}</div>;
}

function AppealCard({ a, teams, onDone }: { a: TeacherLearnAppealRow; teams: TeamLookup; onDone: () => void }) {
  const [score, setScore] = useState(a.score === null ? '' : String(a.score));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = maxOf(a.targetType);
  const scoreN = Number(score);
  const scoreOk = score !== '' && Number.isInteger(scoreN) && scoreN >= 0 && scoreN <= max;
  async function decide(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.post(LEARN_API.teacherAppeal(a.id), { accept, note: note.trim() || undefined, ...(accept && a.targetType !== 'doc_review' && scoreOk ? { score: scoreN } : {}) });
      onDone();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`card${a.status === 'open' ? ' on' : ''}`}>
      <div className="card-h">
        <b>{TARGET_WORD[a.targetType]}</b>
        <TeamTag id={a.teamId} teams={teams} />
        <span className="mini">{a.byName}</span>
        <span className={`sig ${a.status === 'open' ? 'w' : a.status === 'accepted' ? 'g' : ''}`}>{a.status === 'open' ? '열림' : a.status === 'accepted' ? '받아들임' : '기각'}</span>
        <span className="mini muted tc-push">지금 점수 {a.score ?? '—'}{a.targetType === 'pitch' ? `/${PITCH_QUAL_MAX}` : ''} · {ago(a.createdAt)}</span>
      </div>
      <p className="tc-quote">{a.reason}</p>
      {a.status === 'open' && (
        <div className="tc-decide">
          <div className="row">
            {a.targetType !== 'doc_review' && (
              <>
                <label className="lab" htmlFor={`as-${a.id}`} style={{ margin: 0 }}>고칠 점수(0~{max})</label>
                <input id={`as-${a.id}`} className="txt mono tc-num" type="number" min={0} max={max} step={1} value={score} onChange={(e) => setScore(e.target.value)} />
              </>
            )}
            <input className="txt" aria-label="처리 메모" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모(선택) — 모둠에게 보여요" style={{ flex: 1, minWidth: 160 }} />
          </div>
          <div className="acts">
            <button type="button" className="btn sm pri" disabled={busy || (a.targetType !== 'doc_review' && !scoreOk)} onClick={() => void decide(true)}>받아들이고 점수 고치기</button>
            <button type="button" className="btn sm" disabled={busy} onClick={() => void decide(false)}>기각</button>
            <span className="note">원래 점수는 남고, 차액만 연구비에 더하거나 빼요.</span>
          </div>
          {error && <p className="hint bad" role="alert">{error}</p>}
        </div>
      )}
    </article>
  );
}

function Log({ rows, teams, onDone }: { rows: TeacherLearnGradingRow[]; teams: TeamLookup; onDone: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (!rows.length) return <p className="empty">아직 AI 채점 기록이 없어요(개념 문항은 바로 채점돼 여기 없어요).</p>;
  return (
    <div className="tbl-w"><table className="tc-tbl">
      <thead><tr><th>대상</th><th>모둠</th><th>상태</th><th>모델</th><th className="num">시도</th><th className="num">걸린 시간</th><th>언제</th><th /></tr></thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.id}>
            <td>{TARGET_WORD[g.targetType]}</td>
            <td><TeamTag id={g.teamId} teams={teams} /></td>
            <td><span className={`sig ${g.status === 'done' || g.status === 'cached' ? 'g' : g.status === 'overridden' ? '' : 'w'}`}>{GRADING_WORD[g.status] ?? g.status}</span></td>
            <td className="mono mini">{g.model ?? '—'}</td>
            <td className="num mono">{g.attempts}</td>
            <td className="num mono">{g.latencyMs ? `${(g.latencyMs / 1000).toFixed(1)}초` : '—'}</td>
            <td className="mini">{ago(g.createdAt)}</td>
            <td>
              {editing === g.id ? (
                <Override g={g} onDone={() => { setEditing(null); onDone(); }} onCancel={() => setEditing(null)} />
              ) : (
                <button type="button" className="btn sm ghost" onClick={() => setEditing(g.id)}>점수 정정</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

function Override({ g, onDone, onCancel }: { g: TeacherLearnGradingRow; onDone: () => void; onCancel: () => void }) {
  const max = maxOf(g.targetType);
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const n = Number(score);
  const ok = score !== '' && Number.isInteger(n) && n >= 0 && n <= max;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(LEARN_API.teacherOverride, { targetType: g.targetType, targetId: g.targetId, score: n, note: note.trim() || undefined });
      onDone();
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }
  return (
    <form className="row tc-ovr" onSubmit={submit}>
      <input className="txt mono tc-num" type="number" min={0} max={max} step={1} value={score} onChange={(e) => setScore(e.target.value)} aria-label={`새 점수 0~${max}`} placeholder={`0~${max}`} autoFocus />
      <input className="txt" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-label="정정 메모" placeholder="메모(선택)" style={{ width: 140 }} />
      <button type="submit" className="btn sm pri" disabled={!ok || busy}>저장</button>
      <button type="button" className="btn sm ghost" onClick={onCancel}>취소</button>
      {error && <span className="hint bad" role="alert">{error}</span>}
    </form>
  );
}
