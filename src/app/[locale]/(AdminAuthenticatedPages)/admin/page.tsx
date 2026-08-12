import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { fetchAdminDashboardStatistics } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminDashboardClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string }>,
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
  const permissions = user?.staffPermissions ?? StaffPermissions.NONE;

  if ((permissions & StaffPermissions.VIEW_STATISTICS) !== StaffPermissions.VIEW_STATISTICS) {
    if ((permissions & StaffPermissions.VIEW_USERS) === StaffPermissions.VIEW_USERS) {
      redirect({ href: `${FrontendRedirectPaths.admin}/users`, locale: locale as AppLocale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale: locale as AppLocale });
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
