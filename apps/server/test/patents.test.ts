/**
 * F31 3.1 물질특허 — 순수 규칙(심사 1~4) · LLM 입력(SMILES · 실명 없음) · 출원료 값.
 * DB · 동시성(⑩ 두 모둠 동시 받아들임)은 `npm run e2e:patents`(떠 있는 서버 + 로컬 DB).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PIPELINE_RULES } from '@crista/game-rules';
import { PATENT_CHECKLIST, PATENT_FEE_CENTS, type PatentFactsView } from '@crista-web/web-contract';
import { buildReviewSystemPrompt, buildReviewUserMessage, ruleVerdict } from '../src/reviews.ts';
import { isKnownSubstance, llmFacts, llmSections, patentRuleFindings, rejectReasonOf, type PatentRuleInput } from '../src/features/patents.ts';

const SMILES = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3cccnc3)CC1)C2';
const ME = '11111111-1111-4111-8111-111111111111';

const goodSections = (): Record<string, string> => ({
  code_tick: 'SEUM = 세움제약',
  code_num: '102 = 1번 프로그램의 두 번째 후보',
  mech_how: 'selective,reversible',
  mech_action: 'inhibitor',
  mech_why: 'ACHE 포켓의 TRP286 에 붙었다 떨어지는 결합이라서',
  title: 'ACHE 억제 활성을 갖는 벤질피페리딘 계열 화합물',
  field: '알츠하이머병 치료를 위한 ACHE 억제제',
  background: '기준 약 도네페질은 간 대사가 빨라 하루 한 번 복용에서 혈중 농도가 흔들리는 한계가 있다.',
  claim1: '구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염.',
  claim2: '청구항 1 의 화합물을 유효성분으로 포함하는 알츠하이머병 예방 또는 치료용 약학 조성물.',
  effect: '도킹 ΔG 가 −11.2 kcal/mol 로 기준 약(−11.84)과 비슷하게 단단히 붙고, BBB 투과율 76% 로 뇌에 닿는다.',
  summary: 'ACHE 를 가역적으로 억제하는 새 벤질피페리딘 화합물과 그 용도.',
  inventors: ME,
});

const input = (over: Partial<PatentRuleInput> = {}): PatentRuleInput => ({
  sections: goodSections(),
  codeName: 'SEUM-102',
  ticker: 'SEUM',
  takenCodes: ['SEUM-101'],
  memberIds: [ME],
  smiles: [SMILES],
  usedOthers: 1,
  max: 3,
  balanceCents: 10_000_000,
  feeCents: PATENT_FEE_CENTS,
  known: false,
  duplicateCode: null,
  ...over,
});

const fails = (findings: ReturnType<typeof patentRuleFindings>) => findings.filter((f) => f.status === 'fail').map((f) => f.id);

describe('심사 규칙 1~4(§5.8)', () => {
  test('모두 맞으면 fail 없음 · LLM 으로 간다 · 선행 특허는 건너뜀으로 남는다', () => {
    const f = patentRuleFindings(input());
    assert.deepEqual(fails(f), []);
    assert.equal(ruleVerdict(f), null);
    assert.ok(f.some((x) => x.id === 'prior_art' && x.status === 'ok'));
  });
  test('형식 — 빈 칸 · 짧은 칸 · 가역+비가역 · 모둠원이 아닌 발명자 → 보완', () => {
    const s = goodSections();
    s.title = '';
    s.summary = '짧다';
    s.mech_how = 'reversible,irreversible';
    s.inventors = '22222222-2222-4222-8222-222222222222';
    const f = patentRuleFindings(input({ sections: s }));
    assert.deepEqual(fails(f).sort(), ['format_inventors', 'format_mech_how', 'format_summary', 'format_title']);
    assert.equal(ruleVerdict(f), 'revise');
    assert.equal(f.find((x) => x.id === 'format_title')?.section, 'title');
  });
  test('코드명 — 없음 · 남의 티커 · 이미 쓴 번호 → 보완', () => {
    for (const codeName of [null, 'DAON-102', 'SEUM-101']) {
      const f = patentRuleFindings(input({ codeName }));
      assert.deepEqual(fails(f), ['code_name'], String(codeName));
      assert.equal(ruleVerdict(f), 'revise');
    }
  });
  test('SMILES 원문이 칸에 있으면 보완(프롬프트에 SMILES 를 넣지 않게)', () => {
    const s = goodSections();
    s.claim1 = `${SMILES} 로 표시되는 화합물`;
    const f = patentRuleFindings(input({ sections: s }));
    assert.deepEqual(fails(f), ['smiles_text']);
    assert.equal(f.find((x) => x.id === 'smiles_text')?.section, 'claim1');
  });
  test('상한(받아들여짐 + 심사 중) · 잔액 → 보완', () => {
    assert.deepEqual(fails(patentRuleFindings(input({ usedOthers: 3 }))), ['limit']);
    assert.deepEqual(fails(patentRuleFindings(input({ balanceCents: PATENT_FEE_CENTS - 1 }))), ['balance']);
    assert.deepEqual(fails(patentRuleFindings(input({ usedOthers: 2 }))), []);
  });
  test('신규성 · 학급 중복 → 거절(형식이 함께 틀려도 거절이 이긴다)', () => {
    const known = patentRuleFindings(input({ known: true }));
    assert.deepEqual(fails(known), ['novelty']);
    assert.equal(ruleVerdict(known), 'reject');
    const dup = patentRuleFindings(input({ duplicateCode: 'DAON-217', codeName: null }));
    assert.deepEqual(fails(dup).sort(), ['class_duplicate', 'code_name']);
    assert.equal(ruleVerdict(dup), 'reject');
    assert.match(dup.find((x) => x.id === 'class_duplicate')!.note, /DAON-217/);
  });
  test('거절 이유 — 학급 중복이 먼저 · 다음 신규성 · 규칙 fail 없는 거절(교사 수동)은 null', () => {
    assert.equal(rejectReasonOf(patentRuleFindings(input({ known: true, duplicateCode: 'DAON-217' }))), 'duplicate');
    assert.equal(rejectReasonOf(patentRuleFindings(input({ known: true }))), 'known');
    assert.equal(rejectReasonOf(patentRuleFindings(input())), null);
    assert.equal(rejectReasonOf([]), null);
  });
  test('규칙 문구는 80자 안(학생 화면 · RuleFinding.note)', () => {
    const s = goodSections();
    for (const k of Object.keys(s)) s[k] = '';
    const all = patentRuleFindings(input({ sections: s, codeName: 'x', usedOthers: 9, balanceCents: 0, known: true, duplicateCode: 'ABCD-123' }));
    for (const f of all) assert.ok(Array.from(f.note).length <= 80, `${f.id}: ${f.note}`);
  });
});

describe('LLM 입력 — 코드명 · 서버 계산 사실 · 칸 글만(§5.11 ⑤)', () => {
  const facts: PatentFactsView = {
    ticker: 'SEUM', companyName: '세움제약', targetId: 'ache-4ey7', gene: 'ACHE', targetLabel: '아세틸콜린에스테라아제', disease: '알츠하이머병',
    referenceName: '도네페질', referenceKcal: -11.84, dockingKcal: -9.1, parentKcal: -8.7, residues: ['TRP286', 'TYR124'],
    admet: [{ label: 'BBB 투과율', value: '76.0', unit: '%' }], canonicalSmiles: SMILES, flatSmiles: SMILES, mw: 380.49, tpsa: 51.7, clogp: 3.9, qed: 0.71,
    admetJobId: '33333333-3333-4333-8333-333333333333', dockingJobId: '44444444-4444-4444-8444-444444444444', known: false, label: '학생A-변형',
  };
  test('사실에 SMILES · 작업 id · 학생 이름표가 없고, ΔG 비교가 있다', () => {
    const f = llmFacts('SEUM-102', facts);
    const text = JSON.stringify(f);
    assert.ok(!text.includes(SMILES));
    assert.ok(!text.includes(facts.admetJobId) && !text.includes(facts.dockingJobId!));
    assert.ok(!text.includes('학생A'));
    assert.equal(f.dg_vs_reference, 'weaker_than_reference');
    assert.equal(f.code_name, 'SEUM-102');
    assert.equal(f.admet_1, 'BBB 투과율 76.0%');
  });
  test('칸 — 발명자(모둠원 id)는 빼고 고르는 칸은 한국어 낱말', () => {
    const s = llmSections(goodSections());
    assert.equal(s.inventors, undefined);
    assert.equal(s.mech_how, '선택적, 가역');
    assert.equal(s.mech_action, '억제제');
    const user = buildReviewUserMessage('patent', 3, { sections: s, checklist: [...PATENT_CHECKLIST], facts: llmFacts('SEUM-102', facts) }, []);
    assert.ok(!user.includes(SMILES) && !user.includes(ME));
    const system = buildReviewSystemPrompt('patent', PATENT_CHECKLIST);
    for (const c of PATENT_CHECKLIST) assert.ok(system.includes(`[${c.id}]`));
  });
});

describe('이미 알려진 물질 · 출원료', () => {
  test('평면 · 정규 SMILES 중 하나라도 알려진 집합에 있으면 알려진 물질', () => {
    const known = new Set(['CCO', 'c1ccccc1']);
    assert.equal(isKnownSubstance(known, ['CC', 'CCO']), true);
    assert.equal(isKnownSubstance(known, [null, 'CCN']), false);
  });
  test('출원료 = crista PIPELINE_RULES.cost.patentCents($0.050M · 250,000 크리스타)', () => {
    assert.equal(PATENT_FEE_CENTS, PIPELINE_RULES.cost.patentCents);
  });
});
