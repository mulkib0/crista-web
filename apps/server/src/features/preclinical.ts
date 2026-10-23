/**
 * 기능 F32 — 3.2 전임상 · 동물실험(윤리 교육 · 계획서 심의 · 대체 시험 · 동물실험 · 주력/백업)(설계 §5.9).
 *
 * 소유: 이 파일 · packages/web-contract/src/preclinical.ts · apps/web/src/board/steps/s32.tsx(+ css) · db/migrations/0013_preclinical.sql.
 * 표: web.ethics_training · iacuc_protocols(표적 버전마다 하나 · 승인 스냅숏 approved_snapshot · 접수 스냅숏 pending_snapshot) · iacuc_sections ·
 *   iacuc_protocol_patents · jobs(step '3.2' · facility alt_assay | animal_study · stage 5 · source 'simulation' · patent_id · protocol_id · design_key · ends_game_day) ·
 *   preclinical_calcs(학생 계산 칸) · preclinical_reports(주력 근거 칩 · 회고 한 줄).
 * 지킬 불변식(설계 §7.4):
 *   ⑪ ⑫ 계획서 칸 · 심사 — reviews.ts(`saveSection` · `requestReview` · `onReviewed('iacuc', …)`). 설정(후보 · 수준 · 고통등급 · 종료시점 · 수행자)은
 *      settings_version 낙관적 잠금. 심의는 접수 때 판 · 스냅숏을 고정하고(pending_*), 통과하면 그 스냅숏을 approved_* 로 옮긴다.
 *   ⑬ 실행 — teams FOR UPDATE · UQ(team_id, request_id) 멱등 · 잔액 · ledger 'paid_work'(ledger.ts `charge`) · 이름 잠금. 워커를 부르지 않는다.
 *      같은 (특허 · 설계)는 부분 고유 키 jobs_patent_design_key — 이미 있으면 새로 과금하지 않고 그 결과를 돌려준다(다시 뽑기 없음).
 *      동물실험은 실행 단추를 누르는 사람만 교육 이수(ethics_training) · 승인된 판의 후보 · 마릿수 수준대로만(계획서 FOR SHARE — 심의 판정은 FOR UPDATE).
 *      끝은 게임 시계 — `onGameDay('preclinical', …)` 에서 `ends_game_day <= 지금` 인 줄을 상태 조건부 UPDATE 로 succeeded(결정적 결과).
 *   ⑭ 주력 · 백업 — program_revisions 한 문장 낙관적 잠금(lead_version) + 서버 검사(둘 다 유효 특허 · 동물실험 완료 · 서로 다름) + 근거 칩 재판정.
 *      PUT /api/program/lead(pipeline.ts `setLead`)가 이 파일의 `setPreclinicalLead` 를 부른다.
 *   'MRSD 이하 용량이면 그 제형에서 S ≥ 35' — web-contract PRECLINICAL_RULES 단위 시험(4 표적 전 조합)으로 지킨다.
 * 공개 범위(§5.3): 계획서 · 결과 · 마릿수는 모둠과 교사만. 전광판에는 티커 · 코드명 · 단계만('◆ … 전임상 완료 — … IND 준비').
 * 잠금 순서: teams → programs(share) → iacuc_protocols → classes(전광판 소식).
 */
import { randomUUID } from 'node:crypto';
import { affinityStrength, propertySignals } from '@crista/game-rules';
import { DOCKING_TARGETS, type MoleculeProperties } from '@crista/shared-types';
import {
  ALT_ASSAYS,
  ALT_ASSAY_COST_CENTS,
  altDesignKey,
  ANIMAL_COUNT_LEVELS,
  ANIMAL_STUDY_COST_CENTS,
  ANIMALS_PER_CANDIDATE,
  animalDesignKey,
  asPreclinicalResult,
  charLength,
  ENDPOINT_PCT_RANGE,
  IACUC_CHECKLIST,
  IACUC_REVIEWER_VERSION,
  IACUC_SECTIONS,
  PAIN_GRADES,
  PRECLINICAL_COPY,
  PRECLINICAL_FEES,
  PRECLINICAL_LEAD_REASONS,
  PRECLINICAL_LIMITS,
  PRECLINICAL_RULES,
  preclinicalModelOf,
  teamChannel,
  type AccountView,
  type AltAssay,
  type AnimalCountLevel,
  type AnimalStudyResult,
  type Avatar,
  type EthicsAnswers,
  type IacucSnapshot,
  type IacucStatus,
  type PainGrade,
  type PreclinicalCalcAnswers,
  type PreclinicalCalcCheck,
  type PreclinicalInput,
  type PreclinicalJobResult,
  type PreclinicalLeadReason,
  type PreclinicalMemberView,
  type PreclinicalPatentView,
  type PreclinicalProtocolView,
  type PreclinicalReportRow,
  type PreclinicalResponse,
  type PreclinicalRunResponse,
  type PreclinicalRunView,
  type PreclinicalTeacherView,
} from '@crista-web/web-contract';
import { postBoardEvent } from '../board-events.ts';
import { currentGameDay, loadClock, onGameDay } from '../clock.ts';
import type { Deps } from '../context.ts';
import { withTx, type Queryable, type Tx } from '../db.ts';
import { requireAccount, requireTeacherOf } from '../guard.ts';
import { ApiError, badRequest, readJson, type Router } from '../http.ts';
import { charge } from '../ledger.ts';
import { lockedProgram, notifyTeam, teamMember } from '../pipeline.ts';
import { latestReview, loadSections, onReviewed, requestReview, saveSection } from '../reviews.ts';
import type { RequestContext } from '../routes.ts';
import { WorkerUnavailableError } from '../worker.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

// ── 순수 검사(시험 대상) ──

/** 확인 문제 정답(서버만 안다 — 화면 묶음에 싣지 않는다). */
const ETHICS_KEY: Record<'q1' | 'q2' | 'q3', string> = { q1: 'replacement', q2: 'D', q3: 'weight20' };

/** 확인 문제 규칙 채점 — 문제마다 맞나 · 모두 맞나. */
export function gradeEthics(raw: unknown): { passed: boolean; correct: Record<'q1' | 'q2' | 'q3', boolean>; answers: EthicsAnswers } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const src = (body.answers ?? body) as Record<string, unknown>;
  const answers: EthicsAnswers = {};
  const correct = { q1: false, q2: false, q3: false };
  for (const id of ['q1', 'q2', 'q3'] as const) {
    const v = src[id];
    if (typeof v === 'string' && v.length <= 20) answers[id] = v;
    correct[id] = answers[id] === ETHICS_KEY[id];
  }
  return { passed: correct.q1 && correct.q2 && correct.q3, correct, answers };
}

export interface SettingsPatch {
  expectedVersion: number;
  level?: AnimalCountLevel;
  patentIds?: string[];
  painGrade?: PainGrade | null;
  endpointPct?: number | null;
  performerIds?: string[];
}

