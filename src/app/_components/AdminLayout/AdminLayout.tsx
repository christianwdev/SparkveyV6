'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { useUser } from '@contexts/UserProvider';
import styles from './AdminLayout.module.scss';

// Icons
import ChartIcon from '~icons/solar/chart-linear.jsx';
import UsersIcon from '~icons/solar/users-group-rounded-linear.jsx';
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
    href: `${FrontendRedirectPaths.admin}/users`,
    labelKey: 'users',
    Icon: UsersIcon,
    exact: false,
    permission: StaffPermissions.VIEW_USERS,
  },
] as const;

function resolvePageTitleKey(pathname: string): 'dashboard' | 'users' {
  if (pathname === FrontendRedirectPaths.admin || pathname === `${FrontendRedirectPaths.admin}/`) {
    return 'dashboard';
  }

  if (pathname.startsWith(`${FrontendRedirectPaths.admin}/users`)) {
    return 'users';
  }

  return 'dashboard';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AdminLayout');
  const pathname = usePathname();
  const { user } = useUser();
  const permissions = user?.staffPermissions ?? StaffPermissions.NONE;
  const pageTitleKey = resolvePageTitleKey(pathname);

  const visibleNav = ADMIN_NAV.filter(item => (permissions & item.permission) === item.permission);

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <Link href={FrontendRedirectPaths.admin} className={styles.logoWrapper}>
            <Image
              src="/img/logo.svg"
              alt=""
              width={24}
              height={24}
              aria-hidden
            />
            <span>{t('brand')}</span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label={t('navLabel')}>
          <p className={styles.navSection}>{t('navSectionOverview')}</p>
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
                <Icon aria-hidden />
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

        <div className={styles.main}>
          {children}
        </div>
      </div>
    </div>
  );
}
