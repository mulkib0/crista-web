/**
 * 학생 동기부여 Step 1(프로토콜 v8, 2026-10-22) — ① 사옥 외관 진화(`hqTier` 1 → 2 → 3) ② 실패 데이터 바운티(결과지 창 안 '실패 기전 분석' 탭).
 * 설계 단일 소스: docs/2026-10-22-gamification-motivation-design.md §2.1 · §3.1(사용자 결정 #2 · #3).
 * 구현 결정 · 설계서와 달라진 점: docs/2026-10-22-gamification-step1-brief.md.
 *
 * ## 사옥 등급
 * 서버가 **지금 사실**(설비 · 투자 · 특허 · 단계 판정)에서 순수 함수(`@crista/game-rules` `hqTierOf`)로 정하고 `biotech_teams.hq_tier` 에 적는다.
 * 바뀌면 학급 전체에 `S2C.HQ_TIER`(공개 정보 — 도시 외관), 그 회사 구성원에게는 `TEAM_STATE.hq`(다음 등급 조건표)를 보낸다.
 * 정정 · 복원 · 매각으로 사실이 바뀌면 등급도 따라 바뀐다(내려갈 수 있다). 시가총액은 조건이 아니다(설계서 §3.1).
 *
 * ## 바운티
 * 보류(CRL)된 IND · 임상 단계, 기준 미달(ΔG > −7.0 kcal/mol, 결합력 p = 0)인 실제 도킹, 위험 신호 '높음'(hERG · 간독성)인 실제 ADMET 의
 * 결과지에서 Q1(실패 축) · Q2(감점 요인) · Q3(개선 처방)을 제출한다. 서버가 균형안 §10.3 · §10.4 순수 함수로 채점하고, 통과하면
 * **실제 낸 비용 × 환급률**(IND · 1상 50% · 2상 40% · 3상 30% · 실험 40%)을 원장 `data_bounty_refund` 로 한 번 넣는다(미지급 유지비부터).
 * 오답은 차감 없이 60초 뒤 다시 낸다. 정답 자체는 알려 주지 않는다(문항별 맞음 · 틀림만).
 */
import type { TeamId } from './domain.ts';
import type { PipelineStepKind } from './pipeline.ts';

// ──────────────────────────────── 사옥 등급 ────────────────────────────────

export type HqTier = 1 | 2 | 3;

/** 사옥 등급 조건 한 줄 — 화면은 `met` 이면 파란 펜 ✓, 아니면 연필 □. `progress` 가 있으면 '2/3' 처럼 보인다. */
export interface HqRequirementView {
  id: 'labs3' | 'seriesA' | 'patentOrInd' | 'labs4' | 'security' | 'seriesB' | 'phase3OrApproval';
  label: string;
  met: boolean;
  progress?: { have: number; need: number };
}

/** `TeamStateMessage.hq` — 그 회사 구성원에게만(조건표에 특허 · IND 같은 회사 사실이 들어간다). */
export interface HqProgressView {
  tier: HqTier;
  /** 다음 등급. 이미 3이면 null. */
  next: HqTier | null;
  /** 다음 등급의 조건(이미 3이면 빈 배열). */
  requirements: HqRequirementView[];
}

/** `S2C.HQ_TIER` — 학급 전체(공개). 도시 맵 건물 프레임을 `building/hq-t<tier>` 로 바꾸고, 올라가면 증축 연출을 올린다. */
export interface HqTierMessage {
  teamId: TeamId;
  companyName: string;
  tier: HqTier;
  previousTier: HqTier;
  frame: string;
  /** 사실이 바뀌어 올라갔다(축하 연출). 복원 · 시작 동기화 · 내려감은 false — 프레임만 바꾼다. */
  celebrate: boolean;
}

// ──────────────────────────────── 바운티 — 대상 · 문항 ────────────────────────────────

export type BountyTarget = { kind: 'step'; stepId: string } | { kind: 'job'; jobId: string };

/** 채점 종류 — 단계(IND · 임상) · 도킹 기준 미달 · ADMET 위험 높음. 문항 선택지가 종류마다 다르다. */
export type BountyKind = 'step' | 'docking' | 'admet';

