/**
 * 항체 랩 합의 — A1(표적 · 원본 항체) · A2(고정 위치)의 **1인 1몫 카드 · 제안 · 투표**(설계 §5.3 · §10 U4).
 *
 * - 카드: `unique (team_id, revision_id, step, submitted_by, slot)` — 같은 몫을 다시 올리면 **갱신**하고 200 으로 돌려준다.
 * - 제안: 모둠 · 버전 · 안건당 열린 제안은 하나(부분 유일 색인) — 이미 있으면 409 `invalid_input`.
 * - 투표: 1인 1표(`unique (proposal_id, voter)`) · 정족수 = 모둠 유효 인원의 **과반**.
 *   과반 `yes` 가 되면 **같은 트랜잭션에서** `status='passed'` + A1 이면 프로그램을 확정한다.
 * - 투표 현황은 `antibody.consensus` 로 실시간으로 흘린다(§5.6).
 */
import {
  teamChannel,
  type AccountView,
  type AntibodyCardStep,
  type AntibodyCardView,
  type AntibodyProposalStatus,
  type AntibodyProposalTopic,
  type AntibodyProposalView,
  type AntibodyVoteChoice,
} from '@crista-web/web-contract';
import type { Deps } from '../../context.ts';
import { isUniqueViolation, withTx, type Queryable } from '../../db.ts';
import { ApiError, badRequest } from '../../http.ts';
import { notifyTeam, teamMember } from '../../pipeline.ts';
import { applyProgram, checkProgramValue, lockedRevision, memberCount, postProgramNews } from './service.ts';

const TOPICS: readonly AntibodyProposalTopic[] = ['program', 'fixed_positions'];
const CARD_STEPS: readonly AntibodyCardStep[] = ['A1', 'A2'];
/** A2 의 몫 — 여섯 구간. A1 은 자유 문자열(맡은 표적/항체 묶음). */
export const A2_SLOTS: readonly string[] = ['H1', 'H2', 'H3', 'L1', 'L2', 'L3'];

/** 정족수 — 유효 인원의 과반(1명이면 1표). */
export const quorumOf = (members: number): number => Math.floor(members / 2) + 1;

const checkRationale = (raw: unknown): string => {
  const text = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (text.length < 1 || [...text].length > 600) throw badRequest('근거는 1~600자예요.');
  return text;
};

// ── 카드 ──

interface CardRow {
  id: string;
  step: AntibodyCardStep;
  slot: string;
  payload: unknown;
  rationale: string;
  display_name: string | null;
  created_at: Date;
}

const CARD_SELECT = `
  select c.id, c.step, c.slot, c.payload, c.rationale, a.display_name, c.created_at
    from web.antibody_card_submissions c left join web.accounts a on a.user_id = c.submitted_by`;

const cardView = (r: CardRow): AntibodyCardView => ({
  id: r.id,
  step: r.step,
  slot: r.slot,
  payload: r.payload,
  rationale: r.rationale,
  ...(r.display_name ? { byName: r.display_name } : {}),
  createdAt: r.created_at.toISOString(),
});

export async function loadCards(db: Queryable, revisionId: string): Promise<AntibodyCardView[]> {
  const rows = await db.query<CardRow>(`${CARD_SELECT} where c.revision_id = $1 order by c.step, c.slot, c.created_at`, [revisionId]);
  return rows.rows.map(cardView);
}

export async function addCard(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodyCardView> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const step = body.step as AntibodyCardStep;
  if (!CARD_STEPS.includes(step)) throw badRequest('카드는 A1 · A2 에만 올려요.');
  const slot = String(body.slot ?? '').trim();
  if (slot.length < 1 || slot.length > 24) throw badRequest('맡은 몫을 보내 주세요.');
  if (step === 'A2' && !A2_SLOTS.includes(slot)) throw badRequest(`A2 의 몫은 ${A2_SLOTS.join(' · ')} 중 하나예요.`);
  const rationale = checkRationale(body.rationale);
  const payload = body.payload ?? {};

  const id = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    const inserted = await tx.query<{ id: string }>(
      `insert into web.antibody_card_submissions (team_id, revision_id, step, slot, payload, rationale, submitted_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (team_id, revision_id, step, submitted_by, slot)
         do update set payload = excluded.payload, rationale = excluded.rationale, updated_at = now()
       returning id`,
      [who.teamId, rev.revisionId, step, slot, JSON.stringify(payload), rationale, account.userId],
    );
    return inserted.rows[0]!.id;
  });

  notifyTeam(deps, who.teamId, `antibody:card:${step}`, account.displayName);
  const rows = await deps.db.query<CardRow>(`${CARD_SELECT} where c.id = $1`, [id]);
  return cardView(rows.rows[0]!);
}

