'use client';

import { Suspense, useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import Skeleton from '@components/Skeleton/Skeleton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import AdminWithdrawalAttestationModal, {
  type AttestationFlaggedUser,
} from '@components/AdminWithdrawalAttestationModal/AdminWithdrawalAttestationModal';
import { useAdminUserRisk } from '@contexts/AdminUserRiskContext';
import { useUser } from '@contexts/UserProvider';
import { useAdminWithdrawalsQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import { adminWithdrawalsSearchParams } from '@utils/adminWithdrawalsSearchParams';
import {
  acceptAdminWithdrawalsRequest,
  rejectAdminWithdrawalsRequest,
  ADMIN_WITHDRAWALS_PAGE_SIZE,
} from '@utils/adminWithdrawals';
import { toDate } from '@utils/date';
import type { AdminMutationResult } from '@utils/adminUsers';

// Types
import type {
  AdminWithdrawalAttestationRequired,
  AdminWithdrawalBatchResult,
  AdminWithdrawalRow,
} from 'types/AdminWithdrawal';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

const STATUS_OPTIONS: InternalRedemptionStatus[] = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
];
const PROVIDER_OPTIONS: Array<'all' | InternalRedemptionProvider> = [ 'all', 'ccpayment', 'tremendous' ];

function WithdrawalsTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={320} borderRadius={12} />
    </div>
  );
}

function statusTone(status: InternalRedemptionStatus) {
  if (status === 'completed' || status === 'approved') return 'positive';
  if (status === 'failed' || status === 'rejected') return 'negative';

  return 'warning';
}

function destination(row: AdminWithdrawalRow): string {
  if (row.redemption.providerName === 'ccpayment') {
    return row.redemption.meta.walletAddress;
  }

  return row.redemption.itemName;
}

function isAttestationRequired(
  result: AdminMutationResult<AdminWithdrawalBatchResult | AdminWithdrawalAttestationRequired>,
): result is AdminMutationResult<AdminWithdrawalAttestationRequired> {
  return result.code === 'attestationRequired'
    && result.data !== undefined
    && 'flaggedUsers' in result.data;
}

function isBatchResult(
  data: AdminWithdrawalBatchResult | AdminWithdrawalAttestationRequired | undefined,
): data is AdminWithdrawalBatchResult {
  return data !== undefined && 'results' in data;
}

function toastBatchOutcome(
  {
    t,
    results,
    successKey,
    failKey,
  }: {
    t: ReturnType<typeof useTranslations<'AdminWithdrawals'>>,
    results: AdminWithdrawalBatchResult['results'] | undefined,
    successKey: 'success.accepted' | 'success.rejected',
    failKey: 'errors.acceptFailed' | 'errors.rejectFailed',
  },
) {
  const items = results ?? [];
  const failedCount = items.filter(item => !item.ok).length;

  if (items.length > 0 && failedCount === items.length) {
    toast.error(t(failKey));

    return;
  }

  if (failedCount > 0) {
    toast.error(t('errors.partial', {
      failed: failedCount,
      total: items.length,
    }));

    return;
  }

  toast.success(t(successKey));
}

function flaggedUsersFromRows(rows: AdminWithdrawalRow[]): AttestationFlaggedUser[] {
  const byUser = new Map<string, AttestationFlaggedUser>();

  for (const row of rows) {
    if (row.flags.activeFlagCount === 0) continue;

    const existing = byUser.get(row.user.userID);
    if (existing) continue;

    byUser.set(row.user.userID, {
      userID: row.user.userID,
      username: row.user.username,
      flagTypes: row.flags.flagTypes,
    });
  }

  return [ ...byUser.values() ];
}

