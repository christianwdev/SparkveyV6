'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';

// Utils
import { getScope } from '@utils/scope';
import { register } from '@utils/auth';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

import styles from './page.module.scss';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const REFERRAL_REGEX = /^[A-Za-z0-9]{1,36}$/;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidNewPassword(password: string) {
  return password.length >= 8
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function SignupPageContent() {
  const t = useTranslations('SignupPage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useUser();

  const refFromUrl = searchParams.get('ref')?.trim() ?? '';

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');
  const [ username, setUsername ] = useState('');
  const [ referralCode, setReferralCode ] = useState(refFromUrl);
  const [ pending, setPending ] = useState(false);
  const [ status, setStatus ] = useState<{ tone: 'positive' | 'negative', message: string } | null>(null);

  useEffect(() => {
    if (refFromUrl) {
      try {
        localStorage.setItem('refCode', refFromUrl);
      } catch {
        // ignore storage failures
      }

      return;
    }

    try {
      const stored = localStorage.getItem('refCode');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setReferralCode(stored);
    } catch {
      // ignore storage failures
    }
  }, [ refFromUrl ]);

  return (
    <div className={styles.signupPage}>
      <h1>{t('title')}</h1>
      <p>
        {t.rich('disclaimer', {
          terms: (chunks) => <Link href="/terms-of-service">{chunks}</Link>,
          privacy: (chunks) => <Link href="/privacy-policy">{chunks}</Link>,
        })}
      </p>

      {status ? (
        <p className={styles.status} data-tone={status.tone}>
          {status.message}
        </p>
      ) : null}

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();

          const normalizedEmail = email.trim();
          const normalizedUsername = username.trim();
          const normalizedReferral = referralCode.trim();

          if (!normalizedEmail) {
            setStatus({ tone: 'negative', message: t('errors.emailRequired') });

            return;
          }

          if (!isValidEmail(normalizedEmail)) {
            setStatus({ tone: 'negative', message: t('errors.emailInvalid') });

            return;
          }

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

          if (!normalizedUsername) {
            setStatus({ tone: 'negative', message: t('errors.usernameRequired') });

            return;
          }

          if (!USERNAME_REGEX.test(normalizedUsername)) {
            setStatus({ tone: 'negative', message: t('errors.usernameInvalid') });

            return;
          }

          if (normalizedReferral && !REFERRAL_REGEX.test(normalizedReferral)) {
            setStatus({ tone: 'negative', message: t('errors.referralInvalid') });

            return;
          }

          setPending(true);
          setStatus(null);

          void register({
            email: normalizedEmail,
            username: normalizedUsername,
            password,
            ...(normalizedReferral ? { referralCode: normalizedReferral } : {}),
          }).then((response) => {
            if (!response?.success || !response.data) {
              setStatus({
                tone: 'negative',
                message: response?.message || t('errors.couldNotCreateAccount'),
              });
              setPending(false);

              return;
            }

            setUser(response.data);
            router.push('/');
          }).catch(() => {
            setStatus({ tone: 'negative', message: t('errors.createAccountFailed') });
            setPending(false);
          });
        }}
      >
        <TextField
          id="signup-email"
          label={t('emailAddress')}
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          disabled={pending}
          required
          autoComplete="email"
        />

        <TextField
          id="signup-password"
          label={t('password')}
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          disabled={pending}
          required
          minLength={8}
          autoComplete="new-password"
          hint={t('errors.passwordInvalid')}
        />

        <TextField
          id="signup-confirm-password"
          label={t('confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          disabled={pending}
          required
          minLength={8}
          autoComplete="new-password"
        />

        <TextField
          id="signup-username"
          label={t('username')}
          type="text"
          value={username}
          onChange={event => setUsername(event.target.value)}
          disabled={pending}
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
        />

        <TextField
          id="signup-referral"
          label={t('referralCodeOptional')}
          type="text"
          value={referralCode}
          onChange={event => setReferralCode(event.target.value)}
          disabled={pending}
          minLength={3}
          maxLength={36}
          autoComplete="off"
        />

        <PrimaryButton type="submit" disabled={pending}>
          {pending ? t('creatingAccount') : t('signUp')}
        </PrimaryButton>
      </form>

      <div className={styles.orDivider}>
        <span>{t('or')}</span>
      </div>

      <button
        type="button"
        className={styles.googleButton}
        disabled={pending}
        onClick={() => {
          const params = new URLSearchParams({ redirect: '/' });
          const normalizedReferral = referralCode.trim();
          if (normalizedReferral) params.set('ref', normalizedReferral);

          window.location.href = `${getScope()}/auth/google/login?${params.toString()}`;
        }}
      >
        {t('signUpWithGoogle')}
      </button>

      <p className={styles.footerLinks}>
        {t('alreadyMember')}{' '}
        <Link href="/login">{t('signInNow')}</Link>
      </p>
    </div>
  );
}

export default function SignupPageClient() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
