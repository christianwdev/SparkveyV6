import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { adminWithdrawalsSearchParamsCache } from '@utils/adminWithdrawalsSearchParams';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminWithdrawalsListQueryOptions } from '@hooks/adminUserQueries';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminWithdrawalsClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('withdrawalsTitle'),
    description: t('withdrawalsDescription'),
    alternates: {
      canonical: `/${locale}/admin/withdrawals`,
    },
  };
}

export default async function AdminWithdrawalsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminWithdrawals');
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_WITHDRAWALS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const filters = await adminWithdrawalsSearchParamsCache.parse(searchParams);
  const queryClient = createQueryClient();
  await queryClient.prefetchQuery(adminWithdrawalsListQueryOptions({
    request: serverRequest,
    status: filters.status,
    provider: filters.provider === 'all' ? undefined : filters.provider,
    page: filters.page,
  }));

  return (
    <main className={styles.withdrawalsPage}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminWithdrawalsClient />
      </HydrationBoundary>
    </main>
  );
}
