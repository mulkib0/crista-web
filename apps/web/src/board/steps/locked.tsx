/**
 * 잠긴 단계 · 상세 설계를 미룬 단계(4.1 · 4.2 — 설계 §6.1 '4.1 · 4.2 상세 설계는 미룬다'). '무엇을 배우나 · 무엇이 필요한가' + 연구 노트 초안.
 */
import { StepPreview, type StepProps } from './common.tsx';

export function LockedStep({ board, step }: StepProps) {
  return <StepPreview board={board} step={step} note={step.group === 4 ? '상세 설계를 미뤘어요' : undefined} />;
}
