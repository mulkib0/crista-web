/**
 * 교사 GM — 학급 생성·학생 계정 발급·운영 권한의 HTTP 규격(M3, 프로토콜 v3).
 * 근거: ARCHITECTURE.md §6(교사 GM 모드), 균형안 §2·§3.1·§4·§5·§6, 아트디렉션 §8.1.
 *
 * 인증: 모든 `/gm/**` 요청은 `Authorization: Bearer <sessionToken>` 이다(로그인 응답의 토큰, 룸 입장과 같은 검증).
 * 서버는 토큰 → 사용자 → `profiles.role = 'teacher'` 를 확인하고, 학급 경로(`/gm/classes/:classId/**`)는
 * 그 교사가 그 학급의 교사 구성원(`class_members.role = 'teacher'`)인지 확인한다. 아니면 403 `forbidden_role` · `forbidden_class`.
 *
 * 멱등: 상태를 바꾸는 요청은 모두 `requestId` 를 싣는다. 같은 교사·학급·requestId 재전송은 다시 적용하지 않고
 * `applied: false` 로 같은 결과를 돌려준다(원장 멱등 키 `gm:<classId>:<requestId>`).
 * 교사 개입은 원장·이벤트·조정 기록에 `gm` 표시로 남고 화면에 `ui/gm-badge` 를 붙인다(공통 시장 사건과 구분).
 * 교사 권한은 균형안에 적힌 것만 둔다 — 일시정지·배속·이벤트 실행·연구비 지급·판정 정정·회생 유예 조정·학급 복원.
 * v4(M4): 판정 정정 전표(`GmCorrectionRequest`) · 저장본(`SnapshotSummary`) · 학급 복원(`GmRestoreRequest`)을 켠다. 권한 바의 '정정' 칸이 열린다.
 */
import type {
  CashAlertLevel,
  CLevel,
  ClassId,
  ClockMode,
  CompanyStatus,
  CourseKind,
  DistrictType,
  FacilityKind,
  FacilityRunState,
  FacilityTier,
  GmAvatar,
  InvestmentMilestone,
  PublicTeam,
  TeamId,
  UserId,
} from './domain.ts';
import type {
  ActiveEffectView,
  CashStatusView,
  ClockView,
  EventNoticeMessage,
  MacroEventView,
  UpkeepBreakdownView,
} from './economy.ts';
import type { AnalystRating, AnalystReportView, GmMarketTeamView, OfferingView } from './market.ts';
import type { LlmFailureReason } from './llm.ts';
import type { CorrectablePipelineStepView, GmPipelineTeamView } from './pipeline.ts';

// ──────────────────────────────── 학급 ────────────────────────────────

export interface ClassSummary {
  id: ClassId;
  name: string;
  /** 학급 참여 코드(표시용) — M3 는 자가 가입이 없고 교사가 계정을 발급한다. */
  joinCode: string;
  course: CourseKind;
  status: 'active' | 'paused' | 'archived';
  teamCount: number;
  studentCount: number;
  createdAt: number;
}

/** `GET /gm/classes` — 이 교사가 맡은 학급(최근 것이 앞). */
export interface GmClassListResponse {
  ok: true;
  classes: ClassSummary[];
}

/**
 * `POST /gm/classes` — 학급 생성(교사가 그 학급의 교사 구성원이 된다).
 * 팀은 2~4개. v4 부터 **같은 지구를 여러 팀이 골라도 된다** — 큰 도시는 지구마다 부지 4곳(`LOTS_PER_DISTRICT`)이 있고, 서버가 요청 순서대로 부지 1·2·3·4 를 준다.
 * 잉크는 T1~T4 를 순서대로 준다. 각 회사는 만들 때 증시에 상장한다(초기 주가 $10.00 · 1,000,000주 — 균형안 §9.1).
 * 초기 연구비: 여러 차시 과정 = $6.000M, 장기 과정 = $6.000M + 기간 보정금(균형안 §3.1 — 보정금은 장기 과정에만).
 * 예정 게임 개월 = 수업 횟수 × 수업 길이 × 수업 배율 + (수업 횟수 − 1) × 간격 × 완속 배율.
 * 새 팀의 설비는 전부 등급 0(평면도)에서 시작한다(균형안 §7.1 "처음 표적 탐색실에 $1M 을 쓰고").
 * 시계는 **일시정지 상태로** 만들어지고, 교사가 첫 수업을 시작하면 흐른다.
 */
