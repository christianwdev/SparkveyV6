import { getTranslations } from 'next-intl/server';
import { getEarningsHistory } from '@utils/profile';
import { serverRequest } from '@utils/serverRequest';
import EarningsPageClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfileActivityMetadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileEarningsPage() {
  const initialEarningsPromise = getEarningsHistory({
    request: serverRequest,
    page: 1,
    type: 'offer',
  });

  return <EarningsPageClient initialEarningsPromise={initialEarningsPromise} />;
}
