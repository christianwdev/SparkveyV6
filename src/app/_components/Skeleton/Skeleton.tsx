import styles from './Skeleton.module.scss';

import type { CSSProperties } from 'react';

type SkeletonProps = {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  borderRadius?: CSSProperties['borderRadius'];
  className?: string;
  style?: CSSProperties;
};

export default function Skeleton({
  width,
  height,
  borderRadius,
  className,
  style,
}: SkeletonProps) {
  return (
    <div
      className={[ styles.skeleton, className ].filter(Boolean).join(' ')}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden
    />
  );
}
