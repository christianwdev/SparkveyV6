'use client';

import { forwardRef, useEffect, useState } from 'react';
import type {
  ChangeEvent,
  ComponentPropsWithoutRef,
  FocusEvent,
  ReactNode,
} from 'react';

import styles from './TextField.module.scss';

type TextFieldProps = {
  id: string,
  label: ReactNode,
  hint?: ReactNode,
  error?: ReactNode,

  /** When true, show `error` even if the field has not been blurred while dirty. */
  forceShowError?: boolean,
  className?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'>;

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    id,
    label,
    hint,
    error,
    forceShowError = false,
    className,
    onBlur,
    onChange,
    value,
    ...inputProps
  },
  ref,
) {
  const [ hasTyped, setHasTyped ] = useState(() => String(value ?? '').length > 0);
  const [ showError, setShowError ] = useState(false);

  useEffect(() => {
    if (!hasTyped && String(value ?? '').length > 0) {
      setHasTyped(true);
    }
  }, [ value, hasTyped ]);

  useEffect(() => {
    if (forceShowError) setShowError(true);
  }, [ forceShowError ]);

  const shouldShowError = Boolean(error) && (forceShowError || showError);
  const message = shouldShowError ? error : hint;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!hasTyped && event.target.value !== '') setHasTyped(true);
    onChange?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (!showError && (hasTyped || event.target.value !== '')) {
      setShowError(true);
    }
    onBlur?.(event);
  }

  return (
    <div
      className={[
        styles.textField,
        shouldShowError ? styles.invalid : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <label htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        value={value}
        {...inputProps}
        aria-invalid={shouldShowError || undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {message ? (
        <p
          id={`${id}-message`}
          className={[ styles.hint, shouldShowError ? styles.error : '' ].filter(Boolean).join(' ')}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
});

export default TextField;
