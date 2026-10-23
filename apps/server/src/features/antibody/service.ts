/**
 * 항체 랩 서비스(설계 §5.3 · §5.4 · §5.5 · §5.7) — 화면 한 장 응답 · 프로그램 확정 · 설계 · 미리보기 · 노트 · 제출.
 *
 * 쓰던 것을 그대로 쓴다(§11.1): 과금은 `ledger.ts` 의 `charge`, 모둠 확인은 `pipeline.ts` 의 `teamMember` ·
 * `ensureTeamRows` · `notifyTeam`, 게임 날짜는 `clock.ts` 의 `currentGameDay`, 소식 · 기업가치는 `events.ts` 한 곳.
 * **이 파일들을 고치지 않는다.**
 *
 * 자리 축(§묶음 3 약속): `mutations[].pos` · `CdrSpan.start/end` 는 **1부터 세는 Fv 서열 자리**다. IMGT 번호가 아니다.
 *
 * 다양성 방향(구현 결정 · 묶음 3 ↔ 묶음 5 어긋남 해소): 묶음 3 의 `DiversityResult.grades` 는 '9 = 가장 많이 갈리는 자리'이고,
 * 화면 범례(`antibody/terms.ts` 의 `DIVERSITY_LEGEND`)는 '9 = 거의 모두 같은 아미노산 = 고정 권장'이다.
 * 학생에게 보이는 범례를 기준으로, **응답에 담는 `DiversityView.grades` · `percentiles` 는 뒤집어 넣는다**
 * (높을수록 '대부분 같은 자리'). 잠그는 자리 판정은 늘 묶음 3 의 `isLocked`(원래 축)으로 하고 결과만 뒤집는다.
 */
import {
  ANTIBODY_FORMULA_VERSION,
  ANTIBODY_JOB_STEPS,
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_STEP_COST_CRISTA,
  ANTIBODY_STEP_IDS,
  ANTIBODY_STEP_META,
  ANTIBODY_STEP_REQUIRES,
  CONFIDENCE_MIN_FOR_COMPLEX,
  DESIGN_SLOTS_PER_PERSON,
  TRACK_IDS,
  NOTE_SECTIONS,
  SCORE_THRESHOLD_MARGIN,
  cristaToCents,
  normalizeSeq,
  scoreWeightsOk,
  type AbChain,
  type AccountView,
  type AntibodyBoardResponse,
  type AntibodyBoldness,
  type AntibodyJobStep,
  type AntibodyJobView,
  type AntibodyMutation,
  type AntibodyNewsLine,
  type AntibodyNoteView,
  type AntibodyProgramView,
  type AntibodyScoreWeights,
  type AntibodyStepId,
  type AntibodyStepView,
  type AntibodySubmitResponse,
  type Avatar,
  type CdrScheme,
  type CdrSpan,
  type ComplexView,
  type DesignView,
  type DiversityView,
  type FoldView,
  type TrackId,
  type NoteSection,
  type PreviewMetrics,
  type Provenance,
  type ScoreView,
  type StepState,
} from '@crista-web/web-contract';
import { currentGameDay } from '../../clock.ts';
import type { Deps } from '../../context.ts';
import { isUniqueViolation, withTx, type Queryable, type Tx } from '../../db.ts';
import { ApiError, badRequest } from '../../http.ts';
import { balanceCents, charge } from '../../ledger.ts';
import { ensureTeamRows, notifyTeam, teamMember } from '../../pipeline.ts';
import { loadTeam } from '../../views.ts';
import { chainChargeProduct, isoelectricPoint, netCharge } from './charge.ts';
import {
  CHAIN_CHARGE_PRODUCT_REFERENCE_QUANTILES,
  percentileFromQuantiles,
} from './constants.ts';
import { isLocked } from './diversity.ts';
import { germlineIdentity } from './germline-identity.ts';
import { greasyPercentile, greasySurface, negativePatchDensity, positivePatchDensity } from './greasy.ts';
import { seqHash } from './hash.ts';
import { findLiabilities } from './liabilities.ts';
import { resolveNumbering } from './numbering.ts';
import { antibodyRiskFlags, antibodyScore, effectiveMutations, type ScoreInput } from './score.ts';
import { suggestVariants } from './suggest.ts';
import { loadValuation, postAntibodyEvent } from './events.ts';
import { postAntibodyProcess } from './process.ts';

// ── 상수 ──

/** 작업 비용(센트) — A2 · A4 는 무료, A5 는 500,000 크리스타(§2.1 · §10 S15). */
export const ANTIBODY_COSTS: Record<AntibodyJobStep, number> = {
  A2: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A2),
  A4: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A4),
  A5: cristaToCents(ANTIBODY_STEP_COST_CRISTA.A5),
};
/** A6 제출(보고서) — 1,000,000 크리스타. */
export const ANTIBODY_SUBMIT_COST_CENTS = cristaToCents(ANTIBODY_STEP_COST_CRISTA.A6);
/** 모둠이 동시에 돌릴 수 있는 항체 작업 수. */
export const ANTIBODY_TEAM_ACTIVE_MAX = 2;
/** 사람별 상한 — 접기 1건 · 평가 1건(DB 부분 유일 색인이 막는다). */
export const MY_JOB_MAX: Record<'A4' | 'A5', number> = { A4: 1, A5: 1 };
/** 기본 번호 매김 스킴. */
export const DEFAULT_SCHEME: CdrScheme = 'imgt';

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

// ── 모둠 · 버전 ──

export interface AbWho {
  account: AccountView;
  classId: string;
  teamId: string;
  avatar: Avatar | null;
}

export interface AbRevision {
  revisionId: string;
  revisionNo: number;
  version: number;
  antigenTarget: string | null;
  parentAntibodyName: string | null;
  parentAntibodyChemblId: string | null;
  referencePdb: string | null;
  chainRoles: Record<string, string>;
  parentVh: string | null;
  parentVl: string | null;
  parentScore: number | null;
  threshold: number | null;
  sigmaTarget: number | null;
}

/** 프로그램이 확정됐나 — 표적 · 원본 항체 · 레퍼런스 구조 · 원본 중쇄가 모두 있어야 A2 가 열린다. */
export const programConfirmed = (r: AbRevision): boolean =>
  r.antigenTarget !== null && r.parentAntibodyChemblId !== null && r.referencePdb !== null && r.parentVh !== null;

/**
 * 항체 랩 행 준비 — **맨 먼저 `ensureTeamRows`** 를 부른다(§5.7 · §10 F3).
 * 저분자 화면을 한 번도 열지 않은 모둠은 초기 연구비 원장 줄(`initial`)이 없어 첫 유료 작업이 402 가 된다.
 */
export async function ensureAntibodyRows(db: Queryable, teamId: string): Promise<void> {
  await ensureTeamRows(db, teamId);
  await db.query('insert into web.antibody_programs (team_id) values ($1) on conflict (team_id) do nothing', [teamId]);
  await db.query(
    `insert into web.antibody_revisions (team_id, revision_no)
     select p.team_id, p.revision_no from web.antibody_programs p where p.team_id = $1
     on conflict (team_id, revision_no) do nothing`,
    [teamId],
  );
}

interface ProgramRow {
  revision_no: number;
  version: number;
  antigen_target: string | null;
  parent_antibody_chembl_id: string | null;
  parent_antibody_name: string | null;
  reference_pdb: string | null;
  chain_roles: Record<string, string>;
  parent_vh: string | null;
  parent_vl: string | null;
  revision_id: string;
  parent_score: number | null;
  threshold: number | null;
  sigma_target: string | null;
}

const PROGRAM_SELECT = `
  select p.revision_no, p.version, p.antigen_target, p.parent_antibody_chembl_id, p.parent_antibody_name,
         p.reference_pdb, p.chain_roles, p.parent_vh, p.parent_vl,
         r.id as revision_id, r.parent_score, r.threshold, r.sigma_target
    from web.antibody_programs p
    join web.antibody_revisions r on r.team_id = p.team_id and r.revision_no = p.revision_no
   where p.team_id = $1`;

