/**
 * 작업 화면 공용 부품 — 기능 단계 화면(`board/steps/s*.tsx`)은 여기서 가져다 쓴다. 부품 모양은 `styles.css` 의 '공용 부품' 칸.
 */
export { AiBadge, AVATAR_LABEL, Panel, STATE_MARK, STATE_WORD, StateMark, HeadTabs, Tabs, type TabItem } from './bits.tsx';
export { blocks, ReasonChips, type ReasonChip, type ReasonChipsProps, type Verdict } from './ReasonChips.tsx';
export { Confirm, type ConfirmProps } from './Confirm.tsx';
export { DocSectionEditor, type DocSectionEditorProps, type DocSectionStale, type DocSectionValue } from './DocSectionEditor.tsx';
export { HBars, Histogram, type BarRow, type HistMark } from './charts.tsx';
export { clearBench, useBenchState, useLocalTab } from './useLocalTab.ts';
export { useLive, type Live } from './useLive.ts';
