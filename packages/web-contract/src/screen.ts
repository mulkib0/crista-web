/**
 * 1.2 모둠 기준 회의 · 분자 쇼핑 규격(설계 §5.5 · §5.5.1 · §7.3 '1.2 기준 회의' · §7.4 ②⑥⑦⑧ · W7) — 기능 F12.
 *
 * 여기 있는 것
 * - 안건 6개 · 값 범위(DB `web.screen_agenda_value_ok` 와 같음) · 정족수 · 찜 칸 상한.
 * - 표적 미션 `SCREEN_MISSIONS`(지금 워커에 있는 4 표적 — 이야기 · 브리핑 정답 · 실제 약 · 조언값 · '내가 심사관' 카드 8장).
 * - 깔때기 엔진 `screenFunnel`(남은 분자 · 아는 약 계열 k/K · 농축도 · 상위 10) — **브라우저 미리보기 · 서버 실행 스냅숏이 같은 함수**를 쓴다.
 * - 코치 규칙(제안 · 찬성 근거 ↔ 값, 미리보기 `screening-pipeline.js` 의 `AG[].reasons[].check`)과 찜 근거 재판정(`CLAIM_R`).
 *   회의 코치는 경고만(막지 않는다), 찜 근거의 `no` 는 막음(서버도 같은 함수로 400 `reason_blocked`).
 * - 학생에게 보이는 문구는 모두 `SCREEN_COPY` 한곳에(§5.12 — Gemini 4 Argon (High) 초안을 검토해 반영 · 2026-10-24).
 *   식별자 · 숫자 · 규칙 값은 그 밖(`SCREEN_LIMITS_COACH` 등)에 둔다. 문구의 `{v}` 같은 자리표시자는 `screenFill` 가 채운다.
 *
 * 표: web.screen_briefing · screen_agendas · screen_proposals · screen_votes · claims.reason(0005) · jobs(1.2 실행 스냅숏 = result.snapshot).
 * WS: 모둠 'screen.changed'(reason · agenda?) — 회의 칸이 바뀌면 화면이 `GET /api/screen` 을 다시 읽는다.
 * 공개 범위(§5.3): 이 파일의 응답(후보 SMILES · 물성 · 점수 · 근거)은 그 모둠과 교사만 — 학급 채널 · 전광판에 싣지 않는다.
 * 1.2 화합물 응답에는 사전 Vina 값을 싣지 않는다(§5.5.1) — `ScreenCompound` 에 그 칸이 없다.
 */
import { formatCrista } from './money.ts';
import type { Avatar } from './rules.ts';

// ── 안건 ──

/** 회의 안건 6개 — 깔때기 순서 = 이 순서(DB check 와 같음). */
export type ScreenAgenda = 'mw' | 'tpsa' | 'ro5' | 'alert' | 'qed' | 'score';
export const SCREEN_AGENDAS: readonly ScreenAgenda[] = ['mw', 'tpsa', 'ro5', 'alert', 'qed', 'score'];

/**
 * 안건 값 범위(§5.5 표) — DB 함수 `web.screen_agenda_value_ok` 와 같다. alert 는 1 = 구조 경고 분자 빼기 · 0 = 허용.
 * ro5 2 는 crista 워커 `/datasets/compounds` 의 `ro5Max` 가 생기기 전까지 서버가 0 · 1 만 받는다(설계 §12-6 · `SCREEN_RO5_VALUES_NOW`).
 */
export const SCREEN_AGENDA_RANGE: Record<ScreenAgenda, { min: number; max: number; step: number }> = {
  mw: { min: 250, max: 650, step: 10 },
  tpsa: { min: 40, max: 180, step: 5 },
  ro5: { min: 0, max: 2, step: 1 },
  alert: { min: 0, max: 1, step: 1 },
  qed: { min: 0, max: 0.9, step: 0.05 },
  score: { min: 0, max: 0.9, step: 0.05 },
};

/** 문턱 방향 — 'max' = 값 ≤ 문턱이 남음, 'min' = 값 ≥ 문턱이 남음, 'flag' = 구조 경고(1 이면 경고 있는 분자를 뺀다). */
export const SCREEN_AGENDA_DIR: Record<ScreenAgenda, 'max' | 'min' | 'flag'> = { mw: 'max', tpsa: 'max', ro5: 'max', alert: 'flag', qed: 'min', score: 'min' };

