/**
 * 기능 F31 — 3.1 코드명 해부도 · 출원서 · 심사 · 학급 특허 원장 5.04(설계 §5.8 · §5.8.1 · §5.11).
 *
 * 소유: 이 파일 · packages/web-contract/src/patent.ts · apps/web/src/board/steps/s31.tsx(+ css) · db/migrations/0012_patents.sql.
 * 표(0006 + 0012): web.patent_applications(상태 · 판 · 코드명 UQ(학급, 코드명) · 물질 칸 · 거절 이유) · patent_sections(칸 — reviews.ts `saveSection`) ·
 *   doc_reviews(심사 — reviews.ts `requestReview`) · patents(원장 — 부분 고유 키 (학급, flat_smiles) where active) · classes.max_patents_per_team.
 *
 * 흐름
 *   ① 출원할 후보 = 지금 표적 버전의 2.2 특허 후보(lead_candidates). 출원서를 만들 때 워커 /molecule/properties 로 평면 SMILES · 물성을 한 번 계산해
 *      출원서 줄에 둔다(잠금 안에서 HTTP 를 부르지 않게). 이미 알려진 물질(데이터셋 승인약 · ZINC 소형 · 기준 리간드 · 2.2 표시)도 이때 판정.
 *   ② 코드명 — 출원서 줄의 code_name(UQ(학급, 코드명)). 화면이 읽은 코드명(expectedCode)과 지금이 다르면 409(그 칸만의 낙관적 잠금).
 *   ③ 출원서 칸 — reviews.ts `saveSection`(칸마다 판 · 늦은 쪽 409 stale + 지금 칸 — ⑪). 심사 중에도 칸은 고칠 수 있다(결과는 심사한 판에만).
 *   ④ 심사 요청 — 모둠 줄 잠금 안에서 규칙(형식 · 코드명 · SMILES 원문 · 상한(받아들여짐 + 심사 중) · 잔액 · 신규성 · 학급 중복 · 선행 특허)을 보고
 *      `requestReview`(UQ — ⑫ · 하루 상한). 규칙 fail 은 LLM 없이 보완(신규성 · 중복은 거절). LLM 에는 코드명 · 서버 계산 사실 · 칸 글만(SMILES 원문 · 실명 없음).
 *   ⑤ 받아들임 = `onReviewed('patent')`(판정을 쓴 트랜잭션 안 — ⑩): teams 잠금 → 출원서 잠금 → classes 잠금(class_seq) → 저장점 →
 *      patents insert(부분 고유 키 위반 = 먼저 받아들여진 같은 물질 → 저장점으로 되돌리고 '거절 · 이미 있음', 과금 없음) → 출원료 charge(멱등 `patent:<출원 id>`,
 *      잔액 부족이면 되돌리고 보완) → 출원서 accepted → 전광판 소식(`postBoardEvent` 'patent'). 커밋 뒤 학급 WS 'patent.ledger' · 모둠 'board.changed'.
 *   포기 — 등록 특허를 포기하면 슬롯이 돌아오고(환급 없음 · 전광판 소식 없음) 그 분자는 다른 모둠이 낼 수 있다. 3.2 · 3.3 에서 쓰는 특허는 포기 못 한다.
 * 공개 범위: 등록 특허의 구조식 · 코드명은 학급 원장(학급 공개). 출원서 본문 · 심사 결과 · 물성은 모둠과 교사만. 거절 빨간 줄은 그 모둠에만.
 * 지문 유사도(심사 4번)는 서버 RDKit.js · 워커 끝점 모두 아직 없어서 건너뛴다(규칙 결과에 '건너뜀'으로 남긴다).
 */
import { DISEASE_LABEL, DOCKING_TARGETS } from '@crista/shared-types';
import {
  checkCodeName,
  codeProblemText,
  formatCentsAsCrista,
  isPatentSection,
  MECH_ACTIONS,
  MECH_HOW,
  parseList,
  PATENT_CHECKLIST,
  PATENT_COPY as COPY,
  PATENT_FEE_CENTS,
  PATENT_KNOWN_LIBRARIES,
  PATENT_REVIEWER_VERSION,
  PATENT_SECTION_KEYS,
  PATENT_SECTIONS,
  patentNumber,
  sectionReviewProblem,
  sectionShapeProblem,
  smilesInText,
  type AccountView,
  type Avatar,
  type MechAction,
  type MechHow,
  type PatentApplicationStatus,
  type PatentApplicationView,
  type PatentCandidateView,
  type PatentFactsView,
  type PatentLedgerResponse,
  type PatentLedgerRow,
  type PatentPrecheckResponse,
  type PatentRejectReason,
  type PatentsResponse,
  type PatentStatus,
  type ReviewRequestResponse,
  type RuleFinding,
  type SectionSaveResponse,
} from '@crista-web/web-contract';
import { postBoardEvent } from '../board-events.ts';
import { currentGameDay } from '../clock.ts';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable, type Tx } from '../db.ts';
import { requireAccount, requireTeacherOf } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { balanceCents, charge } from '../ledger.ts';
import { notifyTeam, teamMember, type TeamMember } from '../pipeline.ts';
import { latestReview, loadReviewView, loadSections, onReviewed, requestReview, saveSection, type ReviewRecord } from '../reviews.ts';
import type { RequestContext } from '../routes.ts';
import { WorkerUnavailableError } from '../worker.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE: readonly PatentApplicationStatus[] = ['draft', 'revise', 'reviewing'];
const REVIEWABLE: readonly PatentApplicationStatus[] = ['draft', 'revise'];

// ── 행 ──

interface AppRow {
  id: string;
  program_revision_id: string;
  team_id: string;
  class_id: string;
  admet_job_id: string;
  code_name: string | null;
  status: PatentApplicationStatus;
  version: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  canonical_smiles: string | null;
  flat_smiles: string | null;
  properties: Record<string, unknown> | null;
  known_substance: boolean;
  reject_reason: PatentRejectReason | null;
}

interface TeamRow {
  ticker: string;
  startup_name: string;
  class_id: string;
  max_patents_per_team: number;
  revision_id: string | null;
  target_id: string | null;
  disease_id: string | null;
}

interface JobFacts {
  id: string;
  step: string;
  parent_job_id: string | null;
  affinity_kcal: number | null;
  label: string | null;
  canonical_smiles: string | null;
  smiles: string | null;
  metrics: Array<{ label: string; value: string; unit?: string }> | null;
  tbl: { columns: string[]; rows: string[][] } | null;
}

const diseaseLabel = (id: string | null): string | null => (id ? ((DISEASE_LABEL as Record<string, string>)[id] ?? null) : null);
const targetOf = (id: string | null) => (id ? (DOCKING_TARGETS.find((t) => t.id === id) ?? null) : null);

async function loadTeamRow(db: Queryable, teamId: string): Promise<TeamRow> {
  const result = await db.query<TeamRow>(
    `select t.ticker, t.startup_name, t.class_id, c.max_patents_per_team, r.id as revision_id, r.target_id, r.disease_id
       from web.teams t join web.classes c on c.id = t.class_id
       left join web.programs p on p.team_id = t.id
       left join web.program_revisions r on r.id = p.current_revision_id
      where t.id = $1`,
    [teamId],
  );
  const row = result.rows[0];
  if (!row?.ticker) throw new ApiError(409, 'not_registered_team', '스타트업 이름을 먼저 등기해 주세요.');
  return row;
}

