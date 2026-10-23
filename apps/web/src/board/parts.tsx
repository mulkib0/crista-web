/**
 * ③ 작업 화면의 작은 부품 — 직책 배지 · 작업 상태 · 출처 표시 · 연구 노트 3칸.
 * 기능을 가리지 않는 공용 부품(근거 칩 · 판 · 탭 · 확인 창 · 서류 칸 · 그래프)은 `ui/`.
 */
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
import { api } from '../api.ts';
import { AVATAR_LABEL, DocSectionEditor } from './ui/index.ts';

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
 * 연구 노트 3칸(설계 §6.4) — 칸마다 따로 저장해서 세 명이 동시에 써도 덮지 않는다. 칸 편집 · 낙관적 잠금 · 409 합치기는
 * 공용 서류 칸 편집기(`ui/DocSectionEditor`)가 한다 — 특허 출원서 · 계획서 · IND 신청서 칸도 같은 부품을 쓴다.
 */
export function Notes({ board, stepId }: { board: BoardResponse; stepId: StepId }) {
  return (
    <div className="panel">
      <h3 className="ptitle">연구 노트 <small>칸마다 따로 저장 · 모둠 공유</small></h3>
      <div className="notes">
        {NOTE_SECTIONS.map((section) => {
          const remote = board.notes.find((n) => n.stepId === stepId && n.section === section);
          return (
            <DocSectionEditor
              key={`${board.program.revisionId}-${stepId}-${section}`}
              id={`n-${stepId}-${section}`}
              label={NOTE_SECTION_LABEL[section]}
              value={remote ? { body: remote.body, version: remote.version, byName: remote.byName, avatar: remote.avatar } : null}
              save={(body, expectedVersion) => api.put<NoteResponse>(API.note(stepId, section), { body, expectedVersion })}
              myName={board.account.displayName}
              maxLength={NOTE_MAX}
              placeholder={NOTE_PLACEHOLDER[section]}
            />
          );
        })}
      </div>
    </div>
  );
}

const NOTE_PLACEHOLDER: Record<NoteSection, string> = {
  why: '어떤 수치와 근거를 보고 이렇게 골랐나요?',
  unknown: '아직 확인하지 못한 위험이나 가장 걱정되는 한계는 무엇인가요?',
  fallback: '어떤 결과가 나오면 백업 후보로 바꾸거나 조건을 다시 정할 건가요?',
};
