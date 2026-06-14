'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './LiveActivity.module.scss';

type Activity = {
  id: string;
  avatar: string;
  message: string;
  amount: number;
  animateIn: boolean;
};

const NAMES = [
  'John Doe',
  'Jane Smith',
  'Alex Rivera',
  'Sam Chen',
  'Morgan Lee',
  'Taylor Brooks',
  'Jordan Park',
  'Casey Nguyen',
];

const ACTIONS = [
  'completed a task',
  'earned a bonus',
  'redeemed a reward',
  'finished a survey',
  'claimed daily bonus',
];

const MAX_ACTIVITIES = 5;
const CARD_SLOT = 80;
const CARD_TRANSITION = { duration: 0.3, ease: 'easeOut' } as const;
const TRIM_DELAY_MS = CARD_TRANSITION.duration * 1000 + 50;

let activitySeq = 0;

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/10.x/initial-face/webp?seed=${encodeURIComponent(seed)}`;
}

function initialActivity(index: number): Activity {
  const name = NAMES[index % NAMES.length];
  const action = ACTIONS[index % ACTIONS.length];

  return {
    id: `initial-${index}`,
    avatar: avatarUrl(name),
    message: `${name} ${action}`,
    amount: 50 + index * 25,
    animateIn: false,
  };
}

function randomActivity(): Activity {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

  return {
    id: String(++activitySeq),
    avatar: avatarUrl(name),
    message: `${name} ${action}`,
    amount: Math.round(25 + Math.random() * 175),
    animateIn: true,
  };
}

function targetOpacity(rowIndex: number): number {
  if (rowIndex === MAX_ACTIVITIES) return 0;
  if (rowIndex === MAX_ACTIVITIES - 1) return 0.25;
  if (rowIndex === MAX_ACTIVITIES - 2) return 0.5;
  if (rowIndex === MAX_ACTIVITIES - 3) return 0.75;

  return 1;
}

const INITIAL_ACTIVITIES = Array.from({ length: MAX_ACTIVITIES }, (_, index) => initialActivity(index));

export default function LiveActivity() {
  const [ activities, setActivities ] = React.useState<Activity[]>(INITIAL_ACTIVITIES);
  const trimTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const next = randomActivity();
      setActivities((prev) => [ next, ...prev ].slice(0, MAX_ACTIVITIES + 1));

      if (trimTimer.current) clearTimeout(trimTimer.current);
      trimTimer.current = setTimeout(() => {
        setActivities((prev) => prev.slice(0, MAX_ACTIVITIES));
      }, TRIM_DELAY_MS);
    }, 2500);

    return () => {
      clearInterval(timer);
      if (trimTimer.current) clearTimeout(trimTimer.current);
    };
  }, []);

  return (
    <div className={styles.liveActivityContainer} id="live-activity">
      <div className={styles.titleContainer}>
        <h3>Live Activity</h3>
        <h2>
          See rewards happening in <span>Real Time</span>
        </h2>
        <p>Sparkvey users are completing tasks, earning bonuses, and redeeming rewards every day.</p>
      </div>

      <div className={styles.liveActivityContent}>
        <div className={styles.activityTitle}>
          <Image className={styles.funArrow} src="/img/stocks/fun-arrow.png" alt="Fun arrow" width={81} height={81} />
          <h2>Today Rewards <span>Earning</span></h2>
        </div>

        <div className={styles.activityCards}>
          {activities.map((activity, index) => {
            const opacity = targetOpacity(index);

            return (
              <motion.div
                key={activity.id}
                layout="position"
                initial={activity.animateIn ? { opacity: 0, y: -CARD_SLOT, scale: 0.98 } : false}
                animate={{ opacity, y: 0, scale: 1 }}
                transition={{
                  layout: CARD_TRANSITION,
                  y: CARD_TRANSITION,
                  opacity: CARD_TRANSITION,
                  scale: CARD_TRANSITION,
                }}
                className={styles.activityCard}
              >
                <Image
                  className={styles.avatarImage}
                  src={activity.avatar}
                  alt="Avatar"
                  width={40}
                  height={40}
                  sizes="100%"
                />
                <p className={styles.activityMessage}>{activity.message}</p>
                <p className={styles.activityAmount}>
                  +
                  <Image src="/img/logo.svg" alt="Spark" width={16} height={16} />
                  {activity.amount}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
