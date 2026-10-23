/**
 * ESM Atlas ESMFold 어댑터 — A4 접힘 예측(설계 §3.1 #8 · §2.1 A4).
 *
 * 2026-10-24 실측
 * - `POST https://api.esmatlas.com/foldSequence/v1/pdb/` · 본문 = 원서열 한 줄 · 키 없음. VH 119잔기 11.70s · scFv 241잔기 9.05s · 400잔기 27.16s.
 * - 401잔기 이상 → `413 Sequence is longer than 400.`
 * - `:` 같은 글자가 섞이면 → `422 Sequence is only allowed to have {…} tokens.`
 * - 확신도는 B-factor 열에 **0~1 스케일**로 들어와요(VH 측정 평균 0.867 · 최소 0.43). 화면에는 0~100 으로 올려 보내요.
 *
 * 정직성(§3.5): 이 값은 **모델이 스스로 매긴 자기 확신값**이에요. 정답과 비교한 정확도가 아니고,
 * 단일서열 모델이라 CDR 한두 자리만 바꾼 변이체 사이에 평균 차이가 거의 없어요 — 배지 `실제 AI 예측` 에 그 한계를 함께 적어요.
 */
import type { AntibodyDataMode, FoldShape, Provenance } from '@crista-web/web-contract';
import { ESMFOLD_MAX_RESIDUES, normalizeSeq, SCFV_LINKER } from '@crista-web/web-contract';
import { provenanceOf, tiered, type CacheStore } from './cache.ts';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, REQUEST_CAPS, type Caps, type FetchLike } from './fetch-capped.ts';
import { cacheKey, seqHash } from './hash.ts';
import { FIXTURE_COLLECTED_ON, FIXTURE_TARGETS, readFixtureText } from './fixtures.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const ESMFOLD_URL = 'https://api.esmatlas.com/foldSequence/v1/pdb/';

export interface FoldOutput {
  /** 예측 구조 원문(PDB 형식). */
  pdb: string;
  /** 접은 서열(scFv 면 링커까지 이은 것). */
  seq: string;
  shape: FoldShape;
  /** 잔기별 확신도 **0~100**(모델이 준 0~1 을 ×100). */
  perResidue: number[];
  /** 평균 확신도(0~100 · 소수 둘째 자리). */
  mean: number;
}

export interface EsmfoldResult<T> {
  value: T;
  dataMode: AntibodyDataMode;
  provenance: Provenance;
}

export interface EsmfoldAdapterDeps {
  fetch: FetchLike | null | undefined;
  userAgent: string;
  cache: CacheStore;
  limiter?: Limiter;
  offline?: boolean;
  /** 예측 PDB 상한 — 기본은 요청 경로 PDB 상한(8MB · 30초)보다 넉넉한 60초. */
  caps?: Caps;
}

export interface EsmfoldAdapter {
  /** 한 사슬(또는 링커로 이은 scFv)을 접어요. */
  foldSequence(seq: string, shape?: FoldShape): Promise<EsmfoldResult<FoldOutput>>;
  /** VH · VL 을 `GGGGS×3` 링커로 이어 scFv 한 사슬로 접어요. */
  foldScfv(vh: string, vl: string): Promise<EsmfoldResult<FoldOutput>>;
}

export function createEsmfoldAdapter(deps: EsmfoldAdapterDeps): EsmfoldAdapter {
  const doFetch = requireFetch(deps.fetch, 'ESMFold');
  const limiter = deps.limiter ?? createLimiter();
  const offline = deps.offline ?? false;
  const caps = deps.caps ?? { timeoutMs: 60_000, maxBytes: REQUEST_CAPS.pdb.maxBytes };
  let lastCall: { calledAt: string; elapsedMs: number } | null = null;

  async function fold(seq: string, shape: FoldShape): Promise<EsmfoldResult<FoldOutput>> {
    const clean = requireFoldable(seq);
    const got = await tiered<FoldOutput>({
      store: deps.cache,
      key: cacheKey('esmfold:fold', { seq: clean }),
      provider: 'esmfold',
      offline,
      decode: (body) => JSON.parse(body) as FoldOutput,
      live: async () => {
        const res = await limiter.withLimit('esmfold', () =>
          fetchCapped(doFetch, ESMFOLD_URL, { ...caps, method: 'POST', headers: { 'user-agent': deps.userAgent, 'content-type': 'text/plain' }, body: clean }),
        );
        lastCall = { calledAt: res.calledAt, elapsedMs: res.elapsedMs };
        if (res.status === 413) throw tooLong(res.text());
        if (res.status === 422) throw badTokens(res.text());
        if (!res.ok) raiseUpstream(res, 'ESMFold');
        const pdb = res.text();
        const value = foldOutputOf(pdb, clean, shape);
        return { value, body: JSON.stringify(value) };
      },
      fixture: () => {
        const hash = seqHash(clean);
        for (const target of FIXTURE_TARGETS) {
          for (const rel of [target.files.foldFv, target.files.foldScfv]) {
            if (!rel) continue;
            const pdb = readFixtureText(rel);
            if (pdb === null) continue;
            const foldedSeq = seqFromPdb(pdb);
            if (foldedSeq && seqHash(foldedSeq) === hash) return foldOutputOf(pdb, clean, shape);
          }
        }
        return null;
      },
    });
    return {
      value: got.value,
      dataMode: got.dataMode,
      provenance: provenanceOf({
        dataMode: got.dataMode,
        source: 'ai-predict',
        label: '실제 AI 예측',
        detail: `ESMFold v1 이 서열 ${clean.length}잔기를 접었어요. 확신도는 모델이 스스로 매긴 자기 확신값이고, 정답과 비교한 정확도가 아니에요(평균 ${got.value.mean}).`,
        endpoint: ESMFOLD_URL,
        calledAt: lastCall?.calledAt,
        elapsedMs: lastCall?.elapsedMs,
        collectedOn: FIXTURE_COLLECTED_ON,
      }),
    };
  }

  return {
    foldSequence: (seq, shape = 'fv') => fold(seq, shape),
    foldScfv: (vh, vl) => fold(`${normalizeSeq(vh)}${SCFV_LINKER}${normalizeSeq(vl)}`, 'scfv'),
  };
}

