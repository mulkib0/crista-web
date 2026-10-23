/**
 * REST 경로표 — 모양은 packages/web-contract `api.ts`.
 */
import { SESSION_COOKIE, type AccountView } from '@crista-web/web-contract';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { enroll, login, me, openClasses, setAvatar, signup } from './accounts.ts';
import { assignTeam, changeClassCode, classDetail, createClass, listClasses } from './classes.ts';
import { registerClockRoutes } from './clock.ts';
import type { Deps } from './context.ts';
import { registerAntibodyRoutes } from './features/antibody/index.ts';
import { register as registerApproval } from './features/approval.ts';
import { register as registerClinical } from './features/clinical.ts';
import { register as registerFeed } from './features/feed.ts';
import { register as registerInd } from './features/ind.ts';
import { register as registerLearn } from './features/learn.ts';
import { register as registerMarket } from './features/market.ts';
import { register as registerPatents } from './features/patents.ts';
import { register as registerPreclinical } from './features/preclinical.ts';
import { claimScreenCandidate, register as registerScreen } from './features/screen.ts';
import { register as registerSelection } from './features/selection.ts';
import { register as registerTeacher } from './features/teacher.ts';
import { ApiError, clientIp, readJson, Router, serializeCookie } from './http.ts';
import { startJob } from './jobs.ts';
import {
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
import { registerReviewRoutes } from './reviews.ts';
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
    const { account: created, token } = await signup(ctx.deps, await readJson(ctx.req), ipOf(ctx));
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

  // 학생 — 학급 고르기 · 사옥 지구 · 입사 · 등기
  router.on('GET', '/api/open-classes', async (ctx) => openClasses(ctx.deps, account(ctx)));
  router.on('POST', '/api/classes/:classId/enroll', async (ctx, p) => enroll(ctx.deps, account(ctx), p.classId!));
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
    // F12: 근거 필수 · 서버 재판정(설계 §7.4 ⑧) · 마지막 실행 통과 분자만 — features/screen.ts.
    const result = await claimScreenCandidate(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return result;
  });
  router.on('DELETE', '/api/claims/:compound', async (ctx, p) => releaseClaim(ctx.deps, account(ctx), p.compound!));
  router.on('PUT', '/api/notes/:step/:section', async (ctx, p) => saveNote(ctx.deps, account(ctx), p.step!, p.section!, await readJson(ctx.req)));

  // 3판 기반 — 공통(학급 게임 시계 · 서류 심사 보기 · 교사 수동 판정 · LLM 사용량).
  registerClockRoutes(router, account);
  registerReviewRoutes(router);

  // 기능 모듈(설계 §5.5~§5.13) — 각 모듈이 경로 · onReviewed · onGameDay 처리기를 단다. 순서는 상관없다(경로가 겹치지 않게 접두를 나눈다).
  registerScreen(router);
  registerSelection(router);
  registerPatents(router);
  registerPreclinical(router);
  registerInd(router);
  registerLearn(router);
  registerMarket(router);
  registerApproval(router);
  registerClinical(router);
  // 모둠 대화방(시안 06) — 대화 · 행적 · 읽은 위치. 행적은 index.ts 의 `bindTeamFeed` 가 모둠 채널 소식에서 만든다.
  registerFeed(router);
  // 교사 화면 — 모둠별 진행 · 막힌 이유 · 연구 노트(설계 §9).
  registerTeacher(router);
  // 항체 설계 랩(트랙 2 · 항체 설계 §5.5) — 경로 전부를 이 한 줄로 단다.
  registerAntibodyRoutes(router, account);

  return router;
}
