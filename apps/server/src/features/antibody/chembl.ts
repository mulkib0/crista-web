/**
 * ChEMBL REST 어댑터 — A1 '표적 → 치료항체 표 → 원본 사슬 서열'(설계 §3.1 #1 · §2.3).
 *
 * 노트북에서 바로잡아 쓰는 것
 * - 단건 응답의 서열 키는 `bio_component_sequences` 가 아니라 **`biotherapeutic.biocomponents`** 예요(셀3).
 * - `max_phase` 는 숫자가 아니라 **문자열**(`'4.0'`)이에요 — 숫자로 바꿔 쓰고 원문도 함께 내려요.
 * - `.endswith('mab')` 휴리스틱을 쓰지 않고 서버 쪽 필터 `molecule_type=Antibody` + `only=` 로 응답을 줄여요.
 *
 * 2026-10-24 실측: mechanism 90건 2.42s · 항체 15종 1.30s · 단건 1.24s.
 */
import type { AntibodyDataMode, Provenance } from '@crista-web/web-contract';
import { normalizeSeq } from '@crista-web/web-contract';
import { mergeDataMode, provenanceOf, tiered, type CacheStore } from './cache.ts';
import { AdapterError, DEFAULT_RETRY, fetchWithRetry, raiseUpstream, requireFetch, REQUEST_CAPS, type FetchLike, type RetryPolicy } from './fetch-capped.ts';
import { cacheKey } from './hash.ts';
import { CH1_HEAD, CL_KAPPA_HEAD, FIXTURE_COLLECTED_ON, fixtureByAntibody, fixtureTarget, readFixtureJson } from './fixtures.ts';
import type { Limiter } from './queue.ts';
import { createLimiter } from './queue.ts';

export const CHEMBL_BASE = 'https://www.ebi.ac.uk/chembl/api/data';

/** `only=` 로 줄여 받는 칸 — 응답 크기를 2MB 상한 안으로 눌러요. */
export const CHEMBL_MOLECULE_FIELDS = [
  'molecule_chembl_id',
  'pref_name',
  'molecule_type',
  'first_approval',
  'max_phase',
  'withdrawn_flag',
  'biotherapeutic',
] as const;

// ── 응답 모양(우리가 읽는 칸만) ──────────────────────────────────────────────

interface ChemblMechanismPage {
  mechanisms?: Array<{ molecule_chembl_id?: string | null; parent_molecule_chembl_id?: string | null; mechanism_of_action?: string | null; action_type?: string | null }>;
  page_meta?: { total_count?: number };
}

interface ChemblBiocomponent {
  component_id?: number | null;
  component_type?: string | null;
  description?: string | null;
  sequence?: string | null;
}

interface ChemblMolecule {
  molecule_chembl_id?: string | null;
  pref_name?: string | null;
  molecule_type?: string | null;
  first_approval?: number | null;
  max_phase?: string | number | null;
  withdrawn_flag?: boolean | null;
  biotherapeutic?: { biocomponents?: ChemblBiocomponent[] | null } | null;
}

interface ChemblMoleculePage {
  molecules?: ChemblMolecule[];
  page_meta?: { total_count?: number };
}

// ── 우리 쪽 모양 ─────────────────────────────────────────────────────────────

export interface ChemblAntibodyRow {
  chemblId: string;
  name: string;
  moleculeType: string;
  /** 최초 승인 연도 — 없으면 `null`. */
  firstApproval: number | null;
  /** 최대 임상 단계 — `'4.0'` 같은 문자열을 숫자로 바꾼 값. */
  maxPhase: number | null;
  /** 원문 그대로(문자열) — 화면 상세에서 '받은 값'을 보여 줄 때 써요. */
  maxPhaseRaw: string | null;
  withdrawn: boolean;
  /** 사슬 서열을 받을 수 있나(단건 조회에서 `biocomponents` 가 있나). */
  hasSequence: boolean;
}

export interface ParentChains {
  chemblId: string;
  name: string;
  /** 전장 중쇄(보통 440~460잔기) — ESMFold 400잔기 상한을 넘어요. */
  heavyFull: string;
  /** 전장 경쇄(보통 213~215잔기). */
  lightFull: string | null;
  /** 가변영역만 — 불변 영역 머리 모티프(`CH1_HEAD` · `CL_KAPPA_HEAD`)에서 잘랐어요. */
  vh: string;
  vl: string | null;
  components: Array<{ id: number | null; type: string; description: string; length: number }>;
}

export interface ChemblResult<T> {
  value: T;
  dataMode: AntibodyDataMode;
  provenance: Provenance;
}

export interface ChemblAdapterDeps {
  fetch: FetchLike | null | undefined;
  userAgent: string;
  cache: CacheStore;
  limiter?: Limiter;
  offline?: boolean;
  retry?: RetryPolicy;
}

export interface ChemblAdapter {
  /** 표적 → 기전에 묶인 치료항체 표(A1). */
  searchAntibodies(targetChemblId: string): Promise<ChemblResult<ChemblAntibodyRow[]>>;
  /** 원본 항체 1종 → 사슬 서열(A1 끝 · A3 의 바탕 서열). */
  antibodySequences(moleculeChemblId: string): Promise<ChemblResult<ParentChains>>;
}

