/**
 * 동기부여 Step 3 순수 규칙 — 사옥 소품(설계서 §3.2) · 연례 바이오 학회(§1.1 · §1.3) · License-Out · 설비 임대(§2.2).
 * 구현 결정: docs/2026-10-23-gamification-step3-brief.md §2.
 */
import type {
  CroAttemptView,
  CroQuestionView,
  CroSheetView,
  PropId,
  PropSpec,
  PropUnlock,
  SymposiumBadge,
} from '@crista/shared-types';
import { BOUNTY_LIMITS, CRO_LIMITS, PROP_CATALOG, PROP_RULES, SYMPOSIUM_PARTICIPATION_CENTS, SYMPOSIUM_PRIZES_CENTS } from '@crista/shared-types';
import { croSheet, type CroQuestionKey, type CroSheetKey } from './cro.ts';

// ──────────────────────────────── 소품 ────────────────────────────────

export function propSpec(id: PropId): PropSpec {
  const spec = PROP_CATALOG.find((p) => p.id === id);
  if (!spec) throw new Error(`모르는 소품: ${id}`);
  return spec;
}

export function isPropId(value: unknown): value is PropId {
  return typeof value === 'string' && PROP_CATALOG.some((p) => p.id === value);
}

/** 해금 조건을 지금 만족하는가. */
export function propUnlocked(unlock: PropUnlock, facts: { activePatents: number; approved: boolean; hqTier: 1 | 2 | 3 }): boolean {
  switch (unlock) {
    case 'always':
      return true;
    case 'patent':
      return facts.activePatents >= 1;
    case 'approval':
      return facts.approved;
    case 'tier3':
      return facts.hqTier >= 3;
  }
}

/** 매각 회수액 — 산 값의 50%(내림). */
export function propSaleCents(paidCents: number): number {
  return Math.floor(Math.max(0, paidCents) * PROP_RULES.saleRate);
}

/** 안전구매 가드레일 — 구매 뒤 잔액이 월 유지비 × 6 이상인가. 모자라면 필요한 잔액(센트), 되면 null. */
export function propReserveShortfall(balanceCents: number, priceCents: number, monthlyUpkeepCents: number): number | null {
  const need = priceCents + PROP_RULES.reserveMonths * Math.max(0, monthlyUpkeepCents);
  return balanceCents >= need ? null : need;
}

/** CRO 재도전 대기(초) — 에스프레소 머신이 있으면 45초. */
export function croRetrySeconds(props: readonly string[]): number {
  return props.includes('espresso') ? PROP_RULES.fastRetrySeconds : CRO_LIMITS.retrySeconds;
}

/** 바운티 재제출 대기(초) — 피어리뷰 테이블이 있으면 45초. */
export function bountyRetrySeconds(props: readonly string[]): number {
  return props.includes('lounge-sofa') ? PROP_RULES.fastRetrySeconds : BOUNTY_LIMITS.retrySeconds;
}

// ──────────────────────────────── 학회 ────────────────────────────────

/** 학회 문항지 키 — 문항 id 앞에 묶음 표지(d 심층 · b 생명과학 · a AI). */
export interface SymposiumSheet {
  view: CroSheetView;
  key: CroSheetKey;
}

/**
 * 게임 연도 하나의 학회 문항지 — 학급 공통(시드 = 학급 시드 · 연도). 심층 사례 4문항 + 생명과학 3 + AI · 생물정보 3 = 10문항.
 * 채점은 맞은 문항 수(근거 문항 포함, 0~10).
 */
export function symposiumSheet(classSeed: string | number, gameYear: number): SymposiumSheet {
  const seed = `symposium|${String(classSeed)}|y${gameYear}`;
  const deep = croSheet(`${seed}|deep`, 'deep', 'bio', 0);
  const bio = croSheet(`${seed}|bio`, 'general', 'bio', 0);
  const ai = croSheet(`${seed}|ai`, 'general', 'ai', 0);
  const views: CroQuestionView[] = [];
  const keys: CroQuestionKey[] = [];
  const add = (prefix: string, sheet: ReturnType<typeof croSheet>, onlyMain: boolean) => {
    for (const q of sheet.view.questions) {
      if (onlyMain && q.role !== 'main') continue;
      const k = sheet.key.questions.find((x) => x.id === q.id)!;
      views.push({ ...q, id: `${prefix}-${q.id}`, role: 'main' });
      keys.push({ ...k, id: `${prefix}-${q.id}`, role: 'main' });
    }
  };
  add('d', deep, false);
  add('b', bio, true);
  add('a', ai, true);
  return {
    view: { variant: 0, title: `${gameYear + 1}년차 연례 바이오 학회`, ...(deep.view.brief ? { brief: deep.view.brief } : {}), questions: views },
    key: { track: 'deep', questions: keys },
  };
}

