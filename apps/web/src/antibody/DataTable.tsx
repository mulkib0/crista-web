/**
 * 뷰어의 '표 대안'(설계 §6.4 U12) — 3D 로만 보이는 내용이 없게, 모든 뷰어 옆에 같은 내용의 표를 둬요.
 * 캔버스는 화면 낭독기에 아무것도 전하지 않으므로 학습 목표가 뷰어 안에만 있으면 안 돼요.
 *
 * 표 모양은 `styles.css` 의 `table` · `.tbl-w` 를 그대로 써요(새 표 CSS 를 만들지 않아요).
 */
import { useId, type ReactNode } from 'react';

export interface Column<R> {
  key: string;
  label: string;
  /** 숫자 칸 — 오른쪽 맞춤 · 고정폭 숫자. */
  num?: boolean;
  cell: (row: R, index: number) => ReactNode;
}

export interface DataTableProps<R> {
  /** 표 제목 — 화면 낭독기가 먼저 읽어요. 보이게 둬요. */
  caption: string;
  columns: readonly Column<R>[];
  rows: readonly R[];
  rowKey: (row: R, index: number) => string;
  /** 줄 강조 — 'on' 라임(내 것 · 지금 고른 것) · 'ref' 사선(원본 비교군) · 'dim' 흐림(옛 결과). */
  rowTone?: (row: R, index: number) => 'on' | 'ref' | 'dim' | undefined;
  empty?: string;
  /** 표 아래 한 줄 요약(예: 'CDR-H3 가 7곳에서 닿아 있어요'). */
  summary?: ReactNode;
}

export function DataTable<R>({ caption, columns, rows, rowKey, rowTone, empty, summary }: DataTableProps<R>) {
  const id = useId();
  if (rows.length === 0) {
    return (
      <>
        <p className="lab" style={{ margin: '0 0 6px' }}>{caption}</p>
        <p className="empty">{empty ?? '아직 볼 줄이 없어요.'}</p>
      </>
    );
  }
  return (
    <div className="tbl-w">
      {/* 표 제목은 표 밖에 둬요 — `<caption>` 은 좁은 섬에서 글자가 한 자씩 세로로 접혀요. 표에는 `aria-labelledby` 로 이어요. */}
      <p className="lab" id={`${id}-c`} style={{ margin: '0 0 6px' }}>{caption}</p>
      <table aria-labelledby={`${id}-c`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? 'num' : undefined} scope="col">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const tone = rowTone?.(row, i);
            return (
              <tr key={rowKey(row, i)} className={tone}>
                {columns.map((c) => (
                  <td key={c.key} className={c.num ? 'num' : undefined}>{c.cell(row, i)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {summary && (
          <tfoot>
            <tr>
              <td colSpan={columns.length}>{summary}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
