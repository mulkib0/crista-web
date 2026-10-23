/**
 * 3.3 제형 · IND 신청 규격(설계 §5.10 · §5.11 · §7.3 ind_applications · §7.4 ⑬) — 기능 F33.
 *
 * - '이 단계에서 하는 일' 뼈대 · 도구 6종(6.02~6.07) 안내 · 신청서 칸 ①~⑦ · 규칙 검사 · 심사 체크리스트 · 화면 모양 · 경로(`IND_API`).
 * - 학생에게 보이는 글은 모두 `IND_COPY` 한곳에 둔다(해요체 초안 — §5.12 Gemini 4 Argon (High) 가 한꺼번에 다듬는다).
 *   식별자 · 숫자 · 규칙 값은 그 밖에 둔다. 글 안의 `{mrsd}` 같은 자리표시자는 서버 · 화면이 채운다.
 * - E · S 는 서버가 game-rules `scoreCandidate`(같은 함수)로 9조합 × (뇌 병변 환자군이면 2벌)을 계산해 내려보낸다 —
 *   화면의 도구 6종은 그 값만 그린다('흔들림 전 예상치'). 규칙 값(용량 독성 Dt · 피크 K · 기준선)도 서버가 game-rules 에서 실어 준다.
 * - 흐름: 신청서(칸 · 조합) → [심사 받기] 규칙 검사(`indRuleFindings`) → LLM 심사관(reviews.ts · IND_REVIEWER_VERSION) → 서류 통과('passed') →
 *   [접수] IND 수수료 500,000 크리스타(멱등 키 `ind:<신청 id>`) → 30게임 일 → 규칙 판정(S ≥ 35 · 흔들림 없음) → 승인 · 전광판 'ind_approved'.
 * - 4.1 입력: 승인서(`IndApprovalView`)의 제형 · 용량 · 환자군 · 1차 평가지표 — 서버 `features/ind.ts` 의 `loadIndApproval` 로 읽는다.
 */
import { TRIAL_OPTIONS } from '@crista/shared-types';
import type { AnimalStudyResult, PreclinicalFinding } from './preclinical.ts';
import { HUMAN_WEIGHT_KG, SAFETY_FACTOR, SPECIES_HED_DIVISOR } from './preclinical.ts';
import type { DocReviewView, DocSectionView, RuleFinding } from './review.ts';
import { cristaToCents, formatCrista } from './money.ts';

export type IndForm = 'oral' | 'iv' | 'transdermal';
export const IND_FORMS: readonly IndForm[] = ['oral', 'iv', 'transdermal'];
export type IndDose = 10 | 50 | 100;
export const IND_DOSES: readonly IndDose[] = [10, 50, 100];
/** 'passed' = 서류 통과(접수 전) — 0014 에서 더했다. */
export type IndStatus = 'draft' | 'reviewing' | 'revise' | 'passed' | 'submitted' | 'approved' | 'held';
export const IND_STATUSES: readonly IndStatus[] = ['draft', 'reviewing', 'revise', 'passed', 'submitted', 'approved', 'held'];
/** 학생이 칸 · 조합을 고칠 수 있는 상태(고치면 다시 draft — 통과는 그 판에만). */
export const IND_EDITABLE: readonly IndStatus[] = ['draft', 'reviewing', 'revise', 'passed'];

/** IND 수수료 500,000 크리스타($0.100M — crista FILING_COST_CENTS.ind 와 같은 값) · 30게임 일. */
export const IND_FEE_CRISTA = 500_000;
export const IND_FEE_CENTS = cristaToCents(IND_FEE_CRISTA);
export const IND_REVIEW_GAME_DAYS = 30;
/** IND 판정 기준(game-rules PIPELINE_RULES.thresholds.ind — 흔들림 없음). */
export const IND_SAFETY_MIN = 35;

export const IND_REVIEWER_VERSION = 'ind-v3'; // v3 = 심사관 '학생에게 말하는 법' 단락(reviews.ts REVIEWER_TALK_*)
/** 원장 멱등 키(설계 §7.4 ⑬). */
export const indLedgerKey = (applicationId: string): string => `ind:${applicationId}`;

// ── 신청서 칸 ①~⑦(식약처 [별표 1] · 21 CFR 312.23 · Form FDA 1571 을 학생용으로 줄임) ──

export type IndPart = 'cover' | 'plan' | 'form' | 'nonclinical' | 'protocol' | 'risk' | 'pledge';
export const IND_PARTS: readonly IndPart[] = ['cover', 'plan', 'form', 'nonclinical', 'protocol', 'risk', 'pledge'];

export type IndSectionKey =
  | 'title'
  | 'dev_plan'
  | 'form_reason'
  | 'nonclinical'
  | 'calc_hed'
  | 'calc_mrsd'
  | 'subject'
  | 'stop_rule'
  | 'risk_monitor'
  | 'consent'
  | 'pledge_hold'
  | 'pledge_report';

export interface IndSectionDef {
  key: IndSectionKey;
  part: IndPart;
  /** 'text' 글 · 'number' 학생 계산 칸 · 'pledge' 체크(본문 = IND_PLEDGE_BODY). */
  kind: 'text' | 'number' | 'pledge';
  /** 글자 수 상한(DB 는 4000). */
  max: number;
  /** 심사(서류 형식)에서 꼭 채워야 하나. */
  required: boolean;
}

export const IND_SECTIONS: readonly IndSectionDef[] = [
  { key: 'title', part: 'cover', kind: 'text', max: 120, required: true },
  { key: 'dev_plan', part: 'plan', kind: 'text', max: 800, required: true },
  { key: 'form_reason', part: 'form', kind: 'text', max: 400, required: true },
  { key: 'nonclinical', part: 'nonclinical', kind: 'text', max: 800, required: true },
  { key: 'calc_hed', part: 'nonclinical', kind: 'number', max: 20, required: true },
  { key: 'calc_mrsd', part: 'nonclinical', kind: 'number', max: 20, required: true },
  { key: 'subject', part: 'protocol', kind: 'text', max: 400, required: true },
  { key: 'stop_rule', part: 'protocol', kind: 'text', max: 400, required: true },
  { key: 'risk_monitor', part: 'risk', kind: 'text', max: 600, required: false },
  { key: 'consent', part: 'risk', kind: 'text', max: 400, required: true },
  { key: 'pledge_hold', part: 'pledge', kind: 'pledge', max: 4, required: true },
  { key: 'pledge_report', part: 'pledge', kind: 'pledge', max: 4, required: true },
];
export const IND_SECTION_KEYS: readonly IndSectionKey[] = IND_SECTIONS.map((s) => s.key);
export const indSectionDef = (key: string): IndSectionDef | undefined => IND_SECTIONS.find((s) => s.key === key);
/** 서약 칸 본문(체크 = 이 값, 해제 = 빈 칸). */
export const IND_PLEDGE_BODY = '동의';
/** 1상의 1차 평가지표는 늘 안전성(설계 §5.10 ⑤) — 학생이 고르는 것은 다음 상의 환자군 · 1차 평가지표. */
export const IND_PHASE1_ENDPOINT = '안전성 · 이상사례';

/** 학생 계산 칸 허용 오차 — 3.2(F32 `CALC_TOLERANCE`)와 같은 규칙: 2% 또는 HED 0.05 mg/kg · MRSD 1 mg 중 큰 쪽. */
export const IND_CALC_TOLERANCE = { relative: 0.02, hed: 0.05, mrsd: 1 } as const;

// ── 규칙 검사(즉시 · 무료 — §5.11 ①: 숫자 · 형식은 규칙만 판정) ──

export type IndRuleId =
  | 'lead_valid'
  | 'plan_complete'
  | 'sections_filled'
  | 'transdermal_fit'
  | 'calc_match'
  | 'dose_le_mrsd'
  | 'safety_expected'
  | 'risk_monitor'
  | 'pledges';
export const IND_RULE_IDS: readonly IndRuleId[] = ['lead_valid', 'plan_complete', 'sections_filled', 'transdermal_fit', 'calc_match', 'dose_le_mrsd', 'safety_expected', 'risk_monitor', 'pledges'];

