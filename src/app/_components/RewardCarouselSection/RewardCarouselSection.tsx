'use client';

import { useTranslations } from 'next-intl';

// Components
import RewardItem from '@components/RewardItem/RewardItem';
import ItemCarouselSection from '@components/ItemCarouselSection/ItemCarouselSection';

// Utils
import { getCatalogRewardKey } from '@utils/rewards';

// Types
import type CatalogReward from 'types/Reward/CatalogReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

type RewardCarouselSectionProps = {
  categoryID: RedeemCategoryID,
  rewards?: CatalogReward[],
  viewAllHref?: string,
  offersPerView?: number,
  loading?: boolean,
};

export default function RewardCarouselSection(
  {
    categoryID,
    rewards = [],
    viewAllHref,
    offersPerView,
    loading = false,
  }: RewardCarouselSectionProps,
) {
  const t = useTranslations('RedeemPage.sections');
  const tControls = useTranslations('RedeemPage');

  return (
    <ItemCarouselSection
      title={t(`${categoryID}.title`)}
      description={t(`${categoryID}.description`)}
      viewAllHref={viewAllHref}
      viewAllLabel={tControls('viewAll')}
      previousLabel={tControls('previous')}
      nextLabel={tControls('next')}
      itemsPerView={offersPerView}
      loading={loading}
      itemCount={rewards.length}
      skeletonCount={offersPerView ?? 5}
      renderSkeleton={(index) => <RewardItem key={index} loading />}
    >
      {rewards.map(reward => (
        <RewardItem key={getCatalogRewardKey(reward)} loading={false} reward={reward} />
      ))}
    </ItemCarouselSection>
  );
}
