/**
 * 화면 개발용 mock 자료 — **서버 라우트(묶음 4)가 아직 없어서** 화면을 끝까지 만들려고 둔 고정 자료예요.
 *
 * 정직성(§3.5)
 * - 여기서 나온 값은 **하나도 실제 계산이 아니에요.** 모든 `Provenance.approx` 를 `true` 로 두고 상세에 '화면 개발용 mock' 을
 *   적어서, 배지가 반드시 '교육용 근사'로 보이게 했어요. `dataMode` 는 늘 `fixture` 예요.
 * - 서열은 **고정 예시**예요 — 실제 치료항체의 서열이 아니에요. 표적 · 참조 구조 식별자(`EGFR CHEMBL203` · `1YY9` 등)는
 *   설계서 §2.3 이 확인한 값만 썼어요.
 * - 서버가 붙으면 `api.ts` 가 실제 응답을 쓰고 이 파일은 쓰이지 않아요(`?mock=0` 으로 강제로 끌 수도 있어요).
 */
import {
  AMINO_ACIDS,
  ANTIBODY_FORMULA_VERSION,
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_STEP_COST_CRISTA,
  ANTIBODY_STEP_IDS,
  ANTIBODY_STEP_META,
  ANTIBODY_STEP_REQUIRES,
  CONFIDENCE_MIN_FOR_COMPLEX,
  DESIGN_SLOTS_PER_PERSON,
  LISTING_PRICE_USD,
  SCORE_THRESHOLD_MARGIN,
  SHARES_OUTSTANDING,
  antibodyGrade,
  cristaToCents,
  type AbChain,
  type AntibodyBoardResponse,
  type AntibodyBoldness,
  type AntibodyCardStep,
  type AntibodyCardView,
  type AntibodyJobStep,
  type AntibodyMutation,
  type AntibodyNoteView,
  type AntibodyProposalTopic,
  type AntibodyProposalView,
  type AntibodyStepId,
  type AntibodyStepView,
  type AntibodyVoteChoice,
  type CdrSpan,
  type AntibodyCatalogTarget,
  type ComplexView,
  type DesignView,
  type DiversityView,
  type FoldView,
  type MeResponse,
  type NoteSection,
  type PreviewMetrics,
  type Provenance,
  type ScoreView,
  type TeamView,
} from '@crista-web/web-contract';

/**
 * 연습용 고정 자료의 출처 — 모두 근사로 표시해요.
 * 학생 화면에 쓰는 글이라 개발 용어('mock' · '테스트용')를 쓰지 않아요(§11.4.2 · 해요체).
 * 이 자료는 `?mock=1` 일 때만 보여요 — 서버 모드에서는 쓰지 않아요(§12).
 */
export const fx = (label: string, detail: string): Provenance => ({
  source: 'edu-approx',
  label,
  detail: `${detail} · 연습용 고정 자료예요 — 숫자는 실제 계산이 아니에요.`,
  approx: true,
  collectedOn: '2026-10-24',
});

/** 고정 예시 서열 — 결정적으로 만들어요(같은 열쇠면 늘 같은 글자). 실제 항체 서열이 아니에요. */
function fixtureSeq(seed: string, len: number): string {
  let h = 2166136261;
  let out = '';
  for (let i = 0; i < len; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) + i * 7;
    h = Math.imul(h, 16777619) >>> 0;
    out += AMINO_ACIDS[h % AMINO_ACIDS.length];
  }
  return out;
}

export const PARENT_VH = fixtureSeq('fixture-vh', 119);
export const PARENT_VL = fixtureSeq('fixture-vl', 107);

/**
 * 연습용 표적 3종 — **`?mock=1` 전용**이에요(§12). 서버 모드에서는 `GET /api/antibody/catalog` 가 준 값을 써요.
 * 모양을 서버 응답(`AntibodyCatalogTarget`)과 같게 맞춰 두어, 화면이 두 길에서 같은 코드를 써요.
 * 번호(`CHEMBL*` · PDB)는 설계서 §2.3 이 확인한 **실제 공개 식별자**예요 — 지어낸 값이 아니에요.
 */
