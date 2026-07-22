export type ErrorReportSource =
  | 'error-boundary'
  | 'global-error'
  | 'react-query'
  | (string & {});

export type ErrorReportContext = {
  source: ErrorReportSource;
  digest?: string;
  queryKey?: unknown;
  pathname?: string;
};

function createReferenceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function getErrorReferenceId(error: unknown): string {
  if (
    error
    && typeof error === 'object'
    && 'digest' in error
    && typeof (error as { digest?: unknown }).digest === 'string'
  ) {
    return (error as { digest: string }).digest;
  }

  return createReferenceId();
}

/**
 * Log a structured client/SSR error for support + analytics.
 * Returns a short reference id safe to show in the UI.
 */
export function reportError(error: unknown, context: ErrorReportContext): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const referenceId = context.digest || getErrorReferenceId(error);

  const payload = {
    referenceId,
    source: context.source,
    name: err.name,
    message: err.message,
    digest: context.digest,
    queryKey: context.queryKey,
    pathname: context.pathname
      ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    href: typeof window !== 'undefined' ? window.location.href : undefined,
    stack: err.stack,
    ts: new Date().toISOString(),
  };

  console.error('[sparkvey:error]', payload);

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'exception', {
      description: `${context.source}:${referenceId}:${err.message}`,
      fatal: context.source !== 'react-query',
    });
  }

  return referenceId;
}
