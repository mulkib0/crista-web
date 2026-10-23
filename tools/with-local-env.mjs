#!/usr/bin/env node
/**
 * 로컬 Supabase(crista 의 것) 접속 정보만 환경 변수로 실어 명령을 실행한다 — crista `tools/with-supabase-env.mjs` 를 옮겼다.
 *
 *   node tools/with-local-env.mjs <명령> [인자...]
 *
 * - crista 폴더(`CRISTA_REPO`, 기본 ../crista)에서 `supabase status -o env` 를 읽는다. 키를 파일에 쓰거나 출력하지 않는다.
 * - `.env.local` 의 SUPABASE_URL · SUPABASE_SECRET_KEY · DATABASE_URL · CRISTA_DATABASE_URL 은 **호스팅 값**이다.
 *   이 도구는 그 파일의 값을 싣지 않고, 셸에 같은 이름이 있어도 **로컬 값으로 덮어쓰며**, 호스팅 전용 이름은 지운다.
 * - crista_web 로컬 비밀번호는 `.env.local` 의 `WEB_LOCAL_DB_PASSWORD` 한 줄(없으면 무작위로 만들어 덧붙인다 — 로컬 전용).
 *
 *   WEB_TARGET=local
 *   SUPABASE_URL              ← API_URL (127.0.0.1:55321)
 *   SUPABASE_PUBLISHABLE_KEY  ← PUBLISHABLE_KEY (없으면 ANON_KEY) — 비밀번호 확인
 *   SUPABASE_SECRET_KEY       ← SECRET_KEY (없으면 SERVICE_ROLE_KEY) — 웹 계정 발급(서버 전용)
 *   CRISTA_DATABASE_URL       ← DB_URL — 관리자 연결, 0000_bootstrap 에만
 *   WEB_DATABASE_URL          ← DB_URL 의 호스트 · 포트 · DB + crista_web + WEB_LOCAL_DB_PASSWORD
 *   ANTHROPIC_API_KEY         ← `.env.local` 의 그 한 줄(파이프라인 LLM — 설계 §5.13). 셸에 같은 이름이 있어도 이 파일 값만 넘긴다(없으면 넘기지 않음).
 *                               `ANTHROPIC_AUTH_TOKEN` 은 넘기지 않는다(SDK 가 다른 자격으로 과금하지 않게). 값은 출력하지 않는다.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('사용법: node tools/with-local-env.mjs <명령> [인자...]');
  process.exit(2);
}

const cristaRepo = resolve(root, process.env.CRISTA_REPO ?? '../crista');
const status = spawnSync('supabase', ['status', '-o', 'env'], { cwd: cristaRepo, encoding: 'utf8' });
if (status.status !== 0) {
  console.error(`로컬 Supabase 가 떠 있지 않습니다(crista 폴더 ${cristaRepo}). colima 와 crista 의 \`supabase start\` 를 확인하세요.`);
  console.error(status.stderr?.trim().split('\n').filter((l) => !/=/.test(l)).join('\n') ?? '');
  process.exit(1);
}
const found = {};
for (const line of status.stdout.split('\n')) {
  const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
  if (m) found[m[1]] = m[2];
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
for (const key of ['API_URL', 'DB_URL']) {
  if (!found[key]) {
    console.error(`supabase status 에서 ${key} 를 찾지 못했습니다.`);
    process.exit(1);
  }
  if (!LOOPBACK.has(new URL(found[key]).hostname)) {
    console.error(`${key} 가 로컬 주소가 아닙니다 — 멈춥니다.`);
    process.exit(1);
  }
}

// crista_web 로컬 비밀번호 · Anthropic 키 — .env.local 에서 이 두 줄만 읽는다(다른 값은 읽지 않는다 — 호스팅 값이라서).
const envFile = join(root, '.env.local');
let webPassword = process.env.WEB_LOCAL_DB_PASSWORD;
let anthropicKey = null;
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*WEB_LOCAL_DB_PASSWORD\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
    if (m && !webPassword) webPassword = m[1];
    const k = /^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
    if (k) anthropicKey = k[1];
  }
}
if (!webPassword) {
  webPassword = randomBytes(24).toString('base64url');
  appendFileSync(envFile, `\n# crista-web 로컬 전용 — 로컬 Supabase 의 crista_web 역할 비밀번호(tools/with-local-env.mjs 가 만들었다)\nWEB_LOCAL_DB_PASSWORD=${webPassword}\n`);
  console.error('[with-local-env] .env.local 에 WEB_LOCAL_DB_PASSWORD 를 만들어 덧붙였습니다(값은 출력하지 않음).');
}

const db = new URL(found.DB_URL);
const webDb = new URL(found.DB_URL);
webDb.username = 'crista_web';
webDb.password = encodeURIComponent(webPassword);

const env = { ...process.env };
// 셸의 Anthropic 자격은 넘기지 않는다 — 서버는 .env.local 의 키만 쓴다.
delete env.ANTHROPIC_API_KEY;
delete env.ANTHROPIC_AUTH_TOKEN;
if (anthropicKey) env.ANTHROPIC_API_KEY = anthropicKey;
// 호스팅 전용 · crista 전용 이름은 넘기지 않는다.
for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_JWKS_URL', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'RUNPOD_API_KEY', 'CRISTA_WORKER_DATABASE_URL', 'CRISTA_STORE']) delete env[key];
Object.assign(env, {
  WEB_TARGET: 'local',
  SUPABASE_URL: found.API_URL,
  SUPABASE_PUBLISHABLE_KEY: found.PUBLISHABLE_KEY || found.ANON_KEY,
  SUPABASE_SECRET_KEY: found.SECRET_KEY || found.SERVICE_ROLE_KEY,
  CRISTA_DATABASE_URL: db.toString(),
  WEB_DATABASE_URL: webDb.toString(),
  WEB_PGSSLROOTCERT: '',
  WEB_AUTH_EMAIL_DOMAIN: 'web.crista.test',
});
env.WEB_PORT ??= '3390';
env.BIO_WORKER_URL ??= 'http://127.0.0.1:8790';
delete env.WEB_LOCAL_DB_PASSWORD;

const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: process.cwd() });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
