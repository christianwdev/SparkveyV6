'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ProfilerModal from '@components/Modals/ProfilerModal/ProfilerModal';
import styles from './SurveyProfilerCard.module.scss';

import UserIdIcon from '~icons/mdi/card-account-details-outline.jsx';

type SurveyProfilerCardProps = {
  variant?: 'grid' | 'carousel',
};

export default function SurveyProfilerCard({
  variant = 'grid',
}: SurveyProfilerCardProps) {
  const t = useTranslations('SurveysPage.profiler');
  const [ open, setOpen ] = useState(false);

  return (
    <>
      <button
        type="button"
        className={[
          styles.profilerCard,
          variant === 'carousel' ? styles.carousel : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
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
      </button>

      {open ? <ProfilerModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
