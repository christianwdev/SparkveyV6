import Image from 'next/image';
import styles from './GiftcardsSection.module.scss';
import { useTranslations } from 'next-intl';

const giftcardsList = [
  { name: 'Amazon', logo: '/img/logos/amazon.svg' },
  { name: 'ASOS', logo: '/img/logos/asos.svg' },
  { name: 'Airbnb', logo: '/img/logos/airbnb.svg' },
  { name: 'Aerie', logo: '/img/logos/aerie.svg' },
  { name: 'Bitcoin', logo: '/img/logos/bitcoin.svg' },
  { name: 'GooglePlay', logo: '/img/logos/googleplay.svg' },
  { name: 'Gap', logo: '/img/logos/gap.svg' },
  { name: 'EA', logo: '/img/logos/ea.svg' },
  { name: 'Litecoin', logo: '/img/logos/litecoin.svg' },
  { name: 'Delta', logo: '/img/logos/delta.svg' },
];

export default function GiftcardsSection() {
  const t = useTranslations('Landing');

  return (
    <div className={styles.giftcardsSection}>
      <p className={styles.giftcardDescription}>{t('giftcardDescription')}</p>

      <div className={styles.divider} />

      <div className={styles.giftcardsSlider}>
        <div className={styles.giftcardsList}>
          {giftcardsList.map((giftcard) => (
            <Image
              src={giftcard.logo}
              alt={giftcard.name}
              key={giftcard.name}
              height={40}
              width={120}
              style={{ width: 'auto', height: 40 }}
            />
          ))}
        </div>

        <div className={styles.giftcardsList} aria-hidden="true">
          {giftcardsList.map((giftcard) => (
            <Image
              src={giftcard.logo}
              alt=""
              key={giftcard.name}
              height={40}
              width={120}
              style={{ width: 'auto', height: 40 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
