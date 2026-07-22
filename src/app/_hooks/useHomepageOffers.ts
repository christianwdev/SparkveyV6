'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsersHomepage, homepageHasOffers } from '@utils/homepage';
import { clientRequest } from '@utils/clientRequest';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';
import { queryKeys } from './queryKeys';

type UseHomepageOffersParams = {
  initialData?: HomepageOffersResponse | null;
};

export function useHomepageOffers({ initialData }: UseHomepageOffersParams = {}) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.offers.homepage();

  // Freeze SSR seed so rerenders/HMR do not keep resetting freshness with Date.now().
  const [ seededData ] = useState(() => initialData ?? undefined);
  const [ seededAt ] = useState(() => (seededData ? Date.now() : undefined));

  return useQuery({
    queryKey,
    queryFn: async () => {
      const homepage = await getUsersHomepage({ request: clientRequest });

      if (!homepage) {
        throw new Error('Failed to load homepage offers');
      }

      // A slow/empty client refetch must not wipe a good SSR/cached payload.
      if (!homepageHasOffers(homepage)) {
        const cached = queryClient.getQueryData<HomepageOffersResponse>(queryKey);

        if (cached && homepageHasOffers(cached)) {
          return {
            ...cached,
            surveys: homepage.surveys.length > 0 ? homepage.surveys : cached.surveys,
          };
        }
      }

      return homepage;
    },
    initialData: seededData,
    initialDataUpdatedAt: seededAt,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
