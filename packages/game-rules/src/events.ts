/**
 * 자동 · 교사 이벤트 — 순수 규칙(M3). 단일 소스: `docs/2026-10-19-game-balance-v0.md` §5, M3 브리프 §4.5,
 * 카탈로그 `assets/data/macro-events.json`(읽기만).
 *
 * - 효과가 구현된 규칙만 추첨 · 실행한다: `cash` · `upkeep`(facility/rent/staff) · `researchCost` 중 범위에 docking 이 있는 것 ·
 *   (M4) `marketDemand` — 증시 시장 수요 배율 M(균형안 §9.2, `demandMultiplierAt`) ·
 *   (M5) `clinicalCost` 임상 비용 · `reviewCost` FDA 심사 비용 · 기간(균형안 §10.1 — 신청 시점 게임 일의 값, 이미 시작한 단계는 소급하지 않는다).
 * - 지속 효과는 [startDay, endDay) 게임 일 구간에 적용한다. 같은 eventId 가 겹치면 **한 번만** 곱한다(= 남은 기간만 늘어난다).
 * - 서로 다른 비용 효과의 총배율은 항목마다 0.70~1.30 으로 자른다. 시장 수요 배율도 같은 규칙(같은 사건 한 번 · 0.70~1.30).
 * - 난수는 학급 시드 + 월 번호로 만든 결정적 수열이다(`Math.random` 을 쓰지 않는다).
 */
import type {
  ActiveEffectView,
  ClassId,
  GmEventOption,
  MacroEventView,
  SessionPhase,
  TeamId,
} from '@crista/shared-types';
import {
  AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS,
  AUTO_EVENT_OUT_OF_CLASS_WINDOW_REAL_HOURS,
  GAME_DAYS_PER_MONTH,
  combineCostMultipliers,
  formatMillions,
  millionsToCents,
  rollAutoEvent,
  type AutoEventSkipReason,
  type Cents,
  type MacroEventCatalog,
  type MacroEventEntry,
  type MacroEventRule,
  type PaidWorkKind,
  type UpkeepScope,
} from './economy.ts';

const MS_PER_HOUR = 3_600_000;

// ─────────────────────────────── 구현 판정 ───────────────────────────────

/**
 * 이 규칙의 효과가 실제로 적용되는가 — cash · upkeep · researchCost(범위에 'docking' 포함) · marketDemand(M4) ·
 * clinicalCost · reviewCost(M5 — 신약 파이프라인 임상 · 심사 신청 비용과 심사 기간)는 true.
 * 합성 · ADMET 만 건드리는 연구비 사건은 아직 false.
 */
export function isRuleImplemented(rule: MacroEventRule): boolean {
  switch (rule.kind) {
    case 'cash':
    case 'upkeep':
    case 'marketDemand':
    case 'clinicalCost':
    case 'reviewCost':
      return true;
    case 'researchCost':
      return rule.scope.includes('docking');
    default:
      return false;
  }
}

/** 카탈로그에서 효과가 구현된 사건(카탈로그 순서). 자동 추첨 풀 · 교사 실행 가능 목록. */
export function implementedEvents(catalog: MacroEventCatalog): MacroEventEntry[] {
  return catalog.events.filter((e) => isRuleImplemented(e.rule));
}

/** 효과가 구현된 사건 id(카탈로그 순서) — M3 의 7건 + 시장 수요 2건(M4) + 임상 · 심사 2건(M5) = 11건. */
export function implementedEventIds(catalog: MacroEventCatalog): string[] {
  return implementedEvents(catalog).map((e) => e.id);
}

/** 카탈로그 항목 → 표시용 `MacroEventView`(규칙 칸을 뺀 문구). */
export function macroEventView(entry: MacroEventEntry): MacroEventView {
  return {
    id: entry.id,
    tone: entry.tone,
    headline: entry.headline,
    subhead: entry.subhead,
    kicker: entry.kicker,
    body: entry.body,
    period: entry.period,
    effect: entry.effect,
  };
}

/** 교사 화면의 사건 선택지(`GmEventOption`) — 문구 + implemented + 규칙 요약. */
export function gmEventOptions(catalog: MacroEventCatalog): GmEventOption[] {
  return catalog.events.map((e) => ({
    ...macroEventView(e),
    implemented: isRuleImplemented(e.rule),
    ruleSummary: ruleSummary(e.rule),
  }));
}

