'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import ModalShell from '@components/ModalShell/ModalShell';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';
import Skeleton from '@components/Skeleton/Skeleton';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useAdminUserRiskQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';
import { useUser } from '@contexts/UserProvider';
import { hasPermissions } from '@utils/admin';
import { clearAdminUserFlagRequest } from '@utils/adminWithdrawals';
import { isCurrentlyBanned, toDate } from '@utils/date';

// Types
import type UserFlag from 'types/UserFlag';
import type { UserFlagType } from 'types/UserFlag';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './AdminUserRiskModal.module.scss';

type AdminUserRiskModalProps = {
  userID: string,
  onClose: () => void,
};

function accountStatus(
  {
    deletedAt,
    bannedUntil,
  }: {
    deletedAt?: Date,
    bannedUntil?: Date,
  },
): 'deleted' | 'banned' | 'active' {
  if (deletedAt) return 'deleted';
  if (isCurrentlyBanned(bannedUntil)) return 'banned';

  return 'active';
}

export default function AdminUserRiskModal(
  {
    userID,
    onClose,
  }: AdminUserRiskModalProps,
) {
  const t = useTranslations('AdminUserRiskModal');
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const { user: actor } = useUser();
  const { data, isPending, isError } = useAdminUserRiskQuery({ userID });
  const canClear = hasPermissions({
    userPermissions: actor?.staffPermissions,
    required: StaffPermissions.MODIFY_USERS,
  });

  function flagLabel(type: UserFlagType): string {
    return t(`flagTypes.${type}`);
  }

  async function clearFlag(flag: UserFlag) {
    const result = await clearAdminUserFlagRequest({
      userID,
      flagID: flag.flagID,
    });

    if (!result.success) {
      toast.error(t('errors.clearFailed'));

      return;
    }

    toast.success(t('success.flagCleared'));
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.risk(userID) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.withdrawals.all() });
  }

  const createdAt = data ? toDate(data.user.createdAt) : null;
  const status = data
    ? accountStatus({
      deletedAt: toDate(data.user.deletedAt) ?? undefined,
      bannedUntil: toDate(data.user.bannedUntil) ?? undefined,
    })
    : 'active';

  return (
    <ModalShell
      onClose={onClose}
      closeLabel={t('close')}
    >
      <div className={styles.root}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h2>{data?.user.username || t('title')}</h2>
          <p>{t('subtitle')}</p>
        </header>

        {isPending ? (
          <div className={styles.loading} aria-busy="true">
            <Skeleton width="40%" height={16} borderRadius={6} />
            <Skeleton width="100%" height={120} borderRadius={8} />
            <Skeleton width="100%" height={160} borderRadius={8} />
          </div>
        ) : null}

        {isError ? (
          <p className={styles.error}>{t('errors.loadFailed')}</p>
        ) : null}

        {data ? (
          <>
            <section className={styles.summary}>
              <div className={styles.stat}>
                <span>{t('fields.status')}</span>
                <strong data-tone={status === 'active' ? 'positive' : 'negative'}>
                  {t(`status.${status}`)}
                </strong>
              </div>
              <div className={styles.stat}>
                <span>{t('fields.balance')}</span>
                <SparksAmount amount={data.user.balanceSparks} />
              </div>
              <div className={styles.stat}>
                <span>{t('fields.earned')}</span>
                <SparksAmount amount={data.user.earnedTotal} />
              </div>
              <div className={styles.stat}>
                <span>{t('fields.withdrawn')}</span>
                <SparksAmount amount={data.user.withdrawn} />
              </div>
              <div className={styles.stat}>
                <span>{t('fields.chargebacks')}</span>
                <strong>
                  {t('chargebackValue', {
                    count: data.chargebacks.count,
                    usd: formatter.number(data.chargebacks.usdValue, {
                      style: 'currency',
                      currency: 'USD',
                    }),
                  })}
                </strong>
              </div>
              <div className={styles.stat}>
                <span>{t('fields.created')}</span>
                <strong>
                  {createdAt
                    ? formatter.dateTime(createdAt, { dateStyle: 'medium' })
                    : t('na')}
                </strong>
              </div>
            </section>

            <section className={styles.flags}>
              <h3>{t('flagsTitle')}</h3>
              {data.flags.length === 0 ? (
                <p className={styles.empty}>{t('noFlags')}</p>
              ) : (
                <ul>
                  {data.flags.map(flag => (
                    <li key={flag.flagID} data-status={flag.status}>
                      <div className={styles.flagCopy}>
                        <strong>{flagLabel(flag.type)}</strong>
                        <span>{t(`flagStatus.${flag.status}`)}</span>
                        {flag.meta.otherUserIDs && flag.meta.otherUserIDs.length > 0 ? (
                          <p>
                            {t('linkedUsers', {
                              count: flag.meta.otherUserIDs.length,
                            })}
                          </p>
                        ) : null}
                      </div>
                      {canClear && flag.status === 'active' ? (
                        <PrimaryButton
                          variant="secondary"
                          onClick={() => {
                            clearFlag(flag).catch(error => {
                              console.error(error);
                            });
                          }}
                        >
                          {t('actions.clear')}
                        </PrimaryButton>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className={styles.footer}>
              <Link
                href={`${FrontendRedirectPaths.adminUsers}/${userID}`}
                className={styles.profileLink}
              >
                {t('actions.viewProfile')}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
