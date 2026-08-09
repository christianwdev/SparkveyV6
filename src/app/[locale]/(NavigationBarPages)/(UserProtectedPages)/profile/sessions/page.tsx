import { getTranslations } from 'next-intl/server';
import SessionsPageClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfileSessions' });

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default function ProfileSessionsPage() {
  return <SessionsPageClient />;
}
