import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './TextField.module.scss';

type TextFieldProps = {
  id: string,
  label: ReactNode,
  hint?: ReactNode,
  className?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'>;

export default function TextField({
  id,
  label,
  hint,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <div className={[ styles.textField, className ].filter(Boolean).join(' ')}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...inputProps} />
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
