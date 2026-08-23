import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import {
  getCategoryRewards,
  isRedeemCategoryID,
  type RedeemCategoryID,
} from '@utils/rewards';
import type { AppLocale } from '@i18n/routing';
import RedeemCategoryPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string, categoryID: string }>;
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
    redirect({ href: FrontendRedirectPaths.login, locale: locale as AppLocale });
  }

  if (!isRedeemCategoryID(categoryID)) {
    notFound();
  }

  const typedCategoryID = categoryID as RedeemCategoryID;
  const categoryPromise = getCategoryRewards({
    request: serverRequest,
    categoryID: typedCategoryID,
  });

  return (
    <main className={styles.redeemCategoryPage}>
      <div className={styles.header}>
        <h1>{t(`sections.${typedCategoryID}.title`)}</h1>
        <p>{t(`sections.${typedCategoryID}.description`)}</p>
      </div>

      <RedeemCategoryPageClient
        key={typedCategoryID}
        categoryID={typedCategoryID}
        categoryPromise={categoryPromise}
      />
    </main>
  );
}
