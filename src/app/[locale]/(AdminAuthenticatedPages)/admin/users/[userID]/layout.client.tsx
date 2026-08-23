'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import { useUser } from '@contexts/UserProvider';
import { useAdminUserQuery } from '@hooks/useAdminUsers';
import { useAdminUserRisk } from '@contexts/AdminUserRiskContext';
import { hasPermissions } from '@utils/admin';
import { isCurrentlyBanned, toDate } from '@utils/date';
import { getUserAvatarUrl } from '@utils/avatar';

// Icons
import ArrowLeftIcon from '~icons/solar/arrow-left-linear.jsx';
import CopyIcon from '~icons/solar/copy-linear.jsx';
import CheckIcon from '~icons/solar/check-read-linear.jsx';
import UserIcon from '~icons/solar/user-rounded-linear.jsx';
import SettingsIcon from '~icons/solar/settings-linear.jsx';
import EarningsIcon from '~icons/solar/chart-linear.jsx';
import TransferIcon from '~icons/solar/wallet-money-linear.jsx';
import GiftIcon from '~icons/solar/gift-linear.jsx';
import SessionsIcon from '~icons/solar/devices-linear.jsx';
import UsersIcon from '~icons/solar/users-group-rounded-linear.jsx';
import LetterIcon from '~icons/solar/clipboard-check-linear.jsx';

// Types
import type { ReactNode } from 'react';
import type AdminUser from 'types/AdminUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './layout.module.scss';

type AdminUserLayoutClientProps = {
  userID: string,
  children: ReactNode,
};

const USER_NAV = [
  {
    suffix: '',
    labelKey: 'overview',
    Icon: UserIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    suffix: '/settings',
    labelKey: 'settings',
    Icon: SettingsIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    suffix: '/earnings',
    labelKey: 'earnings',
    Icon: EarningsIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_EARNINGS,
  },
  {
    suffix: '/transactions',
    labelKey: 'transactions',
    Icon: TransferIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    suffix: '/redemptions',
    labelKey: 'redemptions',
    Icon: GiftIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_WITHDRAWALS,
  },
  {
    suffix: '/sessions',
    labelKey: 'sessions',
    Icon: SessionsIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    suffix: '/affiliates',
    labelKey: 'affiliates',
    Icon: UsersIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    suffix: '/emails',
    labelKey: 'emails',
    Icon: LetterIcon,
    exact: true,
    permission: StaffPermissions.VIEW_USERS,
  },
] as const;

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

export default function AdminUserLayoutClient({
  userID,
  children,
}: AdminUserLayoutClientProps) {
  const t = useTranslations('AdminUser');
  const formatter = useFormatter();
  const pathname = usePathname();
  const { user: actor } = useUser();
  const { openUserRisk } = useAdminUserRisk();
  const { data: user, isPending, isError } = useAdminUserQuery({
    userID,
  });
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ copied, setCopied ] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  async function copyUserId() {
    try {
      await navigator.clipboard.writeText(userID);
      setCopied(true);

      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  const baseHref = `${FrontendRedirectPaths.adminUsers}/${userID}`;
  const visibleNav = USER_NAV.filter(item => hasPermissions({
    userPermissions: actor?.staffPermissions,
    required: item.permission,
  }));

  if (isError || (!isPending && !user)) {
    return (
      <div className={styles.userLayout}>
        <Link href={FrontendRedirectPaths.adminUsers} className={styles.backLink}>
          <ArrowLeftIcon aria-hidden />
          <span>{t('backToUsers')}</span>
        </Link>
        <div className={styles.missing}>
          <p>{t('notFound')}</p>
        </div>
      </div>
    );
  }

  const status = user ? userStatus(user) : null;
  const createdAt = user ? toDate(user.creationDate) : null;
  const activeFlagCount = user?.flags?.activeFlagCount ?? 0;

  return (
    <div className={styles.userLayout}>
      <Link href={FrontendRedirectPaths.adminUsers} className={styles.backLink}>
        <ArrowLeftIcon aria-hidden />
        <span>{t('backToUsers')}</span>
      </Link>

      {user ? (
        <div className={styles.header}>
          <div className={styles.identity}>
            <Image
              className={styles.avatar}
              src={getUserAvatarUrl(user.userID)}
              alt=""
              width={56}
              height={56}
            />
            <div className={styles.meta}>
              <div className={styles.nameRow}>
                <h1>{user.username || t('unnamed')}</h1>
                {status ? (
                  <span className={styles.status} data-tone={statusTone(status)}>
                    {t(`status.${status}`)}
                  </span>
                ) : null}
                <button
                  type="button"
                  className={activeFlagCount > 0 ? styles.flagBadge : styles.reviewFlags}
                  onClick={() => openUserRisk(userID)}
                >
                  {activeFlagCount > 0
                    ? t('flagCount', { count: activeFlagCount })
                    : t('actions.reviewFlags')}
                </button>
              </div>
              <div className={styles.idRow}>
                <span className={styles.idValue}>{user.userID}</span>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => {
                    copyUserId().catch(error => {
                      console.error(error);
                    });
                  }}
                  aria-label={copied ? t('copied') : t('copyId')}
                >
                  {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </button>
              </div>
            </div>
          </div>

          <dl className={styles.summary}>
            <div className={styles.stat}>
              <dt>{t('summary.balance')}</dt>
              <dd><SparksAmount amount={user.balance.sparks} /></dd>
            </div>
            <div className={styles.stat}>
              <dt>{t('summary.email')}</dt>
              <dd>{user.emailInformation?.emailAddress || t('na')}</dd>
            </div>
            <div className={styles.stat}>
              <dt>{t('summary.created')}</dt>
              <dd>
                {createdAt
                  ? formatter.dateTime(createdAt, { dateStyle: 'medium' })
                  : t('na')}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <nav className={styles.nav} aria-label={t('navLabel')}>
        {visibleNav.map(({ suffix, labelKey, Icon, exact }) => {
          const href = `${baseHref}${suffix}`;
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={[ styles.navLink, isActive ? styles.navLinkActive : '' ].filter(Boolean).join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden />
              <span>{t(`nav.${labelKey}`)}</span>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
