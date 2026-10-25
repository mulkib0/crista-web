/**
 * 단계 화면 공용 — 레이아웃(`StepLayout` — 머리 섬 · 내 작업대 섬 · 모둠 공유 섬 · 바닥 띠) · 머리 · 행동 상태 · 개인 작업대.
 *
 * 본문 모양은 시안 21 '둥근 섬'(설계 §5.4.1): Board 의 본문 그리드 `"side head head" "side mine team"` 에
 * 단계 화면이 섬 셋과 바닥 띠를 바로 놓는다(`StepLayout` 은 Fragment 로 돌려준다). 폰(≤ 860px)은 한 줄로 쌓는다.
 * '다음'으로 넘어가기는 2026-10-25 합의안(design/next-flow-30.html ★ — 03 + 11 + 21 + 06 · 27 + 15 + 19)을 따른다 — 글은 `next.ts`.
 *   - 다음 단계로 가는 단추는 바닥 띠 오른쪽 하나뿐이다. 단계 화면은 넘김 단추를 따로 두지 않고, 띠가 데려갈 자리(`go`)만 알려 준다.
 *   - 걸음 탭: 순서 걸음 단계는 머리 섬 사슬, 도구 단계는 작업대 머리 '보기' 토글(`FLOW`).
 *   - 공유 자료 맨 아래 연구 노트 · 문항은 한 줄로 접는다(`notes`). 앞 단계가 끝났으면 작업대 맨 위에 도착 안내(개인 상태 — 한 번 보면 접힌다).
 *
 * 기능 화면 쓰는 법(예: s12.tsx):
 *   const [tab, setTab] = useLocalTab('step:1.2', ['brief', 'meet'] as const, 'brief');   // 걸음 탭 = 개인 상태
 *   return <StepLayout {...props} tabs={[{ id: 'brief', no: '①', label: '미션 브리핑' }, …]} tab={tab} onTab={setTab}
 *            go={{ screen: { tab: 'run', spot: 'go-s12-run' } }} mine={…내 작업대…} team={<>…모둠 공유…</>} />;
 */
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { formatCrista, NOTE_SECTIONS, noteMaxCrista, STEP_META, type BoardResponse, type StepId, type StepView } from '@crista-web/web-contract';
import { message } from '../../api.ts';
import { FeedRoom, FeedUnread, StepNav } from '../feed/FeedRoom.tsx';
import { StepLearn } from '../learn/StepLearn.tsx';
import { Notes } from '../parts.tsx';
import { NextBand, useLocalTab, ViewToggle, WalkChain, type TabItem } from '../ui/index.ts';
import { arrivalOf, bandOf, FLOW, gateOf, whereOf, type Flow, type Go, type GoMap, type Wait } from './next.ts';

/** 개인 작업대 — 단계를 오가도 남도록 Board 가 들고 있다(서버로 보내지 않는다). 1.1 → 2.2 가 쓰는 값.
 *  새 기능은 여기를 늘리지 말고 `useBenchState('s12:…', 초기값)` 으로 자기 값을 든다(파일을 나눠 쓰려고). */
export interface Bench {
  diseaseId: string | null;
  pickNote: string;
  screen: { maxMw: number; maxTpsa: number; ro5Only: boolean; excludeAlerts: boolean; library: string };
  smiles: string;
  label: string;
  parentJobId: string | null;
  admetFrom: string;
}

export const initialBench = (): Bench => ({
  diseaseId: null,
  pickNote: '',
  screen: { maxMw: 500, maxTpsa: 90, ro5Only: false, excludeAlerts: true, library: '' },
  smiles: '',
  label: '',
  parentJobId: null,
  admetFrom: '',
});

export interface StepProps {
  board: BoardResponse;
  step: StepView;
  bench: Bench;
  setBench: (fn: (b: Bench) => Bench) => void;
  reload: () => void;
  goStep: (id: StepId) => void;
}

