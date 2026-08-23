import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { adminOffersSearchParamsCache } from '@utils/adminOffersSearchParams';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminOffersListQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import type { AdminOfferStatus } from 'types/AdminOffer';
import AdminOffersClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('offersTitle'),
    description: t('offersDescription'),
    alternates: {
      canonical: `/${locale}/admin/offers`,
    },
  };
}

export default async function AdminOffersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_OFFERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const filters = await adminOffersSearchParamsCache.parse(searchParams);
  const status = filters.status === 'all' ? undefined : filters.status as AdminOfferStatus;
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminOffersListQueryOptions({
    request: serverRequest,
    status,
    searchBy: filters.searchBy,
    search: filters.search,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    page: filters.page,
  }));

  return (
    <main className={styles.offersPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminOffersClient />
      </HydrationBoundary>
    </main>
  );
}
