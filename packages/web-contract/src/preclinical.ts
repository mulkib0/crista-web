/**
 * 3.2 전임상 · 동물실험 규격(설계 §5.9 · §7.3 · §7.4 ⑬ ⑭) — 기능 F32.
 *
 * 걸음: ① 윤리 배우기(카드 5장 · 확인 문제 3개) ② 동물실험계획서 → 윤리위원회 심의(규칙 + LLM 'iacuc') ③ 대체 시험 2종(선택 · 동물 0마리)
 *       ④ 동물실험 묶음(특허 분자마다 · 게임 시계 28일) ⑤ 한 번 더 고르기(주력 1 + 백업 0~1 · 근거 칩 · 종료보고서).
 * 표: web.ethics_training · iacuc_protocols · iacuc_sections · iacuc_protocol_patents · jobs(step '3.2') · preclinical_calcs · preclinical_reports(0006 · 0013).
 * 작업: 워커를 부르지 않는 서버 내부 작업 — 과금 · 멱등은 jobs 틀 그대로, 끝은 게임 시계(서버 clock.ts `onGameDay`).
 *
 * 숫자 규칙(`PRECLINICAL_RULES`)은 판정 재료(game-rules §10.4)에서 거꾸로 NOAEL 을 정한다 —
 *   노출 한계 T* = 65 ÷ (Rk × K) · 허용 최대 용량 = Dt⁻¹(T*)(Dt 는 10 → 10 · 50 → 30 · 100 → 55 직선 보간)
 *   → 'MRSD 이하 용량이면 그 제형에서 S ≥ 35(IND 기준)' 가 늘 성립한다(test/preclinical.test.ts 가 4 표적 × 후보 × 제형 × 용량 전 조합으로 지킨다).
 * 학생에게 보이는 글은 `PRECLINICAL_COPY` 한곳에 모았다(§5.12 — Gemini 4 Argon (High) 가 한꺼번에 다듬는다). 식별자 · 숫자 · 규칙 값은 그 밖에.
 * 공개 범위(§5.3): 계획서 · 결과 · 마릿수는 모둠과 교사만(교사 화면은 학급 합계 API). 전광판에는 코드명 · 단계만.
 */
import type { TargetId } from '@crista/shared-types';
import type { DocReviewView, DocSectionView, ReasonVerdict, ReviewChecklistItem, RuleFinding } from './review.ts';
import { reasonBlock, reasonOk, reasonWarn, REVIEW_LIMITS } from './review.ts';
import type { IndForm } from './ind.ts';
import { cristaToCents } from './money.ts';
import { formatGameDay } from './clock.ts';
import type { Avatar } from './rules.ts';

export type AnimalCountLevel = 'low' | 'standard' | 'high';
export const ANIMAL_COUNT_LEVELS: readonly AnimalCountLevel[] = ['low', 'standard', 'high'];
/** 후보 하나의 동물실험 묶음 마릿수(적게 · 알맞게 · 많이 — §5.9 ④). */
export const ANIMALS_PER_CANDIDATE: Record<AnimalCountLevel, number> = { low: 46, standard: 82, high: 141 };

export type IacucStatus = 'draft' | 'reviewing' | 'revise' | 'approved';

/** 대체 시험 2종(동물 0마리). */
export type AltAssay = 'herg' | 'liver';
export const ALT_ASSAYS: readonly AltAssay[] = ['herg', 'liver'];

/** 비용 · 기간(제안값 — 설계 §5.9 · §12-15). 대체 시험 50,000 크리스타 · 2게임 일, 동물실험 후보당 400,000 크리스타 · 28게임 일. */
export const PRECLINICAL_FEES = {
  altAssayCrista: 50_000,
  animalStudyCrista: 400_000,
  altAssayGameDays: 2,
  animalStudyGameDays: 28,
} as const;
export const ALT_ASSAY_COST_CENTS = cristaToCents(PRECLINICAL_FEES.altAssayCrista);
export const ANIMAL_STUDY_COST_CENTS = cristaToCents(PRECLINICAL_FEES.animalStudyCrista);

/** jobs.design_key — 같은 (특허 · 설계)는 한 번만(DB 부분 고유 키 jobs_patent_design_key). */
export const animalDesignKey = (level: AnimalCountLevel): string => `animal:${level}`;
export const altDesignKey = (assay: AltAssay): string => `alt:${assay}`;

/** 심사관 판 — 체크리스트 · 프롬프트를 바꾸면 올린다(같은 판의 같은 서류는 LLM 을 다시 부르지 않는다). */
export const IACUC_REVIEWER_VERSION = 'iacuc-v3'; // v3 = 심사관 '학생에게 말하는 법' 단락(reviews.ts REVIEWER_TALK_*)

// ── 3.2 작업 결과 모양(jobs.result) — F32 가 쓰고 F33(3.3 신청서 · 시작 용량 ≤ MRSD)이 읽는다 ──
// 두 기능이 병렬로 만들어지므로 **이름 · 뜻을 바꾸지 않는다**. F32 는 칸을 더할 수 있다(결과판 · 종료보고서용).
// 3.2 작업 줄의 `WebJobView.result` 는 워커 결과 형(ExperimentResult)으로 적혀 있지만 실제로는 아래 꼴이다 — `asPreclinicalResult` 로 읽는다.

/** 동물실험 소견(규칙으로 정해짐) — 3.3 ④ 해석 · ⑥ 위험 감시 규칙이 읽는다. */
export type PreclinicalFinding = 'liver' | 'qt' | 'cns';
export type PainGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export const PAIN_GRADES: readonly PainGrade[] = ['A', 'B', 'C', 'D', 'E'];
export type PreclinicalSpecies = 'rat' | 'dog';

/** jobs.result — facility 'animal_study'(특허 분자 하나 · 승인된 계획서 수준). 값은 결정적(씨앗 = 표적 버전 · 분자 · 설계 해시). */
export interface AnimalStudyResult {
  kind: 'animal_study';
  level: AnimalCountLevel;
  /** 이 묶음에 쓴 마릿수(= ANIMALS_PER_CANDIDATE[level]). */
  animalsUsed: number;
  /** 약동학 — 경구 생체이용률 % · (CNS 표적만) 뇌/혈장 비. F32 가 더한 칸: 최고 농도 · 반감기. */
  pk: { oralBioavailabilityPct: number; brainPlasmaRatio: number | null; cmaxNgPerMl: number; halfLifeH: number };
  /** 효력 — 기준 약 대비 %(100 = 기준 약만큼). */
  efficacyVsReferencePct: number;
  /** 종별 NOAEL(mg/kg/일). */
  noaelMgPerKgDay: { rat: number; dog: number };
  /** 더 낮은 HED(mg/kg) — 가장 민감한 종. */
  hedMgPerKg: number;
  /** 안전계수 — 적게면 20, 아니면 10(FDA 2005). */
  safetyFactor: 10 | 20;
  /** 제형별 MRSD(mg) — 3.3 시작 용량 상한. 'MRSD 이하면 그 제형에서 S ≥ 35'(PRECLINICAL_RULES 시험). */
  mrsdMgByForm: Record<IndForm, number>;
  findings: PreclinicalFinding[];
  painGrade: PainGrade;
  /** 인도적 종료 발생 수(종료보고서). */
  humaneEndpoints: number;
  /** F32 가 더한 칸 — 가장 민감한 종(HED 를 정한 종) · 종별 마릿수 내역 · 효력 모델 표적. */
  sensitiveSpecies: PreclinicalSpecies;
  animalsBySpecies: { rat: number; dog: number; mouse: number };
  targetId: string;
}

/** jobs.result — facility 'alt_assay'(동물 0마리). 2.2 신호를 실험 값으로 굳힌 구간. */
export interface AltAssayResult {
  kind: 'alt_assay';
  assay: AltAssay;
  band: 'low' | 'medium' | 'high';
  /** F32 가 더한 칸 — 잰 값(hERG IC50 µM · 간세포 생존율 %). */
  value: number;
  unit: 'µM' | '%';
}

export type PreclinicalJobResult = AnimalStudyResult | AltAssayResult;

/** 3.2 작업 결과를 이 꼴로 읽는다(아니면 null). */
export function asPreclinicalResult(result: unknown): PreclinicalJobResult | null {
  const kind = (result as { kind?: unknown } | null)?.kind;
  return kind === 'animal_study' || kind === 'alt_assay' ? (result as PreclinicalJobResult) : null;
}

// ── 판정 재료(game-rules PIPELINE_RULES §10.4 와 같은 값 — test 가 대조한다. 여기서 값을 바꾸지 않는다) ──

export type PreclinicalRisk = 'low' | 'moderate' | 'high';
export type PreclinicalOral = 'good' | 'moderate' | 'poor';
export type PreclinicalBbb = 'high' | 'moderate' | 'low';
export type PreclinicalDose = 10 | 50 | 100;

