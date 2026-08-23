'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

// Components
import DataTable, { type DataTableColumn } from '@components/DataTable/DataTable';
import ModalShell from '@components/ModalShell/ModalShell';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import Skeleton from '@components/Skeleton/Skeleton';

// Hooks
import { useUser } from '@contexts/UserProvider';
import { useAdminAnnouncementsQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';

// Utils
import { hasPermissions } from '@utils/admin';
import {
  createAdminAnnouncementRequest,
  disableAdminAnnouncementRequest,
} from '@utils/adminAnnouncements';
import { toDate } from '@utils/date';
import { ANNOUNCEMENT_MESSAGE_MAX_LENGTH } from 'types/Settings/AnnouncementSettings';

// Types
import type AnnouncementSettings from 'types/Settings/AnnouncementSettings';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

function AnnouncementsTableFallback() {
  return (
    <div aria-busy="true">
      <Skeleton width="40%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={160} borderRadius={12} />
    </div>
  );
}

function AnnouncementsPageContent() {
  const t = useTranslations('AdminAnnouncements');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: rows = [], isPending, isFetching, isError } = useAdminAnnouncementsQuery();
  const [ createOpen, setCreateOpen ] = useState<boolean>(false);
  const [ message, setMessage ] = useState<string>('');
  const [ creating, setCreating ] = useState<boolean>(false);
  const [ disabling, setDisabling ] = useState<boolean>(false);

  const canModify = hasPermissions({
    userPermissions: user?.staffPermissions,
    required: StaffPermissions.MODIFY_ANNOUNCEMENTS,
  });

  async function invalidateAnnouncementQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.announcement.active() }),
    ]);
  }

  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(t('errors.emptyMessage'));

      return;
    }

    if (trimmed.length > ANNOUNCEMENT_MESSAGE_MAX_LENGTH) {
      toast.error(t('errors.messageTooLong'));

      return;
    }

    if (creating) return;

    setCreating(true);

    try {
      const result = await createAdminAnnouncementRequest({ message: trimmed });
      if (!result.success) {
        toast.error(result.message || t('errors.createFailed'));

        return;
      }

      toast.success(t('success.created'));
      setMessage('');
      setCreateOpen(false);
      await invalidateAnnouncementQueries();
    } finally {
      setCreating(false);
    }
  }

  async function disableRow() {
    if (disabling) return;

    setDisabling(true);

    try {
      const result = await disableAdminAnnouncementRequest();
      if (!result.success) {
        toast.error(result.message || t('errors.disableFailed'));

        return;
      }

      toast.success(t('success.disabled'));
      await invalidateAnnouncementQueries();
    } finally {
      setDisabling(false);
    }
  }

  const columns: DataTableColumn<AnnouncementSettings>[] = [
    {
      id: 'message',
      header: t('table.message'),
      cell: (row) => (
        <span className={styles.messageCell}>{row.message}</span>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <span className={styles.status} data-tone={row.active ? 'positive' : undefined}>
          {row.active ? t('statuses.active') : t('statuses.inactive')}
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
  ];

  if (canModify) {
    columns.push({
      id: 'actions',
      header: t('table.actions'),
      cell: (row) => {
        if (!row.active) return t('na');

        return (
          <button
            type="button"
            className={styles.actionLink}
            disabled={disabling}
            onClick={() => {
              disableRow().catch(error => {
                console.error(error);
                toast.error(t('errors.disableFailed'));
              });
            }}
          >
            {disabling ? t('actions.disabling') : t('actions.disable')}
          </button>
        );
      },
    });
  }

  const loading = isPending || (isFetching && rows.length === 0);

  return (
    <>
      {canModify && (
        <div className={styles.controls}>
          <PrimaryButton
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            {t('create')}
          </PrimaryButton>
        </div>
      )}

      {createOpen && (
        <ModalShell
          compact
          onClose={() => setCreateOpen(false)}
          closeLabel={t('close')}
          header={<h2 className={styles.modalTitle}>{t('modalTitle')}</h2>}
        >
          <form
            className={styles.createForm}
            onSubmit={event => {
              createAnnouncement(event).catch(error => {
                console.error(error);
                toast.error(t('errors.createFailed'));
              });
            }}
          >
            <label className={styles.field} htmlFor="announcement-message">
              <span>{t('messageLabel')}</span>
              <textarea
                id="announcement-message"
                value={message}
                maxLength={ANNOUNCEMENT_MESSAGE_MAX_LENGTH}
                rows={4}
                placeholder={t('messagePlaceholder')}
                onChange={event => setMessage(event.target.value)}
              />
              <span className={styles.characterCount}>
                {t('characterCount', { count: message.length })}
              </span>
            </label>

            <div className={styles.modalActions}>
              <PrimaryButton
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
              >
                {t('cancel')}
              </PrimaryButton>
              <PrimaryButton
                type="submit"
                disabled={creating}
              >
                {creating ? t('creating') : t('submit')}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}

      {isError ? (
        <div className={styles.errorState}>
          <p>{t('errors.loadFailed')}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={row => row.type}
          loading={loading}
          skeletonRows={1}
          emptyMessage={t('empty')}
        />
      )}
    </>
  );
}

export default function AdminAnnouncementsClient() {
  return (
    <Suspense fallback={<AnnouncementsTableFallback />}>
      <AnnouncementsPageContent />
    </Suspense>
  );
}
