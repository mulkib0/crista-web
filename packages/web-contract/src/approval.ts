/**
 * 4.2 최종 허가 규격(설계 §6.1 4.2 줄 · §5.3 허가 소식 · 2026-10-24 사용자 지시 — 시안 design/step-viz/viz-8.js 8.01 · 8.06 · 8.08) — **기능 F42**.
 *
 * 걸음: ① 브랜드 이름(학급 유일 · 욕설 · 실재 유명 약 이름 피하기) → ② 포장 꾸미기(모양 · 색 · 라벨 배치, 허가 제형과 맞아야 제출) →
 *       ③ 품목 허가 신청서(NDA 요약은 서버가 1.1~4.1 근거로 자동 · 학생은 효능 한 줄 + 라벨 주의사항 2개) → 규칙 + AI 심사(reviews 엔진 'nda') →
 *       접수(수수료 500,000 크리스타 = $0.100M · 60게임 일) → 허가 → ⑤ 품목 허가증(8.01) · 신약 포장(8.06) · 연구비 영수증(8.08).
 * 판정: 최종 허가는 흔들림 · 점수 기준이 없다(game-rules `PIPELINE_RULES.thresholds.final` 둘 다 null · `noiseRange.final` 0) —
 *       같은 프로토콜로 3상 통과 · 포장 = 허가 제형 · 서류 통과면 60게임 일 뒤 허가(crista `checkFinalFile` 과 같은 뜻).
 * 표: web.approval_applications · nda_sections · doc_reviews('nda') · ledger('approval_fee' · game_day)(0018).
 * 공개 범위(§5.3): 브랜드 · 포장은 허가 전까지 그 모둠과 교사만. 허가 소식(전광판 'approval')부터 브랜드가 공개된다.
 *
 * 학생에게 보이는 문구는 `APPROVAL_COPY` 한곳에 모아요(§5.12 — Gemini 4 Argon (High) 초안을 Claude 가 검토해 반영 · .review/2026-10-24-copy-4.2). 숫자 · 규칙 값은 그 밖에.
 */
import { cristaToCents } from './money.ts';
import type { IndDose, IndForm } from './ind.ts';
import type { StepId } from './pipeline.ts';
import type { DocReviewView, DocSectionView, ReviewChecklistItem } from './review.ts';
import { BLOCKED_WORDS, charLength, type Checked } from './rules.ts';

// ── 숫자 · 규칙 값 ──

/** 최종 허가 수수료 $0.100M = 500,000 크리스타(crista FILING_COST_CENTS.finalApproval 과 같은 값) · 60게임 일(PIPELINE_RULES.durationDays.final). */
export const APPROVAL_FEE_CRISTA = 500_000;
export const APPROVAL_FEE_CENTS = cristaToCents(APPROVAL_FEE_CRISTA);
export const APPROVAL_REVIEW_GAME_DAYS = 60;

/** 심사관 판 — 프롬프트 · 체크리스트를 바꾸면 올린다(같은 판의 같은 서류는 LLM 을 다시 부르지 않는다). */
export const NDA_REVIEWER_VERSION = 'nda-v2'; // v2 = 학생용 문구 · 심사관 '학생에게 말하는 법' 단락(reviews.ts REVIEWER_TALK_*)

export type ApprovalStatus = 'draft' | 'reviewing' | 'revise' | 'passed' | 'submitted' | 'approved';

// ── ① 브랜드 이름 ──

export const BRAND_NAME_MIN = 2;
export const BRAND_NAME_MAX = 12;
/** 한글 · 영문 · 숫자, 낱말 사이 빈칸 하나까지(스타트업 이름과 같은 꼴). 코드명(SEUM-102) 꼴은 받지 않는다. */
export const BRAND_NAME_PATTERN = /^[가-힣A-Za-z0-9]+(?: [가-힣A-Za-z0-9]+)?$/;

/** 학급 유일성 열쇠 — 빈칸을 빼고 소문자(DB `brand_key` 와 같은 규칙). */
export const brandKey = (name: string): string => name.normalize('NFC').replace(/ /g, '').toLowerCase();

/**
 * 실재하는 유명 약 이름 — 같으면 막고(상표권), 품고 있으면 주의만 띄운다. 목록은 '피하기 안내'용이라 완전하지 않다.
 * 한글 · 영문 표기를 함께 둔다(소문자 · 빈칸 없이 비교).
 */
export const FAMOUS_DRUG_NAMES: readonly string[] = [
  '타이레놀', 'tylenol', '아스피린', 'aspirin', '애드빌', 'advil', '부루펜', '게보린', '펜잘', '판피린', '판콜', '탁센', '이지엔',
  '베아제', '훼스탈', '겔포스', '활명수', '우루사', '인사돌', '센트룸', '박카스', '마데카솔', '후시딘', '케토톱', '지르텍', '알레그라',
  '비아그라', 'viagra', '시알리스', 'cialis', '리피토', 'lipitor', '크레스토', 'crestor', '노바스크', '플라빅스', '넥시움', 'nexium',
  '휴미라', 'humira', '키트루다', 'keytruda', '옵디보', 'opdivo', '허셉틴', 'herceptin', '글리벡', 'gleevec', '타그리소', 'tagrisso',
  '이레사', 'iressa', '렉라자', '엔브렐', 'enbrel', '레미케이드', '오젬픽', 'ozempic', '위고비', 'wegovy', '마운자로', 'mounjaro',
  '자누비아', 'januvia', '자디앙', 'jardiance', '포시가', 'farxiga', '듀피젠트', 'dupixent', '아리셉트', 'aricept', '레켐비', 'leqembi',
  '셀레브렉스', 'celebrex', '리리카', 'lyrica', '프로작', 'prozac', '졸로프트', 'zoloft', '렉사프로', '자낙스', 'xanax', '타미플루', 'tamiflu',
  '팍스로비드', 'paxlovid', '렘데시비르', '코미나티', '스파이크박스', '엘리퀴스', 'eliquis', '자렐토', 'xarelto', '아토젯', '글루코파지',
];

