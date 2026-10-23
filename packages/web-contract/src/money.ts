/**
 * 화폐 — 화면의 모든 돈(연구비 · 비용 · 주가 · 시가총액)은 '크리스타' 하나로 쓴다. 원장(`web.ledger.amount_cents`)은 지금처럼 정수 센트(learning-grant-balance 머리 · 설계 §10).
 *
 * 환산: crista `game-rules` 의 달러 · 센트 상수와 `$0.001M = 5,000 크리스타` 로 맞춘다
 *   → $0.001M = $1,000 = 100,000 센트 = 5,000 크리스타 → **1 크리스타 = 20 센트**.
 *   예: HTVS · 도킹 · ADMET $0.050M = 5,000,000 센트 = 250,000 크리스타 · IND $0.100M = 500,000 크리스타.
 * 원장에 넣을 때는 늘 `cristaToCents`(정수 그대로), 화면에 보일 때는 `centsToCrista`(내림)를 쓴다.
 */

export const CENTS_PER_CRISTA = 20;

/** 모둠 초기 연구비 — 10,000,000 크리스타(learning-grant-design 결정 1). 3판 기반부터 새 모둠에 쓴다(기존 모둠 원장은 그대로). */
export const INITIAL_FUND_CRISTA = 10_000_000;
export const INITIAL_FUND_CENTS = INITIAL_FUND_CRISTA * CENTS_PER_CRISTA;

/** 센트 → 크리스타(0 쪽으로 자름 — 20 의 배수가 아닌 옛 원장 줄도 화면이 깨지지 않게). */
export function centsToCrista(cents: number): number {
  return Math.trunc(cents / CENTS_PER_CRISTA) + 0;
}

/** 크리스타 → 센트(원장에 넣는 값). 정수 크리스타만 받는다. */
export function cristaToCents(crista: number): number {
  if (!Number.isSafeInteger(crista)) throw new RangeError(`크리스타는 정수여야 해요(${crista}).`);
  return crista * CENTS_PER_CRISTA;
}

/** 화면 표시 — `10,000,000 크리스타`(음수는 `−` 기호). `unit: false` 면 숫자만. */
export function formatCrista(crista: number, options: { unit?: boolean } = {}): string {
  const sign = crista < 0 ? '−' : '';
  const body = Math.abs(Math.trunc(crista)).toLocaleString('en-US');
  return options.unit === false ? `${sign}${body}` : `${sign}${body} 크리스타`;
}

/** 센트를 바로 크리스타 문구로. */
export const formatCentsAsCrista = (cents: number, options: { unit?: boolean } = {}): string => formatCrista(centsToCrista(cents), options);
