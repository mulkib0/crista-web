#!/usr/bin/env node
/**
 * 호스팅(W6) 값만 환경 변수로 실어 명령을 실행한다 — `tools/with-local-env.mjs` 의 짝.
 *
 *   node tools/with-hosted-env.mjs <명령> [인자...]
 *
 * - `.env.local` 에서 **필요한 이름만** 읽는다: SUPABASE_URL · SUPABASE_PUBLISHABLE_KEY · SUPABASE_SECRET_KEY · CRISTA_DATABASE_URL ·
 *   WEB_HOSTED_DB_PASSWORD · WEB_GATEWAY_SECRET. 값은 출력 · 파일 쓰기를 하지 않는다(아래 두 줄 덧붙이기만 예외).
 * - crista_web 호스팅 비밀번호(`WEB_HOSTED_DB_PASSWORD`)와 게이트웨이 비밀(`WEB_GATEWAY_SECRET`)이 없으면 무작위로 만들어
 *   `.env.local` 끝에 덧붙인다(출력하지 않는다). 그 앞부분(crista 에서 복사한 줄)은 건드리지 않는다.
 * - WEB_DATABASE_URL = CRISTA_DATABASE_URL 의 호스트 · 포트 · DB(세션 풀러 5432) + 사용자 `crista_web.<project-ref>` + 위 비밀번호.
 *   sslmode 등은 빼고 WEB_PGSSLROOTCERT(certs/supabase-prod-ca-2021.crt)로 verify-full.
 * - 셸에 같은 이름의 로컬 값이 있어도 덮어쓴다. 로컬 전용 이름(WEB_LOCAL_DB_PASSWORD)은 넘기지 않는다.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('사용법: node tools/with-hosted-env.mjs <명령> [인자...]');
  process.exit(2);
}

const envFile = join(root, '.env.local');
if (!existsSync(envFile)) {
  console.error('.env.local 이 없습니다.');
  process.exit(1);
}
const WANTED = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'CRISTA_DATABASE_URL', 'WEB_HOSTED_DB_PASSWORD', 'WEB_GATEWAY_SECRET'];
const found = {};
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*?)"?\s*$/.exec(line);
  if (m && WANTED.includes(m[1]) && m[2]) found[m[1]] = m[2];
}
for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'CRISTA_DATABASE_URL']) {
  if (!found[key]) {
    console.error(`.env.local 에 ${key} 가 없습니다.`);
    process.exit(1);
  }
}

// 출력 가능한 ASCII 32자 — 실행기는 24자 이상 · 출력 가능 ASCII 만 받는다(SASLprep 회피). URL 에 그대로 넣을 수 있게 base64url.
const make = () => randomBytes(24).toString('base64url');
for (const [key, note] of [
  ['WEB_HOSTED_DB_PASSWORD', '호스팅 Supabase 의 crista_web 역할 비밀번호'],
  ['WEB_GATEWAY_SECRET', '게이트웨이(Cloudflare Worker) ↔ Railway 서버 공유 비밀'],
]) {
  if (found[key]) continue;
  found[key] = key === 'WEB_GATEWAY_SECRET' ? randomBytes(32).toString('base64url') : make();
  appendFileSync(envFile, `\n# crista-web 호스팅 — ${note}(tools/with-hosted-env.mjs 가 만들었다)\n${key}=${found[key]}\n`);
  console.error(`[with-hosted-env] .env.local 에 ${key} 를 만들어 덧붙였습니다(값은 출력하지 않음).`);
}

const admin = new URL(found.CRISTA_DATABASE_URL);
const adminUser = decodeURIComponent(admin.username);
const ref = adminUser.includes('.') ? adminUser.slice(adminUser.indexOf('.') + 1) : null;
if (!ref || !/\.pooler\.supabase\.com$/.test(admin.hostname)) {
  console.error('CRISTA_DATABASE_URL 이 Supabase 세션 풀러(<role>.<project-ref>@*.pooler.supabase.com) 모양이 아닙니다.');
  process.exit(1);
}
if (new URL(found.SUPABASE_URL).hostname.split('.')[0] !== ref) {
  console.error('SUPABASE_URL 과 CRISTA_DATABASE_URL 의 프로젝트가 다릅니다 — 멈춥니다.');
  process.exit(1);
}
for (const u of [admin]) for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'pgbouncer']) u.searchParams.delete(key);
const web = new URL(admin.toString());
web.username = encodeURIComponent(`crista_web.${ref}`);
web.password = encodeURIComponent(found.WEB_HOSTED_DB_PASSWORD);

const env = { ...process.env };
for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_JWKS_URL', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'RUNPOD_API_KEY', 'WEB_LOCAL_DB_PASSWORD', 'WEB_HOSTED_DB_PASSWORD']) delete env[key];
Object.assign(env, {
  WEB_TARGET: 'hosted',
  SUPABASE_URL: found.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: found.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: found.SUPABASE_SECRET_KEY,
  CRISTA_DATABASE_URL: admin.toString(),
  WEB_DATABASE_URL: web.toString(),
  WEB_PGSSLROOTCERT: 'certs/supabase-prod-ca-2021.crt',
  WEB_AUTH_EMAIL_DOMAIN: 'web.crista.test',
  WEB_GATEWAY_SECRET: found.WEB_GATEWAY_SECRET,
});
env.WEB_ALLOWED_ORIGINS ??= 'https://mulk.codes';

const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: process.cwd() });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