/** 규칙 검사 입력 — 서버가 DB · game-rules 에서 모아 준다(화면은 같은 함수로 미리 보기를 그린다). */
export interface IndRuleInput {
  /** 신청서 후보가 지금 주력(또는 백업)이고 · 유효 특허이고 · 동물실험을 끝냈나. */
  lead: { ok: boolean; problem?: 'not_designated' | 'patent_inactive' | 'no_animal' };
  form: IndForm | null;
  dose: IndDose | null;
  population: string | null;
  endpoint: string | null;
  sections: Partial<Record<IndSectionKey, string>>;
  /** 3.2 동물실험 결과(F32 `AnimalStudyResult`) — 없으면 null. */
  animal: Pick<AnimalStudyResult, 'mrsdMgByForm' | 'hedMgPerKg' | 'findings'> | null;
  /** 2.2 신호(game-rules propertySignals) — 물성을 못 읽었으면 null. */
  signals: { transdermal: 'suitable' | 'unsuitable'; herg: IndRiskLevel; hepatotoxicity: IndRiskLevel } | null;
  /** 고른 조합의 '흔들림 전' 안전 S(game-rules scoreCandidate) — 못 구했으면 null. */
  expectedSafety: number | null;
}
export type IndRiskLevel = 'low' | 'moderate' | 'high';

/** 글에서 첫 숫자를 읽는다('약 10.2 mg/kg' → 10.2). 없으면 null. */
export function indParseNumber(text: string | undefined | null): number | null {
  if (!text) return null;
  const m = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s+/g, ''));
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** 학생 계산 값이 서버 값과 맞나(반올림 오차 안). */
export const indCalcMatches = (student: number | null, server: number, tolerance: number): boolean =>
  student !== null && Math.abs(student - server) <= Math.max(tolerance, Math.abs(server) * IND_CALC_TOLERANCE.relative) + 1e-9;

/** 위험 '보통' 이상(2.2 신호) 또는 동물실험 소견(QT · 간)이 있으면 ⑥ 감시 칸이 있어야 한다. */
export function indNeedsMonitoring(signals: IndRuleInput['signals'], findings: readonly PreclinicalFinding[] | null | undefined): { qt: boolean; liver: boolean } {
  const qt = (signals ? signals.herg !== 'low' : false) || Boolean(findings?.includes('qt'));
  const liver = (signals ? signals.hepatotoxicity !== 'low' : false) || Boolean(findings?.includes('liver'));
  return { qt, liver };
}

const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));

/** MRSD 표시(소수 첫째 자리까지, 정수면 정수). */
export const indFmtMg = (mg: number): string => (Number.isInteger(mg) ? String(mg) : mg.toFixed(1));

/**
 * 규칙 검사 — 설계 §5.10 표의 '규칙 검사' 칸 그대로 + '예상 안전 S ≥ 35'(MRSD 검사를 서버가 한 번 더 보증 — 서류를 통과한 IND 는
 * 규칙 판정에서 떨어지지 않는다). fail 이 하나라도 있으면 LLM 을 부르지 않고 보완(reviews.ts).
 */
export function indRuleFindings(input: IndRuleInput): RuleFinding[] {
  const C = IND_COPY.rules;
  const out: RuleFinding[] = [];
  const add = (id: IndRuleId, ok: boolean, note: string, section: IndSectionKey | 'plan') => out.push({ id, status: ok ? 'ok' : 'fail', note, section });

  add('lead_valid', input.lead.ok, input.lead.ok ? C.leadOk : C.lead[input.lead.problem ?? 'not_designated'], 'title');

  const missingPlan = [!input.form && C.planParts.form, !input.dose && C.planParts.dose, !input.population && C.planParts.population, !input.endpoint && C.planParts.endpoint].filter(Boolean);
  add('plan_complete', missingPlan.length === 0, missingPlan.length === 0 ? C.planOk : fill(C.planMissing, { what: missingPlan.join(' · ') }), 'plan');

  const empty = IND_SECTIONS.filter((s) => s.required && s.kind !== 'pledge' && !(input.sections[s.key] ?? '').trim()).map((s) => IND_COPY.sections[s.key].label);
  add('sections_filled', empty.length === 0, empty.length === 0 ? C.filledOk : fill(C.filledMissing, { what: empty.slice(0, 3).join(' · ') + (empty.length > 3 ? ` 외 ${empty.length - 3}` : '') }), 'title');

  const tdBad = input.form === 'transdermal' && input.signals?.transdermal === 'unsuitable';
  add('transdermal_fit', !tdBad, tdBad ? C.transdermalBad : C.transdermalOk, 'form_reason');

  if (input.animal) {
    const hed = indParseNumber(input.sections.calc_hed);
    const mrsdForm = input.form ? input.animal.mrsdMgByForm[input.form] : null;
    const mrsd = indParseNumber(input.sections.calc_mrsd);
    const hedOk = indCalcMatches(hed, input.animal.hedMgPerKg, IND_CALC_TOLERANCE.hed);
    const mrsdOk = mrsdForm !== null && indCalcMatches(mrsd, mrsdForm, IND_CALC_TOLERANCE.mrsd);
    const which = [!hedOk && 'HED', !mrsdOk && 'MRSD'].filter(Boolean).join(' · ');
    add('calc_match', hedOk && mrsdOk, hedOk && mrsdOk ? C.calcOk : fill(C.calcBad, { which: which || 'MRSD' }), hedOk ? 'calc_mrsd' : 'calc_hed');
    if (input.form && input.dose) {
      const cap = input.animal.mrsdMgByForm[input.form];
      const ok = input.dose <= cap;
      add('dose_le_mrsd', ok, fill(ok ? C.doseOk : C.doseOver, { dose: input.dose, mrsd: indFmtMg(cap), form: IND_COPY.forms[input.form].short }), 'subject');
    } else {
      add('dose_le_mrsd', false, C.doseNoPlan, 'subject');
    }
  } else {
    add('calc_match', false, C.noAnimal, 'calc_hed');
    add('dose_le_mrsd', false, C.noAnimal, 'subject');
  }

  const sOk = input.expectedSafety !== null && input.expectedSafety >= IND_SAFETY_MIN;
  add('safety_expected', sOk, input.expectedSafety === null ? C.safetyUnknown : fill(sOk ? C.safetyOk : C.safetyLow, { s: input.expectedSafety.toFixed(1), min: IND_SAFETY_MIN }), 'subject');

  const need = indNeedsMonitoring(input.signals, input.animal?.findings);
  const monitorEmpty = !(input.sections.risk_monitor ?? '').trim();
  const needAny = need.qt || need.liver;
  const what = [need.qt && C.monitorQt, need.liver && C.monitorLiver].filter(Boolean).join(' · ');
  add('risk_monitor', !(needAny && monitorEmpty), needAny ? (monitorEmpty ? fill(C.monitorMissing, { what }) : fill(C.monitorOk, { what })) : C.monitorNone, 'risk_monitor');

  const pledged = input.sections.pledge_hold === IND_PLEDGE_BODY && input.sections.pledge_report === IND_PLEDGE_BODY;
  add('pledges', pledged, pledged ? C.pledgeOk : C.pledgeMissing, 'pledge_hold');
  return out;
}

// ── LLM 심사 체크리스트(§5.10 'LLM 이 보는 것') — 심사관 판 IND_REVIEWER_VERSION ──

export const IND_CHECKLIST: ReadonlyArray<{ id: string; section: IndSectionKey }> = [
  { id: 'plan_fits', section: 'dev_plan' },
  { id: 'form_reason_fits', section: 'form_reason' },
  { id: 'nonclinical_consistent', section: 'nonclinical' },
  { id: 'subject_reason', section: 'subject' },
  { id: 'stop_specific', section: 'stop_rule' },
  { id: 'monitor_fits', section: 'risk_monitor' },
  { id: 'consent_clear', section: 'consent' },
];

/**
 * 이 신청서에 쓸 LLM 체크리스트 — ⑥ 감시 칸은 위험이 낮으면 비워도 되는 칸이라(규칙 'risk_monitor'),
 * 감시가 필요 없고 칸도 비었으면 'monitor_fits' 를 빼서 LLM 이 빈 칸을 'missing' 으로 보완 처리하지 않게 한다.
 */
