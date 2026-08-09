'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@i18n/navigation';
import FrontendRedirectPaths from '@constants/FrontendRedirectPaths';

// Components
import PopperMenu from '@components/PopperMenu/PopperMenu';

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

  const isEarnActive = MENU_LINKS.some(({ href }) => (
    pathname === href || pathname.startsWith(`${href}/`)
  ));

  return (
    <PopperMenu
      active={active}
      onOpenChange={setActive}
      placement="bottom-start"
      trigger={(
        <button
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
      )}
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
    </PopperMenu>
  );
}
