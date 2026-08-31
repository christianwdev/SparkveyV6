'use client';

import { Fragment, useState, type ReactNode } from 'react';
import Skeleton from '@components/Skeleton/Skeleton';
import ChevronDown from '~icons/mdi/chevron-down.jsx';
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
  renderExpanded?: (row: T) => ReactNode,
  expandLabel?: string,
  collapseLabel?: string,
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
  renderExpanded,
  expandLabel = 'Show details',
  collapseLabel = 'Hide details',
}: DataTableProps<T>) {
  const [ expandedKey, setExpandedKey ] = useState<string | null>(null);
  const showEmpty = !loading && rows.length === 0;
  const headerColumns = columns.length > 0 || !loading
    ? columns
    : getLoadingColumns(skeletonColumnCount);
  const columnCount = headerColumns.length + (renderExpanded ? 1 : 0);

  return (
    <div
      className={[ styles.dataTable, className ].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
    >
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {renderExpanded ? <th scope="col" className={styles.expandColumn} /> : null}
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
                  {renderExpanded ? (
                    <td className={styles.expandColumn}>
                      <Skeleton width={16} height={16} borderRadius={4} />
                    </td>
                  ) : null}
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
              : rows.map(row => {
                const key = getRowKey(row);
                const expanded = expandedKey === key;

                return (
                  <Fragment key={key}>
                    <tr>
                      {renderExpanded ? (
                        <td className={styles.expandColumn}>
                          <button
                            type="button"
                            className={[ styles.expandButton, expanded ? styles.expanded : '' ].filter(Boolean).join(' ')}
                            aria-expanded={expanded}
                            aria-label={expanded ? collapseLabel : expandLabel}
                            onClick={event => {
                              event.stopPropagation();
                              setExpandedKey(current => current === key ? null : key);
                            }}
                          >
                            <ChevronDown aria-hidden />
                          </button>
                        </td>
                      ) : null}
                      {columns.map(column => (
                        <td key={column.id} className={column.className}>
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                    {expanded && renderExpanded ? (
                      <tr className={styles.expandedDetails}>
                        <td colSpan={columnCount}>
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
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
