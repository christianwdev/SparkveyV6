'use client';

import { Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
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
          offerName={offer.displayName || offer.name}
          offerDescription={offer.description}
          offerImageUrl={offer.image}
          offerLink="/signup"
          totalReward={offer.totalReward}
        />
      ))}
    </div>
  );
}

export default function FeaturedOffersSection({ initialHomepagePromise }: FeaturedOffersSectionProps) {
  const t = useTranslations('Landing.featuredOffers');

  return (
    <div className={styles.featuredOffersSection}>
      <div className={styles.titleContainer}>
        <h3>{t('eyebrow')}</h3>
        <h2>
          {t.rich('title', {
            highlight: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t('description')}</p>
      </div>

      <Suspense fallback={<FeaturedOffersFallback />}>
        <FeaturedOffersList initialHomepagePromise={initialHomepagePromise} />
      </Suspense>
    </div>
  );
}
