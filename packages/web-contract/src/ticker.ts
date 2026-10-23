/**
 * 티커 자동 제안 — 이름에서 영문 대문자 3~4자를 만든다(설계 §4.3, 예: 세움제약 → SEUM).
 * 한글은 국어의 로마자 표기법 글자 대응만 쓴다(받침 뒤 소리 바뀜은 따지지 않는다 — 제안일 뿐 학생이 고친다).
 */
import { TICKER_PATTERN } from './rules.ts';

const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

/** 한글 음절을 로마자로, 나머지 글자는 그대로. */
export function romanizeHangul(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)! - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    out += INITIALS[Math.floor(code / 588)]! + VOWELS[Math.floor((code % 588) / 28)]! + FINALS[code % 28]!;
  }
  return out;
}

/** 이름 끝의 업종 낱말 — 티커에서 뺀다(세움제약 → 세움). */
const SUFFIXES = ['주식회사', '테라퓨틱스', '파마슈티컬', '바이오텍', '바이오', '제약', '파마', '랩스', '연구소', '(주)'];
const EN_SUFFIXES = ['pharmaceuticals', 'pharmaceutical', 'therapeutics', 'biotech', 'pharma', 'labs', 'bio', 'inc'];

function stripSuffix(name: string): string {
  let rest = name.trim();
  for (const suffix of SUFFIXES) if (rest.length > suffix.length && rest.endsWith(suffix)) rest = rest.slice(0, -suffix.length).trim();
  const words = rest.split(' ');
  if (words.length > 1 && EN_SUFFIXES.includes(words.at(-1)!.toLowerCase())) words.pop();
  return words.join(' ');
}

const lettersOf = (text: string): string => romanizeHangul(text).toUpperCase().replace(/[^A-Z]/g, '');

/** 제안 티커. 3자를 못 채우면 null(학생이 직접 쓴다). */
export function suggestTicker(name: string): string | null {
  const core = lettersOf(stripSuffix(name));
  const candidate = (core.length >= 3 ? core : lettersOf(name)).slice(0, 4);
  return TICKER_PATTERN.test(candidate) ? candidate : null;
}
