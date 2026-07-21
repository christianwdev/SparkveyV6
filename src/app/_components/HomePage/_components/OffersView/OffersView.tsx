'use client';

import { Suspense, use } from 'react';
import OfferCarouselSection from '../OfferCarouselSection/OfferCarouselSection';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type OffersViewProps = {
  initialHomepagePromise: Promise<HomepageOffersResponse | null>;
  viewAllHref?: string;
  surveysViewAllHref?: string;
  maxRows?: number;
  offersPerView?: number;
};

const OFFER_SECTION_KEYS = [
  'featured',
  'popular',
  'game',
  'finance',
] as const satisfies ReadonlyArray<keyof Omit<HomepageOffersResponse, 'surveys'>>;

function surveysPerView(offersPerView?: number) {
  return Math.min(3, Math.max(1, offersPerView ?? 3));
}

function OffersViewFallback({
  viewAllHref,
  surveysViewAllHref,
  maxRows,
  offersPerView,
}: Omit<OffersViewProps, 'initialHomepagePromise'>) {
  return (
    <>
      {OFFER_SECTION_KEYS.map((titleKey) => (
        <OfferCarouselSection
          key={titleKey}
          titleKey={titleKey}
          loading
          viewAllHref={viewAllHref}
          maxRows={maxRows}
          offersPerView={offersPerView}
        />
      ))}
      <OfferCarouselSection
        titleKey="surveys"
        loading
        viewAllHref={surveysViewAllHref}
        maxRows={maxRows}
        offersPerView={surveysPerView(offersPerView)}
      />
    </>
  );
}

function OffersViewContent({
  initialHomepagePromise,
  viewAllHref,
  surveysViewAllHref,
  maxRows,
  offersPerView,
}: OffersViewProps) {
  const homepage = use(initialHomepagePromise);

  return (
    <>
      {OFFER_SECTION_KEYS.map((titleKey) => (
        <OfferCarouselSection
          key={titleKey}
          titleKey={titleKey}
          offers={homepage?.[titleKey]}
          viewAllHref={viewAllHref}
          maxRows={maxRows}
          offersPerView={offersPerView}
        />
      ))}
      <OfferCarouselSection
        titleKey="surveys"
        surveys={homepage?.surveys}
        viewAllHref={surveysViewAllHref}
        maxRows={maxRows}
        offersPerView={surveysPerView(offersPerView)}
      />
    </>
  );
}

export default function OffersView(props: OffersViewProps) {
  return (
    <Suspense
      fallback={(
        <OffersViewFallback
          viewAllHref={props.viewAllHref}
          surveysViewAllHref={props.surveysViewAllHref ?? FrontendRedirectPaths.surveys}
          maxRows={props.maxRows}
          offersPerView={props.offersPerView}
        />
      )}
    >
      <OffersViewContent
        {...props}
        surveysViewAllHref={props.surveysViewAllHref ?? FrontendRedirectPaths.surveys}
      />
    </Suspense>
  );
}
