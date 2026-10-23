/**
 * 항체 랩 경로 ⑤ 교사 — 학급 설정 · 정정 · 큐 보기(설계 §5.5 · §10 U9). 학생은 403 forbidden.
 */
import { ANTIBODY_API, type AccountView } from '@crista-web/web-contract';
import { readJson, type Router } from '../../http.ts';
import type { RequestContext } from '../../routes.ts';
import { correctScore, getTeacherSettings, putTeacherSettings, teacherQueue } from './teacher.ts';

export function registerTeacherRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  router.on('GET', ANTIBODY_API.teacherSettings, async (ctx) => getTeacherSettings(ctx.deps, account(ctx), ctx.query.get('classId')));
  router.on('PUT', ANTIBODY_API.teacherSettings, async (ctx) => putTeacherSettings(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('POST', ANTIBODY_API.teacherCorrect, async (ctx) => correctScore(ctx.deps, account(ctx), await readJson(ctx.req)));
  router.on('GET', ANTIBODY_API.teacherQueue, async (ctx) => teacherQueue(ctx.deps, account(ctx), ctx.query.get('classId')));
}
