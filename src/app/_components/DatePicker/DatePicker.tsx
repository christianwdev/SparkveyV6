'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { useLocale } from 'next-intl';
import {
  de,
  enUS,
  es,
  fr,
  it,
  ja,
  ko,
  pl,
  pt,
  type Locale as DateFnsLocale,
} from 'date-fns/locale';
import styles from './DatePicker.module.scss';

import ChevronIcon from '~icons/mdi/chevron-right.jsx';
import CalendarIcon from '~icons/mdi/calendar-month-outline.jsx';

import '@daypicker/react/style.css';

type DatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  className?: string;
};

const LOCALE_MAP: Record<string, DateFnsLocale> = {
  en: enUS,
  es,
  de,
  fr,
  it,
  pt,
  pl,
  ja,
  ko,
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [ year, month, day ] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function ageCutoff(years: number) {
  const today = new Date();

  return new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
}

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder,
  minAgeYears = 18,
  maxAgeYears = 120,
  className,
}: DatePickerProps) {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ open, setOpen ] = useState(false);

  const selected = useMemo(() => fromIsoDate(value), [ value ]);
  const maxDate = useMemo(() => ageCutoff(minAgeYears), [ minAgeYears ]);
  const minDate = useMemo(() => ageCutoff(maxAgeYears), [ maxAgeYears ]);
  const dayPickerLocale = LOCALE_MAP[locale] ?? enUS;

  const displayValue = useMemo(() => {
    if (!selected) return placeholder ?? '';

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(selected);
  }, [ selected, locale, placeholder ]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);

    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [ open ]);

  return (
    <div
      ref={rootRef}
      className={[
        styles.datePicker,
        open ? styles.open : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <p className={styles.label}>{label}</p>
        <p className={[ styles.value, !selected ? styles.placeholder : '' ].filter(Boolean).join(' ')}>
          <span>{displayValue || placeholder || label}</span>
          <CalendarIcon aria-hidden className={styles.calendarIcon} />
          <ChevronIcon aria-hidden className={styles.chevron} />
        </p>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label={label}>
          <DayPicker
            mode="single"
            locale={dayPickerLocale}
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
            captionLayout="dropdown"
            defaultMonth={selected ?? maxDate}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={{ before: minDate, after: maxDate }}
            className={styles.calendar}
          />
        </div>
      )}
    </div>
  );
}
