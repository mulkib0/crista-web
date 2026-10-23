/**
 * 항체 설계 랩 규격 — 두 번째 파이프라인(설계 `docs/2026-10-24-antibody-lab-design.md` §5.4 · §5.5 · §5.6).
 *
 * 경계
 * - 저분자 랩의 `StepId`(9값) · `JobStep` · `STEP_META` · `NoteSection` 을 **건드리지 않아요**. 항체는 자기 축(`AntibodyStepId` A1~A6)을 쓰고,
 *   연구 노트 칸만 기존 `NoteSection`(`why` · `unknown` · `fallback`) 세 값을 그대로 다시 써요.
 * - 이 파일에는 **해시 함수를 두지 않아요**(§5.4). 화면(Vite)도 이 꾸러미를 그대로 `import` 하므로 `node:crypto` 를 쓰면 화면 빌드가 깨져요.
 *   서열 해시(`seqHash`)는 서버 전용 `apps/server/src/features/antibody/hash.ts` 에 두고, 화면은 서버가 준 값을 그대로 써요.
 * - 금액은 `money.ts`(`CENTS_PER_CRISTA` · `formatCrista`)를 써요. 새 화폐 단위를 만들지 않아요.
 *
 * 정직성(§3.5)
 * - 근사값에 원전 지표 이름을 쓰지 않아요. 지표 이름은 모두 우리말 뜻으로 적었어요(§6.6 대응표):
 *   붙는 힘 점수(`bindScore`) · 기름진 겉면 정도(`greasySurface`) · 두 사슬 전하 궁합(`chainChargeProduct`) ·
 *   레퍼토리 다양성(`DiversityView`) · AI 확신도(`confidence*`) · 사람 유전자 동일성(`humanness`).
 * - 모든 결과에 `Provenance`(출처 · 근사 여부)를 실어서 화면이 배지를 빠뜨릴 수 없게 해요.
 */
import type { TeamView } from './api.ts';
import { cristaToCents } from './money.ts';
import type { NoteSection, StepState } from './pipeline.ts';
import type { Avatar } from './rules.ts';

// ── 트랙 · 단계 ──────────────────────────────────────────────────────────────

/** 랩 트랙 — 기존 `StepId` 를 늘리지 않고 축을 하나 더 둬요(§5.4). */
export type LabTrack = 'small' | 'antibody';
export const LAB_TRACKS: readonly LabTrack[] = ['small', 'antibody'];

