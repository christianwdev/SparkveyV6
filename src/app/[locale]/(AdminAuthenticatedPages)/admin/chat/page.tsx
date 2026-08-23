import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { hasPermissions } from '@utils/admin';
import { serverRequest } from '@utils/serverRequest';
import { getAdminSupportConversations } from '@utils/adminChat';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';
import type { AppLocale } from '@i18n/routing';
import AdminChatPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminMetadata');

  return {
    title: t('chatTitle'),
    description: t('chatDescription'),
    alternates: {
      canonical: `/${locale}/admin/chat`,
    },
  };
}

export default async function AdminChatPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });
  const userPermissions = user?.staffPermissions;

  if (!hasPermissions({ userPermissions, required: StaffPermissions.VIEW_CHAT })) {
    if (hasPermissions({ userPermissions, required: StaffPermissions.VIEW_STATISTICS })) {
      redirect({ href: FrontendRedirectPaths.admin, locale });
    }

    redirect({ href: FrontendRedirectPaths.home, locale });
  }

  const conversations = await getAdminSupportConversations({ request: serverRequest });

  return (
    <main className={styles.chatPage}>
      <AdminChatPageClient conversations={conversations ?? []} />
    </main>
  );
}