export interface CreateClassRequest {
  requestId: string;
  name: string;
  course: CourseKind;
  clockMode: ClockMode;
  /** 수업 기본 길이(분). 생략하면 50. */
  sessionMinutes?: number;
  /** 고정 모드 배율(현실 1일당 게임 일). 생략하면 7. */
  fixedGameDaysPerRealDay?: number;
  /** 예정 일정 — 기간 보정금 계산 근거. 수업 횟수(1~200)와 수업 사이 현실 간격(일, 0~60). 간격 수 = 수업 횟수 − 1. */
  plan: { sessions: number; gapRealDays: number };
  teams: Array<{ companyName: string; tickerSymbol: string; district: DistrictType; slogan?: string }>;
}

export interface CreateClassResponse {
  ok: true;
  /** false = 같은 requestId 로 이미 만든 학급(다시 만들지 않음). */
  applied: boolean;
  class: ClassSummary;
  teams: PublicTeam[];
  plannedGameMonths: number;
  durationSubsidyCents: number;
  /** 팀마다 받은 초기 연구비(센트). */
  initialFundCents: number;
}

// ──────────────────────────────── 학생 계정 발급 ────────────────────────────────

/**
 * `POST /gm/classes/:classId/students` — 학생 계정 발급(한 번에 최대 40명).
 * 아이디를 비우면 서버가 만든다(`<학급 접두>-<두 자리 번호>`). 비밀번호는 서버가 만들고 **이 응답에서 한 번만** 보인다 —
 * 서버는 비밀번호를 저장하지 않는다(GoTrue 가 해시로만 가진다). 발급 화면은 인쇄용 표를 보여 주고 닫으면 다시 볼 수 없다.
 * 공개 가입은 계속 꺼져 있다(`supabase/config.toml [auth] enable_signup = false`).
 */
export interface IssueStudentsRequest {
  requestId: string;
  students: Array<{
    displayName: string;
    teamId: TeamId;
    cLevel?: CLevel | null;
    /** 비우면 서버가 만든다. `^[a-z0-9][a-z0-9_-]{1,31}$`. */
    username?: string;
  }>;
}

export interface IssuedCredential {
  userId: UserId;
  username: string;
  displayName: string;
  teamId: TeamId;
  cLevel: CLevel | null;
  /** 이 응답에서 한 번만. 같은 requestId 재전송(applied: false)에는 싣지 않는다. */
  password?: string;
}

export interface IssueStudentsResponse {
  ok: true;
  applied: boolean;
  issued: IssuedCredential[];
}

/** `POST /gm/classes/:classId/students/:userId/password` — 비밀번호 재발급(그 학급 학생만). */
export interface ResetPasswordRequest {
  requestId: string;
}
export interface ResetPasswordResponse {
  ok: true;
  applied: boolean;
  username: string;
  /** 이 응답에서 한 번만. */
  password?: string;
}

// ──────────────────────────────── 학급 상태(교사 화면) ────────────────────────────────

export interface GmMemberView {
  userId: UserId;
  username: string;
  displayName: string;
  cLevel: CLevel | null;
  /** 지금 이 학급 월드에 접속해 있는가. */
  online: boolean;
}

/** 시찰 카드(`ui/gm-inspect-card`) 한 장 — 교사는 모든 팀의 잔액·자금 상태를 본다. 팀 칩만 팀 잉크를 쓴다. */
export interface GmTeamView {
  team: PublicTeam;
  status: CompanyStatus;
  balanceCents: number;
  upkeep: UpkeepBreakdownView;
  cash: CashStatusView;
  facilities: Record<FacilityKind, FacilityTier>;
  facilityStates: Record<FacilityKind, FacilityRunState>;
  members: GmMemberView[];
  activeJobs: number;
  investments: InvestmentMilestone[];
  /** 같은 학생 팀이 재창업한 횟수. */
  refoundCount: number;
  effects: ActiveEffectView[];
  /** 전문 연구원 수(v4 — 채용 · 해고). */
  researchers: number;
  /** 시세 요약(v4). 상장하지 않았으면 null. */
  market: GmMarketTeamView | null;
}

