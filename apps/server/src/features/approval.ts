/**
 * 기능 F42 — 4.2 최종 허가 · 브랜드 이름 · 포장 꾸미기 · 품목 허가 신청서(NDA) · 허가증 · 연구비 영수증
 * (2026-10-24 사용자 지시 · 설계 §6.1 4.2 줄 · §5.3 허가 소식 · 시안 design/step-viz/viz-8.js 8.01 · 8.06 · 8.08).
 *
 * 소유: 이 파일 · packages/web-contract/src/approval.ts · apps/web/src/board/steps/s42.tsx(+ s42.css). 스키마 0018_approval.sql.
 * 표: web.approval_applications(표적 버전마다 한 건) · nda_sections · doc_reviews('nda') · ledger('approval_fee' · game_day 트리거).
 *
 * 흐름
 *   ① 브랜드 · ② 포장 · 신청서 칸 — 잠긴 단계(3상 전)에도 초안은 쓴다(설계 §5.4). 모두 `lockedProgram`(표적 바꾸기와 줄 세움) → 신청서 행 FOR UPDATE.
 *      브랜드 · 포장은 각자 판(brand_version · package_version) 낙관적 잠금 — 늦은 쪽 409 `stale`. 학급 브랜드 유일은 DB 부분 고유 키(늦은 쪽 409 `already_exists`).
 *      칸은 reviews.ts `saveSection`(칸 단위 낙관적 잠금 ⑪). 무엇을 고치든 서류 판(version)이 오르고, 심사 중 · 통과 · 보완 상태는 초안으로 돌아간다.
 *   ③ 심사 요청 — 규칙(3상 통과 · 같은 프로토콜 · 브랜드 · 포장 = 허가 제형 · 칸 길이) → reviews.ts `requestReview`(kind 'nda' · 판 고정 ⑪ · UQ ⑫ · 하루 상한).
 *      `onReviewed('nda')` 가 판정을 쓴 트랜잭션 안에서 상태를 바꾼다(그 판이 지금 판일 때만).
 *   ④ 접수 — programs FOR SHARE → 신청서 FOR UPDATE(4명이 같이 눌러도 한 줄로) → 상태 'passed' 확인 → ledger.ts `charge`('approval_fee' $0.100M ·
 *      멱등 키 approval:<id>) → submitted · decide_game_day = 지금 + 60. 늦은 쪽은 409 `already_exists`(과금 없음).
 *   ⑤ 허가 — clock.ts `onGameDay('approval')`: decide_game_day ≤ 지금인 submitted 를 상태 조건부 UPDATE 로 approved(흔들림 · 점수 기준 없음 —
 *      game-rules thresholds.final 둘 다 null) → teams 잠금 → board-events `postBoardEvent('approval')`(이때 브랜드 공개) → 커밋 뒤 방송.
 *   잠금 순서: programs → approval_applications → teams → classes(board-events 규칙 teams → classes 와 같다).
 *
 * 공개 범위(§5.3): GET /api/approval 은 그 모둠만(세션 모둠). 브랜드 · 포장 · 칸 · 심사는 학급 채널로 보내지 않는다 — 모둠 채널엔 '바뀌었다'만.
 * LLM 프롬프트에는 SMILES 원문 · 실명이 없다(코드명 · 서버 계산 사실 · 칸 본문만).
 *
 * 4.1 접점(F41): `loadTrials` — F41 의 임상 기록 표를 행 통째(to_jsonb)로 읽어 칸 이름 차이에 덜 민감하게 했다. 표 이름 · 칸은 이 함수 한 곳에서만 고친다.
 */
import { approvalDefaultChangePct } from '@crista/game-rules';
import {
  APPROVAL_COPY,
  APPROVAL_FEE_CENTS,
  APPROVAL_FEE_CRISTA,
  APPROVAL_REVIEW_GAME_DAYS,
  brandKey,
  centsToCrista,
  checkBrandName,
  checkPackage,
  formatCrista,
  IND_DOSES,
  NDA_CHECKLIST,
  NDA_REVIEWER_VERSION,
  NDA_SECTION_MAX,
  NDA_SECTION_MIN,
  NDA_SECTIONS,
  packFits,
  RECEIPT_GROUP_OF,
  STEP_META,
  type AccountView,
  type ApprovalApplicationView,
  type ApprovalResponse,
  type ApprovalSaveResponse,
  type ApprovalStatus,
  type CertificateView,
  type EvidenceRow,
  type IndDose,
  type IndForm,
  type NdaSection,
  type PackColor,
  type PackLayout,
  type PackShape,
  type Phase3PassView,
  type ReceiptGroup,
  type ReceiptLine,
  type ReceiptView,
  type RuleFinding,
  type StepId,
} from '@crista-web/web-contract';
import { postBoardEvent } from '../board-events.ts';
import { gameDaySql, loadClock, onGameDay } from '../clock.ts';
import type { Deps } from '../context.ts';
import { isUniqueViolation, withTx, type Queryable, type Tx } from '../db.ts';
import { requireAccount } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { charge } from '../ledger.ts';
import { DISEASES, loadProgramRow, lockedProgram, notifyTeam, teamMember, type TeamMember } from '../pipeline.ts';
import { latestReview, loadSections, onReviewed, requestReview, saveSection, type ReviewRecord } from '../reviews.ts';
import type { RequestContext } from '../routes.ts';
import { loadTeam } from '../views.ts';

const FORM_LABEL = APPROVAL_COPY.formLabel;
const EV = APPROVAL_COPY.evidence;
const SV = APPROVAL_COPY.server;
const PHASE_NO: Record<string, 1 | 2 | 3> = { phase1: 1, phase2: 2, phase3: 3 };

// ── 4.1 접점(F41) ──

/** 임상 한 시도(F41 표 한 행을 읽은 것). */
export interface TrialRecord {
  id: string;
  phase: 1 | 2 | 3;
  attempt: number;
  /** 'pass' 통과 · 'held' 보류 · null 진행 중 · 판정 대기. */
  verdict: 'pass' | 'held' | null;
  patentId: string | null;
  form: IndForm | null;
  doseMg: IndDose | null;
  decidedGameDay: number | null;
  /** 1차 평가지표 비교(있으면). */
  primary: { name: string; diff: number; p: number } | null;
}

