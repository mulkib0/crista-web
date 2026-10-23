/**
 * 변이체 자동 제안 — **교육용 근사**예요. ProteinMPNN 계산이 아니에요(§3.3).
 *
 * 화면 배지: `교육용 근사 — ProteinMPNN 계산이 아니에요.`
 *
 * 규칙(§3.3 — 점수순 상위 `count` 개를 돌려줘요)
 *   ① 길이를 유지해요 — **치환만** 해요(삽입 · 결손은 1차에서 금지예요 · §4.1e).
 *   ② 새 약점 모티프를 만들지 않아요.
 *   ③ 계면 자리에서는 MJ 접촉 통계로 유리한 치환을 고릅니다.
 *   ④ 사람 유전자 동일성을 깨지 않아요.
 *   ⑤ 다양성이 낮은(잠긴) 자리는 건드리지 않아요.
 *   ⑥ 새 Cys 는 쓰지 않아요(`SUGGEST_OMIT_AA`).
 *
 * 결정성: 난수를 쓰지 않아요. 점수가 같으면 **자리 · 잔기 순서**로 갈라서 같은 입력이면 늘 같은 목록이에요.
 */
import type { AbChain, AntibodyBoldness, AntibodyMutation, CdrSpan } from '@crista-web/web-contract';
import type { InterfaceContact } from './bind-score.ts';
import {
  AA_SIMILAR_GROUPS,
  AA20,
  SUGGEST_MUTATIONS_BY_BOLDNESS,
  SUGGEST_OMIT_AA,
  SUGGEST_SIMILAR_ONLY,
} from './constants.ts';
import { findLiabilities } from './liabilities.ts';
import { mjContact } from './data/mj1996.ts';

export interface SuggestInput {
  vh: string;
  vl?: string;
  /** CDR 구간 — 제안은 CDR 안에서만 해요. */
  cdrs: readonly CdrSpan[];
  /** 계면 잔기쌍 — 없으면 ③ 항은 0 점이 돼요(없는 값을 꾸미지 않아요). */
  pairs?: readonly InterfaceContact[];
  /** 잠긴 자리 — `H:12` 꼴 열쇠예요(`diversity.ts` 의 `lockedPositions` 로 만들어요). */
  lockedKeys?: ReadonlySet<string>;
}

export interface SuggestedVariant {
  mutations: AntibodyMutation[];
  /** 규칙 점수 — 높을수록 규칙에 더 잘 맞아요. **물리량이 아니에요.** */
  ruleScore: number;
  /** 왜 이 치환을 골랐는지 — 화면에 그대로 보여요. */
  reasons: string[];
}

const CANDIDATES = [...AA20].filter((aa) => !SUGGEST_OMIT_AA.includes(aa));

const similarGroup = (aa: string): string => AA_SIMILAR_GROUPS.find((g) => g.includes(aa)) ?? '';

/** 한 자리 치환 하나의 평가 결과. */
interface SinglePick {
  mutation: AntibodyMutation;
  score: number;
  reasons: string[];
}

const seqOf = (input: SuggestInput, chain: AbChain): string | undefined =>
  chain === 'H' ? input.vh : input.vl;

const replaceAt = (seq: string, pos: number, aa: string): string =>
  `${seq.slice(0, pos - 1)}${aa}${seq.slice(pos)}`;

/** 그 자리를 바꿀 수 있는지 — CDR 안 · 잠기지 않음 · 서열 범위 안이어야 해요. */
const editablePositions = (input: SuggestInput): { chain: AbChain; pos: number; wt: string; cdr: 1 | 2 | 3 }[] => {
  const out: { chain: AbChain; pos: number; wt: string; cdr: 1 | 2 | 3 }[] = [];
  for (const span of input.cdrs) {
    const seq = seqOf(input, span.chain);
    if (!seq) continue;
    for (let pos = span.start; pos <= span.end; pos += 1) {
      if (pos < 1 || pos > seq.length) continue;
      if (input.lockedKeys?.has(`${span.chain}:${pos}`)) continue;
      out.push({ chain: span.chain, pos, wt: seq[pos - 1] as string, cdr: span.cdr });
    }
  }
  out.sort((a, b) => (a.chain === b.chain ? a.pos - b.pos : a.chain < b.chain ? -1 : 1));
  return out;
};

/** 약점 모티프가 늘었는지 — 늘면 제안에서 뺄 근거가 돼요. */
const liabilityDelta = (input: SuggestInput, mutation: AntibodyMutation): number => {
  const before = findLiabilities(input.vh, input.vl, input.cdrs).penaltyTotal;
  const vh = mutation.chain === 'H' ? replaceAt(input.vh, mutation.pos, mutation.mut) : input.vh;
  const vl =
    mutation.chain === 'L' && input.vl ? replaceAt(input.vl, mutation.pos, mutation.mut) : input.vl;
  const after = findLiabilities(vh, vl, input.cdrs).penaltyTotal;
  return after - before;
};

