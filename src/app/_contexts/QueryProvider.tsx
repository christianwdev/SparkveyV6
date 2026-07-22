'use client';

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
} from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { reportError } from '@utils/reportError';

type QueryProviderProps = {
  children: ReactNode;
};

export default function QueryProvider({ children }: QueryProviderProps) {
  const [ queryClient ] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportError(error, {
          source: 'react-query',
          queryKey: query.queryKey,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,

        // Bubble failed fetches with no usable data into Next.js error.tsx.
        throwOnError: (_error, query) => query.state.data === undefined,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        {children}
      </QueryErrorResetBoundary>
    </QueryClientProvider>
  );
}
