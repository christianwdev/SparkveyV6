import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import type { AppLocale } from '@i18n/routing';
import SurveysPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('SurveysMetadata');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/surveys`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('SurveysPage');
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale: locale as AppLocale });
  }

  return (
    <main className={styles.surveysPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('description')}</p>
      </div>

      <SurveysPageClient />
    </main>
  );
}
