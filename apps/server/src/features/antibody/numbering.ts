/**
 * 번호 매김 → CDR 구간 — **정규식을 1순위로 쓰지 않아요**(§3.2).
 *
 * 순서
 *   ① `sabdab` — SAbDab2 `/api/sequence-similarity-search` 의 `target_numbering`(IMGT 번호 · 간격 포함)을 그대로 써요. **1순위**예요.
 *   ② `germline-anchored` — 번호를 못 받으면 IMGT/GENE-DB 의 **간격이 들어간 germline V-REGION** 에 서열을 맞춰
 *      IMGT 1-104 를 옮기고, CDR3(105-117) · FR4(118-128)는 보존 Cys(104)와 FR4 모티프로 끊어요.
 *   ③ `regex-fallback` — 둘 다 안 되면 보정 정규식으로 강등하고 **화면에 그 사실을 적어요**.
 *
 * **계약의 `NumberingSource` 에 `'anarci'` 를 쓰지 않아요.** 실제 ANARCI/ANARCII 를 이식하면 그때 쓰려고 비워 둔 값이에요.
 * ② 는 ANARCI 가 아니라 우리 저장소의 germline 정렬이라서 계약에는 `'regex-fallback'` 으로 내려보내고,
 * 어느 경로였는지는 `LocalNumberingMethod` 로 따로 들고 다녀요(정직성 §3.5).
 *
 * 축(axis) 규칙: IMGT 숫자와 Kabat 숫자를 **섞지 않아요**. 번호에는 축이 붙어 있고,
 * 요청한 스킴의 축과 다르면 계산하지 않고 거절해요.
 */
import type { AbChain, CdrScheme, CdrSpan, NumberingSource } from '@crista-web/web-contract';
import {
  CDR_IMGT,
  CDR_KABAT_AXIS,
  CONSERVED_CYS_IMGT,
  H3_FALLBACK_LENGTH,
  L1_KABAT_FALLBACK,
  type KabatBound,
} from './constants.ts';
import { alignToGermline, type ImgtSlot } from './germline-identity.ts';

/** 번호축 — 스킴마다 어느 축인지 고정돼 있어요. */
export type NumberingAxis = 'imgt' | 'kabat';

/** 스킴 → 축. `imgt` 만 IMGT 축이고 나머지 넷은 모두 Kabat 축 숫자예요(`constants.ts` 의 표와 같아요). */
export const schemeAxis = (scheme: CdrScheme): NumberingAxis => (scheme === 'imgt' ? 'imgt' : 'kabat');

/** 어떤 경로로 번호를 얻었는지 — 계약 값보다 자세해요. */
export type LocalNumberingMethod = 'sabdab' | 'germline-anchored' | 'regex-fallback';

/** 계약(`NumberingSource`)으로 내려보낼 값. `'anarci'` 는 실제 ANARCI 이식 전까지 쓰지 않아요. */
export const contractNumberingSource = (method: LocalNumberingMethod): NumberingSource =>
  method === 'sabdab' ? 'sabdab' : 'regex-fallback';

/** 경로별로 화면에 적을 한 줄 — `regex-fallback` 일 때는 경계가 틀릴 수 있다고 반드시 알려요. */
export const NUMBERING_NOTE: Readonly<Record<LocalNumberingMethod, string>> = {
  sabdab: '실측 항체 데이터베이스의 번호 매김으로 잘랐어요(IMGT 기준).',
  'germline-anchored':
    '번호를 받지 못해서 사람 germline V 유전자(IMGT 간격 표기)에 맞춰 번호를 옮겼어요. 경계가 한두 자리 틀릴 수 있어요.',
  'regex-fallback': '번호 매김 실패 — 서열 규칙으로 대신 잘랐어요. 경계가 틀릴 수 있어요.',
};

export interface NumberedResidue {
  /** 1부터 세는 **서열 자리** — `CdrSpan.start`/`end` · `AntibodyMutation.pos` 와 같은 축이에요. */
  pos: number;
  aa: string;
  /** 번호(축은 `NumberedChain.axis`). */
  num: number;
  /** 삽입문자 — 없으면 빈 문자열이에요(`35B` 는 `{num:35, insertion:'B'}`). */
  insertion: string;
}

export interface NumberedChain {
  chain: AbChain;
  seq: string;
  axis: NumberingAxis;
  method: LocalNumberingMethod;
  /** 번호가 붙은 자리만 들어 있어요(번호를 못 받은 자리는 빠져요). */
  residues: NumberedResidue[];
}

