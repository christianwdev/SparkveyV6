'use client';

import { useQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import { getWalls } from '@utils/walls';
import type CatalogOfferwall from 'types/Offer/CatalogOfferwall';
import { queryKeys } from './queryKeys';

export function useWallsQuery(
  {
    initialData,
  }: {
    initialData?: CatalogOfferwall[] | null,
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.walls.list(),
    queryFn: async () => {
      const walls = await getWalls({ request: clientRequest });
      if (!walls) throw new Error('Failed to load walls');

      return walls;
    },
    initialData: initialData ?? undefined,
    throwOnError: false,
  });
}
