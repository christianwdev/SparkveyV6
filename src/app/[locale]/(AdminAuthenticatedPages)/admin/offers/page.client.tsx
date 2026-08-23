'use client';

import { Suspense } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import Skeleton from '@components/Skeleton/Skeleton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useUser } from '@contexts/UserProvider';
import { useAdminOffersQuery } from '@hooks/useAdminUsers';
import { hasPermissions } from '@utils/admin';
import {
  adminOffersSearchParams,
  ADMIN_OFFER_SEARCH_BY,
  ADMIN_OFFER_SORT_BY,
  ADMIN_OFFER_SORT_DIRECTION,
  ADMIN_OFFER_STATUSES,
} from '@utils/adminOffersSearchParams';
import { ADMIN_OFFERS_PAGE_SIZE } from '@utils/adminOffers';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';

// Types
import type { AdminOfferListItem, AdminOfferStatus } from 'types/AdminOffer';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

function OffersTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={320} borderRadius={12} />
    </div>
  );
}

function statusTone(status: AdminOfferStatus): 'positive' | 'warning' | 'negative' {
  if (status === 'active') return 'positive';
  if (status === 'disabled') return 'negative';

  return 'warning';
}

function OffersPageContent() {
  const t = useTranslations('AdminOffers');
  const { user } = useUser();
  const urlSearchParams = useSearchParams();
  const [ filters, setFilters ] = useQueryStates(adminOffersSearchParams);
  const committedSearch = urlSearchParams.get('search') ?? '';
  const status = filters.status === 'all' ? undefined : filters.status;

  const { data: rows = [], isPending, isFetching, isError } = useAdminOffersQuery({
    status,
    searchBy: filters.searchBy,
    search: committedSearch,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    page: filters.page,
  });

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_OFFERS,
  });

  const columns: DataTableColumn<AdminOfferListItem>[] = [
    {
      id: 'name',
      header: t('table.name'),
      cell: (row) => (
        <div className={styles.nameCell}>
          {row.image ? (
            <img src={row.image} alt="" width={40} height={40} />
          ) : null}
          <div>
            <span className={styles.name}>{row.displayName}</span>
            <span className={styles.muted}>{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'provider',
      header: t('table.provider'),
      cell: (row) => (
        <span className={styles.muted}>{row.isCustom ? t('customProvider') : row.provider}</span>
      ),
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
      id: 'featuredPriority',
      header: t('table.featuredPriority'),
      cell: (row) => (
        <span className={styles.muted}>
          {row.featuredPriority === undefined ? t('na') : row.featuredPriority}
        </span>
      ),
    },
    {
      id: 'totalReward',
      header: t('table.totalReward'),
      cell: (row) => <SparksAmount amount={row.totalReward} />,
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => (
        <Link
          href={`${FrontendRedirectPaths.adminOffers}/${row.offerID}`}
          className={styles.actionLink}
        >
          {t('actions.edit')}
        </Link>
      ),
    },
  ];

  const hasNextPage = rows.length >= ADMIN_OFFERS_PAGE_SIZE;
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
            values={ADMIN_OFFER_SEARCH_BY.map(option => ({
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
              ...ADMIN_OFFER_STATUSES.map(option => ({
                value: option,
                label: t(`statuses.${option}`),
              })),
            ]}
          />
          <Dropdown
            label={t('filters.sortBy')}
            selected={filters.sortBy}
            setValue={value => {
              setFilters({ sortBy: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={ADMIN_OFFER_SORT_BY.map(option => ({
              value: option,
              label: t(`sortBy.${option}`),
            }))}
          />
          <Dropdown
            label={t('filters.sortDirection')}
            selected={filters.sortDirection}
            setValue={value => {
              setFilters({ sortDirection: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={ADMIN_OFFER_SORT_DIRECTION.map(option => ({
              value: option,
              label: t(`sortDirection.${option}`),
            }))}
          />
          {canModify ? (
            <Link
              href={`${FrontendRedirectPaths.adminOffers}/new`}
              className={styles.createLink}
            >
              {t('actions.create')}
            </Link>
          ) : null}
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
            getRowKey={row => row.offerID}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={filters.page}
            pageSize={ADMIN_OFFERS_PAGE_SIZE}
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

export default function AdminOffersClient() {
  return (
    <Suspense fallback={<OffersTableFallback />}>
      <OffersPageContent />
    </Suspense>
  );
}
