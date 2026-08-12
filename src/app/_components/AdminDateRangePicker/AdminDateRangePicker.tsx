'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import styles from './AdminDateRangePicker.module.scss';
import 'react-day-picker/style.css';

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
  const [ compact, setCompact ] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');

    function sync() {
      setCompact(media.matches);
    }

    sync();
    media.addEventListener('change', sync);

    return () => media.removeEventListener('change', sync);
  }, []);

  return compact;
}

export default function AdminDateRangePicker({
  open,
  range,
  onRangeChange,
  onApply,
  onClose,
}: AdminDateRangePickerProps) {
  const t = useTranslations('AdminDashboard');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [ draft, setDraft ] = useState<DateRange | undefined>(range);
  const compact = useIsCompactViewport();

  useEffect(() => {
    if (open) setDraft(range);
  }, [ open, range ]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
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
  }, [ open, onClose ]);

  if (!open) return null;

  const canApply = Boolean(draft?.from && draft?.to);

  return (
    <>
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
    </>
  );
}

export { toDateOnly };
export type { DateRange };
