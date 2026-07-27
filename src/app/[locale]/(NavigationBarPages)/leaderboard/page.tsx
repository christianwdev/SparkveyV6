import { getTranslations } from 'next-intl/server';
import { serverRequest } from '@utils/serverRequest';
import { getMonthlyLeaderboard } from '@utils/leaderboard';
import LeaderboardPageClient from './page.client';

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

export default async function LeaderboardPage() {
  const initialLeaderboard = await getMonthlyLeaderboard({ request: serverRequest });

  return (
    <LeaderboardPageClient initialLeaderboard={initialLeaderboard} />
  );
}
