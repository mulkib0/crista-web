/**
 * 앱 조립 — node:http 하나에 REST(/api) · WebSocket(/ws) · 정적 파일(그 밖).
 *
 * 공개 주소는 https://mulk.codes/crista 다 — 게이트웨이(Cloudflare Worker)가 경로를 그대로 넘기므로 접두(`basePath`)를 떼고 본다.
 * 접두 없는 `/api` · `/ws` 도 받는다(로컬 점검 스크립트 · Railway 상태 확인). 게이트웨이 비밀이 설정되면 `/api/health` 밖의 요청은
 * 그 비밀을 실어야 한다(공개 Railway 도메인으로 게이트웨이를 건너뛰지 못하게).
 */
import { createServer, type Server } from 'node:http';
import { API, SESSION_COOKIE } from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { ApiError, fromGateway, isCrossSite, isJsonRequest, parseCookies, sendError, sendJson } from './http.ts';
import { buildRouter, type RequestContext } from './routes.ts';
import { lookupSession } from './sessions.ts';
import { serveStatic } from './static.ts';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 접두를 뗀 경로. 접두가 없으면 그대로. */
export function stripBase(path: string, basePath: string): string {
  if (!basePath) return path;
  if (path === basePath) return '/';
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
}

export function createApp(deps: Deps): Server {
  const router = buildRouter();
  const { basePath, gatewaySecret } = deps.config;

  const server = createServer(async (req, res) => {
    const started = Date.now();
    const method = req.method ?? 'GET';
    const [rawPath = '/', rawQuery = ''] = (req.url ?? '/').split('?');
    const path = stripBase(rawPath, basePath);
    res.on('finish', () => {
      if (path.startsWith('/api/')) console.log(`[http] ${method} ${path} ${res.statusCode} ${Date.now() - started}ms`);
    });

    if (!path.startsWith('/api/')) {
      if (method !== 'GET' && method !== 'HEAD') return sendJson(res, 405, { error: { code: 'bad_request', message: '허용하지 않는 방법입니다.' } });
      // 화면 빌드는 `dist/<접두>/…` 에 있다(Vercel 과 같은 모양) — 원래 경로로 찾고, 없으면 그 접두의 index.html.
      return serveStatic(deps.config.staticDir, req, res, rawPath, basePath).catch(() => {
        if (!res.headersSent) res.writeHead(500).end();
      });
    }

    const ctx: RequestContext = { deps, req, res, session: null, status: 200, headers: {}, query: new URLSearchParams(rawQuery) };
    try {
      const matched = router.match(method, path);
      if (path !== API.health && !fromGateway(req, gatewaySecret)) throw new ApiError(403, 'forbidden', '공개 주소(mulk.codes/crista)로 들어와 주세요.');
      if (matched === null) throw new ApiError(404, 'not_found', '없는 경로예요.');
      if (matched === 'method') throw new ApiError(405, 'bad_request', '허용하지 않는 방법이에요.');
      if (UNSAFE.has(method)) {
        if (isCrossSite(req, deps.config.allowedOrigins)) throw new ApiError(403, 'forbidden', '다른 사이트에서 온 요청은 받지 않아요.');
        if (!isJsonRequest(req)) throw new ApiError(415, 'bad_request', '요청은 content-type: application/json 이어야 해요.');
      }
      ctx.session = await lookupSession(deps.db, parseCookies(req.headers.cookie)[SESSION_COOKIE]);
      const body = await matched.route.handler(ctx, matched.params);
      sendJson(res, ctx.status, body, ctx.headers);
    } catch (error) {
      if (error instanceof ApiError) return sendError(res, error);
      console.error(`[http] ${method} ${path} 처리 중 오류:`, error);
      sendError(res, new ApiError(500, 'internal', '서버 오류가 났어요. 잠시 뒤 다시 해 주세요.'));
    }
  });

  server.on('upgrade', (req, socket, head) => {
    const path = stripBase((req.url ?? '/').split('?')[0]!, basePath);
    if (path !== API.ws || !fromGateway(req, gatewaySecret)) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return socket.destroy();
    }
    deps.hub.handleUpgrade(req, socket, head);
  });

  // 느린 클라이언트가 연결을 붙잡지 않게.
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  return server;
}
