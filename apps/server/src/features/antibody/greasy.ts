/**
 * 기름진 겉면 정도 · 전하 패치 — **모형으로 추정한 값**이에요(§3.5).
 *
 * 한계 문구(화면에 함께 보여요)
 * - `원전은 3차원 구조 모형에서 표면 노출과 원자 거리를 재어 계산해요. 이 랩은 서열 창(window)으로 CDR 주변만 대신 계산하므로
 *    원전 값과 달라요. 순위를 보는 데만 쓰세요.`
 *
 * 1판에서 바꾼 것(§10 S7)
 * - 계산 범위를 **CDR 주변부(CDR + 양옆 2잔기)** 로 제한했어요. 1판 식은 Fv 전체에 걸려 스케일이 4배가량 어긋났어요.
 * - **z 감점을 쓰지 않아요.** 승인 치료항체 서열로 우리가 직접 잰 분포의 **백분위 밴드**로 등급을 매겨요.
 */
import type { CdrSpan } from '@crista-web/web-contract';
import { acidicDensity, basicDensity } from './charge.ts';
import {
  CDR_VICINITY_PAD,
  GREASY_REFERENCE_QUANTILES,
  GREASY_WINDOW,
  POSITIVE_PATCH_MIN_DENSITY,
  POSITIVE_PATCH_REFERENCE_QUANTILES,
  POSITIVE_PATCH_WINDOW,
  bandPoints,
  kdNormalized,
  percentileFromQuantiles,
} from './constants.ts';

/**
 * CDR 주변부 자리 집합 — **1부터 세는 서열 자리**(`CdrSpan.start`/`end` 와 같은 축)예요.
 * CDR 과 그 양옆 `CDR_VICINITY_PAD` 자리까지예요.
 */
export const cdrVicinityPositions = (seqLength: number, cdrs: readonly CdrSpan[]): Set<number> => {
  const set = new Set<number>();
  for (const cdr of cdrs) {
    const from = Math.max(1, cdr.start - CDR_VICINITY_PAD);
    const to = Math.min(seqLength, cdr.end + CDR_VICINITY_PAD);
    for (let p = from; p <= to; p += 1) set.add(p);
  }
  return set;
};

/**
 * 기름진 겉면 정도 — `Σ_{1 ≤ |i−j| ≤ 5} H_i·H_j / (|i−j| + 1)²`, 두 자리 **모두 CDR 주변부에 들 때만** 더해요.
 * `H` 는 Kyte-Doolittle 값을 1~2 로 정규화한 값(`kdNormalized`)이에요. 같은 쌍을 두 번 세지 않아요(`i < j`).
 * CDR 을 못 받았으면 `null` — 없는 값을 꾸미지 않아요.
 */
export const greasySurface = (seq: string, cdrs: readonly CdrSpan[]): number | null => {
  if (seq.length === 0 || cdrs.length === 0) return null;
  const inRange = cdrVicinityPositions(seq.length, cdrs);
  if (inRange.size === 0) return null;
  let sum = 0;
  for (let i = 1; i <= seq.length; i += 1) {
    if (!inRange.has(i)) continue;
    const hi = kdNormalized(seq[i - 1] as string);
    for (let d = 1; d <= GREASY_WINDOW; d += 1) {
      const j = i + d;
      if (j > seq.length || !inRange.has(j)) continue;
      const hj = kdNormalized(seq[j - 1] as string);
      sum += (hi * hj) / (d + 1) ** 2;
    }
  }
  return Number(sum.toFixed(4));
};

/** 기름진 겉면 정도의 백분위(0~1) — 승인 항체 자체 분포예요. 참조 분포가 없으면 `null` 이에요. */
export const greasyPercentile = (value: number): number | null =>
  percentileFromQuantiles(value, GREASY_REFERENCE_QUANTILES);

/** 기름진 겉면 정도 점수(0~100) — 백분위 4단 밴드예요(§4.1b). 백분위를 모르면 `null` 이에요. */
export const greasyPoints = (value: number): number | null => {
  const pct = greasyPercentile(value);
  return pct === null ? null : bandPoints(pct);
};

/** 창 하나하나의 밀도 중 가장 큰 값 — 패치는 '어딘가 한 곳에 몰려 있는지'를 보는 지표예요. */
const peakDensity = (
  seq: string,
  cdrs: readonly CdrSpan[],
  measure: (window: string) => number,
): number | null => {
  if (seq.length === 0 || cdrs.length === 0) return null;
  const inRange = cdrVicinityPositions(seq.length, cdrs);
  if (inRange.size === 0) return null;
  let peak: number | null = null;
  for (let start = 1; start + POSITIVE_PATCH_WINDOW - 1 <= seq.length; start += 1) {
    const end = start + POSITIVE_PATCH_WINDOW - 1;
    let covered = 0;
    for (let p = start; p <= end; p += 1) if (inRange.has(p)) covered += 1;
    // 창의 절반 이상이 CDR 주변부에 들어 있을 때만 세요 — 틀 서열의 전하를 패치로 세지 않기 위해서예요.
    if (covered * 2 < POSITIVE_PATCH_WINDOW) continue;
    const value = measure(seq.slice(start - 1, end));
    if (peak === null || value > peak) peak = value;
  }
  return peak === null ? null : Number(peak.toFixed(4));
};

/** CDR 주변부에서 K · R 이 가장 몰린 창의 밀도 — 양전하 패치 재료예요(§4.1c). */
export const positivePatchDensity = (seq: string, cdrs: readonly CdrSpan[]): number | null =>
  peakDensity(seq, cdrs, basicDensity);

/** CDR 주변부에서 D · E 가 가장 몰린 창의 밀도 — 경고 라벨용이고 점수에 넣지 않아요(§10 S5). */
export const negativePatchDensity = (seq: string, cdrs: readonly CdrSpan[]): number | null =>
  peakDensity(seq, cdrs, acidicDensity);

/** 양전하 패치 밀도의 백분위(0~1) — 상위 5% 가 감점 문턱이에요. */
export const positivePatchPercentile = (density: number): number | null =>
  percentileFromQuantiles(density, POSITIVE_PATCH_REFERENCE_QUANTILES);

/**
 * 양전하 패치 감점 대상인지(§4.1c · §10 S4).
 *
 * 설계는 '상위 5%' 라고 적었지만 창이 9칸이라 밀도가 `n/9` 로만 나오고 95% 분위(3/9)에 승인 항체 20종이 몰려 있어요.
 * 백분위로 자르면 13% 가 걸리므로, 측정한 문턱 `POSITIVE_PATCH_MIN_DENSITY`(4/9) **이상**일 때 감점해요
 * — 승인 항체 151종 가운데 2종(1.3%)만 걸려요. 왜 백분위를 쓰지 않는지는 `constants.ts` 주석에 적어 뒀어요.
 */
export const isPositivePatch = (density: number | null): boolean =>
  density !== null && density >= POSITIVE_PATCH_MIN_DENSITY;