export const MOCK_CATALOG_TARGETS: readonly AntibodyCatalogTarget[] = [
  {
    target: 'EGFR',
    targetChemblId: 'CHEMBL203',
    suggestedAntibody: { name: 'CETUXIMAB', chemblId: 'CHEMBL1201577' },
    suggestedPdb: { pdb: '1YY9', resolutionAngstrom: 2.605, sets: [{ set: '1', H: 'D', L: 'C', AG: 'A' }] },
    antibodies: [
      { chemblId: 'CHEMBL1201577', name: 'CETUXIMAB', firstApproval: 2004, maxPhase: 4, maxPhaseRaw: '4.0', withdrawn: false, hasSequence: true },
    ],
    dataMode: 'fixture',
    provenance: null,
  },
  {
    target: 'HER2',
    targetChemblId: 'CHEMBL1824',
    suggestedAntibody: { name: 'TRASTUZUMAB', chemblId: 'CHEMBL1201585' },
    suggestedPdb: { pdb: '1N8Z', resolutionAngstrom: 2.52, sets: [{ set: '1', H: 'B', L: 'A', AG: 'C' }] },
    antibodies: [
      { chemblId: 'CHEMBL1201585', name: 'TRASTUZUMAB', firstApproval: 1998, maxPhase: 4, maxPhaseRaw: '4.0', withdrawn: false, hasSequence: true },
    ],
    dataMode: 'fixture',
    provenance: null,
  },
  {
    target: 'VEGFR2',
    targetChemblId: 'CHEMBL279',
    suggestedAntibody: { name: 'RAMUCIRUMAB', chemblId: 'CHEMBL1743062' },
    suggestedPdb: { pdb: '3S37', resolutionAngstrom: 2.7, sets: [{ set: '1', H: 'H', L: 'L', AG: 'X' }] },
    antibodies: [
      { chemblId: 'CHEMBL1743062', name: 'RAMUCIRUMAB', firstApproval: 2014, maxPhase: 4, maxPhaseRaw: '4.0', withdrawn: false, hasSequence: true },
    ],
    dataMode: 'fixture',
    provenance: null,
  },
];

/**
 * 연습용 CDR 구간 — `start · end` 는 서버와 같은 **1 부터 센** 자리예요(끝 포함 · §12).
 * `slice` 는 0 부터라 자리 번호에서 1 을 빼요.
 */
export const CDRS: readonly CdrSpan[] = [
  { chain: 'H', cdr: 1, scheme: 'imgt', start: 26, end: 34, seq: PARENT_VH.slice(25, 34) },
  { chain: 'H', cdr: 2, scheme: 'imgt', start: 51, end: 58, seq: PARENT_VH.slice(50, 58) },
  { chain: 'H', cdr: 3, scheme: 'imgt', start: 96, end: 110, seq: PARENT_VH.slice(95, 110) },
  { chain: 'L', cdr: 1, scheme: 'imgt', start: 26, end: 33, seq: PARENT_VL.slice(25, 33) },
  { chain: 'L', cdr: 2, scheme: 'imgt', start: 50, end: 56, seq: PARENT_VL.slice(49, 56) },
  { chain: 'L', cdr: 3, scheme: 'imgt', start: 89, end: 97, seq: PARENT_VL.slice(88, 97) },
];

export const cdrsOf = (chain: AbChain): CdrSpan[] => CDRS.filter((c) => c.chain === chain);

/** `i` 는 **0 부터 센** 서열 자리예요. */
const inCdr = (chain: AbChain, i: number): 1 | 2 | 3 | undefined =>
  cdrsOf(chain).find((c) => i + 1 >= c.start && i + 1 <= c.end)?.cdr;

/** 등급 — 9 는 '거의 모두 같은 글자'(바꾸면 위험) · 1 은 '항체마다 많이 다름'(§2.4 범례). 뼈대는 높게, CDR 은 낮게. */
function gradeAt(chain: AbChain, i: number): number {
  const base = inCdr(chain, i) ? 2 : 7;
  const wobble = (i * 37 + (chain === 'H' ? 11 : 5)) % 3;
  return Math.min(9, Math.max(1, base + wobble));
}

