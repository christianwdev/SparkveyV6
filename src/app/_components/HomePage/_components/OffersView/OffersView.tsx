'use client';

import { useState } from 'react';
import OfferCarouselSection from '../OfferCarouselSection/OfferCarouselSection';
import ProfilerModal from '@components/ProfilerModal/ProfilerModal';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { useUser } from '@contexts/UserProvider';
import { useHomepageOffers } from '@hooks/useHomepageOffers';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type OffersViewProps = {
  initialHomepage: HomepageOffersResponse | null;
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

export default function OffersView({
  initialHomepage,
  viewAllHref,
  surveysViewAllHref = FrontendRedirectPaths.surveys,
  maxRows,
  offersPerView,
}: OffersViewProps) {
  const { user } = useUser();
  const [ profilerOpen, setProfilerOpen ] = useState(false);
  const { data: homepage, isPending } = useHomepageOffers({
    initialData: initialHomepage,
  });

  const loading = isPending && !homepage;
  const showProfilerCard = !user?.personalInformation?.completedAt;

  return (
    <>
      {OFFER_SECTION_KEYS.map((titleKey) => (
        <OfferCarouselSection
          key={titleKey}
          titleKey={titleKey}
          loading={loading}
          offers={homepage?.[titleKey]}
          viewAllHref={viewAllHref}
          maxRows={maxRows}
          offersPerView={offersPerView}
        />
      ))}
      <OfferCarouselSection
        titleKey="surveys"
        loading={loading}
        surveys={homepage?.surveys}
        viewAllHref={surveysViewAllHref}
        maxRows={maxRows}
        offersPerView={surveysPerView(offersPerView)}
        showProfilerCard={showProfilerCard}
        onProfilerClick={() => setProfilerOpen(true)}
      />
      <ProfilerModal open={profilerOpen} onClose={() => setProfilerOpen(false)} />
    </>
  );
}
