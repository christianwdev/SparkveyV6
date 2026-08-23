import { z } from 'zod';

import type { AdminPostbackSearchBy, AdminPostbackStatus } from 'types/AdminPostback';

const adminPostbackStatuses = [
  'pending',
  'completed',
  'failed',
] as const satisfies readonly AdminPostbackStatus[];

const adminPostbackSearchBy = [
  'provider',
  'requestID',
  'remoteIP',
] as const satisfies readonly AdminPostbackSearchBy[];

export const adminPostbacksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.preprocess(
    parseQueryList,
    z.array(z.enum(adminPostbackStatuses)).max(adminPostbackStatuses.length),
  ).optional().default([]),
  searchBy: z.enum(adminPostbackSearchBy).optional().default('requestID'),
  search: z.string().trim().max(128).optional().default(''),
});

export const adminPostbacksRetryBodySchema = z.object({
  requestID: z.string().trim().min(1).max(128),
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
