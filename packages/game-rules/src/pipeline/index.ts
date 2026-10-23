/**
 * 신약 파이프라인 순수 규칙(M5) — 물성 신호 · 효능 E · 안전 S · 흔들림 · 판정 · 상태 전이 · 비용 · 기간 · 특허 같은 물질 판정.
 * 단일 소스: docs/2026-10-19-game-balance-v0.md §10, 계약 `@crista/shared-types` 의 `pipeline.ts`.
 * 담당: W-pipeline(docs/2026-10-21-m5-implementation-brief.md §5.1). 시계 · 난수 주입 — `Date.now` · `Math.random` 금지.
 *
 * 같은 물질 판정(균형안 §10.2)의 단위는 워커가 준 `MoleculeProperties.flatSmiles` 이고, 규칙은 문자열 비교만 한다(`sameSubstance`).
 */
export * from './rules.ts';
export * from './score.ts';
export * from './flow.ts';

/** 같은 물질인가 — 입체 정보를 뺀 정규 SMILES(워커 `flatSmiles`)가 같으면 같은 물질(균형안 §10.2). */
export function sameSubstance(aFlatSmiles: string, bFlatSmiles: string): boolean {
  return aFlatSmiles.length > 0 && aFlatSmiles === bFlatSmiles;
}
