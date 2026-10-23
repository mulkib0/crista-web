/**
 * 교사 화면 — 모둠별 현재 단계 · 막힌 이유 · 연구 노트(설계 §9 '진행'). 화면: apps/web/src/teacher/. 규격: web-contract `teacher.ts`.
 *
 * - 단계 상태는 학생 사이드바와 같은 서버 판정(pipeline.ts `computeSteps` · `stepFacts` · `loadStageFacts`)을 모둠마다 부른다 — 화면이 따로 셈하지 않는다.
 * - '막힌 이유'는 단계 상태(보류 held · 연구비 부족 blocked) + 선생님을 기다리는 것(서류 심사 대기 · 임상 판정 대기 · 학습 이의 제기)을 모은다.
 * - 읽기만 한다(쓰기 없음). 교사 권한은 `requireTeacherOf`(그 학급 교사만 · 남의 학급은 404).
 * - 학급 연결 상한(로컬 30)을 생각해 모둠을 차례로 읽는다(모둠 ≤ 8).
 */
import {
  centsToCrista,
  DEFAULT_TRACK,
  STEP_IDS,
  STEP_META,
  type AccountView,
  type NoteSection,
  type StepId,
  type TeacherProgressResponse,
  type TeacherStuck,
  type TeacherTeamProgress,
} from '@crista-web/web-contract';
import { currentGameDay } from '../clock.ts';
import { requireAccount, requireTeacherOf } from '../guard.ts';
import type { Router } from '../http.ts';
import { balanceOf, computeSteps, loadProgramRow, loadStageFacts, stepFacts } from '../pipeline.ts';
import type { Deps } from '../context.ts';
import type { RequestContext } from '../routes.ts';
import { loadTeams } from '../views.ts';

const STUCK_DOC: Record<string, { step: StepId; label: string }> = {
  patent: { step: '3.1', label: '특허 출원서' },
  iacuc: { step: '3.2', label: '동물실험계획서' },
  ind: { step: '3.3', label: '임상시험 계획 승인 신청서' },
  nda: { step: '4.2', label: '품목 허가 신청서' },
};
const PHASE_WORD: Record<string, string> = { phase1: '1상', phase2: '2상', phase3: '3상' };

