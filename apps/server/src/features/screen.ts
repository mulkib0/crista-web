/**
 * 기능 F12 — 1.2 기준 회의 · 내 작업대 도구 5종 · 분자 쇼핑 · 확정서(설계 §5.5 · §5.5.1 · §7.3 '1.2 기준 회의' · §7.4 ②⑥⑦⑧ · §11 W7).
 *
 * 소유: 이 파일 · packages/web-contract/src/screen.ts · apps/web/src/board/steps/s12.tsx(+ s12.css) · db/migrations/0010_screen_run_once.sql.
 * 표(0005): web.screen_briefing · screen_agendas(표적 버전마다 6행 — pipeline.ts `openScreenAgendas` 가 연다) · screen_proposals · screen_votes · claims.reason.
 *
 * 경로
 *   GET  /api/screen                         회의(브리핑 · 안건 · 제안 · 표) · 실행 기록(스냅숏) · 진열대 · 찜 — 그 모둠만
 *   GET  /api/screen/compounds               지금 표적 라이브러리(무료 · 브라우저 계산용) — 사전 Vina 값을 뺀다(§5.5.1)
 *   POST /api/screen/briefing                ① 브리핑 답 · 읽음(사람마다 한 행)
 *   POST /api/screen/proposals               ② 제안(근거 필수 · 자기 제안에 찬성으로 센다)
 *   POST /api/screen/votes                   ② 찬성(근거 필수)
 *   POST /api/screen/agendas/:agenda/reopen  ② 다시 논의(그 안건 표를 모두 지우고 round + 1)
 *   POST /api/claims                         ④ 찜 — routes.ts 가 이 파일의 `claimScreenCandidate` 를 부른다(근거 필수 · 서버 재판정)
 *   (③ 실행은 POST /api/jobs step '1.2' — 요청에 기준을 싣지 않는다. 아래 `onJobPrepare('1.2')` · `onJobAdmit('1.2')`.)
 *
 * 지킬 불변식(설계 §7.4)
 *   ② 찜 — claims PK (버전, 후보) + on conflict do nothing → 409 담당자 이름. 1인 2개는 UQ(버전, 사람, 칸) + (모둠, 버전, 사람) advisory 잠금.
 *   ⑥ 회의 — 투표 · 제안 · 다시 논의는 먼저 screen_agendas 그 안건 행 FOR UPDATE → agreed 면 409(합의값) → 표 upsert → 지금 round 표를
 *      세어 정족수(screenQuorum(그 시각 모둠 인원))면 agreed. 제안 값을 고치면 그 제안의 다른 사람 표를 지운다.
 *   ⑦ 실행 — 요청에 기준을 싣지 않는다. prepare 에서 서버가 합의값 6개로 기준 · 스냅숏을 만들고(아니면 409),
 *      admit(jobs.ts 의 teams 잠금 안)에서 안건이 그 사이 바뀌었으면 409 stale · 그 버전에 queued · running 1.2 가 있으면 409.
 *      DB 도 0010 의 부분 고유 키(버전마다 진행 중 1.2 하나)로 막는다.
 *   ⑧ 찜 근거 — reason 을 서버가 그 분자 값으로 다시 판정(막음이면 400 `reason_blocked`). 찜할 수 있는 것은 그 버전 마지막 성공 1.2 의 통과 id 뿐.
 *
 * 공개 범위(§5.3): 이 파일의 응답 · WS 는 모둠 채널뿐. 학급 채널 · 전광판에는 아무것도 싣지 않는다.
 * 다른 기능에 주는 것: `screenLibrary(deps, targetId)` — 서버 전용 원자료(사전 Vina 포함 — FSEL 의 2.1 '찜 회고' 한 줄 계산용. 화면으로 그대로 내보내지 말 것).
 */
import {
  BRIEFING_OPTIONS,
  BRIEFING_QUESTIONS,
  centsToCrista,
  CLAIMS_PER_PERSON,
  claimCoach,
  isClaimReason,
  SCREEN_AGENDA_REASONS,
  SCREEN_COPY,
  screenFill,
  SCREEN_AGENDAS,
  screenFunnel,
  screenMissed,
  screenMission,
  screenQuorum,
  SCREEN_RO5_VALUES_NOW,
  screenRuleText,
  screenValueAllowed,
  screenVerdict,
  type AccountView,
  type Avatar,
  type BriefingQuestion,
  type ScreenAgenda,
  type ScreenAgendaView,
  type ScreenCompound,
  type ScreenCriteria,
  type ScreenDatasetResponse,
  type ScreenResponse,
  type ScreenRunSnapshot,
  type ScreenRunView,
} from '@crista-web/web-contract';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable } from '../db.ts';
import { requireAccount } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { onJobAdmit, onJobPrepare } from '../jobs.ts';
import { balanceOf, COSTS, ensureTeamRows, loadProgramRow, lockedProgram, notifyTeam, openScreenAgendas, teamMember } from '../pipeline.ts';
import type { RequestContext } from '../routes.ts';
import { WorkerUnavailableError } from '../worker.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 워커 /datasets/compounds 한 번에 받을 수(워커 상한 500). 지금 라이브러리 220종. */
const LIBRARY_LIMIT = 500;
const LIBRARY_TTL_MS = 30 * 60_000;

