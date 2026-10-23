/**
 * 3.1 물질특허 규격(설계 §5.8 · §5.8.1 · §5.11 · §7.4 ⑩ ⑪ ⑫) — 기능 F31.
 *
 * - 코드명 해부도 ②(브라우저 · 서버가 같은 함수 `checkCodeName`) · 출원서 칸 ③(`PATENT_SECTIONS` — 칸 단위 낙관적 잠금은 서버 reviews.ts `saveSection`) ·
 *   심사 ④(규칙 → LLM, 체크리스트 `PATENT_CHECKLIST`) · 학급 특허 원장 5.04(`PatentLedgerRow`) · 경로(`PATENT_API`).
 * - 표: web.patent_applications(+ 0012 의 물질 칸 · 거절 이유) · patent_sections · patents(학급 원장 · 부분 고유 키) · doc_reviews(0006).
 * - WS: 학급 'patent.ledger'(등록 · 포기) · 모둠 'doc.reviewed' · 모둠 'board.changed'(reason 'patent:…').
 * - 공개 범위(§5.3 · §5.8 ⑤): 등록 특허의 구조식 · 코드명은 학급 원장에 공개. 출원서 본문 · 심사 결과 · 후보 물성은 그 모둠과 교사만.
 *
 * 학생에게 보이는 문구는 `PATENT_COPY` 한곳에 모았다 — §5.12 대로 Gemini 4 Argon (High) 초안을 Claude 가 검토해 반영했다(식별자 · 숫자 · 규칙 값은 이 객체 밖).
 */
import { cristaToCents } from './money.ts';
import type { DocReviewView, DocSectionView, ReviewChecklistItem, RuleFinding } from './review.ts';
import type { Avatar } from './rules.ts';

// ── 규칙 값 ──

/** 코드명 — 티커 + '-' + 숫자 3자리(DB check 와 같음). 티커가 학급 유일이라 코드명도 학급 유일. */
export const CODE_NAME_PATTERN = /^[A-Z]{3,4}-\d{3}$/;

export type PatentApplicationStatus = 'draft' | 'reviewing' | 'revise' | 'rejected' | 'accepted' | 'abandoned';
export type PatentStatus = 'active' | 'abandoned';
/** 거절 이유 — 이미 알려진 물질(신규성) · 학급 원장에 같은 물질(선착순). */
export type PatentRejectReason = 'known' | 'duplicate';

/** 학급 설정 `maxPatentsPerTeam`(받아들여짐 + 심사 중을 합쳐 센다 — §5.8.1). */
export const MAX_PATENTS_DEFAULT = 3;
export const MAX_PATENTS_MIN = 1;
export const MAX_PATENTS_MAX = 4;

/** 출원료 250,000 크리스타($0.050M — crista PIPELINE_RULES.cost.patentCents 와 같은 값). 받아들여질 때 같은 트랜잭션에서 낸다. */
export const PATENT_FEE_CRISTA = 250_000;
export const PATENT_FEE_CENTS = cristaToCents(PATENT_FEE_CRISTA);

/** 심사관 판(프롬프트 · 체크리스트 · LLM 에 넘기는 규칙 지적 글을 바꾸면 올린다 — 같은 판의 같은 서류는 LLM 을 다시 부르지 않는다). v2 = 학생용 문구 반영(2026-10-24). */
export const PATENT_REVIEWER_VERSION = 'patent-v3'; // v3 = 심사관 '학생에게 말하는 법' 단락(reviews.ts REVIEWER_TALK_*)

/** 비슷한 선행 특허(§5.8 심사 4번) — 지문 계산 수단이 정해지면 쓴다(지금은 건너뜀). */
export const PRIOR_ART_TANIMOTO = 0.85;

/** 이미 알려진 물질로 보는 데이터셋 라이브러리(워커 compound_library 의 library 이름 그대로) + 표적 기준 리간드. */
export const PATENT_KNOWN_LIBRARIES: readonly string[] = ['ChEMBL 승인약', 'ZINC 소형'];

// ── 코드명 해부도 ② ──

export type CodeProblem = 'empty' | 'lowercase' | 'tick_chars' | 'tick_short' | 'tick_long' | 'tick_mismatch' | 'no_dash' | 'many_dash' | 'num_len' | 'num_digits' | 'taken';

export interface CodeCheck {
  ok: boolean;
  /** 조각 — 이름표 · 이음표 · 번호(틀려도 나눠 보인다). */
  tick: string;
  dash: boolean;
  num: string;
  problems: CodeProblem[];
}

/**
 * 코드명 즉시 검사(브라우저 · 서버 같은 함수) — 형식 · 이름표 = 우리 티커 · 번호 3자리 · 모둠 안 중복 없음.
 * `taken` 은 우리 모둠이 이미 쓴 코드명(이 출원서 것은 빼고 넘긴다).
 */
export function checkCodeName(raw: string, opts: { ticker: string | null; taken?: readonly string[] }): CodeCheck {
  const code = raw.trim();
  const problems: CodeProblem[] = [];
  if (code === '') return { ok: false, tick: '', dash: false, num: '', problems: ['empty'] };
  const dashes = code.split('-').length - 1;
  const at = code.indexOf('-');
  // 이음표가 없으면 앞의 글자 부분을 이름표, 나머지를 번호로 본다(예: SEUM102 → SEUM · 102).
  const tick = at < 0 ? (/^[A-Za-z]*/.exec(code)?.[0] ?? '') : code.slice(0, at);
  const num = at < 0 ? code.slice(tick.length) : code.slice(at + 1);
  if (/[a-z]/.test(tick)) problems.push('lowercase');
  else if (!/^[A-Z]*$/.test(tick)) problems.push('tick_chars');
  else if (tick.length < 3) problems.push('tick_short');
  else if (tick.length > 4) problems.push('tick_long');
  if (opts.ticker && tick.toUpperCase() !== opts.ticker && !problems.includes('tick_short') && !problems.includes('tick_long')) problems.push('tick_mismatch');
  if (dashes === 0) problems.push('no_dash');
  else if (dashes > 1) problems.push('many_dash');
  if (dashes === 1) {
    if (!/^\d*$/.test(num)) problems.push('num_digits');
    else if (num.length !== 3) problems.push('num_len');
  }
  if (problems.length === 0 && !CODE_NAME_PATTERN.test(code)) problems.push('tick_chars');
  if (problems.length === 0 && opts.taken?.includes(code)) problems.push('taken');
  return { ok: problems.length === 0, tick, dash: dashes >= 1, num, problems };
}

