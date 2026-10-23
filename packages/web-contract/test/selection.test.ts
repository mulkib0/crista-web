/**
 * FSEL 규격 — 2.1 대기열 근거 칩 · 2.2 특허 후보 근거 칩 판정(브라우저 · 서버 같은 함수) · 레이더 띠 · 10배 계단 · 상한.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { PropertySignals } from '@crista/shared-types';
import {
  CANDIDATE_REASONS,
  candidateReasonsFor,
  candidateReasonVerdict,
  DOCK_REASONS,
  dockReasonVerdict,
  foldFromDeltaDeltaG,
  KCAL_PER_DECADE,
  kdFromKcal,
  leadCandidatesPerPerson,
  radarOutside,
  REASON_KEY_PATTERN,
  SELECTION_COPY,
  type CandidateReasonFacts,
  type DockReasonFacts,
} from '../src/index.ts';

const dock = (over: Partial<DockReasonFacts> = {}): DockReasonFacts => ({
  kcal: -12.0,
  referenceKcal: -11.84,
  p: 0.87,
  origin: { kind: 'this', variant: false, family: 'CHEMBL502', library: 'ChEMBL 승인약' },
  parentKcal: null,
  queue: [],
  ...over,
});

const sig = (over: Partial<PropertySignals> = {}): PropertySignals => ({
  ro5Violations: 0,
  oralAbsorption: 'good',
  bbb: 'high',
  herg: 'low',
  hepatotoxicity: 'low',
  transdermal: 'suitable',
  ...over,
});
const lead = (over: Partial<CandidateReasonFacts> = {}): CandidateReasonFacts => ({
  signals: sig(),
  radarOut: 0,
  efficacy: 60,
  safety: 70,
  bestEfficacy: 60,
  cns: true,
  indSafetyMin: 35,
  ...over,
});

describe('2.1 대기열 근거 칩(§5.6)', () => {
  test('키 모양은 DB check 와 같다 · 문구가 모두 있다', () => {
    for (const k of [...DOCK_REASONS, ...CANDIDATE_REASONS]) assert.match(k, REASON_KEY_PATTERN);
    for (const k of DOCK_REASONS) assert.ok(SELECTION_COPY.dockReasonLabel[k]);
    for (const k of CANDIDATE_REASONS) assert.ok(SELECTION_COPY.leadReasonLabel[k]);
  });
  test('기준 약보다 단단히 — 같거나 깊으면 맞음 · 약하면 막음(몇 배 더 필요한지)', () => {
    assert.equal(dockReasonVerdict('stronger_than_ref', dock({ kcal: -11.84 })).status, 'ok');
    const v = dockReasonVerdict('stronger_than_ref', dock({ kcal: -10.48 }));
    assert.equal(v.status, 'block');
    assert.match(v.message, /기준 약보다 1\.36 kcal\/mol 약해요\. 10배 계단으로 보면 약 9\.\d+배/);
  });
  test('10배 차이 안 — ΔG − 기준 ≤ 1.364 맞음 · 넘으면 막음', () => {
    assert.equal(dockReasonVerdict('within_10x', dock({ kcal: -11.84 + 1.364 })).status, 'ok');
    assert.equal(dockReasonVerdict('within_10x', dock({ kcal: -11.84 + 1.4 })).status, 'block');
  });
  test('ΔG 차이 {gap} 은 늘 양수 크기 — 약하면 \'약해요\' · 얕으면 \'차이\' · 깊으면 \'더 깊어요\'(부호가 두 번 붙지 않는다)', () => {
    const weak = dockReasonVerdict('within_10x', dock({ kcal: -11.84 + 2 }));
    assert.match(weak.message, /기준 약보다 2\.00 kcal\/mol 약해요/);
    const near = dockReasonVerdict('within_10x', dock({ kcal: -11.84 + 0.5 }));
    assert.match(near.message, /ΔG 차이가 0\.50 kcal\/mol/);
    const deep = dockReasonVerdict('within_10x', dock({ kcal: -11.84 - 0.5 }));
    assert.equal(deep.status, 'ok');
    assert.match(deep.message, /기준 약보다 0\.50 kcal\/mol 더 깊어요/);
    for (const m of [weak.message, near.message, deep.message]) assert.ok(!/[-−]\d/.test(m.replace(/\(.*?\)/g, '')), m);
  });
  test('이 표적 계열 — 출신이 이 표적일 때만(다른 표적 · 모름은 막음)', () => {
    assert.equal(dockReasonVerdict('target_series', dock()).status, 'ok');
    assert.equal(dockReasonVerdict('target_series', dock({ origin: { kind: 'other', variant: false, family: 'X', library: 'ChEMBL 승인약' } })).status, 'block');
    assert.equal(dockReasonVerdict('target_series', dock({ origin: { kind: 'unknown', variant: false, family: 'job', library: null } })).status, 'block');
  });
  test('결합력 p ≥ 0.5', () => {
    assert.equal(dockReasonVerdict('p_mid', dock({ p: 0.5 })).status, 'ok');
    assert.equal(dockReasonVerdict('p_mid', dock({ p: 0.49 })).status, 'block');
  });
  test('구조를 바꿔 좋아짐 — 변형체이고 부모보다 더 음수일 때만', () => {
    assert.equal(dockReasonVerdict('improved_variant', dock()).status, 'block');
    const variant = { kind: 'this' as const, variant: true, family: 'CHEMBL502', library: null };
    assert.equal(dockReasonVerdict('improved_variant', dock({ origin: variant, parentKcal: -11.5, kcal: -12 })).status, 'ok');
    assert.equal(dockReasonVerdict('improved_variant', dock({ origin: variant, parentKcal: -12, kcal: -12 })).status, 'block');
  });
  test('다른 계열 — 대기열이 비면 맞음, 모두 같은 부모면 주의, 모두 같은 라이브러리면 주의(막지 않음)', () => {
    assert.equal(dockReasonVerdict('different_series', dock()).status, 'ok');
    assert.equal(dockReasonVerdict('different_series', dock({ queue: [{ family: 'CHEMBL502', library: '사내 합성 후보' }] })).status, 'warn');
    assert.equal(dockReasonVerdict('different_series', dock({ queue: [{ family: 'Y', library: 'ChEMBL 승인약' }] })).status, 'warn');
    assert.equal(dockReasonVerdict('different_series', dock({ queue: [{ family: 'Y', library: 'ChEMBL 승인약' }, { family: 'Z', library: 'ZINC 소형' }] })).status, 'ok');
  });
  test('모르는 근거 키는 막음', () => {
    assert.equal(dockReasonVerdict('legacy', dock()).status, 'block');
  });
});

describe('2.2 특허 후보 근거 칩(§5.7)', () => {
  test('hERG · 간 · 경구 · 뇌 — 좋음 맞음 · 보통 주의 · 나쁨 막음', () => {
    assert.deepEqual(
      (['low', 'moderate', 'high'] as const).map((h) => candidateReasonVerdict('herg_low', lead({ signals: sig({ herg: h }) })).status),
      ['ok', 'warn', 'block'],
    );
    assert.deepEqual(
      (['low', 'moderate', 'high'] as const).map((h) => candidateReasonVerdict('liver_low', lead({ signals: sig({ hepatotoxicity: h }) })).status),
      ['ok', 'warn', 'block'],
    );
    assert.deepEqual(
      (['good', 'moderate', 'poor'] as const).map((o) => candidateReasonVerdict('oral_good', lead({ signals: sig({ oralAbsorption: o }) })).status),
      ['ok', 'warn', 'block'],
    );
    assert.deepEqual(
      (['high', 'moderate', 'low'] as const).map((b) => candidateReasonVerdict('brain_ok', lead({ signals: sig({ bbb: b }) })).status),
      ['ok', 'warn', 'block'],
    );
  });
  test('뇌 칩은 CNS 표적에만 보이고, 아닌 표적이면 막음', () => {
    assert.ok(candidateReasonsFor(true).includes('brain_ok'));
    assert.ok(!candidateReasonsFor(false).includes('brain_ok'));
    assert.equal(candidateReasonVerdict('brain_ok', lead({ cns: false })).status, 'block');
  });
  test('레이더 — 벗어난 축 0 맞음 · 1 주의 · 2 이상 막음', () => {
    assert.deepEqual([0, 1, 2].map((n) => candidateReasonVerdict('radar_in_band', lead({ radarOut: n })).status), ['ok', 'warn', 'block']);
  });
  test('IND 안전 기준 — 경구 50 mg 예상 S ≥ 35', () => {
    assert.equal(candidateReasonVerdict('ind_safe', lead({ safety: 35 })).status, 'ok');
    assert.equal(candidateReasonVerdict('ind_safe', lead({ safety: 34.9 })).status, 'block');
  });
  test('효능 1위 — 모둠 최고와 같을 때만(동점 포함)', () => {
    assert.equal(candidateReasonVerdict('top_efficacy', lead({ efficacy: 60, bestEfficacy: 60 })).status, 'ok');
    assert.equal(candidateReasonVerdict('top_efficacy', lead({ efficacy: 59.9, bestEfficacy: 60 })).status, 'block');
  });
  test('물성을 읽지 못했으면 모두 막음', () => {
    for (const r of CANDIDATE_REASONS) assert.equal(candidateReasonVerdict(r, lead({ signals: null })).status, 'block');
  });
});

describe('도구 계산', () => {
  test('10배 계단 — 1.364 kcal/mol 마다 10배 · Kd 는 RT ln', () => {
    assert.ok(Math.abs(foldFromDeltaDeltaG(KCAL_PER_DECADE) - 10) < 1e-9);
    assert.ok(Math.abs(foldFromDeltaDeltaG(0.7) - 3.26) < 0.01);
    assert.ok(Math.abs(kdFromKcal(-1.364 * 3) / 1e-3 - 1) < 0.01);
  });
  test('레이더 띠 — cLogP −0.7~5 · MW 150~500 · TPSA 20~130 · RotB ≤ 9 · HBD ≤ 5 · HBA ≤ 10', () => {
    assert.deepEqual(radarOutside({ clogp: 4.36, mw: 379.5, tpsa: 38.8, rotb: 6, hbd: 0, hba: 4 }), []);
    assert.deepEqual(radarOutside({ clogp: 5.2, mw: 587, tpsa: 15, rotb: 10, hbd: 6, hba: 11 }), ['clogp', 'mw', 'tpsa', 'rotb', 'hbd', 'hba']);
  });
  test('특허 후보 1인 상한 — 2명 이하 모둠은 2개', () => {
    assert.deepEqual([1, 2, 3, 4].map(leadCandidatesPerPerson), [2, 2, 1, 1]);
  });
});
