import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import WallItem from '@components/WallItem/WallItem';
import { OFFERWALLS } from '@constants/Offerwalls';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import styles from './page.module.scss';

export default async function WallsIndexPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Discover' });
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent('/walls')}`);
  }

  return (
    <main className={styles.wallsIndex}>
      <div className={styles.header}>
        <h1>{t('sections.offerwalls.title')}</h1>
        <p>{t('sections.offerwalls.description')}</p>
      </div>

      <div className={styles.grid}>
        {OFFERWALLS.map(wall => (
          <WallItem
            key={wall.wallID}
            wallID={wall.wallID}
            wallName={wall.wallName}
            wallDescription={wall.wallDescription}
            wallImage={wall.wallImage}
          />
        ))}
      </div>
    </main>
  );
}
