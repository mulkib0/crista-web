/**
 * ⑧ 모둠별 현재 단계 · 막힌 이유 · 연구 노트(설계 §9 '진행') — `GET /api/teacher/classes/:id/progress`(features/teacher.ts).
 * 단계 상태는 학생 사이드바와 같은 서버 판정. 선생님이 손대야 풀리는 막힘(심사 · 임상 판정 · 이의)은 그 화면으로 바로 가는 단추를 단다.
 */
import { useState } from 'react';
import {
  formatCrista,
  NOTE_SECTION_LABEL,
  NOTE_SECTIONS,
  STEP_META,
  TEACHER_API,
  type StepId,
  type TeacherProgressResponse,
  type TeacherStuck,
  type TeacherTeamProgress,
} from '@crista-web/web-contract';
import { ink } from '../ink.ts';
import { StateMark, STATE_WORD, type Live } from '../board/ui/index.ts';
import { ago, classNews, useTeacherLive } from './hooks.ts';
import type { TeacherSection } from './nav.ts';

const STUCK_GO: Record<TeacherStuck['kind'], TeacherSection | null> = { held: null, blocked: null, review: 'reviews', trial: 'clinical', appeal: 'learn' };

/** 교사 화면 맨 위(Teacher.tsx)가 읽어 사이드바 건수와 함께 쓴다. */
export const useProgress = (classId: string | null): Live<TeacherProgressResponse> =>
  useTeacherLive<TeacherProgressResponse>(classId ? TEACHER_API.progress(classId) : null, classNews(classId ?? '', (m) => m.type === 'team.registered' || m.type === 'team.updated'));

export function ProgressView({ live, go }: { live: Live<TeacherProgressResponse>; go: (s: TeacherSection) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!live.data) return <p className="hint">{live.error ? live.error.message : '모둠 진행을 읽는 중…'}</p>;
  const teams = live.data.teams;
  const registered = teams.filter((t) => t.registered);
  const waiting = registered.reduce((n, t) => n + t.stuck.filter((s) => s.teacher).length, 0);
  return (
    <div className="tc-stack">
      <div className="tc-sum" role="list" aria-label="학급 요약">
        <Sum k="등기한 모둠" v={`${registered.length} / ${teams.length}`} />
        <Sum k="선생님 확인 대기" v={String(waiting)} tone={waiting ? 'warn' : undefined} />
        <Sum k="막힌 모둠" v={String(registered.filter((t) => t.stuck.some((s) => !s.teacher)).length)} />
        <Sum k="가장 앞선 단계" v={registered.length ? maxStep(registered) : '—'} />
      </div>
      <div className="tc-teams">
        {teams.map((t) => (
          <TeamCard key={t.teamId} t={t} open={open === t.teamId} onToggle={() => setOpen((o) => (o === t.teamId ? null : t.teamId))} go={go} />
        ))}
      </div>
    </div>
  );
}

function Sum({ k, v, tone }: { k: string; v: string; tone?: 'warn' }) {
  return (
    <div className={`tc-sum-i${tone ? ` ${tone}` : ''}`} role="listitem">
      <span>{k}</span>
      <b className="mono">{v}</b>
    </div>
  );
}

const ORDER = Object.keys(STEP_META) as StepId[];
function maxStep(teams: TeacherTeamProgress[]): string {
  const best = teams.map((t) => ORDER.indexOf(t.currentStep)).reduce((a, b) => Math.max(a, b), 0);
  const id = ORDER[best]!;
  return `${id} ${STEP_META[id].title}`;
}

