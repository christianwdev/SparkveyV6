'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopper } from 'react-popper';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Icons
import EarnIcon from '~icons/solar/wallet-money-linear.jsx';
import CompassIcon from '~icons/solar/compass-linear.jsx';
import ChecklistIcon from '~icons/solar/checklist-linear.jsx';
import ClipboardCheckIcon from '~icons/solar/clipboard-check-linear.jsx';
import ChevronDownIcon from '~icons/solar/alt-arrow-down-linear.jsx';

import styles from './EarnDropdown.module.scss';

const MENU_LINKS = [
  { href: FrontendRedirectPaths.explore, labelKey: 'explore', Icon: CompassIcon },
  { href: FrontendRedirectPaths.tasks, labelKey: 'tasks', Icon: ChecklistIcon },
  { href: FrontendRedirectPaths.surveys, labelKey: 'surveys', Icon: ClipboardCheckIcon },
] as const;

export default function EarnDropdown() {
  const t = useTranslations('Navbar');
  const pathname = usePathname();

  const [ active, setActive ] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLButtonElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const isEarnActive = MENU_LINKS.some(({ href }) => (
    pathname === href || pathname.startsWith(`${href}/`)
  ));

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
    strategy: 'fixed',
    modifiers: [
      {
        name: 'offset',
        options: { offset: [ 0, 8 ] },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: [ 'top-start', 'bottom-end', 'top-end' ],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 8,
          rootBoundary: 'viewport',
        },
      },
    ],
  });

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(e: PointerEvent) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;

      setActive(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(false);
    }

    function handlePopState() {
      setActive(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [ active ]);

  useEffect(() => {
    if (!active) return;
    void update?.();
  }, [ active, update ]);

  return (
    <div className={styles.earnDropdown} ref={dropdownRef}>
      <button
        ref={setReferenceElement}
        type="button"
        className={[ styles.trigger, isEarnActive ? styles.triggerActive : '' ].filter(Boolean).join(' ')}
        onClick={() => setActive(!active)}
        aria-expanded={active}
        aria-haspopup="menu"
      >
        <EarnIcon className={styles.triggerIcon} aria-hidden />
        <span>{t('links.earn')}</span>
        <ChevronDownIcon
          className={[ styles.chevron, active ? styles.chevronOpen : '' ].filter(Boolean).join(' ')}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {active && (
          <div
            ref={setPopperElement}
            className={styles.menuPosition}
            style={popperStyles.popper}
            {...attributes.popper}
          >
            <motion.div
              className={styles.menu}
              role="menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [ 0.22, 1, 0.36, 1 ] }}
            >
              {MENU_LINKS.map(({ href, labelKey, Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className={[ styles.menuItem, isActive ? styles.menuItemActive : '' ].filter(Boolean).join(' ')}
                    onClick={() => setActive(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={styles.itemIcon} aria-hidden />
                    <span>{t(`earnMenu.${labelKey}`)}</span>
                  </Link>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