/**
 * 머리 섬 안쪽 — 한 줄: 단계 번호 배지 · 제목 · fixture 경고 칩 · 걸음 사슬(`tabs`). 막힘(연구비 부족) 이유는 한 줄 아래에 보인다.
 * 질문 · '실제 산업에서는' · 완료 조건 · 결과 성격 칩을 펴던 '단계 소개'는 2026-10-24 사용자 지시로 뺐다(설명 덩어리 · 배지 삭제).
 * 잠김 이유는 바닥 띠 단추가 말한다('‹ 1.1에서 모둠 표적 확정부터' — 2026-10-25 합의안 11).
 */
export function StepHead({ board, step, tabs }: { board: BoardResponse; step: StepView; tabs?: ReactNode }) {
  const meta = STEP_META[step.id];
  const fixture = board.workerMode === 'fixture' && step.evidence.includes('compute');
  return (
    <div className="hd">
      <div className="hd-bar">
        <span className="hd-n" aria-hidden="true">{step.id}</span>
        <h1><span className="sr">{step.id} </span>{meta.title}</h1>
        {fixture && <span className="chip test hd-test" title="워커가 fixture 모드라 실제 계산이 아닌 테스트 결과예요">테스트 결과</span>}
        {tabs}
      </div>
      {step.state === 'blocked' && step.reason && <p className="hint hd-hint">⏸ {step.reason}</p>}
    </div>
  );
}

export interface StepLayoutProps extends Pick<StepProps, 'board' | 'step'> {
  /** 걸음 · 도구 탭 — 순서 걸음 단계는 머리 섬 사슬, 도구 단계는 작업대 머리 보기 토글(`FLOW`). 탭 값은 개인 상태(`useLocalTab`). */
  tabs?: TabItem[];
  tab?: string;
  onTab?: (id: string) => void;
  tabsLabel?: string;
  /** 왼쪽 '내 작업대' 섬(개인 · 무료). 없으면 모둠 공유 섬이 두 열을 쓴다. */
  mine?: ReactNode;
  /** 오른쪽 '모둠 공유' 섬의 '공유 자료'(서버 저장 · 실시간). 섬은 늘 대화(대화 · 행적)이고, 이것은 그 옆 패널로 편다.
   *  맨 위에 그 단계의 요약(들고 갈 것)을 두고, 연구 노트 · 문항 접힌 줄은 `StepLayout` 이 맨 아래에 붙인다(합의안 15). */
  team?: ReactNode;
  teamTitle?: ReactNode;
  /** 두 섬 폭 — 'team'(기본, 1 : 1.15) · 'even'(1 : 1) · 'mine'(1.3 : 1). */
  ratio?: 'team' | 'even' | 'mine';
  /** 띠 단추 '하러 가기'가 데려갈 자리 — 남은 일(`StepView.need` 열쇠)마다 걸음 탭 · 강조할 요소 id. */
  go?: GoMap;
  /** 기다림 글을 단계 화면이 더 잘 알 때(3.2 동물실험 D+ · 4.1 상 · 4.2 허가 심사). */
  wait?: Wait;
  /** 연구 노트 · 문항 접힌 줄(기본 예). 4.2 허가증처럼 한 섬만 쓰는 화면에서 끈다. */
  notes?: boolean;
}

/**
 * 단계 화면 레이아웃 — 섬 셋(머리 · 내 작업대 · 모둠 공유)과 바닥 띠를 Fragment 로 돌려준다. Board 의 본문 그리드가 자리를 정한다.
 * 섬 사이 · 섬 안 구역 사이에 선을 긋지 않는다(설계 §5.4.1) — 구역은 페이퍼 판(`Panel`)과 간격으로 나눈다.
 */
/** 공유 자료 제목 옆의 작은 설명 — 옛 제목의 '모둠 공유 — ' 머리말은 뗀다. 섬 큰 제목(나의 작업대 · 모둠 공유) 옆에는 설명을 달지 않는다. */
function islSub(title: ReactNode | undefined, lead: string): ReactNode {
  if (title === undefined || title === null || title === false) return null;
  let t = title;
  if (typeof t === 'string') {
    t = t === lead ? '' : t.startsWith(`${lead} — `) ? t.slice(lead.length + 3) : t;
    if (t === '') return null;
  }
  return <small>{t}</small>;
}

