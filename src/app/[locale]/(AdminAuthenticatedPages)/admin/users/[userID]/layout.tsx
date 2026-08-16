import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { fetchAdminUser } from '@utils/adminUsers';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import type { ReactNode } from 'react';
import AdminUserLayoutClient from './layout.client';

type LayoutProps = {
  children: ReactNode,
  params: Promise<{ locale: AppLocale, userID: string }>,
};

export async function generateMetadata({ params }: LayoutProps) {
  const { locale, userID } = await params;
  const t = await getTranslations('AdminMetadata');
  const user = await fetchAdminUser({
    request: serverRequest,
    userID,
  });

  return {
    title: t('userTitle', { username: user?.username || userID }),
    description: t('userDescription'),
    alternates: {
      canonical: `/${locale}/admin/users/${userID}`,
    },
  };
}

export default async function AdminUserLayout({ children, params }: LayoutProps) {
  const { locale, userID } = await params;
  const actor = await getUser({ request: serverRequest });
  const userPermissions = actor?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_USERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminUserQueryOptions({
    request: serverRequest,
    userID,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserLayoutClient userID={userID}>
        {children}
      </AdminUserLayoutClient>
    </HydrationBoundary>
  );
}
