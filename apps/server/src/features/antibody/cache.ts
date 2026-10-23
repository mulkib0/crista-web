/**
 * 외부 응답 캐시와 3층 강등 — ① DB 캐시 → ② 고정 예시(fixture) → ③ 한국어 안내(설계 §3.4).
 *
 * 수업 중 20~30명이 같은 표적을 누르니 **첫 한 명만 외부를 부르고** 나머지는 캐시를 읽어요.
 * 저장 자리는 `web.antibody_cache`(묶음 4 의 `0020_antibody_lab.sql`)이고, 여기서는 그 표에 기대지 않게
 * `CacheStore` 라는 작은 꼴만 정의해요 — 묶음 4 가 DB 로 구현하고, 테스트 · 시드는 메모리 구현을 써요.
 */
import type { AntibodyDataMode, Provenance } from '@crista-web/web-contract';
import { AdapterError } from './fetch-capped.ts';
import { cacheKey } from './hash.ts';

export { cacheKey };

export interface CacheEntry {
  key: string;
  /** 어느 API 인가 — `chembl` · `rcsb` · `colabfold` · `sabdab` · `esmfold` … 통계 · 비우기에 써요. */
  provider: string;
  /** 응답 본문(문자열로 저장해요 — JSON 은 직렬화, PDB · a3m 은 원문 그대로). */
  body: string;
  storedAt: string;
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  put(entry: CacheEntry): Promise<void>;
}

/** 아무것도 기억하지 않는 캐시 — 캐시를 끄고 싶을 때. */
export const NULL_CACHE: CacheStore = {
  get: async () => null,
  put: async () => {},
};

export interface MemoryCacheStore extends CacheStore {
  size(): number;
  clear(): void;
}

/** 테스트 · 시드 전용 메모리 캐시. */
export function memoryCacheStore(now: () => Date = () => new Date()): MemoryCacheStore {
  const rows = new Map<string, CacheEntry>();
  return {
    get: async (key) => rows.get(key) ?? null,
    put: async (entry) => {
      rows.set(entry.key, { ...entry, storedAt: entry.storedAt || now().toISOString() });
    },
    size: () => rows.size,
    clear: () => rows.clear(),
  };
}

/** 한 층이 내놓는 결과 — 값과 '어디서 왔나'. */
export interface Resolved<T> {
  value: T;
  dataMode: AntibodyDataMode;
}

export interface TieredOptions<T> {
  store: CacheStore;
  /** `cacheKey(endpoint, input)` 로 만든 키. */
  key: string;
  provider: string;
  /** `WEB_ANTIBODY_OFFLINE=1` — 외부를 부르지 않고 캐시 → 고정 예시로만 내려가요. */
  offline: boolean;
  /** 외부 호출 — 저장할 원문과 쓸 값을 함께 돌려줘요. */
  live?: () => Promise<{ value: T; body: string }>;
  /** 캐시에 담긴 원문을 값으로 되살려요. */
  decode: (body: string) => T;
  /** 저장소에 넣어 둔 실제 자료 — 없으면 `null`. */
  fixture?: () => T | null;
  /** 외부가 실패한 사유를 적어 둘 곳(마지막 층에서 안내 문구에 써요). */
  onLiveError?: (error: unknown) => void;
}

/**
 * 3층 강등을 한 곳에서 — `dataMode` 가 화면에 늘 보이므로 결정 규칙을 여기 하나로 모았어요(§3.3).
 *
 * - `offline` 이면 캐시 적중 `cached`, 아니면 `fixture`
 * - `offline` 이 아니면 캐시 적중 `cached` · 외부 호출 성공 `live` · 둘 다 실패 `fixture`
 * - 세 층 모두 비면 `AdapterError('no_fallback', 503)` — **없는 값을 만들어 채우지 않아요**
 */