/** Q1 실패 축. */
export type BountyAxis =
  // 단계
  | 'safety'
  | 'efficacy'
  | 'both'
  // 도킹
  | 'binding'
  | 'absorption'
  // ADMET
  | 'herg'
  | 'hepatotoxicity'
  | 'herg_and_hepatotoxicity';

/** Q2 감점 · 원인 요인. */
export type BountyFactor =
  // 단계 — 안전 S
  | 'herg_risk'
  | 'hepatotox_risk'
  | 'iv_peak'
  | 'high_dose'
  // 단계 — 효능 E
  | 'weak_affinity'
  | 'poor_absorption'
  | 'low_bbb'
  | 'low_dose'
  // 단계 — 흔들림
  | 'cohort_noise'
  // ADMET — 물성 원인
  | 'basic_amine'
  | 'high_clogp'
  | 'structural_alert'
  | 'high_mw';

/** Q3 개선 처방. */
export type BountyRemedy =
  | 'dose_down'
  | 'to_oral'
  | 'to_iv'
  | 'to_transdermal'
  | 'redesign_amine'
  | 'redesign_alert'
  | 'lower_clogp'
  | 'improve_affinity'
  | 'same_retry';

export const BOUNTY_AXIS_LABEL: Record<BountyAxis, string> = {
  safety: '안전성(S)이 기준 미달',
  efficacy: '효능(E)이 기준 미달',
  both: '효능 · 안전성 둘 다 기준 미달',
  binding: '결합력이 기준 미달(ΔG > −7.0)',
  absorption: '흡수가 기준 미달',
  herg: 'hERG 심장독성 위험이 높음',
  hepatotoxicity: '간독성 위험이 높음',
  herg_and_hepatotoxicity: 'hERG · 간독성 둘 다 높음',
};

export const BOUNTY_FACTOR_LABEL: Record<BountyFactor, string> = {
  herg_risk: 'hERG 위험(보통 · 높음) — 위험 배율 R',
  hepatotox_risk: '간독성 위험(보통 · 높음) — 위험 배율 R',
  iv_peak: '정맥주사 혈중 피크(K 1.25)',
  high_dose: '고용량 독성(Dt ≥ 30)',
  weak_affinity: '약한 결합력(p < 0.6)',
  poor_absorption: '흡수 부족(A < 1)',
  low_bbb: '뇌 노출 부족(B < 1, CNS 표적)',
  low_dose: '저용량 효능(De < 1)',
  cohort_noise: '환자 코호트 흔들림(음수 n) 때문에만 미달',
  basic_amine: '염기성 지방족 아민',
  high_clogp: '높은 지용성(cLogP ≥ 3.7)',
  structural_alert: '구조 경고(방향족 니트로 · 방향족 아민)',
  high_mw: '큰 분자량(MW > 500)',
};

export const BOUNTY_REMEDY_LABEL: Record<BountyRemedy, string> = {
  dose_down: '용량을 낮춘다',
  to_oral: '경구 제형으로 바꾼다',
  to_iv: '정맥주사로 바꾼다',
  to_transdermal: '경피 패치로 바꾼다',
  redesign_amine: '염기성 아민을 없애는 유도체로 재설계',
  redesign_alert: '구조 경고 작용기를 안전한 작용기로 치환',
  lower_clogp: '극성 작용기를 더해 cLogP 를 낮춘다',
  improve_affinity: '결합 상호작용을 늘려 결합력을 높인다',
  same_retry: '같은 프로토콜로 다시 한다',
};

/** 종류마다 화면에 보이는 선택지(순서 그대로). 정답은 서버만 안다. */
export const BOUNTY_CHOICES: Record<BountyKind, { axes: readonly BountyAxis[]; factors: readonly BountyFactor[]; remedies: readonly BountyRemedy[] }> = {
  step: {
    axes: ['safety', 'efficacy', 'both'],
    factors: ['herg_risk', 'hepatotox_risk', 'iv_peak', 'high_dose', 'weak_affinity', 'poor_absorption', 'low_bbb', 'low_dose', 'cohort_noise'],
    remedies: ['dose_down', 'to_oral', 'to_iv', 'to_transdermal', 'redesign_amine', 'redesign_alert', 'improve_affinity', 'same_retry'],
  },
  docking: {
    axes: ['binding', 'safety', 'absorption'],
    factors: ['weak_affinity', 'cohort_noise', 'poor_absorption', 'herg_risk'],
    remedies: ['improve_affinity', 'same_retry', 'dose_down', 'to_iv'],
  },
  admet: {
    axes: ['herg', 'hepatotoxicity', 'herg_and_hepatotoxicity'],
    factors: ['basic_amine', 'high_clogp', 'structural_alert', 'high_mw'],
    remedies: ['redesign_amine', 'lower_clogp', 'redesign_alert', 'dose_down', 'same_retry'],
  },
};

