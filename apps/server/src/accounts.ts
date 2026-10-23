/**
 * 계정 — 가입(학생 — 교사 가입은 당분간 닫음) · 학급 고르기 · 로그인 · 교사 발급 · 내 정보(설계 §3 · §9).
 *
 * 가입은 서버가 대신 만든다: GoTrue 관리자 API 로 `<아이디>@web.crista.test`(email_confirm) → web.accounts 를 한 트랜잭션에.
 * 학급 코드는 받지 않는다 — 학생은 가입 뒤 교사가 '학생 받기'를 연 학급 목록에서 골라 들어간다(enroll).
 * 같은 아이디의 동시 가입은 권고 잠금으로 줄을 세운다
 * (그래야 '이미 있는 GoTrue 사용자에 이어 붙이기'가 진짜 고아 계정에만 일어난다).
 * DB 쓰기가 실패하면 이번에 새로 만든 GoTrue 사용자를 지운다.
 *
 * 로그인은 web.password_verifiers(0004)로 이 서버 안에서 확인한다 — GoTrue 의 IP 당 로그인 상한에 걸리지 않게(passwords.ts).
 */
import {
  ANTIBODY_STEP_IDS,
  AVATARS,
  STEP_IDS,
  TRACK_IDS,
  checkClassCode,
  checkDisplayName,
  checkLoginId,
  checkPassword,
  classChannel,
  loginIdToEmail,
  type AccountView,
  type Avatar,
  type LabProgress,
  type MeResponse,
  type TrackId,
  type OpenClassesResponse,
  type Role,
} from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { isUniqueViolation, withTx, type Pool, type Queryable } from './db.ts';
import { AuthRejectedError, AuthUnavailableError, type AuthClient } from './gotrue.ts';
import { ApiError, badRequest } from './http.ts';
import { changePassword, makeVerifier, matchesVerifier, saveVerifier } from './passwords.ts';
import { createSession } from './sessions.ts';
import { CLASS_SELECT, classSummary, loadTeam, type ClassRow } from './views.ts';

const accountLock = (loginId: string) => `crista-web:account:${loginId}`;

function take<T>(result: { ok: true; value: T } | { ok: false; message: string }): T {
  if (!result.ok) throw badRequest(result.message);
  return result.value;
}

export function authUnavailable(error: AuthUnavailableError): ApiError {
  return new ApiError(503, 'auth_unavailable', error.message, { retryAfterSec: 5 });
}

