'use client';

import { Suspense, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';

// Utils
import { getScope } from '@utils/scope';
import { login } from '@utils/auth';
import { clearStoredAuthRedirect, storeAuthRedirectPath } from '@utils/authRedirect';
import { resolveReferralCode } from '@utils/referral';
import { getEmailIssue, getLoginPasswordIssue } from 'schemas/auth';

// Hooks
import { useAuthRedirectPath } from '@hooks/useAuthRedirectPath';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

import styles from './page.module.scss';

function LoginPageContent() {
  const t = useTranslations('LoginPage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectPath = useAuthRedirectPath();
  const { setUser } = useUser();

  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ emailError, setEmailError ] = useState<string | undefined>();
  const [ passwordError, setPasswordError ] = useState<string | undefined>();
  const [ authError, setAuthError ] = useState<string | null>(null);
  const [ pending, setPending ] = useState(false);
  const [ submitted, setSubmitted ] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const accountDeleted = searchParams.get('accountDeleted');
  const emailChange = searchParams.get('emailChange');
  const passwordReset = searchParams.get('passwordReset');
  const oauthError = searchParams.get('error');

  let banner: { tone: 'positive' | 'negative', message: string } | null = null;

  if (accountDeleted === 'success') {
    banner = { tone: 'positive', message: t('banners.accountDeletedSuccess') };
  } else if (accountDeleted === 'invalid') {
    banner = { tone: 'negative', message: t('banners.accountDeletedInvalid') };
  } else if (accountDeleted === 'error') {
    banner = { tone: 'negative', message: t('banners.accountDeletedError') };
  } else if (emailChange === 'success') {
    banner = { tone: 'positive', message: t('banners.emailChangeSuccess') };
  } else if (passwordReset === 'success') {
    banner = { tone: 'positive', message: t('banners.passwordResetSuccess') };
  } else if (oauthError) {
    banner = { tone: 'negative', message: t('errors.googleSignInFailed') };
  }

  function emailMessage(value: string) {
    const issue = getEmailIssue(value);
    if (issue === 'required') return t('errors.emailRequired');
    if (issue === 'invalid') return t('errors.emailInvalid');

    return undefined;
  }

  function passwordMessage(value: string) {
    const issue = getLoginPasswordIssue(value);
    if (issue === 'required') return t('errors.passwordRequired');
    if (issue === 'invalid') return t('errors.passwordInvalid');

    return undefined;
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setSubmitted(true);

    const nextEmailError = emailMessage(email);
    const nextPasswordError = passwordMessage(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      (nextEmailError ? emailInputRef.current : passwordInputRef.current)?.focus();

      return;
    }

    setAuthError(null);
    setPending(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      if (!response?.success || !response.data) {
        setAuthError(response?.message || t('errors.genericTryAgain'));
        setPending(false);

        return;
      }

      setUser(response.data);
      clearStoredAuthRedirect();
      router.push(redirectPath);
    } catch {
      setAuthError(t('errors.genericTryAgain'));
      setPending(false);
    }
  }

  function loginWithGoogle() {
    if (pending) return;

    clearStoredAuthRedirect();
    const params = new URLSearchParams({ redirect: redirectPath });
    const referral = resolveReferralCode(searchParams.get('ref'));
    if (referral) params.set('ref', referral);

    window.location.href = `${getScope()}/auth/google/login?${params.toString()}`;
  }

  return (
    <div className={styles.loginPage}>
      <h1>{t('title')}</h1>
      <p className={styles.disclaimer}>
        {t.rich('disclaimer', {
          terms: chunks => <Link href="/terms-of-service">{chunks}</Link>,
          privacy: chunks => <Link href="/privacy-policy">{chunks}</Link>,
        })}
      </p>

      {banner ? (
        <p className={styles.banner} data-tone={banner.tone}>
          {banner.message}
        </p>
      ) : null}

      <form className={styles.form} onSubmit={submitLogin} noValidate>
        <TextField
          ref={emailInputRef}
          id="login-email"
          name="email"
          label={t('emailAddress')}
          type="email"
          value={email}
          onChange={event => {
            const value = event.target.value;
            setEmail(value);
            setEmailError(emailMessage(value));
            setAuthError(null);
          }}
          onBlur={event => setEmailError(emailMessage(event.target.value))}
          disabled={pending}
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          error={emailError}
          forceShowError={submitted}
        />

        <TextField
          ref={passwordInputRef}
          id="login-password"
          name="password"
          label={t('password')}
          type="password"
          value={password}
          onChange={event => {
            const value = event.target.value;
            setPassword(value);
            setPasswordError(passwordMessage(value));
            setAuthError(null);
          }}
          onBlur={event => setPasswordError(passwordMessage(event.target.value))}
          disabled={pending}
          autoComplete="current-password"
          error={passwordError ?? authError ?? undefined}
          forceShowError={submitted || Boolean(authError)}
        />

        <Link href="/forgot-password" className={styles.forgotPassword}>
          {t('forgotPassword')}
        </Link>

        <PrimaryButton type="submit" disabled={pending}>
          {pending ? t('signingIn') : t('signIn')}
        </PrimaryButton>
      </form>

      <div className={styles.orDivider}>
        <span>{t('or')}</span>
      </div>

      <button
        type="button"
        className={styles.googleButton}
        disabled={pending}
        onClick={loginWithGoogle}
      >
        <Image
          src="/img/logos/google.svg"
          alt={t('google')}
          width={22}
          height={22}
        />
        {t('signInWithGoogle')}
      </button>

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

function LoginPageFallback() {
  return <div className={styles.loginPage} />;
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
