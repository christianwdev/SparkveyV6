'use client';

import { useTranslations } from 'next-intl';
import ChevronLeftIcon from '~icons/solar/alt-arrow-left-linear.jsx';
import ChevronRightIcon from '~icons/solar/alt-arrow-right-linear.jsx';
import styles from './Pagination.module.scss';

type PaginationProps = {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

function getVisiblePages(page: number, hasNextPage: boolean): number[] {
  const lastPage = hasNextPage ? page + 1 : page;
  const pages: number[] = [];

  for (let current = 1; current <= lastPage; current += 1) {
    pages.push(current);
  }

  if (pages.length <= 7) return pages;

  const visible = new Set<number>([ 1, lastPage, page ]);
  for (let offset = 1; offset <= 1; offset += 1) {
    if (page - offset > 1) visible.add(page - offset);
    if (page + offset < lastPage) visible.add(page + offset);
  }

  return [ ...visible ].sort((a, b) => a - b);
}

export default function Pagination({
  page,
  pageSize,
  itemCount,
  hasNextPage,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  const t = useTranslations('Pagination');

  if (page <= 1 && !hasNextPage) return null;

  const rangeStart = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + itemCount;
  const visiblePages = getVisiblePages(page, hasNextPage);

  return (
    <div className={[ styles.pagination, className ].filter(Boolean).join(' ')}>
      <p className={styles.range}>
        {t('range', { start: rangeStart, end: rangeEnd })}
      </p>

      <div className={styles.controls} role="navigation" aria-label={t('label')}>
        <button
          type="button"
          className={styles.arrow}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('previous')}
        >
          <ChevronLeftIcon aria-hidden />
        </button>

        {visiblePages.map((pageNumber, index) => {
          const previous = visiblePages[index - 1];
          const showEllipsis = previous !== undefined && pageNumber - previous > 1;

          return (
            <span key={pageNumber} className={styles.pageGroup}>
              {showEllipsis ? <span className={styles.ellipsis}>…</span> : null}
              <button
                type="button"
                className={[
                  styles.pageButton,
                  pageNumber === page ? styles.pageButtonActive : '',
                ].filter(Boolean).join(' ')}
                disabled={disabled}
                onClick={() => onPageChange(pageNumber)}
                aria-label={t('page', { page: pageNumber })}
                aria-current={pageNumber === page ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          className={styles.arrow}
          disabled={disabled || !hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('next')}
        >
          <ChevronRightIcon aria-hidden />
        </button>
      </div>
    </div>
  );
}
