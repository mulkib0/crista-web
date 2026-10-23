/**
 * 항체 설계 점수 · 설계 적합도 — 설계 §4.1 · §4.2 의 산식을 고정해요(묶음 3).
 *
 * 꼼수 차단 장치를 산식 수준에서 고정하는 것이 이 파일의 목적이에요:
 * 기준점 65 절대 스케일 · 유효 변이 정의 · 전하쌍 50% 상한 · 감점은 항 안에서 · 문턱 `T = S_원본 + 5`.
 * 모두 순수 함수라 네트워크 · DB · 시각 · 난수를 쓰지 않아요.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ANTIBODY_FORMULA_VERSION,
  ANTIBODY_GRADE_MIN,
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_WEIGHT_KEYS,
  CONFIDENCE_MIN_FOR_COMPLEX,
  SCORE_THRESHOLD_MARGIN,
  antibodyGrade,
  scoreWeightsOk,
  scoreWeightsSum,
} from '@crista-web/web-contract';
import type { AntibodyMutation, AntibodyScoreWeights } from '@crista-web/web-contract';
import {
  BIND_BASE,
  BIND_GAIN_PER_MUTATION,
  BIND_SLOPE,
  CHARGE_PAIR_CAP,
  FIT_BIND_WEIGHT,
  FIT_INTERFACE_WEIGHT,
  HUMANIZATION_BASE,
  HUMANIZATION_SLOPE,
  NOVELTY_CLONE_PENALTY,
  NOVELTY_TAU,
  NOVELTY_UNREALISTIC_PENALTY,
  POSITIVE_PATCH_PENALTY,
} from '../src/features/antibody/constants.ts';
import { bindRaw, bindScore, capCharge, isChargePair, type InterfaceContact } from '../src/features/antibody/bind-score.ts';
import { designFit, fitDelta, passesConfidenceGate } from '../src/features/antibody/fit.ts';
import {
  SCORE_CAVEAT,
  antibodyRiskFlags,
  antibodyScore,
  antibodyScoreParts,
  effectiveMutations,
  scoreProvenance,
  type ScoreInput,
} from '../src/features/antibody/score.ts';
import type { LiabilityHit } from '../src/features/antibody/liabilities.ts';

// ── 시험용 입력 ──────────────────────────────────────────────────────────────

/** 계면 잔기쌍 — 항체 K/A/S 가 항원 E/D/K 와 맞닿은 꼴이에요. */
const PAIRS: InterfaceContact[] = [
  { chain: 'H', pos: 10, aa: 'A', agAa: 'E' },
  { chain: 'H', pos: 11, aa: 'S', agAa: 'D' },
  { chain: 'H', pos: 12, aa: 'G', agAa: 'Y' },
  { chain: 'L', pos: 20, aa: 'T', agAa: 'K' },
];

const mut = (chain: 'H' | 'L', pos: number, wt: string, m: string): AntibodyMutation => ({ chain, pos, wt, mut: m });

/** 원본 비교군 — 변이가 없고 모든 지표가 가운데 밴드에 있는 꼴이에요. */
const parent = (): ScoreInput => ({
  bind: { score: BIND_BASE, chargePairShare: 0 },
  stability: { greasyPercentile: 0.5, chainChargePercentile: 0.5, pi: 7.5 },
  developability: { liabilities: [], positivePatch: false },
  humanization: { designPercent: 80, parentPercent: 80 },
  novelty: { effectiveMutations: 0, duplicateShare: 0, nearestSimilarity: 100 },
});

const liability = (over: Partial<LiabilityHit> = {}): LiabilityHit => ({
  motif: 'N[GS]',
  severity: 'high',
  chain: 'H',
  pos: 30,
  fixable: 'easy',
  penalty: 8,
  note: '시험용',
  ...over,
});

// ── 가중치 ───────────────────────────────────────────────────────────────────

