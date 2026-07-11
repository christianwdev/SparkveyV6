import styles from './AuthenticationLayout.module.scss';
import { getLocale, getTranslations } from 'next-intl/server';

// Utils
import landingUtils from '@utils/landing';
import { clientRequest } from '@utils/clientRequest';

// Hooks
import { Link } from '@i18n/navigation';
import LogoType from '@components/LogoType/LogoType';

export default async function AuthLayout(props: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('AuthLayout');
  const usdEarned = await landingUtils.getSiteStatistics({ request: clientRequest });

  const usdEarnedString = usdEarned.toLocaleString(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).split('');

  return (
    <div className={styles.authPageWrapper}>
      <div className={styles.splashContainer}>
        <LogoType/>

        <div className={styles.splashContent}>
          <h1 className={styles.welcomeText}>
            {t('welcome')}
          </h1>

          <p>
            {t('description')}
          </p>

          <div className={styles.earningInfo}>
            <h2>{t('letsStartEarning')}</h2>

            <div className={styles.earned}>
              {usdEarnedString.map((value, index) => (
                <span
                  className={value === ',' ? styles.comma : ''}
                  key={index}
                >
                  {value}
                </span>
                ))}
            </div>

            <div className={styles.earnedDescription}>
              <p>{t('totalEarnedOnSparkvey')}</p>
              <p>{t('earnedDescription')}</p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Link href="/terms-of-service">
            {t('termsOfService')}
          </Link>

          <Link href="/privacy-policy">
            {t('privacyPolicy')}
          </Link>
        </div>
      </div>

      <div className={styles.authPageContent}>
        <Link
          href="/"
          className={styles.goBack}
        >
          {t('goBack')}
        </Link>

        {props.children}
      </div>
    </div>
  );
}
