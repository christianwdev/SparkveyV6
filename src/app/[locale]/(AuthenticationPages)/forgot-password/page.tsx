import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import ForgotPasswordPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ForgotPasswordMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ForgotPasswordPage() {
  return (
    <AuthenticationLayout>
      <Suspense fallback={null}>
        <ForgotPasswordPageClient />
      </Suspense>
    </AuthenticationLayout>
  );
}