export async function teacherProgress(deps: Deps, account: AccountView, classId: string): Promise<TeacherProgressResponse> {
  await requireTeacherOf(deps.db, account, classId);
  const db = deps.db;
  // 차례로 읽는다 — 한 요청이 연결을 여럿 잡지 않게(로컬 연결 상한 30을 여러 서버가 나눠 씀).
  const teams = await loadTeams(db, classId);
  const gameDay = await currentGameDay(db, classId);
  const members = await db.query<{ team_id: string; user_id: string; display_name: string }>(
    `select m.team_id, m.user_id, a.display_name from web.members m join web.accounts a on a.user_id = m.user_id
      where m.class_id = $1 and m.role = 'student' and m.team_id is not null order by m.joined_team_at nulls last, a.display_name`,
    [classId],
  );
  // 심사 중인 것(교사를 기다리지 않음 — AI · 규칙이 숙고 기간 뒤 자동 공개) · 임상 결과 정리 중 · 학습 이의 제기(교사 몫).
  const waiting = await db.query<{ team_id: string; kind: 'review' | 'trial' | 'appeal'; ref: string; n: number }>(
    `select team_id, 'review' as kind, doc_kind as ref, count(*)::int as n from web.doc_reviews
       where class_id = $1 and verdict = 'pending' group by team_id, doc_kind
     union all
     select team_id, 'trial', phase, count(*)::int from web.clinical_trials
       where class_id = $1 and status = 'pending' group by team_id, phase
     union all
     select ap.team_id, 'appeal', ap.target_type, count(*)::int from web.learn_appeals ap join web.teams t on t.id = ap.team_id
       where t.class_id = $1 and ap.status = 'open' group by ap.team_id, ap.target_type`,
    [classId],
  );

  const out: TeacherTeamProgress[] = [];
  for (const team of teams) {
    const base = {
      teamId: team.id,
      plot: team.plot,
      ink: team.ink,
      startupName: team.startupName,
      ticker: team.ticker,
      members: members.rows.filter((m) => m.team_id === team.id).map((m) => ({ userId: m.user_id, displayName: m.display_name })),
    };
    if (!team.registeredAt) {
      out.push({ ...base, registered: false, balanceCrista: 0, revisionNo: 0, diseaseId: null, targetId: null, steps: [], currentStep: '1.1', stuck: [], notes: [], lastActivityAt: null });
      continue;
    }
    const program = await loadProgramRow(db, team.id);
    const balanceCents = await balanceOf(db, team.id);
    const facts = await stepFacts(db, team.id, program.revision_id, program.target_id);
    const stage = program.revision_id ? await loadStageFacts(db, program.revision_id, program.lead_job_id !== null, gameDay) : undefined;
    const notes = await (program.revision_id
      ? db.query<{ step_id: StepId; section: NoteSection; body: string; display_name: string | null; updated_at: Date }>(
          `select n.step_id, n.section, n.body, a.display_name, n.updated_at from web.notes n left join web.accounts a on a.user_id = n.updated_by
            where n.program_revision_id = $1 and length(btrim(n.body)) > 0`,
          [program.revision_id],
        )
      : Promise.resolve({ rows: [] }));
    const activity = await db.query<{ at: Date | null }>(
      `select greatest(
         (select max(updated_at) from web.jobs where team_id = $1),
         (select max(n.updated_at) from web.notes n join web.program_revisions r on r.id = n.program_revision_id where r.team_id = $1),
         (select max(created_at) from web.ledger where team_id = $1 and kind <> 'initial')) as at`,
      [team.id],
    );
    const steps = computeSteps({ track: DEFAULT_TRACK, targetId: program.target_id, facts, balanceCents, ...(stage ? { stage } : {}) });
    const firstOpen = steps.find((s) => s.state !== 'done');
    const currentStep = firstOpen?.id ?? STEP_IDS[STEP_IDS.length - 1]!;

    const stuck: TeacherStuck[] = [];
    for (const s of steps) {
      if (s.state === 'held') stuck.push({ kind: 'held', stepId: s.id, message: s.reason ?? `${s.id} ${STEP_META[s.id].title} 보류`, teacher: false });
      else if (s.state === 'blocked') stuck.push({ kind: 'blocked', stepId: s.id, message: s.reason ?? '연구비가 모자라요.', teacher: false });
    }
    for (const w of waiting.rows.filter((r) => r.team_id === team.id)) {
      if (w.kind === 'review') {
        const doc = STUCK_DOC[w.ref];
        stuck.push({ kind: 'review', stepId: doc?.step ?? null, message: `${doc?.label ?? '서류'} 심사 중이에요(${w.n}건 — 숙고 기간이 끝나면 자동 공개).`, teacher: false, count: w.n });
      } else if (w.kind === 'trial') {
        stuck.push({ kind: 'trial', stepId: '4.1', message: `${PHASE_WORD[w.ref] ?? ''} 임상 결과를 정리하고 있어요(AI 또는 규칙 판정으로 자동 공개).`.trim(), teacher: false, count: w.n });
      } else {
        stuck.push({ kind: 'appeal', stepId: null, message: `학습 채점 이의 제기가 ${w.n}건 열려 있어요.`, teacher: true, count: w.n });
      }
    }

    out.push({
      ...base,
      registered: true,
      balanceCrista: centsToCrista(balanceCents),
      revisionNo: program.revision_no,
      diseaseId: program.disease_id,
      targetId: program.target_id,
      steps,
      currentStep,
      stuck,
      notes: notes.rows.map((n) => ({ stepId: n.step_id, section: n.section, body: n.body, byName: n.display_name, updatedAt: n.updated_at.toISOString() })),
      lastActivityAt: activity.rows[0]?.at?.toISOString() ?? null,
    });
  }
  return { classId, gameDay, teams: out };
}

export function register(router: Router<RequestContext>): void {
  router.on('GET', '/api/teacher/classes/:classId/progress', async (ctx, p) => teacherProgress(ctx.deps, requireAccount(ctx), p.classId!));
}