/** 일회성 지급액(센트) — cash 규칙만(카탈로그 amount 는 $M 단위). 그 밖은 0. */
export function eventCashCents(rule: MacroEventRule): Cents {
  return rule.kind === 'cash' ? millionsToCents(rule.amount) : 0;
}

/** 지속 효과 길이(게임 일) — 규칙의 months(없으면 균형안 §5 기본 3게임 월) × 30. cash 는 null(일회성). */
export function effectDurationDays(rule: MacroEventRule): number | null {
  if (rule.kind === 'cash') return null;
  const months = 'months' in rule ? rule.months : AUTO_EVENT_DEFAULT_DURATION_GAME_MONTHS;
  return months * GAME_DAYS_PER_MONTH;
}

function fmtMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}

/** 사람이 읽는 규칙 한 줄 — 'upkeep facility ×1.20 · 3게임 월' · 'cash +$0.250M · 1회'. */
export function ruleSummary(rule: MacroEventRule): string {
  switch (rule.kind) {
    case 'cash':
      return `cash +${formatMillions(eventCashCents(rule))} · 1회`;
    case 'upkeep':
    case 'researchCost':
      return `${rule.kind} ${rule.scope.join('·')} ${fmtMult(rule.mult)} · ${rule.months}게임 월`;
    case 'marketDemand':
    case 'clinicalCost':
      return `${rule.kind} ${fmtMult(rule.mult)} · ${rule.months}게임 월`;
    case 'reviewCost':
      return `reviewCost 비용 ${fmtMult(rule.mult)} · 기간 ${fmtMult(rule.durationMult)} · ${rule.months}게임 월`;
    default:
      return 'unknown';
  }
}

// ─────────────────────────────── 발생 기록 ───────────────────────────────

/** 이벤트 발생 한 건 — 스키마 `class_events` 와 1:1(규칙은 적용 시점의 사본). */
export interface EventInstance {
  /** `auto:<classId>:m<k>` · `gm:<classId>:<requestId>`. */
  readonly instanceId: string;
  /** 카탈로그 id. */
  readonly eventId: string;
  readonly origin: 'auto' | 'teacher';
  /** 'all' = 학급의 운영 중인 모든 회사. */
  readonly targets: 'all' | readonly TeamId[];
  readonly rule: MacroEventRule;
  /** 적용 시작 게임 일(포함). */
  readonly startDay: number;
  /** 적용 끝 게임 일(배타). 일회성 지급(cash)은 null. */
  readonly endDay: number | null;
  readonly headline: string;
  readonly effect: string;
}

/** 자동 이벤트 발생 id — `auto:<classId>:m<k>`. */
export function autoEventInstanceId(classId: ClassId, monthIndex: number): string {
  return `auto:${classId}:m${monthIndex}`;
}

/** 교사 실행 이벤트 발생 id — `gm:<classId>:<requestId>`. */
export function teacherEventInstanceId(classId: ClassId, requestId: string): string {
  return `gm:${classId}:${requestId}`;
}

function instanceOf(
  instanceId: string,
  origin: 'auto' | 'teacher',
  event: MacroEventEntry,
  targets: 'all' | readonly TeamId[],
  startDay: number,
): EventInstance {
  const duration = effectDurationDays(event.rule);
  return {
    instanceId,
    eventId: event.id,
    origin,
    targets: targets === 'all' ? 'all' : [...targets],
    rule: event.rule,
    startDay,
    endDay: duration === null ? null : startDay + duration,
    headline: event.headline,
    effect: event.effect,
  };
}

/** 자동 이벤트 발생 기록 — 월 경계 k(게임 일 30k)에서 시작, 대상 'all', 지속 효과는 90게임 일. */
export function autoEventInstance(input: {
  readonly classId: ClassId;
  readonly monthIndex: number;
  readonly event: MacroEventEntry;
}): EventInstance {
  return instanceOf(
    autoEventInstanceId(input.classId, input.monthIndex),
    'auto',
    input.event,
    'all',
    input.monthIndex * GAME_DAYS_PER_MONTH,
  );
}