export type AntibodyStepId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
export const ANTIBODY_STEP_IDS: readonly AntibodyStepId[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

/** 작업 러너를 타는 단계(접수 · 큐 · 과금 대상). A4 는 큐를 타지만 무료예요(§2.1 · §10 S15). */
export type AntibodyJobStep = 'A2' | 'A4' | 'A5';
export const ANTIBODY_JOB_STEPS: readonly AntibodyJobStep[] = ['A2', 'A4', 'A5'];

/** 사슬 — 중쇄 · 경쇄. */
export type AbChain = 'H' | 'L';

// ── 결과의 성격(배지) ────────────────────────────────────────────────────────

/**
 * 결과의 성격 — 화면이 배지를 빠뜨릴 수 없게 모든 응답에 실어요(§3.5).
 * `lookup` 자료 조회 · `server-calc` 센 값 · `ai-predict` 실제 AI 예측 · `edu-approx` 교육용 근사 · `precomputed` 사전 계산.
 */
export type AntibodySource = 'lookup' | 'server-calc' | 'ai-predict' | 'edu-approx' | 'precomputed';
export const ANTIBODY_SOURCES: readonly AntibodySource[] = ['lookup', 'server-calc', 'ai-predict', 'edu-approx', 'precomputed'];

export interface Provenance {
  source: AntibodySource;
  /** 배지에 쓰는 한국어 한 줄. */
  label: string;
  /** 배지를 눌렀을 때 펼치는 설명 — 엔드포인트 · 산식 · 출처. */
  detail: string;
  endpoint?: string;
  calledAt?: string;
  elapsedMs?: number;
  collectedOn?: string;
  /** 근사값이면 true — 화면은 이 값이 true 인 카드에 '교육용 근사' 문구를 반드시 붙여요. */
  approx: boolean;
}

/** 외부 API 를 쓸 수 있는지 — 화면에 늘 보여요(저분자의 `workerMode` 와 같은 뜻 · §3.3). */
export type AntibodyDataMode = 'live' | 'cached' | 'fixture';

// ── 단계 메타 ────────────────────────────────────────────────────────────────

export interface AntibodyStepMeta {
  id: AntibodyStepId;
  group: 1 | 2 | 3 | 4;
  index: 1 | 2;
  title: string;
  /** 머리 섬 질문. */
  question: string;
  /** 완료 조건 한 줄(§2.2). */
  doneWhen: string;
  /** 출처 노트북 자리(31셀 · 보평고 김태영 · v2026.09.15). */
  notebookPart: string;
  evidence: AntibodySource[];
  costCents: number;
}

export const ANTIBODY_GROUP_TITLE: Record<1 | 2 | 3 | 4, string> = {
  1: '표적 찾기',
  2: '설계',
  3: '검증',
  4: '상장',
};

/** 유료 단계 금액 — 크리스타(§9-13). A4 는 판별력이 낮은 단계라 무료예요(§10 S15). */
export const ANTIBODY_STEP_COST_CRISTA: Record<AntibodyStepId, number> = {
  A1: 0,
  A2: 0,
  A3: 0,
  A4: 0,
  A5: 500_000,
  A6: 1_000_000,
};

export const ANTIBODY_STEP_META: Record<AntibodyStepId, AntibodyStepMeta> = {
  A1: {
    id: 'A1',
    group: 1,
    index: 1,
    title: '표적 항원 · 원본 항체',
    question: '우리는 어떤 항원을 노리고, 어떤 항체를 본뜰까요?',
    doneWhen: '모둠 과반이 추천 카드를 올리고 제안이 과반 찬성으로 통과하면 끝나요',
    notebookPart: 'Part0 · 셀 3 · 5 · 7',
    evidence: ['lookup'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A1),
  },
  A2: {
    id: 'A2',
    group: 1,
    index: 2,
    // '보존도' 대신 '레퍼토리 다양성'으로 불러요 — 항체 V 도메인의 MSA 는 진화적 보존이 아니라
    // 같은 계열 항체들 사이의 다양성을 보여 주기 때문이에요(§2.3 · §3.2 · §10 S18).
    title: '구조 읽기 · 레퍼토리 다양성',
    question: '이 항체에서 건드려도 되는 자리는 어디일까요?',
    doneWhen: '과반이 고정할 자리 후보를 올리고 고정 위치를 합의하면 끝나요',
    notebookPart: 'Part1 · 셀 12 · 13 · 14',
    evidence: ['lookup', 'precomputed', 'edu-approx'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A2),
  },
  A3: {
    id: 'A3',
    group: 2,
    index: 1,
    title: '변이 설계',
    question: 'CDR 의 어느 글자를 바꾸면 더 잘 붙을까요?',
    doneWhen: '모둠에 변이체가 1개 이상 올라오면 끝나요',
    notebookPart: 'Part2 · 셀 10 · 15 · 16 · 17 · 18',
    evidence: ['server-calc', 'edu-approx'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A3),
  },
  A4: {
    id: 'A4',
    group: 3,
    index: 1,
    title: '접힘 예측',
    question: '설계한 가변영역이 제대로 접힐까요?',
    doneWhen: '접힘 예측이 1건 이상 성공하면 끝나요',
    notebookPart: 'Part3 · 셀 21 · 23 · 24',
    evidence: ['ai-predict'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A4),
  },
  A5: {
    id: 'A5',
    group: 3,
    index: 2,
    title: '복합체 평가',
    // 노트북 셀 29 의 원문을 그대로 인용해요(§2.4) — 이 랩의 학습 목표를 가장 잘 요약한 한 줄이에요.
    question: 'CDR 영역이 타겟과 접촉하는지 확인하세요',
    doneWhen: '원본 비교군을 포함한 복합체 평가가 1건 이상이면 끝나요',
    notebookPart: 'Part4 · 셀 26 · 27 · 28 · 29',
    evidence: ['edu-approx', 'ai-predict'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A5),
  },
  A6: {
    id: 'A6',
    group: 4,
    index: 1,
    title: '보고서 · 상장 평가',
    question: '왜 이 설계를 대표로 내보낼까요?',
    doneWhen: '대표 후보를 1건 제출하면 끝나요',
    notebookPart: '보고서 · 셀 30',
    evidence: ['server-calc', 'edu-approx'],
    costCents: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A6),
  },
};

/** 잠금 해제 — 앞 단계가 끝나야 열려요(§2.2). */
export const ANTIBODY_STEP_REQUIRES: Partial<Record<AntibodyStepId, AntibodyStepId>> = {
  A2: 'A1',
  A3: 'A2',
  A4: 'A3',
  A5: 'A4',
  A6: 'A5',
};

