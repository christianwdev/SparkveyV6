'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';

// Components
import RewardItem from '@components/RewardItem/RewardItem';
import { PurchaseModalProvider } from '@contexts/PurchaseModalContext';

// Hooks
import { useCategoryRewards } from '@hooks/useCategoryRewards';

// Utils
import { getCatalogRewardKey } from '@utils/rewards';

// Types
import type CategoryRewardsResponse from 'types/API/Redemption/CategoryRewards';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

import styles from './page.module.scss';

const INFINITE_SCROLL_CAP = 100;

type RedeemCategoryPageClientProps = {
  categoryID: RedeemCategoryID,
  initialPage?: CategoryRewardsResponse,
};

function RedeemCategoryContent(
  {
    categoryID,
    initialPage,
  }: RedeemCategoryPageClientProps,
) {
  const t = useTranslations('RedeemPage');
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const rewards = data?.pages.flatMap(page => page.rewards) ?? initialPage?.rewards ?? [];
  const capped = rewards.length >= INFINITE_SCROLL_CAP;
  const canAutoFetch = hasNextPage && !capped && !isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoFetch) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        void fetchNextPage();
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [ canAutoFetch, fetchNextPage ]);

  return (
    <div className={styles.categoryContent}>
      <Link href="/redeem" className={styles.backLink}>
        {t('backToAllRewards')}
      </Link>

      {isLoading && rewards.length === 0 ? (
        <div className={styles.rewardsGrid} aria-hidden>
          {Array.from({ length: 20 }, (_, index) => (
            <RewardItem key={index} loading />
          ))}
        </div>
      ) : isError && rewards.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('loadError')}</p>
        </div>
      ) : rewards.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('empty')}</p>
        </div>
      ) : (
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
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {t('loadMore')}
              </button>
            </div>
          )}

          <div ref={sentinelRef} className={styles.scrollSentinel} />
        </>
      )}
    </div>
  );
}

function RedeemCategoryFallback() {
  return (
    <div className={styles.categoryContent}>
      <div className={styles.rewardsGrid} aria-hidden>
        {Array.from({ length: 20 }, (_, index) => (
          <RewardItem key={index} loading />
        ))}
      </div>
    </div>
  );
}

export default function RedeemCategoryPageClient(props: RedeemCategoryPageClientProps) {
  return (
    <PurchaseModalProvider>
      <Suspense fallback={<RedeemCategoryFallback />}>
        <RedeemCategoryContent {...props} />
      </Suspense>
    </PurchaseModalProvider>
  );
}
