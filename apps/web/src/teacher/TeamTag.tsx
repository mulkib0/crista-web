/**
 * 모둠 꼬리표 — 잉크 점 · 티커(등기 전이면 'N모둠'). 교사 목록 여러 곳이 모둠 id 만 받아 이름을 붙일 때 쓴다.
 */
import type { TeacherClassDetail } from '@crista-web/web-contract';
import { ink } from '../ink.ts';

export type TeamLookup = ReadonlyMap<string, TeacherClassDetail['teams'][number]>;

export const teamLookup = (detail: TeacherClassDetail | null): TeamLookup => new Map((detail?.teams ?? []).map((t) => [t.id, t]));

export function TeamTag({ id, teams }: { id: string | null | undefined; teams: TeamLookup }) {
  const t = id ? teams.get(id) : undefined;
  if (!t) return <span className="tc-tag muted">—</span>;
  return (
    <span className="tc-tag" title={t.startupName ?? `${t.plot}모둠`}>
      <i className="inkd" style={{ background: ink(t.ink).base }} aria-hidden="true" />
      {t.ticker ? <b className="mono">{t.ticker}</b> : <b>{t.plot}모둠</b>}
      {t.startupName && <span className="tc-tag-n">{t.startupName}</span>}
    </span>
  );
}
