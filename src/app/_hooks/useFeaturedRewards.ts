'use client';

import { useQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import {
  getFeaturedRewards,
  type FeaturedRewardsResponse,
} from '@utils/rewards';
import { queryKeys } from './queryKeys';

export function useFeaturedRewards(
  {
    initialData,
  }: {
    initialData?: FeaturedRewardsResponse | null,
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.rewards.featured(),
    queryFn: async () => {
      const featured = await getFeaturedRewards({ request: clientRequest });
      if (!featured) throw new Error('Failed to load featured rewards');

      return featured;
    },
    initialData: initialData ?? undefined,

    // Keep the redeem page mounted — render empty / load-error UI instead of error.tsx.
    throwOnError: false,
  });
}
