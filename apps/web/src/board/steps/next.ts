/**
 * '다음'으로 넘어가기(2026-10-25 합의안 — design/next-flow-30.html ★ · .review/2026-10-25-next-flow/) — 소분자 9단계의 띠 글 · 도착 안내.
 *
 * - 03 본문 바닥 띠 · 11 단추 문구 = 남은 일 · 21 누가 열었나: 서버가 준 `StepView.need` · `doneByName` · 상태 · 진행률을 한 줄로 옮긴다.
 *   화면은 완료를 따로 셈하지 않는다. 결정(크리스타가 나가는 실행 · 확정)은 작업 자리에 두고 띠 단추는 이동만 한다.
 * - 06 걸음 탭 이원화: 순서 걸음 단계는 머리 섬 사슬, 도구 단계는 작업대 머리 '보기' 토글(`FLOW`).
 * - 19 도착 안내: 앞 단계에서 가져온 것 · 여기서 열쇠.
 * 띠 모양은 트랙에 묶이지 않는 `board/ui` 의 `NextBand` 가 그린다 — 여기는 소분자 트랙의 글만 만든다.
 */
import { STEP_IDS, STEP_META, type BoardResponse, type StepId, type StepNeed, type StepNeedKey, type StepView } from '@crista-web/web-contract';
import type { BandAction, TabItem } from '../ui/index.ts';

/** 순서 걸음(화살표 사슬) · 나란한 도구(번호 없는 보기 토글). 3.3 의 탭 6개는 신청서 칸을 채우는 도구다(신청서 ①~⑦ 은 모둠 공유에 있다). */
export type Flow = 'chain' | 'view';
export const FLOW: Record<StepId, Flow> = {
  '1.1': 'view',
  '1.2': 'chain',
  '2.1': 'view',
  '2.2': 'view',
  '3.1': 'chain',
  '3.2': 'chain',
  '3.3': 'view',
  '4.1': 'chain',
  '4.2': 'chain',
};

/** 띠 단추 '하러 가기'가 데려갈 자리 — 걸음 · 도구 탭과 잠깐 강조할 요소 id(`go-` 접두 — 입력 칸 id 와 겹치지 않게). */
export interface Go {
  tab?: string;
  spot?: string;
}
export type GoMap = Partial<Record<StepNeedKey, Go>>;

/** 기다림 글 — 단계 화면이 더 잘 알면 넘긴다(3.2 동물실험 D+ · 4.1 상 · 4.2 허가 심사). `clock` 이면 게임 시계(멈추면 ⏸). */
export interface Wait {
  text: string;
  clock?: boolean;
}

/** 받침 있는 끝수(0 1 3 6 7 8)는 '이', 없는 끝수(2 4 5 9)는 '가' — '2.1이 열려요' · '1.2가 열려요'. */
export const iGa = (id: string): string => ('013678'.includes(id.slice(-1)) ? '이' : '가');

export const nextOf = (id: StepId): StepId | null => STEP_IDS[STEP_IDS.indexOf(id) + 1] ?? null;
export const prevOf = (id: StepId): StepId | null => STEP_IDS[STEP_IDS.indexOf(id) - 1] ?? null;
const stepName = (id: StepId) => `${id} ${STEP_META[id].title}`;
/** 게임 시계 기다림 — 'D+14 / 28'. */
export const days = (pct: number, of: number) => `D+${Math.round((pct / 100) * of)} / ${of}`;

/** 작업 단계(1.2 · 2.1 · 2.2 · 3.2)의 지금 진행률 — 소식(`job.progress`)이 고친 작업 줄에서 읽는다(단계 줄은 다시 읽을 때만 바뀐다). */
function livePct(board: BoardResponse, step: StepView): number {
  const active = board.jobs.filter((j) => j.step === step.id && j.revisionId === board.program.revisionId && (j.status === 'queued' || j.status === 'running'));
  return active.length ? Math.round(Math.max(...active.map((j) => j.progress)) * 100) : (step.progressPct ?? 0);
}

