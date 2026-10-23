/**
 * 붙는 힘 점수 — **모형으로 추정한 값**이에요(§3.2 · §4.1a).
 *
 * 한계 문구(화면에 함께 보여요)
 * - `아미노산 쌍이 단백질 안에서 얼마나 자주 맞닿는지 센 통계표(Miyazawa-Jernigan 1996)로 더한 **무단위 점수**예요.
 *    자유에너지 계산도, 실험 측정도 아니에요. 이 통계는 **입체 충돌(공간이 모자라 들어가지 못하는 것)을 보지 못하므로**,
 *    작은 잔기를 큰 잔기로 바꾸는 설계가 실제로는 불가능해도 점수가 오를 수 있어요.`
 *
 * **단위를 붙이지 않아요** — 에너지 단위 표기를 어디에도 쓰지 않아요(§3.5 · 묶음 6 감사).
 *
 * 산식(§4.1a · 2026-10-24 보정)
 * ```
 * raw    = Σ_{(i,j)∈C} [ e'(mut_i, j) − e'(wt_i, j) ]
 * raw    = capCharge(raw)             // 전하쌍 기여를 ±0.5·|raw| 안으로 가두고 나머지와 더해요
 * perMut = raw / max(1, m_eff)        // 변이 수를 늘려 점수를 쌓지 못하게요
 * z      = −perMut / σ_target
 * 붙는힘  = clamp(65 + 12·z, 65 − 3·m_eff, 65 + 3·m_eff) 그리고 0~100   // 원본(변이 0) = 65
 * ```
 *
 * **상한이 부호를 뒤집지 않아요**: 전하쌍 기여를 깎다가 합의 부호가 반대로 돌면 0 에서 멈춰요.
 * 예전 '초과분 빼기' 식은 비전하 기여가 반대 부호일 때 유리한 설계를 원본(65)보다 낮게 만들었어요(§12).
 *
 * **유효 변이 1개가 움직일 수 있는 폭은 ±3 점이에요**(`BIND_GAIN_PER_MUTATION`). 그래서 계면 한 자리를
 * 큰 잔기로 바꾸는 것만으로 붙는 힘 가중치(30%)를 다 받지 못하고(예전에는 한 글자로 100 점이 나왔어요),
 * 한 글자 때문에 0 점까지 떨어지지도 않아요. 유효 변이가 0개면 폭이 0 이라 **원본은 정확히 65** 예요.
 * 이건 **교육용 보호장치**예요 — 과학적 근거가 있는 항이 아니고, 점수를 만들 때의 규칙이에요(§3.5).
 */
import type { AntibodyMutation } from '@crista-web/web-contract';
import type { AbChain } from '@crista-web/web-contract';
import {
  ACIDIC_AA,
  BASIC_AA,
  BIND_BASE,
  BIND_GAIN_PER_MUTATION,
  BIND_SLOPE,
  CHARGE_PAIR_CAP,
} from './constants.ts';
import { mjContact } from './data/mj1996.ts';

/** 계면 잔기쌍 한 개 — `interface.ts` 가 만든 쌍에서 점수 계산에 필요한 것만 남긴 꼴이에요. */
export interface InterfaceContact {
  chain: AbChain;
  /** 1부터 세는 Fv 서열 자리. */
  pos: number;
  /** 원본(야생형) 잔기. */
  aa: string;
  /** 맞닿은 항원 잔기. */
  agAa: string;
}