// ── 라이브러리(워커 원자료 → 1.2 화면용) ──

/** 워커 `/datasets/compounds` 의 한 줄(crista compound_library.json). */
export interface RawCompound {
  chemblId: string;
  name: string;
  canonicalSmiles: string;
  library: string;
  targetId?: string | null;
  mechanism?: string | null;
  mw: number;
  tpsa: number;
  clogp: number;
  hbd: number;
  hba: number;
  rotb: number;
  qed: number;
  ro5Violations: number;
  alerts?: string[];
  screenScoreByTarget?: Record<string, number>;
  vinaKcalByTarget?: Record<string, number>;
}

export interface ScreenLibrary {
  ds: ScreenDatasetResponse;
  /** 서버 전용 — 사전 Vina 값이 들어 있다. 화면 응답에 그대로 싣지 않는다. */
  raw: Map<string, RawCompound>;
  byId: Map<string, ScreenCompound>;
}

const libraryCache = new Map<string, { at: number; value: Promise<ScreenLibrary> }>();

/** 1.2 화면용 한 줄 — 사전 Vina 값(`vinaKcalByTarget`)은 옮기지 않는다(§5.5.1). */
export function toScreenCompound(c: RawCompound, targetId: string): ScreenCompound {
  return {
    id: c.chemblId,
    name: c.name,
    smiles: c.canonicalSmiles,
    library: c.library,
    mw: Number(c.mw),
    tpsa: Number(c.tpsa),
    clogp: Number(c.clogp),
    hbd: Number(c.hbd),
    hba: Number(c.hba),
    rotb: Number(c.rotb),
    qed: Number(c.qed),
    ro5: Number(c.ro5Violations),
    alerts: Array.isArray(c.alerts) ? c.alerts.map(String) : [],
    score: Number(c.screenScoreByTarget?.[targetId] ?? 0),
    known: c.targetId === targetId,
    mechanism: c.mechanism ?? null,
  };
}

/**
 * 표적 하나의 라이브러리 — 워커를 한 번 읽어 캐시한다(30분). 위반 2개 이상인 분자는 워커가 돌려주지 않는다(ro5Only=false 가 '1개까지') →
 * `hidden = total − 받은 수`(설계 §12-6). 깔때기는 미리보기와 같은 함수(`screenFunnel`)로 서버가 직접 센다.
 */
export async function screenLibrary(deps: Pick<Deps, 'worker'>, targetId: string): Promise<ScreenLibrary> {
  const hit = libraryCache.get(targetId);
  if (hit && Date.now() - hit.at < LIBRARY_TTL_MS) return hit.value;
  const value = (async () => {
    let result;
    try {
      result = await deps.worker.compounds({ targetId, maxMw: 100_000, maxTpsa: 100_000, ro5Only: false, excludeAlerts: false, limit: LIBRARY_LIMIT });
    } catch (error) {
      if (error instanceof WorkerUnavailableError) throw new ApiError(503, 'worker_unavailable', error.message, { retryAfterSec: 5 });
      throw error;
    }
    const raws = result.compounds as unknown as RawCompound[];
    const compounds = raws.map((c) => toScreenCompound(c, targetId));
    const total = Math.max(Number(result.stats?.total ?? compounds.length), compounds.length);
    return {
      ds: { targetId, total, hidden: total - compounds.length, compounds },
      raw: new Map(raws.map((c) => [c.chemblId, c])),
      byId: new Map(compounds.map((c) => [c.id, c])),
    };
  })();
  libraryCache.set(targetId, { at: Date.now(), value });
  value.catch(() => libraryCache.delete(targetId));
  return value;
}

/** 시험용 — 캐시 비우기. */
export const clearScreenLibraryCache = (): void => libraryCache.clear();

// ── 읽기 ──

interface AgendaRow {
  agenda: ScreenAgenda;
  round: number;
  status: 'open' | 'agreed';
  value: string | null;
  proposed_by: string | null;
  votes: number | null;
  agreed_at: Date | null;
}

const num = (v: string | number | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));

/** 지금 합의값 · round(합의한 안건만). */
async function agreedCriteria(db: Queryable, revisionId: string, lock: '' | 'for share' = ''): Promise<{ criteria: Partial<ScreenCriteria>; rounds: Record<ScreenAgenda, number>; all: boolean }> {
  const rows = await db.query<AgendaRow>(`select agenda, round, status, value from web.screen_agendas where program_revision_id = $1 order by agenda ${lock}`, [revisionId]);
  const criteria: Partial<ScreenCriteria> = {};
  const rounds = Object.fromEntries(SCREEN_AGENDAS.map((a) => [a, 1])) as Record<ScreenAgenda, number>;
  for (const r of rows.rows) {
    rounds[r.agenda] = r.round;
    if (r.status === 'agreed' && r.value !== null) criteria[r.agenda] = Number(r.value);
  }
  return { criteria, rounds, all: SCREEN_AGENDAS.every((a) => criteria[a] !== undefined) };
}

interface ShelfRow {
  id: string;
  snapshot: ScreenRunSnapshot | null;
  created_at: Date;
}

