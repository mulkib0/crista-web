/**
 * 설정 — 환경 변수만 읽는다(`.env.local` 을 직접 읽지 않는다 — 그 파일의 Supabase 값은 호스팅 값이라서).
 * 로컬은 `tools/with-local-env.mjs` 가 로컬 값만 실어 준다. `WEB_TARGET=local` 이면 모든 주소가 루프백이어야 시작한다.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_EMAIL_DOMAIN, WEB_EMAIL_DOMAIN } from '@crista-web/web-contract';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export interface Config {
  target: 'local' | 'hosted';
  host: string;
  port: number;
  databaseUrl: string;
  /** hosted 의 verify-full CA. local 은 null(SSL 없음). */
  databaseCa: string | null;
  supabaseUrl: string;
  publishableKey: string;
  /** 서버 전용 — GoTrue 관리자(웹 계정 발급). 로그 · 응답에 싣지 않는다. */
  secretKey: string;
  emailDomain: string;
  staticDir: string;
  /** 상태를 바꾸는 요청 · WebSocket 의 Origin 허용 목록. */
  allowedOrigins: string[];
  secureCookies: boolean;
  /** 앞단 프록시(Railway)의 X-Forwarded-For 를 믿는가. */
  trustProxy: boolean;
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function need(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new ConfigError(`${key} 가 없습니다. 로컬은 \`npm run dev:server\`(tools/with-local-env.mjs)로 실행하세요.`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const target = env.WEB_TARGET;
  if (target !== 'local' && target !== 'hosted') throw new ConfigError('WEB_TARGET 이 local · hosted 가 아닙니다.');

  const databaseUrl = need(env, 'WEB_DATABASE_URL');
  const supabaseUrl = need(env, 'SUPABASE_URL');
  const dbUser = decodeURIComponent(new URL(databaseUrl).username).split('.')[0];
  if (dbUser !== 'crista_web') throw new ConfigError(`WEB_DATABASE_URL 의 사용자가 crista_web 이 아닙니다(${dbUser}). 서버는 전용 역할로만 붙는다.`);

  if (target === 'local') {
    for (const [key, url] of [['WEB_DATABASE_URL', databaseUrl], ['SUPABASE_URL', supabaseUrl]] as const) {
      const host = new URL(url).hostname;
      if (!LOOPBACK.has(host)) throw new ConfigError(`WEB_TARGET=local 인데 ${key} 가 로컬이 아닙니다(${host}). 호스팅은 W6.`);
    }
  }

  const emailDomain = env.WEB_AUTH_EMAIL_DOMAIN?.trim() || WEB_EMAIL_DOMAIN;
  if (emailDomain !== WEB_EMAIL_DOMAIN || emailDomain.endsWith(GAME_EMAIL_DOMAIN)) {
    throw new ConfigError(`WEB_AUTH_EMAIL_DOMAIN 은 ${WEB_EMAIL_DOMAIN} 이어야 합니다(게임 계정과 섞이지 않게).`);
  }

  const port = Number(env.WEB_PORT ?? env.PORT ?? 3390);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigError('WEB_PORT 가 포트 번호가 아닙니다.');

  const caPath = env.WEB_PGSSLROOTCERT?.trim();
  const databaseCa = target === 'hosted' ? readFileSync(resolve(REPO_ROOT, caPath || 'certs/supabase-prod-ca-2021.crt'), 'utf8') : null;

  const localOrigins = ['http://localhost:5190', 'http://127.0.0.1:5190', `http://localhost:${port}`, `http://127.0.0.1:${port}`];
  const listed = (env.WEB_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // 브라우저는 같은 출처 POST 에도 Origin 을 싣는다 — 호스팅에서 목록이 비면 모든 쓰기가 거절된다.
  if (target === 'hosted' && listed.length === 0) throw new ConfigError('hosted 는 WEB_ALLOWED_ORIGINS(공개 주소, 쉼표 구분)가 필요합니다.');

  return {
    target,
    // 로컬은 같은 기계에서만 — crista 쪽 포트처럼 0.0.0.0 에 묶지 않는다.
    host: env.WEB_HOST?.trim() || (target === 'local' ? '127.0.0.1' : '0.0.0.0'),
    port,
    databaseUrl,
    databaseCa,
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    publishableKey: need(env, 'SUPABASE_PUBLISHABLE_KEY'),
    secretKey: need(env, 'SUPABASE_SECRET_KEY'),
    emailDomain,
    staticDir: resolve(REPO_ROOT, env.WEB_STATIC_DIR?.trim() || 'apps/web/dist'),
    allowedOrigins: target === 'local' ? [...localOrigins, ...listed] : listed,
    secureCookies: target === 'hosted',
    trustProxy: target === 'hosted' || env.WEB_TRUST_PROXY === '1',
  };
}
