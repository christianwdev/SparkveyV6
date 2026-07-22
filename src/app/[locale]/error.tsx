'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import ErrorFallback from '@components/ErrorFallback/ErrorFallback';

type LocaleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: LocaleErrorProps) {
  const t = useTranslations('ErrorPage');
  const { reset: resetQueries } = useQueryErrorResetBoundary();

  return (
    <ErrorFallback
      error={error}
      source="error-boundary"
      title={t('title')}
      description={t('description')}
      referenceLabel={t('reference')}
      tryAgainLabel={t('tryAgain')}
      homeLabel={t('home')}
      onReset={() => {
        resetQueries();
        reset();
      }}
    />
  );
}