/** 그 버전 마지막 성공 1.2(스냅숏 있는 것) — 진열대 · 찜이 같은 규칙. */
async function latestShelf(db: Queryable, teamId: string, revisionId: string): Promise<ShelfRow | null> {
  const r = await db.query<ShelfRow>(
    `select id, result -> 'snapshot' as snapshot, created_at from web.jobs
      where team_id = $1 and program_revision_id = $2 and step = '1.2' and status = 'succeeded' and result ? 'snapshot'
      order by finished_at desc nulls last, created_at desc limit 1`,
    [teamId, revisionId],
  );
  return r.rows[0] ?? null;
}

export async function loadScreen(deps: Deps, account: AccountView): Promise<ScreenResponse> {
  const who = await teamMember(deps.db, account);
  const db = deps.db;
  await ensureTeamRows(db, who.teamId);
  const program = await loadProgramRow(db, who.teamId);
  const rev = program.revision_id!;
  await openScreenAgendas(db, rev, who.teamId);

  const [members, briefing, agendas, proposals, votes, runs, claims, balanceCents] = await Promise.all([
    db.query<{ user_id: string; display_name: string; avatar: Avatar | null }>(
      `select m.user_id, a.display_name, m.avatar from web.members m join web.accounts a on a.user_id = m.user_id
        where m.team_id = $1 and m.role = 'student' order by m.joined_team_at nulls last, a.display_name`,
      [who.teamId],
    ),
    db.query<{ user_id: string; question: BriefingQuestion; answer: string; answered_at: Date }>(
      'select user_id, question, answer, answered_at from web.screen_briefing where program_revision_id = $1 order by answered_at',
      [rev],
    ),
    db.query<AgendaRow & { display_name: string | null }>(
      `select g.agenda, g.round, g.status, g.value, g.proposed_by, g.votes, g.agreed_at, a.display_name
         from web.screen_agendas g left join web.accounts a on a.user_id = g.proposed_by where g.program_revision_id = $1`,
      [rev],
    ),
    db.query<{ agenda: ScreenAgenda; proposed_by: string; value: string; reason: string; updated_at: Date; display_name: string; avatar: Avatar | null }>(
      `select p.agenda, p.proposed_by, p.value, p.reason, p.updated_at, a.display_name, m.avatar
         from web.screen_proposals p join web.accounts a on a.user_id = p.proposed_by
         left join web.members m on m.user_id = p.proposed_by and m.role = 'student'
        where p.program_revision_id = $1 order by p.updated_at`,
      [rev],
    ),
    db.query<{ agenda: ScreenAgenda; voter: string; proposed_by: string; reason: string; voted_at: Date; display_name: string; avatar: Avatar | null }>(
      `select v.agenda, v.voter, v.proposed_by, v.reason, v.voted_at, a.display_name, m.avatar
         from web.screen_votes v
         join web.screen_agendas g on g.program_revision_id = v.program_revision_id and g.agenda = v.agenda and g.round = v.round
         join web.accounts a on a.user_id = v.voter
         join web.members m on m.user_id = v.voter and m.role = 'student' and m.team_id = $2
        where v.program_revision_id = $1 order by v.voted_at`,
      [rev, who.teamId],
    ),
    db.query<{ id: string; status: ScreenRunView['status']; progress: number; created_by: string | null; created_at: Date; finished_at: Date | null; cost_cents: string; refunded_cents: string; test: boolean; error: { message?: string } | null; snapshot: ScreenRunSnapshot | null; display_name: string | null; avatar: Avatar | null }>(
      `select j.id, j.status, j.progress, j.created_by, j.created_at, j.finished_at, j.cost_cents, j.refunded_cents, j.test, j.error,
              coalesce(j.result -> 'snapshot', j.params -> 'snapshot') as snapshot, a.display_name, m.avatar
         from web.jobs j left join web.accounts a on a.user_id = j.created_by
         left join web.members m on m.user_id = j.created_by and m.role = 'student'
        where j.team_id = $1 and j.program_revision_id = $2 and j.step = '1.2' order by j.created_at`,
      [who.teamId, rev],
    ),
    db.query<{ compound_id: string; slot: 1 | 2; claimed_by: string; reason: string; name: string; screen_job_id: string; display_name: string; avatar: Avatar | null }>(
      `select c.compound_id, c.slot, c.claimed_by, c.reason, c.name, c.screen_job_id, a.display_name, m.avatar
         from web.claims c join web.accounts a on a.user_id = c.claimed_by
         left join web.members m on m.user_id = c.claimed_by and m.role = 'student'
        where c.program_revision_id = $1 order by c.created_at`,
      [rev],
    ),
    balanceOf(db, who.teamId),
  ]);

  const agendaViews: ScreenAgendaView[] = SCREEN_AGENDAS.map((a) => {
    const g = agendas.rows.find((r) => r.agenda === a);
    return {
      agenda: a,
      round: g?.round ?? 1,
      status: g?.status ?? 'open',
      value: num(g?.value),
      proposedBy: g?.proposed_by ?? null,
      proposedByName: g?.display_name ?? null,
      votes: g?.votes ?? null,
      agreedAt: g?.agreed_at?.toISOString() ?? null,
      proposals: proposals.rows
        .filter((p) => p.agenda === a)
        .map((p) => ({
          proposedBy: p.proposed_by,
          byName: p.display_name,
          avatar: p.avatar,
          value: Number(p.value),
          reason: p.reason,
          updatedAt: p.updated_at.toISOString(),
          votes: votes.rows
            .filter((v) => v.agenda === a && v.proposed_by === p.proposed_by)
            .map((v) => ({ voter: v.voter, voterName: v.display_name, avatar: v.avatar, reason: v.reason, votedAt: v.voted_at.toISOString() })),
        })),
    };
  });
  const agreed: Partial<ScreenCriteria> = {};
  for (const g of agendaViews) if (g.status === 'agreed' && g.value !== null) agreed[g.agenda] = g.value;

  const runViews: ScreenRunView[] = runs.rows.map((r, i) => ({
    jobId: r.id,
    no: i + 1,
    status: r.status,
    progress: r.progress,
    byUserId: r.created_by,
    byName: r.display_name ?? '(나간 모둠원)',
    avatar: r.avatar,
    createdAt: r.created_at.toISOString(),
    costCents: Number(r.cost_cents),
    refundedCents: Number(r.refunded_cents),
    test: r.test,
    snapshot: r.snapshot?.kind === 'screen' ? r.snapshot : null,
    errorMessage: r.status === 'failed' ? (r.error?.message ?? null) : null,
  }));
  // 진열대 — 마지막으로 끝난 성공 실행(스냅숏 있는 것). 찜 경로(`latestShelf`)와 같은 규칙.
  const shelfRow = runs.rows
    .filter((r) => r.status === 'succeeded' && r.snapshot?.kind === 'screen')
    .sort((a, b) => (b.finished_at?.getTime() ?? 0) - (a.finished_at?.getTime() ?? 0) || b.created_at.getTime() - a.created_at.getTime())[0];
  const shelfView = shelfRow ? runViews.find((v) => v.jobId === shelfRow.id)! : null;

  return {
    revisionId: rev,
    targetId: program.target_id,
    me: account.userId,
    members: members.rows.map((m) => ({ userId: m.user_id, displayName: m.display_name, avatar: m.avatar })),
    quorum: screenQuorum(Math.max(1, members.rows.length)),
    briefing: briefing.rows.map((b) => ({ userId: b.user_id, question: b.question, answer: b.answer, answeredAt: b.answered_at.toISOString() })),
    agendas: agendaViews,
    agreed,
    allAgreed: SCREEN_AGENDAS.every((a) => agreed[a] !== undefined),
    runs: runViews.slice().reverse(),
    shelf: shelfView?.snapshot ? { jobId: shelfView.jobId, no: shelfView.no, passIds: shelfView.snapshot.passIds } : null,
    claims: claims.rows.map((c) => ({
      compoundId: c.compound_id,
      slot: c.slot,
      userId: c.claimed_by,
      byName: c.display_name,
      avatar: c.avatar,
      reason: c.reason,
      name: c.name,
      screenJobId: c.screen_job_id,
    })),
    ro5Values: SCREEN_RO5_VALUES_NOW,
    costs: { runCents: COSTS['1.2'], dockCents: COSTS['2.1'] },
    balanceCents,
  };
}