/** 값이 그 안건의 범위 · 눈금에 맞나(DB 와 같은 규칙). */
export function screenAgendaValueOk(agenda: ScreenAgenda, value: number): boolean {
  const r = SCREEN_AGENDA_RANGE[agenda];
  if (!Number.isFinite(value) || value < r.min - 1e-9 || value > r.max + 1e-9) return false;
  const steps = (value - r.min) / r.step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

/**
 * 지금 서버가 받는 Ro5 값(설계 §12-6) — 워커 `/datasets/compounds` 는 `ro5Only`(위반 0 · 1)만 받고 위반 2개 이상인 분자를 돌려주지 않는다.
 * 그래서 Ro5 안건은 0 · 1 두 값만 둔다(DB 는 2 까지 받는다 — 워커가 `ro5Max` 를 받게 되면 여기에 2 를 더한다).
 */
export const SCREEN_RO5_VALUES_NOW: readonly number[] = [0, 1];

/** 지금 제안 · 실행에 쓸 수 있는 값인가 — DB 범위 + Ro5 0 · 1. */
export function screenValueAllowed(agenda: ScreenAgenda, value: number): boolean {
  if (!screenAgendaValueOk(agenda, value)) return false;
  return agenda !== 'ro5' || SCREEN_RO5_VALUES_NOW.includes(value);
}

/** 눈금에 맞춰 반올림하고 범위로 자른다(울타리 값 가져오기 · 빠른 시작). */
export function screenSnap(agenda: ScreenAgenda, raw: number, dir: 'down' | 'up' | 'near' = 'near'): number {
  const r = SCREEN_AGENDA_RANGE[agenda];
  const steps = (raw - r.min) / r.step;
  const k = dir === 'down' ? Math.floor(steps + 1e-9) : dir === 'up' ? Math.ceil(steps - 1e-9) : Math.round(steps);
  const v = r.min + Math.max(0, Math.min(Math.round((r.max - r.min) / r.step), k)) * r.step;
  return Math.round(v * 100) / 100;
}

/** ① 브리핑 질문(cns · dur · route) + 읽음 표시. */
export type BriefingQuestion = 'cns' | 'dur' | 'route' | 'read';
export const BRIEFING_QUESTIONS: readonly BriefingQuestion[] = ['cns', 'dur', 'route', 'read'];
/** 질문마다 고를 수 있는 답(읽음은 '1'). DB 는 1~200자 글로 받는다 — 서버가 이 목록으로 거른다. */
export const BRIEFING_OPTIONS: Record<BriefingQuestion, readonly string[]> = {
  cns: ['must', 'nice', 'no'],
  dur: ['days', 'years', 'life'],
  route: ['oral', 'inj', 'skin'],
  read: ['1'],
};

/** 정족수 — 지금 모둠 인원 n 의 과반(4명 3표 · 3명 2표 · 2명 2표). */
export const screenQuorum = (members: number): number => Math.floor(members / 2) + 1;

/** 찜 — 1인 2개(claims.slot 1 · 2). 0005 전의 찜은 근거 키 'legacy'. */
export const CLAIMS_PER_PERSON = 2;
export const LEGACY_REASON = 'legacy';

// ── 규칙 값(문구 밖) ──

/** 승인약 라이브러리 이름(워커 자료의 `library` 값 그대로). */
export const APPROVED_LIBRARY = 'ChEMBL 승인약';

/** ③ 판정 구간 — 0 · 1~7 · 8~40 · 41~(설계 §5.5). */
export const SCREEN_BANDS = { fewBelow: 8, goodMax: 40 } as const;
export type ScreenVerdict = 'zero' | 'few' | 'good' | 'many';
export const screenVerdict = (n: number): ScreenVerdict => (n <= 0 ? 'zero' : n < SCREEN_BANDS.fewBelow ? 'few' : n <= SCREEN_BANDS.goodMax ? 'good' : 'many');

/** 공통 점수판 '상위 N 중 아는 약 계열'의 N · 진열대 한 쪽 수 · '놓친 걸까요?' 수. */
export const SCREEN_TOP_N = 10;
export const SHELF_PAGE = 12;
export const SCREEN_MISSED_N = 3;

/** 코치 규칙의 문턱(미리보기 `AG[].reasons[].check` · `CLAIM_R` 그대로). */
export const SCREEN_COACH_LIMITS = {
  gutMw: 500,
  bbbMw: 450,
  gutTpsa: 140,
  bbbTpsa: 90,
  qedLike: 0.3,
  qedBind: 0.6,
  scoreStrong: 0.4,
  scoreGrow: 0.6,
  /** 찜 근거 */
  claimTopRank: 10,
  claimQed: 0.6,
  claimMw: 400,
} as const;

/** 진열대 필터 문턱 · 05 표의 '교과서 기준'(넘으면 빨강 + !). 참고 지표(cLogP · HBD · HBA · RotB)는 보기만 한다(§5.5.1). */
export const SHOP_FILTER_LIMITS = { bbbTpsa: 90, qedHigh: 0.67 } as const;
export const TEXTBOOK_LIMITS = { mw: 500, tpsa: 140, clogp: 5, hbd: 5, hba: 10, rotb: 10, qedMin: 0.3 } as const;

// ── 화합물 · 깔때기 ──

/** 1.2 화면용 화합물 한 개 — 사전 Vina 값은 싣지 않는다(§5.5.1). `score` 는 지금 표적의 스크리닝 점수(0~1). */
export interface ScreenCompound {
  id: string;
  name: string;
  smiles: string;
  library: string;
  mw: number;
  tpsa: number;
  clogp: number;
  hbd: number;
  hba: number;
  rotb: number;
  qed: number;
  /** 리핀스키 위반 수. */
  ro5: number;
  /** 구조 경고 키(aromatic_amine · nitro_aromatic …). */
  alerts: string[];
  score: number;
  /** 아는 약 계열(`knownActiveIds` — 자료의 targetId 가 지금 표적). 판정 · 연구비에 쓰지 않는 학습용 잣대. */
  known: boolean;
  mechanism: string | null;
}

/** `GET /api/screen/compounds` — 표적 하나의 라이브러리(무료 · 브라우저 계산용). */
export interface ScreenDatasetResponse {
  targetId: string;
  /** 라이브러리 전체 수(워커 `stats.total`). */
  total: number;
  /** 워커가 보여 주지 않는 분자 수(Ro5 위반 2개 이상 — §12-6). Ro5 관문에서 늘 빠진 것으로 센다. */
  hidden: number;
  compounds: ScreenCompound[];
}

export type ScreenCriteria = Record<ScreenAgenda, number>;
/** 미정 안건은 빼고 넘긴다(미정 = 거르지 않음). */
export type ScreenCriteriaPartial = Partial<ScreenCriteria>;

export function screenPass(agenda: ScreenAgenda, c: ScreenCompound, v: number): boolean {
  switch (agenda) {
    case 'mw':
      return c.mw <= v + 1e-9;
    case 'tpsa':
      return c.tpsa <= v + 1e-9;
    case 'ro5':
      return c.ro5 <= v;
    case 'alert':
      return v < 1 || c.alerts.length === 0;
    case 'qed':
      return c.qed >= v - 1e-9;
    case 'score':
      return c.score >= v - 1e-9;
  }
}

/** 이 분자가 처음 걸리는 안건(깔때기 순서). 모두 통과면 null. */
export function screenFirstFail(c: ScreenCompound, crit: ScreenCriteriaPartial): ScreenAgenda | null {
  for (const a of SCREEN_AGENDAS) {
    const v = crit[a];
    if (v !== undefined && !screenPass(a, c, v)) return a;
  }
  return null;
}

/** 이 분자가 걸리는 모든 안건(04 '내가 심사관' 판정). */
export function screenFails(c: ScreenCompound, crit: ScreenCriteriaPartial): ScreenAgenda[] {
  return SCREEN_AGENDAS.filter((a) => crit[a] !== undefined && !screenPass(a, c, crit[a]!));
}

export interface ScreenFunnelStep {
  agenda: ScreenAgenda;
  /** null = 미정(거르지 않음). */
  value: number | null;
  /** 이 관문을 지나 남은 수(숨은 분자 포함 기준 — 숨은 분자는 Ro5 관문에서 빠진다). */
  left: number;
  removed: number;
  knownLeft: number;
  knownRemoved: number;
  /** 이 관문에서 버린 아는 약 계열 id. */
  knownRemovedIds: string[];
}

export interface ScreenFunnel {
  total: number;
  hidden: number;
  steps: ScreenFunnelStep[];
  final: number;
  /** 통과 id — 표적 점수 높은 순(같으면 id 순). 진열대 순위 = 이 순서. */
  passIds: string[];
  knownTotal: number;
  knownLeft: number;
  /** 농축도 `(k / n) ÷ (K / total)` — 남은 게 없으면 0. */
  enrichment: number;
  /** 점수 상위 N(`SCREEN_TOP_N`) id 와 그 안의 아는 약 계열 수. */
  topIds: string[];
  topKnown: number;
}

const byScore = (a: ScreenCompound, b: ScreenCompound) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * 깔때기 — 안건 순서대로 거른다. 미정 안건은 거르지 않는다. 브라우저(점수판 · 깔때기 띠 · 미리보기)와 서버(실행 스냅숏)가 같은 함수.
 * 숨은 분자(`ds.hidden`, Ro5 위반 2개 이상)는 물성을 모르므로 Ro5 관문에서 늘 빠진 것으로 센다(값이 0 · 1 뿐이라 실제로도 빠진다).
 */
export function screenFunnel(ds: Pick<ScreenDatasetResponse, 'total' | 'hidden' | 'compounds'>, crit: ScreenCriteriaPartial, topN = SCREEN_TOP_N): ScreenFunnel {
  let alive = ds.compounds;
  let hidden = ds.hidden;
  const knownTotal = ds.compounds.filter((c) => c.known).length;
  const steps: ScreenFunnelStep[] = [];
  for (const a of SCREEN_AGENDAS) {
    const v = crit[a];
    const before = alive.length + hidden;
    const knownBefore = alive.filter((c) => c.known).length;
    const removedKnown: string[] = [];
    if (v !== undefined) {
      alive = alive.filter((c) => {
        const ok = screenPass(a, c, v);
        if (!ok && c.known) removedKnown.push(c.id);
        return ok;
      });
    }
    if (a === 'ro5') hidden = 0;
    const left = alive.length + hidden;
    const knownLeft = alive.filter((c) => c.known).length;
    steps.push({ agenda: a, value: v ?? null, left, removed: before - left, knownLeft, knownRemoved: knownBefore - knownLeft, knownRemovedIds: removedKnown });
  }
  const ranked = alive.slice().sort(byScore);
  const knownLeft = ranked.filter((c) => c.known).length;
  const top = ranked.slice(0, topN);
  const final = ranked.length;
  return {
    total: ds.total,
    hidden: ds.hidden,
    steps,
    final,
    passIds: ranked.map((c) => c.id),
    knownTotal,
    knownLeft,
    enrichment: final && knownTotal ? knownLeft / final / (knownTotal / ds.total) : 0,
    topIds: top.map((c) => c.id),
    topKnown: top.filter((c) => c.known).length,
  };
}

/** '걸러진 분자 중 표적 점수가 높았던 3개 — 놓친 걸까요?' — 어느 안건에서 걸렸는지와 함께. */
export function screenMissed(ds: Pick<ScreenDatasetResponse, 'compounds'>, crit: ScreenCriteriaPartial, passIds: readonly string[], k = SCREEN_MISSED_N): Array<{ id: string; failedAt: ScreenAgenda }> {
  const pass = new Set(passIds);
  const out: Array<{ id: string; failedAt: ScreenAgenda }> = [];
  for (const c of ds.compounds.slice().sort(byScore)) {
    if (pass.has(c.id)) continue;
    const failedAt = screenFirstFail(c, crit);
    if (failedAt) out.push({ id: c.id, failedAt });
    if (out.length >= k) break;
  }
  return out;
}

/** 가장 많이 걸러 낸 안건(같으면 깔때기 앞쪽). */
export function screenBiggestCut(f: ScreenFunnel): ScreenFunnelStep | null {
  return f.steps.reduce<ScreenFunnelStep | null>((best, s) => (s.removed > (best?.removed ?? 0) ? s : best), null);
}

/** 미션 조언값을 안건 값으로(코치 · 상세 서랍 '미션 조언' 칩 · 04 판정 · 01 빠른 시작). 합의를 강제하지 않는다. */
export function adviceCriteria(m: ScreenMission): ScreenCriteria {
  return { mw: m.advice.mwMax, tpsa: m.advice.tpsaMax, ro5: m.advice.ro5Max, alert: m.advice.noAlerts ? 1 : 0, qed: m.advice.qedMin, score: m.advice.scoreMin };
}

// ── 실행 스냅숏(jobs.params.snapshot → 성공하면 result.snapshot · §7.3 '1.2 실행 기록') ──

export interface ScreenRunSnapshot {
  kind: 'screen';
  version: 1;
  criteria: ScreenCriteria;
  /** 실행 때 안건별 round(다시 논의 횟수 + 1). */
  rounds: Record<ScreenAgenda, number>;
  total: number;
  hidden: number;
  steps: ScreenFunnelStep[];
  final: number;
  passIds: string[];
  knownTotal: number;
  knownLeft: number;
  enrichment: number;
  topKnown: number;
  verdict: ScreenVerdict;
  missed: Array<{ id: string; failedAt: ScreenAgenda }>;
}

// ── 미션(학습 문구 — crista 규칙 값이 아니다, §5.5) ──

export type MissionCns = 'must' | 'nice' | 'no';
export type MissionDur = 'days' | 'years' | 'life';
export type MissionRoute = 'oral' | 'inj' | 'skin';

export interface ScreenMission {
  targetId: string;
  gene: string;
  disease: string;
  pdbId: string;
  title: string;
  story: string;
  /** 브리핑 정답. */
  cns: MissionCns;
  dur: MissionDur;
  route: MissionRoute;
  /** 이 표적의 실제 약(대조군) — ChEMBL id. 2.1 에 대조군으로 자동으로 붙는다. */
  controlId: string;
  /** 조언값 — 코치 · '미션 조언' 칩에만 쓴다(합의를 강제하지 않는다). */
  advice: { mwMax: number; tpsaMax: number; ro5Max: number; noAlerts: boolean; qedMin: number; scoreMin: number };
  /** '내가 심사관'(04) 카드 8장 — 통과 2 · 규칙이 잡은 위험 2 · 규칙이 놓친 위험 1 · 경계 3. */
  judgeCards: Array<{ compoundId: string; story: string }>;
}

/** 지금 워커에 있는 4 표적(§6.1.1 의 나머지 8종은 워커 자료가 생기면 같은 틀로 더한다). */
export const SCREEN_MISSIONS: Record<string, ScreenMission> = {
  'ache-4ey7': {
    targetId: 'ache-4ey7',
    gene: 'ACHE',
    disease: '알츠하이머병',
    pdbId: '4EY7',
    title: '뇌에 도착해야 하는 알츠하이머 약',
    story:
      '알츠하이머병 환자의 뇌에서는 기억을 전달하는 아세틸콜린이 빨리 분해돼요. 우리 약은 알약으로 먹어서 장에서 흡수되고, 피를 타고 가다가 뇌혈관 장벽(BBB)을 넘어 뇌 속 아세틸콜린에스테라아제(ACHE)를 막아야 해요. 환자는 대부분 노인이고, 증상이 나빠지지 않도록 오랫동안 매일 먹어요.',
    cns: 'must',
    dur: 'life',
    route: 'oral',
    controlId: 'CHEMBL502',
    advice: { mwMax: 450, tpsaMax: 90, ro5Max: 0, noAlerts: true, qedMin: 0.5, scoreMin: 0.5 },
    judgeCards: [
      { compoundId: 'CRX-ACHE-03', story: '우리 사내 합성 유도체예요. 조언 기준을 모두 통과하고, 나중에 리드 후보가 되기 좋은 분자예요.' },
      { compoundId: 'CHEMBL95', story: '실제 첫 알츠하이머 약(타크린)이에요. 방향족 아민 부품 때문에 간 독성이 잦아 지금은 거의 쓰이지 않아요. 구조 경고가 실제 위험을 미리 잡은 예예요.' },
      { compoundId: 'CHEMBL481', story: '항암제(이리노테칸)예요. 이 표적에 도킹하면 220개 중 1위가 나오지만, 분자가 커서 그런 거예요. 큰 분자는 도킹 점수가 부풀기 쉬워요.' },
      { compoundId: 'CHEMBL408', story: '당뇨약(트로글리타존)이에요. 규칙은 모두 통과하지만 실제로는 간 독성으로 시장에서 철수했어요. 규칙이 모든 위험을 잡지는 못해요.' },
      { compoundId: 'CRX-ACHE-05', story: '사내 유도체예요. cLogP 5.01 로 리핀스키 기준을 살짝 넘어요. "위반 1개까지"면 살고 "0개"면 떨어져요.' },
      { compoundId: 'CHEMBL266349', story: '혈액 응고 억제제 후보(멜라가트란)예요. 극성 표면적(TPSA)이 커서 장 흡수가 어려웠어요. 그래서 먹는 약으로 쓰려면 모양을 바꾼 전구약물이 따로 필요했어요.' },
      { compoundId: 'CHEMBL30', story: '위산 억제제(시메티딘)예요. 작고 무난해 보이지만 약다움 점수(QED)가 0.23 으로 낮게 나와요. 점수가 낮아도 실제로 쓰인 약이에요.' },
      { compoundId: 'CHEMBL807', story: '알츠하이머 약(메만틴)이에요. 아주 작고 가벼워요. 표적 점수 기준을 높게 잡으면 실제 약인데도 떨어질 수 있어요.' },
    ],
  },
  'egfr-1m17': {
    targetId: 'egfr-1m17',
    gene: 'EGFR',
    disease: '비소세포폐암',
    pdbId: '1M17',
    title: '폐암 환자가 집에서 먹는 항암 알약',
    story:
      'EGFR 유전자에 변이가 생긴 폐암 세포는 멈추지 않고 자라요. 우리 약은 집에서 매일 먹는 알약으로, 장에서 흡수돼 폐의 암세포에 있는 EGFR 을 막아야 해요. 환자 가운데 일부는 암이 뇌로 퍼져 있어서, 약이 뇌까지 들어가면 더 좋아요.',
    cns: 'nice',
    dur: 'years',
    route: 'oral',
    controlId: 'CHEMBL553',
    advice: { mwMax: 500, tpsaMax: 120, ro5Max: 1, noAlerts: true, qedMin: 0.4, scoreMin: 0.7 },
    judgeCards: [
      { compoundId: 'CRX-EGFR-05', story: '우리 사내 합성 유도체예요. 조언 기준을 모두 통과하고 표적 점수도 높아요.' },
      { compoundId: 'CRX-EGFR-03', story: '작은 퀴나졸린 조각(프래그먼트)이에요. 작지만 표적 점수가 높아서, 키워 나가기 좋은 출발점이에요.' },
      { compoundId: 'CHEMBL58', story: '항암제(미톡산트론)예요. 방향족 아민 부품이 있고 극성 표면적도 매우 커요. 실제로 쌓이면 심장 독성이 생길 수 있어 평생 쓸 수 있는 양에 한도가 있어요.' },
      { compoundId: 'CHEMBL481', story: '항암제(이리노테칸)예요. 분자가 커서(MW 587) 크기 기준에 걸려요. 실제로도 먹는 약이 아니라 주사로 써요.' },
      { compoundId: 'CHEMBL408', story: '당뇨약(트로글리타존)이에요. 규칙은 모두 통과하지만 실제로는 간 독성으로 시장에서 철수했어요. 규칙이 모든 위험을 잡지는 못해요.' },
      { compoundId: 'CHEMBL3353410', story: '실제 3세대 EGFR 약(오시머티닙)이에요. 약다움 점수(QED)가 0.31 이라 QED 기준에 걸리지만, 실제로 승인돼 널리 쓰여요.' },
      { compoundId: 'CHEMBL1173655', story: '실제 2세대 EGFR 약(아파티닙)이에요. 표적 점수가 0.68 로 조언값 0.70 바로 아래라 아깝게 떨어져요.' },
      { compoundId: 'CRX-EGFR-04', story: '사내 유도체예요. cLogP 5.04 로 리핀스키 기준을 살짝 넘어요. "위반 1개까지"면 살고 "0개"면 떨어져요.' },
    ],
  },
  'dpp4-1x70': {
    targetId: 'dpp4-1x70',
    gene: 'DPP4',
    disease: '2형 당뇨병',
    pdbId: '1X70',
    title: '수십 년 매일 먹는 당뇨약',
    story:
      '2형 당뇨병 환자는 혈당을 낮추는 호르몬이 DPP4 효소 때문에 금방 사라져요. 우리 약은 장에서 흡수돼 핏속의 DPP4 를 막아야 해요. 환자는 수십 년 동안 매일 먹기 때문에 아주 작은 독성도 몸에 쌓일 수 있어요.',
    cns: 'no',
    dur: 'life',
    route: 'oral',
    controlId: 'CHEMBL1422',
    advice: { mwMax: 500, tpsaMax: 140, ro5Max: 0, noAlerts: true, qedMin: 0.5, scoreMin: 0.6 },
    judgeCards: [
      { compoundId: 'CRX-DPP4-01', story: '우리 사내 합성 유도체예요. 조언 기준을 모두 통과하고 표적 점수도 가장 높은 편이에요.' },
      { compoundId: 'CRX-DPP4-03', story: '사내 유도체예요. 작고 약다움 점수가 높아 먹는 약으로 흡수되기 좋아 보여요.' },
      { compoundId: 'CHEMBL443', story: '항생제(설파메톡사졸)예요. 방향족 아민 부품이 있어요. 이런 설폰아마이드 약은 드물게 심한 피부 알레르기 반응을 일으킨 일이 있어요.' },
      { compoundId: 'CHEMBL276832', story: '혈압약(하이드랄라진)이에요. 구조 경고 부품이 있고, 오래 먹으면 약물 유발 루푸스 같은 면역 부작용이 생길 수 있어요.' },
      { compoundId: 'CHEMBL472', story: '당뇨약(글리버라이드)이에요. 규칙은 모두 통과하지만 혈당을 너무 낮추는 저혈당 위험이 있어, 특히 노인에게 조심해서 써요. 규칙이 모든 위험을 잡지는 못해요.' },
      { compoundId: 'CHEMBL385517', story: '실제 DPP4 약(삭사글립틴)이에요. 그런데 표적 점수는 0.23 으로 낮아요. 점수 기준만 보면 실제 약을 놓칠 수 있어요.' },
      { compoundId: 'CHEMBL237500', story: '실제 DPP4 약(알로글립틴)이에요. 표적 점수가 0.57 로 조언값 0.60 바로 아래라 아깝게 떨어져요.' },
      { compoundId: 'CHEMBL142703', story: '실제 DPP4 약(빌다글립틴)이에요. 표적 점수가 0.53 이라 조언값에 걸려요. 점수는 참고일 뿐 정답이 아니에요.' },
    ],
  },
  'cox2-3ln1': {
    targetId: 'cox2-3ln1',
    gene: 'PTGS2',
    disease: '류마티스 관절염',
    pdbId: '3LN1',
    title: '위가 덜 아픈 관절염 진통제',
    story:
      '류마티스 관절염 환자의 관절에서는 COX-2 효소가 염증과 통증을 만들어요. 예전 진통제는 위를 지키는 COX-1 까지 막아 위장 출혈이 생겼어요. 우리 약은 알약으로 오래 먹으면서 COX-2 만 골라 막아야 해요.',
    cns: 'no',
    dur: 'years',
    route: 'oral',
    controlId: 'CHEMBL118',
    advice: { mwMax: 500, tpsaMax: 140, ro5Max: 0, noAlerts: true, qedMin: 0.6, scoreMin: 0.4 },
    judgeCards: [
      { compoundId: 'CRX-COX2-03', story: '우리 사내 합성 유도체예요. 조언 기준을 모두 통과하고 표적 점수도 높아요.' },
      { compoundId: 'CRX-COX2-04', story: '사내 유도체예요. 크기가 작아지고 약다움 점수도 높아 무난하게 통과해요.' },
      { compoundId: 'CHEMBL58', story: '항암제(미톡산트론)예요. 방향족 아민 부품이 있고 극성 표면적도 매우 커요. 쌓이면 심장 독성이 생길 수 있어 평생 쓸 수 있는 양에 한도가 있어요.' },
      { compoundId: 'CHEMBL13209', story: '수면제(니트라제팜)예요. 니트로 부품이 있어요. 니트로기는 몸속에서 아민으로 바뀌는데, 구조 경고가 이런 부품을 미리 찾아요.' },
      { compoundId: 'CHEMBL122', story: '실제 COX-2 진통제(로페콕시브)예요. 규칙은 모두 통과하지만, 심근경색 · 뇌졸중 위험이 커진다는 결과가 나와 2004년에 시장에서 철수했어요.' },
      { compoundId: 'CHEMBL6', story: '오래된 소염진통제(인도메타신)예요. COX-1 도 함께 막아요. 표적 점수가 0.35 로 조언값 0.40 바로 아래예요.' },
      { compoundId: 'CHEMBL421', story: '실제 류마티스 관절염에 쓰는 약(설파살라진)이에요. 그런데 방향족 아민 부품이 있고 TPSA 도 141 이라 기준에 걸려요.' },
      { compoundId: 'CHEMBL521', story: '흔한 진통제(이부프로펜)예요. 작고 약다움 점수도 높지만, COX-1 도 막는 약이라 COX-2 표적 점수는 낮아요.' },
    ],
  },
};

export const screenMission = (targetId: string | null | undefined): ScreenMission | null => (targetId ? (SCREEN_MISSIONS[targetId] ?? null) : null);

// ── 문구(설계 §5.12 — Gemini 4 Argon (High) 초안 `.review/2026-10-24-copy-1.2/copy.md` 를 Claude 가 검토해 반영했어요. 자리표시자 {v} · {n} 등은 `screenFill` 가 채워요) ──
// 돈 자리표시자({cost} · {left} · {unit} · {total} 가 돈일 때)는 화면이 `money()`(= `formatCentsAsCrista`)로 단위까지 채워요 — 문구에 '크리스타'를 다시 쓰지 않아요.

export const SCREEN_COPY = {
  steps: {
    brief: '미션 브리핑',
    meet: '모둠 기준 회의',
    run: '스크리닝 실행',
    shop: '분자 쇼핑',
    hand: '넘기기',
  },
  /** 안건 6개 — 이름 · 기호 · 질문 + 02 '무엇인가 · 왜 거르나' 두 줄. */
  agenda: {
    mw: {
      label: '분자 크기',
      sym: 'MW',
      q: '우리 약 분자는 얼마나 작아야 할까요?',
      what: '분자량(MW, 분자를 이루는 원자들의 무게를 모두 더한 값, 단위 Da)이에요.',
      why: '분자가 너무 무거우면 장 벽이나 뇌혈관 장벽(BBB, 피에서 뇌로 물질이 함부로 못 가게 막는 벽)을 지나기 어려워요. 먹는 약은 보통 500 Da 이하, 뇌로 가는 약은 450 Da 이하가 많아요.',
    },
    tpsa: {
      label: '극성',
      sym: 'TPSA',
      q: '물과 친한 겉면(TPSA)은 어디까지 봐줄까요?',
      what: '극성 표면적(TPSA, 분자 겉면 가운데 산소 · 질소처럼 물과 친한 극성 부분의 넓이, 단위 Å²)이에요.',
      why: '세포막은 기름 성질이라 물과 친한 겉면이 넓을수록 통과하기 어려워요. 보통 140 Å² 이하면 장에서 흡수되고, 90 Å² 이하면 뇌혈관 장벽(BBB)도 넘기 쉬워요.',
    },
    ro5: {
      label: '먹는 약 규칙',
      sym: 'Ro5',
      q: '리핀스키 5규칙은 몇 개까지 어겨도 될까요?',
      what: '리핀스키 5규칙(Ro5, 먹는 약이 잘 흡수될지 가늠하는 경험 규칙 네 가지: MW ≤ 500 · cLogP ≤ 5 · 수소결합 주개 ≤ 5 · 수소결합 받개 ≤ 10)을 어긴 개수예요.',
      why: '규칙을 많이 어길수록 먹었을 때 흡수가 어려운 경우가 많아요. 시판 먹는 약은 대부분 0~1개만 어겨요.',
    },
    alert: {
      label: '독성 부품',
      sym: '경고',
      q: '독성이 될 수 있는 부품(구조 경고)이 있는 분자는 뺄까요?',
      what: '구조 경고(간에서 분해될 때 세포나 DNA를 해치는 물질로 바뀔 수 있는 화학 부품)가 있는지예요. 예: 방향족 아민(벤젠 고리에 붙은 NH₂) · 니트로기(NO₂).',
      why: '오래 매일 먹는 약일수록 독성 부품이 있으면 부작용 위험이 커져요. 다만 2.1 단계에서 그 부품만 다른 구조로 고쳐 써 볼 수도 있어요.',
    },
    qed: {
      label: '약다움',
      sym: 'QED',
      q: '약다움(QED)은 몇 점 이상이어야 할까요?',
      what: '약다움 점수(QED, 분자량 · 극성 · 기름 친화도 · 구조 경고 등 8가지 물성이 실제 시판 약들과 얼마나 닮았는지 0~1로 합친 점수)예요.',
      why: '점수가 낮으면 실제 약과 물성 균형이 덜 닮았다는 뜻이에요. 보통 0.5 이상이면 무난하고 0.67 이상이면 높은 편이에요. 하지만 0.5보다 낮은 실제 승인약도 있어요.',
    },
    score: {
      label: '결합 예측',
      sym: '점수',
      q: '{gene} 표적에 잘 붙을 것 같은 분자만 남기려면, 표적 점수를 몇 점 이상으로 할까요?',
      what: '표적 점수(실제 결합 세기가 아니라, 3차원 결합 모양 · 알려진 약과의 닮음 · 약다움을 합쳐 표적에 잘 붙을지 0~1로 계산한 예측 점수)예요.',
      why: '라이브러리 대부분이 약다운 분자라 물성 다섯 개만으로는 후보가 너무 많이 남아요. 표적마다 점수 분포가 다르니 우리 표적의 그래프를 직접 보고 정밀 도킹(2.1)에 보낼 만큼만 추려야 해요.',
    },
  },
  /** 안건 생각할 거리 — mw 는 [공통, 뇌로 가는 약, 뇌로 안 가는 약, 그래프] 중 셋을 `screenAgendaHints` 가 고른다. */
  hints: {
    mw: [
      '알약은 장 벽을 지나야 몸속으로 들어가요. 분자가 너무 크면 흡수가 어떨까요?',
      '뇌로 가야 하는 약이라면 장 벽보다 훨씬 촘촘한 뇌혈관 장벽(BBB)도 넘어야 해요.',
      '우리 약이 뇌까지 갈 필요가 있는지 ① 미션 브리핑을 다시 떠올려 보세요.',
      '분포 그래프에서 문턱선을 움직이면 몇 개가 걸러지고 실제 약이 살아남는지 바로 보여요.',
    ],
    tpsa: [
      '세포막은 기름막이에요. 물과 친한 겉면(TPSA)이 넓으면 기름막을 지나기 쉬울까요?',
      '장 벽(보통 140 Å² 이하)과 뇌혈관 장벽(보통 90 Å² 이하) 중 어디까지 통과해야 하나요?',
      '그래프에 표시된 실제 약의 TPSA 값을 확인해 보세요.',
    ],
    ro5: ['우리 약이 먹는 약인지 주사인지 ① 미션 브리핑을 다시 확인해 보세요.', '규칙을 1개 어긴 실제 승인약도 있어요. 위반 0개만 허용하면 어떤 후보를 잃게 될까요?'],
    alert: ['환자가 이 약을 며칠 먹는지, 수십 년 동안 매일 먹는지 떠올려 보세요.', '경고 부품은 2.1에서 구조를 바꿔 고칠 수도 있어요. 지금 뺄지 기회를 줄지 모둠원과 상의해 보세요.'],
    qed: ['QED가 높을수록 전형적인 약처럼 생긴 분자예요. 기준을 너무 높게 잡으면 어떻게 될까요?', '분포 그래프에서 실제 약의 QED 위치를 찾아보세요. 생각보다 점수가 낮은 실제 약도 있어요.'],
    score: [
      '표적마다 점수 분포가 달라요. 다른 모둠의 숫자를 따라 하지 말고 우리 표적의 그래프를 보세요.',
      '점수를 높게 잡으면 2.1 도킹 비용은 아끼지만, 구조를 조금 고치면 좋아질 후보를 버릴 수도 있어요.',
      '최종 남는 후보 수가 모둠원이 1~2개씩 찜하기에 알맞은지(8~40개) 함께 확인하세요.',
    ],
  },
  /** 지표 사전 — 무엇인가 · 비유 · 보통 값. */
  ind: {
    mw: { name: '분자량', sym: 'MW', unit: 'Da', what: '분자를 이루는 원자들의 무게를 모두 더한 값(단위 Da)이에요.', an: '큰 짐가방일수록 좁은 문을 지나기 어렵듯, 무거운 분자는 세포막을 지나 몸에 흡수되기 어려워요.', good: '먹는 약은 대부분 500 Da 이하이고, 뇌로 가는 약은 450 Da 이하가 많아요.' },
    tpsa: { name: '극성 표면적', sym: 'TPSA', unit: 'Å²', what: '분자 겉면 가운데 산소 · 질소처럼 물과 친한(극성) 부분의 넓이(단위 Å²)예요. 분자 전체 크기가 아니에요.', an: '세포막은 얇은 기름막이에요. 물과 친한 겉면이 넓을수록 기름막을 통과하기 어려워요.', good: '140 Å² 이하면 장에서 흡수되기 좋고, 90 Å² 이하면 뇌혈관 장벽(BBB)도 넘을 수 있어요.' },
    clogp: { name: '기름 친화도', sym: 'cLogP', unit: '', what: '기름 친화도(cLogP, 물보다 기름에 얼마나 잘 녹는지 계산한 로그 값)예요. 1 커질 때마다 기름을 10배 더 좋아해요.', an: '물만 좋아하면 기름막인 세포막을 지나기 어려워요. 기름만 좋아하면 피(물)에 잘 녹지 않아요.', good: '보통 0~5 사이가 알맞아요. 5를 넘으면 리핀스키 5규칙(Ro5) 위반 1개가 돼요.' },
    ro5: { name: '리핀스키 5규칙', sym: 'Ro5', unit: '개 위반', what: 'MW ≤ 500 · cLogP ≤ 5 · 수소결합 주개(HBD) ≤ 5 · 수소결합 받개(HBA) ≤ 10 네 가지 기준 중 어긴 개수예요.', an: '먹는 약이 장에서 흡수될지 미리 점검하는 기본 체크리스트예요.', good: '0개면 흡수 걱정이 적은 편이에요. 1개까지는 허용하는 경우가 많아요.' },
    alert: { name: '구조 경고', sym: '경고', unit: '', what: '방향족 아민(벤젠 고리에 붙은 NH₂)이나 니트로기(NO₂)처럼 몸속에서 독성 물질로 바뀔 수 있는 화학 부품이에요.', an: '잘 만든 자동차라도 결함이 잦은 부품이 들어 있으면 점검 대상이 되는 것과 같아요. 경고 부품이 있다고 꼭 독성이 생기는 건 아니에요.', good: '오래 먹는 약일수록 처음부터 빼는 편이 안전하지만, 2.1에서 구조를 고쳐 볼 수도 있어요.' },
    qed: { name: '약다움', sym: 'QED', unit: '', what: '분자량 · 극성 · 기름 친화도 · 수소결합 · 경고 부품 등 8가지를 시판 약들과 비교해 0~1로 합친 점수예요.', an: '1에 가까울수록 실제 시판 약들과 물성 균형이 비슷하다는 뜻이에요.', good: '0.5 이상이면 무난하고, 0.67 이상이면 약다움이 높은 편이에요.' },
    score: { name: '표적 점수', sym: '점수', unit: '', what: '분자가 표적 단백질에 잘 붙을지 3차원 모양 · 알려진 약과의 닮음 · QED로 계산한 예측 점수(0~1)예요.', an: '본선 심사(2.1 정밀 도킹) 전에 계산으로 빠르게 어림잡아 보는 예선 점수예요.', good: '높을수록 유리해요. 도킹으로 계산한 결합 에너지(ΔG, 낮을수록 강하게 붙어요)는 2.1에서 확인해요.' },
    hbd: { name: '수소결합 주개', sym: 'HBD', unit: '개', what: '수소결합 주개(HBD, 물과 수소결합을 주는 –OH · –NH 자리 수)예요.', an: '물 분자를 붙잡는 손잡이와 같아서, 너무 많으면 물에 붙들려 세포막을 지나기 어려워요.', good: '먹는 약은 5개 이하, 뇌로 가는 약은 3개 이하가 보통이에요.' },
    hba: { name: '수소결합 받개', sym: 'HBA', unit: '개', what: '수소결합 받개(HBA, 물과 수소결합을 받는 질소 N · 산소 O 자리 수)예요.', an: '주개와 마찬가지로 너무 많으면 장 벽 흡수가 떨어져요.', good: '보통 10개 이하가 알맞아요.' },
    rotb: { name: '회전 결합', sym: 'RotB', unit: '개', what: '회전 결합(RotB, 고리 밖에서 축처럼 돌 수 있는 단일 결합 수)이에요.', an: '분자가 너무 흐물흐물하면 표적 단백질 주머니에 딱 맞게 고정되기 어려워요.', good: '보통 10개 이하가 알맞아요.' },
  },
  /** 회의 근거(안건마다 · 미리보기 `AG[].reasons[].t`). */
  reasons: {
    mw: { gut: '작은 분자가 장 벽을 잘 지나서', bbb: '뇌혈관 장벽(BBB)을 넘어야 해서', keep: '후보를 너무 많이 잃지 않으려고', ref: '실제 약 값을 참고해서' },
    tpsa: { gut: '장에서 흡수만 되면 돼서', bbb: '뇌혈관 장벽(BBB)을 넘어야 해서', keep: '후보를 너무 많이 잃지 않으려고', ref: '실제 약 값을 참고해서' },
    ro5: { oral: '먹는 약이라 규칙을 지켜야 해서', soft: '규칙을 1개쯤 어긴 좋은 약도 있어서', keep: '후보를 너무 많이 잃지 않으려고', ref: '실제 약 값을 참고해서' },
    alert: { long: '오래 먹는 약이라 독성이 쌓이면 안 돼서', fix: '나중에 구조를 바꿔 고칠 수 있어서(2.1)', keep: '후보를 너무 많이 잃지 않으려고' },
    qed: { like: '실제 약과 닮은 분자를 고르려고', bind: '약다움보다 결합력(점수)이 더 중요해서', keep: '후보를 너무 많이 잃지 않으려고', ref: '실제 약 값을 참고해서' },
    score: { strong: '강하게 붙을 분자만 도킹하려고', cost: '도킹 비용을 아끼려고', grow: '점수가 낮아도 2.1에서 구조를 바꿔 좋아질 수 있어서', keep: '후보를 너무 많이 잃지 않으려고', ref: '실제 약 값을 참고해서' },
  },
  /** 회의 코치(경고만) — 화면이 `stop` · `think` 를 앞에 붙여요. */
  coach: {
    mwGut: '500 Da를 넘으면 장 흡수가 어려워져요. 고른 근거와 값({v})이 맞지 않아요.',
    mwBbbNoCns: '우리 약이 뇌까지 가야 하나요? ① 미션 브리핑을 다시 확인해 보세요.',
    mwBbb: '뇌로 가는 약은 보통 450 Da 이하예요. 지금 값({v})은 고른 근거보다 느슨해요.',
    tpsaGutCns: '우리 약은 뇌혈관 장벽(BBB)까지 넘어야 해요. 장에서 흡수되는 기준만으로는 부족해요.',
    tpsaGut: 'TPSA가 140 Å²를 넘으면 장 흡수도 어려워요.',
    tpsaBbb: '뇌혈관 장벽(BBB)을 넘으려면 보통 TPSA가 90 Å² 이하여야 해요. 지금 값({v})은 근거와 맞지 않아요.',
    tpsaBbbNoCns: '우리 약이 뇌까지 가야 하나요? 기준을 너무 좁히면 좋은 후보를 많이 잃어요.',
    ro5Oral: '2개까지 허용하면 먹는 약 규칙이 많이 느슨해져요.',
    ro5Soft: "근거는 '1개쯤 봐주자'인데 고른 값은 0개예요.",
    alertLong: "오래 먹는 약의 독성이 걱정된다면 '빼기'를 골라야 해요.",
    alertFix: "근거는 '나중에 고칠 수 있다'인데 고른 값은 '빼기'예요.",
    qedLike: 'QED를 0.3보다 낮게 잡으면 실제 약과 별로 닮지 않은 분자도 많이 통과해요.',
    qedBind: '결합력을 우선한다면서 QED를 0.6보다 높게 잡으면 표적 점수가 높은 분자를 많이 잃어요.',
    scoreStrong: '표적 점수 {v} 이상이면 잘 안 붙을 분자도 꽤 남아요. 고른 근거보다 기준이 느슨해요.',
    scoreCost: '이 값으로 해도 후보가 {n}개나 남아요. 모두 도킹하면 {cost}가 들어요.',
    scoreGrow: "근거는 '점수가 낮아도 기회를 주자'인데 고른 값은 0.6보다 높아요.",
    keep: '이 값으로 정하면 다른 합의 기준과 합쳐 {n}개밖에 안 남아요. 모둠원이 1~2개씩 찜하기에 모자라요.',
    ref: '이 표적의 실제 약 {name}({value})도 이 기준에 걸려 탈락해요. 실제 약을 참고했다면 값을 다시 확인해 보세요.',
    ok: '고른 근거와 값이 잘 맞아요. 이 근거로 모둠원을 설득해 보세요.',
    stop: '잠깐! 근거와 값이 어긋나요',
    think: '생각해 볼 점',
  },
  claimReasons: {
    top: '표적 점수가 높아요',
    bbb: '뇌로 잘 갈 것 같아요(TPSA 낮음)',
    qed: '약다움(QED)이 높아요',
    small: '작고 가벼워요(MW)',
    diverse: '다른 모둠원과 다른 종류라서(다양성)',
    known: '이미 승인된 약이라 안전해 보여요',
  },
  /** 찜 근거 코치 — `no`(막음) 문구는 '찜할 수 없어요'로 끝나요(서버도 같은 글로 400 `reason_blocked`). */
  claimCoach: {
    top: '통과한 분자 중 표적 점수 {rank}위예요(10위 밖). 점수가 더 높은 분자 대신 고른 이유가 있나요?',
    bbb: '이 분자의 TPSA는 {tpsa} Å²예요. 90 Å²보다 커서 뇌혈관 장벽(BBB)을 넘기 어려워요. 데이터와 맞지 않는 근거라 찜할 수 없어요.',
    qed: '이 분자의 QED는 {qed}예요. 0.6보다 낮아 약다움이 높은 편은 아니에요.',
    small: '이 분자의 분자량(MW)은 {mw} Da예요. 400 Da보다 무거워 작은 편은 아니에요.',
    diverse: "다른 모둠원이 찜한 분자도 모두 '{lib}'에서 나왔어요. 정말 다른 종류인지 구조를 비교해 보세요.",
    knownNot: "이 분자는 '{lib}' 소속이라 승인된 약이 아니에요. 데이터와 맞지 않는 근거라 찜할 수 없어요.",
    knownControl: '이 표적의 기존 약(대조군) 그 자체예요. 2.1에는 대조군으로 자동으로 붙어요. 새 후보로 찜하면 3.1 물질특허를 받기 어려울 수 있어요. 특허는 아직 알려지지 않은 새 물질이어야 받을 수 있거든요(신규성).',
    ok: '고른 근거가 분자 데이터와 잘 맞아요. 지금 바로 찜할 수 있어요.',
    control: '이 분자는 {gene} 표적의 기존 약(대조군)이에요. 2.1에 대조군으로 자동으로 붙고, 새 약으로 물질특허(3.1)를 받기 어려울 수 있어요.',
  },
  briefing: {
    missionTitle: '표적 미션 브리핑',
    missionSub: '1.1에서 정한 표적의 환자와 먹는 방법을 읽어요. 어떤 물성(분자의 크기 · 극성 같은 성질) 기준이 필요할지 미리 생각해 봐요.',
    refTitle: '이 표적의 실제 약 카드',
    quizTitle: '회의 전 질문 3개',
    quizSub: '모둠원이 각자 답을 고르면 서로의 답이 바로 공유돼요.',
    cns: { q: '우리 약은 뇌까지 들어가야 하나요?', opts: { must: '꼭 들어가야 해요', nice: '들어가면 더 좋아요', no: '들어갈 필요 없어요' }, link: '② 회의의 극성 표면적(TPSA) · 분자 크기(MW) 안건과 이어져요.' },
    dur: { q: '환자는 이 약을 얼마나 오래 먹나요?', opts: { days: '며칠만 먹어요', years: '몇 달에서 몇 년 동안 먹어요', life: '거의 평생 먹어요' }, link: '② 회의의 독성 부품(구조 경고) · 먹는 약 규칙(Ro5) 안건과 이어져요.' },
    route: { q: '이 약은 어떤 방법으로 몸에 넣나요?', opts: { oral: '입으로 삼키는 알약(먹는 약)', inj: '주사', skin: '피부에 바르거나 붙이는 약' }, link: '먹는 약은 장 벽에서 흡수돼야 해요. 리핀스키 5규칙(Ro5)은 먹는 약이 잘 흡수될지 가늠하는 규칙이에요.' },
    right: '맞아요.',
    wrong: '다시 읽어 보세요.',
    wrongHint: '미션 이야기 안에 단서가 있어요. 모둠원의 답과 다르다면 함께 이야기해 보세요.',
    nobody: '아직 아무도 답하지 않았어요.',
    readBtn: '미션 글을 다 읽었어요',
    readDone: '✓ 읽음',
    readNot: '아직 안 읽음',
    readCount: '모둠원 {n}/{m}명이 읽었어요.',
    refNote: "이미 환자에게 쓰이는 실제 약의 물성 값이에요. 회의에서 기준을 정할 때 '이 약도 우리 기준을 통과할까?'를 꼭 비교해 보세요.",
    toMeeting: '모둠 기준 회의로 →',
    warmup: '회의 전 몸풀기 — 내가 심사관(분자 카드 8장)',
  },
  judge: {
    title: '내가 심사관',
    pass: '통과',
    fail: '탈락',
    open: '판정 열기',
    progress: '{n} / {m}장 판정함',
    rulePass: '미션 조언 기준 판정: 통과',
    ruleFail: '미션 조언 기준 판정: 탈락 ({rules} 기준에 걸림)',
    same: '내 판정과 같아요',
    diff: '내 판정과 달라요 — 어떤 지표를 중요하게 봤는지 비교해 보세요',
    score: '조언과 같은 판정 {n}/{m}',
    noAlert: '구조 경고 없음',
    alerts: '구조 경고: {list}',
    hintNote: '몸풀기 결과, 조언과 같은 판정은 {n}/{m}장이에요. 규칙이 잡아낸 위험과 규칙이 놓친 위험을 ⑤ 연구 노트 ②번 칸의 힌트로 써 보세요.',
  },
  alertName: { aromatic_amine: '방향족 아민', nitro_aromatic: '니트로' } as Record<string, string>,
  rule: {
    mw: 'MW ≤ {v}',
    tpsa: 'TPSA ≤ {v}',
    ro5: 'Ro5 위반 ≤ {v}',
    alertOn: '구조 경고 빼기',
    alertOff: '구조 경고 허용',
    qed: 'QED ≥ {v}',
    score: '{gene} 점수 ≥ {v}',
    undecided: '미정 · 거르지 않음',
  },
  ro5Opts: { '0': '0개', '1': '1개까지', '2': '2개까지(준비 중)' } as Record<string, string>,
  ro5Later: 'Ro5 위반 2개까지 허용은 계산 서버가 준비되면 열려요. 지금은 0개 · 1개만 고를 수 있어요.',
  hiddenNote: 'Ro5 위반이 2개 이상인 분자 {n}종은 지금 계산 서버가 보내 주지 않아요. 그래서 Ro5 관문에서 늘 걸러진 것으로 셈해요.',
  alertOpts: { '1': '빼기', '0': '허용' } as Record<string, string>,
  /** 공통 점수판 — {total} = 라이브러리 수, {n} = 상위 N(`SCREEN_TOP_N`). */
  scoreboard: {
    left: '남은 분자',
    cut: '{total}종 중 {p}% 걸러 냄 (2.1 도킹 비용과 이어져요)',
    known: '아는 약 계열',
    knownSub: '{k} / {K} 남음',
    knownWhat: '이 표적에 듣는다고 알려진 분자(실제 시판 약 + 사내 유도체)가 우리 기준을 몇 개나 통과했는지 보여 줘요. 실제 연구에서도 이미 아는 약으로 기준을 검증해요.',
    enrich: '농축도',
    enrichWhat: '남은 분자 속 아는 약 계열 비율이 처음 {total}종 때보다 몇 배 진해졌는지예요. ×1.0보다 크면 기준이 아는 약 계열을 잘 남겼다는 뜻이에요.',
    top: '상위 {n} 중 아는 약 계열',
    topWhat: '결합 예측(표적 점수) 순으로 줄 세웠을 때 도킹 대기열 앞쪽 {n}개 안에 아는 약 계열이 몇 개 들어 있는지 보여 줘요.',
    mine: '내 값으로 본 공통 점수판',
    agreed: '합의값으로 본 공통 점수판',
    run: '이 실행의 공통 점수판',
  },
  funnel: {
    library: '라이브러리',
    final: '남는 후보',
    many: '많음(41~)',
    few: '적음(0~7)',
    good: '알맞음(8~40)',
    mine: '(내 값)',
    agreed: '✓',
    stripLabel: '지금 합의한 기준으로 본 깔때기(미정 안건은 거르지 않아요)',
    knownDrop: '아는 약 계열 −{n}',
  },
  meeting: {
    tabStatusAgreed: '{rule}',
    tabStatusOpen: '논의 중 · {n}/{m} 투표',
    benchTitle: '내 작업대',
    myValue: '내가 생각하는 기준값',
    why: '제안 근거',
    propose: '모둠에 제안하기 · {rule}',
    repropose: '내 제안 고치기 · {rule}',
    reproposeResetNote: '내 제안 값을 고치면 이전 값에 찍혔던 다른 모둠원의 찬성표는 초기화돼요.',
    agreedNote: "모둠이 {rule}(으)로 합의했어요. 바꾸려면 오른쪽에서 '다시 논의'를 눌러 주세요.",
    whatIs: '{sym} · {name} 자세히 보기',
    conseqCut: '이 안건에서 걸러지는 수',
    conseqLeft: '합의된 기준과 합쳐 남는 수',
    conseqRef: '실제 약 {name} 통과 여부',
    refPass: '통과',
    refFail: '걸림',
    lostKnown: '버려지는 약 계열: {list}',
    noLostKnown: '이 기준에서는 아는 약 계열을 하나도 버리지 않아요.',
    roomTitle: '모둠 회의실 · {label}',
    quorum: '{n}/{m}명 투표 · {q}표면 합의(정족수: 모둠 인원의 과반)',
    reopen: '다시 논의',
    support: '찬성하기',
    supportWhy: '찬성 근거',
    supportOk: '이 근거로 찬성',
    myVote: '내 표',
    votes: '{n}/{m}명 찬성',
    reasonOf: '제안 근거: {reason}',
    effectCut: '이 안건 −{n}개',
    effectLeft: '남는 후보 {n}개',
    effectRef: '실제 약 {r}',
    stamp: '합의 도장',
    noProposals: '아직 올라온 제안이 없어요. 왼쪽 내 작업대에서 값을 고르고 근거와 함께 제안해 보세요.',
    proposeHow: '내 제안을 올리면 내 제안에 자동으로 찬성 1표가 찍혀요. 다른 제안에 찬성하면 내 표가 옮겨 가요.',
    allVotedNoQuorum: '모두 투표했지만 정족수({q}표)에 닿은 안이 없어요. 근거를 더 나누거나 절충안을 제안해 보세요.',
    feedProp: '{rule} 안을 제안했어요. (근거: {reason})',
    feedVote: '{rule} 안에 찬성했어요. (근거: {reason})',
    feedAgreed: '합의 완료! {rule} — 찬성 {n}표',
    allAgreed: '6개 안건을 모두 합의했어요. 이제 합의한 기준으로 스크리닝을 실행할 수 있어요.',
    toRun: '스크리닝 실행으로 →',
    feedTitle: '회의 대화',
    proposed: '모둠에 제안했어요.',
    voted: '찬성했어요.',
    reopened: '다시 논의를 열었어요. 제안 카드는 남고 투표만 새로 진행해요.',
  },
  lab: {
    title: '기준 설계실',
    presets: '빠른 시작 조합',
    presetAdvice: '미션 조언값',
    presetLipinski: '리핀스키 5규칙',
    presetCns: '뇌로 가는 약',
    presetNone: '기준 없음',
    use: '{label} 쓰기',
    off: '안 씀',
    send: '이 조합으로 제안하기',
    sent: '아직 내 제안이 없는 {n}개 안건의 작업대에 이 값을 채웠어요. 안건마다 근거 칩을 직접 골라 제안을 올려 주세요.',
    sentNone: '값을 옮길 안건이 없어요. 이미 모든 안건에 내 제안이 있거나 합의가 끝났어요.',
    funnelTitle: '내 기준을 차례로 지나며 남은 분자',
    topTitle: '도킹 대기열 앞쪽 상위 {n}개 미리보기',
    none: '남은 분자가 0개예요. 빨간 문턱선을 조금 풀어 보세요.',
  },
  map: {
    title: '화학 공간 울타리',
    x: '가로 축',
    y: '세로 축',
    textbook: '교과서 기준선 겹쳐 보기',
    clear: '울타리 지우기',
    edges: '울타리 네 변',
    out: '내 울타리 범위: {x} {x0}~{x1} · {y} {y0}~{y1}',
    stats: '울타리 안 분자 {n}개 · 아는 약 계열 {k}/{K} · 농축도 {ef}',
    outside: '울타리 밖으로 빠진 약 계열: {list}',
    empty: '산점도 위에서 끌어서 사각형 울타리를 치거나 네 변 숫자를 입력해 보세요.',
    take: '울타리 값 가져오기',
    taken: '울타리의 문턱값을 {list} 안건의 내 작업대로 가져왔어요. 각 안건에서 근거를 골라 모둠에 제안해 주세요.',
    takeNone: '고른 축이 모두 참고 지표(cLogP · HBD · RotB)여서 옮길 안건이 없어요. 참고 지표는 눈으로만 확인하고 거르지는 않아요.',
    ref: '참고 지표',
    textbookAt: '교과서 기준 {v}',
  },
  /** ③ 실행 — {total} = 라이브러리 수, 돈 자리표시자는 `money()` 로 채워요. */
  run: {
    criteria: '모둠이 합의한 기준 6개',
    notAgreed: '아직 합의하지 않은 안건이 있어요. 안건 6개를 모두 합의해야 스크리닝을 실행할 수 있어요.',
    backToMeeting: '회의로 돌아가기',
    preview: '미리보기로는 {total}종 중 {n}개가 남아요.',
    run: '스크리닝 실행',
    rerun: '합의한 기준으로 다시 실행',
    confirmTitle: '합의한 기준으로 스크리닝을 실행할까요?',
    confirmBody: '모둠 연구비에서 {cost}가 나가고 {left}가 남아요. 기준을 바꿔 다시 실행할 때마다 같은 비용({cost})이 들어요.',
    confirmOk: '실행하기',
    history: '실행 기록',
    historyEmpty: '아직 실행한 기록이 없어요. 실행하면 {total}종 분자가 여섯 관문을 차례로 지나가요.',
    round: '{n}차 실행',
    running: '{name} 님이 스크리닝을 실행하고 있어요. 잠시만 기다리면 결과가 함께 열려요.',
    progress: '{total}종이 관문 6개를 차례로 지나는 중이에요 · {pct}%',
    failed: '스크리닝 실행이 실패했어요. 낸 연구비는 그대로 돌려받았어요. 잠시 뒤 다시 실행해 주세요.',
    resultTitle: '결과',
    biggest: '가장 많이 걸러 낸 관문: {label}(−{n}개)',
    dockCost: '통과한 {n}개를 2.1에서 모두 도킹하면 {n} × {unit} = {total}(남은 연구비의 {pct}%)가 들어요. 그래서 ④에서 1인 1~2개씩만 골라 도킹해요.',
    missedTitle: '걸러진 분자 중 표적 점수가 높았던 3개 — 놓친 걸까요?',
    missedAt: '{label} 기준에서 걸림 ({value})',
    missedNote: '표적 점수는 높았지만 우리 기준 가운데 하나에 걸려 빠진 분자예요. 정말 약이 되기 어려운 분자일까요, 우리 기준이 너무 엄격했을까요? ⑤ 연구 노트 ② 칸에 적어 보세요.',
    remeet: '기준 다시 회의하기',
    toShop: '통과한 {n}개 쇼핑하러 가기 →',
    gauge: { few: '적음 0~7', good: '알맞음 8~40', many: '많음 41~' },
    snapshotNote: '각 실행 기록에는 그때 합의했던 기준과 통과 수가 그대로 보존돼요. 나중에 기준을 다시 회의해도 이전 기록은 바뀌지 않아요.',
  },
  verdict: {
    zero: { title: '후보 0개 — 너무 엄격해요', body: '{total}종이 모두 걸러져 남은 후보가 없어요. 좋은 후보까지 버렸을 수 있어요(위음성: 쓸 만한 후보를 기준이 놓치는 일). 가장 많이 걸러 낸 안건부터 다시 회의해 보세요.' },
    few: { title: '너무 적어요 (1~7개)', body: '통과한 후보가 {n}개뿐이에요. 모둠원이 1~2개씩 찜하기에 모자라요. 좋은 후보를 놓쳤을 수도 있어요(위음성).' },
    good: { title: '알맞아요 (8~40개)', body: '통과한 후보가 {n}개 남았어요. 모둠원이 진열대를 나눠 살펴보고 1인 1~2개씩 근거를 들어 찜하기에 딱 좋은 양이에요.' },
    many: { title: '너무 많아요 (41개 이상)', body: '후보가 {n}개나 남았어요. 기준이 느슨해서 약이 되기 어려운 분자도 섞여 있을 수 있어요(위양성: 안 될 분자를 기준이 통과시키는 일). ④ 분자 쇼핑에서 더 꼼꼼히 골라 주세요.' },
  },
  shop: {
    emptyTitle: '아직 진열된 분자가 없어요',
    emptyBody: '③ 스크리닝 실행을 마치면 마지막 실행에서 통과한 분자만 이곳 진열대에 올라와요.',
    shelf: '통과 분자 진열대',
    shelfSub: '마지막({round}차) 실행 통과 {n}개 · {page}개씩 보기',
    search: '분자 이름이나 ChEMBL 번호로 검색',
    sortScore: '{gene} 표적 점수 높은 순',
    sortQed: '약다움(QED) 높은 순',
    sortTpsa: '극성 표면적(TPSA) 낮은 순',
    sortMw: '분자량(MW) 작은 순',
    filterFree: '아직 찜 안 됨',
    filterBbb: 'TPSA ≤ 90',
    filterQed: 'QED ≥ 0.67',
    filterApproved: '승인약',
    filterNew: '사내 · ZINC',
    count: '{n}개',
    none: '고른 검색어 · 필터에 맞는 분자가 없어요. 필터를 해제해 보세요.',
    viewCards: '카드로 보기',
    viewTable: '표로 보기',
    rank: '통과 {n}위',
    detail: '상세 서랍 열기',
    claim: '찜하기',
    full: '내 찜 {n}개 꽉 참',
    mine: '✓ 내 찜 · 놓기',
    theirs: '{name} 님 찜',
    claimTitle: '{name} 찜하기',
    claimWhy: '찜 근거',
    claimOk: '이 근거로 내 후보 찜하기',
    claimed: '내 담당 후보로 찜했어요. 모둠 장바구니에 올라갔어요.',
    cancel: '취소',
    close: '닫기',
    structure: '구조식(SMILES)',
    adviceCol: '미션 조언과 비교',
    adviceOk: '조언 범위 안',
    adviceOff: '조언 범위 밖',
    adviceDock: '2.1에서 확인',
    cart: '모둠 장바구니',
    cartSub: '모둠 공유 · 1인 {n}개까지 · 2.1 도킹 대기열로 넘어가요',
    laneEmptyMe: "왼쪽 진열대에서 마음에 드는 후보의 '찜하기'를 눌러 내 담당 후보를 골라 보세요.",
    laneEmpty: '아직 찜한 후보가 없어요.',
    release: '찜 빼기',
    sumClaims: '찜한 후보 수',
    sumMembers: '참여한 모둠원',
    sumDock: '2.1 도킹 예상 비용',
    controlNote: "2.1 분자 도킹에는 찜한 후보와 함께 대조군(비교 기준이 되는 실제 약 {name})이 자동으로 붙어요. 모둠원이 모두 찜하면 투자 심사 '4인 병렬 발굴' 점수가 올라가요.",
    toHand: '후보 확정하고 ⑤ 넘기기로 →',
    legacy: '근거 없음(이전 판)',
    tableIntro: '통과한 분자들의 물성(MW · TPSA · cLogP · HBD · QED · 경고 · 결합 예측)을 표에서 정렬하고 비교하며 행에서 바로 내 후보로 찜해요.',
    textbookNote: "빨간 숫자와 !는 교과서 기준(MW 500 · TPSA 140 · cLogP 5 · HBD 5 · QED 0.3)을 벗어난 값이에요. 참고 표시라 거르지는 않아요. 도킹으로 계산한 결합 에너지(ΔG)는 2.1에서 도킹한 뒤 '찜 회고'로 확인해요.",
    rowsNote: '{n}개 보는 중 · 열 머리글을 누르면 오름차순 · 내림차순으로 정렬돼요.',
  },
  hand: {
    emptyTitle: '아직 2.1로 넘길 후보가 없어요',
    emptyBody: '③에서 스크리닝을 1회 이상 실행하고 ④에서 후보를 1개 이상 찜하면 1.2 스크리닝 확정서가 열려요.',
    receipt: '1.2 스크리닝 확정서',
    target: '표적 · 질환',
    proposer: '{name} 제안 · 찬성 {n}표',
    runs: '스크리닝 실행',
    runsValue: '총 {n}회 실행 · {total}종 → {final}종 통과',
    spent: '1.2에서 쓴 연구비',
    queue: '2.1 도킹 대기열 (찜 후보 + 대조군)',
    control: '대조군(기존 약) · 자동 포함',
    dockCost: '2.1 도킹 예상 비용',
    missing: '아직 후보를 찜하지 않은 모둠원이 있어요: {names}. 모두 1~2개씩 맡으면 2.1에서 각자 동시에 도킹할 수 있어요.',
    send: '2.1 분자 도킹으로 보내기',
    more: '← 진열대에서 더 고르기',
  },
  /** 서버 오류 문구(`apps/server/src/features/screen.ts` 가 409 로 돌려줘요 — 화면은 그 글을 그대로 보여요). */
  err: {
    alreadyAgreed: "방금 정족수에 닿아 {rule}(으)로 먼저 합의됐어요. 바꾸려면 '다시 논의'를 눌러 주세요.",
    alreadyRunning: '{name} 님이 이미 스크리닝을 실행 중이에요. 연구비는 한 번만 나가요. 진행 중인 결과를 기다려 주세요.',
    claimsFull: '한 사람당 {n}개까지만 찜할 수 있어요. 다른 분자를 고르려면 모둠 장바구니에서 내 찜을 먼저 빼 주세요.',
    claimTaken: '방금 {name} 님이 먼저 찜했어요. 아직 찜하지 않은 다른 분자를 골라 주세요.',
    staleShelf: '그사이 새로운 스크리닝 실행 결과가 나왔어요. 최신 진열대 목록에서 다시 골라 주세요.',
    otherMember: '다른 모둠원',
  },
  members: '모둠원',
  me: '나',
  unknownMember: '(나간 모둠원)',
  loading: '불러오는 중…',
  noTarget: '1.1에서 표적을 먼저 정해 주세요.',
  noMission: '이 표적의 미션 글은 아직 없어요. 기준 회의와 실행은 그대로 할 수 있어요.',
  structureNote: '구조식 그림은 다음 판에서 붙어요. 지금은 SMILES 로 보여요.',
  /** 화면 틀 문구(섬 제목 · 탭 보조 · 표 머리 · 범례 · 안내). */
  ui: {
    tabsLabel: '1.2 걸음',
    tabRead: '{n}/{m} 읽음',
    tabAgreed: '{n}/6 합의',
    tabRuns: '{n}회 · {k}개 통과',
    tabNotYet: '아직',
    tabClaims: '찜 {n}개',
    tabHand: '노트 · 확정',
    teamBrief: '모둠 공유 — 회의 전 질문 · 읽음',
    teamMeet: '모둠 공유 — 기준 회의',
    teamRun: '모둠 공유 — 실행 결과',
    teamShop: '모둠 공유 — 장바구니',
    teamHand: '모둠 공유 — 확정서',
    toolBrief: '① 도구',
    toolMeet: '② 도구',
    toolMission: '미션 · 실제 약',
    toolAgenda: '안건 · 분포 보고 문턱',
    realDrugSub: '비교 기준 · 2.1 대조군',
    dict: '지표 사전',
    dictSub: '밑줄 지표의 뜻',
    teamShared: '모둠 공유',
    readSub: '읽음 표시(막지 않아요)',
    agendaTabs: '안건',
    agendaWhat: '무엇인가',
    agendaWhy: '왜 거르나',
    dist: '{sym} 분포 {n}종',
    distShort: '{sym} 분포',
    feedSys: '회의',
    controlMark: '◆ 실제 약 {name} = 그래프의 네모 점선',
    noFunds: '연구비가 모자라요.',
    fixtureNote: '계산 서버 시험 모드예요 — 깔때기 수는 같은 자료로 서버가 센 값이에요.',
    testRun: '시험 모드',
    undecided: '{label} 미정',
    runCount: '{n}회',
    runCols: { no: '회차', criteria: '기준', by: '실행', pass: '통과' },
    pickRun: '실행 고르기',
    progress: '진행 {pct}%',
    scoreOf: '점수 {v}',
    sort: '정렬',
    filter: '필터',
    view: '보기',
    prevPage: '앞 쪽',
    nextPage: '다음 쪽',
    detailRank: ' · 통과 중 {n}위',
    detailKnown: ' · ★ 아는 약 계열',
    detailCols: { k: '지표', v: '값' },
    unitCount: '개',
    unitLeft: '개 남음',
    histN: '{n}개',
    histKnown: ' (아는 약 계열 {k})',
    histLeft: '{label} — {n}개 중 {k}개 남음',
    histRo5: '위반 {n}개',
    histAlertOn: '경고 있음',
    histAlertOff: '경고 없음',
    legendPass: '통과',
    legendFail: '✕ 이 기준에 걸림',
    legendKnown: '★ 아는 약 계열',
    legendControl: '실제 약 {name}',
    legendFlag: '모둠원 제안',
    rangeMax: '최대',
    rangeMin: '최소',
    scatter: '{x} × {y} 산점도 — {n}개 · 별은 아는 약 계열',
    judgeOf: '{name} 판정',
    tableCols: { rank: '순위', name: '분자', library: '라이브러리', alerts: '경고', score: '{gene} 점수', claim: '찜' },
    approvedShort: '승인약',
    alertYes: '있음 !',
    targetFallback: '표적',
  },
} as const;

/** `{key}` 자리표시자를 채운다. 없는 키는 그대로 둔다. */
export function screenFill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
}

