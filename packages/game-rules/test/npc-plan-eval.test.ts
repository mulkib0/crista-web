/**
 * T-3b-1(준비) — 자율계획 평가 자료 40건의 형식과 규칙 선택기 결과. **합격 판정은 하지 않는다**(설계서 §10 '규칙 기준선' — 사람이 출처를 가리고 비교).
 * 여기서는 자료가 쓸 수 있는 모양인지, 규칙 선택기가 늘 후보 안에서 같은 답을 내는지만 본다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { NPC_PLAN_CANDIDATES_MAX, type FacilityKind, type FacilityRunState } from '@crista/shared-types';
import { buildHqMap, npcPlanCandidates, selectNpcPlanByRules } from '../src/index.ts';

interface EvalCase {
  id: string;
  type: string;
  input: {
    facilities: Record<FacilityKind, [number, FacilityRunState]>;
    at: { tx: number; ty: number };
    currentSpotId: string | null;
    recentSpotIds: string[];
    avoidSpotIds?: string[];
    event: string;
    descriptionOverrides?: Record<string, string>;
  };
  expected: { allowedCandidateIds: string[]; forbiddenCandidateIds: string[] };
  metadata: { note: string; reviewed: boolean };
}

const doc = JSON.parse(readFileSync(new URL('./fixtures/npc-plan-eval.json', import.meta.url), 'utf8')) as { cases: EvalCase[]; typesMapping: Record<string, string> };

function run(c: EvalCase) {
  const facilities = Object.fromEntries(Object.entries(c.input.facilities).map(([k, [tier]]) => [k, tier])) as Record<FacilityKind, 0 | 1 | 2 | 3>;
  const facilityStates = Object.fromEntries(Object.entries(c.input.facilities).map(([k, [, s]]) => [k, s])) as Record<FacilityKind, FacilityRunState>;
  const map = buildHqMap({ id: 'eval', companyName: '평가', facilities, facilityStates }, { npcMovement: true });
  const candidates = npcPlanCandidates({ map, role: 'researcher', facilityOf: (k) => ({ tier: c.input.facilities[k][0], state: c.input.facilities[k][1] }) }).filter(
    (x) => !(c.input.avoidSpotIds ?? []).includes(x.destinationId),
  );
  const spots = new Map(map.npcSpots.map((s) => [s.id, s]));
  const choice = selectNpcPlanByRules(candidates, { at: c.input.at, currentSpotId: c.input.currentSpotId, recentSpotIds: c.input.recentSpotIds }, (id) => spots.get(id));
  return { ids: candidates.map((x) => x.id), choice };
}

test('T-3b-1 평가 자료 — 8유형 × 5 = 40건 · 필수 칸 · id 유일 · 사람 확인 전 표시', () => {
  assert.equal(doc.cases.length, 40);
  const byType = new Map<string, number>();
  for (const c of doc.cases) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  assert.deepEqual([...byType.values()], Array(8).fill(5));
  assert.deepEqual([...byType.keys()].sort(), Object.keys(doc.typesMapping).sort());
  assert.equal(new Set(doc.cases.map((c) => c.id)).size, 40);
  for (const c of doc.cases) {
    assert.ok(c.input && c.expected && c.metadata, c.id);
    assert.ok(c.expected.allowedCandidateIds.length > 0, `${c.id} 허용 목록`);
    assert.equal(c.metadata.reviewed, false, '기대값은 사람 확인 전 초안이다');
    for (const x of c.expected.allowedCandidateIds) assert.ok(!c.expected.forbiddenCandidateIds.includes(x), `${c.id} 허용 · 금지 겹침 ${x}`);
  }
});

test('T-3b-1 규칙 선택기 — 40건 모두 후보(≤ 12) 안 · 결정적 · 허용 목록의 id 는 실제 후보에 있다', () => {
  for (const c of doc.cases) {
    const a = run(c);
    const b = run(c);
    assert.ok(a.ids.length <= NPC_PLAN_CANDIDATES_MAX);
    assert.ok(a.choice && a.ids.includes(a.choice.candidateId), `${c.id} 후보 안`);
    assert.deepEqual(a.choice, b.choice, `${c.id} 결정적`);
    for (const x of c.expected.allowedCandidateIds) assert.ok(a.ids.includes(x), `${c.id} 허용 ${x} 가 후보에 없다`);
  }
});