/** 교사 실행 이벤트 발생 기록 — 지금 게임 일(소수)에서 시작, 대상은 교사가 고른 것. */
export function teacherEventInstance(input: {
  readonly classId: ClassId;
  readonly requestId: string;
  readonly event: MacroEventEntry;
  readonly targets: 'all' | readonly TeamId[];
  readonly nowGameDays: number;
}): EventInstance {
  return instanceOf(
    teacherEventInstanceId(input.classId, input.requestId),
    'teacher',
    input.event,
    input.targets,
    input.nowGameDays,
  );
}

/** 이 발생이 그 팀을 대상으로 하는가. teamId 가 null 이면(학급 전체 보기) 항상 true. */
export function eventTargetsTeam(instance: EventInstance, teamId: TeamId | null): boolean {
  if (teamId === null || instance.targets === 'all') return true;
  return instance.targets.includes(teamId);
}

/** 지속 효과가 그 날(게임 일, 정산이면 날 번호 d)에 적용 중인가 — startDay ≤ day < endDay. cash 는 false. */
export function isEffectActiveOn(instance: EventInstance, day: number): boolean {
  return instance.endDay !== null && instance.startDay <= day && day < instance.endDay;
}

// ─────────────────────────────── 배율 ───────────────────────────────

export interface CostMultipliers {
  /** 유지비 항목별 배율(0.70~1.30) — `teamUpkeep({ multipliers })` 에 그대로 넣는다. */
  readonly upkeep: { readonly facility: number; readonly rent: number; readonly staff: number };
  /** 유료 작업 비용 배율(0.70~1.30) — M3 는 docking 만 쓴다(`paidWorkCostCents(kind, { eventMultiplier })`). */
  readonly research: { readonly htvs: number; readonly docking: number; readonly admet: number };
  /** (M5) 임상 1 · 2 · 3상 비용 배율(0.70~1.30) — `clinicalCost`(예: trial-recruit ×0.85). */
  readonly clinical: number;
  /** (M5) FDA 심사(IND · 최종 허가) 비용 배율(0.70~1.30) — `reviewCost.mult`(예: regulation ×1.10). 특허청 출원은 받지 않는다. */
  readonly review: number;
  /** (M5) FDA 심사 기간 배율(0.70~1.30) — `reviewCost.durationMult`(예: regulation ×1.25). */
  readonly reviewDuration: number;
}

/**
 * 그 날 그 팀에 적용 중인 비용 배율(유지비 · 연구비 · (M5) 임상 · 심사 비용 · 심사 기간) — 지속 효과(startDay ≤ day < endDay) · 대상('all' 또는 팀 포함)만,
 * **같은 eventId 는 한 번만** 곱하고, 항목마다 0.70~1.30 으로 자른다. cash 는 배율이 아니라서 무시한다.
 * 유지비 정산이면 day = 날 번호 d(구간 [d, d+1) 의 시작), 연구비 · 임상 · 심사 견적이면 지금(신청 시점) 게임 일.
 */
export function costMultipliersAt(
  instances: readonly EventInstance[],
  teamId: TeamId | null,
  day: number,
): CostMultipliers {
  const seen = new Set<string>();
  const upkeep: Record<UpkeepScope, number[]> = { facility: [], rent: [], staff: [] };
  const research: Record<PaidWorkKind, number[]> = { htvs: [], docking: [], admet: [] };
  const clinical: number[] = [];
  const review: number[] = [];
  const reviewDuration: number[] = [];
  for (const inst of instances) {
    if (!isEffectActiveOn(inst, day) || !eventTargetsTeam(inst, teamId)) continue;
    const rule = inst.rule;
    if (rule.kind !== 'upkeep' && rule.kind !== 'researchCost' && rule.kind !== 'clinicalCost' && rule.kind !== 'reviewCost') continue;
    if (seen.has(inst.eventId)) continue;
    seen.add(inst.eventId);
    if (rule.kind === 'upkeep') {
      for (const s of new Set(rule.scope)) upkeep[s]?.push(rule.mult);
    } else if (rule.kind === 'researchCost') {
      for (const s of new Set(rule.scope)) research[s]?.push(rule.mult);
    } else if (rule.kind === 'clinicalCost') {
      clinical.push(rule.mult);
    } else {
      review.push(rule.mult);
      reviewDuration.push(rule.durationMult);
    }
  }
  const c = (list: number[]) => combineCostMultipliers(list).value;
  return {
    upkeep: { facility: c(upkeep.facility), rent: c(upkeep.rent), staff: c(upkeep.staff) },
    research: { htvs: c(research.htvs), docking: c(research.docking), admet: c(research.admet) },
    clinical: c(clinical),
    review: c(review),
    reviewDuration: c(reviewDuration),
  };
}

