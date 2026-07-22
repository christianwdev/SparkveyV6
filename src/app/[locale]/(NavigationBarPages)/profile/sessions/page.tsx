import { getTranslations } from 'next-intl/server';
import SessionsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileSessions');

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default function ProfileSessionsPage() {
  return <SessionsPageClient />;
}
