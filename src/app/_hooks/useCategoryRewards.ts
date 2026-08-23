'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import type { CategoryRewardsResponse, RedeemCategoryID } from '@utils/rewards';
import { categoryRewardsInfiniteQueryOptions } from './rewardQueries';

export function useCategoryRewards(
  {
    categoryID,
    initialPage,
  }: {
    categoryID: RedeemCategoryID,
    initialPage?: CategoryRewardsResponse | null,
  },
) {
  const [ seed ] = useState(() => ({
    categoryID,
    page: initialPage ?? undefined,
    at: Date.now(),
  }));

  const seededPage = seed.categoryID === categoryID ? seed.page : undefined;
  const initialData = seededPage
    ? { pages: [ seededPage ], pageParams: [ 0 ] }
    : undefined;

  return useInfiniteQuery({
    ...categoryRewardsInfiniteQueryOptions({
      request: clientRequest,
      categoryID,
    }),
    initialData,
    initialDataUpdatedAt: initialData ? seed.at : undefined,
    throwOnError: false,
  });
}