export interface AntibodyStepView {
  id: AntibodyStepId;
  group: 1 | 2 | 3 | 4;
  index: 1 | 2;
  /** 저분자 랩과 같은 상태 기계를 써요(`StepState`). */
  state: StepState;
  reason?: string;
  unlockBy?: AntibodyStepId;
  progressPct?: number;
  byName?: string;
  evidence: AntibodySource[];
  costCents?: number;
}

// ── 구조 · 번호 매김 ─────────────────────────────────────────────────────────

/** 복합체가 여러 벌인 PDB 가 있으므로 '어느 조'인지 함께 적어요(§2.3). 예 `{set:'1', H:'D', L:'C', AG:'A'}`. */
export interface ChainRoles {
  set: string;
  H: string;
  L?: string;
  AG?: string;
}

/** 번호축을 값으로 들고 다녀요 — Kabat 숫자와 IMGT 숫자를 섞지 않기 위해서예요(§3.2). */
export type CdrScheme = 'imgt' | 'kabat' | 'chothia' | 'abm' | 'contact';
export const CDR_SCHEMES: readonly CdrScheme[] = ['imgt', 'kabat', 'chothia', 'abm', 'contact'];

export interface CdrSpan {
  chain: AbChain;
  cdr: 1 | 2 | 3;
  scheme: CdrScheme;
  /** **1 부터 세는** 서열 자리 — 시작(끝 포함)이에요. 화면 격자의 0부터 센 칸 번호와 **축이 달라요**(§12). */
  start: number;
  /** **1 부터 세는** 서열 자리 — 끝(이 자리까지 들어가요). */
  end: number;
  seq: string;
}

/** 번호를 어디서 받았는지 — 규칙으로 강등되면 화면이 '경계가 틀릴 수 있어요'를 띄워요(§3.2). */
export type NumberingSource = 'sabdab' | 'anarci' | 'regex-fallback';

// ── 연구 노트 ────────────────────────────────────────────────────────────────

/**
 * 항체 랩 연구 노트 — 기존 `NoteView` 는 `stepId` 가 저분자 `StepId` 라 그대로 쓸 수 없어요(§10 F5).
 * 칸(`section`)은 기존 `NoteSection` 세 값을 그대로 다시 써요.
 */
export interface AntibodyNoteView {
  stepId: AntibodyStepId;
  section: NoteSection;
  body: string;
  byName: string | null;
  avatar: Avatar | null;
  updatedAt: string;
  version: number;
}

// ── 합의(A1 · A2) ────────────────────────────────────────────────────────────

export type AntibodyCardStep = 'A1' | 'A2';
export type AntibodyProposalTopic = 'program' | 'fixed_positions';
export type AntibodyProposalStatus = 'open' | 'passed' | 'rejected' | 'withdrawn';
export type AntibodyVoteChoice = 'yes' | 'no';

export interface AntibodyCardView {
  id: string;
  step: AntibodyCardStep;
  /** 1인 1몫 — 분담한 자리 이름(표적 1종 · 담당 CDR 등). */
  slot: string;
  payload: unknown;
  rationale: string;
  byName?: string;
  createdAt: string;
}

export interface AntibodyProposalView {
  id: string;
  topic: AntibodyProposalTopic;
  value: unknown;
  rationale: string;
  byName?: string;
  status: AntibodyProposalStatus;
  votes: { yes: number; no: number; quorum: number; myChoice?: AntibodyVoteChoice };
  version: number;
}

// ── 프로그램 · 설계 ──────────────────────────────────────────────────────────

export interface AntibodyProgramView {
  revisionId: string;
  revisionNo: number;
  version: number;
  antigenTarget?: string;
  parentAntibodyName?: string;
  parentAntibodyChemblId?: string;
  referencePdb?: string;
  chainRoles?: ChainRoles;
  parentVh?: string;
  parentVl?: string;
}

export interface AntibodyMutation {
  chain: AbChain;
  pos: number;
  wt: string;
  mut: string;
  cdr?: 1 | 2 | 3;
}

export type DesignOrigin = 'student' | 'suggested' | 'parent' | 'nim';

export interface DesignView {
  id: string;
  label: string;
  vh: string;
  vl?: string;
  /** 서버가 만든 정규화 서열 해시 — 화면은 만들지 않고 받은 값을 그대로 써요(§5.4). */
  seqHash: string;
  mutations: AntibodyMutation[];
  origin: DesignOrigin;
  byName?: string;
  roleBadge?: string;
  slot?: 1 | 2;
  preview?: PreviewMetrics;
  provenance: Provenance;
}

