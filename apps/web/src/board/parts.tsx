/**
 * ③ 작업 화면의 작은 부품 — 직책 배지 · 작업 상태 · 출처 표시 · 연구 노트 3칸.
 */
import { useEffect, useRef, useState } from 'react';
import {
  API,
  NOTE_MAX,
  NOTE_SECTION_LABEL,
  NOTE_SECTIONS,
  type Avatar,
  type BoardResponse,
  type NoteResponse,
  type NoteSection,
  type StepId,
  type WebJobView,
} from '@crista-web/web-contract';
import { api, ApiFailure, message } from '../api.ts';

const AVATAR_LABEL: Record<Avatar, string> = { ceo: 'CEO', cso: 'CSO', cto: 'CTO', cmo: 'CMO' };

export function By({ name, avatar }: { name: string | null; avatar: Avatar | null }) {
  return (
    <span className="row" style={{ gap: 6, display: 'inline-flex' }}>
      <b>{name ?? '—'}</b>
      {avatar && <span className="badge">{AVATAR_LABEL[avatar]}</span>}
    </span>
  );
}

const PHASE: Record<string, string> = {
  queued: '대기열',
  prepare: '리간드 준비',
  dock: '도킹',
  analyze: '결합 분석',
  predict: '예측',
  replay: '저장된 계산 다시 읽기',
};

export function JobState({ job }: { job: WebJobView }) {
  if (job.status === 'succeeded') return <span className="sig g">완료</span>;
  if (job.status === 'failed') return <span className="sig b" title={job.error?.message}>실패 · 환급</span>;
  const pct = Math.round(job.progress * 100);
  return (
    <span style={{ display: 'grid', gap: 3, minWidth: 110 }}>
      <span className="mini mono">
        {job.status === 'queued' ? `대기${job.queuePosition !== undefined ? ` · 앞에 ${job.queuePosition}` : ''}` : `${PHASE[job.phase ?? ''] ?? '계산'} ${pct}%`}
      </span>
      <span className="progress" aria-label={`진행 ${pct}%`}><i style={{ width: `${pct}%` }} /></span>
    </span>
  );
}

/** 결과의 성격(설계 §5.4) — 자료 조회 · 실제 계산 · AI 예측 · 테스트용 고정 결과. */
export function SourceChip({ source }: { source: WebJobView['source'] }) {
  if (source === 'fixture') return <span className="chip test" title="워커가 fixture 모드 — 실제 과학 계산이 아닙니다">테스트용 고정 결과</span>;
  if (source === 'dataset') return <span className="chip">자료 조회</span>;
  if (source === 'vina') return <span className="chip src">실제 계산 · Vina</span>;
  if (source === 'admet-ai') return <span className="chip src">AI 예측 · ADMET-AI</span>;
  return null;
}

/**
 * 연구 노트 3칸(설계 §6.4) — 칸마다 따로 저장해서 세 명이 동시에 써도 덮지 않는다. 내가 고치는 칸은 다른 사람이 바꿔도
 * 입력 중인 글을 덮지 않고 '새 글이 있어요' 만 알린다. 1초 동안 멈추면 저장.
 * 저장은 읽은 칸 버전(expectedVersion)을 싣는다 — 그 사이 누가 같은 칸을 고쳤으면 409 `stale` 로 상대 글을 받아
 * 내 초안은 그대로 두고 합칠지 · 내 글로 저장할지 고르게 한다.
 */
export function Notes({ board, stepId }: { board: BoardResponse; stepId: StepId }) {
  return (
    <div className="panel">
      <h3 className="ptitle">연구 노트 <small>칸마다 따로 저장 · 모둠 공유</small></h3>
      <div className="notes">
        {NOTE_SECTIONS.map((section) => (
          <NoteCell key={`${board.program.revisionId}-${stepId}-${section}`} board={board} stepId={stepId} section={section} />
        ))}
      </div>
    </div>
  );
}

/** 409 `stale` 때 받은 지금 칸 — 칸이 지워졌으면 note 가 없다. */
interface Theirs {
  body: string;
  byName: string | null;
  version: number;
}