/** F41 의 임상 기록 표(0017_clinical_trials) — 한 줄 = 한 상의 한 시도. 원장은 'paid_work' + ref_type clinical_trial · clinical_recruit · clinical_backup(ref_id = 시도 id). */
const TRIAL_TABLE = 'web.clinical_trials';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** 행(jsonb) → TrialRecord — 칸 이름이 조금 달라도 읽게(phase · status · verdict · patent_id · form · dose_mg · decided_game_day · result). */
export function trialFromRow(r: Record<string, unknown>): TrialRecord | null {
  const id = str(r.id);
  const phaseRaw = r.phase;
  const phase = typeof phaseRaw === 'number' ? (phaseRaw as 1 | 2 | 3) : PHASE_NO[String(phaseRaw)] ?? null;
  if (!id || !phase) return null;
  const result = (r.result ?? null) as { verdict?: unknown; primary?: { name?: unknown; comparison?: { diff?: unknown; p?: unknown } | null } } | null;
  const status = str(r.status);
  const verdictRaw = str(r.verdict) ?? (status === 'completed' || status === 'passed' ? 'pass' : status === 'held' || status === 'failed' ? 'held' : null);
  const verdict = verdictRaw === 'pass' || verdictRaw === 'held' ? verdictRaw : null;
  const form = str(r.form) as IndForm | null;
  // 허가 표 CHECK(10 · 50 · 100)와 같은 값만 — 그 밖의 값이면 프로토콜이 없는 것으로 본다(쓰기 경로가 CHECK 위반 500 이 되지 않게).
  const doseRaw = num(r.dose_mg);
  const dose = doseRaw !== null && (IND_DOSES as readonly number[]).includes(doseRaw) ? (doseRaw as IndDose) : null;
  const cmp = result?.primary?.comparison ?? null;
  return {
    id,
    phase,
    attempt: num(r.attempt) ?? 1,
    verdict,
    patentId: str(r.patent_id),
    form: form && ['oral', 'iv', 'transdermal'].includes(form) ? form : null,
    doseMg: dose,
    decidedGameDay: num(r.decided_game_day) ?? num(r.ends_game_day),
    primary: cmp && num(cmp.diff) !== null && num(cmp.p) !== null ? { name: str(result?.primary?.name) ?? '1차 평가지표', diff: num(cmp.diff)!, p: num(cmp.p)! } : null,
  };
}

let trialTableReady = false;
/** 0017 을 적용하기 전 DB(배포 순서가 어긋난 경우)에서도 4.2 화면이 깨지지 않게 — 표가 없으면 빈 기록. */
async function hasTrialTable(db: Queryable): Promise<boolean> {
  if (trialTableReady) return true;
  const r = await db.query<{ ok: boolean }>('select to_regclass($1) is not null as ok', [TRIAL_TABLE]);
  return (trialTableReady = !!r.rows[0]?.ok);
}

/** 그 표적 버전의 임상 시도 전부(오래된 것 먼저). */
export async function loadTrials(db: Queryable, revisionId: string): Promise<TrialRecord[]> {
  if (!(await hasTrialTable(db))) return [];
  // 행 통째(to_jsonb) — 표에 칸이 늘어도 이 함수는 그대로 읽는다.
  const r = await db.query<{ row: Record<string, unknown> }>(`select to_jsonb(t) as row from ${TRIAL_TABLE} t where t.program_revision_id = $1`, [revisionId]);
  return r.rows
    .map((x) => trialFromRow(x.row))
    .filter((x): x is TrialRecord => x !== null)
    .sort((a, b) => (a.decidedGameDay ?? 1e9) - (b.decidedGameDay ?? 1e9) || a.phase - b.phase || a.attempt - b.attempt);
}

/** 마지막으로 통과한 3상(같은 프로토콜 — 그 시도의 특허 · 제형 · 용량). */
export function lastPhase3Pass(trials: readonly TrialRecord[]): TrialRecord | null {
  const passed = trials.filter((t) => t.phase === 3 && t.verdict === 'pass' && t.patentId && t.form && t.doseMg);
  return passed.length ? passed[passed.length - 1]! : null;
}

// ── 신청서 행 ──

interface AppRow {
  id: string;
  program_revision_id: string;
  team_id: string;
  class_id: string;
  patent_id: string | null;
  form: IndForm | null;
  dose_mg: IndDose | null;
  trial_ref: string | null;
  brand_name: string | null;
  brand_version: number;
  package_shape: PackShape | null;
  package_color: PackColor | null;
  package_layout: PackLayout | null;
  package_version: number;
  status: ApprovalStatus;
  version: number;
  submitted_game_day: number | null;
  decide_game_day: number | null;
  decided_game_day: number | null;
  certificate_no: string | null;
  brand_by_name?: string | null;
  package_by_name?: string | null;
  submitted_by_name?: string | null;
}

const APP_SELECT = `
  select a.*, bb.display_name as brand_by_name, pb.display_name as package_by_name, sb.display_name as submitted_by_name
    from web.approval_applications a
    left join web.accounts bb on bb.user_id = a.brand_by
    left join web.accounts pb on pb.user_id = a.package_by
    left join web.accounts sb on sb.user_id = a.submitted_by`;

function appView(a: AppRow, provisional: boolean): ApprovalApplicationView {
  return {
    id: a.id,
    status: a.status,
    version: a.version,
    brand: a.brand_name ? { name: a.brand_name, version: a.brand_version, byName: a.brand_by_name ?? null } : null,
    brandVersion: a.brand_version,
    pack: a.package_shape && a.package_color && a.package_layout ? { shape: a.package_shape, color: a.package_color, layout: a.package_layout, byName: a.package_by_name ?? null } : null,
    packVersion: a.package_version,
    form: a.form,
    doseMg: a.dose_mg,
    formProvisional: provisional,
    submittedGameDay: a.submitted_game_day,
    decideGameDay: a.decide_game_day,
    decidedGameDay: a.decided_game_day,
    submittedByName: a.submitted_by_name ?? null,
    certificateNo: a.certificate_no,
  };
}

async function readApp(db: Queryable, revisionId: string, forUpdate = false): Promise<AppRow | null> {
  if (forUpdate) await db.query('select id from web.approval_applications where program_revision_id = $1 for update', [revisionId]);
  const r = await db.query<AppRow>(`${APP_SELECT} where a.program_revision_id = $1`, [revisionId]);
  return r.rows[0] ?? null;
}

