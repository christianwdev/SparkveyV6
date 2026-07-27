'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';

// Components
import RewardItem from '@components/RewardItem/RewardItem';

// Utils
import { getCatalogRewardKey } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

// Icons
import ArrowLeftIcon from '~icons/solar/alt-arrow-left-linear.jsx';
import ArrowRightIcon from '~icons/solar/alt-arrow-right-linear.jsx';

import styles from './RewardCarouselSection.module.scss';

type RewardCarouselSectionProps = {
  categoryID: RedeemCategoryID,
  rewards?: CatalogReward[],
  viewAllHref?: string,
  offersPerView?: number,
  loading?: boolean,
};

const SCROLL_TOLERANCE = 2;
const DEFAULT_OFFERS_PER_VIEW = 5;

export default function RewardCarouselSection(
  {
    categoryID,
    rewards = [],
    viewAllHref,
    offersPerView = DEFAULT_OFFERS_PER_VIEW,
    loading = false,
  }: RewardCarouselSectionProps,
) {
  const t = useTranslations('RedeemPage.sections');
  const tControls = useTranslations('RedeemPage');
  const [ canScrollLeft, setCanScrollLeft ] = useState(false);
  const [ canScrollRight, setCanScrollRight ] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const skeletonCount = offersPerView;
  const itemCount = loading ? skeletonCount : rewards.length;

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
  }, [ itemCount, offersPerView, loading ]);

  if (!loading && rewards.length === 0) return null;

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
          <h2>{t(`${categoryID}.title`)}</h2>
          <p>{t(`${categoryID}.description`)}</p>
        </div>

        <div className={styles.controls}>
          {viewAllHref && (
            loading ? (
              <span className={styles.viewAll}>{tControls('viewAll')}</span>
            ) : (
              <Link href={viewAllHref} className={styles.viewAll}>
                {tControls('viewAll')}
              </Link>
            )
          )}

          <div className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={loading || !canScrollLeft}
              aria-label={tControls('previous')}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={loading || !canScrollRight}
              aria-label={tControls('next')}
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
        } as CSSProperties}
      >
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => (
            <RewardItem key={index} loading />
          ))
          : rewards.map(reward => (
            <RewardItem key={getCatalogRewardKey(reward)} loading={false} reward={reward} />
          ))}
      </div>
    </section>
  );
}
