import { z } from 'zod';
import { newPasswordSchema } from 'backend/schemas/password';
import { isIso3166Alpha2CountryCode } from 'backend/utils/country';

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: newPasswordSchema,
});

export const changeEmailBodySchema = z.object({
  email: z.string().email().max(254),
  // Required server-side when the account has a password (step-up auth).
  currentPassword: z.string().min(1).optional(),
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

const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// Sparkvey-owned profiler fields (names/city are not forwarded to CPX).
const personNameSchema = z.string().trim().min(1).max(64).regex(/^[^\p{Cc}\p{Cf}]+$/u);
const citySchema = z.string().trim().min(1).max(96).regex(/^[^\p{Cc}\p{Cf}]+$/u);
const zipCodeSchema = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9\s-]{0,31}$/);

export const personalInformationBodySchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  dateOfBirth: isoDateOnlySchema,
  gender: z.enum([ 'male', 'female', 'other' ]),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()).refine(
    isIso3166Alpha2CountryCode,
    { message: 'Invalid country code' },
  ),
  city: citySchema,
  zipCode: zipCodeSchema,
});
