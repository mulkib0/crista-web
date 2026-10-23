/**
 * 경로 처리기가 함께 쓰는 확인 — 로그인 · 교사 소유 학급 · 학급 학생. 모둠 학생 확인은 pipeline.ts `teamMember`(등기한 모둠만).
 */
import type { AccountView } from '@crista-web/web-contract';
import type { Queryable } from './db.ts';
import { ApiError } from './http.ts';
import type { RequestContext } from './routes.ts';

/** 로그인한 계정(없으면 401). */
export function requireAccount(ctx: RequestContext): AccountView {
  if (!ctx.session) throw new ApiError(401, 'unauthorized', '로그인이 필요해요.');
  return ctx.session.account;
}

/** 경로 id 가 uuid 꼴인가 — 꼴이 틀린 id 가 DB 로 가면 형 변환 오류(500)가 나서 먼저 걸러 404 로 답한다. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 그 학급의 교사인가(아니면 404 — 남의 학급이 있는지조차 알리지 않는다). */
export async function requireTeacherOf(db: Queryable, account: AccountView, classId: string): Promise<void> {
  if (account.kind !== 'teacher') throw new ApiError(403, 'forbidden', '교사 계정으로 해 주세요.');
  if (!UUID_RE.test(classId)) throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
  const owned = await db.query('select 1 from web.classes where id = $1 and teacher_id = $2', [classId, account.userId]);
  if (!owned.rowCount) throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
}
