#!/usr/bin/env node
/**
 * crista_web 경계 점검(설계 §7.1) — 서버 역할이 web 스키마 밖을 읽거나 쓰거나 만들 수 없는지 실제로 시도해 본다.
 *
 *   npm run db:check:local     (tools/with-local-env.mjs 가 WEB_DATABASE_URL 을 싣는다)
 *   npm run db:check:hosted    (tools/with-hosted-env.mjs — 세션 풀러, CA 로 verify-full)
 *
 * 쓰기 시도는 트랜잭션 안에서 하고 항상 되돌린다(거절이 기대값이라 실제로 바뀌는 것은 없다).
 * 하나라도 기대와 다르면 종료 코드 1.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.WEB_DATABASE_URL;
if (!url) {
  console.error('WEB_DATABASE_URL 이 없습니다.');
  process.exit(1);
}
const local = process.env.WEB_TARGET === 'local';
let ssl = false;
let connectionString = url;
if (!local) {
  // 호스팅 — 연결 문자열의 sslmode 는 빼고 CA 로 verify-full(실행기와 같은 방식).
  const u = new URL(url);
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) u.searchParams.delete(key);
  connectionString = u.toString();
  const caPath = process.env.WEB_PGSSLROOTCERT;
  if (!caPath) {
    console.error('hosted 는 WEB_PGSSLROOTCERT 가 필요합니다.');
    process.exit(1);
  }
  ssl = { ca: readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', caPath), 'utf8'), rejectUnauthorized: true };
}
const client = new pg.Client({ connectionString, ssl, application_name: 'crista-web-check' });
await client.connect();

/** [설명, SQL, 되어야 하나] */
const probes = [
  ['역할 이름', 'select current_user = \'crista_web\' as ok', true],
  ['슈퍼유저 · 역할 생성 · DB 생성 · RLS 우회 없음', 'select not (rolsuper or rolcreaterole or rolcreatedb or rolbypassrls or rolreplication) as ok from pg_roles where rolname = current_user', true],
  ['다른 역할의 구성원 아님', 'select count(*) = 0 as ok from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname = current_user', true],
  ['web.accounts 읽기', 'select count(*) >= 0 as ok from web.accounts', true],
  ['web 에 표 만들기', 'create table web._boundary_probe (x int)', true],
  ['public 게임 표 읽기', 'select count(*) from public.classes', false],
  ['public 게임 표 쓰기', 'delete from public.classes where false', false],
  ['public 에 표 만들기', 'create table public._web_boundary_probe (x int)', false],
  ['auth.users 읽기', 'select count(*) from auth.users', false],
  ['supabase_migrations 읽기', 'select count(*) from supabase_migrations.schema_migrations', false],
  ['새 스키마 만들기', 'create schema _web_boundary_probe', false],
  ['public 의 표 권한 0건', `select count(*) = 0 as ok from information_schema.role_table_grants where grantee = current_user and table_schema <> 'web'`, true],
];

let bad = 0;
for (const [label, sql, shouldPass] of probes) {
  await client.query('begin');
  let passed;
  let detail;
  try {
    const result = await client.query(sql);
    const row = result.rows[0];
    passed = row && 'ok' in row ? row.ok === true : true;
    detail = row && 'ok' in row ? `ok=${row.ok}` : result.command;
  } catch (error) {
    passed = false;
    detail = `거절 ${error.code}`;
  } finally {
    await client.query('rollback');
  }
  const good = passed === shouldPass;
  if (!good) bad += 1;
  console.log(`${good ? '✓' : '✗'} ${label} — ${shouldPass ? '되어야 함' : '막혀야 함'} · ${detail}`);
}
await client.end();
if (bad > 0) {
  console.error(`경계 점검 실패 ${bad}건`);
  process.exit(1);
}
console.log('경계 점검 통과');
