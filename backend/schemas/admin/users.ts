import { z } from 'zod';
import { emailSchema, usernameSchema } from 'schemas/auth';

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
  'emailChange',
  'accountDeletion',
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

export const adminListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().max(128).optional(),
  sort: z.enum([ 'createdAt', 'balance.sparks' ]).optional().default('createdAt'),
  order: z.enum([ 'asc', 'desc' ]).optional().default('desc'),
  filterBy: z.enum([ 'username', 'email', 'userID' ]).optional().default('username'),
});

export const adminUpdateUserBodySchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  emailVerified: z.boolean().optional(),
  userConfiguration: z.object({
    instantEarnOfferLimit: z.number().int().min(0).max(10_000).optional(),
    dailyInstantWithdrawalLimit: z.number().int().min(0).max(100_000_000).optional(),
    maxAffiliateCodes: z.number().int().min(0).max(100).optional(),
  }).optional(),
}).refine(
  (value) => (
    value.username !== undefined
    || value.email !== undefined
    || value.emailVerified !== undefined
    || value.userConfiguration !== undefined
  ),
  { message: 'At least one field is required' },
);

export const adminAdjustBalanceBodySchema = z.object({
  amount: z.number().int()
    .refine(value => value !== 0, { message: 'Amount must be non-zero' })
    .refine(
      value => Math.abs(value) <= 100_000_000,
      { message: 'Amount exceeds the maximum adjustment' },
    ),
});

export const adminBanUserBodySchema = z.object({
  until: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if (!value.until) return;

  const until = new Date(value.until);
  if (Number.isNaN(until.getTime())) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid ban date',
      path: [ 'until' ],
    });

    return;
  }

  if (until.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ban date must be in the future',
      path: [ 'until' ],
    });
  }
});
