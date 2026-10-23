/**
 * 서버 전용 해시 — 서열 해시 · 캐시 키(설계 §5.4).
 *
 * 규격 꾸러미(`packages/web-contract`)에는 해시를 두지 않아요 — 화면(Vite)도 그 꾸러미를 import 하므로 `node:crypto` 가 들어가면 화면 빌드가 깨져요.
 * 그래서 해시는 이 파일에만 있고, 화면은 서버가 준 `DesignView.seqHash` 를 그대로 써요.
 */
import { createHash } from 'node:crypto';
import { normalizeSeq } from '@crista-web/web-contract';

/**
 * 설계 서열의 해시 — 같은 서열이면 같은 값(재제출 무과금 판정 · 캐시 키에 써요).
 *
 * `normalizeSeq('')` 는 `SeqFormatError` 를 던져요(빈 서열은 잘못된 입력). 그래서 경쇄가 없을 때는 정규화를 거치지 않고
 * 빈 문자열을 그대로 이어요 — `VH|` 와 `VH|VL` 이 섞이지 않게 구분자는 늘 넣어요.
 */
export function seqHash(vh: string, vl?: string | null): string {
  const h = normalizeSeq(vh);
  const l = vl === undefined || vl === null || vl === '' ? '' : normalizeSeq(vl);
  return createHash('sha256').update(`${h}|${l}`).digest('hex');
}

/** 캐시 키 — `sha256(엔드포인트 + 정규화 입력)`(§3.4 ① 캐시). */
export function cacheKey(endpoint: string, input: unknown): string {
  return createHash('sha256').update(`${endpoint}\n${canonicalJson(input)}`).digest('hex');
}

/**
 * 키 순서에 흔들리지 않는 JSON — 같은 뜻의 입력이 같은 캐시 키를 받게 해요.
 * 날짜 · 함수 · `undefined` 는 넣지 마세요(캐시 키가 호출마다 달라져요).
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}
