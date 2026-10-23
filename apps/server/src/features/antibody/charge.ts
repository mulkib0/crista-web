/**
 * 순전하 · pI · 두 사슬 전하 궁합 — 모두 **센 값**이에요(서열에서 그대로 세고, 모형을 거치지 않아요 · §3.5).
 *
 * 한계 문구(화면에 함께 보여요)
 * - 두 사슬 전하 궁합: `두 사슬의 순전하를 곱한 값이에요. 원전은 구조 표면에 드러난 전하만 세므로 이 값과 달라요.`
 *
 * 결정성: 네트워크 · 시각 · 난수를 쓰지 않아요. 같은 서열이면 늘 같은 값이에요.
 */
import {
  ACIDIC_AA,
  BASIC_AA,
  CHAIN_CHARGE_PH,
  PK_CTERM_BY_RESIDUE,
  PK_NEGATIVE,
  PK_NTERM_BY_RESIDUE,
  PK_POSITIVE,
  PI_BANDS,
  SIMPLE_CHARGE,
} from './constants.ts';

/** Bjellqvist 식의 한 항 — 염기성 잔기가 양전하로 남아 있을 확률이에요. */
const positiveFraction = (pH: number, pKa: number): number => 1 / (1 + 10 ** (pH - pKa));
/** 산성 잔기가 음전하를 띨 확률이에요. */
const negativeFraction = (pH: number, pKa: number): number => 1 / (1 + 10 ** (pKa - pH));

/**
 * 주어진 pH 에서의 순전하 — Bjellqvist pKa 를 쓰는 연속식이에요.
 * `Q(pH) = Σ_basic 1/(1+10^(pH−pKa)) − Σ_acidic 1/(1+10^(pKa−pH))` + 말단 잔기 보정(§3.2).
 */
export const netCharge = (seq: string, pH: number): number => {
  if (seq.length === 0) return 0;
  const first = seq[0] as string;
  const last = seq[seq.length - 1] as string;

  const nTermPk = PK_NTERM_BY_RESIDUE[first] ?? (PK_POSITIVE['Nterm'] as number);
  const cTermPk = PK_CTERM_BY_RESIDUE[last] ?? (PK_NEGATIVE['Cterm'] as number);

  let positive = positiveFraction(pH, nTermPk);
  let negative = negativeFraction(pH, cTermPk);

  for (const aa of seq) {
    const pos = PK_POSITIVE[aa];
    if (pos !== undefined) positive += positiveFraction(pH, pos);
    const neg = PK_NEGATIVE[aa];
    if (neg !== undefined) negative += negativeFraction(pH, neg);
  }
  return positive - negative;
};

/** pI 를 찾을 때 쓰는 pH 범위 · 멈춤 폭 — 이분법이라 결과가 늘 같아요. */
const PI_LOW = 0;
const PI_HIGH = 14;
const PI_TOLERANCE = 1e-4;

/** 등전점(pI) — pH 0~14 이분법으로 순전하가 0 이 되는 pH 를 찾아요. */
export const isoelectricPoint = (seq: string): number => {
  if (seq.length === 0) return 7;
  let low = PI_LOW;
  let high = PI_HIGH;
  // 65회면 14 / 2^65 이라 `PI_TOLERANCE` 보다 훨씬 좁아져요 — 반복 수를 고정해서 결과를 결정적으로 만들어요.
  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const q = netCharge(seq, mid);
    if (Math.abs(q) < PI_TOLERANCE) return Number(mid.toFixed(2));
    if (q > 0) low = mid;
    else high = mid;
  }
  return Number(((low + high) / 2).toFixed(2));
};

/** pI 점수(0~100) — 밴드 표는 `constants.ts` 에 있어요(§4.1b). */
export const isoelectricPoints = (pi: number): number => {
  for (const band of PI_BANDS) {
    if (pi >= band.min && pi <= band.max) return band.points;
  }
  return 40;
};

/**
 * 두 사슬 전하 궁합용 **간단 전하** — D/E −1 · K/R +1 · H +0.1(pH 5.5 · 원전과 같은 꼴).
 * 위의 `netCharge` 와 다른 식이에요 — 원전이 이 꼴을 쓰기 때문에 비교 가능성을 위해 따로 둬요.
 */
export const simpleCharge = (seq: string): number => {
  let sum = 0;
  for (const aa of seq) sum += SIMPLE_CHARGE[aa] ?? 0;
  return Number(sum.toFixed(4));
};

/**
 * 두 사슬 전하 궁합 — `charge(VH) × charge(VL)`(pH 5.5 · §3.2).
 * 경쇄가 없으면(`vl` 이 빈 값) `null` 이에요 — 없는 값을 0 으로 꾸미지 않아요.
 */
export const chainChargeProduct = (vh: string, vl?: string): number | null => {
  if (!vl || vl.length === 0) return null;
  return Number((simpleCharge(vh) * simpleCharge(vl)).toFixed(4));
};

/** 두 사슬 전하 궁합을 잴 때 쓴 pH — 화면 배지 상세에 그대로 적어요. */
export const chainChargePh = CHAIN_CHARGE_PH;

/** 창 안의 K · R 밀도 — 양전하 패치를 재는 재료예요. */
export const basicDensity = (window: string): number => {
  if (window.length === 0) return 0;
  let n = 0;
  for (const aa of window) if (BASIC_AA.includes(aa)) n += 1;
  return n / window.length;
};

/** 창 안의 D · E 밀도 — 음전하 패치 경고 라벨에 써요(점수에는 넣지 않아요 · §10 S5). */
export const acidicDensity = (window: string): number => {
  if (window.length === 0) return 0;
  let n = 0;
  for (const aa of window) if (ACIDIC_AA.includes(aa)) n += 1;
  return n / window.length;
};
