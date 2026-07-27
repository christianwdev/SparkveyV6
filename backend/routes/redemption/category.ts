import { Hono } from 'hono';

// Utils
import {
  CATEGORY_REWARDS_PAGE_SIZE,
  fetchFeaturedRewardsByCategory,
  fetchRewardsByCategory,
  isRedeemCategoryID,
  REDEEM_CATEGORY_IDS,
  REDEEM_CATEGORY_META,
  toCatalogRewards,
} from 'backend/utils/rewards';
import { getCountryFromRequest, normalizeQuery, withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';

// Types
import type FeaturedRewardsResponse from 'types/API/Redemption/FeaturedRewards';
import type CategoryRewardsResponse from 'types/API/Redemption/CategoryRewards';
import RouteResponseError from 'types/RouteResponseError';

const app = new Hono();

export default function routeInvoker() {
  app.get('/featured', withRouteErrorHandling, async (c) => {
    const country = getCountryFromRequest(c);

    const categoriesWithTopRewards = await Promise.all(
      REDEEM_CATEGORY_IDS.map(async (categoryID) => {
        const topRewards = await fetchFeaturedRewardsByCategory(categoryID, { country });

        return {
          ...REDEEM_CATEGORY_META[categoryID],
          rewards: toCatalogRewards(topRewards),
        };
      }),
    );

    const categories = Object.fromEntries(
      categoriesWithTopRewards.map((category) => [ category.categoryID, category ]),
    ) as FeaturedRewardsResponse;

    return sendResponse({ c, status: 200, success: true, data: categories });
  });

  app.get('/:categoryID', withRouteErrorHandling, async (c) => {
    const categoryID = c.req.param('categoryID');

    if (!isRedeemCategoryID(categoryID)) {
      throw new RouteResponseError({ status: 404, message: 'Category not found' });
    }

    const category = REDEEM_CATEGORY_META[categoryID];
    const country = getCountryFromRequest(c);
    const { skip: skipQuery } = normalizeQuery(c.req.query());
    const skip = Number(skipQuery ?? '0');

    if (!Number.isInteger(skip) || skip < 0) {
      throw new RouteResponseError({ status: 400, message: 'Invalid skip' });
    }

    // Fetch one extra to determine hasMore without exposing page size to clients.
    const page = await fetchRewardsByCategory(categoryID, {
      country,
      skip,
      limit: CATEGORY_REWARDS_PAGE_SIZE + 1,
    });
    const hasMore = page.length > CATEGORY_REWARDS_PAGE_SIZE;
    const consumedRewards = hasMore ? page.slice(0, CATEGORY_REWARDS_PAGE_SIZE) : page;

    // Advance by the raw documents consumed, not `rewards.length` below —
    // toCatalogRewards can drop entries, which would otherwise under-count
    // skip and cause the next page to re-serve already-seen rewards.
    const data: CategoryRewardsResponse = {
      ...category,
      rewards: toCatalogRewards(consumedRewards),
      hasMore,
      ...(hasMore ? { nextSkip: skip + consumedRewards.length } : {}),
    };

    return sendResponse({
      c,
      status: 200,
      success: true,
      data,
    });
  });

  return app;
}