async function loadApp(db: Queryable, teamId: string, applicationId: string, lock = false): Promise<AppRow> {
  const result = await db.query<AppRow>(`select * from web.patent_applications where id = $1 and team_id = $2${lock ? ' for update' : ''}`, [applicationId, teamId]);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'not_found', '출원서를 찾지 못했어요.');
  return row;
}

/** ADMET 작업 → 그 부모 도킹 작업 → 도킹의 부모(구조 바꿔 다시)까지 사실을 읽는다. */
async function loadJobFacts(db: Queryable, teamId: string, admetJobIds: string[]): Promise<Map<string, JobFacts>> {
  const out = new Map<string, JobFacts>();
  let ids = [...new Set(admetJobIds)];
  for (let depth = 0; depth < 3 && ids.length > 0; depth += 1) {
    const result = await db.query<JobFacts>(
      `select id, step, parent_job_id, affinity_kcal, label, canonical_smiles, smiles, result->'metrics' as metrics, result->'table' as tbl
         from web.jobs where team_id = $1 and id = any($2::uuid[])`,
      [teamId, ids],
    );
    for (const row of result.rows) out.set(row.id, row);
    ids = result.rows.map((r) => r.parent_job_id).filter((id): id is string => !!id && !out.has(id));
  }
  return out;
}

