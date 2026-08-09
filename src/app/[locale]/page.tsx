import { getTranslations } from 'next-intl/server';
import LandingPage from '@components/LandingPage/LandingPage';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import HomePage from '@components/HomePage/HomePage';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomeMetadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
    },
  };
}

export default async function Page() {
  const user = await getUser({ request: serverRequest });

  if (!user) {
    return <LandingPage />;
  }

  return <HomePage />;
}
