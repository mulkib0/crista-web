/**
 * 항체 랩 작업 러너(설계 §5.7) — `web.jobs` 는 저분자 워커 전용 check 에 묶여 있어 **별도 표 + 별도 러너**를 둔다.
 *
 * - 1.5초 tick · 진행 중 상한 · `timeout_at` · 도메인별 동시요청 상한 · 실패 시 **한 번만** 환급.
 * - 어댑터는 **하나의 `Limiter` 를 모든 어댑터에 같은 것으로** 넘긴다(어댑터마다 만들면 ESMFold 가 1 이 아니라 N 이 된다 — 묶음 2 메모 ⑭).
 * - 캐시는 `web.antibody_cache` 로 `CacheStore` 두 메서드만 구현한다(묶음 2 메모 ⑬).
 * - 접수 트랜잭션 순서는 §5.7 그대로: requestId 형식 → 같은 (team, requestId) → 입력 확인 → teams FOR UPDATE →
 *   `ensureAntibodyRows`(맨 먼저 `ensureTeamRows`) → 동시 작업 상한 → 사람별 상한 → 잔액 → insert → 원장 → 커밋 뒤 방송.
 */
import {
  ANTIBODY_JOB_STEPS,
  ESMFOLD_MAX_RESIDUES,
  SCFV_LINKER,
  antibodyGrade,
  teamChannel,
  type AbChain,
  type AccountView,
  type AntibodyDataMode,
  type AntibodyJobResponse,
  type AntibodyJobStep,
  type CdrSpan,
  type ChainRoles,
  type ComplexView,
  type DiversityView,
  type FoldView,
  type Provenance,
} from '@crista-web/web-contract';
import type { Config } from '../../config.ts';
import type { Deps } from '../../context.ts';
import { isUniqueViolation, withTx, type Pool } from '../../db.ts';
import type { Hub } from '../../hub.ts';
import { ApiError, badRequest } from '../../http.ts';
import { balanceCents, charge, credit } from '../../ledger.ts';
import { notifyTeam, teamMember } from '../../pipeline.ts';
import { bindScore, type InterfaceContact } from './bind-score.ts';
import type { CacheEntry, CacheStore } from './cache.ts';
import { createChemblAdapter, type ChemblAdapter } from './chembl.ts';
import { createColabfoldAdapter, type ColabfoldAdapter } from './colabfold.ts';
import { diversityFromA3m, isLocked } from './diversity.ts';
import { createEsmfoldAdapter, type EsmfoldAdapter } from './esmfold.ts';
import { designFit } from './fit.ts';
import { fixtureByAntibody } from './fixtures.ts';
import { createBoltzAdapter, type BoltzAdapter } from './optional-boltz.ts';
import { resolveNumbering } from './numbering.ts';
import { createNimAdapter, type NimAdapter } from './optional-nim.ts';
import { createLimiter, type Limiter } from './queue.ts';
import { createRcsbAdapter, type RcsbAdapter } from './rcsb.ts';
import { createSabdabAdapter, type SabdabAdapter } from './sabdab.ts';
import {
  ANTIBODY_COSTS,
  ANTIBODY_TEAM_ACTIVE_MAX,
  DEFAULT_SCHEME,
  MY_JOB_MAX,
  computePreview,
  diversityViewOf,
  jobView,
  loadDiversityMap,
  loadInterfacePairs,
  loadJobRow,
  loadRevision,
  loadSettings,
  loadSigma,
  lockedRevision,
  programConfirmed,
  type AbRevision,
} from './service.ts';

const TICK_MS = 1_500;
const JOB_TIMEOUT_MIN = 10;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
/** 러너가 한 번에 돌리는 작업 수 — 도메인별 상한은 `Limiter` 가 다시 좁힌다. */
const RUNNER_SLOTS = 4;

// ── DB 캐시(web.antibody_cache) ──

export function dbCacheStore(db: Pool): CacheStore {
  return {
    async get(key) {
      const rows = await db.query<{ cache_key: string; provider: string; body: string; fetched_at: Date }>(
        'select cache_key, provider, body, fetched_at from web.antibody_cache where cache_key = $1',
        [key],
      );
      const row = rows.rows[0];
      return row ? { key: row.cache_key, provider: row.provider, body: row.body, storedAt: row.fetched_at.toISOString() } : null;
    },
    async put(entry: CacheEntry) {
      await db.query(
        `insert into web.antibody_cache (cache_key, provider, body, bytes) values ($1, $2, $3, $4)
         on conflict (cache_key) do update set provider = excluded.provider, body = excluded.body, bytes = excluded.bytes, fetched_at = now()`,
        [entry.key, entry.provider, entry.body, Buffer.byteLength(entry.body)],
      );
    },
  };
}

