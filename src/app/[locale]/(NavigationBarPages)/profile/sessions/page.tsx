import { getTranslations } from 'next-intl/server';
import { getSessions } from '@utils/profile';
import { serverRequest } from '@utils/serverRequest';
import SessionsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileSessions');

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default async function ProfileSessionsPage() {
  const initialSessions = await getSessions({
    request: serverRequest,
  });

  return <SessionsPageClient initialSessions={initialSessions} />;
}
