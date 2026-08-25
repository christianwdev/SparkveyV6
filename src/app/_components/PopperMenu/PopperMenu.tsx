'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopper } from 'react-popper';
import type { Placement } from '@popperjs/core';

import styles from './PopperMenu.module.scss';

type PopperMenuProps = {
  active: boolean,
  onOpenChange: (next: boolean) => void,
  placement?: Placement,
  trigger: ReactNode,
  children: ReactNode,
  menuClassName?: string,
  menuRole?: 'menu' | 'dialog',
  menuAriaLabel?: string,
};

export default function PopperMenu({
  active,
  onOpenChange,
  placement = 'bottom-start',
  trigger,
  children,
  menuClassName,
  menuRole = 'menu',
  menuAriaLabel,
}: PopperMenuProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement,
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
      const target = e.target;
      if (!(target instanceof Node) || dropdownRef.current.contains(target)) return;

      onOpenChange(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }

    function handlePopState() {
      onOpenChange(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [ active, onOpenChange ]);

  useEffect(() => {
    if (!active) return;
    void update?.();
  }, [ active, update ]);

  return (
    <div className={styles.popperMenu} ref={dropdownRef}>
      <div ref={setReferenceElement}>
        {trigger}
      </div>

      <AnimatePresence>
        {active && (
          <div
            ref={setPopperElement}
            className={styles.menuPosition}
            style={popperStyles.popper}
            {...attributes.popper}
          >
            <motion.div
              className={[ styles.menu, menuClassName ].filter(Boolean).join(' ')}
              role={menuRole}
              aria-label={menuAriaLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [ 0.22, 1, 0.36, 1 ] }}
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
