import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { getFeaturedRewards } from '@utils/rewards';
import type { AppLocale } from '@i18n/routing';
import RedeemPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('RedeemMetadata');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/redeem`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('RedeemPage');
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale });
  }

  const featured = await getFeaturedRewards({ request: serverRequest });

  return (
    <main className={styles.redeemPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('description')}</p>
      </div>

      <RedeemPageClient initialFeatured={featured} />

      <div className={styles.disclaimer}>
        <p>{t('disclaimer.companies')}</p>
        <p>{t('disclaimer.withdrawals')}</p>
      </div>
    </main>
  );
}
