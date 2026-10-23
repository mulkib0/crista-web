/**
 * 파이프라인 LLM 클라이언트(설계 §5.13 · 결정 9) — 서류 심사(§5.11) · 학습 연구비 채점 · 전광판 헤드라인이 함께 쓴다.
 *
 * - 키: `ANTHROPIC_API_KEY` 를 SDK 가 직접 읽는다 — `new Anthropic()` 를 인자 없이 만들고 코드 · 로그 · 기록에 키를 넘기지 않는다.
 *   `ANTHROPIC_AUTH_TOKEN` 이 같은 환경에 있으면 경고만 한다(SDK 는 API 키를 먼저 쓴다).
 * - 모델 · 수준: `claude-opus-5-5` · `output_config.effort: 'medium'`(모든 작업 같음, 설정 `LLM_MODEL` · `LLM_EFFORT`).
 *   `temperature` · `top_p` · `top_k` · `thinking` · assistant 미리 채우기 · 강제 `tool_choice` 는 보내지 않는다(Opus 5.5 · API 2026-10-21 에서 400).
 *   결정성은 호출자의 정규화 해시 캐시 + 모델 · effort · 판 고정으로 얻는다.
 * - 출력: 구조화 출력(`output_config.format` = zod 스키마의 JSON Schema)을 `client.beta.messages.create` 로 받아 **이 파일이 직접** 푼다
 *   (text 블록 JSON.parse → 스키마 safeParse). SDK 의 `parse` 는 거절 · 잘림 응답의 부분 JSON 에서 먼저 예외를 던져
 *   stop_reason 을 볼 수 없었다(거절이 'invalid' 로 분류됨). beta 머리 `structured-outputs-2025-12-15` 는 `parse` 가 붙이던 것을 그대로 붙인다.
 * - 프롬프트 캐시: `system` 고정 블록에 `cache_control: { type: 'ephemeral' }`. 바뀌는 값은 `user` 쪽에만(호출자 책임).
 * - 거절: 응답을 풀기 전에 `stop_reason === 'refusal'`(그다음 `max_tokens`)을 먼저 본다 — 부분 text 가 있어도 거절은 거절. 서버 측 대체 실행 `fallbacks: 'default'`
 *   (beta `server-side-fallback-2026-07-01` — SDK 1.2.0 의 `BetaFallbacksParam = … | 'default'` 로 확인)를 기본으로 켠다. 그래도 거절이면 'refused'.
 * - 장애: SDK 형별 예외로 나눈다 — 429 · 5xx · 연결 · 시간 초과는 retryable, 400 · 401 · 403 · 404 는 아님. SDK 자체 재시도 2회는 그대로.
 * - 큐: 서버 전체 · 학급마다 동시 호출 상한(넘으면 기다린다). 학급 하루 상한은 `dailyRemaining` 으로 호출자가 먼저 본다.
 * - 기록: 호출마다 `web.llm_calls` 한 줄(작업 · 모델 · 응답 모델 · effort · 판 · 토큰 · 지연 · 거절 종류 · 상태). 프롬프트 · 학생 글은 남기지 않는다.
 * - 키가 없거나 `LLM_DISABLED=1` 이면 부르지 않고 'unavailable' — 호출자는 pending 으로 두고 나중에 다시 시도한다(화면은 막지 않는다).
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import type { LlmConfig } from './config.ts';
import type { Queryable } from './db.ts';

export type LlmTask = 'doc_review' | 'learn_grade' | 'headline' | 'probe' | 'clinical_sim';

export interface LlmRequest<T> {
  task: LlmTask;
  /** 프롬프트 판(reviewerVersion · graderVersion · 헤드라인 판) — 기록에 남는다. */
  version: string;
  /** 고정부 — 역할 · 규칙 · 체크리스트 · 출력 규칙 · 학생에게 말하는 법. 날짜 · id 같은 바뀌는 값을 넣지 않는다(캐시). */
  system: string;
  /** 바뀌는 부분 — 서버 계산 사실 · 학생 글(태그로 격리). */
  user: string;
  /** 구조화 출력 스키마(zod v4 객체). */
  schema: z.ZodType<T>;
  /** 출력 상한 — 기본 16000(비스트리밍 권장값). 출력은 짧지만 적응형 사고가 이 안에 든다. */
  maxTokens?: number;
  teamId?: string | null;
  classId?: string | null;
  /** 무엇을 위한 호출인가(doc_reviews.id 등) — 기록용. */
  refId?: string | null;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type LlmOutcome<T> =
  | { kind: 'ok'; output: T; model: string; usage: LlmUsage; latencyMs: number; fallbackUsed: boolean }
  /** 안전 분류기 거절(대체 실행까지 거절) — 호출자가 규칙 자동 판정으로 넘긴다(교사 대기 없음). */
  | { kind: 'refused'; category: string | null; model: string | null }
  /** 답은 왔지만 스키마에 맞지 않음 · 출력 상한에서 잘림. */
  | { kind: 'invalid'; reason: string }
  /** 키 없음 · 꺼짐 · 학급 하루 상한 — 부르지 않았다. */
  | { kind: 'unavailable'; reason: 'no_key' | 'disabled' | 'daily_limit' }
  | { kind: 'error'; code: string; retryable: boolean };

