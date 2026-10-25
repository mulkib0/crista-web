/**
 * 1.1 질환 · 표적 선정 — 내 작업대 도구 5종 · 추천 서랍(설계 §5.4.2 · 시안 design/target-select-10.js).
 *
 * - 화면과 서버가 같은 규칙을 쓴다: 표적 8개 고르기(`targetShortlist`) · 준비 상태(`targetTier`) · 추천 근거 코치(`checkTargetPickReasons`) · 가중치(`pickWeightsOk`).
 * - 값은 모두 워커 `/datasets/targets`(Open Targets v4) 그대로다. 데이터가 없는 질환(§6.1.1 의 8종)은 이름 · 유전자 · PDB · 기준 약만 둔다 — 점수를 만들지 않는다.
 */
import type { DiseaseTargetsResponse } from './pipeline.ts';

export type TargetRow = DiseaseTargetsResponse['targets'][number];

// ── 근거 4종 · 준비 상태 ──

export type TargetEvidenceKey = 'geneticScore' | 'drugScore' | 'literatureScore' | 'expressionScore';
/** 근거 4종(순서 = 열지도 칸 · 가중치 슬라이더 · 누적 막대 순서). 색은 화면의 `--e1~--e4`. */
export const TARGET_EVIDENCE: ReadonlyArray<{ key: TargetEvidenceKey; label: string; head: string; desc: string }> = [
  { key: 'geneticScore', label: '유전', head: '변이', desc: '환자 변이가 모이나' },
  { key: 'drugScore', label: '약물', head: '기존 약', desc: '겨냥한 약이 있나' },
  { key: 'literatureScore', label: '문헌', head: '논문', desc: '논문에 함께 나오나' },
  { key: 'expressionScore', label: '발현', head: '조직 속 양', desc: '병든 조직에서 달라지나' },
];

/** 준비 상태 — ✓ 도킹 준비됨(결정구조 + 기준 약 + 재도킹 검증) · △ 구조만 있음 · ✗ 구조 없음. */
export type TargetTier = 'ready' | 'pdb' | 'none';
export const targetTier = (t: Pick<TargetRow, 'dockingTargetId' | 'pdbId'>): TargetTier => (t.dockingTargetId ? 'ready' : t.pdbId ? 'pdb' : 'none');
export const TARGET_TIER: Record<TargetTier, { mark: string; label: string; tone: 'good' | 'warn' | 'bad' }> = {
  ready: { mark: '✓', label: '도킹 준비됨', tone: 'good' },
  pdb: { mark: '△', label: '구조만 있음', tone: 'warn' },
  none: { mark: '✗', label: '구조 없음', tone: 'bad' },
};

/** 도구가 쓰는 질환당 표적 수. */
export const TARGETS_PER_DISEASE = 8;

/**
 * 표적 8개 — 워커 `rank` 1~8(rank 1 = 그 질환의 대표 도킹 표적, 2~8 = 종합 점수 상위 7)을 종합 점수 순으로 다시 줄 세운다.
 * **그 질환의 도킹 준비 표적은 모두 목록에 둔다** — 8개 안에 없는 표적은 점수가 가장 낮은 자리를 밀어내고 들어온다
 * (고를 수 있는 표적이 목록에서 빠지면 1.1 에서 보이지 않는다).
 */
export function targetShortlist(targets: readonly TargetRow[]): TargetRow[] {
  const picked = [...targets].sort((a, b) => a.rank - b.rank).slice(0, TARGETS_PER_DISEASE);
  for (const ready of targets.filter((t) => t.dockingTargetId)) {
    if (picked.includes(ready)) continue;
    // 점수가 가장 낮은 '도킹 준비 안 된' 줄을 내보낸다 — 열려 있는 표적끼리는 밀어내지 않는다.
    const drop = picked.reduce<{ i: number; score: number } | null>(
      (low, t, i) => (t.dockingTargetId || (low && low.score <= t.overallScore) ? low : { i, score: t.overallScore }),
      null,
    );
    if (drop) picked[drop.i] = ready;
    else picked.push(ready);
  }
  return picked.sort((a, b) => b.overallScore - a.overallScore);
}

// ── ③ 내 점수(가중치) ──

