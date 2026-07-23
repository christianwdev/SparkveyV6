import { timingSafeEqual } from 'crypto';

/** Constant-time compare for shared secrets / hashes of equal encoding. */
export function secretsEqual(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;

  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);

  if (providedBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(providedBytes, expectedBytes);
}
