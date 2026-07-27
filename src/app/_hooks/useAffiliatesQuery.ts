'use client';

import { useQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import {
  fetchAffiliateData,
  type AffiliatePageData,
} from '@utils/affiliates';
import { queryKeys } from './queryKeys';

export function useAffiliatesQuery(
  {
    initialData,
  }: {
    initialData?: AffiliatePageData | null,
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.affiliates.page(),
    queryFn: async () => {
      const data = await fetchAffiliateData({ request: clientRequest });
      if (!data) throw new Error('Failed to load affiliates');

      return data;
    },
    initialData: initialData ?? undefined,
    throwOnError: false,
  });
}
