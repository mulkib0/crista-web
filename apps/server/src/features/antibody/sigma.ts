/**
 * 표적별 σ 정규화 — '그 표적에서 임의 CDR 단일 변이 1,000회' 의 `raw` 표준편차예요(§4.1a · §10 U7).
 *
 * 왜 표적마다 다른가: 항원 크기가 다르면 계면 잔기쌍 수가 달라서, 같은 1변이의 `|raw|` 가 표적마다 달라져요.
 * σ 로 나누면 표적이 달라도 '얼마나 과감한 변이인가'를 같은 자로 재요.
 *
 * **결정적 난수**: 표적 이름 · 시드 글자열에서 32비트 상태를 만들고 mulberry32 로 뽑아요.
 * 같은 입력이면 1,000회 모두 같은 순서로 뽑히고, 결과도 늘 같아요. `Math.random` 을 쓰지 않아요.
 */
import type { AntibodyMutation } from '@crista-web/web-contract';
import type { AbChain } from '@crista-web/web-contract';
import { bindRaw, type InterfaceContact } from './bind-score.ts';
import { AA20, SIGMA_TRIALS, SUGGEST_OMIT_AA } from './constants.ts';

/** 변이를 뽑을 수 있는 자리 — 원본 Fv 의 **CDR 안** 자리 전부예요(계면 밖 자리도 들어가요). */
export interface MutablePosition {
  chain: AbChain;
  /** 1부터 세는 Fv 서열 자리. */
  pos: number;
  /** 원본 잔기. */
  wt: string;
}

export interface SigmaResult {
  /** `σ_target` — 표준편차(모집단 기준)예요. */
  sigma: number;
  /** 단일 변이 1개의 `|raw|` 평균 — 설계 §4.1 표의 칸이에요. */
  meanAbsRaw: number;
  /** 뽑은 횟수. */
  trials: number;
  /** 계면 잔기쌍 수 — 설계 §4.1 표의 칸이에요. */
  pairCount: number;
  /** `raw` 가 0 이 아니었던(= 계면에 걸린) 변이 비율 0~1. */
  interfaceHitShare: number;
}

/** FNV-1a 32비트 — 글자열을 난수 씨앗으로 바꿔요. */
const hash32 = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** mulberry32 — 32비트 상태 하나로 도는 결정적 난수예요. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 제안 · 시뮬레이션에서 고를 수 있는 잔기 — 새 Cys 는 넣지 않아요. */
const CANDIDATES = [...AA20].filter((aa) => !SUGGEST_OMIT_AA.includes(aa));

/**
 * 표적별 σ.
 * 뽑을 자리가 없거나 계면 쌍이 없으면 `null` — σ 를 모르는 채 0 으로 나누지 않아요.
 */
export const sigmaTarget = (input: {
  pairs: readonly InterfaceContact[];
  positions: readonly MutablePosition[];
  seed: string;
  trials?: number;
}): SigmaResult | null => {
  const trials = input.trials ?? SIGMA_TRIALS;
  if (input.positions.length === 0 || input.pairs.length === 0 || trials <= 0) return null;

  const next = mulberry32(hash32(input.seed));
  const values: number[] = [];
  let hits = 0;
  for (let t = 0; t < trials; t += 1) {
    const position = input.positions[Math.floor(next() * input.positions.length)] as MutablePosition;
    let mut = CANDIDATES[Math.floor(next() * CANDIDATES.length)] as string;
    if (mut === position.wt) {
      // 같은 잔기가 뽑히면 다음 칸으로 한 칸 밀어요 — 난수를 더 뽑지 않아서 순서가 흐트러지지 않아요.
      const index = (CANDIDATES.indexOf(mut) + 1) % CANDIDATES.length;
      mut = CANDIDATES[index] as string;
    }
    const mutation: AntibodyMutation = { chain: position.chain, pos: position.pos, wt: position.wt, mut };
    const { raw } = bindRaw(input.pairs, [mutation]);
    values.push(raw);
    if (raw !== 0) hits += 1;
  }

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const meanAbs = values.reduce((s, v) => s + Math.abs(v), 0) / values.length;
  return {
    sigma: Number(Math.sqrt(variance).toFixed(6)),
    meanAbsRaw: Number(meanAbs.toFixed(6)),
    trials,
    pairCount: input.pairs.length,
    interfaceHitShare: Number((hits / values.length).toFixed(4)),
  };
};
