'use client';

import { useTranslations } from 'next-intl';
import { PurchaseModalProvider } from '@contexts/PurchaseModalContext';
import RewardCarouselSection from '@components/RewardCarouselSection/RewardCarouselSection';
import { useFeaturedRewards } from '@hooks/useFeaturedRewards';
import {
  REDEEM_CATEGORY_IDS,
  type FeaturedRewardsResponse,
} from '@utils/rewards';
import styles from './page.module.scss';

type RedeemPageClientProps = {
  initialFeatured: FeaturedRewardsResponse | null,
};

export default function RedeemPageClient(
  {
    initialFeatured,
  }: RedeemPageClientProps,
) {
  const t = useTranslations('RedeemPage');
  const { data, isLoading, isError } = useFeaturedRewards({
    initialData: initialFeatured,
  });

  const loading = isLoading && !data;

  if (isError && !data) {
    return (
      <div className={styles.sections}>
        <div className={styles.loadError}>
          <p>{t('loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <PurchaseModalProvider>
      <div className={styles.sections}>
        {REDEEM_CATEGORY_IDS.map(categoryID => (
          <RewardCarouselSection
            key={categoryID}
            categoryID={categoryID}
            rewards={data?.[categoryID]?.rewards}
            viewAllHref={`/redeem/${categoryID}`}
            loading={loading}
          />
        ))}
      </div>
    </PurchaseModalProvider>
  );
}
