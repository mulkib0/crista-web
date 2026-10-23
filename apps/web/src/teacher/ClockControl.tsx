/**
 * ① 학급 게임 시계(설계 §9 '시계 시작 · 일시정지 · 배속' · clock.ts) — 머리 섬 오른쪽에 늘 둔다.
 * 배율 = 게임 일 / 현실 분. 서류 심사 숙고 · 3.2 동물실험 28게임 일 · 3.3 IND 30게임 일 · 4.1 임상 · 4.2 허가 60게임 일이 이 시계로 흐른다
 * (학습 연구비 10분 틱은 현실 시간이라 상관없음). 기본 ×12 — 100분 수업(또는 50분 × 2)에 3.2 ~ 4.2 가 들어가게(web-contract `CLOCK_RATE_DEFAULT`).
 */
import { useState } from 'react';
import { CLOCK_RATE_DEFAULT, CLOCK_RATE_MAX, CLOCK_RATE_MIN, DOC_REVIEW_GAME_DAYS, formatGameDay, PHASE_RULES, TRIAL_PHASES } from '@crista-web/web-contract';
import { useClassClock } from './hooks.ts';

const PRESETS = [1, 2, 5, CLOCK_RATE_DEFAULT, 20, 30] as const;
/** 임상 1 · 2 · 3상을 기본 모집으로 최소 인원에서 시작했을 때 게임 일(모집 + 기간). */
const TRIAL_DAYS = TRIAL_PHASES.reduce((sum, p) => sum + PHASE_RULES[p].baseRecruitDays * PHASE_RULES[p].minRatio + PHASE_RULES[p].gameDays, 0);
const realMin = (gameDays: number, rate: number) => {
  const m = gameDays / rate;
  return m < 1 ? `${Math.round(m * 60)}초` : `${Math.round(m * 10) / 10}분`;
};

export function ClockControl({ classId }: { classId: string }) {
  const { clock, gameDay, busy, error, command, reload } = useClassClock(classId);
  const [custom, setCustom] = useState('');
  if (!clock || gameDay === null) {
    return (
      <div className="tc-clock">
        {error ? (
          <p className="hint bad" role="alert">시계를 못 읽었어요 — {error} <button type="button" className="btn sm ghost" onClick={reload}>다시 읽기</button></p>
        ) : <span className="mini muted">시계를 읽는 중…</span>}
      </div>
    );
  }
  const customRate = Number(custom);
  const customOk = custom !== '' && Number.isFinite(customRate) && customRate >= CLOCK_RATE_MIN && customRate <= CLOCK_RATE_MAX;
  return (
    <div className="tc-clock" role="group" aria-label="학급 게임 시계">
      <div className="tc-clock-day">
        <span className="tc-k">게임 시계</span>
        <b className="mono">{formatGameDay(gameDay)}</b>
        <span className={`tc-state${clock.paused ? ' off' : ''}`}>{clock.paused ? '⏸ 멈춤' : `▸ 흐름 · ×${clock.rate}`}</span>
      </div>
      <div className="tc-clock-ctl">
        {clock.paused ? (
          <button type="button" className="btn sm pri" disabled={busy} onClick={() => void command({ action: 'resume' })}>▸ 다시 흐르기</button>
        ) : (
          <button type="button" className="btn sm" disabled={busy} onClick={() => void command({ action: 'pause' })}>⏸ 일시정지</button>
        )}
        <div className="tc-rates" role="group" aria-label="배율(게임 일 / 현실 분)">
          {PRESETS.map((r) => (
            <button key={r} type="button" className="tc-rate" aria-pressed={clock.rate === r} disabled={busy} onClick={() => void command({ action: 'rate', rate: r })}>×{r}</button>
          ))}
        </div>
        <form
          className="tc-rate-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (customOk) void command({ action: 'rate', rate: customRate }).then(() => setCustom(''));
          }}
        >
          <label className="sr" htmlFor={`rate-${classId}`}>배율 직접 넣기</label>
          <input id={`rate-${classId}`} className="txt mono" type="number" inputMode="decimal" step="0.1" min={CLOCK_RATE_MIN} max={CLOCK_RATE_MAX} placeholder="직접" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="submit" className="btn sm ghost" disabled={busy || !customOk}>바꾸기</button>
        </form>
      </div>
      <p className="tc-clock-note">
        배율 ×{clock.rate} = 현실 1분에 게임 {clock.rate}일 · 서류 심사 숙고 {DOC_REVIEW_GAME_DAYS.ind}일 ≈ {realMin(DOC_REVIEW_GAME_DAYS.ind, clock.rate)} · 동물실험 28일 ≈ {realMin(28, clock.rate)} · IND 30일 ≈ {realMin(30, clock.rate)} · 임상 1~3상(기본 모집) ≈ {realMin(TRIAL_DAYS, clock.rate)}
        {!clock.paused && ' · 수업이 끝나면 멈춰 두세요'}
        {clock.paused && ' · 멈춘 동안은 기간이 흐르지 않아요'}
      </p>
      {error && <p className="hint bad" role="alert">{error}</p>}
    </div>
  );
}