/** 브랜드 이름 판정 — ok(값) · warn(값 + 주의 글) · block(막음 글). 화면 · 서버가 같은 함수를 쓴다(학급 유일은 서버 · DB 가 본다). */
export type BrandCheck = { status: 'ok'; value: string } | { status: 'warn'; value: string; message: string } | { status: 'block'; message: string };

export function checkBrandName(raw: unknown, opts: { startupName?: string | null } = {}): BrandCheck {
  if (typeof raw !== 'string') return { status: 'block', message: APPROVAL_COPY.brand.empty };
  const value = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (value === '') return { status: 'block', message: APPROVAL_COPY.brand.empty };
  const n = charLength(value);
  if (n < BRAND_NAME_MIN || n > BRAND_NAME_MAX) return { status: 'block', message: APPROVAL_COPY.brand.length };
  if (!BRAND_NAME_PATTERN.test(value)) return { status: 'block', message: APPROVAL_COPY.brand.chars };
  if (/^[0-9 ]+$/.test(value)) return { status: 'block', message: APPROVAL_COPY.brand.digitsOnly };
  const key = brandKey(value);
  if (BLOCKED_WORDS.some((w) => key.includes(w))) return { status: 'block', message: APPROVAL_COPY.brand.blocked };
  if (FAMOUS_DRUG_NAMES.includes(key)) return { status: 'block', message: APPROVAL_COPY.brand.famous };
  const inside = FAMOUS_DRUG_NAMES.find((f) => charLength(f) >= 3 && key.includes(f));
  if (inside) return { status: 'warn', value, message: APPROVAL_COPY.brand.famousInside(inside) };
  if (opts.startupName && brandKey(opts.startupName) === key) return { status: 'warn', value, message: APPROVAL_COPY.brand.sameAsCompany };
  return { status: 'ok', value };
}

/** 서버용 — 막음이면 실패(주의는 통과). */
export function checkBrandNameStrict(raw: unknown, opts: { startupName?: string | null } = {}): Checked<string> {
  const r = checkBrandName(raw, opts);
  return r.status === 'block' ? { ok: false, message: r.message } : { ok: true, value: r.value };
}

// ── ② 포장(8.06) ──

export type PackShape = 'tablet' | 'capsule' | 'vial' | 'patch';
export const PACK_SHAPES: readonly PackShape[] = ['tablet', 'capsule', 'vial', 'patch'];
/** 포장 모양 → 맞는 허가 제형(정제 · 캡슐 = 경구, 바이알 = 정맥, 패치 = 경피). */
export const PACK_SHAPE_FORM: Record<PackShape, IndForm> = { tablet: 'oral', capsule: 'oral', vial: 'iv', patch: 'transdermal' };
export const packFits = (shape: PackShape | null | undefined, form: IndForm | null | undefined): boolean => !!shape && !!form && PACK_SHAPE_FORM[shape] === form;

/** 포장 색 — 박막 간섭색 계열 6색(상태 색 빨강 · 초록 · 노랑과 헷갈리지 않게). 화면 색 값은 s42.css. */
export type PackColor = 'ivory' | 'sage' | 'sand' | 'sky' | 'blush' | 'lilac';
export const PACK_COLORS: readonly PackColor[] = ['ivory', 'sage', 'sand', 'sky', 'blush', 'lilac'];
/** 라벨 배치 — 위 띠 · 가운데 · 옆 띠. */
export type PackLayout = 'top' | 'center' | 'band';
export const PACK_LAYOUTS: readonly PackLayout[] = ['top', 'center', 'band'];

export interface PackageDesign {
  shape: PackShape;
  color: PackColor;
  layout: PackLayout;
}

export function checkPackage(raw: unknown): Checked<PackageDesign> {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (!PACK_SHAPES.includes(b.shape as PackShape)) return { ok: false, message: APPROVAL_COPY.pack.badShape };
  if (!PACK_COLORS.includes(b.color as PackColor)) return { ok: false, message: APPROVAL_COPY.pack.badColor };
  if (!PACK_LAYOUTS.includes(b.layout as PackLayout)) return { ok: false, message: APPROVAL_COPY.pack.badLayout };
  return { ok: true, value: { shape: b.shape as PackShape, color: b.color as PackColor, layout: b.layout as PackLayout } };
}

// ── ③ 품목 허가 신청서(NDA) — 학생 칸 ──

export type NdaSection = 'indication' | 'caution1' | 'caution2';
export const NDA_SECTIONS: readonly NdaSection[] = ['indication', 'caution1', 'caution2'];
/** 칸 길이(짧은 칸 — §5.13 미성년자 안전장치 · 라벨에 인쇄할 수 있는 길이). */
export const NDA_SECTION_MIN = 8;
export const NDA_SECTION_MAX = 120;

