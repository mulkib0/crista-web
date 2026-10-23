/**
 * 4.2 최종 허가 규격(F42) — 브랜드 이름 규칙 · 포장 = 허가 제형 · 칸 · 체크리스트 · 수수료.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  APPROVAL_COPY,
  APPROVAL_FEE_CENTS,
  APPROVAL_FEE_CRISTA,
  APPROVAL_REVIEW_GAME_DAYS,
  BLOCKED_WORDS,
  brandKey,
  checkBrandName,
  checkBrandNameStrict,
  checkPackage,
  DOC_KIND_LABEL,
  DOC_KINDS,
  DOC_REVIEWER_LABEL,
  FAMOUS_DRUG_NAMES,
  josa,
  NDA_CHECKLIST,
  NDA_SECTIONS,
  PACK_COLORS,
  PACK_LAYOUTS,
  PACK_SHAPE_FORM,
  PACK_SHAPES,
  packFits,
  RECEIPT_GROUP_OF,
  SECTION_KEY_PATTERN,
  STEP_IDS,
} from '../src/index.ts';

describe('브랜드 이름', () => {
  test('보통 이름은 통과 · 빈칸 하나는 허용 · 앞뒤 빈칸은 다듬는다', () => {
    assert.deepEqual(checkBrandName('다온콕스'), { status: 'ok', value: '다온콕스' });
    assert.deepEqual(checkBrandName('  Neuro Lin  '), { status: 'ok', value: 'Neuro Lin' });
    assert.equal(checkBrandName('세움 101').status, 'ok');
  });
  test('길이 2~12 · 글자 · 숫자만은 막는다', () => {
    assert.equal(checkBrandName('가').status, 'block');
    assert.equal(checkBrandName('가나다라마바사아자차카타파').status, 'block');
    assert.equal(checkBrandName('가나다라마바사아자차카타').status, 'ok');
    assert.equal(checkBrandName('SEUM-102').status, 'block');
    assert.equal(checkBrandName('약!').status, 'block');
    assert.equal(checkBrandName('a  b c').status, 'block');
    assert.equal(checkBrandName('2026').status, 'block');
    assert.equal(checkBrandName(42).status, 'block');
    assert.equal(checkBrandName('').status, 'block');
  });
  test('욕설 목록(rules.ts BLOCKED_WORDS)은 막는다 — 대소문자 · 빈칸 무시', () => {
    for (const w of BLOCKED_WORDS.filter((x) => /^[가-힣A-Za-z]+$/.test(x) && x.length >= 2)) {
      assert.equal(checkBrandName(`좋은${w}약`).status, 'block', w);
    }
    assert.equal(checkBrandName('Super SHIT').status, 'block');
  });
  test('실재 유명 약 이름 — 같으면 막고(상표권), 품고 있으면 주의', () => {
    assert.equal(checkBrandName('타이레놀').status, 'block');
    assert.equal(checkBrandName('Tylenol').status, 'block');
    assert.equal(checkBrandName('wegovy').status, 'block');
    const warn = checkBrandName('뉴타이레놀');
    assert.equal(warn.status, 'warn');
    assert.match((warn as { message: string }).message, /타이레놀/);
    assert.deepEqual(checkBrandNameStrict('뉴타이레놀'), { ok: true, value: '뉴타이레놀' });
    assert.equal(checkBrandNameStrict('비아그라').ok, false);
    // 목록은 열쇠 꼴(소문자 · 빈칸 없음)이어야 비교가 맞는다.
    for (const f of FAMOUS_DRUG_NAMES) assert.equal(brandKey(f), f, f);
  });
  test('회사 이름과 같으면 주의만', () => {
    assert.equal(checkBrandName('세움제약', { startupName: '세움 제약' }).status, 'warn');
  });
  test('학급 유일 열쇠 — 빈칸 없이 소문자 · NFC', () => {
    assert.equal(brandKey('Neuro Lin'), 'neurolin');
    assert.equal(brandKey('다온콕스'.normalize('NFD')), '다온콕스');
  });
});

describe('포장 = 허가 제형(8.06)', () => {
  test('정제 · 캡슐 = 경구, 바이알 = 정맥, 패치 = 경피', () => {
    assert.equal(packFits('tablet', 'oral'), true);
    assert.equal(packFits('capsule', 'oral'), true);
    assert.equal(packFits('vial', 'iv'), true);
    assert.equal(packFits('patch', 'transdermal'), true);
    assert.equal(packFits('tablet', 'iv'), false);
    assert.equal(packFits('patch', 'oral'), false);
    assert.equal(packFits('vial', null), false);
    // 모든 모양이 정확히 한 제형에 맞는다.
    for (const s of PACK_SHAPES) assert.equal((['oral', 'iv', 'transdermal'] as const).filter((f) => packFits(s, f)).length, 1, s);
    assert.deepEqual(Object.keys(PACK_SHAPE_FORM).sort(), [...PACK_SHAPES].sort());
  });
  test('checkPackage — 목록 밖 값은 거절', () => {
    assert.deepEqual(checkPackage({ shape: 'vial', color: 'sky', layout: 'band' }), { ok: true, value: { shape: 'vial', color: 'sky', layout: 'band' } });
    assert.equal(checkPackage({ shape: 'syrup', color: 'sky', layout: 'band' }).ok, false);
    assert.equal(checkPackage({ shape: 'vial', color: 'red', layout: 'band' }).ok, false);
    assert.equal(checkPackage({ shape: 'vial', color: 'sky', layout: 'side' }).ok, false);
    assert.equal(checkPackage(null).ok, false);
    assert.equal(PACK_COLORS.length, 6);
    assert.equal(PACK_LAYOUTS.length, 3);
    for (const c of PACK_COLORS) assert.ok(APPROVAL_COPY.pack.color[c]);
  });
});

describe('신청서 · 심사', () => {
  test('칸 키는 DB 꼴 · 문구가 다 있다', () => {
    for (const s of NDA_SECTIONS) {
      assert.match(s, SECTION_KEY_PATTERN);
      assert.ok(APPROVAL_COPY.nda.sectionLabel[s]);
      assert.ok(APPROVAL_COPY.nda.sectionGuide[s]);
    }
  });
  test('체크리스트 id 는 겹치지 않고 칸은 신청서 칸 또는 brand', () => {
    const ids = NDA_CHECKLIST.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const c of NDA_CHECKLIST) assert.ok([...NDA_SECTIONS, 'brand'].includes(c.section as never), c.id);
  });
  test("서류 심사 종류에 'nda' 가 있다", () => {
    assert.ok(DOC_KINDS.includes('nda'));
    assert.ok(DOC_KIND_LABEL.nda);
    assert.ok(DOC_REVIEWER_LABEL.nda);
  });
});

describe('비용 · 기간 · 영수증 묶음', () => {
  test('최종 허가 $0.100M = 500,000 크리스타 = 10,000,000 센트 · 60게임 일', () => {
    assert.equal(APPROVAL_FEE_CRISTA, 500_000);
    assert.equal(APPROVAL_FEE_CENTS, 10_000_000);
    assert.equal(APPROVAL_REVIEW_GAME_DAYS, 60);
  });
  test('9단계 모두 영수증 묶음이 있다', () => {
    for (const id of STEP_IDS) assert.ok(RECEIPT_GROUP_OF[id], id);
  });
  test('전광판 헤드라인은 140자 안', () => {
    assert.ok(Array.from(APPROVAL_COPY.board.headline('ABCD', '가나다라마바사아자차카타')).length <= 140);
  });
});

describe('문구 한곳(§5.12)', () => {
  test('제형 이름 · 화면 낱말 · 서버 막음 글 · 요약 줄 이름이 APPROVAL_COPY 에 있다', () => {
    for (const f of ['oral', 'iv', 'transdermal'] as const) {
      assert.ok(APPROVAL_COPY.formLabel[f] && APPROVAL_COPY.formShort[f], f);
      assert.ok(PACK_SHAPES.some((s) => PACK_SHAPE_FORM[s] === f), `${f} 에 맞는 포장이 있다`);
    }
    for (const k of ['company', 'indication', 'target', 'code', 'affinity', 'patent', 'alt', 'preclinical', 'ind', 'protocol', 'trials', 'final', 'market']) {
      assert.ok(APPROVAL_COPY.evidence.label[k], k);
    }
    for (const v of ['pass', 'pending', 'reject', 'revise']) assert.ok(APPROVAL_COPY.ui.verdict[v], v);
    assert.match(APPROVAL_COPY.ui.brandChanged('다온', '하나'), /다온/);
    assert.match(APPROVAL_COPY.evidence.trialName(2, 2, 50, true), /2상 · 2번째 · 50 mg 보류/);
    assert.ok(Object.values(APPROVAL_COPY.server).every((m) => typeof m === 'string' && m.length > 0));
  });
  test('화폐 — 영수증 제목에 영문 단위 CRISTA 를 붙이지 않고(사용자 결정), 문구에 $ · 달러 · 원 단위가 없다', () => {
    assert.equal(APPROVAL_COPY.result.receiptHead, '연구비 영수증');
    const all = JSON.stringify(APPROVAL_COPY);
    assert.doesNotMatch(all, /CRISTA|\$|달러|[0-9] ?원/);
    assert.equal(APPROVAL_COPY.submit.confirmBody('500,000 크리스타', 60).match(/크리스타/g)?.length, 1);
  });
  test('받침 조사', () => {
    assert.equal(josa('다온콕스', '이가'), '가');
    assert.equal(josa('세움정', '이가'), '이');
    assert.equal(josa('세움정', '으로'), '으로');
    assert.equal(josa('다온', '으로'), '으로');
    assert.equal(josa('케어', '으로'), '로');
    assert.equal(josa('나을', '으로'), '로');
    assert.equal(josa('Nova', '이가'), '이(가)');
    assert.match(APPROVAL_COPY.result.completeLead('다온콕스'), /「다온콕스」가 환자에게/);
  });
});
