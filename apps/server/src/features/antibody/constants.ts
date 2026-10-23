/**
 * 항체 랩 지표 상수 — 표마다 **어느 출처 · 어느 번호축**인지 주석으로 박아요(설계 §3.2 · §4.1).
 *
 * 이 파일의 규칙
 * - **번호축을 섞지 않아요.** IMGT 축 표와 Kabat 축 표를 따로 두고, 타입으로도 갈라요.
 *   1판의 `IMGT: L 27-32 · 50-51 · 89-97 / H 26-35B · 51-56 · 93-102` 은 Kabat · Chothia · AbM · Contact 를 섞은 잘못된 표였어요(§10 S1).
 * - **근사값에 원전 지표 이름을 쓰지 않아요**(§3.5). 이름은 우리말 뜻으로만 적어요.
 * - 분포 기준값은 **원전 임계값을 베끼지 않고** 승인 치료항체 서열로 우리가 직접 재서 넣어요(아래 `*_REFERENCE_QUANTILES`).
 * - 모든 값은 상수예요 — 시각 · 난수 · 네트워크를 쓰지 않아요.
 */
import type { AbChain, CdrScheme } from '@crista-web/web-contract';

// ── 아미노산 ──────────────────────────────────────────────────────────────────

/** 20종 — `web-contract` 의 `AMINO_ACIDS` 와 같은 순서예요(계약이 원본이에요). */
export const AA20 = 'ACDEFGHIKLMNPQRSTVWY';

/** 양전하 잔기(pH 5.5~7 구간에서 양성) · 음전하 잔기 — 전하쌍 상한과 양전하 패치에 써요. */
export const BASIC_AA = 'KR';
export const ACIDIC_AA = 'DE';

/**
 * Kyte-Doolittle 소수성(1982) — 원값 그대로예요.
 * 출처: Kyte, J. & Doolittle, R. F., J. Mol. Biol. 157, 105-132 (1982).
 * 기름진 겉면 정도는 이 값을 `1 + (kd + 4.5) / 9` 로 1~2 로 정규화해서 써요(§3.2).
 */
export const KYTE_DOOLITTLE: Readonly<Record<string, number>> = {
  A: 1.8,
  R: -4.5,
  N: -3.5,
  D: -3.5,
  C: 2.5,
  Q: -3.5,
  E: -3.5,
  G: -0.4,
  H: -3.2,
  I: 4.5,
  L: 3.8,
  K: -3.9,
  M: 1.9,
  F: 2.8,
  P: -1.6,
  S: -0.8,
  T: -0.7,
  W: -0.9,
  Y: -1.3,
  V: 4.2,
};

/** Kyte-Doolittle 값을 1~2 로 옮기는 식 — `greasy.ts` 와 보정 측정이 같은 함수를 써요. */
export const kdNormalized = (aa: string): number => {
  const kd = KYTE_DOOLITTLE[aa];
  if (kd === undefined) return 1;
  return 1 + (kd + 4.5) / 9;
};

// ── 순전하 · pI ───────────────────────────────────────────────────────────────

/**
 * Bjellqvist pKa — Biopython `Bio.SeqUtils.IsoelectricPoint` 와 같은 값이에요.
 * 출처: Bjellqvist, B. et al., Electrophoresis 14, 1023-1031 (1993) ·
 *       https://github.com/biopython/biopython/blob/master/Bio/SeqUtils/IsoelectricPoint.py ·
 *       https://web.expasy.org/compute_pi/
 */
export const PK_POSITIVE: Readonly<Record<string, number>> = { Nterm: 7.5, K: 10.0, R: 12.0, H: 5.98 };
export const PK_NEGATIVE: Readonly<Record<string, number>> = { Cterm: 3.55, D: 4.05, E: 4.45, C: 9.0, Y: 10.0 };
/** 맨 끝 잔기가 D · E 면 C 말단 pKa 를 이 값으로 바꿔요. */
export const PK_CTERM_BY_RESIDUE: Readonly<Record<string, number>> = { D: 4.55, E: 4.75 };
/** 맨 앞 잔기에 따라 N 말단 pKa 를 이 값으로 바꿔요. */
export const PK_NTERM_BY_RESIDUE: Readonly<Record<string, number>> = {
  A: 7.59,
  M: 7.0,
  S: 6.93,
  P: 8.36,
  T: 6.82,
  V: 7.44,
  E: 7.7,
};