/** 환급률(설계서 §2.1 (B), 사용자 결정 #3) — 실제 낸 비용(`costCents`)에 곱한다. 최종 허가 심사는 대상이 아니다. */
export const BOUNTY_REFUND_RATE: Record<Exclude<PipelineStepKind, 'final'> | 'experiment', number> = {
  ind: 0.5,
  phase1: 0.5,
  phase2: 0.4,
  phase3: 0.3,
  experiment: 0.4,
};

export const BOUNTY_LIMITS = {
  /** 오답 뒤 다시 낼 때까지(현실 초). 피어리뷰 테이블 소품(Step 4)이면 45초. */
  retrySeconds: 60,
  /** 실험(도킹 · ADMET) 바운티 — 계보(재창업 포함)마다 최대 건수. */
  experimentClaimsMax: 5,
  /** 계보마다 바운티 합계 상한(센트) — $0.900M. */
  campaignCapCents: 90_000_000,
} as const;

// ──────────────────────────────── 바운티 — 상태 · 메시지 ────────────────────────────────

/**
 * 대상 하나의 바운티 상태(그 회사 구성원에게만).
 * - `eligible` 낼 수 있다 · `claimed` 이미 받았다 · `cooldown` 오답 뒤 기다리는 중 · `capped` 계보 상한을 다 썼다
 * - `not_failed` 실패 · 기준 미달이 아니다 · `not_paid` 무료 · 테스트 결과 · `not_current` 이전 세대 · 이전 회사 · 다른 회사의 것
 * - `final_step` 최종 허가 심사(대상 아님) · `corrected` 교사 정정으로 점수상 실패 원인이 없다 · `unavailable` 지금 계산할 수 없다(워커)
 */
export type BountyEligibility =
  | 'eligible'
  | 'claimed'
  | 'cooldown'
  | 'capped'
  | 'not_failed'
  | 'not_paid'
  | 'not_current'
  | 'final_step'
  | 'corrected'
  | 'unavailable';

export interface BountyStatusView {
  target: BountyTarget;
  kind: BountyKind;
  eligibility: BountyEligibility;
  /** 사람이 읽는 까닭(eligible 이 아니면). */
  note?: string;
  /** 통과하면 받을 금액(센트) — 실제 낸 비용 × 환급률, 계보 상한 남은 만큼. `claimed` 면 받은 금액. */
  refundCents: number;
  /** 환급률(0~1)과 그 비용(센트). */
  rate: number;
  costCents: number;
  /** 지금까지 낸 횟수(이번 서버 실행 동안). */
  attempts: number;
  /** `cooldown` 이면 다시 낼 수 있는 현실 시각(ms). */
  retryAtMs: number | null;
  /** 계보 바운티 누계 · 상한 · 실험 건수(센트 · 건). */
  campaign: { refundedCents: number; capCents: number; experimentClaims: number; experimentClaimsMax: number };
}

/** `C2S.BOUNTY_CHECK` — 결과지의 '실패 기전 분석' 탭을 열었다. 서버가 `S2C.BOUNTY_STATUS` 로 답한다. 회사 구성원만. */
export interface BountyCheckMessage {
  target: BountyTarget;
}

export interface BountyAnswers {
  axis: BountyAxis;
  /** 해당하는 요인을 **모두** 고른다(빠뜨리거나 더하면 틀림). */
  factors: BountyFactor[];
  /** 효과가 있는 처방 하나. */
  remedy: BountyRemedy;
}

/** `C2S.BOUNTY_SUBMIT` — 실패 원인 분석 리포트 제출. 같은 requestId 재전송은 같은 결과를 돌려준다. */
export interface BountySubmitMessage {
  requestId: string;
  target: BountyTarget;
  answers: BountyAnswers;
}

