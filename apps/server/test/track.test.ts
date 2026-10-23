/**
 * 트랙 등록표(3판 통합) — `computeSteps` 가 트랙을 인자로 받고, 'antibody' 는 빈 자리, 규칙을 꽂으면 그 규칙을 쓴다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ANTIBODY_TRACK, DEFAULT_TRACK, DRUG_TRACK, STEP_IDS, STEP_META, TRACKS, isTrackId } from '@crista-web/web-contract';
import { computeSteps, registerTrackSteps, TRACK_STEP_RULES } from '../src/pipeline.ts';

const none = new Map();

describe('트랙 등록표', () => {
  test('규격 — 소분자 등록표는 9단계(STEP_META 그대로) · 항체는 빈 자리 · 기본 트랙 drug', () => {
    assert.equal(DEFAULT_TRACK, 'drug');
    assert.deepEqual(DRUG_TRACK.steps.map((s) => s.id), [...STEP_IDS]);
    for (const s of DRUG_TRACK.steps) {
      const m = STEP_META[s.id as keyof typeof STEP_META];
      assert.deepEqual([s.group, s.index, s.title, s.sub], [m.group, m.index, m.title, m.sub]);
    }
    assert.equal(ANTIBODY_TRACK.steps.length, 0);
    assert.deepEqual(Object.keys(TRACKS).sort(), ['antibody', 'drug']);
    assert.ok(isTrackId('antibody') && !isTrackId('protein'));
  });

  test('서버 — 트랙을 비우면 drug(9단계) · drug 를 넘겨도 같음 · antibody 는 0단계', () => {
    const base = { targetId: 'ache-4ey7', facts: none, balanceCents: 1e9 };
    const implicit = computeSteps(base);
    assert.equal(implicit.length, 9);
    assert.deepEqual(computeSteps({ ...base, track: 'drug' }), implicit);
    assert.deepEqual(computeSteps({ ...base, track: 'antibody' }), []);
  });

  test('서버 — 항체 랩이 규칙을 꽂으면 그 규칙으로 센다(소분자 규칙은 그대로)', () => {
    const before = TRACK_STEP_RULES.antibody;
    try {
      registerTrackSteps('antibody', () => [{ id: '1.1', group: 1, index: 1, state: 'ready', evidence: ['dataset'] }]);
      assert.equal(computeSteps({ targetId: null, facts: none, balanceCents: 0, track: 'antibody' }).length, 1);
      assert.equal(computeSteps({ targetId: null, facts: none, balanceCents: 0 }).length, 9);
    } finally {
      registerTrackSteps('antibody', before);
    }
  });
});
