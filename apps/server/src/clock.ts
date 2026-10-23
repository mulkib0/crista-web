/**
 * 학급 게임 시계(설계 §8 '게임 시계' · §9) — crista `game-rules/clock.ts` 의 앵커 방식을 줄였다(수업 세션 · 월 처리 없음).
 *
 *   지금 게임 일 = clock_anchor_day + (일시정지가 아니면) clock_rate × (지금 − clock_anchor_at)[분]
 *
 * - 명령(일시정지 · 다시 · 배속)은 학급 줄을 잠그고 먼저 지금까지를 앵커로 접은 뒤 바꾼다(소급 없음 — UPDATE 의 오른쪽은 옛 값으로 계산된다).
 * - 주기 틱(5초)이 학급마다 지금 게임 일을 읽어 기능 모듈이 등록한 '만기' 처리기(`onGameDay`)를 부른다 —
 *   3.2 동물실험 28게임 일 · 대체 시험 2게임 일 · 3.3 IND 30게임 일 판정이 쓴다. 처리기는 자기 표에서 `ends_game_day <= 지금` 인 줄을
 *   멱등하게(상태 조건부 UPDATE) 끝내야 한다 — 서버가 여러 번 불러도, 재시작해도 같은 결과.
 * - 게임 일의 정수가 바뀌면 학급 채널 'clock' 을 방송한다(명령 때도).
 * - 학습 연구비의 '현실 10분 틱'은 게임 시계가 아니라 현실 시간이다 — `onRealtimeTick` 으로 같은 틱 루프에 건다(일시정지와 무관하게 돌지
 *   여부는 처리기가 `classes` 를 보고 정한다).
 */
import { CLOCK_RATE_MAX, CLOCK_RATE_MIN, type AccountView, type ClassClockView } from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { withTx, type Queryable } from './db.ts';
import { UUID_RE } from './guard.ts';
import { ApiError, badRequest, readJson, type Router } from './http.ts';
import type { RequestContext } from './routes.ts';

const TICK_MS = 5_000;

/** SQL 조각 — 학급 줄 별칭(`c`)의 지금 게임 일. 기능 모듈이 `ends_game_day <= ${gameDaySql('c')}` 처럼 쓴다. */
export const gameDaySql = (alias: string): string =>
  `(case when ${alias}.clock_paused then ${alias}.clock_anchor_day
         else ${alias}.clock_anchor_day + ${alias}.clock_rate * greatest(0, extract(epoch from (now() - ${alias}.clock_anchor_at)) / 60.0) end)`;

interface ClockRow {
  game_day: number;
  paused: boolean;
  rate: number;
  as_of: Date;
}

const CLOCK_SELECT = (where: string) =>
  `select ${gameDaySql('c')}::float8 as game_day, c.clock_paused as paused, c.clock_rate::float8 as rate, now() as as_of from web.classes c where ${where}`;

const viewOf = (row: ClockRow): ClassClockView => ({ gameDay: Number(row.game_day), paused: row.paused, rate: Number(row.rate), asOf: row.as_of.toISOString() });

/** 순수 계산(시험 · 화면과 같은 식). */
export function gameDayAt(clock: { anchorDay: number; anchorAtMs: number; rate: number; paused: boolean }, nowMs: number): number {
  if (clock.paused) return clock.anchorDay;
  return clock.anchorDay + clock.rate * Math.max(0, (nowMs - clock.anchorAtMs) / 60_000);
}

/** 학급 시계 보기. */
export async function loadClock(db: Queryable, classId: string): Promise<ClassClockView> {
  const result = await db.query<ClockRow>(CLOCK_SELECT('c.id = $1'), [classId]);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
  return viewOf(row);
}

/** 지금 게임 일(정수 내림 — 특허 출원일 · 소식 날짜). */
export async function currentGameDay(db: Queryable, classId: string): Promise<number> {
  return Math.floor((await loadClock(db, classId)).gameDay);
}

// ── 등록(기능 모듈이 register() 안에서 부른다) ──

export interface GameDayTick {
  nowMs: number;
  /** 시계가 있는 모든 학급(일시정지 포함 — 멈춘 학급은 게임 일이 늘지 않을 뿐). */
  classes: Array<{ classId: string; gameDay: number; paused: boolean }>;
}
export type GameDayHandler = (deps: Deps, tick: GameDayTick) => Promise<void>;
export type RealtimeHandler = (deps: Deps, nowMs: number) => Promise<void>;

const gameDayHandlers = new Map<string, GameDayHandler>();
const realtimeHandlers = new Map<string, { everyMs: number; handler: RealtimeHandler; lastAt: number }>();

/** 게임 일 만기 처리기 — 주기 틱(5초)마다 불린다. 이름이 같으면 바꿔 단다. */
export function onGameDay(name: string, handler: GameDayHandler): void {
  gameDayHandlers.set(name, handler);
}

