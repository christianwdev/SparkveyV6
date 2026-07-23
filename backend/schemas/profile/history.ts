import { z } from 'zod';

import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';

export const HISTORY_PAGE_SIZE = 10;

const internalEarningStatuses = [
  'completed',
  'providerPending',
  'held',
  'reversed',
] as const satisfies readonly InternalEarningStatus[];

const internalEarningTypes = [
  'offer',
  'shopping',
] as const;

const internalRedemptionStatuses = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
] as const satisfies readonly InternalRedemptionStatus[];

const internalRedemptionTypes = [
  'ccpayment',
  'tremendous',
] as const satisfies readonly InternalRedemptionProvider[];

export const earningsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(internalEarningStatuses).optional(),
  type: z.enum(internalEarningTypes).optional(),
});

export const redemptionsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(internalRedemptionStatuses).optional(),
  type: z.enum(internalRedemptionTypes).optional(),
});