const SIDE = ['closed', 'open'] as const;
/** 공유 자료를 대화 옆에 나란히 둘 섬 안 폭(px). 이보다 좁으면 대화 위를 옆에서 덮는다. */
const SPLIT_MIN = 1000;

/** 요소 폭이 `min` 이상인가 — 섬 폭은 화면 폭 · 내 작업대 유무 · 비율로 바뀌어서 미디어 쿼리 대신 잰다. */
function useWide(ref: RefObject<HTMLElement | null>, min: number) {
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWide(el.clientWidth >= min);
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width >= min));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);
  return wide;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** '하러 가기' 뒤 그 자리를 잠깐 강조한다 — 라임 고리 1.6초(모션 줄이기면 멈춘 고리). */
function flash(el: HTMLElement) {
  el.classList.remove('nx-flash');
  void el.offsetWidth;
  el.classList.add('nx-flash');
  window.setTimeout(() => el.classList.remove('nx-flash'), 1700);
}

export function StepLayout({ board, step, tabs, tab, onTab, tabsLabel, mine, team, teamTitle, ratio = 'team', go, wait, notes = true }: StepLayoutProps) {
  if (freshStep !== step.id) {
    // 다른 단계로 옮겼다 — 도착 안내는 다음에 오면 접혀 있다(그리기 중 한 번만 — 같은 단계면 아무것도 하지 않는다).
    freshStep = step.id;
    fresh.clear();
  }
  const id = step.id.replace('.', '');
  const only = !mine ? 'team' : null;
  const flow: Flow = FLOW[step.id];
  const goStep = useContext(StepNav);
  // 모둠 공유 = 대화가 바탕. 공유 자료는 옆 패널로 편다 — 개인 상태(단계를 오가도 남는다), 처음엔 펴져 있다.
  const [side, setSide] = useLocalTab('team-side', SIDE, 'open');
  const shared = !!team || notes;
  const open = shared && side === 'open';
  const room = useRef<HTMLDivElement>(null);
  const split = useWide(room, SPLIT_MIN);
  const mode = open ? (split ? 'split' : 'over') : undefined;

  const walk = tabs && tabs.length > 0 && tab !== undefined && onTab ? { items: tabs, value: tab, onChange: onTab, label: tabsLabel ?? `${step.id} 걸음` } : null;
  const band = bandOf(board, step, { tabs, go, wait, flow });

  // 띠 '하러 가기' — 걸음 탭을 옮기고, 그린 뒤 그 자리(걸음 · 요소)를 찾아 보이게 하고 강조한다. 접힌 공유 자료 안이면 먼저 편다.
  const [aim, setAim] = useState<Go | null>(null);
  useEffect(() => {
    if (!aim) return;
    const spot = aim.spot ? document.getElementById(aim.spot) : null;
    if (spot?.closest('.tm-side[hidden]')) {
      setSide('open');
      return;
    }
    const walkEl = aim.tab ? document.querySelector<HTMLElement>(`[data-walk="${aim.tab}"]`) : null;
    const el = spot ?? walkEl;
    setAim(null);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    if (walkEl) flash(walkEl);
    if (spot) flash(spot);
  }, [aim, side, setSide]);

  const onBand = band.to
    ? () => {
        const to = band.to!;
        if ('step' in to) {
          goStep?.(to.step);
          return;
        }
        const g = go?.[to.need];
        if (!g) return;
        if (g.tab && onTab && g.tab !== tab) onTab(g.tab);
        setAim({ ...g });
      }
    : undefined;

  // 21 누가 열었나 — 보고 있는 사이 이 단계가 열리면 화면 낭독기에 한 번 알린다(따로 뜨는 배너 · 창은 없다).
  const was = useRef(step.state);
  const [live, setLive] = useState('');
  useEffect(() => {
    if (was.current !== 'done' && step.state === 'done') setLive(band.action.text.replace(/[→›‹]/g, '').trim());
    was.current = step.state;
  }, [step.state, band.action.text]);

  const arrive = mine ? arrivalOf(board, step) : null;
  return (
    <>
      <header className="isl isl-head" aria-label="단계 머리">
        <StepHead board={board} step={step} tabs={walk && flow === 'chain' && <WalkChain {...walk} end={gateOf(step)} />} />
      </header>
      {mine && (
        <section className={`isl isl-mine${only ? ' span' : ''}`} data-ratio={ratio} aria-labelledby={`w${id}`}>
          <h2 className="isl-h isl-big" id={`w${id}`}>나의 작업대</h2>
          {arrive && <Arrive board={board} step={step} a={arrive} onBack={() => goStep?.(arrive.from)} />}
          {walk && flow === 'view' && <ViewToggle {...walk} />}
          {mine}
        </section>
      )}
      <section className={`isl isl-team${only ? ' span' : ''}`} aria-labelledby={`t${id}`}>
        <div className="isl-hrow">
          <h2 className="isl-h isl-big team" id={`t${id}`}>모둠 공유</h2>
          {shared && (
            <button type="button" className="tm-tg" aria-expanded={open} aria-controls={`sd${id}`} onClick={() => setSide(open ? 'closed' : 'open')}>
              <span aria-hidden="true">▤</span> 공유 자료 {open ? '접기' : '펴기'}
            </button>
          )}
        </div>
        {/* 대화와 공유 자료를 둘 다 붙여 두고 가린다 — 입력 중 값 · 대화 스크롤이 폈다 접어도 남게.
            나란히(split): 대화 | 공유 자료. 덮기(over): 같은 칸에 겹쳐 공유 자료가 대화를 옆에서 덮는다(칸 높이 = 둘 중 큰 쪽). */}
        <div className="tm" ref={room} data-side={mode}>
          <div className="tm-room" inert={mode === 'over'}>
            <FeedRoom board={board} step={step} active={mode !== 'over'} />
          </div>
          {shared && (
            <aside className="tm-side" id={`sd${id}`} aria-labelledby={`sh${id}`} hidden={!open}>
              <div className="tm-sh">
                <h3 id={`sh${id}`}><span aria-hidden="true">▤</span> 공유 자료{islSub(teamTitle, '모둠 공유')}</h3>
                <button type="button" className="tm-x" onClick={() => setSide('closed')}>
                  {mode === 'over' ? <>‹ 대화로 <FeedUnread /></> : '접기 ›'}
                </button>
              </div>
              {team}
              {notes && <NotesFold board={board} stepId={step.id} />}
            </aside>
          )}
        </div>
      </section>
      <NextBand
        title={`${step.id} ${STEP_META[step.id].title}`}
        where={walk ? whereOf(flow, walk.items, walk.value) : undefined}
        action={{ ...band.action, ...(onBand ? { onClick: onBand } : {}) }}
        live={live}
      />
    </>
  );
}