describe('가중치', () => {
  test('기본 가중치는 0.30 · 0.20 · 0.30 · 0.10 · 0.10 이고 합이 1.00 이다', () => {
    assert.deepEqual(ANTIBODY_SCORE_WEIGHTS, {
      binding: 0.3,
      stability: 0.2,
      developability: 0.3,
      humanization: 0.1,
      novelty: 0.1,
    });
    assert.ok(Math.abs(scoreWeightsSum(ANTIBODY_SCORE_WEIGHTS) - 1) < 1e-9);
    assert.ok(scoreWeightsOk(ANTIBODY_SCORE_WEIGHTS));
    assert.equal(ANTIBODY_WEIGHT_KEYS.length, 5);
  });

  test('합이 1.00 이 아니면 교사 설정에서 막힌다', () => {
    const bad: AntibodyScoreWeights = { binding: 0.5, stability: 0.2, developability: 0.3, humanization: 0.1, novelty: 0.1 };
    assert.ok(!scoreWeightsOk(bad));
    assert.ok(!scoreWeightsOk({ ...ANTIBODY_SCORE_WEIGHTS, binding: -0.1, stability: 0.6 }));
    assert.ok(!scoreWeightsOk({ ...ANTIBODY_SCORE_WEIGHTS, binding: Number.NaN }));
  });
});

// ── 붙는 힘 ──────────────────────────────────────────────────────────────────

describe('붙는 힘 — 기준점 65 절대 스케일', () => {
  test('변이가 없으면 65 점 · raw 0', () => {
    const r = bindScore(PAIRS, [], 0.46, 0);
    assert.equal(r.raw, 0);
    assert.equal(r.score, BIND_BASE);
    assert.equal(r.chargePairShare, 0);
  });

  test('계면 밖만 건드린 설계도 65 점에서 움직이지 않는다', () => {
    const r = bindScore(PAIRS, [mut('H', 99, 'A', 'W'), mut('L', 98, 'G', 'F')], 0.46, 2);
    assert.equal(r.raw, 0);
    assert.equal(r.score, BIND_BASE);
  });

  test('σ 를 모르면(0 · 무한) 65 를 그대로 둔다 — 0 으로 나누지 않는다', () => {
    for (const sigma of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], sigma, 1);
      assert.equal(r.score, BIND_BASE);
      assert.equal(r.z, 0);
    }
  });

  test('유리한 변이는 65 위로 · 불리한 변이는 65 아래로 간다', () => {
    // A→K 는 항원 E 와 전하쌍이 되어 통계값이 좋아지고(−1.04), A→L 은 나빠져요(+0.46).
    const better = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], 0.46, 1);
    const worse = bindScore(PAIRS, [mut('H', 10, 'A', 'L')], 0.46, 1);
    assert.ok(better.score > BIND_BASE, `better=${better.score}`);
    assert.ok(worse.score < BIND_BASE, `worse=${worse.score}`);
  });

  test('`z = −perMut/σ` · `붙는힘 = 65 + 12·z` 를 유효 변이 폭 안에서 따른다', () => {
    // 유효 변이 20개면 폭(±3·20)이 넓어 상한이 걸리지 않아요 — 산식을 그대로 확인할 수 있어요.
    const r = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], 0.5, 20);
    assert.ok(Math.abs(r.z - -r.perMut / 0.5) < 1e-6);
    assert.ok(Math.abs(r.score - (BIND_BASE + BIND_SLOPE * r.z)) < 0.01);
  });

  test('유효 변이 1개가 움직일 수 있는 폭은 ±3 점이다(§12 — 한 자리 꼼수 차단)', () => {
    // 그냥 두면 `65 + 12·z` 가 100 까지 올라가요(한 글자로 가중치 30% 만점). 폭이 그걸 막아요.
    const one = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], 0.1, 1);
    assert.ok(Math.abs(BIND_BASE + BIND_SLOPE * one.z) > BIND_BASE + 3, '산식만으로는 폭을 넘어요');
    assert.equal(one.score, BIND_BASE + BIND_GAIN_PER_MUTATION);
    const bad = bindScore(PAIRS, [mut('H', 10, 'A', 'L')], 0.1, 1);
    assert.equal(bad.score, BIND_BASE - BIND_GAIN_PER_MUTATION);
  });

  test('변이 수를 늘려 변이 1개당 효과를 쌓지 못한다 — `perMut` 로 나눈다', () => {
    const one = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], 0.46, 1);
    const three = bindScore(
      PAIRS,
      [mut('H', 10, 'A', 'K'), mut('H', 11, 'S', 'R'), mut('L', 20, 'T', 'E')],
      0.46,
      3,
    );
    assert.ok(Math.abs(three.rawBeforeCap) > Math.abs(one.rawBeforeCap)); // 합은 커지지만
    assert.ok(Math.abs(three.perMut) <= Math.abs(one.perMut)); // 변이 1개당 효과는 커지지 않아요
    assert.ok(Math.abs(three.z) <= Math.abs(one.z));
  });

  test('20종 밖 글자가 섞인 변이는 그 쌍을 세지 않는다', () => {
    const r = bindRaw(PAIRS, [mut('H', 10, 'A', 'X')]);
    assert.equal(r.usedPairs, 0);
    assert.equal(r.raw, 0);
  });
});

