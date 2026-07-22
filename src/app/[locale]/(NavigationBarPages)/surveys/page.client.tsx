'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ProfilerModal from '@components/ProfilerModal/ProfilerModal';
import SurveyItem from '@components/SurveyItem/SurveyItem';
import SurveyProfilerCard from '@components/SurveyProfilerCard/SurveyProfilerCard';
import { useUser } from '@contexts/UserProvider';
import { useSurveysQuery } from '@hooks/useSurveysQuery';
import styles from './page.module.scss';

const SKELETON_COUNT = 21;

export default function SurveysPageClient() {
  const t = useTranslations('SurveysPage');
  const { user } = useUser();
  const [ profilerOpen, setProfilerOpen ] = useState(false);
  const { data: surveys, isPending } = useSurveysQuery({
    limit: 50,
  });

  const showProfiler = !user?.personalInformation?.completedAt;

  if (isPending || !surveys) {
    return (
      <>
        <div className={styles.surveysGrid} aria-hidden>
          {showProfiler && (
            <SurveyProfilerCard onClick={() => setProfilerOpen(true)} />
          )}
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <SurveyItem key={index} loading />
          ))}
        </div>
        <ProfilerModal open={profilerOpen} onClose={() => setProfilerOpen(false)} />
      </>
    );
  }

  if (surveys.length === 0 && !showProfiler) {
    return <p className={styles.statusMessage}>{t('empty')}</p>;
  }

  return (
    <>
      <div className={styles.surveysGrid}>
        {showProfiler && (
          <SurveyProfilerCard onClick={() => setProfilerOpen(true)} />
        )}
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
      {surveys.length === 0 && (
        <p className={styles.statusMessage}>{t('empty')}</p>
      )}
      <ProfilerModal open={profilerOpen} onClose={() => setProfilerOpen(false)} />
    </>
  );
}
