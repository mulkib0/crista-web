/**
 * ⑥ 3.2 학급 합계 동물 수 · 대체 시험으로 줄인 수(윤리 토론 자료 — 설계 §5.9 · features/preclinical.ts `teacherSummary`).
 * 큰 숫자 넷 + 모둠별 막대(쓴 수 · 줄인 수). 수업 화면에 띄워 3R(대체 · 감소 · 개선)을 이야기하는 데 쓴다.
 */
import { PRECLINICAL_API, type PreclinicalTeacherView } from '@crista-web/web-contract';
import { HBars } from '../board/ui/index.ts';
import { classNews, useTeacherLive } from './hooks.ts';

const QUESTIONS = [
  '대체 시험(세포 · 조직 · 컴퓨터 예측)으로 줄인 동물 수만큼, 무엇을 덜 알게 됐을까요?',
  '같은 결론을 더 적은 동물로 얻은 모둠은 어떤 설계를 했나요(감소)?',
  '고통 등급 · 인도적 종료 시점을 정한 이유를 모둠마다 한 문장으로 말해 볼까요(개선)?',
];

export function EthicsView({ classId }: { classId: string }) {
  const live = useTeacherLive<PreclinicalTeacherView>(PRECLINICAL_API.teacher(classId), classNews(classId), 30_000);
  const d = live.data;
  if (!d) return <p className="hint">{live.error ? live.error.message : '3.2 기록을 읽는 중…'}</p>;
  const named = d.teams.map((t) => ({ ...t, name: t.ticker ?? t.startupName ?? '등기 전' }));
  return (
    <div className="tc-stack">
      <div className="tc-sum" role="list" aria-label="학급 합계">
        <div className="tc-sum-i big" role="listitem"><span>학급이 쓴 동물</span><b className="mono">{d.totalAnimals.toLocaleString('ko-KR')}마리</b></div>
        <div className="tc-sum-i big good" role="listitem"><span>대체 시험으로 줄인 수</span><b className="mono">{d.totalSaved.toLocaleString('ko-KR')}마리</b></div>
        <div className="tc-sum-i big" role="listitem"><span>대체 시험</span><b className="mono">{d.altAssays}건</b></div>
        <div className="tc-sum-i big" role="listitem"><span>인도적 종료</span><b className="mono">{d.totalHumane}마리</b></div>
      </div>
      <div className="tc-two">
        <div className="panel">
          <h3 className="ptitle">모둠별 쓴 동물 <small>동물실험 건수</small></h3>
          <HBars label="모둠별 쓴 동물 수" labelWidth={96} rows={named.map((t) => ({ label: t.name, value: t.animals, text: `${t.animals}마리`, note: `동물실험 ${t.studies}건 · ${t.approved ? '계획서 승인' : '계획서 승인 전'}` }))} />
        </div>
        <div className="panel">
          <h3 className="ptitle">모둠별 줄인 동물 <small>대체 시험 건수</small></h3>
          <HBars label="모둠별 대체 시험으로 줄인 동물 수" labelWidth={96} rows={named.map((t) => ({ label: t.name, value: t.saved, text: `${t.saved}마리`, tone: 'hi' as const, note: `대체 시험 ${t.altAssays}건` }))} />
        </div>
      </div>
      <div className="panel tc-discuss">
        <h3 className="ptitle">윤리 토론 질문</h3>
        <ol>{QUESTIONS.map((q) => <li key={q}>{q}</li>)}</ol>
        <p className="mini muted" style={{ margin: 0 }}>이 수는 교육용 모의 실험의 수예요. 실제 동물을 쓰지 않았어요.</p>
      </div>
    </div>
  );
}