/** 진행 중 · 기다림 — 계산은 %, 게임 시계는 D+n / 기간. */
function waitOf(board: BoardResponse, step: StepView): Wait {
  const pct = livePct(board, step);
  const who = step.byName ? `${step.byName} 님 ` : '';
  const of = step.durationGameDays;
  switch (step.id) {
    case '1.2':
      return { text: `${who}스크리닝 계산 중 ${pct}%` };
    case '2.1':
      return { text: `${who}도킹 계산 중 ${pct}%` };
    case '2.2':
      return { text: `${who}ADMET 계산 중 ${pct}%` };
    case '3.1':
      return { text: '출원서 심사 중' };
    case '3.2':
      return { text: `${who}실험 진행 중 ${pct}%`, clock: true };
    case '3.3':
      return step.progressPct !== undefined && of ? { text: `IND 심사 ${days(step.progressPct, of)}`, clock: true } : { text: '신청서 서류 심사 중' };
    case '4.1':
      return { text: step.sub ?? `임상 ${pct}%`, clock: true };
    case '4.2':
      return step.progressPct !== undefined && of ? { text: `허가 심사 ${days(step.progressPct, of)}`, clock: true } : { text: '신청서 서류 심사 중' };
    default:
      return { text: `${pct}%` };
  }
}
/** 이 기다림이 끝나면 마지막 남은 일이 채워지나(띠에 '· 끝나면 2.1'을 붙인다). */
const WAIT_OPENS: readonly StepId[] = ['1.2', '2.1', '3.1', '3.3', '4.2'];

export interface Band {
  action: Omit<BandAction, 'onClick'>;
  /** 누르면 — 다른 단계로 · 이 단계의 남은 일 자리로. */
  to: { step: StepId } | { need: StepNeedKey } | null;
}

/**
 * 띠 단추 하나(합의안 11 · 21) — 잠김 '‹ 1.1에서 모둠 표적 확정부터' · 할 일 '③ 스크리닝 1회 하면 2.1이 열려요 · 하러 가기 ›' ·
 * 기다림 '나래 님 스크리닝 계산 중 62% · 끝나면 2.1' · 열림 '가람 님이 열었어요 · 2.1 분자 도킹 →' · 끝 '✓ 품목 허가 · 파이프라인 완주'.
 */
export function bandOf(board: BoardResponse, step: StepView, o: { tabs?: TabItem[]; go?: GoMap; wait?: Wait; flow: Flow }): Band {
  const next = nextOf(step.id);
  const need = step.need ?? [];
  const open = need.filter((n) => !n.done);
  const first: StepNeed | undefined = open[0];
  const no = (n: StepNeed | undefined) => {
    const tab = n && o.go?.[n.key]?.tab;
    const item = tab && o.flow === 'chain' ? o.tabs?.find((t) => t.id === tab) : undefined;
    return item?.no ? `${item.no} ` : '';
  };
  const goNeed = (n: StepNeed | undefined) => (n && o.go?.[n.key] ? { need: n.key } : null);

  if (step.state === 'done') {
    // 이름을 모를 때(심사 · 게임 시계가 끝낸 단계)는 마지막 조건 하나만 — '✓ 3상 통과 · 4.2 최종 허가 →'.
    const what = need.at(-1)?.label ?? '';
    if (!next) return { action: { tone: 'end', text: `✓ ${what || STEP_META[step.id].title} · 파이프라인 완주` }, to: null };
    return {
      action: step.doneByName
        ? { tone: 'go', text: `${step.doneByName} 님이 열었어요 · ${stepName(next)} →`, by: step.doneByName }
        : { tone: 'go', text: `✓ ${what} · ${stepName(next)} →` },
      to: { step: next },
    };
  }
  if (step.state === 'locked') {
    // 잠김은 바로 앞 단계가 아니라 지금 모둠이 서 있는 단계(처음 끝나지 않은 단계)로 데려간다.
    const front = board.steps.find((s) => s.state !== 'done' && s.state !== 'locked') ?? board.steps.find((s) => s.state !== 'done');
    if (!front || front.id === step.id) return { action: { tone: 'lock', text: step.reason ?? '앞 단계를 먼저 마쳐야 해요' }, to: null };
    const n = front.need?.find((x) => !x.done);
    return { action: { tone: 'lock', text: `‹ ${front.id}에서 ${n ? `${n.label}부터` : `${STEP_META[front.id].title}부터`}` }, to: { step: front.id } };
  }
  if (step.state === 'running') {
    const w = o.wait ?? waitOf(board, step);
    const tail = next && open.length === 1 && WAIT_OPENS.includes(step.id) ? ` · 끝나면 ${next}` : '';
    return { action: { tone: 'run', text: `${w.clock && board.clock.paused ? '⏸ ' : ''}${w.text}${tail}` }, to: goNeed(first) };
  }
  if (!first) return { action: { tone: 'todo', text: STEP_META[step.id].title }, to: null };
  const opens = next ? `${next}${iGa(next)} 열려요` : '완주예요';
  const go = goNeed(first) ? ' · 하러 가기 ›' : '';
  const text = open.length === 1 ? `${no(first)}${first.ask} ${opens}${go}` : `${no(first)}${first.label}부터 · 남은 일 ${open.length}개${go}`;
  return { action: { tone: 'todo', text }, to: goNeed(first) };
}

