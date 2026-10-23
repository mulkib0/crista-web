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
  /**
   * 공개 경로 접두(기본 `/crista` — https://mulk.codes/crista). 요청 경로에서 떼어 낸 뒤 `/api` · `/ws` 를 본다(접두 없는 경로도 받는다).
   * 쿠키 Path 도 이 값이다 — 같은 호스트(mulk.codes)의 다른 서비스로 세션 쿠키가 가지 않게.
   */
  basePath: string;
  /**
   * 앞단 게이트웨이(Cloudflare Worker, deploy/gateway)와 나눠 가진 비밀 — 있으면 `/api` · `/ws` 는 이 값을 실은 요청만 받고,
   * 사용자 IP 는 게이트웨이가 넣은 `x-crista-client-ip` 를 쓴다. 로컬은 비운다.
   */
  gatewaySecret: string | null;
  /** crista bio-worker — 로컬 8790 · Railway 내부망 `http://bio-worker.railway.internal:8787`. */
  bioWorkerUrl: string;
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

  const basePath = (env.WEB_BASE_PATH ?? '/crista').trim().replace(/\/+$/, '');
  if (basePath !== '' && !/^\/[a-z0-9-]+$/.test(basePath)) throw new ConfigError('WEB_BASE_PATH 는 `/crista` 같은 한 단계 경로이거나 빈 값이어야 합니다.');

  const gatewaySecret = env.WEB_GATEWAY_SECRET?.trim() || null;
  if (gatewaySecret !== null && gatewaySecret.length < 32) throw new ConfigError('WEB_GATEWAY_SECRET 은 32자 이상이어야 합니다.');
  // 호스팅은 공개 주소(Railway 도메인)로 게이트웨이를 건너뛰는 요청을 받지 않는다.
  if (target === 'hosted' && gatewaySecret === null) throw new ConfigError('hosted 는 WEB_GATEWAY_SECRET(게이트웨이와 나눠 가진 비밀)이 필요합니다.');

  const bioWorkerUrl = (env.BIO_WORKER_URL?.trim() || 'http://127.0.0.1:8790').replace(/\/+$/, '');
  if (target === 'local' && !LOOPBACK.has(new URL(bioWorkerUrl).hostname)) throw new ConfigError('WEB_TARGET=local 인데 BIO_WORKER_URL 이 로컬이 아닙니다.');

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
    basePath,
    gatewaySecret,
    bioWorkerUrl,
  };
}
