/**
 * 1.1 규격 — 표적 8개 고르기 · 준비 상태 · 추천 근거 코치 · 가중치(설계 §5.4.2).
 * 화면의 추천 서랍과 서버의 `pickTarget` 이 같은 함수를 쓰므로, 여기서 고정한 값이 곧 두 곳의 값이다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkTargetPickReasons,
  isTargetPickReason,
  myTargetScore,
  pickWeightsOk,
  TARGET_DISEASE_GROUPS,
  TARGET_PICK_REASONS,
  targetShortlist,
  targetTier,
  type TargetRow,
} from '../src/target.ts';

const row = (symbol: string, rank: number, overallScore: number, extra: Partial<TargetRow> = {}): TargetRow => ({
  rank, symbol, ensemblId: `ENSG${rank}`, name: symbol, overallScore,
  geneticScore: 0, drugScore: 0, literatureScore: 0, expressionScore: 0,
  smPocket: true, smClinical: true, pdbId: null, dockingTargetId: null, ...extra,
});

// 알츠하이머 모양 — rank 1 = 도킹 표적(종합 점수는 낮다), 2~ = 종합 점수 순.
const ache = row('ACHE', 1, 0.6416, { drugScore: 0.9957, literatureScore: 0.9567, pdbId: '4EY7', dockingTargetId: 'ache-4ey7' });
const others = Array.from({ length: 29 }, (_, i) => row(`G${i + 2}`, i + 2, 0.9 - i * 0.01, { geneticScore: 0.9, pdbId: i % 2 ? '1ABC' : null }));

describe('targetShortlist', () => {
  test('rank 1~8 을 종합 점수 순으로 — 도킹 표적은 꼴찌여도 들어간다', () => {
    const list = targetShortlist([...others, ache]);
    assert.equal(list.length, 8);
    assert.equal(list[7], ache);
    assert.deepEqual(list.slice(0, 7).map((t) => t.rank), [2, 3, 4, 5, 6, 7, 8]);
  });
  test('도킹 표적이 rank 8 밖이면 마지막 자리를 바꾼다', () => {
    const far = { ...ache, rank: 29 };
    const list = targetShortlist([...others.slice(0, 27), far]);
    assert.ok(list.includes(far));
    assert.equal(list.length, 8);
  });
});

describe('준비 상태 · 가중치', () => {
  test('ready · pdb · none', () => {
    assert.equal(targetTier(ache), 'ready');
    assert.equal(targetTier(row('X', 3, 0.8, { pdbId: '1AAP' })), 'pdb');
    assert.equal(targetTier(row('Y', 4, 0.8)), 'none');
  });
  test('가중치는 4개 · 0~3 · 0.5 단위 · 모두 0 은 안 됨', () => {
    assert.ok(pickWeightsOk([1, 1, 1, 1]));
    assert.ok(pickWeightsOk([0, 2.5, 0, 3]));
    assert.ok(!pickWeightsOk([0, 0, 0, 0]));
    assert.ok(!pickWeightsOk([1, 1, 1]));
    assert.ok(!pickWeightsOk([1, 1, 1, 3.5]));
    assert.ok(!pickWeightsOk([1, 1, 1, 0.3]));
    assert.ok(!pickWeightsOk('1,1,1,1'));
  });
  test('내 점수 = 근거 × 가중치의 평균', () => {
    assert.equal(myTargetScore(ache, [0, 1, 0, 0]), 0.9957);
    assert.ok(Math.abs(myTargetScore(ache, [1, 1, 1, 1]) - (0.9957 + 0.9567) / 4) < 1e-9);
    assert.equal(myTargetScore(ache, [0, 0, 0, 0]), 0);
  });
});

describe('추천 근거 코치(시안 REASONS[].check)', () => {
  const statusOf = (id: string, t: TargetRow, rank = 1, takenBy?: string | null) => checkTargetPickReasons([id], t, { rank, takenBy })[0]?.check?.status ?? 'ok';
  test('근거 6종 · id 검사', () => {
    assert.equal(TARGET_PICK_REASONS.length, 6);
    assert.ok(isTargetPickReason('ready'));
    assert.ok(!isTargetPickReason('legacy'));
  });
  test('도킹 준비 — ✓ 아니면 막음', () => {
    assert.equal(statusOf('ready', ache), 'ok');
    assert.equal(statusOf('ready', row('APP', 2, 0.87, { pdbId: '1AAP' })), 'block');
  });
  test('종합 점수 — 4위부터 주의', () => {
    assert.equal(statusOf('score', ache, 3), 'ok');
    assert.equal(statusOf('score', ache, 8), 'warn');
  });
  test('유전 · 약물 · 발현 — 문턱', () => {
    assert.equal(statusOf('gen', ache), 'block'); // ACHE 유전 0
    assert.equal(statusOf('gen', row('A', 2, 0.8, { geneticScore: 0.7 })), 'warn');
    assert.equal(statusOf('gen', row('B', 2, 0.8, { geneticScore: 0.9 })), 'ok');
    assert.equal(statusOf('drug', ache), 'ok');
    assert.equal(statusOf('drug', row('C', 2, 0.8, { drugScore: 0.64 })), 'block');
    assert.equal(statusOf('expr', ache), 'block');
    assert.equal(statusOf('expr', row('D', 2, 0.8, { expressionScore: 0.45 })), 'warn');
    assert.equal(statusOf('expr', row('E', 2, 0.8, { expressionScore: 0.82 })), 'ok');
  });
  test('다른 모둠 — 모르면 주의 · 골랐으면 주의(조사) · 없으면 맞음', () => {
    assert.equal(statusOf('free', ache, 1, undefined), 'warn');
    assert.equal(statusOf('free', ache, 1, null), 'ok');
    const m = checkTargetPickReasons(['free'], ache, { rank: 1, takenBy: '다온테라퓨틱스' })[0]!.check!.message;
    assert.match(m, /^다온테라퓨틱스가 이미/);
  });
});

test('12대 질환 카탈로그 — 4군 × 3, MONDO 형식', () => {
  assert.equal(TARGET_DISEASE_GROUPS.length, 4);
  for (const g of TARGET_DISEASE_GROUPS) {
    assert.equal(g.diseases.length, 3);
    for (const d of g.diseases) assert.match(d.mondoId, /^MONDO_\d{7}$/);
  }
});
