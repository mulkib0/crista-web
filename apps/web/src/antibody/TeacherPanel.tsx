/**
 * 선생님 화면의 항체 설계 랩 탭(설계 §5.5 · §8.1 · §10 U9) — 이미 있는 교사 경로 세 개에 화면에서 닿는 길을 냅니다.
 *
 *   GET/PUT `/api/antibody/teacher/settings` · GET `/api/antibody/teacher/queue` · POST `/api/antibody/teacher/correct`
 *
 * 규칙
 * - 공용 부품만 씁니다(§11.1) — `board/ui` 의 `Panel` · `Confirm` · `useLive`. 폴링 코드를 쓰지 않습니다.
 * - 선생님 세션만 봅니다 — 서버가 403 으로 막는 것과 별도로 화면도 감춥니다(학생이 이 파일을 불러도 아무것도 그리지 않아요).
 * - 정직성(§3.5) — 지표 카드마다 출처 배지를 하나씩 답니다. 근사값에 원전 지표 이름을 쓰지 않습니다.
 * - 되돌리기 어려운 정정은 `Confirm` 으로 한 번 더 묻습니다.
 * - 가중치 합 1.00 은 서버가 409 로 막습니다 — 화면도 같은 함수(`scoreWeightsOk`)로 미리 알려 줍니다.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ANTIBODY_API,
  ANTIBODY_GRADE_MIN,
  ANTIBODY_GRADE_WORD,
  ANTIBODY_SCORE_WEIGHTS,
  ANTIBODY_WEIGHT_KEYS,
  CONFIDENCE_MIN_FOR_COMPLEX,
  CORRECTION_MAX_PCT,
  TRACK_IDS,
  SCORE_THRESHOLD_MARGIN,
  scoreWeightsOk,
  scoreWeightsSum,
  type AccountView,
  type AntibodyScoreWeights,
  type AntibodyTeacherQueue,
  type AntibodyTeacherSettings,
  type TrackId,
  type ScoreView,
  type TeamView,
} from '@crista-web/web-contract';
import { api, message } from '../api.ts';
import { Confirm, Panel, useLive } from '../board/ui/index.ts';
import { DATA_MODE_WORD } from './terms.ts';
import './teacher-panel.css';

/** 가중치 다섯 칸의 이름 — 학생 화면과 같은 말을 씁니다(§6.6 · §11.4.2). */
const WEIGHT_WORD: Record<keyof AntibodyScoreWeights, string> = {
  binding: '붙는 힘',
  stability: '안정성',
  developability: '개발가능성',
  humanization: '인간화 개선',
  novelty: '유효 신규성',
};

/** 랩 이름 — 학생이 '연구소 고르기'에서 보는 이름과 같게. */
const TRACK_WORD: Record<TrackId, string> = { drug: '저분자 랩', antibody: '항체 설계 랩' };

/** 외부 자료 갈래 이름 — 선생님 운영용이라 '무엇을 기다리는 줄인지'로 적습니다. */
const DOMAIN_WORD: Record<string, string> = {
  esmfold: '단일 사슬 접기',
  colabfold: '정렬 자료 만들기',
  sabdab: '항체 번호 · 비교군 조회',
  rcsb: '구조 자료 조회',
  chembl: '항체 · 표적 조회',
  nim: '치환 후보 제안(선택 키)',
  boltz: '복합체 예측(선택 키)',
};

/**
 * 갈래마다 1건 소요 — 설계 §8.1 의 **실측 범위**예요. 여기서 새로 만든 숫자가 아니고, 없는 갈래는 비워 둡니다.
 * 선택 키 경로(치환 후보 제안 · 복합체 예측)는 잰 값이 없어서 예상 대기를 내지 않습니다.
 */
const DOMAIN_SEC: Record<string, readonly [number, number] | undefined> = {
  esmfold: [12, 27],
  colabfold: [60, 120],
  sabdab: [5.65, 5.65],
  rcsb: [1.2, 2.4],
  chembl: [1.2, 2.4],
};

/** 단계 이름 — 큐 표의 앞 칸. 서버가 주는 글자를 그대로 쓰되 아는 것만 사람 말로 바꿉니다. */
const STEP_WORD: Record<string, string> = { A2: 'A2 자리 번호 · 정렬', A4: 'A4 구조 접기', A5: 'A5 복합체 평가' };
const STATUS_WORD: Record<string, string> = { queued: '기다리는 중', running: '돌고 있음' };

