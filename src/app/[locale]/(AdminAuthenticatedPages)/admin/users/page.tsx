import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string }>,
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

export default async function AdminUsersPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminUsers');
  const user = await getUser({ request: serverRequest });
  const permissions = user?.staffPermissions ?? StaffPermissions.NONE;

  if ((permissions & StaffPermissions.VIEW_USERS) !== StaffPermissions.VIEW_USERS) {
    if ((permissions & StaffPermissions.VIEW_STATISTICS) === StaffPermissions.VIEW_STATISTICS) {
      redirect({ href: FrontendRedirectPaths.admin, locale: locale as AppLocale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale: locale as AppLocale });
  }

  return (
    <main className={styles.usersPage}>
      <p className={styles.eyebrow}>{t('eyebrow')}</p>
      <p className={styles.subtitle}>{t('subtitle')}</p>
    </main>
  );
}