const revisionOf = (row: ProgramRow): AbRevision => ({
  revisionId: row.revision_id,
  revisionNo: row.revision_no,
  version: row.version,
  antigenTarget: row.antigen_target,
  parentAntibodyName: row.parent_antibody_name,
  parentAntibodyChemblId: row.parent_antibody_chembl_id,
  referencePdb: row.reference_pdb,
  chainRoles: row.chain_roles ?? {},
  parentVh: row.parent_vh,
  parentVl: row.parent_vl,
  parentScore: row.parent_score,
  threshold: row.threshold,
  sigmaTarget: row.sigma_target === null ? null : Number(row.sigma_target),
});

/** 지금 버전 — 없으면 만든다(화면 · 접수 양쪽에서 부른다). */
export async function loadRevision(db: Queryable, teamId: string): Promise<AbRevision> {
  let result = await db.query<ProgramRow>(PROGRAM_SELECT, [teamId]);
  if (!result.rows[0]) {
    await ensureAntibodyRows(db, teamId);
    result = await db.query<ProgramRow>(PROGRAM_SELECT, [teamId]);
  }
  const row = result.rows[0];
  if (!row) throw new ApiError(500, 'internal', '항체 랩 프로그램 행을 만들지 못했어요.');
  return revisionOf(row);
}

/** 접수 트랜잭션용 — 모둠 줄을 잠근 뒤 버전을 읽는다. */
export async function lockedRevision(tx: Tx, teamId: string): Promise<AbRevision> {
  await tx.query('select id from web.teams where id = $1 for update', [teamId]);
  await ensureAntibodyRows(tx, teamId);
  const result = await tx.query<ProgramRow>(PROGRAM_SELECT, [teamId]);
  const row = result.rows[0];
  if (!row) throw new ApiError(500, 'internal', '항체 랩 프로그램 행을 만들지 못했어요.');
  return revisionOf(row);
}

export const programView = (r: AbRevision): AntibodyProgramView => ({
  revisionId: r.revisionId,
  revisionNo: r.revisionNo,
  version: r.version,
  ...(r.antigenTarget ? { antigenTarget: r.antigenTarget } : {}),
  ...(r.parentAntibodyName ? { parentAntibodyName: r.parentAntibodyName } : {}),
  ...(r.parentAntibodyChemblId ? { parentAntibodyChemblId: r.parentAntibodyChemblId } : {}),
  ...(r.referencePdb ? { referencePdb: r.referencePdb } : {}),
  ...(r.chainRoles && r.chainRoles.H ? { chainRoles: { set: r.chainRoles.set ?? '1', H: r.chainRoles.H, ...(r.chainRoles.L ? { L: r.chainRoles.L } : {}), ...(r.chainRoles.AG ? { AG: r.chainRoles.AG } : {}) } } : {}),
  ...(r.parentVh ? { parentVh: r.parentVh } : {}),
  ...(r.parentVl ? { parentVl: r.parentVl } : {}),
});

// ── 교사 학급 설정 ──

export interface AbSettings {
  weights: AntibodyScoreWeights;
  thresholds: { scoreMargin: number; confidenceMin: number };
  openTracks: TrackId[];
  version: number;
}

/**
 * 트랙 축은 기반 `track.ts` 의 `TrackId`(`drug` · `antibody`) 하나다. 그런데 0020 의
 * `antibody_class_settings.open_tracks` check 는 `{small,antibody}` 로 굳어 있고 0020 은 고치지 않는 파일이다
 * (항체 설계 §11.4). 그래서 **DB 경계에서만** 이름을 옮긴다 — 저장 값은 그대로 두고 코드는 한 축만 쓴다.
 */
export const trackFromDb = (v: string): TrackId | null => (v === 'small' ? 'drug' : v === 'antibody' ? 'antibody' : null);
export const trackToDb = (t: TrackId): string => (t === 'drug' ? 'small' : t);

export const DEFAULT_SETTINGS: AbSettings = {
  weights: ANTIBODY_SCORE_WEIGHTS,
  thresholds: { scoreMargin: SCORE_THRESHOLD_MARGIN, confidenceMin: CONFIDENCE_MIN_FOR_COMPLEX },
  openTracks: [...TRACK_IDS],
  version: 1,
};

export async function loadSettings(db: Queryable, classId: string): Promise<AbSettings> {
  const result = await db.query<{ weights: AntibodyScoreWeights; thresholds: { scoreMargin?: number; confidenceMin?: number }; open_tracks: string[]; version: number }>(
    'select weights, thresholds, open_tracks, version from web.antibody_class_settings where class_id = $1',
    [classId],
  );
  const row = result.rows[0];
  if (!row) return DEFAULT_SETTINGS;
  const weights = scoreWeightsOk(row.weights) ? row.weights : ANTIBODY_SCORE_WEIGHTS;
  return {
    weights,
    thresholds: {
      scoreMargin: Number.isFinite(row.thresholds?.scoreMargin) ? Number(row.thresholds.scoreMargin) : SCORE_THRESHOLD_MARGIN,
      confidenceMin: Number.isFinite(row.thresholds?.confidenceMin) ? Number(row.thresholds.confidenceMin) : CONFIDENCE_MIN_FOR_COMPLEX,
    },
    openTracks: row.open_tracks.map(trackFromDb).filter((t): t is TrackId => t !== null),
    version: row.version,
  };
}

// ── 미리보기 지표(§5.5 POST /preview · 설계 카드) ──

const SERVER_CALC: Provenance = {
  source: 'server-calc',
  label: '센 값',
  detail: '순전하 · pI · CDR 길이 · 약점 모티프 · 사람 유전자 동일성은 서열에서 그대로 센 값이에요. 같은 서열이면 늘 같은 값이에요.',
  approx: false,
};

const EDU_APPROX: Provenance = {
  source: 'edu-approx',
  label: '교육용 근사',
  detail: '기름진 겉면 정도 · 전하 궁합 백분위는 승인 항체 분포와 서열 창으로 대신 계산한 값이라 원전 값과 달라요. 순위만 보세요.',
  approx: true,
};

export interface PreviewParts {
  metrics: PreviewMetrics;
  cdrs: CdrSpan[];
  /** 점수 계산에 그대로 넘기는 중간값. */
  raw: {
    greasyPercentile: number | null;
    chainChargePercentile: number | null;
    pi: number;
    liabilities: ReturnType<typeof findLiabilities>['hits'];
    positivePatch: boolean;
    humanPercent: number | null;
    nearestGermline: string | null;
  };
}

/** 서열만으로 낼 수 있는 모든 값 — 무료 · 결정적. 네트워크를 쓰지 않는다. */
export function computePreview(vhRaw: string, vlRaw: string | undefined, scheme: CdrScheme = DEFAULT_SCHEME): PreviewParts {
  const vh = normalizeSeq(vhRaw);
  const vl = vlRaw && vlRaw.trim() !== '' ? normalizeSeq(vlRaw) : undefined;

  const hNum = resolveNumbering({ seq: vh, chain: 'H', scheme });
  const lNum = vl ? resolveNumbering({ seq: vl, chain: 'L', scheme }) : null;
  const cdrs: CdrSpan[] = [...hNum.cdrs, ...(lNum?.cdrs ?? [])];

  const liab = findLiabilities(vh, vl, cdrs);
  const chargeVh = netCharge(vh, 7.4);
  const chargeVl = vl ? netCharge(vl, 7.4) : undefined;
  const product = chainChargeProduct(vh, vl);
  const pi = isoelectricPoint(vh);
  const greasy = greasySurface(vh, cdrs.filter((c) => c.chain === 'H'));
  const greasyPct = greasy === null ? null : greasyPercentile(greasy);
  const posPatch = positivePatchDensity(vh, cdrs.filter((c) => c.chain === 'H'));
  const negPatch = negativePatchDensity(vh, cdrs.filter((c) => c.chain === 'H'));
  const chainChargePct = product === null ? null : percentileFromQuantiles(product, CHAIN_CHARGE_PRODUCT_REFERENCE_QUANTILES);
  const human = germlineIdentity(vh, 'H');
  const cdrTotal = cdrs.reduce((sum, c) => sum + (c.end - c.start + 1), 0);

  const metrics: PreviewMetrics = {
    liabilities: liab.hits.map((h) => ({ motif: h.motif, severity: h.severity, chain: h.chain, pos: h.pos, fixable: h.fixable })),
    chargeVh: Number(chargeVh.toFixed(2)),
    ...(chargeVl !== undefined ? { chargeVl: Number(chargeVl.toFixed(2)) } : {}),
    ...(product !== null ? { chainChargeProduct: Number(product.toFixed(2)) } : {}),
    pi: Number(pi.toFixed(2)),
    greasySurface: greasy === null ? 0 : Number(greasy.toFixed(4)),
    greasyPercentile: greasyPct === null ? 0 : Number(greasyPct.toFixed(4)),
    cdrTotalLength: cdrTotal,
    humanness: {
      percent: human === null ? 0 : Number(human.percent.toFixed(2)),
      nearestGermline: human?.nearestGermline ?? '—',
      deltaVsParent: 0,
    },
    riskFlags: antibodyRiskFlags({
      cdrTotalLength: cdrs.length > 0 ? cdrTotal : null,
      greasySurface: greasy,
      greasyPercentile: greasyPct,
      chainChargeProduct: product,
      chainChargePercentile: chainChargePct,
      positivePatchDensity: posPatch,
      negativePatchDensity: negPatch,
    }),
    provenance: [SERVER_CALC, EDU_APPROX],
  };

  return {
    metrics,
    cdrs,
    raw: {
      greasyPercentile: greasyPct,
      chainChargePercentile: chainChargePct,
      pi,
      liabilities: liab.hits,
      positivePatch: posPatch !== null && posPatch >= 0.4444,
      humanPercent: human?.percent ?? null,
      nearestGermline: human?.nearestGermline ?? null,
    },
  };
}