export async function signup(deps: Deps, raw: unknown, ip: string): Promise<{ account: AccountView; token: string }> {
  const body = (raw ?? {}) as Record<string, unknown>;
  // 교사 가입은 당분간 닫는다(연수 — 참가자는 학생으로 가입해 파이프라인을 해 본다). 교사 계정은 teacher:create 로만 만든다.
  if (body.kind === 'teacher') throw new ApiError(403, 'forbidden', '선생님 계정은 지금 화면에서 만들 수 없어요. 진행자에게 문의해 주세요.');
  const kind: Role = 'student';
  // 화면은 코드를 보내지 않는다. 점검 스크립트처럼 코드를 보내는 학생 가입만 그 학급에 바로 넣는다.
  const code = kind === 'student' && body.classCode != null && body.classCode !== '' ? take(checkClassCode(body.classCode)) : null;
  const loginId = take(checkLoginId(body.loginId));
  const displayName = take(checkDisplayName(body.displayName));
  const password = take(checkPassword(body.password));

  const limits = code ? ([[deps.limits.signupPerIp, ip], [deps.limits.signupPerCode, code]] as const) : ([[deps.limits.signupPerIp, ip]] as const);
  for (const [limiter, key] of limits) {
    const hit = limiter.hit(key);
    if (!hit.ok) throw new ApiError(429, 'rate_limited', '가입 요청이 많아요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: hit.retryAfterSec });
  }
  // 트랜잭션 · 잠금 밖에서 미리 만든다(scrypt 한 번에 100ms 안팎).
  const verifier = await makeVerifier(password);

  try {
    return await withTx(deps.db, async (tx) => {
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [accountLock(loginId)]);
      const taken = await tx.query('select 1 from web.accounts where login_id = $1', [loginId]);
      if (taken.rowCount) throw new ApiError(409, 'login_id_taken', '이미 쓰는 아이디예요. 다른 아이디를 골라 주세요.');
      if (code) await assertClassOpen(tx, { code }, false);

      const { userId, created } = await deps.auth.createOrAttach({
        email: loginIdToEmail(loginId),
        password,
        metadata: { app: 'crista-web', login_id: loginId, display_name: displayName, kind },
      });
      try {
        await tx.query(`insert into web.accounts (user_id, login_id, display_name, kind) values ($1, $2, $3, $4)`, [userId, loginId, displayName, kind]);
        await saveVerifier(tx, userId, verifier, 'replace');
        const token = await createSession(tx, userId);
        if (code) await joinClass(tx, await assertClassOpen(tx, { code }, true), userId);
        return { account: { userId, loginId, displayName, kind }, token };
      } catch (error) {
        if (created) await deps.auth.deleteUser(userId).catch((e: Error) => console.error('[signup] GoTrue 사용자 되돌리기 실패:', e.message));
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof AuthUnavailableError) throw authUnavailable(error);
    throw error;
  }
}

/** 교사가 '학생 받기'를 연 학급(code_open) — 가입한 학생이 이 가운데 하나를 고른다. */
export async function openClasses(deps: Deps, student: AccountView): Promise<OpenClassesResponse> {
  if (student.kind !== 'student') throw new ApiError(403, 'forbidden', '학생 계정으로 해 주세요.');
  const result = await deps.db.query<ClassRow & { teacher_name: string }>(
    `select x.*, a.display_name as teacher_name
       from (${CLASS_SELECT} where c.code_open) x join web.accounts a on a.user_id = x.teacher_id
      order by x.created_at desc`,
  );
  return {
    classes: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      teacherName: row.teacher_name,
      teamCount: row.team_count,
      studentCount: row.student_count,
      maxStudents: row.max_students,
    })),
  };
}

