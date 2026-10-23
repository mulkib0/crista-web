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
import { GROUP_TITLE, STEP_META, type BoardResponse, type StepId, type StepView } from '@crista-web/web-contract';
import { message } from '../../api.ts';
import { money } from '../../ink.ts';
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

/** 단계마다 머리 섬에 쓰는 글 — 질문(명조) · 실제 산업에서는 · 완료 조건 · 잠긴 단계 안내(무엇을 배우나 · 무엇이 필요한가). */
interface StepCopy {
  question: string;
  industry: string;
  doneWhen?: string;
  learn?: string;
  need?: string;
  /** 아직 기능이 들어오지 않은 단계의 걸음 · 도구 미리 보기(탭은 막혀 있다 — 기능이 열면 바뀐다). */
  plan?: string[];
}

export const STEP_COPY: Record<StepId, StepCopy> = {
  '1.1': {
    question: '어떤 질환의 어떤 단백질을 겨냥해야 약이 될까?',
    industry: '제약회사는 유전 · 문헌 · 약물 · 발현 근거로 “약이 될 만한 표적”을 고른다. 도킹까지 가려면 결정구조가 준비된 표적이어야 한다.',
    doneWhen: '모둠 표적 1개 확정',
  },
  '1.2': {
    question: '수많은 분자 가운데 어떤 기준으로 후보를 남길까?',
    industry: '수십만 종 라이브러리를 물성 컷오프(MW · TPSA · Ro5 · 구조 경고)로 거른 뒤 표적 점수로 줄을 세워 후보 몇십 종을 남긴다(HTVS).',
    doneWhen: '그 표적의 스크리닝 1회 이상',
  },
  '2.1': {
    question: '후보 분자는 표적의 주머니에 얼마나 단단히 붙을까?',
    industry: '후보 분자를 표적 포켓에 도킹해 결합 자유에너지(ΔG)와 상호작용 잔기를 본다. 결정 리간드(승인약)를 대조군으로 함께 놓는다.',
    doneWhen: '그 표적의 실제 도킹 근거 1건 이상',
  },
  '2.2': {
    question: '잘 붙는 분자가 몸속에서도 안전하게 일할까?',
    industry: '결합이 좋아도 흡수 · 뇌 노출 · 심장 독성(hERG) · 간독성이 나쁘면 약이 못 된다. 효능과 안전의 균형으로 리드를 고른다.',
    doneWhen: '특허 후보 1개 이상(주력 · 백업은 3.2 끝에서)',
  },
  '3.1': {
    question: '우리 분자가 새로운 물질이라고 증명할 수 있을까?',
    industry: '후보에 코드명을 붙이고 물질특허를 출원한다 — 같은 물질은 먼저 낸 쪽이 갖고, 등록된 특허는 공개된다.',
    doneWhen: '유효 특허 1건 이상',
    learn: '코드명 해부도 · 출원서 칸 쓰기 · 규칙(형식 · 신규성 · 학급 중복) + AI 심사 · 학급 특허 원장',
    need: '2.2 특허 후보 1개 이상 · 모둠당 최대 3건',
    plan: ['코드명 해부도', '출원서', '서류 심사', '학급 특허 원장'],
  },
  '3.2': {
    question: '사람에게 주기 전에, 동물로 무엇을 얼마나 적게 확인할까?',
    industry: '동물실험은 윤리위원회(IACUC)가 계획서를 심의한 뒤에만 한다 — 대체 · 감소 · 개선(3R). 결과(NOAEL)로 사람 첫 용량의 상한(MRSD)을 정한다.',
    doneWhen: '승인 계획서 + 동물실험 1건 + 주력 지정',
    learn: '3R 윤리 · 동물실험계획서 심의 · 대체 시험 · NOAEL → HED → MRSD · 주력 1 + 백업 0~1 지정',
    need: '3.1 유효 특허 1건 이상',
    plan: ['윤리 교육', '계획서 심의', '대체 시험', '동물실험', '주력 · 백업'],
  },
  '3.3': {
    question: '어떤 제형과 용량으로 첫 임상을 시작할까?',
    industry: '제형 · 시작 용량 · 환자군 · 1차 평가지표를 정해 임상시험 계획 승인(IND)을 신청한다. 시작 용량은 전임상 MRSD 를 넘지 않는다.',
    doneWhen: 'IND 승인',
    learn: '제형 · 시작 용량(≤ MRSD) · 대상 · 평가지표 → 임상시험 계획 승인 신청서 → 규칙 + AI 심사 → 접수 · 판정',
    need: '3.2 주력 지정 · 제형별 MRSD',
    plan: ['제형', 'IND 도구', '신청서', '심사 · 접수', '판정'],
  },
  '4.1': {
    question: '사람에게서도 안전하고, 효과가 있을까?',
    industry: '1상(안전) → 2상(효능) → 3상(둘 다). 보류되면 용량 · 제형을 바꾸거나 백업 후보로 다시 도전한다.',
    learn: '1상 안전 → 2상 효능 → 3상 둘 다. 보류(CRL) 뒤 재도전 3경로 — 상세 설계는 미뤘어요',
    need: '3.3 IND 승인 · 연구비',
  },
  '4.2': {
    question: '이 약을 환자에게 내놓아도 될까?',
    industry: '브랜드 이름과 포장을 정해 최종 허가를 받는다.',
    learn: '최종 심사와 허가 — 브랜드 이름 · 포장. 상세 설계는 미뤘어요',
    need: '4.1 3상 통과',
  },
};

