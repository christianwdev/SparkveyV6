import styles from './Navbar.module.scss';
import { getTranslations } from 'next-intl/server';
import { Link } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';

export default async function Navbar() {
  const t = await getTranslations('Landing');

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.contentWrapper}>
        <div className={styles.logo}>
          <LogoType />
        </div>

        <div className={styles.links}>
          <Link href="#earn">Earn</Link>
          <Link href="#rewards">Rewards</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="#about-us">About Us</Link>
        </div>

        <div className={styles.ctaButtons}>
          <Link href="/login" className={styles.loginButton}>{t('signIn')}</Link>
          <Link href="/signup" className={styles.signupButton}>{t('register')}</Link>
        </div>
    </div>
  </div>
  );
}
