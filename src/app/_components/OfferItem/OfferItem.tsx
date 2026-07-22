import styles from './OfferItem.module.scss';

// Components
import Skeleton from '@components/Skeleton/Skeleton';

// Hooks
import { Link } from '@i18n/navigation';

// Types
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type OperatingSystem from 'types/Offer/OperatingSystem';

// Icons
import AppleIcon from '~icons/mdi/apple.jsx';
import AndroidIcon from '~icons/mdi/android.jsx';
import WindowsIcon from '~icons/mdi/microsoft-windows.jsx';

type OfferItemLoadedProps = {
  loading?: false;
  offerName: string;
  offerDescription: string;
  offerImageUrl: string;
  offerLink: string;
  totalReward: number;
  operatingSystem?: OperatingSystem[];
};

type OfferItemLoadingProps = {
  loading: true;
};

type OfferItemProps = OfferItemLoadedProps | OfferItemLoadingProps;

function OfferItemLoading() {
  return (
    <div className={styles.offerItemContainer} aria-hidden>
      <Skeleton width="100%" height={210} borderRadius={12} />
      <div className={styles.offerInformation}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="40%" height={20} style={{ marginTop: 'auto' }} />
      </div>
    </div>
  );
}

export default function OfferItem(props: OfferItemProps) {
  if (props.loading) {
    return <OfferItemLoading />;
  }

  return <OfferItemLoaded {...props} />;
}

function OfferItemLoaded(props: OfferItemLoadedProps) {
  const t = useTranslations('OfferItem');
  const operatingSystem = props.operatingSystem ?? [];
  const showAll = operatingSystem.length === 0;

  return (
    <Link href={props.offerLink} className={styles.offerItemContainer}>
      <div className={styles.imageContainer}>
        {props.offerImageUrl ? (
          <>
            <Image
              src={props.offerImageUrl}
              fill
              sizes="100%"
              alt=""
              aria-hidden
              className={styles.blurredImage}
              style={{ objectFit: 'cover' }}
            />
            <Image
              src={props.offerImageUrl}
              fill
              sizes="100%"
              alt={props.offerName}
              className={styles.offerImage}
              style={{ objectFit: 'cover' }}
            />
          </>
        ) : null}

        <div className={styles.icons}>
          {(showAll || operatingSystem.includes('ios') || operatingSystem.includes('macos')) && (
            <AppleIcon aria-hidden />
          )}
          {(showAll || operatingSystem.includes('windows')) && (
            <WindowsIcon aria-hidden />
          )}
          {(showAll || operatingSystem.includes('android')) && (
            <AndroidIcon aria-hidden />
          )}
        </div>
      </div>

      <div className={styles.offerInformation}>
        <p className={styles.title}>{props.offerName}</p>
        <p className={styles.description}>{props.offerDescription}</p>
        <p className={styles.userReward}>
          <span className={styles.rewardLabel}>
            {t('earn')} {t('upTo')}
          </span>
          <span className={styles.rewardAmount}>
            <Image
              className={styles.sparkIcon}
              src="/img/logo.svg"
              alt={t('sparksAlt')}
              height={11}
              width={11}
            />
            <strong>
              {Number.isFinite(props.totalReward)
                ? props.totalReward.toLocaleString()
                : '∞'}
            </strong>
          </span>
        </p>
      </div>
    </Link>
  );
}