describe('전하쌍 상한 50%', () => {
  test('전하쌍을 가린다', () => {
    assert.ok(isChargePair('K', 'E'));
    assert.ok(isChargePair('D', 'R'));
    assert.ok(!isChargePair('A', 'E'));
    assert.ok(!isChargePair('K', 'R'));
  });

  test('전하쌍 기여가 |raw| 의 50% 를 넘으면 초과분을 버린다', () => {
    assert.equal(CHARGE_PAIR_CAP, 0.5);
    // 전하쌍 기여가 전부(−2 중 −2)면 절반(−1)만 남아요.
    assert.equal(capCharge(-2, -2), -1);
    // 절반 이하면 그대로예요.
    assert.equal(capCharge(-2, -1), -2);
    assert.equal(capCharge(-2, -0.5), -2);
    assert.equal(capCharge(0, 0), 0);
    // 부호가 반대여도 같은 규칙이에요.
    assert.equal(capCharge(2, 2), 1);
  });

  test("'전하쌍으로 번 점수' 비율을 분해해 돌려준다", () => {
    const r = bindScore(PAIRS, [mut('H', 10, 'A', 'K')], 0.46, 1);
    assert.ok(r.chargePairShare > 0.9, `share=${r.chargePairShare}`);
    assert.ok(Math.abs(r.raw) < Math.abs(r.rawBeforeCap)); // 상한이 깎았어요
  });
});

// ── 유효 변이 ────────────────────────────────────────────────────────────────

describe('유효 변이 수 `m_eff`', () => {
  const interfaceKeys = new Set(['H:10', 'H:11']);
  const diversity = (chain: 'H' | 'L', pos: number): number | null => {
    if (pos === 50) return 0.9; // 많이 갈리는 자리 → 바꿔도 돼요
    if (pos === 51) return 0.1; // 거의 안 갈리는 자리 → 손대면 위험해요
    return null; // 모르는 자리
  };

  test('계면 자리는 유효 변이다', () => {
    assert.equal(effectiveMutations([mut('H', 10, 'A', 'K')], interfaceKeys, diversity), 1);
  });

  test('다양성이 낮지 않은 자리도 유효 변이다', () => {
    assert.equal(effectiveMutations([mut('H', 50, 'A', 'K')], interfaceKeys, diversity), 1);
  });

  test('계면도 아니고 다양성도 낮은 자리는 세지 않는다 — 꼼수를 막는 정의다', () => {
    assert.equal(effectiveMutations([mut('H', 51, 'A', 'K')], interfaceKeys, diversity), 0);
  });

  test('다양성을 모르는 자리는 유리하게 세지 않는다', () => {
    assert.equal(effectiveMutations([mut('H', 77, 'A', 'K')], interfaceKeys, diversity), 0);
  });
});

// ── 다섯 항 ──────────────────────────────────────────────────────────────────

