import type { ReactNode } from 'react';

import styles from './EmptyState.module.scss';

type EmptyStateProps = {
  message: ReactNode,
  className?: string,
};

export default function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={[ styles.emptyState, className ].filter(Boolean).join(' ')}>
      <p>{message}</p>
    </div>
  );
}