const fmt2 = (v: number) => v.toFixed(2);

/** 안건 값 → 글(예: 'MW ≤ 450' · 'ACHE 점수 ≥ 0.50' · '구조 경고 빼기'). */
export function screenRuleText(agenda: ScreenAgenda, value: number | null | undefined, gene = '표적'): string {
  const R = SCREEN_COPY.rule;
  if (value === null || value === undefined) return R.undecided;
  switch (agenda) {
    case 'alert':
      return value >= 1 ? R.alertOn : R.alertOff;
    case 'qed':
      return screenFill(R.qed, { v: fmt2(value) });
    case 'score':
      return screenFill(R.score, { v: fmt2(value), gene });
    default:
      return screenFill(R[agenda], { v: value });
  }
}

/** 지표 값 → 글(안건 칩 · 서랍). */
export function screenValueText(agenda: ScreenAgenda, c: ScreenCompound): string {
  switch (agenda) {
    case 'mw':
      return `${Math.round(c.mw)} Da`;
    case 'tpsa':
      return `${Math.round(c.tpsa)} Å²`;
    case 'ro5':
      return `${c.ro5}개`;
    case 'alert':
      return c.alerts.length ? c.alerts.map((a) => SCREEN_COPY.alertName[a] ?? a).join(' · ') : '없음';
    case 'qed':
      return fmt2(c.qed);
    case 'score':
      return c.score.toFixed(3);
  }
}

