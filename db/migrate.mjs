#!/usr/bin/env node
/**
 * web 스키마 마이그레이션 실행기(설계 §7.2) — Supabase CLI 마이그레이션을 쓰지 않는다(crista 의 m2~v11 이력과 섞이지 않게).
 *
 *   node db/migrate.mjs            밀린 파일 적용
 *   node db/migrate.mjs --status   적용 상태만
 *   node db/migrate.mjs --dry-run  밀린 SQL 을 보이기만(적용 안 함)
 *   node db/migrate.mjs --reset-role-password   crista_web 비밀번호를 WEB_DATABASE_URL 의 값으로 다시 맞춘다(관리자 연결)
 *
 * 루트 스크립트가 `tools/with-local-env.mjs` 로 감싸 로컬 값을 싣는다(`npm run db:migrate:local`).
 *
 * 환경 변수
 *   WEB_TARGET            local | hosted — local 이면 모든 주소가 127.0.0.1 · localhost 여야 한다.
 *   CRISTA_DATABASE_URL   관리자 연결 — 0000_bootstrap 과 --reset-role-password 에만 쓴다.
 *   WEB_DATABASE_URL      crista_web 연결 — 0001 부터. 이 주소의 비밀번호가 crista_web 의 비밀번호가 된다.
 *   WEB_PGSSLROOTCERT     hosted 에서 verify-full 로 확인할 CA 파일.
 *
 * 규칙
 *   - db/migrations/NNNN_이름.sql 을 이름순으로 파일마다 한 트랜잭션. 기록은 web.schema_migrations(version, name, checksum, applied_at).
 *   - 이미 적용한 파일의 SHA-256 이 바뀌었으면 아무것도 적용하지 않고 멈춘다.
 *   - hosted 는 --dry-run · --status 만 된다. 실제 적용은 W6 에서 사용자 확인 뒤 --yes-hosted 를 붙인다.
 *   - 비밀번호 · 연결 문자열은 출력하지 않는다(호스트 · 사용자 이름만).
 */
import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, 'migrations');
const BOOTSTRAP = '0000';
const ROLE = 'crista_web';
const LOCK_KEY = 'crista-web:migrate';

const log = (message) => process.stderr.write(`[migrate] ${message}\n`);
function fail(message) {
  log(message);
  process.exit(1);
}

const { values: flags } = parseArgs({
  options: {
    status: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'reset-role-password': { type: 'boolean', default: false },
    'yes-hosted': { type: 'boolean', default: false },
  },
  strict: true,
});

const target = process.env.WEB_TARGET;
if (target !== 'local' && target !== 'hosted') fail('WEB_TARGET 이 local · hosted 가 아닙니다. `npm run db:migrate:local` 로 실행하세요.');

// ── 파일 ──

function loadFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((file) => {
      const m = /^(\d{4})_([a-z0-9_]+)\.sql$/.exec(file);
      if (!m) fail(`파일 이름이 NNNN_이름.sql 이 아닙니다: ${file}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      return { version: m[1], name: m[2], file, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
}

// ── 연결 ──

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function describe(url) {
  const u = new URL(url);
  return `${decodeURIComponent(u.username)}@${u.hostname}:${u.port || 5432}${u.pathname}`;
}

function pgConfig(url, label) {
  let u;
  try {
    u = new URL(url);
  } catch {
    fail(`${label} 가 연결 문자열 형식이 아닙니다.`);
  }
  if (target === 'local') {
    if (!LOOPBACK.has(u.hostname)) fail(`WEB_TARGET=local 인데 ${label} 의 호스트가 로컬이 아닙니다(${u.hostname}). 호스팅 DB 는 W6 에서만.`);
    return { connectionString: url, ssl: false, application_name: 'crista-web-migrate' };
  }
  // hosted — 연결 문자열의 sslmode 는 빼고 CA 로 verify-full(pg 는 연결 문자열 값이 ssl 옵션을 덮어쓴다).
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) u.searchParams.delete(key);
  const caPath = process.env.WEB_PGSSLROOTCERT;
  if (!caPath) fail('hosted 는 WEB_PGSSLROOTCERT(CA 파일)가 필요합니다.');
  const ca = readFileSync(resolve(here, '..', caPath), 'utf8');
  return { connectionString: u.toString(), ssl: { ca, rejectUnauthorized: true }, application_name: 'crista-web-migrate' };
}

async function connect(url, label) {
  const client = new pg.Client(pgConfig(url, label));
  try {
    await client.connect();
  } catch (error) {
    throw Object.assign(new Error(`${label}(${describe(url)}) 연결 실패: ${error.code ?? ''} ${error.message}`), { pgCode: error.code });
  }
  return client;
}

// ── crista_web 비밀번호 — SCRAM-SHA-256 검증값을 여기서 만든다(평문을 SQL 로 보내지 않는다) ──

function rolePassword() {
  const url = process.env.WEB_DATABASE_URL;
  if (!url) fail('WEB_DATABASE_URL 이 없습니다.');
  const u = new URL(url);
  if (decodeURIComponent(u.username).split('.')[0] !== ROLE) fail(`WEB_DATABASE_URL 의 사용자가 ${ROLE} 이 아닙니다.`);
  const password = decodeURIComponent(u.password);
  // SASLprep 을 따로 하지 않으려고 ASCII 만 받는다.
  if (password.length < 24 || !/^[\x21-\x7e]+$/.test(password)) fail('crista_web 비밀번호는 출력 가능한 ASCII 24자 이상이어야 합니다.');
  return password;
}

function scramVerifier(password, iterations = 4096) {
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

// 검증값은 base64 · 숫자 · `$:` 뿐이라 따옴표가 들어갈 수 없다.
const alterRolePasswordSql = (verifier) => `alter role ${ROLE} password '${verifier}'`;

// ── 상태 ──

async function readApplied(client) {
  const exists = await client.query(`select to_regclass('web.schema_migrations') is not null as ok`);
  if (!exists.rows[0].ok) return new Map();
  const rows = await client.query('select version, name, checksum, applied_at, applied_by from web.schema_migrations order by version');
  return new Map(rows.rows.map((row) => [row.version, row]));
}

async function applyOne(client, file, extraSql = []) {
  await client.query('begin');
  try {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [LOCK_KEY]);
    const already = (await readApplied(client)).get(file.version);
    if (already) {
      await client.query('rollback');
      if (already.checksum !== file.checksum) fail(`${file.file} 가 다른 실행에서 다른 체크섬으로 적용됐습니다.`);
      log(`${file.file} — 다른 실행이 먼저 적용함, 넘어감`);
      return;
    }
    await client.query(file.sql);
    for (const sql of extraSql) await client.query(sql);
    await client.query('insert into web.schema_migrations (version, name, checksum) values ($1, $2, $3)', [file.version, file.name, file.checksum]);
    await client.query('commit');
    log(`${file.file} 적용(${describe(process.env[file.version === BOOTSTRAP ? 'CRISTA_DATABASE_URL' : 'WEB_DATABASE_URL'])})`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function main() {
  const files = loadFiles();
  if (files[0]?.version !== BOOTSTRAP) fail(`첫 파일이 ${BOOTSTRAP}_bootstrap.sql 이 아닙니다.`);
  const adminUrl = process.env.CRISTA_DATABASE_URL;
  const webUrl = process.env.WEB_DATABASE_URL;
  if (!webUrl) fail('WEB_DATABASE_URL 이 없습니다.');
  pgConfig(webUrl, 'WEB_DATABASE_URL'); // 대상 확인을 먼저
  if (adminUrl) pgConfig(adminUrl, 'CRISTA_DATABASE_URL');

  // 상태는 관리자 연결이 있으면 그것으로(부트스트랩 전에는 crista_web 이 없다), 없으면 crista_web 으로 읽는다.
  const reader = adminUrl ? await connect(adminUrl, 'CRISTA_DATABASE_URL') : await connect(webUrl, 'WEB_DATABASE_URL');
  let applied;
  try {
    applied = await readApplied(reader);
  } finally {
    await reader.end();
  }

  const changed = files.filter((f) => applied.has(f.version) && applied.get(f.version).checksum !== f.checksum);
  const unknown = [...applied.keys()].filter((v) => !files.some((f) => f.version === v));
  const pending = files.filter((f) => !applied.has(f.version));

  log(`대상 ${target} · 적용 ${applied.size} · 밀림 ${pending.length}`);
  for (const f of files) {
    const row = applied.get(f.version);
    const mark = !row ? '대기' : row.checksum === f.checksum ? '적용' : '체크섬 다름';
    log(`  ${f.file.padEnd(28)} ${mark}${row ? ` · ${new Date(row.applied_at).toISOString()} · ${row.applied_by}` : ''}`);
  }
  for (const v of unknown) log(`  ${v} — DB 에는 있고 파일이 없음`);
  if (changed.length > 0) fail(`적용한 파일이 바뀌었습니다: ${changed.map((f) => f.file).join(', ')} — 새 번호의 파일로 고치세요.`);
  if (flags.status) return;

  if (flags['reset-role-password']) {
    if (!adminUrl) fail('--reset-role-password 는 CRISTA_DATABASE_URL(관리자)이 필요합니다.');
    if (target === 'hosted' && !flags['yes-hosted']) fail('hosted 비밀번호 변경은 W6 에서 사용자 확인 뒤 --yes-hosted 로.');
    const admin = await connect(adminUrl, 'CRISTA_DATABASE_URL');
    try {
      await admin.query(alterRolePasswordSql(scramVerifier(rolePassword())));
      log(`${ROLE} 비밀번호를 WEB_DATABASE_URL 값으로 맞췄습니다.`);
    } finally {
      await admin.end();
    }
    return;
  }

  if (pending.length === 0) {
    log('밀린 파일 없음.');
    return;
  }

  if (flags['dry-run']) {
    for (const f of pending) {
      process.stdout.write(`-- ===== ${f.file} (${f.version === BOOTSTRAP ? '관리자 연결' : `${ROLE} 연결`}) sha256=${f.checksum}\n${f.sql}\n`);
      if (f.version === BOOTSTRAP) process.stdout.write(`-- 실행기가 이어서: alter role ${ROLE} password '<SCRAM-SHA-256 검증값>'\n`);
      process.stdout.write(`-- 실행기가 이어서: insert into web.schema_migrations (version, name, checksum) values ('${f.version}', '${f.name}', '${f.checksum}')\n\n`);
    }
    log('--dry-run — 적용하지 않았습니다.');
    return;
  }

  if (target === 'hosted' && !flags['yes-hosted']) fail('hosted 적용은 W6 에서 --dry-run 을 보인 뒤 사용자 확인을 받고 --yes-hosted 로.');

  const bootstrap = pending.find((f) => f.version === BOOTSTRAP);
  if (bootstrap) {
    if (!adminUrl) fail('0000_bootstrap 은 CRISTA_DATABASE_URL(관리자 연결)이 필요합니다.');
    const admin = await connect(adminUrl, 'CRISTA_DATABASE_URL');
    try {
      await applyOne(admin, bootstrap, [alterRolePasswordSql(scramVerifier(rolePassword()))]);
    } finally {
      await admin.end();
    }
  }

  const rest = pending.filter((f) => f.version !== BOOTSTRAP);
  if (rest.length === 0) return;
  const web = await connect(webUrl, 'WEB_DATABASE_URL');
  try {
    const who = await web.query('select current_user as u');
    if (who.rows[0].u !== ROLE) fail(`WEB_DATABASE_URL 이 ${ROLE} 이 아니라 ${who.rows[0].u} 로 붙었습니다.`);
    for (const f of rest) await applyOne(web, f);
  } finally {
    await web.end();
  }
}

main().catch((error) => fail(error.message));
