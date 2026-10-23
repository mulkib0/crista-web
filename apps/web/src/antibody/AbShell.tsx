/**
 * 항체 랩 둥근 섬 틀(설계 §11.2) — **새 CSS 를 만들지 않아요.** `styles.css` 의 `.shell` · `.top` · `.co` · `.bd-body` · `.isl` ·
 * `.side` · `.grp` · `.st` 를 그대로 쓰고, 위 띠 · LED 띠 · 연구비 칩 · 순위 단추는 **8b 부품을 `import`** 해요.
 *
 * - §6.1 의 `TopBar.tsx` · `LedBoard.tsx` · `Sidebar.tsx` · `HeadIsland.tsx` 를 따로 만들지 않아요(§11.5 — 삭제된 항목).
 * - A1~A6 은 섬 세 개를 `{head, mine, team}` 으로 돌려줘요 — 8b 가 `StepRegistry` 를 내놓으면 이 파일을 버리고 그 등록표에
 *   그대로 끼울 수 있게 한 모양이에요(§11.2).
 * - 스타트업 이름은 **읽기 전용**이에요(§6.1) — 이름 고치기는 저분자 위 띠 · 사옥 지구에서만 해요.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  ANTIBODY_GROUP_TITLE,
  ANTIBODY_STEP_IDS,
  ANTIBODY_STEP_META,
  centsToCrista,
  NOTE_MAX,
  NOTE_SECTION_LABEL,
  NOTE_SECTIONS,
  type AntibodyBoardResponse,
  type AntibodyStepId,
  type AntibodyStepView,
  type BoardResponse,
  type MeResponse,
  type NoteSection,
} from '@crista-web/web-contract';
import { GrantChip } from '../board/learn/GrantChip.tsx';
import { PitchButton } from '../board/learn/PitchButton.tsx';
import { LedBand } from '../board/market/LedBand.tsx';
import { RankButton } from '../board/market/RankButton.tsx';
import { By } from '../board/parts.tsx';
import { DocSectionEditor, STATE_MARK, STATE_WORD } from '../board/ui/index.ts';
import { balanceText } from '../board/view.ts';
import { ink } from '../ink.ts';
import { DATA_MODE_WORD } from './terms.ts';

const GROUPS = [1, 2, 3, 4] as const;

/** 폰 알약에 넣는 **짧은** 상태 글자 — 긴 설명은 넓은 화면의 `.st-s` 가 맡아요(§6.2). */
const SHORT_STATE: Record<AntibodyStepView['state'], string> = {
  done: '완료',
  running: '진행',
  ready: '지금',
  locked: '잠김',
  held: '보류',
  blocked: '막힘',
  review: '다시',
};

/**
 * 공용 위 띠 부품은 저분자 `BoardResponse` 를 받아요(그 파일들은 **고치지 않는 파일**이에요). 그래서 항체 응답으로
 * 같은 모양을 **만들어 넘겨요** — 억지 형변환 없이 모든 칸을 채우고, 항체에 없는 칸은 빈 목록이에요.
 * 두 랩이 한 회사 · 한 원장을 쓰니 잔액 · 회사 · 학급은 그대로 맞아요(§1.1).
 */
function asBoardShim(ab: AntibodyBoardResponse, me: MeResponse): BoardResponse {
  return {
    account: me.account,
    avatar: me.avatar ?? null,
    class: me.class ?? { id: ab.team.classId, name: '우리 학급', teamCount: ab.valuation.of, assignment: 'walk-in', maxStudents: 24, teamCapacity: 4, studentCount: ab.team.memberCount },
    team: ab.team,
    members: [],
    program: { revisionId: ab.program.revisionId, revisionNo: ab.program.revisionNo, diseaseId: null, targetId: null, targetSetByName: null, lead: null, backup: null, leadSetByName: null, leadVersion: 0 },
    balanceCents: ab.balanceCents,
    balanceCrista: centsToCrista(ab.balanceCents),
    clock: { gameDay: 0, paused: true, rate: 0, asOf: new Date(0).toISOString() },
    maxPatentsPerTeam: 0,
    steps: [],
    jobs: [],
    claims: [],
    picks: [],
    notes: [],
    teams: ab.team.startupName && ab.team.ticker ? [{ id: ab.team.id, plot: ab.team.plot, ink: ab.team.ink, startupName: ab.team.startupName, ticker: ab.team.ticker, hqTier: ab.team.hqTier, isMine: true }] : [],
    diseases: [],
    costs: { '1.2': 0, '2.1': 0, '2.2': 0, '3.2': 0 },
    workerMode: null,
  };
}