// ── 제안 · 투표 ──

interface ProposalRow {
  id: string;
  topic: AntibodyProposalTopic;
  value: unknown;
  rationale: string;
  display_name: string | null;
  status: AntibodyProposalStatus;
  version: number;
  yes: number;
  no: number;
  my_choice: AntibodyVoteChoice | null;
}

const PROPOSAL_SELECT = `
  select p.id, p.team_id, p.topic, p.value, p.rationale, a.display_name, p.status, p.version,
         (select count(*)::int from web.antibody_votes v where v.proposal_id = p.id and v.choice = 'yes') as yes,
         (select count(*)::int from web.antibody_votes v where v.proposal_id = p.id and v.choice = 'no') as no,
         (select v.choice from web.antibody_votes v where v.proposal_id = p.id and v.voter = $2) as my_choice
    from web.antibody_proposals p left join web.accounts a on a.user_id = p.proposed_by`;

const proposalView = (r: ProposalRow, quorum: number): AntibodyProposalView => ({
  id: r.id,
  topic: r.topic,
  value: r.value,
  rationale: r.rationale,
  ...(r.display_name ? { byName: r.display_name } : {}),
  status: r.status,
  votes: { yes: r.yes, no: r.no, quorum, ...(r.my_choice ? { myChoice: r.my_choice } : {}) },
  version: r.version,
});

export async function loadProposals(db: Queryable, revisionId: string, userId: string): Promise<AntibodyProposalView[]> {
  const rows = await db.query<ProposalRow & { team_id: string }>(
    `${PROPOSAL_SELECT} where p.revision_id = $1 order by p.created_at desc`,
    [revisionId, userId],
  );
  if (rows.rows.length === 0) return [];
  const quorum = quorumOf(await memberCount(db, rows.rows[0]!.team_id ?? ''));
  return rows.rows.map((r) => proposalView(r, quorum));
}

