/**
 * 신약 파이프라인 순수 규칙(M5) — 균형안 §10 · M5 브리프 §5.1.
 * 물성은 균형안 §10.6 의 값(실제 RDKit 값)을 그대로 쓰고, 표의 E / S 를 그대로 재현한다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DoseMg, Formulation, MoleculeProperties, ProgramStatus } from '@crista/shared-types';
import { DISEASE_LABEL, DISEASE_TO_TARGET, DOCKING_TARGETS, TARGET_TO_DISEASE, TRIAL_OPTIONS, targetEvidenceKey } from '@crista/shared-types';
import {
  PIPELINE_RULES,
  affinityFloorKcal,
  affinityStrength,
  checkDeclare,
  checkFinalFile,
  checkFormulate,
  checkIndFile,
  checkPatentFile,
  checkTrialStart,
  cohortNoise,
  costMultipliersAt,
  autoEventInstance,
  isStepCorrectable,
  judgeStep,
  millionsToCents,
  needsBrainExposure,
  nextActionHint,
  nextStep,
  parseMacroEventCatalog,
  passProbability,
  patentCostCents,
  pipelineLedgerKey,
  planAmend,
  propertySignals,
  publicSummaryOf,
  sameSubstance,
  scoreCandidate,
  scoreTenths,
  signalNotes,
  statusOnDecision,
  statusOnStart,
  stepCostCents,
  stepDurationDays,
  stepLedgerKind,
  stepNoise,
  validateBrand,
  validateCodeName,
  validateMechanism,
  validatePatentLabel,
  type CandidateScores,
  type ProgramFacts,
} from '../src/index.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function mol(p: Partial<MoleculeProperties> & Pick<MoleculeProperties, 'mw' | 'clogp' | 'tpsa' | 'hbd' | 'basicAmines'>): MoleculeProperties {
  return {
    canonicalSmiles: 'C',
    flatSmiles: 'C',
    hba: 4,
    rotb: 4,
    aromaticRings: 1,
    qed: 0.5,
    alerts: [],
    engine: 'RDKit test',
    ...p,
  };
}

/** 균형안 §10.6 · M5 브리프 §6.3 의 실제 RDKit 값. */
const DONEPEZIL = mol({ mw: 379.5, clogp: 4.36, tpsa: 38.8, hbd: 0, hba: 4, rotb: 6, basicAmines: 1 });
const GALANTAMINE = mol({ mw: 287.4, clogp: 1.85, tpsa: 41.9, hbd: 1, hba: 4, rotb: 1, basicAmines: 1 });
const RIVASTIGMINE = mol({ mw: 250.3, clogp: 2.76, tpsa: 32.8, hbd: 0, hba: 3, rotb: 4, basicAmines: 1 });
const CAFFEINE = mol({ mw: 194.2, clogp: -1.03, tpsa: 61.8, hbd: 0, hba: 6, rotb: 0, basicAmines: 0 });
/** (가정) 유도체 — ΔG −10 · cLogP 3.5 · 아민 1 · TPSA 48(나머지는 경구 좋음 · BBB 높음 범위 안의 가정값). */
const DERIVATIVE = mol({ mw: 400, clogp: 3.5, tpsa: 48, hbd: 1, hba: 5, rotb: 5, basicAmines: 1 });

const DG = { donepezil: -11.84, galantamine: -7.57, rivastigmine: -7.79, caffeine: -7.06, derivative: -10 };

const es = (props: MoleculeProperties, affinityKcal: number, formulation: Formulation, dose: DoseMg) => {
  const s = scoreCandidate({ affinityKcal, props, dose, formulation, cns: true });
  return `${s.efficacy.toFixed(1)} / ${s.safety.toFixed(1)}`;
};

