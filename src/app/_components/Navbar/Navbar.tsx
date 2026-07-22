'use client';

import styles from './Navbar.module.scss';

// Components
import { Link } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';
import Image from 'next/image';
import UserDropdown from './_components/UserDropdown/UserDropdown';
import EarnDropdown from './_components/EarnDropdown/EarnDropdown';

// Constants
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Hooks
import { useTranslations } from 'next-intl';
import { useUser } from '@contexts/UserProvider';
import { useFormatter } from 'next-intl';

// Icons
import NotificationsIcon from '~icons/mdi/bell.jsx';
import GiftIcon from '~icons/solar/gift-linear.jsx';
import RankingIcon from '~icons/solar/cup-star-linear.jsx';

type NavbarProps = {
  showLinks?: boolean;
};

export default function Navbar({ showLinks }: NavbarProps) {
  const t = useTranslations('Landing');
  const tNav = useTranslations('Navbar');
  const tNotifications = useTranslations('Notifications');
  const formatter = useFormatter();

  const { user } = useUser();
  const sparks = formatter.number(user?.balance.sparks ?? 0);
  const shouldShowLinks = showLinks ?? user;

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.contentWrapper}>
        <Link href={FrontendRedirectPaths.home} className={styles.logo}>
          <LogoType highlight={true} />
        </Link>

        {shouldShowLinks && (
          <div className={styles.links}>
            <EarnDropdown />
            <Link href="/redeem" className={styles.navLink}>
              <GiftIcon className={styles.navIcon} aria-hidden />
              <span>{tNav('links.redeem')}</span>
            </Link>
            <Link href="/leaderboard" className={styles.navLink}>
              <RankingIcon className={styles.navIcon} aria-hidden />
              <span>{tNav('links.leaderboard')}</span>
            </Link>
          </div>
        )}

        {user ? (
          <div className={styles.userProfile}>
            <div className={styles.sparkBalance}>
              <Image
                className={styles.sparkIcon}
                src="/img/logo.svg"
                alt={t('sparksAlt')}
                height={11}
                width={11}
              />
              {sparks}
            </div>

            <button
              type="button"
              className={styles.notificationsButton}
              aria-label={tNotifications('title')}
            >
              <NotificationsIcon />
            </button>

            <UserDropdown />
          </div>
        ) : (
          <div className={styles.ctaButtons}>
            <Link href={FrontendRedirectPaths.login} className={styles.loginButton}>{t('signIn')}</Link>
            <Link href="/signup" className={styles.signupButton}>{t('register')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
