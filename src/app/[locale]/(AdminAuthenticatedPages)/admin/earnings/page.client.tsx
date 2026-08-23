'use client';

import { Suspense, useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import Skeleton from '@components/Skeleton/Skeleton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import AdminUserCell from '@components/AdminUserCell/AdminUserCell';
import { useUser } from '@contexts/UserProvider';
import { useAdminEarningsQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import {
  adminEarningsSearchParams,
  ADMIN_EARNING_SEARCH_BY,
  ADMIN_EARNING_STATUSES,
} from '@utils/adminEarningsSearchParams';
import {
  releaseAdminEarningRequest,
  ADMIN_EARNINGS_PAGE_SIZE,
} from '@utils/adminEarnings';
import { toDate } from '@utils/date';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';

// Types
import type { AdminEarningRow } from 'types/AdminEarning';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

function EarningsTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={320} borderRadius={12} />
    </div>
  );
}

function rowKey(row: AdminEarningRow): string {
  return `${row.earning.provider}:${row.earning.conversionID}`;
}

function EarningsPageContent() {
  const t = useTranslations('AdminEarnings');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(adminEarningsSearchParams);
  const [ releasingKey, setReleasingKey ] = useState<string | null>(null);
  const committedSearch = urlSearchParams.get('search') ?? '';

  const { data: rows = [], isPending, isFetching, isError } = useAdminEarningsQuery({
    statuses: [ ...filters.status ],
    searchBy: filters.searchBy,
    search: committedSearch,
    page: filters.page,
  });

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_EARNINGS,
  });

  async function releaseRow(row: AdminEarningRow) {
    const key = rowKey(row);
    if (releasingKey) return;

    setReleasingKey(key);

    try {
      const result = await releaseAdminEarningRequest({
        provider: row.earning.provider,
        conversionID: row.earning.conversionID,
      });

      if (!result.success) {
        toast.error(result.message || t('errors.releaseFailed'));

        return;
      }

      toast.success(t('success.released'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.earnings.all() }),
        queryClient.invalidateQueries({ queryKey: [ ...queryKeys.admin.users.all(), 'earnings' ] }),
      ]);
    } finally {
      setReleasingKey(null);
    }
  }

  const columns: DataTableColumn<AdminEarningRow>[] = [
    {
      id: 'user',
      header: t('table.user'),
      cell: (row) => (
        <AdminUserCell
          href={`${FrontendRedirectPaths.adminUsers}/${row.user.userID}`}
          userID={row.user.userID}
          username={row.user.username}
          subtitle={row.user.userID}
          unnamedLabel={t('unnamed')}
        />
      ),
    },
    {
      id: 'offer',
      header: t('table.offer'),
      cell: (row) => (
        <div className={styles.offerCell}>
          <span className={styles.name}>{row.earning.offerDisplayName || row.earning.offerName}</span>
          <span className={styles.muted}>{row.earning.provider}</span>
        </div>
      ),
    },
    {
      id: 'conversionID',
      header: t('table.conversionID'),
      cell: (row) => (
        <span className={styles.mono}>{row.earning.conversionID}</span>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => {
        let tone: 'positive' | 'warning' | 'negative' = 'warning';
        if (row.earning.status === 'completed') tone = 'positive';
        if (row.earning.status === 'reversed') tone = 'negative';

        return (
          <span className={styles.status} data-tone={tone}>
            {t(`statuses.${row.earning.status}`)}
          </span>
        );
      },
    },
    {
      id: 'value',
      header: t('table.sparks'),
      cell: (row) => <SparksAmount amount={row.earning.value} />,
    },
    {
      id: 'heldUntil',
      header: t('table.heldUntil'),
      cell: (row) => {
        const date = toDate(row.earning.heldUntil);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'created',
      header: t('table.created'),
      cell: (row) => {
        const date = toDate(row.earning.createdAt);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
  ];

  if (canModify) {
    columns.push({
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        if (row.earning.status !== 'held') return t('na');

        const key = rowKey(row);
        const releasing = releasingKey === key;

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={releasingKey !== null}
            onClick={() => {
              releaseRow(row).catch(error => {
                console.error(error);
              });
            }}
          >
            {releasing ? t('actions.releasing') : t('actions.release')}
          </button>
        );
      },
    });
  }

  const hasNextPage = rows.length >= ADMIN_EARNINGS_PAGE_SIZE;
  const loading = isPending || (isFetching && rows.length === 0);

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <SearchIcon aria-hidden />
          <input
            type="search"
            value={filters.search}
            placeholder={t(`searchPlaceholder.${filters.searchBy}`)}
            onChange={event => {
              setFilters({ search: event.target.value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            aria-label={t('searchLabel')}
          />
        </div>

        <div className={styles.dropdowns}>
          <Dropdown
            label={t('filters.searchBy')}
            selected={filters.searchBy}
            setValue={value => {
              setFilters({ searchBy: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={ADMIN_EARNING_SEARCH_BY.map(option => ({
              value: option,
              label: t(`searchBy.${option}`),
            }))}
          />
          <Dropdown
            label={t('filters.status')}
            selected={[ ...filters.status ]}
            defaultValue={t('filters.all')}
            setValue={value => {
              setFilters({
                status: filters.status.includes(value)
                  ? filters.status.filter(item => item !== value)
                  : [ ...filters.status, value ],
                page: 1,
              }).catch(error => {
                console.error(error);
              });
            }}
            values={ADMIN_EARNING_STATUSES.map(option => ({
              value: option,
              label: t(`statuses.${option}`),
            }))}
          />
        </div>
      </div>

      {isError ? (
        <div className={styles.errorState}>
          <p>{t('errors.loadFailed')}</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={rowKey}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={filters.page}
            pageSize={ADMIN_EARNINGS_PAGE_SIZE}
            itemCount={rows.length}
            hasNextPage={hasNextPage}
            onPageChange={page => {
              setFilters({ page }).catch(error => {
                console.error(error);
              });
            }}
            disabled={isFetching}
          />
        </>
      )}
    </>
  );
}

export default function AdminEarningsClient() {
  return (
    <Suspense fallback={<EarningsTableFallback />}>
      <EarningsPageContent />
    </Suspense>
  );
}
