/**
 * 단계 → 화면 표(9단계, 설계 §6.1). 기능 화면은 자기 파일(`s12.tsx` 등)만 고치고 이 표는 그대로 둔다.
 * 4.1 · 4.2 는 상세 설계를 미뤄 잠긴 안내(`locked.tsx`).
 */
import type { ComponentType } from 'react';
import type { StepId } from '@crista-web/web-contract';
import type { StepProps } from './common.tsx';
import { LockedStep } from './locked.tsx';
import { Step11 } from './s11.tsx';
import { Step12 } from './s12.tsx';
import { Step21 } from './s21.tsx';
import { Step22 } from './s22.tsx';
import { Step31 } from './s31.tsx';
import { Step32 } from './s32.tsx';
import { Step33 } from './s33.tsx';
import { Step41 } from './s41.tsx';
import { Step42 } from './s42.tsx';

export const STEP_VIEWS: Record<StepId, ComponentType<StepProps>> = {
  '1.1': Step11,
  '1.2': Step12,
  '2.1': Step21,
  '2.2': Step22,
  '3.1': Step31,
  '3.2': Step32,
  '3.3': Step33,
  '4.1': Step41,
  '4.2': Step42,
};

export { initialBench, type Bench, type StepProps } from './common.tsx';