/** `S2C.BOUNTY_STATUS` — 요청한 사람에게. 통과 · 정정 회수 뒤에는 그 회사 구성원 모두에게. */
export interface BountyStatusMessage {
  status: BountyStatusView;
}

/** `S2C.BOUNTY_RESULT` — 제출한 사람에게. 문항별 맞음 · 틀림(정답은 싣지 않는다) · 입금액. */
export interface BountyResultMessage {
  requestId: string;
  target: BountyTarget;
  passed: boolean;
  correct: { axis: boolean; factors: boolean; remedy: boolean };
  /** 이번에 넣은 금액(센트). 오답 · 재전송이면 0. */
  refundedCents: number;
  /** 같은 트랜잭션에서 낸 미지급 유지비(센트). */
  arrearsPaidCents: number;
  /** 문항별 짧은 되짚기(틀린 문항만 — 어디를 다시 볼지). */
  hints: string[];
  status: BountyStatusView;
}

/** 대상 키(스토어 · 서버 지도) — `step:<id>` · `job:<id>`. */
export function bountyTargetKey(target: BountyTarget): string {
  return target.kind === 'step' ? `step:${target.stepId}` : `job:${target.jobId}`;
}

// ════════════════════════════════ Step 2 (프로토콜 v9, 2026-10-23) ════════════════════════════════
// 사옥 전략 회의실 CRO 의뢰 보드 — 설계서 축 1(§1.1 ~ §1.4, 사용자 결정 #1), 구현 결정 docs/2026-10-23-gamification-step2-brief.md.
// 문항은 문제 은행 시드 + `@crista/game-rules` 순수 함수(`score.ts`)로 만들고 서버가 채점한다(LLM 채점 없음).

/** 일반 3문항 세트 · 심층 사례 의뢰. */
export type CroTrack = 'general' | 'deep';
/** 분야(권장 담당) — 생명과학(CSO) · 의약화학(CTO) · AI · 생물정보(CTO/CSO). 심층 의뢰는 세 분야를 섞은 사례다. */
export type CroField = 'bio' | 'medchem' | 'ai';
/**
 * 문항 유형(설계서 §1.2 표) — A1 표적–기전–질환 · A2 효소 저해 속도론 · A3 질환–유전자 검증 근거 ·
 * B1 Ro5 위반 · B2 BBB 등급 · B3 hERG 위험 · B4 간독성 경고 수리 · C1 ΔG → 결합력 p · C2 pLDDT 포켓 · C3 과적합 진단 ·
 * D1 심층 사례 결론(개발 위험) · EV 근거 문항(첫 문항의 판단 근거가 된 규칙).
 */
export type CroQuestionType = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'B4' | 'C1' | 'C2' | 'C3' | 'D1' | 'EV';

export const CRO_FIELD_LABEL: Record<CroField, string> = {
  bio: '생명과학',
  medchem: '의약화학',
  ai: 'AI · 생물정보',
};

export const CRO_TRACK_LABEL: Record<CroTrack, string> = {
  general: '일반 의뢰(3문항 세트)',
  deep: '심층 분석 의뢰',
};

/** 보상(센트) — 설계서 §1.3. 일반 3/3 $0.030M · 2/3 $0.015M + 근거 $0.010M, 심층 결론 $0.080M + 근거 $0.020M. */
export const CRO_REWARD_CENTS = {
  general: { full: 3_000_000, partial: 1_500_000, bonus: 1_000_000 },
  deep: { base: 8_000_000, bonus: 2_000_000 },
} as const;

/** 상한 — 설계서 §1.3 '다중 안전캡'. 금액은 센트. */
export const CRO_LIMITS = {
  /** 게임 연도(360게임 일)마다 수주할 수 있는 건수(수주 때 예약). */
  generalPerYear: 3,
  deepPerYear: 2,
  gameDaysPerYear: 360,
  /** 수업 1차시(`sessionSeq`)마다 CRO 지급 합계. */
  sessionCapCents: 60_000_000,
  /** 계보(`lineageId`)마다 CRO + 연례 학회 합계 — 재창업으로 초기화되지 않는다. */
  campaignCapCents: 120_000_000,
  /** 오답 뒤 변형 문항까지(현실 초). 에스프레소 머신 소품이면 45초(Step 3). */
  retrySeconds: 60,
} as const;

