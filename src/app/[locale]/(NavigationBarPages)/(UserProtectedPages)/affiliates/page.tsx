import { getTranslations } from 'next-intl/server';
import { fetchAffiliateData } from '@utils/affiliates';
import { serverRequest } from '@utils/serverRequest';
import AffiliatesPageClient from './page.client';
import styles from './page.module.scss';

type PageProps = {
  params: Promise<{ locale: string }>,
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AffiliatesMetadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/affiliates`,
    },
  };
}

export default async function Page() {
  const t = await getTranslations('AffiliatesPage');
  const initialData = await fetchAffiliateData({ request: serverRequest });

  return (
    <main className={styles.affiliatesPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <AffiliatesPageClient initialData={initialData} />
    </main>
  );
}