function NoteCell({ board, stepId, section }: { board: BoardResponse; stepId: StepId; section: NoteSection }) {
  const remote = board.notes.find((n) => n.stepId === stepId && n.section === section);
  const [text, setText] = useState(remote?.body ?? '');
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [theirs, setTheirs] = useState<Theirs | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  // 내 글이 딛고 선 칸 버전 — 고치기 시작한 뒤에는 남이 바꿔도 그대로 둔다(저장할 때 서버가 비교).
  const base = useRef(remote?.version ?? 0);
  const remoteBody = remote?.body ?? '';
  const remoteVersion = remote?.version ?? 0;

  // 남이 바꾼 글 — 내가 고치는 중이 아니면 바로 반영.
  useEffect(() => {
    if (dirty) return;
    setText(remoteBody);
    textRef.current = remoteBody;
    base.current = remoteVersion;
  }, [remoteBody, remoteVersion, dirty]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const save = async (body: string) => {
    if (timer.current) clearTimeout(timer.current);
    setState('saving');
    try {
      const res = await api.put<NoteResponse>(API.note(stepId, section), { body, expectedVersion: base.current });
      base.current = res.version;
      // 저장하는 사이 더 쓴 글이 있으면 아직 고치는 중이다.
      if (textRef.current === body) setDirty(false);
      setTheirs(null);
      setState('saved');
      setErr(null);
    } catch (e) {
      setState('error');
      if (e instanceof ApiFailure && e.code === 'stale') {
        setTheirs(e.note ? { body: e.note.body, byName: e.note.byName, version: e.note.version } : { body: '', byName: null, version: 0 });
        setErr(null);
      } else {
        setErr(message(e));
      }
    }
  };

  const onChange = (value: string) => {
    setText(value);
    textRef.current = value;
    setDirty(true);
    setState('idle');
    if (timer.current) clearTimeout(timer.current);
    // 충돌을 고르는 동안에는 자동 저장하지 않는다(늘 409 가 된다).
    if (!theirs) timer.current = setTimeout(() => void save(value), 1000);
  };

  /** 충돌 풀기 — 상대 글 버전 위에 저장한다. */
  const resolve = (body: string) => {
    if (!theirs) return;
    base.current = theirs.version;
    setText(body);
    textRef.current = body;
    void save(body);
  };

  const conflict = !theirs && dirty && remoteVersion !== base.current && remote && remote.byName !== board.account.displayName;
  return (
    <div className="note-c">
      <label className="lab" htmlFor={`n-${stepId}-${section}`}>
        {NOTE_SECTION_LABEL[section]}
        <em className="mini">
          {state === 'saving' ? '저장 중…' : theirs ? '합치기 필요' : state === 'error' ? '저장 실패' : remote ? `${remote.byName ?? '—'}${remote.avatar ? ` · ${remote.avatar.toUpperCase()}` : ''}` : ''}
        </em>
      </label>
      <textarea
        id={`n-${stepId}-${section}`}
        className="txt"
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => dirty && !theirs && void save(text)}
        placeholder={section === 'why' ? '이 선택의 가설과 근거는?' : section === 'unknown' ? '아직 모르는 것 · 한계는?' : '실패하면 무엇을 바꿀까?'}
      />
      {conflict && <p className="hint">다른 모둠원이 이 칸을 고쳤어요. 저장할 때 두 글을 합칠지 골라요.</p>}
      {theirs && (
        <div className="note-stale" role="alert">
          <p className="hint bad">
            {theirs.body ? `${theirs.byName ?? '다른 모둠원'} 님이 이 칸을 먼저 고쳤어요. 내 글은 그대로 있어요.` : '다른 모둠원이 이 칸을 비웠어요. 내 글은 그대로 있어요.'}
          </p>
          {theirs.body && <blockquote className="mini">{theirs.body}</blockquote>}
          <div className="acts">
            {theirs.body && (
              <button className="btn" type="button" onClick={() => resolve(`${theirs.body}\n\n${text}`.trim())}>상대 글 아래에 내 글 붙여 저장</button>
            )}
            <button className="btn" type="button" onClick={() => resolve(text)}>내 글로 저장</button>
          </div>
        </div>
      )}
      {err && <p className="hint bad">{err}</p>}
    </div>
  );
}
