/**
 * 전광판 01 · 기업가치 · 과정 평가 · 순위 · 공개 서랍 · 최종 순위 규격(설계 §5.3 · §5.2 · §4.1 · W5 · learning-grant §5 2축 순위) — 기능 FMARKET.
 *
 * 2026-10-24 사용자 지시: "모든 파이프라인의 하나하나가 기업가치/주식에 반영되고(과정 및 결과 모두 평가) 수업이 끝날 때(또는 교사가 정한 시기)
 * 최종 순위가 매겨짐". 그래서
 *   - **결과 소식**(도킹 신기록 · 특허 · 전임상 · IND · 임상 · 허가 · 투자 · 학습)은 crista `PIPELINE_ANALYST_BANDS` · `ANALYST_BANDS` 범위
 *     (서버 — game-rules 를 그대로 부른다) + 이 파일의 `MARKET_EXTRA_BANDS`(crista 에 없는 소식) 안에서 결정적으로 흔들린 변동률로 기업가치를 움직이고,
 *   - **과정 평가**는 단계가 처음 끝나는 순간 `PROCESS_RULES` 로 0~100 점을 매겨 작은 변동(0 ~ +3%)으로 움직인다(긍정 · 중립 — 감점 없음).
 *   - 마감(교사 [지금 마감] 또는 정한 시각)에 기업가치 · 순위를 얼려 `class_standings` 에 둔다. 그 뒤 소식은 흐르지만 순위는 바뀌지 않는다.
 *
 * 공개 범위(§5.3): 이름 · 티커 · 단계 · 통과/보류 · 질환 · 코드명 · 기업가치만 — 후보 SMILES · 물성 · 점수 · 노트 · 서류 본문 · 심사 결과는 싣지 않는다
 * (과정 평가도 학급에는 참여 인원 같은 '사실'만, 점수 · 보완 횟수는 그 모둠 · 교사만).
 * 학생에게 보이는 문구는 모두 `MARKET_COPY` 한곳 — §5.12 Gemini 4 Argon (High) 초안 반영(2026-10-24 · 식별자 · 숫자 · 규칙 값은 그 밖).
 */
import { CENTS_PER_CRISTA } from './money.ts';
import type { StepId, StepState } from './pipeline.ts';

// ── 소식 종류(열린 규칙) ──

/** 이 저장소의 9단계 파이프라인이 올리는 소식. */
export const BOARD_EVENT_KINDS = [
  'listing',
  'docking_record',
  'patent',
  'preclinical',
  'ind_approved',
  'ind_held',
  'trial_pass',
  'trial_held',
  'approval',
  'investment',
  'rank',
  'learn',
  'correction',
  'notice',
  'process',
] as const;
export type BoardEventCoreKind = (typeof BOARD_EVENT_KINDS)[number];

/**
 * 다른 세션(항체 설계 랩 · 트랙 2)이 같은 `postBoardEvent` 로 올리는 소식 — 접두 `antibody_` + 소문자 · 숫자 · `_` 1~40자(DB CHECK 와 같다).
 * 변동률: `public.stage`(patent · ind · phase1 · phase2 · phase3 · final)와 `public.passed`(참 · 거짓)를 주면 소분자와 같은 crista 범위,
 * 아니면 `antibodyBand(kind, tone, public.changeHint)` — `changeHint`(0~10 정수)가 폭의 상한, 없거나 0 이면 변동 0.
 * 과정 평가는 `postProcessScore({ stepId: 'antibody_<단계>' })`.
 */
export type AntibodyEventKind = `antibody_${string}`;
export const OPEN_KIND_PATTERN = /^antibody_[a-z0-9_]{1,40}$/;
export type BoardEventKind = BoardEventCoreKind | AntibodyEventKind;

export function isBoardEventKind(kind: string): kind is BoardEventKind {
  return (BOARD_EVENT_KINDS as readonly string[]).includes(kind) || OPEN_KIND_PATTERN.test(kind);
}

export type BoardEventTone = 'normal' | 'bad' | 'rank';

/** LED 띠 한 줄 — 공개 정보만. */
export interface BoardEventView {
  id: number;
  classSeq: number;
  teamId: string | null;
  ticker: string | null;
  kind: BoardEventKind;
  /** 화면에 보일 줄 — 다듬은 줄이 있으면 그것('AI 생성' 표시), 없으면 규칙 문구. */
  headline: string;
  aiHeadline: boolean;
  changePct: number | null;
  tone: BoardEventTone;
  gameDay: number | null;
  createdAt: string;
}

// ── 기업가치 ──

