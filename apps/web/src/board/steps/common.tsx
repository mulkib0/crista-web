/**
 * 단계 화면 공용 — 레이아웃(`StepLayout` — 머리 섬 · 내 작업대 섬 · 모둠 공유 섬) · 머리 · 다음 단계 · 행동 상태 · 개인 작업대.
 *
 * 본문 모양은 시안 21 '둥근 섬'(설계 §5.4.1): Board 의 본문 그리드 `"side head head" "side mine team"` 에
 * 단계 화면이 섬 셋을 바로 놓는다(`StepLayout` 은 섬 셋을 Fragment 로 돌려준다). 폰(≤ 860px)은 한 줄로 쌓는다.
 *
 * 기능 화면 쓰는 법(예: s12.tsx):
 *   const [tab, setTab] = useLocalTab('step:1.2', ['brief', 'meet'] as const, 'brief');   // 걸음 탭 = 개인 상태
 *   return <StepLayout {...props} tabs={[{ id: 'brief', no: '①', label: '미션 브리핑' }, …]} tab={tab} onTab={setTab}
 *            mine={…내 작업대…} team={<>…모둠 공유…<NotesBlock board={board} stepId="1.2" /><Next … /></>} />;
 */
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { STEP_META, type BoardResponse, type StepId, type StepView } from '@crista-web/web-contract';
import { message } from '../../api.ts';
import { FeedRoom, FeedUnread } from '../feed/FeedRoom.tsx';
import { StepLearn } from '../learn/StepLearn.tsx';
import { Notes } from '../parts.tsx';
import { HeadTabs, useLocalTab, type TabItem } from '../ui/index.ts';

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
 * 머리 섬 안쪽 — 한 줄: 단계 번호 배지 · 제목 · fixture 경고 칩 · 걸음 탭(`tabs`). 잠김 · 막힘 이유는 한 줄 아래에 늘 보인다.
 * 질문 · '실제 산업에서는' · 완료 조건 · 결과 성격 칩을 펴던 '단계 소개'는 2026-10-24 사용자 지시로 뺐다(설명 덩어리 · 배지 삭제).
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
      {(step.state === 'locked' || step.state === 'blocked') && step.reason && (
        <p className="hint hd-hint">{step.state === 'locked' ? '🔒' : '⏸'} {step.reason}</p>
      )}
    </div>
  );
}

export interface StepLayoutProps extends Pick<StepProps, 'board' | 'step'> {
  /** 걸음 · 도구 탭 — 머리 섬 한 줄 오른쪽(폰은 그 아래 한 줄). 탭 값은 개인 상태(`useLocalTab`). */
  tabs?: TabItem[];
  tab?: string;
  onTab?: (id: string) => void;
  tabsLabel?: string;
  /** 왼쪽 '내 작업대' 섬(개인 · 무료). 없으면 모둠 공유 섬이 두 열을 쓴다. */
  mine?: ReactNode;
  mineTitle?: ReactNode;
  /** 오른쪽 '모둠 공유' 섬의 '공유 자료'(서버 저장 · 실시간). 섬은 늘 대화(대화 · 행적)이고, 이것은 그 옆 패널로 편다. 없으면 펴기 단추도 없다. */
  team?: ReactNode;
  teamTitle?: ReactNode;
  /** 두 섬 폭 — 'team'(기본, 1 : 1.15) · 'even'(1 : 1) · 'mine'(1.3 : 1). */
  ratio?: 'team' | 'even' | 'mine';
}

/**
 * 단계 화면 레이아웃 — 섬 셋(머리 · 내 작업대 · 모둠 공유)을 Fragment 로 돌려준다. Board 의 본문 그리드가 자리를 정한다.
 * 섬 사이 · 섬 안 구역 사이에 선을 긋지 않는다(설계 §5.4.1) — 구역은 페이퍼 판(`Panel`)과 간격으로 나눈다.
 */
/** 섬 큰 제목 옆의 작은 설명 — 옛 제목의 '내 작업대 — ' · '모둠 공유 — ' 머리말과 '나만 보여요' 단독 문구는 뗀다. */
function islSub(title: ReactNode | undefined, lead: string): ReactNode {
  if (title === undefined || title === null || title === false) return null;
  let t = title;
  if (typeof t === 'string') {
    t = t === lead ? '' : t.startsWith(`${lead} — `) ? t.slice(lead.length + 3) : t;
    if (t === '나만 보여요' || t === '') return null;
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

export function StepLayout({ board, step, tabs, tab, onTab, tabsLabel, mine, mineTitle, team, teamTitle, ratio = 'team' }: StepLayoutProps) {
  const id = step.id.replace('.', '');
  const only = !mine ? 'team' : null;
  // 모둠 공유 = 대화가 바탕. 공유 자료는 옆 패널로 편다 — 개인 상태(단계를 오가도 남는다), 처음엔 접혀 있다.
  const [side, setSide] = useLocalTab('team-side', SIDE, 'closed');
  const open = !!team && side === 'open';
  const room = useRef<HTMLDivElement>(null);
  const split = useWide(room, SPLIT_MIN);
  const mode = open ? (split ? 'split' : 'over') : undefined;
  return (
    <>
      <header className="isl isl-head" aria-label="단계 머리">
        <StepHead board={board} step={step}
          tabs={tabs && tabs.length > 0 && tab !== undefined && onTab && (
            <HeadTabs items={tabs} value={tab} onChange={onTab} label={tabsLabel ?? `${step.id} 걸음`} />
          )} />
      </header>
      {mine && (
        <section className={`isl isl-mine${only ? ' span' : ''}`} data-ratio={ratio} aria-labelledby={`w${id}`}>
          <h2 className="isl-h isl-big" id={`w${id}`}>나의 작업대{islSub(mineTitle, '내 작업대')}</h2>
          {mine}
        </section>
      )}
      <section className={`isl isl-team${only ? ' span' : ''}`} aria-labelledby={`t${id}`}>
        <div className="isl-hrow">
          <h2 className="isl-h isl-big team" id={`t${id}`}>모둠 공유<small>대화 · 행적</small></h2>
          {team && (
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
          {team && (
            <aside className="tm-side" id={`sd${id}`} aria-labelledby={`sh${id}`} hidden={!open}>
              <div className="tm-sh">
                <h3 id={`sh${id}`}><span aria-hidden="true">▤</span> 공유 자료{islSub(teamTitle, '모둠 공유')}</h3>
                <button type="button" className="tm-x" onClick={() => setSide('closed')}>
                  {mode === 'over' ? <>‹ 대화로 <FeedUnread /></> : '접기 ›'}
                </button>
              </div>
              {team}
            </aside>
          )}
        </div>
      </section>
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

/** 다음 단계로 — 초안만 넘긴다(자동 실행 · 과금 없음, 설계 §5.4). */
export function Next({ step, goStep, label }: { step: StepView; goStep: (id: StepId) => void; label: StepId }) {
  return (
    <div className="next acts">
      <button className="btn" type="button" onClick={() => goStep(label)} disabled={step.state !== 'done'}>
        다음 단계로 — {label} {STEP_META[label].title} →
      </button>
      <span className="note">{step.state === 'done' ? '이 단계의 완료 조건을 채웠어요.' : '완료 조건을 채우면 다음 단계가 열려요.'}</span>
    </div>
  );
}
