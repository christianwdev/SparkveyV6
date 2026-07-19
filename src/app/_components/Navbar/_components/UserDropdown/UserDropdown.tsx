'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopper } from 'react-popper';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@i18n/navigation';
import { useUser } from '@contexts/UserProvider';
import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type { ComponentType, SVGProps } from 'react';

// Icons
import ProfileIcon from '~icons/solar/user-rounded-linear.jsx';
import EarningsIcon from '~icons/solar/chart-linear.jsx';
import RedemptionsIcon from '~icons/solar/gift-linear.jsx';
import SettingsIcon from '~icons/solar/settings-linear.jsx';
import AffiliatesIcon from '~icons/solar/users-group-rounded-linear.jsx';
import SignOutIcon from '~icons/solar/logout-2-linear.jsx';

import styles from './UserDropdown.module.scss';

const MENU_LINKS = [
  { href: '/profile', labelKey: 'profile', Icon: ProfileIcon },
  { href: '/profile/earnings', labelKey: 'earnings', Icon: EarningsIcon },
  { href: '/profile/redemptions', labelKey: 'redemptions', Icon: RedemptionsIcon },
  { href: '/profile/settings', labelKey: 'settings', Icon: SettingsIcon },
  { href: '/affiliates', labelKey: 'affiliates', Icon: AffiliatesIcon },
];

export default function UserDropdown() {
  const t = useTranslations('UserDropdown');
  const tNav = useTranslations('Navbar');
  const router = useRouter();
  const { user, setUser } = useUser();

  const [ active, setActive ] = useState(false);
  const [ signingOut, setSigningOut ] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [ referenceElement, setReferenceElement ] = useState<HTMLButtonElement | null>(null);
  const [ popperElement, setPopperElement ] = useState<HTMLDivElement | null>(null);

  const { styles: popperStyles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-end',
    strategy: 'absolute',
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

    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;

      setActive(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(false);
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ active ]);

  useEffect(() => {
    if (!active) return;
    update?.();
  }, [ active, update ]);

  if (!user) return null;

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await clientRequest<APIResponse<null>>({
        url: `${getScope()}/auth/logout`,
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Clear local auth state even if the request fails.
    } finally {
      setUser(null);
      setActive(false);
      setSigningOut(false);
      router.push('/');
    }
  }

  return (
    <div className={styles.userDropdown} ref={dropdownRef}>
      <button
        ref={setReferenceElement}
        type="button"
        className={styles.trigger}
        onClick={() => setActive(!active)}
        aria-label={tNav('a11y.avatarAlt')}
        aria-expanded={active}
        aria-haspopup="menu"
      >
        <Image
          className={styles.avatar}
          src={user.avatar ?? ''}
          alt={tNav('a11y.avatarAlt')}
          width={48}
          height={48}
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
                onClick={handleSignOut}
                disabled={signingOut}
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
