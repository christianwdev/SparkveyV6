'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { animate, useMotionValue } from 'framer-motion';

// Utils
import { getLandingSocket } from '@utils/landingSocket';

// Types
import type { SiteStatisticsPayload } from 'types/SocketEvents';

import styles from './HeroSection.module.scss';

type AnimatedEarnedStatProps = {
  initialUsdEarned: number;
};

export default function AnimatedEarnedStat({ initialUsdEarned }: AnimatedEarnedStatProps) {
  const locale = useLocale();
  const t = useTranslations('Landing');
  const motionValue = useMotionValue(initialUsdEarned);
  const [ displayValue, setDisplayValue ] = useState(initialUsdEarned);

  useEffect(() => {
    return motionValue.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [ motionValue ]);

  useEffect(() => {
    const socket = getLandingSocket();

    const onSiteStatistics = ({ totalEarnedUsd }: SiteStatisticsPayload) => {
      void animate(motionValue, totalEarnedUsd, {
        duration: 0.8,
        ease: 'easeOut',
      });
    };

    socket.on('siteStatistics', onSiteStatistics);

    return () => {
      socket.off('siteStatistics', onSiteStatistics);
    };
  }, [ motionValue ]);

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
