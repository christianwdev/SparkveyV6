'use client';

import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';

// Icons
import ArrowLeftIcon from '~icons/solar/alt-arrow-left-linear.jsx';
import ArrowRightIcon from '~icons/solar/alt-arrow-right-linear.jsx';

import styles from './Carousel.module.scss';

type CarouselProps = {
  children: ReactNode,
  className?: string,

  /**
   * Auto-advance after this many idle ms.
   * Pass `false` to disable. Defaults to 15_000.
   */
  autoPlay?: number | false,

  /** Show prev/next controls on hover. Defaults to true. */
  showControls?: boolean,
  'aria-label'?: string,
};

export default function Carousel({
  children,
  className,
  autoPlay = 15_000,
  showControls = true,
  'aria-label': ariaLabel = 'Promotional banners',
}: CarouselProps) {
  const slides = Children.toArray(children).filter(Boolean);
  const canLoop = slides.length > 1;
  const slideCount = slides.length;
  const prefersReducedMotion = useReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const leadingCloneRef = useRef<HTMLDivElement>(null);
  const lastInteractedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  function scrollBySlide(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: track.clientWidth * direction,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  }

  /**
   * Same SSR-safe prime as V5: leading clone stays out of layout until we can
   * scroll past it in the same frame, so scrollLeft 0 never paints the clone.
   */
  useLayoutEffect(() => {
    if (!canLoop) return;

    const track = trackRef.current;
    const leading = leadingCloneRef.current;
    if (!track || !leading) return;

    let primed = false;

    function prime() {
      if (primed) return true;

      const el = trackRef.current;
      const clone = leadingCloneRef.current;
      if (!el || !clone) return false;

      const slideWidth = el.clientWidth;
      if (slideWidth === 0) return false;

      clone.style.display = 'block';
      el.scrollLeft = slideWidth;
      primed = true;

      return true;
    }

    leading.style.display = 'none';

    if (prime()) return;

    const observer = new ResizeObserver(() => {
      if (prime()) observer.disconnect();
    });

    observer.observe(track);

    return () => observer.disconnect();
  }, [ canLoop, slideCount ]);

  // When settled on a clone, jump to the matching real slide (live scrollLeft).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !canLoop) return;

    let wrapping = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    function normalizeLoopPosition() {
      const el = trackRef.current;
      if (!el || wrapping) return;

      const slideWidth = el.clientWidth;
      if (slideWidth === 0) return;

      const index = Math.round(el.scrollLeft / slideWidth);
      const lastCloneIndex = slideCount + 1;

      if (index <= 0) {
        wrapping = true;
        el.scrollTo({
          left: slideCount * slideWidth,
          behavior: 'instant',
        });
        wrapping = false;

        return;
      }

      if (index >= lastCloneIndex) {
        wrapping = true;
        el.scrollTo({
          left: slideWidth,
          behavior: 'instant',
        });
        wrapping = false;
      }
    }

    function scheduleNormalize() {
      lastInteractedAtRef.current = Date.now();

      if (wrapping) return;

      if (settleTimer !== undefined) {
        clearTimeout(settleTimer);
      }

      settleTimer = setTimeout(() => {
        normalizeLoopPosition();
      }, 80);
    }

    track.addEventListener('scroll', scheduleNormalize, { passive: true });
    track.addEventListener('scrollend', normalizeLoopPosition);

    return () => {
      track.removeEventListener('scroll', scheduleNormalize);
      track.removeEventListener('scrollend', normalizeLoopPosition);

      if (settleTimer !== undefined) {
        clearTimeout(settleTimer);
      }
    };
  }, [ canLoop, slideCount ]);

  useEffect(() => {
    if (!canLoop || autoPlay === false || prefersReducedMotion) return;

    const idleMs = autoPlay;
    lastInteractedAtRef.current = Date.now();

    function stopAutoPlay() {
      if (timerRef.current !== undefined) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }

    function startAutoPlay() {
      stopAutoPlay();

      timerRef.current = setInterval(() => {
        if (Date.now() < lastInteractedAtRef.current + idleMs) return;

        lastInteractedAtRef.current = Date.now();

        const track = trackRef.current;
        if (!track) return;

        track.scrollBy({
          left: track.clientWidth,
          behavior: prefersReducedMotion ? 'instant' : 'smooth',
        });
      }, 1000);
    }

    startAutoPlay();

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopAutoPlay();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [ autoPlay, canLoop, prefersReducedMotion ]);

  if (slides.length === 0) return null;

  const columnCount = canLoop ? slideCount + 2 : slideCount;

  return (
    <div
      className={[ styles.carousel, className ].filter(Boolean).join(' ')}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        ref={trackRef}
        className={styles.track}
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 100%)`,
        }}
      >
        {canLoop && (
          <div
            ref={leadingCloneRef}
            className={styles.slide}
            style={{ display: 'none' }}
            aria-hidden
          >
            {slides[slideCount - 1]}
          </div>
        )}

        {slides.map((slide, index) => (
          <div
            key={index}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slideCount}`}
          >
            {slide}
          </div>
        ))}

        {canLoop && (
          <div className={styles.slide} aria-hidden>
            {slides[0]}
          </div>
        )}
      </div>

      {showControls && canLoop && (
        <>
          <button
            type="button"
            className={styles.prev}
            aria-label="Previous slide"
            onClick={() => scrollBySlide(-1)}
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            className={styles.next}
            aria-label="Next slide"
            onClick={() => scrollBySlide(1)}
          >
            <ArrowRightIcon />
          </button>
        </>
      )}
    </div>
  );
}