describe('균형안 §10.6 표 — E / S 를 그대로 재현', () => {
  const rows: Array<[string, MoleculeProperties, number, Formulation, [string, string, string]]> = [
    ['도네페질 경구', DONEPEZIL, DG.donepezil, 'oral', ['58.7 / 81.5', '83.1 / 44.5', '97.8 / 0.0']],
    ['도네페질 정맥', DONEPEZIL, DG.donepezil, 'iv', ['58.7 / 76.9', '83.1 / 30.6', '97.8 / 0.0']],
    ['도네페질 경피', DONEPEZIL, DG.donepezil, 'transdermal', ['23.5 / 86.1', '33.2 / 58.4', '39.1 / 23.7']],
    ['갈란타민 경구', GALANTAMINE, DG.galantamine, 'oral', ['22.8 / 90.0', '32.3 / 70.0', '38.0 / 45.0']],
    ['리바스티그민 경구', RIVASTIGMINE, DG.rivastigmine, 'oral', ['24.6 / 87.0', '34.9 / 61.0', '41.1 / 28.5']],
    ['카페인 경구', CAFFEINE, DG.caffeine, 'oral', ['18.5 / 90.0', '26.2 / 70.0', '30.8 / 45.0']],
    ['(가정) 유도체 경피', DERIVATIVE, DG.derivative, 'transdermal', ['36.7 / 88.4', '52.0 / 65.1', '61.2 / 36.1']],
  ];
  for (const [name, props, dg, formulation, expected] of rows) {
    test(name, () => {
      assert.deepEqual([es(props, dg, formulation, 10), es(props, dg, formulation, 50), es(props, dg, formulation, 100)], expected);
    });
  }

  test('물성 신호 — 도네페질 hERG 높음 · 간독성 보통 · 경피 부적합, 갈란타민 위험 낮음, 리바스티그민 hERG 보통, 모두 경구 좋음 · BBB 높음', () => {
    const d = propertySignals(DONEPEZIL);
    assert.deepEqual([d.herg, d.hepatotoxicity, d.transdermal], ['high', 'moderate', 'unsuitable']);
    const g = propertySignals(GALANTAMINE);
    assert.deepEqual([g.herg, g.hepatotoxicity], ['low', 'low']);
    assert.equal(propertySignals(RIVASTIGMINE).herg, 'moderate');
    for (const m of [DONEPEZIL, GALANTAMINE, RIVASTIGMINE, CAFFEINE]) {
      const s = propertySignals(m);
      assert.equal(s.oralAbsorption, 'good');
      assert.equal(s.bbb, 'high');
      assert.equal(s.ro5Violations, 0);
    }
    const der = propertySignals(DERIVATIVE);
    assert.deepEqual([der.herg, der.hepatotoxicity, der.transdermal], ['moderate', 'moderate', 'suitable']);
  });

  test('신호 경계 — hERG cLogP 3.7 · 2.5 포함, 간독성 cLogP 3 초과 · TPSA 75 미만, 구조 경고는 높음, 경피 1 ≤ cLogP ≤ 4', () => {
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 3.7 }).herg, 'high');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 3.69 }).herg, 'moderate');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 2.5 }).herg, 'moderate');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 4.5, basicAmines: 0 }).herg, 'low', '염기성 아민이 없으면 낮음');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 3 }).hepatotoxicity, 'low', 'cLogP > 3 이어야 보통');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 3.01, tpsa: 75 }).hepatotoxicity, 'low', 'TPSA < 75 이어야 보통');
    assert.equal(propertySignals({ ...GALANTAMINE, alerts: ['aromatic_amine'] }).hepatotoxicity, 'high');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 4 }).transdermal, 'suitable');
    assert.equal(propertySignals({ ...GALANTAMINE, clogp: 0.99 }).transdermal, 'unsuitable');
    const poor = propertySignals(mol({ mw: 620, clogp: 6, tpsa: 150, hbd: 2, basicAmines: 0 }));
    assert.deepEqual([poor.ro5Violations, poor.oralAbsorption, poor.bbb], [2, 'poor', 'low']);
    assert.equal(propertySignals(mol({ mw: 300, clogp: 2, tpsa: 60, hbd: 1, basicAmines: 0, rotb: 12 })).oralAbsorption, 'moderate', 'RotB > 10');
  });

  test('비 CNS 표적이면 B = 1.00', () => {
    const low = mol({ mw: 480, clogp: 2, tpsa: 130, hbd: 4, basicAmines: 0 });
    assert.equal(propertySignals(low).bbb, 'low');
    const cns = scoreCandidate({ affinityKcal: -12, props: low, dose: 100, formulation: 'iv', cns: true });
    const non = scoreCandidate({ affinityKcal: -12, props: low, dose: 100, formulation: 'iv', cns: false });
    assert.equal(cns.inputs.B, 0.35);
    assert.equal(non.inputs.B, 1);
    assert.equal(non.efficacy, 100);
  });
});

