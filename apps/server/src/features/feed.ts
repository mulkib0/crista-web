/**
 * 모둠 대화방(시안 06 '채널 목록') — 대화(Slack 꼴) · 행적(누가 무엇을 했나) · 채널마다 읽은 위치.
 *
 * 표: web.team_feed_heads · team_feed · team_feed_reads(0019). 규격: packages/web-contract `feed.ts`.
 *
 * 행적은 어디서 오나 — 기능 모듈을 하나하나 고치지 않고 두 곳에서 받는다.
 *   1. 모둠 채널 소식(hub `onTeamMessage`) — 기능이 이미 보내는 'board.changed'(이유 · 한 사람) · 'screen.changed' · 'doc.reviewed' ·
 *      'learn.graded' 를 `describeTeamMessage` 가 문장으로 바꾼다. 소식은 커밋 뒤에 나가므로 행적도 커밋 뒤 따로 쓴다(실패하면 로그만 —
 *      행적은 이야기일 뿐이고 원래 기록은 각 기능 표에 있다). 모르는 이유는 남기지 않는다(새 기능은 `REASONS` 에 한 줄을 더한다).
 *   2. 전광판 소식(`onBoardEvent('team-feed')`) — 그 모둠 소식이면 같은 트랜잭션 안에서 규칙 문구를 행적으로 넣는다(세이브포인트 —
 *      행적이 실패해도 소식은 그대로). 그래서 'board:<종류>' 이유의 'board.changed' 는 1번에서 건너뛴다.
 *
 * 쓰기 규칙
 *   - 순번은 team_feed_heads 행 잠금 안에서 +1(순번 순서 = 커밋 순서). 이 잠금은 잠금 순서의 맨 끝이다(teams · classes 뒤에 잡아도 된다).
 *   - 같은 사람(또는 시스템)이 같은 행적을 10분 안에 잇달아 하고 그 줄이 모둠의 마지막 줄이면 새 줄 대신 repeat 를 늘린다(노트 고치기 등).
 *   - 대화는 사람마다 1분에 FEED_SEND_PER_MIN 개 · 같은 clientId 는 한 줄 · @이름은 모둠원만 · 자기 대화만 지운다(본문은 남기고 화면에 안 보낸다).
 *   - 읽은 위치는 앞으로만(greatest). 보기(행적만 · 대화만 · 나를 부른 글)는 읽은 위치를 옮기지 않는다.
 */
import {
  DOC_KIND_LABEL,
  FEED_BODY_MAX,
  FEED_PAGE,
  FEED_PAGE_MAX,
  FEED_SEND_PER_MIN,
  findMentions,
  formatCrista,
  isFeedChannel,
  isFeedView,
  NOTE_SECTIONS,
  SCREEN_COPY,
  STEP_IDS,
  STEP_META,
  teamChannel,
  type DocKind,
  type FeedChannelView,
  type FeedItemView,
  type FeedMemberView,
  type FeedPostResponse,
  type FeedReadResponse,
  type FeedResponse,
  type FeedTone,
  type FeedView,
  type NoteSection,
  type ScreenAgenda,
  type ServerMessage,
  type StepId,
} from '@crista-web/web-contract';
import { onBoardEvent, type BoardEventRecord } from '../board-events.ts';
import { gameDaySql } from '../clock.ts';
import type { Deps } from '../context.ts';
import { withTx, type Queryable } from '../db.ts';
import { requireAccount } from '../guard.ts';
import { ApiError, readJson, type Router } from '../http.ts';
import { teamMember } from '../pipeline.ts';
import { WindowLimiter } from '../rate-limit.ts';
import type { RequestContext } from '../routes.ts';

// ── 1. 소식 → 행적 문장 ──

/** 행적 초안 — 이름은 actorName 으로 따로(화면이 '<이름> <문장>' 으로 붙인다). */
export interface ActivityDraft {
  code: string;
  stepId: string | null;
  /** 한 사람이 한 일이면 그 이름, 시스템 줄이면 null. */
  actorName: string | null;
  body: string;
  tone?: FeedTone;
  /** 잇달아 하면 한 줄로 묶나. */
  coalesce?: boolean;
}