/** 상장가(저장 값 달러) 10.00 × 1,000,000주(§5.3) — 화면은 `formatPrice` · `formatCapM` 으로 크리스타(50.00 크리스타 · 5,000만 크리스타). */
export const LISTING_PRICE_USD = 10;
export const SHARES_OUTSTANDING = 1_000_000;
/** 주가 하한(crista `MARKET_RULES.fundamentalFloorUsd`). */
export const PRICE_FLOOR_USD = 0.1;
/** LED 띠에 흘리는 최근 소식 수 · 공개 서랍의 최근 소식 수 · 교사 프로젝터 보기. */
export const BOARD_RECENT = 10;
export const DRAWER_RECENT = 8;
export const PROJECTOR_RECENT = 20;

export interface MoveBand {
  minPct: number;
  maxPct: number;
  defaultPct: number;
}

/**
 * crista 범위표에 없는 소식의 변동 폭(%) — **이 저장소가 정한 값**(crista `game-rules` 는 바꾸지 않는다).
 * - preclinical: 3.2 전임상 완료(주력 지정). 특허(0~5 · 2)와 IND(0~5 · 2) 사이 단계라 같은 폭.
 * - learn: 학습 · 가동 소식(긍정만 — learning-grant §5).
 * - antibody · antibody_bad: 항체 트랙 소식 중 단계 · 결과(crista `stage` + `passed`)를 싣지 않은 것.
 * - antibody_record: 항체 랩 '설계 기록 경신'(kind 가 정확히 `antibody_record` 일 때만) — 저분자 도킹 신기록(0~12%)과 맞춘 0~10%
 *   (2026-10-24 항체 랩과 합의 — 항체 설계 문서 §11.3.1 '밴드 폭').
 * 항체 소식은 모두 `public.changeHint`(0~10 정수)를 **변동 폭의 상한**으로 쓴다 — `antibodyBand`.
 */
export const MARKET_EXTRA_BANDS = {
  preclinical: { minPct: 0, maxPct: 5, defaultPct: 2 },
  learn: { minPct: 0, maxPct: 2, defaultPct: 1 },
  antibody: { minPct: 0, maxPct: 5, defaultPct: 2 },
  antibody_bad: { minPct: -5, maxPct: 0, defaultPct: -2 },
  antibody_record: { minPct: 0, maxPct: 10, defaultPct: 4 },
} as const satisfies Record<string, MoveBand>;

/** `public.changeHint` 가 받는 범위(0~10 정수). */
export const ANTIBODY_CHANGE_HINT_MAX = 10;

/**
 * 항체 소식(`antibody_*` — crista `stage` + `passed` 를 싣지 않은 것)의 변동 범위 — 항체 랩과의 계약(2026-10-24).
 * - 밴드: kind 가 `antibody_record` 이면 `antibody_record`(0~10), 아니면 tone 'bad' 면 `antibody_bad`(−5~0), 그 밖은 `antibody`(0~5).
 * - 상한: `changeHint`(0~10 정수 — 반올림 · 범위로 자름)가 변동 **폭**의 상한이다. 오르는 밴드는 `[minPct, min(changeHint, maxPct)]`,
 *   내리는 밴드(`antibody_bad`)는 `[max(minPct, −changeHint), maxPct]`. 기본값도 그 안으로 당긴다.
 * - `changeHint` 가 없거나 0(또는 숫자가 아님)이면 변동 0 — `{0, 0, 0}`.
 * 이 범위 안의 값은 다른 결과 소식처럼 `jitteredPct`(학급 id · 소식 키 해시)로 결정적으로 고른다(서버 `moveFor`).
 */
export function antibodyBand(kind: string, tone: BoardEventTone, changeHint: unknown): MoveBand {
  const raw = typeof changeHint === 'number' ? changeHint : typeof changeHint === 'string' && changeHint.trim() !== '' ? Number(changeHint) : NaN;
  const hint = Number.isFinite(raw) ? Math.max(0, Math.min(ANTIBODY_CHANGE_HINT_MAX, Math.round(raw))) : 0;
  if (hint <= 0) return { minPct: 0, maxPct: 0, defaultPct: 0 };
  const base: MoveBand = kind === 'antibody_record' ? MARKET_EXTRA_BANDS.antibody_record : tone === 'bad' ? MARKET_EXTRA_BANDS.antibody_bad : MARKET_EXTRA_BANDS.antibody;
  if (base.maxPct > 0) {
    const maxPct = Math.min(hint, base.maxPct);
    return { minPct: base.minPct, maxPct, defaultPct: Math.min(base.defaultPct, maxPct) };
  }
  const minPct = Math.max(base.minPct, -hint);
  return { minPct, maxPct: base.maxPct, defaultPct: Math.max(base.defaultPct, minPct) };
}

/**
 * 진행 소식(설계 §5.16 '과정 소식 — 모집 완료 · 임상 시작 등에도 변동') — 모둠 'notice' 소식 중 `public.event` 가 이 목록에 있는 것.
 * 폭은 crista `ANALYST_BANDS.upgrade`(0~3 · 기본 1 — 서버가 game-rules 를 그대로 부른다). 교사 공지(`public.by: 'teacher'`)는 움직이지 않는다.
 * 4.1(F41)이 `postBoardEvent({ kind: 'notice', public: { event: 'trial_recruited' | 'trial_started', … } })` 로 낸다.
 */
