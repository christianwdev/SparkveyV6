'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Dropdown.module.scss';

// Icons
import ChevronIcon from '~icons/mdi/chevron-right.jsx';

type DropdownProps<T = string> = {
  label: string;
  selected: T | T[];
  setValue: (value: T) => void;
  defaultValue?: string;
  values: {
    label: string;
    value: T;
  }[];
  className?: string;
};

export default function Dropdown<T extends string | number = string>(props: DropdownProps<T>) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [ active, setActive ] = useState(false);

  function isActive(value: T) {
    if (Array.isArray(props.selected)) return props.selected.includes(value);

    return props.selected === value;
  }

  const selectedText = useMemo(() => {
    if (Array.isArray(props.selected)) {
      if (props.selected.length < 1) return props.defaultValue ?? '';

      return props.selected
        .map(key => props.values.find(value => value.value === key)?.label ?? '')
        .filter(Boolean)
        .join(', ');
    }

    return props.values.find(value => value.value === props.selected)?.label ?? '';
  }, [ props.selected, props.defaultValue, props.values ]);

  useEffect(() => {
    if (!active) return;

    const handleClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setActive(false);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [ active ]);

  return (
    <div
      ref={dropdownRef}
      className={[
        styles.dropdownContainer,
        active ? styles.active : '',
        props.className,
      ].filter(Boolean).join(' ')}
      onClick={(event) => {
        event.stopPropagation();
        setActive(current => !current);
      }}
    >
      <p className={styles.label}>{props.label}</p>
      <p className={styles.selected}>
        <span>{selectedText}</span>
        <ChevronIcon aria-hidden />
      </p>

      <div
        className={styles.dropdown}
        onClick={(event) => event.stopPropagation()}
      >
        {props.values.map(item => (
          <button
            type="button"
            onClick={() => {
              props.setValue(item.value);
              if (!Array.isArray(props.selected)) setActive(false);
            }}
            className={isActive(item.value) ? styles.active : undefined}
            key={`dropdown-${String(item.value)}`}
          >
            {Array.isArray(props.selected) && (
              <div className={styles.indicator} />
            )}
            <p>{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