/** 축이 안 맞는 요청을 거절할 때 던져요 — 숫자를 섞어 쓰는 사고를 막는 울타리예요. */
export class NumberingAxisError extends Error {
  readonly code = 'invalid_input';
  constructor(axis: NumberingAxis, scheme: CdrScheme) {
    super(`번호축이 맞지 않아요 — 번호는 ${axis} 축인데 ${scheme} 스킴은 ${schemeAxis(scheme)} 축 숫자를 써요.`);
    this.name = 'NumberingAxisError';
  }
}

// ── ① SAbDab2 번호 ───────────────────────────────────────────────────────────

/**
 * SAbDab2 `target_numbering` 을 그대로 받아요.
 * 받는 꼴은 `[[번호, 삽입문자], …]`(계약 `DiversityView.imgtNumbers` 와 같은 꼴)이고 **서열 자리 순서**예요.
 * 번호 수와 서열 길이가 다르면 `null` — 어긋난 번호로 CDR 을 자르지 않아요.
 */
export const numberFromSabdab = (
  seq: string,
  chain: AbChain,
  numbering: readonly (readonly [number, string])[],
): NumberedChain | null => {
  if (numbering.length !== seq.length) return null;
  const residues: NumberedResidue[] = [];
  for (let i = 0; i < seq.length; i += 1) {
    const entry = numbering[i] as readonly [number, string];
    if (!Number.isInteger(entry[0]) || entry[0] <= 0) return null;
    residues.push({ pos: i + 1, aa: seq[i] as string, num: entry[0], insertion: entry[1] ?? '' });
  }
  return { chain, seq, axis: 'imgt', method: 'sabdab', residues };
};

// ── ② germline 에 맞춘 국소 번호 ─────────────────────────────────────────────

/** FR4 시작 모티프 — 중쇄는 `WG[A-Z]G`(설계 §3.2), 경쇄는 같은 자리의 `FG[A-Z]G` 예요(우리가 더한 것). */
export const FR4_MOTIF: Readonly<Record<AbChain, string>> = { H: 'WG[A-Z]G', L: 'FG[A-Z]G' };

/** 모티프의 **가장 뒤쪽** 출현 자리(0부터) — FR4 는 Fv 의 끝이라 마지막 것을 써요. 없으면 −1 이에요. */
const lastMotifIndex = (seq: string, source: string, after = 0): number => {
  const re = new RegExp(source, 'g');
  let found = -1;
  let m = re.exec(seq);
  while (m) {
    if (m.index >= after) found = m.index;
    re.lastIndex = m.index + 1;
    m = re.exec(seq);
  }
  return found;
};

/**
 * CDR3-IMGT 자리 번호 — 13칸(105~117)에 길이를 맞춰요.
 * 짧으면 가운데(111 · 112)부터 비우고, 길면 111 · 112 에 삽입문자를 붙여요(IMGT 가 길이 차이를 담는 방식이에요).
 */
const IMGT_CDR3_DROP_ORDER: readonly number[] = [111, 112, 110, 113, 109, 114, 108, 115, 107, 116, 106, 117, 105];

export const cdr3ImgtSlots = (length: number): ImgtSlot[] => {
  const full = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117];
  if (length <= 0) return [];
  if (length <= full.length) {
    const drop = new Set(IMGT_CDR3_DROP_ORDER.slice(0, full.length - length));
    return full.filter((n) => !drop.has(n)).map((num) => ({ num, insertion: '' }));
  }
  const extra = length - full.length;
  const after111: ImgtSlot[] = [];
  const before112: ImgtSlot[] = [];
  for (let k = 0; k < extra; k += 1) {
    const letter = String.fromCharCode(65 + Math.floor(k / 2));
    if (k % 2 === 0) after111.push({ num: 111, insertion: letter });
    else before112.unshift({ num: 112, insertion: letter });
  }
  const out: ImgtSlot[] = [];
  for (const num of full) {
    out.push({ num, insertion: '' });
    if (num === 111) out.push(...after111, ...before112);
  }
  return out;
};

/**
 * germline 정렬로 IMGT 번호를 옮기고 CDR3 · FR4 를 보존 Cys(104) · FR4 모티프로 끊어요.
 * Cys(104) 나 FR4 모티프를 못 찾으면 `null` — 그러면 ③ 정규식으로 강등해요.
 */
