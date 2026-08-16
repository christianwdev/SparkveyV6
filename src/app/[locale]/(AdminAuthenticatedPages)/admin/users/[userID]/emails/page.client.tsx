'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import { useAdminUserEmailsQuery } from '@hooks/useAdminUsers';
import { ADMIN_USER_HISTORY_PAGE_SIZE } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type { AdminEmailActionable } from 'types/AdminUser';
import type EmailActionable from 'types/EmailActionable';

import styles from '../history.module.scss';

const TYPE_OPTIONS: Array<'all' | EmailActionable['type']> = [
  'all',
  'verification',
  'forgotPassword',
  'emailChange',
  'accountDeletion',
];

export default function AdminUserEmailsClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const [ page, setPage ] = useState<number>(1);
  const [ type, setType ] = useState<'all' | EmailActionable['type']>('all');

  const { data: emails = [], isPending, isFetching } = useAdminUserEmailsQuery({
    userID,
    page,
    type: type === 'all' ? undefined : type,
  });

  const columns: DataTableColumn<AdminEmailActionable>[] = [
    {
      id: 'type',
      header: t('table.type'),
      cell: (row) => t(`emailTypes.${row.type}`),
    },
    {
      id: 'email',
      header: t('fields.email'),
      cell: (row) => row.email,
    },
    {
      id: 'issued',
      header: t('table.issued'),
      cell: (row) => {
        const date = toDate(row.issueDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'expiry',
      header: t('table.expires'),
      cell: (row) => {
        const date = toDate(row.expiryDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={row.deactivatedAt ? 'negative' : 'positive'}>
          {row.deactivatedAt ? t('status.deactivated') : t('status.active')}
        </span>
      ),
    },
    {
      id: 'id',
      header: t('table.actionableID'),
      cell: (row) => <span className={styles.idValue}>{row.actionableID}</span>,
    },
  ];

  const hasNextPage = emails.length >= ADMIN_USER_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && emails.length === 0);

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.emailsTitle')}</h2>
          <p>{t('history.emailsSubtitle')}</p>
        </div>
        <div className={styles.filters}>
          <Dropdown
            label={t('table.type')}
            selected={type}
            setValue={value => {
              setType(value);
              setPage(1);
            }}
            values={TYPE_OPTIONS.map(option => ({
              value: option,
              label: option === 'all' ? t('filters.all') : t(`emailTypes.${option}`),
            }))}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={emails}
        getRowKey={row => `${row.actionableID}-${row.issueDate}`}
        loading={loading}
        emptyMessage={t('history.emailsEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={emails.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
