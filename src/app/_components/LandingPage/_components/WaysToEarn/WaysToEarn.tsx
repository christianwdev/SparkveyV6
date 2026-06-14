import Image from 'next/image';
import styles from './WaysToEarn.module.scss';

export default function WaysToEarn() {
  return (
    <div className={styles.waysToEarnContainer} id="ways-to-earn">
      <div className={styles.titleContainer}>
        <h3>Ways to Earn</h3>
        <h2>
          Multiple ways to <span>Earn Rewards</span>
        </h2>
        <p>Sparkvey gives you flexible earning options, so you can complete the tasks you enjoy and redeem your balance for real rewards.</p>
      </div>

      <div className={styles.cardsContainer}>
        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image src="/img/stocks/earn-image.png" alt="Ways to earn" fill sizes="100%" />
          </div>

          <div className={styles.cardContent}>
            <h3>Paid Surveys</h3>
            <p>Complete paid surveys to earn rewards.</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image src="/img/stocks/earn-image.png" alt="Ways to earn" fill sizes="100%" />
          </div>

          <div className={styles.cardContent}>
            <h3>Earn Cashback</h3>
            <p>Shop with cashback to earn rewards.</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardImage}>
            <Image src="/img/stocks/earn-image.png" alt="Ways to earn" fill sizes="100%" />
          </div>

          <div className={styles.cardContent}>
            <h3>Play Games</h3>
            <p>Play games to earn rewards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