const EVIDENCE_LABEL = { dataset: '자료 조회', compute: '실제 계산', prediction: 'AI 예측', simulation: '교육용 모의 판정' } as const;

/**
 * 머리 섬 안쪽(시안 09 '접는 머리 섬') — 기본은 접힌 한 줄: 단계 번호 배지 · 제목 · 걸음 탭(`tabs`) · 소개 펼침 단추.
 * 펴면 아래에 질문(명조) · 실제 산업에서는(왼쪽)과 눈썹 줄(묶음 · 도구 · 비용) · 결과 성격 칩(오른쪽)이 나온다.
 * 접혀 있어도 사라지면 안 되는 것 — fixture 경고 칩(한 줄 안) · 잠김 · 막힘 이유(한 줄 아래) — 은 늘 보인다.
 * 펼침은 개인 상태다 — 단계를 오가도 남게 `useLocalTab('head:open')`(sessionStorage)에 둔다.
 */
export function StepHead({ board, step, question, doneWhen, extra, tabs }: { board: BoardResponse; step: StepView; question?: string; doneWhen?: string; extra?: ReactNode; tabs?: ReactNode }) {
  const meta = STEP_META[step.id];
  const copy = STEP_COPY[step.id];
  const done = doneWhen ?? copy.doneWhen;
  const [openId, setOpenId] = useLocalTab('head:open', HEAD_OPEN, '0');
  const open = openId === '1';
  const moreId = `hd-more-${step.id.replace('.', '')}`;
  const toggle = open ? '소개 접기' : '단계 소개';
  const fixture = board.workerMode === 'fixture' && step.evidence.includes('compute');
  return (
    <div className="hd" data-open={open}>
      <div className="hd-bar">
        <span className="hd-n" aria-hidden="true">{step.id}</span>
        <h1><span className="sr">{step.id} </span>{meta.title}</h1>
        {fixture && <span className="chip test hd-test" title="워커가 fixture 모드라 실제 계산이 아닌 테스트 결과예요">테스트 결과</span>}
        {tabs}
        <button type="button" className="hd-tg" aria-expanded={open} aria-controls={moreId} aria-label={toggle} onClick={() => setOpenId(open ? '0' : '1')}>
          <span className="hd-tg-t" aria-hidden="true">{toggle}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} /></svg>
        </button>
      </div>
      {(step.state === 'locked' || step.state === 'blocked') && step.reason && (
        <p className="hint hd-hint">{step.state === 'locked' ? '🔒' : '⏸'} {step.reason}</p>
      )}
      <div className="hd-more" id={moreId} hidden={!open}>
        <div className="hd-l">
          <p className="sh-q">{question ?? copy.question}</p>
          <p className="lede">실제 산업에서는 — {copy.industry}</p>
        </div>
        <div className="hd-r">
          <p className="eyebrow">{meta.group}. {GROUP_TITLE[meta.group]} · {meta.sub}{step.costCents !== undefined ? ` · ${money(step.costCents)}` : ''}</p>
          <div className="chips">
            {step.evidence.map((e) => <span key={e} className="chip">{EVIDENCE_LABEL[e]}</span>)}
            {done && <span className="chip">완료 조건 · {done}</span>}
            {fixture && <span className="chip test">워커 fixture 모드 — 테스트 결과</span>}
            {extra}
          </div>
        </div>
      </div>
    </div>
  );
}