// ── 설계 ──

interface DesignRow {
  id: string;
  label: string;
  vh: string;
  vl: string | null;
  seq_hash: string;
  mutations: AntibodyMutation[];
  origin: DesignView['origin'];
  slot: number | null;
  preview: PreviewMetrics | null;
  display_name: string | null;
  created_at: Date;
}

const DESIGN_SELECT = `
  select d.id, d.label, d.vh, d.vl, d.seq_hash, d.mutations, d.origin, d.slot, d.preview, a.display_name, d.created_at
    from web.antibody_designs d left join web.accounts a on a.user_id = d.designed_by
   where d.revision_id = $1 order by d.created_at`;

const designProvenance = (origin: DesignView['origin']): Provenance =>
  origin === 'nim'
    ? {
        source: 'ai-predict',
        label: '실제 계산(ProteinMPNN)',
        detail: '서열 설계 모형 ProteinMPNN(NVIDIA NIM)이 실제로 돌아서 낸 치환이에요(§3.3). 실제로 더 잘 붙는지는 확인해야 해요.',
        approx: false,
      }
    : origin === 'suggested'
      ? {
          source: 'edu-approx',
          label: '규칙 제안',
          detail: '교육용 규칙(CDR 안 · 비슷한 성질 · 계면 가까움)으로 고른 치환이에요. ProteinMPNN 계산이 아니에요(§3.3).',
          approx: true,
        }
      : origin === 'parent'
        ? { source: 'lookup', label: '실측 서열', detail: 'ChEMBL 에서 받은 원본 항체의 가변영역 서열이에요.', approx: false }
        : { source: 'server-calc', label: '모둠이 만든 설계', detail: '모둠원이 직접 고른 치환이에요. 지표는 서열에서 센 값이에요.', approx: false };

const designView = (row: DesignRow): DesignView => ({
  id: row.id,
  label: row.label,
  vh: row.vh,
  ...(row.vl ? { vl: row.vl } : {}),
  seqHash: row.seq_hash,
  mutations: row.mutations ?? [],
  origin: row.origin,
  ...(row.display_name ? { byName: row.display_name } : {}),
  ...(row.slot === 1 || row.slot === 2 ? { slot: row.slot as 1 | 2 } : {}),
  ...(row.preview ? { preview: row.preview } : {}),
  provenance: designProvenance(row.origin),
});

const checkLabel = (raw: unknown): string => {
  const label = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (label.length < 1 || [...label].length > 40) throw badRequest('설계 이름은 1~40자예요.');
  return label;
};

const checkMutations = (raw: unknown, vh: string, vl: string | undefined): AntibodyMutation[] => {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 40) throw badRequest('변이는 한 설계에 40개까지예요.');
  const out: AntibodyMutation[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const chain = item.chain === 'L' ? 'L' : item.chain === 'H' ? 'H' : null;
    const pos = Number(item.pos);
    if (chain === null || !Number.isInteger(pos) || pos < 1) throw badRequest('변이 자리가 잘못됐어요.');
    const seq = chain === 'H' ? vh : vl;
    if (!seq || pos > seq.length) throw badRequest(`변이 자리 ${chain}${pos} 가 서열 밖이에요.`);
    const mut = String(item.mut ?? '').toUpperCase();
    const wt = String(item.wt ?? '').toUpperCase();
    if (mut.length !== 1 || wt.length !== 1) throw badRequest('변이 글자는 한 자씩이에요.');
    if (seq[pos - 1] !== mut) throw badRequest(`변이 ${chain}${pos}${mut} 가 보낸 서열과 맞지 않아요.`);
    const cdr = item.cdr === 1 || item.cdr === 2 || item.cdr === 3 ? (item.cdr as 1 | 2 | 3) : undefined;
    out.push({ chain, pos, wt, mut, ...(cdr ? { cdr } : {}) });
  }
  return out;
};

export async function listDesigns(db: Queryable, revisionId: string): Promise<DesignView[]> {
  const rows = await db.query<DesignRow>(DESIGN_SELECT, [revisionId]);
  return rows.rows.map(designView);
}

/** 설계 한 건 — 같은 서열이면 기존 행을 그대로 돌려준다(과금 · 새 행 없음 · §4.4②). */
export async function createDesign(
  deps: Deps,
  account: AccountView,
  raw: unknown,
): Promise<{ design: DesignView; created: boolean }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const label = checkLabel(body.label);
  let vh: string;
  let vl: string | undefined;
  try {
    vh = normalizeSeq(String(body.vh ?? ''));
    vl = body.vl === undefined || body.vl === null || String(body.vl).trim() === '' ? undefined : normalizeSeq(String(body.vl));
  } catch (error) {
    throw badRequest((error as Error).message);
  }
  const mutations = checkMutations(body.mutations, vh, vl);
  const preview = computePreview(vh, vl).metrics;
  const hash = seqHash(vh, vl);

  const result = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    if (!programConfirmed(rev)) throw new ApiError(409, 'step_locked', 'A1 에서 표적과 원본 항체를 먼저 정해 주세요.');
    const same = await tx.query<{ id: string }>('select id from web.antibody_designs where team_id = $1 and revision_id = $2 and seq_hash = $3', [who.teamId, rev.revisionId, hash]);
    if (same.rows[0]) return { id: same.rows[0].id, created: false, revisionId: rev.revisionId };

    const mine = await tx.query<{ n: number }>(
      `select count(*)::int as n from web.antibody_designs where team_id = $1 and revision_id = $2 and designed_by = $3`,
      [who.teamId, rev.revisionId, account.userId],
    );
    const used = mine.rows[0]!.n;
    if (used >= DESIGN_SLOTS_PER_PERSON) {
      throw new ApiError(409, 'slot_taken', `한 사람이 올릴 수 있는 설계는 ${DESIGN_SLOTS_PER_PERSON}개예요. 하나를 지우고 다시 해 주세요.`);
    }
    try {
      const inserted = await tx.query<{ id: string }>(
        `insert into web.antibody_designs (team_id, revision_id, label, vh, vl, seq_hash, mutations, origin, designed_by, slot, preview)
         values ($1, $2, $3, $4, $5, $6, $7, 'student', $8, $9, $10) returning id`,
        [who.teamId, rev.revisionId, label, vh, vl ?? null, hash, JSON.stringify(mutations), account.userId, used + 1, JSON.stringify(preview)],
      );
      // A3 과정 평가 — 설계가 처음 들어온 순간 한 번(§11.3.1).
      const scored = await postAntibodyProcess(tx, deps, { classId: who.classId, teamId: who.teamId, revisionId: rev.revisionId, step: 'A3' });
      return { id: inserted.rows[0]!.id, created: true, revisionId: rev.revisionId, after: scored };
    } catch (error) {
      if (isUniqueViolation(error, 'antibody_designs_slot_key')) {
        throw new ApiError(409, 'slot_taken', `한 사람이 올릴 수 있는 설계는 ${DESIGN_SLOTS_PER_PERSON}개예요.`);
      }
      if (isUniqueViolation(error, 'antibody_designs_seq_key')) {
        const again = await tx.query<{ id: string }>('select id from web.antibody_designs where team_id = $1 and revision_id = $2 and seq_hash = $3', [who.teamId, rev.revisionId, hash]);
        if (again.rows[0]) return { id: again.rows[0].id, created: false, revisionId: rev.revisionId };
      }
      throw error;
    }
  });

  result.after?.();
  if (result.created) notifyTeam(deps, who.teamId, 'antibody:design', account.displayName);
  const rows = await deps.db.query<DesignRow>(`${DESIGN_SELECT.replace('where d.revision_id = $1', 'where d.id = $1')}`, [result.id]);
  const row = rows.rows[0];
  if (!row) throw new ApiError(500, 'internal', '설계를 다시 읽지 못했어요.');
  return { design: designView(row), created: result.created };
}

