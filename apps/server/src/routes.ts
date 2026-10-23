/**
 * REST 경로표 — 모양은 packages/web-contract `api.ts`.
 */
import { SESSION_COOKIE, type AccountView } from '@crista-web/web-contract';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { login, me, setAvatar, signupStudent } from './accounts.ts';
import { assignTeam, changeClassCode, classDetail, createClass, listClasses } from './classes.ts';
import type { Deps } from './context.ts';
import { ApiError, clientIp, readJson, Router, serializeCookie } from './http.ts';
import { startJob } from './jobs.ts';
import {
  claimCandidate,
  diseaseTargets,
  funnelPreview,
  loadBoard,
  pickTarget,
  previewProperties,
  releaseClaim,
  saveNote,
  setLead,
  setTarget,
} from './pipeline.ts';
import { deleteSession, SESSION_TTL_SEC, type Session } from './sessions.ts';
import { district, joinTeam, registerTeam, updateRegistration } from './teams.ts';

export interface RequestContext {
  deps: Deps;
  req: IncomingMessage;
  res: ServerResponse;
  session: Session | null;
  /** 응답 상태(기본 200)와 더 붙일 머리. */
  status: number;
  headers: Record<string, string | string[]>;
  /** 요청 주소의 질의 문자열. */
  query: URLSearchParams;
}

function account(ctx: RequestContext): AccountView {
  if (!ctx.session) throw new ApiError(401, 'unauthorized', '로그인이 필요해요.');
  return ctx.session.account;
}

const cookiePath = (ctx: RequestContext): string => ctx.deps.config.basePath || '/';
const ipOf = (ctx: RequestContext): string => clientIp(ctx.req, ctx.deps.config.trustProxy, ctx.deps.config.gatewaySecret);

function setSessionCookie(ctx: RequestContext, token: string): void {
  ctx.headers['set-cookie'] = serializeCookie(SESSION_COOKIE, token, { maxAgeSec: SESSION_TTL_SEC, secure: ctx.deps.config.secureCookies, path: cookiePath(ctx) });
}

export function buildRouter(): Router<RequestContext> {
  const router = new Router<RequestContext>();

  router.on('GET', '/api/health', async () => ({ ok: true }));

  router.on('POST', '/api/auth/signup', async (ctx) => {
    const { account: created, token } = await signupStudent(ctx.deps, await readJson(ctx.req), ipOf(ctx));
    setSessionCookie(ctx, token);
    ctx.status = 201;
    return me(ctx.deps.db, created);
  });

  router.on('POST', '/api/auth/login', async (ctx) => {
    const { account: found, token } = await login(ctx.deps, await readJson(ctx.req), ipOf(ctx));
    setSessionCookie(ctx, token);
    return me(ctx.deps.db, found);
  });

  router.on('POST', '/api/auth/logout', async (ctx) => {
    if (ctx.session) {
      await deleteSession(ctx.deps.db, ctx.session.tokenHash);
      ctx.deps.hub.closeSession(ctx.session.tokenHash);
    }
    ctx.headers['set-cookie'] = serializeCookie(SESSION_COOKIE, '', { maxAgeSec: 0, secure: ctx.deps.config.secureCookies, path: cookiePath(ctx) });
    return { ok: true };
  });

  router.on('GET', '/api/me', async (ctx) => me(ctx.deps.db, account(ctx)));
  router.on('PUT', '/api/me/avatar', async (ctx) => {
    const result = await setAvatar(ctx.deps.db, account(ctx), await readJson(ctx.req));
    await ctx.deps.hub.refreshUser(result.account.userId, 'student');
    return result;
  });

  // 교사
  router.on('GET', '/api/classes', async (ctx) => ({ classes: await listClasses(ctx.deps, account(ctx)) }));
  router.on('POST', '/api/classes', async (ctx) => {
    const detail = await createClass(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return detail;
  });
  router.on('GET', '/api/classes/:classId', async (ctx, p) => classDetail(ctx.deps, account(ctx), p.classId!));
  router.on('POST', '/api/classes/:classId/code', async (ctx, p) => changeClassCode(ctx.deps, account(ctx), p.classId!, await readJson(ctx.req)));
  router.on('PUT', '/api/classes/:classId/members/:userId/team', async (ctx, p) =>
    assignTeam(ctx.deps, account(ctx), p.classId!, p.userId!, await readJson(ctx.req)),
  );

  // 학생 — 사옥 지구 · 입사 · 등기
  router.on('GET', '/api/district', async (ctx) => district(ctx.deps, account(ctx)));
  router.on('POST', '/api/teams/:teamId/join', async (ctx, p) => joinTeam(ctx.deps, account(ctx), p.teamId!));
  router.on('POST', '/api/teams/:teamId/registration', async (ctx, p) => {
    const result = await registerTeam(ctx.deps, account(ctx), p.teamId!, await readJson(ctx.req));
    ctx.status = 201;
    return result;
  });
  router.on('PATCH', '/api/teams/:teamId/registration', async (ctx, p) => updateRegistration(ctx.deps, account(ctx), p.teamId!, await readJson(ctx.req)));

  // 화면 ③ — 1. 발견 · 2. 최적화(W3). 모둠은 세션에서 정한다.
  router.on('GET', '/api/board', async (ctx) => loadBoard(ctx.deps, account(ctx)));
  router.on('GET', '/api/datasets/targets', async (ctx) => diseaseTargets(ctx.deps, account(ctx), ctx.query.get('disease')));
  router.on('GET', '/api/datasets/funnel', async (ctx) => funnelPreview(ctx.deps, account(ctx), ctx.query));
  router.on('POST', '/api/molecule/properties', async (ctx) => previewProperties(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/program/picks', async (ctx) => pickTarget(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/program/target', async (ctx) => setTarget(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('PUT', '/api/program/lead', async (ctx) => setLead(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('POST', '/api/jobs', async (ctx) => {
    const result = await startJob(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = result.created ? 201 : 200;
    return result;
  });
  router.on('POST', '/api/claims', async (ctx) => {
    const result = await claimCandidate(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return result;
  });
  router.on('DELETE', '/api/claims/:compound', async (ctx, p) => releaseClaim(ctx.deps, account(ctx), p.compound!));
  router.on('PUT', '/api/notes/:step/:section', async (ctx, p) => saveNote(ctx.deps, account(ctx), p.step!, p.section!, await readJson(ctx.req)));

  return router;
}
