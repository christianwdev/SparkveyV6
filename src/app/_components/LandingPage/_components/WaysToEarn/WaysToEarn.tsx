import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import styles from './WaysToEarn.module.scss';

const EARN_METHODS = [ 'surveys', 'cashback', 'games' ] as const;

export default async function WaysToEarn() {
  const t = await getTranslations('Landing.waysToEarn');

  return (
    <div className={styles.waysToEarnContainer} id="ways-to-earn">
      <div className={styles.titleContainer}>
        <h3>{t('eyebrow')}</h3>
        <h2>
          {t.rich('title', {
            highlight: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t('description')}</p>
      </div>

      <div className={styles.cardsContainer}>
        {EARN_METHODS.map((method) => (
          <div key={method} className={styles.card}>
            <div className={styles.cardImage}>
              <Image src="/img/stocks/earn-image.png" alt={t('imageAlt')} fill sizes="100%" />
            </div>

            <div className={styles.cardContent}>
              <h3>{t(`${method}.title`)}</h3>
              <p>{t(`${method}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
