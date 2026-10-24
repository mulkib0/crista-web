/**
 * ④ 임상 시뮬레이션 수동 처리(설계 §5.14 · §12-19 · features/clinical.ts 교사 경로).
 * - 목록: `GET /api/teacher/classes/:id/clinical` — 결과 · 시뮬레이션 상태 · **game-rules 참고 판정**(judgeStep · 통과 확률)을 늘 함께.
 * - [다시 시뮬레이션] `POST …/resimulate`(진행 중 · 판정 대기, 결과가 없을 때).
 * - [직접 판정] `POST …/decision {verdict, holdKind, note}` — 결과가 없을 때. AI 결과가 있으면 공개(끝나는 게임 일) 전에만 `override: true` 로 정정.
 *   교사 판정은 서버가 판정에 맞는 결정적 규칙 생성 표('선생님 판정 · 규칙으로 만든 표')로 그림을 채운다.
 */
import { useState, type FormEvent } from 'react';
import {
  CLINICAL_API,
  CLINICAL_COPY,
  formatGameDay,
  PHASE_LABEL,
  type HoldKind,
  type TeacherTrialView,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { AiBadge, Tabs, useLocalTab } from '../board/ui/index.ts';
import { classNews, useTeacherLive } from './hooks.ts';
import { TeamTag, type TeamLookup } from './TeamTag.tsx';

const STATUS_WORD: Record<string, string> = { recruiting: '모집 중', running: '진행 중', pending: '판정 대기', completed: '통과', held: '보류' };
const SIM_WORD: Record<TeacherTrialView['simStatus'], string> = { none: '아직 안 돌림', queued: 'AI 시뮬레이션 중', ready: '결과 있음', manual: '선생님 판정' };
const HOLD_KINDS: HoldKind[] = ['safety', 'efficacy', 'both', 'operational'];
const pct = (p: number) => `${Math.round(p * 100)}%`;

export function ClinicalView({ classId, teams, onChanged }: { classId: string; teams: TeamLookup; onChanged?: () => void }) {
  const [scope, setScope] = useLocalTab('teacher:clinical', ['live', 'all'] as const, 'live');
  const live = useTeacherLive<{ trials: TeacherTrialView[] }>(CLINICAL_API.teacher(classId), classNews(classId), 15_000);
  const all = live.data?.trials ?? [];
  const active = all.filter((t) => t.status === 'running' || t.status === 'pending');
  const rows = scope === 'live' ? active : all;
  return (
    <div className="tc-stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Tabs size="sm" label="임상 목록" value={scope} onChange={(v) => setScope(v as typeof scope)}
          items={[{ id: 'live', label: '진행 중 · 판정 대기', sub: `${active.length}건` }, { id: 'all', label: '모든 시도', sub: `${all.length}건` }]} />
        <button type="button" className="btn sm ghost" onClick={live.reload}>다시 읽기</button>
      </div>
      {live.error && <p className="err" role="alert">{live.error.message}</p>}
      {!live.data ? <p className="hint">임상 목록을 읽는 중…</p> : rows.length === 0 ? (
        <p className="empty">{scope === 'live' ? '지금 진행 중이거나 판정을 기다리는 임상이 없어요.' : '아직 시작한 임상이 없어요(3.3 IND 승인 뒤 열려요).'}</p>
      ) : (
        <div className="cards">{rows.map((t) => <TrialCard key={t.id} t={t} teams={teams} onDone={() => { live.reload(); onChanged?.(); }} />)}</div>
      )}
    </div>
  );
}

function TrialCard({ t, teams, onDone }: { t: TeacherTrialView; teams: TeamLookup; onDone: () => void }) {
  const actionable = t.status === 'running' || t.status === 'pending';
  const ref = t.reference;
  const resultVerdict = t.result?.verdict ?? t.verdict;
  return (
    <article className={`card tc-tr${t.status === 'pending' ? ' on' : ''}`} aria-label={`${PHASE_LABEL[t.phase]} 임상`}>
      <div className="card-h">
        <TeamTag id={t.teamId} teams={teams} />
        <b>{PHASE_LABEL[t.phase]}</b>
        <span className="mono mini">{t.attempt}회차 · {t.protocol.codeName}</span>
        <span className={`sig ${t.status === 'pending' ? 'w' : t.status === 'held' ? 'b' : t.status === 'completed' ? 'g' : ''}`}>{STATUS_WORD[t.status] ?? t.status}</span>
        <span className="chip">{SIM_WORD[t.simStatus]}{t.simAttempts ? ` · ${t.simAttempts}번 시도` : ''}</span>
        {t.resultSource === 'llm' && <AiBadge model={t.resultModel ?? undefined} title="Claude 가 계산값으로 만든 교육용 시뮬레이션" />}
        {t.resultSource === 'teacher' && <span className="chip">{CLINICAL_COPY.teacherMade}</span>}
        {t.resultSource === 'rule' && <span className="chip">{CLINICAL_COPY.ruleMade}</span>}
        <span className="mini muted tc-push">
          {t.startedGameDay !== null ? `${formatGameDay(t.startedGameDay)} 시작` : '시작 전'}{t.endsGameDay !== null ? ` · ${formatGameDay(t.endsGameDay)} 공개` : ''}
        </span>
      </div>
      <div className="tc-tr-grid">
        <div>
          <span className="lab">AI · 선생님 결과</span>
          {resultVerdict ? (
            <p className="tc-big">{resultVerdict === 'pass' ? '통과' : `보류 · ${CLINICAL_COPY.holdKind[(t.result?.holdKind ?? t.holdKind)!] ?? ''}`}</p>
          ) : (
            <p className="tc-big muted">결과 없음</p>
          )}
          {t.result?.analysis && <p className="mini tc-quote">{t.result.analysis}</p>}
          {t.simError && <p className="hint bad">시뮬레이션 오류: {t.simError}</p>}
        </div>
        <div className="tc-ref">
          <span className="lab">참고 판정</span>
          {ref ? (
            <>
              <p className="tc-big">{ref.passed ? '통과 쪽' : `보류 쪽${ref.failure ? ` · ${CLINICAL_COPY.holdKind[ref.failure as HoldKind] ?? ref.failure}` : ''}`} <small className="mono">통과 확률 {pct(ref.passProb)}</small></p>
              <div className="bar" aria-hidden="true"><i style={{ width: pct(ref.passProb) }} /></div>
              {ref.reasons.length > 0 && <ul className="tc-list mini">{ref.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}</ul>}
              {ref.divergent && <p className="verdict warn">⚑ AI 판정이 참고 확률과 크게 어긋나요 — 한 번 살펴보세요.</p>}
              {ref.llmOriginal && <p className="mini muted">AI 원래 판정: {ref.llmOriginal.verdict === 'pass' ? '통과' : `보류 · ${ref.llmOriginal.holdKind ? CLINICAL_COPY.holdKind[ref.llmOriginal.holdKind] : ''}`}</p>}
            </>
          ) : <p className="mini muted">시작 기록이 없어 참고 판정이 아직 없어요.</p>}
        </div>
      </div>
      {actionable && <TrialActions t={t} onDone={onDone} />}
    </article>
  );
}

function TrialActions({ t, onDone }: { t: TeacherTrialView; onDone: () => void }) {
  const hasAi = t.simStatus === 'ready';
  const [verdict, setVerdict] = useState<'pass' | 'held'>(t.reference?.passed === false ? 'held' : 'pass');
  const [holdKind, setHoldKind] = useState<HoldKind>('efficacy');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDone(ok);
      onDone();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  function decide(e: FormEvent) {
    e.preventDefault();
    const word = verdict === 'pass' ? '통과' : `보류(${CLINICAL_COPY.holdKind[holdKind]})`;
    if (hasAi && !confirm(`AI 결과를 ${word}(으)로 정정할까요? AI 원래 판정은 기록에 남고, 그림은 규칙으로 만든 표로 바뀌어요.`)) return;
    void run(
      () => api.post(CLINICAL_API.teacherDecide(t.id), { verdict, holdKind: verdict === 'held' ? holdKind : null, note: note.trim() || undefined, ...(hasAi ? { override: true } : {}) }),
      hasAi ? '정정했어요 — 끝나는 게임 일에 공개돼요.' : '판정했어요 — 끝나는 게임 일에 공개돼요.',
    );
  }
  return (
    <form className="tc-decide" onSubmit={decide}>
      <span className="lab">{hasAi ? '공개 전 정정' : '직접 판정'}</span>
      <div className="row">
        {!hasAi && (
          <button type="button" className="btn sm" disabled={busy} onClick={() => void run(() => api.post(CLINICAL_API.teacherResimulate(t.id)), 'AI 시뮬레이션을 다시 돌려요.')}>↻ 다시 시뮬레이션</button>
        )}
        <div className="tc-seg" role="radiogroup" aria-label="판정">
          <button type="button" role="radio" aria-checked={verdict === 'pass'} className="rchip" onClick={() => setVerdict('pass')}>통과</button>
          <button type="button" role="radio" aria-checked={verdict === 'held'} className="rchip" onClick={() => setVerdict('held')}>보류</button>
        </div>
        {verdict === 'held' && (
          <select className="txt tc-sel" aria-label="보류 종류" value={holdKind} onChange={(e) => setHoldKind(e.target.value as HoldKind)}>
            {HOLD_KINDS.map((k) => <option key={k} value={k}>{CLINICAL_COPY.holdKind[k]}</option>)}
          </select>
        )}
      </div>
      <label className="sr" htmlFor={`tn-${t.id}`}>판정 메모</label>
      <input id={`tn-${t.id}`} className="txt" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모(선택 · 300자)" />
      <div className="acts">
        <button type="submit" className="btn sm pri" disabled={busy}>{hasAi ? '정정 저장' : '판정 저장'}</button>
        {t.reference && <span className="note">참고 판정은 {t.reference.passed ? '통과' : '보류'} 쪽이에요</span>}
      </div>
      {done && <p className="hint good" role="status">{done}</p>}
      {error && <p className="hint bad" role="alert">{error}</p>}
    </form>
  );
}
