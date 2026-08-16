'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Pagination from '@components/Pagination/Pagination';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUserAffiliatesQuery } from '@hooks/useAdminUsers';
import { ADMIN_USER_HISTORY_PAGE_SIZE } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type AffiliateCode from 'types/AffiliateCode';
import type { AdminReferredUser } from 'types/AdminUser';

import styles from '../history.module.scss';

export default function AdminUserAffiliatesClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const [ page, setPage ] = useState<number>(1);
  const { data, isPending, isFetching } = useAdminUserAffiliatesQuery({
    userID,
    page,
  });

  const codeColumns: DataTableColumn<AffiliateCode>[] = [
    {
      id: 'code',
      header: t('table.code'),
      cell: (row) => row.code,
    },
    {
      id: 'earnings',
      header: t('table.referralEarnings'),
      cell: (row) => <SparksAmount amount={row.totalEarnings} />,
    },
    {
      id: 'tasks',
      header: t('table.tasks'),
      cell: (row) => formatter.number(row.tasksCompleted),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={row.disabledAt ? 'negative' : 'positive'}>
          {row.disabledAt ? t('status.disabled') : t('status.active')}
        </span>
      ),
    },
    {
      id: 'created',
      header: t('table.created'),
      cell: (row) => {
        const date = toDate(row.createdAt);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium' })
          : t('na');
      },
    },
  ];

  const referredColumns: DataTableColumn<AdminReferredUser>[] = [
    {
      id: 'username',
      header: t('table.username'),
      cell: (row) => (
        <Link href={`${FrontendRedirectPaths.adminUsers}/${row.userID}`} className={styles.actionLink}>
          {row.username || t('unnamed')}
        </Link>
      ),
    },
    {
      id: 'userID',
      header: t('table.userID'),
      cell: (row) => <span className={styles.idValue}>{row.userID}</span>,
    },
    {
      id: 'created',
      header: t('table.created'),
      cell: (row) => {
        const date = toDate(row.creationDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium' })
          : t('na');
      },
    },
  ];

  const referral = data?.referralInformation;
  const codes = data?.codes ?? [];
  const referredUsers = data?.referredUsers ?? [];
  const loading = isPending || (isFetching && !data);
  const hasNextPage = referredUsers.length >= ADMIN_USER_HISTORY_PAGE_SIZE;

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.affiliatesTitle')}</h2>
          <p>{t('history.affiliatesSubtitle')}</p>
        </div>
      </div>

      {referral ? (
        <div className={styles.metricList}>
          <div className={styles.metricRow}>
            <span>{t('fields.referredBy')}</span>
            <strong>{referral.referredBy || t('na')}</strong>
          </div>
          <div className={styles.metricRow}>
            <span>{t('fields.referralEarnings')}</span>
            <strong>{formatter.number(referral.totalEarnings)}</strong>
          </div>
          <div className={styles.metricRow}>
            <span>{t('fields.referralTasks')}</span>
            <strong>{formatter.number(referral.tasksCompleted)}</strong>
          </div>
          <div className={styles.metricRow}>
            <span>{t('fields.pendingReferralEarnings')}</span>
            <strong>{formatter.number(referral.pendingEarnings)}</strong>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={codeColumns}
        rows={codes}
        getRowKey={row => row.code}
        loading={loading}
        emptyMessage={t('history.codesEmpty')}
      />

      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.referredTitle')}</h2>
        </div>
      </div>

      <DataTable
        columns={referredColumns}
        rows={referredUsers}
        getRowKey={row => row.userID}
        loading={loading}
        emptyMessage={t('history.referredEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={referredUsers.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