const isStep = (v: string | undefined): v is StepId => !!v && (STEP_IDS as readonly string[]).includes(v);
const stepTitle = (v: string) => (isStep(v) ? STEP_META[v].title : v);
const NOTE_MARK = ['①', '②', '③'];
const noteMark = (section: string) => NOTE_MARK[NOTE_SECTIONS.indexOf(section as NoteSection)] ?? '';
const agendaLabel = (a: string | undefined) => (a && a in SCREEN_COPY.agenda ? SCREEN_COPY.agenda[a as ScreenAgenda].label : '기준');

/** 이유 → [단계, 문장, 묶기]. 사람이 한 일(byName 있음)만 남기는 줄은 `person: true`. */
interface ReasonRule {
  re: RegExp;
  step: string | null | ((m: RegExpMatchArray) => string | null);
  body: string | ((m: RegExpMatchArray) => string);
  person?: boolean;
  coalesce?: boolean;
  tone?: FeedTone;
}

const REASONS: ReasonRule[] = [
  // 1.1 · 1.2 · 노트(pipeline.ts) — 찜은 1.2 분자 쇼핑에서 넣고 뺀다.
  { re: /^pick$/, step: '1.1', body: '표적 후보에 표를 줬어요', person: true, coalesce: true },
  { re: /^target$/, step: '1.1', body: '모둠 표적을 정했어요', person: true },
  { re: /^claim$/, step: '1.2', body: '찜한 분자를 바꿨어요', person: true, coalesce: true },
  { re: /^note:([a-z0-9.]+):(\w+)$/, step: (m) => m[1]!, body: (m) => `연구 노트 ${noteMark(m[2]!)} 칸을 고쳤어요`.replace('  ', ' '), person: true, coalesce: true },
  // 유료 작업(jobs.ts) — 시작은 사람, 끝은 시스템.
  { re: /^job:([a-z0-9.]+)$/, step: (m) => m[1]!, body: (m) => `${stepTitle(m[1]!)} 작업을 시작했어요`, person: true },
  { re: /^job\.succeeded:([a-z0-9.]+)$/, step: (m) => m[1]!, body: (m) => `${stepTitle(m[1]!)} 작업이 끝났어요`, tone: 'good' },
  { re: /^job\.failed:([a-z0-9.]+)$/, step: (m) => m[1]!, body: (m) => `${stepTitle(m[1]!)} 작업이 실패해 연구비를 돌려받았어요`, tone: 'bad' },
  // 2.1 · 2.2(selection.ts) · 리드(preclinical.ts)
  { re: /^selection:dock$/, step: '2.1', body: '도킹할 분자를 바꿨어요', person: true, coalesce: true },
  { re: /^selection:lead$/, step: '2.2', body: '특허 후보를 바꿨어요', person: true, coalesce: true },
  { re: /^lead$/, step: '3.2', body: '주력 리드를 정했어요', person: true },
  // 3.1 특허
  { re: /^patent:created$/, step: '3.1', body: '특허 출원서를 만들었어요', person: true },
  { re: /^patent:code$/, step: '3.1', body: '후보 코드명을 정했어요', person: true },
  { re: /^patent:section:/, step: '3.1', body: '특허 출원서를 고쳤어요', person: true, coalesce: true },
  { re: /^patent:review$/, step: '3.1', body: '특허 출원서를 심사에 냈어요', person: true },
  { re: /^patent:abandoned$/, step: '3.1', body: '특허를 포기했어요', person: true },
  // 3.2 전임상
  { re: /^preclinical:ethics$/, step: '3.2', body: '동물실험 윤리 교육을 마쳤어요', person: true },
  { re: /^preclinical:protocol$/, step: '3.2', body: '동물실험계획서를 만들었어요', person: true },
  { re: /^preclinical:section:/, step: '3.2', body: '동물실험계획서를 고쳤어요', person: true, coalesce: true },
  { re: /^preclinical:review$/, step: '3.2', body: '동물실험계획서를 심사에 냈어요', person: true },
  { re: /^preclinical:calc$/, step: '3.2', body: '투여 용량을 계산했어요', person: true, coalesce: true },
  { re: /^preclinical:reflection$/, step: '3.2', body: '실험 돌아보기를 썼어요', person: true, coalesce: true },
  // 3.3 IND
  { re: /^ind:created$/, step: '3.3', body: 'IND 신청서를 만들었어요', person: true },
  { re: /^ind:plan$/, step: '3.3', body: '임상 계획을 고쳤어요', person: true, coalesce: true },
  { re: /^ind:section:/, step: '3.3', body: 'IND 신청서를 고쳤어요', person: true, coalesce: true },
  { re: /^ind:review$/, step: '3.3', body: 'IND 신청서를 심사에 냈어요', person: true },
  { re: /^ind:submitted$/, step: '3.3', body: 'IND 신청서를 냈어요', person: true },
  // 4.1 임상
  { re: /^clinical:open$/, step: '4.1', body: '임상시험을 열었어요', person: true },
  { re: /^clinical:tier$/, step: '4.1', body: '임상 규모를 정했어요', person: true, coalesce: true },
  { re: /^clinical:start$/, step: '4.1', body: '임상시험을 시작했어요', person: true },
  { re: /^clinical:bounty$/, step: '4.1', body: '실패 분석을 냈어요', person: true },
  // 4.2 허가
  { re: /^approval:brand$/, step: '4.2', body: '제품 이름을 정했어요', person: true },
  { re: /^approval:package$/, step: '4.2', body: '포장 · 설명서를 고쳤어요', person: true, coalesce: true },
  { re: /^approval:section:/, step: '4.2', body: '허가 신청서를 고쳤어요', person: true, coalesce: true },
  { re: /^approval:review$/, step: '4.2', body: '허가 신청서를 심사에 냈어요', person: true },
  { re: /^approval:submitted$/, step: '4.2', body: '허가 신청서를 냈어요', person: true },
  // 학습 연구비
  { re: /^learn:note:([a-z0-9.]+)$/, step: (m) => m[1]!, body: '연구 노트 평가를 신청했어요', person: true },
  { re: /^learn:pitch:/, step: null, body: '투자 피치를 냈어요', person: true },
  { re: /^learn:appeal$/, step: null, body: '채점에 이의를 냈어요', person: true },
];