export interface CroChoiceView {
  id: string;
  label: string;
}

/** 문항 하나 — 화면에 그대로 그린다. 정답은 싣지 않는다. */
export interface CroQuestionView {
  /** 'q1' · 'q2' · 'q3' · 'ev'. */
  id: string;
  type: CroQuestionType;
  /** 본 문항 · 근거 문항. */
  role: 'main' | 'evidence';
  prompt: string;
  /** 자료 표(물성표 · 반응속도 · pLDDT · 학습 곡선). */
  table?: { columns: string[]; rows: string[][] };
  choices: CroChoiceView[];
  /** 해당하는 것을 모두 고르는 문항인가. */
  multi: boolean;
}

/** 문항지 — 시드 하나로 결정적이다(같은 시드 = 같은 문항 · 같은 보기 순서). */
export interface CroSheetView {
  /** 0 = 첫 문항지, 1 = 오답 뒤 변형 문항지. */
  variant: 0 | 1;
  title: string;
  /** 심층 사례 설명(자료 요약). */
  brief?: string;
  questions: CroQuestionView[];
  /** (v10) 학술 포스터 보드 소품 — 검토된 규칙 참고 카드 1장(첫 문항의 판단 규칙). 소품이 없으면 생략. */
  reference?: { questionId: string; rule: string };
}

/** 한 번 낸 답안의 채점(문항별 맞음 · 틀림 · 해설). */
export interface CroAttemptView {
  variant: 0 | 1;
  correct: Record<string, boolean>;
  /** 본 문항 맞은 수(일반 0~3 · 심층 0~3). */
  mainCorrect: number;
  evidenceCorrect: boolean;
  /** 이 답안으로 받을 보상(상한 적용 전, 센트). */
  rewardCents: number;
  /** 문항별 해설(채점 뒤에만 — 정답 근거 한두 문장). */
  explanations: Record<string, string>;
}

/**
 * 계약 상태.
 * - `open` 풀이 중(1차) · `retry` 1차가 만점이 아니라 변형 문항을 기다리거나 푸는 중 · `paid` 보상을 받고 닫힘 ·
 *   `note` 보상 없이 무료 학습 노트로 닫힘(해설 공개) · `practice` 상한 소진 뒤 연습(현금 없음).
 */
export type CroContractStatus = 'open' | 'retry' | 'paid' | 'note' | 'practice';

export interface CroContractView {
  id: string;
  track: CroTrack;
  field: CroField;
  status: CroContractStatus;
  /** 연습 의뢰(예약 · 지급 없음). */
  practice: boolean;
  acceptedByName: string;
  acceptedAtMs: number;
  /** 수주한 게임 연도(0부터). */
  gameYear: number;
  /** 지금 풀 문항지(닫힌 계약이면 마지막 문항지). */
  sheet: CroSheetView;
  attempts: CroAttemptView[];
  /** `retry` 면 변형 문항을 낼 수 있는 현실 시각(ms). */
  retryAtMs: number | null;
  /** 받은 보상(센트) — 닫힌 계약만. 상한으로 깎였으면 깎인 값. */
  paidCents: number;
  /** 이 의뢰의 최대 보상(센트). */
  maxCents: number;
}

export interface CroLimitsView {
  gameYear: number;
  general: { used: number; max: number };
  deep: { used: number; max: number };
  /** 이번 차시 CRO 지급 합계 · 상한. 수업 기록이 없으면 seq null. */
  session: { seq: number | null; paidCents: number; capCents: number };
  /** 계보 CRO + 학회 합계 · 상한. */
  campaign: { paidCents: number; capCents: number };
  retrySeconds: number;
}

/** 보드의 의뢰 카드(포스트잇) 한 장. */
export interface CroOfferView {
  track: CroTrack;
  field: CroField;
  title: string;
  summary: string;
  maxCents: number;
  /** 지금 수주할 수 있는가(현금 의뢰). 아니면 `practice` 로만. */
  available: boolean;
  /** 사람이 읽는 까닭(수주할 수 없을 때). */
  note?: string;
}

