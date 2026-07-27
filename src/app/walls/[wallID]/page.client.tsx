'use client';

import styles from './page.module.scss';

type WallPageClientProps = {
  wallUrl: string,
  iframeTitle: string,
  iframeExtra?: Record<string, string>,
};

export default function WallPageClient({ wallUrl, iframeTitle, iframeExtra }: WallPageClientProps) {
  return (
    <div className={styles.wallPage}>
      <div className={styles.interactiveContent}>
        <div className={styles.wallContainer}>
          <iframe
            src={wallUrl}
            className={styles.wallIframe}
            title={iframeTitle}
            allow="payment"
            frameBorder={0}
            allowFullScreen
            {...iframeExtra}
          />
        </div>
      </div>
    </div>
  );
}