export const PROGRESS_NOTICE_EVENTS: readonly string[] = ['trial_recruited', 'trial_started'];

/** 교사 정정 소식이 움직일 수 있는 폭(±%) — crista 대기 계기 합치기 상한(±20%)과 같다. */
export const CORRECTION_MAX_PCT = 20;

/** 결정적 흔들림은 기본값에서 범위 끝까지의 이 비율 안에서(범위 · 기본값은 crista 그대로 — 화면 · 시험이 같은 함수). */
export const JITTER_SHARE = 0.5;

/**
 * 범위 안의 결정적 흔들림 — `u` ∈ [−1, 1](서버가 학급 id · 소식 키의 SHA-256 으로 낸다). 기본값에서 아래 · 위 끝까지 `JITTER_SHARE` 만큼만.
 * 0.1%p 로 반올림하고 범위로 자른다.
 */
export function jitteredPct(band: MoveBand, u: number): number {
  const v = Math.max(-1, Math.min(1, Number.isFinite(u) ? u : 0));
  const span = v < 0 ? band.defaultPct - band.minPct : band.maxPct - band.defaultPct;
  const pct = band.defaultPct + v * span * JITTER_SHARE;
  return Math.round(Math.min(band.maxPct, Math.max(band.minPct, pct)) * 10) / 10;
}

// ── 과정 평가 ──

/** 과정 신호 하나 — 값 0~1(1 이 좋음). `public` 이면 `fact` 가 학급 전광판에 실린다(참여 인원 같은 사실만). */
export interface ProcessComponent {
  key: string;
  value: number;
  weight: number;
  /** 사람이 읽는 사실 — 예: '기준 투표 4/4명'. 점수 · 보완 횟수 같은 비공개 사실은 public: false. */
  fact: string;
  public: boolean;
}

export interface ProcessRule {
  key: string;
  weight: number;
  public: boolean;
}

/** 모든 단계에 붙는 공통 신호 — 연구 노트 3칸 · 노트 쓴 사람 수 · 그 단계 학습 문항 푼 사람 수(FLEARN). */
export const PROCESS_COMMON: readonly ProcessRule[] = [
  { key: 'notes', weight: 1, public: true },
  { key: 'note_authors', weight: 1, public: true },
  { key: 'learn', weight: 1, public: true },
];

/**
 * 단계별 과정 신호 규칙(값은 DB 사실에서 0~1 로 — 서버 `features/market.ts processSignals`). 가중치가 클수록 그 단계의 핵심 과정.
 * 각 기능이 직접 `postProcessScore(tx, deps, { components })` 를 부르면 그 값을 쓰고(키는 여기 것을 권장), 아니면 FMARKET 이 DB 에서 센다.
 */
export const PROCESS_RULES: Record<StepId, readonly ProcessRule[]> = {
  // 표적 추천 카드를 낸 모둠원 비율
  '1.1': [{ key: 'picks', weight: 2, public: true }],
  // 기준 회의 정족수(투표한 사람) · 다시 논의(숙의) · 찜 근거 · 스크리닝 농축도
  '1.2': [
    { key: 'quorum', weight: 2, public: true },
    { key: 'deliberation', weight: 1, public: false },
    { key: 'claim_reasons', weight: 1, public: false },
    { key: 'enrichment', weight: 2, public: false },
  ],
  // 도킹한 모둠원 비율(4인 병렬) · 구조 변형 시도 · 대기열 근거 칩
  '2.1': [
    { key: 'dockers', weight: 2, public: true },
    { key: 'variants', weight: 1, public: true },
    { key: 'pick_reasons', weight: 1, public: false },
  ],
  // 특허 후보를 고른 모둠원 비율 · 새 물질 비율 · 근거 칩
  '2.2': [
    { key: 'pickers', weight: 2, public: true },
    { key: 'novel', weight: 1, public: false },
    { key: 'pick_reasons', weight: 1, public: false },
  ],
  // 받아들여질 때까지 보완 횟수(적을수록) · 거절(알려진 물질 · 중복) 없음
  '3.1': [
    { key: 'revisions', weight: 2, public: false },
    { key: 'no_reject', weight: 1, public: false },
  ],
  // 3R — 대체 시험 · 마릿수 수준 · 윤리 교육 이수 · 계획서 보완 횟수
  '3.2': [
    { key: 'alt_assay', weight: 2, public: true },
    { key: 'animal_level', weight: 2, public: false },
    { key: 'ethics', weight: 2, public: true },
    { key: 'revisions', weight: 1, public: false },
  ],
  // 서류 통과까지 보완 횟수 · 보류 없음
  '3.3': [
    { key: 'revisions', weight: 3, public: false },
    { key: 'no_hold', weight: 1, public: false },
  ],
  // 재도전(보류 뒤 다시) · 모집 전략
  '4.1': [
    { key: 'resilience', weight: 2, public: true },
    { key: 'recruit', weight: 1, public: false },
  ],
  // 품목 허가 서류 보완 횟수
  '4.2': [{ key: 'revisions', weight: 2, public: false }],
};

