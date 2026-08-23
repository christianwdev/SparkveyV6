'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useUser } from '@contexts/UserProvider';
import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';

import styles from './EmailVerificationBanner.module.scss';

const BANNER_HEIGHT = '45px';
const RESEND_COOLDOWN_MS = 120000; // 2 minutes

export default function EmailVerificationBanner() {
  const t = useTranslations('Navbar');
  const { user } = useUser();
  const [ resendState, setResendState ] = useState<'idle' | 'loading' | 'sent'>('idle');
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const verified = !!user?.emailInformation.verifiedAt;
  const email = user?.emailInformation.emailAddress;

  if (!user || verified || !email) return null;

  async function resendEmail() {
    if (resendState === 'loading' || resendState === 'sent') return;

    setResendState('loading');

    try {
      const { data } = await clientRequest<APIResponse<unknown>>({
        url: `${getScope()}/auth/email/verify/resend`,
        method: 'POST',
        credentials: 'include',
      });

      if (!data.success) {
        if (data.code === 'tooSoon') toast.error(t('toasts.tooSoon'));
        else if (data.code === 'alreadyVerified') toast.error(t('toasts.alreadyVerified'));
        else toast.error(t('toasts.resendError'));

        setResendState('idle');

        return;
      }

      toast.success(t('toasts.resendSuccess'));
      setResendState('sent');

      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        setResendState('idle');
        resetTimeoutRef.current = null;
      }, RESEND_COOLDOWN_MS);
    } catch (error) {
      console.error(error);
      toast.error(t('toasts.resendError'));
      setResendState('idle');
    }
  }

  const buttonLabel = resendState === 'loading'
    ? t('emailVerification.sending')
    : resendState === 'sent'
      ? t('emailVerification.sent')
      : t('emailVerification.resend');

  return (
    <div
      className={styles.emailVerificationBanner}
      role="status"
      aria-label={t('emailVerification.welcome')}
    >
      <style>{`:root { --announcement-banner-height: ${BANNER_HEIGHT}; }`}</style>
      <div className={styles.content}>
        <p>{t('emailVerification.welcome')}</p>
        <button
          type="button"
          onClick={() => {
            resendEmail().catch(error => {
              console.error(error);
            });
          }}
          disabled={resendState !== 'idle'}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
