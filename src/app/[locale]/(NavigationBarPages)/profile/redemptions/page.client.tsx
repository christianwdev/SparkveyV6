'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Pagination from '@components/Pagination/Pagination';
import { useRedemptionsHistoryQuery } from '@hooks/useRedemptionsHistoryQuery';
import { PROFILE_HISTORY_PAGE_SIZE } from '@utils/profile';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type { InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';
import { toDate } from '../_utils/date';
import styles from '../profilePage.module.scss';

type RedemptionsPageClientProps = {
  initialRedemptions: InternalRedemption[] | null;
};

function statusTone(status: InternalRedemptionStatus) {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'positive';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'rejected':
      return 'negative';
  }
}

function getRewardLink(row: InternalRedemption): string | null {
  if (row.providerName !== 'tremendous' || row.status !== 'completed') return null;
  if (!('link' in row.meta) || typeof row.meta.link !== 'string') return null;
  return row.meta.link;
}

export default function RedemptionsPageClient({ initialRedemptions }: RedemptionsPageClientProps) {
  const t = useTranslations('ProfileRewards');
  const formatter = useFormatter();
  const [ page, setPage ] = useState(1);

  const { data: redemptions = [], isPending, isFetching } = useRedemptionsHistoryQuery({
    page,
    initialData: page === 1 ? initialRedemptions : undefined,
  });

  const columns: DataTableColumn<InternalRedemption>[] = [
    {
      id: 'reward',
      header: t('table.reward'),
      cell: (row) => row.itemName,
    },
    {
      id: 'price',
      header: t('table.price'),
      cell: (row) => (
        <span className={styles.sparkValue}>
          <Image src="/img/logo.svg" alt="" width={12} height={12} aria-hidden />
          {formatter.number(row.value)}
        </span>
      ),
    },
    {
      id: 'value',
      header: t('table.value'),
      cell: (row) => formatter.number(row.usdValue, {
        style: 'currency',
        currency: 'USD',
      }),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={statusTone(row.status)}>
          {t(`statuses.${row.status}`)}
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
          : '—';
      },
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        const link = getRewardLink(row);
        if (!link) return '—';

        return (
          <a
            className={styles.actionLink}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('viewDetails')}
          </a>
        );
      },
    },
  ];

  const hasNextPage = redemptions.length >= PROFILE_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && redemptions.length === 0);

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <DataTable
        columns={columns}
        rows={redemptions}
        getRowKey={(row) => row.redemptionID}
        loading={loading}
        emptyMessage={t('empty')}
      />

      <Pagination
        page={page}
        pageSize={PROFILE_HISTORY_PAGE_SIZE}
        itemCount={redemptions.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
