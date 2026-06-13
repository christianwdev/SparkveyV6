import styles from './HowItWorks.module.scss';

export default function HowItWorks() {
  return (
    <div className={styles.howItWorks}>
      <div className={styles.titleContainer}>
        <h3>How it Works</h3>
        <h2>
          Start earning in <span>3 Simple Steps</span>
        </h2>
        <p>Browse surveys, app trials, games, and cashback opportunities matched to your interests.</p>
      </div>
    </div>
  );
}