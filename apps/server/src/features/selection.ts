/**
 * 기능 FSEL — 2.1 결과 읽기 도구 3종 + 2.2 대기열(dock_picks) · 2.2 리드 읽기 도구 4종 + 특허 후보(lead_candidates)(설계 §5.6 · §5.7 · §6.3).
 *
 * 소유: 이 파일 · packages/web-contract/src/selection.ts · apps/web/src/board/steps/s21.tsx · s22.tsx(+ css). 새 스키마 없음(0011 은 쓰지 않았다 — 0006 표로 충분).
 * 표(0006): web.dock_picks(1인 2 · 모둠 8 — UQ(버전, 사람, 칸)) · lead_candidates(1인 1 · 2명 이하 모둠은 2 · 모둠 4).
 *   0006 이 W3 의 주력 · 백업(2.2 ADMET 작업)을 lead_candidates 로 옮겼다(근거 키 legacy_lead · legacy_backup).
 *
 * 지킬 불변식(§7.4)
 * - ② 와 같은 꼴: PK (버전, 작업) + on conflict do nothing → 0행이면 409 claimed(먼저 담은 사람 이름). 칸 고유 키 위반 → 409 limit_reached.
 * - 모둠 상한(8 · 4) · 빈 칸 고르기는 **표적 버전 행 잠금**(`program_revisions … for no key update`) 안에서 센다 — 같은 버전의 담기 · 빼기가 줄 선다.
 *   no key update 라서 작업 접수(jobs 외래 키의 key share)와는 서로 막지 않는다.
 * - ⑧ 과 같은 꼴: 근거 칩을 서버가 web-contract 의 같은 함수로 다시 판정 — 막음이면 400 reason_blocked.
 * - 2.2 ADMET 실행은 **대기열에 있는 분자만**(`onJobAdmit('2.2')` — 모둠 잠금 안에서 dock_picks 행을 for share 로 잡는다) · 같은 분자 ADMET 는 한 번만(409 already_exists).
 * - 수심계 이정표는 숫자 두 개(가운데값 · 1위 ΔG)만 — 1위 분자 이름 · 분자별 사전 Vina 값은 내려보내지 않는다. 찜 회고도 사전 값은 평균 두 개만.
 * - 공개 범위(§5.3): 이 응답은 그 모둠만(세션의 모둠). 학급 채널에는 'board.changed'(이유 문자열)만 모둠 채널로 보낸다.
 * - 이미 알려진 물질(ChEMBL 승인약 · ZINC 소형 · 기준 리간드)은 known_substance = true('특허 불가 · 변형체 필요').
 *
 * 데이터: 워커 `/datasets/compounds`(220종 · 출신 `targetId` · 기전 · 사전 Vina — 서버 메모리 10분 캐시) · `/molecule/properties`(RDKit — SMILES 별 캐시).
 * 효능 E · 안전 S 는 game-rules `scoreCandidate`(crista 와 같은 함수) — '흔들림 전 예상치'.
 */
import {
  affinityFloorKcal,
  affinityStrength,
  PIPELINE_RULES,
  propertySignals,
  scoreCandidate,
  signalNotes,
} from '@crista/game-rules';
import type { ExperimentResult, MoleculeProperties } from '@crista/shared-types';
import {
  BASE_DOSE,
  BASE_FORM,
  SELECTION_COPY,
  DOCK_PICKS_PER_PERSON,
  DOCK_PICKS_PER_TEAM,
  DOCK_REASONS,
  dockReasonVerdict,
  HISTAMINE_COMPOUND_ID,
  KNOWN_LIBRARIES,
  LEAD_CANDIDATES_PER_TEAM,
  leadCandidatesPerPerson,
  candidateReasonVerdict,
  candidateReasonsFor,
  radarOutside,
  SCORE_DOSES,
  SCORE_FORMS,
  SELECTION_API,
  type AccountView,
  type AdmetView,
  type Avatar,
  type DiseaseOption,
  type DockedView,
  type GaugeView,
  type KnownWhy,
  type LeadCandidateView,
  type CandidateReasonFacts,
  type MoleculeOrigin,
  type PickView,
  type RetroView,
  type ScoreCell,
  type SelectionResponse,
} from '@crista-web/web-contract';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable } from '../db.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { onJobAdmit } from '../jobs.ts';
import { DISEASES, JOB_SELECT, loadProgramRow, lockedProgram, notifyTeam, teamMember, type JobRow } from '../pipeline.ts';
import type { RequestContext } from '../routes.ts';
import { requireAccount } from '../guard.ts';
import { screenLibrary } from './screen.ts';
import { WorkerUnavailableError } from '../worker.ts';

/** IND 기준 S(규칙 값 — null 이면 기준 없음으로 0). */
const IND_S_MIN: number = PIPELINE_RULES.thresholds.ind.safety ?? 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── 라이브러리(워커 데이터셋) ──

/** 워커 `/datasets/compounds` 의 한 줄 중 쓰는 칸(실제 응답에는 칸이 더 있다). */
export interface LibraryCompound {
  chemblId: string;
  name: string;
  canonicalSmiles: string;
  flatSmiles?: string;
  library: string;
  targetId?: string | null;
  mechanism?: string | null;
  vinaKcalByTarget?: Record<string, number>;
  screenScoreByTarget?: Record<string, number>;
}

export interface LibraryEntry {
  compoundId: string;
  name: string;
  library: string;
  targetId: string | null;
  mechanism: string | null;
}