async function loadDataset(deps: Deps, account: AccountView): Promise<ScreenDatasetResponse> {
  const who = await teamMember(deps.db, account);
  const program = await loadProgramRow(deps.db, who.teamId);
  if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
  return (await screenLibrary(deps, program.target_id)).ds;
}

// ── 쓰기 ──

const body = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {});

function checkAgenda(raw: unknown): ScreenAgenda {
  if (typeof raw !== 'string' || !(SCREEN_AGENDAS as readonly string[]).includes(raw)) throw badRequest('안건을 골라 주세요.');
  return raw as ScreenAgenda;
}

function checkValue(agenda: ScreenAgenda, raw: unknown): number {
  const v = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!screenValueAllowed(agenda, v)) {
    if (agenda === 'ro5' && v === 2) throw badRequest('Ro5 는 지금 0 · 1개까지만 정할 수 있어요(설계 §12-6).');
    throw badRequest('그 안건에 쓸 수 없는 값이에요.');
  }
  // numeric 칸과 같은 값으로(0.30000000000000004 같은 부동소수 꼬리를 없앤다).
  return Math.round(v * 100) / 100;
}

function checkReason(agenda: ScreenAgenda, raw: unknown): string {
  if (typeof raw !== 'string' || !SCREEN_AGENDA_REASONS[agenda].includes(raw)) throw badRequest('근거를 하나 골라 주세요.');
  return raw;
}

/** 그 안건 행을 잠근다(⑥). 없으면 연다(표적 버전을 열 때 6행을 만들지만 늘 있게). */
async function lockAgenda(tx: Queryable, revisionId: string, teamId: string, agenda: ScreenAgenda): Promise<AgendaRow> {
  const sql = 'select agenda, round, status, value, proposed_by, votes, agreed_at from web.screen_agendas where program_revision_id = $1 and agenda = $2 for update';
  let r = await tx.query<AgendaRow>(sql, [revisionId, agenda]);
  if (!r.rows[0]) {
    await openScreenAgendas(tx, revisionId, teamId);
    r = await tx.query<AgendaRow>(sql, [revisionId, agenda]);
  }
  return r.rows[0]!;
}