// ── 어댑터 한 벌 ──

export interface AntibodyPorts {
  chembl: ChemblAdapter;
  rcsb: RcsbAdapter;
  colabfold: ColabfoldAdapter;
  sabdab: SabdabAdapter;
  esmfold: EsmfoldAdapter;
  nim: NimAdapter | null;
  boltz: BoltzAdapter | null;
  limiter: Limiter;
  cache: CacheStore;
}

export function createAntibodyPorts(db: Pool, config: Config, fetchImpl: typeof fetch = fetch): AntibodyPorts {
  const cache = dbCacheStore(db);
  const limiter = createLimiter();
  const base = { fetch: fetchImpl, userAgent: config.antibody.userAgent, cache, limiter, offline: config.antibody.offline };
  return {
    chembl: createChemblAdapter(base),
    rcsb: createRcsbAdapter(base),
    colabfold: createColabfoldAdapter(base),
    sabdab: createSabdabAdapter(base),
    esmfold: createEsmfoldAdapter(base),
    nim: createNimAdapter({ fetch: fetchImpl, apiKey: config.antibody.nvidiaKey, userAgent: config.antibody.userAgent, limiter }),
    boltz: createBoltzAdapter({ fetch: fetchImpl, apiKey: config.antibody.boltzKey, userAgent: config.antibody.userAgent, limiter }),
    limiter,
    cache,
  };
}

// ── 러너 ──

export class AntibodyRunner {
  readonly ports: AntibodyPorts;
  /** 마지막으로 본 자료 모드 — 화면에 늘 보인다(저분자의 workerMode 와 같은 뜻). */
  dataMode: AntibodyDataMode;
  private deps: Deps | null = null;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private readonly db: Pool;
  private readonly hub: Hub;
  private readonly offline: boolean;

  constructor(db: Pool, config: Config, hub: Hub, ports: AntibodyPorts = createAntibodyPorts(db, config)) {
    this.db = db;
    this.hub = hub;
    this.ports = ports;
    this.offline = config.antibody.offline;
    this.dataMode = config.antibody.offline ? 'fixture' : 'live';
  }

  bindDeps(deps: Deps): void {
    this.deps = deps;
  }

  start(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** 접수 직후 한 번 깨운다(폴링을 기다리지 않게). */
  async submit(jobId: string): Promise<void> {
    void jobId;
    await this.tick();
  }

  private note(mode: AntibodyDataMode): void {
    // 가장 나쁜 쪽을 기억한다 — 한 번이라도 fixture 로 내려갔으면 화면에 그렇게 보인다.
    if (this.offline) {
      this.dataMode = 'fixture';
      return;
    }
    if (mode === 'fixture' || this.dataMode === 'fixture') this.dataMode = mode === 'live' ? 'cached' : 'fixture';
    else this.dataMode = mode;
  }

  /**
   * 원본 항체 가변영역 — A1 확정 때 쓴다. 어댑터가 캐시 → 고정 예시까지 3층으로 내려가고,
   * 그마저 없으면 '다른 원본 항체를 골라 주세요'로 끝낸다(없는 서열을 꾸미지 않는다).
   */
  async parentChains(moleculeChemblId: string): Promise<{ name: string; vh: string; vl: string | null }> {
    const known = fixtureByAntibody(moleculeChemblId);
    try {
      const got = await this.ports.chembl.antibodySequences(moleculeChemblId);
      this.note(got.dataMode);
      if (!got.value.vh) throw new ApiError(409, 'invalid_input', '그 원본 항체의 중쇄 서열을 찾지 못했어요. 다른 원본 항체를 골라 주세요.');
      return { name: got.value.name || known?.parentAntibodyName || moleculeChemblId, vh: got.value.vh, vl: got.value.vl ?? null };
    } catch (error) {
      this.note('fixture');
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'worker_unavailable', '원본 항체 서열을 받지 못했어요. 잠시 뒤 다시 해 주세요.');
    }
  }

  async tick(): Promise<void> {
    if (this.ticking || !this.deps) return;
    this.ticking = true;
    try {
      // 만기 작업을 먼저 거둔다(환급 포함).
      const stale = await this.db.query<{ id: string }>(
        `select id from web.antibody_jobs where status in ('queued', 'running') and timeout_at is not null and timeout_at < now() limit 10`,
      );
      for (const row of stale.rows) await this.finishFailed(row.id, 'timeout', '시간이 너무 오래 걸려 멈췄어요. 잠시 뒤 다시 해 주세요.');

      const running = await this.db.query<{ n: number }>(`select count(*)::int as n from web.antibody_jobs where status = 'running'`);
      const free = Math.max(0, RUNNER_SLOTS - (running.rows[0]?.n ?? 0));
      if (free === 0) return;
      const queued = await this.db.query<{ id: string }>(
        `select id from web.antibody_jobs where status = 'queued' order by created_at limit $1`,
        [free],
      );
      await Promise.all(queued.rows.map((row) => this.run(row.id)));
    } catch (error) {
      console.error('[antibody] 틱 오류:', (error as Error).message);
    } finally {
      this.ticking = false;
    }
  }

