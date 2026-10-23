/**
 * 로그인 세션(설계 §3) — 쿠키에는 무작위 32바이트 토큰(HttpOnly), DB 에는 그 SHA-256 만 둔다.
 * 7일 동안 쓰지 않으면 끝난다(쓸 때마다 늘린다 — 10분에 한 번만 DB 에 적는다).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { AccountView } from '@crista-web/web-contract';
import type { Pool, Queryable } from './db.ts';

export const SESSION_TTL_SEC = 7 * 24 * 60 * 60;
const TOUCH_EVERY_MS = 10 * 60 * 1000;

export const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest();

export interface Session {
  tokenHash: Buffer;
  account: AccountView;
}

export async function createSession(db: Queryable, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.query('insert into web.sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(secs => $3))', [
    hashToken(token),
    userId,
    SESSION_TTL_SEC,
  ]);
  return token;
}

interface SessionRow {
  user_id: string;
  login_id: string;
  display_name: string;
  kind: 'teacher' | 'student';
  last_seen_at: Date;
}

export async function lookupSession(db: Pool, token: string | undefined): Promise<Session | null> {
  if (!token || token.length < 40 || token.length > 64) return null;
  const tokenHash = hashToken(token);
  const result = await db.query<SessionRow>(
    `select s.user_id, a.login_id, a.display_name, a.kind, s.last_seen_at
       from web.sessions s join web.accounts a on a.user_id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (Date.now() - row.last_seen_at.getTime() > TOUCH_EVERY_MS) {
    await db.query('update web.sessions set last_seen_at = now(), expires_at = now() + make_interval(secs => $2) where token_hash = $1', [
      tokenHash,
      SESSION_TTL_SEC,
    ]);
  }
  return { tokenHash, account: { userId: row.user_id, loginId: row.login_id, displayName: row.display_name, kind: row.kind } };
}

export async function deleteSession(db: Queryable, tokenHash: Buffer): Promise<void> {
  await db.query('delete from web.sessions where token_hash = $1', [tokenHash]);
}

export async function sweepExpiredSessions(db: Queryable): Promise<number> {
  const result = await db.query('delete from web.sessions where expires_at <= now()');
  return result.rowCount ?? 0;
}
