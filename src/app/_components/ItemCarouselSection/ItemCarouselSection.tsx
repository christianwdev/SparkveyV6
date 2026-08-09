'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from '@i18n/navigation';

// Icons
import ArrowLeftIcon from '~icons/solar/alt-arrow-left-linear.jsx';
import ArrowRightIcon from '~icons/solar/alt-arrow-right-linear.jsx';

import styles from './ItemCarouselSection.module.scss';

type ItemCarouselSectionProps = {
  title: ReactNode,
  description?: ReactNode,
  viewAllHref?: string,
  viewAllLabel: string,
  previousLabel: string,
  nextLabel: string,
  itemsPerView?: number,
  maxRows?: number,
  loading?: boolean,
  leadingSlot?: ReactNode,
  itemCount: number,
  skeletonCount: number,
  renderSkeleton: (index: number) => ReactNode,
  children: ReactNode,
};

const SCROLL_TOLERANCE = 2;
const DEFAULT_ITEMS_PER_VIEW = 5;
const DEFAULT_MAX_ROWS = 1;

function resolveRowCount(itemCount: number, itemsPerView: number, maxRows: number) {
  if (maxRows <= 1 || itemCount <= itemsPerView) {
    return 1;
  }

  // Column-flow grid: use up to maxRows once there are enough items to wrap.
  return Math.min(maxRows, Math.ceil(itemCount / itemsPerView));
}

export default function ItemCarouselSection({
  title,
  description,
  viewAllHref,
  viewAllLabel,
  previousLabel,
  nextLabel,
  itemsPerView = DEFAULT_ITEMS_PER_VIEW,
  maxRows = DEFAULT_MAX_ROWS,
  loading = false,
  leadingSlot,
  itemCount,
  skeletonCount,
  renderSkeleton,
  children,
}: ItemCarouselSectionProps) {
  const [ canScrollLeft, setCanScrollLeft ] = useState(false);
  const [ canScrollRight, setCanScrollRight ] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const hasLeadingSlot = Boolean(leadingSlot);
  const totalCount = itemCount + (hasLeadingSlot ? 1 : 0);
  const effectiveCount = loading ? skeletonCount + (hasLeadingSlot ? 1 : 0) : totalCount;

  // Profiler spans 2 rows, so force 2 rows when present and maxRows allows it.
  const rowCount = hasLeadingSlot && maxRows >= 2
    ? Math.max(2, resolveRowCount(effectiveCount, itemsPerView, maxRows))
    : resolveRowCount(effectiveCount, itemsPerView, maxRows);

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
  }, [ effectiveCount, rowCount, itemsPerView, loading, hasLeadingSlot ]);

  if (!loading && itemCount === 0 && !hasLeadingSlot) return null;

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
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <div className={styles.controls}>
          {viewAllHref && (
            loading ? (
              <span className={styles.viewAll}>{viewAllLabel}</span>
            ) : (
              <Link href={viewAllHref} className={styles.viewAll}>
                {viewAllLabel}
              </Link>
            )
          )}

          <div className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={loading || !canScrollLeft}
              aria-label={previousLabel}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={loading || !canScrollRight}
              aria-label={nextLabel}
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
          '--items-per-view': itemsPerView,
          '--rows': rowCount,
        } as CSSProperties}
      >
        {leadingSlot}
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => renderSkeleton(index))
          : children}
      </div>
    </section>
  );
}