function factsOf(team: Pick<TeamRow, 'ticker' | 'startup_name'>, rev: { target_id: string | null; disease_id: string | null }, app: Pick<AppRow, 'admet_job_id' | 'canonical_smiles' | 'flat_smiles' | 'properties' | 'known_substance'>, jobs: Map<string, JobFacts>): PatentFactsView {
  const target = targetOf(rev.target_id);
  const admet = jobs.get(app.admet_job_id);
  const dock = admet?.parent_job_id ? jobs.get(admet.parent_job_id) : undefined;
  const parent = dock?.parent_job_id ? jobs.get(dock.parent_job_id) : undefined;
  const residues = (dock?.tbl?.rows ?? []).map((r) => r[0]).filter((x): x is string => typeof x === 'string').slice(0, 8);
  const num = (k: string): number | null => {
    const v = app.properties?.[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  return {
    ticker: team.ticker,
    companyName: team.startup_name,
    targetId: rev.target_id,
    gene: target?.gene ?? null,
    targetLabel: target?.label ?? null,
    disease: diseaseLabel(rev.disease_id) ?? target?.disease ?? null,
    referenceName: target?.referenceLigand.name ?? null,
    referenceKcal: target?.referenceKcal ?? null,
    dockingKcal: dock?.affinity_kcal ?? null,
    parentKcal: parent?.step === '2.1' ? parent.affinity_kcal : null,
    residues,
    admet: (admet?.metrics ?? []).slice(0, 8).map((m) => ({ label: m.label, value: String(m.value), unit: m.unit ?? null })),
    canonicalSmiles: app.canonical_smiles ?? admet?.canonical_smiles ?? null,
    flatSmiles: app.flat_smiles,
    mw: num('mw'),
    tpsa: num('tpsa'),
    clogp: num('clogp'),
    qed: num('qed'),
    admetJobId: app.admet_job_id,
    dockingJobId: dock?.id ?? null,
    known: app.known_substance,
    label: admet?.label ?? dock?.label ?? null,
  };
}

// ── 이미 알려진 물질(심사 2번) ──

let knownCache: { set: Set<string>; at: number } | null = null;
const KNOWN_TTL_MS = 30 * 60_000;
/** 워커가 없을 때 GET 마다 워커를 다시 두드리지 않게 — 실패 뒤 이 시간 동안은 바로 던진다. */
const KNOWN_FAIL_BACKOFF_MS = 30_000;
let knownInFlight: Promise<Set<string>> | null = null;
let knownFailedAt = 0;

async function fetchKnownSubstances(deps: Pick<Deps, 'worker'>): Promise<Set<string>> {
  const set = new Set<string>();
  for (const library of PATENT_KNOWN_LIBRARIES) {
    // 물성 컷오프를 사실상 끄고 라이브러리 전부(워커 상한 500). Ro5 위반 2건 이상은 워커 깔때기가 늘 빼므로 여기서도 빠진다(남은 문제).
    const res = await deps.worker.compounds({ targetId: '', library, maxMw: 100_000, maxTpsa: 100_000, ro5Only: false, excludeAlerts: false, limit: 500 });
    for (const c of res.compounds) {
      set.add(c.canonicalSmiles);
      const flat = (c as { flatSmiles?: unknown }).flatSmiles;
      if (typeof flat === 'string' && flat) set.add(flat);
    }
  }
  // 기준 리간드 12종은 한꺼번에(차례로 부르면 첫 GET 이 그만큼 늦다).
  const refs = await Promise.all(DOCKING_TARGETS.map((t) => deps.worker.properties(t.referenceLigand.smiles)));
  DOCKING_TARGETS.forEach((t, i) => {
    const p = refs[i]!;
    if (p.ok) {
      set.add(p.properties.flatSmiles);
      set.add(p.properties.canonicalSmiles);
    }
    set.add(t.referenceLigand.smiles);
  });
  return set;
}

/**
 * 데이터셋 승인약 · ZINC 소형 · 표적 기준 리간드의 평면 · 정규 SMILES(워커 · 프로세스 캐시 30분). 워커가 없으면 던진다.
 * 동시에 여러 GET 이 와도 워커는 한 번만 부르고(같은 약속을 나눠 씀), 실패하면 30초 동안은 워커를 다시 부르지 않고 던진다.
 */
export async function knownSubstances(deps: Pick<Deps, 'worker'>): Promise<Set<string>> {
  if (knownCache && Date.now() - knownCache.at < KNOWN_TTL_MS) return knownCache.set;
  if (Date.now() - knownFailedAt < KNOWN_FAIL_BACKOFF_MS) throw new WorkerUnavailableError('알려진 물질 목록을 잠시 뒤에 다시 읽어요.');
  knownInFlight ??= fetchKnownSubstances(deps)
    .then((set) => {
      knownCache = { set, at: Date.now() };
      return set;
    })
    .catch((error: unknown) => {
      knownFailedAt = Date.now();
      throw error;
    })
    .finally(() => {
      knownInFlight = null;
    });
  return knownInFlight;
}

/** 시험용 — 캐시 비우기 · 채우기. */
export function setKnownCacheForTest(set: Set<string> | null): void {
  knownCache = set ? { set, at: Date.now() } : null;
  knownFailedAt = 0;
}

export const isKnownSubstance = (known: ReadonlySet<string>, smiles: Array<string | null | undefined>): boolean => smiles.some((s) => !!s && known.has(s));

// ── 규칙 검사(심사 1~4 — 순수, 시험 대상) ──

export interface PatentRuleInput {
  sections: Record<string, string>;
  codeName: string | null;
  ticker: string;
  /** 이 출원서 말고 우리 모둠이 쓴 코드명. */
  takenCodes: readonly string[];
  memberIds: readonly string[];
  smiles: readonly string[];
  /** 이 출원서 말고 받아들여짐 + 심사 중. */
  usedOthers: number;
  max: number;
  balanceCents: number;
  feeCents: number;
  known: boolean;
  /** 학급 원장에 같은 물질의 유효 특허가 있으면 그 코드명. */
  duplicateCode: string | null;
}

export function patentRuleFindings(input: PatentRuleInput): RuleFinding[] {
  const out: RuleFinding[] = [];
  let formatFails = 0;
  for (const key of PATENT_SECTION_KEYS) {
    const body = input.sections[key] ?? '';
    const problem = sectionReviewProblem(key, body);
    if (problem) {
      formatFails += 1;
      out.push({ id: `format_${key}`, status: 'fail', section: key, note: COPY.rule.format(COPY.sectionLabel[key], COPY.sectionProblem[problem](PATENT_SECTIONS[key].min, PATENT_SECTIONS[key].max)) });
      continue;
    }
    if (key === 'inventors' && !parseList(body).every((id) => input.memberIds.includes(id))) {
      formatFails += 1;
      out.push({ id: 'format_inventors', status: 'fail', section: key, note: COPY.rule.inventorNotMember });
    }
  }
  if (formatFails === 0) out.push({ id: 'format', status: 'ok', note: COPY.rule.formatOk });
  const code = checkCodeName(input.codeName ?? '', { ticker: input.ticker, taken: input.takenCodes });
  out.push(code.ok ? { id: 'code_name', status: 'ok', note: COPY.codeOk(input.codeName ?? '') } : { id: 'code_name', status: 'fail', section: 'code_tick', note: COPY.rule.format(COPY.tabs.code, codeProblemText(code.problems[0]!, { ticker: input.ticker, code: input.codeName })) });
  const leaked = PATENT_SECTION_KEYS.find((k) => PATENT_SECTIONS[k].toLlm && smilesInText(input.sections[k] ?? '', input.smiles));
  if (leaked) out.push({ id: 'smiles_text', status: 'fail', section: leaked, note: COPY.rule.smilesText });
  out.push(input.usedOthers >= input.max ? { id: 'limit', status: 'fail', note: COPY.rule.limit(input.max) } : { id: 'limit', status: 'ok', note: COPY.rule.limitOk(input.usedOthers + 1, input.max) });
  const money = [formatCentsAsCrista(input.balanceCents), formatCentsAsCrista(input.feeCents)] as const;
  out.push(input.balanceCents < input.feeCents ? { id: 'balance', status: 'fail', note: COPY.rule.balance(...money) } : { id: 'balance', status: 'ok', note: COPY.rule.balanceOk(...money) });
  out.push(input.known ? { id: 'novelty', status: 'fail', severity: 'reject', note: COPY.rule.novelty } : { id: 'novelty', status: 'ok', note: COPY.rule.noveltyOk });
  out.push(input.duplicateCode ? { id: 'class_duplicate', status: 'fail', severity: 'reject', note: COPY.rule.duplicate(input.duplicateCode) } : { id: 'class_duplicate', status: 'ok', note: COPY.rule.duplicateOk });
  out.push({ id: 'prior_art', status: 'ok', note: COPY.rule.priorArtSkipped });
  return out;
}

/**
 * 거절 판정의 이유 — 규칙이 걸린 것만 이름을 붙인다(학급 중복이 먼저 · 다음 신규성).
 * 교사가 손으로 거절한 것(규칙 fail 없음)은 null — '이미 알려진 물질'로 잘못 적지 않는다.
 */
export function rejectReasonOf(findings: readonly RuleFinding[]): PatentRejectReason | null {
  const failed = (id: string) => findings.some((f) => f.id === id && f.status === 'fail');
  if (failed('class_duplicate')) return 'duplicate';
  if (failed('novelty')) return 'known';
  return null;
}

/** LLM 에 보낼 칸 — 발명자(모둠원 id)는 빼고, 고르는 칸은 한국어 낱말로. */
export function llmSections(sections: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PATENT_SECTION_KEYS) {
    const rule = PATENT_SECTIONS[key];
    const body = sections[key] ?? '';
    if (!rule.toLlm || !body) continue;
    if (rule.kind === 'how') out[key] = parseList(body).map((v) => COPY.howLabel[v as MechHow] ?? v).join(', ');
    else if (rule.kind === 'action') out[key] = COPY.actionLabel[body as MechAction] ?? body;
    else out[key] = body;
  }
  return out;
}

/** LLM 에 보낼 사실 — 별칭(코드명 · 티커)과 서버 계산 숫자만. SMILES · 실명 · 작업 id 없음(§5.11 ⑤). */
export function llmFacts(codeName: string | null, facts: PatentFactsView): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    code_name: codeName ?? '(없음)',
    ticker: facts.ticker,
    target_gene: facts.gene ?? '(없음)',
    target_name: facts.targetLabel ?? '(없음)',
    disease: facts.disease ?? '(없음)',
    reference_drug: facts.referenceName ?? '(없음)',
    prior_art_check: 'skipped',
  };
  if (facts.referenceKcal !== null) out.reference_dg_kcal_per_mol = facts.referenceKcal;
  if (facts.dockingKcal !== null) out.candidate_dg_kcal_per_mol = facts.dockingKcal;
  if (facts.dockingKcal !== null && facts.referenceKcal !== null) {
    const d = facts.dockingKcal - facts.referenceKcal;
    out.dg_vs_reference = Math.abs(d) < 0.3 ? 'similar' : d < 0 ? 'stronger_than_reference' : 'weaker_than_reference';
  }
  if (facts.parentKcal !== null) out.parent_dg_kcal_per_mol = facts.parentKcal;
  if (facts.residues.length) out.plip_residues = facts.residues.join(', ');
  for (const [k, v] of [['mw', facts.mw], ['tpsa', facts.tpsa], ['clogp', facts.clogp], ['qed', facts.qed]] as const) if (v !== null) out[k] = Math.round(v * 100) / 100;
  facts.admet.forEach((m, i) => {
    out[`admet_${i + 1}`] = `${m.label} ${m.value}${m.unit ?? ''}`;
  });
  return out;
}

// ── 화면 모양 ──

async function sectionMap(db: Queryable, applicationId: string): Promise<Record<string, string>> {
  const rows = await loadSections(db, 'patent', applicationId);
  return Object.fromEntries(rows.map((r) => [r.section, r.body]));
}

