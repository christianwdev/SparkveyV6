import {
  parseAsArrayOf,
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
  'ccpayment',
  'tremendous',
] as const;

export const adminWithdrawalsSearchParams = {
  status: parseAsArrayOf(parseAsStringLiteral(ADMIN_WITHDRAWAL_STATUSES)).withDefault([]),
  provider: parseAsArrayOf(parseAsStringLiteral(ADMIN_WITHDRAWAL_PROVIDERS)).withDefault([]),
  page: parseAsInteger.withDefault(1),
};

export const adminWithdrawalsSearchParamsCache = createSearchParamsCache(adminWithdrawalsSearchParams);