/** 제안 받기의 과감함 — 높을수록 다양성↑ · 원본 회복률↓(노트북 셀 15 설명을 바로잡았어요 · §2.3). */
export type AntibodyBoldness = 'conservative' | 'normal' | 'bold';
export const ANTIBODY_BOLDNESS: readonly AntibodyBoldness[] = ['conservative', 'normal', 'bold'];

/**
 * 미리보기 지표 — 지표 이름은 모두 우리말 뜻으로 적어요(§3.5 · §6.6).
 * `greasySurface` 는 CDR 주변부 창 근사라 원전 값과 달라요. `chainChargeProduct` 는 pH 5.5 순전하의 곱이에요.
 */
export interface PreviewMetrics {
  liabilities: Array<{ motif: string; severity: 'high' | 'medium' | 'low'; chain: AbChain; pos: number; fixable: 'easy' | 'hard' }>;
  chargeVh: number;
  chargeVl?: number;
  /** 두 사슬 전하 궁합(pH 5.5) — 센 값이지만 구조 기반 원전 지표와 축이 달라요. */
  chainChargeProduct?: number;
  pi: number;
  /** 기름진 겉면 정도 — CDR 주변부 창 근사(모형으로 추정한 값). */
  greasySurface: number;
  /** 승인 항체 자체 분포 백분위(0~1) — 점수에 쓰는 값이에요. */
  greasyPercentile: number;
  /** CDR 총길이 — IMGT 축. */
  cdrTotalLength: number;
  humanness: { percent: number; nearestGermline: string; deltaVsParent: number };
  riskFlags: Array<{
    metric: 'cdrLength' | 'greasySurface' | 'positivePatch' | 'negativePatch' | 'chainChargeProduct';
    level: 'ok' | 'watch' | 'alert';
    value: number;
    note: string;
  }>;
  provenance: Provenance[];
}

// ── A1 자료 조회 — 표적 · 원본 항체 · 구조 후보 ──────────────────────────────

/** 표적에 묶인 치료항체 한 줄 — ChEMBL 이 준 값만 담아요(지어내지 않아요 · §3.1). */
export interface AntibodyCatalogAntibody {
  chemblId: string;
  /** ChEMBL 이 적어 둔 이름이에요(원문 그대로 · 대문자). */
  name: string;
  /** 최초 승인 연도 — 없으면 `null`. */
  firstApproval: number | null;
  /** 최대 임상 단계 — 숫자로 바꾼 값(없으면 `null`). */
  maxPhase: number | null;
  /** 받은 값 원문 — 화면 상세에서 '받은 값'을 보여 줄 때 써요. */
  maxPhaseRaw: string | null;
  withdrawn: boolean;
  /** 사슬 서열을 받을 수 있나 — A3 의 바탕 서열이 되므로 A1 에서 확인해요. */
  hasSequence: boolean;
}

export interface AntibodyCatalogTarget {
  /** 화면에 보이는 표적 이름. */
  target: string;
  targetChemblId: string;
  /** 설계서 §2.3 이 확인한 짝 — 학생이 다른 항체를 골라도 돼요. */
  suggestedAntibody: { name: string; chemblId: string };
  /** 참조 구조 — 모두 **항원 복합체**예요. `sets[0]` 이 계면을 파싱한 체인 조예요. */
  suggestedPdb: { pdb: string; resolutionAngstrom: number | null; sets: ChainRoles[] };
  antibodies: AntibodyCatalogAntibody[];
  dataMode: AntibodyDataMode;
  provenance: Provenance | null;
}

/** `GET /api/antibody/catalog` 의 응답 — A1 화면이 표를 이것으로 채워요(고정 자료로 대신 채우지 않아요 · §12). */
export interface AntibodyCatalogResponse {
  targets: AntibodyCatalogTarget[];
  dataMode: AntibodyDataMode;
}

// ── A2 레퍼토리 다양성 ───────────────────────────────────────────────────────

/** '보존도'가 아니라 레퍼토리 다양성이에요 — 같은 계열 항체들 사이에서 이 자리가 얼마나 갈리는지예요(§3.2 · §10 S18). */
export interface DiversityView {
  chain: AbChain;
  /** 1~9 — 그 서열 집합 안의 백분위를 9분위로 나눈 등급. **배열 첨자 0 이 1번 자리**예요. */
  grades: number[];
  /** 0~1 원값 — 문턱 비교에 써요(절대 엔트로피가 아니에요). */
  percentiles: number[];
  /** 실측 번호 매김(간격 포함) — `[번호, 삽입문자]`. */
  imgtNumbers: Array<[number, string]>;
  numberingSource: NumberingSource;
  cdrs: CdrSpan[];
  /** 고정 추천 자리 — **0 부터 센** 서열 자리예요(서열 격자의 칸 번호와 같은 축 · `cdrs` 와 축이 달라요 · §12). */
  suggestedFixed: number[];
  /** MSA 깊이 — 모은 서열 수(화면에 그대로 적어요). */
  msaDepth: number;
  provenance: Provenance;
}