/** 승인된 IND(3.3) — 3상 전 '임시 제형'과 요약에 쓴다. */
interface IndRow {
  patent_id: string;
  form: IndForm | null;
  dose_mg: IndDose | null;
  population: string | null;
  endpoint: string | null;
  s_score: number | null;
  e_score: number | null;
  decided_game_day: number | null;
}
async function approvedInd(db: Queryable, revisionId: string): Promise<IndRow | null> {
  const r = await db.query<IndRow>(
    `select patent_id, form, dose_mg, population, endpoint, s_score, e_score, decided_game_day from web.ind_applications
      where program_revision_id = $1 and status = 'approved' order by updated_at desc limit 1`,
    [revisionId],
  );
  return r.rows[0] ?? null;
}

/** 허가 대상 프로토콜 — 3상 통과 값(확정) · 없으면 IND 승인 값(임시). */
function protocolOf(p3: TrialRecord | null, ind: IndRow | null): { patentId: string | null; form: IndForm | null; dose: IndDose | null; provisional: boolean } {
  if (p3) return { patentId: p3.patentId, form: p3.form, dose: p3.doseMg, provisional: false };
  return { patentId: ind?.patent_id ?? null, form: ind?.form ?? null, dose: ind?.dose_mg ?? null, provisional: true };
}

/** 쓰기 경로 공통 — 표적 버전 잠금 → 신청서 행(없으면 만들고) FOR UPDATE → 프로토콜을 맞춘다. 접수 · 허가 뒤면 409. */
async function lockApp(tx: Tx, who: TeamMember, opts: { allowLocked?: boolean } = {}): Promise<{ app: AppRow; trials: TrialRecord[]; p3: TrialRecord | null; provisional: boolean }> {
  const program = await lockedProgram(tx, who.teamId);
  const rev = program.revision_id;
  await tx.query(
    `insert into web.approval_applications (program_revision_id, team_id, class_id, created_by) values ($1, $2, $3, $4)
     on conflict (program_revision_id) do nothing`,
    [rev, who.teamId, who.classId, who.account.userId],
  );
  let app = (await readApp(tx, rev, true))!;
  if (!opts.allowLocked && (app.status === 'submitted' || app.status === 'approved')) {
    throw new ApiError(409, 'already_exists', app.status === 'approved' ? SV.alreadyApproved : SV.lockedAfterSubmit);
  }
  const [trials, ind] = await Promise.all([loadTrials(tx, rev), approvedInd(tx, rev)]);
  const p3 = lastPhase3Pass(trials);
  const proto = protocolOf(p3, ind);
  if (app.status !== 'submitted' && app.status !== 'approved' && (app.patent_id !== proto.patentId || app.form !== proto.form || app.dose_mg !== proto.dose)) {
    // 3상 프로토콜이 바뀌었다(재도전 · 용량 변경) — 서류를 다시 심사받게 한다.
    await tx.query(
      `update web.approval_applications set patent_id = $2, form = $3, dose_mg = $4, version = version + 1, updated_at = now(),
              status = case when status in ('reviewing', 'passed', 'revise') then 'draft' else status end
        where id = $1`,
      [app.id, proto.patentId, proto.form, proto.dose],
    );
    app = (await readApp(tx, rev))!;
  }
  return { app, trials, p3, provisional: proto.provisional };
}

/** 고친 뒤 — 심사 중 · 통과 · 보완은 초안으로(통과는 그 판에만 — ⑪). */
async function backToDraft(tx: Tx, appId: string): Promise<void> {
  await tx.query(`update web.approval_applications set status = 'draft', updated_at = now() where id = $1 and status in ('reviewing', 'passed', 'revise')`, [appId]);
}

// ── ① 브랜드 ──

async function saveBrand(deps: Deps, account: AccountView, raw: unknown): Promise<ApprovalSaveResponse> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const expected = body.expectedVersion;
  if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 0) throw badRequest(SV.needVersion);
  const team = await loadTeam(deps.db, who.teamId);
  const check = checkBrandName(body.name, { startupName: team?.startupName ?? null });
  if (check.status === 'block') throw new ApiError(400, 'invalid_input', check.message);
  const out = await withTx(deps.db, async (tx) => {
    const { app, provisional } = await lockApp(tx, who);
    if (app.brand_version !== expected) throw new ApiError(409, 'stale', APPROVAL_COPY.server.brandStale);
    // 같은 모둠의 옛 표적 버전(표적을 바꾸기 전) 신청서가 이 이름을 잡고 있으면 풀어 준다 — 접수 · 허가된 것은 그대로.
    // 그러지 않으면 표적을 바꾼 모둠이 자기 옛 초안 때문에 같은 이름을 다시 못 쓴다(409 already_exists).
    await tx.query(
      `update web.approval_applications
          set brand_name = null, brand_key = null, brand_version = brand_version + 1, version = version + 1, updated_at = now(),
              status = case when status in ('reviewing', 'passed', 'revise') then 'draft' else status end
        where team_id = $1 and id <> $2 and brand_key = $3 and status not in ('submitted', 'approved')`,
      [who.teamId, app.id, brandKey(check.value)],
    );
    try {
      await tx.query('savepoint brand');
      await tx.query(
        `update web.approval_applications set brand_name = $2, brand_key = $3, brand_version = brand_version + 1, brand_by = $4, version = version + 1, updated_at = now()
          where id = $1`,
        [app.id, check.value, brandKey(check.value), account.userId],
      );
      await tx.query('release savepoint brand');
    } catch (error) {
      if (isUniqueViolation(error, 'approval_applications_brand_key')) throw new ApiError(409, 'already_exists', APPROVAL_COPY.brand.taken);
      throw error;
    }
    await backToDraft(tx, app.id);
    const next = (await readApp(tx, app.program_revision_id))!;
    return appView(next, provisional);
  });
  notifyTeam(deps, who.teamId, 'approval:brand', account.displayName);
  return { ok: true, version: out.brandVersion, application: out, ...(check.status === 'warn' ? { warning: check.message } : {}) };
}

// ── ② 포장 ──