export const numberByGermline = (seq: string, chain: AbChain): NumberedChain | null => {
  const aligned = alignToGermline(seq, chain);
  if (!aligned) return null;

  const cysIndex = aligned.slots.findIndex((slot) => slot?.num === 104 && slot.insertion === '');
  if (cysIndex < 0) return null;
  const fr4Index = lastMotifIndex(seq, FR4_MOTIF[chain], cysIndex + 1);
  if (fr4Index < 0 || fr4Index <= cysIndex) return null;

  const cdr3Length = fr4Index - cysIndex - 1;
  if (cdr3Length < H3_FALLBACK_LENGTH.min || cdr3Length > H3_FALLBACK_LENGTH.max) return null;
  const cdr3 = cdr3ImgtSlots(cdr3Length);

  const residues: NumberedResidue[] = [];
  for (let i = 0; i <= cysIndex; i += 1) {
    const slot = aligned.slots[i];
    if (!slot || slot.num > 104) continue;
    residues.push({ pos: i + 1, aa: seq[i] as string, num: slot.num, insertion: slot.insertion });
  }
  for (let k = 0; k < cdr3Length; k += 1) {
    const slot = cdr3[k] as ImgtSlot;
    const i = cysIndex + 1 + k;
    residues.push({ pos: i + 1, aa: seq[i] as string, num: slot.num, insertion: slot.insertion });
  }
  for (let k = 0; k < 11; k += 1) {
    const i = fr4Index + k;
    if (i >= seq.length) break;
    residues.push({ pos: i + 1, aa: seq[i] as string, num: 118 + k, insertion: '' });
  }
  return { chain, seq, axis: 'imgt', method: 'germline-anchored', residues };
};

// ── CDR 구간 ─────────────────────────────────────────────────────────────────

/** Kabat 축 비교 — 번호가 같으면 삽입문자로 갈라요(빈 문자열이 먼저예요). */
const kabatAtLeast = (r: NumberedResidue, bound: KabatBound): boolean =>
  r.num > bound.num || (r.num === bound.num && r.insertion >= bound.insertion);
const kabatAtMost = (r: NumberedResidue, bound: KabatBound): boolean =>
  r.num < bound.num || (r.num === bound.num && r.insertion <= bound.insertion);

const spanFrom = (chain: AbChain, cdr: 1 | 2 | 3, scheme: CdrScheme, picked: NumberedResidue[]): CdrSpan | null => {
  if (picked.length === 0) return null;
  const sorted = [...picked].sort((a, b) => a.pos - b.pos);
  const first = sorted[0] as NumberedResidue;
  const last = sorted[sorted.length - 1] as NumberedResidue;
  return {
    chain,
    cdr,
    scheme,
    start: first.pos,
    end: last.pos,
    seq: sorted.map((r) => r.aa).join(''),
  };
};

/**
 * 번호가 붙은 사슬에서 CDR 구간 세 개를 잘라요.
 * `start` · `end` 는 **1부터 세는 서열 자리**(양끝 포함)예요 — 번호가 아니에요.
 * 번호축이 스킴과 다르면 `NumberingAxisError` 를 던져요.
 */
export const cdrSpans = (chain: NumberedChain, scheme: CdrScheme): CdrSpan[] => {
  if (schemeAxis(scheme) !== chain.axis) throw new NumberingAxisError(chain.axis, scheme);
  const out: CdrSpan[] = [];
  for (const cdr of [1, 2, 3] as const) {
    let picked: NumberedResidue[];
    if (scheme === 'imgt') {
      const range = CDR_IMGT[cdr];
      picked = chain.residues.filter((r) => r.num >= range.start && r.num <= range.end);
    } else {
      const range = CDR_KABAT_AXIS[scheme][chain.chain][cdr];
      picked = chain.residues.filter((r) => kabatAtLeast(r, range.start) && kabatAtMost(r, range.end));
    }
    const span = spanFrom(chain.chain, cdr, scheme, picked);
    if (span) out.push(span);
  }
  return out;
};

/** 보존 Cys(IMGT 23 · 104)가 둘 다 있는지 — 약점 모티프 검사에 넘겨요. */
export const conservedCysPresent = (chain: NumberedChain): boolean | null => {
  if (chain.axis !== 'imgt') return null;
  return CONSERVED_CYS_IMGT.every((num) =>
    chain.residues.some((r) => r.num === num && r.insertion === '' && r.aa === 'C'),
  );
};

// ── ③ 보정 정규식(최후 수단) ────────────────────────────────────────────────

