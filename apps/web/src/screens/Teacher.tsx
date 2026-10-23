/**
 * 교사 화면(설계 §9 · learning-grant §5 교사 화면) — 학생 ③ 화면과 같은 '둥근 섬' 틀: 위 띠 · 전광판 01 LED 띠 · 사이드바 섬(4묶음 칸) ·
 * 머리 섬(칸 제목 + ① 학급 게임 시계) · 본문 섬.
 *
 * 칸(apps/web/src/teacher/):
 *   ① 모둠 진행(지금 단계 · 막힌 이유 · 연구 노트) · 학급 · 명단(만들기 · 학생 받기 · 배정)
 *   ③ 서류 심사(대기 · 플래그 · 수동 판정 · 정정) · ④ 임상 판정(다시 시뮬레이션 · 직접 판정 · 참고 판정)
 *   ⑤ 학습 연구비(현황 · 이의 · 정정 · 면제) · ⑥ 3.2 동물 수(윤리 토론)
 *   ⑦ 전광판 · 마감(FMARKET `TeacherMarket` — 마감 시각 · 지금 마감 · 최종 순위 · 공지) · ⑧ AI 사용량
 * 위 띠의 [프로젝터 보기]는 FMARKET 의 큰 글자 전광판 + 순위를 바로 연다.
 * 교사 WS `teacher.alert`(교사 채널)가 오면 알림 줄에 띄우고, 각 칸의 목록을 다시 읽는다(hooks.ts `classNews`).
 */
import { useCallback, useEffect, useState } from 'react';
import { API, type ServerMessage, type TeacherClassDetail, type TeacherClassView } from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { TeacherPanel } from '../antibody/TeacherPanel.tsx';
import { api, message } from '../api.ts';
import { LedBand } from '../board/market/LedBand.tsx';
import { Projector, TeacherMarket } from '../board/market/TeacherMarket.tsx';
import { useLocalTab } from '../board/ui/index.ts';
import { ClassAdmin } from '../teacher/ClassAdmin.tsx';
import { ClinicalView } from '../teacher/ClinicalView.tsx';
import { ClockControl } from '../teacher/ClockControl.tsx';
import { EthicsView } from '../teacher/EthicsView.tsx';
import { ago, useTeacherAlerts, type TeacherAlert } from '../teacher/hooks.ts';
import { LearnView } from '../teacher/LearnView.tsx';
import { LlmUsageView } from '../teacher/LlmUsageView.tsx';
import { NAV_GROUPS, SECTION_META, SECTIONS, type TeacherSection } from '../teacher/nav.ts';
import { ProgressView, useProgress } from '../teacher/ProgressView.tsx';
import { ReviewsView } from '../teacher/ReviewsView.tsx';
import { teamLookup } from '../teacher/TeamTag.tsx';
import '../teacher/teacher.css';
import { socket } from '../ws.ts';

const DETAIL_NEWS = new Set<ServerMessage['type']>(['team.joined', 'team.registered', 'team.updated', 'member.assigned', 'member.enrolled']);

/** 알림 → 그 일을 처리하는 칸. 임상 판정 대기도 'review_manual' 로 오므로 글로 가른다. */
const alertSection = (a: TeacherAlert): TeacherSection =>
  a.kind === 'appeal' || a.kind === 'learn_flagged' ? 'learn' : a.message.includes('임상') ? 'clinical' : 'reviews';

