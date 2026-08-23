'use client';

import { use } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Resolve SSR data from the persistent QueryClient when possible.
 * A new RSC promise is created on every navigation — `use()`ing it would
 * resuspend even when TanStack already has the query.
 *
 * `null` is a real cached value (e.g. no active announcement). Only
 * `undefined` means the query has never been stored.
 */
export function useCachedQuerySeed<T>(
  {
    queryKey,
    promise,
  }: {
    queryKey: QueryKey,
    promise: Promise<T>,
  },
): T {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<T>(queryKey);

  if (cached !== undefined) return cached;

  return use(promise);
}
