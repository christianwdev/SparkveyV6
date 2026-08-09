'use client';

import { useEffect } from 'react';
import styles from './Navbar.module.scss';

// Components
import { Link, usePathname } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';
import SparksAmount from '@components/SparksAmount/SparksAmount';
import UserDropdown from './_components/UserDropdown/UserDropdown';
import EarnDropdown from './_components/EarnDropdown/EarnDropdown';
import NotificationsDropdown from './_components/NotificationsDropdown/NotificationsDropdown';

// Constants
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Hooks
import { useTranslations } from 'next-intl';
import { useUser } from '@contexts/UserProvider';

// Icons
import GiftIcon from '~icons/solar/gift-linear.jsx';
import RankingIcon from '~icons/solar/cup-star-linear.jsx';
import HomeIcon from '~icons/mdi/home.jsx';
import ChecklistIcon from '~icons/solar/checklist-linear.jsx';
import TrophyIcon from '~icons/mdi/trophy.jsx';
import UsersIcon from '~icons/solar/users-group-rounded-linear.jsx';

type NavbarProps = {
  showLinks?: boolean,
};

const EARN_PREFIXES = [
  FrontendRedirectPaths.tasks,
  FrontendRedirectPaths.explore,
  FrontendRedirectPaths.surveys,
  '/walls',
] as const;

const MOBILE_TABS = [
  {
    href: FrontendRedirectPaths.home,
    labelKey: 'home',
    Icon: HomeIcon,
    isActive: (pathname: string) => pathname === FrontendRedirectPaths.home || pathname === '/',
  },
  {
    href: FrontendRedirectPaths.tasks,
    labelKey: 'earn',
    Icon: ChecklistIcon,
    isActive: (pathname: string) => EARN_PREFIXES.some(prefix => (
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    )),
  },
  {
    href: FrontendRedirectPaths.redeem,
    labelKey: 'shop',
    Icon: GiftIcon,
    isActive: (pathname: string) => (
      pathname === FrontendRedirectPaths.redeem
      || pathname.startsWith(`${FrontendRedirectPaths.redeem}/`)
    ),
  },
  {
    href: FrontendRedirectPaths.leaderboard,
    labelKey: 'leaders',
    Icon: TrophyIcon,
    isActive: (pathname: string) => (
      pathname === FrontendRedirectPaths.leaderboard
      || pathname.startsWith(`${FrontendRedirectPaths.leaderboard}/`)
    ),
  },
  {
    href: FrontendRedirectPaths.affiliates,
    labelKey: 'refer',
    Icon: UsersIcon,
    isActive: (pathname: string) => (
      pathname === FrontendRedirectPaths.affiliates
      || pathname.startsWith(`${FrontendRedirectPaths.affiliates}/`)
    ),
  },
] as const;

export default function Navbar({ showLinks }: NavbarProps) {
  const t = useTranslations('Landing');
  const tNav = useTranslations('Navbar');
  const pathname = usePathname();

  const { user } = useUser();
  const shouldShowLinks = showLinks ?? !!user;

  useEffect(() => {
    if (!user) {
      delete document.documentElement.dataset.mobileNav;

      return;
    }

    document.documentElement.dataset.mobileNav = 'true';

    return () => {
      delete document.documentElement.dataset.mobileNav;
    };
  }, [ user ]);

  return (
    <>
      <div className={styles.navbarWrapper}>
        <div className={styles.contentWrapper}>
          <Link href={FrontendRedirectPaths.home} className={styles.logo}>
            <LogoType highlight={true} />
          </Link>

          {shouldShowLinks && (
            <div className={styles.links}>
              <EarnDropdown />
              <Link href={FrontendRedirectPaths.redeem} className={styles.navLink}>
                <GiftIcon className={styles.navIcon} aria-hidden />
                <span>{tNav('links.redeem')}</span>
              </Link>
              <Link href={FrontendRedirectPaths.leaderboard} className={styles.navLink}>
                <RankingIcon className={styles.navIcon} aria-hidden />
                <span>{tNav('links.leaderboard')}</span>
              </Link>
            </div>
          )}

          {user ? (
            <div className={styles.userProfile}>
              <div className={styles.sparkBalance}>
                <SparksAmount amount={user.balance.sparks} />
              </div>

              <NotificationsDropdown />
              <UserDropdown />
            </div>
          ) : (
            <div className={styles.ctaButtons}>
              <Link href={FrontendRedirectPaths.login} className={styles.loginButton}>{t('signIn')}</Link>
              <Link href={FrontendRedirectPaths.signup} className={styles.signupButton}>{t('register')}</Link>
            </div>
          )}
        </div>
      </div>

      {user && (
        <nav className={styles.mobileNav} aria-label={tNav('mobile.navLabel')}>
          {MOBILE_TABS.map(({ href, labelKey, Icon, isActive }) => {
            const active = isActive(pathname);

            return (
              <Link
                key={href}
                href={href}
                className={[ styles.mobileTab, active ? styles.active : '' ].filter(Boolean).join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={styles.mobileIcon} aria-hidden />
                <span>{tNav(`mobile.${labelKey}`)}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
