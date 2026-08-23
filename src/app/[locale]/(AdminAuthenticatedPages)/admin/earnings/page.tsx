import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { adminEarningsSearchParamsCache } from '@utils/adminEarningsSearchParams';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminEarningsListQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminEarningsClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('earningsTitle'),
    description: t('earningsDescription'),
    alternates: {
      canonical: `/${locale}/admin/earnings`,
    },
  };
}

export default async function AdminEarningsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_EARNINGS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const filters = await adminEarningsSearchParamsCache.parse(searchParams);
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminEarningsListQueryOptions({
    request: serverRequest,
    statuses: [ ...filters.status ],
    searchBy: filters.searchBy,
    search: filters.search,
    page: filters.page,
  }));

  return (
    <main className={styles.earningsPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminEarningsClient />
      </HydrationBoundary>
    </main>
  );
}
