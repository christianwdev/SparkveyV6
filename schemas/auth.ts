import { z } from 'zod';

export const emailSchema = z.email();

export const newPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/** Login accepts existing passwords; only enforce non-empty minimum length. */
export const loginPasswordSchema = z.string().min(8);

export const usernameSchema = z.string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/);

export const referralCodeSchema = z.string()
  .regex(/^[A-Za-z0-9_-]{1,36}$/);

export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value.trim()).success;
}

export function isValidNewPassword(value: string): boolean {
  return newPasswordSchema.safeParse(value).success;
}

export function isValidLoginPassword(value: string): boolean {
  return loginPasswordSchema.safeParse(value).success;
}

export function isValidUsername(value: string): boolean {
  return usernameSchema.safeParse(value.trim()).success;
}

export function isValidReferralCode(value: string): boolean {
  return referralCodeSchema.safeParse(value.trim()).success;
}

export type EmailIssue = 'required' | 'invalid';
export type PasswordIssue = 'required' | 'invalid';

/** Returns an issue key for i18n mapping, or null when valid. */
export function getEmailIssue(value: string): EmailIssue | null {
  const trimmed = value.trim();
  if (!trimmed) return 'required';
  if (!emailSchema.safeParse(trimmed).success) return 'invalid';

  return null;
}

export function getLoginPasswordIssue(value: string): PasswordIssue | null {
  if (!value) return 'required';
  if (!loginPasswordSchema.safeParse(value).success) return 'invalid';

  return null;
}

export function getNewPasswordIssue(value: string): PasswordIssue | null {
  if (!value) return 'required';
  if (!newPasswordSchema.safeParse(value).success) return 'invalid';

  return null;
}
