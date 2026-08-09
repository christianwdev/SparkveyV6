import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './PrefixedTextField.module.scss';

type PrefixedTextFieldProps = {
  id: string,
  label: ReactNode,
  prefix: ReactNode,
  hint?: ReactNode,
  className?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'>;

export default function PrefixedTextField({
  id,
  label,
  prefix,
  hint,
  className,
  ...inputProps
}: PrefixedTextFieldProps) {
  return (
    <div className={[ styles.prefixedTextField, className ].filter(Boolean).join(' ')}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.control}>
        <span className={styles.prefix} aria-hidden>
          {prefix}
        </span>
        <input id={id} {...inputProps} />
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
