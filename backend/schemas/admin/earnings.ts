import { z } from 'zod';

import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { AdminEarningSearchBy } from 'types/AdminEarning';

const internalEarningStatuses = [
  'completed',
  'providerPending',
  'held',
  'reversed',
] as const satisfies readonly InternalEarningStatus[];

const adminEarningSearchBy = [
  'userID',
  'conversionID',
  'offerName',
  'offerID',
  'clickID',
  'transactionID',
  'postbackLogID',
] as const satisfies readonly AdminEarningSearchBy[];

export const adminEarningsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.preprocess(
    parseQueryList,
    z.array(z.enum(internalEarningStatuses)).max(internalEarningStatuses.length),
  ).optional().default([]),
  searchBy: z.enum(adminEarningSearchBy).optional().default('userID'),
  search: z.string().trim().max(128).optional().default(''),
});

export const adminEarningsReleaseBodySchema = z.object({
  provider: z.string().trim().min(1).max(64),
  conversionID: z.string().trim().min(1).max(128),
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
