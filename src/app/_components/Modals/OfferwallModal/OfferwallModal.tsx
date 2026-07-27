'use client';

import LockScrollMount from '@hooks/LockScrollMount';

// Icons
import OpenInNewIcon from '~icons/mdi/open-in-new.jsx';
import CloseIcon from '~icons/mdi/close.jsx';

import styles from './OfferwallModal.module.scss';

type OfferwallModalProps = {
  wallID: string,
  wallName: string,
  onClose: () => void,
};

export default function OfferwallModal({ wallID, wallName, onClose }: OfferwallModalProps) {
  LockScrollMount();

  const iframeSrc = typeof window !== 'undefined'
    ? `${window.location.origin}/walls/${wallID}`
    : `/walls/${wallID}`;
  const popoutUrl = `/walls/${wallID}`;

  function handlePopout() {
    window.open(popoutUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className={styles.offerwallModal}
      onClick={onClose}
    >
      <div
        className={styles.contentWrapper}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>{wallName}</h2>
          <div className={styles.headerButtons}>
            <button
              type="button"
              onClick={handlePopout}
              className={styles.popoutButton}
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <OpenInNewIcon aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
              title="Close"
              aria-label="Close"
            >
              <CloseIcon aria-hidden />
            </button>
          </div>
        </div>

        <div className={styles.iframeWrapper}>
          <iframe
            src={iframeSrc}
            className={styles.wallIframe}
            title={`${wallName} offerwall`}
            allow="payment"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
