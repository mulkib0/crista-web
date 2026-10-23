/**
 * 항체 설계 점수 S(0~100) — 설계 §4.1 의 산식을 그대로 옮긴 순수 함수예요.
 *
 * ```
 * S = round( 0.30·붙는힘 + 0.20·안정성 + 0.30·개발가능성 + 0.10·인간화개선 + 0.10·유효신규성 )
 * T = S_원본 + 5            // 기업가치 계기의 문턱(교사가 ±5 조정)
 * ```
 *
 * 꼼수를 막는 장치(§4.1 · §10 S4 · S17)
 * - **붙는 힘은 기준점 65 의 절대 스케일**이에요 — 원본 그대로 제출하면 65, 계면 밖만 건드려도 65 예요.
 * - **유효 변이**만 신규성을 올려요 — 계면 자리도 아니고 다양성이 낮지도 않은 자리를 아무리 바꿔도 `m_eff` 가 안 늘어요.
 * - **전하 쌓기**는 붙는 힘에서 상한(50%)에 걸리고, 개발가능성에서 양전하 패치로 되돌아와요.
 * - **감점은 항 안에서 하고 `clamp` 은 맨 끝에 한 번만** 둬요(1판은 원본 제출 시 음수가 될 수 있었어요).
 *
 * 한계 문구(화면에 반드시 함께 보여요)
 * - `이 점수는 서열과 통계 지표로 계산한 교육용 지표예요. 실제 결합력(KD)이나 임상 성공 가능성을 뜻하지 않아요.`
 */
import {
  ANTIBODY_FORMULA_VERSION,
  ANTIBODY_SCORE_WEIGHTS,
  SCORE_THRESHOLD_MARGIN,
  type AntibodyMutation,
  type AntibodyScoreWeights,
  type PreviewMetrics,
  type Provenance,
  type ScoreView,
} from '@crista-web/web-contract';
import {
  CDR_TOTAL_LENGTH_REFERENCE_QUANTILES,
  HUMANIZATION_BASE,
  HUMANIZATION_SLOPE,
  NOVELTY_CLONE_PENALTY,
  NOVELTY_DUPLICATE_WEIGHT,
  NOVELTY_SIMILARITY_FLOOR,
  NOVELTY_TAU,
  NOVELTY_UNREALISTIC_PENALTY,
  POSITIVE_PATCH_MIN_DENSITY,
  POSITIVE_PATCH_PENALTY,
  REFERENCE_SOURCE,
  RISK_ALERT_TAIL,
  RISK_WATCH_TAIL,
  bandPoints,
  percentileFromQuantiles,
} from './constants.ts';
import { isoelectricPoints } from './charge.ts';
import { isLocked } from './diversity.ts';
import type { LiabilityHit } from './liabilities.ts';

/** 점수 화면에 늘 붙는 한계 문구 — 계약의 `ScoreView.caveat` 에 그대로 실어요. */
export const SCORE_CAVEAT =
  '이 점수는 서열과 통계 지표로 계산한 교육용 지표예요. 실제 결합력(KD)이나 임상 성공 가능성을 뜻하지 않아요.';

export interface ScoreInput {
  /** `bind-score.ts` 가 낸 붙는 힘 점수 0~100 과 전하쌍 기여 비율이에요. */
  bind: { score: number; chargePairShare: number };
  stability: {
    /** 기름진 겉면 정도의 백분위 0~1 — 모르면 `null` 이에요. */
    greasyPercentile: number | null;
    /** 두 사슬 전하 궁합의 백분위 0~1 — 경쇄가 없거나 모르면 `null` 이에요. */
    chainChargePercentile: number | null;
    /** pI — 모르면 `null` 이에요. */
    pi: number | null;
  };
  developability: {
    liabilities: readonly LiabilityHit[];
    /** 양전하 패치(승인 항체 분포 상위 5% 밖)인지예요. */
    positivePatch: boolean;
  };
  humanization: {
    /** 설계의 사람 유전자 동일성(%) — 모르면 `null` 이에요. */
    designPercent: number | null;
    /** 원본 비교군의 사람 유전자 동일성(%). */
    parentPercent: number | null;
  };
  novelty: {
    /** 유효 변이 수 `m_eff`. */
    effectiveMutations: number;
    /** 같은 학급 · 같은 표적에서 다른 모둠과 겹친 비율 0~1. */
    duplicateShare: number;
    /** 최근접 실측 항체 유사도(0~100) — 모르면 `null` 이에요. */
    nearestSimilarity: number | null;
  };
  /** 점수에 넣지 않는 경고 — 다양성 낮은 자리를 건드렸다 · 음전하 패치 등이에요. */
  risks?: readonly string[];
}

