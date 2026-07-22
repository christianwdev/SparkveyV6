import { getTranslations } from 'next-intl/server';
import { getEarningsHistory } from '@utils/profile';
import { serverRequest } from '@utils/serverRequest';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';
import EarningsPageClient from './page.client';

export async function generateMetadata() {
  const t = await getTranslations('ProfileActivityMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ProfileEarningsPage() {
  const initialEarnings = await getEarningsHistory({
    request: serverRequest,
    page: 1,
    type: 'offer',
  });

  return (
    <EarningsPageClient
      initialEarnings={(initialEarnings as InternalOfferEarning[] | null)}
    />
  );
}
