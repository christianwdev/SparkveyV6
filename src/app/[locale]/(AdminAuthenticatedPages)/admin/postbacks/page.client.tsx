'use client';

import { Suspense, useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import Skeleton from '@components/Skeleton/Skeleton';
import { useUser } from '@contexts/UserProvider';
import { useAdminPostbacksQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import {
  adminPostbacksSearchParams,
  ADMIN_POSTBACK_SEARCH_BY,
  ADMIN_POSTBACK_STATUSES,
} from '@utils/adminPostbacksSearchParams';
import {
  retryAdminPostbackRequest,
  ADMIN_POSTBACKS_PAGE_SIZE,
} from '@utils/adminPostbacks';
import { toDate } from '@utils/date';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';

// Types
import type { AdminPostbackRow } from 'types/AdminPostback';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

function PostbacksTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={320} borderRadius={12} />
    </div>
  );
}

function PostbacksPageContent() {
  const t = useTranslations('AdminPostbacks');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(adminPostbacksSearchParams);
  const [ retryingID, setRetryingID ] = useState<string | null>(null);
  const committedSearch = urlSearchParams.get('search') ?? '';

  const { data: rows = [], isPending, isFetching, isError } = useAdminPostbacksQuery({
    statuses: [ ...filters.status ],
    searchBy: filters.searchBy,
    search: committedSearch,
    page: filters.page,
  });

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_POSTBACKS,
  });

  async function retryRow(row: AdminPostbackRow) {
    if (retryingID) return;

    setRetryingID(row.requestID);

    try {
      const result = await retryAdminPostbackRequest({
        requestID: row.requestID,
      });

      if (!result.success) {
        if (result.code === 'notFound') toast.error(t('errors.notFound'));
        else if (result.code === 'alreadyCompleted') toast.error(t('errors.alreadyCompleted'));
        else if (result.code === 'validationFailed') toast.error(t('errors.validationFailed'));
        else if (result.code === 'processingFailed') toast.error(t('errors.processingFailed'));
        else toast.error(t('errors.retryFailed'));

        return;
      }

      toast.success(t('success.retried'));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.postbacks.all() });
    } finally {
      setRetryingID(null);
    }
  }

  const columns: DataTableColumn<AdminPostbackRow>[] = [
    {
      id: 'date',
      header: t('table.date'),
      cell: (row) => {
        const date = toDate(row.date);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'provider',
      header: t('table.provider'),
      cell: (row) => (
        <span className={styles.provider}>{row.provider}</span>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => {
        let tone: 'positive' | 'warning' | 'negative' = 'warning';
        if (row.status === 'completed') tone = 'positive';
        if (row.status === 'failed') tone = 'negative';

        return (
          <div className={styles.statusCell}>
            <span className={styles.status} data-tone={tone}>
              {t(`statuses.${row.status}`)}
            </span>
            {row.failureDetail ? (
              <span className={styles.muted}>{row.failureDetail}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'remoteIP',
      header: t('table.remoteIP'),
      cell: (row) => row.remoteIP || t('na'),
    },
    {
      id: 'requestID',
      header: t('table.requestID'),
      cell: (row) => (
        <span className={styles.mono}>{row.requestID}</span>
      ),
    },
  ];

  if (canModify) {
    columns.push({
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        if (row.status === 'completed') return t('na');

        const retrying = retryingID === row.requestID;

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={retryingID !== null}
            onClick={() => {
              retryRow(row).catch(error => {
                console.error(error);
              });
            }}
          >
            {retrying ? t('actions.retrying') : t('actions.retry')}
          </button>
        );
      },
    });
  }

  const hasNextPage = rows.length >= ADMIN_POSTBACKS_PAGE_SIZE;
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
            values={ADMIN_POSTBACK_SEARCH_BY.map(option => ({
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
            values={ADMIN_POSTBACK_STATUSES.map(option => ({
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
            getRowKey={row => row.requestID}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={filters.page}
            pageSize={ADMIN_POSTBACKS_PAGE_SIZE}
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

export default function AdminPostbacksClient() {
  return (
    <Suspense fallback={<PostbacksTableFallback />}>
      <PostbacksPageContent />
    </Suspense>
  );
}
