/**
 * 동기부여 Step 1 순수 규칙 — 사옥 외관 등급 · 실패 데이터 바운티 정답표 · 채점 · 환급액.
 * 분자는 균형안 §10.6 의 실제 RDKit 값(pipeline.test.ts 와 같은 값)을 쓴다.
 */
import assert from 'node:assert/strict';
import { DOCKING_TARGETS } from '@crista/shared-types';
import { describe, test } from 'node:test';
import type { FacilityKind, FacilityTier, MoleculeProperties } from '@crista/shared-types';
import {
  admetBountyKey,
  admetFailed,
  bountyRefundCents,
  dockingBountyKey,
  dockingFailed,
  gradeBounty,
  hqProgressOf,
  hqTierOf,
  judgeStep,
  millionsToCents,
  parseBountyAnswers,
  propertySignals,
  scoreCandidate,
  stepBountyKey,
  type HqFacts,
} from '../src/index.ts';

function mol(p: Partial<MoleculeProperties> & Pick<MoleculeProperties, 'mw' | 'clogp' | 'tpsa' | 'hbd' | 'basicAmines'>): MoleculeProperties {
  return { canonicalSmiles: 'C', flatSmiles: 'C', hba: 4, rotb: 4, aromaticRings: 1, qed: 0.5, alerts: [], engine: 'RDKit test', ...p };
}

const DONEPEZIL = mol({ mw: 379.5, clogp: 4.36, tpsa: 38.8, hbd: 0, hba: 4, rotb: 6, basicAmines: 1 });
const CAFFEINE = mol({ mw: 194.2, clogp: -1.03, tpsa: 61.8, hbd: 0, hba: 6, rotb: 0, basicAmines: 0 });
const DERIVATIVE = mol({ mw: 400, clogp: 3.5, tpsa: 48, hbd: 1, hba: 5, rotb: 5, basicAmines: 1 });
const NITRO = mol({ mw: 300, clogp: 2.0, tpsa: 80, hbd: 1, hba: 5, rotb: 3, basicAmines: 0, alerts: ['nitro_aromatic'] });

const facilities = (over: Partial<Record<FacilityKind, FacilityTier>> = {}): Record<FacilityKind, FacilityTier> => ({
  target: 1,
  htvs: 0,
  docking: 0,
  admet: 0,
  security: 0,
  ...over,
});

const base: HqFacts = { facilities: facilities(), investments: [], activePatents: 0, indApproved: false, phase3Passed: false, approved: false };

describe('사옥 외관 등급 — 설계서 §3.1', () => {
  test('설립 기본값은 Tier 1 이고 다음 조건표는 Tier 2 조건 세 줄', () => {
    const p = hqProgressOf(base);
    assert.equal(p.tier, 1);
    assert.equal(p.next, 2);
    assert.deepEqual(p.requirements.map((r) => [r.id, r.met]), [['labs3', false], ['seriesA', false], ['patentOrInd', false]]);
    assert.deepEqual(p.requirements[0]!.progress, { have: 1, need: 3 });
  });

  test('연구실 3종 + Series A + (특허 또는 IND) 이면 Tier 2 — 하나라도 빠지면 1', () => {
    const t2 = { ...base, facilities: facilities({ htvs: 1, docking: 2 }), investments: ['seriesA' as const], activePatents: 1 };
    assert.equal(hqTierOf(t2), 2);
    assert.equal(hqTierOf({ ...t2, activePatents: 0, indApproved: true }), 2);
    assert.equal(hqTierOf({ ...t2, activePatents: 0 }), 1);
    assert.equal(hqTierOf({ ...t2, investments: [] }), 1);
    // 보안 게이트는 연구실로 세지 않는다.
    assert.equal(hqTierOf({ ...t2, facilities: facilities({ htvs: 1, security: 1 }) }), 1);
  });

  test('Tier 3 = 연구실 4종 + 보안 + Series B + (3상 통과 또는 허가) — 매각하면 내려간다', () => {
    const t3: HqFacts = {
      facilities: facilities({ htvs: 1, docking: 1, admet: 1, security: 1 }),
      investments: ['seriesA', 'seriesB'],
      activePatents: 1,
      indApproved: true,
      phase3Passed: true,
      approved: false,
    };
    assert.equal(hqTierOf(t3), 3);
    assert.deepEqual(hqProgressOf(t3), { tier: 3, next: null, requirements: [] });
    assert.equal(hqTierOf({ ...t3, facilities: facilities({ htvs: 1, docking: 1, admet: 1 }) }), 2);
    assert.equal(hqTierOf({ ...t3, phase3Passed: false }), 2);
    assert.equal(hqTierOf({ ...t3, phase3Passed: false, approved: true }), 3);
    assert.equal(hqTierOf({ ...t3, facilities: facilities({ target: 0, docking: 1, admet: 1, security: 1 }) }), 1, '연구실 2종으로 줄면 Tier 1');
    const p2 = hqProgressOf({ ...t3, investments: ['seriesA'] });
    assert.equal(p2.tier, 2);
    assert.deepEqual(p2.requirements.filter((r) => !r.met).map((r) => r.id), ['seriesB']);
  });
});

