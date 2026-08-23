'use client';

import { Suspense, useState } from 'react';
import { useQueryStates } from 'nuqs';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Dropdown from '@components/Dropdown/Dropdown';
import Pagination from '@components/Pagination/Pagination';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import AdminUserCell from '@components/AdminUserCell/AdminUserCell';
import AdminWithdrawalAttestationModal, {
  type AttestationFlaggedUser,
} from '@components/AdminWithdrawalAttestationModal/AdminWithdrawalAttestationModal';
import { useAdminUserRisk } from '@contexts/AdminUserRiskContext';
import { useUser } from '@contexts/UserProvider';
import { useAdminWithdrawalsQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import {
  adminWithdrawalsSearchParams,
  ADMIN_WITHDRAWAL_PROVIDERS,
  ADMIN_WITHDRAWAL_STATUSES,
} from '@utils/adminWithdrawalsSearchParams';
import {
  acceptAdminWithdrawalsRequest,
  rejectAdminWithdrawalsRequest,
  ADMIN_WITHDRAWALS_PAGE_SIZE,
} from '@utils/adminWithdrawals';
import { toDate } from '@utils/date';

// Types
import type {
  AdminWithdrawalAttestationRequired,
  AdminWithdrawalBatchResult,
  AdminWithdrawalRow,
} from 'types/AdminWithdrawal';
import type { InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

const STATUS_OPTIONS = ADMIN_WITHDRAWAL_STATUSES;
const PROVIDER_OPTIONS = ADMIN_WITHDRAWAL_PROVIDERS;

function toggleFilterValue<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter(item => item !== value)
    : [ ...list, value ];
}

function WithdrawalsTableFallback() {
  return (
    <DataTable
      columns={[]}
      rows={[]}
      getRowKey={() => 'loading'}
      loading
    />
  );
}

function statusTone(status: InternalRedemptionStatus) {
  if (status === 'completed' || status === 'approved') return 'positive';
  if (status === 'failed' || status === 'rejected') return 'negative';

  return 'warning';
}

function destination(row: AdminWithdrawalRow): string {
  const meta = row.redemption.meta;
  if (row.redemption.providerName === 'ccpayment' && meta && typeof meta === 'object' && 'walletAddress' in meta) {
    return String(meta.walletAddress);
  }

  return row.redemption.itemName;
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

function WithdrawalCheckbox(
  {
    checked,
    indeterminate = false,
    disabled,
    onChange,
    'aria-label': ariaLabel,
  }: {
    checked: boolean,
    indeterminate?: boolean,
    disabled?: boolean,
    onChange: (checked: boolean) => void,
    'aria-label': string,
  },
) {
  return (
    <label className={styles.checkbox}>
      <input
        ref={(element) => {
          if (element) element.indeterminate = indeterminate;
        }}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        aria-label={ariaLabel}
      />
      <span className={styles.box} aria-hidden />
    </label>
  );
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

  const { data: rows = [], isPending, isFetching, isError } = useAdminWithdrawalsQuery({
    statuses: [ ...filters.status ],
    providers: [ ...filters.provider ],
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
  const somePendingSelected = selectedPending.length > 0 && !allPendingSelected;

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

      if (result.code === 'attestationRequired') {
        const payload = result.data as AdminWithdrawalAttestationRequired | undefined;
        setAttestationUsers(payload?.flaggedUsers ?? flaggedUsersFromRows(
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
        results: (result.data as AdminWithdrawalBatchResult | undefined)?.results,
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
      className: styles.selectCell,
      header: (
        <WithdrawalCheckbox
          checked={allPendingSelected}
          indeterminate={somePendingSelected}
          disabled={!canModify || pendingIDs.length === 0}
          onChange={toggleAllPending}
          aria-label={t('table.selectAll')}
        />
      ),
      cell: (row) => (
        <WithdrawalCheckbox
          checked={selectedIDs.includes(row.redemption.redemptionID)}
          disabled={!canModify || row.redemption.status !== 'pending'}
          onChange={checked => toggleRow(row.redemption.redemptionID, checked)}
          aria-label={t('table.selectRow')}
        />
      ),
    },
    {
      id: 'user',
      header: t('table.user'),
      cell: (row) => (
        <AdminUserCell
          href={`${FrontendRedirectPaths.adminUsers}/${row.user.userID}`}
          userID={row.user.userID}
          username={row.user.username}
          subtitle={row.user.email || t('noEmail')}
          unnamedLabel={t('unnamed')}
        />
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
          <button
            type="button"
            className={styles.actionLink}
            onClick={() => openUserRisk(row.user.userID)}
          >
            {t('actions.review')}
          </button>
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
  ];

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.dropdowns}>
          <Dropdown
            label={t('filters.status')}
            selected={filters.status}
            defaultValue={t('filters.all')}
            setValue={(value) => {
              setFilters({ status: toggleFilterValue(filters.status, value), page: 1 }).catch(error => {
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
            defaultValue={t('filters.all')}
            setValue={(value) => {
              setFilters({ provider: toggleFilterValue(filters.provider, value), page: 1 }).catch(error => {
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

        {canModify ? (
          <div className={styles.batchActions}>
            {selectedPending.length > 0 ? (
              <p>{t('selectedCount', { count: selectedPending.length })}</p>
            ) : null}
            <PrimaryButton
              variant="danger"
              disabled={pendingAction !== null || selectedPending.length === 0}
              onClick={() => {
                runReject().catch(error => {
                  console.error(error);
                });
              }}
            >
              {t('actions.reject')}
            </PrimaryButton>
            <PrimaryButton
              disabled={pendingAction !== null || selectedPending.length === 0}
              onClick={handleAcceptClick}
            >
              {t('actions.accept')}
            </PrimaryButton>
          </div>
        ) : null}
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
        disabled={isFetching}
      />

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
