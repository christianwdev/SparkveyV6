import type { BrowseOffersSort } from 'types/Offer/BrowseOffersSort';

export const queryKeys = {
  offers: {
    all: [ 'offers' ] as const,
    homepage: () => [ ...queryKeys.offers.all, 'homepage' ] as const,
    browse: (filters: {
      search: string;
      sort: BrowseOffersSort;
      categories: string[];
      providers: string[];
    }) => [ ...queryKeys.offers.all, 'browse', filters ] as const,
  },
  surveys: {
    all: [ 'surveys' ] as const,
    list: (limit: number) => [ ...queryKeys.surveys.all, 'list', { limit } ] as const,
  },
};
