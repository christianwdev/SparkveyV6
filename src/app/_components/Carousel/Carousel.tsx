'use client';

import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type UIEvent,
} from 'react';

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

  const trackRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<number | undefined>(undefined);
  const lastInteractedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function scrollBySlide(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: track.clientWidth * direction,
      behavior: 'smooth',
    });
  }

  // Jump past the leading clone before first paint so SSR/hydration don't flash it.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !canLoop) return;

    track.scrollLeft = track.clientWidth;
  }, [ canLoop, slides.length ]);

  useEffect(() => {
    if (!canLoop || autoPlay === false) return;

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
        if (autoPlay === false) return;
        if (Date.now() < lastInteractedAtRef.current + autoPlay) return;

        lastInteractedAtRef.current = Date.now();
        scrollBySlide(1);
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

      if (debounceRef.current !== undefined) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [ canLoop, autoPlay ]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (!canLoop) return;

    const track = event.currentTarget;
    const currentScroll = track.scrollLeft;
    const lastScroll = lastScrollRef.current;
    const hasLastScroll = typeof lastScroll === 'number';
    const slideWidth = track.clientWidth;
    const isUserScroll = track.style.overflow !== 'hidden';
    const delta = hasLastScroll ? currentScroll - lastScroll : 0;

    // 10px buffer so snap/rounding doesn't miss the clone edge
    const maxScroll = track.scrollWidth - track.clientWidth - 10;
    const minScroll = slideWidth - 10;

    if (hasLastScroll && delta < 0 && currentScroll < minScroll && isUserScroll) {
      track.style.overflow = 'hidden';
      track.scrollTo({ left: 0, behavior: 'smooth' });
    }

    if (hasLastScroll && delta > 0 && currentScroll > maxScroll && isUserScroll) {
      track.style.overflow = 'hidden';
      track.scrollTo({ left: maxScroll, behavior: 'smooth' });
    }

    if (!isUserScroll) {
      if (debounceRef.current !== undefined) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (currentScroll <= 1) {
          track.scrollTo({
            left: track.scrollWidth - slideWidth * 2,
            behavior: 'instant',
          });
        }

        if (currentScroll >= maxScroll) {
          track.scrollTo({
            left: slideWidth,
            behavior: 'instant',
          });
        }

        track.style.overflow = 'auto';
      }, 75);
    }

    lastScrollRef.current = currentScroll;
    lastInteractedAtRef.current = Date.now();
  }

  if (slides.length === 0) return null;

  const columnCount = canLoop ? slides.length + 2 : slides.length;

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
        onScroll={handleScroll}
      >
        {canLoop && (
          <div className={styles.slide} aria-hidden>
            {slides[slides.length - 1]}
          </div>
        )}

        {slides.map((slide, index) => (
          <div
            key={index}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
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
