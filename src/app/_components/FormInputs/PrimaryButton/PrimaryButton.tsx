import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './PrimaryButton.module.scss';

type PrimaryButtonProps = {
  children: ReactNode,
  variant?: 'primary' | 'secondary' | 'danger',
  className?: string,
} & Omit<ComponentPropsWithoutRef<'button'>, 'className'>;

export default function PrimaryButton({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...buttonProps
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        styles.primaryButton,
        variant === 'secondary' ? styles.secondary : '',
        variant === 'danger' ? styles.danger : '',
        className,
      ].filter(Boolean).join(' ')}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