describe('바운티 정답표 — 단계(균형안 §10.4 식 그대로)', () => {
  test('도네페질 경구 100mg IND 보류(S 0.0) — 안전 감점 요인과 유효 처방', () => {
    const scores = scoreCandidate({ affinityKcal: -11.84, props: DONEPEZIL, dose: 100, formulation: 'oral', cns: true });
    const j = judgeStep('ind', scores, { efficacy: null, safety: null }, 0);
    assert.equal(j.failure, 'safety');
    const key = stepBountyKey({ kind: 'ind', judgement: j, props: DONEPEZIL, dose: 100, formulation: 'oral', cns: true });
    assert.equal(key.axis, 'safety');
    assert.deepEqual(key.factors, ['herg_risk', 'hepatotox_risk', 'high_dose']);
    // 용량 ↓(S 44.5) · 경피(23.7) · 아민 제거(31.3)는 S 를 올린다. 정맥은 0 그대로, 결합력은 S 와 무관, IND 는 흔들림이 없어 재시도 무효.
    assert.deepEqual(key.validRemedies, ['dose_down', 'to_transdermal', 'redesign_amine']);
    assert.equal(gradeBounty(key, { axis: 'safety', factors: ['herg_risk', 'hepatotox_risk', 'high_dose'], remedy: 'redesign_amine' }).passed, true);
    const wrong = gradeBounty(key, { axis: 'safety', factors: ['herg_risk', 'high_dose'], remedy: 'same_retry' });
    assert.deepEqual(wrong.correct, { axis: true, factors: false, remedy: false });
    assert.equal(wrong.hints.length, 2);
  });

  test('카페인 경구 50mg 2상 보류 — 효능 감점 요인(약한 결합 · 저용량)만, 처방은 결합력 개선', () => {
    const scores = scoreCandidate({ affinityKcal: -7.06, props: CAFFEINE, dose: 50, formulation: 'oral', cns: true });
    const j = judgeStep('phase2', scores, { efficacy: 2, safety: null }, 0);
    assert.equal(j.failure, 'efficacy');
    const key = stepBountyKey({ kind: 'phase2', judgement: j, props: CAFFEINE, dose: 50, formulation: 'oral', cns: true });
    assert.deepEqual(key.factors, ['weak_affinity', 'low_dose']);
    assert.ok(key.validRemedies.includes('improve_affinity'));
    assert.ok(!key.validRemedies.includes('dose_down'), '용량을 내리면 효능이 떨어진다');
    assert.ok(!key.validRemedies.includes('same_retry'), '흔들림 +2 로도 미달 — 재시도로는 안 된다');
  });

  test('흔들림 때문에만 미달(유도체 경구 50mg 1상 S 53.5 − 4 < 50) — cohort_noise 와 같은 프로토콜 재시도가 정답에 든다', () => {
    const scores = scoreCandidate({ affinityKcal: -10, props: DERIVATIVE, dose: 50, formulation: 'oral', cns: true });
    assert.equal(scores.safety, 53.5);
    const j = judgeStep('phase1', scores, { efficacy: null, safety: -4 }, 0);
    assert.equal(j.passed, false);
    const key = stepBountyKey({ kind: 'phase1', judgement: j, props: DERIVATIVE, dose: 50, formulation: 'oral', cns: true });
    assert.deepEqual(key.factors, ['herg_risk', 'hepatotox_risk', 'high_dose', 'cohort_noise']);
    assert.ok(key.validRemedies.includes('same_retry'));
    assert.ok(key.validRemedies.includes('dose_down'));
    // 대학병원 지구 +3 이면 통과였다 — 같은 흔들림 −4 에 보너스 3: 53.5 − 4 + 3 = 52.5 ≥ 50(그러면 보류가 아님).
    assert.equal(judgeStep('phase1', scores, { efficacy: null, safety: -4 }, 3).passed, true);
  });

  test('3상 둘 다 미달 — 두 축의 요인을 모두 · 한 축만 올리고 다른 축을 깎는 처방은 무효', () => {
    const scores = scoreCandidate({ affinityKcal: -7.57, props: DONEPEZIL, dose: 50, formulation: 'oral', cns: true });
    const j = judgeStep('phase3', scores, { efficacy: -4, safety: -4 }, 0);
    assert.equal(j.failure, 'both');
    const key = stepBountyKey({ kind: 'phase3', judgement: j, props: DONEPEZIL, dose: 50, formulation: 'oral', cns: true });
    assert.deepEqual(key.factors, ['herg_risk', 'hepatotox_risk', 'high_dose', 'weak_affinity', 'low_dose']);
    assert.ok(!key.validRemedies.includes('dose_down'), 'S 는 오르지만 E 가 떨어진다');
    assert.ok(key.validRemedies.includes('redesign_amine'), 'S 만 오르고 E 는 그대로');
  });
});

