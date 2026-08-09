'use client';

import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import SurveyItem from '@components/SurveyItem/SurveyItem';
import SurveyProfilerCard from '@components/SurveyProfilerCard/SurveyProfilerCard';
import ItemCarouselSection from '@components/ItemCarouselSection/ItemCarouselSection';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type OfferSectionKey = keyof Omit<HomepageOffersResponse, 'surveys'>;

type BaseCarouselProps = {
  viewAllHref?: string;
  maxRows?: number;
  offersPerView?: number;
  loading?: boolean;
};

type OfferCarouselSectionProps = BaseCarouselProps & (
  | {
    titleKey: OfferSectionKey;
    offers?: SanitizedOffer[];
    surveys?: never;
    showProfilerCard?: never;
  }
  | {
    titleKey: 'surveys';
    surveys?: SanitizedCPXSurvey[];
    offers?: never;
    showProfilerCard?: boolean;
  }
);

export default function OfferCarouselSection(props: OfferCarouselSectionProps) {
  const {
    titleKey,
    viewAllHref,
    maxRows,
    offersPerView,
    loading = false,
  } = props;

  const t = useTranslations('HomePage.sections');

  const isSurveys = titleKey === 'surveys';
  const showProfilerCard = isSurveys && Boolean(props.showProfilerCard);
  const items = (isSurveys ? props.surveys : props.offers) ?? [];
  const skeletonCount = Math.max(1, maxRows ?? 1) * (offersPerView ?? 5);

  return (
    <ItemCarouselSection
      title={t(`${titleKey}.title`)}
      description={t(`${titleKey}.description`)}
      viewAllHref={viewAllHref}
      viewAllLabel={t('viewAll')}
      previousLabel={t('previous')}
      nextLabel={t('next')}
      itemsPerView={offersPerView}
      maxRows={maxRows}
      loading={loading}
      leadingSlot={showProfilerCard ? <SurveyProfilerCard variant="carousel" /> : undefined}
      itemCount={items.length}
      skeletonCount={skeletonCount}
      renderSkeleton={(index) => (
        isSurveys
          ? <SurveyItem key={index} loading />
          : <OfferItem key={index} loading />
      )}
    >
      {isSurveys
        ? (props.surveys ?? []).map((survey) => (
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
        ))
        : (props.offers ?? []).map((offer) => (
          <OfferItem
            key={offer.offerID}
            loading={false}
            offerID={offer.offerID}
            offerName={offer.name}
            offerDescription={offer.description}
            offerImageUrl={offer.image}
            totalReward={offer.totalReward}
            operatingSystem={offer.operatingSystem}
          />
        ))}
    </ItemCarouselSection>
  );
}
