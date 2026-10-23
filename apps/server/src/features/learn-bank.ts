/**
 * 학습 연구비 문항 은행(learning-grant-design §3.1 · 3판 번호) — 기능 FLEARN. **서버만** 든다(정답 · 루브릭 · 모범 개요가 화면 묶음에 실리지 않게).
 *
 * - 단계 9개(1.1 ~ 4.2) × 개념 2 · 중급 1 · 심화 1 = 36문항. 3.2 = 동물실험 윤리(3R · 고통등급 · 인도적 종료시점) · 동물 수 딜레마,
 *   3.3 = 앞 판 '3.2 IND' 문항(제형 · 용량 · MRSD).
 * - 개념 문항은 시드 하나로 결정적이다(같은 (학생, 학급, 문항) = 같은 숫자 · 같은 보기 순서). 정답은 game-rules 순수 함수
 *   (`ro5Violations` · `propertySignals` · `affinityStrength`)로 정한다 — crista CRO 문제 은행(`gamification/cro.ts`)의 A3 · B1~B4 · C1 틀을 옮겼다.
 * - 중급 · 심화는 모둠 데이터(`LearnContext` — 별칭만, SMILES 원문 · 실명 없음)에 묶은 서술형이고 LLM 루브릭으로 채점한다.
 *   데이터가 아직 없으면 예시 값으로 묻고 `fallback` 에 무엇이 없었는지 적는다(진행은 막지 않는다).
 * - 이 파일의 문항 글은 학생에게 보이는 글이다(해요체 초안 — §5.12 에서 Gemini 4 Argon (High) 가 다듬는다). 바꾸면 `version` 을 올린다.
 */
import { affinityStrength, propertySignals, ro5Violations } from '@crista/game-rules';
import { DOCKING_TARGETS, type MoleculeProperties, type StructuralAlertId } from '@crista/shared-types';
import type { ConceptKey, LearnItemKind, LearnTier, PitchRound, StepId } from '@crista-web/web-contract';

// ── 모둠 데이터 바인딩(설계 §3.2) — 서버가 모둠 표에서 모은다. 별칭만 ──

export interface LearnContext {
  target?: { label: string; gene: string; disease: string; cns: boolean };
  screening?: { cutoff: string; before: number; after: number; claimed: number };
  docking?: Array<{ alias: string; deltaG: number; referenceKcal: number; hbond: number; pistack: number; hydrophobic: number }>;
  admet?: Array<{ alias: string; radar: Record<string, number>; signals: string[] }>;
  lead?: { alias: string; backupAlias?: string; signals: string[] };
  patent?: { code: string; rivals: string[] };
  ind?: { formulation: string; doseMg: number; endpoint: string };
  trial?: { phase: string; outcome: string; reason: string };
}

export type LearnRequire = keyof LearnContext;

/** 예시 값(모둠 데이터가 없을 때) — 교육용으로 지은 값이다. */
const EXAMPLE: Required<LearnContext> = {
  target: { label: '아세틸콜린에스테라아제', gene: 'ACHE', disease: '알츠하이머병', cns: true },
  screening: { cutoff: 'MW ≤ 500 · TPSA ≤ 90 · Ro5 위반 ≤ 1 · 구조 경고 제외', before: 220, after: 31, claimed: 6 },
  docking: [
    { alias: '후보 A', deltaG: -10.4, referenceKcal: -11.84, hbond: 2, pistack: 1, hydrophobic: 3 },
    { alias: '후보 B', deltaG: -9.1, referenceKcal: -11.84, hbond: 1, pistack: 0, hydrophobic: 4 },
  ],
  admet: [
    { alias: '후보 A', radar: { 'BBB 투과': 79, '간독성 안전': 84, 'hERG 안전': 41, '경구 흡수': 73 }, signals: ['hERG 주의'] },
    { alias: '후보 B', radar: { 'BBB 투과': 62, '간독성 안전': 88, 'hERG 안전': 77, '경구 흡수': 81 }, signals: [] },
  ],
  lead: { alias: '후보 A', backupAlias: '후보 B', signals: ['hERG 위험 보통', '간독성 낮음'] },
  patent: { code: 'SEUM-102', rivals: ['DAON'] },
  ind: { formulation: '경구', doseMg: 50, endpoint: '24주 인지 기능 점수(ADAS-Cog) 변화' },
  trial: { phase: '임상 2상', outcome: '보류', reason: '효능 부족 — 위약과 차이가 작아요' },
};

/** 바인딩 — 모둠 값이 없으면 예시 값과 '무엇이 없었나'. */
function bind<K extends LearnRequire>(ctx: LearnContext, key: K, missing: string[]): NonNullable<LearnContext[K]> {
  const v = ctx[key];
  const empty = v === undefined || (Array.isArray(v) && v.length === 0);
  if (empty) {
    missing.push(key);
    return EXAMPLE[key] as NonNullable<LearnContext[K]>;
  }
  return v as NonNullable<LearnContext[K]>;
}

// ── 결정적 난수(crista cro.ts 와 같은 꼴) ──

