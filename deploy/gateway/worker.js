/**
 * crista-web 게이트웨이 — https://mulk.codes/crista 아래를 맡는다(mulk.codes 는 Cloudflare 존, 경로마다 Worker 가 응답한다).
 *
 *   /crista/api/* · /crista/ws  →  Railway `crista-web` 서버(API_ORIGIN) — WebSocket 업그레이드도 그대로 넘긴다
 *   그 밖의 /crista/*           →  Vercel `crista-web` 화면(WEB_ORIGIN)
 *
 * 같은 출처(mulk.codes)라 세션 쿠키(Path=/crista) · Origin 확인 · WebSocket 쿠키 인증이 로컬과 같은 방식으로 동작한다.
 * Vercel 의 외부 rewrite 는 WebSocket 을 넘기지 않아 이 Worker 가 앞에 선다(deploy/README.md).
 *
 * 서버로 가는 요청에는 게이트웨이 비밀(x-crista-gateway)과 Cloudflare 가 본 사용자 IP(x-crista-client-ip)를 싣는다 —
 * 서버는 이 비밀이 없는 /api 요청을 받지 않는다(공개 Railway 도메인으로 게이트웨이를 건너뛰지 못하게). 브라우저가 보낸 같은 이름의
 * 머리는 덮어쓴다. 화면(Vercel)으로는 쿠키를 보내지 않는다.
 */
const PREFIX = '/crista';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 308);
    if (!url.pathname.startsWith(`${PREFIX}/`)) return new Response('Not found', { status: 404 });

    const toServer = url.pathname.startsWith(`${PREFIX}/api/`) || url.pathname === `${PREFIX}/ws`;
    const origin = toServer ? env.API_ORIGIN : env.WEB_ORIGIN;
    const target = new URL(url.pathname + url.search, origin);

    const headers = new Headers(request.headers);
    headers.delete('x-crista-gateway');
    headers.delete('x-crista-client-ip');
    if (toServer) {
      headers.set('x-crista-gateway', env.GATEWAY_SECRET);
      const ip = request.headers.get('cf-connecting-ip');
      if (ip) headers.set('x-crista-client-ip', ip);
    } else {
      headers.delete('cookie');
    }

    const method = request.method;
    // 본문은 버퍼로 넘긴다(API 본문은 16KB 이하) — 스트림으로 넘기면 chunked 로 가서 뒤쪽이 끝을 기다리느라 POST 마다 몇 초씩 늦었다.
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
    const response = await fetch(target, { method, headers, body, redirect: 'manual' });
    // WebSocket — 업그레이드 응답을 그대로 돌려주면 Workers 가 양쪽을 이어 준다.
    if (response.status === 101 || response.webSocket) return response;

    const out = new Response(response.body, response);
    // 뒤쪽이 자기 주소로 돌려보내면(예: Vercel 의 / → /crista/) 공개 주소로 바꾼다.
    const location = out.headers.get('location');
    if (location) {
      try {
        const loc = new URL(location, origin);
        if (loc.origin === new URL(origin).origin) out.headers.set('location', `${url.origin}${loc.pathname}${loc.search}`);
      } catch {
        // 그대로 둔다
      }
    }
    return out;
  },
};
