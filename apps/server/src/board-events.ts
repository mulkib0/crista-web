/**
 * 전광판 소식 넣기(설계 §5.3 · §7.3 '전광판 공개 소식 UQ(class_id, class_seq)') — 기반이 시그니처를 정한 공용 helper.
 *
 * 왜 기반에 두나: 3.1 특허 등록(F31) · 3.2 전임상 완료(F32) · 3.3 IND 승인(F33) · 학습 · 투자 소식(FLEARN)이 모두 소식을 내는데,
 * 전광판(FMARKET)과 같은 때 병렬로 만들어진다. 그래서 '소식 한 줄 넣기'는 여기서 지금 동작하게 두고,
 * FMARKET 은 이 파일을 고치지 않고 `onBoardEvent` 로 기업가치 · 변동률(crista `PIPELINE_ANALYST_BANDS`) · 헤드라인 LLM 을 붙인다.
 *
 * - 호출자의 트랜잭션 안에서 부른다(과금 · 등재와 같은 커밋). 커밋한 **뒤** 돌려받은 `after()` 를 꼭 부른다 — 처리기의 뒷일 · 학급 WS 'board.event'.
 * - 학급 안 순서 `class_seq` 는 classes 행 잠금(`for no key update` — 그 학급을 가리키는 다른 표의 삽입은 막지 않는다) 안에서 max + 1.
 *   잠금 순서는 늘 **teams → classes**(ledger.ts `charge` 가 teams 를 먼저 잠근다 · 특허 class_seq 도 같은 classes 잠금).
 * - 같은 일은 한 번: `idemKey`(예: `patent:<특허 id>`) — 이미 있으면 새로 넣지 않고 그 줄을 돌려준다(`created: false`, 처리기 · 방송 없음).
 * - 공개 범위(§5.3): 이름 · 티커 · 단계 · 통과/보류 · 질환 · 코드명 · 기업가치만. 후보 SMILES · 물성 · 점수 · 노트는 `public` 에도 넣지 않는다.
 * - 규칙 문구(`headline`)가 늘 먼저 흐른다. 다듬은 줄(`headline_ai`)은 FMARKET 처리기가 나중에 채운다(실패하면 비운 채).
 */
import { teamChannel, type BoardEventKind, type BoardEventTone, type BoardEventView } from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import type { Queryable } from './db.ts';

export interface BoardEventInput {
  classId: string;
  /** 학급 공지 · 정정은 null. */
  teamId: string | null;
  kind: BoardEventKind;
  /** 규칙 문구(1~140자) — 예: `◆ SEUM 물질특허 등록 — SEUM-102 · 알츠하이머 후보`. */
  headline: string;
  tone?: BoardEventTone;
  /** 공개 칸만(티커 · 단계 · 코드명 · 질환 …). */
  public?: Record<string, string | number | boolean | null>;
  /** 같은 일로 두 번 나지 않게(1~120자). 비우면 늘 새 줄. */
  idemKey?: string | null;
  /** 게임 날짜(clock.ts `currentGameDay`). */
  gameDay?: number | null;
}

export interface BoardEventRecord {
  id: number;
  classId: string;
  classSeq: number;
  teamId: string | null;
  kind: BoardEventKind;
  headline: string;
  tone: BoardEventTone;
  public: Record<string, unknown>;
  idemKey: string | null;
  gameDay: number | null;
  createdAt: Date;
}

/**
 * 소식 처리기 — 넣은 트랜잭션 안에서 돈다(예: FMARKET 의 기업가치 줄 · board_events.change_pct 갱신).
 * 돌려준 함수는 커밋 뒤 실행(예: 헤드라인 LLM 다듬기 · 'market' 갱신 방송). 던지면 소식 넣기 전체가 되돌려진다.
 */
export type BoardEventHook = (tx: Queryable, event: BoardEventRecord, deps: Deps) => Promise<void | (() => void)>;

const hooks = new Map<string, BoardEventHook>();

/** 기능 모듈이 register() 안에서 단다 — 이름마다 하나(다시 달면 바꾼다). FMARKET: `onBoardEvent('market', …)`. */
export function onBoardEvent(name: string, hook: BoardEventHook): void {
  hooks.set(name, hook);
}

/** 그 이름의 처리기가 달려 있나 — 항체 랩의 'antibody-fallback' 이 'market' 이 없을 때만 기업가치를 채우려고 본다(한 소식에 변동 두 번 방지). */
export function hasBoardEventHook(name: string): boolean {
  return hooks.has(name);
}

interface EventRow {
  id: string;
  class_id: string;
  class_seq: number;
  team_id: string | null;
  kind: BoardEventKind;
  headline: string;
  tone: BoardEventTone;
  public: Record<string, unknown>;
  idem_key: string | null;
  game_day: number | null;
  created_at: Date;
}

