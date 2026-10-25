/**
 * 신약 파이프라인(M5, 프로토콜 v5) — PRD §2.3 '약 정하기' · §2.4 물질특허 · §2.5 IND · 임상 1·2·3상 · 최종 허가.
 * 수치 · 판정 규칙의 단일 소스: docs/2026-10-19-game-balance-v0.md §10(이하 '균형안 §10'). 순수 규칙은 `@crista/game-rules` 의 `pipeline/`.
 * 바뀐 점은 docs/2026-10-21-m5-implementation-brief.md §4 에 모았다.
 *
 * ## 흐름
 * ① 코드명 · 기전 선언(내 사옥 표적 탐색실) → 물질특허 출원(시청 · 특허청 창구) → ② 후보 · 제형 결정(내 사옥 ADMET실) →
 * IND 신청(FDA 창구) → 임상 1 · 2 · 3상(대학병원 창구) → ③ 최종 허가 신청 — 브랜드 이름 · 포장(FDA 창구).
 * 실패(보류 · CRL) 뒤에는 같은 프로토콜로 다시 · 용량 변경(FDA) · 제형 · 후보 교체(ADMET실 → 새 IND)로 재도전한다(균형안 §10.5).
 *
 * ## 장소 — 서버 권위 위치
 * 모든 신청 메시지는 `interactableId` 를 싣고, 서버는 **서버가 받아들인 위치**가 그 지점의 상호작용 사거리(`MOVE.interactRangePx`) 안인지,
 * 그 지점이 맞는 종류인지(특허 = `institution: 'city-hall'` · IND · 용량 변경 · 최종 = `'fda'` · 임상 = `'hospital'` ·
 * 선언 = 내 사옥 `facility: 'target'` · 제형 = 내 사옥 `facility: 'admet'`) 확인한다. 아니면 `out_of_range` · `unknown_interactable`.
 *
 * ## 공개 범위(격리)
 * - **공개**(학급 누구나, 창구 · 객장에서): 특허 원장(티커 · 이름 · SMILES · 출원 날짜 · 상태) · 파이프라인 요약(코드명 · 기전 · 상태) ·
 *   IND 를 낸 뒤의 프로토콜(용량 · 제형 · 환자군 · 1차 평가지표) · 단계 결과(통과 · 보류와 실패 종류) · 허가 뒤 브랜드 이름.
 * - **그 회사 구성원과 교사만**: 후보 분자(어느 특허인가) · 물성 · 위험 신호 · 점수 · 흔들림 · 판정 근거 · 출원 가능한 분자 목록.
 * - 다른 학급으로는 아무것도 보내지 않는다.
 *
 * ## 돈 · 세대
 * 유료 신청(특허 · IND · 임상 · 최종)은 신청과 과금이 한 트랜잭션이다(팀 행 잠금 · 원장 한 줄 · 멱등 `(팀, requestId, 세대)` —
 * 재전송은 같은 결과를 `applied: false` 로). 판정은 게임 서버 순수 함수라 실행 실패 환급 경로가 없다(균형안 §10.1).
 * 특허 · 파이프라인 · 단계 행은 **세대마다 한 벌**이다 — 복원은 저장본의 행을 새 세대로 복사하고 옛 세대 행은 그대로 둔다(원본 보존).
 */
import type { ClassId, ResultMode, TeamId } from './domain.ts';

// ──────────────────────────────── 선택지 ────────────────────────────────

/** 투여 경로 · 제형(PRD §2.3 2단계). 비강 스프레이는 경피 패치와 같은 범주(초회통과 회피 · 지속 방출)로 묶는다. */
export type Formulation = 'oral' | 'iv' | 'transdermal';
export const FORMULATIONS: readonly Formulation[] = ['oral', 'iv', 'transdermal'];
export const FORMULATION_LABEL: Record<Formulation, string> = {
  oral: '경구용 정제 · 캡슐',
  iv: '정맥주사제',
  transdermal: '경피 패치 · 비강 스프레이',
};

/** 투여 용량(PRD §2.5). */
export type DoseMg = 10 | 50 | 100;
export const DOSE_OPTIONS: readonly DoseMg[] = [10, 50, 100];

