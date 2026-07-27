// Utils
import { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Components
import LeaderboardPageClient from './page.client';

// Types
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';
import { getTranslations } from 'next-intl/server';

type PageProps = {
  params: Promise<{ locale: string }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('LeaderboardMetadata');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/leaderboard`,
    },
  };
}

async function fetchLeaderboard(): Promise<SanitizedLeaderboard | null> {
  try {
    const { data } = await serverRequest<{ success: boolean; data?: SanitizedLeaderboard | null }>({
      url: `${getScope()}/leaderboard/monthly`,
      method: 'GET',
    });

    if (!data || !data.success) return null;

    return data.data ?? null;
  } catch (error) {
    console.error(error);

    return null;
  }
}

export default async function LeaderboardPage() {
  const leaderboard = await fetchLeaderboard();

  return (
    <LeaderboardPageClient
      initialLeaderboard={leaderboard}
    />
  );
}
