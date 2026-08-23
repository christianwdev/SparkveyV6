import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_REDEMPTION_METHOD_STATUSES = [
  'active',
  'inactive',
] as const;

export const ADMIN_REDEMPTION_METHOD_SEARCH_BY = [
  'name',
  'rewardID',
] as const;

export const ADMIN_REDEMPTION_METHOD_SORT_DIRECTION = [
  'asc',
  'desc',
] as const;

export const adminRedemptionMethodsSearchParams = {
  status: parseAsStringLiteral([ 'all', ...ADMIN_REDEMPTION_METHOD_STATUSES ]).withDefault('all'),
  searchBy: parseAsStringLiteral(ADMIN_REDEMPTION_METHOD_SEARCH_BY).withDefault('name'),
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  sortDirection: parseAsStringLiteral(ADMIN_REDEMPTION_METHOD_SORT_DIRECTION).withDefault('asc'),
  page: parseAsInteger.withDefault(1),
};

export const adminRedemptionMethodsSearchParamsCache = createSearchParamsCache(adminRedemptionMethodsSearchParams);