const SCREEN_BODY: Record<string, (agenda: string) => string> = {
  briefing: () => '미션 브리핑에 답했어요',
  proposal: (a) => `${a} 기준을 제안했어요`,
  vote: (a) => `${a} 안건에 투표했어요`,
  agreed: (a) => `${a} 기준을 합의로 정했어요`,
  reopen: (a) => `${a} 안건을 다시 논의하기로 했어요`,
};

const DOC_STEP: Record<DocKind, string> = { patent: '3.1', iacuc: '3.2', ind: '3.3', nda: '4.2' };
const VERDICT: Record<string, [string, FeedTone]> = { pass: ['통과', 'good'], revise: ['보완 요청', 'bad'], reject: ['반려', 'bad'] };
const LEARN_TARGET: Record<string, string> = { answer: '학습 문항', note: '연구 노트', pitch: '투자 피치' };

/** 모둠 채널 소식 하나 → 행적 초안(남기지 않을 소식이면 null). 순수 함수 — 단위 시험이 있다. */
export function describeTeamMessage(m: ServerMessage): ActivityDraft | null {
  switch (m.type) {
    case 'board.changed': {
      const by = m.byName?.trim() || null;
      for (const rule of REASONS) {
        const hit = m.reason.match(rule.re);
        if (!hit) continue;
        if (rule.person && !by) return null;
        const step = typeof rule.step === 'function' ? rule.step(hit) : rule.step;
        const body = typeof rule.body === 'function' ? rule.body(hit) : rule.body;
        return { code: m.reason, stepId: step, actorName: rule.person ? by : null, body, tone: rule.tone ?? 'normal', coalesce: rule.coalesce ?? false };
      }
      return null;
    }
    case 'screen.changed': {
      const make = SCREEN_BODY[m.reason];
      if (!make || !m.byName) return null;
      return {
        code: `screen:${m.reason}${m.agenda ? `:${m.agenda}` : ''}`,
        stepId: '1.2',
        actorName: m.byName,
        body: make(agendaLabel(m.agenda)),
        tone: m.reason === 'agreed' ? 'good' : 'normal',
        coalesce: m.reason === 'briefing' || m.reason === 'vote',
      };
    }
    case 'doc.reviewed': {
      const v = VERDICT[m.verdict];
      if (!v) return null;
      return { code: `review:${m.kind}:${m.verdict}`, stepId: DOC_STEP[m.kind], actorName: null, body: `${DOC_KIND_LABEL[m.kind]} 심사 결과 — ${v[0]}`, tone: v[1] };
    }
    case 'learn.graded': {
      const what = LEARN_TARGET[m.targetType] ?? '학습';
      const score = m.score === null ? '' : ` ${Math.round(m.score)}점 ·`;
      return { code: `learn:graded:${m.targetType}`, stepId: null, actorName: null, body: `${what} 채점 —${score} ${formatCrista(m.crista)} 받았어요`, tone: m.crista > 0 ? 'good' : 'normal', coalesce: m.targetType === 'answer' };
    }
    default:
      return null;
  }
}

