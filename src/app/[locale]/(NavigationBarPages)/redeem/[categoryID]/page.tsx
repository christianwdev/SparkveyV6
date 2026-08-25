import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import {
  getCategoryRewards,
  isRedeemCategoryID,
} from '@utils/rewards';
import type { AppLocale } from '@i18n/routing';
import RedeemCategoryPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: AppLocale, categoryID: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale, categoryID } = await params;

  if (!isRedeemCategoryID(categoryID)) {
    return {
      title: 'Sparkvey',
    };
  }

  const t = await getTranslations('RewardMetadata');
  const section = t(`sections.${categoryID}.title`);

  return {
    title: t('sectionTitle', { sectionName: section }),
    description: t(`sections.${categoryID}.description`),
    alternates: {
      canonical: `/${locale}/redeem/${categoryID}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale, categoryID } = await params;
  const t = await getTranslations('RedeemPage');
  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect({ href: FrontendRedirectPaths.login, locale });
  }

  if (!isRedeemCategoryID(categoryID)) {
    notFound();
  }

  const initialPage = await getCategoryRewards({
    request: serverRequest,
    categoryID,
    skip: 0,
  });

  return (
    <main className={styles.redeemCategoryPage}>
      <div className={styles.header}>
        <h1>{t(`sections.${categoryID}.title`)}</h1>
        <p>{t(`sections.${categoryID}.description`)}</p>
      </div>

      <RedeemCategoryPageClient
        categoryID={categoryID}
        initialPage={initialPage === null ? undefined : initialPage}
      />
    </main>
  );
}
