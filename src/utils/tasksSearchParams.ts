import {
  debounce,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';
import {
  BrowseOffersSorts,
  DEFAULT_BROWSE_OFFERS_SORT,
} from 'types/Offer/BrowseOffersSort';

export const tasksSearchParams = {
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  sort: parseAsStringLiteral(BrowseOffersSorts).withDefault(DEFAULT_BROWSE_OFFERS_SORT),
  categories: parseAsArrayOf(parseAsString).withDefault([]),
  providers: parseAsArrayOf(parseAsString).withDefault([]),
};

export const tasksSearchParamsCache = createSearchParamsCache(tasksSearchParams);
