/**
 * 항체 랩 경로 ③ 작업 접수 · 상태(설계 §5.5 · §5.7).
 */
import { ANTIBODY_API, type AccountView } from '@crista-web/web-contract';
import { readJson, type Router } from '../../http.ts';
import type { RequestContext } from '../../routes.ts';
import { loadAntibodyJob, startAntibodyJob } from './runner.ts';

export function registerJobRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  router.on('POST', ANTIBODY_API.jobs, async (ctx) => {
    const result = await startAntibodyJob(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = result.created ? 201 : 200;
    return result;
  });

  // 폴링 보조 — 주 경로는 WS `antibody.progress`.
  router.on('GET', '/api/antibody/jobs/:jobId', async (ctx, p) => loadAntibodyJob(ctx.deps, account(ctx), p.jobId!));
}