/** `S2C.CRO_BOARD` — 보드 전체(그 회사 구성원 · 요청한 사람). */
export interface CroBoardMessage {
  teamId: TeamId;
  /** 방문자 · 교사 · 파산 회사 — 읽기만. */
  readOnly: boolean;
  offers: CroOfferView[];
  /** 진행 중 계약 + 최근 닫힌 계약(최신이 앞, 최대 8). */
  contracts: CroContractView[];
  limits: CroLimitsView;
  /** 읽기만인 까닭. */
  note?: string;
}

/** `C2S.CRO_BOARD` — 보드를 연다(전략 회의실 상호작용 뒤) · 새로 받는다. */
export interface CroBoardRequestMessage {
  /** 지금 서 있는 회의실(`strategy-room`). 생략하면 장소와 무관하게 읽기만. */
  interactableId?: string;
}

/** `C2S.CRO_ACCEPT` — 수주. 같은 requestId 재전송은 같은 계약. */
export interface CroAcceptMessage {
  requestId: string;
  interactableId: string;
  track: CroTrack;
  field: CroField;
  /** 연습 의뢰로 받는다(상한과 무관 · 현금 없음). */
  practice?: boolean;
}

/** `C2S.CRO_SUBMIT` — 문항 id → 고른 보기 id(여러 개 고르는 문항은 모두). */
export interface CroSubmitMessage {
  requestId: string;
  contractId: string;
  answers: Record<string, string[]>;
}

/** `C2S.CRO_SETTLE` — 1차 결과로 지금 정산(변형 문항을 풀지 않는다). */
export interface CroSettleMessage {
  requestId: string;
  contractId: string;
}

/** `S2C.CRO_RESULT` — 제출 · 정산한 사람에게. */
export interface CroResultMessage {
  requestId: string;
  contract: CroContractView;
  /** 이번 채점(정산이면 null). */
  attempt: CroAttemptView | null;
  /** 이번에 넣은 보상(센트). 재전송 · 미정산이면 0. */
  paidCents: number;
  arrearsPaidCents: number;
  /** 상한으로 깎인 금액(센트). */
  cappedCents: number;
  limits: CroLimitsView;
}

// ════════════════════════════════ Step 3 (프로토콜 v10, 2026-10-23) ════════════════════════════════
// 사옥 복지 · 쇼케이스 소품 · 연례 바이오 학회 · 물질특허 License-Out · 설비 임대 — 설계서 §1.1 · §1.3 · §2.2 · §3.1 · §3.2.
// 구현 결정: docs/2026-10-23-gamification-step3-brief.md §2.

// ──────────────────────────────── 소품 ────────────────────────────────

export type PropId = 'espresso' | 'poster-board' | 'lounge-sofa' | 'showcase-case' | 'plaque-nda' | 'landmark';
/** 해금 조건 — 상시 · 유효 특허 1건 이상 · 최종 허가 달성 · 사옥 Tier 3. 살 때만 본다. */
export type PropUnlock = 'always' | 'patent' | 'approval' | 'tier3';

export interface PropSpec {
  id: PropId;
  name: string;
  /** 아틀라스 프레임(`prop/<id>`). */
  frame: string;
  priceCents: number;
  unlock: PropUnlock;
  effect: string;
}

/** 설계서 §3.2 표 그대로 — 합계 $0.300M, 월 유지비 $0. */
export const PROP_CATALOG: readonly PropSpec[] = [
  { id: 'espresso', name: '에스프레소 머신', frame: 'prop/espresso', priceCents: 3_000_000, unlock: 'always', effect: 'CRO 의뢰 재도전 대기 60초 → 45초 · 연구원 휴식 지점' },
  { id: 'poster-board', name: '학술 포스터 보드', frame: 'prop/poster-board', priceCents: 2_000_000, unlock: 'always', effect: 'CRO 문항지에 검토된 규칙 참고 카드 1장 · 학회 포스터 전시' },
  { id: 'lounge-sofa', name: '피어리뷰 테이블', frame: 'prop/lounge-sofa', priceCents: 4_000_000, unlock: 'always', effect: '실패 데이터 바운티 재제출 대기 60초 → 45초 · 협동 검토 표시' },
  { id: 'showcase-case', name: '알약 · 바이알 진열장', frame: 'prop/showcase-case', priceCents: 6_000_000, unlock: 'patent', effect: '우리 약 브랜드 · 포장 전시(방문객에게는 공개 정보만)' },
  { id: 'plaque-nda', name: 'FDA 승인 기념패', frame: 'prop/plaque-nda', priceCents: 5_000_000, unlock: 'approval', effect: '벽면에 FDA 최종 승인 도장 액자' },
  { id: 'landmark', name: '랜드마크 간판 · 옥상 장식', frame: 'prop/landmark', priceCents: 10_000_000, unlock: 'tier3', effect: 'Tier 3 전용 외관 장식 · 기념 촬영 구도' },
];

