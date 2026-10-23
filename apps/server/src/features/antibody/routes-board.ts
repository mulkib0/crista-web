/**
 * 항체 랩 경로 ① 화면 한 장 · 자료 조회 · 프로그램 · 노트 · '점수 계산 방법'(설계 §5.5).
 *
 * 규약은 기존 것을 그대로 쓴다 — 인증은 `register(router, account)` 로 받은 `account`, Origin · CSRF · content-type 검사는
 * 앱이 이미 모든 `/api` 에 걸어 둔다. 모둠 id 는 경로로 받지 않고 세션에서 정한다.
 */
import {
  ANTIBODY_API,
  ANTIBODY_FORMULA_VERSION,
  ANTIBODY_GROUP_TITLE,
  ANTIBODY_STEP_COST_CRISTA,
  ANTIBODY_STEP_IDS,
  ANTIBODY_STEP_META,
  DESIGN_SLOTS_PER_PERSON,
  DIVERSITY_LOCK_PERCENTILE,
  ESMFOLD_MAX_RESIDUES,
  LOOKUP_PER_MIN_PER_TEAM,
  PREVIEW_PER_MIN_PER_TEAM,
  type AccountView,
  type AntibodyCatalogAntibody,
  type AntibodyCatalogResponse,
  type AntibodyCatalogTarget,
  type AntibodyDataMode,
  type Provenance,
} from '@crista-web/web-contract';
import type { Deps } from '../../context.ts';
import { ApiError, readJson, type Router } from '../../http.ts';
import { teamMember } from '../../pipeline.ts';
import type { RequestContext } from '../../routes.ts';
import { REFERENCE_ANTIBODY_COUNT, REFERENCE_SOURCE } from './constants.ts';
import { FIXTURE_TARGETS } from './fixtures.ts';
import { SCORE_CAVEAT } from './score.ts';
import { DEFAULT_SETTINGS, loadAntibodyBoard, loadSettings, putProgram, saveAbNote } from './service.ts';

/** 조회 상한 — 캐시 뒤에서만 센다(§5.5). */
async function lookupGate(deps: Deps, account: AccountView): Promise<{ teamId: string; classId: string }> {
  const who = await teamMember(deps.db, account);
  const gate = deps.limits.antibodyLookupPerTeam.hit(who.teamId);
  if (!gate.ok) throw new ApiError(429, 'rate_limited', '자료 조회를 너무 자주 눌렀어요. 잠시 뒤 다시 해 주세요.', { retryAfterSec: gate.retryAfterSec });
  return who;
}