export interface LibraryIndex {
  byFlat: Map<string, LibraryEntry>;
  byCanonical: Map<string, LibraryEntry>;
  /** 사전 Vina 순위(1 = 가장 깊음) — 찜 회고만 쓴다. */
  rank: Map<string, number>;
  /** 그 표적의 사전 Vina 값이 있는 분자 수 · 가운데값 · 1위. */
  count: number;
  medianKcal: number | null;
  topKcal: number | null;
  /** 이정표 '히스타민'(이름 붙은 교육용 기준점) — 없으면 null. */
  histamineKcal: number | null;
}

/** 'MOL' 같은 빈 기전은 버린다. */
const cleanMechanism = (m: string | null | undefined): string | null => {
  const t = (m ?? '').trim();
  if (!t || t.toUpperCase() === 'MOL') return null;
  return t.length > 80 ? `${t.slice(0, 79).trimEnd()}…` : t;
};

/** 라이브러리 → 찾기 표 · 가운데값 · 1위(순수 함수 — 단위 시험). */
export function libraryIndex(compounds: readonly LibraryCompound[], targetId: string): LibraryIndex {
  const byFlat = new Map<string, LibraryEntry>();
  const byCanonical = new Map<string, LibraryEntry>();
  const scored: Array<{ id: string; v: number }> = [];
  for (const c of compounds) {
    const entry: LibraryEntry = { compoundId: c.chemblId, name: c.name, library: c.library, targetId: c.targetId ?? null, mechanism: cleanMechanism(c.mechanism) };
    if (c.flatSmiles) byFlat.set(c.flatSmiles, entry);
    byCanonical.set(c.canonicalSmiles, entry);
    const v = c.vinaKcalByTarget?.[targetId];
    if (typeof v === 'number' && Number.isFinite(v)) scored.push({ id: c.chemblId, v });
  }
  scored.sort((a, b) => a.v - b.v || a.id.localeCompare(b.id));
  const rank = new Map(scored.map((s, i) => [s.id, i + 1]));
  const n = scored.length;
  const medianKcal = n === 0 ? null : round2(n % 2 ? scored[(n - 1) / 2]!.v : (scored[n / 2 - 1]!.v + scored[n / 2]!.v) / 2);
  const his = compounds.find((c) => c.chemblId === HISTAMINE_COMPOUND_ID)?.vinaKcalByTarget?.[targetId];
  return { byFlat, byCanonical, rank, count: n, medianKcal, topKcal: n ? scored[0]!.v : null, histamineKcal: typeof his === 'number' && Number.isFinite(his) ? his : null };
}

