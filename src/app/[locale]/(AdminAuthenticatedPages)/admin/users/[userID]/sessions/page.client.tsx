'use client';

import { useState } from 'react';
import { useLocale, useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import { useUser } from '@contexts/UserProvider';
import { useAdminUserSessionsQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import { ADMIN_USER_HISTORY_PAGE_SIZE, revokeAdminUserSessionRequest } from '@utils/adminUsers';
import { toDate } from '@utils/date';

// Types
import type { AdminUserSession } from 'types/AdminUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from '../history.module.scss';

function formatLocation(
  {
    city,
    country,
    locale,
    unknownLabel,
  }: {
    city?: string,
    country?: string,
    locale: string,
    unknownLabel: string,
  },
) {
  let countryName: string | undefined;
  if (country) {
    try {
      countryName = new Intl.DisplayNames([ locale ], { type: 'region' }).of(country) ?? country;
    } catch {
      countryName = country;
    }
  }

  if (city && countryName) return `${city}, ${countryName}`;
  if (city) return city;
  if (countryName) return countryName;

  return unknownLabel;
}

export default function AdminUserSessionsClient(
  {
    userID,
  }: {
    userID: string,
  },
) {
  const t = useTranslations('AdminUser');
  const locale = useLocale();
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user: actor } = useUser();
  const canModify = hasPermissions({
    userPermissions: actor?.staffPermissions,
    required: StaffPermissions.MODIFY_USERS,
  });
  const [ page, setPage ] = useState<number>(1);
  const [ activeOnly, setActiveOnly ] = useState<'all' | 'active'>('all');
  const [ pendingId, setPendingId ] = useState<string | null>(null);

  const { data: sessions = [], isPending, isFetching } = useAdminUserSessionsQuery({
    userID,
    page,
    activeOnly: activeOnly === 'active',
  });

  const columns: DataTableColumn<AdminUserSession>[] = [
    {
      id: 'device',
      header: t('table.device'),
      cell: (row) => row.device,
    },
    {
      id: 'location',
      header: t('table.location'),
      cell: (row) => formatLocation({
        city: row.city,
        country: row.country,
        locale,
        unknownLabel: t('table.unknownLocation'),
      }),
    },
    {
      id: 'ip',
      header: t('table.ipAddress'),
      cell: (row) => <span className={styles.idValue}>{row.ipAddress}</span>,
    },
    {
      id: 'accessed',
      header: t('table.lastAccessed'),
      cell: (row) => {
        const date = toDate(row.accessedDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'expires',
      header: t('table.expires'),
      cell: (row) => {
        const date = toDate(row.expiryDate);
        const active = date ? date.getTime() > Date.now() : false;

        return (
          <span className={styles.status} data-tone={active ? 'positive' : 'negative'}>
            {date
              ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
              : t('na')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        const expiry = toDate(row.expiryDate);
        const active = expiry ? expiry.getTime() > Date.now() : false;
        if (!active || !row.sessionID || !canModify) return t('na');

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={pendingId === row.sessionID}
            onClick={() => {
              setPendingId(row.sessionID);
              revokeAdminUserSessionRequest({ userID, sessionID: row.sessionID })
                .then(result => {
                  if (!result.success) {
                    toast.error(t('errors.generic'));

                    return;
                  }

                  toast.success(t('success.sessionRevoked'));

                  return queryClient.invalidateQueries({
                    queryKey: queryKeys.admin.users.sessions(userID, {
                      page,
                      activeOnly: activeOnly === 'active',
                    }),
                  });
                })
                .catch(error => {
                  console.error(error);
                  toast.error(t('errors.generic'));
                })
                .finally(() => {
                  setPendingId(current => (current === row.sessionID ? null : current));
                });
            }}
          >
            {t('actions.revoke')}
          </button>
        );
      },
    },
  ];

  const hasNextPage = sessions.length >= ADMIN_USER_HISTORY_PAGE_SIZE;
  const loading = isPending || (isFetching && sessions.length === 0);

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{t('history.sessionsTitle')}</h2>
          <p>{t('history.sessionsSubtitle')}</p>
        </div>
        <div className={styles.filters}>
          <Dropdown
            label={t('filters.sessionState')}
            selected={activeOnly}
            setValue={value => {
              setActiveOnly(value);
              setPage(1);
            }}
            values={[
              { value: 'all', label: t('filters.all') },
              { value: 'active', label: t('filters.activeOnly') },
            ]}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={sessions}
        getRowKey={row => row.sessionID || `${row.device}-${row.issueDate}`}
        loading={loading}
        emptyMessage={t('history.sessionsEmpty')}
      />
      <Pagination
        page={page}
        pageSize={ADMIN_USER_HISTORY_PAGE_SIZE}
        itemCount={sessions.length}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        disabled={isFetching}
      />
    </div>
  );
}
