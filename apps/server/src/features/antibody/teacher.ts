/**
 * 항체 랩 교사 경로(설계 §5.5 · §10 U9) — 학급 설정 · 점수 정정 · 학급 큐 보기.
 *
 * - 교사만(학생은 403 `forbidden`). 학급 소유는 `guard.ts` 의 `requireTeacherOf` 가 본다 — **그 파일을 고치지 않는다**.
 * - 가중치 합 1.00 검사는 계약의 `scoreWeightsOk` 한 함수로 한다(화면 · 서버가 같은 함수).
 * - 정정은 점수를 다시 계산하고 `correctedFundamental` 로 기업가치를 되돌린 뒤 정정 소식(#12)을 낸다.
 */
import {
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_WEIGHT_KEYS,
  CONFIDENCE_MIN_FOR_COMPLEX,
  CORRECTION_MAX_PCT,
  LAB_TRACKS,
  SCORE_THRESHOLD_MARGIN,
  scoreWeightsOk,
  type AccountView,
  type AntibodyScoreWeights,
  type AntibodyTeacherQueue,
  type AntibodyTeacherSettings,
  type LabTrack,
  type ScoreView,
} from '@crista-web/web-contract';
import { currentGameDay } from '../../clock.ts';
import type { Deps } from '../../context.ts';
import { withTx, type Queryable } from '../../db.ts';
import { requireTeacherOf } from '../../guard.ts';
import { ApiError, badRequest } from '../../http.ts';
import { ANTIBODY_DOMAINS } from './queue.ts';
import { postAntibodyCorrection } from './events.ts';
import { loadSettings } from './service.ts';

/** 교사가 보는 학급 — 소유한 학급 하나를 고른다(인자가 없으면 첫 학급). */
async function pickClass(db: Queryable, account: AccountView, raw: string | null): Promise<string> {
  if (account.kind !== 'teacher') throw new ApiError(403, 'forbidden', '교사 계정으로 해 주세요.');
  if (raw) {
    await requireTeacherOf(db, account, raw);
    return raw;
  }
  const rows = await db.query<{ id: string }>('select id from web.classes where teacher_id = $1 order by created_at limit 1', [account.userId]);
  const id = rows.rows[0]?.id;
  if (!id) throw new ApiError(404, 'not_found', '학급을 찾지 못했어요.');
  return id;
}

export async function getTeacherSettings(deps: Deps, account: AccountView, classId: string | null): Promise<AntibodyTeacherSettings> {
  const id = await pickClass(deps.db, account, classId);
  const settings = await loadSettings(deps.db, id);
  return { weights: settings.weights, thresholds: settings.thresholds, openTracks: settings.openTracks, version: settings.version };
}

function checkWeights(raw: unknown): AntibodyScoreWeights {
  const body = (raw ?? {}) as Record<string, unknown>;
  const out = { ...ANTIBODY_SCORE_WEIGHTS };
  for (const key of ANTIBODY_WEIGHT_KEYS) {
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0 || value > 1) throw badRequest(`가중치 ${key} 는 0~1 사이예요.`);
    out[key] = Math.round(value * 1000) / 1000;
  }
  if (!scoreWeightsOk(out)) throw new ApiError(409, 'invalid_input', '가중치 다섯 개의 합이 1.00 이어야 해요.');
  return out;
}

