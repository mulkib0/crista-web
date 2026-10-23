/**
 * 학급(교사, 설계 §9) — 만들기(학급 코드 · 모둠 수 N · 배정 방식 · 정원) · 목록 · 상세 · 코드 다시 만들기/닫기/열기 · 모둠 배정.
 * 학급을 만들면 모둠(사옥 부지) N 줄을 함께 만든다. 교사는 자기 학급만 본다(남의 학급은 404).
 */
import { randomInt } from 'node:crypto';
import {
  CLASS_CODE_ALPHABET,
  CLASS_CODE_LENGTH,
  checkClassInput,
  classChannel,
  type AccountView,
  type TeacherClassDetail,
  type TeacherClassView,
} from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { isUniqueViolation, withTx, type Queryable } from './db.ts';
import { ApiError, badRequest } from './http.ts';
import { CLASS_SELECT, loadRoster, loadTeams, teacherClassView, type ClassRow } from './views.ts';

export function generateClassCode(): string {
  let code = '';
  for (let i = 0; i < CLASS_CODE_LENGTH; i += 1) code += CLASS_CODE_ALPHABET[randomInt(CLASS_CODE_ALPHABET.length)];
  return code;
}

export function requireTeacher(account: AccountView): void {
  if (account.kind !== 'teacher') throw new ApiError(403, 'forbidden', '교사만 할 수 있어요.');
}

const notFound = () => new ApiError(404, 'not_found', '학급을 찾지 못했어요.');

async function ownedClass(db: Queryable, teacherId: string, classId: string, lock = false): Promise<ClassRow> {
  const result = await db.query<ClassRow>(`${CLASS_SELECT} where c.id = $1 and c.teacher_id = $2${lock ? ' for update of c' : ''}`, [classId, teacherId]);
  if (!result.rows[0]) throw notFound();
  return result.rows[0];
}

/** 코드가 겹치면(전체 유일) 새로 뽑아 다시 한다. */
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await fn(generateClassCode());
    } catch (error) {
      if (!isUniqueViolation(error, 'classes_code_key')) throw error;
    }
  }
  throw new ApiError(500, 'internal', '학급 코드를 만들지 못했어요. 다시 해 주세요.');
}

export async function createClass(deps: Deps, teacher: AccountView, raw: unknown): Promise<TeacherClassDetail> {
  requireTeacher(teacher);
  const checked = checkClassInput(raw);
  if (!checked.ok) throw badRequest(checked.message);
  const input = checked.value;
  const classId = await withFreshCode((code) =>
    withTx(deps.db, async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `insert into web.classes (teacher_id, name, code, team_count, assignment, max_students, team_capacity)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [teacher.userId, input.name, code, input.teamCount, input.assignment, input.maxStudents, input.teamCapacity],
      );
      const id = inserted.rows[0]!.id;
      // 부지 1..N — 외관 변주 · 잉크도 부지 번호로(서로 다른 사옥, 설계 §4.1).
      await tx.query(
        `insert into web.teams (class_id, plot, facade, ink) select $1, n, n, n from generate_series(1, $2::int) as n`,
        [id, input.teamCount],
      );
      await tx.query(`insert into web.members (class_id, user_id, role) values ($1, $2, 'teacher')`, [id, teacher.userId]);
      return id;
    }),
  );
  await deps.hub.refreshUser(teacher.userId, 'teacher');
  return classDetail(deps, teacher, classId);
}

export async function listClasses(deps: Deps, teacher: AccountView): Promise<TeacherClassView[]> {
  requireTeacher(teacher);
  const result = await deps.db.query<ClassRow>(`${CLASS_SELECT} where c.teacher_id = $1 order by c.created_at desc`, [teacher.userId]);
  return result.rows.map(teacherClassView);
}

export async function classDetail(deps: Deps, teacher: AccountView, classId: string): Promise<TeacherClassDetail> {
  requireTeacher(teacher);
  const row = await ownedClass(deps.db, teacher.userId, classId);
  return { ...teacherClassView(row), teams: await loadTeams(deps.db, classId), roster: await loadRoster(deps.db, classId) };
}

export async function changeClassCode(deps: Deps, teacher: AccountView, classId: string, raw: unknown): Promise<TeacherClassView> {
  requireTeacher(teacher);
  const action = ((raw ?? {}) as { action?: unknown }).action;
  if (action !== 'regenerate' && action !== 'close' && action !== 'open') throw badRequest('action 은 regenerate · close · open 중 하나예요.');
  await ownedClass(deps.db, teacher.userId, classId);
  if (action === 'regenerate') {
    // 새 코드 = 열린 코드. 옛 코드로는 더 가입할 수 없다.
    await withFreshCode((code) => deps.db.query('update web.classes set code = $2, code_open = true where id = $1', [classId, code]));
  } else {
    await deps.db.query('update web.classes set code_open = $2 where id = $1', [classId, action === 'open']);
  }
  return teacherClassView(await ownedClass(deps.db, teacher.userId, classId));
}

/** 교사가 학생을 모둠에 배정 · 옮기기 · 빼기(teamId null). 교사 배정은 모둠 정원을 넘길 수 있다(교사 판단). */
export async function assignTeam(deps: Deps, teacher: AccountView, classId: string, userId: string, raw: unknown): Promise<TeacherClassDetail> {
  requireTeacher(teacher);
  const teamId = ((raw ?? {}) as { teamId?: unknown }).teamId ?? null;
  if (teamId !== null && (typeof teamId !== 'string' || !/^[0-9a-f-]{36}$/i.test(teamId))) throw badRequest('teamId 는 모둠 id 이거나 null 이에요.');
  await withTx(deps.db, async (tx) => {
    await ownedClass(tx, teacher.userId, classId, true);
    if (teamId) {
      const team = await tx.query('select 1 from web.teams where id = $1 and class_id = $2', [teamId, classId]);
      if (!team.rowCount) throw new ApiError(404, 'not_found', '이 학급의 모둠이 아니에요.');
    }
    const updated = await tx.query(
      `update web.members set team_id = $3, joined_team_at = case when $3::uuid is null or team_id is distinct from $3::uuid then null else joined_team_at end
        where class_id = $1 and user_id = $2 and role = 'student'`,
      [classId, userId, teamId],
    );
    if (!updated.rowCount) throw new ApiError(404, 'not_found', '이 학급의 학생이 아니에요.');
  });
  await deps.hub.refreshUser(userId, 'student');
  deps.hub.publish(classChannel(classId), { type: 'member.assigned', classId, userId, teamId: teamId as string | null });
  return classDetail(deps, teacher, classId);
}