  private async progress(jobId: string, teamId: string, progress: number, phase: string): Promise<void> {
    await this.db.query('update web.antibody_jobs set progress = $2, phase = $3 where id = $1', [jobId, Math.max(0, Math.min(1, progress)), phase]);
    this.hub.publish(teamChannel(teamId), { type: 'antibody.progress', teamId, jobId, status: 'running', progress, phase });
  }

  private async run(jobId: string): Promise<void> {
    const claimed = await this.db.query<{ id: string; team_id: string; step: AntibodyJobStep }>(
      `update web.antibody_jobs set status = 'running', started_at = now(), progress = 0.05, phase = '시작' where id = $1 and status = 'queued'
       returning id, team_id, step`,
      [jobId],
    );
    const job = claimed.rows[0];
    if (!job) return;
    try {
      const result = await this.execute(jobId, job.step, job.team_id);
      await this.db.query(
        `update web.antibody_jobs set status = 'succeeded', progress = 1, phase = null, provider = $2, result = $3, approx = $4, finished_at = now() where id = $1`,
        [jobId, result.provider, JSON.stringify(result.payload), result.approx],
      );
      this.hub.publish(teamChannel(job.team_id), { type: 'antibody.changed', teamId: job.team_id, reason: `antibody:job:${job.step}` });
      if (this.deps) await this.postJobNews(job.team_id, job.step);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : (error as Error).message;
      await this.finishFailed(jobId, 'failed', message.slice(0, 400));
    }
  }

  /** 실패 · 만기 — **환급은 한 번만**(원장 멱등 키 + refunded_cents). */
  private async finishFailed(jobId: string, status: 'failed' | 'timeout', message: string): Promise<void> {
    await withTx(this.db, async (tx) => {
      const rows = await tx.query<{ team_id: string; cost_cents: string; refunded_cents: string; step: AntibodyJobStep }>(
        `update web.antibody_jobs set status = $2, phase = null, error_message = $3, finished_at = now()
          where id = $1 and status in ('queued', 'running') returning team_id, cost_cents, refunded_cents, step`,
        [jobId, status, message],
      );
      const job = rows.rows[0];
      if (!job) return;
      const cost = Number(job.cost_cents);
      if (cost > 0 && Number(job.refunded_cents) === 0) {
        const done = await credit(tx, {
          teamId: job.team_id,
          cents: cost,
          kind: 'paid_work_refund',
          idemKey: `ab-job-refund:${jobId}`,
          ref: { type: 'antibody_job', id: jobId },
        });
        if (done.inserted) await tx.query('update web.antibody_jobs set refunded_cents = $2 where id = $1', [jobId, cost]);
      }
      this.hub.publish(teamChannel(job.team_id), { type: 'antibody.changed', teamId: job.team_id, reason: `antibody:job:${job.step}:failed` });
    });
  }

  /** 접힘 첫 성공 · 복합체 평가 통과 소식(§11.3). */
  private async postJobNews(teamId: string, step: AntibodyJobStep): Promise<void> {
    if (step !== 'A4' && step !== 'A5') return;
    const deps = this.deps;
    if (!deps) return;
    const { postAntibodyEvent } = await import('./events.ts');
    const team = await this.db.query<{ class_id: string; ticker: string | null }>('select class_id, ticker from web.teams where id = $1', [teamId]);
    const row = team.rows[0];
    if (!row) return;
    const rev = await loadRevision(this.db, teamId);
    const kind = step === 'A4' ? 'antibody_fold' : 'antibody_complex';
    const headline =
      step === 'A4'
        ? `◆ ${row.ticker ?? '—'} 항체 구조 예측 성공 — ${rev.antigenTarget ?? '표적'}`
        : `◆ ${row.ticker ?? '—'} 항체 복합체 평가 통과 — ${rev.antigenTarget ?? '표적'}`;
    const posted = await withTx(this.db, async (tx) =>
      postAntibodyEvent(tx, deps, {
        classId: row.class_id,
        teamId,
        kind,
        headline,
        changeHint: step === 'A4' ? 1 : 2,
        public: { stage: step === 'A4' ? 'antibody_A4' : 'antibody_A5', target: rev.antigenTarget },
        idemKey: `${kind}:${rev.revisionId}`,
        gameDay: null,
      }),
    );
    posted.after();
  }

