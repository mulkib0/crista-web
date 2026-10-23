/**
 * 계정 — 학생 가입(학급 코드) · 로그인 · 교사 발급 · 내 정보(설계 §3 · §9).
 *
 * 가입은 서버가 대신 만든다: 학급 코드 확인 → GoTrue 관리자 API 로 `<아이디>@web.crista.test`(email_confirm) →
 * web.accounts · web.members 를 한 트랜잭션에. 같은 아이디의 동시 가입은 권고 잠금으로 줄을 세운다
 * (그래야 '이미 있는 GoTrue 사용자에 이어 붙이기'가 진짜 고아 계정에만 일어난다).
 * DB 쓰기가 실패하면 이번에 새로 만든 GoTrue 사용자를 지운다.
 */
import {
  AVATARS,
  checkClassCode,
  checkDisplayName,
  checkLoginId,
  checkPassword,
  loginIdToEmail,
  type AccountView,
  type Avatar,
  type MeResponse,
} from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { withTx, type Pool, type Queryable } from './db.ts';
import { AuthRejectedError, AuthUnavailableError, type AuthClient } from './gotrue.ts';
import { ApiError, badRequest } from './http.ts';
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

export async function signupStudent(deps: Deps, raw: unknown, ip: string): Promise<{ account: AccountView; token: string }> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const code = take(checkClassCode(body.classCode));
  const loginId = take(checkLoginId(body.loginId));
  const displayName = take(checkDisplayName(body.displayName));
  const password = take(checkPassword(body.password));

  for (const [limiter, key] of [[deps.limits.signupPerIp, ip], [deps.limits.signupPerCode, code]] as const) {
    const hit = limiter.hit(key);
    if (!hit.ok) throw new ApiError(429, 'rate_limited', '가입 요청이 많아요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: hit.retryAfterSec });
  }

  try {
    return await withTx(deps.db, async (tx) => {
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [accountLock(loginId)]);
      const taken = await tx.query('select 1 from web.accounts where login_id = $1', [loginId]);
      if (taken.rowCount) throw new ApiError(409, 'login_id_taken', '이미 쓰는 아이디예요. 다른 아이디를 골라 주세요.');
      await assertClassOpen(tx, code, false);

      const { userId, created } = await deps.auth.createOrAttach({
        email: loginIdToEmail(loginId),
        password,
        metadata: { app: 'crista-web', login_id: loginId, display_name: displayName, kind: 'student' },
      });
      try {
        // 정원은 학급 줄을 잠그고 다시 센다(동시 가입이 정원을 넘지 않게).
        const cls = await assertClassOpen(tx, code, true);
        await tx.query(`insert into web.accounts (user_id, login_id, display_name, kind) values ($1, $2, $3, 'student')`, [userId, loginId, displayName]);
        await tx.query(`insert into web.members (class_id, user_id, role) values ($1, $2, 'student')`, [cls.id, userId]);
        const token = await createSession(tx, userId);
        return { account: { userId, loginId, displayName, kind: 'student' as const }, token };
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

/**
 * 학급 코드 확인. `lock` 이면 학급 줄을 잠근 **뒤에 따로** 학생 수를 센다 — 잠그는 문장 안의 하위 질의는
 * 문장 시작 때의 스냅숏을 써서 잠금을 기다리는 동안 먼저 끝난 가입을 보지 못한다(READ COMMITTED, 정원 초과가 났었다).
 */
async function assertClassOpen(tx: Queryable, code: string, lock: boolean): Promise<{ id: string }> {
  const result = await tx.query<{ id: string; code_open: boolean; max_students: number }>(
    `select id, code_open, max_students from web.classes where code = $1${lock ? ' for update' : ''}`,
    [code],
  );
  const cls = result.rows[0];
  if (!cls) throw new ApiError(404, 'invalid_class_code', '학급 코드를 찾지 못했어요. 선생님께 받은 코드 6자를 확인해 주세요.');
  if (!cls.code_open) throw new ApiError(403, 'class_closed', '이 학급 코드는 닫혔어요. 선생님께 새 코드를 받아 주세요.');
  const count = await tx.query<{ n: number }>(`select count(*)::int as n from web.members where class_id = $1 and role = 'student'`, [cls.id]);
  if (count.rows[0]!.n >= cls.max_students) throw new ApiError(409, 'class_full', '학급 정원이 찼어요. 선생님께 알려 주세요.');
  return { id: cls.id };
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

  const found = await deps.db.query<{ user_id: string; display_name: string; kind: 'teacher' | 'student' }>(
    'select user_id, display_name, kind from web.accounts where login_id = $1',
    [loginId],
  );
  const row = found.rows[0];
  if (!row) throw failed();

  let userId: string;
  try {
    userId = await deps.auth.verifyPassword(loginIdToEmail(loginId), password, ip);
  } catch (error) {
    if (error instanceof AuthRejectedError) throw failed();
    if (error instanceof AuthUnavailableError) throw authUnavailable(error);
    throw error;
  }
  if (userId !== row.user_id) throw new ApiError(500, 'internal', '계정 정보가 맞지 않아요. 선생님께 알려 주세요.');
  deps.limits.loginLockout.succeed(loginId);
  const token = await createSession(deps.db, userId);
  return { account: { userId, loginId, displayName: row.display_name, kind: row.kind }, token };
}

/** 내 정보 · 다음 화면(설계 §2): 모둠이 없거나 이름 전이면 사옥 지구, 등기 뒤면 전광판. */
export async function me(db: Pool, account: AccountView): Promise<MeResponse> {
  if (account.kind === 'teacher') return { account, next: 'teacher' };
  const member = await db.query<{ team_id: string | null; class_id: string; avatar: Avatar | null }>(
    `select team_id, class_id, avatar from web.members where user_id = $1 and role = 'student'`,
    [account.userId],
  );
  const row = member.rows[0];
  if (!row) return { account, next: 'district', team: null, avatar: null };
  const cls = await db.query<ClassRow>(`${CLASS_SELECT} where c.id = $1`, [row.class_id]);
  const team = row.team_id ? await loadTeam(db, row.team_id) : null;
  return {
    account,
    next: team?.registeredAt ? 'board' : 'district',
    avatar: row.avatar,
    class: classSummary(cls.rows[0]!),
    team,
  };
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

/** 교사 계정 발급(관리 스크립트 전용 — 공개 가입 없음). */
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
      await auth.setPassword(row.user_id, input.password);
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
    } catch (error) {
      if (created) await auth.deleteUser(userId).catch(() => {});
      throw error;
    }
    return { userId, created: true };
  });
}
