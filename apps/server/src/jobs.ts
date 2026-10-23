/**
 * 작업 오케스트레이션(설계 §8) — crista `jobs/service.ts` 의 규칙을 옮겼다.
 *
 * - 요청과 과금은 한 트랜잭션: 모둠 줄을 잠그고 잔액 확인 → 작업 줄 + 원장 차감(멱등 키 `job:<id>`) · 이름 잠금(첫 유료 행동).
 *   같은 `(모둠, requestId)` 는 같은 작업을 돌려준다(두 번 눌러도 한 번만 과금).
 * - 입력이 계산할 수 없는 SMILES 면 워커 물성 확인에서 **과금 전에** 거절한다. 워커가 POST 에서 거절(400)하면 즉시 환급.
 * - 워커 실행 실패(failed · 시간 초과 · 닿지 않음 5회)는 같은 작업 id 로 한 번만 환급(`refund:<id>`). 연구상 결과(낮은 ΔG 등)는 환급하지 않는다.
 * - 폴러가 진행 중 작업을 1.5초마다 읽는다. 워커가 작업을 모르면(재시작 404) 같은 jobId 로 다시 낸다(워커가 멱등).
 *   서버가 재시작해도 DB 의 진행 중 작업을 그대로 이어서 읽는다.
 */
import { randomUUID } from 'node:crypto';
import { SMILES_MAX_LENGTH, type ExperimentResult, type WorkerJobState } from '@crista/shared-types';
import { teamChannel, type AccountView, type JobStep, type StartJobResponse } from '@crista-web/web-contract';
import type { Deps } from './context.ts';
import { withTx, type Pool } from './db.ts';
import { ApiError, badRequest } from './http.ts';
import type { Hub } from './hub.ts';
import {
  balanceOf,
  checkLabel,
  checkScreenParams,
  checkSmiles,
  COSTS,
  ensureTeamRows,
  JOB_SELECT,
  jobView,
  loadProgramRow,
  teamMember,
  type JobRow,
} from './pipeline.ts';
import { WorkerUnavailableError, workerJobId, workerScopeId, type BioWorker } from './worker.ts';

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 모둠당 동시에 돌릴 수 있는 작업(워커 동시 도킹을 게임 수업과 나눠 쓴다 — 설계 §7.1). */
const TEAM_ACTIVE_MAX = 6;
/** 워커 상한(300초)에 대기열 여유를 더한 서버 쪽 마감. */
const JOB_DEADLINE_MIN = 20;
const MAX_SUBMIT_ATTEMPTS = 5;
const POLL_MS = 1_500;

const STAGE: Record<JobStep, { stage: 2 | 3 | 4; facility: 'htvs' | 'docking' | 'admet' }> = {
  '1.2': { stage: 2, facility: 'htvs' },
  '2.1': { stage: 3, facility: 'docking' },
  '2.2': { stage: 4, facility: 'admet' },
};

