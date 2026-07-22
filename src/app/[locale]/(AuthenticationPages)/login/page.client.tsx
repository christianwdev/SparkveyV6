'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import styles from './page.module.scss';

function LoginPageContent() {
  const t = useTranslations('Login');
  const searchParams = useSearchParams();
  const accountDeleted = searchParams.get('accountDeleted');
  const emailChange = searchParams.get('emailChange');
  const passwordReset = searchParams.get('passwordReset');

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
  }

  return (
    <div className={styles.loginPage}>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>

      {banner ? (
        <p className={styles.banner} data-tone={banner.tone}>
          {banner.message}
        </p>
      ) : null}

      <p className={styles.hint}>
        {t('hint')}{' '}
        <Link href="/">{t('backHome')}</Link>
      </p>
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