/** 안건 질문(표적 이름을 채운다). */
export const screenAgendaQuestion = (agenda: ScreenAgenda, m: Pick<ScreenMission, 'gene'> | null): string =>
  screenFill(SCREEN_COPY.agenda[agenda].q, { gene: m?.gene ?? '표적' });

/** 안건 생각할 거리 2~3줄(미션의 뇌 여부로 MW 둘째 줄을 고른다). */
export function screenAgendaHints(agenda: ScreenAgenda, m: Pick<ScreenMission, 'cns'> | null): string[] {
  const h = SCREEN_COPY.hints;
  if (agenda === 'mw') return [h.mw[0], m?.cns === 'must' ? h.mw[1] : h.mw[2], h.mw[3]];
  return [...h[agenda]];
}

// ── 코치(회의 — 경고만) ──

export interface CoachHit {
  /** 'no' = 근거와 값이 정면으로 어긋남(회의에서는 그래도 막지 않는다 · 찜에서는 막음), 'warn' = 생각해 볼 점. */
  level: 'warn' | 'no';
  text: string;
}

/** 안건마다 고를 수 있는 근거 키(DB 는 키 꼴만 본다 — 서버가 이 목록으로 거른다). */
export const SCREEN_AGENDA_REASONS: Record<ScreenAgenda, readonly string[]> = {
  mw: ['gut', 'bbb', 'keep', 'ref'],
  tpsa: ['gut', 'bbb', 'keep', 'ref'],
  ro5: ['oral', 'soft', 'keep', 'ref'],
  alert: ['long', 'fix', 'keep'],
  qed: ['like', 'bind', 'keep', 'ref'],
  score: ['strong', 'cost', 'grow', 'keep', 'ref'],
};

