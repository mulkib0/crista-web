/**
 * SAbDab2 어댑터 — IMGT 번호 매김 · 최근접 실측 항체 · CDR 길이 분포 원자료(설계 §3.1 #7 · §3.2).
 *
 * 2026-10-24 실측
 * - `POST /api/sequence-similarity-search` → 5.65s. 응답은 `target_numbering`(`HEAVY` · `LIGHT` 각 128자리 · 간격 포함) + `results`(최근접 항체 · 점수).
 * - `GET /api/frontend/pdb/1YY9` 는 **404** — 확장 PDB ID(`pdb_00001yy9`)만 받아요. 변환은 어댑터가 하고 학생에게는 보이지 않아요.
 * - `GET /api/download/all-summary` → **쉼표 구분 CSV** 17.5MB · 22,692행 · 약 96초. 이름만 summary 지 TSV 가 아니에요.
 *   따옴표 안에 쉼표가 들어 있는 칸(화합물 이름)이 있어서 정규식 split 으로는 못 읽어요.
 *
 * 번호 매김은 **1순위**예요(§3.2) — 여기서 받지 못하면 묶음 3 의 ANARCI 이식 → 보정 정규식 순으로 강등하고 화면에 그 사실을 적어요.
 * 이 파일은 받은 번호를 **그대로 옮기기만** 해요. CDR 구간 자르기 · 길이 분포 통계는 묶음 3 · 4 가 해요.
 */
import type { AbChain, AntibodyDataMode, Provenance } from '@crista-web/web-contract';
import { normalizeSeq } from '@crista-web/web-contract';
import { provenanceOf, tiered, type CacheStore } from './cache.ts';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, REQUEST_CAPS, type Caps, type FetchLike } from './fetch-capped.ts';
import { cacheKey } from './hash.ts';
import { FIXTURE_COLLECTED_ON, readFixtureJson, readFixtureText } from './fixtures.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const SABDAB_BASE = 'https://sabdab.opig.stats.ox.ac.uk/api';

// ── 우리 쪽 모양 ─────────────────────────────────────────────────────────────

/** 한 자리 — IMGT 번호 · 삽입 코드 · 아미노산(`-` 는 간격). */
export interface NumberedPosition {
  num: number;
  /** 삽입 코드 — 보통 공백. `111A` 처럼 들어올 수 있어요. */
  insertion: string;
  /** 아미노산 한 글자, 또는 간격이면 `-`. */
  aa: string;
}

export interface ChainNumbering {
  chain: AbChain;
  positions: NumberedPosition[];
}

export interface NearestAntibody {
  antibodyId: string;
  /** 유사도 점수(0~100) — SAbDab2 가 준 값 그대로. */
  score: number;
  instanceId: string;
  heavy: string;
  light: string | null;
}

export interface NumberingResult {
  chains: ChainNumbering[];
  nearest: NearestAntibody[];
  warning: string | null;
}

export interface SabdabResult<T> {
  value: T;
  dataMode: AntibodyDataMode;
  provenance: Provenance;
}

/** all-summary 한 행 — 우리가 읽는 칸만. */
export interface AllSummaryRow {
  pdb: string;
  hchain: string;
  lchain: string;
  vh: string;
  vl: string;
  cdrH1: string;
  cdrH2: string;
  cdrH3: string;
  cdrL1: string;
  cdrL2: string;
  cdrL3: string;
  antigenType: string;
}

export interface SabdabAdapterDeps {
  fetch: FetchLike | null | undefined;
  userAgent: string;
  cache: CacheStore;
  limiter?: Limiter;
  offline?: boolean;
  /** all-summary 전용 상한 — **시드에서만** `config.antibody.seedLimits`(32MB · 180초)를 넘겨요. */
  seedCaps?: Caps;
}

export interface SabdabAdapter {
  /** VH(· VL)에 IMGT 번호를 매기고 최근접 실측 항체를 받아요. */
  imgtNumbering(vh: string, vl?: string | null, opts?: { n?: number; threshold?: number }): Promise<SabdabResult<NumberingResult>>;
  /** 구조 한 건의 SAbDab2 정보 — 확장 PDB ID 변환은 안에서 해요. */
  entry(pdbId: string): Promise<SabdabResult<unknown>>;
  /** CDR 길이 분포 원자료 — **배포 · 시드 때 1회만** 부르세요. 요청 경로에서 부르면 상한에서 413 이 나요. */
  allSummary(): Promise<SabdabResult<AllSummaryRow[]>>;
}

