/**
 * 단계 작업 영역의 학습 칸(learning-grant 설계 §5) — 모둠 공유 섬의 연구 노트 3칸 바로 아래에 붙는다:
 * `[연구 노트 평가받기 (+최대 240,000 크리스타)]` 단추 + '이 단계 연구 문항(개념 · 중급 · 심화)' 아코디언 카드.
 * 단계 확정 · 다음 단계 단추는 채점과 상관없이 늘 열려 있다(이 부품은 단계 상태를 건드리지 않는다).
 *
 * - 모든 단계 화면이 `NotesBlock` 으로 이 부품을 부르므로 9단계 모두에 나온다(잠긴 단계도 — 문항 · 노트 평가는 미리 할 수 있다).
 * - 문항 · 답 · 점수는 내 것만, 노트 평가는 모둠 공유. 정답 · 해설은 마지막 시도(또는 만점) 뒤에만 서버가 준다.
 * - 서술형 · 노트는 AI 채점(비동기) — 낸 즉시 'pending', 끝나면 WS `learn.graded` 로 다시 읽는다. AI 가 꺼져 있어도 화면은 막히지 않는다.
 */
import {
  formatCrista,
  LEARN_API,
  LEARN_COPY,
  STEP_META,
  type BoardResponse,
  type LearnAnswerInput,
  type LearnAttemptView,
  type LearnNoteEvalView,
  type LearnNoteState,
  type LearnQuestionView,
  type LearnRubricRowView,
  type LearnStepResponse,
  type ServerMessage,
  type StepId,
} from '@crista-web/web-contract';
import { useId, useState } from 'react';
import { api, message } from '../../api.ts';
import { useLive } from '../ui/index.ts';
import './learn.css';

const C = LEARN_COPY;

const refetch = (m: ServerMessage): boolean =>
  m.type === 'learn.graded' ||
  m.type === 'learn.stipend' ||
  (m.type === 'board.changed' && (m.reason.startsWith('learn') || m.reason.startsWith('note:') || m.reason.startsWith('job:') || m.reason === 'pick'));

