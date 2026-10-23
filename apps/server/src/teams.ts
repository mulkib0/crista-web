/**
 * 사옥 지구 · 입사 · 스타트업 이름 등기(설계 §4.2 · §4.3).
 *
 * - 입사(walk-in): 아직 모둠이 없는 학생이 처음 문을 연 사옥이 내 모둠. 모둠 줄을 잠그고 인원을 세어 정원을 지킨다.
 *   assigned: 교사가 정한 모둠만 열린다(문을 열면 입사 시각만 적는다).
 * - 등기: `update … where registered_at is null` 한 문장 — 같은 모둠의 동시 요청은 행 잠금으로 줄을 서고,
 *   늦은 쪽은 조건이 거짓이 되어 0줄 → '이미 등기됨'(그 모둠 정보와 함께 → 화면 ③).
 *   이름 · 티커의 학급 안 유일은 부분 유일 색인(teams_class_name_key · teams_class_ticker_key)이 정한다.
 * - 고치기: 첫 유료 행동(name_locked_at) 전까지 모둠원이, 그 뒤엔 교사만.
 */
import {
  checkRegistration,
  checkRegistrationPatch,
  classChannel,
  MARKET_COPY,
  type AccountView,
  type DistrictResponse,
  type JoinResponse,
  type RegistrationResponse,
  type TeamView,
} from '@crista-web/web-contract';
import { postBoardEvent } from './board-events.ts';
import { currentGameDay } from './clock.ts';
import type { Deps } from './context.ts';
import { isUniqueViolation, withTx, type Tx } from './db.ts';
import { ApiError, badRequest } from './http.ts';
import { CLASS_SELECT, classSummary, loadTeam, loadTeams, type ClassRow } from './views.ts';

interface StudentMember {
  class_id: string;
  team_id: string | null;
  joined_team_at: Date | null;
}

function requireStudent(account: AccountView): void {
  if (account.kind !== 'student') throw new ApiError(403, 'forbidden', '학생 계정으로 해 주세요.');
}

async function memberOf(db: Pick<Tx, 'query'>, userId: string, lock: boolean): Promise<StudentMember> {
  const result = await db.query<StudentMember>(
    `select class_id, team_id, joined_team_at from web.members where user_id = $1 and role = 'student'${lock ? ' for update' : ''}`,
    [userId],
  );
  if (!result.rows[0]) throw new ApiError(403, 'forbidden', '학급에 가입한 학생이 아니에요.');
  return result.rows[0];
}

const mustTeam = (team: TeamView | null): TeamView => {
  if (!team) throw new ApiError(404, 'not_found', '사옥을 찾지 못했어요.');
  return team;
};

export async function district(deps: Deps, student: AccountView): Promise<DistrictResponse> {
  requireStudent(student);
  const member = await memberOf(deps.db, student.userId, false);
  const cls = await deps.db.query<ClassRow>(`${CLASS_SELECT} where c.id = $1`, [member.class_id]);
  const summary = classSummary(cls.rows[0]!);
  const teams = await loadTeams(deps.db, member.class_id);
  return {
    class: summary,
    myTeamId: member.team_id,
    teams: teams.map((team) => ({
      ...team,
      isMine: team.id === member.team_id,
      canJoin: member.team_id === null && summary.assignment === 'walk-in' && team.memberCount < team.capacity,
    })),
  };
}

export async function joinTeam(deps: Deps, student: AccountView, teamId: string): Promise<JoinResponse> {
  requireStudent(student);
  const joined = await withTx(deps.db, async (tx) => {
    const member = await memberOf(tx, student.userId, true);
    // 같은 학급의 모둠인지 · 정원 계산을 위해 모둠 줄을 잠근다 — 같은 사옥에 동시에 들어와도 정원을 넘지 않는다.
    const teamRow = await tx.query<{ assignment: string; capacity: number }>(
      `select c.assignment, coalesce(c.team_capacity, ceil(c.max_students::numeric / c.team_count))::int as capacity
         from web.teams t join web.classes c on c.id = t.class_id
        where t.id = $1 and t.class_id = $2
        for update of t`,
      [teamId, member.class_id],
    );
    const team = teamRow.rows[0];
    if (!team) throw new ApiError(404, 'not_found', '우리 학급의 사옥이 아니에요.');

    if (member.team_id === teamId) {
      if (member.joined_team_at) return false; // 같은 요청을 다시 보냄
      await tx.query('update web.members set joined_team_at = now() where class_id = $1 and user_id = $2', [member.class_id, student.userId]);
      return true;
    }
    if (member.team_id !== null) {
      throw new ApiError(409, 'already_in_team', '이미 다른 사옥에 입사했어요. 바꾸려면 선생님께 말해 주세요.', {
        team: (await loadTeam(tx, member.team_id)) ?? undefined,
      });
    }
    if (team.assignment === 'assigned') throw new ApiError(403, 'not_assigned', '선생님이 모둠을 정해 주실 거예요. 우리 모둠 사옥만 열려요.');

    const count = await tx.query<{ n: number }>('select count(*)::int as n from web.members where team_id = $1', [teamId]);
    if (count.rows[0]!.n >= team.capacity) throw new ApiError(409, 'team_full', '이 사옥은 정원이 찼어요. 다른 사옥을 골라 주세요.');
    await tx.query('update web.members set team_id = $3, joined_team_at = now() where class_id = $1 and user_id = $2', [
      member.class_id,
      student.userId,
      teamId,
    ]);
    return true;
  });

  const team = mustTeam(await loadTeam(deps.db, teamId));
  if (joined) {
    await deps.hub.refreshUser(student.userId, 'student');
    deps.hub.publish(classChannel(team.classId), {
      type: 'team.joined',
      classId: team.classId,
      teamId,
      userId: student.userId,
      displayName: student.displayName,
      memberCount: team.memberCount,
    });
  }
  return { team, joined };
}

