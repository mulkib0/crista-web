/**
 * 선택 경로 — NVIDIA NIM ProteinMPNN(설계 §3.3 Part1-2).
 *
 * 기본값은 **키 없음**이에요. 그때는 이 어댑터를 만들지 않고(`null`) 묶음 3 의 규칙 기반 제안으로 **강등**하고,
 * 화면이 `교육용 근사 — ProteinMPNN 계산이 아닙니다` 배지를 달아요. 키가 있을 때만 실제 계산 배지를 써요.
 *
 * 폐지된 엔드포인트는 코드에 넣지 않아요 — NIM 호스팅의 단백질 접힘 · 복합체 예측 경로는 2026-09-17 에 내려갔어요(§3.3).
 * 여기서 부르는 건 ProteinMPNN **서열 설계** 경로 하나뿐이에요.
 */
import type { AntibodyBoldness, Provenance } from '@crista-web/web-contract';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, type Caps, type FetchLike } from './fetch-capped.ts';
import { REQUEST_CAPS } from './fetch-capped.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const NIM_PROTEINMPNN_URL = 'https://health.api.nvidia.com/v1/biology/ipd/proteinmpnn/predict';

/** 과감함 → 샘플링 온도. 노트북 셀15 설명이 뒤집혀 있었어요 — **높을수록 다양성↑ · 원본 회복률↓** 예요(§2.3). */
export const NIM_SAMPLING_TEMP: Record<AntibodyBoldness, number> = {
  conservative: 0.1,
  normal: 0.2,
  bold: 0.3,
};

export interface NimSuggestInput {
  /** 설계 바탕 구조(PDB 원문). */
  pdb: string;
  /** 설계할 체인들 — 예: `['D']`. */
  chains: string[];
  /** 잠글 자리(체인별 1-기반 번호) — 다양성 상위 자리를 고정해요. */
  fixedPositions?: Record<string, number[]>;
  boldness?: AntibodyBoldness;
  numSequences?: number;
  seed?: number;
}

export interface NimSuggestion {
  seq: string;
  /** NIM 이 준 fasta 머리줄 원문 — 점수 · 회복률이 적혀 있어요. */
  header: string;
}

export interface NimResult {
  suggestions: NimSuggestion[];
  provenance: Provenance;
}

export interface NimAdapterDeps {
  fetch: FetchLike | null | undefined;
  /** `NVIDIA_API_KEY` — 없으면 `createNimAdapter` 가 `null` 을 줘요. */
  apiKey: string | null;
  userAgent: string;
  limiter?: Limiter;
  caps?: Caps;
}

export interface NimAdapter {
  suggestWithNim(input: NimSuggestInput): Promise<NimResult>;
}

/** 키가 없으면 `null` — 호출자는 `null` 이면 규칙 기반 제안으로 강등해요. */
export function createNimAdapter(deps: NimAdapterDeps): NimAdapter | null {
  const key = deps.apiKey?.trim();
  if (!key) return null;
  const doFetch = requireFetch(deps.fetch, 'NVIDIA NIM');
  const limiter = deps.limiter ?? createLimiter();
  const caps = deps.caps ?? { timeoutMs: 120_000, maxBytes: REQUEST_CAPS.json.maxBytes };

  return {
    async suggestWithNim(input) {
      if (!input.pdb || input.chains.length === 0) throw new AdapterError('invalid_input', 400, '설계할 구조와 체인을 함께 보내 주세요.');
      const body = JSON.stringify({
        input_pdb: input.pdb,
        input_pdb_chains: input.chains,
        sampling_temp: [NIM_SAMPLING_TEMP[input.boldness ?? 'normal']],
        num_seq_per_target: Math.min(Math.max(1, Math.trunc(input.numSequences ?? 8)), 16),
        fixed_positions_jsonl: input.fixedPositions ? JSON.stringify(input.fixedPositions) : '',
        omit_AAs: ['C'],
        random_seed: Math.trunc(input.seed ?? 0),
      });
      const res = await limiter.withLimit('nim', () =>
        fetchCapped(doFetch, NIM_PROTEINMPNN_URL, {
          ...caps,
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': deps.userAgent },
          body,
        }),
      );
      if (!res.ok) raiseUpstream(res, 'NVIDIA NIM ProteinMPNN');
      let raw: { mfasta?: unknown };
      try {
        raw = JSON.parse(res.text()) as { mfasta?: unknown };
      } catch (cause) {
        throw new AdapterError('upstream_error', 502, 'NIM 응답이 JSON 이 아니에요.', { cause });
      }
      const suggestions = parseMfasta(typeof raw.mfasta === 'string' ? raw.mfasta : '');
      return {
        suggestions,
        provenance: {
          source: 'server-calc',
          label: '실제 계산',
          detail: `ProteinMPNN(NVIDIA NIM)이 서열 ${suggestions.length}개를 설계했어요.`,
          endpoint: NIM_PROTEINMPNN_URL,
          calledAt: res.calledAt,
          elapsedMs: res.elapsedMs,
          approx: false,
        },
      };
    },
  };
}

/** NIM 의 `mfasta` → 서열 목록. 첫 줄은 입력 구조의 원서열이라 함께 돌려주고, 호출자가 비교군으로 써요. */
export function parseMfasta(mfasta: string): NimSuggestion[] {
  const out: NimSuggestion[] = [];
  let header: string | null = null;
  let seq = '';
  const flush = (): void => {
    if (header !== null && seq !== '') out.push({ seq: seq.toUpperCase(), header });
    seq = '';
  };
  for (const line of mfasta.split('\n')) {
    const row = line.trim();
    if (row === '') continue;
    if (row.startsWith('>')) {
      flush();
      header = row.slice(1);
    } else seq += row.replace(/[^A-Za-z]/g, '');
  }
  flush();
  return out;
}