export function indChecklistFor(input: Pick<IndRuleInput, 'signals' | 'animal' | 'sections'>): ReadonlyArray<{ id: string; section: IndSectionKey }> {
  const need = indNeedsMonitoring(input.signals, input.animal?.findings);
  const written = Boolean((input.sections.risk_monitor ?? '').trim());
  return need.qt || need.liver || written ? IND_CHECKLIST : IND_CHECKLIST.filter((c) => c.id !== 'monitor_fits');
}

/** 신청서 id 꼴(uuid) — 아니면 서버가 404(DB 형 오류 500 대신). */
export const IND_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── 환자군 · 1차 평가지표 목록(TRIAL_OPTIONS · §6.1.1 대표 평가지표) ──

export interface IndTrialOptions {
  disease: string;
  populations: readonly string[];
  endpoints: readonly string[];
  /** 고르면 비 CNS 표적도 뇌 노출 B 가 효능에 들어가는 환자군(game-rules needsBrainExposure). */
  brainPopulations: readonly string[];
}

/**
 * shared-types `TRIAL_OPTIONS` 에 아직 없는 표적(§6.1.1 의 새 8종)의 목록 — 대표 1차 평가지표는 §6.1.1 표 그대로,
 * 환자군은 초안(§5.12 문구 다듬기 대상). crista 가 TRIAL_OPTIONS 12종을 다시 복사해 주면 그쪽이 먼저다.
 */
const TRIAL_FALLBACK: Record<string, IndTrialOptions> = {
  'maob-2v5z': { disease: '파킨슨병', populations: ['초기 파킨슨병 환자', '레보도파 복용 중 운동 동요가 있는 파킨슨병 환자'], endpoints: ['통합 파킨슨병 척도 운동 점수(UPDRS Part III) 변화', 'ON 시간 변화'], brainPopulations: [] },
  'sert-5i71': { disease: '주요우울장애', populations: ['중등도~중증 주요우울장애 성인 환자', '첫 항우울제에 충분히 반응하지 않은 주요우울장애 환자'], endpoints: ['몽고메리-아스버그 우울 척도(MADRS) 변화', '해밀턴 우울 척도(HAM-D) 변화'], brainPopulations: [] },
  'abl1-2hyy': { disease: '만성 골수성 백혈병', populations: ['새로 진단된 만성기 만성 골수성 백혈병 환자', '기존 치료에 내성인 만성 골수성 백혈병 환자'], endpoints: ['12개월 주요 분자유전학적 반응률(MMR)', '완전 혈액학적 반응률'], brainPopulations: [] },
  'braf-3og7': { disease: '전이성 흑색종', populations: ['BRAF V600E 변이 전이성 흑색종 환자', '뇌전이를 동반한 BRAF V600E 변이 흑색종 환자'], endpoints: ['무진행 생존기간(PFS)', '객관적 반응률(ORR)', '전체 생존기간(OS)'], brainPopulations: ['뇌전이를 동반한 BRAF V600E 변이 흑색종 환자'] },
  'hmgcr-1hwk': { disease: '고지혈증 · 이상지질혈증', populations: ['원발성 고콜레스테롤혈증 성인 환자', '심혈관 위험이 높은 이상지질혈증 환자'], endpoints: ['12주 저밀도 지단백 콜레스테롤(LDL-C) 감소율(%)'], brainPopulations: [] },
  'fxa-2p16': { disease: '정맥혈전색전증 · 뇌졸중 예방', populations: ['급성 정맥혈전색전증 환자', '비판막성 심방세동 환자'], endpoints: ['정맥혈전색전증 재발률', '뇌졸중 발생률', 'ISTH 주요 출혈 사건 발생률'], brainPopulations: [] },
  'jak1-6bbu': { disease: '아토피 피부염', populations: ['중등도~중증 아토피 피부염 성인 환자', '국소 치료로 조절되지 않는 청소년 아토피 피부염 환자'], endpoints: ['16주 습진 면적 · 중증도 지수(EASI-75) 달성률', '가려움증 숫자 평가 척도(NRS) 변화'], brainPopulations: [] },
  'pde4b-1xmu': { disease: '천식 · 만성폐쇄성폐질환', populations: ['중등도~중증 만성폐쇄성폐질환(COPD) 환자', '악화가 잦은 중증 천식 환자'], endpoints: ['1초간 강제호기량(FEV1) 변화량', '중등도~중증 악화 연간 발생률'], brainPopulations: [] },
};

export function indTrialOptions(targetId: string | null | undefined): IndTrialOptions | null {
  if (!targetId) return null;
  const t = TRIAL_OPTIONS[targetId];
  if (t) return { disease: t.disease, populations: t.populations, endpoints: t.endpoints, brainPopulations: t.brainPopulations ?? [] };
  return TRIAL_FALLBACK[targetId] ?? null;
}

// ── 화면 모양 ──

/** game-rules `scoreCandidate` 결과 한 칸(흔들림 전). */
export interface IndScoreCell {
  form: IndForm;
  dose: IndDose;
  /** 뇌 병변 환자군(brainPopulations)을 골랐을 때의 값인가 — CNS 표적이거나 해당 환자군이 없으면 늘 false 한 벌만. */
  brainPop: boolean;
  efficacy: number;
  safety: number;
  inputs: { p: number; A: number; B: number; De: number; Dt: number; R: number; K: number };
  efficacyReasons: string[];
  safetyReasons: string[];
}

/** 2.2 신호(game-rules propertySignals 중 도구가 쓰는 것). */
export interface IndSignalsView {
  oralAbsorption: 'good' | 'moderate' | 'poor';
  bbb: 'high' | 'moderate' | 'low';
  herg: IndRiskLevel;
  hepatotoxicity: IndRiskLevel;
  transdermal: 'suitable' | 'unsuitable';
}

export interface IndCandidateView {
  role: 'lead' | 'backup';
  patentId: string;
  codeName: string;
  patentNo: string;
  admetJobId: string;
  /** 3.2 동물실험 묶음 결과(F32) — 없으면 null(동물실험 전). */
  animal: AnimalStudyResult | null;
  signals: IndSignalsView | null;
  affinityKcal: number | null;
  /** 9조합(× 뇌 병변 환자군 2벌) — 물성을 못 읽었으면 null(`gridNote`). */
  grid: IndScoreCell[] | null;
  gridNote?: string;
}

/** 도구가 그리는 규칙 값(서버가 game-rules PIPELINE_RULES 에서 실어 준다 — 화면은 값을 새로 만들지 않는다). */
export interface IndRulesView {
  doseToxicity: Record<IndDose, number>;
  doseEfficacy: Record<IndDose, number>;
  formulationPeak: Record<IndForm, number>;
  /** 효능 E 의 결합력 항(E = 100 × (base + affinityWeight × p) × A × B × De — 공식 폭포 · 실험실 글). */
  efficacy: { base: number; affinityWeight: number };
  /** IND · 1상 · 2상 · 3상 기준선(1상 이후는 '참고' — 임상 설계는 미룸). */
  thresholds: { ind: number; phase1: number; phase2E: number; phase3E: number; phase3S: number };
  /** 위험 배율 R = 1 + hERG + 간독성 의 더하는 값(공식 폭포). */
  risk: { herg: Record<IndRiskLevel, number>; hepatotoxicity: Record<IndRiskLevel, number> };
}

export interface IndApplicationView {
  id: string;
  status: IndStatus;
  /** 서류 판 — 칸 · 조합을 저장할 때마다 1 오른다. 심사 · 접수는 이 판을 고정한다(⑪). */
  version: number;
  /** 조합(제형 · 용량 · 환자군 · 평가지표 · 후보) 판 — 바꿀 때 `expectedPlanVersion`. */
  planVersion: number;
  patentId: string;
  codeName: string;
  form: IndForm | null;
  doseMg: IndDose | null;
  population: string | null;
  endpoint: string | null;
  sections: DocSectionView[];
  /** 가장 최근 심사(이 신청서). */
  review: DocReviewView | null;
  /** 지금 판으로 돌린 규칙 검사(미리 보기 — 심사를 누르면 같은 결과로 판정). */
  rulePreview: RuleFinding[];
  createdByName: string | null;
  submittedGameDay: number | null;
  decideGameDay: number | null;
  decidedGameDay: number | null;
  /** 접수 때 굳힌 예상 점수(흔들림 없음 — IND). */
  efficacy: number | null;
  safety: number | null;
  /** 판정 근거 문장(game-rules judgeStep). */
  judgement: { passed: boolean; reasons: string[] } | null;
}

