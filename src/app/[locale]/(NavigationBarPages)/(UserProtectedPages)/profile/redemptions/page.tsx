import { getTranslations } from 'next-intl/server';
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
  return <RedemptionsPageClient />;
}