/** 계획서 설정 요청 검사(형식만 — 모둠 · 특허 · 이수 여부는 트랜잭션 안에서). */
export function checkSettings(raw: unknown): SettingsPatch {
  const b = (raw ?? {}) as Record<string, unknown>;
  const ev = b.expectedVersion;
  if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 0) throw badRequest('화면이 읽은 설정 판(expectedVersion)을 보내 주세요.');
  const out: SettingsPatch = { expectedVersion: ev };
  if (b.level !== undefined) {
    if (!ANIMAL_COUNT_LEVELS.includes(b.level as AnimalCountLevel)) throw badRequest('마릿수 수준은 적게 · 알맞게 · 많이 중 하나예요.');
    out.level = b.level as AnimalCountLevel;
  }
  const ids = (v: unknown, what: string, max: number): string[] => {
    if (!Array.isArray(v) || v.length > max || !v.every((x) => typeof x === 'string' && UUID.test(x))) throw badRequest(`${what}을(를) 다시 골라 주세요.`);
    return [...new Set(v as string[])];
  };
  if (b.patentIds !== undefined) out.patentIds = ids(b.patentIds, '넣을 후보', 4);
  if (b.performerIds !== undefined) out.performerIds = ids(b.performerIds, '실험 수행자', PRECLINICAL_LIMITS.performersMax);
  if (b.painGrade !== undefined) {
    if (b.painGrade !== null && !PAIN_GRADES.includes(b.painGrade as PainGrade)) throw badRequest('고통등급은 A~E 중 하나예요.');
    out.painGrade = b.painGrade as PainGrade | null;
  }
  if (b.endpointPct !== undefined) {
    const v = b.endpointPct;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < ENDPOINT_PCT_RANGE.min || v > ENDPOINT_PCT_RANGE.max)) {
      throw badRequest(`인도적 종료시점(체중 감소 %)은 ${ENDPOINT_PCT_RANGE.min}~${ENDPOINT_PCT_RANGE.max} 사이 정수예요.`);
    }
    out.endpointPct = v as number | null;
  }
  return out;
}

export function checkCalcAnswers(raw: unknown): PreclinicalCalcAnswers {
  const b = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100_000) throw badRequest('계산 칸에는 0 이상의 숫자를 써 주세요.');
    return n;
  };
  return { hedRat: num(b.hedRat), hedDog: num(b.hedDog), hed: num(b.hed), mrsd: num(b.mrsd) };
}

/** 동물실험 · 대체 시험 입력 — RDKit 물성 → game-rules 신호, ΔG → 결합력 p. SMILES 원문은 씨앗 해시에만. */
export function preclinicalInput(args: { targetId: string; props: MoleculeProperties; affinityKcal: number | null; seed: string }): PreclinicalInput {
  const target = DOCKING_TARGETS.find((t) => t.id === args.targetId);
  const s = propertySignals(args.props);
  const ref = target?.referenceKcal;
  // 도킹 근거가 없는 옛 후보(0006 이전)는 기준보다 약간 약한 값으로 본다(p 0.5).
  const p = args.affinityKcal === null ? 0.5 : affinityStrength(args.affinityKcal, ref);
  return { targetId: args.targetId, cns: target?.cns ?? false, p, herg: s.herg, hepatotoxicity: s.hepatotoxicity, oralAbsorption: s.oralAbsorption, bbb: s.bbb, seed: args.seed };
}

// ── 읽기 ──

interface PatentRow {
  id: string;
  code_name: string;
  patent_no: string;
  canonical_smiles: string;
  flat_smiles: string;
  admet_job_id: string;
  affinity_kcal: number | null;
  /** 출원서를 만들 때 F31 이 워커 RDKit 로 한 번 계산해 둔 물성(0012 patent_applications.properties). */
  properties: MoleculeProperties | null;
}

async function activePatents(db: Queryable, teamId: string, revisionId: string, only?: string[]): Promise<PatentRow[]> {
  const result = await db.query<PatentRow>(
    `select p.id, p.code_name, p.patent_no, p.canonical_smiles, p.flat_smiles, p.admet_job_id, d.affinity_kcal, pa.properties
       from web.patents p
       left join web.patent_applications pa on pa.id = p.application_id
       left join web.jobs a on a.id = p.admet_job_id
       left join web.jobs d on d.id = a.parent_job_id and d.step = '2.1'
      where p.team_id = $1 and p.program_revision_id = $2 and p.status = 'active' ${only ? 'and p.id = any($3::uuid[])' : ''}
      order by p.class_seq`,
    only ? [teamId, revisionId, only] : [teamId, revisionId],
  );
  return result.rows;
}

interface ProtocolRow {
  id: string;
  program_revision_id: string;
  team_id: string;
  n_level: AnimalCountLevel;
  status: IacucStatus;
  version: number;
  settings_version: number;
  pain_grade: PainGrade | null;
  endpoint_weight_loss_pct: number | null;
  performer_ids: string[];
  approved_version: number | null;
  approved_at: Date | null;
  approved_snapshot: IacucSnapshot | null;
  pending_version: number | null;
  pending_snapshot: IacucSnapshot | null;
}

const PROTOCOL_COLUMNS = `id, program_revision_id, team_id, n_level, status, version, settings_version, pain_grade, endpoint_weight_loss_pct, performer_ids,
  approved_version, approved_at, approved_snapshot, pending_version, pending_snapshot`;

async function loadProtocol(db: Queryable, revisionId: string, lock: '' | 'for update' | 'for share' = ''): Promise<ProtocolRow | null> {
  const result = await db.query<ProtocolRow>(`select ${PROTOCOL_COLUMNS} from web.iacuc_protocols where program_revision_id = $1 ${lock}`, [revisionId]);
  return result.rows[0] ?? null;
}

/** 계획서가 없으면 연다(표적 버전마다 하나 — iacuc_protocols_revision_key) · 행 잠금. */
async function ensureProtocol(tx: Tx, teamId: string, revisionId: string, userId: string): Promise<ProtocolRow> {
  await tx.query(
    `insert into web.iacuc_protocols (program_revision_id, team_id, created_by) values ($1, $2, $3) on conflict (program_revision_id) do nothing`,
    [revisionId, teamId, userId],
  );
  return (await loadProtocol(tx, revisionId, 'for update'))!;
}

async function protocolPatentIds(db: Queryable, protocolId: string): Promise<string[]> {
  const result = await db.query<{ patent_id: string }>('select patent_id from web.iacuc_protocol_patents where protocol_id = $1 order by patent_id', [protocolId]);
  return result.rows.map((r) => r.patent_id);
}

async function trainedSet(db: Queryable, classId: string, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const result = await db.query<{ user_id: string }>('select user_id from web.ethics_training where class_id = $1 and user_id = any($2::uuid[])', [classId, userIds]);
  return new Set(result.rows.map((r) => r.user_id));
}

interface RunRow {
  id: string;
  patent_id: string;
  facility: 'animal_study' | 'alt_assay';
  design_key: string;
  status: PreclinicalRunView['status'];
  progress: number;
  params: RunParams;
  result: PreclinicalJobResult | null;
  ends_game_day: number;
  cost_cents: string;
  by_name: string | null;
  by_avatar: Avatar | null;
  calc_ok: boolean | null;
  calc_answers: PreclinicalCalcAnswers | null;
  calc_by: string | null;
}

interface RunParams {
  kind: 'animal_study' | 'alt_assay';
  patentId: string;
  codeName: string;
  level?: AnimalCountLevel;
  assay?: AltAssay;
  startGameDay: number;
  durationDays: number;
  input: PreclinicalInput;
}

async function loadRuns(db: Queryable, revisionId: string): Promise<RunRow[]> {
  const result = await db.query<RunRow>(
    `select j.id, j.patent_id, j.facility, j.design_key, j.status, j.progress, j.params, j.result, j.ends_game_day, j.cost_cents,
            a.display_name as by_name, m.avatar as by_avatar, c.ok as calc_ok, c.answers as calc_answers, ca.display_name as calc_by
       from web.jobs j
       left join web.accounts a on a.user_id = j.created_by
       left join web.members m on m.user_id = j.created_by and m.role = 'student'
       left join web.preclinical_calcs c on c.job_id = j.id
       left join web.accounts ca on ca.user_id = c.checked_by
      where j.program_revision_id = $1 and j.step = '3.2'
      order by j.created_at`,
    [revisionId],
  );
  return result.rows;
}

