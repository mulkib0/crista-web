/**
 * 학습 연구비 규격(learning-grant-design · learning-grant-balance) — 기능 FLEARN.
 *
 * - 상수(보상 · 상한 · 틱 · Series A/B) · 순수 계산(점수 → 크리스타 · 배율 · 정량 70점 · 개념 문항 채점) · 화면 모양 · 경로(`LEARN_API`) · 학생 문구(`LEARN_COPY`).
 * - 문항 은행(정답 · 루브릭 · 모범 개요)은 서버만 든다(apps/server/src/features/learn-bank.ts) — 화면 묶음에 정답이 실리지 않게.
 * - 표: web.learn_* (0007 · 0015) · ledger kind learn_* · pitch_series_*. 서버 LLM 은 apps/server/src/llm.ts(task 'learn_grade').
 * - WS: 모둠 'learn.graded' · 'learn.stipend', 학급 'district.lights'(사옥 창문 불빛 — 켜진 수만).
 * - 원칙: 채점을 받지 않아도 다음 단계 진행을 막지 않는다. 금액은 LLM 이 정하지 않고 서버 규칙이 점수에서 계산한다.
 * - 학생에게 보이는 글은 `LEARN_COPY` 한곳(§5.12 — Gemini 4 Argon (High) 초안을 반영, 2026-10-24). 식별자 · 숫자 · 규칙 값은 그 밖에 둔다.
 */
import { formatCrista } from './money.ts';
import type { StepId } from './pipeline.ts';

export type LearnTier = 'concept' | 'intermediate' | 'advanced';
export type LearnItemKind = 'mc' | 'multi' | 'numeric' | 'text';
export type LearnTargetType = 'answer' | 'note' | 'pitch';
export type PitchRound = 'series_a' | 'series_b';
export const PITCH_ROUNDS: readonly PitchRound[] = ['series_a', 'series_b'];
export const LEARN_TIERS: readonly LearnTier[] = ['concept', 'intermediate', 'advanced'];

// ── 금액 · 상한(balance §2 · §3) ──

/** 문항당 최대 보상(크리스타 — balance §2.1). */
export const LEARN_REWARD_CRISTA: Record<LearnTier, number> = { concept: 25_000, intermediate: 75_000, advanced: 150_000 };
/** 단계마다 학생 한 명에게 주는 문항 수 — 개념 2 · 중급 1 · 심화 1. */
export const LEARN_ITEMS_PER_STEP: Record<LearnTier, number> = { concept: 2, intermediate: 1, advanced: 1 };
/** 모둠 단계당 문항 보상 상한 — 넘으면 연습 모드(practice: 채점 · 피드백만). */
export const LEARN_STEP_CAP_CRISTA = 800_000;
/** 힌트를 쓰면 그 문항 보상 상한 70%. */
export const LEARN_HINT_RATIO = 0.7;
/** 연구 노트 평가 — 단계당 200,000(분담 ×1.2 = 240,000). 문항 상한과 따로 센다. */
export const LEARN_NOTE_CRISTA = 200_000;
export const LEARN_NOTE_SHARED_MULTIPLIER = 1.2;
/** 기초 연구비 — 현실 10분마다 40,000 × m, 단계당 2틱. */
export const LEARN_TICK_CRISTA = 40_000;
export const LEARN_TICK_MINUTES = 10;
export const LEARN_TICKS_PER_STEP = 2;
/** 가동 도장 · 보호권 문턱. */
export const LEARN_ACTIVE_MIN_SCORE = 50;
export const LEARN_SHIELD_MIN_SCORE = 80;
export const LEARN_SHIELDS_MAX = 2;
/** 지급 문턱 — 이보다 낮으면 0. */
export const LEARN_PAY_MIN_SCORE = 30;
/** Series A/B 최대 · 바닥 30%. */
export const PITCH_MAX_CRISTA: Record<PitchRound, number> = { series_a: 15_000_000, series_b: 25_000_000 };
export const PITCH_FLOOR_RATIO = 0.3;
export const PITCH_QUANT_MAX = 70;
export const PITCH_QUAL_MAX = 30;

/** 글 길이(자 — 공백 포함). */
export const LEARN_TEXT_LIMITS = {
  intermediate: { min: 40, max: 400 },
  advanced: { min: 100, max: 800 },
  /** 투자 피치 — 설계 §2.4 · balance §3 '피치(200~500자)'. */
  pitch: { min: 200, max: 500 },
  appeal: { min: 4, max: 200 },
  /** 노트 평가를 받으려면 세 칸 합계가 이만큼은 돼야 한다. */
  noteTotalMin: 30,
} as const;

/** LLM 출력 길이(서버가 다시 자른다 — 설계 §4.2). */
export const LEARN_GRADE_LIMITS = { noteMax: 80, feedbackMax: 200 } as const;

/** 채점 프롬프트 판 — 루브릭 · 시스템 프롬프트 · 문체 단락을 바꾸면 올린다(캐시가 옛 채점을 돌려주지 않게). */
export const LEARN_GRADER_VERSION = 'learn-v3';

// ── 순수 계산 ──

/** 점수 → 크리스타(`score < 30 ? 0 : floor(max × score / 100)`). */
export const rewardFor = (maxCrista: number, score: number): number =>
  score < LEARN_PAY_MIN_SCORE ? 0 : Math.floor((maxCrista * Math.max(0, Math.min(100, score))) / 100);

/** 가속 배율 m = 1 + ρ + 0.1 × min(s, 5) — 소수 둘째 자리. */
export const stipendMultiplier = (ratio: number, streak: number): number =>
  Math.round((1 + Math.max(0, Math.min(1, ratio)) + 0.1 * Math.min(Math.max(0, streak), 5)) * 100) / 100;

