import styles from './OfferItem.module.scss';

// Hooks
import { Link } from '@i18n/navigation';

// Types
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type OfferItemProps = {
  offerName: string;
  offerDescription: string;
  offerImageUrl: string;
  offerLink: string;
  totalReward: number;
};

export default function OfferItem(props: OfferItemProps) {
  const t = useTranslations('OfferItem');

  return (
    <Link href={props.offerLink} className={styles.offerItemContainer}>
      <div className={styles.imageContainer}>
        <Image
          src={props.offerImageUrl}
          fill
          sizes='100%'
          alt={props.offerName}
          style={{
            objectFit: 'cover',
          }}
        />
      </div>

      <div className={styles.offerInformation}>
        <p className={styles.title}>{props.offerName}</p>
        <p className={styles.description}>{props.offerDescription}</p>
        <p className={styles.userReward}>
          {t('earn')} {t('upTo')}
          <span>
            <Image src='/img/logo.svg' alt={t('sparksAlt')} height={11} width={11} />
            <strong>{props.totalReward?.toLocaleString()}</strong>
          </span>
        </p>
      </div>
    </Link>
  );
}