  // ── 단계별 실행 ──

  private async execute(jobId: string, step: AntibodyJobStep, teamId: string): Promise<{ payload: Record<string, unknown>; provider: string; approx: boolean }> {
    const rev = await loadRevision(this.db, teamId);
    if (step === 'A2') return this.runDiversity(jobId, teamId, rev);
    if (step === 'A4') return this.runFold(jobId, teamId, rev);
    return this.runComplex(jobId, teamId, rev);
  }

  /** A2 — 비슷한 항체를 모아(ColabFold MSA) 자리별 레퍼토리 다양성과 IMGT 번호 · CDR 구간을 낸다. */
  private async runDiversity(jobId: string, teamId: string, rev: AbRevision): Promise<{ payload: Record<string, unknown>; provider: string; approx: boolean }> {
    if (!rev.parentVh) throw new ApiError(409, 'step_locked', 'A1 에서 원본 항체를 먼저 정해 주세요.');
    const chains: Array<{ chain: AbChain; seq: string }> = [{ chain: 'H', seq: rev.parentVh }];
    if (rev.parentVl) chains.push({ chain: 'L', seq: rev.parentVl });

    // 번호 매김 — 실측 항체 데이터베이스가 주면 그것, 아니면 germline · 정규식으로 강등한다.
    let sabdab: Awaited<ReturnType<SabdabAdapter['imgtNumbering']>> | null = null;
    await this.progress(jobId, teamId, 0.15, '실측 항체 번호 맞추기');
    try {
      sabdab = await this.ports.sabdab.imgtNumbering(rev.parentVh, rev.parentVl ?? undefined);
      this.note(sabdab.dataMode);
    } catch (error) {
      console.warn('[antibody] SAbDab2 번호 매김 실패 — germline 정렬로 내려갑니다:', (error as Error).message);
    }

    const views: DiversityView[] = [];
    const raw: Array<{ chain: AbChain; percentiles: number[] }> = [];
    let mode: AntibodyDataMode = 'live';
    for (const [i, { chain, seq }] of chains.entries()) {
      await this.progress(jobId, teamId, 0.25 + i * 0.3, chain === 'H' ? '중쇄 비슷한 항체 모으기' : '경쇄 비슷한 항체 모으기');
      let msa;
      try {
        msa = await this.ports.colabfold.fetchMsa(seq, (phase) => void this.progress(jobId, teamId, 0.3 + i * 0.3, phase));
      } catch (error) {
        // 한 사슬을 모으지 못해도 **중쇄가 됐으면** 그것만 보여 준다(없는 값을 꾸미지 않고 빠뜨린 사실만 적는다).
        if (chain === 'L' && views.length > 0) {
          console.warn('[antibody] 경쇄 레퍼토리를 모으지 못해 중쇄만 보여 줍니다:', (error as Error).message);
          continue;
        }
        throw error;
      }
      this.note(msa.dataMode);
      if (msa.dataMode === 'fixture') mode = 'fixture';
      const diversity = diversityFromA3m(msa.value.a3m);
      if (!diversity) throw new ApiError(503, 'worker_unavailable', '비슷한 항체를 모으지 못했어요. 잠시 뒤 다시 해 주세요.');

      const { numbered, cdrs, source } = resolveWithSabdab(seq, chain, sabdab);
      raw.push({ chain, percentiles: diversity.percentiles });
      views.push(
        diversityViewOf({
          chain,
          percentiles: diversity.percentiles,
          grades: diversity.grades,
          imgtNumbers: numbered,
          numberingSource: source,
          cdrs,
          msaDepth: diversity.msaDepth,
          provenance: msa.provenance,
        }),
      );
    }
    await this.progress(jobId, teamId, 0.95, '정리');
    return {
      payload: {
        diversity: views,
        diversityRaw: raw,
        source: 'edu-approx',
        approx: true,
        calledAt: new Date().toISOString(),
      },
      provider: mode === 'fixture' ? 'fixture' : 'colabfold',
      approx: true,
    };
  }