/** 화면 · 정산에 쓰는 연속 단계 수 s — 이어 온 바탕 + (지금 단계 전원 가동이면 1). */
export const displayStreak = (streakBase: number, ratio: number): number => Math.min(9, Math.max(0, streakBase) + (ratio >= 1 ? 1 : 0));

/** 단계를 떠날 때 다음 바탕 — 전원 가동(또는 보호권)이면 +1, 아니면 한 칸만 식는다. */
export const nextStreakBase = (streakBase: number, full: boolean): number => (full ? Math.min(9, streakBase + 1) : Math.max(0, streakBase - 1));

/** 틱 한 번 · 단계 최대(2틱) 충전액. */
export const tickCrista = (multiplier: number): number => Math.floor(LEARN_TICK_CRISTA * multiplier);
export const stepStipendMax = (multiplier: number): number => tickCrista(multiplier) * LEARN_TICKS_PER_STEP;

/** 문항 최대 보상(힌트 쓰면 70%). */
export const itemMaxCrista = (tier: LearnTier, hintUsed: boolean): number =>
  hintUsed ? Math.floor(LEARN_REWARD_CRISTA[tier] * LEARN_HINT_RATIO) : LEARN_REWARD_CRISTA[tier];

/** 노트 분담 조건 — 3~4인 모둠은 서로 다른 3명, 2인 모둠은 2명(1인 모둠은 해당 없음). */
export const noteSharedNeeded = (teamSize: number): number | null => (teamSize >= 3 ? 3 : teamSize === 2 ? 2 : null);
export const noteMaxCrista = (distributed: boolean): number => Math.floor(LEARN_NOTE_CRISTA * (distributed ? LEARN_NOTE_SHARED_MULTIPLIER : 1));

/**
 * 투자 지급액 = floor(최대 × max(0.30, 종합 점수 / 100)). 정수로만 센다 — `25,000,000 × 0.57` 같은 부동소수 곱은 1 크리스타 모자라게 내려간다.
 */
export const pitchPayout = (round: PitchRound, totalScore: number): number => {
  const score = Math.max(Math.round(PITCH_FLOOR_RATIO * 100), Math.max(0, Math.min(100, Math.floor(totalScore))));
  return Math.floor((PITCH_MAX_CRISTA[round] * score) / 100);
};

/**
 * LLM 루브릭 → 점수(설계 §4.2): `round(100 × Σ(weight × credit) / Σ(weight))`. injection · off_topic 이면 0.
 * credit 은 'full' 1 · 'half' 0.5 · 'none' 0(구조화 출력은 문자열로 받는다).
 */
export type RubricCredit = 'full' | 'half' | 'none';
export const CREDIT_VALUE: Record<RubricCredit, number> = { full: 1, half: 0.5, none: 0 };
export type LearnFlag = 'off_topic' | 'too_short' | 'injection' | 'not_korean' | 'copied_prompt' | 'duplicate';
export const LEARN_LLM_FLAGS: readonly LearnFlag[] = ['off_topic', 'too_short', 'injection', 'not_korean', 'copied_prompt'];
/** 0점이 되는 플래그. */
export const ZERO_FLAGS: readonly LearnFlag[] = ['injection', 'off_topic', 'duplicate'];

export function rubricScore(
  rubric: ReadonlyArray<{ id: string; weight: number }>,
  credits: ReadonlyArray<{ id: string; credit: RubricCredit }>,
  flags: readonly string[] = [],
): number {
  if (flags.some((f) => (ZERO_FLAGS as readonly string[]).includes(f))) return 0;
  const total = rubric.reduce((sum, r) => sum + Math.max(0, r.weight), 0);
  if (total <= 0) return 0;
  const got = rubric.reduce((sum, r) => sum + Math.max(0, r.weight) * CREDIT_VALUE[credits.find((c) => c.id === r.id)?.credit ?? 'none'], 0);
  return Math.round((100 * got) / total);
}

/** 개념 문항 정답(서버만 든다). */
export type ConceptKey = { kind: 'mc'; correct: string } | { kind: 'multi'; correct: string[] } | { kind: 'numeric'; value: number; tolerance: number };

export interface LearnAnswerInput {
  /** mc · multi — 고른 보기 id. */
  choice?: string[];
  /** numeric. */
  value?: number;
  /** 서술형. */
  text?: string;
}

/**
 * 개념 문항 규칙 채점(순수 · 즉시) — mc 맞으면 100, multi 는 (맞은 고름 − 틀린 고름) / 정답 수 비율, numeric 은 허용 오차 안이면 100.
 */
export function gradeConcept(key: ConceptKey, answer: LearnAnswerInput): { score: number; correct: boolean } {
  if (key.kind === 'numeric') {
    const v = answer.value;
    const ok = typeof v === 'number' && Number.isFinite(v) && Math.abs(v - key.value) <= key.tolerance + 1e-9;
    return { score: ok ? 100 : 0, correct: ok };
  }
  const picked = [...new Set(answer.choice ?? [])];
  if (key.kind === 'mc') {
    const ok = picked.length === 1 && picked[0] === key.correct;
    return { score: ok ? 100 : 0, correct: ok };
  }
  const right = picked.filter((c) => key.correct.includes(c)).length;
  const wrong = picked.length - right;
  const score = key.correct.length === 0 ? 0 : Math.max(0, Math.round((100 * (right - wrong)) / key.correct.length));
  return { score, correct: right === key.correct.length && wrong === 0 };
}

// ── Series A/B 정량 70점(balance §3) — 순수 계산. 서버가 모둠 데이터에서 사실을 모아 넘긴다 ──

