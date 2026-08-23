import { z } from 'zod';

import type {
  AdminOfferSearchBy,
  AdminOfferSortBy,
  AdminOfferStatus,
} from 'types/AdminOffer';

const adminOfferStatuses = [
  'active',
  'inactive',
  'disabled',
] as const satisfies readonly AdminOfferStatus[];

const adminOfferSearchBy = [
  'name',
  'displayName',
  'provider',
  'offerID',
  'externalID',
] as const satisfies readonly AdminOfferSearchBy[];

const adminOfferSortBy = [
  'featuredPriority',
  'totalReward',
  'name',
  'updatedAt',
] as const satisfies readonly AdminOfferSortBy[];

const rewardValueSchema = z.union([
  z.number().finite().min(0).max(1_000_000),
  z.literal('variable'),
]);

const createRewardSchema = z.object({
  externalID: z.string().trim().max(128).optional(),
  description: z.string().trim().max(500).optional(),
  value: rewardValueSchema,
  revenue: rewardValueSchema.optional(),
});

const updateRewardSchema = z.object({
  rewardID: z.string().trim().min(1).max(128),
  value: rewardValueSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export const adminOffersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(adminOfferStatuses).optional(),
  searchBy: z.enum(adminOfferSearchBy).optional().default('name'),
  search: z.string().trim().max(128).optional().default(''),
  sortBy: z.enum(adminOfferSortBy).optional().default('totalReward'),
  sortDirection: z.enum([ 'asc', 'desc' ]).optional().default('desc'),
});

export const adminOfferParamsSchema = z.object({
  offerID: z.string().trim().min(1).max(128),
});

export const adminOfferCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  displayName: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1).max(10_000),
  image: z.string().trim().min(1).max(2048),
  trackingURL: z.string().trim().min(1).max(2048),
  rewards: z.array(createRewardSchema).min(1).max(50),
  geos: z.array(z.string().trim().max(16)).max(300).optional(),
  geosBlacklist: z.array(z.string().trim().max(16)).max(300).optional(),
  status: z.enum(adminOfferStatuses).optional().default('active'),
  terms: z.string().trim().max(10_000).optional(),
  disclaimer: z.string().trim().max(10_000).optional(),
  featuredPriority: z.number().int().min(0).max(1_000_000).optional(),
});

export const adminOfferUpdateBodySchema = z.object({
  offerID: z.string().trim().min(1).max(128),
  displayName: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10_000).optional(),
  terms: z.string().trim().max(10_000).optional(),
  disclaimer: z.string().trim().max(10_000).optional(),
  featuredPriority: z.number().int().min(0).max(1_000_000).nullable().optional(),
  status: z.enum(adminOfferStatuses).optional(),
  geos: z.array(z.string().trim().max(16)).max(300).optional(),
  geosBlacklist: z.array(z.string().trim().max(16)).max(300).optional(),
  image: z.string().trim().max(2048).optional(),
  trackingURL: z.string().trim().max(2048).optional(),
  rewards: z.array(updateRewardSchema).min(1).max(50).optional(),
});