describe('판정 — 정수 1/10 단위 경계 · 근거 문장', () => {
  const fake = (efficacyTenths: number, safetyTenths: number): CandidateScores => ({
    ...scoreCandidate({ affinityKcal: DG.galantamine, props: GALANTAMINE, dose: 10, formulation: 'oral', cns: true }),
    efficacyTenths,
    safetyTenths,
    efficacy: efficacyTenths / 10,
    safety: safetyTenths / 10,
  });

  test('점수 반올림 — 부동소수 경계(76.875 → 76.9 · 86.125 → 86.1 · 58.375 → 58.4)', () => {
    assert.equal(scoreTenths(76.875), 769);
    assert.equal(scoreTenths(86.125), 861);
    assert.equal(scoreTenths(58.375), 584);
    assert.equal(scoreTenths(100 - 10 * 1.85 * 1.25), 769);
  });

  test('경계 — 점수 + n + b 가 기준과 같으면 통과, 0.1 모자라면 실패', () => {
    assert.equal(judgeStep('phase1', fake(0, 440), { efficacy: null, safety: 6 }, 0).passed, true, '44.0 + 6 = 50.0 ≥ 50');
    assert.equal(judgeStep('phase1', fake(0, 439), { efficacy: null, safety: 6 }, 0).passed, false, '43.9 + 6 = 49.9 < 50');
    assert.equal(judgeStep('ind', fake(0, 350), { efficacy: null, safety: null }, 3).passed, true, 'IND 는 S ≥ 35(보너스 무시)');
    assert.equal(judgeStep('ind', fake(0, 349), { efficacy: null, safety: null }, 3).passed, false);
    assert.equal(judgeStep('phase2', fake(370, 0), { efficacy: 0, safety: null }, 3).passed, true, '37.0 + 0 + 3 = 40');
    const p3 = judgeStep('phase3', fake(450, 549), { efficacy: 0, safety: 0 }, 0);
    assert.deepEqual([p3.passed, p3.failure], [false, 'safety']);
    const both = judgeStep('phase3', fake(449, 549), { efficacy: 0, safety: 0 }, 0);
    assert.equal(both.failure, 'both');
    const eff = judgeStep('phase2', fake(399, 0), { efficacy: 0, safety: null }, 0);
    assert.equal(eff.failure, 'efficacy');
  });

  test('보지 않는 축은 null — 1상 효능 · 2상 안전 · IND 흔들림 · 최종', () => {
    const s = scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 10, formulation: 'oral', cns: true });
    const ind = judgeStep('ind', s, { efficacy: null, safety: null }, 3);
    assert.deepEqual([ind.efficacy, ind.safety, ind.noiseSafety, ind.bonus, ind.thresholds.safety], [null, 81.5, null, 0, 35]);
    const p1 = judgeStep('phase1', s, { efficacy: 2, safety: -3 }, 3);
    assert.deepEqual([p1.efficacy, p1.noiseEfficacy, p1.safety, p1.noiseSafety, p1.bonus], [null, null, 81.5, -3, 3]);
    const p2 = judgeStep('phase2', s, { efficacy: 2, safety: -3 }, 0);
    assert.deepEqual([p2.efficacy, p2.safety, p2.noiseSafety], [58.7, null, null]);
    const fin = judgeStep('final', s, { efficacy: null, safety: null }, 3);
    assert.deepEqual([fin.passed, fin.efficacy, fin.safety, fin.bonus], [true, null, null, 0]);
  });

  test('근거 문장은 실제 값으로만 — hERG · 간독성 · 정맥 피크 · 식 · 판정', () => {
    const s = scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 50, formulation: 'iv', cns: true });
    const j = judgeStep('phase1', s, { efficacy: null, safety: 6 }, 3);
    assert.ok(j.reasons.includes('hERG 위험 높음 — 염기성 아민 1 · cLogP 4.36 ≥ 3.7 (R +0.60)'), j.reasons.join('\n'));
    assert.ok(j.reasons.includes('간독성 위험 보통 — cLogP 4.36 > 3 · TPSA 38.8 < 75 (R +0.25)'));
    assert.ok(j.reasons.includes('정맥주사 혈중 피크 ×1.25'));
    assert.ok(j.reasons.includes('안전 S = max(0, 100 − 30 × 1.85 × 1.25) = 30.6'));
    assert.ok(j.reasons.includes('안전 S 30.6 + 흔들림 +6 + 대학병원 지구 +3 = 39.6 < 50 — 기준 미달'));
    const e = judgeStep('phase2', scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 10, formulation: 'oral', cns: true }), { efficacy: -2, safety: null }, 0);
    assert.ok(
      e.reasons.includes('결합 자유에너지 −11.84 kcal/mol → 결합력 p 0.968 (표적 기준 리간드 −11.50 kcal/mol 대비 — 기준은 p 0.900)'),
      e.reasons.join('\n'),
    );
    assert.ok(e.reasons.some((r) => r.startsWith('경구 흡수 좋음 — Ro5 위반 0 · TPSA 38.8 ≤ 140 · RotB 6 ≤ 10')));
    assert.ok(e.reasons.includes('효능 E 58.7 + 흔들림 −2 = 56.7 ≥ 40 — 기준 통과'));
    assert.equal(e.inputs.affinityKcal, -11.84);
    assert.equal(signalNotes(DONEPEZIL).transdermal, '경피 투과 부적합 — cLogP 4.36 > 4');
    assert.equal(signalNotes(CAFFEINE).herg, 'hERG 위험 낮음 — 염기성 아민 없음');
  });
});