export interface BindScoreResult {
  /** 0~100 — 원본(변이 0)이 65 예요. */
  score: number;
  /** 전하쌍 상한을 적용한 접촉 통계 합(표시용 · **단위 없음**). */
  raw: number;
  /** 상한을 적용하기 전 합 — 상한이 얼마나 깎았는지 보여 주려고 함께 들고 다녀요. */
  rawBeforeCap: number;
  /** 전하쌍(K·R ↔ D·E) 기여분이 **상한 전** 합에서 차지한 비율 0~1 — '전하쌍으로 번 점수' 분해예요(§4.1a). */
  chargePairShare: number;
  /** 상한이 합을 깎은 비율 0~1 — `1 − |raw| / |rawBeforeCap|` 이에요(화면에 '얼마나 깎였는지' 보여 줘요). */
  capCutShare: number;
  /** 유효 변이 1개당 효과. */
  perMut: number;
  /** 표적별 σ 로 정규화한 값. */
  z: number;
  /** 계산에 쓴 유효 변이 수. */
  effectiveMutations: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** 전하쌍인지 — K·R 과 D·E 가 마주 본 쌍이에요. */
export const isChargePair = (abAa: string, agAa: string): boolean =>
  (BASIC_AA.includes(abAa) && ACIDIC_AA.includes(agAa)) || (ACIDIC_AA.includes(abAa) && BASIC_AA.includes(agAa));

/**
 * 접촉 통계 합 — 변이가 난 자리의 쌍만 더해요(계면 밖 변이는 0 이라 합이 움직이지 않아요).
 * 20종 밖 글자가 들어오면 그 쌍은 **빼요**(없는 값을 0 으로 꾸미지 않고, 셀 수 없는 쌍을 세지 않아요).
 */
export const bindRaw = (
  pairs: readonly InterfaceContact[],
  mutations: readonly AntibodyMutation[],
): { raw: number; chargePairRaw: number; usedPairs: number } => {
  const byPos = new Map<string, AntibodyMutation>();
  for (const m of mutations) byPos.set(`${m.chain}:${m.pos}`, m);

  let raw = 0;
  let chargePairRaw = 0;
  let usedPairs = 0;
  for (const pair of pairs) {
    const mut = byPos.get(`${pair.chain}:${pair.pos}`);
    if (!mut) continue;
    const after = mjContact(mut.mut, pair.agAa);
    const before = mjContact(mut.wt, pair.agAa);
    if (after === null || before === null) continue;
    const delta = after - before;
    raw += delta;
    usedPairs += 1;
    if (isChargePair(mut.mut, pair.agAa)) chargePairRaw += delta;
  }
  return { raw: Number(raw.toFixed(6)), chargePairRaw: Number(chargePairRaw.toFixed(6)), usedPairs };
};

/**
 * 전하쌍 상한 — 전하쌍 기여를 **`±0.5·|raw|` 안으로 가두고** 전하쌍이 아닌 기여와 다시 더해요(§4.1a · §10 S4).
 * 상한은 **자르기 전 `|raw|`** 로 재요(자르면서 상한이 함께 움직이면 값이 수렴하지 않아요).
 *
 * 상한은 **합의 부호를 바꾸지 않아요** — 깎은 결과가 반대 부호가 되면 **0** 으로 둬요.
 * 예전 식(`raw − 초과분`)은 전하쌍이 아닌 기여가 반대 부호일 때(`|전하쌍| > |raw|`)
 * 유리한 설계를 불리하게 뒤집어, 원본(65)보다 낮은 점수를 줬어요(§12 — 실측 19건).
 */
export const capCharge = (raw: number, chargePairRaw: number): number => {
  if (raw === 0) return 0;
  const scale = Math.abs(raw);
  const limit = CHARGE_PAIR_CAP * scale;
  const nonCharge = raw - chargePairRaw;
  // 상한은 **깎기만** 해요 — `|raw|` 를 넘어서는 쪽으로 늘리지 않아요(전하쌍이 불리한 쪽일 때 상금이 되지 않게요).
  const capped = clamp(nonCharge + clamp(chargePairRaw, -limit, limit), -scale, scale);
  // 상한이 부호를 뒤집으면 '벌'이 되므로 0 에서 멈춰요(이득도 손해도 없음).
  if (raw > 0 && capped < 0) return 0;
  if (raw < 0 && capped > 0) return 0;
  return Number(capped.toFixed(6));
};

/**
 * 붙는 힘 점수.
 * `sigma` 가 0 이거나 유한하지 않으면 **원본 기준점 65 를 그대로** 돌려줘요 — 0 으로 나눠 무한대를 만들지 않아요.
 */
export const bindScore = (
  pairs: readonly InterfaceContact[],
  mutations: readonly AntibodyMutation[],
  sigma: number,
  effectiveMutations: number,
): BindScoreResult => {
  const { raw: rawBeforeCap, chargePairRaw } = bindRaw(pairs, mutations);
  const raw = capCharge(rawBeforeCap, chargePairRaw);
  const chargePairShare =
    rawBeforeCap === 0 ? 0 : Number(Math.min(1, Math.abs(chargePairRaw) / Math.abs(rawBeforeCap)).toFixed(4));
  const capCutShare =
    rawBeforeCap === 0
      ? 0
      : Number(clamp(1 - Math.abs(raw) / Math.abs(rawBeforeCap), 0, 1).toFixed(4));
  const mEff = Math.max(0, Math.trunc(effectiveMutations));
  const perMut = Number((raw / Math.max(1, mEff)).toFixed(6));
  const usable = Number.isFinite(sigma) && sigma > 0;
  const z = usable ? Number((-perMut / sigma).toFixed(6)) : 0;
  // 유효 변이 1개당 ±3 점 — 한 자리만 바꿔 가중치를 다 받는 길을 막아요(교육용 보호장치 · §12).
  const span = BIND_GAIN_PER_MUTATION * mEff;
  const score = Number(
    clamp(clamp(BIND_BASE + BIND_SLOPE * z, BIND_BASE - span, BIND_BASE + span), 0, 100).toFixed(2),
  );
  return { score, raw, rawBeforeCap, chargePairShare, capCutShare, perMut, z, effectiveMutations };
};