/** 승인서 — 4.1 의 입력(F41 이 읽는다: 제형 · 용량 · 환자군 · 1차 평가지표). 이름 · 뜻을 바꾸지 않는다. */
export interface IndApprovalView {
  applicationId: string;
  revisionId: string;
  teamId: string;
  patentId: string;
  codeName: string;
  patentNo: string;
  form: IndForm;
  doseMg: IndDose;
  population: string;
  endpoint: string;
  /** 1상의 1차 평가지표(늘 안전성). */
  phase1Endpoint: string;
  /** 접수 때 굳힌 '흔들림 전' 점수 · 그 제형의 MRSD. */
  efficacy: number;
  safety: number;
  mrsdMg: number | null;
  submittedGameDay: number;
  approvedGameDay: number;
}

export interface IndResponse {
  revisionId: string | null;
  targetId: string | null;
  target: { gene: string; label: string; disease: string; cns: boolean } | null;
  /** 신청서를 만들 수 있나(주력 지정 · 유효 특허 · 동물실험) — 아니면 이유. */
  ready: boolean;
  readyReason: string | null;
  candidates: IndCandidateView[];
  trial: IndTrialOptions | null;
  rules: IndRulesView;
  /** 열린 신청서(초안 ~ 승인) — 없으면 가장 최근 보류 건. */
  application: IndApplicationView | null;
  approval: IndApprovalView | null;
  feeCents: number;
  feeCrista: number;
  reviewGameDays: number;
}

// ── 요청 ──

export interface IndPlanRequest {
  expectedPlanVersion: number;
  form?: IndForm | null;
  doseMg?: IndDose | null;
  population?: string | null;
  endpoint?: string | null;
  /** 주력 · 백업 특허 중 하나. */
  patentId?: string;
}
export interface IndReviewRequest {
  /** 화면이 읽은 서류 판 — 그 사이 누가 고쳤으면 409 `stale`. */
  expectedVersion: number;
}
export interface IndSubmitRequest {
  expectedVersion: number;
}
export interface IndApplicationResponse {
  application: IndApplicationView;
  created?: boolean;
}

export const IND_API = {
  ind: '/api/ind',
  applications: '/api/ind/applications',
  plan: (id: string) => `/api/ind/applications/${id}/plan`,
  section: (id: string, section: string) => `/api/ind/applications/${id}/sections/${section}`,
  review: (id: string) => `/api/ind/applications/${id}/review`,
  submit: (id: string) => `/api/ind/applications/${id}/submit`,
} as const;

// ── 화면 계산 도우미(순수) ──

