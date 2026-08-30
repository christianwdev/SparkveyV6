import { getScope } from '@utils/scope';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

type CsrfIssueResponse = {
  success?: boolean,
  data?: {
    csrfToken?: string,
  },
};

export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  let token: string | undefined;

  for (const row of document.cookie.split('; ')) {
    if (!row.startsWith(`${CSRF_COOKIE_NAME}=`)) continue;

    token = decodeURIComponent(row.slice(CSRF_COOKIE_NAME.length + 1));
  }

  return token;
}

export async function ensureCsrfToken(
  {
    refresh = false,
  }: {
    refresh?: boolean,
  } = {},
): Promise<string | null> {
  if (!refresh) {
    const existing = getCsrfTokenFromCookie();
    if (existing) return existing;
  }

  try {
    const response = await fetch(`${getScope()}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) return null;

    const payload = await response.json() as CsrfIssueResponse;
    if (payload.data?.csrfToken) return payload.data.csrfToken;

    return getCsrfTokenFromCookie() ?? null;
  } catch {
    return null;
  }
}
