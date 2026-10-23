/**
 * DB — crista_web 역할 하나로 붙는 연결 풀. 모든 SQL 은 `web.` 을 붙여 쓴다(search_path 에 기대지 않는다).
 */
import pg from 'pg';
import type { Config } from './config.ts';

export type Pool = pg.Pool;
export type Tx = pg.PoolClient;
export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/** 서버가 요구하는 마지막 마이그레이션. */
export const REQUIRED_MIGRATION = '0002';

export function createPool(config: Pick<Config, 'databaseUrl' | 'databaseCa'>): Pool {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseCa ? { ca: config.databaseCa, rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'crista-web-server',
  });
  // 쉬던 연결이 끊긴 오류 — 풀이 그 연결을 버린다. 프로세스를 죽이지 않는다.
  pool.on('error', (error) => console.error('[db] 쉬던 연결 오류:', error.message));
  return pool;
}

export async function withTx<T>(pool: Pool, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** 시작 점검 — 전용 역할로 붙었고 필요한 마이그레이션이 적용됐는가. */
export async function assertDatabase(pool: Pool): Promise<void> {
  const who = await pool.query<{ u: string }>('select current_user as u');
  if (who.rows[0]?.u !== 'crista_web') throw new Error(`DB 역할이 crista_web 이 아닙니다(${who.rows[0]?.u}).`);
  const applied = await pool.query<{ version: string }>('select version from web.schema_migrations order by version desc limit 1');
  const latest = applied.rows[0]?.version ?? '';
  if (latest < REQUIRED_MIGRATION) throw new Error(`web 마이그레이션 ${REQUIRED_MIGRATION} 이 필요합니다(지금 ${latest || '없음'}). \`npm run db:migrate:local\``);
}

export const isUniqueViolation = (error: unknown, constraint?: string): boolean =>
  (error as { code?: string })?.code === '23505' && (constraint === undefined || (error as { constraint?: string }).constraint === constraint);
