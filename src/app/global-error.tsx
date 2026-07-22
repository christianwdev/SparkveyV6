'use client';

import ErrorFallback from '@components/ErrorFallback/ErrorFallback';
import './_styles/globals.scss';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <ErrorFallback
          error={error}
          source="global-error"
          onReset={reset}
          variant="global"
        />
      </body>
    </html>
  );
}
