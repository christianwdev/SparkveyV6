'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@i18n/navigation';
import { confirmEmailChange } from '@utils/auth';
import styles from '../confirmAction.module.scss';

function ConfirmEmailChangeContent() {
  const t = useTranslations('ConfirmEmailChange');
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code') ?? '';

  const [ pending, setPending ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  return (
    <div className={styles.confirmCard}>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={!code || pending}
          onClick={() => {
            if (!code) {
              setError(t('errors.missingCode'));

              return;
            }

            setPending(true);
            setError(null);

            void confirmEmailChange({ code }).then((response) => {
              if (!response?.success) {
                setError(response?.message || t('errors.failed'));
                setPending(false);

                return;
              }

              router.replace('/login?emailChange=success');
            }).catch(() => {
              setError(t('errors.failed'));
              setPending(false);
            });
          }}
        >
          {pending ? t('actions.confirming') : t('actions.confirm')}
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          disabled={pending}
          onClick={() => router.push('/login')}
        >
          {t('actions.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function ConfirmEmailChangeClient() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
