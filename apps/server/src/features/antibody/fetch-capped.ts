/**
 * 외부 호출 공통 헬퍼 — 시간 · 바이트 상한(설계 `docs/2026-10-24-antibody-lab-design.md` §3.4).
 *
 * 왜 따로 두나
 * - 항체 랩의 외부 API 는 지연이 제각각이에요(ESMFold 400잔기 27초 · ColabFold 1~2분 · SAbDab2 all-summary 약 100초 · 17.5MB).
 *   단일 타임아웃으로 묶으면 느린 쪽이 반드시 끊겨요. 그래서 상한을 **호출마다 인자로 받아요**.
 * - 요청 경로 기본값은 `REQUEST_CAPS`(JSON 2MB · PDB 8MB · 30초), 시드 스크립트는 `config.antibody.seedLimits`(32MB · 180초)를
 *   그대로 넘겨 쓰면 돼요. 요청 경로 상한을 시드에 쓰면 all-summary 가 우리 헬퍼에서 413 을 맞아요.
 *
 * 경계
 * - `fetch` 를 **반드시 인자로 받아요**. 주입하지 않으면 바로 throw 해서, 테스트가 실제 외부 API 를 부르는 일을 막아요.
 * - 새 의존성은 없어요(Node 22 전역 `fetch` · `AbortSignal.any` · `AbortSignal.timeout`).
 */

/** 주입받는 `fetch`. 전역을 직접 쓰지 않아요. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** 어댑터가 올려 보내는 오류 — `status` 를 그대로 HTTP 응답에 쓸 수 있어요. */
export class AdapterError extends Error {
  readonly status: number;
  readonly code: AdapterErrorCode;
  readonly upstreamStatus: number | null;
  readonly upstreamBody: string | null;

  constructor(
    code: AdapterErrorCode,
    status: number,
    message: string,
    extra: { upstreamStatus?: number | null; upstreamBody?: string | null; cause?: unknown } = {},
  ) {
    super(message, extra.cause === undefined ? undefined : { cause: extra.cause });
    this.name = 'AdapterError';
    this.code = code;
    this.status = status;
    this.upstreamStatus = extra.upstreamStatus ?? null;
    this.upstreamBody = extra.upstreamBody ?? null;
  }
}

export type AdapterErrorCode =
  /** 호출자가 잘못 보냄(서열에 이상한 글자 · 400잔기 초과 등) */
  | 'invalid_input'
  /** 서열이 길이 상한을 넘음 — 계약 `ErrorCode.sequence_too_long` 과 같은 뜻 */
  | 'sequence_too_long'
  /** 응답이 바이트 상한을 넘음 */
  | 'too_large'
  /** 우리 시간 상한을 넘음 */
  | 'upstream_timeout'
  /** 외부가 4xx · 5xx */
  | 'upstream_error'
  /** 캐시 · 고정 예시까지 모두 비어 더 내려갈 층이 없음 */
  | 'no_fallback'
  /** `fetch` 를 주입하지 않음(개발 실수) */
  | 'fetch_missing';

/** 요청 경로 기본 상한(§3.4). 시드는 `config.antibody.seedLimits` 를 넘겨요. */
export const REQUEST_CAPS = {
  /** 작은 JSON 응답 */
  json: { timeoutMs: 30_000, maxBytes: 2 * 1024 * 1024 },
  /** 구조 파일(`1YY9.pdb` 752KB) · 예측 PDB */
  pdb: { timeoutMs: 30_000, maxBytes: 8 * 1024 * 1024 },
  /** ColabFold MSA 묶음(tar.gz 552KB) · 느린 폴링 */
  msa: { timeoutMs: 120_000, maxBytes: 8 * 1024 * 1024 },
} as const satisfies Record<string, Caps>;

export interface Caps {
  timeoutMs: number;
  maxBytes: number;
}

export interface CappedRequest extends Caps {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  /** 호출자가 따로 끊을 수 있게 — 우리 시간 상한과 함께 묶어요. */
  signal?: AbortSignal;
}

export interface CappedResponse {
  status: number;
  ok: boolean;
  contentType: string | null;
  bytes: Uint8Array;
  /** 걸린 시간(ms) — `Provenance.elapsedMs` 에 그대로 실어요. */
  elapsedMs: number;
  /** 호출 시각(ISO) — `Provenance.calledAt`. */
  calledAt: string;
  text(): string;
}

/** `fetch` 미주입을 개발 시점에 바로 알려요(테스트가 실제 외부 API 를 부르지 않게 하는 장치). */
export function requireFetch(fetchImpl: FetchLike | null | undefined, who: string): FetchLike {
  if (typeof fetchImpl !== 'function') {
    throw new AdapterError('fetch_missing', 500, `${who} 어댑터는 fetch 를 인자로 받아야 해요(테스트가 외부 API 를 부르지 않게).`);
  }
  return fetchImpl;
}

const DECODER = new TextDecoder();

function capsOk(caps: Caps): void {
  if (!Number.isFinite(caps.timeoutMs) || caps.timeoutMs <= 0) throw new AdapterError('invalid_input', 500, 'timeoutMs 는 양수여야 해요.');
  if (!Number.isInteger(caps.maxBytes) || caps.maxBytes <= 0) throw new AdapterError('invalid_input', 500, 'maxBytes 는 양의 정수여야 해요.');
}