/** 제출 전 설계 지우기 — 점수가 붙은 설계는 지우지 않는다. */
export async function deleteDesign(deps: Deps, account: AccountView, designId: string): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  await withTx(deps.db, async (tx) => {
    const row = await tx.query<{ designed_by: string | null }>('select designed_by from web.antibody_designs where id = $1 and team_id = $2', [designId, who.teamId]);
    if (!row.rows[0]) throw new ApiError(404, 'not_found', '없는 설계예요.');
    const scored = await tx.query('select 1 from web.antibody_scores where design_id = $1', [designId]);
    if (scored.rowCount) throw new ApiError(409, 'invalid_input', '이미 제출한 설계는 지울 수 없어요.');
    await tx.query('delete from web.antibody_designs where id = $1 and team_id = $2', [designId, who.teamId]);
  });
  notifyTeam(deps, who.teamId, 'antibody:design', account.displayName);
  return { ok: true };
}

/** 규칙 제안(NIM 키가 있으면 모형 제안) — 모둠 공용이라 `designed_by` 를 비우고 1인 상한에 들지 않는다. */
export async function suggestDesigns(deps: Deps, account: AccountView, raw: unknown): Promise<DesignView[]> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const count = Math.max(1, Math.min(5, Number(body.count ?? 3)));
  const boldness: AntibodyBoldness = body.boldness === 'conservative' || body.boldness === 'bold' ? body.boldness : 'normal';

  const rev = await loadRevision(deps.db, who.teamId);
  if (!programConfirmed(rev) || !rev.parentVh) throw new ApiError(409, 'step_locked', 'A1 에서 표적과 원본 항체를 먼저 정해 주세요.');
  const vh = rev.parentVh;
  const vl = rev.parentVl ?? undefined;
  const { cdrs } = computePreview(vh, vl);
  const pairs = await loadInterfacePairs(deps.db, rev);
  const variants = suggestVariants({ vh, vl, cdrs, ...(pairs.length ? { pairs } : {}) }, count, boldness);

  const out: DesignView[] = [];
  for (const [i, variant] of variants.entries()) {
    const nextVh = applyMutations(vh, variant.mutations, 'H');
    const nextVl = vl ? applyMutations(vl, variant.mutations, 'L') : undefined;
    const hash = seqHash(nextVh, nextVl);
    const preview = computePreview(nextVh, nextVl).metrics;
    const label = `제안 ${i + 1}`;
    const inserted = await deps.db.query<{ id: string }>(
      `insert into web.antibody_designs (team_id, revision_id, label, vh, vl, seq_hash, mutations, origin, designed_by, preview)
       values ($1, $2, $3, $4, $5, $6, $7, 'suggested', null, $8)
       on conflict (team_id, revision_id, seq_hash) do update set label = web.antibody_designs.label
       returning id`,
      [who.teamId, rev.revisionId, label, nextVh, nextVl ?? null, hash, JSON.stringify(variant.mutations), JSON.stringify(preview)],
    );
    const id = inserted.rows[0]?.id;
    if (!id) continue;
    out.push({
      id,
      label,
      vh: nextVh,
      ...(nextVl ? { vl: nextVl } : {}),
      seqHash: hash,
      mutations: variant.mutations,
      origin: 'suggested',
      roleBadge: variant.reasons[0] ?? '규칙 제안',
      preview,
      provenance: designProvenance('suggested'),
    });
  }
  notifyTeam(deps, who.teamId, 'antibody:suggest', account.displayName);
  return out;
}

export const applyMutations = (seq: string, mutations: readonly AntibodyMutation[], chain: AbChain): string => {
  const chars = [...seq];
  for (const m of mutations) {
    if (m.chain !== chain) continue;
    if (m.pos >= 1 && m.pos <= chars.length) chars[m.pos - 1] = m.mut;
  }
  return chars.join('');
};

