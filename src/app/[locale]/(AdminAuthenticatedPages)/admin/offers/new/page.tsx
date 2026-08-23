import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminNewOfferClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('offersTitle'),
    description: t('offersDescription'),
    alternates: {
      canonical: `/${locale}/admin/offers/new`,
    },
  };
}

export default async function AdminNewOfferPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_OFFERS })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  if (!hasPermissions({ userPermissions, required: StaffPermissions.MODIFY_OFFERS })) {
    redirect({ href: FrontendRedirectPaths.adminOffers, locale });
  }

  return (
    <main className={styles.newOfferPage}>
      <AdminNewOfferClient />
    </main>
  );
}
