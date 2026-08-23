'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@i18n/navigation';
import { useUser } from '@contexts/UserProvider';
import { useLogout } from '@hooks/useLogout';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Components
import PopperMenu from '@components/PopperMenu/PopperMenu';
import PromocodeModal from '@components/Modals/PromocodeModal/PromocodeModal';

// Icons
import ProfileIcon from '~icons/solar/user-rounded-linear.jsx';
import EarningsIcon from '~icons/solar/chart-linear.jsx';
import RedemptionsIcon from '~icons/solar/gift-linear.jsx';
import SettingsIcon from '~icons/solar/settings-linear.jsx';
import AffiliatesIcon from '~icons/solar/users-group-rounded-linear.jsx';
import TicketIcon from '~icons/solar/ticket-sale-linear.jsx';
import SignOutIcon from '~icons/solar/logout-2-linear.jsx';

import styles from './UserDropdown.module.scss';

const MENU_LINKS = [
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
  const [ promocodeOpen, setPromocodeOpen ] = useState(false);

  if (!user) return null;

  return (
    <>
      {promocodeOpen && <PromocodeModal onClose={() => setPromocodeOpen(false)} />}
      <PopperMenu
        active={active}
        onOpenChange={setActive}
        placement="bottom-end"
        trigger={(
          <button
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
        )}
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
          className={styles.menuItem}
          onClick={() => {
            setActive(false);
            setPromocodeOpen(true);
          }}
        >
          <TicketIcon className={styles.itemIcon} aria-hidden />
          <span>{t('promocodes')}</span>
        </button>

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
      </PopperMenu>
    </>
  );
}