/** 무료 미리보기 — 모둠당 분당 20회(§2.1 · §5.5). */
export async function previewMetrics(deps: Deps, account: AccountView, raw: unknown): Promise<PreviewMetrics> {
  const who = await teamMember(deps.db, account);
  const gate = deps.limits.antibodyPreviewPerTeam.hit(who.teamId);
  if (!gate.ok) throw new ApiError(429, 'rate_limited', '미리보기를 너무 자주 눌렀어요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: gate.retryAfterSec });
  const body = (raw ?? {}) as Record<string, unknown>;
  try {
    return computePreview(String(body.vh ?? ''), body.vl === undefined || body.vl === null ? undefined : String(body.vl)).metrics;
  } catch (error) {
    throw badRequest((error as Error).message);
  }
}

// ── 계면 잔기쌍(시드가 넣은 값) ──

export interface StoredPair {
  chain: AbChain;
  pos: number;
  aa: string;
  agResi: number;
  agAa: string;
  dist: number;
}

/** 레퍼런스 구조 · 체인 조의 계면 잔기쌍 — 요청 경로에서 PDB 를 받지 않는다(시드가 미리 넣는다). */
export async function loadInterfacePairs(db: Queryable, rev: AbRevision): Promise<StoredPair[]> {
  if (!rev.referencePdb) return [];
  const set = rev.chainRoles.set ?? '1';
  const rows = await db.query<{ pairs: StoredPair[] }>(
    'select pairs from web.antibody_interfaces where reference_pdb = $1 and ab_set = $2',
    [rev.referencePdb.toUpperCase(), set],
  );
  return rows.rows.flatMap((r) => r.pairs ?? []);
}

/** 모둠 σ — 버전에 적힌 값, 없으면 시드가 넣은 `sigma_single`. */
export async function loadSigma(db: Queryable, rev: AbRevision): Promise<number | null> {
  if (rev.sigmaTarget !== null) return rev.sigmaTarget;
  if (!rev.referencePdb) return null;
  const rows = await db.query<{ sigma_single: string | null }>(
    'select sigma_single from web.antibody_interfaces where reference_pdb = $1 and ab_set = $2 limit 1',
    [rev.referencePdb.toUpperCase(), rev.chainRoles.set ?? '1'],
  );
  const v = rows.rows[0]?.sigma_single;
  return v === null || v === undefined ? null : Number(v);
}

// ── 노트 ──

/** 노트 409 stale 은 '지금 칸'을 `error.abNote` 에 싣는다(계약 `ApiErrorBody.abNote`). */
class AbNoteStaleError extends ApiError {
  private readonly abNote: AntibodyNoteView | undefined;
  constructor(note: AntibodyNoteView | undefined) {
    super(409, 'stale', '다른 모둠원이 이 노트 칸을 먼저 고쳤어요. 내용을 확인한 뒤 합쳐서 저장해 주세요.');
    this.abNote = note;
  }
  override toBody() {
    const body = super.toBody();
    return this.abNote ? { error: { ...body.error, abNote: this.abNote } } : body;
  }
}

interface NoteRow {
  step: AntibodyStepId;
  section: NoteSection;
  body: string;
  display_name: string | null;
  avatar: Avatar | null;
  updated_at: Date;
  version: number;
}

const noteView = (r: NoteRow): AntibodyNoteView => ({
  stepId: r.step,
  section: r.section,
  body: r.body,
  byName: r.display_name,
  avatar: r.avatar,
  updatedAt: r.updated_at.toISOString(),
  version: r.version,
});

const NOTE_SELECT = `
  select n.step, n.section, n.body, a.display_name, m.avatar, n.updated_at, n.version
    from web.antibody_notes n
    left join web.accounts a on a.user_id = n.updated_by
    left join web.members m on m.user_id = n.updated_by and m.role = 'student'`;

export async function listNotes(db: Queryable, revisionId: string): Promise<AntibodyNoteView[]> {
  const rows = await db.query<NoteRow>(`${NOTE_SELECT} where n.revision_id = $1 order by n.step, n.section`, [revisionId]);
  return rows.rows.map(noteView);
}

async function loadNote(db: Queryable, revisionId: string, step: string, section: string): Promise<AntibodyNoteView | undefined> {
  const rows = await db.query<NoteRow>(`${NOTE_SELECT} where n.revision_id = $1 and n.step = $2 and n.section = $3`, [revisionId, step, section]);
  const row = rows.rows[0];
  return row ? noteView(row) : undefined;
}

const NOTE_MAX = 2000;

/** 칸별 낙관적 잠금 — 저분자 `saveNote` 와 같은 규칙. 잠긴 단계에서도 미리 쓸 수 있다(§2.2). */
export async function saveAbNote(deps: Deps, account: AccountView, step: string, section: string, raw: unknown): Promise<AntibodyNoteView> {
  const who = await teamMember(deps.db, account);
  if (!ANTIBODY_STEP_IDS.includes(step as AntibodyStepId) || !NOTE_SECTIONS.includes(section as NoteSection)) {
    throw new ApiError(404, 'not_found', '없는 노트 칸이에요.');
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  if (typeof body.body !== 'string') throw badRequest('노트 내용을 보내 주세요.');
  const expected = Number(body.version ?? 0);
  if (!Number.isInteger(expected) || expected < 0) throw badRequest('노트 버전이 잘못됐어요.');
  const text = body.body.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[^\S\n]+$/gm, '').trim();
  if ([...text].length > NOTE_MAX) throw badRequest(`노트 한 칸은 ${NOTE_MAX}자까지예요.`);
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text)) throw badRequest('노트에 쓸 수 없는 글자가 있어요.');

  const saved = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    const stale = async () => new AbNoteStaleError(await loadNote(tx, rev.revisionId, step, section));
    if (text === '') {
      if (expected === 0) return undefined;
      const deleted = await tx.query('delete from web.antibody_notes where revision_id = $1 and step = $2 and section = $3 and version = $4', [rev.revisionId, step, section, expected]);
      if (deleted.rowCount) return undefined;
      if (!(await loadNote(tx, rev.revisionId, step, section))) return undefined;
      throw await stale();
    }
    const result =
      expected === 0
        ? await tx.query<{ version: number }>(
            `insert into web.antibody_notes (team_id, revision_id, step, section, body, updated_by, version)
             values ($1, $2, $3, $4, $5, $6, 1)
             on conflict (team_id, revision_id, step, section) do nothing returning version`,
            [who.teamId, rev.revisionId, step, section, text, account.userId],
          )
        : await tx.query<{ version: number }>(
            `update web.antibody_notes set body = $4, updated_by = $5, updated_at = now(), version = version + 1
              where revision_id = $1 and step = $2 and section = $3 and version = $6 returning version`,
            [rev.revisionId, step, section, text, account.userId, expected],
          );
    if (!result.rows[0]) throw await stale();
    return loadNote(tx, rev.revisionId, step, section);
  });

  notifyTeam(deps, who.teamId, `antibody:note:${step}:${section}`, account.displayName);
  return (
    saved ?? {
      stepId: step as AntibodyStepId,
      section: section as NoteSection,
      body: '',
      byName: account.displayName,
      avatar: who.avatar,
      updatedAt: new Date().toISOString(),
      version: 0,
    }
  );
}

// ── 화면 한 장 응답 ──

interface JobRow {
  id: string;
  step: AntibodyJobStep;
  status: AntibodyJobView['status'];
  progress: number;
  phase: string | null;
  design_id: string | null;
  display_name: string | null;
  cost_cents: string;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  result: unknown;
  requested_by: string | null;
  created_at: Date;
}

const JOB_SELECT = `
  select j.id, j.step, j.status, j.progress, j.phase, j.design_id, a.display_name, j.cost_cents, j.error_message,
         j.started_at, j.finished_at, j.result, j.requested_by, j.created_at
    from web.antibody_jobs j left join web.accounts a on a.user_id = j.requested_by`;

export const jobView = (row: JobRow): AntibodyJobView => ({
  id: row.id,
  step: row.step,
  status: row.status,
  progress: Number(row.progress),
  ...(row.phase ? { phase: row.phase } : {}),
  ...(row.design_id ? { designId: row.design_id } : {}),
  ...(row.display_name ? { byName: row.display_name } : {}),
  costCents: Number(row.cost_cents),
  ...(row.error_message ? { errorMessage: row.error_message } : {}),
  ...(row.started_at ? { startedAt: row.started_at.toISOString() } : {}),
  ...(row.finished_at ? { finishedAt: row.finished_at.toISOString() } : {}),
});

export async function loadJobRow(db: Queryable, jobId: string): Promise<JobRow | undefined> {
  const rows = await db.query<JobRow>(`${JOB_SELECT} where j.id = $1`, [jobId]);
  return rows.rows[0];
}

/** 작업 결과를 뷰로 — A2 다양성 · A4 접힘 · A5 복합체. */
function resultsOf(jobs: readonly JobRow[]): { folds: FoldView[]; complexes: ComplexView[]; diversity: DiversityView[] } {
  const folds: FoldView[] = [];
  const complexes: ComplexView[] = [];
  const diversity: DiversityView[] = [];
  for (const job of jobs) {
    if (job.status !== 'succeeded' || job.result === null || typeof job.result !== 'object') continue;
    const payload = job.result as Record<string, unknown>;
    if (job.step === 'A4' && payload.fold) folds.push(payload.fold as FoldView);
    if (job.step === 'A5' && payload.complex) complexes.push(payload.complex as ComplexView);
    if (job.step === 'A2' && Array.isArray(payload.diversity)) diversity.push(...(payload.diversity as DiversityView[]));
  }
  return { folds, complexes, diversity };
}

/** 모둠 유효 인원 — 정족수 · 과정 신호의 분모. */
export async function memberCount(db: Queryable, teamId: string): Promise<number> {
  const rows = await db.query<{ n: number }>(`select count(*)::int as n from web.members where team_id = $1 and role = 'student'`, [teamId]);
  return Math.max(1, rows.rows[0]?.n ?? 1);
}

interface StepFacts {
  programConfirmed: boolean;
  diversityDone: boolean;
  designCount: number;
  foldDone: boolean;
  complexDone: boolean;
  submitted: boolean;
  running: Partial<Record<AntibodyJobStep, { progress: number; byName?: string }>>;
}

export function computeAntibodySteps(facts: StepFacts): { steps: AntibodyStepView[]; current: AntibodyStepId } {
  const done: Record<AntibodyStepId, boolean> = {
    A1: facts.programConfirmed,
    A2: facts.diversityDone,
    A3: facts.designCount > 0,
    A4: facts.foldDone,
    A5: facts.complexDone,
    A6: facts.submitted,
  };
  const steps: AntibodyStepView[] = [];
  let current: AntibodyStepId = 'A1';
  let firstOpen = true;
  for (const id of ANTIBODY_STEP_IDS) {
    const meta = ANTIBODY_STEP_META[id];
    const requires = ANTIBODY_STEP_REQUIRES[id];
    const blockedBy = requires && !done[requires] ? requires : undefined;
    const run = (ANTIBODY_JOB_STEPS as readonly string[]).includes(id) ? facts.running[id as AntibodyJobStep] : undefined;
    let state: StepState;
    if (done[id]) state = 'done';
    else if (run) state = 'running';
    else if (blockedBy) state = 'locked';
    else state = 'ready';
    if (state !== 'done' && state !== 'locked' && firstOpen) {
      current = id;
      firstOpen = false;
    }
    steps.push({
      id,
      group: meta.group,
      index: meta.index,
      state,
      ...(blockedBy ? { unlockBy: blockedBy, reason: `${blockedBy} ${ANTIBODY_STEP_META[blockedBy].title} 을 먼저 끝내요` } : {}),
      ...(run ? { progressPct: Math.round(run.progress * 100), ...(run.byName ? { byName: run.byName } : {}) } : {}),
      evidence: meta.evidence,
      // 계약의 `AntibodyStepMeta.costCents` 는 이미 센트다(크리스타가 아니다) — 다시 환산하지 않는다.
      costCents: meta.costCents,
    });
  }
  if (firstOpen) current = 'A6';
  return { steps, current };
}

