'use client';

import { Suspense, use } from 'react';
import OfferCarouselSection from '../OfferCarouselSection/OfferCarouselSection';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type OffersViewProps = {
  initialHomepagePromise: Promise<HomepageOffersResponse | null>;
  viewAllHref?: string;
  maxRows?: number;
  offersPerView?: number;
};

const SECTION_KEYS = [
  'featured',
  'popular',
  'game',
  'finance',
  'surveys',
] as const satisfies ReadonlyArray<keyof HomepageOffersResponse>;

function OffersViewFallback({
  viewAllHref,
  maxRows,
  offersPerView,
}: Omit<OffersViewProps, 'initialHomepagePromise'>) {
  return (
    <>
      {SECTION_KEYS.map((titleKey) => (
        <OfferCarouselSection
          key={titleKey}
          titleKey={titleKey}
          loading
          viewAllHref={viewAllHref}
          maxRows={maxRows}
          offersPerView={offersPerView}
        />
      ))}
    </>
  );
}

function OffersViewContent({
  initialHomepagePromise,
  viewAllHref,
  maxRows,
  offersPerView,
}: OffersViewProps) {
  const homepage = use(initialHomepagePromise);

  return (
    <>
      {SECTION_KEYS.map((titleKey) => (
        <OfferCarouselSection
          key={titleKey}
          titleKey={titleKey}
          offers={homepage?.[titleKey]}
          viewAllHref={viewAllHref}
          maxRows={maxRows}
          offersPerView={offersPerView}
        />
      ))}
    </>
  );
}

export default function OffersView(props: OffersViewProps) {
  return (
    <Suspense
      fallback={(
        <OffersViewFallback
          viewAllHref={props.viewAllHref}
          maxRows={props.maxRows}
          offersPerView={props.offersPerView}
        />
      )}
    >
      <OffersViewContent {...props} />
    </Suspense>
  );
}