export function mockDiversity(chain: AbChain): DiversityView {
  const seq = chain === 'H' ? PARENT_VH : PARENT_VL;
  const grades = Array.from({ length: seq.length }, (_, i) => gradeAt(chain, i));
  const percentiles = grades.map((g) => Number(((g - 1) / 8).toFixed(3)));
  return {
    chain,
    grades,
    percentiles,
    imgtNumbers: Array.from({ length: seq.length }, (_, i) => [i + 1, ''] as [number, string]),
    numberingSource: 'regex-fallback',
    cdrs: cdrsOf(chain),
    suggestedFixed: grades.map((g, i) => (g >= 8 ? i : -1)).filter((i) => i >= 0).slice(0, 12),
    msaDepth: 7304,
    provenance: fx('레퍼토리 다양성', '비슷한 항체들 사이에서 이 자리가 얼마나 갈리는지 센 등급이에요'),
  };
}


// ── 미리보기 ─────────────────────────────────────────────────────────────────

const CHARGE: Record<string, number> = { D: -1, E: -1, K: 1, R: 1, H: 0.1 };
const GREASY = 'AVLIMFWYC';
const LIABILITY: Array<{ re: RegExp; motif: string; severity: 'high' | 'medium' | 'low'; fixable: 'easy' | 'hard' }> = [
  { re: /N[GS]/g, motif: 'N·G 또는 N·S', severity: 'high', fixable: 'easy' },
  { re: /DP/g, motif: 'D·P', severity: 'high', fixable: 'hard' },
  { re: /NP/g, motif: 'N·P', severity: 'medium', fixable: 'easy' },
  { re: /TS/g, motif: 'T·S', severity: 'medium', fixable: 'easy' },
  { re: /M/g, motif: 'M 하나', severity: 'low', fixable: 'easy' },
];

const netCharge = (seq: string): number => Number(seq.split('').reduce((s, a) => s + (CHARGE[a] ?? 0), 0).toFixed(1));

export function mockPreview(vh: string, vl?: string): PreviewMetrics {
  const liabilities: PreviewMetrics['liabilities'] = [];
  for (const chain of ['H', 'L'] as AbChain[]) {
    const seq = chain === 'H' ? vh : (vl ?? '');
    for (const rule of LIABILITY) {
      rule.re.lastIndex = 0;
      let hit = rule.re.exec(seq);
      while (hit && liabilities.length < 14) {
        if (inCdr(chain, hit.index)) liabilities.push({ motif: rule.motif, severity: rule.severity, chain, pos: hit.index + 1, fixable: rule.fixable });
        hit = rule.re.exec(seq);
      }
    }
  }
  const chargeVh = netCharge(vh);
  const chargeVl = vl ? netCharge(vl) : undefined;
  // `start · end` 는 1 부터 센 자리예요 — `slice` 는 0 부터라 1 을 빼요(§12).
  const cdrSeq = CDRS.map((c) => (c.chain === 'H' ? vh : (vl ?? '')).slice(c.start - 1, c.end)).join('');
  const greasyCount = cdrSeq.split('').filter((a) => GREASY.includes(a)).length;
  const greasySurface = Number(((greasyCount / Math.max(1, cdrSeq.length)) * 100).toFixed(1));
  const greasyPercentile = Number(Math.min(1, greasySurface / 60).toFixed(2));
  const cdrTotalLength = cdrSeq.length;
  const humanPercent = Number((100 - liabilities.length * 1.4 - Math.abs(chargeVh) * 0.4).toFixed(1));
  const riskFlags: PreviewMetrics['riskFlags'] = [
    { metric: 'cdrLength', level: cdrTotalLength > 60 ? 'watch' : 'ok', value: cdrTotalLength, note: 'CDR 총길이가 자연 항체 범위 안인지 봐요' },
    { metric: 'greasySurface', level: greasyPercentile > 0.8 ? 'alert' : greasyPercentile > 0.6 ? 'watch' : 'ok', value: greasyPercentile, note: '겉면에 기름진 부분이 뭉쳐 있으면 뭉침 · 비특이 결합이 늘어요' },
    { metric: 'chainChargeProduct', level: 'ok', value: Number(((chargeVl ?? 0) * chargeVh).toFixed(1)), note: '두 사슬의 전기 성질이 서로 맞는지 봐요' },
  ];
  return {
    liabilities,
    chargeVh,
    ...(chargeVl !== undefined ? { chargeVl } : {}),
    ...(chargeVl !== undefined ? { chainChargeProduct: Number((chargeVh * chargeVl).toFixed(1)) } : {}),
    pi: Number((7.4 - chargeVh * 0.12).toFixed(2)),
    greasySurface,
    greasyPercentile,
    cdrTotalLength,
    humanness: { percent: humanPercent, nearestGermline: '사람 가변영역 예시 유전자', deltaVsParent: Number((humanPercent - 92).toFixed(1)) },
    riskFlags,
    provenance: [
      fx('서버가 센 값 자리', '전하 · pI · CDR 길이 · 약점 모티프는 서버가 결정적으로 셀 자리예요'),
      fx('기름진 겉면 정도', 'CDR 주변부 창 근사예요 — 구조에서 잰 값이 아니에요'),
    ],
  };
}