/**
 * 두 사슬 전하 궁합을 재는 pH — **5.5** 예요.
 * 원전(Sharma et al., PNAS 2014 · 제형 pH)과 같은 pH 를 쓰지만, 원전은 구조 표면에 드러난 전하만 세므로 **값이 달라요**(§3.2 · §10 S6).
 * 1판의 7.4 는 오기였어요.
 */
export const CHAIN_CHARGE_PH = 5.5;

/** 두 사슬 전하 궁합에 쓰는 간단 전하 — D/E −1 · K/R +1 · H +0.1(원전과 같은 꼴 · pH 5.5). */
export const SIMPLE_CHARGE: Readonly<Record<string, number>> = { D: -1, E: -1, K: 1, R: 1, H: 0.1 };

/** pI 점수 밴드(§4.1b) — 구간이 끊기지 않게 하한 · 상한을 겹치지 않고 이어 붙였어요. */
export const PI_BANDS: readonly { min: number; max: number; points: number }[] = [
  { min: 6.0, max: 9.0, points: 100 },
  { min: 5.0, max: 10.0, points: 70 },
  { min: 0, max: 14, points: 40 },
];

// ── CDR 경계 — **IMGT 번호축** ────────────────────────────────────────────────

/**
 * **IMGT 번호축**(CDR-IMGT). H · L 공통이에요.
 * 출처: IMGT Scientific chart(IMGT unique numbering) · 2026-10-24 에 SAbDab-SAbPred 개발가능성 결과 페이지에서
 *       CDR1-IMGT 27-38 · CDR2-IMGT 56-65 · CDR3-IMGT 105-117 을 확인했어요.
 * **이 숫자를 Kabat 축 표와 같은 자리에 쓰지 마세요** — 축이 다르면 잔기가 밀려요.
 */
export const CDR_IMGT: Readonly<Record<1 | 2 | 3, { start: number; end: number }>> = {
  1: { start: 27, end: 38 },
  2: { start: 56, end: 65 },
  3: { start: 105, end: 117 },
};

/**
 * **IMGT 번호축** FR 자리 집합 — 사람 유전자 동일성이 쓰는 구간이에요(§3.2).
 * FR4-IMGT(118-128)는 **일부러 뺐어요** — J 유전자가 만들어서 V allele 과 비교할 수 없어요(§10 S9).
 * 길이를 `25/17/38/11` 같은 고정 상수로 다루지 않고 번호 자리로 다뤄요(IMGT 는 간격을 두니까요).
 */
export const FR_IMGT: readonly { label: 'FR1' | 'FR2' | 'FR3'; start: number; end: number }[] = [
  { label: 'FR1', start: 1, end: 26 },
  { label: 'FR2', start: 39, end: 55 },
  { label: 'FR3', start: 66, end: 104 },
];

/** **IMGT 번호축** 보존 Cys 두 자리 — 둘 중 하나라도 없으면 약점(High)이에요. */
export const CONSERVED_CYS_IMGT: readonly number[] = [23, 104];

// ── CDR 경계 — **Kabat 번호축** ───────────────────────────────────────────────

/** Kabat 축 경계 한 칸 — 끝자리에 삽입문자(`35B` 처럼)가 붙을 수 있어요. */
export interface KabatBound {
  /** Kabat 번호. */
  num: number;
  /** 삽입문자 — 없으면 빈 문자열이에요(`35B` 는 `{num:35, insertion:'B'}`). */
  insertion: string;
}

export interface KabatRange {
  start: KabatBound;
  end: KabatBound;
}

const kb = (num: number, insertion = ''): KabatBound => ({ num, insertion });

/**
 * **Kabat 번호축** CDR 경계 — Kabat · Chothia · AbM · Contact 네 정의를 한 축(Kabat 번호)으로 적은 표예요.
 * 출처: http://bioinf.org.uk/abs/info.html (Dr Andrew C. R. Martin, "Antibodies: CDR definitions").
 * **IMGT 숫자와 섞지 마세요.** IMGT 축 표는 위 `CDR_IMGT` 하나뿐이에요.
 *
 * 설계 §3.2 가 적은 값을 그대로 담았어요:
 *   H1 — Kabat 31-35B · Chothia 26-32 · AbM 26-35B · Contact 30-35B
 *   H2 — Kabat 50-65 · Chothia 52-56 · AbM 50-58 · Contact 47-58
 *   H3 — Kabat · Chothia · AbM 95-102 · Contact 93-101
 *   L1 · L2 · L3 — Kabat 24-34 · 50-56 · 89-97 (Chothia · AbM 도 같은 자리를 쓰고, Contact 만 달라요)
 */
