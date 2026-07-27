import type CatalogReward from 'types/Reward/CatalogReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

type FeaturedRewardsCategory = {
  categoryID: RedeemCategoryID,
  categoryName: string,
  rewards: CatalogReward[],
};

/** GET /redemption/category/featured */
type FeaturedRewardsResponse = Record<RedeemCategoryID, FeaturedRewardsCategory>;

export type {
  FeaturedRewardsCategory,
  FeaturedRewardsResponse,
};

export default FeaturedRewardsResponse;
