/**
 * DB 줄 → 화면 모양(web-contract). 모둠 정원 · 인원은 여기서 함께 센다.
 */
import type { Assignment, Avatar, ClassSummary, RosterEntry, TeacherClassView, TeamView } from '@crista-web/web-contract';
import type { Queryable } from './db.ts';

const TEAM_SELECT = `
  select t.id, t.class_id, t.plot, t.facade, t.ink, t.hq_tier, t.startup_name, t.ticker, t.slogan,
         t.registered_at, t.name_locked_at, a.display_name as registered_by_name,
         (select count(*) from web.members m where m.team_id = t.id)::int as member_count,
         coalesce(c.team_capacity, ceil(c.max_students::numeric / c.team_count))::int as capacity
    from web.teams t
    join web.classes c on c.id = t.class_id
    left join web.accounts a on a.user_id = t.registered_by`;

interface TeamRow {
  id: string;
  class_id: string;
  plot: number;
  facade: number;
  ink: number;
  hq_tier: 1 | 2 | 3;
  startup_name: string | null;
  ticker: string | null;
  slogan: string | null;
  registered_at: Date | null;
  name_locked_at: Date | null;
  registered_by_name: string | null;
  member_count: number;
  capacity: number;
}

const teamView = (row: TeamRow): TeamView => ({
  id: row.id,
  classId: row.class_id,
  plot: row.plot,
  facade: row.facade,
  ink: row.ink,
  hqTier: row.hq_tier,
  startupName: row.startup_name,
  ticker: row.ticker,
  slogan: row.slogan,
  registeredAt: row.registered_at?.toISOString() ?? null,
  registeredByName: row.registered_by_name,
  nameLocked: row.name_locked_at !== null,
  memberCount: row.member_count,
  capacity: row.capacity,
});

export async function loadTeams(db: Queryable, classId: string): Promise<TeamView[]> {
  const result = await db.query<TeamRow>(`${TEAM_SELECT} where t.class_id = $1 order by t.plot`, [classId]);
  return result.rows.map(teamView);
}

export async function loadTeam(db: Queryable, teamId: string): Promise<TeamView | null> {
  const result = await db.query<TeamRow>(`${TEAM_SELECT} where t.id = $1`, [teamId]);
  return result.rows[0] ? teamView(result.rows[0]) : null;
}

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  code: string;
  code_open: boolean;
  team_count: number;
  assignment: Assignment;
  max_students: number;
  team_capacity: number | null;
  /** 0006 — 모둠당 특허 상한 · 게임 시계 칸(시계는 clock.ts 가 읽는다). */
  max_patents_per_team: number;
  created_at: Date;
  student_count: number;
}

export const CLASS_SELECT = `
  select c.*, (select count(*) from web.members m where m.class_id = c.id and m.role = 'student')::int as student_count
    from web.classes c`;

export const classSummary = (row: ClassRow): ClassSummary => ({
  id: row.id,
  name: row.name,
  teamCount: row.team_count,
  assignment: row.assignment,
  maxStudents: row.max_students,
  teamCapacity: row.team_capacity ?? Math.ceil(row.max_students / row.team_count),
  studentCount: row.student_count,
});

export const teacherClassView = (row: ClassRow): TeacherClassView => ({
  ...classSummary(row),
  code: row.code,
  codeOpen: row.code_open,
  teamCapacitySetting: row.team_capacity,
  createdAt: row.created_at.toISOString(),
});

export async function loadRoster(db: Queryable, classId: string): Promise<RosterEntry[]> {
  const result = await db.query<{ user_id: string; login_id: string; display_name: string; team_id: string | null; joined_team_at: Date | null; avatar: Avatar | null }>(
    `select m.user_id, a.login_id, a.display_name, m.team_id, m.joined_team_at, m.avatar
       from web.members m join web.accounts a on a.user_id = m.user_id
      where m.class_id = $1 and m.role = 'student'
      order by a.login_id`,
    [classId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    loginId: row.login_id,
    displayName: row.display_name,
    teamId: row.team_id,
    joinedTeamAt: row.joined_team_at?.toISOString() ?? null,
    avatar: row.avatar,
  }));
}
