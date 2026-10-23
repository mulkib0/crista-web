/**
 * 트랙 등록표(3판 통합 · 2026-10-24) — 소분자 신약(`drug`)과 항체 랩(`antibody`, 다른 세션)이 같은 작업 화면 틀을 나눠 쓰는 약속.
 *
 * - 화면(Board.tsx)은 단계 목록 · 단계 화면을 고정으로 들지 않고 `StepRegistry`(apps/web/src/board/registry.ts)를 받는다.
 *   그 등록표의 단계 줄 모양이 여기 `TrackStep` 이다 — `{ id, group, index, title, sub }`.
 * - 서버는 `computeSteps({ track, … })`(apps/server/src/pipeline.ts)가 트랙별 규칙 표 `TRACK_STEP_RULES` 로 나눠 센다.
 * - 지금 구현된 트랙은 `drug` 하나다. `antibody` 는 빈 등록표 — 항체 랩이 자기 단계 줄 · 화면 · 규칙을 꽂을 자리다.
 *   항체 단계 id 는 소분자 9단계(`StepId`)와 겹치지 않게 `ab.` 접두 등 자기 꼴을 쓴다(전광판 소식 kind 는 FMARKET 의 `antibody_*`).
 */
import { GROUP_TITLE, STEP_IDS, STEP_META } from './pipeline.ts';

export type TrackId = 'drug' | 'antibody';
export const TRACK_IDS: readonly TrackId[] = ['drug', 'antibody'];
/** 지금 모든 모둠의 트랙 — 프로그램에 트랙 칸이 생기기 전까지 서버는 이 값을 준다. */
export const DEFAULT_TRACK: TrackId = 'drug';
export const isTrackId = (v: unknown): v is TrackId => typeof v === 'string' && (TRACK_IDS as readonly string[]).includes(v);

/** 등록표의 단계 한 줄 — 사이드바 · 머리 섬이 그리는 것. id 는 트랙마다 자기 꼴(소분자 '1.1' … '4.2'). */
export interface TrackStep {
  id: string;
  group: number;
  index: number;
  title: string;
  sub: string;
}

export interface TrackManifest {
  track: TrackId;
  /** 사람이 읽는 트랙 이름(교사 화면 · 문서). */
  label: string;
  /** 묶음 번호 → 묶음 제목(사이드바 묶음 머리). */
  groups: Readonly<Record<number, string>>;
  steps: readonly TrackStep[];
}

export const DRUG_TRACK: TrackManifest = {
  track: 'drug',
  label: '소분자 신약',
  groups: GROUP_TITLE,
  steps: STEP_IDS.map((id) => ({ id, group: STEP_META[id].group, index: STEP_META[id].index, title: STEP_META[id].title, sub: STEP_META[id].sub })),
};

/** 항체 랩이 채울 자리 — 지금은 비어 있다(단계 0개). */
export const ANTIBODY_TRACK: TrackManifest = { track: 'antibody', label: '항체', groups: {}, steps: [] };

export const TRACKS: Readonly<Record<TrackId, TrackManifest>> = { drug: DRUG_TRACK, antibody: ANTIBODY_TRACK };
