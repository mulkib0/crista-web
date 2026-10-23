/**
 * 화면 ③ 파이프라인 규격(설계 §5 · §6) — 단계 · 모둠 프로그램 · 작업 · 찜 · 연구 노트 · 전광판 화면 한 장(`BoardResponse`).
 * 3판(설계 §6.1): 4묶음 · 하위 9단계 — 3. 개발 · 규제 = 3.1 물질특허 · 3.2 전임상 · 동물실험 · 3.3 제형 · IND. 4.1 · 4.2 는 상세 설계를 미뤄 잠긴 단계다.
 * 기능별 상세 자료는 `BoardResponse` 에 싣지 않고 기능 경로가 따로 준다(screen · selection · patent · preclinical · ind · learn · market 규격).
 *
 * 계산 결과(`ExperimentResult`)는 crista 워커가 준 모양 그대로 싣는다 — 규격은 crista 사본 `@crista/shared-types`.
 */
import type { ExperimentResult, JobPhase, JobStatus, ResultSource, ScreeningCandidate } from '@crista/shared-types';
import type { AccountView, ClassSummary, TeamView } from './api.ts';
import type { ClassClockView } from './clock.ts';
import type { Avatar } from './rules.ts';
import type { TrackId } from './track.ts';

export type StepId = '1.1' | '1.2' | '2.1' | '2.2' | '3.1' | '3.2' | '3.3' | '4.1' | '4.2';
export const STEP_IDS: readonly StepId[] = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '4.2'];

export type StepState = 'locked' | 'ready' | 'running' | 'done' | 'held' | 'blocked' | 'review';
export type Evidence = 'dataset' | 'compute' | 'prediction' | 'simulation';

export interface StepMeta {
  group: 1 | 2 | 3 | 4;
  /** 묶음 안 번호 — 3묶음만 3칸. */
  index: 1 | 2 | 3;
  title: string;
  /** 사이드바 보조 줄 — 출처 · 도구. */
  sub: string;
  evidence: Evidence[];
}

/** 05 시안의 4묶음 · 하위 9단계(설계 §6.1 — 3판에서 3.2 전임상을 넣고 제형 · IND 를 3.3 으로 밀었다). */
export const STEP_META: Record<StepId, StepMeta> = {
  '1.1': { group: 1, index: 1, title: '질환 · 표적 선정', sub: 'Open Targets 근거', evidence: ['dataset'] },
  '1.2': { group: 1, index: 2, title: '화합물 스크리닝', sub: 'ChEMBL · RDKit 깔때기', evidence: ['dataset'] },
  '2.1': { group: 2, index: 1, title: '분자 도킹', sub: 'AutoDock Vina · PLIP', evidence: ['compute'] },
  '2.2': { group: 2, index: 2, title: 'ADMET 예측 · 특허 후보', sub: 'ADMET-AI v2', evidence: ['prediction'] },
  '3.1': { group: 3, index: 1, title: '선언 · 물질특허', sub: 'RDKit 물성 · 서류 심사', evidence: ['compute'] },
  '3.2': { group: 3, index: 2, title: '전임상 · 동물실험', sub: '윤리 심의 · 교육용 모의 판정', evidence: ['simulation'] },
  '3.3': { group: 3, index: 3, title: '제형 · IND 신청', sub: '서류 심사 · 교육용 모의 판정', evidence: ['simulation'] },
  '4.1': { group: 4, index: 1, title: '임상 1 · 2 · 3상', sub: '교육용 모의 판정', evidence: ['simulation'] },
  '4.2': { group: 4, index: 2, title: '최종 허가', sub: '규칙 · 서류 심사', evidence: ['simulation'] },
};

/** 선행 단계(잠김 판정 · `StepView.unlockBy`). */
export const STEP_REQUIRES: Partial<Record<StepId, StepId>> = {
  '1.2': '1.1',
  '2.1': '1.2',
  '2.2': '2.1',
  '3.1': '2.2',
  '3.2': '3.1',
  '3.3': '3.2',
  '4.1': '3.3',
  '4.2': '4.1',
};

/** 상세 설계를 미룬 단계(설계 §6.1 · §12-16) — 늘 잠김이지만 초안 · 연구 노트는 쓸 수 있다. */
export const DEFERRED_STEPS: readonly StepId[] = [];  // 4.1 은 F41 · 4.2 는 F42 가 열었다(2026-10-24)

