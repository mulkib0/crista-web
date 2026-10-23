/**
 * 사람 유전자 동일성 — **센 값**이에요(가장 가까운 사람 germline V 유전자와의 서열 동일성을 그대로 세요 · §3.5).
 *
 * 한계 문구(화면에 함께 보여요)
 * - `가장 가까운 사람 유전자와의 서열 동일성(FR1·FR2·FR3)이에요. 면역원성 예측이 아니에요.`
 *
 * 규칙(§3.2 · §10 S9)
 * - **FR1 · FR2 · FR3 만** 세요. **FR4 는 계산 범위에서 빼요** — FR4-IMGT(118-128)는 J 유전자가 만들어서
 *   저장한 V allele 과 비교할 수 없어요.
 * - FR 길이를 `25/17/38/11` 같은 고정 상수로 다루지 않고 **IMGT 번호 자리 집합**으로 다뤄요
 *   (IMGT 는 간격을 두니까 실측에서도 `fwh1 25 · fwh3 38` 과 `26/17/39` 가 함께 나와요).
 *
 * 이 파일이 맞추는 정렬은 **번호 매김에도 쓰여요** — `numbering.ts` 가 여기서 나온 IMGT 자리를 받아
 * SAbDab2 번호를 못 받았을 때의 국소 경로로 써요.
 */
import type { AbChain } from '@crista-web/web-contract';
import { FR_IMGT } from './constants.ts';
import { germlineSet, type GermlineAllele } from './data/germline.ts';

/** 질의 서열 한 자리에 매긴 IMGT 번호 — 삽입 자리는 `insertion` 이 붙어요(예 `[111, 'A']`). */
export interface ImgtSlot {
  num: number;
  insertion: string;
}

export interface GermlineFrameworkIdentity {
  label: 'FR1' | 'FR2' | 'FR3';
  /** 같은 잔기 수. */
  match: number;
  /** germline 에 자리가 있고 정렬도 맞은 자리 수. */
  total: number;
}

export interface GermlineAlignment {
  /** 가장 가까운 allele 이름(예 `IGHV3-23*01`). */
  allele: string;
  /** 정렬 점수(동일성 +1 · 다름 −1 · 간격 −2) — 고른 근거예요. */
  score: number;
  /** 질의 자리(0부터) → IMGT 자리. germline 과 맞춰지지 않은 자리는 `null` 이에요. */
  slots: (ImgtSlot | null)[];
  frameworks: GermlineFrameworkIdentity[];
  /** FR1 + FR2 + FR3 를 합친 동일성(%) — 소수점 두 자리로 자른 값이에요. */
  percent: number;
}

const MATCH = 1;
const MISMATCH = -1;
const GAP = -2;
/** 값싼 4-글자 겹침으로 먼저 걸러 낼 후보 수 — 그 뒤에만 제대로 정렬해요(결과는 같고 빠르기만 달라요). */
const PRESCREEN_KEEP = 6;
const KMER = 4;

interface PreparedAllele {
  allele: string;
  /** 간격을 지운 germline 서열. */
  plain: string;
  /** `plain` 의 자리(0부터) → IMGT 번호(간격이 들어간 자리 + 1). */
  imgt: number[];
  kmers: Set<string>;
}

const kmerSet = (seq: string): Set<string> => {
  const set = new Set<string>();
  for (let i = 0; i + KMER <= seq.length; i += 1) set.add(seq.slice(i, i + KMER));
  return set;
};

const prepare = (entry: GermlineAllele): PreparedAllele => {
  const plainChars: string[] = [];
  const imgt: number[] = [];
  for (let i = 0; i < entry.gapped.length; i += 1) {
    const ch = entry.gapped[i] as string;
    if (ch === '.') continue;
    plainChars.push(ch);
    imgt.push(i + 1); // 간격이 들어간 자리가 곧 IMGT 번호예요.
  }
  const plain = plainChars.join('');
  return { allele: entry.allele, plain, imgt, kmers: kmerSet(plain) };
};

const PREPARED: Record<AbChain, PreparedAllele[]> = {
  H: germlineSet('H').map(prepare),
  L: germlineSet('L').map(prepare),
};

/** 질의와 germline 의 4-글자 겹침 수 — 후보를 고르는 값싼 점수예요. */
const overlap = (a: Set<string>, b: Set<string>): number => {
  let n = 0;
  for (const k of a) if (b.has(k)) n += 1;
  return n;
};

type Move = 0 | 1 | 2; // 0 = 둘 다 소비 · 1 = germline 만(질의에 간격) · 2 = 질의만(germline 에 간격)

interface Aligned {
  score: number;
  /** germline 자리(0부터) → 질의 자리(0부터). 맞춰지지 않으면 −1 이에요. */
  gToQ: number[];
  /** 질의 자리(0부터) → germline 자리(0부터). 맞춰지지 않으면 −1 이에요. */
  qToG: number[];
}

/**
 * germline 은 **전부** 맞추고 질의의 앞 · 뒤 남는 부분은 공짜로 두는 정렬이에요(semi-global).
 * 질의 VH 는 germline V-REGION 보다 길어요(CDR3 · FR4 가 더 붙어 있어요).
 */
