'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { useUser } from '@contexts/UserProvider';
import { AdminUserRiskProvider } from '@contexts/AdminUserRiskContext';
import { hasPermissions } from '@utils/admin';
import styles from './AdminLayout.module.scss';

// Icons
import ChartIcon from '~icons/solar/chart-linear.jsx';
import UsersIcon from '~icons/solar/users-group-rounded-linear.jsx';
import GraphUpIcon from '~icons/solar/graph-up-linear.jsx';
import ChecklistIcon from '~icons/solar/checklist-linear.jsx';
import WalletIcon from '~icons/solar/wallet-money-linear.jsx';
import GiftIcon from '~icons/solar/gift-linear.jsx';
import TicketIcon from '~icons/solar/ticket-sale-linear.jsx';
import BellIcon from '~icons/mdi/bell.jsx';
import ChatIcon from '~icons/solar/chat-round-linear.jsx';
import ArrowLeftIcon from '~icons/solar/arrow-left-linear.jsx';

// Types
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const ADMIN_NAV = [
  {
    href: FrontendRedirectPaths.admin,
    labelKey: 'dashboard',
    Icon: ChartIcon,
    exact: true,
    permission: StaffPermissions.VIEW_STATISTICS,
  },
  {
    href: FrontendRedirectPaths.adminUsers,
    labelKey: 'users',
    Icon: UsersIcon,
    exact: false,
    permission: StaffPermissions.VIEW_USERS,
  },
  {
    href: FrontendRedirectPaths.adminEarnings,
    labelKey: 'earnings',
    Icon: GraphUpIcon,
    exact: false,
    permission: StaffPermissions.VIEW_EARNINGS,
  },
  {
    href: FrontendRedirectPaths.adminPostbacks,
    labelKey: 'postbacks',
    Icon: ChecklistIcon,
    exact: false,
    permission: StaffPermissions.VIEW_POSTBACKS,
  },
  {
    href: FrontendRedirectPaths.adminWithdrawals,
    labelKey: 'withdrawals',
    Icon: WalletIcon,
    exact: false,
    permission: StaffPermissions.VIEW_WITHDRAWALS,
  },
  {
    href: FrontendRedirectPaths.adminOffers,
    labelKey: 'offers',
    Icon: ChecklistIcon,
    exact: false,
    permission: StaffPermissions.VIEW_OFFERS,
  },
  {
    href: FrontendRedirectPaths.adminRedemptionMethods,
    labelKey: 'redemptionMethods',
    Icon: GiftIcon,
    exact: false,
    permission: StaffPermissions.VIEW_OFFERS,
  },
  {
    href: FrontendRedirectPaths.adminPromocodes,
    labelKey: 'promocodes',
    Icon: TicketIcon,
    exact: false,
    permission: StaffPermissions.VIEW_PROMOCODES,
  },
  {
    href: FrontendRedirectPaths.adminAnnouncements,
    labelKey: 'announcements',
    Icon: BellIcon,
    exact: false,
    permission: StaffPermissions.VIEW_ANNOUNCEMENTS,
  },
  {
    href: FrontendRedirectPaths.adminChat,
    labelKey: 'chat',
    Icon: ChatIcon,
    exact: false,
    permission: StaffPermissions.VIEW_CHAT,
  },
] as const;

function resolvePageTitleKey(
  pathname: string,
): 'dashboard' | 'users' | 'earnings' | 'postbacks' | 'withdrawals' | 'offers' | 'redemptionMethods' | 'promocodes' | 'announcements' | 'chat' {
  if (pathname === FrontendRedirectPaths.admin || pathname === `${FrontendRedirectPaths.admin}/`) {
    return 'dashboard';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminEarnings)) {
    return 'earnings';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminPostbacks)) {
    return 'postbacks';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminWithdrawals)) {
    return 'withdrawals';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminRedemptionMethods)) {
    return 'redemptionMethods';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminOffers)) {
    return 'offers';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminPromocodes)) {
    return 'promocodes';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminAnnouncements)) {
    return 'announcements';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminChat)) {
    return 'chat';
  }

  if (pathname.startsWith(FrontendRedirectPaths.adminUsers)) {
    return 'users';
  }

  return 'dashboard';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AdminLayout');
  const pathname = usePathname();
  const { user } = useUser();
  const pageTitleKey = resolvePageTitleKey(pathname);

  const visibleNav = ADMIN_NAV.filter(item => hasPermissions({
    userPermissions: user?.staffPermissions,
    required: item.permission,
  }));

  const isChat = pageTitleKey === 'chat';

  return (
    <div className={[ styles.adminShell, isChat ? styles.chatMode : '' ].filter(Boolean).join(' ')}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <Link href={FrontendRedirectPaths.admin} className={styles.logoWrapper}>
            <Image
              src="/img/logo.svg"
              alt=""
              width={28}
              height={28}
              aria-hidden
            />
            <span className={styles.brandCopy}>
              <span className={styles.brandName}>{t('brand')}</span>
              <span className={styles.adminBadge}>{t('brandHint')}</span>
            </span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label={t('navLabel')}>
          {visibleNav.map(({ href, labelKey, Icon, exact }) => {
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
                <span className={styles.iconWell} aria-hidden>
                  <Icon />
                </span>
                <span>{t(`nav.${labelKey}`)}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href={FrontendRedirectPaths.home} className={styles.footerLink}>
            <ArrowLeftIcon aria-hidden />
            <span>{t('backToSite')}</span>
          </Link>
        </div>
      </aside>

      <div className={styles.contentColumn}>
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>{t(`nav.${pageTitleKey}`)}</h1>
        </header>

        <div className={[ styles.main, isChat ? styles.mainFlush : '' ].filter(Boolean).join(' ')}>
          <AdminUserRiskProvider>
            {children}
          </AdminUserRiskProvider>
        </div>
      </div>
    </div>
  );
}
