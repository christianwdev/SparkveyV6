import { createHmac } from 'crypto';

function getEmailHashPepper(): string {
  const pepper = process.env.EMAIL_HASH_PEPPER;

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