// ── A4 · A5 ──────────────────────────────────────────────────────────────────

const FIXTURE_PDB = [
  'HEADER    화면 개발용 고정 구조 — 실제 예측 결과가 아니에요',
  'ATOM      1  CA  ALA H   1      10.000  10.000  10.000  1.00 88.00           C',
  'ATOM      2  CA  GLY H   2      13.800  10.400  10.200  1.00 91.00           C',
  'ATOM      3  CA  SER H   3      17.100  11.900   9.400  1.00 86.00           C',
  'ATOM      4  CA  VAL L   1      20.400  13.600   8.100  1.00 74.00           C',
  'ATOM      5  CA  LEU L   2      23.900  15.100   7.400  1.00 71.00           C',
  'END',
].join('\n');

export function mockFold(designId: string, shapeIsScfv: boolean): FoldView {
  const seed = designId.length + (shapeIsScfv ? 3 : 0);
  return {
    designId,
    pdb: FIXTURE_PDB,
    format: 'pdb',
    confidenceMean: 86 + (seed % 5),
    confidenceCdrH3: 71 + (seed % 9),
    bySegment: [
      { label: '뼈대 1', start: 1, end: 25, mean: 92 },
      { label: `${'CDR'}-H1`, start: 26, end: 34, mean: 84 },
      { label: '뼈대 2', start: 35, end: 50, mean: 93 },
      { label: `${'CDR'}-H2`, start: 51, end: 58, mean: 82 },
      { label: '뼈대 3', start: 59, end: 95, mean: 91 },
      { label: `${'CDR'}-H3`, start: 96, end: 110, mean: 71 + (seed % 9) },
      { label: '뼈대 4', start: 111, end: 119, mean: 90 },
    ],
    chainRoles: { set: '1', H: 'H', L: 'L', AG: 'A' },
    provenance: fx('접힘 예측', '모델의 자기 확신 점수예요 — 정확도가 아니에요'),
  };
}

export function mockComplex(designId: string, mutations: readonly AntibodyMutation[], parentFit: number): ComplexView {
  const effective = mutations.filter((m) => m.cdr !== undefined).length;
  const fit = Math.max(0, Math.min(100, parentFit + effective * 4 - (mutations.length - effective) * 2));
  const bindScore = Math.max(0, Math.min(100, 48 + effective * 5));
  return {
    designId,
    fit,
    grade: antibodyGrade(fit),
    bindScore,
    bindRaw: Number((effective * 0.73).toFixed(2)),
    chargePairShare: Number(Math.min(0.5, effective * 0.08).toFixed(2)),
    capCutShare: 0,
    interfaceKept: Math.max(0, 100 - effective * 6),
    deltaVsParent: Number((fit - parentFit).toFixed(1)),
    contacts: Array.from({ length: 8 }, (_, i) => ({
      cdr: ['H1', 'H2', 'H3', 'H3', 'H3', 'L1', 'L3', 'L3'][i]!,
      abResi: 28 + i * 9,
      abAa: PARENT_VH[28 + i * 9] ?? 'A',
      agResi: 410 + i * 3,
      agAa: PARENT_VL[i * 5] ?? 'G',
      dist: Number((3.2 + (i % 4) * 0.3).toFixed(1)),
      diversity: gradeAt('H', 28 + i * 9),
    })),
    contactsByCdr: [
      { cdr: 'H1', count: 1 },
      { cdr: 'H2', count: 1 },
      { cdr: 'H3', count: 3 },
      { cdr: 'L1', count: 1 },
      { cdr: 'L3', count: 2 },
    ],
    pdb: FIXTURE_PDB,
    // 배지는 지표마다 하나 — 서버와 같은 모양(목록)으로 둬요(§3.5 · §12).
    provenance: [fx('설계 적합도 · 붙는 힘 점수', '접촉 통계로 어림한 무단위 점수예요 — 자유에너지도, 실험 측정도 아니에요')],
  };
}

