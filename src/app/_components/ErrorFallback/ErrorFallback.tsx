'use client';

import { useEffect, useState } from 'react';
import { Link } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import {
  getErrorReferenceId,
  reportError,
  type ErrorReportSource,
} from '@utils/reportError';
import styles from './ErrorFallback.module.scss';

type ErrorFallbackProps = {
  error: unknown;
  source: ErrorReportSource;
  onReset?: () => void;
  showHome?: boolean;
  variant?: 'page' | 'inline' | 'global';
  title?: string;
  description?: string;
  referenceLabel?: string;
  tryAgainLabel?: string;
  homeLabel?: string;
};

const DEFAULTS = {
  title: 'Something went wrong',
  description: 'We hit an unexpected error. Try again, or head home if it keeps happening.',
  referenceLabel: 'Reference',
  tryAgainLabel: 'Try again',
  homeLabel: 'Go home',
} as const;

export default function ErrorFallback({
  error,
  source,
  onReset,
  showHome = true,
  variant = 'page',
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  referenceLabel = DEFAULTS.referenceLabel,
  tryAgainLabel = DEFAULTS.tryAgainLabel,
  homeLabel = DEFAULTS.homeLabel,
}: ErrorFallbackProps) {
  const [ referenceId ] = useState(() => getErrorReferenceId(error));

  useEffect(() => {
    reportError(error, {
      source,
      digest: referenceId,
    });
  }, [ error, source, referenceId ]);

  const content = (
    <div className={styles.fallback} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <p className={styles.reference}>
        {referenceLabel}: {referenceId}
      </p>
      <div className={styles.actions}>
        {onReset && (
          <button type="button" className={styles.primary} onClick={onReset}>
            {tryAgainLabel}
          </button>
        )}
        {showHome && (
          variant === 'global' ? (
            <a href={FrontendRedirectPaths.home} className={styles.secondary}>
              {homeLabel}
            </a>
          ) : (
            <Link href={FrontendRedirectPaths.home} className={styles.secondary}>
              {homeLabel}
            </Link>
          )
        )}
      </div>
    </div>
  );

  if (variant === 'inline') return content;

  return (
    <div className={variant === 'global' ? styles.globalShell : styles.pageShell}>
      {content}
    </div>
  );
}