export const GROUP_TITLE: Record<1 | 2 | 3 | 4, string> = { 1: '발견', 2: '최적화', 3: '개발 · 규제', 4: '임상 · 허가' };

export interface StepView {
  id: StepId;
  group: 1 | 2 | 3 | 4;
  index: 1 | 2 | 3;
  state: StepState;
  /** 잠김 · 막힘의 이유(사람이 읽는 한 줄). */
  reason?: string;
  unlockBy?: StepId;
  progressPct?: number;
  byName?: string;
  /** 4.1 의 지금 상(F41). */
  phase?: 'phase1' | 'phase2' | 'phase3';
  /** 사이드바 보조 줄을 서버가 정할 때(예: 4.1 '2상 · 42%' · '1상 보류 · 재도전 가능'). 없으면 화면 기본 줄. */
  sub?: string;
  /** 재도전 회차(4.1 · 3.3 — 자리만). */
  attempt?: number;
  evidence: Evidence[];
  costCents?: number;
  /** 게임 시계로 걸리는 기간(3.2 동물실험 28 · 3.3 IND 30 …). */
  durationGameDays?: number;
}

/** 작업(`web.jobs`)이 있는 단계 — 1.2 스크리닝 · 2.1 도킹 · 2.2 ADMET(워커) · 3.2 대체 시험 · 동물실험(서버 내부 · 게임 시계). */
export type JobStep = '1.2' | '2.1' | '2.2' | '3.2';

/** 연구 노트 세 칸(설계 §6.4) — ① 왜 골랐나 · ② 무엇을 모르나 · ③ 실패하면 무엇을 바꾸나. */
export type NoteSection = 'why' | 'unknown' | 'fallback';
export const NOTE_SECTIONS: readonly NoteSection[] = ['why', 'unknown', 'fallback'];
export const NOTE_SECTION_LABEL: Record<NoteSection, string> = {
  why: '① 왜 골랐나 (가설 · 근거)',
  unknown: '② 무엇을 모르나 (물성 · 독성 한계)',
  fallback: '③ 실패하면 무엇을 바꾸나 (대안 · 백업)',
};
export const NOTE_MAX = 2000;
export const PICK_NOTE_MAX = 200;
export const LABEL_MAX = 40;

/** 1.1 에서 고를 수 있는 질환 — 질환마다 도킹 표적(결정구조) 하나(crista `DISEASE_TO_TARGET` · `DOCKING_TARGETS`). */
export interface DiseaseOption {
  diseaseId: string;
  label: string;
  targetId: string;
  targetLabel: string;
  gene: string;
  pdbId: string;
  cns: boolean;
  referenceLigand: { name: string; smiles: string };
  /** 결정 리간드 재도킹 ΔG — 2.1 대조군 줄. */
  referenceKcal: number;
}

export interface MemberView {
  userId: string;
  displayName: string;
  avatar: Avatar | null;
}

/** 모둠 프로그램 — 확정 표적 · 주력 리드 · 백업. 표적을 바꾸면 새 표적 버전(`revisionNo`)이 열린다(설계 §7.3). */
export interface ProgramView {
  /** 지금 표적 버전 — 작업 · 찜 · 노트 · 리드가 이 버전에 묶인다. */
  revisionId: string;
  revisionNo: number;
  diseaseId: string | null;
  targetId: string | null;
  targetSetByName: string | null;
  lead: { jobId: string; smiles: string; label: string | null } | null;
  backup: { jobId: string; smiles: string; label: string | null } | null;
  leadSetByName: string | null;
  /** 주력 · 백업을 바꿀 때 `LeadRequest.expectedVersion` 으로 돌려보낸다(오래된 화면이면 409 `stale`). */
  leadVersion: number;
}

