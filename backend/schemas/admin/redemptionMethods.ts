import { z } from 'zod';

import type {
  AdminRedemptionMethodSearchBy,
  AdminRedemptionMethodStatus,
} from 'types/AdminRedemptionMethod';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

const adminRedemptionMethodStatuses = [
  'active',
  'inactive',
] as const satisfies readonly AdminRedemptionMethodStatus[];

const adminRedemptionMethodSearchBy = [
  'name',
  'rewardID',
] as const satisfies readonly AdminRedemptionMethodSearchBy[];

const redeemCategories = [
  'cash',
  'giftcards',
  'crypto',
] as const satisfies readonly RedeemCategoryID[];

export const adminRedemptionMethodsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(adminRedemptionMethodStatuses).optional(),
  searchBy: z.enum(adminRedemptionMethodSearchBy).optional().default('name'),
  search: z.string().trim().max(128).optional().default(''),
  sortDirection: z.enum([ 'asc', 'desc' ]).optional().default('asc'),
});

export const adminRedemptionMethodParamsSchema = z.object({
  rewardID: z.string().trim().min(1).max(128),
});

export const adminRedemptionMethodUpdateBodySchema = z.object({
  rewardID: z.string().trim().min(1).max(128),
  status: z.enum(adminRedemptionMethodStatuses).optional(),
  featuredSpot: z.number().int().min(0).max(1_000_000).nullable().optional(),
  categories: z.array(z.enum(redeemCategories)).max(redeemCategories.length).optional(),
  internalImage: z.object({
    src: z.string().trim().max(2048),
    type: z.enum([ 'card', 'logo' ]),
  }).nullable().optional(),
});
