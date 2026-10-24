/**
 * 서류 심사 공통(설계 §5.11) — 특허 출원서(3.1) · 동물실험계획서(3.2) · 임상시험 계획 승인 신청서(3.3)가 같은 틀을 쓴다.
 * 규칙 먼저 · LLM 다음 · 최종 = 규칙 ∧ LLM. 돈과 등재는 LLM 이 정하지 않는다(서버 트랜잭션).
 * 서버 엔진: apps/server/src/reviews.ts(`requestReview` · `onReviewed` · 칸 저장 helper). 표: web.doc_reviews · *_sections(0006).
 *
 * 함께 두는 것: 1.2 · 2.1 · 2.2 · 3.2 의 근거 칩 공통형(`ReasonVerdict` — 맞음 · 주의 · 막음, 설계 §5.5 · §5.6 · §5.7 · §5.9).
 */
import type { Avatar } from './rules.ts';

export type DocKind = 'patent' | 'iacuc' | 'ind' | 'nda';
export const DOC_KINDS: readonly DocKind[] = ['patent', 'iacuc', 'ind', 'nda'];
export const DOC_KIND_LABEL: Record<DocKind, string> = {
  patent: '특허 출원서',
  iacuc: '동물실험계획서',
  ind: '임상시험 계획 승인 신청서',
  nda: '품목 허가 신청서(NDA)',
};
/** 심사관 역할(시스템 프롬프트 · 화면 'AI 심사' 표시). */
export const DOC_REVIEWER_LABEL: Record<DocKind, string> = {
  patent: '특허심사관',
  iacuc: '동물실험윤리위원회',
  ind: '식약처 · FDA 심사관',
  nda: '식약처 · FDA 신약 심사관',
};

/** 심사 판정 — pending = 심사 중(AI 심사 · 숙고 기간). 교사를 기다리지 않는다(AI 장애 · 거절이면 규칙 자동 판정). reject 는 규칙(신규성 · 중복)만 낸다. */
export type DocReviewVerdict = 'pending' | 'pass' | 'revise' | 'reject';

/** LLM 이 칸마다 매기는 상태(§5.11 `DocReviewOutput.items`). */
export type DocReviewItemStatus = 'ok' | 'missing' | 'inconsistent' | 'unclear';
export type DocReviewFlag = 'injection' | 'off_topic' | 'copied' | 'not_korean';
export const DOC_REVIEW_FLAGS: readonly DocReviewFlag[] = ['injection', 'off_topic', 'copied', 'not_korean'];

/** Claude → 서버(구조화 출력 · 서버가 다시 검증). 금액 · 판정 필드 없음 — verdict 는 LLM 의견일 뿐 최종은 규칙 ∧ LLM. */
export interface DocReviewOutput {
  items: Array<{ id: string; status: DocReviewItemStatus; note: string }>;
  verdict: 'pass' | 'revise';
  feedback: string;
  flags: DocReviewFlag[];
}

/** 규칙 검사 한 줄 — fail 이 하나라도 있으면 LLM 과 상관없이 보완(severity reject 면 거절). */
export interface RuleFinding {
  id: string;
  status: 'ok' | 'fail';
  /** 학생에게 보일 한 줄(80자 안). */
  note: string;
  /** fail 일 때 무엇이 되나 — 기본 revise. 신규성(이미 알려진 물질) · 학급 중복은 reject. */
  severity?: 'revise' | 'reject';
  /** 걸린 칸(화면이 칸 옆에 띄운다). */
  section?: string;
}

/**
 * 심사 숙고 기간(게임 일) — AI 판정이 나와도 바로 공개하지 않고 접수한 게임 일 + 이만큼 지나야 공개한다(실제 심사처럼 '뜸').
 * 기본 배율(`CLOCK_RATE_DEFAULT` 12)에서 20게임 일 ≈ 현실 1분 40초 — AI 가 읽는 수십 초 위에 얹는다.
 * 50분 수업에서도 보완 · 재심사를 여러 번 돌 수 있게 짧게 둔다(시계를 멈추면 숙고도 멈춘다).
 * 규칙 fail(숫자 · 형식) · 끼워 넣기 사전 필터는 서류를 고치라는 즉시 안내라 숙고 없이 바로 낸다.
 * 3.3 IND(30게임 일) · 4.2 허가(60게임 일)의 공식 대기는 서류 통과 · 접수 뒤에 따로 흐른다.
 */
export const DOC_REVIEW_GAME_DAYS: Record<DocKind, number> = {
  patent: 20,
  iacuc: 20,
  ind: 20,
  nda: 20,
};

/** 공개 게임 일 표시(올림 — 'D+38'). */
export const releaseDayLabel = (gameDay: number): string => `D+${Math.ceil(Math.max(0, gameDay) - 1e-9)}`;

/** 서류 심사 공통 안내(네 서류 화면이 함께 쓴다). */
export const DOC_REVIEW_COPY = {
  queued: 'AI 심사관이 서류를 읽고 있어요. 읽은 뒤 판정을 정리하는 기간을 거쳐 결과가 나와요. 그동안 다른 칸이나 단계를 계속해도 돼요.',
  deliberating: (releaseGameDay: number | null) =>
    `심사관이 판정을 정리하고 있어요${releaseGameDay !== null ? ` — ${releaseDayLabel(releaseGameDay)}에 결과가 나와요` : ''}. 그동안 다른 칸이나 단계를 계속해도 돼요.`,
  auto: 'AI 심사관을 쓸 수 없어 규칙으로 판정했어요(규칙 검사 · 칸 채움). 선생님이 나중에 정정할 수 있어요.',
} as const;

