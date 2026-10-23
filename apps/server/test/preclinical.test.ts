/**
 * F32 3.2 전임상 — 서버 순수 검사(윤리 채점 · 설정 · 실행 요청 · 계산 칸 · 판정 재료 · 종료보고서). DB 를 쓰는 흐름은 scripts/e2e-preclinical.ts.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MoleculeProperties } from '@crista/shared-types';
import { ANIMALS_PER_CANDIDATE, ANIMAL_STUDY_COST_CENTS, ALT_ASSAY_COST_CENTS, PRECLINICAL_RULES, cristaToCents, type PreclinicalRunView } from '@crista-web/web-contract';
import { STEP_COST_CENTS, STEP_DURATION_GAME_DAYS, computeSteps } from '../src/pipeline.ts';
import { checkCalcAnswers, checkRunRequest, checkSettings, gradeEthics, preclinicalInput, reportRows } from '../src/features/preclinical.ts';

const props = (over: Partial<MoleculeProperties> = {}): MoleculeProperties => ({
  canonicalSmiles: 'C',
  flatSmiles: 'C',
  mw: 380,
  clogp: 4.1,
  tpsa: 60,
  hbd: 1,
  hba: 5,
  rotb: 5,
  aromaticRings: 2,
  qed: 0.6,
  basicAmines: 1,
  alerts: [],
  engine: 'test',
  ...over,
});

describe('① 윤리 확인 문제 — 규칙 채점', () => {
  test('모두 맞으면 이수 · 하나라도 틀리면 그 문제만 짚는다', () => {
    assert.equal(gradeEthics({ answers: { q1: 'replacement', q2: 'D', q3: 'weight20' } }).passed, true);
    const wrong = gradeEthics({ answers: { q1: 'reduction', q2: 'D', q3: 'weight20' } });
    assert.equal(wrong.passed, false);
    assert.deepEqual(wrong.correct, { q1: false, q2: true, q3: true });
    assert.equal(gradeEthics(null).passed, false);
    assert.equal(gradeEthics({ answers: { q1: 'x'.repeat(50), q2: 'D', q3: 'weight20' } }).correct.q1, false);
  });
});

describe('② 계획서 설정 검사', () => {
  test('expectedVersion 필수 · 수준 · 고통등급 · 종료시점 범위 · uuid', () => {
    assert.throws(() => checkSettings({}), /expectedVersion/);
    assert.throws(() => checkSettings({ expectedVersion: 0, level: 'lots' }), /마릿수/);
    assert.throws(() => checkSettings({ expectedVersion: 0, painGrade: 'F' }), /A~E/);
    assert.throws(() => checkSettings({ expectedVersion: 0, endpointPct: 60 }), /1~50/);
    assert.throws(() => checkSettings({ expectedVersion: 0, patentIds: ['nope'] }));
    const ok = checkSettings({ expectedVersion: 3, level: 'low', painGrade: null, endpointPct: 20, patentIds: ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'] });
    assert.deepEqual(ok, { expectedVersion: 3, level: 'low', painGrade: null, endpointPct: 20, patentIds: ['00000000-0000-4000-8000-000000000001'] });
  });
});

describe('③ ④ 실행 요청 · 계산 칸', () => {
  const pid = '00000000-0000-4000-8000-000000000002';
  test('실행 요청 — 종류 · 대체 시험 종류 · requestId', () => {
    assert.deepEqual(checkRunRequest({ requestId: 'abcdefgh', patentId: pid, kind: 'animal_study' }), { requestId: 'abcdefgh', patentId: pid, kind: 'animal_study', assay: null });
    assert.equal(checkRunRequest({ requestId: 'abcdefgh', patentId: pid, kind: 'alt_assay', assay: 'herg' }).assay, 'herg');
    assert.throws(() => checkRunRequest({ requestId: 'abcdefgh', patentId: pid, kind: 'alt_assay', assay: 'ames' }));
    assert.throws(() => checkRunRequest({ requestId: 'x', patentId: pid, kind: 'animal_study' }));
  });
  test('계산 칸 — 빈 칸은 null · 음수 · 글자는 400', () => {
    assert.deepEqual(checkCalcAnswers({ hedRat: '2.9', hedDog: 10, hed: '', mrsd: 60 }), { hedRat: 2.9, hedDog: 10, hed: null, mrsd: 60 });
    assert.throws(() => checkCalcAnswers({ hed: -1 }));
    assert.throws(() => checkCalcAnswers({ hed: 'abc' }));
  });
  test('판정 재료 — RDKit 물성 → game-rules 신호 · 결합력 p(기준 리간드면 0.9)', () => {
    const input = preclinicalInput({ targetId: 'ache-4ey7', props: props(), affinityKcal: -11.84, seed: 's' });
    assert.equal(input.cns, true);
    assert.ok(Math.abs(input.p - 0.9) < 1e-9);
    assert.equal(input.herg, 'high'); // 염기성 아민 1 · cLogP 4.1 ≥ 3.7
    assert.equal(input.hepatotoxicity, 'moderate'); // cLogP 4.1 > 3 · TPSA 60 < 75
    assert.equal(preclinicalInput({ targetId: 'egfr-1m17', props: props(), affinityKcal: null, seed: 's' }).p, 0.5);
    // 설계 예시(Rk 1.85) — 경구 MRSD 60 mg.
    assert.equal(PRECLINICAL_RULES.study(input, 'standard').mrsdMgByForm.oral, 60);
  });
});

describe('비용 · 기간 · 단계 상태', () => {
  test('대체 시험 50,000 · 동물실험 400,000 크리스타 · 28게임 일 — 단계 칩', () => {
    assert.equal(ALT_ASSAY_COST_CENTS, cristaToCents(50_000));
    assert.equal(ANIMAL_STUDY_COST_CENTS, cristaToCents(400_000));
    assert.equal(STEP_COST_CENTS['3.2'], ANIMAL_STUDY_COST_CENTS);
    assert.equal(STEP_DURATION_GAME_DAYS['3.2'], 28);
  });
  test('3.2 완료 = 승인 계획서 + 동물실험 1건 + 주력 — 하나라도 없으면 완료 아님', () => {
    const facts = new Map();
    const base = { leadCandidates: 1, activePatents: 1, iacucApproved: true, animalDone: true, leadChosen: true };
    const state = (stage: Partial<typeof base>) => computeSteps({ targetId: 't', facts, balanceCents: 1e12, stage }).find((s) => s.id === '3.2')!.state;
    assert.equal(state(base), 'done');
    for (const k of ['iacucApproved', 'animalDone', 'leadChosen'] as const) assert.notEqual(state({ ...base, [k]: false }), 'done');
  });
});

describe('종료보고서 — 사용 마릿수 · 인도적 종료 · 대체 시험으로 덜 쓴 수', () => {
  const study = PRECLINICAL_RULES.study({ targetId: 'egfr-1m17', cns: false, p: 0.7, herg: 'moderate', hepatotoxicity: 'low', oralAbsorption: 'good', bbb: 'moderate', seed: 'r' }, 'standard');
  const run = (over: Partial<PreclinicalRunView>): PreclinicalRunView => ({
    jobId: 'j', patentId: 'a', codeName: 'SEUM-101', kind: 'animal_study', designKey: 'animal:standard', level: 'standard', assay: null, status: 'succeeded',
    progressPct: 100, startGameDay: 0, endsGameDay: 28, byName: null, avatar: null, costCents: 0, result: study, calc: null, ...over,
  });
  test('동물실험 후보 · 대체 시험만 하고 뺀 후보(승인 판에 없음) · 아무것도 안 한 후보', () => {
    const rows = reportRows(
      [{ id: 'a', code_name: 'SEUM-101' }, { id: 'b', code_name: 'SEUM-102' }, { id: 'c', code_name: 'SEUM-103' }],
      [run({}), run({ jobId: 'k', patentId: 'b', kind: 'alt_assay', designKey: 'alt:herg', level: null, assay: 'herg', result: { kind: 'alt_assay', assay: 'herg', band: 'high', value: 0.5, unit: 'µM' } })],
      { version: 3, level: 'standard', patentIds: ['a'], painGrade: 'D', endpointPct: 20, performerIds: [] },
    );
    assert.equal(rows[0]!.animalsUsed, ANIMALS_PER_CANDIDATE.standard);
    assert.equal(rows[0]!.humaneEndpoints, study.humaneEndpoints);
    assert.equal(rows[0]!.painGrade, 'D');
    assert.equal(rows[1]!.excludedByAlt, true);
    assert.equal(rows[1]!.animalsSaved, ANIMALS_PER_CANDIDATE.standard);
    assert.equal(rows[2]!.animalsSaved, 0);
  });
  test('진행 중인 묶음도 사용 마릿수에 센다 · 실패는 세지 않는다', () => {
    const rows = reportRows([{ id: 'a', code_name: 'X' }], [run({ status: 'running', result: null }), run({ jobId: 'f', status: 'failed', level: 'high' })], null);
    assert.equal(rows[0]!.animalsUsed, ANIMALS_PER_CANDIDATE.standard);
    assert.equal(rows[0]!.humaneEndpoints, 0);
  });
});
