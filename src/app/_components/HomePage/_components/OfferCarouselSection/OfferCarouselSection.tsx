'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import OfferItem from '@components/OfferItem/OfferItem';
import type InternalOffer from 'types/Offer/InternalOffer';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';
import styles from './OfferCarouselSection.module.scss';

// Icons
import ArrowLeftIcon from '~icons/solar/alt-arrow-left-linear.jsx';
import ArrowRightIcon from '~icons/solar/alt-arrow-right-linear.jsx';

type OfferCarouselSectionProps = {
  offers?: InternalOffer[];
  titleKey: keyof HomepageOffersResponse;
  viewAllHref?: string;
  maxRows?: number;
  offersPerView?: number;
  loading?: boolean;
};

const SCROLL_TOLERANCE = 2;
const DEFAULT_OFFERS_PER_VIEW = 5;
const DEFAULT_MAX_ROWS = 1;
const SKELETON_COUNT = 6;

function resolveRowCount(offerCount: number, offersPerView: number, maxRows: number) {
  if (maxRows <= 1 || offerCount < offersPerView * 2) {
    return 1;
  }

  let rows = Math.min(maxRows, Math.floor(offerCount / offersPerView));

  // Prefer a row count that splits offers evenly across rows.
  while (rows > 1 && offerCount % rows !== 0) {
    rows -= 1;
  }

  return Math.max(1, rows);
}

export default function OfferCarouselSection({
  offers = [],
  titleKey,
  viewAllHref,
  maxRows = DEFAULT_MAX_ROWS,
  offersPerView = DEFAULT_OFFERS_PER_VIEW,
  loading = false,
}: OfferCarouselSectionProps) {
  const t = useTranslations('HomePage.sections');
  const [ canScrollLeft, setCanScrollLeft ] = useState(false);
  const [ canScrollRight, setCanScrollRight ] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const itemCount = loading ? SKELETON_COUNT : offers.length;
  const rowCount = resolveRowCount(itemCount, offersPerView, maxRows);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel || loading) {
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
  }, [ offers, rowCount, offersPerView, loading ]);

  if (!loading && offers.length === 0) return null;

  const scrollByPage = (direction: 1 | -1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.9,
      behavior: 'smooth',
    });
  };

  return (
    <section className={styles.section} aria-hidden={loading || undefined}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2>{t(`${titleKey}.title`)}</h2>
          <p>{t(`${titleKey}.description`)}</p>
        </div>

        <div className={styles.controls}>
          {viewAllHref && (
            loading ? (
              <span className={styles.viewAll}>{t('viewAll')}</span>
            ) : (
              <Link href={viewAllHref} className={styles.viewAll}>
                {t('viewAll')}
              </Link>
            )
          )}

          <div className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={loading || !canScrollLeft}
              aria-label={t('previous')}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={loading || !canScrollRight}
              aria-label={t('next')}
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={carouselRef}
        className={styles.carousel}
        style={{
          '--offers-per-view': offersPerView,
          '--rows': rowCount,
        } as CSSProperties}
      >
        {loading
          ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <OfferItem key={index} loading />
          ))
          : offers.map((offer) => (
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
