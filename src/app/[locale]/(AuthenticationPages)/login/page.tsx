import { getTranslations } from 'next-intl/server';
import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import LoginPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('LoginMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function LoginPage() {
  return (
    <AuthenticationLayout>
      <LoginPageClient />
    </AuthenticationLayout>
  );
}