function secText(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}초`;
  return `${Math.round(sec / 60)}분`;
}

/** 남은 차례 × 1건 소요 범위. 잰 값이 없는 갈래는 null — 빈 칸으로 둡니다(지어내지 않아요). */
function waitText(row: AntibodyTeacherQueue['domains'][number]): string | null {
  const span = DOMAIN_SEC[row.domain];
  if (!span) return null;
  const turns = Math.ceil((row.waiting + row.running) / Math.max(1, row.limit));
  if (turns === 0) return '바로';
  const lo = secText(turns * span[0]);
  const hi = secText(turns * span[1]);
  return lo === hi ? `약 ${lo}` : `약 ${lo} ~ ${hi}`;
}

const pathWith = (base: string, classId: string | null): string =>
  classId ? `${base}?classId=${encodeURIComponent(classId)}` : base;

export function TeacherPanel({ account, classId, teams }: {
  account: AccountView;
  /** 선생님이 고른 학급. 없으면 서버가 첫 학급을 골라 줍니다. */
  classId: string | null;
  /** 정정할 모둠 고르기 목록 — 선생님 화면이 이미 읽어 둔 학급 상세에서 받습니다. */
  teams: readonly TeamView[];
}) {
  // 학생 세션에는 아무것도 그리지 않습니다(서버 403 과 별도로 화면도 감춥니다).
  if (account.kind !== 'teacher') return null;
  return <TeacherPanelBody classId={classId} teams={teams} />;
}

function TeacherPanelBody({ classId, teams }: { classId: string | null; teams: readonly TeamView[] }) {
  const settings = useLive<AntibodyTeacherSettings>(
    pathWith(ANTIBODY_API.teacherSettings, classId),
    (m) => m.type === 'board.changed' && m.reason === 'antibody:settings',
  );
  const queue = useLive<AntibodyTeacherQueue>(
    pathWith(ANTIBODY_API.teacherQueue, classId),
    (m) => m.type === 'antibody.news' || (m.type === 'board.changed' && m.reason.startsWith('antibody')),
  );

  const [draft, setDraft] = useState<AntibodyTeacherSettings | null>(null);
  const synced = useRef<number>(-1);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loaded = settings.data;
  useEffect(() => {
    if (!loaded || synced.current === loaded.version) return;
    synced.current = loaded.version;
    setDraft(loaded);
  }, [loaded]);

  const sum = draft ? scoreWeightsSum(draft.weights) : 0;
  const weightsOk = draft ? scoreWeightsOk(draft.weights) : false;
  const tracksOk = (draft?.openTracks.length ?? 0) > 0;
  const blocked = !draft
    ? '설정을 불러오는 중이에요.'
    : !weightsOk
      ? '가중치 다섯 개의 합이 1.00 이어야 해요.'
      : !tracksOk
        ? '랩을 적어도 하나는 열어 주세요 — 둘 다 닫으면 학생이 들어갈 곳이 없어요.'
        : null;

  function setWeight(key: keyof AntibodyScoreWeights, value: number) {
    setSaved(null);
    setDraft((d) => (d ? { ...d, weights: { ...d.weights, [key]: value } } : d));
  }

  /** 합을 1.00 으로 — 지금 비율을 지키며 맞춥니다(합이 0이면 기본 가중치로 돌아갑니다). */
  function normalize() {
    setSaved(null);
    setDraft((d) => {
      if (!d) return d;
      const total = scoreWeightsSum(d.weights);
      if (!Number.isFinite(total) || total <= 0) return { ...d, weights: { ...ANTIBODY_SCORE_WEIGHTS } };
      const next = { ...d.weights };
      let acc = 0;
      ANTIBODY_WEIGHT_KEYS.forEach((key, i) => {
        if (i === ANTIBODY_WEIGHT_KEYS.length - 1) next[key] = Math.round((1 - acc) * 1000) / 1000;
        else {
          const v = Math.round((d.weights[key] / total) * 1000) / 1000;
          next[key] = v;
          acc += v;
        }
      });
      return { ...d, weights: next };
    });
  }

  function toggleTrack(track: TrackId, on: boolean) {
    setSaved(null);
    setDraft((d) => {
      if (!d) return d;
      const open = on ? [...new Set([...d.openTracks, track])] : d.openTracks.filter((t) => t !== track);
      return { ...d, openTracks: open };
    });
  }

  async function save() {
    if (!draft || blocked) return;
    setSaving(true);
    setSaveErr(null);
    setSaved(null);
    try {
      const next = await api.put<AntibodyTeacherSettings>(ANTIBODY_API.teacherSettings, {
        ...(classId ? { classId } : {}),
        weights: draft.weights,
        thresholds: draft.thresholds,
        openTracks: draft.openTracks,
        version: draft.version,
      });
      synced.current = next.version;
      setDraft(next);
      settings.setData(next);
      setSaved(`저장했어요 — 설정 ${next.version}판이에요.`);
    } catch (err) {
      setSaveErr(message(err));
      // 낙관적 잠금이 걸린 경우(409) 지금 값으로 다시 맞춥니다.
      synced.current = -1;
      settings.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ab-tp">
      <Panel title="항체 설계 랩 · 학급 설정" sub={draft ? `설정 ${draft.version}판` : undefined}>
        {settings.error && <p className="err" role="alert">{settings.error.message}</p>}
        {!draft ? (
          <p className="hint">{settings.loading ? '불러오는 중…' : '설정을 아직 불러오지 못했어요.'}</p>
        ) : (
          <>
            <p className="lab">설계 점수 가중치</p>
            <div className="ab-tp-w">
              {ANTIBODY_WEIGHT_KEYS.map((key) => (
                <div className="fld" key={key}>
                  <label className="lab" htmlFor={`abw-${key}`}>{WEIGHT_WORD[key]}</label>
                  <input
                    id={`abw-${key}`}
                    className="txt"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draft.weights[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
            <p className={`ab-tp-sum${weightsOk ? ' ok' : ''}`}>
              합 {sum.toFixed(3)} {weightsOk ? '· 맞아요' : '· 1.000 이어야 해요'}
              <button className="btn sm" type="button" onClick={normalize}>합을 1.00 으로 맞추기</button>
            </p>
            <p className="hint">기본값은 붙는 힘 0.30 · 안정성 0.20 · 개발가능성 0.30 · 인간화 개선 0.10 · 유효 신규성 0.10 이에요.</p>

            <p className="lab" style={{ marginTop: 16 }}>문턱</p>
            <div className="ab-tp-w two">
              <div className="fld">
                <label className="lab" htmlFor="abt-margin">설계 점수 문턱 폭</label>
                <input
                  id="abt-margin"
                  className="txt"
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={draft.thresholds.scoreMargin}
                  onChange={(e) => {
                    setSaved(null);
                    setDraft((d) => (d ? { ...d, thresholds: { ...d.thresholds, scoreMargin: Number(e.target.value) } } : d));
                  }}
                />
                <span className="note">원본 점수보다 이만큼 높아야 통과예요(기본 {SCORE_THRESHOLD_MARGIN}).</span>
              </div>
              <div className="fld">
                <label className="lab" htmlFor="abt-conf">AI 확신도 문턱</label>
                <input
                  id="abt-conf"
                  className="txt"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.thresholds.confidenceMin}
                  onChange={(e) => {
                    setSaved(null);
                    setDraft((d) => (d ? { ...d, thresholds: { ...d.thresholds, confidenceMin: Number(e.target.value) } } : d));
                  }}
                />
                <span className="note">이 값보다 낮은 구조는 복합체 평가에서 빼요(기본 {CONFIDENCE_MIN_FOR_COMPLEX}).</span>
              </div>
            </div>
            <p className="hint">
              설계 적합도 등급은 이번 판에서는 고정이에요 — {ANTIBODY_GRADE_MIN.great} 이상 {ANTIBODY_GRADE_WORD.great} ·{' '}
              {ANTIBODY_GRADE_MIN.good} 이상 {ANTIBODY_GRADE_WORD.good} · {ANTIBODY_GRADE_MIN.fair} 이상 {ANTIBODY_GRADE_WORD.fair} ·{' '}
              그 아래는 {ANTIBODY_GRADE_WORD.poor} 이에요.
            </p>

            <p className="lab" style={{ marginTop: 16 }}>열린 랩</p>
            {TRACK_IDS.map((track) => (
              <label className="chk" key={track}>
                <input
                  type="checkbox"
                  checked={draft.openTracks.includes(track)}
                  onChange={(e) => toggleTrack(track, e.target.checked)}
                />{' '}
                {TRACK_WORD[track]}
              </label>
            ))}
            <p className="hint">하나만 열면 그 랩으로만 들어가요. 둘 다 열면 학생이 '연구소 고르기'에서 고릅니다.</p>

            {blocked && <p className="hint bad">✕ {blocked}</p>}
            {saveErr && <p className="err" role="alert">{saveErr}</p>}
            {saved && <p className="hint good" role="status">{saved}</p>}
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn pri" type="button" disabled={saving || !!blocked} onClick={() => void save()}>설정 저장</button>
              <button className="btn sm" type="button" onClick={() => { synced.current = -1; setSaved(null); setSaveErr(null); settings.reload(); }}>다시 불러오기</button>
            </div>
            <p className="note">다른 창에서 먼저 바꾸면 저장이 막혀요 — 그때는 다시 불러와서 고쳐 주세요.</p>
          </>
        )}
      </Panel>

      <Panel title="학급 큐" sub={queue.data ? `외부 자료 · ${DATA_MODE_WORD[queue.data.dataMode]}` : undefined}>
        {queue.error && <p className="err" role="alert">{queue.error.message}</p>}
        {!queue.data ? (
          <p className="hint">{queue.loading ? '불러오는 중…' : '큐를 아직 불러오지 못했어요.'}</p>
        ) : (
          <>
            <p className="lab">단계별 대기</p>
            {queue.data.byStep.length === 0 ? (
              <p className="empty">기다리는 작업이 없어요.</p>
            ) : (
              <div className="tbl-w"><table>
                <thead><tr><th>단계</th><th>상태</th><th className="num">건수</th></tr></thead>
                <tbody>
                  {queue.data.byStep.map((r) => (
                    <tr key={`${r.step}-${r.status}`}>
                      <td>{STEP_WORD[r.step] ?? r.step}</td>
                      <td>{STATUS_WORD[r.status] ?? r.status}</td>
                      <td className="num">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <p className="lab" style={{ marginTop: 14 }}>갈래별 대기 · 예상 대기</p>
            <div className="tbl-w"><table>
              <thead><tr><th>갈래</th><th className="num">돌고 있음</th><th className="num">기다림</th><th className="num">동시 상한</th><th className="num">최고 동시</th><th>예상 대기</th></tr></thead>
              <tbody>
                {queue.data.domains.map((d) => {
                  const wait = waitText(d);
                  return (
                    <tr key={d.domain}>
                      <td>{DOMAIN_WORD[d.domain] ?? d.domain}</td>
                      <td className="num">{d.running}</td>
                      <td className="num">{d.waiting}</td>
                      <td className="num">{d.limit}</td>
                      <td className="num">{d.peak}</td>
                      <td className="mini">{wait ?? '잰 값이 없어요'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            <p className="note">
              1건 소요는 설계 §8.1 의 실측 범위예요 — 바깥 서버가 느려지면 더 걸려요. 대기 중에는 학습 연구비 심화 문항 · 연구 노트 초안을 시켜 보세요.
            </p>
            <div className="acts" style={{ marginTop: 10 }}>
              <button className="btn sm" type="button" onClick={() => queue.reload()}>큐 새로 고침</button>
            </div>
          </>
        )}
      </Panel>

      <CorrectPanel classId={classId} teams={teams} onDone={() => queue.reload()} />
    </div>
  );
}

/** 점수 정정 — 되돌리기 어려우니 `Confirm` 으로 한 번 더 묻습니다. */
function CorrectPanel({ classId, teams, onDone }: {
  classId: string | null;
  teams: readonly TeamView[];
  onDone: () => void;
}) {
  const [teamId, setTeamId] = useState('');
  const [pct, setPct] = useState(0);
  const [reason, setReason] = useState('');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ score: ScoreView | null; changePct: number } | null>(null);

  const team = teams.find((t) => t.id === teamId) ?? null;
  const reasonLen = [...reason.trim()].length;
  const blocked = !teamId
    ? '정정할 모둠을 골라 주세요.'
    : reasonLen < 1
      ? '정정 이유를 적어 주세요.'
      : reasonLen > 140
        ? '정정 이유는 140자까지예요.'
        : Math.abs(pct) > CORRECTION_MAX_PCT
          ? `정정 변동률은 ±${CORRECTION_MAX_PCT}% 안이에요.`
          : null;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ score: ScoreView | null; changePct: number }>(ANTIBODY_API.teacherCorrect, {
        ...(classId ? { classId } : {}),
        teamId,
        reason: reason.trim(),
        newChangePct: pct,
      });
      setDone(res);
      setAsk(false);
      setReason('');
      onDone();
    } catch (e) {
      setErr(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="점수 정정" sub="되돌리기 어려워요">
      {teams.length === 0 ? (
        <p className="empty">학급을 고르면 모둠 목록이 나와요.</p>
      ) : (
        <>
          <div className="fld">
            <label className="lab" htmlFor="abc-team">모둠</label>
            <select id="abc-team" className="txt" value={teamId} onChange={(e) => { setTeamId(e.target.value); setDone(null); }}>
              <option value="">— 고르기 —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plot}모둠{t.startupName ? ` · ${t.startupName}` : ''}{t.ticker ? ` · ${t.ticker}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label className="lab" htmlFor="abc-pct">기업가치 정정 변동률(%)</label>
            <input id="abc-pct" className="txt" type="number" min={-CORRECTION_MAX_PCT} max={CORRECTION_MAX_PCT} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
            <span className="note">0 으로 두면 기업가치는 그대로 두고 정정 사실만 전광판에 올려요.</span>
          </div>
          <div className="fld">
            <label className="lab" htmlFor="abc-reason">정정 이유</label>
            <input id="abc-reason" className="txt" value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} placeholder="예: 모둠원 한 명의 설계가 중복 접수돼 두 번 반영됐어요" />
            <span className="note">{reasonLen}/140자</span>
          </div>
          <p className="hint">
            정정은 모둠 하나에 적용돼요. 다시 계산한 뒤에는 그 모둠에서 가장 높은 설계 점수를 다시 보여 줘요 — 설계 하나만 골라 지우는 길은 이번 판에 없어요.
          </p>
          {/* 아직 아무것도 고르지 않았을 때부터 빨간 줄을 띄우지 않아요 — 손을 댄 뒤에만 왜 막혔는지 알려 줍니다. */}
          {(teamId !== '' || reason !== '') && blocked && <p className="hint bad">✕ {blocked}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="acts" style={{ marginTop: 12 }}>
            <button className="btn danger" type="button" disabled={!!blocked} onClick={() => setAsk(true)}>정정하고 다시 계산</button>
          </div>
          {done && (
            <div className="ab-tp-done">
              <p className="lab">다시 계산한 대표 설계</p>
              {done.score ? (
                <>
                  <p className="ab-tp-score">{done.score.score}점 <small>문턱 {done.score.threshold}점 · 원본 {done.score.parentScore}점</small></p>
                  <p className="mini">{done.score.score >= done.score.threshold ? '통과' : '보류'} · 변동률 {done.changePct > 0 ? '+' : ''}{done.changePct}%</p>
                  <p className="note">{done.score.caveat}</p>
                </>
              ) : (
                <p className="empty">이 모둠에는 아직 접수된 설계가 없어요 — 정정 사실만 전광판에 올라갔어요.</p>
              )}
            </div>
          )}
        </>
      )}
      <Confirm
        open={ask}
        title="점수를 정정할까요?"
        confirmLabel="정정할게요"
        tone="bad"
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setAsk(false)}
      >
        <p>
          {team ? `${team.plot}모둠${team.startupName ? ` · ${team.startupName}` : ''}` : '고른 모둠'} 의 항체 점수를 다시 계산하고 기업가치를{' '}
          {pct > 0 ? '+' : ''}{pct}% 움직여요.
        </p>
        <p className="note">정정 사실과 이유가 전광판 소식에 그대로 올라가요. 되돌리려면 반대 방향으로 한 번 더 정정해야 해요.</p>
      </Confirm>
    </Panel>
  );
}
