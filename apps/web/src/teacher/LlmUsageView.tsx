/**
 * ⑦ 학급 AI 하루 사용량(설계 §5.13 비용 · reviews.ts `GET /api/teacher/classes/:id/llm-usage`). 하루 = 한국 시각 0시부터.
 * 상한에 닿으면 AI 심사 · 채점이 '선생님 확인 대기'로 넘어온다는 것을 같이 알린다.
 */
import { REVIEW_API, type LlmUsageView } from '@crista-web/web-contract';
import { HBars } from '../board/ui/index.ts';
import { classNews, useTeacherLive } from './hooks.ts';

const TASK_WORD: Record<string, string> = {
  doc_review: '서류 심사',
  learn_grade: '학습 채점',
  headline: '전광판 헤드라인',
  clinical_sim: '임상 시뮬레이션',
  pitch: '투자 피치',
};
const n = (v: number) => v.toLocaleString('ko-KR');

export function LlmUsageView({ classId }: { classId: string }) {
  const live = useTeacherLive<LlmUsageView>(REVIEW_API.teacherLlmUsage(classId), classNews(classId), 30_000);
  const d = live.data;
  if (!d) return <p className="hint">{live.error ? live.error.message : 'AI 사용량을 읽는 중…'}</p>;
  const ratio = d.dailyLimit > 0 ? Math.min(1, d.calls / d.dailyLimit) : 0;
  const tasks = Object.entries(d.byTask).sort((a, b) => b[1] - a[1]);
  return (
    <div className="tc-stack">
      <div className="tc-sum" role="list" aria-label="오늘 AI 사용">
        <div className={`tc-sum-i big${ratio >= 0.9 ? ' warn' : ''}`} role="listitem"><span>오늘 호출 · {d.day}</span><b className="mono">{n(d.calls)} / {n(d.dailyLimit)}</b></div>
        <div className="tc-sum-i" role="listitem"><span>입력 토큰</span><b className="mono">{n(d.inputTokens)}</b></div>
        <div className="tc-sum-i" role="listitem"><span>출력 토큰</span><b className="mono">{n(d.outputTokens)}</b></div>
        <div className="tc-sum-i" role="listitem"><span>캐시로 읽은 토큰</span><b className="mono">{n(d.cacheReadTokens)}</b></div>
        <div className={`tc-sum-i${d.refused + d.failed ? ' warn' : ''}`} role="listitem"><span>거절 · 실패</span><b className="mono">{d.refused} · {d.failed}</b></div>
      </div>
      <div className="panel">
        <h3 className="ptitle">하루 상한 <small>{d.available ? 'AI 켜짐' : 'AI 꺼짐 — 심사 · 채점은 선생님 몫'}</small></h3>
        <div className="progress" aria-label={`하루 상한의 ${Math.round(ratio * 100)}%`}><i style={{ width: `${ratio * 100}%` }} /></div>
        <p className="mini muted" style={{ margin: '8px 0 0' }}>
          상한에 닿으면 그날 남은 AI 심사 · 채점은 '선생님 확인 대기'로 넘어와요(서류 심사 · 학습 연구비 칸에서 처리).
        </p>
      </div>
      <div className="panel">
        <h3 className="ptitle">쓰임별 <small>오늘 호출 수</small></h3>
        {tasks.length ? (
          <HBars label="쓰임별 오늘 AI 호출" labelWidth={128} rows={tasks.map(([task, v]) => ({ label: TASK_WORD[task] ?? task, value: v, text: `${v}번` }))} />
        ) : <p className="empty mini">오늘은 아직 AI 를 부르지 않았어요.</p>}
      </div>
    </div>
  );
}
