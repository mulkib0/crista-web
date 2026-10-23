/**
 * 항체 랩 소식 · 기업가치 어댑터(설계 §11.3) — **공용 원장에 합친다**.
 *
 * - 소식은 0007 `web.board_events`(`board-events.ts` 의 `postBoardEvent`)에 쌓는다. 항체 전용 소식 표를 만들지 않는다(§11.5).
 * - **다른 파일에서 `postBoardEvent` 를 직접 부르지 않는다** — 이 파일의 `postAntibodyEvent` 한 곳만 쓴다.
 * - `board_events.kind` check 가 아직 `antibody_%` 를 받지 않는 DB 도 있으므로 **savepoint 안에서** 부르고 위반이면
 *   **소식만 건너뛴다**(점수 · 과금은 그대로 커밋). 건너뛴 사실은 `antibody_scores.parts.eventSkipped` 에 남긴다.
 * - 기업가치는 0007 `web.valuations` 에 쌓는다. 변동률을 정하는 것은 **FMARKET 의 `onBoardEvent('market')`** 이고,
 *   그 처리기가 **없을 때만** 이 파일의 `onBoardEvent('antibody-fallback')` 이 대신 채운다.
 *   판정은 **처리기 몸통 안에서 소식마다** `hasBoardEventHook('market')` 으로 한다(등록 시점에 한 번 보면 나중에 등록된 FMARKET 을 놓친다).
 *   `change_pct` 가 이미 채워진 소식은 건너뛴다(이중 안전장치 — 한 소식에 변동률을 두 번 적용하지 않는 것이 불변식).
 * - 과정 평가는 FMARKET 의 `postProcessScore` 를 쓴다(§11.3.1). 아직 이 작업 트리에 없으므로 **있으면 부르고 없으면 건너뛴다**.
 */
import {
  LISTING_PRICE_USD,
  MARKET_EXTRA_BANDS,
  PRICE_FLOOR_USD,
  SHARES_OUTSTANDING,
  type AntibodyNewsKind,
  type AntibodyValuationView,
  type BoardEventKind,
  type BoardEventTone,
  type MoveBand,
} from '@crista-web/web-contract';
import { hasBoardEventHook, onBoardEvent, postBoardEvent, type BoardEventRecord } from '../../board-events.ts';
import type { Deps } from '../../context.ts';
import type { Queryable, Tx } from '../../db.ts';

/** 소식 종류 접두 — DB check `^antibody_[a-z0-9_]{1,40}$` 와 같은 꼴. */
const ANTIBODY_PREFIX = 'antibody_';

export interface AntibodyEventInput {
  classId: string;
  teamId: string;
  kind: AntibodyNewsKind;
  headline: string;
  tone?: BoardEventTone;
  /** §4.3 공식이 낸 상한 힌트(0~10 정수). 밴드 상한 안에서만 쓰인다. 0 이거나 없으면 변동 0. */
  changeHint?: number;
  /** 공개 칸만 — 티커 · 표적 이름 · 단계 · 등급 칩. **서열 · 점수 숫자 · 점수 내역 · 노트를 넣지 않는다**(§4.3 · §4.5). */
  public?: Record<string, string | number | boolean | null>;
  idemKey: string;
  gameDay?: number | null;
}

export interface AntibodyEventResult {
  created: boolean;
  /** `board_events.kind` check 가 아직 닫혀 있어 소식만 건너뛴 경우(점수 · 과금은 커밋된다). */
  skipped: boolean;
  event: BoardEventRecord | null;
  /** 커밋 뒤 꼭 부른다(처리기 뒷일 · 학급 WS). */
  after: () => void;
}

/** 소식 한 줄 — savepoint 안에서 공용 helper 를 부른다. check 위반(23514)이면 소식만 건너뛴다. */
export async function postAntibodyEvent(tx: Tx, deps: Deps, input: AntibodyEventInput): Promise<AntibodyEventResult> {
  if (!input.kind.startsWith(ANTIBODY_PREFIX)) throw new Error(`항체 소식 종류는 ${ANTIBODY_PREFIX} 로 시작해야 합니다(${input.kind}).`);
  const hint = Number.isFinite(input.changeHint) ? Math.max(0, Math.round(input.changeHint as number)) : 0;
  await tx.query('savepoint ab_event');
  try {
    const posted = await postBoardEvent(tx, deps, {
      classId: input.classId,
      teamId: input.teamId,
      kind: input.kind as BoardEventKind,
      headline: input.headline,
      tone: input.tone ?? 'normal',
      public: { ...(input.public ?? {}), changeHint: hint },
      idemKey: input.idemKey,
      gameDay: input.gameDay ?? null,
    });
    await tx.query('release savepoint ab_event');
    return { created: posted.created, skipped: false, event: posted.event, after: posted.after };
  } catch (error) {
    const code = (error as { code?: string }).code;
    // 23514 = check 위반(kind 가 아직 antibody_* 를 받지 않는 DB). 그 밖의 오류는 그대로 올린다.
    if (code !== '23514') {
      await tx.query('rollback to savepoint ab_event').catch(() => {});
      throw error;
    }
    await tx.query('rollback to savepoint ab_event');
    console.warn(`[antibody] board_events.kind 가 ${input.kind} 를 받지 않아 소식을 건너뜁니다(점수 · 과금은 그대로).`);
    return { created: false, skipped: true, event: null, after: () => {} };
  }
}

