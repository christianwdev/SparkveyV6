'use client';

// Components
import ModalShell from '@components/ModalShell/ModalShell';

// Icons
import OpenInNewIcon from '~icons/mdi/open-in-new.jsx';
import CloseIcon from '~icons/mdi/close.jsx';

// Utils
import { canUseDom } from '@utils/dom';

import styles from './OfferwallModal.module.scss';

type OfferwallModalProps = {
  wallID: string,
  wallName: string,
  onClose: () => void,
};

export default function OfferwallModal({ wallID, wallName, onClose }: OfferwallModalProps) {
  const iframeSrc = canUseDom()
    ? `${window.location.origin}/walls/${wallID}`
    : `/walls/${wallID}`;
  const popoutUrl = `/walls/${wallID}`;

  function handlePopout() {
    window.open(popoutUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <ModalShell
      onClose={onClose}
      closeLabel="Close"
      showCloseButton={false}
      contentClassName={styles.offerwallContent}
      header={(
        <div className={styles.offerwallHeader}>
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
      )}
    >
      <div className={styles.iframeWrapper}>
        <iframe
          src={iframeSrc}
          className={styles.wallIframe}
          title={`${wallName} offerwall`}
          allow="payment"
          allowFullScreen
        />
      </div>
    </ModalShell>
  );
}