  /** A4 — Fv 또는 scFv 를 접는다(ESMFold · 400잔기 상한). */
  private async runFold(jobId: string, teamId: string, rev: AbRevision): Promise<{ payload: Record<string, unknown>; provider: string; approx: boolean }> {
    const job = await this.db.query<{ design_id: string | null; result: { shape?: string } | null }>('select design_id, result from web.antibody_jobs where id = $1', [jobId]);
    const designId = job.rows[0]?.design_id;
    if (!designId) throw new ApiError(409, 'invalid_input', '접을 설계를 고르지 않았어요.');
    const design = await this.db.query<{ vh: string; vl: string | null }>('select vh, vl from web.antibody_designs where id = $1', [designId]);
    const row = design.rows[0];
    if (!row) throw new ApiError(404, 'not_found', '없는 설계예요.');
    const shape = row.vl && job.rows[0]?.result?.shape === 'scfv' ? 'scfv' : 'fv';

    await this.progress(jobId, teamId, 0.2, '구조 예측 요청');
    const folded = shape === 'scfv' && row.vl ? await this.ports.esmfold.foldScfv(row.vh, row.vl) : await this.ports.esmfold.foldSequence(row.vh, 'fv');
    this.note(folded.dataMode);
    await this.progress(jobId, teamId, 0.8, '확신도 정리');

    const { cdrs } = computePreview(row.vh, row.vl ?? undefined, DEFAULT_SCHEME);
    const offsetL = shape === 'scfv' ? row.vh.length + SCFV_LINKER.length : null;
    const bySegment = segmentsOf(folded.value.perResidue, cdrs, offsetL);
    const h3 = cdrs.find((c) => c.chain === 'H' && c.cdr === 3);
    const chainRoles: ChainRoles = { set: rev.chainRoles.set ?? '1', H: 'A' };
    const fold: FoldView = {
      designId,
      pdb: folded.value.pdb,
      format: 'pdb',
      confidenceMean: Number(folded.value.mean.toFixed(2)),
      confidenceCdrH3: h3 ? meanOf(folded.value.perResidue.slice(h3.start - 1, h3.end)) : 0,
      bySegment,
      chainRoles,
      provenance: folded.provenance,
    };
    return {
      payload: { fold, shape, source: 'ai-predict', approx: true, calledAt: new Date().toISOString() },
      provider: folded.dataMode === 'fixture' ? 'fixture' : 'esmfold',
      approx: true,
    };
  }

