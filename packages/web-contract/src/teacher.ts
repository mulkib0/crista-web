/**
 * 교사 화면(설계 §9 · learning-grant §5 교사 화면) — 기능마다 흩어진 교사 API 를 한 화면에서 읽는 데 더 필요한 모양만 둔다.
 * 기능별 교사 API(시계 `CLOCK_API` · 서류 심사 `REVIEW_API` · 임상 `CLINICAL_API` · 학습 `LEARN_API` · 3.2 `PRECLINICAL_API` · 전광판 `MARKET_API`)는
 * 그 기능 규격에 있다. 서버: apps/server/src/features/teacher.ts(모둠 진행) · reviews.ts(교사 심사 목록). 화면: apps/web/src/teacher/.
 */
import type { NoteSection, StepId, StepView } from './pipeline.ts';
import type { DocReviewVerdict, DocReviewView, ReviewChecklistItem } from './review.ts';

// ── ⑧ 모둠별 진행 · 막힌 이유 · 연구 노트 ──

/** 모둠 한 줄 — 9단계 상태(학생 사이드바와 같은 서버 판정 `computeSteps`) · 지금 단계 · 막힌 이유 · 연구 노트. */
export interface TeacherTeamProgress {
  teamId: string;
  plot: number;
  ink: number;
  startupName: string | null;
  ticker: string | null;
  /** 등기 전이면 false — 단계 · 노트가 없다. */
  registered: boolean;
  members: Array<{ userId: string; displayName: string }>;
  balanceCrista: number;
  /** 표적 버전(1.1 을 다시 고르면 올라간다). */
  revisionNo: number;
  diseaseId: string | null;
  targetId: string | null;
  steps: StepView[];
  /** 지금 단계 — 아직 끝나지 않은 첫 단계(모두 끝났으면 마지막 단계). */
  currentStep: StepId;
  /** 막힌 이유 — 보류 · 연구비 부족 단계, 심사 중 · 임상 결과 정리 중(자동 공개), 선생님 몫인 학습 이의 제기. 없으면 빈 배열. */
  stuck: TeacherStuck[];
  /** 이 표적 버전의 연구 노트(단계 · 칸마다 마지막 판). */
  notes: Array<{ stepId: StepId; section: NoteSection; body: string; byName: string | null; updatedAt: string }>;
  /** 마지막 활동(작업 · 노트 · 원장) — 없으면 null. */
  lastActivityAt: string | null;
}

export interface TeacherStuck {
  kind: 'held' | 'blocked' | 'review' | 'trial' | 'appeal';
  stepId: StepId | null;
  /** 사람이 읽는 한 줄(해요체). */
  message: string;
  /** 선생님이 손을 대야 풀리는가 — 파이프라인 단계는 교사를 기다리지 않는다(2026-10-24). 지금은 학습 이의 제기만 true. */
  teacher: boolean;
  /** 같은 까닭으로 묶인 건수(심사 · 이의). 없으면 1. */
  count?: number;
}

export interface TeacherProgressResponse {
  classId: string;
  gameDay: number;
  teams: TeacherTeamProgress[];
}

// ── ③ 서류 심사 — 교사 목록 한 줄 ──

/** 교사 목록에는 모둠 · 원래 판정 · 심사한 판의 칸 본문(스냅숏)을 함께 싣는다 — 교사가 그 판을 읽고 판정 · 정정한다. */
export interface TeacherReviewView extends DocReviewView {
  teamId: string;
  /** 교사가 정정했으면 원래 판정(AI · 규칙) — 없으면 null. */
  originalVerdict: DocReviewVerdict | null;
  /** 심사한 판의 칸 본문(칸 키 → 글). */
  sections: Record<string, string>;
  checklist: ReviewChecklistItem[];
}

export interface TeacherReviewsResponse {
  reviews: TeacherReviewView[];
}

export const TEACHER_API = {
  /** 모둠별 진행 · 막힌 이유 · 연구 노트. */
  progress: (classId: string) => `/api/teacher/classes/${classId}/progress`,
  /** 서류 심사 — 기본은 대기 · 플래그 · 교사 판정 건, `all` 이면 최근 판정 건까지(정정용). */
  reviews: (classId: string, all = false) => `/api/teacher/classes/${classId}/reviews${all ? '?all=1' : ''}`,
} as const;
