import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkClassCode,
  checkClassInput,
  checkDisplayName,
  checkLoginId,
  checkPassword,
  checkRegistration,
  checkRegistrationPatch,
  checkSlogan,
  checkStartupName,
  checkTicker,
  loginIdToEmail,
  romanizeHangul,
  startupNameKey,
  suggestTicker,
  teamCapacityOf,
} from '../src/index.ts';

const value = <T>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.equal(r.ok, true, r.ok ? '' : r.message);
  return (r as { value: T }).value;
};

describe('계정', () => {
  test('아이디 — 소문자 · 숫자 3~20자, 대문자는 소문자로', () => {
    assert.equal(value(checkLoginId(' Kim01 ')), 'kim01');
    for (const bad of ['ab', 'a'.repeat(21), 'kim_01', '김철수', '', null]) assert.equal(checkLoginId(bad).ok, false, String(bad));
  });
  test('비밀번호 — 8자 이상 · 72바이트 이하', () => {
    assert.equal(checkPassword('1234567').ok, false);
    assert.equal(checkPassword('12345678').ok, true);
    assert.equal(checkPassword('가'.repeat(25)).ok, false); // 75바이트
    assert.equal(checkPassword(12345678).ok, false);
  });
  test('표시 이름 — 1~20자, 공백은 한 칸으로', () => {
    assert.equal(value(checkDisplayName('  김   철수 ')), '김 철수');
    assert.equal(checkDisplayName('').ok, false);
    assert.equal(checkDisplayName('가'.repeat(21)).ok, false);
  });
  test('합성 이메일은 web.crista.test(게임 도메인 아님)', () => {
    assert.equal(loginIdToEmail('kim01'), 'kim01@web.crista.test');
  });
});

describe('학급', () => {
  test('학급 코드 — 6자 · 헷갈리는 글자 없음 · 공백 · 하이픈 허용', () => {
    assert.equal(value(checkClassCode(' abc-def ')), 'ABCDEF');
    for (const bad of ['ABCDE', 'ABCDEFG', 'ABCDE0', 'ABCDEO', 'ABCDE1', 'ABCDEI', 'ABCDEL']) assert.equal(checkClassCode(bad).ok, false, bad);
  });
  test('모둠 수 2~8 · 배정 기본 walk-in · 정원 기본 40', () => {
    assert.deepEqual(value(checkClassInput({ name: ' 3학년 2반 ', teamCount: 4 })), {
      name: '3학년 2반',
      teamCount: 4,
      assignment: 'walk-in',
      maxStudents: 40,
      teamCapacity: null,
    });
    assert.equal(checkClassInput({ name: 'a', teamCount: 1 }).ok, false);
    assert.equal(checkClassInput({ name: 'a', teamCount: 9 }).ok, false);
    assert.equal(checkClassInput({ name: 'a', teamCount: 2.5 }).ok, false);
    assert.equal(checkClassInput({ name: 'a', teamCount: 2, assignment: 'random' }).ok, false);
    assert.equal(checkClassInput({ name: 'a', teamCount: 2, teamCapacity: 0 }).ok, false);
    assert.equal(value(checkClassInput({ name: 'a', teamCount: 2, assignment: 'assigned', teamCapacity: 3 })).teamCapacity, 3);
  });
  test('모둠 정원 — 정했으면 그 값, 아니면 ⌈정원 ÷ N⌉', () => {
    assert.equal(teamCapacityOf({ maxStudents: 30, teamCount: 4, teamCapacity: null }), 8);
    assert.equal(teamCapacityOf({ maxStudents: 4, teamCount: 2, teamCapacity: null }), 2);
    assert.equal(teamCapacityOf({ maxStudents: 30, teamCount: 4, teamCapacity: 5 }), 5);
  });
});

describe('등기', () => {
  test('이름 — 2~14자 · 한글 · 영문 · 숫자 · 공백 한 칸', () => {
    assert.equal(value(checkStartupName(' 세움제약 ')), '세움제약');
    assert.equal(value(checkStartupName('Daon Bio')), 'Daon Bio');
    for (const bad of ['세', '가'.repeat(15), '세움  제약', '세 움 제약', '세움-제약', ' ', '세움제약!']) assert.equal(checkStartupName(bad).ok, false, bad);
  });
  test('욕설은 공백을 빼고 찾는다', () => {
    assert.equal(checkStartupName('시 발제약').ok, false);
    assert.equal(checkStartupName('Fuck Pharma').ok, false);
  });
  test('이름 열쇠 — 공백 · 대소문자 무시', () => {
    assert.equal(startupNameKey('Daon Bio'), startupNameKey('daonbio'));
  });
  test('티커 — 영문 대문자 3~4자(소문자는 올림)', () => {
    assert.equal(value(checkTicker('seum')), 'SEUM');
    for (const bad of ['SE', 'SEUMX', 'SE1M', '세움']) assert.equal(checkTicker(bad).ok, false, bad);
  });
  test('슬로건 — 선택 · 40자', () => {
    assert.equal(value(checkSlogan(undefined)), null);
    assert.equal(value(checkSlogan('  ')), null);
    assert.equal(checkSlogan('가'.repeat(41)).ok, false);
  });
  test('등기 · 고치기 묶음', () => {
    assert.deepEqual(value(checkRegistration({ name: '세움제약', ticker: 'seum' })), { name: '세움제약', ticker: 'SEUM', slogan: null });
    assert.equal(checkRegistration({ name: '세움제약' }).ok, false);
    assert.deepEqual(value(checkRegistrationPatch({ slogan: null })), { slogan: null });
    assert.equal(checkRegistrationPatch({}).ok, false);
  });
});

describe('티커 제안', () => {
  test('로마자 표기 — 글자 대응', () => {
    assert.equal(romanizeHangul('세움'), 'seum');
    assert.equal(romanizeHangul('다온'), 'daon');
    assert.equal(romanizeHangul('한국'), 'hanguk');
  });
  test('업종 낱말을 빼고 앞 4자(설계 예: 세움제약 → SEUM)', () => {
    assert.equal(suggestTicker('세움제약'), 'SEUM');
    assert.equal(suggestTicker('다온바이오'), 'DAON');
    assert.equal(suggestTicker('미르 파마'), 'MIRE');
    assert.equal(suggestTicker('Nova Therapeutics'), 'NOVA');
    assert.equal(suggestTicker('오제약'), 'OJEY'); // 앞이 3자 못 되면 전체 이름에서
    assert.equal(suggestTicker('12'), null);
  });
});
