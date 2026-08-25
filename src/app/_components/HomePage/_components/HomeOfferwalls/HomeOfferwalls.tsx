'use client';

import { useTranslations } from 'next-intl';
import WallItem from '@components/WallItem/WallItem';
import { useWallsQuery } from '@hooks/useWallsQuery';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';
import styles from './HomeOfferwalls.module.scss';

type HomeOfferwallsProps = {
  initialWalls: CatalogOfferwall[] | null,
};

export default function HomeOfferwalls({ initialWalls }: HomeOfferwallsProps) {
  const t = useTranslations('HomePage.sections.offerwalls');
  const { data: walls, isPending, isError } = useWallsQuery({
    initialData: initialWalls,
  });

  if ((isPending && !walls) || isError || !walls || walls.length === 0) {
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
            imageWidth={wall.imageWidth}
            imageHeight={wall.imageHeight}
            earnRequirement={wall.earnRequirement}
          />
        ))}
      </div>
    </section>
  );
}