function TeamCard({ t, open, onToggle, go }: { t: TeacherTeamProgress; open: boolean; onToggle: () => void; go: (s: TeacherSection) => void }) {
  const color = ink(t.ink);
  if (!t.registered) {
    return (
      <article className="tc-team off" aria-label={`${t.plot}모둠 · 등기 전`}>
        <header className="tc-team-h">
          <i className="inkd" style={{ background: color.base }} aria-hidden="true" />
          <b>{t.plot}모둠</b>
          <span className="muted mini">등기 전 · {t.members.length}명</span>
        </header>
        <p className="mini muted" style={{ margin: 0 }}>사옥 지구에서 입사 · 등기하면 단계가 열려요.</p>
      </article>
    );
  }
  const cur = t.steps.find((s) => s.id === t.currentStep);
  const notesN = t.notes.length;
  return (
    <article className="tc-team" aria-label={`${t.startupName} 진행`}>
      <header className="tc-team-h">
        <i className="inkd" style={{ background: color.base }} aria-hidden="true" />
        <b>{t.startupName}</b>
        <span className="tc-tick mono">{t.ticker}</span>
        <span className="mini muted tc-team-m">{t.members.map((m) => m.displayName).join(' · ') || '모둠원 없음'}</span>
      </header>
      <div className="tc-now">
        <span className="tc-k">지금 단계</span>
        <b>{t.currentStep} {STEP_META[t.currentStep].title}</b>
        {cur && <span className={`tc-st s-${cur.state}`}><StateMark state={cur.state} /> {cur.sub ?? STATE_WORD[cur.state]}{cur.progressPct !== undefined && cur.state === 'running' ? ` · ${cur.progressPct}%` : ''}</span>}
      </div>
      <ol className="tc-pips" aria-label="9단계 상태">
        {t.steps.map((s) => (
          <li key={s.id} className={`tc-pip s-${s.state}${s.id === t.currentStep ? ' cur' : ''}`} title={`${s.id} ${STEP_META[s.id].title} — ${STATE_WORD[s.state]}${s.reason ? ` · ${s.reason}` : ''}`}>
            <span className="mono">{s.id}</span>
            <span className="tc-pip-k" aria-label={STATE_WORD[s.state]}>{s.state === 'done' ? '✓' : s.state === 'running' ? '▸' : s.state === 'held' ? '✕' : s.state === 'blocked' ? '⏸' : s.state === 'locked' ? '·' : '○'}</span>
          </li>
        ))}
      </ol>
      {t.stuck.length > 0 ? (
        <ul className="tc-stuck" aria-label="막힌 이유">
          {t.stuck.map((s, i) => {
            const target = STUCK_GO[s.kind];
            return (
              <li key={i} className={s.teacher ? 'me' : ''}>
                <span className="tc-stuck-k">{s.teacher ? '선생님' : s.kind === 'held' ? '보류' : '막힘'}</span>
                <span>{s.stepId ? <b className="mono">{s.stepId} </b> : null}{s.message}</span>
                {target && <button type="button" className="btn sm ghost" onClick={() => go(target)}>열기</button>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mini muted" style={{ margin: 0 }}>막힌 곳 없음</p>
      )}
      <footer className="tc-team-f">
        <span className="mini"><span className="muted">연구비</span> <b className="mono">{formatCrista(t.balanceCrista)}</b></span>
        <span className="mini"><span className="muted">표적</span> {t.targetId ?? '—'}{t.revisionNo > 1 ? ` · ${t.revisionNo}번째` : ''}</span>
        <span className="mini"><span className="muted">마지막 활동</span> {ago(t.lastActivityAt)}</span>
        <button type="button" className="btn sm" aria-expanded={open} onClick={onToggle}>연구 노트 {notesN}칸 {open ? '접기' : '보기'}</button>
      </footer>
      {open && <Notes t={t} />}
    </article>
  );
}

function Notes({ t }: { t: TeacherTeamProgress }) {
  const steps = ORDER.filter((id) => t.notes.some((n) => n.stepId === id));
  if (!steps.length) return <p className="empty mini">아직 쓴 연구 노트가 없어요.</p>;
  return (
    <div className="tc-notes">
      {steps.map((id) => (
        <section key={id} className="tc-note-step" aria-label={`${id} 연구 노트`}>
          <h4>{id} {STEP_META[id].title}</h4>
          {NOTE_SECTIONS.map((sec) => {
            const n = t.notes.find((x) => x.stepId === id && x.section === sec);
            if (!n) return null;
            return (
              <div key={sec} className="tc-note">
                <span className="lab">{NOTE_SECTION_LABEL[sec]} <em className="muted">{n.byName ?? '—'} · {ago(n.updatedAt)}</em></span>
                <p>{n.body}</p>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
