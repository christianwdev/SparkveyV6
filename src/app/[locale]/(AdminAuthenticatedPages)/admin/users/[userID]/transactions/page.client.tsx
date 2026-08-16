'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Pagination from '@components/Pagination/Pagination';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUserTransactionsQuery } from '@hooks/useAdminUsers';
import { ADMIN_USER_HISTORY_PAGE_SIZE } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type InternalTransaction from 'types/Transactions/InternalTransaction';

import styles from '../history.module.scss';

export default function AdminUserTransactionsClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const [ page, setPage ] = useState<number>(1);
  const { data: transactions = [], isPending, isFetching } = useAdminUserTransactionsQuery({
    userID,
    page,
  });

  const columns: DataTableColumn<InternalTransaction>[] = [
    {
      id: 'transactionID',
      header: t('table.transactionID'),
      cell: (row) => <span className={styles.idValue}>{row.transactionID}</span>,
    },
    {
      id: 'change',
      header: t('table.change'),
      cell: (row) => (
        <span className={row.balanceChange >= 0 ? styles.changePositive : styles.changeNegative}>
          {row.balanceChange >= 0 ? '+' : ''}{formatter.number(row.balanceChange)}
        </span>
      ),
    },
    {
      id: 'after',
      header: t('table.balanceAfter'),
      cell: (row) => <SparksAmount amount={row.balanceAfter} />,
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

  const hasNextPage = transactions.length >= ADMIN_USER_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && transactions.length === 0);

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.transactionsTitle')}</h2>
          <p>{t('history.transactionsSubtitle')}</p>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={transactions}
        getRowKey={row => row.transactionID}
        loading={loading}
        emptyMessage={t('history.transactionsEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={transactions.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