async function savePackage(deps: Deps, account: AccountView, raw: unknown): Promise<ApprovalSaveResponse> {
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const expected = body.expectedVersion;
  if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 0) throw badRequest(SV.needVersion);
  const pack = checkPackage(body);
  if (!pack.ok) throw new ApiError(400, 'invalid_input', pack.message);
  const out = await withTx(deps.db, async (tx) => {
    const { app, provisional } = await lockApp(tx, who);
    // 한 문장 낙관적 잠금 — 늦은 쪽은 0행(FOR UPDATE 로 이미 줄을 섰으니 앞사람이 올린 판을 본다).
    const r = await tx.query(
      `update web.approval_applications set package_shape = $2, package_color = $3, package_layout = $4, package_version = package_version + 1,
              package_by = $5, version = version + 1, updated_at = now()
        where id = $1 and package_version = $6`,
      [app.id, pack.value.shape, pack.value.color, pack.value.layout, account.userId, expected],
    );
    if (!r.rowCount) throw new ApiError(409, 'stale', APPROVAL_COPY.pack.stale);
    await backToDraft(tx, app.id);
    return appView((await readApp(tx, app.program_revision_id))!, provisional);
  });
  notifyTeam(deps, who.teamId, 'approval:package', account.displayName);
  return { ok: true, version: out.packVersion, application: out };
}

// ── ③ 칸 ──

async function saveNdaSection(deps: Deps, account: AccountView, section: string, raw: unknown): Promise<{ ok: true; version: number; docVersion: number }> {
  if (!(NDA_SECTIONS as readonly string[]).includes(section)) throw new ApiError(404, 'not_found', SV.noSection);
  const who = await teamMember(deps.db, account);
  const body = (raw ?? {}) as Record<string, unknown>;
  const out = await withTx(deps.db, async (tx) => {
    const { app } = await lockApp(tx, who);
    const saved = await saveSection(tx, { kind: 'nda', docId: app.id, section, body: body.body, expectedVersion: body.expectedVersion, userId: account.userId, maxLength: NDA_SECTION_MAX });
    await backToDraft(tx, app.id);
    return saved;
  });
  notifyTeam(deps, who.teamId, `approval:section:${section}`, account.displayName);
  return { ok: true, ...out };
}

// ── 사실 · 요약(1.1~4.1) ──

interface Facts {
  rows: EvidenceRow[];
  llm: Record<string, string | number | boolean>;
  codeName: string | null;
  diseaseLabel: string | null;
}

async function gatherFacts(db: Queryable, revisionId: string, targetId: string | null, diseaseId: string | null, app: AppRow | null, trials: TrialRecord[], startup: { name: string; ticker: string }): Promise<Facts> {
  const disease = DISEASES.find((d) => d.diseaseId === diseaseId && d.targetId === targetId) ?? DISEASES.find((d) => d.targetId === targetId) ?? null;
  const ind = await approvedInd(db, revisionId);
  const patentId = app?.patent_id ?? ind?.patent_id ?? null;
  const pat = patentId
    ? (
        await db.query<{ code_name: string; patent_no: string; filed_game_day: number; affinity: number | null }>(
          `select p.code_name, p.patent_no, p.filed_game_day, d.affinity_kcal as affinity
             from web.patents p join web.jobs a on a.id = p.admet_job_id left join web.jobs d on d.id = a.parent_job_id and d.step = '2.1'
            where p.id = $1`,
          [patentId],
        )
      ).rows[0]
    : undefined;
  const pre = patentId
    ? (
        await db.query<{ facility: string; result: Record<string, unknown> | null; design_key: string }>(
          `select facility, result, design_key from web.jobs where patent_id = $1 and step = '3.2' and status = 'succeeded' order by finished_at nulls last`,
          [patentId],
        )
      ).rows
    : [];
  const animal = pre.map((p) => p.result).find((r) => r?.kind === 'animal_study') as
    | { noaelMgPerKgDay?: { rat: number; dog: number }; hedMgPerKg?: number; mrsdMgByForm?: Record<IndForm, number>; findings?: string[]; painGrade?: string }
    | undefined;
  const alt = pre.map((p) => p.result).filter((r) => r?.kind === 'alt_assay') as Array<{ assay: string; band: string }>;

  const rows: EvidenceRow[] = [];
  const llm: Facts['llm'] = {};
  rows.push({ key: 'company', label: EV.label.company!, value: `${startup.name} (${startup.ticker})`, steps: ['3.1'] });
  if (disease) {
    rows.push({ key: 'indication', label: EV.label.indication!, value: `${disease.label}${ind?.population ? ` — ${ind.population}` : ''}`, steps: ['1.1', '3.3'] });
    rows.push({ key: 'target', label: EV.label.target!, value: `${disease.gene} (PDB ${disease.pdbId}) · ${disease.targetLabel}`, steps: ['1.1'] });
    llm.disease = disease.label;
    llm.target = `${disease.gene} ${disease.targetLabel}`;
    llm.cns_target = disease.cns;
  }
  if (pat) {
    rows.push({ key: 'code', label: EV.label.code!, value: pat.code_name, steps: ['2.2', '3.1'] });
    llm.code_name = pat.code_name;
    if (pat.affinity !== null && disease) {
      rows.push({ key: 'affinity', label: EV.label.affinity!, value: EV.affinity(pat.affinity.toFixed(2), disease.referenceLigand.name, disease.referenceKcal.toFixed(2)), steps: ['2.1'], mono: true });
      llm.docking_kcal = Math.round(pat.affinity * 100) / 100;
      llm.reference_kcal = disease.referenceKcal;
    }
    rows.push({ key: 'patent', label: EV.label.patent!, value: `${pat.patent_no} (D+${pat.filed_game_day})`, steps: ['3.1'], mono: true });
  }
  if (alt.length) {
    rows.push({ key: 'alt', label: EV.label.alt!, value: alt.map((a) => `${EV.assay[a.assay] ?? a.assay} ${EV.band[a.band] ?? a.band}`).join(' · '), steps: ['2.2', '3.2'] });
    for (const a of alt) llm[`alt_${a.assay}`] = a.band;
  }
  if (animal) {
    const findings = (animal.findings ?? []).map((f) => EV.finding[f] ?? f);
    const form = app?.form ?? ind?.form ?? null;
    rows.push({
      key: 'preclinical',
      label: EV.label.preclinical!,
      value: `NOAEL 쥐 ${animal.noaelMgPerKgDay?.rat ?? '—'} · 개 ${animal.noaelMgPerKgDay?.dog ?? '—'} mg/kg/일${form && animal.mrsdMgByForm ? ` · MRSD ${animal.mrsdMgByForm[form]} mg` : ''}${` · ${findings.length ? EV.findings(findings.join(' · ')) : EV.noFindings}`}`,
      steps: ['3.2'],
      mono: true,
    });
    llm.preclinical_findings = findings.length ? findings.join(', ') : '없음';
    if (animal.painGrade) llm.pain_grade = animal.painGrade;
  }
  if (ind) {
    rows.push({ key: 'ind', label: EV.label.ind!, value: `${ind.form ? FORM_LABEL[ind.form] : '—'} · ${ind.dose_mg ?? '—'} mg · ${ind.endpoint ?? '—'}`, steps: ['3.3'] });
    if (ind.population) llm.population = ind.population;
    if (ind.endpoint) llm.primary_endpoint = ind.endpoint;
    if (ind.s_score !== null) llm.ind_safety_score = Math.round(ind.s_score * 10) / 10;
  }
  if (app?.form && app.dose_mg) {
    rows.push({ key: 'protocol', label: EV.label.protocol!, value: `${FORM_LABEL[app.form]} · ${app.dose_mg} mg${ind && ind.dose_mg !== null && ind.dose_mg !== app.dose_mg ? ` ${EV.doseChanged(ind.dose_mg)}` : ''}`, steps: ['3.3', '4.1'] });
    llm.approved_form = FORM_LABEL[app.form];
    llm.approved_dose_mg = app.dose_mg;
  }
  const decided = trials.filter((t) => t.verdict);
  if (decided.length) {
    const byPhase = [1, 2, 3].map((p) => {
      const ts = decided.filter((t) => t.phase === p);
      if (!ts.length) return null;
      const last = ts[ts.length - 1]!;
      const fails = ts.filter((t) => t.verdict === 'held').length;
      return `${EV.phase(p, last.verdict === 'pass', fails)}${last.primary && p > 1 ? ` · 차이 ${last.primary.diff.toFixed(1)} p ${last.primary.p < 0.001 ? '<0.001' : last.primary.p.toFixed(3)}` : ''}`;
    }).filter(Boolean);
    rows.push({ key: 'trials', label: EV.label.trials!, value: byPhase.join(' · '), steps: ['4.1'], mono: true });
    for (const t of decided) {
      llm[`phase${t.phase}_attempt${t.attempt}`] = t.verdict === 'pass' ? '통과' : '보류';
      if (t.primary) llm[`phase${t.phase}_primary`] = `${t.primary.name} 차이 ${t.primary.diff.toFixed(2)} (p ${t.primary.p.toFixed(3)})`;
    }
  }
  return { rows, llm, codeName: pat?.code_name ?? null, diseaseLabel: disease?.label ?? null };
}