const round2 = (v: number): number => Math.round(v * 100) / 100;
const mean = (xs: number[]): number | null => (xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const libraryCache = new Map<string, { at: number; value: LibraryIndex }>();

/** 워커가 닿지 않으면 null(도구는 이정표 없이 그린다). 깔때기 조건을 모두 열어 전체를 받는다(워커는 Ro5 위반 2개 이상 1종을 늘 뺀다). */
async function libraryFor(deps: Deps, targetId: string): Promise<LibraryIndex | null> {
  const hit = libraryCache.get(targetId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  try {
    const result = await deps.worker.compounds({ targetId, maxMw: 100_000, maxTpsa: 100_000, ro5Only: false, excludeAlerts: false, limit: 500 });
    const value = libraryIndex(result.compounds as unknown as LibraryCompound[], targetId);
    libraryCache.set(targetId, { at: Date.now(), value });
    return value;
  } catch (error) {
    if (error instanceof WorkerUnavailableError) return hit?.value ?? null;
    throw error;
  }
}

const propsCache = new Map<string, MoleculeProperties>();

/** RDKit 물성 — SMILES 별 캐시. 워커가 닿지 않거나 계산할 수 없으면 null. */
async function propsOf(deps: Deps, smiles: string): Promise<MoleculeProperties | null> {
  const hit = propsCache.get(smiles);
  if (hit) return hit;
  try {
    const outcome = await deps.worker.properties(smiles);
    if (!outcome.ok) return null;
    if (propsCache.size > 2000) propsCache.delete(propsCache.keys().next().value!);
    propsCache.set(smiles, outcome.properties);
    return outcome.properties;
  } catch (error) {
    if (error instanceof WorkerUnavailableError) return null;
    throw error;
  }
}

// ── 출신 · 이미 알려진 물질(순수 함수) ──

export interface DockedJobInput {
  id: string;
  smiles: string;
  flatSmiles: string | null;
  parentJobId: string | null;
  createdAt: number;
}

/**
 * 도킹 작업마다 출신 · 알려진 물질. 라이브러리와 같은 분자(평면 SMILES → 정규 SMILES 순)면 그 줄의 출신,
 * 아니면 부모(같은 버전의 2.1 작업)의 출신 + 변형체, 둘 다 아니면 'unknown'. 계열(family)은 맨 처음 조상 기준.
 */
export function resolveOrigins(
  jobs: readonly DockedJobInput[],
  lib: Pick<LibraryIndex, 'byFlat' | 'byCanonical'> | null,
  targetId: string,
  reference: { flatSmiles: string | null; smiles: string },
): Map<string, { origin: MoleculeOrigin; known: KnownWhy | null; isReference: boolean }> {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const out = new Map<string, { origin: MoleculeOrigin; known: KnownWhy | null; isReference: boolean }>();
  const visit = (j: DockedJobInput, depth: number): { origin: MoleculeOrigin; known: KnownWhy | null; isReference: boolean } => {
    const done = out.get(j.id);
    if (done) return done;
    const entry = (j.flatSmiles && lib?.byFlat.get(j.flatSmiles)) || lib?.byCanonical.get(j.smiles) || null;
    const isReference = (j.flatSmiles !== null && j.flatSmiles === reference.flatSmiles) || j.smiles === reference.smiles;
    const parent = j.parentJobId ? byId.get(j.parentJobId) : undefined;
    const up = parent && depth < 20 ? visit(parent, depth + 1) : null;
    let origin: MoleculeOrigin;
    if (entry) {
      origin = {
        kind: entry.targetId === targetId ? 'this' : 'other',
        targetId: entry.targetId,
        mechanism: entry.mechanism,
        library: entry.library,
        compoundId: entry.compoundId,
        family: up ? up.origin.family : entry.compoundId,
        variant: up !== null,
      };
    } else if (up) {
      origin = { ...up.origin, variant: true };
    } else {
      origin = { kind: isReference ? 'this' : 'unknown', targetId: isReference ? targetId : null, mechanism: null, library: null, compoundId: null, family: j.id, variant: false };
    }
    const known: KnownWhy | null = isReference ? 'reference' : entry ? (KNOWN_LIBRARIES[entry.library] ?? null) : null;
    const value = { origin, known, isReference };
    out.set(j.id, value);
    return value;
  };
  for (const j of [...jobs].sort((a, b) => a.createdAt - b.createdAt)) visit(j, 0);
  return out;
}

/** 제형 3 × 용량 3 의 E · S(흔들림 전) — game-rules 와 같은 함수. */
export function scoreGrid(kcal: number, props: MoleculeProperties, cns: boolean, referenceKcal: number): ScoreCell[] {
  const cells: ScoreCell[] = [];
  // R = 1 + hERG + 간(game-rules riskMultiplier 와 같은 표) — 몸속 여행 지도가 심장 · 간에서 깎이는 양을 따로 적는다.
  const sig = propertySignals(props);
  const risk = { herg: PIPELINE_RULES.risk.herg[sig.herg], liver: PIPELINE_RULES.risk.hepatotoxicity[sig.hepatotoxicity] };
  for (const form of SCORE_FORMS) {
    for (const dose of SCORE_DOSES) {
      const s = scoreCandidate({ affinityKcal: kcal, props, dose, formulation: form, cns, referenceKcal });
      cells.push({ form, dose, efficacy: s.efficacy, safety: s.safety, inputs: { p: s.inputs.p, A: s.inputs.A, B: s.inputs.B, De: s.inputs.De, Dt: s.inputs.Dt, R: s.inputs.R, K: s.inputs.K, herg: risk.herg, liver: risk.liver } });
    }
  }
  return cells;
}

export const baseCell = (cells: readonly ScoreCell[]): ScoreCell | undefined => cells.find((c) => c.form === BASE_FORM && c.dose === BASE_DOSE);

/** 근거 칩 '효능 1위' 의 기준 — 모둠 2.2 결과(기준 약 · 실패 · 물성 없음 제외) 중 가장 큰 경구 50 mg E. */
export function bestEfficacy(rows: readonly Pick<AdmetView, 'isReference' | 'status' | 'scores'>[]): number | null {
  const es = rows.filter((r) => !r.isReference && r.status === 'succeeded').map((r) => baseCell(r.scores)?.efficacy).filter((e): e is number => typeof e === 'number');
  return es.length ? Math.max(...es) : null;
}

export function candidateFacts(row: Pick<AdmetView, 'signals' | 'radarOut' | 'scores'>, best: number | null, cns: boolean): CandidateReasonFacts {
  const cell = baseCell(row.scores);
  return {
    signals: row.signals,
    radarOut: row.radarOut.length,
    efficacy: cell?.efficacy ?? null,
    safety: cell?.safety ?? null,
    bestEfficacy: best,
    cns,
    indSafetyMin: IND_S_MIN,
  };
}

/** 찜 회고 한 줄의 두 평균(사전 Vina) — 우리 찜 · 1.2 결합 예측(표적 점수) 상위 n. */
export function retroMeans(
  claims: ReadonlyArray<{ vinaKcal: number | null }>,
  screenCandidates: ReadonlyArray<{ screenScore: number; vinaKcal?: number }>,
): { n: number; ourMeanKcal: number | null; topMeanKcal: number | null } {
  const n = claims.length;
  const top = [...screenCandidates].sort((a, b) => b.screenScore - a.screenScore).slice(0, n);
  return {
    n,
    ourMeanKcal: mean(claims.map((c) => c.vinaKcal).filter((v): v is number => typeof v === 'number')),
    topMeanKcal: mean(top.map((c) => c.vinaKcal).filter((v): v is number => typeof v === 'number')),
  };
}

// ── 화면 한 장 ──

interface Ctx {
  teamId: string;
  revisionId: string;
  targetId: string | null;
  target: DiseaseOption | null;
}

interface Built {
  ctx: Ctx;
  response: SelectionResponse;
}

const toPerson = (r: { user_id: string; display_name: string | null; avatar: Avatar | null }) => ({ userId: r.user_id, byName: r.display_name ?? '(나간 모둠원)', avatar: r.avatar });

async function loadSelection(deps: Deps, teamId: string): Promise<Built> {
  const db = deps.db;
  const program = await loadProgramRow(db, teamId);
  if (!program.revision_id) throw new ApiError(404, 'not_found', '모둠 프로그램을 찾지 못했어요.');
  const revisionId = program.revision_id;
  const targetId = program.target_id;
  const target = DISEASES.find((d) => d.targetId === targetId) ?? null;
  const ctx: Ctx = { teamId, revisionId, targetId, target };

  // 한 연결로 줄 세워 읽는다 — 4인이 한꺼번에 눌러도 요청마다 연결 1개(풀 · 역할 연결 상한을 아낀다).
  const one = await db.connect();
  const reads = [
    one.query<JobRow>(`${JOB_SELECT} where j.team_id = $1 and j.program_revision_id = $2 and j.step in ('1.2', '2.1', '2.2') order by j.created_at`, [teamId, revisionId]),
    one.query<{ docking_job_id: string; user_id: string; display_name: string | null; avatar: Avatar | null; slot: 1 | 2; reason: string; created_at: Date }>(
      `select p.docking_job_id, p.picked_by as user_id, a.display_name, m.avatar, p.slot, p.reason, p.created_at
         from web.dock_picks p left join web.accounts a on a.user_id = p.picked_by
         left join web.members m on m.user_id = p.picked_by and m.role = 'student'
        where p.program_revision_id = $1 order by p.created_at`,
      [revisionId],
    ),
    one.query<{ admet_job_id: string; user_id: string; display_name: string | null; avatar: Avatar | null; slot: 1 | 2; reason: string; known_substance: boolean; created_at: Date }>(
      `select c.admet_job_id, c.picked_by as user_id, a.display_name, m.avatar, c.slot, c.reason, c.known_substance, c.created_at
         from web.lead_candidates c left join web.accounts a on a.user_id = c.picked_by
         left join web.members m on m.user_id = c.picked_by and m.role = 'student'
        where c.program_revision_id = $1 order by c.created_at`,
      [revisionId],
    ),
    one.query<{ compound_id: string; name: string; smiles: string; screen_job_id: string; user_id: string; display_name: string | null; avatar: Avatar | null; vina_kcal: number | null; reason: string }>(
      `select c.compound_id, c.name, c.smiles, c.screen_job_id, c.claimed_by as user_id, a.display_name, m.avatar, c.vina_kcal, c.reason
         from web.claims c left join web.accounts a on a.user_id = c.claimed_by
         left join web.members m on m.user_id = c.claimed_by and m.role = 'student'
        where c.program_revision_id = $1 order by c.created_at`,
      [revisionId],
    ),
    one.query<{ n: number }>(`select count(*)::int as n from web.members where team_id = $1 and role = 'student'`, [teamId]),
  ] as const;
  // 하나가 실패해도 나머지가 끝난 뒤에 연결을 돌려준다(진행 중인 질의가 남은 연결을 풀에 돌려주지 않게).
  const [jobsRows, picksRows, candRows, claimRows, memberRows] = await Promise.all(reads).finally(async () => {
    await Promise.allSettled(reads);
    one.release();
  });
  const members = memberRows.rows[0]?.n ?? 0;
  const jobs = jobsRows.rows;
  const docks = jobs.filter((j) => j.step === '2.1' && j.status === 'succeeded' && j.affinity_kcal !== null);
  const admets = jobs.filter((j) => j.step === '2.2');

  const base: SelectionResponse = {
    revisionId,
    targetId,
    cns: target?.cns ?? false,
    members,
    limits: { dockPerPerson: DOCK_PICKS_PER_PERSON, dockPerTeam: DOCK_PICKS_PER_TEAM, leadPerPerson: leadCandidatesPerPerson(members), leadPerTeam: LEAD_CANDIDATES_PER_TEAM },
    indSafetyMin: IND_S_MIN,
    gauge: null,
    docked: [],
    picks: picksRows.rows.map((r) => ({ jobId: r.docking_job_id, ...toPerson(r), slot: r.slot, reason: r.reason, createdAt: r.created_at.toISOString() })),
    retro: null,
    admet: [],
    reference: null,
    candidates: candRows.rows.map((r) => ({ jobId: r.admet_job_id, ...toPerson(r), slot: r.slot, reason: r.reason, known: r.known_substance, createdAt: r.created_at.toISOString() })),
  };
  if (!target || !targetId) return { ctx, response: base };

  const ref = target.referenceKcal;
  const smilesOf = (j: JobRow) => j.canonical_smiles ?? j.smiles ?? '';
  const uniqueSmiles = [...new Set([target.referenceLigand.smiles, ...docks.map(smilesOf), ...admets.map(smilesOf)].filter(Boolean))];
  const [lib, propsList] = await Promise.all([libraryFor(deps, targetId), Promise.all(uniqueSmiles.map((s) => propsOf(deps, s)))]);
  const props = new Map(uniqueSmiles.map((s, i) => [s, propsList[i] ?? null]));
  const refProps = props.get(target.referenceLigand.smiles) ?? null;

  // 사전 Vina 이정표(가운데값 · 1위 · 히스타민)는 모둠이 도킹을 하나라도 끝낸 뒤에만 — 1.2 동안 이 경로로 미리 보지 않게(§5.5.1).
  const opened = docks.length > 0 ? lib : null;
  const gauge: GaugeView = {
    referenceKcal: ref,
    p0Kcal: round2(affinityFloorKcal(ref)),
    p1Kcal: round2(ref + PIPELINE_RULES.affinity.headroomKcal - PIPELINE_RULES.affinity.spanKcal),
    medianKcal: opened?.medianKcal ?? null,
    topKcal: opened?.topKcal ?? null,
    libraryCount: opened?.count ?? 0,
    histamineKcal: opened?.histamineKcal ?? null,
  };

  const origins = resolveOrigins(
    docks.map((j) => ({ id: j.id, smiles: smilesOf(j), flatSmiles: props.get(smilesOf(j))?.flatSmiles ?? null, parentJobId: j.parent_job_id, createdAt: j.created_at.getTime() })),
    lib,
    targetId,
    { flatSmiles: refProps?.flatSmiles ?? null, smiles: target.referenceLigand.smiles },
  );
  const dockById = new Map(docks.map((j) => [j.id, j]));
  const ranked = [...docks].sort((a, b) => a.affinity_kcal! - b.affinity_kcal! || a.created_at.getTime() - b.created_at.getTime());
  const docked: DockedView[] = ranked.map((j, i) => {
    const o = origins.get(j.id)!;
    const parent = j.parent_job_id ? dockById.get(j.parent_job_id) : undefined;
    // 같은 분자(정규 SMILES)의 ADMET 는 한 번만 받는다 — 다른 도킹 작업으로 이미 돌렸으면 그 작업을 가리킨다.
    const admet = admets.find((a) => a.parent_job_id === j.id && a.status !== 'failed') ?? admets.find((a) => a.status !== 'failed' && smilesOf(a) === smilesOf(j));
    return {
      jobId: j.id,
      ...toPerson({ user_id: j.created_by ?? '', display_name: j.by_name, avatar: j.by_avatar }),
      label: j.label,
      smiles: smilesOf(j),
      kcal: j.affinity_kcal!,
      p: round3(affinityStrength(j.affinity_kcal!, ref)),
      parentJobId: j.parent_job_id,
      parentLabel: parent?.label ?? null,
      parentKcal: parent?.affinity_kcal ?? null,
      origin: o.origin,
      known: o.known,
      isReference: o.isReference,
      rank: i + 1,
      admetJobId: admet?.id ?? null,
    };
  });

  const view = (input: { smiles: string; kcal: number; origin: MoleculeOrigin; known: KnownWhy | null; isReference: boolean }) => {
    const p = props.get(input.smiles) ?? null;
    const signals = p ? propertySignals(p) : null;
    return {
      kcal: input.kcal,
      p: round3(affinityStrength(input.kcal, ref)),
      props: p,
      signals,
      notes: p && signals ? signalNotes(p, signals) : null,
      radarOut: p ? radarOutside(p) : [],
      scores: p ? scoreGrid(input.kcal, p, target.cns, ref) : [],
      origin: input.origin,
      known: input.known,
      isReference: input.isReference,
    };
  };

  const admet: AdmetView[] = admets
    .filter((j) => j.parent_job_id && dockById.has(j.parent_job_id))
    .map((j) => {
      const d = docked.find((x) => x.jobId === j.parent_job_id)!;
      const rows = j.result?.table?.rows ?? [];
      return {
        jobId: j.id,
        dockingJobId: d.jobId,
        ...toPerson({ user_id: j.created_by ?? '', display_name: j.by_name, avatar: j.by_avatar }),
        label: j.label ?? d.label,
        smiles: smilesOf(j),
        status: j.status,
        aiRadar: rows.slice(0, 8).map((r) => ({ axis: String(r[0] ?? ''), score: Number(r[1] ?? 0), verdict: String(r[2] ?? '') })),
        ...view({ smiles: smilesOf(j), kcal: d.kcal, origin: d.origin, known: d.known, isReference: d.isReference }),
      };
    });
  const reference: AdmetView = {
    jobId: null,
    dockingJobId: null,
    userId: '',
    byName: SELECTION_COPY.s22.reference,
    avatar: null,
    label: `${target.referenceLigand.name}`,
    smiles: target.referenceLigand.smiles,
    status: 'succeeded',
    aiRadar: [],
    ...view({
      smiles: target.referenceLigand.smiles,
      kcal: ref,
      origin: { kind: 'this', targetId, mechanism: null, library: null, compoundId: null, family: 'reference', variant: false },
      known: 'reference',
      isReference: true,
    }),
  };

  // 찜 회고 — 도킹을 하나라도 끝낸 뒤에만(그 전에는 2.1 이 '이미 아는 답'이 되지 않게).
  let retro: RetroView | null = null;
  if (docks.length > 0 && claimRows.rows.length > 0) {
    const lastScreen = [...jobs].reverse().find((j) => j.step === '1.2' && j.status === 'succeeded');
    const screenResult = lastScreen?.result as ExperimentResult | null | undefined;
    // 3판 통합 — '결합 예측 상위 n' 은 그 1.2 실행의 진열대(F12 `result.snapshot.passIds` — 관문을 모두 통과한 분자) 안에서 고른다.
    // 진열대가 없는 옛 실행만 워커 후보 목록으로 센다. 원자료(사전 Vina)는 F12 의 서버 전용 `screenLibrary().raw`.
    const passIds = (screenResult as { snapshot?: { passIds?: unknown } } | null | undefined)?.snapshot?.passIds;
    let pool: Array<{ screenScore: number; vinaKcal?: number }> = screenResult?.candidates ?? [];
    if (Array.isArray(passIds) && passIds.length > 0) {
      const raw = await screenLibrary(deps, targetId).then((l) => l.raw).catch(() => null);
      if (raw) {
        pool = passIds.flatMap((id) => {
          const c = raw.get(String(id));
          const v = c?.vinaKcalByTarget?.[targetId];
          return c ? [{ screenScore: Number(c.screenScoreByTarget?.[targetId] ?? 0), ...(typeof v === 'number' ? { vinaKcal: v } : {}) }] : [];
        });
      }
    }
    const means = retroMeans(claimRows.rows.map((c) => ({ vinaKcal: c.vina_kcal })), pool);
    retro = {
      rows: claimRows.rows.map((c) => {
        // 찜한 그 분자의 원본 도킹(변형체 제외) — 라이브러리 id 로 맞추고, 못 찾으면 입력 · 정규 SMILES 로.
        const mine = docks
          .filter((j) => !j.parent_job_id && (origins.get(j.id)?.origin.compoundId === c.compound_id || j.smiles === c.smiles || j.canonical_smiles === c.smiles))
          .map((j) => j.affinity_kcal!);
        return { compoundId: c.compound_id, name: c.name, ...toPerson(c), reason: c.reason, dockedKcal: mine.length ? Math.min(...mine) : null, rank: lib?.rank.get(c.compound_id) ?? null };
      }),
      of: lib?.count ?? 0,
      ...means,
    };
  }

  return { ctx, response: { ...base, gauge, docked, retro, admet, reference } };
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

// ── 담기 · 빼기 ──

/**
 * 비어 있는 칸 번호(1 · 2) — 없으면 undefined. 칸 번호가 아니라 **가진 수**로 상한을 센다:
 * 2명 모둠일 때 칸 2 를 받은 사람이 모둠이 커져 1인 1개가 된 뒤 칸 1 을 또 받지 않게.
 */
export function freeSlot(mine: readonly number[], perPerson: number): 1 | 2 | undefined {
  if (mine.length >= perPerson) return undefined;
  return ([1, 2] as const).find((s) => !mine.includes(s));
}

/** 표적 버전 행 잠금 — 같은 버전의 담기 · 빼기 · 상한 세기를 줄 세운다(작업 접수의 key share 와는 막지 않는다). */
async function lockRevision(tx: Queryable, teamId: string, expectRevision: string): Promise<void> {
  const program = await lockedProgram(tx, teamId);
  if (program.revision_id !== expectRevision) throw new ApiError(409, 'stale', '그 사이 모둠 표적이 바뀌었어요. 화면을 새로 고쳐 주세요.');
  await tx.query('select 1 from web.program_revisions where id = $1 for no key update', [expectRevision]);
}

const reasonOf = (raw: unknown, allowed: readonly string[], label: string): string => {
  if (typeof raw !== 'string' || !allowed.includes(raw)) throw badRequest(`${label}를 골라 주세요.`);
  return raw;
};

export async function addDockPick(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; slot: number }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const jobId = typeof body.dockingJobId === 'string' ? body.dockingJobId.toLowerCase() : '';
  if (!UUID.test(jobId)) throw badRequest('담을 도킹 결과를 골라 주세요.');
  const reason = reasonOf(body.reason, DOCK_REASONS, '담는 근거');
  // 워커 자료(출신 · 물성)는 잠그기 전에 읽는다 — 트랜잭션 안에서는 DB 만.
  const { ctx, response } = await loadSelection(deps, who.teamId);
  const mol = response.docked.find((d) => d.jobId === jobId);
  if (!mol) throw new ApiError(409, 'step_locked', '지금 표적으로 끝난 우리 모둠의 도킹 결과만 담을 수 있어요.');
  if (mol.isReference) throw badRequest(SELECTION_COPY.s21.pickRef);

  let slot = 0;
  try {
    await withTx(deps.db, async (tx) => {
      await lockRevision(tx, who.teamId, ctx.revisionId);
      const queue = await tx.query<{ docking_job_id: string; picked_by: string; slot: number }>(
        'select docking_job_id, picked_by, slot from web.dock_picks where program_revision_id = $1',
        [ctx.revisionId],
      );
      // 같은 분자(정규 SMILES)를 다른 도킹 작업으로 이미 담았어도 같은 분자다 — 대기열 한 칸 · ADMET 한 번.
      const already = queue.rows.find((q) => q.docking_job_id === jobId || response.docked.find((d) => d.jobId === q.docking_job_id)?.smiles === mol.smiles);
      if (already) {
        const owner = await tx.query<{ display_name: string }>('select display_name from web.accounts where user_id = $1', [already.picked_by]);
        throw new ApiError(409, 'claimed', `${owner.rows[0]?.display_name ?? '다른 모둠원'} 님이 이미 담았어요.`);
      }
      // ⑧ 과 같은 꼴 — 같은 함수로 다시 판정(대기열은 잠근 뒤의 것).
      const others = queue.rows
        .map((q) => response.docked.find((d) => d.jobId === q.docking_job_id))
        .filter((d): d is DockedView => Boolean(d))
        .map((d) => ({ family: d.origin.family, library: d.origin.library }));
      const verdict = dockReasonVerdict(reason, { kcal: mol.kcal, referenceKcal: ctx.target!.referenceKcal, p: mol.p, origin: mol.origin, parentKcal: mol.parentKcal, queue: others });
      if (verdict.status === 'block') throw new ApiError(400, 'reason_blocked', verdict.message);
      const mine = queue.rows.filter((q) => q.picked_by === account.userId).map((q) => q.slot);
      const free = freeSlot(mine, DOCK_PICKS_PER_PERSON);
      if (free === undefined) throw new ApiError(409, 'limit_reached', `한 사람이 ${DOCK_PICKS_PER_PERSON}개까지 담을 수 있어요. 하나를 빼 주세요.`);
      if (queue.rows.length >= DOCK_PICKS_PER_TEAM) throw new ApiError(409, 'limit_reached', `대기열은 모둠에 ${DOCK_PICKS_PER_TEAM}개까지예요.`);
      const job = await tx.query<{ status: string; program_revision_id: string | null }>(
        `select status, program_revision_id from web.jobs where id = $1 and team_id = $2 and step = '2.1'`,
        [jobId, who.teamId],
      );
      if (job.rows[0]?.status !== 'succeeded' || job.rows[0].program_revision_id !== ctx.revisionId) throw new ApiError(409, 'step_locked', '지금 표적으로 끝난 우리 모둠의 도킹 결과만 담을 수 있어요.');
      const inserted = await tx.query(
        `insert into web.dock_picks (program_revision_id, team_id, docking_job_id, picked_by, slot, reason) values ($1, $2, $3, $4, $5, $6)
         on conflict (program_revision_id, docking_job_id) do nothing`,
        [ctx.revisionId, who.teamId, jobId, account.userId, free, reason],
      );
      if (!inserted.rowCount) throw new ApiError(409, 'claimed', '다른 모둠원이 먼저 담았어요.');
      slot = free;
    });
  } catch (error) {
    if (isUniqueViolation(error, 'dock_picks_person_slot_key')) throw new ApiError(409, 'limit_reached', `한 사람이 ${DOCK_PICKS_PER_PERSON}개까지 담을 수 있어요.`);
    throw error;
  }
  notifyTeam(deps, who.teamId, 'selection:dock', account.displayName);
  return { ok: true, slot };
}

export async function removeDockPick(deps: Deps, account: AccountView, rawJobId: string): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const jobId = rawJobId.toLowerCase();
  if (!UUID.test(jobId)) throw new ApiError(404, 'not_found', '내가 담은 분자가 아니에요.');
  const deleted = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    await tx.query('select 1 from web.program_revisions where id = $1 for no key update', [program.revision_id]);
    return tx.query('delete from web.dock_picks where program_revision_id = $1 and docking_job_id = $2 and picked_by = $3', [program.revision_id, jobId, account.userId]);
  });
  if (!deleted.rowCount) throw new ApiError(404, 'not_found', '내가 담은 분자가 아니에요.');
  notifyTeam(deps, who.teamId, 'selection:dock', account.displayName);
  return { ok: true };
}

