import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import { getWallEmbed } from '@utils/walls';
import WallPageClient from './page.client';
import styles from './page.module.scss';

type WallPageProps = {
  params: Promise<{ wallID: string }>,
};

export default async function WallPage({ params }: WallPageProps) {
  const { wallID } = await params;
  const normalizedWallID = wallID.toLowerCase();
  const locale = await getLocale();
  const homeHref = `/${locale}`;
  const t = await getTranslations({ locale: 'en', namespace: 'WallItem' });
  const tNotFound = await getTranslations({ locale: 'en', namespace: 'NotFound' });

  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/walls/${wallID}`)}`);
  }

  const embedResult = await getWallEmbed({
    request: serverRequest,
    wallID: normalizedWallID,
  });

  if (!embedResult) {
    return (
      <div className={styles.wallPage}>
        <div className={styles.errorContainer}>
          <p className={styles.wallName}>{normalizedWallID}</p>
          <h1>Something went wrong</h1>
          <p>We could not load this offerwall. Please try again.</p>
          <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
        </div>
      </div>
    );
  }

  if (!embedResult.success) {
    const wallName = normalizedWallID;

    if (embedResult.code === 'banned') {
      return (
        <div className={styles.wallPage}>
          <div className={styles.errorContainer}>
            <p className={styles.wallName}>{wallName}</p>
            <h1>Access Denied</h1>
            <p>{t('errors.banned')}</p>
            <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
          </div>
        </div>
      );
    }

    if (embedResult.code === 'emailUnverified') {
      return (
        <div className={styles.wallPage}>
          <div className={styles.errorContainer}>
            <p className={styles.wallName}>{wallName}</p>
            <h1>Email Verification Required</h1>
            <p>{t('errors.verifyEmail')}</p>
            <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
          </div>
        </div>
      );
    }

    if (embedResult.code === 'earnRequirementNotMet' && embedResult.earnRequirement != null) {
      const requiredMore = Math.max(0, embedResult.earnRequirement - (embedResult.earned ?? 0));

      return (
        <div className={styles.wallPage}>
          <div className={styles.errorContainer}>
            <p className={styles.wallName}>{wallName}</p>
            <h1>Earn Requirement Not Met</h1>
            <p>
              {t('errors.minimumEarn', {
                amount: embedResult.earnRequirement.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }),
              })}
              {' '}
              Earn
              {' '}
              {requiredMore.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              {' '}
              more Sparks to unlock it.
            </p>
            <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
          </div>
        </div>
      );
    }

    if (embedResult.code === 'notFound') {
      return (
        <div className={styles.wallPage}>
          <div className={styles.errorContainer}>
            <p className={styles.wallName}>{wallName}</p>
            <h1>Invalid Offerwall</h1>
            <p>This offerwall does not exist or is not available.</p>
            <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.wallPage}>
        <div className={styles.errorContainer}>
          <p className={styles.wallName}>{wallName}</p>
          <h1>Something went wrong</h1>
          <p>We could not load this offerwall. Please try again.</p>
          <Link href={homeHref} className={styles.homeLink}>{tNotFound('backHome')}</Link>
        </div>
      </div>
    );
  }

  const { wall, wallUrl, iframeExtra } = embedResult.data;

  return (
    <WallPageClient
      wallUrl={wallUrl}
      iframeTitle={`${wall.wallName} Offerwall`}
      iframeExtra={iframeExtra}
    />
  );
}