export const screenReasonLabel = (agenda: ScreenAgenda, key: string): string =>
  (SCREEN_COPY.reasons[agenda] as Record<string, string>)[key] ?? key;

export interface AgendaCoachContext {
  mission: ScreenMission | null;
  ds: Pick<ScreenDatasetResponse, 'total' | 'hidden' | 'compounds'>;
  /** 이 안건 밖의 합의값(미정은 빼고) — '후보를 잃지 않으려고' · '도킹 비용' 점검이 이것과 합쳐 센다. */
  agreedOthers: ScreenCriteriaPartial;
  /** 2.1 도킹 1회 비용(크리스타) — '도킹 비용을 아끼려고' 문구. */
  dockCrista: number;
}

/** 회의 코치 — 고른 근거와 값이 어긋나면 짚는다(미리보기 `AG[].reasons[].check` 그대로). 회의에서는 경고만 하고 막지 않는다. */
export function agendaCoach(agenda: ScreenAgenda, reason: string, value: number, ctx: AgendaCoachContext): CoachHit | null {
  const C = SCREEN_COPY.coach;
  const L = SCREEN_COACH_LIMITS;
  const cns = ctx.mission?.cns;
  const finalWith = () => screenFunnel(ctx.ds, { ...ctx.agreedOthers, [agenda]: value }).final;
  if (reason === 'keep') {
    const n = finalWith();
    return n < SCREEN_BANDS.fewBelow ? { level: 'no', text: screenFill(C.keep, { n }) } : null;
  }
  if (reason === 'ref') {
    const ref = ctx.mission ? ctx.ds.compounds.find((c) => c.id === ctx.mission!.controlId) : undefined;
    if (!ref || screenPass(agenda, ref, value)) return null;
    return { level: 'no', text: screenFill(C.ref, { name: shortName(ref.name, 10), value: screenValueText(agenda, ref) }) };
  }
  switch (agenda) {
    case 'mw':
      if (reason === 'gut') return value > L.gutMw ? { level: 'warn', text: screenFill(C.mwGut, { v: value }) } : null;
      if (reason === 'bbb') return cns === 'no' ? { level: 'warn', text: C.mwBbbNoCns } : value > L.bbbMw ? { level: 'warn', text: screenFill(C.mwBbb, { v: value }) } : null;
      return null;
    case 'tpsa':
      if (reason === 'gut') return cns === 'must' && value > L.bbbTpsa ? { level: 'no', text: C.tpsaGutCns } : value > L.gutTpsa ? { level: 'warn', text: C.tpsaGut } : null;
      if (reason === 'bbb') return value > L.bbbTpsa ? { level: 'no', text: screenFill(C.tpsaBbb, { v: value }) } : cns === 'no' ? { level: 'warn', text: C.tpsaBbbNoCns } : null;
      return null;
    case 'ro5':
      if (reason === 'oral') return value >= 2 ? { level: 'warn', text: C.ro5Oral } : null;
      if (reason === 'soft') return value === 0 ? { level: 'warn', text: C.ro5Soft } : null;
      return null;
    case 'alert':
      if (reason === 'long') return value < 1 ? { level: 'no', text: C.alertLong } : null;
      if (reason === 'fix') return value >= 1 ? { level: 'warn', text: C.alertFix } : null;
      return null;
    case 'qed':
      if (reason === 'like') return value < L.qedLike ? { level: 'warn', text: C.qedLike } : null;
      if (reason === 'bind') return value > L.qedBind ? { level: 'warn', text: C.qedBind } : null;
      return null;
    case 'score':
      if (reason === 'strong') return value < L.scoreStrong ? { level: 'warn', text: screenFill(C.scoreStrong, { v: fmt2(value) }) } : null;
      if (reason === 'cost') {
        const n = finalWith();
        return n > SCREEN_BANDS.goodMax ? { level: 'warn', text: screenFill(C.scoreCost, { n, cost: formatCrista(n * ctx.dockCrista) }) } : null;
      }
      if (reason === 'grow') return value > L.scoreGrow ? { level: 'warn', text: C.scoreGrow } : null;
      return null;
  }
}