// ── A4 접힘 ──────────────────────────────────────────────────────────────────

/** 사슬 모양 — `fv` 는 사슬을 따로 접고, `scfv` 는 링커로 이어 한 번에 접어요. */
export type FoldShape = 'fv' | 'scfv';

export interface FoldView {
  designId: string;
  pdb: string;
  format: 'pdb' | 'cif';
  /** AI 확신도 0~100 — 모델의 자기 확신 점수예요(정확도가 아니에요). 원본은 0~1 이라 서버가 ×100 해서 내려요. */
  confidenceMean: number;
  confidenceCdrH3: number;
  /** 구간별 확신도 — 뷰어의 표 대안 재료예요(§6.4). */
  bySegment: Array<{ label: string; start: number; end: number; mean: number }>;
  chainRoles: ChainRoles;
  provenance: Provenance;
}

// ── A5 복합체 ────────────────────────────────────────────────────────────────

/** 적합도 등급 4단 — 색 + 이름 + 기호를 늘 함께 보여요(§6.5). */
export type AntibodyGrade = 'great' | 'good' | 'fair' | 'poor';
/** 등급 하한(§4.2) — `80+ 아주 좋음` · `60~80 좋음` · `40~60 보통` · `40 미만 부족`. */
export const ANTIBODY_GRADE_MIN: Record<AntibodyGrade, number> = { great: 80, good: 60, fair: 40, poor: 0 };
export const ANTIBODY_GRADE_WORD: Record<AntibodyGrade, string> = { great: '아주 좋음', good: '좋음', fair: '보통', poor: '부족' };

/** 설계 적합도 → 등급. 문턱은 §4.2 하나뿐이라 화면 · 서버가 같은 함수를 써요. */
export function antibodyGrade(fit: number): AntibodyGrade {
  if (fit >= ANTIBODY_GRADE_MIN.great) return 'great';
  if (fit >= ANTIBODY_GRADE_MIN.good) return 'good';
  if (fit >= ANTIBODY_GRADE_MIN.fair) return 'fair';
  return 'poor';
}

export interface ComplexView {
  designId: string;
  /** 설계 적합도 0~100 — 붙는 힘 + 위험한 자리를 지켰는지를 합친 묶음 값이에요(§4.2). */
  fit: number;
  grade: AntibodyGrade;
  /** 붙는 힘 점수 0~100 — 무단위예요. 자유에너지도, 실험 측정도 아니에요(§3.2 · §6.6). */
  bindScore: number;
  /** 접촉 통계 합(표시용 · 단위를 붙이지 않아요). */
  bindRaw: number;
  /** 0~1 — '전하쌍으로 번 점수' 분해(**상한 적용 전** 비율이에요 · §4.1a). */
  chargePairShare: number;
  /** 0~1 — 전하쌍 상한이 접촉 통계 합을 깎은 비율이에요(`1 − |raw| / |상한 전 raw|` · §12). */
  capCutShare: number;
  /** 다양성 상위 자리 중 그대로 둔 계면 잔기 비율 0~100(§4.2). */
  interfaceKept: number;
  deltaVsParent: number;
  /** 선택 경로(Boltz)로 실제 복합체 예측을 받았을 때만 채워요 — 원전 이름을 쓰는 유일한 자리예요(§3.3). */
  iptm?: number;
  contacts: Array<{ cdr: string; abResi: number; abAa: string; agResi: number; agAa: string; dist: number; diversity: number }>;
  contactsByCdr: Array<{ cdr: string; count: number }>;
  pdb?: string;
  /**
   * 지표마다 배지를 하나씩 싣어요(§3.5) — 붙는 힘 · 적합도는 늘 **교육용 근사**이고,
   * 복합체 신뢰도를 실제로 받은 경우에만 그 배지가 **한 줄 더** 붙어요.
   * 화면은 이걸 한 줄만 그리지 않고 **모두** 그려요 — 하나만 그리면 근사 표시가 사라져요.
   */
  provenance: Provenance[];
}

// ── 점수 ─────────────────────────────────────────────────────────────────────

export interface AntibodyScoreWeights {
  binding: number;
  stability: number;
  developability: number;
  humanization: number;
  novelty: number;
}