export async function putTeacherSettings(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodyTeacherSettings> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const classId = await pickClass(deps.db, account, typeof body.classId === 'string' ? body.classId : null);
  const weights = checkWeights(body.weights);
  const thresholdsRaw = (body.thresholds ?? {}) as Record<string, unknown>;
  const scoreMargin = Number(thresholdsRaw.scoreMargin ?? SCORE_THRESHOLD_MARGIN);
  const confidenceMin = Number(thresholdsRaw.confidenceMin ?? CONFIDENCE_MIN_FOR_COMPLEX);
  if (!Number.isInteger(scoreMargin) || scoreMargin < 0 || scoreMargin > 20) throw badRequest('문턱 조정은 0~20 사이 정수예요.');
  if (!Number.isInteger(confidenceMin) || confidenceMin < 0 || confidenceMin > 100) throw badRequest('구조 확신도 문턱은 0~100 사이 정수예요.');
  const tracks = Array.isArray(body.openTracks) ? body.openTracks : [...LAB_TRACKS];
  const openTracks = tracks.filter((t): t is LabTrack => (LAB_TRACKS as readonly string[]).includes(t as string));
  const expected = Number(body.version);
  if (!Number.isInteger(expected) || expected < 1) throw badRequest('설정 버전을 보내 주세요.');

  const saved = await withTx(deps.db, async (tx) => {
    const existing = await tx.query<{ version: number }>('select version from web.antibody_class_settings where class_id = $1 for update', [classId]);
    if (!existing.rows[0]) {
      await tx.query(
        `insert into web.antibody_class_settings (class_id, weights, thresholds, open_tracks, version, updated_by)
         values ($1, $2, $3, $4, 2, $5)`,
        [classId, JSON.stringify(weights), JSON.stringify({ scoreMargin, confidenceMin }), openTracks, account.userId],
      );
      return 2;
    }
    if (existing.rows[0].version !== expected) throw new ApiError(409, 'stale', '다른 창에서 설정을 먼저 바꿨어요. 화면을 새로 고쳐 다시 해 주세요.');
    const updated = await tx.query<{ version: number }>(
      `update web.antibody_class_settings
          set weights = $2, thresholds = $3, open_tracks = $4, version = version + 1, updated_by = $5, updated_at = now()
        where class_id = $1 returning version`,
      [classId, JSON.stringify(weights), JSON.stringify({ scoreMargin, confidenceMin }), openTracks, account.userId],
    );
    return updated.rows[0]!.version;
  });

  deps.hub.broadcastClass(classId, { type: 'board.changed', teamId: classId, reason: 'antibody:settings' });
  return { weights, thresholds: { scoreMargin, confidenceMin }, openTracks, version: saved };
}

/** 정정 — 점수 줄을 하나 더 남기고(이력 보존) 기업가치를 되돌린 뒤 정정 소식을 낸다. */
export async function correctScore(deps: Deps, account: AccountView, raw: unknown): Promise<{ score: ScoreView | null; changePct: number }> {
  const body = (raw ?? {}) as Record<string, unknown>;
  const teamId = typeof body.teamId === 'string' ? body.teamId : '';
  if (!teamId) throw badRequest('정정할 모둠을 골라 주세요.');
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 1 || [...reason].length > 140) throw badRequest('정정 이유는 1~140자예요.');
  const team = await deps.db.query<{ class_id: string; ticker: string | null }>('select class_id, ticker from web.teams where id = $1', [teamId]);
  const row = team.rows[0];
  if (!row) throw new ApiError(404, 'not_found', '없는 모둠이에요.');
  await pickClass(deps.db, account, row.class_id);

  const newPct = body.newChangePct === undefined || body.newChangePct === null ? 0 : Number(body.newChangePct);
  if (!Number.isFinite(newPct) || Math.abs(newPct) > CORRECTION_MAX_PCT) throw badRequest(`정정 변동률은 ±${CORRECTION_MAX_PCT}% 안이에요.`);
  const gameDay = await currentGameDay(deps.db, row.class_id).catch(() => null);

  const outcome = await withTx(deps.db, async (tx) =>
    postAntibodyCorrection(tx, deps, {
      classId: row.class_id,
      teamId,
      headline: `◆ ${row.ticker ?? '—'} 항체 점수 정정 — ${reason}`,
      reason,
      changePct: newPct,
      idemKey: `antibody_correction:${teamId}:${Date.now()}`,
      gameDay,
    }),
  );
  outcome.after();

  const best = await deps.db.query<{ parts: { view?: ScoreView } }>(
    'select parts from web.antibody_scores where team_id = $1 order by score desc, created_at limit 1',
    [teamId],
  );
  return { score: best.rows[0]?.parts.view ?? null, changePct: newPct };
}

/** 학급 큐 — 수업 운영용(§8 위험 1). 도메인별 대기 · 예상 대기. */
export async function teacherQueue(deps: Deps, account: AccountView, classId: string | null): Promise<AntibodyTeacherQueue> {
  const id = await pickClass(deps.db, account, classId);
  const rows = await deps.db.query<{ step: string; status: string; n: number }>(
    `select step, status, count(*)::int as n from web.antibody_jobs where class_id = $1 and status in ('queued', 'running') group by step, status`,
    [id],
  );
  const limiter = deps.antibody.ports.limiter;
  return {
    classId: id,
    byStep: rows.rows.map((r) => ({ step: r.step, status: r.status, count: r.n })),
    domains: ANTIBODY_DOMAINS.map((domain) => ({
      domain,
      running: limiter.running(domain),
      waiting: limiter.waiting(domain),
      limit: limiter.limitOf(domain),
      peak: limiter.peak(domain),
    })),
    dataMode: deps.antibody.dataMode,
  };
}