/**
 * 그 날 그 팀에 적용 중인 **시장 수요 배율 M**(균형안 §9.2 · M4 브리프 §5.2) — `marketDemand` 지속 효과만,
 * 같은 eventId 는 한 번만 곱하고(매 틱 누적하지 않는다 — 균형안 §5), 서로 다른 사건의 곱을 0.70~1.30 으로 자른다.
 * 적용 중인 사건이 없으면 1. 대상은 이벤트 대상 회사('all' 이면 모두). teamId 가 null 이면 대상과 무관하게 모든 사건을 본다.
 */
export function demandMultiplierAt(instances: readonly EventInstance[], teamId: TeamId | null, day: number): number {
  const seen = new Set<string>();
  const mults: number[] = [];
  for (const inst of instances) {
    if (inst.rule.kind !== 'marketDemand') continue;
    if (!isEffectActiveOn(inst, day) || !eventTargetsTeam(inst, teamId)) continue;
    if (seen.has(inst.eventId)) continue;
    seen.add(inst.eventId);
    mults.push(inst.rule.mult);
  }
  return combineCostMultipliers(mults).value;
}

/**
 * 그 날 그 팀에 적용 중인 효과 목록(`ActiveEffectView`) — 같은 eventId 는 가장 늦게 끝나는 발생 하나만.
 * teamId 가 null 이면 학급 전체(교사 화면 `GmClassState.effects`). 시작일 → instanceId 순.
 */
export function activeEffectsAt(
  instances: readonly EventInstance[],
  teamId: TeamId | null,
  day: number,
): ActiveEffectView[] {
  const byEvent = new Map<string, EventInstance>();
  for (const inst of instances) {
    if (!isEffectActiveOn(inst, day) || !eventTargetsTeam(inst, teamId)) continue;
    const prev = byEvent.get(inst.eventId);
    if (prev === undefined || (inst.endDay ?? 0) > (prev.endDay ?? 0)) byEvent.set(inst.eventId, inst);
  }
  return [...byEvent.values()]
    .sort((a, b) => a.startDay - b.startDay || a.instanceId.localeCompare(b.instanceId))
    .map((inst) => {
      const rule = inst.rule;
      const view: ActiveEffectView = {
        instanceId: inst.instanceId,
        eventId: inst.eventId,
        origin: inst.origin,
        headline: inst.headline,
        effect: inst.effect,
        kind: rule.kind,
        scope: 'scope' in rule ? [...rule.scope] : [],
        startDay: inst.startDay,
        endDay: inst.endDay ?? inst.startDay,
      };
      if ('mult' in rule) view.mult = rule.mult;
      return view;
    });
}

// ─────────────────────────────── 결정적 난수 ───────────────────────────────