export function createChemblAdapter(deps: ChemblAdapterDeps): ChemblAdapter {
  // fetch 를 주입하지 않으면 **만들 때** 바로 알려요 — 테스트가 실제 외부 API 를 부르는 일을 막는 장치예요.
  const doFetch = requireFetch(deps.fetch, 'ChEMBL');
  const limiter = deps.limiter ?? createLimiter();
  const offline = deps.offline ?? false;
  const retry = deps.retry ?? DEFAULT_RETRY;
  const headers = { 'user-agent': deps.userAgent, accept: 'application/json' };
  let lastCall: { calledAt: string; elapsedMs: number } | null = null;

  async function getJson<T>(url: string): Promise<T> {
    const res = await limiter.withLimit('chembl', () => fetchWithRetry(doFetch, url, { ...REQUEST_CAPS.json, headers }, retry));
    lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
    if (!res.ok) raiseUpstream(res, 'ChEMBL');
    try {
      return JSON.parse(res.text()) as T;
    } catch (cause) {
      throw new AdapterError('upstream_error', 502, 'ChEMBL 응답이 JSON 이 아니에요.', { cause });
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
    async searchAntibodies(targetChemblId) {
      const id = requireChemblId(targetChemblId);
      const fixture = fixtureTarget(id);
      const mechanismUrl = `${CHEMBL_BASE}/mechanism.json?target_chembl_id=${encodeURIComponent(id)}&limit=200`;

      const mech = await tiered<string[]>({
        store: deps.cache,
        key: cacheKey('chembl:mechanism', { targetChemblId: id }),
        provider: 'chembl',
        offline,
        decode: (body) => JSON.parse(body) as string[],
        live: async () => {
          const page = await getJson<ChemblMechanismPage>(mechanismUrl);
          const ids = moleculeIdsOf(page);
          return { value: ids, body: JSON.stringify(ids) };
        },
        fixture: () => {
          if (!fixture) return null;
          const page = readFixtureJson<ChemblMechanismPage>(fixture.files.mechanism);
          return page ? moleculeIdsOf(page) : null;
        },
      });

      if (mech.value.length === 0) {
        return { value: [], dataMode: mech.dataMode, provenance: prov(mech.dataMode, 'ChEMBL 기전 조회에 묶인 분자가 없어요.', mechanismUrl) };
      }

      const moleculeUrl = `${CHEMBL_BASE}/molecule.json?molecule_chembl_id__in=${encodeURIComponent(mech.value.join(','))}&molecule_type=Antibody&limit=100&only=${CHEMBL_MOLECULE_FIELDS.join(',')}`;
      const rows = await tiered<ChemblAntibodyRow[]>({
        store: deps.cache,
        key: cacheKey('chembl:molecules', { ids: mech.value }),
        provider: 'chembl',
        offline,
        decode: (body) => JSON.parse(body) as ChemblAntibodyRow[],
        live: async () => {
          const page = await getJson<ChemblMoleculePage>(moleculeUrl);
          const parsed = parseAntibodyRows(page);
          return { value: parsed, body: JSON.stringify(parsed) };
        },
        fixture: () => {
          if (!fixture) return null;
          const page = readFixtureJson<ChemblMoleculePage>(fixture.files.molecules);
          return page ? parseAntibodyRows(page) : null;
        },
      });

      const dataMode = mergeDataMode([mech.dataMode, rows.dataMode]);
      return {
        value: rows.value,
        dataMode,
        provenance: prov(dataMode, `ChEMBL 에서 ${id} 기전에 묶인 치료항체 ${rows.value.length}종을 읽었어요.`, moleculeUrl),
      };
    },

    async antibodySequences(moleculeChemblId) {
      const id = requireChemblId(moleculeChemblId);
      const url = `${CHEMBL_BASE}/molecule/${encodeURIComponent(id)}.json`;
      const fixture = fixtureByAntibody(id);

      const got = await tiered<ParentChains>({
        store: deps.cache,
        key: cacheKey('chembl:molecule', { moleculeChemblId: id }),
        provider: 'chembl',
        offline,
        decode: (body) => JSON.parse(body) as ParentChains,
        live: async () => {
          const value = parseParentChains(await getJson<ChemblMolecule>(url), id);
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          if (!fixture) return null;
          const raw = readFixtureJson<ChemblMolecule>(fixture.files.molecule);
          return raw ? parseParentChains(raw, id) : null;
        },
      });

      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(got.dataMode, `${got.value.name} 의 사슬 서열을 ChEMBL biocomponents 에서 읽었어요(중쇄 ${got.value.heavyFull.length} · 가변영역 ${got.value.vh.length} 잔기).`, url),
      };
    },
  };
}

// ── 파서(순수 함수 — 테스트가 직접 불러요) ──────────────────────────────────

const CHEMBL_ID = /^CHEMBL[0-9]{1,12}$/;

export function requireChemblId(raw: string): string {
  const id = (raw ?? '').trim().toUpperCase();
  if (!CHEMBL_ID.test(id)) throw new AdapterError('invalid_input', 400, `ChEMBL 번호 모양이 아니에요 — '${raw}'.`);
  return id;
}