// ── 2. 줄 쓰기 ──

interface FeedRow {
  id: string;
  team_seq: string;
  kind: 'chat' | 'act';
  code: string;
  actor_id: string | null;
  actor_name: string | null;
  step_id: string | null;
  body: string;
  tone: FeedTone;
  mentions: string[];
  repeat: number;
  client_id: string | null;
  game_day: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, team_seq, kind, code, actor_id, actor_name, step_id, body, tone, mentions, repeat, client_id, game_day, deleted_at, created_at, updated_at';
const COALESCE_MIN = 10;

export const toFeedItem = (r: FeedRow): FeedItemView => ({
  id: Number(r.id),
  seq: Number(r.team_seq),
  kind: r.kind,
  code: r.code,
  actorId: r.actor_id,
  actorName: r.actor_name,
  stepId: r.step_id,
  // 지운 대화는 본문을 보내지 않는다(DB 에는 남는다 — 교사 확인용).
  body: r.deleted_at ? '' : r.body,
  tone: r.tone,
  mentions: r.mentions,
  repeat: r.repeat,
  gameDay: r.game_day,
  deleted: r.deleted_at !== null,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
  clientId: r.client_id,
});

export interface FeedInsert {
  teamId: string;
  kind: 'chat' | 'act';
  code: string;
  actorId: string | null;
  actorName: string | null;
  stepId: string | null;
  body: string;
  tone?: FeedTone;
  mentions?: string[];
  clientId?: string | null;
  coalesce?: boolean;
  gameDay?: number | null;
}

/** 순번 머리를 잠그고 마지막 순번을 돌려준다(행이 없으면 만든다). */
async function lockHead(tx: Queryable, teamId: string): Promise<number> {
  await tx.query('insert into web.team_feed_heads (team_id) values ($1) on conflict do nothing', [teamId]);
  const head = await tx.query<{ last_seq: string }>('select last_seq from web.team_feed_heads where team_id = $1 for update', [teamId]);
  return Number(head.rows[0]!.last_seq);
}

/**
 * 한 줄 쓰기 — 트랜잭션 안에서. 'posted'(새 줄) · 'updated'(마지막 줄 repeat +1) · 'same'(같은 clientId 가 이미 있음 — 알리지 않음).
 * 커밋 뒤 `publishFeed` 로 모둠 채널에 알린다.
 */
export async function writeFeedItem(tx: Queryable, input: FeedInsert): Promise<{ item: FeedItemView; change: 'posted' | 'updated' | 'same' }> {
  const last = await lockHead(tx, input.teamId);
  if (input.clientId) {
    const same = await tx.query<FeedRow>(`select ${COLUMNS} from web.team_feed where team_id = $1 and actor_id = $2 and client_id = $3`, [input.teamId, input.actorId, input.clientId]);
    if (same.rows[0]) return { item: toFeedItem(same.rows[0]), change: 'same' };
  }
  if (input.coalesce && last > 0) {
    const bumped = await tx.query<FeedRow>(
      `update web.team_feed set repeat = repeat + 1, body = $4, updated_at = now()
        where team_id = $1 and team_seq = $2 and kind = 'act' and code = $3 and actor_name is not distinct from $5
          and deleted_at is null and updated_at > now() - make_interval(mins => ${COALESCE_MIN})
       returning ${COLUMNS}`,
      [input.teamId, last, input.code, input.body, input.actorName],
    );
    if (bumped.rows[0]) return { item: toFeedItem(bumped.rows[0]), change: 'updated' };
  }
  const seq = last + 1;
  await tx.query('update web.team_feed_heads set last_seq = $2 where team_id = $1', [input.teamId, seq]);
  const inserted = await tx.query<FeedRow>(
    `insert into web.team_feed (team_id, team_seq, kind, code, actor_id, actor_name, step_id, body, tone, mentions, client_id, game_day)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             coalesce($12::float8, (select ${gameDaySql('c')} from web.teams t join web.classes c on c.id = t.class_id where t.id = $1)))
     returning ${COLUMNS}`,
    [input.teamId, seq, input.kind, input.code, input.actorId, input.actorName, input.stepId, input.body, input.tone ?? 'normal', input.mentions ?? [], input.clientId ?? null, input.gameDay ?? null],
  );
  return { item: toFeedItem(inserted.rows[0]!), change: 'posted' };
}

export function publishFeed(deps: Pick<Deps, 'hub'>, teamId: string, out: { item: FeedItemView; change: 'posted' | 'updated' | 'same' }): void {
  if (out.change === 'same') return;
  deps.hub.publish(teamChannel(teamId), { type: out.change === 'posted' ? 'feed.posted' : 'feed.updated', teamId, item: out.item });
}

/** 이름 → 그 모둠의 계정(같은 이름이 둘이면 null — 이름만 남긴다). */
async function actorIdOf(db: Queryable, teamId: string, name: string | null): Promise<string | null> {
  if (!name) return null;
  const found = await db.query<{ user_id: string }>(
    `select m.user_id from web.members m join web.accounts a on a.user_id = m.user_id where m.team_id = $1 and m.role = 'student' and a.display_name = $2 limit 2`,
    [teamId, name],
  );
  return found.rows.length === 1 ? found.rows[0]!.user_id : null;
}

/** 소식에서 만든 행적 하나 남기기(커밋 뒤 · 실패는 로그만). */
export async function recordActivity(deps: Pick<Deps, 'db' | 'hub'>, teamId: string, draft: ActivityDraft): Promise<FeedItemView | null> {
  const actorId = await actorIdOf(deps.db, teamId, draft.actorName);
  const out = await withTx(deps.db, (tx) =>
    writeFeedItem(tx, {
      teamId,
      kind: 'act',
      code: draft.code.slice(0, 80),
      actorId,
      actorName: draft.actorName ? draft.actorName.slice(0, 40) : null,
      stepId: draft.stepId,
      body: draft.body.slice(0, 600),
      tone: draft.tone ?? 'normal',
      coalesce: draft.coalesce ?? false,
    }),
  );
  publishFeed(deps, teamId, out);
  return out.item;
}

/**
 * 서버가 뜰 때 한 번 — 모둠 채널 소식을 행적으로. 같은 모둠의 소식은 들어온 순서대로 쓴다(앞 쓰기가 끝나야 다음).
 * 끄는 함수를 돌려준다(점검 스크립트).
 */
export function bindTeamFeed(deps: Pick<Deps, 'db' | 'hub'>): () => void {
  const queues = new Map<string, Promise<unknown>>();
  return deps.hub.onTeamMessage((teamId, message) => {
    if (message.type === 'board.changed' && message.reason.startsWith('board:')) return; // 전광판 소식은 2번 처리기가 남긴다.
    const draft = describeTeamMessage(message);
    if (!draft) return;
    const prev = queues.get(teamId) ?? Promise.resolve();
    const next = prev
      .then(() => recordActivity(deps, teamId, draft))
      .catch((error: Error) => console.error(`[feed] 행적 기록 실패(${draft.code}):`, error.message))
      .finally(() => {
        if (queues.get(teamId) === next) queues.delete(teamId);
      });
    queues.set(teamId, next);
  });
}

/** 전광판 소식 → 그 모둠 행적(같은 트랜잭션 · 세이브포인트). */
async function boardEventToFeed(tx: Queryable, event: BoardEventRecord, deps: Deps): Promise<void | (() => void)> {
  if (!event.teamId) return;
  await tx.query('savepoint team_feed');
  try {
    const out = await writeFeedItem(tx, {
      teamId: event.teamId,
      kind: 'act',
      code: `board:${event.kind}`.slice(0, 80),
      actorId: null,
      actorName: null,
      stepId: typeof event.public.step === 'string' ? event.public.step : typeof event.public.stage === 'string' ? event.public.stage : null,
      body: event.headline.slice(0, 600),
      tone: event.tone === 'bad' ? 'bad' : event.tone === 'rank' ? 'normal' : 'good',
      gameDay: event.gameDay,
    });
    await tx.query('release savepoint team_feed');
    const teamId = event.teamId;
    return () => publishFeed(deps, teamId, out);
  } catch (error) {
    await tx.query('rollback to savepoint team_feed');
    console.error('[feed] 전광판 소식 행적 실패:', (error as Error).message);
  }
}

// ── 3. 읽기 ──

interface Who {
  userId: string;
  teamId: string;
}

async function who(deps: Deps, ctx: RequestContext): Promise<Who & { displayName: string }> {
  const account = requireAccount(ctx);
  const member = await teamMember(deps.db, account);
  return { userId: account.userId, teamId: member.teamId, displayName: account.displayName };
}

async function readsOf(db: Queryable, w: Who): Promise<Record<string, number>> {
  const rows = await db.query<{ channel: string; last_seq: string }>('select channel, last_seq from web.team_feed_reads where user_id = $1 and team_id = $2', [w.userId, w.teamId]);
  return Object.fromEntries(rows.rows.map((r) => [r.channel, Number(r.last_seq)]));
}

/** 채널 요약 — 'all' 이 맨 앞. 안 읽음 규칙은 web-contract `isFeedUnread` 와 같다. */
async function summary(db: Queryable, w: Who): Promise<{ channels: FeedChannelView[]; mentionUnread: number; reads: Record<string, number>; lastSeq: number }> {
  const reads = await readsOf(db, w);
  const rows = await db.query<{ ch: string | null; total: string; unread: string; mention: string; last: string }>(
    `select f.step_id as ch, count(*)::text as total,
            count(*) filter (where u.unread)::text as unread,
            count(*) filter (where u.unread and $2 = any(f.mentions))::text as mention,
            max(f.team_seq)::text as last
       from web.team_feed f
       cross join lateral (
         select f.actor_id is distinct from $2 and f.deleted_at is null
                and f.team_seq > greatest(coalesce(($3::jsonb ->> 'all')::bigint, 0), coalesce(($3::jsonb ->> f.step_id)::bigint, 0)) as unread
       ) u
      where f.team_id = $1
      group by f.step_id`,
    [w.teamId, w.userId, JSON.stringify(reads)],
  );
  let total = 0;
  let unread = 0;
  let mention = 0;
  let last = 0;
  const steps: FeedChannelView[] = [];
  for (const r of rows.rows) {
    total += Number(r.total);
    unread += Number(r.unread);
    mention += Number(r.mention);
    last = Math.max(last, Number(r.last));
    if (r.ch) steps.push({ id: r.ch, unread: Number(r.unread), total: Number(r.total), lastSeq: Number(r.last) });
  }
  steps.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  return { channels: [{ id: 'all', unread, total, lastSeq: last }, ...steps], mentionUnread: mention, reads, lastSeq: last };
}

async function membersOf(deps: Deps, teamId: string): Promise<FeedMemberView[]> {
  const online = new Set(deps.hub.onlineIn(teamId));
  const rows = await deps.db.query<{ user_id: string; display_name: string; avatar: FeedMemberView['avatar'] }>(
    `select m.user_id, a.display_name, m.avatar from web.members m join web.accounts a on a.user_id = m.user_id
      where m.team_id = $1 and m.role = 'student' order by m.created_at, a.display_name`,
    [teamId],
  );
  return rows.rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, avatar: r.avatar, online: online.has(r.user_id) }));
}