const align = (germline: string, query: string): Aligned => {
  const m = germline.length;
  const n = query.length;
  const width = n + 1;
  const dp = new Float64Array((m + 1) * width);
  const from = new Uint8Array((m + 1) * width);

  for (let j = 0; j <= n; j += 1) dp[j] = 0; // 질의 앞쪽은 공짜
  for (let i = 1; i <= m; i += 1) {
    dp[i * width] = (dp[(i - 1) * width] as number) + GAP;
    from[i * width] = 1;
  }

  for (let i = 1; i <= m; i += 1) {
    const gi = germline[i - 1] as string;
    for (let j = 1; j <= n; j += 1) {
      const diag = (dp[(i - 1) * width + j - 1] as number) + (gi === query[j - 1] ? MATCH : MISMATCH);
      const up = (dp[(i - 1) * width + j] as number) + GAP;
      const left = (dp[i * width + j - 1] as number) + GAP;
      let best = diag;
      let move: Move = 0;
      if (up > best) {
        best = up;
        move = 1;
      }
      if (left > best) {
        best = left;
        move = 2;
      }
      dp[i * width + j] = best;
      from[i * width + j] = move;
    }
  }

  let bestJ = 0;
  let bestScore = dp[m * width] as number;
  for (let j = 1; j <= n; j += 1) {
    const v = dp[m * width + j] as number;
    if (v > bestScore) {
      bestScore = v;
      bestJ = j;
    }
  }

  const gToQ = new Array<number>(m).fill(-1);
  const qToG = new Array<number>(n).fill(-1);
  let i = m;
  let j = bestJ;
  while (i > 0) {
    const move = from[i * width + j] as Move;
    if (move === 0) {
      gToQ[i - 1] = j - 1;
      qToG[j - 1] = i - 1;
      i -= 1;
      j -= 1;
    } else if (move === 1) {
      i -= 1;
    } else {
      j -= 1;
    }
    if (j < 0) break;
  }
  return { score: bestScore, gToQ, qToG };
};

const inRange = (num: number, start: number, end: number): boolean => num >= start && num <= end;

/**
 * 가장 가까운 사람 germline V allele 을 찾아 정렬해요.
 * 빈 서열 · 너무 짧은 서열(50 잔기 미만)이면 `null` — 없는 값을 꾸미지 않아요.
 */
export const alignToGermline = (seq: string, chain: AbChain): GermlineAlignment | null => {
  if (seq.length < 50) return null;
  const pool = PREPARED[chain];
  if (pool.length === 0) return null;

  const qk = kmerSet(seq);
  const ranked = pool
    .map((entry, index) => ({ entry, index, hits: overlap(qk, entry.kmers) }))
    // 겹침이 같으면 **입력 순서**로 갈라요 — 같은 서열이면 늘 같은 allele 을 고르게 하려고요.
    .sort((a, b) => (b.hits - a.hits !== 0 ? b.hits - a.hits : a.index - b.index))
    .slice(0, PRESCREEN_KEEP);

  let best: { entry: PreparedAllele; aligned: Aligned } | null = null;
  for (const { entry } of ranked) {
    const aligned = align(entry.plain, seq);
    if (!best || aligned.score > best.aligned.score) best = { entry, aligned };
  }
  if (!best) return null;

  const { entry, aligned } = best;
  const slots: (ImgtSlot | null)[] = new Array<ImgtSlot | null>(seq.length).fill(null);
  for (let gi = 0; gi < entry.plain.length; gi += 1) {
    const qi = aligned.gToQ[gi] as number;
    if (qi < 0) continue;
    slots[qi] = { num: entry.imgt[gi] as number, insertion: '' };
  }
  // germline 에 없는(질의에만 있는) 자리는 앞 번호에 삽입문자를 붙여요 — IMGT 가 CDR 길이 차이를 담는 방식이에요.
  let carryNum = 0;
  let carryIndex = 0;
  for (let qi = 0; qi < seq.length; qi += 1) {
    const slot = slots[qi];
    if (slot) {
      carryNum = slot.num;
      carryIndex = 0;
      continue;
    }
    if (carryNum === 0) continue;
    carryIndex += 1;
    slots[qi] = { num: carryNum, insertion: String.fromCharCode(64 + carryIndex) };
  }

  const frameworks: GermlineFrameworkIdentity[] = [];
  let matchAll = 0;
  let totalAll = 0;
  for (const fr of FR_IMGT) {
    let match = 0;
    let total = 0;
    for (let gi = 0; gi < entry.plain.length; gi += 1) {
      const num = entry.imgt[gi] as number;
      if (!inRange(num, fr.start, fr.end)) continue;
      const qi = aligned.gToQ[gi] as number;
      if (qi < 0) continue;
      total += 1;
      if (entry.plain[gi] === seq[qi]) match += 1;
    }
    frameworks.push({ label: fr.label, match, total });
    matchAll += match;
    totalAll += total;
  }

  const percent = totalAll === 0 ? 0 : Number(((100 * matchAll) / totalAll).toFixed(2));
  return { allele: entry.allele, score: aligned.score, slots, frameworks, percent };
};

/**
 * 사람 유전자 동일성 — FR1 · FR2 · FR3 동일성(%)과 가장 가까운 allele 이름이에요.
 * 서열이 너무 짧으면 `null` 이에요.
 */
export const germlineIdentity = (
  seq: string,
  chain: AbChain,
): { percent: number; nearestGermline: string; frameworks: GermlineFrameworkIdentity[] } | null => {
  const aligned = alignToGermline(seq, chain);
  if (!aligned) return null;
  return { percent: aligned.percent, nearestGermline: aligned.allele, frameworks: aligned.frameworks };
};
