import { createHmac, timingSafeEqual } from 'crypto';
import { readEnv } from './env';

/** Constant-time compare for shared secrets / hashes of equal encoding. */
export function secretsEqual(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;

  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);

  if (providedBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(providedBytes, expectedBytes);
}

function getEmailHashPepper(): string {
  const pepper = readEnv('EMAIL_HASH_PEPPER');

  if (!pepper) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_HASH_PEPPER must be configured in production');
    }

    return 'sparkvey-email-hash-pepper-dev-only';
  }

  return pepper;
}

export function normalizeEmailForHash(email: string): string {
  return email.trim().toLowerCase();
}

/** One-way fingerprint for GDPR erasure + fraud correlation. */
export function hashEmail(email: string): string {
  return createHmac('sha256', getEmailHashPepper())
    .update(normalizeEmailForHash(email))
    .digest('hex');
}