/** SDK 클라이언트의 우리가 쓰는 부분(`client.beta.messages`) — 시험에서 바꿔 끼운다. */
export interface MessagesParser {
  create(params: Record<string, unknown>, options?: { timeout?: number }): Promise<RawResponse>;
}

export interface RawResponse {
  model: string;
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
  content: Array<{ type: string; text?: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
    iterations?: Array<{ type: string }> | null;
  };
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
/** 구조화 출력 beta — SDK `messages.parse` 가 붙이던 머리를 `create` 에 그대로 붙인다. */
const STRUCTURED_BETA = 'structured-outputs-2025-12-15';

/** 서울 날짜 기준 하루(학급 하루 상한 · 교사 화면 하루 사용량). */
export const KST_DAY_START_SQL = `(date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')`;

/** 간단한 세마포어 — 넘으면 줄을 선다. */
class Gate {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }
  release(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }
  get queued(): number {
    return this.waiting.length;
  }
}

export class LlmClient {
  readonly config: LlmConfig;
  private readonly db: Queryable | null;
  private client: MessagesParser | null;
  private readonly global: Gate;
  private readonly perClass = new Map<string, Gate>();

  /** `parser` 는 시험용 — 비우면 키가 있을 때 `new Anthropic()`(인자 없음)으로 만든다. */
  constructor(config: LlmConfig, db: Queryable | null, parser?: MessagesParser) {
    this.config = config;
    this.db = db;
    this.global = new Gate(config.maxConcurrent);
    this.client = parser ?? null;
    if (!this.client && config.keyPresent && !config.disabled) {
      const sdk = new Anthropic();
      this.client = sdk.beta.messages as unknown as MessagesParser;
    }
    if (process.env.ANTHROPIC_AUTH_TOKEN) console.warn('[llm] ANTHROPIC_AUTH_TOKEN 이 서버 환경에 있습니다 — 지우세요(설계 §5.13). API 키가 먼저 쓰입니다.');
  }

  /** 지금 부를 수 있나(키 · 설정). 학급 하루 상한은 `dailyRemaining`. */
  get available(): boolean {
    return this.client !== null && !this.config.disabled;
  }

  get unavailableReason(): 'no_key' | 'disabled' | null {
    if (this.config.disabled) return 'disabled';
    if (this.client === null) return 'no_key';
    return null;
  }

  /** 학급 오늘(서울) 남은 호출 수 — 호출 전에 호출자가 본다. DB 없으면 상한 그대로. */
  async dailyRemaining(classId: string): Promise<number> {
    if (!this.db) return this.config.dailyPerClass;
    const used = await countLlmCallsToday(this.db, { classId });
    return Math.max(0, this.config.dailyPerClass - used);
  }