export function moleculeIdsOf(page: ChemblMechanismPage): string[] {
  const ids = new Set<string>();
  for (const m of page.mechanisms ?? []) {
    const id = m.parent_molecule_chembl_id || m.molecule_chembl_id;
    if (id) ids.add(id);
  }
  return [...ids].sort();
}

/** `max_phase` 문자열(`'4.0'`)을 숫자로. 숫자로 와도 받아요. 모르면 `null`. */
export function parseMaxPhase(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function parseAntibodyRows(page: ChemblMoleculePage): ChemblAntibodyRow[] {
  const rows: ChemblAntibodyRow[] = [];
  for (const m of page.molecules ?? []) {
    const chemblId = m.molecule_chembl_id;
    if (!chemblId) continue;
    rows.push({
      chemblId,
      name: m.pref_name ?? chemblId,
      moleculeType: m.molecule_type ?? 'Unknown',
      firstApproval: typeof m.first_approval === 'number' ? m.first_approval : null,
      maxPhase: parseMaxPhase(m.max_phase),
      maxPhaseRaw: m.max_phase === null || m.max_phase === undefined ? null : String(m.max_phase),
      withdrawn: m.withdrawn_flag === true,
      hasSequence: (m.biotherapeutic?.biocomponents ?? []).some((c) => typeof c.sequence === 'string' && c.sequence.length > 0),
    });
  }
  // 임상 단계 내림차순 → 승인 연도 오름차순 → 이름 — 학생이 보는 표 순서를 결정적으로.
  return rows.sort((a, b) => (b.maxPhase ?? -1) - (a.maxPhase ?? -1) || (a.firstApproval ?? 9999) - (b.firstApproval ?? 9999) || a.name.localeCompare(b.name));
}

/**
 * 단건 응답 → 사슬 서열.
 * 사슬 역할은 `description`(`Heavy chain` · `Light chain`)을 먼저 보고, 노트북 fixture 처럼 `Sequence` 로만 적힌 경우는 길이로 가려요
 * (전장 중쇄 440~460 · 경쇄 213~215).
 */
export function parseParentChains(raw: ChemblMolecule, fallbackId: string): ParentChains {
  const components = (raw.biotherapeutic?.biocomponents ?? []).filter((c): c is ChemblBiocomponent & { sequence: string } => typeof c.sequence === 'string' && c.sequence.length > 0);
  if (components.length === 0) {
    throw new AdapterError('no_fallback', 503, 'ChEMBL 에 이 항체의 사슬 서열이 없어요 — 다른 원본 항체를 골라 주세요.');
  }

  let heavy: string | null = null;
  let light: string | null = null;
  for (const c of components) {
    const desc = (c.description ?? '').toLowerCase();
    const seq = cleanSeq(c.sequence);
    if (!seq) continue;
    if (desc.includes('heavy')) heavy ??= seq;
    else if (desc.includes('light')) light ??= seq;
  }
  if (!heavy || !light) {
    const byLength = components
      .map((c) => cleanSeq(c.sequence))
      .filter((s): s is string => s !== null)
      .sort((a, b) => b.length - a.length);
    heavy ??= byLength[0] ?? null;
    light ??= byLength.length > 1 ? (byLength[byLength.length - 1] ?? null) : null;
  }
  if (!heavy) throw new AdapterError('no_fallback', 503, 'ChEMBL 사슬 서열에서 중쇄를 찾지 못했어요.');

  return {
    chemblId: raw.molecule_chembl_id ?? fallbackId,
    name: raw.pref_name ?? raw.molecule_chembl_id ?? fallbackId,
    heavyFull: heavy,
    lightFull: light,
    vh: variableRegion(heavy, CH1_HEAD),
    vl: light ? variableRegion(light, CL_KAPPA_HEAD) : null,
    components: components.map((c) => ({
      id: c.component_id ?? null,
      type: c.component_type ?? 'Protein',
      description: c.description ?? '',
      length: c.sequence.length,
    })),
  };
}

/**
 * 받은 서열에서 20종 밖 글자(`X` · `-` · `*` 등)를 **조용히 지우지 않고** 거부해요 — 길이가 달라지면 IMGT 번호가 밀려요(묶음 1 메모).
 * 그래서 어댑터 단계에서 걸러 `null` 로 떨어뜨리고, 쓸 수 있는 사슬만 넘겨요.
 */
export function cleanSeq(raw: string): string | null {
  try {
    return normalizeSeq(raw);
  } catch {
    return null;
  }
}

/**
 * 전장 사슬 → 가변영역. 불변 영역 머리 모티프에서 자르고, 못 찾으면 **자르지 않고 그대로** 줘요
 * (잘못 자른 서열을 내려보내는 것보다 길다고 알려 주는 쪽이 안전해요 — ESMFold 가 413 으로 막아 줘요).
 */
export function variableRegion(chain: string, constantHead: string): string {
  const at = chain.indexOf(constantHead);
  return at > 0 ? chain.slice(0, at) : chain;
}
