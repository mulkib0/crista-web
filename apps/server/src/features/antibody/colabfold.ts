/**
 * ColabFold MSA 어댑터 — A2 '레퍼토리 다양성'의 재료(설계 §3.1 #6 · §3.2).
 *
 * 흐름은 **티켓 · 폴링**이에요 — 단일 HTTP 타임아웃으로 묶으면 반드시 끊겨요(119잔기도 완료까지 1~2분).
 *   `POST /ticket/msa`(form `q=>101\n<서열>` · `mode=env`) → `GET /ticket/{id}` 폴링 → `GET /result/download/{id}`(tar.gz)
 *
 * 2026-10-24 실측: 제출 1.53s · 결과 tar.gz 552KB · `uniref.a3m` 안에 **7,304 서열**.
 * 받은 a3m 은 여기서 **자르거나 세지 않아요** — 열 엔트로피 · 백분위 등급은 묶음 3(`diversity.ts`)이 계산해요.
 */
import { gunzipSync } from 'node:zlib';
import type { AntibodyDataMode, Provenance } from '@crista-web/web-contract';
import { normalizeSeq } from '@crista-web/web-contract';
import { provenanceOf, tiered, type CacheStore } from './cache.ts';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, REQUEST_CAPS, type Caps, type FetchLike } from './fetch-capped.ts';
import { cacheKey } from './hash.ts';
import { FIXTURE_COLLECTED_ON, FIXTURE_TARGETS, readFixtureText } from './fixtures.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const COLABFOLD_BASE = 'https://api.colabfold.com';

/** 티켓 상태 — mmseqs2 API 가 주는 값들. `PENDING` · `RUNNING` 이면 더 기다려요. */
export type MsaTicketStatus = 'COMPLETE' | 'PENDING' | 'RUNNING' | 'ERROR' | 'MAINTENANCE' | 'RATELIMIT' | 'UNKNOWN';

export interface MsaTicket {
  id: string;
  status: MsaTicketStatus;
}

export interface MsaResult {
  /** `uniref.a3m` 원문 — 첫 줄이 질의 서열이에요. */
  a3m: string;
  /** a3m 안의 서열 수(`>` 줄 개수) — 화면 문구 '비슷한 항체 N개'에 그대로 써요. */
  depth: number;
}

export interface ColabfoldResult<T> {
  value: T;
  dataMode: AntibodyDataMode;
  provenance: Provenance;
}

export interface ColabfoldAdapterDeps {
  fetch: FetchLike | null | undefined;
  userAgent: string;
  cache: CacheStore;
  limiter?: Limiter;
  offline?: boolean;
  /** 결과 묶음 상한 — 시드는 `config.antibody.seedLimits` 를 넘겨요. */
  resultCaps?: Caps;
  /** 폴링 — 테스트에서 실제로 기다리지 않게 주입해요. */
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  maxPolls?: number;
}

export interface ColabfoldAdapter {
  requestMsa(seq: string): Promise<MsaTicket>;
  pollMsa(ticketId: string): Promise<MsaTicket>;
  downloadMsa(ticketId: string): Promise<MsaResult>;
  /** 제출 → 폴링 → 내려받기를 한 번에. 캐시 · 고정 예시 강등까지 여기서 해요. */
  fetchMsa(seq: string, onPhase?: (phase: string) => void): Promise<ColabfoldResult<MsaResult>>;
}

