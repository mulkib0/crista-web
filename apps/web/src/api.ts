/**
 * 서버 호출 — 같은 출처(`/crista/api`)로 쿠키 세션을 싣는다. 상태를 바꾸는 요청은 늘 `content-type: application/json`
 * (서버가 그 형식만 받는다 — 다른 사이트 폼 차단). 오류는 `ApiFailure`(서버의 `ApiErrorBody` 그대로).
 */
import type { ApiErrorBody, ErrorCode, NoteView, TeamView } from '@crista-web/web-contract';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export class ApiFailure extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'network';
  readonly retryAfterSec: number | undefined;
  readonly team: TeamView | undefined;
  /** 노트 칸 409 `stale` — 지금 칸(상대 본문 · 버전). */
  readonly note: NoteView | undefined;
  constructor(status: number, body: ApiErrorBody['error'] | null, fallback = '서버에 닿지 않아요. 잠시 뒤 다시 해 주세요.') {
    super(body?.message ?? fallback);
    this.status = status;
    this.code = body?.code ?? 'network';
    this.retryAfterSec = body?.retryAfterSec;
    this.team = body?.team;
    this.note = body?.note;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiFailure(0, null);
  }
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) throw new ApiFailure(res.status, (parsed as ApiErrorBody | null)?.error ?? null, `서버 응답 ${res.status}`);
  return parsed as T;
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T,>(path: string) => request<T>('DELETE', path, {}),
};

/** 멱등 키 — 같은 버튼을 두 번 눌러도 한 번만 과금되게 요청마다 하나. */
export const newRequestId = (): string => crypto.randomUUID().replace(/-/g, '');

export const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