/** 단계 — IND 심사 · 임상 1 · 2 · 3상 · 최종 허가 심사. */
export type PipelineStepKind = 'ind' | 'phase1' | 'phase2' | 'phase3' | 'final';
export const PIPELINE_STEP_LABEL: Record<PipelineStepKind, string> = {
  ind: 'IND 심사',
  phase1: '임상 1상',
  phase2: '임상 2상',
  phase3: '임상 3상',
  final: '최종 허가 심사',
};

/** 포장 모양 · 색 — 에셋 프레임 `pill/<shape>-<color>`(48×48). 색은 상태 색(빨강 · 파랑 펜 · 형광)과 헷갈리지 않는 팔레트 3색. */
export type PackageShape = 'tablet' | 'capsule' | 'vial' | 'patch';
export const PACKAGE_SHAPES: readonly PackageShape[] = ['tablet', 'capsule', 'vial', 'patch'];
export type PackageColor = 'ivory' | 'sage' | 'sand';
export const PACKAGE_COLORS: readonly PackageColor[] = ['ivory', 'sage', 'sand'];

/** 입력 검증(운영 한도 — 수치 설계가 아니다). */
export const PIPELINE_LIMITS = {
  /** 코드명 — 영문 대문자 2~4자 + '-' + 숫자 3자리(예: CRX-101). 같은 학급 같은 세대에서 겹치지 않는다(`name_taken`). */
  codeNamePattern: '^[A-Z]{2,4}-\\d{3}$',
  /** 기전 한 줄 · 브랜드 이름 · 특허 이름표 글자 수. */
  mechanismMax: 80,
  brandNameMax: 20,
  patentLabelMax: 40,
} as const;

/**
 * 4대 질환(MONDO id) → 그 질환에서 고를 수 있는 Stage 3 도킹 표적 목록(`DOCKING_TARGETS[].id`).
 * Stage 1 데이터셋(`disease_targets.json`)의 `mondoId` · `dockingTargetId` 와 같은 짝이고, 재도킹 검증을 통과한 표적만 들어온다.
 * **첫 값이 그 질환의 기본 표적**(`DISEASE_TO_TARGET` — ① 선언에서 질환만 고르면 이 표적이 정해진다).
 */
export const DISEASE_TARGETS = {
  MONDO_0004975: ['ache-4ey7'],
  MONDO_0005233: ['egfr-1m17', 'alk-2xp2', 'erbb2-3pp0'],
  MONDO_0005148: ['dpp4-1x70', 'gck-1v4s'],
  MONDO_0008383: ['cox2-3ln1'],
} as const;
export type DiseaseId = keyof typeof DISEASE_TARGETS;
/** 도킹 표적 id — `DOCKING_TARGETS[].id` 와 같은 값. */
export type TargetId = (typeof DISEASE_TARGETS)[DiseaseId][number];
export const DISEASE_IDS = Object.keys(DISEASE_TARGETS) as DiseaseId[];
/** 질환 → 기본 도킹 표적(그 질환 목록의 첫 값). */
export const DISEASE_TO_TARGET: { [D in DiseaseId]: (typeof DISEASE_TARGETS)[D][0] } = {
  MONDO_0004975: 'ache-4ey7',
  MONDO_0005233: 'egfr-1m17',
  MONDO_0005148: 'dpp4-1x70',
  MONDO_0008383: 'cox2-3ln1',
};
/** 표적 → 질환(위 매핑의 역방향 — 표적은 한 질환에만 속하므로 표적만 저장해도 질환을 되찾을 수 있다). */
export const TARGET_TO_DISEASE = Object.fromEntries(
  (Object.entries(DISEASE_TARGETS) as Array<[DiseaseId, readonly TargetId[]]>).flatMap(([disease, targets]) =>
    targets.map((target) => [target, disease] as const),
  ),
) as Record<TargetId, DiseaseId>;
/** 그 질환에서 고를 수 있는 표적들(첫 값 = 기본). */
export const targetsOfDisease = (diseaseId: DiseaseId): readonly TargetId[] => DISEASE_TARGETS[diseaseId];
/** 질환 이름(화면 · Stage 1 데이터셋 키와 같은 말). */
export const DISEASE_LABEL: Record<DiseaseId, string> = {
  MONDO_0004975: '알츠하이머병',
  MONDO_0005233: '비소세포폐암',
  MONDO_0005148: '2형 당뇨병',
  MONDO_0008383: '류마티스 관절염',
};

