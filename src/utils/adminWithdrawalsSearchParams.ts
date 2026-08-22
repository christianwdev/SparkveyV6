import {
  parseAsInteger,
  parseAsStringLiteral,
  createSearchParamsCache,
} from 'nuqs/server';

export const ADMIN_WITHDRAWAL_STATUSES = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
] as const;

export const ADMIN_WITHDRAWAL_PROVIDERS = [
  'all',
  'ccpayment',
  'tremendous',
] as const;

export const adminWithdrawalsSearchParams = {
  status: parseAsStringLiteral(ADMIN_WITHDRAWAL_STATUSES).withDefault('pending'),
  provider: parseAsStringLiteral(ADMIN_WITHDRAWAL_PROVIDERS).withDefault('all'),
  page: parseAsInteger.withDefault(1),
};

export const adminWithdrawalsSearchParamsCache = createSearchParamsCache(adminWithdrawalsSearchParams);