// ── 검사 · 파서(순수 함수) ─────────────────────────────────────────────────

/** 보낼 수 있는 서열인지 먼저 우리가 거르고, 그래도 외부가 413 을 주면 같은 뜻으로 올려요. */
export function requireFoldable(seq: string): string {
  const clean = normalizeSeq(seq); // 20종 밖 글자 · `:` 는 여기서 걸려요(422 를 미리 막아요).
  if (clean.length > ESMFOLD_MAX_RESIDUES) throw tooLong();
  return clean;
}

export function tooLong(upstreamBody?: string): AdapterError {
  return new AdapterError(
    'sequence_too_long',
    413,
    `설계 범위를 벗어났어요 — 이 랩은 가변영역(Fv) 또는 링커로 이은 scFv ${ESMFOLD_MAX_RESIDUES} 잔기까지 접어요. 전장 사슬은 접지 않아요.`,
    { upstreamStatus: 413, upstreamBody: upstreamBody ?? null },
  );
}

export function badTokens(upstreamBody?: string): AdapterError {
  return new AdapterError(
    'invalid_input',
    422,
    '두 사슬을 한 번에 접을 수 없어요 — 사슬을 따로 접거나 scFv 링커(GGGGS×3)로 이어 주세요.',
    { upstreamStatus: 422, upstreamBody: upstreamBody ?? null },
  );
}

/** 예측 PDB → 잔기별 확신도(0~100) · 평균. B-factor 열(61~66칸)에 0~1 로 들어와요. */
export function confidenceFromPdb(pdb: string): { perResidue: number[]; mean: number } {
  const perResidue: number[] = [];
  let seen = '';
  for (const line of pdb.split('\n')) {
    if (!line.startsWith('ATOM')) continue;
    const resSeq = line.slice(22, 27);
    if (resSeq === seen) continue;
    seen = resSeq;
    const b = Number(line.slice(60, 66).trim());
    if (!Number.isFinite(b)) continue;
    // 0~1 스케일을 0~100 으로 올려요. 혹시 이미 0~100 으로 오면(다른 모델) 그대로 둬요.
    perResidue.push(round2(b <= 1.0001 ? b * 100 : b));
  }
  const mean = perResidue.length === 0 ? 0 : round2(perResidue.reduce((a, b) => a + b, 0) / perResidue.length);
  return { perResidue, mean };
}

export function foldOutputOf(pdb: string, seq: string, shape: FoldShape): FoldOutput {
  const { perResidue, mean } = confidenceFromPdb(pdb);
  return { pdb, seq, shape, perResidue, mean };
}

const AA3_TO_1: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E', GLY: 'G', HIS: 'H', ILE: 'I',
  LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
};

/** 예측 PDB 에서 접힌 서열을 되읽어요 — 고정 예시가 이 서열의 것인지 가릴 때 써요. */
export function seqFromPdb(pdb: string): string | null {
  let out = '';
  let seen = '';
  for (const line of pdb.split('\n')) {
    if (!line.startsWith('ATOM')) continue;
    const resSeq = line.slice(22, 27);
    if (resSeq === seen) continue;
    seen = resSeq;
    const one = AA3_TO_1[line.slice(17, 20).trim().toUpperCase()];
    if (!one) return null;
    out += one;
  }
  return out === '' ? null : out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