/**
 * 도킹 근거 키(v11) — 같은 분자를 여러 표적에 도킹해도 근거가 섞이지 않게 `"${targetId}|${canonicalSmiles}"` 로 센다.
 * 특허 출원 · 통상실시권 취득은 그 표적의 근거가 있어야 한다.
 */
export function targetEvidenceKey(targetId: string, canonicalSmiles: string): string {
  return `${targetId}|${canonicalSmiles}`;
}

/**
 * 표적별 IND 선택지(환자군 · 1차 평가지표). 키는 `DOCKING_TARGETS[].id`. `cns: true` 표적은 뇌 노출(BBB)이 효능에 들어간다.
 * v11: `brainPopulations` 의 환자군(예: 뇌전이 동반 비소세포폐암)을 고르면 비 CNS 표적도 뇌 노출을 판정에 넣는다(균형안 §10.4).
 * 그 밖의 환자군 · 평가지표는 서류 · 임상 등록부 기록용이다.
 */
export const TRIAL_OPTIONS: Readonly<
  Record<string, { disease: string; populations: readonly string[]; endpoints: readonly string[]; brainPopulations?: readonly string[] }>
> = {
  'ache-4ey7': {
    disease: '알츠하이머병',
    populations: ['경도 알츠하이머병 환자', '중등도~중증 알츠하이머병 환자', '경도인지장애(MCI) 환자'],
    endpoints: ['인지 기능 점수(ADAS-Cog) 변화', '일상 생활 기능(ADCS-ADL) 변화', '임상의 종합 평가(CIBIC-plus)'],
  },
  'egfr-1m17': {
    disease: '비소세포폐암',
    populations: ['EGFR 변이 양성 국소진행성 · 전이성 비소세포폐암 환자', '백금 기반 화학요법 후 재발 비소세포폐암 환자', '뇌전이를 동반한 EGFR 변이 비소세포폐암 환자'],
    endpoints: ['무진행 생존기간(PFS)', '객관적 반응률(ORR · RECIST 1.1)', '전체 생존기간(OS)'],
    brainPopulations: ['뇌전이를 동반한 EGFR 변이 비소세포폐암 환자'],
  },
  'dpp4-1x70': {
    disease: '2형 당뇨병',
    populations: ['메트포르민 단독요법으로 혈당이 조절되지 않는 2형 당뇨병 환자', '신기능 저하를 동반한 2형 당뇨병 환자', '식이 · 운동요법 중인 초기 2형 당뇨병 환자'],
    endpoints: ['24주 시점 당화혈색소(HbA1c) 변화량', '공복 혈장 포도당(FPG) 변화량', '식후 2시간 혈당(PPG) 변화량'],
  },
  'cox2-3ln1': {
    disease: '류마티스 관절염',
    populations: ['중등도~중증 활동성 류마티스 관절염 성인 환자', '기존 NSAID 위장관 부작용 위험군 관절염 환자', '급성 염증성 관절 통증 환자'],
    endpoints: ['ACR20 반응 달성률(24주)', '관절 통증 시각아날로그척도(VAS) 변화', '건강평가설문 장애지수(HAQ-DI) 변화'],
  },
  'alk-2xp2': {
    disease: '비소세포폐암',
    populations: ['ALK 융합 유전자 양성 국소진행성 · 전이성 비소세포폐암 환자', 'ALK 억제제 치료 후 재발 비소세포폐암 환자', '뇌전이를 동반한 ALK 융합 비소세포폐암 환자'],
    endpoints: ['무진행 생존기간(PFS)', '객관적 반응률(ORR · RECIST 1.1)', '두개내 반응률(IC-ORR)'],
    brainPopulations: ['뇌전이를 동반한 ALK 융합 비소세포폐암 환자'],
  },
  'erbb2-3pp0': {
    disease: '비소세포폐암',
    populations: ['HER2(ERBB2) 변이 양성 비소세포폐암 환자', '백금 기반 화학요법 후 재발 HER2 변이 비소세포폐암 환자', '뇌전이를 동반한 HER2 변이 비소세포폐암 환자'],
    endpoints: ['객관적 반응률(ORR · RECIST 1.1)', '무진행 생존기간(PFS)', '반응 지속기간(DoR)'],
    brainPopulations: ['뇌전이를 동반한 HER2 변이 비소세포폐암 환자'],
  },
  'gck-1v4s': {
    disease: '2형 당뇨병',
    populations: ['메트포르민 단독요법으로 혈당이 조절되지 않는 2형 당뇨병 환자', '인슐린 분비능이 남아 있는 초기 2형 당뇨병 환자', '식이 · 운동요법 중인 2형 당뇨병 환자'],
    endpoints: ['24주 시점 당화혈색소(HbA1c) 변화량', '공복 혈장 포도당(FPG) 변화량', '저혈당 사건 발생률'],
  },
};

