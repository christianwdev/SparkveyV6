import type CatalogReward from 'types/Reward/CatalogReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

/** GET /redemption/category/:categoryID query */
type CategoryRewardsQuery = {
  skip?: number,
};

/** GET /redemption/category/:categoryID */
type CategoryRewardsResponse = {
  categoryID: RedeemCategoryID,
  categoryName: string,
  rewards: CatalogReward[],
  hasMore: boolean,
  nextSkip?: number,
};

export type {
  CategoryRewardsQuery,
  CategoryRewardsResponse,
};

export default CategoryRewardsResponse;