  /** A5 — 레퍼런스 구조의 계면 잔기쌍으로 붙는 힘 점수 · 설계 적합도를 낸다(교육용 근사). */
  private async runComplex(jobId: string, teamId: string, rev: AbRevision): Promise<{ payload: Record<string, unknown>; provider: string; approx: boolean }> {
    const job = await this.db.query<{ design_id: string | null }>('select design_id from web.antibody_jobs where id = $1', [jobId]);
    const designId = job.rows[0]?.design_id;
    if (!designId) throw new ApiError(409, 'invalid_input', '평가할 설계를 고르지 않았어요.');
    const design = await this.db.query<{ vh: string; vl: string | null; mutations: Array<{ chain: AbChain; pos: number; wt: string; mut: string; cdr?: 1 | 2 | 3 }> }>(
      'select vh, vl, mutations from web.antibody_designs where id = $1',
      [designId],
    );
    const row = design.rows[0];
    if (!row) throw new ApiError(404, 'not_found', '없는 설계예요.');

    await this.progress(jobId, teamId, 0.25, '계면 잔기쌍 읽기');
    const stored = await loadInterfacePairs(this.db, rev);
    const sigma = await loadSigma(this.db, rev);
    const diversity = await loadDiversityMap(this.db, rev.revisionId);
    const mutations = row.mutations ?? [];
    const pairs: InterfaceContact[] = stored.map((p) => ({ chain: p.chain, pos: p.pos, aa: p.aa, agAa: p.agAa }));

    const interfaceKeys = new Set(stored.map((p) => `${p.chain}:${p.pos}`));
    const { effectiveMutations } = await import('./score.ts');
    const mEff = effectiveMutations(mutations, interfaceKeys, (chain, pos) => diversity.get(`${chain}:${pos}`) ?? null);

    await this.progress(jobId, teamId, 0.55, '붙는 힘 점수');
    const bind = bindScore(pairs, mutations, sigma ?? 0, mEff);

    // 지켜야 하는 계면 자리 — 다양성이 낮은(= 대부분 같은) 자리. 모르면 계면 유지항을 뺀다.
    const conserved = [...interfaceKeys].filter((key) => {
      const pct = diversity.get(key);
      return pct !== undefined && isLocked(pct);
    });
    const mutatedKeys = new Set(mutations.map((m) => `${m.chain}:${m.pos}`));
    const kept = conserved.filter((key) => !mutatedKeys.has(key)).length;
    const fit = designFit({ bindScore: bind.score, conservedInterfaceTotal: conserved.length, conservedInterfaceKept: kept });
    const parentFit = designFit({ bindScore: 65, conservedInterfaceTotal: conserved.length, conservedInterfaceKept: conserved.length });

    // 선택 키가 있으면 복합체 신뢰도도 받는다(없으면 교육용 근사만).
    // **점수에 섞지 않는다**: 설계 §4.1(a) 의 혼합식(`0.6·근사 + 0.4·신뢰도`)은 1차에서 쓰지 않고
    // 신뢰도는 **표시만** 한다(§11.5 폐기 목록 · §12). 키가 있는 모둠만 점수가 달라지면
    // 같은 학급에서 순위를 견줄 수 없기 때문이다.
    let iptm: number | null = null;
    let boltzProvenance: Provenance | null = null;
    if (this.ports.boltz) {
      await this.progress(jobId, teamId, 0.75, '복합체 신뢰도');
      try {
        const got = await this.ports.boltz.predictComplexWithBoltz({ vh: row.vh, ...(row.vl ? { vl: row.vl } : {}), antigen: rev.antigenTarget ?? '' });
        iptm = got.iptm;
        boltzProvenance = got.provenance;
      } catch (error) {
        console.warn('[antibody] 복합체 신뢰도 예측 실패 — 교육용 근사만 씁니다:', (error as Error).message);
      }
    }

    const cdrOf = (chain: AbChain, pos: number): string => {
      const { cdrs } = computePreview(row.vh, row.vl ?? undefined, DEFAULT_SCHEME);
      const hit = cdrs.find((c) => c.chain === chain && pos >= c.start && pos <= c.end);
      return hit ? `CDR${chain}${hit.cdr}` : `FR${chain}`;
    };
    const contacts = stored.slice(0, 200).map((p) => ({
      cdr: cdrOf(p.chain, p.pos),
      abResi: p.pos,
      abAa: p.aa,
      agResi: p.agResi,
      agAa: p.agAa,
      dist: p.dist,
      diversity: diversity.get(`${p.chain}:${p.pos}`) ?? 0,
    }));
    const byCdr = new Map<string, number>();
    for (const c of contacts) byCdr.set(c.cdr, (byCdr.get(c.cdr) ?? 0) + 1);

    const complex: ComplexView = {
      designId,
      fit: fit.fit,
      grade: antibodyGrade(fit.fit),
      bindScore: bind.score,
      bindRaw: bind.raw,
      chargePairShare: bind.chargePairShare,
      capCutShare: bind.capCutShare,
      interfaceKept: fit.interfaceKept ?? 0,
      deltaVsParent: Number(Math.max(0, fit.fit - parentFit.fit).toFixed(2)),
      ...(iptm !== null ? { iptm } : {}),
      contacts,
      contactsByCdr: [...byCdr].map(([cdr, count]) => ({ cdr, count })),
      // 배지는 **지표마다 하나**예요(§3.5). 붙는 힘 · 적합도는 늘 근사이고, 복합체 신뢰도를 실제로
      // 받았을 때만 그 배지가 한 줄 더 붙어요 — 근사 배지를 그 배지로 **갈아치우지 않아요**(§12).
      provenance: [
        {
          source: 'edu-approx',
          label: '교육용 근사 — 설계 적합도 · 붙는 힘 점수',
          detail:
            '레퍼런스 구조에서 미리 읽어 둔 계면 잔기쌍과 접촉 통계표로 계산한 교육용 지표예요. 실제 결합력이 아니고, 순위를 보는 데만 써요.',
          approx: true,
        },
        ...(boltzProvenance ? [boltzProvenance] : []),
      ],
    };
    return {
      payload: { complex, interfaceTermDropped: fit.interfaceTermDropped, source: 'edu-approx', approx: true, calledAt: new Date().toISOString() },
      provider: iptm !== null ? 'boltz' : 'approx',
      approx: true,
    };
  }
}

// ── 순수 helper ──

const meanOf = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2));

/** 표 대안의 재료(§6.4) — CDR 구간별 평균 확신도 + 나머지(틀 구간). */
export function segmentsOf(perResidue: readonly number[], cdrs: readonly CdrSpan[], offsetL: number | null): FoldView['bySegment'] {
  const out: FoldView['bySegment'] = [];
  const covered = new Set<number>();
  for (const cdr of cdrs) {
    if (cdr.chain === 'L' && offsetL === null) continue;
    const shift = cdr.chain === 'L' ? (offsetL as number) : 0;
    const start = cdr.start + shift;
    const end = Math.min(perResidue.length, cdr.end + shift);
    if (start > end) continue;
    for (let i = start; i <= end; i += 1) covered.add(i);
    out.push({ label: `CDR${cdr.chain}${cdr.cdr}`, start, end, mean: meanOf(perResidue.slice(start - 1, end)) });
  }
  out.sort((a, b) => a.start - b.start);
  // 틀 구간은 CDR 을 뺀 나머지 전체라 늘 **마지막 한 줄**로 둔다(표가 구간 순서대로 읽히게).
  const rest = perResidue.filter((_, i) => !covered.has(i + 1));
  if (rest.length > 0) out.push({ label: '틀 구간', start: 1, end: perResidue.length, mean: meanOf(rest) });
  return out;
}

