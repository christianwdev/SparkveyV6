'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

// Components
import Carousel from '@components/Carousel/Carousel';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Constants
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Utils
import { Link } from '@i18n/navigation';

// Types
import type { ColorTheme } from '@utils/theme';

import styles from './HomeCarousel.module.scss';

const LOOTABLY_CHEDDAR_OFFER_URL = 'https://api.lootably.com/api/offerwall/redirect/offer/101-999?placementID=ckqe52rkc002e01yl9yc8gj0p&rawPublisherUserID=';
const BANNER_SIZES = '(max-width: 1200px) 100vw, 1200px';

type HomeCarouselProps = {
  initialTheme: ColorTheme,
};

export default function HomeCarousel({ initialTheme }: HomeCarouselProps) {
  const t = useTranslations('HomePage.carousel');
  const { user } = useUser();
  const theme = useDocumentTheme(initialTheme);

  const cheddarSrc = theme === 'dark'
    ? '/img/banners/cheddardark.webp'
    : '/img/banners/cheddar.webp';

  const cheddarImage = (
    <Image
      src={cheddarSrc}
      alt={t('cheddarAlt')}
      fill
      sizes={BANNER_SIZES}
    />
  );

  return (
    <Carousel autoPlay={15_000} aria-label={t('label')} className={styles.root}>
      <Link href={FrontendRedirectPaths.tasks} className={styles.slide}>
        <Image
          src="/img/banners/taskbanner.webp"
          alt={t('tasksAlt')}
          fill
          priority
          sizes={BANNER_SIZES}
        />
      </Link>
      {user ? (
        <a
          href={`${LOOTABLY_CHEDDAR_OFFER_URL}${user.userID}`}
          className={styles.slide}
          rel="noopener noreferrer"
        >
          {cheddarImage}
        </a>
      ) : (
        <Link href={FrontendRedirectPaths.login} className={styles.slide}>
          {cheddarImage}
        </Link>
      )}
    </Carousel>
  );
}

function useDocumentTheme(initialTheme: ColorTheme): ColorTheme {
  return useSyncExternalStore(
    subscribeTheme,
    readDocumentTheme,
    () => initialTheme,
  );
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ 'data-theme' ],
  });

  return () => observer.disconnect();
}

function readDocumentTheme(): ColorTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
