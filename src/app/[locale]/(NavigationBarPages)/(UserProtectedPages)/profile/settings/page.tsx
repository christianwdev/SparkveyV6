import { getTranslations } from 'next-intl/server';
import SettingsPageClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfileSettingsLayoutMetadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileSettingsPage() {
  return <SettingsPageClient />;
}
