import { getTranslations } from 'next-intl/server';
import AuthenticationLayout from '../_components/AuthenticationLayout/AuthenticationLayout';
import SignupPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('SignupMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function SignupPage() {
  return (
    <AuthenticationLayout>
      <SignupPageClient />
    </AuthenticationLayout>
  );
}
