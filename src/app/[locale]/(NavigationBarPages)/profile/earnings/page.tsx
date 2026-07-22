import { getTranslations } from 'next-intl/server';
import EarningsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileActivityMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileEarningsPage() {
  return <EarningsPageClient />;
}