/** 기본 가중치(§4.1 · §9-4) — 교사가 학급 설정에서 바꿀 수 있고 합은 늘 1.00 이에요. */
export const ANTIBODY_SCORE_WEIGHTS: AntibodyScoreWeights = {
  binding: 0.3,
  stability: 0.2,
  developability: 0.3,
  humanization: 0.1,
  novelty: 0.1,
};

export const ANTIBODY_WEIGHT_KEYS: readonly (keyof AntibodyScoreWeights)[] = [
  'binding',
  'stability',
  'developability',
  'humanization',
  'novelty',
];

/** 가중치 합 — 교사 설정 PUT 검사에 써요(§5.5). 부동소수 오차는 `WEIGHT_SUM_EPSILON` 으로 봐 줘요. */
export const WEIGHT_SUM_EPSILON = 1e-6;
export function scoreWeightsSum(w: AntibodyScoreWeights): number {
  return ANTIBODY_WEIGHT_KEYS.reduce((sum, key) => sum + w[key], 0);
}
export function scoreWeightsOk(w: AntibodyScoreWeights): boolean {
  for (const key of ANTIBODY_WEIGHT_KEYS) {
    const v = w[key];
    if (!Number.isFinite(v) || v < 0 || v > 1) return false;
  }
  return Math.abs(scoreWeightsSum(w) - 1) <= WEIGHT_SUM_EPSILON;
}

/** 점수 판 — 산식을 고치면 올려요(옛 결과와 섞이지 않게). */
export const ANTIBODY_FORMULA_VERSION = 'antibody-score-v2';

export interface ScoreView {
  /** 0~100 정수. */
  score: number;
  parts: AntibodyScoreWeights;
  weights: AntibodyScoreWeights;
  penalties: Array<{ label: string; points: number; fixable: 'easy' | 'hard' }>;
  /** 점수에 넣지 않는 경고 — 다양성 높은 자리를 건드렸다 · 양전하 패치 등(§4.1). */
  risks: string[];
  /** 원본 비교군 점수 `S_원본` 과 문턱 `T = S_원본 + 5`(§4.1f). */
  parentScore: number;
  threshold: number;
  effectiveMutations: number;
  formulaVersion: string;
  /** 한계 문구 — 화면에 반드시 함께 보여요(§3.5). */
  caveat: string;
  provenance: Provenance[];
}

/** 문턱 폭 — `T = S_원본 + 5`. 교사가 학급 설정에서 ±5 조정해요(§4.1f · §9-5). */
export const SCORE_THRESHOLD_MARGIN = 5;

// ── 기업가치 ─────────────────────────────────────────────────────────────────

/**
 * 기업가치 — 0007 의 공용 `web.valuations` · `web.board_events` 를 그대로 쓰고 항체 전용 표를 만들지 않아요(§11.3).
 * 공식 · 상장가 · 주식수도 저분자 랩과 같아요(`market.ts` 의 `LISTING_PRICE_USD` · `SHARES_OUTSTANDING`).
 */
export interface AntibodyValuationView {
  fundamentalUsd: number;
  priceUsd: number;
  marketCapCents: number;
  /** 직전 대비 변동률(%). */
  changePct: number;
  rankMarketCap: number;
  of: number;
  lastEvent?: { headline: string; changePct?: number; at: string };
}

/**
 * 항체 소식 종류 — 공용 `BoardEventKind` 에 `` `antibody_${string}` `` 이 열리기 전까지 여기에 둬요(`market.ts` 는 고치지 않아요).
 * 열리면 `BoardEventKind` 가 이 네 값을 그대로 받아요(2026-10-24 합의 · §11.3).
 */
/** 항체 랩이 내는 소식 종류 — 넓은 `AntibodyNewsKind`(`market.ts` · `antibody_${string}`)의 좁은 목록이에요.
 *  이름이 겹치지 않게 `AntibodyNewsKind` 로 두고, 넓은 쪽에 대입할 수 있게 맞춰 뒀어요. */
export type AntibodyNewsKind = 'antibody_program' | 'antibody_fold' | 'antibody_complex' | 'antibody_record';
export const ANTIBODY_EVENT_KINDS: readonly AntibodyNewsKind[] = [
  'antibody_program',
  'antibody_fold',
  'antibody_complex',
  'antibody_record',
];

// ── 작업 ─────────────────────────────────────────────────────────────────────

export type AntibodyJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'timeout';

export interface AntibodyJobView {
  id: string;
  step: AntibodyJobStep;
  status: AntibodyJobStatus;
  progress: number;
  phase?: string;
  designId?: string;
  byName?: string;
  costCents: number;
  queuePosition?: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
}