/** 칸별 심사 기준(§5.8 · §5.9 · §5.10 표). */
export interface ReviewChecklistItem {
  id: string;
  section: string;
  criterion: string;
  /** 규칙 자동 판정(AI 를 쓸 수 없을 때)이 '채워졌다'고 보는 최소 글자 수 — 생략하면 20자. 브랜드 이름처럼 원래 짧은 칸만 적는다. */
  minChars?: number;
}

export const REVIEW_LIMITS = {
  /** 서류 1건당 하루 심사 요청(LLM 을 부르는 것만 센다). */
  perDocPerDay: 5,
  /** 모둠 하루 심사 요청. */
  perTeamPerDay: 15,
  /** LLM 출력 길이(§5.13 미성년자 안전장치 — 짧은 칸만). */
  noteMax: 80,
  feedbackMax: 300,
  /** 서류 칸 한 칸의 글자 수(DB check 와 같음). */
  sectionMax: 4000,
} as const;

/** 화면에 보이는 심사 결과. */
export interface DocReviewView {
  id: string;
  kind: DocKind;
  docId: string;
  /** 심사한 서류 판 — 지금 판과 다르면 화면이 '심사 뒤 바뀜'을 띄운다(§7.4 ⑪). */
  docVersion: number;
  verdict: DocReviewVerdict;
  /** 규칙 결과(모두) + LLM 칸별 지적. */
  ruleFindings: RuleFinding[];
  items: Array<{ id: string; section: string | null; status: DocReviewItemStatus; note: string }>;
  feedback: string | null;
  flags: DocReviewFlag[];
  /**
   * 심사 단계(화면 안내). queued · retrying = AI 가 읽는 중, deliberating = 판정은 났고 `releaseGameDay` 에 공개(숙고 기간),
   * auto = AI 를 쓸 수 없어(장애 · 거절 · 하루 상한) 규칙으로 자동 판정, manual = 교사가 직접 정함 · 정정.
   */
  stage: 'rules' | 'cached' | 'queued' | 'done' | 'retrying' | 'deliberating' | 'auto' | 'manual';
  /** 결과를 공개하는 게임 일(숙고 기간 끝) — 규칙에서 바로 끝난 심사는 null. */
  releaseGameDay: number | null;
  /** 'AI 심사' 표시용 — 실제로 답한 모델(LLM 을 부르지 않았으면 null). */
  model: string | null;
  requestedByName: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** 교사가 손으로 정했으면 그 메모. */
  teacherNote: string | null;
}

/** 서류 칸 하나(연구 노트처럼 칸 단위 · 마지막 작성자 · 판). */
export interface DocSectionView {
  section: string;
  body: string;
  version: number;
  byName: string | null;
  avatar: Avatar | null;
  updatedAt: string;
}

/** 칸 저장 — 화면이 읽은 `DocSectionView.version`(빈 칸이면 0). 그 사이 누가 고쳤으면 409 `stale` + 지금 칸. */
export interface SectionSaveRequest {
  body: string;
  expectedVersion: number;
}

export interface SectionSaveResponse {
  ok: true;
  /** 저장 뒤 칸 판. */
  version: number;
  /** 저장 뒤 서류 판(심사 요청이 고정하는 값). */
  docVersion: number;
}

/** 심사 요청 응답 — 접수 즉시(LLM 은 비동기, 끝나면 모둠 WS `doc.reviewed`). */
export interface ReviewRequestResponse {
  review: DocReviewView;
  /** 같은 판을 다시 냈으면 false(기존 심사를 돌려준다). */
  created: boolean;
}

/** 교사 — 심사 정정(원본 보존) · 숙고 중인 건 먼저 판정(선택 — 교사를 기다리는 단계는 없다). */
export interface TeacherReviewDecision {
  verdict: 'pass' | 'revise' | 'reject';
  note: string;
}

// ── 근거 칩 공통형 ──

/** 근거 칩 판정 — ok 맞음 · warn 주의(담을 수 있음) · block 막음(서버도 400). */
export interface ReasonVerdict {
  status: 'ok' | 'warn' | 'block';
  message: string;
}

export const reasonOk = (message = ''): ReasonVerdict => ({ status: 'ok', message });
export const reasonWarn = (message: string): ReasonVerdict => ({ status: 'warn', message });
export const reasonBlock = (message: string): ReasonVerdict => ({ status: 'block', message });

/** 칩 키 모양(DB check `^[a-z][a-z0-9_]{0,39}$` 와 같음). */
export const REASON_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

/** 서류 칸 키 모양(DB check `^[a-z][a-z0-9_]{0,31}$` 와 같음). */
export const SECTION_KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

export const REVIEW_API = {
  /** 모둠 — 심사 한 건 보기. */
  review: (reviewId: string) => `/api/reviews/${reviewId}`,
  /** 교사 — 학급의 심사 중 · 플래그 · 자동 판정 목록. */
  teacherReviews: (classId: string) => `/api/teacher/classes/${classId}/reviews`,
  /** 교사 — 정정(선택). */
  teacherDecide: (reviewId: string) => `/api/teacher/reviews/${reviewId}/decision`,
  /** 교사 — 학급 LLM 하루 사용량. */
  teacherLlmUsage: (classId: string) => `/api/teacher/classes/${classId}/llm-usage`,
} as const;

/** 교사 화면 — 학급 LLM 하루 사용량(§5.13 비용). */
export interface LlmUsageView {
  day: string;
  calls: number;
  byTask: Record<string, number>;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  refused: number;
  failed: number;
  dailyLimit: number;
  available: boolean;
}