const alreadyAgreed = (agenda: ScreenAgenda, g: AgendaRow, gene: string) =>
  new ApiError(409, 'already_exists', screenFill(SCREEN_COPY.err.alreadyAgreed, { rule: screenRuleText(agenda, num(g.value), gene) }));

/** 지금 round 표를 세어 정족수면 합의(⑥). 같은 트랜잭션 · 안건 행 잠금 안에서만 부른다. */
async function settle(tx: Queryable, revisionId: string, teamId: string, agenda: ScreenAgenda, round: number): Promise<{ agreed: boolean; value: number | null; votes: number }> {
  const members = await tx.query<{ n: number }>(`select count(*)::int as n from web.members where team_id = $1 and role = 'student'`, [teamId]);
  const quorum = screenQuorum(Math.max(1, members.rows[0]!.n));
  // 지금 모둠원의 표만 센다 — 모둠을 떠난 사람의 표가 줄어든 정족수에 더해져 합의를 만들지 않게(정족수 = 그 시각 모둠 인원의 과반).
  const top = await tx.query<{ proposed_by: string; n: number }>(
    `select v.proposed_by, count(*)::int as n from web.screen_votes v
       join web.members m on m.user_id = v.voter and m.team_id = $4 and m.role = 'student'
      where v.program_revision_id = $1 and v.agenda = $2 and v.round = $3
      group by v.proposed_by order by n desc, v.proposed_by limit 1`,
    [revisionId, agenda, round, teamId],
  );
  const best = top.rows[0];
  if (best && best.n >= quorum) {
    const done = await tx.query<{ value: string }>(
      `update web.screen_agendas g set status = 'agreed', value = p.value, proposed_by = p.proposed_by, votes = $4, agreed_at = now(), updated_at = now()
         from web.screen_proposals p
        where g.program_revision_id = $1 and g.agenda = $2 and p.program_revision_id = g.program_revision_id and p.agenda = g.agenda and p.proposed_by = $3
       returning g.value`,
      [revisionId, agenda, best.proposed_by, best.n],
    );
    return { agreed: true, value: num(done.rows[0]?.value), votes: best.n };
  }
  await tx.query('update web.screen_agendas set updated_at = now() where program_revision_id = $1 and agenda = $2', [revisionId, agenda]);
  return { agreed: false, value: null, votes: best?.n ?? 0 };
}

const screenChanged = (deps: Deps, teamId: string, reason: string, byName: string, agenda?: ScreenAgenda) =>
  deps.hub.broadcastTeam(teamId, { type: 'screen.changed', teamId, reason, byName, ...(agenda ? { agenda } : {}) });

export async function answerBriefing(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const b = body(raw);
  const question = b.question;
  if (typeof question !== 'string' || !(BRIEFING_QUESTIONS as readonly string[]).includes(question)) throw badRequest('질문을 골라 주세요.');
  const answer = typeof b.answer === 'string' ? b.answer : '';
  if (!BRIEFING_OPTIONS[question as BriefingQuestion].includes(answer)) throw badRequest('답을 하나 골라 주세요.');
  await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    await tx.query(
      `insert into web.screen_briefing (program_revision_id, team_id, user_id, question, answer) values ($1, $2, $3, $4, $5)
       on conflict (program_revision_id, user_id, question) do update set answer = excluded.answer, answered_at = now()`,
      [program.revision_id, who.teamId, account.userId, question, answer],
    );
  });
  screenChanged(deps, who.teamId, 'briefing', account.displayName);
  return { ok: true };
}

export interface MeetingOutcome {
  ok: true;
  agreed: boolean;
  value: number | null;
  votes: number;
}

export async function propose(deps: Deps, account: AccountView, raw: unknown): Promise<MeetingOutcome> {
  const who = await teamMember(deps.db, account);
  const b = body(raw);
  const agenda = checkAgenda(b.agenda);
  const value = checkValue(agenda, b.value);
  const reason = checkReason(agenda, b.reason);
  const out = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    const rev = program.revision_id;
    const g = await lockAgenda(tx, rev, who.teamId, agenda);
    if (g.status === 'agreed') throw alreadyAgreed(agenda, g, screenMission(program.target_id)?.gene ?? '표적');
    const prev = await tx.query<{ value: string }>('select value from web.screen_proposals where program_revision_id = $1 and agenda = $2 and proposed_by = $3', [rev, agenda, account.userId]);
    await tx.query(
      `insert into web.screen_proposals (program_revision_id, team_id, agenda, proposed_by, value, reason) values ($1, $2, $3, $4, $5, $6)
       on conflict (program_revision_id, agenda, proposed_by) do update set value = excluded.value, reason = excluded.reason, updated_at = now()`,
      [rev, who.teamId, agenda, account.userId, value, reason],
    );
    // 값을 바꿨으면 그 안에 찍힌 다른 사람의 표는 지운다(값이 바뀐 안에 찬성한 셈이 되지 않게).
    if (prev.rows[0] && Number(prev.rows[0].value) !== value) {
      await tx.query('delete from web.screen_votes where program_revision_id = $1 and agenda = $2 and proposed_by = $3 and voter <> $3', [rev, agenda, account.userId]);
    }
    // 제안하면 자기 제안에 찬성으로 센다(설계 §5.5 정족수).
    await tx.query(
      `insert into web.screen_votes (program_revision_id, team_id, agenda, voter, round, proposed_by, reason) values ($1, $2, $3, $4, $5, $4, $6)
       on conflict (program_revision_id, agenda, voter) do update set round = excluded.round, proposed_by = excluded.proposed_by, reason = excluded.reason, voted_at = now()`,
      [rev, who.teamId, agenda, account.userId, g.round, reason],
    );
    return settle(tx, rev, who.teamId, agenda, g.round);
  });
  screenChanged(deps, who.teamId, out.agreed ? 'agreed' : 'proposal', account.displayName, agenda);
  return { ok: true, ...out };
}