async function applicationViews(db: Queryable, team: TeamRow, apps: AppRow[]): Promise<PatentApplicationView[]> {
  if (apps.length === 0) return [];
  const teamId = apps[0]!.team_id;
  const jobs = await loadJobFacts(db, teamId, apps.map((a) => a.admet_job_id));
  const revs = await db.query<{ id: string; target_id: string | null; disease_id: string | null }>(
    'select id, target_id, disease_id from web.program_revisions where id = any($1::uuid[])',
    [[...new Set(apps.map((a) => a.program_revision_id))]],
  );
  const revOf = new Map(revs.rows.map((r) => [r.id, r]));
  const patents = await db.query<{ id: string; application_id: string; patent_no: string; class_seq: number; status: PatentStatus; filed_game_day: number }>(
    'select id, application_id, patent_no, class_seq, status, filed_game_day from web.patents where application_id = any($1::uuid[])',
    [apps.map((a) => a.id)],
  );
  const patentOf = new Map(patents.rows.map((p) => [p.application_id, p]));
  const names = await db.query<{ user_id: string; display_name: string }>('select user_id, display_name from web.accounts where user_id = any($1::uuid[])', [
    apps.map((a) => a.created_by).filter(Boolean),
  ]);
  const nameOf = new Map(names.rows.map((r) => [r.user_id, r.display_name]));
  const out: PatentApplicationView[] = [];
  for (const app of apps) {
    const p = patentOf.get(app.id);
    out.push({
      id: app.id,
      revisionId: app.program_revision_id,
      current: app.program_revision_id === team.revision_id,
      admetJobId: app.admet_job_id,
      codeName: app.code_name,
      status: app.status,
      rejectReason: app.reject_reason,
      version: app.version,
      sections: await loadSections(db, 'patent', app.id),
      facts: factsOf(team, revOf.get(app.program_revision_id) ?? { target_id: null, disease_id: null }, app, jobs),
      review: await latestReview(db, 'patent', app.id),
      patent: p ? { id: p.id, patentNo: p.patent_no, classSeq: p.class_seq, status: p.status, filedGameDay: p.filed_game_day } : null,
      createdByName: app.created_by ? (nameOf.get(app.created_by) ?? null) : null,
      createdAt: app.created_at.toISOString(),
      updatedAt: app.updated_at.toISOString(),
    });
  }
  return out;
}

/** 5.04 — 학급 원장(등록 · 포기) + 그 모둠의 '거절 · 이미 있음' 빨간 줄(teamId 가 있을 때만). */
export async function loadLedger(db: Queryable, classId: string, teamId: string | null): Promise<PatentLedgerRow[]> {
  const result = await db.query<{
    id: string; class_seq: number; patent_no: string; team_id: string; ticker: string | null; startup_name: string | null; ink: number; code_name: string;
    target_id: string | null; disease_id: string | null; canonical_smiles: string; filed_game_day: number; status: PatentStatus; created_at: Date;
  }>(
    `select p.id, p.class_seq, p.patent_no, p.team_id, t.ticker, t.startup_name, t.ink, p.code_name, r.target_id, r.disease_id, p.canonical_smiles,
            p.filed_game_day, p.status, p.created_at
       from web.patents p join web.teams t on t.id = p.team_id join web.program_revisions r on r.id = p.program_revision_id
      where p.class_id = $1 order by p.class_seq`,
    [classId],
  );
  const rows: PatentLedgerRow[] = result.rows.map((r) => ({
    id: r.id,
    kind: 'patent',
    classSeq: r.class_seq,
    patentNo: r.patent_no,
    teamId: r.team_id,
    ticker: r.ticker,
    companyName: r.startup_name,
    ink: r.ink,
    codeName: r.code_name,
    gene: targetOf(r.target_id)?.gene ?? null,
    disease: diseaseLabel(r.disease_id),
    canonicalSmiles: r.canonical_smiles,
    filedGameDay: r.filed_game_day,
    status: r.status,
    mine: r.team_id === teamId,
    createdAt: r.created_at.toISOString(),
  }));
  if (teamId) {
    const rejected = await db.query<{ id: string; team_id: string; ticker: string | null; startup_name: string | null; ink: number; code_name: string | null; target_id: string | null; disease_id: string | null; canonical_smiles: string | null; updated_at: Date }>(
      `select a.id, a.team_id, t.ticker, t.startup_name, t.ink, a.code_name, r.target_id, r.disease_id, a.canonical_smiles, a.updated_at
         from web.patent_applications a join web.teams t on t.id = a.team_id join web.program_revisions r on r.id = a.program_revision_id
        where a.team_id = $1 and a.status = 'rejected' and a.reject_reason = 'duplicate' order by a.updated_at`,
      [teamId],
    );
    for (const r of rejected.rows) {
      rows.push({
        id: r.id, kind: 'rejected', classSeq: null, patentNo: null, teamId: r.team_id, ticker: r.ticker, companyName: r.startup_name, ink: r.ink,
        codeName: r.code_name, gene: targetOf(r.target_id)?.gene ?? null, disease: diseaseLabel(r.disease_id), canonicalSmiles: r.canonical_smiles,
        filedGameDay: null, status: 'rejected', mine: true, createdAt: r.updated_at.toISOString(),
      });
    }
  }
  return rows;
}

async function usedSlots(db: Queryable, teamId: string, exceptId: string | null = null): Promise<number> {
  const result = await db.query<{ n: number }>(
    `select count(*)::int as n from web.patent_applications where team_id = $1 and status in ('reviewing', 'accepted') and ($2::uuid is null or id <> $2)`,
    [teamId, exceptId],
  );
  return result.rows[0]!.n;
}

async function takenCodes(db: Queryable, teamId: string): Promise<Array<{ codeName: string; applicationId: string }>> {
  const result = await db.query<{ code_name: string; id: string }>('select code_name, id from web.patent_applications where team_id = $1 and code_name is not null order by created_at', [teamId]);
  return result.rows.map((r) => ({ codeName: r.code_name, applicationId: r.id }));
}

export async function loadPatents(deps: Deps, teamId: string): Promise<PatentsResponse> {
  const db = deps.db;
  const team = await loadTeamRow(db, teamId);
  const apps = (await db.query<AppRow>('select * from web.patent_applications where team_id = $1 order by created_at', [teamId])).rows;
  const candidates = team.revision_id
    ? (
        await db.query<{ admet_job_id: string; reason: string; known_substance: boolean; label: string | null; smiles: string | null; dock_kcal: number | null; display_name: string | null; avatar: Avatar | null }>(
          `select lc.admet_job_id, lc.reason, lc.known_substance, coalesce(j.label, d.label) as label, coalesce(j.canonical_smiles, j.smiles) as smiles,
                  d.affinity_kcal as dock_kcal, a.display_name, m.avatar
             from web.lead_candidates lc
             join web.jobs j on j.id = lc.admet_job_id
             left join web.jobs d on d.id = j.parent_job_id
             left join web.accounts a on a.user_id = lc.picked_by
             left join web.members m on m.user_id = lc.picked_by and m.role = 'student'
            where lc.program_revision_id = $1 and lc.team_id = $2 order by lc.created_at`,
          [team.revision_id, teamId],
        )
      ).rows
    : [];
  const live = new Map(apps.filter((a) => !['rejected', 'abandoned'].includes(a.status) && a.program_revision_id === team.revision_id).map((a) => [a.admet_job_id, a]));
  // ① 후보 카드의 '이미 알려진 물질' 표시 — 워커 캐시(30분)로 미리 본다. 워커가 없으면 2.2 표시 · 출원서 판정만.
  const knownSet = candidates.length
    ? await knownSubstances(deps).catch((error: Error) => {
        console.warn('[patents] 알려진 물질 목록을 읽지 못했어요:', error.message);
        return null;
      })
    : null;
  const candidateViews: PatentCandidateView[] = candidates.map((c) => {
    const app = live.get(c.admet_job_id);
    return {
      admetJobId: c.admet_job_id,
      label: c.label,
      smiles: c.smiles,
      dockingKcal: c.dock_kcal,
      reason: c.reason,
      known: c.known_substance || (app?.known_substance ?? false) || (knownSet ? isKnownSubstance(knownSet, [c.smiles]) : false),
      pickedByName: c.display_name,
      avatar: c.avatar,
      applicationId: app?.id ?? null,
    };
  });
  return {
    ticker: team.ticker,
    companyName: team.startup_name,
    revisionId: team.revision_id,
    maxPatentsPerTeam: team.max_patents_per_team,
    used: apps.filter((a) => a.status === 'reviewing' || a.status === 'accepted').length,
    feeCents: PATENT_FEE_CENTS,
    balanceCents: await balanceCents(db, teamId),
    gameDay: await currentGameDay(db, team.class_id),
    takenCodes: await takenCodes(db, teamId),
    candidates: candidateViews,
    applications: await applicationViews(db, team, apps),
    ledger: await loadLedger(db, team.class_id, teamId),
  };
}

