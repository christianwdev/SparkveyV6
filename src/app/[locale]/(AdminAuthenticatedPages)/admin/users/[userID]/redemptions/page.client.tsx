'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUserRedemptionsQuery } from '@hooks/useAdminUsers';
import { ADMIN_USER_HISTORY_PAGE_SIZE } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';

import styles from '../history.module.scss';

const STATUS_OPTIONS: Array<'all' | InternalRedemptionStatus> = [
  'all',
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
];
const TYPE_OPTIONS: Array<'all' | InternalRedemptionProvider> = [ 'all', 'ccpayment', 'tremendous' ];

function statusTone(status: InternalRedemptionStatus) {
  if (status === 'completed' || status === 'approved') return 'positive';
  if (status === 'failed' || status === 'rejected') return 'negative';

  return 'warning';
}

function rewardLink(row: InternalRedemption): string | null {
  if (row.providerName !== 'tremendous' || row.status !== 'completed') return null;
  if (!('link' in row.meta) || typeof row.meta.link !== 'string') return null;

  return row.meta.link;
}

export default function AdminUserRedemptionsClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const [ page, setPage ] = useState<number>(1);
  const [ status, setStatus ] = useState<'all' | InternalRedemptionStatus>('all');
  const [ type, setType ] = useState<'all' | InternalRedemptionProvider>('all');

  const { data: redemptions = [], isPending, isFetching } = useAdminUserRedemptionsQuery({
    userID,
    page,
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
  });

  const columns: DataTableColumn<InternalRedemption>[] = [
    {
      id: 'item',
      header: t('table.reward'),
      cell: (row) => row.itemName,
    },
    {
      id: 'provider',
      header: t('table.provider'),
      cell: (row) => row.providerName,
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={statusTone(row.status)}>
          {t(`redemptionStatuses.${row.status}`)}
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
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        const link = rewardLink(row);
        if (!link) return t('na');

        return (
          <a
            className={styles.actionLink}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('actions.viewReward')}
          </a>
        );
      },
    },
  ];

  const hasNextPage = redemptions.length >= ADMIN_USER_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && redemptions.length === 0);

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.redemptionsTitle')}</h2>
          <p>{t('history.redemptionsSubtitle')}</p>
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
              label: option === 'all' ? t('filters.all') : t(`redemptionStatuses.${option}`),
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
              label: option === 'all' ? t('filters.all') : t(`redemptionTypes.${option}`),
            }))}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={redemptions}
        getRowKey={row => row.redemptionID}
        loading={loading}
        emptyMessage={t('history.redemptionsEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={redemptions.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