// ── 찜 근거(④ — 골라야 찜 · `no` = 막음, 서버가 같은 함수로 다시 판정해 400 `reason_blocked`) ──

export type ClaimReason = 'top' | 'bbb' | 'qed' | 'small' | 'diverse' | 'known';
export const CLAIM_REASONS: readonly ClaimReason[] = ['top', 'bbb', 'qed', 'small', 'diverse', 'known'];
export const isClaimReason = (v: unknown): v is ClaimReason => typeof v === 'string' && (CLAIM_REASONS as readonly string[]).includes(v);

export interface ClaimCoachContext {
  compound: ScreenCompound;
  /** 진열대 순위(1부터). */
  rank: number;
  mission: Pick<ScreenMission, 'controlId'> | null;
  /** 다른 모둠원이 이미 찜한 분자들의 라이브러리. */
  othersLibraries: readonly string[];
}

export function claimCoach(reason: ClaimReason, ctx: ClaimCoachContext): CoachHit | null {
  const C = SCREEN_COPY.claimCoach;
  const L = SCREEN_COACH_LIMITS;
  const c = ctx.compound;
  switch (reason) {
    case 'top':
      return ctx.rank > L.claimTopRank ? { level: 'warn', text: screenFill(C.top, { rank: ctx.rank }) } : null;
    case 'bbb':
      return c.tpsa > L.bbbTpsa ? { level: 'no', text: screenFill(C.bbb, { tpsa: Math.round(c.tpsa) }) } : null;
    case 'qed':
      return c.qed < L.claimQed ? { level: 'warn', text: screenFill(C.qed, { qed: fmt2(c.qed) }) } : null;
    case 'small':
      return c.mw > L.claimMw ? { level: 'warn', text: screenFill(C.small, { mw: Math.round(c.mw) }) } : null;
    case 'diverse':
      return ctx.othersLibraries.length > 0 && ctx.othersLibraries.every((l) => l === c.library) ? { level: 'warn', text: screenFill(C.diverse, { lib: c.library }) } : null;
    case 'known':
      if (c.library !== APPROVED_LIBRARY) return { level: 'no', text: screenFill(C.knownNot, { lib: c.library }) };
      return ctx.mission && c.id === ctx.mission.controlId ? { level: 'warn', text: C.knownControl } : null;
  }
}

