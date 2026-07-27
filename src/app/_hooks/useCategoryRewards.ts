'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import {
  getCategoryRewards,
  type CategoryRewardsResponse,
  type RedeemCategoryID,
} from '@utils/rewards';
import { queryKeys } from './queryKeys';

type UseCategoryRewardsParams = {
  categoryID: RedeemCategoryID,

  /** Omit when SSR fetch failed so the client can refetch without seeding an empty page. */
  initialPage?: CategoryRewardsResponse,
};

export function useCategoryRewards(
  {
    categoryID,
    initialPage,
  }: UseCategoryRewardsParams,
) {
  const initialData = initialPage !== undefined
    ? { pages: [ initialPage ], pageParams: [ 0 ] }
    : undefined;

  return useInfiniteQuery({
    queryKey: queryKeys.rewards.category(categoryID),
    queryFn: async ({ pageParam }) => {
      const page = await getCategoryRewards({
        request: clientRequest,
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
    initialData,
    throwOnError: false,
  });
}
