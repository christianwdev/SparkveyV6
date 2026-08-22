import { getTranslations } from 'next-intl/server';
import { getRedemptionsHistory } from '@utils/profile';
import { serverRequest } from '@utils/serverRequest';
import RedemptionsPageClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfileRewardsMetadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileRedemptionsPage() {
  const initialRedemptionsPromise = getRedemptionsHistory({
    request: serverRequest,
    page: 1,
  });

  return <RedemptionsPageClient initialRedemptionsPromise={initialRedemptionsPromise} />;
}