// ── 기전 한 줄(해부도의 아래 줄) ──

export type MechHow = 'selective' | 'reversible' | 'irreversible' | 'competitive';
export const MECH_HOW: readonly MechHow[] = ['selective', 'reversible', 'irreversible', 'competitive'];
export type MechAction = 'inhibitor' | 'agonist' | 'antagonist' | 'modulator';
export const MECH_ACTIONS: readonly MechAction[] = ['inhibitor', 'agonist', 'antagonist', 'modulator'];

/** 쉼표 목록 칸(기전 '어떻게' · 발명자) 읽기 — 빈 칸 · 겹침 제거, 순서 유지. */
export const parseList = (body: string): string[] => [...new Set(body.split(',').map((s) => s.trim()).filter(Boolean))];

// ── 출원서 칸 ③ ──

export type PatentSectionKey =
  | 'code_tick'
  | 'code_num'
  | 'mech_how'
  | 'mech_action'
  | 'mech_why'
  | 'title'
  | 'field'
  | 'background'
  | 'claim1'
  | 'claim2'
  | 'effect'
  | 'summary'
  | 'inventors';

export interface PatentSectionRule {
  /** text = 자유 글 · how = 기전 '어떻게'(여럿) · action = 기전 '무엇을 하나'(하나) · people = 발명자(모둠원 id 목록). */
  kind: 'text' | 'how' | 'action' | 'people';
  /** ② 해부도 칸인가(③ 출원서 칸과 나눠 보인다). */
  group: 'code' | 'doc';
  /** 심사 때 글자 수(문자 단위) — 저장은 0~max 를 받는다(쓰는 중). */
  min: number;
  max: number;
  /** LLM 심사관에게 보내나(발명자 = 모둠원 id 라 보내지 않는다 — §5.11 ⑤ 실명 금지). */
  toLlm: boolean;
}

export const PATENT_SECTIONS: Record<PatentSectionKey, PatentSectionRule> = {
  code_tick: { kind: 'text', group: 'code', min: 2, max: 60, toLlm: true },
  code_num: { kind: 'text', group: 'code', min: 4, max: 80, toLlm: true },
  mech_how: { kind: 'how', group: 'code', min: 1, max: 60, toLlm: true },
  mech_action: { kind: 'action', group: 'code', min: 1, max: 20, toLlm: true },
  mech_why: { kind: 'text', group: 'code', min: 6, max: 120, toLlm: true },
  title: { kind: 'text', group: 'doc', min: 10, max: 60, toLlm: true },
  field: { kind: 'text', group: 'doc', min: 8, max: 160, toLlm: true },
  background: { kind: 'text', group: 'doc', min: 20, max: 400, toLlm: true },
  claim1: { kind: 'text', group: 'doc', min: 15, max: 300, toLlm: true },
  claim2: { kind: 'text', group: 'doc', min: 15, max: 300, toLlm: true },
  effect: { kind: 'text', group: 'doc', min: 30, max: 600, toLlm: true },
  summary: { kind: 'text', group: 'doc', min: 10, max: 100, toLlm: true },
  inventors: { kind: 'people', group: 'doc', min: 1, max: 200, toLlm: false },
};

export const PATENT_SECTION_KEYS = Object.keys(PATENT_SECTIONS) as PatentSectionKey[];
export const isPatentSection = (key: string): key is PatentSectionKey => Object.hasOwn(PATENT_SECTIONS, key);

const charLen = (s: string): number => Array.from(s).length;

/**
 * 저장할 때의 칸 모양 검사(빈 칸 = 지우기는 늘 됨) — 길이 상한 · 고르는 칸의 값. 틀리면 이유(문구 키), 맞으면 null.
 * 발명자 칸의 '모둠원인가'는 서버가 따로 본다.
 */
export function sectionShapeProblem(key: PatentSectionKey, body: string): 'too_long' | 'bad_choice' | 'bad_people' | null {
  const rule = PATENT_SECTIONS[key];
  if (body === '') return null;
  if (charLen(body) > rule.max) return 'too_long';
  if (rule.kind === 'how') return parseList(body).every((v) => (MECH_HOW as readonly string[]).includes(v)) ? null : 'bad_choice';
  if (rule.kind === 'action') return (MECH_ACTIONS as readonly string[]).includes(body) ? null : 'bad_choice';
  if (rule.kind === 'people') return parseList(body).every((v) => /^[0-9a-f-]{36}$/i.test(v)) ? null : 'bad_people';
  return null;
}

/** 심사 전 칸 점검(규칙 1 '형식') — 칸마다 빠짐 · 짧음 · 김 · 고르기 규칙. 문제가 없으면 null. */
export function sectionReviewProblem(key: PatentSectionKey, body: string): 'missing' | 'too_short' | 'too_long' | 'bad_choice' | 'conflict' | null {
  const rule = PATENT_SECTIONS[key];
  const text = body.trim();
  if (text === '') return 'missing';
  const shape = sectionShapeProblem(key, text);
  if (shape === 'too_long') return 'too_long';
  if (shape) return 'bad_choice';
  if (rule.kind === 'how') {
    const picked = parseList(text);
    if (picked.length === 0) return 'missing';
    if (picked.includes('reversible') && picked.includes('irreversible')) return 'conflict';
    return null;
  }
  if (rule.kind === 'people') return parseList(text).length >= rule.min ? null : 'missing';
  if (rule.kind === 'text' && charLen(text) < rule.min) return 'too_short';
  return null;
}

/**
 * 칸 글에 SMILES 원문이 있나 — 출원서는 '구조식 1'로 가리킨다(§5.11 ⑤ — SMILES 원문을 심사관 프롬프트에 넣지 않게 규칙에서 막는다).
 * 글자 12자 이상 · 공백 없음 · 괄호/결합/고리 번호가 섞인 토큰.
 */