/** 학생이 교사에게 보낸 지원 요청(`C2S.SUPPORT_REQUEST`). 회생 수단이라 자금 상태와 무관하게 열려 있다(균형안 §4). */
export interface SupportRequestView {
  id: string;
  teamId: TeamId;
  companyName: string;
  userName: string;
  kind: 'grant' | 'grace' | 'other';
  message: string;
  status: 'open' | 'resolved';
  createdAt: number;
}

/** 교사 조작 기록 한 줄(원본을 지우지 않는 전표 형식 — 아트디렉션 §8.1). */
export interface GmAuditEntry {
  id: string;
  action: GmActionKind;
  actorName: string;
  targetTeamId: TeamId | null;
  /** 사람이 읽는 한 줄 — '헬릭사에 연구비 $0.500M 지급 · 사유: …'. */
  summary: string;
  reason: string | null;
  createdAt: number;
}

export type GmActionKind =
  | 'class.create'
  | 'students.issue'
  | 'password.reset'
  | 'clock.pause'
  | 'clock.resume'
  | 'clock.startSession'
  | 'clock.endSession'
  | 'clock.extendSession'
  | 'clock.setMode'
  | 'grant'
  | 'investment'
  | 'event'
  | 'grace.adjust'
  | 'support.resolve'
  // ── v4 (M4)
  | 'correction'
  | 'snapshot'
  | 'restore'
  // ── v9 (동기부여 Step 2)
  /** 학급 최종 정산 — 팬텀스톡을 학생마다 한 번(`POST /gm/classes/:classId/phantom-settle`). */
  | 'phantom.settle'
  // ── v10 (동기부여 Step 3)
  /** 연례 바이오 학회 폐회 · 시상(`POST /gm/classes/:classId/symposium-close`). */
  | 'symposium.close';

/** 교사가 고를 수 있는 사건 한 줄 — 카탈로그 문구 + 효과가 지금 구현돼 있는가. */
export interface GmEventOption extends MacroEventView {
  /** 이 마일스톤에서 효과가 실제로 적용되는가. false 면 실행할 수 없다(임상·심사·시장 수요는 후속 단계). */
  implemented: boolean;
  /** 규칙 요약 — 'upkeep facility ×1.20 · 3게임 월'. */
  ruleSummary: string;
}

/**
 * `GET /gm/classes/:classId` 응답 본문이자 `S2C.GM_STATE` — 그 학급 월드에 들어온 **교사에게만** 보낸다(바뀔 때, 초당 1회 이하).
 */
export interface GmClassState {
  class: ClassSummary;
  clock: ClockView;
  teams: GmTeamView[];
  /** 학급에 적용 중인 이벤트 효과 전체. */
  effects: ActiveEffectView[];
  /** 최근 공시(최신이 앞, 최대 20). */
  recentEvents: EventNoticeMessage[];
  supportRequests: SupportRequestView[];
  /** 최근 교사 조작(최신이 앞, 최대 30). */
  audit: GmAuditEntry[];
  eventOptions: GmEventOption[];
  /** 자동 이벤트 추첨 현황 — 상한 판단 근거(균형안 §5). */
  autoEvents: { lastMonth: number | null; thisSession: number; maxPerSession: number; outOfClassWindowHours: number };
  /** 이 학급의 팀 경고 단계 요약 — 권한 바 옆 표식용. */
  alertCounts: Record<CashAlertLevel, number>;
  // ── v4 (M4)
  /** 증시 요약 — 최근 리포트(최신이 앞, 최대 10) · 열린 증자. 종목별 요약은 `teams[].market`. */
  market: { reports: AnalystReportView[]; offerings: OfferingView[]; open: boolean };
  /** 정정할 수 있는 최근 판정 — 도킹 결과(최신이 앞, 최대 10) · 파이프라인 단계 판정(v5, 최신이 앞, 최대 10). 리포트는 `market.reports`. */
  correctable: { experiments: CorrectableExperimentView[]; pipelineSteps: CorrectablePipelineStepView[] };
  /** 최근 정정 전표(최신이 앞, 최대 20). */
  corrections: CorrectionView[];
  /** 최근 저장본(최신이 앞, 최대 20)과 전체 수. 목록 전부는 `GET …/snapshots`. */
  snapshots: { recent: SnapshotSummary[]; total: number };
  /** 학급 작업 세대 — 복원하면 1 오른다. */
  generation: number;
  /** LLM 상태 — 워커가 알려 준 값과 이 학급의 최근 1시간 규칙 기반 대체 수(교사가 'AI 생성이 왜 안 나오나' 를 알 수 있게). */
  llm: { enabled: boolean; model: string | null; callsLastHour: number; fallbacksLastHour: number; lastFailure: LlmFailureReason | null };
  // ── v5 (M5)
  /** 회사별 파이프라인(점수 · 물성 포함 — 교사만). 운영 중 · 파산 회사(무효 제외). */
  pipeline: GmPipelineTeamView[];
}

