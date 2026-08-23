import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_OFFER_STATUSES = [
  'active',
  'inactive',
  'disabled',
] as const;

export const ADMIN_OFFER_SEARCH_BY = [
  'name',
  'displayName',
  'provider',
  'offerID',
  'externalID',
] as const;

export const ADMIN_OFFER_SORT_BY = [
  'featuredPriority',
  'totalReward',
  'name',
  'updatedAt',
] as const;

export const ADMIN_OFFER_SORT_DIRECTION = [
  'asc',
  'desc',
] as const;

export const adminOffersSearchParams = {
  status: parseAsStringLiteral([ 'all', ...ADMIN_OFFER_STATUSES ]).withDefault('all'),
  searchBy: parseAsStringLiteral(ADMIN_OFFER_SEARCH_BY).withDefault('name'),
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  sortBy: parseAsStringLiteral(ADMIN_OFFER_SORT_BY).withDefault('totalReward'),
  sortDirection: parseAsStringLiteral(ADMIN_OFFER_SORT_DIRECTION).withDefault('desc'),
  page: parseAsInteger.withDefault(1),
};

export const adminOffersSearchParamsCache = createSearchParamsCache(adminOffersSearchParams);