describe('다섯 항', () => {
  test('원본 그대로면 붙는힘 65 · 인간화 50 · 신규성 0', () => {
    const p = antibodyScoreParts(parent());
    assert.equal(p.parts.binding, 65);
    assert.equal(p.parts.humanization, HUMANIZATION_BASE);
    assert.equal(p.parts.novelty, 0);
    assert.equal(p.parts.developability, 100);
  });

  test('안정성은 아는 항만 평균한다 — 모르는 값을 0 이나 50 으로 꾸미지 않는다', () => {
    const both = antibodyScoreParts({
      ...parent(),
      stability: { greasyPercentile: 0.5, chainChargePercentile: 0.5, pi: 7.5 },
    });
    const onlyPi = antibodyScoreParts({
      ...parent(),
      stability: { greasyPercentile: null, chainChargePercentile: null, pi: 7.5 },
    });
    assert.equal(both.parts.stability, 100);
    assert.equal(onlyPi.parts.stability, 100);
    const nothing = antibodyScoreParts({
      ...parent(),
      stability: { greasyPercentile: null, chainChargePercentile: null, pi: null },
    });
    assert.equal(nothing.parts.stability, 0);
  });

  test('백분위가 꼬리로 갈수록 안정성 점수가 내려간다', () => {
    const mid = antibodyScoreParts({ ...parent(), stability: { greasyPercentile: 0.5, chainChargePercentile: 0.5, pi: 7.5 } });
    const edge = antibodyScoreParts({ ...parent(), stability: { greasyPercentile: 0.99, chainChargePercentile: 0.99, pi: 7.5 } });
    assert.ok(edge.parts.stability < mid.parts.stability);
  });

  test('개발가능성은 감점식이고 감점 목록을 그대로 보여 준다', () => {
    const p = antibodyScoreParts({
      ...parent(),
      developability: { liabilities: [liability(), liability({ pos: 31, penalty: 4, severity: 'medium' })], positivePatch: false },
    });
    assert.equal(p.parts.developability, 100 - 8 - 4);
    assert.equal(p.penalties.length, 2);
    assert.equal(p.penalties[0]?.points, 8);
    assert.ok(p.penalties[0]?.label.includes('N[GS]'));
  });

  test('같은 자리 같은 모티프를 두 번 깎지 않는다', () => {
    const p = antibodyScoreParts({
      ...parent(),
      developability: { liabilities: [liability(), liability()], positivePatch: false },
    });
    assert.equal(p.parts.developability, 100 - 8);
  });

  test('양전하 패치는 감점 + 경고 둘 다 남긴다', () => {
    const p = antibodyScoreParts({ ...parent(), developability: { liabilities: [], positivePatch: true } });
    assert.equal(p.parts.developability, 100 - POSITIVE_PATCH_PENALTY);
    assert.ok(p.risks.some((r) => r.includes('양전하')));
  });

  test('개발가능성은 0 아래로 내려가지 않는다', () => {
    const many = Array.from({ length: 30 }, (_, i) => liability({ pos: i + 1 }));
    const p = antibodyScoreParts({ ...parent(), developability: { liabilities: many, positivePatch: true } });
    assert.equal(p.parts.developability, 0);
  });

  test('인간화 개선은 원본 대비 변화만 본다 — 원본을 잘 고르기로 점수를 먼저 챌 수 없다', () => {
    const lowAbsolute = antibodyScoreParts({ ...parent(), humanization: { designPercent: 55, parentPercent: 55 } });
    const highAbsolute = antibodyScoreParts({ ...parent(), humanization: { designPercent: 95, parentPercent: 95 } });
    assert.equal(lowAbsolute.parts.humanization, highAbsolute.parts.humanization);
    const better = antibodyScoreParts({ ...parent(), humanization: { designPercent: 65, parentPercent: 55 } });
    assert.equal(better.parts.humanization, HUMANIZATION_BASE + HUMANIZATION_SLOPE * 10);
    const worse = antibodyScoreParts({ ...parent(), humanization: { designPercent: 45, parentPercent: 55 } });
    assert.equal(worse.parts.humanization, 0);
  });

  test('동일성을 모르면 인간화 개선은 기준점 50 이다', () => {
    const p = antibodyScoreParts({ ...parent(), humanization: { designPercent: null, parentPercent: 80 } });
    assert.equal(p.parts.humanization, HUMANIZATION_BASE);
  });

  test('유효 신규성은 `m_eff` 로 오르고 중복 · 복제로 깎인다 — clamp 은 맨 끝에 한 번만', () => {
    const base = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 4, duplicateShare: 0, nearestSimilarity: 90 },
    });
    const expected = 100 * (1 - Math.exp(-4 / NOVELTY_TAU));
    assert.ok(Math.abs(base.parts.novelty - expected) < 0.01);

    const duplicated = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 4, duplicateShare: 1, nearestSimilarity: 90 },
    });
    assert.ok(Math.abs(duplicated.parts.novelty - expected * 0.5) < 0.01);

    // 원본 복제(유사도 100)는 감점이 들어가도 음수가 되지 않아요(1판 버그 · §10 S17).
    const clone = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 0, duplicateShare: 0, nearestSimilarity: 100 },
    });
    assert.equal(clone.parts.novelty, 0);
    assert.ok(clone.risks.some((r) => r.includes('기존 항체')));
    assert.ok(NOVELTY_CLONE_PENALTY > NOVELTY_UNREALISTIC_PENALTY);
  });

  test('실측 항체 가운데 비슷한 것이 없으면 경고 + 감점', () => {
    const p = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 8, duplicateShare: 0, nearestSimilarity: 50 },
    });
    assert.ok(p.risks.some((r) => r.includes('실측 항체')));
    const ok = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 8, duplicateShare: 0, nearestSimilarity: 80 },
    });
    assert.ok(ok.parts.novelty > p.parts.novelty);
  });

  test('유사도를 모르면 복제 감점을 하지 않는다', () => {
    const p = antibodyScoreParts({
      ...parent(),
      novelty: { effectiveMutations: 4, duplicateShare: 0, nearestSimilarity: null },
    });
    assert.ok(p.parts.novelty > 0);
    assert.equal(p.risks.length, 0);
  });
});

