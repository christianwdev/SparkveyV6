import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminRedemptionMethodQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminRedemptionMethodClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale, rewardID: string }>,
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

export default async function AdminRedemptionMethodPage({ params }: PageProps) {
  const { locale, rewardID } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_OFFERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminRedemptionMethodQueryOptions({
    request: serverRequest,
    rewardID,
  }));

  return (
    <main className={styles.redemptionMethodPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminRedemptionMethodClient rewardID={rewardID} />
      </HydrationBoundary>
    </main>
  );
}
