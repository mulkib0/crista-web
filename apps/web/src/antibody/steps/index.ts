/**
 * 단계 화면 등록표 — A1~A6. 각 단계는 **섬 세 개를 `AbIslands` 로 돌려주는 React 부품**이에요(설계 §11.2).
 * `AbShell` 을 import 하지 않고 `AbIslands` 만 쓰므로, 8b 가 `StepRegistry` 를 내놓으면 이 표를 그대로 넘기면 돼요.
 */
import type { ReactElement } from 'react';
import type { AntibodyBoardResponse, AntibodyStepId, AntibodyStepView, MeResponse } from '@crista-web/web-contract';
import type { AbActions } from '../api.ts';
import { A1 } from './A1.tsx';
import { A2 } from './A2.tsx';
import { A3 } from './A3.tsx';
import { A4 } from './A4.tsx';
import { A5 } from './A5.tsx';
import { A6 } from './A6.tsx';

export interface AbStepProps {
  board: AntibodyBoardResponse;
  step: AntibodyStepView;
  me: MeResponse;
  actions: AbActions;
  goStep: (id: AntibodyStepId) => void;
  /** 화면 개발용 고정 자료를 보고 있나 — 단계마다 그 사실을 적어요. */
  mock: boolean;
}

export const AB_STEP_VIEWS: Record<AntibodyStepId, (props: AbStepProps) => ReactElement> = { A1, A2, A3, A4, A5, A6 };
