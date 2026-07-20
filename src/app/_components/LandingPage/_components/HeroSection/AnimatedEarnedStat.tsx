'use client';

import styles from './HeroSection.module.scss';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

// Types
import type { SiteStatisticsPayload } from 'types/SocketEvents';
import { useSocket } from '@contexts/SocketContext';
import SocketEmits from '@constants/SocketEmits';

type AnimatedEarnedStatProps = {
  initialUsdEarned: number;
};

export default function AnimatedEarnedStat({ initialUsdEarned }: AnimatedEarnedStatProps) {
  const { socket } = useSocket();
  const locale = useLocale();
  const t = useTranslations('Landing');
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(initialUsdEarned);
  const [ displayValue, setDisplayValue ] = useState(initialUsdEarned);

  useEffect(() => {
    return motionValue.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [ motionValue ]);

  useEffect(() => {
    const onSiteStatistics = ({ totalEarnedUsd }: SiteStatisticsPayload) => {
      if (prefersReducedMotion) {
        motionValue.set(totalEarnedUsd);
        return;
      }

      void animate(motionValue, totalEarnedUsd, {
        duration: 0.8,
        ease: 'easeOut',
      });
    };

    if (socket) socket.on(SocketEmits.siteStatistics, onSiteStatistics);

    return () => {
      if (socket) socket.off(SocketEmits.siteStatistics, onSiteStatistics);
    };
  }, [ motionValue, prefersReducedMotion, socket ]);

  const label = displayValue.toLocaleString(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className={styles.earnedStat}>
      <h2>{label}+</h2>
      <p>{t('totalEarnedBySparkvey')}</p>
    </div>
  );
}
