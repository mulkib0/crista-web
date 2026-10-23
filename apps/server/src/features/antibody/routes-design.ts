/**
 * 항체 랩 경로 ② 설계 · 제안 · 미리보기 · 제출(설계 §5.5).
 */
import { ANTIBODY_API, type AccountView } from '@crista-web/web-contract';
import { readJson, type Router } from '../../http.ts';
import type { RequestContext } from '../../routes.ts';
import { createDesign, deleteDesign, previewMetrics, submitDesign, suggestDesigns } from './service.ts';

export function registerDesignRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  // 서열 해시가 같으면 기존 행 200, 새로 만들면 201.
  router.on('POST', ANTIBODY_API.designs, async (ctx) => {
    const result = await createDesign(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = result.created ? 201 : 200;
    return result.design;
  });

  router.on('POST', ANTIBODY_API.suggest, async (ctx) => suggestDesigns(ctx.deps, account(ctx), await readJson(ctx.req)));

  router.on('DELETE', '/api/antibody/designs/:designId', async (ctx, p) => {
    await deleteDesign(ctx.deps, account(ctx), p.designId!);
    ctx.status = 204;
    return null;
  });

  // 무료 · 모둠당 분당 20회 · 캐시 없이 결정적.
  router.on('POST', ANTIBODY_API.preview, async (ctx) => previewMetrics(ctx.deps, account(ctx), await readJson(ctx.req)));

  // A6 — 모둠 신기록이면 계기 발생.
  router.on('POST', ANTIBODY_API.submit, async (ctx) => submitDesign(ctx.deps, account(ctx), await readJson(ctx.req)));
}