// ──────────────────────────────── v4 — 판정 정정 (균형안 §6) ────────────────────────────────

/** 정정할 수 있는 도킹 결과 한 줄. */
export interface CorrectableExperimentView {
  jobId: string;
  teamId: TeamId;
  companyName: string;
  /** '도네페질 · AChE(4EY7)'. */
  summary: string;
  /** 원본 결합 자유에너지(kcal/mol). 실패 작업이면 null. */
  affinityKcal: number | null;
  status: 'succeeded' | 'failed';
  atMs: number;
  corrected: boolean;
}

/**
 * 정정 대상(균형안 §6 '최종 판정 변경'). 원본은 언제나 보존하고 교사 판정을 따로 적는다.
 * - `analyst_report`: AI · 규칙 리포트의 투자의견 · 변동률 · 문구를 바로잡는다. 펀더멘털은 F × (1 + 새 Δ) / (1 + 원래 Δ) 로 다시 계산한다.
 * - `experiment`: 도킹 결과의 판정값을 바로잡는다(`affinityKcal: null` = 판정에 쓰지 않음). 그 결과로 나온 리포트가 있으면 그 리포트의 Δ 를 새 값의 규칙 기본값으로 다시 계산한다.
 * - `bankruptcy`: 파산 판정 번복 — 거래 정지(`suspended`) 중이고 재창업하지 않은 회사만(아니면 `already_settled`). 회사를 운영 중으로 되돌리고, 회생 유예를 지금부터 `graceMinutes` 로 다시 시작한다(1~2,880분). 종목은 거래를 재개한다.
 * - `ledger`: 회사 연구비를 ± 바로잡는다(원장 `correction`, gm). 빼는 정정은 잔액을 넘을 수 없다(`insufficient_funds`). 더하는 정정은 미지급부터.
 * - `pipeline_step`(v5): IND · 임상 · 최종 단계의 판정(통과 ↔ 실패)을 바로잡는다. 원본 판정(점수 · 흔들림)은 그대로 두고 `PipelineStepView.correction` 으로 보인다.
 *   그 파이프라인에서 **가장 최근에 판정된 단계**이고 뒤 단계가 시작되지 않았을 때만(아니면 `already_settled`). 파이프라인 상태를 새 결과대로 바꾸고,
 *   그 단계로 나온 리포트가 있으면 Δ 를 새 결과의 규칙 기본값으로 다시 계산한다(균형안 §10.7).
 * 이미 체결된 거래는 그대로 둔다(균형안 §6). 정정 직전에 저장본(`before_correction`)을 남긴다.
 */
export type CorrectionTarget =
  | { kind: 'analyst_report'; reportId: string; rating?: AnalystRating; fundamentalChangePct?: number; headline?: string; comment?: string }
  | { kind: 'experiment'; jobId: string; affinityKcal: number | null; note: string }
  | { kind: 'bankruptcy'; teamId: TeamId; graceMinutes: number }
  | { kind: 'ledger'; teamId: TeamId; amountCents: number }
  | { kind: 'pipeline_step'; stepId: string; outcome: 'passed' | 'failed' };

/** `POST /gm/classes/:classId/corrections` — 정정 전표 한 장(사유 필수, 1~200자). 응답은 `GmCommandResponse`. */
export interface GmCorrectionRequest {
  requestId: string;
  target: CorrectionTarget;
  reason: string;
}