/** 번호 매김 — 실측 항체 데이터베이스가 준 번호를 먼저 쓰고, 안 맞으면 germline · 정규식으로 내려간다. */
function resolveWithSabdab(
  seq: string,
  chain: AbChain,
  sabdab: { value: { chains: Array<{ chain: AbChain; positions: Array<{ num: number; insertion: string; aa: string }> }> } } | null,
): { numbered: Array<[number, string]>; cdrs: CdrSpan[]; source: DiversityView['numberingSource'] } {
  const got = sabdab?.value.chains.find((c) => c.chain === chain);
  const pairs = got ? got.positions.filter((p) => p.aa !== '-').map((p): [number, string] => [p.num, p.insertion]) : undefined;
  const resolved = resolveNumberingSafe(seq, chain, pairs);
  const numbered = resolved.numbered ? resolved.numbered.residues.map((r): [number, string] => [r.num, r.insertion]) : seq.split('').map((_, i): [number, string] => [i + 1, '']);
  return { numbered, cdrs: resolved.cdrs, source: resolved.source };
}

function resolveNumberingSafe(seq: string, chain: AbChain, sabdabNumbering: Array<[number, string]> | undefined) {
  // 번호축이 어긋나면 throw 하니 보정 경로로 내려간다(§묶음 3 `NumberingAxisError`).
  try {
    return resolveNumbering({ seq, chain, scheme: DEFAULT_SCHEME, ...(sabdabNumbering ? { sabdabNumbering } : {}) });
  } catch {
    return resolveNumbering({ seq, chain, scheme: DEFAULT_SCHEME });
  }
}

// ── 접수(§5.7) ──

