/**
 * F31 3.1 물질특허 규격 — 코드명 해부도 검사 · 칸 모양 · SMILES 원문 찾기 · 출원번호 · 구조 지문(브라우저 · 서버가 같은 함수를 쓴다).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkCodeName,
  CODE_NAME_PATTERN,
  PATENT_CHECKLIST,
  PATENT_COPY,
  PATENT_FEE_CENTS,
  PATENT_SECTION_KEYS,
  PATENT_SECTIONS,
  patentNumber,
  REVIEW_LIMITS,
  REASON_KEY_PATTERN,
  SECTION_KEY_PATTERN,
  sectionReviewProblem,
  sectionShapeProblem,
  smilesDiff,
  smilesInText,
} from '../src/index.ts';

describe('코드명 해부도 ②', () => {
  test('맞는 코드명 — 이름표 = 우리 티커 · 이음표 · 번호 3자리', () => {
    const c = checkCodeName('SEUM-102', { ticker: 'SEUM' });
    assert.equal(c.ok, true);
    assert.deepEqual([c.tick, c.dash, c.num], ['SEUM', true, '102']);
    assert.ok(CODE_NAME_PATTERN.test('SEU-001'));
  });
  test('틀린 조각을 짚는다', () => {
    const p = (code: string, taken: string[] = []) => checkCodeName(code, { ticker: 'SEUM', taken }).problems;
    assert.deepEqual(p(''), ['empty']);
    assert.deepEqual(p('seum-102'), ['lowercase']);
    assert.deepEqual(p('SE-102'), ['tick_short']);
    assert.deepEqual(p('SEUMA-102'), ['tick_long']);
    assert.deepEqual(p('DAON-102'), ['tick_mismatch']);
    assert.deepEqual(p('SEUM102'), ['no_dash']);
    assert.deepEqual(p('SEUM-1-02'), ['many_dash']);
    assert.deepEqual(p('SEUM-1020'), ['num_len']);
    assert.deepEqual(p('SEUM-1a2'), ['num_digits']);
    assert.deepEqual(p('SEUM-102', ['SEUM-102']), ['taken']);
  });
  test('틀린 조각마다 문구가 있다(COPY 한곳)', () => {
    for (const k of ['empty', 'lowercase', 'tick_chars', 'tick_short', 'tick_long', 'tick_mismatch', 'no_dash', 'many_dash', 'num_len', 'num_digits', 'taken'] as const) {
      assert.ok(PATENT_COPY.codeProblem[k].length > 0);
    }
  });
});

describe('출원서 칸 ③', () => {
  test('칸 키는 DB check 꼴 · 상한은 서류 칸 상한 이하', () => {
    for (const key of PATENT_SECTION_KEYS) {
      assert.ok(SECTION_KEY_PATTERN.test(key), key);
      assert.ok(PATENT_SECTIONS[key].max <= REVIEW_LIMITS.sectionMax);
      assert.ok(PATENT_SECTIONS[key].min <= PATENT_SECTIONS[key].max);
    }
  });
  test('저장 모양 — 빈 칸은 지우기 · 고르는 칸은 정해진 값만', () => {
    assert.equal(sectionShapeProblem('title', ''), null);
    assert.equal(sectionShapeProblem('summary', 'ㄱ'.repeat(101)), 'too_long');
    assert.equal(sectionShapeProblem('mech_how', 'selective,reversible'), null);
    assert.equal(sectionShapeProblem('mech_how', 'selective,magic'), 'bad_choice');
    assert.equal(sectionShapeProblem('mech_action', 'inhibitor'), null);
    assert.equal(sectionShapeProblem('mech_action', 'inhibitor,agonist'), 'bad_choice');
    assert.equal(sectionShapeProblem('inventors', 'not-an-id'), 'bad_people');
  });
  test('심사 전 형식 — 빠짐 · 짧음 · 가역/비가역 함께', () => {
    assert.equal(sectionReviewProblem('title', ''), 'missing');
    assert.equal(sectionReviewProblem('title', '짧은 명칭'), 'too_short');
    assert.equal(sectionReviewProblem('title', 'ACHE 억제 활성을 갖는 벤질피페리딘 계열 화합물'), null);
    assert.equal(sectionReviewProblem('mech_how', 'reversible,irreversible'), 'conflict');
    assert.equal(sectionReviewProblem('inventors', '11111111-1111-1111-1111-111111111111'), null);
  });
});

describe('심사 ④', () => {
  test('체크리스트 — id 는 칩 꼴 · 칸은 출원서 칸 · 겹침 없음', () => {
    const ids = new Set<string>();
    for (const c of PATENT_CHECKLIST) {
      assert.ok(REASON_KEY_PATTERN.test(c.id));
      assert.ok((PATENT_SECTION_KEYS as string[]).includes(c.section), c.section);
      assert.ok(!ids.has(c.id));
      ids.add(c.id);
    }
  });
  test('SMILES 원문 찾기 — 한국어 문장 · 코드명은 아님, SMILES 토큰 · 붙은 조사는 찾음', () => {
    const s = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3cccnc3)CC1)C2';
    assert.equal(smilesInText('구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염'), false);
    assert.equal(smilesInText('SEUM-102 는 ACHE 를 선택적 · 가역적으로 억제한다(ΔG −11.2 kcal/mol).'), false);
    assert.equal(smilesInText(`청구 대상은 ${s}이다.`), true);
    assert.equal(smilesInText('이 분자는 CCN(CC)C(=O)c1ccccc1 와 같다'), true);
    assert.equal(smilesInText('평범한 글', [s]), false);
    assert.equal(smilesInText(`앞 ${s.slice(0, 20)} 뒤`, [s.slice(0, 20)]), true);
  });
  test('출원료 250,000 크리스타 = 5,000,000 센트($0.050M)', () => {
    assert.equal(PATENT_FEE_CENTS, 5_000_000);
  });
});

describe('원장 5.04 · 구조 지문 5.06', () => {
  test('출원번호 — KR-학급 2자리-순서 4자리 · 같은 학급은 같은 앞자리', () => {
    const id = '7f3a9c10-0000-4000-8000-000000000001';
    assert.match(patentNumber(id, 1), /^KR-\d{2}-0001$/);
    assert.equal(patentNumber(id, 12).slice(0, 6), patentNumber(id, 1).slice(0, 6));
    assert.ok(patentNumber(id, 9999).length <= 32);
  });
  test('구조 지문 — 기준 약과 다른 가운데 구간', () => {
    const ref = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3ccccc3)CC1)C2';
    const ours = 'COc1cc2c(cc1OC)C(=O)C(CC1CCN(Cc3cccnc3)CC1)C2';
    const d = smilesDiff(ref, ours);
    assert.ok(d.end > d.start);
    assert.equal(ours.slice(d.start, d.end), 'n');
    assert.deepEqual(smilesDiff(ref, ref), { start: ref.length, end: ref.length });
  });
});