describe('바운티 정답표 — 실험', () => {
  test('도킹 기준 미달은 ΔG > −7.0(p = 0)만', () => {
    assert.equal(dockingFailed(-6.9), true);
    assert.equal(dockingFailed(-7.0), false);
    assert.equal(dockingFailed(null), false);
    // v11 — 경계는 표적마다 다르다(그 표적 결정 리간드보다 4.5 kcal/mol 약하면 결합력 0).
    const egfr = DOCKING_TARGETS.find((t) => t.id === 'egfr-1m17')!.referenceKcal; // −7.24 → 경계 −2.74
    const cox2 = DOCKING_TARGETS.find((t) => t.id === 'cox2-3ln1')!.referenceKcal; // −12.26 → 경계 −7.76
    assert.equal(dockingFailed(-6.9, egfr), false, '얕은 포켓에서는 −6.9 도 쓸 만한 결합이다');
    assert.equal(dockingFailed(-6.9, cox2), true, '깊은 포켓에서는 −6.9 가 기준 미달이다');
    assert.equal(dockingFailed(-7.8, cox2), false);
    const key = dockingBountyKey();
    assert.equal(gradeBounty(key, { axis: 'binding', factors: ['weak_affinity'], remedy: 'improve_affinity' }).passed, true);
    assert.equal(gradeBounty(key, { axis: 'binding', factors: ['weak_affinity'], remedy: 'same_retry' }).passed, false);
  });

  test('ADMET — 도네페질 hERG 높음(아민 + cLogP 4.36), 니트로 분자 간독성 높음', () => {
    assert.equal(admetFailed(propertySignals(DONEPEZIL)), true);
    assert.equal(admetFailed(propertySignals(CAFFEINE)), false);
    const d = admetBountyKey(DONEPEZIL);
    assert.equal(d.axis, 'herg');
    assert.deepEqual(d.factors, ['basic_amine', 'high_clogp']);
    // cLogP 4.36 → 3.36 이면 hERG 보통 — 높음이 사라진다.
    assert.deepEqual(d.validRemedies, ['redesign_amine', 'lower_clogp']);
    const n = admetBountyKey(NITRO);
    assert.equal(n.axis, 'hepatotoxicity');
    assert.deepEqual(n.factors, ['structural_alert']);
    assert.deepEqual(n.validRemedies, ['redesign_alert']);
  });
});

describe('환급액 · 답안 형식', () => {
  test('실제 낸 비용 × 환급률, 기본가 상한, 계보 남은 상한', () => {
    const M = millionsToCents;
    assert.equal(bountyRefundCents('phase3', M(1.2), M(0.9)), M(0.36));
    assert.equal(bountyRefundCents('phase3', M(1.02), M(0.9)), M(0.306), '임상 비용 × 0.85 이벤트면 실제 낸 만큼');
    assert.equal(bountyRefundCents('ind', M(0.11), M(0.9)), M(0.05), '심사 × 1.10 이어도 기본가 상한 $0.050M');
    assert.equal(bountyRefundCents('phase2', M(0.6), M(0.9)), M(0.24));
    assert.equal(bountyRefundCents('experiment', M(0.035), M(0.9)), M(0.014), 'AI 지구 30% 할인 도킹');
    assert.equal(bountyRefundCents('phase1', M(0.3), M(0.1)), M(0.1), '계보 상한이 남은 만큼만');
    assert.equal(bountyRefundCents('phase1', M(0.3), 0), 0);
  });

  test('선택지 밖 값 · 형식 오류는 거절, 요인은 선택지 순서로 정리', () => {
    assert.equal(parseBountyAnswers('step', { axis: 'binding', factors: [], remedy: 'dose_down' }), null);
    assert.equal(parseBountyAnswers('step', { axis: 'safety', factors: ['nope'], remedy: 'dose_down' }), null);
    assert.equal(parseBountyAnswers('admet', { axis: 'herg', factors: 'basic_amine', remedy: 'lower_clogp' }), null);
    assert.deepEqual(parseBountyAnswers('step', { axis: 'safety', factors: ['high_dose', 'herg_risk', 'high_dose'], remedy: 'dose_down' }), {
      axis: 'safety',
      factors: ['herg_risk', 'high_dose'],
      remedy: 'dose_down',
    });
  });
});
