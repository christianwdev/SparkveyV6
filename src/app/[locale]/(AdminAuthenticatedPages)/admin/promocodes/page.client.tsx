'use client';

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import Pagination from '@components/Pagination/Pagination';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useUser } from '@contexts/UserProvider';
import { queryKeys } from '@hooks/queryKeys';
import { hasPermissions } from '@utils/admin';
import {
  ADMIN_PROMOCODES_PAGE_SIZE,
  createAdminPromocodeRequest,
  deleteAdminPromocodeRequest,
  fetchAdminPromocodes,
} from '@utils/adminPromocodes';
import { toDate } from '@utils/date';

// Types
import type InternalPromocode from 'types/InternalPromocode';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

function createErrorKey(code?: string): 'errors.alreadyExists' | 'errors.invalidExpiry' | 'errors.createFailed' {
  if (code === 'alreadyExists') return 'errors.alreadyExists';
  if (code === 'invalidExpiry') return 'errors.invalidExpiry';

  return 'errors.createFailed';
}

function PromocodesPageContent() {
  const t = useTranslations('AdminPromocodes');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [ page, setPage ] = useState(1);
  const [ code, setCode ] = useState('');
  const [ rewardValue, setRewardValue ] = useState('');
  const [ totalUses, setTotalUses ] = useState('');
  const [ expiryDate, setExpiryDate ] = useState('');
  const [ creating, setCreating ] = useState(false);
  const [ deletingCode, setDeletingCode ] = useState<string | null>(null);

  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: queryKeys.admin.promocodes.list(page),
    queryFn: async () => {
      const result = await fetchAdminPromocodes({ page });

      if (!result) throw new Error('Failed to load promocodes');

      return result;
    },
  });

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_PROMOCODES,
  });

  const rows = data?.promocodes ?? [];
  const hasNextPage = (data?.total ?? 0) > page * ADMIN_PROMOCODES_PAGE_SIZE;
  const loading = isPending || (isFetching && rows.length === 0);

  async function invalidateList() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.promocodes.all() });
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    const parsedReward = Number(rewardValue);
    const parsedUses = Number(totalUses);

    setCreating(true);

    try {
      const result = await createAdminPromocodeRequest({
        code,
        rewardValue: parsedReward,
        totalUses: parsedUses,
        expiryDate,
      });

      if (!result.success) {
        toast.error(result.message || t(createErrorKey(result.code)));

        return;
      }

      toast.success(t('success.created'));
      setCode('');
      setRewardValue('');
      setTotalUses('');
      setExpiryDate('');
      setPage(1);
      await invalidateList();
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(promocode: string) {
    if (deletingCode) return;

    setDeletingCode(promocode);

    try {
      const result = await deleteAdminPromocodeRequest({ code: promocode });

      if (!result.success) {
        toast.error(result.message || t('errors.deleteFailed'));

        return;
      }

      toast.success(t('success.deleted'));
      if (page > 1 && rows.length === 1) setPage(page - 1);
      await invalidateList();
    } finally {
      setDeletingCode(null);
    }
  }

  const columns: DataTableColumn<InternalPromocode>[] = [
    {
      id: 'code',
      header: t('table.code'),
      cell: row => <span className={styles.mono}>{row.code}</span>,
    },
    {
      id: 'uses',
      header: t('table.uses'),
      cell: row => `${row.uses} / ${row.totalUses}`,
    },
    {
      id: 'reward',
      header: t('table.reward'),
      cell: row => <SparksAmount amount={row.reward.value} />,
    },
    {
      id: 'expiry',
      header: t('table.expiry'),
      cell: row => {
        const date = toDate(row.expiryDate);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'created',
      header: t('table.created'),
      cell: row => {
        const date = toDate(row.createdAt);

        return date
          ? formatter.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' })
          : t('na');
      },
    },
    {
      id: 'claimedBy',
      header: t('table.claimedBy'),
      cell: row => {
        if (row.claimedBy.length === 0) return t('na');

        return (
          <div className={styles.claimedBy}>
            {row.claimedBy.map(userID => (
              <Link
                key={userID}
                href={`${FrontendRedirectPaths.adminUsers}/${userID}`}
                className={styles.claimedLink}
              >
                {userID}
              </Link>
            ))}
          </div>
        );
      },
    },
  ];

  if (canModify) {
    columns.push({
      id: 'actions',
      header: t('table.actions'),
      cell: row => {
        if (row.disabled) return t('na');

        const deleting = deletingCode === row.code;

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={deletingCode !== null}
            onClick={() => {
              onDelete(row.code).catch(error => {
                console.error(error);
              });
            }}
          >
            {deleting ? t('actions.deleting') : t('actions.delete')}
          </button>
        );
      },
    });
  }

  return (
    <>
      {canModify && (
        <form className={styles.createForm} onSubmit={onCreate}>
          <label className={styles.field}>
            <span>{t('form.code')}</span>
            <input
              type="text"
              value={code}
              minLength={3}
              maxLength={32}
              required
              onChange={event => setCode(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t('form.rewardValue')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={rewardValue}
              required
              onChange={event => setRewardValue(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t('form.totalUses')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={totalUses}
              required
              onChange={event => setTotalUses(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>{t('form.expiryDate')}</span>
            <input
              type="date"
              value={expiryDate}
              required
              onChange={event => setExpiryDate(event.target.value)}
            />
          </label>
          <PrimaryButton type="submit" disabled={creating}>
            {creating ? t('form.creating') : t('form.create')}
          </PrimaryButton>
        </form>
      )}

      {isError ? (
        <div className={styles.errorState}>
          <p>{t('errors.loadFailed')}</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={row => row.code}
            loading={loading}
            emptyMessage={t('empty')}
          />
          <Pagination
            page={page}
            pageSize={ADMIN_PROMOCODES_PAGE_SIZE}
            itemCount={rows.length}
            hasNextPage={hasNextPage}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </>
      )}
    </>
  );
}

export default function AdminPromocodesClient() {
  return <PromocodesPageContent />;
}
