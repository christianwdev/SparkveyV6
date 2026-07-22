import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import type { AppLocale } from '@i18n/routing';
import ProfileLayout from 'app/_components/ProfileLayout/ProfileLayout';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations('ProfileLayoutMetadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ProfileRouteLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale: locale as AppLocale });
  }

  return <ProfileLayout>{children}</ProfileLayout>;
}