export function mockScore(design: DesignView, complex: ComplexView | undefined, preview: PreviewMetrics): ScoreView {
  const parentScore = 65;
  const parts = {
    binding: Math.round(complex?.bindScore ?? 48),
    stability: Math.round(100 - preview.liabilities.length * 5),
    developability: Math.round(100 - preview.greasyPercentile * 40),
    humanization: Math.round(preview.humanness.percent),
    novelty: Math.min(100, design.mutations.length * 12),
  };
  const weights = ANTIBODY_SCORE_WEIGHTS;
  const raw =
    parts.binding * weights.binding +
    parts.stability * weights.stability +
    parts.developability * weights.developability +
    parts.humanization * weights.humanization +
    parts.novelty * weights.novelty;
  const penalties = preview.liabilities
    .filter((l) => l.severity === 'high')
    .slice(0, 3)
    .map((l) => ({ label: `약점 모티프 ${l.motif} · ${l.chain}${l.pos}`, points: -6, fixable: l.fixable }));
  const score = Math.max(0, Math.min(100, Math.round(raw + penalties.reduce((s, p) => s + p.points, 0))));
  return {
    score,
    parts,
    weights,
    penalties,
    risks: preview.riskFlags.filter((r) => r.level !== 'ok').map((r) => r.note),
    parentScore,
    threshold: parentScore + SCORE_THRESHOLD_MARGIN,
    effectiveMutations: design.mutations.filter((m) => m.cdr !== undefined).length,
    formulaVersion: ANTIBODY_FORMULA_VERSION,
    caveat: '이 점수는 수업용이에요 — 실제 약의 성공 가능성을 재는 값이 아니에요.',
    provenance: [fx('설계 점수', '센 값과 모형으로 추정한 값을 가중 평균한 묶음 점수예요')],
  };
}

// ── 제안 받기 ────────────────────────────────────────────────────────────────

const BOLDNESS_SPAN: Record<AntibodyBoldness, number> = { conservative: 1, normal: 2, bold: 4 };

export function mockSuggest(count: number, boldness: AntibodyBoldness, byName: string): DesignView[] {
  const span = BOLDNESS_SPAN[boldness];
  return Array.from({ length: count }, (_, k) => {
    const mutations: AntibodyMutation[] = [];
    const openCdr = cdrsOf('H');
    for (let n = 0; n < span; n += 1) {
      const span0 = openCdr[(k + n) % openCdr.length]!;
      // `pos` 는 1 부터 센 자리(변이의 `pos` 와 같은 축) · 서열 첨자는 그보다 1 작아요(§12).
      const pos = span0.start + ((k * 3 + n * 5) % (span0.end - span0.start + 1));
      const wt = PARENT_VH[pos - 1] ?? 'A';
      const mut = AMINO_ACIDS[(AMINO_ACIDS.indexOf(wt) + 3 + n) % AMINO_ACIDS.length]!;
      if (wt !== mut) mutations.push({ chain: 'H', pos, wt, mut, cdr: span0.cdr });
    }
    const vh = applyMutations(PARENT_VH, mutations);
    return {
      id: `sug-${boldness}-${k}`,
      label: `제안 ${k + 1}`,
      vh,
      vl: PARENT_VL,
      seqHash: `mock-${boldness}-${k}`,
      mutations,
      origin: 'suggested' as const,
      byName,
      provenance: fx('규칙 기반 제안', '규칙으로 고른 치환이에요 — 딥러닝 설계 계산이 아니에요'),
    };
  });
}

/**
 * 변이 목록을 서열에 입히는 **순수 helper** — 연습 모드와 서버 모드가 **둘 다** 써요(A3 편집기의 지금 서열).
 * 자료를 만드는 함수가 아니라 글자를 바꾸는 함수예요.
 */
export function applyMutations(seq: string, mutations: readonly AntibodyMutation[]): string {
  const out = seq.split('');
  for (const m of mutations) if (m.chain === 'H' || m.chain === 'L') out[m.pos - 1] = m.mut;
  return out.join('');
}

