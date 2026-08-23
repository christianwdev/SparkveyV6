'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import SurveyItem from '@components/SurveyItem/SurveyItem';
import SurveyProfilerCard from '@components/SurveyProfilerCard/SurveyProfilerCard';
import EmptyState from '@components/EmptyState/EmptyState';
import { useUser } from '@contexts/UserProvider';
import { useSurveysQuery } from '@hooks/useSurveysQuery';
import { useCachedQuerySeed } from '@hooks/useCachedQuerySeed';
import { queryKeys } from '@hooks/queryKeys';
import { SURVEYS_LIST_LIMIT } from '@utils/surveys';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import styles from './page.module.scss';

const SKELETON_COUNT = 21;

type SurveysPageClientProps = {
  initialSurveysPromise: Promise<SanitizedCPXSurvey[] | null>,
};

function SurveysPageFallback({ showProfiler }: { showProfiler: boolean }) {
  return (
    <div className={styles.surveysGrid} aria-hidden>
      {showProfiler && <SurveyProfilerCard />}
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SurveyItem key={index} loading />
      ))}
    </div>
  );
}

function SurveysPageContent({ initialSurveysPromise }: SurveysPageClientProps) {
  const t = useTranslations('SurveysPage');
  const { user } = useUser();
  const initialSurveys = useCachedQuerySeed({
    queryKey: queryKeys.surveys.list(SURVEYS_LIST_LIMIT),
    promise: initialSurveysPromise,
  });
  const { data: surveys, isPending } = useSurveysQuery({
    limit: SURVEYS_LIST_LIMIT,
    initialData: initialSurveys,
  });

  const showProfiler = !user?.personalInformation?.completedAt;

  if (isPending || !surveys) {
    return <SurveysPageFallback showProfiler={showProfiler} />;
  }

  if (surveys.length === 0 && !showProfiler) {
    return <EmptyState message={t('empty')} />;
  }

  return (
    <>
      <div className={styles.surveysGrid}>
        {showProfiler && <SurveyProfilerCard />}
        {surveys.map(survey => (
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
      {surveys.length === 0 && (
        <EmptyState message={t('empty')} />
      )}
    </>
  );
}

export default function SurveysPageClient({ initialSurveysPromise }: SurveysPageClientProps) {
  const { user } = useUser();
  const showProfiler = !user?.personalInformation?.completedAt;

  return (
    <Suspense fallback={<SurveysPageFallback showProfiler={showProfiler} />}>
      <SurveysPageContent initialSurveysPromise={initialSurveysPromise} />
    </Suspense>
  );
}
