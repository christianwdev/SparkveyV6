'use client';

import { Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import SurveyItem from '@components/SurveyItem/SurveyItem';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import styles from './page.module.scss';

type SurveysPageClientProps = {
  initialSurveysPromise: Promise<SanitizedCPXSurvey[] | null>;
};

const SKELETON_COUNT = 21;

function SurveysFallback() {
  return (
    <div className={styles.surveysGrid} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SurveyItem key={index} loading />
      ))}
    </div>
  );
}

function SurveysContent({ initialSurveysPromise }: SurveysPageClientProps) {
  const t = useTranslations('SurveysPage');
  const surveys = use(initialSurveysPromise);

  if (surveys === null) {
    return <p className={styles.statusMessage}>{t('error')}</p>;
  }

  if (surveys.length === 0) {
    return <p className={styles.statusMessage}>{t('empty')}</p>;
  }

  return (
    <div className={styles.surveysGrid}>
      {surveys.map((survey) => (
        <SurveyItem
          key={survey.id}
          loading={false}
          surveyId={survey.id}
          loiMinutes={survey.loiMinutes}
          sparks={survey.sparks}
          ratingAvg={survey.ratingAvg}
          isTop={survey.isTop}
          requiresWebcam={survey.requiresWebcam}
        />
      ))}
    </div>
  );
}

export default function SurveysPageClient(props: SurveysPageClientProps) {
  return (
    <Suspense fallback={<SurveysFallback />}>
      <SurveysContent {...props} />
    </Suspense>
  );
}
