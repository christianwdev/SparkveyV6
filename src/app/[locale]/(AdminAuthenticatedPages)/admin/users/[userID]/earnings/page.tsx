import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserEarningsQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminUserEarningsClient from './page.client';

type PageProps = {
  params: Promise<{ locale: AppLocale, userID: string }>,
};

export default async function AdminUserEarningsPage({ params }: PageProps) {
  const { locale, userID } = await params;
  const actor = await getUser({ request: serverRequest });

  if (!hasPermissions({
    userPermissions: actor?.staffPermissions,
    required: StaffPermissions.VIEW_EARNINGS,
  })) {
    redirect({
      href: `${FrontendRedirectPaths.adminUsers}/${userID}`,
      locale,
    });
  }

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminUserEarningsQueryOptions({
    request: serverRequest,
    userID,
    page: 1,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserEarningsClient userID={userID} />
    </HydrationBoundary>
  );
}