export const PROP_UNLOCK_LABEL: Record<PropUnlock, string> = {
  always: '상시',
  patent: '유효 물질특허 1건 이상',
  approval: 'FDA 최종 허가 달성',
  tier3: '사옥 Tier 3',
};

export const PROP_RULES = {
  /** 매각 회수율(낸 값의 50%, 내림). */
  saleRate: 0.5,
  /** 구매 뒤 잔액이 월 유지비의 몇 배 이상이어야 하나. */
  reserveMonths: 6,
  /** 소품 효과 — 재도전 · 재제출 대기(초). */
  fastRetrySeconds: 45,
} as const;

/** 소품 한 줄(그 회사 구성원에게 — `TeamStateMessage.props`). */
export interface PropView {
  id: PropId;
  name: string;
  frame: string;
  priceCents: number;
  unlock: PropUnlock;
  effect: string;
  owned: boolean;
  /** 해금 조건을 지금 만족하는가. */
  unlocked: boolean;
  /** 산 값(센트) — 갖고 있을 때만. 매각 회수액 = ⌊산 값 × 50%⌋. */
  paidCents: number | null;
  saleCents: number | null;
}

/** `C2S.PROP_BUY` · `C2S.PROP_SELL` — 결과는 `TEAM_STATE`(props) · `NOTICE`, 거절은 `ERROR.requestId`. */
export interface PropActionMessage {
  requestId: string;
  propId: PropId;
}

/** `S2C.HQ_PROPS` — 학급 전체(공개). 공개 팀 정보의 소품 목록(도시 옥상 랜드마크 등)을 바꾼다. */
export interface HqPropsMessage {
  teamId: TeamId;
  props: PropId[];
}

/** `S2C.HQ_INTERIOR` — 그 사옥 룸의 모두에게. 사옥 내부(등급 바닥 · 소품 슬롯)가 바뀐 새 맵(압축). 플레이어 위치는 그대로다. */
export interface HqInteriorMessage {
  hqTeamId: TeamId;
  map: import('./world.ts').WireTileMap;
}

// ──────────────────────────────── 연례 바이오 학회 ────────────────────────────────

/** 순위 상금(센트) — 1 · 2 · 3위, 그 밖 참가(1문항 이상 정답). 설계서 §1.3. */
export const SYMPOSIUM_PRIZES_CENTS = [8_000_000, 5_000_000, 3_000_000] as const;
export const SYMPOSIUM_PARTICIPATION_CENTS = 1_000_000;

export type SymposiumBadge = 'gold' | 'silver' | 'bronze' | 'participant';
export const SYMPOSIUM_BADGE_LABEL: Record<SymposiumBadge, string> = {
  gold: '학회 최우수 발표상',
  silver: '학회 우수 발표상',
  bronze: '학회 장려상',
  participant: '학회 발표 배지',
};

export interface SymposiumStandingView {
  rank: number;
  ticker: string;
  companyName: string;
  score: number;
  /** 시상 뒤에만. */
  prizeCents: number | null;
  badge: SymposiumBadge | null;
  you: boolean;
}