// ── 화면 한 장 ───────────────────────────────────────────────────────────────

const FALLBACK_TEAM: TeamView = {
  id: 'mock-team',
  classId: 'mock-class',
  plot: 1,
  facade: 2,
  ink: 3,
  hqTier: 1,
  startupName: '세움제약',
  ticker: 'SEUM',
  slogan: '우리 몸의 무기를 설계해요',
  registeredAt: '2026-10-24T01:00:00.000Z',
  registeredByName: '모둠원',
  nameLocked: false,
  memberCount: 4,
  capacity: 4,
};

const STEP_DONE: Record<AntibodyStepId, boolean> = { A1: true, A2: true, A3: false, A4: false, A5: false, A6: false };

/** 받침에 맞춰 을 · 를 을 골라요(단계 이름이 바뀌어도 문구가 어색해지지 않게). */
function josa(word: string): '을' | '를' {
  const last = word.codePointAt(word.length - 1) ?? 0;
  if (last < 0xac00 || last > 0xd7a3) return '를';
  return (last - 0xac00) % 28 === 0 ? '를' : '을';
}

function stepViews(done: Record<AntibodyStepId, boolean>): AntibodyStepView[] {
  return ANTIBODY_STEP_IDS.map((id) => {
    const meta = ANTIBODY_STEP_META[id];
    const need = ANTIBODY_STEP_REQUIRES[id];
    const locked = need !== undefined && !done[need];
    return {
      id,
      group: meta.group,
      index: meta.index,
      state: done[id] ? 'done' : locked ? 'locked' : 'ready',
      ...(locked && need ? { reason: `${need} ${ANTIBODY_STEP_META[need].title}${josa(ANTIBODY_STEP_META[need].title)} 먼저 끝내요`, unlockBy: need } : {}),
      evidence: meta.evidence,
      costCents: meta.costCents,
    };
  });
}

export function mockBoard(me: MeResponse): AntibodyBoardResponse {
  const team = me.team ?? FALLBACK_TEAM;
  const row = MOCK_CATALOG_TARGETS[0]!;
  const parentDesign: DesignView = {
    id: 'parent',
    label: '원본 비교군',
    vh: PARENT_VH,
    vl: PARENT_VL,
    seqHash: 'mock-parent',
    mutations: [],
    origin: 'parent',
    provenance: fx('원본 항체 가변영역', '비교군으로 늘 한 줄 넣어요 — 점수가 원본 대비 개선폭에 걸려 있어요'),
  };
  const marketCapCents = Math.round(LISTING_PRICE_USD * SHARES_OUTSTANDING * 100);
  return {
    track: 'antibody',
    team,
    program: {
      revisionId: 'mock-rev-1',
      revisionNo: 1,
      version: 1,
      antigenTarget: row.targetChemblId,
      parentAntibodyName: row.suggestedAntibody.name,
      parentAntibodyChemblId: row.suggestedAntibody.chemblId,
      referencePdb: row.suggestedPdb.pdb,
      chainRoles: { set: '1', H: 'D', L: 'C', AG: 'A' },
      parentVh: PARENT_VH,
      parentVl: PARENT_VL,
    },
    steps: stepViews(STEP_DONE),
    current: 'A3',
    designs: [parentDesign],
    folds: [],
    complexes: [],
    diversity: [mockDiversity('H'), mockDiversity('L')],
    cards: [
      { id: 'c1', step: 'A1', slot: 'EGFR', payload: { antibody: row.suggestedAntibody.name }, rationale: '승인 연도가 가장 이르고 항원이 들어 있는 구조가 있어요', byName: '모둠원 1', createdAt: '2026-10-24T01:10:00.000Z' },
      { id: 'c2', step: 'A1', slot: 'HER2', payload: { antibody: MOCK_CATALOG_TARGETS[1]!.suggestedAntibody.name }, rationale: '해상도가 가장 좋아요', byName: '모둠원 2', createdAt: '2026-10-24T01:12:00.000Z' },
      { id: 'c3', step: 'A2', slot: 'CDR-H1', payload: { positions: [26, 27, 30] }, rationale: '거의 모든 항체가 같은 글자를 써요 · 뼈대(FR) 자리예요', byName: '모둠원 2', createdAt: '2026-10-24T01:30:00.000Z' },
    ],
    proposals: [
      {
        id: 'p1',
        topic: 'program',
        value: {
          antigenTarget: row.targetChemblId,
          parentAntibodyChemblId: row.suggestedAntibody.chemblId,
          referencePdb: row.suggestedPdb.pdb,
          chainRoles: row.suggestedPdb.sets[0],
        },
        rationale: '항원이 들어 있는 구조라 계면을 볼 수 있어요',
        byName: '모둠원 1',
        status: 'passed',
        votes: { yes: 3, no: 0, quorum: 3, myChoice: 'yes' },
        version: 2,
      },
    ],
    notes: [],
    valuation: {
      fundamentalUsd: LISTING_PRICE_USD,
      priceUsd: LISTING_PRICE_USD,
      marketCapCents,
      changePct: 0,
      rankMarketCap: 1,
      of: 8,
    },
    classRank: { rank: 3, of: 8 },
    balanceCents: cristaToCents(10_000_000),
    costs: {
      A2: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A2),
      A4: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A4),
      A5: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A5),
    },
    myQuota: {
      designs: { used: 0, max: DESIGN_SLOTS_PER_PERSON },
      fold: { used: 0, max: 1 },
      evaluate: { used: 0, max: 1 },
    },
    teamQuota: { running: 0, max: 2 },
    jobs: [],
    dataMode: 'fixture',
    optional: { proteinmpnn: false, boltz: false },
    settings: { weights: ANTIBODY_SCORE_WEIGHTS, openTracks: ['small', 'antibody'] },
    news: [
      { seq: 3, ticker: team.ticker ?? 'SEUM', headline: `◆ ${team.ticker ?? 'SEUM'} 표적 확정 — ${row.target} · 원본 ${row.suggestedAntibody.name}`, tone: 'g', track: 'antibody' },
      { seq: 2, ticker: 'NURI', headline: '◆ NURI 접힘 예측 첫 성공', tone: 'n', track: 'antibody' },
    ],
  };
}

