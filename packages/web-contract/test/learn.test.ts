/**
 * 학습 연구비 규격(FLEARN) — 금액 · 배율 · 정량 70점 · 개념 채점 순수 함수가 균형 문서(learning-grant-balance §2 · §3)의 표와 같은가.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  displayStreak,
  gradeConcept,
  itemMaxCrista,
  LEARN_COPY,
  LEARN_REWARD_CRISTA,
  LEARN_STEP_CAP_CRISTA,
  LEARN_TEXT_LIMITS,
  nextStreakBase,
  noteMaxCrista,
  noteSharedNeeded,
  pitchPayout,
  rewardFor,
  rubricScore,
  seriesAQuant,
  seriesBQuant,
  stepStipendMax,
  stipendMultiplier,
  tickCrista,
  type SeriesAFacts,
  type SeriesBFacts,
} from '../src/index.ts';

describe('학습 연구비 — 금액(balance §2)', () => {
  test('점수 → 크리스타: 30점 미만 0 · floor(max × score / 100)', () => {
    assert.equal(rewardFor(75_000, 29), 0);
    assert.equal(rewardFor(75_000, 30), 22_500);
    assert.equal(rewardFor(150_000, 77), 115_500);
    assert.equal(rewardFor(25_000, 100), 25_000);
    assert.equal(rewardFor(25_000, 140), 25_000);
  });
  test('문항 최대 · 힌트 70% · 학생 1인 단계 최대 275,000 · 모둠 단계 상한 800,000', () => {
    assert.deepEqual(LEARN_REWARD_CRISTA, { concept: 25_000, intermediate: 75_000, advanced: 150_000 });
    assert.equal(itemMaxCrista('advanced', true), 105_000);
    assert.equal(2 * LEARN_REWARD_CRISTA.concept + LEARN_REWARD_CRISTA.intermediate + LEARN_REWARD_CRISTA.advanced, 275_000);
    assert.equal(LEARN_STEP_CAP_CRISTA, 800_000);
  });
  test('노트 — 200,000 · 분담 ×1.2 = 240,000 · 분담 인원(3~4인 3명 · 2인 2명 · 1인 없음)', () => {
    assert.equal(noteMaxCrista(false), 200_000);
    assert.equal(noteMaxCrista(true), 240_000);
    assert.deepEqual([1, 2, 3, 4].map(noteSharedNeeded), [null, 2, 3, 3]);
  });
});

describe('기초 연구비 — 배율 m = 1 + ρ + 0.1·min(s, 5)(balance §2.3 표)', () => {
  test('표의 여섯 줄', () => {
    const rows: Array<[number, number, number, number, number]> = [
      [0, 0, 1.0, 40_000, 80_000],
      [0.25, 0, 1.25, 50_000, 100_000],
      [0.5, 0, 1.5, 60_000, 120_000],
      [0.75, 0, 1.75, 70_000, 140_000],
      [1, 1, 2.1, 84_000, 168_000],
      [1, 3, 2.3, 92_000, 184_000],
    ];
    for (const [rho, s, m, tick, step] of rows) {
      assert.equal(stipendMultiplier(rho, s), m, `ρ ${rho} s ${s}`);
      assert.equal(tickCrista(m), tick);
      assert.equal(stepStipendMax(m), step);
    }
    assert.equal(stipendMultiplier(1, 9), 2.5);
    assert.equal(stepStipendMax(2.5), 200_000);
  });
  test('s — 지금 단계 전원 가동이면 +1 · 떠날 때 전원이면 +1, 아니면 한 칸만 식는다(0 아래로 안 감)', () => {
    assert.equal(displayStreak(0, 1), 1);
    assert.equal(displayStreak(4, 0.75), 4);
    assert.equal(nextStreakBase(3, true), 4);
    assert.equal(nextStreakBase(3, false), 2);
    assert.equal(nextStreakBase(0, false), 0);
    assert.equal(nextStreakBase(9, true), 9);
  });
  test('8단계 모두 4인 전원 · 연속이면 1,520,000(balance §2.3 마지막 줄)', () => {
    let base = 0;
    let total = 0;
    for (let i = 0; i < 8; i++) {
      total += stepStipendMax(stipendMultiplier(1, displayStreak(base, 1)));
      base = nextStreakBase(base, true);
    }
    assert.equal(total, 1_520_000);
  });
});

describe('Series A/B(balance §3)', () => {
  test('지급 = floor(최대 × max(0.30, 점수/100)) — 바닥 4,500,000 · 7,500,000 · 90점 13,500,000', () => {
    assert.equal(pitchPayout('series_a', 0), 4_500_000);
    assert.equal(pitchPayout('series_a', 30), 4_500_000);
    assert.equal(pitchPayout('series_a', 65), 9_750_000);
    assert.equal(pitchPayout('series_a', 90), 13_500_000);
    assert.equal(pitchPayout('series_b', 10), 7_500_000);
    assert.equal(pitchPayout('series_b', 100), 25_000_000);
  });
  test('지급은 정수 계산 — 0~100 모든 점수에서 floor(최대 × 점수 / 100)와 같다(25,000,000 × 0.57 이 1 크리스타 모자라지 않게)', () => {
    assert.equal(pitchPayout('series_b', 57), 14_250_000);
    assert.equal(pitchPayout('series_b', 58), 14_500_000);
    for (const round of ['series_a', 'series_b'] as const) {
      const max = round === 'series_a' ? 15_000_000 : 25_000_000;
      for (let s = 0; s <= 100; s++) assert.equal(pitchPayout(round, s), (max * Math.max(30, s)) / 100, `${round} ${s}`);
    }
  });
  test('피치 글 길이 = 설계의 200~500자(LEARN_COPY 안내와 같은 값)', () => {
    assert.deepEqual(LEARN_TEXT_LIMITS.pitch, { min: 200, max: 500 });
    assert.match(LEARN_COPY.pitchPromptA, /200~500자/);
    assert.match(LEARN_COPY.pitchPromptB, /200~500자/);
  });
  const best: SeriesAFacts = {
    members: 4,
    pickOrClaimMembers: 4,
    dockingMembers: 4,
    leadStrength: 0.9,
    leadDeltaG: -11.8,
    plip: { hbond: 2, pistack: 1 },
    ro5Violations: 0,
    herg: 'low',
    liver: 'low',
    cns: true,
    tpsa: 70,
    backupReady: true,
  };
  test('Series A 정량 — 다 갖추면 70 · 1인 독식 · 백업 없음 · CNS 인데 TPSA 큼이면 깎인다 · 부분 합이 70 을 넘지 않음', () => {
    const top = seriesAQuant(best);
    assert.equal(top.total, 70);
    assert.deepEqual(
      top.parts.map((p) => [p.key, p.points, p.max]),
      [
        ['diversity', 20, 20],
        ['affinity', 25, 25],
        ['admet', 17, 17],
        ['backup', 8, 8],
      ],
    );
    const solo = seriesAQuant({ ...best, pickOrClaimMembers: 1, dockingMembers: 1, backupReady: false, tpsa: 120, herg: 'high' });
    assert.equal(solo.parts.find((p) => p.key === 'diversity')!.points, 1 + 3);
    assert.equal(solo.parts.find((p) => p.key === 'admet')!.points, 8);
    assert.equal(solo.parts.find((p) => p.key === 'backup')!.points, 0);
    const none = seriesAQuant({ ...best, dockingMembers: 0, pickOrClaimMembers: 0, leadStrength: null, leadDeltaG: null, plip: null, ro5Violations: null, herg: null, liver: null, tpsa: null, backupReady: false });
    assert.equal(none.total, 0 + 0 + 6 + 2 + 0);
  });
  test('Series B 정량 — 특허 + 최적화 · IND 첫 승인 · 펀더멘털 · 기여 균형', () => {
    const b: SeriesBFacts = { members: 4, activePatents: 1, optimized: true, indApproved: 'first', efficacy: 62, safety: 55, contributions: [5, 5, 4, 6] };
    const top = seriesBQuant(b);
    assert.equal(top.parts.find((p) => p.key === 'patent')!.points, 25);
    assert.equal(top.parts.find((p) => p.key === 'ind')!.points, 25);
    assert.equal(top.parts.find((p) => p.key === 'share')!.points, 14 + 4);
    assert.equal(top.total, 68);
    const lone = seriesBQuant({ ...b, indApproved: 'retry', efficacy: 40, safety: 30, contributions: [10, 0, 0, 0] });
    assert.equal(lone.parts.find((p) => p.key === 'ind')!.points, 10 + 3);
    assert.equal(lone.parts.find((p) => p.key === 'share')!.points, 4);
  });
});

describe('채점 순수 함수', () => {
  test('루브릭 점수 = round(100 × Σ(w × credit) / Σw) · injection · off_topic · duplicate 는 0', () => {
    const rubric = [
      { id: 'a', weight: 2 },
      { id: 'b', weight: 1 },
      { id: 'c', weight: 1 },
    ];
    assert.equal(rubricScore(rubric, [{ id: 'a', credit: 'full' }, { id: 'b', credit: 'half' }, { id: 'c', credit: 'none' }]), 63);
    assert.equal(rubricScore(rubric, [{ id: 'a', credit: 'full' }, { id: 'b', credit: 'full' }, { id: 'c', credit: 'full' }]), 100);
    assert.equal(rubricScore(rubric, [{ id: 'a', credit: 'full' }]), 50);
    for (const flag of ['injection', 'off_topic', 'duplicate']) assert.equal(rubricScore(rubric, [{ id: 'a', credit: 'full' }], [flag]), 0);
    assert.equal(rubricScore(rubric, [{ id: 'a', credit: 'full' }], ['too_short']), 50);
  });
  test('개념 채점 — mc · multi(맞은 − 틀린) · numeric 허용 오차', () => {
    assert.deepEqual(gradeConcept({ kind: 'mc', correct: 'b' }, { choice: ['b'] }), { score: 100, correct: true });
    assert.deepEqual(gradeConcept({ kind: 'mc', correct: 'b' }, { choice: ['a', 'b'] }), { score: 0, correct: false });
    assert.deepEqual(gradeConcept({ kind: 'multi', correct: ['a', 'c', 'd'] }, { choice: ['a', 'c', 'd'] }), { score: 100, correct: true });
    assert.equal(gradeConcept({ kind: 'multi', correct: ['a', 'c', 'd'] }, { choice: ['a', 'c', 'e'] }).score, 33);
    assert.equal(gradeConcept({ kind: 'multi', correct: ['a', 'c', 'd'] }, { choice: ['b', 'e'] }).score, 0);
    assert.equal(gradeConcept({ kind: 'numeric', value: 0.42, tolerance: 0.02 }, { value: 0.44 }).score, 100);
    assert.equal(gradeConcept({ kind: 'numeric', value: 0.42, tolerance: 0.02 }, { value: 0.45 }).score, 0);
    assert.equal(gradeConcept({ kind: 'numeric', value: 2, tolerance: 0 }, {}).score, 0);
  });
  test('학생 문구는 한곳(LEARN_COPY) — 해요체 · 오류 문구가 모두 있다', () => {
    assert.equal(LEARN_COPY.chip('2.1', 3, 4), '×2.1 · 단계 가동 3/4');
    for (const [k, v] of Object.entries(LEARN_COPY.err)) {
      const text = typeof v === 'function' ? (v as (a: number, b: number) => string)(1, 2) : v;
      assert.match(text, /(요|세요)\.?$/, k);
    }
  });
});