export const CDR_KABAT_AXIS: Readonly<
  Record<Exclude<CdrScheme, 'imgt'>, Readonly<Record<AbChain, Readonly<Record<1 | 2 | 3, KabatRange>>>>>
> = {
  kabat: {
    H: {
      1: { start: kb(31), end: kb(35, 'B') },
      2: { start: kb(50), end: kb(65) },
      3: { start: kb(95), end: kb(102) },
    },
    L: {
      1: { start: kb(24), end: kb(34) },
      2: { start: kb(50), end: kb(56) },
      3: { start: kb(89), end: kb(97) },
    },
  },
  chothia: {
    H: {
      1: { start: kb(26), end: kb(32) },
      2: { start: kb(52), end: kb(56) },
      3: { start: kb(95), end: kb(102) },
    },
    L: {
      1: { start: kb(24), end: kb(34) },
      2: { start: kb(50), end: kb(56) },
      3: { start: kb(89), end: kb(97) },
    },
  },
  abm: {
    H: {
      1: { start: kb(26), end: kb(35, 'B') },
      2: { start: kb(50), end: kb(58) },
      3: { start: kb(95), end: kb(102) },
    },
    L: {
      1: { start: kb(24), end: kb(34) },
      2: { start: kb(50), end: kb(56) },
      3: { start: kb(89), end: kb(97) },
    },
  },
  contact: {
    H: {
      1: { start: kb(30), end: kb(35, 'B') },
      2: { start: kb(47), end: kb(58) },
      3: { start: kb(93), end: kb(101) },
    },
    L: {
      1: { start: kb(30), end: kb(36) },
      2: { start: kb(46), end: kb(55) },
      3: { start: kb(89), end: kb(96) },
    },
  },
};

// ── 보정 정규식(3순위 강등 경로) ──────────────────────────────────────────────

/**
 * CDR-H3 보정 앵커 — `WG[A-Z]G` 모티프를 먼저 찾고 **그 앞의 _마지막_ Cys** 를 기준으로 거꾸로 걸어요(§3.2).
 * 1판의 `/C[A-Z]{2}(?<h3>.*?)WG[A-Z]G/` 는 FR1 의 Cys(IMGT 23)에 걸려 81~87 잔기를 잡았고
 * 고유 VH 6,651개 중 실제 CDR-H3 와 **2건(0.03%)** 만 맞았어요.
 */
export const H3_FR4_MOTIF = /WG[A-Z]G/g;
/** 마지막 Cys 뒤로 몇 자리를 건너 CDR3 가 시작하는지 — IMGT 는 Cys(104) 다음 자리부터 105 예요. */
export const H3_CYS_OFFSET = 1;
/** 보정 경로가 받아들이는 CDR-H3(IMGT 축) 길이 범위 — 밖이면 실패로 보고 강등 사실을 화면에 적어요. */
export const H3_FALLBACK_LENGTH = { min: 3, max: 35 } as const;

/**
 * **Kabat 축에서만** 쓰는 CDR-L1 정규식이에요.
 * IMGT 축에서는 쓰지 않아요 — 실측에서 IMGT CDR-L1 과 5,003건 **전부 불일치**했어요(§3.2).
 */
export const L1_KABAT_FALLBACK = /C(.{8,19}?)W[YLF][QL]/;

// ── 약점 모티프 ───────────────────────────────────────────────────────────────

/** 모티프를 어디서 찾는지 — CDR 안만 보는지, Fv 전체를 보는지예요. */
export type LiabilityScope = 'cdr' | 'fv';

export interface LiabilityRule {
  /** 화면에 그대로 보여 주는 모티프 이름. */
  motif: string;
  pattern: RegExp;
  severity: 'high' | 'medium' | 'low';
  scope: LiabilityScope;
  /** 감점 점수(양수) — 개발가능성에서 이만큼 깎아요. */
  penalty: number;
  /** 다음 라운드 개선 동선 라벨(§4.1c). */
  fixable: 'easy' | 'hard';
  /** 학생에게 보여 주는 한 줄. */
  note: string;
}