export interface QuantPart {
  key: string;
  /** 화면 이름(LEARN_COPY.quant 에서). */
  label: string;
  points: number;
  max: number;
  /** 근거 한 줄(숫자 · 사실). */
  detail: string;
}
export interface QuantBreakdown {
  round: PitchRound;
  parts: QuantPart[];
  total: number;
}

export type RiskWord = 'low' | 'moderate' | 'high';

export interface SeriesAFacts {
  /** 모둠 유효 인원(면제 · 나간 사람 제외 — 최소 1). */
  members: number;
  /** 1.1 표적 추천 또는 1.2 찜을 한 모둠원 수. */
  pickOrClaimMembers: number;
  /** 2.1 도킹을 서로 다른 분자로 올린 모둠원 수. */
  dockingMembers: number;
  /** 주력 리드의 결합력 p(0~1 — game-rules `affinityStrength`). 도킹 근거가 없으면 null. */
  leadStrength: number | null;
  leadDeltaG: number | null;
  plip: { hbond: number; pistack: number } | null;
  /** 주력 리드 물성 신호(모르면 null). */
  ro5Violations: number | null;
  herg: RiskWord | null;
  liver: RiskWord | null;
  cns: boolean;
  tpsa: number | null;
  /** 주력과 다른 분자의 백업 후보가 도킹 · ADMET 까지 마쳤나. */
  backupReady: boolean;
}

export interface SeriesBFacts {
  members: number;
  activePatents: number;
  /** 2.1 에서 원본보다 ΔG 를 0.3 kcal/mol 이상 낮춘 변형체가 있나. */
  optimized: boolean;
  /** 'first' IND 첫 신청 승인 · 'retry' 보류 뒤 승인 · null 승인 전. */
  indApproved: 'first' | 'retry' | null;
  /** IND 판정 재료 E · S(흔들림 없음). */
  efficacy: number | null;
  safety: number | null;
  /** 1.1~3.3 실험 실행(jobs.created_by) · 노트(notes.updated_by) 기여 수 — 모둠원마다. */
  contributions: number[];
}

export const QUANT_LABEL = {
  diversity: '4인 병렬 후보 발굴',
  affinity: '주력 후보 결합력 · PLIP',
  admet: 'ADMET 안전성 · 질환 적합',
  backup: '백업 후보 준비',
  patent: '물질특허 · 리드 최적화',
  ind: 'IND 설계 · 펀더멘털',
  share: '모둠원 기여 균형',
} as const;

const clampInt = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(v)));
const fmt2 = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

export function seriesAQuant(f: SeriesAFacts): QuantBreakdown {
  const n = Math.max(1, f.members);
  // ① 다양성 20 = 참여 5 + 도킹 15.
  const join = clampInt((5 * Math.min(n, f.pickOrClaimMembers)) / n, 0, 5);
  const ratio = Math.min(1, f.dockingMembers / n);
  const dock = f.dockingMembers <= 0 ? 0 : ratio >= 1 ? 15 : ratio >= 0.75 ? 11 : ratio >= 0.5 ? 7 : 3;
  // ② 결합력 25 = 등급 20 + PLIP 5.
  const s = f.leadStrength;
  const grade = s === null ? 0 : s >= 0.75 ? 20 : s >= 0.45 ? 14 : 7;
  const plipOk = !!f.plip && (f.plip.hbond >= 2 || (f.plip.hbond >= 1 && f.plip.pistack >= 1));
  // ③ ADMET 12 + 질환 적합 5 + 백업 8.
  const known = f.ro5Violations !== null || f.herg !== null || f.liver !== null;
  let safe = known ? 12 : 6;
  if (known) {
    if ((f.ro5Violations ?? 0) > 1) safe -= 4;
    safe -= f.herg === 'high' ? 4 : f.herg === 'moderate' ? 2 : 0;
    safe -= f.liver === 'high' ? 4 : f.liver === 'moderate' ? 2 : 0;
  }
  safe = Math.max(0, safe);
  const fit = !f.cns ? 5 : f.tpsa === null ? 2 : f.tpsa <= 90 ? 5 : 0;
  const backup = f.backupReady ? 8 : 0;
  const parts: QuantPart[] = [
    {
      key: 'diversity',
      label: QUANT_LABEL.diversity,
      points: join + dock,
      max: 20,
      detail: LEARN_COPY.quantDetail.diversity(f.pickOrClaimMembers, f.dockingMembers, n),
    },
    {
      key: 'affinity',
      label: QUANT_LABEL.affinity,
      points: grade + (plipOk ? 5 : 0),
      max: 25,
      detail:
        s === null
          ? LEARN_COPY.quantDetail.noDocking
          : LEARN_COPY.quantDetail.affinity(f.leadDeltaG?.toFixed(1) ?? '—', fmt2(s), f.plip),
    },
    {
      key: 'admet',
      label: QUANT_LABEL.admet,
      points: safe + fit,
      max: 17,
      detail: known
        ? LEARN_COPY.quantDetail.admet(
            f.ro5Violations ?? '?',
            f.herg ? LEARN_COPY.risk[f.herg] : '?',
            f.liver ? LEARN_COPY.risk[f.liver] : '?',
            f.cns ? (f.tpsa ?? '?') : null,
          )
        : LEARN_COPY.quantDetail.noProps,
    },
    {
      key: 'backup',
      label: QUANT_LABEL.backup,
      points: backup,
      max: 8,
      detail: f.backupReady ? LEARN_COPY.quantDetail.backupReady : LEARN_COPY.quantDetail.backupNone,
    },
  ];
  return {
    round: 'series_a',
    parts,
    total: clampInt(
      parts.reduce((a, p) => a + p.points, 0),
      0,
      PITCH_QUANT_MAX,
    ),
  };
}

