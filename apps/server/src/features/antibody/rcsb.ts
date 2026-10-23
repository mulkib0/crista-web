/**
 * RCSB 어댑터 — 구조 후보 검색 · 체인 역할 판별 · 구조 파일 · 서열 유사도(설계 §3.1 #2~#5 · §2.3).
 *
 * 2026-10-24 실측
 * - search v2 full_text + `entity_poly.rcsb_entity_polymer_type exact_match Protein` → 1.64s · 40건
 * - data GraphQL 한 번으로 해상도 + 엔티티 설명 · auth 체인 · 서열 → 0.64s(왕복 3회 대신 1회)
 * - `files.rcsb.org/download/1YY9.pdb` → 0.69s · 752KB. 404 면 `.cif` 로 넘어가고 뷰어에 `'cif'` 형식으로 넣어요.
 *
 * 체인 역할은 노트북처럼 하드코딩하지 않고 `pdbx_description` 으로 판별해요(셀13 의 `A:H;B:H;C:L;D:L` 은 `6ARP` 실제 배치와 어긋나요).
 * 비대칭 단위에 복합체가 여러 벌이면 **체인 조**(`ChainRoles.set`)를 조마다 하나씩 만들어요(§2.3 — `5SX4` 는 2벌).
 */
import type { AntibodyDataMode, ChainRoles, Provenance } from '@crista-web/web-contract';
import { provenanceOf, tiered, type CacheStore } from './cache.ts';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, REQUEST_CAPS, type Caps, type FetchLike } from './fetch-capped.ts';
import { cacheKey } from './hash.ts';
import { FIXTURE_COLLECTED_ON, fixtureByPdb, readFixtureJson, readFixtureText } from './fixtures.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const RCSB_SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query';
export const RCSB_GRAPHQL_URL = 'https://data.rcsb.org/graphql';
export const RCSB_FILES_BASE = 'https://files.rcsb.org/download';

const PDB_ID = /^[0-9A-Z]{4}$/;

export function requirePdbId(raw: string): string {
  const id = (raw ?? '').trim().toUpperCase();
  if (!PDB_ID.test(id)) throw new AdapterError('invalid_input', 400, `PDB 번호는 네 글자예요 — '${raw}'.`);
  return id;
}

// ── 우리 쪽 모양 ─────────────────────────────────────────────────────────────

export interface StructureHit {
  pdb: string;
  score: number;
}

export interface PolymerEntity {
  entityId: string;
  description: string;
  /** auth 체인 이름들 — 복합체가 여러 벌이면 여기 여러 개가 들어와요(`5SX4` 중쇄 `['H','J']`). */
  authChains: string[];
  length: number;
  seq: string;
  role: ChainRole;
}

/** 체인 역할 — 설명 문구로 가려요. 항체 사슬이 아니면 항원으로 봐요. */
export type ChainRole = 'heavy' | 'light' | 'antigen';

export interface StructureMeta {
  pdb: string;
  title: string;
  /** 해상도(Å) — 여러 개면 첫 값. */
  resolutionAngstrom: number | null;
  entities: PolymerEntity[];
  /** 체인 조 — 계면 파싱 · 뷰어 색칠이 이 중 하나를 골라 써요. */
  sets: ChainRoles[];
}

export interface StructureFile {
  pdb: string;
  format: 'pdb' | 'cif';
  text: string;
}

export interface SequenceHit {
  pdb: string;
  /** mmseqs2 서열 동일성(0~1). */
  identity: number;
  score: number;
}

export interface RcsbResult<T> {
  value: T;
  dataMode: AntibodyDataMode;
  provenance: Provenance;
}

export interface RcsbAdapterDeps {
  fetch: FetchLike | null | undefined;
  userAgent: string;
  cache: CacheStore;
  limiter?: Limiter;
  offline?: boolean;
  /** 구조 파일 상한 — 시드는 `config.antibody.seedLimits` 를 넘겨요. */
  fileCaps?: Caps;
}

export interface RcsbAdapter {
  searchStructures(text: string, rows?: number): Promise<RcsbResult<StructureHit[]>>;
  structureMeta(pdbIds: readonly string[]): Promise<RcsbResult<StructureMeta[]>>;
  structureFile(pdbId: string): Promise<RcsbResult<StructureFile>>;
  sequenceSimilarity(seq: string, identityCutoff?: number): Promise<RcsbResult<SequenceHit[]>>;
}

