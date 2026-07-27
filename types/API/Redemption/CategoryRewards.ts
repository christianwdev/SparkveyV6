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
  /** True when another page is available after this response's rewards. */
  hasMore: boolean,
  /**
   * Raw-document skip for the next page. Not simply `rewards.length` —
   * `toCatalogRewards` can drop entries (e.g. missing FX pricing), so the
   * client must not derive skip from the filtered catalog array length.
   */
  nextSkip?: number,
};

export type {
  CategoryRewardsQuery,
  CategoryRewardsResponse,
};

export default CategoryRewardsResponse;
