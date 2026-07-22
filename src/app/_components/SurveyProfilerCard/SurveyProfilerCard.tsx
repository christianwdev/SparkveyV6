'use client';

import { useTranslations } from 'next-intl';
import styles from './SurveyProfilerCard.module.scss';

import UserIdIcon from '~icons/mdi/card-account-details-outline.jsx';

type SurveyProfilerCardProps = {
  variant?: 'grid' | 'carousel';
};

/** Visual stub until the profiler flow is rebuilt. */
export default function SurveyProfilerCard({
  variant = 'grid',
}: SurveyProfilerCardProps) {
  const t = useTranslations('SurveysPage.profiler');

  return (
    <div
      className={[
        styles.profilerCard,
        variant === 'carousel' ? styles.carousel : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={styles.media}>
        <UserIdIcon aria-hidden className={styles.icon} />
      </div>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.description}>{t('description')}</p>
      </div>

      <span className={styles.cta}>{t('cta')}</span>
    </div>
  );
}
