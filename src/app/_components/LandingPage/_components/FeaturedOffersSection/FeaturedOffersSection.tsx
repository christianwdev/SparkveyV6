'use client';

import { Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import LandingSectionHeader from '@components/LandingSectionHeader/LandingSectionHeader';
import styles from './FeaturedOffersSection.module.scss';
import type { LandingHomepageResponse } from 'types/LandingHomepageResponse';

type FeaturedOffersSectionProps = {
  initialHomepagePromise: Promise<LandingHomepageResponse>;
};

const SKELETON_COUNT = 4;

function FeaturedOffersFallback() {
  return (
    <div className={styles.offersContainer} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <OfferItem key={index} loading />
      ))}
    </div>
  );
}

function FeaturedOffersList({ initialHomepagePromise }: FeaturedOffersSectionProps) {
  const { popularOffers } = use(initialHomepagePromise);

  if (popularOffers.length === 0) return null;

  return (
    <div className={styles.offersContainer}>
      {popularOffers.map((offer) => (
        <OfferItem
          key={offer.offerID}
          offerName={offer.name}
          offerDescription={offer.description}
          offerImageUrl={offer.image}
          href="/signup"
          totalReward={offer.totalReward}
          operatingSystem={offer.operatingSystem}
        />
      ))}
    </div>
  );
}

export default function FeaturedOffersSection({ initialHomepagePromise }: FeaturedOffersSectionProps) {
  const t = useTranslations('Landing.featuredOffers');

  return (
    <div className={styles.featuredOffersSection}>
      <LandingSectionHeader
        eyebrow={t('eyebrow')}
        title={t.rich('title', {
          highlight: (chunks) => <span>{chunks}</span>,
        })}
        description={t('description')}
        align="start"
      />

      <Suspense fallback={<FeaturedOffersFallback />}>
        <FeaturedOffersList initialHomepagePromise={initialHomepagePromise} />
      </Suspense>
    </div>
  );
}
