'use client';

import { useTranslations } from 'next-intl';
import { PurchaseModalProvider } from '@contexts/PurchaseModalContext';
import RewardCarouselSection from '@components/RewardCarouselSection/RewardCarouselSection';
import EmptyState from '@components/EmptyState/EmptyState';
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
  const { data, isLoading, isError, isFetching } = useFeaturedRewards({
    initialData: initialFeatured,
  });

  const loading = (isLoading || isFetching) && !data;
  const hasAnyRewards = REDEEM_CATEGORY_IDS.some(
    categoryID => (data?.[categoryID]?.rewards?.length ?? 0) > 0,
  );

  if (!loading && (isError || !data || !hasAnyRewards)) {
    return (
      <div className={styles.sections}>
        <EmptyState message={isError || !data ? t('loadError') : t('empty')} />
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
