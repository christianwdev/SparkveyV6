'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import type { FeaturedRewardsResponse } from '@utils/rewards';
import { featuredRewardsQueryOptions } from './rewardQueries';

export function useFeaturedRewards(
  {
    initialData,
  }: {
    initialData?: FeaturedRewardsResponse | null,
  } = {},
) {
  // Freeze SSR seed so rerenders/HMR do not keep resetting freshness with Date.now().
  const [ seededData ] = useState(() => initialData ?? undefined);
  const [ seededAt ] = useState(() => (seededData ? Date.now() : undefined));

  return useQuery({
    ...featuredRewardsQueryOptions({ request: clientRequest }),
    initialData: seededData,
    initialDataUpdatedAt: seededAt,

    // Keep the redeem page mounted — render empty / load-error UI instead of error.tsx.
    throwOnError: false,
  });
}