export async function vote(deps: Deps, account: AccountView, raw: unknown): Promise<MeetingOutcome> {
  const who = await teamMember(deps.db, account);
  const b = body(raw);
  const agenda = checkAgenda(b.agenda);
  const proposedBy = typeof b.proposedBy === 'string' && UUID.test(b.proposedBy) ? b.proposedBy.toLowerCase() : '';
  if (!proposedBy) throw badRequest('찬성할 제안을 골라 주세요.');
  // 화면이 본 제안 값 — 그 사이 제안자가 값을 고쳤으면 늦은 표가 '바뀐 안'에 찬성한 셈이 되지 않게 409 stale(⑥ '값을 고치면 표를 지운다'의 짝).
  const seen = typeof b.value === 'number' ? b.value : typeof b.value === 'string' && b.value.trim() !== '' ? Number(b.value) : NaN;
  if (!Number.isFinite(seen)) throw badRequest('찬성할 제안의 값(value)을 함께 보내 주세요. 화면을 새로 고쳐 주세요.');
  const reason = checkReason(agenda, b.reason);
  const out = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    const rev = program.revision_id;
    const g = await lockAgenda(tx, rev, who.teamId, agenda);
    if (g.status === 'agreed') throw alreadyAgreed(agenda, g, screenMission(program.target_id)?.gene ?? '표적');
    const p = await tx.query<{ value: string }>('select value from web.screen_proposals where program_revision_id = $1 and agenda = $2 and proposed_by = $3', [rev, agenda, proposedBy]);
    if (!p.rows[0]) throw new ApiError(404, 'not_found', '그 제안을 찾지 못했어요. 화면을 새로 고쳐 주세요.');
    if (Math.abs(Number(p.rows[0].value) - seen) > 1e-6) {
      throw new ApiError(409, 'stale', `그 사이 제안이 ${screenRuleText(agenda, Number(p.rows[0].value), screenMission(program.target_id)?.gene ?? '표적')}(으)로 바뀌었어요. 바뀐 안을 보고 다시 찬성해 주세요.`);
    }
    await tx.query(
      `insert into web.screen_votes (program_revision_id, team_id, agenda, voter, round, proposed_by, reason) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (program_revision_id, agenda, voter) do update set round = excluded.round, proposed_by = excluded.proposed_by, reason = excluded.reason, voted_at = now()`,
      [rev, who.teamId, agenda, account.userId, g.round, proposedBy, reason],
    );
    return settle(tx, rev, who.teamId, agenda, g.round);
  });
  screenChanged(deps, who.teamId, out.agreed ? 'agreed' : 'vote', account.displayName, agenda);
  return { ok: true, ...out };
}

export async function reopen(deps: Deps, account: AccountView, agendaRaw: string): Promise<{ ok: true; changed: boolean }> {
  const who = await teamMember(deps.db, account);
  const agenda = checkAgenda(agendaRaw);
  const changed = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    const g = await lockAgenda(tx, program.revision_id, who.teamId, agenda);
    // 이미 열려 있으면(두 사람이 같이 누름) 그대로 — round 는 한 번만 오른다.
    if (g.status !== 'agreed') return false;
    await tx.query(
      `update web.screen_agendas set round = round + 1, status = 'open', value = null, proposed_by = null, votes = null, agreed_at = null, updated_at = now()
        where program_revision_id = $1 and agenda = $2`,
      [program.revision_id, agenda],
    );
    await tx.query('delete from web.screen_votes where program_revision_id = $1 and agenda = $2', [program.revision_id, agenda]);
    return true;
  });
  if (changed) screenChanged(deps, who.teamId, 'reopen', account.displayName, agenda);
  return { ok: true, changed };
}

// ── ④ 찜(근거 필수 · 서버 재판정 ⑧) ──

const claimsFull = () => new ApiError(409, 'claimed', screenFill(SCREEN_COPY.err.claimsFull, { n: CLAIMS_PER_PERSON }));