async function loadNews(db: Queryable, classId: string): Promise<AntibodyNewsLine[]> {
  const rows = await db.query<{ class_seq: number; ticker: string | null; headline: string; headline_ai: string | null; change_pct: number | null; tone: string; kind: string }>(
    `select e.class_seq, t.ticker, e.headline, e.headline_ai, e.change_pct, e.tone, e.kind
       from web.board_events e left join web.teams t on t.id = e.team_id
      where e.class_id = $1 order by e.class_seq desc limit 10`,
    [classId],
  );
  return rows.rows.map((r) => ({
    seq: r.class_seq,
    ticker: r.ticker ?? '—',
    headline: r.headline_ai ?? r.headline,
    ...(r.change_pct !== null ? { changePct: r.change_pct } : {}),
    tone: r.tone,
    track: (r.kind.startsWith('antibody_') ? 'antibody' : 'drug') satisfies TrackId,
  }));
}

/** 화면 한 장 — `GET /api/antibody/board`. */
export async function loadAntibodyBoard(deps: Deps, account: AccountView): Promise<AntibodyBoardResponse> {
  const who = await teamMember(deps.db, account);
  // 저분자 화면을 한 번도 열지 않은 모둠도 초기 연구비 줄을 받는다(§5.7 · §10 F3).
  await ensureAntibodyRows(deps.db, who.teamId);
  const rev = await loadRevision(deps.db, who.teamId);
  const team = await loadTeam(deps.db, who.teamId);
  if (!team) throw new ApiError(409, 'not_registered_team', '사옥 지구에서 입사하고 스타트업 이름을 먼저 등기해 주세요.');

  const [designs, notes, jobRows, settings, valuation, news, balance, cardsProposals] = await Promise.all([
    listDesigns(deps.db, rev.revisionId),
    listNotes(deps.db, rev.revisionId),
    deps.db.query<JobRow>(`${JOB_SELECT} where j.revision_id = $1 order by j.created_at`, [rev.revisionId]),
    loadSettings(deps.db, who.classId),
    loadValuation(deps.db, who.teamId, who.classId),
    loadNews(deps.db, who.classId),
    balanceCents(deps.db, who.teamId),
    loadConsensusViews(deps.db, rev.revisionId, account.userId),
  ]);
  const jobs = jobRows.rows;
  const { folds, complexes, diversity } = resultsOf(jobs);

  const best = await loadBestScore(deps.db, rev.revisionId, settings);
  const running: StepFacts['running'] = {};
  for (const job of jobs) {
    if (job.status !== 'queued' && job.status !== 'running') continue;
    running[job.step] = { progress: Number(job.progress), ...(job.display_name ? { byName: job.display_name } : {}) };
  }
  const succeeded = (step: AntibodyJobStep) => jobs.some((j) => j.step === step && j.status === 'succeeded');
  const { steps, current } = computeAntibodySteps({
    programConfirmed: programConfirmed(rev),
    diversityDone: succeeded('A2'),
    designCount: designs.filter((d) => d.origin === 'student').length,
    foldDone: succeeded('A4'),
    complexDone: succeeded('A5'),
    submitted: best !== undefined,
    running,
  });

  const mineDesigns = await deps.db.query<{ n: number }>(
    'select count(*)::int as n from web.antibody_designs where revision_id = $1 and designed_by = $2',
    [rev.revisionId, account.userId],
  );
  const myJob = (step: 'A4' | 'A5') =>
    jobs.filter((j) => j.step === step && j.requested_by === account.userId && j.status !== 'failed' && j.status !== 'timeout').length;

  const classRank = { rank: valuation.rankMarketCap, of: valuation.of };
  return {
    track: 'antibody',
    team,
    program: programView(rev),
    steps,
    current,
    designs,
    folds,
    complexes,
    diversity,
    cards: cardsProposals.cards,
    proposals: cardsProposals.proposals,
    notes,
    ...(best ? { best } : {}),
    valuation,
    classRank,
    balanceCents: balance,
    costs: { ...ANTIBODY_COSTS },
    myQuota: {
      designs: { used: mineDesigns.rows[0]!.n, max: DESIGN_SLOTS_PER_PERSON },
      fold: { used: myJob('A4'), max: MY_JOB_MAX.A4 },
      evaluate: { used: myJob('A5'), max: MY_JOB_MAX.A5 },
    },
    teamQuota: { running: jobs.filter((j) => j.status === 'queued' || j.status === 'running').length, max: ANTIBODY_TEAM_ACTIVE_MAX },
    jobs: jobs.map(jobView),
    dataMode: deps.antibody.dataMode,
    optional: { proteinmpnn: deps.config.antibody.nvidiaKey !== null, boltz: deps.config.antibody.boltzKey !== null },
    settings: { weights: settings.weights, openTracks: settings.openTracks },
    news,
  };
}

/** 합의 뷰는 `consensus.ts` 가 만든다 — 순환 import 를 피하려고 늦게 불러온다. */
async function loadConsensusViews(db: Queryable, revisionId: string, userId: string) {
  const { loadCards, loadProposals } = await import('./consensus.ts');
  const [cards, proposals] = await Promise.all([loadCards(db, revisionId), loadProposals(db, revisionId, userId)]);
  return { cards, proposals };
}

// ── A1 프로그램 확정 ──

export interface ProgramValue {
  antigenTarget: string;
  parentAntibodyChemblId: string;
  referencePdb: string;
  chainRoles: { set?: string; H: string; L?: string; AG?: string };
}

const CHEMBL_ID = /^CHEMBL[0-9]{1,12}$/;
const PDB_ID = /^[0-9A-Za-z]{4}$/;

export function checkProgramValue(raw: unknown): ProgramValue {
  const body = (raw ?? {}) as Record<string, unknown>;
  const antigenTarget = String(body.antigenTarget ?? '').trim().toUpperCase();
  const parent = String(body.parentAntibodyChemblId ?? '').trim().toUpperCase();
  const pdb = String(body.referencePdb ?? '').trim().toUpperCase();
  if (!CHEMBL_ID.test(antigenTarget)) throw badRequest('표적은 ChEMBL 번호예요(예: CHEMBL203).');
  if (!CHEMBL_ID.test(parent)) throw badRequest('원본 항체는 ChEMBL 번호예요.');
  if (!PDB_ID.test(pdb)) throw badRequest('레퍼런스 구조는 PDB 네 글자예요(예: 1YY9).');
  const roles = (body.chainRoles ?? {}) as Record<string, unknown>;
  const H = String(roles.H ?? '').trim();
  if (H.length < 1 || H.length > 4) throw badRequest('중쇄 체인 이름을 보내 주세요.');
  const chainRoles: ProgramValue['chainRoles'] = { set: String(roles.set ?? '1').trim() || '1', H };
  if (roles.L) chainRoles.L = String(roles.L).trim();
  if (roles.AG) chainRoles.AG = String(roles.AG).trim();
  return { antigenTarget, parentAntibodyChemblId: parent, referencePdb: pdb, chainRoles };
}

/**
 * 프로그램 확정 — PUT 경로와 A1 투표 과반 경로가 **같은 함수**를 쓴다.
 * 원본 가변영역 서열은 ChEMBL 어댑터가 준다(오프라인이면 고정 예시로 강등 — 배지가 그 사실을 말한다).
 */