export function createRcsbAdapter(deps: RcsbAdapterDeps): RcsbAdapter {
  const doFetch = requireFetch(deps.fetch, 'RCSB');
  const limiter = deps.limiter ?? createLimiter();
  const offline = deps.offline ?? false;
  const fileCaps = deps.fileCaps ?? REQUEST_CAPS.pdb;
  const jsonHeaders = { 'user-agent': deps.userAgent, accept: 'application/json', 'content-type': 'application/json' };
  let lastCall: { calledAt: string; elapsedMs: number } | null = null;

  async function postJson<T>(url: string, payload: unknown, who: string): Promise<T> {
    const res = await limiter.withLimit('rcsb', () =>
      fetchCapped(doFetch, url, { ...REQUEST_CAPS.json, method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) }),
    );
    lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
    // search v2 는 결과가 없으면 204 를 줘요.
    if (res.status === 204) return { result_set: [] } as T;
    if (!res.ok) raiseUpstream(res, who);
    try {
      return JSON.parse(res.text()) as T;
    } catch (cause) {
      throw new AdapterError('upstream_error', 502, `${who} 응답이 JSON 이 아니에요.`, { cause });
    }
  }

  const prov = (dataMode: AntibodyDataMode, detail: string, endpoint: string): Provenance =>
    provenanceOf({
      dataMode,
      label: '자료 조회',
      detail,
      endpoint,
      calledAt: lastCall?.calledAt,
      elapsedMs: lastCall?.elapsedMs,
      collectedOn: FIXTURE_COLLECTED_ON,
    });

  return {
    async searchStructures(text, rows = 40) {
      const query = (text ?? '').trim();
      if (query.length < 2) throw new AdapterError('invalid_input', 400, '검색어는 두 글자 이상 적어 주세요.');
      const payload = structureSearchPayload(query, rows);
      const got = await tiered<StructureHit[]>({
        store: deps.cache,
        key: cacheKey('rcsb:search', payload),
        provider: 'rcsb',
        offline,
        decode: (body) => JSON.parse(body) as StructureHit[],
        live: async () => {
          const hits = parseSearchHits(await postJson<RcsbSearchResponse>(RCSB_SEARCH_URL, payload, 'RCSB 검색'));
          return { value: hits, body: JSON.stringify(hits) };
        },
        fixture: () => {
          // 받아 둔 예시는 '세툭시맙' 검색 하나예요 — 다른 검색어는 고정 예시가 없어요.
          if (!/cetuximab|세툭시맙/i.test(query)) return null;
          const raw = readFixtureJson<RcsbSearchResponse>('rcsb/search-cetuximab.json');
          return raw ? parseSearchHits(raw) : null;
        },
      });
      return { value: got.value, dataMode: got.dataMode, provenance: prov(got.dataMode, `RCSB 검색에서 단백질 구조 ${got.value.length}건을 받았어요.`, RCSB_SEARCH_URL) };
    },

    async structureMeta(pdbIds) {
      const ids = [...new Set(pdbIds.map((id) => requirePdbId(id)))].sort();
      if (ids.length === 0) return { value: [], dataMode: offline ? 'fixture' : 'live', provenance: prov('cached', '조회할 구조가 없어요.', RCSB_GRAPHQL_URL) };
      const payload = { query: STRUCTURE_META_QUERY, variables: { ids } };
      const got = await tiered<StructureMeta[]>({
        store: deps.cache,
        key: cacheKey('rcsb:graphql', { ids }),
        provider: 'rcsb',
        offline,
        decode: (body) => JSON.parse(body) as StructureMeta[],
        live: async () => {
          const value = parseStructureMeta(await postJson<RcsbGraphqlResponse>(RCSB_GRAPHQL_URL, payload, 'RCSB GraphQL'));
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          const raw = readFixtureJson<RcsbGraphqlResponse>('rcsb/graphql-entries.json');
          if (!raw) return null;
          const all = parseStructureMeta(raw);
          const picked = all.filter((m) => ids.includes(m.pdb));
          return picked.length > 0 ? picked : null;
        },
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(got.dataMode, `RCSB GraphQL 한 번으로 ${got.value.length}건의 해상도 · 체인 역할 · 서열을 받았어요.`, RCSB_GRAPHQL_URL),
      };
    },

    async structureFile(pdbId) {
      const id = requirePdbId(pdbId);
      const fixture = fixtureByPdb(id);
      const url = `${RCSB_FILES_BASE}/${id}.pdb`;
      const got = await tiered<StructureFile>({
        store: deps.cache,
        key: cacheKey('rcsb:file', { pdb: id }),
        provider: 'rcsb',
        offline,
        decode: (body) => JSON.parse(body) as StructureFile,
        live: async () => {
          const value = await downloadStructure(id);
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          if (!fixture) return null;
          const text = readFixtureText(fixture.files.pdb);
          return text === null ? null : { pdb: id, format: 'pdb', text };
        },
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(got.dataMode, `${id} 구조 파일(${got.value.format.toUpperCase()} · ${got.value.text.length} 바이트)을 RCSB 에서 받았어요.`, url),
      };
    },

    async sequenceSimilarity(seq, identityCutoff = 0.9) {
      const payload = sequenceSearchPayload(seq, identityCutoff);
      const got = await tiered<SequenceHit[]>({
        store: deps.cache,
        key: cacheKey('rcsb:sequence', payload),
        provider: 'rcsb',
        offline,
        decode: (body) => JSON.parse(body) as SequenceHit[],
        live: async () => {
          const hits = parseSequenceHits(await postJson<RcsbSearchResponse>(RCSB_SEARCH_URL, payload, 'RCSB 서열 검색'));
          return { value: hits, body: JSON.stringify(hits) };
        },
        // 서열 유사도는 서열마다 달라서 고정 예시를 둘 수 없어요 — 빈 목록으로 강등하고 그 사실을 배지에 적어요.
        fixture: () => [],
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(
          got.dataMode,
          got.dataMode === 'fixture'
            ? '서열 유사도 조회를 하지 못해 비어 있어요(미리 받아 둘 수 없는 값이에요).'
            : `RCSB 서열 검색(mmseqs2)에서 ${got.value.length}건을 받았어요.`,
          RCSB_SEARCH_URL,
        ),
      };
    },
  };

  async function downloadStructure(id: string): Promise<StructureFile> {
    const pdbRes = await limiter.withLimit('rcsb', () => fetchCapped(doFetch, `${RCSB_FILES_BASE}/${id}.pdb`, { ...fileCaps, headers: { 'user-agent': deps.userAgent } }));
    lastCall = { calledAt: pdbRes.calledAt, elapsedMs: pdbRes.elapsedMs };
    if (pdbRes.ok) return { pdb: id, format: 'pdb', text: pdbRes.text() };
    if (pdbRes.status !== 404) raiseUpstream(pdbRes, 'RCSB 파일');
    // 큰 구조는 PDB 형식이 없어요 — mmCIF 로 넘어가고 뷰어에 'cif' 로 넣어요(§3.4).
    const cifRes = await limiter.withLimit('rcsb', () => fetchCapped(doFetch, `${RCSB_FILES_BASE}/${id}.cif`, { ...fileCaps, headers: { 'user-agent': deps.userAgent } }));
    lastCall = { calledAt: cifRes.calledAt, elapsedMs: cifRes.elapsedMs };
    if (!cifRes.ok) raiseUpstream(cifRes, 'RCSB 파일');
    return { pdb: id, format: 'cif', text: cifRes.text() };
  }
}

// ── 질의 본문 · 파서(순수 함수) ─────────────────────────────────────────────

export const STRUCTURE_META_QUERY = `query Entries($ids: [String!]!) {
  entries(entry_ids: $ids) {
    rcsb_id
    struct { title }
    rcsb_entry_info { resolution_combined }
    polymer_entities {
      rcsb_id
      entity_poly { pdbx_seq_one_letter_code_can rcsb_sample_sequence_length }
      rcsb_polymer_entity { pdbx_description }
      rcsb_polymer_entity_container_identifiers { auth_asym_ids }
    }
  }
}`;

export function structureSearchPayload(text: string, rows: number): unknown {
  return {
    query: {
      type: 'group',
      logical_operator: 'and',
      nodes: [
        { type: 'terminal', service: 'full_text', parameters: { value: text } },
        { type: 'terminal', service: 'text', parameters: { attribute: 'entity_poly.rcsb_entity_polymer_type', operator: 'exact_match', value: 'Protein' } },
      ],
    },
    return_type: 'entry',
    request_options: { paginate: { start: 0, rows: Math.min(Math.max(1, Math.trunc(rows)), 100) }, results_verbosity: 'minimal' },
  };
}

export function sequenceSearchPayload(seq: string, identityCutoff: number): unknown {
  return {
    query: {
      type: 'terminal',
      service: 'sequence',
      parameters: { evalue_cutoff: 0.1, identity_cutoff: identityCutoff, sequence_type: 'protein', value: seq },
    },
    return_type: 'polymer_entity',
    request_options: { paginate: { start: 0, rows: 25 }, results_verbosity: 'verbose', scoring_strategy: 'sequence' },
  };
}

interface RcsbSearchResponse {
  result_set?: Array<{ identifier?: string; score?: number; services?: Array<{ nodes?: Array<{ match_context?: Array<{ sequence_identity?: number }> }> }> }>;
}

export function parseSearchHits(raw: RcsbSearchResponse): StructureHit[] {
  const out: StructureHit[] = [];
  for (const row of raw.result_set ?? []) {
    if (!row.identifier) continue;
    out.push({ pdb: row.identifier.slice(0, 4).toUpperCase(), score: typeof row.score === 'number' ? row.score : 0 });
  }
  return out;
}

export function parseSequenceHits(raw: RcsbSearchResponse): SequenceHit[] {
  const out: SequenceHit[] = [];
  for (const row of raw.result_set ?? []) {
    if (!row.identifier) continue;
    let identity = 0;
    for (const service of row.services ?? []) {
      for (const node of service.nodes ?? []) {
        for (const ctx of node.match_context ?? []) {
          if (typeof ctx.sequence_identity === 'number' && ctx.sequence_identity > identity) identity = ctx.sequence_identity;
        }
      }
    }
    out.push({ pdb: row.identifier.slice(0, 4).toUpperCase(), identity, score: typeof row.score === 'number' ? row.score : 0 });
  }
  return out;
}

interface RcsbGraphqlResponse {
  data?: {
    entries?: Array<{
      rcsb_id?: string;
      struct?: { title?: string | null } | null;
      rcsb_entry_info?: { resolution_combined?: number[] | null } | null;
      polymer_entities?: Array<{
        rcsb_id?: string;
        entity_poly?: { pdbx_seq_one_letter_code_can?: string | null; rcsb_sample_sequence_length?: number | null } | null;
        rcsb_polymer_entity?: { pdbx_description?: string | null } | null;
        rcsb_polymer_entity_container_identifiers?: { auth_asym_ids?: string[] | null } | null;
      }> | null;
    }>;
  };
  errors?: Array<{ message?: string }>;
}

/** 엔티티 설명 → 체인 역할. 항체 사슬 낱말이 없으면 항원으로 봐요. */
export function chainRoleOf(description: string): ChainRole {
  const d = description.toLowerCase();
  if (/\bheavy\b/.test(d)) return 'heavy';
  if (/\blight\b/.test(d)) return 'light';
  // `Herceptin Fab (antibody) - heavy chain` 처럼 낱말이 섞여도 위에서 걸려요. 그 밖은 항원.
  return 'antigen';
}

export function parseStructureMeta(raw: RcsbGraphqlResponse): StructureMeta[] {
  if (raw.errors && raw.errors.length > 0) {
    throw new AdapterError('upstream_error', 502, `RCSB GraphQL 오류 — ${raw.errors[0]?.message ?? '알 수 없음'}`);
  }
  const out: StructureMeta[] = [];
  for (const entry of raw.data?.entries ?? []) {
    if (!entry?.rcsb_id) continue;
    const entities: PolymerEntity[] = [];
    for (const pe of entry.polymer_entities ?? []) {
      const description = pe.rcsb_polymer_entity?.pdbx_description ?? '';
      const seq = pe.entity_poly?.pdbx_seq_one_letter_code_can ?? '';
      entities.push({
        entityId: pe.rcsb_id ?? '',
        description,
        authChains: [...(pe.rcsb_polymer_entity_container_identifiers?.auth_asym_ids ?? [])],
        length: pe.entity_poly?.rcsb_sample_sequence_length ?? seq.length,
        seq,
        role: chainRoleOf(description),
      });
    }
    out.push({
      pdb: entry.rcsb_id.toUpperCase(),
      title: entry.struct?.title ?? '',
      resolutionAngstrom: entry.rcsb_entry_info?.resolution_combined?.[0] ?? null,
      entities,
      sets: chainSetsOf(entities),
    });
  }
  return out;
}

/**
 * 체인 조 만들기 — 역할별 auth 체인 목록을 **같은 순서로 짝지어요**.
 * `5SX4` 중쇄 `['H','J']` · 경쇄 `['I','L']` · 항원 `['M','N']` → 조 1 `{H:'H',L:'I',AG:'M'}` · 조 2 `{H:'J',L:'L',AG:'N'}`.
 * 복합체가 한 벌이면 조도 하나예요.
 */
export function chainSetsOf(entities: readonly PolymerEntity[]): ChainRoles[] {
  const pick = (role: ChainRole): string[] => entities.filter((e) => e.role === role).flatMap((e) => [...e.authChains].sort());
  const heavy = pick('heavy');
  const light = pick('light');
  const antigen = pick('antigen');
  if (heavy.length === 0) return [];
  const sets: ChainRoles[] = [];
  for (let i = 0; i < heavy.length; i += 1) {
    const h = heavy[i];
    if (!h) continue;
    const row: ChainRoles = { set: String(i + 1), H: h };
    const l = light[i];
    if (l) row.L = l;
    const ag = antigen[i] ?? (antigen.length === 1 ? antigen[0] : undefined);
    if (ag) row.AG = ag;
    sets.push(row);
  }
  return sets;
}
