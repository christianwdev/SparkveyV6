'use client';

import { Suspense, useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';

// Utils
import { requestPasswordReset, resetPassword } from '@utils/auth';
import { storeAuthRedirectPath } from '@utils/authRedirect';
import { isValidEmail, isValidNewPassword } from 'schemas/auth';

// Hooks
import { useAuthRedirectPath } from '@hooks/useAuthRedirectPath';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

import styles from './page.module.scss';

function ForgotPasswordPageContent() {
  const t = useTranslations('ForgotPasswordPage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectPath = useAuthRedirectPath();
  const code = searchParams.get('code')?.trim() ?? '';
  const isResetMode = code.length > 0;

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');
  const [ pending, setPending ] = useState(false);
  const [ status, setStatus ] = useState<{ tone: 'positive' | 'negative', message: string } | null>(null);
  const [ emailError, setEmailError ] = useState<string | undefined>();
  const [ passwordError, setPasswordError ] = useState<string | undefined>();
  const [ confirmPasswordError, setConfirmPasswordError ] = useState<string | undefined>();
  const [ emailDirty, setEmailDirty ] = useState(false);
  const [ passwordDirty, setPasswordDirty ] = useState(false);
  const [ confirmDirty, setConfirmDirty ] = useState(false);
  const [ emailRevealed, setEmailRevealed ] = useState(false);
  const [ passwordRevealed, setPasswordRevealed ] = useState(false);
  const [ confirmRevealed, setConfirmRevealed ] = useState(false);

  function validateEmail(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return t('errors.emailRequired');
    if (!isValidEmail(trimmed)) return t('errors.emailInvalid');

    return undefined;
  }

  function validatePassword(value: string) {
    if (!value) return t('errors.passwordRequired');
    if (!isValidNewPassword(value)) return t('errors.passwordInvalid');

    return undefined;
  }

  function validateConfirmPassword(passwordValue: string, confirmValue: string) {
    if (!confirmValue) return t('errors.confirmPasswordRequired');
    if (confirmValue !== passwordValue) return t('errors.confirmPasswordMismatch');

    return undefined;
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nextEmailError = validateEmail(email);
    setEmailRevealed(true);
    setEmailError(nextEmailError);

    if (nextEmailError) {
      setStatus(null);

      return;
    }

    setPending(true);
    setStatus(null);

    try {
      const response = await requestPasswordReset({ email: email.trim() });

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
    } catch {
      setStatus({ tone: 'negative', message: t('errors.genericTryAgain') });
      setPending(false);
    }
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(password, confirmPassword);

    setPasswordRevealed(true);
    setConfirmRevealed(true);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmError);

    if (nextPasswordError || nextConfirmError) {
      setStatus(null);

      return;
    }

    setPending(true);
    setStatus(null);

    try {
      const response = await resetPassword({ code, password });

      if (!response?.success) {
        setStatus({
          tone: 'negative',
          message: response?.message || t('errors.genericTryAgain'),
        });
        setPending(false);

        return;
      }

      router.replace('/login?passwordReset=success');
    } catch {
      setStatus({ tone: 'negative', message: t('errors.genericTryAgain') });
      setPending(false);
    }
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setPassword(value);
    if (value !== '') setPasswordDirty(true);
    if (passwordRevealed) setPasswordError(validatePassword(value));
    if (confirmRevealed) {
      setConfirmPasswordError(validateConfirmPassword(value, confirmPassword));
    }
    if (status?.tone === 'negative') setStatus(null);
  }

  function handleConfirmChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setConfirmPassword(value);
    if (value !== '') setConfirmDirty(true);
    if (confirmRevealed) {
      setConfirmPasswordError(validateConfirmPassword(password, value));
    }
    if (status?.tone === 'negative') setStatus(null);
  }

  function handleEmailBlur(event: FocusEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (!emailDirty && value === '') return;
    setEmailDirty(true);
    setEmailRevealed(true);
    setEmailError(validateEmail(value));
  }

  function handlePasswordBlur(event: FocusEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (!passwordDirty && value === '') return;
    setPasswordDirty(true);
    setPasswordRevealed(true);
    setPasswordError(validatePassword(value));
  }

  function handleConfirmBlur(event: FocusEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (!confirmDirty && value === '') return;
    setConfirmDirty(true);
    setConfirmRevealed(true);
    setConfirmPasswordError(validateConfirmPassword(password, value));
  }

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
        <form className={styles.form} onSubmit={submitReset} noValidate>
          <TextField
            id="forgot-new-password"
            label={t('newPassword')}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            disabled={pending}
            autoComplete="new-password"
            error={passwordError}
          />

          <TextField
            id="forgot-confirm-password"
            label={t('confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={handleConfirmChange}
            onBlur={handleConfirmBlur}
            disabled={pending}
            autoComplete="new-password"
            error={confirmPasswordError}
          />

          <PrimaryButton type="submit" disabled={pending}>
            {pending ? t('resetting') : t('resetPassword')}
          </PrimaryButton>
        </form>
      ) : (
        <form className={styles.form} onSubmit={submitRequest} noValidate>
          <TextField
            id="forgot-email"
            label={t('emailAddress')}
            type="email"
            value={email}
            onChange={event => {
              const value = event.target.value;
              setEmail(value);
              if (value !== '') setEmailDirty(true);
              if (emailRevealed) setEmailError(validateEmail(value));
              if (status?.tone === 'negative') setStatus(null);
            }}
            onBlur={handleEmailBlur}
            disabled={pending}
            autoComplete="email"
            error={emailError}
          />

          <PrimaryButton type="submit" disabled={pending}>
            {pending ? t('sending') : t('sendResetEmail')}
          </PrimaryButton>
        </form>
      )}

      <p className={styles.footerLinks}>
        {t('rememberPassword')}{' '}
        <Link
          href="/login"
          onClick={() => {
            if (redirectPath !== '/') storeAuthRedirectPath(redirectPath);
          }}
        >
          {t('signIn')}
        </Link>
      </p>

      <p className={styles.footerLinks}>
        {t('notAMember')}{' '}
        <Link
          href="/signup"
          onClick={() => {
            if (redirectPath !== '/') storeAuthRedirectPath(redirectPath);
          }}
        >
          {t('joinToday')}
        </Link>
      </p>
    </div>
  );
}

function ForgotPasswordPageFallback() {
  return <div className={styles.forgotPasswordPage} />;
}

export default function ForgotPasswordPageClient() {
  return (
    <Suspense fallback={<ForgotPasswordPageFallback />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