function runView(r: RunRow): PreclinicalRunView {
  return {
    jobId: r.id,
    patentId: r.patent_id,
    codeName: r.params.codeName,
    kind: r.facility,
    designKey: r.design_key,
    level: r.params.level ?? null,
    assay: r.params.assay ?? null,
    status: r.status,
    progressPct: Math.round(Math.max(0, Math.min(1, r.status === 'succeeded' ? 1 : r.progress)) * 100),
    startGameDay: r.params.startGameDay,
    endsGameDay: Number(r.ends_game_day),
    byName: r.by_name,
    avatar: r.by_avatar,
    costCents: Number(r.cost_cents),
    result: r.status === 'succeeded' ? asPreclinicalResult(r.result) : null,
    calc: r.calc_answers ? { ok: Boolean(r.calc_ok), answers: r.calc_answers, byName: r.calc_by } : null,
  };
}

/** 종료보고서 줄 — 후보별 사용 마릿수 · 고통등급 · 인도적 종료 · 대체 시험으로 뺀 후보의 덜 쓴 동물 수. */
export function reportRows(patents: Array<{ id: string; code_name: string }>, runs: PreclinicalRunView[], approved: IacucSnapshot | null): PreclinicalReportRow[] {
  return patents.map((p) => {
    const mine = runs.filter((r) => r.patentId === p.id);
    const animals = mine.filter((r) => r.kind === 'animal_study' && r.status !== 'failed');
    const done = animals.map((r) => r.result).filter((x): x is AnimalStudyResult => x?.kind === 'animal_study');
    const alt = mine.some((r) => r.kind === 'alt_assay' && r.status === 'succeeded');
    const excluded = Boolean(approved) && alt && animals.length === 0 && !approved!.patentIds.includes(p.id);
    return {
      patentId: p.id,
      codeName: p.code_name,
      animalsUsed: animals.reduce((n, r) => n + (r.level ? ANIMALS_PER_CANDIDATE[r.level] : 0), 0),
      painGrade: done[0]?.painGrade ?? null,
      humaneEndpoints: done.reduce((n, r) => n + r.humaneEndpoints, 0),
      animalsSaved: excluded ? ANIMALS_PER_CANDIDATE[approved!.level] : 0,
      excludedByAlt: excluded,
    };
  });
}

export async function loadPreclinical(deps: Deps, account: AccountView): Promise<PreclinicalResponse> {
  const who = await teamMember(deps.db, account);
  const db = deps.db;
  const prog = await db.query<{ revision_id: string; target_id: string | null; lead_job_id: string | null; backup_job_id: string | null; lead_version: number; lead_set_by_name: string | null }>(
    `select r.id as revision_id, r.target_id, r.lead_job_id, r.backup_job_id, r.lead_version, a.display_name as lead_set_by_name
       from web.programs p join web.program_revisions r on r.id = p.current_revision_id
       left join web.accounts a on a.user_id = r.lead_set_by
      where p.team_id = $1`,
    [who.teamId],
  );
  const program = prog.rows[0];
  if (!program) throw new ApiError(404, 'not_found', '모둠 프로그램을 찾지 못했어요.');
  const rev = program.revision_id;
  const [clock, patents, protocol, runRows, membersRows, report] = await Promise.all([
    loadClock(db, who.classId),
    activePatents(db, who.teamId, rev),
    loadProtocol(db, rev),
    loadRuns(db, rev),
    db.query<{ user_id: string; display_name: string; avatar: Avatar | null; completed_at: Date | null }>(
      `select m.user_id, a.display_name, m.avatar, e.completed_at
         from web.members m join web.accounts a on a.user_id = m.user_id
         left join web.ethics_training e on e.class_id = m.class_id and e.user_id = m.user_id
        where m.team_id = $1 and m.role = 'student' order by m.joined_team_at nulls last, a.display_name`,
      [who.teamId],
    ),
    db.query<{ lead_reason: PreclinicalLeadReason | null; reflection: string; reflection_version: number; by_name: string | null }>(
      `select r.lead_reason, r.reflection, r.reflection_version, a.display_name as by_name
         from web.preclinical_reports r left join web.accounts a on a.user_id = r.reflection_by where r.program_revision_id = $1`,
      [rev],
    ),
  ]);
  const runs = runRows.map(runView);
  const model = preclinicalModelOf(program.target_id);
  const target = DOCKING_TARGETS.find((t) => t.id === program.target_id);
  const members: PreclinicalMemberView[] = membersRows.rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, avatar: r.avatar, trainedAt: r.completed_at?.toISOString() ?? null }));

  let protocolView: PreclinicalProtocolView | null = null;
  if (protocol) {
    const [draftIds, sections, review] = await Promise.all([protocolPatentIds(db, protocol.id), loadSections(db, 'iacuc', protocol.id), latestReview(db, 'iacuc', protocol.id)]);
    const trained = members.filter((m) => m.trainedAt && protocol.performer_ids.includes(m.userId)).length;
    const valid = draftIds.filter((id) => patents.some((p) => p.id === id));
    protocolView = {
      id: protocol.id,
      status: protocol.status,
      version: protocol.version,
      settingsVersion: protocol.settings_version,
      level: protocol.n_level,
      patentIds: valid,
      painGrade: protocol.pain_grade,
      endpointPct: protocol.endpoint_weight_loss_pct,
      performerIds: protocol.performer_ids,
      sections,
      review,
      approved: protocol.approved_snapshot && protocol.approved_at ? { ...protocol.approved_snapshot, at: protocol.approved_at.toISOString() } : null,
      changedSinceApproval: protocol.approved_version !== null && protocol.version !== protocol.approved_version,
      ruleFindings: PRECLINICAL_RULES.iacucRules({
        patentCount: valid.length,
        level: protocol.n_level,
        painGrade: protocol.pain_grade,
        modelGrade: model?.painGrade ?? null,
        endpointPct: protocol.endpoint_weight_loss_pct,
        trainedPerformers: trained,
        sections: Object.fromEntries(sections.map((s) => [s.section, s.body])),
      }),
    };
  }

  const approved = protocol?.approved_snapshot ?? null;
  const patentViews: PreclinicalPatentView[] = patents.map((p) => {
    const run = runRows.find((r) => r.patent_id === p.id && r.params?.input);
    return {
      id: p.id,
      codeName: p.code_name,
      patentNo: p.patent_no,
      inDraft: protocolView?.patentIds.includes(p.id) ?? false,
      inApproved: approved?.patentIds.includes(p.id) ?? false,
      predicted: run ? { herg: run.params.input.herg, hepatotoxicity: run.params.input.hepatotoxicity } : null,
    };
  });
  const patentOfJob = (jobId: string | null) => (jobId ? (patents.find((p) => p.admet_job_id === jobId)?.id ?? null) : null);
  const rows = reportRows(patents, runs, approved);
  const rep = report.rows[0];
  return {
    revisionId: rev,
    targetId: program.target_id,
    cns: target?.cns ?? false,
    model,
    gameDay: clock.gameDay,
    unlocked: patents.length > 0,
    members,
    meTrained: members.some((m) => m.userId === account.userId && m.trainedAt),
    patents: patentViews,
    protocol: protocolView,
    runs,
    lead: {
      leadPatentId: patentOfJob(program.lead_job_id),
      backupPatentId: patentOfJob(program.backup_job_id),
      reason: rep?.lead_reason ?? null,
      version: program.lead_version,
      setByName: program.lead_set_by_name,
    },
    report: {
      rows,
      totalAnimals: rows.reduce((n, r) => n + r.animalsUsed, 0),
      totalHumane: rows.reduce((n, r) => n + r.humaneEndpoints, 0),
      totalSaved: rows.reduce((n, r) => n + r.animalsSaved, 0),
      reflection: { body: rep?.reflection ?? '', version: rep?.reflection_version ?? 0, byName: rep?.by_name ?? null },
    },
    fees: { altCents: ALT_ASSAY_COST_CENTS, animalCents: ANIMAL_STUDY_COST_CENTS },
  };
}

// ── ① 윤리 교육 ──

