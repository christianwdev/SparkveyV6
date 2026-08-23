'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

// Components
import { PurchaseModalProvider } from '@contexts/PurchaseModalContext';
import RewardCarouselSection from '@components/RewardCarouselSection/RewardCarouselSection';
import EmptyState from '@components/EmptyState/EmptyState';

// Hooks
import { useFeaturedRewards } from '@hooks/useFeaturedRewards';
import { useCachedQuerySeed } from '@hooks/useCachedQuerySeed';
import { queryKeys } from '@hooks/queryKeys';

// Utils
import { REDEEM_CATEGORY_IDS, type FeaturedRewardsResponse } from '@utils/rewards';

import styles from './page.module.scss';

type RedeemPageClientProps = {
  featuredPromise: Promise<FeaturedRewardsResponse | null>,
};

function RedeemPageFallback() {
  return (
    <div className={styles.sections} aria-hidden>
      {REDEEM_CATEGORY_IDS.map(categoryID => (
        <RewardCarouselSection
          key={categoryID}
          categoryID={categoryID}
          loading
        />
      ))}
    </div>
  );
}

function RedeemPageContent({ featuredPromise }: RedeemPageClientProps) {
  const t = useTranslations('RedeemPage');
  const initialFeatured = useCachedQuerySeed({
    queryKey: queryKeys.rewards.featured(),
    promise: featuredPromise,
  });

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

export default function RedeemPageClient({ featuredPromise }: RedeemPageClientProps) {
  return (
    <Suspense fallback={<RedeemPageFallback />}>
      <RedeemPageContent featuredPromise={featuredPromise} />
    </Suspense>
  );
}
