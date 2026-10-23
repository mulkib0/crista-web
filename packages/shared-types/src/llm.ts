/**
 * LLM 연동(M4, 프로토콜 v4) — sLLM 바이오 애널리스트(ARCHITECTURE §1.2) · NPC 대화.
 *
 * ## 어디서 부르나 (조정자 결정 — M4 브리프 §5)
 * LLM 호출은 **바이오 워커(Python)** 한 곳에서만 한다(`POST /llm/analyst` · `POST /llm/npc`). 키 `OPENROUTER_API_KEY` 는 워커 프로세스 환경 변수로만 둔다.
 * 게임 서버는 워커를 부르고, 워커가 실패하거나 닿지 않으면 **규칙 기반 대체(`@crista/game-rules` 의 `analystFallback` · `npcFallback`)** 로
 * 게임을 계속한다. 가격은 언제나 game-rules 순수 함수가 정한다 — LLM 이 낸 수치는 계기별 범위로 자르는 **제안**일 뿐이다.
 *
 * ## 신뢰 경계
 * - LLM 출력은 신뢰하지 않는 입력이다. 워커가 JSON 스키마로 검증 · 범위로 자르고, 게임 서버가 한 번 더 자른다.
 * - 학생 이름 · 아이디 · 회사 구성원 같은 개인정보는 프롬프트에 넣지 않는다. 회사는 **티커**로만 부른다(회사 이름은 학생이 지은 글이라 넣지 않는다).
 * - 학생이 쓴 글(IR 한 줄 · NPC 질문)은 따옴표로 감싼 '평가 대상 · 질문'으로만 넘기고, 지시로 따르지 않게 시스템 지시에 적는다.
 * - 다른 팀의 비공개 연구 데이터는 NPC 문맥에 넣지 않는다(사옥 연구원은 그 팀 구성원이 물을 때만 그 팀 데이터를 안다).
 *
 * 모델 기본값: OpenRouter `deepseek/deepseek-v4.1-flash-1017`(워커 설정 `CRISTA_LLM_MODEL` 로 바꿀 수 있다).
 */
import type { CashAlertLevel, ClassId, CompanyStatus, DistrictType, FacilityKind, FacilityTier, InvestmentMilestone } from './domain.ts';
import type { AnalystRating, AnalystTriggerKind, ContentSource } from './market.ts';
import type { NpcId } from './world.ts';
import type { AnalystPipelineFacts } from './pipeline.ts';

export const DEFAULT_LLM_MODEL = 'deepseek/deepseek-v4.1-flash-1017';

/** LLM 을 쓰지 못한 까닭 — 화면에는 '규칙 기반 문구' 로만 보이고, 교사 화면 · 로그에 사유가 남는다. */
export type LlmFailureReason =
  | 'disabled'
  | 'no_key'
  | 'budget'
  | 'rate_limited'
  | 'timeout'
  | 'upstream_error'
  | 'invalid_output'
  | 'worker_unavailable';

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
}

// ──────────────────────────────── 애널리스트 ────────────────────────────────

/** 애널리스트에게 넘기는 사실 — 서버가 실제 데이터로만 채운다(학생 글은 `pitch` 하나). 없는 칸은 생략. */
export interface AnalystFacts {
  /** 지금 시장가 · 펀더멘털 · 투자의견 · 공매도 잔고 비율. */
  priceUsd: number;
  fundamentalUsd: number;
  rating: AnalystRating;
  shortInterestPct: number;
  /** 설비 등급(0~3)과 가동 상태 요약. */
  facilities: Partial<Record<FacilityKind, FacilityTier>>;
  idleFacilities?: FacilityKind[];
  researchers: number;
  /** 회사 자금 단계와 운영 가능 개월(공개하지 않는 잔액 대신 단계만). */
  cashLevel: CashAlertLevel;
  runwayGameMonths: number | null;
  investments: InvestmentMilestone[];
  /** 이 회사의 최고 도킹 결과(실제 계산) — 표적 · 결합 자유에너지 · 재도킹 RMSD(있으면). */
  bestDocking?: { targetLabel: string; pdbId: string; affinityKcal: number; previousBestKcal: number | null; ligandLabel?: string };
  /** 계기의 세부 — 계기마다 다르다(예: { facility: 'docking', tier: 1 } · { milestone: 'seriesA' } · { eventId, tone, effect }). */
  detail: Record<string, string | number | boolean | null>;
  /** 파이프라인 계기(v5 — `patent` · `ind` · `trial` · `approval`)의 **공개** 사실. 점수 · 물성 · 후보 SMILES 는 싣지 않는다. */
  pipeline?: AnalystPipelineFacts;
  /** 유상증자 IR 한 줄(학생 글, 200자 이하) — `offering` 계기에만. */
  pitch?: string;
  /** 최근 리포트 3개(헤드라인 · 의견) — 같은 말을 되풀이하지 않게. */
  recentHeadlines: string[];
}

/** `POST /llm/analyst` 본문(게임 서버 → 워커). */
export interface LlmAnalystRequest {
  /** 캐시 · 멱등 근거 — `analyst:<reportId>`. 같은 키 재요청은 워커 캐시를 돌려준다. */
  requestKey: string;
  classId: ClassId;
  /** 작업 세대 — 복원 뒤 늦은 응답을 버리는 근거(게임 서버가 비교한다). */
  generation: number;
  trigger: AnalystTriggerKind;
  company: { ticker: string; district: DistrictType; status: CompanyStatus; ageGameDays: number };
  facts: AnalystFacts;
  /** 이 계기의 펀더멘털 변동률 범위(%) — 균형안 §9.3. 워커는 제안이 범위를 넘으면 자른다. */
  band: { minPct: number; maxPct: number; defaultPct: number };
  language: 'ko';
}

