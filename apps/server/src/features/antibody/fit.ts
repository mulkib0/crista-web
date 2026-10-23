/**
 * 설계 적합도(A5 의 표시값) — **교육용 근사**예요(§4.2).
 *
 * 한계 문구(화면에 함께 보여요)
 * - `항체–항원 복합체 예측은 현재 기술에서도 정확도가 낮고, 이 값은 결합력(affinity)이 아니에요.`
 * - `교육용 근사 — 실제 AlphaFold 결과가 아니에요.`
 *
 * ```
 * 적합도 = clamp( 0.70·붙는힘 + 0.30·계면 유지항, 0, 100 )
 *   붙는힘      = §4.1(a) 와 **똑같은 값**(다시 스케일하지 않아요)
 *   계면 유지항  = 100 × (다양성이 낮은 계면 잔기 가운데 그대로 둔 비율)
 *               = 분모가 0 이면 이 항을 빼고 붙는힘 가중치를 1.00 으로 **재분배**해요(0/0 금지)
 * ```
 *
 * **같은 뜻의 값을 두 이름으로 보여 주지 않아요**(§10 U11) — 붙는 힘 점수는 하나뿐이고,
 * 설계 적합도는 '붙는 힘 + 위험한 자리를 지켰는지'를 합친 한 단계 위의 묶음 값이에요.
 *
 * A4 의 확신도는 적합도에 **넣지 않아요** — `CONFIDENCE_MIN_FOR_COMPLEX`(70) 문턱으로만 써요(§4.2).
 */
import { CONFIDENCE_MIN_FOR_COMPLEX, antibodyGrade, type AntibodyGrade } from '@crista-web/web-contract';
import { FIT_BIND_WEIGHT, FIT_INTERFACE_WEIGHT } from './constants.ts';

export interface FitInput {
  /** §4.1(a) 의 붙는 힘 점수 0~100 — 여기서 다시 스케일하지 않아요. */
  bindScore: number;
  /** 다양성이 낮은(= 지켜야 하는) 계면 잔기 수. 0 이면 계면 유지항을 빼요. */
  conservedInterfaceTotal: number;
  /** 그 가운데 그대로 둔 자리 수. */
  conservedInterfaceKept: number;
}

export interface FitResult {
  /** 설계 적합도 0~100(소수점 두 자리). */
  fit: number;
  grade: AntibodyGrade;
  /** 계면 유지항 0~100 — 분모가 0 이면 `null` 이에요. */
  interfaceKept: number | null;
  /** 계면 유지항을 뺐는지(분모 0) — 화면에 '지킬 자리가 없었어요'를 적어요. */
  interfaceTermDropped: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** 설계 적합도. */
export const designFit = (input: FitInput): FitResult => {
  const bind = clamp(input.bindScore, 0, 100);
  if (input.conservedInterfaceTotal <= 0) {
    const fit = Number(clamp(bind, 0, 100).toFixed(2));
    return { fit, grade: antibodyGrade(fit), interfaceKept: null, interfaceTermDropped: true };
  }
  const kept = clamp(input.conservedInterfaceKept, 0, input.conservedInterfaceTotal);
  const interfaceKept = Number(((100 * kept) / input.conservedInterfaceTotal).toFixed(2));
  const fit = Number(clamp(FIT_BIND_WEIGHT * bind + FIT_INTERFACE_WEIGHT * interfaceKept, 0, 100).toFixed(2));
  return { fit, grade: antibodyGrade(fit), interfaceKept, interfaceTermDropped: false };
};

/**
 * 원본 대비 개선폭 — 늘 함께 보여요. 원본이 1위면 개선폭 0 으로 두고 '원본이 여전히 최고예요'를 적어요(§4.2).
 */
export const fitDelta = (best: number, parent: number): { delta: number; note: string | null } => {
  const delta = Number(Math.max(0, best - parent).toFixed(2));
  return delta === 0 ? { delta: 0, note: '원본이 여전히 최고예요 — 개선 실패예요.' } : { delta, note: null };
};

/** A5 후보가 될 수 있는 확신도인지 — 평균 확신도(0~100)가 70 이상이어야 해요(§4.2). */
export const passesConfidenceGate = (confidenceMean: number): boolean =>
  confidenceMean >= CONFIDENCE_MIN_FOR_COMPLEX;