/** 과정 점수 0~100 = 가중 평균 × 100. 신호가 없으면 null(소식 · 변동 없음). */
export function processScoreOf(components: readonly Pick<ProcessComponent, 'value' | 'weight'>[]): number | null {
  let w = 0;
  let s = 0;
  for (const c of components) {
    if (!Number.isFinite(c.value) || !(c.weight > 0)) continue;
    w += c.weight;
    s += c.weight * Math.max(0, Math.min(1, c.value));
  }
  return w > 0 ? Math.round((s / w) * 100) : null;
}

/** 과정 평가의 변동률(%) — 점수 30 미만은 0(중립), 30~100 → 0 ~ +3%. 감점은 없다(과정은 격려 — 결과 소식이 벌을 준다). */
export const PROCESS_PCT_MAX = 3;
export const PROCESS_NEUTRAL_BELOW = 30;
export function processChangePct(score: number): number {
  if (!Number.isFinite(score) || score < PROCESS_NEUTRAL_BELOW) return 0;
  const x = Math.min(1, (score - PROCESS_NEUTRAL_BELOW) / (100 - PROCESS_NEUTRAL_BELOW));
  return Math.round(PROCESS_PCT_MAX * x * 10) / 10;
}

/** 보완 횟수 → 0~1(0회 1 · 1회 0.67 · 2회 0.5 …). */
export const revisionValue = (revisions: number): number => 1 / (1 + Math.max(0, revisions) / 2);

// ── 결과 점수 · 연구 역량(최종 순위 내역) ──

/**
 * 결과 점수(0~100) — 소식 종류마다 점수 × 상한 횟수(이 저장소가 정한 값). 보류 · 실패는 점수를 깎지 않는다(기업가치가 이미 내려간다).
 * 항체 트랙 소식은 `antibody` 한 칸으로 센다.
 */
export const RESULT_POINTS: Record<string, { points: number; max: number }> = {
  docking_record: { points: 5, max: 2 },
  patent: { points: 8, max: 3 },
  preclinical: { points: 10, max: 1 },
  ind_approved: { points: 12, max: 1 },
  trial_phase1: { points: 8, max: 1 },
  trial_phase2: { points: 10, max: 1 },
  trial_phase3: { points: 12, max: 1 },
  approval: { points: 20, max: 1 },
  investment: { points: 5, max: 2 },
  antibody: { points: 5, max: 4 },
};

export function resultScoreOf(counts: Record<string, number>): number {
  let total = 0;
  for (const [key, rule] of Object.entries(RESULT_POINTS)) total += rule.points * Math.min(rule.max, Math.max(0, counts[key] ?? 0));
  return Math.min(100, total);
}

/** 연구 역량 지수(learning-grant §5) = 학습 평균 점수 × 단계 커버율 × 0.8 + 4인 발굴 다양성 × 20 — 0~100. */
export function researchIndexOf(input: { avgLearnScore: number | null; coveredSteps: number; diversity: number }): number {
  const avg = input.avgLearnScore === null ? 0 : Math.max(0, Math.min(100, input.avgLearnScore));
  const coverage = Math.max(0, Math.min(1, input.coveredSteps / 9));
  const div = Math.max(0, Math.min(1, input.diversity));
  return Math.round(avg * coverage * 0.8 + div * 20);
}

// ── 화면 모양 ──

export type AnalystRatingKey = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SHORT_WARNING';
export const RATING_TEXT: Record<AnalystRatingKey, string> = { STRONG_BUY: 'STRONG BUY', BUY: 'BUY', HOLD: 'HOLD', SHORT_WARNING: 'SHORT WARNING' };

export interface MarketRankRow {
  rank: number;
  teamId: string;
  ticker: string;
  startupName: string;
  ink: number;
  hqTier: 1 | 2 | 3;
  priceUsd: number;
  /** 바로 앞 변동(%) — 없으면 null. */
  lastChangePct: number | null;
}

export interface MarketFinalInfo {
  at: string;
  reason: 'teacher' | 'schedule';
}

/** `GET /api/market/board` — LED 띠 · 위 띠 순위 단추 · 광장 LED · 교사 프로젝터. */
export interface MarketBoardResponse {
  classId: string;
  myTeamId: string | null;
  events: BoardEventView[];
  ranking: MarketRankRow[];
  /** 마감했으면 그 순간(순위는 얼린 값). */
  final: MarketFinalInfo | null;
  endsAt: string | null;
}

export interface TrendPoint {
  /** ISO 시각 · 주가($). */
  t: string;
  p: number;
}