/** 정정 전표(`ui/gm-correction-slip`) — 교사 화면 기록. 전후 값은 사람이 읽는 짧은 문자열로 싣는다. */
export interface CorrectionView {
  id: string;
  kind: CorrectionTarget['kind'];
  /** 대상 id — reportId · jobId · teamId · stepId(v5). */
  targetId: string;
  teamId: TeamId;
  companyName: string;
  before: Record<string, string>;
  after: Record<string, string>;
  reason: string;
  byName: string;
  atMs: number;
  /** '헬릭사 리포트 정정 · BUY → HOLD · +6.0% → +1.0%'. */
  summary: string;
  /** 정정으로 바뀐 주가(있으면). */
  price?: { beforeUsd: number; afterUsd: number };
}

/** `S2C.CORRECTION_NOTICE` — 학급 전체 공시. 교사 개입이라 화면에 `ui/gm-badge`. 비공개 값(잔액)은 싣지 않는다 — `ledger` 정정은 '연구비 정정' 사실만. */
export interface CorrectionNoticeMessage {
  classId: ClassId;
  id: string;
  kind: CorrectionTarget['kind'];
  teamId: TeamId;
  companyName: string;
  summary: string;
  reason: string;
  byName: string;
  atMs: number;
  price?: { beforeUsd: number; afterUsd: number };
}

// ──────────────────────────────── v4 — 저장본 · 학급 복원 (균형안 §6) ────────────────────────────────

/** 저장본을 남긴 까닭 — 현실 5분마다 · 수업 시작 · 종료 · 정정 직전 · 복원 직전 · 교사 수동. */
export type SnapshotReason = 'periodic' | 'session_start' | 'session_end' | 'before_correction' | 'before_restore' | 'manual';

export interface SnapshotSummary {
  id: string;
  reason: SnapshotReason;
  createdAtMs: number;
  gameDays: number;
  date: { year: number; month: number; day: number };
  generation: number;
  /** 그 시점의 회사 요약(교사 확인 화면용). */
  teams: Array<{ teamId: TeamId; companyName: string; status: CompanyStatus; balanceCents: number; priceUsd: number | null }>;
  /** 저장본 크기(바이트). */
  sizeBytes: number;
}

/** `GET /gm/classes/:classId/snapshots` — 7일 안의 저장본(최신이 앞). */
export interface GmSnapshotListResponse {
  ok: true;
  snapshots: SnapshotSummary[];
}

/** `POST /gm/classes/:classId/snapshots` — 교사 수동 저장(사유 선택). 응답은 `GmCommandResponse`. */
export interface GmSnapshotRequest {
  requestId: string;
  reason?: string;
}

/**
 * `POST /gm/classes/:classId/restore` — 학급 전체를 저장본 시점으로 되돌린다(균형안 §6 '큰 오류의 예외 복구').
 * 순서: 학급 일시정지 → 복원 직전 저장본(`before_restore`) → 한 트랜잭션으로 기업 · 계좌 · 포지션 · 상장 · 증자 · 시계 · 이벤트를 저장본 값으로 →
 * 작업 세대 + 1 → 진행 중 작업 정리(저장본보다 먼저 요청 · 과금된 작업은 환급, 뒤에 생긴 작업은 복원 보정으로 이미 돌려받음) →
 * `RESTORE_NOTICE` · `WORLD_CHANGED { reason: 'restore' }`. 원장은 지우지 않고 보정 한 줄(`restore`)로 저장본 잔액에 맞춘다.
 * 복원 뒤 학급은 일시정지 상태로 남는다 — 교사가 확인하고 재개한다. 그 시점 이후의 **정상 플레이도 함께 되돌아간다**(확인 화면에 표시).
 */
export interface GmRestoreRequest {
  requestId: string;
  snapshotId: string;
  reason: string;
  /** 실수 방지 — 정확히 'RESTORE'. 아니면 400 `bad_request`. */
  confirm: 'RESTORE';
}

/** `S2C.RESTORE_NOTICE` — 학급 전체. */
export interface RestoreNoticeMessage {
  classId: ClassId;
  restoreId: string;
  snapshotId: string;
  snapshotAtMs: number;
  snapshotDate: { year: number; month: number; day: number };
  byName: string;
  reason: string;
  /** 복원 뒤 세대. */
  generation: number;
  atMs: number;
}

