/**
 * crista bio-worker HTTP 클라이언트(설계 §1.1 · §8) — 규격은 crista 사본 `@crista/shared-types`(`WorkerJobRequest` 등).
 *
 * - 워커는 Railway 내부망 전용이다(`http://bio-worker.railway.internal:8787`). 로컬은 crista 워커를 8790 으로 띄운다.
 * - 워커로 보내는 id 는 늘 접두를 붙인다: jobId `web-<uuid>` · classId `web:<uuid>` · teamId `web:<uuid>`(설계 §7.1 — 게임 작업 · 캐시와 섞이지 않게).
 * - 실패는 두 가지로 나눈다: 닿지 않음 · 5xx(`WorkerUnavailableError`, 다시 시도) / 입력 거절 400(`rejected`, 다시 보내도 같다).
 */
import type { MoleculeProperties, WorkerHealth, WorkerJobAccepted, WorkerJobRequest, WorkerJobState } from '@crista/shared-types';

const TIMEOUT_MS = 10_000;

export class WorkerUnavailableError extends Error {
  constructor(message = '계산 워커에 닿지 않아요. 잠시 뒤 다시 해 주세요.', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'WorkerUnavailableError';
  }
}

export type SubmitOutcome = { kind: 'accepted'; accepted: WorkerJobAccepted } | { kind: 'rejected'; code: string; message: string };
export type PropertiesOutcome = { ok: true; properties: MoleculeProperties } | { ok: false; message: string };

export interface CompoundQuery {
  targetId: string;
  library?: string | null;
  maxMw: number;
  maxTpsa: number;
  ro5Only: boolean;
  excludeAlerts: boolean;
  limit: number;
}

export interface WorkerCompound {
  chemblId: string;
  name: string;
  canonicalSmiles: string;
  library: string;
  mw: number;
  qed: number;
  vinaKcalByTarget?: Record<string, number>;
}

export interface CompoundsResult {
  stats: { total: number; funnel: { library: number; mwTpsa: number; ro5: number; alerts: number; selected: number } };
  compounds: WorkerCompound[];
}

export interface BioWorker {
  submit(request: WorkerJobRequest): Promise<SubmitOutcome>;
  /** 모르는 jobId(워커 재시작)면 null. */
  read(jobId: string): Promise<WorkerJobState | null>;
  cancel(jobId: string): Promise<void>;
  properties(smiles: string): Promise<PropertiesOutcome>;
  diseaseTargets(diseaseId: string, limit: number): Promise<unknown>;
  compounds(query: CompoundQuery): Promise<CompoundsResult>;
  libraries(): Promise<string[]>;
  health(): Promise<WorkerHealth>;
}

export const workerJobId = (jobId: string): string => `web-${jobId}`;
export const workerScopeId = (uuid: string): string => `web:${uuid}`;

interface Raw {
  status: number;
  body: unknown;
}

export class HttpBioWorker implements BioWorker {
  private readonly base: string;

  constructor(baseUrl: string) {
    this.base = baseUrl.replace(/\/+$/, '');
  }

  private async call(path: string, init: RequestInit = {}): Promise<Raw> {
    let response: Response;
    try {
      response = await fetch(`${this.base}${path}`, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      });
    } catch (error) {
      throw new WorkerUnavailableError(undefined, { cause: error });
    }
    const text = await response.text().catch(() => '');
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (response.status >= 500) throw new WorkerUnavailableError(`계산 워커 응답 코드 ${response.status}.`);
    return { status: response.status, body };
  }

  private static message(body: unknown, fallback: string): string {
    const m = (body as { message?: unknown } | null)?.message;
    return typeof m === 'string' && m.length > 0 ? m.slice(0, 300) : fallback;
  }

  async submit(request: WorkerJobRequest): Promise<SubmitOutcome> {
    const res = await this.call('/jobs', { method: 'POST', body: JSON.stringify(request) });
    if (res.status === 202 || res.status === 200) return { kind: 'accepted', accepted: res.body as WorkerJobAccepted };
    const code = (res.body as { code?: unknown } | null)?.code;
    return { kind: 'rejected', code: typeof code === 'string' ? code : 'bad_request', message: HttpBioWorker.message(res.body, `워커가 요청을 거절했어요(${res.status}).`) };
  }

  async read(jobId: string): Promise<WorkerJobState | null> {
    const res = await this.call(`/jobs/${encodeURIComponent(jobId)}`);
    if (res.status === 404) return null;
    if (res.status >= 300) throw new WorkerUnavailableError(`작업 상태를 읽지 못했어요(${res.status}).`);
    return res.body as WorkerJobState;
  }

  async cancel(jobId: string): Promise<void> {
    await this.call(`/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  }

  async properties(smiles: string): Promise<PropertiesOutcome> {
    const res = await this.call('/molecule/properties', { method: 'POST', body: JSON.stringify({ smiles }) });
    const body = res.body as { ok?: boolean; properties?: MoleculeProperties } | null;
    if (res.status === 200 && body?.ok && body.properties) return { ok: true, properties: body.properties };
    return { ok: false, message: HttpBioWorker.message(res.body, '계산할 수 없는 SMILES 예요.') };
  }

  async diseaseTargets(diseaseId: string, limit: number): Promise<unknown> {
    const res = await this.call(`/datasets/targets?disease=${encodeURIComponent(diseaseId)}&limit=${limit}`);
    if (res.status !== 200) throw new WorkerUnavailableError(HttpBioWorker.message(res.body, '표적 자료를 읽지 못했어요.'));
    return res.body;
  }

  async compounds(q: CompoundQuery): Promise<CompoundsResult> {
    const params = new URLSearchParams({
      targetId: q.targetId,
      maxMw: String(q.maxMw),
      maxTpsa: String(q.maxTpsa),
      ro5Only: String(q.ro5Only),
      excludeAlerts: String(q.excludeAlerts),
      limit: String(q.limit),
    });
    if (q.library) params.set('library', q.library);
    const res = await this.call(`/datasets/compounds?${params}`);
    if (res.status !== 200) throw new WorkerUnavailableError(HttpBioWorker.message(res.body, '화합물 자료를 읽지 못했어요.'));
    return res.body as CompoundsResult;
  }

  async libraries(): Promise<string[]> {
    const res = await this.call('/datasets/summary');
    const counts = (res.body as { compoundLibrary?: { libraryCounts?: Record<string, number> } } | null)?.compoundLibrary?.libraryCounts ?? {};
    return Object.keys(counts).sort();
  }

  async health(): Promise<WorkerHealth> {
    const res = await this.call('/healthz');
    if (res.status !== 200) throw new WorkerUnavailableError(`워커 상태 확인 실패(${res.status}).`);
    return res.body as WorkerHealth;
  }
}