export async function claimScreenCandidate(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; slot: number }> {
  const who = await teamMember(deps.db, account);
  const b = body(raw);
  const compoundId = typeof b.compoundId === 'string' ? b.compoundId.trim() : '';
  if (!compoundId || compoundId.length > 64) throw badRequest('찜할 분자를 골라 주세요.');
  const screenJobId = typeof b.screenJobId === 'string' && b.screenJobId ? b.screenJobId : null;
  if (screenJobId !== null && !UUID.test(screenJobId)) throw badRequest('스크리닝 결과가 형식에 맞지 않아요.');
  if (!isClaimReason(b.reason)) throw badRequest('찜 근거를 하나 골라 주세요.');
  const reason = b.reason;

  // 라이브러리는 트랜잭션 밖에서 읽는다(워커 호출을 잠금 안에 두지 않는다). 표적은 트랜잭션 안에서 다시 확인한다.
  const before = await loadProgramRow(deps.db, who.teamId);
  if (!before.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
  const lib = await screenLibrary(deps, before.target_id);

  let slot = 0;
  try {
    await withTx(deps.db, async (tx) => {
      const program = await lockedProgram(tx, who.teamId);
      if (program.target_id !== before.target_id) throw new ApiError(409, 'stale', '그 사이 모둠 표적이 바뀌었어요. 화면을 새로 고쳐 주세요.');
      if (screenJobId) {
        const j = await tx.query<{ program_revision_id: string | null; step: string }>('select program_revision_id, step from web.jobs where id = $1 and team_id = $2', [screenJobId, who.teamId]);
        if (!j.rows[0] || j.rows[0].step !== '1.2') throw new ApiError(404, 'not_found', '우리 모둠의 스크리닝 결과가 아니에요.');
        if (j.rows[0].program_revision_id !== program.revision_id) throw new ApiError(409, 'step_locked', '지금 표적의 스크리닝 결과에서만 찜할 수 있어요. 화면을 새로 고쳐 주세요.');
      }
      const shelf = await latestShelf(tx, who.teamId, program.revision_id);
      if (!shelf?.snapshot) throw new ApiError(409, 'step_locked', '스크리닝을 먼저 실행해 주세요. 통과한 분자만 찜할 수 있어요.');
      if (screenJobId && screenJobId !== shelf.id) throw new ApiError(409, 'stale', SCREEN_COPY.err.staleShelf);
      const rank = shelf.snapshot.passIds.indexOf(compoundId) + 1;
      const compound = lib.byId.get(compoundId);
      if (rank === 0 || !compound) throw badRequest('이번 진열대(마지막 실행 통과 분자)에 없는 분자예요.');

      // 근거 재판정(⑧) — 화면을 거치지 않은 요청도 같은 규칙.
      const others = await tx.query<{ compound_id: string }>('select compound_id from web.claims where program_revision_id = $1 and claimed_by <> $2', [program.revision_id, account.userId]);
      const hit = claimCoach(reason, {
        compound,
        rank,
        mission: screenMission(program.target_id),
        othersLibraries: others.rows.map((r) => lib.byId.get(r.compound_id)?.library ?? '').filter(Boolean),
      });
      if (hit?.level === 'no') throw new ApiError(400, 'reason_blocked', hit.text);

      // 같은 사람이 동시에 여러 번 눌러도 빈 칸을 하나씩 고르게 (모둠, 버전, 사람) 기준으로 잠근다.
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [`crista-web:claims:${who.teamId}:${program.revision_id}:${account.userId}`]);
      const used = await tx.query<{ slot: number }>('select slot from web.claims where program_revision_id = $1 and claimed_by = $2', [program.revision_id, account.userId]);
      const free = [1, 2].find((s) => !used.rows.some((r) => r.slot === s));
      if (free === undefined) throw claimsFull();
      // 사전 Vina 값(vina_kcal)은 서버 전용 칸에만 둔다 — FSEL 의 2.1 '찜 회고' 평균이 이 칸을 읽는다(selection.ts retroMeans).
      // 화면으로는 나가지 않는다: board.claims 는 vinaKcal 을 늘 null 로 내리고(pipeline.ts) · GET /api/screen 은 이 칸을 읽지 않는다(§5.5.1).
      const kcal = lib.raw.get(compoundId)?.vinaKcalByTarget?.[program.target_id!];
      const inserted = await tx.query(
        `insert into web.claims (team_id, program_revision_id, compound_id, slot, name, smiles, screen_job_id, claimed_by, vina_kcal, screen_score, mw, qed, reason)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (program_revision_id, compound_id) do nothing`,
        [who.teamId, program.revision_id, compoundId, free, compound.name, compound.smiles, shelf.id, account.userId,
          typeof kcal === 'number' && Number.isFinite(kcal) ? kcal : null, compound.score, compound.mw, compound.qed, reason],
      );
      if (!inserted.rowCount) {
        const owner = await tx.query<{ display_name: string }>(
          'select a.display_name from web.claims c join web.accounts a on a.user_id = c.claimed_by where c.program_revision_id = $1 and c.compound_id = $2',
          [program.revision_id, compoundId],
        );
        throw new ApiError(409, 'claimed', screenFill(SCREEN_COPY.err.claimTaken, { name: owner.rows[0]?.display_name ?? SCREEN_COPY.err.otherMember }));
      }
      slot = free;
    });
  } catch (error) {
    // 잠금을 비켜 간 경우의 마지막 방어선 — 칸 고유 키.
    if (isUniqueViolation(error, 'claims_person_slot_key')) throw claimsFull();
    throw error;
  }
  notifyTeam(deps, who.teamId, 'claim', account.displayName);
  return { ok: true, slot };
}

