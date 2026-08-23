'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import WallItem from '@components/WallItem/WallItem';
import Skeleton from '@components/Skeleton/Skeleton';
import { useWallsQuery } from '@hooks/useWallsQuery';
import { useCachedQuerySeed } from '@hooks/useCachedQuerySeed';
import { queryKeys } from '@hooks/queryKeys';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';
import styles from './HomeOfferwalls.module.scss';

const SKELETON_COUNT = 6;

type HomeOfferwallsProps = {
  initialWallsPromise: Promise<CatalogOfferwall[] | null>,
};

function HomeOfferwallsFallback() {
  const t = useTranslations('HomePage.sections.offerwalls');

  return (
    <section id="offerwalls" className={styles.section} aria-hidden>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2>{t('title')}</h2>
          <p>{t('description')}</p>
        </div>
      </div>

      <div className={styles.grid}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} width="100%" height={120} borderRadius={12} />
        ))}
      </div>
    </section>
  );
}

function HomeOfferwallsContent({ initialWallsPromise }: HomeOfferwallsProps) {
  const t = useTranslations('HomePage.sections.offerwalls');
  const initialWalls = useCachedQuerySeed({
    queryKey: queryKeys.walls.list(),
    promise: initialWallsPromise,
  });
  const { data: walls, isPending, isError } = useWallsQuery({
    initialData: initialWalls,
  });

  if (isPending && !walls) {
    return <HomeOfferwallsFallback />;
  }

  if (isError || !walls || walls.length === 0) {
    return null;
  }

  return (
    <section id="offerwalls" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2>{t('title')}</h2>
          <p>{t('description')}</p>
        </div>
      </div>

      <div className={styles.grid}>
        {walls.map(wall => (
          <WallItem
            key={wall.wallID}
            wallID={wall.wallID}
            wallName={wall.wallName}
            wallDescription={wall.wallDescription}
            wallImage={wall.wallImage}
            earnRequirement={wall.earnRequirement}
          />
        ))}
      </div>
    </section>
  );
}

export default function HomeOfferwalls({ initialWallsPromise }: HomeOfferwallsProps) {
  return (
    <Suspense fallback={<HomeOfferwallsFallback />}>
      <HomeOfferwallsContent initialWallsPromise={initialWallsPromise} />
    </Suspense>
  );
}