// ── 총점 · 문턱 ──────────────────────────────────────────────────────────────

describe('총점 · 문턱', () => {
  test('가중합을 소수점 버려 정수로 낸다', () => {
    const p = antibodyScoreParts(parent());
    const expected = Math.floor(
      0.3 * p.parts.binding + 0.2 * p.parts.stability + 0.3 * p.parts.developability + 0.1 * p.parts.humanization + 0.1 * p.parts.novelty,
    );
    assert.equal(p.score, expected);
    assert.ok(Number.isInteger(p.score));
  });

  test('문턱은 `T = S_원본 + 5` 이고 교사가 ±5 조정한다', () => {
    const view = antibodyScore(parent(), parent());
    assert.equal(SCORE_THRESHOLD_MARGIN, 5);
    assert.equal(view.threshold, view.parentScore + 5);
    assert.equal(antibodyScore(parent(), parent(), ANTIBODY_SCORE_WEIGHTS, 10).threshold, view.parentScore + 10);
    assert.equal(antibodyScore(parent(), parent(), ANTIBODY_SCORE_WEIGHTS, 0).threshold, view.parentScore);
  });

  test('원본 그대로 제출하면 문턱을 못 넘는다', () => {
    const view = antibodyScore(parent(), parent());
    assert.equal(view.score, view.parentScore);
    assert.ok(view.score < view.threshold);
  });

  test('교사가 가중치를 바꾸면 총점이 따라 바뀐다', () => {
    const heavy: AntibodyScoreWeights = { binding: 0.6, stability: 0.1, developability: 0.2, humanization: 0.05, novelty: 0.05 };
    assert.ok(scoreWeightsOk(heavy));
    const a = antibodyScore(parent(), parent());
    const b = antibodyScore(parent(), parent(), heavy);
    assert.notEqual(a.score, b.score);
    assert.deepEqual(b.weights, heavy);
  });

  test('응답에 산식 판 · 한계 문구 · 배지가 늘 실린다(§3.5)', () => {
    const view = antibodyScore(parent(), parent());
    assert.equal(view.formulaVersion, ANTIBODY_FORMULA_VERSION);
    assert.equal(view.caveat, SCORE_CAVEAT);
    assert.match(view.caveat, /교육용/);
    assert.ok(view.provenance.length >= 2);
    assert.ok(view.provenance.some((p) => p.approx));
    assert.ok(view.provenance.some((p) => !p.approx));
    for (const p of view.provenance) {
      assert.ok(p.label.length > 0);
      assert.ok(p.detail.length > 0);
    }
    assert.deepEqual(scoreProvenance(), view.provenance);
  });

  test('0~100 밖으로 나가지 않는다', () => {
    const terrible: ScoreInput = {
      bind: { score: 0, chargePairShare: 1 },
      stability: { greasyPercentile: 1, chainChargePercentile: 0, pi: 2 },
      developability: { liabilities: Array.from({ length: 40 }, (_, i) => liability({ pos: i + 1 })), positivePatch: true },
      humanization: { designPercent: 10, parentPercent: 90 },
      novelty: { effectiveMutations: 0, duplicateShare: 1, nearestSimilarity: 100 },
    };
    const view = antibodyScore(terrible, parent());
    assert.ok(view.score >= 0 && view.score <= 100);
    for (const key of ANTIBODY_WEIGHT_KEYS) {
      const v = view.parts[key];
      assert.ok(v >= 0 && v <= 100, `${key}=${v}`);
    }
  });
});