/** 이름에서 괄호 영문을 떼고 줄인다(칩 · 카드). */
export function shortName(name: string, k = 16): string {
  const s = name.replace(/\s*\(.*\)\s*$/, '');
  return s.length > k ? `${s.slice(0, k - 1)}…` : s;
}

// ── 화면 모양(GET /api/screen) ──

export interface ScreenMemberView {
  userId: string;
  displayName: string;
  avatar: Avatar | null;
}

export interface ScreenBriefingView {
  userId: string;
  question: BriefingQuestion;
  answer: string;
  answeredAt: string;
}

export interface ScreenVoteView {
  voter: string;
  voterName: string;
  avatar: Avatar | null;
  reason: string;
  votedAt: string;
}

export interface ScreenProposalView {
  proposedBy: string;
  byName: string;
  avatar: Avatar | null;
  value: number;
  reason: string;
  updatedAt: string;
  /** 지금 round 의 찬성. */
  votes: ScreenVoteView[];
}

export interface ScreenAgendaView {
  agenda: ScreenAgenda;
  round: number;
  status: 'open' | 'agreed';
  value: number | null;
  proposedBy: string | null;
  proposedByName: string | null;
  votes: number | null;
  agreedAt: string | null;
  proposals: ScreenProposalView[];
}

export interface ScreenRunView {
  jobId: string;
  /** 회차(1부터, 오래된 순). */
  no: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  byUserId: string | null;
  byName: string;
  avatar: Avatar | null;
  createdAt: string;
  costCents: number;
  refundedCents: number;
  /** 워커가 고정 결과(fixture) 모드였나. */
  test: boolean;
  snapshot: ScreenRunSnapshot | null;
  errorMessage: string | null;
}