/**
 * 약점 모티프 표 — **구현 확정값**이에요(§4.1c · §4.1(g)① · §10 S3).
 * 2판 잠정값(High −6 · Medium −3 · Low −1 · 응집 −2)으로는 승인 항체 151종의 개발가능성 중앙값이 83 이라
 * 보정 완료 조건(70~80)을 벗어나서, High −8 · Medium −4 · Low −2 · 응집 −3 으로 올렸어요.
 * 1판 스케일(High −18 · Medium −8 · Low −3)을 승인 항체 실제 IMGT CDR 에 적용하면
 * cetuximab 6점 · trastuzumab 13점이 나와 기본 원본부터 문턱을 못 넘었어요.
 *
 * 출처: Satława, T. et al., PLoS Comput. Biol. 20, e1011881 (2024) https://doi.org/10.1371/journal.pcbi.1011881 ·
 *       platforma-open/antibody-sequence-liabilities 의 모티프 목록.
 * 한계: 모티프가 있다고 실제로 변형이 일어나는 것은 아니에요 — 40°C · pH 6.0 · 2주 스트레스 실험에서
 *       NG 67% · NS 21% · DG 36% · DS 13% 에서만 변형이 검출됐어요(§3.5).
 */
export const LIABILITY_RULES: readonly LiabilityRule[] = [
  // High(−8 · §4.1(g)① 구현 확정값)
  {
    motif: 'N[GS]',
    pattern: /N[GS]/g,
    severity: 'high',
    scope: 'cdr',
    penalty: 8,
    fixable: 'easy',
    note: '아스파라진이 떨어져 나가기 쉬운 자리예요(탈아미드화).',
  },
  {
    motif: 'DP',
    pattern: /DP/g,
    severity: 'high',
    scope: 'cdr',
    penalty: 8,
    fixable: 'easy',
    note: '사슬이 끊어지기 쉬운 자리예요.',
  },
  {
    motif: 'D[DGHST]',
    pattern: /D[DGHST]/g,
    severity: 'high',
    scope: 'cdr',
    penalty: 8,
    fixable: 'easy',
    note: '아스파트산이 모양을 바꾸기 쉬운 자리예요(이성질화).',
  },
  {
    motif: 'N[^P][ST]',
    pattern: /N[^P][ST]/g,
    severity: 'high',
    scope: 'fv',
    penalty: 8,
    fixable: 'hard',
    note: 'Fv 어디에 있어도 당이 붙을 수 있는 자리예요(N-당화). 고치려면 틀 서열을 건드려야 해요.',
  },
  // Medium(−4 · §4.1(g)① 구현 확정값)
  {
    motif: 'N[AHNT]',
    pattern: /N[AHNT]/g,
    severity: 'medium',
    scope: 'cdr',
    penalty: 4,
    fixable: 'easy',
    note: '천천히 탈아미드화가 일어날 수 있는 자리예요.',
  },
  {
    motif: 'NP',
    pattern: /NP/g,
    severity: 'medium',
    scope: 'cdr',
    penalty: 4,
    fixable: 'easy',
    note: '천천히 탈아미드화가 일어날 수 있는 자리예요.',
  },
  {
    motif: 'TS',
    pattern: /TS/g,
    severity: 'medium',
    scope: 'cdr',
    penalty: 4,
    fixable: 'easy',
    note: '만들 때 잘림이 보고된 자리예요.',
  },
  // Low(−2 · §4.1(g)① 구현 확정값)
  {
    motif: '[STK]N',
    pattern: /[STK]N/g,
    severity: 'low',
    scope: 'cdr',
    penalty: 2,
    fixable: 'easy',
    note: '약하게 탈아미드화가 보고된 자리예요.',
  },
  // 응집 · 다중반응성(−3 · §4.1(g)① 구현 확정값)
  {
    motif: 'GG|RR|VG|VV|YY|WW|W.W',
    pattern: /GG|RR|VG|VV|YY|WW|W.W/g,
    severity: 'low',
    scope: 'cdr',
    penalty: 3,
    fixable: 'easy',
    note: '서로 엉겨 붙거나 여러 단백질에 달라붙기 쉬운 짝이에요.',
  },
  {
    motif: 'FHW',
    pattern: /FHW/g,
    severity: 'low',
    scope: 'cdr',
    penalty: 3,
    fixable: 'easy',
    note: '여러 단백질에 달라붙기 쉬운 짝이에요.',
  },
];