export async function tiered<T>(opts: TieredOptions<T>): Promise<Resolved<T>> {
  const hit = await opts.store.get(opts.key);
  if (hit) {
    try {
      return { value: opts.decode(hit.body), dataMode: 'cached' };
    } catch {
      // 캐시가 깨졌으면 없는 것으로 보고 다음 층으로 내려가요.
    }
  }

  if (!opts.offline && opts.live) {
    try {
      const got = await opts.live();
      await opts.store.put({ key: opts.key, provider: opts.provider, body: got.body, storedAt: new Date().toISOString() });
      return { value: got.value, dataMode: 'live' };
    } catch (error) {
      opts.onLiveError?.(error);
      if (error instanceof AdapterError && (error.code === 'invalid_input' || error.code === 'sequence_too_long')) {
        // 학생 입력이 잘못된 것은 강등할 일이 아니라 그대로 알려야 해요.
        throw error;
      }
    }
  }

  const fallback = opts.fixture?.() ?? null;
  if (fallback !== null) return { value: fallback, dataMode: 'fixture' };

  throw new AdapterError(
    'no_fallback',
    503,
    opts.offline
      ? '지금은 바깥 자료를 받지 않는 설정이고, 미리 받아 둔 자료에도 이 항목이 없어요. 선생님께 알려 주세요.'
      : '자료를 받아 오지 못했어요. 캐시와 미리 받아 둔 자료에도 없어요 — 잠시 뒤 다시 시도해 주세요.',
  );
}

/**
 * 캐시 한 층만 쓰는 짧은 꼴(§7 묶음 2 공개 인터페이스 `withCache(key, provider, fn)`).
 * 강등 층이 필요 없는 호출(묶음 4 의 작은 조회)에서 써요 — 고정 예시까지 내려가야 하면 `tiered` 를 쓰세요.
 */
export async function withCache<T>(store: CacheStore, key: string, provider: string, fn: () => Promise<T>): Promise<Resolved<T>> {
  return tiered<T>({
    store,
    key,
    provider,
    offline: false,
    decode: (body) => JSON.parse(body) as T,
    live: async () => {
      const value = await fn();
      return { value, body: JSON.stringify(value) };
    },
  });
}

/** 출처 배지 한 줄을 만드는 도우미 — 모든 어댑터 반환에 이걸 실어요(§3.5). */
export function provenanceOf(args: {
  dataMode: AntibodyDataMode;
  label: string;
  detail: string;
  endpoint: string;
  calledAt?: string;
  elapsedMs?: number;
  collectedOn?: string;
  /** `lookup`(실제 조회) · `ai-predict`(외부 모델 추론) 중 어느 성격인가. */
  source?: 'lookup' | 'ai-predict';
  approx?: boolean;
}): Provenance {
  const live = args.dataMode === 'live';
  const base: Provenance = {
    source: args.dataMode === 'fixture' ? 'precomputed' : (args.source ?? 'lookup'),
    label: args.dataMode === 'fixture' ? '사전 계산' : args.dataMode === 'cached' ? '자료 조회(캐시)' : args.label,
    detail: args.detail,
    endpoint: args.endpoint,
    approx: args.approx ?? false,
  };
  if (live && args.calledAt) base.calledAt = args.calledAt;
  if (live && args.elapsedMs !== undefined) base.elapsedMs = args.elapsedMs;
  if (args.dataMode === 'cached' && args.calledAt) base.calledAt = args.calledAt;
  if (args.dataMode === 'fixture' && args.collectedOn) base.collectedOn = args.collectedOn;
  return base;
}

/** 여러 층에서 온 `dataMode` 를 한 화면 값으로 합쳐요 — 하나라도 fixture 면 fixture, 아니면 하나라도 live 면 live. */
export function mergeDataMode(modes: readonly AntibodyDataMode[]): AntibodyDataMode {
  if (modes.length === 0) return 'fixture';
  if (modes.includes('fixture')) return 'fixture';
  if (modes.includes('live')) return 'live';
  return 'cached';
}