// ── 결정성 ───────────────────────────────────────────────────────────────────

describe('결정성', () => {
  test('같은 입력 1,000회에 같은 출력(§4.1f 회귀 8)', () => {
    const design: ScoreInput = {
      bind: { score: 72.5, chargePairShare: 0.4 },
      stability: { greasyPercentile: 0.62, chainChargePercentile: 0.31, pi: 8.2 },
      developability: { liabilities: [liability(), liability({ pos: 44, penalty: 4, severity: 'medium' })], positivePatch: false },
      humanization: { designPercent: 84.5, parentPercent: 80 },
      novelty: { effectiveMutations: 3, duplicateShare: 0.25, nearestSimilarity: 88 },
    };
    const first = JSON.stringify(antibodyScore(design, parent()));
    for (let i = 0; i < 1000; i += 1) assert.equal(JSON.stringify(antibodyScore(design, parent())), first);
  });

  test('붙는 힘 · 적합도도 1,000회 같은 값', () => {
    const mutations = [mut('H', 10, 'A', 'K'), mut('H', 12, 'G', 'Y')];
    const first = JSON.stringify(bindScore(PAIRS, mutations, 0.4608, 2));
    const fit = JSON.stringify(designFit({ bindScore: 72.5, conservedInterfaceTotal: 7, conservedInterfaceKept: 5 }));
    for (let i = 0; i < 1000; i += 1) {
      assert.equal(JSON.stringify(bindScore(PAIRS, mutations, 0.4608, 2)), first);
      assert.equal(JSON.stringify(designFit({ bindScore: 72.5, conservedInterfaceTotal: 7, conservedInterfaceKept: 5 })), fit);
    }
  });
});

// ── 설계 적합도 ──────────────────────────────────────────────────────────────

