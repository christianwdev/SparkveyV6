import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_USER_FILTER_BY = [ 'username', 'email', 'userID' ] as const;
export const ADMIN_USER_SORTS = [ 'createdAt', 'balance.sparks' ] as const;
export const ADMIN_USER_ORDERS = [ 'desc', 'asc' ] as const;

export const adminUsersSearchParams = {
  search: parseAsString.withDefault('').withOptions({
    limitUrlUpdates: debounce(300),
  }),
  filterBy: parseAsStringLiteral(ADMIN_USER_FILTER_BY).withDefault('username'),
  sort: parseAsStringLiteral(ADMIN_USER_SORTS).withDefault('createdAt'),
  order: parseAsStringLiteral(ADMIN_USER_ORDERS).withDefault('desc'),
  page: parseAsInteger.withDefault(1),
};

export const adminUsersSearchParamsCache = createSearchParamsCache(adminUsersSearchParams);