/** 심사 체크리스트(LLM 은 이 항목마다 하나씩 — 칸 이름으로 짚는다). */
export const NDA_CHECKLIST: readonly ReviewChecklistItem[] = [
  { id: 'indication_fits', section: 'indication', criterion: '효능 · 효과 한 줄이 사실의 표적 질환 · 3상 1차 평가지표 · 대상 환자와 맞고, 3상에서 보이지 않은 효과를 말하지 않는다' },
  { id: 'indication_modest', section: 'indication', criterion: '완치 · 부작용 없음 · 모든 환자 같은 과장된 표현이 없다' },
  { id: 'caution_grounded', section: 'caution1', criterion: '주의사항 두 개 중 적어도 하나가 사실에 있는 실제 위험 신호(전임상 소견 · hERG · 간독성 · 1상 안전)에 근거한다' },
  { id: 'caution_actionable', section: 'caution2', criterion: '주의사항이 환자나 의사가 무엇을 하면 되는지(복용 방법 · 피할 것 · 검사 · 병원 연락) 구체적으로 말한다' },
  { id: 'brand_honest', section: 'brand', criterion: '브랜드 이름이 효능을 과장하거나 다른 약으로 착각하게 하지 않는다' },
];

// ── 화면 모양 ──

/** 4.1 → 4.2 접점 — 그 표적 버전에서 마지막으로 통과한 3상(서버가 F41 의 임상 표에서 읽는다). */
export interface Phase3PassView {
  /** F41 의 임상 기록 id. */
  trialId: string;
  patentId: string;
  codeName: string | null;
  form: IndForm;
  doseMg: IndDose;
  efficacy: number | null;
  safety: number | null;
  passedGameDay: number | null;
}

/** NDA 요약 · 허가증의 한 줄 — 오른쪽 꼬리표는 그 줄의 증거가 나온 단계(8.01). */
export interface EvidenceRow {
  key: string;
  label: string;
  value: string;
  steps: StepId[];
  /** 숫자 줄(고정폭 글꼴). */
  mono?: boolean;
}

export interface ApprovalApplicationView {
  id: string;
  status: ApprovalStatus;
  /** 서류 판 — 칸 · 브랜드 · 포장을 저장할 때마다 오른다(심사가 고정하는 값). */
  version: number;
  brand: { name: string; version: number; byName: string | null } | null;
  /** 브랜드를 아직 정하지 않았으면 version 0(저장할 때 expectedVersion 으로 보낸다). */
  brandVersion: number;
  pack: (PackageDesign & { byName: string | null }) | null;
  packVersion: number;
  /** 허가 제형 · 용량(3상 통과 프로토콜 — 3상 전이면 IND 승인 값, 임시). */
  form: IndForm | null;
  doseMg: IndDose | null;
  formProvisional: boolean;
  submittedGameDay: number | null;
  decideGameDay: number | null;
  decidedGameDay: number | null;
  submittedByName: string | null;
  certificateNo: string | null;
}

/** 연구비 영수증(8.08) 한 줄. 지출은 음수가 아니라 `out` 으로 · 크리스타 정수. */
export interface ReceiptLine {
  /** 단계(지출) · null(입금 · 기타). */
  stepId: StepId | null;
  /** 원장 종류(규칙 값 — 화면 문구는 APPROVAL_COPY.receipt.kind). */
  kind: string;
  label: string;
  crista: number;
  /** 지출(true) · 입금(false). */
  out: boolean;
  /** 줄 수(같은 단계 작업을 묶었을 때). */
  count: number;
  /** 게임 날짜(정수) — 묶은 줄은 첫 날 · 끝 날. */
  dayFrom: number | null;
  dayTo: number | null;
  /** 연구상 실패(IND 보류 · 임상 실패) — 빨간 줄. */
  failed: boolean;
}

export type ReceiptGroup = 'discover' | 'develop' | 'clinical' | 'approval';
export const RECEIPT_GROUP_OF: Record<StepId, ReceiptGroup> = {
  '1.1': 'discover', '1.2': 'discover', '2.1': 'discover', '2.2': 'discover',
  '3.1': 'develop', '3.2': 'develop', '3.3': 'develop',
  '4.1': 'clinical', '4.2': 'approval',
};

export interface ReceiptView {
  spent: ReceiptLine[];
  income: ReceiptLine[];
  totals: { spentCrista: number; incomeCrista: number; initialCrista: number; balanceCrista: number };
  /** 쓴 돈의 몫(8.08 비율 띠). */
  shares: Array<{ group: ReceiptGroup; crista: number }>;
  firstGameDay: number | null;
  lastGameDay: number | null;
  /** 첫 원장 줄 → 허가(아직이면 지금)까지 게임 일. */
  daysTaken: number | null;
  /** 1.2 라이브러리 분자 수 → 허가 1(허가 전이면 null). */
  molecules: { start: number | null; end: number | null };
}

export interface CertificateView {
  certificateNo: string;
  brand: string;
  company: string;
  ticker: string;
  codeName: string | null;
  form: IndForm;
  doseMg: IndDose;
  approvedGameDay: number;
  rows: EvidenceRow[];
  pack: PackageDesign;
  /** 허가 소식 기업가치 기본 변동(%) = min(20, 12 × 제형 배율) — 시안 8.07. */
  marketChangePct: number;
}

export interface ApprovalResponse {
  /** 4.2 를 열 수 있나(3상 통과) — 아니면 이유. 초안(브랜드 · 포장 · 칸)은 잠겨 있어도 쓸 수 있다. */
  phase3: Phase3PassView | null;
  lockedReason: string | null;
  application: ApprovalApplicationView | null;
  sections: DocSectionView[];
  review: DocReviewView | null;
  /** 서버가 1.1~4.1 근거로 만든 NDA 요약(LLM 사실과 같은 값 — SMILES 원문은 없음). */
  summary: EvidenceRow[];
  certificate: CertificateView | null;
  receipt: ReceiptView;
  gameDay: number;
  startupName: string;
  ticker: string;
  feeCrista: number;
  reviewGameDays: number;
}