export function hash32(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  real(min: number, max: number, digits: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function rngOf(seed: number | string): Rng {
  let a = hash32(`crista-web-learn:${seed}`);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
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
}

/** 변형 시드 = (학생, 학급, 문항) — 같은 모둠원끼리도 숫자 · 보기 순서가 다르다(설계 §3.2). 31비트 양수. */
export const variantSeed = (userId: string, classId: string, itemId: string): number => hash32(`${userId}|${classId}|${itemId}`) & 0x7fffffff;

// ── 문항 틀 ──

export interface RubricItem {
  id: string;
  weight: number;
  criterion: string;
  lookFor: string[];
}

export interface BuiltConcept {
  prompt: string;
  table?: { columns: string[]; rows: string[][] };
  choices?: Array<{ id: string; label: string }>;
  unit?: string;
  key: ConceptKey;
  explanation: string;
  hint: string;
}

interface ItemBase {
  id: string;
  stepId: StepId;
  tier: LearnTier;
  kind: LearnItemKind;
  /** 분야(교사 화면 묶음). */
  field: string;
  version: number;
  requires: LearnRequire[];
  /** DB learn_items.template — 사람이 읽는 틀(변형 전). */
  template: string;
}

export interface ConceptItem extends ItemBase {
  tier: 'concept';
  kind: 'mc' | 'multi' | 'numeric';
  build(rng: Rng): BuiltConcept;
}

export interface TextItem extends ItemBase {
  tier: 'intermediate' | 'advanced';
  kind: 'text';
  render(ctx: LearnContext): { text: string; fallback: string[] };
  rubric: RubricItem[];
  /** 모범 개요 — LLM 에만(학생에게 원문을 보이지 않는다). */
  outline: string[];
}

export type BankItem = ConceptItem | TextItem;

const CHOICE_IDS = ['a', 'b', 'c', 'd', 'e'] as const;

/** 보기 섞기 — 정답 여부를 함께 들고 섞은 뒤 id 를 붙인다. */
function choices(
  rng: Rng,
  options: Array<{ label: string; correct: boolean }>,
  keep = false,
): { choices: Array<{ id: string; label: string }>; correct: string[] } {
  const ordered = keep ? options : rng.shuffle(options);
  return {
    choices: ordered.map((o, i) => ({ id: CHOICE_IDS[i]!, label: o.label })),
    correct: ordered.flatMap((o, i) => (o.correct ? [CHOICE_IDS[i]!] : [])),
  };
}

function mc(rng: Rng, prompt: string, right: string, wrong: string[], explanation: string, hint: string, extra: Partial<BuiltConcept> = {}): BuiltConcept {
  const c = choices(rng, [{ label: right, correct: true }, ...wrong.map((label) => ({ label, correct: false }))]);
  return { prompt, choices: c.choices, key: { kind: 'mc', correct: c.correct[0]! }, explanation, hint, ...extra };
}

function molecule(over: Partial<MoleculeProperties>): MoleculeProperties {
  return {
    canonicalSmiles: 'C',
    flatSmiles: 'C',
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
    engine: 'learn-bank',
    ...over,
  };
}

const RISK_KO = { low: '낮음', moderate: '보통', high: '높음' } as const;
const BBB_KO = { high: '높음', moderate: '보통', low: '낮음' } as const;
const propsTable = (p: MoleculeProperties, cols: Array<keyof MoleculeProperties>) => ({
  columns: cols.map(
    (c) =>
      (({ mw: 'MW', clogp: 'cLogP', tpsa: 'TPSA', hbd: 'HBD', hba: 'HBA', basicAmines: '염기성 아민', alerts: '구조 경고' }) as Record<string, string>)[c] ??
      String(c),
  ),
  rows: [cols.map((c) => (c === 'alerts' ? (p.alerts.length ? p.alerts.map((a) => ALERT_KO[a]).join(' · ') : '없음') : String(p[c])))],
});
const ALERT_KO: Record<StructuralAlertId, string> = { aromatic_amine: '방향족 아민', nitro_aromatic: '방향족 니트로' };

// ── 개념 문항(규칙 채점 · 25,000) ──

const ASSOCIATION_CARDS = [
  '환자군에서 이 유전자 변이가 더 자주 보였다(OR 1.8 · p < 0.001)',
  '질환 조직에서 이 단백질 발현이 2.3배 높았다',
  '이 유전자와 질환을 함께 언급한 논문이 1,200편이다',
  '환자 혈액의 이 단백질 농도가 증상이 심할수록 높았다',
];
const FUNCTIONAL_CARDS = [
  '이 유전자를 끈(녹아웃) 쥐에서 질환 증상이 줄었다',
  'siRNA 로 이 단백질을 줄이자 세포의 질환 지표가 정상 쪽으로 돌아왔다',
  '이 효소를 막는 도구 화합물이 동물 모델에서 증상을 줄였다',
];

const CONCEPTS: ConceptItem[] = [
  {
    id: 'l11-c1',
    stepId: '1.1',
    tier: 'concept',
    kind: 'mc',
    field: 'target',
    version: 1,
    requires: [],
    template: 'Open Targets 근거 — 연관성과 기능 실험 근거 구별(A3)',
    build: (rng) =>
      mc(
        rng,
        '표적 후보를 검증하는 근거 가운데 「기능 실험」 근거는 어느 것인가요?',
        rng.pick(FUNCTIONAL_CARDS),
        rng.shuffle(ASSOCIATION_CARDS).slice(0, 3),
        '변이 빈도 · 발현량 · 논문 수 같은 연관성은 원인을 보여 주지 못해요. 표적을 끄거나 줄이거나 막았을 때 질환 지표가 바뀌는 기능 실험이 표적 검증 근거예요.',
        '「바꿔 봤더니 결과가 달라졌다」는 근거를 찾아요.',
      ),
  },
  {
    id: 'l11-c2',
    stepId: '1.1',
    tier: 'concept',
    kind: 'mc',
    field: 'target',
    version: 1,
    requires: [],
    template: 'First-in-class 와 Best-in-class',
    build: (rng) => {
      const first = rng.next() < 0.5;
      return mc(
        rng,
        first
          ? '유전 근거는 높지만 승인된 약이 아직 하나도 없는 새 표적을 처음으로 겨냥한 신약을 무엇이라 부르나요?'
          : '이미 승인된 약이 있는 검증된 표적에서, 기존 약보다 더 낫게 만들려는 신약을 무엇이라 부르나요?',
        first ? 'First-in-class(계열 첫 약)' : 'Best-in-class(계열 최고 약)',
        [first ? 'Best-in-class(계열 최고 약)' : 'First-in-class(계열 첫 약)', '바이오시밀러(복제 바이오 의약품)', '제네릭(특허 끝난 약의 복제약)'],
        'First-in-class 는 새 작용 기전을 처음 여는 약이라 성공하면 보상이 크지만 표적 자체가 틀릴 위험이 커요. Best-in-class 는 검증된 표적이라 위험이 작지만 기존 약보다 뚜렷이 나아야 해요.',
        '승인 약물 근거가 0 인지, 이미 있는지를 봐요.',
      );
    },
  },
  {
    id: 'l12-c1',
    stepId: '1.2',
    tier: 'concept',
    kind: 'numeric',
    field: 'screening',
    version: 1,
    requires: [],
    template: 'Lipinski Ro5 위반 수 세기(B1)',
    build: (rng) => {
      // 경계값(= 500 · 5 · 5 · 10)이 가끔 나오게 — '같으면 위반 아님'을 겪게.
      const edge = rng.next() < 0.35;
      const p = molecule({
        mw: edge ? 500 : rng.real(320, 620, 1),
        clogp: rng.real(1.2, 6.4, 2),
        hbd: edge ? 5 : rng.int(0, 7),
        hba: rng.int(3, 13),
      });
      const v = ro5Violations(p);
      return {
        prompt: '아래 분자의 Lipinski Ro5 위반 수는 몇 개인가요?',
        table: propsTable(p, ['mw', 'clogp', 'hbd', 'hba']),
        unit: '개',
        key: { kind: 'numeric', value: v, tolerance: 0 },
        explanation: `Ro5 위반은 MW > 500 · cLogP > 5 · HBD > 5 · HBA > 10 을 하나씩 세요(경계값과 같으면 위반이 아니에요). 이 분자는 ${v}개예요.`,
        hint: '기준 넷(MW 500 · cLogP 5 · HBD 5 · HBA 10)을 「넘는지」 하나씩 봐요.',
      };
    },
  },
  {
    id: 'l12-c2',
    stepId: '1.2',
    tier: 'concept',
    kind: 'mc',
    field: 'screening',
    version: 1,
    requires: [],
    template: 'TPSA · MW · HBD 로 BBB 투과 예측(B2)',
    build: (rng) => {
      const band = rng.pick(['high', 'moderate', 'low'] as const);
      const p =
        band === 'high'
          ? molecule({ tpsa: rng.real(40, 88, 1), mw: rng.real(260, 440, 1), hbd: rng.int(0, 2) })
          : band === 'moderate'
            ? molecule({ tpsa: rng.real(95, 118, 1), mw: rng.real(300, 490, 1), hbd: rng.int(1, 3) })
            : molecule({ tpsa: rng.real(125, 160, 1), mw: rng.real(380, 560, 1), hbd: rng.int(2, 5) });
      const bbb = propertySignals(p).bbb;
      const c = choices(
        rng,
        (['high', 'moderate', 'low'] as const).map((b) => ({ label: `뇌 투과(BBB) ${BBB_KO[b]}`, correct: b === bbb })),
        true,
      );
      return {
        prompt: '아래 분자는 혈액-뇌 장벽(BBB)을 얼마나 잘 넘을까요? (교육용 규칙 기준)',
        table: propsTable(p, ['tpsa', 'mw', 'hbd']),
        choices: c.choices,
        key: { kind: 'mc', correct: c.correct[0]! },
        explanation: `BBB 높음 = TPSA ≤ 90 · MW ≤ 450 · HBD ≤ 3, 보통 = TPSA ≤ 120 · MW ≤ 500, 그 밖은 낮음이에요. 이 분자는 ${BBB_KO[bbb]}이에요.`,
        hint: '극성 표면적(TPSA)이 90 을 넘는지부터 봐요.',
      };
    },
  },
  {
    id: 'l21-c1',
    stepId: '2.1',
    tier: 'concept',
    kind: 'numeric',
    field: 'docking',
    version: 1,
    requires: [],
    template: '결합력 p 식(C1) — p = (ΔG_ref + 4.5 − ΔG) / 5',
    build: (rng) => {
      const target = rng.pick(DOCKING_TARGETS);
      const ref = target.referenceKcal;
      const dg = Math.round((ref + rng.real(0.4, 4.8, 1)) * 10) / 10;
      const p = Math.round(affinityStrength(dg, ref) * 100) / 100;
      return {
        prompt: `${target.label}(${target.gene}) 표적의 기준 리간드 ΔG_ref 는 ${ref} kcal/mol 이에요. 우리 후보의 ΔG 가 ${dg} kcal/mol 일 때 결합력 p 는 얼마인가요? (p = (ΔG_ref + 4.5 − ΔG) ÷ 5, 0~1 로 자름 · 소수 둘째 자리)`,
        unit: 'p',
        key: { kind: 'numeric', value: p, tolerance: 0.02 },
        explanation: `p = (${ref} + 4.5 − (${dg})) ÷ 5 = ${p.toFixed(2)} 이에요. ΔG 가 더 음수일수록(더 단단히 붙을수록) p 가 커지고, 기준 리간드는 p = 0.9 자리에 놓여요.`,
        hint: 'ΔG 가 음수라서 「− ΔG」 는 더하기가 돼요.',
      };
    },
  },
  {
    id: 'l21-c2',
    stepId: '2.1',
    tier: 'concept',
    kind: 'mc',
    field: 'docking',
    version: 1,
    requires: [],
    template: 'ΔG 부호와 10배 계단(약 1.4 kcal/mol)',
    build: (rng) => {
      const base = rng.real(-10.5, -8.0, 1);
      const steps = rng.pick([1, 2] as const);
      const diff = 1.4 * steps;
      const xStronger = rng.next() < 0.5;
      const x = xStronger ? Math.round((base - diff) * 10) / 10 : base;
      const y = xStronger ? base : Math.round((base - diff) * 10) / 10;
      const fold = steps === 1 ? '약 10배' : '약 100배';
      const wrongFold = steps === 1 ? '약 1.4배' : '약 2.8배';
      const strong = xStronger ? '후보 X' : '후보 Y';
      const weak = xStronger ? '후보 Y' : '후보 X';
      return mc(
        rng,
        `후보 X 의 ΔG 는 ${x} kcal/mol, 후보 Y 는 ${y} kcal/mol 이에요. 어느 쪽이 표적에 더 단단히 붙고, 결합 세기 차이는 대략 얼마일까요? (상온에서 ΔG 가 약 1.4 kcal/mol 낮아질 때마다 결합 세기가 약 10배)`,
        `${strong}가 ${fold} 더 단단히 붙어요`,
        [`${weak}가 ${fold} 더 단단히 붙어요`, `${strong}가 ${wrongFold} 더 단단히 붙어요`, '두 후보의 결합 세기는 같아요'],
        `ΔG 가 더 음수인 쪽이 더 단단히 붙어요. ${diff.toFixed(1)} kcal/mol 차이는 10배 계단 ${steps}칸이라 ${fold}예요.`,
        '「더 음수」가 더 안정해요. 1.4 kcal/mol 마다 10배씩 곱해요.',
      );
    },
  },
  {
    id: 'l22-c1',
    stepId: '2.2',
    tier: 'concept',
    kind: 'mc',
    field: 'admet',
    version: 1,
    requires: [],
    template: 'hERG 심장독성 위험(B3) — 염기성 아민 · cLogP',
    build: (rng) => {
      const band = rng.pick(['high', 'moderate', 'low'] as const);
      const p =
        band === 'high'
          ? molecule({ basicAmines: rng.int(1, 2), clogp: rng.real(3.8, 5.2, 2) })
          : band === 'moderate'
            ? molecule({ basicAmines: 1, clogp: rng.real(2.6, 3.6, 2) })
            : rng.next() < 0.5
              ? molecule({ basicAmines: 0, clogp: rng.real(3.0, 5.0, 2) })
              : molecule({ basicAmines: 1, clogp: rng.real(0.8, 2.3, 2) });
      const herg = propertySignals(p).herg;
      const c = choices(
        rng,
        (['high', 'moderate', 'low'] as const).map((r) => ({ label: `hERG 위험 ${RISK_KO[r]}`, correct: r === herg })),
        true,
      );
      return {
        prompt: '아래 분자의 hERG(심장 칼륨 통로) 차단 위험은 어느 정도일까요? (교육용 규칙 기준)',
        table: propsTable(p, ['basicAmines', 'clogp']),
        choices: c.choices,
        key: { kind: 'mc', correct: c.correct[0]! },
        explanation: `염기성 아민이 있고 cLogP ≥ 3.7 이면 높음, 염기성 아민이 있고 cLogP ≥ 2.5 이면 보통, 그 밖은 낮음이에요. 이 분자는 ${RISK_KO[herg]}이에요.`,
        hint: '염기성 아민이 있는지 먼저 보고, 그다음 지용성(cLogP)을 봐요.',
      };
    },
  },
  {
    id: 'l22-c2',
    stepId: '2.2',
    tier: 'concept',
    kind: 'mc',
    field: 'admet',
    version: 1,
    requires: [],
    template: '간독성 구조 경고(B4)',
    build: (rng) => {
      const band = rng.pick(['high', 'moderate', 'low'] as const);
      const p =
        band === 'high'
          ? molecule({ alerts: [rng.pick(['aromatic_amine', 'nitro_aromatic'] as const)], clogp: rng.real(1.5, 4.5, 2), tpsa: rng.real(50, 110, 1) })
          : band === 'moderate'
            ? molecule({ alerts: [], clogp: rng.real(3.2, 5.0, 2), tpsa: rng.real(40, 72, 1) })
            : molecule({ alerts: [], clogp: rng.real(1.0, 2.9, 2), tpsa: rng.real(60, 120, 1) });
      const liver = propertySignals(p).hepatotoxicity;
      const c = choices(
        rng,
        (['high', 'moderate', 'low'] as const).map((r) => ({ label: `간독성 위험 ${RISK_KO[r]}`, correct: r === liver })),
        true,
      );
      return {
        prompt: '아래 분자의 간독성 위험은 어느 정도일까요? (교육용 규칙 기준)',
        table: propsTable(p, ['alerts', 'clogp', 'tpsa']),
        choices: c.choices,
        key: { kind: 'mc', correct: c.correct[0]! },
        explanation: `방향족 아민 · 방향족 니트로 같은 구조 경고가 있으면 높음, 없더라도 cLogP > 3 이면서 TPSA < 75 이면 보통, 그 밖은 낮음이에요. 이 분자는 ${RISK_KO[liver]}이에요.`,
        hint: '구조 경고 칸부터 봐요.',
      };
    },
  },
  {
    id: 'l31-c1',
    stepId: '3.1',
    tier: 'concept',
    kind: 'mc',
    field: 'patent',
    version: 1,
    requires: [],
    template: '물질특허와 용도특허',
    build: (rng) => {
      const substance = rng.next() < 0.5;
      return mc(
        rng,
        substance
          ? '새로 만든 분자의 구조 자체를 보호해서, 누가 어떤 용도로 만들든 막을 수 있는 특허는 무엇인가요?'
          : '이미 알려진 물질을 새로운 질환 치료에 쓰는 방법을 보호하는 특허는 무엇인가요?',
        substance ? '물질특허' : '용도특허',
        [substance ? '용도특허' : '물질특허', '제법특허(만드는 방법)', '제형특허(알약 · 패치 같은 모양)'],
        '물질특허는 분자 구조 자체를 보호해 가장 넓고 강해요. 용도특허는 이미 알려진 물질의 새 쓰임새만 보호해요.',
        '「무엇」을 보호하는지 — 분자 자체인지, 쓰는 방법인지 봐요.',
      );
    },
  },
  {
    id: 'l31-c2',
    stepId: '3.1',
    tier: 'concept',
    kind: 'mc',
    field: 'patent',
    version: 1,
    requires: [],
    template: '평면 SMILES 학급 선착순',
    build: (rng) => {
      const salt = rng.next() < 0.5;
      return mc(
        rng,
        salt
          ? '다른 모둠이 이미 등록한 분자에 염(·HCl)만 붙여 출원했어요. 이 학급 특허 규칙에서 우리 출원은 어떻게 될까요?'
          : '다른 모둠이 이미 등록한 분자와 원자 연결은 같고 입체 표시(@ · / · \\)만 다른 분자를 출원했어요. 이 학급 특허 규칙에서 우리 출원은 어떻게 될까요?',
        '같은 물질로 보고 거절돼요 — 먼저 등록한 모둠이 가져요',
        ['다른 물질이라 새로 등록돼요', '두 모둠이 함께 등록돼요', '나중에 낸 쪽이 우선이에요'],
        '학급 특허는 입체 정보를 빼고 가장 큰 조각만 남긴 평면 SMILES 로 같은 물질인지 봐요. 그래서 입체만 다르거나 염만 붙은 분자는 같은 물질이고, 먼저 등록한 모둠이 가져요.',
        '특허 판정 단위는 입체 정보 · 염을 뺀 「평면 SMILES」예요.',
      );
    },
  },
  {
    id: 'l32-c1',
    stepId: '3.2',
    tier: 'concept',
    kind: 'mc',
    field: 'ethics',
    version: 1,
    requires: [],
    template: '동물실험 윤리 — 사례를 3R(대체 · 감소 · 개선)로 나누기',
    build: (rng) => {
      const cases: Array<[string, 'r' | 'd' | 'f']> = [
        ['심장 독성(hERG)을 동물 대신 세포 패치클램프로 먼저 쟀다', 'r'],
        ['컴퓨터 모델과 간 오가노이드로 독성이 큰 후보를 미리 걸렀다', 'r'],
        ['통계적으로 믿을 수 있는 최소 마릿수를 계산해 군당 마릿수를 정했다', 'd'],
        ['반복투여 독성 시험 군에 심장 · 호흡 측정을 함께 붙여 따로 동물을 쓰지 않았다', 'd'],
        ['수술 뒤 진통제를 주고 사육장에 은신처와 둥지 재료를 넣었다', 'f'],
        ['정상 체중의 20% 가 줄면 실험을 끝내는 기준을 미리 정했다', 'f'],
      ];
      const [text, kind] = rng.pick(cases);
      const label = { r: '대체(Replacement)', d: '감소(Reduction)', f: '개선(Refinement)' } as const;
      const c = choices(
        rng,
        (['r', 'd', 'f'] as const).map((k) => ({ label: label[k], correct: k === kind })),
        true,
      );
      return {
        prompt: `「${text}」 — 이 사례는 3R 가운데 어디에 해당하나요?`,
        choices: c.choices,
        key: { kind: 'mc', correct: c.correct[0]! },
        explanation:
          '대체는 동물 없이 답할 수 있으면 그 방법을 먼저 쓰는 것, 감소는 믿을 만한 결과를 얻는 최소 마릿수, 개선은 마취 · 진통 · 사육 환경 · 인도적 종료시점으로 고통을 줄이는 것이에요(Russell · Burch 1959 · 동물보호법 제47조).',
        hint: '동물을 「안 쓰나 · 덜 쓰나 · 덜 아프게 하나」를 봐요.',
      };
    },
  },
  {
    id: 'l32-c2',
    stepId: '3.2',
    tier: 'concept',
    kind: 'mc',
    field: 'ethics',
    version: 1,
    requires: [],
    template: '동물실험 윤리 — 고통등급 A~E · 인도적 종료시점',
    build: (rng) => {
      if (rng.next() < 0.5) {
        const cases: Array<[string, 'A' | 'B' | 'C' | 'D' | 'E']> = [
          ['초파리(무척추동물)의 행동을 관찰한다', 'A'],
          ['생쥐를 만지지 않고 사육장 안 행동만 관찰한다', 'B'],
          ['랫드 꼬리 정맥에서 짧게 채혈한다', 'C'],
          ['마취 · 진통제를 쓰면서 종양을 이식한 누드마우스 모델을 쓴다', 'D'],
          ['진통제를 쓰면 결과가 망가지는 통증 실험을 한다(원칙적으로 허용되지 않음)', 'E'],
        ];
        const [text, grade] = rng.pick(cases);
        const label = {
          A: 'A — 생물개체를 쓰지 않거나 무척추동물',
          B: 'B — 척추동물이지만 거의 고통 없음',
          C: 'C — 약간의 스트레스나 짧은 작은 통증',
          D: 'D — 피할 수 없는 고통, 진정 · 진통 · 마취제를 씀',
          E: 'E — 피할 수 없는 고통, 약을 쓰면 결과가 망가짐',
        } as const;
        const c = choices(
          rng,
          (['A', 'B', 'C', 'D', 'E'] as const).map((g) => ({ label: label[g], correct: g === grade })),
          true,
        );
        return {
          prompt: `「${text}」 — 이 실험의 고통등급은 무엇인가요?`,
          choices: c.choices,
          key: { kind: 'mc', correct: c.correct[0]! },
          explanation: 'D 등급은 고통 경감 조치가 반드시, E 등급은 경감할 수 없는 분명한 사유가 있어야 해요(IACUC 표준운영가이드라인).',
          hint: '척추동물인가 · 통증이 있나 · 진통제를 쓸 수 있나 순서로 봐요.',
        };
      }
      return mc(
        rng,
        '질환 모델 동물실험에서 「인도적 종료시점」으로 미리 정해 둘 기준으로 알맞은 것은 무엇인가요?',
        rng.pick(['정상 체중의 20% 이상 감소', '종양이 체중의 10% 를 넘음', '먹지 못하거나 마비가 옴']),
        ['동물이 움직이지 못해도 예정한 날까지 결과를 모은다', '종양이 체중의 30% 가 될 때까지 기다린다', '먹지 못해도 자료가 나올 때까지 계속한다'],
        '인도적 종료시점은 미리 정한 기준에 닿으면 실험을 끝내는 약속이에요 — 예: 정상 체중 20% 이상 감소 · 종양이 체중의 10% 초과 · 먹지 못함 · 마비.',
        '동물의 고통을 「끝까지 두지 않는」 기준을 골라요.',
      );
    },
  },
  {
    id: 'l33-c1',
    stepId: '3.3',
    tier: 'concept',
    kind: 'numeric',
    field: 'ind',
    version: 1,
    requires: [],
    template: 'NOAEL → HED → MRSD(FDA 2005 지침)',
    build: (rng) => {
      const rat = rng.int(12, 90);
      const dog = rng.int(4, 40);
      const hedRat = rat / 6.2;
      const hedDog = dog / 1.8;
      const hed = Math.min(hedRat, hedDog);
      const sf = rng.next() < 0.75 ? 10 : 20;
      const mrsd = Math.round((hed / sf) * 60 * 10) / 10;
      return {
        prompt: `28일 반복투여 독성 시험에서 랫드 NOAEL 은 ${rat} mg/kg/일, 비글견 NOAEL 은 ${dog} mg/kg/일이에요. 안전계수 ${sf}, 사람 체중 60 kg 일 때 최대 권장 시작 용량(MRSD)은 몇 mg 인가요? (HED = NOAEL ÷ 환산 계수(랫드 6.2 · 개 1.8) → 두 종 중 낮은 HED → MRSD = HED ÷ 안전계수 × 60)`,
        unit: 'mg',
        key: { kind: 'numeric', value: mrsd, tolerance: Math.max(0.5, Math.round(mrsd * 0.03 * 10) / 10) },
        explanation: `HED 랫드 ${hedRat.toFixed(2)} · 개 ${hedDog.toFixed(2)} mg/kg → 더 민감한 종의 ${hed.toFixed(2)} mg/kg ÷ ${sf} × 60 = 약 ${mrsd} mg 이에요.`,
        hint: '두 종 HED 를 모두 구하고 「더 낮은 쪽」(가장 민감한 종)을 써요.',
      };
    },
  },
  {
    id: 'l33-c2',
    stepId: '3.3',
    tier: 'concept',
    kind: 'mc',
    field: 'ind',
    version: 1,
    requires: [],
    template: '제형 — 경피 패치에 맞는 물성',
    build: (rng) => {
      const kind = rng.pick(['ok', 'big', 'polar', 'greasy'] as const);
      const p =
        kind === 'ok'
          ? molecule({ mw: rng.real(220, 480, 1), clogp: rng.real(1.3, 3.8, 2) })
          : kind === 'big'
            ? molecule({ mw: rng.real(520, 640, 1), clogp: rng.real(1.5, 3.5, 2) })
            : kind === 'polar'
              ? molecule({ mw: rng.real(220, 450, 1), clogp: rng.real(-1.0, 0.8, 2) })
              : molecule({ mw: rng.real(220, 450, 1), clogp: rng.real(4.3, 6.0, 2) });
      const suitable = propertySignals(p).transdermal === 'suitable';
      const options = [
        { label: '맞아요 — MW ≤ 500 이고 cLogP 1~4 예요', correct: suitable && kind === 'ok' },
        { label: '안 맞아요 — 분자가 너무 커요(MW > 500)', correct: kind === 'big' },
        { label: '안 맞아요 — 물을 너무 좋아해요(cLogP < 1)', correct: kind === 'polar' },
        { label: '안 맞아요 — 기름을 너무 좋아해요(cLogP > 4)', correct: kind === 'greasy' },
      ];
      const c = choices(rng, options, true);
      return {
        prompt: '아래 분자를 피부에 붙이는 경피 패치로 만들 수 있을까요? (교육용 규칙 기준)',
        table: propsTable(p, ['mw', 'clogp']),
        choices: c.choices,
        key: { kind: 'mc', correct: c.correct[0]! },
        explanation:
          '경피 흡수는 작고(MW ≤ 500) 적당히 기름을 좋아하는(cLogP 1~4) 분자에 맞아요. 너무 크거나 물 · 기름 한쪽으로 치우치면 피부를 잘 통과하지 못해요.',
        hint: 'MW 500 과 cLogP 1~4 두 가지만 봐요.',
      };
    },
  },
  {
    id: 'l41-c1',
    stepId: '4.1',
    tier: 'concept',
    kind: 'mc',
    field: 'trial',
    version: 1,
    requires: [],
    template: '임상 1 · 2 · 3상의 목적',
    build: (rng) => {
      const phase = rng.pick(['1상', '2상', '3상'] as const);
      const purpose = {
        '1상': '사람에서 안전성과 견딜 수 있는 용량을 본다',
        '2상': '적은 환자에서 효과 신호와 알맞은 용량을 찾는다',
        '3상': '많은 환자에서 효과와 안전성을 확증한다',
      } as const;
      const wrong = (['1상', '2상', '3상'] as const).filter((p) => p !== phase).map((p) => purpose[p]);
      return mc(
        rng,
        `임상 ${phase}의 주된 목적은 무엇인가요?`,
        purpose[phase],
        [...wrong, '허가 뒤 많은 사람이 쓰며 드문 부작용을 찾는다'],
        '1상은 안전 · 용량, 2상은 효능 신호 · 용량 찾기, 3상은 많은 환자에서 확증이에요. 2상이 효능 부족으로 가장 많이 보류돼요.',
        '상이 올라갈수록 환자 수가 늘고 「확증」에 가까워져요.',
      );
    },
  },
  {
    id: 'l41-c2',
    stepId: '4.1',
    tier: 'concept',
    kind: 'multi',
    field: 'trial',
    version: 1,
    requires: [],
    template: '임상 보류(CRL) 뒤 재도전 경로 — 모두 고르기',
    build: (rng) => {
      const c = choices(rng, [
        { label: '용량을 바꿔 다시 설계한다', correct: true },
        { label: '제형(경구 · 정맥 · 경피)을 바꾼다', correct: true },
        { label: '백업 후보로 바꿔 다시 시작한다', correct: true },
        { label: '결과 자료의 숫자를 고쳐 다시 낸다', correct: false },
        { label: '심사관에게 통과시켜 달라고 요청한다', correct: false },
      ]);
      return {
        prompt: '임상시험이 보류(CRL)됐어요. 다시 도전하는 정당한 경로를 모두 골라 주세요.',
        choices: c.choices,
        key: { kind: 'multi', correct: c.correct },
        explanation:
          '재도전은 용량 변경 · 제형 변경 · 백업 후보 교체처럼 실패 원인을 고치는 설계 변경으로만 해요. 자료를 고치거나 판정을 부탁하는 것은 연구 부정이에요.',
        hint: '「실험 설계」를 바꾸는 것만 골라요.',
      };
    },
  },
  {
    id: 'l42-c1',
    stepId: '4.2',
    tier: 'concept',
    kind: 'mc',
    field: 'approval',
    version: 1,
    requires: [],
    template: '시판 후 조사(PMS · 4상)',
    build: (rng) =>
      mc(
        rng,
        '허가를 받은 뒤 많은 환자가 실제로 약을 쓰면서 드물게 생기는 부작용을 찾는 단계는 무엇인가요?',
        '시판 후 조사(PMS · 임상 4상)',
        ['임상 1상', '임상 3상', '전임상 동물실험'],
        '임상시험은 수백~수천 명이라 1만 명에 1명꼴 부작용은 놓칠 수 있어요. 그래서 허가 뒤 시판 후 조사로 계속 지켜봐요.',
        '「허가 뒤」에 하는 일을 골라요.',
      ),
  },
  {
    id: 'l42-c2',
    stepId: '4.2',
    tier: 'concept',
    kind: 'mc',
    field: 'approval',
    version: 1,
    requires: [],
    template: '블랙박스(박스) 경고 라벨',
    build: (rng) =>
      mc(
        rng,
        '약 설명서 맨 앞 테두리 상자 안에, 심각하거나 생명을 위협할 수 있는 위험을 따로 적는 경고를 무엇이라 하나요?',
        '블랙박스 경고(박스 경고)',
        ['일반 주의사항', '복약 안내문', '효능 · 효과 칸'],
        '블랙박스 경고는 FDA 가 요구하는 가장 강한 라벨 경고예요. 위험을 알리고 처방을 제한하는 방법이라, 약을 시장에서 빼는 것보다 먼저 검토돼요.',
        '가장 「강한」 라벨 경고를 골라요.',
      ),
  },
];

// ── 중급 · 심화(LLM 루브릭) ──

const r = (id: string, weight: number, criterion: string, lookFor: string[]): RubricItem => ({ id, weight, criterion, lookFor });
const cnsWord = (cns: boolean) => (cns ? '중추신경계(뇌)' : '말초');
const list = (items: string[]) => (items.length ? items.join(' · ') : '없음');

const TEXTS: TextItem[] = [
  // 1.1
  {
    id: 'l11-i',
    stepId: '1.1',
    tier: 'intermediate',
    kind: 'text',
    field: 'target',
    version: 1,
    requires: ['target'],
    template: '우리 표적 {target} — 가장 약한 근거와 그래도 고른 이유',
    render: (ctx) => {
      const miss: string[] = [];
      const t = bind(ctx, 'target', miss);
      return {
        text: `우리 모둠이 고른 표적은 ${t.disease}의 ${t.label}(${t.gene})예요. 1.1 화면의 Open Targets 근거 4종(유전 · 문헌 · 약물 · 발현) 가운데 이 표적에서 가장 약한 근거는 무엇이었나요? 그래도 이 표적을 고른 이유를 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('weakest', 1, '가장 약한 근거 종류를 하나 짚고 그 뜻을 설명한다', ['유전', '문헌', '약물', '발현', '근거 점수']),
      r('reason', 1, '다른 근거나 결정구조 준비 같은 이유로 선택을 정당화한다', ['결정구조', '도킹', '약물 근거', '검증']),
      r('risk', 1, '약한 근거 때문에 생길 위험을 인정한다', ['위험', '불확실', '실패']),
    ],
    outline: ['약한 근거 종류와 의미', '보완하는 다른 근거 · 결정구조 준비', '그 약점이 가져올 위험과 대비'],
  },
  {
    id: 'l11-a',
    stepId: '1.1',
    tier: 'advanced',
    kind: 'text',
    field: 'target',
    version: 1,
    requires: [],
    template: 'First-in-class vs Best-in-class — 초기 바이오벤처의 선택',
    render: () => ({
      text: '유전 근거는 높지만 승인된 약물이 하나도 없는 새 표적(First-in-class)과, 약물 근거가 높은 검증된 표적(Best-in-class) 가운데 초기 바이오벤처는 무엇을 골라야 할까요? 위험과 보상 관점에서 논해 주세요.',
      fallback: [],
    }),
    rubric: [
      r('define', 1, '두 전략의 차이를 바르게 설명한다', ['새 기전', '검증된 표적', '기존 약']),
      r('first', 1, 'First-in-class 의 위험(표적 검증 실패)과 보상(시장 독점)을 든다', ['검증 실패', '독점', '보상']),
      r('best', 1, 'Best-in-class 의 위험(차별화 · 경쟁)과 장점(낮은 표적 위험)을 든다', ['경쟁', '차별화', '안전']),
      r('choice', 1, '조건을 붙여 하나를 고르거나 균형안을 낸다', ['자금', '시간', '조건']),
      r('startup', 1, '초기 벤처의 자금 · 시간 제약과 연결한다', ['연구비', '투자', '시간']),
    ],
    outline: [
      'First-in-class: 새 기전 · 표적 검증 위험 크고 성공 보상 큼',
      'Best-in-class: 검증 표적 · 경쟁 속 차별화 필요',
      '벤처는 자금 · 시간 제약 — 조건부 선택',
    ],
  },
  // 1.2
  {
    id: 'l12-i',
    stepId: '1.2',
    tier: 'intermediate',
    kind: 'text',
    field: 'screening',
    version: 1,
    requires: ['screening', 'target'],
    template: '컷오프 {cutoff} 로 {n0} → {n1} — 타당한가, 무엇을 바꾸나',
    render: (ctx) => {
      const miss: string[] = [];
      const s = bind(ctx, 'screening', miss);
      const t = bind(ctx, 'target', miss);
      return {
        text: `우리 모둠은 컷오프 「${s.cutoff}」 로 ${s.before}종에서 ${s.after}종을 남겼어요. ${t.label}(${t.gene})는 ${cnsWord(t.cns)} 표적이에요. 이 컷오프가 타당한가요? 하나를 바꾼다면 무엇을, 왜 바꾸겠어요?`,
        fallback: miss,
      };
    },
    rubric: [
      r('judge', 1, '컷오프가 타당한지 판단을 분명히 한다', ['타당', '엄격', '느슨']),
      r('target', 1, '표적의 특성(CNS 여부 → TPSA · BBB)과 컷오프를 잇는다', ['TPSA', 'BBB', '뇌', '중추']),
      r('change', 1, '바꿀 기준 하나와 그 값을 구체적으로 낸다', ['MW', 'TPSA', 'Ro5', 'QED', '구조 경고']),
      r('tradeoff', 1, '바꿨을 때 잃는 것과 얻는 것을 함께 본다', ['놓침', '후보 수', '위양성', '위음성']),
    ],
    outline: ['남은 수가 도킹 · 예산에 맞는지', 'CNS 표적이면 TPSA ≤ 90 등 뇌 투과 기준', '바꿀 기준과 그 대가'],
  },
  {
    id: 'l12-a',
    stepId: '1.2',
    tier: 'advanced',
    kind: 'text',
    field: 'screening',
    version: 1,
    requires: [],
    template: '너무 엄격한 컷오프(위음성) vs 너무 느슨한 컷오프(위양성)',
    render: () => ({
      text: '스크리닝 컷오프를 너무 엄격하게 잡을 때(좋은 분자를 놓치는 위음성)와 너무 느슨하게 잡을 때(나쁜 분자를 남기는 위양성), 뒤의 도킹 · 합성 단계의 연구비와 시간에 각각 어떤 영향을 주는지 비교해 주세요.',
      fallback: [],
    }),
    rubric: [
      r('fn', 1, '엄격할 때 좋은 후보를 놓치는 위음성과 그 결과를 설명한다', ['위음성', '놓침', '기회']),
      r('fp', 1, '느슨할 때 후속 단계로 넘어가는 위양성과 비용을 설명한다', ['위양성', '비용', '도킹 수']),
      r('cost', 1, '연구비 · 시간 숫자나 단계 비용과 구체적으로 잇는다', ['연구비', '시간', '도킹', '합성']),
      r('balance', 1, '균형을 잡는 방법(단계적 깔때기 · 재스크리닝)을 낸다', ['단계', '재스크리닝', '우선순위']),
    ],
    outline: ['엄격: 후보 적음 · 비용 적음 · 좋은 분자 놓칠 위험', '느슨: 후보 많음 · 도킹 · 합성 비용 증가', '단계적 깔때기 · 재스크리닝으로 균형'],
  },
  // 2.1
  {
    id: 'l21-i',
    stepId: '2.1',
    tier: 'intermediate',
    kind: 'text',
    field: 'docking',
    version: 1,
    requires: ['docking'],
    template: '{alias} ΔG {dg} vs 기준 {ref} · PLIP — 결합력 등급과 먼저 시도할 변형',
    render: (ctx) => {
      const miss: string[] = [];
      const d = bind(ctx, 'docking', miss)[0]!;
      return {
        text: `우리 ${d.alias}의 ΔG 는 ${d.deltaG} kcal/mol, 기준 리간드는 ${d.referenceKcal} kcal/mol 이에요. PLIP 로 본 수소결합은 ${d.hbond}개, π-π 적층은 ${d.pistack}개예요. 결합력 등급을 어떻게 보나요? 작용기 바꾸기 칩 6종(방향족 아민 → 아세트아마이드 · 니트로 → 시아노 · 염기성 아민 → 아마이드 · 하이드록시 · 플루오린 도입 · 메톡시 제거) 가운데 무엇을 먼저 시도하고 왜 그런가요?`,
        fallback: miss,
      };
    },
    rubric: [
      r('grade', 1, 'ΔG 를 기준 리간드와 비교해 결합력 수준을 바르게 판단한다', ['기준', '강함', '약함', 'p']),
      r('plip', 1, 'PLIP 상호작용(수소결합 · π-π)을 근거로 쓴다', ['수소결합', 'π', '잔기']),
      r('chip', 1, '시도할 변형 칩 하나를 고른다', ['아마이드', '시아노', '플루오린', '하이드록시', '메톡시']),
      r('why', 1, '그 변형이 결합 · 독성 신호에 줄 효과를 이유로 든다', ['hERG', '간독성', '결합', '물성']),
    ],
    outline: ['ΔG 가 기준보다 얼마나 약한지 → 결합력 등급', '수소결합 · π-π 가 포켓 고정에 하는 일', '변형 칩 선택과 기대 효과(결합 유지 · 독성 신호 줄이기)'],
  },
  {
    id: 'l21-a',
    stepId: '2.1',
    tier: 'advanced',
    kind: 'text',
    field: 'docking',
    version: 1,
    requires: [],
    template: '도킹 점수는 좋지만 MW > 550 · LogP > 5.5 인 분자가 몸에서 실패하는 이유',
    render: () => ({
      text: '도킹 점수(ΔG)는 아주 좋지만 분자량(MW > 550)과 지용성(LogP > 5.5)이 지나치게 큰 분자는 실제 몸속에서 실패하는 일이 많아요. 왜 그런지(용해도 · 흡수 · 큰 분자일수록 점수가 부풀려지는 경향 등) 설명하고, 구조를 어떤 방향으로 고치겠는지 써 주세요.',
      fallback: [],
    }),
    rubric: [
      r('inflate', 1, '큰 · 기름진 분자가 도킹 점수를 부풀리는 경향을 설명한다', ['분자량', '접촉', '부풀', '리간드 효율']),
      r('adme', 1, '용해도 · 흡수 · 대사 문제를 든다', ['용해도', '흡수', 'Ro5', '대사']),
      r('tox', 1, '지용성이 독성(hERG · 간독성) 위험과 이어짐을 안다', ['hERG', '간독성', '지용성']),
      r('fix', 1, '구조 최적화 방향(극성기 추가 · 크기 줄이기)을 구체적으로 낸다', ['극성', '줄이', '하이드록시', '아마이드']),
      r('measure', 1, '리간드 효율 같은 크기 보정 지표나 다시 도킹해 확인하는 방법을 낸다', ['효율', '재도킹', '비교']),
    ],
    outline: ['큰 분자는 접촉이 많아 ΔG 가 좋아 보임(크기 편향)', '용해도 · 흡수 · Ro5 위반 · 독성 위험', '극성기 · 크기 줄이기 · 리간드 효율로 확인'],
  },
  // 2.2
  {
    id: 'l22-i',
    stepId: '2.2',
    tier: 'intermediate',
    kind: 'text',
    field: 'admet',
    version: 1,
    requires: ['admet'],
    template: '{aliasA} · {aliasB} ADMET 레이더 — 주력 리드와 백업을 고른 근거',
    render: (ctx) => {
      const miss: string[] = [];
      const rows = bind(ctx, 'admet', miss);
      const a = rows[0]!;
      const b = rows[1] ?? EXAMPLE.admet[1]!;
      if (!rows[1] && !miss.includes('admet')) miss.push('admet');
      const radar = (x: { radar: Record<string, number> }) =>
        Object.entries(x.radar)
          .map(([k, v]) => `${k} ${v}`)
          .join(' · ');
      return {
        text: `모둠이 ADMET 를 본 후보 ${a.alias}(${radar(a)})와 ${b.alias}(${radar(b)})의 레이더를 보고, 주력 리드와 백업 후보를 어떻게 정하겠어요? 레이더 축 숫자를 근거로 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('pick', 1, '주력과 백업을 분명히 정한다', ['주력', '백업', '리드']),
      r('axis', 1, '레이더 축 숫자를 근거로 인용한다', ['BBB', '간독성', 'hERG', '경구']),
      r('weak', 1, '주력의 약한 축(위험)을 인정한다', ['약점', '주의', '위험']),
      r('role', 1, '백업이 주력의 약점을 보완하는 역할을 설명한다', ['보완', '교체', '다른']),
    ],
    outline: ['효능과 안전의 균형으로 주력 선택', '약한 축 숫자 인용', '백업은 주력과 다른 약점 구조'],
  },
  {
    id: 'l22-a',
    stepId: '2.2',
    tier: 'advanced',
    kind: 'text',
    field: 'admet',
    version: 1,
    requires: [],
    template: '결합력 1위 + hERG 경고 vs 결합력 2위 + 깨끗한 ADMET — 주력 · 백업 배치와 교체 조건',
    render: () => ({
      text: '표적 결합력(ΔG) 1위 후보에는 hERG 심장독성 경고가 뜨고, 결합력 2위 후보는 ADMET 가 깨끗해요. 주력 리드와 백업을 어떻게 배치하고, 어떤 조건에서 서로 바꿀지 전략을 세워 주세요.',
      fallback: [],
    }),
    rubric: [
      r('herg', 1, 'hERG 위험이 임상에서 왜 치명적인지(QT 연장 · 부정맥) 설명한다', ['QT', '부정맥', '심장']),
      r('arrange', 1, '주력 · 백업 배치를 근거와 함께 정한다', ['주력', '백업', '배치']),
      r('trigger', 1, '교체 조건을 측정 가능한 기준으로 낸다', ['패치클램프', 'IC50', '전임상', '기준']),
      r('fix', 1, '1위 후보의 hERG 를 낮추는 구조 변경 방향을 낸다', ['염기성 아민', '지용성', 'cLogP', '아마이드']),
      r('efficacy', 1, '2위 후보의 결합력 차이가 효능에 주는 영향을 따진다', ['효능', '용량', '결합력']),
    ],
    outline: ['hERG → QT 연장 · 부정맥 위험', '안전한 2위를 주력으로 두거나 1위를 조건부 주력', '세포 hERG 시험 · 전임상 결과로 교체 기준'],
  },
  // 3.1
  {
    id: 'l31-i',
    stepId: '3.1',
    tier: 'intermediate',
    kind: 'text',
    field: 'patent',
    version: 1,
    requires: ['patent'],
    template: '코드명 {code} 특허 청구 범위 · 경쟁 모둠 {rival}',
    render: (ctx) => {
      const miss: string[] = [];
      const p = bind(ctx, 'patent', miss);
      return {
        text: `우리 코드명 ${p.code} 물질특허의 청구 범위를 한 문장으로 써 주세요. 같은 표적을 쓰는 경쟁 모둠(${list(p.rivals)})이 있을 때 우리 특허로 무엇이 보호되고 무엇이 보호되지 않나요?`,
        fallback: miss,
      };
    },
    rubric: [
      r('claim', 1, '청구 범위를 분자 구조 중심으로 한 문장으로 쓴다', ['구조', '화합물', '청구']),
      r('protect', 1, '같은 물질(입체 · 염 포함)은 막을 수 있음을 안다', ['같은 물질', '입체', '염']),
      r('notprotect', 1, '다른 구조 · 같은 표적의 다른 분자는 막지 못함을 안다', ['다른 구조', '표적', '회피']),
      r('strategy', 1, '보호를 넓히는 방법(유도체 · 백업 출원)을 낸다', ['유도체', '백업', '추가 출원']),
    ],
    outline: ['청구 범위 = 분자 구조', '같은 평면 SMILES 는 보호', '표적은 보호되지 않음 — 다른 구조는 경쟁 가능'],
  },
  {
    id: 'l31-a',
    stepId: '3.1',
    tier: 'advanced',
    kind: 'text',
    field: 'patent',
    version: 1,
    requires: [],
    template: '물질특허 출원 타이밍 — 너무 이르게 vs 너무 늦게',
    render: () => ({
      text: '물질특허를 임상 1상 전에 너무 일찍 내면(존속기간이 시판 전에 많이 지나감) 무엇을 잃고, 너무 늦게 내면(경쟁사 선점) 무엇을 잃나요? 이 딜레마를 설명하고 바이오벤처의 특허 타이밍 전략을 써 주세요.',
      fallback: [],
    }),
    rubric: [
      r('early', 1, '이른 출원이 특허 존속기간(약 20년)을 잠식함을 설명한다', ['20년', '존속기간', '시판']),
      r('late', 1, '늦은 출원이 선점 · 공개 위험을 가져옴을 설명한다', ['선점', '공개', '경쟁']),
      r('tools', 1, '존속기간 연장 · 후속 특허 같은 보완책을 안다', ['연장', '후속', '제형 특허', '용도']),
      r('strategy', 1, '벤처 상황(투자 · 자금)에 맞는 타이밍 전략을 낸다', ['투자', '자금', '전략', '시점']),
    ],
    outline: [
      '특허는 출원일부터 약 20년 — 개발 기간이 길면 시판 뒤 남는 기간이 짧아짐',
      '늦으면 경쟁사가 선점 · 공개로 신규성 상실',
      '투자 유치에 특허가 필요 — 핵심 물질은 일찍, 후속 특허로 보완',
    ],
  },
  // 3.2 — 동물실험 윤리
  {
    id: 'l32-i',
    stepId: '3.2',
    tier: 'intermediate',
    kind: 'text',
    field: 'ethics',
    version: 1,
    requires: ['patent'],
    template: '특허 분자 {code} 동물실험 — 군당 마릿수 적게 · 알맞게 · 많이',
    render: (ctx) => {
      const miss: string[] = [];
      const p = bind(ctx, 'patent', miss);
      return {
        text: `우리 특허 분자 ${p.code}로 동물실험계획서를 쓴다면 군당 마릿수를 「적게 · 알맞게 · 많이」 가운데 무엇으로 하겠어요? 감소(Reduction) 원칙과, 자료가 부족하면 안전계수가 10 → 20 으로 올라 사람 시작 용량 상한(MRSD)이 절반이 된다는 점을 함께 근거로 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('choice', 1, '마릿수 수준 하나를 고른다', ['적게', '알맞게', '많이']),
      r('reduction', 1, '감소 원칙(통계적으로 믿을 만한 최소)을 바르게 쓴다', ['최소', '통계', '감소']),
      r('mrsd', 1, '자료 부족 → 안전계수 상승 → MRSD 감소의 연결을 설명한다', ['안전계수', 'MRSD', '20', '시작 용량']),
      r('excess', 1, '과다한 마릿수는 얻는 것 없이 동물만 더 쓴다는 점을 안다', ['과다', '근거 없는', '많이']),
    ],
    outline: ['알맞게가 기본 — 믿을 만한 최소', '적게는 자료 부족 → 안전계수 20 → MRSD 절반', '많이는 근거 없는 과다 — 심의 보완'],
  },
  {
    id: 'l32-a',
    stepId: '3.2',
    tier: 'advanced',
    kind: 'text',
    field: 'ethics',
    version: 1,
    requires: [],
    template: '동물 수를 절반으로 줄이면 사람 첫 용량을 더 낮게 — 어느 쪽이 더 윤리적인가',
    render: () => ({
      text: '동물 수를 절반으로 줄이면 자료가 부족해져 사람 임상 1상의 시작 용량을 더 낮게 잡아야 해요(안전계수 상승). 동물을 아끼는 것과 사람 참여자의 위험 · 효과 사이에서 어느 쪽이 더 윤리적인가요? 3R 과 사람 참여자 보호를 함께 따져 주세요.',
      fallback: [],
    }),
    rubric: [
      r('animal', 1, '동물 쪽 윤리(3R · 고통)를 바르게 든다', ['3R', '감소', '고통', '대체']),
      r('human', 1, '사람 참여자 쪽 위험(낮은 용량 · 효과 부족 · 반복 시험)을 든다', ['참여자', '용량', '효과', '안전']),
      r('link', 1, '자료 부족 → 안전계수 → 시작 용량의 연결을 설명한다', ['안전계수', 'MRSD', '자료']),
      r('alt', 1, '대체 시험(세포 · 오가노이드)으로 둘 다 지키는 길을 찾는다', ['대체', '세포', '오가노이드', '비임상']),
      r('stance', 1, '근거를 갖춘 입장을 분명히 낸다', ['따라서', '선택', '조건']),
    ],
    outline: ['동물 감소는 3R 의 요구', '자료 부족은 사람에게 낮은 용량 · 효과 부족 · 추가 시험 부담', '대체 시험으로 감소와 자료 확보를 함께', '조건부 입장'],
  },
  // 3.3 — 앞 판 3.2 IND
  {
    id: 'l33-i',
    stepId: '3.3',
    tier: 'intermediate',
    kind: 'text',
    field: 'ind',
    version: 1,
    requires: ['ind'],
    template: '{formulation} {dose} mg · 1차 지표 {endpoint} — 심사관이 물을 질문 둘과 답',
    render: (ctx) => {
      const miss: string[] = [];
      const i = bind(ctx, 'ind', miss);
      return {
        text: `우리 IND 는 ${i.formulation} ${i.doseMg} mg · 1차 평가지표 「${i.endpoint}」 예요. 심사관이 물을 핵심 질문 둘과 그 답을 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('q_dose', 1, '시작 용량이 MRSD 이하인지 · 근거를 묻고 답한다', ['MRSD', 'NOAEL', '시작 용량']),
      r('q_form', 1, '제형이 표적 · 질환(BBB · 흡수)에 맞는지 묻고 답한다', ['경구', '정맥', '경피', 'BBB', '흡수']),
      r('q_end', 1, '1차 평가지표가 효과를 잴 수 있는지 묻고 답한다', ['평가지표', '측정', '기간']),
      r('answer', 1, '답이 우리 데이터(전임상 · 물성)를 근거로 한다', ['전임상', '물성', '결과']),
    ],
    outline: ['용량: MRSD 이하 · 전임상 NOAEL 근거', '제형: 흡수 · 뇌 노출과 맞음', '평가지표: 질환 효과를 재는 기간 · 척도'],
  },
  {
    id: 'l33-a',
    stepId: '3.3',
    tier: 'advanced',
    kind: 'text',
    field: 'ind',
    version: 1,
    requires: [],
    template: '고용량 경구 vs 저용량 경피 — 1상(안전)과 2상(효능)에 주는 상반된 영향',
    render: () => ({
      text: '고용량(100 mg) 경구 투여와 저용량(10 mg) 경피 패치 투여가 임상 1상(안전성 통과)과 임상 2상(유효성 통과)에 각각 어떤 상반된 영향을 주는지 약동학(PK) 관점에서 설명해 주세요.',
      fallback: [],
    }),
    rubric: [
      r('oral', 1, '고용량 경구의 노출 증가 → 효능 ↑ · 독성 위험 ↑ 를 설명한다', ['노출', '독성', '효능', '최고 농도']),
      r('patch', 1, '저용량 경피의 일정한 농도 · 낮은 최고 농도 → 안전 ↑ · 효능 부족 위험을 설명한다', ['일정', '최고 농도', '효능 부족']),
      r('pk', 1, '흡수 · 최고 농도(Cmax) · 반감기 같은 PK 개념을 바르게 쓴다', ['Cmax', '반감기', '흡수', '생체이용률']),
      r('phase', 1, '1상과 2상의 판정 기준 차이와 잇는다', ['1상', '2상', '안전', '효능']),
      r('choice', 1, '조건에 따라 어느 쪽을 고를지 낸다', ['조건', '선택', '전략']),
    ],
    outline: [
      '경구 고용량: 노출 큼 → 2상 효능 유리 · 1상 안전 위험',
      '경피 저용량: 일정하고 낮은 농도 → 1상 유리 · 2상 효능 부족 위험',
      'Cmax · AUC · 반감기로 설명',
      '안전역에 따라 선택',
    ],
  },
  // 4.1
  {
    id: 'l41-i',
    stepId: '4.1',
    tier: 'intermediate',
    kind: 'text',
    field: 'trial',
    version: 1,
    requires: ['trial', 'lead'],
    template: '{phase} 판정 {outcome}({reason}) — 재도전 경로와 근거',
    render: (ctx) => {
      const miss: string[] = [];
      const t = bind(ctx, 'trial', miss);
      const l = bind(ctx, 'lead', miss);
      return {
        text: `${t.phase} 판정이 「${t.outcome}」 이에요(${t.reason}). 세 경로(용량 변경 · 제형 변경 · 백업 후보 교체) 가운데 무엇을 고르겠어요? 우리 주력 ${l.alias}의 신호(${list(l.signals)})와 도킹 · ADMET 값을 근거로 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('path', 1, '경로 하나를 분명히 고른다', ['용량', '제형', '백업']),
      r('cause', 1, '보류 원인과 선택 경로를 잇는다', ['원인', '효능', '안전']),
      r('data', 1, '주력의 신호 · 수치를 근거로 쓴다', ['hERG', '간독성', 'ΔG', '흡수']),
      r('risk', 1, '선택 경로의 새 위험과 비용을 인정한다', ['비용', '위험', '시간']),
    ],
    outline: ['효능 부족 → 용량 · 제형으로 노출 늘리기 검토', '안전 문제 → 용량 낮추기 또는 백업 교체', '비용 · 시간 대가'],
  },
  {
    id: 'l41-a',
    stepId: '4.1',
    tier: 'advanced',
    kind: 'text',
    field: 'trial',
    version: 1,
    requires: [],
    template: '2상 효능 부족 보류 — 증량이 위험한 경우 vs 백업 교체가 필요한 경우',
    render: () => ({
      text: '임상 1상은 통과했지만 2상에서 「효능 부족」으로 보류(CRL)됐어요. 단순히 용량을 올리는 것이 위험한 경우와, 백업 후보로 전면 교체해야 하는 경우를 나누는 판단 기준을 제시해 주세요.',
      fallback: [],
    }),
    rubric: [
      r('margin', 1, '안전역(1상 최대 용량 · NOAEL 대비)이 좁으면 증량이 위험함을 설명한다', ['안전역', 'NOAEL', '최대 용량']),
      r('exposure', 1, '노출 부족(흡수 · BBB)인지 표적 자체 문제인지 구분한다', ['노출', '흡수', 'BBB', '표적']),
      r('switch', 1, '표적 결합 · 기전 문제면 백업 교체가 맞음을 설명한다', ['백업', '교체', '결합력']),
      r('criteria', 1, '측정 가능한 판단 기준을 낸다', ['기준', '농도', '수치']),
      r('cost', 1, '비용 · 시간을 함께 따진다', ['비용', '시간', '연구비']),
    ],
    outline: ['안전역 좁음 → 증량 위험', '노출 부족 → 용량 · 제형', '결합 · 기전 문제 → 백업 교체', '비용 · 기간 비교'],
  },
  // 4.2
  {
    id: 'l42-i',
    stepId: '4.2',
    tier: 'intermediate',
    kind: 'text',
    field: 'approval',
    version: 1,
    requires: ['lead'],
    template: '약 라벨 주의사항 둘 — 리드 {alias} 의 ADMET 위험 신호에서',
    render: (ctx) => {
      const miss: string[] = [];
      const l = bind(ctx, 'lead', miss);
      return {
        text: `우리 약 라벨에 넣을 주의사항 둘을, 주력 ${l.alias}의 ADMET 위험 신호(${list(l.signals)})에서 끌어내 써 주세요.`,
        fallback: miss,
      };
    },
    rubric: [
      r('two', 1, '주의사항 둘을 분명히 쓴다', ['주의', '경고', '금기']),
      r('signal', 1, '각 주의사항을 ADMET 신호와 잇는다', ['hERG', '간', 'BBB', '대사']),
      r('action', 1, '환자 · 의사가 할 일(모니터링 · 병용 금기)을 쓴다', ['검사', '모니터링', '병용', '피함']),
    ],
    outline: ['hERG → QT 연장 약과 병용 주의 · 심전도', '간독성 → 간 수치 검사', '대사 · 상호작용 주의'],
  },
  {
    id: 'l42-a',
    stepId: '4.2',
    tier: 'advanced',
    kind: 'text',
    field: 'approval',
    version: 1,
    requires: [],
    template: '시판 후 희귀 간독성 — 시장 철수 vs 처방 제한(라벨 · 동반진단)',
    render: () => ({
      text: '허가 뒤 시판 후 조사(4상)에서 드문 간독성 부작용이 보고됐어요. 시장에서 완전히 빼는 것과 처방을 제한하는 것(동반진단 · 라벨 변경 · 간 수치 검사 의무) 가운데 어떤 조치가 타당한지 유익성-위해성 균형으로 논해 주세요.',
      fallback: [],
    }),
    rubric: [
      r('benefit', 1, '약의 유익성(대체 치료 유무 · 질환 중증도)을 따진다', ['대체', '중증', '유익']),
      r('risk', 1, '위해성(빈도 · 심각도 · 예측 가능성)을 따진다', ['빈도', '심각', '예측']),
      r('options', 1, '철수 · 제한 각 선택의 결과를 비교한다', ['철수', '제한', '라벨', '동반진단']),
      r('monitor', 1, '위험을 줄이는 구체적 장치(간 수치 검사 · 대상 제한)를 낸다', ['간 수치', '검사', '대상']),
      r('decision', 1, '근거를 갖춘 결론을 낸다', ['따라서', '결론', '조건']),
    ],
    outline: ['유익성: 대체 약 · 중증도', '위해성: 빈도 · 심각도 · 예측 가능성', '위험 관리로 줄일 수 있으면 처방 제한, 아니면 철수'],
  },
];

export const LEARN_BANK: readonly BankItem[] = [...CONCEPTS, ...TEXTS];
export const bankItem = (id: string): BankItem | undefined => LEARN_BANK.find((i) => i.id === id);
export const bankForStep = (stepId: StepId): BankItem[] => LEARN_BANK.filter((i) => i.stepId === stepId);

// ── 연구 노트 3칸 루브릭(단계별 초점 — 설계 §3.1 끝 열) ──

const NOTE_FOCUS: Record<StepId, [string, string, string]> = {
  '1.1': ['왜 이 표적인가(가설)', '표적 검증의 불확실성', '대안 표적 후보'],
  '1.2': ['컷오프 설정 근거', '걸러진 분자 중 놓쳤을 가능성', '재스크리닝 기준'],
  '2.1': ['주력 도킹 후보 비교 근거', '결합 포켓 상호작용의 한계', '작용기 변형 대안'],
  '2.2': ['특허 후보 선정 근거', 'ADMET 취약 지표', '백업 후보 교체 기준'],
  '3.1': ['물질특허 핵심 구조', '회피 설계(Me-too) 취약점', '선점 실패 시 우회 전략'],
  '3.2': ['동물실험이 필요한 이유와 3R 근거', '동물 결과가 사람에게 맞지 않을 수 있는 한계', '주력이 실패하면 백업 · 대체 시험 계획'],
  '3.3': ['제형 · 용량 선택 근거', '독성 안전역(Safety Margin) 우려', '보류 시 프로토콜 수정안'],
  '4.1': ['임상 성패 원인 분석', '현재 프로토콜의 잔여 위험', '재도전 경로 선택 근거'],
  '4.2': ['최종 신약의 차별화 가치', '시판 후 모니터링 핵심 지표', '적응증 확장 계획'],
};

export const noteFocus = (stepId: StepId): [string, string, string] => NOTE_FOCUS[stepId];

export function noteRubric(stepId: StepId): RubricItem[] {
  const [why, unknown, fallback] = NOTE_FOCUS[stepId];
  return [
    r('why_claim', 2, `① 칸이 「${why}」를 분명한 가설로 밝힌다`, ['가설', '선택', '이유']),
    r('why_data', 2, '① 칸이 모둠 데이터(숫자 · 결과)를 근거로 인용한다', ['ΔG', 'TPSA', '점수', '결과']),
    r('unknown', 2, `② 칸이 「${unknown}」를 구체적으로 짚는다`, ['한계', '모름', '불확실']),
    r('fallback', 2, `③ 칸이 「${fallback}」를 조건과 함께 구체적으로 낸다`, ['대안', '백업', '조건', '바꾸']),
    r('coherent', 1, '세 칸이 서로 앞뒤가 맞는다', ['연결', '일관']),
    r('science', 1, '과학적으로 틀린 서술이 없다', ['정확']),
  ];
}

// ── Series A/B 피치 루브릭(balance §3 — 3항목 × 10점) ──

export const PITCH_RUBRIC: Record<PitchRound, RubricItem[]> = {
  series_a: [
    r('lead_why', 1, '모둠원 넷이 발굴한 후보 비교에서 왜 이 분자를 주력으로 골랐는지 수치(ΔG · 물성) 근거가 분명하다', ['ΔG', '비교', '주력', '물성']),
    r('admet_risk', 1, '주력의 ADMET 한계 · 독성 위험을 정직하게 인지한다', ['hERG', '간독성', '약점', '위험']),
    r('backup', 1, '임상 실패 때 쓸 백업 후보의 차별점과 교체 기준이 타당하다', ['백업', '교체', '기준', '차별']),
  ],
  series_b: [
    r('patent', 1, '특허 보호 범위와 경쟁 모둠 대비 차별화 근거', ['특허', '청구', '경쟁', '보호']),
    r('pk', 1, '고른 제형 · 용량이 1상(안전)과 2상(효능)을 함께 통과할 수 있는 약동학 근거', ['제형', '용량', 'MRSD', '노출']),
    r('crl', 1, '임상 2 · 3상 보류(CRL) 때 용량 · 제형 · 백업 교체 중 무엇을 먼저 할지 구체적 의사결정 순서', ['보류', '용량', '제형', '백업', '순서']),
  ],
};