/**
 * **감점을 폐지하고 경고 라벨로만 쓰는 것**(§4.1c · §10 S3) — 노출도 정보 없이 Trp · Met 산화를 감점하는 것은 과해요.
 * 1판은 CDR 안 `W` · `M` 을 각 −8 로 깎았어요.
 */
export const OXIDATION_WATCH_AA = 'WM';

/** Cys 개수가 홀수거나 보존 Cys 가 없을 때의 감점(High 급) — 틀 수준 문제라 `hard` 예요. */
export const CYS_PENALTY = 8;

/** 양전하 패치 감점(§4.1c · §10 S4) — 전하 쌓기 꼼수의 반대급부예요. */
export const POSITIVE_PATCH_PENALTY = 10;

// ── 기름진 겉면 정도 · 양전하 패치 창 ─────────────────────────────────────────

/** 창 반폭 — `Σ_{|i-j| ≤ 5} H_i·H_j / (|i-j| + 1)²`(§3.2). */
export const GREASY_WINDOW = 5;

/** CDR **주변부** 폭 — CDR 과 그 양옆 몇 자리까지를 계산 범위로 볼지예요(원식도 CDR vicinity 한정이에요). */
export const CDR_VICINITY_PAD = 2;

/** 양전하 패치 — CDR 주변부 창에서 K · R 밀도를 재요. 상위 5% 문턱은 아래 참조 분포에서 뽑아요. */
export const POSITIVE_PATCH_WINDOW = 9;

// ── 백분위 밴드 ───────────────────────────────────────────────────────────────

/**
 * 백분위 → 점수 4단 밴드(§4.1b).
 * **z 감점(`100 − 25|z|`)을 쓰지 않아요** — 1판의 평균 · σ 가 자기 임계값 표와 모순이라
 * 원전이 정상으로 보는 항체를 감점했어요(§10 S7).
 */
export const PERCENTILE_BANDS: readonly { lo: number; hi: number; points: number }[] = [
  { lo: 0.25, hi: 0.75, points: 100 },
  { lo: 0.1, hi: 0.9, points: 70 },
  { lo: 0.05, hi: 0.95, points: 40 },
  { lo: 0, hi: 1, points: 10 },
];

/** 경고 라벨 문턱 — 자연 분포 바깥 2.5% 는 `alert`, 10% 는 `watch` 예요. */
export const RISK_ALERT_TAIL = 0.025;
export const RISK_WATCH_TAIL = 0.1;

/**
 * 참조 분포를 2.5% 간격 41칸 분위점으로 담아요(0% · 2.5% · … · 100%).
 * 값을 백분위로 바꿀 때 칸 사이를 직선으로 이어 읽어요(`percentileFromQuantiles`).
 */
export const QUANTILE_STEP = 0.025;
export const QUANTILE_KNOTS = 41;

/** 참조 분포가 어디서 나왔는지 — 화면 '점수 계산 방법' 과 배지 상세에 그대로 적어요. */
export const REFERENCE_SOURCE =
  'Thera-SAbDab(승인 치료항체 서열) 2026-10-24 내림 · 승인 `Whole mAb` 153종 가운데 여섯 CDR 을 모두 끊어 낸 151종의 VH·VL 로 우리가 직접 잰 분포예요. 원전 임계값을 베끼지 않았어요.';

/** 참조 분포를 만든 항체 수 — 설계 §4.1(f) 회귀 테스트 1 의 '승인 항체 50개 이상' 조건이에요. */
export const REFERENCE_ANTIBODY_COUNT = 151;

/* GENERATED:QUANTILES:START — `antibody-calibration.test.ts` 가 같은 값을 다시 재서 고정해요. */
/**
 * 기름진 겉면 정도(CDR 주변부 창 근사) 참조 분위점 — 승인 치료항체 151종의 **VH + VL 합** 이에요.
 * 0% · 2.5% · … · 100% 41칸이고, 중앙값 63.28 · 25% 60.60 · 75% 66.80 이에요(2026-10-24 측정).
 */