/** `GET /api/market/teams/:teamId` — 공개 서랍(§5.3 '누르기'). 다른 모둠이 보는 것과 같은 정보. */
export interface MarketDrawerResponse {
  team: { id: string; startupName: string; ticker: string; ink: number; hqTier: 1 | 2 | 3; slogan: string | null };
  priceUsd: number;
  change24hPct: number;
  lastChangePct: number | null;
  rating: AnalystRatingKey;
  rank: number;
  listed: number;
  /** 프로그램 코드(가장 최근 유효 특허의 코드명) · 표적 · 질환. */
  programCode: string | null;
  targetLabel: string | null;
  diseaseLabel: string | null;
  steps: Array<{ id: StepId; state: StepState }>;
  records: { patents: number; passes: number; holds: number; approvals: number };
  recent: BoardEventView[];
  trend: TrendPoint[];
  final: { rank: number } | null;
}

export interface ProcessStepView {
  stepId: string;
  score: number;
  changePct: number | null;
  components: ProcessComponent[];
  createdAt: string;
}

export interface StandingRow {
  rank: number;
  researchRank: number;
  teamId: string;
  ticker: string;
  startupName: string;
  ink: number;
  priceUsd: number;
  resultScore: number;
  processScore: number;
  furthestStep: StepId | null;
  stepsDone: number;
  approved: boolean;
  researchIndex: number;
  /** 단계별 과정 점수(숫자만 — 신호 내역은 그 모둠 · 교사만 `process`). 학생에게는 자기 모둠 줄만 채우고 다른 모둠은 `{}`(합계 `processScore` 만). */
  processByStep: Record<string, number>;
  resultCounts: Record<string, number>;
}

/** `GET /api/market/final` — 최종 순위(마감 뒤 학생 · 교사) · 마감 전은 교사만 미리보기(`preview: true`). */
export interface MarketFinalResponse {
  classId: string;
  final: MarketFinalInfo | null;
  endsAt: string | null;
  preview: boolean;
  myTeamId: string | null;
  standings: StandingRow[];
  /** 모둠별 기업가치 추세(상장 → 지금 또는 마감). */
  trends: Array<{ teamId: string; points: TrendPoint[] }>;
  /** 내 모둠(학생) · 모든 모둠(교사)의 단계별 과정 신호. */
  process: Record<string, ProcessStepView[]>;
}

/** `POST /api/market/classes/:classId/final` — 교사. */
export type MarketFinalAction =
  | { action: 'close' }
  | { action: 'reopen' }
  | { action: 'schedule'; endsAt: string | null };

/** `POST /api/market/classes/:classId/notice` — 교사 공지 · 정정(teamId + changePct 이면 정정 소식). */
export interface MarketNoticeRequest {
  headline: string;
  teamId?: string | null;
  changePct?: number | null;
}

export const MARKET_API = {
  board: (classId?: string) => (classId ? `/api/market/board?classId=${encodeURIComponent(classId)}` : '/api/market/board'),
  /** 교사는 `classId` 를 함께(서버가 학급 담당인지 본다) — 학생은 비운다(세션의 학급). */
  drawer: (teamId: string, classId?: string) =>
    `/api/market/teams/${encodeURIComponent(teamId)}${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`,
  final: (classId?: string) => (classId ? `/api/market/final?classId=${encodeURIComponent(classId)}` : '/api/market/final'),
  finalAction: (classId: string) => `/api/market/classes/${encodeURIComponent(classId)}/final`,
  notice: (classId: string) => `/api/market/classes/${encodeURIComponent(classId)}/notice`,
} as const;

// ── 헤드라인 LLM(§5.13) ──

/** 헤드라인 시스템 프롬프트 판 — 바꾸면 올린다(v2: 2026-10-24 화폐 '크리스타' 규칙 · 기업가치 낱말). */
export const HEADLINE_VERSION = 'headline-v2';
/** 학급 하루 헤드라인 다듬기 상한 · 다듬은 줄을 받아 주는 늦음 한계(넘으면 규칙 문구 그대로). */
export const HEADLINE_DAILY_PER_CLASS = 40;
export const HEADLINE_MAX_DELAY_MS = 60_000;
/** 헤드라인을 다듬는 소식(결과 소식만 — 과정 평가 · 등기 · 공지는 규칙 문구 그대로). */
export const HEADLINE_AI_KINDS: readonly string[] = ['docking_record', 'patent', 'preclinical', 'ind_approved', 'ind_held', 'trial_pass', 'trial_held', 'approval', 'investment'];

// ── 포맷 ──

