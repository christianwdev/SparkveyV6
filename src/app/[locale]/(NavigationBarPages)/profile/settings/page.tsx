import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import SettingsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileSettingsLayoutMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageClient />
    </Suspense>
  );
}