export const GREASY_REFERENCE_QUANTILES: readonly number[] = [
  51.4236, 54.8024, 56.577, 58.1144, 59.1961, 59.5201, 59.6881, 59.9512,
  60.2244, 60.3676, 60.6007, 60.6873, 60.8744, 61.0797, 61.1951, 61.3344,
  61.6024, 61.8518, 62.5639, 63.12, 63.2819, 63.7195, 63.8545, 64.2534,
  64.6001, 64.7392, 65.1286, 65.6737, 65.9154, 66.2, 66.8024, 67.3577,
  67.8658, 68.3799, 68.9549, 69.8195, 70.3281, 71.2619, 73.424, 74.9524,
  77.4857,
];

/**
 * 두 사슬 전하 궁합(pH 5.5 간단 전하의 곱) 참조 분위점 — 승인 치료항체 151종이에요.
 * 중앙값 0.10 · 25% −0.98 · 75% 3.20 이에요(2026-10-24 측정). **원전 임계값(−6.00 / −30.60)을 베끼지 않았어요**(§3.2 · §10 S6).
 */
export const CHAIN_CHARGE_PRODUCT_REFERENCE_QUANTILES: readonly number[] = [
  -14, -8.2425, -6.09, -4.895, -3.9, -3.02, -2.85, -2.075,
  -1.89, -1.35, -0.975, -0.77, -0.1, 0, 0, 0,
  0, 0, 0, 0.04, 0.1, 0.2075, 0.265, 0.325,
  0.8, 0.975, 1.15, 2.025, 2.31, 2.855, 3.2, 3.74,
  4.2, 4.2, 4.405, 5.3, 8.16, 8.5575, 9.3, 9.61,
  14.2,
];

/**
 * CDR 주변부 K·R 밀도(양전하 패치) 참조 분위점 — 승인 치료항체 151종의 VH · VL 가운데 큰 값이에요.
 * 창이 9칸이라 값이 9분의 n 으로만 나와요 — 그래서 감점 문턱은 백분위가 아니라 아래 `POSITIVE_PATCH_MIN_DENSITY` 로 둬요.
 */
export const POSITIVE_PATCH_REFERENCE_QUANTILES: readonly number[] = [
  0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.1111,
  0.1111, 0.1111, 0.1111, 0.1111, 0.1111, 0.2222, 0.2222, 0.2222,
  0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222,
  0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222, 0.2222,
  0.2222, 0.2222, 0.2222, 0.3333, 0.3333, 0.3333, 0.3333, 0.3333,
  0.4444,
];

/**
 * CDR 총길이(**IMGT 축** · H1+H2+H3+L1+L2+L3) 참조 분위점 — SAbDab 전체 요약(2026-10-24 · 쉼표 구분 CSV 17.5MB)에서
 * 여섯 CDR 이 모두 있는 17,944 줄로 쟀어요. 중앙값 51 · 2.5% 42 · 97.5% 63 이에요.
 * 참고 실측(IMGT): trastuzumab 47 · cetuximab 46 · pembrolizumab 51 — 설계 §3.2 의 숫자와 같아요.
 */
export const CDR_TOTAL_LENGTH_REFERENCE_QUANTILES: readonly number[] = [
  37, 42, 43, 44, 45, 45, 46, 46,
  47, 47, 47, 47, 48, 48, 49, 49,
  49, 50, 50, 50, 51, 51, 51, 52,
  52, 53, 53, 53, 53, 54, 54, 55,
  55, 56, 57, 58, 59, 60, 61, 63,
  104,
];

/**
 * 양전하 패치 감점 문턱 — **승인 항체 분포의 95% 분위(0.3333)보다 큰 가장 작은 실측 값**이에요.
 * 창이 9칸이라 밀도가 `n/9` 로만 나오고, 0.3333(3/9)에 승인 항체 20종이 몰려 있어요.
 * 그래서 '상위 5%' 를 백분위 비교로 자르면 13% 가 걸려요 — 대신 그 다음 칸(4/9)부터 감점해요.
 * 이 문턱으로 재면 승인 항체 151종 가운데 **2종(1.3%)** 만 걸려요(2026-10-24 측정).
 */
export const POSITIVE_PATCH_MIN_DENSITY = 0.4444;
/* GENERATED:QUANTILES:END */

/**
 * 분위점 표에서 값의 백분위(0~1)를 읽어요. 칸 사이는 직선으로 이어요.
 * 표가 비어 있으면 `null` — 없는 값을 0.5 로 꾸미지 않아요.
 */