// ── mock 안에서의 쓰기 ───────────────────────────────────────────────────────

const recompute = (board: AntibodyBoardResponse): AntibodyBoardResponse => {
  const mine = board.designs.filter((d) => d.origin !== 'parent');
  const done: Record<AntibodyStepId, boolean> = {
    A1: board.proposals.some((p) => p.topic === 'program' && p.status === 'passed'),
    A2: board.cards.some((c) => c.step === 'A2'),
    A3: mine.length > 0,
    A4: board.folds.length > 0,
    A5: board.complexes.length > 0,
    A6: board.best !== undefined,
  };
  return { ...board, steps: stepViews(done) };
};

export const mockAddCard = (board: AntibodyBoardResponse, step: AntibodyCardStep, slot: string, payload: unknown, rationale: string, byName: string): AntibodyBoardResponse => {
  const card: AntibodyCardView = { id: `c${Date.now()}`, step, slot, payload, rationale, byName, createdAt: new Date().toISOString() };
  const kept = board.cards.filter((c) => !(c.step === step && c.byName === byName));
  return recompute({ ...board, cards: [...kept, card] });
};

export const mockAddProposal = (board: AntibodyBoardResponse, topic: AntibodyProposalTopic, value: unknown, rationale: string, byName: string): AntibodyBoardResponse => {
  const proposal: AntibodyProposalView = { id: `p${Date.now()}`, topic, value, rationale, byName, status: 'open', votes: { yes: 1, no: 0, quorum: 3, myChoice: 'yes' }, version: 1 };
  return recompute({ ...board, proposals: [...board.proposals.filter((p) => p.topic !== topic || p.status !== 'open'), proposal] });
};

export const mockVote = (board: AntibodyBoardResponse, proposalId: string, choice: AntibodyVoteChoice): AntibodyBoardResponse => {
  const proposals = board.proposals.map((p) => {
    if (p.id !== proposalId) return p;
    const yes = choice === 'yes' ? p.votes.yes + (p.votes.myChoice === 'yes' ? 0 : 1) : Math.max(0, p.votes.yes - (p.votes.myChoice === 'yes' ? 1 : 0));
    const no = choice === 'no' ? p.votes.no + (p.votes.myChoice === 'no' ? 0 : 1) : Math.max(0, p.votes.no - (p.votes.myChoice === 'no' ? 1 : 0));
    return { ...p, votes: { ...p.votes, yes, no, myChoice: choice }, status: yes >= p.votes.quorum ? ('passed' as const) : p.status, version: p.version + 1 };
  });
  return recompute({ ...board, proposals });
};

