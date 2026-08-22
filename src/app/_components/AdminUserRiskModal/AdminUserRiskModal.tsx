'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import ModalShell from '@components/ModalShell/ModalShell';
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

// Icons
import OpenInNewIcon from '~icons/mdi/open-in-new.jsx';

import styles from './AdminUserRiskModal.module.scss';

type AdminUserRiskModalProps = {
  userID: string,
  onClose: () => void,
};

const MINUTE_MS = 60000;

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

function shortId(id: string): string {
  if (id.length <= 12) return id;

  return `${id.slice(0, 8)}…`;
}

function flagDetail(
  {
    flag,
    t,
  }: {
    flag: UserFlag,
    t: ReturnType<typeof useTranslations<'AdminUserRiskModal'>>,
  },
): string {
  if (flag.type === 'sharedWithdrawalAddress') {
    return t('flagDetails.sharedWithdrawalAddress', {
      wallet: flag.meta.walletAddress ?? t('na'),
    });
  }

  if (flag.type === 'sharedEmail') {
    return t('flagDetails.sharedEmail', {
      email: flag.meta.email ?? t('na'),
    });
  }

  if (flag.type === 'linkedAccount') {
    return t('flagDetails.linkedAccount', {
      ip: flag.meta.ipAddress ?? t('na'),
    });
  }

  if (flag.type === 'proxy') {
    return t('flagDetails.proxy', {
      ip: flag.meta.ipAddress ?? t('na'),
    });
  }

  const minutes = flag.meta.deltaMs == null
    ? null
    : Math.max(1, Math.round(flag.meta.deltaMs / MINUTE_MS));

  return t('flagDetails.impossibleTravel', {
    from: flag.meta.fromCountry ?? t('na'),
    to: flag.meta.toCountry ?? t('na'),
    duration: minutes == null
      ? t('na')
      : t('flagDetails.minutes', { count: minutes }),
  });
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

  function relatedName(relatedUserID: string): string {
    const linked = data?.linkedUsers.find(user => user.userID === relatedUserID);

    return linked?.username || shortId(relatedUserID);
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
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
      compact
      onClose={onClose}
      closeLabel={t('close')}
    >
      <div className={styles.root}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <div className={styles.titleRow}>
            <h2>{data?.user.username || t('title')}</h2>
            <Link
              href={`${FrontendRedirectPaths.adminUsers}/${userID}`}
              className={styles.profileLink}
              aria-label={t('actions.viewProfile')}
              title={t('actions.viewProfile')}
            >
              <OpenInNewIcon aria-hidden />
            </Link>
          </div>
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
                  {data.flags.map(flag => {
                    const flaggedAt = toDate(flag.createdAt);
                    const relatedIDs = flag.meta.otherUserIDs ?? [];

                    return (
                      <li key={flag.flagID} data-status={flag.status}>
                        <div className={styles.flagCopy}>
                          <div className={styles.flagHeading}>
                            <strong>{flagLabel(flag.type)}</strong>
                            <span data-status={flag.status}>
                              {t(`flagStatus.${flag.status}`)}
                            </span>
                          </div>
                          <p>{flagDetail({ flag, t })}</p>
                          {relatedIDs.length > 0 ? (
                            <div className={styles.related}>
                              <span>{t('relatedAccounts')}</span>
                              {relatedIDs.map(relatedUserID => (
                                <Link
                                  key={relatedUserID}
                                  href={`${FrontendRedirectPaths.adminUsers}/${relatedUserID}`}
                                >
                                  {relatedName(relatedUserID)}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                          {flaggedAt ? (
                            <span className={styles.flaggedAt}>
                              {t('flaggedAt', {
                                date: formatter.dateTime(flaggedAt, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }),
                              })}
                            </span>
                          ) : null}
                        </div>
                        {canClear && flag.status === 'active' ? (
                          <button
                            type="button"
                            className={styles.clearButton}
                            onClick={() => {
                              clearFlag(flag).catch(error => {
                                console.error(error);
                              });
                            }}
                          >
                            {t('actions.clear')}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