export async function submitEthics(deps: Deps, account: AccountView, raw: unknown): Promise<{ passed: boolean; correct: Record<'q1' | 'q2' | 'q3', boolean>; trainedAt: string | null }> {
  const who = await teamMember(deps.db, account);
  const graded = gradeEthics(raw);
  if (!graded.passed) return { passed: false, correct: graded.correct, trainedAt: null };
  // 다시 풀기 무제한 — 이미 이수했으면 처음 이수 시각을 그대로 둔다(보상과 따로 기록).
  const saved = await deps.db.query<{ completed_at: Date }>(
    `insert into web.ethics_training (class_id, user_id, answers) values ($1, $2, $3)
     on conflict (class_id, user_id) do update set answers = excluded.answers returning completed_at`,
    [who.classId, account.userId, JSON.stringify(graded.answers)],
  );
  notifyTeam(deps, who.teamId, 'preclinical:ethics', account.displayName);
  return { passed: true, correct: graded.correct, trainedAt: saved.rows[0]!.completed_at.toISOString() };
}

// ── ② 계획서 ──

const draftStatusSql = `status = case when status in ('approved', 'revise') then 'draft' else status end`;

export async function saveSettings(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; settingsVersion: number; version: number }> {
  const who = await teamMember(deps.db, account);
  const patch = checkSettings(raw);
  const out = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
    const protocol = await ensureProtocol(tx, who.teamId, program.revision_id, account.userId);
    if (protocol.settings_version !== patch.expectedVersion) throw new ApiError(409, 'stale', '다른 모둠원이 계획서 설정을 먼저 바꿨어요. 화면을 새로 고쳐 확인해 주세요.');
    if (patch.patentIds) {
      const ok = await activePatents(tx, who.teamId, program.revision_id, patch.patentIds);
      if (ok.length !== patch.patentIds.length) throw new ApiError(409, 'step_locked', '지금 표적의 우리 모둠 유효 특허만 넣을 수 있어요.');
    }
    if (patch.performerIds && patch.performerIds.length > 0) {
      const mem = await tx.query<{ user_id: string }>(`select user_id from web.members where team_id = $1 and role = 'student' and user_id = any($2::uuid[])`, [who.teamId, patch.performerIds]);
      if (mem.rows.length !== patch.performerIds.length) throw badRequest('실험 수행자는 우리 모둠원 중에서 골라 주세요.');
    }
    const updated = await tx.query<{ settings_version: number; version: number }>(
      `update web.iacuc_protocols set
          n_level = coalesce($2, n_level),
          pain_grade = case when $3::boolean then $4 else pain_grade end,
          endpoint_weight_loss_pct = case when $5::boolean then $6::smallint else endpoint_weight_loss_pct end,
          performer_ids = coalesce($7::uuid[], performer_ids),
          settings_version = settings_version + 1, version = version + 1, updated_at = now(), ${draftStatusSql}
        where id = $1 and settings_version = $8 returning settings_version, version`,
      [protocol.id, patch.level ?? null, patch.painGrade !== undefined, patch.painGrade ?? null, patch.endpointPct !== undefined, patch.endpointPct ?? null,
        patch.performerIds ?? null, patch.expectedVersion],
    );
    if (!updated.rows[0]) throw new ApiError(409, 'stale', '다른 모둠원이 계획서 설정을 먼저 바꿨어요. 화면을 새로 고쳐 확인해 주세요.');
    if (patch.patentIds) {
      await tx.query('delete from web.iacuc_protocol_patents where protocol_id = $1', [protocol.id]);
      if (patch.patentIds.length > 0) {
        await tx.query(
          `insert into web.iacuc_protocol_patents (protocol_id, patent_id, team_id) select $1, unnest($2::uuid[]), $3`,
          [protocol.id, patch.patentIds, who.teamId],
        );
      }
    }
    return updated.rows[0];
  });
  notifyTeam(deps, who.teamId, 'preclinical:protocol', account.displayName);
  return { ok: true, settingsVersion: out.settings_version, version: out.version };
}

export async function saveIacucSection(deps: Deps, account: AccountView, section: string, raw: unknown): Promise<{ ok: true; version: number; docVersion: number }> {
  const who = await teamMember(deps.db, account);
  if (!IACUC_SECTIONS.some((s) => s.key === section)) throw new ApiError(404, 'not_found', '없는 계획서 칸이에요.');
  const req = (raw ?? {}) as Record<string, unknown>;
  const out = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
    const protocol = await ensureProtocol(tx, who.teamId, program.revision_id, account.userId);
    const saved = await saveSection(tx, { kind: 'iacuc', docId: protocol.id, section, body: req.body, expectedVersion: req.expectedVersion, userId: account.userId, maxLength: PRECLINICAL_LIMITS.sectionMax });
    await tx.query(`update web.iacuc_protocols set ${draftStatusSql} where id = $1`, [protocol.id]);
    return saved;
  });
  notifyTeam(deps, who.teamId, `preclinical:section:${section}`, account.displayName);
  return { ok: true, ...out };
}

const levelLabel = (l: AnimalCountLevel) => PRECLINICAL_COPY.levels[l].label;

export async function requestIacucReview(deps: Deps, account: AccountView, raw: unknown) {
  const who = await teamMember(deps.db, account);
  const ev = ((raw ?? {}) as Record<string, unknown>).expectedVersion;
  if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1) throw badRequest('화면이 읽은 계획서 판(expectedVersion)을 보내 주세요.');
  const outcome = await withTx(deps.db, async (tx) => {
    await tx.query('select id from web.teams where id = $1 for update', [who.teamId]);
    const program = await lockedProgram(tx, who.teamId);
    const protocol = await loadProtocol(tx, program.revision_id, 'for update');
    if (!protocol) throw new ApiError(404, 'not_found', '계획서를 먼저 써 주세요.');
    if (protocol.version !== ev) throw new ApiError(409, 'stale', '그 사이 계획서가 바뀌었어요. 화면을 새로 고쳐 확인한 뒤 내 주세요.');
    const prior = await tx.query<{ id: string }>(
      'select id from web.doc_reviews where doc_kind = $1 and doc_id = $2 and doc_version = $3 and reviewer_version = $4',
      ['iacuc', protocol.id, protocol.version, IACUC_REVIEWER_VERSION],
    );
    if (prior.rows[0]) return { review: (await latestReview(tx, 'iacuc', protocol.id))!, created: false, dispatch: () => {} };
    if (protocol.status === 'reviewing') throw new ApiError(409, 'already_exists', '앞 판을 심의 중이에요. 결과가 나온 뒤 다시 내 주세요.');

    const model = preclinicalModelOf(program.target_id);
    const draftIds = await protocolPatentIds(tx, protocol.id);
    const patents = await activePatents(tx, who.teamId, program.revision_id, draftIds);
    const trained = await trainedSet(tx, who.classId, protocol.performer_ids);
    const sections = await loadSections(tx, 'iacuc', protocol.id);
    const body = Object.fromEntries(sections.map((s) => [s.section, s.body]));
    const findings = PRECLINICAL_RULES.iacucRules({
      patentCount: patents.length,
      level: protocol.n_level,
      painGrade: protocol.pain_grade,
      modelGrade: model?.painGrade ?? null,
      endpointPct: protocol.endpoint_weight_loss_pct,
      trainedPerformers: trained.size,
      sections: body,
    });
    const runs = (await loadRuns(tx, program.revision_id)).filter((r) => r.facility === 'alt_assay' && r.status === 'succeeded');
    const altFacts = runs
      .map((r) => {
        const res = asPreclinicalResult(r.result);
        return res?.kind === 'alt_assay' ? `${r.params.codeName} ${res.assay === 'herg' ? 'hERG' : '간'} ${PRECLINICAL_COPY.bands[res.band]}` : null;
      })
      .filter(Boolean)
      .join(' · ');
    // LLM 에는 코드명 · 서버 계산 사실만(§5.11 ⑤ — SMILES 원문 · 실명 없음).
    const facts: Record<string, string | number | boolean> = {
      candidates: patents.map((p) => p.code_name).join(', ') || '(없음)',
      animal_level: levelLabel(protocol.n_level),
      animals_per_candidate: ANIMALS_PER_CANDIDATE[protocol.n_level],
      animals_total: ANIMALS_PER_CANDIDATE[protocol.n_level] * patents.length,
      species: '랫드 + 비글견(고정)',
      efficacy_model: model ? `${model.gene} — ${model.model} · ${model.measures}` : '(표적 없음)',
      model_pain_grade: model?.painGrade ?? '-',
      chosen_pain_grade: protocol.pain_grade ?? '(안 고름)',
      humane_endpoint_weight_loss_pct: protocol.endpoint_weight_loss_pct ?? '(빈칸)',
      trained_performers: trained.size,
      alt_assays: altFacts || '(하지 않음)',
    };
    const snapshot: IacucSnapshot = {
      version: protocol.version,
      level: protocol.n_level,
      patentIds: patents.map((p) => p.id),
      painGrade: protocol.pain_grade,
      endpointPct: protocol.endpoint_weight_loss_pct,
      performerIds: protocol.performer_ids,
    };
    await tx.query(`update web.iacuc_protocols set status = 'reviewing', pending_version = version, pending_snapshot = $2, updated_at = now() where id = $1`, [protocol.id, JSON.stringify(snapshot)]);
    return requestReview(
      deps,
      {
        kind: 'iacuc',
        docId: protocol.id,
        docVersion: protocol.version,
        sections: body,
        checklist: [...IACUC_CHECKLIST],
        facts,
        ruleFindings: findings,
        reviewerVersion: IACUC_REVIEWER_VERSION,
        teamId: who.teamId,
        classId: who.classId,
        requestedBy: account.userId,
      },
      { tx },
    );
  });
  outcome.dispatch();
  notifyTeam(deps, who.teamId, 'preclinical:review', account.displayName);
  return { review: outcome.review, created: outcome.created };
}