export function createSabdabAdapter(deps: SabdabAdapterDeps): SabdabAdapter {
  const doFetch = requireFetch(deps.fetch, 'SAbDab2');
  const limiter = deps.limiter ?? createLimiter();
  const offline = deps.offline ?? false;
  const ua = { 'user-agent': deps.userAgent, accept: 'application/json' };
  let lastCall: { calledAt: string; elapsedMs: number } | null = null;

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
    async imgtNumbering(vh, vl, opts) {
      const heavy = normalizeSeq(vh);
      const light = vl ? normalizeSeq(vl) : null;
      const payload = {
        heavy_seq: heavy,
        ...(light ? { light_seq: light } : {}),
        n: Math.min(Math.max(1, Math.trunc(opts?.n ?? 5)), 50),
        threshold: opts?.threshold ?? 0.7,
        region: 'CDRs',
      };
      const url = `${SABDAB_BASE}/sequence-similarity-search`;
      const got = await tiered<NumberingResult>({
        store: deps.cache,
        key: cacheKey('sabdab:numbering', payload),
        provider: 'sabdab',
        offline,
        decode: (body) => JSON.parse(body) as NumberingResult,
        live: async () => {
          const res = await limiter.withLimit('sabdab', () =>
            fetchCapped(doFetch, url, { ...REQUEST_CAPS.json, method: 'POST', headers: { ...ua, 'content-type': 'application/json' }, body: JSON.stringify(payload) }),
          );
          lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
          if (!res.ok) raiseUpstream(res, 'SAbDab2');
          const value = parseNumbering(res.text());
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          // 받아 둔 예시는 세툭시맙 Fv 하나예요 — 질의 서열이 그것일 때만 씁니다.
          const raw = readFixtureText('sabdab/similarity-1YY9.json');
          if (raw === null) return null;
          const parsed = parseNumbering(raw);
          const got = parsed.chains.find((c) => c.chain === 'H');
          if (!got || seqOf(got) !== heavy) return null;
          return parsed;
        },
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(
          got.dataMode,
          `실측 항체 데이터베이스(SAbDab2)의 IMGT 번호로 자리를 맞췄어요 — 사슬 ${got.value.chains.length}개 · 가장 가까운 실측 항체 ${got.value.nearest.length}건.`,
          url,
        ),
      };
    },

    async entry(pdbId) {
      const ext = extendPdbId(pdbId);
      const url = `${SABDAB_BASE}/frontend/pdb/${ext}`;
      const got = await tiered<unknown>({
        store: deps.cache,
        key: cacheKey('sabdab:entry', { pdb: ext }),
        provider: 'sabdab',
        offline,
        decode: (body) => JSON.parse(body) as unknown,
        live: async () => {
          const res = await limiter.withLimit('sabdab', () => fetchCapped(doFetch, url, { ...REQUEST_CAPS.json, headers: ua }));
          lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
          if (!res.ok) raiseUpstream(res, 'SAbDab2');
          const text = res.text();
          return { value: JSON.parse(text) as unknown, body: text };
        },
        fixture: () => (ext === 'pdb_00001yy9' ? readFixtureJson<unknown>('sabdab/entry-pdb_00001yy9.json') : null),
      });
      return { value: got.value, dataMode: got.dataMode, provenance: prov(got.dataMode, `SAbDab2 에서 ${ext} 정보를 읽었어요.`, url) };
    },

    async allSummary() {
      const url = `${SABDAB_BASE}/download/all-summary`;
      // 요청 경로 상한(2MB · 30초)으로는 17.5MB · 96초를 못 받아요 — 시드 상한을 **인자로 올려 받아요**(§3.4).
      const caps = deps.seedCaps ?? { timeoutMs: 180_000, maxBytes: 32 * 1024 * 1024 };
      const got = await tiered<AllSummaryRow[]>({
        store: deps.cache,
        key: cacheKey('sabdab:all-summary', { v: 1 }),
        provider: 'sabdab',
        offline,
        decode: (body) => JSON.parse(body) as AllSummaryRow[],
        live: async () => {
          const res = await limiter.withLimit('sabdab', () => fetchCapped(doFetch, url, { ...caps, headers: { 'user-agent': deps.userAgent, accept: 'text/csv' } }));
          lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
          if (!res.ok) raiseUpstream(res, 'SAbDab2 all-summary');
          const value = parseAllSummary(res.text());
          return { value, body: JSON.stringify(value) };
        },
        fixture: () => {
          const text = readFixtureText('sabdab/all-summary-head.csv.gz');
          return text === null ? null : parseAllSummary(text);
        },
      });
      return {
        value: got.value,
        dataMode: got.dataMode,
        provenance: prov(
          got.dataMode,
          got.dataMode === 'fixture'
            ? `미리 받아 둔 all-summary 앞부분 ${got.value.length}행을 읽었어요(전체는 22,692행).`
            : `SAbDab2 all-summary ${got.value.length}행을 읽었어요(쉼표 구분 CSV).`,
          url,
        ),
      };
    },
  };
}

// ── 변환 · 파서(순수 함수) ──────────────────────────────────────────────────

/**
 * PDB ID → SAbDab2 확장 ID. `1YY9` → `pdb_00001yy9`.
 * 짧은 ID 로 부르면 404 가 나요(2026-10-24 실측). 이미 확장형이면 그대로 둬요.
 */
