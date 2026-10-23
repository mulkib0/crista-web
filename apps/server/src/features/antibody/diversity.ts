/**
 * 레퍼토리 다양성 — **모형으로 추정한 값**이에요(§3.2 · §10 S18).
 *
 * 이름이 '보존도'가 아닌 이유(화면에 함께 보여요)
 * - `비슷한 항체 7,000여 개를 모아 이 자리에서 아미노산이 얼마나 갈리는지 센 값이에요. 항체는 원래 이 부분을
 *    다양하게 만들도록 진화했으므로, 이 값은 '진화적으로 중요한 자리'가 아니라 **같은 계열 항체들 사이의 다양성**을 뜻해요.`
 * - 화면 어디에도 '보존도'라고 쓰지 않아요(§3.2 · §10 S18).
 *
 * **방향 규칙(이 파일이 한 곳에서 정해요)**
 * - `percentiles[i]` 는 **다양성 백분위** 0~1 이에요. 0 에 가까울수록 그 자리가 **덜 갈려요**(= 손대면 위험한 자리),
 *   1 에 가까울수록 **많이 갈려요**(= 바꿔도 되는 자리).
 * - `grades[i]` 는 1~9 이고 **9 가 가장 많이 갈리는 자리**예요(설계 §3.2 의 '프레임워크 0.51 → 높은 등급' 과 같은 방향).
 * - **잠그는 자리 · 위험한 자리**는 `percentiles[i] < DIVERSITY_LOCK_PERCENTILE`(0.25), 즉 **다양성이 가장 낮은 25%** 예요.
 *   설계 §4.1(e) · §4.2 의 '다양성 상위 25%'는 '지켜야 하는 정도가 상위'라는 뜻으로 읽었어요
 *   — 세 군데(§3.3 잠금 · §4.1e 유효 변이 · §4.2 계면 유지항)가 모두 '그 집합을 건드리면 위험하다'로 쓰고 있기 때문이에요.
 *   방향을 쓰는 곳은 이 파일의 `isLocked` · `lockedPositions` 뿐이에요.
 *
 * **절대 엔트로피를 선형으로 쪼개지 않아요**(§10 S8) — 그러면 프레임워크 0.51 → 등급 5, CDR-H3 0.29 → 등급 3 이 되어
 * '등급 ≥7' 집합이 비어 버려요. 그래서 **그 서열 집합 안의 백분위**로 9분위를 나눠요.
 */
import { DIVERSITY_LOCK_PERCENTILE } from '@crista-web/web-contract';
import { AA20 } from './constants.ts';

export interface DiversityResult {
  /** 열(=질의 서열 자리) 수 — 질의 길이와 같아요. */
  length: number;
  /** 열별 섀넌 엔트로피(bit) — 원값이에요. 화면에는 백분위 · 등급만 쓰고 이 값은 상세에만 적어요. */
  entropies: number[];
  /** 다양성 백분위 0~1 — 1 이 가장 많이 갈리는 자리예요. */
  percentiles: number[];
  /** 1~9 — 9 가 가장 많이 갈리는 자리예요. */
  grades: number[];
  /** 모은 서열 수(질의 포함) — 화면에 그대로 적어요. */
  msaDepth: number;
  /** 잠그는 자리(1부터 세는 질의 서열 자리) — 다양성이 가장 낮은 25% 예요. */
  lockedPositions: number[];
}

/** a3m 한 묶음 — 이름과 정렬된 서열이에요. */
interface A3mRecord {
  name: string;
  aligned: string;
}

/**
 * a3m 을 읽어 **질의 열에 맞춘** 서열 목록을 만들어요.
 * a3m 은 질의에 없는 삽입을 **소문자**로 적으므로 소문자를 지우면 모든 줄이 질의 길이와 같아져요.
 */
export const parseA3m = (a3m: string): A3mRecord[] => {
  const out: A3mRecord[] = [];
  let name = '';
  let buffer: string[] = [];
  const flush = (): void => {
    if (name === '') return;
    const aligned = buffer.join('').replace(/[a-z]/g, '');
    if (aligned.length > 0) out.push({ name, aligned });
  };
  for (const line of a3m.split('\n')) {
    const text = line.trim();
    if (text.length === 0) continue;
    if (text.startsWith('>')) {
      flush();
      name = text.slice(1);
      buffer = [];
      continue;
    }
    buffer.push(text);
  }
  flush();
  return out;
};

/** 열 하나의 섀넌 엔트로피(bit) — 간격(`-` · `.`)은 분포에서 빼요. 셀 서열이 2개 미만이면 0 이에요. */
export const columnEntropy = (column: readonly string[]): number => {
  const counts = new Map<string, number>();
  let total = 0;
  for (const aa of column) {
    if (!AA20.includes(aa)) continue;
    counts.set(aa, (counts.get(aa) ?? 0) + 1);
    total += 1;
  }
  if (total < 2) return 0;
  let h = 0;
  for (const n of counts.values()) {
    const p = n / total;
    h -= p * Math.log2(p);
  }
  return h;
};

/**
 * 값들의 백분위(0~1) — 같은 값은 같은 백분위를 받아요(`(작은 것 수 + 0.5·같은 것 수) / 전체`).
 * 순서가 흔들리지 않아서 같은 입력이면 늘 같은 값이에요.
 */
export const ranksToPercentiles = (values: readonly number[]): number[] => {
  const n = values.length;
  if (n === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const lessThan = (v: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((sorted[mid] as number) < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const atMost = (v: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((sorted[mid] as number) <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return values.map((v) => {
    const less = lessThan(v);
    const equal = atMost(v) - less;
    return Number(((less + 0.5 * equal) / n).toFixed(6));
  });
};

/** 백분위 → 1~9 등급. 9 가 가장 많이 갈리는 자리예요. */
export const percentileToGrade = (percentile: number): number =>
  Math.min(9, Math.max(1, 1 + Math.floor(percentile * 9)));

/** 그 자리를 잠그는지 — 방향을 쓰는 **유일한** 함수예요(파일 머리말의 방향 규칙). */
export const isLocked = (percentile: number): boolean => percentile < DIVERSITY_LOCK_PERCENTILE;

/** 잠그는 자리 목록(1부터 세는 질의 서열 자리). */
export const lockedPositions = (percentiles: readonly number[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < percentiles.length; i += 1) if (isLocked(percentiles[i] as number)) out.push(i + 1);
  return out;
};

/**
 * ColabFold `uniref.a3m` → 자리별 다양성.
 * 질의가 없거나 모은 서열이 2개 미만이면 `null` — 한 서열로 다양성을 말할 수 없어요.
 */
export const diversityFromA3m = (a3m: string): DiversityResult | null => {
  const records = parseA3m(a3m);
  const query = records[0];
  if (!query) return null;
  const length = query.aligned.length;
  const usable = records.filter((r) => r.aligned.length === length);
  if (usable.length < 2 || length === 0) return null;

  const entropies: number[] = [];
  for (let col = 0; col < length; col += 1) {
    const column: string[] = [];
    for (const r of usable) column.push(r.aligned[col] as string);
    entropies.push(Number(columnEntropy(column).toFixed(6)));
  }
  const percentiles = ranksToPercentiles(entropies);
  const grades = percentiles.map(percentileToGrade);
  return {
    length,
    entropies,
    percentiles,
    grades,
    msaDepth: usable.length,
    lockedPositions: lockedPositions(percentiles),
  };
};