  private gateFor(classId: string | null | undefined): Gate | null {
    if (!classId) return null;
    let gate = this.perClass.get(classId);
    if (!gate) {
      gate = new Gate(this.config.maxConcurrentPerClass);
      this.perClass.set(classId, gate);
    }
    return gate;
  }

  /** 한 번 부른다. 예외를 던지지 않고 결과 종류로 돌려준다(기록은 늘 남긴다 — 부르지 않은 'unavailable' 은 남기지 않는다). */
  async call<T>(req: LlmRequest<T>): Promise<LlmOutcome<T>> {
    const reason = this.unavailableReason;
    if (reason) return { kind: 'unavailable', reason };
    if (req.classId && (await this.dailyRemaining(req.classId)) <= 0) return { kind: 'unavailable', reason: 'daily_limit' };

    const classGate = this.gateFor(req.classId);
    await this.global.acquire();
    if (classGate) await classGate.acquire();
    const started = Date.now();
    try {
      const outcome = await this.invoke(req, started);
      return outcome;
    } finally {
      classGate?.release();
      this.global.release();
    }
  }

  private async invoke<T>(req: LlmRequest<T>, started: number): Promise<LlmOutcome<T>> {
    // SDK 도우미의 JSON Schema 만 보낸다(도우미의 parse 함수는 쓰지 않는다 — 아래에서 직접 푼다).
    const { type, schema } = betaZodOutputFormat(req.schema as never) as { type: 'json_schema'; schema: Record<string, unknown> };
    const params: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: req.maxTokens ?? 16_000,
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: req.user }],
      output_config: { effort: this.config.effort, format: { type, schema } },
      betas: this.config.fallbacks ? [FALLBACK_BETA, STRUCTURED_BETA] : [STRUCTURED_BETA],
      ...(this.config.fallbacks ? { fallbacks: 'default' } : {}),
    };
    let response: RawResponse;
    try {
      response = await this.client!.create(params, { timeout: this.config.timeoutMs });
    } catch (error) {
      const failure = classifyError(error);
      await this.record(req, { status: failure.kind === 'invalid' ? 'invalid' : 'error', errorCode: failure.kind === 'invalid' ? 'parse_failed' : failure.code, latencyMs: Date.now() - started });
      return failure as LlmOutcome<T>;
    }
    const latencyMs = Date.now() - started;
    const usage: LlmUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    };
    const fallbackUsed = (response.usage.iterations ?? []).some((entry) => entry.type === 'fallback_message');
    const base = { latencyMs, usage, responseModel: response.model, stopReason: response.stop_reason, fallbackUsed };

    // 거절 · 잘림을 먼저 본다(내용을 풀기 전에 — 부분 JSON 이 있어도).
    if (response.stop_reason === 'refusal') {
      const category = response.stop_details?.category ?? null;
      await this.record(req, { ...base, status: 'refused', refusalCategory: category });
      return { kind: 'refused', category, model: response.model };
    }
    if (response.stop_reason === 'max_tokens') {
      await this.record(req, { ...base, status: 'invalid', errorCode: 'max_tokens' });
      return { kind: 'invalid', reason: 'max_tokens' };
    }
    const parsed = parseStructuredText(response.content);
    if (!parsed.ok) {
      await this.record(req, { ...base, status: 'invalid', errorCode: 'parse_failed' });
      return { kind: 'invalid', reason: 'parse_failed' };
    }
    const checked = req.schema.safeParse(parsed.value);
    if (parsed.value == null || !checked.success) {
      await this.record(req, { ...base, status: 'invalid', errorCode: 'schema' });
      return { kind: 'invalid', reason: 'schema' };
    }
    await this.record(req, { ...base, status: 'ok' });
    return { kind: 'ok', output: checked.data, model: response.model, usage, latencyMs, fallbackUsed };
  }

  private async record(
    req: LlmRequest<unknown>,
    row: {
      status: 'ok' | 'refused' | 'invalid' | 'error';
      latencyMs: number;
      usage?: LlmUsage;
      responseModel?: string;
      stopReason?: string | null;
      refusalCategory?: string | null;
      fallbackUsed?: boolean;
      errorCode?: string;
    },
  ): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.query(
        `insert into web.llm_calls (task, model, response_model, effort, version, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
                                    latency_ms, stop_reason, refusal_category, fallback_used, status, error_code, team_id, class_id, ref_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          req.task, this.config.model, row.responseModel ?? null, this.config.effort, req.version.slice(0, 60),
          row.usage?.inputTokens ?? null, row.usage?.outputTokens ?? null, row.usage?.cacheReadTokens ?? null, row.usage?.cacheCreationTokens ?? null,
          Math.max(0, Math.round(row.latencyMs)), row.stopReason?.slice(0, 40) ?? null, row.refusalCategory?.slice(0, 40) ?? null, row.fallbackUsed ?? false,
          row.status, row.errorCode?.slice(0, 60) ?? null, req.teamId ?? null, req.classId ?? null, req.refId?.slice(0, 80) ?? null,
        ],
      );
    } catch (error) {
      console.error('[llm] 호출 기록 실패:', (error as Error).message);
    }
  }
}

/** 구조화 출력 본문 — 첫 text 블록을 JSON 으로(SDK parse 와 같은 블록). 없거나 JSON 이 아니면 실패. */
function parseStructuredText(content: RawResponse['content']): { ok: true; value: unknown } | { ok: false } {
  const block = (content ?? []).find((b) => b.type === 'text' && typeof b.text === 'string');
  if (!block) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(block.text!) as unknown };
  } catch {
    return { ok: false };
  }
}

/** SDK 예외 → 결과 종류(형별 — 문구로 가르지 않는다). */
export function classifyError(error: unknown): Extract<LlmOutcome<never>, { kind: 'error' | 'invalid' }> {
  if (error instanceof Anthropic.RateLimitError) return { kind: 'error', code: 'rate_limited', retryable: true };
  if (error instanceof Anthropic.AuthenticationError) return { kind: 'error', code: 'auth', retryable: false };
  if (error instanceof Anthropic.PermissionDeniedError) return { kind: 'error', code: 'permission', retryable: false };
  if (error instanceof Anthropic.NotFoundError) return { kind: 'error', code: 'not_found', retryable: false };
  if (error instanceof Anthropic.BadRequestError) return { kind: 'error', code: 'bad_request', retryable: false };
  if (error instanceof Anthropic.UnprocessableEntityError) return { kind: 'error', code: 'unprocessable', retryable: false };
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { kind: 'error', code: 'timeout', retryable: true };
  if (error instanceof Anthropic.APIConnectionError) return { kind: 'error', code: 'connection', retryable: true };
  if (error instanceof Anthropic.InternalServerError) return { kind: 'error', code: 'server', retryable: true };
  if (error instanceof Anthropic.APIError) {
    const status = typeof error.status === 'number' ? error.status : 0;
    return { kind: 'error', code: `http_${status || 'unknown'}`, retryable: status === 408 || status === 409 || status >= 500 };
  }
  // SDK 의 구조화 출력 해석 실패 등(API 오류가 아닌 AnthropicError) — 답이 스키마에 맞지 않았다.
  if (error instanceof Anthropic.AnthropicError) return { kind: 'invalid', reason: 'parse_failed' };
  console.error('[llm] 예상하지 못한 오류:', (error as Error)?.message);
  return { kind: 'error', code: 'unknown', retryable: true };
}

/** 오늘(서울) LLM 호출 수 — 학급 · 모둠 · 작업으로 거른다(교사 화면 · 상한). */
export async function countLlmCallsToday(db: Queryable, filter: { classId?: string; teamId?: string; task?: LlmTask }): Promise<number> {
  const where: string[] = [`created_at >= ${KST_DAY_START_SQL}`];
  const args: unknown[] = [];
  if (filter.classId) where.push(`class_id = $${args.push(filter.classId)}`);
  if (filter.teamId) where.push(`team_id = $${args.push(filter.teamId)}`);
  if (filter.task) where.push(`task = $${args.push(filter.task)}`);
  const result = await db.query<{ n: number }>(`select count(*)::int as n from web.llm_calls where ${where.join(' and ')}`, args);
  return result.rows[0]?.n ?? 0;
}

/**
 * 학생 글 격리 — `<section id="…">` 안에 넣을 본문에서 태그 꼴을 무디게 한다(닫는 태그로 빠져나가지 못하게).
 * SMILES 원문처럼 보이는 토막은 '[구조식]'으로 가린다(설계 §5.11 ⑤ · §5.13 — 프롬프트에 SMILES 원문을 넣지 않는다).
 * 특허 출원서는 규칙(smiles_text)이 먼저 막고, 동물실험계획서 · IND · NDA 서류와 학습 채점(답 · 노트 · 피치)은 여기서 가린다.
 * 지시처럼 보이는 글은 `looksLikeInjection` 이 먼저 거른다(사전 필터 — 걸리면 LLM 을 부르지 않는다).
 */
export function fenceStudentText(text: string): string {
  return maskSmiles(text.normalize('NFC')).replace(/</g, '‹').replace(/>/g, '›');
}

/** SMILES 글자만 이어진 12자 이상 토막. */
const SMILES_TOKEN = /[A-Za-z0-9@+\-[\]()=#$\\/%.]{12,}/g;

/** 대괄호 밖에 올 수 있는 SMILES 원자 글자(B C N O P S F I · Cl Br · 방향족 b c n o s p) — 이 밖의 글자가 있으면 SMILES 가 아니다. */
const SMILES_ATOM_LETTERS = /^[BCNOPSFIHbcnosplr]*$/;

/**
 * SMILES 처럼 보이는 토막을 '[구조식]'으로 바꾼다 — 판단 기준은 web-contract `smilesInText`(특허 규칙)와 같다:
 * 괄호 · 결합 기호(= #) · 고리 번호(글자 뒤 숫자) · 대괄호 원자 가운데 두 가지 이상이 섞인 토막.
 * 가리기는 학습 답의 수식(예: IC50(nM)=12.3)도 지나갈 수 있어서, 대괄호 밖 글자가 모두 원자 기호이고 4개 이상일 때만 가린다.
 */
export function maskSmiles(text: string): string {
  return text.replace(SMILES_TOKEN, (raw) => {
    const token = raw.replace(/[.]+$/, '');
    if (token.length < 12) return raw;
    const letters = token.replace(/\[[^\]]*\]/g, '').replace(/[^A-Za-z]/g, '');
    if (letters.length < 4 || !SMILES_ATOM_LETTERS.test(letters)) return raw;
    const marks = (/[()]/.test(token) ? 1 : 0) + (/[=#]/.test(token) ? 1 : 0) + (/[a-z]\d|\]\d|[A-Z]\d/.test(token) ? 1 : 0) + (/\[|\]/.test(token) ? 1 : 0);
    return marks >= 2 ? `[구조식]${raw.slice(token.length)}` : raw;
  });
}

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+|the\s+)?(previous|above|prior)/i,
  /disregard\s+(all\s+|the\s+)?(previous|above|instructions)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\b/i,
  /\b(assistant|system)\s*:/i,
  /<\s*\/?\s*(section|system|instructions?)\b/i,
  /(이전|위|앞)의?\s*(지시|명령|규칙)(를|을)?\s*(무시|잊)/,
  /(통과|합격|pass)\s*(라고|로|으로)\s*(답|판정|출력|해)/i,
  /(verdict|판정)\s*[:=]\s*["']?pass/i,
  /시스템\s*프롬프트/,
  /너는\s*이제/,
];

/** 지시문 끼워 넣기처럼 보이나(정규식 사전 필터 — 설계 §5.11 ④ · learning-grant §4.3). */
export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