export function extendPdbId(raw: string): string {
  const id = (raw ?? '').trim().toLowerCase();
  if (/^pdb_[0-9a-z]{8}$/.test(id)) return id;
  if (!/^[0-9a-z]{4}$/.test(id)) throw new AdapterError('invalid_input', 400, `PDB 번호는 네 글자예요 — '${raw}'.`);
  return `pdb_0000${id}`;
}

interface SabdabNumberingResponse {
  target_numbering?: Record<string, Array<[[number, string], string]>> | null;
  results?: Array<{ antibody_id?: string; score?: number; antibody_instance_id?: string; heavy?: string; light?: string | null }> | null;
  warning?: string | null;
}

/** `HEAVY` · `LIGHT` → 우리 쪽 `ChainNumbering`. 간격(`-`)도 버리지 않고 남겨요 — 자리 수가 밀리면 안 돼요. */
export function parseNumbering(body: string): NumberingResult {
  let raw: SabdabNumberingResponse;
  try {
    raw = JSON.parse(body) as SabdabNumberingResponse;
  } catch (cause) {
    throw new AdapterError('upstream_error', 502, 'SAbDab2 응답이 JSON 이 아니에요.', { cause });
  }
  const chains: ChainNumbering[] = [];
  const map: Array<[string, AbChain]> = [
    ['HEAVY', 'H'],
    ['LIGHT', 'L'],
  ];
  for (const [key, chain] of map) {
    const rows = raw.target_numbering?.[key];
    if (!rows || rows.length === 0) continue;
    const positions: NumberedPosition[] = [];
    for (const row of rows) {
      const slot = row?.[0];
      const aa = row?.[1];
      if (!slot || typeof aa !== 'string') continue;
      positions.push({ num: slot[0], insertion: (slot[1] ?? ' ').trim(), aa: aa.toUpperCase() });
    }
    if (positions.length > 0) chains.push({ chain, positions });
  }
  if (chains.length === 0) throw new AdapterError('upstream_error', 502, 'SAbDab2 가 번호를 주지 않았어요.');

  const nearest: NearestAntibody[] = [];
  for (const row of raw.results ?? []) {
    if (!row?.antibody_id) continue;
    nearest.push({
      antibodyId: row.antibody_id,
      score: typeof row.score === 'number' ? row.score : 0,
      instanceId: row.antibody_instance_id ?? '',
      heavy: row.heavy ?? '',
      light: row.light ?? null,
    });
  }
  return { chains, nearest, warning: raw.warning ?? null };
}

/** 번호 매김에서 간격을 뺀 서열 — 받은 번호가 우리가 보낸 서열의 것인지 맞춰 볼 때 써요. */
export function seqOf(numbering: ChainNumbering): string {
  return numbering.positions
    .map((p) => p.aa)
    .filter((aa) => aa !== '-')
    .join('');
}

/**
 * 쉼표 구분 CSV 한 줄씩 — 따옴표 안의 쉼표 · 두 겹 따옴표(`""`)를 제대로 읽어요.
 * all-summary 의 `compound` 칸에 `"N-(2,6-dimethylphenyl)-…"` 같은 값이 들어 있어서 `split(',')` 로는 칸이 밀려요.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      cell += ch ?? '';
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** all-summary CSV → 우리가 읽는 칸만. 머리줄 이름으로 칸을 찾아요(칸 순서가 바뀌어도 버텨요). */
export function parseAllSummary(text: string): AllSummaryRow[] {
  const rows = parseCsv(text);
  const header = rows[0];
  if (!header) return [];
  const at = (name: string): number => header.indexOf(name);
  const col = {
    pdb: at('PDB'),
    h: at('Hchain'),
    l: at('Lchain'),
    vh: at('VH'),
    vl: at('VL'),
    h1: at('CDR-H1'),
    h2: at('CDR-H2'),
    h3: at('CDR-H3'),
    l1: at('CDR-L1'),
    l2: at('CDR-L2'),
    l3: at('CDR-L3'),
    ag: at('antigen_type'),
  };
  if (col.pdb < 0 || col.h3 < 0) {
    throw new AdapterError('upstream_error', 502, 'all-summary 머리줄에 PDB · CDR-H3 칸이 없어요 — 쉼표 구분 CSV 인지 확인해 주세요.');
  }
  const out: AllSummaryRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r || r.length < header.length - 2) continue;
    const pdb = (r[col.pdb] ?? '').trim();
    if (!pdb) continue;
    out.push({
      pdb,
      hchain: (r[col.h] ?? '').trim(),
      lchain: (r[col.l] ?? '').trim(),
      vh: (r[col.vh] ?? '').trim(),
      vl: (r[col.vl] ?? '').trim(),
      cdrH1: (r[col.h1] ?? '').trim(),
      cdrH2: (r[col.h2] ?? '').trim(),
      cdrH3: (r[col.h3] ?? '').trim(),
      cdrL1: (r[col.l1] ?? '').trim(),
      cdrL2: (r[col.l2] ?? '').trim(),
      cdrL3: (r[col.l3] ?? '').trim(),
      antigenType: (r[col.ag] ?? '').trim(),
    });
  }
  return out;
}