// ── 영수증(8.08) ──

interface LedgerRow {
  id: string;
  amount_cents: string;
  kind: string;
  ref_type: string | null;
  ref_id: string | null;
  game_day: number | null;
  created_at: Date;
  job_step: StepId | null;
  ind_held: boolean;
}

const STEP_OF_KIND: Record<string, StepId> = { patent_fee: '3.1', ind_fee: '3.3', approval_fee: '4.2' };
const isTrialish = (kind: string, refType: string | null): boolean => /trial|clinical|recruit|backup/.test(kind) || /trial|clinical/.test(refType ?? '');

/**
 * 원장 → 영수증. 작업(paid_work · 작업 줄)과 입금은 단계 · 종류로 묶고, 수수료는 한 줄씩, 임상은 시도마다 한 줄(시작 비용 · 모집 투자 · 백업 교체를 따로).
 * `refLabels` — 임상 시도 id → '임상 2상 · 2번째 · 50 mg' 같은 이름. `failedRefs` — 보류된 시도 id(빨간 줄).
 */
export function buildReceipt(
  rows: readonly LedgerRow[],
  failedRefs: ReadonlySet<string>,
  opts: { lastGameDay: number | null; moleculesStart: number | null; approved: boolean; refLabels?: ReadonlyMap<string, string> },
): ReceiptView {
  const spent = new Map<string, ReceiptLine>();
  const income = new Map<string, ReceiptLine>();
  let initial = 0;
  let total = 0;
  let firstDay: number | null = null;
  for (const r of rows) {
    const cents = Number(r.amount_cents);
    total += cents;
    const day = r.game_day === null ? null : Math.floor(r.game_day);
    if (day !== null) firstDay = firstDay === null ? day : Math.min(firstDay, day);
    if (r.kind === 'initial') {
      initial += cents;
      continue;
    }
    const out = cents < 0;
    const stepId: StepId | null = r.job_step ?? STEP_OF_KIND[r.kind] ?? (isTrialish(r.kind, r.ref_type) ? '4.1' : null);
    const failed = out && (r.ind_held || (r.ref_id !== null && failedRefs.has(r.ref_id)));
    // 실험 작업(paid_work · 작업 줄) · 학습 · 같은 종류 입금은 한 줄로, 임상은 (시도 · 비용 종류)마다, 수수료는 한 줄씩.
    const key = !out
      ? `in:${stepId ?? '-'}:${r.kind}`
      : r.ref_type && r.ref_id && r.kind === 'paid_work'
        ? `ref:${r.ref_type}:${r.ref_id}`
        : r.kind === 'paid_work'
          ? `step:${stepId ?? '-'}`
          : `row:${r.id}`;
    const bucket = out ? spent : income;
    const crista = Math.abs(centsToCrista(cents));
    const line = bucket.get(key);
    if (line) {
      line.crista += crista;
      line.count += 1;
      if (day !== null) {
        line.dayFrom = line.dayFrom === null ? day : Math.min(line.dayFrom, day);
        line.dayTo = line.dayTo === null ? day : Math.max(line.dayTo, day);
      }
      continue;
    }
    const kindLabel = APPROVAL_COPY.receipt.kind[r.ref_type ?? ''] ?? APPROVAL_COPY.receipt.kind[r.kind] ?? r.kind;
    const refLabel = r.ref_id ? opts.refLabels?.get(r.ref_id) : undefined;
    const label = !out || !stepId
      ? kindLabel
      : refLabel
        ? `${stepId} ${refLabel} · ${kindLabel}`
        : r.kind === 'paid_work' && !r.ref_type
          ? `${stepId} ${STEP_META[stepId].title}`
          : `${stepId} ${kindLabel}`;
    bucket.set(key, { stepId, kind: r.kind, label, crista, out, count: 1, dayFrom: day, dayTo: day, failed });
  }
  const order = (a: ReceiptLine, b: ReceiptLine) => (a.dayFrom ?? 1e9) - (b.dayFrom ?? 1e9) || String(a.stepId).localeCompare(String(b.stepId));
  const spentLines = [...spent.values()].sort(order);
  const incomeLines = [...income.values()].sort(order);
  const groups: ReceiptGroup[] = ['discover', 'develop', 'clinical', 'approval'];
  const shares = groups.map((group) => ({ group, crista: spentLines.filter((l) => l.stepId && RECEIPT_GROUP_OF[l.stepId] === group).reduce((a, l) => a + l.crista, 0) }));
  const spentCrista = spentLines.reduce((a, l) => a + l.crista, 0);
  const incomeCrista = incomeLines.reduce((a, l) => a + l.crista, 0);
  const lastDay = opts.lastGameDay === null ? null : Math.floor(opts.lastGameDay);
  return {
    spent: spentLines,
    income: incomeLines,
    totals: { spentCrista, incomeCrista, initialCrista: centsToCrista(initial), balanceCrista: centsToCrista(total) },
    shares,
    firstGameDay: firstDay,
    lastGameDay: lastDay,
    daysTaken: firstDay !== null && lastDay !== null ? Math.max(0, lastDay - firstDay) : null,
    molecules: { start: opts.moleculesStart, end: opts.approved ? 1 : null },
  };
}

