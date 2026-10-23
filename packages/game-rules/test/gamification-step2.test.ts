/**
 * 동기부여 Step 2 순수 규칙 — CRO 문제 은행(결정성 · 정답 정합 · score.ts 일치) · 보상 · 상한, C-Level 성과급 · 팬텀스톡 · 시간가중 수익률.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { CroField, CroTrack, MoleculeProperties } from '@crista/shared-types';
import { CRO_LIMITS, EXECUTIVE_BONUS_CENTS, PHANTOM_STOCK } from '@crista/shared-types';
import {
  achievedMilestones,
  affinityStrength,
  applyPhantomChange,
  correctedPhantomQ,
  croGameYear,
  croMaxCents,
  croPayoutCents,
  croPerfect,
  croRewardCents,
  croSheet,
  gradeCro,
  initialTwr,
  parseCroAnswers,
  phantomSettleCents,
  planExecutiveBonus,
  propertySignals,
  ro5Violations,
  twrAfterFlow,
  twrReturnPct,
  type ExecutiveFacts,
} from '../src/index.ts';

const TRACKS: Array<[CroTrack, CroField]> = [
  ['general', 'bio'],
  ['general', 'medchem'],
  ['general', 'ai'],
  ['deep', 'bio'],
];

function mol(p: Partial<MoleculeProperties>): MoleculeProperties {
  return { canonicalSmiles: '', flatSmiles: '', mw: 350, clogp: 2, tpsa: 70, hbd: 1, hba: 5, rotb: 5, aromaticRings: 1, qed: 0.5, basicAmines: 0, alerts: [], engine: 't', ...p };
}

describe('CRO 문제 은행', () => {
  test('같은 시드 · 변형 번호면 같은 문항지, 변형은 같은 유형의 새 값', () => {
    for (const [track, field] of TRACKS) {
      const a = croSheet('seed-1', track, field, 0);
      const b = croSheet('seed-1', track, field, 0);
      assert.deepEqual(a, b);
      const v = croSheet('seed-1', track, field, 1);
      assert.deepEqual(
        v.view.questions.map((q) => q.type),
        a.view.questions.map((q) => q.type),
        `${track}/${field} 변형은 같은 학습 목표(유형)`,
      );
      assert.notDeepEqual(v.view.questions, a.view.questions, `${track}/${field} 변형은 다른 값`);
      assert.equal(v.view.variant, 1);
    }
  });

  test('문항지 모양 — 본 문항 3개 + 근거 1개, 보기 · 정답이 맞물린다(시드 400개)', () => {
    for (let i = 0; i < 400; i++) {
      for (const [track, field] of TRACKS) {
        const { view, key } = croSheet(`s${i}`, track, field, (i % 2) as 0 | 1);
        assert.equal(view.questions.length, 4);
        assert.deepEqual(
          view.questions.map((q) => q.role),
          ['main', 'main', 'main', 'evidence'],
        );
        if (track === 'general' && field !== 'medchem') {
          assert.deepEqual(view.questions.slice(0, 3).map((q) => q.type), field === 'bio' ? ['A1', 'A2', 'A3'] : ['C1', 'C2', 'C3']);
        }
        for (const q of view.questions) {
          const k = key.questions.find((x) => x.id === q.id)!;
          assert.ok(q.choices.length >= 2, `${q.type} 보기 2개 이상`);
          assert.equal(new Set(q.choices.map((c) => c.label)).size, q.choices.length, `${q.type} 보기 중복 없음 (${q.choices.map((c) => c.label).join(' | ')})`);
          assert.ok(k.correct.length >= 1, `${q.type} 정답 1개 이상`);
          if (!q.multi) assert.equal(k.correct.length, 1, `${q.type} 하나 고르기는 정답 하나`);
          assert.ok(k.correct.every((c) => q.choices.some((x) => x.id === c)));
          assert.ok(k.explanation.length > 0);
        }
        // 정답표 그대로 내면 만점, 아무것도 안 고르면 0.
        const perfect = Object.fromEntries(key.questions.map((q) => [q.id, q.correct]));
        const g = gradeCro(key, view.variant, perfect);
        assert.equal(g.mainCorrect, 3);
        assert.equal(g.evidenceCorrect, true);
        assert.equal(g.rewardCents, croMaxCents(track));
        assert.ok(croPerfect(track, g));
        assert.equal(gradeCro(key, view.variant, {}).rewardCents, 0);
      }
    }
  });

  test('의약화학 · AI 정답은 score.ts 와 같다(표의 값으로 다시 계산)', () => {
    let seen = { B1: 0, B2: 0, B3: 0, C1: 0 };
    for (let i = 0; i < 300; i++) {
      for (const field of ['medchem', 'ai'] as const) {
        const { view, key } = croSheet(`m${i}`, 'general', field, 0);
        for (const q of view.questions) {
          const right = key.questions.find((x) => x.id === q.id)!.correct.map((id) => q.choices.find((c) => c.id === id)!.label);
          const row = q.table?.rows[0];
          if (q.type === 'B1') {
            const p = mol({ mw: Number(row![0]), clogp: Number(row![1]), hbd: Number(row![2]), hba: Number(row![3]) });
            assert.deepEqual(right, [`${ro5Violations(p)}개`]);
            seen.B1 += 1;
          } else if (q.type === 'B2') {
            const p = mol({ tpsa: Number(row![0]), mw: Number(row![1]), hbd: Number(row![2]) });
            assert.deepEqual(right, [{ high: '높음', moderate: '보통', low: '낮음' }[propertySignals(p).bbb]]);
            seen.B2 += 1;
          } else if (q.type === 'B3') {
            const p = mol({ basicAmines: Number(row![0]), clogp: Number(row![1]) });
            assert.deepEqual(right, [{ high: '높음', moderate: '보통', low: '낮음' }[propertySignals(p).herg]]);
            seen.B3 += 1;
          } else if (q.type === 'C1') {
            const dg = Number(/ΔG = (−?-?[\d.]+)/.exec(q.prompt)![1]!.replace('−', '-'));
            assert.deepEqual(right, [`p = ${affinityStrength(dg).toFixed(2)}`]);
            seen.C1 += 1;
          }
        }
      }
    }
    assert.ok(seen.B1 > 50 && seen.B2 > 50 && seen.B3 > 50 && seen.C1 > 50, JSON.stringify(seen));
  });

  test('B1 — 등급이 고르게 나온다(0~3개 모두)', () => {
    const counts = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { view, key } = croSheet(`b${i}`, 'general', 'medchem', 0);
      const q = view.questions.find((x) => x.type === 'B1');
      if (!q) continue;
      counts.add(q.choices.find((c) => c.id === key.questions.find((k) => k.id === q.id)!.correct[0])!.label);
    }
    assert.deepEqual([...counts].sort(), ['0개', '1개', '2개', '3개']);
  });

  test('답안 형식 — 모르는 문항 · 보기 · 하나 고르기에 여럿이면 거절', () => {
    const { view } = croSheet('p', 'general', 'bio', 0);
    const single = view.questions.find((q) => !q.multi)!;
    assert.deepEqual(parseCroAnswers(view, { [single.id]: ['a'] }), { [single.id]: ['a'] });
    assert.equal(parseCroAnswers(view, { zz: ['a'] }), null);
    assert.equal(parseCroAnswers(view, { [single.id]: ['z'] }), null);
    assert.equal(parseCroAnswers(view, { [single.id]: ['a', 'b'] }), null);
    assert.equal(parseCroAnswers(view, null), null);
    assert.equal(parseCroAnswers(view, []), null);
  });
});

describe('CRO 보상 · 상한', () => {
  test('일반 3/3 $0.030M · 2/3 $0.015M + 근거 $0.010M, 심층 결론 $0.080M + 근거 $0.020M', () => {
    assert.equal(croRewardCents('general', 3, true), 4_000_000);
    assert.equal(croRewardCents('general', 3, false), 3_000_000);
    assert.equal(croRewardCents('general', 2, true), 2_500_000);
    assert.equal(croRewardCents('general', 2, false), 1_500_000);
    assert.equal(croRewardCents('general', 1, true), 0, '본 문항 보상이 없으면 근거 보너스도 없다');
    assert.equal(croRewardCents('deep', 3, true), 10_000_000);
    assert.equal(croRewardCents('deep', 3, false), 8_000_000);
    assert.equal(croRewardCents('deep', 2, true), 0);
    assert.equal(croMaxCents('general'), 4_000_000);
    assert.equal(croMaxCents('deep'), 10_000_000);
  });

  test('차시 $0.600M · 계보 $1.200M 남은 만큼만', () => {
    assert.deepEqual(croPayoutCents(10_000_000, { sessionPaidCents: 0, campaignPaidCents: 0 }), { payCents: 10_000_000, cappedCents: 0 });
    assert.deepEqual(croPayoutCents(10_000_000, { sessionPaidCents: 55_000_000, campaignPaidCents: 0 }), { payCents: 5_000_000, cappedCents: 5_000_000 });
    assert.deepEqual(croPayoutCents(4_000_000, { sessionPaidCents: 0, campaignPaidCents: 119_000_000 }), { payCents: 1_000_000, cappedCents: 3_000_000 });
    assert.deepEqual(croPayoutCents(4_000_000, { sessionPaidCents: 0, campaignPaidCents: 120_000_000 }), { payCents: 0, cappedCents: 4_000_000 });
    // 어떤 순서로 조합해도 합계가 상한을 넘지 않는다.
    let campaign = 0;
    for (let i = 0; i < 60; i++) {
      const reward = i % 3 === 0 ? 10_000_000 : 4_000_000;
      const { payCents } = croPayoutCents(reward, { sessionPaidCents: 0, campaignPaidCents: campaign });
      campaign += payCents;
      assert.ok(campaign <= CRO_LIMITS.campaignCapCents);
    }
    assert.equal(campaign, CRO_LIMITS.campaignCapCents);
  });

  test('게임 연도 — 360게임 일마다', () => {
    assert.equal(croGameYear(0), 0);
    assert.equal(croGameYear(359.9), 0);
    assert.equal(croGameYear(360), 1);
    assert.equal(croGameYear(1000), 2);
  });
});

describe('C-Level 성과급 · 팬텀스톡', () => {
  const none: ExecutiveFacts = { investments: [], patentsFiled: 0, indApproved: false, phase1Passed: false, phase2Passed: false, phase3Passed: false, approved: false };
  const all: ExecutiveFacts = { investments: ['seriesA', 'seriesB'], patentsFiled: 2, indApproved: true, phase1Passed: true, phase2Passed: true, phase3Passed: true, approved: true };

  test('마일스톤 8종 합계 $12,000 — 직책 무관 1인 같은 금액', () => {
    assert.deepEqual(achievedMilestones(none), []);
    const m = achievedMilestones(all);
    assert.equal(m.length, 8);
    assert.equal(m.reduce((s, x) => s + EXECUTIVE_BONUS_CENTS[x], 0), 1_200_000);
  });

  test('이미 받은 것은 다시 주지 않고, 이 회사에서 받은 것만 사실이 사라지면 회수', () => {
    const facts = { ...none, investments: ['seriesA'] as const, patentsFiled: 1 };
    const plan = planExecutiveBonus('t2', achievedMilestones(facts), { seriesA: { cents: 100_000, teamId: 't1' } });
    assert.deepEqual(plan.pay, [{ milestone: 'firstPatent', cents: 50_000 }], '옛 회사에서 받은 Series A 는 다시 주지 않는다');
    assert.deepEqual(plan.clawback, []);
    const corrected = planExecutiveBonus('t2', ['seriesA'], { seriesA: { cents: 100_000, teamId: 't1' }, firstPatent: { cents: 50_000, teamId: 't2' }, phase2: { cents: 200_000, teamId: 't2' } });
    assert.deepEqual(corrected.clawback, [
      { milestone: 'firstPatent', cents: 50_000 },
      { milestone: 'phase2', cents: 200_000 },
    ]);
    const other = planExecutiveBonus('t3', [], { phase2: { cents: 200_000, teamId: 't2' } });
    assert.deepEqual(other.clawback, [], '다른 회사에서 받은 것은 회수하지 않는다');
  });

  test('경구 완주 + Series A · B → Q $17.97, 정산 $7,974 대(상한 $8,000)', () => {
    let q: number = PHANTOM_STOCK.grantPriceUsd;
    for (const pct of [2, 2, 4, 8, 10, 15.6, 8, 12]) q = applyPhantomChange(q, pct);
    assert.ok(Math.abs(q - 17.97) < 0.01, `Q ${q}`);
    const cents = phantomSettleCents(q);
    assert.ok(cents > 797_000 && cents < 800_000, `정산 ${cents}`);
    assert.equal(phantomSettleCents(30), PHANTOM_STOCK.capCents);
    assert.equal(phantomSettleCents(9.5), 0, 'Q 가 부여가보다 낮으면 0');
  });

  test('정정 — 적용했던 Δ 를 걷어 내고 새 Δ', () => {
    const q = applyPhantomChange(10, -12);
    assert.ok(Math.abs(correctedPhantomQ(q, -12, 8) - 10.8) < 1e-9);
  });

  test('시간가중 수익률 — 성과급을 받은 학생도 같은 20% 투자 성과면 20.0%', () => {
    const seed = 10_000_000;
    // 받지 않은 학생: 시드 → +20%.
    assert.ok(Math.abs(twrReturnPct(initialTwr(seed), 12_000_000) - 20) < 1e-9);
    // 받은 학생: +10% 일 때 $1,000 성과급, 그 뒤 다시 +9.0909…% (합쳐서 투자 성과 20%).
    const s1 = twrAfterFlow(initialTwr(seed), 11_000_000, 100_000);
    const end = 11_100_000 * (1.2 / 1.1);
    assert.ok(Math.abs(twrReturnPct(s1, end) - 20) < 1e-9);
    // 단순 수익률은 성과급이 섞여 20% 보다 크다.
    assert.ok((end - seed) / seed > 0.2);
  });
});
