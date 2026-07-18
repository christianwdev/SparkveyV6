import styles from './Navbar.module.scss';

// Components
import { Link } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';

// Constants
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Utils
import { getTranslations } from 'next-intl/server';

export default async function Navbar() {
  const t = await getTranslations('Landing');

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.contentWrapper}>
        <div className={styles.logo}>
          <LogoType />
        </div>

        <div className={styles.links}>
          <Link href="#earn">{t('nav.earn')}</Link>
          <Link href="#rewards">{t('nav.rewards')}</Link>
          <Link href="#faq">{t('nav.faq')}</Link>
          <Link href="#about-us">{t('nav.aboutUs')}</Link>
        </div>

        <div className={styles.ctaButtons}>
          <Link href={FrontendRedirectPaths.login} className={styles.loginButton}>{t('signIn')}</Link>
          <Link href="/signup" className={styles.signupButton}>{t('register')}</Link>
        </div>
      </div>
    </div>
  );
}
