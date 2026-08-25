'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { browseOffers, BROWSE_OFFERS_PAGE_SIZE } from '@utils/offers';
import { clientRequest } from '@utils/clientRequest';
import type BrowseOffersFilters from 'types/BrowseOffersFilters';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import { queryKeys } from './queryKeys';

type UseBrowseOffersParams = BrowseOffersFilters & {
  initialOffers?: SanitizedOffer[],

  /** Filters used when `initialOffers` was fetched on the server. */
  initialFilters?: BrowseOffersFilters,
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

  // Freeze SSR seed so rerenders/HMR do not keep resetting freshness with Date.now().
  const [ seededOffers ] = useState(() => initialOffers);
  const [ seededFilters ] = useState(() => initialFilters);
  const [ seededAt ] = useState(() => (
    initialOffers && initialFilters ? Date.now() : undefined
  ));

  const initialData = seededOffers
    && seededFilters
    && sameFilters(filters, seededFilters)
    ? { pages: [ seededOffers ], pageParams: [ 0 ] }
    : undefined;

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
    initialData,
    initialDataUpdatedAt: initialData ? seededAt : undefined,
  });
}

export { BROWSE_OFFERS_PAGE_SIZE };