export async function addLeadCandidate(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; slot: number }> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const jobId = typeof body.admetJobId === 'string' ? body.admetJobId.toLowerCase() : '';
  if (!UUID.test(jobId)) throw badRequest('특허 후보로 올릴 ADMET 결과를 골라 주세요.');
  const { ctx, response } = await loadSelection(deps, who.teamId);
  const reason = reasonOf(body.reason, candidateReasonsFor(response.cns), '특허 후보 근거');
  const row = response.admet.find((a) => a.jobId === jobId && a.status === 'succeeded');
  if (!row) throw new ApiError(409, 'step_locked', '지금 표적으로 끝난 우리 모둠의 ADMET 결과만 올릴 수 있어요.');
  if (!row.props) throw new ApiError(503, 'worker_unavailable', '물성을 읽지 못했어요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: 5 });
  const verdict = candidateReasonVerdict(reason, candidateFacts(row, bestEfficacy(response.admet), response.cns));
  if (verdict.status === 'block') throw new ApiError(400, 'reason_blocked', verdict.message);

  let slot = 0;
  try {
    await withTx(deps.db, async (tx) => {
      await lockRevision(tx, who.teamId, ctx.revisionId);
      const job = await tx.query<{ status: string; program_revision_id: string | null }>(
        `select status, program_revision_id from web.jobs where id = $1 and team_id = $2 and step = '2.2'`,
        [jobId, who.teamId],
      );
      if (job.rows[0]?.status !== 'succeeded' || job.rows[0].program_revision_id !== ctx.revisionId) throw new ApiError(409, 'step_locked', '지금 표적으로 끝난 우리 모둠의 ADMET 결과만 올릴 수 있어요.');
      const list = await tx.query<{ admet_job_id: string; picked_by: string; slot: number; display_name: string | null }>(
        `select c.admet_job_id, c.picked_by, c.slot, a.display_name from web.lead_candidates c left join web.accounts a on a.user_id = c.picked_by
          where c.program_revision_id = $1`,
        [ctx.revisionId],
      );
      const already = list.rows.find((r) => r.admet_job_id === jobId);
      if (already) throw new ApiError(409, 'claimed', `${already.display_name ?? '다른 모둠원'} 님이 이미 올렸어요.`);
      const members = await tx.query<{ n: number }>(`select count(*)::int as n from web.members where team_id = $1 and role = 'student'`, [who.teamId]);
      const perPerson = leadCandidatesPerPerson(members.rows[0]?.n ?? 0);
      const mine = list.rows.filter((r) => r.picked_by === account.userId).map((r) => r.slot);
      const free = freeSlot(mine, perPerson);
      if (free === undefined) throw new ApiError(409, 'limit_reached', `한 사람이 ${perPerson}개까지 올릴 수 있어요. 하나를 빼 주세요.`);
      if (list.rows.length >= LEAD_CANDIDATES_PER_TEAM) throw new ApiError(409, 'limit_reached', `특허 후보는 모둠에 ${LEAD_CANDIDATES_PER_TEAM}개까지예요.`);
      const inserted = await tx.query(
        `insert into web.lead_candidates (program_revision_id, team_id, admet_job_id, picked_by, slot, reason, known_substance) values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (program_revision_id, admet_job_id) do nothing`,
        [ctx.revisionId, who.teamId, jobId, account.userId, free, reason, row.known !== null],
      );
      if (!inserted.rowCount) throw new ApiError(409, 'claimed', '다른 모둠원이 먼저 올렸어요.');
      slot = free;
    });
  } catch (error) {
    if (isUniqueViolation(error, 'lead_candidates_person_slot_key')) throw new ApiError(409, 'limit_reached', '한 사람이 올릴 수 있는 수를 넘었어요.');
    throw error;
  }
  notifyTeam(deps, who.teamId, 'selection:lead', account.displayName);
  return { ok: true, slot };
}

