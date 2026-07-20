'use client';

import { MotionConfig } from 'framer-motion';

import type { ReactNode } from 'react';

type MotionProviderProps = {
  children: ReactNode,
};

export default function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
