/**
 * ③′ 항체 설계 랩(설계 §1.2 · §6) — 위 띠 · LED 띠 · 둥근 섬 본문(사이드바 · 머리 · 내 작업대 · 모둠 공유).
 *
 * - 틀과 위 띠 부품은 8b 가 만든 것을 그대로 가져다 써요(§11.1) — `AbShell` 이 묶어요.
 * - 단계 화면 A1~A6 은 섬 세 개를 `AbIslands` 로 돌려줘요. 단계를 옮기면 `key` 로 새로 붙여요(단계마다 쓰는 상태가 달라요).
 * - 서버 라우트가 아직 없으면 `useAbBoard` 가 화면 개발용 고정 자료로 내려앉고, 띠로 그 사실을 알려요.
 * - `not_registered_team`(409) 이면 사옥 지구로 돌려보내요(§1.3).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANTIBODY_STEP_IDS, type AntibodyStepId } from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { abActions, useAbBoard } from '../antibody/api.ts';
import { AbShell } from '../antibody/AbShell.tsx';
import { AB_STEP_VIEWS } from '../antibody/steps/index.ts';
import '../antibody/antibody.css';

export function Antibody({ nav }: { nav: Nav }) {
  const { go, me } = nav;
  const ab = useAbBoard(me);
  const [current, setCurrent] = useState<AntibodyStepId | null>(null);

  useEffect(() => {
    if (ab.notRegistered) go('district', true);
  }, [ab.notRegistered, go]);

  // 브라우저 탭 — 등기 뒤에는 스타트업 이름.
  const startupName = ab.board?.team.startupName;
  useEffect(() => {
    if (startupName) document.title = `${startupName} — 항체 설계 랩`;
  }, [startupName]);

  const goStep = useCallback((id: AntibodyStepId) => {
    setCurrent(id);
    window.scrollTo(0, 0);
  }, []);

  const actions = useMemo(() => abActions(ab, me.account.displayName), [ab, me.account.displayName]);

  if (!ab.board) return <div className="empty" style={{ margin: 40 }}>{ab.error ?? '항체 설계 랩을 여는 중…'}</div>;

  const board = ab.board;
  const stepId = current
    ?? board.current
    ?? (board.steps.find((s) => s.state !== 'done' && s.state !== 'locked') ?? board.steps[0]!).id;
  const step = board.steps.find((s) => s.id === stepId) ?? board.steps[0]!;
  const View = AB_STEP_VIEWS[step.id];

  return (
    <AbShell
      board={board}
      me={me}
      current={step.id}
      goStep={goStep}
      mock={ab.mock}
      onLabs={() => go('lab')}
      onDistrict={() => go('district')}
      onLogout={() => void nav.logout()}
      error={ab.error}
    >
      <View key={step.id} board={board} step={step} me={me} actions={actions} goStep={goStep} mock={ab.mock} />
    </AbShell>
  );
}

/** 단계 수 — 고르기 화면의 진행 칩이 쓰는 값(서버 `labs.antibody.total` 이 없을 때의 기본). */
export const ANTIBODY_STEP_COUNT = ANTIBODY_STEP_IDS.length;
