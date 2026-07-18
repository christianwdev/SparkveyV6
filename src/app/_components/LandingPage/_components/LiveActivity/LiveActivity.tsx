'use client';

import { Suspense, use, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import styles from './LiveActivity.module.scss';

// Components
import Skeleton from '@components/Skeleton/Skeleton';

// Types
import type { LandingHomepageResponse, LandingLiveActivityItem } from 'types/LandingHomepageResponse';
import { useSocket } from '@contexts/SocketContext';
import SocketEmits from '@constants/SocketEmits';

type Activity = {
  id: string;
  avatar: string;
  message: string;
  amount: number;
  animateIn: boolean;
};

type LiveActivityProps = {
  initialHomepagePromise: Promise<LandingHomepageResponse>;
};

const MAX_ACTIVITIES = 5;
const CARD_SLOT = 80;
const CARD_TRANSITION = { duration: 0.3, ease: 'easeOut' } as const;
const TRIM_DELAY_MS = CARD_TRANSITION.duration * 1000 + 50;
const SKELETON_COUNT = 5;

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/10.x/initial-face/webp?seed=${encodeURIComponent(seed)}`;
}

function LiveActivityFallback() {
  return (
    <div className={styles.activityCards} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} className={styles.activityCardSkeleton}>
          <Skeleton width={40} height={40} borderRadius="50%" />
          <Skeleton width="55%" height={22} />
          <Skeleton width={72} height={22} style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

function formatActivityMessage(
  t: ReturnType<typeof useTranslations<'Landing.liveActivity'>>,
  item: LandingLiveActivityItem,
): string {
  if (item.type === 'shopping') {
    return t('shoppedAt', { username: item.username, label: item.label });
  }

  return t('completed', { username: item.username, label: item.label });
}

function toActivity(
  t: ReturnType<typeof useTranslations<'Landing.liveActivity'>>,
  item: LandingLiveActivityItem,
  animateIn = false,
): Activity {
  return {
    id: item.id,
    avatar: item.avatar || avatarUrl(item.username),
    message: formatActivityMessage(t, item),
    amount: item.value,
    animateIn,
  };
}

function LiveActivityFeed({ initialHomepagePromise }: LiveActivityProps) {
  const t = useTranslations('Landing.liveActivity');
  const { liveActivity: initialActivities } = use(initialHomepagePromise);
  const { socket } = useSocket();
  const [ activities, setActivities ] = useState<Activity[]>(() =>
    initialActivities.slice(0, MAX_ACTIVITIES).map((item) => toActivity(t, item)),
  );
  const trimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onLiveActivity = (item: LandingLiveActivityItem) => {
      setActivities((prev) => {
        if (prev.some((activity) => activity.id === item.id)) return prev;

        return [ toActivity(t, item, true), ...prev ].slice(0, MAX_ACTIVITIES + 1);
      });

      if (trimTimer.current) clearTimeout(trimTimer.current);

      trimTimer.current = setTimeout(() => {
        setActivities((prev) => prev.slice(0, MAX_ACTIVITIES));
      }, TRIM_DELAY_MS);
    };

    if (socket) socket.on(SocketEmits.liveActivity, onLiveActivity);

    return () => {
      if (socket) socket.off(SocketEmits.liveActivity, onLiveActivity);
      if (trimTimer.current) clearTimeout(trimTimer.current);
    };
  }, [ socket, t ]);

  if (activities.length === 0) return null;

  return (
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
              alt={t('avatarAlt')}
              width={40}
              height={40}
              sizes="100%"
            />
            <p className={styles.activityMessage}>{activity.message}</p>
            <p className={styles.activityAmount}>
              +
              <Image src="/img/logo.svg" alt={t('sparkAlt')} width={16} height={16} />
              {activity.amount.toLocaleString()}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function LiveActivity({ initialHomepagePromise }: LiveActivityProps) {
  const t = useTranslations('Landing.liveActivity');

  return (
    <div className={styles.liveActivityContainer} id="live-activity">
      <div className={styles.titleContainer}>
        <h3>{t('eyebrow')}</h3>
        <h2>
          {t.rich('title', {
            highlight: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t('description')}</p>
      </div>

      <div className={styles.liveActivityContent}>
        <div className={styles.activityTitle}>
          <Image
            className={styles.funArrow}
            src="/img/stocks/fun-arrow.png"
            alt={t('funArrowAlt')}
            width={81}
            height={81}
          />
          <h2>
            {t.rich('watchTitle', {
              highlight: (chunks) => <span>{chunks}</span>,
            })}
          </h2>
        </div>

        <Suspense fallback={<LiveActivityFallback />}>
          <LiveActivityFeed initialHomepagePromise={initialHomepagePromise} />
        </Suspense>
      </div>
    </div>
  );
}
