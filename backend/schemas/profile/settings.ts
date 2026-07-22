import { z } from 'zod';
import { newPasswordSchema } from 'backend/schemas/password';

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: newPasswordSchema,
});

export const changeEmailBodySchema = z.object({
  email: z.string().email().max(254),
});

export const changeUsernameBodySchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
});

export const notificationPreferencesBodySchema = z.object({
  securityAlerts: z.boolean().optional(),
  marketingAlerts: z.boolean().optional(),
  promotionalAlerts: z.boolean().optional(),
  newsletterAlerts: z.boolean().optional(),
}).refine(
  (value) => Object.values(value).some((entry) => entry !== undefined),
  { message: 'At least one preference is required' },
);

export const userPreferencesBodySchema = z.object({
  anonymous: z.boolean().optional(),
  hideStats: z.boolean().optional(),
  colorTheme: z.enum([ 'light', 'dark' ]).optional(),
}).refine(
  (value) => Object.values(value).some((entry) => entry !== undefined),
  { message: 'At least one preference is required' },
);