/** 가중치 — 근거 4종마다 0~3, 0.5 단위. 모두 0 이면 점수가 없다. */
export const PICK_WEIGHT = { min: 0, max: 3, step: 0.5 } as const;
export const PICK_WEIGHT_PRESETS: ReadonlyArray<{ label: string; weights: readonly [number, number, number, number] }> = [
  { label: '똑같이', weights: [1, 1, 1, 1] },
  { label: '유전만', weights: [3, 0, 0, 0] },
  { label: '약물 · 문헌만', weights: [0, 3, 3, 0] },
  { label: '약물 · 발현', weights: [0, 3, 0, 3] },
];

export function pickWeightsOk(raw: unknown): raw is number[] {
  return (
    Array.isArray(raw) &&
    raw.length === TARGET_EVIDENCE.length &&
    raw.every((w) => typeof w === 'number' && Number.isFinite(w) && w >= PICK_WEIGHT.min && w <= PICK_WEIGHT.max && Number.isInteger(w / PICK_WEIGHT.step)) &&
    raw.some((w) => w > 0)
  );
}

/** 내 점수 = Σ(근거 × 가중치) ÷ Σ가중치(0~1). */
export function myTargetScore(t: TargetRow, weights: readonly number[]): number {
  const sum = weights.reduce((a, w) => a + w, 0);
  return sum ? TARGET_EVIDENCE.reduce((a, e, k) => a + (weights[k] ?? 0) * t[e.key], 0) / sum : 0;
}

// ── 추천 근거 + 코치 ──

export type TargetPickReasonId = 'ready' | 'score' | 'gen' | 'drug' | 'expr' | 'free';

/** 코치 판정에 쓰는 바깥 사실. `takenBy` 를 모르면(undefined) '다른 모둠' 근거는 주의로 짚는다. */
export interface TargetPickContext {
  /** 그 질환 표적 8개 중 종합 점수 순위(1부터). */
  rank: number;
  /** 이 질환을 이미 고른 다른 모둠 이름 — null = 없음, undefined = 모름. */
  takenBy?: string | null;
}

/** 'warn' = 주의(올릴 수 있다) · 'block' = 막음(데이터와 틀림 — 올릴 수 없다). 맞으면 null. */
export interface TargetPickCheck {
  status: 'warn' | 'block';
  message: string;
}

const f2 = (v: number) => v.toFixed(2);
/** 받침 있으면 a, 없으면 b(한글 끝 글자만 본다 — 아니면 b). */
const josa = (w: string, a: string, b: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 ? a : b;
};

export const TARGET_PICK_REASONS: ReadonlyArray<{ id: TargetPickReasonId; label: string; check: (t: TargetRow, ctx: TargetPickContext) => TargetPickCheck | null }> = [
  {
    id: 'ready',
    label: '결정구조와 기준 약이 있어 바로 도킹할 수 있어요',
    check: (t) => (targetTier(t) === 'ready' ? null : { status: 'block', message: `${t.symbol} 는 도킹 준비가 안 됐어요 — ${TARGET_TIER[targetTier(t)].label}` }),
  },
  {
    id: 'score',
    label: '이 질환에서 종합 점수가 높아요',
    check: (_t, ctx) => (ctx.rank <= 3 ? null : { status: 'warn', message: `종합 점수는 ${TARGETS_PER_DISEASE}개 중 ${ctx.rank}위예요` }),
  },
  {
    id: 'gen',
    label: '환자 유전자 변이 근거가 강해요',
    check: (t) =>
      t.geneticScore >= 0.85 ? null
        : t.geneticScore > 0.5 ? { status: 'warn', message: `유전 근거 ${f2(t.geneticScore)} — 아주 강하진 않아요` }
          : { status: 'block', message: `유전 근거 ${f2(t.geneticScore)} — 변이 근거가 거의 없어요` },
  },
  {
    id: 'drug',
    label: '이미 약이 있는 표적이라 견줄 잣대가 있어요',
    check: (t) => (t.drugScore >= 0.9 ? null : { status: 'block', message: `약물 근거 ${f2(t.drugScore)} — 기존 약이 없거나 약해요` }),
  },
  {
    id: 'expr',
    label: '병든 조직에서 발현 변화가 뚜렷해요',
    check: (t) =>
      t.expressionScore >= 0.6 ? null
        : t.expressionScore >= 0.3 ? { status: 'warn', message: `발현 근거 ${f2(t.expressionScore)} — 뚜렷하진 않아요` }
          : { status: 'block', message: `발현 근거 ${f2(t.expressionScore)} — 발현 변화 근거가 없어요` },
  },
  {
    id: 'free',
    label: '다른 모둠이 아직 안 고른 질환이라서',
    check: (_t, ctx) =>
      ctx.takenBy === undefined ? { status: 'warn', message: '다른 모둠이 고른 질환은 전광판 공개 서랍에서 확인해 보세요' }
        : ctx.takenBy ? { status: 'warn', message: `${ctx.takenBy}${josa(ctx.takenBy, '이', '가')} 이미 이 질환을 골랐어요(전광판)` }
          : null,
  },
];

