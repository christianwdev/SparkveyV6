import { canUseDom } from '@utils/dom';

export const AUTH_REDIRECT_STORAGE_KEY = 'sparkveyAuthRedirect';

/** Same-site relative path only; disallows open redirects and auth loops. */
export function sanitizeAuthRedirectPath(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) return null;

  return trimmed;
}

export function buildPathWithSearch(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function storeAuthRedirectPath(path: string): void {
  const sanitized = sanitizeAuthRedirectPath(path);
  if (!sanitized || !canUseDom()) return;

  try {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, sanitized);
  } catch {
    // private mode / quota
  }
}

export function clearStoredAuthRedirect(): void {
  if (!canUseDom()) return;

  try {
    sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