/** 모둠 공유 섬 아래 — 연구 노트 3칸 + 학습 칸(연구 노트 평가 · 단계 문항 — FLEARN 이 채운다). */
export function NotesBlock({ board, stepId }: { board: BoardResponse; stepId: StepId }) {
  return (
    <div className="notes-block">
      <Notes board={board} stepId={stepId} />
      <StepLearn board={board} stepId={stepId} />
    </div>
  );
}

const FOLD = ['closed', 'open'] as const;

/**
 * 15 노트 아래 — 연구 노트 · 문항을 공유 자료 맨 아래 한 줄로 접는다: '연구 노트 · 문항 · 1/3칸 · 최대 +240,000 크리스타'.
 * 접어도 붙여 둔다(쓰던 칸 · 문항 답이 남게). 펴고 접음은 개인 상태(단계마다).
 */
function NotesFold({ board, stepId }: { board: BoardResponse; stepId: StepId }) {
  const [fold, setFold] = useLocalTab(`notes:${stepId}`, FOLD, 'closed');
  const on = fold === 'open';
  const filled = NOTE_SECTIONS.filter((s) => board.notes.some((n) => n.stepId === stepId && n.section === s && n.body.trim() !== '')).length;
  const body = `nf-${stepId.replace('.', '')}`;
  return (
    <section className="nfold" aria-label="연구 노트 · 문항">
      <button type="button" className="nfold-h" aria-expanded={on} aria-controls={body} onClick={() => setFold(on ? 'closed' : 'open')}>
        <b>연구 노트 · 문항</b>
        <span className="mono">{filled}/{NOTE_SECTIONS.length}칸 · 최대 +{formatCrista(noteMaxCrista(true))}</span>
        <i aria-hidden="true">{on ? '▴' : '▾'}</i>
      </button>
      <div id={body} hidden={!on}>
        <NotesBlock board={board} stepId={stepId} />
      </div>
    </section>
  );
}

