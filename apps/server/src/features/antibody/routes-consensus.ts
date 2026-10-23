/**
 * 항체 랩 경로 ④ 카드 · 제안 · 투표(설계 §5.5 · §10 U4).
 */
import { ANTIBODY_API, type AccountView } from '@crista-web/web-contract';
import { readJson, type Router } from '../../http.ts';
import type { RequestContext } from '../../routes.ts';
import { addCard, addProposal, castVote } from './consensus.ts';

export function registerConsensusRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  // 1인 1몫 — 같은 몫을 다시 올리면 갱신하고 200.
  router.on('POST', ANTIBODY_API.cards, async (ctx) => addCard(ctx.deps, account(ctx), await readJson(ctx.req)));

  // 열린 제안이 있으면 409 invalid_input.
  router.on('POST', ANTIBODY_API.proposals, async (ctx) => {
    const proposal = await addProposal(ctx.deps, account(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return proposal;
  });

  // 1인 1표 — 과반이면 같은 트랜잭션에서 프로그램 확정.
  router.on('POST', '/api/antibody/proposals/:proposalId/votes', async (ctx, p) =>
    castVote(ctx.deps, account(ctx), p.proposalId!, await readJson(ctx.req)),
  );
}
