'use client';

import { useFormatter, useTranslations } from 'next-intl';

// Components
import CurrencyAmount from '@components/CurrencyAmount/CurrencyAmount';
import Skeleton from '@components/Skeleton/Skeleton';

// Hooks
import { usePurchaseModalOptional } from '@contexts/PurchaseModalContext';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';

import styles from './RewardItem.module.scss';

type RewardItemLoadedProps = {
  loading?: false,
  reward: CatalogReward,
};

type RewardItemLoadingProps = {
  loading: true,
};

type RewardItemProps = RewardItemLoadedProps | RewardItemLoadingProps;

function RewardItemLoading() {
  return (
    <div className={styles.rewardItemContainer} aria-hidden>
      <Skeleton width="100%" height={140} borderRadius={12} />
      <div className={styles.rewardInformation}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="40%" height={14} />
      </div>
    </div>
  );
}

export default function RewardItem(props: RewardItemProps) {
  if (props.loading) {
    return <RewardItemLoading />;
  }

  return <RewardItemLoaded reward={props.reward} />;
}

function RewardItemLoaded(
  {
    reward,
  }: {
    reward: CatalogReward,
  },
) {
  const t = useTranslations('RewardItem');
  const formatter = useFormatter();
  const purchaseModal = usePurchaseModalOptional();
  const { image, displayRange: range } = reward;
  const hasSingleValue = range.minimumFiat === range.maximumFiat;

  function activateCard() {
    purchaseModal?.openPurchaseModal(reward);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.rewardItemContainer}
      onClick={activateCard}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateCard();
        }
      }}
    >
      <div className={styles.imageContainer}>
        {image && (
          // Provider CDNs vary; avoid opening next/image to arbitrary hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={reward.rewardName}
            className={image.type === 'card' ? styles.card : undefined}
          />
        )}
      </div>

      <div className={styles.rewardInformation}>
        <p className={styles.title}>{reward.rewardName}</p>
        <p className={styles.description}>
          {hasSingleValue
            ? <CurrencyAmount amount={range.minimumFiat} currencyCode={range.currencyCode} />
            : (
              <>
                <CurrencyAmount amount={range.minimumFiat} currencyCode={range.currencyCode} />
                {' – '}
                <CurrencyAmount amount={range.maximumFiat} currencyCode={range.currencyCode} />
              </>
            )}
        </p>
        <p className={styles.userReward}>
          {formatter.number(range.minimumSparks)}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.svg" alt={t('sparksAlt')} height={11} width={8} />
          {!hasSingleValue && (
            <>
              &nbsp;-&nbsp;
              {formatter.number(range.maximumSparks)}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo.svg" alt={t('sparksAlt')} height={11} width={8} />
            </>
          )}
        </p>
      </div>
    </div>
  );
}