const ARRIVE_KEY = (board: BoardResponse, stepId: StepId) => `crista.arrive.${board.team.id}.${stepId}`;
/** 이번에 처음 편 도착 안내 — 같은 단계에 머무는 동안(불러오는 중 → 본 화면처럼 섬을 다시 그려도) 펴 둔다. 다른 단계로 가면 비운다. */
const fresh = new Set<string>();
let freshStep: StepId | null = null;
function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * 19 도착 안내 — 앞 단계가 끝난 단계에 처음 들어오면 작업대 맨 위에 '가져온 것 · 여기서 열쇠' 두 줄과 '‹ 앞 단계 다시 보기'.
 * 한 번 보면 다음부터는 한 줄로 접혀 있다(개인 상태 — 이 브라우저). 저장이 막혀 있으면 이 화면에서만 기억한다.
 */
function Arrive({ board, step, a, onBack }: { board: BoardResponse; step: StepView; a: NonNullable<ReturnType<typeof arrivalOf>>; onBack: () => void }) {
  const key = ARRIVE_KEY(board, step.id);
  const [on, setOn] = useState(() => fresh.has(key) || !seen(key));
  useEffect(() => {
    if (seen(key)) return;
    fresh.add(key);
    try {
      localStorage.setItem(key, '1');
    } catch {
      // 저장이 막혀 있으면 이번만 펴 둔다.
    }
  }, [key]);
  const id = `ar-${step.id.replace('.', '')}`;
  if (!on) {
    return (
      <button type="button" className="arrive-fold" aria-expanded={false} aria-controls={id} onClick={() => setOn(true)}>
        {a.from}에서 가져온 것 · 여기서 열쇠 <i aria-hidden="true">▾</i>
      </button>
    );
  }
  return (
    <section className="arrive" id={id} aria-label={`${step.id} 도착 안내`}>
      <div className="arrive-h">
        <b>{step.id} {STEP_META[step.id].title}에 왔어요</b>
        <button type="button" className="btn sm" onClick={onBack}>‹ {a.from} 다시 보기</button>
        <button type="button" className="arrive-x" aria-label="도착 안내 접기" onClick={() => setOn(false)}>▴</button>
      </div>
      <dl>
        <div><dt>{a.from}에서 가져온 것</dt><dd>{a.carried}</dd></div>
        <div><dt>여기서 열쇠</dt><dd>{a.key}</dd></div>
      </dl>
    </section>
  );
}

/** 행동 하나의 바쁨 · 오류 — 단추 여러 개가 같이 쓴다. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

export const currentTarget = (board: BoardResponse) => board.diseases.find((d) => d.targetId === board.program.targetId) ?? null;
/** 지금 표적 버전의 작업만 — 표적을 바꿨다 돌아와도 옛 버전의 결과는 섞지 않는다. */
export const jobsOf = (board: BoardResponse, step: '1.2' | '2.1' | '2.2') => board.jobs.filter((j) => j.step === step && j.revisionId === board.program.revisionId);
