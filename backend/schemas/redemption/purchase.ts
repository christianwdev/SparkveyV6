import { z } from 'zod';

export const purchaseBodySchema = z.object({
  rewardID: z.string().trim().min(1).max(128),
  value: z.number().finite().positive(),
  walletAddress: z.string().trim().min(1).max(256).optional(),
  currencyCode: z.string().trim().min(1).max(16).optional(),
});