describe('설계 적합도(§4.2)', () => {
  test('`0.70·붙는힘 + 0.30·계면 유지항` 을 그대로 따른다', () => {
    assert.equal(FIT_BIND_WEIGHT, 0.7);
    assert.equal(FIT_INTERFACE_WEIGHT, 0.3);
    const r = designFit({ bindScore: 80, conservedInterfaceTotal: 10, conservedInterfaceKept: 5 });
    assert.equal(r.interfaceKept, 50);
    assert.equal(r.fit, Number((0.7 * 80 + 0.3 * 50).toFixed(2)));
  });

  test('지킬 자리가 없으면 항을 빼고 붙는힘 가중치를 1.00 으로 재분배한다 — 0/0 금지', () => {
    const r = designFit({ bindScore: 80, conservedInterfaceTotal: 0, conservedInterfaceKept: 0 });
    assert.equal(r.fit, 80);
    assert.equal(r.interfaceKept, null);
    assert.ok(r.interfaceTermDropped);
  });

  test('붙는 힘 점수를 다시 스케일하지 않는다 — 계면을 전부 지키면 적합도 = 붙는힘', () => {
    const r = designFit({ bindScore: 71, conservedInterfaceTotal: 4, conservedInterfaceKept: 4 });
    assert.equal(r.interfaceKept, 100);
    assert.equal(r.fit, Number((0.7 * 71 + 30).toFixed(2)));
  });

  test('등급은 80 / 60 / 40 네 칸이고 화면과 서버가 같은 함수를 쓴다', () => {
    assert.deepEqual(ANTIBODY_GRADE_MIN, { great: 80, good: 60, fair: 40, poor: 0 });
    assert.equal(antibodyGrade(95), 'great');
    assert.equal(antibodyGrade(80), 'great');
    assert.equal(antibodyGrade(79.99), 'good');
    assert.equal(antibodyGrade(40), 'fair');
    assert.equal(antibodyGrade(0), 'poor');
    assert.equal(designFit({ bindScore: 100, conservedInterfaceTotal: 1, conservedInterfaceKept: 1 }).grade, 'great');
  });

  test('값을 0~100 안으로 가둔다', () => {
    assert.equal(designFit({ bindScore: 500, conservedInterfaceTotal: 1, conservedInterfaceKept: 1 }).fit, 100);
    assert.equal(designFit({ bindScore: -50, conservedInterfaceTotal: 1, conservedInterfaceKept: 0 }).fit, 0);
    // 지킨 자리 수가 전체보다 많아도 100% 를 넘지 않아요.
    assert.equal(designFit({ bindScore: 0, conservedInterfaceTotal: 2, conservedInterfaceKept: 9 }).interfaceKept, 100);
  });

  test('원본이 1위면 개선폭 0 으로 두고 그 사실을 적는다', () => {
    assert.deepEqual(fitDelta(70, 80), { delta: 0, note: '원본이 여전히 최고예요 — 개선 실패예요.' });
    assert.deepEqual(fitDelta(85, 80), { delta: 5, note: null });
  });

  test('확신도는 적합도에 넣지 않고 문턱으로만 쓴다', () => {
    assert.equal(CONFIDENCE_MIN_FOR_COMPLEX, 70);
    assert.ok(passesConfidenceGate(70));
    assert.ok(!passesConfidenceGate(69.9));
  });
});

// ── 경고 라벨 ────────────────────────────────────────────────────────────────

describe('경고 라벨 — 점수에 넣지 않는다', () => {
  test('자연 분포 꼬리에서 watch · alert 가 뜬다', () => {
    const flags = antibodyRiskFlags({
      cdrTotalLength: 51,
      greasySurface: 63,
      greasyPercentile: 0.5,
      chainChargeProduct: 0.1,
      chainChargePercentile: 0.5,
      positivePatchDensity: 0.2222,
      negativePatchDensity: 0.1111,
    });
    for (const f of flags) assert.equal(f.level, 'ok');

    const tail = antibodyRiskFlags({
      cdrTotalLength: 51,
      greasySurface: 90,
      greasyPercentile: 0.99,
      chainChargeProduct: 9,
      chainChargePercentile: 0.92,
      positivePatchDensity: 0.5556,
      negativePatchDensity: null,
    });
    assert.equal(tail.find((f) => f.metric === 'greasySurface')?.level, 'alert');
    assert.equal(tail.find((f) => f.metric === 'chainChargeProduct')?.level, 'watch');
    assert.equal(tail.find((f) => f.metric === 'positivePatch')?.level, 'alert');
    assert.equal(tail.find((f) => f.metric === 'negativePatch'), undefined);
  });

  test('모르는 값은 라벨을 만들지 않는다', () => {
    const flags = antibodyRiskFlags({
      cdrTotalLength: null,
      greasySurface: null,
      greasyPercentile: null,
      chainChargeProduct: null,
      chainChargePercentile: null,
      positivePatchDensity: null,
      negativePatchDensity: null,
    });
    assert.equal(flags.length, 0);
  });

  test('라벨마다 한국어 설명이 붙는다', () => {
    const flags = antibodyRiskFlags({
      cdrTotalLength: 61,
      greasySurface: 76.66,
      greasyPercentile: 0.99,
      chainChargeProduct: 8.4,
      chainChargePercentile: 0.92,
      positivePatchDensity: 0.2222,
      negativePatchDensity: 0.1111,
    });
    assert.equal(flags.length, 5);
    for (const f of flags) assert.ok(f.note.length > 10, f.metric);
  });
});