/** `S2C.SYMPOSIUM_STATE` — 요청한 사람에게(제출 · 폐회 뒤에는 학급 전체에 다시). */
export interface SymposiumStateMessage {
  /** 지금 게임 연도(0부터). */
  gameYear: number;
  /** 이번 연도 문항지(학급 공통). */
  sheet: CroSheetView;
  /** 우리 계보의 이번 연도 제출(점수 · 문항별 맞음 · 해설) — 내지 않았으면 null. */
  mine: { score: number; max: number; correct: Record<string, boolean>; explanations: Record<string, string>; submittedAtMs: number } | null;
  /** 이번 연도 제출 현황(점수는 폐회 뒤에만 공개 — 그 전에는 낸 회사 수만). */
  entries: number;
  /** 지난 연도 결과(최신이 앞, 최대 3). */
  past: Array<{ gameYear: number; standings: SymposiumStandingView[] }>;
  /** 회사 구성원만 낼 수 있다(교사 · 파산 회사는 읽기만). */
  readOnly: boolean;
  /** 계보 CRO · 학회 보상 합계 · 상한. */
  campaign: { paidCents: number; capCents: number };
}

/** `C2S.SYMPOSIUM_OPEN` — 대학병원 창구의 '학회' 행동. */
export interface SymposiumOpenMessage {
  interactableId?: string;
}

/** `C2S.SYMPOSIUM_SUBMIT` — 학회 발표(문항 id → 고른 보기). 계보마다 연 1회. */
export interface SymposiumSubmitMessage {
  requestId: string;
  answers: Record<string, string[]>;
}

// ──────────────────────────────── 물질특허 License-Out · 설비 임대 ────────────────────────────────

/** 표준 요율(센트) — 자유 협상 없음. 설계서 §2.2 (B). 계약 총액 $0.410M. */
export const LICENSE_TERMS = {
  upfrontCents: 10_000_000,
  royaltyCents: { phase1: 3_000_000, phase2: 6_000_000, phase3: 12_000_000, final: 10_000_000 },
  /** 계보마다 도입(라이선시) · 판매(라이선서) 상한. */
  inMax: 1,
  outMax: 2,
} as const;

export const RENTAL_TERMS = {
  feeCents: 1_500_000,
  /** 계보마다 임차 · 임대 상한(건). */
  renterMax: 4,
  hostMax: 8,
} as const;

export type RoyaltyStepKind = keyof typeof LICENSE_TERMS.royaltyCents;

/** 특허 한 줄의 실시 허락 상태(공개 — 시청 · 특허청 창구). */
export interface LicenseOfferView {
  patentId: string;
  ticker: string;
  companyName: string;
  label: string | null;
  canonicalSmiles: string;
  open: boolean;
  /** 우리 회사 특허인가. */
  ours: boolean;
  /** 우리가 지금 취득할 수 있는가 — 아니면 까닭. */
  eligible: boolean;
  note?: string;
  /** 이 특허의 판매 건수 · 상한. */
  sold: number;
}

export interface LicenseContractView {
  id: string;
  patentId: string;
  label: string | null;
  licensorTicker: string;
  licenseeTicker: string;
  /** 우리가 들인 계약(in) · 판 계약(out). */
  side: 'in' | 'out';
  upfrontCents: number;
  /** 단계별 로열티 — escrow 맡김 · paid 지급 · released 반환. */
  royalties: Array<{ kind: RoyaltyStepKind; cents: number; status: 'escrow' | 'paid' | 'released' }>;
  atMs: number;
}

/** `S2C.LICENSE_STATE` — 그 회사 구성원(창구에서 요청 · 계약 뒤). */
export interface LicenseStateMessage {
  teamId: TeamId;
  offers: LicenseOfferView[];
  contracts: LicenseContractView[];
  limits: { inUsed: number; inMax: number; outUsed: number; outMax: number; rentedIn: number; renterMax: number; rentedOut: number; hostMax: number };
}

/** `C2S.LICENSE_STATE` — 시청 · 특허청 창구에서 실시 허락 장부를 연다. */
export interface LicenseStateRequestMessage {
  interactableId: string;
}

/** `C2S.LICENSE_OFFER` — 내 특허의 통상실시권 허락 여부(open / closed). */
export interface LicenseOfferMessage {
  requestId: string;
  interactableId: string;
  patentId: string;
  open: boolean;
}

/** `C2S.LICENSE_ACQUIRE` — 다른 회사의 open 특허 통상실시권 취득(선급 $0.100M). */
export interface LicenseAcquireMessage {
  requestId: string;
  interactableId: string;
  patentId: string;
}