/** 심의 판정 — 판정을 쓴 트랜잭션 안. 통과면 접수 스냅숏을 승인 스냅숏으로, 보완이면 상태만(교사가 통과를 거두면 아직 안 쓴 승인만 되돌린다). */
async function onIacucReviewed(tx: Tx, review: { docId: string; docVersion: number; verdict: 'pass' | 'revise' | 'reject'; teamId: string; correctedFrom: string | null }, deps: Deps) {
  const found = await tx.query<ProtocolRow>(`select ${PROTOCOL_COLUMNS} from web.iacuc_protocols where id = $1 for update`, [review.docId]);
  const row = found.rows[0];
  if (!row) return;
  if (review.verdict === 'pass') {
    let snap = row.pending_version === review.docVersion ? row.pending_snapshot : null;
    if (!snap && row.version === review.docVersion) {
      snap = { version: row.version, level: row.n_level, patentIds: await protocolPatentIds(tx, row.id), painGrade: row.pain_grade, endpointPct: row.endpoint_weight_loss_pct, performerIds: row.performer_ids };
    }
    if (!snap) return () => notifyTeam(deps, review.teamId, 'preclinical:review');
    await tx.query(
      `update web.iacuc_protocols set approved_version = $2, approved_at = now(), approved_snapshot = $3,
              status = case when version = $2 then 'approved' else 'draft' end, updated_at = now()
        where id = $1`,
      [row.id, review.docVersion, JSON.stringify(snap)],
    );
  } else {
    // 상태는 '지금 심의 중인 판'(pending_version) 또는 '지금 승인된 판'의 판정일 때만 바꾼다 — 교사가 옛 판의 판정을 정정해도
    // 지금 승인 · 심의 중 상태가 '보완'으로 뒤집히지 않게(뒤집히면 심의 중인데도 새 심의를 또 낼 수 있었다).
    const current = row.pending_version === review.docVersion || row.approved_version === review.docVersion;
    if (review.correctedFrom === 'pass' && row.approved_version === review.docVersion) {
      const used = await tx.query('select 1 from web.jobs where protocol_id = $1 limit 1', [row.id]);
      if (!used.rowCount) await tx.query('update web.iacuc_protocols set approved_version = null, approved_at = null, approved_snapshot = null where id = $1', [row.id]);
    }
    if (current) {
      // 다른(새) 판을 심의 중이면 그 '심의 중' 상태는 그대로 둔다.
      const stillReviewingOther = row.status === 'reviewing' && row.pending_version !== null && row.pending_version !== review.docVersion;
      if (!stillReviewingOther) {
        await tx.query(`update web.iacuc_protocols set status = case when status in ('reviewing', 'approved') then 'revise' else status end, updated_at = now() where id = $1`, [row.id]);
      }
    }
  }
  return () => notifyTeam(deps, review.teamId, 'preclinical:review');
}

// ── ③ ④ 실행 ──

const propsCache = new Map<string, MoleculeProperties>();

/** F31 이 저장한 물성이 신호 계산에 쓸 모양인가(아니면 워커로 다시). */
const usableProps = (p: MoleculeProperties | null): MoleculeProperties | null =>
  p && ['mw', 'clogp', 'tpsa', 'hbd', 'hba', 'rotb', 'basicAmines'].every((k) => typeof (p as unknown as Record<string, unknown>)[k] === 'number') && Array.isArray(p.alerts) ? p : null;