const toRecord = (r: EventRow): BoardEventRecord => ({
  id: Number(r.id),
  classId: r.class_id,
  classSeq: r.class_seq,
  teamId: r.team_id,
  kind: r.kind,
  headline: r.headline,
  tone: r.tone,
  public: r.public,
  idemKey: r.idem_key,
  gameDay: r.game_day,
  createdAt: r.created_at,
});

const EVENT_COLUMNS = 'id, class_id, class_seq, team_id, kind, headline, tone, public, idem_key, game_day, created_at';

/**
 * 소식 한 줄 넣기 — 트랜잭션 안에서. 커밋 뒤 `after()` 를 부른다(처리기 뒷일 → 학급 WS 'board.event').
 *
 *   const { after } = await withTx(deps.db, async (tx) => { …; return postBoardEvent(tx, deps, { classId, teamId, kind: 'patent', headline, idemKey: `patent:${id}` }); });
 *   after();
 */
export async function postBoardEvent(
  tx: Queryable,
  deps: Deps,
  input: BoardEventInput,
): Promise<{ created: boolean; event: BoardEventRecord; after: () => void }> {
  const headline = input.headline.trim();
  if (headline.length < 1 || [...headline].length > 140) throw new Error(`전광판 소식 문구는 1~140자여야 합니다(${input.kind}).`);
  const idemKey = input.idemKey?.trim() || null;
  if (idemKey && idemKey.length > 120) throw new Error('전광판 소식 idemKey 는 120자 이하여야 합니다.');

  await tx.query('select 1 from web.classes where id = $1 for no key update', [input.classId]);
  if (idemKey) {
    const existing = await tx.query<EventRow>(`select ${EVENT_COLUMNS} from web.board_events where class_id = $1 and idem_key = $2`, [input.classId, idemKey]);
    if (existing.rows[0]) return { created: false, event: toRecord(existing.rows[0]), after: () => {} };
  }
  const inserted = await tx.query<EventRow>(
    `insert into web.board_events (class_id, class_seq, team_id, kind, headline, tone, public, idem_key, game_day)
     values ($1, coalesce((select max(class_seq) from web.board_events where class_id = $1), 0) + 1, $2, $3, $4, $5, $6, $7, $8)
     returning ${EVENT_COLUMNS}`,
    [input.classId, input.teamId, input.kind, headline, input.tone ?? 'normal', JSON.stringify(input.public ?? {}), idemKey, input.gameDay ?? null],
  );
  const event = toRecord(inserted.rows[0]!);

  const afters: Array<() => void> = [];
  for (const hook of hooks.values()) {
    const next = await hook(tx, event, deps);
    if (typeof next === 'function') afters.push(next);
  }

  const after = (): void => {
    for (const fn of afters) {
      try {
        fn();
      } catch (error) {
        console.error('[board] 소식 처리기 뒷일 실패:', (error as Error).message);
      }
    }
    void loadBoardEventView(deps.db, event.id)
      .then((view) => {
        if (!view) return;
        deps.hub.broadcastClass(event.classId, { type: 'board.event', classId: event.classId, event: view });
        // 그 모둠 화면은 기업가치 · 순위가 바뀌었을 수 있어 다시 읽는다.
        if (event.teamId) deps.hub.publish(teamChannel(event.teamId), { type: 'board.changed', teamId: event.teamId, reason: `board:${event.kind}` });
      })
      .catch((error: Error) => console.error('[board] 소식 방송 실패:', error.message));
  };
  return { created: true, event, after };
}

/** LED 띠 한 줄(공개 정보만) — 다듬은 줄이 있으면 그것('AI 생성'). */
export async function loadBoardEventView(db: Queryable, id: number): Promise<BoardEventView | null> {
  const result = await db.query<{
    id: string;
    class_seq: number;
    team_id: string | null;
    ticker: string | null;
    kind: BoardEventKind;
    headline: string;
    headline_ai: string | null;
    change_pct: number | null;
    tone: BoardEventTone;
    game_day: number | null;
    created_at: Date;
  }>(
    `select e.id, e.class_seq, e.team_id, t.ticker, e.kind, e.headline, e.headline_ai, e.change_pct, e.tone, e.game_day, e.created_at
       from web.board_events e left join web.teams t on t.id = e.team_id
      where e.id = $1`,
    [id],
  );
  const r = result.rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    classSeq: r.class_seq,
    teamId: r.team_id,
    ticker: r.ticker,
    kind: r.kind,
    headline: r.headline_ai ?? r.headline,
    aiHeadline: r.headline_ai !== null,
    changePct: r.change_pct,
    tone: r.tone,
    gameDay: r.game_day,
    createdAt: r.created_at.toISOString(),
  };
}