/** 용량 → 용량 독성 Dt 곡선(10 · 50 · 100 mg 의 규칙 값을 잇는 꺾은선, 0 mg = 0) — 피크 곡선 · 용량-반응의 MRSD 선 그리기용. */
export function indDoseBurden(mg: number, table: Record<IndDose, number>): number {
  const pts: Array<[number, number]> = [[0, 0], [10, table[10]], [50, table[50]], [100, table[100]]];
  const x = Math.max(0, mg);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    if (x <= x1 || i === pts.length - 1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[100];
}

/** 흔들림 전 점수로 어디까지 갈 수 있나(시안 6.05 관문 신호 — 1상 이후는 참고). */
export function indGates(E: number, S: number, t: IndRulesView['thresholds']): Array<{ id: 'ind' | 'phase1' | 'phase2' | 'phase3'; ok: boolean }> {
  return [
    { id: 'ind', ok: S >= t.ind },
    { id: 'phase1', ok: S >= t.phase1 },
    { id: 'phase2', ok: E >= t.phase2E },
    { id: 'phase3', ok: E >= t.phase3E && S >= t.phase3S },
  ];
}

export const indCell = (grid: readonly IndScoreCell[] | null, form: IndForm, dose: IndDose, brainPop = false): IndScoreCell | null =>
  grid?.find((c) => c.form === form && c.dose === dose && c.brainPop === brainPop) ?? grid?.find((c) => c.form === form && c.dose === dose) ?? null;

export const fillIndCopy = fill;

// ── 학생에게 보이는 글(§5.12 — Gemini 4 Argon (High) 초안 `.review/2026-10-24-copy-3.3/copy.md` 를 반영). 규칙 값은 상수 · 서버 값(`{ind}` 등)으로 끼워 넣는다 ──

export const IND_COPY = {
  overview: {
    title: '이 단계에서 하는 일',
    oneLine: '사람에게 처음으로 우리 약을 써 봐도 되는지, 나라(식약처 · FDA)에 허락을 받는 IND(임상시험 계획 승인 신청) 서류를 내요.',
    summary: [
      '정할 것은 세 가지예요. 제형(약을 몸에 넣는 모양), 용량(넣는 양), 그리고 환자군과 1차 평가지표(시험 결과를 판단하는 가장 중요한 잣대)예요.',
      '가장 중요한 근거는 3.2 동물실험에서 구한 MRSD(최대 권장 시작 용량, 사람에게 처음 줘도 되는 가장 큰 양)예요.',
      `신청서를 내면 규칙 검사와 AI 심사관(Claude)이 차례로 봐요. 서류가 통과하면 수수료 ${formatCrista(IND_FEE_CRISTA)}를 내고, ${IND_REVIEW_GAME_DAYS}게임 일 뒤에 판정을 받아요.`,
    ],
    more: [
      { k: '한 문장', v: '우리 스타트업이 만든 후보 물질을 사람에게 처음 써 봐도 되는지 나라에 허락을 구하는 단계예요.' },
      { k: '정할 것 세 가지', v: '① 어떤 모양으로 넣을지 제형(먹는 알약 · 정맥 주사 · 붙이는 패치)을 골라요. ② 얼마나 넣을지 용량(10 · 50 · 100 mg)을 정해요. ③ 누구에게 시험하고 무엇을 잴지 환자군과 1차 평가지표를 골라요.' },
      { k: '근거 하나', v: '근거는 3.2 동물실험 결과예요. 동물에게서 부작용이 없던 양을 사람 기준으로 바꾸고, 안전하게 더 줄인 값이 MRSD 예요. 시작 용량은 MRSD 를 넘을 수 없어요.' },
      { k: '비유', v: '새 놀이기구에 사람을 처음 태우기 전에 안전 점검 결과를 내는 것과 비슷해요. 누구를 태우고 어떤 속도로 운행할지 계획도 함께 내서 허락을 받아요.' },
      { k: '저울', v: '용량을 올리면 효능 E 는 올라가지만 안전 S 는 내려가요. 두 가지를 함께 좋게 만드는 용량은 없어요.' },
      { k: '흔한 오해', v: 'IND 승인은 약을 팔아도 된다는 허가가 아니에요. 사람에게 시험을 시작해도 된다는 허락일 뿐이에요. 다음 관문인 1상의 안전 기준은 더 높아요.' },
    ],
    expand: '자세히 펼쳐 보기',
    collapse: '접기',
  },
  forms: {
    oral: { label: '먹는 알약(경구)', short: '경구', mark: '●' },
    iv: { label: '정맥 주사(핏줄에 바로 넣기)', short: '정맥', mark: '■' },
    transdermal: { label: '붙이는 패치(경피, 피부로 스며들기)', short: '경피', mark: '▲' },
  } as Record<IndForm, { label: string; short: string; mark: string }>,
  roles: { lead: '주력', backup: '백업' } as Record<'lead' | 'backup', string>,
  levels: { good: '좋음', moderate: '보통', poor: '나쁨', high: '높음', low: '낮음', suitable: '적합', unsuitable: '부적합' } as Record<string, string>,
  gates: { ind: 'IND', phase1: '1상(참고)', phase2: '2상(참고)', phase3: '3상(참고)' } as Record<'ind' | 'phase1' | 'phase2' | 'phase3', string>,
  preShake: '도구의 E · S 숫자는 모두 흔들림 전 예상치(교육용으로 단순하게 만든 공식의 값)예요. IND 판정에는 흔들림이 없어요. 임상 단계의 결과는 이 예상과 달라질 수 있어요.',
  /**
   * 도구 6종 — `howTo`(읽는 법) · `question` 의 `{ind}` `{p1}` `{p2e}` `{p3e}` `{p3s}`(기준선) · `{kOral}` `{kIv}` `{kTd}`(피크 K) ·
   * `{base}` `{w}`(효능 결합력 항)는 화면이 서버 규칙 값(`IndRulesView`)으로 채운다. `lesson` = 배울 점(시안 6.02~6.07).
   */
  tools: {
    lab: {
      tab: 'what-if 실험실',
      sub: '③ 제형 · ⑤ 용량 초안',
      question: '제형 · 용량 · 후보 · 환자군 손잡이를 바꾸면 효능 E 와 안전 S 예상치가 어떻게 달라질까요?',
      howTo: '손잡이 네 개를 움직여 보세요. E · S 게이지와 관문 신호(IND S ≥ {ind} · 1상 S ≥ {p1} · 2상 E ≥ {p2e} · 3상 E ≥ {p3e} 그리고 S ≥ {p3s})가 바로 바뀌어요. 1상부터는 참고용 신호예요. 그 제형의 MRSD 선도 함께 보여요.',
      fills: '③ 제형 · ⑤ 시작 용량 초안',
      lesson: '손잡이 네 개의 힘은 서로 달라요. 용량과 분자의 위험 신호가 안전 S 를 크게 흔들어요. 분자의 위험 신호는 hERG 위험(심장 박동을 조절하는 통로를 막아 심장 리듬을 흐트러뜨릴 위험)과 간 위험이에요.',
    },
    seesaw: {
      tab: '효능 · 안전 시소',
      sub: '⑤ 용량 근거',
      question: '용량과 제형을 바꾸면 효능 E 와 안전 S 중에서 무엇을 얻고 무엇을 잃을까요?',
      howTo: '왼쪽 접시는 효능 E, 오른쪽 접시는 안전 S 예요. 용량(10 · 50 · 100 mg)과 제형 단추를 눌러 시소가 어느 쪽으로 기우는지 비교해 보세요.',
      fills: '⑤ 용량 근거',
      lesson: '용량은 효능 E 와 안전 S 를 함께 좋게 만들 수 없는 저울이에요. 용량을 올리면 E 는 오르고 S 는 내려가요.',
    },
    peak: {
      tab: '피크 곡선',
      sub: '③ 제형 근거',
      question: '같은 용량이라도 제형에 따라 몸이 한꺼번에 받는 부담의 꼭대기(피크)가 어떻게 다를까요?',
      howTo: '꼭대기 높이는 용량 부담 Dt 에 제형의 피크 K 를 곱한 값이에요. 피크 K 는 경구 ×{kOral} · 정맥 ×{kIv} · 경피 ×{kTd} 예요. 꼭대기가 IND 한계선 아래에 있는지 확인해 보세요.',
      fills: '③ 제형 근거',
      lesson: '정맥 주사는 약이 한꺼번에 들어가서 꼭대기가 높아요. 경피 패치는 천천히 스며들어 꼭대기가 낮아요. 같은 용량이라도 꼭대기가 한계선을 넘으면 S 가 IND 기준보다 낮아져요.',
    },
    dose: {
      tab: '용량-반응 3장',
      sub: '③ · ⑤ 비교',
      question: '경구 · 정맥 · 경피 세 제형에서 효능 E 선과 안전 S 선은 어디서 엇갈릴까요?',
      howTo: '가로는 용량(mg), 세로는 점수(0~100)예요. 세로 점선은 그 제형의 MRSD 예요. 점선 왼쪽에서 E 와 S 가 함께 높은 곳을 찾아보세요.',
      fills: '③ · ⑤ 비교 근거',
      lesson: '어느 제형이든 용량이 커지면 E 선은 오르고 S 선은 내려가요. 제형을 바꾸면 두 선의 높이가 달라져서, 둘이 엇갈리는 자리가 옮겨 가요.',
    },
    plane: {
      tab: 'E–S 평면',
      sub: '조합 고르기',
      question: '9가지 조합(제형 3 × 용량 3) 가운데 IND 기준선(S {ind})보다 오른쪽에 있는 점은 무엇일까요?',
      howTo: '가로는 안전 S, 세로는 효능 E 예요. 점 모양은 제형이에요(● 경구 · ■ 정맥 · ▲ 경피). 1상부터의 기준선은 참고용이에요(임상 설계는 4.1 에서 해요). 점을 누르면 그 조합을 고를 수 있어요.',
      fills: '고른 제형 · 용량',
      lesson: '용량을 10 → 50 → 100 mg 으로 올리면 점은 늘 왼쪽 위로 움직여요. 효능 E 를 얻는 대신 안전 S 를 잃기 때문이에요.',
    },
    waterfall: {
      tab: '공식 폭포',
      sub: '⑥ 위험 · 감시',
      question: '우리가 고른 조합의 E 와 S 는 100점에서 출발해 어떤 재료 때문에 깎였을까요?',
      howTo: "효능 E 는 100점에 결합력 점수({base} + {w} × p) · 흡수 A · 뇌 노출 B · 용량 효능 De 를 차례로 곱해서 깎여요. 안전 S 는 100점에서 '용량 부담 Dt × 위험 배율(1 + hERG + 간) × 피크 K'를 빼서 깎여요. 이 공식은 교육용으로 단순하게 만든 것이에요.",
      fills: '⑥ 예상 위험 · 감시 계획',
      lesson: '안전 S 의 빨간 칸은 모두 용량 부담 Dt 에 곱해져서 생겨요. 그래서 용량을 줄이면 빨간 칸이 한꺼번에 줄어들어요.',
    },
  } as Record<'lab' | 'seesaw' | 'peak' | 'dose' | 'plane' | 'waterfall', { tab: string; sub: string; question: string; howTo: string; fills: string; lesson: string }>,
  toolNotes: {
    fills: '채워지는 신청서 칸 · {what}',
    lessonTitle: '배울 점',
    knobForm: '제형',
    knobDose: '용량',
    knobCandidate: '후보',
    knobPopulation: '환자군',
    mrsdLine: '이 제형의 MRSD {mrsd} mg',
    mrsdOk: '{dose} mg 은 MRSD {mrsd} mg 이하예요. 1상 시작 용량으로 쓸 수 있어요.',
    mrsdOver: '{dose} mg 은 MRSD {mrsd} mg 을 넘어요. 이대로 내면 규칙 검사에서 보완 요구를 받아요.',
    mrsdNone: '동물실험 결과가 없어서 MRSD 를 아직 몰라요.',
    peakConcept: '곡선 모양은 이해를 돕는 개념 그림이에요. 실제로 잰 약물 농도 곡선이 아니에요. 꼭대기 높이(Dt × K)만 게임 규칙 값이에요.',
    peakLimit: 'IND 한계 {v} = (100 − {min}) ÷ 위험 배율 {rk}',
    peakMrsd: '{form} MRSD {mrsd} mg 의 부담',
    peakTop: '꼭대기 {pk} = Dt {dt} × K {k}',
    peakOver: '✕ IND 한계 넘음',
    peakUnder: '✓ 한계 안',
    peakFig: '피크 곡선 — {dose} mg 에서 경구 · 정맥 · 경피 꼭대기와 IND 한계',
    planePick: '고른 점: {form} {dose} mg — E {e} · S {s}',
    planeApply: '이 조합을 신청서에 넣기',
    planeApplied: '신청서에 넣은 조합과 같아요.',
    planeFig: '효능 E 와 안전 S 평면 위 9가지 조합 — 점을 눌러 조합을 골라요',
    planeAxisS: '안전 S →',
    planeAxisE: '효능 E ↑',
    planeRef: '(참고)',
    planeRefE: 'E {v}({phase} 참고)',
    planeLow: 'S < {ind}',
    planePtOk: 'IND 기준 넘음',
    planePtBad: 'IND 기준 못 넘음',
    phase: { phase1: '1상', phase2: '2상', phase3: '3상' },
    gaugeE: '효능 E',
    gaugeS: '안전 S',
    gatesLabel: '관문 신호',
    formulaLabel: '공식',
    labFig: '효능 E {e} · 안전 S {s} — {form} {dose} mg',
    seesawFig: '시소 — 효능 E {e} · 안전 S {s}',
    doseFig: '{form} — 용량 10 · 50 · 100 mg 의 E {e}, S {s}',
    doseLegendE: '● 효능 E — 실선',
    doseLegendS: '■ 안전 S — 점선',
    doseLegendOk: '✓ / ✕ = S ≥ {ind}',
    dosePeak: '피크 ×{k}',
    waterfallE: '효능 E — 곱해서 깎여요',
    waterfallS: '안전 S — 빼서 깎여요',
    wf: { start: '출발', affinity: '결합력', absorb: '흡수 A', brain: '뇌 B', doseE: '용량 De', doseS: '용량 Dt', herg: 'hERG', liver: '간', peak: '피크 K' },
    brainPop: '고른 환자군은 약이 뇌까지 가야 해요. 그래서 뇌 노출 B(약이 혈액뇌장벽, 즉 뇌를 지키는 거름막을 지나 뇌에 닿는 정도)가 효능 E 에 곱해져요.',
    noGrid: '이 후보의 물성을 아직 읽지 못했어요. 그래서 도구를 그릴 수 없어요.',
  },
  parts: {
    cover: { no: '①', title: '표지', guide: '신청인 · 코드명 · 특허 번호 · 신청 단계(제1상) · 기전 한 줄은 서버가 채워 줘요. 기전은 약이 몸에서 효과를 내는 원리예요. 여러분은 시험 제목만 쓰면 돼요.' },
    plan: { no: '②', title: '개발 계획', guide: '서버가 채운 표적 · 질환을 보고 써요. 왜 이 약이 필요한지와 1~3상 계획을 3~5줄로 적어요.' },
    form: { no: '③', title: '임상시험용 의약품(제형)', guide: '제형을 고르고 근거를 2줄로 써요. 피크 곡선 · 용량-반응 도구와 경피 투과 신호를 근거로 쓸 수 있어요.' },
    nonclinical: { no: '④', title: '비임상 시험 요약', guide: '비임상 시험은 사람에게 쓰기 전에 동물 등으로 하는 시험이에요. 서버가 붙인 NOAEL(부작용이 보이지 않은 가장 높은 용량) · 효력 · 소견 · 사용 마릿수를 보고 결과를 3~5줄로 해석해요. HED(사람 등가 용량)와 MRSD 는 직접 계산해 적어요.' },
    protocol: { no: '⑤', title: '임상시험 계획서(1상 요약)', guide: "1상의 1차 평가지표는 늘 '안전성 · 이상사례'예요. 여기서는 대상과 이유, 중단 기준을 써요. 다음 상의 환자군과 1차 평가지표는 위 '고른 조합'에서 목록으로 골라요." },
    risk: { no: '⑥', title: '위험 관리 · 피험자 보호', guide: '피험자는 시험에 참여하는 사람이에요. 예상 위험과 감시 계획, 동의 설명문 핵심 3줄, IRB(임상시험심사위원회) 심의를 써요.' },
    pledge: { no: '⑦', title: '서약', guide: '두 가지 약속에 모두 체크해야 접수할 수 있어요. 첫째 약속은 미국 규정 21 CFR 312.23(a)(1)(iii)에 있는 내용이에요.' },
  } as Record<IndPart, { no: string; title: string; guide: string }>,
  shareHint: '③ · ④ · ⑤ · ⑥ 칸은 모둠원이 나눠 쓸 수 있어요. 칸마다 따로 저장돼요.',
  /** 칸 — `criterion` 은 학생에게 보이는 심사 기준(LLM 이 보는 기준은 아래 `checklist`). */
  sections: {
    title: { label: '시험 제목', placeholder: '예: 경도 알츠하이머병 환자를 위한 {code} 경구 제형의 첫 사람 시험(제1상)', guide: '무엇을, 누구에게, 몇 상으로 시험하는지 한 줄로 적어요.' },
    dev_plan: {
      label: '개발 계획',
      placeholder: '예: 지금 쓰는 약은 증상을 잠시 줄여 줄 뿐이에요. 그래서 원인 표적을 겨냥한 새 약이 필요해요. 1상에서 안전한 용량을 확인하고, 2상에서 환자에게 효과를 살피고, 3상에서 많은 환자로 효과를 확인할 계획이에요.',
      guide: '왜 새 약이 필요한지 써요. 그리고 1상(안전성) → 2상(효과 찾기) → 3상(효과 확인) 계획을 3~5줄로 써요.',
      criterion: '심사 기준: 개발 계획(질환 · 필요한 이유 · 1~3상 흐름)이 우리 표적 · 질환과 맞나요?',
    },
    form_reason: {
      label: '제형을 고른 근거(2줄)',
      placeholder: `예: 경구 흡수 신호가 '좋음'이고 피크 K 가 ×1.00 이라 정맥(×1.25)보다 꼭대기 부담이 낮아요. 경구 50 mg 은 MRSD 이하이고 예상 S 가 IND 기준 ${IND_SAFETY_MIN}를 넘어요.`,
      guide: '왜 이 제형을 골랐는지 2줄로 써요. 흡수 신호, 경피 투과 신호, 피크 K, 예상 E · S 를 근거로 들어요.',
      criterion: "심사 기준: 제형 근거가 도구 결과(흡수 · 경피 투과 신호 · 피크 K · 예상 E · S)와 맞나요? 경피 투과가 '부적합'인 분자는 경피로 고를 수 없어요.",
    },
    nonclinical: {
      label: '동물실험 해석(3~5줄)',
      placeholder: '예: 개가 랫드보다 더 민감했어요(개 NOAEL 18 mg/kg/일). 높은 용량의 개에서 QT 간격이 늘어나는 소견이 있었어요. 그래서 1상은 MRSD 이하로 시작하고 심전도를 자주 확인할 거예요.',
      guide: '랫드(실험용 큰 쥐)와 개 중 어느 쪽이 더 민감했는지 써요. NOAEL 과 소견도 해석해요. 소견에는 간 수치 상승이나 심전도 QT(심장이 한 번 뛰고 다시 회복하기까지 걸리는 시간) 연장 같은 것이 있어요.',
      criterion: "심사 기준: 해석이 실제 소견과 맞나요? 간 소견이 있는데 '독성 없음'이라고 쓰면 앞뒤가 맞지 않아요.",
    },
    calc_hed: { label: 'HED(mg/kg) — 직접 계산', placeholder: '예: 10.0', guide: `HED(사람 등가 용량)는 NOAEL ÷ 환산 계수(랫드 ${SPECIES_HED_DIVISOR.rat} · 개 ${SPECIES_HED_DIVISOR.dog})로 구해요. 두 종 가운데 더 낮은 값을 적어요. 더 민감한 종을 기준으로 삼는 거예요.` },
    calc_mrsd: { label: '고른 제형의 MRSD(mg) — 직접 계산', placeholder: '예: 60', guide: `경구 MRSD 는 HED ÷ 안전계수 × ${HUMAN_WEIGHT_KG} kg 으로 구해요. 안전계수는 기본 ${SAFETY_FACTOR.standard}이고, 3.2 에서 마릿수를 '적게'로 했다면 ${SAFETY_FACTOR.low}이에요. 정맥 · 경피를 골랐다면 3.2 결과판의 제형별 MRSD 를 보고 적어요. 이 게임은 제형마다 피크 K 가 달라 MRSD 도 달라져요.` },
    subject: {
      label: '대상과 이유',
      placeholder: '예: 건강한 성인 지원자로 해요. 1상은 먼저 안전성을 보는 시험이에요. 원래 앓던 병이 없는 사람이어야 부작용이 약 때문인지 가려내기 쉬워요.',
      guide: '1상 대상(건강한 지원자 또는 환자)과 그 이유를 적어요. 시작 용량은 위에서 고른 조합을 따라요.',
      criterion: '심사 기준: 대상과 그 이유가 1상의 목적(안전성 · 이상사례 확인)과 맞나요?',
    },
    stop_rule: {
      label: '중단 기준',
      placeholder: '예: 심전도에서 QTc(심장이 한 번 뛰고 다음 박동을 준비하기까지 걸리는 시간을 심박수로 보정한 값)가 500 ms 를 넘으면 그 용량 단계를 멈춰요. 간 효소 ALT(간세포가 다치면 핏속에 늘어나는 효소)가 정상 상한의 3배를 넘어도 멈춰요.',
      guide: '무엇을 재서, 얼마가 넘으면, 무엇을 멈출지 적어요.',
      criterion: '심사 기준: 중단 기준이 구체적인가요? 무엇을 재서 · 얼마면 · 무엇을 멈추는지가 분명해야 해요.',
    },
    risk_monitor: {
      label: '예상 위험과 감시',
      placeholder: "예: hERG 위험이 '높음'이고 개에서 QT 소견도 있었어요. 그래서 약을 주기 전과 꼭대기 시간에 심전도로 QT 간격을 재요. 간 위험도 '보통'이라 매주 피검사로 간 수치를 확인해요.",
      guide: "위험이 '보통' 이상이면 꼭 써요. hERG 위험이면 심전도로 QT 를 감시하고, 간 위험이면 간 수치를 감시해요.",
      criterion: '심사 기준: 감시 계획이 위험 신호 · 동물실험 소견과 맞나요? 위험이 낮으면 일반 감시로 충분해요.',
    },
    consent: {
      label: '동의 설명문 핵심 3줄 · IRB',
      placeholder: '예: ① 이 시험은 새 약 후보를 사람에게 처음 써서 안전한지 확인해요. ② 심장 리듬 변화 같은 부작용이 생길 수 있어 자주 검사해요. ③ 언제든 불이익 없이 그만둘 수 있어요. 이 계획은 IRB 심의를 먼저 받아요.',
      guide: '참여자가 꼭 알아야 할 세 가지(시험 목적 · 예상 위험 · 언제든 그만둘 수 있음)를 써요. IRB(임상시험심사위원회, 시험이 안전하고 윤리적인지 미리 심사하는 위원회) 심의도 적어요.',
      criterion: '심사 기준: 동의 설명문 핵심 세 가지(목적 · 위험 · 언제든 그만둘 수 있음)와 IRB 심의가 모두 있나요?',
    },
    pledge_hold: { label: 'IND 승인 전에는 사람에게 시험하지 않아요(21 CFR 312.23(a)(1)(iii)).', placeholder: '', guide: '' },
    pledge_report: { label: '결과가 나빠도 숨기지 않고 보고해요.', placeholder: '', guide: '' },
  } as Record<IndSectionKey, { label: string; placeholder: string; guide: string; criterion?: string }>,
  /** LLM 심사관이 보는 칸별 기준(학생 화면에는 위 `sections.*.criterion`) — 바꾸면 IND_REVIEWER_VERSION 을 올린다. */
  checklist: {
    plan_fits: '② 개발 계획이 표적 · 질환과 맞는가(질환 · 필요성 · 1~3상 흐름)',
    form_reason_fits: '③ 제형 근거가 서버 사실(흡수 · 경피 투과 신호 · 피크 K · E · S 예상치)과 맞는가',
    nonclinical_consistent: '④ 동물실험 해석이 소견(NOAEL · 종별 민감도 · 간 · QT 소견)과 앞뒤가 맞는가',
    subject_reason: '⑤ 대상(건강한 지원자 / 환자)과 그 이유가 1상의 목적(안전성)과 맞는가',
    stop_specific: '⑤ 중단 기준이 구체적인가(무엇을 재서 · 얼마면 · 무엇을 멈추나)',
    monitor_fits: '⑥ 예상 위험과 감시 계획이 위험 신호 · 소견과 맞는가(위험이 낮으면 일반 감시로 충분)',
    consent_clear: '⑥ 동의 설명문 핵심(목적 · 위험 · 언제든 그만둘 수 있음)과 IRB 심의가 있는가',
  } as Record<string, string>,
  rules: {
    leadOk: '3.2 에서 정한 주력(또는 백업) 분자예요. 유효 특허와 동물실험 결과가 모두 있어요.',
    lead: {
      not_designated: '3.2 에서 정한 주력 · 백업 분자가 아니에요. 후보를 다시 확인해 주세요.',
      patent_inactive: '이 분자의 특허가 유효하지 않아요. 유효 특허가 있는 분자만 신청할 수 있어요.',
      no_animal: '이 분자는 아직 3.2 동물실험을 끝내지 않았어요. 동물실험을 먼저 끝내 주세요.',
    } as Record<'not_designated' | 'patent_inactive' | 'no_animal', string>,
    planParts: { form: '제형', dose: '용량', population: '환자군', endpoint: '1차 평가지표' },
    planOk: '제형 · 용량 · 환자군 · 1차 평가지표를 모두 골랐어요.',
    planMissing: '아직 고르지 않은 것이 있어요: {what}',
    filledOk: '꼭 써야 할 칸을 모두 썼어요.',
    filledMissing: '빈 칸이 있어요: {what}',
    transdermalOk: '고른 제형이 경피 투과 신호와 맞아요.',
    transdermalBad: "이 분자는 경피 투과가 '부적합'이에요. 피부를 잘 지나가지 못하니 패치 말고 다른 제형을 골라 주세요.",
    calcOk: '④ 계산 칸(HED · MRSD)이 서버 값과 맞아요.',
    calcBad: `④ 계산 칸이 서버 값과 달라요: {which}. 환산 계수(랫드 ${SPECIES_HED_DIVISOR.rat} · 개 ${SPECIES_HED_DIVISOR.dog})와 안전계수, 고른 제형의 MRSD 를 다시 확인해 보세요.`,
    noAnimal: '동물실험 결과가 없어서 HED · MRSD 를 확인할 수 없어요.',
    doseOk: '시작 용량 {dose} mg 은 {form} MRSD {mrsd} mg 이하예요.',
    doseOver: '시작 용량 {dose} mg 이 {form} MRSD {mrsd} mg 을 넘어요. 용량을 낮추거나 꼭대기 부담이 낮은 제형으로 바꿔 주세요.',
    doseNoPlan: '제형과 용량을 먼저 골라야 MRSD 와 견줄 수 있어요.',
    safetyOk: '예상 안전 S {s} 는 IND 기준 {min} 이상이에요.',
    safetyLow: '예상 안전 S {s} 가 IND 기준 {min} 보다 낮아요. 이 조합으로는 승인받을 수 없어요.',
    safetyUnknown: '예상 안전 S 를 구하지 못했어요. 제형 · 용량 · 물성을 확인해 주세요.',
    monitorQt: '심전도 QT',
    monitorLiver: '간 수치',
    monitorMissing: "위험이 '보통' 이상이거나 동물실험 소견이 있어요({what}). ⑥ 감시 칸을 꼭 써 주세요.",
    monitorOk: '위험 감시 칸을 썼어요({what}).',
    monitorNone: '위험 신호가 낮고 관련 소견도 없어요. 감시 칸은 비워 둬도 돼요.',
    pledgeOk: '⑦ 서약 두 개에 모두 체크했어요.',
    pledgeMissing: '⑦ 서약 두 개에 모두 체크해야 접수할 수 있어요.',
  },
  status: {
    draft: '초안',
    reviewing: '서류 심사 중',
    revise: '보완 요구',
    passed: '서류 통과 — 접수할 수 있어요',
    submitted: '접수 — 판정을 기다려요',
    approved: 'IND 승인',
    held: 'IND 보류',
  } as Record<IndStatus, string>,
  statusMark: { draft: '✎', reviewing: '▸', revise: '!', passed: '✓', submitted: '▸', approved: '✓', held: '✕' } as Record<IndStatus, string>,
  doc: {
    heading: '임상시험 계획 승인 신청서',
    newDoc: '새 신청서 쓰기',
    newDocHint: '신청서는 모둠에 하나만 만들어져요. 누가 눌러도 모둠원 모두가 같은 신청서를 함께 써요.',
    planTitle: '고른 조합',
    planEmpty: '아직 조합을 고르지 않았어요. E–S 평면에서 점을 눌러 골라 보세요.',
    population: '다음 상의 환자군',
    endpoint: '다음 상의 1차 평가지표',
    phase1Endpoint: '1상 1차 평가지표(정해져 있어요)',
    pick: '골라 주세요',
    candidate: '후보',
    serverFill: '서버가 채운 값',
    version: '판 {n}',
    loading: '불러오는 중…',
    rulesTitle: '규칙 검사 미리 보기',
    rulesHint: '[서류 심사 받기]를 누르면 규칙 검사를 먼저 해요. 하나라도 걸리면 AI 심사 없이 바로 보완으로 돌아와요. 이때는 돈도 횟수도 들지 않아요.',
    reviewBtn: '서류 심사 받기(무료)',
    reviewLimit: 'AI 심사는 신청서 1건당 하루 {n}번, 모둠 전체로 하루 {teamN}번까지 받을 수 있어요. 규칙 검사에서 걸리거나 내용이 바뀌지 않아 앞 심사 결과를 그대로 돌려줄 때는 횟수에 세지 않아요.',
    reviewPending: 'AI 심사관이 신청서를 읽고 있어요. 읽은 뒤 판정을 정리하는 기간을 거쳐 결과가 나와요. 그동안 다른 칸이나 단계를 계속 써도 돼요.',
    reviewRetrying: "AI 심사가 잠시 늦어지고 있어요. '심사 대기'로 두고 다시 시도할게요. 그동안에도 신청서를 고칠 수 있어요.",
    reviewStale: '심사받은 뒤 신청서가 바뀌었어요(심사 판 {a} · 지금 판 {b}). 지금 판으로 다시 심사를 통과해야 접수할 수 있어요.',
    verdict: { pending: '심사 중', pass: '서류 통과', revise: '보완 요구', reject: '거절' } as Record<string, string>,
    itemHeader: 'AI 심사관의 칸별 지적',
    itemStatus: { ok: '문제 없어요', missing: '빠졌어요', inconsistent: '앞뒤가 안 맞아요', unclear: '분명하지 않아요' } as Record<string, string>,
    feedbackHeader: 'AI 심사관의 종합 피드백',
    reviseHint: '지적받은 칸을 고쳐서 다시 심사받으면 돼요. 보완 요구에는 연구비가 들지 않고, 다시 받는 심사도 무료예요.',
    teacherNote: '선생님 메모',
    passedNotice: '규칙 검사와 AI 심사를 모두 통과했어요. 이제 수수료를 내고 IND 를 접수할 수 있어요.',
    submitBtn: '접수하기 — 수수료 {fee}',
    submitConfirm: '접수하면 모둠 연구비에서 {fee}가 빠져요. {days}게임 일 뒤에 판정이 나요. 접수한 뒤에는 신청서를 고칠 수 없어요.',
    waiting: '{from} 접수 → {to} 판정 · {pct}%',
    waitingLabel: 'IND 판정까지',
    approvedTitle: 'IND 승인서(임상시험 계획 승인서)',
    stamp: '승인',
    approvedNote: 'IND 승인은 약을 팔아도 된다는 허가가 아니에요. 사람에게 첫 시험(1상)을 시작해도 된다는 허락이에요. 이 승인서의 제형 · 용량 · 환자군 · 1차 평가지표가 4.1 임상으로 넘어가요.',
    heldNote: '보류됐어요. 선생님과 이유를 확인한 뒤 새 신청서를 쓸 수 있어요.',
    noFunds: '모둠 연구비가 모자라서 접수할 수 없어요.',
    planCandidateGone: '(지금은 주력 · 백업이 아니에요)',
    approvalRows: { candidate: '후보 물질', form: '제형', dose: '시작 용량', phase1Endpoint: '1상 1차 평가지표', population: '다음 상의 환자군', endpoint: '다음 상의 1차 평가지표', score: '예상 점수(흔들림 없음)', day: '승인일' },
    phase1Gap: '흔들림 전 예상치로 보면 1상 참고 기준(S ≥ {p1})까지 {gap} 모자라요. 4.1 임상은 이 승인서의 용량으로 시작해요. 1상이 보류되면 다시 도전할 때 용량이나 제형을 바꿀 수 있어요.',
    phase1Ok: '흔들림 전 예상치로는 1상 참고 기준(S ≥ {p1})도 넘는 조합이에요. 실제 1상 결과는 예상과 달라질 수 있어요.',
    locked: '접수한 신청서는 고칠 수 없어요.',
    lockedStep: '3.2 에서 주력을 정하고 동물실험을 끝내면 신청서를 쓸 수 있어요. 도구와 연구 노트는 미리 볼 수 있어요.',
    pledgeOn: '체크했어요',
  },
  /** 칸마다 '서버가 채운 값' 줄(설계 §5.10 표). */
  facts: {
    cover: '{code}{patent} · 제1상 · {mech}',
    patent: ' · 특허 {no}',
    mech: '{gene} 억제 — {disease}',
    plan: '표적 {gene}({label}) · 질환 {disease}',
    form: '경피 투과 {td} · 경구 흡수 {oral} · 피크 K 경구 ×{kOral} · 정맥 ×{kIv} · 경피 ×{kTd}',
    nonclinical: 'NOAEL 랫드 {rat} · 개 {dog} mg/kg/일 · 안전계수 {sf} · 효력 {eff}% · 소견 {findings} · {animals}마리',
    noFindings: '없음',
    risk: 'hERG {herg} · 간 {liver}',
  },
  ui: {
    tabsLabel: '3.3 도구',
    doneWhen: 'IND 승인',
    mineTitle: '내 작업대 — 도구로 조합 시험하기',
    teamTitle: '모둠 공유 — 임상시험 계획 승인 신청서',
  },
  board: {
    approved: '◆ {ticker} IND 승인 — {code} · {disease} 첫 사람 시험 준비',
    held: '◆ {ticker} IND 보류 — {code} · {disease}',
  },
  errors: {
    notReady: '3.2 에서 주력(유효 특허 · 동물실험 완료)을 먼저 정해 주세요.',
    noTarget: '1.1 에서 표적을 먼저 정해 주세요.',
    notFound: '신청서를 찾지 못했어요.',
    locked: '접수했거나 판정이 난 신청서는 고칠 수 없어요.',
    planStale: '다른 모둠원이 조합을 먼저 바꿨어요. 화면을 새로 읽은 뒤 다시 골라 주세요.',
    docStale: '그 사이 신청서가 바뀌었어요. 바뀐 내용을 확인한 뒤 다시 눌러 주세요.',
    badForm: '제형은 경구 · 정맥 · 경피 중 하나예요.',
    badDose: '용량은 10 · 50 · 100 mg 중 하나예요.',
    badPopulation: '환자군은 목록에서 골라 주세요.',
    badEndpoint: '1차 평가지표는 목록에서 골라 주세요.',
    badPatent: '후보는 3.2 에서 정한 주력 · 백업 분자 중에서 골라 주세요.',
    badPledge: '서약 칸은 체크하거나 비우기만 할 수 있어요.',
    notPassed: '서류 심사를 통과한 뒤에 접수할 수 있어요.',
    reviewFirst: '지금 판으로 서류 심사를 통과해야 접수할 수 있어요.',
    alreadySubmitted: '이미 접수했어요. 판정을 기다려요.',
    liveExists: '이 표적 버전에는 이미 접수 중이거나 승인된 IND 가 있어요.',
    targetChanged: '표적이 바뀌었어요. 지금 표적으로 새 신청서를 써 주세요.',
    rulesFail: '규칙 검사에 걸린 칸이 있어 접수할 수 없어요. 신청서를 고친 뒤 다시 심사받아 주세요.',
    worker: '후보 물성을 계산하지 못했어요. 잠시 뒤 다시 해 주세요.',
  },
} as const;