/** 1.1 '내 추천 표적' 카드. 한 사람이 질환마다 한 장 — 다시 올리면 메모 · 근거 · 가중치가 바뀐다. */
export interface TargetPickView {
  id: string;
  userId: string;
  byName: string;
  avatar: Avatar | null;
  diseaseId: string;
  targetId: string;
  note: string | null;
  /** 추천 근거 칩 id(`TARGET_PICK_REASONS` — 설계 §5.4.2). 앞 판 카드는 빈 배열. */
  reasons: string[];
  /** ③ 내 점수 가중치(유전 · 약물 · 문헌 · 발현, 0~3). 올릴 때 가중치를 안 보냈으면 null. */
  weights: number[] | null;
  createdAt: string;
}

export interface WebJobView {
  id: string;
  step: JobStep;
  status: JobStatus;
  /** 0~1. */
  progress: number;
  phase?: JobPhase;
  queuePosition?: number;
  source: ResultSource | null;
  test: boolean;
  costCents: number;
  refundedCents: number;
  byUserId: string | null;
  byName: string;
  avatar: Avatar | null;
  targetId: string | null;
  /** 이 작업이 속한 표적 버전 — 지금 버전(`ProgramView.revisionId`)과 같을 때만 근거로 센다. 0003 이전의 다른 표적 작업은 null. */
  revisionId: string | null;
  label: string | null;
  /** 2.1 · 2.2 입력 분자의 정규 SMILES. */
  smiles: string | null;
  parentJobId: string | null;
  inputSummary: string;
  createdAt: string;
  updatedAt: string;
  error?: { code: string; message: string; retryable: boolean };
  /** 2.1 — 결과의 최적 ΔG(kcal/mol). */
  affinityKcal?: number | null;
  result?: ExperimentResult;
}

/** 1.2 히트 후보 찜(`claimedBy`) — 2.1 도킹 대기열. 지금 표적 버전 것만 내려간다. */
export interface ClaimView {
  compoundId: string;
  /** 한 사람의 찜 칸 1 · 2(설계 §6.4 "1인 1~2개"). */
  slot: 1 | 2;
  name: string;
  smiles: string;
  screenJobId: string;
  userId: string;
  byName: string;
  avatar: Avatar | null;
  vinaKcal: number | null;
  screenScore: number | null;
  mw: number | null;
  qed: number | null;
  /** 찜 근거 키(0005 — 그 전 찜은 'legacy'). */
  reason?: string;
}

export interface NoteView {
  stepId: StepId;
  section: NoteSection;
  body: string;
  byName: string | null;
  avatar: Avatar | null;
  updatedAt: string;
  /** 칸 버전 — 고칠 때 `NoteRequest.expectedVersion` 으로 돌려보낸다(같은 칸 동시 수정이면 늦은 쪽 409 `stale`). */
  version: number;
}

/** 다른 모둠 — 공개 정보만(이름 · 티커 · 잉크 · 부지). 후보 · 물성 · 노트는 싣지 않는다(설계 §5.3). */
export interface PublicTeamView {
  id: string;
  plot: number;
  ink: number;
  startupName: string | null;
  ticker: string | null;
  hqTier: 1 | 2 | 3;
  isMine: boolean;
}

export interface BoardResponse {
  account: AccountView;
  avatar: Avatar | null;
  class: ClassSummary;
  team: TeamView;
  members: MemberView[];
  program: ProgramView;
  /** 원장 잔액(정수 센트) — 화면은 크리스타(`balanceCrista`)로 보인다. */
  balanceCents: number;
  /** 같은 잔액의 크리스타(1 크리스타 = 20 센트 — money.ts). */
  balanceCrista: number;
  /** 학급 게임 시계. */
  clock: ClassClockView;
  /** 학급 설정 — 모둠당 특허 상한(받아들여짐 + 심사 중). */
  maxPatentsPerTeam: number;
  /** 이 모둠의 트랙(track.ts 등록표) — 화면이 단계 목록 · 단계 화면을 고를 때 쓴다. 없으면 'drug'. */
  track?: TrackId;
  steps: StepView[];
  jobs: WebJobView[];
  claims: ClaimView[];
  picks: TargetPickView[];
  notes: NoteView[];
  teams: PublicTeamView[];
  diseases: DiseaseOption[];
  /** 유료 작업 1회 비용(센트) — 1.2 · 2.1 · 2.2 는 crista `paidWorkCostCents`, 3.2 는 동물실험 묶음 후보당(preclinical.ts). */
  costs: Record<JobStep, number>;
  /** 이 서버가 부르는 워커가 실제 계산(compute)인가 · 고정 결과(fixture)인가 — 모르면 null. */
  workerMode: 'fixture' | 'compute' | null;
}

