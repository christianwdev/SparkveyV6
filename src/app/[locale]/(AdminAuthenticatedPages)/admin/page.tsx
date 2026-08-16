import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { fetchAdminDashboardStatistics, hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminDashboardClient from './page.client';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('dashboardTitle'),
    description: t('dashboardDescription'),
    alternates: {
      canonical: `/${locale}/admin`,
    },
  };
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_USERS })) {
      redirect({ href: FrontendRedirectPaths.adminUsers, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const initialStatistics = await fetchAdminDashboardStatistics({
    request: serverRequest,
    period: 'week',
  });

  return (
    <AdminDashboardClient
      initialStatistics={initialStatistics}
      initialPeriod="week"
      initialLoadFailed={initialStatistics === null}
    />
  );
}
