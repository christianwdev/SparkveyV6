'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Utils
import {
  AUTH_REDIRECT_STORAGE_KEY,
  sanitizeAuthRedirectPath,
} from '@utils/authRedirect';

/**
 * Resolves post-login path from `?redirect=` or sessionStorage.
 * Waits until mount before reading sessionStorage so SSR and hydration match.
 */
export function useAuthRedirectPath(): string {
  const searchParams = useSearchParams();
  const [ fromStorage, setFromStorage ] = useState<string | null>(null);
  const [ storageReady, setStorageReady ] = useState(false);

  const fromQuery = sanitizeAuthRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    const queryPath = sanitizeAuthRedirectPath(searchParams.get('redirect'));

    if (queryPath) {
      try {
        sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
      } catch {
        // ignore
      }

      // eslint-disable-next-line
      setFromStorage(null);
      setStorageReady(true);

      return;
    }

    try {
      const stored = sanitizeAuthRedirectPath(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY));
      setFromStorage(stored);
    } catch {
      setFromStorage(null);
    }
    setStorageReady(true);
  }, [ searchParams ]);

  if (fromQuery) return fromQuery;
  if (!storageReady) return '/';

  return fromStorage ?? '/';
}
