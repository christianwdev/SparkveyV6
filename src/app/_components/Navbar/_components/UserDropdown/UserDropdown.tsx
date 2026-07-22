'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopper } from 'react-popper';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import { useUser } from '@contexts/UserProvider';
import { useLogout } from '@hooks/useLogout';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Icons
import ProfileIcon from '~icons/solar/user-rounded-linear.jsx';
import EarningsIcon from '~icons/solar/chart-linear.jsx';
import RedemptionsIcon from '~icons/solar/gift-linear.jsx';
import SettingsIcon from '~icons/solar/settings-linear.jsx';
import AffiliatesIcon from '~icons/solar/users-group-rounded-linear.jsx';
import SignOutIcon from '~icons/solar/logout-2-linear.jsx';

import styles from './UserDropdown.module.scss';

const MENU_LINKS = [
  { href: FrontendRedirectPaths.profile, labelKey: 'profile', Icon: ProfileIcon },
  { href: FrontendRedirectPaths.profileEarnings, labelKey: 'earnings', Icon: EarningsIcon },
  { href: FrontendRedirectPaths.profileRedemptions, labelKey: 'redemptions', Icon: RedemptionsIcon },
  { href: FrontendRedirectPaths.profileSettings, labelKey: 'settings', Icon: SettingsIcon },
  { href: FrontendRedirectPaths.affiliates, labelKey: 'affiliates', Icon: AffiliatesIcon },
];

export default function UserDropdown() {
  const t = useTranslations('UserDropdown');
  const tNav = useTranslations('Navbar');
  const { user } = useUser();
  const logout = useLogout();

  const [ active, setActive ] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLButtonElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-end',
    strategy: 'fixed',
    modifiers: [
      {
        name: 'offset',
        options: { offset: [ 0, 8 ] },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: [ 'top-end', 'bottom-start', 'top-start' ],
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

  if (!user) return null;

  return (
    <div className={styles.userDropdown} ref={dropdownRef}>
      <button
        ref={setReferenceElement}
        type="button"
        className={styles.trigger}
        onClick={() => setActive(current => !current)}
        aria-label={tNav('a11y.avatarAlt')}
        aria-expanded={active}
        aria-haspopup="menu"
      >
        {user.avatar ? (
          <Image
            className={styles.avatar}
            src={user.avatar}
            alt={tNav('a11y.avatarAlt')}
            width={48}
            height={48}
          />
        ) : (
          <ProfileIcon className={styles.avatarFallback} aria-hidden />
        )}
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
              {MENU_LINKS.map(({ href, labelKey, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => setActive(false)}
                >
                  <Icon className={styles.itemIcon} aria-hidden />
                  <span>{t(labelKey)}</span>
                </Link>
              ))}

              <button
                type="button"
                role="menuitem"
                className={styles.signOut}
                onClick={() => {
                  setActive(false);
                  logout.mutate();
                }}
                disabled={logout.isPending}
              >
                <SignOutIcon className={styles.itemIcon} aria-hidden />
                <span>{t('signOut')}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
