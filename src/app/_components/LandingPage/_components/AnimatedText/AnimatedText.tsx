'use client';

import { useEffect, useRef } from 'react';
import styles from './AnimatedText.module.scss';

type AnimatedTextProps = {
  words: string[];
};

const FALLBACK_WORDS = [ 'Rewards' ];

export default function AnimatedText({ words }: AnimatedTextProps) {
  const position = useRef<number>(0);
  const rewardWordTextRef = useRef<HTMLSpanElement | null>(null);
  const rewardWordContainerRef = useRef<HTMLSpanElement | null>(null);
  const safeWords = words.length > 0 ? words : FALLBACK_WORDS;

  useEffect(() => {
    if (safeWords.length < 2) return;

    let cancelled = false;

    const startRewardWordAnimation = () => {
      const textEl = rewardWordTextRef.current;
      const containerEl = rewardWordContainerRef.current;

      if (!textEl || !containerEl || cancelled) {
        return;
      }

      const measuredWidth = Math.ceil(textEl.getBoundingClientRect().width);
      containerEl.style.width = `${measuredWidth}px`;

      const animateUp = textEl.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-22px)', opacity: 0 },
      ], {
        delay: 2000,
        duration: 460,
        easing: 'ease-in-out',
      });

      animateUp.onfinish = () => {
        if (cancelled || !rewardWordTextRef.current || !rewardWordContainerRef.current) return;

        position.current = (position.current + 1) % safeWords.length;
        rewardWordTextRef.current.textContent = safeWords[position.current];

        const nextWidth = Math.ceil(rewardWordTextRef.current.getBoundingClientRect().width);
        rewardWordContainerRef.current.style.width = `${nextWidth}px`;

        const animateDown = rewardWordTextRef.current.animate([
          { transform: 'translateY(22px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ], {
          duration: 460,
          easing: 'ease-in-out',
        });

        animateDown.onfinish = () => {
          startRewardWordAnimation();
        };
      };
    };

    startRewardWordAnimation();

    return () => {
      cancelled = true;
    };
  }, [ safeWords ]);

  return (
    <span ref={rewardWordContainerRef} className={styles.animatedTextContainer}>
      <span ref={rewardWordTextRef} className={styles.animatedText}>
        {safeWords[0]}
      </span>
    </span>
  );
}