// ── ③ 실행 고리(jobs.ts) ──

/** 실행 스냅숏 — 합의값 6개로 서버가 직접 센다(미리보기와 같은 `screenFunnel`). */
export function buildSnapshot(ds: ScreenDatasetResponse, criteria: ScreenCriteria, rounds: Record<ScreenAgenda, number>): ScreenRunSnapshot {
  const f = screenFunnel(ds, criteria);
  return {
    kind: 'screen',
    version: 1,
    criteria,
    rounds,
    total: f.total,
    hidden: f.hidden,
    steps: f.steps,
    final: f.final,
    passIds: f.passIds,
    knownTotal: f.knownTotal,
    knownLeft: f.knownLeft,
    enrichment: Math.round(f.enrichment * 100) / 100,
    topKnown: f.topKnown,
    verdict: screenVerdict(f.final),
    missed: screenMissed(ds, criteria, f.passIds),
  };
}

function registerJobHooks(): void {
  onJobPrepare('1.2', async (deps, ctx) => {
    const { criteria, rounds, all } = await agreedCriteria(deps.db, ctx.revisionId);
    if (!all) {
      const n = SCREEN_AGENDAS.filter((a) => criteria[a] !== undefined).length;
      throw new ApiError(409, 'step_locked', `6개 안건을 모두 합의해야 실행할 수 있어요(지금 ${n}/6).`);
    }
    const full = criteria as ScreenCriteria;
    if (!SCREEN_AGENDAS.every((a) => screenValueAllowed(a, full[a]))) throw new ApiError(409, 'step_locked', '지금 쓸 수 없는 합의값이 있어요. 그 안건을 다시 논의해 주세요.');
    const lib = await screenLibrary(deps, ctx.targetId);
    const snapshot = buildSnapshot(lib.ds, full, rounds);
    const gene = screenMission(ctx.targetId)?.gene ?? ctx.targetId;
    return {
      // 워커에는 워커가 아는 네 관문만(QED · 표적 점수 관문과 통과 id 는 서버 스냅숏이 정한다 — 워커에 ro5Max 가 생기면 §12-6).
      params: { targetId: ctx.targetId, maxMw: full.mw, maxTpsa: full.tpsa, ro5Only: full.ro5 === 0, excludeAlerts: full.alert >= 1, topN: LIBRARY_LIMIT },
      summary: `${SCREEN_AGENDAS.map((a) => screenRuleText(a, full[a], gene)).join(' · ')} → ${snapshot.final}종`,
      snapshot: snapshot as unknown as Record<string, unknown>,
    };
  });

  onJobAdmit('1.2', async (tx, ctx) => {
    const snap = ctx.prepared.snapshot as unknown as ScreenRunSnapshot | null | undefined;
    // 안건 행을 잠가(합의 · 다시 논의와 줄 세움) 입력을 확인한 뒤 기준이 바뀌지 않았나 다시 본다.
    const now = await agreedCriteria(tx, ctx.revisionId, 'for share');
    const same = !!snap && now.all && SCREEN_AGENDAS.every((a) => now.criteria[a] === snap.criteria[a] && now.rounds[a] === snap.rounds[a]);
    if (!same) throw new ApiError(409, 'stale', '그 사이 합의한 기준이 바뀌었어요. 화면을 새로 고쳐 다시 실행해 주세요.');
    const active = await tx.query<{ display_name: string | null }>(
      `select a.display_name from web.jobs j left join web.accounts a on a.user_id = j.created_by
        where j.team_id = $1 and j.program_revision_id = $2 and j.step = '1.2' and j.status in ('queued', 'running') limit 1`,
      [ctx.teamId, ctx.revisionId],
    );
    if (active.rows[0]) {
      throw new ApiError(409, 'already_exists', screenFill(SCREEN_COPY.err.alreadyRunning, { name: active.rows[0].display_name ?? SCREEN_COPY.err.otherMember }));
    }
  });
}

/** 시험용 — 실행 스냅숏의 비용 줄(연구비 대비 %). 화면과 같은 셈. */
export const dockCostCrista = (n: number): number => centsToCrista(n * COSTS['2.1']);

export function register(router: Router<RequestContext>): void {
  registerJobHooks();
  router.on('GET', '/api/screen', async (ctx) => loadScreen(ctx.deps, requireAccount(ctx)));
  router.on('GET', '/api/screen/compounds', async (ctx) => loadDataset(ctx.deps, requireAccount(ctx)));
  router.on('POST', '/api/screen/briefing', async (ctx) => answerBriefing(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/screen/proposals', async (ctx) => propose(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/screen/votes', async (ctx) => vote(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/screen/agendas/:agenda/reopen', async (ctx, p) => reopen(ctx.deps, requireAccount(ctx), p.agenda!));
}