describe('흔들림 n — 결정성 · 범위 · 분포', () => {
  test('같은 시드 · 단계 id · 축이면 같은 값, 축 · 단계 · 시드가 다르면 바뀔 수 있다', () => {
    assert.equal(cohortNoise(12345, 'step-a', 'S', 6), cohortNoise(12345, 'step-a', 'S', 6));
    assert.equal(cohortNoise('12345', 'step-a', 'S', 6), cohortNoise(12345, 'step-a', 'S', 6), '숫자 · 문자열 시드는 같은 값');
    const values = new Set<number>();
    for (let i = 0; i < 40; i++) values.add(cohortNoise(12345, `step-${i}`, 'E', 6));
    assert.ok(values.size > 5);
    let differ = 0;
    for (let i = 0; i < 40; i++) if (cohortNoise(1, `s${i}`, 'E', 6) !== cohortNoise(1, `s${i}`, 'S', 6)) differ++;
    assert.ok(differ > 20, '축마다 따로 굴린다');
    assert.equal(cohortNoise(1, 'x', 'E', 0), 0);
  });

  test('범위 — 1 · 2상 −6~+6(13값) · 3상 −4~+4(9값) 정수 균등 · IND · 최종은 없음', () => {
    const counts = new Map<number, number>();
    const N = 26_000;
    for (let i = 0; i < N; i++) {
      const n = cohortNoise(777, `step-${i}`, 'S', 6);
      assert.ok(Number.isInteger(n) && n >= -6 && n <= 6);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    assert.equal(counts.size, 13);
    for (const [n, c] of counts) assert.ok(Math.abs(c - N / 13) < (N / 13) * 0.1, `n=${n}: ${c}`);
    const c3 = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = stepNoise(5, `p3-${i}`, 'phase3');
      assert.ok(n.efficacy !== null && n.safety !== null && Math.abs(n.efficacy) <= 4 && Math.abs(n.safety) <= 4);
      c3.add(n.efficacy);
    }
    assert.equal(c3.size, 9);
    assert.deepEqual(stepNoise(5, 'i', 'ind'), { efficacy: null, safety: null });
    assert.deepEqual(stepNoise(5, 'f', 'final'), { efficacy: null, safety: null });
    const p1 = stepNoise(5, 'a', 'phase1');
    assert.equal(p1.efficacy, null);
    assert.equal(stepNoise(5, 'a', 'phase2').safety, null);
  });

  test('확률 산술 — 도네페질 50mg 경구 1상(S 44.5) 통과 1/13, 대학병원 지구 4/13 · 3상 안전성은 최대 51.5 < 55', () => {
    const s = scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 50, formulation: 'oral', cns: true });
    assert.deepEqual(passProbability(s.safetyTenths, 50, 6, 0), { pass: 1, of: 13 });
    assert.deepEqual(passProbability(s.safetyTenths, 50, 6, 3), { pass: 4, of: 13 });
    assert.deepEqual(passProbability(s.safetyTenths, 55, 4, 3), { pass: 0, of: 9 });
    // 실제 흔들림으로도 — n = +6 인 단계만 통과(지구 보너스 없음).
    let tried = 0;
    for (let i = 0; i < 300; i++) {
      const id = `d50-${i}`;
      const n = stepNoise(42, id, 'phase1');
      const j = judgeStep('phase1', s, n, 0);
      assert.equal(j.passed, n.safety === 6, id);
      tried++;
    }
    assert.equal(tried, 300);
  });

  test('산술 결론 — 도네페질 10mg 은 흔들림과 무관하게 허가, 100mg 은 IND 보류, 카페인은 언제나 2상 보류, 유도체 경피 50mg 3상 최악값 통과', () => {
    const d10 = scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 10, formulation: 'oral', cns: true });
    for (const n of [-6, 6]) {
      assert.ok(judgeStep('phase1', d10, { efficacy: null, safety: n }, 0).passed);
      assert.ok(judgeStep('phase2', d10, { efficacy: n, safety: null }, 0).passed);
    }
    assert.ok(judgeStep('phase3', d10, { efficacy: -4, safety: -4 }, 0).passed);
    const d100 = scoreCandidate({ affinityKcal: DG.donepezil, props: DONEPEZIL, dose: 100, formulation: 'oral', cns: true });
    assert.equal(judgeStep('ind', d100, { efficacy: null, safety: null }, 0).passed, false);
    const caf = scoreCandidate({ affinityKcal: DG.caffeine, props: CAFFEINE, dose: 100, formulation: 'oral', cns: true });
    assert.equal(judgeStep('phase2', caf, { efficacy: 6, safety: null }, 3).passed, false, '30.8 + 6 + 3 < 40');
    const der = scoreCandidate({ affinityKcal: DG.derivative, props: DERIVATIVE, dose: 50, formulation: 'transdermal', cns: true });
    assert.ok(judgeStep('phase3', der, { efficacy: -4, safety: -4 }, 0).passed, '48.0 / 61.1');
  });
});

describe('비용 · 기간 · 원장', () => {
  test('기본 비용 — 특허 $0.050M · IND · 최종 $0.100M · 1 · 2 · 3상 $0.300M / $0.600M / $1.200M', () => {
    const one = { clinical: 1, review: 1 };
    assert.equal(patentCostCents(), millionsToCents(0.05));
    assert.equal(stepCostCents('ind', one), millionsToCents(0.1));
    assert.equal(stepCostCents('final', one), millionsToCents(0.1));
    assert.deepEqual(['phase1', 'phase2', 'phase3'].map((k) => stepCostCents(k as 'phase1', one)), [0.3, 0.6, 1.2].map(millionsToCents));
  });

  test('비용 배율 — 임상 ×0.85(trial-recruit) · 심사 ×1.10(regulation), 특허는 배율 없음, 0.70~1.30 자르기', () => {
    assert.equal(stepCostCents('phase1', { clinical: 0.85, review: 1.1 }), millionsToCents(0.255));
    assert.equal(stepCostCents('phase3', { clinical: 0.85, review: 1.1 }), millionsToCents(1.02));
    assert.equal(stepCostCents('ind', { clinical: 0.85, review: 1.1 }), millionsToCents(0.11));
    assert.equal(stepCostCents('final', { clinical: 0.85, review: 1.1 }), millionsToCents(0.11));
    assert.equal(stepCostCents('ind', { clinical: 1, review: 2 }), millionsToCents(0.13));
    // 카탈로그 사건으로 — 같은 날 같은 팀.
    const catalog = parseMacroEventCatalog(JSON.parse(readFileSync(fileURLToPath(new URL('../../../assets/data/macro-events.json', import.meta.url)), 'utf8')));
    const ev = (id: string) => autoEventInstance({ classId: 'c', monthIndex: 1, event: catalog.events.find((e) => e.id === id)! });
    const m = costMultipliersAt([ev('trial-recruit'), ev('regulation')], 't', 31);
    assert.equal(stepCostCents('phase2', m), millionsToCents(0.51));
    assert.equal(stepDurationDays('ind', 'vc', m.reviewDuration), 37.5);
  });

  test('기간 — 1상 90일(대학병원 지구 76.5일) · IND 30일(규제 강화 37.5일) · 심사에는 지구 배율 없음', () => {
    assert.equal(stepDurationDays('phase1', 'vc'), 90);
    assert.equal(stepDurationDays('phase1', 'hospital'), 76.5);
    assert.equal(stepDurationDays('phase2', 'hospital'), 153);
    assert.equal(stepDurationDays('phase3', 'hospital'), 306);
    assert.equal(stepDurationDays('ind', 'hospital'), 30);
    assert.equal(stepDurationDays('ind', null, 1.25), 37.5);
    assert.equal(stepDurationDays('final', 'compute', 1.25), 75);
    assert.equal(stepDurationDays('phase1', 'hospital', 1.25), 76.5, '심사 기간 배율은 임상에 쓰지 않는다');
    assert.equal(PIPELINE_RULES.durationDays.final, 60);
  });

  test('원장 종류 · 멱등 키', () => {
    assert.equal(stepLedgerKind('ind'), 'review_fee');
    assert.equal(stepLedgerKind('final'), 'review_fee');
    assert.equal(stepLedgerKind('phase2'), 'trial_fee');
    assert.equal(pipelineLedgerKey('team-1', 'req-9'), 'pipeline:team-1:req-9');
  });
});

