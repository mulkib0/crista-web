/**
 * 단계 등록표(3판 통합 · 2026-10-24) — 작업 화면(Board.tsx)이 단계 목록 · 단계 화면을 고정으로 들지 않고 이 표를 받는다.
 *
 *   StepRegistry = { track: 'drug' | 'antibody'; steps: Array<{ id; group; index; title; sub }>; groups; render(id) }
 *
 * - `drug`(소분자 9단계)는 web-contract `DRUG_TRACK` 줄 + `steps/index.ts` 의 `STEP_VIEWS` 화면이다.
 * - `antibody` 는 빈 등록표 — 항체 랩(다른 세션)이 `registerStepRegistry(...)` 로 자기 줄 · 화면을 꽂는다.
 *   항체 단계 화면도 `StepProps` 를 받고 `StepLayout`(시안 21 둥근 섬) 위에 그린다.
 * - 화면은 `board.track`(서버 `loadBoard` 가 준다 — 없으면 'drug')으로 등록표를 고른다. `<Board registry={…}>` 로 직접 넘길 수도 있다.
 */
import type { ComponentType } from 'react';
import { ANTIBODY_TRACK, DEFAULT_TRACK, DRUG_TRACK, type StepId, type TrackId, type TrackStep } from '@crista-web/web-contract';
import { STEP_VIEWS, type StepProps } from './steps/index.ts';

export interface StepRegistry {
  track: TrackId;
  /** 사이드바 단계 줄(묶음 · 번호 · 제목 · 보조 줄) — 서버 `board.steps` 의 상태와 id 로 맞춘다. */
  steps: readonly TrackStep[];
  /** 묶음 번호 → 묶음 제목. */
  groups: Readonly<Record<number, string>>;
  /** 단계 화면 — 없는 id 면 null(화면은 빈 안내를 그린다). */
  render(id: string): ComponentType<StepProps> | null;
}

export const DRUG_REGISTRY: StepRegistry = {
  track: 'drug',
  steps: DRUG_TRACK.steps,
  groups: DRUG_TRACK.groups,
  render: (id) => STEP_VIEWS[id as StepId] ?? null,
};

/** 항체 랩이 채울 자리 — 지금은 단계 0개. */
export const ANTIBODY_REGISTRY: StepRegistry = {
  track: 'antibody',
  steps: ANTIBODY_TRACK.steps,
  groups: ANTIBODY_TRACK.groups,
  render: () => null,
};

const REGISTRIES: Record<TrackId, StepRegistry> = { drug: DRUG_REGISTRY, antibody: ANTIBODY_REGISTRY };

/** 트랙의 등록표를 바꿔 끼운다(항체 랩이 앱 시작 때 한 번 부른다). */
export function registerStepRegistry(registry: StepRegistry): void {
  REGISTRIES[registry.track] = registry;
}

export function registryFor(track: TrackId | undefined): StepRegistry {
  return REGISTRIES[track ?? DEFAULT_TRACK] ?? DRUG_REGISTRY;
}