export interface ScoreParts {
  parts: AntibodyScoreWeights;
  penalties: ScoreView['penalties'];
  risks: string[];
  /** 가중합을 소수점 버려 정수로 만든 값 0~100. */
  score: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** 값이 없는 항은 **빼고 나머지로 평균**을 내요 — 모르는 값을 0 이나 50 으로 꾸미지 않아요. */
const meanOfKnown = (values: readonly (number | null)[]): number | null => {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return null;
  return known.reduce((s, v) => s + v, 0) / known.length;
};

/**
 * **유효 변이 수** `m_eff`(§4.1e) — ① 계면 잔기쌍에 든 자리이거나 ② 다양성이 낮지 **않은**(= 바꿔도 되는) 자리예요.
 * 다양성 백분위를 모르는 자리는 ②로 세지 않아요(모르는 값을 유리하게 쓰지 않아요).
 */
export const effectiveMutations = (
  mutations: readonly AntibodyMutation[],
  interfaceKeys: ReadonlySet<string>,
  diversityPercentile: (chain: 'H' | 'L', pos: number) => number | null,
): number => {
  let n = 0;
  for (const m of mutations) {
    if (interfaceKeys.has(`${m.chain}:${m.pos}`)) {
      n += 1;
      continue;
    }
    const pct = diversityPercentile(m.chain, m.pos);
    if (pct !== null && !isLocked(pct)) n += 1;
  }
  return n;
};

/** 다섯 항을 각각 0~100 으로 내고 가중합해요. 원본 비교군도 같은 함수로 계산해요. */
export const antibodyScoreParts = (
  input: ScoreInput,
  weights: AntibodyScoreWeights = ANTIBODY_SCORE_WEIGHTS,
): ScoreParts => {
  const penalties: ScoreView['penalties'] = [];
  const risks: string[] = [...(input.risks ?? [])];

  // (a) 붙는 힘 — `bind-score.ts` 가 이미 0~100 으로 냈어요.
  const binding = clamp(input.bind.score, 0, 100);

  // (b) 안정성 — 기름진 겉면 · 두 사슬 전하 궁합 · pI 세 항의 평균(아는 항만).
  const stabilityTerms: (number | null)[] = [
    input.stability.greasyPercentile === null ? null : bandPoints(input.stability.greasyPercentile),
    input.stability.chainChargePercentile === null ? null : bandPoints(input.stability.chainChargePercentile),
    input.stability.pi === null ? null : isoelectricPoints(input.stability.pi),
  ];
  const stability = clamp(meanOfKnown(stabilityTerms) ?? 0, 0, 100);

  // (c) 개발가능성 — 감점식. 감점 항목은 화면에 '왜 깎였는지' 목록으로 보여요.
  const byLabel = new Map<string, { points: number; fixable: 'easy' | 'hard' }>();
  for (const hit of input.developability.liabilities) {
    const label = `${hit.motif} (${hit.chain}${hit.pos})`;
    byLabel.set(label, { points: hit.penalty, fixable: hit.fixable });
  }
  let developabilityPenalty = 0;
  for (const [label, { points, fixable }] of byLabel) {
    developabilityPenalty += points;
    penalties.push({ label, points, fixable });
  }
  if (input.developability.positivePatch) {
    developabilityPenalty += POSITIVE_PATCH_PENALTY;
    penalties.push({ label: '양전하가 한곳에 몰려 있어요', points: POSITIVE_PATCH_PENALTY, fixable: 'easy' });
    risks.push('양전하 패치가 많아요 — 여러 단백질에 달라붙거나 몸에서 빨리 사라질 수 있어요.');
  }
  const developability = clamp(100 - developabilityPenalty, 0, 100);

  // (d) 인간화 개선 — **원본 대비 변화**만 봐요. 절대 동일성은 표시만 해요(§4.1d).
  const dh =
    input.humanization.designPercent === null || input.humanization.parentPercent === null
      ? null
      : input.humanization.designPercent - input.humanization.parentPercent;
  const humanization = dh === null ? HUMANIZATION_BASE : clamp(HUMANIZATION_BASE + HUMANIZATION_SLOPE * dh, 0, 100);

  // (e) 유효 신규성 — 감점은 항 안에서 하고 `clamp` 은 맨 끝에 한 번만 둬요(§10 S17).
  const mEff = Math.max(0, input.novelty.effectiveMutations);
  const similarity = input.novelty.nearestSimilarity;
  let clonePenalty = 0;
  if (similarity !== null) {
    if (similarity >= 100) {
      clonePenalty = NOVELTY_CLONE_PENALTY;
      risks.push('기존 항체와 서열이 같아요 — 새로 설계한 것으로 보기 어려워요.');
    } else if (similarity < NOVELTY_SIMILARITY_FLOOR) {
      clonePenalty = NOVELTY_UNREALISTIC_PENALTY;
      risks.push('실측 항체 가운데 비슷한 것이 없어요 — 실제로 만들기 어려운 서열일 수 있어요.');
    }
  }
  const duplicateShare = clamp(input.novelty.duplicateShare, 0, 1);
  const novelty = clamp(
    100 * (1 - Math.exp(-mEff / NOVELTY_TAU)) * (1 - NOVELTY_DUPLICATE_WEIGHT * duplicateShare) - clonePenalty,
    0,
    100,
  );

  const parts: AntibodyScoreWeights = {
    binding: Number(binding.toFixed(2)),
    stability: Number(stability.toFixed(2)),
    developability: Number(developability.toFixed(2)),
    humanization: Number(humanization.toFixed(2)),
    novelty: Number(novelty.toFixed(2)),
  };

  const weighted =
    weights.binding * parts.binding +
    weights.stability * parts.stability +
    weights.developability * parts.developability +
    weights.humanization * parts.humanization +
    weights.novelty * parts.novelty;

  penalties.sort((a, b) => (b.points - a.points !== 0 ? b.points - a.points : a.label < b.label ? -1 : 1));

  return { parts, penalties, risks, score: clamp(Math.floor(weighted), 0, 100) };
};

/**
 * 경고 라벨 — **점수에 넣지 않아요**(§4.1c · §10 S5). 자연 분포에서 얼마나 벗어났는지만 보여 줘요.
 * 꼬리 2.5% 밖은 `alert`, 10% 밖은 `watch`, 그 안은 `ok` 예요. 백분위를 모르는 값은 **아예 라벨을 만들지 않아요**.
 */
export const antibodyRiskFlags = (input: {
  cdrTotalLength: number | null;
  greasySurface: number | null;
  greasyPercentile: number | null;
  chainChargeProduct: number | null;
  chainChargePercentile: number | null;
  positivePatchDensity: number | null;
  negativePatchDensity: number | null;
}): PreviewMetrics['riskFlags'] => {
  const flags: PreviewMetrics['riskFlags'] = [];
  const tail = (percentile: number): 'ok' | 'watch' | 'alert' => {
    if (percentile < RISK_ALERT_TAIL || percentile > 1 - RISK_ALERT_TAIL) return 'alert';
    if (percentile < RISK_WATCH_TAIL || percentile > 1 - RISK_WATCH_TAIL) return 'watch';
    return 'ok';
  };

  if (input.cdrTotalLength !== null) {
    const pct = percentileFromQuantiles(input.cdrTotalLength, CDR_TOTAL_LENGTH_REFERENCE_QUANTILES);
    if (pct !== null) {
      flags.push({
        metric: 'cdrLength',
        level: tail(pct),
        value: input.cdrTotalLength,
        note: `CDR 을 모두 더한 길이예요(IMGT 기준). 실측 항체 분포에서 ${Math.round(pct * 100)}% 자리예요.`,
      });
    }
  }
  if (input.greasySurface !== null && input.greasyPercentile !== null) {
    flags.push({
      metric: 'greasySurface',
      level: tail(input.greasyPercentile),
      value: input.greasySurface,
      note: `CDR 주변이 얼마나 기름진지예요. 승인 항체 분포에서 ${Math.round(input.greasyPercentile * 100)}% 자리예요. 원전 값과 다르니 순위만 보세요.`,
    });
  }
  if (input.chainChargeProduct !== null && input.chainChargePercentile !== null) {
    flags.push({
      metric: 'chainChargeProduct',
      level: tail(input.chainChargePercentile),
      value: input.chainChargeProduct,
      note: `두 사슬의 순전하를 곱한 값이에요(pH 5.5). 승인 항체 분포에서 ${Math.round(input.chainChargePercentile * 100)}% 자리예요.`,
    });
  }
  if (input.positivePatchDensity !== null) {
    flags.push({
      metric: 'positivePatch',
      level: input.positivePatchDensity >= POSITIVE_PATCH_MIN_DENSITY ? 'alert' : 'ok',
      value: input.positivePatchDensity,
      note: 'CDR 주변 9칸에서 K · R 이 가장 몰린 정도예요. 많이 몰리면 여러 단백질에 달라붙을 수 있어요.',
    });
  }
  if (input.negativePatchDensity !== null) {
    flags.push({
      metric: 'negativePatch',
      level: input.negativePatchDensity >= POSITIVE_PATCH_MIN_DENSITY ? 'watch' : 'ok',
      value: input.negativePatchDensity,
      note: 'CDR 주변 9칸에서 D · E 가 가장 몰린 정도예요. 이 값은 점수에 넣지 않아요.',
    });
  }
  return flags;
};

/** 점수 계산에 쓴 출처 · 근사 여부 — 모든 결과에 배지가 붙게 응답에 함께 실어요(§3.5). */
export const scoreProvenance = (): Provenance[] => [
  {
    source: 'server-calc',
    label: '센 값',
    detail:
      '순전하 · pI · 두 사슬 전하 궁합 · CDR 길이 · 약점 모티프 개수 · 사람 유전자 동일성은 서열에서 그대로 센 값이에요. 같은 서열이면 늘 같은 값이에요.',
    approx: false,
  },
  {
    source: 'edu-approx',
    label: '모형으로 추정한 값',
    detail: `붙는 힘 점수 · 기름진 겉면 정도 · 레퍼토리 다양성은 통계표와 서열 창으로 대신 계산한 값이라 원전 값과 달라요. ${REFERENCE_SOURCE}`,
    approx: true,
  },
];

/**
 * 설계 점수 한 판 — 원본 비교군을 **같은 함수로** 계산해 문턱 `T = S_원본 + 5` 를 함께 내요.
 * `thresholdMargin` 은 교사 설정(기본 5 · ±5 조정)이에요.
 */
export const antibodyScore = (
  design: ScoreInput,
  parent: ScoreInput,
  weights: AntibodyScoreWeights = ANTIBODY_SCORE_WEIGHTS,
  thresholdMargin: number = SCORE_THRESHOLD_MARGIN,
): ScoreView => {
  const designParts = antibodyScoreParts(design, weights);
  const parentParts = antibodyScoreParts(parent, weights);
  return {
    score: designParts.score,
    parts: designParts.parts,
    weights,
    penalties: designParts.penalties,
    risks: designParts.risks,
    parentScore: parentParts.score,
    threshold: parentParts.score + thresholdMargin,
    effectiveMutations: Math.max(0, design.novelty.effectiveMutations),
    formulaVersion: ANTIBODY_FORMULA_VERSION,
    caveat: SCORE_CAVEAT,
    provenance: scoreProvenance(),
  };
};
