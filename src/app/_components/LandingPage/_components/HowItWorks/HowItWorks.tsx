import Image from 'next/image';
import styles from './HowItWorks.module.scss';

import AccountIcon from '~icons/octicon/person-24.jsx';
import ClipboardCheckIcon from '~icons/mdi/clipboard-check-outline.jsx';
import GiftIcon from '~icons/mdi/gift-outline.jsx';

export default function HowItWorks() {
  return (
    <div className={styles.howItWorks} id="how-it-works">
      <div className={styles.titleContainer}>
        <h3>How it Works</h3>
        <h2>
          Start earning in <span>3 Simple Steps</span>
        </h2>
        <p>Browse surveys, app trials, games, and cashback opportunities matched to your interests.</p>
      </div>

      <div className={styles.previewCards}>
        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/onboarding-image.png"
              alt="Sparkvey onboarding"
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/earn-image.png"
              alt="Ways to earn on Sparkvey"
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image
              src="/img/stocks/redeem-image.png"
              alt="Redeem rewards on Sparkvey"
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <div className={styles.fade} />
        </div>
      </div>

      <div className={styles.steps}>
        <div className={styles.stepsLine} />

        <div className={styles.step}>
          <div className={`${styles.stepIcon} ${styles.active}`}>
            <AccountIcon />
          </div>
          <p className={styles.stepTitle}>Sign Up Free</p>
          <p className={styles.stepDescription}>
            Create your Sparkvey account and unlock available earning opportunities.
          </p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <ClipboardCheckIcon />
          </div>
          <p className={styles.stepTitle}>Complete Tasks</p>
          <p className={styles.stepDescription}>
            Take surveys, try apps, play games, and shop to start stacking up Sparks.
          </p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <GiftIcon />
          </div>
          <p className={styles.stepTitle}>Redeem Rewards</p>
          <p className={styles.stepDescription}>
            Turn your earnings into gift cards, crypto, and other available rewards.
          </p>
        </div>
      </div>
    </div>
  );
}