/** 아직 학급이 없는 학생이 학급을 골라 들어간다. 한 학생은 한 학급(members_one_class_per_student). */
export async function enroll(deps: Deps, student: AccountView, classId: string): Promise<MeResponse> {
  if (student.kind !== 'student') throw new ApiError(403, 'forbidden', '학생 계정으로 해 주세요.');
  if (!/^[0-9a-f-]{36}$/i.test(classId)) throw notFoundClass();
  const already = () => new ApiError(409, 'already_in_class', '이미 학급에 들어가 있어요.');
  try {
    await withTx(deps.db, async (tx) => {
      const member = await tx.query(`select 1 from web.members where user_id = $1 and role = 'student'`, [student.userId]);
      if (member.rowCount) throw already();
      await joinClass(tx, await assertClassOpen(tx, { id: classId }, true), student.userId);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw already();
    throw error;
  }
  await deps.hub.refreshUser(student.userId, 'student');
  deps.hub.publish(classChannel(classId), { type: 'member.enrolled', classId, userId: student.userId });
  return me(deps.db, student);
}

const classFull = () => new ApiError(409, 'class_full', '학급 정원이 찼어요. 선생님께 알려 주세요.');
const notFoundClass = () => new ApiError(404, 'not_found', '학급을 찾지 못했어요. 목록을 새로 고쳐 주세요.');

/**
 * 학급 확인(코드 또는 id). 잠그지 않을 때는 정원도 미리 본다(일찍 거절). `lock` 이면 학급 줄만 잠그고 정원은
 * joinClass 가 잠근 **뒤의 다음 문장**에서 센다 — 잠그는 문장 안의 하위 질의는 문장 시작 때의 스냅숏을 써서 잠금을
 * 기다리는 동안 먼저 끝난 가입을 보지 못한다(READ COMMITTED, 정원 초과가 났었다).
 */
async function assertClassOpen(tx: Queryable, by: { code: string } | { id: string }, lock: boolean): Promise<{ id: string; maxStudents: number }> {
  const [column, value] = 'code' in by ? ['code', by.code] : ['id', by.id];
  const result = await tx.query<{ id: string; code_open: boolean; max_students: number }>(
    `select id, code_open, max_students from web.classes where ${column} = $1${lock ? ' for update' : ''}`,
    [value],
  );
  const cls = result.rows[0];
  if (!cls) throw 'code' in by ? new ApiError(404, 'invalid_class_code', '학급 코드를 찾지 못했어요. 선생님께 받은 코드 6자를 확인해 주세요.') : notFoundClass();
  if (!cls.code_open) throw new ApiError(403, 'class_closed', '이 학급은 지금 학생을 받지 않아요. 선생님께 알려 주세요.');
  if (!lock) {
    const count = await tx.query<{ n: number }>(`select count(*)::int as n from web.members where class_id = $1 and role = 'student'`, [cls.id]);
    if (count.rows[0]!.n >= cls.max_students) throw classFull();
  }
  return { id: cls.id, maxStudents: cls.max_students };
}

/**
 * 정원을 세면서 넣는다 — 학급 줄 잠금(assertClassOpen lock) 뒤 커밋 전 마지막 문장으로 둔다. 같은 학급의 동시 가입이
 * 그 잠금에 한 줄로 서므로, 잠근 뒤에는 이 한 문장과 커밋만 둔다(한 반 40명이 한꺼번에 들어올 때 기다림이 짧다).
 */
async function joinClass(tx: Queryable, cls: { id: string; maxStudents: number }, userId: string): Promise<void> {
  const joined = await tx.query(
    `insert into web.members (class_id, user_id, role)
     select $1, $2, 'student' where (select count(*) from web.members where class_id = $1 and role = 'student') < $3`,
    [cls.id, userId, cls.maxStudents],
  );
  if (!joined.rowCount) throw classFull();
}

export async function login(deps: Deps, raw: unknown, ip: string): Promise<{ account: AccountView; token: string }> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const idCheck = checkLoginId(body.loginId);
  const password = typeof body.password === 'string' ? body.password : '';
  const invalid = () => new ApiError(401, 'invalid_credentials', '아이디나 비밀번호가 맞지 않아요.');
  if (!idCheck.ok || password.length === 0) throw invalid();
  const loginId = idCheck.value;

  const ipHit = deps.limits.loginPerIp.hit(ip);
  if (!ipHit.ok) throw new ApiError(429, 'rate_limited', '로그인 요청이 많아요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: ipHit.retryAfterSec });
  const locked = deps.limits.loginLockout.lockedFor(loginId);
  if (locked > 0) throw new ApiError(429, 'login_locked', `비밀번호를 여러 번 틀려 잠겼어요. ${locked}초 뒤 다시 해 주세요.`, { retryAfterSec: locked });

  const failed = () => {
    const lockedNow = deps.limits.loginLockout.fail(loginId);
    if (lockedNow > 0) return new ApiError(429, 'login_locked', `비밀번호를 5번 틀려 1분 동안 잠겼어요.`, { retryAfterSec: lockedNow });
    return invalid();
  };

  const found = await deps.db.query<{ user_id: string; display_name: string; kind: 'teacher' | 'student'; verifier: string | null }>(
    `select a.user_id, a.display_name, a.kind, v.verifier
       from web.accounts a left join web.password_verifiers v on v.user_id = a.user_id
      where a.login_id = $1`,
    [loginId],
  );
  const row = found.rows[0];
  if (!row) throw failed();
  const userId = row.user_id;

  if (row.verifier !== null) {
    // 검증값이 있으면 GoTrue 를 부르지 않는다(GoTrue 의 IP 당 로그인 상한 회피).
    if (!(await matchesVerifier(password, row.verifier))) throw failed();
  } else {
    // 0004 전에 만든 계정 — GoTrue 로 확인하고, 맞으면 검증값을 채운다(다음부터는 위 길).
    let authUserId: string;
    try {
      authUserId = await deps.auth.verifyPassword(loginIdToEmail(loginId), password, ip);
    } catch (error) {
      if (error instanceof AuthRejectedError) throw failed();
      if (error instanceof AuthUnavailableError) throw authUnavailable(error);
      throw error;
    }
    if (authUserId !== userId) throw new ApiError(500, 'internal', '계정 정보가 맞지 않아요. 선생님께 알려 주세요.');
    await saveVerifier(deps.db, userId, await makeVerifier(password), 'keep').catch((e: Error) =>
      console.error('[login] 비밀번호 검증값 옮겨 담기 실패:', e.message),
    );
  }
  deps.limits.loginLockout.succeed(loginId);
  const token = await createSession(deps.db, userId);
  return { account: { userId, loginId, displayName: row.display_name, kind: row.kind }, token };
}

/** 내 정보 · 다음 화면(설계 §2): 학급이 없으면 학급 고르기, 모둠이 없거나 이름 전이면 사옥 지구, 등기 뒤면 전광판. */
export async function me(db: Pool, account: AccountView): Promise<MeResponse> {
  if (account.kind === 'teacher') return { account, next: 'teacher' };
  const member = await db.query<{ team_id: string | null; class_id: string; avatar: Avatar | null }>(
    `select team_id, class_id, avatar from web.members where user_id = $1 and role = 'student'`,
    [account.userId],
  );
  const row = member.rows[0];
  if (!row) return { account, next: 'enroll', team: null, avatar: null };
  const cls = await db.query<ClassRow>(`${CLASS_SELECT} where c.id = $1`, [row.class_id]);
  const team = row.team_id ? await loadTeam(db, row.team_id) : null;
  const labs = row.team_id ? await loadLabProgress(db, row.team_id) : undefined;
  return {
    account,
    next: team?.registeredAt ? 'board' : 'district',
    avatar: row.avatar,
    class: classSummary(cls.rows[0]!),
    team,
    ...(labs ? { labs } : {}),
    openTracks: await loadOpenTracks(db, row.class_id),
  };
}

/**
 * '연구소 고르기' 화면의 진행 칩(항체 설계 §1.3 · §1.4) — 두 랩의 진행.
 * 저분자 `total` 은 **`STEP_IDS.length`**(박아 두면 단계가 늘 때 진행 칩이 멈춘다).
 */
async function loadLabProgress(db: Pool, teamId: string): Promise<{ drug: LabProgress; antibody: LabProgress }> {
  const drug = await db.query<{ done: number; opened: boolean }>(
    `select count(distinct j.step)::int as done, exists (select 1 from web.programs p where p.team_id = $1) as opened
       from web.jobs j where j.team_id = $1 and j.status = 'succeeded'`,
    [teamId],
  );
  const ab = await db.query<{ opened: boolean; steps: number; submitted: number }>(
    `select exists (select 1 from web.antibody_programs p where p.team_id = $1) as opened,
            (select count(distinct j.step)::int from web.antibody_jobs j where j.team_id = $1 and j.status = 'succeeded') as steps,
            (select count(*)::int from web.antibody_scores s where s.team_id = $1) as submitted`,
    [teamId],
  );
  const abRow = ab.rows[0];
  const confirmed = await db.query<{ n: number }>(
    'select count(*)::int as n from web.antibody_programs where team_id = $1 and antigen_target is not null and parent_vh is not null',
    [teamId],
  );
  // 끝난 항체 단계 — A1(확정) + 성공한 작업 단계 수 + A3(설계 1건 이상) + A6(제출 1건 이상).
  const designs = await db.query<{ n: number }>(`select count(*)::int as n from web.antibody_designs where team_id = $1 and origin = 'student'`, [teamId]);
  const abDone =
    (confirmed.rows[0]!.n > 0 ? 1 : 0) + (abRow?.steps ?? 0) + (designs.rows[0]!.n > 0 ? 1 : 0) + ((abRow?.submitted ?? 0) > 0 ? 1 : 0);
  return {
    drug: { opened: drug.rows[0]?.opened ?? false, doneCount: drug.rows[0]?.done ?? 0, total: STEP_IDS.length },
    antibody: { opened: abRow?.opened ?? false, doneCount: Math.min(ANTIBODY_STEP_IDS.length, abDone), total: ANTIBODY_STEP_IDS.length },
  };
}

/**
 * 교사가 열어 둔 트랙 — 없는 트랙의 섬은 흐림 + 이유 문구로 그린다(항체 설계 §1.4).
 * 저장 값은 0020 check 가 정한 `{small,antibody}` 라서 여기서 기반 축(`TrackId` — `drug`)으로 옮긴다.
 */
async function loadOpenTracks(db: Pool, classId: string): Promise<TrackId[]> {
  const rows = await db.query<{ open_tracks: string[] }>('select open_tracks from web.antibody_class_settings where class_id = $1', [classId]);
  const tracks = rows.rows[0]?.open_tracks;
  if (!tracks) return [...TRACK_IDS];
  const mapped = tracks.map((t) => (t === 'small' ? 'drug' : t));
  return TRACK_IDS.filter((t) => mapped.includes(t));
}

/** 사옥 지구 캐릭터(직책 배지) — 능력치 · 잠금은 없고 비교표 · 노트 · 접속 표시에 쓴다(설계 §4.2). */
export async function setAvatar(db: Pool, account: AccountView, raw: unknown): Promise<MeResponse> {
  if (account.kind !== 'student') throw new ApiError(403, 'forbidden', '학생 계정으로 해 주세요.');
  const avatar = ((raw ?? {}) as Record<string, unknown>).avatar;
  if (!AVATARS.includes(avatar as Avatar)) throw badRequest('캐릭터는 ceo · cso · cto · cmo 중 하나예요.');
  const updated = await db.query(`update web.members set avatar = $2 where user_id = $1 and role = 'student'`, [account.userId, avatar]);
  if (!updated.rowCount) throw new ApiError(403, 'forbidden', '학급에 가입한 학생이 아니에요.');
  return me(db, account);
}

/** 교사 계정 발급 · 비밀번호 다시 정하기(관리 스크립트 — 교사 화면 가입은 당분간 닫음). */
export async function createTeacher(
  db: Pool,
  auth: AuthClient,
  input: { loginId: string; displayName: string; password: string; resetPassword: boolean },
): Promise<{ userId: string; created: boolean }> {
  return withTx(db, async (tx) => {
    await tx.query('select pg_advisory_xact_lock(hashtext($1))', [accountLock(input.loginId)]);
    const existing = await tx.query<{ user_id: string; kind: string }>('select user_id, kind from web.accounts where login_id = $1', [input.loginId]);
    const row = existing.rows[0];
    if (row) {
      if (row.kind !== 'teacher') throw new Error(`아이디 ${input.loginId} 는 학생 계정입니다.`);
      if (!input.resetPassword) throw new Error(`아이디 ${input.loginId} 교사 계정이 이미 있습니다. 비밀번호를 바꾸려면 --reset-password.`);
      await changePassword(db, auth, row.user_id, input.password);
      await tx.query('update web.accounts set display_name = $2 where user_id = $1', [row.user_id, input.displayName]);
      await tx.query('delete from web.sessions where user_id = $1', [row.user_id]);
      return { userId: row.user_id, created: false };
    }
    const { userId, created } = await auth.createOrAttach({
      email: loginIdToEmail(input.loginId),
      password: input.password,
      metadata: { app: 'crista-web', login_id: input.loginId, display_name: input.displayName, kind: 'teacher' },
    });
    try {
      await tx.query(`insert into web.accounts (user_id, login_id, display_name, kind) values ($1, $2, $3, 'teacher')`, [userId, input.loginId, input.displayName]);
      await saveVerifier(tx, userId, await makeVerifier(input.password), 'replace');
    } catch (error) {
      if (created) await auth.deleteUser(userId).catch(() => {});
      throw error;
    }
    return { userId, created: true };
  });
}
