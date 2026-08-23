'use client';

import { Suspense, use, useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';

// Components
import RewardItem from '@components/RewardItem/RewardItem';
import { PurchaseModalProvider } from '@contexts/PurchaseModalContext';

// Hooks
import { useCategoryRewards } from '@hooks/useCategoryRewards';
import { queryKeys } from '@hooks/queryKeys';

// Utils
import { getCatalogRewardKey, type CategoryRewardsResponse } from '@utils/rewards';

// Types
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

import styles from './page.module.scss';

const INFINITE_SCROLL_CAP = 100;

type RedeemCategoryPageClientProps = {
  categoryID: RedeemCategoryID,
  categoryPromise: Promise<CategoryRewardsResponse | null>,
};

function RedeemCategoryFallback() {
  return (
    <div className={styles.rewardsGrid} aria-hidden>
      {Array.from({ length: 20 }, (_, index) => (
        <RewardItem key={index} loading />
      ))}
    </div>
  );
}

function RedeemCategoryContent(
  {
    categoryID,
    categoryPromise,
  }: RedeemCategoryPageClientProps,
) {
  const t = useTranslations('RedeemPage');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const cached = queryClient.getQueryData<InfiniteData<CategoryRewardsResponse, number>>(
    queryKeys.rewards.category(categoryID),
  );
  const initialPage = cached ? undefined : use(categoryPromise);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useCategoryRewards({
    categoryID,
    initialPage,
  });

  const rewards = data?.pages.flatMap(page => page.rewards) ?? [];
  const capped = rewards.length >= INFINITE_SCROLL_CAP;
  const canAutoFetch = hasNextPage && !capped && !isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoFetch) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        fetchNextPage().catch(error => {
          console.error(error);
        });
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [ canAutoFetch, fetchNextPage ]);

  if (isLoading && rewards.length === 0) {
    return <RedeemCategoryFallback />;
  }

  if (isError && rewards.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t('loadError')}</p>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t('empty')}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.rewardsGrid}>
        {rewards.map(reward => (
          <RewardItem key={getCatalogRewardKey(reward)} loading={false} reward={reward} />
        ))}
      </div>

      {capped && hasNextPage && (
        <div className={styles.loadMoreWrapper}>
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => {
              fetchNextPage().catch(error => {
                console.error(error);
              });
            }}
            disabled={isFetchingNextPage}
          >
            {t('loadMore')}
          </button>
        </div>
      )}

      <div ref={sentinelRef} className={styles.scrollSentinel} />
    </>
  );
}

export default function RedeemCategoryPageClient(
  {
    categoryID,
    categoryPromise,
  }: RedeemCategoryPageClientProps,
) {
  const t = useTranslations('RedeemPage');

  return (
    <PurchaseModalProvider>
      <div className={styles.categoryContent}>
        <Link href="/redeem" className={styles.backLink}>
          {t('backToAllRewards')}
        </Link>

        <Suspense fallback={<RedeemCategoryFallback />}>
          <RedeemCategoryContent
            categoryID={categoryID}
            categoryPromise={categoryPromise}
          />
        </Suspense>
      </div>
    </PurchaseModalProvider>
  );
}
