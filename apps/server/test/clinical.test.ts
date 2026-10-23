// 4.1 임상(F41) 서버 순수 부분 — 비용 · 기간 = crista 규칙 · 규칙 생성 표 ↔ 검사 · 검사가 잡는 것 · 입력 해시 · 참고 판정 · 사이드바 줄.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PIPELINE_RULES } from '@crista/game-rules';
import { BOUNTY_REFUND_RATE as SHARED_RATE } from '@crista/shared-types';
import { PHASE_RULES, TRIAL_BOUNTY_RATE, TRIAL_PHASES, phaseCostCents, type HoldKind, type TrialPhase, type TrialSimResult } from '@crista-web/web-contract';
import { SIM_DIVERGE, buildFacts, divergesFromReference, referenceFor, ruleVerdictOf, type PatentFacts } from '../src/features/clinical.ts';
import { TRIAL_SIM_SCHEMA, compactSim, expandSim, buildSimSystemPrompt, buildSimUserMessage, ruleSimulate, simInputHash, validateSimulation, type SimInput } from '../src/features/clinical-sim.ts';
import { computeSteps } from '../src/pipeline.ts';

const patent: PatentFacts = {
  patentId: '00000000-0000-4000-8000-000000000001',
  codeName: 'SEUM-102',
  smiles: 'CCO',
  status: 'active',
  affinityKcal: -10.4,
  targetId: 'dpp4-1x70',
  mrsd: { oral: 50, iv: 10, transdermal: 100 },
  preclinical: { noaelMgPerKgDay: { rat: 30, dog: 10 }, hedMgPerKg: 5.4, mrsdMgByForm: { oral: 50, iv: 10, transdermal: 100 }, findings: ['liver'], safetyFactor: 10 },
};
const props = { mw: 410, clogp: 2.8, tpsa: 78, hbd: 2, hba: 6, rotb: 5, basicAmines: 1, alerts: [] };

function facts(phase: TrialPhase, targetId = 'dpp4-1x70') {
  return buildFacts({ patent: { ...patent, targetId }, props, targetId, phase, attempt: 1, form: 'oral', doseMg: 50, population: '성인 환자', endpoint: '24주 HbA1c 변화량', previous: [] });
}
function input(phase: TrialPhase, targetId?: string, enrolled?: number): SimInput {
  const f = facts(phase, targetId);
  const n = enrolled ?? f.recruit.targetN;
  const ref = referenceFor(f, n, 'class-seed', `rev:${phase}:1`);
  return { facts: f, enrolled: n, refPassProb: ref.passProb, cohort: ref.cohort };
}

describe('비용 · 기간 · 환급률 = crista 규칙 사본', () => {
  test('상 비용(센트) · 기간(게임 일)', () => {
    for (const phase of TRIAL_PHASES) {
      assert.equal(phaseCostCents(phase), PIPELINE_RULES.cost.stepCents[phase], phase);
      // 임상 기간은 수업 시간에 맞춰 crista 규칙의 절반(2026-10-24).
      assert.equal(PHASE_RULES[phase].gameDays, PIPELINE_RULES.durationDays[phase] / 2, phase);
      assert.equal(TRIAL_BOUNTY_RATE[phase], SHARED_RATE[phase]);
    }
  });
});

describe('사실 · 참고 판정', () => {
  test('사실에는 SMILES 가 없고 군 · 모집 규칙이 들어간다', () => {
    const f = facts('phase2');
    assert.ok(!JSON.stringify(f).includes('CCO'));
    assert.deepEqual(f.arms.map((a) => a.id), ['control', 'mid', 'high']);
    assert.equal(f.arms.find((a) => a.id === 'mid')!.doseMg, 25);
    assert.equal(f.recruit.targetN, 180);
    assert.equal(f.thresholds.efficacy, 40);
  });
  test('참고 판정은 결정적 · 인원이 적으면 흔들림 폭이 넓다', () => {
    const f = facts('phase3');
    const a = referenceFor(f, 600, 'seed', 's1');
    const b = referenceFor(f, 600, 'seed', 's1');
    assert.deepEqual(a, b);
    assert.ok(referenceFor(f, 360, 'seed', 's1').noiseRange > a.noiseRange);
    assert.ok(a.passProb >= 0 && a.passProb <= 1);
  });
  test('입력 해시 — 같은 입력이면 같고, 코호트(재도전)가 바뀌면 다르다', () => {
    const i = input('phase2');
    assert.equal(simInputHash(i), simInputHash({ ...i, facts: { ...i.facts } }));
    assert.notEqual(simInputHash(i), simInputHash({ ...i, cohort: 'other' }));
    assert.match(simInputHash(i), /^[0-9a-f]{64}$/);
  });
  test('프롬프트 — 시스템 고정부는 512 토큰 이상(캐시) · 사용자 칸에 SMILES 없음 · 문제 목록을 붙인다', () => {
    assert.ok(buildSimSystemPrompt().length > 1200);
    const msg = buildSimUserMessage(input('phase1'), ['합이 틀려요']);
    assert.ok(!msg.includes('CCO'));
    assert.ok(msg.includes('<problems>') && msg.includes('합이 틀려요'));
  });
});

