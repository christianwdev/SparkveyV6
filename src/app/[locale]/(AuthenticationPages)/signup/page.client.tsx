'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent, MouseEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';

// Utils
import { getScope } from '@utils/scope';
import { register } from '@utils/auth';
import { clearStoredAuthRedirect, storeAuthRedirectPath } from '@utils/authRedirect';
import {
  isValidEmail,
  isValidNewPassword,
  isValidReferralCode,
  isValidUsername,
} from 'schemas/auth';

// Hooks
import { useAuthRedirectPath } from '@hooks/useAuthRedirectPath';

// Contexts
import { useUser } from '@contexts/UserProvider';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

import styles from './page.module.scss';

type FormValues = {
  email: string,
  password: string,
  confirmPassword: string,
  username: string,
  referralCode: string,
};

type FieldName = keyof FormValues;

type Feedback = {
  tone: 'positive' | 'negative',
  message: string,
};

const INITIAL_VALUES: FormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  referralCode: '',
};

function validateField(
  field: FieldName,
  values: FormValues,
  t: (key: string) => string,
): string | undefined {
  switch (field) {
    case 'email':
    {
      const trimmed = values.email.trim();
      if (!trimmed) return t('errors.emailRequired');
      if (!isValidEmail(trimmed)) return t('errors.emailInvalid');

      return undefined;
    }
    case 'password':
    {
      if (!values.password) return t('errors.passwordRequired');
      if (!isValidNewPassword(values.password)) return t('errors.passwordInvalid');

      return undefined;
    }
    case 'confirmPassword':
    {
      if (!values.confirmPassword) return t('errors.confirmPasswordRequired');
      if (values.confirmPassword !== values.password) return t('errors.confirmPasswordMismatch');

      return undefined;
    }
    case 'username':
    {
      const trimmed = values.username.trim();
      if (!trimmed) return t('errors.usernameRequired');
      if (!isValidUsername(trimmed)) return t('errors.usernameInvalid');

      return undefined;
    }
    case 'referralCode':
    {
      const trimmed = values.referralCode.trim();
      if (!trimmed) return undefined;
      if (!isValidReferralCode(trimmed)) return t('errors.referralInvalid');

      return undefined;
    }
    default:
      return undefined;
  }
}