/** 현실 시간 처리기(예: 학습 연구비 10분 틱 — everyMs 600_000). 첫 호출은 서버가 뜬 뒤 everyMs 가 지나서. */
export function onRealtimeTick(name: string, everyMs: number, handler: RealtimeHandler): void {
  if (!Number.isFinite(everyMs) || everyMs < TICK_MS) throw new Error(`onRealtimeTick(${name}) 주기는 ${TICK_MS}ms 이상이어야 합니다.`);
  realtimeHandlers.set(name, { everyMs, handler, lastAt: Date.now() });
}

export class ClockRunner {
  private readonly deps: Deps;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  /** 학급마다 마지막으로 방송한 정수 게임 일. */
  private readonly lastDay = new Map<string, number>();

  constructor(deps: Deps) {
    this.deps = deps;
  }

  start(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(nowMs: number = Date.now()): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const rows = await this.deps.db.query<ClockRow & { id: string }>(
        `select c.id, ${gameDaySql('c')}::float8 as game_day, c.clock_paused as paused, c.clock_rate::float8 as rate, now() as as_of from web.classes c`,
      );
      const tick: GameDayTick = { nowMs, classes: rows.rows.map((r) => ({ classId: r.id, gameDay: Number(r.game_day), paused: r.paused })) };
      for (const [name, handler] of gameDayHandlers) {
        try {
          await handler(this.deps, tick);
        } catch (error) {
          console.error(`[clock] 처리기 ${name} 오류:`, (error as Error).message);
        }
      }
      for (const [name, entry] of realtimeHandlers) {
        if (nowMs - entry.lastAt < entry.everyMs) continue;
        entry.lastAt = nowMs;
        try {
          await entry.handler(this.deps, nowMs);
        } catch (error) {
          console.error(`[clock] 현실 시간 처리기 ${name} 오류:`, (error as Error).message);
        }
      }
      for (const row of rows.rows) {
        const day = Math.floor(Number(row.game_day));
        if (this.lastDay.get(row.id) === day) continue;
        const first = !this.lastDay.has(row.id);
        this.lastDay.set(row.id, day);
        if (!first) this.deps.hub.broadcastClass(row.id, { type: 'clock', classId: row.id, clock: viewOf(row) });
      }
    } catch (error) {
      console.error('[clock] 틱 오류:', (error as Error).message);
    } finally {
      this.ticking = false;
    }
  }
}

// ── 경로 ──

async function canSee(db: Queryable, account: AccountView, classId: string): Promise<'teacher' | 'student'> {
  // 꼴이 틀린 id 는 DB 형 변환 오류(500) 대신 404.
  if (!UUID_RE.test(classId)) throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
  const result = await db.query<{ teacher: boolean; student: boolean }>(
    `select exists (select 1 from web.classes where id = $1 and teacher_id = $2) as teacher,
            exists (select 1 from web.members where class_id = $1 and user_id = $2 and role = 'student') as student`,
    [classId, account.userId],
  );
  const row = result.rows[0];
  if (row?.teacher) return 'teacher';
  if (row?.student) return 'student';
  throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
}

export function checkClockCommand(raw: unknown): { paused?: boolean; rate?: number } {
  const body = (raw ?? {}) as Record<string, unknown>;
  if (body.action === 'pause') return { paused: true };
  if (body.action === 'resume') return { paused: false };
  if (body.action === 'rate') {
    const rate = body.rate;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < CLOCK_RATE_MIN || rate > CLOCK_RATE_MAX) {
      throw badRequest(`배율은 ${CLOCK_RATE_MIN}~${CLOCK_RATE_MAX} 게임 일/분이에요.`);
    }
    return { rate: Math.round(rate * 100) / 100 };
  }
  throw badRequest('action 은 pause · resume · rate 중 하나예요.');
}

export async function applyClockCommand(deps: Deps, account: AccountView, classId: string, raw: unknown): Promise<ClassClockView> {
  if ((await canSee(deps.db, account, classId)) !== 'teacher') throw new ApiError(403, 'forbidden', '교사만 시계를 바꿀 수 있어요.');
  const change = checkClockCommand(raw);
  const view = await withTx(deps.db, async (tx) => {
    await tx.query('select id from web.classes where id = $1 for update', [classId]);
    // 오른쪽 식은 옛 값(배율 · 일시정지)으로 계산된다 — 지금까지를 접고 바꾼다.
    await tx.query(
      `update web.classes c set clock_anchor_day = ${gameDaySql('c')}, clock_anchor_at = now(),
              clock_paused = coalesce($2, c.clock_paused), clock_rate = coalesce($3, c.clock_rate)
        where c.id = $1`,
      [classId, change.paused ?? null, change.rate ?? null],
    );
    return loadClock(tx, classId);
  });
  deps.hub.broadcastClass(classId, { type: 'clock', classId, clock: view });
  return view;
}

/** routes.ts 가 부른다. */
export function registerClockRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  router.on('GET', '/api/classes/:classId/clock', async (ctx, p) => {
    await canSee(ctx.deps.db, account(ctx), p.classId!);
    return { clock: await loadClock(ctx.deps.db, p.classId!) };
  });
  router.on('POST', '/api/classes/:classId/clock', async (ctx, p) => ({ clock: await applyClockCommand(ctx.deps, account(ctx), p.classId!, await readJson(ctx.req)) }));
}
