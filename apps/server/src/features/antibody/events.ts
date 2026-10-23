/**
 * 항체 랩 소식 어댑터(항체 설계 §11.3) — **공용 원장에 합친다**.
 *
 * - 소식은 0007 `web.board_events`(`board-events.ts` 의 `postBoardEvent`)에 쌓는다. 항체 전용 소식 표를 만들지 않는다(§11.5).
 * - **다른 파일에서 `postBoardEvent` 를 직접 부르지 않는다** — 이 파일의 `postAntibodyEvent` · `postAntibodyCorrection` 만 쓴다.
 * - 기업가치 · 변동률은 **전부 기반 FMARKET 의 `onBoardEvent('market')`** 이 정한다. 이 파일은 `public.changeHint`(0~10 정수)만
 *   실어 보내고 밴드 상한(`MARKET_EXTRA_BANDS.antibody` · `antibody_bad` · `antibody_record`) 안에서 깎이는 것을 받아들인다.
 *   그래서 **이 파일에는 기업가치를 쓰는 코드가 없다** — 한 소식에 변동을 두 번 적용하지 않는 것이 불변식이다.
 * - 과정 평가도 기반의 `postProcessScore` 를 쓴다 — `process.ts` 한 곳으로 모았다(§11.3.1).
 *
 * 2026-10-24 트랙 1 기반 병합 때 걷어낸 임시 처리
 * - `board_events.kind` check 를 못 넘길 때 **savepoint 로 소식만 건너뛰던** 길 → 기반이 `antibody_%` 를 열었으므로 지웠다
 *   (`market.ts` 의 `OPEN_KIND_PATTERN` · 0020 이전 마이그레이션의 check). 이제 위반은 그대로 올라간다.
 * - `onBoardEvent('antibody-fallback')` 기업가치 대체 처리기와 그 밴드 · 가치 쓰기(`bandOf` · `changePctOf` · 가치 적재) → 지웠다.
 *   `'market'` 처리기가 실제로 있으므로 그 코드는 영원히 '아무것도 하지 않는' 길이었다.
 * - `postProcessScore` 를 동적 `import` 로 **있으면 부르고 없으면 건너뛰던** 길 → 바로 부른다.
 */
import {
  ANTIBODY_CHANGE_HINT_MAX,
  LISTING_PRICE_USD,
  PRICE_FLOOR_USD,
  SHARES_OUTSTANDING,
  type AntibodyNewsKind,
  type AntibodyValuationView,
  type BoardEventKind,
  type BoardEventTone,
} from '@crista-web/web-contract';
import { postBoardEvent, type BoardEventRecord } from '../../board-events.ts';
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
  event: BoardEventRecord;
  /** 커밋 뒤 꼭 부른다(처리기 뒷일 — FMARKET 기업가치 방송 · 학급 WS). */
  after: () => void;
}

/** 소식 한 줄 — 공용 helper 를 바로 부른다. 변동 폭 힌트는 `public.changeHint`(0~10 정수)로 싣는다. */
export async function postAntibodyEvent(tx: Tx, deps: Deps, input: AntibodyEventInput): Promise<AntibodyEventResult> {
  if (!input.kind.startsWith(ANTIBODY_PREFIX)) throw new Error(`항체 소식 종류는 ${ANTIBODY_PREFIX} 로 시작해야 합니다(${input.kind}).`);
  const hint = Number.isFinite(input.changeHint) ? Math.max(0, Math.min(ANTIBODY_CHANGE_HINT_MAX, Math.round(input.changeHint as number))) : 0;
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
  return { created: posted.created, event: posted.event, after: posted.after };
}

/**
 * 교사 정정 소식(#12) — 종류는 공용 `correction` 이라 `antibody_` 접두가 아니다. 그래서 전용 입구를 따로 둔다
 * (**`postBoardEvent` 를 부르는 곳은 이 파일 하나**라는 불변식을 지키려고).
 *
 * 변동률은 FMARKET 이 정한다 — 기반 `bandFor` 의 `case 'correction'` 이 **`public.changePct`** 를 읽어
 * `±CORRECTION_MAX_PCT` 안으로 가둔 뒤 그대로 적용한다. 그래서 칸 이름이 `changeHint` 가 아니라 `changePct` 다
 * (기반 `features/market.ts` 의 교사 공지 경로와 같은 모양 — 어긋나면 정정이 기업가치를 못 움직인다).
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
    public: { reason: input.reason, changePct: Math.round(input.changePct * 10) / 10, by: 'teacher' },
    idemKey: input.idemKey,
    gameDay: input.gameDay ?? null,
  });
  return { eventId: posted.event.id, after: posted.after };
}

// ── 기업가치 ──

const floorUsd = (usd: number): number => Math.max(PRICE_FLOOR_USD, Math.round(usd * 10_000) / 10_000);

/** 기업가치(센트) — $1 = 100 센트 · 1,000,000주. 학생에게 보이는 이름은 '기업가치 · 기업가치 순위'다(§11.4.2 사용자 결정). 칸 이름(`market_cap_*`)은 공용 계약 것이라 그대로 둔다. */
export const marketCapCentsOf = (priceUsd: number): number => Math.round(priceUsd * SHARES_OUTSTANDING * 100);

/** 지금 기업가치(달러) — `web.valuations` 의 마지막 줄, 없으면 상장가. */
export async function currentFundamental(db: Queryable, teamId: string): Promise<number> {
  const result = await db.query<{ price_usd: string }>('select price_usd from web.valuations where team_id = $1 order by created_at desc, id desc limit 1', [teamId]);
  const row = result.rows[0];
  return row ? floorUsd(Number(row.price_usd)) : LISTING_PRICE_USD;
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