describe('상태 전이 · 재도전 규칙 (균형안 §10.5)', () => {
  const prog = (status: ProgramStatus, dose: DoseMg | null = 10, phase1PassedDose: DoseMg | null = null): ProgramFacts => ({ status, dose, phase1PassedDose });

  test('nextStep — 실패한 상은 그 상을 다시, 진행 중 · 끝 · 닫힘은 null', () => {
    const table: Array<[ProgramStatus, string | null]> = [
      ['declared', null], ['formulated', 'ind'], ['ind_review', null], ['ind_hold', 'ind'], ['ind_approved', 'phase1'],
      ['phase1', null], ['phase1_passed', 'phase2'], ['phase1_failed', 'phase1'], ['phase2', null], ['phase2_passed', 'phase3'],
      ['phase2_failed', 'phase2'], ['phase3', null], ['phase3_passed', 'final'], ['phase3_failed', 'phase3'], ['final_review', null],
      ['final_rejected', 'final'], ['approved', null], ['closed', null],
    ];
    for (const [s, n] of table) assert.equal(nextStep(s), n, s);
    assert.equal(statusOnStart('ind'), 'ind_review');
    assert.equal(statusOnStart('phase2'), 'phase2');
    assert.equal(statusOnStart('final'), 'final_review');
    assert.equal(statusOnDecision('ind', false), 'ind_hold');
    assert.equal(statusOnDecision('phase3', true), 'phase3_passed');
    assert.equal(statusOnDecision('final', true), 'approved');
    assert.equal(statusOnDecision('final', false), 'final_rejected');
    assert.equal(nextActionHint('ind_approved'), '대학병원 임상센터에서 임상 1상 시작');
    assert.equal(nextActionHint('formulated'), 'FDA 규제심사청에서 IND 신청');
  });

  test('IND 보류 → 같은 FDA 에서 용량을 바꿔 IND 다시(용량 변경 메시지는 막고 IND 신청을 안내)', () => {
    const ok = checkIndFile({ program: prog('ind_hold', 100), targetId: 'ache-4ey7', dose: 10, population: '경도 알츠하이머병 환자', endpoint: '인지 기능 점수(ADAS-Cog) 변화', candidateActive: true });
    assert.equal(ok, null);
    const amend = planAmend(prog('ind_hold', 100), 10);
    assert.equal(amend.ok, false);
    assert.equal(!amend.ok && amend.denial.code, 'pipeline_order');
    assert.equal(checkIndFile({ program: prog('phase1_failed'), targetId: 'ache-4ey7', dose: 10, population: '경도 알츠하이머병 환자', endpoint: '인지 기능 점수(ADAS-Cog) 변화', candidateActive: true })?.code, 'pipeline_order');
    assert.equal(checkIndFile({ program: prog('ind_review'), targetId: 'ache-4ey7', dose: 10, population: 'x', endpoint: 'y', candidateActive: true })?.code, 'pipeline_busy');
    assert.equal(checkIndFile({ program: prog('formulated'), targetId: 'ache-4ey7', dose: 20, population: 'x', endpoint: 'y', candidateActive: true })?.code, 'invalid_input');
    assert.equal(checkIndFile({ program: prog('formulated'), targetId: 'ache-4ey7', dose: 10, population: '아무 환자', endpoint: '인지 기능 점수(ADAS-Cog) 변화', candidateActive: true })?.code, 'invalid_input');
  });

  test('n상 실패 → ① 같은 프로토콜로 다시 ② 용량 변경 후 다시 ③ 제형 · 후보 교체(언제나 가능 — 진행 중만 막힘)', () => {
    const t = checkTrialStart(prog('phase2_failed', 10, 10));
    assert.ok(t.ok && t.kind === 'phase2');
    const lower = planAmend(prog('phase2_failed', 50, 50), 10);
    assert.ok(lower.ok && lower.status === 'phase2_failed' && !lower.restartFromPhase1, '내리면 그대로');
    const same = planAmend(prog('phase2_failed', 10, 10), 10);
    assert.ok(same.ok && same.status === 'phase2_failed' && !same.changed);
    const formulate = checkFormulate({ program: prog('phase2_failed'), admetFacility: { built: true, active: true }, patentOwnedActive: true, formulation: 'iv' });
    assert.equal(formulate, null);
    assert.equal(checkFormulate({ program: prog('phase2'), admetFacility: { built: true, active: true }, patentOwnedActive: true, formulation: 'iv' })?.code, 'pipeline_busy');
  });

  test('용량 변경 — 1상 통과 용량보다 올리면 1상부터(ind_approved), IND 승인 뒤 · 진행 중 아님 · 허가 전만', () => {
    const up = planAmend(prog('phase2_failed', 10, 10), 50);
    assert.ok(up.ok && up.status === 'ind_approved' && up.restartFromPhase1);
    const upPassed = planAmend(prog('phase3_passed', 10, 10), 100);
    assert.ok(upPassed.ok && upPassed.status === 'ind_approved');
    const before1 = planAmend(prog('ind_approved', 10, null), 100);
    assert.ok(before1.ok && before1.status === 'ind_approved' && !before1.restartFromPhase1, '1상 전이면 그대로 1상');
    const failed1 = planAmend(prog('phase1_failed', 50, null), 100);
    assert.ok(failed1.ok && failed1.status === 'phase1_failed');
    for (const s of ['declared', 'formulated', 'ind_hold'] as const) assert.equal((planAmend(prog(s), 10) as { denial: { code: string } }).denial.code, 'pipeline_order', s);
    for (const s of ['ind_review', 'phase1', 'phase3', 'final_review'] as const) assert.equal((planAmend(prog(s), 10) as { denial: { code: string } }).denial.code, 'pipeline_busy', s);
    for (const s of ['approved', 'closed'] as const) assert.equal((planAmend(prog(s), 10) as { denial: { code: string } }).denial.code, 'pipeline_order', s);
    assert.equal((planAmend(prog('phase1_passed'), 25) as { denial: { code: string } }).denial.code, 'invalid_input');
  });

  test('임상 시작 · 최종 신청 순서 — IND 승인 전 임상 · 3상 통과 전 최종은 pipeline_order', () => {
    const t = checkTrialStart(prog('formulated'));
    assert.ok(!t.ok && t.denial.code === 'pipeline_order' && t.denial.message.includes('FDA'));
    assert.ok(!checkTrialStart(null).ok);
    const busy = checkTrialStart(prog('phase1'));
    assert.ok(!busy.ok && busy.denial.code === 'pipeline_busy');
    const brand = { name: '뉴로클리어정', packageShape: 'tablet', packageColor: 'ivory' };
    assert.equal(checkFinalFile({ program: prog('phase2_passed'), formulation: 'oral', candidatePatentId: 'p', phase3Passed: null, brand })?.code, 'pipeline_order');
    const p3 = { dose: 10 as DoseMg, formulation: 'oral' as Formulation, patentId: 'p' };
    assert.equal(checkFinalFile({ program: prog('phase3_passed', 10), formulation: 'oral', candidatePatentId: 'p', phase3Passed: p3, brand }), null);
    assert.equal(checkFinalFile({ program: prog('final_rejected', 10), formulation: 'oral', candidatePatentId: 'p', phase3Passed: p3, brand }), null, '거절 뒤 최종 다시');
    assert.equal(checkFinalFile({ program: prog('phase3_passed', 50), formulation: 'oral', candidatePatentId: 'p', phase3Passed: p3, brand })?.code, 'not_eligible', '같은 프로토콜이 아니다');
    assert.equal(checkFinalFile({ program: prog('phase3_passed', 10), formulation: 'oral', candidatePatentId: 'p', phase3Passed: p3, brand: { name: '' } })?.code, 'invalid_input');
  });

  test('선언 · 특허 · 제형 조건 — 무엇이 모자란지 말한다', () => {
    assert.match(checkDeclare({ program: null, targetFacility: { built: false, active: false }, stage1Succeeded: true })!.message, /표적 탐색실/);
    assert.match(checkDeclare({ program: null, targetFacility: { built: true, active: true }, stage1Succeeded: false })!.message, /Stage 1/);
    assert.equal(checkDeclare({ program: null, targetFacility: { built: true, active: true }, stage1Succeeded: true }), null);
    assert.equal(checkDeclare({ program: prog('formulated'), targetFacility: { built: true, active: true }, stage1Succeeded: true }), null, 'IND 전까지 고칠 수 있다');
    assert.equal(checkDeclare({ program: prog('ind_hold'), targetFacility: { built: true, active: true }, stage1Succeeded: true })?.code, 'pipeline_order');
    assert.equal(checkPatentFile({ hasDockingEvidence: false, conflict: null })?.code, 'not_eligible');
    const c = checkPatentFile({ hasDockingEvidence: true, conflict: { ticker: 'NEUR', ours: false } });
    assert.equal(c?.code, 'patent_conflict');
    assert.match(c!.message, /NEUR 특허 — .*작용기를 바꾼 새 분자/);
    assert.equal(checkFormulate({ program: null, admetFacility: { built: true, active: true }, patentOwnedActive: true, formulation: 'oral' })?.code, 'pipeline_order');
    assert.equal(checkFormulate({ program: prog('declared'), admetFacility: { built: true, active: true }, patentOwnedActive: false, formulation: 'oral' })?.code, 'not_eligible');
    assert.equal(checkFormulate({ program: prog('declared'), admetFacility: { built: true, active: false }, patentOwnedActive: true, formulation: 'oral' })?.code, 'not_eligible');
    assert.equal(checkFormulate({ program: prog('declared'), admetFacility: { built: true, active: true }, patentOwnedActive: true, formulation: 'nasal' })?.code, 'invalid_input');
    assert.ok(sameSubstance('CCO', 'CCO'));
    assert.ok(!sameSubstance('CCO', 'CCN'));
  });

  test('정정 자격 — 가장 최근에 판정된 단계이고 뒤 단계가 시작되지 않았을 때만', () => {
    const steps = [
      { id: 'ind', status: 'passed' as const, startedAtMs: 1, startedGameDay: 0 },
      { id: 'p1', status: 'passed' as const, startedAtMs: 2, startedGameDay: 30 },
    ];
    assert.equal(isStepCorrectable(steps, 'p1', 'phase1_passed'), true);
    assert.equal(isStepCorrectable(steps, 'ind', 'phase1_passed'), false, '뒤 단계가 있다');
    assert.equal(isStepCorrectable([...steps, { id: 'p2', status: 'running' as const, startedAtMs: 3, startedGameDay: 120 }], 'p1', 'phase2'), false, '뒤 단계 시작');
    assert.equal(isStepCorrectable(steps, 'p1', 'closed'), false);
    assert.equal(isStepCorrectable(steps, 'none', 'phase1_passed'), false);
  });

  test('공개 요약 — IND 전에는 프로토콜 없음, 허가 전에는 브랜드 없음', () => {
    const base = { teamId: 't', ticker: 'NEUR', companyName: '뉴로', codeName: 'CRX-101', mechanism: 'AChE 억제', activePatents: 1 };
    const protocol = { dose: 10 as DoseMg, formulation: 'oral' as Formulation, population: 'a', endpoint: 'b' };
    const brand = { name: '뉴로정', packageShape: 'tablet' as const, packageColor: 'ivory' as const };
    assert.equal(publicSummaryOf({ ...base, status: 'formulated', protocol, brand }).protocol, null);
    const s = publicSummaryOf({ ...base, status: 'phase3_passed', protocol, brand });
    assert.deepEqual(s.protocol, protocol);
    assert.equal(s.brand, null);
    assert.deepEqual(publicSummaryOf({ ...base, status: 'approved', protocol, brand }).brand, brand);
  });
});