/** 워커가 검증을 통과시킨 애널리스트 출력. */
export interface LlmAnalystOutput {
  rating: AnalystRating;
  /** 범위로 자른 값. */
  fundamentalChangePct: number;
  /** 모델이 처음 낸 값(자르기 전) — 원문 보존. */
  proposedChangePct: number;
  /** 60자 이하. */
  headline: string;
  /** 200자 이하. */
  comment: string;
  /** 3개 이하, 각 80자 이하. */
  rationale: string[];
}

export type LlmAnalystResponse =
  | { ok: true; output: LlmAnalystOutput; model: string; cached: boolean; latencyMs: number; usage: LlmUsage }
  | { ok: false; reason: LlmFailureReason; message: string };

// ──────────────────────────────── NPC ────────────────────────────────

/** NPC 성격 — game-rules `npc/` 가 종류마다 정한다. 워커는 이 값으로 시스템 지시를 만든다. */
export interface NpcPersona {
  id: NpcId;
  /** 이름표 이름. */
  name: string;
  /** 직책 · 하는 일 — '시청 특허청 민원 담당. 법인 등기 · 물질특허 절차를 안내한다'. */
  role: string;
  /** 말투 — '공손한 존댓말, 짧게'. */
  voice: string;
  /** 지금 게임에 있는 기능만 말하게 하는 사실 목록(없는 기능을 약속하지 않게). */
  knowledge: string[];
  /** 하지 않는 것 — '특정 종목 매수 · 매도를 권하지 않는다' 등. */
  boundaries: string[];
}

/** NPC 문맥 — 서버가 말 거는 사람의 권한으로 고른 사실(문자열 각 120자 이하, 최대 12개). */
export interface NpcContext {
  /** '수업 중 · 1년 3월 12일' 같은 학급 상황. */
  situation: string;
  /** 말 거는 학생의 회사 공개 사실(그 학생 회사일 때만 비공개 연구 요약 포함). */
  facts: string[];
}

/** `POST /llm/npc` 본문(게임 서버 → 워커). */
export interface LlmNpcRequest {
  /** `npc:<classId>:<generation>:<userId>:<requestId>`(v7 — 복원 전 요청과 워커에서 합류하지 않게 세대를 넣는다). */
  requestKey: string;
  classId: ClassId;
  generation: number;
  persona: NpcPersona;
  context: NpcContext;
  /** 최근 대화(오래된 것이 앞, 최대 6턴, 각 200자 이하). */
  history: Array<{ speaker: 'student' | 'npc'; text: string }>;
  /** 학생 질문(1~200자). */
  message: string;
  language: 'ko';
  /**
   * 안내 의도 후보(v7, 선택 — `npc.ts`). 서버가 만든 안내 가능한 목적지(최대 6개, id `escort:<spotId>` 1~64자, 설명은 서버 고정 문구 1~80자).
   * 있으면 응답에 `intentCandidateId`(이 후보 중 하나 또는 null)가 온다. 없으면 지금과 같은 요청 · 응답 · 캐시 키다.
   */
  intentCandidates?: Array<{ id: string; description: string }>;
}

export type LlmNpcResponse =
  | {
      ok: true;
      reply: string;
      model: string;
      cached: boolean;
      latencyMs: number;
      usage: LlmUsage;
      /** v7 — 요청에 `intentCandidates` 가 있을 때만. 후보 밖 값은 워커가 null 로 낮춘다(답은 살린다). */
      intentCandidateId?: string | null;
    }
  | { ok: false; reason: LlmFailureReason; message: string };

/** `GET /llm/status` — 워커의 LLM 사용 가능 여부(키 값은 싣지 않는다). */
export interface LlmStatus {
  enabled: boolean;
  keyConfigured: boolean;
  model: string;
  /** 지난 1시간 호출 수와 한도. */
  usage: { callsLastHour: number; globalCallsPerHour: number; classCallsPerHour: number; failuresLastHour: number };
}

// ──────────────────────────────── 룸 메시지 (클라이언트 ↔ 게임 서버) ────────────────────────────────

/**
 * `C2S.NPC_TALK` — NPC 에게 말 걸기. NPC 사거리 안에서만(`out_of_range`). 학생 · 교사 모두.
 * 한도: 한 사람 6초에 1번 · 1시간 40번(`rate_limited`, 입력 검증 값 — M4 브리프 §5.4).
 */
export interface NpcTalkMessage {
  requestId: string;
  /** NPC 상호작용 지점 id. */
  interactableId: string;
  /** 1~200자. */
  message: string;
}

/** `S2C.NPC_REPLY` — 말 건 사람에게만. 실패해도 규칙 기반 답(`source: 'rules'`)이 온다. */
export interface NpcReplyMessage {
  requestId: string;
  interactableId: string;
  npc: NpcId;
  npcName: string;
  reply: string;
  source: ContentSource;
  /** `source === 'llm'` — 화면 'AI 생성'. */
  aiGenerated: boolean;
  /** 규칙 기반으로 대신한 까닭(LLM 이면 생략). */
  fallbackReason?: LlmFailureReason | 'rate_limited';
  atMs: number;
}
