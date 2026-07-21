import styles from './SurveyItem.module.scss';

// Components
import Skeleton from '@components/Skeleton/Skeleton';

// Utils
import { getScope } from '@utils/scope';

// Types
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// Icons
import ClipboardCheckIcon from '~icons/mdi/clipboard-check-outline.jsx';
import ClockIcon from '~icons/mdi/clock-outline.jsx';
import FireIcon from '~icons/mdi/fire.jsx';
import StarIcon from '~icons/mdi/star.jsx';
import StarHalfIcon from '~icons/mdi/star-half-full.jsx';
import StarOutlineIcon from '~icons/mdi/star-outline.jsx';
import WebcamIcon from '~icons/mdi/webcam.jsx';

type SurveyItemLoadedProps = {
  loading?: false;
  surveyId: string;
  loiMinutes: number;
  sparks: number;
  ratingAvg: number;
  isTop?: boolean;
  requiresWebcam?: boolean;
};

type SurveyItemLoadingProps = {
  loading: true;
};

type SurveyItemProps = SurveyItemLoadedProps | SurveyItemLoadingProps;

function SurveyItemLoading() {
  return (
    <div className={styles.surveyItemContainer} aria-hidden>
      <Skeleton width={56} height={56} borderRadius={12} />
      <div className={styles.surveyInformation}>
        <Skeleton width="55%" height={16} />
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={12} />
      </div>
      <Skeleton width={72} height={28} borderRadius={8} style={{ marginLeft: 'auto' }} />
    </div>
  );
}

export default function SurveyItem(props: SurveyItemProps) {
  if (props.loading) {
    return <SurveyItemLoading />;
  }

  return <SurveyItemLoaded {...props} />;
}

function StarRating({ value }: { value: number }) {
  const stars: ReactNode[] = [];

  for (let index = 1; index <= 5; index += 1) {
    const remaining = value - (index - 1);

    if (remaining >= 0.75) {
      stars.push(<StarIcon key={index} aria-hidden />);
    } else if (remaining >= 0.25) {
      stars.push(<StarHalfIcon key={index} aria-hidden />);
    } else {
      stars.push(<StarOutlineIcon key={index} aria-hidden />);
    }
  }

  return <span className={styles.stars}>{stars}</span>;
}

function SurveyItemLoaded(props: SurveyItemLoadedProps) {
  const t = useTranslations('SurveyItem');
  const href = `${getScope()}/surveys/redirect/${encodeURIComponent(props.surveyId)}`;
  const hasRating = props.ratingAvg > 0;
  const ratingLabel = hasRating
    ? t('ratingLabel', { rating: props.ratingAvg.toFixed(1) })
    : t('ratingUnavailable');

  return (
    <a href={href} className={styles.surveyItemContainer}>
      <div className={styles.mediaContainer}>
        <ClipboardCheckIcon className={styles.surveyIcon} aria-hidden />
      </div>

      <div className={styles.surveyInformation}>
        <div className={styles.titleRow}>
          <p className={styles.title}>{t('title')}</p>
          {props.isTop && (
            <span className={styles.topBadge} title={t('top')} aria-label={t('top')}>
              <FireIcon aria-hidden />
            </span>
          )}
        </div>

        <div className={styles.ratingRow} aria-label={ratingLabel}>
          <StarRating value={props.ratingAvg} />
          <span className={styles.ratingText}>
            {hasRating ? props.ratingAvg.toFixed(1) : t('ratingUnavailable')}
          </span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <ClockIcon aria-hidden />
            {t('duration', { minutes: props.loiMinutes })}
          </span>

          {props.requiresWebcam && (
            <span className={styles.metaItem} title={t('webcamRequired')}>
              <WebcamIcon aria-hidden />
              {t('webcam')}
            </span>
          )}
        </div>
      </div>

      <p className={styles.userReward}>
        <span className={styles.rewardLabel}>{t('earn')}</span>
        <span className={styles.rewardAmount}>
          <Image
            className={styles.sparkIcon}
            src="/img/logo.svg"
            alt={t('sparksAlt')}
            height={11}
            width={11}
          />
          <strong>{props.sparks.toLocaleString()}</strong>
        </span>
      </p>
    </a>
  );
}
