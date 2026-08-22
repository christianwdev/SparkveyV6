'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import Skeleton from '@components/Skeleton/Skeleton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUsersQuery } from '@hooks/useAdminUsers';
import { useAdminUserRisk } from '@contexts/AdminUserRiskContext';
import { adminUsersSearchParams } from '@utils/adminUsersSearchParams';
import { ADMIN_USERS_PAGE_SIZE } from '@utils/adminUsers';
import { isCurrentlyBanned, toDate } from '@utils/date';

// Icons
import SearchIcon from '~icons/mdi/magnify.jsx';
import CopyIcon from '~icons/solar/copy-linear.jsx';
import CheckIcon from '~icons/solar/check-read-linear.jsx';

// Types
import type AdminUser from 'types/AdminUser';
import type { AdminUserFilterBy, AdminUserListItem, AdminUserOrder, AdminUserSort } from 'types/AdminUser';

import styles from './page.module.scss';

const FILTER_OPTIONS: { label: string, value: AdminUserFilterBy }[] = [
  { label: 'username', value: 'username' },
  { label: 'email', value: 'email' },
  { label: 'userID', value: 'userID' },
];

const SORT_OPTIONS: { label: string, value: AdminUserSort }[] = [
  { label: 'createdAt', value: 'createdAt' },
  { label: 'balanceSparks', value: 'balance.sparks' },
];

const ORDER_OPTIONS: { value: AdminUserOrder, label: 'desc' | 'asc' }[] = [
  { value: 'desc', label: 'desc' },
  { value: 'asc', label: 'asc' },
];

function UsersTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={320} borderRadius={12} />
    </div>
  );
}

function userStatus(user: AdminUser): 'deleted' | 'banned' | 'active' {
  if (user.deletedAt) return 'deleted';
  if (isCurrentlyBanned(user.bannedUntil)) return 'banned';

  return 'active';
}

function statusTone(status: ReturnType<typeof userStatus>): 'positive' | 'warning' | 'negative' {
  if (status === 'active') return 'positive';
  if (status === 'banned') return 'warning';

  return 'negative';
}

function shortId(id: string): string {
  if (id.length <= 12) return id;

  return `${id.slice(0, 8)}…`;
}

function UsersPageContent() {
  const t = useTranslations('AdminUsers');
  const formatter = useFormatter();
  const urlSearchParams = useSearchParams();
  const { openUserRisk } = useAdminUserRisk();
  const [ filters, setFilters ] = useQueryStates(adminUsersSearchParams);
  const committedSearch = urlSearchParams.get('search') ?? '';
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ copiedId, setCopiedId ] = useState<string | null>(null);

  const { data: users = [], isPending, isFetching, isError } = useAdminUsersQuery({
    search: committedSearch,
    filterBy: filters.filterBy,
    sort: filters.sort,
    order: filters.order,
    page: filters.page,
  });

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  async function copyUserId(userID: string) {
    try {
      await navigator.clipboard.writeText(userID);
      setCopiedId(userID);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  const columns: DataTableColumn<AdminUserListItem>[] = [
    {
      id: 'username',
      header: t('table.username'),
      cell: (row) => (
        <Link
          href={`${FrontendRedirectPaths.adminUsers}/${row.userID}`}
          className={styles.usernameCell}
        >
          <span className={styles.name}>{row.username || t('unnamed')}</span>
          <span className={styles.muted}>{row.emailInformation?.emailAddress || t('noEmail')}</span>
        </Link>
      ),
    },
    {
      id: 'userID',
      header: t('table.userID'),
      cell: (row) => {
        const copied = copiedId === row.userID;

        return (
          <span className={styles.idCell}>
            <span className={styles.idValue}>{shortId(row.userID)}</span>
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => {
                copyUserId(row.userID).catch(error => {
                  console.error(error);
                });
              }}
              aria-label={copied ? t('copied') : t('copyId')}
            >
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            </button>
          </span>
        );
      },
    },
    {
      id: 'balance',
      header: t('table.balance'),
      cell: (row) => <SparksAmount amount={row.balance.sparks} />,
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
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => {
        const status = userStatus(row);

        return (
          <span className={styles.status} data-tone={statusTone(status)}>
            {t(`status.${status}`)}
          </span>
        );
      },
    },
    {
      id: 'flags',
      header: t('table.flags'),
      cell: (row) => (
        row.flags.activeFlagCount > 0 ? (
          <button
            type="button"
            className={styles.flagBadge}
            onClick={() => openUserRisk(row.userID)}
          >
            {t('flagCount', { count: row.flags.activeFlagCount })}
          </button>
        ) : (
          <button
            type="button"
            className={styles.actionLink}
            onClick={() => openUserRisk(row.userID)}
          >
            {t('actions.review')}
          </button>
        )
      ),
    },
  ];

  const hasNextPage = users.length >= ADMIN_USERS_PAGE_SIZE;
  const loading = isPending || (isFetching && users.length === 0);
  const orderGroup = filters.sort === 'balance.sparks' ? 'balance' : 'createdAt';

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <SearchIcon aria-hidden />
          <input
            type="search"
            value={filters.search}
            placeholder={t(`searchPlaceholder.${filters.filterBy}`)}
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
            label={t('filterBy')}
            selected={filters.filterBy}
            setValue={value => {
              setFilters({ filterBy: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={FILTER_OPTIONS.map(option => ({
              value: option.value,
              label: t(`filters.${option.label}`),
            }))}
          />
          <Dropdown
            label={t('sortBy')}
            selected={filters.sort}
            setValue={value => {
              setFilters({ sort: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={SORT_OPTIONS.map(option => ({
              value: option.value,
              label: t(`sorts.${option.label}`),
            }))}
          />
          <Dropdown
            label={t('order')}
            selected={filters.order}
            setValue={value => {
              setFilters({ order: value, page: 1 }).catch(error => {
                console.error(error);
              });
            }}
            values={ORDER_OPTIONS.map(option => ({
              value: option.value,
              label: t(`orders.${orderGroup}.${option.label}`),
            }))}
          />
        </div>
      </div>

      {isError ? (
        <div className={styles.errorState}>
          <p>{t('error')}</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={users}
            getRowKey={row => row.userID}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={filters.page}
            pageSize={ADMIN_USERS_PAGE_SIZE}
            itemCount={users.length}
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

export default function AdminUsersClient() {
  return (
    <Suspense fallback={<UsersTableFallback />}>
      <UsersPageContent />
    </Suspense>
  );
}
