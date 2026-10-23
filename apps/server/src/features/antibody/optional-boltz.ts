/**
 * 선택 경로 — Boltz 복합체 예측(설계 §3.3 Part4).
 *
 * 기본값은 **키 없음**이에요. 그때는 이 어댑터를 만들지 않고(`null`) 묶음 3 의 결정적 '설계 적합도(교육용 근사)'로 **강등**하고,
 * 화면이 그 사실을 적어요. 폐지된 NIM 호스팅 복합체 경로는 쓰지 않아요(§3.3).
 *
 * 한계(§3.3) — 항체·항원 경로에서는 결합력 지표(`binding_confidence` 등 리간드 전용)가 오지 않아요.
 * `metrics.iptm` · `complex_plddt` 만 오므로 **결합력 수치로 쓰지 않고 `복합체 신뢰도`로만** 표시해요.
 * 원전 지표 이름(`ipTM`)을 쓰는 곳은 이 경로 **하나뿐**이에요(§3.5 금지 이름 예외).
 */
import type { Provenance } from '@crista-web/web-contract';
import { normalizeSeq } from '@crista-web/web-contract';
import { AdapterError, fetchCapped, raiseUpstream, requireFetch, REQUEST_CAPS, type Caps, type FetchLike } from './fetch-capped.ts';
import { createLimiter, type Limiter } from './queue.ts';

export const BOLTZ_BASE = 'https://api.boltz.bio';
export const BOLTZ_MODEL = 'boltz-2.1';

export interface BoltzComplexInput {
  vh: string;
  vl?: string | null;
  /** 항원 서열. */
  antigen: string;
  /** 우리가 이미 받아 둔 ColabFold a3m 을 다시 써요(§3.3). */
  msaA3m?: string | null;
}

export interface BoltzComplexOutput {
  /** 복합체 신뢰도 — 원전 이름을 쓸 수 있는 유일한 자리. 결합력이 아니에요. */
  iptm: number | null;
  complexConfidence: number | null;
  provenance: Provenance;
}

export interface BoltzAdapterDeps {
  fetch: FetchLike | null | undefined;
  /** `BOLTZ_API_KEY` — 없으면 `createBoltzAdapter` 가 `null` 을 줘요. */
  apiKey: string | null;
  userAgent: string;
  limiter?: Limiter;
  caps?: Caps;
}

export interface BoltzAdapter {
  predictComplexWithBoltz(input: BoltzComplexInput): Promise<BoltzComplexOutput>;
}

/** 키가 없으면 `null` — 호출자는 `null` 이면 교육용 근사 적합도로 강등해요. */
export function createBoltzAdapter(deps: BoltzAdapterDeps): BoltzAdapter | null {
  const key = deps.apiKey?.trim();
  if (!key) return null;
  const doFetch = requireFetch(deps.fetch, 'Boltz');
  const limiter = deps.limiter ?? createLimiter();
  const caps = deps.caps ?? { timeoutMs: 300_000, maxBytes: REQUEST_CAPS.json.maxBytes };
  const url = `${BOLTZ_BASE}/v1/predictions:structure-and-binding`;

  return {
    async predictComplexWithBoltz(input) {
      const entities = [
        { type: 'protein', id: 'H', sequence: normalizeSeq(input.vh) },
        ...(input.vl ? [{ type: 'protein', id: 'L', sequence: normalizeSeq(input.vl) }] : []),
        { type: 'protein', id: 'AG', sequence: normalizeSeq(input.antigen) },
      ];
      const res = await limiter.withLimit('boltz', () =>
        fetchCapped(doFetch, url, {
          ...caps,
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': deps.userAgent },
          body: JSON.stringify({ model: BOLTZ_MODEL, entities, ...(input.msaA3m ? { msa: { format: 'a3m', content: input.msaA3m } } : {}) }),
        }),
      );
      if (!res.ok) raiseUpstream(res, 'Boltz');
      let raw: { metrics?: { iptm?: unknown; complex_plddt?: unknown } };
      try {
        raw = JSON.parse(res.text()) as { metrics?: { iptm?: unknown; complex_plddt?: unknown } };
      } catch (cause) {
        throw new AdapterError('upstream_error', 502, 'Boltz 응답이 JSON 이 아니에요.', { cause });
      }
      const iptm = numOrNull(raw.metrics?.iptm);
      const complexConfidence = numOrNull(raw.metrics?.complex_plddt);
      return {
        iptm,
        complexConfidence,
        provenance: {
          source: 'ai-predict',
          label: '실제 AI 예측 — 복합체 신뢰도',
          detail: `Boltz-${BOLTZ_MODEL.replace('boltz-', '')} 가 복합체를 예측했어요. 복합체 신뢰도(ipTM)는 모델의 자기 확신값이고 결합력(affinity)이 아니에요. **이 값은 점수에 들어가지 않고 표시만 해요**(§4.1a · §12).`,
          endpoint: url,
          calledAt: res.calledAt,
          elapsedMs: res.elapsedMs,
          approx: false,
        },
      };
    },
  };
}

function numOrNull(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}
