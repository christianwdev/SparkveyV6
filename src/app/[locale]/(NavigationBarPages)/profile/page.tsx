import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import type { AppLocale } from '@i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;

  redirect({
    href: FrontendRedirectPaths.profileSettings,
    locale: locale as AppLocale,
  });
}