function SignupPageContent() {
  const t = useTranslations('SignupPage');
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectPath = useAuthRedirectPath();
  const { setUser } = useUser();

  const refFromUrl = searchParams.get('ref')?.trim() ?? '';

  const [ formValues, setFormValues ] = useState<FormValues>(() => ({
    ...INITIAL_VALUES,
    referralCode: refFromUrl,
  }));
  const [ fieldErrors, setFieldErrors ] = useState<Partial<Record<FieldName, string>>>({});
  const [ dirty, setDirty ] = useState<Partial<Record<FieldName, boolean>>>({});
  const [ revealed, setRevealed ] = useState<Partial<Record<FieldName, boolean>>>({});
  const [ feedback, setFeedback ] = useState<Feedback | null>(null);
  const [ pending, setPending ] = useState(false);
  const [ currentStep, setCurrentStep ] = useState<0 | 1>(0);
  const [ hasAttemptedStepOne, setHasAttemptedStepOne ] = useState(false);
  const [ hasSubmitted, setHasSubmitted ] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const referralInputRef = useRef<HTMLInputElement | null>(null);
  const stepTrackRef = useRef<HTMLDivElement | null>(null);

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
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormValues(prev => (
          prev.referralCode ? prev : { ...prev, referralCode: stored }
        ));
      }
    } catch {
      // ignore storage failures
    }
  }, [ refFromUrl ]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const fieldName = name as FieldName;
    const updatedValues = {
      ...formValues,
      [fieldName]: value,
    };

    setFormValues(updatedValues);

    if (value !== '') {
      setDirty(prev => (
        prev[fieldName] ? prev : { ...prev, [fieldName]: true }
      ));
    }

    // Live-update errors only after the field has been revealed (blurred while dirty).
    setFieldErrors(prevErrors => {
      const shouldValidateField = Boolean(revealed[fieldName] || prevErrors[fieldName]);
      const shouldValidateConfirm = Boolean(
        revealed.confirmPassword || prevErrors.confirmPassword,
      );

      if (!shouldValidateField && !shouldValidateConfirm) {
        return prevErrors;
      }

      const updatedErrors = { ...prevErrors };

      if (shouldValidateField) {
        const nextError = validateField(fieldName, updatedValues, t);
        if (nextError) {
          updatedErrors[fieldName] = nextError;
        } else {
          delete updatedErrors[fieldName];
        }
      }

      if (
        shouldValidateConfirm
        && (fieldName === 'password' || fieldName === 'confirmPassword')
      ) {
        const confirmError = validateField('confirmPassword', updatedValues, t);
        if (confirmError) {
          updatedErrors.confirmPassword = confirmError;
        } else {
          delete updatedErrors.confirmPassword;
        }
      }

      return updatedErrors;
    });

    if (feedback) setFeedback(null);
    if (hasSubmitted) setHasSubmitted(false);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const fieldName = event.target.name as FieldName;
    const value = event.target.value;
    const isDirty = Boolean(dirty[fieldName] || value !== '');

    // Pristine empty fields should not error just from focus/blur.
    if (!isDirty) return;

    const updatedValues = {
      ...formValues,
      [fieldName]: value,
    };

    setDirty(prev => (
      prev[fieldName] ? prev : { ...prev, [fieldName]: true }
    ));
    setRevealed(prev => (
      prev[fieldName] ? prev : { ...prev, [fieldName]: true }
    ));

    setFieldErrors(prev => {
      const updatedErrors = { ...prev };
      const nextError = validateField(fieldName, updatedValues, t);

      if (nextError) {
        updatedErrors[fieldName] = nextError;
      } else {
        delete updatedErrors[fieldName];
      }

      return updatedErrors;
    });
  }

  function visibleError(field: FieldName, force: boolean) {
    if (!force && !revealed[field]) return undefined;

    return fieldErrors[field];
  }

  function focusFirstErrorField(errorMap: Partial<Record<FieldName, string>>) {
    const prioritisedFields: FieldName[] = currentStep === 0
      ? [ 'email', 'password', 'confirmPassword' ]
      : [ 'username', 'referralCode', 'email', 'password', 'confirmPassword' ];

    const firstErrorField = prioritisedFields.find(field => errorMap[field]);
    if (!firstErrorField) return;

    switch (firstErrorField) {
      case 'email':
        emailInputRef.current?.focus();
        break;
      case 'password':
        passwordInputRef.current?.focus();
        break;
      case 'confirmPassword':
        confirmPasswordRef.current?.focus();
        break;
      case 'username':
        usernameInputRef.current?.focus();
        break;
      case 'referralCode':
        referralInputRef.current?.focus();
        break;
      default:
        break;
    }
  }

  function continueToStepTwo() {
    const requiredFields: FieldName[] = [ 'email', 'password', 'confirmPassword' ];
    const nextErrors: Partial<Record<FieldName, string>> = {};

    for (const field of requiredFields) {
      const error = validateField(field, formValues, t);
      if (error) nextErrors[field] = error;
    }

    const hasAnyInput = requiredFields.some(field => formValues[field].trim().length > 0);
    const hasErrors = Object.keys(nextErrors).length > 0;

    if (hasErrors) {
      setFieldErrors(prev => ({ ...prev, ...nextErrors }));

      if (hasAnyInput) {
        setHasAttemptedStepOne(true);
        setFeedback({
          tone: 'negative',
          message: t('errors.missingDetails'),
        });
      } else {
        setHasAttemptedStepOne(false);
        setFeedback(null);
      }

      focusFirstErrorField(nextErrors);

      return;
    }

    setHasAttemptedStepOne(false);
    setFieldErrors(prev => {
      const updated = { ...prev };
      for (const field of requiredFields) {
        delete updated[field];
      }

      return updated;
    });
    setFeedback(null);
    setCurrentStep(1);

    stepTrackRef.current?.scrollTo({
      left: stepTrackRef.current.clientWidth,
      behavior: 'smooth',
    });
  }

  function handleContinue(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    continueToStepTwo();
  }

  function handleBack() {
    setCurrentStep(0);
    setHasSubmitted(false);
    setFeedback(null);

    stepTrackRef.current?.scrollTo({
      left: 0,
      behavior: 'smooth',
    });
  }

  async function registerAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    // Enter on step 0 should advance, not submit an incomplete account.
    if (currentStep !== 1) {
      continueToStepTwo();

      return;
    }

    setHasSubmitted(true);

    const allFields: FieldName[] = [
      'email',
      'password',
      'confirmPassword',
      'username',
      'referralCode',
    ];
    const nextErrors: Partial<Record<FieldName, string>> = {};

    for (const field of allFields) {
      const error = validateField(field, formValues, t);
      if (error) nextErrors[field] = error;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...nextErrors }));
      focusFirstErrorField(nextErrors);
      setFeedback({
        tone: 'negative',
        message: t('errors.formHighlighted'),
      });

      return;
    }

    setFieldErrors({});
    setFeedback(null);
    setPending(true);

    const normalizedReferral = formValues.referralCode.trim();

    try {
      const response = await register({
        email: formValues.email.trim(),
        username: formValues.username.trim(),
        password: formValues.password,
        ...(normalizedReferral ? { referralCode: normalizedReferral } : {}),
      });

      if (!response?.success || !response.data) {
        setFeedback({
          tone: 'negative',
          message: response?.message || t('errors.couldNotCreateAccount'),
        });
        setPending(false);

        return;
      }

      setUser(response.data);
      clearStoredAuthRedirect();
      router.push(redirectPath);
    } catch {
      setFeedback({
        tone: 'negative',
        message: t('errors.createAccountFailed'),
      });
      setPending(false);
    }
  }

  function signupWithGoogle() {
    if (pending) return;

    const params = new URLSearchParams({ redirect: redirectPath });
    const normalizedReferral = formValues.referralCode.trim();
    if (normalizedReferral) params.set('ref', normalizedReferral);

    clearStoredAuthRedirect();
    window.location.href = `${getScope()}/auth/google/login?${params.toString()}`;
  }

  const showStepZeroErrors = hasSubmitted || hasAttemptedStepOne;
  const emailError = visibleError('email', showStepZeroErrors);
  const passwordError = visibleError('password', showStepZeroErrors);
  const confirmPasswordError = visibleError('confirmPassword', showStepZeroErrors);
  const usernameError = visibleError('username', hasSubmitted);
  const referralError = visibleError('referralCode', hasSubmitted);

  return (
    <div className={styles.signupPage}>
      <h1>{t('title')}</h1>
      <p className={styles.disclaimer}>
        {t.rich('disclaimer', {
          terms: chunks => <Link href="/terms-of-service">{chunks}</Link>,
          privacy: chunks => <Link href="/privacy-policy">{chunks}</Link>,
        })}
      </p>

      {feedback ? (
        <p className={styles.status} data-tone={feedback.tone}>
          {feedback.message}
        </p>
      ) : null}

      <form className={styles.form} onSubmit={registerAccount} noValidate>
        <div className={styles.stepContainer} ref={stepTrackRef}>
          <div className={styles.stepTrack}>
            <div className={styles.step}>
              <TextField
                ref={emailInputRef}
                id="signup-email"
                name="email"
                label={t('emailAddress')}
                type="email"
                value={formValues.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={pending}
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                tabIndex={currentStep === 0 ? 0 : -1}
                error={emailError}
              />

              <TextField
                ref={passwordInputRef}
                id="signup-password"
                name="password"
                label={t('password')}
                type="password"
                value={formValues.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={pending}
                autoComplete="new-password"
                tabIndex={currentStep === 0 ? 0 : -1}
                error={passwordError}
              />

              <TextField
                ref={confirmPasswordRef}
                id="signup-confirm-password"
                name="confirmPassword"
                label={t('confirmPassword')}
                type="password"
                value={formValues.confirmPassword}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={pending}
                autoComplete="new-password"
                tabIndex={currentStep === 0 ? 0 : -1}
                error={confirmPasswordError}
              />
            </div>

            <div className={styles.step}>
              <TextField
                ref={usernameInputRef}
                id="signup-username"
                name="username"
                label={t('username')}
                type="text"
                value={formValues.username}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={pending}
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                tabIndex={currentStep === 1 ? 0 : -1}
                error={usernameError}
              />

              <TextField
                ref={referralInputRef}
                id="signup-referral"
                name="referralCode"
                label={t('referralCodeOptional')}
                type="text"
                value={formValues.referralCode}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={pending}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                tabIndex={currentStep === 1 ? 0 : -1}
                error={referralError}
              />
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          {currentStep === 1 ? (
            <PrimaryButton
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={pending}
            >
              {t('back')}
            </PrimaryButton>
          ) : null}

          {currentStep === 0 ? (
            <PrimaryButton type="button" onClick={handleContinue}>
              {t('continue')}
            </PrimaryButton>
          ) : (
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? t('creatingAccount') : t('signUp')}
            </PrimaryButton>
          )}
        </div>
      </form>

      <div className={styles.orDivider}>
        <span>{t('or')}</span>
      </div>

      <button
        type="button"
        className={styles.googleButton}
        disabled={pending}
        onClick={signupWithGoogle}
      >
        <Image
          src="/img/logos/google.svg"
          alt={t('google')}
          width={22}
          height={22}
        />
        {t('signUpWithGoogle')}
      </button>

      <p className={styles.footerLinks}>
        {t('alreadyMember')}{' '}
        <Link
          href="/login"
          onClick={() => {
            if (redirectPath !== '/') storeAuthRedirectPath(redirectPath);
          }}
        >
          {t('signInNow')}
        </Link>
      </p>
    </div>
  );
}

function SignupPageFallback() {
  return <div className={styles.signupPage} />;
}

export default function SignupPageClient() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}