export function StepLearn({ board: _board, stepId }: { board: BoardResponse; stepId: StepId }) {
  const live = useLive<LearnStepResponse>(LEARN_API.step(stepId), refetch);
  const data = live.data;
  if (!data) {
    return (
      <div className="ln" aria-busy={live.loading}>
        {live.error ? (
          <p className="hint bad" role="alert">
            ✕ {live.error.message}{' '}
            <button type="button" className="ln-link" onClick={live.reload}>
              {C.retry}
            </button>
          </p>
        ) : (
          <p className="hint">{C.stepLoading(STEP_META[stepId].title)}</p>
        )}
      </div>
    );
  }
  const replace = (q: LearnQuestionView) => live.setData((prev) => prev && { ...prev, items: prev.items.map((x) => (x.assignmentId === q.assignmentId ? q : x)) });
  return (
    <section className="ln" aria-label={C.stepRegion(stepId)}>
      <NoteEval stepId={stepId} state={data.note} onState={(note) => live.setData((prev) => prev && { ...prev, note })} reload={live.reload} />
      <div className="panel">
        <h3 className="ln-h">
          {C.itemsTitle} <small>{C.itemsSub}</small>
        </h3>
        <div className="ln-cap">
          <span>{C.capLeft(formatCrista(data.capUsedCrista), formatCrista(data.capCrista))}</span>
          <span className="ln-bar" role="progressbar" aria-valuemin={0} aria-valuemax={data.capCrista} aria-valuenow={data.capUsedCrista} aria-label={C.itemsCap}>
            <i style={{ width: `${Math.min(100, (100 * data.capUsedCrista) / data.capCrista)}%` }} />
          </span>
          {data.capUsedCrista >= data.capCrista && <span>{C.capReached}</span>}
        </div>
        <ol className="ln-items">
          {data.items.map((q) => (
            <Question key={q.assignmentId} q={q} onChange={replace} reload={live.reload} />
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── 연구 노트 평가 ──

function NoteEval({ stepId, state, onState, reload }: { stepId: StepId; state: LearnNoteState; onState: (s: LearnNoteState) => void; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graded = state.evals.filter((e) => e.status === 'graded');
  const label = graded.length ? C.noteRevise(formatCrista(state.maxCrista)) : C.noteButton(formatCrista(state.maxCrista));
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      onState(await api.post<LearnNoteState>(LEARN_API.noteEvaluate(stepId)));
    } catch (e) {
      setError(message(e));
      reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel ln-note">
      <h3 className="ln-h">
        {C.noteTitle}{' '}
        <small>
          {state.distributedNow ? `✓ ${C.noteSharedOn}` : state.sharedNeeded ? `${C.noteShared} ${C.noteAuthorsNow(state.authors, state.sharedNeeded)}` : C.noteShared}
        </small>
      </h3>
      <div className="acts">
        <button type="button" className="btn film sm" disabled={busy || !state.canEvaluate} onClick={() => void run()} aria-describedby={`ln-nr-${stepId}`}>
          {busy ? C.sending : label}
        </button>
        {state.reason && (
          <span className="note" id={`ln-nr-${stepId}`}>
            {state.reason}
          </span>
        )}
      </div>
      {error && <p className="hint bad">✕ {error}</p>}
      {state.evals.map((e) => (
        <EvalCard key={e.id} e={e} />
      ))}
    </div>
  );
}

function EvalCard({ e }: { e: LearnNoteEvalView }) {
  return (
    <div className="ln-eval">
      <div className="ln-eval-h">
        <b>{e.attempt === 1 ? C.evalFirst : C.evalSecond}</b>
        {e.status === 'pending' ? (
          <Pending />
        ) : (
          <>
            <span className="ln-score">{C.score(e.score ?? 0)}</span>
            <span className="ln-paid">{C.paid(formatCrista(e.crista))}</span>
            <span className="abadge ai">
              <i aria-hidden="true">✦</i>
              {C.aiGraded}
            </span>
            {e.overridden && <span className="chip">{C.overridden}</span>}
          </>
        )}
        <span className="mini muted">
          {e.distributed ? C.noteSharedOn : C.maxOf(formatCrista(e.maxCrista))} · {e.contributors.join(' · ')}
        </span>
      </div>
      {e.flags.length > 0 && <Flags flags={e.flags} />}
      {e.rubric && <Rubric rows={e.rubric} />}
      {e.feedback && <p className="ln-fb">{e.feedback}</p>}
      {e.status === 'graded' && <Appeal targetType="note" targetId={e.id} status={e.appeal?.status} />}
    </div>
  );
}

// ── 문항 ──

function Question({ q, onChange, reload }: { q: LearnQuestionView; onChange: (q: LearnQuestionView) => void; reload: () => void }) {
  const last = q.attempts[q.attempts.length - 1];
  const state =
    q.status === 'pending' || last?.status === 'pending'
      ? C.grading
      : last
        ? `${last.score !== null && last.score >= 50 ? '✓' : '△'} ${C.score(last.score ?? 0)}${q.status === 'practice' ? ` · ${C.practice}` : ''}`
        : `○ ${C.maxOf(formatCrista(q.maxCrista, { unit: false }))}`;
  return (
    <li>
      <details className="ln-q">
        <summary>
          <span className={`ln-tier ${q.tier}`}>{C.tier[q.tier]}</span>
          <span className="ln-t">{q.prompt}</span>
          <span className="ln-st">{state}</span>
        </summary>
        <QuestionBody q={q} onChange={onChange} reload={reload} />
      </details>
    </li>
  );
}

function QuestionBody({ q, onChange, reload }: { q: LearnQuestionView; onChange: (q: LearnQuestionView) => void; reload: () => void }) {
  const id = useId();
  const first = q.attempts[0];
  // 이의 제기는 마지막 답(고친 답이 있으면 그것)이 채점된 뒤에만 — 채점 중인 답에는 낼 수 없다.
  const last = q.attempts[q.attempts.length - 1];
  const answering = !first || (q.canRevise && q.attempts.length === 1);
  const [choice, setChoice] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const [text, setText] = useState(q.kind === 'text' && first?.answer.text ? first.answer.text : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  const call = async (fn: () => Promise<LearnQuestionView>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
      setRevising(false);
    } catch (e) {
      setError(message(e));
      reload();
    } finally {
      setBusy(false);
    }
  };
  const answer = (): LearnAnswerInput => (q.kind === 'text' ? { text } : q.kind === 'numeric' ? { value: Number(value.replace(',', '.')) } : { choice });
  const submit = () =>
    void call(() =>
      first
        ? api.post<LearnQuestionView>(LEARN_API.revise(first.answerId), { answer: answer() })
        : api.post<LearnQuestionView>(LEARN_API.answers, { assignmentId: q.assignmentId, answer: answer() }),
    );
  const chars = [...text.trim()].length;
  const ready =
    q.kind === 'text' ? chars >= (q.minChars ?? 1) && chars <= (q.maxChars ?? 9999) : q.kind === 'numeric' ? value.trim() !== '' && Number.isFinite(Number(value.replace(',', '.'))) : choice.length > 0;
  const showForm = answering && (!first || revising);

  return (
    <div className="ln-qb">
      <p className="ln-prompt" id={`${id}-p`}>
        {q.prompt}
      </p>
      {q.fallback && <p className="hint">ⓘ {C.fallback}</p>}
      {q.table && (
        <table className="ln-tbl">
          <thead>
            <tr>
              {q.table.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {q.hintUsed && q.hint && <p className="hint">💡 {q.hint}</p>}

      {q.attempts.map((a) => (
        <Attempt key={a.answerId} a={a} />
      ))}

      {showForm && (
        <form
          className="ln-qb"
          style={{ padding: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) submit();
          }}
        >
          {(q.kind === 'mc' || q.kind === 'multi') && q.choices && (
            <fieldset className="ln-choices" aria-describedby={`${id}-p`}>
              <legend>{q.kind === 'multi' ? C.pickMany : C.pickOne}</legend>
              {q.choices.map((c) => (
                <label key={c.id} className="ln-choice">
                  <input
                    type={q.kind === 'multi' ? 'checkbox' : 'radio'}
                    name={`${id}-c`}
                    checked={choice.includes(c.id)}
                    onChange={(e) =>
                      setChoice((prev) => (q.kind === 'multi' ? (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)) : [c.id]))
                    }
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </fieldset>
          )}
          {q.kind === 'numeric' && (
            <label className="ln-num">
              <span className="sr">{C.answerLabel}</span>
              <input className="txt mono" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-describedby={`${id}-p`} />
              {q.unit && <span className="mono">{q.unit}</span>}
            </label>
          )}
          {q.kind === 'text' && (
            <div className="ln-ta">
              <label className="sr" htmlFor={`${id}-t`}>
                {C.answerLabel}
              </label>
              <textarea id={`${id}-t`} className="txt" value={text} maxLength={(q.maxChars ?? 800) + 50} onChange={(e) => setText(e.target.value)} aria-describedby={`${id}-p ${id}-n`} />
              <span id={`${id}-n`} className={`cnt${chars > 0 && !ready ? ' bad' : ''}`} aria-live="polite">
                {C.chars(chars, q.minChars ?? 0, q.maxChars ?? 0)}
              </span>
            </div>
          )}
          <div className="acts">
            <button type="submit" className="btn pri sm" disabled={!ready || busy}>
              {busy ? C.sending : first ? C.revise : q.kind === 'text' ? C.submitText : C.submit}
            </button>
            {!q.hintUsed && (
              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void call(() => api.post<LearnQuestionView>(LEARN_API.hint(q.assignmentId)))}>
                {C.hint}
              </button>
            )}
            <span className="note">{C.maxOf(formatCrista(q.maxCrista))}</span>
          </div>
        </form>
      )}
      {answering && first && !revising && (
        <button type="button" className="btn sm" onClick={() => setRevising(true)}>
          {C.revise}
        </button>
      )}
      {error && <p className="hint bad">✕ {error}</p>}
      {last && last.status === 'graded' && <Appeal targetType="answer" targetId={last.answerId} status={q.appeal?.status} />}
    </div>
  );
}

function Attempt({ a }: { a: LearnAttemptView }) {
  return (
    <div className="ln-att">
      <div className="ln-att-h">
        <b>{a.attempt === 1 ? C.attemptFirst : C.attemptSecond}</b>
        {a.status === 'pending' ? (
          <Pending />
        ) : (
          <>
            {a.correct !== undefined && <span className={a.correct ? 'ln-ok' : 'ln-no'}>{a.correct ? `○ ${C.correct}` : `× ${C.wrong}`}</span>}
            <span className="ln-score">{C.score(a.score ?? 0)}</span>
            <span className="ln-paid">{C.paid(formatCrista(a.crista))}</span>
            {a.rubric && (
              <span className="abadge ai">
                <i aria-hidden="true">✦</i>
                {C.aiGraded}
              </span>
            )}
            {a.overridden && <span className="chip">{C.overridden}</span>}
          </>
        )}
      </div>
      {a.answer.text && <p className="mini muted">{a.answer.text}</p>}
      {a.answer.value !== undefined && <p className="mini muted mono">{C.answerValue(a.answer.value)}</p>}
      {a.flags.length > 0 && <Flags flags={a.flags} />}
      {a.rubric && <Rubric rows={a.rubric} />}
      {a.feedback && <p className="ln-fb">{a.feedback}</p>}
      {a.explanation && <p className="ln-fb ln-exp">{C.explanation(a.explanation)}</p>}
    </div>
  );
}

function Pending() {
  return (
    <span className="ln-pend" role="status">
      <i aria-hidden="true" />
      {C.pending}
    </span>
  );
}

function Flags({ flags }: { flags: string[] }) {
  return (
    <ul className="ln-rub" aria-label={C.flagsLabel}>
      {flags.map((f) => (
        <li key={f} className="none">
          <span className="mk" aria-hidden="true">!</span>
          <span className="ln-flag">{(C.flag as Record<string, string>)[f] ?? f}</span>
        </li>
      ))}
    </ul>
  );
}

function Rubric({ rows }: { rows: LearnRubricRowView[] }) {
  return (
    <ul className="ln-rub" aria-label={C.rubricLabel}>
      {rows.map((r) => (
        <li key={r.id} className={r.credit}>
          <span className="mk" aria-label={C.creditWord[r.credit]}>
            {C.credit[r.credit]}
          </span>
          <span>
            {r.criterion}
            {r.note && <small>{r.note}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Appeal({ targetType, targetId, status }: { targetType: 'answer' | 'note'; targetId: string; status?: 'open' | 'accepted' | 'rejected' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (status === 'open' || done) return <p className="hint">⚑ {done ?? C.appealOpen}</p>;
  if (status) return <p className="hint">⚑ {C.appealDone}</p>;
  if (!open)
    return (
      <button type="button" className="ln-link" onClick={() => setOpen(true)}>
        {C.appeal}
      </button>
    );
  return (
    <div className="ln-appeal">
      <textarea className="txt" placeholder={C.appealPlaceholder} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} aria-label={C.appeal} />
      <div className="acts">
        <button
          type="button"
          className="btn sm"
          disabled={busy || [...reason.trim()].length < 4}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api.post(LEARN_API.appeals, { targetType, targetId, reason });
              setDone(C.appealOpen);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {C.send}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
          {C.cancel}
        </button>
      </div>
      {error && <p className="hint bad">✕ {error}</p>}
    </div>
  );
}