/**
 * 시간 · 바이트 상한을 건 한 번의 호출.
 *
 * - 시간 초과 → `AdapterError('upstream_timeout', 504)`
 * - `Content-Length` 선검사 · 조각 읽기 누적 둘 다에서 상한 초과 → `AdapterError('too_large', 413)`
 * - 4xx · 5xx 는 **던지지 않고** 그대로 돌려줘요 — 413 · 422 처럼 뜻이 있는 번호를 어댑터가 읽어야 하니까요.
 */
export async function fetchCapped(fetchImpl: FetchLike | null | undefined, url: string, req: CappedRequest): Promise<CappedResponse> {
  const doFetch = requireFetch(fetchImpl, 'fetchCapped');
  capsOk(req);

  const timeout = AbortSignal.timeout(req.timeoutMs);
  const reading = new AbortController();
  const signal = AbortSignal.any(req.signal ? [req.signal, timeout, reading.signal] : [timeout, reading.signal]);
  const startedAt = Date.now();
  const calledAt = new Date(startedAt).toISOString();

  let res: Response;
  try {
    res = await doFetch(url, {
      method: req.method ?? 'GET',
      headers: req.headers,
      body: req.body,
      signal,
      redirect: 'follow',
    });
  } catch (cause) {
    throw asNetworkError(cause, url, req.timeoutMs, timeout);
  }

  const declared = Number(res.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > req.maxBytes) {
    reading.abort();
    throw new AdapterError('too_large', 413, `응답이 상한(${req.maxBytes} 바이트)보다 커요 — ${declared} 바이트.`, { upstreamStatus: res.status });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readCapped(res, req.maxBytes, reading);
  } catch (cause) {
    if (cause instanceof AdapterError) throw cause;
    throw asNetworkError(cause, url, req.timeoutMs, timeout);
  }

  return {
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get('content-type'),
    bytes,
    elapsedMs: Date.now() - startedAt,
    calledAt,
    text: () => DECODER.decode(bytes),
  };
}

function asNetworkError(cause: unknown, url: string, timeoutMs: number, timeout: AbortSignal): AdapterError {
  const name = cause instanceof Error ? cause.name : '';
  if (timeout.aborted || name === 'TimeoutError' || name === 'AbortError') {
    return new AdapterError('upstream_timeout', 504, `${hostOf(url)} 가 ${Math.round(timeoutMs / 1000)}초 안에 답하지 않았어요.`, { cause });
  }
  return new AdapterError('upstream_error', 502, `${hostOf(url)} 에 닿지 못했어요.`, { cause });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function readCapped(res: Response, maxBytes: number, reading: AbortController): Promise<Uint8Array> {
  const body = res.body;
  if (!body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new AdapterError('too_large', 413, `응답이 상한(${maxBytes} 바이트)보다 커요 — ${buf.byteLength} 바이트.`, { upstreamStatus: res.status });
    }
    return buf;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      if (!chunk) continue;
      total += chunk.byteLength;
      if (total > maxBytes) {
        reading.abort();
        throw new AdapterError('too_large', 413, `응답이 상한(${maxBytes} 바이트)보다 커요.`, { upstreamStatus: res.status });
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** 재시도 설정 — ChEMBL 429 · 5xx 에 쓰는 backoff(§3.1 표). */
export interface RetryPolicy {
  /** 처음 호출을 포함한 최대 시도 횟수. */
  attempts: number;
  /** 첫 대기(ms) — 매 시도마다 `factor` 배. */
  baseDelayMs: number;
  factor: number;
  /** 테스트에서 실제로 기다리지 않게 주입해요. */
  sleep: (ms: number) => Promise<void>;
}

export const DEFAULT_RETRY: RetryPolicy = {
  attempts: 5,
  baseDelayMs: 600,
  factor: 0.6 + 1, // 설계 §3.1 'backoff 0.6' — 한 번에 1.6배씩 늘려요.
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
};

/** 429 · 5xx 면 정책대로 다시 부르고, 마지막 응답을 그대로 돌려줘요. */
export async function fetchWithRetry(
  fetchImpl: FetchLike | null | undefined,
  url: string,
  req: CappedRequest,
  policy: RetryPolicy = DEFAULT_RETRY,
): Promise<CappedResponse> {
  const attempts = Math.max(1, Math.trunc(policy.attempts));
  let delay = policy.baseDelayMs;
  let last: CappedResponse | null = null;
  for (let i = 0; i < attempts; i += 1) {
    let res: CappedResponse;
    try {
      res = await fetchCapped(fetchImpl, url, req);
    } catch (cause) {
      if (cause instanceof AdapterError && cause.code === 'upstream_timeout' && i < attempts - 1) {
        await policy.sleep(delay);
        delay = Math.round(delay * policy.factor);
        continue;
      }
      throw cause;
    }
    last = res;
    if (res.status !== 429 && res.status < 500) return res;
    if (i === attempts - 1) return res;
    await policy.sleep(delay);
    delay = Math.round(delay * policy.factor);
  }
  // attempts ≥ 1 이라 여기에 닿으면 last 가 반드시 있어요.
  if (!last) throw new AdapterError('upstream_error', 502, `${hostOf(url)} 호출이 한 번도 끝나지 않았어요.`);
  return last;
}

/** 4xx · 5xx 를 공통 오류로 올려요 — 뜻이 있는 번호(413 · 422)는 어댑터가 먼저 처리한 뒤 부르세요. */
export function raiseUpstream(res: CappedResponse, who: string): never {
  const body = res.text().slice(0, 300);
  throw new AdapterError('upstream_error', res.status >= 500 ? 502 : 502, `${who} 가 ${res.status} 로 답했어요.`, {
    upstreamStatus: res.status,
    upstreamBody: body,
  });
}
