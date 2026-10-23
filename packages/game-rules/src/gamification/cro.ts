/**
 * CRO 의뢰 문제 은행 · 채점 · 보상(설계서 축 1 §1.2 · §1.3, 사용자 결정 #1). 순수 함수 — 판정은 `pipeline/score.ts` 를 그대로 쓴다.
 * 구현 결정: docs/2026-10-23-gamification-step2-brief.md §2 · §3.
 *
 * - 문항지는 **시드 하나**로 결정적이다(같은 시드 · 같은 변형 번호 = 같은 문항 · 같은 보기 순서). 정답표(`CroSheetKey`)는 서버만 만든다.
 * - 일반 의뢰 = 한 분야의 본 문항 3개 + 근거 문항 1개(본 문항 하나의 판단 근거가 된 규칙 고르기).
 * - 심층 의뢰 = 사례 하나(분자 물성 · 표적 · 도킹 ΔG · 용량)에 결론 문항 3개(결합력 p · 효능 감점 요인 · 안전 S) + 근거 문항 1개.
 * - 분자 물성은 교육용으로 만든 값이다(실제 화합물이 아니다). 등급 · 위험 · 점수는 `ro5Violations` · `propertySignals` · `scoreCandidate` 로 정한다.
 */
import type {
  CroAttemptView,
  CroField,
  CroQuestionType,
  CroQuestionView,
  CroSheetView,
  CroTrack,
  MoleculeProperties,
  StructuralAlertId,
} from '@crista/shared-types';
import { CRO_FIELD_LABEL, CRO_LIMITS, CRO_REWARD_CENTS } from '@crista/shared-types';
import { PIPELINE_RULES } from '../pipeline/rules.ts';
import { affinityStrength, propertySignals, ro5Violations, scoreCandidate } from '../pipeline/score.ts';

const R = PIPELINE_RULES;

// ─────────────────────────────── 결정적 난수 ───────────────────────────────

