import type { ReactNode } from 'react';

import styles from './LandingSectionHeader.module.scss';

type LandingSectionHeaderProps = {
  eyebrow: ReactNode,
  title: ReactNode,
  description?: ReactNode,
  align?: 'center' | 'start',
};

export default function LandingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: LandingSectionHeaderProps) {
  return (
    <div
      className={[
        styles.titleContainer,
        align === 'start' ? styles.alignStart : '',
      ].filter(Boolean).join(' ')}
    >
      <h3>{eyebrow}</h3>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