/** 학회 채점 — 맞은 문항 수 · 문항별 맞음 · 해설. */
export function gradeSymposium(key: CroSheetKey, answers: Record<string, string[]>): Pick<CroAttemptView, 'correct' | 'explanations'> & { score: number; max: number } {
  const correct: Record<string, boolean> = {};
  const explanations: Record<string, string> = {};
  let score = 0;
  for (const q of key.questions) {
    const picked = answers[q.id] ?? [];
    const ok = picked.length === q.correct.length && q.correct.every((c) => picked.includes(c));
    correct[q.id] = ok;
    explanations[q.id] = q.explanation;
    if (ok) score += 1;
  }
  return { correct, explanations, score, max: key.questions.length };
}

export interface SymposiumEntry {
  lineageId: string;
  score: number;
  submittedAtMs: number;
}

export interface SymposiumAward {
  lineageId: string;
  rank: number;
  /** 순위 상금 · 참가비(센트, 상한 적용 전). 0 문항이면 0. */
  prizeCents: number;
  badge: SymposiumBadge | null;
}

/** 순위 · 상금 — 점수 내림차순, 같으면 먼저 낸 순. 1 · 2 · 3위 순위 상금, 그 밖 1문항 이상이면 참가 $0.010M. */
export function symposiumAwards(entries: readonly SymposiumEntry[]): SymposiumAward[] {
  const sorted = entries.slice().sort((a, b) => b.score - a.score || a.submittedAtMs - b.submittedAtMs || a.lineageId.localeCompare(b.lineageId));
  return sorted.map((e, i) => {
    const rank = i + 1;
    if (e.score <= 0) return { lineageId: e.lineageId, rank, prizeCents: 0, badge: null };
    const prize = rank <= SYMPOSIUM_PRIZES_CENTS.length ? SYMPOSIUM_PRIZES_CENTS[rank - 1]! : SYMPOSIUM_PARTICIPATION_CENTS;
    const badge: SymposiumBadge = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'participant';
    return { lineageId: e.lineageId, rank, prizeCents: prize, badge };
  });
}

// ──────────────────────────────── 라이선스 · 임대 관계 ────────────────────────────────

/**
 * 새 관계 `from → to`(제공 → 이용)가 순환을 만드는가 — 이미 있는 관계로 `to` 에서 `from` 으로 갈 수 있으면 순환이다
 * (`A → B` 뒤 `B → A`, `A → B → C → A`). 같은 쌍의 같은 방향은 순환이 아니다.
 */
export function createsCycle(edges: ReadonlyArray<readonly [string, string]>, from: string, to: string): boolean {
  if (from === to) return true;
  const next = new Map<string, string[]>();
  for (const [a, b] of edges) next.set(a, [...(next.get(a) ?? []), b]);
  const seen = new Set<string>([to]);
  const queue = [to];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === from) return true;
    for (const n of next.get(cur) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return false;
}

/**
 * 로열티 정산 계획 — 판정 사실(정정 반영)과 지금 기록 상태로 할 일을 정한다(교사 정정 · 복원도 같은 함수).
 * - running: 에스크로 그대로. passed: 맡긴 것이면 라이선서에게 지급, 반환했던 것이면 다시 청구해 지급.
 * - failed: 맡긴 것이면 라이선시에게 반환, 지급했던 것이면 라이선서에게서 회수해 반환.
 */
export function royaltyAction(stepStatus: 'running' | 'passed' | 'failed', record: 'escrow' | 'paid' | 'released'): 'none' | 'pay' | 'release' | 'clawback' | 'recharge' {
  if (stepStatus === 'running') return 'none';
  if (stepStatus === 'passed') return record === 'escrow' ? 'pay' : record === 'released' ? 'recharge' : 'none';
  return record === 'escrow' ? 'release' : record === 'paid' ? 'clawback' : 'none';
}