const CONTACT_WEIGHT = 20;
const LIABILITY_WEIGHT = 4;
const SIMILAR_BONUS = 2;

/** 자리 하나에 대해 모든 후보 잔기를 평가해요. */
const pickSingles = (input: SuggestInput, boldness: AntibodyBoldness): SinglePick[] => {
  const similarOnly = SUGGEST_SIMILAR_ONLY[boldness];
  const picks: SinglePick[] = [];
  for (const slot of editablePositions(input)) {
    const group = similarGroup(slot.wt);
    for (const mut of CANDIDATES) {
      if (mut === slot.wt) continue;
      if (similarOnly && !group.includes(mut)) continue;
      const mutation: AntibodyMutation = { chain: slot.chain, pos: slot.pos, wt: slot.wt, mut, cdr: slot.cdr };
      const reasons: string[] = [];

      // ③ 계면 자리면 MJ 접촉 통계로 유리한지 봐요(값이 작아지면 더 잘 붙는 쪽이에요).
      let contact = 0;
      let touched = 0;
      for (const pair of input.pairs ?? []) {
        if (pair.chain !== slot.chain || pair.pos !== slot.pos) continue;
        const after = mjContact(mut, pair.agAa);
        const before = mjContact(slot.wt, pair.agAa);
        if (after === null || before === null) continue;
        contact += after - before;
        touched += 1;
      }
      if (touched > 0) {
        reasons.push(
          contact < 0
            ? '항원과 맞닿는 자리이고, 맞닿는 짝 통계가 좋아지는 치환이에요.'
            : '항원과 맞닿는 자리예요 — 통계가 좋아지지는 않아요.',
        );
      }

      // ② 새 약점 모티프를 만들지 않아요.
      const dLiability = liabilityDelta(input, mutation);
      if (dLiability > 0) reasons.push('약점 모티프가 늘어나요 — 추천 순위를 내렸어요.');
      else if (dLiability < 0) reasons.push('약점 모티프가 줄어드는 치환이에요.');

      // ④ 성질이 비슷한 잔기면 틀 서열 성격을 덜 흔들어요.
      const similar = group.includes(mut);
      if (similar) reasons.push('원래 잔기와 성질이 비슷해서 틀을 덜 흔들어요.');

      const score = Number(
        (-CONTACT_WEIGHT * contact - LIABILITY_WEIGHT * dLiability + (similar ? SIMILAR_BONUS : 0)).toFixed(4),
      );
      picks.push({ mutation, score, reasons });
    }
  }
  // 점수 내림차순 · 같으면 사슬 · 자리 · 잔기 순 — 같은 입력이면 늘 같은 순서예요.
  picks.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.mutation.chain !== b.mutation.chain) return a.mutation.chain < b.mutation.chain ? -1 : 1;
    if (a.mutation.pos !== b.mutation.pos) return a.mutation.pos - b.mutation.pos;
    return a.mutation.mut < b.mutation.mut ? -1 : 1;
  });
  return picks;
};

/**
 * 제안 목록 — 과감함에 따라 한 변이체에 1~3개 치환을 묶어요.
 * 같은 자리를 두 번 쓰지 않고, 모자라면 **있는 만큼만** 돌려줘요(없는 제안을 꾸미지 않아요).
 */
export const suggestVariants = (
  input: SuggestInput,
  count: number,
  boldness: AntibodyBoldness,
): SuggestedVariant[] => {
  if (count <= 0) return [];
  const singles = pickSingles(input, boldness);
  if (singles.length === 0) return [];
  const perVariant = SUGGEST_MUTATIONS_BY_BOLDNESS[boldness];

  const out: SuggestedVariant[] = [];
  let cursor = 0;
  while (out.length < count && cursor < singles.length) {
    const mutations: AntibodyMutation[] = [];
    const reasons: string[] = [];
    let score = 0;
    const used = new Set<string>();
    for (let k = cursor; k < singles.length && mutations.length < perVariant; k += 1) {
      const pick = singles[k] as SinglePick;
      const key = `${pick.mutation.chain}:${pick.mutation.pos}`;
      if (used.has(key)) continue;
      used.add(key);
      mutations.push(pick.mutation);
      score += pick.score;
      for (const r of pick.reasons) if (!reasons.includes(r)) reasons.push(r);
    }
    if (mutations.length === 0) break;
    out.push({ mutations, ruleScore: Number(score.toFixed(4)), reasons });
    cursor += 1;
  }
  return out;
};
