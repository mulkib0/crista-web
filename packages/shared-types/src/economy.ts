/**
 * 학급 시계·회사 경제·이벤트의 화면 규격(M3, 프로토콜 v3).
 * 계산은 서버가 하고(`@crista/game-rules` 의 순수 함수), 클라이언트는 이 값을 그리기만 한다.
 * 단일 소스: docs/2026-10-19-game-balance-v0.md §2(시간)·§3(유지비)·§4(경고·회생·파산)·§5(이벤트).
 */
import type {
  CashAlertLevel,
  ClassId,
  ClockMode,
  CompanyStatus,
  CourseKind,
  FacilityKind,
  FacilityRunState,
  FacilityTier,
  InvestmentMilestone,
  RestructureBlockedAction,
  SessionPhase,
  TeamId,
} from './domain.ts';

// ──────────────────────────────── 학급 시계 ────────────────────────────────

/**
 * `S2C.CLOCK` — 학급 전체(학생·교사)에게. 입장 때 `WelcomeMessage.clock` 으로도 온다.
 * 바뀔 때마다(일시정지·재개·수업 시작·종료·연장·모드 변경·예정 종료 시각 도달) 보내고, 60초마다 한 번 다시 보낸다.
 *
 * 클라이언트 보간: `gameDays + gameDaysPerRealMinute × (지금 − asOfMs) / 60000`.
 * `nextChangeAtMs` 를 넘으면 보간을 멈추고 다음 `CLOCK` 을 기다린다(예정 종료 시각에 배율이 바뀐다).
 * **화면 반올림 값을 계산에 되먹이지 않는다** — 정산·판정은 서버만 한다.
 */
export interface ClockView {
  classId: ClassId;
  course: CourseKind;
  mode: ClockMode;
  /** 교사 수동 일시정지 — 게임 시간·유지비·자동 이벤트·회생 유예 카운트가 모두 멈춘다. */
  paused: boolean;
  /** 지금 구간. 고정 모드도 수업 세션 중이면 `inClass`(배율은 같다). */
  phase: SessionPhase;
  /** 아래 값을 계산한 서버 시각(ms epoch). */
  asOfMs: number;
  /** asOfMs 시점의 누적 게임 일(소수). 0 = 학급 시작일. */
  gameDays: number;
  /** 현실 1분당 게임 일. 일시정지면 0. */
  gameDaysPerRealMinute: number;
  /** asOfMs 시점의 게임 날짜. 1년 = 12개월 · 1개월 = 30일(균형안 §2), 모두 1부터 센다. */
  date: { year: number; month: number; day: number };
  /** 진행 중인 수업 세션. 없으면 null. `endsAtMs` 는 현실 예정 종료 시각이다(종료 5분 전 알림, 예정 시각에 자동 완속). */
  session: { seq: number; startedAtMs: number; endsAtMs: number; minutes: number } | null;
  /** 수업 기본 길이(분) — 50분 기본, 교사가 바꿀 수 있다. */
  sessionMinutes: number;
  /** 고정 모드 배율(현실 1일당 게임 일). */
  fixedGameDaysPerRealDay: number;
  /** 다음 게임 월 경계(월 정산 표시·자동 이벤트 추첨)까지 남은 게임 일. */
  daysToMonthEnd: number;
  /** 배율이 바뀌는 다음 현실 시각(ms) — 예정 종료 시각. 없으면 null. */
  nextChangeAtMs: number | null;
  /** 이 학급의 균형안 설정 버전 — 'balance-v0'. */
  economyVersion: string;
}

// ──────────────────────────────── 회사 경제 ────────────────────────────────

/** 게임 1개월 유지비 내역(센트) — 이벤트 배율을 반영한 값. 균형안 §3.2. */
export interface UpkeepBreakdownView {
  rentCents: number;
  facilityCents: number;
  staffCents: number;
  totalCents: number;
  /** 적용 중인 항목별 배율(0.70~1.30 으로 자른 값). 1 이면 키를 생략한다. */
  multipliers: { facility?: number; rent?: number; staff?: number };
}

/** 회생 유예 — 현실 **운영 시간** 48시간(교사 일시정지 동안 카운트 중지, 가속과 무관). 균형안 §4. */
export interface GraceView {
  /** 유예가 시작된 현실 시각(ms, 표시용). */
  startedAtMs: number;
  /** 유예 총 길이(분) = 48시간 + 교사 조정 합. */
  limitMinutes: number;
  /** asOfMs 기준 남은 운영 시간(ms). 0 이면 만료(다음 판정에서 파산). */
  remainingMs: number;
  /** 지금 카운트가 흐르는가(학급 일시정지면 false). 화면은 false 일 때 카운트다운을 멈춘다. */
  counting: boolean;
  asOfMs: number;
  /** 회생 필요액 = 미지급 비용 전액 + 현재 월 유지비 × 3(균형안 §4). */
  recoveryRequiredCents: number;
  /** 회생까지 부족한 가용 현금(0 이상). */
  shortfallCents: number;
  /** 교사 조정 이력 — 사유 필수(아트디렉션 §8.1 `ui/gm-grace-adjust`). */
  adjustments: Array<{ minutes: number; reason: string; byName: string; atMs: number }>;
}