export async function removeLeadCandidate(deps: Deps, account: AccountView, rawJobId: string): Promise<{ ok: true }> {
  const who = await teamMember(deps.db, account);
  const jobId = rawJobId.toLowerCase();
  if (!UUID.test(jobId)) throw new ApiError(404, 'not_found', '내가 올린 특허 후보가 아니에요.');
  const deleted = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    await tx.query('select 1 from web.program_revisions where id = $1 for no key update', [program.revision_id]);
    // 먼저 지우고(행 잠금) 그다음 출원서를 본다 — 출원서를 만드는 쪽이 후보 행을 for share 로 잡으면, 어느 순서로 와도
    // '후보 없는 출원서'가 생기지 않는다(그쪽이 먼저면 이 문장이 기다렸다가 아래 검사가 그 출원서를 본다).
    const removed = await tx.query('delete from web.lead_candidates where program_revision_id = $1 and admet_job_id = $2 and picked_by = $3', [program.revision_id, jobId, account.userId]);
    if (!removed.rowCount) return removed;
    // 살아 있는 출원서(3.1)가 이 후보를 쓰면 빼지 않는다(던지면 지운 것도 되돌린다).
    const filed = await tx.query(
      `select 1 from web.patent_applications where program_revision_id = $1 and admet_job_id = $2 and status not in ('rejected', 'abandoned') limit 1`,
      [program.revision_id, jobId],
    );
    if (filed.rowCount) throw new ApiError(409, 'already_exists', '이 후보로 낸 특허 출원서가 있어 뺄 수 없어요.');
    return removed;
  });
  if (!deleted.rowCount) throw new ApiError(404, 'not_found', '내가 올린 특허 후보가 아니에요.');
  notifyTeam(deps, who.teamId, 'selection:lead', account.displayName);
  return { ok: true };
}

