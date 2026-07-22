'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { browseOffers } from '@utils/offers';
import { clientRequest } from '@utils/clientRequest';
import type InternalOffer from 'types/Offer/InternalOffer';
import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';
import { queryKeys } from './queryKeys';

const LOAD_LIMIT = 28;

export type BrowseOffersFilters = {
  search: string;
  sort: BrowseOffersSort;
  categories: string[];
  providers: string[];
};

type UseBrowseOffersParams = BrowseOffersFilters & {
  initialOffers?: InternalOffer[];

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
  const initialData = initialOffers
    && initialFilters
    && sameFilters(filters, initialFilters)
    ? { pages: [ initialOffers ], pageParams: [ 0 ] }
    : undefined;

  return useInfiniteQuery({
    queryKey: queryKeys.offers.browse(filters),
    queryFn: async ({ pageParam }) => {
      const offers = await browseOffers({
        request: clientRequest,
        limit: LOAD_LIMIT,
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
      if (lastPage.length < LOAD_LIMIT) return undefined;

      return allPages.reduce((total, page) => total + page.length, 0);
    },
    initialData,
  });
}

export { LOAD_LIMIT as BROWSE_OFFERS_PAGE_SIZE };