export const percentileFromQuantiles = (value: number, knots: readonly number[]): number | null => {
  if (knots.length < 2) return null;
  const last = knots.length - 1;
  const first = knots[0] as number;
  const top = knots[last] as number;
  if (value <= first) return 0;
  if (value >= top) return 1;
  for (let i = 0; i < last; i += 1) {
    const lo = knots[i] as number;
    const hi = knots[i + 1] as number;
    if (value >= lo && value <= hi) {
      const span = hi - lo;
      const within = span === 0 ? 0 : (value - lo) / span;
      return (i + within) / last;
    }
  }
  return 1;
};

/** 백분위를 4단 밴드 점수로 바꿔요. */
export const bandPoints = (percentile: number): number => {
  for (const band of PERCENTILE_BANDS) {
    if (percentile >= band.lo && percentile <= band.hi) return band.points;
  }
  return 10;
};

// ── 점수 상수 ─────────────────────────────────────────────────────────────────

/**
 * 붙는 힘 — **기준점 65 의 절대 스케일**이에요(§4.1a).
 * 원본 그대로 제출하면 65 점이고, 계면 밖만 건드린 설계도 65 에서 움직이지 않아요.
 */
export const BIND_BASE = 65;
export const BIND_SLOPE = 12;

/** 전하쌍(K·R ↔ D·E) 기여 상한 — `±0.5·|raw|` 안으로 가두고 나머지와 더해요(§4.1a · §10 S4 · §12). */
export const CHARGE_PAIR_CAP = 0.5;

/**
 * 유효 변이 **1개가 움직일 수 있는 붙는 힘 폭**이에요(§12 · 2026-10-24 보강).
 * 붙는 힘은 `65 ± 3·m_eff` 안에 머물러요 — 그래서
 * ① 계면 한 자리를 큰 잔기로 바꾸는 것만으로 붙는 힘 가중치(30%)를 다 받지 못하고,
 * ② 한 글자 때문에 0 점까지 떨어지지도 않고,
 * ③ 유효 변이가 0개면 폭이 0 이라 **원본은 정확히 65** 예요.
 * **교육용 보호장치**이고 과학적 근거가 있는 항이 아니에요(§3.5 · 화면에도 그렇게 적어요).
 */
export const BIND_GAIN_PER_MUTATION = 3;

/** 계면 잔기쌍으로 보는 중원자 거리 — MJ 통계의 접촉 정의(측쇄 중심 약 6.5Å)와 **다르다**는 점이 단위를 못 붙이는 이유예요. */
export const INTERFACE_CUTOFF_ANGSTROM = 4.5;

/** 인간화 개선 — 원본 대비 변화만 봐요(절대 동일성은 표시만 · §4.1d). */
export const HUMANIZATION_BASE = 50;
export const HUMANIZATION_SLOPE = 5;

/** 사람 유전자 동일성 표시 밴드(§4.1d) — 55~70% 구간을 채운 2판 표예요. */
export const HUMANNESS_BANDS: readonly { min: number; word: string }[] = [
  { min: 85, word: '사람 수준' },
  { min: 70, word: '인간화' },
  { min: 55, word: '부분 인간화(키메라)' },
  { min: 0, word: '비인간' },
];

/** 유효 신규성 — `100·(1 − exp(−m_eff/4))·(1 − 0.5·중복비율) − 복제감점`(§4.1e). */
export const NOVELTY_TAU = 4;
export const NOVELTY_DUPLICATE_WEIGHT = 0.5;
/** 최근접 실측 항체 유사도가 100 이면(기존 항체 복제) −30, 유사도 문턱 70 미달이면(비현실) −20 이에요. */
export const NOVELTY_CLONE_PENALTY = 30;
export const NOVELTY_UNREALISTIC_PENALTY = 20;
export const NOVELTY_SIMILARITY_FLOOR = 70;

/** 설계 적합도 — `0.70·붙는힘 + 0.30·계면 유지항`(§4.2). 분모가 0 이면 붙는힘 가중치를 1.00 으로 재분배해요. */
export const FIT_BIND_WEIGHT = 0.7;
export const FIT_INTERFACE_WEIGHT = 0.3;

/** 표적별 σ 시뮬레이션 횟수 — 결정적 난수 1,000회예요(§4.1a). */
export const SIGMA_TRIALS = 1000;