describe('AI 시뮬레이션을 쓸 수 없을 때 — 규칙 판정(교사 대기 없음)', () => {
  test('판정은 시작 때 저장한 game-rules 판정을 따른다', () => {
    const ref = referenceFor(facts('phase2'), 180, 'seed', 's1');
    const v = ruleVerdictOf(ref);
    assert.equal(v.verdict, ref.judgement.passed ? 'pass' : 'held');
    if (v.verdict === 'held') assert.equal(v.holdKind, ref.judgement.failure ?? 'efficacy');
    else assert.equal(v.holdKind, null);
  });
  test('통과 · 보류 판정에 맞는 결정적 숫자 표를 만든다', () => {
    const i = input('phase2');
    assert.equal(ruleSimulate(i, 'pass', null).verdict, 'pass');
    assert.equal(ruleSimulate(i, 'held', 'safety').verdict, 'held');
    assert.deepEqual(ruleSimulate(i, 'pass', null), ruleSimulate(i, 'pass', null));
  });
});

describe('검토 보강(F41 수리)', () => {
  test('프롬프트에 검정력(설계 §5.14 입력) — 인원이 적으면 낮다 · 미성년자 안전 문장', () => {
    const power = (n: number) => Number(/"statisticalPower": ([0-9.]+)/.exec(buildSimUserMessage(input('phase2', undefined, n)))?.[1]);
    assert.ok(power(180) >= 0.79 && power(180) <= 0.81, String(power(180)));
    assert.ok(power(108) < power(180));
    assert.match(buildSimSystemPrompt(), /자극적으로 묘사하지 않고/);
    assert.match(buildSimSystemPrompt(), /18세 미만/);
    assert.match(buildSimSystemPrompt(), /같은 프로토콜로 다시/);
  });
  test('AI 판정 ↔ 참고 확률 크게 어긋남(교사 알림) 문턱', () => {
    assert.equal(divergesFromReference('pass', SIM_DIVERGE.passBelow - 0.01), true);
    assert.equal(divergesFromReference('pass', SIM_DIVERGE.passBelow), false);
    assert.equal(divergesFromReference('held', SIM_DIVERGE.heldAbove + 0.01), true);
    assert.equal(divergesFromReference('held', 0.5), false);
    assert.equal(divergesFromReference('pass', 0.95), false);
  });
});

describe('규칙 생성 표 ↔ 서버 검사', () => {
  const cases: Array<[TrialPhase, 'pass' | 'held', HoldKind | null, string]> = [];
  for (const phase of TRIAL_PHASES) {
    for (const target of ['dpp4-1x70', 'egfr-1m17', 'ache-4ey7', 'cox2-3ln1']) {
      cases.push([phase, 'pass', null, target], [phase, 'held', 'efficacy', target], [phase, 'held', 'safety', target], [phase, 'held', 'operational', target]);
    }
  }
  for (const [phase, verdict, hold, target] of cases) {
    test(`${phase} ${verdict}${hold ? ` ${hold}` : ''} ${target} — 검사 통과 · 스키마 통과`, () => {
      const i = input(phase, target, phase === 'phase3' ? 420 : undefined);
      const out = ruleSimulate(i, verdict, hold);
      assert.deepEqual(validateSimulation(i.facts, i.enrolled, out), []);
      const compact = compactSim(i.facts, out);
      assert.ok(TRIAL_SIM_SCHEMA.safeParse(compact).success);
      const back = expandSim(i.facts, compact);
      assert.deepEqual(back.problems, []);
      assert.deepEqual(validateSimulation(i.facts, i.enrolled, back.result!), []);
      assert.equal(out.verdict, verdict);
    });
  }
  test('결정적 — 같은 입력 · 판정이면 같은 표', () => {
    const i = input('phase2');
    assert.deepEqual(ruleSimulate(i, 'pass', null), ruleSimulate(i, 'pass', null));
  });
});