export function registerBoardRoutes(router: Router<RequestContext>, account: (ctx: RequestContext) => AccountView): void {
  router.on('GET', ANTIBODY_API.board, async (ctx) => loadAntibodyBoard(ctx.deps, account(ctx)));

  // 표적 3종 + 표적별 항체 표 + 구조 후보. 캐시 · 고정 예시로 강등된다.
  // **A1 화면이 이 경로로 표를 채운다**(화면에 표적 표를 박아 두지 않는다 · §12).
  router.on('GET', ANTIBODY_API.catalog, async (ctx): Promise<AntibodyCatalogResponse> => {
    await lookupGate(ctx.deps, account(ctx));
    const ports = ctx.deps.antibody.ports;
    const targets: AntibodyCatalogTarget[] = [];
    for (const target of FIXTURE_TARGETS) {
      let antibodies: AntibodyCatalogAntibody[] = [];
      let dataMode: AntibodyDataMode = 'fixture';
      let provenance: Provenance | null = null;
      try {
        const got = await ports.chembl.searchAntibodies(target.targetChemblId);
        antibodies = got.value.map((row) => ({
          chemblId: row.chemblId,
          name: row.name,
          firstApproval: row.firstApproval,
          maxPhase: row.maxPhase,
          maxPhaseRaw: row.maxPhaseRaw,
          withdrawn: row.withdrawn,
          hasSequence: row.hasSequence,
        }));
        dataMode = got.dataMode;
        provenance = got.provenance;
      } catch (error) {
        console.warn('[antibody] 표적 항체 목록 조회 실패 — 고정 예시만 보여요:', (error as Error).message);
      }
      targets.push({
        target: target.target,
        targetChemblId: target.targetChemblId,
        suggestedAntibody: { name: target.parentAntibodyName, chemblId: target.parentAntibodyChemblId },
        suggestedPdb: {
          pdb: target.pdb,
          resolutionAngstrom: target.resolutionAngstrom,
          sets: target.sets.map((set) => ({ set: set.set, H: set.H, ...(set.L ? { L: set.L } : {}), ...(set.AG ? { AG: set.AG } : {}) })),
        },
        antibodies,
        dataMode,
        provenance,
      });
    }
    return { targets, dataMode: ctx.deps.antibody.dataMode };
  });

  // 체인 역할 · 서열 · 해상도 · 구조 파일.
  // **1차 화면에서는 아직 부르지 않는다**(§12) — A2 · A5 의 3D 는 작업 결과에 실려 온 PDB 글을 쓰고,
  // 이 경로는 구조 파일을 직접 받아야 할 때(2차 · 선생님 화면 · 점검)를 위해 열어 둔다.
  router.on('GET', '/api/antibody/structure/:pdb', async (ctx, p) => {
    await lookupGate(ctx.deps, account(ctx));
    const pdb = (p.pdb ?? '').toUpperCase();
    if (!/^[0-9A-Z]{4}$/.test(pdb)) throw new ApiError(400, 'bad_request', '구조 번호는 네 글자예요(예: 1YY9).');
    const ports = ctx.deps.antibody.ports;
    const meta = await ports.rcsb.structureMeta([pdb]);
    const file = ctx.query.get('file') === '1' ? await ports.rcsb.structureFile(pdb) : null;
    return {
      meta: meta.value[0] ?? null,
      dataMode: meta.dataMode,
      provenance: meta.provenance,
      ...(file ? { file: { format: file.value.format, text: file.value.text, provenance: file.provenance } } : {}),
    };
  });

  // A1 확정 — version 불일치 409 stale.
  router.on('PUT', ANTIBODY_API.program, async (ctx) => putProgram(ctx.deps, account(ctx), await readJson(ctx.req)));

  // 연구 노트 — 칸별 낙관적 잠금. 409 stale 은 `error.abNote` 에 지금 칸을 싣는다.
  router.on('PUT', '/api/antibody/notes/:step/:section', async (ctx, p) =>
    saveAbNote(ctx.deps, account(ctx), p.step!, p.section!, await readJson(ctx.req)),
  );

  // '점수 계산 방법' 페이지 — 가중치 · 문턱 · 상한 · 출처. 원어 대조표는 두지 않는다(§3.5).
  router.on('GET', ANTIBODY_API.scoring, async (ctx) => {
    const who = await teamMember(ctx.deps.db, account(ctx)).catch(() => null);
    const settings = who ? await loadSettings(ctx.deps.db, who.classId) : DEFAULT_SETTINGS;
    return {
      formulaVersion: ANTIBODY_FORMULA_VERSION,
      weights: settings.weights,
      thresholds: settings.thresholds,
      caveat: SCORE_CAVEAT,
      limits: {
        esmfoldMaxResidues: ESMFOLD_MAX_RESIDUES,
        designSlotsPerPerson: DESIGN_SLOTS_PER_PERSON,
        diversityLockPercentile: DIVERSITY_LOCK_PERCENTILE,
        previewPerMinPerTeam: PREVIEW_PER_MIN_PER_TEAM,
        lookupPerMinPerTeam: LOOKUP_PER_MIN_PER_TEAM,
      },
      reference: { source: REFERENCE_SOURCE, antibodyCount: REFERENCE_ANTIBODY_COUNT },
      groups: ANTIBODY_GROUP_TITLE,
      steps: ANTIBODY_STEP_IDS.map((id) => ({
        id,
        title: ANTIBODY_STEP_META[id].title,
        question: ANTIBODY_STEP_META[id].question,
        doneWhen: ANTIBODY_STEP_META[id].doneWhen,
        evidence: ANTIBODY_STEP_META[id].evidence,
        costCrista: ANTIBODY_STEP_COST_CRISTA[id],
      })),
    };
  });
}