const HEAD_OPEN = ['0', '1'] as const;

export interface StepLayoutProps extends Pick<StepProps, 'board' | 'step'> {
  /** 머리 섬 질문 · 완료 조건을 바꿀 때(기본 `STEP_COPY`). */
  question?: string;
  doneWhen?: string;
  /** 머리 칩 줄 끝에 더 붙일 것(예: `<AiBadge />` · `<PreShakeBadge />`). */
  headExtra?: ReactNode;
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

export function StepLayout({ board, step, question, doneWhen, headExtra, tabs, tab, onTab, tabsLabel, mine, mineTitle, team, teamTitle, ratio = 'team' }: StepLayoutProps) {
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
        <StepHead board={board} step={step} question={question} doneWhen={doneWhen} extra={headExtra}
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
      <span className="note">{step.state === 'done' ? '이 단계의 완료 조건을 채웠어요.' : '완료 조건을 채우면 다음 단계가 열려요(자동 실행 · 과금 없음).'}</span>
    </div>
  );
}

/**
 * 아직 기능이 들어오지 않은 단계 · 잠긴 단계 — '무엇을 배우나 · 무엇이 필요한가' + 연구 노트 초안(설계 §5.4: 잠긴 단계도
 * 초안 · 노트는 미리 쓸 수 있다, 유료 실행 · 단계 확정만 막힌다).
 */
export function StepPreview({ board, step, note }: Pick<StepProps, 'board' | 'step'> & { note?: string }) {
  const copy = STEP_COPY[step.id];
  const NO = ['①', '②', '③', '④', '⑤', '⑥'];
  const tabs = copy.plan && [
    { id: 'about', label: '무엇을 배우나' },
    ...copy.plan.map((label, i) => ({ id: `p${i}`, no: NO[i], label, sub: '곧 열려요', disabled: true })),
  ];
  return (
    <StepLayout
      board={board}
      step={step}
      tabs={tabs}
      tab="about"
      onTab={() => {}}
      tabsLabel={`${step.id} 걸음 미리 보기`}
      mineTitle="무엇을 배우나 · 무엇이 필요한가"
      mine={
        <div className="panel lock-box">
          <b>{step.state === 'locked' ? '🔒 잠긴 단계' : '곧 열리는 단계'}{note ? ` — ${note}` : ''}</b>
          {copy.learn && <p className="mini" style={{ margin: 0 }}>무엇을 배우나 · {copy.learn}</p>}
          {copy.need && <p className="mini" style={{ margin: 0 }}>무엇이 필요한가 · {copy.need}</p>}
          <p className="mini muted" style={{ margin: 0 }}>잠긴 단계도 연구 노트 초안은 미리 쓸 수 있어요(유료 실행 · 단계 확정만 막혀 있어요).</p>
        </div>
      }
      teamTitle="모둠 공유 — 연구 노트 초안"
      team={<NotesBlock board={board} stepId={step.id} />}
    />
  );
}