export interface GmClassStateResponse {
  ok: true;
  state: GmClassState;
}

// ──────────────────────────────── 운영 명령 ────────────────────────────────

/**
 * `POST /gm/classes/:classId/clock` — 일시정지·재개·수업 시작/종료/연장·속도 모드(균형안 §2).
 * - `startSession`: 일시정지 중이면 재개하고, 지금부터 `minutes`(생략 시 학급 기본 길이) 동안 수업 중 배율. 이미 수업 중이면 무시.
 * - `extendSession`: 진행 중 수업의 예정 종료 시각을 늦춘다(1~120분).
 * - `endSession`: 지금 완속으로 바꾼다(예정 시각 전 수동 종료).
 * - `setMode`: 가변/고정 전환·고정 배율 변경. 고정 배율 상한은 균형안의 가장 빠른 배율(여러 차시 수업 중 = 현실 50분당 12게임 월)이다.
 * 배율이 바뀌면 바뀌기 전 구간을 먼저 계산하고 새 배율은 그 뒤에만 적용한다 — 소급하지 않는다.
 */
export type GmClockCommand =
  | { requestId: string; action: 'pause'; reason?: string }
  | { requestId: string; action: 'resume'; reason?: string }
  | { requestId: string; action: 'startSession'; minutes?: number; reason?: string }
  | { requestId: string; action: 'endSession'; reason?: string }
  | { requestId: string; action: 'extendSession'; minutes: number; reason?: string }
  | {
      requestId: string;
      action: 'setMode';
      mode: ClockMode;
      fixedGameDaysPerRealDay?: number;
      /** 수업 기본 길이(분, 1~600) 변경 — 다음 수업부터 적용. */
      sessionMinutes?: number;
      reason?: string;
    };

/** `POST /gm/classes/:classId/grants` — 교사 연구비 지급(양수만, 사유 필수). 원장 `teacher_grant` + gm 표시. */
export interface GmGrantRequest {
  requestId: string;
  teamId: TeamId;
  amountCents: number;
  reason: string;
}

/**
 * `POST /gm/classes/:classId/investments` — 투자 마일스톤 승인(Series A $3.000M · Series B $5.000M, VC 지구 +15%).
 * 같은 회사·같은 마일스톤은 한 번만(재전송·재승인으로 재지급하지 않는다 — 균형안 §3.1). 원장 `investment` + gm 표시.
 */
export interface GmInvestmentRequest {
  requestId: string;
  teamId: TeamId;
  milestone: InvestmentMilestone;
  reason: string;
}

/** `POST /gm/classes/:classId/events` — 교사 실행 이벤트(자동 추첨과 별도, 대상·효과·기간·사유 기록). */
export interface GmEventRequest {
  requestId: string;
  /** 카탈로그 id. `implemented: false` 인 사건은 400 `bad_request`. */
  eventId: string;
  targets: 'all' | TeamId[];
  reason: string;
}

/** `POST /gm/classes/:classId/grace` — 회생 유예 조정(± 분, 사유 필수). 유예 중인 팀만. 균형안 §4. */
export interface GmGraceAdjustRequest {
  requestId: string;
  teamId: TeamId;
  /** 늘리면 양수, 줄이면 음수. 조정 뒤 총 길이는 0 미만이 되지 않는다. */
  adjustMinutes: number;
  reason: string;
}

/** `POST /gm/classes/:classId/support/:id/resolve` — 지원 요청 처리 완료 표시. */
export interface GmSupportResolveRequest {
  requestId: string;
}

/** 룸 메시지 `C2S.GM_AVATAR` — 교사 아바타 바꾸기(월드 안의 표시라 HTTP 가 아니라 룸 메시지다). 교사만. */
export interface GmAvatarMessage {
  avatar: GmAvatar;
}

/** 운영 명령 공통 응답. */
export interface GmCommandResponse {
  ok: true;
  /** false = 같은 requestId 가 이미 처리됐다(다시 적용하지 않음). */
  applied: boolean;
  state: GmClassState;
}