export interface AbIslandsProps {
  head: ReactNode;
  mine: ReactNode;
  team: ReactNode;
  /** 두 섬 폭 — 기본 1 : 1.15. */
  ratio?: 'team' | 'even' | 'mine';
}

/**
 * 섬 세 개(머리 · 내 작업대 · 모둠 공유)를 Fragment 로 돌려줘요 — 자리는 본문 그리드가 정해요.
 * A1~A6 은 이 부품만 쓰고 `AbShell` 을 모르는 채로 있어요(§11.2 — 8b 의 `StepRegistry` 가 오면 그대로 끼워요).
 */
export function AbIslands({ head, mine, team, ratio = 'team' }: AbIslandsProps) {
  return (
    <>
      <header className="isl isl-head" aria-label="단계 머리">{head}</header>
      <section className="isl isl-mine" data-ratio={ratio} aria-labelledby="ab-mine-h">
        <h2 className="isl-h" id="ab-mine-h">내 작업대 — 나만 보여요</h2>
        {mine}
      </section>
      <section className="isl isl-team" aria-labelledby="ab-team-h">
        <h2 className="isl-h team" id="ab-team-h">모둠 공유</h2>
        {team}
      </section>
    </>
  );
}

export interface AbShellProps {
  board: AntibodyBoardResponse;
  me: MeResponse;
  current: AntibodyStepId;
  goStep: (id: AntibodyStepId) => void;
  /** 섬 세 개 — 단계 화면(`<A3 … />`)이 `AbIslands` 로 바로 놓아요. */
  children: ReactNode;
  /** 연습용 고정 자료를 보고 있나(`?mock=1`) — 숨기지 않고 띠로 알려요. */
  mock: boolean;
  onLabs: () => void;
  onDistrict: () => void;
  onLogout: () => void;
  error?: string | null;
}