export function smilesInText(text: string, known: readonly string[] = []): boolean {
  for (const s of known) if (s && s.length >= 6 && text.includes(s)) return true;
  // SMILES 글자만 이어진 토막(붙은 조사 · 문장부호는 저절로 떨어진다).
  for (const raw of text.match(/[A-Za-z0-9@+\-[\]()=#$\\/%.]{12,}/g) ?? []) {
    const token = raw.replace(/[.]+$/, '');
    if (token.length < 12) continue;
    const marks = (/[()]/.test(token) ? 1 : 0) + (/[=#]/.test(token) ? 1 : 0) + (/[a-z]\d|\]\d|[A-Z]\d/.test(token) ? 1 : 0) + (/\[|\]/.test(token) ? 1 : 0);
    if (marks >= 2) return true;
  }
  return false;
}

// ── 심사 ④ ──

/** 규칙 검사 id(§5.8 심사 1~4). LLM 체크리스트 id 와 겹치지 않는다. */
export type PatentRuleId =
  | 'format'
  | `format_${PatentSectionKey}`
  | 'code_name'
  | 'smiles_text'
  | 'limit'
  | 'balance'
  | 'novelty'
  | 'class_duplicate'
  | 'prior_art'
  /** 받아들일 때 출원서가 지금 표적 버전이 아님(심사 중 표적을 바꿈). */
  | 'revision';

/** LLM 심사관 체크리스트(§5.8 '심사에서 보는 것'). 칸 키는 위 PATENT_SECTIONS. 기준 앞의 「칸 이름」은 피드백이 칸 키(effect) 대신 칸 이름으로 말하게 한다. 바꾸면 PATENT_REVIEWER_VERSION 을 올린다. */
export const PATENT_CHECKLIST: readonly ReviewChecklistItem[] = [
  { id: 'title_clear', section: 'title', criterion: '「발명의 명칭」 칸 — 명칭만 읽어도 무엇(표적 · 화합물 계열)에 관한 발명인지 드러나나' },
  { id: 'code_meaning', section: 'code_tick', criterion: '「이름표의 뜻 · 번호를 붙인 이유」 칸 — 코드명 조각마다 적은 뜻(이름표 · 번호를 붙인 이유)이 앞뒤가 맞나' },
  { id: 'mech_fits_target', section: 'mech_why', criterion: '「기전」 칸 — 기전 한 줄(어떻게 · 무엇을 하나 · 이유)이 사실의 표적 종류와 맞고 이유가 적혀 있나' },
  { id: 'field_fits', section: 'field', criterion: '「기술분야」 칸 — 기술분야가 사실의 표적 · 질환과 맞나' },
  { id: 'background_specific', section: 'background', criterion: '「배경기술 · 해결하려는 과제」 칸 — 기준 약의 한계와 해결하려는 과제가 구체적인가' },
  { id: 'claim1_structure', section: 'claim1', criterion: '「청구항 1」 칸 — 청구항 1 이 첨부한 구조식 1 의 화합물(또는 그 약학적으로 허용되는 염)을 청구 대상으로 하나' },
  { id: 'claim2_disease', section: 'claim2', criterion: '「청구항 2」 칸 — 청구항 2 의 질환(용도)이 사실의 표적 · 질환과 맞나' },
  { id: 'effect_matches_facts', section: 'effect', criterion: '「발명의 효과」 칸 — 효과 주장이 사실의 숫자(ΔG · 기준 약 ΔG · ADMET 값)와 맞나' },
  { id: 'summary_consistent', section: 'summary', criterion: '「요약」 칸 — 요약이 명칭 · 청구항과 맞나' },
];

// ── 화면 모양 ──

/** 서버가 채우는 근거(학생이 못 고침 — 실시예 · 출원인 · 구조식). 그 모둠과 교사만. */
export interface PatentFactsView {
  ticker: string;
  companyName: string;
  targetId: string | null;
  gene: string | null;
  targetLabel: string | null;
  disease: string | null;
  referenceName: string | null;
  referenceKcal: number | null;
  /** 2.1 도킹 ΔG(이 후보의 ADMET 가 부모로 둔 도킹 작업). */
  dockingKcal: number | null;
  /** 도킹 작업의 부모(구조 바꿔 다시) ΔG — 없으면 null. */
  parentKcal: number | null;
  /** PLIP 상호작용 잔기(도킹 결과 표). */
  residues: string[];
  /** 2.2 ADMET 지표(결과 그대로). */
  admet: Array<{ label: string; value: string; unit: string | null }>;
  /** 구조식 1 — 입체 포함 정규 SMILES · 평면 SMILES(같은 물질 판정 단위). */
  canonicalSmiles: string | null;
  flatSmiles: string | null;
  mw: number | null;
  tpsa: number | null;
  clogp: number | null;
  qed: number | null;
  admetJobId: string;
  dockingJobId: string | null;
  /** 이미 알려진 물질로 보았나(데이터셋 승인약 · ZINC · 기준 리간드 · 2.2 표시). */
  known: boolean;
  label: string | null;
}

/** 2.2 특허 후보(lead_candidates) 한 장 — 출원할 후보 ①. */
export interface PatentCandidateView {
  admetJobId: string;
  label: string | null;
  smiles: string | null;
  dockingKcal: number | null;
  /** 2.2 근거 키(FSEL). */
  reason: string;
  known: boolean;
  pickedByName: string | null;
  avatar: Avatar | null;
  /** 이 후보로 살아 있는 출원서(초안 · 심사 중 · 보완 · 받아들여짐). */
  applicationId: string | null;
}

export interface PatentApplicationView {
  id: string;
  revisionId: string;
  /** 지금 표적 버전의 출원서인가(옛 표적 버전 것은 원장 · 상한에만 센다). */
  current: boolean;
  admetJobId: string;
  codeName: string | null;
  status: PatentApplicationStatus;
  rejectReason: PatentRejectReason | null;
  /** 서류 판 — 심사 요청이 고정한다. */
  version: number;
  sections: DocSectionView[];
  facts: PatentFactsView;
  review: DocReviewView | null;
  /** 받아들여졌으면 원장 줄. */
  patent: { id: string; patentNo: string; classSeq: number; status: PatentStatus; filedGameDay: number } | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 5.04 학급 특허 원장 한 줄 — 등록 · 포기(학급 공개) + 우리 모둠만 보는 '거절 · 이미 있음' 빨간 줄. */
export interface PatentLedgerRow {
  /** 원장 줄은 특허 id, 우리 빨간 줄은 출원서 id. */
  id: string;
  kind: 'patent' | 'rejected';
  classSeq: number | null;
  patentNo: string | null;
  teamId: string;
  ticker: string | null;
  companyName: string | null;
  ink: number;
  codeName: string | null;
  gene: string | null;
  disease: string | null;
  /** 등록 특허의 구조식(공개 — §5.8 ⑤). 빨간 줄은 우리 것이라 보인다. */
  canonicalSmiles: string | null;
  filedGameDay: number | null;
  status: PatentStatus | 'rejected';
  mine: boolean;
  createdAt: string;
}

export interface PatentLedgerResponse {
  classId: string;
  rows: PatentLedgerRow[];
}

export interface PatentsResponse {
  ticker: string;
  companyName: string;
  revisionId: string | null;
  maxPatentsPerTeam: number;
  /** 받아들여짐 + 심사 중(모둠 전체 — 상한에 세는 수). */
  used: number;
  feeCents: number;
  balanceCents: number;
  gameDay: number;
  /** 우리 모둠이 이미 쓴 코드명(모든 출원서 — 학급 고유 키라 다시 못 씀). */
  takenCodes: Array<{ codeName: string; applicationId: string }>;
  candidates: PatentCandidateView[];
  applications: PatentApplicationView[];
  ledger: PatentLedgerRow[];
}

// ── 요청 ──

export interface PatentCreateRequest {
  admetJobId: string;
}
/** 코드명 — 화면이 읽은 코드명(`expectedCode`, 비었으면 null)이 지금과 다르면 409 stale(그 칸만의 낙관적 잠금). */
export interface PatentCodeRequest {
  codeName: string | null;
  expectedCode: string | null;
}
/** 심사 요청 — 화면이 본 서류 판. 그 사이 칸이 바뀌었으면 409 stale(다시 읽고 낸다). */
export interface PatentReviewRequest {
  docVersion: number;
}
export interface PatentPrecheckResponse {
  findings: RuleFinding[];
  docVersion: number;
}

export const PATENT_API = {
  /** 모둠 — 후보 · 출원서 · 원장 한 번에. */
  patents: '/api/patents',
  /** 학급 원장(학생 = 내 학급, 교사 = ?classId=). */
  ledger: '/api/patents/ledger',
  applications: '/api/patents/applications',
  code: (applicationId: string) => `/api/patents/applications/${applicationId}/code`,
  section: (applicationId: string, section: string) => `/api/patents/applications/${applicationId}/sections/${section}`,
  precheck: (applicationId: string) => `/api/patents/applications/${applicationId}/precheck`,
  review: (applicationId: string) => `/api/patents/applications/${applicationId}/review`,
  /** 초안 · 보완 출원서 거두기 · 등록 특허 포기(슬롯 반환 · 환급 없음 · 소식 없음). */
  abandon: (applicationId: string) => `/api/patents/applications/${applicationId}/abandon`,
} as const;

/** 출원번호(시안 `KR-37-4821` 꼴) — 학급 번호 2자리(학급 id 에서 정함) · 학급 안 순서 4자리. */
export function patentNumber(classId: string, classSeq: number): string {
  const hex = classId.replace(/[^0-9a-f]/gi, '').slice(0, 6) || '0';
  const classNo = (parseInt(hex, 16) % 90) + 10;
  return `KR-${classNo}-${String(classSeq).padStart(4, '0')}`;
}

/** 구조 지문 5.06 — 두 SMILES 의 다른 구간(앞 · 뒤 공통 부분을 뺀 가운데, b 기준). 같으면 start = end. */
export function smilesDiff(a: string, b: string): { start: number; end: number } {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  return { start: i, end: b.length - j };
}

// ── 학생에게 보이는 문구(§5.12 — Gemini 4 Argon (High) 초안 → Claude 검토 · `.review/2026-10-24-copy-3.1/copy.md`) ──
// 돈 자리표시자(`fee` · `balance`)는 `formatCrista` · `formatCentsAsCrista` · 웹 `money` 결과(단위까지 든 글)를 받는다 — 문구에 '크리스타'를 다시 쓰지 않는다.
// `{name}` 꼴 자리표시자가 남은 글(칸 안내 · 예시 · 코드명 문제)은 `fillPatentCopy` 로 채운다(값이 없으면 자리표시자를 그대로 둔다).

/** `{ticker}` · `{gene}` 같은 자리표시자 채우기. */
export const fillPatentCopy = (text: string, values: Record<string, string | number | null | undefined>): string =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (values[k] === undefined || values[k] === null ? m : String(values[k])));

export const PATENT_COPY = {
  tabs: { pick: '출원할 후보 고르기', code: '코드명 해부도', doc: '출원서 쓰기', review: '심사 요청', ledger: '원장 등재' },
  slots: (used: number, max: number) => `모둠 출원 칸 ${used} / ${max}(받아들여짐 + 심사 중)`,
  noCandidates: '아직 특허를 출원할 후보 물질이 없어요. 2.2 단계에서 후보를 먼저 골라 주세요.',
  knownChip: '이미 알려진 물질',
  openApp: '출원서 열기',
  newApp: '이 후보로 출원서 만들기',
  fingerprintTitle: '구조 지문 — 기준 약과 다른 자리 찾기',
  fingerprintNote: (ref: string) =>
    `SMILES(분자를 한 줄 글자로 적은 것)를 글자마다 막대로 세웠어요. 기준 약(${ref})과 다른 글자만 형광으로 칠했어요. 원자 하나라도 다른 새 분자여야 특허를 받을 수 있어요.`,
  sameAsRef: (ref: string) => `기준 약(${ref})과 SMILES 글자가 모두 같아요. 이미 알려진 물질이라 특허를 받을 수 없어요.`,
  formatLine: "형식: 영문 대문자 3~4자 + '-' + 숫자 3자리. 받아들여지면 바꿀 수 없어요.",
  /** 코드명 문제 — `{ticker}` · `{code}` 는 `codeProblemText` 가 채운다(서버 오류 글도 같은 함수). */
  codeProblem: {
    empty: '코드명을 입력해 주세요(예: {ticker}-101).',
    lowercase: '이름표에 소문자가 있어요. 영문 대문자로 써요.',
    tick_chars: '이름표에는 영문 대문자(A~Z)만 쓸 수 있어요.',
    tick_short: '이름표가 너무 짧아요. 영문 대문자 3~4자여야 해요.',
    tick_long: '이름표가 너무 길어요. 영문 대문자 3~4자여야 해요.',
    tick_mismatch: '이름표가 우리 티커와 달라요. 앞 조각은 {ticker} 그대로 써요.',
    no_dash: '이름표와 번호 사이에 이음표(-)를 넣어 주세요(예: {ticker}-101).',
    many_dash: '이음표(-)는 가운데 하나만 넣어야 해요.',
    num_len: '번호는 정확히 숫자 3자리여야 해요(예: 101).',
    num_digits: '번호에는 숫자(0~9)만 쓸 수 있어요.',
    taken: '우리 모둠이 이미 쓴 코드명이에요({code}). 다른 3자리 번호를 골라요.',
  } satisfies Record<CodeProblem, string>,
  codeOk: (code: string) => `사용할 수 있는 코드명이에요(${code}).`,
  codeLocked: (code: string) => `특허가 받아들여져서 코드명(${code})을 더 이상 바꿀 수 없어요.`,
  codeLockedReviewing: (code: string) => `심사가 진행 중이라 지금은 코드명(${code})을 고칠 수 없어요.`,
  /** 해부도 그림의 짧은 이름표(그림 안) — 풀이는 `pieceDesc`. */
  pieces: { tick: '이름표(티커)', dash: '이음표', num: '번호 3자리' },
  pieceDesc: {
    tick: (ticker: string) => `이름표 — 우리 스타트업의 티커(회사를 나타내는 영문 대문자 3~4자 약자, ${ticker})가 자동으로 들어가요.`,
    dash: '이음표 — 이름표와 번호 사이를 잇는 붙임표(-) 한 글자예요.',
    num: '번호 — 숫자 3자리로 후보 물질의 고유 번호를 붙여요(예: 101, 102).',
  },
  mechTargetGuide: (gene: string) => `우리 모둠이 고른 표적의 유전자(${gene})가 자동으로 들어가요. 지금 표적 버전의 표적과 같아야 해요.`,
  howLabel: { selective: '선택적', reversible: '가역', irreversible: '비가역', competitive: '경쟁적' } satisfies Record<MechHow, string>,
  howDesc: {
    selective: '목표 표적({gene})에 주로 붙고 다른 단백질은 덜 건드려요.',
    reversible: '표적에 붙었다가 다시 떨어질 수 있어요. 비가역과 함께 고를 수 없어요.',
    irreversible: '보통 공유 결합(두 원자가 전자를 나눠 갖는 강한 결합)으로 표적에 붙어요. 한 번 붙으면 잘 떨어지지 않아요. 가역과 함께 고를 수 없어요.',
    competitive: '기질(효소가 원래 붙잡아 바꾸는 물질)이나 원래 신호 물질이 붙는 바로 그 자리를 두고 다퉈요.',
  } satisfies Record<MechHow, string>,
  actionLabel: { inhibitor: '억제제', agonist: '작용제', antagonist: '길항제', modulator: '조절제' } satisfies Record<MechAction, string>,
  actionDesc: {
    inhibitor: '효소나 수송체 같은 표적이 하는 일을 막거나 줄여요.',
    agonist: '수용체에 붙어 원래 신호 물질처럼 신호를 켜요.',
    antagonist: '수용체에 붙지만 신호를 켜지 않아요. 원래 신호 물질이 붙지 못하게 자리를 막아요.',
    modulator: '표적이 일하는 세기를 높이거나 낮춰요. 원래 물질과 다른 자리에 붙는 경우가 많아요.',
  } satisfies Record<MechAction, string>,
  /** 칸 이름 — 서버 규칙 지적 · 심사 결과의 칸 이름에도 쓴다(LLM 체크리스트의 「칸 이름」과 같게). */
  sectionLabel: {
    code_tick: '이름표의 뜻',
    code_num: '번호를 붙인 이유',
    mech_how: '기전 — 어떻게',
    mech_action: '기전 — 무엇을 하나',
    mech_why: '기전을 고른 이유',
    title: '발명의 명칭',
    field: '기술분야',
    background: '배경기술 · 해결하려는 과제',
    claim1: '청구항 1(물질)',
    claim2: '청구항 2(용도)',
    effect: '발명의 효과',
    summary: '요약',
    inventors: '발명자',
  } satisfies Record<PatentSectionKey, string>,
  /** 칸 안내 — `{ticker}` · `{gene}` · `{disease}` · `{ref}` · `{refDG}` · `{dG}` · `{parentDG}` 는 `fillPatentCopy`. */
  sectionGuide: {
    code_tick: '우리 스타트업 티커({ticker})가 무슨 뜻인지 한 줄(2~60자)로 적어 주세요.',
    code_num: '이 후보에 왜 이 3자리 번호를 붙였는지 한 줄(4~80자)로 적어 주세요.',
    mech_how: '표적({gene})에 어떻게 결합하는지 하나 이상 골라 주세요. 가역과 비가역은 함께 고를 수 없어요.',
    mech_action: '표적({gene})의 기능을 어떻게 바꾸는지 넷 중에서 하나를 골라 주세요.',
    mech_why: '표적({gene})의 특성과 도킹 결과를 근거로 왜 위 기전을 골랐는지 한 줄(6~120자)로 적어 주세요.',
    title: '무엇에 관한 발명인지 드러나도록 표적({gene})과 작용을 넣어 10~60자로 적어 주세요. SMILES 원문은 쓰지 마세요.',
    field: '이 발명이 어떤 표적({gene})과 질환({disease})에 쓰이는 기술인지 한 문장(8~160자)으로 적어 주세요.',
    background: '이미 있는 기준 약({ref}, ΔG(결합 자유 에너지) {refDG})의 한계와 우리 분자로 해결하려는 과제를 2~3줄(20~400자)로 구체적으로 적어 주세요.',
    claim1:
      "특허로 지킬 물질을 청구하는 칸이에요(15~300자). SMILES 글자를 쓰지 말고 '구조식 1'로 가리켜요. 약학적으로 허용되는 염은 약 성분을 산이나 염기와 짝지어 더 잘 녹거나 더 안정하게 만든 형태예요.",
    claim2: '청구항 1 의 화합물을 어떤 질환({disease})에 쓸지 15~300자로 적어요. 질환이 우리 표적과 맞아야 해요. 유효성분은 약에서 실제로 효과를 내는 성분이에요.',
    effect:
      '데이터 해석을 2~4줄(30~600자)로 적어요. 도킹 ΔG({dG})를 기준 약({refDG}) · 부모 분자({parentDG})와 견줘요. ΔG(결합 자유 에너지)는 더 낮은 음수일수록 단단히 붙는다는 뜻이에요. 2.2 ADMET 신호에서 나아진 점도 적을 수 있어요. 주장은 첨부 숫자와 맞아야 해요.',
    summary: '발명의 명칭과 청구항의 핵심 내용을 10~100자로 간추려 적어 주세요.',
    inventors: '이 후보 물질을 발굴하고 출원서를 함께 쓴 우리 모둠원을 골라 주세요.',
  } satisfies Record<PatentSectionKey, string>,
  /** 칸 예시(빈 칸의 흐린 글) — 설계 예시(SEUM · ACHE · 알츠하이머 · ○○)를 그대로 쓴 고정 글. `{disease}` · `{company}` 만 채운다. */
  sectionExample: {
    code_tick: '예: SEUM = 세움제약',
    code_num: '102 = 1번 프로그램의 두 번째 후보예요.',
    mech_how: '선택적 · 가역 (다른 단백질은 덜 건드리고, 붙었다 떨어질 수 있게 작동해요)',
    mech_action: '억제제 (예: AChE 효소가 하는 일을 막아요)',
    mech_why: '예: 공유 결합을 만들 반응성 부분이 없고, 도킹에서 AChE 활성 부위에 맞물려서 가역 억제제로 보았어요.',
    title: '예: ACHE 억제 활성을 갖는 ○○ 계열 화합물',
    field: '예: 이 발명은 AChE 를 억제해 알츠하이머병을 예방하거나 치료하는 새 화합물에 관한 것이에요.',
    background: '예: 기준 약은 ○○ 부작용이 알려져 있어요. 이 발명은 결합력을 지키면서 그 위험을 줄인 새 분자를 내놓으려 해요.',
    claim1: '구조식 1 로 표시되는 화합물 또는 그 약학적으로 허용되는 염',
    claim2: '청구항 1 의 화합물을 유효성분으로 포함하는 {disease} 예방 또는 치료용 약학 조성물',
    effect: "예(숫자는 보기): 도킹 ΔG 가 -9.1 kcal/mol 로 기준 약(-8.7)보다 0.4 낮아요. 그래서 더 단단히 붙을 것으로 예측돼요. 부모 분자(-8.2)보다도 0.9 낮아졌어요. 도킹은 계산 예측이라 '예측돼요'로 써요.",
    summary: '예: AChE 를 억제하는 구조식 1 의 새 화합물과, 이를 유효성분으로 하는 알츠하이머병 치료용 약학 조성물',
    inventors: '우리 스타트업({company})에서 후보 설계와 명세서 작성에 참여한 모둠원을 선택해요.',
  } satisfies Record<PatentSectionKey, string>,
  /** 심사 전 칸 점검(규칙 1 '형식') — 앞에 칸 이름이 붙는다(`rule.format`). */
  sectionProblem: {
    missing: (_min: number, _max: number) => '칸이 비어 있어요. 내용을 채워 주세요.',
    too_short: (min: number, _max: number) => `칸이 너무 짧아요. ${min}자 이상 적어 주세요.`,
    too_long: (_min: number, maxLen: number) => `칸이 너무 길어요. ${maxLen}자 이내로 줄여 주세요.`,
    bad_choice: (_min: number, _max: number) => '칸에 고를 수 없는 선택지가 들어 있어요.',
    conflict: (_min: number, _max: number) => "기전 '어떻게'에서 가역과 비가역은 함께 고를 수 없어요. 둘 중 하나만 골라 주세요.",
  },
  saveProblem: {
    too_long: (maxLen: number) => `글자 수가 상한(${maxLen}자)을 넘어 저장할 수 없어요. 조금 줄여서 다시 저장해 주세요.`,
    bad_choice: (_maxLen: number) => '허용되지 않는 선택지가 들어 있어 저장할 수 없어요.',
    bad_people: (_maxLen: number) => '발명자에 우리 모둠원이 아닌 사람이 있어요.',
  },
  serverFilled: '서버가 자동으로 채운 근거 자료예요(학생이 고칠 수 없어요).',
  facts: {
    applicant: '출원인',
    target: '표적 · 질환',
    reference: '기준 약',
    structure: '구조식 1 · 입체 포함 정규 SMILES(원자가 공간에 놓인 방향까지 적은 표준 한 줄 표기)',
    flat: '평면 SMILES(입체 방향을 빼고 연결만 한 줄 글자로 적은 표기 — 신규성 · 학급 중복 판정 기준)',
    docking: '도킹 ΔG(더 낮은 음수일수록 단단히 붙어요)',
    parent: '부모 분자(고치기 전 원래 분자) ΔG',
    residues: '상호작용 잔기(단백질 사슬 속 아미노산 하나하나) — PLIP(단백질과 분자 사이 붙는 방식을 찾는 도구)',
    admet: '2.2 단계 ADMET(흡수 · 분포 · 대사 · 배설 · 독성) 신호 요약',
    props: '분자 기본 물성',
    filed: '출원일(게임 날짜)',
    evidence: '실시예(근거 자료 — 도킹 · ADMET 작업 번호 및 물성 기록)',
  },
  rule: {
    format: (label: string, problem: string) => `${label}: ${problem}`,
    codeName: (ticker: string) => `코드명 해부도에 아직 고쳐야 할 조각이 있어요. 이름표(${ticker})와 3자리 번호 규칙을 확인해 주세요.`,
    smilesText: "출원서 칸 글에 SMILES 원문을 직접 쓰면 규칙에서 막혀요. 분자 구조는 '구조식 1'로 가리켜 적어 주세요.",
    limit: (max: number) => `모둠 출원 칸(${max}건)이 찼어요. 받아들여짐과 심사 중인 출원서만 세요. 등록 특허를 포기하거나 심사가 끝나길 기다려요.`,
    balance: (balance: string, fee: string) => `남은 연구비(${balance})가 출원료(${fee})보다 적어요. 출원료는 받아들여질 때 내요.`,
    // 규칙 지적은 80자 안(§5.13 지적 길이 · 시험 '규칙 문구는 80자 안') — 풀이는 `noveltyHelp` · 원장 · 구조 지문 화면이 맡는다.
    novelty: '거절 — 이미 알려진 물질이에요(5.06 구조 지문). 2.1 에서 구조를 바꿔 새 분자로 내세요.',
    noveltyHelp:
      "평면 SMILES 가 공개 분자 목록(데이터셋) 'ChEMBL 승인약' · 'ZINC 소형'의 분자나 표적 기준 리간드(이 표적에 붙는다고 알려진 기준 분자)와 같으면 이미 알려진 물질이에요.",
    duplicate: (code: string) => `거절 · 이미 있음 — 학급 원장에 같은 물질의 유효 특허가 있어요(${code}). 2.1 에서 변형체를 만들어 다시 와요.`,
    duplicateAtAccept: '거절 · 이미 있음 — 받아들이는 순간 같은 물질이 먼저 등록됐어요. 출원료는 내지 않았어요.',
    balanceAtAccept: (balance: string, fee: string) => `보완 — 받아들일 때 연구비(${balance})가 출원료(${fee})보다 적었어요. 연구비를 채우고 다시 요청해요.`,
    limitAtAccept: (max: number) => `보완 — AI 심사는 통과했어요. 하지만 등록하는 순간 모둠 출원 칸(${max}건)이 이미 차 있어서 등재하지 못했어요.`,
    oldRevisionAtAccept: '심사 중에 표적이 바뀌어 등록하지 않았어요. 출원료는 내지 않았어요. 이 출원서는 거둘 수 있어요.',
    priorArtSkipped: '비슷한 선행 특허 검사(지문 유사도)는 아직 준비 중이라 건너뛰었어요.',
    formatOk: '형식 통과 — 필수 칸 · 길이 · 고르는 칸 모두 맞아요.',
    inventorNotMember: '발명자에 우리 모둠원이 아닌 사람이 들어 있어요. 모둠원 중에서 다시 골라 주세요.',
    noveltyOk: '신규성 통과 — 데이터셋 승인약 · ZINC 분자 · 기준 리간드와 다른 새 물질이에요.',
    duplicateOk: '학급 중복 통과 — 학급 원장에 같은 물질이 없어요.',
    limitOk: (used: number, max: number) => `모둠 상한 통과 — 모둠 출원 칸 ${used} / ${max}건을 쓰고 있어 출원할 수 있어요.`,
    balanceOk: (balance: string, fee: string) => `잔액 통과 — 남은 연구비(${balance})가 출원료(${fee}) 이상이에요.`,
    ok: '통과',
    allOk: '규칙 점검을 모두 통과했어요. 이제 심사를 요청할 수 있어요.',
  },
  status: { draft: '초안', reviewing: '심사 중', revise: '보완', rejected: '거절', accepted: '받아들여짐', abandoned: '거둠 · 포기' } satisfies Record<PatentApplicationStatus, string>,
  rejectReason: { known: '거절 · 이미 알려진 물질', duplicate: '거절 · 이미 있음' } satisfies Record<PatentRejectReason, string>,
  /** 교사가 손으로 거절했을 때(규칙 이유 없음). */
  rejectedByTeacher: '거절 · 선생님 판정',
  reviewStage: {
    rules: '규칙 검사에서 끝났어요. AI 심사는 하지 않았어요.',
    cached: '이전에 심사받은 서류 판과 내용이 같아서 저장된 심사 결과를 불러왔어요.',
    queued: '심사 중 — AI 심사관이 출원서 칸들을 읽고 있어요. 읽은 뒤 판정을 정리하는 기간을 거쳐 결과가 나와요.',
    done: '서류 심사가 끝났어요. 아래 결과판에서 판정과 피드백을 확인해 보세요.',
    retrying: '심사 대기 — AI 심사가 밀려 다시 시도하고 있어요. 그동안에도 출원서 칸은 고칠 수 있어요.',
    deliberating: '심사관이 판정을 정리하고 있어요. 결과가 나오면 알림으로 알려 드려요.',
    auto: 'AI 심사관을 쓸 수 없어 규칙으로 판정했어요(규칙 검사 · 칸 채움). 선생님이 나중에 정정할 수 있어요.',
    manual: '선생님이 직접 검토하거나 이의 제기를 반영해 정정한 판정이에요(원래 심사 기록은 보존돼요).',
  } satisfies Record<DocReviewView['stage'], string>,
  verdict: { pending: '심사 중', pass: '받아들임', revise: '보완', reject: '거절' } satisfies Record<DocReviewView['verdict'], string>,
  itemStatus: { ok: '알맞음', missing: '빠진 내용 있음', inconsistent: '앞뒤 안 맞음', unclear: '분명하지 않음' },
  nextRevise: '보완은 지적받은 칸을 고쳐서 다시 내면 돼요. 종합 피드백이 짚은 칸 이름부터 확인해요.',
  nextReject: '거절된 분자로는 다시 출원할 수 없어요. 2.1 에서 변형체(구조를 조금 바꾼 분자)를 만들고 2.2 를 거쳐 3.1 로 다시 와요.',
  changedAfterReview: '심사 뒤 바뀜 — 심사 중이거나 심사가 끝난 뒤에 고친 칸이 있어요. 이 결과는 심사했던 글에만 해당해요. 바뀐 글로 다시 심사를 요청해 주세요.',
  precheck: '제출 전 규칙 점검 (즉시 · 무료)',
  request: '심사 요청(무료 · 받아들여지면 출원료)',
  abandonApp: '출원서 거두기',
  abandonPatent: '등록 특허 포기하기',
  abandonConfirm: (code: string, fee: string) =>
    `${code} 등록 특허를 포기할까요? 모둠 출원 칸은 하나 돌아와요. 낸 출원료 ${fee}는 돌려받지 못해요. 그 분자는 다른 모둠이 출원할 수 있게 돼요.`,
  withdrawConfirm: '이 출원서를 거둘까요? 이 후보로 새 출원서를 다시 만들 수 있어요. 같은 코드명은 다시 못 써요.',
  ledgerTitle: '학급 특허 원장',
  ledgerEmpty: '아직 등록된 특허가 없어요.',
  ledgerStatus: { active: '등록', abandoned: '포기', rejected: '거절 · 이미 있음' },
  redRowNote: '빨간 줄은 같은 물질이 다른 모둠 것으로 먼저 받아들여져 거절된 우리 출원서예요. 이 줄은 우리 화면에만 보여요. 다른 모둠 원장에는 등록 줄만 보여요.',
  mine: '우리',
  accepted: (code: string, patentNo: string, seq: number, fee: string) =>
    `받아들여졌어요! 학급 특허 원장에 올랐어요(코드명 ${code} · 출원번호 ${patentNo}). 우리 학급에서 ${seq}번째 특허예요. 출원료 ${fee}를 냈어요.`,
  /** 화면 틀 문구(s31.tsx) — 단추 · 패널 제목 · 표 머리 · 화면 낭독기 글. */
  ui: {
    pickFirst: '출원서를 먼저 골라요',
    loading: '불러오는 중…',
    pickReason: '2.2 근거',
    candidate: '후보',
    ourCandidate: '우리 후보',
    refRow: (name: string | null) => `${name ?? '기준 약'}(기준)`,
    fingerprintAria: (name: string, n: number) => `${name} — 기준 약과 다른 글자 ${n}자`,
    legend: { c: 'C · c 탄소(소문자 c 는 고리 속 방향족 탄소 — 고리 전체가 전자를 고르게 나눠 가진 탄소)', n: 'N 질소', o: 'O 산소', x: '할로젠', hit: '▼ 형광 = 기준 약과 다른 곳' },
    feeBalance: (fee: string, balance: string) => `출원료 ${fee} · 잔액 ${balance}`,
    slotUsed: '사용',
    slotEmpty: '빈 칸',
    ourApps: '우리 출원서',
    count: (n: number) => `${n}건`,
    none: '아직 없어요.',
    oldTarget: '옛 표적',
    saveCode: '코드명 저장',
    piecesMeaning: '조각마다 뜻 한 줄',
    mechHead: '기전 한 줄',
    mechWhat: (gene: string) => `무엇을(표적) — ${gene}(자동)`,
    anatomyAria: (ticker: string, num: string, bad: boolean) => `코드명 해부도 ${ticker}-${num || '번호 빈칸'}${bad ? ' — 번호 조각이 틀렸어요' : ''}`,
    tickNote: '자동 · 고칠 수 없음',
    numNote: '모둠이 정함 · 겹치지 않게',
    lastBy: (name: string) => `마지막 작성자: ${name}`,
    codeSummaryTitle: "출원서의 '코드명 · 기전' 칸",
    targetWord: '표적',
    howBlank: '(어떻게)',
    actionBlank: '(무엇을 하나)',
    codeSummaryNote: (codes: string) => `다른 모둠과는 이름표(티커)가 달라서 코드명이 겹치지 않아요. 우리 모둠이 쓴 코드명: ${codes || '없음'}`,
    docHead: '출원서 칸',
    anatomyTitle: '5.01 출원서 해부',
    evidence: (admet: string, docking: string | null) => `ADMET ${admet}${docking ? ` · 도킹 ${docking}` : ''}`,
    srFinding: { reject: '거절', revise: '보완', ok: '통과' },
    runPrecheck: '규칙 점검',
    precheckSummary: (version: number, fails: number) => `판 ${version} · ${fails ? `걸림 ${fails}` : '모두 통과'}`,
    version: (v: number) => `판 ${v}`,
    reviewSub: (v: number, by: string | null) => `판 ${v}${by ? ` · ${by} 님이 요청` : ''}`,
    resultTitle: '특허 심사 결과판',
    noReview: '아직 심사를 요청하지 않았어요.',
    rulesHead: '서버 규칙 검사 결과',
    itemsTitle: '심사관의 칸별 지적',
    summaryHead: '심사관의 종합 피드백',
    teacherNote: (note: string) => `선생님 메모 — ${note}`,
    ledgerRows: (n: number) => `${n}줄`,
    ledgerCols: { seq: '순서', no: '출원번호', applicant: '출원인', code: '코드명', target: '표적 · 질환', structure: '구조식', filed: '출원일', status: '상태' },
    rejectedNo: '거절',
    noValue: '없음',
  },
  headline: (ticker: string, code: string, disease: string | null) => `◆ ${ticker} 물질특허 등록 — ${code}${disease ? ` · ${disease} 후보` : ''}`,
  err: {
    noCandidate: '2.2 에서 고른 특허 후보만 출원할 수 있어요.',
    liveExists: '이 후보로 이미 출원서가 있어요.',
    sameMolecule: '같은 물질로 만든 출원서가 우리 모둠에 이미 있어요.',
    noProperties: '이 분자의 물성을 계산하지 못했어요.',
    notEditable: '지금은 이 출원서를 고칠 수 없어요. 받아들여짐 · 거절 · 거둠 상태예요.',
    codeStale: '다른 모둠원이 코드명을 먼저 바꿨어요. 지금 코드명을 확인한 뒤 다시 써요.',
    codeTaken: '이미 쓴 코드명이에요.',
    notReviewable: '초안이나 보완 상태인 출원서만 심사를 요청할 수 있어요.',
    docStale: '그 사이 출원서 칸이 바뀌었어요. 바뀐 글을 확인하고 다시 요청해요.',
    noSection: '요청한 출원서 칸을 찾을 수 없어요.',
    notAbandonable: '지금 상태에서는 이 출원서를 포기하거나 거둘 수 없어요. 심사 중이라면 결과가 나올 때까지 기다려 주세요.',
    patentInUse: '이 특허는 지금 쓰는 중이라 포기할 수 없어요. 주력 · 백업 후보로 정했거나 3.2 전임상 · 동물실험 또는 3.3 제형 · IND 신청에서 쓰고 있어요.',
    oldRevision: '표적을 바꾸기 전에 만든 출원서라 심사를 요청할 수 없어요. 지금 표적의 특허 후보로 새 출원서를 만들어요.',
  },
} as const;

/** 코드명 문제 글 — `{ticker}` · `{code}` 를 채운다(화면 즉시 검사 · 서버 오류 같은 함수). */
export const codeProblemText = (problem: CodeProblem, values: { ticker?: string | null; code?: string | null }): string =>
  fillPatentCopy(PATENT_COPY.codeProblem[problem], { ticker: values.ticker ?? undefined, code: values.code ?? undefined });
