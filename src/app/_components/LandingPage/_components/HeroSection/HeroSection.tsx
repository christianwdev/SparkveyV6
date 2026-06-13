import styles from './HeroSection.module.scss';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@i18n/navigation';
import AnimatedText from '../AnimatedText/AnimatedText';

type LandingProps = {
  usdEarned: number;
};

export default async function LandingPage({ usdEarned }: LandingProps) {
  const locale = await getLocale();
  const t = await getTranslations('Landing');

  return (
    <div className={styles.heroContainer}>
      <div className={styles.shapesWrapper}>
        <Image
          src='/img/stocks/macaroni.webp'
          alt='Decorative Macaroni'
          width={118}
          height={118}
          className={styles.macaroni}
        />

        <Image
          src='/img/stocks/spring.webp'
          alt='Decorative Spring'
          width={118}
          height={118}
          className={styles.spring}
        />

        <Image
          src='/img/stocks/cone.webp'
          alt='Decorative Cone'
          width={150}
          height={150}
          className={styles.cone}
        />
      </div>

      <div className={styles.circleWrapper}>
        <svg className={[ styles.circle, styles.light ].join(' ')} width="1920" height="1138" viewBox="0 0 1920 1138" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="959.5" cy="1228.5" r="1168.5" stroke="url(#paint0_linear_3734_25)" strokeWidth="120" />
          <defs>
            <linearGradient id="paint0_linear_3734_25" x1="959.5" y1="-1783" x2="959.5" y2="744" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DADCE0" />
              <stop offset="1" stopColor="#DADCE0" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <svg className={[ styles.circle, styles.dark ].join(' ')} width="1920" height="1138" viewBox="0 0 1920 1138" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="959.5" cy="1228.5" r="1168.5" stroke="url(#paint0_linear_3734_174)" strokeWidth="120" />
          <defs>
            <linearGradient id="paint0_linear_3734_174" x1="959.5" y1="-1783" x2="959.5" y2="744" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10151F" />
              <stop offset="1" stopColor="#232B3C" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className={styles.titleContainer}>
        <h2 className={styles.h2}>{t('heroHeadline')}</h2>
        <h1>
          {t('heroPrefix')}{' '}
          <AnimatedText
            words={[
              t('rewardWords.rewards'),
              t('rewardWords.money'),
              t('rewardWords.giftCards'),
              t('rewardWords.crypto'),
            ]}
          />{' '}
          {t('heroSuffix')}
        </h1>

        <p>{t('heroDescription')}</p>
      </div>

      <div className={styles.ctaButtons}>
        <Link href="/signup" className={styles.signupButton}>{t('getStarted')}</Link>
        <Link href="/login" className={styles.loginButton}>{t('exploreOffers')}</Link>
      </div>

      <div className={styles.earnedStat}>
        <h2>{usdEarned.toLocaleString(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}+</h2>
        <p>{t('totalEarnedBySparkvey')}</p>
      </div>
    </div>
  );
}