export async function applyProgram(
  tx: Tx,
  deps: Deps,
  who: { teamId: string; classId: string; userId: string | null },
  value: ProgramValue,
  expectedVersion: number | null,
): Promise<AbRevision> {
  const rev = await lockedRevision(tx, who.teamId);
  if (expectedVersion !== null && expectedVersion !== rev.version) {
    throw new ApiError(409, 'stale', '다른 모둠원이 먼저 프로그램을 바꿨어요. 화면을 새로 고쳐 다시 해 주세요.');
  }
  const chains = await deps.antibody.parentChains(value.parentAntibodyChemblId);
  await tx.query(
    `update web.antibody_programs
        set antigen_target = $2, parent_antibody_chembl_id = $3, parent_antibody_name = $4, reference_pdb = $5,
            chain_roles = $6, parent_vh = $7, parent_vl = $8, version = version + 1, updated_at = now()
      where team_id = $1`,
    [who.teamId, value.antigenTarget, value.parentAntibodyChemblId, chains.name, value.referencePdb, JSON.stringify(value.chainRoles), chains.vh, chains.vl],
  );
  await tx.query(
    `update web.antibody_revisions
        set antigen_target = $1, parent_antibody_chembl_id = $2, parent_antibody_name = $3, reference_pdb = $4,
            chain_roles = $5, parent_vh = $6, parent_vl = $7, created_by = coalesce(created_by, $8)
      where id = $9`,
    [value.antigenTarget, value.parentAntibodyChemblId, chains.name, value.referencePdb, JSON.stringify(value.chainRoles), chains.vh, chains.vl, who.userId, rev.revisionId],
  );
  // 표적별 정규화 척도 — 시드가 넣어 둔 값을 버전에 박아 둔다(나중에 시드를 다시 돌려도 옛 점수가 흔들리지 않게).
  await tx.query(
    `update web.antibody_revisions r
        set sigma_target = (select i.sigma_single from web.antibody_interfaces i
                             where i.reference_pdb = $2 and i.ab_set = $3 and i.sigma_single is not null limit 1)
      where r.id = $1 and r.sigma_target is null`,
    [rev.revisionId, value.referencePdb, value.chainRoles.set ?? '1'],
  );
  // 원본 비교군 설계 — A5 완료 조건이 '원본 비교군을 포함한 평가'라서 모둠 공용으로 한 건 넣어 둔다(1인 상한에 들지 않는다).
  await tx.query(
    `insert into web.antibody_designs (team_id, revision_id, label, vh, vl, seq_hash, mutations, origin, designed_by, preview)
     values ($1, $2, $3, $4, $5, $6, '[]', 'parent', null, $7)
     on conflict (team_id, revision_id, seq_hash) do nothing`,
    [
      who.teamId,
      rev.revisionId,
      `원본 ${chains.name}`.slice(0, 40),
      chains.vh,
      chains.vl,
      seqHash(chains.vh, chains.vl ?? undefined),
      JSON.stringify(computePreview(chains.vh, chains.vl ?? undefined).metrics),
    ],
  );
  return loadRevision(tx, who.teamId);
}

/** A1 확정 소식 — 변동 0%(사실 공개만 · §4.3). */
export async function postProgramNews(tx: Tx, deps: Deps, who: { teamId: string; classId: string }, rev: AbRevision): Promise<() => void> {
  const ticker = (await tx.query<{ ticker: string | null }>('select ticker from web.teams where id = $1', [who.teamId])).rows[0]?.ticker ?? '—';
  const gameDay = await currentGameDay(deps.db, who.classId).catch(() => null);
  const posted = await postAntibodyEvent(tx, deps, {
    classId: who.classId,
    teamId: who.teamId,
    kind: 'antibody_program',
    headline: `◆ ${ticker} 항체 프로그램 확정 — ${rev.antigenTarget ?? '표적'} · ${rev.parentAntibodyName ?? '원본 항체'}`,
    changeHint: 0,
    public: { stage: 'antibody_A1', target: rev.antigenTarget, pdb: rev.referencePdb },
    idemKey: `antibody_program:${rev.revisionId}`,
    gameDay,
  });
  // A1 과정 평가 — (모둠, 단계)마다 한 번(§11.3.1). 두 번째부터는 기반이 조용히 넘긴다.
  const scored = await postAntibodyProcess(tx, deps, { classId: who.classId, teamId: who.teamId, revisionId: rev.revisionId, step: 'A1', gameDay });
  return () => {
    posted.after();
    scored();
  };
}

