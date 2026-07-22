'use client';

import { useTranslations } from 'next-intl';
import SurveyItem from '@components/SurveyItem/SurveyItem';
import { useSurveysQuery } from '@hooks/useSurveysQuery';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import styles from './page.module.scss';

type SurveysPageClientProps = {
  initialSurveys: SanitizedCPXSurvey[] | null;
};

const SKELETON_COUNT = 21;

export default function SurveysPageClient({ initialSurveys }: SurveysPageClientProps) {
  const t = useTranslations('SurveysPage');
  const { data: surveys, isPending } = useSurveysQuery({
    limit: 50,
    initialData: initialSurveys,
  });

  if (isPending && !surveys) {
    return (
      <div className={styles.surveysGrid} aria-hidden>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <SurveyItem key={index} loading />
        ))}
      </div>
    );
  }

  if (!surveys || surveys.length === 0) {
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
