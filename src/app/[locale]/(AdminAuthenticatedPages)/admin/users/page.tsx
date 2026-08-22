import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { adminUsersSearchParamsCache } from '@utils/adminUsersSearchParams';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUsersListQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminUsersClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('usersTitle'),
    description: t('usersDescription'),
    alternates: {
      canonical: `/${locale}/admin/users`,
    },
  };
}

export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_USERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const filters = await adminUsersSearchParamsCache.parse(searchParams);
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminUsersListQueryOptions({
    request: serverRequest,
    search: filters.search,
    filterBy: filters.filterBy,
    sort: filters.sort,
    order: filters.order,
    page: filters.page,
  }));

  return (
    <main className={styles.usersPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminUsersClient />
      </HydrationBoundary>
    </main>
  );
}
