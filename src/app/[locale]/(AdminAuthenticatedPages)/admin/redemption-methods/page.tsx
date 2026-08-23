import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { adminRedemptionMethodsSearchParamsCache } from '@utils/adminRedemptionMethodsSearchParams';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminRedemptionMethodsListQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import type { AdminRedemptionMethodStatus } from 'types/AdminRedemptionMethod';
import AdminRedemptionMethodsClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('redemptionMethodsTitle'),
    description: t('redemptionMethodsDescription'),
    alternates: {
      canonical: `/${locale}/admin/redemption-methods`,
    },
  };
}

export default async function AdminRedemptionMethodsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_OFFERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const filters = await adminRedemptionMethodsSearchParamsCache.parse(searchParams);
  const status = filters.status === 'all' ? undefined : filters.status as AdminRedemptionMethodStatus;
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminRedemptionMethodsListQueryOptions({
    request: serverRequest,
    status,
    searchBy: filters.searchBy,
    search: filters.search,
    sortDirection: filters.sortDirection,
    page: filters.page,
  }));

  return (
    <main className={styles.redemptionMethodsPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminRedemptionMethodsClient />
      </HydrationBoundary>
    </main>
  );
}
