import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, test } from 'node:test';
import { generateClassCode } from '../src/classes.ts';
import { ConfigError, loadConfig } from '../src/config.ts';
import { clientIp, isCrossSite, parseCookies, Router, serializeCookie } from '../src/http.ts';
import { makeVerifier, matchesVerifier } from '../src/passwords.ts';
import { LoginLockout, WindowLimiter } from '../src/rate-limit.ts';
import { hashToken } from '../src/sessions.ts';
import { resolveStaticPath } from '../src/static.ts';
import { CLASS_CODE_PATTERN } from '@crista-web/web-contract';

const fakeReq = (headers: Record<string, string>, remote = '10.0.0.1') => ({ headers, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;

describe('경로표', () => {
  const router = new Router<null>()
    .on('GET', '/api/me', async () => 'me')
    .on('POST', '/api/teams/:teamId/join', async () => 'join');
  const id = '8f14e45f-ceea-467f-a0e6-2c8a7d3b1a20';

  test('인자 · 방법 불일치 · 없는 경로', () => {
    const hit = router.match('POST', `/api/teams/${id.toUpperCase()}/join`);
    assert.ok(hit && hit !== 'method');
    assert.deepEqual(hit.params, { teamId: id });
    assert.equal(router.match('GET', `/api/teams/${id}/join`), 'method');
    assert.equal(router.match('GET', '/api/nope'), null);
  });
  test('…Id 인자는 UUID 만', () => {
    assert.equal(router.match('POST', '/api/teams/1%20or%201=1/join'), null);
    assert.equal(router.match('POST', '/api/teams/../join'), null);
  });
});

describe('쿠키', () => {
  test('읽기 — 첫 값 · 따옴표 · 깨진 값 무시', () => {
    assert.deepEqual(parseCookies('a=1; crista_web_sid="abc"; a=2; bad=%E0%A4%A'), { a: '1', crista_web_sid: 'abc' });
    assert.deepEqual(parseCookies(undefined), {});
  });
  test('쓰기 — HttpOnly · SameSite=Lax · 호스팅은 Secure', () => {
    assert.equal(serializeCookie('s', 'v', { maxAgeSec: 60, secure: false }), 's=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=60');
    assert.match(serializeCookie('s', 'v', { maxAgeSec: 60, secure: true }), /; Secure$/);
  });
});

describe('요청 출처', () => {
  const allowed = ['http://localhost:5190'];
  test('허용 목록 밖의 Origin · cross-site 는 거절, Origin 없음(같은 출처 GET 등)은 통과', () => {
    assert.equal(isCrossSite(fakeReq({ origin: 'http://localhost:5190' }), allowed), false);
    assert.equal(isCrossSite(fakeReq({ origin: 'https://evil.example' }), allowed), true);
    assert.equal(isCrossSite(fakeReq({ 'sec-fetch-site': 'cross-site' }), allowed), true);
    assert.equal(isCrossSite(fakeReq({}), allowed), false);
  });
  test('X-Forwarded-For 는 프록시를 믿을 때만', () => {
    const req = fakeReq({ 'x-forwarded-for': '1.2.3.4, 10.0.0.2' });
    assert.equal(clientIp(req, false), '10.0.0.1');
    assert.equal(clientIp(req, true), '1.2.3.4');
  });
});

describe('남용 방지', () => {
  test('고정 창 — 한도를 넘으면 남은 초', () => {
    let now = 0;
    const limiter = new WindowLimiter(2, 60_000, () => now);
    assert.deepEqual(limiter.hit('ip'), { ok: true });
    assert.deepEqual(limiter.hit('ip'), { ok: true });
    assert.deepEqual(limiter.hit('ip'), { ok: false, retryAfterSec: 60 });
    now = 60_000;
    assert.deepEqual(limiter.hit('ip'), { ok: true });
  });
  test('로그인 — 5회 실패면 1분 잠금, 풀리면 새로 센다, 성공하면 지운다', () => {
    let now = 0;
    const lock = new LoginLockout(5, 60_000, () => now);
    for (let i = 0; i < 4; i += 1) assert.equal(lock.fail('kim01'), 0);
    assert.equal(lock.lockedFor('kim01'), 0);
    assert.equal(lock.fail('kim01'), 60);
    assert.equal(lock.lockedFor('kim01'), 60);
    now = 30_000;
    assert.equal(lock.lockedFor('kim01'), 30);
    now = 60_000;
    assert.equal(lock.lockedFor('kim01'), 0);
    assert.equal(lock.fail('kim01'), 0);
    lock.succeed('kim01');
    for (let i = 0; i < 4; i += 1) lock.fail('kim01');
    assert.equal(lock.lockedFor('kim01'), 0);
  });
});

describe('정적 파일 경로', () => {
  test('폴더 밖으로 나가지 않는다', () => {
    assert.equal(resolveStaticPath('/srv/web', '/index.html'), '/srv/web/index.html');
    assert.equal(resolveStaticPath('/srv/web', '/'), '/srv/web/');
    assert.equal(resolveStaticPath('/srv/web', '/../secret'), null);
    assert.equal(resolveStaticPath('/srv/web', '/%2e%2e/secret'), null);
    assert.equal(resolveStaticPath('/srv/web', '/a%00b'), null);
    assert.equal(resolveStaticPath('/srv/web', '/%E0%A4%A'), null);
  });
});

describe('학급 코드 · 세션 토큰', () => {
  test('만든 코드는 늘 규칙에 맞는다', () => {
    for (let i = 0; i < 500; i += 1) assert.match(generateClassCode(), CLASS_CODE_PATTERN);
  });
  test('토큰 해시는 32바이트', () => {
    assert.equal(hashToken('x').length, 32);
  });
});

describe('비밀번호 검증값(0004)', () => {
  test('맞는 비밀번호만 통과 · 소금이 달라 같은 비밀번호도 값이 다르다 · 0004 표의 형식 검사를 지난다', async () => {
    const password = '학생비번 pass-1234';
    const a = await makeVerifier(password);
    const b = await makeVerifier(password);
    assert.notEqual(a, b);
    assert.match(a, /^scrypt\$[0-9]{2}\$[0-9]{1,2}\$[0-9]{1,2}\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    assert.ok(a.length <= 200);
    assert.equal(a.includes(password), false);
    assert.equal(await matchesVerifier(password, a), true);
    assert.equal(await matchesVerifier(password, b), true);
    assert.equal(await matchesVerifier('학생비번 pass-1235', a), false);
    assert.equal(await matchesVerifier('', a), false);
  });
  test('깨진 값 · 범위 밖 비용은 거절(예외 없이 false)', async () => {
    const good = await makeVerifier('password1');
    const [, logN, r, p, salt, key] = good.split('$');
    assert.equal(await matchesVerifier('password1', 'bcrypt$10$abc'), false);
    assert.equal(await matchesVerifier('password1', `scrypt$${logN}$${r}$${p}$${salt}$${key!.slice(4)}`), false);
    assert.equal(await matchesVerifier('password1', `scrypt$30$${r}$${p}$${salt}$${key}`), false);
    assert.equal(await matchesVerifier('password1', `scrypt$${logN}$${r}$9$${salt}$${key}`), false);
  });
});

describe('설정 경계', () => {
  const base = {
    WEB_TARGET: 'local',
    WEB_DATABASE_URL: 'postgresql://crista_web:pw@127.0.0.1:55322/postgres',
    SUPABASE_URL: 'http://127.0.0.1:55321',
    SUPABASE_PUBLISHABLE_KEY: 'p',
    SUPABASE_SECRET_KEY: 's',
  };
  test('로컬 — 루프백에만 묶고 Secure 쿠키 없음', () => {
    const config = loadConfig(base);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.port, 3390);
    assert.equal(config.secureCookies, false);
    assert.ok(config.allowedOrigins.includes('http://localhost:5190'));
  });
  test('로컬인데 호스팅 주소면 시작하지 않는다', () => {
    assert.throws(() => loadConfig({ ...base, SUPABASE_URL: 'https://abc.supabase.co' }), ConfigError);
    assert.throws(() => loadConfig({ ...base, WEB_DATABASE_URL: 'postgresql://crista_web:pw@aws-0.pooler.supabase.com:5432/postgres' }), ConfigError);
  });
  test('전용 역할이 아니면 · 게임 도메인이면 시작하지 않는다', () => {
    assert.throws(() => loadConfig({ ...base, WEB_DATABASE_URL: 'postgresql://postgres:pw@127.0.0.1:55322/postgres' }), ConfigError);
    assert.throws(() => loadConfig({ ...base, WEB_AUTH_EMAIL_DOMAIN: 'students.crista.test' }), ConfigError);
    assert.throws(() => loadConfig({ ...base, WEB_TARGET: undefined }), ConfigError);
  });
  test('호스팅은 Origin 허용 목록이 있어야 시작한다', () => {
    assert.throws(() => loadConfig({ ...base, WEB_TARGET: 'hosted' }), /WEB_ALLOWED_ORIGINS/);
  });
});
