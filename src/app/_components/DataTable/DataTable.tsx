'use client';

import type { ReactNode } from 'react';
import Skeleton from '@components/Skeleton/Skeleton';
import styles from './DataTable.module.scss';

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  className?: string;
};

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  skeletonRows = 10,
  emptyMessage,
  className,
}: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <div className={[ styles.dataTable, className ].filter(Boolean).join(' ')}>
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
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
                  {columns.map((column) => (
                    <td key={column.id} className={column.className}>
                      <Skeleton width="70%" height={14} borderRadius={4} />
                    </td>
                  ))}
                </tr>
              ))
              : rows.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
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
