// Utils
import { canUseDom } from '@utils/dom';

export type ErrorReportSource =
  | 'error-boundary'
  | 'global-error'
  | 'react-query'
  | 'isolate-boundary';

export type AppError = Error & {
  digest?: string,
};

export type ErrorReportContext = {
  source: ErrorReportSource,
  digest?: string,
  queryKey?: string,
  pathname?: string,
};

function createReferenceId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID instanceof Function) {
    return randomUUID.call(globalThis.crypto).replace(/-/g, '').slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function getErrorReferenceId(error: AppError): string {
  if (error.digest) return error.digest;

  return createReferenceId();
}

/**
 * Log a structured client/SSR error for support + analytics.
 * Returns a short reference id safe to show in the UI.
 */
export function reportError(error: AppError, context: ErrorReportContext): string {
  const referenceId = context.digest || getErrorReferenceId(error);

  const payload = {
    referenceId,
    source: context.source,
    name: error.name,
    message: error.message,
    digest: context.digest,
    queryKey: context.queryKey,
    pathname: context.pathname
      ?? (canUseDom() ? window.location.pathname : undefined),
    href: canUseDom() ? window.location.href : undefined,
    stack: error.stack,
    ts: new Date().toISOString(),
  };

  console.error('[sparkvey:error]', payload);

  const gtag = canUseDom() ? window.gtag : undefined;
  if (gtag instanceof Function) {
    gtag('event', 'exception', {
      description: `${context.source}:${referenceId}:${error.message}`,
      fatal: context.source !== 'react-query',
    });
  }

  return referenceId;
}