// 주가 · 시가총액도 화면에는 크리스타로만 쓴다(값은 지금처럼 달러로 저장 · 1 크리스타 = 20 센트 → $1 = 5 크리스타).
const usdToCrista = (usd: number): number => (usd * 100) / CENTS_PER_CRISTA;
/** `5,212만 크리스타` — 시가총액(주가 × 1,000,000주, 만 단위 반올림). 상장가(저장 값 10.00) → `5,000만 크리스타`. */
export const formatCapM = (priceUsd: number): string => `${Math.round(usdToCrista(priceUsd * SHARES_OUTSTANDING) / 10_000).toLocaleString('en-US')}만 크리스타`;
/** `52.10 크리스타` — 한 주 값. 상장가(저장 값 10.00) → `50.00 크리스타`. `unit: false` 면 숫자만(그래프 눈금). */
export const formatPrice = (priceUsd: number, options: { unit?: boolean } = {}): string =>
  options.unit === false ? usdToCrista(priceUsd).toFixed(2) : `${usdToCrista(priceUsd).toFixed(2)} 크리스타`;
/** `▲ 2.0%` · `▼ 4.0%` · `― 0.0%`(색 외 기호). */
export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return '';
  if (pct > 0) return `▲ ${pct.toFixed(1)}%`;
  if (pct < 0) return `▼ ${Math.abs(pct).toFixed(1)}%`;
  return '― 0.0%';
}

// ── 학생에게 보이는 문구(§5.12 — Gemini 4 Argon (High) 초안 → Claude 검토 · `.review/2026-10-24-copy-board/copy.md` 반영) ──
// 이름 규칙: 전광판 화면(위 띠 순위 단추 · LED 띠 · 공개 서랍)은 설계 §5.2 · §5.3 대로 '시가총액' · '주가', 최종 순위 창은 '기업가치'
// (한 화면 안에서 같은 개념을 두 이름으로 부르지 않는다). 돈은 `formatPrice` · `formatCapM` 결과(단위 포함)만 넣는다.

/** 결과 점수 칸 이름(최종 순위 풀이 — `RESULT_POINTS` 에서 점수 · 횟수를 끌어 쓴다). */
const RESULT_LABEL: Record<string, string> = {
  docking_record: '도킹 신기록',
  patent: '물질특허',
  preclinical: '전임상',
  ind_approved: 'IND 승인',
  trial_phase1: '1상 통과',
  trial_phase2: '2상 통과',
  trial_phase3: '3상 통과',
  approval: '허가',
  investment: '투자',
  antibody: '항체 트랙',
};
/** 3.2 마릿수 수준 · 4.1 모집 전략 — 서버가 넘기는 값(`low` · `focus` …)의 한글 이름. */
const ANIMAL_LEVEL_LABEL: Record<string, string> = { low: '적게', standard: '알맞게', high: '많이' };
const RECRUIT_TIER_LABEL: Record<string, string> = { basic: '기본', expanded: '확대', focus: '집중' };