function registrationConflict(error: unknown): ApiError | null {
  if (isUniqueViolation(error, 'teams_class_name_key')) return new ApiError(409, 'name_taken', '우리 학급에 같은 이름의 스타트업이 있어요.');
  if (isUniqueViolation(error, 'teams_class_ticker_key')) return new ApiError(409, 'ticker_taken', '우리 학급에 같은 티커가 있어요.');
  return null;
}

export async function registerTeam(deps: Deps, student: AccountView, teamId: string, raw: unknown): Promise<RegistrationResponse> {
  requireStudent(student);
  const checked = checkRegistration(raw);
  if (!checked.ok) throw badRequest(checked.message);
  const input = checked.value;

  let won: boolean;
  let listed: (() => void) | null = null;
  try {
    won = await withTx(deps.db, async (tx) => {
      const member = await memberOf(tx, student.userId, false);
      if (member.team_id !== teamId) throw new ApiError(403, 'not_in_team', '우리 모둠 사옥에서만 등기할 수 있어요.');
      const updated = await tx.query(
        `update web.teams
            set startup_name = $2, ticker = $3, slogan = $4, registered_at = now(), registered_by = $5
          where id = $1 and registered_at is null`,
        [teamId, input.name, input.ticker, input.slogan, student.userId],
      );
      if (!updated.rowCount) return false;
      // assigned 학급에서 문을 열지 않고 바로 등기한 경우에도 입사 시각을 남긴다.
      await tx.query('update web.members set joined_team_at = coalesce(joined_team_at, now()) where class_id = $1 and user_id = $2', [
        member.class_id,
        student.userId,
      ]);
      // 등기는 전광판 첫 소식(설계 §4.3 · FMARKET) — 같은 트랜잭션 · 잠금 순서 teams → classes. 처리기가 상장가 $10.00 줄을 만든다.
      const news = await postBoardEvent(tx, deps, {
        classId: member.class_id,
        teamId,
        kind: 'listing',
        headline: MARKET_COPY.listing(input.ticker, input.name),
        public: { ticker: input.ticker, name: input.name },
        idemKey: `listing:${teamId}`,
        gameDay: await currentGameDay(tx, member.class_id),
      });
      listed = news.after;
      return true;
    });
  } catch (error) {
    throw registrationConflict(error) ?? error;
  }

  (listed as (() => void) | null)?.();
  const team = mustTeam(await loadTeam(deps.db, teamId));
  if (!won) throw new ApiError(409, 'already_registered', `이미 「${team.startupName}」으로 등기됐어요.`, { team });
  deps.hub.publish(classChannel(team.classId), { type: 'team.registered', classId: team.classId, team, byName: student.displayName });
  return { team };
}

export async function updateRegistration(deps: Deps, actor: AccountView, teamId: string, raw: unknown): Promise<RegistrationResponse> {
  const checked = checkRegistrationPatch(raw);
  if (!checked.ok) throw badRequest(checked.message);
  const patch = checked.value;

  try {
    await withTx(deps.db, async (tx) => {
      const rows = await tx.query<{ class_id: string; registered_at: Date | null; name_locked_at: Date | null; teacher_id: string }>(
        `select t.class_id, t.registered_at, t.name_locked_at, c.teacher_id
           from web.teams t join web.classes c on c.id = t.class_id where t.id = $1 for update of t`,
        [teamId],
      );
      const team = rows.rows[0];
      if (!team) throw new ApiError(404, 'not_found', '사옥을 찾지 못했어요.');
      if (actor.kind === 'teacher') {
        if (team.teacher_id !== actor.userId) throw new ApiError(404, 'not_found', '사옥을 찾지 못했어요.');
      } else {
        const member = await memberOf(tx, actor.userId, false);
        if (member.team_id !== teamId) throw new ApiError(403, 'not_in_team', '우리 모둠의 이름만 고칠 수 있어요.');
        if (team.name_locked_at) throw new ApiError(409, 'name_locked', '첫 연구를 시작한 뒤라 이름은 선생님만 고칠 수 있어요.');
      }
      if (!team.registered_at) throw new ApiError(409, 'not_registered', '아직 등기하지 않은 사옥이에요.');
      await tx.query(
        `update web.teams
            set startup_name = coalesce($2, startup_name),
                ticker = coalesce($3, ticker),
                slogan = case when $4 then $5 else slogan end
          where id = $1`,
        [teamId, patch.name ?? null, patch.ticker ?? null, 'slogan' in patch, patch.slogan ?? null],
      );
    });
  } catch (error) {
    throw registrationConflict(error) ?? error;
  }

  const team = mustTeam(await loadTeam(deps.db, teamId));
  deps.hub.publish(classChannel(team.classId), { type: 'team.updated', classId: team.classId, team, byName: actor.displayName });
  return { team };
}
