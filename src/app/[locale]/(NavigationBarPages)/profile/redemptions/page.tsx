import { getTranslations } from 'next-intl/server';
import RedemptionsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileRewardsMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileRedemptionsPage() {
  return <RedemptionsPageClient />;
}
