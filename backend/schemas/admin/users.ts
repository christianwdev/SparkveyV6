import { z } from 'zod';

import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';
import type EmailActionable from 'types/EmailActionable';

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

const emailActionableTypes = [
  'verification',
  'forgotPassword',
] as const satisfies readonly EmailActionable['type'][];

export const adminPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const adminUserSessionsQuerySchema = adminPaginationQuerySchema.extend({
  activeOnly: z.coerce.boolean().optional().default(false),
});

export const adminUserEarningsQuerySchema = adminPaginationQuerySchema.extend({
  status: z.enum(internalEarningStatuses).optional(),
  type: z.enum(internalEarningTypes).optional(),
});

export const adminUserRedemptionsQuerySchema = adminPaginationQuerySchema.extend({
  status: z.enum(internalRedemptionStatuses).optional(),
  type: z.enum(internalRedemptionTypes).optional(),
});

export const adminUserEmailsQuerySchema = adminPaginationQuerySchema.extend({
  type: z.enum(emailActionableTypes).optional(),
});