export interface BrandSaveRequest {
  name: string;
  expectedVersion: number;
}
export interface PackageSaveRequest extends PackageDesign {
  expectedVersion: number;
}
export interface ApprovalSaveResponse {
  ok: true;
  version: number;
  application: ApprovalApplicationView;
  /** 브랜드 주의(실재 약 이름을 품음 등) — 저장은 됐다. */
  warning?: string;
}

export const APPROVAL_API = {
  get: '/api/approval',
  brand: '/api/approval/brand',
  pack: '/api/approval/package',
  section: (section: string) => `/api/approval/sections/${section}`,
  review: '/api/approval/review',
  submit: '/api/approval/submit',
} as const;

// ── 학생에게 보이는 문구(§5.12 — 한곳에. Gemini 4 Argon (High) 초안 → Claude 검토 · .review/2026-10-24-copy-4.2/copy.md 반영) ──
// 돈 인자(fee …)에는 formatCrista() 결과(단위 '크리스타' 포함)를 넣어요 — 문구에 '크리스타'를 다시 쓰지 않아요.

/** 받침에 맞춘 조사 — 한글이 아니면(영문 · 숫자) '이(가)' 꼴로 둬요. */
export function josa(word: string, pair: '이가' | '은는' | '을를' | '과와' | '으로'): string {
  const last = Array.from(word.trim()).at(-1) ?? '';
  const code = last.charCodeAt(0) - 0xac00;
  const forms: Record<typeof pair, [string, string, string]> = {
    이가: ['이', '가', '이(가)'],
    은는: ['은', '는', '은(는)'],
    을를: ['을', '를', '을(를)'],
    과와: ['과', '와', '과(와)'],
    으로: ['으로', '로', '(으)로'],
  };
  const [withBatchim, without, unknown] = forms[pair];
  if (code < 0 || code > 11171) return unknown;
  const jong = code % 28;
  if (pair === '으로' && jong === 8) return without; // ㄹ 받침은 '로'
  return jong === 0 ? without : withBatchim;
}

