import { z } from 'zod';

import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';

const internalRedemptionStatuses = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
] as const satisfies readonly InternalRedemptionStatus[];

const internalRedemptionProviders = [
  'ccpayment',
  'tremendous',
] as const satisfies readonly InternalRedemptionProvider[];

export const adminWithdrawalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(internalRedemptionStatuses).optional().default('pending'),
  provider: z.enum(internalRedemptionProviders).optional(),
});

export const adminWithdrawalsAcceptBodySchema = z.object({
  redemptionIDs: z.array(z.string().min(1).max(64)).min(1).max(50),
  attestation: z.object({
    reason: z.string().trim().min(10).max(2000),
  }).optional(),
});

export const adminWithdrawalsRejectBodySchema = z.object({
  redemptionIDs: z.array(z.string().min(1).max(64)).min(1).max(50),
  reason: z.string().trim().max(2000).optional(),
});