// ──────────────────────────────── 물성 (워커 RDKit 계산) ────────────────────────────────

/**
 * 구조 경고(반응성 대사체 — 간독성 신호). `aromatic_amine` 은 방향족 1차 아민(아닐린)과 방향족-지방족 2차 아민만 센다 —
 * v11 부터 디아릴아민(`c-NH-c`, 4-아닐리노퀴나졸린 EGFR 억제제의 코어)은 빼고 본다(산화 대사 경로가 다르다).
 */
export type StructuralAlertId = 'aromatic_amine' | 'nitro_aromatic';

/**
 * 워커 `POST /molecule/properties` 가 RDKit 로 계산한 값(실제 계산). 특허 출원 때 한 번 계산해 특허에 남긴다.
 * 이 값에서 위험 신호(`PropertySignals`)를 만드는 규칙은 game-rules 순수 함수다(균형안 §10.3).
 */
export interface MoleculeProperties {
  /** RDKit 정규 SMILES(입체 정보 포함). */
  canonicalSmiles: string;
  /** 입체 정보를 뺀 정규 SMILES(가장 큰 조각) — **특허의 같은 물질 판정 단위**(균형안 §10.2). */
  flatSmiles: string;
  /** 분자량(Da). */
  mw: number;
  /** Crippen cLogP. */
  clogp: number;
  /** 위상 극성 표면적(Å²). */
  tpsa: number;
  hbd: number;
  hba: number;
  /** 회전 가능 결합 수. */
  rotb: number;
  aromaticRings: number;
  /** QED 약물 유사성(0~1). 표시용. */
  qed: number;
  /** 염기성 지방족 아민 수(아마이드 · 방향족 아민 · 설폰아마이드 질소 제외). */
  basicAmines: number;
  alerts: StructuralAlertId[];
  /** 'RDKit 2026.09.1' 같은 엔진 기록. */
  engine: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high';

/** 물성 → 위험 신호(균형안 §10.3 표). 화면은 신호마다 근거 수치를 함께 보인다. */
export interface PropertySignals {
  ro5Violations: number;
  oralAbsorption: 'good' | 'moderate' | 'poor';
  bbb: 'high' | 'moderate' | 'low';
  herg: RiskLevel;
  hepatotoxicity: RiskLevel;
  transdermal: 'suitable' | 'unsuitable';
}

// ──────────────────────────────── 특허 ────────────────────────────────

/** `lapsed` = 회사가 재창업해 소멸한 특허(누구나 다시 출원할 수 있다). */
export type PatentStatus = 'active' | 'lapsed';

/** 특허 원장 한 줄 — **공개**(특허청 창구에서 누구나). 어느 파이프라인의 후보인지는 싣지 않는다. */
export interface PatentPublicView {
  id: string;
  teamId: TeamId;
  ticker: string;
  companyName: string;
  /** 출원인이 붙인 이름표(예: '도네페질') — 없으면 null. */
  label: string | null;
  canonicalSmiles: string;
  status: PatentStatus;
  filedAtMs: number;
  filedGameDay: number;
}

/** 내 회사 특허(그 회사 구성원 · 교사만) — 출원 시점의 결합 자유에너지 · 물성 · 위험 신호. */
export interface PatentView extends PatentPublicView {
  targetId: string;
  /** 출원 시점의 이번 세대 최고 결합 자유에너지(kcal/mol, 교사 정정 반영). 판정은 이 값을 쓴다. */
  affinityKcal: number;
  properties: MoleculeProperties;
  signals: PropertySignals;
  costCents: number;
  filedByName: string;
}

/**
 * 출원할 수 있는(또는 막힌) 분자 — 그 회사 구성원에게만. 이번 세대 실제 도킹(`vina`) 성공 결과의 **표적 × 분자**마다 한 줄(v11) —
 * 같은 분자를 두 표적에 도킹했으면 두 줄이고, 줄의 식별자는 `targetEvidenceKey(targetId, canonicalSmiles)` 다.
 * 이미 다른 회사가 같은 물질 특허를 갖고 있으면 `conflict` 가 그 티커다(출원하면 `patent_conflict`).
 */
export interface PatentCandidateView {
  canonicalSmiles: string;
  label: string | null;
  targetId: string;
  /** 이번 세대 최고 결합 자유에너지(교사 정정 반영, 무효 정정 제외). */
  affinityKcal: number;
  /** 그 최고값을 낸 작업. */
  jobId: string;
  /** 같은 물질의 유효 특허를 가진 다른 회사(없으면 null). */
  conflict: { ticker: string; patentId: string } | null;
  /** 우리 회사가 이미 특허를 갖고 있다. */
  ours: boolean;
}

// ──────────────────────────────── 프로토콜 · 판정 ────────────────────────────────

/** IND 를 낸 뒤 공개되는 프로토콜(임상 등록부). */
export interface ProtocolPublicView {
  dose: DoseMg;
  formulation: Formulation;
  population: string;
  endpoint: string;
}

/** 단계 하나의 프로토콜(그 회사 · 교사) — 어느 특허를 후보로 썼는가까지. */
export interface StepProtocol extends ProtocolPublicView {
  patentId: string;
  candidateLabel: string | null;
}

export type FailureKind = 'safety' | 'efficacy' | 'both';

/**
 * 판정 기록(그 회사 · 교사) — 균형안 §10.4 의 점수 · 흔들림 · 보너스 · 기준을 그대로 남겨 다시 계산할 수 있게 한다.
 * 점수는 소수 첫째 자리 반올림 값. 그 단계가 보지 않는 축은 null(예: 1상의 효능).
 */
export interface StepJudgement {
  efficacy: number | null;
  safety: number | null;
  noiseEfficacy: number | null;
  noiseSafety: number | null;
  /** 대학병원 지구 보너스(+3 또는 0). IND · 최종 심사는 0. */
  bonus: number;
  thresholds: { efficacy: number | null; safety: number | null };
  passed: boolean;
  failure: FailureKind | null;
  /** 규칙 기반 근거 문장(예: 'hERG 위험 높음 — 염기성 아민 · cLogP 4.36 ≥ 3.7', '정맥주사 혈중 피크 ×1.25'). 지어낸 수치 없이 실제 값만. */
  reasons: string[];
  /** 재현용 입력 — 결합력 p · 계수 A · B · De · Dt · R · K 와 결합 자유에너지. */
  inputs: { affinityKcal: number; p: number; A: number; B: number; De: number; Dt: number; R: number; K: number };
}

/** `running` 진행 중 · `passed` · `failed` 판정 끝 · `halted` 재창업으로 닫힘(판정하지 않음). */
export type StepStatus = 'running' | 'passed' | 'failed' | 'halted';

/** 단계 한 줄(그 회사 · 교사). */
export interface PipelineStepView {
  id: string;
  programId: string;
  teamId: TeamId;
  kind: PipelineStepKind;
  status: StepStatus;
  protocol: StepProtocol;
  startedAtMs: number;
  startedGameDay: number;
  /** 끝나는 게임 일(시작 + 기간 × 배율). 진행률 = (지금 게임 일 − 시작) / (끝 − 시작). */
  endGameDay: number;
  decidedAtMs: number | null;
  decidedGameDay: number | null;
  costCents: number;
  requestedByName: string;
  /** 판정 뒤에만. */
  judgement: StepJudgement | null;
  /** 교사 판정 정정(원본 `judgement` 는 그대로) — 화면은 원본과 정정을 함께 보이고 `ui/gm-badge`. */
  correction: { outcome: 'passed' | 'failed'; byName: string; reason: string; atMs: number } | null;
}

/** 임상 등록부 한 줄 — **공개**(대학병원 창구에서 누구나). 점수는 싣지 않는다. */
export interface PipelineStepPublicView {
  id: string;
  teamId: TeamId;
  ticker: string;
  companyName: string;
  codeName: string;
  kind: PipelineStepKind;
  status: StepStatus;
  protocol: ProtocolPublicView;
  startedGameDay: number;
  endGameDay: number;
  decidedGameDay: number | null;
  failure: FailureKind | null;
  corrected: boolean;
}

// ──────────────────────────────── 파이프라인 ────────────────────────────────

/**
 * 파이프라인 상태(균형안 §10.1 · §10.5). 진행 중 단계가 있으면 `ind_review` · `phaseN` · `final_review`.
 * - `declared` 코드명만 → `formulated` 후보 · 제형 결정(IND 가능) → `ind_review` → `ind_hold`(다시 IND) | `ind_approved`(1상 가능)
 * - `phaseN` → `phaseN_passed`(다음 상 가능, 3상 통과면 최종 신청 가능) | `phaseN_failed`(보류 — 같은 상 다시 · 용량 변경 · 제형 교체)
 * - `final_review` → `approved`(끝) | `final_rejected`(교사 정정으로만 — 최종 다시 신청)
 * - `closed` 재창업으로 닫힘(읽기 전용).
 */
export type ProgramStatus =
  | 'declared'
  | 'formulated'
  | 'ind_review'
  | 'ind_hold'
  | 'ind_approved'
  | 'phase1'
  | 'phase1_passed'
  | 'phase1_failed'
  | 'phase2'
  | 'phase2_passed'
  | 'phase2_failed'
  | 'phase3'
  | 'phase3_passed'
  | 'phase3_failed'
  | 'final_review'
  | 'final_rejected'
  | 'approved'
  | 'closed';

export interface DrugBrand {
  /** 공식 상표명(예: '뉴로클리어정'). 1~20자. */
  name: string;
  packageShape: PackageShape;
  packageColor: PackageColor;
}

/** 우리 파이프라인(그 회사 구성원 · 교사). */
export interface ProgramView {
  id: string;
  teamId: TeamId;
  codeName: string;
  /** 치료 기전 한 줄(학생 글, 80자 이하). */
  mechanism: string;
  /** 이 파이프라인이 겨냥하는 표적(`DOCKING_TARGETS[].id`) — ① 선언에서 질환과 함께 정한다(v11). */
  targetId: string;
  /** ① 에서 고른 질환(MONDO id, v11) — 표적과 짝이다. 옛 세대 복원본은 없을 수 있다. */
  diseaseId?: DiseaseId;
  status: ProgramStatus;
  /** ② 에서 고른 후보(내 회사 유효 특허). 없으면 null. */
  candidate: { patentId: string; label: string | null; canonicalSmiles: string; affinityKcal: number; properties: MoleculeProperties; signals: PropertySignals } | null;
  formulation: Formulation | null;
  /** IND 를 낸 뒤의 프로토콜(용량 변경이 반영된 지금 값). */
  protocol: ProtocolPublicView | null;
  /** 1상을 통과한 용량 — 이보다 올리면 1상부터 다시(균형안 §10.5). */
  phase1PassedDose: DoseMg | null;
  brand: DrugBrand | null;
  runningStepId: string | null;
  /** 지금 시작할 수 있는 다음 단계(IND · n상 · 최종). 없거나 진행 중이면 null. */
  nextStep: PipelineStepKind | null;
  createdAtMs: number;
  updatedAtMs: number;
}

/** 파이프라인 요약 — **공개**(객장 시세 · FDA 창구 · 교사 시찰 카드). IND 전에는 프로토콜 없음, 허가 전에는 브랜드 없음. */
export interface PipelinePublicSummary {
  teamId: TeamId;
  ticker: string;
  companyName: string;
  codeName: string;
  mechanism: string;
  status: ProgramStatus;
  protocol: ProtocolPublicView | null;
  /** 허가 뒤에만. */
  brand: DrugBrand | null;
  /** 이 회사의 유효 특허 수. */
  patents: number;
}

// ──────────────────────────────── 룸 메시지 (클라이언트 → 서버) ────────────────────────────────

/** `C2S.PIPELINE_SYNC` — 내 파이프라인 상태 다시 받기(그 회사 구성원만 — 아니면 무시). 입장 때 서버가 먼저 보낸다. */
export type PipelineSyncMessage = Record<string, never>;

/** `C2S.PIPELINE_DESK` — 창구의 공개 원장(특허 원장 · 파이프라인 요약 · 임상 등록부) 받기. 그 창구 사거리 안에서만. 학생 · 교사 모두. */
export interface PipelineDeskRequest {
  interactableId: string;
}

/**
 * `C2S.PROGRAM_DECLARE` — ① 질환 · 표적 · 코드명 · 기전 선언(내 사옥 표적 탐색실). 다시 보내면 IND 전까지는 고칠 수 있다. 무료.
 * v11: 질환(`diseaseId`)과 표적(`targetId`)을 여기서 정한다 — 빠지면 서버가 `DISEASE_TO_TARGET` 기본 짝을 쓴다.
 * IND 를 낸 뒤에는 표적을 바꿀 수 없다(`pipeline_order`).
 */
export interface ProgramDeclareMessage {
  requestId: string;
  interactableId: string;
  codeName: string;
  mechanism: string;
  /** 겨냥할 질환(MONDO id). 생략하면 지금 표적의 질환을 그대로 둔다. */
  diseaseId?: DiseaseId;
  /** 겨냥할 표적(`DOCKING_TARGETS[].id`). 생략하면 `DISEASE_TO_TARGET[diseaseId]`. */
  targetId?: TargetId;
}

/**
 * `C2S.PATENT_FILE` — 물질특허 출원(시청 · 특허청 창구). `canonicalSmiles` 는 `PatentCandidateView.canonicalSmiles` 그대로. $0.050M.
 * v11: 같은 분자를 여러 표적에 도킹했으면 어느 표적의 근거로 내는지 `targetId` 로 고른다(빠지면 파이프라인 표적 → 가장 센 근거).
 */
export interface PatentFileMessage {
  requestId: string;
  interactableId: string;
  canonicalSmiles: string;
  /** 근거로 삼을 도킹 표적(`PatentCandidateView.targetId`). */
  targetId?: TargetId;
  /** 이름표(선택, 40자 이하). */
  label?: string;
}

/** `C2S.PROGRAM_FORMULATE` — ② 후보(내 유효 특허) · 제형 결정(내 사옥 ADMET실). 무료. 진행 중 단계가 있으면 `pipeline_busy`. 언제나 `formulated` 로 돌아간다. */
export interface ProgramFormulateMessage {
  requestId: string;
  interactableId: string;
  patentId: string;
  formulation: Formulation;
}

/** `C2S.IND_FILE` — IND 신청(FDA 창구). `formulated` · `ind_hold` 에서만. 환자군 · 지표는 `TRIAL_OPTIONS` 중 하나. */
export interface IndFileMessage {
  requestId: string;
  interactableId: string;
  dose: DoseMg;
  population: string;
  endpoint: string;
}

/** `C2S.PROTOCOL_AMEND` — 용량 변경(FDA 창구). IND 승인 뒤 · 진행 중 단계 없음 · 허가 전. 1상 통과 용량보다 올리면 `ind_approved` 로 돌아간다. 무료. */
export interface ProtocolAmendMessage {
  requestId: string;
  interactableId: string;
  dose: DoseMg;
}

/** `C2S.TRIAL_START` — 다음 임상 단계 시작(대학병원 창구). 시작할 단계는 서버가 `nextStep` 으로 정한다(실패한 상이면 그 상을 다시). */
export interface TrialStartMessage {
  requestId: string;
  interactableId: string;
}

/** `C2S.FINAL_FILE` — ③ 최종 허가 신청 · 브랜드(FDA 창구). `phase3_passed` · `final_rejected` 에서만. */
export interface FinalFileMessage {
  requestId: string;
  interactableId: string;
  brand: DrugBrand;
}

/** `C2S.PIPELINE_SEEN` — 단계 결과를 확인했다(미확인 목록에서 뺀다). */
export interface PipelineSeenMessage {
  stepId: string;
}

// ──────────────────────────────── 룸 메시지 (서버 → 클라이언트) ────────────────────────────────

/**
 * `S2C.PIPELINE_STATE` — 그 회사 구성원에게만(입장 · 신청 · 판정 · 복원 · 정정 뒤). 교사는 `GmClassState.pipeline` 으로 본다.
 * 같은 학생 팀의 이전 회사(재창업 전)의 파이프라인은 `previous` 로 읽기 전용(학습 노트).
 */
export interface PipelineStateMessage {
  classId: ClassId;
  teamId: TeamId;
  generation: number;
  program: ProgramView | null;
  /** 이번 세대 단계(최신이 앞). */
  steps: PipelineStepView[];
  /** 내 회사 특허(유효 · 소멸). */
  patents: PatentView[];
  /** 출원할 수 있는 분자(막힌 것 포함). */
  candidates: PatentCandidateView[];
  /** 내가 아직 확인하지 않은 판정 단계 id(오래된 것이 앞). */
  unseenStepIds: string[];
  previous: { program: ProgramView; steps: PipelineStepView[] } | null;
}

/** `S2C.PIPELINE_DESK` — 창구 공개 원장(요청한 사람에게만). 창구 종류마다 한 칸만 채운다. */
export interface PipelineDeskMessage {
  interactableId: string;
  institution: 'city-hall' | 'fda' | 'hospital';
  /** 특허청 — 학급 특허 원장(이번 세대, 최신이 앞). */
  patents?: PatentPublicView[];
  /** FDA — 학급 파이프라인 요약. */
  programs?: PipelinePublicSummary[];
  /** 대학병원 — 임상 등록부(이번 세대의 IND · 임상 · 최종 단계, 최신이 앞). */
  trials?: PipelineStepPublicView[];
  atMs: number;
}

/**
 * `S2C.PIPELINE_RESULT` — 단계 판정(IND 승인 · 보류, n상 통과 · 실패, 허가)을 그 회사 구성원에게. 실험 결과처럼 `deliver`(자동 열기 · 알림)를 따른다(PRD §6).
 * 특허 등록은 판정이 아니라 신청 결과라 `PIPELINE_STATE` 와 `NOTICE` 로만 알린다.
 */
export interface PipelineResultMessage {
  step: PipelineStepView;
  program: ProgramView;
  deliver: ResultMode;
}

// ──────────────────────────────── 교사 ────────────────────────────────

/** 교사 화면의 회사별 파이프라인 — 모든 값(점수 · 물성 포함). */
export interface GmPipelineTeamView {
  teamId: TeamId;
  companyName: string;
  ticker: string;
  program: ProgramView | null;
  steps: PipelineStepView[];
  patents: PatentView[];
}

/** 정정할 수 있는 단계 판정 — 그 파이프라인에서 가장 최근에 판정된 단계이고 뒤 단계가 시작되지 않았을 때만 `eligible`(균형안 §10.7). */
export interface CorrectablePipelineStepView {
  stepId: string;
  teamId: TeamId;
  companyName: string;
  codeName: string;
  kind: PipelineStepKind;
  status: 'passed' | 'failed';
  decidedAtMs: number;
  corrected: boolean;
  eligible: boolean;
}

/** 애널리스트에게 넘기는 파이프라인 사실 — **공개 정보만**(균형안 §10.7). `mechanism` 은 학생 글이라 평가 대상으로만 쓴다. */
export interface AnalystPipelineFacts {
  codeName: string;
  mechanism: string;
  step: 'patent' | PipelineStepKind;
  outcome: 'filed' | 'passed' | 'failed';
  failure?: FailureKind;
  dose?: DoseMg;
  formulation?: Formulation;
  population?: string;
  endpoint?: string;
  /** 그 회사의 유효 특허 수. */
  patents: number;
}

/** 단계 판정 이름표 — 화면 · 속보 공용. */
export function stepOutcomeLabel(kind: PipelineStepKind, passed: boolean): string {
  if (kind === 'ind') return passed ? 'IND 승인' : 'IND 보류';
  if (kind === 'final') return passed ? '최종 허가' : '최종 허가 거절';
  return `${PIPELINE_STEP_LABEL[kind]} ${passed ? '통과' : '보류(CRL)'}`;
}