export async function putProgram(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodyProgramView> {
  const who = await teamMember(deps.db, account);
  const value = checkProgramValue(raw);
  const body = (raw ?? {}) as Record<string, unknown>;
  const expected = Number(body.version);
  if (!Number.isInteger(expected) || expected < 1) throw badRequest('프로그램 버전을 보내 주세요.');

  const result = await withTx(deps.db, async (tx) => {
    const rev = await applyProgram(tx, deps, { teamId: who.teamId, classId: who.classId, userId: account.userId }, value, expected);
    const after = await postProgramNews(tx, deps, who, rev);
    return { rev, after };
  });
  result.after();
  notifyTeam(deps, who.teamId, 'antibody:program', account.displayName);
  return programView(result.rev);
}

// ── 점수 · 제출(A6) ──

interface ScoreRow {
  score: number;
  parts: Record<string, unknown>;
  fit: number | null;
  formula_version: string;
  design_id: string | null;
}

/** 모둠 최고 점수 — 이력에서 가장 높은 줄. */
export async function loadBestScore(db: Queryable, revisionId: string, settings: AbSettings): Promise<ScoreView | undefined> {
  const rows = await db.query<ScoreRow>(
    'select score, parts, fit, formula_version, design_id from web.antibody_scores where revision_id = $1 order by score desc, created_at limit 1',
    [revisionId],
  );
  const row = rows.rows[0];
  if (!row) return undefined;
  const parts = row.parts as { view?: ScoreView };
  if (parts.view) return { ...parts.view, weights: parts.view.weights ?? settings.weights };
  return undefined;
}

/** 점수 입력 한 벌 — 미리보기 지표 + 붙는 힘 + 유효 변이 수. */
export function scoreInputOf(input: {
  preview: PreviewParts;
  bindScore: number;
  chargePairShare: number;
  effectiveMutations: number;
  duplicateShare: number;
  nearestSimilarity: number | null;
  parentHumanPercent: number | null;
  risks?: readonly string[];
}): ScoreInput {
  return {
    bind: { score: input.bindScore, chargePairShare: input.chargePairShare },
    stability: {
      greasyPercentile: input.preview.raw.greasyPercentile,
      chainChargePercentile: input.preview.raw.chainChargePercentile,
      pi: input.preview.raw.pi,
    },
    developability: { liabilities: input.preview.raw.liabilities, positivePatch: input.preview.raw.positivePatch },
    humanization: { designPercent: input.preview.raw.humanPercent, parentPercent: input.parentHumanPercent },
    novelty: {
      effectiveMutations: input.effectiveMutations,
      duplicateShare: input.duplicateShare,
      nearestSimilarity: input.nearestSimilarity,
    },
    ...(input.risks ? { risks: input.risks } : {}),
  };
}

export interface SubmitContext {
  rev: AbRevision;
  settings: AbSettings;
  design: DesignRow;
  complex: ComplexView | null;
  fold: FoldView | null;
  pairs: StoredPair[];
  sigma: number | null;
  diversityPercentile: (chain: AbChain, pos: number) => number | null;
}

/** 설계 점수 한 판 — 원본 비교군을 같은 함수로 계산해 문턱 `T = S_원본 + 교사 조정` 을 함께 낸다. */
export function scoreDesign(ctx: SubmitContext): { view: ScoreView; bindRaw: number } {
  const designPreview = computePreview(ctx.design.vh, ctx.design.vl ?? undefined);
  const parentPreview = computePreview(ctx.rev.parentVh ?? ctx.design.vh, ctx.rev.parentVl ?? undefined);
  const mutations = ctx.design.mutations ?? [];
  const interfaceKeys = new Set(ctx.pairs.map((p) => `${p.chain}:${p.pos}`));
  const mEff = effectiveMutations(mutations, interfaceKeys, ctx.diversityPercentile);
  const bind = ctx.complex?.bindScore ?? 65;
  const view = antibodyScore(
    scoreInputOf({
      preview: designPreview,
      bindScore: bind,
      chargePairShare: ctx.complex?.chargePairShare ?? 0,
      effectiveMutations: mEff,
      duplicateShare: 0,
      nearestSimilarity: null,
      parentHumanPercent: parentPreview.raw.humanPercent,
      risks: ctx.complex ? [] : ['복합체 평가(A5)를 아직 돌리지 않아 붙는 힘은 원본 기준점이에요.'],
    }),
    scoreInputOf({
      preview: parentPreview,
      bindScore: 65,
      chargePairShare: 0,
      effectiveMutations: 0,
      duplicateShare: 0,
      nearestSimilarity: null,
      parentHumanPercent: parentPreview.raw.humanPercent,
    }),
    ctx.settings.weights,
    ctx.settings.thresholds.scoreMargin,
  );
  return { view, bindRaw: ctx.complex?.bindRaw ?? 0 };
}

/** A6 제출 — 설계 하나를 모둠 대표로 올린다. 모둠 신기록이면 소식 + 기업가치. */
export async function submitDesign(deps: Deps, account: AccountView, raw: unknown): Promise<AntibodySubmitResponse> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (!REQUEST_ID.test(requestId)) throw badRequest('requestId 가 형식에 맞지 않아요.');
  const designId = typeof body.designId === 'string' ? body.designId : '';
  if (!designId) throw badRequest('제출할 설계를 골라 주세요.');

  const settings = await loadSettings(deps.db, who.classId);
  const gameDay = await currentGameDay(deps.db, who.classId).catch(() => null);

  const outcome = await withTx(deps.db, async (tx) => {
    const rev = await lockedRevision(tx, who.teamId);
    if (!programConfirmed(rev)) throw new ApiError(409, 'step_locked', 'A1 에서 표적과 원본 항체를 먼저 정해 주세요.');
    const rows = await tx.query<DesignRow>(`${DESIGN_SELECT.replace('where d.revision_id = $1 order by d.created_at', 'where d.id = $1 and d.team_id = $2')}`, [designId, who.teamId]);
    const design = rows.rows[0];
    if (!design) throw new ApiError(404, 'not_found', '없는 설계예요.');

    const jobs = await tx.query<JobRow>(`${JOB_SELECT} where j.revision_id = $1 and j.design_id = $2 and j.status = 'succeeded'`, [rev.revisionId, designId]);
    const { folds, complexes } = resultsOf(jobs.rows); // 제출에는 다양성 뷰가 필요 없어요(지도는 DB 에서 바로 읽어요).
    const complex = complexes[0] ?? null;
    const fold = folds[0] ?? null;
    if (!complex) throw new ApiError(409, 'step_locked', 'A5 복합체 평가를 먼저 돌려 주세요.');

    const pairs = await loadInterfacePairs(tx, rev);
    const diversity = await loadDiversityMap(tx, rev.revisionId);
    const { view, bindRaw } = scoreDesign({
      rev,
      settings,
      design,
      complex,
      fold,
      pairs,
      sigma: await loadSigma(tx, rev),
      diversityPercentile: (chain, pos) => diversity.get(`${chain}:${pos}`) ?? null,
    });

    // 과금은 멱등 — 같은 requestId 로 두 번 눌러도 한 번만 빠진다.
    const charged = await charge(tx, {
      teamId: who.teamId,
      cents: ANTIBODY_SUBMIT_COST_CENTS,
      kind: 'paid_work',
      idemKey: `ab-submit:${requestId}`,
      createdBy: account.userId,
      ref: { type: 'antibody_design', id: designId },
    });

    const previous = await tx.query<{ score: number }>('select score from web.antibody_scores where revision_id = $1 order by score desc limit 1', [rev.revisionId]);
    const beforeBest = previous.rows[0]?.score ?? null;
    const record = beforeBest === null || view.score > beforeBest;

    // 모둠 신기록이 아니면 변동 0(§4.3) — 소식도 신기록만 낸다.
    let after: () => void = () => {};
    let event: AntibodySubmitResponse['event'] | undefined;
    if (charged.charged && record) {
      // §4.3 공식 — 문턱을 넘은 폭에 따라 2~10 정수.
      const over = Math.max(0, view.score - view.threshold);
      const changeHint = Math.min(10, 2 + Math.round(over / 2));
      const ticker = (await tx.query<{ ticker: string | null }>('select ticker from web.teams where id = $1', [who.teamId])).rows[0]?.ticker ?? '—';
      const headline = `◆ ${ticker} 항체 설계 기록 경신 — ${rev.antigenTarget ?? '표적'} · ${design.label}`;
      const posted = await postAntibodyEvent(tx, deps, {
        classId: who.classId,
        teamId: who.teamId,
        kind: 'antibody_record',
        headline,
        changeHint,
        public: { stage: 'antibody_A6', target: rev.antigenTarget, grade: complex.grade, label: design.label },
        idemKey: `antibody_record:${rev.revisionId}:${view.score}`,
        gameDay,
      });
      after = posted.after;
      event = { headline: posted.event.headline, kind: 'antibody_record' };
    }

    await tx.query(
      `insert into web.antibody_scores (team_id, revision_id, design_id, score, parts, fit, confidence_mean, confidence_cdr, bind_raw, humanness, nearest_germline, formula_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        who.teamId,
        rev.revisionId,
        designId,
        view.score,
        JSON.stringify({ view, record, requestId }),
        Math.round(complex.fit),
        fold?.confidenceMean ?? null,
        fold?.confidenceCdrH3 ?? null,
        bindRaw,
        view.parts.humanization,
        null,
        ANTIBODY_FORMULA_VERSION,
      ],
    );

    // 과정 평가(§11.3.1) — 신호는 `process.ts` 한 곳에서 DB 사실로 센다.
    const scored = await postAntibodyProcess(tx, deps, { classId: who.classId, teamId: who.teamId, revisionId: rev.revisionId, step: 'A6', gameDay });

    const both = after;
    after = () => {
      both();
      scored();
    };
    return { view, after, event, record };
  });

  outcome.after();
  notifyTeam(deps, who.teamId, 'antibody:submit', account.displayName);
  const valuation = await loadValuation(deps.db, who.teamId, who.classId);
  return { score: outcome.view, valuation, ...(outcome.event ? { event: outcome.event } : {}) };
}

/** A2 결과에서 자리별 다양성 백분위(묶음 3 축 — 낮을수록 '지켜야 하는 자리'). */
export async function loadDiversityMap(db: Queryable, revisionId: string): Promise<Map<string, number>> {
  const rows = await db.query<{ result: { diversityRaw?: Array<{ chain: AbChain; percentiles: number[] }> } }>(
    `select result from web.antibody_jobs where revision_id = $1 and step = 'A2' and status = 'succeeded' order by created_at desc limit 1`,
    [revisionId],
  );
  const map = new Map<string, number>();
  for (const chainRow of rows.rows[0]?.result?.diversityRaw ?? []) {
    chainRow.percentiles.forEach((p, i) => map.set(`${chainRow.chain}:${i + 1}`, p));
  }
  return map;
}

/** 묶음 3 축의 다양성 → 화면 축(높을수록 '대부분 같은 자리')으로 뒤집어 담는다. */
export function diversityViewOf(input: {
  chain: AbChain;
  percentiles: readonly number[];
  grades: readonly number[];
  imgtNumbers: Array<[number, string]>;
  numberingSource: DiversityView['numberingSource'];
  cdrs: CdrSpan[];
  msaDepth: number;
  provenance: Provenance;
}): DiversityView {
  return {
    chain: input.chain,
    grades: input.grades.map((g) => 10 - g),
    percentiles: input.percentiles.map((p) => Number((1 - p).toFixed(3))),
    imgtNumbers: input.imgtNumbers,
    numberingSource: input.numberingSource,
    cdrs: input.cdrs,
    // 0 부터 세는 자리(화면 서열 격자의 칸 번호) — `SeqEditor` 의 `locks` 와 같은 축.
    suggestedFixed: input.percentiles.map((p, i) => (isLocked(p) ? i : -1)).filter((i) => i >= 0),
    msaDepth: input.msaDepth,
    provenance: input.provenance,
  };
}
