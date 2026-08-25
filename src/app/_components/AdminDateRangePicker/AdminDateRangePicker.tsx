'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import 'react-day-picker/style.css';

import styles from './AdminDateRangePicker.module.scss';

const LARGE_PHONE_MAX_WIDTH = 768; // matches $large-phone

type AdminDateRangePickerProps = {
  open: boolean,
  range: DateRange | undefined,
  onRangeChange: (range: DateRange | undefined) => void,
  onApply: (range: { start: string, end: string }) => void,
  onClose: () => void,
};

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function useIsCompactViewport() {
  const [ compact, setCompact ] = useState(() => {
    if (globalThis.window === undefined) return false;

    return window.matchMedia(`(max-width: ${LARGE_PHONE_MAX_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${LARGE_PHONE_MAX_WIDTH}px)`);

    function sync() {
      setCompact(media.matches);
    }

    media.addEventListener('change', sync);

    return () => media.removeEventListener('change', sync);
  }, []);

  return compact;
}

function AdminDateRangePickerOpen({
  range,
  onRangeChange,
  onApply,
  onClose,
}: Omit<AdminDateRangePickerProps, 'open'>) {
  const t = useTranslations('AdminDashboard');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [ draft, setDraft ] = useState<DateRange | undefined>(range);
  const compact = useIsCompactViewport();

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ onClose ]);

  const canApply = Boolean(draft?.from && draft?.to);

  return (
    <div className={styles.root}>
      {compact && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={t('cancel')}
          onClick={onClose}
        />
      )}

      <div
        className={[ styles.picker, compact ? styles.pickerCompact : '' ].filter(Boolean).join(' ')}
        ref={rootRef}
        role="dialog"
        aria-label={t('customRangeLabel')}
      >
        <DayPicker
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={compact ? 1 : 2}
          disabled={{ after: new Date() }}
          defaultMonth={draft?.from ?? new Date()}
        />

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canApply}
            onClick={() => {
              if (!draft?.from || !draft?.to) return;

              const next = {
                start: toDateOnly(draft.from),
                end: toDateOnly(draft.to),
              };

              onRangeChange(draft);
              onApply(next);
              onClose();
            }}
          >
            {t('applyRange')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDateRangePicker({
  open,
  range,
  onRangeChange,
  onApply,
  onClose,
}: AdminDateRangePickerProps) {
  if (!open) return null;

  return (
    <AdminDateRangePickerOpen
      range={range}
      onRangeChange={onRangeChange}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

export { toDateOnly };
export type { DateRange };