export function seriesBQuant(f: SeriesBFacts): QuantBreakdown {
  const n = Math.max(1, f.members);
  const patent = (f.activePatents > 0 ? 15 : 0) + (f.optimized ? 10 : 0);
  const indPts = f.indApproved === 'first' ? 15 : f.indApproved === 'retry' ? 10 : 0;
  const e = f.efficacy;
  const sv = f.safety;
  const fund = e === null || sv === null ? 0 : e >= 60 && sv >= 50 ? 10 : e >= 50 && sv >= 35 ? 6 : 3;
  const counts = [...f.contributions];
  while (counts.length < n) counts.push(0);
  const contributors = counts.filter((c) => c > 0).length;
  const max = Math.max(0, ...counts);
  const min = Math.min(...counts);
  const share = clampInt((14 * Math.min(n, contributors)) / n + (max > 0 ? (6 * min) / max : 0), 0, 20);
  const parts: QuantPart[] = [
    {
      key: 'patent',
      label: QUANT_LABEL.patent,
      points: patent,
      max: 25,
      detail: LEARN_COPY.quantDetail.patent(f.activePatents, f.optimized),
    },
    {
      key: 'ind',
      label: QUANT_LABEL.ind,
      points: indPts + fund,
      max: 25,
      detail: LEARN_COPY.quantDetail.ind(f.indApproved, e !== null && sv !== null ? { e: e.toFixed(1), s: sv.toFixed(1) } : null),
    },
    { key: 'share', label: QUANT_LABEL.share, points: share, max: 20, detail: LEARN_COPY.quantDetail.share(contributors, n, min, max) },
  ];
  return {
    round: 'series_b',
    parts,
    total: clampInt(
      parts.reduce((a, p) => a + p.points, 0),
      0,
      PITCH_QUANT_MAX,
    ),
  };
}

// ── 화면 모양 ──

export interface LearnChoiceView {
  id: string;
  label: string;
}

export interface LearnRubricRowView {
  id: string;
  criterion: string;
  credit: RubricCredit;
  note: string;
}

export interface LearnAttemptView {
  answerId: string;
  attempt: 1 | 2;
  submittedAt: string;
  answer: LearnAnswerInput;
  /** null = 채점 중(pending). */
  score: number | null;
  crista: number;
  status: 'pending' | 'graded';
  flags: string[];
  /** 개념 문항 — 맞았나. */
  correct?: boolean;
  /** 개념 문항 — 마지막 시도(또는 만점) 뒤에만 정답 · 해설. */
  explanation?: string;
  rubric?: LearnRubricRowView[];
  feedback?: string;
  /** 교사가 고친 점수(원본은 `originalScore`). */
  overridden?: boolean;
  originalScore?: number | null;
}

export interface LearnQuestionView {
  assignmentId: string;
  itemId: string;
  stepId: StepId;
  tier: LearnTier;
  kind: LearnItemKind;
  prompt: string;
  table?: { columns: string[]; rows: string[][] };
  choices?: LearnChoiceView[];
  unit?: string;
  minChars?: number;
  maxChars?: number;
  maxCrista: number;
  /** 모둠 데이터가 아직 없어 예시 값으로 물었다(무엇이 없나). */
  fallback?: string[];
  hintUsed: boolean;
  hint?: string;
  status: 'open' | 'pending' | 'graded' | 'practice' | 'revised';
  attempts: LearnAttemptView[];
  canRevise: boolean;
  appeal?: { status: 'open' | 'accepted' | 'rejected' };
}

export interface LearnNoteEvalView {
  id: string;
  attempt: 1 | 2;
  score: number | null;
  crista: number;
  maxCrista: number;
  distributed: boolean;
  contributors: string[];
  status: 'pending' | 'graded';
  rubric?: LearnRubricRowView[];
  feedback?: string;
  flags: string[];
  createdAt: string;
  overridden?: boolean;
  appeal?: { status: 'open' | 'accepted' | 'rejected' };
}

export interface LearnMemberActivity {
  userId: string;
  displayName: string;
  active: boolean;
  exempt: boolean;
  /** 가동 근거 — 문항 · 노트. */
  via?: 'item' | 'note';
}

export interface LearnActivityView {
  stepId: StepId;
  /** 지금 모둠 단계인가(기초 연구비 · 정산은 지금 단계만). */
  current: boolean;
  ratio: number;
  active: number;
  total: number;
  members: LearnMemberActivity[];
  /** 화면 s(바탕 + 지금 단계 전원 가동이면 1). */
  streak: number;
  multiplier: number;
  ticksPaid: number;
  stipendCrista: number;
  stipendMaxCrista: number;
  /** 다음 틱 예정(지금 단계 · 2틱 전 · 시계가 흐를 때만). */
  nextTickAt: string | null;
  settled: boolean;
}

export interface LearnNoteState {
  evals: LearnNoteEvalView[];
  /** 지금 칸 작성자로 보면 분담(×1.2)인가 · 필요한 인원. */
  distributedNow: boolean;
  sharedNeeded: number | null;
  authors: number;
  maxCrista: number;
  canEvaluate: boolean;
  reason?: string;
}

export interface LearnStepResponse {
  stepId: StepId;
  items: LearnQuestionView[];
  note: LearnNoteState;
  activity: LearnActivityView;
  /** 이 단계 모둠 문항 보상 누계 · 상한. */
  capUsedCrista: number;
  capCrista: number;
  shields: number;
  llmAvailable: boolean;
}