/** 결과 지표에서 최적 ΔG(kcal/mol) — 워커 도킹 결과의 'ΔG' 지표(유니코드 빼기도 받는다). */
export function affinityOf(result: ExperimentResult | undefined | null): number | null {
  const metric = result?.metrics?.find((m) => m.label.includes('ΔG'));
  if (!metric) return null;
  const value = Number.parseFloat(metric.value.replace(/[−–]/g, '-').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

interface Prepared {
  step: JobStep;
  params: Record<string, string | number | boolean>;
  summary: string;
  targetId: string;
  /** 입력을 확인한 표적 버전 — 접수 트랜잭션에서 그 사이 표적이 바뀌지 않았는지 다시 본다. */
  revisionId: string;
  smiles: string | null;
  label: string | null;
  parentJobId: string | null;
}

export async function startJob(deps: Deps, account: AccountView, raw: unknown): Promise<StartJobResponse> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (!REQUEST_ID.test(requestId)) throw badRequest('requestId 가 형식에 맞지 않아요.');
  const step = body.step as JobStep;
  if (!(step in STAGE)) throw badRequest('작업 단계는 1.2 · 2.1 · 2.2 중 하나예요.');

  const again = await findByRequest(deps.db, who.teamId, requestId);
  if (again) return { job: jobView(again), created: false };

  const prepared = await prepare(deps, who.teamId, step, (body.params ?? {}) as Record<string, unknown>);
  const cost = COSTS[step];

  const jobId = await withTx(deps.db, async (tx) => {
    await tx.query('select id from web.teams where id = $1 for update', [who.teamId]);
    await ensureTeamRows(tx, who.teamId);
    // 표적 바꾸기(programs for update)와 줄 세운다 — 입력을 확인한 뒤 표적 버전이 바뀌었으면 접수하지 않는다.
    await tx.query('select 1 from web.programs where team_id = $1 for share', [who.teamId]);
    const dup = await tx.query<{ id: string }>('select id from web.jobs where team_id = $1 and request_id = $2', [who.teamId, requestId]);
    if (dup.rows[0]) return { id: dup.rows[0].id, created: false };
    const current = await loadProgramRow(tx, who.teamId);
    if (current.revision_id !== prepared.revisionId) throw new ApiError(409, 'stale', '그 사이 모둠 표적이 바뀌었어요. 화면을 새로 고쳐 다시 해 주세요.');
    const active = await tx.query<{ n: number }>(`select count(*)::int as n from web.jobs where team_id = $1 and status in ('queued', 'running')`, [who.teamId]);
    if (active.rows[0]!.n >= TEAM_ACTIVE_MAX) throw new ApiError(429, 'too_many_jobs', `모둠에서 동시에 돌릴 수 있는 작업은 ${TEAM_ACTIVE_MAX}개예요. 하나가 끝나면 다시 해 주세요.`, { retryAfterSec: 10 });
    const balance = await balanceOf(tx, who.teamId);
    if (balance < cost) throw new ApiError(402, 'insufficient_funds', '연구비가 모자라요.');
    const { stage, facility } = STAGE[step];
    const inserted = await tx.query<{ id: string }>(
      `insert into web.jobs (team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id, smiles, label, parent_job_id, cost_cents, timeout_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now() + make_interval(mins => $16))
       returning id`,
      [who.teamId, who.classId, account.userId, requestId, step, stage, facility, JSON.stringify(prepared.params), prepared.summary,
        prepared.targetId, prepared.revisionId, prepared.smiles, prepared.label, prepared.parentJobId, cost, JOB_DEADLINE_MIN],
    );
    const id = inserted.rows[0]!.id;
    if (cost > 0) {
      await tx.query(
        `insert into web.ledger (team_id, amount_cents, kind, idem_key, job_id, created_by) values ($1, $2, 'paid_work', $3, $4, $5)`,
        [who.teamId, -cost, `job:${id}`, id, account.userId],
      );
      // 첫 유료 행동 — 그 뒤 스타트업 이름은 교사만 고친다(설계 §4.3).
      await tx.query('update web.teams set name_locked_at = coalesce(name_locked_at, now()) where id = $1', [who.teamId]);
    }
    return { id, created: true };
  });

  if (jobId.created) {
    deps.hub.publish(teamChannel(who.teamId), { type: 'board.changed', teamId: who.teamId, reason: `job:${step}`, byName: account.displayName });
    await deps.jobs.submit(jobId.id);
  }
  const row = await loadJob(deps.db, jobId.id);
  return { job: jobView(row!), created: jobId.created };
}

async function findByRequest(db: Pool, teamId: string, requestId: string): Promise<JobRow | null> {
  const result = await db.query<JobRow>(`${JOB_SELECT} where j.team_id = $1 and j.request_id = $2`, [teamId, requestId]);
  return result.rows[0] ?? null;
}

async function loadJob(db: Pool, id: string): Promise<JobRow | null> {
  const result = await db.query<JobRow>(`${JOB_SELECT} where j.id = $1`, [id]);
  return result.rows[0] ?? null;
}

/** 단계별 입력 확인 · 워커 입력 만들기 — 과금 전에 끝낸다. */
async function prepare(deps: Deps, teamId: string, step: JobStep, params: Record<string, unknown>): Promise<Prepared> {
  const program = await loadProgramRow(deps.db, teamId);
  const targetId = program.target_id;
  const revisionId = program.revision_id;
  if (!targetId || !revisionId) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');

  // 선행 단계 · 부모 작업은 지금 표적 버전 것만 — 표적을 바꿨다 돌아와도 옛 버전의 결과는 근거가 아니다.
  const succeeded = async (s: JobStep) =>
    (await deps.db.query(`select 1 from web.jobs where team_id = $1 and step = $2 and program_revision_id = $3 and status = 'succeeded' limit 1`, [teamId, s, revisionId])).rowCount! > 0;

  if (step === '1.2') {
    const p = checkScreenParams(params);
    return {
      step,
      targetId,
      revisionId,
      smiles: null,
      label: null,
      parentJobId: null,
      params: {
        targetId,
        maxMw: p.maxMw,
        maxTpsa: p.maxTpsa,
        ro5Only: p.ro5Only,
        excludeAlerts: p.excludeAlerts,
        topN: 20,
        ...(p.library ? { library: p.library } : {}),
      },
      summary: `${p.library ?? '전체 라이브러리'} · MW ≤ ${p.maxMw} · TPSA ≤ ${p.maxTpsa}${p.ro5Only ? ' · Ro5 엄격' : ''}${p.excludeAlerts ? ' · 구조 경고 제외' : ''}`,
    };
  }

  if (step === '2.1') {
    if (!(await succeeded('1.2'))) throw new ApiError(409, 'step_locked', '1.2 스크리닝을 먼저 한 번 돌려 주세요.');
    const input = checkSmiles(params.smiles);
    if (input.length > SMILES_MAX_LENGTH) throw badRequest('SMILES 가 너무 길어요.');
    const label = checkLabel(params.label);
    let parentJobId: string | null = null;
    if (typeof params.parentJobId === 'string' && params.parentJobId) {
      if (!UUID.test(params.parentJobId)) throw badRequest('부모 작업 id 가 형식에 맞지 않아요.');
      const parent = await deps.db.query<{ program_revision_id: string | null }>('select program_revision_id from web.jobs where id = $1 and team_id = $2', [params.parentJobId, teamId]);
      if (!parent.rows[0]) throw badRequest('부모 분자는 우리 모둠의 작업이어야 해요.');
      if (parent.rows[0].program_revision_id !== revisionId) throw new ApiError(409, 'step_locked', '부모 분자는 지금 표적으로 낸 작업이어야 해요.');
      parentJobId = params.parentJobId;
    }
    // 과금 전에 워커 RDKit 로 확인 — 계산할 수 없는 분자는 여기서 거절하고 정규 SMILES 로 바꿔 보낸다.
    let canonical: string;
    try {
      const outcome = await deps.worker.properties(input);
      if (!outcome.ok) throw new ApiError(400, 'invalid_input', outcome.message);
      canonical = outcome.properties.canonicalSmiles;
    } catch (error) {
      if (error instanceof WorkerUnavailableError) throw new ApiError(503, 'worker_unavailable', error.message, { retryAfterSec: 5 });
      throw error;
    }
    return {
      step,
      targetId,
      revisionId,
      smiles: canonical,
      label,
      parentJobId,
      params: { targetId, smiles: canonical, ...(label ? { label } : {}) },
      summary: `${label ?? canonical.slice(0, 32)} · ${targetId}`,
    };
  }

  // 2.2 — 우리 모둠이 지금 표적으로 도킹을 끝낸 분자만(crista 결함 피하기: ADMET 입력을 도킹 근거와 대조 — 설계 §10).
  if (!(await succeeded('2.1'))) throw new ApiError(409, 'step_locked', '2.1 도킹을 먼저 한 번 끝내 주세요.');
  const dockingJobId = typeof params.dockingJobId === 'string' ? params.dockingJobId : '';
  if (!UUID.test(dockingJobId)) throw badRequest('ADMET 로 볼 도킹 결과를 골라 주세요.');
  const dock = await deps.db.query<{ status: string; program_revision_id: string | null; canonical_smiles: string | null; smiles: string | null; label: string | null }>(
    `select status, program_revision_id, canonical_smiles, smiles, label from web.jobs where id = $1 and team_id = $2 and step = '2.1'`,
    [dockingJobId, teamId],
  );
  const d = dock.rows[0];
  if (!d || d.status !== 'succeeded' || d.program_revision_id !== revisionId) throw new ApiError(409, 'step_locked', '지금 표적으로 끝난 우리 모둠의 도킹 결과만 ADMET 로 볼 수 있어요.');
  const smiles = d.canonical_smiles ?? d.smiles!;
  return {
    step,
    targetId,
    revisionId,
    smiles,
    label: d.label,
    parentJobId: dockingJobId,
    params: { smiles, ...(d.label ? { label: d.label } : {}) },
    summary: `${d.label ?? smiles.slice(0, 32)} · ADMET`,
  };
}

// ── 폴러 ──

export class JobRunner {
  private readonly db: Pool;
  private readonly worker: BioWorker;
  private readonly hub: Hub;
  private timer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private ticking = false;
  private warnedUnavailable = false;
  /** 워커 `/healthz` 의 모드 — 화면이 '고정 결과(테스트)' 를 알린다. */
  workerMode: 'fixture' | 'compute' | null = null;

  constructor(db: Pool, worker: BioWorker, hub: Hub) {
    this.db = db;
    this.worker = worker;
    this.hub = hub;
  }

  start(): void {
    this.timer = setInterval(() => void this.tick(), POLL_MS);
    this.timer.unref();
    const health = () =>
      this.worker
        .health()
        .then((h) => {
          if (this.workerMode !== h.mode) console.log(`[jobs] 워커 ${h.mode} 모드 · ${h.version}${h.targets ? ` · 표적 ${h.targets.length}종` : ''}`);
          this.workerMode = h.mode;
        })
        .catch(() => {});
    void health();
    this.healthTimer = setInterval(health, 60_000);
    this.healthTimer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.healthTimer) clearInterval(this.healthTimer);
  }

  private notify(teamId: string, reason: string): void {
    this.hub.publish(teamChannel(teamId), { type: 'board.changed', teamId, reason });
  }

  /** 워커에 낸다(처음 · 다시). 실패는 기록만 하고 폴러가 이어 받는다. */
  async submit(jobId: string): Promise<void> {
    const row = await loadJob(this.db, jobId);
    if (!row || (row.status !== 'queued' && row.status !== 'running')) return;
    try {
      const outcome = await this.worker.submit({
        jobId: workerJobId(row.id),
        requestId: row.request_id,
        classId: workerScopeId(row.class_id),
        teamId: workerScopeId(row.team_id),
        generation: 1,
        stage: row.stage as 2 | 3 | 4,
        facility: row.facility as 'htvs' | 'docking' | 'admet',
        params: row.params,
        cLevel: row.by_avatar ? (row.by_avatar.toUpperCase() as 'CEO' | 'CSO' | 'CTO' | 'CMO') : null,
      });
      if (outcome.kind === 'rejected') {
        await this.fail(row, { code: outcome.code === 'invalid_input' ? 'invalid_input' : 'bad_request', message: outcome.message, retryable: false });
        return;
      }
      const a = outcome.accepted;
      await this.db.query(
        `update web.jobs set worker_known = true, submit_attempts = submit_attempts + 1, source = $2, test = $3,
                status = case when status = 'queued' and $4 = 'running' then 'running' else status end, updated_at = now()
          where id = $1`,
        [row.id, a.source, a.source === 'fixture', a.status],
      );
      this.warnedUnavailable = false;
    } catch (error) {
      if (!(error instanceof WorkerUnavailableError)) throw error;
      const attempts = row.submit_attempts + 1;
      await this.db.query('update web.jobs set submit_attempts = $2, updated_at = now() where id = $1', [row.id, attempts]);
      if (!this.warnedUnavailable) console.error(`[jobs] 워커에 닿지 않음(${error.message}) — 다시 시도합니다.`);
      this.warnedUnavailable = true;
      if (attempts >= MAX_SUBMIT_ATTEMPTS) {
        await this.fail(row, { code: 'worker_unavailable', message: '계산 워커에 닿지 않아 작업을 접수하지 못했어요. 연구비는 돌려받았어요.', retryable: true });
      }
    }
  }

  /** 실행 실패 — 작업을 실패로 적고 한 번만 환급. */
  private async fail(row: JobRow, error: { code: string; message: string; retryable: boolean }): Promise<void> {
    await withTx(this.db, async (tx) => {
      const updated = await tx.query(
        `update web.jobs set status = 'failed', error = $2, finished_at = now(), updated_at = now() where id = $1 and status in ('queued', 'running')`,
        [row.id, JSON.stringify(error)],
      );
      if (!updated.rowCount) return;
      await this.refund(tx, row);
    });
    this.notify(row.team_id, `job.failed:${row.step}`);
  }

  private async refund(tx: Pick<Pool, 'query'>, row: JobRow): Promise<void> {
    const cost = Number(row.cost_cents);
    if (cost <= 0) return;
    const inserted = await tx.query(
      `insert into web.ledger (team_id, amount_cents, kind, idem_key, job_id) values ($1, $2, 'paid_work_refund', $3, $4)
       on conflict (team_id, idem_key) do nothing`,
      [row.team_id, cost, `refund:${row.id}`, row.id],
    );
    if (inserted.rowCount) await tx.query('update web.jobs set refunded_cents = cost_cents where id = $1', [row.id]);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const active = await this.db.query<JobRow>(`${JOB_SELECT} where j.status in ('queued', 'running') order by j.created_at limit 40`);
      for (const row of active.rows) {
        try {
          await this.step(row);
        } catch (error) {
          if (error instanceof WorkerUnavailableError) {
            if (!this.warnedUnavailable) console.error(`[jobs] 워커에 닿지 않음(${error.message}) — 다음 주기에 다시 읽습니다.`);
            this.warnedUnavailable = true;
            break;
          }
          console.error(`[jobs] 작업 ${row.id} 처리 중 오류:`, (error as Error).message);
        }
      }
    } catch (error) {
      console.error('[jobs] 폴러 오류:', (error as Error).message);
    } finally {
      this.ticking = false;
    }
  }

  private async step(row: JobRow): Promise<void> {
    if (row.timeout_at && row.timeout_at.getTime() < Date.now()) {
      await this.worker.cancel(workerJobId(row.id)).catch(() => {});
      await this.fail(row, { code: 'worker_timeout', message: '계산이 제한 시간 안에 끝나지 않았어요. 연구비는 돌려받았어요.', retryable: true });
      return;
    }
    if (!row.worker_known) {
      await this.submit(row.id);
      return;
    }
    const state = await this.worker.read(workerJobId(row.id));
    if (state === null) {
      // 워커가 재시작해 작업을 잊었다 — 같은 jobId 로 다시 낸다.
      await this.db.query('update web.jobs set worker_known = false, updated_at = now() where id = $1', [row.id]);
      return;
    }
    this.warnedUnavailable = false;
    await this.apply(row, state);
  }

  private async apply(row: JobRow, state: WorkerJobState): Promise<void> {
    if (state.status === 'succeeded') {
      const result = state.result ?? null;
      const canonical = state.artifacts?.canonicalSmiles ?? result?.provenance?.canonicalSmiles ?? row.smiles;
      const updated = await this.db.query(
        `update web.jobs set status = 'succeeded', progress = 1, phase = $2, queue_position = null, source = $3, test = $4,
                result = $5, canonical_smiles = $6, affinity_kcal = $7, finished_at = now(), updated_at = now()
          where id = $1 and status in ('queued', 'running')`,
        [row.id, state.phase ?? null, state.source, state.test, JSON.stringify(result), canonical, row.step === '2.1' ? affinityOf(result) : null],
      );
      if (updated.rowCount) this.notify(row.team_id, `job.succeeded:${row.step}`);
      return;
    }
    if (state.status === 'failed') {
      const e = state.error;
      await this.fail(row, {
        code: e?.code ?? 'worker_failed',
        message: `${e?.message ?? '계산이 실패했어요.'} 연구비는 돌려받았어요.`,
        retryable: e?.retryable ?? true,
      });
      return;
    }
    const progress = Math.max(0, Math.min(1, state.progress ?? 0));
    const changed = state.status !== row.status || Math.abs(progress - row.progress) >= 0.01 || (state.phase ?? null) !== row.phase || (state.queuePosition ?? null) !== row.queue_position;
    if (!changed) return;
    await this.db.query(
      `update web.jobs set status = $2, progress = $3, phase = $4, queue_position = $5, source = $6, test = $7, updated_at = now() where id = $1 and status in ('queued', 'running')`,
      [row.id, state.status, progress, state.phase ?? null, state.queuePosition ?? null, state.source, state.test],
    );
    this.hub.publish(teamChannel(row.team_id), {
      type: 'job.progress',
      teamId: row.team_id,
      jobId: row.id,
      status: state.status,
      progress,
      ...(state.phase ? { phase: state.phase } : {}),
      ...(state.queuePosition !== undefined ? { queuePosition: state.queuePosition } : {}),
    });
    if (state.status !== row.status) this.notify(row.team_id, `job.running:${row.step}`);
  }
}

/** 화면이 만드는 requestId 와 같은 모양(테스트 · 스크립트용). */
export const newRequestId = (): string => randomUUID().replace(/-/g, '');