// ── 요청 ──

export interface ScreenParams {
  library?: string | null;
  maxMw: number;
  maxTpsa: number;
  ro5Only: boolean;
  excludeAlerts: boolean;
}

export type StartJobRequest =
  | { requestId: string; step: '1.2'; params: ScreenParams }
  | { requestId: string; step: '2.1'; params: { smiles: string; label?: string | null; parentJobId?: string | null } }
  | { requestId: string; step: '2.2'; params: { dockingJobId: string } };

export interface StartJobResponse {
  job: WebJobView;
  /** 같은 requestId 를 다시 보냈으면 false. */
  created: boolean;
}

export interface PickRequest {
  diseaseId: string;
  note?: string | null;
}

export interface TargetRequest {
  diseaseId: string;
}

export interface ClaimRequest {
  /** 화면이 본 진열대의 실행(그 버전 마지막 성공 1.2) — 그 사이 새 실행으로 바뀌었으면 409 stale. 비우면 서버가 마지막 실행을 쓴다. */
  screenJobId?: string;
  compoundId: string;
  /**
   * 찜 근거 키 — **필수**(F12 · 설계 §5.5 ④ · §7.4 ⑧). `CLAIM_REASONS`(screen.ts) 중 하나여야 하고,
   * 서버가 그 분자 값으로 다시 판정해 막음이면 400 `reason_blocked`.
   */
  reason: string;
}

export interface LeadRequest {
  /** 2.2 ADMET 작업(성공) — 그 분자가 주력 리드가 된다. */
  leadJobId: string;
  backupJobId?: string | null;
  /** 화면이 읽은 `ProgramView.leadVersion`. 그 사이 누가 바꿨으면 409 `stale`. */
  expectedVersion: number;
}

export interface NoteRequest {
  body: string;
  /** 화면이 읽은 `NoteView.version`(칸이 비어 있었으면 0). 그 사이 누가 바꿨으면 409 `stale` + 지금 칸(`ApiErrorBody.error.note`). */
  expectedVersion: number;
}

export interface NoteResponse {
  ok: true;
  /** 저장 뒤 칸 버전 — 다음 저장의 expectedVersion. */
  version: number;
}

/** 무료 물성 미리보기 — 워커 RDKit 값 + crista `propertySignals`. */
export interface PropertiesRequest {
  smiles: string;
}

export interface PropertiesResponse {
  properties: {
    canonicalSmiles: string;
    mw: number;
    clogp: number;
    tpsa: number;
    hbd: number;
    hba: number;
    rotb: number;
    qed: number;
    basicAmines: number;
    alerts: string[];
  };
  signals: {
    ro5Violations: number;
    oralAbsorption: 'good' | 'moderate' | 'poor';
    bbb: 'high' | 'moderate' | 'low';
    herg: 'low' | 'moderate' | 'high';
    hepatotoxicity: 'low' | 'moderate' | 'high';
    transdermal: 'suitable' | 'unsuitable';
  };
}

/** 1.1 — Open Targets 근거(워커 `/datasets/targets` 그대로). */
export interface DiseaseTargetsResponse {
  diseaseId: string;
  disease: string;
  totalAssociatedCount: number;
  targets: Array<{
    rank: number;
    symbol: string;
    ensemblId: string;
    name: string;
    overallScore: number;
    geneticScore: number;
    drugScore: number;
    literatureScore: number;
    expressionScore: number;
    smPocket: boolean;
    smClinical: boolean;
    pdbId: string | null;
    dockingTargetId: string | null;
  }>;
}

/** 1.2 — 무료 깔때기 미리보기(통과 수만). */
export interface FunnelPreviewResponse {
  total: number;
  funnel: { library: number; mwTpsa: number; ro5: number; alerts: number; selected: number };
  libraries: string[];
  top: Array<Pick<ScreeningCandidate, 'compoundId' | 'name' | 'mw' | 'qed'> & { vinaKcal: number | null }>;
}

export const SCREEN_LIMITS = { mwMin: 200, mwMax: 700, tpsaMin: 20, tpsaMax: 160, topN: 20 } as const;