async function loadReceipt(db: Queryable, teamId: string, revisionId: string, trials: TrialRecord[], lastGameDay: number, approved: boolean): Promise<ReceiptView> {
  const [ledger, mol] = await Promise.all([
    db.query<LedgerRow>(
      `select l.id, l.amount_cents, l.kind, l.ref_type, l.ref_id, l.game_day, l.created_at, j.step as job_step,
              exists (select 1 from web.ind_applications i where i.id = l.ref_id and i.status = 'held') as ind_held
         from web.ledger l left join web.jobs j on j.id = l.job_id
        where l.team_id = $1 order by l.created_at, l.id`,
      [teamId],
    ),
    db.query<{ n: number | null }>(
      `select (result -> 'funnel' ->> 'total')::int as n from web.jobs
        where team_id = $1 and program_revision_id = $2 and step = '1.2' and status = 'succeeded' order by finished_at desc nulls last limit 1`,
      [teamId, revisionId],
    ),
  ]);
  const failed = new Set(trials.filter((t) => t.verdict === 'held').map((t) => t.id));
  const refLabels = new Map(trials.map((t) => [t.id, EV.trialName(t.phase, t.attempt, t.doseMg, t.verdict === 'held')]));
  return buildReceipt(ledger.rows, failed, { lastGameDay, moleculesStart: mol.rows[0]?.n ?? null, approved, refLabels });
}

// ── 규칙 검사(심사 · 접수 공통) ──

export function ndaRuleFindings(input: {
  p3: Pick<TrialRecord, 'patentId' | 'form' | 'doseMg'> | null;
  app: Pick<AppRow, 'patent_id' | 'form' | 'dose_mg' | 'brand_name' | 'package_shape' | 'package_color' | 'package_layout'>;
  sections: Partial<Record<NdaSection, string>>;
}): RuleFinding[] {
  const C = APPROVAL_COPY.rule;
  const out: RuleFinding[] = [];
  const { p3, app } = input;
  out.push({ id: 'phase3_passed', status: p3 ? 'ok' : 'fail', note: p3 ? C.phase3.ok : C.phase3.fail });
  const same = !!p3 && p3.patentId === app.patent_id && p3.form === app.form && p3.doseMg === app.dose_mg;
  out.push({ id: 'same_protocol', status: same ? 'ok' : 'fail', note: same ? C.protocol.ok : C.protocol.fail });
  out.push({ id: 'brand_set', status: app.brand_name ? 'ok' : 'fail', note: app.brand_name ? C.brand.ok : C.brand.fail, section: 'brand' });
  if (!app.package_shape || !app.package_color || !app.package_layout) out.push({ id: 'package_fits', status: 'fail', note: C.pack.none, section: 'package' });
  else {
    const fits = packFits(app.package_shape, app.form);
    out.push({ id: 'package_fits', status: fits ? 'ok' : 'fail', note: fits ? C.pack.ok : C.pack.fail, section: 'package' });
  }
  for (const s of NDA_SECTIONS) {
    const body = (input.sections[s] ?? '').trim();
    const ok = Array.from(body).length >= NDA_SECTION_MIN;
    out.push({ id: `section_${s}`, status: ok ? 'ok' : 'fail', note: ok ? C.section.ok(APPROVAL_COPY.nda.sectionLabel[s]) : C.section.fail(APPROVAL_COPY.nda.sectionLabel[s]), section: s });
  }
  return out;
}

async function sectionBodies(db: Queryable, appId: string): Promise<Partial<Record<NdaSection, string>>> {
  const list = await loadSections(db, 'nda', appId);
  return Object.fromEntries(list.filter((s) => (NDA_SECTIONS as readonly string[]).includes(s.section)).map((s) => [s.section, s.body]));
}

async function startupOf(db: Queryable, teamId: string): Promise<{ name: string; ticker: string }> {
  const team = await loadTeam(db, teamId);
  return { name: team?.startupName ?? '—', ticker: team?.ticker ?? '—' };
}