export function register(router: Router<RequestContext>): void {
  router.on('GET', SELECTION_API.get, async (ctx) => {
    const who = await teamMember(ctx.deps.db, requireAccount(ctx));
    return (await loadSelection(ctx.deps, who.teamId)).response;
  });
  router.on('POST', SELECTION_API.dockPicks, async (ctx) => {
    const result = await addDockPick(ctx.deps, requireAccount(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return result;
  });
  router.on('DELETE', '/api/selection/dock-picks/:jobId', async (ctx, p) => removeDockPick(ctx.deps, requireAccount(ctx), p.jobId!));
  router.on('POST', SELECTION_API.leadCandidates, async (ctx) => {
    const result = await addLeadCandidate(ctx.deps, requireAccount(ctx), await readJson(ctx.req));
    ctx.status = 201;
    return result;
  });
  router.on('DELETE', '/api/selection/lead-candidates/:jobId', async (ctx, p) => removeLeadCandidate(ctx.deps, requireAccount(ctx), p.jobId!));

  // 2.2 ADMET — 대기열(dock_picks)에 있는 분자만 · 같은 분자는 한 번만(§5.6). 모둠 잠금 · 표적 버전 확인 뒤 · 과금 전.
  onJobAdmit('2.2', async (tx, { revisionId, prepared }) => {
    const dockingJobId = prepared.parentJobId;
    const picked = await tx.query('select 1 from web.dock_picks where program_revision_id = $1 and docking_job_id = $2 for share', [revisionId, dockingJobId]);
    if (!picked.rowCount) throw new ApiError(409, 'step_locked', '2.1 대기열에 담긴 분자만 ADMET 를 돌릴 수 있어요.');
    // 같은 분자 = 같은 도킹 작업 또는 같은 정규 SMILES(두 사람이 같은 분자를 따로 도킹했어도 ADMET · 과금은 한 번).
    const dup = await tx.query(
      `select 1 from web.jobs where program_revision_id = $1 and step = '2.2' and (parent_job_id = $2 or smiles = $3) and status <> 'failed' limit 1`,
      [revisionId, dockingJobId, prepared.smiles],
    );
    if (dup.rowCount) throw new ApiError(409, 'already_exists', '이 분자는 이미 ADMET 를 돌렸어요(같은 분자는 같은 결과예요).');
  });
}
