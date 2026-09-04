import { isValidReferralCode } from 'schemas/auth';

export const REF_STORAGE_KEY = 'refCode';

export function persistReferralCode(code: string): void {
  const trimmed = code.trim();
  if (!isValidReferralCode(trimmed) || typeof window === 'undefined') return;

  try {
    localStorage.setItem(REF_STORAGE_KEY, trimmed);
  } catch {
    // private mode / quota
  }
}

export function persistReferralCodeFromSearch(
  searchParams: { get: (key: string) => string | null },
): void {
  const fromUrl = searchParams.get('ref')?.trim() ?? '';
  if (fromUrl) persistReferralCode(fromUrl);
}

export function getStoredReferralCode(): string {
  if (typeof window === 'undefined') return '';

  try {
    const stored = localStorage.getItem(REF_STORAGE_KEY)?.trim() ?? '';
    if (stored && isValidReferralCode(stored)) return stored;
  } catch {
    // ignore
  }

  return '';
}

/** Prefer a valid URL `ref`, then localStorage. Safe to call before persist effects run. */
export function resolveReferralCode(fromUrl?: string | null): string {
  const trimmed = fromUrl?.trim() ?? '';
  if (trimmed && isValidReferralCode(trimmed)) return trimmed;

  return getStoredReferralCode();
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}