async function requestNdaReview(deps: Deps, account: AccountView) {
  const who = await teamMember(deps.db, account);
  const { result, teamId } = await withTx(deps.db, async (tx) => {
    const { app, trials, p3 } = await lockApp(tx, who);
    if (!p3) throw new ApiError(409, 'step_locked', APPROVAL_COPY.lockedNoPhase3);
    const sections = await sectionBodies(tx, app.id);
    const findings = ndaRuleFindings({ p3, app, sections });
    const program = await loadProgramRow(tx, who.teamId);
    const facts = await gatherFacts(tx, app.program_revision_id, program.target_id, program.disease_id, app, trials, await startupOf(tx, who.teamId));
    const llmFacts = { ...facts.llm, package_shape: app.package_shape ?? '없음', package_fits_form: packFits(app.package_shape, app.form) };
    await tx.query(`update web.approval_applications set status = 'reviewing', updated_at = now() where id = $1`, [app.id]);
    const res = await requestReview(
      deps,
      {
        kind: 'nda',
        docId: app.id,
        docVersion: app.version,
        sections: { ...sections, brand: app.brand_name ?? '' },
        checklist: [...NDA_CHECKLIST],
        facts: llmFacts,
        ruleFindings: findings,
        reviewerVersion: NDA_REVIEWER_VERSION,
        teamId: who.teamId,
        classId: who.classId,
        requestedBy: account.userId,
      },
      { tx },
    );
    // 같은 판을 다시 냈으면(기존 심사) 그 판정으로 상태를 맞춘다 — 새 심사는 처리기가 이미 맞췄다(규칙 · 캐시) 또는 pending.
    if (!res.created) await tx.query(`update web.approval_applications set status = $2 where id = $1`, [app.id, statusFor(res.review.verdict)]);
    return { result: res, teamId: who.teamId };
  });
  result.dispatch();
  notifyTeam(deps, teamId, 'approval:review', account.displayName);
  return { review: result.review, created: result.created };
}

const statusFor = (verdict: string): ApprovalStatus => (verdict === 'pass' ? 'passed' : verdict === 'pending' ? 'reviewing' : 'revise');

/** 판정 처리기 — 판정을 쓴 트랜잭션 안. 그 판이 지금 판이고 아직 접수 전일 때만 상태를 바꾼다(교사 정정도 같은 길). */
async function onNdaReviewed(tx: Tx, review: ReviewRecord, deps: Deps): Promise<void | (() => void)> {
  const r = await tx.query<{ status: ApprovalStatus; version: number; team_id: string }>('select status, version, team_id from web.approval_applications where id = $1 for update', [review.docId]);
  const app = r.rows[0];
  if (!app || app.version !== review.docVersion || app.status === 'submitted' || app.status === 'approved') return;
  const next = statusFor(review.verdict);
  await tx.query('update web.approval_applications set status = $2, updated_at = now() where id = $1', [review.docId, next]);
  return () => notifyTeam(deps, app.team_id, `approval:reviewed:${review.verdict}`);
}

// ── ④ 접수 ──

async function submitApproval(deps: Deps, account: AccountView): Promise<ApprovalApplicationView> {
  const who = await teamMember(deps.db, account);
  const view = await withTx(deps.db, async (tx) => {
    const { app, p3 } = await lockApp(tx, who, { allowLocked: true });
    if (app.status === 'submitted' || app.status === 'approved') throw new ApiError(409, 'already_exists', APPROVAL_COPY.submit.already);
    if (!p3) throw new ApiError(409, 'step_locked', APPROVAL_COPY.lockedNoPhase3);
    if (app.status !== 'passed') throw new ApiError(409, 'step_locked', APPROVAL_COPY.submit.needPass);
    const review = await latestReview(tx, 'nda', app.id);
    if (!review || review.verdict !== 'pass' || review.docVersion !== app.version) throw new ApiError(409, 'step_locked', APPROVAL_COPY.submit.needPass);
    const findings = ndaRuleFindings({ p3, app, sections: await sectionBodies(tx, app.id) });
    const bad = findings.find((f) => f.status === 'fail');
    if (bad) throw new ApiError(409, 'step_locked', bad.note);
    await charge(tx, {
      teamId: who.teamId,
      cents: APPROVAL_FEE_CENTS,
      kind: 'approval_fee',
      idemKey: `approval:${app.id}`,
      createdBy: account.userId,
      ref: { type: 'approval_application', id: app.id },
    });
    const clock = await loadClock(tx, who.classId);
    const day = clock.gameDay;
    const r = await tx.query(
      `update web.approval_applications set status = 'submitted', submitted_at = now(), submitted_by = $2, submitted_game_day = $3, decide_game_day = $4,
              trial_ref = $5, updated_at = now()
        where id = $1 and status = 'passed'`,
      [app.id, account.userId, day, day + APPROVAL_REVIEW_GAME_DAYS, p3.id],
    );
    if (!r.rowCount) throw new ApiError(409, 'already_exists', APPROVAL_COPY.submit.already);
    return appView((await readApp(tx, app.program_revision_id))!, false);
  });
  notifyTeam(deps, who.teamId, 'approval:submitted', account.displayName);
  return view;
}

// ── ⑤ 허가(게임 시계) ──

/** 만기 접수 건 하나를 허가 — 상태 조건부 UPDATE 라 여러 번 불려도 한 번만. 돌려준 함수는 커밋 뒤. */
export async function approveDue(deps: Deps, appId: string): Promise<boolean> {
  const done = await withTx(deps.db, async (tx) => {
    const r = await tx.query<{ id: string; team_id: string; class_id: string; brand_name: string; form: IndForm; decide_game_day: number; program_revision_id: string; patent_id: string }>(
      `update web.approval_applications a
          set status = 'approved', decided_game_day = a.decide_game_day, approved_at = now(), updated_at = now(),
              certificate_no = 'NDA ' || coalesce((select p.code_name from web.patents p where p.id = a.patent_id), 'X') || '-' || floor(a.decide_game_day)::int
         from web.classes c
        where a.id = $1 and c.id = a.class_id and a.status = 'submitted' and a.decide_game_day <= ${gameDaySql('c')}
        returning a.id, a.team_id, a.class_id, a.brand_name, a.form, a.decide_game_day, a.program_revision_id, a.patent_id`,
      [appId],
    );
    const a = r.rows[0];
    if (!a) return null;
    // 잠금 순서 teams → classes(board-events).
    await tx.query('select id from web.teams where id = $1 for update', [a.team_id]);
    const team = await loadTeam(tx, a.team_id);
    // 접수한 표적 버전의 질환(그 뒤 표적을 바꿨어도 허가 대상은 접수한 버전).
    const rev = (await tx.query<{ target_id: string | null; disease_id: string | null }>('select target_id, disease_id from web.program_revisions where id = $1', [a.program_revision_id])).rows[0];
    const disease = DISEASES.find((d) => d.diseaseId === rev?.disease_id && d.targetId === rev?.target_id) ?? DISEASES.find((d) => d.targetId === rev?.target_id);
    const ticker = team?.ticker ?? '—';
    const ev = await postBoardEvent(tx, deps, {
      classId: a.class_id,
      teamId: a.team_id,
      kind: 'approval',
      headline: APPROVAL_COPY.board.headline(ticker, a.brand_name),
      // 공개 칸 — 허가 뒤 브랜드 · 제형 · 질환만(성분 · 점수 · 서류 본문 없음).
      public: { ticker, brand: a.brand_name, stage: '4.2', form: a.form, disease: disease?.label ?? null, defaultChangePct: approvalDefaultChangePct(a.form) },
      idemKey: `approval:${a.id}`,
      gameDay: Math.floor(a.decide_game_day),
    });
    return { teamId: a.team_id, after: ev.after };
  });
  if (!done) return false;
  done.after();
  notifyTeam(deps, done.teamId, 'approval:approved');
  return true;
}