// ── 화면 한 번에 그릴 응답 ───────────────────────────────────────────────────

export interface AntibodyNewsLine {
  seq: number;
  ticker: string;
  headline: string;
  changePct?: number;
  tone: string;
  track: LabTrack;
}

export interface AntibodyBoardResponse {
  track: 'antibody';
  team: TeamView;
  program: AntibodyProgramView;
  steps: AntibodyStepView[];
  current: AntibodyStepId;
  designs: DesignView[];
  folds: FoldView[];
  complexes: ComplexView[];
  /**
   * A2 가 성공한 사슬의 레퍼토리 다양성이에요 — **없으면 아직 돌리지 않은 것**이고,
   * 화면은 고정 자료로 대신 채우지 않고 빈 상태를 보여 줘요(§12).
   */
  diversity: DiversityView[];
  /** A1 · A2 합의 — 추천 카드와 제안 · 투표. */
  cards: AntibodyCardView[];
  proposals: AntibodyProposalView[];
  /** 잠긴 단계에서도 미리 쓴 노트를 읽어 와요(§2.2). */
  notes: AntibodyNoteView[];
  best?: ScoreView;
  valuation: AntibodyValuationView;
  /** 이웃 모둠의 점수 숫자는 싣지 않아요 — 상대 순위만이에요(§4.5). */
  classRank?: { rank: number; of: number };
  balanceCents: number;
  costs: Record<AntibodyJobStep, number>;
  myQuota: {
    designs: { used: number; max: number };
    fold: { used: number; max: number };
    evaluate: { used: number; max: number };
  };
  teamQuota: { running: number; max: number };
  /** 진행 중 · 최근 작업 줄(선택) — 없으면 화면은 `steps[].progressPct` 만 써요. */
  jobs?: AntibodyJobView[];
  dataMode: AntibodyDataMode;
  /** 선택 키가 설정됐는지 — 값은 보내지 않아요. */
  optional: { proteinmpnn: boolean; boltz: boolean };
  /** 교사 학급 설정(읽기). */
  settings: { weights: AntibodyScoreWeights; openTracks: LabTrack[] };
  news: AntibodyNewsLine[];
}

// ── 요청 ─────────────────────────────────────────────────────────────────────

export interface AntibodyProgramRequest {
  antigenTarget: string;
  parentAntibodyChemblId: string;
  referencePdb: string;
  chainRoles: ChainRoles;
  /** 화면이 읽은 `AntibodyProgramView.version` — 그 사이 누가 바꿨으면 409 `stale`. */
  version: number;
}

export interface AntibodyJobRequest {
  requestId: string;
  step: AntibodyJobStep;
  designId?: string;
  params?: Record<string, unknown>;
}

export interface AntibodyJobResponse {
  job: AntibodyJobView;
  /** 같은 `requestId` 재전송이면 false(과금 없음). */
  created: boolean;
}

export interface AntibodyDesignRequest {
  label: string;
  vh: string;
  vl?: string;
  mutations: AntibodyMutation[];
}

export interface AntibodySuggestRequest {
  count: number;
  boldness: AntibodyBoldness;
}

export interface AntibodyPreviewRequest {
  vh: string;
  vl?: string;
}

export interface AntibodyNoteRequest {
  body: string;
  /** 화면이 읽은 `AntibodyNoteView.version`(칸이 비어 있었으면 0). 낡았으면 409 `stale` + `error.abNote`. */
  version: number;
}

export interface AntibodyCardRequest {
  step: AntibodyCardStep;
  slot: string;
  payload: unknown;
  rationale: string;
}

export interface AntibodyProposalRequest {
  topic: AntibodyProposalTopic;
  value: unknown;
  rationale: string;
}

export interface AntibodyVoteRequest {
  choice: AntibodyVoteChoice;
  version: number;
}

export interface AntibodySubmitRequest {
  designId: string;
  requestId: string;
}

export interface AntibodySubmitResponse {
  score: ScoreView;
  valuation: AntibodyValuationView;
  event?: { headline: string; changePct?: number; kind: AntibodyNewsKind };
}

export interface AntibodyTeacherSettings {
  weights: AntibodyScoreWeights;
  thresholds: { scoreMargin: number; confidenceMin: number };
  openTracks: LabTrack[];
  version: number;
}

// ── 한계 · 상한 ──────────────────────────────────────────────────────────────