export const PRECLINICAL_GAME_RULES = {
  doseToxicity: { 10: 10, 50: 30, 100: 55 } as Readonly<Record<PreclinicalDose, number>>,
  risk: {
    herg: { low: 0, moderate: 0.3, high: 0.6 } as Readonly<Record<PreclinicalRisk, number>>,
    hepatotoxicity: { low: 0, moderate: 0.25, high: 0.6 } as Readonly<Record<PreclinicalRisk, number>>,
  },
  formulationPeak: { oral: 1.0, iv: 1.25, transdermal: 0.75 } as Readonly<Record<IndForm, number>>,
  /** S = max(0, 100 − Dt × Rk × K) — IND 기준 S ≥ 35 이면 노출 한계 Dt × Rk × K ≤ 65. */
  safetyBase: 100,
  /** IND 기준(ind.ts IND_SAFETY_MIN · game-rules thresholds.ind.safety 와 같은 값 — 값 가져오기는 서로 부르는 순환을 피하려고 하지 않는다). */
  safetyMin: 35,
  efficacy: { base: 0.3, affinityWeight: 0.7 },
  /** 기준 리간드(기준 약)의 결합력 p — 표적별 정규화로 늘 0.9(game-rules affinity 머리 주석). */
  referenceP: 0.9,
  absorptionOral: { good: 1.0, moderate: 0.75, poor: 0.45 } as Readonly<Record<PreclinicalOral, number>>,
  bbb: { high: 1.0, moderate: 0.7, low: 0.35 } as Readonly<Record<PreclinicalBbb, number>>,
} as const;

/** FDA 2005 MRSD 지침 — 체표면적 환산 계수(Km 비) · 사람 60 kg. */
export const SPECIES_HED_DIVISOR: Record<PreclinicalSpecies, number> = { rat: 6.2, dog: 1.8 };
export const HUMAN_WEIGHT_KG = 60;
/** 안전계수 — 적게면 자료 부족으로 10 → 20(FDA 2005), 많이는 얻는 것이 없다(그대로 10). */
export const SAFETY_FACTOR: Record<AnimalCountLevel, 10 | 20> = { low: 20, standard: 10, high: 10 };
/** 근거 칩 '질환 모델에서 기준 약만큼 들어요' — 효력 ≥ 기준 약 × 0.8. */
export const EFFICACY_CHIP_MIN_PCT = 80;
/** 근거 칩 '뇌까지 잘 가요' — 뇌 노출 '높음' 에 해당하는 뇌/혈장 비. */
export const BRAIN_PLASMA_HIGH_MIN = 0.7;
/** 학생 계산 칸 허용 오차 — HED 는 2% 또는 0.05 mg/kg, MRSD 는 2% 또는 1 mg 중 큰 쪽. */
export const CALC_TOLERANCE = { relative: 0.02, hedAbs: 0.05, mrsdAbs: 1 } as const;
/** 인도적 종료시점 숫자 칸(체중 감소 %) 범위. */
export const ENDPOINT_PCT_RANGE = { min: 1, max: 50 } as const;
/** 계획서 수행자 · 근거 등 길이. */
export const PRECLINICAL_LIMITS = { sectionMax: 1200, reflectionMax: 200, performersMax: 6 } as const;

// ── 효력 모델(설계 §5.9 표 그대로) — 4 표적. 고통등급 · 종료시점은 수의사 · IACUC 실무 자문 전 '제안' 값(§12-15) ──

export interface PreclinicalModel {
  targetId: TargetId;
  gene: string;
  /** 질환 모델 · 재는 것 · 인도적 종료시점(학생용 글). */
  model: string;
  measures: string;
  endpoint: string;
  /** 모델 정답 고통등급(규칙: 계획서 고른 등급 ≠ 이 값이면 보완). */
  painGrade: PainGrade;
  /** 효력 시험 종 — 마릿수 내역에 쓴다. */
  species: 'mouse' | 'rat';
  /** 토론 거리(있으면). */
  debate?: string;
}

export const PRECLINICAL_MODELS: Record<TargetId, PreclinicalModel> = {
  'ache-4ey7': {
    targetId: 'ache-4ey7',
    gene: 'ACHE',
    model: '스코폴라민 유도 기억 손상 생쥐',
    measures: 'Y-미로 자발적 교대율 회복',
    endpoint: '체중 20% 감소',
    painGrade: 'C',
    species: 'mouse',
  },
  'egfr-1m17': {
    targetId: 'egfr-1m17',
    gene: 'EGFR',
    model: 'EGFR 변이 폐암 세포 이종이식 누드마우스',
    measures: '종양 성장 억제율(TGI)',
    endpoint: '종양이 체중의 10% 초과 · 궤양',
    painGrade: 'D',
    species: 'mouse',
  },
  'dpp4-1x70': {
    targetId: 'dpp4-1x70',
    gene: 'DPP4',
    model: '경구 포도당 부하 시험(OGTT) 생쥐',
    measures: '혈당 곡선 면적 감소',
    endpoint: '체중 20% 감소',
    painGrade: 'C',
    species: 'mouse',
  },
  'cox2-3ln1': {
    targetId: 'cox2-3ln1',
    gene: 'PTGS2',
    model: '콜라겐 유도 관절염(CIA) 랫드',
    measures: '관절 부종 · 관절염 점수 감소',
    endpoint: '보행 불능 · 체중 20% 감소',
    painGrade: 'D',
    species: 'rat',
    debate: '진통제가 효력 판정을 흐릴 수 있어 E 로 갈 위험 — 토론 거리',
  },
};

export const preclinicalModelOf = (targetId: string | null | undefined): PreclinicalModel | null =>
  targetId && targetId in PRECLINICAL_MODELS ? PRECLINICAL_MODELS[targetId as TargetId] : null;

/** 묶음 마릿수 내역(알맞게 82 = PK 랫드 6 + 효력 8 × 3군 + 독성 랫드 10 × 4군 + 비글 3 × 4군). 적게 · 많이는 같은 비율. */
const STUDY_SPLIT = { pkRat: 6 / 82, efficacy: 24 / 82, toxRat: 40 / 82, toxDog: 12 / 82 } as const;

// ── 순수 규칙 ──

