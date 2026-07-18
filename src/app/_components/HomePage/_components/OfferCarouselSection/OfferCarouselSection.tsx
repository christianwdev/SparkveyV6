'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '@iconify/react';
import { useTranslations } from 'next-intl';
import OfferItem from '@components/OfferItem/OfferItem';
import type InternalOffer from 'types/Offer/InternalOffer';
import styles from './OfferCarouselSection.module.scss';

type OfferCarouselSectionProps = {
  offers: InternalOffer[];
  titleKey: 'featured' | 'popular' | 'game' | 'finance' | 'surveys';
  expandable?: boolean;
  offersPerView?: number;
};

const SCROLL_TOLERANCE = 2;
const DEFAULT_OFFERS_PER_VIEW = 5;

export default function OfferCarouselSection({
  offers,
  titleKey,
  expandable = false,
  offersPerView = DEFAULT_OFFERS_PER_VIEW,
}: OfferCarouselSectionProps) {
  const t = useTranslations('HomePage.sections');
  const [ isExpanded, setIsExpanded ] = useState(false);
  const [ canScrollLeft, setCanScrollLeft ] = useState(false);
  const [ canScrollRight, setCanScrollRight ] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel || isExpanded) {
      setCanScrollLeft(false);
      setCanScrollRight(false);

      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;

      setCanScrollLeft(carousel.scrollLeft > SCROLL_TOLERANCE);
      setCanScrollRight(carousel.scrollLeft < maxScrollLeft - SCROLL_TOLERANCE);
    };

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(carousel);
    carousel.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();

    return () => {
      resizeObserver.disconnect();
      carousel.removeEventListener('scroll', updateScrollState);
    };
  }, [ offers, isExpanded ]);

  if (offers.length === 0) return null;

  const scrollByPage = (direction: 1 | -1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.9,
      behavior: 'smooth',
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>{t(`${titleKey}.title`)}</h2>

        <div className={styles.controls}>
          {expandable && (
            <button
              type="button"
              className={styles.expandButton}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? t('showLess') : t('viewAll')}
            </button>
          )}

          {!isExpanded && (
            <div className={styles.carouselControls}>
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={!canScrollLeft}
                aria-label={t('previous')}
              >
                <Icon icon="solar:alt-arrow-left-linear" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={!canScrollRight}
                aria-label={t('next')}
              >
                <Icon icon="solar:alt-arrow-right-linear" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={carouselRef}
        className={isExpanded ? styles.expandedOffers : styles.carousel}
        style={{ '--offers-per-view': offersPerView } as CSSProperties}
      >
        {offers.map((offer) => (
          <OfferItem
            key={offer.offerID}
            loading={false}
            offerName={offer.displayName || offer.name}
            offerDescription={offer.description}
            offerImageUrl={offer.image}
            offerLink={offer.trackingURL}
            totalReward={offer.totalReward}
          />
        ))}
      </div>
    </section>
  );
}
