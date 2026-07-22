import { getScope } from '@utils/scope';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) return undefined;

  return decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1));
}

export async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfTokenFromCookie();
  if (existing) return existing;

  try {
    const response = await fetch(`${getScope()}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) return null;

    return getCsrfTokenFromCookie() ?? null;
  } catch {
    return null;
  }
}
