/**
 * 작은 HTTP 도구 — 경로표 · JSON 본문 · 쿠키 · 오류 응답. 프레임워크 없이 node:http 위에서.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiErrorBody, ErrorCode, TeamView } from '@crista-web/web-contract';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly retryAfterSec: number | undefined;
  readonly team: TeamView | undefined;

  constructor(status: number, code: ErrorCode, message: string, extra: { retryAfterSec?: number; team?: TeamView } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSec = extra.retryAfterSec;
    this.team = extra.team;
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.retryAfterSec !== undefined ? { retryAfterSec: this.retryAfterSec } : {}),
        ...(this.team ? { team: this.team } : {}),
      },
    };
  }
}

export const badRequest = (message: string) => new ApiError(400, 'bad_request', message);

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
} as const;

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string | string[]> = {}): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
    ...headers,
  });
  res.end(text);
}

export function sendError(res: ServerResponse, error: ApiError): void {
  sendJson(res, error.status, error.toBody(), error.retryAfterSec !== undefined ? { 'retry-after': String(error.retryAfterSec) } : {});
}

export { SECURITY_HEADERS };

const BODY_LIMIT = 16 * 1024;

/**
 * 상태를 바꾸는 요청은 본문이 없어도 `content-type: application/json` 이어야 한다 —
 * 다른 사이트의 폼은 이 형식을 미리 묻기(preflight) 없이 보낼 수 없다(SameSite 쿠키 위의 한 겹).
 */
export function isJsonRequest(req: IncomingMessage): boolean {
  return (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase() === 'application/json';
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_LIMIT) throw new ApiError(413, 'bad_request', '본문이 너무 큽니다.');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.trim() === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('본문이 JSON 형식이 아닙니다.');
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const name = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
    try {
      out[name] ??= decodeURIComponent(raw);
    } catch {
      // 깨진 값은 무시
    }
  }
  return out;
}

export interface CookieOptions {
  maxAgeSec: number;
  secure: boolean;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${options.maxAgeSec}`];
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

/** 요청한 쪽 IP — 프록시를 믿을 때만 X-Forwarded-For 의 첫 값. */
export function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/** 다른 사이트에서 온 요청인가 — Origin 이 있으면 허용 목록에 있어야 하고, 브라우저가 cross-site 라고 하면 거절. */
export function isCrossSite(req: IncomingMessage, allowedOrigins: readonly string[]): boolean {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) return true;
  return req.headers['sec-fetch-site'] === 'cross-site';
}

// ── 경로표 ──

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Route<C> {
  method: Method;
  parts: string[];
  handler: (ctx: C, params: Record<string, string>) => Promise<unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class Router<C> {
  private readonly routes: Route<C>[] = [];

  on(method: Method, pattern: string, handler: Route<C>['handler']): this {
    this.routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });
    return this;
  }

  /** 맞는 경로 · 인자. 경로는 있는데 방법이 다르면 'method'. `:id` 로 끝나는 인자는 UUID 여야 한다. */
  match(method: string, path: string): { route: Route<C>; params: Record<string, string> } | 'method' | null {
    const segments = path.split('/').filter(Boolean);
    let methodMismatch = false;
    for (const route of this.routes) {
      if (route.parts.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.parts.length; i += 1) {
        const part = route.parts[i]!;
        const seg = segments[i]!;
        if (part.startsWith(':')) {
          let value: string;
          try {
            value = decodeURIComponent(seg);
          } catch {
            ok = false;
            break;
          }
          if (part.endsWith('Id') && !UUID.test(value)) {
            ok = false;
            break;
          }
          params[part.slice(1)] = value.toLowerCase();
        } else if (part !== seg) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (route.method !== method) {
        methodMismatch = true;
        continue;
      }
      return { route, params };
    }
    return methodMismatch ? 'method' : null;
  }
}
