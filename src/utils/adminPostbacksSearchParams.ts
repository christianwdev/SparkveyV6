import {
  debounce,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_POSTBACK_STATUSES = [
  'pending',
  'completed',
  'failed',
] as const;

export const ADMIN_POSTBACK_SEARCH_BY = [
  'requestID',
  'provider',
  'remoteIP',
] as const;

export const adminPostbacksSearchParams = {
  status: parseAsArrayOf(parseAsStringLiteral(ADMIN_POSTBACK_STATUSES)).withDefault([]),
  searchBy: parseAsStringLiteral(ADMIN_POSTBACK_SEARCH_BY).withDefault('requestID'),
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  page: parseAsInteger.withDefault(1),
};

export const adminPostbacksSearchParamsCache = createSearchParamsCache(adminPostbacksSearchParams);