export const mockAddDesign = (board: AntibodyBoardResponse, label: string, vh: string, vl: string | undefined, mutations: readonly AntibodyMutation[], byName: string, slot: 1 | 2): AntibodyBoardResponse => {
  const design: DesignView = {
    id: `d${Date.now()}`,
    label,
    vh,
    ...(vl ? { vl } : {}),
    seqHash: `mock-${vh.length}-${mutations.length}-${slot}`,
    mutations: [...mutations],
    origin: 'student',
    byName,
    slot,
    preview: mockPreview(vh, vl),
    provenance: fx('학생 설계', '학생이 직접 고른 치환이에요'),
  };
  return recompute({ ...board, designs: [...board.designs.filter((d) => !(d.byName === byName && d.slot === slot)), design] });
};

export const mockRunJob = (board: AntibodyBoardResponse, step: AntibodyJobStep, designId: string, scfv: boolean): AntibodyBoardResponse => {
  const design = board.designs.find((d) => d.id === designId);
  if (!design) return board;
  const costCents = board.costs[step];
  const job = { id: `j${Date.now()}`, step, status: 'succeeded' as const, progress: 1, designId, costCents, finishedAt: new Date().toISOString() };
  const jobs = [...(board.jobs ?? []), job];
  if (step === 'A4') {
    const fold = mockFold(designId, scfv);
    return recompute({ ...board, jobs, folds: [...board.folds.filter((f) => f.designId !== designId), fold] });
  }
  if (step === 'A5') {
    const complex = mockComplex(designId, design.mutations, 62);
    return recompute({
      ...board,
      jobs,
      balanceCents: Math.max(0, board.balanceCents - costCents),
      complexes: [...board.complexes.filter((c) => c.designId !== designId), complex],
    });
  }
  return recompute({ ...board, jobs });
};

export const mockSaveNote = (board: AntibodyBoardResponse, stepId: AntibodyStepId, section: NoteSection, body: string, byName: string): { board: AntibodyBoardResponse; version: number } => {
  const found = board.notes.find((n) => n.stepId === stepId && n.section === section);
  const version = (found?.version ?? 0) + 1;
  const next: AntibodyNoteView = { stepId, section, body, byName, avatar: null, updatedAt: new Date().toISOString(), version };
  return { board: { ...board, notes: [...board.notes.filter((n) => !(n.stepId === stepId && n.section === section)), next] }, version };
};

export const mockSubmit = (board: AntibodyBoardResponse, designId: string): AntibodyBoardResponse => {
  const design = board.designs.find((d) => d.id === designId);
  if (!design) return board;
  const preview = design.preview ?? mockPreview(design.vh, design.vl);
  const score = mockScore(design, board.complexes.find((c) => c.designId === designId), preview);
  const changePct = score.score >= score.threshold ? 6 : 0;
  const marketCapCents = Math.round(board.valuation.marketCapCents * (1 + changePct / 100));
  return recompute({
    ...board,
    best: score,
    balanceCents: Math.max(0, board.balanceCents - cristaToCents(ANTIBODY_STEP_COST_CRISTA.A6)),
    valuation: {
      ...board.valuation,
      changePct,
      marketCapCents,
      priceUsd: Number((board.valuation.priceUsd * (1 + changePct / 100)).toFixed(2)),
      lastEvent: { headline: `◆ ${board.team.ticker ?? 'SEUM'} 대표 설계 제출 — ${score.score >= score.threshold ? '기록 경신' : '원본 문턱 못 넘음'}`, changePct, at: new Date().toISOString() },
    },
    news: [
      { seq: (board.news[0]?.seq ?? 0) + 1, ticker: board.team.ticker ?? 'SEUM', headline: `◆ ${board.team.ticker ?? 'SEUM'} 대표 설계 제출`, changePct, tone: changePct > 0 ? 'g' : 'n', track: 'antibody' },
      ...board.news,
    ],
  });
};

export const CONFIDENCE_MIN = CONFIDENCE_MIN_FOR_COMPLEX;
