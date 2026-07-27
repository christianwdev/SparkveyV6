import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import OfferwallLinks from '@constants/OfferwallLinks';
import { OFFERWALL_IDS, OFFERWALLS, WALL_EARN_REQUIREMENTS } from '@constants/Offerwalls';
import { getUser } from '@utils/user';
import { serverRequest } from '@utils/serverRequest';
import type OfferWallType from 'types/Offer/OfferWallType';
import WallPageClient from './page.client';
import styles from './page.module.scss';

type WallPageProps = {
  params: Promise<{ wallID: string }>,
};

type LinkedOfferWallType = keyof typeof OfferwallLinks;

function isLinkedOfferWall(wallID: OfferWallType): wallID is LinkedOfferWallType {
  return wallID in OfferwallLinks;
}

export default async function WallPage({ params }: WallPageProps) {
  const { wallID } = await params;
  const normalizedWallID = wallID.toLowerCase() as OfferWallType;
  const locale = await getLocale();
  const homeHref = `/${locale}`;
  const t = await getTranslations({ locale: 'en', namespace: 'WallItem' });
  const tNotFound = await getTranslations({ locale: 'en', namespace: 'NotFound' });

  const user = await getUser({ request: serverRequest });

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/walls/${wallID}`)}`);
  }

  const wallDisplay = OFFERWALLS.find(w => w.wallID === normalizedWallID);
  const wallName = wallDisplay?.wallName ?? normalizedWallID;

  if (!OFFERWALL_IDS.includes(normalizedWallID)) {
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

  const isBanned = !!(user.bannedUntil && new Date(user.bannedUntil) > new Date());

  if (isBanned) {
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

  if (!user.emailInformation.verifiedAt) {
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

  const lifetimeEarned = user.statistics.earned.total;
  const earnRequirement = WALL_EARN_REQUIREMENTS[normalizedWallID];

  if (earnRequirement != null && lifetimeEarned < earnRequirement) {
    const requiredMore = earnRequirement - lifetimeEarned;

    return (
      <div className={styles.wallPage}>
        <div className={styles.errorContainer}>
          <p className={styles.wallName}>{wallName}</p>
          <h1>Earn Requirement Not Met</h1>
          <p>
            {t('errors.minimumEarn', {
              amount: earnRequirement.toLocaleString('en-US', {
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

  if (!isLinkedOfferWall(normalizedWallID)) {
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

  const wallConfig = OfferwallLinks[normalizedWallID];
  const wallUrl = wallConfig.wallLink.replace('{userID}', user.userID);

  return (
    <WallPageClient
      wallUrl={wallUrl}
      iframeTitle={`${wallName} Offerwall`}
      iframeExtra={wallConfig.additionalParameters}
    />
  );
}