/** 32비트 문자열 해시(xmur3 계열) — 시드 문자열 → 32비트 정수. */
function hash32(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * 학급 시드 + 월 번호 → 결정적 난수 생성기(mulberry32, [0, 1)). 같은 입력이면 같은 수열.
 * 시드는 `classes.rng_seed`(bigint, 2^52 미만 — JS number 로 정확) 또는 문자열.
 */
export function eventRandom(seed: number | string | bigint, monthIndex: number): () => number {
  let a = hash32(`crista-events:${String(seed)}:m${monthIndex}`);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────── 월 경계 1회 처리 ───────────────────────────────

/** 자동 이벤트 상한 근거 — 스키마 `class_clocks` 의 같은 이름 칸. */
export interface AutoEventCounters {
  /** 마지막 자동 이벤트가 난 월 번호. */
  readonly lastAutoEventMonth: number | null;
  /** autoEventsInSession 이 세는 수업 세션 번호. */
  readonly autoEventSessionSeq: number;
  /** 그 세션에서 난 자동 이벤트 수. */
  readonly autoEventsInSession: number;
  /** 마지막 **수업 밖** 자동 이벤트 때의 학급 운영 시간(ms). */
  readonly lastOocAutoEventOperatingMs: number | null;
}

export const EMPTY_AUTO_EVENT_COUNTERS: AutoEventCounters = {
  lastAutoEventMonth: null,
  autoEventSessionSeq: 0,
  autoEventsInSession: 0,
  lastOocAutoEventOperatingMs: null,
};

export interface MonthBoundaryResult {
  readonly drawn: boolean;
  /** 'drawn' 이 아니면 건너뛴 사유. 'emptyPool' = 당첨됐지만 구현된 사건이 없다. */
  readonly reason: AutoEventSkipReason | 'drawn' | 'emptyPool';
  /** 당첨이면 고른 사건. */
  readonly event?: MacroEventEntry;
  /** 다음 경계에 넘길 카운터(당첨일 때만 바뀐다). */
  readonly counters: AutoEventCounters;
}

/**
 * 게임 월 경계 k(게임 일 30k) 1회의 자동 이벤트 처리 — 브리프 §4.5 ②③.
 * 입력 phase · operatingMs · sessionSeq 는 `locateGameDay(state, 30k, now)` 로 되짚은 **경계 시점** 값이다.
 * 상한: 마지막 자동 이벤트 이후 2게임 월 미만이면 건너뜀 → 수업 중이면 그 세션의 자동 이벤트 2개 이하 →
 * 수업 밖이면 마지막 수업 밖 자동 이벤트 이후 72운영시간 이상. 그다음 `eventRandom(seed, k)` 로 15% 추첨,
 * 당첨이면 같은 난수로 pool(구현된 것만 남긴다)에서 하나를 고른다.
 * 여러 경계를 한꺼번에 처리하면 k 오름차순으로 부르고 반환 counters 를 다음 호출에 넘긴다.
 * (일시정지 중에는 게임 일이 늘지 않아 경계가 생기지 않는다.)
 */
export function processMonthBoundary(input: {
  readonly monthIndex: number;
  readonly phase: SessionPhase;
  readonly operatingMs: number;
  readonly sessionSeq: number | null;
  readonly counters: AutoEventCounters;
  readonly seed: number | string | bigint;
  readonly pool: readonly MacroEventEntry[];
}): MonthBoundaryResult {
  const { monthIndex, phase, operatingMs, counters } = input;
  const seq = input.sessionSeq ?? 0;
  const windowMs = AUTO_EVENT_OUT_OF_CLASS_WINDOW_REAL_HOURS * MS_PER_HOUR;
  const random = eventRandom(input.seed, monthIndex);
  const roll = rollAutoEvent(
    {
      paused: false,
      phase,
      gameMonthsSinceLastEvent:
        counters.lastAutoEventMonth === null ? Number.POSITIVE_INFINITY : monthIndex - counters.lastAutoEventMonth,
      eventsThisSession:
        phase === 'inClass' && counters.autoEventSessionSeq === seq ? counters.autoEventsInSession : 0,
      eventsInOutOfClassWindow:
        counters.lastOocAutoEventOperatingMs !== null && operatingMs - counters.lastOocAutoEventOperatingMs < windowMs
          ? 1
          : 0,
    },
    random,
  );
  if (!roll.drawn) return { drawn: false, reason: roll.reason, counters };
  const pool = input.pool.filter((e) => isRuleImplemented(e.rule));
  if (pool.length === 0) return { drawn: false, reason: 'emptyPool', counters };
  const event = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
  const next: AutoEventCounters =
    phase === 'inClass'
      ? {
          ...counters,
          lastAutoEventMonth: monthIndex,
          autoEventSessionSeq: seq,
          autoEventsInSession: counters.autoEventSessionSeq === seq ? counters.autoEventsInSession + 1 : 1,
        }
      : { ...counters, lastAutoEventMonth: monthIndex, lastOocAutoEventOperatingMs: operatingMs };
  return { drawn: true, reason: 'drawn', event, counters: next };
}
