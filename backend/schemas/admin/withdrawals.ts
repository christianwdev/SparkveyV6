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
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.preprocess(
    parseQueryList,
    z.array(z.enum(internalRedemptionStatuses)).max(internalRedemptionStatuses.length),
  ).optional().default([]),
  provider: z.preprocess(
    parseQueryList,
    z.array(z.enum(internalRedemptionProviders)).max(internalRedemptionProviders.length),
  ).optional().default([]),
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

function parseQueryList(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];

  const parts = Array.isArray(value) ? value : [ value ];
  const items: string[] = [];

  for (const part of parts) {
    for (const item of String(part).split(',')) {
      const trimmed = item.trim();
      if (trimmed) items.push(trimmed);
    }
  }

  return [ ...new Set(items) ];
}