function hash32(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

interface Rng {
  next(): number;
  int(min: number, max: number): number;
  real(min: number, max: number, digits: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

function rngOf(seed: string): Rng {
  let a = hash32(`crista-cro:${seed}`);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    real: (min, max, digits) => {
      const f = 10 ** digits;
      return Math.round((min + next() * (max - min)) * f) / f;
    },
    pick: (items) => items[Math.floor(next() * items.length)]!,
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
  return rng;
}

// ─────────────────────────────── 문항 틀 ───────────────────────────────

/** 문항 하나의 정답 · 해설(서버만). */
export interface CroQuestionKey {
  id: string;
  type: CroQuestionType;
  role: 'main' | 'evidence';
  correct: string[];
  explanation: string;
}

export interface CroSheetKey {
  track: CroTrack;
  questions: CroQuestionKey[];
}

export interface CroSheet {
  view: CroSheetView;
  key: CroSheetKey;
}

const CHOICE_IDS = ['a', 'b', 'c', 'd', 'e'] as const;

interface Draft {
  type: CroQuestionType;
  prompt: string;
  table?: { columns: string[]; rows: string[][] };
  /** 보기 글 — 정답 여부를 함께. 순서는 섞는다(`keepOrder` 면 그대로). */
  options: Array<{ label: string; correct: boolean }>;
  multi: boolean;
  explanation: string;
  keepOrder?: boolean;
}

function finish(rng: Rng, id: string, role: 'main' | 'evidence', d: Draft): { view: CroQuestionView; key: CroQuestionKey } {
  const ordered = d.keepOrder ? d.options : rng.shuffle(d.options);
  const choices = ordered.map((o, i) => ({ id: CHOICE_IDS[i]!, label: o.label }));
  const correct = ordered.flatMap((o, i) => (o.correct ? [CHOICE_IDS[i]!] : []));
  return {
    view: { id, type: d.type, role, prompt: d.prompt, ...(d.table ? { table: d.table } : {}), choices, multi: d.multi },
    key: { id, type: d.type, role, correct, explanation: d.explanation },
  };
}

// ─────────────────────────────── 근거 규칙(EV 문항) ───────────────────────────────

/** 유형마다 옳은 규칙 한 줄과 그럴듯하게 틀린 규칙들 — 근거 문항의 보기. */
const RULES: Record<Exclude<CroQuestionType, 'EV'>, { right: string; wrong: string[] }> = {
  A1: {
    right: '표적 억제 → 하위 신호 변화 → 질환 지표 변화의 순서로 인과를 잇는다.',
    wrong: ['질환 지표가 먼저 바뀌어야 표적이 억제된다.', '표적을 억제하면 하위 신호와 무관하게 질환 지표가 바로 바뀐다.'],
  },
  A2: {
    right: '경쟁적 저해는 Vmax 가 같고 겉보기 Km 이 커진다 · 순수 비경쟁적 저해는 Vmax 가 줄고 Km 이 같다.',
    wrong: ['경쟁적 저해는 Vmax 가 줄고 Km 이 같다 · 비경쟁적 저해는 Km 만 커진다.', '저해제가 있으면 Vmax 와 Km 이 항상 함께 커진다.'],
  },
  A3: {
    right: '연관성(OR · p 값)은 인과를 보이지 못한다 — 억제 · 결손 · 회복 같은 기능 실험이 표적 검증 근거다.',
    wrong: ['p 값이 작을수록 그 유전자가 질환의 원인이라는 기능 근거가 된다.', '발현량이 2배 이상 늘었다는 관찰만으로 표적 검증이 끝난다.'],
  },
  B1: {
    right: 'Lipinski Ro5 위반: MW > 500 · cLogP > 5 · HBD > 5 · HBA > 10 을 하나씩 센다(경계값과 같으면 위반이 아니다).',
    wrong: ['Ro5 위반: MW ≥ 500 · cLogP ≥ 5 · HBD ≥ 5 · HBA ≥ 10 을 하나씩 센다.', 'Ro5 위반: MW > 400 · cLogP > 3 · HBD > 3 · HBA > 8 을 하나씩 센다.'],
  },
  B2: {
    right: 'BBB 높음 = TPSA ≤ 90 · MW ≤ 450 · HBD ≤ 3, 보통 = TPSA ≤ 120 · MW ≤ 500, 그 밖은 낮음.',
    wrong: ['BBB 는 cLogP 가 5 를 넘을수록 높다(지용성만 본다).', 'BBB 높음 = TPSA ≥ 90 · MW ≥ 450 — 크고 극성일수록 뇌에 잘 들어간다.'],
  },
  B3: {
    right: 'hERG 높음 = 염기성 지방족 아민 + cLogP ≥ 3.7, 보통 = 염기성 아민 + cLogP ≥ 2.5, 아민이 없으면 낮음.',
    wrong: ['hERG 는 분자량이 500 을 넘으면 높음이다.', 'hERG 높음 = cLogP ≥ 3.7 — 염기성 아민 유무와 무관하다.'],
  },
  B4: {
    right: '간독성 높음 = 구조 경고(방향족 니트로 · 방향족 아민) — 경고를 없애면서 Ro5 위반을 늘리지 않는 유도체가 안전한 수리다.',
    wrong: ['구조 경고는 분자량을 늘리면 사라진다.', '구조 경고를 다른 위치로 옮기면 간독성이 사라진다.'],
  },
  C1: {
    right: '결합력 p = clamp((−ΔG − 7) / 5, 0, 1) — ΔG −7 kcal/mol 이면 0, −12 이면 1.',
    wrong: ['결합력 p = −ΔG / 12 — ΔG 가 0 이면 0.', '결합력 p = clamp((ΔG + 7) / 5, 0, 1) — ΔG 가 클수록(덜 음수일수록) 강하다.'],
  },
  C2: {
    right: 'pLDDT ≥ 70 은 구조를 믿을 만하다는 뜻일 뿐 — 결합 · 약효는 실험으로 따로 확인해야 한다.',
    wrong: ['pLDDT 가 90 을 넘으면 그 포켓에 약이 결합한다는 것이 입증된다.', 'pLDDT < 50 인 비정형 루프가 도킹 상자로 가장 알맞다.'],
  },
  C3: {
    right: 'Train 성능은 높은데 Validation 이 크게(10%p 이상) 낮으면 과적합 — 데이터 누출 없이 나눈 검증으로 판단한다.',
    wrong: ['Train 성능이 높을수록 언제나 좋은 모델이다.', 'Validation 이 Train 보다 낮으면 차이와 무관하게 모두 과적합이다.'],
  },
  D1: {
    right: '안전 S = max(0, 100 − Dt × R × K) — R = 1 + hERG 가산 + 간독성 가산, K = 제형 피크.',
    wrong: ['안전 S = 100 − Dt − R − K.', '안전 S = 100 × (0.30 + 0.70 × p) × A × B × De.'],
  },
};

function evidenceQuestion(targetIndex: number, targetType: Exclude<CroQuestionType, 'EV'>, otherType: Exclude<CroQuestionType, 'EV'>): Draft {
  const rule = RULES[targetType];
  return {
    type: 'EV',
    prompt: `근거 검토 — 문항 ${targetIndex + 1}의 판단 근거가 된 규칙으로 옳은 것은?`,
    options: [
      { label: rule.right, correct: true },
      ...rule.wrong.map((label) => ({ label, correct: false })),
      { label: RULES[otherType].wrong[0]!, correct: false },
    ],
    multi: false,
    explanation: `옳은 규칙: ${rule.right}`,
  };
}

// ─────────────────────────────── 교육용 분자 ───────────────────────────────

function molecule(over: Partial<MoleculeProperties>): MoleculeProperties {
  return {
    canonicalSmiles: '',
    flatSmiles: '',
    mw: 350,
    clogp: 2.5,
    tpsa: 70,
    hbd: 1,
    hba: 5,
    rotb: 5,
    aromaticRings: 2,
    qed: 0.6,
    basicAmines: 0,
    alerts: [],
    engine: '교육용 가상 물성',
    ...over,
  };
}

const fx = (v: number, d: number) => v.toFixed(d);
/** ΔG 표기 — 음수는 유니코드 마이너스(−). */
const kcal = (dg: number) => fx(dg, 1).replace('-', '−');

/** 받침이 있으면 '을', 없으면 '를' — 괄호 설명은 빼고 마지막 글자로 본다(숫자 · 영문은 읽는 소리). */
function objectParticle(word: string): string {
  const bare = word.replace(/\([^)]*\)\s*$/, '').trim();
  const last = bare.charAt(bare.length - 1);
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '를' : '을';
  if (/[0-9]/.test(last)) return '013678'.includes(last) ? '을' : '를';
  if (/[A-Za-z]/.test(last)) return 'LMNRlmnr'.includes(last) ? '을' : '를';
  return '를';
}
const codeName = (rng: Rng) => `CRX-${rng.pick(['α', 'β', 'γ', 'δ', 'κ', 'λ'])}${rng.int(10, 99)}`;
const RISK_KO = { low: '낮음', moderate: '보통', high: '높음' } as const;
const BBB_KO = { high: '높음', moderate: '보통', low: '낮음' } as const;
const ALERT_KO: Record<StructuralAlertId, string> = { nitro_aromatic: '방향족 니트로', aromatic_amine: '방향족 아민' };

// ─────────────────────────────── 생명과학 A1 · A2 · A3 ───────────────────────────────

const PATHWAYS: ReadonlyArray<{ target: string; downstream: string; outcome: string }> = [
  { target: 'AChE(아세틸콜린에스터레이스)', downstream: '시냅스 아세틸콜린 농도 유지', outcome: '알츠하이머 인지 지표 개선' },
  { target: 'BACE1', downstream: '아밀로이드 베타 생성 감소', outcome: '알츠하이머 뇌 플라크 감소' },
  { target: 'EGFR(돌연변이 키네이스)', downstream: 'RAS–MAPK 증식 신호 감소', outcome: '비소세포폐암 종양 성장 억제' },
  { target: 'PCSK9', downstream: '간세포 LDL 수용체 증가', outcome: '혈중 LDL 콜레스테롤 감소' },
  { target: 'DPP-4', downstream: 'GLP-1 분해 감소', outcome: '2형 당뇨 공복 혈당 감소' },
  { target: 'COX-2', downstream: '프로스타글란딘 생성 감소', outcome: '염증 · 통증 지표 감소' },
  { target: 'HMG-CoA 환원효소', downstream: '간 콜레스테롤 합성 감소', outcome: '혈중 LDL 콜레스테롤 감소' },
];

function qA1(rng: Rng): Draft {
  const order = rng.shuffle(PATHWAYS);
  const right = order[0]!;
  const others = order.slice(1);
  const label = (d: string, o: string) => `${d} → ${o}`;
  const wrong = new Set<string>();
  // 하위 변화와 질환 지표를 다른 경로에서 섞는다(정답과 같은 조합은 빼고).
  for (const o of others) {
    if (wrong.size >= 3) break;
    const mix = rng.next() < 0.5 ? label(right.downstream, o.outcome) : label(o.downstream, right.outcome);
    if (mix !== label(right.downstream, right.outcome) && !(o.outcome === right.outcome && mix.startsWith(right.downstream))) wrong.add(mix);
  }
  for (const o of others) {
    if (wrong.size >= 3) break;
    wrong.add(label(o.downstream, o.outcome));
  }
  return {
    type: 'A1',
    prompt: `표적 ${right.target}${objectParticle(right.target)} 억제할 때 이어지는 인과 경로로 맞는 것은?`,
    options: [{ label: label(right.downstream, right.outcome), correct: true }, ...[...wrong].slice(0, 3).map((l) => ({ label: l, correct: false }))],
    multi: false,
    explanation: `${right.target} 억제 → ${right.downstream} → ${right.outcome}. 하위 신호와 질환 지표가 같은 경로에서 이어져야 한다.`,
  };
}

function qA2(rng: Rng): Draft {
  const competitive = rng.next() < 0.5;
  const vmax = rng.int(80, 160);
  const km = rng.real(4, 20, 1);
  const iVmax = competitive ? vmax : Math.round(vmax * rng.real(0.4, 0.7, 2));
  const iKm = competitive ? Math.round(km * rng.real(2, 4, 2) * 10) / 10 : km;
  return {
    type: 'A2',
    prompt: '대조군과 저해제 처리군의 반응속도 자료다. 이 저해제의 저해 방식은?',
    table: {
      columns: ['조건', 'Vmax (µmol/분)', '겉보기 Km (µM)'],
      rows: [
        ['대조군', String(vmax), fx(km, 1)],
        ['저해제 처리', String(iVmax), fx(iKm, 1)],
      ],
    },
    options: [
      { label: '경쟁적 저해', correct: competitive },
      { label: '순수 비경쟁적 저해', correct: !competitive },
      { label: '저해 효과 없음', correct: false },
      { label: '효소 활성화', correct: false },
    ],
    multi: false,
    explanation: competitive
      ? `Vmax 가 ${vmax} 로 같고 겉보기 Km 이 ${fx(km, 1)} → ${fx(iKm, 1)} µM 로 커졌다 — 기질과 같은 자리를 다투는 경쟁적 저해.`
      : `Km 이 ${fx(km, 1)} µM 로 같고 Vmax 가 ${vmax} → ${iVmax} 로 줄었다 — 순수 비경쟁적 저해.`,
  };
}

const ASSOCIATION_CARDS = [
  '환자 2,000명 유전체 연관 분석에서 변이 보유 OR 1.4 (p = 3×10⁻⁸)',
  '질환 조직에서 그 유전자 mRNA 가 정상 조직보다 2.1배 많다',
  '변이 보유자의 질환 위험이 높다(OR 1.8, p = 0.001)',
  '혈중 단백질 농도와 질환 중증도의 상관계수 r = 0.62',
] as const;
const FUNCTIONAL_CARDS = [
  'siRNA 로 그 유전자를 억제하자 병적 표현형이 40% 줄었다',
  '녹아웃 마우스에서 질환 표현형이 나타나지 않았다',
  '억제한 세포에 유전자를 다시 발현시키자(회복 실험) 표현형이 되돌아왔다',
  'CRISPR 로 결손시킨 세포에서 질환 관련 신호가 사라졌다',
] as const;

function qA3(rng: Rng): Draft {
  const nFunctional = rng.int(1, 2);
  const functional = rng.shuffle(FUNCTIONAL_CARDS).slice(0, nFunctional);
  const association = rng.shuffle(ASSOCIATION_CARDS).slice(0, 4 - nFunctional);
  return {
    type: 'A3',
    prompt: '표적 후보 유전자의 근거 카드다. 표적 검증의 기능 근거를 모두 고르라.',
    options: [...functional.map((label) => ({ label, correct: true })), ...association.map((label) => ({ label, correct: false }))],
    multi: true,
    explanation: `기능 근거(억제 · 결손 · 회복 실험): ${functional.join(' / ')}. 나머지는 관찰된 연관성이라 인과를 보이지 못한다.`,
  };
}

// ─────────────────────────────── 의약화학 B1 ~ B4 ───────────────────────────────

function qB1(rng: Rng): Draft {
  const target = rng.int(0, 3);
  const keys = rng.shuffle(['mw', 'clogp', 'hbd', 'hba'] as const).slice(0, target);
  const viol = new Set(keys);
  // 경계값(500 · 5 · 5 · 10 — '같으면 위반 아님')을 가끔 넣는다.
  const edge = rng.next() < 0.35;
  const p = molecule({
    mw: viol.has('mw') ? rng.real(505, 640, 1) : edge ? 500 : rng.real(260, 495, 1),
    clogp: viol.has('clogp') ? rng.real(5.2, 6.8, 2) : rng.real(0.5, 4.8, 2),
    hbd: viol.has('hbd') ? rng.int(6, 8) : edge ? 5 : rng.int(0, 4),
    hba: viol.has('hba') ? rng.int(11, 14) : edge ? 10 : rng.int(3, 9),
  });
  const v = ro5Violations(p);
  const name = codeName(rng);
  const parts = [
    p.mw > R.signals.ro5.mwMax ? `MW ${fx(p.mw, 1)} > 500` : null,
    p.clogp > R.signals.ro5.clogpMax ? `cLogP ${fx(p.clogp, 2)} > 5` : null,
    p.hbd > R.signals.ro5.hbdMax ? `HBD ${p.hbd} > 5` : null,
    p.hba > R.signals.ro5.hbaMax ? `HBA ${p.hba} > 10` : null,
  ].filter(Boolean);
  return {
    type: 'B1',
    prompt: `후보 ${name}의 물성이다. Lipinski Ro5 위반은 몇 개인가?`,
    table: { columns: ['MW (Da)', 'cLogP', 'HBD', 'HBA'], rows: [[fx(p.mw, 1), fx(p.clogp, 2), String(p.hbd), String(p.hba)]] },
    options: [0, 1, 2, 3].map((n) => ({ label: `${n}개`, correct: n === v })),
    multi: false,
    keepOrder: true,
    explanation: v === 0 ? '네 기준을 모두 넘지 않는다(경계값과 같으면 위반 아님) — 위반 0개.' : `${parts.join(' · ')} — 위반 ${v}개.`,
  };
}

function qB2(rng: Rng): Draft {
  const goal = rng.pick(['high', 'moderate', 'low'] as const);
  let p: MoleculeProperties;
  if (goal === 'high') p = molecule({ tpsa: rng.real(30, 90, 1), mw: rng.real(240, 450, 1), hbd: rng.int(0, 3) });
  else if (goal === 'moderate') {
    const way = rng.int(0, 2);
    p =
      way === 0
        ? molecule({ tpsa: rng.real(90.5, 120, 1), mw: rng.real(260, 440, 1), hbd: rng.int(0, 3) })
        : way === 1
          ? molecule({ tpsa: rng.real(40, 88, 1), mw: rng.real(451, 500, 1), hbd: rng.int(0, 3) })
          : molecule({ tpsa: rng.real(50, 88, 1), mw: rng.real(280, 430, 1), hbd: rng.int(4, 5) });
  } else p = rng.next() < 0.5 ? molecule({ tpsa: rng.real(121, 160, 1), mw: rng.real(300, 480, 1), hbd: rng.int(2, 5) }) : molecule({ tpsa: rng.real(60, 110, 1), mw: rng.real(505, 600, 1), hbd: rng.int(1, 4) });
  const bbb = propertySignals(p).bbb;
  return {
    type: 'B2',
    prompt: `CNS 표적 후보 ${codeName(rng)}의 물성이다. 교육용 규칙으로 판정한 BBB(뇌 노출) 등급은?`,
    table: { columns: ['TPSA (Å²)', 'MW (Da)', 'HBD'], rows: [[fx(p.tpsa, 1), fx(p.mw, 1), String(p.hbd)]] },
    options: (['high', 'moderate', 'low'] as const).map((g) => ({ label: BBB_KO[g], correct: g === bbb })),
    multi: false,
    keepOrder: true,
    explanation:
      bbb === 'high'
        ? `TPSA ${fx(p.tpsa, 1)} ≤ 90 · MW ${fx(p.mw, 1)} ≤ 450 · HBD ${p.hbd} ≤ 3 — 높음.`
        : bbb === 'moderate'
          ? `높음 조건(TPSA ≤ 90 · MW ≤ 450 · HBD ≤ 3) 하나를 못 지키고 TPSA ${fx(p.tpsa, 1)} ≤ 120 · MW ${fx(p.mw, 1)} ≤ 500 — 보통. 높이려면 그 물성을 줄인다.`
          : `TPSA ${fx(p.tpsa, 1)} 또는 MW ${fx(p.mw, 1)} 가 보통 기준(TPSA ≤ 120 · MW ≤ 500)을 넘는다 — 낮음.`,
  };
}

function qB3(rng: Rng): Draft {
  const goal = rng.pick(['high', 'moderate', 'low'] as const);
  const p =
    goal === 'high'
      ? molecule({ basicAmines: rng.int(1, 2), clogp: rng.real(3.7, 5.4, 2) })
      : goal === 'moderate'
        ? molecule({ basicAmines: rng.int(1, 2), clogp: rng.real(2.5, 3.69, 2) })
        : rng.next() < 0.6
          ? molecule({ basicAmines: 0, clogp: rng.real(3.8, 5.4, 2) })
          : molecule({ basicAmines: 1, clogp: rng.real(0.5, 2.49, 2) });
  const herg = propertySignals(p).herg;
  return {
    type: 'B3',
    prompt: `후보 ${codeName(rng)}의 hERG 심장독성 위험(교육용 규칙)은?`,
    table: { columns: ['염기성 지방족 아민 수', 'cLogP'], rows: [[String(p.basicAmines), fx(p.clogp, 2)]] },
    options: (['high', 'moderate', 'low'] as const).map((g) => ({ label: RISK_KO[g], correct: g === herg })),
    multi: false,
    keepOrder: true,
    explanation:
      p.basicAmines === 0
        ? `염기성 아민이 없다 — cLogP ${fx(p.clogp, 2)} 와 무관하게 낮음.`
        : `염기성 아민 ${p.basicAmines} · cLogP ${fx(p.clogp, 2)} ${p.clogp >= 3.7 ? '≥ 3.7 — 높음' : p.clogp >= 2.5 ? '≥ 2.5 — 보통' : '< 2.5 — 낮음'}.`,
  };
}

function qB4(rng: Rng): Draft {
  const alert = rng.pick(['nitro_aromatic', 'aromatic_amine'] as const);
  const other: StructuralAlertId = alert === 'nitro_aromatic' ? 'aromatic_amine' : 'nitro_aromatic';
  const group = alert === 'nitro_aromatic' ? '니트로(−NO₂)' : '아미노(−NH₂)';
  const parent = molecule({ mw: rng.real(300, 420, 1), clogp: rng.real(1.5, 3.8, 2), hbd: rng.int(1, 3), hba: rng.int(4, 7), alerts: [alert] });
  const name = codeName(rng);
  const derivs = [
    { label: `${group}를 메톡시(−OCH₃)로 치환`, p: molecule({ ...parent, mw: Math.round((parent.mw - 15) * 10) / 10, alerts: [] }) },
    { label: `${group}를 고리의 다른 자리로 옮김`, p: molecule({ ...parent, alerts: [alert] }) },
    { label: `${group}를 큰 다환 치환기로 바꿈`, p: molecule({ ...parent, mw: rng.real(505, 560, 1), clogp: rng.real(5.1, 5.9, 2), alerts: [] }) },
    { label: `${group}를 ${ALERT_KO[other]} 작용기로 바꿈`, p: molecule({ ...parent, alerts: [other] }) },
  ];
  const parentV = ro5Violations(parent);
  const safe = (p: MoleculeProperties) => p.alerts.length === 0 && ro5Violations(p) <= parentV;
  const row = (label: string, p: MoleculeProperties) => [label, p.alerts.map((a) => ALERT_KO[a]).join(' · ') || '없음', fx(p.mw, 1), fx(p.clogp, 2), String(ro5Violations(p))];
  return {
    type: 'B4',
    prompt: `후보 ${name}에 ${ALERT_KO[alert]} 구조 경고가 있어 간독성이 '높음'이다. 경고가 사라지고 Ro5 위반이 늘지 않는 유도체는?`,
    table: {
      columns: ['유도체', '구조 경고', 'MW', 'cLogP', 'Ro5 위반'],
      rows: [row(`${name}(원래)`, parent), ...derivs.map((d) => row(d.label, d.p))],
    },
    options: derivs.map((d) => ({ label: d.label, correct: safe(d.p) })),
    multi: false,
    explanation: `경고 작용기를 없애고(구조 경고 없음) Ro5 위반이 ${parentV}개 그대로인 메톡시 치환이 안전한 수리다. 자리만 옮기거나 다른 경고 작용기로 바꾸면 경고가 남고, 큰 치환기는 Ro5 위반을 늘린다.`,
  };
}

// ─────────────────────────────── AI · 생물정보 C1 · C2 · C3 ───────────────────────────────

function qC1(rng: Rng): Draft {
  const dg = rng.real(-12.4, -7.3, 1);
  const p = affinityStrength(dg);
  const show = (x: number) => `p = ${fx(Math.min(1, Math.max(0, x)), 2)}`;
  const right = show(p);
  const candidates = [show(-dg / 12), show((-dg - 7) / 10), show((-dg - 5) / 5), show(1 - p), show(p + 0.2), show(p - 0.2)];
  const wrong = [...new Set(candidates.filter((c) => c !== right))].slice(0, 3);
  return {
    type: 'C1',
    prompt: `같은 포켓에 도킹한 후보의 결합 자유에너지가 ΔG = ${kcal(dg)} kcal/mol 이다. 게임 규칙의 결합력 p 는?`,
    options: [{ label: right, correct: true }, ...wrong.map((label) => ({ label, correct: false }))],
    multi: false,
    explanation: `p = clamp((−ΔG − 7) / 5, 0, 1) = (${fx(-dg, 1)} − 7) / 5 = ${fx(p, 2)}.`,
  };
}

function qC2(rng: Rng): Draft {
  const starts = rng.shuffle([12, 48, 96, 140, 188, 230]).slice(0, 4).sort((a, b) => a - b);
  const kinds = rng.shuffle(['high', 'mid', 'low', 'low'] as const);
  const regions = starts.map((s, i) => {
    const kind = kinds[i]!;
    const plddt = kind === 'high' ? rng.real(78, 95, 1) : kind === 'mid' ? rng.real(55, 68, 1) : rng.real(28, 48, 1);
    return { label: `잔기 ${s}–${s + rng.int(14, 26)}`, plddt, kind };
  });
  const best = regions.find((r) => r.kind === 'high')!;
  return {
    type: 'C2',
    prompt: 'AlphaFold 예측 구조의 영역별 평균 pLDDT 다. 도킹 상자를 둘 영역으로 알맞은 것은?',
    table: { columns: ['영역', '평균 pLDDT'], rows: regions.map((r) => [r.label, fx(r.plddt, 1)]) },
    options: regions.map((r) => ({ label: r.label, correct: r.kind === 'high' })),
    multi: false,
    keepOrder: true,
    explanation: `${best.label}(pLDDT ${fx(best.plddt, 1)} ≥ 70)만 고신뢰 영역이다. pLDDT < 50 은 비정형 루프. 단, pLDDT 가 높다고 결합 · 약효가 입증된 것은 아니다.`,
  };
}

function qC3(rng: Rng): Draft {
  const nOver = rng.int(1, 2);
  const flags = rng.shuffle([...Array.from({ length: nOver }, () => true), ...Array.from({ length: 4 - nOver }, () => false)]);
  const models = flags.map((over, i) => {
    const train = over ? rng.real(93, 99.5, 1) : rng.real(80, 91, 1);
    const val = over ? Math.round((train - rng.real(15, 35, 1)) * 10) / 10 : Math.round((train - rng.real(0, 4, 1)) * 10) / 10;
    return { name: `모델 M${i + 1}`, train, val, over };
  });
  return {
    type: 'C3',
    prompt: '활성 예측 모델 네 개의 정확도(%)다. 과적합인 모델을 모두 고르라.',
    table: { columns: ['모델', 'Train', 'Validation', '격차(%p)'], rows: models.map((m) => [m.name, fx(m.train, 1), fx(m.val, 1), fx(m.train - m.val, 1)]) },
    options: models.map((m) => ({ label: m.name, correct: m.over })),
    multi: true,
    keepOrder: true,
    explanation: `격차 10%p 이상: ${models.filter((m) => m.over).map((m) => `${m.name}(${fx(m.train, 1)} → ${fx(m.val, 1)})`).join(' · ')} — 학습 데이터를 외웠다.`,
  };
}

// ─────────────────────────────── 심층 사례 ───────────────────────────────

const CASE_TARGETS = [
  { label: 'AChE — 알츠하이머(중추신경계)', cns: true },
  { label: 'BACE1 — 알츠하이머(중추신경계)', cns: true },
  { label: 'DPP-4 — 2형 당뇨(말초)', cns: false },
  { label: 'COX-2 — 염증(말초)', cns: false },
] as const;

const FACTOR_LABEL = {
  weak: '약한 결합력(p < 0.6)',
  absorption: '경구 흡수 부족(A < 1)',
  bbb: '뇌 노출 부족(B < 1)',
  none: '해당 없음',
} as const;

function deepCase(rng: Rng): { brief: string; table: { columns: string[]; rows: string[][] }; drafts: Draft[] } {
  const target = rng.pick(CASE_TARGETS);
  const p = molecule({
    mw: rng.real(280, 520, 1),
    clogp: rng.real(1.2, 5.2, 2),
    tpsa: rng.real(35, 130, 1),
    hbd: rng.int(0, 4),
    hba: rng.int(3, 9),
    rotb: rng.int(3, 11),
    basicAmines: rng.next() < 0.55 ? 1 : 0,
    alerts: rng.next() < 0.25 ? [rng.pick(['nitro_aromatic', 'aromatic_amine'] as const)] : [],
  });
  const dg = rng.real(-11.8, -7.6, 1);
  const name = codeName(rng);
  const s = scoreCandidate({ affinityKcal: dg, props: p, dose: 100, formulation: 'oral', cns: target.cns });
  const sig = s.signals;

  // q1 결합력
  const q1 = qC1Fixed(dg);
  // q2 효능 감점 요인(100mg 은 De = 1 이라 빠진다)
  const factors = [
    { key: 'weak', on: s.inputs.p < 0.6 },
    { key: 'absorption', on: s.inputs.A < 1 },
    { key: 'bbb', on: s.inputs.B < 1 },
  ] as const;
  const anyOn = factors.some((f) => f.on);
  const q2: Draft = {
    type: 'D1',
    prompt: '이 사례를 경구 100mg 으로 개발할 때 효능 E 를 깎는 요인을 모두 고르라.',
    options: [...factors.map((f) => ({ label: FACTOR_LABEL[f.key], correct: f.on })), { label: FACTOR_LABEL.none, correct: !anyOn }],
    multi: true,
    keepOrder: true,
    explanation: `p ${fx(s.inputs.p, 3)} · 흡수 A ${s.inputs.A}(경구 흡수 ${sig.oralAbsorption === 'good' ? '좋음' : sig.oralAbsorption === 'moderate' ? '보통' : '나쁨'}) · 뇌 노출 B ${s.inputs.B}${target.cns ? `(BBB ${BBB_KO[sig.bbb]})` : '(말초 표적이라 1)'} — 1 보다 작거나 p < 0.6 인 것이 감점 요인.`,
  };
  // q3 안전 S
  const right = s.safety;
  const fmtS = (x: number) => `S = ${fx(Math.max(0, Math.round(x * 10) / 10), 1)}`;
  const wrongS = [
    100 - s.inputs.Dt - s.inputs.R - s.inputs.K,
    100 - s.inputs.Dt * s.inputs.K,
    100 - R.doseToxicity[50] * s.inputs.R * s.inputs.K,
    100 - s.inputs.Dt * (s.inputs.R + 0.3) * s.inputs.K,
  ].map(fmtS);
  const wrong = [...new Set(wrongS.filter((x) => x !== fmtS(right)))].slice(0, 3);
  const q3: Draft = {
    type: 'D1',
    prompt: `경구 100mg 으로 IND 를 낼 때 안전 S 는? (IND 기준 S ≥ ${R.thresholds.ind.safety})`,
    options: [{ label: fmtS(right), correct: true }, ...wrong.map((label) => ({ label, correct: false }))],
    multi: false,
    explanation: `hERG ${RISK_KO[sig.herg]} · 간독성 ${RISK_KO[sig.hepatotoxicity]} → R ${fx(s.inputs.R, 2)}, Dt 55 · 경구 K 1.0 → S = max(0, 100 − 55 × ${fx(s.inputs.R, 2)} × 1.0) = ${fx(right, 1)}. ${right >= (R.thresholds.ind.safety ?? 35) ? 'IND 기준을 넘는다.' : 'IND 기준에 못 미쳐 보류될 것이다 — 용량을 낮추거나 위험 작용기를 재설계한다.'}`,
  };
  return {
    brief: `${name} · 표적 ${target.label} · 도킹 ΔG ${kcal(dg)} kcal/mol · 경구 100mg(용량 독성 Dt 55 · 용량 효능 De 1.0). 위험 배율 R = 1 + hERG(보통 0.3 · 높음 0.6) + 간독성(보통 0.25 · 높음 0.6), 경구 흡수 A: 좋음 1.0 · 보통 0.75 · 나쁨 0.45, 뇌 노출 B(CNS): 높음 1.0 · 보통 0.7 · 낮음 0.35.`,
    table: {
      columns: ['MW', 'cLogP', 'TPSA', 'HBD', 'HBA', '회전 결합', '염기성 아민', '구조 경고'],
      rows: [[fx(p.mw, 1), fx(p.clogp, 2), fx(p.tpsa, 1), String(p.hbd), String(p.hba), String(p.rotb), String(p.basicAmines), p.alerts.map((a) => ALERT_KO[a]).join(' · ') || '없음']],
    },
    drafts: [q1, q2, q3],
  };
}

function qC1Fixed(dg: number): Draft {
  const p = affinityStrength(dg);
  const show = (x: number) => `p = ${fx(Math.min(1, Math.max(0, x)), 2)}`;
  const right = show(p);
  const wrong = [...new Set([show(-dg / 12), show((-dg - 7) / 10), show((-dg - 5) / 5), show(1 - p), show(p + 0.2)].filter((c) => c !== right))].slice(0, 3);
  return {
    type: 'C1',
    prompt: `이 사례의 도킹 ΔG = ${kcal(dg)} kcal/mol 로 계산한 결합력 p 는?`,
    options: [{ label: right, correct: true }, ...wrong.map((label) => ({ label, correct: false }))],
    multi: false,
    explanation: `p = clamp((−ΔG − 7) / 5, 0, 1) = ${fx(p, 2)}.`,
  };
}

// ─────────────────────────────── 문항지 ───────────────────────────────

const MAKERS: Record<Exclude<CroQuestionType, 'EV' | 'D1'>, (rng: Rng) => Draft> = {
  A1: qA1,
  A2: qA2,
  A3: qA3,
  B1: qB1,
  B2: qB2,
  B3: qB3,
  B4: qB4,
  C1: qC1,
  C2: qC2,
  C3: qC3,
};

const FIELD_TYPES: Record<CroField, Array<Exclude<CroQuestionType, 'EV' | 'D1'>>> = {
  bio: ['A1', 'A2', 'A3'],
  medchem: ['B1', 'B2', 'B3', 'B4'],
  ai: ['C1', 'C2', 'C3'],
};

/**
 * 문항지 하나 — `seed`(수주 때 고정) · 변형 번호(0 = 첫 문항지, 1 = 오답 뒤 같은 학습 목표의 변형). 결정적이다.
 * 일반 의뢰의 유형(의약화학은 넷 중 셋)은 변형 번호와 무관하게 시드로 정한다 — 변형은 같은 유형의 새 값이다.
 */
export function croSheet(seed: string, track: CroTrack, field: CroField, variant: 0 | 1): CroSheet {
  const plan = rngOf(`${seed}|plan`);
  const rng = rngOf(`${seed}|v${variant}`);
  const views: CroQuestionView[] = [];
  const keys: CroQuestionKey[] = [];
  const push = (id: string, role: 'main' | 'evidence', d: Draft) => {
    const q = finish(rng, id, role, d);
    views.push(q.view);
    keys.push(q.key);
  };
  if (track === 'general') {
    const types = field === 'medchem' ? plan.shuffle(FIELD_TYPES.medchem).slice(0, 3) : FIELD_TYPES[field];
    types.forEach((t, i) => push(`q${i + 1}`, 'main', MAKERS[t](rng)));
    const evIndex = plan.int(0, 2);
    const evType = types[evIndex]!;
    const otherType = plan.pick(Object.keys(MAKERS).filter((t) => !types.includes(t as never))) as Exclude<CroQuestionType, 'EV'>;
    push('ev', 'evidence', evidenceQuestion(evIndex, evType, otherType));
    return {
      view: { variant, title: `${CRO_FIELD_LABEL[field]} 일반 의뢰${variant === 1 ? ' · 변형 문항' : ''}`, questions: views },
      key: { track, questions: keys },
    };
  }
  const c = deepCase(rng);
  c.drafts.forEach((d, i) => push(`q${i + 1}`, 'main', d));
  push('ev', 'evidence', evidenceQuestion(2, 'D1', 'C1'));
  // 사례 자료 표는 첫 문항에 싣는다(화면은 문항지 위에 사례 설명과 함께 보인다).
  views[0] = { ...views[0]!, table: c.table };
  return {
    view: { variant, title: `심층 분석 의뢰${variant === 1 ? ' · 변형 사례' : ''}`, brief: c.brief, questions: views },
    key: { track, questions: keys },
  };
}

/** (v10) 학술 포스터 보드 참고 카드 — 문항지 첫 문항의 판단 규칙(정답 보기를 직접 알려 주지 않는 검토된 규칙 한 줄). */
export function croReferenceCard(sheet: CroSheetView): { questionId: string; rule: string } | null {
  const q = sheet.questions.find((x) => x.role === 'main');
  if (!q || q.type === 'EV') return null;
  return { questionId: q.id, rule: RULES[q.type].right };
}

// ─────────────────────────────── 채점 · 보상 ───────────────────────────────

/** 답안 형식 검사 — 문항 id → 보기 id 목록. 모르는 문항 · 보기는 무시하지 않고 거절한다. */
export function parseCroAnswers(sheet: CroSheetView, raw: unknown): Record<string, string[]> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [qid, value] of Object.entries(r)) {
    const q = sheet.questions.find((x) => x.id === qid);
    if (!q || !Array.isArray(value) || value.length > q.choices.length) return null;
    const ids = new Set<string>();
    for (const v of value) {
      if (typeof v !== 'string' || !q.choices.some((c) => c.id === v)) return null;
      ids.add(v);
    }
    if (!q.multi && ids.size > 1) return null;
    out[qid] = [...ids].sort();
  }
  return out;
}