describe('입력 검증 (PIPELINE_LIMITS)', () => {
  test('코드명 · 기전 · 이름표 · 브랜드', () => {
    assert.deepEqual(validateCodeName(' crx-101 '), { ok: true, value: 'CRX-101' });
    for (const bad of ['C-101', 'CRXAB-101', 'CRX101', 'CRX-1011', '', 12]) assert.equal(validateCodeName(bad).ok, false, String(bad));
    assert.equal(validateMechanism('AChE 억제로 아세틸콜린 분해를 막는다').ok, true);
    assert.equal(validateMechanism('').ok, false);
    assert.equal(validateMechanism('가'.repeat(81)).ok, false);
    assert.equal(validateMechanism('가'.repeat(80)).ok, true);
    assert.equal(validateMechanism('줄\n바꿈').ok, false);
    assert.deepEqual(validatePatentLabel(undefined), { ok: true, value: null });
    assert.equal(validatePatentLabel('가'.repeat(41)).ok, false);
    assert.equal(validateBrand({ name: '뉴로클리어정', packageShape: 'capsule', packageColor: 'sage' }).ok, true);
    assert.equal(validateBrand({ name: '가'.repeat(21), packageShape: 'capsule', packageColor: 'sage' }).ok, false);
    assert.equal(validateBrand({ name: '뉴로', packageShape: 'pill', packageColor: 'sage' }).ok, false);
    assert.equal(validateBrand({ name: '뉴로', packageShape: 'patch', packageColor: 'red' }).ok, false);
  });
});

