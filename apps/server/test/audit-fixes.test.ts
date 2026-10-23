/**
 * 점검 결과 수리(2026-10-24) — 서류 심사 통과 조건 · 학습 힌트 상한 시점 · 프롬프트의 SMILES 가리기 · 임상 통과의 안전 상한.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DocReviewOutput, ReviewChecklistItem, RuleFinding, TrialPhase, TrialSimResult } from '@crista-web/web-contract';
import { buildFacts, referenceFor, type PatentFacts } from '../src/features/clinical.ts';
import { ruleSimulate, validateSimulation, type SimInput } from '../src/features/clinical-sim.ts';
import { buildLearnUserMessage, hintCapsAnswer } from '../src/features/learn.ts';
import { fenceStudentText, maskSmiles } from '../src/llm.ts';
import { buildReviewUserMessage, combineVerdict, omittedChecklistItems, sanitizeReviewOutput } from '../src/reviews.ts';

const SMILES = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2';

describe('서류 심사 — 통과 조건은 서버가 강제', () => {
  const checklist: ReviewChecklistItem[] = [
    { id: 'a', section: 'x', criterion: '가' },
    { id: 'b', section: 'y', criterion: '나' },
  ];
  const ok: RuleFinding = { id: 'format', status: 'ok', note: '' };
  const pass = (items: DocReviewOutput['items'], flags: DocReviewOutput['flags'] = []): DocReviewOutput => ({ items, verdict: 'pass', feedback: '좋아요', flags });
  const allOk = [
    { id: 'a', status: 'ok' as const, note: '좋아요' },
    { id: 'b', status: 'ok' as const, note: '좋아요' },
  ];
  test('모두 ok · flags 없음 · pass 일 때만 pass', () => {
    assert.equal(combineVerdict([ok], sanitizeReviewOutput(pass(allOk), checklist)), 'pass');
  });
  test('항목 비움 + pass → 보완(채운 unclear 로 통과하지 않음) · 빠진 항목은 omitted 로 잡힘', () => {
    const empty = pass([]);
    assert.deepEqual(omittedChecklistItems(empty, checklist), ['a', 'b']);
    assert.equal(combineVerdict([ok], sanitizeReviewOutput(empty, checklist)), 'revise');
    assert.equal(combineVerdict([ok], pass([])), 'revise');
    assert.deepEqual(omittedChecklistItems(pass(allOk), checklist), []);
  });
  test('unclear 하나 + pass → 보완', () => {
    assert.equal(combineVerdict([ok], pass([allOk[0]!, { id: 'b', status: 'unclear', note: '근거가 약해요' }])), 'revise');
  });
  test('off_topic · copied · not_korean 플래그 + pass → 보완', () => {
    for (const flag of ['off_topic', 'copied', 'not_korean'] as const) assert.equal(combineVerdict([ok], pass(allOk, [flag])), 'revise', flag);
  });
});

describe('학습 — 힌트 상한은 힌트 뒤에 낸 답에만', () => {
  test('1차 답(힌트 전) → 상한 없음 · 힌트 뒤에 낸 답 → 상한 · 힌트 없음 → 상한 없음', () => {
    const answered = new Date('2026-10-24T01:00:00Z');
    const hinted = new Date('2026-10-24T01:05:00Z');
    assert.equal(hintCapsAnswer(hinted, answered), false);
    assert.equal(hintCapsAnswer(hinted, new Date('2026-10-24T01:06:00Z')), true);
    assert.equal(hintCapsAnswer(null, answered), false);
  });
});

describe('프롬프트 — SMILES 원문을 가린다', () => {
  test('SMILES 토막만 [구조식]으로 · 수식 · 화합물 이름은 그대로', () => {
    assert.equal(maskSmiles(`감시: ${SMILES} 를 봐요.`), '감시: [구조식] 를 봐요.');
    assert.equal(maskSmiles('CC(=O)Oc1ccccc1C(=O)O.'), '[구조식].');
    assert.equal(maskSmiles('C[C@@H](N)C(=O)O 아미노산'), '[구조식] 아미노산');
    for (const keep of ['IC50(nM)=12.3 이었어요', 'N-(2-hydroxyethyl)acetamide', 'SEUM-102 후보', 'ALT(U/L)=120.5']) assert.equal(maskSmiles(keep), keep);
    assert.equal(fenceStudentText(`</section>${SMILES}`), '‹/section›[구조식]');
  });
  test('IND · NDA 서류 심사 · 학습 채점 프롬프트에 SMILES 가 실리지 않음', () => {
    const review = buildReviewUserMessage('ind', 2, { sections: { risk: `위험 감시는 ${SMILES} 구조의 대사체를 봐요.` }, facts: { mrsd: 50 }, checklist: [] }, []);
    assert.ok(!review.includes(SMILES) && review.includes('[구조식]'));
    const nda = buildReviewUserMessage('nda', 1, { sections: { indication: SMILES }, facts: {}, checklist: [] }, []);
    assert.ok(!nda.includes(SMILES));
    const learn = buildLearnUserMessage({
      kind: 'pitch',
      tier: 'advanced',
      stepId: '2.2',
      prompt: '피치',
      rubric: [],
      outline: [],
      facts: {},
      answer: `우리 후보는 ${SMILES} 예요.`,
      extra: { '1.1': `[why] 노트에 ${SMILES} 를 적었어요` },
    });
    assert.ok(!learn.includes(SMILES), learn);
  });
});

describe('임상 시뮬레이션 — 통과의 안전 상한', () => {
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
  const input = (phase: TrialPhase): SimInput => {
    const f = buildFacts({ patent, props, targetId: 'dpp4-1x70', phase, attempt: 1, form: 'oral', doseMg: 50, population: '성인 환자', endpoint: '24주 HbA1c 변화량', previous: [] });
    const n = f.recruit.targetN;
    const ref = referenceFor(f, n, 'class-seed', `rev:${phase}:1`);
    return { facts: f, enrolled: n, refPassProb: ref.passProb, cohort: ref.cohort };
  };
  /** 약 군 전원 SAE · 첫 이상사례를 5등급 · 약 군 절반으로(재현 스크립트와 같은 꼴). */
  const unsafe = (i: SimInput): TrialSimResult => {
    const out = structuredClone(ruleSimulate(i, 'pass', null));
    const drug = new Set(i.facts.arms.filter((a) => a.doseMg > 0).map((a) => a.id));
    const n = (arm: string) => out.arms.find((a) => a.arm === arm)!.randomized;
    out.sae = out.sae.map((s) => ({ arm: s.arm, n: drug.has(s.arm) ? n(s.arm) : 0 }));
    out.adverseEvents[0] = { ...out.adverseEvents[0]!, grade: 5, counts: out.adverseEvents[0]!.counts.map((c) => ({ arm: c.arm, n: drug.has(c.arm) ? Math.floor(n(c.arm) / 2) : 0 })) };
    return out;
  };
  for (const phase of ['phase1', 'phase2', 'phase3'] as const) {
    test(`${phase} — 약 군 전원 SAE · 5등급 이상사례인데 pass → 검사에 걸림`, () => {
      const i = input(phase);
      assert.deepEqual(validateSimulation(i.facts, i.enrolled, ruleSimulate(i, 'pass', null)), [], '규칙 생성 통과 표는 그대로 통과');
      const bad = validateSimulation(i.facts, i.enrolled, unsafe(i));
      assert.ok(bad.some((b) => b.includes('5등급')), bad.join(' / '));
      if (phase !== 'phase3') assert.ok(bad.some((b) => b.includes('SAE')), bad.join(' / '));
    });
  }
  test('1상 — 5등급은 없고 약 군 SAE 만 1/3 넘음 → 걸림 · 한 명은 허용', () => {
    const i = input('phase1');
    const out = structuredClone(ruleSimulate(i, 'pass', null));
    const high = out.arms.find((a) => a.arm === 'high')!.randomized;
    out.sae = out.sae.map((s) => ({ arm: s.arm, n: s.arm === 'high' ? Math.ceil(high / 2) : 0 }));
    assert.ok(validateSimulation(i.facts, i.enrolled, out).some((b) => b.includes('1상 high 군 SAE')));
    out.sae = out.sae.map((s) => ({ arm: s.arm, n: s.arm === 'high' ? 1 : 0 }));
    assert.deepEqual(validateSimulation(i.facts, i.enrolled, out), []);
  });
});