export interface PitchRoundView {
  id: string;
  round: PitchRound;
  quant: QuantBreakdown;
  qual: number | null;
  total: number | null;
  crista: number;
  status: 'pending' | 'paid';
  rubric?: LearnRubricRowView[];
  feedback?: string;
  flags: string[];
  /** 교사가 정성 점수를 정했다(AI 채점이 아님). */
  overridden?: boolean;
  pitchText: string;
  byName: string | null;
  createdAt: string;
}

export interface PitchCandidateView {
  alias: string;
  byName: string;
  role: 'lead' | 'backup' | 'candidate';
  deltaG: number | null;
  strength: number | null;
  signals: string[];
}

export interface PitchStatus {
  round: PitchRound;
  eligible: boolean;
  reason?: string;
  maxCrista: number;
  floorCrista: number;
  result: PitchRoundView | null;
}

export interface PitchPreviewResponse extends PitchStatus {
  quant: QuantBreakdown;
  candidates: PitchCandidateView[];
  /** 정성 0점 · 30점일 때 지급 범위. */
  estimate: { min: number; max: number };
}

export interface LearnStepSummary {
  stepId: StepId;
  itemsCrista: number;
  capCrista: number;
  notePaid: number;
  noteScore: number | null;
  active: number;
  total: number;
  ratio: number;
  settled: boolean;
  stipendCrista: number;
}

export interface LearnSummaryResponse {
  currentStep: StepId;
  activity: LearnActivityView;
  shields: number;
  steps: LearnStepSummary[];
  pitch: Record<PitchRound, PitchStatus>;
  totals: { items: number; notes: number; stipend: number; pitch: number; corrections: number };
  llmAvailable: boolean;
}

/** 사옥 지구 창문 불빛(학급 공개 — 켜진 창 수만, 점수 · 이름 없음). */
export interface DistrictLight {
  teamId: string;
  /** 지금 단계에서 가동 도장을 찍은 모둠원 수 · 창문 수(모둠 인원, 최대 4). */
  lit: number;
  windows: number;
  /** 전원 가동 — '전원 야근' 연출. */
  allOn: boolean;
  /** 5단계 연속 전원 가동 — 옥상 깃발. */
  flag: boolean;
}
export interface DistrictLightsResponse {
  classId: string;
  lights: DistrictLight[];
}

export interface LearnAppealRequest {
  targetType: LearnTargetType;
  targetId: string;
  reason: string;
}

// ── 교사 ──

export interface TeacherLearnStudentRow {
  userId: string;
  displayName: string;
  teamId: string | null;
  ticker: string | null;
  /** 단계마다 — 낸 문항 수 · 평균 점수 · 가동 · 면제. */
  steps: Partial<Record<StepId, { answered: number; avgScore: number | null; active: boolean; exempt: boolean }>>;
}
export interface TeacherLearnTeamRow {
  teamId: string;
  ticker: string | null;
  startupName: string | null;
  currentStep: StepId;
  ratio: number;
  streak: number;
  multiplier: number;
  shields: number;
  totals: LearnSummaryResponse['totals'];
  pitch: Partial<Record<PitchRound, { total: number | null; crista: number; status: 'pending' | 'paid' }>>;
}
export interface TeacherLearnAppealRow {
  id: string;
  targetType: LearnTargetType | 'doc_review';
  targetId: string;
  teamId: string;
  byName: string;
  reason: string;
  status: 'open' | 'accepted' | 'rejected';
  score: number | null;
  createdAt: string;
}
export interface TeacherLearnGradingRow {
  id: string;
  targetType: LearnTargetType;
  targetId: string;
  teamId: string | null;
  status: string;
  model: string | null;
  latencyMs: number | null;
  attempts: number;
  createdAt: string;
}
export interface TeacherLearnResponse {
  classId: string;
  students: TeacherLearnStudentRow[];
  teams: TeacherLearnTeamRow[];
  appeals: TeacherLearnAppealRow[];
  gradings: TeacherLearnGradingRow[];
  llmCallsToday: number;
}
export interface TeacherExemptionRequest {
  userId: string;
  stepId: StepId;
  exempt: boolean;
}
export interface TeacherOverrideRequest {
  targetType: LearnTargetType;
  targetId: string;
  /** answer · note 0~100, pitch 는 정성 0~30. */
  score: number;
  note?: string;
  appealId?: string;
}
export interface TeacherAppealDecision {
  accept: boolean;
  note?: string;
  /** 받아들이며 고칠 점수(없으면 상태만). */
  score?: number;
}

/** 경로(모둠은 세션에서 정한다). */
export const LEARN_API = {
  summary: '/api/learn/summary',
  step: (stepId: string) => `/api/learn/step/${stepId}`,
  answers: '/api/learn/answers',
  revise: (answerId: string) => `/api/learn/answers/${answerId}/revise`,
  hint: (assignmentId: string) => `/api/learn/assignments/${assignmentId}/hint`,
  noteEvaluate: (stepId: string) => `/api/learn/notes/${stepId}/evaluate`,
  pitch: (round: PitchRound) => `/api/learn/pitch/${round}`,
  pitchPreview: (round: PitchRound) => `/api/learn/pitch/${round}/preview`,
  appeals: '/api/learn/appeals',
  lights: '/api/learn/lights',
  teacher: (classId: string) => `/api/teacher/learn/${classId}`,
  teacherExemptions: (classId: string) => `/api/teacher/learn/${classId}/exemptions`,
  teacherOverride: '/api/teacher/learn/override',
  teacherAppeal: (appealId: string) => `/api/teacher/learn/appeals/${appealId}`,
} as const;

