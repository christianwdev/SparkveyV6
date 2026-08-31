import {
  debounce,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_EARNING_STATUSES = [
  'completed',
  'providerPending',
  'held',
  'reversed',
] as const;

export const ADMIN_EARNING_SEARCH_BY = [
  'userID',
  'conversionID',
  'offerName',
  'offerID',
  'clickID',
  'transactionID',
  'postbackLogID',
] as const;

export const adminEarningsSearchParams = {
  status: parseAsArrayOf(parseAsStringLiteral(ADMIN_EARNING_STATUSES)).withDefault([]),
  searchBy: parseAsStringLiteral(ADMIN_EARNING_SEARCH_BY).withDefault('userID'),
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  page: parseAsInteger.withDefault(1),
};

export const adminEarningsSearchParamsCache = createSearchParamsCache(adminEarningsSearchParams);