/**
 * 표적 3종의 측정값 — **시드(묶음 4)가 `web.antibody_interfaces` 에 넣는 값의 기준**이에요.
 * 여기 적은 값은 2026-10-24 에 실제 PDB 를 파싱해 이 저장소 코드로 잰 값이고,
 * 설계서 §4.1 '보정 산출물(구현 때 측정)' 절에 같은 숫자를 적어 뒀어요.
 */
/* GENERATED:SIGMA:START */
export interface TargetCalibration {
  /** 참조 PDB. */
  pdb: string;
  /** 항체 사슬 · 항원 사슬(어느 조인지 포함). */
  chains: { set: string; H: string; L: string; AG: string };
  /** 계면 잔기쌍 수(중원자 ≤4.5Å · 원본 Fv 자리로 옮긴 뒤 센 수). */
  pairCount: number;
  /** 임의 CDR 단일 변이 1개의 `|raw|` 평균. */
  meanAbsRaw: number;
  /** `σ_target` — 같은 시뮬레이션(1,000회 · 결정적 난수)의 표준편차. */
  sigma: number;
}

/**
 * 표적 3종 측정값 — 2026-10-24 에 실제 PDB 를 이 저장소 코드로 파싱해 잰 값이에요.
 * 시드(묶음 4)가 `web.antibody_interfaces` 에 넣는 값의 기준이고, 설계서 §4.1 '보정 산출물' 절에 같은 숫자를 적어 뒀어요.
 * 씨앗 글자열은 `<표적>:<PDB>` 예요(`sigma.ts` 의 `seed`).
 */
export const TARGET_CALIBRATION: Readonly<Record<string, TargetCalibration>> = {
  EGFR: {
    pdb: '1YY9',
    chains: { set: '1', H: 'D', L: 'C', AG: 'A' },
    pairCount: 55,
    meanAbsRaw: 0.22959,
    sigma: 0.460759,
  },
  HER2: {
    pdb: '1N8Z',
    chains: { set: '1', H: 'B', L: 'A', AG: 'C' },
    pairCount: 42,
    meanAbsRaw: 0.15584,
    sigma: 0.343262,
  },
  VEGFR2: {
    pdb: '3S37',
    chains: { set: '1', H: 'H', L: 'L', AG: 'X' },
    pairCount: 57,
    meanAbsRaw: 0.27672,
    sigma: 0.498547,
  },
};
/* GENERATED:SIGMA:END */

// ── 제안 받기(ProteinMPNN 대체) ───────────────────────────────────────────────

/**
 * 변이체 자동 제안은 **교육용 근사**예요 — ProteinMPNN 계산이 아니에요(§3.3).
 * 과감함이 높을수록 한 번에 바꾸는 자리가 늘고, 비슷한 잔기 안에서만 고르는 제약이 풀려요.
 */
export const SUGGEST_MUTATIONS_BY_BOLDNESS: Readonly<Record<'conservative' | 'normal' | 'bold', number>> = {
  conservative: 1,
  normal: 2,
  bold: 3,
};

/** 과감함별로 '비슷한 잔기 안에서만' 고르는지 — 보수적일 때만 묶음 안으로 제한해요. */
export const SUGGEST_SIMILAR_ONLY: Readonly<Record<'conservative' | 'normal' | 'bold', boolean>> = {
  conservative: true,
  normal: false,
  bold: false,
};

/**
 * 성질이 비슷한 잔기 묶음 — 보수적 제안이 쓰는 표예요.
 * 출처: 아미노산 성질(전하 · 크기 · 소수성)로 묶은 교과서 분류예요. 치환 행렬 점수가 아니에요.
 */
export const AA_SIMILAR_GROUPS: readonly string[] = ['AGSTP', 'ILVM', 'FWY', 'DE', 'KRH', 'NQ', 'C'];

/** 제안에서 **절대 쓰지 않는 잔기** — 새 Cys 는 이황화 결합을 흐트러뜨려요(노트북 `omit_AAs:['C']` 와 같은 뜻). */
export const SUGGEST_OMIT_AA = 'C';

/** 길이를 바꾸는 설계(삽입 · 결손)는 1차에서 금지예요 — MSA 열이 밀려 다양성 값이 깨져요(§4.1e · §8 위험 8). */
export const SUBSTITUTION_ONLY = true;