function WithdrawalsPageContent() {
  const t = useTranslations('AdminWithdrawals');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { openUserRisk } = useAdminUserRisk();
  const [ filters, setFilters ] = useQueryStates(adminWithdrawalsSearchParams);
  const [ selectedIDs, setSelectedIDs ] = useState<string[]>([]);
  const [ pendingAction, setPendingAction ] = useState<'accept' | 'reject' | null>(null);
  const [ attestationUsers, setAttestationUsers ] = useState<AttestationFlaggedUser[] | null>(null);

  const provider = filters.provider === 'all' ? undefined : filters.provider;
  const { data: rows = [], isPending, isFetching, isError } = useAdminWithdrawalsQuery({
    status: filters.status,
    provider,
    page: filters.page,
  });

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_WITHDRAWALS,
  });

  const pendingRows = rows.filter(row => row.redemption.status === 'pending');
  const pendingIDs = pendingRows.map(row => row.redemption.redemptionID);
  const selectedPending = selectedIDs.filter(id => pendingIDs.includes(id));
  const allPendingSelected = pendingIDs.length > 0 && pendingIDs.every(id => selectedIDs.includes(id));

  function toggleRow(redemptionID: string, checked: boolean) {
    setSelectedIDs(current => (
      checked
        ? [ ...current, redemptionID ]
        : current.filter(id => id !== redemptionID)
    ));
  }

  function toggleAllPending(checked: boolean) {
    setSelectedIDs(checked ? pendingIDs : []);
  }

  async function invalidateQueue() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.withdrawals.all() });
  }

  async function runAccept(reason?: string) {
    setPendingAction('accept');

    try {
      const result = await acceptAdminWithdrawalsRequest({
        redemptionIDs: selectedPending,
        reason,
      });

      if (isAttestationRequired(result)) {
        setAttestationUsers(result.data?.flaggedUsers ?? flaggedUsersFromRows(
          rows.filter(row => selectedPending.includes(row.redemption.redemptionID)),
        ));

        return;
      }

      if (!result.success) {
        toast.error(result.message || t('errors.acceptFailed'));

        return;
      }

      toastBatchOutcome({
        t,
        results: isBatchResult(result.data) ? result.data.results : undefined,
        successKey: 'success.accepted',
        failKey: 'errors.acceptFailed',
      });
      setSelectedIDs([]);
      setAttestationUsers(null);
      await invalidateQueue();
    } finally {
      setPendingAction(null);
    }
  }

  async function runReject() {
    setPendingAction('reject');

    try {
      const result = await rejectAdminWithdrawalsRequest({
        redemptionIDs: selectedPending,
      });

      if (!result.success) {
        toast.error(result.message || t('errors.rejectFailed'));

        return;
      }

      toastBatchOutcome({
        t,
        results: result.data?.results,
        successKey: 'success.rejected',
        failKey: 'errors.rejectFailed',
      });
      setSelectedIDs([]);
      await invalidateQueue();
    } finally {
      setPendingAction(null);
    }
  }

  function handleAcceptClick() {
    const flagged = flaggedUsersFromRows(
      rows.filter(row => selectedPending.includes(row.redemption.redemptionID)),
    );

    if (flagged.length > 0) {
      setAttestationUsers(flagged);

      return;
    }

    runAccept().catch(error => {
      console.error(error);
    });
  }

  const columns: DataTableColumn<AdminWithdrawalRow>[] = [
    {
      id: 'select',
      header: (
        <input
          type="checkbox"
          checked={allPendingSelected}
          disabled={!canModify || pendingIDs.length === 0}
          onChange={event => toggleAllPending(event.target.checked)}
          aria-label={t('table.selectAll')}
        />
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIDs.includes(row.redemption.redemptionID)}
          disabled={!canModify || row.redemption.status !== 'pending'}
          onChange={event => toggleRow(row.redemption.redemptionID, event.target.checked)}
          aria-label={t('table.selectRow')}
        />
      ),
    },
    {
      id: 'user',
      header: t('table.user'),
      cell: (row) => (
        <div className={styles.userCell}>
          <Link
            href={`${FrontendRedirectPaths.adminUsers}/${row.user.userID}`}
            className={styles.usernameCell}
          >
            <span className={styles.name}>{row.user.username || t('unnamed')}</span>
            <span className={styles.muted}>{row.user.email || t('noEmail')}</span>
          </Link>
        </div>
      ),
    },
    {
      id: 'reward',
      header: t('table.reward'),
      cell: (row) => (
        <div className={styles.userCell}>
          <span className={styles.name}>{row.redemption.itemName}</span>
          <span className={styles.muted}>{t(`providers.${row.redemption.providerName}`)}</span>
        </div>
      ),
    },
    {
      id: 'destination',
      header: t('table.destination'),
      cell: (row) => <span className={styles.destination}>{destination(row)}</span>,
    },
    {
      id: 'amount',
      header: t('table.amount'),
      cell: (row) => (
        <div className={styles.userCell}>
          <SparksAmount amount={row.redemption.value} />
          <span className={styles.muted}>
            {formatter.number(row.redemption.usdValue, { style: 'currency', currency: 'USD' })}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={statusTone(row.redemption.status)}>
          {t(`statuses.${row.redemption.status}`)}
        </span>
      ),
    },
    {
      id: 'flags',
      header: t('table.flags'),
      cell: (row) => (
        row.flags.activeFlagCount > 0 ? (
          <button
            type="button"
            className={styles.flagBadge}
            onClick={() => openUserRisk(row.user.userID)}
          >
            {t('flagCount', { count: row.flags.activeFlagCount })}
          </button>
        ) : (
          <span className={styles.muted}>{t('noFlags')}</span>
        )
      ),
    },
    {
      id: 'created',
      header: t('table.created'),
      cell: (row) => {
        const createdAt = toDate(row.redemption.createdAt);

        return createdAt
          ? formatter.dateTime(createdAt, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => (
        <button
          type="button"
          className={styles.actionLink}
          onClick={() => openUserRisk(row.user.userID)}
        >
          {t('actions.review')}
        </button>
      ),
    },
  ];

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.dropdowns}>
          <Dropdown
            label={t('filters.status')}
            selected={filters.status}
            setValue={(value) => {
              setFilters({ status: value, page: 1 }).catch(error => {
                console.error(error);
              });
              setSelectedIDs([]);
            }}
            values={STATUS_OPTIONS.map(value => ({
              value,
              label: t(`statuses.${value}`),
            }))}
          />
          <Dropdown
            label={t('filters.provider')}
            selected={filters.provider}
            setValue={(value) => {
              setFilters({ provider: value, page: 1 }).catch(error => {
                console.error(error);
              });
              setSelectedIDs([]);
            }}
            values={PROVIDER_OPTIONS.map(value => ({
              value,
              label: t(`providers.${value}`),
            }))}
          />
        </div>
      </div>

      {isError ? (
        <p className={styles.errorState}>{t('errors.loadFailed')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={row => row.redemption.redemptionID}
          loading={isPending || isFetching}
          emptyMessage={t('empty')}
        />
      )}

      <Pagination
        page={filters.page}
        pageSize={ADMIN_WITHDRAWALS_PAGE_SIZE}
        itemCount={rows.length}
        hasNextPage={rows.length >= ADMIN_WITHDRAWALS_PAGE_SIZE}
        onPageChange={(page) => {
          setFilters({ page }).catch(error => {
            console.error(error);
          });
          setSelectedIDs([]);
        }}
      />

      {canModify && selectedPending.length > 0 ? (
        <div className={styles.batchBar}>
          <p>{t('selectedCount', { count: selectedPending.length })}</p>
          <div className={styles.batchActions}>
            <PrimaryButton
              variant="danger"
              disabled={pendingAction !== null}
              onClick={() => {
                runReject().catch(error => {
                  console.error(error);
                });
              }}
            >
              {t('actions.reject')}
            </PrimaryButton>
            <PrimaryButton
              disabled={pendingAction !== null}
              onClick={handleAcceptClick}
            >
              {t('actions.accept')}
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {attestationUsers ? (
        <AdminWithdrawalAttestationModal
          flaggedUsers={attestationUsers}
          pending={pendingAction === 'accept'}
          onClose={() => setAttestationUsers(null)}
          onConfirm={async (reason) => {
            await runAccept(reason);
          }}
        />
      ) : null}
    </>
  );
}

export default function AdminWithdrawalsClient() {
  return (
    <Suspense fallback={<WithdrawalsTableFallback />}>
      <WithdrawalsPageContent />
    </Suspense>
  );
}