/** 이 답안의 보상(센트, 상한 적용 전) — 설계서 §1.3. */
export function croRewardCents(track: CroTrack, mainCorrect: number, evidenceCorrect: boolean): number {
  if (track === 'general') {
    const base = mainCorrect >= 3 ? CRO_REWARD_CENTS.general.full : mainCorrect === 2 ? CRO_REWARD_CENTS.general.partial : 0;
    return base > 0 && evidenceCorrect ? base + CRO_REWARD_CENTS.general.bonus : base;
  }
  return mainCorrect >= 3 ? CRO_REWARD_CENTS.deep.base + (evidenceCorrect ? CRO_REWARD_CENTS.deep.bonus : 0) : 0;
}

/** 의뢰 하나의 최대 보상(센트). */
export function croMaxCents(track: CroTrack): number {
  return track === 'general' ? CRO_REWARD_CENTS.general.full + CRO_REWARD_CENTS.general.bonus : CRO_REWARD_CENTS.deep.base + CRO_REWARD_CENTS.deep.bonus;
}

export function gradeCro(key: CroSheetKey, variant: 0 | 1, answers: Record<string, string[]>): CroAttemptView {
  const correct: Record<string, boolean> = {};
  const explanations: Record<string, string> = {};
  let mainCorrect = 0;
  let evidenceCorrect = false;
  for (const q of key.questions) {
    const picked = answers[q.id] ?? [];
    const ok = picked.length === q.correct.length && q.correct.every((c) => picked.includes(c));
    correct[q.id] = ok;
    explanations[q.id] = q.explanation;
    if (q.role === 'main' && ok) mainCorrect += 1;
    if (q.role === 'evidence') evidenceCorrect = ok;
  }
  return { variant, correct, mainCorrect, evidenceCorrect, rewardCents: croRewardCents(key.track, mainCorrect, evidenceCorrect), explanations };
}