export async function startAntibodyJob(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodyJobResponse> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (!REQUEST_ID.test(requestId)) throw badRequest('requestId 가 형식에 맞지 않아요.');
  const step = body.step as AntibodyJobStep;
  if (!ANTIBODY_JOB_STEPS.includes(step)) throw badRequest('작업 단계는 A2 · A4 · A5 중 하나예요.');

  // ② 같은 (team, requestId) 면 그 작업을 돌려준다(과금 없음 · 200).
  const again = await deps.db.query<{ id: string }>('select id from web.antibody_jobs where team_id = $1 and request_id = $2', [who.teamId, requestId]);
  if (again.rows[0]) {
    const row = await loadJobRow(deps.db, again.rows[0].id);
    if (row) return { job: jobView(row), created: false };
  }

  // ③ 입력 확인은 트랜잭션 · 과금 **전**.
  const settings = await loadSettings(deps.db, who.classId);
  const pre = await loadRevision(deps.db, who.teamId);
  if (!programConfirmed(pre)) throw new ApiError(409, 'step_locked', 'A1 에서 표적과 원본 항체를 먼저 정해 주세요.');
  const designId = typeof body.designId === 'string' && body.designId !== '' ? body.designId : null;
  const params = (body.params ?? {}) as Record<string, unknown>;
  if (step !== 'A2' && designId === null) throw badRequest('작업할 설계를 골라 주세요.');

  const cost = ANTIBODY_COSTS[step];
  const created = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    const dup = await tx.query<{ id: string }>('select id from web.antibody_jobs where team_id = $1 and request_id = $2', [who.teamId, requestId]);
    if (dup.rows[0]) return { id: dup.rows[0].id, created: false };

    if (designId !== null) {
      const design = await tx.query<{ vh: string; vl: string | null }>('select vh, vl from web.antibody_designs where id = $1 and revision_id = $2', [designId, rev.revisionId]);
      const row = design.rows[0];
      if (!row) throw new ApiError(404, 'not_found', '없는 설계예요.');
      if (step === 'A4') {
        const shape = params.shape === 'scfv' ? 'scfv' : 'fv';
        const length = shape === 'scfv' && row.vl ? row.vh.length + SCFV_LINKER.length + row.vl.length : row.vh.length;
        if (length > ESMFOLD_MAX_RESIDUES) {
          throw new ApiError(413, 'sequence_too_long', `설계 범위를 벗어났어요 — ${length}잔기예요. ${ESMFOLD_MAX_RESIDUES}잔기까지 접을 수 있어요.`);
        }
      }
      if (step === 'A5') {
        const folded = await tx.query<{ result: { fold?: { confidenceMean?: number } } }>(
          `select result from web.antibody_jobs where revision_id = $1 and design_id = $2 and step = 'A4' and status = 'succeeded' order by created_at desc limit 1`,
          [rev.revisionId, designId],
        );
        const mean = folded.rows[0]?.result?.fold?.confidenceMean;
        if (mean === undefined) throw new ApiError(409, 'step_locked', 'A4 에서 구조를 먼저 접어 주세요.');
        if (mean < settings.thresholds.confidenceMin) {
          throw new ApiError(409, 'step_locked', `구조 확신도가 ${settings.thresholds.confidenceMin} 보다 낮아요(${mean}). 설계를 고쳐 다시 접어 주세요.`);
        }
      }
    }

    // 동시 작업 상한 → 사람별 상한 → 잔액 → insert → 원장.
    const active = await tx.query<{ n: number }>(`select count(*)::int as n from web.antibody_jobs where team_id = $1 and status in ('queued', 'running')`, [who.teamId]);
    if (active.rows[0]!.n >= ANTIBODY_TEAM_ACTIVE_MAX) {
      throw new ApiError(429, 'too_many_jobs', `모둠에서 동시에 돌릴 수 있는 작업은 ${ANTIBODY_TEAM_ACTIVE_MAX}개예요. 하나가 끝나면 다시 해 주세요.`, { retryAfterSec: 10 });
    }
    if (step === 'A4' || step === 'A5') {
      const mine = await tx.query<{ n: number }>(
        `select count(*)::int as n from web.antibody_jobs
          where team_id = $1 and revision_id = $2 and step = $3 and requested_by = $4 and status not in ('failed', 'timeout')`,
        [who.teamId, rev.revisionId, step, account.userId],
      );
      if (mine.rows[0]!.n >= MY_JOB_MAX[step]) {
        throw new ApiError(409, 'my_quota_used', `한 사람이 돌릴 수 있는 ${step} 작업은 ${MY_JOB_MAX[step]}건이에요. 모둠원과 나눠 주세요.`);
      }
    }
    if (cost > 0 && (await balanceCents(tx, who.teamId)) < cost) throw new ApiError(402, 'insufficient_funds', '연구비가 모자라요.');

    let inserted;
    try {
      inserted = await tx.query<{ id: string }>(
        `insert into web.antibody_jobs (team_id, class_id, revision_id, design_id, request_id, step, requested_by, cost_cents, result, timeout_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() + make_interval(mins => $10)) returning id`,
        [who.teamId, who.classId, rev.revisionId, designId, requestId, step, account.userId, cost, JSON.stringify({ shape: params.shape ?? 'fv' }), JOB_TIMEOUT_MIN],
      );
    } catch (error) {
      if (isUniqueViolation(error, 'antibody_jobs_my_quota_key')) {
        throw new ApiError(409, 'my_quota_used', `한 사람이 돌릴 수 있는 ${step} 작업은 ${MY_JOB_MAX[step as 'A4' | 'A5'] ?? 1}건이에요.`);
      }
      if (isUniqueViolation(error, 'antibody_jobs_request_key')) {
        const same = await tx.query<{ id: string }>('select id from web.antibody_jobs where team_id = $1 and request_id = $2', [who.teamId, requestId]);
        if (same.rows[0]) return { id: same.rows[0].id, created: false };
      }
      throw error;
    }
    const id = inserted.rows[0]!.id;
    if (cost > 0) {
      await charge(tx, {
        teamId: who.teamId,
        cents: cost,
        kind: 'paid_work',
        idemKey: `ab-job:${id}`,
        createdBy: account.userId,
        ref: { type: 'antibody_job', id },
      });
    }
    return { id, created: true };
  });

  if (created.created) {
    notifyTeam(deps, who.teamId, `antibody:job:${step}`, account.displayName);
    await deps.antibody.submit(created.id);
  }
  const row = await loadJobRow(deps.db, created.id);
  if (!row) throw new ApiError(500, 'internal', '작업을 다시 읽지 못했어요.');
  return { job: jobView(row), created: created.created };
}

/** 폴링 보조 — 주 경로는 WS(§5.5). */
export async function loadAntibodyJob(deps: Deps, account: AccountView, jobId: string): Promise<{ job: ReturnType<typeof jobView>; result: unknown }> {
  const who = await teamMember(deps.db, account);
  const rows = await deps.db.query<{ team_id: string }>('select team_id from web.antibody_jobs where id = $1', [jobId]);
  if (rows.rows[0]?.team_id !== who.teamId) throw new ApiError(404, 'not_found', '없는 작업이에요.');
  const row = await loadJobRow(deps.db, jobId);
  if (!row) throw new ApiError(404, 'not_found', '없는 작업이에요.');
  return { job: jobView(row), result: row.result };
}
