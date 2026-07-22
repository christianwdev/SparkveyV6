'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@i18n/navigation';
import { confirmAccountDeletion } from '@utils/auth';
import styles from '../confirmAction.module.scss';

function ConfirmAccountDeletionContent() {
  const t = useTranslations('ConfirmAccountDeletion');
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
          className={`${styles.button} ${styles.danger}`}
          disabled={!code || pending}
          onClick={() => {
            if (!code) {
              setError(t('errors.missingCode'));

              return;
            }

            setPending(true);
            setError(null);

            void confirmAccountDeletion({ code }).then((response) => {
              if (!response?.success) {
                setError(response?.message || t('errors.failed'));
                setPending(false);

                return;
              }

              router.replace('/login?accountDeleted=success');
            }).catch(() => {
              setError(t('errors.failed'));
              setPending(false);
            });
          }}
        >
          {pending ? t('actions.deleting') : t('actions.confirm')}
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

export default function ConfirmAccountDeletionClient() {
  return (
    <Suspense fallback={null}>
      <ConfirmAccountDeletionContent />
    </Suspense>
  );
}
