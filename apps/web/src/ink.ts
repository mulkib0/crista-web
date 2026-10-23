import { formatCentsAsCrista } from '@crista-web/web-contract';

/**
 * 모둠 잉크 8색(설계 §5.3) — 앞 4색은 crista `TEAM_INK`(T1~T4) 그대로, 뒤 4색은 06 팔레트에서 더 정했다
 * (도장 빨강 · 물 파랑 · 피부 갈색 · 성공 초록). 밝은 바탕용(`base`)과 검은 LED 띠용(`led`)이 짝이다.
 */
export const INKS: ReadonlyArray<{ base: string; led: string; name: string }> = [
  { base: '#183080', led: '#7d9bff', name: '남색' },
  { base: '#007868', led: '#3fe0c8', name: '청록' },
  { base: '#A048C8', led: '#e08cff', name: '보라' },
  { base: '#D88828', led: '#ffb24a', name: '주황' },
  { base: '#B82010', led: '#ff6b5a', name: '도장 빨강' },
  { base: '#4890E8', led: '#8cc8ff', name: '하늘' },
  { base: '#985830', led: '#e0a070', name: '갈색' },
  { base: '#2F6F2A', led: '#8dff5a', name: '초록' },
];

export const ink = (n: number | null | undefined): { base: string; led: string; name: string } => INKS[((n ?? 1) - 1 + 8) % 8]!;

/** 비용 · 잔액 표시 — 센트를 받아 크리스타로 쓴다(화면 전체가 같은 단위 · 규격 `money.ts` 의 1 크리스타 = 20 센트). */
export const money = (cents: number): string => formatCentsAsCrista(cents);