describe('압축 꼴 펼치기', () => {
  test('군 수가 틀린 배열 · 없는 기관계 → 문제 목록', () => {
    const i = input('phase2');
    const compact = compactSim(i.facts, ruleSimulate(i, 'pass', null));
    compact.sae = [0];
    compact.adverseEvents[0]!.system = 'brain';
    const out = expandSim(i.facts, compact);
    assert.equal(out.result, null);
    assert.ok(out.problems.some((p) => p.startsWith('sae')));
    assert.ok(out.problems.some((p) => p.includes("'brain'")));
  });
});

describe('검사가 잡는 것', () => {
  const i = input('phase2');
  const good = (): TrialSimResult => structuredClone(ruleSimulate(i, 'pass', null));
  test('군 인원 합 · CONSORT', () => {
    const out = good();
    out.arms[0]!.randomized += 5;
    const bad = validateSimulation(i.facts, i.enrolled, out);
    assert.ok(bad.some((b) => b.includes('randomized 합')));
    assert.ok(bad.some((b) => b.includes('completed')));
  });
  test('p 와 신뢰구간 앞뒤 · 통과인데 효능 유의하지 않음', () => {
    const out = good();
    out.primary.comparison!.p = 0.3;
    const bad = validateSimulation(i.facts, i.enrolled, out);
    assert.ok(bad.some((b) => b.includes('신뢰구간이 0 을 포함하지 않아요')));
    assert.ok(bad.some((b) => b.includes('통과인데 효능')));
  });
  test('없는 군 · 건수 초과 · 판정과 보류 종류', () => {
    const out = good();
    out.sae.push({ arm: 'ghost', n: 1 });
    out.adverseEvents[0]!.counts[0]!.n = 9999;
    out.holdKind = 'safety';
    const bad = validateSimulation(i.facts, i.enrolled, out);
    assert.ok(bad.some((b) => b.includes("'ghost'")));
    assert.ok(bad.some((b) => b.includes('건수')));
    assert.ok(bad.some((b) => b.includes('holdKind')));
  });
  test('글에 구조식 같은 긴 문자열 · 생존 곡선은 항암에서만', () => {
    const out = good();
    out.analysis = 'CC(=O)OC1=CC=CC=C1C(=O)O 를 썼어요 그리고 결과는 좋았어요';
    out.survival = [{ arm: 'high', points: [{ month: 0, pct: 100 }] }];
    const bad = validateSimulation(i.facts, i.enrolled, out);
    assert.ok(bad.some((b) => b.includes('구조식')));
    assert.ok(bad.some((b) => b.includes('항암 2 · 3상에서만')));
  });
});

describe('사이드바 4.1 줄', () => {
  const stage = { leadCandidates: 1, activePatents: 1, iacucApproved: true, animalDone: true, leadChosen: true, ind: { status: 'approved' as const } };
  const step41 = (trial: Parameters<typeof computeSteps>[0]['stage'] extends infer S ? (S extends { trial?: infer T } ? T : never) : never) =>
    computeSteps({ targetId: 'dpp4-1x70', facts: new Map([['1.2', { step: '1.2', done: true, active: false, progress: null, by_name: null }], ['2.1', { step: '2.1', done: true, active: false, progress: null, by_name: null }]]) as never, balanceCents: 1e9, stage: { ...stage, trial } }).find((s) => s.id === '4.1')!;
  test('준비 · 모집 · 진행 · 보류 · 3상 통과', () => {
    assert.equal(step41(null).sub, '1상 준비');
    assert.equal(step41(null).state, 'ready');
    const run = step41({ phase: 'phase2', status: 'running', attempt: 1, progressPct: 42, phase3Passed: false });
    assert.equal(run.sub, '2상 · 42%');
    assert.equal(run.state, 'running');
    const held = step41({ phase: 'phase1', status: 'held', attempt: 1, progressPct: 100, phase3Passed: false });
    assert.equal(held.sub, '1상 보류 · 재도전 가능');
    assert.equal(held.state, 'held');
    assert.equal(step41({ phase: 'phase1', status: 'completed', attempt: 1, progressPct: 100, phase3Passed: false }).sub, '2상 준비');
    assert.equal(step41({ phase: 'phase3', status: 'completed', attempt: 1, progressPct: 100, phase3Passed: true }).state, 'done');
  });
});
