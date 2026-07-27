import Link from 'next/link';

import styles from './WallItem.module.scss';

type WallItemProps = {
  wallID: string,
  wallName: string,
  wallDescription: string,
  wallImage: string,
};

export default function WallItem({
  wallID,
  wallName,
  wallDescription,
  wallImage,
}: WallItemProps) {
  return (
    <Link href={`/walls/${wallID}`} className={styles.wallItem}>
      <div className={styles.imageContainer}>
        <img
          src={wallImage}
          className={styles.blurredImage}
          alt=""
          aria-hidden
        />
        <img
          src={wallImage}
          className={styles.wallImage}
          alt=""
        />
      </div>

      <div className={styles.wallInformation}>
        <p className={styles.title}>{wallName}</p>
        <p className={styles.description}>{wallDescription}</p>
      </div>
    </Link>
  );
}