/** 보기 → [거르는 조건, 더 붙일 값]($4 부터). */
function viewFilter(view: FeedView, me: string): [string, unknown[]] {
  if (view === 'all') return ['true', []];
  if (view === 'act') return [`f.kind = 'act'`, []];
  if (view === 'chat') return [`f.kind = 'chat'`, []];
  if (view === 'mention') return [`f.kind = 'chat' and $4::uuid = any(f.mentions)`, [me]];
  return ['f.step_id = $4', [view]];
}

export async function loadFeed(deps: Deps, ctx: RequestContext): Promise<FeedResponse> {
  const w = await who(deps, ctx);
  const view = ctx.query.get('view') ?? 'all';
  if (!isFeedView(view)) throw new ApiError(400, 'bad_request', '없는 채널이에요.');
  const before = Number(ctx.query.get('before') ?? 0);
  const limitRaw = Number(ctx.query.get('limit') ?? FEED_PAGE);
  const limit = Number.isInteger(limitRaw) && limitRaw >= 1 ? Math.min(limitRaw, FEED_PAGE_MAX) : FEED_PAGE;
  const [filter, extra] = viewFilter(view, w.userId);
  const rows = await deps.db.query<FeedRow>(
    `select ${COLUMNS} from web.team_feed f
      where f.team_id = $1 and ($2::bigint = 0 or f.team_seq < $2) and ${filter}
      order by f.team_seq desc limit $3`,
    [w.teamId, Number.isSafeInteger(before) && before > 0 ? before : 0, limit + 1, ...extra],
  );
  const page = rows.rows.slice(0, limit).reverse().map(toFeedItem);
  const [sum, members] = await Promise.all([summary(deps.db, w), membersOf(deps, w.teamId)]);
  return { me: w.userId, view, items: page, hasMore: rows.rows.length > limit, ...sum, members };
}

