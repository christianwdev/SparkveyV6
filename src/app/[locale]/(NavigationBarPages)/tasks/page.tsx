import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { browseOffers, BROWSE_OFFERS_PAGE_SIZE } from '@utils/offers';
import { tasksSearchParamsCache } from '@utils/tasksSearchParams';
import { serverRequest } from '@utils/serverRequest';
import type { AppLocale } from '@i18n/routing';
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

  const filters = await tasksSearchParamsCache.parse(searchParams);
  const initialFilters = {
    search: filters.search,
    sort: filters.sort,
    categories: filters.categories,
    providers: filters.providers,
  };
  const initialOffersPromise = browseOffers({
    request: serverRequest,
    limit: BROWSE_OFFERS_PAGE_SIZE,
    skip: 0,
    sort: initialFilters.sort,
    search: initialFilters.search || undefined,
    categories: initialFilters.categories,
    providers: initialFilters.providers,
  });

  return (
    <main className={styles.tasksPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <TasksPageClient
        initialOffersPromise={initialOffersPromise}
        initialFilters={initialFilters}
      />
    </main>
  );
}
