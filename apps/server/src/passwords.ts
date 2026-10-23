/**
 * 로그인 비밀번호 검증값(0004) — 비밀번호 확인을 이 서버 안에서 끝낸다.
 *
 * GoTrue 는 IP 당 로그인 상한(호스팅 버킷 30)을 두는데 모든 로그인이 이 서버 IP 하나에서 나가서, 한 반이 한꺼번에 들어오면
 * 30명 뒤부터 막혔다. 그래서 GoTrue 계정은 그대로 두고(가입 · 교사 발급은 계속 GoTrue 관리자 API), 비밀번호 확인만 여기서 한다.
 *
 * - 검증값: scrypt(N = 2^15, r = 8, p = 1) · 소금 16바이트 · 32바이트. 비교는 상수 시간. 평문 · 검증값은 로그 · 응답에 싣지 않는다.
 * - 검증값이 있으면 그것만 본다(GoTrue 를 부르지 않는다). 없으면(0004 전에 만든 계정) GoTrue 로 확인하고 성공하면 채운다.
 * - 비밀번호를 바꾸는 길은 `changePassword` 하나 — 지우고 → GoTrue 바꾸고 → 다시 쓴다. 중간에 끊기면 검증값이 없어 GoTrue 로 확인하므로
 *   어긋난 값이 남지 않는다. GoTrue 를 대시보드 등에서 직접 바꾸면 그 계정의 검증값 줄을 지워야 한다.
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { Queryable } from './db.ts';
import type { AuthClient } from './gotrue.ts';

const LOG_N = 15;
const R = 8;
const P = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function derive(password: string, salt: Buffer, logN: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N: 2 ** logN, r, p, maxmem: 256 * 2 ** logN * r };
  return new Promise((resolve, reject) => scrypt(password, salt, KEY_BYTES, options, (error, key) => (error ? reject(error) : resolve(key))));
}

export async function makeVerifier(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, LOG_N, R, P);
  return `scrypt$${LOG_N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** 맞으면 true. 형식이 깨졌거나 비용 값이 범위 밖이면 false(그 계정은 로그인이 막힌다 — 줄을 지우면 GoTrue 로 돌아간다). */
export async function matchesVerifier(password: string, verifier: string): Promise<boolean> {
  const m = /^scrypt\$(\d{2})\$(\d{1,2})\$(\d{1,2})\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(verifier);
  if (!m) return false;
  const [logN, r, p] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (logN < 14 || logN > 17 || r < 1 || r > 16 || p < 1 || p > 4) return false;
  const expected = Buffer.from(m[5]!, 'base64');
  if (expected.length !== KEY_BYTES) return false;
  const actual = await derive(password, Buffer.from(m[4]!, 'base64'), logN, r, p);
  return timingSafeEqual(actual, expected);
}

/** `replace` — 가입 · 재설정(새 값으로 덮는다). `keep` — GoTrue 로그인 뒤 옮겨 담기(그 사이 재설정이 쓴 값을 덮지 않는다). */
export async function saveVerifier(db: Queryable, userId: string, verifier: string, mode: 'replace' | 'keep'): Promise<void> {
  await db.query(
    `insert into web.password_verifiers (user_id, verifier) values ($1, $2)
     on conflict (user_id) do ${mode === 'replace' ? 'update set verifier = excluded.verifier, updated_at = now()' : 'nothing'}`,
    [userId, verifier],
  );
}

/** 비밀번호 바꾸기 — GoTrue 와 검증값을 함께 바꾸는 하나뿐인 길. */
export async function changePassword(db: Queryable, auth: AuthClient, userId: string, password: string): Promise<void> {
  const verifier = await makeVerifier(password);
  await db.query('delete from web.password_verifiers where user_id = $1', [userId]);
  await auth.setPassword(userId, password);
  await saveVerifier(db, userId, verifier, 'replace');
}