export const TARGET_PICK_REASON_IDS = TARGET_PICK_REASONS.map((r) => r.id);
export const isTargetPickReason = (id: unknown): id is TargetPickReasonId => typeof id === 'string' && (TARGET_PICK_REASON_IDS as string[]).includes(id);
export const targetPickReasonLabel = (id: string): string => TARGET_PICK_REASONS.find((r) => r.id === id)?.label ?? id;

/** 고른 근거마다 코치 판정(맞으면 check = null). 모르는 id 는 건너뛴다. */
export function checkTargetPickReasons(ids: readonly string[], t: TargetRow, ctx: TargetPickContext): Array<{ id: TargetPickReasonId; check: TargetPickCheck | null }> {
  return TARGET_PICK_REASONS.filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, check: r.check(t, ctx) }));
}

/** 추천 서랍의 한 줄 이유 — 화면 입력 상한(서버 저장 상한은 `PICK_NOTE_MAX` 200). */
export const PICK_REASON_NOTE_MAX = 90;

/** `POST /api/program/picks` — 근거가 빈 요청(앞 판 화면)도 받는다. `targetId` 를 보내면 질환의 도킹 표적과 같은지만 본다. */
export interface TargetPickRequest {
  diseaseId: string;
  targetId?: string;
  reasons?: string[];
  weights?: number[] | null;
  note?: string | null;
}

// ── 12대 질환 카탈로그(§6.1.1) — 데이터가 있는 질환만 열린다 ──

export interface TargetDiseaseTile {
  mondoId: string;
  name: string;
  /** 타일 · 칩에 쓰는 짧은 이름. */
  short: string;
  gene: string;
  pdbId: string;
  reference: string;
  blurb?: string;
}

export const TARGET_DISEASE_GROUPS: ReadonlyArray<{ no: string; title: string; sub: string; diseases: readonly TargetDiseaseTile[] }> = [
  {
    no: 'Ⅰ', title: '신경계', sub: '뇌까지 가는 약 · BBB 필수',
    diseases: [
      { mondoId: 'MONDO_0004975', name: '알츠하이머병', short: '알츠하이머', gene: 'ACHE', pdbId: '4EY7', reference: '도네페질', blurb: '기억이 흐려지는 뇌 질환. 약이 뇌혈관 장벽을 넘어야 해요.' },
      { mondoId: 'MONDO_0005180', name: '파킨슨병', short: '파킨슨', gene: 'MAOB', pdbId: '2V5Z', reference: '사피나미드' },
      { mondoId: 'MONDO_0002009', name: '주요우울장애', short: '우울장애', gene: 'SLC6A4', pdbId: '5I71', reference: '에스시탈로프람' },
    ],
  },
  {
    no: 'Ⅱ', title: '종양 · 항암', sub: '암세포의 신호를 끊는 표적항암제',
    diseases: [
      { mondoId: 'MONDO_0005233', name: '비소세포폐암', short: '비소세포폐암', gene: 'EGFR', pdbId: '1M17', reference: '엘로티닙', blurb: "폐암의 대부분. 암세포가 '자라라'는 신호를 받는 수용체를 막아요." },
      { mondoId: 'MONDO_0011996', name: '만성 골수성 백혈병', short: '백혈병', gene: 'ABL1', pdbId: '2HYY', reference: '이마티닙' },
      { mondoId: 'MONDO_0005105', name: '전이성 흑색종', short: '흑색종', gene: 'BRAF', pdbId: '3OG7', reference: '베무라페닙' },
    ],
  },
  {
    no: 'Ⅲ', title: '대사 · 심혈관', sub: '오래 먹는 약 · 안전이 먼저',
    diseases: [
      { mondoId: 'MONDO_0005148', name: '2형 당뇨병', short: '2형 당뇨', gene: 'DPP4', pdbId: '1X70', reference: '시타글립틴', blurb: '혈당이 조절되지 않는 만성 질환. 평생 먹는 약이라 안전이 먼저예요.' },
      { mondoId: 'MONDO_0021187', name: '고지혈증', short: '고지혈증', gene: 'HMGCR', pdbId: '1HWK', reference: '아토르바스타틴' },
      { mondoId: 'MONDO_0005399', name: '정맥혈전색전증', short: '혈전색전증', gene: 'F10', pdbId: '2P16', reference: '아픽사반' },
    ],
  },
  {
    no: 'Ⅳ', title: '면역 · 염증 · 호흡기', sub: '먹는 약 · 바르는 약 · 흡입약',
    diseases: [
      { mondoId: 'MONDO_0008383', name: '류마티스 관절염', short: '류마티스', gene: 'PTGS2', pdbId: '3LN1', reference: '세레콕시브', blurb: '면역이 내 관절을 공격하는 염증. 통증과 염증을 줄이는 약이에요.' },
      { mondoId: 'MONDO_0004980', name: '아토피 피부염', short: '아토피', gene: 'JAK1', pdbId: '6BBU', reference: '아브로시티닙' },
      { mondoId: 'MONDO_0004979', name: '천식 · COPD', short: '천식 · COPD', gene: 'PDE4B', pdbId: '1XMU', reference: '로플루밀라스트' },
    ],
  },
];