async function propertiesOf(deps: Deps, smiles: string): Promise<MoleculeProperties> {
  const hit = propsCache.get(smiles);
  if (hit) return hit;
  try {
    const outcome = await deps.worker.properties(smiles);
    if (!outcome.ok) throw new ApiError(400, 'invalid_input', outcome.message);
    if (propsCache.size > 500) propsCache.delete(propsCache.keys().next().value!);
    propsCache.set(smiles, outcome.properties);
    return outcome.properties;
  } catch (error) {
    if (error instanceof WorkerUnavailableError) throw new ApiError(503, 'worker_unavailable', '물성 계산 서버에 닿지 않아요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: 5 });
    throw error;
  }
}

export interface RunRequest {
  requestId: string;
  patentId: string;
  kind: 'animal_study' | 'alt_assay';
  assay: AltAssay | null;
}

export function checkRunRequest(raw: unknown): RunRequest {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (typeof b.requestId !== 'string' || !REQUEST_ID.test(b.requestId)) throw badRequest('요청 번호(requestId)가 형식에 맞지 않아요.');
  if (typeof b.patentId !== 'string' || !UUID.test(b.patentId)) throw badRequest('실행할 특허 분자를 골라 주세요.');
  if (b.kind !== 'animal_study' && b.kind !== 'alt_assay') throw badRequest('실행 종류는 animal_study · alt_assay 중 하나예요.');
  let assay: AltAssay | null = null;
  if (b.kind === 'alt_assay') {
    if (!ALT_ASSAYS.includes(b.assay as AltAssay)) throw badRequest('대체 시험은 herg · liver 중 하나예요.');
    assay = b.assay as AltAssay;
  }
  return { requestId: b.requestId, patentId: b.patentId, kind: b.kind, assay };
}

async function loadRunView(db: Queryable, jobId: string): Promise<PreclinicalRunView> {
  const result = await db.query<RunRow>(
    `select j.id, j.patent_id, j.facility, j.design_key, j.status, j.progress, j.params, j.result, j.ends_game_day, j.cost_cents,
            a.display_name as by_name, m.avatar as by_avatar, c.ok as calc_ok, c.answers as calc_answers, ca.display_name as calc_by
       from web.jobs j
       left join web.accounts a on a.user_id = j.created_by
       left join web.members m on m.user_id = j.created_by and m.role = 'student'
       left join web.preclinical_calcs c on c.job_id = j.id
       left join web.accounts ca on ca.user_id = c.checked_by
      where j.id = $1`,
    [jobId],
  );
  return runView(result.rows[0]!);
}

/** 같은 요청 번호의 앞 작업 — 3.2 작업이어야 그 결과를 돌려준다(1.2 · 2.x 작업 번호를 다시 쓰면 409 · 옛 화면에 남의 작업 모양이 섞이지 않게). */
function sameRequest(row: { id: string; step: string }): string {
  if (row.step !== '3.2') throw new ApiError(409, 'already_exists', '그 요청 번호는 이미 다른 작업에 쓰였어요. 화면을 새로 고쳐 다시 눌러 주세요.');
  return row.id;
}

export async function startRun(deps: Deps, account: AccountView, raw: unknown): Promise<PreclinicalRunResponse> {
  const who = await teamMember(deps.db, account);
  const req = checkRunRequest(raw);
  // 같은 요청 번호 — 같은 작업(두 번 눌러도 한 번).
  const again = await deps.db.query<{ id: string; step: string }>('select id, step from web.jobs where team_id = $1 and request_id = $2', [who.teamId, req.requestId]);
  if (again.rows[0]) return { run: await loadRunView(deps.db, sameRequest(again.rows[0])), created: false, charged: false };

  if (req.kind === 'animal_study') {
    const trained = await trainedSet(deps.db, who.classId, [account.userId]);
    if (!trained.has(account.userId)) throw new ApiError(403, 'forbidden', PRECLINICAL_COPY.messages.needEthics);
  }
  const program0 = await lockedProgram(deps.db, who.teamId);
  const [patent] = await activePatents(deps.db, who.teamId, program0.revision_id, [req.patentId]);
  if (!patent) throw new ApiError(409, 'step_locked', '지금 표적의 우리 모둠 유효 특허만 실행할 수 있어요.');
  // 판정 재료(신호 · 결합력 p) — 그 특허의 앞 실행이 있으면 그대로(물성 계산을 다시 하지 않는다), 없으면 워커 RDKit 물성으로. 씨앗만 설계마다 바꾼다.
  const prior = await deps.db.query<{ input: PreclinicalInput }>(
    `select params->'input' as input from web.jobs where patent_id = $1 and step = '3.2' and params ? 'input' order by created_at limit 1`,
    [patent.id],
  );
  const baseInput =
    prior.rows[0]?.input ??
    (program0.target_id
      ? preclinicalInput({ targetId: program0.target_id, props: usableProps(patent.properties) ?? (await propertiesOf(deps, patent.canonical_smiles)), affinityKcal: patent.affinity_kcal, seed: '' })
      : null);
  if (!baseInput) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');

  const result = await withTx(deps.db, async (tx) => {
    await tx.query('select id from web.teams where id = $1 for update', [who.teamId]);
    const dupReq = await tx.query<{ id: string; step: string }>('select id, step from web.jobs where team_id = $1 and request_id = $2', [who.teamId, req.requestId]);
    if (dupReq.rows[0]) return { id: sameRequest(dupReq.rows[0]), created: false, charged: false };
    const program = await lockedProgram(tx, who.teamId);
    if (program.revision_id !== program0.revision_id || !program.target_id) throw new ApiError(409, 'stale', '그 사이 모둠 표적이 바뀌었어요. 화면을 새로 고쳐 주세요.');
    const [p] = await activePatents(tx, who.teamId, program.revision_id, [req.patentId]);
    if (!p) throw new ApiError(409, 'step_locked', '지금 표적의 우리 모둠 유효 특허만 실행할 수 있어요.');

    let designKey: string;
    let protocolId: string | null = null;
    let level: AnimalCountLevel | null = null;
    if (req.kind === 'animal_study') {
      const protocol = await loadProtocol(tx, program.revision_id, 'for share');
      const snap = protocol?.approved_snapshot;
      if (!protocol || !snap || !snap.patentIds.includes(p.id)) throw new ApiError(409, 'step_locked', PRECLINICAL_COPY.messages.needApproval);
      level = snap.level;
      protocolId = protocol.id;
      designKey = animalDesignKey(level);
    } else {
      designKey = altDesignKey(req.assay!);
    }
    // ⑬ 같은 (특허 · 설계) — 과금 없이 옛 결과(다시 뽑기 없음).
    const dup = await tx.query<{ id: string }>(`select id from web.jobs where patent_id = $1 and design_key = $2 and status <> 'failed'`, [p.id, designKey]);
    if (dup.rows[0]) return { id: dup.rows[0].id, created: false, charged: false };

    const clock = await loadClock(tx, who.classId);
    const durationDays = req.kind === 'animal_study' ? PRECLINICAL_FEES.animalStudyGameDays : PRECLINICAL_FEES.altAssayGameDays;
    const cost = req.kind === 'animal_study' ? ANIMAL_STUDY_COST_CENTS : ALT_ASSAY_COST_CENTS;
    const input: PreclinicalInput = { ...baseInput, targetId: program.target_id, seed: `${program.revision_id}:${p.flat_smiles}:${designKey}` };
    const params: RunParams = {
      kind: req.kind,
      patentId: p.id,
      codeName: p.code_name,
      ...(level ? { level } : {}),
      ...(req.assay ? { assay: req.assay } : {}),
      startGameDay: clock.gameDay,
      durationDays,
      input,
    };
    const id = randomUUID();
    const summary =
      req.kind === 'animal_study'
        ? `${p.code_name} · 동물실험 묶음(${levelLabel(level!)} ${ANIMALS_PER_CANDIDATE[level!]}마리)`
        : `${p.code_name} · 대체 시험 ${PRECLINICAL_COPY.assays[req.assay!].label}`;
    const inserted = await tx.query<{ id: string }>(
      `insert into web.jobs (id, team_id, class_id, created_by, request_id, step, stage, facility, params, input_summary, target_id, program_revision_id,
                             smiles, label, status, progress, source, cost_cents, patent_id, protocol_id, design_key, ends_game_day)
       values ($1, $2, $3, $4, $5, '3.2', 5, $6, $7, $8, $9, $10, $11, $12, 'running', 0, 'simulation', $13, $14, $15, $16, $17)
       on conflict do nothing returning id`,
      [id, who.teamId, who.classId, account.userId, req.requestId, req.kind, JSON.stringify(params), summary, program.target_id, program.revision_id,
        p.canonical_smiles, p.code_name, cost, p.id, protocolId, designKey, clock.gameDay + durationDays],
    );
    if (!inserted.rows[0]) {
      const raced = await tx.query<{ id: string; step: string }>(
        `select id, step from web.jobs where (patent_id = $1 and design_key = $2 and status <> 'failed') or (team_id = $3 and request_id = $4) limit 1`,
        [p.id, designKey, who.teamId, req.requestId],
      );
      return { id: sameRequest(raced.rows[0]!), created: false, charged: false };
    }
    const charged = await charge(tx, { teamId: who.teamId, cents: cost, kind: 'paid_work', idemKey: `job:${id}`, createdBy: account.userId, jobId: id });
    return { id, created: true, charged: charged.charged };
  });
  if (result.created) notifyTeam(deps, who.teamId, `job:3.2`, account.displayName);
  return { run: await loadRunView(deps.db, result.id), created: result.created, charged: result.charged };
}

/** 게임 시계 — 만기 작업을 결정적 결과로 끝내고(상태 조건부 UPDATE · 멱등), 진행률을 고친다. */
const lastProgress = new Map<string, number>();

export async function finishDueRuns(deps: Deps, classes: Array<{ classId: string; gameDay: number }>): Promise<number> {
  if (classes.length === 0) return 0;
  const dayOf = new Map(classes.map((c) => [c.classId, c.gameDay]));
  const active = await deps.db.query<{ id: string; team_id: string; class_id: string; params: RunParams; ends_game_day: number }>(
    `select id, team_id, class_id, params, ends_game_day from web.jobs
      where step = '3.2' and status in ('queued', 'running') and ends_game_day is not null and class_id = any($1::uuid[])`,
    [[...dayOf.keys()]],
  );
  let finished = 0;
  const teams = new Set<string>();
  for (const job of active.rows) {
    const day = dayOf.get(job.class_id) ?? 0;
    const p = job.params;
    if (day >= Number(job.ends_game_day)) {
      const result = p.kind === 'animal_study' ? PRECLINICAL_RULES.study(p.input, p.level!) : PRECLINICAL_RULES.altAssay(p.input, p.assay!);
      const done = await deps.db.query(
        `update web.jobs set status = 'succeeded', progress = 1, result = $2, finished_at = now(), updated_at = now()
          where id = $1 and status in ('queued', 'running')`,
        [job.id, JSON.stringify(result)],
      );
      if (done.rowCount) {
        finished++;
        teams.add(job.team_id);
        lastProgress.delete(job.id);
      }
      continue;
    }
    const span = Math.max(1e-6, Number(job.ends_game_day) - p.startGameDay);
    const progress = Math.round(Math.max(0, Math.min(0.99, (day - p.startGameDay) / span)) * 100) / 100;
    if ((lastProgress.get(job.id) ?? -1) >= progress) continue;
    lastProgress.set(job.id, progress);
    await deps.db.query(`update web.jobs set progress = $2, updated_at = now() where id = $1 and status in ('queued', 'running') and progress < $2`, [job.id, progress]);
    deps.hub.broadcastTeam(job.team_id, { type: 'job.progress', teamId: job.team_id, jobId: job.id, status: 'running', progress });
  }
  for (const teamId of teams) deps.hub.publish(teamChannel(teamId), { type: 'board.changed', teamId, reason: 'preclinical:done' });
  return finished;
}

// ── 학생 계산 칸 · 회고 ──

export async function submitCalc(deps: Deps, account: AccountView, jobId: string, raw: unknown): Promise<PreclinicalCalcCheck & { saved: boolean }> {
  const who = await teamMember(deps.db, account);
  if (!UUID.test(jobId)) throw new ApiError(404, 'not_found', '동물실험 결과를 찾지 못했어요.');
  const answers = checkCalcAnswers(raw);
  const program = await lockedProgram(deps.db, who.teamId);
  const job = await deps.db.query<{ result: PreclinicalJobResult | null; program_revision_id: string }>(
    `select result, program_revision_id from web.jobs where id = $1 and team_id = $2 and step = '3.2' and facility = 'animal_study' and status = 'succeeded'`,
    [jobId, who.teamId],
  );
  const row = job.rows[0];
  const result = asPreclinicalResult(row?.result);
  if (!row || result?.kind !== 'animal_study' || row.program_revision_id !== program.revision_id) throw new ApiError(404, 'not_found', '지금 표적의 끝난 동물실험 결과가 아니에요.');
  const check = PRECLINICAL_RULES.checkCalc(result, answers);
  // 한 번 맞으면 그대로 둔다(늦은 틀린 답이 덮지 않게).
  const saved = await deps.db.query(
    `insert into web.preclinical_calcs (job_id, program_revision_id, team_id, answers, ok, checked_by) values ($1, $2, $3, $4, $5, $6)
     on conflict (job_id) do update set answers = excluded.answers, ok = excluded.ok, checked_by = excluded.checked_by, checked_at = now()
       where not web.preclinical_calcs.ok`,
    [jobId, row.program_revision_id, who.teamId, JSON.stringify(answers), check.ok, account.userId],
  );
  notifyTeam(deps, who.teamId, 'preclinical:calc', account.displayName);
  return { ...check, saved: (saved.rowCount ?? 0) > 0 };
}

export async function saveReflection(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; version: number }> {
  const who = await teamMember(deps.db, account);
  const b = (raw ?? {}) as Record<string, unknown>;
  const ev = b.expectedVersion;
  if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 0) throw badRequest('화면이 읽은 판(expectedVersion)을 보내 주세요.');
  if (typeof b.body !== 'string') throw badRequest('회고 한 줄을 보내 주세요.');
  const text = b.body.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (charLength(text) > PRECLINICAL_LIMITS.reflectionMax) throw badRequest(`회고는 ${PRECLINICAL_LIMITS.reflectionMax}자까지예요.`);
  if (/\p{Cc}/u.test(text)) throw badRequest('쓸 수 없는 글자가 있어요.');
  const version = await withTx(deps.db, async (tx) => {
    const program = await lockedProgram(tx, who.teamId);
    await tx.query(`insert into web.preclinical_reports (program_revision_id, team_id) values ($1, $2) on conflict (program_revision_id) do nothing`, [program.revision_id, who.teamId]);
    const saved = await tx.query<{ reflection_version: number }>(
      `update web.preclinical_reports set reflection = $2, reflection_version = reflection_version + 1, reflection_by = $3, updated_at = now()
        where program_revision_id = $1 and reflection_version = $4 returning reflection_version`,
      [program.revision_id, text, account.userId, ev],
    );
    if (!saved.rows[0]) {
      const cur = await tx.query<{ reflection: string; reflection_version: number; display_name: string | null; updated_at: Date }>(
        `select r.reflection, r.reflection_version, a.display_name, r.updated_at from web.preclinical_reports r left join web.accounts a on a.user_id = r.reflection_by where r.program_revision_id = $1`,
        [program.revision_id],
      );
      const c = cur.rows[0]!;
      throw new ApiError(409, 'stale', '다른 모둠원이 회고를 먼저 고쳤어요. 내용을 확인한 뒤 합쳐서 저장해 주세요.', {
        section: { section: 'reflection', body: c.reflection, version: c.reflection_version, byName: c.display_name, avatar: null, updatedAt: c.updated_at.toISOString() },
      });
    }
    return saved.rows[0].reflection_version;
  });
  notifyTeam(deps, who.teamId, 'preclinical:reflection', account.displayName);
  return { ok: true, version };
}

