'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Pagination from '@components/Pagination/Pagination';
import { useEarningsHistoryQuery } from '@hooks/useEarningsHistoryQuery';
import { PROFILE_HISTORY_PAGE_SIZE } from '@utils/profile';
import type { InternalEarningStatus, InternalOfferEarning } from 'types/Earnings/InternalEarning';
import { toDate } from '../_utils/date';
import styles from '../profilePage.module.scss';

type EarningsPageClientProps = {
  initialEarnings: InternalOfferEarning[] | null;
};

function statusTone(status: InternalEarningStatus) {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'held':
    case 'providerPending':
      return 'warning';
    case 'reversed':
      return 'negative';
  }
}

function shortActivityId(conversionID: string) {
  if (conversionID.length <= 6) return conversionID;

  return `${conversionID.slice(0, 3)}..${conversionID.slice(-3)}`;
}

function statusDate(row: InternalOfferEarning) {
  if (row.status === 'held') return toDate(row.heldUntil);
  if (row.status === 'reversed') return toDate(row.reversedAt);

  return null;
}

export default function EarningsPageClient({ initialEarnings }: EarningsPageClientProps) {
  const t = useTranslations('ProfileActivity');
  const formatter = useFormatter();
  const [ page, setPage ] = useState(1);
  const [ copiedId, setCopiedId ] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: earnings = [], isPending, isFetching } = useEarningsHistoryQuery({
    page,
    type: 'offer',
    initialData: page === 1 ? initialEarnings : undefined,
  });

  const copyActivityId = async (conversionID: string) => {
    try {
      await navigator.clipboard.writeText(conversionID);
      setCopiedId(conversionID);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => {
        setCopiedId((current) => (current === conversionID ? null : current));
      }, 2000);
    } catch {
      // Clipboard write can fail if permission is denied.
    }
  };

  const columns: DataTableColumn<InternalOfferEarning>[] = [
    {
      id: 'activityId',
      header: t('table.activityId'),
      cell: (row) => {
        const isCopied = copiedId === row.conversionID;

        return (
          <button
            type="button"
            className={styles.activityId}
            onClick={() => {
              void copyActivityId(row.conversionID);
            }}
            aria-label={isCopied ? t('copied') : t('copyActivityId')}
          >
            {shortActivityId(row.conversionID)}
            <span className={styles.tooltip} role="tooltip">
              {isCopied ? t('copied') : row.conversionID}
            </span>
          </button>
        );
      },
    },
    {
      id: 'offer',
      header: t('table.offer'),
      cell: (row) => row.offerDisplayName || row.offerName,
    },
    {
      id: 'provider',
      header: t('table.provider'),
      cell: (row) => row.provider,
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => {
        const date = statusDate(row);
        const formattedDate = date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : null;
        const tooltipKey = row.status === 'held' || row.status === 'reversed'
          ? row.status
          : null;

        return (
          <span
            className={styles.status}
            data-tone={statusTone(row.status)}
            data-has-tooltip={formattedDate && tooltipKey ? 'true' : undefined}
            tabIndex={formattedDate && tooltipKey ? 0 : undefined}
          >
            {t(`statuses.${row.status}`)}
            {formattedDate && tooltipKey ? (
              <span className={styles.tooltip} role="tooltip">
                {t(`statusDates.${tooltipKey}`, { date: formattedDate })}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: 'earned',
      header: t('table.earned'),
      cell: (row) => (
        <span className={styles.sparkValue}>
          <Image src="/img/logo.svg" alt="" width={12} height={12} aria-hidden />
          {formatter.number(row.value)}
        </span>
      ),
    },
    {
      id: 'date',
      header: t('table.date'),
      cell: (row) => {
        const date = toDate(row.createdAt);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
  ];

  const hasNextPage = earnings.length >= PROFILE_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && earnings.length === 0);

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <DataTable
        columns={columns}
        rows={earnings as InternalOfferEarning[]}
        getRowKey={(row) => `${row.conversionID}-${String(row.createdAt)}`}
        loading={loading}
        emptyMessage={t('empty')}
      />

      <Pagination
        page={page}
        pageSize={PROFILE_HISTORY_PAGE_SIZE}
        itemCount={earnings.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
