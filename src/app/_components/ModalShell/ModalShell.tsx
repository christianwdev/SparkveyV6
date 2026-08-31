'use client';

import type { ReactNode } from 'react';

// Components
import LockScrollMount from '@hooks/LockScrollMount';

// Icons
import CloseIcon from '~icons/mdi/close.jsx';

import styles from './ModalShell.module.scss';

type ModalShellProps = {
  onClose: () => void,
  closeLabel: string,
  children: ReactNode,
  header?: ReactNode,
  contentClassName?: string,
  showCloseButton?: boolean,
  compact?: boolean,
  containScroll?: boolean,
};

export default function ModalShell({
  onClose,
  closeLabel,
  children,
  header,
  contentClassName,
  showCloseButton = true,
  compact = false,
  containScroll = false,
}: ModalShellProps) {
  return (
    <div className={styles.modal} onClick={onClose}>
      <LockScrollMount />

      <div
        className={[
          styles.contentWrapper,
          contentClassName || (compact ? styles.compactPanel : styles.defaultPanel),
          containScroll ? styles.containScroll : '',
        ].filter(Boolean).join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {header}

        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label={closeLabel}
          >
            <CloseIcon aria-hidden />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