async function approvalTick(deps: Deps): Promise<void> {
  const due = await deps.db.query<{ id: string }>(
    `select a.id from web.approval_applications a join web.classes c on c.id = a.class_id
      where a.status = 'submitted' and a.decide_game_day <= ${gameDaySql('c')} order by a.decide_game_day limit 20`,
  );
  for (const row of due.rows) {
    try {
      await approveDue(deps, row.id);
    } catch (error) {
      console.error('[approval] 허가 처리 실패:', (error as Error).message);
    }
  }
}

// ── GET ──

export async function loadApproval(deps: Deps, account: AccountView): Promise<ApprovalResponse> {
  const who = await teamMember(deps.db, account);
  const db = deps.db;
  const program = await loadProgramRow(db, who.teamId);
  if (!program.revision_id) throw new ApiError(404, 'not_found', SV.noProgram);
  const rev = program.revision_id;
  const [app, trials, clock, startup, ind] = await Promise.all([readApp(db, rev), loadTrials(db, rev), loadClock(db, who.classId), startupOf(db, who.teamId), approvedInd(db, rev)]);
  const p3 = lastPhase3Pass(trials);
  const proto = protocolOf(p3, ind);
  // 화면은 지금 프로토콜로 — 신청서 행은 쓰기 때(lockApp)만 3상 값으로 맞춰지므로, 접수 전이면 읽을 때도 지금 값(3상 > IND)을 보인다.
  // 그러지 않으면 3상이 다른 용량 · 제형으로 통과한 뒤 첫 저장 전까지 옛 IND 값이 '확정'처럼 보인다.
  const editable = !!app && app.status !== 'submitted' && app.status !== 'approved';
  const shown: AppRow | null = app && editable ? { ...app, patent_id: proto.patentId, form: proto.form, dose_mg: proto.dose } : app;
  const [sections, review, facts] = await Promise.all([
    app ? loadSections(db, 'nda', app.id) : Promise.resolve([]),
    app ? latestReview(db, 'nda', app.id) : Promise.resolve(null),
    gatherFacts(db, rev, program.target_id, program.disease_id, shown ?? ({ patent_id: proto.patentId, form: proto.form, dose_mg: proto.dose } as AppRow), trials, startup),
  ]);
  const approved = app?.status === 'approved';
  const receipt = await loadReceipt(db, who.teamId, rev, trials, approved ? app!.decided_game_day! : clock.gameDay, approved);

  const phase3: Phase3PassView | null =
    p3 && p3.patentId && p3.form && p3.doseMg
      ? { trialId: p3.id, patentId: p3.patentId, codeName: facts.codeName, form: p3.form, doseMg: p3.doseMg, efficacy: null, safety: null, passedGameDay: p3.decidedGameDay }
      : null;

  let certificate: CertificateView | null = null;
  if (approved && app && app.brand_name && app.form && app.dose_mg && app.package_shape && app.package_color && app.package_layout) {
    certificate = {
      certificateNo: app.certificate_no!,
      brand: app.brand_name,
      company: startup.name,
      ticker: startup.ticker,
      codeName: facts.codeName,
      form: app.form,
      doseMg: app.dose_mg,
      approvedGameDay: Math.floor(app.decided_game_day!),
      rows: [
        ...facts.rows.filter((r) => r.key !== 'ind'),
        { key: 'final', label: EV.label.final!, value: EV.final(APPROVAL_REVIEW_GAME_DAYS, formatCrista(APPROVAL_FEE_CRISTA)), steps: ['4.2'] },
        { key: 'market', label: EV.label.market!, value: EV.market(approvalDefaultChangePct(app.form).toFixed(1), FORM_LABEL[app.form]), steps: ['4.2'], mono: true },
      ],
      pack: { shape: app.package_shape, color: app.package_color, layout: app.package_layout },
      marketChangePct: approvalDefaultChangePct(app.form),
    };
  }

  return {
    phase3,
    lockedReason: phase3 ? null : APPROVAL_COPY.lockedNoPhase3,
    application: shown ? appView(shown, !shown.form || (proto.provisional && editable)) : null,
    sections,
    review,
    summary: facts.rows,
    certificate,
    receipt,
    gameDay: clock.gameDay,
    startupName: startup.name,
    ticker: startup.ticker,
    feeCrista: APPROVAL_FEE_CRISTA,
    reviewGameDays: APPROVAL_REVIEW_GAME_DAYS,
  };
}

export function register(router: Router<RequestContext>): void {
  onReviewed('nda', onNdaReviewed);
  onGameDay('approval', (deps) => approvalTick(deps));

  router.on('GET', '/api/approval', async (ctx) => loadApproval(ctx.deps, requireAccount(ctx)));
  router.on('PUT', '/api/approval/brand', async (ctx) => saveBrand(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('PUT', '/api/approval/package', async (ctx) => savePackage(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('PUT', '/api/approval/sections/:section', async (ctx, p) => saveNdaSection(ctx.deps, requireAccount(ctx), p.section!, await readJson(ctx.req)));
  router.on('POST', '/api/approval/review', async (ctx) => {
    const out = await requestNdaReview(ctx.deps, requireAccount(ctx));
    ctx.status = out.created ? 201 : 200;
    return out;
  });
  router.on('POST', '/api/approval/submit', async (ctx) => ({ application: await submitApproval(ctx.deps, requireAccount(ctx)) }));
}