/**
 * 교사 정정 소식(#12) — 종류는 공용 `correction` 이라 `antibody_` 접두가 아니다. 그래서 전용 입구를 따로 둔다
 * (**`postBoardEvent` 를 부르는 곳은 이 파일 하나**라는 불변식을 지키려고).
 * 변동률은 교사가 정한 값을 그대로 쓰고 `antibody-fallback` 이 손대지 않도록 **여기서 바로 채운다**.
 */
export async function postAntibodyCorrection(
  tx: Tx,
  deps: Deps,
  input: { classId: string; teamId: string; headline: string; reason: string; changePct: number; idemKey: string; gameDay?: number | null },
): Promise<{ eventId: number; after: () => void }> {
  const posted = await postBoardEvent(tx, deps, {
    classId: input.classId,
    teamId: input.teamId,
    kind: 'correction',
    headline: input.headline,
    tone: input.changePct < 0 ? 'bad' : 'normal',
    public: { reason: input.reason, changeHint: Math.abs(Math.round(input.changePct)) },
    idemKey: input.idemKey,
    gameDay: input.gameDay ?? null,
  });
  // FMARKET('market')이 있으면 정정 변동률도 그쪽이 주인이다 — 두 번 적용하지 않는다.
  const already = await tx.query<{ change_pct: number | null }>('select change_pct from web.board_events where id = $1', [posted.event.id]);
  const taken = already.rows[0]?.change_pct !== null && already.rows[0]?.change_pct !== undefined;
  if (input.changePct !== 0 && !taken && !hasBoardEventHook('market')) {
    const before = await currentFundamental(tx, input.teamId);
    await tx.query('update web.board_events set change_pct = $2 where id = $1', [posted.event.id, input.changePct]);
    await recordValuation(tx, {
      teamId: input.teamId,
      classId: input.classId,
      priceUsd: applyChange(before, input.changePct),
      changePct: input.changePct,
      eventId: posted.event.id,
    });
  }
  return { eventId: posted.event.id, after: posted.after };
}

// ── 기업가치 ──

const floorUsd = (usd: number): number => Math.max(PRICE_FLOOR_USD, Math.round(usd * 10_000) / 10_000);

/** F ← F × (1 + Δ), 하한 $0.10 — game-rules `applyFundamentalChange` 와 같은 식(사본을 고치지 않으려고 여기 둔다). */
export const applyChange = (fundamentalUsd: number, changePct: number): number => floorUsd(fundamentalUsd * (1 + changePct / 100));

/** 시가총액(센트) — $1 = 100 센트 · 1,000,000주. */
export const marketCapCentsOf = (priceUsd: number): number => Math.round(priceUsd * SHARES_OUTSTANDING * 100);

/** 지금 기업가치(달러) — `web.valuations` 의 마지막 줄, 없으면 상장가. */
export async function currentFundamental(db: Queryable, teamId: string): Promise<number> {
  const result = await db.query<{ price_usd: string }>('select price_usd from web.valuations where team_id = $1 order by created_at desc, id desc limit 1', [teamId]);
  const row = result.rows[0];
  return row ? floorUsd(Number(row.price_usd)) : LISTING_PRICE_USD;
}

/** 기업가치 이력 한 줄 — 0007 공용 표. 같은 소식에 두 번 넣지 않게 `event_id` 로 확인한다. */
export async function recordValuation(
  tx: Queryable,
  input: { teamId: string; classId: string; priceUsd: number; changePct: number; eventId: number | null },
): Promise<void> {
  if (input.eventId !== null) {
    const dup = await tx.query('select 1 from web.valuations where event_id = $1', [input.eventId]);
    if (dup.rowCount) return;
  }
  await tx.query(
    'insert into web.valuations (team_id, class_id, event_id, price_usd, change_pct) values ($1, $2, $3, $4, $5)',
    [input.teamId, input.classId, input.eventId, floorUsd(input.priceUsd), input.changePct],
  );
}

/** 밴드 — `antibody_record` 전용 밴드가 생기면 그것, 아니면 tone 에 따라 `antibody` · `antibody_bad`. */
export function bandOf(kind: string, tone: BoardEventTone): MoveBand {
  const extra = MARKET_EXTRA_BANDS as Record<string, MoveBand | undefined>;
  return extra[kind] ?? (tone === 'bad' ? MARKET_EXTRA_BANDS.antibody_bad : MARKET_EXTRA_BANDS.antibody);
}

