import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { browseOffers } from '@utils/offers';
import type { AppLocale } from '@i18n/routing';
import { Suspense } from 'react';
import { tasksSearchParamsCache } from './searchParams';
import TasksPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('TasksMetadata');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/tasks`,
    },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('TasksPage');
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale: locale as AppLocale });
  }

  const { search, sort, categories, providers } = tasksSearchParamsCache.parse(await searchParams);

  const initialOffers = await browseOffers({
    request: serverRequest,
    limit: 28,
    skip: 0,
    sort,
    search: search || undefined,
    categories,
    providers,
  }) ?? [];

  return (
    <main className={styles.tasksPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <Suspense>
        <TasksPageClient
          initialOffers={initialOffers}
          initialFilters={{ search, sort, categories, providers }}
        />
      </Suspense>
    </main>
  );
}