/** 결정적 씨앗 — FNV-1a 32비트 → [0, 1) 수열(같은 문자열이면 같은 값). */
function seeded(seed: string): (salt: string) => number {
  return (salt: string) => {
    let h = 0x811c9dc5;
    const text = `${seed}|${salt}`;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // 한 번 더 섞는다(xorshift) — 끝 글자만 다른 씨앗도 고르게.
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

const between = (u: number, lo: number, hi: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round((lo + (hi - lo) * u) * f) / f;
};
const floorTo = (x: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.floor(x * f + 1e-9) / f;
};

/** 동물실험 · 대체 시험 입력 — 서버가 특허 분자의 RDKit 물성 → game-rules 신호 · 결합력 p 로 만든다(SMILES 는 싣지 않는다). */
export interface PreclinicalInput {
  targetId: string;
  /** CNS 표적인가(DockingTarget.cns). */
  cns: boolean;
  /** 결합력 p(0~1) — game-rules `affinityStrength(ΔG, 표적 기준)`. */
  p: number;
  herg: PreclinicalRisk;
  hepatotoxicity: PreclinicalRisk;
  oralAbsorption: PreclinicalOral;
  bbb: PreclinicalBbb;
  /** 씨앗 — (표적 버전 · 분자 · 설계). */
  seed: string;
}

const G = PRECLINICAL_GAME_RULES;
const DOSE_POINTS: readonly PreclinicalDose[] = [10, 50, 100];

export const PRECLINICAL_RULES = {
  /** 위험 배율 Rk = 1 + hERG + 간독성(game-rules riskMultiplier 와 같은 식). */
  riskMultiplier(sig: { herg: PreclinicalRisk; hepatotoxicity: PreclinicalRisk }): number {
    return 1 + G.risk.herg[sig.herg] + G.risk.hepatotoxicity[sig.hepatotoxicity];
  },
  /** 노출 한계 T* = (100 − 35) ÷ (Rk × K). */
  exposureLimit(rk: number, form: IndForm): number {
    return (G.safetyBase - G.safetyMin) / (rk * G.formulationPeak[form]);
  },
  /** 용량 독성 Dt(mg) — 10 · 50 · 100 사이 직선(밖은 끝 구간의 기울기로 늘림). */
  doseToxicityAt(doseMg: number): number {
    const pts = DOSE_POINTS.map((d) => [d, G.doseToxicity[d]] as const);
    const seg = doseMg <= pts[1]![0] ? [pts[0]!, pts[1]!] : [pts[1]!, pts[2]!];
    const [[x0, y0], [x1, y1]] = seg as [readonly [number, number], readonly [number, number]];
    return y0 + ((doseMg - x0) * (y1 - y0)) / (x1 - x0);
  },
  /** Dt⁻¹ — 용량 독성이 T 가 되는 용량(mg). */
  doseForToxicity(t: number): number {
    const pts = DOSE_POINTS.map((d) => [d, G.doseToxicity[d]] as const);
    const seg = t <= pts[1]![1] ? [pts[0]!, pts[1]!] : [pts[1]!, pts[2]!];
    const [[x0, y0], [x1, y1]] = seg as [readonly [number, number], readonly [number, number]];
    return x0 + ((t - y0) * (x1 - x0)) / (y1 - y0);
  },
  /** 그 제형의 허용 최대 용량(mg, 안전계수 10 기준 — 반올림 전). */
  maxSafeDoseMg(sig: { herg: PreclinicalRisk; hepatotoxicity: PreclinicalRisk }, form: IndForm): number {
    return this.doseForToxicity(this.exposureLimit(this.riskMultiplier(sig), form));
  },
  /** 가장 민감한 종 — hERG 위험이면 개, 간 위험이면 랫드(교육용 단순화). 같으면 개. */
  sensitiveSpecies(sig: { herg: PreclinicalRisk; hepatotoxicity: PreclinicalRisk }): PreclinicalSpecies {
    return G.risk.hepatotoxicity[sig.hepatotoxicity] > G.risk.herg[sig.herg] ? 'rat' : 'dog';
  },
  /** NOAEL → HED(mg/kg) — 두 종 중 더 낮은 값(소수 둘째 자리 내림). */
  hedOf(noael: { rat: number; dog: number }): number {
    return floorTo(Math.min(noael.rat / SPECIES_HED_DIVISOR.rat, noael.dog / SPECIES_HED_DIVISOR.dog), 2);
  },
  /** HED → 경구 MRSD(mg) = HED ÷ 안전계수 × 60 kg(정수 내림). */
  mrsdOf(hedMgPerKg: number, safetyFactor: number): number {
    return Math.floor((hedMgPerKg / safetyFactor) * HUMAN_WEIGHT_KG + 1e-9);
  },

  /** 동물실험 묶음 결과(결정적). NOAEL 은 판정 재료에서 거꾸로 — 경구 MRSD(안전계수 10)가 Dt⁻¹(T*) 가 되게. */
  study(input: PreclinicalInput, level: AnimalCountLevel): AnimalStudyResult {
    const u = seeded(input.seed);
    const sig = { herg: input.herg, hepatotoxicity: input.hepatotoxicity };
    const rk = this.riskMultiplier(sig);
    const sensitive = this.sensitiveSpecies(sig);
    const other: PreclinicalSpecies = sensitive === 'dog' ? 'rat' : 'dog';
    // 목표 HED = 경구 허용 최대 용량 × 10 ÷ 60 — 민감한 종의 NOAEL 은 내림(보수적으로).
    const rawOral = this.maxSafeDoseMg(sig, 'oral');
    const hedTarget = (rawOral * 10) / HUMAN_WEIGHT_KG;
    const noaelSensitive = Math.max(1, Math.floor(hedTarget * SPECIES_HED_DIVISOR[sensitive] + 1e-9));
    // 덜 민감한 종 — HED 가 1.4~2.0 배(올림)라 늘 더 높다.
    const noaelOther = Math.ceil(hedTarget * (1.4 + 0.6 * u('other')) * SPECIES_HED_DIVISOR[other]);
    const noael = sensitive === 'dog' ? { rat: noaelOther, dog: noaelSensitive } : { rat: noaelSensitive, dog: noaelOther };
    const hed = this.hedOf(noael);
    const safetyFactor = SAFETY_FACTOR[level];
    const mrsdOral = this.mrsdOf(hed, safetyFactor);
    // 다른 제형 — 같은 비율(실제 HED ÷ 목표 HED ≤ 1)로 줄이고 안전계수를 적용(내림). 경구는 학생 계산 칸과 같은 식.
    const ratio = Math.min(1, (hed * HUMAN_WEIGHT_KG) / 10 / rawOral);
    const mrsdMgByForm = {
      oral: mrsdOral,
      iv: Math.floor(this.maxSafeDoseMg(sig, 'iv') * ratio * (10 / safetyFactor) + 1e-9),
      transdermal: Math.floor(this.maxSafeDoseMg(sig, 'transdermal') * ratio * (10 / safetyFactor) + 1e-9),
    } satisfies Record<IndForm, number>;

    const model = preclinicalModelOf(input.targetId);
    const painGrade: PainGrade = model?.painGrade ?? 'C';
    const animalsUsed = ANIMALS_PER_CANDIDATE[level];
    const toxDog = Math.round(animalsUsed * STUDY_SPLIT.toxDog);
    const efficacyN = Math.round(animalsUsed * STUDY_SPLIT.efficacy);
    const ratN = animalsUsed - toxDog - (model?.species === 'rat' ? 0 : efficacyN);
    const animalsBySpecies = { rat: ratN, dog: toxDog, mouse: model?.species === 'rat' ? 0 : efficacyN };

    const A = G.absorptionOral[input.oralAbsorption];
    const B = input.cns ? G.bbb[input.bbb] : 1;
    const p = Math.min(1, Math.max(0, input.p));
    const efficacyVsReferencePct = Math.round((100 * (G.efficacy.base + G.efficacy.affinityWeight * p) * A * B) / (G.efficacy.base + G.efficacy.affinityWeight * G.referenceP));
    const fRange: Record<PreclinicalOral, [number, number]> = { good: [65, 85], moderate: [35, 55], poor: [8, 25] };
    const oralF = Math.round(between(u('f'), ...fRange[input.oralAbsorption], 0));
    const bpRange: Record<PreclinicalBbb, [number, number]> = { high: [0.8, 1.3], moderate: [0.3, 0.6], low: [0.05, 0.2] };
    const brainPlasmaRatio = input.cns ? between(u('bp'), ...bpRange[input.bbb], 2) : null;
    const findings: PreclinicalFinding[] = [];
    if (input.herg !== 'low') findings.push('qt');
    if (input.hepatotoxicity !== 'low') findings.push('liver');
    if (!input.cns && input.bbb === 'high') findings.push('cns');
    // 인도적 종료 — D 모델이면 기본이 높고, 위험이 큰 분자(Rk)일수록 많다(규칙).
    const rate = (painGrade === 'D' || painGrade === 'E' ? 0.02 : 0.005) + (rk - 1) * 0.05;
    const humaneEndpoints = Math.round(animalsUsed * rate);
    return {
      kind: 'animal_study',
      level,
      animalsUsed,
      pk: {
        oralBioavailabilityPct: oralF,
        brainPlasmaRatio,
        cmaxNgPerMl: Math.round(oralF * between(u('cmax'), 8, 14, 1)),
        halfLifeH: between(u('t12'), 3, 14, 1),
      },
      efficacyVsReferencePct,
      noaelMgPerKgDay: noael,
      hedMgPerKg: hed,
      safetyFactor,
      mrsdMgByForm,
      findings,
      painGrade,
      humaneEndpoints,
      sensitiveSpecies: sensitive,
      animalsBySpecies,
      targetId: input.targetId,
    };
  },

  /** 대체 시험 — 2.2 신호와 같은 재료로 굳힌 구간(새 판정을 만들지 않는다). */
  altAssay(input: PreclinicalInput, assay: AltAssay): AltAssayResult {
    const u = seeded(input.seed);
    const level = assay === 'herg' ? input.herg : input.hepatotoxicity;
    const band = level === 'moderate' ? 'medium' : level;
    if (assay === 'herg') {
      // IC50 이 낮을수록 강하게 막는다 — high < 1 µM · medium 1~10 µM · low > 10 µM.
      const range: Record<typeof band, [number, number]> = { high: [0.2, 0.9], medium: [1.5, 9], low: [12, 60] };
      return { kind: 'alt_assay', assay, band, value: between(u('herg'), ...range[band], 1), unit: 'µM' };
    }
    // 간 오가노이드 생존율(최고 농도) — high < 50% · medium 50~80% · low > 80%.
    const range: Record<typeof band, [number, number]> = { high: [22, 48], medium: [55, 78], low: [84, 98] };
    return { kind: 'alt_assay', assay, band, value: Math.round(between(u('liver'), ...range[band], 0)), unit: '%' };
  },

  /** 학생 계산 칸 대조 — 칸마다 맞나(틀리면 그 칸을 짚는다). */
  checkCalc(result: Pick<AnimalStudyResult, 'noaelMgPerKgDay' | 'hedMgPerKg' | 'mrsdMgByForm' | 'safetyFactor'>, answers: PreclinicalCalcAnswers): PreclinicalCalcCheck {
    const near = (value: number | null | undefined, expected: number, abs: number) =>
      typeof value === 'number' && Number.isFinite(value) && Math.abs(value - expected) <= Math.max(abs, Math.abs(expected) * CALC_TOLERANCE.relative);
    const expected = {
      hedRat: result.noaelMgPerKgDay.rat / SPECIES_HED_DIVISOR.rat,
      hedDog: result.noaelMgPerKgDay.dog / SPECIES_HED_DIVISOR.dog,
      hed: result.hedMgPerKg,
      mrsd: result.mrsdMgByForm.oral,
    };
    const fields = {
      hedRat: near(answers.hedRat, expected.hedRat, CALC_TOLERANCE.hedAbs),
      hedDog: near(answers.hedDog, expected.hedDog, CALC_TOLERANCE.hedAbs),
      hed: near(answers.hed, expected.hed, CALC_TOLERANCE.hedAbs),
      mrsd: near(answers.mrsd, expected.mrsd, CALC_TOLERANCE.mrsdAbs),
    };
    return { ok: Object.values(fields).every(Boolean), fields };
  },

  /** 계획서 규칙 검사(심의 1단계 — 숫자 · 형식 · 상한은 규칙만). 화면도 같은 함수로 미리 보여 준다. */
  iacucRules(input: IacucRuleInput): RuleFinding[] {
    const C = PRECLINICAL_COPY.rules;
    const out: RuleFinding[] = [];
    out.push(input.patentCount > 0 ? { id: 'r_patents', status: 'ok', note: C.patentsOk, section: 'reduction' } : { id: 'r_patents', status: 'fail', note: C.patentsFail, section: 'reduction' });
    out.push(input.level === 'high' ? { id: 'r_level', status: 'fail', note: C.levelHigh, section: 'reduction' } : { id: 'r_level', status: 'ok', note: C.levelOk, section: 'reduction' });
    if (!input.painGrade) out.push({ id: 'r_pain', status: 'fail', note: C.painMissing, section: 'refinement' });
    else if (input.modelGrade && input.painGrade !== input.modelGrade) out.push({ id: 'r_pain', status: 'fail', note: C.painMismatch, section: 'refinement' });
    else out.push({ id: 'r_pain', status: 'ok', note: C.painOk, section: 'refinement' });
    const ep = input.endpointPct;
    out.push(
      ep === null || !Number.isInteger(ep) || ep < ENDPOINT_PCT_RANGE.min || ep > ENDPOINT_PCT_RANGE.max
        ? { id: 'r_endpoint', status: 'fail', note: C.endpointMissing, section: 'refinement' }
        : { id: 'r_endpoint', status: 'ok', note: C.endpointOk, section: 'refinement' },
    );
    out.push(input.trainedPerformers > 0 ? { id: 'r_performers', status: 'ok', note: C.performersOk, section: 'performers' } : { id: 'r_performers', status: 'fail', note: C.performersFail, section: 'performers' });
    for (const s of IACUC_SECTIONS) {
      const body = (input.sections[s.key] ?? '').trim();
      if (Array.from(body).length < IACUC_SECTION_MIN) out.push({ id: `r_${s.key}`, status: 'fail', note: `${s.label} — ${C.sectionEmpty}`, section: s.key });
    }
    return out;
  },

  /** ⑤ 근거 칩 판정 — 결과판 숫자와 대조(막음이면 서버도 400 reason_blocked). */
  leadReasonVerdict(reason: string, lead: AnimalStudyResult, all: AnimalStudyResult[], cns: boolean): ReasonVerdict {
    const C = PRECLINICAL_COPY.chips;
    switch (reason) {
      case 'start_dose_room': {
        const best = Math.max(...all.map((r) => r.mrsdMgByForm.oral), lead.mrsdMgByForm.oral);
        return lead.mrsdMgByForm.oral >= best ? reasonOk(C.startDoseOk(lead.mrsdMgByForm.oral)) : reasonWarn(C.startDoseWarn(lead.mrsdMgByForm.oral));
      }
      case 'efficacy_like_ref':
        return lead.efficacyVsReferencePct >= EFFICACY_CHIP_MIN_PCT ? reasonOk(C.efficacyOk) : reasonBlock(C.efficacyBlock);
      case 'no_heart':
        return lead.findings.includes('qt') ? reasonBlock(C.heartBlock) : reasonOk(C.heartOk);
      case 'no_liver':
        return lead.findings.includes('liver') ? reasonBlock(C.liverBlock) : reasonOk(C.liverOk);
      case 'brain_reach':
        if (!cns) return reasonBlock(C.brainNotCns);
        return (lead.pk.brainPlasmaRatio ?? 0) >= BRAIN_PLASMA_HIGH_MIN ? reasonOk(C.brainOk) : reasonBlock(C.brainBlock);
      default:
        return reasonBlock(C.unknown);
    }
  },
} as const;

// ── ① 윤리 카드 · 확인 문제(사실 · 숫자 · 출처는 설계 §5.9 그대로 — 문구는 §5.12) ──

export interface EthicsCard {
  id: string;
  title: string;
  body: string[];
  source: string;
}

export interface EthicsQuestion {
  id: 'q1' | 'q2' | 'q3';
  prompt: string;
  options: Array<{ id: string; label: string }>;
  /** 채점 뒤 보이는 풀이 — 맞으면 ok, 틀리면 wrong(정답을 바로 말하지 않고 카드로 돌려보낸다). */
  explain: { ok: string; wrong: string };
}

export type EthicsAnswers = Partial<Record<EthicsQuestion['id'], string>>;

// ── ② 동물실험계획서 ──

export type IacucSectionKey = 'purpose' | 'replacement' | 'reduction' | 'refinement' | 'species';
export interface IacucSectionMeta {
  key: IacucSectionKey;
  label: string;
  guide: string;
  /** 칸 예시(빈 칸에 흐리게 보이는 글). */
  example: string;
  /** 서버가 채우는 것(화면 안내). */
  serverFills: string;
}
/** 칸 최소 글자 — 비면 규칙 보완(내용 질은 LLM). */
export const IACUC_SECTION_MIN = 10;

export interface IacucRuleInput {
  patentCount: number;
  level: AnimalCountLevel;
  painGrade: PainGrade | null;
  modelGrade: PainGrade | null;
  endpointPct: number | null;
  /** 고른 수행자 중 교육을 이수한 사람 수. */
  trainedPerformers: number;
  sections: Record<string, string>;
}

/** 승인 스냅숏(iacuc_protocols.approved_snapshot) — 이 판의 후보 · 수준대로만 실행한다. */
export interface IacucSnapshot {
  version: number;
  level: AnimalCountLevel;
  patentIds: string[];
  painGrade: PainGrade | null;
  endpointPct: number | null;
  performerIds: string[];
}

// ── ⑤ 근거 칩 · 계산 칸 ──

export type PreclinicalLeadReason = 'start_dose_room' | 'efficacy_like_ref' | 'no_heart' | 'no_liver' | 'brain_reach';
export const PRECLINICAL_LEAD_REASONS: readonly PreclinicalLeadReason[] = ['start_dose_room', 'efficacy_like_ref', 'no_heart', 'no_liver', 'brain_reach'];

export interface PreclinicalCalcAnswers {
  hedRat: number | null;
  hedDog: number | null;
  hed: number | null;
  mrsd: number | null;
}
export interface PreclinicalCalcCheck {
  ok: boolean;
  fields: Record<keyof PreclinicalCalcAnswers, boolean>;
}

// ── 화면 · API 모양 ──

export interface PreclinicalPatentView {
  id: string;
  codeName: string;
  patentNo: string;
  /** 계획서(지금 칸)에 넣었나 · 승인된 판에 있나. */
  inDraft: boolean;
  inApproved: boolean;
  /** 2.2 예측 신호(실행 기록이 있으면) — 대체 시험 결과와 견주는 칸. */
  predicted: { herg: PreclinicalRisk; hepatotoxicity: PreclinicalRisk } | null;
}

export interface PreclinicalRunView {
  jobId: string;
  patentId: string;
  codeName: string;
  kind: 'animal_study' | 'alt_assay';
  designKey: string;
  level: AnimalCountLevel | null;
  assay: AltAssay | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progressPct: number;
  startGameDay: number;
  endsGameDay: number;
  byName: string | null;
  avatar: Avatar | null;
  costCents: number;
  result: PreclinicalJobResult | null;
  /** 동물실험 — 학생 계산 칸(맞으면 3.3 신청서에 붙는다). */
  calc: { ok: boolean; answers: PreclinicalCalcAnswers; byName: string | null } | null;
}

export interface PreclinicalProtocolView {
  id: string;
  status: IacucStatus;
  /** 서류 판(칸 · 설정을 바꿀 때마다 +1) — 심사는 이 판을 고정한다. */
  version: number;
  /** 설정(후보 · 수준 · 고통등급 · 종료시점 · 수행자) 낙관적 잠금 판. */
  settingsVersion: number;
  level: AnimalCountLevel;
  patentIds: string[];
  painGrade: PainGrade | null;
  endpointPct: number | null;
  performerIds: string[];
  sections: DocSectionView[];
  review: DocReviewView | null;
  approved: (IacucSnapshot & { at: string }) | null;
  /** 승인 뒤 칸 · 설정이 바뀌었나(변경 심의 필요). */
  changedSinceApproval: boolean;
  /** 지금 칸으로 본 규칙 결과(심사 전 미리 보기). */
  ruleFindings: RuleFinding[];
}

export interface PreclinicalMemberView {
  userId: string;
  displayName: string;
  avatar: Avatar | null;
  trainedAt: string | null;
}

export interface PreclinicalReportRow {
  patentId: string;
  codeName: string;
  animalsUsed: number;
  painGrade: PainGrade | null;
  humaneEndpoints: number;
  /** 대체 시험만 하고 동물실험 계획에서 뺀 후보 — 덜 쓴 동물 수. */
  animalsSaved: number;
  excludedByAlt: boolean;
}

export interface PreclinicalResponse {
  revisionId: string;
  targetId: string | null;
  cns: boolean;
  model: PreclinicalModel | null;
  gameDay: number;
  /** 3.1 유효 특허가 있어야 실행 · 계획서 후보 고르기가 된다. */
  unlocked: boolean;
  members: PreclinicalMemberView[];
  meTrained: boolean;
  patents: PreclinicalPatentView[];
  protocol: PreclinicalProtocolView | null;
  runs: PreclinicalRunView[];
  lead: {
    leadPatentId: string | null;
    backupPatentId: string | null;
    reason: PreclinicalLeadReason | null;
    version: number;
    setByName: string | null;
  };
  report: {
    rows: PreclinicalReportRow[];
    totalAnimals: number;
    totalHumane: number;
    totalSaved: number;
    reflection: { body: string; version: number; byName: string | null };
  };
  fees: { altCents: number; animalCents: number };
}

export interface PreclinicalSettingsRequest {
  expectedVersion: number;
  level?: AnimalCountLevel;
  patentIds?: string[];
  painGrade?: PainGrade | null;
  endpointPct?: number | null;
  performerIds?: string[];
}

export interface PreclinicalRunRequest {
  requestId: string;
  patentId: string;
  kind: 'animal_study' | 'alt_assay';
  assay?: AltAssay;
}
export interface PreclinicalRunResponse {
  run: PreclinicalRunView;
  /** 새로 만들었나(false = 같은 요청 · 같은 (특허 · 설계)의 옛 결과 — 과금 없음). */
  created: boolean;
  charged: boolean;
}

export interface PreclinicalLeadRequest {
  leadPatentId: string;
  backupPatentId: string | null;
  reason: PreclinicalLeadReason;
  expectedVersion: number;
}

export interface PreclinicalTeacherView {
  classId: string;
  totalAnimals: number;
  totalHumane: number;
  totalSaved: number;
  altAssays: number;
  teams: Array<{ teamId: string; startupName: string | null; ticker: string | null; animals: number; humane: number; saved: number; studies: number; altAssays: number; approved: boolean }>;
}

export const PRECLINICAL_API = {
  state: '/api/preclinical',
  ethics: '/api/preclinical/ethics',
  settings: '/api/preclinical/protocol',
  section: (section: string) => `/api/preclinical/protocol/sections/${section}`,
  review: '/api/preclinical/protocol/review',
  runs: '/api/preclinical/runs',
  calc: (jobId: string) => `/api/preclinical/runs/${jobId}/calc`,
  /** 주력 · 백업 — 3판 규칙(유효 특허 + 동물실험 완료 · 서로 다름 · 낙관적 잠금). W3 경로를 그대로 쓴다. */
  lead: '/api/program/lead',
  reflection: '/api/preclinical/report/reflection',
  teacher: (classId: string) => `/api/teacher/classes/${classId}/preclinical`,
} as const;

// ── 학생에게 보이는 글(§5.12 — Gemini 4 Argon (High) 초안 `.review/2026-10-24-copy-3.2/copy.md` 를 반영). 숫자 · 규칙 값은 위 상수에서 끼워 넣는다 ──
// 윤리 카드의 사실 · 숫자 · 출처는 설계 §5.9 ① 표 그대로다(풀이 괄호만 더했다).

const SF = SAFETY_FACTOR;
const N = ANIMALS_PER_CANDIDATE;

export const PRECLINICAL_COPY = {
  steps: {
    ethics: { no: '①', label: '윤리 배우기' },
    protocol: { no: '②', label: '계획서 심의' },
    alt: { no: '③', label: '대체 시험' },
    animal: { no: '④', label: '동물실험' },
    pick: { no: '⑤', label: '한 번 더 고르기' },
  },
  ethicsCards: [
    {
      id: 'why',
      title: '1. 왜 동물에서 먼저 보나',
      body: [
        "사람에게 새 약을 처음 주기 전에 '얼마까지 안전한가'를 재는 관문이에요.",
        '저분자 신약(분자 크기가 작은 합성 신약)은 보통 설치류(생쥐 · 랫드 같은 동물) 1종과 비설치류(비글견 같은 동물) 1종에서 반복투여 독성을 봐요.',
        '반복투여 독성은 일정 기간 약을 거듭 주면서 독성을 살피는 시험이에요.',
        '심장 · 중추신경 · 호흡에 해가 없는지 보는 안전성약리도 함께 봐요.',
      ],
      source: 'ICH M3(R2) · S7A · S7B',
    },
    {
      id: '3r',
      title: '2. 3R 원칙',
      body: [
        '대체(Replacement)는 동물 없이 답할 수 있으면 세포 · 오가노이드(세포를 입체로 키운 작은 장기 모형) · 컴퓨터 방법을 먼저 쓰는 원칙이에요.',
        '감소(Reduction)는 동물을 필요한 최소 마릿수만 쓰는 원칙이에요. 단, 통계적으로 믿을 수 있을 만큼은 써야 해요.',
        '개선(Refinement)은 마취 · 진통 · 알맞은 사육 환경 · 인도적 종료시점(미리 정한 기준에 닿으면 실험을 끝내는 시점)으로 고통을 줄이는 원칙이에요.',
        '1959년 Russell 과 Burch 가 제안했어요. 동물보호법 제47조(동물실험의 원칙)도 같은 내용을 적고 있어요.',
      ],
      source: 'Russell & Burch(1959) · 동물보호법 제47조',
    },
    {
      id: 'pain',
      title: '3. 고통등급 A~E',
      body: [
        'A등급은 생물개체를 쓰지 않거나 무척추동물을 쓰는 실험이에요.',
        'B등급은 척추동물을 쓰지만 고통이 거의 없는 실험이에요.',
        'C등급은 약간의 스트레스나 짧고 작은 통증이 따르는 실험이에요.',
        'D등급은 피할 수 없는 고통이 따르고, 진정제 · 진통제 · 마취제를 쓰는 실험이에요.',
        'E등급은 피할 수 없는 고통이 따르는데, 약을 쓰면 결과가 망가져 약을 쓸 수 없는 실험이에요.',
        'D등급은 고통 경감 조치가 반드시 있어야 해요. E등급은 원칙적으로 허용하지 않고, 경감할 수 없는 분명한 사유가 있어야 해요.',
      ],
      source: 'IACUC 표준운영가이드라인',
    },
    {
      id: 'endpoint',
      title: '4. 인도적 종료시점',
      body: [
        '동물의 상태가 미리 정한 기준에 닿으면, 실험 기간이 남았더라도 실험을 끝내요.',
        '예: 정상 체중의 20% 이상 감소 · 종양이 체중의 10% 초과 · 먹지 못함 · 마비.',
      ],
      source: 'IACUC 표준운영가이드라인(예)',
    },
    {
      id: 'numbers',
      title: '5. 숫자와 바뀌는 흐름',
      body: [
        '2024년 국내 실험동물은 4,592,958마리였고, 마우스가 81.5%, 고통등급 D · E가 80.1%였어요.',
        '동물에서 안전 · 유효해 보인 약의 90% 이상이 사람에서 허가받지 못해요.',
        '그래서 미국의 FDA 현대화법 2.0(2022)이 비동물 방법을 IND(임상시험 계획 승인 신청) 근거로 인정했어요.',
        "FDA(미국 식품의약국)는 2025-04 로드맵과 2026-09 규정 개정으로 '동물 시험'을 '비임상 시험'이라 부르기 시작했어요.",
        '동물실험을 금지한 것은 아니에요. 더 나은 방법이 있으면 그것을 쓰라는 뜻이에요.',
      ],
      source: '농림축산검역본부 2024 실태조사 · FDA 2025 로드맵',
    },
  ] satisfies readonly EthicsCard[],
  ethicsQuiz: [
    {
      id: 'q1',
      prompt: "'동물실험 전에 세포로 hERG(심장 박동 리듬에 관여하는 칼륨 통로)를 먼저 쟀다' — 이 사례는 3R 중 무엇에 해당할까요?",
      options: [
        { id: 'replacement', label: '대체(Replacement)' },
        { id: 'reduction', label: '감소(Reduction)' },
        { id: 'refinement', label: '개선(Refinement)' },
      ],
      explain: {
        ok: '정답이에요. 동물 없이 세포 · 오가노이드 · 컴퓨터로 먼저 답을 확인하는 방법은 대체(Replacement)예요.',
        wrong: "아쉽게도 틀렸어요. 동물을 쓰지 않고 세포 실험으로 먼저 위험을 확인한 사례예요. 윤리 카드 2번에서 '동물 없이 답할 수 있으면 그 방법을 먼저 쓰는 원칙'을 다시 찾아봐요.",
      },
    },
    {
      id: 'q2',
      prompt: '폐암 세포를 이식한 누드마우스(면역이 약해 사람 암세포가 자랄 수 있는 털 없는 생쥐)에서 종양이 자라며 피할 수 없는 고통이 생겨 진통제를 써요. 이 실험의 고통등급은 무엇일까요?',
      options: [
        { id: 'B', label: 'B등급 — 거의 고통 없음' },
        { id: 'C', label: 'C등급 — 약간의 스트레스 · 짧은 작은 통증' },
        { id: 'D', label: 'D등급 — 피할 수 없는 고통(진정 · 진통 · 마취제를 씀)' },
        { id: 'E', label: 'E등급 — 피할 수 없는 고통이고 약을 쓰면 결과가 망가지는 실험' },
      ],
      explain: {
        ok: '정답이에요. 피할 수 없는 고통이 따르지만 진정제 · 진통제 · 마취제로 고통을 줄여 주는 실험은 D등급이에요.',
        wrong: '아쉽게도 틀렸어요. 종양이 자라 피할 수 없는 고통이 생기지만, 진통제를 써서 고통을 덜어 주고 있어요. 윤리 카드 3번에서 고통 경감 조치를 함께 쓰는 등급을 확인해 봐요.',
      },
    },
    {
      id: 'q3',
      prompt: "실험을 시작하기 전에 미리 정해 둘 '인도적 종료시점'으로 알맞은 것은 무엇일까요?",
      options: [
        { id: 'weight20', label: '정상 체중의 20% 이상 감소' },
        { id: 'until_end', label: '정해진 실험 기간이 끝날 때까지 지켜본다' },
        { id: 'death', label: '동물이 스스로 죽을 때까지 기다린다' },
      ],
      explain: {
        ok: "정답이에요. '정상 체중의 20% 이상 감소'처럼 잴 수 있는 기준을 미리 정해 둬요. 그 기준에 닿으면 실험 기간이 남아도 실험을 끝내요.",
        wrong: '아쉽게도 틀렸어요. 인도적 종료시점은 동물이 극심한 고통을 겪거나 죽기 전에 실험을 멈추려고 정하는 기준이에요. 윤리 카드 4번의 예시를 다시 확인해 봐요.',
      },
    },
  ] satisfies readonly EthicsQuestion[],
  ethics: {
    whoNeeds: '동물실험 실행 단추를 누르는 사람만 교육 이수가 필요해요(동물보호법 제47조 ③ — 실험은 윤리적 취급과 과학적 사용의 지식을 갖춘 사람이 해요). 윤리 카드 읽기, 계획서 쓰기, 결과 보기는 모둠원 누구나 할 수 있어요.',
    retry: '확인 문제는 횟수 제한 없이 다시 풀 수 있어요. 모둠원 중 한 명만 이수해도 우리 모둠이 동물실험을 진행할 수 있어요.',
    passed: '실험 수행자 윤리 교육을 이수했어요. 모둠 공유 섬에 내 이수 도장이 찍혔고, 이제 계획서의 실험 수행자로 뽑힐 수 있어요. 계획서가 승인되면 동물실험 실행 단추를 누를 수 있어요.',
    wrong: '아직 틀린 문제가 있어요. 윤리 카드 5장을 다시 읽고 확인 문제를 다시 풀어 봐요.',
    dilemma: `동물 수를 절반 가까이 줄이면('적게', 후보당 ${N.low}마리) 자료가 부족해 안전계수(동물 자료를 사람에게 옮길 때 불확실한 만큼 나누는 수)가 ${SF.standard}에서 ${SF.low}으로 올라가요. 그러면 사람 임상 1상의 시작 용량 상한(MRSD)을 절반으로 낮춰 잡아야 해요. 동물을 덜 쓰는 것과, 사람에게 쓸 시작 용량을 넉넉히 확보하는 것 가운데 어느 쪽이 더 윤리적일까요?`,
  },
  sections: [
    {
      key: 'purpose',
      label: '목적 · 필요성',
      guide: `사람에게 투여하기 전에 왜 동물에서 약동학(몸 안에서 약이 흡수 · 분포 · 대사 · 배설되는 과정) · 효력 · 독성을 먼저 확인해야 하는지 써요. IND(임상시험 계획 승인 신청) 근거와 이어서 2~3줄(${IACUC_SECTION_MIN}자 이상)로 써요.`,
      example: '예시: 특허받은 분자를 사람에게 처음 주기 전에, 동물에서 반복투여 독성 시험으로 NOAEL(부작용이 보이지 않은 가장 높은 용량)을 구하고 질환 모델 효력을 확인해요. 이 값으로 임상 1상 시작 용량의 상한(MRSD)을 정하고, IND 신청의 비임상 근거를 마련하려고 해요.',
      serverFills: '특허 분자 목록(코드명)',
    },
    {
      key: 'replacement',
      label: '대체(Replacement)',
      guide: `③ 대체 시험을 먼저 했는지, 무엇을 동물 없이 확인했는지, 왜 세포 · 컴퓨터 방법만으로 동물을 완전히 대체할 수 없는지 구체적으로 써요(${IACUC_SECTION_MIN}자 이상). '법이라서'만 적으면 보완이 나와요.`,
      example: '예시: 세포 시험으로 hERG 칼륨 통로 억제와 간세포 독성을 먼저 확인해 위험한 후보를 걸러냈어요. 하지만 온몸에서 일어나는 약동학(흡수 · 분포 · 대사 · 배설)과 28일 반복투여 독성은 세포만으로 알 수 없어요. 그래서 남은 후보는 동물실험이 필요해요.',
      serverFills: '③ 대체 시험 결과',
    },
    {
      key: 'reduction',
      label: '감소(Reduction)',
      guide: `특허 분자 중 실험에 넣을 후보와 군당 마릿수 수준(적게 · 알맞게 · 많이)을 고른 과학적 · 윤리적 근거를 써요(${IACUC_SECTION_MIN}자 이상).`,
      example: `예시: 대체 시험에서 독성 위험이 낮게 나온 후보만 넣었어요. 군당 마릿수는 결과를 믿을 수 있으면서 안전계수를 기본값 ${SF.standard}으로 유지할 수 있는 '알맞게'(후보당 ${N.standard}마리)로 정했어요.`,
      serverFills: '총 마릿수',
    },
    {
      key: 'refinement',
      label: '개선(Refinement)',
      guide: `마취 · 진통 · 사육 환경 개선 방법과 인도적 종료시점 기준을 적어요(${IACUC_SECTION_MIN}자 이상). 체중 감소 % 숫자(${ENDPOINT_PCT_RANGE.min}~${ENDPOINT_PCT_RANGE.max})와 효력 모델의 고통등급은 설정에서 골라요. 고통등급 D인 모델은 고통 경감 조치를 반드시 적어야 해요.`,
      example: '예시: 알맞은 사육 환경과 진통제 · 마취제로 고통을 줄여요. 체중이 정상 체중보다 20% 이상 줄면 바로 실험을 끝내는 인도적 종료시점을 지킬 거예요.',
      serverFills: '효력 모델 정답 고통등급',
    },
    {
      key: 'species',
      label: '종 · 이유',
      guide: `독성 시험에서 랫드(설치류)와 비글견(비설치류) 두 종을 함께 쓰는 이유를 한 줄(${IACUC_SECTION_MIN}자 이상)로 써요.`,
      example: '예시: 종마다 약을 대사하는 방식과 독성 반응이 달라요. 그래서 국제 지침(ICH M3(R2))대로 설치류인 랫드와 비설치류인 비글견 두 종에서 확인해요. 두 종 중 더 민감한 종을 기준으로 사람 시작 용량을 잡아요.',
      serverFills: '—',
    },
  ] satisfies readonly IacucSectionMeta[],
  levels: {
    low: { label: '적게', note: `동물 수는 줄지만 용량-반응 자료가 부족해 안전계수가 ${SF.standard}에서 ${SF.low}으로 올라가요(FDA 2005 MRSD 지침). 시작 용량 상한(MRSD)이 절반으로 줄어 3.3 에서 고를 수 있는 용량이 낮아져요.` },
    standard: { label: '알맞게', note: `결과를 믿을 수 있을 만큼 마릿수를 써요. 안전계수는 기본값 ${SF.standard}이에요.` },
    high: { label: '많이', note: `동물을 더 쓰지만 안전계수는 ${SF.high} 그대로라 더 얻는 것이 없어요. 윤리위원회 심의가 '근거 없는 과다'로 보완을 요구해요.` },
  } satisfies Record<AnimalCountLevel, { label: string; note: string }>,
  rules: {
    patentsOk: '동물실험에 넣을 특허 분자 후보를 골랐어요.',
    patentsFail: '동물실험에 넣을 특허 분자 후보를 하나 이상 골라야 해요.',
    levelOk: '군당 마릿수 수준이 감소 원칙 범위 안에 있어요.',
    levelHigh: `'많이'(후보당 ${N.high}마리)는 근거 없는 과다 사용이에요. 감소(Reduction) 원칙에 맞게 마릿수 수준을 줄여 주세요.`,
    painOk: '고른 고통등급이 효력 모델의 기준 등급과 맞아요.',
    painMissing: '효력 모델의 고통등급(A~E)을 골라야 해요.',
    painMismatch: '고른 고통등급이 효력 모델 표의 등급과 달라요. 효력 모델 표를 다시 확인해요.',
    endpointOk: '인도적 종료시점(체중 감소 %) 숫자를 범위 안으로 적었어요.',
    endpointMissing: `인도적 종료시점(체중 감소 %) 숫자 칸을 ${ENDPOINT_PCT_RANGE.min}~${ENDPOINT_PCT_RANGE.max} 사이의 정수로 채워야 해요.`,
    performersOk: '윤리 교육을 이수한 실험 수행자가 지정되어 있어요.',
    performersFail: '① 윤리 배우기를 이수한 실험 수행자를 1명 이상 골라야 해요.',
    sectionEmpty: `${IACUC_SECTION_MIN}자 이상 적어야 해요.`,
  },
  /** LLM 심사관이 보는 칸별 기준(학생 화면에는 칸 안내로 보인다) — 바꾸면 IACUC_REVIEWER_VERSION 을 올린다. */
  checklist: [
    { id: 'c_purpose', section: 'purpose', criterion: '목적이 IND(임상시험 계획 승인 신청)의 근거 — 사람 첫 용량의 안전 상한을 정하는 일 — 과 이어지나' },
    { id: 'c_replacement', section: 'replacement', criterion: "동물을 완전히 대체할 수 없는 이유가 구체적인가('법이라서'만이면 unclear)" },
    { id: 'c_reduction', section: 'reduction', criterion: '고른 후보와 마릿수 수준의 근거를 서술했나' },
    { id: 'c_refinement', section: 'refinement', criterion: '마취 · 진통 · 종료시점을 적었나, 고통등급 D 면 고통 경감 조치를 적었나' },
    { id: 'c_species', section: 'species', criterion: '설치류 + 비설치류 두 종이 필요한 이유를 이해했나' },
  ] satisfies readonly ReviewChecklistItem[],
  chips: {
    labels: {
      start_dose_room: '시작 용량을 넉넉히 잡을 수 있어요',
      efficacy_like_ref: '질환 모델에서 기준 약만큼 들어요',
      no_heart: '심장 소견이 없어요',
      no_liver: '간 소견이 없어요',
      brain_reach: '뇌까지 잘 가요',
    } satisfies Record<PreclinicalLeadReason, string>,
    startDoseOk: (mrsd: number) => `맞음: 경구 MRSD(${mrsd} mg)가 동물실험 후보 중 1위예요. 시작 용량을 가장 넉넉히 잡을 수 있어요.`,
    startDoseWarn: (mrsd: number) => `주의: 경구 MRSD(${mrsd} mg)가 후보 중 1위가 아니에요. 시작 용량 여유가 더 큰 후보가 있는지 확인해 봐요.`,
    efficacyOk: `맞음: 질환 모델 효력이 기준 약의 ${EFFICACY_CHIP_MIN_PCT}% 이상이에요.`,
    efficacyBlock: `막음: 질환 모델 효력이 기준 약의 ${EFFICACY_CHIP_MIN_PCT}%에 못 미쳐요. 이 근거로는 주력을 고를 수 없어요.`,
    heartOk: '맞음: 심전도 QT 연장 소견이 없어요.',
    heartBlock: '막음: 심전도 QT 연장 소견이 있어요. 이 근거로는 주력을 고를 수 없어요.',
    liverOk: '맞음: 간 수치 상승 소견이 없어요.',
    liverBlock: '막음: 간 수치 상승 소견이 있어요. 이 근거로는 주력을 고를 수 없어요.',
    brainOk: `맞음: 뇌/혈장 비가 ${BRAIN_PLASMA_HIGH_MIN} 이상이어서 뇌까지 잘 도달해요.`,
    brainBlock: `막음: 뇌/혈장 비가 ${BRAIN_PLASMA_HIGH_MIN} 미만이에요. 이 근거로는 주력을 고를 수 없어요.`,
    brainNotCns: '이 근거는 CNS(중추신경계) 표적에만 써요.',
    unknown: '고를 수 없는 근거예요.',
  },
  findings: { liver: '간 수치 상승', qt: 'QT 연장', cns: '행동 변화(중추)' } satisfies Record<PreclinicalFinding, string>,
  species: { rat: '랫드', dog: '비글견' } satisfies Record<PreclinicalSpecies, string>,
  bands: { low: '낮음', medium: '보통', high: '높음' } as Record<'low' | 'medium' | 'high', string>,
  risk: { low: '낮음', moderate: '보통', high: '높음' } satisfies Record<PreclinicalRisk, string>,
  assays: {
    herg: {
      label: 'hERG 패치클램프(세포 시험)',
      sees: '심장 칼륨 통로를 얼마나 막나',
      value: 'IC50',
      desc: '심장 박동 리듬에 관여하는 칼륨 통로(hERG)를 약이 얼마나 막는지 패치클램프(세포막 이온 통로 전류를 재는 실험)로 재요. 결과는 IC50(통로 기능을 절반으로 막는 농도, µM)과 위험 구간(낮음 · 보통 · 높음)이에요. IC50 이 낮을수록 적은 양으로도 통로를 막으니 위험이 커요. 2.2 단계의 hERG 신호와 같은 재료(염기성 아민 · cLogP(기름에 잘 녹는 정도))로 정해져요.',
    },
    liver: {
      label: '사람 간세포 · 간 오가노이드 독성 시험',
      sees: '간세포 손상',
      value: '세포 생존율',
      desc: '사람 간세포와 간 오가노이드(사람 세포로 키운 작은 간 모형)에서 간세포 손상이 생기는지 확인해요. 결과는 세포 생존율(%)과 독성 위험 구간(낮음 · 보통 · 높음)이에요. 생존율이 낮을수록 간 독성 위험이 커요. 2.2 단계의 간독성 신호와 같은 재료로 정해져요.',
    },
  } satisfies Record<AltAssay, { label: string; sees: string; value: string; desc: string }>,
  status: { draft: '초안', reviewing: '심의 중', revise: '보완 요구', approved: '승인' } satisfies Record<IacucStatus, string>,
  /** 상태 한 줄 풀이(규칙 미리 보기 아래). */
  statusHint: {
    draft: '계획서 칸을 채우고 설정을 저장한 뒤 윤리위원회 심의를 요청해 봐요.',
    reviewing: '규칙 검사 뒤 AI 심사관(동물실험윤리위원회 역할)이 계획서를 읽고 있어요. 기다리는 동안 다른 칸이나 걸음을 먼저 살펴볼 수 있어요.',
    revise: '심의에서 짚은 보완 사항을 확인해요. 계획서를 고친 뒤 다시 심의를 요청해 주세요.',
    approved: '동물실험계획서가 승인되었어요. 승인된 계획서의 후보와 마릿수 수준대로 ④ 동물실험을 실행할 수 있어요.',
  } satisfies Record<IacucStatus, string>,
  calc: {
    intro: '동물 독성 시험에서 구한 NOAEL(부작용이 보이지 않은 가장 높은 용량)로 HED(사람 등가 용량, 동물 용량을 사람 몸 기준으로 바꾼 값)와 MRSD(사람 첫 투여의 최대 권장 시작 용량)를 직접 계산해 봐요. 모든 칸이 서버 값과 맞으면 3.3 신청서에 근거로 붙어요.',
    formula: [
      `1단계: 종별 HED(mg/kg) = NOAEL(mg/kg/일) ÷ 환산 계수(랫드 ${SPECIES_HED_DIVISOR.rat} · 비글견 ${SPECIES_HED_DIVISOR.dog})`,
      '2단계: 두 종 중 더 낮은 HED(가장 민감한 종)를 골라요.',
      `3단계: MRSD(mg) = 더 낮은 HED(mg/kg) ÷ 안전계수(알맞게 · 많이 ${SF.standard} · 적게 ${SF.low}) × ${HUMAN_WEIGHT_KG} kg`,
      `예: 비글견 NOAEL 18 mg/kg/일 → HED 10 mg/kg → 안전계수 ${SF.standard}이면 경구 MRSD 약 60 mg('적게'여서 안전계수가 ${SF.low}이면 MRSD 30 mg)`,
    ],
    ok: (mrsd: number) => `모든 계산 칸이 서버 값과 맞아요. 구한 경구 MRSD(${mrsd} mg)가 3.3 신청서의 근거로 붙어요.`,
    wrong: (sf: number) => `틀린 칸이 있어요. 표시된 칸을 다시 계산해 봐요. 환산 계수(랫드 ${SPECIES_HED_DIVISOR.rat} · 비글견 ${SPECIES_HED_DIVISOR.dog}), 더 낮은 HED 고르기, 안전계수(${sf}), 사람 기준 체중(${HUMAN_WEIGHT_KG} kg)을 확인해요.`,
  },
  messages: {
    needPatent: '3.1 에서 유효 특허를 먼저 받아야 해요.',
    needEthics: '동물실험 실행 단추는 교육을 이수한 사람만 누를 수 있어요. 먼저 ① 윤리 배우기의 확인 문제를 풀어요.',
    needApproval: '승인된 계획서에 있는 후보만 실행할 수 있어요. 후보를 더하거나 마릿수 수준을 바꾸려면 변경 심의를 다시 받아요.',
    rerun: '같은 표적 버전 · 분자 · 설계는 언제나 같은 결과가 나와요. 다시 돌려도 결과는 바뀌지 않고 연구비와 동물만 더 들어서, 같은 설계로 다시 실행하면 과금 없이 옛 결과를 그대로 보여 줘요.',
    changed: '승인 뒤에 계획서가 바뀌었어요. 실행은 승인된 판대로 해요. 바꾼 내용은 변경 심의를 받아야 반영돼요.',
    reviewing: '규칙 검사 뒤 AI 심사관(동물실험윤리위원회 역할)이 계획서를 읽고 있어요. 다른 칸이나 걸음은 계속할 수 있어요.',
  },
  board: {
    headline: (ticker: string, codeName: string) => `◆ ${ticker} 전임상 완료 — ${codeName} IND 준비`,
  },
  ui: {
    loading: '불러오는 중…',
    retry: '다시 불러오기',
    doneWhen: '승인된 계획서 + 동물실험 1건 이상 + 주력 지정',
    tabSub: { trained: '이수', notTrained: '이수 전', runs: (n: number) => `${n}건`, chosen: '지정함', notChosen: '아직' },
    mine: {
      ethics: '내 작업대 — 윤리 카드 · 확인 문제',
      protocol: '내 작업대 — 계획서 칸 쓰기',
      alt: '내 작업대 — 대체 시험 고르기',
      animal: '내 작업대 — 동물실험 실행 · 계산 칸',
      pick: '내 작업대 — 결과판 해석 · 근거 칩',
    },
    team: {
      ethics: '모둠 공유 — 교육 이수 도장',
      protocol: '모둠 공유 — 계획서 설정 · 심의',
      alt: '모둠 공유 — 대체 시험 결과 · 덜 쓴 동물 수',
      animal: '모둠 공유 — 진행 시계 · 결과판',
      pick: '모둠 공유 — 주력 · 백업 · 종료보고서',
    },
    cards: '윤리 카드 5장',
    source: '출처',
    quiz: '확인 문제 3개',
    grade: '채점하기',
    trained: '이수',
    notTrained: '이수 전',
    myStamp: '내 교육 이수',
    stamps: '모둠원 교육 이수',
    think: '생각해 볼 거리',
    settings: '계획서 설정(모둠 공유)',
    settingsHint: '계획서 칸은 모둠원이 나눠 쓸 수 있어요. 후보 · 마릿수 수준 · 고통등급 · 종료시점 · 수행자 설정은 모둠이 함께 저장해요.',
    candidates: '넣을 후보(특허 분자)',
    level: '군당 마릿수 수준',
    perCandidate: '후보당',
    pain: '효력 모델 고통등급',
    endpoint: '인도적 종료시점 — 체중 감소 %',
    performers: '실험 수행자(① 윤리 배우기를 이수한 모둠원만 고를 수 있어요)',
    saveSettings: '설정 저장',
    serverFills: '서버가 채우는 것',
    model: '효력 모델',
    measures: '재는 것',
    modelEndpoint: '인도적 종료시점',
    modelGrade: '고통등급(제안)',
    rulesPreview: '규칙 미리 보기(심의 1단계)',
    requestReview: '윤리위원회 심의 요청',
    reviewFree: `무료 · 계획서 1건당 하루 ${REVIEW_LIMITS.perDocPerDay}회`,
    aiNotice: '규칙(후보 · 마릿수 수준 · 고통등급 · 종료시점 숫자 · 수행자 · 글자 수)은 서버가 먼저 판정해요. 그다음 AI 심사관(Claude)이 칸마다 빠진 것과 앞뒤가 안 맞는 곳을 봐요. AI 는 규칙 판정을 뒤집지 못해요.',
    review: '심의 결과',
    approvedSnap: '승인된 판',
    noProtocol: '아직 계획서가 없어요. 칸을 쓰거나 설정을 저장하면 만들어져요.',
    verdict: { pending: '심의 중', pass: '승인', revise: '보완 요구', reject: '거절' } as Record<'pending' | 'pass' | 'revise' | 'reject', string>,
    reviewPending: '심의 중 — AI 위원회가 계획서를 읽고 판정을 정리하고 있어요. 그동안 계획서는 잠기지 않아요.',
    feedback: 'AI 심사관의 종합 피드백',
    teacherNote: '선생님 메모',
    altNote: '대체 시험은 동물을 쓰지 않으며(0마리), 새로운 판정을 따로 만들지 않아요. 2.2 단계의 예측 신호를 실험 값으로 굳혀서 ② 계획서의 대체 칸 근거와 \'이 후보는 동물실험에서 빼자\'는 결정의 근거로 써요.',
    predicted: '2.2 예측',
    measured: '실험 값',
    run: '실행',
    running: '진행 중',
    done: '끝',
    saved: '대체 시험으로 덜 쓴 동물 수',
    savedHint: "대체 시험 결과를 보고 위험이 큰 후보를 동물실험에서 빼면, 그 후보에 쓰였을 마릿수만큼 '덜 쓴 동물 수'가 결과판과 종료보고서에 남아요.",
    notRun: '아직 안 했어요',
    gameDays: (n: number) => `${n}게임 일`,
    progress: (now: number, end: number) => `${formatGameDay(now)} / ${formatGameDay(end)}`,
    runAnimal: '동물실험 묶음 실행',
    runInfo: `승인된 계획서대로 특허 분자마다 4종 시험 묶음을 실행해요(후보당 적게 ${N.low} · 알맞게 ${N.standard} · 많이 ${N.high}마리). 후보끼리는 동시에 진행돼요.`,
    bundleTitle: '시험 묶음 4종(알맞게 기준)',
    bundle: [
      '약동학(PK, 몸 안에서 약이 흡수 · 분포 · 대사 · 배설되는 과정) — 랫드 6마리로 경구 생체이용률 F%(먹은 약 가운데 온몸 혈액에 들어가는 비율) · 최고 농도 · 반감기(혈액 속 약 농도가 절반으로 줄어드는 시간)를 봐요. CNS(중추신경계) 표적이면 뇌/혈장 비(혈액에 견준 뇌 속 약 농도의 비)도 봐요.',
      '효력(질환 모델) — 표적별 질환 모델에서 군당 8마리씩 3군(질환 대조 · 기준 약 · 후보), 모두 24마리로 기준 약 대비 효과(%)를 확인해요.',
      '반복투여 독성 28일 — 랫드 군당 10마리 × 4군(부형제 · 저 · 중 · 고) = 40마리, 비글견 군당 3마리 × 4군 = 12마리예요. 부형제군은 약 성분 없이 약을 녹이거나 섞는 물질만 주는 대조군이에요. 종별 NOAEL(mg/kg/일)과 주요 소견(간 수치 상승 · QT 연장(심전도에서 심실이 수축했다가 회복하는 시간이 길어지는 현상) 등)을 확인해요.',
      '안전성약리(심장 · 중추 · 호흡) — 별도 동물을 쓰지 않고 독성 시험 군에 함께 붙여요. 국제 지침(ICH M3(R2))이 동물 수를 줄이려고(감소) 권하는 방법이에요. QT 연장 여부와 행동 변화를 확인해요.',
    ],
    approvedOnly: '승인된 판에 있는 후보만 보여요.',
    resultBoard: '결과판 — 후보 열 × 지표 행',
    mrsdChart: '제형별 MRSD(사람 첫 투여의 최대 권장 시작 용량)',
    calc: 'NOAEL → HED → MRSD 계산 칸',
    calcStudy: '계산할 동물실험',
    calcFields: { hedRat: 'HED 랫드(mg/kg)', hedDog: 'HED 비글견(mg/kg)', hed: '더 낮은 HED — 가장 민감한 종(mg/kg)', mrsd: '경구 MRSD(mg)' },
    check: '맞춰 보기',
    metrics: {
      f: '경구 생체이용률 F',
      bp: '뇌/혈장 비',
      cmax: '최고 농도',
      t12: '반감기',
      eff: '효력(기준 약 대비)',
      noaelRat: 'NOAEL 랫드',
      noaelDog: 'NOAEL 비글견',
      hed: 'HED(가장 민감한 종)',
      sf: '안전계수',
      mrsd: 'MRSD',
      findings: '주요 소견',
      animals: '사용 마릿수',
      humane: '인도적 종료',
      excluded: '대체 시험으로 뺌',
    },
    noFindings: '없음',
    reasonLegend: '주력을 고른 근거',
    lead: '주력',
    backup: '백업(선택)',
    leadRule: "주력 1개와 백업 0~1개를 지정해요. 주력과 백업은 모두 '유효 특허 + 동물실험 완료' 분자만 고를 수 있고, 서로 다른 분자여야 해요. 백업은 주력이 임상에서 보류될 때 이어 갈 두 번째 후보예요.",
    none: '— 없음 —',
    choose: '— 고르기 —',
    setLead: '주력 · 백업 지정',
    current: '지금 지정',
    report: '동물실험 종료보고서(자동 작성)',
    reportTotal: (animals: number, humane: number, saved: number) => `모둠 합계 — 사용 ${animals}마리 · 인도적 종료 ${humane}마리 · 대체 시험으로 덜 쓴 ${saved}마리`,
    reportNote: '인도적 종료는 고통등급 D 모델에서 위험이 큰 분자일수록 많이 생겨요.',
    privacy: '사용한 동물 마릿수 · 계획서 · 실험 결과는 우리 모둠과 선생님만 볼 수 있어요(선생님 화면에는 윤리 토론 자료로 학급 합계가 보여요).',
    reflection: '회고 한 줄',
    reflectionGuide: `회고 한 줄(${PRECLINICAL_LIMITS.reflectionMax}자 이하): 이번 전임상에서 대체 시험과 마릿수 선택으로 줄일 수 있었던 동물 수와, 다음 실험에서 바꾸고 싶은 점을 적어 봐요.`,
    noStudy: '동물실험을 끝낸 후보가 아직 없어요. ④ 동물실험에서 먼저 실행해요.',
    forms: { oral: '경구', iv: '정맥', transdermal: '경피' } as Record<IndForm, string>,
    locked: '3.1 에서 유효 특허를 먼저 받아야 대체 시험과 동물실험이 열려요. 그 전에도 ① 윤리 카드를 읽고 ② 계획서 칸을 미리 써 둘 수 있어요.',
    quizNo: (n: number) => `${n}번 문제`,
    quizRight: '맞아요',
    quizWrong: '다시 생각해 봐요',
    sectionsTitle: '계획서 칸',
    unsaved: '저장하지 않은 바뀐 설정이 있어요.',
    docVersion: (n: number) => `판 ${n}`,
    animals: (n: number) => `${n}마리`,
    perCandidateTimes: (per: number, n: number) => `${per}마리 × ${n}`,
    cols: { candidate: '후보', assay: '시험', by: '담당', metric: '지표', pain: '고통등급', saved: '덜 씀' },
    noaelUnit: 'mg/kg/일',
    progressLabel: (code: string, pct: number) => `${code} 진행 ${pct}%`,
    checkMark: { ok: '맞음', bad: '틀림' },
    chartNote: '점선은 3.3 에서 고를 수 있는 용량(10 · 50 · 100 mg)이에요. 막대가 점선을 넘어야 그 용량을 시작 용량으로 쓸 수 있어요.',
    /** 계획서 칸마다 서버가 채운 값(설계 §5.9 ② '서버가 채우는 것'). */
    fills: {
      purpose: (codes: string) => `넣을 특허 분자: ${codes || '아직 없음'}`,
      replacement: (alt: string) => `③ 대체 시험 결과: ${alt || '아직 없음'}`,
      reduction: (per: number, n: number, total: number) => `총 마릿수: 후보당 ${per}마리 × ${n} = ${total}마리`,
      refinement: (grade: string) => `효력 모델 정답 고통등급: ${grade}`,
    },
    teamAnimals: (used: number, saved: number) => `모둠 합계 — 사용 ${used}마리 · 대체 시험으로 덜 쓴 ${saved}마리`,
  },
} as const;

/** 계획서 칸(순서대로). */
export const IACUC_SECTIONS: readonly IacucSectionMeta[] = PRECLINICAL_COPY.sections;
export const IACUC_CHECKLIST: readonly ReviewChecklistItem[] = PRECLINICAL_COPY.checklist;
