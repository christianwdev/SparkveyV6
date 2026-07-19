'use client';

import styles from './Navbar.module.scss';

// Components
import { Link } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';
import NotificationsIcon from '~icons/mdi/bell.jsx';
import Image from 'next/image';
import UserDropdown from './_components/UserDropdown/UserDropdown';

// Constants
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Hooks
import { useTranslations } from 'next-intl';
import { useUser } from '@contexts/UserProvider';
import { useFormatter } from 'next-intl';

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
        <div className={styles.logo}>
          <LogoType highlight={true} />
        </div>

        {shouldShowLinks && (
          <div className={styles.links}>
            <Link href="/earn">{tNav('links.earn')}</Link>
            <Link href="/redeem">{tNav('links.redeem')}</Link>
            <Link href="/leaderboard">{tNav('links.leaderboard')}</Link>
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
