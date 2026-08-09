import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import ProfileLayout from 'app/_components/ProfileLayout/ProfileLayout';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ProfileLayoutMetadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfileRouteLayout({ children }: LayoutProps) {
  return (
    <ProfileLayout>{children}</ProfileLayout>
  );
}
