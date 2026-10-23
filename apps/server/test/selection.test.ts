/**
 * FSEL 서버 순수 함수 — 라이브러리 이정표(숫자 두 개) · 출신 · 알려진 물질 · E · S 격자(game-rules 같은 함수) · 찜 회고 평균 · 근거 칩 재료.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PIPELINE_RULES, scoreCandidate } from '@crista/game-rules';
import type { MoleculeProperties } from '@crista/shared-types';
import { candidateReasonVerdict, type AdmetView } from '@crista-web/web-contract';
import { baseCell, bestEfficacy, candidateFacts, freeSlot, libraryIndex, resolveOrigins, retroMeans, scoreGrid, type LibraryCompound } from '../src/features/selection.ts';

const T = 'ache-4ey7';
const LIB: LibraryCompound[] = [
  { chemblId: 'CHEMBL502', name: '도네페질', canonicalSmiles: 'DON', flatSmiles: 'DON', library: 'ChEMBL 승인약', targetId: T, mechanism: 'AChE 억제제', vinaKcalByTarget: { [T]: -11.84 } },
  { chemblId: 'CRX-ACHE-03', name: '사내 3', canonicalSmiles: 'CRX3', flatSmiles: 'CRX3', library: '사내 합성 후보', targetId: T, mechanism: '인다논', vinaKcalByTarget: { [T]: -12.2 } },
  { chemblId: 'CHEMBL408', name: 'Troglitazone', canonicalSmiles: 'TRO', flatSmiles: 'TRO', library: 'ChEMBL 승인약', targetId: null, mechanism: 'PPAR agonist', vinaKcalByTarget: { [T]: -12.81 } },
  { chemblId: 'ZINC1', name: '작은 분자', canonicalSmiles: 'Z1', flatSmiles: 'Z1', library: 'ZINC 소형', targetId: null, mechanism: 'MOL', vinaKcalByTarget: { [T]: -5.1 } },
  { chemblId: 'NOVINA', name: '도킹 실패', canonicalSmiles: 'NV', library: 'ChEMBL 승인약', vinaKcalByTarget: {} },
  { chemblId: 'CHEMBL90', name: 'Histamine', canonicalSmiles: 'HIS', flatSmiles: 'HIS', library: 'ZINC 소형', targetId: null, vinaKcalByTarget: { [T]: -4.7 } },
];

const props = (over: Partial<MoleculeProperties> = {}): MoleculeProperties => ({
  canonicalSmiles: 'X',
  flatSmiles: 'X',
  mw: 379.5,
  clogp: 2.4,
  tpsa: 38.8,
  hbd: 0,
  hba: 4,
  rotb: 6,
  aromaticRings: 2,
  qed: 0.75,
  basicAmines: 0,
  alerts: [],
  engine: 'test',
  ...over,
});

describe('라이브러리 이정표', () => {
  test('가운데값 · 1위는 숫자만 · 사전 값 없는 분자는 세지 않는다 · 순위는 깊은 순', () => {
    const idx = libraryIndex(LIB, T);
    assert.equal(idx.count, 5);
    assert.equal(idx.topKcal, -12.81);
    assert.equal(idx.medianKcal, -11.84);
    assert.equal(idx.rank.get('CHEMBL408'), 1);
    assert.equal(idx.rank.get('ZINC1'), 4);
    assert.equal(idx.histamineKcal, -4.7, '이정표 히스타민(이름 붙은 기준점)');
    assert.equal(libraryIndex(LIB.filter((c) => c.chemblId !== 'CHEMBL90'), T).histamineKcal, null);
    assert.equal(libraryIndex(LIB.filter((c) => c.chemblId !== 'CHEMBL90'), T).medianKcal, round2((-12.2 + -11.84) / 2));
    assert.equal(idx.rank.get('NOVINA'), undefined);
    assert.equal(idx.byFlat.get('Z1')?.mechanism, null, "'MOL' 같은 빈 기전은 버린다");
  });
});
const round2 = (v: number) => Math.round(v * 100) / 100;

describe('출신 · 이미 알려진 물질', () => {
  const idx = libraryIndex(LIB, T);
  const ref = { flatSmiles: 'DON', smiles: 'DON' };
  const jobs = [
    { id: 'j-don', smiles: 'DON', flatSmiles: 'DON', parentJobId: null, createdAt: 1 },
    { id: 'j-tro', smiles: 'TRO', flatSmiles: 'TRO', parentJobId: null, createdAt: 2 },
    { id: 'j-crx', smiles: 'CRX3', flatSmiles: 'CRX3', parentJobId: null, createdAt: 3 },
    { id: 'j-var', smiles: 'CRX3F', flatSmiles: 'CRX3F', parentJobId: 'j-crx', createdAt: 4 },
    { id: 'j-var2', smiles: 'CRX3FF', flatSmiles: 'CRX3FF', parentJobId: 'j-var', createdAt: 5 },
    { id: 'j-new', smiles: 'NEW', flatSmiles: 'NEW', parentJobId: null, createdAt: 6 },
    { id: 'j-zinc', smiles: 'Z1-canon', flatSmiles: 'Z1', parentJobId: null, createdAt: 7 },
  ];
  const o = resolveOrigins(jobs, idx, T, ref);
  test('기준 리간드 — 이 표적 · 알려진 물질(reference) · 대기열 제외 표시', () => {
    assert.deepEqual([o.get('j-don')!.origin.kind, o.get('j-don')!.known, o.get('j-don')!.isReference], ['this', 'reference', true]);
  });
  test('다른 병의 약 — 출신 other · 기전 · 승인약', () => {
    const t = o.get('j-tro')!;
    assert.deepEqual([t.origin.kind, t.origin.mechanism, t.known], ['other', 'PPAR agonist', 'approved']);
  });
  test('사내 후보는 알려진 물질이 아니다 · 변형체는 부모의 출신 + 계열(맨 처음 조상)', () => {
    assert.equal(o.get('j-crx')!.known, null);
    const v2 = o.get('j-var2')!;
    assert.deepEqual([v2.origin.kind, v2.origin.variant, v2.origin.family, v2.known], ['this', true, 'CRX-ACHE-03', null]);
  });
  test('라이브러리에 없고 부모도 없으면 출신 모름 · 평면 SMILES 로 ZINC 를 찾는다', () => {
    assert.equal(o.get('j-new')!.origin.kind, 'unknown');
    assert.equal(o.get('j-zinc')!.known, 'zinc');
  });
  test('라이브러리를 못 읽어도(워커 없음) 기준 리간드만은 알아본다', () => {
    const none = resolveOrigins(jobs, null, T, ref);
    assert.equal(none.get('j-don')!.isReference, true);
    assert.equal(none.get('j-tro')!.origin.kind, 'unknown');
  });
});

describe('E · S 격자 — game-rules scoreCandidate 와 같은 값', () => {
  test('제형 3 × 용량 3 · 경구 50 mg 칸이 같은 함수의 값', () => {
    const p = props({ basicAmines: 1, clogp: 4.36 });
    const grid = scoreGrid(-11.0, p, true, -11.84);
    assert.equal(grid.length, 9);
    const want = scoreCandidate({ affinityKcal: -11.0, props: p, dose: 50, formulation: 'oral', cns: true, referenceKcal: -11.84 });
    const cell = baseCell(grid)!;
    assert.equal(cell.efficacy, want.efficacy);
    assert.equal(cell.safety, want.safety);
    assert.equal(cell.inputs.R, want.inputs.R);
    // 몸속 여행 지도 — 심장 · 간에서 깎이는 양을 나눠 적어도 R 과 맞는다.
    for (const c of grid) assert.ok(Math.abs(1 + c.inputs.herg + c.inputs.liver - c.inputs.R) < 1e-9, `${c.form} ${c.dose}`);
    assert.equal(cell.inputs.herg, PIPELINE_RULES.risk.herg.high, '염기성 아민 + cLogP 4.36 → hERG 높음');
  });
  test('근거 칩 재료 — 효능 1위는 기준 약 · 실패 줄을 빼고 센다 · IND 기준은 규칙 값', () => {
    const good = scoreGrid(-12.5, props(), true, -11.84);
    const weak = scoreGrid(-9.0, props(), true, -11.84);
    const rows = [
      { isReference: true, status: 'succeeded', scores: scoreGrid(-15, props(), true, -11.84) },
      { isReference: false, status: 'failed', scores: scoreGrid(-15, props(), true, -11.84) },
      { isReference: false, status: 'succeeded', scores: good },
      { isReference: false, status: 'succeeded', scores: weak },
    ] as Array<Pick<AdmetView, 'isReference' | 'status' | 'scores'>>;
    const best = bestEfficacy(rows);
    assert.equal(best, baseCell(good)!.efficacy);
    const facts = candidateFacts({ signals: null, radarOut: [], scores: weak }, best, true);
    assert.equal(facts.indSafetyMin, PIPELINE_RULES.thresholds.ind.safety);
    assert.equal(candidateReasonVerdict('top_efficacy', { ...facts, signals: { ro5Violations: 0, oralAbsorption: 'good', bbb: 'high', herg: 'low', hepatotoxicity: 'low', transdermal: 'suitable' } }).status, 'block');
  });
});

describe('찜 회고', () => {
  test('우리 찜 평균 · 1.2 결합 예측(표적 점수) 상위 n 평균 — 사전 값은 평균 두 개만', () => {
    const r = retroMeans(
      [{ vinaKcal: -10 }, { vinaKcal: -12 }, { vinaKcal: null }],
      [
        { screenScore: 0.9, vinaKcal: -13 },
        { screenScore: 0.5, vinaKcal: -8 },
        { screenScore: 0.8, vinaKcal: -11 },
        { screenScore: 0.7 },
      ],
    );
    assert.deepEqual(r, { n: 3, ourMeanKcal: -11, topMeanKcal: -12 });
  });
});

describe('빈 칸 고르기 — 상한은 가진 수로 센다', () => {
  test('1인 2개(대기열) — 비어 있는 칸 번호', () => {
    assert.equal(freeSlot([], 2), 1);
    assert.equal(freeSlot([1], 2), 2);
    assert.equal(freeSlot([2], 2), 1);
    assert.equal(freeSlot([1, 2], 2), undefined);
  });
  test('특허 후보 — 2명 모둠 때 칸 2 를 받은 사람은 모둠이 커져(1인 1개) 칸 1 을 또 받지 못한다', () => {
    assert.equal(freeSlot([2], 1), undefined);
    assert.equal(freeSlot([], 1), 1);
    assert.equal(freeSlot([1], 1), undefined);
  });
});
