/**
 * 가이드북 원고의 모양(타입) · 창 문구. 개념 원고 자체는 `guide-data.ts`(창과 함께 처음 열 때 불러온다).
 *
 * 원고 출처: 교사 연수 슬라이드(docs/slides/2026-10-24-teacher-training-relay-v2.html)의 PART 2 '개념 깊이 보기'와 PART 4 단계별 상세.
 * Gemini 4 Argon (High)가 학생 말로 옮기고 Claude 가 사실 · 숫자 · 용어를 대조했다 — 지시문 · 원문 · 검토는 `.review/2026-10-24-guidebook/`.
 */
import { GROUP_TITLE, type StepId } from '@crista-web/web-contract';

export interface GuideTerm {
  /** 전체에서 유일한 영문 식별자(카드 앵커 `gb-{id}`). */
  id: string;
  term: string;
  /** 영문 이름 · 약어 — 없으면 빈 문자열. */
  en: string;
  oneLine: string;
  body: string[];
  formula: string;
  formulaNote: string;
  example: string;
  analogy: string;
  caution: string;
  /** 이 플랫폼 화면에서는 어떻게 쓰이는지. */
  inClass: string;
}

export interface GuideStep {
  stepId: StepId;
  lede: string;
  terms: GuideTerm[];
}

export interface Guide {
  intro: { lede: string; points: Array<{ h: string; p: string }> };
  steps: GuideStep[];
}

export const GUIDE_COPY = {
  button: '가이드북',
  buttonTitle: '단계마다 어려운 개념을 풀어 둔 사전',
  eyebrow: '단계별 개념 사전',
  title: '가이드북',
  close: '가이드북 닫기',
  findLabel: '개념 찾기',
  findPlaceholder: '개념 찾기 · 예: TPSA, 검정력',
  tabsLabel: '가이드북 단계',
  introTab: '시작하기',
  introTitle: '가이드북 시작하기',
  now: '지금 단계',
  group: (g: 1 | 2 | 3 | 4) => `${g}묶음 ${GROUP_TITLE[g]}`,
  indexLabel: '이 단계의 개념',
  openAll: '모두 펼치기',
  foldAll: '모두 접기',
  toNow: (id: StepId) => `지금 단계(${id}) 개념 보기`,
  found: (q: string, n: number) => `'${q}' 개념 ${n}개를 찾았어요.`,
  notFound: (q: string) => `'${q}'에 맞는 개념이 없어요. 다른 말로 찾아보세요.`,
  example: '예시',
  analogy: '비유',
  caution: '주의',
  inClass: '이 화면에서는',
  source: '출처: CRISTA 교사 연수 자료(2026-10-24)의 개념 해설을 학생용으로 옮겼어요. 3 · 4단계의 동물실험 · 임상 · 심사 결과는 수업용 모의 판정이에요.',
} as const;