// ── 4. 쓰기 ──

const sendLimiter = new WindowLimiter(FEED_SEND_PER_MIN, 60_000);
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const bad = (message: string) => new ApiError(400, 'bad_request', message);

/** 본문 다듬기 — NFC · 줄바꿈 \n · 줄 끝 공백 · 빈 줄 셋 이상은 둘로 · 앞뒤 공백. 쓸 수 없는 글자면 null. */
export function cleanBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[^\S\n]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  if (/[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/.test(text)) return null;
  return text;
}

export async function postMessage(deps: Deps, ctx: RequestContext): Promise<FeedPostResponse> {
  const w = await who(deps, ctx);
  const req = ((await readJson(ctx.req)) ?? {}) as Record<string, unknown>;
  const body = cleanBody(req.body);
  if (body === null) throw bad('메시지에 쓸 수 없는 글자가 있어요.');
  if (body.length === 0) throw bad('보낼 말을 써 주세요.');
  if ([...body].length > FEED_BODY_MAX) throw bad(`메시지는 ${FEED_BODY_MAX}자까지예요.`);
  const stepId = req.stepId ?? null;
  if (stepId !== null && (!isFeedChannel(stepId) || stepId === 'all')) throw bad('없는 채널이에요.');
  if (typeof req.clientId !== 'string' || !CLIENT_ID.test(req.clientId)) throw bad('메시지 키(clientId)가 필요해요.');
  const hit = sendLimiter.hit(w.userId);
  if (!hit.ok) throw new ApiError(429, 'rate_limited', `너무 빨리 보내고 있어요. ${hit.retryAfterSec}초 뒤에 다시 보내 주세요.`, { retryAfterSec: hit.retryAfterSec });
  const members = await membersOf(deps, w.teamId);
  const mentions = findMentions(body, members).filter((id) => id !== w.userId);
  const out = await withTx(deps.db, (tx) =>
    writeFeedItem(tx, { teamId: w.teamId, kind: 'chat', code: 'chat', actorId: w.userId, actorName: w.displayName.slice(0, 40), stepId, body, mentions, clientId: req.clientId as string }),
  );
  publishFeed(deps, w.teamId, out);
  ctx.status = out.change === 'posted' ? 201 : 200;
  return { item: out.item };
}

