import { getTranslations } from 'next-intl/server';
import { getRedemptionsHistory } from '@utils/profile';
import { serverRequest } from '@utils/serverRequest';
import RedemptionsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileRewardsMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ProfileRedemptionsPage() {
  const initialRedemptions = await getRedemptionsHistory({
    request: serverRequest,
    page: 1,
  });

  return <RedemptionsPageClient initialRedemptions={initialRedemptions} />;
}
