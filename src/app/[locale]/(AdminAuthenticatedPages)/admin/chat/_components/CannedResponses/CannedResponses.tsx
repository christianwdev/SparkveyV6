'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

// Icons
import LightningIcon from '~icons/mdi/lightning-bolt.jsx';

import { CANNED_RESPONSES_BY_CATEGORY } from '../../cannedResponses';
import styles from './CannedResponses.module.scss';

type CannedResponsesProps = {
  onSelect: (body: string) => void,
};

export default function CannedResponses({ onSelect }: CannedResponsesProps) {
  const t = useTranslations('AdminChat.cannedResponses');
  const rootRef = useRef<HTMLDivElement>(null);
  const [ open, setOpen ] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;

      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ open ]);

  return (
    <div className={styles.root} ref={rootRef}>
      {open ? (
        <div className={styles.panel} aria-label={t('open')}>
          {CANNED_RESPONSES_BY_CATEGORY.map(group => (
            <div key={group.category} className={styles.category}>
              <p>{t(`categories.${group.category}`)}</p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(t(`items.${item.id}.body`));
                    setOpen(false);
                  }}
                >
                  <span>{t(`items.${item.id}.title`)}</span>
                  <span>{t(`items.${item.id}.body`)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className={[ styles.toggle, open ? styles.open : '' ].filter(Boolean).join(' ')}
        aria-label={open ? t('close') : t('open')}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <LightningIcon aria-hidden />
        <span>{t('open')}</span>
      </button>
    </div>
  );
}
