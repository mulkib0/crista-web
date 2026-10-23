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
  type NoteSection,
  type StepId,
  type WebJobView,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';

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
 */
export function Notes({ board, stepId }: { board: BoardResponse; stepId: StepId }) {
  return (
    <div className="panel">
      <h3 className="ptitle">연구 노트 <small>칸마다 따로 저장 · 모둠 공유</small></h3>
      <div className="notes">
        {NOTE_SECTIONS.map((section) => (
          <NoteCell key={`${stepId}-${section}`} board={board} stepId={stepId} section={section} />
        ))}
      </div>
    </div>
  );
}

function NoteCell({ board, stepId, section }: { board: BoardResponse; stepId: StepId; section: NoteSection }) {
  const remote = board.notes.find((n) => n.stepId === stepId && n.section === section);
  const [text, setText] = useState(remote?.body ?? '');
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteBody = remote?.body ?? '';

  // 남이 바꾼 글 — 내가 고치는 중이 아니면 바로 반영.
  useEffect(() => {
    if (!dirty) setText(remoteBody);
  }, [remoteBody, dirty]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const save = async (body: string) => {
    setState('saving');
    try {
      await api.put(API.note(stepId, section), { body });
      setDirty(false);
      setState('saved');
      setErr(null);
    } catch (e) {
      setState('error');
      setErr(message(e));
    }
  };

  const onChange = (value: string) => {
    setText(value);
    setDirty(true);
    setState('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(value), 1000);
  };

  const conflict = dirty && remoteBody !== text && remote && remote.byName !== board.account.displayName;
  return (
    <div className="note-c">
      <label className="lab" htmlFor={`n-${stepId}-${section}`}>
        {NOTE_SECTION_LABEL[section]}
        <em className="mini">
          {state === 'saving' ? '저장 중…' : state === 'error' ? '저장 실패' : remote ? `${remote.byName ?? '—'}${remote.avatar ? ` · ${remote.avatar.toUpperCase()}` : ''}` : ''}
        </em>
      </label>
      <textarea
        id={`n-${stepId}-${section}`}
        className="txt"
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => dirty && void save(text)}
        placeholder={section === 'why' ? '이 선택의 가설과 근거는?' : section === 'unknown' ? '아직 모르는 것 · 한계는?' : '실패하면 무엇을 바꿀까?'}
      />
      {conflict && <p className="hint">다른 모둠원이 이 칸을 고쳤어요. 저장하면 내 글로 바뀌어요.</p>}
      {err && <p className="hint bad">{err}</p>}
    </div>
  );
}