export interface ScreenClaimView {
  compoundId: string;
  slot: 1 | 2;
  userId: string;
  byName: string;
  avatar: Avatar | null;
  reason: string;
  name: string;
  screenJobId: string;
}

export interface ScreenResponse {
  revisionId: string;
  targetId: string | null;
  me: string;
  members: ScreenMemberView[];
  quorum: number;
  briefing: ScreenBriefingView[];
  agendas: ScreenAgendaView[];
  /** 합의값(합의한 안건만). */
  agreed: ScreenCriteriaPartial;
  allAgreed: boolean;
  /** 최근 실행 먼저. */
  runs: ScreenRunView[];
  /** 진열대 = 그 버전 마지막 성공 1.2 실행의 통과 id(순위 순). */
  shelf: { jobId: string; no: number; passIds: string[] } | null;
  claims: ScreenClaimView[];
  ro5Values: readonly number[];
  costs: { runCents: number; dockCents: number };
  balanceCents: number;
}

// ── 요청 ──

export interface ScreenBriefingRequest {
  question: BriefingQuestion;
  answer: string;
}
export interface ScreenProposalRequest {
  agenda: ScreenAgenda;
  value: number;
  reason: string;
}
export interface ScreenVoteRequest {
  agenda: ScreenAgenda;
  proposedBy: string;
  /** 화면이 본 그 제안의 값 — 그 사이 제안자가 값을 고쳤으면 서버가 409 stale(바뀐 안에 찬성한 셈이 되지 않게 · §7.4 ⑥). */
  value: number;
  reason: string;
}

/** 경로 — 찜은 W3 경로 그대로(`API.claims` — 근거 필수 · 서버 재판정). */
export const SCREEN_API = {
  screen: '/api/screen',
  compounds: '/api/screen/compounds',
  briefing: '/api/screen/briefing',
  proposals: '/api/screen/proposals',
  votes: '/api/screen/votes',
  reopen: (agenda: ScreenAgenda) => `/api/screen/agendas/${agenda}/reopen`,
} as const;