// ── ⑤ 주력 · 백업(⑭) ──

export async function setPreclinicalLead(deps: Deps, account: AccountView, raw: unknown): Promise<{ ok: true; leadVersion: number }> {
  const who = await teamMember(deps.db, account);
  const b = (raw ?? {}) as Record<string, unknown>;
  const ev = b.expectedVersion;
  if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 0) throw badRequest('화면이 읽은 버전(expectedVersion)을 보내 주세요. 화면을 새로 고쳐 주세요.');
  const idOf = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : null);
  // 3판 모양은 특허 id, W3 모양(leadJobId · backupJobId = 2.2 ADMET 작업)도 받아 특허로 바꾼다.
  const leadRef = idOf(b.leadPatentId) ?? idOf(b.leadJobId);
  const backupRef = b.backupPatentId !== undefined ? idOf(b.backupPatentId) : idOf(b.backupJobId);
  if (!leadRef) throw badRequest('주력으로 고를 특허 분자를 골라 주세요.');
  if (backupRef && backupRef === leadRef) throw badRequest('백업은 주력과 다른 분자여야 해요.');
  const reason = b.reason;

  const outcome = await withTx(deps.db, async (tx) => {
    // 잠금 순서 teams → programs → classes(전광판 소식 class_seq) — board-events.ts · ledger.ts 와 같은 순서(거꾸로 잡으면 교착).
    await tx.query('select id from web.teams where id = $1 for update', [who.teamId]);
    const program = await lockedProgram(tx, who.teamId);
    if (!program.target_id) throw new ApiError(409, 'step_locked', '1.1 에서 표적을 먼저 정해 주세요.');
    const patents = await activePatents(tx, who.teamId, program.revision_id);
    const find = (ref: string) => patents.find((p) => p.id === ref || p.admet_job_id === ref);
    const lead = find(leadRef);
    const backup = backupRef ? find(backupRef) : null;
    if (!lead || (backupRef && !backup)) throw new ApiError(409, 'step_locked', '주력 · 백업은 지금 표적의 우리 모둠 유효 특허 분자에서 골라야 해요.');
    if (backup && backup.id === lead.id) throw badRequest('백업은 주력과 다른 분자여야 해요.');
    const studies = await tx.query<{ patent_id: string; result: PreclinicalJobResult }>(
      `select distinct on (patent_id) patent_id, result from web.jobs
        where program_revision_id = $1 and step = '3.2' and facility = 'animal_study' and status = 'succeeded'
        order by patent_id, finished_at desc nulls last`,
      [program.revision_id],
    );
    const studyOf = (id: string) => {
      const r = asPreclinicalResult(studies.rows.find((s) => s.patent_id === id)?.result);
      return r?.kind === 'animal_study' ? r : null;
    };
    const leadStudy = studyOf(lead.id);
    if (!leadStudy || (backup && !studyOf(backup.id))) throw new ApiError(409, 'step_locked', '주력 · 백업은 동물실험을 끝낸 분자만 고를 수 있어요.');
    // 근거 칩은 후보 검사 뒤에 본다(옛 표적 · 특허 없는 요청은 먼저 409 step_locked).
    if (typeof reason !== 'string' || !PRECLINICAL_LEAD_REASONS.includes(reason as PreclinicalLeadReason)) throw new ApiError(400, 'bad_request', '주력을 고른 근거 칩을 하나 골라 주세요.');
    const all = studies.rows.map((s) => asPreclinicalResult(s.result)).filter((x): x is AnimalStudyResult => x?.kind === 'animal_study');
    const cns = DOCKING_TARGETS.find((t) => t.id === program.target_id)?.cns ?? false;
    const verdict = PRECLINICAL_RULES.leadReasonVerdict(reason, leadStudy, all, cns);
    if (verdict.status === 'block') throw new ApiError(400, 'reason_blocked', verdict.message);
    // ⑭ 한 문장 낙관적 잠금 — 같은 버전의 2.2 작업인지는 복합 외래 키, 주력 ≠ 백업은 CHECK.
    const updated = await tx.query<{ lead_version: number }>(
      `update web.program_revisions set lead_job_id = $2, backup_job_id = $3, lead_version = lead_version + 1, lead_set_at = now(), lead_set_by = $4
        where id = $1 and lead_version = $5 returning lead_version`,
      [program.revision_id, lead.admet_job_id, backup?.admet_job_id ?? null, account.userId, ev],
    );
    if (!updated.rows[0]) throw new ApiError(409, 'stale', '다른 모둠원이 주력 · 백업을 먼저 바꿨어요. 화면을 새로 고쳐 확인해 주세요.');
    await tx.query(
      `insert into web.preclinical_reports (program_revision_id, team_id, lead_reason) values ($1, $2, $3)
       on conflict (program_revision_id) do update set lead_reason = excluded.lead_reason, updated_at = now()`,
      [program.revision_id, who.teamId, reason],
    );
    // 3.2 완료(승인 계획서 + 동물실험 + 주력) — 전광판 소식(변동 0 · 공개 칸은 티커 · 코드명 · 단계만). 표적 버전마다 한 번.
    const team = await tx.query<{ ticker: string | null }>('select ticker from web.teams where id = $1', [who.teamId]);
    const event = await postBoardEvent(tx, deps, {
      classId: who.classId,
      teamId: who.teamId,
      kind: 'preclinical',
      headline: PRECLINICAL_COPY.board.headline(team.rows[0]?.ticker ?? '모둠', lead.code_name),
      public: { codeName: lead.code_name, step: '3.2' },
      idemKey: `preclinical:${program.revision_id}`,
      gameDay: await currentGameDay(tx, who.classId),
    });
    return { leadVersion: updated.rows[0].lead_version, after: event.after };
  });
  outcome.after();
  notifyTeam(deps, who.teamId, 'lead', account.displayName);
  return { ok: true, leadVersion: outcome.leadVersion };
}

