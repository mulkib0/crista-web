/**
 * ③ 서류 심사 — 대기 · 플래그(끼워 넣기 등) 목록과 교사 수동 판정 · 정정(설계 §5.11 ⑥ · reviews.ts).
 * `GET /api/teacher/classes/:id/reviews`(`?all=1` 이면 최근 판정 건까지) · `POST /api/teacher/reviews/:id/decision {verdict, note}`.
 * 정정해도 원래 판정은 서버가 남긴다(`originalVerdict`). 판정 메모는 1~300자(서버 검사와 같음).
 */
import { useState, type FormEvent } from 'react';
import {
  DOC_KIND_LABEL,
  REVIEW_API,
  TEACHER_API,
  type DocReviewFlag,
  type DocReviewVerdict,
  type DocReviewView,
  type TeacherReviewsResponse,
  type TeacherReviewView,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { AiBadge, Tabs, useLocalTab } from '../board/ui/index.ts';
import { ago, classNews, useTeacherLive } from './hooks.ts';
import { TeamTag, type TeamLookup } from './TeamTag.tsx';

export const VERDICT_WORD: Record<DocReviewVerdict, string> = { pending: '판정 대기', pass: '통과', revise: '보완', reject: '거절' };
const VERDICT_SIG: Record<DocReviewVerdict, string> = { pending: 'w', pass: 'g', revise: 'w', reject: 'b' };
const STAGE_WORD: Record<DocReviewView['stage'], string> = {
  rules: '규칙 검사에서 끝남',
  cached: '같은 글의 앞 결과',
  queued: 'AI 심사 중',
  done: 'AI 심사 끝',
  retrying: 'AI 다시 시도 중(오류)',
  deliberating: '판정 정리 중(숙고 기간 — 끝나면 자동 공개)',
  auto: '규칙 자동 판정(AI 거절 · 장애 · 상한)',
  manual: '선생님 판정',
};
const FLAG_WORD: Record<DocReviewFlag, string> = { injection: '끼워 넣기', off_topic: '주제 밖', copied: '베낀 글', not_korean: '한국어 아님' };
const ITEM_WORD = { ok: '맞음', missing: '빠짐', inconsistent: '어긋남', unclear: '흐림' } as const;

export function ReviewsView({ classId, teams, onChanged }: { classId: string; teams: TeamLookup; onChanged?: () => void }) {
  const [scope, setScope] = useLocalTab('teacher:reviews', ['open', 'all'] as const, 'open');
  const live = useTeacherLive<TeacherReviewsResponse>(TEACHER_API.reviews(classId, scope === 'all'), classNews(classId));
  const rows = live.data?.reviews ?? [];
  const pending = rows.filter((r) => r.verdict === 'pending').length;
  return (
    <div className="tc-stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Tabs
          size="sm"
          label="서류 심사 목록"
          value={scope}
          onChange={(v) => setScope(v as typeof scope)}
          items={[
            { id: 'open', label: '대기 · 플래그 · 선생님 판정', sub: scope === 'open' ? `${rows.length}건 · 대기 ${pending}` : undefined },
            { id: 'all', label: '최근 판정까지(정정)', sub: scope === 'all' ? `최근 ${rows.length}건` : undefined },
          ]}
        />
        <button type="button" className="btn sm ghost" onClick={live.reload}>다시 읽기</button>
      </div>
      {live.error && <p className="err" role="alert">{live.error.message}</p>}
      {!live.data ? (
        <p className="hint">심사 목록을 읽는 중…</p>
      ) : rows.length === 0 ? (
        <p className="empty">{scope === 'open' ? '심사 중이거나 살펴볼 서류가 없어요. 판정은 AI · 규칙이 자동으로 내요.' : '아직 낸 서류가 없어요.'}</p>
      ) : (
        <div className="cards">
          {rows.map((r) => <ReviewCard key={r.id} r={r} teams={teams} onDone={() => { live.reload(); onChanged?.(); }} />)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ r, teams, onDone }: { r: TeacherReviewView; teams: TeamLookup; onDone: () => void }) {
  const [open, setOpen] = useState(r.verdict === 'pending' || r.flags.length > 0);
  const failed = r.ruleFindings.filter((f) => f.status === 'fail');
  return (
    <article className={`card tc-rv${r.verdict === 'pending' ? ' on' : ''}`} aria-label={`${DOC_KIND_LABEL[r.kind]} 심사`}>
      <div className="card-h">
        <b>{DOC_KIND_LABEL[r.kind]}</b>
        <TeamTag id={r.teamId} teams={teams} />
        <span className="mono mini">판 {r.docVersion}</span>
        <span className={`sig ${VERDICT_SIG[r.verdict]}`}>{VERDICT_WORD[r.verdict]}</span>
        {r.originalVerdict && r.originalVerdict !== 'pending' && r.originalVerdict !== r.verdict && <span className="chip">원래 {VERDICT_WORD[r.originalVerdict]}</span>}
        {r.flags.map((f) => <span key={f} className="sig b">⚑ {FLAG_WORD[f] ?? f}</span>)}
        {r.model && <AiBadge model={r.model} />}
        <span className="mini muted tc-push">{r.requestedByName ?? '—'} · {ago(r.createdAt)}</span>
      </div>
      <p className="mini muted" style={{ margin: 0 }}>
        {STAGE_WORD[r.stage]}{failed.length ? ` · 규칙 걸림 ${failed.length}` : ''}{r.teacherNote ? ` · 메모: ${r.teacherNote}` : ''}
      </p>
      <button type="button" className="btn sm ghost tc-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? '접기' : '서류 · 심사 보기'}</button>
      {open && (
        <div className="tc-rv-body">
          {r.ruleFindings.length > 0 && (
            <div>
              <span className="lab">규칙 검사</span>
              <ul className="tc-list">
                {r.ruleFindings.map((f) => (
                  <li key={f.id} className={f.status === 'fail' ? 'bad' : ''}>{f.status === 'fail' ? '✕' : '✓'} {f.note}{f.severity === 'reject' && f.status === 'fail' ? ' (거절 사유)' : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {r.items.length > 0 && (
            <div>
              <span className="lab">AI 칸별 지적</span>
              <ul className="tc-list">
                {r.items.map((it) => (
                  <li key={it.id} className={it.status === 'ok' ? '' : 'warn'}>{it.status === 'ok' ? '✓' : '△'} <b>{it.section ?? it.id}</b> {ITEM_WORD[it.status]} — {it.note}</li>
                ))}
              </ul>
            </div>
          )}
          {r.feedback && <p className="tc-quote">{r.feedback}</p>}
          {Object.keys(r.sections).length > 0 && (
            <details className="tc-doc">
              <summary>심사한 판의 서류 칸 {Object.keys(r.sections).length}개 읽기</summary>
              {Object.entries(r.sections).map(([k, body]) => (
                <div key={k} className="tc-note">
                  <span className="lab">{r.checklist.find((c) => c.section === k)?.criterion ? `${k} — ${r.checklist.find((c) => c.section === k)!.criterion}` : k}</span>
                  <p>{body || <span className="muted">(비어 있음)</span>}</p>
                </div>
              ))}
            </details>
          )}
          <DecisionForm r={r} onDone={onDone} />
        </div>
      )}
    </article>
  );
}

function DecisionForm({ r, onDone }: { r: TeacherReviewView; onDone: () => void }) {
  const choices = (['pass', 'revise', 'reject'] as const).filter((v) => v !== r.verdict);
  const [picked, setVerdict] = useState<(typeof choices)[number]>(choices[0]!);
  // 판정이 바뀌면(저장 · 다른 교사) 지금 판정은 고를 수 없다 — 남은 첫 판정으로.
  const verdict = choices.includes(picked) ? picked : choices[0]!;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = [...note.trim()].length;
  const correcting = r.verdict !== 'pending';
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (n < 1 || n > 300) return setError('판정 메모를 1~300자로 써 주세요(원본은 남아요).');
    if (correcting && !confirm(`${VERDICT_WORD[r.verdict]} → ${VERDICT_WORD[verdict]}(으)로 정정할까요? 원래 판정은 기록에 남아요.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(REVIEW_API.teacherDecide(r.id), { verdict, note: note.trim() });
      setNote('');
      onDone();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="tc-decide" onSubmit={submit}>
      <span className="lab">{correcting ? '판정 정정' : '선생님 판정'}</span>
      <div className="tc-seg" role="radiogroup" aria-label="판정">
        {choices.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={verdict === v} className={`rchip v-${v}`} onClick={() => setVerdict(v)}>{VERDICT_WORD[v]}</button>
        ))}
      </div>
      <label className="sr" htmlFor={`note-${r.id}`}>판정 메모</label>
      <textarea id={`note-${r.id}`} className="txt" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="판정 이유 — 모둠에게 보여요(1~300자)" />
      <div className="acts">
        <button type="submit" className={`btn sm ${verdict === 'reject' ? 'danger' : 'pri'}`} disabled={busy || n < 1}>{correcting ? '정정 저장' : '판정 저장'}</button>
        <span className="note">{n}/300{verdict === 'reject' ? ' · 거절은 보통 규칙(신규성 · 학급 중복)이 내는 판정이에요' : ''}</span>
      </div>
      {error && <p className="hint bad" role="alert">{error}</p>}
    </form>
  );
}
