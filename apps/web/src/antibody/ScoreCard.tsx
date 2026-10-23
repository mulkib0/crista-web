/**
 * A6 점수 카드(설계 §6.3) — 0~100 큰 숫자 + 5항 분해 막대 + 원본 · 문턱 눈금 + 감점 목록 + 위험 표시 + 한계 문구 + 출처 배지.
 * '점수 계산 방법'은 묶음 6 이 따로 만들어요 — 여기서는 §6.6 대응표(이름 · 뜻 · 단위 · 좋은 방향)를 펼쳐 보여요.
 */
import { ANTIBODY_WEIGHT_KEYS, type AntibodyScoreWeights, type ScoreView } from '@crista-web/web-contract';
import { HBars, Panel } from '../board/ui/index.ts';
import { Badges } from './Badge.tsx';
import { TERMS, THRESHOLD_NOTE } from './terms.ts';

const PART_WORD: Record<keyof AntibodyScoreWeights, string> = {
  binding: '붙는 힘',
  stability: '안정성',
  developability: '개발가능성',
  humanization: '인간화 개선',
  novelty: '유효 신규성',
};

export function ScoreCard({ score }: { score: ScoreView }) {
  const passed = score.score >= score.threshold;
  return (
    <Panel title="항체 설계 점수" sub={`산식 판 ${score.formulaVersion}`}>
      <div className="ab-score">
        <b className="ab-score-n">{score.score}</b>
        <span className="ab-score-s">/ 100 · 원본 {score.parentScore} · 문턱 {score.threshold}</span>
        <span className={`sig ${passed ? 'g' : 'w'}`}>{passed ? '✓ 원본보다 잘했어요' : '! 아직 문턱을 넘지 못했어요'}</span>
      </div>

      <div className="ab-scale" aria-hidden="true">
        <span className="ab-scale-t"><i style={{ width: `${score.score}%` }} /></span>
        <span className="ab-scale-m" style={{ left: `${score.parentScore}%` }} data-dash="1"><span>원본 {score.parentScore}</span></span>
        <span className="ab-scale-m" style={{ left: `${score.threshold}%` }}><span>문턱 {score.threshold}</span></span>
      </div>

      <HBars
        label="점수 분해 — 항목별 점수와 가중치"
        max={100}
        labelWidth={112}
        rows={ANTIBODY_WEIGHT_KEYS.map((key) => ({
          label: PART_WORD[key],
          value: score.parts[key],
          text: `${Math.round(score.parts[key])}`,
          note: `가중치 ${(score.weights[key] * 100).toFixed(0)}%`,
          ...(key === 'binding' ? { tone: 'hi' as const } : {}),
        }))}
      />

      <p className="mini muted" style={{ margin: '8px 0 0' }}>바꾼 자리 가운데 점수에 든 것 {score.effectiveMutations}개</p>

      {score.penalties.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="lab" style={{ margin: 0 }}>감점</p>
          <ul className="mini" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {score.penalties.map((p, i) => (
              <li key={`${p.label}-${i}`}>
                {p.label} · {p.points}점 <span className="chip">{p.fixable === 'easy' ? '고치기 쉬움' : '고치기 어려움'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.risks.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="lab" style={{ margin: 0 }}>점수에 넣지 않은 위험 표시</p>
          <ul className="mini" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {score.risks.map((r, i) => <li key={`${r}-${i}`}>{r}</li>)}
          </ul>
        </div>
      )}

      <p className="hint" style={{ marginTop: 10 }}>{score.caveat}</p>
      <p className="mini muted" style={{ margin: '4px 0 0' }}>{THRESHOLD_NOTE}</p>

      <details style={{ marginTop: 10 }}>
        <summary className="mini">점수 계산 방법 — 지표 이름이 무슨 뜻인가요</summary>
        <div className="tbl-w" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr><th scope="col">이름</th><th scope="col">한 줄 뜻</th><th scope="col">단위</th><th scope="col">좋은 방향</th></tr>
            </thead>
            <tbody>
              {TERMS.map((t) => (
                <tr key={t.key}><td><b>{t.name}</b></td><td>{t.meaning}</td><td>{t.unit}</td><td>{t.better}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div style={{ marginTop: 10 }}><Badges list={score.provenance} /></div>
    </Panel>
  );
}