/** 변동률 — `min(changeHint, 밴드 상한)` 안에서 결정적으로. 힌트가 없거나 0 이면 0. */
export function changePctOf(kind: string, tone: BoardEventTone, changeHint: number): number {
  if (!Number.isFinite(changeHint) || changeHint <= 0) return 0;
  const band = bandOf(kind, tone);
  const capped = Math.min(changeHint, band.maxPct);
  return Math.round(Math.max(band.minPct, capped) * 10) / 10;
}

/**
 * FMARKET 이 아직 없을 때만 기업가치를 채우는 처리기. `registerAntibodyRoutes` 가 한 번 단다.
 * 'market' 이 등록돼 있으면 **아무것도 하지 않는다**(한 소식에 변동 두 번 금지).
 */
export function registerAntibodyFallback(): void {
  onBoardEvent('antibody-fallback', async (tx, event, deps) => {
    if (!event.kind.startsWith(ANTIBODY_PREFIX)) return;
    // 소식마다 본다 — 등록 순서와 무관하게 FMARKET 이 있으면 그쪽이 주인이다.
    if (hasBoardEventHook('market')) return;
    if (!event.teamId) return;
    // 이중 안전장치 — 이미 변동률이 채워진 소식은 건너뛴다.
    const already = await tx.query<{ change_pct: number | null }>('select change_pct from web.board_events where id = $1', [event.id]);
    if (already.rows[0]?.change_pct !== null && already.rows[0]?.change_pct !== undefined) return;

    const hint = Number((event.public as { changeHint?: unknown }).changeHint ?? 0);
    const pct = changePctOf(event.kind, event.tone, hint);
    await tx.query('update web.board_events set change_pct = $2 where id = $1', [event.id, pct]);
    if (pct === 0) return;
    const before = await currentFundamental(tx, event.teamId);
    await recordValuation(tx, { teamId: event.teamId, classId: event.classId, priceUsd: applyChange(before, pct), changePct: pct, eventId: event.id });
    void deps;
  });
}

// ── 과정 평가(§11.3.1) — FMARKET 함수가 있으면 부르고 없으면 건너뛴다 ──

export interface ProcessSignal {
  key: string;
  value: number;
  weight: number;
}

interface MarketProcessModule {
  postProcessScore?: (
    tx: Queryable,
    deps: Deps,
    input: { classId: string; teamId: string; stepId: string; components: readonly ProcessSignal[]; revisionId?: string; gameDay?: number | null },
  ) => Promise<unknown>;
}

/** `antibody_A1` ~ `antibody_A6` 의 과정 점수 — 단계가 처음 끝나는 순간 한 번. FMARKET 이 없으면 조용히 건너뛴다. */
export async function postAntibodyProcessScore(
  tx: Queryable,
  deps: Deps,
  input: { classId: string; teamId: string; stepId: string; components: readonly ProcessSignal[]; revisionId?: string; gameDay?: number | null },
): Promise<boolean> {
  const mod = (await import('../market.ts')) as unknown as MarketProcessModule;
  if (typeof mod.postProcessScore !== 'function') return false;
  await mod.postProcessScore(tx, deps, input);
  return true;
}

// ── 화면에 내려보내는 기업가치 ──

/** 학급 안 기업가치 순위 · 직전 변동 · 마지막 소식. */
export async function loadValuation(db: Queryable, teamId: string, classId: string): Promise<AntibodyValuationView> {
  const fundamentalUsd = await currentFundamental(db, teamId);
  const last = await db.query<{ change_pct: number | null }>(
    'select change_pct from web.valuations where team_id = $1 order by created_at desc, id desc limit 1',
    [teamId],
  );
  const ranks = await db.query<{ team_id: string; price_usd: string }>(
    `select t.id as team_id, coalesce((select v.price_usd from web.valuations v where v.team_id = t.id order by v.created_at desc, v.id desc limit 1), $2) as price_usd
       from web.teams t where t.class_id = $1 and t.registered_at is not null`,
    [classId, LISTING_PRICE_USD],
  );
  const sorted = [...ranks.rows].sort((a, b) => Number(b.price_usd) - Number(a.price_usd));
  const rank = Math.max(1, sorted.findIndex((r) => r.team_id === teamId) + 1);
  const event = await db.query<{ headline: string; headline_ai: string | null; change_pct: number | null; created_at: Date }>(
    `select headline, headline_ai, change_pct, created_at from web.board_events
      where team_id = $1 and kind like 'antibody\\_%' order by class_seq desc limit 1`,
    [teamId],
  );
  const e = event.rows[0];
  return {
    fundamentalUsd,
    priceUsd: fundamentalUsd,
    marketCapCents: marketCapCentsOf(fundamentalUsd),
    changePct: last.rows[0]?.change_pct ?? 0,
    rankMarketCap: rank,
    of: Math.max(1, sorted.length),
    ...(e
      ? {
          lastEvent: {
            headline: e.headline_ai ?? e.headline,
            ...(e.change_pct !== null ? { changePct: e.change_pct } : {}),
            at: e.created_at.toISOString(),
          },
        }
      : {}),
  };
}