export function Teacher({ nav }: { nav: Nav }) {
  const [classes, setClasses] = useState<TeacherClassView[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeacherClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useLocalTab<TeacherSection>('teacher:section', SECTIONS, 'progress');
  const [projector, setProjector] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const classId = detail?.id ?? null;
  const progress = useProgress(classId);
  const { alerts, clear } = useTeacherAlerts(classId);

  const loadList = useCallback(async () => {
    try {
      const res = await api.get<{ classes: TeacherClassView[] }>(API.classes);
      setClasses(res.classes);
      setError(null);
      setSelected((cur) => cur ?? res.classes[0]?.id ?? null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await api.get<TeacherClassDetail>(API.classDetail(id)));
      setError(null);
    } catch (err) {
      setError(message(err));
    }
  }, []);

  useEffect(() => void loadList(), [loadList]);
  useEffect(() => {
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);
  useEffect(
    () =>
      socket.on((msg: ServerMessage) => {
        if (selected && DETAIL_NEWS.has(msg.type) && 'classId' in msg && msg.classId === selected) void loadDetail(selected);
      }),
    [selected, loadDetail],
  );
  // 학급이 없으면 학급 칸부터.
  useEffect(() => {
    if (loaded && !classes.length && section !== 'class') setSection('class');
  }, [loaded, classes.length, section, setSection]);

  async function created(next: TeacherClassDetail) {
    // 새 학급 채널(학급 · 교사)은 다시 붙어야 받는다.
    socket.disconnect();
    socket.connect();
    await loadList();
    setSelected(next.id);
    setDetail(next);
  }

  const teams = teamLookup(detail);
  const counts = countWaiting(progress.data?.teams ?? []);
  const meta = SECTION_META[section];

  return (
    <div className="shell tc">
      <header className="top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8M22.8 16.8A6 6 0 1 0 22.8 23.2" />
          </svg>
          CRISTA <small>교사</small>
        </div>
        <div className="co">
          {classes.length > 0 ? (
            <>
              <label className="sr" htmlFor="tc-class">내 학급</label>
              <select id="tc-class" className="tc-class" value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · 학생 {c.studentCount}/{c.maxStudents}</option>)}
              </select>
            </>
          ) : <b className="muted">학급 없음</b>}
        </div>
        <div className="top-r">
          {(counts.total > 0 || alerts.length > 0) && (
            <button type="button" className="tb-btn tc-wait" onClick={() => setSection(counts.reviews ? 'reviews' : counts.clinical ? 'clinical' : counts.learn ? 'learn' : 'progress')}>
              <span className="tb-k">선생님 확인</span>
              <b>대기 {counts.total}건{alerts.length ? ` · 새 알림 ${alerts.length}` : ''}</b>
            </button>
          )}
          <span className="kv"><span>교사</span><b className="tc-me">{nav.me.account.displayName}</b></span>
          {detail && <button type="button" className="btn sm pri" onClick={() => setProjector(true)}>프로젝터 보기</button>}
          <button className="btn sm ghost" type="button" onClick={() => void nav.logout()}>나가기</button>
        </div>
      </header>

      {detail && <LedBand classId={detail.id} />}

      <div className="tc-body">
        <nav className="isl side tc-side" aria-label="교사 화면 칸">
          <div className="side-name">
            <b>{detail?.name ?? '학급을 만들어 주세요'}</b>
            {detail && <span className="mini muted">학생 {detail.roster.length}명 · 모둠 {detail.teamCount}개 · {detail.codeOpen ? '학생 받는 중' : '학생 받기 닫힘'}</span>}
          </div>
          <div className="side-groups">
            {NAV_GROUPS.map((grp) => (
              <div key={grp.g} className="grp" data-g={grp.g} data-gs="run">
                <h2 className="grp-h">{grp.title}</h2>
                <ul className="steps">
                  {grp.items.map((it) => {
                    const n = it.id === 'reviews' ? counts.reviews : it.id === 'clinical' ? counts.clinical : it.id === 'learn' ? counts.learn : 0;
                    const disabled = !detail && it.id !== 'class';
                    return (
                      <li key={it.id}>
                        <button type="button" className="st" aria-current={section === it.id ? 'page' : undefined} disabled={disabled} onClick={() => setSection(it.id)}>
                          <span className="st-n">{it.no}</span>
                          <span className="st-t">{it.label}</span>
                          <span className="st-k">{n ? <span className="tc-badge" aria-label={`대기 ${n}건`}>{n}</span> : ''}</span>
                          <span className="st-s">{it.sub}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="tc-alerts" aria-label="새 알림">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="side-h">새 알림 {alerts.length}</span>
                <button type="button" className="btn sm ghost" onClick={clear}>지우기</button>
              </div>
              <ul>
                {alerts.slice(0, 5).map((a) => (
                  <li key={`${a.refId}-${a.at}`}>
                    <button type="button" onClick={() => setSection(alertSection(a))}>
                      <span>{a.message}</span>
                      <small className="mono">{teams.get(a.teamId ?? '')?.ticker ?? ''} · {ago(new Date(a.at).toISOString())}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <section className="isl isl-head tc-head" aria-labelledby="tc-h">
          <div className="tc-head-l">
            <h1 id="tc-h"><span className="hd-n">{meta.no}</span> {meta.label}</h1>
            <p className="lede">{meta.lede}</p>
          </div>
          {detail && <ClockControl classId={detail.id} />}
        </section>

        <main className="tc-main">
          {error && <p className="err" role="alert">{error} <button type="button" className="btn sm ghost" onClick={() => { setError(null); void loadList(); }}>다시 읽기</button></p>}
          {section === 'class' || !detail ? (
            <ClassAdmin detail={detail} onCreated={created} onChanged={async (next) => { if (next) setDetail(next); else if (detail) await loadDetail(detail.id); await loadList(); }} />
          ) : section === 'market' ? (
            <div className="isl tc-isl tc-market"><TeacherMarket classId={detail.id} /></div>
          ) : (
            <div className="isl tc-isl">
              {section === 'progress' && <ProgressView live={progress} go={setSection} />}
              {section === 'reviews' && <ReviewsView classId={detail.id} teams={teams} onChanged={progress.reload} />}
              {section === 'clinical' && <ClinicalView classId={detail.id} teams={teams} onChanged={progress.reload} />}
              {section === 'learn' && <LearnView classId={detail.id} teams={teams} onChanged={progress.reload} />}
              {section === 'ethics' && <EthicsView classId={detail.id} />}
              {section === 'llm' && <LlmUsageView classId={detail.id} />}
              {section === 'antibody' && <TeacherPanel account={nav.me.account} classId={detail.id} teams={detail.teams} />}
            </div>
          )}
        </main>
      </div>
      {projector && detail && <Projector classId={detail.id} onClose={() => setProjector(false)} />}
    </div>
  );
}

function countWaiting(teams: Array<{ stuck: Array<{ kind: string; teacher: boolean; count?: number }> }>) {
  const sum = (kind: string) => teams.reduce((n, t) => n + t.stuck.filter((s) => s.teacher && s.kind === kind).reduce((m, s) => m + (s.count ?? 1), 0), 0);
  const reviews = sum('review');
  const clinical = sum('trial');
  const learn = sum('appeal');
  return { reviews, clinical, learn, total: reviews + clinical + learn };
}