export function createColabfoldAdapter(deps: ColabfoldAdapterDeps): ColabfoldAdapter {
  const doFetch = requireFetch(deps.fetch, 'ColabFold');
  const limiter = deps.limiter ?? createLimiter();
  const offline = deps.offline ?? false;
  const resultCaps = deps.resultCaps ?? REQUEST_CAPS.msa;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const pollIntervalMs = deps.pollIntervalMs ?? 5_000;
  const maxPolls = deps.maxPolls ?? 48; // 5초 × 48 = 4분
  const ua = { 'user-agent': deps.userAgent };
  let lastCall: { calledAt: string; elapsedMs: number } | null = null;

  async function requestMsa(seq: string): Promise<MsaTicket> {
    const clean = normalizeSeq(seq);
    const body = new URLSearchParams({ q: `>101\n${clean}`, mode: 'env' }).toString();
    const res = await limiter.withLimit('colabfold', () =>
      fetchCapped(doFetch, `${COLABFOLD_BASE}/ticket/msa`, {
        ...REQUEST_CAPS.json,
        method: 'POST',
        headers: { ...ua, 'content-type': 'application/x-www-form-urlencoded' },
        body,
      }),
    );
    lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
    if (!res.ok) raiseUpstream(res, 'ColabFold');
    return parseTicket(res.text());
  }

  async function pollMsa(ticketId: string): Promise<MsaTicket> {
    const id = requireTicketId(ticketId);
    const res = await limiter.withLimit('colabfold', () =>
      fetchCapped(doFetch, `${COLABFOLD_BASE}/ticket/${encodeURIComponent(id)}`, { ...REQUEST_CAPS.json, headers: ua }),
    );
    lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
    if (!res.ok) raiseUpstream(res, 'ColabFold');
    return parseTicket(res.text());
  }

  async function downloadMsa(ticketId: string): Promise<MsaResult> {
    const id = requireTicketId(ticketId);
    const res = await limiter.withLimit('colabfold', () =>
      fetchCapped(doFetch, `${COLABFOLD_BASE}/result/download/${encodeURIComponent(id)}`, { ...resultCaps, headers: ua }),
    );
    lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
    if (!res.ok) raiseUpstream(res, 'ColabFold');
    const a3m = a3mFromTarGz(res.bytes);
    return { a3m, depth: msaDepth(a3m) };
  }

  return {
    requestMsa,
    pollMsa,
    downloadMsa,
    async fetchMsa(seq, onPhase) {
      const clean = normalizeSeq(seq);
      const got = await tiered<MsaResult>({
        store: deps.cache,
        key: cacheKey('colabfold:msa', { seq: clean, mode: 'env' }),
        provider: 'colabfold',
        offline,
        decode: (body) => JSON.parse(body) as MsaResult,
        live: async () => {
          onPhase?.('MSA 제출');
          let ticket = await requestMsa(clean);
          for (let i = 0; ticket.status === 'PENDING' || ticket.status === 'RUNNING'; i += 1) {
            if (i >= maxPolls) {
              throw new AdapterError('upstream_timeout', 504, '공용 MSA 서버가 아직 끝내지 못했어요. 잠시 뒤 다시 시도해 주세요.');
            }
            onPhase?.('비슷한 단백질 찾기');
            await sleep(pollIntervalMs);
            ticket = await pollMsa(ticket.id);
          }
          if (ticket.status !== 'COMPLETE') {
            throw new AdapterError('upstream_error', 502, `공용 MSA 서버가 ${ticket.status} 상태예요.`, { upstreamBody: ticket.status });
          }
          onPhase?.('결과 받기');
          const value = await downloadMsa(ticket.id);
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          const target = FIXTURE_TARGETS.find((t) => t.files.msa && fixtureQuerySeq(t.files.msa) === clean);
          const rel = target?.files.msa ?? null;
          if (!rel) return null;
          const a3m = readFixtureText(rel);
          return a3m === null ? null : { a3m, depth: msaDepth(a3m) };
        },
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: provenanceOf({
          dataMode: got.dataMode,
          label: '자료 조회',
          detail: `공용 MSA 서버에서 비슷한 서열 ${got.value.depth.toLocaleString('ko-KR')}개를 모았어요(uniref · mode=env).`,
          endpoint: `${COLABFOLD_BASE}/ticket/msa`,
          calledAt: lastCall?.calledAt,
          elapsedMs: lastCall?.elapsedMs,
          collectedOn: FIXTURE_COLLECTED_ON,
        }),
      };
    },
  };
}

// ── 파서(순수 함수) ─────────────────────────────────────────────────────────

const TICKET_ID = /^[A-Za-z0-9_-]{8,128}$/;

export function requireTicketId(raw: string): string {
  const id = (raw ?? '').trim();
  if (!TICKET_ID.test(id)) throw new AdapterError('invalid_input', 400, 'MSA 티켓 번호 모양이 아니에요.');
  return id;
}

const TICKET_STATUSES: readonly MsaTicketStatus[] = ['COMPLETE', 'PENDING', 'RUNNING', 'ERROR', 'MAINTENANCE', 'RATELIMIT', 'UNKNOWN'];

export function parseTicket(body: string): MsaTicket {
  let raw: { id?: unknown; status?: unknown };
  try {
    raw = JSON.parse(body) as { id?: unknown; status?: unknown };
  } catch (cause) {
    throw new AdapterError('upstream_error', 502, 'ColabFold 티켓 응답이 JSON 이 아니에요.', { cause });
  }
  const status = typeof raw.status === 'string' ? (raw.status.toUpperCase() as MsaTicketStatus) : 'UNKNOWN';
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    status: TICKET_STATUSES.includes(status) ? status : 'UNKNOWN',
  };
}

/** a3m 의 서열 수 — `>` 로 시작하는 줄 개수. */
export function msaDepth(a3m: string): number {
  let n = 0;
  for (const line of a3m.split('\n')) if (line.startsWith('>')) n += 1;
  return n;
}

/** a3m 첫 서열(= 질의) — 고정 예시가 이 서열의 것인지 가리는 데 써요. */
export function fixtureQuerySeq(rel: string): string | null {
  const text = readFixtureText(rel);
  if (text === null) return null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]?.startsWith('>')) {
      const seq = lines[i + 1]?.trim();
      return seq ? seq.toUpperCase() : null;
    }
  }
  return null;
}

/**
 * tar.gz 에서 `uniref.a3m` 하나만 꺼내요 — 새 의존성을 두지 않으려고 tar 머리를 직접 읽어요.
 * tar 는 512바이트 블록이고 머리의 0~99 가 이름, 124~135(8진수)가 크기예요.
 */
export function a3mFromTarGz(bytes: Uint8Array, want = 'uniref.a3m'): string {
  let tar: Uint8Array;
  try {
    tar = new Uint8Array(gunzipSync(bytes));
  } catch (cause) {
    throw new AdapterError('upstream_error', 502, 'MSA 결과 묶음을 풀지 못했어요.', { cause });
  }
  const decoder = new TextDecoder();
  for (let at = 0; at + 512 <= tar.byteLength; ) {
    const header = tar.subarray(at, at + 512);
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '').trim();
    if (name === '') break; // 끝 블록
    const sizeText = decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    const start = at + 512;
    if (!Number.isFinite(size) || size < 0 || start + size > tar.byteLength) break;
    if (name === want || name.endsWith(`/${want}`)) return decoder.decode(tar.subarray(start, start + size));
    at = start + Math.ceil(size / 512) * 512;
  }
  throw new AdapterError('upstream_error', 502, `MSA 결과 묶음에 ${want} 가 없어요.`);
}
