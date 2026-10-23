/**
 * 교사 화면 칸 — 사이드바 섬의 4묶음(학생 화면 사이드바와 같은 묶음 색). 고른 칸은 브라우저 로컬(useLocalTab · 서버로 보내지 않음).
 */
export type TeacherSection = 'progress' | 'class' | 'reviews' | 'clinical' | 'learn' | 'ethics' | 'market' | 'llm' | 'antibody';

export const SECTIONS: readonly TeacherSection[] = ['progress', 'class', 'reviews', 'clinical', 'learn', 'ethics', 'market', 'llm', 'antibody'];

export interface SectionMeta {
  id: TeacherSection;
  no: string;
  label: string;
  sub: string;
  /** 머리 섬 한 줄 설명. */
  lede: string;
}

export const NAV_GROUPS: ReadonlyArray<{ g: 1 | 2 | 3 | 4; title: string; items: SectionMeta[] }> = [
  {
    g: 1,
    title: '수업 진행',
    items: [
      { id: 'progress', no: '①', label: '모둠 진행', sub: '지금 단계 · 막힌 이유 · 노트', lede: '모둠마다 지금 단계와 막힌 이유를 봐요. 선생님이 손대야 풀리는 곳은 [열기]로 바로 가요.' },
      { id: 'class', no: '②', label: '학급 · 명단', sub: '학생 받기 · 모둠 배정', lede: '학급을 만들고, 학생 받기를 열고 닫고, 모둠을 배정해요.' },
    ],
  },
  {
    g: 2,
    title: '판정',
    items: [
      { id: 'reviews', no: '③', label: '서류 심사', sub: '대기 · 플래그 · 정정', lede: 'AI 심사가 멈췄거나(꺼짐 · 거절) 끼워 넣기가 걸린 서류를 읽고 직접 판정해요. 판정 난 서류도 정정할 수 있어요(원래 판정은 남아요).' },
      { id: 'clinical', no: '④', label: '임상 판정', sub: '다시 시뮬레이션 · 직접 판정', lede: '임상 시뮬레이션이 막히면 다시 돌리거나 직접 판정해요. 규칙(game-rules) 참고 판정을 옆에 함께 보여요.' },
    ],
  },
  {
    g: 3,
    title: '학습 · 윤리',
    items: [
      { id: 'learn', no: '⑤', label: '학습 연구비', sub: '현황 · 이의 · 정정 · 면제', lede: '학생 × 단계 학습 현황과 모둠 가동률을 봐요. 이의 제기를 처리하고, 점수를 고치고, 결석 · 조퇴 학생을 면제해요.' },
      { id: 'ethics', no: '⑥', label: '3.2 동물 수', sub: '윤리 토론 자료', lede: '학급이 3.2 에서 쓴 동물 수와 대체 시험으로 줄인 수예요. 윤리 토론 자료로 띄워 보세요.' },
    ],
  },
  {
    g: 4,
    title: '전광판 · 비용',
    items: [
      { id: 'market', no: '⑦', label: '전광판 · 마감', sub: '마감 시각 · 최종 순위 · 공지', lede: '마감 시각을 정하거나 지금 마감하고, 최종 순위를 봐요. 공지 · 정정 소식을 전광판에 올려요.' },
      { id: 'llm', no: '⑧', label: 'AI 사용량', sub: '오늘 학급 호출 · 토큰', lede: '오늘(한국 시각) 이 학급이 쓴 AI 호출 수와 토큰이에요. 하루 상한을 넘으면 AI 심사 · 채점이 선생님 몫으로 넘어와요.' },
      // 트랙 2 — 내용은 전부 `apps/web/src/antibody/TeacherPanel.tsx` 에 있어요(항체 설계 §11.4).
      { id: 'antibody', no: '⑨', label: '항체 설계 랩', sub: '점수 가중치 · 대기 줄 · 정정', lede: '항체 설계 랩의 점수 가중치와 문턱을 정하고, 외부 자료 대기 줄을 보고, 기업가치를 정정해요.' },
    ],
  },
];

export const SECTION_META: Record<TeacherSection, SectionMeta> = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i]))) as Record<TeacherSection, SectionMeta>;
