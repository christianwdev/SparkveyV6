'use client';

import { Suspense } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import { useAdminRedemptionMethodsQuery } from '@hooks/useAdminUsers';
import {
  adminRedemptionMethodsSearchParams,
  ADMIN_REDEMPTION_METHOD_SEARCH_BY,
  ADMIN_REDEMPTION_METHOD_SORT_DIRECTION,
  ADMIN_REDEMPTION_METHOD_STATUSES,
} from '@utils/adminRedemptionMethodsSearchParams';
import { ADMIN_REDEMPTION_METHODS_PAGE_SIZE } from '@utils/adminRedemptionMethods';
import { toDate } from '@utils/date';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';

// Types
import type { AdminRedemptionMethodListItem } from 'types/AdminRedemptionMethod';

import styles from './page.module.scss';

function MethodsTableFallback() {
  return (
    <DataTable
      columns={[]}
      rows={[]}
      getRowKey={() => 'loading'}
      loading
    />
  );
}

function MethodsPageContent() {
  const t = useTranslations('AdminRedemptionMethods');
  const formatter = useFormatter();
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(adminRedemptionMethodsSearchParams);
  const committedSearch = urlSearchParams.get('search') ?? '';
  const status = filters.status === 'all' ? undefined : filters.status;

  const { data: rows = [], isPending, isFetching, isError } = useAdminRedemptionMethodsQuery({
    status,
    searchBy: filters.searchBy,
    search: committedSearch,
    sortDirection: filters.sortDirection,
    page: filters.page,
  });

  const columns: DataTableColumn<AdminRedemptionMethodListItem>[] = [
    {
      id: 'name',
      header: t('table.name'),
      cell: (row) => (
        <div className={styles.nameCell}>
          {row.imageSrc ? (
            <img src={row.imageSrc} alt="" width={32} height={32} />
          ) : null}
          <div>
            <span className={styles.name}>{row.rewardName}</span>
            <span className={styles.muted}>{row.rewardID}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'provider',
      header: t('table.provider'),
      cell: (row) => t(`providers.${row.providerName}`),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => {
        const tone: 'positive' | 'warning' = row.status === 'active' ? 'positive' : 'warning';

        return (
          <span className={styles.status} data-tone={tone}>
            {t(`statuses.${row.status}`)}
          </span>
        );
      },
    },
    {
      id: 'featuredSpot',
      header: t('table.featuredSpot'),
      cell: (row) => (
        <span className={styles.muted}>
          {row.featuredSpot === undefined ? t('na') : row.featuredSpot}
        </span>
      ),
    },
    {
      id: 'created',
      header: t('table.created'),
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
      cell: (row) => (
        <Link
          href={`${FrontendRedirectPaths.adminRedemptionMethods}/${row.rewardID}`}
          className={styles.actionLink}
        >
          {t('actions.edit')}
        </Link>
      ),
    },
  ];

  const hasNextPage = rows.length >= ADMIN_REDEMPTION_METHODS_PAGE_SIZE;
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
            values={ADMIN_REDEMPTION_METHOD_SEARCH_BY.map(option => ({
              value: option,
              label: t(`searchBy.${option}`),
            }))}
          />
          <Dropdown
            label={t('filters.status')}
            selected={filters.status}
            setValue={value => {
              setFilters({ status: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={[
              { value: 'all', label: t('filters.all') },
              ...ADMIN_REDEMPTION_METHOD_STATUSES.map(option => ({
                value: option,
                label: t(`statuses.${option}`),
              })),
            ]}
          />
          <Dropdown
            label={t('filters.sortDirection')}
            selected={filters.sortDirection}
            setValue={value => {
              setFilters({ sortDirection: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={ADMIN_REDEMPTION_METHOD_SORT_DIRECTION.map(option => ({
              value: option,
              label: t(`sortDirection.${option}`),
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
            getRowKey={row => row.rewardID}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={filters.page}
            pageSize={ADMIN_REDEMPTION_METHODS_PAGE_SIZE}
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

export default function AdminRedemptionMethodsClient() {
  return (
    <Suspense fallback={<MethodsTableFallback />}>
      <MethodsPageContent />
    </Suspense>
  );
}
