'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './LiveActivity.module.scss';

// Utils
import { getLandingSocket } from '@utils/landingSocket';

// Types
import type { LandingLiveActivityItem } from 'types/LandingHomepageResponse';

type Activity = {
  id: string;
  avatar: string;
  message: string;
  amount: number;
  animateIn: boolean;
};

const MAX_ACTIVITIES = 5;
const CARD_SLOT = 80;
const CARD_TRANSITION = { duration: 0.3, ease: 'easeOut' } as const;
const TRIM_DELAY_MS = CARD_TRANSITION.duration * 1000 + 50;

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/10.x/initial-face/webp?seed=${encodeURIComponent(seed)}`;
}

function activityMessage(item: LandingLiveActivityItem): string {
  if (item.type === 'shopping') {
    return `${item.username} shopped at ${item.label}`;
  }

  return `${item.username} completed ${item.label}`;
}

function toActivity(item: LandingLiveActivityItem, animateIn = false): Activity {
  return {
    id: item.id,
    avatar: item.avatar || avatarUrl(item.username),
    message: activityMessage(item),
    amount: item.value,
    animateIn,
  };
}

type LiveActivityProps = {
  initialActivities: LandingLiveActivityItem[];
};

export default function LiveActivity({ initialActivities }: LiveActivityProps) {
  const [ activities, setActivities ] = useState<Activity[]>(() =>
    initialActivities.slice(0, MAX_ACTIVITIES).map((item) => toActivity(item)),
  );
  const trimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getLandingSocket();

    const onLiveActivity = (item: LandingLiveActivityItem) => {
      setActivities((prev) => {
        if (prev.some((activity) => activity.id === item.id)) return prev;

        return [ toActivity(item, true), ...prev ].slice(0, MAX_ACTIVITIES + 1);
      });

      if (trimTimer.current) clearTimeout(trimTimer.current);
      trimTimer.current = setTimeout(() => {
        setActivities((prev) => prev.slice(0, MAX_ACTIVITIES));
      }, TRIM_DELAY_MS);
    };

    socket.on('liveActivity', onLiveActivity);

    return () => {
      socket.off('liveActivity', onLiveActivity);
      if (trimTimer.current) clearTimeout(trimTimer.current);
    };
  }, []);

  if (activities.length === 0) return null;

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
          {activities.map((activity) => {
            return (
              <motion.div
                key={activity.id}
                layout="position"
                initial={activity.animateIn ? { y: -CARD_SLOT, scale: 0.98 } : false}
                animate={{ y: 0, scale: 1 }}
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
                  {activity.amount.toLocaleString()}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
