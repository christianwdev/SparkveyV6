'use client';

import { useTranslations } from 'next-intl';
import styles from './SurveyProfilerCard.module.scss';

import UserIdIcon from '~icons/mdi/card-account-details-outline.jsx';
import ArrowRightIcon from '~icons/mdi/arrow-right.jsx';

type SurveyProfilerCardProps = {
  onClick: () => void;
  variant?: 'grid' | 'carousel';
};

export default function SurveyProfilerCard({
  onClick,
  variant = 'grid',
}: SurveyProfilerCardProps) {
  const t = useTranslations('SurveysPage.profiler');

  return (
    <button
      type="button"
      className={[
        styles.profilerCard,
        variant === 'carousel' ? styles.carousel : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={styles.media}>
        <UserIdIcon aria-hidden className={styles.icon} />
      </div>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.description}>{t('description')}</p>
      </div>

      <span className={styles.cta}>
        {t('cta')}
        <ArrowRightIcon aria-hidden />
      </span>
    </button>
  );
}