// ── 교사 — 학급 합계 마릿수(윤리 토론 자료 · API 만) ──

export async function teacherSummary(deps: Deps, account: AccountView, classId: string): Promise<PreclinicalTeacherView> {
  await requireTeacherOf(deps.db, account, classId);
  const teams = await deps.db.query<{ id: string; startup_name: string | null; ticker: string | null; revision_id: string | null }>(
    `select t.id, t.startup_name, t.ticker, p.current_revision_id as revision_id
       from web.teams t left join web.programs p on p.team_id = t.id where t.class_id = $1 order by t.plot`,
    [classId],
  );
  const out: PreclinicalTeacherView = { classId, totalAnimals: 0, totalHumane: 0, totalSaved: 0, altAssays: 0, teams: [] };
  for (const t of teams.rows) {
    if (!t.revision_id) {
      out.teams.push({ teamId: t.id, startupName: t.startup_name, ticker: t.ticker, animals: 0, humane: 0, saved: 0, studies: 0, altAssays: 0, approved: false });
      continue;
    }
    const [patents, runs, protocol] = await Promise.all([activePatents(deps.db, t.id, t.revision_id), loadRuns(deps.db, t.revision_id), loadProtocol(deps.db, t.revision_id)]);
    const views = runs.map(runView);
    const rows = reportRows(patents, views, protocol?.approved_snapshot ?? null);
    const row = {
      teamId: t.id,
      startupName: t.startup_name,
      ticker: t.ticker,
      animals: rows.reduce((n, r) => n + r.animalsUsed, 0),
      humane: rows.reduce((n, r) => n + r.humaneEndpoints, 0),
      saved: rows.reduce((n, r) => n + r.animalsSaved, 0),
      studies: views.filter((r) => r.kind === 'animal_study' && r.status !== 'failed').length,
      altAssays: views.filter((r) => r.kind === 'alt_assay' && r.status !== 'failed').length,
      approved: Boolean(protocol?.approved_snapshot),
    };
    out.teams.push(row);
    out.totalAnimals += row.animals;
    out.totalHumane += row.humane;
    out.totalSaved += row.saved;
    out.altAssays += row.altAssays;
  }
  return out;
}

// ── 등록 ──

export function register(router: Router<RequestContext>): void {
  onReviewed('iacuc', (tx, review, deps) => onIacucReviewed(tx, review, deps));
  onGameDay('preclinical', async (deps, tick) => {
    await finishDueRuns(deps, tick.classes);
  });

  router.on('GET', '/api/preclinical', async (ctx) => loadPreclinical(ctx.deps, requireAccount(ctx)));
  router.on('POST', '/api/preclinical/ethics', async (ctx) => submitEthics(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('PUT', '/api/preclinical/protocol', async (ctx) => saveSettings(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('PUT', '/api/preclinical/protocol/sections/:section', async (ctx, p) => saveIacucSection(ctx.deps, requireAccount(ctx), p.section!, await readJson(ctx.req)));
  router.on('POST', '/api/preclinical/protocol/review', async (ctx) => {
    const out = await requestIacucReview(ctx.deps, requireAccount(ctx), await readJson(ctx.req));
    ctx.status = out.created ? 201 : 200;
    return out;
  });
  router.on('POST', '/api/preclinical/runs', async (ctx) => {
    const out = await startRun(ctx.deps, requireAccount(ctx), await readJson(ctx.req));
    ctx.status = out.created ? 201 : 200;
    return out;
  });
  router.on('PUT', '/api/preclinical/runs/:jobId/calc', async (ctx, p) => submitCalc(ctx.deps, requireAccount(ctx), p.jobId!, await readJson(ctx.req)));
  router.on('PUT', '/api/preclinical/report/reflection', async (ctx) => saveReflection(ctx.deps, requireAccount(ctx), await readJson(ctx.req)));
  router.on('GET', '/api/teacher/classes/:classId/preclinical', async (ctx, p) => teacherSummary(ctx.deps, requireAccount(ctx), p.classId!));
}

