'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';
import { requestPasswordReset, resetPassword } from '@utils/auth';
import styles from './page.module.scss';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidNewPassword(password: string) {
  return password.length >= 8
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export default function ForgotPasswordPageClient() {
  const t = useTranslations('ForgotPasswordPage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code')?.trim() ?? '';
  const isResetMode = code.length > 0;

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ status, setStatus ] = useState<{ tone: 'positive' | 'negative', message: string } | null>(null);

  return (
    <div className={styles.forgotPasswordPage}>
      <h1>{t('title')}</h1>
      <p>{isResetMode ? t('resetDescription') : t('description')}</p>

      {status ? (
        <p className={styles.status} data-tone={status.tone}>
          {status.message}
        </p>
      ) : null}

      {isResetMode ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();

            if (!password) {
              setStatus({ tone: 'negative', message: t('errors.passwordRequired') });

              return;
            }

            if (!isValidNewPassword(password)) {
              setStatus({ tone: 'negative', message: t('errors.passwordInvalid') });

              return;
            }

            if (!confirmPassword) {
              setStatus({ tone: 'negative', message: t('errors.confirmPasswordRequired') });

              return;
            }

            if (password !== confirmPassword) {
              setStatus({ tone: 'negative', message: t('errors.confirmPasswordMismatch') });

              return;
            }

            setPending(true);
            setStatus(null);

            void resetPassword({ code, password }).then((response) => {
              if (!response?.success) {
                setStatus({
                  tone: 'negative',
                  message: response?.message || t('errors.genericTryAgain'),
                });
                setPending(false);

                return;
              }

              router.replace('/login?passwordReset=success');
            }).catch(() => {
              setStatus({ tone: 'negative', message: t('errors.genericTryAgain') });
              setPending(false);
            });
          }}
        >
          <div className={styles.field}>
            <label htmlFor="forgot-new-password">{t('newPassword')}</label>
            <input
              id="forgot-new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className={styles.hint}>{t('errors.passwordInvalid')}</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="forgot-confirm-password">{t('confirmPassword')}</label>
            <input
              id="forgot-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={pending}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={pending}>
            {pending ? t('resetting') : t('resetPassword')}
          </button>
        </form>
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();

            const normalizedEmail = email.trim();

            if (!normalizedEmail) {
              setStatus({ tone: 'negative', message: t('errors.emailRequired') });

              return;
            }

            if (!isValidEmail(normalizedEmail)) {
              setStatus({ tone: 'negative', message: t('errors.emailInvalid') });

              return;
            }

            setPending(true);
            setStatus(null);

            void requestPasswordReset({ email: normalizedEmail }).then((response) => {
              if (!response?.success) {
                setStatus({
                  tone: 'negative',
                  message: response?.message || t('errors.genericTryAgain'),
                });
                setPending(false);

                return;
              }

              setStatus({
                tone: 'positive',
                message: response.message || t('emailSent'),
              });
              setPending(false);
            }).catch(() => {
              setStatus({ tone: 'negative', message: t('errors.genericTryAgain') });
              setPending(false);
            });
          }}
        >
          <div className={styles.field}>
            <label htmlFor="forgot-email">{t('emailAddress')}</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className={styles.button} disabled={pending || !email.trim()}>
            {pending ? t('sending') : t('sendResetEmail')}
          </button>
        </form>
      )}

      <p className={styles.footerLinks}>
        {t('rememberPassword')}{' '}
        <Link href="/login">{t('signIn')}</Link>
      </p>

      <p className={styles.footerLinks}>
        {t('notAMember')}{' '}
        <Link href="/signup">{t('joinToday')}</Link>
      </p>
    </div>
  );
}
