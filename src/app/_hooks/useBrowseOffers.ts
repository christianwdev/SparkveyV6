'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { browseOffers, BROWSE_OFFERS_PAGE_SIZE } from '@utils/offers';
import { clientRequest } from '@utils/clientRequest';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import { queryKeys } from './queryKeys';

export type BrowseOffersFilters = {
  search: string;
  sort: BrowseOffersSort;
  categories: string[];
  providers: string[];
};

type UseBrowseOffersParams = BrowseOffersFilters & {
  initialOffers?: SanitizedOffer[];

  /** Filters used when `initialOffers` was fetched on the server. */
  initialFilters?: BrowseOffersFilters;
};

function sameFilters(a: BrowseOffersFilters, b: BrowseOffersFilters) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useBrowseOffers({
  search,
  sort,
  categories,
  providers,
  initialOffers,
  initialFilters,
}: UseBrowseOffersParams) {
  const filters = { search, sort, categories, providers };
  const seeded = initialOffers
    && initialFilters
    && sameFilters(filters, initialFilters)
    ? { pages: [ initialOffers ], pageParams: [ 0 ] }
    : undefined;

  // Freeze SSR seed so rerenders/HMR do not keep resetting freshness with Date.now().
  const [ seededData ] = useState(() => seeded);
  const [ seededAt ] = useState(() => (seededData ? Date.now() : undefined));

  return useInfiniteQuery({
    queryKey: queryKeys.offers.browse(filters),
    queryFn: async ({ pageParam }) => {
      const offers = await browseOffers({
        request: clientRequest,
        limit: BROWSE_OFFERS_PAGE_SIZE,
        skip: pageParam,
        sort,
        search: search || undefined,
        categories,
        providers,
      });

      if (!offers) {
        throw new Error('Failed to load offers');
      }

      return offers;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < BROWSE_OFFERS_PAGE_SIZE) return undefined;

      return allPages.reduce((total, page) => total + page.length, 0);
    },
    initialData: seededData,
    initialDataUpdatedAt: seededAt,
  });
}

export { BROWSE_OFFERS_PAGE_SIZE };