export const MARKET_COPY = {
  board: {
    label: '학급 실시간 전광판',
    empty: '아직 올라온 소식이 없어요. 스타트업이 설립 등기를 마치면 이곳에 첫 소식이 흘러요.',
    live: 'LIVE',
    paused: '멈춤',
    pause: '멈추기',
    resume: '다시 흐르기',
    aiTag: 'AI',
    aiLabel: 'AI가 다듬은 헤드라인',
    loading: '불러오는 중…',
    aiTitle: 'AI가 다듬은 헤드라인이에요. 변동률은 규칙이 정하고, 결과 소식 한 줄만 AI(Claude)가 읽기 쉽게 다듬었어요.',
    newsAria: (headline: string) => `새 전광판 소식이에요. ${headline}`,
    finalTag: '마감됨',
  },
  rank: {
    /** 설계 §5.2 '시가총액 순위 N위 · <formatCapM>'. */
    label: '시가총액 순위',
    finalLabel: '최종 순위',
    value: (rank: number | null, listed: number, cap: string) => (rank ? `${rank}위 · ${cap}` : `— / ${listed} · ${cap}`),
    title: '누르면 우리 모둠 공개 서랍이 열려요. 다른 모둠이 보는 것과 같은 정보예요.',
    finalTitle: '수업 마감으로 확정된 최종 순위예요. 누르면 학급 최종 순위표를 볼 수 있어요.',
  },
  drawer: {
    title: (name: string) => `${name} 공개 정보`,
    close: '닫기',
    price: '주가',
    cap: '시가총액',
    change24h: '24시간 등락',
    rating: '투자의견',
    rank: '시가총액 순위',
    program: '프로그램 코드',
    target: '표적',
    disease: '질환',
    steps: '단계 진행',
    records: '기록',
    patents: '특허',
    passes: '통과',
    holds: '보류',
    approvals: '허가',
    recent: '최근 공개 소식',
    trend: '주가 추세',
    trendAria: (name: string) => `${name}의 상장 이후 주가 추세선이에요.`,
    trendEmpty: '아직 기록이 없어요.',
    listingLine: '상장가',
    mine: ' · 우리 모둠',
    scope:
      '여기에 보이는 것은 학급에 공개된 사실과 결과뿐이에요. 3.1에서 등록된 특허 분자의 구조식과 코드명은 학급 특허 원장에 공개되지만, 특허 전 후보 SMILES(분자 구조를 적은 글자) · 물성 · 점수 · 보완 횟수 · 연구 노트 · 출원서 본문 · 심사 결과 · 동물실험 자료 · 허가 전 브랜드는 그 모둠과 선생님만 봐요.',
    none: '없음',
    final: (rank: number) => `최종 ${rank}위`,
    openFinal: '최종 순위 보기',
  },
  final: {
    title: '학급 신약 개발 최종 순위',
    previewTitle: '최종 순위 미리보기(마감 전 · 선생님 전용)',
    frozenAt: (at: string) => `${at}에 마감되었어요. 이 뒤의 소식은 최종 순위를 바꾸지 않아요.`,
    reason: { teacher: '선생님이 마감했어요.', schedule: '정한 마감 시각이 되어 자동으로 마감됐어요.' } satisfies Record<MarketFinalInfo['reason'], string>,
    podium: '시상대',
    table: '전체 스타트업 최종 순위표',
    cols: { rank: '순위', team: '스타트업', cap: '기업가치', result: '결과 점수', process: '과정 점수', step: '도달 단계', approved: '허가', research: '연구 역량(순위)' },
    approvedYes: '✓ 허가',
    approvedNo: '—',
    trend: '기업가치 추세',
    trendAria: '모든 스타트업의 기업가치가 수업 동안 변해 온 추세선이에요.',
    myProcess: '우리 모둠 과정 평가',
    privateMark: '🔒',
    privateTitle: '학급에 공개하지 않는 신호(우리 모둠 · 선생님만)',
    points: '점',
    allProcess: '모둠별 과정 평가',
    notYet: '아직 마감 전이에요. 선생님이 마감하면 최종 순위가 나와요.',
    resultHint: `결과 점수(0~100점, 상한 100점)는 ${Object.entries(RESULT_POINTS)
      .map(([k, r]) => `${RESULT_LABEL[k] ?? k}(${r.points}점×${r.max})`)
      .join(' · ')}을 합산해요. 보류나 실패가 나도 기업가치가 이미 내려가므로 결과 점수는 깎지 않아요.`,
    processHint: `과정 점수(0~100점)는 단계마다 참여 · 합의 근거 · 보완 횟수 · 3R 같은 과정 신호의 가중 평균이에요. 각 단계가 끝날 때 0%에서 최대 +${PROCESS_PCT_MAX}%까지 기업가치에 이미 반영되어 있어요.`,
    researchHint: '연구 역량 지수(0~100점)는 학습 평균 점수 × 단계 커버율(끝낸 단계 ÷ 9) × 0.8 + 4인 발굴 다양성(모둠원이 서로 다른 후보를 찾은 정도) × 20으로 계산해요.',
    rankingRule: '최종 순위의 순서는 기업가치(시가총액) 순으로 매겨요. 결과 점수 · 과정 점수 · 연구 역량은 표에 함께 보여 주는 상세 내역이에요.',
    encouragement: '비록 1위가 아니더라도 보류 원인을 분석하고 프로토콜(임상시험 계획서)을 고쳐 다시 도전한 경험이 진짜 신약 개발 역량이에요. 끝까지 함께 연구한 모둠원 모두 수고했어요!',
    /** 과정 평가 줄의 항체 트랙 단계 이름 — `antibody_A1` → `항체 A1`. */
    antibodyStep: (step: string) => `항체 ${step}`,
    close: '닫기',
  },
  process: {
    headline: (ticker: string, stepId: string, title: string, facts: string[]) =>
      `◆ ${ticker} ${stepId} ${title} 과정 평가${facts.length ? ` — ${facts.join(' · ')}` : ''}`,
    facts: {
      notes: (n: number) => `연구 노트 ${n}/3칸`,
      note_authors: (n: number) => `노트 ${n}명 작성`,
      learn: (n: number, m: number) => `학습 문항 ${n}/${m}명`,
      picks: (n: number, m: number) => `표적 추천 ${n}/${m}명`,
      quorum: (n: number, m: number) => `기준 투표 ${n}/${m}명`,
      deliberation: (n: number) => `다시 논의 ${n}번`,
      claim_reasons: (n: number, m: number) => `근거 단 찜 ${n}/${m}`,
      enrichment: (x: number) => `농축도 ${x.toFixed(2)}`,
      dockers: (n: number, m: number) => `도킹 ${n}/${m}명`,
      variants: (n: number) => `구조 변형 ${n}건`,
      pick_reasons: (n: number, m: number) => `근거 칩 ${n}/${m}`,
      pickers: (n: number, m: number) => `후보 고른 사람 ${n}/${m}명`,
      novel: (n: number, m: number) => `새 물질 ${n}/${m}`,
      revisions: (n: number) => `보완 ${n}회`,
      no_reject: (n: number) => (n ? `거절 ${n}건` : '거절 없음'),
      alt_assay: (n: number) => (n ? '대체 시험 먼저' : '대체 시험 없음'),
      /** `level` = 서버 값 low · standard · high(한글 이름으로 바꿔 쓴다). */
      animal_level: (level: string) => `마릿수 수준 ${ANIMAL_LEVEL_LABEL[level] ?? level}`,
      ethics: (n: number, m: number) => `윤리 교육 ${n}/${m}명`,
      no_hold: (n: number) => (n ? `보류 ${n}번` : '보류 없음'),
      resilience: (n: number) => (n ? `보류 뒤 재도전 ${n}번` : '보류 없이 진행'),
      /** `tier` = 서버 값 basic · expanded · focus. */
      recruit: (tier: string) => `모집 전략 ${RECRUIT_TIER_LABEL[tier] ?? tier}`,
    },
    keyLabel: {
      notes: '연구 노트 3칸',
      note_authors: '노트 작성 인원',
      learn: '학습 문항 완료',
      picks: '표적 추천 참여',
      quorum: '기준 회의 정족수',
      deliberation: '다시 논의(숙의)',
      claim_reasons: '후보 찜 근거',
      enrichment: '스크리닝 농축도',
      dockers: '4인 병렬 도킹 참여',
      variants: '분자 구조 변형 시도',
      pick_reasons: '후보 근거 칩',
      pickers: '특허 후보 선정 참여',
      novel: '새 물질 발굴 비율',
      revisions: '서류 보완 횟수',
      no_reject: '특허 거절 없음',
      alt_assay: '3R 대체 시험',
      animal_level: '3R 동물 마릿수 수준',
      ethics: '동물실험 윤리 교육',
      no_hold: 'IND 보류 없음',
      resilience: '보류 뒤 재도전',
      recruit: '임상 모집 전략',
    } as Record<string, string>,
  },
  docking: (ticker: string, gene: string, kcal: number) => `◆ ${ticker} ${gene} 도킹 결합력 학급 신기록 — ${kcal.toFixed(1).replace('-', '−')} kcal/mol`,
  listing: (ticker: string, name: string) => `◆ ${ticker} 「${name}」 설립 등기 완료 — 상장가 ${formatPrice(LISTING_PRICE_USD)}`,
  /** 설계 §5.3 표 '◆ SEUM 시가총액 1위 탈환'(위 띠 순위 단추와 같은 이름). */
  rankLeader: (ticker: string) => `◆ ${ticker} 시가총액 1위 탈환`,
  finalNotice: (ticker: string | null, cap: string | null) => (ticker && cap ? `◆ ${ticker} 수업 마감 최종 1위 확정 — 시가총액 ${cap}` : '◆ 수업 마감 — 학급 최종 순위 확정'),
  reopenNotice: '◆ 수업 마감 해제 — 시가총액 변동 재개',
  teacher: {
    title: '전광판 · 마감 관리',
    projector: '프로젝터 보기',
    closeProjector: '프로젝터 닫기',
    endsAt: '마감 시각',
    schedule: '마감 시각 정하기',
    clearSchedule: '마감 시각 지우기',
    closeNow: '지금 마감',
    closeConfirm: '지금 기업가치 · 순위를 얼려 최종 순위를 정할까요? 이 뒤의 소식은 순위를 바꾸지 않아요.',
    reopen: '마감 풀기',
    reopenConfirm: '최종 순위를 지우고 수업을 다시 열까요? 마감을 풀면 소식에 따라 기업가치와 순위가 다시 움직여요.',
    finalView: '최종 순위',
    finalPreview: '최종 순위 미리보기',
    notice: '공지 · 정정 소식',
    noticeHeadline: '전광판 문구',
    noticeTeam: '정정할 모둠(공지는 비워 두세요)',
    noticePct: '기업가치 정정(%)',
    noticeSend: '올리기',
    noticePlaceholder: '예: 정정: MIRP 2상 판정 재계산',
    tier: (n: number) => `사옥 Tier ${n}`,
    finalDone: (at: string) => `마감됨 ${at}`,
    open: '진행 중',
  },
  errors: {
    notFound: '해당 학급을 찾을 수 없어요.',
    teamNotFound: '이 학급에 속한 모둠을 찾을 수 없어요.',
    finalOnlyTeacher: '아직 마감 전이라 선생님만 최종 순위 미리보기를 볼 수 있어요.',
    badEndsAt: '마감 시각은 현재 시각보다 미래여야 해요.',
    badHeadline: '전광판 문구는 1자 이상 120자 이하로 적어 주세요.',
    badPct: `기업가치 정정 폭은 −${CORRECTION_MAX_PCT}%에서 +${CORRECTION_MAX_PCT}% 사이여야 해요.`,
    alreadyFinal: '이미 마감된 학급이에요.',
    notFinal: '아직 마감하지 않은 학급이에요.',
  },
} as const;