// ── 학생에게 보이는 문구(§5.12 — Gemini 4 Argon (High) 초안 → Claude 검토 · `.review/2026-10-24-copy-learn/copy.md` 반영) ──
// 돈 자리표시자(`c` · `max` · `used` · `cap` …)에는 `formatCrista()` 결과(단위 포함)가 들어온다 — 문구에 '크리스타'를 다시 쓰지 않는다.
// 규칙 값(금액 · 문턱 · 횟수)은 위 상수에서 끌어 쓴다(문구에 숫자를 따로 박지 않는다).

const PCT = (ratio: number): number => Math.round(ratio * 100);
const PITCH_LEN = `${LEARN_TEXT_LIMITS.pitch.min}~${LEARN_TEXT_LIMITS.pitch.max}자`;

export const LEARN_COPY = {
  tier: { concept: '개념', intermediate: '중급', advanced: '심화' } satisfies Record<LearnTier, string>,
  round: { series_a: 'Series A', series_b: 'Series B' } satisfies Record<PitchRound, string>,
  credit: { full: '○', half: '△', none: '×' } satisfies Record<RubricCredit, string>,
  risk: { low: '낮음', moderate: '보통', high: '높음' } satisfies Record<RiskWord, string>,
  creditWord: { full: '충족', half: '일부 충족', none: '빠짐' } satisfies Record<RubricCredit, string>,
  flag: {
    off_topic: '문제에서 묻는 것과 다른 답이라 0점이에요.',
    too_short: '답이 너무 짧아서 채점 기준을 충분히 확인하지 못했어요.',
    injection: '채점을 바꾸라는 글이 들어 있어 0점이에요. 선생님께도 알림이 갔어요.',
    not_korean: '한국어로 써 주세요.',
    copied_prompt: '문제를 그대로 옮겨 적었어요. 내 생각과 근거로 다시 써 보세요.',
    duplicate: '먼저 낸 다른 답과 너무 비슷해서 0점이에요.',
  } satisfies Record<LearnFlag, string>,
  // 위 띠 · 서랍
  chip: (m: string, k: number, n: number) => `×${m} · 단계 가동 ${k}/${n}`,
  chipTitle: '학습 · 연구비 서랍 열기',
  drawerTitle: '학습 · 연구비',
  currentStep: '지금 단계',
  activeMembers: '단계 가동',
  streak: '연속 전원 가동',
  multiplier: '충전 배율',
  shields: '가동 보호권',
  shieldsHelp: `심화 문항이나 연구 노트 평가에서 ${LEARN_SHIELD_MIN_SCORE}점 이상을 받으면 모둠에 보호권이 1장 생겨요(최대 ${LEARN_SHIELDS_MAX}장). 전원 가동을 못 하고 단계를 넘길 때 저절로 1장을 써요. 그러면 그 단계는 전원 가동으로 인정돼 연속 기록이 이어져요.`,
  stipend: '기초 연구비',
  stipendHelp: `게임 시계가 흐르는 동안 실제 시간 ${LEARN_TICK_MINUTES}분마다 기초 연구비(${formatCrista(LEARN_TICK_CRISTA)} × 충전 배율)가 들어와요. 한 단계에서는 ${LEARN_TICKS_PER_STEP}번(${LEARN_TICK_MINUTES * LEARN_TICKS_PER_STEP}분 분량)까지만 들어와요. 모둠원 모두가 가동하면 남은 몫을 기다리지 않고 바로 받아요.`,
  nextTick: '다음 충전',
  ticksDone: `이 단계 기초 연구비 충전 끝 (${LEARN_TICKS_PER_STEP}/${LEARN_TICKS_PER_STEP})`,
  paused: '게임 시계가 멈춰 있어서 기초 연구비 충전도 쉬고 있어요.',
  perStep: '단계별 학습 연구비',
  itemsCap: '문항 보상',
  notePaid: '노트 평가',
  totals: '받은 학습 연구비',
  totalsItems: '문항',
  totalsNotes: '연구 노트',
  totalsStipend: '기초 연구비',
  totalsPitch: '투자 유치',
  totalsCorrections: '선생님 정정',
  memberActive: '가동',
  memberIdle: '아직',
  memberExempt: '선생님 면제',
  // 단계 칸(StepLearn)
  noteButton: (max: string) => `연구 노트 평가받기 (+최대 ${max})`,
  noteRevise: (max: string) => `고친 노트 다시 평가받기 (늘어난 만큼만 · 최대 ${max})`,
  noteShared: `세 칸을 서로 다른 모둠원이 나눠 쓰면 보상이 ×${LEARN_NOTE_SHARED_MULTIPLIER} 가 돼요.`,
  noteSharedOn: `분담 작성 ×${LEARN_NOTE_SHARED_MULTIPLIER} 적용 (최대 ${formatCrista(noteMaxCrista(true))})`,
  noteDone: '이 단계 연구 노트 평가를 두 번 모두 받았어요.',
  notePending: 'AI 가 우리 모둠 연구 노트를 읽고 있어요. 몇 초에서 몇십 초 걸려요.',
  noteTooShort: `세 칸을 합쳐 ${LEARN_TEXT_LIMITS.noteTotalMin}자 이상 써 주세요. 근거나 대안을 한 문장씩 더 보태 볼까요?`,
  itemsTitle: '이 단계 연구 문항',
  capLeft: (used: string, cap: string) => `이 단계 모둠 문항 보상 ${used} / ${cap}`,
  capReached: `이 단계 모둠 문항 보상 상한(${formatCrista(LEARN_STEP_CAP_CRISTA)})에 닿았어요. 지금부터는 연습 모드예요. 채점과 피드백은 그대로 받지만 연구비는 들어오지 않아요.`,
  submit: '제출하기',
  submitText: '채점받기',
  revise: '고쳐서 한 번 더 내기 (늘어난 만큼만)',
  hint: `힌트 보기 (보상 상한 ${PCT(LEARN_HINT_RATIO)}%)`,
  hintUsed: `힌트를 봤어요. 이 문항의 최대 보상은 ${PCT(LEARN_HINT_RATIO)}%로 줄었어요.`,
  pending: 'AI 가 채점 기준에 맞춰 읽고 있어요. 끝나면 바로 보여요.',
  pendingSlow: 'AI 채점이 밀려 있어요. 화면을 닫거나 다음 단계로 가도 괜찮아요. 채점이 끝나면 연구비가 들어와요.',
  fallback: '아직 우리 모둠의 실험 결과가 없어서 예시 값으로 물어요. 실험을 마친 뒤에 풀어도 괜찮아요.',
  correct: '맞았어요!',
  wrong: '틀렸어요.',
  score: (s: number) => `${s}점`,
  paid: (c: string) => `+${c}`,
  practice: '연습 모드',
  appeal: '채점에 이의 제기',
  appealPlaceholder: '어느 부분이 왜 억울한지 선생님께 한 줄로 써 주세요.',
  appealOpen: '이의 제기를 냈어요. 선생님이 점수를 고치면 연구비 차이가 저절로 정산돼요.',
  appealDone: '선생님이 이의 제기를 처리했어요.',
  chars: (n: number, min: number, max: number) => `${n}자 · ${min}~${max}자`,
  // 투자 유치
  pitchButton: '투자 유치',
  pitchTitle: (round: string) => `${round} 투자 심사`,
  pitchLockedA: `2.2 에서 특허 후보를 1개 이상 고르면 Series A(회사가 받는 첫 번째 큰 투자, 최대 ${formatCrista(PITCH_MAX_CRISTA.series_a)})를 신청할 수 있어요.`,
  pitchLockedB: `3.1 물질특허가 등록되고 3.3 IND(임상시험 계획 승인 신청)가 승인되면 Series B(두 번째 큰 투자, 최대 ${formatCrista(PITCH_MAX_CRISTA.series_b)})를 신청할 수 있어요.`,
  pitchDone: (round: string) => `${round} 투자 심사를 마쳤어요.`,
  pitchQuant: `정량 평가 (${PITCH_QUANT_MAX}점)`,
  pitchQual: `피치 · 연구 노트 (${PITCH_QUAL_MAX}점)`,
  pitchCandidates: '우리 모둠 후보 비교',
  pitchPromptA: `아래 세 가지를 ${PITCH_LEN}로 써 주세요. ① 모둠 후보 가운데 왜 이 분자를 주력 후보로 골랐나요(도킹 ΔG · 물성 수치 근거)? ② 주력 후보의 ADMET 약점과 독성 위험은 무엇인가요? ③ 백업 후보는 주력과 무엇이 다르고, 언제 바꾸나요? 1.1~2.2 연구 노트도 함께 심사에 들어가요.`,
  pitchPromptB: `아래 세 가지를 ${PITCH_LEN}로 써 주세요. ① 우리 물질특허는 무엇을 보호하고, 다른 모둠과 무엇이 다른가요? ② 고른 제형 · 용량이 1상(안전성)과 2상(유효성)을 함께 넘을 약동학(PK, 약이 몸에 들어가 퍼지고 빠져나가는 과정) 근거는 무엇인가요? ③ 임상이 보류되면 용량 변경 · 제형 변경 · 백업 후보 교체 중 무엇을 먼저 하나요? 3.1~3.3 연구 노트도 함께 심사에 들어가요.`,
  pitchEstimate: (min: string, max: string) => `예상 투자금 ${min} ~ ${max}`,
  pitchSubmit: '투자 심사 받기',
  pitchConfirm: '투자 심사는 라운드마다 한 번만 받을 수 있어요. 지금 낼까요?',
  pitchPaidBase: '정량 점수에 따른 투자금이 먼저 들어왔어요. AI 심사가 피치 글을 다 읽으면 나머지가 들어와요.',
  pitchFloor: (c: string) => `바닥 보장(${PCT(PITCH_FLOOR_RATIO)}%) ${c}`,
  roleLead: '주력',
  roleBackup: '백업',
  roleCandidate: '후보',
  close: '닫기',
  retry: '다시 읽기',
  // 정량 70점의 근거 한 줄(seriesAQuant · seriesBQuant)
  quantDetail: {
    diversity: (picked: number, docked: number, n: number) => `추천 · 찜 ${picked}/${n}명 · 서로 다른 분자 도킹 ${docked}/${n}명`,
    noDocking: '주력 후보의 도킹 근거가 아직 없어요.',
    affinity: (dg: string, p: string, plip: { hbond: number; pistack: number } | null) =>
      `ΔG ${dg} · 결합력 p ${p}${plip ? ` · 수소결합 ${plip.hbond} · π-π ${plip.pistack}` : ''}`,
    admet: (ro5: number | string, herg: string, liver: string, tpsa: number | string | null) =>
      `Ro5 위반 ${ro5} · hERG ${herg} · 간독성 ${liver}${tpsa !== null ? ` · TPSA ${tpsa}(CNS ≤ 90)` : ''}`,
    noProps: '물성 신호를 아직 읽지 못해서 반만 셌어요.',
    backupReady: '주력과 다른 백업 후보가 도킹과 ADMET 를 마쳤어요.',
    backupNone: '백업 후보가 아직 없어요.',
    patent: (active: number, optimized: boolean) => `유효 특허 ${active}건 · 변형체 개선 ${optimized ? '있음' : '없음'}`,
    ind: (approved: 'first' | 'retry' | null, es: { e: string; s: string } | null) =>
      `IND ${approved === 'first' ? '첫 신청 승인' : approved === 'retry' ? '보류 뒤 승인' : '승인 전'}${es ? ` · E ${es.e} · S ${es.s}` : ''}`,
    share: (contributors: number, n: number, min: number, max: number) => `기여한 모둠원 ${contributors}/${n}명 · 가장 적은/많은 기여 ${min}/${max}`,
  },
  // 화면 조각(2026-10-24 검토 — 화면 파일에 흩어져 있던 글을 한곳으로)
  loading: '불러오는 중…',
  stepLoading: (title: string) => `${title} 학습 칸을 여는 중…`,
  stepRegion: (stepId: string) => `${stepId} 학습 연구비`,
  sending: '보내는 중…',
  noteTitle: '연구 노트 평가',
  noteAuthorsNow: (k: number, n: number) => `칸을 쓴 모둠원 ${k}/${n}명`,
  evalFirst: '첫 평가',
  evalSecond: '고친 뒤 평가',
  maxOf: (c: string) => `최대 ${c}`,
  grading: '⏳ 채점 중',
  pickMany: '해당하는 것을 모두 골라요',
  pickOne: '하나를 골라요',
  answerLabel: '답',
  answerValue: (v: number) => `답 ${v}`,
  attemptFirst: '첫 답',
  attemptSecond: '고친 답',
  explanation: (t: string) => `해설 · ${t}`,
  flagsLabel: '채점 표시',
  rubricLabel: '채점 기준별 결과',
  send: '보내기',
  cancel: '취소',
  soon: '곧',
  minutesLater: (m: number) => `${m}분 뒤`,
  shieldCount: (n: number) => `${n}장`,
  stepRow: (items: string, note: string) => `문항 ${items} · 노트 ${note}`,
  pitchRow: (total: number, c: string) => `${total}점 · ${c}`,
  pitchOpen: (c: string) => `▸ 신청할 수 있어요 · 최대 ${c}`,
  roundTabs: '투자 라운드',
  colCandidate: '후보',
  colBy: '누가',
  colDg: 'ΔG · p',
  colSignals: '신호',
  points: (n: number) => `${n}점`,
  qualOf: (n: number | null) => `정성 ${n ?? '—'}/${PITCH_QUAL_MAX}`,
  gaugeLabel: (quant: number, qual: number | null, floor: number) =>
    `정량 ${quant}/${PITCH_QUANT_MAX}${qual !== null ? ` · 정성 ${qual}/${PITCH_QUAL_MAX}` : ''} · 바닥 ${floor}점`,
  gaugeFloor: `바닥 ${PCT(PITCH_FLOOR_RATIO)}`,
  gaugeQual: `정성 ${PITCH_QUAL_MAX}`,
  // 서버가 만드는 글(학생 · 전광판에 보임)
  leftMember: '(나간 모둠원)',
  rubricMissed: '채점관이 이 항목을 보지 못했어요.',
  hintPrefix: (words: string) => `생각할 거리: ${words}`,
  /** 전광판 줄(주인 키 — copy-common §4.3: `learn.board.streakNews` · `learn.board.pitchNews`). 금액은 `formatCrista()` 결과. */
  headlineStreak: (ticker: string) => `◆ ${ticker} 연구진 5단계 연속 전원 가동 — 연구비 충전 ×${stipendMultiplier(1, 5).toFixed(1)}`,
  headlineInvest: (ticker: string, round: string, amount: string) => `◆ ${ticker} ${round} ${amount} 투자 유치`,
  // 서버 오류 · 안내
  err: {
    notFound: '문항을 찾지 못했어요.',
    notYours: '나에게 나온 문항만 낼 수 있어요.',
    already: '이미 낸 답이에요. 화면을 새로 고쳐 주세요.',
    pendingNow: '아직 채점 중이에요. 채점이 끝난 뒤에 고쳐 낼 수 있어요.',
    reviseUsed: '고쳐 내기는 문항마다 한 번만 할 수 있어요.',
    reviseFull: '이미 만점이에요. 더 고치지 않아도 돼요.',
    hintClosed: '더 낼 답이 없어 힌트를 쓸 수 없어요.',
    choice: '보기에서 답을 골라 주세요.',
    number: '숫자를 써 주세요.',
    textLen: (min: number, max: number) => `${min}~${max}자로 써 주세요.`,
    noteEmpty: `연구 노트 세 칸을 합쳐 ${LEARN_TEXT_LIMITS.noteTotalMin}자 이상 써 주세요.`,
    noteSame: '지난번 평가 뒤로 노트가 바뀌지 않았어요. 피드백을 보고 고친 뒤에 다시 눌러 주세요.',
    noteUsed: '노트 평가는 한 단계에 두 번(처음 · 고친 뒤)까지 받을 수 있어요.',
    notePending: '노트 평가가 아직 끝나지 않았어요. 조금만 기다려 주세요.',
    pitchLen: (min: number, max: number) => `피치는 ${min}~${max}자로 써 주세요.`,
    pitchDone: '이 라운드는 이미 심사를 받았어요.',
    pitchLocked: '아직 신청할 수 없는 라운드예요.',
    appealLen: `이의 사유는 ${LEARN_TEXT_LIMITS.appeal.min}~${LEARN_TEXT_LIMITS.appeal.max}자로 써 주세요.`,
    appealDup: '이미 낸 이의 제기를 선생님이 보고 있어요.',
    appealTarget: '이의 제기할 채점을 찾지 못했어요.',
    teacherScore: '점수는 0~100(피치는 0~30) 정수예요.',
    exemptStep: '단계 번호가 잘못됐어요.',
  },
} as const;
