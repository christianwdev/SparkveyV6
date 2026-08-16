'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUserEarningsQuery } from '@hooks/useAdminUsers';
import { ADMIN_USER_HISTORY_PAGE_SIZE } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';

import styles from '../history.module.scss';

const STATUS_OPTIONS: Array<'all' | InternalEarningStatus> = [
  'all',
  'completed',
  'providerPending',
  'held',
  'reversed',
];
const TYPE_OPTIONS: Array<'all' | InternalEarning['type']> = [ 'all', 'offer', 'shopping' ];

function statusTone(status: InternalEarningStatus) {
  if (status === 'completed') return 'positive';
  if (status === 'reversed') return 'negative';

  return 'warning';
}

function earningName(row: InternalEarning): string {
  if (row.type === 'offer') return row.offerDisplayName || row.offerName;

  return row.storeDisplayName || row.storeName;
}

export default function AdminUserEarningsClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const [ page, setPage ] = useState<number>(1);
  const [ status, setStatus ] = useState<'all' | InternalEarningStatus>('all');
  const [ type, setType ] = useState<'all' | InternalEarning['type']>('all');

  const { data: earnings = [], isPending, isFetching } = useAdminUserEarningsQuery({
    userID,
    page,
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
  });

  const columns: DataTableColumn<InternalEarning>[] = [
    {
      id: 'name',
      header: t('table.name'),
      cell: (row) => earningName(row),
    },
    {
      id: 'type',
      header: t('table.type'),
      cell: (row) => t(`earningTypes.${row.type}`),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={statusTone(row.status)}>
          {t(`earningStatuses.${row.status}`)}
        </span>
      ),
    },
    {
      id: 'value',
      header: t('table.sparks'),
      cell: (row) => <SparksAmount amount={row.value} />,
    },
    {
      id: 'usd',
      header: t('table.usd'),
      cell: (row) => formatter.number(row.usdValue, { style: 'currency', currency: 'USD' }),
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

  const hasNextPage = earnings.length >= ADMIN_USER_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && earnings.length === 0);

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.earningsTitle')}</h2>
          <p>{t('history.earningsSubtitle')}</p>
        </div>
        <div className={styles.filters}>
          <Dropdown
            label={t('table.status')}
            selected={status}
            setValue={value => {
              setStatus(value);
              setPage(1);
            }}
            values={STATUS_OPTIONS.map(option => ({
              value: option,
              label: option === 'all' ? t('filters.all') : t(`earningStatuses.${option}`),
            }))}
          />
          <Dropdown
            label={t('table.type')}
            selected={type}
            setValue={value => {
              setType(value);
              setPage(1);
            }}
            values={TYPE_OPTIONS.map(option => ({
              value: option,
              label: option === 'all' ? t('filters.all') : t(`earningTypes.${option}`),
            }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={earnings}
        getRowKey={row => `${row.conversionID}-${row.createdAt}`}
        loading={loading}
        emptyMessage={t('history.earningsEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={earnings.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