/** 자금 상태(서버 판정). HUD 카드는 단계가 바뀌면 **교체**하고 네 단계를 동시에 띄우지 않는다(에셋 파이프라인 §4.2). */
export interface CashStatusView {
  level: CashAlertLevel;
  /** `ui/hud-cash-notice|crisis|restructure|grace`. 평시면 null. */
  frameKey: string | null;
  /** 가용 현금 = 회사 현금 − 이미 확보한 미집행 비용. 지금은 비용을 요청 때 바로 차감하므로 잔액과 같다. */
  availableCents: number;
  /** 운영 가능 개월 = 가용 현금 / 월 유지비. 유지비가 0 이면 null(무한). */
  runwayGameMonths: number | null;
  /** 미지급 유지비 누계. 0 보다 크면 구조조정 중이다. */
  unpaidCents: number;
  grace: GraceView | null;
  /** 지금 막힌 행동. 회생 수단(설비 가동 중지·매각·교사 지원 요청)은 막지 않는다. */
  blocked: RestructureBlockedAction[];
}

/** 팀에 적용 중인 이벤트 효과 한 줄(`effect` 가 화면 문구). */
export interface ActiveEffectView {
  /** 이벤트 발생 id — `auto:<classId>:m<월>` · `gm:<classId>:<requestId>`. */
  instanceId: string;
  /** `assets/data/macro-events.json` 의 id. */
  eventId: string;
  origin: 'auto' | 'teacher';
  headline: string;
  /** 사람이 읽는 효과 — 카탈로그의 `effect` 문구. */
  effect: string;
  /** 규칙 종류와 범위 — 'upkeep' + ['facility'] · 'researchCost' + ['docking'] 등. */
  kind: string;
  scope: string[];
  mult?: number;
  /** 적용 구간(게임 일, [시작, 끝)). */
  startDay: number;
  endDay: number;
}

// ──────────────────────────────── 이벤트 공시 ────────────────────────────────

/** 매크로 이벤트 문구 — `assets/data/macro-events.json` 한 항목의 표시용 칸. 신문 템플릿 `ui/macro-newspaper` 에 넣는다. */
export interface MacroEventView {
  id: string;
  tone: 'good' | 'bad';
  headline: string;
  subhead: string;
  kicker: string;
  body: string;
  period: string;
  effect: string;
}

/**
 * `S2C.EVENT_NOTICE` — 학급 전체에게 공시(균형안 §5 "적용 대상과 기간을 공시한다").
 * 교사 실행 이벤트는 `teacher` 가 있고 화면에 `ui/gm-badge` 를 붙여 공통 시장 사건과 **구분**한다.
 */
export interface EventNoticeMessage {
  instanceId: string;
  origin: 'auto' | 'teacher';
  event: MacroEventView;
  /** 대상 — 'all' 이면 학급의 운영 중인 모든 회사. */
  targets: 'all' | TeamId[];
  /** 대상 회사 이름(공개 정보). */
  targetNames: string[];
  /** 적용 시작 게임 일. */
  startDay: number;
  /** 지속 효과의 끝(게임 일, 배타). 일회성 지급(cash)은 null. */
  endDay: number | null;
  /** 일회성 지급액(센트) — cash 규칙만. 대상 팀마다 이 금액. */
  cashCents?: number;
  teacher?: { name: string; reason: string };
  appliedAtMs: number;
}

// ──────────────────────────────── 팀 경제 상태 ────────────────────────────────

/**
 * `TeamStateMessage` 에 M3 에서 더해진 칸 — 그 팀 구성원에게만 간다.
 * (교사는 `GmClassState.teams[]` 로 모든 팀을 본다.)
 */
export interface TeamEconomyView {
  companyStatus: CompanyStatus;
  upkeep: UpkeepBreakdownView;
  cash: CashStatusView;
  facilityStates: Record<FacilityKind, FacilityRunState>;
  /** 설비별 실제 낸 설치·업그레이드 비용(센트) — 매각 회수액(50%)의 근거. 시드로 받은 설비는 0. */
  facilityPaidCents: Record<FacilityKind, number>;
  /** 전문 연구원 수(초기 1명). 급여는 월 유지비에 포함된다. */
  researchers: number;
  /** 이 팀에 지금 적용 중인 이벤트 효과. */
  effects: ActiveEffectView[];
  /** 이미 받은 투자 마일스톤. */
  investments: InvestmentMilestone[];
  /** 유지비 정산이 끝난 날 수 — 게임 일 [0, upkeepSettledDay) 를 청구했다(날 d = 구간 [d, d+1)). 화면의 '정산 끝난 날'은 이 값 − 1 일이다. */
  upkeepSettledDay: number;
  /** 파산했으면 판정 시각과 재창업 지원금(0 이면 팀별 1회를 이미 썼다). 운영 중이면 null. */
  bankruptcy: { atMs: number; refoundGrantCents: number } | null;
  /** 같은 학생 팀의 이전 회사 id(재창업 전 회사) — 이전 학습 노트(작업·결과)는 읽기 전용으로 남는다. */
  predecessors: TeamId[];
}

/** 설비 한 칸의 공개 상태 — `FacilityUpdateMessage` 와 사옥 맵이 쓴다(등급·가동 상태는 정찰 가능한 공개 정보). */
export interface FacilityPublicState {
  tier: FacilityTier;
  state: FacilityRunState;
}
