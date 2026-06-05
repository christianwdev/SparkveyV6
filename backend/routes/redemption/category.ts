import { Hono } from 'hono';

// Utils
import { fetchFeaturedRewardsByCategory, fetchRewardsByCategory } from 'backend/utils/rewards';
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';

// Types
import type RewardsCategory from 'types/RewardsCategory';
import RouteResponseError from 'types/RouteResponseError';

const app = new Hono();

const predefinedCategories: Record<string, Omit<RewardsCategory, 'rewards'>> = {
  cash: {
    categoryID: 'cash',
    categoryName: 'Cash',
  },
  crypto: {
    categoryID: 'crypto',
    categoryName: 'Crypto',
  },
  giftcards: {
    categoryID: 'giftcards',
    categoryName: 'Gift Cards',
  },
};

export default function routeInvoker() {
  app.get('/featured', withRouteErrorHandling, async (c) => {
    const categoryIDs = Object.keys(predefinedCategories);

    const categoriesWithTopRewards = await Promise.all(
      categoryIDs.map(async (categoryID) => {
        const topRewards = await fetchFeaturedRewardsByCategory(categoryID);

        return {
          ...predefinedCategories[categoryID],
          rewards: topRewards,
        };
      }),
    );

    const categories = Object.fromEntries(
      categoriesWithTopRewards.map((category) => [ category.categoryID, category ]),
    ) as Record<string, RewardsCategory>;

    return sendResponse({ c, status: 200, success: true, data: categories });
  });

  app.get('/:categoryID', withRouteErrorHandling, async (c) => {
    const categoryID = c.req.param('categoryID');
    const category = predefinedCategories[categoryID];

    if (!category) throw new RouteResponseError({ status: 404, message: 'Category not found' });

    const rewards = await fetchRewardsByCategory(categoryID);

    const categoryWithRewards: RewardsCategory = {
      ...category,
      rewards,
    };

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: categoryWithRewards,
    });
  });

  return app;
}
