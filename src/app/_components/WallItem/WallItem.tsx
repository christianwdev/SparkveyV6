'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Contexts
import { useUser } from '@contexts/UserProvider';
import { useOfferwall } from '@contexts/OfferwallProvider';

// Icons
import LockIcon from '~icons/mdi/lock.jsx';

import styles from './WallItem.module.scss';

type WallItemProps = {
  wallID: string,
  wallName: string,
  wallDescription: string,
  wallImage: string,
  earnRequirement?: number,
};

export default function WallItem({
  wallID,
  wallName,
  wallDescription,
  wallImage,
  earnRequirement,
}: WallItemProps) {
  const { user } = useUser();
  const { openOfferwallModal } = useOfferwall();
  const t = useTranslations('WallItem');

  const lifetimeEarned = user?.statistics.earned.total ?? 0;
  const isBanned = !!(user?.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
  const isVerified = !!user?.emailInformation.verifiedAt;
  const belowEarnRequirement = earnRequirement != null && lifetimeEarned < earnRequirement;
  const sparksShortfall = belowEarnRequirement && earnRequirement != null
    ? earnRequirement - lifetimeEarned
    : undefined;
  const blocked = belowEarnRequirement || isBanned || !isVerified;

  function getBlockMessage() {
    if (isBanned) return t('errors.banned');
    if (!isVerified) return t('errors.verifyEmail');
    if (belowEarnRequirement && earnRequirement != null) {
      return t('errors.minimumEarn', {
        amount: earnRequirement.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      });
    }

    return null;
  }

  function handleBlockedClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const reason = getBlockMessage();
    if (reason) toast.error(reason);
  }

  function handleOpen() {
    if (blocked) return;

    openOfferwallModal(wallID, wallName);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    e.preventDefault();
    if (blocked) {
      const reason = getBlockMessage();
      if (reason) toast.error(reason);

      return;
    }

    handleOpen();
  }

  return (
    <div
      className={styles.wallItem}
      onClick={blocked ? handleBlockedClick : handleOpen}
      onAuxClick={blocked ? handleBlockedClick : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.imageContainer}>
        <img
          src={wallImage}
          className={styles.blurredImage}
          alt=""
          aria-hidden
        />
        <img
          src={wallImage}
          className={styles.wallImage}
          alt=""
        />

        {sparksShortfall != null && (
          <div className={styles.blockedOverlay}>
            <LockIcon className={styles.blockedOverlayIcon} aria-hidden />
            <p>
              {t('lockedOverlay', {
                amount: sparksShortfall.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }),
              })}
            </p>
          </div>
        )}
      </div>

      <div className={styles.wallInformation}>
        <p className={styles.title}>{wallName}</p>
        <p className={styles.description}>{wallDescription}</p>
      </div>
    </div>
  );
}
