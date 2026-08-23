import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminOfferQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminOfferClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale, offerID: string }>,
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

export default async function AdminOfferPage({ params }: PageProps) {
  const { locale, offerID } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_OFFERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminOfferQueryOptions({
    request: serverRequest,
    offerID,
  }));

  return (
    <main className={styles.offerPage}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminOfferClient offerID={offerID} />
      </HydrationBoundary>
    </main>
  );
}
