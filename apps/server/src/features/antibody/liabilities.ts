/**
 * 약점 모티프 찾기 — **센 값**이에요(서열에서 모티프 개수를 그대로 세요 · §3.5).
 *
 * 한계 문구(화면에 함께 보여요)
 * - `모티프가 있다고 실제로 변형이 일어나는 것은 아니에요. 40°C · pH 6.0 · 2주 스트레스 실험에서
 *    NG 모티프 중 67%, NS 중 21%, DG 중 36%, DS 중 13% 에서만 변형이 검출됐어요.`
 *
 * 1판에서 바꾼 것(§10 S3): 감점 스케일을 재보정했고(High −18 → −6 등), **CDR 안 `W` · `M` 산화는 감점을 폐지**하고
 * 경고 라벨로만 보여 줘요 — 노출도 정보 없이 Trp · Met 산화를 깎는 것은 과해요.
 */
import type { AbChain, CdrSpan } from '@crista-web/web-contract';
import { CYS_PENALTY, LIABILITY_RULES, OXIDATION_WATCH_AA, type LiabilityRule } from './constants.ts';

export interface LiabilityHit {
  /** 모티프 이름 — 화면에 그대로 보여요. */
  motif: string;
  severity: 'high' | 'medium' | 'low';
  chain: AbChain;
  /** 1부터 세는 서열 자리(모티프가 시작하는 자리)예요. */
  pos: number;
  fixable: 'easy' | 'hard';
  /** 감점 점수(양수). */
  penalty: number;
  note: string;
  /** CDR 안에서 찾은 것이면 몇 번 CDR 인지예요. */
  cdr?: 1 | 2 | 3;
}

export interface LiabilityWatch {
  chain: AbChain;
  pos: number;
  aa: string;
  note: string;
}

export interface LiabilityReport {
  hits: LiabilityHit[];
  /** 감점하지 않고 경고만 하는 것 — CDR 안 Trp · Met 산화 자리예요. */
  watches: LiabilityWatch[];
  /** 감점 합(양수). 개발가능성에서 이만큼 깎아요. */
  penaltyTotal: number;
}

export interface LiabilityOptions {
  /**
   * IMGT 23 · 104 의 보존 Cys 가 있는지 — 번호 매김을 받은 경우에만 넘겨요.
   * 넘기지 않으면 **이 검사를 건너뛰어요**(번호를 모르는데 결손이라고 단정하지 않아요).
   */
  conservedCysPresent?: Partial<Record<AbChain, boolean>>;
}

/** 겹치는 모티프도 빠뜨리지 않게 한 자리씩 밀면서 찾아요(`NGS` 에서 `NG` 와 `N[^P][ST]` 를 모두 세요). */
const scan = (text: string, pattern: RegExp): number[] => {
  const found: number[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  for (let start = 0; start < text.length; start += 1) {
    re.lastIndex = start;
    const m = re.exec(text);
    if (!m || m.index !== start) continue;
    found.push(start);
  }
  return found;
};

const cdrOf = (cdrs: readonly CdrSpan[], chain: AbChain, pos: number): CdrSpan | undefined =>
  cdrs.find((c) => c.chain === chain && pos >= c.start && pos <= c.end);

const chainHits = (
  chain: AbChain,
  seq: string,
  cdrs: readonly CdrSpan[],
  rule: LiabilityRule,
): LiabilityHit[] => {
  const out: LiabilityHit[] = [];
  const offsets = scan(seq, rule.pattern);
  for (const offset of offsets) {
    const pos = offset + 1;
    const span = cdrOf(cdrs, chain, pos);
    if (rule.scope === 'cdr' && !span) continue;
    const hit: LiabilityHit = {
      motif: rule.motif,
      severity: rule.severity,
      chain,
      pos,
      fixable: rule.fixable,
      penalty: rule.penalty,
      note: rule.note,
    };
    if (span) hit.cdr = span.cdr;
    out.push(hit);
  }
  return out;
};

/**
 * 약점 모티프 전체 — CDR 안만 보는 규칙과 Fv 전체를 보는 규칙을 `constants.ts` 의 표대로 나눠 찾아요.
 * `cdrs` 가 비어 있으면 CDR 범위 규칙은 **아예 세지 않아요**(경계를 모르는데 세면 틀린 감점이 돼요).
 */
export const findLiabilities = (
  vh: string,
  vl: string | undefined,
  cdrs: readonly CdrSpan[],
  options: LiabilityOptions = {},
): LiabilityReport => {
  const chains: { chain: AbChain; seq: string }[] = [{ chain: 'H', seq: vh }];
  if (vl && vl.length > 0) chains.push({ chain: 'L', seq: vl });

  const hits: LiabilityHit[] = [];
  const watches: LiabilityWatch[] = [];

  for (const { chain, seq } of chains) {
    for (const rule of LIABILITY_RULES) hits.push(...chainHits(chain, seq, cdrs, rule));

    // Cys 개수가 홀수면 짝이 안 맞아요 — 이황화 결합이 흐트러져요.
    let cys = 0;
    for (const aa of seq) if (aa === 'C') cys += 1;
    if (cys % 2 === 1) {
      hits.push({
        motif: 'Cys 개수 홀수',
        severity: 'high',
        chain,
        pos: seq.indexOf('C') + 1,
        fixable: 'hard',
        penalty: CYS_PENALTY,
        note: '시스테인 개수가 홀수예요 — 짝을 못 찾은 시스테인이 생겨요.',
      });
    }

    const conserved = options.conservedCysPresent?.[chain];
    if (conserved === false) {
      hits.push({
        motif: '보존 Cys 결손',
        severity: 'high',
        chain,
        pos: 1,
        fixable: 'hard',
        penalty: CYS_PENALTY,
        note: '사슬을 붙잡아 주는 두 시스테인 자리 가운데 하나가 없어요(IMGT 23 · 104).',
      });
    }

    // 감점하지 않고 경고만 하는 것 — CDR 안 Trp · Met 산화(§10 S3).
    for (let i = 0; i < seq.length; i += 1) {
      const aa = seq[i] as string;
      if (!OXIDATION_WATCH_AA.includes(aa)) continue;
      const span = cdrOf(cdrs, chain, i + 1);
      if (!span) continue;
      watches.push({
        chain,
        pos: i + 1,
        aa,
        note:
          aa === 'W'
            ? 'CDR 안 트립토판이에요 — 산화될 수 있지만 겉으로 드러났는지 모르니 점수는 깎지 않아요.'
            : 'CDR 안 메싸이오닌이에요 — 산화될 수 있지만 겉으로 드러났는지 모르니 점수는 깎지 않아요.',
      });
    }
  }

  hits.sort((a, b) => (a.chain === b.chain ? a.pos - b.pos : a.chain < b.chain ? -1 : 1));
  watches.sort((a, b) => (a.chain === b.chain ? a.pos - b.pos : a.chain < b.chain ? -1 : 1));

  const penaltyTotal = hits.reduce((sum, h) => sum + h.penalty, 0);
  return { hits, watches, penaltyTotal };
};