// ── 쓰기 ──

function workerError(error: unknown): never {
  if (error instanceof WorkerUnavailableError) throw new ApiError(503, 'worker_unavailable', error.message);
  throw error;
}

export async function createApplication(deps: Deps, member: TeamMember, raw: unknown): Promise<{ application: PatentApplicationView }> {
  const admetJobId = (raw as { admetJobId?: unknown } | null)?.admetJobId;
  if (typeof admetJobId !== 'string' || !UUID.test(admetJobId)) throw badRequest('출원할 특허 후보를 골라 주세요.');
  const team = await loadTeamRow(deps.db, member.teamId);
  if (!team.revision_id) throw new ApiError(404, 'not_found', COPY.err.noCandidate);
  const found = await deps.db.query<{ known_substance: boolean; smiles: string | null }>(
    `select lc.known_substance, coalesce(j.canonical_smiles, j.smiles) as smiles
       from web.lead_candidates lc join web.jobs j on j.id = lc.admet_job_id
      where lc.program_revision_id = $1 and lc.team_id = $2 and lc.admet_job_id = $3`,
    [team.revision_id, member.teamId, admetJobId],
  );
  const cand = found.rows[0];
  if (!cand?.smiles) throw new ApiError(404, 'not_found', COPY.err.noCandidate);
  const props = await deps.worker.properties(cand.smiles).catch(workerError);
  if (!props.ok) throw new ApiError(400, 'invalid_input', COPY.err.noProperties);
  let known = cand.known_substance;
  try {
    known ||= isKnownSubstance(await knownSubstances(deps), [props.properties.flatSmiles, props.properties.canonicalSmiles]);
  } catch (error) {
    workerError(error);
  }
  const id = await withTx(deps.db, async (tx) => {
    // 3판 통합 — 후보 행을 for share 로 잡는다(FSEL `removeLeadCandidate` 의 '먼저 지우고 → 출원서 확인'과 짝): 빼기와 만들기가 겹쳐도
    // '후보 없는 출원서'가 생기지 않는다(빼기가 먼저 커밋했으면 여기서 0행 → 404).
    const still = await tx.query('select 1 from web.lead_candidates where program_revision_id = $1 and team_id = $2 and admet_job_id = $3 for share', [team.revision_id, member.teamId, admetJobId]);
    if (!still.rowCount) throw new ApiError(404, 'not_found', COPY.err.noCandidate);
    try {
      const inserted = await tx.query<{ id: string }>(
        `insert into web.patent_applications (program_revision_id, team_id, class_id, admet_job_id, canonical_smiles, flat_smiles, properties, known_substance, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [team.revision_id, member.teamId, member.classId, admetJobId, props.properties.canonicalSmiles, props.properties.flatSmiles, JSON.stringify(props.properties), known, member.account.userId],
      );
      return inserted.rows[0]!.id;
    } catch (error) {
      if (isUniqueViolation(error, 'patent_applications_live_candidate_key')) throw new ApiError(409, 'already_exists', COPY.err.liveExists);
      if (isUniqueViolation(error, 'patent_applications_team_flat_live_key')) throw new ApiError(409, 'already_exists', COPY.err.sameMolecule);
      throw error;
    }
  });
  notifyTeam(deps, member.teamId, 'patent:created', member.account.displayName);
  const app = await loadApp(deps.db, member.teamId, id);
  return { application: (await applicationViews(deps.db, team, [app]))[0]! };
}

export async function setCodeName(deps: Deps, member: TeamMember, applicationId: string, raw: unknown): Promise<{ codeName: string | null; version: number }> {
  const body = (raw ?? {}) as { codeName?: unknown; expectedCode?: unknown };
  const next = typeof body.codeName === 'string' ? body.codeName.trim() : body.codeName === null ? '' : undefined;
  if (next === undefined) throw badRequest('코드명을 보내 주세요(비우려면 null).');
  if (body.expectedCode !== null && typeof body.expectedCode !== 'string') throw badRequest('화면이 읽은 코드명(expectedCode)을 보내 주세요(없으면 null).');
  const team = await loadTeamRow(deps.db, member.teamId);
  const out = await withTx(deps.db, async (tx) => {
    const app = await loadApp(tx, member.teamId, applicationId, true);
    if (app.status === 'accepted') throw new ApiError(409, 'stale', COPY.codeLocked(app.code_name ?? ''));
    if (app.status === 'reviewing') throw new ApiError(409, 'stale', COPY.codeLockedReviewing(app.code_name ?? ''));
    if (!REVIEWABLE.includes(app.status)) throw new ApiError(409, 'stale', COPY.err.notEditable);
    if ((app.code_name ?? null) !== (body.expectedCode || null)) throw new ApiError(409, 'stale', COPY.err.codeStale);
    if (next !== '') {
      const taken = (await takenCodes(tx, member.teamId)).filter((c) => c.applicationId !== app.id).map((c) => c.codeName);
      const check = checkCodeName(next, { ticker: team.ticker, taken });
      if (!check.ok) throw new ApiError(check.problems.includes('taken') ? 409 : 400, check.problems.includes('taken') ? 'already_exists' : 'bad_request', codeProblemText(check.problems[0]!, { ticker: team.ticker, code: next }));
    }
    try {
      const updated = await tx.query<{ code_name: string | null; version: number }>(
        `update web.patent_applications set code_name = $2, version = version + 1, updated_at = now() where id = $1 returning code_name, version`,
        [app.id, next || null],
      );
      return { codeName: updated.rows[0]!.code_name, version: updated.rows[0]!.version };
    } catch (error) {
      if (isUniqueViolation(error, 'patent_applications_code_key')) throw new ApiError(409, 'already_exists', COPY.err.codeTaken);
      throw error;
    }
  });
  notifyTeam(deps, member.teamId, 'patent:code', member.account.displayName);
  return out;
}

/** 고르는 칸은 정해진 순서로 맞춘다(같은 고름이면 같은 글 — 심사 캐시가 잡히게). */
function normalizeChoice(key: keyof typeof PATENT_SECTIONS, text: string): string {
  const rule = PATENT_SECTIONS[key];
  if (rule.kind === 'how') {
    const picked = parseList(text);
    return MECH_HOW.filter((v) => picked.includes(v)).join(',');
  }
  if (rule.kind === 'action') return text.trim();
  if (rule.kind === 'people') return parseList(text.toLowerCase()).join(',');
  return text;
}

export async function saveApplicationSection(deps: Deps, member: TeamMember, applicationId: string, section: string, raw: unknown): Promise<SectionSaveResponse> {
  if (!isPatentSection(section)) throw new ApiError(404, 'not_found', COPY.err.noSection);
  const rule = PATENT_SECTIONS[section];
  const body = (raw ?? {}) as { body?: unknown; expectedVersion?: unknown };
  if (typeof body.body !== 'string') throw badRequest('칸 내용을 보내 주세요.');
  const text = normalizeChoice(section, body.body.normalize('NFC').trim());
  const shape = sectionShapeProblem(section, text);
  if (shape) throw badRequest(COPY.saveProblem[shape](rule.max));
  if (rule.kind === 'action' && text && !(MECH_ACTIONS as readonly string[]).includes(text)) throw badRequest(COPY.saveProblem.bad_choice(rule.max));
  if (rule.kind === 'people' && text) {
    const members = await deps.db.query<{ user_id: string }>(`select user_id from web.members where team_id = $1 and role = 'student'`, [member.teamId]);
    const ids = new Set(members.rows.map((r) => r.user_id));
    if (!parseList(text).every((id) => ids.has(id))) throw badRequest(COPY.saveProblem.bad_people(rule.max));
  }
  const saved = await withTx(deps.db, async (tx) => {
    const app = await loadApp(tx, member.teamId, applicationId, true);
    if (!EDITABLE.includes(app.status)) throw new ApiError(409, 'stale', COPY.err.notEditable);
    return saveSection(tx, { kind: 'patent', docId: app.id, section, body: text, expectedVersion: body.expectedVersion, userId: member.account.userId, maxLength: rule.max });
  });
  notifyTeam(deps, member.teamId, `patent:section:${section}`, member.account.displayName);
  return { ok: true, version: saved.version, docVersion: saved.docVersion };
}

interface ReviewContext {
  app: AppRow;
  team: TeamRow;
  facts: PatentFactsView;
  sections: Record<string, string>;
  findings: RuleFinding[];
}

/** 심사 규칙 입력을 모은다(모둠 줄 · 출원서 줄을 잠근 트랜잭션 안에서 부르면 상한 · 잔액이 줄을 선다). */
async function buildContext(tx: Queryable, teamId: string, app: AppRow, known: ReadonlySet<string> | null): Promise<ReviewContext> {
  const team = await loadTeamRow(tx, teamId);
  const sections = await sectionMap(tx, app.id);
  const rev = await tx.query<{ target_id: string | null; disease_id: string | null }>('select target_id, disease_id from web.program_revisions where id = $1', [app.program_revision_id]);
  const jobs = await loadJobFacts(tx, teamId, [app.admet_job_id]);
  const facts = factsOf(team, rev.rows[0] ?? { target_id: null, disease_id: null }, app, jobs);
  const members = await tx.query<{ user_id: string }>(`select user_id from web.members where team_id = $1 and role = 'student'`, [teamId]);
  const dup = app.flat_smiles
    ? await tx.query<{ code_name: string }>(`select code_name from web.patents where class_id = $1 and flat_smiles = $2 and status = 'active' and application_id <> $3 limit 1`, [app.class_id, app.flat_smiles, app.id])
    : { rows: [] as Array<{ code_name: string }> };
  const lead = await tx.query<{ known_substance: boolean }>('select known_substance from web.lead_candidates where program_revision_id = $1 and admet_job_id = $2', [app.program_revision_id, app.admet_job_id]);
  const isKnown = app.known_substance || (lead.rows[0]?.known_substance ?? false) || (known ? isKnownSubstance(known, [app.flat_smiles, app.canonical_smiles]) : false);
  const findings = patentRuleFindings({
    sections,
    codeName: app.code_name,
    ticker: team.ticker,
    takenCodes: (await takenCodes(tx, teamId)).filter((c) => c.applicationId !== app.id).map((c) => c.codeName),
    memberIds: members.rows.map((r) => r.user_id),
    smiles: [app.canonical_smiles, app.flat_smiles, facts.canonicalSmiles].filter((s): s is string => !!s),
    usedOthers: await usedSlots(tx, teamId, app.id),
    max: team.max_patents_per_team,
    balanceCents: await balanceCents(tx, teamId),
    feeCents: PATENT_FEE_CENTS,
    known: isKnown,
    duplicateCode: dup.rows[0]?.code_name ?? null,
  });
  return { app, team, facts, sections, findings };
}

/** 심사 전 규칙 점검 — 무료 · 기록 없음. */
export async function precheck(deps: Deps, member: TeamMember, applicationId: string): Promise<PatentPrecheckResponse> {
  const known = await knownSubstances(deps).catch(() => null);
  const app = await loadApp(deps.db, member.teamId, applicationId);
  const ctx = await buildContext(deps.db, member.teamId, app, known);
  return { findings: ctx.findings, docVersion: app.version };
}

export async function requestPatentReview(deps: Deps, member: TeamMember, applicationId: string, raw: unknown): Promise<ReviewRequestResponse> {
  const docVersion = (raw as { docVersion?: unknown } | null)?.docVersion;
  if (typeof docVersion !== 'number' || !Number.isInteger(docVersion) || docVersion < 1) throw badRequest('화면이 본 서류 판(docVersion)을 보내 주세요.');
  // 워커가 없으면 출원서를 만들 때 저장한 판정(known_substance)으로 본다 — 같은 데이터로 이미 판정했다.
  const known = await knownSubstances(deps).catch(() => null);
  let dispatch: (() => void) | null = null;
  const res = await withTx(deps.db, async (tx) => {
    // 잠금 순서: teams → 출원서(받아들임 처리기와 같다). 상한 · 잔액 · 하루 심사 상한이 이 줄에서 줄을 선다.
    await tx.query('select id from web.teams where id = $1 for update', [member.teamId]);
    const app = await loadApp(tx, member.teamId, applicationId, true);
    const same = await tx.query<{ id: string }>(
      `select id from web.doc_reviews where doc_kind = 'patent' and doc_id = $1 and doc_version = $2 and reviewer_version = $3`,
      [app.id, docVersion, PATENT_REVIEWER_VERSION],
    );
    if (same.rows[0]) return { review: (await loadReviewView(tx, same.rows[0].id))!, created: false };
    if (!REVIEWABLE.includes(app.status)) throw new ApiError(409, 'stale', COPY.err.notReviewable);
    if (app.version !== docVersion) throw new ApiError(409, 'stale', COPY.err.docStale);
    // 표적을 바꾼 뒤의 옛 표적 버전 출원서는 새로 심사하지 않는다(그 특허는 지금 표적의 3.1 · 3.2 근거가 아니다 — 출원료 · 칸만 쓴다).
    if (!(await isCurrentRevision(tx, member.teamId, app.program_revision_id))) throw new ApiError(409, 'stale', COPY.err.oldRevision);
    const ctx = await buildContext(tx, member.teamId, app, known);
    // 규칙에서 끝나지 않으면 '심사 중'(상한에 센다) — 규칙 fail 이면 처리기가 보완 · 거절로 바꾼다.
    if (!ctx.findings.some((f) => f.status === 'fail')) {
      await tx.query(`update web.patent_applications set status = 'reviewing', updated_at = now() where id = $1`, [app.id]);
    }
    const out = await requestReview(
      deps,
      {
        kind: 'patent',
        docId: app.id,
        docVersion: app.version,
        sections: llmSections(ctx.sections),
        checklist: [...PATENT_CHECKLIST],
        facts: llmFacts(app.code_name, ctx.facts),
        ruleFindings: ctx.findings,
        reviewerVersion: PATENT_REVIEWER_VERSION,
        teamId: member.teamId,
        classId: member.classId,
        requestedBy: member.account.userId,
      },
      { tx },
    );
    dispatch = out.dispatch;
    return { review: out.review, created: out.created };
  });
  (dispatch as (() => void) | null)?.();
  notifyTeam(deps, member.teamId, 'patent:review', member.account.displayName);
  // 규칙에서 끝났으면 처리기가 판정을 바꿨을 수 있다(받아들임 단계의 거절 등) — 커밋 뒤 다시 읽는다.
  return { review: (await loadReviewView(deps.db, res.review.id)) ?? res.review, created: res.created };
}

export async function abandonApplication(deps: Deps, member: TeamMember, applicationId: string): Promise<{ ok: true; status: PatentApplicationStatus }> {
  const out = await withTx(deps.db, async (tx) => {
    await tx.query('select id from web.teams where id = $1 for update', [member.teamId]);
    const app = await loadApp(tx, member.teamId, applicationId, true);
    if (app.status === 'draft' || app.status === 'revise') {
      await tx.query(`update web.patent_applications set status = 'abandoned', updated_at = now() where id = $1`, [app.id]);
      return { patentId: null as string | null };
    }
    if (app.status !== 'accepted') throw new ApiError(409, 'stale', COPY.err.notAbandonable);
    const patent = await tx.query<{ id: string }>(`select id from web.patents where application_id = $1 and status = 'active' for update`, [app.id]);
    const patentId = patent.rows[0]?.id;
    if (!patentId) throw new ApiError(409, 'stale', COPY.err.notAbandonable);
    // 3.2 · 3.3 에서 쓰는 특허(진행 중 동물실험 · 계획서 · IND · 주력/백업 지정)는 포기하지 못한다.
    const used = await tx.query(
      `select 1 where exists (select 1 from web.jobs where patent_id = $1 and status in ('queued', 'running'))
                   or exists (select 1 from web.iacuc_protocol_patents pp join web.iacuc_protocols p on p.id = pp.protocol_id where pp.patent_id = $1 and p.status in ('reviewing', 'approved'))
                   or exists (select 1 from web.ind_applications where patent_id = $1 and status in ('reviewing', 'passed', 'submitted', 'approved'))
                   or exists (select 1 from web.program_revisions where id = $2 and (lead_job_id = $3 or backup_job_id = $3))`,
      [patentId, app.program_revision_id, app.admet_job_id],
    );
    if (used.rowCount) throw new ApiError(409, 'stale', COPY.err.patentInUse);
    await tx.query(`update web.patents set status = 'abandoned', abandoned_at = now() where id = $1`, [patentId]);
    await tx.query(`update web.patent_applications set status = 'abandoned', updated_at = now() where id = $1`, [app.id]);
    return { patentId };
  });
  if (out.patentId) deps.hub.broadcastClass(member.classId, { type: 'patent.ledger', classId: member.classId, reason: 'abandoned', patentId: out.patentId });
  notifyTeam(deps, member.teamId, 'patent:abandoned', member.account.displayName);
  return { ok: true, status: 'abandoned' };
}

// ── 받아들임(⑩) — onReviewed('patent') ──

async function isCurrentRevision(db: Queryable, teamId: string, revisionId: string): Promise<boolean> {
  const result = await db.query('select 1 from web.programs where team_id = $1 and current_revision_id = $2', [teamId, revisionId]);
  return (result.rowCount ?? 0) > 0;
}

/** 받아들임 단계에서 규칙이 걸리면 그 심사 판정을 바꾼다(같은 트랜잭션 — 과금 · 등재 없음). */
async function demote(tx: Tx, review: ReviewRecord, app: AppRow, finding: RuleFinding, status: 'revise' | 'rejected', reason: PatentRejectReason | null): Promise<void> {
  await tx.query(`update web.doc_reviews set verdict = $2, rule_findings = rule_findings || $3::jsonb where id = $1`, [
    review.id,
    status === 'rejected' ? 'reject' : 'revise',
    JSON.stringify([finding]),
  ]);
  await tx.query(`update web.patent_applications set status = $2, reject_reason = $3, updated_at = now() where id = $1`, [app.id, status, reason]);
}

export async function onPatentReviewed(tx: Tx, review: ReviewRecord, deps: Deps): Promise<void | (() => void)> {
  await tx.query('select id from web.teams where id = $1 for update', [review.teamId]);
  const found = await tx.query<AppRow>('select * from web.patent_applications where id = $1 for update', [review.docId]);
  const app = found.rows[0];
  if (!app) return;
  const notify = () => notifyTeam(deps, app.team_id, 'patent:reviewed');

  // 출원서 상태는 마지막 심사가 정한다 — 교사가 앞 판의 심사를 정정해도(새 판 심사가 이미 있으면) 상태 · 과금 · 등재는 그대로(결과는 그 판에만 — ⑪).
  const newer = await tx.query(`select 1 from web.doc_reviews where doc_kind = 'patent' and doc_id = $1 and doc_version > $2 limit 1`, [app.id, review.docVersion]);
  if (newer.rowCount) return notify;

  if (review.verdict === 'revise' || review.verdict === 'reject') {
    // 이미 받아들여진 출원서를 교사가 보완 · 거절로 정정해도 등재 · 과금은 되돌리지 않는다(원장 · 전광판이 이미 공개 — 포기는 모둠이 한다).
    if (!['draft', 'reviewing', 'revise'].includes(app.status)) return notify;
    if (review.verdict === 'revise') {
      await tx.query(`update web.patent_applications set status = 'revise', updated_at = now() where id = $1`, [app.id]);
    } else {
      // 규칙 거절은 이유(이미 있음 · 이미 알려진 물질)를 붙이고, 교사 수동 거절은 이유 없이(null).
      await tx.query(`update web.patent_applications set status = 'rejected', reject_reason = $2, updated_at = now() where id = $1`, [app.id, rejectReasonOf(review.ruleFindings)]);
    }
    return notify;
  }

  // pass — 받아들임. 이미 받아들여졌거나 거둔 출원서는 그대로.
  if (!['draft', 'reviewing', 'revise', 'rejected'].includes(app.status)) return notify;
  const team = await loadTeamRow(tx, app.team_id);
  if (!app.code_name || !app.flat_smiles || !app.canonical_smiles) {
    await demote(tx, review, app, { id: 'code_name', status: 'fail', section: 'code_tick', note: COPY.rule.codeName(team.ticker) }, 'revise', null);
    return notify;
  }
  if (team.revision_id !== app.program_revision_id) {
    // 심사 중에 표적을 바꿨다 — 옛 표적의 특허는 지금 표적의 근거가 아니라서 등록 · 과금하지 않는다(보완 · 거두기만).
    await demote(tx, review, app, { id: 'revision', status: 'fail', note: COPY.rule.oldRevisionAtAccept }, 'revise', null);
    return notify;
  }
  const acceptedOthers = await tx.query<{ n: number }>(`select count(*)::int as n from web.patent_applications where team_id = $1 and status = 'accepted' and id <> $2`, [app.team_id, app.id]);
  if (acceptedOthers.rows[0]!.n >= team.max_patents_per_team) {
    await demote(tx, review, app, { id: 'limit', status: 'fail', note: COPY.rule.limitAtAccept(team.max_patents_per_team) }, 'revise', null);
    return notify;
  }

  // classes 잠금 — 학급 순서(class_seq)와 같은 물질 선착순이 이 줄에서 줄을 선다(잠금 순서 teams → classes).
  await tx.query('select 1 from web.classes where id = $1 for no key update', [app.class_id]);
  const gameDay = await currentGameDay(tx, app.class_id);
  await tx.query('savepoint patent_accept');
  let patentId: string;
  let patentNo: string;
  try {
    const seq = await tx.query<{ n: number }>('select coalesce(max(class_seq), 0)::int + 1 as n from web.patents where class_id = $1', [app.class_id]);
    const classSeq = seq.rows[0]!.n;
    patentNo = patentNumber(app.class_id, classSeq);
    const inserted = await tx.query<{ id: string }>(
      `insert into web.patents (class_id, class_seq, patent_no, team_id, program_revision_id, application_id, admet_job_id, flat_smiles, canonical_smiles, code_name, filed_game_day)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [app.class_id, classSeq, patentNo, app.team_id, app.program_revision_id, app.id, app.admet_job_id, app.flat_smiles, app.canonical_smiles, app.code_name, gameDay],
    );
    patentId = inserted.rows[0]!.id;
    await charge(tx, { teamId: app.team_id, cents: PATENT_FEE_CENTS, kind: 'patent_fee', idemKey: `patent:${app.id}`, createdBy: review.requestedBy, ref: { type: 'patent', id: patentId } });
    await tx.query(`update web.patent_applications set status = 'accepted', reject_reason = null, updated_at = now() where id = $1`, [app.id]);
    await tx.query('release savepoint patent_accept');
  } catch (error) {
    await tx.query('rollback to savepoint patent_accept');
    if (isUniqueViolation(error, 'patents_class_flat_active_key')) {
      // 먼저 커밋한 같은 물질 — '거절 · 이미 있음'(과금 없음 · 5.04 빨간 줄은 이 모둠에만).
      await demote(tx, review, app, { id: 'class_duplicate', status: 'fail', severity: 'reject', note: COPY.rule.duplicateAtAccept }, 'rejected', 'duplicate');
      return notify;
    }
    if (error instanceof ApiError && error.code === 'insufficient_funds') {
      const note = COPY.rule.balanceAtAccept(formatCentsAsCrista(await balanceCents(tx, app.team_id)), formatCentsAsCrista(PATENT_FEE_CENTS));
      await demote(tx, review, app, { id: 'balance', status: 'fail', note }, 'revise', null);
      return notify;
    }
    if (isUniqueViolation(error)) {
      // 교사가 거절 → 통과로 정정했는데 그 사이 같은 후보 · 물질로 새 출원서가 살아 있다 — 그대로 둔다.
      console.warn(`[patents] 받아들임 건너뜀(${app.id}): ${(error as { constraint?: string }).constraint ?? 'unique'}`);
      return notify;
    }
    throw error;
  }

  const event = await postBoardEvent(tx, deps, {
    classId: app.class_id,
    teamId: app.team_id,
    kind: 'patent',
    headline: COPY.headline(team.ticker, app.code_name, diseaseLabel(team.disease_id)),
    public: { codeName: app.code_name, patentNo, disease: diseaseLabel(team.disease_id) },
    idemKey: `patent:${patentId}`,
    gameDay,
  });
  return () => {
    event.after();
    deps.hub.broadcastClass(app.class_id, { type: 'patent.ledger', classId: app.class_id, reason: 'registered', patentId });
    notify();
  };
}

// ── 경로 ──

async function viewerOf(ctx: RequestContext, account: AccountView): Promise<{ classId: string; teamId: string | null }> {
  if (account.kind === 'teacher') {
    const classId = ctx.query.get('classId');
    if (!classId || !UUID.test(classId)) throw badRequest('학급(classId)을 골라 주세요.');
    await requireTeacherOf(ctx.deps.db, account, classId);
    return { classId, teamId: null };
  }
  const member = await teamMember(ctx.deps.db, account);
  return { classId: member.classId, teamId: member.teamId };
}

export function register(router: Router<RequestContext>): void {
  onReviewed('patent', onPatentReviewed);

  router.on('GET', '/api/patents', async (ctx): Promise<PatentsResponse> => {
    const account = requireAccount(ctx);
    if (account.kind === 'teacher') {
      // 교사 — 그 학급 모둠의 출원서(?teamId=).
      const teamId = ctx.query.get('teamId');
      if (!teamId || !UUID.test(teamId)) throw badRequest('모둠(teamId)을 골라 주세요.');
      const cls = await ctx.deps.db.query<{ class_id: string }>('select class_id from web.teams where id = $1', [teamId]);
      if (!cls.rows[0]) throw new ApiError(404, 'not_found', '모둠을 찾지 못했어요.');
      await requireTeacherOf(ctx.deps.db, account, cls.rows[0].class_id);
      return loadPatents(ctx.deps, teamId);
    }
    const member = await teamMember(ctx.deps.db, account);
    return loadPatents(ctx.deps, member.teamId);
  });

  router.on('GET', '/api/patents/ledger', async (ctx): Promise<PatentLedgerResponse> => {
    const viewer = await viewerOf(ctx, requireAccount(ctx));
    return { classId: viewer.classId, rows: await loadLedger(ctx.deps.db, viewer.classId, viewer.teamId) };
  });

  router.on('POST', '/api/patents/applications', async (ctx) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    ctx.status = 201;
    return createApplication(ctx.deps, member, await readJson(ctx.req));
  });

  router.on('PUT', '/api/patents/applications/:applicationId/code', async (ctx, p) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    return setCodeName(ctx.deps, member, p.applicationId!, await readJson(ctx.req));
  });

  router.on('PUT', '/api/patents/applications/:applicationId/sections/:section', async (ctx, p) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    return saveApplicationSection(ctx.deps, member, p.applicationId!, p.section!, await readJson(ctx.req));
  });

  router.on('POST', '/api/patents/applications/:applicationId/precheck', async (ctx, p) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    return precheck(ctx.deps, member, p.applicationId!);
  });

  router.on('POST', '/api/patents/applications/:applicationId/review', async (ctx, p) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    const out = await requestPatentReview(ctx.deps, member, p.applicationId!, await readJson(ctx.req));
    ctx.status = out.created ? 201 : 200;
    return out;
  });

  router.on('POST', '/api/patents/applications/:applicationId/abandon', async (ctx, p) => {
    const member = await teamMember(ctx.deps.db, requireAccount(ctx));
    return abandonApplication(ctx.deps, member, p.applicationId!);
  });
}