describe('v11 — 표적별 결합력 정규화 · 뇌 병변 환자군', () => {
  /** 네 표적의 결정 리간드 재도킹 실측값(`apps/bio-worker/scripts/redock_check.py` → `DockingTarget.referenceKcal`). */
  const REFERENCE = DOCKING_TARGETS.map((t) => [t.id, t.referenceKcal] as const);

  test('기준값을 주지 않으면 M5 원래 식 그대로 — (−ΔG − 7) / 5', () => {
    for (const dg of [-6, -7, -8.5, -11.84, -13]) {
      assert.equal(affinityStrength(dg), Math.min(1, Math.max(0, (-dg - 7) / 5)), `ΔG ${dg}`);
    }
    // 기본값 −11.5 를 명시해도 같다(CRO 퀴즈 · 바운티가 쓰는 일반 규칙).
    assert.equal(affinityStrength(-9.3), affinityStrength(-9.3, PIPELINE_RULES.affinity.defaultReferenceKcal));
  });

  test('어느 표적이든 결정 리간드는 p = 0.9, 기준보다 4.5 kcal/mol 약하면 p = 0', () => {
    for (const [id, ref] of REFERENCE) {
      assert.equal(affinityStrength(ref, ref), 0.9, id);
      assert.equal(affinityStrength(ref + 4.5, ref), 0, id);
      assert.equal(affinityFloorKcal(ref), ref + 4.5, id);
    }
  });

  test('얕은 포켓(EGFR)의 승인약도 임상 2상 효능 기준(40)을 넘는다 — 정규화 전에는 못 넘었다', () => {
    const egfr = DOCKING_TARGETS.find((t) => t.id === 'egfr-1m17')!;
    // 엘로티닙 실제 RDKit 물성(화합물 라이브러리 값) · 1M17 재도킹 ΔG.
    const erlotinib = mol({ mw: 393.4, clogp: 3.41, tpsa: 74.7, hbd: 1, hba: 7, rotb: 10, basicAmines: 0, qed: 0.42 });
    const before = scoreCandidate({ affinityKcal: egfr.referenceKcal, props: erlotinib, dose: 100, formulation: 'oral', cns: false });
    const after = scoreCandidate({
      affinityKcal: egfr.referenceKcal,
      props: erlotinib,
      dose: 100,
      formulation: 'oral',
      cns: false,
      referenceKcal: egfr.referenceKcal,
    });
    assert.ok(before.efficacy < 40, `정규화 전 ${before.efficacy}`);
    assert.ok(after.efficacy >= 40, `정규화 후 ${after.efficacy}`);
    assert.equal(after.inputs.p, 0.9);
    // 안전 축은 결합력과 무관하다 — 정규화가 안전 점수를 건드리지 않는다.
    assert.equal(before.safety, after.safety);
  });

  test('뇌 병변 환자군을 고르면 비 CNS 표적도 뇌 노출을 본다', () => {
    const brain = TRIAL_OPTIONS['egfr-1m17']!.brainPopulations![0]!;
    const other = TRIAL_OPTIONS['egfr-1m17']!.populations[0]!;
    assert.equal(needsBrainExposure({ cnsTarget: false, targetId: 'egfr-1m17', population: brain }), true);
    assert.equal(needsBrainExposure({ cnsTarget: false, targetId: 'egfr-1m17', population: other }), false);
    assert.equal(needsBrainExposure({ cnsTarget: false, targetId: 'egfr-1m17', population: null }), false);
    // CNS 표적은 환자군과 상관없이 늘 본다. 뇌 병변 환자군 선택지가 없는 표적도 영향이 없다.
    assert.equal(needsBrainExposure({ cnsTarget: true, targetId: 'ache-4ey7', population: null }), true);
    assert.equal(needsBrainExposure({ cnsTarget: false, targetId: 'dpp4-1x70', population: '아무 환자군' }), false);

    // TPSA 74.7 · MW 393.4 · HBD 1 → 뇌 노출 '높음'(B 1.0)이 아니라 경계를 확인한다.
    const polar = mol({ mw: 480, clogp: 2.0, tpsa: 110, hbd: 2, hba: 7, rotb: 6, basicAmines: 0 });
    const peripheral = scoreCandidate({ affinityKcal: -10, props: polar, dose: 100, formulation: 'oral', cns: false });
    const toBrain = scoreCandidate({ affinityKcal: -10, props: polar, dose: 100, formulation: 'oral', cns: true, cnsFromPopulation: true });
    assert.ok(toBrain.efficacy < peripheral.efficacy, '뇌까지 가야 하면 극성 분자는 불리하다');
    assert.ok(toBrain.efficacyReasons.some((r) => r.startsWith('뇌 병변 환자군 —')), toBrain.efficacyReasons.join('\n'));
  });

  test('선언은 후보를 정한 뒤 표적을 바꾸지 못한다 — 후보가 없으면 바꿀 수 있다', () => {
    const base = { targetFacility: { built: true, active: true }, stage1Succeeded: true };
    const declared: ProgramFacts = { status: 'declared', dose: null, phase1PassedDose: null, targetId: 'ache-4ey7', candidatePatentId: null };
    assert.equal(checkDeclare({ ...base, program: declared, targetId: 'egfr-1m17' }), null);
    const withCandidate: ProgramFacts = { ...declared, status: 'formulated', candidatePatentId: 'pat-1' };
    assert.equal(checkDeclare({ ...base, program: withCandidate, targetId: 'egfr-1m17' })?.code, 'pipeline_order');
    assert.equal(checkDeclare({ ...base, program: withCandidate, targetId: 'ache-4ey7' }), null, '같은 표적이면 고칠 수 있다');
  });

  test('질환 → 표적 매핑은 1:1 이고 도킹 표적 목록과 같다', () => {
    assert.deepEqual(
      Object.values(DISEASE_TO_TARGET).slice().sort(),
      DOCKING_TARGETS.map((t) => t.id).slice().sort(),
    );
    for (const [disease, target] of Object.entries(DISEASE_TO_TARGET)) {
      assert.equal(TARGET_TO_DISEASE[target], disease);
      // 표적의 질환 이름표와 질환 이름표가 같은 말이어야 한다(화면이 두 곳에서 다른 이름을 쓰지 않게).
      assert.equal(DOCKING_TARGETS.find((t) => t.id === target)!.disease, DISEASE_LABEL[disease as keyof typeof DISEASE_LABEL]);
    }
  });

  test('근거 키는 표적 × 분자다 — 같은 분자라도 표적이 다르면 다른 키', () => {
    assert.equal(targetEvidenceKey('ache-4ey7', 'CCO'), 'ache-4ey7|CCO');
    assert.notEqual(targetEvidenceKey('ache-4ey7', 'CCO'), targetEvidenceKey('egfr-1m17', 'CCO'));
  });
});
