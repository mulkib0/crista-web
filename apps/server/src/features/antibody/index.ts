/**
 * 항체 설계 랩(트랙 2) — 모든 경로를 **이 한 함수**로 모은다(설계 §5.5 · §7.1).
 *
 * `routes.ts` 의 `buildRouter()` 끝에서 `registerAntibodyRoutes(router, account)` **한 줄**로 부른다 —
 * `routes.ts` 의 `account()` 는 export 되지 않은 지역 함수라 가져올 수 없고, 다른 세션이
 * `registerClockRoutes(router, account)` 처럼 **인자로 넘기는 관례**를 쓴다(§10 F4 · F14).
 *
 * 소식 · 기업가치 처리기(`onBoardEvent('antibody-fallback')`)도 여기서 한 번 단다.
 */
import type { AccountView } from '@crista-web/web-contract';
import type { Router } from '../../http.ts';
import type { RequestContext } from '../../routes.ts';
import { registerAntibodyFallback } from './events.ts';
import { registerBoardRoutes } from './routes-board.ts';
import { registerConsensusRoutes } from './routes-consensus.ts';
import { registerDesignRoutes } from './routes-design.ts';
import { registerJobRoutes } from './routes-jobs.ts';
import { registerTeacherRoutes } from './routes-teacher.ts';

export function registerAntibodyRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  registerBoardRoutes(router, account);
  registerDesignRoutes(router, account);
  registerJobRoutes(router, account);
  registerConsensusRoutes(router, account);
  registerTeacherRoutes(router, account);
  registerAntibodyFallback();
}

export { AntibodyRunner, createAntibodyPorts, dbCacheStore } from './runner.ts';
export { ensureAntibodyRows } from './service.ts';
export { postAntibodyEvent, recordValuation } from './events.ts';