export interface FallbackSpans {
  cdrs: CdrSpan[];
  /** 규칙으로도 못 찾은 CDR 번호 — 화면이 '이 구간은 모릅니다'를 적어요. */
  missing: (1 | 2 | 3)[];
  source: NumberingSource;
  note: string;
}

/**
 * 보정 정규식 — **최후 수단**이에요.
 *
 * CDR3: `WG[A-Z]G`(경쇄는 `FG[A-Z]G`) 모티프를 찾고 **그 앞의 _마지막_ Cys** 를 앵커로 써요.
 *   1판의 `/C[A-Z]{2}(?<h3>.*?)WG[A-Z]G/` 는 FR1 의 Cys(IMGT 23)에 걸려 고유 VH 6,651개 중 **2건**만 맞았어요.
 * CDR1 · CDR2: **IMGT 축에서는 규칙으로 찾지 않아요.** 1판의 L1 정규식은 Kabat L1 을 잡아
 *   IMGT CDR-L1 과 5,003건 전부 불일치했어요 — 그래서 **Kabat 스킴을 고른 경우에만** L1 규칙을 써요.
 */
export const cdrSpansFallback = (seq: string, chain: AbChain, scheme: CdrScheme): FallbackSpans => {
  const cdrs: CdrSpan[] = [];
  const missing: (1 | 2 | 3)[] = [];

  const fr4 = lastMotifIndex(seq, FR4_MOTIF[chain]);
  const cysIndex = fr4 > 0 ? seq.lastIndexOf('C', fr4 - 1) : -1;
  const length = fr4 - cysIndex - 1;
  if (
    fr4 > 0 &&
    cysIndex >= 0 &&
    length >= H3_FALLBACK_LENGTH.min &&
    length <= H3_FALLBACK_LENGTH.max
  ) {
    cdrs.push({
      chain,
      cdr: 3,
      scheme,
      start: cysIndex + 2,
      end: fr4,
      seq: seq.slice(cysIndex + 1, fr4),
    });
  } else {
    missing.push(3);
  }

  if (scheme === 'kabat' && chain === 'L') {
    const m = L1_KABAT_FALLBACK.exec(seq);
    const body = m?.[1];
    if (m && body !== undefined) {
      cdrs.push({ chain, cdr: 1, scheme, start: m.index + 2, end: m.index + 1 + body.length, seq: body });
    } else {
      missing.push(1);
    }
  } else {
    missing.push(1);
  }
  missing.push(2);

  missing.sort((a, b) => a - b);
  return { cdrs, missing, source: 'regex-fallback', note: NUMBERING_NOTE['regex-fallback'] };
};

// ── 한 번에 고르는 입구 ──────────────────────────────────────────────────────

export interface ResolveInput {
  seq: string;
  chain: AbChain;
  scheme: CdrScheme;
  /** SAbDab2 가 준 번호 — 있으면 이것부터 써요. */
  sabdabNumbering?: readonly (readonly [number, string])[];
}

export interface ResolvedNumbering {
  cdrs: CdrSpan[];
  missing: (1 | 2 | 3)[];
  method: LocalNumberingMethod;
  source: NumberingSource;
  note: string;
  /** 번호가 붙은 사슬 — 보정 정규식으로 강등됐으면 `null` 이에요. */
  numbered: NumberedChain | null;
}

/** ① → ② → ③ 순서로 번호를 구해 CDR 을 잘라요. 어느 경로였는지 늘 함께 돌려줘요. */
export const resolveNumbering = (input: ResolveInput): ResolvedNumbering => {
  const axis = schemeAxis(input.scheme);
  const tryChain = (chain: NumberedChain | null): ResolvedNumbering | null => {
    if (!chain || chain.axis !== axis) return null;
    const cdrs = cdrSpans(chain, input.scheme);
    const found = new Set(cdrs.map((c) => c.cdr));
    const missing = ([1, 2, 3] as const).filter((n) => !found.has(n));
    if (cdrs.length === 0) return null;
    return {
      cdrs,
      missing: [...missing],
      method: chain.method,
      source: contractNumberingSource(chain.method),
      note: NUMBERING_NOTE[chain.method],
      numbered: chain,
    };
  };

  if (input.sabdabNumbering) {
    const picked = tryChain(numberFromSabdab(input.seq, input.chain, input.sabdabNumbering));
    if (picked) return picked;
  }
  const local = tryChain(numberByGermline(input.seq, input.chain));
  if (local) return local;

  const fb = cdrSpansFallback(input.seq, input.chain, input.scheme);
  return { ...fb, method: 'regex-fallback', numbered: null };
};