/** 질환 → 질환군 번호(0~3) · 타일. 카탈로그에 없으면 undefined. */
export function targetDiseaseTile(diseaseId: string): { group: number; tile: TargetDiseaseTile } | undefined {
  for (const [group, g] of TARGET_DISEASE_GROUPS.entries()) {
    const tile = g.diseases.find((d) => d.mondoId === diseaseId);
    if (tile) return { group, tile };
  }
  return undefined;
}

/** 도킹 표적 4종의 결정 리간드 코드 · 재도킹 RMSD(Å, crista 재도킹 검증 값 — 시안 `TG`). */
export const TARGET_REDOCK: Record<string, { ligand: string; rmsd: number }> = {
  'ache-4ey7': { ligand: 'E20', rmsd: 0.82 },
  'egfr-1m17': { ligand: 'AQ4', rmsd: 1.33 },
  'alk-2xp2': { ligand: 'VGH', rmsd: 1.16 },
  'erbb2-3pp0': { ligand: '03Q', rmsd: 0.73 },
  'dpp4-1x70': { ligand: '715', rmsd: 0.8 },
  'gck-1v4s': { ligand: 'MRK', rmsd: 0.67 },
  'cox2-3ln1': { ligand: 'CEL', rmsd: 0.51 },
};

/** 표적 한글 이름(시안 `KO`) — 없으면 워커의 영어 이름을 쓴다. */
export const TARGET_KO_NAME: Record<string, string> = {
  ACHE: '아세틸콜린 분해 효소', APP: '아밀로이드 전구 단백질', PSEN1: '프레세닐린 1', PSEN2: '프레세닐린 2', APOE: '아포지단백 E', ABCA7: '지질 운반 단백질 A7', SORL1: '소르틸린 관련 수용체', GRIN1: 'NMDA 수용체 소단위 1',
  EGFR: '상피세포 성장인자 수용체', KRAS: 'KRas GTP 분해 효소', ALK: 'ALK 수용체 티로신 키나아제', ERBB2: 'HER2 수용체', ROS1: 'ROS1 수용체 티로신 키나아제', MET: 'MET 수용체 티로신 키나아제', DICER1: '다이서 1 리보핵산 분해 효소', RET: 'RET 수용체 티로신 키나아제',
  DPP4: '디펩티딜 펩티다아제-4', KCNJ11: '칼륨 통로 소단위 Kir6.2', ABCC8: '설포닐우레아 수용체 1', GCK: '글루코키나아제', PPARG: 'PPAR 감마 수용체', HNF1A: '간세포 핵인자 1α', HNF4A: '간세포 핵인자 4α', HNF1B: '간세포 핵인자 1β',
  PTGS2: '사이클로옥시게나아제-2', TYK2: '티로신 키나아제 2', IL6R: '인터루킨 6 수용체', IL12B: '인터루킨 12B', JAK1: '야누스 키나아제 1', TRAF3IP2: 'TRAF3 상호작용 단백질 2', TNF: '종양 괴사 인자', PADI4: '펩티딜 아르기닌 탈이민 효소 4',
};
export const targetKoName = (t: Pick<TargetRow, 'symbol' | 'name'>): string => TARGET_KO_NAME[t.symbol] ?? t.name;
