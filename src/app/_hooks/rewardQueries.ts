import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import {
  getCategoryRewards,
  getFeaturedRewards,
  type RedeemCategoryID,
} from '@utils/rewards';
import { queryKeys } from './queryKeys';

type RequestFn = typeof clientRequest | typeof serverRequest;

export function featuredRewardsQueryOptions(
  {
    request,
  }: {
    request: RequestFn,
  },
) {
  return queryOptions({
    queryKey: queryKeys.rewards.featured(),
    queryFn: async () => {
      const featured = await getFeaturedRewards({ request });
      if (!featured) throw new Error('Failed to load featured rewards');

      return featured;
    },
  });
}

export function categoryRewardsInfiniteQueryOptions(
  {
    request,
    categoryID,
  }: {
    request: RequestFn,
    categoryID: RedeemCategoryID,
  },
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.rewards.category(categoryID),
    queryFn: async ({ pageParam }) => {
      const page = await getCategoryRewards({
        request,
        categoryID,
        skip: pageParam,
      });

      if (!page) throw new Error('Failed to load category rewards');

      return page;
    },
    initialPageParam: 0,

    // `nextSkip` reflects raw documents consumed server-side — do not derive it
    // from `rewards.length`, since toCatalogRewards can drop entries and that
    // would under-count skip and re-serve already-seen rewards.
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextSkip : undefined),
  });
}