/** 띠 왼쪽 둘째 줄 — 순서 걸음은 '걸음 2/4 · ② 모둠 기준 회의', 도구는 '보기 · 수심계 눈금'. */
export function whereOf(flow: Flow, tabs: TabItem[] | undefined, tab: string | undefined): string | undefined {
  if (!tabs?.length || tab === undefined) return undefined;
  const i = tabs.findIndex((t) => t.id === tab);
  const cur = tabs[i];
  if (!cur) return undefined;
  return flow === 'chain' ? `걸음 ${i + 1}/${tabs.length} · ${cur.no ? `${cur.no} ` : ''}${cur.label}` : `보기 · ${cur.label}`;
}

/** 사슬 끝(표시만 — 누를 수 없다) — '2.1 🔒' · '2.1 열림'. 마지막 단계는 없다. */
export function gateOf(step: StepView): { text: string; open: boolean } | undefined {
  const next = nextOf(step.id);
  if (!next) return undefined;
  return step.state === 'done' ? { text: `${next} 열림`, open: true } : { text: `${next} 🔒`, open: false };
}

/** 19 도착 안내 — 앞 단계에서 가져온 것(모둠 화면 한 장에 있는 값만) · 여기서 열쇠. 앞 단계가 끝나지 않았으면 없다. */
export function arrivalOf(board: BoardResponse, step: StepView): { from: StepId; carried: string; key: string } | null {
  const from = prevOf(step.id);
  const prev = from ? board.steps.find((s) => s.id === from) : undefined;
  if (!from || prev?.state !== 'done') return null;
  const target = board.diseases.find((d) => d.targetId === board.program.targetId) ?? null;
  const done = (id: '1.2' | '2.1' | '2.2') => board.jobs.filter((j) => j.step === id && j.status === 'succeeded' && j.revisionId === board.program.revisionId);
  let carried: string | null = null;
  if (step.id === '1.2' && target) carried = `표적 ${target.gene} · ${target.label}`;
  if (step.id === '2.1') carried = `찜 ${board.claims.length}개${target ? ` · 대조군 ${target.referenceLigand.name}` : ''}`;
  if (step.id === '2.2') {
    const runs = done('2.1');
    const best = Math.min(...runs.map((j) => j.affinityKcal ?? 0));
    carried = `도킹 ${runs.length}건${runs.length && best < 0 ? ` · 최고 ΔG ${best.toFixed(2)} kcal/mol` : ''}`;
  }
  if (step.id === '3.1') carried = `ADMET ${done('2.2').length}건 · 특허 후보 지정`;
  if (step.id === '3.3' && board.program.lead) carried = `주력 ${board.program.lead.label ?? board.program.lead.smiles.slice(0, 24)}`;
  const key = (step.need ?? []).map((n) => n.label).join(' · ');
  const next = nextOf(step.id);
  return {
    from,
    carried: carried ?? (prev.need ?? []).map((n) => `✓ ${n.label}`).join(' · '),
    key: next ? `${key} → ${next} 열림` : `${key} → 파이프라인 완주`,
  };
}
