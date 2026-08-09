import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { fetchAffiliateData } from '@utils/affiliates';
import type { AppLocale } from '@i18n/routing';
import AffiliatesPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AffiliatesMetadata');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/affiliates`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AffiliatesPage');
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale: locale as AppLocale });
  }

  const initialData = await fetchAffiliateData({ request: serverRequest });

  return (
    <main className={styles.affiliatesPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <AffiliatesPageClient initialData={initialData} />
    </main>
  );
}
