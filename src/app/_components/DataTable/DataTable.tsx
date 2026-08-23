'use client';

import type { ReactNode } from 'react';
import Skeleton from '@components/Skeleton/Skeleton';
import styles from './DataTable.module.scss';

export type DataTableColumn<T> = {
  id: string,
  header: ReactNode,
  className?: string,
  cell: (row: T) => ReactNode,
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[],
  rows: T[],
  getRowKey: (row: T) => string,
  loading?: boolean,
  skeletonRows?: number,
  skeletonColumnCount?: number,
  emptyMessage?: string,
  className?: string,
};

const DEFAULT_SKELETON_ROWS = 8;
const DEFAULT_SKELETON_COLUMN_COUNT = 6;
const SKELETON_BAR_WIDTHS = [ '58%', '74%', '46%', '66%', '40%', '78%' ];

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  skeletonRows = DEFAULT_SKELETON_ROWS,
  skeletonColumnCount = DEFAULT_SKELETON_COLUMN_COUNT,
  emptyMessage,
  className,
}: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;
  const headerColumns = columns.length > 0 || !loading
    ? columns
    : getLoadingColumns(skeletonColumnCount);

  return (
    <div
      className={[ styles.dataTable, className ].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
    >
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {headerColumns.map(column => (
                <th key={column.id} scope="col" className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} aria-hidden>
                  {headerColumns.map((column, columnIndex) => (
                    <td key={column.id} className={column.className}>
                      <Skeleton
                        width={SKELETON_BAR_WIDTHS[(rowIndex + columnIndex) % SKELETON_BAR_WIDTHS.length]}
                        height={14}
                        borderRadius={4}
                      />
                    </td>
                  ))}
                </tr>
              ))
              : rows.map(row => (
                <tr key={getRowKey(row)}>
                  {columns.map(column => (
                    <td key={column.id} className={column.className}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showEmpty && emptyMessage ? (
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      ) : null}
    </div>
  );
}

function getLoadingColumns(count: number): DataTableColumn<unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `loading-column-${index}`,
    header: (
      <Skeleton
        width={SKELETON_BAR_WIDTHS[index % SKELETON_BAR_WIDTHS.length]}
        height={12}
        borderRadius={4}
      />
    ),
    cell: () => null,
  }));
}