/** 만점(최대 보상)인가 — 아니면 변형 문항 재도전 · 지금 정산을 고른다. */
export function croPerfect(track: CroTrack, attempt: CroAttemptView): boolean {
  return attempt.rewardCents >= croMaxCents(track);
}

/** 상한 적용 — 차시 · 계보 남은 만큼. */
export function croPayoutCents(rewardCents: number, used: { sessionPaidCents: number; campaignPaidCents: number }): { payCents: number; cappedCents: number } {
  const room = Math.max(0, Math.min(CRO_LIMITS.sessionCapCents - used.sessionPaidCents, CRO_LIMITS.campaignCapCents - used.campaignPaidCents));
  const payCents = Math.max(0, Math.min(Math.floor(rewardCents), room));
  return { payCents, cappedCents: Math.max(0, Math.floor(rewardCents) - payCents) };
}

/** 게임 연도(0부터) — 360게임 일마다. */
export function croGameYear(gameDays: number): number {
  return Math.max(0, Math.floor(gameDays / CRO_LIMITS.gameDaysPerYear));
}

/** 그 트랙의 연도 상한. */
export function croYearMax(track: CroTrack): number {
  return track === 'general' ? CRO_LIMITS.generalPerYear : CRO_LIMITS.deepPerYear;
}