export function AbShell({ board, me, current, goStep, children, mock, onLabs, onDistrict, onLogout, error }: AbShellProps) {
  const body = useRef<HTMLDivElement>(null);
  const shim = asBoardShim(board, me);
  const color = ink(board.team.ink);

  // 사이드바 섬(sticky)이 본문보다 길어지지 않게 높이를 CSS 변수로 알려 줘요(저분자 화면과 같은 방법).
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty('--bd-h', `${el.clientHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="shell ab-shell">
      <header className="top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8M22.8 16.8A6 6 0 1 0 22.8 23.2" />
          </svg>
          CRISTA <small>항체 설계 랩</small>
        </div>
        <div className="co">
          <i className="inkd" style={{ background: color.base }} aria-hidden="true" />
          <b title={board.team.slogan ?? undefined}>{board.team.startupName ?? '이름 없는 회사'}</b>
          <span className="tick">{board.team.ticker ?? '—'}</span>
        </div>
        <div className="top-r">
          <RankButton board={shim} />
          <div className="kv cash">
            <span>연구비</span>
            <b>{balanceText(shim)}</b>
          </div>
          <GrantChip board={shim} />
          <PitchButton board={shim} />
          <button className="btn sm" type="button" onClick={onLabs}>랩 고르기</button>
          <button className="btn sm" type="button" onClick={onDistrict}>사옥 지구</button>
          <button className="btn sm ghost" type="button" onClick={onLogout}>나가기</button>
        </div>
      </header>

      <LedBand board={shim} />

      {/* 공용 LED 띠는 학급 설립 등기 소식이에요(FMARKET 이 서버 피드로 바꿔요 · §1.1) — 항체 랩 소식은 이 줄에 적어요. */}
      <p className="ab-news">
        <b>항체 랩 소식</b>
        {board.news.length === 0 ? <span className="muted">아직 소식이 없어요</span> : board.news.slice(0, 4).map((n) => (
          <span key={n.seq}>{n.headline}{n.changePct !== undefined ? ` (${n.changePct > 0 ? '+' : ''}${n.changePct}%)` : ''}</span>
        ))}
      </p>

      {mock && (
        <p className="ab-news" role="status">
          <b>연습 모드</b>
          <span>지금은 <b>연습용 고정 자료</b>를 보고 있어요 — 숫자는 실제 계산이 아니에요. 주소에서 <b className="mono">?mock=1</b> 을 빼면 실제 자료로 돌아가요.</span>
        </p>
      )}

      <div className="bd-body ab-body" ref={body}>
        <nav className="isl side" aria-label="항체 설계 단계">
          <p className="side-h">{board.team.startupName ?? '우리 회사'} · 항체 설계 랩</p>
          <div className="side-groups">
            {GROUPS.map((g) => {
              const items = board.steps.filter((s) => s.group === g);
              if (items.length === 0) return null;
              const done = items.filter((s) => s.state === 'done').length;
              return (
                <div key={g} className="grp">
                  <p className="grp-h"><b>{g}</b> {ANTIBODY_GROUP_TITLE[g]} <span>{done}/{items.length}</span></p>
                  <ol className="steps">
                    {items.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="st"
                          data-state={s.state}
                          aria-current={s.id === current ? 'step' : undefined}
                          onClick={() => goStep(s.id)}
                          title={s.reason}
                        >
                          <span className="st-n">{s.id}</span>
                          <span className="st-t">{ANTIBODY_STEP_META[s.id].title}</span>
                          {/* 기호는 화면 낭독기가 읽지 않게 하고 상태는 글자로 읽혀요(§6.2). */}
                          <span className="st-k" aria-hidden="true">{STATE_MARK[s.state]}</span>
                          <span className="sr">{STATE_WORD[s.state]}</span>
                          {/* 폰에서는 알약이 좁아 긴 설명(`.st-s`)이 숨어요 — 짧은 상태 글자를 따로 둬서
                              기호만 남는 일(특히 '할 수 있음' 은 기호가 빈 글자예요)을 막아요(§12). */}
                          <span className="st-p" aria-hidden="true">{SHORT_STATE[s.state]}</span>
                          <span className="st-s">
                            {s.state === 'running' ? `${s.byName ? `${s.byName} · ` : ''}${s.progressPct ?? 0}%` : s.state === 'done' || s.state === 'ready' ? STATE_WORD[s.state] : (s.reason ?? STATE_WORD[s.state])}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
          <div className="side-foot">
            <span>자료 · {DATA_MODE_WORD[board.dataMode]}</span>
            <span>모둠 작업 {board.teamQuota.running}/{board.teamQuota.max} · 내 설계 칸 {board.myQuota.designs.used}/{board.myQuota.designs.max}</span>
            <div className="side-team" aria-label="나">
              <By name={me.account.displayName} avatar={me.avatar ?? null} />
            </div>
            <span>선택 기능 · 딥러닝 설계 {board.optional.proteinmpnn ? '켜짐' : '꺼짐'} · 복합체 예측 {board.optional.boltz ? '켜짐' : '꺼짐'}</span>
          </div>
        </nav>

        {children}
      </div>
      {error && <p className="err bd-err" role="alert">{error}</p>}
    </div>
  );
}

/**
 * 연구 노트 3칸 — 공용 `DocSectionEditor`(1초 자동 저장 · 409 stale 병합)를 그대로 써요(§11.1 — 편집기를 새로 만들지 않아요).
 * 항체 노트의 409 `stale` 은 `error.abNote` 에 지금 칸이 실려 와요(§5.5) — `staleOf` 로 그걸 꺼내요.
 * 잠긴 단계에서도 미리 쓸 수 있어요(§2.2).
 */
export function AbNotes({ board, stepId, myName, save }: {
  board: AntibodyBoardResponse;
  stepId: AntibodyStepId;
  myName: string;
  save: (stepId: AntibodyStepId, section: NoteSection, body: string, version: number) => Promise<{ version: number }>;
}) {
  return (
    <div className="panel">
      <h3 className="ptitle">연구 노트 <small>칸마다 따로 저장 · 모둠 공유</small></h3>
      <div className="notes">
        {NOTE_SECTIONS.map((section) => {
          const remote = board.notes.find((n) => n.stepId === stepId && n.section === section);
          return (
            <DocSectionEditor
              key={`${board.program.revisionId}-${stepId}-${section}`}
              id={`abn-${stepId}-${section}`}
              label={NOTE_SECTION_LABEL[section]}
              value={remote ? { body: remote.body, version: remote.version, byName: remote.byName, avatar: remote.avatar } : null}
              save={(body, expectedVersion) => save(stepId, section, body, expectedVersion)}
              staleOf={(e) => {
                const ab = e.detail?.abNote;
                return ab ? { body: ab.body, byName: ab.byName, version: ab.version } : { body: '', byName: null, version: 0 };
              }}
              myName={myName}
              maxLength={NOTE_MAX}
              placeholder={NOTE_PLACEHOLDER[section]}
            />
          );
        })}
      </div>
    </div>
  );
}

const NOTE_PLACEHOLDER: Record<NoteSection, string> = {
  why: '이 선택의 가설과 근거는 무엇인가요?',
  unknown: '아직 모르는 것 · 한계는 무엇인가요?',
  fallback: '실패하면 무엇을 바꿀까요?',
};

/** 다음 단계로 — 초안만 넘겨요(자동 실행 · 과금 없음). */
export function AbNext({ step, goStep }: { step: AntibodyStepView; goStep: (id: AntibodyStepId) => void }) {
  const order = ANTIBODY_STEP_IDS;
  const next = order[order.indexOf(step.id) + 1];
  if (!next) return null;
  return (
    <div className="next acts">
      <button className="btn" type="button" onClick={() => goStep(next)} disabled={step.state !== 'done'}>
        다음 단계로 — {next} {ANTIBODY_STEP_META[next].title} →
      </button>
      <span className="note">{step.state === 'done' ? '이 단계의 완료 조건을 채웠어요.' : '완료 조건을 채우면 다음 단계가 열려요(자동 실행 · 과금 없음).'}</span>
    </div>
  );
}

/** 잠긴 단계 — 무엇을 배우나 · 무엇이 필요한가 + 노트 초안(§2.2). */
export function AbLocked({ step }: { step: AntibodyStepView }) {
  const meta = ANTIBODY_STEP_META[step.id];
  return (
    <div className="panel lock-box">
      <b>🔒 잠긴 단계 — {meta.title}</b>
      <p className="mini" style={{ margin: 0 }}>무엇을 배우나 · {meta.question}</p>
      <p className="mini" style={{ margin: 0 }}>무엇이 필요한가 · {step.reason ?? `${step.unlockBy ?? '앞 단계'} 를 먼저 끝내요`}</p>
      <p className="mini muted" style={{ margin: 0 }}>잠긴 단계도 연구 노트 초안은 미리 쓸 수 있어요(유료 실행 · 단계 확정만 막혀 있어요).</p>
    </div>
  );
}

/** 머리 섬 안쪽 — 큰 단계 번호 · 눈썹 줄(묶음 · 출처 · 비용) · 제목 · 질문(명조) · 결과의 성격 칩. `.sh` 모양을 그대로 써요. */
export function AbHead({ id, cost, chips, extra }: { id: AntibodyStepId; cost?: string; chips?: ReactNode; extra?: ReactNode }) {
  const meta = ANTIBODY_STEP_META[id];
  return (
    <div className="sh">
      <div className="sh-n" aria-hidden="true">{id}</div>
      {/* 눈썹 줄에는 **묶음 이름만** 둬요 — 노트북 쪽 말('PART0 · 셀 3 · 5 · 7')은 학생에게 뜻이 없어서
          아래 접히는 상세로 내렸어요(§6.6 — 원어 · 원전 표기는 배지 상세와 '점수 계산 방법'에만 · §12). */}
      <p className="eyebrow">{meta.group}. {ANTIBODY_GROUP_TITLE[meta.group]}{cost ? ` · ${cost}` : ''}</p>
      <h1><span className="sr">{id} </span>{meta.title}</h1>
      <p className="sh-q">{meta.question}</p>
      <div className="sh-m">
        <div className="chips">
          <span className="chip">완료 조건 · {meta.doneWhen}</span>
          {chips}
        </div>
        {extra}
        <details className="ab-head-x">
          <summary>수업 자료에서 어디인가요</summary>
          <p className="mini muted" style={{ margin: '4px 0 0' }}>선생님용 노트북 자리 · {meta.notebookPart}</p>
        </details>
      </div>
    </div>
  );
}