/** ESMFold 상한 — 401 잔기부터 `413` 이 와요(§3.1). 넘으면 409/400 `sequence_too_long`. */
export const ESMFOLD_MAX_RESIDUES = 400;
/** scFv 링커 — `GGGGS` ×3(§2.1 A4). */
export const SCFV_LINKER = 'GGGGS'.repeat(3);
/** A5 후보 문턱 — 평균 확신도(0~100)가 이 값 미만이면 복합체 평가에서 빼요(§4.2). */
export const CONFIDENCE_MIN_FOR_COMPLEX = 70;
/** 1인 설계 칸 수 — DB 가 `slot` 유일 제약으로 막아요(409 `slot_taken` · §4.4③). */
export const DESIGN_SLOTS_PER_PERSON = 2;
/** 다양성 상위 자리 자물쇠 기본 문턱(백분위) — 풀 수 있고 풀면 risk 라벨이 붙어요(§9-10). */
export const DIVERSITY_LOCK_PERCENTILE = 0.25;
/** 무료 미리보기 상한 — 모둠당 분당 횟수(§2.1 · §5.5). */
export const PREVIEW_PER_MIN_PER_TEAM = 20;
/** 외부 조회 상한 — 모둠당 분당 횟수(캐시 뒤에서만 세요 · §5.5). */
export const LOOKUP_PER_MIN_PER_TEAM = 20;

// ── 서열 정규화 ──────────────────────────────────────────────────────────────

/** 20종 아미노산 한 글자 기호. */
export const AMINO_ACIDS = 'ACDEFGHIKLMNPQRSTVWY';

/** 서열 정규화 실패 — 서버는 이 `code` 로 `invalid_input` 을 내요. */
export class SeqFormatError extends Error {
  readonly code = 'invalid_input' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SeqFormatError';
  }
}

const SEQ_WHITESPACE = /\s+/gu;
const SEQ_NOT_AMINO = /[^ACDEFGHIKLMNPQRSTVWY]/u;

/**
 * 서열 정규화 — 대문자로 바꾸고 공백 · 줄바꿈을 지우고 **20종 아미노산 밖 글자는 거부해요**(§5.4).
 * 결정적 · 순수 · 의존성 없음 — 화면도 서버도 같은 함수를 써요. 해시는 여기 두지 않아요(서버 전용).
 * 간격 문자(`-`) · 종결(`*`) · `X` 같은 모호 기호도 거부해요 — 조용히 지우면 길이가 달라져 번호 매김이 밀려요.
 */
export function normalizeSeq(raw: string): string {
  if (typeof raw !== 'string') throw new SeqFormatError('서열은 글자로 보내 주세요.');
  const seq = raw.toUpperCase().replace(SEQ_WHITESPACE, '');
  if (seq.length === 0) throw new SeqFormatError('서열이 비어 있어요.');
  const bad = SEQ_NOT_AMINO.exec(seq);
  if (bad) throw new SeqFormatError(`아미노산 20종(${AMINO_ACIDS}) 밖의 글자가 있어요 — '${bad[0]}'.`);
  return seq;
}

/** 정규화가 되는 서열인지만 봐요(던지지 않아요). */
export function isAminoAcidSeq(raw: string): boolean {
  try {
    normalizeSeq(raw);
    return true;
  } catch {
    return false;
  }
}

// ── 경로 ─────────────────────────────────────────────────────────────────────

/** 모둠은 세션에서 정해요 — 경로에 모둠 id 를 싣지 않아요(§5.5). */
export const ANTIBODY_API = {
  board: '/api/antibody/board',
  catalog: '/api/antibody/catalog',
  structure: (pdb: string) => `/api/antibody/structure/${encodeURIComponent(pdb)}`,
  program: '/api/antibody/program',
  jobs: '/api/antibody/jobs',
  job: (jobId: string) => `/api/antibody/jobs/${encodeURIComponent(jobId)}`,
  designs: '/api/antibody/designs',
  suggest: '/api/antibody/designs/suggest',
  design: (designId: string) => `/api/antibody/designs/${encodeURIComponent(designId)}`,
  preview: '/api/antibody/preview',
  note: (stepId: AntibodyStepId, section: NoteSection) => `/api/antibody/notes/${stepId}/${section}`,
  cards: '/api/antibody/cards',
  proposals: '/api/antibody/proposals',
  votes: (proposalId: string) => `/api/antibody/proposals/${encodeURIComponent(proposalId)}/votes`,
  submit: '/api/antibody/submit',
  scoring: '/api/antibody/scoring',
  teacherSettings: '/api/antibody/teacher/settings',
  teacherCorrect: '/api/antibody/teacher/correct',
  teacherQueue: '/api/antibody/teacher/queue',
} as const;