export async function deleteMessage(deps: Deps, ctx: RequestContext, idRaw: string): Promise<FeedPostResponse> {
  const w = await who(deps, ctx);
  const id = Number(idRaw);
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(404, 'not_found', '없는 메시지예요.');
  const out = await withTx(deps.db, async (tx) => {
    const found = await tx.query<FeedRow>(`select ${COLUMNS} from web.team_feed where id = $1 and team_id = $2 for update`, [id, w.teamId]);
    const row = found.rows[0];
    if (!row || row.kind !== 'chat') throw new ApiError(404, 'not_found', '없는 메시지예요.');
    if (row.actor_id !== w.userId) throw new ApiError(403, 'forbidden', '내가 쓴 메시지만 지울 수 있어요.');
    if (row.deleted_at) return { item: toFeedItem(row), change: 'same' as const };
    const done = await tx.query<FeedRow>(`update web.team_feed set deleted_at = now(), updated_at = now() where id = $1 returning ${COLUMNS}`, [id]);
    return { item: toFeedItem(done.rows[0]!), change: 'updated' as const };
  });
  publishFeed(deps, w.teamId, out);
  return { item: out.item };
}

export async function markRead(deps: Deps, ctx: RequestContext): Promise<FeedReadResponse> {
  const w = await who(deps, ctx);
  const req = ((await readJson(ctx.req)) ?? {}) as Record<string, unknown>;
  if (!isFeedChannel(req.channel)) throw bad('없는 채널이에요.');
  const seq = req.seq;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) throw bad('읽은 위치는 0 이상의 정수예요.');
  await deps.db.query(
    `insert into web.team_feed_reads (user_id, team_id, channel, last_seq)
     values ($1, $2, $3, least($4::bigint, coalesce((select last_seq from web.team_feed_heads where team_id = $2), 0)))
     on conflict (user_id, team_id, channel) do update set last_seq = greatest(web.team_feed_reads.last_seq, excluded.last_seq), updated_at = now()`,
    [w.userId, w.teamId, req.channel, seq],
  );
  const { channels, mentionUnread, reads } = await summary(deps.db, w);
  return { channels, mentionUnread, reads };
}

export function register(router: Router<RequestContext>): void {
  onBoardEvent('team-feed', boardEventToFeed);
  router.on('GET', '/api/feed', async (ctx) => loadFeed(ctx.deps, ctx));
  router.on('POST', '/api/feed/messages', async (ctx) => postMessage(ctx.deps, ctx));
  router.on('DELETE', '/api/feed/messages/:id', async (ctx, p) => deleteMessage(ctx.deps, ctx, p.id!));
  router.on('PUT', '/api/feed/read', async (ctx) => markRead(ctx.deps, ctx));
}