export async function addProposal(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodyProposalView> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const topic = body.topic as AntibodyProposalTopic;
  if (!TOPICS.includes(topic)) throw badRequest('안건은 program · fixed_positions 중 하나예요.');
  const rationale = checkRationale(body.rationale);
  // A1 안건은 값 꼴을 지금 검사한다 — 과반이 된 뒤 깨지면 되돌릴 수 없다.
  const value = topic === 'program' ? checkProgramValue(body.value) : checkFixedPositions(body.value);

  const id = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    try {
      const inserted = await tx.query<{ id: string }>(
        `insert into web.antibody_proposals (team_id, revision_id, topic, value, rationale, proposed_by)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [who.teamId, rev.revisionId, topic, JSON.stringify(value), rationale, account.userId],
      );
      return inserted.rows[0]!.id;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, 'invalid_input', '이미 열린 제안이 있어요. 그 제안에 투표하거나 거둬 주세요.');
      throw error;
    }
  });

  notifyTeam(deps, who.teamId, `antibody:proposal:${topic}`, account.displayName);
  const rows = await deps.db.query<ProposalRow>(`${PROPOSAL_SELECT} where p.id = $1`, [id, account.userId]);
  return proposalView(rows.rows[0]!, quorumOf(await memberCount(deps.db, who.teamId)));
}

function checkFixedPositions(raw: unknown): { positions: Array<{ chain: 'H' | 'L'; pos: number }> } {
  const list = Array.isArray(raw) ? raw : ((raw ?? {}) as { positions?: unknown }).positions;
  if (!Array.isArray(list)) throw badRequest('고정 위치 목록을 보내 주세요.');
  if (list.length > 200) throw badRequest('고정 위치는 200개까지예요.');
  const positions = list.map((item): { chain: 'H' | 'L'; pos: number } => {
    const o = (item ?? {}) as Record<string, unknown>;
    const chain = o.chain === 'L' ? 'L' : o.chain === 'H' ? 'H' : null;
    const pos = Number(o.pos);
    if (chain === null || !Number.isInteger(pos) || pos < 1 || pos > 400) throw badRequest('고정 위치가 잘못됐어요.');
    return { chain, pos };
  });
  return { positions };
}

/** 1인 1표 — 과반 `yes` 면 같은 트랜잭션에서 확정한다. */
export async function castVote(deps: Deps, account: AccountView, proposalId: string, raw: unknown): Promise<AntibodyProposalView> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const choice = body.choice === 'no' ? 'no' : body.choice === 'yes' ? 'yes' : null;
  if (choice === null) throw badRequest('찬성 · 반대를 골라 주세요.');
  const expected = Number(body.version);
  if (!Number.isInteger(expected) || expected < 1) throw badRequest('제안 버전을 보내 주세요.');

  const members = await memberCount(deps.db, who.teamId);
  const quorum = quorumOf(members);

  const outcome = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    const found = await tx.query<{ id: string; topic: AntibodyProposalTopic; value: unknown; status: AntibodyProposalStatus; version: number }>(
      'select id, topic, value, status, version from web.antibody_proposals where id = $1 and team_id = $2 and revision_id = $3 for update',
      [proposalId, who.teamId, rev.revisionId],
    );
    const proposal = found.rows[0];
    if (!proposal) throw new ApiError(404, 'not_found', '없는 제안이에요.');
    if (proposal.status !== 'open') throw new ApiError(409, 'invalid_input', '이미 끝난 제안이에요.');
    if (proposal.version !== expected) throw new ApiError(409, 'stale', '제안이 그 사이 바뀌었어요. 화면을 새로 고쳐 다시 해 주세요.');

    await tx.query(
      `insert into web.antibody_votes (proposal_id, team_id, voter, choice) values ($1, $2, $3, $4)
       on conflict (proposal_id, voter) do update set choice = excluded.choice, created_at = now()`,
      [proposalId, who.teamId, account.userId, choice],
    );
    const tally = await tx.query<{ yes: number; no: number }>(
      `select count(*) filter (where choice = 'yes')::int as yes, count(*) filter (where choice = 'no')::int as no
         from web.antibody_votes where proposal_id = $1`,
      [proposalId],
    );
    const yes = tally.rows[0]!.yes;
    const no = tally.rows[0]!.no;

    let status: AntibodyProposalStatus = 'open';
    let after: () => void = () => {};
    if (yes >= quorum) {
      status = 'passed';
      await tx.query('update web.antibody_proposals set status = $2, version = version + 1 where id = $1', [proposalId, status]);
      if (proposal.topic === 'program') {
        const value = checkProgramValue(proposal.value);
        const confirmed = await applyProgram(tx, deps, { teamId: who.teamId, classId: who.classId, userId: account.userId }, value, null);
        after = await postProgramNews(tx, deps, who, confirmed);
      }
    } else if (no >= quorum) {
      status = 'rejected';
      await tx.query('update web.antibody_proposals set status = $2, version = version + 1 where id = $1', [proposalId, status]);
    }
    return { yes, no, status, topic: proposal.topic, after };
  });

  outcome.after();
  notifyTeam(deps, who.teamId, `antibody:vote:${outcome.topic}`, account.displayName);
  deps.hub.publish(teamChannel(who.teamId), {
    type: 'antibody.consensus',
    teamId: who.teamId,
    topic: outcome.topic,
    yes: outcome.yes,
    no: outcome.no,
    quorum,
    status: outcome.status,
  });
  const rows = await deps.db.query<ProposalRow>(`${PROPOSAL_SELECT} where p.id = $1`, [proposalId, account.userId]);
  return proposalView(rows.rows[0]!, quorum);
}

// A1 · A2 의 과정 신호는 `process.ts` 한 곳에 있다(§11.3.1) — 여기 있던 `consensusSignals` 는
// 아무도 부르지 않는 사본이었어서 지웠다(신호 표가 두 벌이면 어긋난다).

/** 화면이 A2 를 열 수 있나 — 과반이 카드를 올렸는지(완료 조건 §2.2). */
export async function cardsMajority(db: Queryable, revisionId: string, teamId: string, step: AntibodyCardStep): Promise<boolean> {
  const members = await memberCount(db, teamId);
  const rows = await db.query<{ n: number }>(
    'select count(distinct submitted_by)::int as n from web.antibody_card_submissions where revision_id = $1 and step = $2',
    [revisionId, step],
  );
  return (rows.rows[0]?.n ?? 0) >= quorumOf(members);
}