export const APPROVAL_COPY = {
  stepQuestion: '이 약을 환자에게 내놓아도 될까요?',
  doneWhen: '품목 허가(서류 통과 → 접수 → 60게임 일)',
  lockedNoPhase3: '아직 4.1 임상 3상을 통과하지 못해 심사와 접수는 잠겨 있어요. 하지만 ① 브랜드 이름, ② 포장 꾸미기, ③ 허가 신청서 초안은 지금 미리 써 둘 수 있어요.',
  tabs: { brand: '브랜드 이름', pack: '포장 꾸미기', nda: '허가 신청서', submit: '심사 · 접수', result: '허가증 · 영수증' },
  brand: {
    title: '브랜드 이름 짓기',
    lead: `신약이 세상에 나올 때 쓸 브랜드 이름(${BRAND_NAME_MIN}~${BRAND_NAME_MAX}자)을 지어 주세요. 저장하는 순간 학급에서 예약돼요. 허가 전에는 우리 모둠과 선생님만 볼 수 있고, 최종 허가가 나면 학급 전광판에 공개돼요.`,
    empty: '브랜드 이름을 입력해 주세요.',
    length: `브랜드 이름은 ${BRAND_NAME_MIN}자 이상 ${BRAND_NAME_MAX}자 이하로 지어야 해요.`,
    chars: '한글, 영문, 숫자만 쓸 수 있고, 낱말 사이 빈칸은 한 칸까지만 넣을 수 있어요.',
    digitsOnly: '숫자로만 이루어진 이름은 브랜드 이름으로 쓸 수 없어요. 한글이나 영문을 함께 써 주세요.',
    blocked: '쓸 수 없는 낱말이 들어 있어요. 다른 브랜드 이름을 지어 주세요.',
    famous: '실제로 팔리는 유명 의약품과 같은 이름은 상표권(브랜드 이름을 독점해서 쓸 수 있는 법적 권리) 보호와 처방 혼동 방지를 위해 쓸 수 없어요.',
    famousInside: (name: string) => `이름 안에 실제 약 이름(${name})이 들어 있어요. 다른 약으로 착각할 수 있으니 바꾸는 걸 권해요.`,
    sameAsCompany: '스타트업 이름과 똑같아요. 그대로 써도 되지만, 약 이름은 회사 이름과 따로 짓는 경우가 많아요.',
    taken: '학급에서 이미 쓰는 이름이에요. 다른 이름을 골라 주세요.',
    tips: [
      '표적(약물이 몸속에서 결합해 작용하는 목표 단백질)이나 적응증(약이 치료 효과를 내는 대상 질환), 또는 스타트업 이름을 조합하면 기억하기 쉬운 이름이 돼요.',
      "'만병통치'나 '완치'처럼 약효를 부풀리거나 다른 약과 헷갈리게 하는 이름은 심사에서 보완 요구를 받아요.",
      `${BRAND_NAME_MIN}~${BRAND_NAME_MAX}자 안에서 한글, 영문, 숫자를 쓸 수 있고, 낱말 사이에 빈칸을 한 칸까지 넣을 수 있어요.`,
    ],
    whyChange: '개발하는 동안에는 후보 물질을 회사가 붙인 코드명으로 불러요. 환자에게 내놓을 때는 부르기 쉽고 다른 약과 헷갈리지 않는 상표명(브랜드 이름)을 붙여요.',
    placeholder: `${BRAND_NAME_MIN}~${BRAND_NAME_MAX}자 한글 · 영문 · 숫자(예: 다온콕스)`,
    save: '브랜드 이름 저장',
    saved: '브랜드 이름을 저장하고 학급에서 예약했어요.',
  },
  pack: {
    title: '신약 포장 꾸미기',
    lead: '용기 모양과 상자 색, 라벨 배치를 골라 우리 신약의 포장을 꾸며 보세요. 포장 모양은 임상 3상을 통과한 허가 제형과 맞아야 해요. 모둠이 함께 고치고, 늦게 저장한 쪽은 먼저 저장한 포장을 보고 다시 골라요.',
    shape: { tablet: '정제', capsule: '캡슐', vial: '바이알', patch: '패치' },
    /** 고른 모양 풀이(화면 칸 아래). */
    shapeDesc: {
      tablet: '정제(알약)는 가루 약을 단단하게 뭉친 먹는 형태예요. 허가 제형이 먹는 약(경구)일 때 골라요.',
      capsule: '캡슐은 약 성분을 삼킬 수 있는 얇은 껍질(젤라틴 등)에 담은 형태예요. 허가 제형이 먹는 약(경구)일 때 골라요.',
      vial: '바이알(주사병)은 주사액을 담는 작은 유리병이에요. 허가 제형이 정맥주사(혈관에 직접 놓는 주사)일 때 골라요.',
      patch: '경피 패치는 피부에 붙여 약 성분이 피부를 통해 스며들게 하는 형태예요. 허가 제형이 붙이는 패치(경피)일 때 골라요.',
    } as Record<PackShape, string>,
    color: { ivory: '아이보리', sage: '세이지', sand: '샌드', sky: '하늘', blush: '복숭아', lilac: '라일락' },
    layout: { top: '위 띠', center: '가운데', band: '옆 띠' },
    /** 포장 그림 안 한 줄(짧게 — 그림 폭에 맞춰요). */
    fits: (formLabel: string) => `✓ 허가 제형(${formLabel})과 알맞은 포장 모양이에요`,
    misfit: (shapeLabel: string, needLabel: string, formLabel: string) => `✕ ${shapeLabel} 포장은 ${needLabel}용 — 허가 제형(${formLabel})과 달라요`,
    noForm: '허가 제형이 아직 없어요(3상 통과 뒤 정해져요)',
    /** 그림 아래 풀이(HTML). */
    misfitHelp: (shapeLabel: string, needLabel: string, formLabel: string) => `${shapeLabel} 포장은 ${needLabel}용이에요. 우리 약의 허가 제형(${formLabel})에 맞는 포장 모양으로 바꿔 주세요.`,
    noFormHelp: '아직 정해진 허가 제형이 없어요. 포장을 미리 꾸며 볼 수 있지만, 제형이 정해진 뒤 포장 모양이 맞는지 다시 확인해요.',
    provisional: (formLabel: string) => `아직 임상 3상 통과 전이라 IND(임상시험 계획 승인 신청)에서 승인받은 제형(${formLabel})으로 임시 비교하고 있어요. 3상을 통과하면 그 프로토콜(임상시험 계획서) 제형으로 다시 맞춰요.`,
    whyMatchForm: '임상 3상은 정해진 제형 하나로 약의 효과와 안전성을 시험했어요. 그래서 포장도 허가받은 제형에 맞아야 투약 오류(약을 잘못 쓰는 일)를 막을 수 있어요.',
    previewCaption: (code: string) => `허가 전에는 학급에 코드명(${code})으로만 알려져요. 이 미리보기는 우리 모둠과 선생님만 봐요. 허가가 나면 브랜드 이름이 학급 전광판에 공개되고, 포장에는 허가일이 인쇄돼요.`,
    badShape: '포장 용기 모양을 골라 주세요(정제 · 캡슐 · 바이알 · 패치).',
    badColor: '포장 상자 색을 골라 주세요.',
    badLayout: '포장 라벨 배치를 골라 주세요.',
    save: '포장 저장',
    stale: '다른 모둠원이 포장을 먼저 바꿨어요. 지금 포장을 불러왔으니 확인하고 다시 저장해 주세요.',
  },
  nda: {
    title: '허가 신청서(NDA) 작성',
    lead: `1.1부터 4.1까지의 연구 기록은 서버가 자동으로 요약해 줘요. 여러분은 라벨에 인쇄할 칸 세 개만 써요. 효능 · 효과 한 줄과 라벨 주의사항 두 칸이고, 칸마다 ${NDA_SECTION_MIN}~${NDA_SECTION_MAX}자예요.`,
    termNda: 'NDA(신약 허가 신청, New Drug Application)는 후보 물질 발견부터 임상 3상까지 모은 모든 약효 · 안전성 자료와 포장 라벨 초안을 묶어 허가 기관에 내는 공식 신청서예요.',
    realWorldCompare: '실제로는 FDA(미국 식품의약국)에 NDA(21 CFR 314.50)를, 식약처(식품의약품안전처)에 품목 허가 신청을 내요. 상표명 · 제형 · 투여 경로 · 용법 · 용량 · 주의사항과 전체 임상 자료를 함께 내요. 우리 수업에서는 임상 자료 요약을 서버가 묶어 주고, 라벨 문구 세 칸만 직접 써요.',
    summaryTitle: '연구 증거 요약(오른쪽 꼬리표는 근거 단계)',
    sectionLabel: { indication: '효능 · 효과 (한 줄)', caution1: '라벨 주의사항 ①', caution2: '라벨 주의사항 ②' } as Record<NdaSection, string>,
    sectionGuide: {
      indication: '우리 약의 표적 질환, 대상 환자, 임상 3상 1차 평가지표에서 확인된 효과만 정확하게 적어요. 3상에서 시험하지 않은 효과나 과장된 표현은 쓰지 않아요.',
      caution1: '전임상 독성 소견, hERG, 간독성, 또는 임상 1상 안전성 시험에서 관찰된 실제 위험 신호나 이상사례(약 투여 뒤 나타난 바람직하지 않고 의도하지 않은 반응)를 바탕으로 주의할 점을 적어요.',
      caution2: '환자나 의사가 무엇을 해야 하는지(정해진 복용 · 투여 방법, 함께 피해야 할 것, 필요한 검사, 이상 증상 때 병원 연락 등) 구체적인 행동 지침을 적어요.',
    } as Record<NdaSection, string>,
    sectionGood: {
      indication: '좋은 예: "경도 알츠하이머병 환자의 인지 기능 저하를 늦춰요."',
      caution1: '좋은 예: "전임상과 1상에서 가벼운 간 효소 상승 소견이 있었으므로 간 질환이 있는 환자는 투여 전 의사와 상의하고 정기적으로 간 기능 검사를 받으세요."',
      caution2: '좋은 예: "정해진 용량과 투여 간격을 지켜 사용하고, 투여 뒤 가슴 두근거림이나 심한 어지러움이 나타나면 바로 사용을 멈추고 병원에 연락하세요."',
    } as Record<NdaSection, string>,
    sectionBad: {
      indication: '나쁜 예(과장 · 근거 없음): "모든 환자의 질병을 부작용 없이 100% 완치하고 재발까지 완벽하게 막아 줍니다."',
      caution1: '나쁜 예(근거 없음): "이 약은 완벽하게 안전해서 어떤 이상사례나 부작용도 나타나지 않으니 누구나 안심하고 드세요."',
      caution2: '나쁜 예(구체성 부족): "몸 상태가 이상하면 알아서 조심해서 사용하세요."',
    } as Record<NdaSection, string>,
  },
  submit: {
    title: '서류 심사 · 최종 허가 접수',
    costDuration: (fee: string, days: number) => `접수 수수료는 ${fee}이고 심사 기간은 ${days}게임 일이에요. 최종 허가는 새로운 실험이나 운에 따른 흔들림 · 점수 기준 없이, 3상 통과 · 포장 제형 일치 · 서류 통과 요건만 갖추면 확정돼요.`,
    rulesTitle: '규칙 검사(서버 — 모두 맞아야 AI 심사로 넘어가요)',
    reviewBtn: '서류 심사 요청하기',
    submitBtn: '최종 허가 접수하기',
    confirmTitle: '최종 품목 허가를 접수할까요?',
    confirmBody: (fee: string, days: number) => `수수료 ${fee}를 내요. ${days}게임 일 뒤에 허가가 나요. 접수하면 브랜드 · 포장 · 신청서를 더 고칠 수 없어요.`,
    needPass: "규칙 검사와 AI 심사를 모두 통과해 '서류 통과' 상태가 되어야 접수할 수 있어요.",
    submitted: (day: number, days: number) => `최종 허가 신청서가 접수되었어요! ${days}게임 일 뒤인 D+${day}에 최종 품목 허가가 나요.`,
    already: '이미 접수했어요. 모둠원 여러 명이 동시에 눌러도 수수료는 한 번만 나가요.',
    aiNotice: "AI 심사관(Claude)이 신약 허가 심사관 역할로 서류를 읽어요. 규칙 검사와 AI 심사가 모두 맞아야 '서류 통과'예요. 수수료와 허가 날짜는 AI가 아니라 서버 규칙이 정해요.",
    aiQueued: 'AI 심사관이 신청서를 읽고 있어요. 읽은 뒤 판정을 정리하는 기간을 거쳐 결과가 나와요.',
    rulesBlocked: "규칙 검사에서 맞지 않는 줄이 있어 AI 심사 없이 '보완 필요'가 됐어요. ✕ 줄부터 고쳐 주세요.",
    feedbackTitle: 'AI 심사관의 종합 피드백',
  },
  rule: {
    phase3: { ok: '임상 3상 통과: 지금 신청 프로토콜로 4.1 임상 3상을 통과했어요.', fail: '임상 3상 미통과: 4.1 임상 3상을 먼저 통과해야 심사 · 접수를 할 수 있어요.' },
    brand: { ok: '브랜드 이름 확정: 학급에서 유일하고 규칙에 맞는 브랜드 이름을 정했어요.', fail: `브랜드 이름 미완성: ① 브랜드 이름 걸음에서 ${BRAND_NAME_MIN}~${BRAND_NAME_MAX}자 규칙에 맞는 이름을 저장해 주세요.` },
    pack: {
      ok: '포장 · 허가 제형 일치: 고른 포장 모양이 허가받을 제형과 맞아요.',
      fail: '포장 · 허가 제형 불일치: 포장 모양이 허가 제형과 달라요. ② 포장 꾸미기에서 제형에 맞는 용기로 바꿔 주세요.',
      none: '포장 미선택: ② 포장 꾸미기 걸음에서 용기 모양과 색, 라벨 배치를 골라 저장해 주세요.',
    },
    section: {
      ok: (label: string) => `「${label}」 칸을 채웠어요.`,
      fail: (label: string) => `신청서 칸 미완성: 「${label}」 칸을 ${NDA_SECTION_MIN}자 이상 ${NDA_SECTION_MAX}자 이하로 써 주세요.`,
    },
    protocol: { ok: '3상 프로토콜 일치: 신청서의 제형 · 용량이 임상 3상을 통과한 프로토콜과 같아요.', fail: '3상 프로토콜 불일치: 신청서의 제형 · 용량이 임상 3상을 통과한 프로토콜과 달라요.' },
  },
  status: {
    draft: '초안', reviewing: '심사 중', revise: '보완 필요', passed: '서류 통과 — 접수할 수 있어요', submitted: '접수 — 허가 심사 중', approved: '허가',
  } as Record<ApprovalStatus, string>,
  result: {
    certTitle: '품목 허가증',
    certKind: '신약 품목 허가',
    certTop: '품목 허가증 · 신약 허가 신청(NDA) 승인',
    stampTop: 'NDA 승인',
    stampWord: '허가',
    packTitle: '신약 포장',
    receiptTitle: '연구비 영수증',
    /** 사용자 결정(2026-10-24): 영수증 제목에도 'CRISTA' 를 붙이지 않아요. */
    receiptHead: '연구비 영수증',
    print: '인쇄',
    savePng: '이미지로 저장',
    complete: '신약 개발 파이프라인 완주를 축하해요!',
    completeLead: (brand: string) => `1.1 표적 선정부터 4.2 허가까지 모든 관문을 넘었어요. 우리 신약 「${brand}」${josa(brand, '이가')} 환자에게 갈 수 있게 됐어요.`,
    notYet: '아직 허가 전이에요. 허가가 나면 품목 허가증과 신약 포장이 여기 크게 보여요. 연구비 영수증은 지금까지 쓴 돈으로 미리 볼 수 있어요.',
    termApproval: '품목 허가(신약 판매 승인)는 허가 기관이 약의 효과가 위험보다 크다고 판단해, 그 이름으로 환자에게 처방 · 판매해도 된다고 내리는 결정이에요. 부작용이 전혀 없다는 뜻은 아니에요.',
    evidenceNote: '오른쪽 꼬리표는 그 줄의 증거가 나온 단계(1.1~4.2)를 뜻해요. 최종 허가 도장 하나는 새로운 실험이 아니라 지금까지 모은 모든 증거를 한 장으로 묶은 결과예요.',
  },
  receipt: {
    spentTitle: '쓴 돈',
    incomeTitle: '들어온 돈',
    total: '쓴 돈 합계',
    initial: '처음 연구비',
    income: '들어온 돈 합계',
    balance: '남은 돈',
    days: '걸린 날',
    molecules: '분자',
    preview: '아직 허가 전이에요. 지금까지 쓴 돈으로 미리 본 영수증이에요.',
    groupedNote: '같은 단계의 작업은 한 줄로 묶고, 첫 날 ~ 끝 날을 적어요.',
    failNote: '빨간 줄은 중간에 보류된 IND나 임상시험 시도예요. 보류된 시험에 쓴 연구비도 신약 하나를 만드는 데 든 실제 비용이라 영수증에 그대로 남아요.',
    lesson: '신약 개발 연구비의 대부분은 사람에게 약효와 안전성을 시험하는 임상 단계(4.1)에 쓰여요.',
    group: { discover: '발견 · 최적화', develop: '특허 · 전임상 · IND', clinical: '임상', approval: '허가' } as Record<ReceiptGroup, string>,
    kind: {
      initial: '처음 연구비', paid_work: '실험 · 계산', paid_work_refund: '실패 작업 환급', adjustment: '조정', patent_fee: '물질특허 출원료', ind_fee: 'IND 수수료',
      approval_fee: '최종 허가 수수료', trial_fee: '임상시험 비용', learn_item: '학습 연구비 · 문항', learn_revision: '학습 연구비 · 고쳐 쓰기', learn_note: '학습 연구비 · 연구 노트',
      clinical_trial: '임상 시작 비용', clinical_recruit: '참여자 모집 투자', clinical_backup: '백업 후보 교체',
      learn_stipend: '기초 연구비', learn_correction: '학습 연구비 정정', pitch_series_a: 'Series A 투자', pitch_series_b: 'Series B 투자', failure_bounty: '실패 바운티 환급',
    } as Record<string, string>,
    failed: '✕ 보류',
  },
  board: {
    headline: (ticker: string, brand: string) => `◆ ${ticker} 「${brand}」 신약 품목 허가`,
  },
  /** 제형 이름 — 긴 꼴(요약 · 허가증) · 짧은 꼴(포장 · 화면 칸). */
  formLabel: { oral: '경구', iv: '정맥주사', transdermal: '경피' } as Record<IndForm, string>,
  formShort: { oral: '경구', iv: '정맥', transdermal: '경피' } as Record<IndForm, string>,
  /** 서버가 돌려주는 막음 · 오류 글(409 · 400 · 404). */
  server: {
    brandStale: '다른 모둠원이 브랜드 이름을 먼저 바꿨어요. 지금 이름을 확인하고 다시 저장해 주세요.',
    alreadyApproved: '이미 허가가 났어요.',
    lockedAfterSubmit: '허가 신청을 접수해서 더 고칠 수 없어요.',
    needVersion: '화면이 읽은 판(expectedVersion)을 보내 주세요.',
    noSection: '없는 칸이에요.',
    noProgram: '모둠 프로그램을 찾지 못했어요.',
  },
  /** NDA 요약 · 허가증 줄(서버가 만든다 — 값의 숫자는 서버 사실). */
  evidence: {
    label: {
      company: '회사', indication: '적응증', target: '표적', code: '성분(코드명)', affinity: '결합', patent: '물질특허', alt: '대체 시험',
      preclinical: '전임상', ind: 'IND', protocol: '제형 · 용량', trials: '임상 결과', final: '최종 심사', market: '시장 반응 기본값',
    } as Record<string, string>,
    band: { high: '높음', medium: '중간', low: '낮음' } as Record<string, string>,
    assay: { herg: 'hERG', liver: '간독성' } as Record<string, string>,
    finding: { liver: '간', qt: 'QT(심장 리듬)', cns: '중추신경' } as Record<string, string>,
    noFindings: '소견 없음',
    findings: (list: string) => `소견 ${list}`,
    affinity: (kcal: string, refName: string, refKcal: string) => `${kcal} kcal/mol (기준 ${refName} ${refKcal})`,
    doseChanged: (indDose: number) => `(IND ${indDose} mg → 임상 중 변경)`,
    phase: (p: number, passed: boolean, fails: number) => `${p}상 ${passed ? '통과' : '보류'}${fails ? `(보류 ${fails}번 뒤)` : ''}`,
    trialName: (phase: number, attempt: number, dose: number | null, held: boolean) =>
      `임상 ${phase}상${attempt > 1 ? ` · ${attempt}번째` : ''}${dose ? ` · ${dose} mg` : ''}${held ? ' 보류' : ''}`,
    final: (days: number, fee: string) => `서류 심사 · ${days}게임 일 · ${fee} · 새 판정 없음`,
    market: (pct: string, formLabel: string) => `▲ ${pct}% (12% × ${formLabel} 배율)`,
  },
  /** 화면 낱말(s42.tsx · s42-art.ts). */
  ui: {
    loading: '불러오는 중…',
    retry: '다시 불러오기',
    brandLabel: '브랜드 이름',
    brandOk: '쓸 수 있는 이름이에요(학급 유일은 저장할 때 확인해요).',
    brandTipsTitle: '이름 짓기 안내',
    companyNow: (name: string) => `지금 스타트업 이름: ${name}`,
    /** 내가 고치는 사이 모둠원이 먼저 저장했을 때(낙관적 잠금 — 저장하면 409). */
    brandChanged: (name: string, by: string) => `모둠원(${by})이 먼저 「${name}」${josa(name, '으로')} 저장했어요. 내 초안을 저장하려면 [지금 이름 불러오기]로 확인한 뒤 다시 골라요.`,
    brandStaleAfter: (name: string) => `다른 모둠원이 먼저 「${name}」${josa(name, '으로')} 바꿨어요. 확인하고 그래도 바꾸려면 다시 저장해요.`,
    useSaved: '지금 이름 불러오기',
    packShape: '모양',
    packColor: '색',
    packLayout: '라벨 배치',
    packCantSubmit: '✕ 이 포장으로는 허가 신청을 낼 수 없어요(저장은 돼요).',
    packChanged: (by: string) => `모둠원(${by})이 먼저 포장을 바꿨어요. [지금 포장 불러오기]로 확인한 뒤 다시 골라요.`,
    useSavedPack: '지금 포장 불러오기',
    srOk: '맞음',
    srFix: '고칠 것',
    reviewTitle: '심사 결과',
    reviewRunning: 'AI 심사 중…',
    verdict: { pass: '✓ 서류 통과 — 이제 접수할 수 있어요', pending: '… 심사 중', reject: '✕ 거절', revise: '! 보완 필요 — 표시된 칸을 고친 뒤 다시 심사를 받아요' } as Record<string, string>,
    itemStatus: { ok: '맞음', missing: '빠짐', inconsistent: '앞뒤 안 맞음', unclear: '불분명' } as Record<string, string>,
    reviewStale: (from: number, to: number) => ` · 심사 뒤 바뀜(판 ${from} → ${to})`,
    brandSection: '브랜드',
    teacher: (note: string) => `선생님이 직접 판정했어요. 메모: ${note}`,
    evidenceStep: '증거 단계 ',
    teamTitle: '우리 허가 신청',
    flowLabel: '허가 진행',
    progressLabel: '허가 심사 진행',
    progress: (pct: number, day: number) => `${pct}% · D+${day} 허가`,
    kv: { brand: '브랜드', protocol: '허가 제형 · 용량', pack: '포장', submitted: '접수' },
    provisionalTag: ' (임시 — IND 값)',
    serverAuto: '서버 자동',
    chainLabel: '파이프라인 9단계 모두 완료',
    stampLabel: (day: number) => `허가 도장 D+${day}`,
    approvedOn: '허가일',
    certNo: (no: string) => `No. ${no}`,
    packPreview: (title: string) => `${title} — 미리보기`,
    sharesLabel: (parts: string) => `쓴 돈 나누기 — ${parts}`,
    daysUnit: (n: number) => `${n}게임 일`,
    dayRange: (from: number, to: number) => `D+${from} → D+${to}`,
    spentBig: (pct: number | null, clinicalPct: number | null) =>
      `크리스타 씀${pct !== null ? ` · 처음 연구비의 ${pct}%` : ''}${clinicalPct !== null ? ` · 임상 ${clinicalPct}%` : ''}`,
    receiptEnd: (approved: boolean, day: number, brand: string | null) => (approved ? `*** 허가${brand ? ` 「${brand}」` : ''} · D+${day} ***` : `*** D+${day} 기준 ***`),
    packAria: (name: string, shape: string, color: string, layout: string) => `${name} 포장 — ${shape} · ${color} · 라벨 ${layout}`,
    insideAria: (shape: string, fit: 'none' | 'ok' | 'bad') => `포장 안 — ${shape}${fit === 'ok' ? ' · 허가 제형과 맞음' : fit === 'bad' ? ' · 허가 제형과 다름' : ''}`,
    pngFail: '그림을 만들지 못했어요.',
  },
} as const;
