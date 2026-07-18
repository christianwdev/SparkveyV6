import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import styles from './HowItWorks.module.scss';

import AccountIcon from '~icons/octicon/person-24.jsx';
import ClipboardCheckIcon from '~icons/mdi/clipboard-check-outline.jsx';
import GiftIcon from '~icons/mdi/gift-outline.jsx';

export default async function HowItWorks() {
  const t = await getTranslations('Landing.howItWorks');

  return (
    <div className={styles.howItWorks} id="how-it-works">
      <div className={styles.titleContainer}>
        <h3>{t('eyebrow')}</h3>
        <h2>
          {t.rich('title', {
            highlight: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t('description')}</p>
      </div>

      <div className={styles.previewCards}>
        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/onboarding-image.png"
              alt={t('alts.onboarding')}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/earn-image.png"
              alt={t('alts.earn')}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/redeem-image.png"
              alt={t('alts.redeem')}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>
      </div>

      <div className={styles.steps}>
        <div className={styles.stepsLine} />

        <div className={styles.step}>
          <div className={`${styles.stepIcon} ${styles.active}`}>
            <AccountIcon />
          </div>
          <p className={styles.stepTitle}>{t('steps.signUp.title')}</p>
          <p className={styles.stepDescription}>{t('steps.signUp.description')}</p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <ClipboardCheckIcon />
          </div>
          <p className={styles.stepTitle}>{t('steps.completeTasks.title')}</p>
          <p className={styles.stepDescription}>{t('steps.completeTasks.description')}</p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <GiftIcon />
          </div>
          <p className={styles.stepTitle}>{t('steps.redeem.title')}</p>
          <p className={styles.stepDescription}>{t('steps.redeem.description')}</p>
        </div>
      </div>
    </div>
  );
}
